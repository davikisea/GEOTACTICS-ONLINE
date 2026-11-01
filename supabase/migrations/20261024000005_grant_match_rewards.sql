-- ============================================================================
-- MIGRACIÓN 5: FUNCIÓN RPC grant_match_rewards Y TRIGGER DE NIVEL
-- Proyecto: Tactical Command: Wars of Legacy
-- Fecha: 2026-10-24
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. FUNCIÓN MATEMÁTICA: calculate_required_xp
-- XP_necesaria(N) = floor(150 * N^1.85)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.calculate_required_xp(p_level INTEGER)
RETURNS INTEGER AS $$
BEGIN
    IF p_level < 1 THEN
        RETURN 150;
    END IF;
    RETURN FLOOR(150 * POWER(p_level::DOUBLE PRECISION, 1.85))::INTEGER;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ----------------------------------------------------------------------------
-- 2. TRIGGER: trg_process_level_up
-- Evalúa si la XP acumulada supera el umbral del siguiente nivel y actualiza
-- account_level, abonando créditos y gemas automáticamente.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.trg_process_level_up()
RETURNS TRIGGER AS $$
DECLARE
    v_xp_needed INTEGER;
    v_new_level INTEGER;
    v_bonus_credits INTEGER;
BEGIN
    v_new_level := NEW.account_level;
    v_xp_needed := public.calculate_required_xp(v_new_level);

    -- Permite subir múltiples niveles consecutivos si la XP recibida es sustancial
    WHILE NEW.current_xp >= v_xp_needed AND v_new_level < 100 LOOP
        NEW.current_xp := NEW.current_xp - v_xp_needed;
        v_new_level := v_new_level + 1;
        
        -- Bono de 100 créditos por nivel alcanzado
        v_bonus_credits := v_new_level * 100;
        NEW.battle_credits := NEW.battle_credits + v_bonus_credits;

        -- Bono de 25 Gemas de Mando cada 5 niveles
        IF (v_new_level % 5 = 0) THEN
            NEW.command_gems := NEW.command_gems + 25;
        END IF;

        v_xp_needed := public.calculate_required_xp(v_new_level);
    END LOOP;

    NEW.account_level := v_new_level;
    NEW.updated_at := timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_profile_xp_check ON public.profiles;
CREATE TRIGGER trg_profile_xp_check
    BEFORE UPDATE OF current_xp ON public.profiles
    FOR EACH ROW
    WHEN (OLD.current_xp IS DISTINCT FROM NEW.current_xp)
    EXECUTE FUNCTION public.trg_process_level_up();

-- ----------------------------------------------------------------------------
-- 3. RPC: grant_match_rewards
-- Calcula XP y Oro (Battle Credits) al concluir una partida según la fórmula
-- canónica de docs/05_MONETIZATION_AND_PROGRESSION.md:
-- XP = (Base + (Ciudades * A) + (Bajas * B) + min(Turnos, 30) * C) * Multiplicador
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.grant_match_rewards(
    p_match_id UUID,
    p_winner_id UUID,
    p_cities_captured_p1 INTEGER DEFAULT 0,
    p_cities_captured_p2 INTEGER DEFAULT 0,
    p_units_destroyed_p1 INTEGER DEFAULT 0,
    p_units_destroyed_p2 INTEGER DEFAULT 0
)
RETURNS JSONB AS $$
DECLARE
    v_match public.active_matches%ROWTYPE;
    v_turns INTEGER;
    v_duration_sec INTEGER;
    v_is_p1_winner BOOLEAN;

    -- Constantes de calibración de GDD
    c_base_xp CONSTANT INTEGER := 120;
    c_city_xp_weight CONSTANT INTEGER := 45;
    c_kill_xp_weight CONSTANT INTEGER := 35;
    c_turn_xp_weight CONSTANT INTEGER := 6;

    c_base_gold CONSTANT INTEGER := 60;
    c_city_gold_weight CONSTANT INTEGER := 20;
    c_kill_gold_weight CONSTANT INTEGER := 15;

    c_win_multiplier CONSTANT DOUBLE PRECISION := 2.2;
    c_loss_multiplier CONSTANT DOUBLE PRECISION := 0.85;

    v_p1_score DOUBLE PRECISION;
    v_p2_score DOUBLE PRECISION;
    v_p1_gold_score DOUBLE PRECISION;
    v_p2_gold_score DOUBLE PRECISION;

    v_p1_xp_awarded INTEGER;
    v_p2_xp_awarded INTEGER;
    v_p1_gold_awarded INTEGER;
    v_p2_gold_awarded INTEGER;

    v_p1_elo_delta INTEGER;
    v_p2_elo_delta INTEGER;
BEGIN
    -- Bloqueo pesimista para evitar doble liquidación
    SELECT * INTO v_match 
    FROM public.active_matches 
    WHERE id = p_match_id 
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Partida % no encontrada', p_match_id;
    END IF;

    IF v_match.status = 'finished' THEN
        RETURN jsonb_build_object('success', false, 'error', 'La partida ya fue finalizada');
    END IF;

    v_turns := v_match.turn_number;
    v_duration_sec := EXTRACT(EPOCH FROM (timezone('utc'::text, now()) - v_match.created_at))::INTEGER;
    v_is_p1_winner := (p_winner_id = v_match.player1_id);

    -- 1. Calcular Puntajes Tácticos Base
    v_p1_score := c_base_xp + (p_cities_captured_p1 * c_city_xp_weight) + (p_units_destroyed_p1 * c_kill_xp_weight) + (LEAST(v_turns, 30) * c_turn_xp_weight);
    v_p2_score := c_base_xp + (p_cities_captured_p2 * c_city_xp_weight) + (p_units_destroyed_p2 * c_kill_xp_weight) + (LEAST(v_turns, 30) * c_turn_xp_weight);

    v_p1_gold_score := c_base_gold + (p_cities_captured_p1 * c_city_gold_weight) + (p_units_destroyed_p1 * c_kill_gold_weight);
    v_p2_gold_score := c_base_gold + (p_cities_captured_p2 * c_city_gold_weight) + (p_units_destroyed_p2 * c_kill_gold_weight);

    -- 2. Aplicar Multiplicadores según Resultado
    IF v_is_p1_winner THEN
        v_p1_xp_awarded := FLOOR(v_p1_score * c_win_multiplier)::INTEGER;
        v_p1_gold_awarded := FLOOR(v_p1_gold_score * 2.0)::INTEGER;
        v_p1_elo_delta := 20;

        v_p2_xp_awarded := FLOOR(v_p2_score * c_loss_multiplier)::INTEGER;
        v_p2_gold_awarded := FLOOR(v_p2_gold_score * 0.8)::INTEGER;
        v_p2_elo_delta := -15;
    ELSE
        v_p2_xp_awarded := FLOOR(v_p2_score * c_win_multiplier)::INTEGER;
        v_p2_gold_awarded := FLOOR(v_p2_gold_score * 2.0)::INTEGER;
        v_p2_elo_delta := 20;

        v_p1_xp_awarded := FLOOR(v_p1_score * c_loss_multiplier)::INTEGER;
        v_p1_gold_awarded := FLOOR(v_p1_gold_score * 0.8)::INTEGER;
        v_p1_elo_delta := -15;
    END IF;

    -- 3. Actualizar Perfil del Jugador 1 (Dispara trigger trg_profile_xp_check)
    UPDATE public.profiles
    SET current_xp = current_xp + v_p1_xp_awarded,
        battle_credits = battle_credits + v_p1_gold_awarded,
        total_matches_played = total_matches_played + 1,
        total_victories = CASE WHEN v_is_p1_winner THEN total_victories + 1 ELSE total_victories END,
        elo_rating = GREATEST(0, elo_rating + v_p1_elo_delta),
        updated_at = timezone('utc'::text, now())
    WHERE id = v_match.player1_id;

    -- 4. Actualizar Perfil del Jugador 2 (si existe y no es BOT)
    IF v_match.player2_id IS NOT NULL THEN
        UPDATE public.profiles
        SET current_xp = current_xp + v_p2_xp_awarded,
            battle_credits = battle_credits + v_p2_gold_awarded,
            total_matches_played = total_matches_played + 1,
            total_victories = CASE WHEN NOT v_is_p1_winner THEN total_victories + 1 ELSE total_victories END,
            elo_rating = GREATEST(0, elo_rating + v_p2_elo_delta),
            updated_at = timezone('utc'::text, now())
        WHERE id = v_match.player2_id;
    END IF;

    -- 5. Registrar en el Histórico Inmutable
    INSERT INTO public.match_history (
        match_id, player1_id, player2_id, winner_id, end_reason,
        total_turns, duration_seconds, game_mode,
        p1_xp_awarded, p2_xp_awarded, p1_credits_awarded, p2_credits_awarded,
        final_stats
    ) VALUES (
        v_match.id, v_match.player1_id, v_match.player2_id, p_winner_id,
        CASE WHEN v_turns > 50 THEN 'timeout' ELSE 'hq_captured' END,
        v_turns, v_duration_sec, v_match.game_mode,
        v_p1_xp_awarded, v_p2_xp_awarded, v_p1_gold_awarded, v_p2_gold_awarded,
        jsonb_build_object(
            'p1_cities', p_cities_captured_p1,
            'p2_cities', p_cities_captured_p2,
            'p1_kills', p_units_destroyed_p1,
            'p2_kills', p_units_destroyed_p2
        )
    );

    -- 6. Cerrar Partida
    UPDATE public.active_matches
    SET status = 'finished',
        winner_id = p_winner_id,
        updated_at = timezone('utc'::text, now())
    WHERE id = p_match_id;

    RETURN jsonb_build_object(
        'success', true,
        'p1_rewards', jsonb_build_object('xp', v_p1_xp_awarded, 'gold', v_p1_gold_awarded, 'eloDelta', v_p1_elo_delta),
        'p2_rewards', jsonb_build_object('xp', v_p2_xp_awarded, 'gold', v_p2_gold_awarded, 'eloDelta', v_p2_elo_delta)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- MIGRACIÓN 3: TRIGGERS Y FUNCIONES RPC (PROGRESIÓN Y SEGURIDAD)
-- Proyecto: Tactical Command: Wars of Legacy
-- Fecha: 2026-10-24
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. FUNCIÓN MATEMÁTICA: calculate_required_xp
-- Curva potencial: XP(N) = floor(150 * N^1.85)
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
-- Evalúa y sube de nivel automáticamente al modificar current_xp en profiles
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

    -- Permitir subir múltiples niveles de golpe
    WHILE NEW.current_xp >= v_xp_needed AND v_new_level < 100 LOOP
        NEW.current_xp := NEW.current_xp - v_xp_needed;
        v_new_level := v_new_level + 1;
        
        -- Otorgar créditos por nivel (100 * nivel alcanzado)
        v_bonus_credits := v_new_level * 100;
        NEW.battle_credits := NEW.battle_credits + v_bonus_credits;

        -- Otorgar 25 Gemas Premium cada 5 niveles
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
-- 3. TRIGGER: handle_new_user
-- Registra automáticamente el perfil de un usuario cuando se crea en auth.users
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (
        id,
        username,
        avatar_url,
        account_level,
        current_xp,
        battle_credits,
        command_gems,
        elo_rating
    ) VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'username', 'Commander_' || SUBSTRING(NEW.id::text FROM 1 FOR 6)),
        'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=150',
        1,
        0,
        500,
        50,
        1200
    )
    ON CONFLICT (id) DO NOTHING;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- ----------------------------------------------------------------------------
-- 4. RPC: award_match_rewards
-- Liquidación segura de fin de partida (cálculo de XP, créditos y ranking ELO)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.award_match_rewards(
    p_match_id UUID,
    p_winner_id UUID,
    p_end_reason VARCHAR(32),
    p_final_stats JSONB
)
RETURNS JSONB AS $$
DECLARE
    v_match public.active_matches%ROWTYPE;
    v_is_p1_winner BOOLEAN;
    v_p1_xp INTEGER := 0;
    v_p2_xp INTEGER := 0;
    v_p1_credits INTEGER := 0;
    v_p2_credits INTEGER := 0;
    v_turns INTEGER;
    v_duration_sec INTEGER;
BEGIN
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
    v_is_p1_winner := (p_winner_id = v_match.player1_id);
    v_duration_sec := EXTRACT(EPOCH FROM (timezone('utc'::text, now()) - v_match.created_at))::INTEGER;

    -- Aplicación de multiplicadores objetivos
    IF v_is_p1_winner THEN
        v_p1_xp := FLOOR((150 + LEAST(v_turns, 30) * 12) * 2.2)::INTEGER;
        v_p1_credits := FLOOR((80 + LEAST(v_turns, 30) * 8) * 2.0)::INTEGER;
        v_p2_xp := FLOOR((100 + LEAST(v_turns, 30) * 8) * 0.85)::INTEGER;
        v_p2_credits := FLOOR((50 + LEAST(v_turns, 30) * 5) * 0.8)::INTEGER;
    ELSE
        v_p2_xp := FLOOR((150 + LEAST(v_turns, 30) * 12) * 2.2)::INTEGER;
        v_p2_credits := FLOOR((80 + LEAST(v_turns, 30) * 8) * 2.0)::INTEGER;
        v_p1_xp := FLOOR((100 + LEAST(v_turns, 30) * 8) * 0.85)::INTEGER;
        v_p1_credits := FLOOR((50 + LEAST(v_turns, 30) * 5) * 0.8)::INTEGER;
    END IF;

    -- Actualizar Jugador 1
    UPDATE public.profiles
    SET current_xp = current_xp + v_p1_xp,
        battle_credits = battle_credits + v_p1_credits,
        total_matches_played = total_matches_played + 1,
        total_victories = CASE WHEN v_is_p1_winner THEN total_victories + 1 ELSE total_victories END,
        elo_rating = CASE WHEN v_is_p1_winner THEN elo_rating + 18 ELSE GREATEST(0, elo_rating - 14) END,
        updated_at = timezone('utc'::text, now())
    WHERE id = v_match.player1_id;

    -- Actualizar Jugador 2 (si existe y no es BOT)
    IF v_match.player2_id IS NOT NULL THEN
        UPDATE public.profiles
        SET current_xp = current_xp + v_p2_xp,
            battle_credits = battle_credits + v_p2_credits,
            total_matches_played = total_matches_played + 1,
            total_victories = CASE WHEN NOT v_is_p1_winner THEN total_victories + 1 ELSE total_victories END,
            elo_rating = CASE WHEN NOT v_is_p1_winner THEN elo_rating + 18 ELSE GREATEST(0, elo_rating - 14) END,
            updated_at = timezone('utc'::text, now())
        WHERE id = v_match.player2_id;
    END IF;

    -- Insertar en histórico inmutable
    INSERT INTO public.match_history (
        match_id, player1_id, player2_id, winner_id, end_reason,
        total_turns, duration_seconds, game_mode,
        p1_xp_awarded, p2_xp_awarded, p1_credits_awarded, p2_credits_awarded,
        final_stats
    ) VALUES (
        v_match.id, v_match.player1_id, v_match.player2_id, p_winner_id, p_end_reason,
        v_turns, v_duration_sec, v_match.game_mode,
        v_p1_xp, v_p2_xp, v_p1_credits, v_p2_credits,
        p_final_stats
    );

    -- Finalizar la partida
    UPDATE public.active_matches
    SET status = 'finished',
        winner_id = p_winner_id,
        updated_at = timezone('utc'::text, now())
    WHERE id = p_match_id;

    RETURN jsonb_build_object(
        'success', true,
        'p1_xp', v_p1_xp,
        'p1_credits', v_p1_credits,
        'p2_xp', v_p2_xp,
        'p2_credits', v_p2_credits
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

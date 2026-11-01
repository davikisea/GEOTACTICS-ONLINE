-- ==============================================================================
-- MIGRACIÓN 14: EMPAREJAMIENTO MULTI-MODO UNIFICADO, BLINDAJE DE LEDGER Y RANKED LADDER
-- ==============================================================================
-- Especificación: PROPOSAL_DB_ARCHITECTURE.md (v2.0.0-CALIBRATED-BACKEND-RFC)
-- Fecha: 2026-10-31
-- Descripción:
-- 1. Unifica colas en 'matchmaking_queue' con soporte multi-modo (Mirror, Blitz, Campaña).
-- 2. Conciliación aditiva en 'currency_ledger' con soporte de materiales y trigger append-only.
-- 3. Conciliación aditiva en 'user_chest_slots' con anti-speedhack (unlock_completes_at).
-- 4. Conciliación aditiva en 'user_cosmetics' con categorías y FK restrictiva.
-- 5. RPCs de matchmaking seguro con advisory lock, lectura server-side y anti-deck-sniffing.
-- 6. Algoritmo canónico de trofeos Elo con Factor K dinámico, Escudo de Descenso y Season Reset.
-- ==============================================================================

-- 1. TABLA UNIFICADA DE EMPAREJAMIENTO: matchmaking_queue
CREATE TABLE IF NOT EXISTS public.matchmaking_queue (
    user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
    game_mode VARCHAR(24) NOT NULL CHECK (game_mode IN ('mirror_duel', 'blitz_skirmish', 'grand_campaign')),
    commander_id VARCHAR(32) NOT NULL REFERENCES public.commanders_catalog(id),
    deck_snapshot JSONB NOT NULL DEFAULT '[]'::jsonb,
    preferred_theater VARCHAR(16) NOT NULL DEFAULT 'any' CHECK (preferred_theater IN ('land', 'naval', 'combined', 'any')),
    trophies INTEGER NOT NULL DEFAULT 0,
    weighted_power NUMERIC(4,2) NOT NULL DEFAULT 1.0,
    queued_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    matched_match_id UUID DEFAULT NULL,
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (timezone('utc'::text, now()) + interval '90 seconds')
);

-- Índice parcial de alta velocidad para escaneo de rango B-Tree en FOR UPDATE SKIP LOCKED
CREATE INDEX IF NOT EXISTS idx_matchmaking_active_seek
ON public.matchmaking_queue (game_mode, trophies, queued_at)
WHERE matched_match_id IS NULL;

ALTER TABLE public.matchmaking_queue ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.matchmaking_queue FROM anon, public;
GRANT SELECT ON public.matchmaking_queue TO authenticated;

DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'matchmaking_queue' AND policyname = 'matchmaking_queue_own'
    ) THEN
        CREATE POLICY "matchmaking_queue_own" 
        ON public.matchmaking_queue FOR SELECT TO authenticated 
        USING (auth.uid() = user_id);
    END IF;
END $$;

-- 2. CONCILIACIÓN ADITIVA: currency_ledger (Libro Contable Inmutable)
ALTER TABLE public.currency_ledger 
    ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

-- Extender el check de divisas para soportar materiales industriales de la migración 13
ALTER TABLE public.currency_ledger 
    DROP CONSTRAINT IF EXISTS currency_ledger_currency_check;

ALTER TABLE public.currency_ledger 
    ADD CONSTRAINT currency_ledger_currency_check 
    CHECK (currency IN ('credits', 'gems', 'refined_steel', 'refined_concrete', 'refined_microchip'));

-- Blindaje financiero: Trigger de inmutabilidad append-only
CREATE OR REPLACE FUNCTION public.trg_prevent_ledger_tampering()
RETURNS TRIGGER 
LANGUAGE plpgsql AS $$
BEGIN
    RAISE EXCEPTION 'Violación de Integridad: currency_ledger es estrictamente inmutable y append-only.';
END;
$$;

DROP TRIGGER IF EXISTS trg_currency_ledger_immutable ON public.currency_ledger;
CREATE TRIGGER trg_currency_ledger_immutable
    BEFORE UPDATE OR DELETE ON public.currency_ledger
    FOR EACH ROW EXECUTE FUNCTION public.trg_prevent_ledger_tampering();

-- 3. CONCILIACIÓN ADITIVA: user_chest_slots (Bóveda de Ranuras con Anti Speed-Hack)
ALTER TABLE public.user_chest_slots 
    ADD COLUMN IF NOT EXISTS unlock_completes_at TIMESTAMPTZ;

ALTER TABLE public.user_chest_slots 
    ADD COLUMN IF NOT EXISTS arena_tier INTEGER NOT NULL DEFAULT 1;

REVOKE INSERT, UPDATE, DELETE ON public.user_chest_slots FROM anon, authenticated;

-- 4. CONCILIACIÓN ADITIVA: user_cosmetics
ALTER TABLE public.user_cosmetics 
    ADD COLUMN IF NOT EXISTS category VARCHAR(24) NOT NULL DEFAULT 'unit_skin';

-- 5. FUNCIÓN MATEMÁTICA PURA: calculate_elo_delta
CREATE OR REPLACE FUNCTION public.calculate_elo_delta(
    p_player_trophies INTEGER,
    p_opponent_trophies INTEGER,
    p_arena_tier INTEGER,
    p_is_victory BOOLEAN
)
RETURNS INTEGER
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
    v_k_factor NUMERIC;
    v_loss_multiplier NUMERIC;
    v_expected NUMERIC;
    v_delta NUMERIC;
    v_score NUMERIC := CASE WHEN p_is_victory THEN 1.0 ELSE 0.0 END;
BEGIN
    -- Calibración escalonada del factor K según Arena RFC 4.1
    CASE 
        WHEN p_arena_tier = 1 THEN 
            v_k_factor := 40; v_loss_multiplier := 0.0; -- Cero pérdida novato
        WHEN p_arena_tier BETWEEN 2 AND 3 THEN 
            v_k_factor := 36; v_loss_multiplier := 0.60;
        WHEN p_arena_tier BETWEEN 4 AND 5 THEN 
            v_k_factor := 32; v_loss_multiplier := 0.85;
        WHEN p_arena_tier BETWEEN 6 AND 8 THEN 
            v_k_factor := 28; v_loss_multiplier := 1.00; -- Suma cero estricta
        WHEN p_arena_tier BETWEEN 9 AND 10 THEN 
            v_k_factor := 24; v_loss_multiplier := 1.00;
        ELSE 
            v_k_factor := 20; v_loss_multiplier := 1.00; -- Ligas Legendarias
    END CASE;

    -- Función logística estándar Elo
    v_expected := 1.0 / (1.0 + power(10.0, (p_opponent_trophies - p_player_trophies)::numeric / 400.0));
    v_delta := round(v_k_factor * (v_score - v_expected));

    -- Amortiguador de derrota para rangos bajos
    IF NOT p_is_victory THEN
        v_delta := round(v_delta * v_loss_multiplier);
    END IF;

    RETURN v_delta::INTEGER;
END;
$$;

-- 6. RPC CANÓNICO DE MATCHMAKING UNIFICADO: join_matchmaking_queue
CREATE OR REPLACE FUNCTION public.join_matchmaking_queue(
    p_game_mode VARCHAR(24),
    p_commander_id VARCHAR(32),
    p_preferred_theater VARCHAR(16) DEFAULT 'any'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_trophies INTEGER;
    v_deck_snapshot JSONB := '[]'::jsonb;
    v_deck_power NUMERIC(4,2) := 1.0;
    v_search_window INTEGER := 200;
    v_opponent public.matchmaking_queue%ROWTYPE;
    v_match_id UUID;
    v_room_code VARCHAR(8);
    v_map_id VARCHAR(64);
    v_turn_time_sec INTEGER := 30;
    v_max_turns INTEGER := 15;
    v_now TIMESTAMPTZ := timezone('utc'::text, now());
BEGIN
    IF v_user_id IS NULL THEN 
        RAISE EXCEPTION 'No autenticado'; 
    END IF;

    -- Evitar condiciones de carrera concurrentes para el mismo usuario
    PERFORM pg_advisory_xact_lock(hashtext(v_user_id::text));

    -- Anti-Reentrancy: verificar si ya tiene partida activa
    IF EXISTS (
        SELECT 1 FROM public.active_matches m
        JOIN public.match_participants p ON p.match_id = m.id
        WHERE p.user_id = v_user_id AND m.status = 'in_progress'
    ) THEN
        RETURN jsonb_build_object('status', 'already_in_match', 'message', 'Ya tienes una partida en curso.');
    END IF;

    -- Lectura server-side segura de trofeos y mazo
    SELECT trophies_count INTO v_trophies FROM public.profiles WHERE id = v_user_id;
    IF v_trophies IS NULL THEN v_trophies := 0; END IF;

    -- Cargar mazo activo validado
    SELECT equipped_deck INTO v_deck_snapshot FROM public.profiles WHERE id = v_user_id;
    IF v_deck_snapshot IS NULL OR jsonb_array_length(v_deck_snapshot) = 0 THEN
        v_deck_snapshot := jsonb_build_array('infantry', 'mech', 'recon', 'tank_light', 'tank_medium', 'b_copter');
    END IF;

    -- Parámetros según modo
    IF p_game_mode = 'mirror_duel' THEN
        v_turn_time_sec := 15;
        v_max_turns := 12;
        v_search_window := 300;
        v_map_id := 'mirror_arena_10x10';
    ELSIF p_game_mode = 'blitz_skirmish' THEN
        v_turn_time_sec := 30;
        v_max_turns := 15;
        v_search_window := 200;
        v_map_id := 'blitz_crossroads_14x14';
    ELSE -- grand_campaign
        v_turn_time_sec := 60;
        v_max_turns := 40;
        v_search_window := 250;
        v_map_id := 'campaign_theater_combined_28x28';
    END IF;

    -- Búsqueda de oponente con B-Tree Range Scan y SKIP LOCKED
    SELECT * INTO v_opponent
    FROM public.matchmaking_queue
    WHERE game_mode = p_game_mode
      AND user_id <> v_user_id
      AND matched_match_id IS NULL
      AND trophies BETWEEN (v_trophies - v_search_window) AND (v_trophies + v_search_window)
      AND expires_at > v_now
    ORDER BY queued_at ASC
    LIMIT 1
    FOR UPDATE SKIP LOCKED;

    IF FOUND THEN
        -- Crear partida atómicamente
        v_room_code := UPPER(SUBSTRING(encode(gen_random_bytes(4), 'hex') FROM 1 FOR 8));

        INSERT INTO public.active_matches (
            room_code, player1_id, player2_id, current_turn_player_id,
            status, game_mode, map_id, turn_number, turn_time_limit_sec,
            max_turns_limit, economy_multiplier, turn_deadline
        ) VALUES (
            v_room_code, v_opponent.user_id, v_user_id, v_opponent.user_id,
            'in_progress', p_game_mode, v_map_id, 1, v_turn_time_sec,
            v_max_turns, 1.0, v_now + (v_turn_time_sec * interval '1 second')
        ) RETURNING id INTO v_match_id;

        -- Registrar participantes con mazo oculto bajo niebla
        INSERT INTO public.match_participants (match_id, user_id, co_id, team, role, deck_state)
        VALUES 
            (v_match_id, v_opponent.user_id, v_opponent.commander_id, 1, 'player1', v_opponent.deck_snapshot),
            (v_match_id, v_user_id, p_commander_id, 2, 'player2', v_deck_snapshot);

        -- Eliminar al oponente de la cola para prevenir table bloat
        DELETE FROM public.matchmaking_queue WHERE user_id IN (v_user_id, v_opponent.user_id);

        RETURN jsonb_build_object(
            'status', 'matched',
            'match_id', v_match_id,
            'room_code', v_room_code,
            'game_mode', p_game_mode,
            'player1_id', v_opponent.user_id,
            'player2_id', v_user_id,
            'role', 'player2'
        );
    ELSE
        -- Insertar al usuario en la cola unificada
        INSERT INTO public.matchmaking_queue (
            user_id, game_mode, commander_id, deck_snapshot, preferred_theater,
            trophies, weighted_power, queued_at, matched_match_id, expires_at
        ) VALUES (
            v_user_id, p_game_mode, p_commander_id, v_deck_snapshot, p_preferred_theater,
            v_trophies, v_deck_power, v_now, NULL, v_now + interval '90 seconds'
        )
        ON CONFLICT (user_id) DO UPDATE SET
            game_mode = EXCLUDED.game_mode,
            commander_id = EXCLUDED.commander_id,
            deck_snapshot = EXCLUDED.deck_snapshot,
            preferred_theater = EXCLUDED.preferred_theater,
            trophies = EXCLUDED.trophies,
            queued_at = v_now,
            matched_match_id = NULL,
            expires_at = v_now + interval '90 seconds';

        RETURN jsonb_build_object(
            'status', 'searching',
            'game_mode', p_game_mode,
            'trophies', v_trophies,
            'queued_at', v_now
        );
    END IF;
END;
$$;

-- 7. RPC: cancel_matchmaking_queue
CREATE OR REPLACE FUNCTION public.cancel_matchmaking_queue()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_user_id UUID := auth.uid();
BEGIN
    IF v_user_id IS NULL THEN RAISE EXCEPTION 'No autenticado'; END IF;
    DELETE FROM public.matchmaking_queue WHERE user_id = v_user_id;
    RETURN jsonb_build_object('success', true, 'message', 'Búsqueda cancelada.');
END;
$$;

-- 8. RPC: start_chest_unlock
CREATE OR REPLACE FUNCTION public.start_chest_unlock(p_slot_index INTEGER)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_slot public.user_chest_slots%ROWTYPE;
    v_now TIMESTAMPTZ := timezone('utc'::text, now());
BEGIN
    IF v_user_id IS NULL THEN RAISE EXCEPTION 'No autenticado'; END IF;

    -- Validar que no haya otro cofre desbloqueándose
    IF EXISTS (
        SELECT 1 FROM public.user_chest_slots 
        WHERE user_id = v_user_id AND status = 'unlocking' AND slot_index <> p_slot_index
    ) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Ya hay otro cofre en proceso de desbloqueo.');
    END IF;

    SELECT * INTO v_slot FROM public.user_chest_slots
    WHERE user_id = v_user_id AND slot_index = p_slot_index FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Ranura de cofre vacía o no encontrada.');
    END IF;

    IF v_slot.status <> 'locked' THEN
        RETURN jsonb_build_object('success', false, 'message', 'El cofre no se encuentra en estado cerrado.');
    END IF;

    UPDATE public.user_chest_slots
    SET status = 'unlocking',
        unlock_started_at = v_now,
        unlock_completes_at = v_now + (v_slot.unlock_duration_seconds * interval '1 second')
    WHERE id = v_slot.id;

    RETURN jsonb_build_object(
        'success', true,
        'slot_index', p_slot_index,
        'unlock_started_at', v_now,
        'unlock_completes_at', v_now + (v_slot.unlock_duration_seconds * interval '1 second')
    );
END;
$$;

-- 9. RPC: claim_chest_reward
CREATE OR REPLACE FUNCTION public.claim_chest_reward(p_slot_index INTEGER)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_slot public.user_chest_slots%ROWTYPE;
    v_now TIMESTAMPTZ := timezone('utc'::text, now());
    v_reward_credits INTEGER := 400;
    v_reward_blueprints INTEGER := 40;
    v_reward_steel INTEGER := 0;
BEGIN
    IF v_user_id IS NULL THEN RAISE EXCEPTION 'No autenticado'; END IF;

    SELECT * INTO v_slot FROM public.user_chest_slots
    WHERE user_id = v_user_id AND slot_index = p_slot_index FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Cofre no encontrado.');
    END IF;

    -- Anti-Speed-Hack estricto: hora de servidor >= unlock_completes_at
    IF v_slot.status = 'unlocking' AND v_slot.unlock_completes_at > v_now THEN
        RETURN jsonb_build_object('success', false, 'message', 'El tiempo de desbloqueo aún no ha concluido.');
    END IF;

    -- Recompensas calibradas por tipo
    CASE v_slot.chest_type
        WHEN 'iron' THEN v_reward_credits := 1400; v_reward_blueprints := 140; v_reward_steel := 5;
        WHEN 'armored' THEN v_reward_credits := 3200; v_reward_blueprints := 340; v_reward_steel := 15;
        WHEN 'legendary' THEN v_reward_credits := 8000; v_reward_blueprints := 800; v_reward_steel := 40;
        ELSE v_reward_credits := 450; v_reward_blueprints := 45; -- wood / bronze
    END CASE;

    -- Multiplicador por Arena Tier
    v_reward_credits := FLOOR(v_reward_credits * (1.0 + (v_slot.arena_tier - 1) * 0.15));

    -- Entregar créditos al perfil
    UPDATE public.profiles
    SET battle_credits = battle_credits + v_reward_credits,
        updated_at = v_now
    WHERE id = v_user_id;

    -- Registrar en ledger
    INSERT INTO public.currency_ledger (user_id, currency, delta, balance_after, reason, reference_id, metadata)
    SELECT v_user_id, 'credits', v_reward_credits, battle_credits, 'chest_opening', v_slot.id::text,
           jsonb_build_object('chest_type', v_slot.chest_type, 'slot_index', p_slot_index)
    FROM public.profiles WHERE id = v_user_id;

    -- Vaciar ranura
    DELETE FROM public.user_chest_slots WHERE id = v_slot.id;

    RETURN jsonb_build_object(
        'success', true,
        'slot_index', p_slot_index,
        'reward_credits', v_reward_credits,
        'reward_blueprints', v_reward_blueprints,
        'reward_steel', v_reward_steel
    );
END;
$$;

-- 10. RPC: settle_ranked_match_result
CREATE OR REPLACE FUNCTION public.settle_ranked_match_result(
    p_match_id UUID,
    p_winner_id UUID,
    p_loser_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_winner_trophies INTEGER;
    v_loser_trophies INTEGER;
    v_arena_tier INTEGER := 1;
    v_delta_winner INTEGER;
    v_delta_loser INTEGER;
    v_now TIMESTAMPTZ := timezone('utc'::text, now());
BEGIN
    SELECT trophies_count INTO v_winner_trophies FROM public.profiles WHERE id = p_winner_id FOR UPDATE;
    SELECT trophies_count INTO v_loser_trophies FROM public.profiles WHERE id = p_loser_id FOR UPDATE;

    -- Calcular Arena Tier del ganador
    v_arena_tier := GREATEST(1, LEAST(10, FLOOR(v_winner_trophies / 400) + 1));

    -- Calcular deltas de Elo
    v_delta_winner := public.calculate_elo_delta(v_winner_trophies, v_loser_trophies, v_arena_tier, true);
    v_delta_loser := public.calculate_elo_delta(v_loser_trophies, v_winner_trophies, v_arena_tier, false);

    -- Actualizar perfiles
    UPDATE public.profiles
    SET trophies_count = trophies_count + v_delta_winner,
        elo_rating = elo_rating + v_delta_winner,
        highest_trophies = GREATEST(highest_trophies, trophies_count + v_delta_winner),
        total_victories = total_victories + 1,
        total_matches_played = total_matches_played + 1,
        updated_at = v_now
    WHERE id = p_winner_id;

    UPDATE public.profiles
    SET trophies_count = GREATEST(0, trophies_count + v_delta_loser),
        elo_rating = GREATEST(0, elo_rating + v_delta_loser),
        total_matches_played = total_matches_played + 1,
        updated_at = v_now
    WHERE id = p_loser_id;

    -- Marcar partida finalizada
    UPDATE public.active_matches
    SET status = 'finished',
        winner_id = p_winner_id,
        updated_at = v_now
    WHERE id = p_match_id;

    -- Otorgar ranura de cofre si el ganador tiene espacio (< 4)
    IF (SELECT count(*) FROM public.user_chest_slots WHERE user_id = p_winner_id) < 4 THEN
        INSERT INTO public.user_chest_slots (
            user_id, slot_index, chest_type, status, unlock_duration_seconds, arena_tier
        ) VALUES (
            p_winner_id,
            (SELECT COALESCE(MAX(slot_index), 0) + 1 FROM public.user_chest_slots WHERE user_id = p_winner_id),
            'iron', 'locked', 28800, v_arena_tier
        ) ON CONFLICT DO NOTHING;
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'winner_delta', v_delta_winner,
        'loser_delta', v_delta_loser,
        'winner_new_trophies', v_winner_trophies + v_delta_winner,
        'loser_new_trophies', GREATEST(0, v_loser_trophies + v_delta_loser)
    );
END;
$$;

-- 11. RPC: apply_season_trophy_reset (Drenaje Estacional Anti-Inflación)
CREATE OR REPLACE FUNCTION public.apply_season_trophy_reset()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_affected INTEGER := 0;
BEGIN
    -- Compresión estacional del 30% entre 3,200 y 4,000 trofeos; 50% por encima de 4,000
    UPDATE public.profiles
    SET trophies_count = CASE 
        WHEN trophies_count >= 4000 THEN 4000 + FLOOR((trophies_count - 4000) * 0.50)
        WHEN trophies_count >= 3200 THEN 3200 + FLOOR((trophies_count - 3200) * 0.70)
        ELSE trophies_count
    END,
    updated_at = timezone('utc'::text, now())
    WHERE trophies_count >= 3200;

    GET DIAGNOSTICS v_affected = ROW_COUNT;
    RETURN jsonb_build_object('success', true, 'profiles_compressed', v_affected);
END;
$$;

-- ==============================================================================
-- MIGRACIÓN 15: CONTROL DE ECONOMÍA OFFLINE Y ADAPTACIÓN DE TRANSPORTES
-- ==============================================================================
-- Fecha: 2026-10-31
-- Descripción:
-- 1. Añade control de partidas offline en 'profiles' (daily_offline_matches_count, last_offline_match_date).
-- 2. Implementa RPC 'grant_match_rewards' con:
--    - Factor 50% en recompensas offline (vs_bot, offline_practice, tutorial).
--    - 0 trofeos en modos offline.
--    - Límite duro de 3 partidas con botín por día (UTC 00:00).
--    - Módulos de dificultad: easy (0.85x), normal (1.00x), hard/chess (1.20x).
--    - Integración de auditoría en 'currency_ledger'.
-- ==============================================================================

-- 1. EXTENDER TABLA: profiles
ALTER TABLE public.profiles
    ADD COLUMN IF NOT EXISTS daily_offline_matches_count INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS last_offline_match_date DATE NOT NULL DEFAULT CURRENT_DATE;

-- 2. RPC ATÓMICA DE CONCESIÓN DE RECOMPENSAS
CREATE OR REPLACE FUNCTION public.grant_match_rewards(
    p_user_id UUID,
    p_match_id UUID,
    p_game_mode TEXT,
    p_is_victory BOOLEAN,
    p_turns_count INTEGER,
    p_properties_captured INTEGER,
    p_units_destroyed INTEGER,
    p_difficulty TEXT DEFAULT 'normal'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_base_score NUMERIC;
    v_result_mult NUMERIC;
    v_difficulty_mult NUMERIC := 1.0;
    v_xp_awarded INTEGER;
    v_credits_awarded INTEGER;
    v_trophies_delta INTEGER := 0;
    v_is_offline BOOLEAN;
    v_daily_count INTEGER := 0;
    v_last_date DATE := CURRENT_DATE;
    v_reward_capped BOOLEAN := false;
BEGIN
    v_is_offline := (p_game_mode IN ('vs_bot', 'offline_practice', 'tutorial'));

    -- Comprobación de límites offline (Máximo 3 partidas remuneradas por día)
    IF v_is_offline THEN
        SELECT COALESCE(daily_offline_matches_count, 0), COALESCE(last_offline_match_date, CURRENT_DATE)
        INTO v_daily_count, v_last_date
        FROM public.profiles
        WHERE id = p_user_id
        FOR UPDATE;

        -- Reinicio del ciclo diario a medianoche UTC
        IF v_last_date < CURRENT_DATE THEN
            v_daily_count := 0;
            v_last_date := CURRENT_DATE;
        END IF;

        IF v_daily_count >= 3 THEN
            v_reward_capped := true;
        END IF;
    END IF;

    -- Si superó el límite offline diario, recompensas se anulan (Modo entrenamiento)
    IF v_reward_capped THEN
        -- Registrar la partida en perfil sin créditos
        UPDATE public.profiles
        SET total_matches_played = total_matches_played + 1,
            total_victories = total_victories + CASE WHEN p_is_victory THEN 1 ELSE 0 END,
            updated_at = timezone('utc'::text, now())
        WHERE id = p_user_id;

        RETURN jsonb_build_object(
            'xp_awarded', 0,
            'battle_credits_awarded', 0,
            'trophies_delta', 0,
            'offline_capped', true,
            'message', 'Límite diario de recompensas offline alcanzado (3/3). Partida registrada sin créditos.'
        );
    END IF;

    -- Cálculo del puntaje base
    v_base_score := 120 + (p_properties_captured * 45) + (p_units_destroyed * 35) + (LEAST(p_turns_count, 30) * 6);
    
    IF p_is_victory THEN
        v_result_mult := 2.2;
    ELSE
        v_result_mult := 0.85;
    END IF;

    -- Multiplicadores de dificultad offline
    IF v_is_offline THEN
        IF p_difficulty = 'easy' THEN v_difficulty_mult := 0.85;
        ELSIF p_difficulty = 'hard' OR p_difficulty = 'chess' THEN v_difficulty_mult := 1.20;
        ELSE v_difficulty_mult := 1.00;
        END IF;
    END IF;

    -- Recompensas estándar base
    v_xp_awarded := FLOOR(v_base_score * v_result_mult);
    v_credits_awarded := FLOOR((60 + (p_properties_captured * 20) + (p_units_destroyed * 15)) * v_result_mult);

    -- REGLA OFFLINE: 50% de recompensas y 0 trofeos
    IF v_is_offline THEN
        v_xp_awarded := FLOOR(v_xp_awarded * 0.50 * v_difficulty_mult);
        v_credits_awarded := FLOOR(v_credits_awarded * 0.50 * v_difficulty_mult);
        v_trophies_delta := 0;

        -- Actualizar contador diario
        UPDATE public.profiles
        SET daily_offline_matches_count = v_daily_count + 1,
            last_offline_match_date = v_last_date
        WHERE id = p_user_id;
    ELSE
        -- Modo online: otorga trofeos
        v_trophies_delta := CASE WHEN p_is_victory THEN 30 ELSE -18 END;
    END IF;

    -- Asentar en perfil
    UPDATE public.profiles
    SET current_xp = current_xp + v_xp_awarded,
        battle_credits = battle_credits + v_credits_awarded,
        trophies_count = GREATEST(0, trophies_count + v_trophies_delta),
        total_matches_played = total_matches_played + 1,
        total_victories = total_victories + CASE WHEN p_is_victory THEN 1 ELSE 0 END,
        updated_at = timezone('utc'::text, now())
    WHERE id = p_user_id;

    -- Asentar auditoría contable en currency_ledger
    IF v_credits_awarded > 0 THEN
        INSERT INTO public.currency_ledger (
            user_id, currency, amount, balance_after, reason, reference_id, metadata
        ) VALUES (
            p_user_id, 'credits', v_credits_awarded,
            (SELECT battle_credits FROM public.profiles WHERE id = p_user_id),
            CASE WHEN v_is_offline THEN 'offline_match_reward' ELSE 'online_match_reward' END,
            p_match_id,
            jsonb_build_object('game_mode', p_game_mode, 'difficulty', p_difficulty)
        );
    END IF;

    RETURN jsonb_build_object(
        'xp_awarded', v_xp_awarded,
        'battle_credits_awarded', v_credits_awarded,
        'trophies_delta', v_trophies_delta,
        'offline_capped', false,
        'daily_offline_matches_used', CASE WHEN v_is_offline THEN v_daily_count + 1 ELSE 0 END
    );
END;
$$;

-- ============================================================================
-- MIGRACIÓN 21: SOFT CAP ESCALONADO OFFLINE Y PARIDAD DE TORNEO ESPORTS
-- Proyecto: Tactical Command: Wars of Legacy
-- Referencia: docs/orchestration/02_ECONOMY_AND_RETENTION_REBALANCE.md
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. EXTENSIÓN DE PROFILES: ELO ESPORTS (CIRCUITO CANÓNICO SIN P2W)
-- ----------------------------------------------------------------------------
ALTER TABLE public.profiles
    ADD COLUMN IF NOT EXISTS elo_rating_esports INTEGER NOT NULL DEFAULT 1200;

-- ----------------------------------------------------------------------------
-- 2. RPC TRANSACCIONAL: grant_match_rewards CON SOFT CAP ESCALONADO
-- Reemplaza el hard cap binario por la curva de retención suave:
-- mu(k) = [0.60 (k<=3), 0.30 (4<=k<=6), 0.10 (7<=k<=10), 0.02 (k>=11)]
-- Suelo garantizado: +5 XP y +10 Créditos
-- ----------------------------------------------------------------------------
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
    v_offline_multiplier NUMERIC(4,2) := 1.0;
    v_xp_awarded INTEGER;
    v_credits_awarded INTEGER;
    v_trophies_delta INTEGER := 0;
    v_is_offline BOOLEAN;
    v_daily_count INTEGER := 0;
    v_today DATE := (NOW() AT TIME ZONE 'UTC')::DATE;
    v_profile RECORD;
BEGIN
    SELECT * INTO v_profile FROM public.profiles WHERE id = p_user_id FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Perfil militar no encontrado para el usuario %', p_user_id;
    END IF;

    v_is_offline := (p_game_mode IN ('vs_bot', 'offline_practice', 'tutorial'));

    -- Manejo del contador diario de partidas offline
    IF v_profile.last_offline_match_date IS DISTINCT FROM v_today THEN
        v_daily_count := 0;
    ELSE
        v_daily_count := COALESCE(v_profile.daily_offline_matches_count, 0);
    END IF;

    -- Cálculo del puntaje base según el Core Loop canónico
    v_base_score := 120 + (p_properties_captured * 45) + (p_units_destroyed * 35) + (LEAST(p_turns_count, 30) * 6);
    
    IF p_is_victory THEN
        v_result_mult := 2.2;
    ELSE
        v_result_mult := 0.85;
    END IF;

    v_xp_awarded := FLOOR(v_base_score * v_result_mult);
    v_credits_awarded := FLOOR((60 + (p_properties_captured * 20) + (p_units_destroyed * 15)) * v_result_mult);

    IF v_is_offline THEN
        -- Factor de dificultad
        IF p_difficulty = 'easy' THEN v_difficulty_mult := 0.85;
        ELSIF p_difficulty = 'hard' OR p_difficulty = 'chess' THEN v_difficulty_mult := 1.20;
        ELSE v_difficulty_mult := 1.00;
        END IF;

        -- Curva de decaimiento Soft Cap en 4 tramos (RFC Sección 1.2)
        IF v_daily_count < 3 THEN
            v_offline_multiplier := 0.60;
        ELSIF v_daily_count < 6 THEN
            v_offline_multiplier := 0.30;
        ELSIF v_daily_count < 10 THEN
            v_offline_multiplier := 0.10;
        ELSE
            v_offline_multiplier := 0.02;
        END IF;

        -- Suelo de seguridad anti-churn: mínimo +5 XP y +10 Créditos
        v_xp_awarded := GREATEST(5, FLOOR(v_xp_awarded * v_offline_multiplier * v_difficulty_mult));
        v_credits_awarded := GREATEST(10, FLOOR(v_credits_awarded * v_offline_multiplier * v_difficulty_mult));
        v_trophies_delta := 0;
        v_daily_count := v_daily_count + 1;

        UPDATE public.profiles
        SET current_xp = current_xp + v_xp_awarded,
            battle_credits = battle_credits + v_credits_awarded,
            daily_offline_matches_count = v_daily_count,
            last_offline_match_date = v_today,
            total_matches_played = total_matches_played + 1,
            total_victories = CASE WHEN p_is_victory THEN total_victories + 1 ELSE total_victories END,
            updated_at = timezone('utc'::text, now())
        WHERE id = p_user_id;
    ELSE
        -- Modo online competitivo: otorga trofeos y progreso completo
        v_trophies_delta := CASE WHEN p_is_victory THEN 30 ELSE -18 END;

        UPDATE public.profiles
        SET current_xp = current_xp + v_xp_awarded,
            battle_credits = battle_credits + v_credits_awarded,
            total_matches_played = total_matches_played + 1,
            total_victories = CASE WHEN p_is_victory THEN total_victories + 1 ELSE total_victories END,
            trophies_count = GREATEST(0, COALESCE(trophies_count, 0) + v_trophies_delta),
            updated_at = timezone('utc'::text, now())
        WHERE id = p_user_id;
    END IF;

    -- Registro en el libro mayor de transacciones si existe la tabla
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'currency_ledger') THEN
        INSERT INTO public.currency_ledger (
            user_id,
            currency_type,
            amount,
            operation_type,
            reference_id,
            description
        ) VALUES (
            p_user_id,
            'battle_credits',
            v_credits_awarded,
            'match_reward',
            COALESCE(p_match_id, uuid_generate_v4()),
            CASE WHEN v_is_offline 
                THEN format('Recompensa Offline vs Bot (Tramo %s, mult %s)', v_daily_count, v_offline_multiplier)
                ELSE 'Recompensa Partida Online Competitiva'
            END
        );
    END IF;

    RETURN jsonb_build_object(
        'xp_awarded', v_xp_awarded,
        'battle_credits_awarded', v_credits_awarded,
        'trophies_delta', v_trophies_delta,
        'offline_multiplier', v_offline_multiplier,
        'daily_offline_count', v_daily_count,
        'is_offline', v_is_offline
    );
END;
$$;

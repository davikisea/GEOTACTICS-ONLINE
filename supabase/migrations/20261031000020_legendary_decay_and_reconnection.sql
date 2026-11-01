-- ============================================================================
-- MIGRATION: 20261031000020_legendary_decay_and_reconnection.sql
-- DESCRIPTION: Legendary League Activity Decay & Realtime PvP Reconnection Snapshot
-- RFC REFERENCE: docs/09_RFC_SYSTEM_REBALANCE_AND_UI_PARITY.md (Etapa 4 / Fase 4)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. EXTENSIÓN DE PROFILES: DÍAS DE GRACIA Y TELEMETRÍA DE DECAY
-- ----------------------------------------------------------------------------
ALTER TABLE public.profiles
    ADD COLUMN IF NOT EXISTS decay_bank_days INTEGER NOT NULL DEFAULT 3 CHECK (decay_bank_days >= 0 AND decay_bank_days <= 5),
    ADD COLUMN IF NOT EXISTS last_decay_processed_at TIMESTAMPTZ DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS last_competitive_match_at TIMESTAMPTZ DEFAULT NULL;

-- ----------------------------------------------------------------------------
-- 2. EXTENSIÓN DE PARTICIPANTES: BANCO DE GRACIA DE RED Y ESTADO DE CONEXIÓN
-- ----------------------------------------------------------------------------
ALTER TABLE public.match_participants
    ADD COLUMN IF NOT EXISTS disconnect_grace_bank_sec INTEGER NOT NULL DEFAULT 30 CHECK (disconnect_grace_bank_sec >= 0),
    ADD COLUMN IF NOT EXISTS is_connected BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN IF NOT EXISTS disconnected_at TIMESTAMPTZ DEFAULT NULL;

-- ----------------------------------------------------------------------------
-- 3. RPC: ACREDITACIÓN DE ACTIVIDAD COMPETITIVA (DECAY BANK CREDIT)
-- Otorga +1 día de gracia al disputar partidas competitivas (clamped por liga)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.rpc_credit_competitive_activity(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_trophies INTEGER;
    v_current_bank INTEGER;
    v_max_bank INTEGER := 5;
    v_new_bank INTEGER;
BEGIN
    SELECT trophies_count, decay_bank_days
    INTO v_trophies, v_current_bank
    FROM public.profiles
    WHERE id = p_user_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'USER_NOT_FOUND');
    END IF;

    -- Parámetros canónicos según Anexo E / RFC:
    -- Liga I: Contendientes (4,000 - 4,499) -> Cap 5 días
    -- Liga II: Élite Estratégica (4,500 - 4,999) -> Cap 4 días
    -- Liga III: Gran Mariscal (>= 5,000) -> Cap 3 días
    IF v_trophies >= 5000 THEN
        v_max_bank := 3;
    ELSIF v_trophies >= 4500 THEN
        v_max_bank := 4;
    ELSE
        v_max_bank := 5;
    END IF;

    v_new_bank := LEAST(v_max_bank, COALESCE(v_current_bank, 0) + 1);

    UPDATE public.profiles
    SET decay_bank_days = v_new_bank,
        last_competitive_match_at = timezone('utc'::text, now())
    WHERE id = p_user_id;

    RETURN jsonb_build_object(
        'success', true,
        'user_id', p_user_id,
        'trophies', v_trophies,
        'decay_bank_days', v_new_bank,
        'bank_cap', v_max_bank
    );
END;
$$;

-- ----------------------------------------------------------------------------
-- 4. CRON: PROCESAMIENTO DIARIO DE DEGRADACIÓN EN LIGAS LEGENDARIAS (00:00 UTC)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.cron_process_legendary_trophy_decay()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_rec RECORD;
    v_affected_count INTEGER := 0;
    v_decayed_count INTEGER := 0;
    v_penalty INTEGER;
    v_floor INTEGER;
    v_new_trophies INTEGER;
    v_now TIMESTAMPTZ := timezone('utc'::text, now());
BEGIN
    -- Seleccionar todos los comandantes en Ligas Legendarias (>= 4000 trofeos)
    FOR v_rec IN
        SELECT id, trophies_count, decay_bank_days
        FROM public.profiles
        WHERE trophies_count >= 4000
        FOR UPDATE
    LOOP
        v_affected_count := v_affected_count + 1;

        IF v_rec.decay_bank_days > 0 THEN
            -- Consume un día de gracia sin penalización de trofeos
            UPDATE public.profiles
            SET decay_bank_days = v_rec.decay_bank_days - 1,
                last_decay_processed_at = v_now
            WHERE id = v_rec.id;
        ELSE
            -- Sin días de gracia: aplicar penalización por división según Anexo E
            IF v_rec.trophies_count >= 5000 THEN
                -- Liga III: Gran Mariscal (-60 trofeos/día, piso absoluto 4500)
                v_penalty := 60;
                v_floor := 4500;
            ELSIF v_rec.trophies_count >= 4500 THEN
                -- Liga II: Élite Estratégica (-40 trofeos/día, piso inviolable 4500)
                v_penalty := 40;
                v_floor := 4500;
            ELSE
                -- Liga I: Contendientes (-25 trofeos/día, piso inviolable 4000)
                v_penalty := 25;
                v_floor := 4000;
            END IF;

            v_new_trophies := GREATEST(v_floor, v_rec.trophies_count - v_penalty);

            UPDATE public.profiles
            SET trophies_count = v_new_trophies,
                last_decay_processed_at = v_now
            WHERE id = v_rec.id;

            v_decayed_count := v_decayed_count + 1;
        END IF;
    END LOOP;

    RETURN jsonb_build_object(
        'success', true,
        'processed_at', v_now,
        'legendary_profiles_checked', v_affected_count,
        'profiles_penalized_with_decay', v_decayed_count
    );
END;
$$;

-- ----------------------------------------------------------------------------
-- 5. RPC: RESINCRONIZACIÓN ATÓMICA DE PARTIDA (SNAPSHOT DUMP O(1))
-- Permite al cliente reconectado hidratar unidades, niebla, fondos y cronómetros
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.rpc_get_match_snapshot(p_match_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_match RECORD;
    v_participants JSONB;
    v_player_view RECORD;
    v_state RECORD;
BEGIN
    -- Validar existencia de la partida
    SELECT * INTO v_match
    FROM public.active_matches
    WHERE id = p_match_id;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'MATCH_NOT_FOUND');
    END IF;

    -- Agrupar participantes con bancos de gracia y conectividad
    SELECT jsonb_agg(
        jsonb_build_object(
            'player_slot', mp.player_slot,
            'slot_key', mp.slot_key,
            'team_id', mp.team_id,
            'user_id', mp.user_id,
            'is_bot', mp.is_bot,
            'commander_id', mp.commander_id,
            'co_power_meter', mp.co_power_meter,
            'active_co_power', mp.active_co_power,
            'funds', mp.funds,
            'is_connected', mp.is_connected,
            'disconnect_grace_bank_sec', mp.disconnect_grace_bank_sec
        )
    ) INTO v_participants
    FROM public.match_participants mp
    WHERE mp.match_id = p_match_id;

    -- Obtener la proyección de niebla autoritativa para el jugador consultante
    SELECT * INTO v_player_view
    FROM public.match_player_views
    WHERE match_id = p_match_id AND player_id = v_user_id;

    -- Obtener estado global de la cuadrícula
    SELECT * INTO v_state
    FROM public.match_state
    WHERE match_id = p_match_id;

    RETURN jsonb_build_object(
        'success', true,
        'match_id', p_match_id,
        'status', v_match.status,
        'current_turn', v_match.current_turn,
        'current_turn_slot', v_match.current_turn_slot,
        'time_remaining', v_match.time_remaining,
        'map_id', v_match.map_id,
        'game_mode', v_match.game_mode,
        'participants', COALESCE(v_participants, '[]'::jsonb),
        'visible_units', COALESCE(v_player_view.visible_units, '[]'::jsonb),
        'visible_properties', COALESCE(v_player_view.visible_properties, '[]'::jsonb),
        'own_funds', COALESCE(v_player_view.own_funds, 1000),
        'own_co_power', COALESCE(v_player_view.own_co_power, 0),
        'weather', COALESCE(v_state.weather, 'CLEAR'),
        'turn_seed', v_match.rng_seed
    );
END;
$$;

-- ==============================================================================
-- MIGRACIÓN 19: REINGENIERÍA CONSOLIDADA DE ARQUITECTURA SUPABASE Y EQUILIBRIO SISTÉMICO
-- ==============================================================================
-- Proyecto: Tactical Command: Wars of Legacy
-- Especificación Canónica: docs/architecture/PROPUESTA_REINGENIERIA_MIGRACION_16.md
-- Fecha: Octubre 2026
--
-- Resuelve las 5 Fricciones Fatales:
-- 1. Fricción 5.1 & 5.2: Normalización de 'currency_ledger' (delta, metadata, reference_id, razones dinámicas).
-- 2. Fricción 5.3: Jerarquía de 4 rangos militares en 'clan_members' y tesorería corporativa en 'clans'.
-- 3. Refactorización atómica e idempotente de RPCs: 'grant_match_rewards', 'claim_chest_reward' y 'pay_dishonor_embargo_fee'.
-- 4. Fricción 5.4: Topología Realtime de alta eficiencia (REPLICA IDENTITY FULL y adición a 'supabase_realtime').
-- ==============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- 1. TABLA DE CONFIGURACIÓN DINÁMICA DE ECONOMÍA (GAME BALANCING KNOBS)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.system_economy_config (
    config_key VARCHAR(64) PRIMARY KEY,
    config_value JSONB NOT NULL,
    description TEXT NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.system_economy_config ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'system_economy_config' AND policyname = 'system_economy_config_read_all'
    ) THEN
        CREATE POLICY "system_economy_config_read_all" ON public.system_economy_config 
        FOR SELECT USING (true);
    END IF;
END $$;

-- Semilla de Parámetros Dinámicos
INSERT INTO public.system_economy_config (config_key, config_value, description)
VALUES 
(
    'match_rewards_params',
    '{
        "online_win_credits": 250,
        "online_loss_credits": 75,
        "online_win_xp": 120,
        "online_loss_xp": 40,
        "online_win_trophies": 30,
        "online_loss_trophies": -18,
        "online_kill_credit_bonus": 30,
        "online_turn_xp_bonus": 5,
        "offline_ratio": 0.50,
        "daily_offline_cap": 3
    }'::jsonb,
    'Parámetros de recompensas por partida online y límites diarios offline anti-farming'
),
(
    'clan_dishonor_params',
    '{
        "fee_credits": 1500,
        "fee_steel": 30,
        "fee_gems": 50,
        "treasury_share_pct": 50,
        "top1_share_pct": 25,
        "top2_share_pct": 15,
        "top3_share_pct": 10,
        "sink_burn_pct": 0
    }'::jsonb,
    'Fórmulas de recaudación y distribución aristocrática del Embargo por Deshonor'
),
(
    'chest_unlock_multipliers',
    '{
        "iron_credits": 1400,
        "armored_credits": 3200,
        "legendary_credits": 8000,
        "arena_tier_scale": 0.15
    }'::jsonb,
    'Escalado de créditos y planos en cofres clasificatorios'
)
ON CONFLICT (config_key) DO UPDATE 
SET config_value = EXCLUDED.config_value, updated_at = timezone('utc'::text, now());

-- ----------------------------------------------------------------------------
-- 2. REINGENIERÍA ESTRUCTURAL DE currency_ledger
-- ----------------------------------------------------------------------------
DO $$ 
BEGIN
    -- Asegurar que exista delta (si existía amount por error de migración previa, renombrar)
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'currency_ledger' AND column_name = 'amount'
    ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'currency_ledger' AND column_name = 'delta'
    ) THEN
        ALTER TABLE public.currency_ledger RENAME COLUMN amount TO delta;
    END IF;

    -- Agregar delta si no existe
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'currency_ledger' AND column_name = 'delta'
    ) THEN
        ALTER TABLE public.currency_ledger ADD COLUMN delta INTEGER NOT NULL DEFAULT 0;
        ALTER TABLE public.currency_ledger ADD CONSTRAINT chk_currency_ledger_delta CHECK (delta <> 0);
    END IF;

    -- Agregar metadata JSONB si falta
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'currency_ledger' AND column_name = 'metadata'
    ) THEN
        ALTER TABLE public.currency_ledger ADD COLUMN metadata JSONB NOT NULL DEFAULT '{}'::jsonb;
    END IF;

    -- Agregar reference_id si falta
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'currency_ledger' AND column_name = 'reference_id'
    ) THEN
        ALTER TABLE public.currency_ledger ADD COLUMN reference_id VARCHAR(128) DEFAULT NULL;
    END IF;
END $$;

-- Eliminar check estático de 'reason' y reemplazar por check flexible de longitud
ALTER TABLE public.currency_ledger DROP CONSTRAINT IF EXISTS currency_ledger_reason_check;
ALTER TABLE public.currency_ledger DROP CONSTRAINT IF EXISTS chk_currency_ledger_reason_length;
ALTER TABLE public.currency_ledger ADD CONSTRAINT chk_currency_ledger_reason_length 
CHECK (char_length(reason) >= 3 AND char_length(reason) <= 64);

-- ----------------------------------------------------------------------------
-- 3. ESTANDARIZACIÓN MILITAR DE CLANES Y TESORERÍA
-- ----------------------------------------------------------------------------
-- Agregar columnas de tesorería a public.clans
ALTER TABLE public.clans 
    ADD COLUMN IF NOT EXISTS treasury_gold BIGINT NOT NULL DEFAULT 0 CHECK (treasury_gold >= 0),
    ADD COLUMN IF NOT EXISTS treasury_steel BIGINT NOT NULL DEFAULT 0 CHECK (treasury_steel >= 0),
    ADD COLUMN IF NOT EXISTS treasury_gems BIGINT NOT NULL DEFAULT 0 CHECK (treasury_gems >= 0);

-- Migrar y estandarizar roles a 4 Rangos Militares
ALTER TABLE public.clan_members DROP CONSTRAINT IF EXISTS clan_members_role_check;
ALTER TABLE public.clan_members DROP CONSTRAINT IF EXISTS chk_clan_members_military_role;

UPDATE public.clan_members SET role = 'commander_in_chief' WHERE role IN ('leader', 'commander_in_chief');
UPDATE public.clan_members SET role = 'executive_officer' WHERE role IN ('co_leader', 'executive_officer');
UPDATE public.clan_members SET role = 'field_officer' WHERE role IN ('elder', 'officer', 'field_officer');
UPDATE public.clan_members SET role = 'cadet' WHERE role IN ('member', 'cadet');

ALTER TABLE public.clan_members ADD CONSTRAINT chk_clan_members_military_role 
CHECK (role IN ('commander_in_chief', 'executive_officer', 'field_officer', 'cadet'));

-- ----------------------------------------------------------------------------
-- 4. REFACTORIZACIÓN ATÓMICA DE grant_match_rewards
-- ----------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.grant_match_rewards(UUID, VARCHAR, BOOLEAN, VARCHAR, VARCHAR);
DROP FUNCTION IF EXISTS public.grant_match_rewards(UUID, UUID, TEXT, BOOLEAN, INTEGER, INTEGER, INTEGER, TEXT);

CREATE OR REPLACE FUNCTION public.grant_match_rewards(
    p_user_id UUID,
    p_match_id VARCHAR(128),
    p_is_victory BOOLEAN,
    p_game_mode VARCHAR(32) DEFAULT 'ranked_ladder',
    p_difficulty VARCHAR(16) DEFAULT 'normal',
    p_turns_count INTEGER DEFAULT 10,
    p_properties_captured INTEGER DEFAULT 0,
    p_units_destroyed INTEGER DEFAULT 0
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_config JSONB;
    v_is_offline BOOLEAN := (p_game_mode IN ('offline_skirmish', 'practice_vs_ai', 'bot_skirmish', 'vs_bot', 'bot_vs_bot', 'offline_practice', 'tutorial'));
    v_daily_count INTEGER := 0;
    v_diff_mult NUMERIC := 1.0;
    v_xp_awarded INTEGER;
    v_credits_awarded INTEGER;
    v_trophies_delta INTEGER := 0;
    v_balance_after INTEGER;
BEGIN
    IF auth.uid() IS NOT NULL AND auth.uid() <> p_user_id THEN
        RAISE EXCEPTION 'Violación de seguridad: No puedes reclamar recompensas de otro usuario.';
    END IF;

    SELECT config_value INTO v_config 
    FROM public.system_economy_config 
    WHERE config_key = 'match_rewards_params';

    IF v_config IS NULL THEN
        v_config := '{
            "online_win_credits": 250,
            "online_loss_credits": 75,
            "online_win_xp": 120,
            "online_loss_xp": 40,
            "online_win_trophies": 30,
            "online_loss_trophies": -18,
            "online_kill_credit_bonus": 30,
            "online_turn_xp_bonus": 5,
            "offline_ratio": 0.50,
            "daily_offline_cap": 3
        }'::jsonb;
    END IF;

    IF v_is_offline THEN
        IF p_difficulty = 'easy' THEN
            v_diff_mult := 0.85;
        ELSIF p_difficulty IN ('hard', 'chess') THEN
            v_diff_mult := 1.20;
        ELSE
            v_diff_mult := 1.00;
        END IF;

        SELECT COALESCE(COUNT(*), 0) INTO v_daily_count
        FROM public.currency_ledger
        WHERE user_id = p_user_id 
          AND reason = 'offline_match_reward'
          AND created_at >= timezone('utc'::text, now()) - INTERVAL '24 hours';

        IF v_daily_count >= COALESCE((v_config->>'daily_offline_cap')::INTEGER, 3) THEN
            RETURN jsonb_build_object(
                'xp_awarded', 0,
                'battle_credits_awarded', 0,
                'trophies_delta', 0,
                'offline_capped', true,
                'message', 'Límite diario de partidas offline alcanzado (3/3).'
            );
        END IF;

        IF p_is_victory THEN
            v_xp_awarded := FLOOR(((v_config->>'online_win_xp')::INTEGER + (LEAST(COALESCE(p_turns_count, 10), 30) * COALESCE((v_config->>'online_turn_xp_bonus')::INTEGER, 5))) * COALESCE((v_config->>'offline_ratio')::NUMERIC, 0.50) * v_diff_mult);
            v_credits_awarded := FLOOR(((v_config->>'online_win_credits')::INTEGER + (COALESCE(p_units_destroyed, 0) * COALESCE((v_config->>'online_kill_credit_bonus')::INTEGER, 30))) * COALESCE((v_config->>'offline_ratio')::NUMERIC, 0.50) * v_diff_mult);
        ELSE
            v_xp_awarded := FLOOR((v_config->>'online_loss_xp')::INTEGER * COALESCE((v_config->>'offline_ratio')::NUMERIC, 0.50) * v_diff_mult);
            v_credits_awarded := FLOOR((v_config->>'online_loss_credits')::INTEGER * COALESCE((v_config->>'offline_ratio')::NUMERIC, 0.50) * v_diff_mult);
        END IF;
        v_trophies_delta := 0;
    ELSE
        IF p_is_victory THEN
            v_xp_awarded := (v_config->>'online_win_xp')::INTEGER + (LEAST(COALESCE(p_turns_count, 10), 30) * COALESCE((v_config->>'online_turn_xp_bonus')::INTEGER, 5));
            v_credits_awarded := (v_config->>'online_win_credits')::INTEGER + (COALESCE(p_units_destroyed, 0) * COALESCE((v_config->>'online_kill_credit_bonus')::INTEGER, 30));
            v_trophies_delta := (v_config->>'online_win_trophies')::INTEGER;
        ELSE
            v_xp_awarded := (v_config->>'online_loss_xp')::INTEGER;
            v_credits_awarded := (v_config->>'online_loss_credits')::INTEGER;
            v_trophies_delta := (v_config->>'online_loss_trophies')::INTEGER;
        END IF;
    END IF;

    UPDATE public.profiles
    SET current_xp = current_xp + v_xp_awarded,
        battle_credits = battle_credits + v_credits_awarded,
        trophies_count = GREATEST(0, trophies_count + v_trophies_delta),
        total_matches_played = total_matches_played + 1,
        total_victories = total_victories + CASE WHEN p_is_victory THEN 1 ELSE 0 END,
        updated_at = timezone('utc'::text, now())
    WHERE id = p_user_id
    RETURNING battle_credits INTO v_balance_after;

    IF v_credits_awarded > 0 THEN
        INSERT INTO public.currency_ledger (
            user_id, currency, delta, balance_after, reason, reference_id, metadata
        ) VALUES (
            p_user_id, 'credits', v_credits_awarded, v_balance_after,
            CASE WHEN v_is_offline THEN 'offline_match_reward' ELSE 'online_match_reward' END,
            p_match_id,
            jsonb_build_object(
                'game_mode', p_game_mode,
                'difficulty', p_difficulty,
                'is_victory', p_is_victory,
                'turns_count', p_turns_count,
                'units_destroyed', p_units_destroyed
            )
        );
    END IF;

    RETURN jsonb_build_object(
        'xp_awarded', v_xp_awarded,
        'battle_credits_awarded', v_credits_awarded,
        'trophies_delta', v_trophies_delta,
        'offline_capped', false,
        'balance_after', v_balance_after
    );
END;
$$;

-- ----------------------------------------------------------------------------
-- 5. REFACTORIZACIÓN ATÓMICA DE claim_chest_reward
-- ----------------------------------------------------------------------------
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
    v_reward_credits INTEGER := 450;
    v_reward_blueprints INTEGER := 45;
    v_reward_steel INTEGER := 0;
    v_balance_after INTEGER;
BEGIN
    IF v_user_id IS NULL THEN 
        RAISE EXCEPTION 'No autenticado.'; 
    END IF;

    SELECT * INTO v_slot FROM public.user_chest_slots
    WHERE user_id = v_user_id AND slot_index = p_slot_index FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Cofre no encontrado en la ranura indicada.');
    END IF;

    IF v_slot.status = 'unlocking' AND v_slot.unlock_completes_at > v_now THEN
        RETURN jsonb_build_object('success', false, 'message', 'El tiempo de desbloqueo aún no ha concluido.');
    END IF;

    CASE v_slot.chest_type
        WHEN 'iron' THEN v_reward_credits := 1400; v_reward_blueprints := 140; v_reward_steel := 5;
        WHEN 'armored' THEN v_reward_credits := 3200; v_reward_blueprints := 340; v_reward_steel := 15;
        WHEN 'legendary' THEN v_reward_credits := 8000; v_reward_blueprints := 800; v_reward_steel := 40;
        ELSE v_reward_credits := 450; v_reward_blueprints := 45; v_reward_steel := 0;
    END CASE;

    v_reward_credits := FLOOR(v_reward_credits * (1.0 + (COALESCE(v_slot.arena_tier, 1) - 1) * 0.15));

    UPDATE public.profiles
    SET battle_credits = battle_credits + v_reward_credits,
        updated_at = v_now
    WHERE id = v_user_id
    RETURNING battle_credits INTO v_balance_after;

    INSERT INTO public.currency_ledger (
        user_id, currency, delta, balance_after, reason, reference_id, metadata
    ) VALUES (
        v_user_id, 'credits', v_reward_credits, v_balance_after,
        'chest_reward', v_slot.id::text,
        jsonb_build_object('chest_type', v_slot.chest_type, 'slot_index', p_slot_index, 'steel_awarded', v_reward_steel)
    );

    IF v_reward_steel > 0 THEN
        UPDATE public.user_industrial_inventory
        SET refined_steel = refined_steel + v_reward_steel,
            updated_at = v_now
        WHERE user_id = v_user_id;
    END IF;

    DELETE FROM public.user_chest_slots WHERE id = v_slot.id;

    RETURN jsonb_build_object(
        'success', true,
        'slot_index', p_slot_index,
        'reward_credits', v_reward_credits,
        'reward_blueprints', v_reward_blueprints,
        'reward_steel', v_reward_steel,
        'balance_after', v_balance_after
    );
END;
$$;

-- ----------------------------------------------------------------------------
-- 6. REFACTORIZACIÓN ATÓMICA DE pay_dishonor_embargo_fee
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.pay_dishonor_embargo_fee(
    p_clan_id UUID,
    p_currency VARCHAR(16) DEFAULT 'resources'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_member public.clan_members%ROWTYPE;
    v_config JSONB;
    v_fee_credits INTEGER;
    v_fee_steel INTEGER;
    v_fee_gems INTEGER;
    v_treasury_gold_share INTEGER;
    v_treasury_steel_share INTEGER;
    v_top1_gold INTEGER; v_top1_steel INTEGER;
    v_top2_gold INTEGER; v_top2_steel INTEGER;
    v_top3_gold INTEGER; v_top3_steel INTEGER;
    v_top_members UUID[];
    v_top1 UUID; v_top2 UUID; v_top3 UUID;
    v_user_credits INTEGER;
    v_user_steel INTEGER;
    v_user_gems INTEGER;
BEGIN
    IF v_user_id IS NULL THEN 
        RAISE EXCEPTION 'No autenticado.'; 
    END IF;

    SELECT config_value INTO v_config 
    FROM public.system_economy_config 
    WHERE config_key = 'clan_dishonor_params';

    v_fee_credits := COALESCE((v_config->>'fee_credits')::INTEGER, 1500);
    v_fee_steel := COALESCE((v_config->>'fee_steel')::INTEGER, 30);
    v_fee_gems := COALESCE((v_config->>'fee_gems')::INTEGER, 50);

    v_treasury_gold_share := FLOOR(v_fee_credits * (COALESCE((v_config->>'treasury_share_pct')::NUMERIC, 50) / 100));
    v_treasury_steel_share := FLOOR(v_fee_steel * (COALESCE((v_config->>'treasury_share_pct')::NUMERIC, 50) / 100));

    v_top1_gold := FLOOR(v_fee_credits * (COALESCE((v_config->>'top1_share_pct')::NUMERIC, 25) / 100));
    v_top2_gold := FLOOR(v_fee_credits * (COALESCE((v_config->>'top2_share_pct')::NUMERIC, 15) / 100));
    v_top3_gold := v_fee_credits - v_treasury_gold_share - v_top1_gold - v_top2_gold;

    v_top1_steel := FLOOR(v_fee_steel * (COALESCE((v_config->>'top1_share_pct')::NUMERIC, 25) / 100));
    v_top2_steel := FLOOR(v_fee_steel * (COALESCE((v_config->>'top2_share_pct')::NUMERIC, 15) / 100));
    v_top3_steel := v_fee_steel - v_treasury_steel_share - v_top1_steel - v_top2_steel;

    SELECT * INTO v_member 
    FROM public.clan_members 
    WHERE user_id = v_user_id AND clan_id = p_clan_id 
    FOR UPDATE;

    IF v_member.id IS NULL THEN 
        RAISE EXCEPTION 'El usuario no pertenece a la corporación militar especificada.'; 
    END IF;

    SELECT array_agg(user_id) INTO v_top_members FROM (
        SELECT user_id FROM public.clan_members 
        WHERE clan_id = p_clan_id AND user_id <> v_user_id
        ORDER BY donated_cards_weekly DESC, joined_at ASC 
        LIMIT 3
    ) sub;

    v_top1 := v_top_members[1];
    v_top2 := v_top_members[2];
    v_top3 := v_top_members[3];

    IF p_currency = 'resources' THEN
        SELECT battle_credits INTO v_user_credits FROM public.profiles WHERE id = v_user_id FOR UPDATE;
        SELECT refined_steel INTO v_user_steel FROM public.user_industrial_inventory WHERE user_id = v_user_id FOR UPDATE;

        IF v_user_credits < v_fee_credits OR v_user_steel < v_fee_steel THEN
            RAISE EXCEPTION 'Fondos insuficientes: Requieres % créditos y % vigas de acero.', v_fee_credits, v_fee_steel;
        END IF;

        UPDATE public.profiles SET battle_credits = battle_credits - v_fee_credits WHERE id = v_user_id;
        UPDATE public.user_industrial_inventory SET refined_steel = refined_steel - v_fee_steel WHERE user_id = v_user_id;

        UPDATE public.clans 
        SET treasury_gold = treasury_gold + v_treasury_gold_share,
            treasury_steel = treasury_steel + v_treasury_steel_share
        WHERE id = p_clan_id;

        IF v_top1 IS NOT NULL THEN
            UPDATE public.profiles SET battle_credits = battle_credits + v_top1_gold WHERE id = v_top1;
            UPDATE public.user_industrial_inventory SET refined_steel = refined_steel + v_top1_steel WHERE user_id = v_top1;
        END IF;
        IF v_top2 IS NOT NULL THEN
            UPDATE public.profiles SET battle_credits = battle_credits + v_top2_gold WHERE id = v_top2;
            UPDATE public.user_industrial_inventory SET refined_steel = refined_steel + v_top2_steel WHERE user_id = v_top2;
        END IF;
        IF v_top3 IS NOT NULL THEN
            UPDATE public.profiles SET battle_credits = battle_credits + v_top3_gold WHERE id = v_top3;
            UPDATE public.user_industrial_inventory SET refined_steel = refined_steel + v_top3_steel WHERE user_id = v_top3;
        END IF;

        INSERT INTO public.currency_ledger (user_id, currency, delta, balance_after, reason, reference_id, metadata)
        VALUES (
            v_user_id, 'credits', -v_fee_credits, v_user_credits - v_fee_credits,
            'clan_dishonor_fee', p_clan_id::text,
            jsonb_build_object('treasury_gold_share', v_treasury_gold_share, 'currency_used', 'resources')
        );
    ELSE
        SELECT command_gems INTO v_user_gems FROM public.profiles WHERE id = v_user_id FOR UPDATE;
        IF v_user_gems < v_fee_gems THEN
            RAISE EXCEPTION 'Gemas insuficientes: Requieres % gemas de mando.', v_fee_gems;
        END IF;

        UPDATE public.profiles SET command_gems = command_gems - v_fee_gems WHERE id = v_user_id;
        UPDATE public.clans SET treasury_gems = treasury_gems + 25 WHERE id = p_clan_id;

        IF v_top1 IS NOT NULL THEN UPDATE public.profiles SET command_gems = command_gems + 13 WHERE id = v_top1; END IF;
        IF v_top2 IS NOT NULL THEN UPDATE public.profiles SET command_gems = command_gems + 7 WHERE id = v_top2; END IF;
        IF v_top3 IS NOT NULL THEN UPDATE public.profiles SET command_gems = command_gems + 5 WHERE id = v_top3; END IF;

        INSERT INTO public.currency_ledger (user_id, currency, delta, balance_after, reason, reference_id, metadata)
        VALUES (
            v_user_id, 'gems', -v_fee_gems, v_user_gems - v_fee_gems,
            'clan_dishonor_fee', p_clan_id::text,
            jsonb_build_object('treasury_gems_share', 25, 'currency_used', 'gems')
        );
    END IF;

    INSERT INTO public.chat_messages (
        channel_type, channel_id, sender_id, message_text, metadata
    ) VALUES (
        'clan', p_clan_id::text, v_user_id,
        '¡HONOR RESTABLECIDO! Fianza saldada. 50% depositado en la Tesorería y 50% tributado al Top 3 de vanguardia.',
        jsonb_build_object('type', 'dishonor_rehabilitated', 'fee_credits', v_fee_credits)
    );

    RETURN jsonb_build_object(
        'success', true,
        'treasury_gold_added', v_treasury_gold_share,
        'treasury_steel_added', v_treasury_steel_share,
        'top1_notified', v_top1
    );
END;
$$;

-- ----------------------------------------------------------------------------
-- 7. TOPOLOGÍA DE ALTA EFICIENCIA PARA SUPABASE REALTIME
-- ----------------------------------------------------------------------------
ALTER TABLE public.matchmaking_queue REPLICA IDENTITY FULL;
ALTER TABLE public.active_matches REPLICA IDENTITY FULL;
ALTER TABLE public.match_participants REPLICA IDENTITY FULL;
ALTER TABLE public.chat_messages REPLICA IDENTITY FULL;

DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
        IF NOT EXISTS (
            SELECT 1 FROM pg_publication_tables 
            WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'matchmaking_queue'
        ) THEN
            ALTER PUBLICATION supabase_realtime ADD TABLE public.matchmaking_queue;
        END IF;

        IF NOT EXISTS (
            SELECT 1 FROM pg_publication_tables 
            WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'active_matches'
        ) THEN
            ALTER PUBLICATION supabase_realtime ADD TABLE public.active_matches;
        END IF;

        IF NOT EXISTS (
            SELECT 1 FROM pg_publication_tables 
            WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'match_participants'
        ) THEN
            ALTER PUBLICATION supabase_realtime ADD TABLE public.match_participants;
        END IF;

        IF NOT EXISTS (
            SELECT 1 FROM pg_publication_tables 
            WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'chat_messages'
        ) THEN
            ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
        END IF;
    END IF;
END $$;

COMMIT;

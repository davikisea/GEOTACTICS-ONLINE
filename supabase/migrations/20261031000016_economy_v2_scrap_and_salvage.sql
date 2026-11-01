-- ==============================================================================
-- MIGRACIÓN 16: REINGENIERÍA MACROECONÓMICA V2.1, RECICLADOR Y RESOLUCIÓN SINK CHOKE
-- ==============================================================================
-- Especificación Canónica: docs/09_PROPOSAL_ECONOMY_REBALANCE_V2.md (v2.1.0-CALIBRATED-100D)
-- Aprobado por: Lead Developer (2026-10-31)
--
-- Contenido:
-- 1. Ampliación de tipos de divisa y razones válidas en 'currency_ledger'.
-- 2. Corrección atómica del RPC 'grant_match_rewards' (sustitución de amount por delta).
-- 3. Incorporación de 'tech_scrap' en 'user_industrial_inventory'.
-- 4. Conciliación de tesorería corporativa en tabla 'clans' (treasury_gold, treasury_steel).
-- 5. RPC 'scrap_blueprints': reciclaje y desguace de planos a chatarra y créditos.
-- 6. RPC 'transmute_tech_scrap': síntesis de microchips en Sala Limpia.
-- 7. Publicación en 'supabase_realtime' para emparejamiento y eventos en vivo.
-- ==============================================================================

-- 1. AJUSTES EN CURRENCY_LEDGER
ALTER TABLE public.currency_ledger 
    DROP CONSTRAINT IF EXISTS currency_ledger_currency_check;

ALTER TABLE public.currency_ledger 
    ADD CONSTRAINT currency_ledger_currency_check 
    CHECK (currency IN ('credits', 'gems', 'refined_steel', 'refined_concrete', 'refined_microchip', 'tech_scrap'));

ALTER TABLE public.currency_ledger 
    DROP CONSTRAINT IF EXISTS currency_ledger_reason_check;

ALTER TABLE public.currency_ledger 
    ADD CONSTRAINT currency_ledger_reason_check 
    CHECK (reason IN (
        'match_reward', 'online_match_reward', 'offline_match_reward',
        'level_up', 'shop_purchase', 'card_upgrade', 'commander_upgrade',
        'chest_reward', 'chest_opening', 'chest_speedup', 'command_pass',
        'stripe_purchase', 'quest_reward', 'scrap_blueprints', 'transmutation',
        'dishonor_fee', 'clan_treasury_deposit'
    ));

-- 2. CHATARRA TECNOLÓGICA EN INVENTARIO INDUSTRIAL
ALTER TABLE public.user_industrial_inventory 
    ADD COLUMN IF NOT EXISTS tech_scrap INTEGER NOT NULL DEFAULT 0 CHECK (tech_scrap >= 0);

-- 3. TESORERÍA EN CLANES
ALTER TABLE public.clans 
    ADD COLUMN IF NOT EXISTS treasury_gold INTEGER NOT NULL DEFAULT 0 CHECK (treasury_gold >= 0),
    ADD COLUMN IF NOT EXISTS treasury_steel INTEGER NOT NULL DEFAULT 0 CHECK (treasury_steel >= 0);

-- 4. RECOMPILACIÓN CORREGIDA DE RPC: grant_match_rewards (REEMPLAZA AMOUNT POR DELTA)
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
    v_arena_tier INTEGER := 1;
    v_arena_mult NUMERIC := 1.0;
    v_user_trophies INTEGER := 0;
    v_xp_awarded INTEGER;
    v_credits_awarded INTEGER;
    v_trophies_delta INTEGER := 0;
    v_is_offline BOOLEAN;
    v_daily_count INTEGER := 0;
    v_last_date DATE := CURRENT_DATE;
    v_reward_capped BOOLEAN := false;
BEGIN
    v_is_offline := (p_game_mode IN ('vs_bot', 'offline_practice', 'tutorial'));

    -- Cargar trofeos y arena del jugador
    SELECT COALESCE(trophies_count, 0) INTO v_user_trophies FROM public.profiles WHERE id = p_user_id;
    v_arena_tier := GREATEST(1, LEAST(10, FLOOR(v_user_trophies / 400) + 1));
    v_arena_mult := 1.0 + (v_arena_tier - 1) * 0.08; -- Calibración V2.1 (+8% por Arena)

    -- Comprobación de límites offline (Máximo 3 partidas remuneradas por día)
    IF v_is_offline THEN
        SELECT COALESCE(daily_offline_matches_count, 0), COALESCE(last_offline_match_date, CURRENT_DATE)
        INTO v_daily_count, v_last_date
        FROM public.profiles
        WHERE id = p_user_id
        FOR UPDATE;

        IF v_last_date < CURRENT_DATE THEN
            v_daily_count := 0;
            v_last_date := CURRENT_DATE;
        END IF;

        IF v_daily_count >= 3 THEN
            v_reward_capped := true;
        END IF;
    END IF;

    IF v_reward_capped THEN
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
    v_base_score := 120 + (p_properties_captured * 45) + (p_units_destroyed * 30) + (LEAST(p_turns_count, 30) * 5);
    
    IF p_is_victory THEN
        v_result_mult := 2.0;
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

    -- Recompensas estándar base moduladas por el factor de Arena
    v_xp_awarded := FLOOR(v_base_score * v_result_mult * v_arena_mult);
    v_credits_awarded := FLOOR((60 + (p_properties_captured * 20) + (p_units_destroyed * 15)) * v_result_mult * v_arena_mult);

    -- Regla offline: 50% de botín y 0 trofeos
    IF v_is_offline THEN
        v_xp_awarded := FLOOR(v_xp_awarded * 0.50 * v_difficulty_mult);
        v_credits_awarded := FLOOR(v_credits_awarded * 0.50 * v_difficulty_mult);
        v_trophies_delta := 0;

        UPDATE public.profiles
        SET daily_offline_matches_count = v_daily_count + 1,
            last_offline_match_date = v_last_date
        WHERE id = p_user_id;
    ELSE
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

    -- Auditoría contable en currency_ledger (utilizando 'delta')
    IF v_credits_awarded > 0 THEN
        INSERT INTO public.currency_ledger (
            user_id, currency, delta, balance_after, reason, reference_id, metadata
        ) VALUES (
            p_user_id, 'credits', v_credits_awarded,
            (SELECT battle_credits FROM public.profiles WHERE id = p_user_id),
            CASE WHEN v_is_offline THEN 'offline_match_reward' ELSE 'online_match_reward' END,
            p_match_id::text,
            jsonb_build_object('game_mode', p_game_mode, 'difficulty', p_difficulty, 'arena_tier', v_arena_tier)
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

-- 5. RPC ATÓMICO: scrap_blueprints (Desguace de Planos a Chatarra y Créditos)
CREATE OR REPLACE FUNCTION public.scrap_blueprints(
    p_unit_id VARCHAR(32),
    p_quantity INTEGER
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_unit public.units_catalog%ROWTYPE;
    v_user_card public.user_cards%ROWTYPE;
    v_scrap_rate INTEGER := 1;
    v_credit_rate INTEGER := 2;
    v_total_scrap INTEGER;
    v_total_credits INTEGER;
BEGIN
    IF v_user_id IS NULL THEN RAISE EXCEPTION 'No autenticado'; END IF;
    IF p_quantity <= 0 THEN RAISE EXCEPTION 'Cantidad de planos debe ser positiva.'; END IF;

    SELECT * INTO v_user_card FROM public.user_cards 
    WHERE user_id = v_user_id AND unit_id = p_unit_id FOR UPDATE;

    IF NOT FOUND OR v_user_card.cards_count < p_quantity THEN
        RAISE EXCEPTION 'Planos insuficientes para reciclar.';
    END IF;

    -- Determinar tasa por rareza en catálogo
    SELECT * INTO v_unit FROM public.units_catalog WHERE id = p_unit_id;
    IF v_unit.category = 'indirect' OR v_unit.category = 'aircraft' THEN
        v_scrap_rate := 6; v_credit_rate := 15; -- Raras
    ELSIF v_unit.category = 'naval' THEN
        v_scrap_rate := 35; v_credit_rate := 100; -- Épicas
    ELSE
        v_scrap_rate := 1; v_credit_rate := 2;   -- Comunes
    END IF;

    v_total_scrap := p_quantity * v_scrap_rate;
    v_total_credits := p_quantity * v_credit_rate;

    -- Descontar planos de la tropa
    UPDATE public.user_cards 
    SET cards_count = cards_count - p_quantity, updated_at = timezone('utc'::text, now())
    WHERE id = v_user_card.id;

    -- Abonar Chatarra Tecnológica e inventario industrial
    UPDATE public.user_industrial_inventory 
    SET tech_scrap = tech_scrap + v_total_scrap, updated_at = timezone('utc'::text, now())
    WHERE user_id = v_user_id;

    -- Abonar Créditos de Batalla
    UPDATE public.profiles 
    SET battle_credits = battle_credits + v_total_credits, updated_at = timezone('utc'::text, now())
    WHERE id = v_user_id;

    -- Registrar auditoría en ledger
    INSERT INTO public.currency_ledger (user_id, currency, delta, balance_after, reason, reference_id, metadata)
    VALUES (
        v_user_id, 'credits', v_total_credits, 
        (SELECT battle_credits FROM public.profiles WHERE id = v_user_id),
        'scrap_blueprints', p_unit_id,
        jsonb_build_object('blueprints_scrapped', p_quantity, 'tech_scrap_gained', v_total_scrap)
    );

    RETURN jsonb_build_object(
        'success', true,
        'unit_id', p_unit_id,
        'blueprints_scrapped', p_quantity,
        'tech_scrap_awarded', v_total_scrap,
        'credits_awarded', v_total_credits
    );
END;
$$;

-- 6. RPC: transmute_tech_scrap (Síntesis de Microchips con Chatarra)
CREATE OR REPLACE FUNCTION public.transmute_tech_scrap(p_batches INTEGER DEFAULT 1)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_inv public.user_industrial_inventory%ROWTYPE;
    v_req_scrap INTEGER := 40 * p_batches;
    v_req_rare INTEGER := 20 * p_batches;
    v_produced_chips INTEGER := 1 * p_batches;
BEGIN
    IF v_user_id IS NULL THEN RAISE EXCEPTION 'No autenticado'; END IF;
    IF p_batches <= 0 THEN RAISE EXCEPTION 'Número de lotes inválido.'; END IF;

    SELECT * INTO v_inv FROM public.user_industrial_inventory 
    WHERE user_id = v_user_id FOR UPDATE;

    IF NOT FOUND THEN RAISE EXCEPTION 'Inventario industrial no inicializado.'; END IF;
    IF v_inv.tech_scrap < v_req_scrap THEN RAISE EXCEPTION 'Chatarra tecnológica insuficiente.'; END IF;
    IF v_inv.raw_rare_earth < v_req_rare THEN RAISE EXCEPTION 'Tierras raras insuficientes.'; END IF;

    UPDATE public.user_industrial_inventory
    SET tech_scrap = tech_scrap - v_req_scrap,
        raw_rare_earth = raw_rare_earth - v_req_rare,
        refined_microchip = refined_microchip + v_produced_chips,
        updated_at = timezone('utc'::text, now())
    WHERE user_id = v_user_id;

    RETURN jsonb_build_object(
        'success', true,
        'batches', p_batches,
        'microchips_produced', v_produced_chips,
        'scrap_spent', v_req_scrap,
        'rare_earth_spent', v_req_rare
    );
END;
$$;

-- 7. SUSCRIPCIÓN EN TIEMPO REAL (SUPABASE REALTIME)
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE 
            public.matchmaking_queue,
            public.active_matches,
            public.match_participants,
            public.chat_messages;
    END IF;
END $$;

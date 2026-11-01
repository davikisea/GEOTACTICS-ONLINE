-- ============================================================================
-- MIGRACIÓN 11: TIENDA EN SERVIDOR, LEDGER, SEGURIDAD RLS Y MATCHMAKING ATÓMICO
-- Proyecto: Tactical Command: Wars of Legacy
-- Fecha: 2026-10-31
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. CATÁLOGO DE COSMÉTICOS Y OFERTAS DE TIENDA EN SERVIDOR
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.cosmetics_catalog (
    id VARCHAR(64) PRIMARY KEY,
    cosmetic_type VARCHAR(32) NOT NULL CHECK (cosmetic_type IN (
        'unit_skin', 'co_skin', 'speech_bubble_skin', 'onomatopoeia_stamp',
        'vignette_frame', 'hq_skin', 'avatar_frame', 'banner', 'destruction_vfx', 'capture_vfx', 'music_theme'
    )),
    target_entity_id VARCHAR(32) DEFAULT NULL,
    name VARCHAR(64) NOT NULL,
    description TEXT NOT NULL,
    rarity VARCHAR(16) NOT NULL DEFAULT 'common' CHECK (rarity IN ('common', 'rare', 'epic', 'legendary', 'mythic')),
    visual_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    is_base_default BOOLEAN NOT NULL DEFAULT false,
    is_premium_pass_exclusive BOOLEAN NOT NULL DEFAULT false,
    base_price_credits INTEGER DEFAULT NULL CHECK (base_price_credits IS NULL OR base_price_credits >= 0),
    base_price_gems INTEGER DEFAULT NULL CHECK (base_price_gems IS NULL OR base_price_gems >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.cosmetics_catalog ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cosmetics_catalog_select" ON public.cosmetics_catalog FOR SELECT USING (true);

CREATE TABLE IF NOT EXISTS public.shop_offers (
    id VARCHAR(64) PRIMARY KEY,
    offer_type VARCHAR(24) NOT NULL CHECK (offer_type IN ('permanent', 'daily_rotation', 'seasonal_featured', 'bundle', 'chest_pack')),
    title VARCHAR(64) NOT NULL,
    currency VARCHAR(8) NOT NULL CHECK (currency IN ('credits', 'gems')),
    price INTEGER NOT NULL CHECK (price >= 0),
    original_price INTEGER DEFAULT NULL,
    rewards_payload JSONB NOT NULL,
    max_purchases_per_user INTEGER DEFAULT 1,
    available_from TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    available_until TIMESTAMPTZ DEFAULT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.shop_offers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "shop_offers_select" ON public.shop_offers FOR SELECT USING (is_active = true);

-- ----------------------------------------------------------------------------
-- 2. LIBRO MAYOR FINANCIERO (CURRENCY LEDGER) Y AUDITORÍA DE PAGOS STRIPE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.currency_ledger (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    currency VARCHAR(16) NOT NULL CHECK (currency IN ('credits', 'gems')),
    delta INTEGER NOT NULL CHECK (delta <> 0),
    balance_after INTEGER NOT NULL CHECK (balance_after >= 0),
    reason VARCHAR(32) NOT NULL CHECK (reason IN (
        'match_reward', 'level_up', 'shop_purchase', 'card_upgrade',
        'commander_upgrade', 'chest_reward', 'chest_speedup', 'command_pass', 'stripe_purchase', 'quest_reward'
    )),
    reference_id VARCHAR(128) DEFAULT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_currency_ledger_user ON public.currency_ledger(user_id, created_at DESC);
ALTER TABLE public.currency_ledger ENABLE ROW LEVEL SECURITY;
CREATE POLICY "currency_ledger_select_own" ON public.currency_ledger FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.payments_audit (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    stripe_session_id VARCHAR(128) NOT NULL UNIQUE,
    stripe_payment_intent_id VARCHAR(128),
    amount_cents INTEGER NOT NULL CHECK (amount_cents >= 0),
    currency VARCHAR(8) NOT NULL DEFAULT 'usd',
    product_type VARCHAR(32) NOT NULL CHECK (product_type IN ('gems_pack', 'battle_pass', 'cosmetic_bundle')),
    product_sku VARCHAR(64) NOT NULL,
    items_delivered JSONB NOT NULL,
    status VARCHAR(24) NOT NULL DEFAULT 'completed',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.payments_audit ENABLE ROW LEVEL SECURITY;
CREATE POLICY "payments_audit_select_own" ON public.payments_audit FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- ----------------------------------------------------------------------------
-- 3. TRIGGER ANTI-TRAMPAS EN PROFILES: PROTECCIÓN DE MONEDAS, XP Y RATING
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.trg_guard_profile_sensitive_columns()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    IF current_setting('request.jwt.claim.role', true) IN ('authenticated', 'anon')
       AND current_setting('app.bypass_profile_guard', true) IS DISTINCT FROM 'on' THEN
        IF NEW.account_level IS DISTINCT FROM OLD.account_level
           OR NEW.current_xp IS DISTINCT FROM OLD.current_xp
           OR NEW.battle_credits IS DISTINCT FROM OLD.battle_credits
           OR NEW.command_gems IS DISTINCT FROM OLD.command_gems
           OR NEW.elo_rating IS DISTINCT FROM OLD.elo_rating
           OR NEW.trophies_count IS DISTINCT FROM OLD.trophies_count
           OR NEW.total_matches_played IS DISTINCT FROM OLD.total_matches_played
           OR NEW.total_victories IS DISTINCT FROM OLD.total_victories THEN
            RAISE EXCEPTION 'Operación denegada: Los balances de divisas, XP y ranking solo pueden modificarse mediante transacciones autorizadas del servidor.';
        END IF;
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_profile_columns ON public.profiles;
CREATE TRIGGER trg_guard_profile_columns
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.trg_guard_profile_sensitive_columns();

-- ----------------------------------------------------------------------------
-- 4. COLA DE MATCHMAKING ATÓMICA CON SKIP LOCKED
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.matchmaking_queue (
    user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
    game_mode VARCHAR(24) NOT NULL CHECK (game_mode IN ('blitz_skirmish', 'grand_campaign', 'two_vs_two')),
    elo_rating INTEGER NOT NULL,
    trophies_count INTEGER NOT NULL DEFAULT 0,
    pte_profile VARCHAR(16) NOT NULL DEFAULT 'standard' CHECK (pte_profile IN ('blitz', 'standard', 'calculated')),
    status VARCHAR(16) NOT NULL DEFAULT 'searching' CHECK (status IN ('searching', 'matched', 'cancelled')),
    matched_match_id UUID REFERENCES public.active_matches(id) ON DELETE SET NULL,
    enqueued_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_mm_queue_search
    ON public.matchmaking_queue (game_mode, status, trophies_count, pte_profile, enqueued_at)
    WHERE status = 'searching';

ALTER TABLE public.matchmaking_queue ENABLE ROW LEVEL SECURITY;
CREATE POLICY "mm_queue_select_own" ON public.matchmaking_queue FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.enqueue_and_matchmake(
    p_game_mode VARCHAR(24),
    p_map_id VARCHAR(64) DEFAULT 'sector_alfa'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_my_profile public.profiles%ROWTYPE;
    v_opponent public.matchmaking_queue%ROWTYPE;
    v_match_id UUID;
    v_room_code VARCHAR(8);
    v_wait_seconds NUMERIC := 0;
    v_trophy_window INTEGER := 100;
BEGIN
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Usuario no autenticado';
    END IF;

    SELECT * INTO v_my_profile FROM public.profiles WHERE id = v_user_id;

    INSERT INTO public.matchmaking_queue (user_id, game_mode, elo_rating, trophies_count, pte_profile, status, enqueued_at)
    VALUES (
        v_user_id,
        p_game_mode,
        v_my_profile.elo_rating,
        v_my_profile.trophies_count,
        v_my_profile.pte_profile,
        'searching',
        timezone('utc'::text, now())
    )
    ON CONFLICT (user_id) DO UPDATE SET
        game_mode = EXCLUDED.game_mode,
        status = 'searching',
        updated_at = timezone('utc'::text, now())
    RETURNING EXTRACT(EPOCH FROM (timezone('utc'::text, now()) - enqueued_at)) INTO v_wait_seconds;

    IF v_wait_seconds > 12 THEN
        v_trophy_window := 300;
    ELSIF v_wait_seconds >= 6 THEN
        v_trophy_window := 200;
    ELSE
        v_trophy_window := 100;
    END IF;

    SELECT * INTO v_opponent
    FROM public.matchmaking_queue q
    WHERE q.game_mode = p_game_mode
      AND q.status = 'searching'
      AND q.user_id <> v_user_id
      AND ABS(q.trophies_count - v_my_profile.trophies_count) <= v_trophy_window
    ORDER BY
      (CASE WHEN q.pte_profile = v_my_profile.pte_profile THEN 0 ELSE 1 END) ASC,
      ABS(q.trophies_count - v_my_profile.trophies_count) ASC,
      q.enqueued_at ASC
    LIMIT 1
    FOR UPDATE SKIP LOCKED;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('status', 'searching', 'trophy_window', v_trophy_window);
    END IF;

    v_room_code := UPPER(SUBSTRING(encode(gen_random_bytes(4), 'hex') FROM 1 FOR 8));

    INSERT INTO public.active_matches (
        room_code, player1_id, player2_id, current_turn_player_id,
        status, game_mode, map_id, turn_number,
        turn_time_limit_sec, turn_deadline
    ) VALUES (
        v_room_code, v_opponent.user_id, v_user_id, v_opponent.user_id,
        'in_progress', p_game_mode, p_map_id, 1,
        CASE WHEN p_game_mode = 'blitz_skirmish' THEN 30 ELSE 60 END,
        timezone('utc'::text, now()) + (CASE WHEN p_game_mode = 'blitz_skirmish' THEN interval '30 seconds' ELSE interval '60 seconds' END)
    ) RETURNING id INTO v_match_id;

    -- Registrar los dos participantes en match_participants
    INSERT INTO public.match_participants (match_id, player_slot, slot_key, team_id, user_id, commander_id)
    VALUES
    (v_match_id, 0, 'p1', 'A', v_opponent.user_id, (SELECT selected_commander_id FROM public.profiles WHERE id = v_opponent.user_id)),
    (v_match_id, 1, 'p2', 'B', v_user_id, v_my_profile.selected_commander_id);

    UPDATE public.matchmaking_queue
    SET status = 'matched', matched_match_id = v_match_id, updated_at = timezone('utc'::text, now())
    WHERE user_id IN (v_user_id, v_opponent.user_id);

    RETURN jsonb_build_object(
        'status', 'matched',
        'match_id', v_match_id,
        'room_code', v_room_code,
        'player1_id', v_opponent.user_id,
        'player2_id', v_user_id
    );
END;
$$;

-- ----------------------------------------------------------------------------
-- 5. RPC DE COMPRA EN TIENDA SEGURA Y RPC DE UNIÓN A SALA
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.purchase_shop_offer(
    p_offer_id VARCHAR(64)
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_offer public.shop_offers%ROWTYPE;
    v_profile public.profiles%ROWTYPE;
    v_new_balance INTEGER;
BEGIN
    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'No autenticado');
    END IF;

    SELECT * INTO v_offer
    FROM public.shop_offers
    WHERE id = p_offer_id
      AND is_active = true
      AND available_from <= timezone('utc'::text, now())
      AND (available_until IS NULL OR available_until >= timezone('utc'::text, now()));

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'La oferta no existe o ha expirado');
    END IF;

    SELECT * INTO v_profile FROM public.profiles WHERE id = v_user_id FOR UPDATE;

    PERFORM set_config('app.bypass_profile_guard', 'on', true);

    IF v_offer.currency = 'credits' THEN
        IF v_profile.battle_credits < v_offer.price THEN
            RETURN jsonb_build_object('success', false, 'error', 'Créditos insuficientes');
        END IF;
        v_new_balance := v_profile.battle_credits - v_offer.price;
        UPDATE public.profiles SET battle_credits = v_new_balance, updated_at = now() WHERE id = v_user_id;
    ELSE
        IF v_profile.command_gems < v_offer.price THEN
            RETURN jsonb_build_object('success', false, 'error', 'Gemas insuficientes');
        END IF;
        v_new_balance := v_profile.command_gems - v_offer.price;
        UPDATE public.profiles SET command_gems = v_new_balance, updated_at = now() WHERE id = v_user_id;
    END IF;

    INSERT INTO public.currency_ledger (user_id, currency, delta, balance_after, reason, reference_id)
    VALUES (v_user_id, v_offer.currency, -v_offer.price, v_new_balance, 'shop_purchase', p_offer_id);

    RETURN jsonb_build_object(
        'success', true,
        'offer_id', p_offer_id,
        'currency', v_offer.currency,
        'price_paid', v_offer.price,
        'new_balance', v_new_balance,
        'rewards', v_offer.rewards_payload
    );
END;
$$;

CREATE OR REPLACE FUNCTION public.join_waiting_match(p_room_code VARCHAR(8))
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_match public.active_matches%ROWTYPE;
BEGIN
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'No autenticado';
    END IF;

    SELECT * INTO v_match
    FROM public.active_matches
    WHERE room_code = UPPER(TRIM(p_room_code))
      AND status = 'waiting'
      AND player2_id IS NULL
    FOR UPDATE SKIP LOCKED;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'La sala no está disponible o ya fue ocupada');
    END IF;

    IF v_match.player1_id = v_user_id THEN
        RETURN jsonb_build_object('success', false, 'error', 'No puedes unirte como Jugador 2 a tu propia sala');
    END IF;

    UPDATE public.active_matches
    SET player2_id = v_user_id,
        status = 'in_progress',
        current_turn_player_id = v_match.player1_id,
        turn_deadline = timezone('utc'::text, now()) + make_interval(secs => v_match.turn_time_limit_sec),
        updated_at = timezone('utc'::text, now())
    WHERE id = v_match.id;

    INSERT INTO public.match_participants (match_id, player_slot, slot_key, team_id, user_id, commander_id)
    VALUES
    (v_match.id, 0, 'p1', 'A', v_match.player1_id, (SELECT selected_commander_id FROM public.profiles WHERE id = v_match.player1_id)),
    (v_match.id, 1, 'p2', 'B', v_user_id, (SELECT selected_commander_id FROM public.profiles WHERE id = v_user_id))
    ON CONFLICT (match_id, player_slot) DO NOTHING;

    RETURN jsonb_build_object('success', true, 'match_id', v_match.id);
END;
$$;

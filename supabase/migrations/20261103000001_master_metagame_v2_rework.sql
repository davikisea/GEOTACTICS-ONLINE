-- ==============================================================================
-- MIGRACIÓN 23: MASTER METAGAME V2 REWORK (SOVEREIGNTY, P2P, HANGARS & GARRISONS)
-- ==============================================================================
-- Proyecto: Tactical Command: Wars of Legacy — Global Sovereignty Edition
-- Especificación: METAGAME_DESIGN/MASTER_METAGAME_SPEC_V1.md
-- Arquitectura: Risk.io + Albion P2P + Victoria 3 Macro-Economy + Advance Wars 1-100 HP
-- Fecha: Noviembre 2026
--
-- Contenido:
-- 1. Tabla 'world_regions' (3,000 regiones, capitales incapturables y biomas).
-- 2. Tabla 'territory_control' (Soberanía, Puntos TCP 0-15000 y cooldowns de prioridad).
-- 3. Tabla 'corporate_subsidiaries' (Federación de clanes, max 10 clanes y tributos).
-- 4. Tabla 'user_unit_hangar' (Stock físico de unidades crafteadas a escala 1-100 HP).
-- 5. Tabla 'user_patents' (Patentes tecnológicas permanentes de armas T1-T5).
-- 6. Tabla 'garrison_deployments' (Búnkeres IA Nv. 1-5, envejecimiento de 21d y relevo).
-- 7. Actualización de 'p2p_market_listings' (Split 2%: 1% sink deflacionario + 1% regalía).
-- 8. RPCs Transaccionales ACID con bloqueo FOR UPDATE (Comercio, Upkeep y Asedios).
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. TABLA: world_regions (Catálogo de Regiones Planetarias)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.world_regions (
    id VARCHAR(32) PRIMARY KEY, -- ej. 'ES_MAD_01', 'DE_RUH_03'
    country_iso VARCHAR(2) NOT NULL, -- ej. 'ES', 'DE', 'US'
    province_id VARCHAR(32) NOT NULL, -- ej. 'ES_MADRID', 'DE_RENANIA'
    name VARCHAR(96) NOT NULL,
    biome_type VARCHAR(32) NOT NULL CHECK (biome_type IN (
        'temperate_plains', 'boreal_forest', 'arid_desert', 'arctic_tundra',
        'tropical_jungle', 'mountain_highland', 'coastal_archipelago'
    )),
    security_zone VARCHAR(16) NOT NULL CHECK (security_zone IN ('high_sec', 'low_sec', 'null_sec')),
    is_capital BOOLEAN NOT NULL DEFAULT false,
    is_capturable BOOLEAN NOT NULL DEFAULT true,
    max_building_slots INTEGER NOT NULL DEFAULT 8 CHECK (max_building_slots BETWEEN 4 AND 12),
    primary_resource VARCHAR(32) NOT NULL,
    secondary_resource VARCHAR(32) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT chk_capital_uncapturable CHECK (NOT (is_capital = true AND is_capturable = true))
);

CREATE INDEX IF NOT EXISTS idx_world_regions_province ON public.world_regions(province_id);
CREATE INDEX IF NOT EXISTS idx_world_regions_country ON public.world_regions(country_iso);
CREATE INDEX IF NOT EXISTS idx_world_regions_security ON public.world_regions(security_zone);

ALTER TABLE public.world_regions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "world_regions_view_all" ON public.world_regions;
CREATE POLICY "world_regions_view_all" ON public.world_regions FOR SELECT USING (true);

-- ------------------------------------------------------------------------------
-- 2. TABLA: territory_control (Soberanía y Puntos TCP en Tiempo Real)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.territory_control (
    province_id VARCHAR(32) PRIMARY KEY,
    controlling_clan_id UUID REFERENCES public.clans(id) ON DELETE SET NULL,
    controlling_alliance_id UUID DEFAULT NULL,
    current_tcp INTEGER NOT NULL DEFAULT 10000 CHECK (current_tcp BETWEEN 0 AND 15000),
    tcp_threshold INTEGER NOT NULL DEFAULT 10000,
    status VARCHAR(24) NOT NULL DEFAULT 'stable' CHECK (status IN (
        'stable', 'under_siege', 'disputed', 'cooldown_priority'
    )),
    cooldown_expires_at TIMESTAMPTZ DEFAULT NULL,
    last_battle_at TIMESTAMPTZ DEFAULT NULL,
    fortress_level INTEGER NOT NULL DEFAULT 0 CHECK (fortress_level BETWEEN 0 AND 5),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_territory_control_clan ON public.territory_control(controlling_clan_id);
CREATE INDEX IF NOT EXISTS idx_territory_control_status ON public.territory_control(status);

ALTER TABLE public.territory_control ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "territory_control_view_all" ON public.territory_control;
CREATE POLICY "territory_control_view_all" ON public.territory_control FOR SELECT USING (true);

-- ------------------------------------------------------------------------------
-- 3. TABLA: corporate_subsidiaries (Alianzas y Subsidiarias Autónomas)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.corporate_subsidiaries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    parent_corp_id UUID NOT NULL REFERENCES public.clans(id) ON DELETE CASCADE,
    subsidiary_clan_id UUID NOT NULL REFERENCES public.clans(id) ON DELETE CASCADE,
    tribute_rate_percent NUMERIC(5, 2) NOT NULL DEFAULT 10.00 CHECK (tribute_rate_percent BETWEEN 5.00 AND 25.00),
    autonomous_market_allowed BOOLEAN NOT NULL DEFAULT true,
    status VARCHAR(16) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'grace_period', 'seceded')),
    grace_expires_at TIMESTAMPTZ DEFAULT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT uq_subsidiary_clan UNIQUE (subsidiary_clan_id),
    CONSTRAINT chk_no_self_subsidiary CHECK (parent_corp_id <> subsidiary_clan_id)
);

CREATE INDEX IF NOT EXISTS idx_corporate_subsidiaries_parent ON public.corporate_subsidiaries(parent_corp_id);

ALTER TABLE public.corporate_subsidiaries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "corporate_subsidiaries_view_all" ON public.corporate_subsidiaries;
CREATE POLICY "corporate_subsidiaries_view_all" ON public.corporate_subsidiaries FOR SELECT USING (true);

-- ------------------------------------------------------------------------------
-- 4. TABLA: user_unit_hangar (Stock Físico de Unidades en Escala 1-100 HP)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_unit_hangar (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    clan_id UUID REFERENCES public.clans(id) ON DELETE SET NULL,
    unit_code VARCHAR(32) NOT NULL, -- ej. 'tank_light', 'fighter', 'artillery'
    tier INTEGER NOT NULL DEFAULT 1 CHECK (tier BETWEEN 1 AND 5),
    level INTEGER NOT NULL DEFAULT 1 CHECK (level BETWEEN 1 AND 5),
    hp INTEGER NOT NULL DEFAULT 100 CHECK (hp BETWEEN 1 AND 100),
    quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity >= 0),
    location_province_id VARCHAR(32) DEFAULT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_user_unit_hangar_user ON public.user_unit_hangar(user_id, unit_code, tier);
CREATE INDEX IF NOT EXISTS idx_user_unit_hangar_location ON public.user_unit_hangar(location_province_id);

ALTER TABLE public.user_unit_hangar ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_unit_hangar_own" ON public.user_unit_hangar;
CREATE POLICY "user_unit_hangar_own" ON public.user_unit_hangar FOR ALL USING (auth.uid() = user_id);

-- ------------------------------------------------------------------------------
-- 5. TABLA: user_patents (Patentes Tecnológicas Permanentes T1-T5)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_patents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    patent_code VARCHAR(64) NOT NULL,
    tier INTEGER NOT NULL DEFAULT 1 CHECK (tier BETWEEN 1 AND 5),
    unlocked_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT uq_user_patent UNIQUE (user_id, patent_code, tier)
);

CREATE INDEX IF NOT EXISTS idx_user_patents_user ON public.user_patents(user_id);

ALTER TABLE public.user_patents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_patents_own" ON public.user_patents;
CREATE POLICY "user_patents_own" ON public.user_patents FOR ALL USING (auth.uid() = user_id);

-- ------------------------------------------------------------------------------
-- 6. TABLA: garrison_deployments (Búnkeres IA Nivel 1 a 5 con Envejecimiento)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.garrison_deployments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    region_id VARCHAR(32) NOT NULL REFERENCES public.world_regions(id) ON DELETE CASCADE,
    owning_clan_id UUID NOT NULL REFERENCES public.clans(id) ON DELETE CASCADE,
    garrison_level INTEGER NOT NULL DEFAULT 1 CHECK (garrison_level BETWEEN 1 AND 5),
    ai_engine_tier VARCHAR(16) NOT NULL DEFAULT 'easy' CHECK (ai_engine_tier IN (
        'easy', 'normal', 'hard', 'chess', 'mcts_legendary'
    )),
    hourly_upkeep_ec INTEGER NOT NULL DEFAULT 150 CHECK (hourly_upkeep_ec >= 0),
    is_legendary BOOLEAN NOT NULL DEFAULT false,
    service_started_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    retirement_due_at TIMESTAMPTZ DEFAULT NULL,
    current_chassis_stock JSONB NOT NULL DEFAULT '[]'::jsonb,
    is_under_attack BOOLEAN NOT NULL DEFAULT false,
    handshake_deadline TIMESTAMPTZ DEFAULT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT uq_region_garrison UNIQUE (region_id)
);

CREATE INDEX IF NOT EXISTS idx_garrison_deployments_region ON public.garrison_deployments(region_id);
CREATE INDEX IF NOT EXISTS idx_garrison_deployments_clan ON public.garrison_deployments(owning_clan_id);

ALTER TABLE public.garrison_deployments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "garrison_deployments_view_all" ON public.garrison_deployments;
CREATE POLICY "garrison_deployments_view_all" ON public.garrison_deployments FOR SELECT USING (true);

-- ------------------------------------------------------------------------------
-- 7. ACTUALIZACIÓN DE 'p2p_market_listings' (Split 2% y Categorías V2)
-- ------------------------------------------------------------------------------
ALTER TABLE public.p2p_market_listings
    ADD COLUMN IF NOT EXISTS province_terminal_id VARCHAR(32) DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS item_category VARCHAR(32) DEFAULT 'refined_material',
    ADD COLUMN IF NOT EXISTS tier INTEGER DEFAULT 1,
    ADD COLUMN IF NOT EXISTS platform_burn_ec INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS province_royalty_ec INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS net_seller_revenue_ec INTEGER DEFAULT 0;

-- Asegurar restricción que prohíbe el comercio de tropas militares listas
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'chk_p2p_no_military_units'
    ) THEN
        ALTER TABLE public.p2p_market_listings
            ADD CONSTRAINT chk_p2p_no_military_units 
            CHECK (item_category IN ('raw_resource', 'refined_material', 'patent_blueprint', 'buff_consumable', 'cosmetic'));
    END IF;
END $$;

-- ------------------------------------------------------------------------------
-- 8. RPC: execute_p2p_trade_v2 (Liquidación P2P con Split 1% Sink + 1% Regalía)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.execute_p2p_trade_v2(p_listing_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_buyer_id UUID := auth.uid();
    v_listing public.p2p_market_listings%ROWTYPE;
    v_buyer_profile public.profiles%ROWTYPE;
    v_seller_profile public.profiles%ROWTYPE;
    v_territory public.territory_control%ROWTYPE;
    v_tax_total INTEGER;
    v_burn_ec INTEGER;
    v_royalty_ec INTEGER;
    v_net_payout INTEGER;
    v_now TIMESTAMPTZ := timezone('utc'::text, now());
BEGIN
    IF v_buyer_id IS NULL THEN 
        RAISE EXCEPTION 'No autenticado'; 
    END IF;

    -- 1. Candado FOR UPDATE sobre la orden
    SELECT * INTO v_listing 
    FROM public.p2p_market_listings
    WHERE id = p_listing_id AND status = 'active' 
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Orden de mercado no disponible.');
    END IF;

    IF v_listing.seller_id = v_buyer_id THEN
        RETURN jsonb_build_object('success', false, 'error', 'No puedes comprar tu propia orden.');
    END IF;

    -- 2. Bloqueo determinista de perfiles (evitar deadlocks: menor UUID primero)
    IF v_buyer_id < v_listing.seller_id THEN
        SELECT * INTO v_buyer_profile FROM public.profiles WHERE id = v_buyer_id FOR UPDATE;
        SELECT * INTO v_seller_profile FROM public.profiles WHERE id = v_listing.seller_id FOR UPDATE;
    ELSE
        SELECT * INTO v_seller_profile FROM public.profiles WHERE id = v_listing.seller_id FOR UPDATE;
        SELECT * INTO v_buyer_profile FROM public.profiles WHERE id = v_buyer_id FOR UPDATE;
    END IF;

    -- 3. Validar solvencia del comprador en Créditos de Batalla / EC
    IF v_buyer_profile.battle_credits < v_listing.total_price THEN
        RETURN jsonb_build_object('success', false, 'error', 'Créditos Energéticos insuficientes.');
    END IF;

    -- 4. Cálculo exacto del split 2% (1% quema deflacionaria + 1% regalía territorial)
    v_tax_total := FLOOR(v_listing.total_price * 0.02);
    v_burn_ec := FLOOR(v_listing.total_price * 0.01);
    v_royalty_ec := v_tax_total - v_burn_ec;
    v_net_payout := v_listing.total_price - v_tax_total;

    -- 5. Transferencia de divisas
    PERFORM set_config('app.bypass_profile_guard', 'on', true);
    
    UPDATE public.profiles 
    SET battle_credits = battle_credits - v_listing.total_price, updated_at = v_now
    WHERE id = v_buyer_id;

    UPDATE public.profiles 
    SET battle_credits = battle_credits + v_net_payout, updated_at = v_now
    WHERE id = v_listing.seller_id;

    -- 6. Acreditación de Regalía Territorial a la tesorería del clan dueño de la provincia
    IF v_listing.province_terminal_id IS NOT NULL AND v_royalty_ec > 0 THEN
        SELECT * INTO v_territory FROM public.territory_control 
        WHERE province_id = v_listing.province_terminal_id;

        IF FOUND AND v_territory.controlling_clan_id IS NOT NULL THEN
            UPDATE public.clans
            SET treasury_gold = treasury_gold + v_royalty_ec
            WHERE id = v_territory.controlling_clan_id;
        END IF;
    END IF;

    -- 7. Transferencia de bienes al comprador
    IF v_listing.item_category = 'patent_blueprint' THEN
        INSERT INTO public.user_patents (user_id, patent_code, tier, unlocked_at)
        VALUES (v_buyer_id, v_listing.item_code, v_listing.tier, v_now)
        ON CONFLICT (user_id, patent_code, tier) DO NOTHING;
    ELSIF v_listing.item_category = 'refined_material' THEN
        IF v_listing.item_code = 'refined_steel' THEN
            UPDATE public.user_industrial_inventory SET refined_steel = refined_steel + v_listing.quantity WHERE user_id = v_buyer_id;
        ELSIF v_listing.item_code = 'refined_concrete' THEN
            UPDATE public.user_industrial_inventory SET refined_concrete = refined_concrete + v_listing.quantity WHERE user_id = v_buyer_id;
        ELSIF v_listing.item_code = 'refined_microchip' THEN
            UPDATE public.user_industrial_inventory SET refined_microchip = refined_microchip + v_listing.quantity WHERE user_id = v_buyer_id;
        END IF;
    END IF;

    -- 8. Actualizar orden a 'sold' y asentar contabilidad
    UPDATE public.p2p_market_listings
    SET status = 'sold',
        platform_burn_ec = v_burn_ec,
        province_royalty_ec = v_royalty_ec,
        net_seller_revenue_ec = v_net_payout
    WHERE id = p_listing_id;

    -- Registro en el libro mayor financiero
    INSERT INTO public.currency_ledger (user_id, currency, delta, balance_after, reason, reference_id)
    VALUES 
        (v_buyer_id, 'credits', -v_listing.total_price, v_buyer_profile.battle_credits - v_listing.total_price, 'p2p_buy_v2', p_listing_id::text),
        (v_listing.seller_id, 'credits', v_net_payout, v_seller_profile.battle_credits + v_net_payout, 'p2p_sell_v2', p_listing_id::text);

    RETURN jsonb_build_object(
        'success', true,
        'total_paid', v_listing.total_price,
        'platform_burn_ec', v_burn_ec,
        'province_royalty_ec', v_royalty_ec,
        'seller_received', v_net_payout
    );
END;
$$;

-- ------------------------------------------------------------------------------
-- 9. RPC: process_battle_territory_outcome (Resolución de Asedio y Cooldown)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.process_battle_territory_outcome(
    p_province_id VARCHAR(32),
    p_winner_clan_id UUID,
    p_tcp_delta INTEGER
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_territory public.territory_control%ROWTYPE;
    v_now TIMESTAMPTZ := timezone('utc'::text, now());
    v_new_tcp INTEGER;
    v_flipped BOOLEAN := false;
BEGIN
    SELECT * INTO v_territory 
    FROM public.territory_control 
    WHERE province_id = p_province_id 
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Provincia no encontrada.');
    END IF;

    -- Si la provincia está bajo cooldown de prioridad, no puede cambiar de dueño
    IF v_territory.status = 'cooldown_priority' AND v_territory.cooldown_expires_at > v_now THEN
        RETURN jsonb_build_object('success', false, 'error', 'Provincia bajo escudo temporal post-conquista.');
    END IF;

    -- Si el ganador es el defensor actual: recupera TCP
    IF v_territory.controlling_clan_id = p_winner_clan_id THEN
        v_new_tcp := LEAST(v_territory.tcp_threshold, v_territory.current_tcp + p_tcp_delta);
        UPDATE public.territory_control
        SET current_tcp = v_new_tcp,
            status = CASE WHEN v_new_tcp >= v_territory.tcp_threshold THEN 'stable' ELSE 'disputed' END,
            last_battle_at = v_now,
            updated_at = v_now
        WHERE province_id = p_province_id;
    ELSE
        -- Si el ganador es el atacante: drena TCP del defensor
        v_new_tcp := v_territory.current_tcp - p_tcp_delta;
        
        IF v_new_tcp <= 0 THEN
            -- Volteo de soberanía
            v_flipped := true;
            UPDATE public.territory_control
            SET controlling_clan_id = p_winner_clan_id,
                current_tcp = 10000,
                status = 'cooldown_priority',
                cooldown_expires_at = v_now + interval '4 hours', -- Escudo temporal de 4 horas
                last_battle_at = v_now,
                updated_at = v_now
            WHERE province_id = p_province_id;
        ELSE
            UPDATE public.territory_control
            SET current_tcp = v_new_tcp,
                status = 'under_siege',
                last_battle_at = v_now,
                updated_at = v_now
            WHERE province_id = p_province_id;
        END IF;
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'province_id', p_province_id,
        'current_tcp', CASE WHEN v_flipped THEN 10000 ELSE v_new_tcp END,
        'sovereignty_flipped', v_flipped,
        'controlling_clan_id', CASE WHEN v_flipped THEN p_winner_clan_id ELSE v_territory.controlling_clan_id END
    );
END;
$$;

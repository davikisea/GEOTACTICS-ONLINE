-- ==============================================================================
-- MIGRACIÓN 25: V2 CANONICAL CONSOLIDATION (GLOBAL SOVEREIGNTY, P2P, HANGAR, GARRISONS)
-- ==============================================================================
-- Proyecto: Tactical Command: Wars of Legacy — Metajuego Soberano V2
-- Especificación: METAGAME_DESIGN/FINAL_AUDIT_AND_QUESTIONNAIRE.md
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 0. COMPATIBILIDAD DE PERFILES Y CLANES
-- ------------------------------------------------------------------------------
ALTER TABLE public.clans
    ADD COLUMN IF NOT EXISTS emblem_id VARCHAR(64) DEFAULT 'insignia_hawk',
    ADD COLUMN IF NOT EXISTS banner_color VARCHAR(32) DEFAULT '#E63946';

ALTER TABLE public.profiles
    ADD COLUMN IF NOT EXISTS wallet_balance INTEGER DEFAULT 18500;

UPDATE public.profiles 
SET wallet_balance = battle_credits 
WHERE wallet_balance IS NULL OR wallet_balance = 0;

-- ------------------------------------------------------------------------------
-- 1. TABLA: world_countries (Estados Geopolíticos Soberanos)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.world_countries (
    iso_code VARCHAR(2) PRIMARY KEY,
    name VARCHAR(96) NOT NULL,
    continent VARCHAR(16) NOT NULL CHECK (continent IN ('EU', 'NA', 'SA', 'AS', 'AF', 'OC', 'MECA')),
    coordinates JSONB NOT NULL DEFAULT '{"lat": 0, "lng": 0}'::jsonb,
    defense_doctrine VARCHAR(64) NOT NULL DEFAULT 'balanced',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_world_countries_continent ON public.world_countries(continent);

ALTER TABLE public.world_countries ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "world_countries_read_all" ON public.world_countries;
CREATE POLICY "world_countries_read_all" ON public.world_countries FOR SELECT USING (true);

-- ------------------------------------------------------------------------------
-- 2. TABLA: world_provinces (Provincias Estratégicas y Capitales Capturables 2.0x)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.world_provinces (
    id VARCHAR(32) PRIMARY KEY,
    country_iso VARCHAR(2) NOT NULL REFERENCES public.world_countries(iso_code) ON DELETE CASCADE,
    name VARCHAR(96) NOT NULL,
    is_capital BOOLEAN NOT NULL DEFAULT false,
    is_capturable BOOLEAN NOT NULL DEFAULT true,
    base_terrain VARCHAR(32) NOT NULL CHECK (base_terrain IN (
        'plains', 'mountain', 'desert', 'tundra', 'forest', 'archipelago'
    )),
    native_weather VARCHAR(32) NOT NULL CHECK (native_weather IN (
        'clear', 'rain', 'snow', 'sandstorm'
    )),
    resource_multiplier NUMERIC(4, 2) NOT NULL DEFAULT 1.00 CHECK (resource_multiplier >= 1.00),
    building_slots INTEGER NOT NULL DEFAULT 8 CHECK (building_slots BETWEEN 4 AND 16),
    pos_x NUMERIC(5, 2) NOT NULL DEFAULT 50.00,
    pos_y NUMERIC(5, 2) NOT NULL DEFAULT 50.00,
    width NUMERIC(5, 2) NOT NULL DEFAULT 6.00,
    height NUMERIC(5, 2) NOT NULL DEFAULT 5.00,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_world_provinces_country ON public.world_provinces(country_iso);
CREATE INDEX IF NOT EXISTS idx_world_provinces_capital ON public.world_provinces(is_capital);

ALTER TABLE public.world_provinces ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "world_provinces_read_all" ON public.world_provinces;
CREATE POLICY "world_provinces_read_all" ON public.world_provinces FOR SELECT USING (true);

-- ------------------------------------------------------------------------------
-- 3. TABLA: territory_nodes (Nodos Estratégicos: Ciadadelas, Refinerías, Fábricas)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.territory_nodes (
    id VARCHAR(48) PRIMARY KEY,
    province_id VARCHAR(32) NOT NULL REFERENCES public.world_provinces(id) ON DELETE CASCADE,
    name VARCHAR(96) NOT NULL,
    node_type VARCHAR(32) NOT NULL CHECK (node_type IN (
        'capital_citadel', 'city', 'factory', 'refinery', 'warehouse', 'comm_tower', 'radar', 'fortress'
    )),
    controller_clan_id UUID REFERENCES public.clans(id) ON DELETE SET NULL,
    defense_level INTEGER NOT NULL DEFAULT 1 CHECK (defense_level BETWEEN 1 AND 5),
    energy_upkeep INTEGER NOT NULL DEFAULT 50 CHECK (energy_upkeep >= 0),
    structural_hp INTEGER NOT NULL DEFAULT 5000 CHECK (structural_hp >= 0),
    max_hp INTEGER NOT NULL DEFAULT 5000 CHECK (max_hp > 0),
    output_per_min INTEGER NOT NULL DEFAULT 30 CHECK (output_per_min >= 0),
    is_under_attack BOOLEAN NOT NULL DEFAULT false,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_territory_nodes_province ON public.territory_nodes(province_id);
CREATE INDEX IF NOT EXISTS idx_territory_nodes_clan ON public.territory_nodes(controller_clan_id);

ALTER TABLE public.territory_nodes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "territory_nodes_read_all" ON public.territory_nodes;
CREATE POLICY "territory_nodes_read_all" ON public.territory_nodes FOR SELECT USING (true);

-- ------------------------------------------------------------------------------
-- 4. TABLA: territory_adjacencies (Grafo Topológico de Expansión Estilo Risk)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.territory_adjacencies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    from_province_id VARCHAR(32) NOT NULL REFERENCES public.world_provinces(id) ON DELETE CASCADE,
    to_province_id VARCHAR(32) NOT NULL REFERENCES public.world_provinces(id) ON DELETE CASCADE,
    connection_type VARCHAR(32) NOT NULL CHECK (connection_type IN (
        'land_open', 'land_choke', 'river', 'strait', 'sea_lane', 'air_corridor'
    )),
    is_blocked BOOLEAN NOT NULL DEFAULT false,
    max_bandwidth_tons INTEGER NOT NULL DEFAULT 500,
    toll_rate_percent NUMERIC(4, 2) NOT NULL DEFAULT 0.00 CHECK (toll_rate_percent BETWEEN 0.00 AND 10.00),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT uq_territory_adjacency UNIQUE (from_province_id, to_province_id)
);

CREATE INDEX IF NOT EXISTS idx_territory_adjacencies_from ON public.territory_adjacencies(from_province_id);
CREATE INDEX IF NOT EXISTS idx_territory_adjacencies_to ON public.territory_adjacencies(to_province_id);

ALTER TABLE public.territory_adjacencies ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "territory_adjacencies_read_all" ON public.territory_adjacencies;
CREATE POLICY "territory_adjacencies_read_all" ON public.territory_adjacencies FOR SELECT USING (true);

-- ------------------------------------------------------------------------------
-- 5. TABLA: territory_control (Soberanía y Estado de Asedio en Tiempo Real)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.territory_control (
    province_id VARCHAR(32) PRIMARY KEY REFERENCES public.world_provinces(id) ON DELETE CASCADE,
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
-- 6. TABLA: corporate_subsidiaries (Tope de Máximo 10 Clanes por Corporación)
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
CREATE INDEX IF NOT EXISTS idx_corporate_subsidiaries_sub ON public.corporate_subsidiaries(subsidiary_clan_id);

ALTER TABLE public.corporate_subsidiaries ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "corporate_subsidiaries_view_all" ON public.corporate_subsidiaries;
CREATE POLICY "corporate_subsidiaries_view_all" ON public.corporate_subsidiaries FOR SELECT USING (true);

CREATE OR REPLACE FUNCTION public.check_corporate_clan_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_clan_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_clan_count
    FROM public.corporate_subsidiaries
    WHERE parent_corp_id = NEW.parent_corp_id
      AND status = 'active'
      AND id <> COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid);

    IF v_clan_count >= 10 THEN
        RAISE EXCEPTION 'Límite de gobernanza alcanzado: Una Corporación Matriz no puede exceder 10 clanes federados (Actual: %)', v_clan_count;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_check_corporate_clan_limit ON public.corporate_subsidiaries;
CREATE TRIGGER trg_check_corporate_clan_limit
    BEFORE INSERT OR UPDATE OF parent_corp_id, status
    ON public.corporate_subsidiaries
    FOR EACH ROW
    WHEN (NEW.status = 'active')
    EXECUTE FUNCTION public.check_corporate_clan_limit();

-- ------------------------------------------------------------------------------
-- 7. TABLA: user_unit_hangar (Stock Físico de Unidades en Escala 1-100 HP)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_unit_hangar (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    clan_id UUID REFERENCES public.clans(id) ON DELETE SET NULL,
    unit_code VARCHAR(32) NOT NULL,
    tier INTEGER NOT NULL DEFAULT 1 CHECK (tier BETWEEN 1 AND 5),
    level INTEGER NOT NULL DEFAULT 1 CHECK (level BETWEEN 1 AND 5),
    hp INTEGER NOT NULL DEFAULT 100 CHECK (hp BETWEEN 1 AND 100),
    quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity >= 0),
    location_province_id VARCHAR(32) REFERENCES public.world_provinces(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_user_unit_hangar_user ON public.user_unit_hangar(user_id, unit_code, tier);
CREATE INDEX IF NOT EXISTS idx_user_unit_hangar_location ON public.user_unit_hangar(location_province_id);

ALTER TABLE public.user_unit_hangar ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "user_unit_hangar_own" ON public.user_unit_hangar;
CREATE POLICY "user_unit_hangar_own" ON public.user_unit_hangar 
    FOR ALL USING ((SELECT auth.uid()) = user_id);

-- ------------------------------------------------------------------------------
-- 8. TABLA: user_patents (Patentes Tecnológicas Permanentes T1-T5)
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
CREATE POLICY "user_patents_own" ON public.user_patents 
    FOR ALL USING ((SELECT auth.uid()) = user_id);

-- ------------------------------------------------------------------------------
-- 9. TABLA: garrison_deployments (Búnkeres IA Nivel 1 a 5 con Envejecimiento)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.garrison_deployments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    province_id VARCHAR(32) NOT NULL REFERENCES public.world_provinces(id) ON DELETE CASCADE,
    region_id VARCHAR(32) GENERATED ALWAYS AS (province_id) STORED,
    owning_clan_id UUID NOT NULL REFERENCES public.clans(id) ON DELETE CASCADE,
    commander_name VARCHAR(96) NOT NULL DEFAULT 'Comandante de Guarnición',
    garrison_level INTEGER NOT NULL DEFAULT 1 CHECK (garrison_level BETWEEN 1 AND 5),
    ai_engine_tier VARCHAR(16) NOT NULL DEFAULT 'easy' CHECK (ai_engine_tier IN (
        'easy', 'normal', 'hard', 'chess', 'mcts_legendary'
    )),
    hourly_upkeep_ec INTEGER NOT NULL DEFAULT 150 CHECK (hourly_upkeep_ec >= 0),
    is_legendary BOOLEAN NOT NULL DEFAULT false,
    service_started_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    retirement_due_at TIMESTAMPTZ DEFAULT NULL,
    expires_at TIMESTAMPTZ DEFAULT NULL,
    current_chassis_stock JSONB NOT NULL DEFAULT '[]'::jsonb,
    is_under_attack BOOLEAN NOT NULL DEFAULT false,
    handshake_deadline TIMESTAMPTZ DEFAULT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT uq_province_garrison UNIQUE (province_id)
);

CREATE INDEX IF NOT EXISTS idx_garrison_deployments_province ON public.garrison_deployments(province_id);
CREATE INDEX IF NOT EXISTS idx_garrison_deployments_clan ON public.garrison_deployments(owning_clan_id);

ALTER TABLE public.garrison_deployments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "garrison_deployments_view_all" ON public.garrison_deployments;
CREATE POLICY "garrison_deployments_view_all" ON public.garrison_deployments FOR SELECT USING (true);

DROP POLICY IF EXISTS "garrison_deployments_modify_clan" ON public.garrison_deployments;
CREATE POLICY "garrison_deployments_modify_clan" ON public.garrison_deployments 
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.clan_members 
            WHERE clan_members.clan_id = garrison_deployments.owning_clan_id 
              AND clan_members.user_id = (SELECT auth.uid())
              AND clan_members.role IN ('leader', 'co_leader', 'officer')
        )
    );

-- ------------------------------------------------------------------------------
-- 10. TABLA: p2p_market_orders (Mercado P2P Transaccional V2)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.p2p_market_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    seller_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    buyer_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    origin_province_id VARCHAR(32) REFERENCES public.world_provinces(id) ON DELETE SET NULL,
    province_terminal_id VARCHAR(32) REFERENCES public.world_provinces(id) ON DELETE SET NULL,
    item_category VARCHAR(32) NOT NULL CHECK (item_category IN (
        'raw_resource', 'refined_material', 'patent_blueprint', 'buff_consumable', 'unit_chassis', 'cosmetic'
    )),
    item_code VARCHAR(64) NOT NULL,
    tier INTEGER NOT NULL DEFAULT 1 CHECK (tier BETWEEN 1 AND 5),
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    unit_price_ec INTEGER NOT NULL CHECK (unit_price_ec > 0),
    total_price_ec INTEGER NOT NULL CHECK (total_price_ec > 0),
    platform_burn_ec INTEGER NOT NULL DEFAULT 0,
    province_royalty_ec INTEGER NOT NULL DEFAULT 0,
    net_seller_revenue_ec INTEGER NOT NULL DEFAULT 0,
    status VARCHAR(16) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    completed_at TIMESTAMPTZ DEFAULT NULL
);

CREATE INDEX IF NOT EXISTS idx_p2p_orders_seller ON public.p2p_market_orders(seller_id);
CREATE INDEX IF NOT EXISTS idx_p2p_orders_category ON public.p2p_market_orders(item_category, tier);
CREATE INDEX IF NOT EXISTS idx_p2p_orders_terminal ON public.p2p_market_orders(province_terminal_id);
CREATE INDEX IF NOT EXISTS idx_p2p_orders_status ON public.p2p_market_orders(status);

ALTER TABLE public.p2p_market_orders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "p2p_market_orders_view" ON public.p2p_market_orders;
CREATE POLICY "p2p_market_orders_view" ON public.p2p_market_orders FOR SELECT USING (true);

DROP POLICY IF EXISTS "p2p_market_orders_manage_own" ON public.p2p_market_orders;
CREATE POLICY "p2p_market_orders_manage_own" ON public.p2p_market_orders 
    FOR ALL USING ((SELECT auth.uid()) = seller_id);

-- ------------------------------------------------------------------------------
-- 11. RPC: execute_territory_attack_declaration (Declaración de Asedio Risk)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.execute_territory_attack_declaration(
    p_origin_province_id VARCHAR(32),
    p_target_province_id VARCHAR(32),
    p_attacker_clan_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_adj_exists BOOLEAN;
    v_origin_control public.territory_control%ROWTYPE;
    v_target_control public.territory_control%ROWTYPE;
    v_target_province public.world_provinces%ROWTYPE;
    v_now TIMESTAMPTZ := timezone('utc'::text, now());
BEGIN
    IF (SELECT auth.uid()) IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'No autenticado');
    END IF;

    SELECT * INTO v_target_province
    FROM public.world_provinces
    WHERE id = p_target_province_id;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Provincia objetivo no encontrada');
    END IF;

    SELECT EXISTS (
        SELECT 1 FROM public.territory_adjacencies
        WHERE ((from_province_id = p_origin_province_id AND to_province_id = p_target_province_id)
            OR (from_province_id = p_target_province_id AND to_province_id = p_origin_province_id))
          AND is_blocked = false
    ) INTO v_adj_exists;

    IF NOT v_adj_exists THEN
        RETURN jsonb_build_object('success', false, 'error', 'Infracción de Adyacencia: Las provincias no están conectadas en el grafo táctico.');
    END IF;

    SELECT * INTO v_origin_control
    FROM public.territory_control
    WHERE province_id = p_origin_province_id;

    IF v_origin_control.controlling_clan_id IS DISTINCT FROM p_attacker_clan_id THEN
        RETURN jsonb_build_object('success', false, 'error', 'El clan atacante no posee soberanía sobre la provincia de vanguardia.');
    END IF;

    SELECT * INTO v_target_control
    FROM public.territory_control
    WHERE province_id = p_target_province_id
    FOR UPDATE;

    IF v_target_control.status = 'cooldown_priority' AND v_target_control.cooldown_expires_at > v_now THEN
        RETURN jsonb_build_object('success', false, 'error', 'Provincia bajo escudo temporal anti-steamroll post-conquista.');
    END IF;

    IF v_target_control.controlling_clan_id = p_attacker_clan_id THEN
        RETURN jsonb_build_object('success', false, 'error', 'Tu clan ya posee la soberanía de esta provincia.');
    END IF;

    UPDATE public.territory_control
    SET status = 'under_siege',
        last_battle_at = v_now,
        updated_at = v_now
    WHERE province_id = p_target_province_id;

    UPDATE public.territory_nodes
    SET is_under_attack = true,
        updated_at = v_now
    WHERE province_id = p_target_province_id;

    RETURN jsonb_build_object(
        'success', true,
        'message', 'Asedio declarado con éxito.',
        'target_province_id', p_target_province_id,
        'is_capital', v_target_province.is_capital,
        'resource_multiplier', v_target_province.resource_multiplier,
        'status', 'under_siege'
    );
END;
$$;

-- ------------------------------------------------------------------------------
-- 12. RPC: execute_p2p_market_transaction (Split 2%: 1% Sink + 1% Regalía)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.execute_p2p_market_transaction(p_order_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_buyer_id UUID := (SELECT auth.uid());
    v_order public.p2p_market_orders%ROWTYPE;
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
        RETURN jsonb_build_object('success', false, 'error', 'No autenticado');
    END IF;

    SELECT * INTO v_order
    FROM public.p2p_market_orders
    WHERE id = p_order_id AND status = 'active'
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Orden no disponible o ya finalizada');
    END IF;

    IF v_order.seller_id = v_buyer_id THEN
        RETURN jsonb_build_object('success', false, 'error', 'No puedes comprar tu propia orden');
    END IF;

    IF v_buyer_id < v_order.seller_id THEN
        SELECT * INTO v_buyer_profile FROM public.profiles WHERE id = v_buyer_id FOR UPDATE;
        SELECT * INTO v_seller_profile FROM public.profiles WHERE id = v_order.seller_id FOR UPDATE;
    ELSE
        SELECT * INTO v_seller_profile FROM public.profiles WHERE id = v_order.seller_id FOR UPDATE;
        SELECT * INTO v_buyer_profile FROM public.profiles WHERE id = v_buyer_id FOR UPDATE;
    END IF;

    IF v_buyer_profile.battle_credits < v_order.total_price_ec THEN
        RETURN jsonb_build_object('success', false, 'error', 'Créditos de batalla insuficientes');
    END IF;

    v_tax_total := FLOOR(v_order.total_price_ec * 0.02);
    v_burn_ec := FLOOR(v_order.total_price_ec * 0.01);
    v_royalty_ec := v_tax_total - v_burn_ec;
    v_net_payout := v_order.total_price_ec - v_tax_total;

    PERFORM set_config('app.bypass_profile_guard', 'on', true);

    UPDATE public.profiles
    SET battle_credits = battle_credits - v_order.total_price_ec,
        wallet_balance = battle_credits - v_order.total_price_ec,
        updated_at = v_now
    WHERE id = v_buyer_id;

    UPDATE public.profiles
    SET battle_credits = battle_credits + v_net_payout,
        wallet_balance = battle_credits + v_net_payout,
        updated_at = v_now
    WHERE id = v_order.seller_id;

    IF v_order.province_terminal_id IS NOT NULL AND v_royalty_ec > 0 THEN
        SELECT * INTO v_territory FROM public.territory_control
        WHERE province_id = v_order.province_terminal_id;

        IF FOUND AND v_territory.controlling_clan_id IS NOT NULL THEN
            UPDATE public.clans
            SET treasury_gold = treasury_gold + v_royalty_ec
            WHERE id = v_territory.controlling_clan_id;
        END IF;
    END IF;

    IF v_order.item_category = 'unit_chassis' THEN
        INSERT INTO public.user_unit_hangar (
            user_id, unit_code, tier, level, hp, quantity, location_province_id
        ) VALUES (
            v_buyer_id, v_order.item_code, v_order.tier, 1, 100, v_order.quantity, v_order.province_terminal_id
        );
    END IF;

    UPDATE public.p2p_market_orders
    SET buyer_id = v_buyer_id,
        platform_burn_ec = v_burn_ec,
        province_royalty_ec = v_royalty_ec,
        net_seller_revenue_ec = v_net_payout,
        status = 'completed',
        completed_at = v_now
    WHERE id = p_order_id;

    RETURN jsonb_build_object(
        'success', true,
        'order_id', p_order_id,
        'total_price_ec', v_order.total_price_ec,
        'platform_burn_ec', v_burn_ec,
        'province_royalty_ec', v_royalty_ec,
        'seller_received', v_net_payout
    );
END;
$$;

-- ------------------------------------------------------------------------------
-- 13. RPC: deploy_reinforcements_to_battle (1 Solicitud / Latencia 4 Rondas T+4)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.deploy_reinforcements_to_battle(
    p_match_id UUID,
    p_player_id UUID,
    p_unit_hangar_id UUID,
    p_current_turn INTEGER
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_hangar public.user_unit_hangar%ROWTYPE;
    v_arrival_turn INTEGER := p_current_turn + 4;
    v_now TIMESTAMPTZ := timezone('utc'::text, now());
BEGIN
    IF (SELECT auth.uid()) IS NULL OR (SELECT auth.uid()) <> p_player_id THEN
        RETURN jsonb_build_object('success', false, 'error', 'No autorizado');
    END IF;

    SELECT * INTO v_hangar
    FROM public.user_unit_hangar
    WHERE id = p_unit_hangar_id AND user_id = p_player_id
    FOR UPDATE;

    IF NOT FOUND OR v_hangar.quantity < 1 THEN
        RETURN jsonb_build_object('success', false, 'error', 'Unidad de hangar no disponible.');
    END IF;

    UPDATE public.user_unit_hangar
    SET quantity = quantity - 1,
        updated_at = v_now
    WHERE id = p_unit_hangar_id;

    RETURN jsonb_build_object(
        'success', true,
        'match_id', p_match_id,
        'player_id', p_player_id,
        'unit_code', v_hangar.unit_code,
        'tier', v_hangar.tier,
        'requested_turn', p_current_turn,
        'arrival_turn', v_arrival_turn,
        'reinforcement_delay', 4,
        'remaining_quantity', v_hangar.quantity - 1
    );
END;
$$;

-- ------------------------------------------------------------------------------
-- 14. RPC: calculate_and_apply_territorial_upkeep (Consumo y Penalización)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.calculate_and_apply_territorial_upkeep(p_clan_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_total_nodes INTEGER := 0;
    v_total_upkeep_ec INTEGER := 0;
    v_clan public.clans%ROWTYPE;
    v_overexpansion_penalty NUMERIC(4, 2) := 0.00;
    v_now TIMESTAMPTZ := timezone('utc'::text, now());
BEGIN
    SELECT * INTO v_clan FROM public.clans WHERE id = p_clan_id FOR UPDATE;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Clan no encontrado');
    END IF;

    SELECT COUNT(*), COALESCE(SUM(energy_upkeep), 0)
    INTO v_total_nodes, v_total_upkeep_ec
    FROM public.territory_nodes
    WHERE controller_clan_id = p_clan_id;

    IF v_total_nodes > 10 THEN
        v_overexpansion_penalty := LEAST(0.55, 0.05 * (v_total_nodes - 10));
        v_total_upkeep_ec := FLOOR(v_total_upkeep_ec * (1 + v_overexpansion_penalty));
    END IF;

    UPDATE public.clans
    SET treasury_gold = GREATEST(0, treasury_gold - v_total_upkeep_ec),
        updated_at = v_now
    WHERE id = p_clan_id;

    RETURN jsonb_build_object(
        'success', true,
        'clan_id', p_clan_id,
        'total_nodes', v_total_nodes,
        'base_upkeep_ec', v_total_upkeep_ec,
        'overexpansion_penalty', v_overexpansion_penalty,
        'remaining_treasury', GREATEST(0, v_clan.treasury_gold - v_total_upkeep_ec)
    );
END;
$$;

-- ------------------------------------------------------------------------------
-- 15. RPC: rpc_spin_daily_wheel (Ruleta Diaria Criptográficamente Segura)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.rpc_spin_daily_wheel(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_user public.profiles%ROWTYPE;
    v_roll NUMERIC;
    v_reward_type VARCHAR(32);
    v_reward_amount INTEGER;
    v_reward_label VARCHAR(64);
    v_now TIMESTAMPTZ := timezone('utc'::text, now());
BEGIN
    IF (SELECT auth.uid()) IS NULL OR (SELECT auth.uid()) <> p_user_id THEN
        RETURN jsonb_build_object('success', false, 'error', 'No autorizado');
    END IF;

    SELECT * INTO v_user FROM public.profiles WHERE id = p_user_id FOR UPDATE;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Perfil no encontrado');
    END IF;

    v_roll := random() * 100;
    IF v_roll < 50 THEN
        v_reward_type := 'credits';
        v_reward_amount := 500;
        v_reward_label := '500 Créditos Tácticos';
    ELSIF v_roll < 80 THEN
        v_reward_type := 'credits';
        v_reward_amount := 1200;
        v_reward_label := '1,200 Créditos Tácticos';
    ELSIF v_roll < 95 THEN
        v_reward_type := 'gems';
        v_reward_amount := 25;
        v_reward_label := '25 Gemas de Mando';
    ELSE
        v_reward_type := 'gems';
        v_reward_amount := 100;
        v_reward_label := '100 Gemas Legendarias';
    END IF;

    PERFORM set_config('app.bypass_profile_guard', 'on', true);

    IF v_reward_type = 'credits' THEN
        UPDATE public.profiles
        SET battle_credits = battle_credits + v_reward_amount,
            wallet_balance = battle_credits + v_reward_amount,
            updated_at = v_now
        WHERE id = p_user_id;
    ELSE
        UPDATE public.profiles
        SET command_gems = command_gems + v_reward_amount,
            updated_at = v_now
        WHERE id = p_user_id;
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'reward_type', v_reward_type,
        'reward_amount', v_reward_amount,
        'reward_label', v_reward_label,
        'wallet_balance', v_user.battle_credits + (CASE WHEN v_reward_type = 'credits' THEN v_reward_amount ELSE 0 END)
    );
END;
$$;

-- ------------------------------------------------------------------------------
-- 16. PERMISOS Y REVOCACIONES SEGURAS (Lints 0028/0029)
-- ------------------------------------------------------------------------------
REVOKE EXECUTE ON FUNCTION public.execute_territory_attack_declaration FROM public, anon;
GRANT EXECUTE ON FUNCTION public.execute_territory_attack_declaration TO authenticated;

REVOKE EXECUTE ON FUNCTION public.execute_p2p_market_transaction FROM public, anon;
GRANT EXECUTE ON FUNCTION public.execute_p2p_market_transaction TO authenticated;

REVOKE EXECUTE ON FUNCTION public.deploy_reinforcements_to_battle FROM public, anon;
GRANT EXECUTE ON FUNCTION public.deploy_reinforcements_to_battle TO authenticated;

REVOKE EXECUTE ON FUNCTION public.calculate_and_apply_territorial_upkeep FROM public, anon;
GRANT EXECUTE ON FUNCTION public.calculate_and_apply_territorial_upkeep TO authenticated;

REVOKE EXECUTE ON FUNCTION public.rpc_spin_daily_wheel FROM public, anon;
GRANT EXECUTE ON FUNCTION public.rpc_spin_daily_wheel TO authenticated;

-- ------------------------------------------------------------------------------
-- 17. PUBLICACIÓN REALTIME
-- ------------------------------------------------------------------------------
DO $$ BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.territory_control, public.p2p_market_orders;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- ------------------------------------------------------------------------------
-- 18. SEMILLAS CANÓNICAS DE MUNDO Y CLANES SOBERANOS
-- ------------------------------------------------------------------------------
-- Clanes Canónicos
INSERT INTO public.clans (id, name, tag, description, emblem_id, banner_color, treasury_gold)
VALUES
    ('c0000000-0000-0000-0000-000000000001', 'Iron Vanguard Syndicate', 'IVS', 'Sindicato de Blindados Pesados de la Costa Atlántica', 'insignia_hawk', '#E63946', 50000),
    ('c0000000-0000-0000-0000-000000000002', 'Solar Energy Combine', 'SEC', 'Monopolio de Reactores de Fusión y Tecnología Sonora', 'insignia_eagle', '#F4A261', 75000),
    ('c0000000-0000-0000-0000-000000000003', 'Cyber Cossacks League', 'CCL', 'Legión Mecanizada de Vanguardia Siberiana', 'insignia_wolf', '#2A9D8F', 40000)
ON CONFLICT (id) DO UPDATE
SET name = EXCLUDED.name, tag = EXCLUDED.tag, treasury_gold = EXCLUDED.treasury_gold;

-- Países
INSERT INTO public.world_countries (iso_code, name, continent, coordinates, defense_doctrine)
VALUES
    ('ES', 'Reino de España', 'EU', '{"lat": 40.4637, "lng": -3.7492}'::jsonb, 'armored_infantry'),
    ('US', 'Estados Unidos', 'NA', '{"lat": 37.0902, "lng": -95.7129}'::jsonb, 'aerospace_heavy'),
    ('JP', 'Japón', 'AS', '{"lat": 36.2048, "lng": 138.2529}'::jsonb, 'high_tech_naval'),
    ('DE', 'Alemania', 'EU', '{"lat": 51.1657, "lng": 10.4515}'::jsonb, 'blitz_mechanized'),
    ('FR', 'Francia', 'EU', '{"lat": 46.2276, "lng": 2.2137}'::jsonb, 'artillery_doctrinal'),
    ('GB', 'Reino Unido', 'EU', '{"lat": 55.3781, "lng": -3.4360}'::jsonb, 'naval_supremacy'),
    ('EG', 'Egipto', 'AF', '{"lat": 26.8206, "lng": 30.8025}'::jsonb, 'chokepoint_fortified'),
    ('BR', 'Brasil', 'SA', '{"lat": -14.2350, "lng": -51.9253}'::jsonb, 'jungle_commando'),
    ('AU', 'Australia', 'OC', '{"lat": -25.2744, "lng": 133.7751}'::jsonb, 'desert_recon')
ON CONFLICT (iso_code) DO UPDATE
SET name = EXCLUDED.name, continent = EXCLUDED.continent;

-- Provincias con Capitales Capturables 2.0x
INSERT INTO public.world_provinces (
    id, country_iso, name, is_capital, is_capturable, base_terrain, native_weather,
    resource_multiplier, building_slots, pos_x, pos_y, width, height
)
VALUES
    -- ESPAÑA
    ('ES_MADRID', 'ES', 'Madrid Central', true, true, 'plains', 'clear', 2.00, 16, 46.00, 42.00, 6.00, 5.00),
    ('ES_CATALUNA', 'ES', 'Cataluña & Ebro', false, true, 'archipelago', 'clear', 1.25, 10, 52.00, 39.00, 7.00, 6.00),
    ('ES_ANDALUCIA', 'ES', 'Andalucía & Estrecho', false, true, 'desert', 'clear', 1.30, 10, 44.00, 48.00, 8.00, 6.00),
    ('ES_PAIS_VASCO', 'ES', 'País Vasco & Cantábrico', false, true, 'mountain', 'rain', 1.35, 10, 47.00, 36.00, 6.00, 4.00),
    ('ES_GALICIA', 'ES', 'Galicia Atlántica', false, true, 'forest', 'rain', 1.15, 8, 38.00, 37.00, 6.00, 5.00),

    -- ESTADOS UNIDOS
    ('US_WASHINGTON', 'US', 'Washington D.C.', true, true, 'plains', 'clear', 2.00, 16, 26.00, 38.00, 6.00, 5.00),
    ('US_CALIFORNIA', 'US', 'California & Costa Oeste', false, true, 'archipelago', 'clear', 1.50, 12, 14.00, 40.00, 8.00, 8.00),
    ('US_TEXAS', 'US', 'Texas Cuenca Energética', false, true, 'desert', 'sandstorm', 1.45, 12, 20.00, 46.00, 8.00, 7.00),
    ('US_ALASKA', 'US', 'Alaska Ártica', false, true, 'tundra', 'snow', 1.40, 8, 12.00, 20.00, 9.00, 8.00),

    -- ALEMANIA
    ('DE_BERLIN', 'DE', 'Berlín Metropolitana', true, true, 'plains', 'clear', 2.00, 16, 54.00, 33.00, 6.00, 5.00),
    ('DE_RUHR', 'DE', 'Renania & Cuenca del Ruhr', false, true, 'forest', 'rain', 1.50, 12, 51.00, 34.00, 6.00, 5.00),
    ('DE_BAVIERA', 'DE', 'Baviera & Alpes', false, true, 'mountain', 'snow', 1.30, 10, 53.00, 37.00, 7.00, 6.00),

    -- JAPÓN
    ('JP_TOKYO', 'JP', 'Tokio Central', true, true, 'archipelago', 'clear', 2.00, 16, 82.00, 41.00, 6.00, 5.00),
    ('JP_OSAKA', 'JP', 'Kansai & Osaka', false, true, 'archipelago', 'clear', 1.35, 10, 80.00, 43.00, 5.00, 5.00),
    ('JP_HOKKAIDO', 'JP', 'Hokkaido Norte', false, true, 'tundra', 'snow', 1.25, 8, 83.00, 36.00, 6.00, 6.00),

    -- EGIPTO
    ('EG_CAIRO', 'EG', 'El Cairo & Delta', true, true, 'desert', 'sandstorm', 2.00, 16, 58.00, 46.00, 6.00, 5.00),
    ('EG_SINAI', 'EG', 'Sinaí & Canal de Suez', false, true, 'desert', 'sandstorm', 1.60, 12, 61.00, 47.00, 6.00, 6.00),

    -- REINO UNIDO
    ('GB_LONDON', 'GB', 'Gran Londres', true, true, 'plains', 'rain', 2.00, 16, 48.00, 32.00, 5.00, 5.00),
    ('GB_SCOTLAND', 'GB', 'Escocia & Mar del Norte', false, true, 'mountain', 'snow', 1.25, 8, 47.00, 27.00, 6.00, 6.00),

    -- FRANCIA
    ('FR_PARIS', 'FR', 'París Isla de Francia', true, true, 'plains', 'clear', 2.00, 16, 48.00, 36.00, 6.00, 5.00),
    ('FR_MARSELLA', 'FR', 'Provenza & Costa Azul', false, true, 'archipelago', 'clear', 1.20, 10, 50.00, 40.00, 6.00, 5.00),

    -- BRASIL
    ('BR_BRASILIA', 'BR', 'Distrito Federal Brasilia', true, true, 'plains', 'clear', 2.00, 16, 34.00, 65.00, 6.00, 5.00),
    ('BR_AMAZONAS', 'BR', 'Amazonas Cuenca Fluvial', false, true, 'forest', 'rain', 1.40, 10, 30.00, 60.00, 9.00, 8.00),

    -- AUSTRALIA
    ('AU_CANBERRA', 'AU', 'Canberra & Sídney', true, true, 'plains', 'clear', 2.00, 16, 84.00, 75.00, 6.00, 6.00),
    ('AU_OUTBACK', 'AU', 'Outback Mineral', false, true, 'desert', 'sandstorm', 1.45, 10, 80.00, 72.00, 10.00, 9.00)
ON CONFLICT (id) DO UPDATE
SET name = EXCLUDED.name,
    is_capital = EXCLUDED.is_capital,
    is_capturable = EXCLUDED.is_capturable,
    resource_multiplier = EXCLUDED.resource_multiplier,
    building_slots = EXCLUDED.building_slots,
    pos_x = EXCLUDED.pos_x,
    pos_y = EXCLUDED.pos_y,
    width = EXCLUDED.width,
    height = EXCLUDED.height;

-- Adyacencias
INSERT INTO public.territory_adjacencies (from_province_id, to_province_id, connection_type, max_bandwidth_tons)
VALUES
    ('ES_MADRID', 'ES_CATALUNA', 'land_open', 800),
    ('ES_MADRID', 'ES_ANDALUCIA', 'land_open', 800),
    ('ES_MADRID', 'ES_PAIS_VASCO', 'land_open', 700),
    ('ES_MADRID', 'ES_GALICIA', 'land_open', 600),
    ('ES_CATALUNA', 'ES_PAIS_VASCO', 'land_open', 600),
    ('ES_ANDALUCIA', 'ES_CATALUNA', 'land_open', 500),
    ('ES_GALICIA', 'ES_PAIS_VASCO', 'land_open', 500),
    ('ES_CATALUNA', 'FR_MARSELLA', 'land_open', 700),
    ('ES_PAIS_VASCO', 'FR_PARIS', 'land_open', 600),
    ('FR_PARIS', 'FR_MARSELLA', 'land_open', 900),
    ('FR_PARIS', 'GB_LONDON', 'strait', 500),
    ('GB_LONDON', 'GB_SCOTLAND', 'land_open', 600),
    ('FR_PARIS', 'DE_RUHR', 'land_open', 800),
    ('FR_MARSELLA', 'DE_BAVIERA', 'land_choke', 500),
    ('DE_BERLIN', 'DE_RUHR', 'land_open', 800),
    ('DE_BERLIN', 'DE_BAVIERA', 'land_open', 700),
    ('DE_RUHR', 'DE_BAVIERA', 'land_open', 750),
    ('ES_ANDALUCIA', 'EG_CAIRO', 'sea_lane', 400),
    ('EG_CAIRO', 'EG_SINAI', 'strait', 600),
    ('US_WASHINGTON', 'US_TEXAS', 'land_open', 900),
    ('US_TEXAS', 'US_CALIFORNIA', 'land_open', 850),
    ('US_CALIFORNIA', 'US_ALASKA', 'sea_lane', 400),
    ('JP_TOKYO', 'JP_OSAKA', 'land_open', 900),
    ('JP_TOKYO', 'JP_HOKKAIDO', 'strait', 600)
ON CONFLICT (from_province_id, to_province_id) DO NOTHING;

-- Control Territorial Inicial
INSERT INTO public.territory_control (province_id, controlling_clan_id, current_tcp, tcp_threshold, status)
VALUES
    ('ES_MADRID', 'c0000000-0000-0000-0000-000000000001', 12000, 10000, 'stable'),
    ('ES_CATALUNA', 'c0000000-0000-0000-0000-000000000001', 9500, 10000, 'stable'),
    ('ES_ANDALUCIA', 'c0000000-0000-0000-0000-000000000002', 10000, 10000, 'stable'),
    ('DE_BERLIN', 'c0000000-0000-0000-0000-000000000002', 14000, 10000, 'stable'),
    ('DE_RUHR', 'c0000000-0000-0000-0000-000000000002', 11000, 10000, 'stable'),
    ('JP_TOKYO', 'c0000000-0000-0000-0000-000000000003', 15000, 10000, 'stable'),
    ('US_WASHINGTON', 'c0000000-0000-0000-0000-000000000001', 13500, 10000, 'stable')
ON CONFLICT (province_id) DO UPDATE
SET controlling_clan_id = EXCLUDED.controlling_clan_id,
    current_tcp = EXCLUDED.current_tcp,
    status = EXCLUDED.status;

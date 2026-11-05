-- ==============================================================================
-- MIGRACIÓN 24: TERRITORIAL METAGAME SOVEREIGNTY, P2P ALBION & AW RISK TOPOLOGY
-- ==============================================================================
-- Proyecto: Tactical Command: Wars of Legacy — Global Sovereignty Edition
-- Especificación: METAGAME_DESIGN/ (01 a 14) + CANON RATIFICADO
-- 
-- Leyes Invariables:
-- 1. Capitales Capturables de Alto Rendimiento: is_capital = true, is_capturable = true,
--    multiplicador de producción masivo (1.75x a 2.0x) y slots máximos (12 a 16).
-- 2. Soberanía Exclusiva de Clanes: los países son divisiones geográficas; el control
--    pertenece exclusivamente a clanes o corporaciones matrices (controller_clan_id).
-- 3. Gobernanza Limitada: Máximo estricto de 10 clanes por Corporación Matriz.
-- 4. Comisión de Mercado P2P del 2%: 1% sink deflacionario quemado + 1% regalía clan.
-- 5. Refuerzos Tácticos: 1 llamada por combate, latencia estricta de 4 rondas.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 0. AJUSTE DE RESTRICCIONES PREVIAS (Capitales Capturables)
-- ------------------------------------------------------------------------------
ALTER TABLE IF EXISTS public.world_regions 
    DROP CONSTRAINT IF EXISTS chk_capital_uncapturable;

-- ------------------------------------------------------------------------------
-- 1. TABLA: world_countries (Estados y Teatros Geopolíticos Soberanos)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.world_countries (
    iso_code VARCHAR(2) PRIMARY KEY, -- 'ES', 'US', 'JP', 'DE', 'FR', 'GB', 'CN', 'RU', 'EG', 'BR'
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
-- 2. TABLA: world_provinces (Provincias Estratégicas y Capitales de Alto Rendimiento)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.world_provinces (
    id VARCHAR(32) PRIMARY KEY, -- ej. 'ES_MADRID', 'ES_CATALUNA', 'US_CALIFORNIA'
    country_iso VARCHAR(2) NOT NULL REFERENCES public.world_countries(iso_code) ON DELETE CASCADE,
    name VARCHAR(96) NOT NULL,
    is_capital BOOLEAN NOT NULL DEFAULT false,
    is_capturable BOOLEAN NOT NULL DEFAULT true, -- Canónicamente capturable
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
-- 3. TABLA: territory_nodes (Nodos Estratégicos: Ciudades, Fábricas, Almacenes)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.territory_nodes (
    id VARCHAR(48) PRIMARY KEY, -- ej. 'NODE_ES_MAD_CITADEL', 'NODE_ES_CAT_FACTORY'
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
-- 5. RESTRICCIÓN DE GOBERNANZA: MÁXIMO 10 CLANES POR CORPORACIÓN MATRIZ
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.check_corporate_clan_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
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
-- 6. TABLA: p2p_market_orders (Mercado P2P Transaccional V2)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.p2p_market_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    seller_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    buyer_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    item_category VARCHAR(32) NOT NULL CHECK (item_category IN (
        'raw_resource', 'refined_material', 'patent_blueprint', 'buff_consumable', 'unit_chassis', 'cosmetic'
    )),
    item_code VARCHAR(64) NOT NULL,
    tier INTEGER NOT NULL DEFAULT 1 CHECK (tier BETWEEN 1 AND 5),
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    unit_price_ec INTEGER NOT NULL CHECK (unit_price_ec > 0),
    total_price_ec INTEGER NOT NULL CHECK (total_price_ec > 0),
    province_terminal_id VARCHAR(32) REFERENCES public.world_provinces(id) ON DELETE SET NULL,
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

ALTER TABLE public.p2p_market_orders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "p2p_market_orders_view" ON public.p2p_market_orders;
CREATE POLICY "p2p_market_orders_view" ON public.p2p_market_orders FOR SELECT USING (true);
DROP POLICY IF EXISTS "p2p_market_orders_manage_own" ON public.p2p_market_orders;
CREATE POLICY "p2p_market_orders_manage_own" ON public.p2p_market_orders FOR ALL USING (auth.uid() = seller_id);

-- ------------------------------------------------------------------------------
-- 7. RPC: execute_territory_attack_declaration (Declaración de Asedio Risk)
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
    IF auth.uid() IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'No autenticado');
    END IF;

    -- 1. Validar que la provincia destino exista
    SELECT * INTO v_target_province
    FROM public.world_provinces
    WHERE id = p_target_province_id;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Provincia objetivo no encontrada');
    END IF;

    -- 2. Validar adyacencia topológica (en cualquier sentido no bloqueado)
    SELECT EXISTS (
        SELECT 1 FROM public.territory_adjacencies
        WHERE ((from_province_id = p_origin_province_id AND to_province_id = p_target_province_id)
            OR (from_province_id = p_target_province_id AND to_province_id = p_origin_province_id))
          AND is_blocked = false
    ) INTO v_adj_exists;

    IF NOT v_adj_exists THEN
        RETURN jsonb_build_object('success', false, 'error', 'Infracción de Adyacencia: Las provincias no están conectadas en el grafo táctico.');
    END IF;

    -- 3. Validar control soberano sobre la provincia de origen
    SELECT * INTO v_origin_control
    FROM public.territory_control
    WHERE province_id = p_origin_province_id;

    IF v_origin_control.controlling_clan_id IS DISTINCT FROM p_attacker_clan_id THEN
        RETURN jsonb_build_object('success', false, 'error', 'El clan atacante no posee soberanía sobre la provincia de vanguardia.');
    END IF;

    -- 4. Bloquear y verificar estado de la provincia objetivo
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

    -- 5. Declarar asedio sobre la provincia
    UPDATE public.territory_control
    SET status = 'under_siege',
        last_battle_at = v_now,
        updated_at = v_now
    WHERE province_id = p_target_province_id;

    -- Marcar nodos estratégicos asociados
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
-- 8. RPC: execute_p2p_market_transaction (Split 2%: 1% Sink + 1% Regalía)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.execute_p2p_market_transaction(p_order_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_buyer_id UUID := auth.uid();
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

    -- Bloqueo de la orden
    SELECT * INTO v_order
    FROM public.p2p_market_orders
    WHERE id = p_order_id AND status = 'active'
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Orden no disponible');
    END IF;

    IF v_order.seller_id = v_buyer_id THEN
        RETURN jsonb_build_object('success', false, 'error', 'No puedes comprar tu propia orden');
    END IF;

    -- Bloqueo ordenado de perfiles para evitar deadlocks
    IF v_buyer_id < v_order.seller_id THEN
        SELECT * INTO v_buyer_profile FROM public.profiles WHERE id = v_buyer_id FOR UPDATE;
        SELECT * INTO v_seller_profile FROM public.profiles WHERE id = v_order.seller_id FOR UPDATE;
    ELSE
        SELECT * INTO v_seller_profile FROM public.profiles WHERE id = v_order.seller_id FOR UPDATE;
        SELECT * INTO v_buyer_profile FROM public.profiles WHERE id = v_buyer_id FOR UPDATE;
    END IF;

    IF v_buyer_profile.battle_credits < v_order.total_price_ec THEN
        RETURN jsonb_build_object('success', false, 'error', 'Créditos Energéticos insuficientes');
    END IF;

    -- Split exacto de comisión del 2%
    v_tax_total := FLOOR(v_order.total_price_ec * 0.02);
    v_burn_ec := FLOOR(v_order.total_price_ec * 0.01); -- 1% Sink
    v_royalty_ec := v_tax_total - v_burn_ec;          -- 1% Regalía Territorial
    v_net_payout := v_order.total_price_ec - v_tax_total;

    PERFORM set_config('app.bypass_profile_guard', 'on', true);

    -- Actualizar billeteras
    UPDATE public.profiles
    SET battle_credits = battle_credits - v_order.total_price_ec, updated_at = v_now
    WHERE id = v_buyer_id;

    UPDATE public.profiles
    SET battle_credits = battle_credits + v_net_payout, updated_at = v_now
    WHERE id = v_order.seller_id;

    -- Acreditar regalía al clan poseedor del terminal
    IF v_order.province_terminal_id IS NOT NULL AND v_royalty_ec > 0 THEN
        SELECT * INTO v_territory FROM public.territory_control
        WHERE province_id = v_order.province_terminal_id;

        IF FOUND AND v_territory.controlling_clan_id IS NOT NULL THEN
            UPDATE public.clans
            SET treasury_gold = treasury_gold + v_royalty_ec
            WHERE id = v_territory.controlling_clan_id;
        END IF;
    END IF;

    -- Transferencia de inventario si es unidad de hangar
    IF v_order.item_category = 'unit_chassis' THEN
        INSERT INTO public.user_unit_hangar (
            user_id, unit_code, tier, level, hp, quantity, location_province_id
        ) VALUES (
            v_buyer_id, v_order.item_code, v_order.tier, 1, 100, v_order.quantity, v_order.province_terminal_id
        );
    END IF;

    -- Asentar estado completado
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
-- 9. RPC: deploy_reinforcements_to_battle (1 Solicitud / Latencia 4 Rondas)
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
    v_arrival_turn INTEGER := p_current_turn + 4; -- Retraso estricto de 4 rondas
    v_now TIMESTAMPTZ := timezone('utc'::text, now());
BEGIN
    IF auth.uid() IS NULL OR auth.uid() <> p_player_id THEN
        RETURN jsonb_build_object('success', false, 'error', 'No autorizado');
    END IF;

    -- Bloquear y verificar stock de hangar del jugador
    SELECT * INTO v_hangar
    FROM public.user_unit_hangar
    WHERE id = p_unit_hangar_id AND user_id = p_player_id
    FOR UPDATE;

    IF NOT FOUND OR v_hangar.quantity < 1 THEN
        RETURN jsonb_build_object('success', false, 'error', 'Unidad de hangar no disponible.');
    END IF;

    -- Descontar físicamente 1 unidad del hangar
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
-- 10. RPC: calculate_and_apply_territorial_upkeep (Consumo y Penalización)
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

    -- Sumar consumo de todos los nodos territoriales del clan
    SELECT COUNT(*), COALESCE(SUM(energy_upkeep), 0)
    INTO v_total_nodes, v_total_upkeep_ec
    FROM public.territory_nodes
    WHERE controller_clan_id = p_clan_id;

    -- Penalización de sobre-expansión si supera 10 nodos
    IF v_total_nodes > 10 THEN
        v_overexpansion_penalty := LEAST(0.55, 0.05 * (v_total_nodes - 10));
        v_total_upkeep_ec := FLOOR(v_total_upkeep_ec * (1 + v_overexpansion_penalty));
    END IF;

    -- Aplicar deducción de tesorería del clan
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
-- 11. SEMILLAS CARTOGRÁFICAS REALES (Zero-Hallucination Seeding)
-- ------------------------------------------------------------------------------

-- Inserción de Países Reales
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

-- Inserción de Provincias Reales con Capitales de Alto Rendimiento (is_capital = true, capturables)
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

-- Inserción de Grafo de Adyacencia (Topología de Riesgo y Conexiones Marítimas)
INSERT INTO public.territory_adjacencies (from_province_id, to_province_id, connection_type, max_bandwidth_tons)
VALUES
    -- España interior
    ('ES_MADRID', 'ES_CATALUNA', 'land_open', 800),
    ('ES_MADRID', 'ES_ANDALUCIA', 'land_open', 800),
    ('ES_MADRID', 'ES_PAIS_VASCO', 'land_open', 700),
    ('ES_MADRID', 'ES_GALICIA', 'land_open', 600),
    ('ES_CATALUNA', 'ES_PAIS_VASCO', 'land_open', 600),
    ('ES_ANDALUCIA', 'ES_CATALUNA', 'land_open', 500),
    ('ES_GALICIA', 'ES_PAIS_VASCO', 'land_open', 500),

    -- Frontera España - Francia
    ('ES_CATALUNA', 'FR_MARSELLA', 'land_open', 700),
    ('ES_PAIS_VASCO', 'FR_PARIS', 'land_open', 600),

    -- Francia interior
    ('FR_PARIS', 'FR_MARSELLA', 'land_open', 900),

    -- Canal de la Mancha (Francia - Reino Unido)
    ('FR_PARIS', 'GB_LONDON', 'strait', 500),

    -- Reino Unido interior
    ('GB_LONDON', 'GB_SCOTLAND', 'land_open', 600),

    -- Frontera Francia - Alemania
    ('FR_PARIS', 'DE_RUHR', 'land_open', 800),
    ('FR_MARSELLA', 'DE_BAVIERA', 'land_choke', 500),

    -- Alemania interior
    ('DE_BERLIN', 'DE_RUHR', 'land_open', 800),
    ('DE_BERLIN', 'DE_BAVIERA', 'land_open', 700),
    ('DE_RUHR', 'DE_BAVIERA', 'land_open', 750),

    -- Estrecho de Gibraltar (España - Egipto/Mediterráneo)
    ('ES_ANDALUCIA', 'EG_CAIRO', 'sea_lane', 400),

    -- Egipto interior & Suez
    ('EG_CAIRO', 'EG_SINAI', 'strait', 600),

    -- Estados Unidos interior
    ('US_WASHINGTON', 'US_TEXAS', 'land_open', 900),
    ('US_TEXAS', 'US_CALIFORNIA', 'land_open', 850),
    ('US_CALIFORNIA', 'US_ALASKA', 'sea_lane', 400),

    -- Japón interior
    ('JP_TOKYO', 'JP_OSAKA', 'land_open', 900),
    ('JP_TOKYO', 'JP_HOKKAIDO', 'strait', 600),

    -- Brasil interior
    ('BR_BRASILIA', 'BR_AMAZONAS', 'river', 500),

    -- Australia interior
    ('AU_CANBERRA', 'AU_OUTBACK', 'land_open', 600)
ON CONFLICT (from_province_id, to_province_id) DO NOTHING;

-- Inserción de Nodos Estratégicos dentro de Provincias
INSERT INTO public.territory_nodes (
    id, province_id, name, node_type, defense_level, energy_upkeep, structural_hp, max_hp, output_per_min
)
VALUES
    -- Nodos España
    ('NODE_ES_MAD_CITADEL', 'ES_MADRID', 'Sede Central de Mando Madrid', 'capital_citadel', 5, 120, 12000, 12000, 120),
    ('NODE_ES_MAD_RADAR', 'ES_MADRID', 'Matriz de Radar C4ISR Central', 'radar', 4, 80, 7000, 7000, 60),
    ('NODE_ES_CAT_FACTORY', 'ES_CATALUNA', 'Planta Ensambladora Automotriz Ebro', 'factory', 3, 90, 8500, 8500, 75),
    ('NODE_ES_CAT_PORT', 'ES_CATALUNA', 'Astillero Comercial Barcelona', 'refinery', 3, 70, 7500, 7500, 65),
    ('NODE_ES_AND_REFINERY', 'ES_ANDALUCIA', 'Refinería del Estrecho Algeciras', 'refinery', 3, 85, 8000, 8000, 70),
    ('NODE_ES_AND_GARRISON', 'ES_ANDALUCIA', 'Búnker de Mando Guarnición Sur', 'fortress', 4, 110, 9500, 9500, 50),
    ('NODE_ES_PV_STEEL', 'ES_PAIS_VASCO', 'Altos Hornos del Nervión', 'factory', 4, 100, 9000, 9000, 85),
    ('NODE_ES_GAL_LOGISTICS', 'ES_GALICIA', 'Depósito Logístico Finisterre', 'warehouse', 2, 40, 5000, 5000, 40),

    -- Nodos Alemania
    ('NODE_DE_BER_CITADEL', 'DE_BERLIN', 'Palacio de Estado Mayor Berlín', 'capital_citadel', 5, 120, 12000, 12000, 120),
    ('NODE_DE_RUH_FOUNDRY', 'DE_RUHR', 'Complejo Siderúrgico Essen', 'factory', 5, 130, 11000, 11000, 110),
    ('NODE_DE_BAV_MUNITIONS', 'DE_BAVIERA', 'Arsenal Alpino de Precisión', 'factory', 3, 80, 8000, 8000, 70),

    -- Nodos USA
    ('NODE_US_WAS_CITADEL', 'US_WASHINGTON', 'Búnker del Pentágono', 'capital_citadel', 5, 150, 15000, 15000, 150),
    ('NODE_US_CAL_AEROSPACE', 'US_CALIFORNIA', 'Aeroespacial Mojave', 'factory', 4, 110, 10000, 10000, 95),
    ('NODE_US_TEX_REFINERY', 'US_TEXAS', 'Complejo Petroquímico Houston', 'refinery', 4, 115, 10500, 10500, 100),

    -- Nodos Japón
    ('NODE_JP_TOK_CITADEL', 'JP_TOKYO', 'Sede Imperial de Ciberdefensa', 'capital_citadel', 5, 140, 14000, 14000, 140),
    ('NODE_JP_OSA_CHIPS', 'JP_OSAKA', 'Sala Limpia Cuántica Kansai', 'factory', 4, 105, 9500, 9500, 90),

    -- Nodos Egipto
    ('NODE_EG_CAI_CITADEL', 'EG_CAIRO', 'Fortaleza Al-Qahira', 'capital_citadel', 5, 120, 12000, 12000, 120),
    ('NODE_EG_SIN_LOCKS', 'EG_SINAI', 'Esclusas del Canal de Suez', 'fortress', 5, 130, 13000, 13000, 130)
ON CONFLICT (id) DO UPDATE
SET name = EXCLUDED.name,
    defense_level = EXCLUDED.defense_level,
    energy_upkeep = EXCLUDED.energy_upkeep,
    output_per_min = EXCLUDED.output_per_min;

-- Inserción de Estados de Control Territorial en 'territory_control' para todas las provincias
INSERT INTO public.territory_control (
    province_id, controlling_clan_id, controlling_alliance_id, current_tcp, tcp_threshold, status, fortress_level
)
SELECT 
    p.id,
    NULL,
    NULL,
    10000,
    10000,
    'stable',
    CASE WHEN p.is_capital THEN 5 ELSE 2 END
FROM public.world_provinces p
ON CONFLICT (province_id) DO NOTHING;

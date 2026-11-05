-- ==============================================================================
-- MIGRACIÓN 26: GEOTACTICS ALICE ENGINE & TEATRO VENEZUELA (v0.0.1-alfa)
-- ==============================================================================
-- Proyecto: GEOTACTICS: ONLINE (v0.0.1-alfa)
-- Especificación: docs/00_GEOTACTICS_ONLINE_MASTER_SPEC.md & docs/MIGRATION_AND_LEGACY_PURGE_PLAN.md
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. ACTUALIZAR / ASEGURAR PAÍSES DEL TEATRO (world_countries)
-- ------------------------------------------------------------------------------
INSERT INTO public.world_countries (iso_code, name, continent, coordinates, defense_doctrine)
VALUES
    ('VE', 'República de Venezuela', 'SA', '{"lat": 10.4806, "lng": -66.9036}'::jsonb, 'fortress'),
    ('CO', 'República de Colombia', 'SA', '{"lat": 4.7110, "lng": -74.0721}'::jsonb, 'mobile'),
    ('BR', 'República Federativa del Brasil', 'SA', '{"lat": -15.7975, "lng": -47.8919}'::jsonb, 'heavy_armor'),
    ('GY', 'República Cooperativa de Guyana', 'SA', '{"lat": 6.8013, "lng": -58.1551}'::jsonb, 'balanced'),
    ('TT', 'República de Trinidad y Tobago', 'SA', '{"lat": 10.6918, "lng": -61.2225}'::jsonb, 'maritime'),
    ('CW', 'Curazao y Antillas Neerlandesas', 'SA', '{"lat": 12.1696, "lng": -68.9900}'::jsonb, 'maritime')
ON CONFLICT (iso_code) DO UPDATE SET
    name = EXCLUDED.name,
    continent = EXCLUDED.continent,
    coordinates = EXCLUDED.coordinates,
    defense_doctrine = EXCLUDED.defense_doctrine;

-- ------------------------------------------------------------------------------
-- 2. TABLA: regions (Topología Geopolítica Alice de GEOTACTICS)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.regions (
    id TEXT PRIMARY KEY,
    country_iso VARCHAR(2) NOT NULL REFERENCES public.world_countries(iso_code) ON DELETE RESTRICT,
    name TEXT NOT NULL,
    biome TEXT NOT NULL CHECK (biome IN ('BIO-PLA', 'BIO-HGH', 'BIO-URB', 'BIO-ARC-ISL', 'BIO-JGL')),
    is_playable BOOLEAN NOT NULL DEFAULT TRUE,
    is_national_capital BOOLEAN NOT NULL DEFAULT FALSE,
    is_capturable BOOLEAN NOT NULL DEFAULT TRUE CHECK (is_capturable = TRUE),
    center_x NUMERIC(5,2) NOT NULL CHECK (center_x >= 0.00 AND center_x <= 100.00),
    center_y NUMERIC(5,2) NOT NULL CHECK (center_y >= 0.00 AND center_y <= 100.00),
    primary_commodity TEXT NOT NULL DEFAULT 'mineral_metalico',
    resource_tier SMALLINT NOT NULL DEFAULT 1 CHECK (resource_tier BETWEEN 1 AND 5),
    base_hourly_yield NUMERIC(10,2) NOT NULL DEFAULT 250.00,
    base_energy_upkeep_ec NUMERIC(10,2) NOT NULL DEFAULT 100.00,
    max_building_slots SMALLINT NOT NULL DEFAULT 10 CHECK (max_building_slots BETWEEN 4 AND 16),
    created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW())
);

CREATE INDEX IF NOT EXISTS idx_regions_country ON public.regions(country_iso);
CREATE INDEX IF NOT EXISTS idx_regions_playable ON public.regions(is_playable);
CREATE INDEX IF NOT EXISTS idx_regions_capital ON public.regions(is_national_capital);

ALTER TABLE public.regions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "regions_read_all" ON public.regions;
CREATE POLICY "regions_read_all" ON public.regions FOR SELECT USING (true);

-- ------------------------------------------------------------------------------
-- 3. TABLA: region_adjacencies (Grafo Topológico Comprimido y Estrechos)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.region_adjacencies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    from_region_id TEXT NOT NULL REFERENCES public.regions(id) ON DELETE CASCADE,
    to_region_id TEXT NOT NULL REFERENCES public.regions(id) ON DELETE CASCADE,
    topology_flags SMALLINT NOT NULL DEFAULT 1 CHECK (topology_flags >= 1 AND topology_flags <= 63),
    choke_controlling_region_id TEXT REFERENCES public.regions(id) ON DELETE SET NULL,
    distance_km REAL NOT NULL DEFAULT 45.0 CHECK (distance_km > 0.0),
    transit_rounds SMALLINT NOT NULL DEFAULT 1 CHECK (transit_rounds >= 1),
    toll_fee_percent NUMERIC(4,2) NOT NULL DEFAULT 0.00 CHECK (toll_fee_percent >= 0.00 AND toll_fee_percent <= 10.00),
    created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW()),
    CONSTRAINT uq_region_adjacency_pair UNIQUE (from_region_id, to_region_id),
    CONSTRAINT chk_no_self_adjacency CHECK (from_region_id <> to_region_id)
);

CREATE INDEX IF NOT EXISTS idx_region_adj_from ON public.region_adjacencies(from_region_id);
CREATE INDEX IF NOT EXISTS idx_region_adj_to ON public.region_adjacencies(to_region_id);
CREATE INDEX IF NOT EXISTS idx_region_adj_choke ON public.region_adjacencies(choke_controlling_region_id);

ALTER TABLE public.region_adjacencies ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "region_adjacencies_read_all" ON public.region_adjacencies;
CREATE POLICY "region_adjacencies_read_all" ON public.region_adjacencies FOR SELECT USING (true);

-- ------------------------------------------------------------------------------
-- 4. TABLA: region_sovereignty (Soberanía Dual: De Jure Owner vs. De Facto Controller)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.region_sovereignty (
    region_id TEXT PRIMARY KEY REFERENCES public.regions(id) ON DELETE CASCADE,
    owner_clan_id UUID REFERENCES public.clans(id) ON DELETE SET NULL,
    controller_clan_id UUID REFERENCES public.clans(id) ON DELETE SET NULL,
    control_points INTEGER NOT NULL DEFAULT 10000 CHECK (control_points >= 0),
    max_control_points INTEGER NOT NULL DEFAULT 10000 CHECK (max_control_points IN (10000, 15000)),
    bunker_level SMALLINT NOT NULL DEFAULT 1 CHECK (bunker_level BETWEEN 1 AND 5),
    status TEXT NOT NULL DEFAULT 'stable' CHECK (status IN ('stable', 'under_siege', 'occupied_grace')),
    customs_escrow_locked BOOLEAN NOT NULL GENERATED ALWAYS AS (status = 'occupied_grace') STORED,
    is_energy_starved BOOLEAN NOT NULL DEFAULT FALSE,
    active_battle_id UUID,
    cooldown_expires_at TIMESTAMPTZ,
    grace_expires_at TIMESTAMPTZ,
    last_tick_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW())
);

CREATE INDEX IF NOT EXISTS idx_region_sov_owner ON public.region_sovereignty(owner_clan_id);
CREATE INDEX IF NOT EXISTS idx_region_sov_controller ON public.region_sovereignty(controller_clan_id);
CREATE INDEX IF NOT EXISTS idx_region_sov_status ON public.region_sovereignty(status);

ALTER TABLE public.region_sovereignty ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "region_sovereignty_read_all" ON public.region_sovereignty;
CREATE POLICY "region_sovereignty_read_all" ON public.region_sovereignty FOR SELECT USING (true);

-- ------------------------------------------------------------------------------
-- 5. TABLA: territorial_battle_sessions (Instancias de Asedio y Handshake 120s)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.territorial_battle_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    region_id TEXT NOT NULL REFERENCES public.regions(id) ON DELETE CASCADE,
    attacker_clan_id UUID NOT NULL REFERENCES public.clans(id) ON DELETE CASCADE,
    defender_clan_id UUID REFERENCES public.clans(id) ON DELETE SET NULL,
    attacker_commander_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    defender_commander_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    mode TEXT NOT NULL DEFAULT 'pve_garrison' CHECK (mode IN ('pve_garrison', 'pvp_realtime')),
    handshake_expires_at TIMESTAMPTZ NOT NULL DEFAULT (TIMEZONE('utc', NOW()) + INTERVAL '120 seconds'),
    status TEXT NOT NULL DEFAULT 'handshake_pending' CHECK (status IN ('handshake_pending', 'in_combat', 'concluded', 'aborted')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW()),
    concluded_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_battle_sessions_region ON public.territorial_battle_sessions(region_id);
CREATE INDEX IF NOT EXISTS idx_battle_sessions_attacker ON public.territorial_battle_sessions(attacker_clan_id);
CREATE INDEX IF NOT EXISTS idx_battle_sessions_defender ON public.territorial_battle_sessions(defender_clan_id);

ALTER TABLE public.territorial_battle_sessions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "battle_sessions_read_all" ON public.territorial_battle_sessions;
CREATE POLICY "battle_sessions_read_all" ON public.territorial_battle_sessions FOR SELECT USING (true);

-- ------------------------------------------------------------------------------
-- 6. RPC: settle_territorial_combat_losses (Pérdida Real de Chasis + 35% Tech Scrap)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.settle_territorial_combat_losses(
  p_user_id UUID,
  p_clan_id UUID,
  p_destroyed_units JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_item RECORD;
  v_hangar_row RECORD;
  v_actual_deducted INTEGER;
  v_total_units_deducted INTEGER := 0;
  v_base_scrap INTEGER := 0;
  v_scrap_recovered INTEGER := 0;
  v_new_scrap_balance INTEGER := 0;
BEGIN
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'p_user_id no puede ser nulo en la liquidación de siniestralidad.';
  END IF;

  IF p_destroyed_units IS NULL OR jsonb_typeof(p_destroyed_units) <> 'array' OR jsonb_array_length(p_destroyed_units) = 0 THEN
    RETURN jsonb_build_object('success', true, 'units_deducted', 0, 'scrap_recovered', 0);
  END IF;

  -- Iterar en orden determinista (unit_code ASC, tier ASC) para prevenir Deadlocks
  FOR v_item IN
    SELECT
      x.unit_code,
      COALESCE(x.tier, 1) AS tier,
      SUM(GREATEST(0, COALESCE(x.quantity, 0)))::INTEGER AS total_lost
    FROM jsonb_to_recordset(p_destroyed_units) AS x(unit_code TEXT, tier INTEGER, quantity INTEGER)
    WHERE x.unit_code IS NOT NULL
      -- Kit F2P inagotable: Infantería T1 y Recon T1 están 100% blindados contra pérdida
      AND NOT (x.unit_code IN ('infantry', 'recon') AND COALESCE(x.tier, 1) = 1)
      AND COALESCE(x.quantity, 0) > 0
    GROUP BY x.unit_code, COALESCE(x.tier, 1)
    ORDER BY x.unit_code ASC, COALESCE(x.tier, 1) ASC
  LOOP
    SELECT id, quantity
    INTO v_hangar_row
    FROM public.user_unit_hangar
    WHERE user_id = p_user_id
      AND unit_code = v_item.unit_code
      AND tier = v_item.tier
    ORDER BY quantity DESC
    LIMIT 1
    FOR UPDATE;

    IF FOUND AND v_hangar_row.quantity > 0 THEN
      v_actual_deducted := LEAST(v_hangar_row.quantity, v_item.total_lost);

      UPDATE public.user_unit_hangar
      SET quantity = quantity - v_actual_deducted,
          updated_at = timezone('utc', now())
      WHERE id = v_hangar_row.id;

      v_total_units_deducted := v_total_units_deducted + v_actual_deducted;
      v_base_scrap := (v_item.tier * 50) * v_actual_deducted;
      v_scrap_recovered := v_scrap_recovered + FLOOR(v_base_scrap * 0.35)::INTEGER;
    END IF;
  END LOOP;

  -- Acreditar chatarra tecnológica en el inventario del usuario
  IF v_scrap_recovered > 0 THEN
    UPDATE public.user_industrial_inventory
    SET tech_scrap = tech_scrap + v_scrap_recovered,
        updated_at = timezone('utc', now())
    WHERE user_id = p_user_id
    RETURNING tech_scrap INTO v_new_scrap_balance;
  ELSE
    SELECT COALESCE(tech_scrap, 0) INTO v_new_scrap_balance
    FROM public.user_industrial_inventory
    WHERE user_id = p_user_id;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'units_deducted', v_total_units_deducted,
    'scrap_recovered', v_scrap_recovered,
    'new_scrap_balance', COALESCE(v_new_scrap_balance, 0),
    'equivalent_steel_plates', FLOOR(v_scrap_recovered / 2.0)::INTEGER
  );
END;
$$;

-- ------------------------------------------------------------------------------
-- 7. SEED: 24 ENTIDADES FEDERALES DE VENEZUELA (is_playable = true)
-- ------------------------------------------------------------------------------
INSERT INTO public.regions (
    id, country_iso, name, biome, is_playable, is_national_capital, is_capturable,
    center_x, center_y, primary_commodity, resource_tier, base_hourly_yield,
    base_energy_upkeep_ec, max_building_slots
) VALUES
    ('REG_VE_01', 'VE', 'Distrito Capital - Caracas', 'BIO-URB', TRUE, TRUE, TRUE, 50.00, 20.00, 'petroquimica_fina', 5, 800.00, 300.00, 16),
    ('REG_VE_02', 'VE', 'Zulia - Maracaibo', 'BIO-PLA', TRUE, FALSE, TRUE, 20.00, 25.00, 'crudo_ligero', 4, 600.00, 250.00, 14),
    ('REG_VE_03', 'VE', 'Bolívar - Ciudad Guayana', 'BIO-HGH', TRUE, FALSE, TRUE, 70.00, 70.00, 'hierro_bauxita', 5, 750.00, 280.00, 14),
    ('REG_VE_04', 'VE', 'Anzoátegui - Barcelona/PLC', 'BIO-PLA', TRUE, FALSE, TRUE, 65.00, 30.00, 'crudo_pesado', 4, 550.00, 220.00, 12),
    ('REG_VE_05', 'VE', 'Carabobo - Valencia/Pto. Cabello', 'BIO-URB', TRUE, FALSE, TRUE, 42.00, 24.00, 'ensamblaje_mec', 4, 580.00, 240.00, 14),
    ('REG_VE_06', 'VE', 'Miranda - Valles del Tuy', 'BIO-PLA', TRUE, FALSE, TRUE, 53.00, 22.00, 'manufactura_ligera', 3, 400.00, 160.00, 10),
    ('REG_VE_07', 'VE', 'Lara - Barquisimeto', 'BIO-PLA', TRUE, FALSE, TRUE, 34.00, 28.00, 'nudo_ferroviario', 3, 420.00, 170.00, 12),
    ('REG_VE_08', 'VE', 'Aragua - Maracay', 'BIO-URB', TRUE, FALSE, TRUE, 46.00, 23.00, 'blindaje_aereo', 3, 450.00, 180.00, 12),
    ('REG_VE_09', 'VE', 'Táchira - San Cristóbal', 'BIO-HGH', TRUE, FALSE, TRUE, 18.00, 48.00, 'carbon_aduanero', 3, 380.00, 150.00, 10),
    ('REG_VE_10', 'VE', 'Mérida - Cordillera Andina', 'BIO-HGH', TRUE, FALSE, TRUE, 23.00, 42.00, 'silicio_optico', 3, 350.00, 140.00, 8),
    ('REG_VE_11', 'VE', 'Falcón - Paraguaná', 'BIO-PLA', TRUE, FALSE, TRUE, 32.00, 15.00, 'refinacion_crp', 4, 520.00, 210.00, 12),
    ('REG_VE_12', 'VE', 'Monagas - Maturín', 'BIO-PLA', TRUE, FALSE, TRUE, 72.00, 32.00, 'gas_natural', 4, 500.00, 200.00, 10),
    ('REG_VE_13', 'VE', 'Sucre - Cumaná/Golfo de Paria', 'BIO-ARC-ISL', TRUE, FALSE, TRUE, 73.00, 22.00, 'astillero_naval', 3, 420.00, 170.00, 10),
    ('REG_VE_14', 'VE', 'Nueva Esparta - Margarita', 'BIO-ARC-ISL', TRUE, FALSE, TRUE, 68.00, 14.00, 'radar_zonafranca', 2, 300.00, 120.00, 8),
    ('REG_VE_15', 'VE', 'Barinas - Llanos Altos', 'BIO-PLA', TRUE, FALSE, TRUE, 28.00, 46.00, 'agropecuaria_crudo', 3, 380.00, 150.00, 10),
    ('REG_VE_16', 'VE', 'Portuguesa - Acarigua', 'BIO-PLA', TRUE, FALSE, TRUE, 34.00, 38.00, 'biocombustibles', 3, 390.00, 155.00, 10),
    ('REG_VE_17', 'VE', 'Guárico - Calabozo/San Juan', 'BIO-PLA', TRUE, FALSE, TRUE, 48.00, 38.00, 'satelital_canteras', 3, 410.00, 165.00, 10),
    ('REG_VE_18', 'VE', 'Trujillo - Andes Centrales', 'BIO-HGH', TRUE, FALSE, TRUE, 26.00, 35.00, 'silice_cemento', 2, 280.00, 110.00, 8),
    ('REG_VE_19', 'VE', 'Yaracuy - San Felipe', 'BIO-PLA', TRUE, FALSE, TRUE, 38.00, 25.00, 'cobre_fertilizantes', 2, 300.00, 120.00, 8),
    ('REG_VE_20', 'VE', 'Cojedes - San Carlos', 'BIO-PLA', TRUE, FALSE, TRUE, 40.00, 34.00, 'pastizales_roca', 2, 290.00, 115.00, 8),
    ('REG_VE_21', 'VE', 'Apure - San Fernando', 'BIO-PLA', TRUE, FALSE, TRUE, 38.00, 58.00, 'eje_fluvial', 2, 310.00, 125.00, 8),
    ('REG_VE_22', 'VE', 'Delta Amacuro - Caños Orinoco', 'BIO-ARC-ISL', TRUE, FALSE, TRUE, 84.00, 40.00, 'bauxita_delta', 3, 370.00, 150.00, 8),
    ('REG_VE_23', 'VE', 'Amazonas - Puerto Ayacucho', 'BIO-JGL', TRUE, FALSE, TRUE, 45.00, 82.00, 'tierras_raras', 3, 360.00, 140.00, 6),
    ('REG_VE_24', 'VE', 'Guayana Esequiba - Zona Reclamación', 'BIO-JGL', TRUE, FALSE, TRUE, 88.00, 55.00, 'oro_diamantes', 4, 520.00, 200.00, 10)
ON CONFLICT (id) DO UPDATE SET
    country_iso = EXCLUDED.country_iso,
    name = EXCLUDED.name,
    biome = EXCLUDED.biome,
    is_playable = EXCLUDED.is_playable,
    is_national_capital = EXCLUDED.is_national_capital,
    center_x = EXCLUDED.center_x,
    center_y = EXCLUDED.center_y,
    primary_commodity = EXCLUDED.primary_commodity,
    resource_tier = EXCLUDED.resource_tier,
    base_hourly_yield = EXCLUDED.base_hourly_yield,
    base_energy_upkeep_ec = EXCLUDED.base_energy_upkeep_ec,
    max_building_slots = EXCLUDED.max_building_slots;

-- ------------------------------------------------------------------------------
-- 8. SEED: 7 ZONAS DE AMORTIGUACIÓN FRONTERIZA (is_playable = false)
-- ------------------------------------------------------------------------------
INSERT INTO public.regions (
    id, country_iso, name, biome, is_playable, is_national_capital, is_capturable,
    center_x, center_y, primary_commodity, resource_tier, base_hourly_yield,
    base_energy_upkeep_ec, max_building_slots
) VALUES
    ('BUF_CO_01', 'CO', 'Norte de Santander (Cúcuta)', 'BIO-HGH', FALSE, FALSE, TRUE, 12.00, 48.00, 'mineral_metalico', 3, 200.00, 100.00, 8),
    ('BUF_CO_02', 'CO', 'La Guajira (Maicao)', 'BIO-PLA', FALSE, FALSE, TRUE, 15.00, 18.00, 'mineral_metalico', 2, 200.00, 100.00, 8),
    ('BUF_CO_03', 'CO', 'Arauca (Arauquita)', 'BIO-PLA', FALSE, FALSE, TRUE, 30.00, 62.00, 'mineral_metalico', 2, 200.00, 100.00, 8),
    ('BUF_BR_01', 'BR', 'Roraima (Pacaraima / Boa Vista)', 'BIO-JGL', FALSE, FALSE, TRUE, 68.00, 88.00, 'tierras_raras', 3, 200.00, 100.00, 8),
    ('BUF_GY_01', 'GY', 'Demerara (Georgetown)', 'BIO-PLA', FALSE, FALSE, TRUE, 96.00, 52.00, 'bauxita_delta', 3, 200.00, 100.00, 8),
    ('BUF_TT_01', 'TT', 'Trinidad & Tobago', 'BIO-ARC-ISL', FALSE, FALSE, TRUE, 80.00, 18.00, 'astillero_naval', 3, 200.00, 100.00, 8),
    ('BUF_CW_01', 'CW', 'Antillas Neerlandesas (Curazao/Aruba)', 'BIO-ARC-ISL', FALSE, FALSE, TRUE, 38.00, 8.00, 'radar_zonafranca', 2, 200.00, 100.00, 8)
ON CONFLICT (id) DO UPDATE SET
    country_iso = EXCLUDED.country_iso,
    name = EXCLUDED.name,
    biome = EXCLUDED.biome,
    is_playable = EXCLUDED.is_playable,
    is_national_capital = EXCLUDED.is_national_capital;

-- ------------------------------------------------------------------------------
-- 9. SEED: ADYACENCIAS TOPOLÓGICAS Y ESTRECHOS ESTRATÉGICOS
-- ------------------------------------------------------------------------------
-- Bandera binaria:
-- 1 = land_open (terrestre)
-- 2 = national_border (frontera internacional)
-- 4 = coastal (anfibio/marítimo)
-- 16 = strait_choke (estrecho estratégico con peaje)
-- 32 = river_crossing (cruce fluvial defendible)

INSERT INTO public.region_adjacencies (from_region_id, to_region_id, topology_flags, choke_controlling_region_id, distance_km, transit_rounds, toll_fee_percent)
VALUES
    -- Nudo Capital Central
    ('REG_VE_01', 'REG_VE_06', 1, NULL, 25.0, 1, 0.00), -- Caracas <-> Miranda
    ('REG_VE_01', 'REG_VE_08', 1, NULL, 45.0, 1, 0.00), -- Caracas <-> Aragua
    ('REG_VE_08', 'REG_VE_05', 1, NULL, 50.0, 1, 0.00), -- Aragua <-> Carabobo
    ('REG_VE_08', 'REG_VE_17', 1, NULL, 75.0, 1, 0.00), -- Aragua <-> Guárico
    ('REG_VE_06', 'REG_VE_17', 1, NULL, 80.0, 1, 0.00), -- Miranda <-> Guárico
    ('REG_VE_06', 'REG_VE_04', 1, NULL, 120.0, 1, 0.00), -- Miranda <-> Anzoátegui

    -- Centro-Occidente
    ('REG_VE_05', 'REG_VE_19', 1, NULL, 45.0, 1, 0.00), -- Carabobo <-> Yaracuy
    ('REG_VE_05', 'REG_VE_20', 1, NULL, 55.0, 1, 0.00), -- Carabobo <-> Cojedes
    ('REG_VE_19', 'REG_VE_07', 1, NULL, 40.0, 1, 0.00), -- Yaracuy <-> Lara
    ('REG_VE_19', 'REG_VE_11', 1, NULL, 90.0, 1, 0.00), -- Yaracuy <-> Falcón
    ('REG_VE_07', 'REG_VE_16', 1, NULL, 60.0, 1, 0.00), -- Lara <-> Portuguesa
    ('REG_VE_07', 'REG_VE_18', 1, NULL, 70.0, 1, 0.00), -- Lara <-> Trujillo
    ('REG_VE_07', 'REG_VE_11', 1, NULL, 110.0, 1, 0.00), -- Lara <-> Falcón

    -- Noroccidente y Lago de Maracaibo (CHK-MARACAIBO)
    ('REG_VE_11', 'REG_VE_02', 20, 'REG_VE_02', 95.0, 1, 5.00), -- Falcón <-> Zulia (Estrecho Lago Maracaibo CHK-MARACAIBO)
    ('REG_VE_02', 'REG_VE_18', 1, NULL, 85.0, 1, 0.00), -- Zulia <-> Trujillo
    ('REG_VE_02', 'REG_VE_10', 1, NULL, 110.0, 1, 0.00), -- Zulia <-> Mérida
    ('REG_VE_02', 'REG_VE_09', 1, NULL, 140.0, 1, 0.00), -- Zulia <-> Táchira

    -- Eje Andino
    ('REG_VE_18', 'REG_VE_10', 1, NULL, 50.0, 1, 0.00), -- Trujillo <-> Mérida
    ('REG_VE_18', 'REG_VE_15', 1, NULL, 80.0, 1, 0.00), -- Trujillo <-> Barinas
    ('REG_VE_10', 'REG_VE_09', 1, NULL, 65.0, 1, 0.00), -- Mérida <-> Táchira
    ('REG_VE_10', 'REG_VE_15', 1, NULL, 75.0, 1, 0.00), -- Mérida <-> Barinas
    ('REG_VE_09', 'REG_VE_15', 1, NULL, 90.0, 1, 0.00), -- Táchira <-> Barinas

    -- Llanos Occidentales y Centrales
    ('REG_VE_16', 'REG_VE_20', 1, NULL, 50.0, 1, 0.00), -- Portuguesa <-> Cojedes
    ('REG_VE_16', 'REG_VE_15', 1, NULL, 65.0, 1, 0.00), -- Portuguesa <-> Barinas
    ('REG_VE_20', 'REG_VE_17', 1, NULL, 70.0, 1, 0.00), -- Cojedes <-> Guárico
    ('REG_VE_15', 'REG_VE_21', 33, NULL, 110.0, 1, 0.00), -- Barinas <-> Apure (Cruce Río Apure)
    ('REG_VE_17', 'REG_VE_21', 33, NULL, 95.0, 1, 0.00), -- Guárico <-> Apure (Cruce Río Apure)
    ('REG_VE_17', 'REG_VE_04', 1, NULL, 130.0, 1, 0.00), -- Guárico <-> Anzoátegui
    ('REG_VE_17', 'REG_VE_03', 33, NULL, 150.0, 1, 0.00), -- Guárico <-> Bolívar (Cruce Río Orinoco)

    -- Oriente, Sur y Delta
    ('REG_VE_04', 'REG_VE_12', 1, NULL, 70.0, 1, 0.00), -- Anzoátegui <-> Monagas
    ('REG_VE_04', 'REG_VE_13', 1, NULL, 85.0, 1, 0.00), -- Anzoátegui <-> Sucre
    ('REG_VE_04', 'REG_VE_03', 33, NULL, 90.0, 1, 0.00), -- Anzoátegui <-> Bolívar (Puente Angostura / Orinoco)
    ('REG_VE_12', 'REG_VE_13', 1, NULL, 65.0, 1, 0.00), -- Monagas <-> Sucre
    ('REG_VE_12', 'REG_VE_22', 1, NULL, 75.0, 1, 0.00), -- Monagas <-> Delta Amacuro
    ('REG_VE_12', 'REG_VE_03', 33, NULL, 85.0, 1, 0.00), -- Monagas <-> Bolívar
    ('REG_VE_13', 'REG_VE_14', 4, NULL, 40.0, 1, 0.00), -- Sucre <-> Nueva Esparta (Enlace marítimo)
    ('REG_VE_22', 'REG_VE_03', 1, NULL, 95.0, 1, 0.00), -- Delta Amacuro <-> Bolívar
    ('REG_VE_22', 'REG_VE_24', 1, NULL, 130.0, 1, 0.00), -- Delta Amacuro <-> Guayana Esequiba
    ('REG_VE_03', 'REG_VE_24', 1, NULL, 160.0, 1, 0.00), -- Bolívar <-> Guayana Esequiba
    ('REG_VE_03', 'REG_VE_23', 1, NULL, 180.0, 1, 0.00), -- Bolívar <-> Amazonas
    ('REG_VE_21', 'REG_VE_23', 33, NULL, 140.0, 1, 0.00), -- Apure <-> Amazonas (Cruce Río Orinoco Medio)

    -- Adyacencias Internacionales / Zonas de Amortiguación
    ('REG_VE_09', 'BUF_CO_01', 3, NULL, 25.0, 1, 0.00), -- Táchira <-> Cúcuta (Frontera internacional)
    ('REG_VE_02', 'BUF_CO_02', 3, NULL, 40.0, 1, 0.00), -- Zulia <-> Maicao (Frontera internacional)
    ('REG_VE_21', 'BUF_CO_03', 3, NULL, 30.0, 1, 0.00), -- Apure <-> Arauca (Frontera internacional)
    ('REG_VE_03', 'BUF_BR_01', 3, NULL, 80.0, 1, 0.00), -- Bolívar <-> Pacaraima / Roraima (Frontera Brasil)
    ('REG_VE_24', 'BUF_GY_01', 3, NULL, 90.0, 1, 0.00), -- Guayana Esequiba <-> Demerara
    ('REG_VE_13', 'BUF_TT_01', 20, 'REG_VE_13', 45.0, 1, 4.00), -- Sucre <-> Trinidad (Estrecho Bocas del Dragón CHK-PARIA)
    ('REG_VE_11', 'BUF_CW_01', 4, NULL, 70.0, 1, 0.00) -- Falcón <-> Curazao
ON CONFLICT (from_region_id, to_region_id) DO UPDATE SET
    topology_flags = EXCLUDED.topology_flags,
    choke_controlling_region_id = EXCLUDED.choke_controlling_region_id,
    distance_km = EXCLUDED.distance_km,
    transit_rounds = EXCLUDED.transit_rounds,
    toll_fee_percent = EXCLUDED.toll_fee_percent;

-- ------------------------------------------------------------------------------
-- 10. SEED: SOBERANÍA INICIAL PARA LAS 31 REGIONES (region_sovereignty)
-- ------------------------------------------------------------------------------
INSERT INTO public.region_sovereignty (
    region_id, owner_clan_id, controller_clan_id, control_points,
    max_control_points, bunker_level, status, is_energy_starved
)
SELECT
    r.id,
    NULL,
    NULL,
    CASE WHEN r.is_national_capital THEN 15000 ELSE 10000 END,
    CASE WHEN r.is_national_capital THEN 15000 ELSE 10000 END,
    CASE WHEN r.is_national_capital THEN 3 ELSE 1 END,
    'stable',
    FALSE
FROM public.regions r
ON CONFLICT (region_id) DO UPDATE SET
    control_points = EXCLUDED.control_points,
    max_control_points = EXCLUDED.max_control_points,
    bunker_level = EXCLUDED.bunker_level,
    status = EXCLUDED.status;

-- ------------------------------------------------------------------------------
-- 11. SINCRONIZACIÓN DE COMPATIBILIDAD CON world_provinces
-- ------------------------------------------------------------------------------
INSERT INTO public.world_provinces (
    id, country_iso, name, is_capital, is_capturable, base_terrain,
    native_weather, resource_multiplier, building_slots, pos_x, pos_y, width, height
)
SELECT
    r.id,
    r.country_iso,
    r.name,
    r.is_national_capital,
    r.is_capturable,
    CASE 
        WHEN r.biome = 'BIO-URB' THEN 'plains'
        WHEN r.biome = 'BIO-HGH' THEN 'mountain'
        WHEN r.biome = 'BIO-ARC-ISL' THEN 'archipelago'
        WHEN r.biome = 'BIO-JGL' THEN 'forest'
        ELSE 'plains'
    END,
    'clear',
    CASE WHEN r.is_national_capital THEN 2.00 ELSE 1.00 END,
    r.max_building_slots,
    r.center_x,
    r.center_y,
    6.00,
    5.00
FROM public.regions r
ON CONFLICT (id) DO UPDATE SET
    country_iso = EXCLUDED.country_iso,
    name = EXCLUDED.name,
    is_capital = EXCLUDED.is_capital,
    is_capturable = EXCLUDED.is_capturable,
    building_slots = EXCLUDED.building_slots,
    pos_x = EXCLUDED.pos_x,
    pos_y = EXCLUDED.pos_y;

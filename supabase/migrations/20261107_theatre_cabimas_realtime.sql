-- ==============================================================================
-- MIGRACIÓN CANÓNICA: PERSISTENCIA REALTIME Y TEATRO OPERACIONAL CABIMAS (REG_VE_02)
-- ==============================================================================
-- Especificación: docs/DATABASE_ARCHITECTURE_AUDIT.md & docs/04_MASTER_DATABASE_AND_SECURITY_SPEC.md
-- Tablas:
--   1. public.tactical_spatial_deployments (Unidades militares desplegadas en celdas O(1))
--   2. public.tactical_fief_constructions (Estructuras in-situ en feudos y vías)
--   3. public.region_operational_state (Telemetría viva y control del teatro REG_VE_02)
-- Publicación Realtime: suscrita a 'supabase_realtime' con CDC de alta fidelidad
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. TABLA: tactical_spatial_deployments (Celdas Espaciales 20m O(1))
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.tactical_spatial_deployments (
    id VARCHAR(64) PRIMARY KEY,
    region_id TEXT NOT NULL REFERENCES public.regions(id) ON DELETE CASCADE,
    cell_key VARCHAR(64) NOT NULL,
    sector_x INTEGER NOT NULL,
    sector_y INTEGER NOT NULL,
    cell_x INTEGER NOT NULL,
    cell_y INTEGER NOT NULL,
    lat NUMERIC(9,6) NOT NULL,
    lng NUMERIC(9,6) NOT NULL,
    unit_code VARCHAR(32) NOT NULL,
    unit_name VARCHAR(64) NOT NULL,
    clan_id VARCHAR(64) NOT NULL,
    clan_tag VARCHAR(16) NOT NULL,
    faction_id VARCHAR(32) NOT NULL,
    callsign VARCHAR(64) NOT NULL,
    tier SMALLINT NOT NULL DEFAULT 1 CHECK (tier BETWEEN 1 AND 5),
    hp SMALLINT NOT NULL DEFAULT 100 CHECK (hp >= 0 AND hp <= 100),
    max_hp SMALLINT NOT NULL DEFAULT 100 CHECK (max_hp > 0),
    status VARCHAR(24) NOT NULL DEFAULT 'holding' CHECK (status IN ('patrol', 'holding', 'in_transit', 'combat')),
    color_hex VARCHAR(10) NOT NULL DEFAULT '#1D4ED8',
    deployed_by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    CONSTRAINT uq_spatial_cell_deployment UNIQUE (region_id, cell_key)
);

CREATE INDEX IF NOT EXISTS idx_spatial_dep_region ON public.tactical_spatial_deployments(region_id);
CREATE INDEX IF NOT EXISTS idx_spatial_dep_cell_key ON public.tactical_spatial_deployments(cell_key);
CREATE INDEX IF NOT EXISTS idx_spatial_dep_clan ON public.tactical_spatial_deployments(clan_id);
CREATE INDEX IF NOT EXISTS idx_spatial_dep_faction ON public.tactical_spatial_deployments(faction_id);

ALTER TABLE public.tactical_spatial_deployments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "spatial_dep_public_read" ON public.tactical_spatial_deployments;
CREATE POLICY "spatial_dep_public_read"
    ON public.tactical_spatial_deployments
    FOR SELECT
    USING (true);

DROP POLICY IF EXISTS "spatial_dep_auth_insert_update" ON public.tactical_spatial_deployments;
CREATE POLICY "spatial_dep_auth_insert_update"
    ON public.tactical_spatial_deployments
    FOR ALL
    TO authenticated
    USING (auth.uid() IS NOT NULL)
    WITH CHECK (auth.uid() IS NOT NULL);

-- ------------------------------------------------------------------------------
-- 2. TABLA: tactical_fief_constructions (Construcciones In-Situ)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.tactical_fief_constructions (
    id VARCHAR(64) PRIMARY KEY,
    fief_id VARCHAR(64) NOT NULL,
    region_id TEXT NOT NULL REFERENCES public.regions(id) ON DELETE CASCADE,
    cell_key VARCHAR(64) NOT NULL,
    sector_x INTEGER NOT NULL,
    sector_y INTEGER NOT NULL,
    cell_x INTEGER NOT NULL,
    cell_y INTEGER NOT NULL,
    lat NUMERIC(9,6) NOT NULL,
    lng NUMERIC(9,6) NOT NULL,
    building_type VARCHAR(32) NOT NULL,
    clan_id VARCHAR(64) NOT NULL,
    adjacent_road_segment_id VARCHAR(64),
    level SMALLINT NOT NULL DEFAULT 1 CHECK (level BETWEEN 1 AND 5),
    current_hp INTEGER NOT NULL DEFAULT 10000 CHECK (current_hp >= 0),
    max_hp INTEGER NOT NULL DEFAULT 10000 CHECK (max_hp > 0),
    hourly_upkeep_ec INTEGER NOT NULL DEFAULT 100 CHECK (hourly_upkeep_ec >= 0),
    constructed_by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    CONSTRAINT uq_spatial_cell_construction UNIQUE (region_id, cell_key)
);

CREATE INDEX IF NOT EXISTS idx_fief_const_region ON public.tactical_fief_constructions(region_id);
CREATE INDEX IF NOT EXISTS idx_fief_const_cell_key ON public.tactical_fief_constructions(cell_key);
CREATE INDEX IF NOT EXISTS idx_fief_const_clan ON public.tactical_fief_constructions(clan_id);
CREATE INDEX IF NOT EXISTS idx_fief_const_fief ON public.tactical_fief_constructions(fief_id);

ALTER TABLE public.tactical_fief_constructions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "fief_const_public_read" ON public.tactical_fief_constructions;
CREATE POLICY "fief_const_public_read"
    ON public.tactical_fief_constructions
    FOR SELECT
    USING (true);

DROP POLICY IF EXISTS "fief_const_auth_insert_update" ON public.tactical_fief_constructions;
CREATE POLICY "fief_const_auth_insert_update"
    ON public.tactical_fief_constructions
    FOR ALL
    TO authenticated
    USING (auth.uid() IS NOT NULL)
    WITH CHECK (auth.uid() IS NOT NULL);

-- ------------------------------------------------------------------------------
-- 3. TABLA: region_operational_state (Telemetría de Teatro de Operaciones)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.region_operational_state (
    region_id TEXT PRIMARY KEY REFERENCES public.regions(id) ON DELETE CASCADE,
    controlling_faction_id VARCHAR(32) NOT NULL DEFAULT 'blue_moon',
    controlling_clan_id VARCHAR(64) NOT NULL DEFAULT 'clan-ferro',
    tcp_current INTEGER NOT NULL DEFAULT 10000 CHECK (tcp_current >= 0 AND tcp_current <= 15000),
    tcp_max INTEGER NOT NULL DEFAULT 10000,
    bunker_level SMALLINT NOT NULL DEFAULT 4 CHECK (bunker_level BETWEEN 1 AND 5),
    active_deployments_count INTEGER NOT NULL DEFAULT 0,
    active_buildings_count INTEGER NOT NULL DEFAULT 0,
    operational_status VARCHAR(24) NOT NULL DEFAULT 'stable' CHECK (operational_status IN ('stable', 'under_siege', 'contested', 'liberated')),
    last_heartbeat_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS idx_region_op_faction ON public.region_operational_state(controlling_faction_id);
CREATE INDEX IF NOT EXISTS idx_region_op_status ON public.region_operational_state(operational_status);

ALTER TABLE public.region_operational_state ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "region_op_public_read" ON public.region_operational_state;
CREATE POLICY "region_op_public_read"
    ON public.region_operational_state
    FOR SELECT
    USING (true);

DROP POLICY IF EXISTS "region_op_auth_update" ON public.region_operational_state;
CREATE POLICY "region_op_auth_update"
    ON public.region_operational_state
    FOR ALL
    TO authenticated
    USING (auth.uid() IS NOT NULL)
    WITH CHECK (auth.uid() IS NOT NULL);

-- ------------------------------------------------------------------------------
-- 4. REPLICA IDENTITY FULL Y ALTA EN SUPABASE_REALTIME
-- ------------------------------------------------------------------------------
ALTER TABLE public.tactical_spatial_deployments REPLICA IDENTITY FULL;
ALTER TABLE public.tactical_fief_constructions REPLICA IDENTITY FULL;
ALTER TABLE public.region_operational_state REPLICA IDENTITY FULL;
ALTER TABLE public.state_sovereignty REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables 
      WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'state_sovereignty'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.state_sovereignty;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables 
      WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'tactical_spatial_deployments'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.tactical_spatial_deployments;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables 
      WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'tactical_fief_constructions'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.tactical_fief_constructions;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables 
      WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'region_operational_state'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.region_operational_state;
    END IF;
  END IF;
END $$;

-- ------------------------------------------------------------------------------
-- 5. SEED DETERMINISTA: TEATRO CABIMAS / ZULIA (REG_VE_02)
-- ------------------------------------------------------------------------------
-- Asegurar Soberanía de REG_VE_02
INSERT INTO public.state_sovereignty (
    state_id,
    country_id,
    canonical_country_name,
    custom_country_name,
    canonical_state_name,
    custom_state_name,
    controlling_faction_id,
    controlling_clan_id,
    tcp_current,
    tcp_max,
    gdp_war_credits_per_hour,
    defense_level,
    custom_motto,
    sovereign_proclamation
) VALUES (
    'REG_VE_02',
    'COUNTRY_VEN',
    'República de Venezuela',
    'Hegemonía Petrolera de Maracaibo',
    'Zulia',
    'Estado Zulia (Teatro Cabimas)',
    'blue_moon',
    'clan-ferro',
    10000,
    10000,
    12400,
    4,
    'Acero Frío y Petróleo Pesado',
    'El Lago de Maracaibo y la Costa Oriental operan bajo jurisdicción militar del Clan Ferro.'
) ON CONFLICT (state_id) DO UPDATE SET
    custom_country_name = EXCLUDED.custom_country_name,
    custom_state_name = EXCLUDED.custom_state_name,
    controlling_faction_id = EXCLUDED.controlling_faction_id,
    controlling_clan_id = EXCLUDED.controlling_clan_id,
    tcp_current = EXCLUDED.tcp_current,
    tcp_max = EXCLUDED.tcp_max,
    gdp_war_credits_per_hour = EXCLUDED.gdp_war_credits_per_hour,
    defense_level = EXCLUDED.defense_level,
    custom_motto = EXCLUDED.custom_motto,
    sovereign_proclamation = EXCLUDED.sovereign_proclamation,
    updated_at = timezone('utc', now());

-- Estado operacional de REG_VE_02
INSERT INTO public.region_operational_state (
    region_id,
    controlling_faction_id,
    controlling_clan_id,
    tcp_current,
    tcp_max,
    bunker_level,
    active_deployments_count,
    active_buildings_count,
    operational_status
) VALUES (
    'REG_VE_02',
    'blue_moon',
    'clan-ferro',
    10000,
    10000,
    4,
    2,
    1,
    'stable'
) ON CONFLICT (region_id) DO UPDATE SET
    controlling_faction_id = EXCLUDED.controlling_faction_id,
    controlling_clan_id = EXCLUDED.controlling_clan_id,
    tcp_current = EXCLUDED.tcp_current,
    bunker_level = EXCLUDED.bunker_level,
    operational_status = EXCLUDED.operational_status,
    updated_at = timezone('utc', now());

-- Semilla de Despliegue Espacial: División Blindada Ferro A-1 (Cabimas: Eje Terminal La Salina)
INSERT INTO public.tactical_spatial_deployments (
    id,
    region_id,
    cell_key,
    sector_x,
    sector_y,
    cell_x,
    cell_y,
    lat,
    lng,
    unit_code,
    unit_name,
    clan_id,
    clan_tag,
    faction_id,
    callsign,
    tier,
    hp,
    max_hp,
    status,
    color_hex
) VALUES (
    'unit-cab-01',
    'REG_VE_02',
    '9880_15432_0_11',
    9880,
    15432,
    0,
    11,
    10.395000,
    -71.458000,
    'md_tank',
    'División Blindada Ferro A-1',
    'clan-ferro',
    'FERR',
    'blue_moon',
    'FERRO-TITÁN-01',
    2,
    100,
    100,
    'holding',
    '#1D4ED8'
) ON CONFLICT (region_id, cell_key) DO UPDATE SET
    hp = EXCLUDED.hp,
    status = EXCLUDED.status,
    updated_at = timezone('utc', now());

-- Semilla de Despliegue Espacial: Patrulla Ligera de Reconocimiento (Cabimas: Intersección Av. Intercomunal con Carretera H)
INSERT INTO public.tactical_spatial_deployments (
    id,
    region_id,
    cell_key,
    sector_x,
    sector_y,
    cell_x,
    cell_y,
    lat,
    lng,
    unit_code,
    unit_name,
    clan_id,
    clan_tag,
    faction_id,
    callsign,
    tier,
    hp,
    max_hp,
    status,
    color_hex
) VALUES (
    'unit-cab-02',
    'REG_VE_02',
    '9880_15433_4_18',
    9880,
    15433,
    4,
    18,
    10.405000,
    -71.454000,
    'recon',
    'Patrulla Ligera de Reconocimiento',
    'clan-ferro',
    'FERR',
    'blue_moon',
    'HALCÓN-SALINA',
    1,
    85,
    100,
    'patrol',
    '#3B82F6'
) ON CONFLICT (region_id, cell_key) DO UPDATE SET
    hp = EXCLUDED.hp,
    status = EXCLUDED.status,
    updated_at = timezone('utc', now());

-- Semilla de Construcción In-Situ: Puerto y Terminal La Salina
INSERT INTO public.tactical_fief_constructions (
    id,
    fief_id,
    region_id,
    cell_key,
    sector_x,
    sector_y,
    cell_x,
    cell_y,
    lat,
    lng,
    building_type,
    clan_id,
    adjacent_road_segment_id,
    level,
    current_hp,
    max_hp,
    hourly_upkeep_ec
) VALUES (
    'bld-salina-seaport',
    'fief-cabimas-salina',
    'REG_VE_02',
    '9880_15432_0_11_bld',
    9880,
    15432,
    0,
    11,
    10.395000,
    -71.458000,
    'seaport_terminal',
    'clan-ferro',
    'seg-intercomunal-ambrosio-salina',
    3,
    12000,
    12000,
    450
) ON CONFLICT (region_id, cell_key) DO UPDATE SET
    current_hp = EXCLUDED.current_hp,
    level = EXCLUDED.level,
    updated_at = timezone('utc', now());

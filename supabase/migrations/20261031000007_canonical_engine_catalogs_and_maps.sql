-- ============================================================================
-- MIGRACIÓN 7: CATÁLOGOS CANÓNICOS DEL MOTOR, 23 UNIDADES, TERRENOS Y MAPAS
-- Proyecto: Tactical Command: Wars of Legacy
-- Fecha: 2026-10-31
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. TABLA: terrain_catalog
-- Catálogo de 19 terrenos y sus costes canónicos de movimiento por tracción
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.terrain_catalog (
    id VARCHAR(24) PRIMARY KEY,
    display_name VARCHAR(64) NOT NULL,
    defense_stars SMALLINT NOT NULL DEFAULT 0 CHECK (defense_stars BETWEEN 0 AND 4),
    generates_funds INTEGER NOT NULL DEFAULT 0 CHECK (generates_funds >= 0),
    is_capturable BOOLEAN NOT NULL DEFAULT false,
    heals_land BOOLEAN NOT NULL DEFAULT false,
    heals_air BOOLEAN NOT NULL DEFAULT false,
    heals_sea BOOLEAN NOT NULL DEFAULT false,
    provides_fow_cover BOOLEAN NOT NULL DEFAULT false,
    infantry_vision_bonus SMALLINT NOT NULL DEFAULT 0,
    is_destructible BOOLEAN NOT NULL DEFAULT false,
    default_hp SMALLINT DEFAULT NULL,
    move_cost_foot SMALLINT DEFAULT 1,
    move_cost_mech SMALLINT DEFAULT 1,
    move_cost_wheels SMALLINT DEFAULT 1,
    move_cost_treads SMALLINT DEFAULT 1,
    move_cost_air SMALLINT DEFAULT 1,
    move_cost_sea SMALLINT DEFAULT NULL,
    move_cost_pipe SMALLINT DEFAULT NULL
);

ALTER TABLE public.terrain_catalog ENABLE ROW LEVEL SECURITY;
CREATE POLICY "terrain_catalog_select_all" ON public.terrain_catalog FOR SELECT USING (true);

INSERT INTO public.terrain_catalog (
    id, display_name, defense_stars, generates_funds, is_capturable,
    heals_land, heals_air, heals_sea, provides_fow_cover, infantry_vision_bonus,
    is_destructible, default_hp, move_cost_foot, move_cost_mech, move_cost_wheels,
    move_cost_treads, move_cost_air, move_cost_sea, move_cost_pipe
) VALUES
('plains', 'Llanura', 1, 0, false, false, false, false, false, 0, false, NULL, 1, 1, 2, 1, 1, NULL, NULL),
('forest', 'Bosque', 2, 0, false, false, false, false, true, 0, false, NULL, 1, 1, 3, 2, 1, NULL, NULL),
('mountain', 'Montaña', 4, 0, false, false, false, false, false, 3, false, NULL, 2, 1, NULL, NULL, 1, NULL, NULL),
('road', 'Carretera', 0, 0, false, false, false, false, false, 0, false, NULL, 1, 1, 1, 1, 1, NULL, NULL),
('river', 'Río', 0, 0, false, false, false, false, false, 0, false, NULL, 2, 1, NULL, NULL, 1, NULL, NULL),
('city', 'Ciudad', 3, 1000, true, true, false, false, false, 0, false, 20, 1, 1, 1, 1, 1, NULL, NULL),
('factory', 'Fábrica Militar', 3, 1000, true, true, false, false, false, 0, false, 20, 1, 1, 1, 1, 1, NULL, NULL),
('airport', 'Base Aérea', 3, 1000, true, false, true, false, false, 0, false, 20, 1, 1, 1, 1, 1, NULL, NULL),
('port', 'Puerto Naval', 3, 1000, true, false, false, true, false, 0, false, 20, 1, 1, 1, 1, 1, 1, NULL),
('hq', 'Cuartel General (HQ)', 4, 1000, true, true, false, false, false, 0, false, 20, 1, 1, 1, 1, 1, NULL, NULL),
('sea', 'Mar Abierto', 0, 0, false, false, false, false, false, 0, false, NULL, NULL, NULL, NULL, NULL, 1, 1, NULL),
('reef', 'Arrecife Coralino', 1, 0, false, false, false, false, true, 0, false, NULL, NULL, NULL, NULL, NULL, 1, 2, NULL),
('shoal', 'Bajío / Playa', 0, 0, false, false, false, false, false, 0, false, NULL, 1, 1, 1, 1, 1, 1, NULL),
('bridge', 'Puente Fluvial', 0, 0, false, false, false, false, false, 0, false, NULL, 1, 1, 1, 1, 1, NULL, NULL),
('commtower', 'Torre de Comunicaciones', 3, 1000, true, false, false, false, false, 0, false, 20, 1, 1, 1, 1, 1, NULL, NULL),
('silo', 'Silo de Misiles', 3, 0, false, false, false, false, false, 0, false, NULL, 1, 1, 1, 1, 1, NULL, NULL),
('lab', 'Laboratorio Táctico', 3, 1000, true, true, false, false, false, 0, false, 20, 1, 1, 1, 1, 1, NULL, NULL),
('pipe', 'Oleoducto Infranqueable', 0, 0, false, false, false, false, false, 0, false, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 1),
('pipe_seam', 'Costura de Oleoducto (Destructible)', 0, 0, false, false, false, false, false, 0, true, 100, NULL, NULL, NULL, NULL, NULL, NULL, 1)
ON CONFLICT (id) DO UPDATE SET
    display_name = EXCLUDED.display_name,
    defense_stars = EXCLUDED.defense_stars,
    generates_funds = EXCLUDED.generates_funds,
    is_capturable = EXCLUDED.is_capturable,
    heals_land = EXCLUDED.heals_land,
    heals_air = EXCLUDED.heals_air,
    heals_sea = EXCLUDED.heals_sea,
    provides_fow_cover = EXCLUDED.provides_fow_cover,
    infantry_vision_bonus = EXCLUDED.infantry_vision_bonus,
    is_destructible = EXCLUDED.is_destructible,
    default_hp = EXCLUDED.default_hp;

-- ----------------------------------------------------------------------------
-- 2. AMPLIACIÓN DE units_catalog A LAS 23 UNIDADES CANÓNICAS
-- ----------------------------------------------------------------------------
ALTER TABLE public.units_catalog
    DROP CONSTRAINT IF EXISTS units_catalog_movement_type_check,
    DROP CONSTRAINT IF EXISTS units_catalog_base_attack_check;

ALTER TABLE public.units_catalog
    ADD COLUMN IF NOT EXISTS production_facility VARCHAR(16) NOT NULL DEFAULT 'factory'
        CHECK (production_facility IN ('factory', 'airport', 'port', 'none')),
    ADD COLUMN IF NOT EXISTS weight_class VARCHAR(24) NOT NULL DEFAULT 'standard'
        CHECK (weight_class IN ('mandatory_infantry', 'light_vehicle', 'direct_combat', 'indirect_fire', 'anti_air', 'air_unit', 'naval_unit', 'super_heavy', 'transport')),
    ADD COLUMN IF NOT EXISTS base_cooldown_turns SMALLINT NOT NULL DEFAULT 0 CHECK (base_cooldown_turns BETWEEN 0 AND 6),
    ADD COLUMN IF NOT EXISTS fuel_burn_per_turn SMALLINT NOT NULL DEFAULT 0 CHECK (fuel_burn_per_turn >= 0),
    ADD COLUMN IF NOT EXISTS fuel_burn_hidden SMALLINT NOT NULL DEFAULT 0 CHECK (fuel_burn_hidden >= 0),
    ADD COLUMN IF NOT EXISTS can_move_and_fire BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN IF NOT EXISTS primary_weapon_name VARCHAR(48) DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS secondary_weapon_name VARCHAR(48) DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS transport_capacity SMALLINT NOT NULL DEFAULT 0 CHECK (transport_capacity BETWEEN 0 AND 2),
    ADD COLUMN IF NOT EXISTS transport_allowed_codes TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    ADD COLUMN IF NOT EXISTS special_actions TEXT[] NOT NULL DEFAULT ARRAY['wait', 'delete']::TEXT[],
    ADD COLUMN IF NOT EXISTS is_awbw_extended BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE public.units_catalog
    ADD CONSTRAINT units_catalog_base_attack_check CHECK (base_attack >= 0),
    ADD CONSTRAINT units_catalog_movement_type_check CHECK (movement_type IN ('foot', 'mech', 'wheels', 'treads', 'air', 'sea', 'pipe'));

INSERT INTO public.units_catalog (
    id, display_name, category, production_facility, weight_class,
    hp_max, base_attack, min_range, max_range, movement_points, movement_type,
    vision_range, production_cost_g, base_cooldown_turns,
    ammo_max, fuel_max, fuel_burn_per_turn, fuel_burn_hidden,
    can_move_and_fire, primary_weapon_name, secondary_weapon_name,
    transport_capacity, transport_allowed_codes, special_actions,
    required_account_level, unlock_cost_credits, is_base_unlocked, is_awbw_extended
) VALUES
-- Las 16 unidades del GDD
('infantry', 'Infantería Ligera', 'infantry', 'factory', 'mandatory_infantry', 10, 55, 1, 1, 3, 'foot', 2, 1000, 0, 0, 99, 0, 0, true, NULL, 'Fusil 9mm', 0, '{}', '{wait,attack,capture,launch_silo,join,load,delete}', 1, 0, true, false),
('mech', 'Infantería Pesada (Bazuca)', 'infantry', 'factory', 'mandatory_infantry', 10, 65, 1, 1, 2, 'mech', 2, 3000, 0, 3, 70, 0, 0, true, 'Bazuca Antitanque', 'Ametralladora', 0, '{}', '{wait,attack,capture,launch_silo,join,load,delete}', 2, 0, true, false),
('recon', 'Blindado de Reconocimiento', 'vehicle', 'factory', 'light_vehicle', 10, 70, 1, 1, 8, 'wheels', 5, 4000, 1, 0, 80, 0, 0, true, NULL, 'Ametralladora Pesada', 0, '{}', '{wait,attack,join,load,delete}', 1, 0, true, false),
('apc', 'Transporte Blindado APC', 'vehicle', 'factory', 'transport', 10, 0, 1, 1, 6, 'treads', 1, 5000, 1, 0, 70, 0, 0, false, NULL, NULL, 1, '{infantry,mech}', '{wait,supply,unload,join,load,delete}', 2, 0, true, false),
('tank_light', 'Tanque Ligero', 'vehicle', 'factory', 'direct_combat', 10, 75, 1, 1, 6, 'treads', 3, 7000, 2, 9, 70, 0, 0, true, 'Cañón 75mm', 'Ametralladora Coaxial', 0, '{}', '{wait,attack,join,load,delete}', 1, 0, true, false),
('tank_medium', 'Tanque Mediano', 'vehicle', 'factory', 'direct_combat', 10, 105, 1, 1, 5, 'treads', 1, 16000, 3, 8, 50, 0, 0, true, 'Cañón Pesado 105mm', 'Ametralladora Coaxial', 0, '{}', '{wait,attack,join,load,delete}', 7, 1200, false, false),
('neotank', 'Neotanque Pesado', 'vehicle', 'factory', 'super_heavy', 10, 125, 1, 1, 6, 'treads', 1, 22000, 4, 9, 99, 0, 0, true, 'Cañón Neofase', 'Ametralladora Pesada', 0, '{}', '{wait,attack,join,load,delete}', 14, 2000, false, false),
('artillery', 'Artillería de Obús Móvil', 'indirect', 'factory', 'indirect_fire', 10, 80, 2, 3, 5, 'treads', 1, 6000, 2, 9, 50, 0, 0, false, 'Obús 155mm', NULL, 0, '{}', '{wait,attack,join,load,delete}', 1, 0, true, false),
('rocket', 'Lanzacohetes de Asedio', 'indirect', 'factory', 'indirect_fire', 10, 95, 3, 5, 5, 'wheels', 1, 15000, 3, 6, 50, 0, 0, false, 'Batería Cohetes', NULL, 0, '{}', '{wait,attack,join,load,delete}', 6, 1000, false, false),
('anti_air', 'Blindado Antiaéreo Vulcano', 'vehicle', 'factory', 'anti_air', 10, 105, 1, 1, 6, 'treads', 2, 8000, 3, 9, 60, 0, 0, true, 'Cañón Vulcano 20mm', NULL, 0, '{}', '{wait,attack,join,load,delete}', 3, 0, true, false),
('missiles', 'Batería Misiles Antiaéreos', 'indirect', 'factory', 'anti_air', 10, 100, 3, 5, 4, 'wheels', 5, 12000, 4, 6, 50, 0, 0, false, 'Misiles Superficie-Aire', NULL, 0, '{}', '{wait,attack,join,load,delete}', 8, 1100, false, false),
('b_copter', 'Helicóptero de Ataque', 'aircraft', 'airport', 'air_unit', 10, 75, 1, 1, 6, 'air', 3, 9000, 3, 6, 99, 2, 2, true, 'Misiles Aire-Tierra', 'Ametralladora', 0, '{}', '{wait,attack,join,load,delete}', 4, 0, true, false),
('t_copter', 'Helicóptero de Transporte', 'aircraft', 'airport', 'transport', 10, 0, 1, 1, 6, 'air', 2, 5000, 1, 0, 99, 2, 2, false, NULL, NULL, 1, '{infantry,mech}', '{wait,unload,join,load,delete}', 4, 0, true, false),
('fighter', 'Caza de Supremacía Aérea', 'aircraft', 'airport', 'anti_air', 10, 100, 1, 1, 9, 'air', 4, 20000, 4, 9, 99, 5, 5, true, 'Misiles Aire-Aire', NULL, 0, '{}', '{wait,attack,join,delete}', 9, 1500, false, false),
('bomber', 'Bombardero Táctico Pesado', 'aircraft', 'airport', 'super_heavy', 10, 110, 1, 1, 7, 'air', 2, 22000, 4, 9, 99, 5, 5, true, 'Bombas Guiadas', NULL, 0, '{}', '{wait,attack,join,delete}', 12, 1800, false, false),
('battleship', 'Acorazado Naval', 'naval', 'port', 'super_heavy', 10, 95, 2, 6, 5, 'sea', 2, 28000, 4, 9, 99, 1, 1, false, 'Batería Naval 16"', NULL, 0, '{}', '{wait,attack,join,delete}', 15, 2500, false, false),
-- 7 Unidades Extendidas de WarsWorld / AWBW ya implementadas en src/engine/
('lander', 'Barcaza de Desembarco', 'naval', 'port', 'transport', 10, 0, 1, 1, 6, 'sea', 1, 12000, 2, 0, 99, 1, 1, false, NULL, NULL, 2, '{infantry,mech,recon,apc,tank_light,tank_medium,neotank,artillery,rocket,anti_air,missiles}', '{wait,unload,join,delete}', 5, 600, true, true),
('cruiser', 'Crucero Antiaéreo / ASW', 'naval', 'port', 'naval_unit', 10, 65, 1, 1, 6, 'sea', 3, 18000, 3, 9, 99, 1, 1, true, 'Misiles ASW', 'Ametralladoras AA', 2, '{b_copter,t_copter}', '{wait,attack,unload,join,delete}', 10, 1400, false, true),
('submarine', 'Submarino Táctico', 'naval', 'port', 'naval_unit', 10, 85, 1, 1, 5, 'sea', 5, 20000, 3, 6, 60, 1, 5, true, 'Torpedos Pesados', NULL, 0, '{}', '{wait,attack,hide,show,join,delete}', 11, 1600, false, true),
('stealth', 'Caza Furtivo (Stealth)', 'aircraft', 'airport', 'super_heavy', 10, 90, 1, 1, 6, 'air', 4, 24000, 4, 6, 60, 5, 8, true, 'Misil Omni-Objetivo', NULL, 0, '{}', '{wait,attack,hide,show,join,delete}', 16, 2200, false, true),
('blackbomb', 'Bomba Voladora Táctica', 'aircraft', 'airport', 'super_heavy', 10, 0, 1, 1, 9, 'air', 1, 25000, 4, 0, 45, 5, 5, false, NULL, NULL, 0, '{}', '{wait,explode,delete}', 18, 2500, false, true),
('blackboat', 'Lancha Táctica de Apoyo', 'naval', 'port', 'transport', 10, 0, 1, 1, 7, 'sea', 1, 7500, 2, 0, 60, 1, 1, false, NULL, NULL, 2, '{infantry,mech}', '{wait,repair,supply,unload,join,delete}', 6, 800, false, true),
('piperunner', 'Artillería de Oleoducto', 'indirect', 'factory', 'indirect_fire', 10, 90, 2, 5, 9, 'pipe', 4, 20000, 4, 9, 99, 0, 0, false, 'Cañón Tubo Asedio', NULL, 0, '{}', '{wait,attack,join,delete}', 15, 2000, false, true)
ON CONFLICT (id) DO UPDATE SET
    display_name = EXCLUDED.display_name,
    category = EXCLUDED.category,
    production_facility = EXCLUDED.production_facility,
    weight_class = EXCLUDED.weight_class,
    base_attack = EXCLUDED.base_attack,
    min_range = EXCLUDED.min_range,
    max_range = EXCLUDED.max_range,
    movement_points = EXCLUDED.movement_points,
    movement_type = EXCLUDED.movement_type,
    vision_range = EXCLUDED.vision_range,
    production_cost_g = EXCLUDED.production_cost_g,
    base_cooldown_turns = EXCLUDED.base_cooldown_turns,
    ammo_max = EXCLUDED.ammo_max,
    fuel_max = EXCLUDED.fuel_max,
    fuel_burn_per_turn = EXCLUDED.fuel_burn_per_turn,
    fuel_burn_hidden = EXCLUDED.fuel_burn_hidden,
    can_move_and_fire = EXCLUDED.can_move_and_fire,
    primary_weapon_name = EXCLUDED.primary_weapon_name,
    secondary_weapon_name = EXCLUDED.secondary_weapon_name,
    transport_capacity = EXCLUDED.transport_capacity,
    transport_allowed_codes = EXCLUDED.transport_allowed_codes,
    special_actions = EXCLUDED.special_actions,
    is_awbw_extended = EXCLUDED.is_awbw_extended;

-- ----------------------------------------------------------------------------
-- 3. TABLA: unit_weapon_damage_matrix
-- Matriz de daño canónico cruzado para cálculo server-authoritative
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.unit_weapon_damage_matrix (
    attacker_unit_id VARCHAR(32) NOT NULL REFERENCES public.units_catalog(id) ON DELETE CASCADE,
    defender_unit_id VARCHAR(32) NOT NULL REFERENCES public.units_catalog(id) ON DELETE CASCADE,
    primary_damage SMALLINT DEFAULT NULL CHECK (primary_damage IS NULL OR primary_damage >= 0),
    secondary_damage SMALLINT DEFAULT NULL CHECK (secondary_damage IS NULL OR secondary_damage >= 0),
    PRIMARY KEY (attacker_unit_id, defender_unit_id)
);

ALTER TABLE public.unit_weapon_damage_matrix ENABLE ROW LEVEL SECURITY;
CREATE POLICY "damage_matrix_select_all" ON public.unit_weapon_damage_matrix FOR SELECT USING (true);

-- ----------------------------------------------------------------------------
-- 4. TABLA: maps
-- Registro oficial de mapas de batalla y compatibilidad AWBW
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.maps (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(128) NOT NULL,
    author_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    author_name VARCHAR(64) NOT NULL DEFAULT 'Tactical Command HQ',
    description TEXT NOT NULL DEFAULT '',
    version INTEGER NOT NULL DEFAULT 1 CHECK (version >= 1),
    width SMALLINT NOT NULL CHECK (width BETWEEN 8 AND 64),
    height SMALLINT NOT NULL CHECK (height BETWEEN 8 AND 64),
    max_players SMALLINT NOT NULL DEFAULT 2 CHECK (max_players BETWEEN 2 AND 16),
    supported_modes TEXT[] NOT NULL DEFAULT ARRAY['blitz_skirmish', 'grand_campaign', 'vs_bot']::TEXT[],
    recommended_mode VARCHAR(24) NOT NULL DEFAULT 'blitz_skirmish',
    awbw_map_id INTEGER UNIQUE DEFAULT NULL,
    raw_tile_csv TEXT NOT NULL DEFAULT '',
    compiled_tiles JSONB NOT NULL DEFAULT '[]'::jsonb,
    starting_units JSONB NOT NULL DEFAULT '[]'::jsonb,
    default_alliances JSONB NOT NULL DEFAULT '{"0": "A", "1": "B"}'::jsonb,
    property_stats JSONB NOT NULL DEFAULT '{}'::jsonb,
    default_rules JSONB NOT NULL DEFAULT '{
        "initialWeather": "clear",
        "weatherType": "clear_only",
        "fogOfWarDefault": false,
        "startingFundsPerPlayer": 1000,
        "incomePerProperty": 1000,
        "unitCapPerPlayer": 15
    }'::jsonb,
    tags TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    is_official BOOLEAN NOT NULL DEFAULT true,
    is_published BOOLEAN NOT NULL DEFAULT true,
    play_count INTEGER NOT NULL DEFAULT 0,
    likes_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.maps ENABLE ROW LEVEL SECURITY;
CREATE POLICY "maps_select_published" ON public.maps FOR SELECT USING (is_published = true);

-- Sembrar los 6 mapas oficiales canónicos
INSERT INTO public.maps (id, name, width, height, max_players, recommended_mode, description, is_official, is_published)
VALUES
('sector_alfa', 'Sector Alfa (Duelo Cerrado)', 16, 16, 2, 'blitz_skirmish', 'Mapa simétrico ultrarrápido diseñado para escaramuzas tácticas Blitz.', true, true),
('caustic_finale', 'Caustic Finale (Valle Cáustico)', 18, 18, 2, 'grand_campaign', 'Mapa canónico con ríos, cuellos de botella y combate combinado.', true, true),
('1v1_issus', 'Llanuras de Issus', 17, 13, 2, 'blitz_skirmish', 'Batalla abierta con amplia maniobra de unidades blindadas y reconocimiento.', true, true),
('dubious_procession', 'Dubious Procession', 25, 20, 2, 'grand_campaign', 'Escenario estratégico con múltiples frentes de fábrica y aeropuertos.', true, true),
('chosin_reservoir', 'Chosin Reservoir', 21, 21, 2, 'grand_campaign', 'Teatro invernal de asedio con lagos congelados y pasos de montaña angostos.', true, true),
('love_and_literature', 'Love & Literature', 29, 23, 2, 'grand_campaign', 'Mapa masivo con despliegue naval, aéreo y de tuberías fortificadas.', true, true)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    width = EXCLUDED.width,
    height = EXCLUDED.height,
    recommended_mode = EXCLUDED.recommended_mode,
    description = EXCLUDED.description;

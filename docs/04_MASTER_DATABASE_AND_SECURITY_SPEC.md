# VOLUMEN 4: ESQUEMA MAESTRO DE BASE DE DATOS Y SEGURIDAD (SUPABASE / POSTGRESQL)
**Documento Canónico Unificado:** `04_MASTER_DATABASE_AND_SECURITY_SPEC.md`  
**Proyecto:** *Tactical Command: Wars of Legacy (GEOTACTICS: ONLINE)*  
**Versión:** 6.0.0-CANONICAL-MODULAR-SPEC  
**Estado:** Documento de Verdad Absoluta (SSOT - Single Source of Truth)  
**Archivos Consolidados y Sincronizados:**  
- `02_DATABASE_SCHEMA.md` (Completo)  
- `07_DATABASE_INFRASTRUCTURE_PLAN.md` (Completo)  
- `supabase/CONSOLIDATED_FULL_DATABASE_DEPLOY.sql` (Despliegue Consolidado v2.0)  
- Migraciones históricas 01 a 22 (`20261031000001` a `20261031000022`)  
- Migraciones de Rework V2 y Soberanía (`20261103000001_master_metagame_v2_rework.sql`, `20261103000002_territorial_metagame_sovereignty_p2p_aw.sql`, `20261103000003_v2_canonical_consolidation.sql`)  
- Migración 26 (`20261104000001_geotactics_alpha_siege_and_venezuela_seed.sql`)  
- Migración 27 (`20261105000001_geotactics_strategic_nodes_and_queues.sql`)  
- Migración 28 (`20261106_state_sovereignty_rbac.sql`)  
- Migración 29 (`20261107_theatre_cabimas_realtime.sql`)  
- Migración 30 (`20261108_system_catalog_manifest.sql`)  
- Migración 31 (`20261109_territorial_vulnerability_windows.sql`)  
- Tipos generados y contratos de dominio en `src/shared/types/database.types.ts` y `src/shared/types/metagame.ts`.

---

# 1. ARQUITECTURA DE DATOS RELACIONAL, EXTENSIONES Y 7 PILARES CANÓNICOS

El backend opera sobre **PostgreSQL 15+ en Supabase** con soporte para replicación en tiempo real (Supabase Realtime WebSockets / CDC `postgres_changes`) y seguridad a nivel de fila (Row Level Security - RLS) multi-tenant.

### 1.1 Invariantes de Base de Datos (Los 7 Pilares Canónicos + Regla Financiera)
1. **Pilar 1 — Cero Cartas (NO TCG/CCG) y Almacén Físico de 16 Tropas:** Prohibición absoluta de mazos de cartas, fragmentos o niveles de cartas. Cada comandante posee un almacén físico (`public.user_unit_hangar`, alias conceptual `player_hangar`) con capacidad máxima de **16 unidades físicas por jugador** (**4 slots de despliegue activo** + **12 unidades en reserva**) y unidades operacionales en teatro (`public.tactical_spatial_deployments`, alias conceptual `operational_units`).
2. **Pilar 2 — Escala Balística Continua de 1 a 100 HP Enteros:** Todas las unidades en catálogo (`public.units_catalog.hp_max = 100`), hangar (`public.user_unit_hangar.hp BETWEEN 1 AND 100`) y teatro espacial (`public.tactical_spatial_deployments.hp BETWEEN 0 AND 100`) operan en escala entera centesimal 1–100 HP.
3. **Pilar 3 — Derrota Inapelable por Aniquilación (0 Tropas Supervivientes):** La pérdida de la totalidad de las unidades activas en el tablero (`end_reason = 'army_wiped'`) decreta la derrota inmediata.
4. **Pilar 4 — Progresión Horizontal de Tiers T1 a T5 (+2% por Tier, Máximo +8% en T5):** Las patentes (`public.user_patents`) y ensamblajes (`tier BETWEEN 1 AND 5`) otorgan $+2\%$ de estadística por salto sobre T1 ($\text{T1}=0\%, \text{T2}=+2\%, \text{T3}=+4\%, \text{T4}=+6\%, \text{T5}=+8\%$).
5. **Pilar 5 — Conquista de Capitales con Buff Regional (+5% Recursos/Logística):** Todas las capitales provinciales/nacionales (`is_national_capital = true`, `is_capturable = true`, 15,000 TCP) son 100% conquistables y otorgan un **Buff Regional de +5% en extracción de recursos y eficiencia logística** a la facción soberana.
6. **Pilar 6 — Pérdida Física Real y Recuperación del 35% en Chatarra Tecnológica (`tech_scrap`):** Toda unidad no básica destruida en combate se deduce físicamente del hangar y liquida el **35% de su coste material en `tech_scrap`** en `public.user_industrial_inventory` (65% sumidero deflacionario permanente).
7. **Pilar 7 — Human Handshake de 120 Segundos y Ventanas de Vulnerabilidad:** Los asedios (`public.territorial_battle_sessions`) abren una ventana de **120 segundos** (`handshake_expires_at`) para que un defensor humano intercepte antes de que asuma la IA de Guarnición (`public.garrison_deployments`, Búnkeres Nivel 1 a 5), operando dentro de las ventanas diarias de vulnerabilidad territorial (`public.territorial_vulnerability_windows`, 2–4h diarias con cooldown anti-evasión de 48h).
8. **Regla Financiera Canónica (Mercado P2P 2% Split + VWAP Collar ±25%):** Toda transacción en `public.p2p_market_orders` y `public.p2p_market_listings` aplica una **comisión total del 2%** dividida en **1% quemado en Sink (`platform_burn_ec`)** + **1% de regalía al Clan dueño del Hub regional (`province_royalty_ec`)** (98% ingreso neto al vendedor), restringida por bandas dinámicas **VWAP Collar ±25%** sobre el Precio Medio de Mercado de 24h (`public.p2p_price_reference`).

```sql
-- ============================================================================
-- HABILITACIÓN DE EXTENSIONES DEL SISTEMA
-- ============================================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
```

---

# 2. DDL MAESTRO DE TABLAS (ORDEN DE INTEGRIDAD REFERENCIAL)

### 2.1 Identidad, Perfil y Telemetría del Jugador
*Servicios y Tipos Asociados:* `src/shared/types/database.types.ts`, `src/shared/services/playerDatabaseService.ts` (`playerDb`).

```sql
-- 1. TABLA: profiles
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    username VARCHAR(32) NOT NULL UNIQUE,
    avatar_url TEXT DEFAULT 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=150',
    account_level INTEGER NOT NULL DEFAULT 1 CHECK (account_level >= 1 AND account_level <= 100),
    current_xp INTEGER NOT NULL DEFAULT 0 CHECK (current_xp >= 0),
    battle_credits INTEGER NOT NULL DEFAULT 500 CHECK (battle_credits >= 0),
    command_gems INTEGER NOT NULL DEFAULT 50 CHECK (command_gems >= 0),
    trophies_count INTEGER NOT NULL DEFAULT 0 CHECK (trophies_count >= 0),
    highest_trophies INTEGER NOT NULL DEFAULT 0,
    current_win_streak INTEGER NOT NULL DEFAULT 0,
    highest_win_streak INTEGER NOT NULL DEFAULT 0,
    safeguard_items_count INTEGER NOT NULL DEFAULT 0 CHECK (safeguard_items_count >= 0),
    is_safeguard_equipped BOOLEAN NOT NULL DEFAULT false,
    last_daily_safeguard_claim TIMESTAMPTZ DEFAULT NULL,
    average_turn_seconds NUMERIC(5,2) NOT NULL DEFAULT 25.0,
    pte_profile VARCHAR(16) NOT NULL DEFAULT 'standard' CHECK (pte_profile IN ('blitz', 'standard', 'calculated')),
    elo_rating INTEGER NOT NULL DEFAULT 1200 CHECK (elo_rating >= 0),
    elo_rating_esports INTEGER NOT NULL DEFAULT 1200 CHECK (elo_rating_esports >= 0),
    total_matches_played INTEGER NOT NULL DEFAULT 0,
    total_victories INTEGER NOT NULL DEFAULT 0,
    clan_id UUID DEFAULT NULL,
    daily_offline_matches_count INTEGER NOT NULL DEFAULT 0,
    last_offline_match_date DATE DEFAULT NULL,
    demotion_shield_charges INTEGER NOT NULL DEFAULT 3 CHECK (demotion_shield_charges BETWEEN 0 AND 3),
    decay_bank_days INTEGER NOT NULL DEFAULT 0 CHECK (decay_bank_days >= 0),
    last_competitive_match_at TIMESTAMPTZ DEFAULT NULL,
    last_decay_processed_at TIMESTAMPTZ DEFAULT NULL,
    -- DEPRECATED / LEGACY (Sustituido por almacén físico de 16 unidades en user_unit_hangar según Pilar 1):
    equipped_deck JSONB DEFAULT NULL,
    equipped_cosmetics JSONB NOT NULL DEFAULT '{
        "tank_light": "skin_default",
        "infantry": "skin_default",
        "avatar_frame": "frame_recruit",
        "hq_banner": "banner_standard",
        "dialogue_bubble": "speech_standard"
    }'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX idx_profiles_username ON public.profiles(username);
CREATE INDEX idx_profiles_elo ON public.profiles(elo_rating DESC);
CREATE INDEX idx_profiles_trophies ON public.profiles(trophies_count DESC);

-- 2. TABLA: player_tactical_behavior_profile
CREATE TABLE public.player_tactical_behavior_profile (
    user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
    tilt_streak_count INTEGER NOT NULL DEFAULT 0,
    current_loss_streak INTEGER NOT NULL DEFAULT 0,
    average_turn_seconds NUMERIC(5,2) NOT NULL DEFAULT 25.0,
    most_lost_unit_id VARCHAR(32) DEFAULT 'tank_light',
    last_tilt_offer_at TIMESTAMPTZ DEFAULT NULL,
    favorite_archetype VARCHAR(32) DEFAULT 'balanced',
    trap_fall_count INTEGER NOT NULL DEFAULT 0,
    airdrop_claim_count INTEGER NOT NULL DEFAULT 0,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);
```

### 2.2 Catálogos Canónicos Inmutables y Matrices Balísticas (Pilar 2: 1-100 HP)
*Servicios y Tipos Asociados:* `src/shared/services/catalogRegistryService.ts` (`catalogRegistry`), `src/shared/types/database.types.ts`.

```sql
-- 3. TABLA: units_catalog (Escala Balística Continua 1-100 HP Enteros - Pilar 2)
CREATE TABLE public.units_catalog (
    id VARCHAR(32) PRIMARY KEY,
    display_name VARCHAR(64) NOT NULL,
    category VARCHAR(24) NOT NULL CHECK (category IN ('infantry', 'vehicle', 'indirect', 'aircraft', 'naval')),
    hp_max INTEGER NOT NULL DEFAULT 100 CHECK (hp_max = 100),
    base_attack INTEGER NOT NULL DEFAULT 55,
    min_range INTEGER NOT NULL DEFAULT 1,
    max_range INTEGER NOT NULL DEFAULT 1,
    movement_points INTEGER NOT NULL DEFAULT 3,
    movement_type VARCHAR(24) NOT NULL CHECK (movement_type IN ('foot', 'mech', 'wheels', 'treads', 'air', 'sea', 'lander', 'pipe')),
    vision_range INTEGER NOT NULL DEFAULT 3,
    production_cost_g INTEGER NOT NULL DEFAULT 1000,
    ammo_max INTEGER NOT NULL DEFAULT 9,
    fuel_max INTEGER NOT NULL DEFAULT 99,
    fuel_burn_per_turn INTEGER NOT NULL DEFAULT 0,
    fuel_burn_hidden INTEGER NOT NULL DEFAULT 0,
    primary_weapon_name VARCHAR(64) DEFAULT NULL,
    secondary_weapon_name VARCHAR(64) DEFAULT 'None',
    can_move_and_fire BOOLEAN NOT NULL DEFAULT true,
    base_cooldown_turns INTEGER NOT NULL DEFAULT 0,
    production_facility VARCHAR(24) NOT NULL DEFAULT 'factory' CHECK (production_facility IN ('factory', 'airport', 'port', 'none')),
    transport_capacity INTEGER NOT NULL DEFAULT 0,
    transport_allowed_codes JSONB NOT NULL DEFAULT '[]'::jsonb,
    special_actions JSONB NOT NULL DEFAULT '[]'::jsonb,
    weight_class VARCHAR(16) NOT NULL DEFAULT 'light' CHECK (weight_class IN ('infantry', 'light', 'medium', 'heavy', 'superheavy', 'air', 'naval')),
    is_awbw_extended BOOLEAN NOT NULL DEFAULT false,
    required_account_level INTEGER NOT NULL DEFAULT 1,
    unlock_cost_credits INTEGER NOT NULL DEFAULT 0,
    is_base_unlocked BOOLEAN NOT NULL DEFAULT true,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 3.1 TABLA: terrain_catalog (Catálogo de Terrenos, Defensa y Costes de Movimiento)
CREATE TABLE public.terrain_catalog (
    id VARCHAR(32) PRIMARY KEY,
    display_name VARCHAR(64) NOT NULL,
    defense_stars SMALLINT NOT NULL DEFAULT 0 CHECK (defense_stars BETWEEN 0 AND 4),
    defense_bonus_per_star NUMERIC(4,2) NOT NULL DEFAULT 0.10,
    generates_income_g INTEGER NOT NULL DEFAULT 0,
    is_capturable BOOLEAN NOT NULL DEFAULT false,
    capture_points_max INTEGER NOT NULL DEFAULT 20,
    provides_concealment BOOLEAN NOT NULL DEFAULT false,
    repairs_category VARCHAR(24) DEFAULT NULL,
    move_cost_foot SMALLINT DEFAULT 1,
    move_cost_mech SMALLINT DEFAULT 1,
    move_cost_tires SMALLINT DEFAULT 1,
    move_cost_treads SMALLINT DEFAULT 1,
    move_cost_air SMALLINT DEFAULT 1,
    move_cost_sea SMALLINT DEFAULT NULL,
    move_cost_lander SMALLINT DEFAULT NULL,
    move_cost_pipe SMALLINT DEFAULT NULL,
    description TEXT
);

-- 3.2 TABLA: unit_weapon_damage_matrix (Matriz Balística Base Armas Primarias/Secundarias)
CREATE TABLE public.unit_weapon_damage_matrix (
    attacker_id VARCHAR(32) NOT NULL REFERENCES public.units_catalog(id) ON DELETE CASCADE,
    defender_id VARCHAR(32) NOT NULL REFERENCES public.units_catalog(id) ON DELETE CASCADE,
    primary_base_damage INTEGER DEFAULT NULL,
    secondary_base_damage INTEGER DEFAULT NULL,
    PRIMARY KEY (attacker_id, defender_id)
);

-- 4. TABLA: cosmetics_catalog
CREATE TABLE public.cosmetics_catalog (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(64) NOT NULL,
    type VARCHAR(32) NOT NULL CHECK (type IN ('skin', 'frame', 'banner', 'dialogue_bubble', 'stamp')),
    unit_id VARCHAR(32) REFERENCES public.units_catalog(id) ON DELETE CASCADE,
    price_gems INTEGER NOT NULL DEFAULT 0,
    is_premium_exclusive BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);
```

### 2.3 Sistema de Comandantes, Bark Engine, Hangar Físico (16 Unidades) y Patentes T1-T5
*Servicios y Hooks Asociados:* `src/domains/economy/hooks/useUserHangar.ts`, `src/shared/services/playerDatabaseService.ts`, `src/shared/types/metagame.ts`.

```sql
-- 5. TABLA: user_commanders
CREATE TABLE public.user_commanders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    commander_id VARCHAR(32) NOT NULL,
    bonding_xp INTEGER NOT NULL DEFAULT 0,
    bonding_level INTEGER NOT NULL DEFAULT 1 CHECK (bonding_level BETWEEN 1 AND 10),
    is_selected BOOLEAN NOT NULL DEFAULT false,
    unlocked_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT uq_user_commander UNIQUE(user_id, commander_id)
);

-- 6. TABLA: bark_dialogue_templates
CREATE TABLE public.bark_dialogue_templates (
    id VARCHAR(64) PRIMARY KEY,
    commander_id VARCHAR(32) NOT NULL,
    trigger_event VARCHAR(32) NOT NULL, -- 'match_start', 'tilt', 'trap', 'airdrop_spawn', 'near_miss', 'victory'
    bubble_style VARCHAR(16) NOT NULL DEFAULT 'speech' CHECK (bubble_style IN ('speech', 'shout', 'thought', 'whisper', 'radio')),
    dialogue_text TEXT NOT NULL,
    onomatopoeia_stamp VARCHAR(32),
    min_bonding_level INTEGER NOT NULL DEFAULT 1
);

-- 6.1 TABLA: user_unit_hangar (Almacén Físico de Tropas - Pilar 1, Pilar 2, Pilar 4 y Pilar 6)
-- Capacidad canónica del Hangar Individual (`player_hangar`): 16 unidades físicas máximo por jugador
-- (4 slots de despliegue activo en asaltos + 12 unidades en reserva logística).
CREATE TABLE public.user_unit_hangar (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    unit_id VARCHAR(32) NOT NULL REFERENCES public.units_catalog(id) ON DELETE RESTRICT,
    tier INTEGER NOT NULL DEFAULT 1 CHECK (tier BETWEEN 1 AND 5), -- Pilar 4: +2% por tier sobre T1 (máx +8% en T5)
    hp INTEGER NOT NULL DEFAULT 100 CHECK (hp BETWEEN 1 AND 100), -- Pilar 2: Escala continua 1-100 HP
    is_equipped BOOLEAN NOT NULL DEFAULT false,
    slot_index INTEGER DEFAULT NULL CHECK (slot_index IS NULL OR (slot_index BETWEEN 1 AND 16)), -- Slots 1-4 activos, 5-16 reserva
    serial_code VARCHAR(32) NOT NULL DEFAULT ('SN-' || upper(substr(md5(random()::text), 1, 8))),
    assembled_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX idx_user_unit_hangar_owner ON public.user_unit_hangar(user_id, is_equipped);

-- 6.2 TABLA: user_patents (Árbol de Patentes Tecnológicas Horizontales T1 a T5 - Pilar 4)
CREATE TABLE public.user_patents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    unit_id VARCHAR(32) NOT NULL REFERENCES public.units_catalog(id) ON DELETE CASCADE,
    unlocked_tier INTEGER NOT NULL DEFAULT 1 CHECK (unlocked_tier BETWEEN 1 AND 5),
    research_xp INTEGER NOT NULL DEFAULT 0 CHECK (research_xp >= 0),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT uq_user_unit_patent UNIQUE (user_id, unit_id)
);
```

### 2.4 Complejo Industrial, 10 Parcelas de Feudo, Chatarra (35%) y Mercado P2P (2% Split + VWAP ±25%)
*Servicios y Hooks Asociados:* `src/domains/economy/hooks/useUserIndustry.ts`, `src/domains/economy/core/industrialEngine.ts`, `src/domains/economy/services/fiefBuildingService.ts`, `src/shared/types/metagame.ts`.

```sql
-- 7. TABLA: user_industrial_inventory (Incluye tech_scrap del 35% de reciclaje balístico - Pilar 6)
CREATE TABLE public.user_industrial_inventory (
    user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
    raw_iron INTEGER NOT NULL DEFAULT 500 CHECK (raw_iron >= 0),
    raw_stone INTEGER NOT NULL DEFAULT 500 CHECK (raw_stone >= 0),
    raw_rare_earth INTEGER NOT NULL DEFAULT 100 CHECK (raw_rare_earth >= 0),
    refined_steel INTEGER NOT NULL DEFAULT 50 CHECK (refined_steel >= 0),
    refined_concrete INTEGER NOT NULL DEFAULT 50 CHECK (refined_concrete >= 0),
    refined_microchip INTEGER NOT NULL DEFAULT 10 CHECK (refined_microchip >= 0),
    tech_scrap INTEGER NOT NULL DEFAULT 0 CHECK (tech_scrap >= 0), -- Pilar 6: 35% recuperación de chatarra tecnológica
    campaign_fuel INTEGER NOT NULL DEFAULT 5 CHECK (campaign_fuel >= 0),
    corporate_specialization VARCHAR(32) NOT NULL DEFAULT 'balanced' 
        CHECK (corporate_specialization IN ('balanced', 'vulcano_steel', 'aegis_tech', 'titan_heavy')),
    last_harvest_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 8. TABLA: industrial_refining_jobs
CREATE TABLE public.industrial_refining_jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    building_type VARCHAR(32) NOT NULL CHECK (building_type IN ('smelter', 'concrete_plant', 'tech_lab')),
    input_resource VARCHAR(32) NOT NULL,
    input_amount INTEGER NOT NULL,
    output_resource VARCHAR(32) NOT NULL,
    output_amount INTEGER NOT NULL,
    started_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    completes_at TIMESTAMPTZ NOT NULL,
    is_boosted_with_fuel BOOLEAN NOT NULL DEFAULT false,
    is_claimed BOOLEAN NOT NULL DEFAULT false
);

CREATE INDEX idx_refining_user ON public.industrial_refining_jobs(user_id, is_claimed);

-- 9. TABLA: p2p_price_reference (Oráculo VWAP 24h y Bandas Dinámicas Collar ±25%)
CREATE TABLE public.p2p_price_reference (
    resource_type VARCHAR(32) PRIMARY KEY,
    pmm_24h INTEGER NOT NULL CHECK (pmm_24h > 0),
    min_price_collar INTEGER NOT NULL CHECK (min_price_collar > 0), -- FLOOR(pmm_24h * 0.75) (-25%)
    max_price_collar INTEGER NOT NULL CHECK (max_price_collar > 0), -- CEIL(pmm_24h * 1.25) (+25%)
    volume_24h INTEGER NOT NULL DEFAULT 0,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 9.1 TABLA: p2p_market_listings (Listados P2P con Split Canónico 2%: 1% Sink + 1% Clan Hub)
CREATE TABLE public.p2p_market_listings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    seller_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    buyer_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    province_terminal_id VARCHAR(32) REFERENCES public.world_provinces(id) ON DELETE SET NULL,
    item_category VARCHAR(24) NOT NULL DEFAULT 'raw_material' CHECK (item_category IN ('raw_material', 'refined_alloy', 'finished_unit')),
    resource_type VARCHAR(32) NOT NULL,
    tier INTEGER NOT NULL DEFAULT 1 CHECK (tier BETWEEN 1 AND 5),
    quantity INTEGER NOT NULL CHECK (quantity > 0 AND quantity <= 1000),
    price_per_unit INTEGER NOT NULL CHECK (price_per_unit > 0),
    total_price INTEGER NOT NULL CHECK (total_price > 0),
    platform_burn_ec INTEGER NOT NULL DEFAULT 0,      -- 1% Quemado Deflacionario (Sink)
    province_royalty_ec INTEGER NOT NULL DEFAULT 0,   -- 1% Regalía al Clan dueño del Hub regional
    net_seller_revenue_ec INTEGER NOT NULL DEFAULT 0, -- 98% Ingreso neto al vendedor
    status VARCHAR(16) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'sold', 'cancelled', 'expired')),
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (timezone('utc'::text, now()) + interval '48 hours'),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX idx_p2p_market_active ON public.p2p_market_listings(resource_type, status, price_per_unit ASC);

-- 9.2 TABLA: p2p_market_orders (Libro de Órdenes P2P Regional y Flota Mercantil - Migraciones 24 y 25)
CREATE TABLE public.p2p_market_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    seller_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    buyer_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    origin_province_id VARCHAR(16) NOT NULL REFERENCES public.world_provinces(id) ON DELETE RESTRICT,
    item_category VARCHAR(24) NOT NULL CHECK (item_category IN ('resource', 'alloy', 'unit_chassis')),
    item_code VARCHAR(32) NOT NULL,
    unit_tier SMALLINT DEFAULT 1 CHECK (unit_tier BETWEEN 1 AND 5),
    quantity INTEGER NOT NULL CHECK (quantity > 0 AND quantity <= 10000),
    price_per_unit_ec INTEGER NOT NULL CHECK (price_per_unit_ec > 0),
    total_price_ec INTEGER NOT NULL CHECK (total_price_ec > 0),
    vwap_reference_ec INTEGER NOT NULL CHECK (vwap_reference_ec > 0),
    status VARCHAR(16) NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'completed', 'cancelled', 'expired')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    completed_at TIMESTAMPTZ DEFAULT NULL
);

CREATE INDEX idx_p2p_orders_open ON public.p2p_market_orders(origin_province_id, item_category, item_code, status);
```

### 2.5 Partidas, Tablero en Vivo y Telemetría
*Servicios y Hooks Asociados:* `src/shared/services/matchDatabaseService.ts` (`matchDb`), `src/domains/tactics/hooks/useMatchSync.ts`, `src/shared/lib/supabase/realtime.ts`.

```sql
-- 10. TABLA: active_matches
CREATE TABLE public.active_matches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    room_code VARCHAR(8) UNIQUE NOT NULL,
    player1_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    player2_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    current_turn_player_id UUID REFERENCES public.profiles(id),
    status VARCHAR(24) NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'in_progress', 'finished', 'abandoned')),
    game_mode VARCHAR(24) NOT NULL DEFAULT 'blitz_skirmish' 
        CHECK (game_mode IN ('blitz_skirmish', 'grand_campaign', 'two_vs_two', 'vs_bot', 'mirror_duel')),
    bot_difficulty VARCHAR(16) DEFAULT NULL CHECK (bot_difficulty IN ('easy', 'normal', 'hard', 'chess')),
    map_id VARCHAR(64) NOT NULL DEFAULT 'caustic_finale_18x18',
    turn_number INTEGER NOT NULL DEFAULT 1,
    turn_time_limit_sec INTEGER NOT NULL DEFAULT 30,
    max_turns_limit INTEGER NOT NULL DEFAULT 15,
    economy_multiplier NUMERIC(3,1) NOT NULL DEFAULT 2.0,
    turn_deadline TIMESTAMPTZ,
    winner_id UUID REFERENCES public.profiles(id),
    resigned_player_id UUID REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX idx_active_matches_status ON public.active_matches(status);
CREATE INDEX idx_active_matches_players ON public.active_matches(player1_id, player2_id);

-- 11. TABLA: match_state
CREATE TABLE public.match_state (
    match_id UUID PRIMARY KEY REFERENCES public.active_matches(id) ON DELETE CASCADE,
    grid_width INTEGER NOT NULL DEFAULT 16,
    grid_height INTEGER NOT NULL DEFAULT 16,
    tiles JSONB NOT NULL,
    units JSONB NOT NULL,
    properties JSONB NOT NULL,
    airdrops JSONB NOT NULL DEFAULT '[]'::jsonb,
    player_funds JSONB NOT NULL DEFAULT '{"player1": 1000, "player2": 1000}'::jsonb,
    co_power_gauge JSONB NOT NULL DEFAULT '{"player1": 0, "player2": 0}'::jsonb,
    fog_of_war_enabled BOOLEAN NOT NULL DEFAULT true,
    last_action_seq INTEGER NOT NULL DEFAULT 0,
    action_log JSONB NOT NULL DEFAULT '[]'::jsonb,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 12. TABLA: match_history (Pilar 3: 'army_wiped' cuando un bando llega a 0 tropas supervivientes)
CREATE TABLE public.match_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    match_id UUID NOT NULL,
    player1_id UUID NOT NULL REFERENCES public.profiles(id),
    player2_id UUID REFERENCES public.profiles(id),
    winner_id UUID REFERENCES public.profiles(id),
    end_reason VARCHAR(32) NOT NULL CHECK (end_reason IN ('hq_captured', 'army_wiped', 'resignation', 'timeout', 'sudden_death')),
    total_turns INTEGER NOT NULL,
    duration_seconds INTEGER NOT NULL,
    game_mode VARCHAR(24) NOT NULL,
    is_tournament_cap_applied BOOLEAN NOT NULL DEFAULT false,
    p1_average_deck_level NUMERIC(4,2) DEFAULT 1.0,
    p2_average_deck_level NUMERIC(4,2) DEFAULT 1.0,
    near_miss_data JSONB DEFAULT NULL,
    p1_xp_awarded INTEGER NOT NULL DEFAULT 0,
    p2_xp_awarded INTEGER NOT NULL DEFAULT 0,
    p1_credits_awarded INTEGER NOT NULL DEFAULT 0,
    p2_credits_awarded INTEGER NOT NULL DEFAULT 0,
    final_stats JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX idx_match_history_p1 ON public.match_history(player1_id);
CREATE INDEX idx_match_history_p2 ON public.match_history(player2_id);

-- 13. TABLA: match_airdrop_events
CREATE TABLE public.match_airdrop_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    match_id UUID NOT NULL REFERENCES public.active_matches(id) ON DELETE CASCADE,
    turn_number INTEGER NOT NULL,
    player_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    unit_type VARCHAR(32) NOT NULL,
    reward_type VARCHAR(32) NOT NULL CHECK (reward_type IN ('funds', 'co_power', 'blueprints', 'gems')),
    reward_payload JSONB NOT NULL,
    tile_x INTEGER NOT NULL,
    tile_y INTEGER NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 14. TABLA UNIFICADA DE EMPAREJAMIENTO: matchmaking_queue (Conciliación Migración 14)
-- Sustituye y consolida la tabla histórica 'mirror_duel_queue' para dar soporte multi-modo
CREATE TABLE public.matchmaking_queue (
    user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
    game_mode VARCHAR(24) NOT NULL CHECK (game_mode IN ('mirror_duel', 'blitz_skirmish', 'grand_campaign')),
    commander_id VARCHAR(32) NOT NULL REFERENCES public.commanders_catalog(id),
    deck_snapshot JSONB NOT NULL DEFAULT '[]'::jsonb,
    preferred_theater VARCHAR(16) NOT NULL DEFAULT 'any' CHECK (preferred_theater IN ('land', 'naval', 'combined', 'any')),
    trophies INTEGER NOT NULL DEFAULT 0,
    weighted_power NUMERIC(4,2) NOT NULL DEFAULT 1.0,
    queued_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    matched_match_id UUID DEFAULT NULL,
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (timezone('utc'::text, now()) + interval '90 seconds')
);

-- Índice parcial determinista B-Tree para alta concurrencia con FOR UPDATE SKIP LOCKED
CREATE INDEX idx_matchmaking_active_seek
ON public.matchmaking_queue (game_mode, trophies, queued_at)
WHERE matched_match_id IS NULL;

-- 14.1 TABLA: user_industrial_plots (Cuadrícula Territorial de 10 Parcelas por Feudo / `fief_plots` - Migración 13)
CREATE TABLE public.user_industrial_plots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    plot_index INTEGER NOT NULL CHECK (plot_index BETWEEN 1 AND 10),
    enterprise_type VARCHAR(48) NOT NULL CHECK (enterprise_type IN (
        'empty',
        'mine_iron', 'quarry_stone', 'drill_rare_earth', 'distillery_synth_fuel',
        'smelter_vulcan', 'concrete_plant', 'cleanroom_chips', 'lab_nano_compounds',
        'logistics_silo', 'market_terminal', 'fuel_generator'
    )),
    tier INTEGER NOT NULL DEFAULT 1 CHECK (tier BETWEEN 1 AND 5),
    status VARCHAR(16) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'clearing', 'reconfiguring')),
    reconfiguration_target VARCHAR(48) DEFAULT NULL,
    work_started_at TIMESTAMPTZ DEFAULT NULL,
    work_completes_at TIMESTAMPTZ DEFAULT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT uq_user_plot_index UNIQUE (user_id, plot_index)
);

CREATE INDEX idx_user_industrial_plots_lookup ON public.user_industrial_plots(user_id, status);

-- 14.2 TABLA: user_stranded_cargo (Convoy Varado de Salvamento - Migración 13)
CREATE TABLE public.user_stranded_cargo (
    user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
    stranded_iron INTEGER NOT NULL DEFAULT 0 CHECK (stranded_iron >= 0),
    stranded_stone INTEGER NOT NULL DEFAULT 0 CHECK (stranded_stone >= 0),
    stranded_rare_earth INTEGER NOT NULL DEFAULT 0 CHECK (stranded_rare_earth >= 0),
    stranded_fuel INTEGER NOT NULL DEFAULT 0 CHECK (stranded_fuel >= 0),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);
```

### 2.6 Corporaciones Militares (Clanes), Holdings Federados y Guarniciones IA
```sql
-- 15. TABLA: clans
CREATE TABLE public.clans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(48) NOT NULL UNIQUE,
    tag VARCHAR(6) NOT NULL UNIQUE,
    description TEXT,
    leader_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    total_clan_trophies INTEGER NOT NULL DEFAULT 0,
    current_war_tier INTEGER NOT NULL DEFAULT 1 CHECK (current_war_tier BETWEEN 1 AND 4),
    active_war_participants_today INTEGER NOT NULL DEFAULT 0,
    treasury_energy_credits BIGINT NOT NULL DEFAULT 10000 CHECK (treasury_energy_credits >= 0),
    treasury_iron INTEGER NOT NULL DEFAULT 1000 CHECK (treasury_iron >= 0),
    treasury_steel INTEGER NOT NULL DEFAULT 250 CHECK (treasury_steel >= 0),
    treasury_rare_earth INTEGER NOT NULL DEFAULT 100 CHECK (treasury_rare_earth >= 0),
    parent_corporation_id UUID REFERENCES public.clans(id) ON DELETE SET NULL,
    is_holding_matrix BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 16. TABLA: clan_members
CREATE TABLE public.clan_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    clan_id UUID NOT NULL REFERENCES public.clans(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    role VARCHAR(16) NOT NULL DEFAULT 'recruit' CHECK (role IN ('leader', 'officer', 'veteran', 'recruit')),
    daily_war_matches_played INTEGER NOT NULL DEFAULT 0,
    daily_war_victories INTEGER NOT NULL DEFAULT 0,
    has_claimed_daily_chest BOOLEAN NOT NULL DEFAULT false,
    joined_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT uq_clan_user UNIQUE(clan_id, user_id)
);

CREATE INDEX idx_clan_members_lookup ON public.clan_members(clan_id, daily_war_matches_played DESC);

-- 16.1 TABLA: corporate_subsidiaries (Federación de hasta 10 Clanes Filiales - Migración 23)
-- Enforzada por trigger trg_check_corporate_clan_limit / check_corporate_clan_limit() (máx 9 filiales + 1 matriz = 10)
CREATE TABLE public.corporate_subsidiaries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    holding_clan_id UUID NOT NULL REFERENCES public.clans(id) ON DELETE CASCADE,
    subsidiary_clan_id UUID NOT NULL UNIQUE REFERENCES public.clans(id) ON DELETE CASCADE,
    tax_tribute_pct NUMERIC(4,2) NOT NULL DEFAULT 5.00 CHECK (tax_tribute_pct BETWEEN 0.00 AND 25.00),
    affiliated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT chk_not_self_subsidiary CHECK (holding_clan_id <> subsidiary_clan_id)
);

-- 16.2 TABLA: garrison_deployments (Guarnición IA Nivel 1 a 5 y Handshake 120s - Pilar 7)
CREATE TABLE public.garrison_deployments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    province_id VARCHAR(32) NOT NULL REFERENCES public.world_provinces(id) ON DELETE CASCADE,
    owner_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    clan_id UUID REFERENCES public.clans(id) ON DELETE CASCADE,
    bunker_ai_level INTEGER NOT NULL DEFAULT 1 CHECK (bunker_ai_level BETWEEN 1 AND 5),
    assigned_units JSONB NOT NULL DEFAULT '[]'::jsonb,
    service_started_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    legendary_unlock_at TIMESTAMPTZ NOT NULL DEFAULT (timezone('utc'::text, now()) + interval '21 days'),
    is_legendary_veteran BOOLEAN NOT NULL DEFAULT false,
    last_upkeep_paid_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    under_attack_since TIMESTAMPTZ DEFAULT NULL,
    handshake_deadline TIMESTAMPTZ DEFAULT NULL -- Pilar 7: 120 segundos para intercepción humana
);
```

### 2.7 Salvaguarda Táctica y Ofertas Flash por Tilt
> **Nota de Gobernanza Canónica (Pilar 1):** Las columnas históricas `reward_cards_amount` se conservan en el esquema por compatibilidad retroactiva de migraciones previas, pero bajo el Pilar 1 (Cero Cartas) toda recompensa material se liquida en chasis físicos (`user_unit_hangar`), aleaciones (`refined_steel`) o chatarra (`tech_scrap`).

```sql
-- 17. TABLA: safeguard_crafting_jobs
CREATE TABLE public.safeguard_crafting_jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    started_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    completes_at TIMESTAMPTZ NOT NULL,
    is_claimed BOOLEAN NOT NULL DEFAULT false
);

CREATE INDEX idx_safeguard_crafting_user ON public.safeguard_crafting_jobs(user_id, is_claimed);

-- 18. TABLA: tilt_emergency_offers
CREATE TABLE public.tilt_emergency_offers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    triggered_by_match_id UUID NOT NULL REFERENCES public.active_matches(id) ON DELETE CASCADE,
    target_unit_id VARCHAR(32) NOT NULL,
    offer_price_usd NUMERIC(4,2) NOT NULL DEFAULT 0.99,
    reward_cards_amount INTEGER NOT NULL DEFAULT 100, -- LEGACY (Pilar 1: mapeado a tech_scrap / suministro industrial)
    reward_steel_amount INTEGER NOT NULL DEFAULT 30,
    stripe_session_id VARCHAR(128),
    status VARCHAR(16) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'purchased', 'expired')),
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX idx_tilt_offers_user ON public.tilt_emergency_offers(user_id, status);
```

### 2.8 Geopolítica Global, Topología Alice y Asedios Territoriales (Migraciones 24, 25 y 26)
*Servicios y Hooks Asociados:* `src/domains/world/hooks/useTerritoryMap.ts`, `src/domains/world/hooks/useSiegeRealtime.ts`, `src/domains/economy/hooks/useTerritoryEconomyTicker.ts`.

```sql
-- 18.1 TABLAS MACRO GLOBALES: world_countries, world_provinces y territory_control (Migración 24 y 25)
CREATE TABLE public.world_countries (
    iso_code VARCHAR(3) PRIMARY KEY,
    name VARCHAR(64) NOT NULL UNIQUE,
    continent VARCHAR(24) NOT NULL CHECK (continent IN ('americas', 'europe', 'asia', 'africa', 'oceania')),
    capital_province_id VARCHAR(16) NOT NULL,
    hegemon_clan_id UUID REFERENCES public.clans(id) ON DELETE SET NULL,
    national_tax_bonus_pct NUMERIC(4,2) NOT NULL DEFAULT 5.00, -- Pilar 5: +5% Buff Regional/Nacional por conquista de Capital
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE public.world_provinces (
    id VARCHAR(16) PRIMARY KEY,
    country_iso VARCHAR(3) NOT NULL REFERENCES public.world_countries(iso_code) ON DELETE CASCADE,
    name VARCHAR(64) NOT NULL,
    is_capital BOOLEAN NOT NULL DEFAULT false,
    is_capturable BOOLEAN NOT NULL DEFAULT true CHECK (is_capturable = true), -- Pilar 5: Capitales 100% capturables (sin escudos infinitos)
    biome VARCHAR(24) NOT NULL DEFAULT 'plains' CHECK (biome IN ('plains', 'urban_industrial', 'highlands', 'jungle', 'archipelago', 'desert')),
    primary_resource VARCHAR(24) NOT NULL CHECK (primary_resource IN ('raw_iron', 'raw_stone', 'raw_rare_earth', 'crude_oil', 'energy_hub')),
    base_Extraction_yield INTEGER NOT NULL DEFAULT 100,
    base_upkeep_cost_ec INTEGER NOT NULL DEFAULT 250,
    adjacent_provinces JSONB NOT NULL DEFAULT '[]'::jsonb,
    center_lat NUMERIC(8,4) NOT NULL DEFAULT 0.0,
    center_lng NUMERIC(8,4) NOT NULL DEFAULT 0.0
);

CREATE TABLE public.territory_control (
    province_id VARCHAR(16) PRIMARY KEY REFERENCES public.world_provinces(id) ON DELETE CASCADE,
    owner_clan_id UUID REFERENCES public.clans(id) ON DELETE SET NULL,
    controller_clan_id UUID REFERENCES public.clans(id) ON DELETE SET NULL,
    sovereignty_state VARCHAR(24) NOT NULL DEFAULT 'neutral' CHECK (sovereignty_state IN ('neutral', 'sovereign', 'contested', 'occupied_grace')),
    control_points INTEGER NOT NULL DEFAULT 10000 CHECK (control_points BETWEEN 0 AND 15000),
    max_control_points INTEGER NOT NULL DEFAULT 10000 CHECK (max_control_points IN (10000, 15000)),
    bunker_ai_tier SMALLINT NOT NULL DEFAULT 1 CHECK (bunker_ai_tier BETWEEN 1 AND 5),
    fortification_level SMALLINT NOT NULL DEFAULT 1 CHECK (fortification_level BETWEEN 1 AND 5),
    Grace_period_ends_at TIMESTAMPTZ DEFAULT NULL,
    escrow_royalties_ec BIGINT NOT NULL DEFAULT 0 CHECK (escrow_royalties_ec >= 0),
    upkeep_paid_until TIMESTAMPTZ NOT NULL DEFAULT (timezone('utc'::text, now()) + interval '24 hours'),
    is_in_blackout BOOLEAN NOT NULL DEFAULT false,
    active_siege_match_id UUID REFERENCES public.active_matches(id) ON DELETE SET NULL,
    siege_handshake_expires_at TIMESTAMPTZ DEFAULT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 19. TABLA: regions (Topología Geopolítica Alice de GEOTACTICS - Migración 26)
CREATE TABLE public.regions (
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

CREATE INDEX idx_regions_country ON public.regions(country_iso);
CREATE INDEX idx_regions_playable ON public.regions(is_playable);
CREATE INDEX idx_regions_capital ON public.regions(is_national_capital);

-- 20. TABLA: region_adjacencies (Grafo Topológico Comprimido con Máscara de Bits - Migración 26)
-- topology_flags bitmask: 1=LAND_ROAD, 2=MOUNTAIN_PASS, 4=RIVER_CROSSING, 8=MARITIME_STRAIT, 16=AMPHIBIOUS_LANE, 32=AIR_CORRIDOR
CREATE TABLE public.region_adjacencies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    from_region_id TEXT NOT NULL REFERENCES public.regions(id) ON DELETE CASCADE,
    to_region_id TEXT NOT NULL REFERENCES public.regions(id) ON DELETE CASCADE,
    topology_flags SMALLINT NOT NULL DEFAULT 1 CHECK (topology_flags >= 1 AND topology_flags <= 63),
    choke_controlling_region_id TEXT REFERENCES public.regions(id) ON DELETE SET NULL,
    distance_km REAL NOT NULL DEFAULT 100.0 CHECK (distance_km > 0),
    transit_rounds SMALLINT NOT NULL DEFAULT 4 CHECK (transit_rounds >= 1 AND transit_rounds <= 12),
    toll_fee_percent NUMERIC(4,2) NOT NULL DEFAULT 1.00 CHECK (toll_fee_percent >= 0.00 AND toll_fee_percent <= 10.00),
    CONSTRAINT uq_region_adjacency UNIQUE (from_region_id, to_region_id),
    CONSTRAINT chk_no_self_loop CHECK (from_region_id <> to_region_id)
);

CREATE INDEX idx_region_adj_from ON public.region_adjacencies(from_region_id);
CREATE INDEX idx_region_adj_to ON public.region_adjacencies(to_region_id);

-- 21. TABLA: region_sovereignty (Soberanía Dual De Jure / De Facto, Escudos y TCP - Migración 26)
CREATE TABLE public.region_sovereignty (
    region_id TEXT PRIMARY KEY REFERENCES public.regions(id) ON DELETE CASCADE,
    owner_clan_id UUID REFERENCES public.clans(id) ON DELETE SET NULL,
    controller_clan_id UUID REFERENCES public.clans(id) ON DELETE SET NULL,
    control_points INTEGER NOT NULL DEFAULT 10000 CHECK (control_points >= 0),
    max_control_points INTEGER NOT NULL DEFAULT 10000 CHECK (max_control_points IN (10000, 15000)),
    bunker_level SMALLINT NOT NULL DEFAULT 1 CHECK (bunker_level BETWEEN 1 AND 5),
    status TEXT NOT NULL DEFAULT 'stable' CHECK (status IN ('stable', 'under_siege', 'occupied_grace')),
    customs_escrow_locked BOOLEAN GENERATED ALWAYS AS (status = 'occupied_grace') STORED,
    is_energy_starved BOOLEAN NOT NULL DEFAULT FALSE,
    active_battle_id UUID,
    cooldown_expires_at TIMESTAMPTZ,
    grace_expires_at TIMESTAMPTZ,
    last_tick_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW()),
    CONSTRAINT chk_tcp_bounds CHECK (control_points <= max_control_points)
);

CREATE INDEX idx_region_sovereignty_owner ON public.region_sovereignty(owner_clan_id);
CREATE INDEX idx_region_sovereignty_controller ON public.region_sovereignty(controller_clan_id);
CREATE INDEX idx_region_sovereignty_status ON public.region_sovereignty(status);

-- 22. TABLA: territorial_battle_sessions (Instancias de Asedio Territorial y Handshake 120s - Migración 26)
CREATE TABLE public.territorial_battle_sessions (
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

CREATE INDEX idx_territorial_battles_region ON public.territorial_battle_sessions(region_id, status);
```

### 2.9 Nodos Estratégicos, Hangar de Facción y Colas de Producción (Migración 27)
```sql
-- 23. TABLA: strategic_nodes (Nodos Estratégicos Provinciales)
CREATE TABLE public.strategic_nodes (
    id TEXT PRIMARY KEY,
    region_id TEXT NOT NULL REFERENCES public.regions(id) ON DELETE CASCADE,
    node_type TEXT NOT NULL CHECK (node_type IN ('capital_hq', 'refinery_hub', 'strait_canal', 'radar_c4isr', 'missile_silo')),
    name TEXT NOT NULL,
    buff_type TEXT NOT NULL CHECK (buff_type IN ('hegemonic_capital', 'energy_extraction', 'toll_chokepoint', 'radar_recon', 'area_denial')),
    buff_value NUMERIC(6,2) NOT NULL DEFAULT 1.00,
    controlling_clan_id UUID REFERENCES public.clans(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW())
);

CREATE INDEX idx_strategic_nodes_region ON public.strategic_nodes(region_id);
CREATE INDEX idx_strategic_nodes_clan ON public.strategic_nodes(controlling_clan_id);
CREATE INDEX idx_strategic_nodes_type ON public.strategic_nodes(node_type);

-- 24. TABLA: faction_unit_hangar (Hangar Colectivo Comunitario del Clan)
CREATE TABLE public.faction_unit_hangar (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clan_id UUID NOT NULL REFERENCES public.clans(id) ON DELETE CASCADE,
    unit_code TEXT NOT NULL,
    tier SMALLINT NOT NULL DEFAULT 1 CHECK (tier BETWEEN 1 AND 5),
    stock_quantity INTEGER NOT NULL DEFAULT 0 CHECK (stock_quantity >= 0),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW()),
    CONSTRAINT uq_faction_hangar_clan_unit_tier UNIQUE (clan_id, unit_code, tier)
);

CREATE INDEX idx_faction_hangar_clan ON public.faction_unit_hangar(clan_id);
CREATE INDEX idx_faction_hangar_unit_tier ON public.faction_unit_hangar(unit_code, tier);

-- 25. TABLA: unit_production_queue (Cola de Ensamblaje con Tiempos de Espera)
CREATE TABLE public.unit_production_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    clan_id UUID REFERENCES public.clans(id) ON DELETE SET NULL,
    destination TEXT NOT NULL DEFAULT 'user' CHECK (destination IN ('user', 'faction')),
    unit_code TEXT NOT NULL,
    tier SMALLINT NOT NULL DEFAULT 1 CHECK (tier BETWEEN 1 AND 5),
    duration_seconds INTEGER NOT NULL CHECK (duration_seconds >= 0),
    started_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW()),
    ready_at TIMESTAMPTZ NOT NULL,
    is_claimed BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW())
);

CREATE INDEX idx_unit_prod_queue_user ON public.unit_production_queue(user_id);
CREATE INDEX idx_unit_prod_queue_clan ON public.unit_production_queue(clan_id);
CREATE INDEX idx_unit_prod_queue_ready ON public.unit_production_queue(ready_at, is_claimed);
```

### 2.10 Soberanía Estatal RBAC, Teatro Operacional Realtime, Manifiesto SSOT y Ventanas de Vulnerabilidad (Migraciones 28 a 31)
*Servicios Asociados:* `src/domains/world/services/stateSovereigntyService.ts`, `src/domains/world/services/spatialDeploymentService.ts`, `src/domains/tactics/services/operationalUnitsService.ts`, `src/domains/economy/services/fiefBuildingService.ts`, `src/shared/services/catalogRegistryService.ts`.

```sql
-- 26. TABLA: state_sovereignty (Soberanía Estatal de Primer Orden y RBAC - Migración 28)
CREATE TABLE public.state_sovereignty (
    state_id VARCHAR(32) PRIMARY KEY,
    state_name VARCHAR(120) NOT NULL,
    controlling_clan_id VARCHAR(64) NOT NULL,
    clan_tag VARCHAR(8) NOT NULL,
    custom_nation_name VARCHAR(40) NOT NULL CHECK (char_length(trim(custom_nation_name)) BETWEEN 3 AND 40),
    clan_motto VARCHAR(80) NOT NULL DEFAULT '',
    banner_color_hex VARCHAR(9) NOT NULL DEFAULT '#10b981',
    border_glow_hex VARCHAR(9) NOT NULL DEFAULT '#34d399',
    emblem_icon VARCHAR(16) NOT NULL DEFAULT '🦅',
    capital_city VARCHAR(80) NOT NULL,
    capital_lng DOUBLE PRECISION NOT NULL,
    capital_lat DOUBLE PRECISION NOT NULL,
    tax_rate_percent NUMERIC(5,2) NOT NULL DEFAULT 1.00 CHECK (tax_rate_percent BETWEEN 0 AND 15),
    defense_index SMALLINT NOT NULL DEFAULT 80 CHECK (defense_index BETWEEN 0 AND 100),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- 27. TABLA: tactical_spatial_deployments (Divisiones Operacionales en Cuadrícula WGS84 20m - Migración 29)
CREATE TABLE public.tactical_spatial_deployments (
    id VARCHAR(64) PRIMARY KEY,
    region_id TEXT NOT NULL REFERENCES public.regions(id) ON DELETE CASCADE DEFAULT 'REG_VE_02',
    cell_key VARCHAR(64) NOT NULL,
    sector_x INTEGER NOT NULL,
    sector_y INTEGER NOT NULL,
    cell_x INTEGER NOT NULL CHECK (cell_x >= 0 AND cell_x < 50),
    cell_y INTEGER NOT NULL CHECK (cell_y >= 0 AND cell_y < 50),
    lat NUMERIC(9,6) NOT NULL,
    lng NUMERIC(9,6) NOT NULL,
    unit_code VARCHAR(32) NOT NULL,
    unit_name VARCHAR(64) NOT NULL,
    clan_id VARCHAR(64) NOT NULL,
    clan_tag VARCHAR(8) NOT NULL,
    faction_id VARCHAR(32) NOT NULL DEFAULT 'GRAN_COLOMBIA',
    callsign VARCHAR(64) NOT NULL,
    tier SMALLINT NOT NULL DEFAULT 1 CHECK (tier BETWEEN 1 AND 5),
    hp SMALLINT NOT NULL DEFAULT 100 CHECK (hp >= 0 AND hp <= 100),
    max_hp SMALLINT NOT NULL DEFAULT 100 CHECK (max_hp = 100),
    status VARCHAR(24) NOT NULL DEFAULT 'holding' CHECK (status IN ('holding', 'moving', 'sieging', 'garrisoned', 'combat')),
    color_hex VARCHAR(12) NOT NULL DEFAULT '#0ea5e9',
    owner_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW()),
    CONSTRAINT uq_spatial_cell_deployment UNIQUE (region_id, cell_key)
);

-- 28. TABLA: tactical_fief_constructions (Infraestructura de Feudos In-Situ en Celdas de 20m - Migración 29)
CREATE TABLE public.tactical_fief_constructions (
    id VARCHAR(64) PRIMARY KEY,
    fief_id VARCHAR(64) NOT NULL,
    region_id TEXT NOT NULL REFERENCES public.regions(id) ON DELETE CASCADE DEFAULT 'REG_VE_02',
    cell_key VARCHAR(64) NOT NULL,
    sector_x INTEGER NOT NULL,
    sector_y INTEGER NOT NULL,
    cell_x INTEGER NOT NULL CHECK (cell_x >= 0 AND cell_x < 50),
    cell_y INTEGER NOT NULL CHECK (cell_y >= 0 AND cell_y < 50),
    lat NUMERIC(9,6) NOT NULL,
    lng NUMERIC(9,6) NOT NULL,
    building_type VARCHAR(32) NOT NULL CHECK (building_type IN ('oil_refinery', 'microchip_foundry', 'radar_station', 'bunker_turret', 'supply_depot', 'seaport_terminal')),
    building_name VARCHAR(64) NOT NULL,
    clan_id VARCHAR(64) NOT NULL,
    clan_tag VARCHAR(8) NOT NULL DEFAULT 'GCOL',
    level SMALLINT NOT NULL DEFAULT 1 CHECK (level BETWEEN 1 AND 5),
    current_hp INTEGER NOT NULL DEFAULT 2500 CHECK (current_hp >= 0),
    max_hp INTEGER NOT NULL DEFAULT 2500 CHECK (max_hp > 0),
    hourly_upkeep_ec INTEGER NOT NULL DEFAULT 120 CHECK (hourly_upkeep_ec >= 0),
    is_operational BOOLEAN NOT NULL DEFAULT TRUE,
    owner_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW()),
    CONSTRAINT uq_spatial_cell_construction UNIQUE (region_id, cell_key)
);

-- 29. TABLA: region_operational_state (Estado Táctico y DEFCON Regional - Migración 29)
CREATE TABLE public.region_operational_state (
    region_id TEXT PRIMARY KEY REFERENCES public.regions(id) ON DELETE CASCADE,
    controlling_clan_id VARCHAR(64) NOT NULL DEFAULT 'CLAN_ZULIA_SOVEREIGN',
    controlling_clan_tag VARCHAR(8) NOT NULL DEFAULT 'ZUL',
    defcon_level SMALLINT NOT NULL DEFAULT 4 CHECK (defcon_level BETWEEN 1 AND 5),
    active_units_count INTEGER NOT NULL DEFAULT 0 CHECK (active_units_count >= 0),
    active_buildings_count INTEGER NOT NULL DEFAULT 0 CHECK (active_buildings_count >= 0),
    regional_tax_rate NUMERIC(4,2) NOT NULL DEFAULT 1.50,
    is_under_siege BOOLEAN NOT NULL DEFAULT FALSE,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW())
);

-- 30. TABLA: system_catalog_manifest (Manifiesto SSOT con Hash SHA-256 para Hot-Patching - Migración 30)
CREATE TABLE public.system_catalog_manifest (
    id SMALLINT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
    version_tag VARCHAR(32) NOT NULL DEFAULT '1.0.0-alpha.1',
    content_hash VARCHAR(64) NOT NULL,
    bundle_json JSONB NOT NULL DEFAULT '{}'::jsonb,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW())
);

-- 31. TABLA: territorial_vulnerability_windows (Ventanas de Vulnerabilidad Fija 2-4h y Cooldown 48h - Migración 31)
CREATE TABLE public.territorial_vulnerability_windows (
    region_id TEXT PRIMARY KEY REFERENCES public.regions(id) ON DELETE CASCADE,
    controlling_clan_id VARCHAR(64) NOT NULL DEFAULT 'CLAN_ZULIA_SOVEREIGN',
    window_start_utc_hour SMALLINT NOT NULL DEFAULT 22 CHECK (window_start_utc_hour >= 0 AND window_start_utc_hour <= 23),
    window_duration_hours SMALLINT NOT NULL DEFAULT 3 CHECK (window_duration_hours BETWEEN 2 AND 4),
    pending_start_utc_hour SMALLINT CHECK (pending_start_utc_hour IS NULL OR (pending_start_utc_hour >= 0 AND pending_start_utc_hour <= 23)),
    pending_effective_at TIMESTAMPTZ,
    is_manual_override_active BOOLEAN NOT NULL DEFAULT FALSE,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW())
);
```

---

# 3. CATÁLOGO MAESTRO DE FUNCIONES RPC ALMACENADAS (ACID)

Todas las operaciones de estado crítico se ejecutan dentro del motor relacional bajo transacciones ACID aseguradas con `SECURITY DEFINER`:

### 3.1 Emparejamiento Multi-Modo Unificado (`join_matchmaking_queue`)
*Implementación de Referencia:* `supabase/migrations/20261031000014_unified_matchmaking_and_ranked_ladder.sql`, `src/shared/services/matchDatabaseService.ts`.
Localiza un contrincante en la tabla `matchmaking_queue` para el modo seleccionado (`mirror_duel`, `blitz_skirmish`, `grand_campaign`) con diferencia de trofeos adaptativa y ventana de tolerancia temporal utilizando `FOR UPDATE SKIP LOCKED`. Si lo halla, instancia la partida en la arena designada; en caso contrario, encola al comandante con un TTL estricto de 90 segundos.

### 3.2 Captura Atómica de AirDrops (`claim_airdrop`)
```sql
CREATE OR REPLACE FUNCTION public.claim_airdrop(
    p_match_id UUID,
    p_airdrop_id TEXT,
    p_unit_id TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
-- Valida posesión de turno por auth.uid(), existencia de unidad, estado vivo y
-- VERIFICACIÓN ESTRICTA DE POSICIÓN: la unidad debe ocupar la coordenada exacta del AirDrop.
-- Aplica los fondos o recarga de energía CO y asienta la auditoría en match_airdrop_events.
$$;
```

### 3.3 Mercado P2P con Impuesto Canónico del 2% (1% Sink + 1% Clan Hub) y VWAP Collar ±25% (`execute_p2p_market_transaction`, `execute_p2p_trade_v2` & `execute_p2p_purchase`)
*Implementaciones de Referencia:* `supabase/migrations/20261103000001_master_metagame_v2_rework.sql`, `supabase/migrations/20261103000002_territorial_metagame_sovereignty_p2p_aw.sql`, `supabase/migrations/20261103000003_v2_canonical_consolidation.sql` y `src/shared/types/metagame.ts` (`MASTER_METAGAME_CONSTANTS`).
Ejecuta la compraventa atómica de recursos, aleaciones o chasis de unidades entre comprador (`auth.uid()`) y vendedor con bloqueo pesimista `FOR UPDATE`:
- **Validación de Bandas VWAP Collar ±25%:** Verifica que `price_per_unit` se mantenga dentro de `[min_price_collar, max_price_collar]` ($\pm 25\%$ sobre `pmm_24h` en `p2p_price_reference`).
- **Deducción del 100% al Comprador:** Verifica y descuenta `total_price_ec` de `profiles.battle_credits`.
- **Split Financiero Canónico del 2% (`P2P_TOTAL_FEE_PCT = 0.02`):**
  - **1% Quemado Deflacionario (Sink):** `v_sink_burn_ec := GREATEST(1, FLOOR(total_price_ec * 0.01))` (`platform_burn_ec`), eliminado permanentemente de circulación.
  - **1% Regalía de Hub Provincial (Clan):** `v_clan_royalty_ec := GREATEST(1, FLOOR(total_price_ec * 0.01))` (`province_royalty_ec`), transferido a `clans.treasury_energy_credits` del clan soberano de la provincia origen (o retenido en `territory_control.escrow_royalties_ec` si la provincia está en estado `'occupied_grace'`).
- **Liquidación Neta al Vendedor (98%):** Transfiere `v_net_seller_ec := total_price_ec - v_sink_burn_ec - v_clan_royalty_ec` al vendedor.
- **Entrega Física:** Transfiere el lote al inventario industrial o el chasis al almacén físico (`user_unit_hangar`, respetando el tope de 16 unidades).
- *(Nota: La función histórica `execute_p2p_purchase` de la Migración 13 permanece en el esquema por compatibilidad retroactiva, siendo reemplazada funcionalmente por `execute_p2p_trade_v2` y `execute_p2p_market_transaction` con el split canónico del 2%).*

### 3.4 Cosecha Territorial con Ciclo Circadiano de 16h (`harvest_industrial_territory`)
*Implementación de Referencia:* `supabase/migrations/20261031000013_economy_idle_rework_territorial_plots.sql`, `src/domains/economy/hooks/useUserIndustry.ts`.
Calcula la producción territorial de las **10 parcelas del feudo** (`user_industrial_plots` / `fief_plots`) con evaluación perezosa $O(1)$:
- Si la recolección ocurre dentro de la ventana de 16 horas (12h base + 4h gracia), aplica el **Bono de Eficiencia Logística (+10% recursos y +500 Créditos)**.
- Si excede las 16 horas, aplica merma suavizada del $1.5\%$/hora con piso al 60%.
- El **70% de los recursos perdidos se transfieren automáticamente a `user_stranded_cargo`** (Convoy Varado de Salvamento), permitiendo al jugador recuperarlos sin coste ganando combates en el Frente.

### 3.5 Reconfiguración y Adquisición de Parcelas (`reconfigure_industrial_plot` & `acquire_industrial_plot`)
Permite cambiar el tipo de empresa de una de las 10 parcelas previa demolición con 50% de reembolso de materiales, o adquirir parcelas adicionales según el nivel de cuenta alcanzado.

### 3.6 Liquidador Autónomo del Banco Central NPC (`fulfill_stale_p2p_orders`)
Función cron/RPC que inspecciona órdenes P2P estancadas con más de 6 horas activas. El Banco Central de Intendencia Militar absorbe los materiales al precio medio de mercado y transfiere los fondos al vendedor deduciendo la tasa vigente.

### 3.7 Intercambio de Trofeos Elo, Escudo de Descenso y Season Reset (`calculate_trophy_exchange`)
*Implementación de Referencia:* `supabase/migrations/20261031000014_unified_matchmaking_and_ranked_ladder.sql`.
- Aplica el Factor K dinámico (K=40 en Arena 1 descendiendo hasta K=20 en Ligas Legendarias).
- A partir de Arena 6 (2,000 Trofeos), opera bajo suma cero estricta (sin inflación artificial).
- Si el jugador va a descender de arena, consume 1 carga del **Escudo de Descenso Dinámico** (hasta 3 cargas por ciclo) preservando el piso de la división.
- Protocolo de compresión estacional no lineal ejecutado cada 28 días.

### 3.8 Selección Contextual de Diálogo Cómic (`rpc_get_contextual_bark`)
Realiza un muestreo estocástico ponderado $O(1)$ sobre `bark_dialogue_templates` considerando el `commander_id`, contexto de trigger (`low_hp`, `enemy_near_miss`, `trap_ambush`, `scop_activated`, etc.), fase de partida y nivel de afinidad (`bonding_level`). Si el vínculo es $\ge 3$, interpola el nombre real del jugador; si es inferior, utiliza "Cadete".

### 3.9 Diagnóstico Balístico Near-Miss y Oferta Flash de Tilt
- `process_post_match_near_miss`: Identifica derrotas ajustadas con oponente superviviente por margen mínimo y calcula la telemetría contrafáctica bajo la progresión horizontal de Tiers T1–T5 (+2% por tier).
- `evaluate_match_tilt_and_offer`: Emite la oferta relámpago en `tilt_emergency_offers` por \$0.99 con expiración en **180 segundos** y cooldown de 48 horas.

### 3.10 Otorgamiento Atómico de Recompensas Post-Partida (`grant_match_rewards`)
*Implementación de Referencia:* `supabase/migrations/20261031000015_offline_progression_and_transport_persistence.sql`, `supabase/migrations/20261031000021_offline_soft_cap_and_tournament_parity.sql`, `src/shared/services/playerDatabaseService.ts`.
Asienta los resultados de combate, actualiza el balance de cuenta y controla la progresión:
- **Parámetros:** `p_match_id`, `p_user_id`, `p_is_victory`, `p_turns_count`, `p_enemies_destroyed`, `p_is_offline`, `p_bot_difficulty`, `p_is_tournament`.
- **Lógica de Ejecución:**
  1. Si `p_is_offline = true`:
     - Audita la fecha actual (`CURRENT_DATE`) respecto a `last_offline_match_date`. Si cambió el día, reinicia `daily_offline_matches_count = 0`.
     - Incrementa `daily_offline_matches_count = daily_offline_matches_count + 1`.
     - Aplica el **Soft Cap Logístico en 4 Tramos** ($\mu(k) = [0.60, 0.30, 0.10, 0.02]$):
       * $k \le 3$: $\mu = 1.0$ ($100\%$).
       * $k = 4$: $\mu = 0.60$ ($60\%$).
       * $k = 5$: $\mu = 0.30$ ($30\%$).
       * $k = 6$: $\mu = 0.10$ ($10\%$).
       * $k \ge 7$: $\mu = 0.02$ ($2\%$).
     - Aplica el factor de dificultad del bot ($0.85\times, 1.0\times, 1.20\times$) y garantiza un **suelo mínimo inviolable** de $+5\text{ XP}$ y $+10\text{ Créditos}$.
     - Fija $\Delta\text{Trofeos} = 0$.
  2. Si `p_is_offline = false`: Otorga el 100% del botín y actualiza `elo_rating` o `elo_rating_esports` según el modo.
  3. Ejecuta la subida de nivel de cuenta evaluando la función potencial $\text{XP}_{\text{Req}}(N) = \lfloor 150 \times N^{1.85} \rfloor$.
  4. Registra los créditos otorgados en `currency_ledger` con `currency_type = 'battle_credits'`.

### 3.11 Acreditación de Actividad Competitiva (`rpc_credit_competitive_activity`)
*Implementación de Referencia:* `supabase/migrations/20261031000020_legendary_decay_and_reconnection.sql`.
- **Parámetros:** `p_user_id UUID`.
- **Lógica de Ejecución:**
  1. Consulta `trophies_count` y `decay_bank_days` del perfil con bloqueo pesimista `FOR UPDATE`.
  2. Determina el tope de días de gracia según la división de Liga:
     - Liga I ($4,000 - 4,499$): Tope 5 días.
     - Liga II ($4,500 - 4,999$): Tope 4 días.
     - Liga III ($\ge 5,000$): Tope 3 días.
  3. Incrementa `decay_bank_days` en $+1$ clamped al tope de la liga y actualiza `last_competitive_match_at = NOW()`.

### 3.12 Degradación Diaria por Inactividad en Ligas Legendarias (`cron_process_legendary_trophy_decay`)
*Implementación de Referencia:* `supabase/migrations/20261031000020_legendary_decay_and_reconnection.sql`.
- **Ejecución Programada:** `00:00 UTC` diario vía `pg_cron` sobre perfiles con $\ge 4,000$ trofeos.
- **Lógica de Ejecución:**
  1. Si `decay_bank_days > 0`: Consume 1 día de gracia (`decay_bank_days = decay_bank_days - 1`) sin penalizar trofeos.
  2. Si `decay_bank_days = 0`:
     - Liga III ($\ge 5,000$): Drena $-60\text{ trofeos/día}$ (Piso inviolable: $4,500$).
     - Liga II ($4,500 - 4,999$): Drena $-40\text{ trofeos/día}$ (Piso inviolable: $4,500$).
     - Liga I ($4,000 - 4,499$): Drena $-25\text{ trofeos/día}$ (Piso inviolable: $4,000$).
  3. Actualiza `last_decay_processed_at = NOW()`.

### 3.13 Resincronización Atómica de Partida PvP (`rpc_get_match_snapshot`)
*Implementación de Referencia:* `supabase/migrations/20261031000020_legendary_decay_and_reconnection.sql`.
- **Parámetros:** `p_match_id UUID`.
- **Propósito:** Dump de estado $O(1)$ para reconexión instantánea tras caída de red.
- **Retorno JSON:** Agrupa registro de partida, lista de participantes (con `is_connected` y `disconnect_grace_bank_sec`), proyección de niebla autoritativa (`visible_units`, `visible_properties`), fondos propios, medidor de CO power, clima actual y semilla pseudo-aleatoria de turno.

### 3.14 Rehidratación de Snapshots de Turno y Buffer de Deltas (`rpc_reconnect_match_state`)
*Implementación de Referencia:* `supabase/migrations/20261031000022_reconnection_snapshots_and_full_catalog.sql`, `src/domains/tactics/hooks/useMatchSync.ts`.
- **Estructura de Almacenamiento:**
  - `match_turn_snapshots`: Almacena el `TurnSnapshot` completo indexado por `(match_id, turn_number)`.
  - `match_action_deltas`: Buffer transaccional de `DeltaAction` con secuencia monotónica `(match_id, turn_number, sequence_id)`.
- **Función RPC:** `rpc_reconnect_match_state(p_match_id UUID, p_client_turn INTEGER, p_client_last_seq INTEGER)`.
- **Retorno:** Entrega el último snapshot íntegro si el cliente está desfasado de turno, o la secuencia de deltas incrementales si el cliente está en el mismo turno pero perdió paquetes.

### 3.15 Liquidación de Pérdidas de Combate Territorial y Reciclaje 35% (`settle_territorial_combat_losses` & `resolve_combat_attrition_and_salvage`)
*Implementación de Referencia:* `supabase/migrations/20261103000001_master_metagame_v2_rework.sql`, `supabase/migrations/20261104000001_geotactics_alpha_siege_and_venezuela_seed.sql` y `supabase/migrations/20261109_territorial_vulnerability_windows.sql`.
- **Firmas Soportadas:**
  - `settle_territorial_combat_losses(p_user_id UUID, p_destroyed_units JSONB, p_battle_session_id UUID DEFAULT NULL)`
  - `settle_territorial_combat_losses(p_region_id TEXT, p_destroyed_deployment_ids TEXT[], p_salvage_ratio NUMERIC DEFAULT 0.35)`
- **Lógica de Ejecución (Pilar 6):**
  1. Itera sobre las unidades destruidas, omitiendo el Kit de Supervivencia Básico gratuito (`infantry`, `recon` T1).
  2. Elimina físicamente la unidad destruida de `user_unit_hangar` o `tactical_spatial_deployments`.
  3. Calcula el **35% exacto del valor material de la unidad en chatarra tecnológica (`tech_scrap`)** y destruye el **65% restante como sumidero permanente**.
  4. Acredita el `tech_scrap` en `user_industrial_inventory` o tesorería logística y actualiza el contador operativo regional.

### 3.16 Encolado de Producción con Tiempos Físicos (`queue_unit_production`)
*Implementación de Referencia:* `supabase/migrations/20261105000001_geotactics_strategic_nodes_and_queues.sql`, `src/domains/economy/hooks/useUserHangar.ts`.
- **Parámetros:** `p_unit_code TEXT`, `p_tier INT DEFAULT 1`, `p_destination TEXT DEFAULT 'user'`.
- **Lógica de Ejecución:**
  1. Determina los costes de materiales y el tiempo base de fabricación según el arquetipo (ej. 300s para neotanques, 0s para kit básico).
  2. Valida fondos de Créditos Energéticos (`EC`) y stock de aleaciones del usuario. Si el destino es `'faction'`, valida que el usuario sea miembro de un clan.
  3. Deduce los materiales inmediatamente.
  4. Inserta el registro en `unit_production_queue` con `started_at = NOW()` y `ready_at = NOW() + duration_seconds`.

### 3.17 Reclamo Atómico de Tropas Terminadas (`claim_finished_unit`)
*Implementación de Referencia:* `supabase/migrations/20261105000001_geotactics_strategic_nodes_and_queues.sql`, `src/domains/economy/hooks/useUserHangar.ts`.
- **Parámetros:** `p_queue_id UUID`.
- **Lógica de Ejecución:**
  1. Bloquea la fila en `unit_production_queue` con `FOR UPDATE`.
  2. Verifica que `ready_at <= NOW()` y `is_claimed = false`.
  3. Marca `is_claimed = true`.
  4. Incrementa el stock en `user_unit_hangar` (verificando límite de 16 unidades) si `destination = 'user'`, o en `faction_unit_hangar` con `ON CONFLICT DO UPDATE SET stock_quantity = stock_quantity + 1` si `destination = 'faction'`.

### 3.18 Declaración de Asedio, Refuerzos T+4 y Resolución Territorial (`execute_territory_attack_declaration`, `deploy_reinforcements_to_battle`, `process_battle_territory_outcome` & `calculate_and_apply_territorial_upkeep`)
*Implementación de Referencia:* `supabase/migrations/20261103000002_territorial_metagame_sovereignty_p2p_aw.sql` y `supabase/migrations/20261103000003_v2_canonical_consolidation.sql`.
- `execute_territory_attack_declaration`: Verifica adyacencia topológica, abre el **Human Handshake de 120 segundos** (`siege_handshake_expires_at = NOW() + INTERVAL '120 seconds'`) y cambia la provincia a `'contested'`.
- `deploy_reinforcements_to_battle`: Inyecta tropas adicionales desde la reserva del almacén con **latencia logística estricta de 4 rondas (`arrival_turn = turn_number + 4`)**.
- `process_battle_territory_outcome`: Deduce Puntos de Control Territorial (TCP; 10,000 en provincia regular, 15,000 en Capital). Al llegar a 0 TCP, transfiere la soberanía De Facto con periodo de gracia de 24h (`occupied_grace`) y aplica el **Buff Regional de +5%** si es Capital.
- `calculate_and_apply_territorial_upkeep`: Evalúa el mantenimiento exponencial anti-blobbing ($1.12^{\max(0, N-3)}$) y activa `is_in_blackout = true` (-50% rendimiento y búnker degradado a Nivel 1) en caso de impago.

### 3.19 Ventanas de Vulnerabilidad Territorial (`check_territorial_vulnerability` & `update_territorial_vulnerability_window`)
*Implementación de Referencia:* `supabase/migrations/20261109_territorial_vulnerability_windows.sql`.
- `check_territorial_vulnerability(p_region_id TEXT)`: Evalúa en tiempo real UTC si la región se encuentra dentro de su ventana diaria de asedio de 2 a 4 horas (promoviendo automáticamente cambios pendientes cuyo cooldown de 48h haya expirado) y retorna `is_vulnerable`, `current_utc_hour`, `window_start_utc_hour` y `window_end_utc_hour`.
- `update_territorial_vulnerability_window(p_region_id TEXT, p_new_start_utc_hour SMALLINT, p_new_duration_hours SMALLINT)`: Restringida a líderes/oficiales del clan soberano; programa el nuevo horario con **cooldown anti-evasión de 48 horas** (`pending_effective_at = NOW() + INTERVAL '48 hours'`).

### 3.20 Gobernanza de Manifiesto de Catálogos SSOT (`get_catalog_manifest_header` & `refresh_catalog_manifest`)
*Implementación de Referencia:* `supabase/migrations/20261108_system_catalog_manifest.sql`, `src/shared/services/catalogRegistryService.ts`.
- `get_catalog_manifest_header()`: Consulta ultraligera $O(1)$ que devuelve `version_tag`, `content_hash` y `updated_at` sin transferir el payload JSONB completo.
- `refresh_catalog_manifest(p_version_tag VARCHAR)`: Recopila atómicamente `units_catalog`, `terrain_catalog` y `unit_weapon_damage_matrix`, calcula el hash criptográfico `encode(digest(bundle::text, 'sha256'), 'hex')` y actualiza la fila única (`id = 1`) en `system_catalog_manifest`.

---

# 4. POLÍTICAS DE SEGURIDAD (ROW LEVEL SECURITY - RLS)

Todas las tablas operan bajo `ENABLE ROW LEVEL SECURITY`:
- **Lectura Pública de Catálogos, Manifiesto y Geografía:** `SELECT` permitido para todos (`anon` y `authenticated`) sobre `units_catalog`, `terrain_catalog`, `unit_weapon_damage_matrix`, `system_catalog_manifest`, `commanders_catalog`, `cosmetics_catalog`, `maps`, `commander_bonding_rewards_catalog`, `p2p_price_reference`, `world_countries`, `world_provinces`, `territory_control`, `regions`, `region_adjacencies`, `region_sovereignty`, `strategic_nodes`, `state_sovereignty`, `tactical_spatial_deployments`, `tactical_fief_constructions`, `region_operational_state` y `territorial_vulnerability_windows`.
- **RBAC de Soberanía Estatal (`state_sovereignty`):** Mutaciones (`INSERT`, `UPDATE`) protegidas por la función `public.is_sovereignty_authorized(controlling_clan_id)` (`SECURITY DEFINER`), que verifica que el usuario autenticado pertenezca al clan controlador con rol `'leader'`, `'commander'` o `'marshal'`.
- **Despliegues Espaciales y Construcciones de Feudos (`tactical_spatial_deployments`, `tactical_fief_constructions`):** Escritura permitida a comandantes autenticados; actualización y borrado restringidos al propietario (`owner_user_id = auth.uid()` o `owner_user_id IS NULL` en semillas iniciales).
- **Inventario, Progresión y Hangares Personales (16 Unidades):** Aislados estrictamente al propietario (`auth.uid() = user_id`) en `user_unit_hangar`, `user_patents`, `user_chest_slots`, `user_industrial_inventory`, `user_industrial_plots`, `user_stranded_cargo`, `industrial_refining_jobs`, `user_cosmetics` y `player_tactical_behavior_profile`.
- **Hangar de Facción y Colas:**
  - `faction_unit_hangar`: Lectura pública para telemetría de mapa; mutaciones restringidas a RPCs autoritativas.
  - `unit_production_queue`: Lectura permitida al propietario del encargo o a compañeros de su clan.
- **Aislamiento Estricto de Chat (`chat_messages`):**
  - Canal `global`: Lectura para cualquier usuario autenticado sin veto activo.
  - Canal `clan`: Restringido a miembros del mismo clan.
  - Canal `match_team`: Restringido a participantes de la partida activa.
  - Canal `match_dm`: Exclusivo para el emisor y el destinatario (`sender_id = auth.uid() OR recipient_id = auth.uid()`).
- **Partidas Activas y Niebla:** Vistas de niebla aisladas en `match_player_views` para prevenir ataques de lectura de memoria (Map-Hacking). Las mutaciones del tablero y asedios se ejecutan a través de funciones RPC securizadas (`SECURITY DEFINER`).

---

# 5. PERSISTENCIA REALTIME Y GOBERNANZA DE CATÁLOGOS SSOT (ARQUITECTURA MODULAR DE 4 DOMINIOS + SHARED)

### 5.1 Mapa Modular de Servicios y Hooks de Base de Datos
Toda interacción con Supabase está desacoplada en los 4 dominios canónicos y la capa compartida:
- **Shared (`src/shared/`):**
  - `src/shared/types/database.types.ts` y `src/shared/types/metagame.ts`: Contratos tipados de tablas, vistas, RPCs y constantes de los 7 pilares (`MASTER_METAGAME_CONSTANTS`).
  - `src/shared/lib/supabase/client.ts`, `src/shared/lib/supabase/realtime.ts`, `src/shared/lib/supabase/server.ts`: Clientes Supabase y gestor de canales WebSocket.
  - `src/shared/services/playerDatabaseService.ts` (`playerDb`): Perfil, inventario industrial, parcelas (`user_industrial_plots`), mercado P2P y recompensas.
  - `src/shared/services/matchDatabaseService.ts` (`matchDb`): Cola de emparejamiento, estado de partida, deltas y snapshots.
  - `src/shared/services/catalogRegistryService.ts` (`catalogRegistry`): Gobernanza $O(1)$ de catálogos y hot-patching desde `system_catalog_manifest`.
- **Dominio World (`src/domains/world/`):**
  - `src/domains/world/services/stateSovereigntyService.ts`: Soberanía estatal (`state_sovereignty`) con suscripción CDC Realtime.
  - `src/domains/world/services/spatialDeploymentService.ts`: Despliegues en celdas WGS84 de 20m (`tactical_spatial_deployments`) y construcciones (`tactical_fief_constructions`) con suscripción CDC filtrada por región.
  - `src/domains/world/hooks/useTerritoryMap.ts` y `src/domains/world/hooks/useSiegeRealtime.ts`: Telemetría geopolítica y alertas de asedio con Handshake de 120s.
- **Dominio Economy (`src/domains/economy/`):**
  - `src/domains/economy/services/fiefBuildingService.ts`: Gestión de feudos de clan e infraestructura in-situ.
  - `src/domains/economy/hooks/useUserHangar.ts`: Almacén físico de 16 unidades (`user_unit_hangar`), hangar de facción (`faction_unit_hangar`), colas (`unit_production_queue`) y liquidación del 35% de `tech_scrap`.
  - `src/domains/economy/hooks/useUserIndustry.ts` y `src/domains/economy/hooks/useTerritoryEconomyTicker.ts`: Ciclo de 10 parcelas (`user_industrial_plots`), refinado y ticker horario.
- **Dominio Tactics (`src/domains/tactics/`):**
  - `src/domains/tactics/services/operationalUnitsService.ts` y `src/domains/tactics/core/operationalUnitsEngine.ts`: Divisiones operacionales en teatro y cinemática geodésica.
  - `src/domains/tactics/hooks/useMatchSync.ts`: Sincronización de turnos, deltas y reconexión vía `rpc_reconnect_match_state`.
  - `src/domains/tactics/components/GeotacticsLoadingScreen.ts`: Verificación de `get_catalog_manifest_header()` durante el arranque táctico.

### 5.2 Persistencia Realtime en Teatro Operacional (Cabimas / Zulia `REG_VE_02`)
*Implementación de Referencia:* `supabase/migrations/20261107_theatre_cabimas_realtime.sql`, `src/domains/world/services/spatialDeploymentService.ts` y `src/domains/world/services/stateSovereigntyService.ts`.
- **`tactical_spatial_deployments`:** Persiste las divisiones militares desplegadas sobre la cuadrícula analítica WGS84 a microescala ($z \ge 15$, celdas de 20 m). Restricción `UNIQUE(region_id, cell_key)` que previene colisiones espaciales concurrentes.
- **`tactical_fief_constructions`:** Persiste la infraestructura in-situ de feudos tácticos (refinerías, fundiciones de microchips, bases de radar y terminales portuarias) con su durabilidad, nivel y costes horarios.
- **`region_operational_state`:** Persiste el estado de preparación militar, DEFCON, cuotas de peaje y actividad de asedio.
- **`REPLICA IDENTITY FULL` y Canal CDC:** Las tablas `state_sovereignty`, `tactical_spatial_deployments`, `tactical_fief_constructions` y `region_operational_state` operan con `REPLICA IDENTITY FULL` dentro de `supabase_realtime`, haciendo streaming en `theatre:${regionId}` y `sovereignty:global` mediante eventos `postgres_changes` (`INSERT`, `UPDATE`, `DELETE`) sin polling HTTP.

### 5.3 Catálogos Estáticos Compilados con Hot-Reloading vía Manifiesto SSOT
*Implementación de Referencia:* `supabase/migrations/20261108_system_catalog_manifest.sql`, `scripts/syncCatalogsFromDb.ts`, `src/shared/services/catalogRegistryService.ts` y `src/domains/tactics/components/GeotacticsLoadingScreen.ts`.
- **Dilema Resuelto:** Se elimina el compromiso entre latencia de red y flexibilidad de balance.
  - En combate y pathfinding a 60 FPS: consultas sincrónicas en memoria ($O(1)$ < 0.05 ms por lookup).
  - Como Single Source of Truth (SSOT): PostgreSQL almacena las tablas canónicas (`units_catalog`, `terrain_catalog`, `unit_weapon_damage_matrix`, etc.).
- **`system_catalog_manifest`:** Tabla que consolida un hash SHA-256 (`content_hash`) y el payload JSON del estado actual de balance (`bundle_json`).
- **Mecanismo Anti-Drift:**
  - Build-time: `npm run sync:catalogs` ejecuta `scripts/syncCatalogsFromDb.ts` para compilar los catálogos estáticos base (`catalogs.generated.ts`).
  - Runtime: `GeotacticsLoadingScreen` (`src/domains/tactics/components/GeotacticsLoadingScreen.ts`) invoca `catalogRegistry.verifyAndSyncWithRemoteManifest(300)` que verifica `get_catalog_manifest_header()` (< 300 ms). Si detecta un nuevo hash, descarga el delta consolidado y aplica el parche reactivo en caliente (`applyDynamicPatch`) sin requerir redespliegue del frontend.
  - Offline-First: Si Supabase es inaccesible, el motor opera con el 100% de capacidades utilizando los catálogos compilados o la caché local previa en `localStorage`.

# VOLUMEN 4: ESQUEMA MAESTRO DE BASE DE DATOS Y SEGURIDAD (SUPABASE / POSTGRESQL)
**Documento Canónico Unificado:** `04_MASTER_DATABASE_AND_SECURITY_SPEC.md`  
**Proyecto:** *Tactical Command: Wars of Legacy*  
**Versión:** 5.0.0-DEFINITIVE-MASTER-SPEC  
**Estado:** Documento de Verdad Absoluta (SSOT - Single Source of Truth)  
**Archivos Consolidados y Reemplazados:**  
- `02_DATABASE_SCHEMA.md` (Completo)  
- `07_DATABASE_INFRASTRUCTURE_PLAN.md` (Completo)  
- Todos los scripts DDL y RPCs de migraciones 13 a 22, Migración 26 (`geotactics_alpha_siege_and_venezuela_seed`) y Migración 27 (`geotactics_strategic_nodes_and_queues`).

---

# 1. ARQUITECTURA DE DATOS RELACIONAL Y EXTENSIONES

El backend opera sobre **PostgreSQL 15+ en Supabase** con soporte para replicación en tiempo real (Supabase Realtime WebSockets) y seguridad a nivel de fila (Row Level Security - RLS).

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
    -- LEGACY (Migrado a user_unit_hangar según Axioma 1):
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

### 2.2 Catálogos Canónicos Inmutables
```sql
-- 3. TABLA: units_catalog
CREATE TABLE public.units_catalog (
    id VARCHAR(32) PRIMARY KEY,
    display_name VARCHAR(64) NOT NULL,
    category VARCHAR(24) NOT NULL CHECK (category IN ('infantry', 'vehicle', 'indirect', 'aircraft', 'naval')),
    hp_max INTEGER NOT NULL DEFAULT 10,
    base_attack INTEGER NOT NULL DEFAULT 55,
    min_range INTEGER NOT NULL DEFAULT 1,
    max_range INTEGER NOT NULL DEFAULT 1,
    movement_points INTEGER NOT NULL DEFAULT 3,
    movement_type VARCHAR(24) NOT NULL CHECK (movement_type IN ('foot', 'mech', 'wheels', 'treads', 'air', 'sea')),
    vision_range INTEGER NOT NULL DEFAULT 3,
    production_cost_g INTEGER NOT NULL DEFAULT 1000,
    ammo_max INTEGER NOT NULL DEFAULT 9,
    fuel_max INTEGER NOT NULL DEFAULT 99,
    required_account_level INTEGER NOT NULL DEFAULT 1,
    unlock_cost_credits INTEGER NOT NULL DEFAULT 0,
    is_base_unlocked BOOLEAN NOT NULL DEFAULT true,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
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

### 2.3 Sistema de Comandantes y Bark Engine
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
```

### 2.4 Complejo Industrial, Refinado y Mercado P2P
```sql
-- 7. TABLA: user_industrial_inventory
CREATE TABLE public.user_industrial_inventory (
    user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
    raw_iron INTEGER NOT NULL DEFAULT 500 CHECK (raw_iron >= 0),
    raw_stone INTEGER NOT NULL DEFAULT 500 CHECK (raw_stone >= 0),
    raw_rare_earth INTEGER NOT NULL DEFAULT 100 CHECK (raw_rare_earth >= 0),
    refined_steel INTEGER NOT NULL DEFAULT 50 CHECK (refined_steel >= 0),
    refined_concrete INTEGER NOT NULL DEFAULT 50 CHECK (refined_concrete >= 0),
    refined_microchip INTEGER NOT NULL DEFAULT 10 CHECK (refined_microchip >= 0),
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

-- 9. TABLA: p2p_market_listings
CREATE TABLE public.p2p_market_listings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    seller_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    resource_type VARCHAR(32) NOT NULL CHECK (resource_type IN ('refined_steel', 'refined_concrete', 'refined_microchip')),
    quantity INTEGER NOT NULL CHECK (quantity > 0 AND quantity <= 1000),
    price_per_unit INTEGER NOT NULL CHECK (price_per_unit > 0),
    total_price INTEGER NOT NULL CHECK (total_price > 0),
    status VARCHAR(16) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'sold', 'cancelled', 'expired')),
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (timezone('utc'::text, now()) + interval '48 hours'),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX idx_p2p_market_active ON public.p2p_market_listings(resource_type, status, price_per_unit ASC);
```

### 2.5 Partidas, Tablero en Vivo y Telemetría
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

-- 12. TABLA: match_history
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

-- 14.1 TABLA: user_industrial_plots (Cuadrícula Territorial de 10 Parcelas - Migración 13)
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

### 2.6 Corporaciones Militares (Clanes) y Guerra
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
```

### 2.7 Salvaguarda Táctica y Ofertas Flash por Tilt
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
    reward_cards_amount INTEGER NOT NULL DEFAULT 100,
    reward_steel_amount INTEGER NOT NULL DEFAULT 30,
    stripe_session_id VARCHAR(128),
    status VARCHAR(16) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'purchased', 'expired')),
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX idx_tilt_offers_user ON public.tilt_emergency_offers(user_id, status);
```

### 2.8 Geopolítica, Topología Alice y Asedios Territoriales (Migración 26)
```sql
-- 19. TABLA: regions (Topología Geopolítica Alice de GEOTACTICS)
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

-- 20. TABLA: region_adjacencies (Grafo Topológico Comprimido)
CREATE TABLE public.region_adjacencies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    from_region_id TEXT NOT NULL REFERENCES public.regions(id) ON DELETE CASCADE,
    to_region_id TEXT NOT NULL REFERENCES public.regions(id) ON DELETE CASCADE,
    is_strait_crossing BOOLEAN NOT NULL DEFAULT FALSE,
    toll_fee_ec INTEGER NOT NULL DEFAULT 0 CHECK (toll_fee_ec >= 0),
    CONSTRAINT uq_region_pair UNIQUE (from_region_id, to_region_id)
);

CREATE INDEX idx_region_adj_from ON public.region_adjacencies(from_region_id);
CREATE INDEX idx_region_adj_to ON public.region_adjacencies(to_region_id);

-- 21. TABLA: region_sovereignty (Control Político, Escudos y TCP)
CREATE TABLE public.region_sovereignty (
    region_id TEXT PRIMARY KEY REFERENCES public.regions(id) ON DELETE CASCADE,
    controlling_clan_id UUID REFERENCES public.clans(id) ON DELETE SET NULL,
    current_tcp INTEGER NOT NULL DEFAULT 10000 CHECK (current_tcp >= 0 AND current_tcp <= 10000),
    shield_active_until TIMESTAMPTZ DEFAULT NULL,
    tax_rate_percent NUMERIC(4,2) NOT NULL DEFAULT 5.00 CHECK (tax_rate_percent >= 0.00 AND tax_rate_percent <= 25.00),
    last_upkeep_paid_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW())
);

CREATE INDEX idx_region_sovereignty_clan ON public.region_sovereignty(controlling_clan_id);

-- 22. TABLA: territorial_battle_sessions (Instancias de Asedio Territorial)
CREATE TABLE public.territorial_battle_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    region_id TEXT NOT NULL REFERENCES public.regions(id) ON DELETE CASCADE,
    attacker_clan_id UUID NOT NULL REFERENCES public.clans(id) ON DELETE CASCADE,
    defender_clan_id UUID REFERENCES public.clans(id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'handshake_pending' CHECK (status IN ('handshake_pending', 'in_progress', 'attacker_won', 'defender_won', 'expired_draw')),
    handshake_deadline TIMESTAMPTZ NOT NULL DEFAULT (TIMEZONE('utc', NOW()) + INTERVAL '120 seconds'),
    battle_instance_id TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW()),
    resolved_at TIMESTAMPTZ
);

CREATE INDEX idx_territorial_battles_region ON public.territorial_battle_sessions(region_id, status);
CREATE INDEX idx_territorial_battles_status ON public.territorial_battle_sessions(status);
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

---

# 3. CATÁLOGO MAESTRO DE FUNCIONES RPC ALMACENADAS (ACID)

Todas las operaciones de estado crítico se ejecutan dentro del motor relacional bajo transacciones ACID aseguradas con `SECURITY DEFINER`:

### 3.1 Emparejamiento Multi-Modo Unificado (`join_matchmaking_queue`)
*Implementación de Referencia:* `supabase/migrations/20261031000014_unified_matchmaking_and_ranked_ladder.sql`.
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

### 3.3 Compra P2P con Impuesto Municipal del 12% y Escrow Anti-Deadlock (`execute_p2p_purchase`)
*Implementación de Referencia:* `supabase/migrations/20261031000013_economy_idle_rework_territorial_plots.sql`.
Ejecuta la transferencia de materiales procesados entre comprador (`auth.uid()`) y vendedor aplicando bloqueo determinista ordenado (`p_buyer_id < p_seller_id`) para erradicar condiciones de carrera:
- Deduce el 100% de los créditos del comprador.
- Retiene el impuesto de quema deflacionario del $12\%$ (`v_tax := FLOOR(total * 0.12)`).
- Transfiere al vendedor el saldo neto restante ($88\%$).
- Transfiere el inventario procesado al comprador.
- Asienta el movimiento en `currency_ledger` con `reason = 'p2p_market_buy'`.

### 3.4 Cosecha Territorial con Ciclo Circadiano de 16h (`harvest_industrial_territory`)
*Implementación de Referencia:* `supabase/migrations/20261031000013_economy_idle_rework_territorial_plots.sql`.
Calcula la producción territorial de las 10 parcelas con evaluación perezosa $O(1)$:
- Si la recolección ocurre dentro de la ventana de 16 horas (12h base + 4h gracia), aplica el **Bono de Eficiencia Logística (+10% recursos y +500 Créditos)**.
- Si excede las 16 horas, aplica merma suavizada del $1.5\%$/hora con piso al 60%.
- El **70% de los recursos perdidos se transfieren automáticamente a `user_stranded_cargo`** (Convoy Varado de Salvamento), permitiendo al jugador recuperarlos sin coste ganando combates en el Frente.

### 3.5 Reconfiguración y Adquisición de Parcelas (`reconfigure_industrial_plot` & `acquire_industrial_plot`)
Permite cambiar el tipo de empresa de una parcela previa demolición con 50% de reembolso de materiales, o adquirir parcelas adicionales según el nivel de cuenta alcanzado.

### 3.6 Liquidador Autónomo del Banco Central NPC (`fulfill_stale_p2p_orders`)
Función cron/RPC que inspecciona órdenes P2P estancadas con más de 6 horas activas. El Banco Central de Intendencia Militar absorbe los materiales al precio medio de mercado y transfiere los fondos al vendedor deduciendo la tasa municipal.

### 3.7 Intercambio de Trofeos Elo, Escudo de Descenso y Season Reset (`calculate_trophy_exchange`)
*Implementación de Referencia:* `supabase/migrations/20261031000014_unified_matchmaking_and_ranked_ladder.sql`.
- Aplica el Factor K dinámico (K=40 en Arena 1 descendiendo hasta K=20 en Ligas Legendarias).
- A partir de Arena 6 (2,000 Trofeos), opera bajo suma cero estricta (sin inflación artificial).
- Si el jugador va a descender de arena, consume 1 carga del **Escudo de Descenso Dinámico** (hasta 3 cargas por ciclo) preservando el piso de la división.
- Protocolo de compresión estacional no lineal ejecutado cada 28 días.

### 3.8 Selección Contextual de Diálogo Cómic (`rpc_get_contextual_bark`)
Realiza un muestreo estocástico ponderado $O(1)$ sobre `bark_dialogue_templates` considerando el `commander_id`, contexto de trigger (`low_hp`, `enemy_near_miss`, `trap_ambush`, `scop_activated`, etc.), fase de partida y nivel de afinidad (`bonding_level`). Si el vínculo es $\ge 3$, interpola el nombre real del jugador; si es inferior, utiliza "Cadete".

### 3.9 Diagnóstico Balístico Near-Miss y Oferta Flash de Tilt
- `process_post_match_near_miss`: Identifica derrotas ajustadas con oponente en $\le 2$ HP y prepara la telemetría contrafáctica a Nivel 11.
- `evaluate_match_tilt_and_offer`: Emite la oferta relámpago en `tilt_emergency_offers` por \$0.99 con expiración en **180 segundos** y cooldown de 48 horas.

### 3.10 Otorgamiento Atómico de Recompensas Post-Partida (`grant_match_rewards`)
*Implementación de Referencia:* `supabase/migrations/20261031000015_offline_progression_and_transport_persistence.sql` y `supabase/migrations/20261031000021_offline_soft_cap_and_tournament_parity.sql`.
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
*Implementación de Referencia:* `supabase/migrations/20261031000022_reconnection_snapshots_and_full_catalog.sql`, `src/hooks/useMatchSync.ts`.
- **Estructura de Almacenamiento:**
  - `match_turn_snapshots`: Almacena el `TurnSnapshot` completo indexado por `(match_id, turn_number)`.
  - `match_action_deltas`: Buffer transaccional de `DeltaAction` con secuencia monotónica `(match_id, turn_number, sequence_id)`.
- **Función RPC:** `rpc_reconnect_match_state(p_match_id UUID, p_client_turn INTEGER, p_client_last_seq INTEGER)`.
- **Retorno:** Entrega el último snapshot íntegro si el cliente está desfasado de turno, o la secuencia de deltas incrementales si el cliente está en el mismo turno pero perdió paquetes.

### 3.15 Liquidación de Pérdidas de Combate Territorial (`settle_territorial_combat_losses`)
*Implementación de Referencia:* `supabase/migrations/20261104000001_geotactics_alpha_siege_and_venezuela_seed.sql`.
- **Parámetros:** `p_user_id UUID`, `p_destroyed_units JSONB`, `p_battle_session_id UUID DEFAULT NULL`.
- **Lógica de Ejecución:**
  1. Itera sobre el array de unidades destruidas (`p_destroyed_units`), validando código y tier.
  2. Descuenta de forma atómica el stock en `user_unit_hangar` (omitiendo infantería ligera y recon básicos F2P).
  3. Calcula el 35% de los costes de materiales en chatarra balística (`tech_scrap`).
  4. Acredita el `tech_scrap` en `user_industrial_inventory`.
  5. Si se especifica `p_battle_session_id`, vincula la liquidación con la auditoría del asedio.

### 3.16 Encolado de Producción con Tiempos Físicos (`queue_unit_production`)
*Implementación de Referencia:* `supabase/migrations/20261105000001_geotactics_strategic_nodes_and_queues.sql`.
- **Parámetros:** `p_unit_code TEXT`, `p_tier INT DEFAULT 1`, `p_destination TEXT DEFAULT 'user'`.
- **Lógica de Ejecución:**
  1. Determina los costes de materiales y el tiempo base de fabricación según el arquetipo (ej. 300s para neotanques, 0s para kit básico).
  2. Valida fondos de Créditos Energéticos (`EC`) y stock de aleaciones del usuario. Si el destino es `'faction'`, valida que el usuario sea miembro de un clan.
  3. Deduce los materiales inmediatamente.
  4. Inserta el registro en `unit_production_queue` con `started_at = NOW()` y `ready_at = NOW() + duration_seconds`.

### 3.17 Reclamo Atómico de Tropas Terminadas (`claim_finished_unit`)
*Implementación de Referencia:* `supabase/migrations/20261105000001_geotactics_strategic_nodes_and_queues.sql`.
- **Parámetros:** `p_queue_id UUID`.
- **Lógica de Ejecución:**
  1. Bloquea la fila en `unit_production_queue` con `FOR UPDATE`.
  2. Verifica que `ready_at <= NOW()` y `is_claimed = false`.
  3. Marca `is_claimed = true`.
  4. Incrementa el stock en `user_unit_hangar` si `destination = 'user'`, o en `faction_unit_hangar` con `ON CONFLICT DO UPDATE SET stock_quantity = stock_quantity + 1` si `destination = 'faction'`.

---

# 4. POLÍTICAS DE SEGURIDAD (ROW LEVEL SECURITY - RLS)

Todas las tablas operan bajo `ENABLE ROW LEVEL SECURITY`:
- **Lectura Pública de Catálogos y Geografía:** `SELECT` permitido para todos sobre `units_catalog`, `commanders_catalog`, `cosmetics_catalog`, `maps`, `commander_bonding_rewards_catalog`, `p2p_price_reference`, `regions`, `region_adjacencies`, `region_sovereignty` y `strategic_nodes`.
- **Inventario, Progresión y Hangares Personales:** Aislados estrictamente al propietario (`auth.uid() = user_id`) en `user_unit_hangar`, `user_chest_slots`, `user_industrial_inventory`, `user_industrial_plots`, `user_stranded_cargo`, `industrial_refining_jobs`, `user_cosmetics` y `player_tactical_behavior_profile`.
- **Hangar de Facción y Colas:**
  - `faction_unit_hangar`: Lectura pública para telemetría de mapa; mutaciones restringidas a RPCs autoritativas.
  - `unit_production_queue`: Lectura permitida al propietario del encargo o a compañeros de su clan.
- **Aislamiento Estricto de Chat (`chat_messages`):**
  - Canal `global`: Lectura para cualquier usuario autenticado sin veto activo.
  - Canal `clan`: Restringido a miembros del mismo clan.
  - Canal `match_team`: Restringido a participantes de la partida activa.
  - Canal `match_dm`: Exclusivo para el emisor y el destinatario (`sender_id = auth.uid() OR recipient_id = auth.uid()`).
- **Partidas Activas y Niebla:** Vistas de niebla aisladas en `match_player_views` para prevenir ataques de lectura de memoria (Map-Hacking). Las mutaciones del tablero y asedios se ejecutan a través de funciones RPC securizadas (`SECURITY DEFINER`).

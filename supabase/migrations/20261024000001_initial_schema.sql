-- ============================================================================
-- MIGRACIÓN 1: ESQUEMA INICIAL DE TABLAS, CLAVES Y ÍNDICES
-- Proyecto: Tactical Command: Wars of Legacy
-- Fecha: 2026-10-24
-- ============================================================================

-- Habilitar extensiones requeridas para identificadores únicos y criptografía
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ----------------------------------------------------------------------------
-- 1. TABLA: profiles
-- Perfil de cuenta vinculado 1:1 con auth.users
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    username VARCHAR(32) NOT NULL,
    avatar_url TEXT DEFAULT 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=150',
    account_level INTEGER NOT NULL DEFAULT 1 CHECK (account_level >= 1 AND account_level <= 100),
    current_xp INTEGER NOT NULL DEFAULT 0 CHECK (current_xp >= 0),
    battle_credits INTEGER NOT NULL DEFAULT 500 CHECK (battle_credits >= 0),
    command_gems INTEGER NOT NULL DEFAULT 50 CHECK (command_gems >= 0),
    elo_rating INTEGER NOT NULL DEFAULT 1200 CHECK (elo_rating >= 0),
    total_matches_played INTEGER NOT NULL DEFAULT 0 CHECK (total_matches_played >= 0),
    total_victories INTEGER NOT NULL DEFAULT 0 CHECK (total_victories >= 0),
    equipped_loadout JSONB NOT NULL DEFAULT '["infantry", "mech", "recon", "tank_light", "artillery", "anti_air", "b_copter"]'::jsonb,
    equipped_cosmetics JSONB NOT NULL DEFAULT '{
        "tank_light": "skin_default",
        "infantry": "skin_default",
        "artillery": "skin_default",
        "avatar_frame": "frame_recruit",
        "hq_banner": "banner_standard"
    }'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT uq_profiles_username UNIQUE (username)
);

CREATE INDEX IF NOT EXISTS idx_profiles_elo ON public.profiles(elo_rating DESC);
CREATE INDEX IF NOT EXISTS idx_profiles_level ON public.profiles(account_level DESC);

-- ----------------------------------------------------------------------------
-- 2. TABLA: units_catalog
-- Catálogo inmutable de unidades tácticas y estadísticas de combate
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.units_catalog (
    id VARCHAR(32) PRIMARY KEY,
    display_name VARCHAR(64) NOT NULL,
    category VARCHAR(24) NOT NULL CHECK (category IN ('infantry', 'vehicle', 'indirect', 'aircraft', 'naval')),
    hp_max INTEGER NOT NULL DEFAULT 10 CHECK (hp_max > 0),
    base_attack INTEGER NOT NULL DEFAULT 55 CHECK (base_attack > 0),
    min_range INTEGER NOT NULL DEFAULT 1 CHECK (min_range >= 1),
    max_range INTEGER NOT NULL DEFAULT 1 CHECK (max_range >= min_range),
    movement_points INTEGER NOT NULL DEFAULT 3 CHECK (movement_points >= 1),
    movement_type VARCHAR(24) NOT NULL CHECK (movement_type IN ('foot', 'mech', 'wheels', 'treads', 'air', 'sea')),
    vision_range INTEGER NOT NULL DEFAULT 3 CHECK (vision_range >= 1),
    production_cost_g INTEGER NOT NULL DEFAULT 1000 CHECK (production_cost_g >= 0),
    ammo_max INTEGER NOT NULL DEFAULT 9 CHECK (ammo_max >= 0),
    fuel_max INTEGER NOT NULL DEFAULT 99 CHECK (fuel_max >= 0),
    required_account_level INTEGER NOT NULL DEFAULT 1 CHECK (required_account_level >= 1),
    unlock_cost_credits INTEGER NOT NULL DEFAULT 0 CHECK (unlock_cost_credits >= 0),
    is_base_unlocked BOOLEAN NOT NULL DEFAULT true,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_units_catalog_category ON public.units_catalog(category);
CREATE INDEX IF NOT EXISTS idx_units_catalog_base_unlocked ON public.units_catalog(is_base_unlocked);

-- ----------------------------------------------------------------------------
-- 3. TABLA: user_unlocks
-- Registro de propiedad de variantes de unidades y cosméticos por usuario
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_unlocks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    item_type VARCHAR(32) NOT NULL CHECK (item_type IN ('unit', 'skin', 'avatar', 'co_commander', 'banner')),
    item_id VARCHAR(64) NOT NULL,
    acquisition_method VARCHAR(32) NOT NULL CHECK (acquisition_method IN ('level_reward', 'credits_purchase', 'gems_purchase', 'battle_pass', 'starter')),
    unlocked_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT uq_user_unlock UNIQUE(user_id, item_type, item_id)
);

CREATE INDEX IF NOT EXISTS idx_user_unlocks_user_type ON public.user_unlocks(user_id, item_type);

-- ----------------------------------------------------------------------------
-- 4. TABLA: active_matches
-- Encabezado de partidas activas (PvP Realtime, Asíncrono o vs Bot)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.active_matches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    room_code VARCHAR(8) UNIQUE NOT NULL,
    player1_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    player2_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    current_turn_player_id UUID REFERENCES public.profiles(id),
    status VARCHAR(24) NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'in_progress', 'finished', 'abandoned')),
    game_mode VARCHAR(24) NOT NULL DEFAULT 'pvp_realtime' CHECK (game_mode IN ('pvp_realtime', 'pvp_async', 'vs_bot')),
    bot_difficulty VARCHAR(16) DEFAULT NULL CHECK (bot_difficulty IN ('easy', 'normal', 'hard')),
    map_id VARCHAR(64) NOT NULL DEFAULT 'crossfire_valley_16x16',
    turn_number INTEGER NOT NULL DEFAULT 1 CHECK (turn_number >= 1),
    turn_time_limit_sec INTEGER NOT NULL DEFAULT 120 CHECK (turn_time_limit_sec >= 30),
    turn_deadline TIMESTAMPTZ,
    winner_id UUID REFERENCES public.profiles(id),
    resigned_player_id UUID REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_active_matches_status ON public.active_matches(status);
CREATE INDEX IF NOT EXISTS idx_active_matches_p1 ON public.active_matches(player1_id);
CREATE INDEX IF NOT EXISTS idx_active_matches_p2 ON public.active_matches(player2_id);
CREATE INDEX IF NOT EXISTS idx_active_matches_room_code ON public.active_matches(room_code);

-- ----------------------------------------------------------------------------
-- 5. TABLA: match_state
-- Representación en tiempo real del tablero de juego serializado en JSONB
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.match_state (
    match_id UUID PRIMARY KEY REFERENCES public.active_matches(id) ON DELETE CASCADE,
    grid_width INTEGER NOT NULL DEFAULT 16 CHECK (grid_width >= 8 AND grid_width <= 32),
    grid_height INTEGER NOT NULL DEFAULT 16 CHECK (grid_height >= 8 AND grid_height <= 32),
    tiles JSONB NOT NULL,
    units JSONB NOT NULL,
    properties JSONB NOT NULL,
    player_funds JSONB NOT NULL DEFAULT '{"player1": 1000, "player2": 1000}'::jsonb,
    co_power_gauge JSONB NOT NULL DEFAULT '{"player1": 0, "player2": 0}'::jsonb,
    fog_of_war_enabled BOOLEAN NOT NULL DEFAULT true,
    last_action_seq INTEGER NOT NULL DEFAULT 0 CHECK (last_action_seq >= 0),
    action_log JSONB NOT NULL DEFAULT '[]'::jsonb,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- ----------------------------------------------------------------------------
-- 6. TABLA: match_history
-- Auditoría inmutable de partidas completadas para analíticas y rankings
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.match_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    match_id UUID NOT NULL,
    player1_id UUID NOT NULL REFERENCES public.profiles(id),
    player2_id UUID REFERENCES public.profiles(id),
    winner_id UUID REFERENCES public.profiles(id),
    end_reason VARCHAR(32) NOT NULL CHECK (end_reason IN ('hq_captured', 'army_wiped', 'resignation', 'timeout')),
    total_turns INTEGER NOT NULL CHECK (total_turns >= 1),
    duration_seconds INTEGER NOT NULL CHECK (duration_seconds >= 0),
    game_mode VARCHAR(24) NOT NULL,
    p1_xp_awarded INTEGER NOT NULL DEFAULT 0,
    p2_xp_awarded INTEGER NOT NULL DEFAULT 0,
    p1_credits_awarded INTEGER NOT NULL DEFAULT 0,
    p2_credits_awarded INTEGER NOT NULL DEFAULT 0,
    final_stats JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_match_history_p1 ON public.match_history(player1_id);
CREATE INDEX IF NOT EXISTS idx_match_history_p2 ON public.match_history(player2_id);
CREATE INDEX IF NOT EXISTS idx_match_history_created_at ON public.match_history(created_at DESC);

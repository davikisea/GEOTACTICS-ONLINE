-- ============================================================================
-- MIGRACIÓN 10: PROGRESIÓN, CARTAS, COFRES, COMMAND PASS 50 NIVELES Y SOCIAL
-- Proyecto: Tactical Command: Wars of Legacy
-- Fecha: 2026-10-31
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. AMPLIACIÓN DE profiles (Trofeos, Mazo Canónico 10 Cartas, PTE, Clanes)
-- ----------------------------------------------------------------------------
ALTER TABLE public.profiles
    ADD COLUMN IF NOT EXISTS trophies_count INTEGER NOT NULL DEFAULT 0 CHECK (trophies_count >= 0),
    ADD COLUMN IF NOT EXISTS highest_trophies INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS average_turn_seconds NUMERIC(5,2) NOT NULL DEFAULT 25.0,
    ADD COLUMN IF NOT EXISTS pte_profile VARCHAR(16) NOT NULL DEFAULT 'standard' CHECK (pte_profile IN ('blitz', 'standard', 'calculated')),
    ADD COLUMN IF NOT EXISTS clan_id UUID DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS selected_commander_id VARCHAR(32) NOT NULL DEFAULT 'vance' REFERENCES public.commanders_catalog(id),
    ADD COLUMN IF NOT EXISTS equipped_deck JSONB NOT NULL DEFAULT '["infantry", "mech", "recon", "tank_light", "artillery", "anti_air", "b_copter", "tank_medium", "fighter", "rocket"]'::jsonb;

-- ----------------------------------------------------------------------------
-- 2. TABLA: user_cards (Colección de Cartas de Unidades, Nvl 1-15 y Duplicados)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_cards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    unit_code VARCHAR(32) NOT NULL REFERENCES public.units_catalog(id) ON DELETE RESTRICT,
    card_level INTEGER NOT NULL DEFAULT 1 CHECK (card_level BETWEEN 1 AND 15),
    cards_count INTEGER NOT NULL DEFAULT 1 CHECK (cards_count >= 0),
    equipped_skin_id VARCHAR(64) NOT NULL DEFAULT 'skin_default',
    favorite BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT uq_user_unit_card UNIQUE (user_id, unit_code)
);

ALTER TABLE public.user_cards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_cards_select_own" ON public.user_cards FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- ----------------------------------------------------------------------------
-- 3. TABLA: user_decks (Ranuras de Mazo 1 a 5 con Comandante)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_decks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    slot_index INTEGER NOT NULL CHECK (slot_index BETWEEN 1 AND 5),
    deck_name VARCHAR(32) NOT NULL DEFAULT 'Mazo Táctico 1',
    commander_id VARCHAR(32) NOT NULL REFERENCES public.commanders_catalog(id),
    unit_codes VARCHAR(32)[] NOT NULL CHECK (
        array_length(unit_codes, 1) = 10
        AND unit_codes[1] = 'infantry'
        AND unit_codes[2] = 'mech'
    ),
    is_active BOOLEAN NOT NULL DEFAULT false,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT uq_user_deck_slot UNIQUE (user_id, slot_index)
);

ALTER TABLE public.user_decks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_decks_select_own" ON public.user_decks FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- ----------------------------------------------------------------------------
-- 4. TABLA: user_chest_slots (4 Ranuras con Reloj de Desbloqueo)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_chest_slots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    slot_index INTEGER NOT NULL CHECK (slot_index BETWEEN 1 AND 4),
    chest_type VARCHAR(24) NOT NULL CHECK (chest_type IN ('wood', 'iron', 'armored', 'legendary')),
    arena_tier INTEGER NOT NULL DEFAULT 1 CHECK (arena_tier BETWEEN 1 AND 10),
    status VARCHAR(16) NOT NULL DEFAULT 'locked' CHECK (status IN ('locked', 'unlocking', 'ready')),
    unlock_started_at TIMESTAMPTZ DEFAULT NULL,
    unlock_duration_seconds INTEGER NOT NULL CHECK (unlock_duration_seconds > 0),
    queued_for_auto_unlock BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT uq_user_chest_slot UNIQUE (user_id, slot_index)
);

ALTER TABLE public.user_chest_slots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_chest_slots_select_own" ON public.user_chest_slots FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- ----------------------------------------------------------------------------
-- 5. TABLAS: seasons_catalog, command_pass_tiers, command_pass_progress
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.seasons_catalog (
    id VARCHAR(32) PRIMARY KEY,
    name VARCHAR(64) NOT NULL,
    theme_commander_id VARCHAR(32) REFERENCES public.commanders_catalog(id),
    starts_at TIMESTAMPTZ NOT NULL,
    ends_at TIMESTAMPTZ NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT false
);

ALTER TABLE public.seasons_catalog ENABLE ROW LEVEL SECURITY;
CREATE POLICY "seasons_select_all" ON public.seasons_catalog FOR SELECT USING (true);

CREATE TABLE IF NOT EXISTS public.command_pass_tiers (
    season_id VARCHAR(32) NOT NULL REFERENCES public.seasons_catalog(id) ON DELETE CASCADE,
    tier_number INTEGER NOT NULL CHECK (tier_number BETWEEN 1 AND 50),
    required_badges INTEGER NOT NULL,
    free_reward_json JSONB NOT NULL,
    premium_reward_json JSONB NOT NULL,
    PRIMARY KEY (season_id, tier_number)
);

ALTER TABLE public.command_pass_tiers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pass_tiers_select_all" ON public.command_pass_tiers FOR SELECT USING (true);

CREATE TABLE IF NOT EXISTS public.command_pass_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    season_id VARCHAR(32) NOT NULL REFERENCES public.seasons_catalog(id) ON DELETE CASCADE,
    battle_badges_points INTEGER NOT NULL DEFAULT 0 CHECK (battle_badges_points >= 0),
    current_tier INTEGER NOT NULL DEFAULT 0 CHECK (current_tier BETWEEN 0 AND 50),
    is_premium_purchased BOOLEAN NOT NULL DEFAULT false,
    premium_purchased_at TIMESTAMPTZ DEFAULT NULL,
    claimed_free_tiers INTEGER[] NOT NULL DEFAULT ARRAY[]::INTEGER[],
    claimed_premium_tiers INTEGER[] NOT NULL DEFAULT ARRAY[]::INTEGER[],
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT uq_user_season_pass UNIQUE (user_id, season_id)
);

ALTER TABLE public.command_pass_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pass_progress_select_own" ON public.command_pass_progress FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- ----------------------------------------------------------------------------
-- 6. TABLAS: quests_catalog, user_quest_progress, user_war_room_progress
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.quests_catalog (
    id VARCHAR(64) PRIMARY KEY,
    quest_scope VARCHAR(16) NOT NULL CHECK (quest_scope IN ('daily', 'weekly', 'season', 'achievement')),
    title VARCHAR(64) NOT NULL,
    description TEXT NOT NULL,
    objective_type VARCHAR(32) NOT NULL,
    target_value INTEGER NOT NULL CHECK (target_value > 0),
    reward_badges INTEGER NOT NULL DEFAULT 5,
    reward_credits INTEGER NOT NULL DEFAULT 100,
    reward_gems INTEGER NOT NULL DEFAULT 0
);

ALTER TABLE public.quests_catalog ENABLE ROW LEVEL SECURITY;
CREATE POLICY "quests_select_all" ON public.quests_catalog FOR SELECT USING (true);

CREATE TABLE IF NOT EXISTS public.user_quest_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    quest_id VARCHAR(64) NOT NULL REFERENCES public.quests_catalog(id) ON DELETE CASCADE,
    current_value INTEGER NOT NULL DEFAULT 0 CHECK (current_value >= 0),
    is_completed BOOLEAN NOT NULL DEFAULT false,
    is_claimed BOOLEAN NOT NULL DEFAULT false,
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    expires_at TIMESTAMPTZ DEFAULT NULL
);

ALTER TABLE public.user_quest_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_quests_select_own" ON public.user_quest_progress FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.user_war_room_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    mission_id VARCHAR(64) NOT NULL,
    commander_used_id VARCHAR(32) NOT NULL REFERENCES public.commanders_catalog(id),
    best_turns INTEGER NOT NULL,
    speed_score INTEGER NOT NULL CHECK (speed_score BETWEEN 0 AND 100),
    power_score INTEGER NOT NULL CHECK (power_score BETWEEN 0 AND 100),
    technique_score INTEGER NOT NULL CHECK (technique_score BETWEEN 0 AND 100),
    total_score INTEGER NOT NULL CHECK (total_score BETWEEN 0 AND 300),
    rank_grade VARCHAR(2) NOT NULL CHECK (rank_grade IN ('S', 'A', 'B', 'C')),
    first_clear_claimed BOOLEAN NOT NULL DEFAULT true,
    s_rank_reward_claimed BOOLEAN NOT NULL DEFAULT false,
    completed_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT uq_user_war_room_mission UNIQUE (user_id, mission_id)
);

ALTER TABLE public.user_war_room_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY "war_room_select_own" ON public.user_war_room_progress FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- ----------------------------------------------------------------------------
-- 7. TABLAS: clans, clan_members, chat_messages, user_relationships
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.clans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(32) UNIQUE NOT NULL,
    tag VARCHAR(8) UNIQUE NOT NULL,
    description TEXT DEFAULT '',
    badge_icon VARCHAR(32) NOT NULL DEFAULT 'shield_star',
    total_trophies INTEGER NOT NULL DEFAULT 0,
    required_trophies INTEGER NOT NULL DEFAULT 0,
    members_count INTEGER NOT NULL DEFAULT 1 CHECK (members_count BETWEEN 1 AND 50),
    leader_id UUID NOT NULL REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.clans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "clans_select_all" ON public.clans FOR SELECT USING (true);

CREATE TABLE IF NOT EXISTS public.clan_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clan_id UUID NOT NULL REFERENCES public.clans(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    role VARCHAR(16) NOT NULL DEFAULT 'member' CHECK (role IN ('leader', 'co_leader', 'elder', 'member')),
    donated_cards_weekly INTEGER NOT NULL DEFAULT 0,
    joined_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT uq_clan_member UNIQUE (user_id)
);

ALTER TABLE public.clan_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "clan_members_select_all" ON public.clan_members FOR SELECT USING (true);

CREATE TABLE IF NOT EXISTS public.chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    channel_type VARCHAR(16) NOT NULL CHECK (channel_type IN ('global', 'clan', 'match_team', 'match_dm')),
    channel_id VARCHAR(64) NOT NULL,
    sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    message_text VARCHAR(500) NOT NULL,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "chat_messages_select_channel" ON public.chat_messages FOR SELECT TO authenticated USING (true);

CREATE TABLE IF NOT EXISTS public.user_relationships (
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    target_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    relation_type VARCHAR(16) NOT NULL CHECK (relation_type IN ('friend_pending', 'friend_accepted', 'blocked_muted')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    PRIMARY KEY (user_id, target_user_id),
    CHECK (user_id <> target_user_id)
);

ALTER TABLE public.user_relationships ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_relationships_select_own" ON public.user_relationships FOR SELECT TO authenticated
    USING (auth.uid() = user_id OR auth.uid() = target_user_id);

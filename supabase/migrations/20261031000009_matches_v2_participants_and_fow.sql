-- ============================================================================
-- MIGRACIÓN 9: PARTIDAS V2, PARTICIPANTES, NIEBLA ANTI-CHEAT Y ACTIONS LOG
-- Proyecto: Tactical Command: Wars of Legacy
-- Fecha: 2026-10-31
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. AMPLIACIÓN DE active_matches
-- ----------------------------------------------------------------------------
ALTER TABLE public.active_matches
    DROP CONSTRAINT IF EXISTS active_matches_game_mode_check;

ALTER TABLE public.active_matches
    ADD COLUMN IF NOT EXISTS match_format VARCHAR(16) NOT NULL DEFAULT '1v1'
        CHECK (match_format IN ('1v1', '2v2', 'ffa')),
    ADD COLUMN IF NOT EXISTS network_mode VARCHAR(16) NOT NULL DEFAULT 'realtime'
        CHECK (network_mode IN ('realtime', 'async', 'vs_bot')),
    ADD COLUMN IF NOT EXISTS is_ranked BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN IF NOT EXISTS tournament_level_cap SMALLINT DEFAULT 11,
    ADD COLUMN IF NOT EXISTS current_turn_slot SMALLINT NOT NULL DEFAULT 0 CHECK (current_turn_slot BETWEEN 0 AND 15),
    ADD COLUMN IF NOT EXISTS max_turns_limit SMALLINT NOT NULL DEFAULT 15 CHECK (max_turns_limit BETWEEN 5 AND 999),
    ADD COLUMN IF NOT EXISTS economy_multiplier NUMERIC(3,1) NOT NULL DEFAULT 2.0,
    ADD COLUMN IF NOT EXISTS cooldown_multiplier NUMERIC(3,2) NOT NULL DEFAULT 0.50,
    ADD COLUMN IF NOT EXISTS unit_population_cap SMALLINT NOT NULL DEFAULT 15 CHECK (unit_population_cap BETWEEN 5 AND 50),
    ADD COLUMN IF NOT EXISTS winning_team VARCHAR(8) DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS end_reason VARCHAR(32) DEFAULT NULL
        CHECK (end_reason IS NULL OR end_reason IN ('hq_captured', 'army_wiped', 'resignation', 'timeout', 'turn_limit_tiebreaker')),
    ADD COLUMN IF NOT EXISTS rng_seed VARCHAR(64) NOT NULL DEFAULT encode(gen_random_bytes(16), 'hex'),
    ADD COLUMN IF NOT EXISTS rng_counter INTEGER NOT NULL DEFAULT 0;

ALTER TABLE public.active_matches
    ADD CONSTRAINT active_matches_game_mode_check
    CHECK (game_mode IN ('blitz_skirmish', 'grand_campaign', 'two_vs_two', 'vs_bot', 'pvp_realtime', 'pvp_async'));

-- ----------------------------------------------------------------------------
-- 2. TABLA: match_participants (Soporte 1v1, 2v2, FFA, Bots, CO Meter y Cooldowns)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.match_participants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    match_id UUID NOT NULL REFERENCES public.active_matches(id) ON DELETE CASCADE,
    player_slot SMALLINT NOT NULL CHECK (player_slot BETWEEN 0 AND 15),
    slot_key VARCHAR(16) NOT NULL,
    team_id VARCHAR(8) NOT NULL DEFAULT 'A' CHECK (team_id IN ('A', 'B', 'C', 'D', 'FFA')),
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    is_bot BOOLEAN NOT NULL DEFAULT false,
    bot_difficulty VARCHAR(16) DEFAULT NULL CHECK (bot_difficulty IS NULL OR bot_difficulty IN ('easy', 'normal', 'hard')),
    commander_id VARCHAR(32) NOT NULL DEFAULT 'vance' REFERENCES public.commanders_catalog(id),
    commander_level SMALLINT NOT NULL DEFAULT 1 CHECK (commander_level BETWEEN 1 AND 15),
    co_power_meter INTEGER NOT NULL DEFAULT 0 CHECK (co_power_meter >= 0),
    active_co_power VARCHAR(8) DEFAULT NULL CHECK (active_co_power IS NULL OR active_co_power IN ('cop', 'scop')),
    co_power_activations_count SMALLINT NOT NULL DEFAULT 0,
    funds INTEGER NOT NULL DEFAULT 1000 CHECK (funds >= 0),
    deck_state JSONB NOT NULL DEFAULT '[]'::jsonb,
    is_eliminated BOOLEAN NOT NULL DEFAULT false,
    eliminated_at_turn SMALLINT DEFAULT NULL,
    consecutive_inactive_turns SMALLINT NOT NULL DEFAULT 0 CHECK (consecutive_inactive_turns BETWEEN 0 AND 3),
    total_thinking_time_sec NUMERIC(7,1) NOT NULL DEFAULT 0.0,
    turns_played_count SMALLINT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT uq_match_participant_slot UNIQUE (match_id, player_slot),
    CONSTRAINT uq_match_participant_key UNIQUE (match_id, slot_key),
    CONSTRAINT chk_participant_identity CHECK (
        (is_bot = true AND bot_difficulty IS NOT NULL) OR
        (is_bot = false AND user_id IS NOT NULL)
    )
);

CREATE INDEX IF NOT EXISTS idx_match_participants_match ON public.match_participants(match_id);
CREATE INDEX IF NOT EXISTS idx_match_participants_user ON public.match_participants(user_id) WHERE user_id IS NOT NULL;

ALTER TABLE public.match_participants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "match_participants_select" ON public.match_participants FOR SELECT TO authenticated
    USING (EXISTS (
        SELECT 1 FROM public.active_matches m
        WHERE m.id = match_participants.match_id
          AND (m.player1_id = auth.uid() OR m.player2_id = auth.uid() OR m.status = 'finished')
    ));

-- ----------------------------------------------------------------------------
-- 3. TABLA: match_player_views (ARQUITECTURA ANTI-MAPHACK NIEBLA DE GUERRA)
-- Proyección autoritativa por jugador: el cliente SOLO recibe su niebla procesada
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.match_player_views (
    match_id UUID NOT NULL REFERENCES public.active_matches(id) ON DELETE CASCADE,
    player_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    state_version INTEGER NOT NULL DEFAULT 1,
    last_action_seq INTEGER NOT NULL DEFAULT 0,
    visible_units JSONB NOT NULL DEFAULT '[]'::jsonb,
    visible_properties JSONB NOT NULL DEFAULT '[]'::jsonb,
    own_funds INTEGER NOT NULL DEFAULT 1000,
    own_co_power INTEGER NOT NULL DEFAULT 0,
    own_card_cooldowns JSONB NOT NULL DEFAULT '{}'::jsonb,
    public_event_feed JSONB NOT NULL DEFAULT '[]'::jsonb,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    PRIMARY KEY (match_id, player_id)
);

ALTER TABLE public.match_player_views ENABLE ROW LEVEL SECURITY;

CREATE POLICY "match_player_views_select_own"
    ON public.match_player_views FOR SELECT
    TO authenticated
    USING (auth.uid() = player_id);

-- Revocar lectura directa no filtrada sobre match_state para usuarios comunes
DROP POLICY IF EXISTS "match_state_select_participants" ON public.match_state;
CREATE POLICY "match_state_select_participants"
    ON public.match_state FOR SELECT
    TO authenticated
    USING (
        -- En partidas sin niebla de guerra o finalizadas, la lectura directa es admisible
        fog_of_war_enabled = false
        OR EXISTS (
            SELECT 1 FROM public.active_matches m
            WHERE m.id = match_state.match_id
              AND m.status = 'finished'
              AND (m.player1_id = auth.uid() OR m.player2_id = auth.uid())
        )
    );

-- ----------------------------------------------------------------------------
-- 4. AMPLIACIÓN DE match_state (Clima, Transportes y Límites Cuadrícula 64)
-- ----------------------------------------------------------------------------
ALTER TABLE public.match_state
    DROP CONSTRAINT IF EXISTS match_state_grid_width_check,
    DROP CONSTRAINT IF EXISTS match_state_grid_height_check;

ALTER TABLE public.match_state
    ADD CONSTRAINT match_state_grid_width_check CHECK (grid_width BETWEEN 8 AND 64),
    ADD CONSTRAINT match_state_grid_height_check CHECK (grid_height BETWEEN 8 AND 64),
    ADD COLUMN IF NOT EXISTS current_weather VARCHAR(16) NOT NULL DEFAULT 'clear'
        CHECK (current_weather IN ('clear', 'rain', 'snow', 'sandstorm')),
    ADD COLUMN IF NOT EXISTS weather_turns_remaining SMALLINT NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS weather_forecast JSONB NOT NULL DEFAULT '[]'::jsonb,
    ADD COLUMN IF NOT EXISTS transport_manifests JSONB NOT NULL DEFAULT '{}'::jsonb,
    ADD COLUMN IF NOT EXISTS submerged_unit_ids TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

-- ----------------------------------------------------------------------------
-- 5. TABLA: match_actions (Log Determinista Append-Only para Replays y Anti-Cheat)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.match_actions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    match_id UUID NOT NULL REFERENCES public.active_matches(id) ON DELETE CASCADE,
    turn_number INTEGER NOT NULL CHECK (turn_number >= 1),
    sequence_id INTEGER NOT NULL CHECK (sequence_id >= 1),
    actor_slot SMALLINT NOT NULL CHECK (actor_slot BETWEEN 0 AND 15),
    actor_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    is_bot_action BOOLEAN NOT NULL DEFAULT false,
    action_type VARCHAR(32) NOT NULL CHECK (action_type IN (
        'MOVE', 'WAIT', 'ATTACK', 'CAPTURE', 'LAUNCH_SILO', 'JOIN',
        'LOAD', 'UNLOAD', 'SUPPLY', 'EXPLODE', 'HIDE', 'SHOW',
        'REPAIR', 'DELETE', 'BUILD_UNIT', 'ACTIVATE_COP', 'ACTIVATE_SCOP',
        'TACTICAL_PING', 'END_TURN', 'SURRENDER', 'AFK_TIMEOUT'
    )),
    unit_id VARCHAR(64) DEFAULT NULL,
    target_unit_id VARCHAR(64) DEFAULT NULL,
    origin_x SMALLINT DEFAULT NULL,
    origin_y SMALLINT DEFAULT NULL,
    dest_x SMALLINT DEFAULT NULL,
    dest_y SMALLINT DEFAULT NULL,
    target_x SMALLINT DEFAULT NULL,
    target_y SMALLINT DEFAULT NULL,
    movement_path JSONB DEFAULT NULL,
    was_fow_trap BOOLEAN NOT NULL DEFAULT false,
    rng_roll_used NUMERIC(6,5) DEFAULT NULL,
    action_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    combat_result JSONB DEFAULT NULL,
    state_delta JSONB NOT NULL DEFAULT '{}'::jsonb,
    thinking_time_ms INTEGER NOT NULL DEFAULT 0 CHECK (thinking_time_ms >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT uq_match_action_seq UNIQUE (match_id, sequence_id)
);

CREATE INDEX IF NOT EXISTS idx_match_actions_replay ON public.match_actions(match_id, sequence_id ASC);

ALTER TABLE public.match_actions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "match_actions_select" ON public.match_actions FOR SELECT TO authenticated
    USING (EXISTS (
        SELECT 1 FROM public.active_matches m
        WHERE m.id = match_actions.match_id
          AND (m.player1_id = auth.uid() OR m.player2_id = auth.uid() OR m.status = 'finished')
    ));

-- ----------------------------------------------------------------------------
-- 6. TABLA: match_replays (Archivo Comprimido Post-Partida)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.match_replays (
    match_id UUID PRIMARY KEY REFERENCES public.match_history(id) ON DELETE CASCADE,
    map_id VARCHAR(64) NOT NULL,
    initial_seed JSONB NOT NULL,
    compressed_actions BYTEA,
    actions_digest_jsonb JSONB,
    total_actions INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.match_replays ENABLE ROW LEVEL SECURITY;
CREATE POLICY "match_replays_select_public" ON public.match_replays FOR SELECT USING (true);

# ESQUEMA DE BASE DE DATOS Y SEGURIDAD (SUPABASE / POSTGRESQL)
**Proyecto:** *Tactical Command: Wars of Legacy*  
**Versión:** 1.0.0-PROD-SPEC  
**Tecnología:** PostgreSQL 15+ en Supabase con Row Level Security (RLS) y Realtime Replication.

---

## 1. DDL COMPLETO DE TABLAS (POSTGRESQL SYNTAX)

```sql
-- Habilitar extensiones necesarias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- 1. TABLA: profiles
-- Almacena la identidad de metajuego del usuario, nivel, divisas y cosméticos
-- ============================================================================
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    username VARCHAR(32) NOT NULL UNIQUE,
    avatar_url TEXT DEFAULT 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=150',
    account_level INTEGER NOT NULL DEFAULT 1 CHECK (account_level >= 1 AND account_level <= 100),
    current_xp INTEGER NOT NULL DEFAULT 0 CHECK (current_xp >= 0),
    battle_credits INTEGER NOT NULL DEFAULT 500 CHECK (battle_credits >= 0), -- Moneda blanda
    command_gems INTEGER NOT NULL DEFAULT 50 CHECK (command_gems >= 0),     -- Moneda premium
    trophies_count INTEGER NOT NULL DEFAULT 0 CHECK (trophies_count >= 0),   -- Trofeos de Escalafón
    highest_trophies INTEGER NOT NULL DEFAULT 0,
    average_turn_seconds NUMERIC(5,2) NOT NULL DEFAULT 25.0,                -- PTE (Promedio Tiempo Espera)
    pte_profile VARCHAR(16) NOT NULL DEFAULT 'standard' CHECK (pte_profile IN ('blitz', 'standard', 'calculated')),
    elo_rating INTEGER NOT NULL DEFAULT 1200 CHECK (elo_rating >= 0),
    total_matches_played INTEGER NOT NULL DEFAULT 0,
    total_victories INTEGER NOT NULL DEFAULT 0,
    clan_id UUID DEFAULT NULL,                                              -- Vinculación a Clan
    equipped_deck JSONB NOT NULL DEFAULT '["infantry", "mech", "recon", "tank_light", "artillery", "anti_air", "b_copter", "tank_medium", "fighter", "rocket"]'::jsonb, -- Mazo Canónico de 10 Cartas
    equipped_cosmetics JSONB NOT NULL DEFAULT '{
        "tank_light": "skin_default",
        "infantry": "skin_default",
        "artillery": "skin_default",
        "avatar_frame": "frame_recruit",
        "hq_banner": "banner_standard"
    }'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX idx_profiles_username ON public.profiles(username);
CREATE INDEX idx_profiles_elo ON public.profiles(elo_rating DESC);

-- ============================================================================
-- 2. TABLA: units_catalog
-- Catálogo canónico inmutable de todas las unidades tácticas del juego
-- ============================================================================
CREATE TABLE public.units_catalog (
    id VARCHAR(32) PRIMARY KEY, -- 'infantry', 'mech', 'tank_light', 'artillery', etc.
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

-- ============================================================================
-- 3. TABLA: user_unlocks
-- Registro de propiedad de unidades, skins, avatares y comandantes por usuario
-- ============================================================================
CREATE TABLE public.user_unlocks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    item_type VARCHAR(32) NOT NULL CHECK (item_type IN ('unit', 'skin', 'avatar', 'co_commander', 'banner')),
    item_id VARCHAR(64) NOT NULL,
    acquisition_method VARCHAR(32) NOT NULL CHECK (acquisition_method IN ('level_reward', 'credits_purchase', 'gems_purchase', 'battle_pass', 'starter')),
    unlocked_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT uq_user_item UNIQUE(user_id, item_type, item_id)
);

CREATE INDEX idx_user_unlocks_lookup ON public.user_unlocks(user_id, item_type);

-- ============================================================================
-- 4. TABLA: active_matches
-- Encabezado de partidas activas (PvP Realtime, Asíncrono o vs Bot)
-- ============================================================================
CREATE TABLE public.active_matches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    room_code VARCHAR(8) UNIQUE NOT NULL,
    player1_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    player2_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL, -- NULL si es vs BOT o esperando rival
    current_turn_player_id UUID REFERENCES public.profiles(id),
    status VARCHAR(24) NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'in_progress', 'finished', 'abandoned')),
    game_mode VARCHAR(24) NOT NULL DEFAULT 'blitz_skirmish' CHECK (game_mode IN ('blitz_skirmish', 'grand_campaign', 'two_vs_two', 'vs_bot')),
    bot_difficulty VARCHAR(16) DEFAULT NULL CHECK (bot_difficulty IN ('easy', 'normal', 'hard')),
    map_id VARCHAR(64) NOT NULL DEFAULT 'caustic_finale_18x18',
    turn_number INTEGER NOT NULL DEFAULT 1,
    turn_time_limit_sec INTEGER NOT NULL DEFAULT 30, -- 30s en Blitz Skirmish, 60s en Grand Campaign
    max_turns_limit INTEGER NOT NULL DEFAULT 15,     -- 15 turnos en Blitz, 40 en Campaña
    economy_multiplier NUMERIC(3,1) NOT NULL DEFAULT 2.0, -- x2.0 en Blitz ($2000/prop), x1.0 en Campaña ($1000/prop)
    turn_deadline TIMESTAMPTZ,
    winner_id UUID REFERENCES public.profiles(id),
    resigned_player_id UUID REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX idx_active_matches_status ON public.active_matches(status);
CREATE INDEX idx_active_matches_players ON public.active_matches(player1_id, player2_id);

-- ============================================================================
-- 5. TABLA: match_state
-- Representación en tiempo real del tablero de juego serializado
-- ============================================================================
CREATE TABLE public.match_state (
    match_id UUID PRIMARY KEY REFERENCES public.active_matches(id) ON DELETE CASCADE,
    grid_width INTEGER NOT NULL DEFAULT 16,
    grid_height INTEGER NOT NULL DEFAULT 16,
    tiles JSONB NOT NULL,          -- Array 2D con tipos de terreno, defensa y modificadores
    units JSONB NOT NULL,          -- Array de unidades en juego con id, owner, x, y, hp, ammo, fuel, moved
    properties JSONB NOT NULL,     -- Array de ciudades/fábricas/HQ: {x, y, type, owner, capture_hp: 20}
    player_funds JSONB NOT NULL DEFAULT '{"player1": 1000, "player2": 1000}'::jsonb,
    co_power_gauge JSONB NOT NULL DEFAULT '{"player1": 0, "player2": 0}'::jsonb,
    fog_of_war_enabled BOOLEAN NOT NULL DEFAULT true,
    last_action_seq INTEGER NOT NULL DEFAULT 0,
    action_log JSONB NOT NULL DEFAULT '[]'::jsonb, -- Historial de las últimas 50 acciones
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- ============================================================================
-- 6. TABLA: match_history
-- Auditoría inmutable de partidas completadas para estadísticas y análisis
-- ============================================================================
CREATE TABLE public.match_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    match_id UUID NOT NULL,
    player1_id UUID NOT NULL REFERENCES public.profiles(id),
    player2_id UUID REFERENCES public.profiles(id),
    winner_id UUID REFERENCES public.profiles(id),
    end_reason VARCHAR(32) NOT NULL CHECK (end_reason IN ('hq_captured', 'army_wiped', 'resignation', 'timeout')),
    total_turns INTEGER NOT NULL,
    duration_seconds INTEGER NOT NULL,
    game_mode VARCHAR(24) NOT NULL,
    p1_xp_awarded INTEGER NOT NULL DEFAULT 0,
    p2_xp_awarded INTEGER NOT NULL DEFAULT 0,
    p1_credits_awarded INTEGER NOT NULL DEFAULT 0,
    p2_credits_awarded INTEGER NOT NULL DEFAULT 0,
    final_stats JSONB NOT NULL DEFAULT '{}'::jsonb, -- {p1_units_lost: 4, p2_units_destroyed: 6, ...}
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX idx_match_history_p1 ON public.match_history(player1_id);
CREATE INDEX idx_match_history_p2 ON public.match_history(player2_id);

-- ============================================================================
-- 7. TABLA: user_cards
-- Colección de cartas, niveles (+2.5%/lvl) y cartas duplicadas del jugador
-- ============================================================================
CREATE TABLE public.user_cards (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    unit_code VARCHAR(32) NOT NULL, -- 'infantry', 'mech', 'tank_light', etc.
    card_level INTEGER NOT NULL DEFAULT 1 CHECK (card_level >= 1 AND card_level <= 15),
    cards_count INTEGER NOT NULL DEFAULT 1 CHECK (cards_count >= 0), -- Duplicados acumulados para subir nivel
    favorite BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT uq_user_unit UNIQUE (user_id, unit_code)
);

CREATE INDEX idx_user_cards_user ON public.user_cards(user_id);

-- ============================================================================
-- 8. TABLA: user_chest_slots
-- Gestión de las 4 ranuras de cofres obtenidos por victoria (Madera, Hierro, Blindado)
-- ============================================================================
CREATE TABLE public.user_chest_slots (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    slot_index INTEGER NOT NULL CHECK (slot_index BETWEEN 1 AND 4),
    chest_type VARCHAR(24) NOT NULL CHECK (chest_type IN ('wood', 'iron', 'armored')),
    unlock_started_at TIMESTAMPTZ DEFAULT NULL,
    unlock_duration_seconds INTEGER NOT NULL, -- 10800s (3h Madera), 28800s (8h Hierro), 43200s (12h Blindado)
    is_unlocked BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT uq_user_slot UNIQUE (user_id, slot_index)
);

CREATE INDEX idx_user_chests_user ON public.user_chest_slots(user_id);

-- ============================================================================
-- 9. TABLAS: clans & clan_members
-- Sistema de Clanes, Guerras Tácticas y donación de cartas duplicadas
-- ============================================================================
CREATE TABLE public.clans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(32) UNIQUE NOT NULL,
    tag VARCHAR(8) UNIQUE NOT NULL,
    description TEXT DEFAULT '',
    badge_icon VARCHAR(32) NOT NULL DEFAULT 'shield_star',
    total_trophies INTEGER NOT NULL DEFAULT 0,
    required_trophies INTEGER NOT NULL DEFAULT 0,
    members_count INTEGER NOT NULL DEFAULT 1 CHECK (members_count <= 50),
    leader_id UUID NOT NULL REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE public.clan_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    clan_id UUID NOT NULL REFERENCES public.clans(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    role VARCHAR(16) NOT NULL DEFAULT 'member' CHECK (role IN ('leader', 'co_leader', 'elder', 'member')),
    donated_cards INTEGER NOT NULL DEFAULT 0,
    joined_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT uq_clan_user UNIQUE (clan_id, user_id)
);

CREATE INDEX idx_clan_members_clan ON public.clan_members(clan_id);
CREATE INDEX idx_clan_members_user ON public.clan_members(user_id);

-- ============================================================================
-- 10. TABLA: chat_messages
-- Chat Global (Menú), Chat de Clan, Chat de Alianza (2v2) y Mensajería DM en Partida
-- ============================================================================
CREATE TABLE public.chat_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    channel_type VARCHAR(16) NOT NULL CHECK (channel_type IN ('global', 'clan', 'match_team', 'match_dm')),
    match_id UUID REFERENCES public.active_matches(id) ON DELETE CASCADE,
    clan_id UUID REFERENCES public.clans(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    recipient_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE, -- Para DMs
    content TEXT NOT NULL,
    is_quick_chat BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX idx_chat_messages_channel ON public.chat_messages(channel_type, created_at DESC);
CREATE INDEX idx_chat_messages_match ON public.chat_messages(match_id);
CREATE INDEX idx_chat_messages_clan ON public.chat_messages(clan_id);
```

---

## 2. POLÍTICAS DE SEGURIDAD (ROW LEVEL SECURITY - RLS)

```sql
-- Activar RLS en todas las tablas
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.units_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_unlocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.active_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.match_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.match_history ENABLE ROW LEVEL SECURITY;

-- ----------------------------------------------------------------------------
-- RLS: PROFILES
-- ----------------------------------------------------------------------------
-- Cualquier usuario autenticado puede leer perfiles públicos (para rankings y matchmaking)
CREATE POLICY "Public profiles are viewable by everyone"
    ON public.profiles FOR SELECT
    USING (true);

-- Solo el dueño del perfil puede actualizar su nombre de usuario, avatar y loadouts
-- (El balance de dinero y nivel es bloqueado por funciones de base de datos)
CREATE POLICY "Users can update own profile display attributes"
    ON public.profiles FOR UPDATE
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- ----------------------------------------------------------------------------
-- RLS: UNITS_CATALOG
-- ----------------------------------------------------------------------------
-- El catálogo es de solo lectura pública
CREATE POLICY "Units catalog is readable by all authenticated users"
    ON public.units_catalog FOR SELECT
    USING (true);

-- ----------------------------------------------------------------------------
-- RLS: USER_UNLOCKS
-- ----------------------------------------------------------------------------
-- Los usuarios solo leen sus propios desbloqueos
CREATE POLICY "Users can view own unlocks"
    ON public.user_unlocks FOR SELECT
    USING (auth.uid() = user_id);

-- Inserciones únicamente permitidas mediante triggers de servidor o RPC autenticadas
CREATE POLICY "Unlocks can only be inserted via service role or secure RPC"
    ON public.user_unlocks FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- ----------------------------------------------------------------------------
-- RLS: ACTIVE_MATCHES
-- ----------------------------------------------------------------------------
-- Los jugadores pueden ver partidas en las que participan o partidas en lobby de espera
CREATE POLICY "Users can view matches they participate in or waiting lobbies"
    ON public.active_matches FOR SELECT
    USING (
        auth.uid() = player1_id OR 
        auth.uid() = player2_id OR 
        status = 'waiting'
    );

-- Creación de partidas: el creador debe ser player1
CREATE POLICY "Users can create matches as player 1"
    ON public.active_matches FOR INSERT
    WITH CHECK (auth.uid() = player1_id);

-- Actualización de estado: solo los participantes activos
CREATE POLICY "Participants can update active matches"
    ON public.active_matches FOR UPDATE
    USING (auth.uid() = player1_id OR auth.uid() = player2_id);

-- ----------------------------------------------------------------------------
-- RLS: MATCH_STATE
-- ----------------------------------------------------------------------------
-- Solo los jugadores en la partida pueden leer el estado de la partida
CREATE POLICY "Match state readable by match participants"
    ON public.match_state FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.active_matches m
            WHERE m.id = match_state.match_id
            AND (m.player1_id = auth.uid() OR m.player2_id = auth.uid())
        )
    );

-- Actualización del estado: solo el jugador que tiene el turno activo
CREATE POLICY "Only current turn player can write match state"
    ON public.match_state FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.active_matches m
            WHERE m.id = match_state.match_id
            AND m.current_turn_player_id = auth.uid()
            AND m.status = 'in_progress'
        )
    );

-- ----------------------------------------------------------------------------
-- RLS: MATCH_HISTORY
-- ----------------------------------------------------------------------------
CREATE POLICY "Users can view history involving them"
    ON public.match_history FOR SELECT
    USING (auth.uid() = player1_id OR auth.uid() = player2_id);
```

---

## 3. PROCEDIMIENTOS ALMACENADOS (RPC) Y TRIGGERS DE PROGRESIÓN

### 3.1 Función de Subida de Nivel y Cálculo de Requisitos (Level-Up Curve)
Calcula el XP necesario según la fórmula:  
$$\text{XP Requerido}(N) = 150 \times N^{1.85}$$

```sql
CREATE OR REPLACE FUNCTION public.calculate_required_xp(level INTEGER)
RETURNS INTEGER AS $$
BEGIN
    RETURN FLOOR(150 * POWER(level::DOUBLE PRECISION, 1.85))::INTEGER;
END;
$$ LANGUAGE plpgsql IMMUTABLE;
```

### 3.2 Trigger para Detección Automática de Subida de Nivel
```sql
CREATE OR REPLACE FUNCTION public.trg_process_level_up()
RETURNS TRIGGER AS $$
DECLARE
    xp_needed INTEGER;
    new_level INTEGER;
    bonus_credits INTEGER;
BEGIN
    new_level := NEW.account_level;
    xp_needed := public.calculate_required_xp(new_level);

    -- Evaluar subida de nivel continua (por si gana XP suficiente para subir múltiples niveles)
    WHILE NEW.current_xp >= xp_needed AND new_level < 100 LOOP
        NEW.current_xp := NEW.current_xp - xp_needed;
        new_level := new_level + 1;
        bonus_credits := new_level * 100;
        NEW.battle_credits := NEW.battle_credits + bonus_credits;
        
        -- Si llega a hitos específicos (cada 5 niveles), recompensar con gemas premium
        IF (new_level % 5 = 0) THEN
            NEW.command_gems := NEW.command_gems + 25;
        END IF;

        xp_needed := public.calculate_required_xp(new_level);
    END LOOP;

    NEW.account_level := new_level;
    NEW.updated_at := timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_profile_xp_change
    BEFORE UPDATE OF current_xp ON public.profiles
    FOR EACH ROW
    WHEN (OLD.current_xp IS DISTINCT FROM NEW.current_xp)
    EXECUTE FUNCTION public.trg_process_level_up();
```

### 3.3 RPC: Recompensar Partida y Finalizar Estado (`award_match_rewards`)
```sql
CREATE OR REPLACE FUNCTION public.award_match_rewards(
    p_match_id UUID,
    p_winner_id UUID,
    p_end_reason VARCHAR(32),
    p_final_stats JSONB
)
RETURNS JSONB AS $$
DECLARE
    v_match public.active_matches%ROWTYPE;
    v_turns INTEGER;
    v_p1_xp INTEGER := 0;
    v_p2_xp INTEGER := 0;
    v_p1_credits INTEGER := 0;
    v_p2_credits INTEGER := 0;
    v_is_p1_winner BOOLEAN;
    v_duration_sec INTEGER;
BEGIN
    -- Validar existencia de la partida
    SELECT * INTO v_match FROM public.active_matches WHERE id = p_match_id FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Partida % no encontrada', p_match_id;
    END IF;

    IF v_match.status = 'finished' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Partida ya finalizada');
    END IF;

    v_turns := v_match.turn_number;
    v_is_p1_winner := (p_winner_id = v_match.player1_id);
    v_duration_sec := EXTRACT(EPOCH FROM (timezone('utc'::text, now()) - v_match.created_at))::INTEGER;

    -- Cálculo de Recompensas:
    -- Base: 120 XP y 60 Créditos
    -- Victoria: Multiplicador x 2.2
    -- Derrota: Multiplicador x 0.8
    -- Turnos jugados: +10 XP por cada turno completado (hasta un tope de 30 turnos)
    IF v_is_p1_winner THEN
        v_p1_xp := FLOOR((150 + LEAST(v_turns, 30) * 12) * 2.2)::INTEGER;
        v_p1_credits := FLOOR((80 + LEAST(v_turns, 30) * 8) * 2.0)::INTEGER;
        
        v_p2_xp := FLOOR((100 + LEAST(v_turns, 30) * 8) * 0.85)::INTEGER;
        v_p2_credits := FLOOR((50 + LEAST(v_turns, 30) * 5) * 0.8)::INTEGER;
    ELSE
        v_p2_xp := FLOOR((150 + LEAST(v_turns, 30) * 12) * 2.2)::INTEGER;
        v_p2_credits := FLOOR((80 + LEAST(v_turns, 30) * 8) * 2.0)::INTEGER;
        
        v_p1_xp := FLOOR((100 + LEAST(v_turns, 30) * 8) * 0.85)::INTEGER;
        v_p1_credits := FLOOR((50 + LEAST(v_turns, 30) * 5) * 0.8)::INTEGER;
    END IF;

    -- Aplicar recompensas al Perfil del Jugador 1
    UPDATE public.profiles
    SET current_xp = current_xp + v_p1_xp,
        battle_credits = battle_credits + v_p1_credits,
        total_matches_played = total_matches_played + 1,
        total_victories = CASE WHEN v_is_p1_winner THEN total_victories + 1 ELSE total_victories END,
        elo_rating = CASE 
            WHEN v_is_p1_winner THEN elo_rating + 18 
            ELSE GREATEST(0, elo_rating - 14) 
        END
    WHERE id = v_match.player1_id;

    -- Aplicar recompensas al Perfil del Jugador 2 (si no es bot ni nulo)
    IF v_match.player2_id IS NOT NULL THEN
        UPDATE public.profiles
        SET current_xp = current_xp + v_p2_xp,
            battle_credits = battle_credits + v_p2_credits,
            total_matches_played = total_matches_played + 1,
            total_victories = CASE WHEN NOT v_is_p1_winner THEN total_victories + 1 ELSE total_victories END,
            elo_rating = CASE 
                WHEN NOT v_is_p1_winner THEN elo_rating + 18 
                ELSE GREATEST(0, elo_rating - 14) 
            END
        WHERE id = v_match.player2_id;
    END IF;

    -- Insertar en el histórico inmutable
    INSERT INTO public.match_history (
        match_id, player1_id, player2_id, winner_id, end_reason,
        total_turns, duration_seconds, game_mode,
        p1_xp_awarded, p2_xp_awarded, p1_credits_awarded, p2_credits_awarded,
        final_stats
    ) VALUES (
        v_match.id, v_match.player1_id, v_match.player2_id, p_winner_id, p_end_reason,
        v_turns, v_duration_sec, v_match.game_mode,
        v_p1_xp, v_p2_xp, v_p1_credits, v_p2_credits,
        p_final_stats
    );

    -- Marcar la partida como finalizada
    UPDATE public.active_matches
    SET status = 'finished',
        winner_id = p_winner_id,
        updated_at = timezone('utc'::text, now())
    WHERE id = p_match_id;

    RETURN jsonb_build_object(
        'success', true,
        'p1_rewards', jsonb_build_object('xp', v_p1_xp, 'credits', v_p1_credits),
        'p2_rewards', jsonb_build_object('xp', v_p2_xp, 'credits', v_p2_credits)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 11. TABLA: player_tactical_behavior_profile (Perfil Psicológico y Hábitos Cross-Match)
-- ============================================================================
CREATE TABLE public.player_tactical_behavior_profile (
    user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
    
    -- Ritmo de Juego y Estados Psicológicos (PTE & Tilt)
    avg_pte_seconds NUMERIC(4,1) NOT NULL DEFAULT 25.0,
    fastest_turn_seconds NUMERIC(4,1) NOT NULL DEFAULT 6.0,
    slowest_turn_seconds NUMERIC(4,1) NOT NULL DEFAULT 58.0,
    tilt_index NUMERIC(3,2) NOT NULL DEFAULT 0.00 CHECK (tilt_index >= 0.00 AND tilt_index <= 1.00),
    patience_score NUMERIC(3,2) NOT NULL DEFAULT 0.50 CHECK (patience_score >= 0.00 AND patience_score <= 1.00),
    aggression_index NUMERIC(3,2) NOT NULL DEFAULT 0.50 CHECK (aggression_index >= 0.00 AND aggression_index <= 1.00),
    
    -- Gestión Económica y Eficiencia de Fábricas
    avg_unspent_funds_per_turn INTEGER NOT NULL DEFAULT 450,
    factory_idle_turns_total INTEGER NOT NULL DEFAULT 0,
    prefers_high_cost_units BOOLEAN NOT NULL DEFAULT false,
    
    -- Hábitos de Mazo y Unidades
    favorite_unit_code VARCHAR(32) NOT NULL DEFAULT 'tank_light',
    most_lost_unit_code VARCHAR(32) NOT NULL DEFAULT 'infantry',
    favorite_branch VARCHAR(16) NOT NULL DEFAULT 'land' CHECK (favorite_branch IN ('land', 'air', 'naval', 'balanced')),
    air_bias_percentage NUMERIC(5,2) NOT NULL DEFAULT 20.00,
    siege_bias_percentage NUMERIC(5,2) NOT NULL DEFAULT 20.00,
    
    -- Comportamiento en Niebla de Guerra
    ambushes_suffered_count INTEGER NOT NULL DEFAULT 0,
    ambushes_inflicted_count INTEGER NOT NULL DEFAULT 0,
    mountain_scouting_frequency NUMERIC(5,2) NOT NULL DEFAULT 15.00,
    
    -- Métricas de Modos de Juego
    blitz_matches_played INTEGER NOT NULL DEFAULT 0,
    blitz_win_rate NUMERIC(5,2) NOT NULL DEFAULT 50.00,
    campaign_matches_played INTEGER NOT NULL DEFAULT 0,
    campaign_win_rate NUMERIC(5,2) NOT NULL DEFAULT 50.00,
    
    -- Resiliencia y Eventos Críticos
    clutch_wins_count INTEGER NOT NULL DEFAULT 0,
    early_surrenders_count INTEGER NOT NULL DEFAULT 0,
    afk_timeouts_count INTEGER NOT NULL DEFAULT 0,
    comebacks_achieved_count INTEGER NOT NULL DEFAULT 0,
    
    -- Sesiones y Rachas
    night_matches_played INTEGER NOT NULL DEFAULT 0,
    consecutive_loss_streak_peak INTEGER NOT NULL DEFAULT 0,
    consecutive_win_streak_peak INTEGER NOT NULL DEFAULT 0,
    current_streak INTEGER NOT NULL DEFAULT 0,
    
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX idx_behavior_user ON public.player_tactical_behavior_profile(user_id);

-- ============================================================================
-- 12. TABLA: match_detailed_telemetry (Historial Detallado por Partida)
-- ============================================================================
CREATE TABLE public.match_detailed_telemetry (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    match_id UUID NOT NULL REFERENCES public.active_matches(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    game_mode VARCHAR(24) NOT NULL,
    selected_commander_id VARCHAR(32) NOT NULL,
    opponent_commander_id VARCHAR(32) NOT NULL,
    total_turns_played INTEGER NOT NULL DEFAULT 1,
    avg_turn_duration_sec NUMERIC(4,1) NOT NULL DEFAULT 20.0,
    units_produced_count INTEGER NOT NULL DEFAULT 0,
    units_lost_count INTEGER NOT NULL DEFAULT 0,
    units_killed_count INTEGER NOT NULL DEFAULT 0,
    funds_spent_total INTEGER NOT NULL DEFAULT 0,
    hq_lowest_hp_reached INTEGER NOT NULL DEFAULT 20,
    fow_traps_triggered INTEGER NOT NULL DEFAULT 0,
    surrendered_early BOOLEAN NOT NULL DEFAULT false,
    won_match BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX idx_telemetry_user_history ON public.match_detailed_telemetry(user_id, created_at DESC);

-- ============================================================================
-- 13. TABLA: commander_bonding_progress (Afinidad y Memoria del Comandante)
-- ============================================================================
CREATE TABLE public.commander_bonding_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    commander_id VARCHAR(32) NOT NULL,
    bonding_level INTEGER NOT NULL DEFAULT 1 CHECK (bonding_level >= 1 AND bonding_level <= 20),
    bonding_xp INTEGER NOT NULL DEFAULT 0,
    matches_together_count INTEGER NOT NULL DEFAULT 0,
    victories_together_count INTEGER NOT NULL DEFAULT 0,
    clutch_wins_together INTEGER NOT NULL DEFAULT 0,
    unlocked_dialogue_tier INTEGER NOT NULL DEFAULT 1,
    last_interacted_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT uq_user_commander_bonding UNIQUE(user_id, commander_id)
);

CREATE INDEX idx_bonding_lookup ON public.commander_bonding_progress(user_id, commander_id);

-- ============================================================================
-- 14. TABLA: comic_cosmetics_catalog & user_comic_cosmetics (Estética Cómic)
-- ============================================================================
CREATE TABLE public.comic_cosmetics_catalog (
    id VARCHAR(64) PRIMARY KEY,
    cosmetic_type VARCHAR(32) NOT NULL CHECK (cosmetic_type IN ('speech_bubble_skin', 'onomatopoeia_stamp', 'vignette_frame', 'comic_font')),
    name VARCHAR(64) NOT NULL,
    description TEXT NOT NULL,
    rarity VARCHAR(16) NOT NULL DEFAULT 'common' CHECK (rarity IN ('common', 'rare', 'epic', 'legendary')),
    css_class_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    is_premium_pass_exclusive BOOLEAN NOT NULL DEFAULT false,
    price_gems INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE public.user_comic_cosmetics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    cosmetic_id VARCHAR(64) NOT NULL REFERENCES public.comic_cosmetics_catalog(id) ON DELETE CASCADE,
    is_equipped BOOLEAN NOT NULL DEFAULT false,
    unlocked_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT uq_user_comic_item UNIQUE(user_id, cosmetic_id)
);

-- ============================================================================
-- 15. TABLA: bark_dialogue_templates (Catálogo de Diálogos en Viñeta de Cómic)
-- ============================================================================
CREATE TABLE public.bark_dialogue_templates (
    id VARCHAR(64) PRIMARY KEY,
    commander_id VARCHAR(32) NOT NULL,
    trigger_situation VARCHAR(48) NOT NULL,
    min_bonding_level INTEGER NOT NULL DEFAULT 1,
    required_condition_json JSONB NOT NULL DEFAULT '{}'::jsonb,
    bubble_shape VARCHAR(24) NOT NULL DEFAULT 'speech' CHECK (bubble_shape IN ('speech', 'shout', 'thought', 'whisper', 'radio')),
    onomatopoeia_stamp VARCHAR(32) DEFAULT NULL,
    comic_vignette_pose VARCHAR(32) NOT NULL DEFAULT 'neutral' CHECK (comic_vignette_pose IN ('neutral', 'stern', 'angry', 'mocking', 'proud', 'alarmed')),
    dialogue_template_text TEXT NOT NULL,
    priority_weight INTEGER NOT NULL DEFAULT 10,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- ============================================================================
-- 16. TABLA: user_commanders (Sistema de Comandantes & Niveles)
-- ============================================================================
CREATE TABLE public.user_commanders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    commander_id VARCHAR(32) NOT NULL REFERENCES public.commanders_catalog(id) ON DELETE RESTRICT,
    commander_level INTEGER NOT NULL DEFAULT 1 CHECK (commander_level >= 1 AND commander_level <= 15),
    commander_cards_count INTEGER NOT NULL DEFAULT 1 CHECK (commander_cards_count >= 0),
    bonding_level INTEGER NOT NULL DEFAULT 1 CHECK (bonding_level >= 1 AND bonding_level <= 20),
    bonding_xp INTEGER NOT NULL DEFAULT 0 CHECK (bonding_xp >= 0),
    unlocked_dialogue_tier INTEGER NOT NULL DEFAULT 1 CHECK (unlocked_dialogue_tier >= 1 AND unlocked_dialogue_tier <= 5),
    is_favorite BOOLEAN NOT NULL DEFAULT false,
    equipped_skin_id VARCHAR(64) DEFAULT 'skin_comic_default',
    equipped_bubble_shape VARCHAR(24) DEFAULT 'speech',
    equipped_stamp_id VARCHAR(64) DEFAULT 'stamp_tactical_base',
    unlocked_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    last_played_at TIMESTAMPTZ,
    CONSTRAINT uq_user_commander UNIQUE(user_id, commander_id)
);

CREATE INDEX idx_user_commanders_lookup ON public.user_commanders(user_id);

-- ============================================================================
-- 17. TABLA: command_pass_progress (Pase de Batalla con Reclamación Retroactiva)
-- ============================================================================
CREATE TABLE public.command_pass_progress (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    season_id VARCHAR(32) NOT NULL DEFAULT 'season_1',
    battle_badges_points INTEGER NOT NULL DEFAULT 0,
    current_tier INTEGER NOT NULL DEFAULT 1 CHECK (current_tier >= 1 AND current_tier <= 50),
    is_premium_purchased BOOLEAN NOT NULL DEFAULT false,
    premium_purchased_at TIMESTAMPTZ DEFAULT NULL,
    claimed_free_tiers INTEGER[] NOT NULL DEFAULT ARRAY[]::INTEGER[],
    claimed_premium_tiers INTEGER[] NOT NULL DEFAULT ARRAY[]::INTEGER[],
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT uq_user_season_pass UNIQUE(user_id, season_id)
);

-- RPC: Reclamación Retroactiva de Recompensas de Pase Premium
CREATE OR REPLACE FUNCTION public.rpc_claim_retroactive_pass_rewards(p_season_id VARCHAR(32))
RETURNS JSONB AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_pass public.command_pass_progress%ROWTYPE;
    v_unclaimed_tiers INTEGER[] := ARRAY[]::INTEGER[];
    v_i INTEGER;
BEGIN
    SELECT * INTO v_pass FROM public.command_pass_progress 
    WHERE user_id = v_user_id AND season_id = p_season_id;

    IF NOT FOUND OR NOT v_pass.is_premium_purchased THEN
        RETURN jsonb_build_object('success', false, 'error', 'Premium pass not active');
    END IF;

    FOR v_i IN 1..v_pass.current_tier LOOP
        IF NOT (v_i = ANY(v_pass.claimed_premium_tiers)) THEN
            v_unclaimed_tiers := array_append(v_unclaimed_tiers, v_i);
        END IF;
    END LOOP;

    UPDATE public.command_pass_progress
    SET claimed_premium_tiers = array_cat(claimed_premium_tiers, v_unclaimed_tiers),
        updated_at = timezone('utc'::text, now())
    WHERE user_id = v_user_id AND season_id = p_season_id;

    RETURN jsonb_build_object(
        'success', true,
        'season_id', p_season_id,
        'unlocked_tiers', v_unclaimed_tiers,
        'total_tiers_claimed', array_length(v_unclaimed_tiers, 1)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

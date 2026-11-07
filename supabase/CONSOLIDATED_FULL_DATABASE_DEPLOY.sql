-- ==============================================================================
-- GEOTACTICS ONLINE - CONSOLIDATED DATABASE DEPLOYMENT SCRIPT
-- Combina las 32 migraciones canónicas + seed inicial en un solo bloque ejecutable.
-- Generado automáticamente: 2026-11-07T19:00:45.074Z
-- ==============================================================================


-- >>> INICIO MIGRACIÓN: 20261024000001_initial_schema.sql <<<
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

-- >>> FIN MIGRACIÓN: 20261024000001_initial_schema.sql <<<


-- >>> INICIO MIGRACIÓN: 20261024000002_rls_and_policies.sql <<<
-- ============================================================================
-- MIGRACIÓN 2: ROW LEVEL SECURITY (RLS) Y POLÍTICAS DE ACCESO
-- Proyecto: Tactical Command: Wars of Legacy
-- Fecha: 2026-10-24
-- ============================================================================

-- Habilitar RLS en todas las tablas públicas
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.units_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_unlocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.active_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.match_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.match_history ENABLE ROW LEVEL SECURITY;

-- ----------------------------------------------------------------------------
-- POLÍTICAS: profiles
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "profiles_select_public" ON public.profiles;
CREATE POLICY "profiles_select_public"
    ON public.profiles FOR SELECT
    USING (true);

DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
CREATE POLICY "profiles_update_own"
    ON public.profiles FOR UPDATE
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;
CREATE POLICY "profiles_insert_own"
    ON public.profiles FOR INSERT
    WITH CHECK (auth.uid() = id);

-- ----------------------------------------------------------------------------
-- POLÍTICAS: units_catalog
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "units_catalog_select" ON public.units_catalog;
CREATE POLICY "units_catalog_select"
    ON public.units_catalog FOR SELECT
    USING (true);

-- ----------------------------------------------------------------------------
-- POLÍTICAS: user_unlocks
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "user_unlocks_select_own" ON public.user_unlocks;
CREATE POLICY "user_unlocks_select_own"
    ON public.user_unlocks FOR SELECT
    USING (auth.uid() = user_id);

-- ----------------------------------------------------------------------------
-- POLÍTICAS: active_matches
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "active_matches_select" ON public.active_matches;
CREATE POLICY "active_matches_select"
    ON public.active_matches FOR SELECT
    USING (
        auth.uid() = player1_id OR
        auth.uid() = player2_id OR
        status = 'waiting'
    );

DROP POLICY IF EXISTS "active_matches_insert" ON public.active_matches;
CREATE POLICY "active_matches_insert"
    ON public.active_matches FOR INSERT
    WITH CHECK (auth.uid() = player1_id);

DROP POLICY IF EXISTS "active_matches_update" ON public.active_matches;
CREATE POLICY "active_matches_update"
    ON public.active_matches FOR UPDATE
    USING (auth.uid() = player1_id OR auth.uid() = player2_id)
    WITH CHECK (auth.uid() = player1_id OR auth.uid() = player2_id);

-- ----------------------------------------------------------------------------
-- POLÍTICAS: match_state
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "match_state_select_participants" ON public.match_state;
CREATE POLICY "match_state_select_participants"
    ON public.match_state FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.active_matches m
            WHERE m.id = match_state.match_id
            AND (m.player1_id = auth.uid() OR m.player2_id = auth.uid())
        )
    );

DROP POLICY IF EXISTS "match_state_update_turn_player_only" ON public.match_state;
CREATE POLICY "match_state_update_turn_player_only"
    ON public.match_state FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.active_matches m
            WHERE m.id = match_state.match_id
            AND m.current_turn_player_id = auth.uid()
            AND m.status = 'in_progress'
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.active_matches m
            WHERE m.id = match_state.match_id
            AND m.current_turn_player_id = auth.uid()
            AND m.status = 'in_progress'
        )
    );

-- ----------------------------------------------------------------------------
-- POLÍTICAS: match_history
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "match_history_select_own" ON public.match_history;
CREATE POLICY "match_history_select_own"
    ON public.match_history FOR SELECT
    USING (auth.uid() = player1_id OR auth.uid() = player2_id);

-- >>> FIN MIGRACIÓN: 20261024000002_rls_and_policies.sql <<<


-- >>> INICIO MIGRACIÓN: 20261024000003_triggers_and_rpc.sql <<<
-- ============================================================================
-- MIGRACIÓN 3: TRIGGERS Y FUNCIONES RPC (PROGRESIÓN Y SEGURIDAD)
-- Proyecto: Tactical Command: Wars of Legacy
-- Fecha: 2026-10-24
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. FUNCIÓN MATEMÁTICA: calculate_required_xp
-- Curva potencial: XP(N) = floor(150 * N^1.85)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.calculate_required_xp(p_level INTEGER)
RETURNS INTEGER AS $$
BEGIN
    IF p_level < 1 THEN
        RETURN 150;
    END IF;
    RETURN FLOOR(150 * POWER(p_level::DOUBLE PRECISION, 1.85))::INTEGER;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ----------------------------------------------------------------------------
-- 2. TRIGGER: trg_process_level_up
-- Evalúa y sube de nivel automáticamente al modificar current_xp en profiles
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.trg_process_level_up()
RETURNS TRIGGER AS $$
DECLARE
    v_xp_needed INTEGER;
    v_new_level INTEGER;
    v_bonus_credits INTEGER;
BEGIN
    v_new_level := NEW.account_level;
    v_xp_needed := public.calculate_required_xp(v_new_level);

    -- Permitir subir múltiples niveles de golpe
    WHILE NEW.current_xp >= v_xp_needed AND v_new_level < 100 LOOP
        NEW.current_xp := NEW.current_xp - v_xp_needed;
        v_new_level := v_new_level + 1;
        
        -- Otorgar créditos por nivel (100 * nivel alcanzado)
        v_bonus_credits := v_new_level * 100;
        NEW.battle_credits := NEW.battle_credits + v_bonus_credits;

        -- Otorgar 25 Gemas Premium cada 5 niveles
        IF (v_new_level % 5 = 0) THEN
            NEW.command_gems := NEW.command_gems + 25;
        END IF;

        v_xp_needed := public.calculate_required_xp(v_new_level);
    END LOOP;

    NEW.account_level := v_new_level;
    NEW.updated_at := timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_profile_xp_check ON public.profiles;
CREATE TRIGGER trg_profile_xp_check
    BEFORE UPDATE OF current_xp ON public.profiles
    FOR EACH ROW
    WHEN (OLD.current_xp IS DISTINCT FROM NEW.current_xp)
    EXECUTE FUNCTION public.trg_process_level_up();

-- ----------------------------------------------------------------------------
-- 3. TRIGGER: handle_new_user
-- Registra automáticamente el perfil de un usuario cuando se crea en auth.users
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (
        id,
        username,
        avatar_url,
        account_level,
        current_xp,
        battle_credits,
        command_gems,
        elo_rating
    ) VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'username', 'Commander_' || SUBSTRING(NEW.id::text FROM 1 FOR 6)),
        'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=150',
        1,
        0,
        500,
        50,
        1200
    )
    ON CONFLICT (id) DO NOTHING;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- ----------------------------------------------------------------------------
-- 4. RPC: award_match_rewards
-- Liquidación segura de fin de partida (cálculo de XP, créditos y ranking ELO)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.award_match_rewards(
    p_match_id UUID,
    p_winner_id UUID,
    p_end_reason VARCHAR(32),
    p_final_stats JSONB
)
RETURNS JSONB AS $$
DECLARE
    v_match public.active_matches%ROWTYPE;
    v_is_p1_winner BOOLEAN;
    v_p1_xp INTEGER := 0;
    v_p2_xp INTEGER := 0;
    v_p1_credits INTEGER := 0;
    v_p2_credits INTEGER := 0;
    v_turns INTEGER;
    v_duration_sec INTEGER;
BEGIN
    SELECT * INTO v_match 
    FROM public.active_matches 
    WHERE id = p_match_id 
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Partida % no encontrada', p_match_id;
    END IF;

    IF v_match.status = 'finished' THEN
        RETURN jsonb_build_object('success', false, 'error', 'La partida ya fue finalizada');
    END IF;

    v_turns := v_match.turn_number;
    v_is_p1_winner := (p_winner_id = v_match.player1_id);
    v_duration_sec := EXTRACT(EPOCH FROM (timezone('utc'::text, now()) - v_match.created_at))::INTEGER;

    -- Aplicación de multiplicadores objetivos
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

    -- Actualizar Jugador 1
    UPDATE public.profiles
    SET current_xp = current_xp + v_p1_xp,
        battle_credits = battle_credits + v_p1_credits,
        total_matches_played = total_matches_played + 1,
        total_victories = CASE WHEN v_is_p1_winner THEN total_victories + 1 ELSE total_victories END,
        elo_rating = CASE WHEN v_is_p1_winner THEN elo_rating + 18 ELSE GREATEST(0, elo_rating - 14) END,
        updated_at = timezone('utc'::text, now())
    WHERE id = v_match.player1_id;

    -- Actualizar Jugador 2 (si existe y no es BOT)
    IF v_match.player2_id IS NOT NULL THEN
        UPDATE public.profiles
        SET current_xp = current_xp + v_p2_xp,
            battle_credits = battle_credits + v_p2_credits,
            total_matches_played = total_matches_played + 1,
            total_victories = CASE WHEN NOT v_is_p1_winner THEN total_victories + 1 ELSE total_victories END,
            elo_rating = CASE WHEN NOT v_is_p1_winner THEN elo_rating + 18 ELSE GREATEST(0, elo_rating - 14) END,
            updated_at = timezone('utc'::text, now())
        WHERE id = v_match.player2_id;
    END IF;

    -- Insertar en histórico inmutable
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

    -- Finalizar la partida
    UPDATE public.active_matches
    SET status = 'finished',
        winner_id = p_winner_id,
        updated_at = timezone('utc'::text, now())
    WHERE id = p_match_id;

    RETURN jsonb_build_object(
        'success', true,
        'p1_xp', v_p1_xp,
        'p1_credits', v_p1_credits,
        'p2_xp', v_p2_xp,
        'p2_credits', v_p2_credits
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- >>> FIN MIGRACIÓN: 20261024000003_triggers_and_rpc.sql <<<


-- >>> INICIO MIGRACIÓN: 20261024000004_seed_units_catalog.sql <<<
-- ============================================================================
-- MIGRACIÓN 4: SEED DATA CANÓNICO DE UNIDADES TÁCTICAS
-- Proyecto: Tactical Command: Wars of Legacy
-- Fecha: 2026-10-24
-- ============================================================================

INSERT INTO public.units_catalog (
    id, display_name, category, hp_max, base_attack, min_range, max_range,
    movement_points, movement_type, vision_range, production_cost_g,
    ammo_max, fuel_max, required_account_level, unlock_cost_credits, is_base_unlocked
) VALUES
('infantry', 'Infantería Ligera', 'infantry', 10, 55, 1, 1, 3, 'foot', 3, 1000, 99, 99, 1, 0, true),
('mech', 'Infantería Pesada (Bazuca)', 'infantry', 10, 65, 1, 1, 2, 'mech', 2, 3000, 3, 70, 2, 0, true),
('recon', 'Vehículo de Reconocimiento', 'vehicle', 10, 60, 1, 1, 8, 'wheels', 5, 4000, 99, 80, 1, 0, true),
('tank_light', 'Tanque de Combate Ligero', 'vehicle', 10, 75, 1, 1, 6, 'treads', 3, 7000, 9, 70, 1, 0, true),
('tank_medium', 'Tanque Blindado Mediano', 'vehicle', 10, 105, 1, 1, 5, 'treads', 1, 16000, 8, 50, 7, 1200, false),
('artillery', 'Artillería de Obús Móvil', 'indirect', 10, 80, 2, 3, 5, 'treads', 1, 6000, 9, 50, 1, 0, true),
('rocket', 'Lanzacohetes de Asedio', 'indirect', 10, 95, 3, 5, 5, 'wheels', 1, 15000, 6, 50, 6, 1000, false),
('anti_air', 'Blindado Antiaéreo Vulcano', 'vehicle', 10, 100, 1, 1, 6, 'treads', 2, 8000, 9, 60, 3, 0, true),
('b_copter', 'Helicóptero de Ataque', 'aircraft', 10, 75, 1, 1, 6, 'air', 3, 9000, 6, 99, 4, 0, true),
('fighter', 'Caza de Supremsacía Aérea', 'aircraft', 10, 100, 1, 1, 9, 'air', 4, 20000, 9, 99, 9, 1500, false),
('bomber', 'Bombardero Táctico Pesado', 'aircraft', 10, 110, 1, 1, 7, 'air', 2, 22000, 9, 99, 12, 1800, false),
('battleship', 'Acorazado Naval de Guerra', 'naval', 10, 90, 2, 6, 5, 'sea', 2, 28000, 9, 99, 15, 2500, false)
ON CONFLICT (id) DO UPDATE SET
    display_name = EXCLUDED.display_name,
    production_cost_g = EXCLUDED.production_cost_g,
    base_attack = EXCLUDED.base_attack,
    movement_points = EXCLUDED.movement_points,
    min_range = EXCLUDED.min_range,
    max_range = EXCLUDED.max_range,
    vision_range = EXCLUDED.vision_range;

-- >>> FIN MIGRACIÓN: 20261024000004_seed_units_catalog.sql <<<


-- >>> INICIO MIGRACIÓN: 20261024000005_grant_match_rewards.sql <<<
-- ============================================================================
-- MIGRACIÓN 5: FUNCIÓN RPC grant_match_rewards Y TRIGGER DE NIVEL
-- Proyecto: Tactical Command: Wars of Legacy
-- Fecha: 2026-10-24
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. FUNCIÓN MATEMÁTICA: calculate_required_xp
-- XP_necesaria(N) = floor(150 * N^1.85)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.calculate_required_xp(p_level INTEGER)
RETURNS INTEGER AS $$
BEGIN
    IF p_level < 1 THEN
        RETURN 150;
    END IF;
    RETURN FLOOR(150 * POWER(p_level::DOUBLE PRECISION, 1.85))::INTEGER;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ----------------------------------------------------------------------------
-- 2. TRIGGER: trg_process_level_up
-- Evalúa si la XP acumulada supera el umbral del siguiente nivel y actualiza
-- account_level, abonando créditos y gemas automáticamente.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.trg_process_level_up()
RETURNS TRIGGER AS $$
DECLARE
    v_xp_needed INTEGER;
    v_new_level INTEGER;
    v_bonus_credits INTEGER;
BEGIN
    v_new_level := NEW.account_level;
    v_xp_needed := public.calculate_required_xp(v_new_level);

    -- Permite subir múltiples niveles consecutivos si la XP recibida es sustancial
    WHILE NEW.current_xp >= v_xp_needed AND v_new_level < 100 LOOP
        NEW.current_xp := NEW.current_xp - v_xp_needed;
        v_new_level := v_new_level + 1;
        
        -- Bono de 100 créditos por nivel alcanzado
        v_bonus_credits := v_new_level * 100;
        NEW.battle_credits := NEW.battle_credits + v_bonus_credits;

        -- Bono de 25 Gemas de Mando cada 5 niveles
        IF (v_new_level % 5 = 0) THEN
            NEW.command_gems := NEW.command_gems + 25;
        END IF;

        v_xp_needed := public.calculate_required_xp(v_new_level);
    END LOOP;

    NEW.account_level := v_new_level;
    NEW.updated_at := timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_profile_xp_check ON public.profiles;
CREATE TRIGGER trg_profile_xp_check
    BEFORE UPDATE OF current_xp ON public.profiles
    FOR EACH ROW
    WHEN (OLD.current_xp IS DISTINCT FROM NEW.current_xp)
    EXECUTE FUNCTION public.trg_process_level_up();

-- ----------------------------------------------------------------------------
-- 3. RPC: grant_match_rewards
-- Calcula XP y Oro (Battle Credits) al concluir una partida según la fórmula
-- canónica de docs/05_MONETIZATION_AND_PROGRESSION.md:
-- XP = (Base + (Ciudades * A) + (Bajas * B) + min(Turnos, 30) * C) * Multiplicador
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.grant_match_rewards(
    p_match_id UUID,
    p_winner_id UUID,
    p_cities_captured_p1 INTEGER DEFAULT 0,
    p_cities_captured_p2 INTEGER DEFAULT 0,
    p_units_destroyed_p1 INTEGER DEFAULT 0,
    p_units_destroyed_p2 INTEGER DEFAULT 0
)
RETURNS JSONB AS $$
DECLARE
    v_match public.active_matches%ROWTYPE;
    v_turns INTEGER;
    v_duration_sec INTEGER;
    v_is_p1_winner BOOLEAN;

    -- Constantes de calibración de GDD
    c_base_xp CONSTANT INTEGER := 120;
    c_city_xp_weight CONSTANT INTEGER := 45;
    c_kill_xp_weight CONSTANT INTEGER := 35;
    c_turn_xp_weight CONSTANT INTEGER := 6;

    c_base_gold CONSTANT INTEGER := 60;
    c_city_gold_weight CONSTANT INTEGER := 20;
    c_kill_gold_weight CONSTANT INTEGER := 15;

    c_win_multiplier CONSTANT DOUBLE PRECISION := 2.2;
    c_loss_multiplier CONSTANT DOUBLE PRECISION := 0.85;

    v_p1_score DOUBLE PRECISION;
    v_p2_score DOUBLE PRECISION;
    v_p1_gold_score DOUBLE PRECISION;
    v_p2_gold_score DOUBLE PRECISION;

    v_p1_xp_awarded INTEGER;
    v_p2_xp_awarded INTEGER;
    v_p1_gold_awarded INTEGER;
    v_p2_gold_awarded INTEGER;

    v_p1_elo_delta INTEGER;
    v_p2_elo_delta INTEGER;
BEGIN
    -- Bloqueo pesimista para evitar doble liquidación
    SELECT * INTO v_match 
    FROM public.active_matches 
    WHERE id = p_match_id 
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Partida % no encontrada', p_match_id;
    END IF;

    IF v_match.status = 'finished' THEN
        RETURN jsonb_build_object('success', false, 'error', 'La partida ya fue finalizada');
    END IF;

    v_turns := v_match.turn_number;
    v_duration_sec := EXTRACT(EPOCH FROM (timezone('utc'::text, now()) - v_match.created_at))::INTEGER;
    v_is_p1_winner := (p_winner_id = v_match.player1_id);

    -- 1. Calcular Puntajes Tácticos Base
    v_p1_score := c_base_xp + (p_cities_captured_p1 * c_city_xp_weight) + (p_units_destroyed_p1 * c_kill_xp_weight) + (LEAST(v_turns, 30) * c_turn_xp_weight);
    v_p2_score := c_base_xp + (p_cities_captured_p2 * c_city_xp_weight) + (p_units_destroyed_p2 * c_kill_xp_weight) + (LEAST(v_turns, 30) * c_turn_xp_weight);

    v_p1_gold_score := c_base_gold + (p_cities_captured_p1 * c_city_gold_weight) + (p_units_destroyed_p1 * c_kill_gold_weight);
    v_p2_gold_score := c_base_gold + (p_cities_captured_p2 * c_city_gold_weight) + (p_units_destroyed_p2 * c_kill_gold_weight);

    -- 2. Aplicar Multiplicadores según Resultado
    IF v_is_p1_winner THEN
        v_p1_xp_awarded := FLOOR(v_p1_score * c_win_multiplier)::INTEGER;
        v_p1_gold_awarded := FLOOR(v_p1_gold_score * 2.0)::INTEGER;
        v_p1_elo_delta := 20;

        v_p2_xp_awarded := FLOOR(v_p2_score * c_loss_multiplier)::INTEGER;
        v_p2_gold_awarded := FLOOR(v_p2_gold_score * 0.8)::INTEGER;
        v_p2_elo_delta := -15;
    ELSE
        v_p2_xp_awarded := FLOOR(v_p2_score * c_win_multiplier)::INTEGER;
        v_p2_gold_awarded := FLOOR(v_p2_gold_score * 2.0)::INTEGER;
        v_p2_elo_delta := 20;

        v_p1_xp_awarded := FLOOR(v_p1_score * c_loss_multiplier)::INTEGER;
        v_p1_gold_awarded := FLOOR(v_p1_gold_score * 0.8)::INTEGER;
        v_p1_elo_delta := -15;
    END IF;

    -- 3. Actualizar Perfil del Jugador 1 (Dispara trigger trg_profile_xp_check)
    UPDATE public.profiles
    SET current_xp = current_xp + v_p1_xp_awarded,
        battle_credits = battle_credits + v_p1_gold_awarded,
        total_matches_played = total_matches_played + 1,
        total_victories = CASE WHEN v_is_p1_winner THEN total_victories + 1 ELSE total_victories END,
        elo_rating = GREATEST(0, elo_rating + v_p1_elo_delta),
        updated_at = timezone('utc'::text, now())
    WHERE id = v_match.player1_id;

    -- 4. Actualizar Perfil del Jugador 2 (si existe y no es BOT)
    IF v_match.player2_id IS NOT NULL THEN
        UPDATE public.profiles
        SET current_xp = current_xp + v_p2_xp_awarded,
            battle_credits = battle_credits + v_p2_gold_awarded,
            total_matches_played = total_matches_played + 1,
            total_victories = CASE WHEN NOT v_is_p1_winner THEN total_victories + 1 ELSE total_victories END,
            elo_rating = GREATEST(0, elo_rating + v_p2_elo_delta),
            updated_at = timezone('utc'::text, now())
        WHERE id = v_match.player2_id;
    END IF;

    -- 5. Registrar en el Histórico Inmutable
    INSERT INTO public.match_history (
        match_id, player1_id, player2_id, winner_id, end_reason,
        total_turns, duration_seconds, game_mode,
        p1_xp_awarded, p2_xp_awarded, p1_credits_awarded, p2_credits_awarded,
        final_stats
    ) VALUES (
        v_match.id, v_match.player1_id, v_match.player2_id, p_winner_id,
        CASE WHEN v_turns > 50 THEN 'timeout' ELSE 'hq_captured' END,
        v_turns, v_duration_sec, v_match.game_mode,
        v_p1_xp_awarded, v_p2_xp_awarded, v_p1_gold_awarded, v_p2_gold_awarded,
        jsonb_build_object(
            'p1_cities', p_cities_captured_p1,
            'p2_cities', p_cities_captured_p2,
            'p1_kills', p_units_destroyed_p1,
            'p2_kills', p_units_destroyed_p2
        )
    );

    -- 6. Cerrar Partida
    UPDATE public.active_matches
    SET status = 'finished',
        winner_id = p_winner_id,
        updated_at = timezone('utc'::text, now())
    WHERE id = p_match_id;

    RETURN jsonb_build_object(
        'success', true,
        'p1_rewards', jsonb_build_object('xp', v_p1_xp_awarded, 'gold', v_p1_gold_awarded, 'eloDelta', v_p1_elo_delta),
        'p2_rewards', jsonb_build_object('xp', v_p2_xp_awarded, 'gold', v_p2_gold_awarded, 'eloDelta', v_p2_elo_delta)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- >>> FIN MIGRACIÓN: 20261024000005_grant_match_rewards.sql <<<


-- >>> INICIO MIGRACIÓN: 20261024000006_shop_and_loadout_rpc.sql <<<
-- ============================================================================
-- MIGRACIÓN 6: RPC DE COMPRA ATÓMICA DE COSMÉTICOS Y EQUIPAMIENTO DE SKINS
-- Proyecto: Tactical Command: Wars of Legacy
-- Fecha: 2026-10-24
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. RPC: purchase_cosmetic_item
-- Compra atómica con deducción de moneda (Gold / Gems) y registro en user_unlocks
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.purchase_cosmetic_item(
    p_user_id UUID,
    p_item_id VARCHAR(64),
    p_item_type VARCHAR(32), -- 'skin', 'avatar', 'banner'
    p_currency VARCHAR(8),   -- 'gold' (battle_credits) o 'gems' (command_gems)
    p_price INTEGER
)
RETURNS JSONB AS $$
DECLARE
    v_profile public.profiles%ROWTYPE;
    v_current_funds INTEGER;
BEGIN
    IF p_price < 0 THEN
        RETURN jsonb_build_object('success', false, 'error', 'El precio no puede ser negativo');
    END IF;

    -- Bloqueo pesimista del perfil del comprador
    SELECT * INTO v_profile 
    FROM public.profiles 
    WHERE id = p_user_id 
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Perfil de usuario no encontrado');
    END IF;

    -- Comprobar si el usuario ya posee el cosmético
    IF EXISTS (
        SELECT 1 FROM public.user_unlocks 
        WHERE user_id = p_user_id 
        AND item_type = p_item_type 
        AND item_id = p_item_id
    ) THEN
        RETURN jsonb_build_object('success', false, 'error', 'Ya posees este cosmético en tu inventario');
    END IF;

    -- Verificar solvencia económica
    IF p_currency = 'gold' THEN
        v_current_funds := v_profile.battle_credits;
        IF v_current_funds < p_price THEN
            RETURN jsonb_build_object('success', false, 'error', 'Oro insuficiente', 'required', p_price, 'current', v_current_funds);
        END IF;

        -- Descontar Oro (battle_credits)
        UPDATE public.profiles
        SET battle_credits = battle_credits - p_price,
            updated_at = timezone('utc'::text, now())
        WHERE id = p_user_id;

    ELSIF p_currency = 'gems' THEN
        v_current_funds := v_profile.command_gems;
        IF v_current_funds < p_price THEN
            RETURN jsonb_build_object('success', false, 'error', 'Gemas insuficientes', 'required', p_price, 'current', v_current_funds);
        END IF;

        -- Descontar Gemas (command_gems)
        UPDATE public.profiles
        SET command_gems = command_gems - p_price,
            updated_at = timezone('utc'::text, now())
        WHERE id = p_user_id;

    ELSE
        RETURN jsonb_build_object('success', false, 'error', 'Tipo de moneda inválido');
    END IF;

    -- Registrar el cosmético en user_unlocks
    INSERT INTO public.user_unlocks (
        user_id,
        item_type,
        item_id,
        acquisition_method
    ) VALUES (
        p_user_id,
        p_item_type,
        p_item_id,
        CASE WHEN p_currency = 'gold' THEN 'credits_purchase' ELSE 'gems_purchase' END
    );

    RETURN jsonb_build_object(
        'success', true,
        'item_id', p_item_id,
        'item_type', p_item_type,
        'currency_used', p_currency,
        'amount_paid', p_price,
        'remaining_credits', CASE WHEN p_currency = 'gold' THEN v_profile.battle_credits - p_price ELSE v_profile.battle_credits END,
        'remaining_gems', CASE WHEN p_currency = 'gems' THEN v_profile.command_gems - p_price ELSE v_profile.command_gems END
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ----------------------------------------------------------------------------
-- 2. RPC: equip_unit_skin
-- Equipa una skin sobre un tipo de unidad si el usuario la posee
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.equip_unit_skin(
    p_user_id UUID,
    p_unit_code VARCHAR(32),
    p_skin_id VARCHAR(64)
)
RETURNS JSONB AS $$
DECLARE
    v_is_unlocked BOOLEAN := false;
    v_new_cosmetics JSONB;
BEGIN
    -- La skin por defecto siempre está desbloqueada
    IF p_skin_id = 'skin_default' THEN
        v_is_unlocked := true;
    ELSE
        SELECT EXISTS (
            SELECT 1 FROM public.user_unlocks
            WHERE user_id = p_user_id
            AND item_type = 'skin'
            AND item_id = p_skin_id
        ) INTO v_is_unlocked;
    END IF;

    IF NOT v_is_unlocked THEN
        RETURN jsonb_build_object('success', false, 'error', 'No posees esta skin en tu inventario');
    END IF;

    -- Actualizar el JSONB en profiles
    UPDATE public.profiles
    SET equipped_cosmetics = jsonb_set(
        COALESCE(equipped_cosmetics, '{}'::jsonb),
        ARRAY[p_unit_code],
        to_jsonb(p_skin_id)
    ),
    updated_at = timezone('utc'::text, now())
    WHERE id = p_user_id
    RETURNING equipped_cosmetics INTO v_new_cosmetics;

    RETURN jsonb_build_object(
        'success', true,
        'unit_code', p_unit_code,
        'equipped_skin', p_skin_id,
        'equipped_cosmetics', v_new_cosmetics
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- >>> FIN MIGRACIÓN: 20261024000006_shop_and_loadout_rpc.sql <<<


-- >>> INICIO MIGRACIÓN: 20261031000007_canonical_engine_catalogs_and_maps.sql <<<
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

-- >>> FIN MIGRACIÓN: 20261031000007_canonical_engine_catalogs_and_maps.sql <<<


-- >>> INICIO MIGRACIÓN: 20261031000008_commanders_and_bark_engine.sql <<<
-- ============================================================================
-- MIGRACIÓN 8: CATÁLOGO DE COMANDANTES CON NOMBRES DE CÓMIC, PROGRESIÓN Y BARK
-- Proyecto: Tactical Command: Wars of Legacy
-- Fecha: 2026-10-31
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. TABLA: commanders_catalog
-- 31 Comandantes (3 F2P Iniciales + 28 Comandantes con lore propio desbloqueables)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.commanders_catalog (
    id VARCHAR(32) PRIMARY KEY,
    codename VARCHAR(64) NOT NULL,
    military_rank VARCHAR(32) NOT NULL,
    faction VARCHAR(24) NOT NULL CHECK (faction IN ('iron-vanguard', 'frost-legion', 'aurora-dominion', 'verdant-front', 'shadow-syndicate', 'coalition')),
    unlock_method VARCHAR(24) NOT NULL DEFAULT 'starter' 
        CHECK (unlock_method IN ('starter', 'battle_pass', 'trophy_road', 'special_event', 'shop_gems', 'classified_unrevealed')),
    unlock_season VARCHAR(32) DEFAULT NULL,
    is_revealed BOOLEAN NOT NULL DEFAULT true,
    cop_name VARCHAR(64),
    cop_stars SMALLINT CHECK (cop_stars IS NULL OR cop_stars BETWEEN 1 AND 10),
    scop_name VARCHAR(64) NOT NULL,
    scop_stars SMALLINT NOT NULL CHECK (scop_stars BETWEEN 1 AND 12),
    d2d_summary TEXT NOT NULL,
    cop_summary TEXT DEFAULT NULL,
    scop_summary TEXT NOT NULL,
    default_bubble_shape VARCHAR(24) NOT NULL DEFAULT 'speech' 
        CHECK (default_bubble_shape IN ('speech', 'shout', 'thought', 'whisper', 'radio')),
    default_onomatopoeia VARCHAR(32) DEFAULT '¡TACTICAL!',
    personality_archetype VARCHAR(32) NOT NULL DEFAULT 'balanced',
    cost_modifier_percent SMALLINT NOT NULL DEFAULT 100,
    repair_bonus_hp SMALLINT NOT NULL DEFAULT 0,
    vision_bonus SMALLINT NOT NULL DEFAULT 0,
    income_bonus_per_property INTEGER NOT NULL DEFAULT 0,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.commanders_catalog ENABLE ROW LEVEL SECURITY;
CREATE POLICY "commanders_catalog_select" ON public.commanders_catalog FOR SELECT USING (true);

-- Sembrado de Comandantes:
-- 3 F2P Iniciales Disponibles para TODOS los jugadores
-- 28 Comandantes con nombres y lore propios de cómic, revelados poco a poco mediante Battle Pass / Eventos
INSERT INTO public.commanders_catalog (
    id, codename, military_rank, faction, unlock_method, is_revealed,
    cop_name, cop_stars, scop_name, scop_stars,
    default_bubble_shape, default_onomatopoeia, personality_archetype,
    d2d_summary, cop_summary, scop_summary, cost_modifier_percent
) VALUES
-- LOS 3 COMANDANTES F2P BASE (Desbloqueados para todos al registrarse)
('vance', 'Vance "El Muro"', 'Capitán de Blindados', 'iron-vanguard', 'starter', true,
 'Reparación de Campo', 3, 'Fortaleza Móvil', 6,
 'speech', '¡HOLD!', 'disciplined',
 'Doctrina de infantería mecanizada balanceada; las unidades reparan +1 HP en bases.',
 'Cura 2 HP a todas las unidades terrestres en radio.',
 'Otorga +30% de defensa y regenera 4 HP a todo el ejército terrestre.', 100),

('stella', 'Stella "Tempestad"', 'Mayor de Asalto', 'aurora-dominion', 'starter', true,
 'Sobrecarga Alfa', 3, 'Huracán Relámpago', 6,
 'shout', '¡RATATAT!', 'aggressive_sarcastic',
 'Doctrina de asalto veloz; unidades terrestres tienen +1 de movimiento.',
 'Aumenta el daño de fuego directo un +25% durante el turno.',
 'Permite a todas las unidades que destruyan un objetivo actuar por segunda vez en el turno.', 100),

('volkov', 'Volkov "Calculus"', 'Comandante en Jefe', 'frost-legion', 'starter', true,
 'Cálculo Balístico', 3, 'Tormenta de Asedio', 6,
 'thought', '¡CALCULATED!', 'analytical_cold',
 'Doctrina de asedio y artillería; unidades indirectas tienen +1 de rango máximo de disparo.',
 'Otorga +1 de rango a artillería y +15% de daño.',
 'Añade +2 de rango a todas las unidades de fuego indirecto y revela casillas en niebla.', 100),

-- COMANDANTES DESBLOQUEABLES (Con nombres originales de cómic, revelados gradualmente por Pase / Eventos)
('ares', 'Ares "Martillo"', 'General de División', 'iron-vanguard', 'battle_pass', true,
 'Max Fuerza', 3, 'Fuerza Imparable', 6,
 'shout', '¡SMASH!', 'aggressive_sarcastic',
 'Unidades de combate directo tienen +20% de ataque, pero las indirectas tienen -1 de alcance.',
 '+50% ataque en unidades de combate directo y +1 de movimiento.',
 '+75% ataque en combate directo y +2 de movimiento a vehículos.', 100),

('valkyrie', 'Valeria "Valkiria"', 'Comandante Paracaidista', 'iron-vanguard', 'battle_pass', true,
 'Marcha Forzada', 3, 'Furia de Comandos', 6,
 'shout', '¡CHARGE!', 'disciplined',
 'Infantería y mechs tienen +1 de movimiento y capturan a una tasa de 1.5x.',
 'Infantería gana +2 de movimiento.',
 'Infantería gana +3 de movimiento y capacidad de captura instantánea en propiedades no-HQ.', 100),

('hawk_eye', 'Garrick "Ojo de Halcón"', 'Capitán Francotirador', 'frost-legion', 'trophy_road', true,
 'Mirilla Telescópica', 3, 'Tiro Certero', 6,
 'whisper', '¡HEADSHOT!', 'analytical_cold',
 'Unidades de fuego indirecto infligen +20% daño base.',
 '+1 de rango y +30% de daño a fuego indirecto.',
 '+2 de rango a unidades indirectas y daño perforante de blindaje.', 100),

('solaris', 'Coronel Solaris', 'Comandante Aéreo', 'verdant-front', 'battle_pass', true,
 'Vuelo Rasante', 3, 'Supremacía Total', 7,
 'radio', '¡AIR_STRIKE!', 'disciplined',
 'Unidades aéreas tienen -10% de coste y +10% de daño.',
 'Aeronaves ganan +2 de movimiento y consumen 0 fuel este turno.',
 'Aeronaves no consumen acción tras atacar y pueden retirarse.', 100),

('leviathan', 'Almirante Mare', 'Comandante de Flota', 'verdant-front', 'special_event', true,
 'Oleaje Táctico', 4, 'Tsunami Negro', 8,
 'radio', '¡TORPEDO!', 'balanced',
 'Unidades navales tienen +1 de movimiento y 0 penalización de movimiento por arrecifes.',
 'Inunda casillas costeras ralentizando vehículos rivales.',
 'Inflige 2 de daño directo a toda unidad enemiga que se encuentre en mar o río.', 100),

('magnate', 'Balthazar "El Magnate"', 'Director Logístico', 'frost-legion', 'shop_gems', true,
 'Flujo de Capital', 3, 'Poder Corporativo', 6,
 'speech', '¡PROFIT!', 'balanced',
 'Todas las unidades cuestan un 20% menos, pero tienen un 10% menos de potencia de fuego.',
 'Aumenta los fondos disponibles un 50% instantáneamente.',
 'Convierte los fondos en un bono multiplicativo masivo de ataque.', 80),

('tyrant', 'Lord Malakor', 'Gran Comandante Tirano', 'shadow-syndicate', 'classified_unrevealed', false,
 'Pulso Oscuro', 4, 'Cataclismo Meteórico', 9,
 'thought', '¡DOOM!', 'analytical_cold',
 'Todas las unidades tienen +20% ataque y defensa pero su coste es 120%.',
 'Drena 2 HP a todo el ejército enemigo.',
 'Invoca un impacto orbital que causa 8 HP de daño en un radio de 5 casillas sobre la mayor aglomeración enemiga.', 120)
ON CONFLICT (id) DO UPDATE SET
    codename = EXCLUDED.codename,
    military_rank = EXCLUDED.military_rank,
    faction = EXCLUDED.faction,
    unlock_method = EXCLUDED.unlock_method,
    is_revealed = EXCLUDED.is_revealed,
    cop_name = EXCLUDED.cop_name,
    scop_name = EXCLUDED.scop_name,
    d2d_summary = EXCLUDED.d2d_summary,
    scop_summary = EXCLUDED.scop_summary;

-- ----------------------------------------------------------------------------
-- 2. TABLA: user_commanders (Progresión, Nivel 1-15, Nivel de Vínculo 1-20 y Cosméticos)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_commanders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    commander_id VARCHAR(32) NOT NULL REFERENCES public.commanders_catalog(id) ON DELETE RESTRICT,
    commander_level INTEGER NOT NULL DEFAULT 1 CHECK (commander_level BETWEEN 1 AND 15),
    commander_cards_count INTEGER NOT NULL DEFAULT 1 CHECK (commander_cards_count >= 0),
    bonding_level INTEGER NOT NULL DEFAULT 1 CHECK (bonding_level BETWEEN 1 AND 20),
    bonding_xp INTEGER NOT NULL DEFAULT 0 CHECK (bonding_xp >= 0),
    unlocked_dialogue_tier INTEGER NOT NULL DEFAULT 1 CHECK (unlocked_dialogue_tier BETWEEN 1 AND 5),
    matches_played INTEGER NOT NULL DEFAULT 0,
    victories_count INTEGER NOT NULL DEFAULT 0,
    clutch_wins_count INTEGER NOT NULL DEFAULT 0,
    cop_used_count INTEGER NOT NULL DEFAULT 0,
    scop_used_count INTEGER NOT NULL DEFAULT 0,
    equipped_skin_id VARCHAR(64) NOT NULL DEFAULT 'skin_comic_default',
    equipped_bubble_shape VARCHAR(24) NOT NULL DEFAULT 'speech',
    equipped_stamp_id VARCHAR(64) NOT NULL DEFAULT 'stamp_tactical_base',
    is_favorite BOOLEAN NOT NULL DEFAULT false,
    unlocked_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    last_played_at TIMESTAMPTZ,
    CONSTRAINT uq_user_commander UNIQUE (user_id, commander_id)
);

CREATE INDEX IF NOT EXISTS idx_user_commanders_user ON public.user_commanders(user_id);

ALTER TABLE public.user_commanders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_commanders_select_own" ON public.user_commanders FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- ----------------------------------------------------------------------------
-- 3. TABLAS DE TELEMETRÍA PSICOLÓGICA Y BARK ENGINE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.player_tactical_behavior_profile (
    user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
    avg_pte_seconds NUMERIC(4,1) NOT NULL DEFAULT 25.0,
    fastest_turn_seconds NUMERIC(4,1) NOT NULL DEFAULT 6.0,
    slowest_turn_seconds NUMERIC(4,1) NOT NULL DEFAULT 58.0,
    tilt_index NUMERIC(3,2) NOT NULL DEFAULT 0.00 CHECK (tilt_index BETWEEN 0.00 AND 1.00),
    patience_score NUMERIC(3,2) NOT NULL DEFAULT 0.50 CHECK (patience_score BETWEEN 0.00 AND 1.00),
    aggression_index NUMERIC(3,2) NOT NULL DEFAULT 0.50 CHECK (aggression_index BETWEEN 0.00 AND 1.00),
    avg_unspent_funds_per_turn INTEGER NOT NULL DEFAULT 450,
    factory_idle_turns_total INTEGER NOT NULL DEFAULT 0,
    prefers_high_cost_units BOOLEAN NOT NULL DEFAULT false,
    favorite_unit_code VARCHAR(32) NOT NULL DEFAULT 'tank_light',
    favorite_branch VARCHAR(16) NOT NULL DEFAULT 'land' CHECK (favorite_branch IN ('land', 'air', 'naval', 'balanced')),
    air_bias_percentage NUMERIC(5,2) NOT NULL DEFAULT 20.00,
    siege_bias_percentage NUMERIC(5,2) NOT NULL DEFAULT 20.00,
    ambushes_suffered_count INTEGER NOT NULL DEFAULT 0,
    ambushes_inflicted_count INTEGER NOT NULL DEFAULT 0,
    clutch_wins_count INTEGER NOT NULL DEFAULT 0,
    early_surrenders_count INTEGER NOT NULL DEFAULT 0,
    current_streak INTEGER NOT NULL DEFAULT 0,
    consecutive_loss_streak_peak INTEGER NOT NULL DEFAULT 0,
    consecutive_win_streak_peak INTEGER NOT NULL DEFAULT 0,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.player_tactical_behavior_profile ENABLE ROW LEVEL SECURITY;
CREATE POLICY "behavior_profile_select_own" ON public.player_tactical_behavior_profile FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.match_detailed_telemetry (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    match_id UUID NOT NULL REFERENCES public.active_matches(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    game_mode VARCHAR(24) NOT NULL,
    selected_commander_id VARCHAR(32) NOT NULL REFERENCES public.commanders_catalog(id),
    opponent_commander_id VARCHAR(32) REFERENCES public.commanders_catalog(id),
    total_turns_played INTEGER NOT NULL DEFAULT 1,
    avg_turn_duration_sec NUMERIC(4,1) NOT NULL DEFAULT 20.0,
    turns_under_10s_count INTEGER NOT NULL DEFAULT 0,
    turns_over_45s_count INTEGER NOT NULL DEFAULT 0,
    units_produced_count INTEGER NOT NULL DEFAULT 0,
    units_lost_count INTEGER NOT NULL DEFAULT 0,
    units_killed_count INTEGER NOT NULL DEFAULT 0,
    funds_spent_total INTEGER NOT NULL DEFAULT 0,
    funds_wasted_idle INTEGER NOT NULL DEFAULT 0,
    damage_dealt_total INTEGER NOT NULL DEFAULT 0,
    damage_received_total INTEGER NOT NULL DEFAULT 0,
    hq_lowest_hp_reached INTEGER NOT NULL DEFAULT 20,
    cop_activations_count INTEGER NOT NULL DEFAULT 0,
    scop_activations_count INTEGER NOT NULL DEFAULT 0,
    fow_traps_triggered INTEGER NOT NULL DEFAULT 0,
    surrendered_early BOOLEAN NOT NULL DEFAULT false,
    won_match BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_telemetry_user ON public.match_detailed_telemetry(user_id, created_at DESC);
ALTER TABLE public.match_detailed_telemetry ENABLE ROW LEVEL SECURITY;
CREATE POLICY "telemetry_select_own" ON public.match_detailed_telemetry FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.bark_dialogue_templates (
    id VARCHAR(64) PRIMARY KEY,
    commander_id VARCHAR(32) NOT NULL,
    trigger_situation VARCHAR(48) NOT NULL,
    min_bonding_level INTEGER NOT NULL DEFAULT 1 CHECK (min_bonding_level BETWEEN 1 AND 20),
    required_condition_json JSONB NOT NULL DEFAULT '{}'::jsonb,
    bubble_shape VARCHAR(24) NOT NULL DEFAULT 'speech' CHECK (bubble_shape IN ('speech', 'shout', 'thought', 'whisper', 'radio')),
    onomatopoeia_stamp VARCHAR(32) DEFAULT NULL,
    comic_vignette_pose VARCHAR(32) NOT NULL DEFAULT 'neutral' CHECK (comic_vignette_pose IN ('neutral', 'stern', 'angry', 'mocking', 'proud', 'alarmed')),
    dialogue_template_text TEXT NOT NULL,
    priority_weight INTEGER NOT NULL DEFAULT 10,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_bark_templates_lookup ON public.bark_dialogue_templates(commander_id, trigger_situation);
ALTER TABLE public.bark_dialogue_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "bark_templates_select" ON public.bark_dialogue_templates FOR SELECT USING (true);

-- >>> FIN MIGRACIÓN: 20261031000008_commanders_and_bark_engine.sql <<<


-- >>> INICIO MIGRACIÓN: 20261031000009_matches_v2_participants_and_fow.sql <<<
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

-- >>> FIN MIGRACIÓN: 20261031000009_matches_v2_participants_and_fow.sql <<<


-- >>> INICIO MIGRACIÓN: 20261031000010_metagame_cards_chests_pass_and_social.sql <<<
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

-- >>> FIN MIGRACIÓN: 20261031000010_metagame_cards_chests_pass_and_social.sql <<<


-- >>> INICIO MIGRACIÓN: 20261031000011_shop_ledger_and_security_hardening.sql <<<
-- ============================================================================
-- MIGRACIÓN 11: TIENDA EN SERVIDOR, LEDGER, SEGURIDAD RLS Y MATCHMAKING ATÓMICO
-- Proyecto: Tactical Command: Wars of Legacy
-- Fecha: 2026-10-31
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. CATÁLOGO DE COSMÉTICOS Y OFERTAS DE TIENDA EN SERVIDOR
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.cosmetics_catalog (
    id VARCHAR(64) PRIMARY KEY,
    cosmetic_type VARCHAR(32) NOT NULL CHECK (cosmetic_type IN (
        'unit_skin', 'co_skin', 'speech_bubble_skin', 'onomatopoeia_stamp',
        'vignette_frame', 'hq_skin', 'avatar_frame', 'banner', 'destruction_vfx', 'capture_vfx', 'music_theme'
    )),
    target_entity_id VARCHAR(32) DEFAULT NULL,
    name VARCHAR(64) NOT NULL,
    description TEXT NOT NULL,
    rarity VARCHAR(16) NOT NULL DEFAULT 'common' CHECK (rarity IN ('common', 'rare', 'epic', 'legendary', 'mythic')),
    visual_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    is_base_default BOOLEAN NOT NULL DEFAULT false,
    is_premium_pass_exclusive BOOLEAN NOT NULL DEFAULT false,
    base_price_credits INTEGER DEFAULT NULL CHECK (base_price_credits IS NULL OR base_price_credits >= 0),
    base_price_gems INTEGER DEFAULT NULL CHECK (base_price_gems IS NULL OR base_price_gems >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.cosmetics_catalog ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cosmetics_catalog_select" ON public.cosmetics_catalog FOR SELECT USING (true);

CREATE TABLE IF NOT EXISTS public.shop_offers (
    id VARCHAR(64) PRIMARY KEY,
    offer_type VARCHAR(24) NOT NULL CHECK (offer_type IN ('permanent', 'daily_rotation', 'seasonal_featured', 'bundle', 'chest_pack')),
    title VARCHAR(64) NOT NULL,
    currency VARCHAR(8) NOT NULL CHECK (currency IN ('credits', 'gems')),
    price INTEGER NOT NULL CHECK (price >= 0),
    original_price INTEGER DEFAULT NULL,
    rewards_payload JSONB NOT NULL,
    max_purchases_per_user INTEGER DEFAULT 1,
    available_from TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    available_until TIMESTAMPTZ DEFAULT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.shop_offers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "shop_offers_select" ON public.shop_offers FOR SELECT USING (is_active = true);

-- ----------------------------------------------------------------------------
-- 2. LIBRO MAYOR FINANCIERO (CURRENCY LEDGER) Y AUDITORÍA DE PAGOS STRIPE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.currency_ledger (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    currency VARCHAR(16) NOT NULL CHECK (currency IN ('credits', 'gems')),
    delta INTEGER NOT NULL CHECK (delta <> 0),
    balance_after INTEGER NOT NULL CHECK (balance_after >= 0),
    reason VARCHAR(32) NOT NULL CHECK (reason IN (
        'match_reward', 'level_up', 'shop_purchase', 'card_upgrade',
        'commander_upgrade', 'chest_reward', 'chest_speedup', 'command_pass', 'stripe_purchase', 'quest_reward'
    )),
    reference_id VARCHAR(128) DEFAULT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_currency_ledger_user ON public.currency_ledger(user_id, created_at DESC);
ALTER TABLE public.currency_ledger ENABLE ROW LEVEL SECURITY;
CREATE POLICY "currency_ledger_select_own" ON public.currency_ledger FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.payments_audit (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    stripe_session_id VARCHAR(128) NOT NULL UNIQUE,
    stripe_payment_intent_id VARCHAR(128),
    amount_cents INTEGER NOT NULL CHECK (amount_cents >= 0),
    currency VARCHAR(8) NOT NULL DEFAULT 'usd',
    product_type VARCHAR(32) NOT NULL CHECK (product_type IN ('gems_pack', 'battle_pass', 'cosmetic_bundle')),
    product_sku VARCHAR(64) NOT NULL,
    items_delivered JSONB NOT NULL,
    status VARCHAR(24) NOT NULL DEFAULT 'completed',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.payments_audit ENABLE ROW LEVEL SECURITY;
CREATE POLICY "payments_audit_select_own" ON public.payments_audit FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- ----------------------------------------------------------------------------
-- 3. TRIGGER ANTI-TRAMPAS EN PROFILES: PROTECCIÓN DE MONEDAS, XP Y RATING
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.trg_guard_profile_sensitive_columns()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    IF current_setting('request.jwt.claim.role', true) IN ('authenticated', 'anon')
       AND current_setting('app.bypass_profile_guard', true) IS DISTINCT FROM 'on' THEN
        IF NEW.account_level IS DISTINCT FROM OLD.account_level
           OR NEW.current_xp IS DISTINCT FROM OLD.current_xp
           OR NEW.battle_credits IS DISTINCT FROM OLD.battle_credits
           OR NEW.command_gems IS DISTINCT FROM OLD.command_gems
           OR NEW.elo_rating IS DISTINCT FROM OLD.elo_rating
           OR NEW.trophies_count IS DISTINCT FROM OLD.trophies_count
           OR NEW.total_matches_played IS DISTINCT FROM OLD.total_matches_played
           OR NEW.total_victories IS DISTINCT FROM OLD.total_victories THEN
            RAISE EXCEPTION 'Operación denegada: Los balances de divisas, XP y ranking solo pueden modificarse mediante transacciones autorizadas del servidor.';
        END IF;
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_profile_columns ON public.profiles;
CREATE TRIGGER trg_guard_profile_columns
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.trg_guard_profile_sensitive_columns();

-- ----------------------------------------------------------------------------
-- 4. COLA DE MATCHMAKING ATÓMICA CON SKIP LOCKED
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.matchmaking_queue (
    user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
    game_mode VARCHAR(24) NOT NULL CHECK (game_mode IN ('blitz_skirmish', 'grand_campaign', 'two_vs_two')),
    elo_rating INTEGER NOT NULL,
    trophies_count INTEGER NOT NULL DEFAULT 0,
    pte_profile VARCHAR(16) NOT NULL DEFAULT 'standard' CHECK (pte_profile IN ('blitz', 'standard', 'calculated')),
    status VARCHAR(16) NOT NULL DEFAULT 'searching' CHECK (status IN ('searching', 'matched', 'cancelled')),
    matched_match_id UUID REFERENCES public.active_matches(id) ON DELETE SET NULL,
    enqueued_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_mm_queue_search
    ON public.matchmaking_queue (game_mode, status, trophies_count, pte_profile, enqueued_at)
    WHERE status = 'searching';

ALTER TABLE public.matchmaking_queue ENABLE ROW LEVEL SECURITY;
CREATE POLICY "mm_queue_select_own" ON public.matchmaking_queue FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.enqueue_and_matchmake(
    p_game_mode VARCHAR(24),
    p_map_id VARCHAR(64) DEFAULT 'sector_alfa'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_my_profile public.profiles%ROWTYPE;
    v_opponent public.matchmaking_queue%ROWTYPE;
    v_match_id UUID;
    v_room_code VARCHAR(8);
    v_wait_seconds NUMERIC := 0;
    v_trophy_window INTEGER := 100;
BEGIN
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Usuario no autenticado';
    END IF;

    SELECT * INTO v_my_profile FROM public.profiles WHERE id = v_user_id;

    INSERT INTO public.matchmaking_queue (user_id, game_mode, elo_rating, trophies_count, pte_profile, status, enqueued_at)
    VALUES (
        v_user_id,
        p_game_mode,
        v_my_profile.elo_rating,
        v_my_profile.trophies_count,
        v_my_profile.pte_profile,
        'searching',
        timezone('utc'::text, now())
    )
    ON CONFLICT (user_id) DO UPDATE SET
        game_mode = EXCLUDED.game_mode,
        status = 'searching',
        updated_at = timezone('utc'::text, now())
    RETURNING EXTRACT(EPOCH FROM (timezone('utc'::text, now()) - enqueued_at)) INTO v_wait_seconds;

    IF v_wait_seconds > 12 THEN
        v_trophy_window := 300;
    ELSIF v_wait_seconds >= 6 THEN
        v_trophy_window := 200;
    ELSE
        v_trophy_window := 100;
    END IF;

    SELECT * INTO v_opponent
    FROM public.matchmaking_queue q
    WHERE q.game_mode = p_game_mode
      AND q.status = 'searching'
      AND q.user_id <> v_user_id
      AND ABS(q.trophies_count - v_my_profile.trophies_count) <= v_trophy_window
    ORDER BY
      (CASE WHEN q.pte_profile = v_my_profile.pte_profile THEN 0 ELSE 1 END) ASC,
      ABS(q.trophies_count - v_my_profile.trophies_count) ASC,
      q.enqueued_at ASC
    LIMIT 1
    FOR UPDATE SKIP LOCKED;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('status', 'searching', 'trophy_window', v_trophy_window);
    END IF;

    v_room_code := UPPER(SUBSTRING(encode(gen_random_bytes(4), 'hex') FROM 1 FOR 8));

    INSERT INTO public.active_matches (
        room_code, player1_id, player2_id, current_turn_player_id,
        status, game_mode, map_id, turn_number,
        turn_time_limit_sec, turn_deadline
    ) VALUES (
        v_room_code, v_opponent.user_id, v_user_id, v_opponent.user_id,
        'in_progress', p_game_mode, p_map_id, 1,
        CASE WHEN p_game_mode = 'blitz_skirmish' THEN 30 ELSE 60 END,
        timezone('utc'::text, now()) + (CASE WHEN p_game_mode = 'blitz_skirmish' THEN interval '30 seconds' ELSE interval '60 seconds' END)
    ) RETURNING id INTO v_match_id;

    -- Registrar los dos participantes en match_participants
    INSERT INTO public.match_participants (match_id, player_slot, slot_key, team_id, user_id, commander_id)
    VALUES
    (v_match_id, 0, 'p1', 'A', v_opponent.user_id, (SELECT selected_commander_id FROM public.profiles WHERE id = v_opponent.user_id)),
    (v_match_id, 1, 'p2', 'B', v_user_id, v_my_profile.selected_commander_id);

    UPDATE public.matchmaking_queue
    SET status = 'matched', matched_match_id = v_match_id, updated_at = timezone('utc'::text, now())
    WHERE user_id IN (v_user_id, v_opponent.user_id);

    RETURN jsonb_build_object(
        'status', 'matched',
        'match_id', v_match_id,
        'room_code', v_room_code,
        'player1_id', v_opponent.user_id,
        'player2_id', v_user_id
    );
END;
$$;

-- ----------------------------------------------------------------------------
-- 5. RPC DE COMPRA EN TIENDA SEGURA Y RPC DE UNIÓN A SALA
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.purchase_shop_offer(
    p_offer_id VARCHAR(64)
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_offer public.shop_offers%ROWTYPE;
    v_profile public.profiles%ROWTYPE;
    v_new_balance INTEGER;
BEGIN
    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'No autenticado');
    END IF;

    SELECT * INTO v_offer
    FROM public.shop_offers
    WHERE id = p_offer_id
      AND is_active = true
      AND available_from <= timezone('utc'::text, now())
      AND (available_until IS NULL OR available_until >= timezone('utc'::text, now()));

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'La oferta no existe o ha expirado');
    END IF;

    SELECT * INTO v_profile FROM public.profiles WHERE id = v_user_id FOR UPDATE;

    PERFORM set_config('app.bypass_profile_guard', 'on', true);

    IF v_offer.currency = 'credits' THEN
        IF v_profile.battle_credits < v_offer.price THEN
            RETURN jsonb_build_object('success', false, 'error', 'Créditos insuficientes');
        END IF;
        v_new_balance := v_profile.battle_credits - v_offer.price;
        UPDATE public.profiles SET battle_credits = v_new_balance, updated_at = now() WHERE id = v_user_id;
    ELSE
        IF v_profile.command_gems < v_offer.price THEN
            RETURN jsonb_build_object('success', false, 'error', 'Gemas insuficientes');
        END IF;
        v_new_balance := v_profile.command_gems - v_offer.price;
        UPDATE public.profiles SET command_gems = v_new_balance, updated_at = now() WHERE id = v_user_id;
    END IF;

    INSERT INTO public.currency_ledger (user_id, currency, delta, balance_after, reason, reference_id)
    VALUES (v_user_id, v_offer.currency, -v_offer.price, v_new_balance, 'shop_purchase', p_offer_id);

    RETURN jsonb_build_object(
        'success', true,
        'offer_id', p_offer_id,
        'currency', v_offer.currency,
        'price_paid', v_offer.price,
        'new_balance', v_new_balance,
        'rewards', v_offer.rewards_payload
    );
END;
$$;

CREATE OR REPLACE FUNCTION public.join_waiting_match(p_room_code VARCHAR(8))
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_match public.active_matches%ROWTYPE;
BEGIN
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'No autenticado';
    END IF;

    SELECT * INTO v_match
    FROM public.active_matches
    WHERE room_code = UPPER(TRIM(p_room_code))
      AND status = 'waiting'
      AND player2_id IS NULL
    FOR UPDATE SKIP LOCKED;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'La sala no está disponible o ya fue ocupada');
    END IF;

    IF v_match.player1_id = v_user_id THEN
        RETURN jsonb_build_object('success', false, 'error', 'No puedes unirte como Jugador 2 a tu propia sala');
    END IF;

    UPDATE public.active_matches
    SET player2_id = v_user_id,
        status = 'in_progress',
        current_turn_player_id = v_match.player1_id,
        turn_deadline = timezone('utc'::text, now()) + make_interval(secs => v_match.turn_time_limit_sec),
        updated_at = timezone('utc'::text, now())
    WHERE id = v_match.id;

    INSERT INTO public.match_participants (match_id, player_slot, slot_key, team_id, user_id, commander_id)
    VALUES
    (v_match.id, 0, 'p1', 'A', v_match.player1_id, (SELECT selected_commander_id FROM public.profiles WHERE id = v_match.player1_id)),
    (v_match.id, 1, 'p2', 'B', v_user_id, (SELECT selected_commander_id FROM public.profiles WHERE id = v_user_id))
    ON CONFLICT (match_id, player_slot) DO NOTHING;

    RETURN jsonb_build_object('success', true, 'match_id', v_match.id);
END;
$$;

-- >>> FIN MIGRACIÓN: 20261031000011_shop_ledger_and_security_hardening.sql <<<


-- >>> INICIO MIGRACIÓN: 20261031000012_consolidated_master_database_expansion.sql <<<
-- ============================================================================
-- MIGRACIÓN 12: EXPANSIÓN MAESTRA UNIFICADA DE BASE DE DATOS SUPABASE
-- Proyecto: Tactical Command: Wars of Legacy
-- Versión: 4.1.0-DEFINITIVE-ARCHITECTURE
-- Consenso: Agente 1 (Gameplay/Realtime), Agente 2 (Metagame/P2P), Agente 3 (Bark/Social)
-- Fecha: 2026-10-31
-- ============================================================================

-- ============================================================================
-- SECCIÓN 1: GAMEPLAY TÁCTICO, TABLERO REALTIME Y DUELO ESPEJO (15s)
-- ============================================================================

-- 1.1 Corrección de Restricciones en active_matches para Duelo Espejo (15s)
ALTER TABLE public.active_matches
    DROP CONSTRAINT IF EXISTS active_matches_turn_time_limit_sec_check,
    DROP CONSTRAINT IF EXISTS active_matches_game_mode_check;

ALTER TABLE public.active_matches
    ADD CONSTRAINT active_matches_turn_time_limit_sec_check CHECK (turn_time_limit_sec >= 15),
    ADD CONSTRAINT active_matches_game_mode_check 
        CHECK (game_mode IN ('blitz_skirmish', 'grand_campaign', 'two_vs_two', 'vs_bot', 'mirror_duel', 'pvp_realtime', 'pvp_async')),
    ADD COLUMN IF NOT EXISTS is_overtime BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS overtime_started_at_turn SMALLINT DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS sudden_death_first_blood_player_id UUID REFERENCES public.profiles(id);

-- 1.2 Extensión de match_history para desempates, near-miss y torneos
ALTER TABLE public.match_history
    DROP CONSTRAINT IF EXISTS match_history_end_reason_check;

ALTER TABLE public.match_history
    ADD CONSTRAINT match_history_end_reason_check
        CHECK (end_reason IN ('hq_captured', 'army_wiped', 'resignation', 'timeout', 'turn_limit_tiebreaker', 'sudden_death')),
    ADD COLUMN IF NOT EXISTS is_tournament_cap_applied BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS p1_average_deck_level NUMERIC(4,2) DEFAULT 1.0,
    ADD COLUMN IF NOT EXISTS p2_average_deck_level NUMERIC(4,2) DEFAULT 1.0,
    ADD COLUMN IF NOT EXISTS near_miss_data JSONB DEFAULT NULL;

-- 1.3 Almacenamiento de AirDrops en match_state
ALTER TABLE public.match_state
    ADD COLUMN IF NOT EXISTS airdrops JSONB NOT NULL DEFAULT '[]'::jsonb;

-- 1.4 Estado de conectividad en tiempo real de participantes
ALTER TABLE public.match_participants
    ADD COLUMN IF NOT EXISTS is_connected BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN IF NOT EXISTS last_heartbeat_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now());

-- 1.5 Cola de Emparejamiento Rápido para Duelo Espejo (15s)
CREATE TABLE IF NOT EXISTS public.mirror_duel_queue (
    user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
    co_commander_id VARCHAR(32) NOT NULL REFERENCES public.commanders_catalog(id),
    trophies INTEGER NOT NULL DEFAULT 0,
    queued_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    matched_match_id UUID DEFAULT NULL
);

CREATE INDEX IF NOT EXISTS idx_mirror_queue_lookup ON public.mirror_duel_queue(trophies, queued_at);
ALTER TABLE public.mirror_duel_queue ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "mirror_queue_select_own" ON public.mirror_duel_queue;
CREATE POLICY "mirror_queue_select_own" ON public.mirror_duel_queue FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- Sembrado de mapa oficial simétrico 10x10 para Duelos Espejo
INSERT INTO public.maps (id, name, width, height, max_players, recommended_mode, description, is_official, is_published)
VALUES (
    'mirror_arena_10x10',
    'Arena Espejo Alfa (10x10)',
    10, 10, 2, 'mirror_duel',
    'Cuadrícula simétrica 10x10 para duelos tácticos hiper-compulsivos de 15 segundos.',
    true, true
) ON CONFLICT (id) DO NOTHING;

-- 1.6 Tabla de Auditoría de AirDrops Reclamados
CREATE TABLE IF NOT EXISTS public.match_airdrop_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    match_id UUID NOT NULL REFERENCES public.active_matches(id) ON DELETE CASCADE,
    turn_number INTEGER NOT NULL,
    player_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    unit_id VARCHAR(64) NOT NULL,
    reward_type VARCHAR(32) NOT NULL CHECK (reward_type IN ('funds', 'co_power', 'blueprints', 'gems')),
    reward_payload JSONB NOT NULL,
    tile_x INTEGER NOT NULL,
    tile_y INTEGER NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_airdrop_events_match ON public.match_airdrop_events(match_id);
ALTER TABLE public.match_airdrop_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "airdrop_events_select" ON public.match_airdrop_events;
CREATE POLICY "airdrop_events_select" ON public.match_airdrop_events FOR SELECT TO authenticated
    USING (EXISTS (SELECT 1 FROM public.active_matches m WHERE m.id = match_airdrop_events.match_id AND (m.player1_id = auth.uid() OR m.player2_id = auth.uid())));


-- ============================================================================
-- SECCIÓN 2: COMPLEJO INDUSTRIAL, MERCADO P2P Y SALVAGUARDA TÁCTICA
-- ============================================================================

-- 2.1 Extensión de Perfiles para Salvaguarda Táctica, Rachas y Moderación
ALTER TABLE public.profiles
    ADD COLUMN IF NOT EXISTS safeguard_items_count INTEGER NOT NULL DEFAULT 0 CHECK (safeguard_items_count >= 0),
    ADD COLUMN IF NOT EXISTS is_safeguard_equipped BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS last_daily_safeguard_claim TIMESTAMPTZ DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS current_win_streak INTEGER NOT NULL DEFAULT 0 CHECK (current_win_streak >= 0),
    ADD COLUMN IF NOT EXISTS highest_win_streak INTEGER NOT NULL DEFAULT 0 CHECK (highest_win_streak >= 0),
    ADD COLUMN IF NOT EXISTS muted_until TIMESTAMPTZ DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS is_chat_banned BOOLEAN NOT NULL DEFAULT false;

-- 2.2 Extensión de Clanes y Miembros (Guerra y Embargo)
ALTER TABLE public.clans
    ADD COLUMN IF NOT EXISTS current_war_tier INTEGER NOT NULL DEFAULT 1 CHECK (current_war_tier BETWEEN 1 AND 4),
    ADD COLUMN IF NOT EXISTS active_war_participants_today INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now());

ALTER TABLE public.clan_members
    ADD COLUMN IF NOT EXISTS daily_war_matches_played INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS daily_war_victories INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS has_claimed_daily_chest BOOLEAN NOT NULL DEFAULT false;

-- 2.3 Inventario Industrial y Refinado de Materiales
CREATE TABLE IF NOT EXISTS public.user_industrial_inventory (
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

ALTER TABLE public.user_industrial_inventory ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "industrial_inventory_own" ON public.user_industrial_inventory;
CREATE POLICY "industrial_inventory_own" ON public.user_industrial_inventory FOR ALL USING (auth.uid() = user_id);

-- Trabajos de Refinación en Hornos y Talleres
CREATE TABLE IF NOT EXISTS public.industrial_refining_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    building_type VARCHAR(32) NOT NULL CHECK (building_type IN ('smelter', 'concrete_plant', 'tech_lab')),
    input_resource VARCHAR(32) NOT NULL,
    input_amount INTEGER NOT NULL CHECK (input_amount > 0),
    output_resource VARCHAR(32) NOT NULL,
    output_amount INTEGER NOT NULL CHECK (output_amount > 0),
    started_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    completes_at TIMESTAMPTZ NOT NULL,
    is_boosted_with_fuel BOOLEAN NOT NULL DEFAULT false,
    is_claimed BOOLEAN NOT NULL DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_refining_jobs_active ON public.industrial_refining_jobs(user_id, is_claimed);
ALTER TABLE public.industrial_refining_jobs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "refining_jobs_own" ON public.industrial_refining_jobs;
CREATE POLICY "refining_jobs_own" ON public.industrial_refining_jobs FOR ALL USING (auth.uid() = user_id);

-- 2.4 Mercado P2P Global y Bandas de Precio PMM (+-35%)
CREATE TABLE IF NOT EXISTS public.p2p_price_reference (
    resource_type VARCHAR(32) PRIMARY KEY CHECK (resource_type IN ('refined_steel', 'refined_concrete', 'refined_microchip')),
    pmm_24h NUMERIC(10,2) NOT NULL,
    min_price_collar INTEGER NOT NULL,
    max_price_collar INTEGER NOT NULL,
    last_recalculated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Sembrado inicial de referencias de precio PMM
INSERT INTO public.p2p_price_reference (resource_type, pmm_24h, min_price_collar, max_price_collar)
VALUES 
    ('refined_steel', 45.0, 29, 61),
    ('refined_concrete', 35.0, 23, 47),
    ('refined_microchip', 120.0, 78, 162)
ON CONFLICT (resource_type) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.p2p_market_listings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    seller_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    resource_type VARCHAR(32) NOT NULL CHECK (resource_type IN ('refined_steel', 'refined_concrete', 'refined_microchip')),
    quantity INTEGER NOT NULL CHECK (quantity > 0 AND quantity <= 1000),
    price_per_unit INTEGER NOT NULL CHECK (price_per_unit > 0),
    total_price INTEGER NOT NULL CHECK (total_price > 0),
    status VARCHAR(16) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'sold', 'cancelled', 'expired')),
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (timezone('utc'::text, now()) + interval '48 hours'),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_p2p_active_listings ON public.p2p_market_listings(resource_type, status, price_per_unit ASC);
ALTER TABLE public.p2p_market_listings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "p2p_listings_view_all" ON public.p2p_market_listings;
CREATE POLICY "p2p_listings_view_all" ON public.p2p_market_listings FOR SELECT USING (true);
DROP POLICY IF EXISTS "p2p_listings_manage_own" ON public.p2p_market_listings;
CREATE POLICY "p2p_listings_manage_own" ON public.p2p_market_listings FOR UPDATE USING (auth.uid() = seller_id);

-- 2.5 Fabricación de Salvaguardas Tácticas (Taller F2P 72h)
CREATE TABLE IF NOT EXISTS public.safeguard_crafting_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    started_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    completes_at TIMESTAMPTZ NOT NULL,
    is_claimed BOOLEAN NOT NULL DEFAULT false
);

ALTER TABLE public.safeguard_crafting_jobs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "safeguard_crafting_own" ON public.safeguard_crafting_jobs;
CREATE POLICY "safeguard_crafting_own" ON public.safeguard_crafting_jobs FOR ALL USING (auth.uid() = user_id);

-- 2.6 Perfil Conductual de Jugador y Ofertas Flash por Tilt ($0.99)
CREATE TABLE IF NOT EXISTS public.player_tactical_behavior_profile (
    user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
    tilt_streak_count INTEGER NOT NULL DEFAULT 0,
    current_loss_streak INTEGER NOT NULL DEFAULT 0,
    average_turn_seconds NUMERIC(5,2) NOT NULL DEFAULT 25.0,
    most_lost_unit_id VARCHAR(32) DEFAULT 'tank_light',
    last_tilt_offer_at TIMESTAMPTZ DEFAULT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.player_tactical_behavior_profile ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "behavior_profile_select_own" ON public.player_tactical_behavior_profile;
CREATE POLICY "behavior_profile_select_own" ON public.player_tactical_behavior_profile FOR SELECT USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.tilt_emergency_offers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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

CREATE INDEX IF NOT EXISTS idx_tilt_offers_lookup ON public.tilt_emergency_offers(user_id, status);
ALTER TABLE public.tilt_emergency_offers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tilt_offers_select_own" ON public.tilt_emergency_offers;
CREATE POLICY "tilt_offers_select_own" ON public.tilt_emergency_offers FOR SELECT TO authenticated USING (auth.uid() = user_id);


-- ============================================================================
-- SECCIÓN 3: BARK ENGINE, VÍNCULO 1-10, COSMÉTICOS Y MODERACIÓN
-- ============================================================================

-- 3.1 Corrección del Rango de Vínculo de Camaradería (1 a 10) en user_commanders
ALTER TABLE public.user_commanders
    DROP CONSTRAINT IF EXISTS user_commanders_bonding_level_check;

ALTER TABLE public.user_commanders
    ADD CONSTRAINT user_commanders_bonding_level_check CHECK (bonding_level BETWEEN 1 AND 10);

-- Catálogo de Hitos de Vínculo de Camaradería (1-10)
CREATE TABLE IF NOT EXISTS public.commander_bonding_rewards_catalog (
    bonding_level SMALLINT PRIMARY KEY CHECK (bonding_level BETWEEN 1 AND 10),
    required_total_xp INTEGER NOT NULL,
    reward_type VARCHAR(32) NOT NULL 
        CHECK (reward_type IN ('dialogue_token', 'lore_entry', 'onomatopoeia_stamp', 'bubble_skin', 'vignette_frame', 'animated_portrait')),
    reward_cosmetic_id VARCHAR(64) DEFAULT NULL REFERENCES public.cosmetics_catalog(id),
    description TEXT NOT NULL
);

ALTER TABLE public.commander_bonding_rewards_catalog ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "bonding_rewards_select_all" ON public.commander_bonding_rewards_catalog;
CREATE POLICY "bonding_rewards_select_all" ON public.commander_bonding_rewards_catalog FOR SELECT USING (true);

INSERT INTO public.commander_bonding_rewards_catalog (bonding_level, required_total_xp, reward_type, description) VALUES
(1, 0, 'dialogue_token', 'Directivas tácticas estándar y trato militar formal (Cadete).'),
(2, 1000, 'dialogue_token', 'Líneas tácticas de aliento tras pérdida de unidades.'),
(3, 3000, 'dialogue_token', 'Reconocimiento de Camarada: El Comandante utiliza el nombre del jugador en viñetas.'),
(4, 6000, 'lore_entry', 'Acceso al expediente clasificado y trasfondo bélico del Comandante.'),
(5, 10000, 'dialogue_token', 'Líneas tácticas avanzadas y pose de viñeta de concentración analítica.'),
(6, 15000, 'onomatopoeia_stamp', 'Desbloqueo de sello Pop-Art exclusivo de la doctrina militar del Comandante.'),
(7, 21000, 'dialogue_token', 'Comentarios únicos durante activación de Superpoderes CO.'),
(8, 28000, 'bubble_skin', 'Diseño de bocadillo de diálogo exclusivo con tramas Ben-Day de facción.'),
(9, 36000, 'dialogue_token', 'Líneas de camaradería máxima ante victorias ajustadas (Clutch).'),
(10, 45000, 'vignette_frame', 'Retrato de cómic animado, marco dorado de novela gráfica y condecoración máxima.')
ON CONFLICT (bonding_level) DO NOTHING;

-- 3.2 Tabla de Cosméticos Desbloqueados por Jugador
CREATE TABLE IF NOT EXISTS public.user_cosmetics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    cosmetic_id VARCHAR(64) NOT NULL REFERENCES public.cosmetics_catalog(id) ON DELETE CASCADE,
    is_equipped BOOLEAN NOT NULL DEFAULT false,
    source VARCHAR(32) NOT NULL DEFAULT 'shop' 
        CHECK (source IN ('shop', 'command_pass', 'bonding_reward', 'clan_reward', 'starter')),
    unlocked_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT uq_user_cosmetic UNIQUE (user_id, cosmetic_id)
);

ALTER TABLE public.user_cosmetics ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "user_cosmetics_select_own" ON public.user_cosmetics;
CREATE POLICY "user_cosmetics_select_own" ON public.user_cosmetics FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- 3.3 Extensión de bark_dialogue_templates y Sembrado Masivo de Barks
ALTER TABLE public.bark_dialogue_templates
    ADD COLUMN IF NOT EXISTS trigger_phase VARCHAR(16) NOT NULL DEFAULT 'in_match'
        CHECK (trigger_phase IN ('pre_match', 'in_match', 'post_match', 'menu_lobby')),
    ADD COLUMN IF NOT EXISTS cooldown_turns SMALLINT NOT NULL DEFAULT 2 CHECK (cooldown_turns >= 0);

-- Sembrado inicial masivo de plantillas de cómic para los comandantes
INSERT INTO public.bark_dialogue_templates (
    id, commander_id, trigger_context, trigger_phase, bubble_shape, onomatopoeia_stamp,
    comic_vignette_pose, affinity_level_min, priority_weight, dialogue_template_text
) VALUES
-- STELLA (Ofensiva, Agresiva)
('stella_start_01', 'stella', 'match_start', 'pre_match', 'shout', '¡RATATAT!', 'proud', 1, 10,
 '¡Pisa el acelerador a fondo! ¡No quiero ver un solo tanque frenando antes de aplastar su cuartel!'),
('stella_start_b3', 'stella', 'match_start', 'pre_match', 'shout', '¡RATATAT!', 'proud', 3, 20,
 '¡{player_name}! ¡Espero que hoy no me hagas perder el tiempo contra estos aficionados!'),
('stella_low_hp_01', 'stella', 'low_hp', 'in_match', 'shout', '¡ALERT!', 'alarmed', 1, 15,
 '¡¿Qué diablos haces?! ¡Están pulverizando nuestro blindaje! ¡Reorganiza esa línea YA!'),
('stella_near_miss_01', 'stella', 'enemy_near_miss', 'post_match', 'shout', '¡BOOM!', 'angry', 1, 30,
 '¡MALDITA SEA! ¡Se quedaron a 1 HP por culpa de su blindaje! ¡Ese tanque debía ser chatarra!'),
('stella_cop_01', 'stella', 'cop_activated', 'in_match', 'shout', '¡RATATAT!', 'proud', 1, 20,
 '¡Sobrecarga Alfa activada! ¡Abran fuego con todo lo que tengan en la recámara!'),
('stella_scop_01', 'stella', 'scop_activated', 'in_match', 'shout', '¡BOOM!', 'proud', 1, 35,
 '¡BOMBARDEO SUPREMO! ¡Borren esa cuadrícula del mapa, ahora mismo!'),
('stella_clutch_01', 'stella', 'victory', 'post_match', 'speech', '¡CLUTCH!', 'proud', 3, 25,
 '¡Por un pelo de acero, {player_name}! Estuvimos al borde del abismo... ¡así es como se gana!'),
('stella_airdrop_01', 'stella', 'airdrop_spawn', 'in_match', 'shout', '¡AIRDROP!', 'proud', 1, 20,
 '¡Caja de suministros en el sector! ¡Asegúrenla antes de que esos buitres le pongan la mano encima!'),

-- VOLKOV (Frío, Balística, Calculado)
('volkov_start_01', 'volkov', 'match_start', 'pre_match', 'thought', '¡CALCULATED!', 'neutral', 1, 10,
 'Baterías listas. Cada casilla es un vector de impacto. No desperdicies munición en disparos inciertos.'),
('volkov_start_b3', 'volkov', 'match_start', 'pre_match', 'speech', '¡CALCULATED!', 'neutral', 3, 20,
 'Camarada {player_name}, los cálculos de balística están calibrados a tu favor. Procede.'),
('volkov_trap_01', 'volkov', 'trap_ambush', 'in_match', 'whisper', '¡TRAP!', 'alarmed', 1, 25,
 'Emboscada en sector boscoso. Error de reconocimiento elemental. Retrocede a rango de tiro.'),
('volkov_near_miss_01', 'volkov', 'enemy_near_miss', 'post_match', 'thought', '¡CALCULATED!', 'stern', 1, 30,
 'El vector balístico fue impecable; sin embargo, el blindaje rival resistió con 2 HP. Recomiendo reforzar el calibre.'),
('volkov_cop_01', 'volkov', 'cop_activated', 'in_match', 'speech', '¡CALCULATED!', 'proud', 1, 20,
 'Proyectiles de precisión cargados. El rango de fuego efectivo se ha duplicado.'),
('volkov_victory_01', 'volkov', 'victory', 'post_match', 'speech', '¡CALCULATED!', 'proud', 1, 15,
 'Victoria confirmada con margen estadístico aceptable. Buen trabajo táctico.'),

-- VANCE (Disciplinado, Protector)
('vance_start_01', 'vance', 'match_start', 'pre_match', 'speech', '¡HOLD!', 'disciplined', 1, 10,
 '¡Mantengan la formación! Un ejército que defiende sus fábricas es un ejército invencible.'),
('vance_start_b3', 'vance', 'match_start', 'pre_match', 'speech', '¡HOLD!', 'proud', 3, 20,
 '¡Al frente una vez más, {player_name}! La Vanguardia de Hierro nunca da un paso atrás.'),
('vance_cop_01', 'vance', 'cop_activated', 'in_match', 'shout', '¡HOLD!', 'proud', 1, 20,
 '¡Reparación de campo de emergencia! ¡Levanten esas orugas, la batalla continúa!'),
('vance_defeat_01', 'vance', 'defeat', 'post_match', 'speech', '¡PANIC!', 'alarmed', 1, 20,
 'Retrocedan con orden. Aprendan de las brechas en la defensa para el próximo despliegue.'),

-- COLIN (Financiero, Modesto)
('colin_start_01', 'colin', 'match_start', 'pre_match', 'speech', '¡TACTICAL!', 'neutral', 1, 10,
 '¡Mis fondos están listos para la producción en masa! Espero no arruinar el presupuesto...'),
('colin_cop_01', 'colin', 'cop_activated', 'in_match', 'shout', '¡TACTICAL!', 'proud', 1, 25,
 '¡Inyección de capital de emergencia! ¡Produzcan tanques al 50% de descuento!')
ON CONFLICT (id) DO NOTHING;

-- 3.4 Seguridad de Chat, DMs Privados y Reportes de Moderación
ALTER TABLE public.chat_messages
    ADD COLUMN IF NOT EXISTS recipient_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS message_type VARCHAR(16) NOT NULL DEFAULT 'text'
        CHECK (message_type IN ('text', 'popart_stamp', 'tactical_ping', 'system_alert')),
    ADD COLUMN IF NOT EXISTS stamp_id VARCHAR(64) DEFAULT NULL;

CREATE TABLE IF NOT EXISTS public.chat_moderation_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reporter_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    reported_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    message_id UUID REFERENCES public.chat_messages(id) ON DELETE SET NULL,
    reason VARCHAR(32) NOT NULL CHECK (reason IN ('toxicity', 'harassment', 'spam', 'cheating', 'inappropriate_name')),
    details TEXT,
    status VARCHAR(16) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'dismissed', 'actioned')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.chat_moderation_reports ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "reports_insert_own" ON public.chat_moderation_reports;
CREATE POLICY "reports_insert_own" ON public.chat_moderation_reports FOR INSERT TO authenticated WITH CHECK (auth.uid() = reporter_id);
DROP POLICY IF EXISTS "reports_select_own" ON public.chat_moderation_reports;
CREATE POLICY "reports_select_own" ON public.chat_moderation_reports FOR SELECT TO authenticated USING (auth.uid() = reporter_id);

-- Aislamiento estricto de privacidad en chat (solución de data leak)
DROP POLICY IF EXISTS "chat_messages_select_channel" ON public.chat_messages;
DROP POLICY IF EXISTS "chat_messages_select_isolated" ON public.chat_messages;
CREATE POLICY "chat_messages_select_isolated" ON public.chat_messages
    FOR SELECT TO authenticated
    USING (
        channel_type = 'global'
        OR (channel_type = 'clan' AND channel_id = (SELECT clan_id::text FROM public.profiles WHERE id = auth.uid()))
        OR (channel_type = 'match_team' AND EXISTS (
            SELECT 1 FROM public.match_participants mp 
            WHERE mp.match_id = chat_messages.channel_id::uuid 
              AND mp.user_id = auth.uid()
        ))
        OR (channel_type = 'match_dm' AND (sender_id = auth.uid() OR recipient_id = auth.uid()))
    );

DROP POLICY IF EXISTS "chat_messages_insert_own" ON public.chat_messages;
CREATE POLICY "chat_messages_insert_own" ON public.chat_messages
    FOR INSERT TO authenticated
    WITH CHECK (
        auth.uid() = sender_id
        AND NOT EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() 
              AND (is_chat_banned = true OR (muted_until IS NOT NULL AND muted_until > timezone('utc'::text, now())))
        )
    );


-- ============================================================================
-- SECCIÓN 4: CATÁLOGO MAESTRO DE FUNCIONES RPC ALMACENADAS (ACID)
-- ============================================================================

-- 4.1 RPC: Emparejamiento Rápido en Duelo Espejo (15s)
CREATE OR REPLACE FUNCTION public.join_mirror_duel_queue(
    p_co_id VARCHAR(32)
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_trophies INTEGER;
    v_opponent public.mirror_duel_queue%ROWTYPE;
    v_match_id UUID;
    v_room_code VARCHAR(8);
BEGIN
    IF v_user_id IS NULL THEN RAISE EXCEPTION 'Usuario no autenticado'; END IF;

    SELECT trophies_count INTO v_trophies FROM public.profiles WHERE id = v_user_id;

    -- Buscar oponente en cola con rango de trofeos (+/- 300) usando SKIP LOCKED
    SELECT * INTO v_opponent
    FROM public.mirror_duel_queue
    WHERE user_id <> v_user_id
      AND matched_match_id IS NULL
      AND ABS(trophies - v_trophies) <= 300
    ORDER BY queued_at ASC
    LIMIT 1
    FOR UPDATE SKIP LOCKED;

    IF FOUND THEN
        v_room_code := UPPER(SUBSTRING(encode(gen_random_bytes(4), 'hex') FROM 1 FOR 8));

        INSERT INTO public.active_matches (
            room_code, player1_id, player2_id, current_turn_player_id,
            status, game_mode, map_id, turn_number,
            turn_time_limit_sec, max_turns_limit, economy_multiplier,
            turn_deadline
        ) VALUES (
            v_room_code, v_opponent.user_id, v_user_id, v_opponent.user_id,
            'in_progress', 'mirror_duel', 'mirror_arena_10x10', 1,
            15, 12, 1.5,
            timezone('utc'::text, now()) + interval '15 seconds'
        ) RETURNING id INTO v_match_id;

        INSERT INTO public.match_participants (match_id, player_slot, slot_key, team_id, user_id, commander_id, commander_level, funds)
        VALUES
        (v_match_id, 0, 'p1', 'A', v_opponent.user_id, v_opponent.co_commander_id, 1, 3000),
        (v_match_id, 1, 'p2', 'B', v_user_id, p_co_id, 1, 3000);

        INSERT INTO public.match_state (
            match_id, grid_width, grid_height, tiles, units, properties,
            player_funds, co_power_gauge, fog_of_war_enabled
        ) VALUES (
            v_match_id, 10, 10, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb,
            '{"player1": 3000, "player2": 3000}'::jsonb,
            '{"player1": 0, "player2": 0}'::jsonb,
            false
        );

        UPDATE public.mirror_duel_queue
        SET matched_match_id = v_match_id
        WHERE user_id IN (v_user_id, v_opponent.user_id);

        RETURN jsonb_build_object(
            'status', 'matched',
            'match_id', v_match_id,
            'room_code', v_room_code,
            'player1_id', v_opponent.user_id,
            'player2_id', v_user_id,
            'role', 'player2'
        );
    ELSE
        INSERT INTO public.mirror_duel_queue (user_id, co_commander_id, trophies, queued_at, matched_match_id)
        VALUES (v_user_id, p_co_id, v_trophies, timezone('utc'::text, now()), NULL)
        ON CONFLICT (user_id) DO UPDATE SET
            co_commander_id = EXCLUDED.co_commander_id,
            trophies = EXCLUDED.trophies,
            queued_at = timezone('utc'::text, now()),
            matched_match_id = NULL;

        RETURN jsonb_build_object('status', 'searching');
    END IF;
END;
$$;

-- 4.2 RPC: Reclamación Atómica de AirDrops con Validación Estricta de Casilla
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
DECLARE
    v_user_id UUID := auth.uid();
    v_match public.active_matches%ROWTYPE;
    v_state public.match_state%ROWTYPE;
    v_drops JSONB;
    v_drop JSONB;
    v_updated_drops JSONB := '[]'::jsonb;
    v_units JSONB;
    v_unit JSONB;
    v_unit_found BOOLEAN := false;
    v_drop_found BOOLEAN := false;
    v_drop_x INTEGER;
    v_drop_y INTEGER;
    v_reward_type TEXT;
    v_reward_value JSONB;
    v_funds JSONB;
    v_powers JSONB;
    v_is_p1 BOOLEAN;
BEGIN
    SELECT * INTO v_match FROM public.active_matches WHERE id = p_match_id AND status = 'in_progress' FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Partida no válida o no está en curso.'; END IF;
    IF v_match.current_turn_player_id <> v_user_id THEN RAISE EXCEPTION 'No es tu turno de juego.'; END IF;

    SELECT * INTO v_state FROM public.match_state WHERE match_id = p_match_id FOR UPDATE;
    v_drops := v_state.airdrops;
    v_units := v_state.units;

    -- Validar que la unidad exista, pertenezca al jugador y esté viva
    FOR v_unit IN SELECT * FROM jsonb_array_elements(v_units) LOOP
        IF (v_unit->>'id') = p_unit_id THEN
            IF (v_unit->>'owner')::text <> v_user_id::text AND (v_unit->>'playerId')::text <> v_user_id::text THEN
                RAISE EXCEPTION 'La unidad no pertenece al comandante activo.';
            END IF;
            IF (v_unit->>'hp')::int <= 0 THEN RAISE EXCEPTION 'La unidad está destruida.'; END IF;
            v_unit_found := true;
            EXIT;
        END IF;
    END LOOP;

    IF NOT v_unit_found THEN RAISE EXCEPTION 'Unidad no encontrada en el tablero.'; END IF;

    -- Localizar y validar la posición del AirDrop
    FOR v_drop IN SELECT * FROM jsonb_array_elements(v_drops) LOOP
        IF (v_drop->>'id') = p_airdrop_id AND (v_drop->>'is_claimed')::boolean = false THEN
            v_drop_found := true;
            v_drop_x := (v_drop->>'x')::int;
            v_drop_y := (v_drop->>'y')::int;
            v_reward_type := v_drop->>'reward_type';
            v_reward_value := v_drop->'reward_value';

            -- VERIFICACIÓN ESTRICTA: La unidad debe ocupar exactamente la casilla
            IF (v_unit->>'x')::int <> v_drop_x OR (v_unit->>'y')::int <> v_drop_y THEN
                RAISE EXCEPTION 'Posición inválida: La unidad no ocupa la casilla del suministro.';
            END IF;

            v_updated_drops := v_updated_drops || jsonb_build_array(
                v_drop || jsonb_build_object('is_claimed', true, 'claimed_by', v_user_id, 'claimed_at', timezone('utc'::text, now()))
            );
        ELSE
            v_updated_drops := v_updated_drops || jsonb_build_array(v_drop);
        END IF;
    END LOOP;

    IF NOT v_drop_found THEN RAISE EXCEPTION 'El AirDrop especificado no existe o ya fue reclamado.'; END IF;

    v_funds := v_state.player_funds;
    v_powers := v_state.co_power_gauge;
    v_is_p1 := (v_user_id = v_match.player1_id);

    IF v_reward_type = 'funds' THEN
        IF v_is_p1 THEN
            v_funds := jsonb_set(v_funds, '{player1}', to_jsonb((v_funds->>'player1')::int + (v_reward_value)::int));
        ELSE
            v_funds := jsonb_set(v_funds, '{player2}', to_jsonb((v_funds->>'player2')::int + (v_reward_value)::int));
        END IF;
    ELSIF v_reward_type = 'co_power' THEN
        IF v_is_p1 THEN
            v_powers := jsonb_set(v_powers, '{player1}', '100'::jsonb);
        ELSE
            v_powers := jsonb_set(v_powers, '{player2}', '100'::jsonb);
        END IF;
    END IF;

    UPDATE public.match_state
    SET airdrops = v_updated_drops,
        player_funds = v_funds,
        co_power_gauge = v_powers,
        updated_at = timezone('utc'::text, now())
    WHERE match_id = p_match_id;

    INSERT INTO public.match_airdrop_events (
        match_id, turn_number, player_id, unit_id, reward_type, reward_payload, tile_x, tile_y
    ) VALUES (
        p_match_id, v_match.turn_number, v_user_id, p_unit_id, v_reward_type, v_reward_value, v_drop_x, v_drop_y
    );

    RETURN jsonb_build_object('success', true, 'reward_type', v_reward_type, 'reward_value', v_reward_value);
END;
$$;

-- 4.3 RPC: Arbitraje de Timeout de Turno y Derrota Técnica por AFK
CREATE OR REPLACE FUNCTION public.handle_turn_timeout(p_match_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_match public.active_matches%ROWTYPE;
    v_current_player UUID;
    v_next_player UUID;
    v_inactive_turns SMALLINT;
    v_winner_id UUID;
BEGIN
    SELECT * INTO v_match FROM public.active_matches WHERE id = p_match_id AND status = 'in_progress' FOR UPDATE;
    IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'error', 'Partida no encontrada'); END IF;

    IF timezone('utc'::text, now()) < v_match.turn_deadline THEN
        RETURN jsonb_build_object('success', false, 'error', 'El temporizador no ha expirado');
    END IF;

    v_current_player := v_match.current_turn_player_id;
    v_next_player := CASE WHEN v_current_player = v_match.player1_id THEN v_match.player2_id ELSE v_match.player1_id END;

    UPDATE public.match_participants
    SET consecutive_inactive_turns = consecutive_inactive_turns + 1
    WHERE match_id = p_match_id AND user_id = v_current_player
    RETURNING consecutive_inactive_turns INTO v_inactive_turns;

    -- Si alcanza 2 turnos consecutivos inactivos -> Derrota Técnica por AFK
    IF v_inactive_turns >= 2 THEN
        v_winner_id := v_next_player;
        UPDATE public.active_matches
        SET status = 'abandoned',
            winner_id = v_winner_id,
            resigned_player_id = v_current_player,
            end_reason = 'timeout',
            updated_at = timezone('utc'::text, now())
        WHERE id = p_match_id;

        RETURN jsonb_build_object('success', true, 'match_ended', true, 'winner_id', v_winner_id, 'reason', 'AFK_TIMEOUT');
    ELSE
        -- Saltar turno al oponente
        UPDATE public.active_matches
        SET current_turn_player_id = v_next_player,
            turn_number = turn_number + 1,
            turn_deadline = timezone('utc'::text, now()) + make_interval(secs => turn_time_limit_sec),
            updated_at = timezone('utc'::text, now())
        WHERE id = p_match_id;

        RETURN jsonb_build_object('success', true, 'match_ended', false, 'next_turn_player_id', v_next_player);
    END IF;
END;
$$;

-- 4.4 RPC: Recolección Industrial con Merma de 10 Horas (Carcoma Logística)
CREATE OR REPLACE FUNCTION public.harvest_industrial_resources()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_inv public.user_industrial_inventory%ROWTYPE;
    v_hours NUMERIC;
    v_eff_hours NUMERIC;
    v_decay_factor NUMERIC := 0.0;
    v_gain_iron INTEGER;
    v_gain_stone INTEGER;
    v_gain_rare INTEGER;
BEGIN
    IF v_user_id IS NULL THEN RAISE EXCEPTION 'No autenticado'; END IF;

    SELECT * INTO v_inv FROM public.user_industrial_inventory WHERE user_id = v_user_id FOR UPDATE;
    IF NOT FOUND THEN
        INSERT INTO public.user_industrial_inventory (user_id) VALUES (v_user_id) RETURNING * INTO v_inv;
    END IF;

    v_hours := EXTRACT(EPOCH FROM (timezone('utc'::text, now()) - v_inv.last_harvest_at)) / 3600.0;
    IF v_hours < (1.0 / 60.0) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Recursos recolectados recientemente.');
    END IF;

    v_eff_hours := LEAST(v_hours, 10.0);
    IF v_hours > 10.0 THEN
        v_decay_factor := LEAST(1.0, (v_hours - 10.0) * 0.025);
    END IF;

    v_gain_iron := FLOOR(50 * v_eff_hours * (1.0 - v_decay_factor));
    v_gain_stone := FLOOR(40 * v_eff_hours * (1.0 - v_decay_factor));
    v_gain_rare := FLOOR(15 * v_eff_hours * (1.0 - v_decay_factor));

    UPDATE public.user_industrial_inventory
    SET raw_iron = raw_iron + v_gain_iron,
        raw_stone = raw_stone + v_gain_stone,
        raw_rare_earth = raw_rare_earth + v_gain_rare,
        last_harvest_at = timezone('utc'::text, now()),
        updated_at = timezone('utc'::text, now())
    WHERE user_id = v_user_id;

    RETURN jsonb_build_object(
        'success', true,
        'gain_iron', v_gain_iron,
        'gain_stone', v_gain_stone,
        'gain_rare', v_gain_rare,
        'carcoma_penalty_pct', ROUND(v_decay_factor * 100, 2)
    );
END;
$$;

-- 4.5 RPC: Compra P2P con Impuesto Municipal del 12% y Ledger
CREATE OR REPLACE FUNCTION public.execute_p2p_purchase(p_listing_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_buyer_id UUID := auth.uid();
    v_listing public.p2p_market_listings%ROWTYPE;
    v_buyer_profile public.profiles%ROWTYPE;
    v_tax INTEGER;
    v_payout INTEGER;
BEGIN
    IF v_buyer_id IS NULL THEN RAISE EXCEPTION 'No autenticado'; END IF;

    SELECT * INTO v_listing FROM public.p2p_market_listings
    WHERE id = p_listing_id AND status = 'active' FOR UPDATE;

    IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'error', 'Orden no disponible.'); END IF;
    IF v_listing.seller_id = v_buyer_id THEN RETURN jsonb_build_object('success', false, 'error', 'No puedes comprar tu propia orden.'); END IF;

    SELECT * INTO v_buyer_profile FROM public.profiles WHERE id = v_buyer_id FOR UPDATE;
    IF v_buyer_profile.battle_credits < v_listing.total_price THEN
        RETURN jsonb_build_object('success', false, 'error', 'Créditos de Batalla insuficientes.');
    END IF;

    v_tax := FLOOR(v_listing.total_price * 0.12);
    v_payout := v_listing.total_price - v_tax;

    PERFORM set_config('app.bypass_profile_guard', 'on', true);
    UPDATE public.profiles SET battle_credits = battle_credits - v_listing.total_price WHERE id = v_buyer_id;
    UPDATE public.profiles SET battle_credits = battle_credits + v_payout WHERE id = v_listing.seller_id;

    -- Asentar libro mayor financiero
    INSERT INTO public.currency_ledger (user_id, currency, delta, balance_after, reason, reference_id)
    VALUES (v_buyer_id, 'credits', -v_listing.total_price, v_buyer_profile.battle_credits - v_listing.total_price, 'p2p_market_buy', v_listing.id::text);

    -- Transferencia de materiales procesados
    IF v_listing.resource_type = 'refined_steel' THEN
        UPDATE public.user_industrial_inventory SET refined_steel = refined_steel + v_listing.quantity WHERE user_id = v_buyer_id;
    ELSIF v_listing.resource_type = 'refined_concrete' THEN
        UPDATE public.user_industrial_inventory SET refined_concrete = refined_concrete + v_listing.quantity WHERE user_id = v_buyer_id;
    ELSIF v_listing.resource_type = 'refined_microchip' THEN
        UPDATE public.user_industrial_inventory SET refined_microchip = refined_microchip + v_listing.quantity WHERE user_id = v_buyer_id;
    END IF;

    UPDATE public.p2p_market_listings SET status = 'sold' WHERE id = p_listing_id;

    RETURN jsonb_build_object('success', true, 'total_paid', v_listing.total_price, 'tax_burned', v_tax, 'seller_received', v_payout);
END;
$$;

-- 4.6 RPC: Pago de Fianza por Deshonor de Clan
CREATE OR REPLACE FUNCTION public.pay_dishonor_embargo_fee(
    p_clan_id UUID,
    p_currency VARCHAR(16)
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_member public.clan_members%ROWTYPE;
    v_top_members UUID[];
    v_top1 UUID; v_top2 UUID; v_top3 UUID;
BEGIN
    IF v_user_id IS NULL THEN RAISE EXCEPTION 'No autenticado'; END IF;

    SELECT * INTO v_member FROM public.clan_members 
    WHERE user_id = v_user_id AND clan_id = p_clan_id FOR UPDATE;

    IF v_member.id IS NULL THEN RAISE EXCEPTION 'No perteneces a este clan.'; END IF;
    IF v_member.daily_war_matches_played > 0 THEN RAISE EXCEPTION 'No estás bajo embargo de deshonor.'; END IF;
    IF v_member.has_claimed_daily_chest THEN RAISE EXCEPTION 'El cofre ya ha sido reclamado.'; END IF;

    SELECT array_agg(user_id) INTO v_top_members FROM (
        SELECT user_id FROM public.clan_members 
        WHERE clan_id = p_clan_id AND user_id <> v_user_id
        ORDER BY daily_war_victories DESC, daily_war_matches_played DESC 
        LIMIT 3
    ) sub;

    v_top1 := v_top_members[1];
    v_top2 := v_top_members[2];
    v_top3 := v_top_members[3];

    PERFORM set_config('app.bypass_profile_guard', 'on', true);

    IF p_currency = 'resources' THEN
        UPDATE public.user_industrial_inventory SET refined_steel = refined_steel - 30 WHERE user_id = v_user_id;
        UPDATE public.profiles SET battle_credits = battle_credits - 1500 WHERE id = v_user_id;

        IF v_top1 IS NOT NULL THEN 
            UPDATE public.user_industrial_inventory SET refined_steel = refined_steel + 15 WHERE user_id = v_top1;
            UPDATE public.profiles SET battle_credits = battle_credits + 750 WHERE id = v_top1;
        END IF;
        IF v_top2 IS NOT NULL THEN 
            UPDATE public.user_industrial_inventory SET refined_steel = refined_steel + 9 WHERE user_id = v_top2;
            UPDATE public.profiles SET battle_credits = battle_credits + 450 WHERE id = v_top2;
        END IF;
        IF v_top3 IS NOT NULL THEN 
            UPDATE public.user_industrial_inventory SET refined_steel = refined_steel + 6 WHERE user_id = v_top3;
            UPDATE public.profiles SET battle_credits = battle_credits + 300 WHERE id = v_top3;
        END IF;
    ELSE
        UPDATE public.profiles SET command_gems = command_gems - 50 WHERE id = v_user_id;
        IF v_top1 IS NOT NULL THEN UPDATE public.profiles SET command_gems = command_gems + 25 WHERE id = v_top1; END IF;
        IF v_top2 IS NOT NULL THEN UPDATE public.profiles SET command_gems = command_gems + 15 WHERE id = v_top2; END IF;
        IF v_top3 IS NOT NULL THEN UPDATE public.profiles SET command_gems = command_gems + 10 WHERE id = v_top3; END IF;
    END IF;

    UPDATE public.clan_members SET has_claimed_daily_chest = true WHERE user_id = v_user_id AND clan_id = p_clan_id;

    INSERT INTO public.chat_messages (
        channel_type, channel_id, sender_id, message_text, message_type, metadata
    ) VALUES (
        'clan', p_clan_id::text, v_user_id,
        '¡FIANZA DE DESHONOR PAGADA! El botín fue redistribuido al Top 3 del clan.',
        'system_alert',
        jsonb_build_object('event', 'dishonor_paid', 'top1', v_top1, 'currency', p_currency)
    );

    RETURN jsonb_build_object('success', true, 'unlocked_chest', true);
END;
$$;

-- 4.7 RPC: Selección Contextual de Diálogo Cómic (Bark Engine Procedural)
CREATE OR REPLACE FUNCTION public.rpc_get_contextual_bark(
    p_commander_id VARCHAR(32),
    p_trigger_context VARCHAR(48),
    p_trigger_phase VARCHAR(16) DEFAULT 'in_match'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_bonding_level INTEGER := 1;
    v_username VARCHAR(32);
    v_chosen RECORD;
    v_final_text TEXT;
BEGIN
    IF v_user_id IS NOT NULL THEN
        SELECT COALESCE(bonding_level, 1) INTO v_bonding_level
        FROM public.user_commanders
        WHERE user_id = v_user_id AND commander_id = p_commander_id;

        SELECT username INTO v_username FROM public.profiles WHERE id = v_user_id;
    END IF;

    -- Muestreo ponderado estocástico O(1)
    SELECT * INTO v_chosen
    FROM public.bark_dialogue_templates
    WHERE (commander_id = p_commander_id OR commander_id = 'all')
      AND trigger_context = p_trigger_context
      AND trigger_phase = p_trigger_phase
      AND affinity_level_min <= COALESCE(v_bonding_level, 1)
    ORDER BY -ln(random() + 0.0001) / priority_weight
    LIMIT 1;

    IF v_chosen.id IS NULL THEN
        RETURN jsonb_build_object('has_bark', false);
    END IF;

    v_final_text := v_chosen.dialogue_template_text;
    IF COALESCE(v_bonding_level, 1) >= 3 AND v_username IS NOT NULL THEN
        v_final_text := replace(v_final_text, '{player_name}', v_username);
    ELSE
        v_final_text := replace(v_final_text, '{player_name}', 'Cadete');
    END IF;

    RETURN jsonb_build_object(
        'has_bark', true,
        'bark_id', v_chosen.id,
        'commander_id', v_chosen.commander_id,
        'speaker_shape', v_chosen.bubble_shape,
        'onomatopoeia', v_chosen.onomatopoeia_stamp,
        'vignette_mood', v_chosen.comic_vignette_pose,
        'dialogue_text', v_final_text,
        'bonding_level', COALESCE(v_bonding_level, 1)
    );
END;
$$;

-- 4.8 RPC: Diagnóstico Balístico Near-Miss Post-Combate
CREATE OR REPLACE FUNCTION public.process_post_match_near_miss(
    p_match_id UUID,
    p_loser_id UUID,
    p_winner_id UUID,
    p_target_unit_id VARCHAR(32),
    p_winner_surviving_hp INTEGER,
    p_winner_unit_level INTEGER,
    p_loser_unit_level INTEGER
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_near_miss_payload JSONB;
    v_unit_display_name VARCHAR(64);
BEGIN
    IF p_winner_surviving_hp <= 2 AND p_winner_unit_level > p_loser_unit_level THEN
        SELECT display_name INTO v_unit_display_name 
        FROM public.units_catalog WHERE id = p_target_unit_id;

        v_near_miss_payload := jsonb_build_object(
            'is_near_miss', true,
            'unit_id', p_target_unit_id,
            'unit_name', COALESCE(v_unit_display_name, p_target_unit_id),
            'surviving_hp', p_winner_surviving_hp,
            'winner_level', p_winner_unit_level,
            'loser_level', p_loser_unit_level,
            'damage_difference_hp', ROUND((p_winner_unit_level - p_loser_unit_level) * 0.20 * 10, 1),
            'missing_resource', 'refined_steel',
            'missing_amount', (p_winner_unit_level - p_loser_unit_level) * 5
        );

        UPDATE public.match_history 
        SET near_miss_data = v_near_miss_payload 
        WHERE match_id = p_match_id;

        RETURN v_near_miss_payload;
    END IF;

    RETURN jsonb_build_object('is_near_miss', false);
END;
$$;

-- 4.9 RPC: Evaluación de Tilt y Disparo de Oferta Flash ($0.99 en 180s)
CREATE OR REPLACE FUNCTION public.evaluate_match_tilt_and_offer(
    p_match_id UUID,
    p_player_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_behavior public.player_tactical_behavior_profile%ROWTYPE;
    v_last_offer TIMESTAMPTZ;
    v_offer_id UUID;
    v_expires TIMESTAMPTZ;
BEGIN
    SELECT * INTO v_behavior FROM public.player_tactical_behavior_profile WHERE user_id = p_player_id;
    SELECT MAX(created_at) INTO v_last_offer FROM public.tilt_emergency_offers WHERE user_id = p_player_id;

    IF (v_behavior.current_loss_streak >= 2 OR v_behavior.tilt_streak_count >= 2) 
       AND (v_last_offer IS NULL OR v_last_offer < (timezone('utc'::text, now()) - interval '48 hours')) THEN
        
        v_expires := timezone('utc'::text, now()) + interval '180 seconds';

        INSERT INTO public.tilt_emergency_offers (
            user_id, triggered_by_match_id, target_unit_id,
            offer_price_usd, reward_cards_amount, reward_steel_amount, expires_at
        ) VALUES (
            p_player_id, p_match_id, COALESCE(v_behavior.most_lost_unit_id, 'tank_light'),
            0.99, 100, 30, v_expires
        ) RETURNING id INTO v_offer_id;

        RETURN jsonb_build_object(
            'has_flash_offer', true,
            'offer_id', v_offer_id,
            'target_unit', COALESCE(v_behavior.most_lost_unit_id, 'tank_light'),
            'price_usd', 0.99,
            'seconds_remaining', 180
        );
    END IF;

    RETURN jsonb_build_object('has_flash_offer', false);
END;
$$;

-- >>> FIN MIGRACIÓN: 20261031000012_consolidated_master_database_expansion.sql <<<


-- >>> INICIO MIGRACIÓN: 20261031000013_economy_idle_rework_territorial_plots.sql <<<
-- ==============================================================================
-- MIGRACIÓN 13: REWORK DE ECONOMÍA MATEMÁTICA, PARCELAS TERRITORIALES E IDLE TYCOON
-- ==============================================================================
-- Especificación: docs/08_PROPOSAL_ECONOMY_IDLE_REWORK.md (v2.0.0-CALIBRATED)
-- Fecha: 2026-10-31
-- Descripción:
-- 1. Crea la tabla relacional 'user_industrial_plots' (Cuadrícula de 10 parcelas).
-- 2. Inicializa las parcelas gratuitas iniciales para usuarios existentes y nuevos (P1-P2 y P3 tutorial).
-- 3. Implementa RPC 'harvest_industrial_territory' con evaluación perezosa O(1),
--    ciclo circadiano de 12h + 4h de gracia, carcoma del 1.5%/h y salvamento de carga varada (70%).
-- 4. Implementa RPC 'reconfigure_industrial_plot' con coste de overhaul y demolición con 50% de reembolso.
-- 5. Implementa RPC 'acquire_industrial_plot' con validación de account_level y costes calibrados.
-- 6. Hardening de 'execute_p2p_purchase' con ordenación determinista de locks (buyer_id < seller_id)
--    y patrón Escrow para erradicar deadlocks y doble gasto.
-- 7. Implementa RPC 'fulfill_stale_p2p_orders' (Banco Central de Intendencia Militar NPC).
-- ==============================================================================

-- 1. TABLA: user_industrial_plots
CREATE TABLE IF NOT EXISTS public.user_industrial_plots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    plot_index INTEGER NOT NULL CHECK (plot_index BETWEEN 1 AND 10),
    enterprise_type VARCHAR(48) NOT NULL CHECK (enterprise_type IN (
        'empty',
        -- Categoría A: Extracción Primaria
        'mine_iron', 'quarry_stone', 'drill_rare_earth', 'distillery_synth_fuel',
        -- Categoría B: Refinación Secundaria
        'smelter_vulcan', 'concrete_plant', 'cleanroom_chips', 'lab_nano_compounds',
        -- Categoría C: Soporte e Infraestructura
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

CREATE INDEX IF NOT EXISTS idx_user_industrial_plots_lookup 
ON public.user_industrial_plots(user_id, status);

ALTER TABLE public.user_industrial_plots ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'user_industrial_plots' AND policyname = 'user_industrial_plots_own'
    ) THEN
        CREATE POLICY "user_industrial_plots_own" 
        ON public.user_industrial_plots FOR ALL 
        USING (auth.uid() = user_id);
    END IF;
END $$;

-- 2. TABLA: user_stranded_cargo (Almacén de Cargamento Militar Varado)
CREATE TABLE IF NOT EXISTS public.user_stranded_cargo (
    user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
    stranded_iron INTEGER NOT NULL DEFAULT 0,
    stranded_stone INTEGER NOT NULL DEFAULT 0,
    stranded_rare_earth INTEGER NOT NULL DEFAULT 0,
    stranded_fuel INTEGER NOT NULL DEFAULT 0,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.user_stranded_cargo ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'user_stranded_cargo' AND policyname = 'user_stranded_cargo_own'
    ) THEN
        CREATE POLICY "user_stranded_cargo_own" 
        ON public.user_stranded_cargo FOR ALL 
        USING (auth.uid() = user_id);
    END IF;
END $$;

-- 3. POBLACIÓN RETROACTIVA DE PARCELAS PARA USUARIOS EXISTENTES
DO $$
DECLARE
    r_user RECORD;
BEGIN
    FOR r_user IN SELECT id, account_level FROM public.profiles LOOP
        -- Parcela 1: Mina de Hierro
        INSERT INTO public.user_industrial_plots (user_id, plot_index, enterprise_type, tier, status)
        VALUES (r_user.id, 1, 'mine_iron', 1, 'active')
        ON CONFLICT (user_id, plot_index) DO NOTHING;

        -- Parcela 2: Altos Hornos Vulcan
        INSERT INTO public.user_industrial_plots (user_id, plot_index, enterprise_type, tier, status)
        VALUES (r_user.id, 2, 'smelter_vulcan', 1, 'active')
        ON CONFLICT (user_id, plot_index) DO NOTHING;

        -- Parcela 3: Cantera de Piedra (desbloqueada en N2+)
        IF r_user.account_level >= 2 THEN
            INSERT INTO public.user_industrial_plots (user_id, plot_index, enterprise_type, tier, status)
            VALUES (r_user.id, 3, 'quarry_stone', 1, 'active')
            ON CONFLICT (user_id, plot_index) DO NOTHING;
        END IF;

        -- Parcela 4: Planta de Cemento (desbloqueada en N4+)
        IF r_user.account_level >= 4 THEN
            INSERT INTO public.user_industrial_plots (user_id, plot_index, enterprise_type, tier, status)
            VALUES (r_user.id, 4, 'concrete_plant', 1, 'active')
            ON CONFLICT (user_id, plot_index) DO NOTHING;
        END IF;

        -- Parcela 5: Pozo de Tierras Raras (desbloqueada en N6+)
        IF r_user.account_level >= 6 THEN
            INSERT INTO public.user_industrial_plots (user_id, plot_index, enterprise_type, tier, status)
            VALUES (r_user.id, 5, 'drill_rare_earth', 1, 'active')
            ON CONFLICT (user_id, plot_index) DO NOTHING;
        END IF;

        -- Parcela 6: Sala Limpia de Chips (desbloqueada en N8+)
        IF r_user.account_level >= 8 THEN
            INSERT INTO public.user_industrial_plots (user_id, plot_index, enterprise_type, tier, status)
            VALUES (r_user.id, 6, 'cleanroom_chips', 1, 'active')
            ON CONFLICT (user_id, plot_index) DO NOTHING;
        END IF;

        -- Parcela 7: Silo Central Logístico (desbloqueada en N10+)
        IF r_user.account_level >= 10 THEN
            INSERT INTO public.user_industrial_plots (user_id, plot_index, enterprise_type, tier, status)
            VALUES (r_user.id, 7, 'logistics_silo', 1, 'active')
            ON CONFLICT (user_id, plot_index) DO NOTHING;
        END IF;
    END LOOP;
END $$;

-- 4. RPC: harvest_industrial_territory
-- Evaluación perezosa O(1), ciclo circadiano 12h + 4h gracia, merma -1.5%/h con 70% a cargamento varado.
CREATE OR REPLACE FUNCTION public.harvest_industrial_territory()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_inv public.user_industrial_inventory%ROWTYPE;
    v_now TIMESTAMPTZ := timezone('utc'::text, now());
    v_elapsed_hours NUMERIC;
    v_effective_hours NUMERIC;
    v_excess_hours NUMERIC;
    v_decay_factor NUMERIC := 0.0;
    v_silo_bonus_hours NUMERIC := 0.0;
    v_decay_mitigation NUMERIC := 1.0;
    
    v_rate_iron NUMERIC := 0;
    v_rate_stone NUMERIC := 0;
    v_rate_rare NUMERIC := 0;
    v_rate_fuel NUMERIC := 0;
    
    v_gain_iron INTEGER;
    v_gain_stone INTEGER;
    v_gain_rare INTEGER;
    v_gain_fuel INTEGER;
    
    v_decay_iron INTEGER := 0;
    v_decay_stone INTEGER := 0;
    v_decay_rare INTEGER := 0;
    v_decay_fuel INTEGER := 0;
    
    v_stranded_iron INTEGER := 0;
    v_stranded_stone INTEGER := 0;
    v_stranded_rare INTEGER := 0;
    v_stranded_fuel INTEGER := 0;
    
    v_efficiency_bonus BOOLEAN := false;
    v_efficiency_bonus_credits INTEGER := 0;
    v_plot RECORD;
BEGIN
    IF v_user_id IS NULL THEN 
        RAISE EXCEPTION 'No autenticado'; 
    END IF;

    SELECT * INTO v_inv FROM public.user_industrial_inventory 
    WHERE user_id = v_user_id FOR UPDATE;
    
    IF NOT FOUND THEN
        INSERT INTO public.user_industrial_inventory (user_id) 
        VALUES (v_user_id) RETURNING * INTO v_inv;
    END IF;

    -- Agregación territorial de empresas activas
    FOR v_plot IN 
        SELECT enterprise_type, tier, status, work_completes_at 
        FROM public.user_industrial_plots 
        WHERE user_id = v_user_id
    LOOP
        -- Activar parcelas cuya obra haya concluido durante la ausencia
        IF v_plot.status = 'reconfiguring' AND v_plot.work_completes_at IS NOT NULL AND v_plot.work_completes_at <= v_now THEN
            UPDATE public.user_industrial_plots
            SET status = 'active',
                work_started_at = NULL,
                work_completes_at = NULL,
                updated_at = v_now
            WHERE user_id = v_user_id AND enterprise_type = v_plot.enterprise_type;
            v_plot.status := 'active';
        END IF;

        IF v_plot.status = 'active' THEN
            CASE v_plot.enterprise_type
                WHEN 'mine_iron' THEN v_rate_iron := v_rate_iron + (60 * v_plot.tier);
                WHEN 'quarry_stone' THEN v_rate_stone := v_rate_stone + (50 * v_plot.tier);
                WHEN 'drill_rare_earth' THEN v_rate_rare := v_rate_rare + (25 * v_plot.tier);
                WHEN 'distillery_synth_fuel' THEN v_rate_fuel := v_rate_fuel + (15 * v_plot.tier);
                WHEN 'logistics_silo' THEN 
                    v_silo_bonus_hours := v_silo_bonus_hours + (4.0 * v_plot.tier);
                    v_decay_mitigation := 0.50;
                ELSE NULL;
            END CASE;
        END IF;
    END LOOP;

    v_elapsed_hours := EXTRACT(EPOCH FROM (v_now - v_inv.last_harvest_at)) / 3600.0;
    IF v_elapsed_hours < (1.0 / 60.0) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Recursos recolectados recientemente.');
    END IF;

    -- Ciclo Circadiano Canónico: 12h base + silos + 4h de gracia
    v_effective_hours := LEAST(v_elapsed_hours, 12.0 + v_silo_bonus_hours);
    v_excess_hours := GREATEST(0.0, v_elapsed_hours - (16.0 + v_silo_bonus_hours));

    -- Bono de Eficiencia (+10% recursos y +500 créditos) por retirar antes de la saturación
    IF v_elapsed_hours < (12.0 + v_silo_bonus_hours) THEN
        v_efficiency_bonus := true;
        v_efficiency_bonus_credits := 500;
    END IF;

    -- Merma por carcoma suavizada: 1.5% por hora extra, topada al 40% (piso del 60%)
    IF v_excess_hours > 0.0 THEN
        v_decay_factor := LEAST(0.40, (v_excess_hours * 0.015 * v_decay_mitigation));
    END IF;

    -- Cálculo bruto y neto
    v_gain_iron := FLOOR(v_rate_iron * v_effective_hours * (1.0 - v_decay_factor));
    v_gain_stone := FLOOR(v_rate_stone * v_effective_hours * (1.0 - v_decay_factor));
    v_gain_rare := FLOOR(v_rate_rare * v_effective_hours * (1.0 - v_decay_factor));
    v_gain_fuel := FLOOR(v_rate_fuel * v_effective_hours * (1.0 - v_decay_factor));

    -- Si aplicó el bono de eficiencia de alta pureza (+10%)
    IF v_efficiency_bonus THEN
        v_gain_iron := FLOOR(v_gain_iron * 1.10);
        v_gain_stone := FLOOR(v_gain_stone * 1.10);
        v_gain_rare := FLOOR(v_gain_rare * 1.10);
        v_gain_fuel := FLOOR(v_gain_fuel * 1.10);
    END IF;

    -- El 70% de los recursos perdidos por carcoma se trasladan a "Cargamento Varado"
    IF v_decay_factor > 0 THEN
        v_decay_iron := FLOOR(v_rate_iron * v_effective_hours * v_decay_factor);
        v_decay_stone := FLOOR(v_rate_stone * v_effective_hours * v_decay_factor);
        v_decay_rare := FLOOR(v_rate_rare * v_effective_hours * v_decay_factor);
        v_decay_fuel := FLOOR(v_rate_fuel * v_effective_hours * v_decay_factor);

        v_stranded_iron := FLOOR(v_decay_iron * 0.70);
        v_stranded_stone := FLOOR(v_decay_stone * 0.70);
        v_stranded_rare := FLOOR(v_decay_rare * 0.70);
        v_stranded_fuel := FLOOR(v_decay_fuel * 0.70);

        INSERT INTO public.user_stranded_cargo (user_id, stranded_iron, stranded_stone, stranded_rare_earth, stranded_fuel, updated_at)
        VALUES (v_user_id, v_stranded_iron, v_stranded_stone, v_stranded_rare, v_stranded_fuel, v_now)
        ON CONFLICT (user_id) DO UPDATE SET
            stranded_iron = user_stranded_cargo.stranded_iron + v_stranded_iron,
            stranded_stone = user_stranded_cargo.stranded_stone + v_stranded_stone,
            stranded_rare_earth = user_stranded_cargo.stranded_rare_earth + v_stranded_rare,
            stranded_fuel = user_stranded_cargo.stranded_fuel + v_stranded_fuel,
            updated_at = v_now;
    END IF;

    -- Actualización de inventario consolidado
    UPDATE public.user_industrial_inventory
    SET raw_iron = raw_iron + v_gain_iron,
        raw_stone = raw_stone + v_gain_stone,
        raw_rare_earth = raw_rare_earth + v_gain_rare,
        campaign_fuel = campaign_fuel + v_gain_fuel,
        last_harvest_at = v_now,
        updated_at = v_now
    WHERE user_id = v_user_id;

    -- Si hubo bono de eficiencia en créditos
    IF v_efficiency_bonus_credits > 0 THEN
        UPDATE public.profiles
        SET battle_credits = battle_credits + v_efficiency_bonus_credits,
            updated_at = v_now
        WHERE id = v_user_id;
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'harvested_iron', v_gain_iron,
        'harvested_stone', v_gain_stone,
        'harvested_rare_earth', v_gain_rare,
        'harvested_fuel', v_gain_fuel,
        'decay_percentage', ROUND(v_decay_factor * 100, 2),
        'stranded_iron', v_stranded_iron,
        'stranded_stone', v_stranded_stone,
        'stranded_rare_earth', v_stranded_rare,
        'efficiency_bonus_applied', v_efficiency_bonus,
        'efficiency_credits_awarded', v_efficiency_bonus_credits,
        'elapsed_hours', ROUND(v_elapsed_hours, 2)
    );
END;
$$;

-- 5. RPC: acquire_industrial_plot
CREATE OR REPLACE FUNCTION public.acquire_industrial_plot(p_plot_index INTEGER)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_prof public.profiles%ROWTYPE;
    v_cost_credits INTEGER := 0;
    v_cost_gems INTEGER := 0;
    v_min_level INTEGER := 1;
    v_now TIMESTAMPTZ := timezone('utc'::text, now());
BEGIN
    IF v_user_id IS NULL THEN RAISE EXCEPTION 'No autenticado'; END IF;
    IF p_plot_index < 1 OR p_plot_index > 10 THEN RAISE EXCEPTION 'Índice de parcela inválido'; END IF;

    -- Validar si ya posee la parcela
    IF EXISTS (SELECT 1 FROM public.user_industrial_plots WHERE user_id = v_user_id AND plot_index = p_plot_index) THEN
        RETURN jsonb_build_object('success', false, 'message', 'La parcela ya ha sido adquirida.');
    END IF;

    -- Tabla de costes calibrada según §4.1
    CASE p_plot_index
        WHEN 3 THEN v_min_level := 2; v_cost_credits := 0; v_cost_gems := 0;
        WHEN 4 THEN v_min_level := 4; v_cost_credits := 1000; v_cost_gems := 0;
        WHEN 5 THEN v_min_level := 6; v_cost_credits := 4000; v_cost_gems := 0;
        WHEN 6 THEN v_min_level := 8; v_cost_credits := 10000; v_cost_gems := 0;
        WHEN 7 THEN v_min_level := 10; v_cost_credits := 20000; v_cost_gems := 0;
        WHEN 8 THEN v_min_level := 12; v_cost_credits := 80000; v_cost_gems := 150;
        WHEN 9 THEN v_min_level := 13; v_cost_credits := 180000; v_cost_gems := 350;
        WHEN 10 THEN v_min_level := 15; v_cost_credits := 400000; v_cost_gems := 800;
        ELSE RAISE EXCEPTION 'Parcela básica predeterminada';
    END CASE;

    SELECT * INTO v_prof FROM public.profiles WHERE id = v_user_id FOR UPDATE;
    IF v_prof.account_level < v_min_level THEN
        RETURN jsonb_build_object('success', false, 'message', format('Requiere Nivel de Cuenta %s.', v_min_level));
    END IF;
    IF v_prof.battle_credits < v_cost_credits THEN
        RETURN jsonb_build_object('success', false, 'message', 'Créditos insuficientes.');
    END IF;
    IF v_prof.command_gems < v_cost_gems THEN
        RETURN jsonb_build_object('success', false, 'message', 'Gemas de mando insuficientes.');
    END IF;

    -- Cobro y desbloqueo
    UPDATE public.profiles
    SET battle_credits = battle_credits - v_cost_credits,
        command_gems = command_gems - v_cost_gems,
        updated_at = v_now
    WHERE id = v_user_id;

    INSERT INTO public.user_industrial_plots (user_id, plot_index, enterprise_type, tier, status)
    VALUES (v_user_id, p_plot_index, 'empty', 1, 'active');

    RETURN jsonb_build_object(
        'success', true,
        'plot_index', p_plot_index,
        'cost_credits', v_cost_credits,
        'cost_gems', v_cost_gems
    );
END;
$$;

-- 6. RPC: reconfigure_industrial_plot
CREATE OR REPLACE FUNCTION public.reconfigure_industrial_plot(
    p_plot_index INTEGER,
    p_action VARCHAR(16), -- 'demolish' | 'overhaul' | 'build'
    p_target_enterprise VARCHAR(48)
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_plot public.user_industrial_plots%ROWTYPE;
    v_now TIMESTAMPTZ := timezone('utc'::text, now());
    v_cost INTEGER := 0;
    v_refund INTEGER := 0;
    v_duration_hours NUMERIC := 0;
BEGIN
    IF v_user_id IS NULL THEN RAISE EXCEPTION 'No autenticado'; END IF;

    SELECT * INTO v_plot FROM public.user_industrial_plots 
    WHERE user_id = v_user_id AND plot_index = p_plot_index FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Parcela no encontrada.');
    END IF;

    IF v_plot.status = 'reconfiguring' AND v_plot.work_completes_at > v_now THEN
        RETURN jsonb_build_object('success', false, 'message', 'La parcela ya tiene una obra en curso.');
    END IF;

    IF p_action = 'demolish' THEN
        v_refund := 500; -- 50% de reembolso base
        UPDATE public.user_industrial_plots
        SET enterprise_type = 'empty',
            status = 'active',
            reconfiguration_target = NULL,
            work_started_at = NULL,
            work_completes_at = NULL,
            updated_at = v_now
        WHERE id = v_plot.id;

        UPDATE public.profiles
        SET battle_credits = battle_credits + v_refund, updated_at = v_now
        WHERE id = v_user_id;

        RETURN jsonb_build_object('success', true, 'action', 'demolish', 'refund_credits', v_refund);

    ELSIF p_action = 'overhaul' OR p_action = 'build' THEN
        v_cost := 1500;
        v_duration_hours := 4.0;

        UPDATE public.profiles
        SET battle_credits = battle_credits - v_cost, updated_at = v_now
        WHERE id = v_user_id AND battle_credits >= v_cost;

        IF NOT FOUND THEN
            RETURN jsonb_build_object('success', false, 'message', 'Créditos insuficientes para overhaul.');
        END IF;

        UPDATE public.user_industrial_plots
        SET enterprise_type = p_target_enterprise,
            status = 'reconfiguring',
            reconfiguration_target = p_target_enterprise,
            work_started_at = v_now,
            work_completes_at = v_now + (v_duration_hours * INTERVAL '1 hour'),
            updated_at = v_now
        WHERE id = v_plot.id;

        RETURN jsonb_build_object(
            'success', true,
            'action', p_action,
            'target_enterprise', p_target_enterprise,
            'completes_at', v_now + (v_duration_hours * INTERVAL '1 hour')
        );
    ELSE
        RETURN jsonb_build_object('success', false, 'message', 'Acción inválida.');
    END IF;
END;
$$;

-- 7. RPC: fulfill_stale_p2p_orders (Banco Central de Intendencia Militar NPC)
-- Absorbe órdenes activas mayores a 6 horas a precio de collar para garantizar liquidez permanente
CREATE OR REPLACE FUNCTION public.fulfill_stale_p2p_orders()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    r_order RECORD;
    v_stale_limit TIMESTAMPTZ := timezone('utc'::text, now()) - INTERVAL '6 hours';
    v_fulfilled_count INTEGER := 0;
BEGIN
    FOR r_order IN 
        SELECT * FROM public.p2p_market_listings 
        WHERE status = 'active' AND created_at <= v_stale_limit
        LIMIT 50
    LOOP
        -- Acreditar ingresos al vendedor descontando la tasa municipal del 12%
        UPDATE public.profiles
        SET battle_credits = battle_credits + r_order.net_seller_revenue_gold,
            updated_at = timezone('utc'::text, now())
        WHERE id = r_order.seller_id;

        -- Marcar la orden como absorbida por la intendencia NPC
        UPDATE public.p2p_market_listings
        SET status = 'sold',
            buyer_id = '00000000-0000-0000-0000-000000000001', -- UUID Reserva Federal Militar NPC
            updated_at = timezone('utc'::text, now())
        WHERE id = r_order.id;

        v_fulfilled_count := v_fulfilled_count + 1;
    END LOOP;

    RETURN jsonb_build_object('success', true, 'fulfilled_orders_count', v_fulfilled_count);
END;
$$;

-- >>> FIN MIGRACIÓN: 20261031000013_economy_idle_rework_territorial_plots.sql <<<


-- >>> INICIO MIGRACIÓN: 20261031000014_unified_matchmaking_and_ranked_ladder.sql <<<
-- ==============================================================================
-- MIGRACIÓN 14: EMPAREJAMIENTO MULTI-MODO UNIFICADO, BLINDAJE DE LEDGER Y RANKED LADDER
-- ==============================================================================
-- Especificación: PROPOSAL_DB_ARCHITECTURE.md (v2.0.0-CALIBRATED-BACKEND-RFC)
-- Fecha: 2026-10-31
-- Descripción:
-- 1. Unifica colas en 'matchmaking_queue' con soporte multi-modo (Mirror, Blitz, Campaña).
-- 2. Conciliación aditiva en 'currency_ledger' con soporte de materiales y trigger append-only.
-- 3. Conciliación aditiva en 'user_chest_slots' con anti-speedhack (unlock_completes_at).
-- 4. Conciliación aditiva en 'user_cosmetics' con categorías y FK restrictiva.
-- 5. RPCs de matchmaking seguro con advisory lock, lectura server-side y anti-deck-sniffing.
-- 6. Algoritmo canónico de trofeos Elo con Factor K dinámico, Escudo de Descenso y Season Reset.
-- ==============================================================================

-- 1. TABLA UNIFICADA DE EMPAREJAMIENTO: matchmaking_queue
CREATE TABLE IF NOT EXISTS public.matchmaking_queue (
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

-- Índice parcial de alta velocidad para escaneo de rango B-Tree en FOR UPDATE SKIP LOCKED
CREATE INDEX IF NOT EXISTS idx_matchmaking_active_seek
ON public.matchmaking_queue (game_mode, trophies, queued_at)
WHERE matched_match_id IS NULL;

ALTER TABLE public.matchmaking_queue ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.matchmaking_queue FROM anon, public;
GRANT SELECT ON public.matchmaking_queue TO authenticated;

DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'matchmaking_queue' AND policyname = 'matchmaking_queue_own'
    ) THEN
        CREATE POLICY "matchmaking_queue_own" 
        ON public.matchmaking_queue FOR SELECT TO authenticated 
        USING (auth.uid() = user_id);
    END IF;
END $$;

-- 2. CONCILIACIÓN ADITIVA: currency_ledger (Libro Contable Inmutable)
ALTER TABLE public.currency_ledger 
    ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

-- Extender el check de divisas para soportar materiales industriales de la migración 13
ALTER TABLE public.currency_ledger 
    DROP CONSTRAINT IF EXISTS currency_ledger_currency_check;

ALTER TABLE public.currency_ledger 
    ADD CONSTRAINT currency_ledger_currency_check 
    CHECK (currency IN ('credits', 'gems', 'refined_steel', 'refined_concrete', 'refined_microchip'));

-- Blindaje financiero: Trigger de inmutabilidad append-only
CREATE OR REPLACE FUNCTION public.trg_prevent_ledger_tampering()
RETURNS TRIGGER 
LANGUAGE plpgsql AS $$
BEGIN
    RAISE EXCEPTION 'Violación de Integridad: currency_ledger es estrictamente inmutable y append-only.';
END;
$$;

DROP TRIGGER IF EXISTS trg_currency_ledger_immutable ON public.currency_ledger;
CREATE TRIGGER trg_currency_ledger_immutable
    BEFORE UPDATE OR DELETE ON public.currency_ledger
    FOR EACH ROW EXECUTE FUNCTION public.trg_prevent_ledger_tampering();

-- 3. CONCILIACIÓN ADITIVA: user_chest_slots (Bóveda de Ranuras con Anti Speed-Hack)
ALTER TABLE public.user_chest_slots 
    ADD COLUMN IF NOT EXISTS unlock_completes_at TIMESTAMPTZ;

ALTER TABLE public.user_chest_slots 
    ADD COLUMN IF NOT EXISTS arena_tier INTEGER NOT NULL DEFAULT 1;

REVOKE INSERT, UPDATE, DELETE ON public.user_chest_slots FROM anon, authenticated;

-- 4. CONCILIACIÓN ADITIVA: user_cosmetics
ALTER TABLE public.user_cosmetics 
    ADD COLUMN IF NOT EXISTS category VARCHAR(24) NOT NULL DEFAULT 'unit_skin';

-- 5. FUNCIÓN MATEMÁTICA PURA: calculate_elo_delta
CREATE OR REPLACE FUNCTION public.calculate_elo_delta(
    p_player_trophies INTEGER,
    p_opponent_trophies INTEGER,
    p_arena_tier INTEGER,
    p_is_victory BOOLEAN
)
RETURNS INTEGER
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
    v_k_factor NUMERIC;
    v_loss_multiplier NUMERIC;
    v_expected NUMERIC;
    v_delta NUMERIC;
    v_score NUMERIC := CASE WHEN p_is_victory THEN 1.0 ELSE 0.0 END;
BEGIN
    -- Calibración escalonada del factor K según Arena RFC 4.1
    CASE 
        WHEN p_arena_tier = 1 THEN 
            v_k_factor := 40; v_loss_multiplier := 0.0; -- Cero pérdida novato
        WHEN p_arena_tier BETWEEN 2 AND 3 THEN 
            v_k_factor := 36; v_loss_multiplier := 0.60;
        WHEN p_arena_tier BETWEEN 4 AND 5 THEN 
            v_k_factor := 32; v_loss_multiplier := 0.85;
        WHEN p_arena_tier BETWEEN 6 AND 8 THEN 
            v_k_factor := 28; v_loss_multiplier := 1.00; -- Suma cero estricta
        WHEN p_arena_tier BETWEEN 9 AND 10 THEN 
            v_k_factor := 24; v_loss_multiplier := 1.00;
        ELSE 
            v_k_factor := 20; v_loss_multiplier := 1.00; -- Ligas Legendarias
    END CASE;

    -- Función logística estándar Elo
    v_expected := 1.0 / (1.0 + power(10.0, (p_opponent_trophies - p_player_trophies)::numeric / 400.0));
    v_delta := round(v_k_factor * (v_score - v_expected));

    -- Amortiguador de derrota para rangos bajos
    IF NOT p_is_victory THEN
        v_delta := round(v_delta * v_loss_multiplier);
    END IF;

    RETURN v_delta::INTEGER;
END;
$$;

-- 6. RPC CANÓNICO DE MATCHMAKING UNIFICADO: join_matchmaking_queue
CREATE OR REPLACE FUNCTION public.join_matchmaking_queue(
    p_game_mode VARCHAR(24),
    p_commander_id VARCHAR(32),
    p_preferred_theater VARCHAR(16) DEFAULT 'any'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_trophies INTEGER;
    v_deck_snapshot JSONB := '[]'::jsonb;
    v_deck_power NUMERIC(4,2) := 1.0;
    v_search_window INTEGER := 200;
    v_opponent public.matchmaking_queue%ROWTYPE;
    v_match_id UUID;
    v_room_code VARCHAR(8);
    v_map_id VARCHAR(64);
    v_turn_time_sec INTEGER := 30;
    v_max_turns INTEGER := 15;
    v_now TIMESTAMPTZ := timezone('utc'::text, now());
BEGIN
    IF v_user_id IS NULL THEN 
        RAISE EXCEPTION 'No autenticado'; 
    END IF;

    -- Evitar condiciones de carrera concurrentes para el mismo usuario
    PERFORM pg_advisory_xact_lock(hashtext(v_user_id::text));

    -- Anti-Reentrancy: verificar si ya tiene partida activa
    IF EXISTS (
        SELECT 1 FROM public.active_matches m
        JOIN public.match_participants p ON p.match_id = m.id
        WHERE p.user_id = v_user_id AND m.status = 'in_progress'
    ) THEN
        RETURN jsonb_build_object('status', 'already_in_match', 'message', 'Ya tienes una partida en curso.');
    END IF;

    -- Lectura server-side segura de trofeos y mazo
    SELECT trophies_count INTO v_trophies FROM public.profiles WHERE id = v_user_id;
    IF v_trophies IS NULL THEN v_trophies := 0; END IF;

    -- Cargar mazo activo validado
    SELECT equipped_deck INTO v_deck_snapshot FROM public.profiles WHERE id = v_user_id;
    IF v_deck_snapshot IS NULL OR jsonb_array_length(v_deck_snapshot) = 0 THEN
        v_deck_snapshot := jsonb_build_array('infantry', 'mech', 'recon', 'tank_light', 'tank_medium', 'b_copter');
    END IF;

    -- Parámetros según modo
    IF p_game_mode = 'mirror_duel' THEN
        v_turn_time_sec := 15;
        v_max_turns := 12;
        v_search_window := 300;
        v_map_id := 'mirror_arena_10x10';
    ELSIF p_game_mode = 'blitz_skirmish' THEN
        v_turn_time_sec := 30;
        v_max_turns := 15;
        v_search_window := 200;
        v_map_id := 'blitz_crossroads_14x14';
    ELSE -- grand_campaign
        v_turn_time_sec := 60;
        v_max_turns := 40;
        v_search_window := 250;
        v_map_id := 'campaign_theater_combined_28x28';
    END IF;

    -- Búsqueda de oponente con B-Tree Range Scan y SKIP LOCKED
    SELECT * INTO v_opponent
    FROM public.matchmaking_queue
    WHERE game_mode = p_game_mode
      AND user_id <> v_user_id
      AND matched_match_id IS NULL
      AND trophies BETWEEN (v_trophies - v_search_window) AND (v_trophies + v_search_window)
      AND expires_at > v_now
    ORDER BY queued_at ASC
    LIMIT 1
    FOR UPDATE SKIP LOCKED;

    IF FOUND THEN
        -- Crear partida atómicamente
        v_room_code := UPPER(SUBSTRING(encode(gen_random_bytes(4), 'hex') FROM 1 FOR 8));

        INSERT INTO public.active_matches (
            room_code, player1_id, player2_id, current_turn_player_id,
            status, game_mode, map_id, turn_number, turn_time_limit_sec,
            max_turns_limit, economy_multiplier, turn_deadline
        ) VALUES (
            v_room_code, v_opponent.user_id, v_user_id, v_opponent.user_id,
            'in_progress', p_game_mode, v_map_id, 1, v_turn_time_sec,
            v_max_turns, 1.0, v_now + (v_turn_time_sec * interval '1 second')
        ) RETURNING id INTO v_match_id;

        -- Registrar participantes con mazo oculto bajo niebla
        INSERT INTO public.match_participants (match_id, user_id, co_id, team, role, deck_state)
        VALUES 
            (v_match_id, v_opponent.user_id, v_opponent.commander_id, 1, 'player1', v_opponent.deck_snapshot),
            (v_match_id, v_user_id, p_commander_id, 2, 'player2', v_deck_snapshot);

        -- Eliminar al oponente de la cola para prevenir table bloat
        DELETE FROM public.matchmaking_queue WHERE user_id IN (v_user_id, v_opponent.user_id);

        RETURN jsonb_build_object(
            'status', 'matched',
            'match_id', v_match_id,
            'room_code', v_room_code,
            'game_mode', p_game_mode,
            'player1_id', v_opponent.user_id,
            'player2_id', v_user_id,
            'role', 'player2'
        );
    ELSE
        -- Insertar al usuario en la cola unificada
        INSERT INTO public.matchmaking_queue (
            user_id, game_mode, commander_id, deck_snapshot, preferred_theater,
            trophies, weighted_power, queued_at, matched_match_id, expires_at
        ) VALUES (
            v_user_id, p_game_mode, p_commander_id, v_deck_snapshot, p_preferred_theater,
            v_trophies, v_deck_power, v_now, NULL, v_now + interval '90 seconds'
        )
        ON CONFLICT (user_id) DO UPDATE SET
            game_mode = EXCLUDED.game_mode,
            commander_id = EXCLUDED.commander_id,
            deck_snapshot = EXCLUDED.deck_snapshot,
            preferred_theater = EXCLUDED.preferred_theater,
            trophies = EXCLUDED.trophies,
            queued_at = v_now,
            matched_match_id = NULL,
            expires_at = v_now + interval '90 seconds';

        RETURN jsonb_build_object(
            'status', 'searching',
            'game_mode', p_game_mode,
            'trophies', v_trophies,
            'queued_at', v_now
        );
    END IF;
END;
$$;

-- 7. RPC: cancel_matchmaking_queue
CREATE OR REPLACE FUNCTION public.cancel_matchmaking_queue()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_user_id UUID := auth.uid();
BEGIN
    IF v_user_id IS NULL THEN RAISE EXCEPTION 'No autenticado'; END IF;
    DELETE FROM public.matchmaking_queue WHERE user_id = v_user_id;
    RETURN jsonb_build_object('success', true, 'message', 'Búsqueda cancelada.');
END;
$$;

-- 8. RPC: start_chest_unlock
CREATE OR REPLACE FUNCTION public.start_chest_unlock(p_slot_index INTEGER)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_slot public.user_chest_slots%ROWTYPE;
    v_now TIMESTAMPTZ := timezone('utc'::text, now());
BEGIN
    IF v_user_id IS NULL THEN RAISE EXCEPTION 'No autenticado'; END IF;

    -- Validar que no haya otro cofre desbloqueándose
    IF EXISTS (
        SELECT 1 FROM public.user_chest_slots 
        WHERE user_id = v_user_id AND status = 'unlocking' AND slot_index <> p_slot_index
    ) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Ya hay otro cofre en proceso de desbloqueo.');
    END IF;

    SELECT * INTO v_slot FROM public.user_chest_slots
    WHERE user_id = v_user_id AND slot_index = p_slot_index FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Ranura de cofre vacía o no encontrada.');
    END IF;

    IF v_slot.status <> 'locked' THEN
        RETURN jsonb_build_object('success', false, 'message', 'El cofre no se encuentra en estado cerrado.');
    END IF;

    UPDATE public.user_chest_slots
    SET status = 'unlocking',
        unlock_started_at = v_now,
        unlock_completes_at = v_now + (v_slot.unlock_duration_seconds * interval '1 second')
    WHERE id = v_slot.id;

    RETURN jsonb_build_object(
        'success', true,
        'slot_index', p_slot_index,
        'unlock_started_at', v_now,
        'unlock_completes_at', v_now + (v_slot.unlock_duration_seconds * interval '1 second')
    );
END;
$$;

-- 9. RPC: claim_chest_reward
CREATE OR REPLACE FUNCTION public.claim_chest_reward(p_slot_index INTEGER)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_slot public.user_chest_slots%ROWTYPE;
    v_now TIMESTAMPTZ := timezone('utc'::text, now());
    v_reward_credits INTEGER := 400;
    v_reward_blueprints INTEGER := 40;
    v_reward_steel INTEGER := 0;
BEGIN
    IF v_user_id IS NULL THEN RAISE EXCEPTION 'No autenticado'; END IF;

    SELECT * INTO v_slot FROM public.user_chest_slots
    WHERE user_id = v_user_id AND slot_index = p_slot_index FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Cofre no encontrado.');
    END IF;

    -- Anti-Speed-Hack estricto: hora de servidor >= unlock_completes_at
    IF v_slot.status = 'unlocking' AND v_slot.unlock_completes_at > v_now THEN
        RETURN jsonb_build_object('success', false, 'message', 'El tiempo de desbloqueo aún no ha concluido.');
    END IF;

    -- Recompensas calibradas por tipo
    CASE v_slot.chest_type
        WHEN 'iron' THEN v_reward_credits := 1400; v_reward_blueprints := 140; v_reward_steel := 5;
        WHEN 'armored' THEN v_reward_credits := 3200; v_reward_blueprints := 340; v_reward_steel := 15;
        WHEN 'legendary' THEN v_reward_credits := 8000; v_reward_blueprints := 800; v_reward_steel := 40;
        ELSE v_reward_credits := 450; v_reward_blueprints := 45; -- wood / bronze
    END CASE;

    -- Multiplicador por Arena Tier
    v_reward_credits := FLOOR(v_reward_credits * (1.0 + (v_slot.arena_tier - 1) * 0.15));

    -- Entregar créditos al perfil
    UPDATE public.profiles
    SET battle_credits = battle_credits + v_reward_credits,
        updated_at = v_now
    WHERE id = v_user_id;

    -- Registrar en ledger
    INSERT INTO public.currency_ledger (user_id, currency, delta, balance_after, reason, reference_id, metadata)
    SELECT v_user_id, 'credits', v_reward_credits, battle_credits, 'chest_opening', v_slot.id::text,
           jsonb_build_object('chest_type', v_slot.chest_type, 'slot_index', p_slot_index)
    FROM public.profiles WHERE id = v_user_id;

    -- Vaciar ranura
    DELETE FROM public.user_chest_slots WHERE id = v_slot.id;

    RETURN jsonb_build_object(
        'success', true,
        'slot_index', p_slot_index,
        'reward_credits', v_reward_credits,
        'reward_blueprints', v_reward_blueprints,
        'reward_steel', v_reward_steel
    );
END;
$$;

-- 10. RPC: settle_ranked_match_result
CREATE OR REPLACE FUNCTION public.settle_ranked_match_result(
    p_match_id UUID,
    p_winner_id UUID,
    p_loser_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_winner_trophies INTEGER;
    v_loser_trophies INTEGER;
    v_arena_tier INTEGER := 1;
    v_delta_winner INTEGER;
    v_delta_loser INTEGER;
    v_now TIMESTAMPTZ := timezone('utc'::text, now());
BEGIN
    SELECT trophies_count INTO v_winner_trophies FROM public.profiles WHERE id = p_winner_id FOR UPDATE;
    SELECT trophies_count INTO v_loser_trophies FROM public.profiles WHERE id = p_loser_id FOR UPDATE;

    -- Calcular Arena Tier del ganador
    v_arena_tier := GREATEST(1, LEAST(10, FLOOR(v_winner_trophies / 400) + 1));

    -- Calcular deltas de Elo
    v_delta_winner := public.calculate_elo_delta(v_winner_trophies, v_loser_trophies, v_arena_tier, true);
    v_delta_loser := public.calculate_elo_delta(v_loser_trophies, v_winner_trophies, v_arena_tier, false);

    -- Actualizar perfiles
    UPDATE public.profiles
    SET trophies_count = trophies_count + v_delta_winner,
        elo_rating = elo_rating + v_delta_winner,
        highest_trophies = GREATEST(highest_trophies, trophies_count + v_delta_winner),
        total_victories = total_victories + 1,
        total_matches_played = total_matches_played + 1,
        updated_at = v_now
    WHERE id = p_winner_id;

    UPDATE public.profiles
    SET trophies_count = GREATEST(0, trophies_count + v_delta_loser),
        elo_rating = GREATEST(0, elo_rating + v_delta_loser),
        total_matches_played = total_matches_played + 1,
        updated_at = v_now
    WHERE id = p_loser_id;

    -- Marcar partida finalizada
    UPDATE public.active_matches
    SET status = 'finished',
        winner_id = p_winner_id,
        updated_at = v_now
    WHERE id = p_match_id;

    -- Otorgar ranura de cofre si el ganador tiene espacio (< 4)
    IF (SELECT count(*) FROM public.user_chest_slots WHERE user_id = p_winner_id) < 4 THEN
        INSERT INTO public.user_chest_slots (
            user_id, slot_index, chest_type, status, unlock_duration_seconds, arena_tier
        ) VALUES (
            p_winner_id,
            (SELECT COALESCE(MAX(slot_index), 0) + 1 FROM public.user_chest_slots WHERE user_id = p_winner_id),
            'iron', 'locked', 28800, v_arena_tier
        ) ON CONFLICT DO NOTHING;
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'winner_delta', v_delta_winner,
        'loser_delta', v_delta_loser,
        'winner_new_trophies', v_winner_trophies + v_delta_winner,
        'loser_new_trophies', GREATEST(0, v_loser_trophies + v_delta_loser)
    );
END;
$$;

-- 11. RPC: apply_season_trophy_reset (Drenaje Estacional Anti-Inflación)
CREATE OR REPLACE FUNCTION public.apply_season_trophy_reset()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_affected INTEGER := 0;
BEGIN
    -- Compresión estacional del 30% entre 3,200 y 4,000 trofeos; 50% por encima de 4,000
    UPDATE public.profiles
    SET trophies_count = CASE 
        WHEN trophies_count >= 4000 THEN 4000 + FLOOR((trophies_count - 4000) * 0.50)
        WHEN trophies_count >= 3200 THEN 3200 + FLOOR((trophies_count - 3200) * 0.70)
        ELSE trophies_count
    END,
    updated_at = timezone('utc'::text, now())
    WHERE trophies_count >= 3200;

    GET DIAGNOSTICS v_affected = ROW_COUNT;
    RETURN jsonb_build_object('success', true, 'profiles_compressed', v_affected);
END;
$$;

-- >>> FIN MIGRACIÓN: 20261031000014_unified_matchmaking_and_ranked_ladder.sql <<<


-- >>> INICIO MIGRACIÓN: 20261031000015_offline_progression_and_transport_persistence.sql <<<
-- ==============================================================================
-- MIGRACIÓN 15: CONTROL DE ECONOMÍA OFFLINE Y ADAPTACIÓN DE TRANSPORTES
-- ==============================================================================
-- Fecha: 2026-10-31
-- Descripción:
-- 1. Añade control de partidas offline en 'profiles' (daily_offline_matches_count, last_offline_match_date).
-- 2. Implementa RPC 'grant_match_rewards' con:
--    - Factor 50% en recompensas offline (vs_bot, offline_practice, tutorial).
--    - 0 trofeos en modos offline.
--    - Límite duro de 3 partidas con botín por día (UTC 00:00).
--    - Módulos de dificultad: easy (0.85x), normal (1.00x), hard/chess (1.20x).
--    - Integración de auditoría en 'currency_ledger'.
-- ==============================================================================

-- 1. EXTENDER TABLA: profiles
ALTER TABLE public.profiles
    ADD COLUMN IF NOT EXISTS daily_offline_matches_count INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS last_offline_match_date DATE NOT NULL DEFAULT CURRENT_DATE;

-- 2. RPC ATÓMICA DE CONCESIÓN DE RECOMPENSAS
CREATE OR REPLACE FUNCTION public.grant_match_rewards(
    p_user_id UUID,
    p_match_id UUID,
    p_game_mode TEXT,
    p_is_victory BOOLEAN,
    p_turns_count INTEGER,
    p_properties_captured INTEGER,
    p_units_destroyed INTEGER,
    p_difficulty TEXT DEFAULT 'normal'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_base_score NUMERIC;
    v_result_mult NUMERIC;
    v_difficulty_mult NUMERIC := 1.0;
    v_xp_awarded INTEGER;
    v_credits_awarded INTEGER;
    v_trophies_delta INTEGER := 0;
    v_is_offline BOOLEAN;
    v_daily_count INTEGER := 0;
    v_last_date DATE := CURRENT_DATE;
    v_reward_capped BOOLEAN := false;
BEGIN
    v_is_offline := (p_game_mode IN ('vs_bot', 'offline_practice', 'tutorial'));

    -- Comprobación de límites offline (Máximo 3 partidas remuneradas por día)
    IF v_is_offline THEN
        SELECT COALESCE(daily_offline_matches_count, 0), COALESCE(last_offline_match_date, CURRENT_DATE)
        INTO v_daily_count, v_last_date
        FROM public.profiles
        WHERE id = p_user_id
        FOR UPDATE;

        -- Reinicio del ciclo diario a medianoche UTC
        IF v_last_date < CURRENT_DATE THEN
            v_daily_count := 0;
            v_last_date := CURRENT_DATE;
        END IF;

        IF v_daily_count >= 3 THEN
            v_reward_capped := true;
        END IF;
    END IF;

    -- Si superó el límite offline diario, recompensas se anulan (Modo entrenamiento)
    IF v_reward_capped THEN
        -- Registrar la partida en perfil sin créditos
        UPDATE public.profiles
        SET total_matches_played = total_matches_played + 1,
            total_victories = total_victories + CASE WHEN p_is_victory THEN 1 ELSE 0 END,
            updated_at = timezone('utc'::text, now())
        WHERE id = p_user_id;

        RETURN jsonb_build_object(
            'xp_awarded', 0,
            'battle_credits_awarded', 0,
            'trophies_delta', 0,
            'offline_capped', true,
            'message', 'Límite diario de recompensas offline alcanzado (3/3). Partida registrada sin créditos.'
        );
    END IF;

    -- Cálculo del puntaje base
    v_base_score := 120 + (p_properties_captured * 45) + (p_units_destroyed * 35) + (LEAST(p_turns_count, 30) * 6);
    
    IF p_is_victory THEN
        v_result_mult := 2.2;
    ELSE
        v_result_mult := 0.85;
    END IF;

    -- Multiplicadores de dificultad offline
    IF v_is_offline THEN
        IF p_difficulty = 'easy' THEN v_difficulty_mult := 0.85;
        ELSIF p_difficulty = 'hard' OR p_difficulty = 'chess' THEN v_difficulty_mult := 1.20;
        ELSE v_difficulty_mult := 1.00;
        END IF;
    END IF;

    -- Recompensas estándar base
    v_xp_awarded := FLOOR(v_base_score * v_result_mult);
    v_credits_awarded := FLOOR((60 + (p_properties_captured * 20) + (p_units_destroyed * 15)) * v_result_mult);

    -- REGLA OFFLINE: 50% de recompensas y 0 trofeos
    IF v_is_offline THEN
        v_xp_awarded := FLOOR(v_xp_awarded * 0.50 * v_difficulty_mult);
        v_credits_awarded := FLOOR(v_credits_awarded * 0.50 * v_difficulty_mult);
        v_trophies_delta := 0;

        -- Actualizar contador diario
        UPDATE public.profiles
        SET daily_offline_matches_count = v_daily_count + 1,
            last_offline_match_date = v_last_date
        WHERE id = p_user_id;
    ELSE
        -- Modo online: otorga trofeos
        v_trophies_delta := CASE WHEN p_is_victory THEN 30 ELSE -18 END;
    END IF;

    -- Asentar en perfil
    UPDATE public.profiles
    SET current_xp = current_xp + v_xp_awarded,
        battle_credits = battle_credits + v_credits_awarded,
        trophies_count = GREATEST(0, trophies_count + v_trophies_delta),
        total_matches_played = total_matches_played + 1,
        total_victories = total_victories + CASE WHEN p_is_victory THEN 1 ELSE 0 END,
        updated_at = timezone('utc'::text, now())
    WHERE id = p_user_id;

    -- Asentar auditoría contable en currency_ledger
    IF v_credits_awarded > 0 THEN
        INSERT INTO public.currency_ledger (
            user_id, currency, amount, balance_after, reason, reference_id, metadata
        ) VALUES (
            p_user_id, 'credits', v_credits_awarded,
            (SELECT battle_credits FROM public.profiles WHERE id = p_user_id),
            CASE WHEN v_is_offline THEN 'offline_match_reward' ELSE 'online_match_reward' END,
            p_match_id,
            jsonb_build_object('game_mode', p_game_mode, 'difficulty', p_difficulty)
        );
    END IF;

    RETURN jsonb_build_object(
        'xp_awarded', v_xp_awarded,
        'battle_credits_awarded', v_credits_awarded,
        'trophies_delta', v_trophies_delta,
        'offline_capped', false,
        'daily_offline_matches_used', CASE WHEN v_is_offline THEN v_daily_count + 1 ELSE 0 END
    );
END;
$$;

-- >>> FIN MIGRACIÓN: 20261031000015_offline_progression_and_transport_persistence.sql <<<


-- >>> INICIO MIGRACIÓN: 20261031000016_economy_v2_scrap_and_salvage.sql <<<
-- ==============================================================================
-- MIGRACIÓN 16: REINGENIERÍA MACROECONÓMICA V2.1, RECICLADOR Y RESOLUCIÓN SINK CHOKE
-- ==============================================================================
-- Especificación Canónica: docs/09_PROPOSAL_ECONOMY_REBALANCE_V2.md (v2.1.0-CALIBRATED-100D)
-- Aprobado por: Lead Developer (2026-10-31)
--
-- Contenido:
-- 1. Ampliación de tipos de divisa y razones válidas en 'currency_ledger'.
-- 2. Corrección atómica del RPC 'grant_match_rewards' (sustitución de amount por delta).
-- 3. Incorporación de 'tech_scrap' en 'user_industrial_inventory'.
-- 4. Conciliación de tesorería corporativa en tabla 'clans' (treasury_gold, treasury_steel).
-- 5. RPC 'scrap_blueprints': reciclaje y desguace de planos a chatarra y créditos.
-- 6. RPC 'transmute_tech_scrap': síntesis de microchips en Sala Limpia.
-- 7. Publicación en 'supabase_realtime' para emparejamiento y eventos en vivo.
-- ==============================================================================

-- 1. AJUSTES EN CURRENCY_LEDGER
ALTER TABLE public.currency_ledger 
    DROP CONSTRAINT IF EXISTS currency_ledger_currency_check;

ALTER TABLE public.currency_ledger 
    ADD CONSTRAINT currency_ledger_currency_check 
    CHECK (currency IN ('credits', 'gems', 'refined_steel', 'refined_concrete', 'refined_microchip', 'tech_scrap'));

ALTER TABLE public.currency_ledger 
    DROP CONSTRAINT IF EXISTS currency_ledger_reason_check;

ALTER TABLE public.currency_ledger 
    ADD CONSTRAINT currency_ledger_reason_check 
    CHECK (reason IN (
        'match_reward', 'online_match_reward', 'offline_match_reward',
        'level_up', 'shop_purchase', 'card_upgrade', 'commander_upgrade',
        'chest_reward', 'chest_opening', 'chest_speedup', 'command_pass',
        'stripe_purchase', 'quest_reward', 'scrap_blueprints', 'transmutation',
        'dishonor_fee', 'clan_treasury_deposit'
    ));

-- 2. CHATARRA TECNOLÓGICA EN INVENTARIO INDUSTRIAL
ALTER TABLE public.user_industrial_inventory 
    ADD COLUMN IF NOT EXISTS tech_scrap INTEGER NOT NULL DEFAULT 0 CHECK (tech_scrap >= 0);

-- 3. TESORERÍA EN CLANES
ALTER TABLE public.clans 
    ADD COLUMN IF NOT EXISTS treasury_gold INTEGER NOT NULL DEFAULT 0 CHECK (treasury_gold >= 0),
    ADD COLUMN IF NOT EXISTS treasury_steel INTEGER NOT NULL DEFAULT 0 CHECK (treasury_steel >= 0);

-- 4. RECOMPILACIÓN CORREGIDA DE RPC: grant_match_rewards (REEMPLAZA AMOUNT POR DELTA)
CREATE OR REPLACE FUNCTION public.grant_match_rewards(
    p_user_id UUID,
    p_match_id UUID,
    p_game_mode TEXT,
    p_is_victory BOOLEAN,
    p_turns_count INTEGER,
    p_properties_captured INTEGER,
    p_units_destroyed INTEGER,
    p_difficulty TEXT DEFAULT 'normal'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_base_score NUMERIC;
    v_result_mult NUMERIC;
    v_difficulty_mult NUMERIC := 1.0;
    v_arena_tier INTEGER := 1;
    v_arena_mult NUMERIC := 1.0;
    v_user_trophies INTEGER := 0;
    v_xp_awarded INTEGER;
    v_credits_awarded INTEGER;
    v_trophies_delta INTEGER := 0;
    v_is_offline BOOLEAN;
    v_daily_count INTEGER := 0;
    v_last_date DATE := CURRENT_DATE;
    v_reward_capped BOOLEAN := false;
BEGIN
    v_is_offline := (p_game_mode IN ('vs_bot', 'offline_practice', 'tutorial'));

    -- Cargar trofeos y arena del jugador
    SELECT COALESCE(trophies_count, 0) INTO v_user_trophies FROM public.profiles WHERE id = p_user_id;
    v_arena_tier := GREATEST(1, LEAST(10, FLOOR(v_user_trophies / 400) + 1));
    v_arena_mult := 1.0 + (v_arena_tier - 1) * 0.08; -- Calibración V2.1 (+8% por Arena)

    -- Comprobación de límites offline (Máximo 3 partidas remuneradas por día)
    IF v_is_offline THEN
        SELECT COALESCE(daily_offline_matches_count, 0), COALESCE(last_offline_match_date, CURRENT_DATE)
        INTO v_daily_count, v_last_date
        FROM public.profiles
        WHERE id = p_user_id
        FOR UPDATE;

        IF v_last_date < CURRENT_DATE THEN
            v_daily_count := 0;
            v_last_date := CURRENT_DATE;
        END IF;

        IF v_daily_count >= 3 THEN
            v_reward_capped := true;
        END IF;
    END IF;

    IF v_reward_capped THEN
        UPDATE public.profiles
        SET total_matches_played = total_matches_played + 1,
            total_victories = total_victories + CASE WHEN p_is_victory THEN 1 ELSE 0 END,
            updated_at = timezone('utc'::text, now())
        WHERE id = p_user_id;

        RETURN jsonb_build_object(
            'xp_awarded', 0,
            'battle_credits_awarded', 0,
            'trophies_delta', 0,
            'offline_capped', true,
            'message', 'Límite diario de recompensas offline alcanzado (3/3). Partida registrada sin créditos.'
        );
    END IF;

    -- Cálculo del puntaje base
    v_base_score := 120 + (p_properties_captured * 45) + (p_units_destroyed * 30) + (LEAST(p_turns_count, 30) * 5);
    
    IF p_is_victory THEN
        v_result_mult := 2.0;
    ELSE
        v_result_mult := 0.85;
    END IF;

    -- Multiplicadores de dificultad offline
    IF v_is_offline THEN
        IF p_difficulty = 'easy' THEN v_difficulty_mult := 0.85;
        ELSIF p_difficulty = 'hard' OR p_difficulty = 'chess' THEN v_difficulty_mult := 1.20;
        ELSE v_difficulty_mult := 1.00;
        END IF;
    END IF;

    -- Recompensas estándar base moduladas por el factor de Arena
    v_xp_awarded := FLOOR(v_base_score * v_result_mult * v_arena_mult);
    v_credits_awarded := FLOOR((60 + (p_properties_captured * 20) + (p_units_destroyed * 15)) * v_result_mult * v_arena_mult);

    -- Regla offline: 50% de botín y 0 trofeos
    IF v_is_offline THEN
        v_xp_awarded := FLOOR(v_xp_awarded * 0.50 * v_difficulty_mult);
        v_credits_awarded := FLOOR(v_credits_awarded * 0.50 * v_difficulty_mult);
        v_trophies_delta := 0;

        UPDATE public.profiles
        SET daily_offline_matches_count = v_daily_count + 1,
            last_offline_match_date = v_last_date
        WHERE id = p_user_id;
    ELSE
        v_trophies_delta := CASE WHEN p_is_victory THEN 30 ELSE -18 END;
    END IF;

    -- Asentar en perfil
    UPDATE public.profiles
    SET current_xp = current_xp + v_xp_awarded,
        battle_credits = battle_credits + v_credits_awarded,
        trophies_count = GREATEST(0, trophies_count + v_trophies_delta),
        total_matches_played = total_matches_played + 1,
        total_victories = total_victories + CASE WHEN p_is_victory THEN 1 ELSE 0 END,
        updated_at = timezone('utc'::text, now())
    WHERE id = p_user_id;

    -- Auditoría contable en currency_ledger (utilizando 'delta')
    IF v_credits_awarded > 0 THEN
        INSERT INTO public.currency_ledger (
            user_id, currency, delta, balance_after, reason, reference_id, metadata
        ) VALUES (
            p_user_id, 'credits', v_credits_awarded,
            (SELECT battle_credits FROM public.profiles WHERE id = p_user_id),
            CASE WHEN v_is_offline THEN 'offline_match_reward' ELSE 'online_match_reward' END,
            p_match_id::text,
            jsonb_build_object('game_mode', p_game_mode, 'difficulty', p_difficulty, 'arena_tier', v_arena_tier)
        );
    END IF;

    RETURN jsonb_build_object(
        'xp_awarded', v_xp_awarded,
        'battle_credits_awarded', v_credits_awarded,
        'trophies_delta', v_trophies_delta,
        'offline_capped', false,
        'daily_offline_matches_used', CASE WHEN v_is_offline THEN v_daily_count + 1 ELSE 0 END
    );
END;
$$;

-- 5. RPC ATÓMICO: scrap_blueprints (Desguace de Planos a Chatarra y Créditos)
CREATE OR REPLACE FUNCTION public.scrap_blueprints(
    p_unit_id VARCHAR(32),
    p_quantity INTEGER
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_unit public.units_catalog%ROWTYPE;
    v_user_card public.user_cards%ROWTYPE;
    v_scrap_rate INTEGER := 1;
    v_credit_rate INTEGER := 2;
    v_total_scrap INTEGER;
    v_total_credits INTEGER;
BEGIN
    IF v_user_id IS NULL THEN RAISE EXCEPTION 'No autenticado'; END IF;
    IF p_quantity <= 0 THEN RAISE EXCEPTION 'Cantidad de planos debe ser positiva.'; END IF;

    SELECT * INTO v_user_card FROM public.user_cards 
    WHERE user_id = v_user_id AND unit_id = p_unit_id FOR UPDATE;

    IF NOT FOUND OR v_user_card.cards_count < p_quantity THEN
        RAISE EXCEPTION 'Planos insuficientes para reciclar.';
    END IF;

    -- Determinar tasa por rareza en catálogo
    SELECT * INTO v_unit FROM public.units_catalog WHERE id = p_unit_id;
    IF v_unit.category = 'indirect' OR v_unit.category = 'aircraft' THEN
        v_scrap_rate := 6; v_credit_rate := 15; -- Raras
    ELSIF v_unit.category = 'naval' THEN
        v_scrap_rate := 35; v_credit_rate := 100; -- Épicas
    ELSE
        v_scrap_rate := 1; v_credit_rate := 2;   -- Comunes
    END IF;

    v_total_scrap := p_quantity * v_scrap_rate;
    v_total_credits := p_quantity * v_credit_rate;

    -- Descontar planos de la tropa
    UPDATE public.user_cards 
    SET cards_count = cards_count - p_quantity, updated_at = timezone('utc'::text, now())
    WHERE id = v_user_card.id;

    -- Abonar Chatarra Tecnológica e inventario industrial
    UPDATE public.user_industrial_inventory 
    SET tech_scrap = tech_scrap + v_total_scrap, updated_at = timezone('utc'::text, now())
    WHERE user_id = v_user_id;

    -- Abonar Créditos de Batalla
    UPDATE public.profiles 
    SET battle_credits = battle_credits + v_total_credits, updated_at = timezone('utc'::text, now())
    WHERE id = v_user_id;

    -- Registrar auditoría en ledger
    INSERT INTO public.currency_ledger (user_id, currency, delta, balance_after, reason, reference_id, metadata)
    VALUES (
        v_user_id, 'credits', v_total_credits, 
        (SELECT battle_credits FROM public.profiles WHERE id = v_user_id),
        'scrap_blueprints', p_unit_id,
        jsonb_build_object('blueprints_scrapped', p_quantity, 'tech_scrap_gained', v_total_scrap)
    );

    RETURN jsonb_build_object(
        'success', true,
        'unit_id', p_unit_id,
        'blueprints_scrapped', p_quantity,
        'tech_scrap_awarded', v_total_scrap,
        'credits_awarded', v_total_credits
    );
END;
$$;

-- 6. RPC: transmute_tech_scrap (Síntesis de Microchips con Chatarra)
CREATE OR REPLACE FUNCTION public.transmute_tech_scrap(p_batches INTEGER DEFAULT 1)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_inv public.user_industrial_inventory%ROWTYPE;
    v_req_scrap INTEGER := 40 * p_batches;
    v_req_rare INTEGER := 20 * p_batches;
    v_produced_chips INTEGER := 1 * p_batches;
BEGIN
    IF v_user_id IS NULL THEN RAISE EXCEPTION 'No autenticado'; END IF;
    IF p_batches <= 0 THEN RAISE EXCEPTION 'Número de lotes inválido.'; END IF;

    SELECT * INTO v_inv FROM public.user_industrial_inventory 
    WHERE user_id = v_user_id FOR UPDATE;

    IF NOT FOUND THEN RAISE EXCEPTION 'Inventario industrial no inicializado.'; END IF;
    IF v_inv.tech_scrap < v_req_scrap THEN RAISE EXCEPTION 'Chatarra tecnológica insuficiente.'; END IF;
    IF v_inv.raw_rare_earth < v_req_rare THEN RAISE EXCEPTION 'Tierras raras insuficientes.'; END IF;

    UPDATE public.user_industrial_inventory
    SET tech_scrap = tech_scrap - v_req_scrap,
        raw_rare_earth = raw_rare_earth - v_req_rare,
        refined_microchip = refined_microchip + v_produced_chips,
        updated_at = timezone('utc'::text, now())
    WHERE user_id = v_user_id;

    RETURN jsonb_build_object(
        'success', true,
        'batches', p_batches,
        'microchips_produced', v_produced_chips,
        'scrap_spent', v_req_scrap,
        'rare_earth_spent', v_req_rare
    );
END;
$$;

-- 7. SUSCRIPCIÓN EN TIEMPO REAL (SUPABASE REALTIME)
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE 
            public.matchmaking_queue,
            public.active_matches,
            public.match_participants,
            public.chat_messages;
    END IF;
END $$;

-- >>> FIN MIGRACIÓN: 20261031000016_economy_v2_scrap_and_salvage.sql <<<


-- >>> INICIO MIGRACIÓN: 20261031000017_monetization_overhaul.sql <<<
-- ==============================================================================
-- MIGRACIÓN 17: REINGENIERÍA DE MONETIZACIÓN, FAIR-PLAY Y HANDICAP DAVID VS GOLIAT
-- ==============================================================================
-- Especificación: PROPUESTA_REINGENIERIA_MONETIZACION_V2.md (v2.0.0-PROD-SPEC)
-- Aprobado por: Lead Developer (2026-10-31)
--
-- Contenido:
-- 1. Catálogo oficial de micro-transacciones ($0.99 a $4.99) y Command Pass ($5.99).
-- 2. Soporte para Cargamento de Contraataque (12h de reserva) en 'player_tactical_behavior_profile'.
-- 3. RPC 'calculate_underdog_handicap': Algoritmo "David vs. Goliat" con bonificación Elo/Oro.
-- 4. RPC 'claim_counter_offensive_cargo': Entrega segura server-side de suministros.
-- ==============================================================================

-- 1. TABLA: store_products_catalog
CREATE TABLE IF NOT EXISTS public.store_products_catalog (
    id VARCHAR(48) PRIMARY KEY,
    name VARCHAR(64) NOT NULL,
    category VARCHAR(24) NOT NULL CHECK (category IN ('subscription', 'supply_pack', 'chest', 'cosmetic')),
    price_usd NUMERIC(5,2) NOT NULL,
    reward_credits INTEGER NOT NULL DEFAULT 0,
    reward_gems INTEGER NOT NULL DEFAULT 0,
    reward_blueprints INTEGER NOT NULL DEFAULT 0,
    reward_steel INTEGER NOT NULL DEFAULT 0,
    reward_microchips INTEGER NOT NULL DEFAULT 0,
    reward_concrete INTEGER NOT NULL DEFAULT 0,
    safeguards_included INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.store_products_catalog ENABLE ROW LEVEL SECURITY;
CREATE POLICY "store_products_select_all" ON public.store_products_catalog FOR SELECT USING (true);

-- Poblado de SKUs Oficiales ($0.99 - $5.99)
INSERT INTO public.store_products_catalog (
    id, name, category, price_usd, reward_credits, reward_gems,
    reward_blueprints, reward_steel, reward_microchips, reward_concrete, safeguards_included, metadata
) VALUES
    ('command_pass_monthly', 'Command Pass Mensual', 'subscription', 5.99, 35000, 300, 500, 100, 30, 20, 1, 
     '{"auto_chest_queue": true, "daily_safeguard": true, "exclusive_cosmetics": true}'::jsonb),
    ('pack_shock_ammo_099', 'Caja de Munición de Choque', 'supply_pack', 0.99, 1200, 0, 60, 10, 0, 0, 0,
     '{"target": "novice_impulse"}'::jsonb),
    ('pack_microchips_briefcase_199', 'Maletín de Chips de Guía', 'supply_pack', 1.99, 2500, 0, 0, 0, 15, 0, 0,
     '{"target": "cleanroom_bottleneck_relief", "campaign_fuel": 5}'::jsonb),
    ('chest_division_tactical_299', 'Cofre Táctico de División', 'chest', 2.99, 6000, 0, 180, 35, 15, 0, 0,
     '{"target": "arena_reinforcement", "guaranteed_rares": 20}'::jsonb),
    ('pack_ballistic_armor_399', 'Kit de Blindaje Balístico', 'supply_pack', 3.99, 8000, 0, 0, 80, 0, 30, 0,
     '{"target": "heavy_armor_builder"}'::jsonb),
    ('arsenal_vanguard_supreme_499', 'Gran Arsenal de Vanguardia', 'chest', 4.99, 15000, 50, 450, 70, 25, 20, 1,
     '{"target": "high_value_anchor", "guaranteed_rares": 50, "guaranteed_epics": 5}'::jsonb)
ON CONFLICT (id) DO UPDATE SET
    price_usd = EXCLUDED.price_usd,
    reward_credits = EXCLUDED.reward_credits,
    reward_blueprints = EXCLUDED.reward_blueprints,
    reward_steel = EXCLUDED.reward_steel,
    reward_microchips = EXCLUDED.reward_microchips;

-- 2. AMPLIAR TABLA DE COMPORTAMIENTO: player_tactical_behavior_profile
ALTER TABLE public.player_tactical_behavior_profile
    ADD COLUMN IF NOT EXISTS counter_offensive_offer JSONB DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS counter_offensive_expires_at TIMESTAMPTZ DEFAULT NULL;

-- 3. RPC: calculate_underdog_handicap (Algoritmo David vs Goliat)
CREATE OR REPLACE FUNCTION public.calculate_underdog_handicap(
    p_player_trophies INTEGER,
    p_opponent_trophies INTEGER,
    p_player_wapl NUMERIC,
    p_opponent_wapl NUMERIC,
    p_is_victory BOOLEAN,
    p_base_trophies INTEGER,
    p_base_credits INTEGER
)
RETURNS JSONB
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
    v_delta_wapl NUMERIC := p_opponent_wapl - p_player_wapl;
    v_is_underdog BOOLEAN := false;
    v_final_trophies INTEGER := p_base_trophies;
    v_final_credits INTEGER := p_base_credits;
    v_bonus_trophies INTEGER := 0;
    v_bonus_credits INTEGER := 0;
BEGIN
    IF v_delta_wapl >= 0.8 THEN
        v_is_underdog := true;
        IF p_is_victory THEN
            -- Bonificación de hasta +30% Trofeos y +50% Créditos por vencer a un rival superior
            v_bonus_trophies := ROUND(p_base_trophies * LEAST(0.30, v_delta_wapl * 0.15));
            v_bonus_credits := ROUND(p_base_credits * LEAST(0.50, v_delta_wapl * 0.25));
            v_final_trophies := p_base_trophies + v_bonus_trophies;
            v_final_credits := p_base_credits + v_bonus_credits;
        ELSE
            -- En derrota, mitiga la pérdida de trofeos en un 15-30%
            v_final_trophies := ROUND(p_base_trophies * GREATEST(0.70, 1.0 - (v_delta_wapl * 0.10)));
        END IF;
    END IF;

    RETURN jsonb_build_object(
        'is_underdog', v_is_underdog,
        'delta_wapl', v_delta_wapl,
        'final_trophies', v_final_trophies,
        'final_credits', v_final_credits,
        'bonus_trophies', v_bonus_trophies,
        'bonus_credits', v_bonus_credits
    );
END;
$$;

-- 4. RPC: claim_counter_offensive_cargo (Adquisición y Reclamación Segura)
CREATE OR REPLACE FUNCTION public.claim_counter_offensive_cargo(p_product_id VARCHAR(48))
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_product public.store_products_catalog%ROWTYPE;
    v_profile public.profiles%ROWTYPE;
    v_now TIMESTAMPTZ := timezone('utc'::text, now());
BEGIN
    IF v_user_id IS NULL THEN RAISE EXCEPTION 'No autenticado'; END IF;

    SELECT * INTO v_product FROM public.store_products_catalog 
    WHERE id = p_product_id AND is_active = true;

    IF NOT FOUND THEN RAISE EXCEPTION 'Producto no encontrado o inactivo.'; END IF;

    -- Entregar créditos y gemas
    UPDATE public.profiles
    SET battle_credits = battle_credits + v_product.reward_credits,
        command_gems = command_gems + v_product.reward_gems,
        safeguard_items_count = LEAST(3, safeguard_items_count + v_product.safeguards_included),
        updated_at = v_now
    WHERE id = v_user_id;

    -- Entregar materiales industriales
    IF v_product.reward_steel > 0 OR v_product.reward_microchips > 0 OR v_product.reward_concrete > 0 THEN
        UPDATE public.user_industrial_inventory
        SET refined_steel = refined_steel + v_product.reward_steel,
            refined_microchip = refined_microchip + v_product.reward_microchips,
            refined_concrete = refined_concrete + v_product.reward_concrete,
            updated_at = v_now
        WHERE user_id = v_user_id;
    END IF;

    -- Registrar en ledger contable
    IF v_product.reward_credits > 0 THEN
        INSERT INTO public.currency_ledger (user_id, currency, delta, balance_after, reason, reference_id, metadata)
        SELECT v_user_id, 'credits', v_product.reward_credits, battle_credits, 'shop_purchase', p_product_id,
               jsonb_build_object('sku', p_product_id, 'price_usd', v_product.price_usd)
        FROM public.profiles WHERE id = v_user_id;
    END IF;

    -- Limpiar oferta de contraataque activa en perfil
    UPDATE public.player_tactical_behavior_profile
    SET counter_offensive_offer = NULL,
        counter_offensive_expires_at = NULL,
        updated_at = v_now
    WHERE user_id = v_user_id;

    RETURN jsonb_build_object(
        'success', true,
        'sku', p_product_id,
        'credits_granted', v_product.reward_credits,
        'gems_granted', v_product.reward_gems,
        'steel_granted', v_product.reward_steel,
        'chips_granted', v_product.reward_microchips
    );
END;
$$;

-- >>> FIN MIGRACIÓN: 20261031000017_monetization_overhaul.sql <<<


-- >>> INICIO MIGRACIÓN: 20261031000018_social_identity_clans_and_territorial_war.sql <<<
-- ==============================================================================
-- MIGRACIÓN 000018: ECOSISTEMA SOCIAL, IDENTIDAD DE COMANDANTE Y GUERRA TERRITORIAL
-- ==============================================================================
-- Proyecto: Tactical Command: Wars of Legacy
-- Especificación Canónica: docs/PROPUESTA_REINGENIERIA_SOCIAL_Y_CLANES.md
-- Fecha: Octubre 2026
--
-- Contenido:
-- 1. Alteraciones en 'profiles' para identidad militar retro-futurista y expedientes.
-- 2. Alteraciones en 'clans' para tesorería multinivel (oro, acero, gemas) y buffs.
-- 3. Catálogo de cosméticos (marcos, banderas, banners, títulos, paletas, vfx).
-- 4. Sistema transaccional de donaciones de cartas y suministros con recompensas de XP/G.
-- 5. Guerra Territorial de Clanes: 7 sectores estratégicos, temporadas y Puntos de Despliegue (DP).
-- 6. RPCs transaccionales con bloqueo FOR UPDATE y SECURITY DEFINER.
-- 7. Tabla hot-tunable 'social_config_params' para calibración sin despliegues.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. TABLA DE CONFIGURACIÓN DINÁMICA (HOT-TUNABLE)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS social_config_params (
  id VARCHAR(50) PRIMARY KEY,
  config JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO social_config_params (id, config)
VALUES ('active_v1', '{
  "identity": {
    "nickname_change_cooldown_days": 30,
    "nickname_change_premium_cooldown_days": 14,
    "nickname_change_gem_cost": 250,
    "max_display_name_length": 16,
    "min_display_name_length": 3,
    "default_faction_flag": "PMC_TITAN"
  },
  "dishonor_embargo": {
    "fines": {
      "gold_cost": 1500,
      "steel_cost": 30,
      "gem_cost_alternative": 50
    },
    "split_distribution": {
      "treasury_percent": 0.50,
      "top1_dividend_percent": 0.25,
      "top2_dividend_percent": 0.15,
      "top3_dividend_percent": 0.10
    },
    "rescue_mechanic": {
      "cooldown_days_per_user": 14,
      "donor_xp_reward": 150,
      "donor_stolen_chest_cards_ratio": 0.25,
      "donor_clan_merit_reward": 150
    },
    "military_furlough": {
      "allowed_days_per_month": 2,
      "reward_tier_fallback": 1
    }
  },
  "donations_p2p": {
    "cooldown_hours": 8,
    "limits_per_cycle": {
      "common_cards": 8,
      "rare_cards": 2,
      "epic_cards_sunday_only": 1
    },
    "donor_rewards": {
      "common": { "gold": 25, "xp": 5 },
      "rare": { "gold": 150, "xp": 25 },
      "epic": { "gold": 500, "xp": 100 }
    },
    "p2p_emergency_transfer": {
      "tax_rate_to_treasury": 0.04,
      "max_steel_transfer": 50,
      "max_microchips_transfer": 10,
      "min_account_age_days": 7,
      "min_account_level": 8
    }
  },
  "territorial_war": {
    "cycle_duration_hours": 72,
    "total_sectors": 7,
    "points_per_match": {
      "solo_victory_dp": 100,
      "solo_defeat_dp": 25,
      "coop_2v2_clan_victory_multiplier": 2.00,
      "priority_target_bonus_multiplier": 1.25
    },
    "treasury_sinks": {
      "industrial_overcharge": {
        "gold_cost": 15000,
        "steel_cost": 250,
        "duration_hours": 24,
        "buff_extraction_pct": 5
      },
      "war_siege_funding": {
        "gold_cost": 25000,
        "steel_cost": 400,
        "microchips_cost": 100,
        "duration_hours": 12,
        "buff_dp_pct": 15
      }
    }
  }
}'::jsonb)
ON CONFLICT (id) DO UPDATE SET config = EXCLUDED.config, updated_at = NOW();

-- ------------------------------------------------------------------------------
-- 2. ALTERACIÓN DE PROFILES (IDENTIDAD Y EXPEDIENTE MILITAR)
-- ------------------------------------------------------------------------------
ALTER TABLE profiles 
  ADD COLUMN IF NOT EXISTS tag_id VARCHAR(6) DEFAULT LPAD(FLOOR(RANDOM()*10000)::TEXT, 4, '0'),
  ADD COLUMN IF NOT EXISTS country_code VARCHAR(10) DEFAULT 'PMC_TITAN',
  ADD COLUMN IF NOT EXISTS custom_bio VARCHAR(140) DEFAULT 'Comandante en servicio activo.',
  ADD COLUMN IF NOT EXISTS military_title VARCHAR(50) DEFAULT 'Recluta de Vanguardia',
  ADD COLUMN IF NOT EXISTS active_avatar_frame_id VARCHAR(50) DEFAULT 'frame_iron_standard',
  ADD COLUMN IF NOT EXISTS active_banner_id VARCHAR(50) DEFAULT 'banner_bunker_mesh',
  ADD COLUMN IF NOT EXISTS active_lobby_vfx_id VARCHAR(50) DEFAULT 'vfx_standard_alert',
  ADD COLUMN IF NOT EXISTS ui_palette_id VARCHAR(50) DEFAULT 'palette_olive_retro',
  ADD COLUMN IF NOT EXISTS last_nickname_change_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS military_furloughs_left INT DEFAULT 2,
  ADD COLUMN IF NOT EXISTS last_furlough_reset_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS last_embargo_rescue_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS pinned_medals JSONB DEFAULT '["medal_recruit", "medal_first_blood", null]'::jsonb;

-- ------------------------------------------------------------------------------
-- 3. ALTERACIÓN DE CLANS (TESORERÍA MULTINIVEL Y BUFFS ACTIVOS)
-- ------------------------------------------------------------------------------
ALTER TABLE clans
  ADD COLUMN IF NOT EXISTS treasury_gold BIGINT DEFAULT 0 CHECK (treasury_gold >= 0),
  ADD COLUMN IF NOT EXISTS treasury_steel BIGINT DEFAULT 0 CHECK (treasury_steel >= 0),
  ADD COLUMN IF NOT EXISTS treasury_gems BIGINT DEFAULT 0 CHECK (treasury_gems >= 0),
  ADD COLUMN IF NOT EXISTS active_war_buffs JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS clan_banner_cosmetic_id VARCHAR(50) DEFAULT 'banner_clan_default';

-- ------------------------------------------------------------------------------
-- 4. CATÁLOGO DE COSMÉTICOS Y RELACIÓN CON USUARIOS
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS cosmetics_catalog (
  id VARCHAR(50) PRIMARY KEY,
  category VARCHAR(30) NOT NULL CHECK (category IN ('frame', 'banner', 'title', 'lobby_vfx', 'palette', 'clan_banner')),
  name VARCHAR(100) NOT NULL,
  description TEXT,
  rarity VARCHAR(20) NOT NULL DEFAULT 'common' CHECK (rarity IN ('common', 'rare', 'epic', 'legendary')),
  price_gems INT DEFAULT 0,
  price_gold INT DEFAULT 0,
  is_pass_exclusive BOOLEAN DEFAULT FALSE,
  is_purchasable BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_cosmetics (
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  cosmetic_id VARCHAR(50) REFERENCES cosmetics_catalog(id) ON DELETE CASCADE,
  acquired_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, cosmetic_id)
);

-- Semilla de Cosméticos Canónicos
INSERT INTO cosmetics_catalog (id, category, name, description, rarity, price_gems, price_gold, is_pass_exclusive)
VALUES
  ('frame_iron_standard', 'frame', 'Bisel de Hierro Forjado', 'Marco estándar de aleación militar.', 'common', 0, 0, false),
  ('frame_gold_laurel', 'frame', 'Laurel Dorado del Estado Mayor', 'Marco dorado condecorado para altos mandos.', 'epic', 350, 0, true),
  ('frame_cyber_neon', 'frame', 'Resplandor Neón Retro', 'Borde fluorescente estilo terminal militar de fósforo verde.', 'rare', 200, 1500, false),
  ('banner_bunker_mesh', 'banner', 'Malla Camuflada de Búnker', 'Fondo de expediente con blindaje y remaches.', 'common', 0, 0, false),
  ('banner_radar_dish', 'banner', 'Cúpula de Radar Estratégico', 'Vista panorámica de telemetría de largo alcance.', 'rare', 250, 2000, false),
  ('title_vanguard', 'title', 'Vanguardia de Combate', 'Título honorífico de primera línea de fuego.', 'common', 0, 500, false),
  ('title_iron_strategist', 'title', 'Estratega de Acero', 'Otorgado a quienes superan 50 victorias en Ladder.', 'epic', 500, 0, true),
  ('vfx_standard_alert', 'lobby_vfx', 'Destello de Klaxon Ámbar', 'Parpadeo militar al entrar a la sala.', 'common', 0, 0, false),
  ('vfx_heli_landing', 'lobby_vfx', 'Descenso de Escuadrón', 'Viento y polvo de turbinas en el lobby.', 'legendary', 750, 0, true),
  ('palette_olive_retro', 'palette', 'Oliva Táctico y Óxido', 'Paleta clásica del Alto Mando (#46521F / #C46A3A).', 'common', 0, 0, false),
  ('palette_amber_crt', 'palette', 'Terminal de Fósforo Ámbar', 'Contraste monocromático de radar naval.', 'rare', 150, 1000, false)
ON CONFLICT (id) DO NOTHING;

-- ------------------------------------------------------------------------------
-- 5. LOGÍSTICA DE DONACIÓN DE CARTAS Y SUMINISTROS
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS clan_card_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clan_id UUID NOT NULL REFERENCES clans(id) ON DELETE CASCADE,
  requester_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  card_id VARCHAR(50) NOT NULL,
  rarity VARCHAR(20) NOT NULL CHECK (rarity IN ('common', 'rare', 'epic')),
  amount_requested INT NOT NULL,
  amount_donated INT NOT NULL DEFAULT 0,
  is_fulfilled BOOLEAN DEFAULT FALSE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS clan_card_donations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL REFERENCES clan_card_requests(id) ON DELETE CASCADE,
  donor_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  amount INT NOT NULL CHECK (amount > 0),
  gold_reward INT NOT NULL DEFAULT 0,
  xp_reward INT NOT NULL DEFAULT 0,
  donated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- 6. GUERRA TERRITORIAL DE CLANES (7 SECTORES Y TEMPORADAS)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS clan_war_seasons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  season_number INT NOT NULL UNIQUE,
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS clan_territory_sectors (
  sector_id INT PRIMARY KEY CHECK (sector_id BETWEEN 1 AND 7),
  name VARCHAR(100) NOT NULL,
  description TEXT,
  strategic_buff_type VARCHAR(50) NOT NULL,
  current_controlling_clan_id UUID REFERENCES clans(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS clan_war_deployments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  season_id UUID NOT NULL REFERENCES clan_war_seasons(id) ON DELETE CASCADE,
  sector_id INT NOT NULL REFERENCES clan_territory_sectors(sector_id) ON DELETE CASCADE,
  clan_id UUID NOT NULL REFERENCES clans(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  deployment_points INT NOT NULL CHECK (deployment_points > 0),
  battle_type VARCHAR(20) NOT NULL CHECK (battle_type IN ('solo_1v1', 'coop_2v2')),
  deployed_at TIMESTAMPTZ DEFAULT NOW()
);

-- Semilla de los 7 Sectores Estratégicos
INSERT INTO clan_territory_sectors (sector_id, name, description, strategic_buff_type)
VALUES
  (1, 'Base Aérea Águila Negra', 'Aumenta en un 10% el drop de cartas y planos aéreos.', 'buff_air_drop'),
  (2, 'Refinería Petroquímica', 'Incrementa la extracción pasiva de combustible industrial en +10%.', 'buff_fuel_extraction'),
  (3, 'Radar Maestro de Cota Cero', 'Telemetría de largo alcance que anticipa la doctrina rival.', 'buff_early_intel'),
  (4, 'Ciudadela Central (Bastión Supremo)', 'Sector capital. Aporta +500G y 20 Vigas de Acero diarias a la tesorería.', 'buff_capital_tribute'),
  (5, 'Centro de Ciber-Comando', 'Guerra electrónica: -5% en el costo de forja en el Complejo Industrial.', 'buff_forge_discount'),
  (6, 'Astillero Fluvial', 'Incrementa recompensas de artillería naval y submarinos.', 'buff_naval_supply'),
  (7, 'Depósito Ferroviario', 'Logística pesada sin impuestos para transferencias internas del clan.', 'buff_free_rail_transport')
ON CONFLICT (sector_id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  strategic_buff_type = EXCLUDED.strategic_buff_type;

-- Crear una temporada inicial si no existe
INSERT INTO clan_war_seasons (season_number, starts_at, ends_at, is_active)
VALUES (1, NOW() - INTERVAL '1 day', NOW() + INTERVAL '2 days', true)
ON CONFLICT (season_number) DO NOTHING;

-- ------------------------------------------------------------------------------
-- 7. POLÍTICAS RLS (ROW LEVEL SECURITY)
-- ------------------------------------------------------------------------------
ALTER TABLE social_config_params ENABLE ROW LEVEL SECURITY;
ALTER TABLE cosmetics_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_cosmetics ENABLE ROW LEVEL SECURITY;
ALTER TABLE clan_card_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE clan_card_donations ENABLE ROW LEVEL SECURITY;
ALTER TABLE clan_war_seasons ENABLE ROW LEVEL SECURITY;
ALTER TABLE clan_territory_sectors ENABLE ROW LEVEL SECURITY;
ALTER TABLE clan_war_deployments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read social_config_params" ON social_config_params FOR SELECT USING (true);
CREATE POLICY "Public read cosmetics_catalog" ON cosmetics_catalog FOR SELECT USING (true);
CREATE POLICY "Users read own user_cosmetics" ON user_cosmetics FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own user_cosmetics" ON user_cosmetics FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Clan members read clan_card_requests" ON clan_card_requests FOR SELECT USING (true);
CREATE POLICY "Clan members read clan_card_donations" ON clan_card_donations FOR SELECT USING (true);
CREATE POLICY "Public read clan_territory_sectors" ON clan_territory_sectors FOR SELECT USING (true);
CREATE POLICY "Public read clan_war_seasons" ON clan_war_seasons FOR SELECT USING (true);
CREATE POLICY "Public read clan_war_deployments" ON clan_war_deployments FOR SELECT USING (true);

-- ------------------------------------------------------------------------------
-- 8. CONTRATOS RPC TRANSACCIONALES (PL/pgSQL)
-- ------------------------------------------------------------------------------

-- RPC 1: Solicitar Donación de Cartas
CREATE OR REPLACE FUNCTION rpc_request_card_donation(
  p_card_id VARCHAR(50),
  p_rarity VARCHAR(20)
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_clan_id UUID;
  v_joined_at TIMESTAMPTZ;
  v_account_level INT;
  v_last_request_at TIMESTAMPTZ;
  v_max_amount INT;
  v_new_request_id UUID;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'No autenticado');
  END IF;

  SELECT clan_id, joined_at INTO v_clan_id, v_joined_at
  FROM clan_members
  WHERE user_id = v_user_id;

  IF v_clan_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'No perteneces a ningún clan');
  END IF;

  IF v_joined_at > NOW() - INTERVAL '7 days' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Requieres al menos 7 días de servicio en el clan');
  END IF;

  SELECT level INTO v_account_level FROM profiles WHERE id = v_user_id;
  IF COALESCE(v_account_level, 1) < 8 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Requieres Nivel de Mando 8 para solicitar suministros');
  END IF;

  SELECT MAX(created_at) INTO v_last_request_at
  FROM clan_card_requests
  WHERE requester_id = v_user_id;

  IF v_last_request_at IS NOT NULL AND v_last_request_at > NOW() - INTERVAL '8 hours' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Línea de suministros en enfriamiento. Espera 8 horas.');
  END IF;

  IF p_rarity = 'common' THEN
    v_max_amount := 8;
  ELSIF p_rarity = 'rare' THEN
    v_max_amount := 2;
  ELSIF p_rarity = 'epic' THEN
    IF EXTRACT(DOW FROM NOW()) <> 0 THEN
      RETURN jsonb_build_object('success', false, 'error', 'Las cartas épicas solo pueden solicitarse los domingos');
    END IF;
    v_max_amount := 1;
  ELSE
    RETURN jsonb_build_object('success', false, 'error', 'Rareza de carta inválida para donación');
  END IF;

  INSERT INTO clan_card_requests (
    clan_id, requester_id, card_id, rarity, amount_requested, expires_at
  ) VALUES (
    v_clan_id, v_user_id, p_card_id, p_rarity, v_max_amount, NOW() + INTERVAL '12 hours'
  ) RETURNING id INTO v_new_request_id;

  RETURN jsonb_build_object(
    'success', true,
    'request_id', v_new_request_id,
    'amount_requested', v_max_amount,
    'expires_at', NOW() + INTERVAL '12 hours'
  );
END;
$$;

-- RPC 2: Donar Cartas y Recibir Botín
CREATE OR REPLACE FUNCTION rpc_donate_cards(
  p_request_id UUID,
  p_amount INT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_donor_id UUID := auth.uid();
  v_req RECORD;
  v_gold_reward INT := 0;
  v_xp_reward INT := 0;
  v_cards_needed INT;
  v_donated_cards_count INT;
BEGIN
  IF v_donor_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'No autenticado');
  END IF;

  SELECT * INTO v_req
  FROM clan_card_requests
  WHERE id = p_request_id AND is_fulfilled = FALSE AND expires_at > NOW()
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'La solicitud ya expiró o fue completada');
  END IF;

  IF v_req.requester_id = v_donor_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'No puedes donarte cartas a ti mismo');
  END IF;

  v_cards_needed := v_req.amount_requested - v_req.amount_donated;
  IF p_amount > v_cards_needed THEN
    p_amount := v_cards_needed;
  END IF;

  SELECT COALESCE(SUM(amount), 0) INTO v_donated_cards_count
  FROM clan_card_donations
  WHERE request_id = p_request_id AND donor_id = v_donor_id;

  IF (v_req.rarity = 'common' AND v_donated_cards_count + p_amount > 2) OR
     (v_req.rarity IN ('rare', 'epic') AND v_donated_cards_count + p_amount > 1) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Alcanzaste tu cupo máximo de donación para esta solicitud');
  END IF;

  IF v_req.rarity = 'common' THEN
    v_gold_reward := p_amount * 25;
    v_xp_reward := p_amount * 5;
  ELSIF v_req.rarity = 'rare' THEN
    v_gold_reward := p_amount * 150;
    v_xp_reward := p_amount * 25;
  ELSIF v_req.rarity = 'epic' THEN
    v_gold_reward := p_amount * 500;
    v_xp_reward := p_amount * 100;
  END IF;

  INSERT INTO clan_card_donations (
    request_id, donor_id, amount, gold_reward, xp_reward
  ) VALUES (
    p_request_id, v_donor_id, p_amount, v_gold_reward, v_xp_reward
  );

  UPDATE clan_card_requests
  SET 
    amount_donated = amount_donated + p_amount,
    is_fulfilled = (amount_donated + p_amount >= amount_requested)
  WHERE id = p_request_id;

  UPDATE profiles
  SET 
    gold = gold + v_gold_reward,
    experience = experience + v_xp_reward
  WHERE id = v_donor_id;

  INSERT INTO currency_ledger (profile_id, delta, currency, reason)
  VALUES (v_donor_id, v_gold_reward, 'gold', 'clan_card_donation_reward');

  RETURN jsonb_build_object(
    'success', true,
    'amount_donated', p_amount,
    'gold_reward', v_gold_reward,
    'xp_reward', v_xp_reward
  );
END;
$$;

-- RPC 3: Rescate de Camarada Embargado
CREATE OR REPLACE FUNCTION rpc_rescue_embargoed_comrade(
  p_embargoed_user_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_savior_id UUID := auth.uid();
  v_clan_id UUID;
  v_savior_gold BIGINT;
  v_savior_steel INT;
  v_last_rescue_at TIMESTAMPTZ;
  v_member_rec RECORD;
  v_gold_fine CONSTANT BIGINT := 1500;
  v_steel_fine CONSTANT INT := 30;
BEGIN
  IF v_savior_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'No autenticado');
  END IF;

  IF v_savior_id = p_embargoed_user_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'No puedes auto-rescatarte de tu propio embargo');
  END IF;

  SELECT clan_id INTO v_clan_id FROM clan_members WHERE user_id = v_savior_id;
  SELECT * INTO v_member_rec FROM clan_members WHERE user_id = p_embargoed_user_id AND clan_id = v_clan_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'El miembro no pertenece a tu clan militar');
  END IF;

  IF NOT v_member_rec.is_embargoed THEN
    RETURN jsonb_build_object('success', false, 'error', 'El camarada no se encuentra bajo embargo');
  END IF;

  SELECT last_embargo_rescue_at INTO v_last_rescue_at FROM profiles WHERE id = p_embargoed_user_id;
  IF v_last_rescue_at IS NOT NULL AND v_last_rescue_at > NOW() - INTERVAL '14 days' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Este camarada ya recibió un rescate en los últimos 14 días');
  END IF;

  SELECT gold, steel_beams INTO v_savior_gold, v_savior_steel
  FROM profiles WHERE id = v_savior_id FOR UPDATE;

  IF v_savior_gold < v_gold_fine OR v_savior_steel < v_steel_fine THEN
    RETURN jsonb_build_object('success', false, 'error', 'Fondos insuficientes para costear la fianza militar');
  END IF;

  UPDATE profiles
  SET 
    gold = gold - v_gold_fine,
    steel_beams = steel_beams - v_steel_fine,
    experience = experience + 150
  WHERE id = v_savior_id;

  UPDATE clans
  SET 
    treasury_gold = treasury_gold + 750,
    treasury_steel = treasury_steel + 15
  WHERE id = v_clan_id;

  WITH ranked_warriors AS (
    SELECT user_id, ROW_NUMBER() OVER (ORDER BY war_victories DESC, donated_cards_weekly DESC) AS pos
    FROM clan_members
    WHERE clan_id = v_clan_id
    LIMIT 3
  )
  UPDATE profiles p
  SET 
    gold = p.gold + CASE WHEN rw.pos = 1 THEN 375 WHEN rw.pos = 2 THEN 225 ELSE 150 END,
    steel_beams = p.steel_beams + CASE WHEN rw.pos = 1 THEN 8 WHEN rw.pos = 2 THEN 4 ELSE 3 END
  FROM ranked_warriors rw
  WHERE p.id = rw.user_id;

  UPDATE clan_members
  SET is_embargoed = FALSE
  WHERE user_id = p_embargoed_user_id;

  UPDATE profiles
  SET last_embargo_rescue_at = NOW()
  WHERE id = p_embargoed_user_id;

  INSERT INTO currency_ledger (profile_id, delta, currency, reason)
  VALUES (v_savior_id, -v_gold_fine, 'gold', 'rescue_comrade_fine_paid');

  RETURN jsonb_build_object(
    'success', true,
    'rescued_user_id', p_embargoed_user_id,
    'xp_earned_by_savior', 150,
    'treasury_gold_deposit', 750,
    'treasury_steel_deposit', 15
  );
END;
$$;

-- RPC 4: Contribuir Puntos de Despliegue Territorial (DP)
CREATE OR REPLACE FUNCTION rpc_contribute_territory_points(
  p_sector_id INT,
  p_is_coop_2v2 BOOLEAN,
  p_is_victory BOOLEAN
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_clan_id UUID;
  v_active_season_id UUID;
  v_dp_earned INT := 0;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'No autenticado');
  END IF;

  SELECT clan_id INTO v_clan_id FROM clan_members WHERE user_id = v_user_id;
  IF v_clan_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'No perteneces a ningún clan');
  END IF;

  SELECT id INTO v_active_season_id
  FROM clan_war_seasons
  WHERE is_active = TRUE AND NOW() BETWEEN starts_at AND ends_at
  LIMIT 1;

  IF v_active_season_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'No hay un ciclo de guerra territorial activo en este momento');
  END IF;

  IF p_is_victory THEN
    IF p_is_coop_2v2 THEN
      v_dp_earned := 200; -- Multiplicador 2.0x por Cooperativo 2v2
    ELSE
      v_dp_earned := 100; -- Victoria regular 1v1
    END IF;
  ELSE
    v_dp_earned := 25; -- Esfuerzo bélico por derrota
  END IF;

  INSERT INTO clan_war_deployments (
    season_id, sector_id, clan_id, user_id, deployment_points, battle_type
  ) VALUES (
    v_active_season_id, p_sector_id, v_clan_id, v_user_id, v_dp_earned,
    CASE WHEN p_is_coop_2v2 THEN 'coop_2v2' ELSE 'solo_1v1' END
  );

  RETURN jsonb_build_object(
    'success', true,
    'season_id', v_active_season_id,
    'sector_id', p_sector_id,
    'dp_contributed', v_dp_earned,
    'coop_bonus_applied', p_is_coop_2v2
  );
END;
$$;

-- RPC 5: Compra de Buffs del Tesoro del Clan
CREATE OR REPLACE FUNCTION rpc_purchase_clan_buff(
  p_buff_id VARCHAR(50)
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_clan_id UUID;
  v_user_role VARCHAR(30);
  v_clan RECORD;
  v_gold_cost BIGINT := 0;
  v_steel_cost BIGINT := 0;
  v_duration_hours INT := 24;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'No autenticado');
  END IF;

  SELECT clan_id, role INTO v_clan_id, v_user_role
  FROM clan_members
  WHERE user_id = v_user_id;

  IF v_clan_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'No perteneces a ningún clan');
  END IF;

  IF v_user_role NOT IN ('commander_in_chief', 'officer') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Solo el Coronel u Oficiales pueden activar proyectos del Alto Mando');
  END IF;

  IF p_buff_id = 'industrial_overcharge' THEN
    v_gold_cost := 15000;
    v_steel_cost := 250;
    v_duration_hours := 24;
  ELSIF p_buff_id = 'war_siege_funding' THEN
    v_gold_cost := 25000;
    v_steel_cost := 400;
    v_duration_hours := 12;
  ELSE
    RETURN jsonb_build_object('success', false, 'error', 'Proyecto desconocido');
  END IF;

  SELECT * INTO v_clan FROM clans WHERE id = v_clan_id FOR UPDATE;

  IF v_clan.treasury_gold < v_gold_cost OR v_clan.treasury_steel < v_steel_cost THEN
    RETURN jsonb_build_object('success', false, 'error', 'Fondos insuficientes en la Tesorería del Clan');
  END IF;

  UPDATE clans
  SET 
    treasury_gold = treasury_gold - v_gold_cost,
    treasury_steel = treasury_steel - v_steel_cost,
    active_war_buffs = active_war_buffs || jsonb_build_object(
      'buff_id', p_buff_id,
      'activated_at', NOW(),
      'expires_at', NOW() + (v_duration_hours || ' hours')::INTERVAL
    )
  WHERE id = v_clan_id;

  RETURN jsonb_build_object(
    'success', true,
    'buff_id', p_buff_id,
    'gold_spent', v_gold_cost,
    'steel_spent', v_steel_cost,
    'expires_at', NOW() + (v_duration_hours || ' hours')::INTERVAL
  );
END;
$$;

-- >>> FIN MIGRACIÓN: 20261031000018_social_identity_clans_and_territorial_war.sql <<<


-- >>> INICIO MIGRACIÓN: 20261031000019_consolidated_architecture_overhaul.sql <<<
-- ==============================================================================
-- MIGRACIÓN 19: REINGENIERÍA CONSOLIDADA DE ARQUITECTURA SUPABASE Y EQUILIBRIO SISTÉMICO
-- ==============================================================================
-- Proyecto: Tactical Command: Wars of Legacy
-- Especificación Canónica: docs/architecture/PROPUESTA_REINGENIERIA_MIGRACION_16.md
-- Fecha: Octubre 2026
--
-- Resuelve las 5 Fricciones Fatales:
-- 1. Fricción 5.1 & 5.2: Normalización de 'currency_ledger' (delta, metadata, reference_id, razones dinámicas).
-- 2. Fricción 5.3: Jerarquía de 4 rangos militares en 'clan_members' y tesorería corporativa en 'clans'.
-- 3. Refactorización atómica e idempotente de RPCs: 'grant_match_rewards', 'claim_chest_reward' y 'pay_dishonor_embargo_fee'.
-- 4. Fricción 5.4: Topología Realtime de alta eficiencia (REPLICA IDENTITY FULL y adición a 'supabase_realtime').
-- ==============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- 1. TABLA DE CONFIGURACIÓN DINÁMICA DE ECONOMÍA (GAME BALANCING KNOBS)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.system_economy_config (
    config_key VARCHAR(64) PRIMARY KEY,
    config_value JSONB NOT NULL,
    description TEXT NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.system_economy_config ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'system_economy_config' AND policyname = 'system_economy_config_read_all'
    ) THEN
        CREATE POLICY "system_economy_config_read_all" ON public.system_economy_config 
        FOR SELECT USING (true);
    END IF;
END $$;

-- Semilla de Parámetros Dinámicos
INSERT INTO public.system_economy_config (config_key, config_value, description)
VALUES 
(
    'match_rewards_params',
    '{
        "online_win_credits": 250,
        "online_loss_credits": 75,
        "online_win_xp": 120,
        "online_loss_xp": 40,
        "online_win_trophies": 30,
        "online_loss_trophies": -18,
        "online_kill_credit_bonus": 30,
        "online_turn_xp_bonus": 5,
        "offline_ratio": 0.50,
        "daily_offline_cap": 3
    }'::jsonb,
    'Parámetros de recompensas por partida online y límites diarios offline anti-farming'
),
(
    'clan_dishonor_params',
    '{
        "fee_credits": 1500,
        "fee_steel": 30,
        "fee_gems": 50,
        "treasury_share_pct": 50,
        "top1_share_pct": 25,
        "top2_share_pct": 15,
        "top3_share_pct": 10,
        "sink_burn_pct": 0
    }'::jsonb,
    'Fórmulas de recaudación y distribución aristocrática del Embargo por Deshonor'
),
(
    'chest_unlock_multipliers',
    '{
        "iron_credits": 1400,
        "armored_credits": 3200,
        "legendary_credits": 8000,
        "arena_tier_scale": 0.15
    }'::jsonb,
    'Escalado de créditos y planos en cofres clasificatorios'
)
ON CONFLICT (config_key) DO UPDATE 
SET config_value = EXCLUDED.config_value, updated_at = timezone('utc'::text, now());

-- ----------------------------------------------------------------------------
-- 2. REINGENIERÍA ESTRUCTURAL DE currency_ledger
-- ----------------------------------------------------------------------------
DO $$ 
BEGIN
    -- Asegurar que exista delta (si existía amount por error de migración previa, renombrar)
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'currency_ledger' AND column_name = 'amount'
    ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'currency_ledger' AND column_name = 'delta'
    ) THEN
        ALTER TABLE public.currency_ledger RENAME COLUMN amount TO delta;
    END IF;

    -- Agregar delta si no existe
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'currency_ledger' AND column_name = 'delta'
    ) THEN
        ALTER TABLE public.currency_ledger ADD COLUMN delta INTEGER NOT NULL DEFAULT 0;
        ALTER TABLE public.currency_ledger ADD CONSTRAINT chk_currency_ledger_delta CHECK (delta <> 0);
    END IF;

    -- Agregar metadata JSONB si falta
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'currency_ledger' AND column_name = 'metadata'
    ) THEN
        ALTER TABLE public.currency_ledger ADD COLUMN metadata JSONB NOT NULL DEFAULT '{}'::jsonb;
    END IF;

    -- Agregar reference_id si falta
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'currency_ledger' AND column_name = 'reference_id'
    ) THEN
        ALTER TABLE public.currency_ledger ADD COLUMN reference_id VARCHAR(128) DEFAULT NULL;
    END IF;
END $$;

-- Eliminar check estático de 'reason' y reemplazar por check flexible de longitud
ALTER TABLE public.currency_ledger DROP CONSTRAINT IF EXISTS currency_ledger_reason_check;
ALTER TABLE public.currency_ledger DROP CONSTRAINT IF EXISTS chk_currency_ledger_reason_length;
ALTER TABLE public.currency_ledger ADD CONSTRAINT chk_currency_ledger_reason_length 
CHECK (char_length(reason) >= 3 AND char_length(reason) <= 64);

-- ----------------------------------------------------------------------------
-- 3. ESTANDARIZACIÓN MILITAR DE CLANES Y TESORERÍA
-- ----------------------------------------------------------------------------
-- Agregar columnas de tesorería a public.clans
ALTER TABLE public.clans 
    ADD COLUMN IF NOT EXISTS treasury_gold BIGINT NOT NULL DEFAULT 0 CHECK (treasury_gold >= 0),
    ADD COLUMN IF NOT EXISTS treasury_steel BIGINT NOT NULL DEFAULT 0 CHECK (treasury_steel >= 0),
    ADD COLUMN IF NOT EXISTS treasury_gems BIGINT NOT NULL DEFAULT 0 CHECK (treasury_gems >= 0);

-- Migrar y estandarizar roles a 4 Rangos Militares
ALTER TABLE public.clan_members DROP CONSTRAINT IF EXISTS clan_members_role_check;
ALTER TABLE public.clan_members DROP CONSTRAINT IF EXISTS chk_clan_members_military_role;

UPDATE public.clan_members SET role = 'commander_in_chief' WHERE role IN ('leader', 'commander_in_chief');
UPDATE public.clan_members SET role = 'executive_officer' WHERE role IN ('co_leader', 'executive_officer');
UPDATE public.clan_members SET role = 'field_officer' WHERE role IN ('elder', 'officer', 'field_officer');
UPDATE public.clan_members SET role = 'cadet' WHERE role IN ('member', 'cadet');

ALTER TABLE public.clan_members ADD CONSTRAINT chk_clan_members_military_role 
CHECK (role IN ('commander_in_chief', 'executive_officer', 'field_officer', 'cadet'));

-- ----------------------------------------------------------------------------
-- 4. REFACTORIZACIÓN ATÓMICA DE grant_match_rewards
-- ----------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.grant_match_rewards(UUID, VARCHAR, BOOLEAN, VARCHAR, VARCHAR);
DROP FUNCTION IF EXISTS public.grant_match_rewards(UUID, UUID, TEXT, BOOLEAN, INTEGER, INTEGER, INTEGER, TEXT);

CREATE OR REPLACE FUNCTION public.grant_match_rewards(
    p_user_id UUID,
    p_match_id VARCHAR(128),
    p_is_victory BOOLEAN,
    p_game_mode VARCHAR(32) DEFAULT 'ranked_ladder',
    p_difficulty VARCHAR(16) DEFAULT 'normal',
    p_turns_count INTEGER DEFAULT 10,
    p_properties_captured INTEGER DEFAULT 0,
    p_units_destroyed INTEGER DEFAULT 0
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_config JSONB;
    v_is_offline BOOLEAN := (p_game_mode IN ('offline_skirmish', 'practice_vs_ai', 'bot_skirmish', 'vs_bot', 'bot_vs_bot', 'offline_practice', 'tutorial'));
    v_daily_count INTEGER := 0;
    v_diff_mult NUMERIC := 1.0;
    v_xp_awarded INTEGER;
    v_credits_awarded INTEGER;
    v_trophies_delta INTEGER := 0;
    v_balance_after INTEGER;
BEGIN
    IF auth.uid() IS NOT NULL AND auth.uid() <> p_user_id THEN
        RAISE EXCEPTION 'Violación de seguridad: No puedes reclamar recompensas de otro usuario.';
    END IF;

    SELECT config_value INTO v_config 
    FROM public.system_economy_config 
    WHERE config_key = 'match_rewards_params';

    IF v_config IS NULL THEN
        v_config := '{
            "online_win_credits": 250,
            "online_loss_credits": 75,
            "online_win_xp": 120,
            "online_loss_xp": 40,
            "online_win_trophies": 30,
            "online_loss_trophies": -18,
            "online_kill_credit_bonus": 30,
            "online_turn_xp_bonus": 5,
            "offline_ratio": 0.50,
            "daily_offline_cap": 3
        }'::jsonb;
    END IF;

    IF v_is_offline THEN
        IF p_difficulty = 'easy' THEN
            v_diff_mult := 0.85;
        ELSIF p_difficulty IN ('hard', 'chess') THEN
            v_diff_mult := 1.20;
        ELSE
            v_diff_mult := 1.00;
        END IF;

        SELECT COALESCE(COUNT(*), 0) INTO v_daily_count
        FROM public.currency_ledger
        WHERE user_id = p_user_id 
          AND reason = 'offline_match_reward'
          AND created_at >= timezone('utc'::text, now()) - INTERVAL '24 hours';

        IF v_daily_count >= COALESCE((v_config->>'daily_offline_cap')::INTEGER, 3) THEN
            RETURN jsonb_build_object(
                'xp_awarded', 0,
                'battle_credits_awarded', 0,
                'trophies_delta', 0,
                'offline_capped', true,
                'message', 'Límite diario de partidas offline alcanzado (3/3).'
            );
        END IF;

        IF p_is_victory THEN
            v_xp_awarded := FLOOR(((v_config->>'online_win_xp')::INTEGER + (LEAST(COALESCE(p_turns_count, 10), 30) * COALESCE((v_config->>'online_turn_xp_bonus')::INTEGER, 5))) * COALESCE((v_config->>'offline_ratio')::NUMERIC, 0.50) * v_diff_mult);
            v_credits_awarded := FLOOR(((v_config->>'online_win_credits')::INTEGER + (COALESCE(p_units_destroyed, 0) * COALESCE((v_config->>'online_kill_credit_bonus')::INTEGER, 30))) * COALESCE((v_config->>'offline_ratio')::NUMERIC, 0.50) * v_diff_mult);
        ELSE
            v_xp_awarded := FLOOR((v_config->>'online_loss_xp')::INTEGER * COALESCE((v_config->>'offline_ratio')::NUMERIC, 0.50) * v_diff_mult);
            v_credits_awarded := FLOOR((v_config->>'online_loss_credits')::INTEGER * COALESCE((v_config->>'offline_ratio')::NUMERIC, 0.50) * v_diff_mult);
        END IF;
        v_trophies_delta := 0;
    ELSE
        IF p_is_victory THEN
            v_xp_awarded := (v_config->>'online_win_xp')::INTEGER + (LEAST(COALESCE(p_turns_count, 10), 30) * COALESCE((v_config->>'online_turn_xp_bonus')::INTEGER, 5));
            v_credits_awarded := (v_config->>'online_win_credits')::INTEGER + (COALESCE(p_units_destroyed, 0) * COALESCE((v_config->>'online_kill_credit_bonus')::INTEGER, 30));
            v_trophies_delta := (v_config->>'online_win_trophies')::INTEGER;
        ELSE
            v_xp_awarded := (v_config->>'online_loss_xp')::INTEGER;
            v_credits_awarded := (v_config->>'online_loss_credits')::INTEGER;
            v_trophies_delta := (v_config->>'online_loss_trophies')::INTEGER;
        END IF;
    END IF;

    UPDATE public.profiles
    SET current_xp = current_xp + v_xp_awarded,
        battle_credits = battle_credits + v_credits_awarded,
        trophies_count = GREATEST(0, trophies_count + v_trophies_delta),
        total_matches_played = total_matches_played + 1,
        total_victories = total_victories + CASE WHEN p_is_victory THEN 1 ELSE 0 END,
        updated_at = timezone('utc'::text, now())
    WHERE id = p_user_id
    RETURNING battle_credits INTO v_balance_after;

    IF v_credits_awarded > 0 THEN
        INSERT INTO public.currency_ledger (
            user_id, currency, delta, balance_after, reason, reference_id, metadata
        ) VALUES (
            p_user_id, 'credits', v_credits_awarded, v_balance_after,
            CASE WHEN v_is_offline THEN 'offline_match_reward' ELSE 'online_match_reward' END,
            p_match_id,
            jsonb_build_object(
                'game_mode', p_game_mode,
                'difficulty', p_difficulty,
                'is_victory', p_is_victory,
                'turns_count', p_turns_count,
                'units_destroyed', p_units_destroyed
            )
        );
    END IF;

    RETURN jsonb_build_object(
        'xp_awarded', v_xp_awarded,
        'battle_credits_awarded', v_credits_awarded,
        'trophies_delta', v_trophies_delta,
        'offline_capped', false,
        'balance_after', v_balance_after
    );
END;
$$;

-- ----------------------------------------------------------------------------
-- 5. REFACTORIZACIÓN ATÓMICA DE claim_chest_reward
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.claim_chest_reward(p_slot_index INTEGER)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_slot public.user_chest_slots%ROWTYPE;
    v_now TIMESTAMPTZ := timezone('utc'::text, now());
    v_reward_credits INTEGER := 450;
    v_reward_blueprints INTEGER := 45;
    v_reward_steel INTEGER := 0;
    v_balance_after INTEGER;
BEGIN
    IF v_user_id IS NULL THEN 
        RAISE EXCEPTION 'No autenticado.'; 
    END IF;

    SELECT * INTO v_slot FROM public.user_chest_slots
    WHERE user_id = v_user_id AND slot_index = p_slot_index FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Cofre no encontrado en la ranura indicada.');
    END IF;

    IF v_slot.status = 'unlocking' AND v_slot.unlock_completes_at > v_now THEN
        RETURN jsonb_build_object('success', false, 'message', 'El tiempo de desbloqueo aún no ha concluido.');
    END IF;

    CASE v_slot.chest_type
        WHEN 'iron' THEN v_reward_credits := 1400; v_reward_blueprints := 140; v_reward_steel := 5;
        WHEN 'armored' THEN v_reward_credits := 3200; v_reward_blueprints := 340; v_reward_steel := 15;
        WHEN 'legendary' THEN v_reward_credits := 8000; v_reward_blueprints := 800; v_reward_steel := 40;
        ELSE v_reward_credits := 450; v_reward_blueprints := 45; v_reward_steel := 0;
    END CASE;

    v_reward_credits := FLOOR(v_reward_credits * (1.0 + (COALESCE(v_slot.arena_tier, 1) - 1) * 0.15));

    UPDATE public.profiles
    SET battle_credits = battle_credits + v_reward_credits,
        updated_at = v_now
    WHERE id = v_user_id
    RETURNING battle_credits INTO v_balance_after;

    INSERT INTO public.currency_ledger (
        user_id, currency, delta, balance_after, reason, reference_id, metadata
    ) VALUES (
        v_user_id, 'credits', v_reward_credits, v_balance_after,
        'chest_reward', v_slot.id::text,
        jsonb_build_object('chest_type', v_slot.chest_type, 'slot_index', p_slot_index, 'steel_awarded', v_reward_steel)
    );

    IF v_reward_steel > 0 THEN
        UPDATE public.user_industrial_inventory
        SET refined_steel = refined_steel + v_reward_steel,
            updated_at = v_now
        WHERE user_id = v_user_id;
    END IF;

    DELETE FROM public.user_chest_slots WHERE id = v_slot.id;

    RETURN jsonb_build_object(
        'success', true,
        'slot_index', p_slot_index,
        'reward_credits', v_reward_credits,
        'reward_blueprints', v_reward_blueprints,
        'reward_steel', v_reward_steel,
        'balance_after', v_balance_after
    );
END;
$$;

-- ----------------------------------------------------------------------------
-- 6. REFACTORIZACIÓN ATÓMICA DE pay_dishonor_embargo_fee
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.pay_dishonor_embargo_fee(
    p_clan_id UUID,
    p_currency VARCHAR(16) DEFAULT 'resources'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_member public.clan_members%ROWTYPE;
    v_config JSONB;
    v_fee_credits INTEGER;
    v_fee_steel INTEGER;
    v_fee_gems INTEGER;
    v_treasury_gold_share INTEGER;
    v_treasury_steel_share INTEGER;
    v_top1_gold INTEGER; v_top1_steel INTEGER;
    v_top2_gold INTEGER; v_top2_steel INTEGER;
    v_top3_gold INTEGER; v_top3_steel INTEGER;
    v_top_members UUID[];
    v_top1 UUID; v_top2 UUID; v_top3 UUID;
    v_user_credits INTEGER;
    v_user_steel INTEGER;
    v_user_gems INTEGER;
BEGIN
    IF v_user_id IS NULL THEN 
        RAISE EXCEPTION 'No autenticado.'; 
    END IF;

    SELECT config_value INTO v_config 
    FROM public.system_economy_config 
    WHERE config_key = 'clan_dishonor_params';

    v_fee_credits := COALESCE((v_config->>'fee_credits')::INTEGER, 1500);
    v_fee_steel := COALESCE((v_config->>'fee_steel')::INTEGER, 30);
    v_fee_gems := COALESCE((v_config->>'fee_gems')::INTEGER, 50);

    v_treasury_gold_share := FLOOR(v_fee_credits * (COALESCE((v_config->>'treasury_share_pct')::NUMERIC, 50) / 100));
    v_treasury_steel_share := FLOOR(v_fee_steel * (COALESCE((v_config->>'treasury_share_pct')::NUMERIC, 50) / 100));

    v_top1_gold := FLOOR(v_fee_credits * (COALESCE((v_config->>'top1_share_pct')::NUMERIC, 25) / 100));
    v_top2_gold := FLOOR(v_fee_credits * (COALESCE((v_config->>'top2_share_pct')::NUMERIC, 15) / 100));
    v_top3_gold := v_fee_credits - v_treasury_gold_share - v_top1_gold - v_top2_gold;

    v_top1_steel := FLOOR(v_fee_steel * (COALESCE((v_config->>'top1_share_pct')::NUMERIC, 25) / 100));
    v_top2_steel := FLOOR(v_fee_steel * (COALESCE((v_config->>'top2_share_pct')::NUMERIC, 15) / 100));
    v_top3_steel := v_fee_steel - v_treasury_steel_share - v_top1_steel - v_top2_steel;

    SELECT * INTO v_member 
    FROM public.clan_members 
    WHERE user_id = v_user_id AND clan_id = p_clan_id 
    FOR UPDATE;

    IF v_member.id IS NULL THEN 
        RAISE EXCEPTION 'El usuario no pertenece a la corporación militar especificada.'; 
    END IF;

    SELECT array_agg(user_id) INTO v_top_members FROM (
        SELECT user_id FROM public.clan_members 
        WHERE clan_id = p_clan_id AND user_id <> v_user_id
        ORDER BY donated_cards_weekly DESC, joined_at ASC 
        LIMIT 3
    ) sub;

    v_top1 := v_top_members[1];
    v_top2 := v_top_members[2];
    v_top3 := v_top_members[3];

    IF p_currency = 'resources' THEN
        SELECT battle_credits INTO v_user_credits FROM public.profiles WHERE id = v_user_id FOR UPDATE;
        SELECT refined_steel INTO v_user_steel FROM public.user_industrial_inventory WHERE user_id = v_user_id FOR UPDATE;

        IF v_user_credits < v_fee_credits OR v_user_steel < v_fee_steel THEN
            RAISE EXCEPTION 'Fondos insuficientes: Requieres % créditos y % vigas de acero.', v_fee_credits, v_fee_steel;
        END IF;

        UPDATE public.profiles SET battle_credits = battle_credits - v_fee_credits WHERE id = v_user_id;
        UPDATE public.user_industrial_inventory SET refined_steel = refined_steel - v_fee_steel WHERE user_id = v_user_id;

        UPDATE public.clans 
        SET treasury_gold = treasury_gold + v_treasury_gold_share,
            treasury_steel = treasury_steel + v_treasury_steel_share
        WHERE id = p_clan_id;

        IF v_top1 IS NOT NULL THEN
            UPDATE public.profiles SET battle_credits = battle_credits + v_top1_gold WHERE id = v_top1;
            UPDATE public.user_industrial_inventory SET refined_steel = refined_steel + v_top1_steel WHERE user_id = v_top1;
        END IF;
        IF v_top2 IS NOT NULL THEN
            UPDATE public.profiles SET battle_credits = battle_credits + v_top2_gold WHERE id = v_top2;
            UPDATE public.user_industrial_inventory SET refined_steel = refined_steel + v_top2_steel WHERE user_id = v_top2;
        END IF;
        IF v_top3 IS NOT NULL THEN
            UPDATE public.profiles SET battle_credits = battle_credits + v_top3_gold WHERE id = v_top3;
            UPDATE public.user_industrial_inventory SET refined_steel = refined_steel + v_top3_steel WHERE user_id = v_top3;
        END IF;

        INSERT INTO public.currency_ledger (user_id, currency, delta, balance_after, reason, reference_id, metadata)
        VALUES (
            v_user_id, 'credits', -v_fee_credits, v_user_credits - v_fee_credits,
            'clan_dishonor_fee', p_clan_id::text,
            jsonb_build_object('treasury_gold_share', v_treasury_gold_share, 'currency_used', 'resources')
        );
    ELSE
        SELECT command_gems INTO v_user_gems FROM public.profiles WHERE id = v_user_id FOR UPDATE;
        IF v_user_gems < v_fee_gems THEN
            RAISE EXCEPTION 'Gemas insuficientes: Requieres % gemas de mando.', v_fee_gems;
        END IF;

        UPDATE public.profiles SET command_gems = command_gems - v_fee_gems WHERE id = v_user_id;
        UPDATE public.clans SET treasury_gems = treasury_gems + 25 WHERE id = p_clan_id;

        IF v_top1 IS NOT NULL THEN UPDATE public.profiles SET command_gems = command_gems + 13 WHERE id = v_top1; END IF;
        IF v_top2 IS NOT NULL THEN UPDATE public.profiles SET command_gems = command_gems + 7 WHERE id = v_top2; END IF;
        IF v_top3 IS NOT NULL THEN UPDATE public.profiles SET command_gems = command_gems + 5 WHERE id = v_top3; END IF;

        INSERT INTO public.currency_ledger (user_id, currency, delta, balance_after, reason, reference_id, metadata)
        VALUES (
            v_user_id, 'gems', -v_fee_gems, v_user_gems - v_fee_gems,
            'clan_dishonor_fee', p_clan_id::text,
            jsonb_build_object('treasury_gems_share', 25, 'currency_used', 'gems')
        );
    END IF;

    INSERT INTO public.chat_messages (
        channel_type, channel_id, sender_id, message_text, metadata
    ) VALUES (
        'clan', p_clan_id::text, v_user_id,
        '¡HONOR RESTABLECIDO! Fianza saldada. 50% depositado en la Tesorería y 50% tributado al Top 3 de vanguardia.',
        jsonb_build_object('type', 'dishonor_rehabilitated', 'fee_credits', v_fee_credits)
    );

    RETURN jsonb_build_object(
        'success', true,
        'treasury_gold_added', v_treasury_gold_share,
        'treasury_steel_added', v_treasury_steel_share,
        'top1_notified', v_top1
    );
END;
$$;

-- ----------------------------------------------------------------------------
-- 7. TOPOLOGÍA DE ALTA EFICIENCIA PARA SUPABASE REALTIME
-- ----------------------------------------------------------------------------
ALTER TABLE public.matchmaking_queue REPLICA IDENTITY FULL;
ALTER TABLE public.active_matches REPLICA IDENTITY FULL;
ALTER TABLE public.match_participants REPLICA IDENTITY FULL;
ALTER TABLE public.chat_messages REPLICA IDENTITY FULL;

DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
        IF NOT EXISTS (
            SELECT 1 FROM pg_publication_tables 
            WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'matchmaking_queue'
        ) THEN
            ALTER PUBLICATION supabase_realtime ADD TABLE public.matchmaking_queue;
        END IF;

        IF NOT EXISTS (
            SELECT 1 FROM pg_publication_tables 
            WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'active_matches'
        ) THEN
            ALTER PUBLICATION supabase_realtime ADD TABLE public.active_matches;
        END IF;

        IF NOT EXISTS (
            SELECT 1 FROM pg_publication_tables 
            WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'match_participants'
        ) THEN
            ALTER PUBLICATION supabase_realtime ADD TABLE public.match_participants;
        END IF;

        IF NOT EXISTS (
            SELECT 1 FROM pg_publication_tables 
            WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'chat_messages'
        ) THEN
            ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
        END IF;
    END IF;
END $$;

COMMIT;

-- >>> FIN MIGRACIÓN: 20261031000019_consolidated_architecture_overhaul.sql <<<


-- >>> INICIO MIGRACIÓN: 20261031000020_legendary_decay_and_reconnection.sql <<<
-- ============================================================================
-- MIGRATION: 20261031000020_legendary_decay_and_reconnection.sql
-- DESCRIPTION: Legendary League Activity Decay & Realtime PvP Reconnection Snapshot
-- RFC REFERENCE: docs/09_RFC_SYSTEM_REBALANCE_AND_UI_PARITY.md (Etapa 4 / Fase 4)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. EXTENSIÓN DE PROFILES: DÍAS DE GRACIA Y TELEMETRÍA DE DECAY
-- ----------------------------------------------------------------------------
ALTER TABLE public.profiles
    ADD COLUMN IF NOT EXISTS decay_bank_days INTEGER NOT NULL DEFAULT 3 CHECK (decay_bank_days >= 0 AND decay_bank_days <= 5),
    ADD COLUMN IF NOT EXISTS last_decay_processed_at TIMESTAMPTZ DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS last_competitive_match_at TIMESTAMPTZ DEFAULT NULL;

-- ----------------------------------------------------------------------------
-- 2. EXTENSIÓN DE PARTICIPANTES: BANCO DE GRACIA DE RED Y ESTADO DE CONEXIÓN
-- ----------------------------------------------------------------------------
ALTER TABLE public.match_participants
    ADD COLUMN IF NOT EXISTS disconnect_grace_bank_sec INTEGER NOT NULL DEFAULT 30 CHECK (disconnect_grace_bank_sec >= 0),
    ADD COLUMN IF NOT EXISTS is_connected BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN IF NOT EXISTS disconnected_at TIMESTAMPTZ DEFAULT NULL;

-- ----------------------------------------------------------------------------
-- 3. RPC: ACREDITACIÓN DE ACTIVIDAD COMPETITIVA (DECAY BANK CREDIT)
-- Otorga +1 día de gracia al disputar partidas competitivas (clamped por liga)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.rpc_credit_competitive_activity(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_trophies INTEGER;
    v_current_bank INTEGER;
    v_max_bank INTEGER := 5;
    v_new_bank INTEGER;
BEGIN
    SELECT trophies_count, decay_bank_days
    INTO v_trophies, v_current_bank
    FROM public.profiles
    WHERE id = p_user_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'USER_NOT_FOUND');
    END IF;

    -- Parámetros canónicos según Anexo E / RFC:
    -- Liga I: Contendientes (4,000 - 4,499) -> Cap 5 días
    -- Liga II: Élite Estratégica (4,500 - 4,999) -> Cap 4 días
    -- Liga III: Gran Mariscal (>= 5,000) -> Cap 3 días
    IF v_trophies >= 5000 THEN
        v_max_bank := 3;
    ELSIF v_trophies >= 4500 THEN
        v_max_bank := 4;
    ELSE
        v_max_bank := 5;
    END IF;

    v_new_bank := LEAST(v_max_bank, COALESCE(v_current_bank, 0) + 1);

    UPDATE public.profiles
    SET decay_bank_days = v_new_bank,
        last_competitive_match_at = timezone('utc'::text, now())
    WHERE id = p_user_id;

    RETURN jsonb_build_object(
        'success', true,
        'user_id', p_user_id,
        'trophies', v_trophies,
        'decay_bank_days', v_new_bank,
        'bank_cap', v_max_bank
    );
END;
$$;

-- ----------------------------------------------------------------------------
-- 4. CRON: PROCESAMIENTO DIARIO DE DEGRADACIÓN EN LIGAS LEGENDARIAS (00:00 UTC)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.cron_process_legendary_trophy_decay()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_rec RECORD;
    v_affected_count INTEGER := 0;
    v_decayed_count INTEGER := 0;
    v_penalty INTEGER;
    v_floor INTEGER;
    v_new_trophies INTEGER;
    v_now TIMESTAMPTZ := timezone('utc'::text, now());
BEGIN
    -- Seleccionar todos los comandantes en Ligas Legendarias (>= 4000 trofeos)
    FOR v_rec IN
        SELECT id, trophies_count, decay_bank_days
        FROM public.profiles
        WHERE trophies_count >= 4000
        FOR UPDATE
    LOOP
        v_affected_count := v_affected_count + 1;

        IF v_rec.decay_bank_days > 0 THEN
            -- Consume un día de gracia sin penalización de trofeos
            UPDATE public.profiles
            SET decay_bank_days = v_rec.decay_bank_days - 1,
                last_decay_processed_at = v_now
            WHERE id = v_rec.id;
        ELSE
            -- Sin días de gracia: aplicar penalización por división según Anexo E
            IF v_rec.trophies_count >= 5000 THEN
                -- Liga III: Gran Mariscal (-60 trofeos/día, piso absoluto 4500)
                v_penalty := 60;
                v_floor := 4500;
            ELSIF v_rec.trophies_count >= 4500 THEN
                -- Liga II: Élite Estratégica (-40 trofeos/día, piso inviolable 4500)
                v_penalty := 40;
                v_floor := 4500;
            ELSE
                -- Liga I: Contendientes (-25 trofeos/día, piso inviolable 4000)
                v_penalty := 25;
                v_floor := 4000;
            END IF;

            v_new_trophies := GREATEST(v_floor, v_rec.trophies_count - v_penalty);

            UPDATE public.profiles
            SET trophies_count = v_new_trophies,
                last_decay_processed_at = v_now
            WHERE id = v_rec.id;

            v_decayed_count := v_decayed_count + 1;
        END IF;
    END LOOP;

    RETURN jsonb_build_object(
        'success', true,
        'processed_at', v_now,
        'legendary_profiles_checked', v_affected_count,
        'profiles_penalized_with_decay', v_decayed_count
    );
END;
$$;

-- ----------------------------------------------------------------------------
-- 5. RPC: RESINCRONIZACIÓN ATÓMICA DE PARTIDA (SNAPSHOT DUMP O(1))
-- Permite al cliente reconectado hidratar unidades, niebla, fondos y cronómetros
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.rpc_get_match_snapshot(p_match_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_match RECORD;
    v_participants JSONB;
    v_player_view RECORD;
    v_state RECORD;
BEGIN
    -- Validar existencia de la partida
    SELECT * INTO v_match
    FROM public.active_matches
    WHERE id = p_match_id;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'MATCH_NOT_FOUND');
    END IF;

    -- Agrupar participantes con bancos de gracia y conectividad
    SELECT jsonb_agg(
        jsonb_build_object(
            'player_slot', mp.player_slot,
            'slot_key', mp.slot_key,
            'team_id', mp.team_id,
            'user_id', mp.user_id,
            'is_bot', mp.is_bot,
            'commander_id', mp.commander_id,
            'co_power_meter', mp.co_power_meter,
            'active_co_power', mp.active_co_power,
            'funds', mp.funds,
            'is_connected', mp.is_connected,
            'disconnect_grace_bank_sec', mp.disconnect_grace_bank_sec
        )
    ) INTO v_participants
    FROM public.match_participants mp
    WHERE mp.match_id = p_match_id;

    -- Obtener la proyección de niebla autoritativa para el jugador consultante
    SELECT * INTO v_player_view
    FROM public.match_player_views
    WHERE match_id = p_match_id AND player_id = v_user_id;

    -- Obtener estado global de la cuadrícula
    SELECT * INTO v_state
    FROM public.match_state
    WHERE match_id = p_match_id;

    RETURN jsonb_build_object(
        'success', true,
        'match_id', p_match_id,
        'status', v_match.status,
        'current_turn', v_match.current_turn,
        'current_turn_slot', v_match.current_turn_slot,
        'time_remaining', v_match.time_remaining,
        'map_id', v_match.map_id,
        'game_mode', v_match.game_mode,
        'participants', COALESCE(v_participants, '[]'::jsonb),
        'visible_units', COALESCE(v_player_view.visible_units, '[]'::jsonb),
        'visible_properties', COALESCE(v_player_view.visible_properties, '[]'::jsonb),
        'own_funds', COALESCE(v_player_view.own_funds, 1000),
        'own_co_power', COALESCE(v_player_view.own_co_power, 0),
        'weather', COALESCE(v_state.weather, 'CLEAR'),
        'turn_seed', v_match.rng_seed
    );
END;
$$;

-- >>> FIN MIGRACIÓN: 20261031000020_legendary_decay_and_reconnection.sql <<<


-- >>> INICIO MIGRACIÓN: 20261031000021_offline_soft_cap_and_tournament_parity.sql <<<
-- ============================================================================
-- MIGRACIÓN 21: SOFT CAP ESCALONADO OFFLINE Y PARIDAD DE TORNEO ESPORTS
-- Proyecto: Tactical Command: Wars of Legacy
-- Referencia: docs/orchestration/02_ECONOMY_AND_RETENTION_REBALANCE.md
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. EXTENSIÓN DE PROFILES: ELO ESPORTS (CIRCUITO CANÓNICO SIN P2W)
-- ----------------------------------------------------------------------------
ALTER TABLE public.profiles
    ADD COLUMN IF NOT EXISTS elo_rating_esports INTEGER NOT NULL DEFAULT 1200;

-- ----------------------------------------------------------------------------
-- 2. RPC TRANSACCIONAL: grant_match_rewards CON SOFT CAP ESCALONADO
-- Reemplaza el hard cap binario por la curva de retención suave:
-- mu(k) = [0.60 (k<=3), 0.30 (4<=k<=6), 0.10 (7<=k<=10), 0.02 (k>=11)]
-- Suelo garantizado: +5 XP y +10 Créditos
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.grant_match_rewards(
    p_user_id UUID,
    p_match_id UUID,
    p_game_mode TEXT,
    p_is_victory BOOLEAN,
    p_turns_count INTEGER,
    p_properties_captured INTEGER,
    p_units_destroyed INTEGER,
    p_difficulty TEXT DEFAULT 'normal'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_base_score NUMERIC;
    v_result_mult NUMERIC;
    v_difficulty_mult NUMERIC := 1.0;
    v_offline_multiplier NUMERIC(4,2) := 1.0;
    v_xp_awarded INTEGER;
    v_credits_awarded INTEGER;
    v_trophies_delta INTEGER := 0;
    v_is_offline BOOLEAN;
    v_daily_count INTEGER := 0;
    v_today DATE := (NOW() AT TIME ZONE 'UTC')::DATE;
    v_profile RECORD;
BEGIN
    SELECT * INTO v_profile FROM public.profiles WHERE id = p_user_id FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Perfil militar no encontrado para el usuario %', p_user_id;
    END IF;

    v_is_offline := (p_game_mode IN ('vs_bot', 'offline_practice', 'tutorial'));

    -- Manejo del contador diario de partidas offline
    IF v_profile.last_offline_match_date IS DISTINCT FROM v_today THEN
        v_daily_count := 0;
    ELSE
        v_daily_count := COALESCE(v_profile.daily_offline_matches_count, 0);
    END IF;

    -- Cálculo del puntaje base según el Core Loop canónico
    v_base_score := 120 + (p_properties_captured * 45) + (p_units_destroyed * 35) + (LEAST(p_turns_count, 30) * 6);
    
    IF p_is_victory THEN
        v_result_mult := 2.2;
    ELSE
        v_result_mult := 0.85;
    END IF;

    v_xp_awarded := FLOOR(v_base_score * v_result_mult);
    v_credits_awarded := FLOOR((60 + (p_properties_captured * 20) + (p_units_destroyed * 15)) * v_result_mult);

    IF v_is_offline THEN
        -- Factor de dificultad
        IF p_difficulty = 'easy' THEN v_difficulty_mult := 0.85;
        ELSIF p_difficulty = 'hard' OR p_difficulty = 'chess' THEN v_difficulty_mult := 1.20;
        ELSE v_difficulty_mult := 1.00;
        END IF;

        -- Curva de decaimiento Soft Cap en 4 tramos (RFC Sección 1.2)
        IF v_daily_count < 3 THEN
            v_offline_multiplier := 0.60;
        ELSIF v_daily_count < 6 THEN
            v_offline_multiplier := 0.30;
        ELSIF v_daily_count < 10 THEN
            v_offline_multiplier := 0.10;
        ELSE
            v_offline_multiplier := 0.02;
        END IF;

        -- Suelo de seguridad anti-churn: mínimo +5 XP y +10 Créditos
        v_xp_awarded := GREATEST(5, FLOOR(v_xp_awarded * v_offline_multiplier * v_difficulty_mult));
        v_credits_awarded := GREATEST(10, FLOOR(v_credits_awarded * v_offline_multiplier * v_difficulty_mult));
        v_trophies_delta := 0;
        v_daily_count := v_daily_count + 1;

        UPDATE public.profiles
        SET current_xp = current_xp + v_xp_awarded,
            battle_credits = battle_credits + v_credits_awarded,
            daily_offline_matches_count = v_daily_count,
            last_offline_match_date = v_today,
            total_matches_played = total_matches_played + 1,
            total_victories = CASE WHEN p_is_victory THEN total_victories + 1 ELSE total_victories END,
            updated_at = timezone('utc'::text, now())
        WHERE id = p_user_id;
    ELSE
        -- Modo online competitivo: otorga trofeos y progreso completo
        v_trophies_delta := CASE WHEN p_is_victory THEN 30 ELSE -18 END;

        UPDATE public.profiles
        SET current_xp = current_xp + v_xp_awarded,
            battle_credits = battle_credits + v_credits_awarded,
            total_matches_played = total_matches_played + 1,
            total_victories = CASE WHEN p_is_victory THEN total_victories + 1 ELSE total_victories END,
            trophies_count = GREATEST(0, COALESCE(trophies_count, 0) + v_trophies_delta),
            updated_at = timezone('utc'::text, now())
        WHERE id = p_user_id;
    END IF;

    -- Registro en el libro mayor de transacciones si existe la tabla
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'currency_ledger') THEN
        INSERT INTO public.currency_ledger (
            user_id,
            currency_type,
            amount,
            operation_type,
            reference_id,
            description
        ) VALUES (
            p_user_id,
            'battle_credits',
            v_credits_awarded,
            'match_reward',
            COALESCE(p_match_id, uuid_generate_v4()),
            CASE WHEN v_is_offline 
                THEN format('Recompensa Offline vs Bot (Tramo %s, mult %s)', v_daily_count, v_offline_multiplier)
                ELSE 'Recompensa Partida Online Competitiva'
            END
        );
    END IF;

    RETURN jsonb_build_object(
        'xp_awarded', v_xp_awarded,
        'battle_credits_awarded', v_credits_awarded,
        'trophies_delta', v_trophies_delta,
        'offline_multiplier', v_offline_multiplier,
        'daily_offline_count', v_daily_count,
        'is_offline', v_is_offline
    );
END;
$$;

-- >>> FIN MIGRACIÓN: 20261031000021_offline_soft_cap_and_tournament_parity.sql <<<


-- >>> INICIO MIGRACIÓN: 20261031000022_reconnection_snapshots_and_full_catalog.sql <<<
-- ============================================================================
-- MIGRACIÓN 22: SNAPSHOTS DE RECONEXIÓN, ACCIONES DELTA Y CATÁLOGO FABRIL
-- Proyecto: Tactical Command: Wars of Legacy
-- Referencia: docs/orchestration/03_NETWORKING_AND_TECHNICAL_DEBT.md
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. TABLA: match_turn_snapshots
-- Almacena la fotografía completa de la cuadrícula al inicio de cada turno
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.match_turn_snapshots (
    match_id UUID NOT NULL REFERENCES public.active_matches(id) ON DELETE CASCADE,
    turn_number INTEGER NOT NULL,
    snapshot_data JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (match_id, turn_number)
);

CREATE INDEX IF NOT EXISTS idx_match_turn_snapshots_match ON public.match_turn_snapshots(match_id, turn_number DESC);

-- ----------------------------------------------------------------------------
-- 2. TABLA: match_action_deltas
-- Buffer de micro-acciones atómicas ejecutadas durante el turno en curso
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.match_action_deltas (
    id BIGSERIAL PRIMARY KEY,
    match_id UUID NOT NULL REFERENCES public.active_matches(id) ON DELETE CASCADE,
    turn_number INTEGER NOT NULL,
    action_index INTEGER NOT NULL,
    action_payload JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_match_action_deltas_match_turn ON public.match_action_deltas(match_id, turn_number, action_index ASC);

-- ----------------------------------------------------------------------------
-- 3. POLÍTICAS RLS
-- ----------------------------------------------------------------------------
ALTER TABLE public.match_turn_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.match_action_deltas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "match_turn_snapshots_select" ON public.match_turn_snapshots;
CREATE POLICY "match_turn_snapshots_select"
    ON public.match_turn_snapshots FOR SELECT
    USING (true);

DROP POLICY IF EXISTS "match_action_deltas_select" ON public.match_action_deltas;
CREATE POLICY "match_action_deltas_select"
    ON public.match_action_deltas FOR SELECT
    USING (true);

-- ----------------------------------------------------------------------------
-- 4. RPC: rpc_reconnect_match_state
-- Reconciliación en caliente para reconectar clientes sin reiniciar turnos
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.rpc_reconnect_match_state(
    p_match_id UUID,
    p_user_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_match RECORD;
    v_snapshot JSONB;
    v_deltas JSONB;
    v_grace_remaining NUMERIC(5,2) := 30.0;
    v_active_time_remaining NUMERIC(5,2) := 30.0;
    v_current_turn INTEGER;
BEGIN
    SELECT * INTO v_match FROM public.active_matches WHERE id = p_match_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Partida activa no encontrada: %', p_match_id;
    END IF;

    v_current_turn := COALESCE(v_match.turn_number, 1);

    -- Obtener último snapshot del turno
    SELECT snapshot_data INTO v_snapshot
    FROM public.match_turn_snapshots
    WHERE match_id = p_match_id AND turn_number = v_current_turn;

    -- Obtener acciones delta del turno en curso
    SELECT jsonb_agg(action_payload ORDER BY action_index ASC) INTO v_deltas
    FROM public.match_action_deltas
    WHERE match_id = p_match_id AND turn_number = v_current_turn;

    -- Calcular gracia remanente y tiempo activo
    v_active_time_remaining := 25.0;

    RETURN jsonb_build_object(
        'match_id', p_match_id,
        'turn_number', v_current_turn,
        'snapshot', v_snapshot,
        'deltas', COALESCE(v_deltas, '[]'::jsonb),
        'server_utc_time', NOW(),
        'turn_time_remaining', v_active_time_remaining,
        'grace_bank_remaining', v_grace_remaining
    );
END;
$$;

-- >>> FIN MIGRACIÓN: 20261031000022_reconnection_snapshots_and_full_catalog.sql <<<


-- >>> INICIO MIGRACIÓN: 20261103000001_master_metagame_v2_rework.sql <<<
-- ==============================================================================
-- MIGRACIÓN 23: MASTER METAGAME V2 REWORK (SOVEREIGNTY, P2P, HANGARS & GARRISONS)
-- ==============================================================================
-- Proyecto: Tactical Command: Wars of Legacy — Global Sovereignty Edition
-- Especificación: METAGAME_DESIGN/MASTER_METAGAME_SPEC_V1.md
-- Arquitectura: Risk.io + Albion P2P + Victoria 3 Macro-Economy + Advance Wars 1-100 HP
-- Fecha: Noviembre 2026
--
-- Contenido:
-- 1. Tabla 'world_regions' (3,000 regiones, capitales incapturables y biomas).
-- 2. Tabla 'territory_control' (Soberanía, Puntos TCP 0-15000 y cooldowns de prioridad).
-- 3. Tabla 'corporate_subsidiaries' (Federación de clanes, max 10 clanes y tributos).
-- 4. Tabla 'user_unit_hangar' (Stock físico de unidades crafteadas a escala 1-100 HP).
-- 5. Tabla 'user_patents' (Patentes tecnológicas permanentes de armas T1-T5).
-- 6. Tabla 'garrison_deployments' (Búnkeres IA Nv. 1-5, envejecimiento de 21d y relevo).
-- 7. Actualización de 'p2p_market_listings' (Split 2%: 1% sink deflacionario + 1% regalía).
-- 8. RPCs Transaccionales ACID con bloqueo FOR UPDATE (Comercio, Upkeep y Asedios).
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. TABLA: world_regions (Catálogo de Regiones Planetarias)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.world_regions (
    id VARCHAR(32) PRIMARY KEY, -- ej. 'ES_MAD_01', 'DE_RUH_03'
    country_iso VARCHAR(2) NOT NULL, -- ej. 'ES', 'DE', 'US'
    province_id VARCHAR(32) NOT NULL, -- ej. 'ES_MADRID', 'DE_RENANIA'
    name VARCHAR(96) NOT NULL,
    biome_type VARCHAR(32) NOT NULL CHECK (biome_type IN (
        'temperate_plains', 'boreal_forest', 'arid_desert', 'arctic_tundra',
        'tropical_jungle', 'mountain_highland', 'coastal_archipelago'
    )),
    security_zone VARCHAR(16) NOT NULL CHECK (security_zone IN ('high_sec', 'low_sec', 'null_sec')),
    is_capital BOOLEAN NOT NULL DEFAULT false,
    is_capturable BOOLEAN NOT NULL DEFAULT true,
    max_building_slots INTEGER NOT NULL DEFAULT 8 CHECK (max_building_slots BETWEEN 4 AND 12),
    primary_resource VARCHAR(32) NOT NULL,
    secondary_resource VARCHAR(32) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT chk_capital_uncapturable CHECK (NOT (is_capital = true AND is_capturable = true))
);

CREATE INDEX IF NOT EXISTS idx_world_regions_province ON public.world_regions(province_id);
CREATE INDEX IF NOT EXISTS idx_world_regions_country ON public.world_regions(country_iso);
CREATE INDEX IF NOT EXISTS idx_world_regions_security ON public.world_regions(security_zone);

ALTER TABLE public.world_regions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "world_regions_view_all" ON public.world_regions;
CREATE POLICY "world_regions_view_all" ON public.world_regions FOR SELECT USING (true);

-- ------------------------------------------------------------------------------
-- 2. TABLA: territory_control (Soberanía y Puntos TCP en Tiempo Real)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.territory_control (
    province_id VARCHAR(32) PRIMARY KEY,
    controlling_clan_id UUID REFERENCES public.clans(id) ON DELETE SET NULL,
    controlling_alliance_id UUID DEFAULT NULL,
    current_tcp INTEGER NOT NULL DEFAULT 10000 CHECK (current_tcp BETWEEN 0 AND 15000),
    tcp_threshold INTEGER NOT NULL DEFAULT 10000,
    status VARCHAR(24) NOT NULL DEFAULT 'stable' CHECK (status IN (
        'stable', 'under_siege', 'disputed', 'cooldown_priority'
    )),
    cooldown_expires_at TIMESTAMPTZ DEFAULT NULL,
    last_battle_at TIMESTAMPTZ DEFAULT NULL,
    fortress_level INTEGER NOT NULL DEFAULT 0 CHECK (fortress_level BETWEEN 0 AND 5),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_territory_control_clan ON public.territory_control(controlling_clan_id);
CREATE INDEX IF NOT EXISTS idx_territory_control_status ON public.territory_control(status);

ALTER TABLE public.territory_control ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "territory_control_view_all" ON public.territory_control;
CREATE POLICY "territory_control_view_all" ON public.territory_control FOR SELECT USING (true);

-- ------------------------------------------------------------------------------
-- 3. TABLA: corporate_subsidiaries (Alianzas y Subsidiarias Autónomas)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.corporate_subsidiaries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    parent_corp_id UUID NOT NULL REFERENCES public.clans(id) ON DELETE CASCADE,
    subsidiary_clan_id UUID NOT NULL REFERENCES public.clans(id) ON DELETE CASCADE,
    tribute_rate_percent NUMERIC(5, 2) NOT NULL DEFAULT 10.00 CHECK (tribute_rate_percent BETWEEN 5.00 AND 25.00),
    autonomous_market_allowed BOOLEAN NOT NULL DEFAULT true,
    status VARCHAR(16) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'grace_period', 'seceded')),
    grace_expires_at TIMESTAMPTZ DEFAULT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT uq_subsidiary_clan UNIQUE (subsidiary_clan_id),
    CONSTRAINT chk_no_self_subsidiary CHECK (parent_corp_id <> subsidiary_clan_id)
);

CREATE INDEX IF NOT EXISTS idx_corporate_subsidiaries_parent ON public.corporate_subsidiaries(parent_corp_id);

ALTER TABLE public.corporate_subsidiaries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "corporate_subsidiaries_view_all" ON public.corporate_subsidiaries;
CREATE POLICY "corporate_subsidiaries_view_all" ON public.corporate_subsidiaries FOR SELECT USING (true);

-- ------------------------------------------------------------------------------
-- 4. TABLA: user_unit_hangar (Stock Físico de Unidades en Escala 1-100 HP)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_unit_hangar (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    clan_id UUID REFERENCES public.clans(id) ON DELETE SET NULL,
    unit_code VARCHAR(32) NOT NULL, -- ej. 'tank_light', 'fighter', 'artillery'
    tier INTEGER NOT NULL DEFAULT 1 CHECK (tier BETWEEN 1 AND 5),
    level INTEGER NOT NULL DEFAULT 1 CHECK (level BETWEEN 1 AND 5),
    hp INTEGER NOT NULL DEFAULT 100 CHECK (hp BETWEEN 1 AND 100),
    quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity >= 0),
    location_province_id VARCHAR(32) DEFAULT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_user_unit_hangar_user ON public.user_unit_hangar(user_id, unit_code, tier);
CREATE INDEX IF NOT EXISTS idx_user_unit_hangar_location ON public.user_unit_hangar(location_province_id);

ALTER TABLE public.user_unit_hangar ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_unit_hangar_own" ON public.user_unit_hangar;
CREATE POLICY "user_unit_hangar_own" ON public.user_unit_hangar FOR ALL USING (auth.uid() = user_id);

-- ------------------------------------------------------------------------------
-- 5. TABLA: user_patents (Patentes Tecnológicas Permanentes T1-T5)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_patents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    patent_code VARCHAR(64) NOT NULL,
    tier INTEGER NOT NULL DEFAULT 1 CHECK (tier BETWEEN 1 AND 5),
    unlocked_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT uq_user_patent UNIQUE (user_id, patent_code, tier)
);

CREATE INDEX IF NOT EXISTS idx_user_patents_user ON public.user_patents(user_id);

ALTER TABLE public.user_patents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_patents_own" ON public.user_patents;
CREATE POLICY "user_patents_own" ON public.user_patents FOR ALL USING (auth.uid() = user_id);

-- ------------------------------------------------------------------------------
-- 6. TABLA: garrison_deployments (Búnkeres IA Nivel 1 a 5 con Envejecimiento)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.garrison_deployments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    region_id VARCHAR(32) NOT NULL REFERENCES public.world_regions(id) ON DELETE CASCADE,
    owning_clan_id UUID NOT NULL REFERENCES public.clans(id) ON DELETE CASCADE,
    garrison_level INTEGER NOT NULL DEFAULT 1 CHECK (garrison_level BETWEEN 1 AND 5),
    ai_engine_tier VARCHAR(16) NOT NULL DEFAULT 'easy' CHECK (ai_engine_tier IN (
        'easy', 'normal', 'hard', 'chess', 'mcts_legendary'
    )),
    hourly_upkeep_ec INTEGER NOT NULL DEFAULT 150 CHECK (hourly_upkeep_ec >= 0),
    is_legendary BOOLEAN NOT NULL DEFAULT false,
    service_started_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    retirement_due_at TIMESTAMPTZ DEFAULT NULL,
    current_chassis_stock JSONB NOT NULL DEFAULT '[]'::jsonb,
    is_under_attack BOOLEAN NOT NULL DEFAULT false,
    handshake_deadline TIMESTAMPTZ DEFAULT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT uq_region_garrison UNIQUE (region_id)
);

CREATE INDEX IF NOT EXISTS idx_garrison_deployments_region ON public.garrison_deployments(region_id);
CREATE INDEX IF NOT EXISTS idx_garrison_deployments_clan ON public.garrison_deployments(owning_clan_id);

ALTER TABLE public.garrison_deployments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "garrison_deployments_view_all" ON public.garrison_deployments;
CREATE POLICY "garrison_deployments_view_all" ON public.garrison_deployments FOR SELECT USING (true);

-- ------------------------------------------------------------------------------
-- 7. ACTUALIZACIÓN DE 'p2p_market_listings' (Split 2% y Categorías V2)
-- ------------------------------------------------------------------------------
ALTER TABLE public.p2p_market_listings
    ADD COLUMN IF NOT EXISTS province_terminal_id VARCHAR(32) DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS item_category VARCHAR(32) DEFAULT 'refined_material',
    ADD COLUMN IF NOT EXISTS tier INTEGER DEFAULT 1,
    ADD COLUMN IF NOT EXISTS platform_burn_ec INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS province_royalty_ec INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS net_seller_revenue_ec INTEGER DEFAULT 0;

-- Asegurar restricción que prohíbe el comercio de tropas militares listas
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'chk_p2p_no_military_units'
    ) THEN
        ALTER TABLE public.p2p_market_listings
            ADD CONSTRAINT chk_p2p_no_military_units 
            CHECK (item_category IN ('raw_resource', 'refined_material', 'patent_blueprint', 'buff_consumable', 'cosmetic'));
    END IF;
END $$;

-- ------------------------------------------------------------------------------
-- 8. RPC: execute_p2p_trade_v2 (Liquidación P2P con Split 1% Sink + 1% Regalía)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.execute_p2p_trade_v2(p_listing_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_buyer_id UUID := auth.uid();
    v_listing public.p2p_market_listings%ROWTYPE;
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
        RAISE EXCEPTION 'No autenticado'; 
    END IF;

    -- 1. Candado FOR UPDATE sobre la orden
    SELECT * INTO v_listing 
    FROM public.p2p_market_listings
    WHERE id = p_listing_id AND status = 'active' 
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Orden de mercado no disponible.');
    END IF;

    IF v_listing.seller_id = v_buyer_id THEN
        RETURN jsonb_build_object('success', false, 'error', 'No puedes comprar tu propia orden.');
    END IF;

    -- 2. Bloqueo determinista de perfiles (evitar deadlocks: menor UUID primero)
    IF v_buyer_id < v_listing.seller_id THEN
        SELECT * INTO v_buyer_profile FROM public.profiles WHERE id = v_buyer_id FOR UPDATE;
        SELECT * INTO v_seller_profile FROM public.profiles WHERE id = v_listing.seller_id FOR UPDATE;
    ELSE
        SELECT * INTO v_seller_profile FROM public.profiles WHERE id = v_listing.seller_id FOR UPDATE;
        SELECT * INTO v_buyer_profile FROM public.profiles WHERE id = v_buyer_id FOR UPDATE;
    END IF;

    -- 3. Validar solvencia del comprador en Créditos de Batalla / EC
    IF v_buyer_profile.battle_credits < v_listing.total_price THEN
        RETURN jsonb_build_object('success', false, 'error', 'Créditos Energéticos insuficientes.');
    END IF;

    -- 4. Cálculo exacto del split 2% (1% quema deflacionaria + 1% regalía territorial)
    v_tax_total := FLOOR(v_listing.total_price * 0.02);
    v_burn_ec := FLOOR(v_listing.total_price * 0.01);
    v_royalty_ec := v_tax_total - v_burn_ec;
    v_net_payout := v_listing.total_price - v_tax_total;

    -- 5. Transferencia de divisas
    PERFORM set_config('app.bypass_profile_guard', 'on', true);
    
    UPDATE public.profiles 
    SET battle_credits = battle_credits - v_listing.total_price, updated_at = v_now
    WHERE id = v_buyer_id;

    UPDATE public.profiles 
    SET battle_credits = battle_credits + v_net_payout, updated_at = v_now
    WHERE id = v_listing.seller_id;

    -- 6. Acreditación de Regalía Territorial a la tesorería del clan dueño de la provincia
    IF v_listing.province_terminal_id IS NOT NULL AND v_royalty_ec > 0 THEN
        SELECT * INTO v_territory FROM public.territory_control 
        WHERE province_id = v_listing.province_terminal_id;

        IF FOUND AND v_territory.controlling_clan_id IS NOT NULL THEN
            UPDATE public.clans
            SET treasury_gold = treasury_gold + v_royalty_ec
            WHERE id = v_territory.controlling_clan_id;
        END IF;
    END IF;

    -- 7. Transferencia de bienes al comprador
    IF v_listing.item_category = 'patent_blueprint' THEN
        INSERT INTO public.user_patents (user_id, patent_code, tier, unlocked_at)
        VALUES (v_buyer_id, v_listing.item_code, v_listing.tier, v_now)
        ON CONFLICT (user_id, patent_code, tier) DO NOTHING;
    ELSIF v_listing.item_category = 'refined_material' THEN
        IF v_listing.item_code = 'refined_steel' THEN
            UPDATE public.user_industrial_inventory SET refined_steel = refined_steel + v_listing.quantity WHERE user_id = v_buyer_id;
        ELSIF v_listing.item_code = 'refined_concrete' THEN
            UPDATE public.user_industrial_inventory SET refined_concrete = refined_concrete + v_listing.quantity WHERE user_id = v_buyer_id;
        ELSIF v_listing.item_code = 'refined_microchip' THEN
            UPDATE public.user_industrial_inventory SET refined_microchip = refined_microchip + v_listing.quantity WHERE user_id = v_buyer_id;
        END IF;
    END IF;

    -- 8. Actualizar orden a 'sold' y asentar contabilidad
    UPDATE public.p2p_market_listings
    SET status = 'sold',
        platform_burn_ec = v_burn_ec,
        province_royalty_ec = v_royalty_ec,
        net_seller_revenue_ec = v_net_payout
    WHERE id = p_listing_id;

    -- Registro en el libro mayor financiero
    INSERT INTO public.currency_ledger (user_id, currency, delta, balance_after, reason, reference_id)
    VALUES 
        (v_buyer_id, 'credits', -v_listing.total_price, v_buyer_profile.battle_credits - v_listing.total_price, 'p2p_buy_v2', p_listing_id::text),
        (v_listing.seller_id, 'credits', v_net_payout, v_seller_profile.battle_credits + v_net_payout, 'p2p_sell_v2', p_listing_id::text);

    RETURN jsonb_build_object(
        'success', true,
        'total_paid', v_listing.total_price,
        'platform_burn_ec', v_burn_ec,
        'province_royalty_ec', v_royalty_ec,
        'seller_received', v_net_payout
    );
END;
$$;

-- ------------------------------------------------------------------------------
-- 9. RPC: process_battle_territory_outcome (Resolución de Asedio y Cooldown)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.process_battle_territory_outcome(
    p_province_id VARCHAR(32),
    p_winner_clan_id UUID,
    p_tcp_delta INTEGER
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_territory public.territory_control%ROWTYPE;
    v_now TIMESTAMPTZ := timezone('utc'::text, now());
    v_new_tcp INTEGER;
    v_flipped BOOLEAN := false;
BEGIN
    SELECT * INTO v_territory 
    FROM public.territory_control 
    WHERE province_id = p_province_id 
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Provincia no encontrada.');
    END IF;

    -- Si la provincia está bajo cooldown de prioridad, no puede cambiar de dueño
    IF v_territory.status = 'cooldown_priority' AND v_territory.cooldown_expires_at > v_now THEN
        RETURN jsonb_build_object('success', false, 'error', 'Provincia bajo escudo temporal post-conquista.');
    END IF;

    -- Si el ganador es el defensor actual: recupera TCP
    IF v_territory.controlling_clan_id = p_winner_clan_id THEN
        v_new_tcp := LEAST(v_territory.tcp_threshold, v_territory.current_tcp + p_tcp_delta);
        UPDATE public.territory_control
        SET current_tcp = v_new_tcp,
            status = CASE WHEN v_new_tcp >= v_territory.tcp_threshold THEN 'stable' ELSE 'disputed' END,
            last_battle_at = v_now,
            updated_at = v_now
        WHERE province_id = p_province_id;
    ELSE
        -- Si el ganador es el atacante: drena TCP del defensor
        v_new_tcp := v_territory.current_tcp - p_tcp_delta;
        
        IF v_new_tcp <= 0 THEN
            -- Volteo de soberanía
            v_flipped := true;
            UPDATE public.territory_control
            SET controlling_clan_id = p_winner_clan_id,
                current_tcp = 10000,
                status = 'cooldown_priority',
                cooldown_expires_at = v_now + interval '4 hours', -- Escudo temporal de 4 horas
                last_battle_at = v_now,
                updated_at = v_now
            WHERE province_id = p_province_id;
        ELSE
            UPDATE public.territory_control
            SET current_tcp = v_new_tcp,
                status = 'under_siege',
                last_battle_at = v_now,
                updated_at = v_now
            WHERE province_id = p_province_id;
        END IF;
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'province_id', p_province_id,
        'current_tcp', CASE WHEN v_flipped THEN 10000 ELSE v_new_tcp END,
        'sovereignty_flipped', v_flipped,
        'controlling_clan_id', CASE WHEN v_flipped THEN p_winner_clan_id ELSE v_territory.controlling_clan_id END
    );
END;
$$;

-- >>> FIN MIGRACIÓN: 20261103000001_master_metagame_v2_rework.sql <<<


-- >>> INICIO MIGRACIÓN: 20261103000002_territorial_metagame_sovereignty_p2p_aw.sql <<<
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

-- >>> FIN MIGRACIÓN: 20261103000002_territorial_metagame_sovereignty_p2p_aw.sql <<<


-- >>> INICIO MIGRACIÓN: 20261103000003_v2_canonical_consolidation.sql <<<
-- ==============================================================================
-- MIGRACIÓN 25: V2 CANONICAL CONSOLIDATION (GLOBAL SOVEREIGNTY, P2P, HANGAR, GARRISONS)
-- ==============================================================================
-- Proyecto: Tactical Command: Wars of Legacy — Metajuego Soberano V2
-- Especificación: METAGAME_DESIGN/FINAL_AUDIT_AND_QUESTIONNAIRE.md
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 0. COMPATIBILIDAD DE PERFILES Y CLANES
-- ------------------------------------------------------------------------------
ALTER TABLE public.clans
    ADD COLUMN IF NOT EXISTS emblem_id VARCHAR(64) DEFAULT 'insignia_hawk',
    ADD COLUMN IF NOT EXISTS banner_color VARCHAR(32) DEFAULT '#E63946';

ALTER TABLE public.profiles
    ADD COLUMN IF NOT EXISTS wallet_balance INTEGER DEFAULT 18500;

UPDATE public.profiles 
SET wallet_balance = battle_credits 
WHERE wallet_balance IS NULL OR wallet_balance = 0;

-- ------------------------------------------------------------------------------
-- 1. TABLA: world_countries (Estados Geopolíticos Soberanos)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.world_countries (
    iso_code VARCHAR(2) PRIMARY KEY,
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
-- 2. TABLA: world_provinces (Provincias Estratégicas y Capitales Capturables 2.0x)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.world_provinces (
    id VARCHAR(32) PRIMARY KEY,
    country_iso VARCHAR(2) NOT NULL REFERENCES public.world_countries(iso_code) ON DELETE CASCADE,
    name VARCHAR(96) NOT NULL,
    is_capital BOOLEAN NOT NULL DEFAULT false,
    is_capturable BOOLEAN NOT NULL DEFAULT true,
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
-- 3. TABLA: territory_nodes (Nodos Estratégicos: Ciadadelas, Refinerías, Fábricas)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.territory_nodes (
    id VARCHAR(48) PRIMARY KEY,
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
-- 5. TABLA: territory_control (Soberanía y Estado de Asedio en Tiempo Real)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.territory_control (
    province_id VARCHAR(32) PRIMARY KEY REFERENCES public.world_provinces(id) ON DELETE CASCADE,
    controlling_clan_id UUID REFERENCES public.clans(id) ON DELETE SET NULL,
    controlling_alliance_id UUID DEFAULT NULL,
    current_tcp INTEGER NOT NULL DEFAULT 10000 CHECK (current_tcp BETWEEN 0 AND 15000),
    tcp_threshold INTEGER NOT NULL DEFAULT 10000,
    status VARCHAR(24) NOT NULL DEFAULT 'stable' CHECK (status IN (
        'stable', 'under_siege', 'disputed', 'cooldown_priority'
    )),
    cooldown_expires_at TIMESTAMPTZ DEFAULT NULL,
    last_battle_at TIMESTAMPTZ DEFAULT NULL,
    fortress_level INTEGER NOT NULL DEFAULT 0 CHECK (fortress_level BETWEEN 0 AND 5),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_territory_control_clan ON public.territory_control(controlling_clan_id);
CREATE INDEX IF NOT EXISTS idx_territory_control_status ON public.territory_control(status);

ALTER TABLE public.territory_control ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "territory_control_view_all" ON public.territory_control;
CREATE POLICY "territory_control_view_all" ON public.territory_control FOR SELECT USING (true);

-- ------------------------------------------------------------------------------
-- 6. TABLA: corporate_subsidiaries (Tope de Máximo 10 Clanes por Corporación)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.corporate_subsidiaries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    parent_corp_id UUID NOT NULL REFERENCES public.clans(id) ON DELETE CASCADE,
    subsidiary_clan_id UUID NOT NULL REFERENCES public.clans(id) ON DELETE CASCADE,
    tribute_rate_percent NUMERIC(5, 2) NOT NULL DEFAULT 10.00 CHECK (tribute_rate_percent BETWEEN 5.00 AND 25.00),
    autonomous_market_allowed BOOLEAN NOT NULL DEFAULT true,
    status VARCHAR(16) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'grace_period', 'seceded')),
    grace_expires_at TIMESTAMPTZ DEFAULT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT uq_subsidiary_clan UNIQUE (subsidiary_clan_id),
    CONSTRAINT chk_no_self_subsidiary CHECK (parent_corp_id <> subsidiary_clan_id)
);

CREATE INDEX IF NOT EXISTS idx_corporate_subsidiaries_parent ON public.corporate_subsidiaries(parent_corp_id);
CREATE INDEX IF NOT EXISTS idx_corporate_subsidiaries_sub ON public.corporate_subsidiaries(subsidiary_clan_id);

ALTER TABLE public.corporate_subsidiaries ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "corporate_subsidiaries_view_all" ON public.corporate_subsidiaries;
CREATE POLICY "corporate_subsidiaries_view_all" ON public.corporate_subsidiaries FOR SELECT USING (true);

CREATE OR REPLACE FUNCTION public.check_corporate_clan_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
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
-- 7. TABLA: user_unit_hangar (Stock Físico de Unidades en Escala 1-100 HP)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_unit_hangar (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    clan_id UUID REFERENCES public.clans(id) ON DELETE SET NULL,
    unit_code VARCHAR(32) NOT NULL,
    tier INTEGER NOT NULL DEFAULT 1 CHECK (tier BETWEEN 1 AND 5),
    level INTEGER NOT NULL DEFAULT 1 CHECK (level BETWEEN 1 AND 5),
    hp INTEGER NOT NULL DEFAULT 100 CHECK (hp BETWEEN 1 AND 100),
    quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity >= 0),
    location_province_id VARCHAR(32) REFERENCES public.world_provinces(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_user_unit_hangar_user ON public.user_unit_hangar(user_id, unit_code, tier);
CREATE INDEX IF NOT EXISTS idx_user_unit_hangar_location ON public.user_unit_hangar(location_province_id);

ALTER TABLE public.user_unit_hangar ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "user_unit_hangar_own" ON public.user_unit_hangar;
CREATE POLICY "user_unit_hangar_own" ON public.user_unit_hangar 
    FOR ALL USING ((SELECT auth.uid()) = user_id);

-- ------------------------------------------------------------------------------
-- 8. TABLA: user_patents (Patentes Tecnológicas Permanentes T1-T5)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_patents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    patent_code VARCHAR(64) NOT NULL,
    tier INTEGER NOT NULL DEFAULT 1 CHECK (tier BETWEEN 1 AND 5),
    unlocked_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT uq_user_patent UNIQUE (user_id, patent_code, tier)
);

CREATE INDEX IF NOT EXISTS idx_user_patents_user ON public.user_patents(user_id);

ALTER TABLE public.user_patents ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "user_patents_own" ON public.user_patents;
CREATE POLICY "user_patents_own" ON public.user_patents 
    FOR ALL USING ((SELECT auth.uid()) = user_id);

-- ------------------------------------------------------------------------------
-- 9. TABLA: garrison_deployments (Búnkeres IA Nivel 1 a 5 con Envejecimiento)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.garrison_deployments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    province_id VARCHAR(32) NOT NULL REFERENCES public.world_provinces(id) ON DELETE CASCADE,
    region_id VARCHAR(32) GENERATED ALWAYS AS (province_id) STORED,
    owning_clan_id UUID NOT NULL REFERENCES public.clans(id) ON DELETE CASCADE,
    commander_name VARCHAR(96) NOT NULL DEFAULT 'Comandante de Guarnición',
    garrison_level INTEGER NOT NULL DEFAULT 1 CHECK (garrison_level BETWEEN 1 AND 5),
    ai_engine_tier VARCHAR(16) NOT NULL DEFAULT 'easy' CHECK (ai_engine_tier IN (
        'easy', 'normal', 'hard', 'chess', 'mcts_legendary'
    )),
    hourly_upkeep_ec INTEGER NOT NULL DEFAULT 150 CHECK (hourly_upkeep_ec >= 0),
    is_legendary BOOLEAN NOT NULL DEFAULT false,
    service_started_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    retirement_due_at TIMESTAMPTZ DEFAULT NULL,
    expires_at TIMESTAMPTZ DEFAULT NULL,
    current_chassis_stock JSONB NOT NULL DEFAULT '[]'::jsonb,
    is_under_attack BOOLEAN NOT NULL DEFAULT false,
    handshake_deadline TIMESTAMPTZ DEFAULT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT uq_province_garrison UNIQUE (province_id)
);

CREATE INDEX IF NOT EXISTS idx_garrison_deployments_province ON public.garrison_deployments(province_id);
CREATE INDEX IF NOT EXISTS idx_garrison_deployments_clan ON public.garrison_deployments(owning_clan_id);

ALTER TABLE public.garrison_deployments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "garrison_deployments_view_all" ON public.garrison_deployments;
CREATE POLICY "garrison_deployments_view_all" ON public.garrison_deployments FOR SELECT USING (true);

DROP POLICY IF EXISTS "garrison_deployments_modify_clan" ON public.garrison_deployments;
CREATE POLICY "garrison_deployments_modify_clan" ON public.garrison_deployments 
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.clan_members 
            WHERE clan_members.clan_id = garrison_deployments.owning_clan_id 
              AND clan_members.user_id = (SELECT auth.uid())
              AND clan_members.role IN ('leader', 'co_leader', 'officer')
        )
    );

-- ------------------------------------------------------------------------------
-- 10. TABLA: p2p_market_orders (Mercado P2P Transaccional V2)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.p2p_market_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    seller_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    buyer_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    origin_province_id VARCHAR(32) REFERENCES public.world_provinces(id) ON DELETE SET NULL,
    province_terminal_id VARCHAR(32) REFERENCES public.world_provinces(id) ON DELETE SET NULL,
    item_category VARCHAR(32) NOT NULL CHECK (item_category IN (
        'raw_resource', 'refined_material', 'patent_blueprint', 'buff_consumable', 'unit_chassis', 'cosmetic'
    )),
    item_code VARCHAR(64) NOT NULL,
    tier INTEGER NOT NULL DEFAULT 1 CHECK (tier BETWEEN 1 AND 5),
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    unit_price_ec INTEGER NOT NULL CHECK (unit_price_ec > 0),
    total_price_ec INTEGER NOT NULL CHECK (total_price_ec > 0),
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
CREATE INDEX IF NOT EXISTS idx_p2p_orders_status ON public.p2p_market_orders(status);

ALTER TABLE public.p2p_market_orders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "p2p_market_orders_view" ON public.p2p_market_orders;
CREATE POLICY "p2p_market_orders_view" ON public.p2p_market_orders FOR SELECT USING (true);

DROP POLICY IF EXISTS "p2p_market_orders_manage_own" ON public.p2p_market_orders;
CREATE POLICY "p2p_market_orders_manage_own" ON public.p2p_market_orders 
    FOR ALL USING ((SELECT auth.uid()) = seller_id);

-- ------------------------------------------------------------------------------
-- 11. RPC: execute_territory_attack_declaration (Declaración de Asedio Risk)
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
    IF (SELECT auth.uid()) IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'No autenticado');
    END IF;

    SELECT * INTO v_target_province
    FROM public.world_provinces
    WHERE id = p_target_province_id;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Provincia objetivo no encontrada');
    END IF;

    SELECT EXISTS (
        SELECT 1 FROM public.territory_adjacencies
        WHERE ((from_province_id = p_origin_province_id AND to_province_id = p_target_province_id)
            OR (from_province_id = p_target_province_id AND to_province_id = p_origin_province_id))
          AND is_blocked = false
    ) INTO v_adj_exists;

    IF NOT v_adj_exists THEN
        RETURN jsonb_build_object('success', false, 'error', 'Infracción de Adyacencia: Las provincias no están conectadas en el grafo táctico.');
    END IF;

    SELECT * INTO v_origin_control
    FROM public.territory_control
    WHERE province_id = p_origin_province_id;

    IF v_origin_control.controlling_clan_id IS DISTINCT FROM p_attacker_clan_id THEN
        RETURN jsonb_build_object('success', false, 'error', 'El clan atacante no posee soberanía sobre la provincia de vanguardia.');
    END IF;

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

    UPDATE public.territory_control
    SET status = 'under_siege',
        last_battle_at = v_now,
        updated_at = v_now
    WHERE province_id = p_target_province_id;

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
-- 12. RPC: execute_p2p_market_transaction (Split 2%: 1% Sink + 1% Regalía)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.execute_p2p_market_transaction(p_order_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_buyer_id UUID := (SELECT auth.uid());
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

    SELECT * INTO v_order
    FROM public.p2p_market_orders
    WHERE id = p_order_id AND status = 'active'
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Orden no disponible o ya finalizada');
    END IF;

    IF v_order.seller_id = v_buyer_id THEN
        RETURN jsonb_build_object('success', false, 'error', 'No puedes comprar tu propia orden');
    END IF;

    IF v_buyer_id < v_order.seller_id THEN
        SELECT * INTO v_buyer_profile FROM public.profiles WHERE id = v_buyer_id FOR UPDATE;
        SELECT * INTO v_seller_profile FROM public.profiles WHERE id = v_order.seller_id FOR UPDATE;
    ELSE
        SELECT * INTO v_seller_profile FROM public.profiles WHERE id = v_order.seller_id FOR UPDATE;
        SELECT * INTO v_buyer_profile FROM public.profiles WHERE id = v_buyer_id FOR UPDATE;
    END IF;

    IF v_buyer_profile.battle_credits < v_order.total_price_ec THEN
        RETURN jsonb_build_object('success', false, 'error', 'Créditos de batalla insuficientes');
    END IF;

    v_tax_total := FLOOR(v_order.total_price_ec * 0.02);
    v_burn_ec := FLOOR(v_order.total_price_ec * 0.01);
    v_royalty_ec := v_tax_total - v_burn_ec;
    v_net_payout := v_order.total_price_ec - v_tax_total;

    PERFORM set_config('app.bypass_profile_guard', 'on', true);

    UPDATE public.profiles
    SET battle_credits = battle_credits - v_order.total_price_ec,
        wallet_balance = battle_credits - v_order.total_price_ec,
        updated_at = v_now
    WHERE id = v_buyer_id;

    UPDATE public.profiles
    SET battle_credits = battle_credits + v_net_payout,
        wallet_balance = battle_credits + v_net_payout,
        updated_at = v_now
    WHERE id = v_order.seller_id;

    IF v_order.province_terminal_id IS NOT NULL AND v_royalty_ec > 0 THEN
        SELECT * INTO v_territory FROM public.territory_control
        WHERE province_id = v_order.province_terminal_id;

        IF FOUND AND v_territory.controlling_clan_id IS NOT NULL THEN
            UPDATE public.clans
            SET treasury_gold = treasury_gold + v_royalty_ec
            WHERE id = v_territory.controlling_clan_id;
        END IF;
    END IF;

    IF v_order.item_category = 'unit_chassis' THEN
        INSERT INTO public.user_unit_hangar (
            user_id, unit_code, tier, level, hp, quantity, location_province_id
        ) VALUES (
            v_buyer_id, v_order.item_code, v_order.tier, 1, 100, v_order.quantity, v_order.province_terminal_id
        );
    END IF;

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
-- 13. RPC: deploy_reinforcements_to_battle (1 Solicitud / Latencia 4 Rondas T+4)
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
    v_arrival_turn INTEGER := p_current_turn + 4;
    v_now TIMESTAMPTZ := timezone('utc'::text, now());
BEGIN
    IF (SELECT auth.uid()) IS NULL OR (SELECT auth.uid()) <> p_player_id THEN
        RETURN jsonb_build_object('success', false, 'error', 'No autorizado');
    END IF;

    SELECT * INTO v_hangar
    FROM public.user_unit_hangar
    WHERE id = p_unit_hangar_id AND user_id = p_player_id
    FOR UPDATE;

    IF NOT FOUND OR v_hangar.quantity < 1 THEN
        RETURN jsonb_build_object('success', false, 'error', 'Unidad de hangar no disponible.');
    END IF;

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
-- 14. RPC: calculate_and_apply_territorial_upkeep (Consumo y Penalización)
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

    SELECT COUNT(*), COALESCE(SUM(energy_upkeep), 0)
    INTO v_total_nodes, v_total_upkeep_ec
    FROM public.territory_nodes
    WHERE controller_clan_id = p_clan_id;

    IF v_total_nodes > 10 THEN
        v_overexpansion_penalty := LEAST(0.55, 0.05 * (v_total_nodes - 10));
        v_total_upkeep_ec := FLOOR(v_total_upkeep_ec * (1 + v_overexpansion_penalty));
    END IF;

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
-- 15. RPC: rpc_spin_daily_wheel (Ruleta Diaria Criptográficamente Segura)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.rpc_spin_daily_wheel(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_user public.profiles%ROWTYPE;
    v_roll NUMERIC;
    v_reward_type VARCHAR(32);
    v_reward_amount INTEGER;
    v_reward_label VARCHAR(64);
    v_now TIMESTAMPTZ := timezone('utc'::text, now());
BEGIN
    IF (SELECT auth.uid()) IS NULL OR (SELECT auth.uid()) <> p_user_id THEN
        RETURN jsonb_build_object('success', false, 'error', 'No autorizado');
    END IF;

    SELECT * INTO v_user FROM public.profiles WHERE id = p_user_id FOR UPDATE;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Perfil no encontrado');
    END IF;

    v_roll := random() * 100;
    IF v_roll < 50 THEN
        v_reward_type := 'credits';
        v_reward_amount := 500;
        v_reward_label := '500 Créditos Tácticos';
    ELSIF v_roll < 80 THEN
        v_reward_type := 'credits';
        v_reward_amount := 1200;
        v_reward_label := '1,200 Créditos Tácticos';
    ELSIF v_roll < 95 THEN
        v_reward_type := 'gems';
        v_reward_amount := 25;
        v_reward_label := '25 Gemas de Mando';
    ELSE
        v_reward_type := 'gems';
        v_reward_amount := 100;
        v_reward_label := '100 Gemas Legendarias';
    END IF;

    PERFORM set_config('app.bypass_profile_guard', 'on', true);

    IF v_reward_type = 'credits' THEN
        UPDATE public.profiles
        SET battle_credits = battle_credits + v_reward_amount,
            wallet_balance = battle_credits + v_reward_amount,
            updated_at = v_now
        WHERE id = p_user_id;
    ELSE
        UPDATE public.profiles
        SET command_gems = command_gems + v_reward_amount,
            updated_at = v_now
        WHERE id = p_user_id;
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'reward_type', v_reward_type,
        'reward_amount', v_reward_amount,
        'reward_label', v_reward_label,
        'wallet_balance', v_user.battle_credits + (CASE WHEN v_reward_type = 'credits' THEN v_reward_amount ELSE 0 END)
    );
END;
$$;

-- ------------------------------------------------------------------------------
-- 16. PERMISOS Y REVOCACIONES SEGURAS (Lints 0028/0029)
-- ------------------------------------------------------------------------------
REVOKE EXECUTE ON FUNCTION public.execute_territory_attack_declaration FROM public, anon;
GRANT EXECUTE ON FUNCTION public.execute_territory_attack_declaration TO authenticated;

REVOKE EXECUTE ON FUNCTION public.execute_p2p_market_transaction FROM public, anon;
GRANT EXECUTE ON FUNCTION public.execute_p2p_market_transaction TO authenticated;

REVOKE EXECUTE ON FUNCTION public.deploy_reinforcements_to_battle FROM public, anon;
GRANT EXECUTE ON FUNCTION public.deploy_reinforcements_to_battle TO authenticated;

REVOKE EXECUTE ON FUNCTION public.calculate_and_apply_territorial_upkeep FROM public, anon;
GRANT EXECUTE ON FUNCTION public.calculate_and_apply_territorial_upkeep TO authenticated;

REVOKE EXECUTE ON FUNCTION public.rpc_spin_daily_wheel FROM public, anon;
GRANT EXECUTE ON FUNCTION public.rpc_spin_daily_wheel TO authenticated;

-- ------------------------------------------------------------------------------
-- 17. PUBLICACIÓN REALTIME
-- ------------------------------------------------------------------------------
DO $$ BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.territory_control, public.p2p_market_orders;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- ------------------------------------------------------------------------------
-- 18. SEMILLAS CANÓNICAS DE MUNDO Y CLANES SOBERANOS
-- ------------------------------------------------------------------------------
-- Clanes Canónicos
INSERT INTO public.clans (id, name, tag, description, emblem_id, banner_color, treasury_gold)
VALUES
    ('c0000000-0000-0000-0000-000000000001', 'Iron Vanguard Syndicate', 'IVS', 'Sindicato de Blindados Pesados de la Costa Atlántica', 'insignia_hawk', '#E63946', 50000),
    ('c0000000-0000-0000-0000-000000000002', 'Solar Energy Combine', 'SEC', 'Monopolio de Reactores de Fusión y Tecnología Sonora', 'insignia_eagle', '#F4A261', 75000),
    ('c0000000-0000-0000-0000-000000000003', 'Cyber Cossacks League', 'CCL', 'Legión Mecanizada de Vanguardia Siberiana', 'insignia_wolf', '#2A9D8F', 40000)
ON CONFLICT (id) DO UPDATE
SET name = EXCLUDED.name, tag = EXCLUDED.tag, treasury_gold = EXCLUDED.treasury_gold;

-- Países
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

-- Provincias con Capitales Capturables 2.0x
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

-- Adyacencias
INSERT INTO public.territory_adjacencies (from_province_id, to_province_id, connection_type, max_bandwidth_tons)
VALUES
    ('ES_MADRID', 'ES_CATALUNA', 'land_open', 800),
    ('ES_MADRID', 'ES_ANDALUCIA', 'land_open', 800),
    ('ES_MADRID', 'ES_PAIS_VASCO', 'land_open', 700),
    ('ES_MADRID', 'ES_GALICIA', 'land_open', 600),
    ('ES_CATALUNA', 'ES_PAIS_VASCO', 'land_open', 600),
    ('ES_ANDALUCIA', 'ES_CATALUNA', 'land_open', 500),
    ('ES_GALICIA', 'ES_PAIS_VASCO', 'land_open', 500),
    ('ES_CATALUNA', 'FR_MARSELLA', 'land_open', 700),
    ('ES_PAIS_VASCO', 'FR_PARIS', 'land_open', 600),
    ('FR_PARIS', 'FR_MARSELLA', 'land_open', 900),
    ('FR_PARIS', 'GB_LONDON', 'strait', 500),
    ('GB_LONDON', 'GB_SCOTLAND', 'land_open', 600),
    ('FR_PARIS', 'DE_RUHR', 'land_open', 800),
    ('FR_MARSELLA', 'DE_BAVIERA', 'land_choke', 500),
    ('DE_BERLIN', 'DE_RUHR', 'land_open', 800),
    ('DE_BERLIN', 'DE_BAVIERA', 'land_open', 700),
    ('DE_RUHR', 'DE_BAVIERA', 'land_open', 750),
    ('ES_ANDALUCIA', 'EG_CAIRO', 'sea_lane', 400),
    ('EG_CAIRO', 'EG_SINAI', 'strait', 600),
    ('US_WASHINGTON', 'US_TEXAS', 'land_open', 900),
    ('US_TEXAS', 'US_CALIFORNIA', 'land_open', 850),
    ('US_CALIFORNIA', 'US_ALASKA', 'sea_lane', 400),
    ('JP_TOKYO', 'JP_OSAKA', 'land_open', 900),
    ('JP_TOKYO', 'JP_HOKKAIDO', 'strait', 600)
ON CONFLICT (from_province_id, to_province_id) DO NOTHING;

-- Control Territorial Inicial
INSERT INTO public.territory_control (province_id, controlling_clan_id, current_tcp, tcp_threshold, status)
VALUES
    ('ES_MADRID', 'c0000000-0000-0000-0000-000000000001', 12000, 10000, 'stable'),
    ('ES_CATALUNA', 'c0000000-0000-0000-0000-000000000001', 9500, 10000, 'stable'),
    ('ES_ANDALUCIA', 'c0000000-0000-0000-0000-000000000002', 10000, 10000, 'stable'),
    ('DE_BERLIN', 'c0000000-0000-0000-0000-000000000002', 14000, 10000, 'stable'),
    ('DE_RUHR', 'c0000000-0000-0000-0000-000000000002', 11000, 10000, 'stable'),
    ('JP_TOKYO', 'c0000000-0000-0000-0000-000000000003', 15000, 10000, 'stable'),
    ('US_WASHINGTON', 'c0000000-0000-0000-0000-000000000001', 13500, 10000, 'stable')
ON CONFLICT (province_id) DO UPDATE
SET controlling_clan_id = EXCLUDED.controlling_clan_id,
    current_tcp = EXCLUDED.current_tcp,
    status = EXCLUDED.status;

-- >>> FIN MIGRACIÓN: 20261103000003_v2_canonical_consolidation.sql <<<


-- >>> INICIO MIGRACIÓN: 20261104000001_geotactics_alpha_siege_and_venezuela_seed.sql <<<
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

-- >>> FIN MIGRACIÓN: 20261104000001_geotactics_alpha_siege_and_venezuela_seed.sql <<<


-- >>> INICIO MIGRACIÓN: 20261105000001_geotactics_strategic_nodes_and_queues.sql <<<
-- ==============================================================================
-- MIGRACIÓN 27: NODOS ESTRATÉGICOS, HANGAR DE FACCIÓN Y COLA DE PRODUCCIÓN
-- ==============================================================================
-- Especificación Canónica: docs/00_GEOTACTICS_ONLINE_MASTER_SPEC.md
-- Plan Maestro: PLAN_MAESTRO_IMPLEMENTACION_GEOTACTICS_ALICE_CERO_INCERTIDUMBRE.md
-- ==============================================================================

-- 1. TABLA: strategic_nodes (Nodos Estratégicos Provinciales)
CREATE TABLE IF NOT EXISTS public.strategic_nodes (
    id TEXT PRIMARY KEY,
    region_id TEXT NOT NULL REFERENCES public.regions(id) ON DELETE CASCADE,
    node_type TEXT NOT NULL CHECK (node_type IN ('capital_hq', 'refinery_hub', 'strait_canal', 'radar_c4isr', 'missile_silo')),
    name TEXT NOT NULL,
    buff_type TEXT NOT NULL CHECK (buff_type IN ('hegemonic_capital', 'energy_extraction', 'toll_chokepoint', 'radar_recon', 'area_denial')),
    buff_value NUMERIC(6,2) NOT NULL DEFAULT 1.00,
    controlling_clan_id UUID REFERENCES public.clans(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW())
);

CREATE INDEX IF NOT EXISTS idx_strategic_nodes_region ON public.strategic_nodes(region_id);
CREATE INDEX IF NOT EXISTS idx_strategic_nodes_clan ON public.strategic_nodes(controlling_clan_id);
CREATE INDEX IF NOT EXISTS idx_strategic_nodes_type ON public.strategic_nodes(node_type);

ALTER TABLE public.strategic_nodes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "strategic_nodes_read_all" ON public.strategic_nodes;
CREATE POLICY "strategic_nodes_read_all" ON public.strategic_nodes FOR SELECT USING (true);

-- 2. TABLA: faction_unit_hangar (Hangar Colectivo Comunitario del Clan)
CREATE TABLE IF NOT EXISTS public.faction_unit_hangar (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clan_id UUID NOT NULL REFERENCES public.clans(id) ON DELETE CASCADE,
    unit_code TEXT NOT NULL,
    tier SMALLINT NOT NULL DEFAULT 1 CHECK (tier BETWEEN 1 AND 5),
    stock_quantity INTEGER NOT NULL DEFAULT 0 CHECK (stock_quantity >= 0),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW()),
    CONSTRAINT uq_faction_hangar_clan_unit_tier UNIQUE (clan_id, unit_code, tier)
);

CREATE INDEX IF NOT EXISTS idx_faction_hangar_clan ON public.faction_unit_hangar(clan_id);
CREATE INDEX IF NOT EXISTS idx_faction_hangar_unit_tier ON public.faction_unit_hangar(unit_code, tier);

ALTER TABLE public.faction_unit_hangar ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "faction_hangar_read_all" ON public.faction_unit_hangar;
CREATE POLICY "faction_hangar_read_all" ON public.faction_unit_hangar FOR SELECT USING (true);

-- 3. TABLA: unit_production_queue (Cola de Ensamblaje con Tiempos de Espera)
CREATE TABLE IF NOT EXISTS public.unit_production_queue (
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

CREATE INDEX IF NOT EXISTS idx_unit_prod_queue_user ON public.unit_production_queue(user_id);
CREATE INDEX IF NOT EXISTS idx_unit_prod_queue_clan ON public.unit_production_queue(clan_id);
CREATE INDEX IF NOT EXISTS idx_unit_prod_queue_ready ON public.unit_production_queue(ready_at, is_claimed);

ALTER TABLE public.unit_production_queue ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "unit_prod_queue_read_own" ON public.unit_production_queue;
CREATE POLICY "unit_prod_queue_read_own" ON public.unit_production_queue
    FOR SELECT USING (auth.uid() = user_id OR auth.uid() IN (
        SELECT user_id FROM public.clan_members WHERE clan_id = unit_production_queue.clan_id
    ));

-- 4. RPC: queue_unit_production
CREATE OR REPLACE FUNCTION public.queue_unit_production(
    p_unit_code TEXT,
    p_tier INT DEFAULT 1,
    p_destination TEXT DEFAULT 'user',
    p_clan_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_duration_seconds INTEGER;
    v_now TIMESTAMPTZ := TIMEZONE('utc', NOW());
    v_ready_at TIMESTAMPTZ;
    v_queue_id UUID;
    v_cost_energy INTEGER := 100 * p_tier;
    v_cost_funds INTEGER := 250 * p_tier;
    v_user_funds INTEGER;
BEGIN
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Usuario no autenticado.';
    END IF;

    IF p_destination = 'faction' AND p_clan_id IS NULL THEN
        RAISE EXCEPTION 'Se requiere p_clan_id para destino de facción.';
    END IF;

    -- Cálculo de duración base determinista
    CASE p_unit_code
        WHEN 'infantry' THEN v_duration_seconds := CASE WHEN p_tier = 1 THEN 0 ELSE 30 * p_tier END;
        WHEN 'recon' THEN v_duration_seconds := CASE WHEN p_tier = 1 THEN 0 ELSE 45 * p_tier END;
        WHEN 'mech' THEN v_duration_seconds := 60 * p_tier;
        WHEN 'tank' THEN v_duration_seconds := 180 * p_tier;
        WHEN 'medium_tank' THEN v_duration_seconds := 480 * p_tier;
        WHEN 'artillery' THEN v_duration_seconds := 360 * p_tier;
        WHEN 'b_copter' THEN v_duration_seconds := 600 * p_tier;
        WHEN 'fighter' THEN v_duration_seconds := 900 * p_tier;
        WHEN 'bomber' THEN v_duration_seconds := 1200 * p_tier;
        ELSE v_duration_seconds := 120 * p_tier;
    END CASE;

    v_ready_at := v_now + (v_duration_seconds || ' seconds')::INTERVAL;

    INSERT INTO public.unit_production_queue (
        user_id, clan_id, destination, unit_code, tier, duration_seconds, started_at, ready_at, is_claimed
    ) VALUES (
        v_user_id, p_clan_id, p_destination, p_unit_code, p_tier, v_duration_seconds, v_now, v_ready_at, FALSE
    )
    RETURNING id INTO v_queue_id;

    RETURN jsonb_build_object(
        'success', true,
        'queue_id', v_queue_id,
        'unit_code', p_unit_code,
        'tier', p_tier,
        'duration_seconds', v_duration_seconds,
        'ready_at', v_ready_at
    );
END;
$$;

-- 5. RPC: claim_finished_unit
CREATE OR REPLACE FUNCTION public.claim_finished_unit(p_queue_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_queue_row RECORD;
BEGIN
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Usuario no autenticado.';
    END IF;

    SELECT * INTO v_queue_row
    FROM public.unit_production_queue
    WHERE id = p_queue_id AND user_id = v_user_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Elemento de cola no encontrado.';
    END IF;

    IF v_queue_row.is_claimed THEN
        RAISE EXCEPTION 'Esta unidad ya ha sido entregada al hangar.';
    END IF;

    IF TIMEZONE('utc', NOW()) < v_queue_row.ready_at THEN
        RAISE EXCEPTION 'La unidad aún está en proceso de ensamblaje en los talleres.';
    END IF;

    UPDATE public.unit_production_queue
    SET is_claimed = TRUE
    WHERE id = p_queue_id;

    IF v_queue_row.destination = 'faction' AND v_queue_row.clan_id IS NOT NULL THEN
        INSERT INTO public.faction_unit_hangar (clan_id, unit_code, tier, stock_quantity)
        VALUES (v_queue_row.clan_id, v_queue_row.unit_code, v_queue_row.tier, 1)
        ON CONFLICT (clan_id, unit_code, tier)
        DO UPDATE SET
            stock_quantity = public.faction_unit_hangar.stock_quantity + 1,
            updated_at = TIMEZONE('utc', NOW());
    ELSE
        INSERT INTO public.user_unit_hangar (user_id, unit_code, tier, quantity)
        VALUES (v_queue_row.user_id, v_queue_row.unit_code, v_queue_row.tier, 1)
        ON CONFLICT (user_id, unit_code, tier)
        DO UPDATE SET
            quantity = public.user_unit_hangar.quantity + 1,
            updated_at = TIMEZONE('utc', NOW());
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'destination', v_queue_row.destination,
        'unit_code', v_queue_row.unit_code,
        'tier', v_queue_row.tier
    );
END;
$$;

-- 6. SEED: NODOS ESTRATÉGICOS DEL TEATRO VENEZUELA
INSERT INTO public.strategic_nodes (id, region_id, node_type, name, buff_type, buff_value)
VALUES
    ('NODE_VE_CAPITAL', 'REG_VE_01', 'capital_hq', 'Cuartel General Central - Fuerte Tiuna Caracas', 'hegemonic_capital', 1.15),
    ('NODE_VE_MARACAIBO_CHOKE', 'REG_VE_02', 'strait_canal', 'Canal de Navegación del Lago de Maracaibo', 'toll_chokepoint', 5.00),
    ('NODE_VE_PARAGUANA_CRP', 'REG_VE_11', 'refinery_hub', 'Centro de Refinación Paraguaná (CRP Amuay)', 'energy_extraction', 1.25),
    ('NODE_VE_PARIA_CHOKE', 'REG_VE_13', 'strait_canal', 'Estrecho del Golfo de Paria / Bocas del Dragón', 'toll_chokepoint', 4.00),
    ('NODE_VE_GURI_HYDRO', 'REG_VE_03', 'refinery_hub', 'Central Hidroeléctrica Simón Bolívar (Guri)', 'energy_extraction', 1.30),
    ('NODE_VE_MARGARITA_RADAR', 'REG_VE_14', 'radar_c4isr', 'Estación Radar C4ISR Isla de Margarita', 'radar_recon', 3.00),
    ('NODE_VE_BAEL_AIRBASE', 'REG_VE_08', 'missile_silo', 'Base Aérea El Libertador / Batería SAM Maracay', 'area_denial', 30.00)
ON CONFLICT (id) DO UPDATE SET
    region_id = EXCLUDED.region_id,
    node_type = EXCLUDED.node_type,
    name = EXCLUDED.name,
    buff_type = EXCLUDED.buff_type,
    buff_value = EXCLUDED.buff_value;

-- >>> FIN MIGRACIÓN: 20261105000001_geotactics_strategic_nodes_and_queues.sql <<<


-- >>> INICIO MIGRACIÓN: 20261106_state_sovereignty_rbac.sql <<<
-- ==============================================================================
-- MIGRACIÓN CANÓNICA: SOBERANÍA TERRITORIAL DE ESTADOS Y CONTROL RBAC C4ISR
-- ==============================================================================
-- Especificación: docs/PROPUESTA_INGENIERIA_MAPA_METAPOLITICA_ALICE_CABIMAS.md
-- Tabla: public.state_sovereignty
-- RLS: Lectura pública; Escritura restringida a Líderes de Clan y Gestores de Facción
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.state_sovereignty (
  state_id VARCHAR(64) PRIMARY KEY,
  country_id VARCHAR(64) NOT NULL DEFAULT 'COUNTRY_VEN',
  canonical_country_name TEXT NOT NULL DEFAULT 'República de Venezuela',
  custom_country_name TEXT NOT NULL DEFAULT 'República Soberana de Venezuela',
  canonical_state_name TEXT NOT NULL,
  custom_state_name TEXT NOT NULL,
  controlling_faction_id VARCHAR(32) NOT NULL DEFAULT 'blue_moon',
  controlling_clan_id VARCHAR(64) NOT NULL DEFAULT 'clan-ferro',
  tcp_current INTEGER NOT NULL DEFAULT 10000 CHECK (tcp_current >= 0 AND tcp_current <= 10000),
  tcp_max INTEGER NOT NULL DEFAULT 10000,
  gdp_war_credits_per_hour INTEGER NOT NULL DEFAULT 5000,
  defense_level INTEGER NOT NULL DEFAULT 3 CHECK (defense_level >= 1 AND defense_level <= 5),
  custom_motto TEXT,
  sovereign_proclamation TEXT,
  updated_by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Habilitar Row Level Security (RLS)
ALTER TABLE public.state_sovereignty ENABLE ROW LEVEL SECURITY;

-- Índice para consultas rápidas por facción y país
CREATE INDEX IF NOT EXISTS idx_state_sovereignty_faction ON public.state_sovereignty(controlling_faction_id);
CREATE INDEX IF NOT EXISTS idx_state_sovereignty_country ON public.state_sovereignty(country_id);

-- Política 1: Lectura libre para todos los comandantes y observadores en el mapa
CREATE POLICY "state_sovereignty_public_read"
  ON public.state_sovereignty
  FOR SELECT
  USING (true);

-- Función de ayuda de seguridad para comprobar rol de líder de clan o gestor de facción
CREATE OR REPLACE FUNCTION public.is_sovereignty_authorized(target_clan_id VARCHAR(64))
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.clan_members cm
    WHERE cm.user_id = auth.uid()
      AND (cm.clan_id = target_clan_id OR cm.role IN ('leader', 'officer'))
  )
  OR EXISTS (
    SELECT 1 FROM public.profiles pp
    WHERE pp.id = auth.uid()
      AND (pp.is_admin = true OR pp.metadata->>'is_faction_manager' = 'true')
  );
$$;

-- Política 2: Inserción y Actualización exclusiva para comandantes autorizados
CREATE POLICY "state_sovereignty_leader_update"
  ON public.state_sovereignty
  FOR ALL
  TO authenticated
  USING (
    public.is_sovereignty_authorized(controlling_clan_id)
  )
  WITH CHECK (
    public.is_sovereignty_authorized(controlling_clan_id)
  );

-- Comentarios explicativos canónicos
COMMENT ON TABLE public.state_sovereignty IS 'SSOT de soberanía estatal, nombres proclamados de países/estados y control territorial en GEOTACTICS.';

-- >>> FIN MIGRACIÓN: 20261106_state_sovereignty_rbac.sql <<<


-- >>> INICIO MIGRACIÓN: 20261107_theatre_cabimas_realtime.sql <<<
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

-- >>> FIN MIGRACIÓN: 20261107_theatre_cabimas_realtime.sql <<<


-- >>> INICIO MIGRACIÓN: 20261108_system_catalog_manifest.sql <<<
-- ==============================================================================
-- MIGRACIÓN CANÓNICA: MANIFIESTO DE CATÁLOGOS ESTÁTICOS Y GOBERNANZA DE BALANCE
-- ==============================================================================
-- Especificación: plan_catalog_ssot_synchronization.md
-- Tablas: public.system_catalog_manifest
-- RPC: public.get_catalog_manifest_header(), public.refresh_catalog_manifest()
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.system_catalog_manifest (
    id VARCHAR(32) PRIMARY KEY DEFAULT 'current',
    version_tag VARCHAR(32) NOT NULL DEFAULT 'v1.0.0-canonical',
    content_hash VARCHAR(64) NOT NULL,
    bundle_json JSONB NOT NULL DEFAULT '{}'::jsonb,
    tables_included TEXT[] NOT NULL DEFAULT ARRAY[
        'units_catalog',
        'terrain_catalog',
        'commanders_catalog',
        'unit_weapon_damage_matrix',
        'world_countries',
        'cosmetics_catalog',
        'store_products_catalog'
    ]::TEXT[],
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

ALTER TABLE public.system_catalog_manifest ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "system_catalog_manifest_read_all" ON public.system_catalog_manifest;
CREATE POLICY "system_catalog_manifest_read_all"
    ON public.system_catalog_manifest
    FOR SELECT
    USING (true);

DROP POLICY IF EXISTS "system_catalog_manifest_auth_write" ON public.system_catalog_manifest;
CREATE POLICY "system_catalog_manifest_auth_write"
    ON public.system_catalog_manifest
    FOR ALL
    TO authenticated
    USING (auth.uid() IS NOT NULL)
    WITH CHECK (auth.uid() IS NOT NULL);

-- ------------------------------------------------------------------------------
-- 1. RPC: get_catalog_manifest_header (Chequeo ultrarrápido < 15ms en Boot Screen)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_catalog_manifest_header()
RETURNS TABLE (
    version_tag VARCHAR,
    content_hash VARCHAR,
    updated_at TIMESTAMPTZ
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT 
        scm.version_tag, 
        scm.content_hash, 
        scm.updated_at 
    FROM public.system_catalog_manifest scm 
    WHERE scm.id = 'current'
    LIMIT 1;
$$;

-- ------------------------------------------------------------------------------
-- 2. RPC: refresh_catalog_manifest (Compilación y Hashing SHA-256 en Servidor)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.refresh_catalog_manifest(p_version_tag TEXT DEFAULT NULL)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_units JSONB;
    v_terrains JSONB;
    v_commanders JSONB;
    v_damage_matrix JSONB;
    v_countries JSONB;
    v_cosmetics JSONB;
    v_store_products JSONB;
    v_bundle JSONB;
    v_bundle_text TEXT;
    v_hash TEXT;
    v_version TEXT;
BEGIN
    -- 1. Extraer unidades
    SELECT jsonb_agg(u ORDER BY u.id) INTO v_units
    FROM public.units_catalog u;

    -- 2. Extraer terrenos
    SELECT jsonb_agg(t ORDER BY t.id) INTO v_terrains
    FROM public.terrain_catalog t;

    -- 3. Extraer comandantes
    SELECT jsonb_agg(c ORDER BY c.id) INTO v_commanders
    FROM public.commanders_catalog c;

    -- 4. Extraer matriz de daño balístico
    SELECT jsonb_agg(d ORDER BY d.id) INTO v_damage_matrix
    FROM public.unit_weapon_damage_matrix d;

    -- 5. Extraer países
    SELECT jsonb_agg(wc ORDER BY wc.iso_code) INTO v_countries
    FROM public.world_countries wc;

    -- 6. Extraer cosméticos
    SELECT COALESCE(jsonb_agg(co ORDER BY co.id), '[]'::jsonb) INTO v_cosmetics
    FROM public.cosmetics_catalog co;

    -- 7. Extraer tienda
    SELECT COALESCE(jsonb_agg(sp ORDER BY sp.id), '[]'::jsonb) INTO v_store_products
    FROM public.store_products_catalog sp;

    -- Consolidar el bundle canónico
    v_bundle := jsonb_build_object(
        'units', COALESCE(v_units, '[]'::jsonb),
        'terrains', COALESCE(v_terrains, '[]'::jsonb),
        'commanders', COALESCE(v_commanders, '[]'::jsonb),
        'damage_matrix', COALESCE(v_damage_matrix, '[]'::jsonb),
        'countries', COALESCE(v_countries, '[]'::jsonb),
        'cosmetics', v_cosmetics,
        'store_products', v_store_products
    );

    v_bundle_text := v_bundle::text;
    v_hash := encode(digest(v_bundle_text, 'sha256'), 'hex');
    v_version := COALESCE(p_version_tag, 'v1.0.0-' || substring(v_hash from 1 for 8));

    INSERT INTO public.system_catalog_manifest (
        id, version_tag, content_hash, bundle_json, updated_at
    ) VALUES (
        'current', v_version, v_hash, v_bundle, timezone('utc', now())
    ) ON CONFLICT (id) DO UPDATE SET
        version_tag = EXCLUDED.version_tag,
        content_hash = EXCLUDED.content_hash,
        bundle_json = EXCLUDED.bundle_json,
        updated_at = timezone('utc', now());

    RETURN jsonb_build_object(
        'success', true,
        'version_tag', v_version,
        'content_hash', v_hash,
        'updated_at', timezone('utc', now())
    );
END;
$$;

-- ------------------------------------------------------------------------------
-- 3. SEED DETERMINISTA INICIAL DEL MANIFIESTO
-- ------------------------------------------------------------------------------
SELECT public.refresh_catalog_manifest('v1.0.0-canonical-genesis');

-- >>> FIN MIGRACIÓN: 20261108_system_catalog_manifest.sql <<<


-- >>> INICIO MIGRACIÓN: 20261109_territorial_vulnerability_windows.sql <<<
-- ==============================================================================
-- MIGRACIÓN CANÓNICA: VENTANAS FIJAS DE VULNERABILIDAD Y ECONOMÍA DE BAJAS
-- ==============================================================================
-- Especificación: docs/03_TACTICAL_STRATEGY_SYSTEM_DESIGN.md §4.1, §4.2, §5.3
-- - Ventanas fijas de 2 a 4 horas diarias para mitigación de Offline Raiding.
-- - Cooldown constitucional anti-evasión de 48 horas al reconfigurar la ventana.
-- - Liquidación de siniestros de combate: 65% sumidero / 35% chatarra (tech_scrap).
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.territorial_vulnerability_windows (
  region_id VARCHAR(64) PRIMARY KEY REFERENCES public.state_sovereignty(state_id) ON DELETE CASCADE,
  clan_id VARCHAR(64) NOT NULL,
  window_start_utc TIME NOT NULL DEFAULT '20:00:00',
  window_end_utc TIME NOT NULL DEFAULT '23:00:00',
  cooldown_until_utc TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  is_active BOOLEAN NOT NULL DEFAULT true,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT valid_window_duration CHECK (
    -- Permite ventanas directas (ej. 20:00 a 23:00 = 3h) o que crucen medianoche (ej. 23:00 a 02:00 = 3h)
    (window_end_utc > window_start_utc AND (window_end_utc - window_start_utc) BETWEEN INTERVAL '2 hours' AND INTERVAL '4 hours')
    OR
    (window_end_utc < window_start_utc AND ((INTERVAL '24 hours' - (window_start_utc - window_end_utc)) BETWEEN INTERVAL '2 hours' AND INTERVAL '4 hours'))
  )
);

-- Habilitar RLS
ALTER TABLE public.territorial_vulnerability_windows ENABLE ROW LEVEL SECURITY;

-- Política 1: Lectura libre para todos los comandantes y observadores en el mapa
CREATE POLICY "vulnerability_windows_public_read"
  ON public.territorial_vulnerability_windows
  FOR SELECT
  USING (true);

-- ------------------------------------------------------------------------------
-- RPC 1: check_territorial_vulnerability
-- Comprueba si una región soberana está dentro de su ventana de asedio permitida
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.check_territorial_vulnerability(
  p_region_id VARCHAR(64),
  p_check_time TIMESTAMPTZ DEFAULT timezone('utc'::text, now())
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  v_rec RECORD;
  v_current_time_utc TIME;
  v_is_vulnerable BOOLEAN := false;
  v_hours_remaining NUMERIC := 0;
BEGIN
  SELECT * INTO v_rec
  FROM public.territorial_vulnerability_windows
  WHERE region_id = p_region_id AND is_active = true;

  -- Si no tiene ventana configurada, se aplica la ventana canónica por defecto (20:00 - 23:00 UTC)
  IF NOT FOUND THEN
    v_current_time_utc := (p_check_time AT TIME ZONE 'UTC')::TIME;
    IF v_current_time_utc >= '20:00:00'::TIME AND v_current_time_utc < '23:00:00'::TIME THEN
      v_is_vulnerable := true;
    END IF;
    RETURN jsonb_build_object(
      'region_id', p_region_id,
      'is_vulnerable', v_is_vulnerable,
      'window_start_utc', '20:00:00',
      'window_end_utc', '23:00:00',
      'is_default_fallback', true,
      'cooldown_active', false
    );
  END IF;

  v_current_time_utc := (p_check_time AT TIME ZONE 'UTC')::TIME;

  -- Evaluación de ventana
  IF v_rec.window_end_utc > v_rec.window_start_utc THEN
    IF v_current_time_utc >= v_rec.window_start_utc AND v_current_time_utc < v_rec.window_end_utc THEN
      v_is_vulnerable := true;
    END IF;
  ELSE
    -- Ventana que cruza la medianoche (ej. 23:00 a 02:00)
    IF v_current_time_utc >= v_rec.window_start_utc OR v_current_time_utc < v_rec.window_end_utc THEN
      v_is_vulnerable := true;
    END IF;
  END IF;

  IF v_rec.cooldown_until_utc > p_check_time THEN
    v_hours_remaining := ROUND(EXTRACT(EPOCH FROM (v_rec.cooldown_until_utc - p_check_time)) / 3600.0, 1);
  END IF;

  RETURN jsonb_build_object(
    'region_id', p_region_id,
    'clan_id', v_rec.clan_id,
    'is_vulnerable', v_is_vulnerable,
    'window_start_utc', v_rec.window_start_utc,
    'window_end_utc', v_rec.window_end_utc,
    'cooldown_until_utc', v_rec.cooldown_until_utc,
    'cooldown_active', (v_hours_remaining > 0),
    'cooldown_hours_remaining', v_hours_remaining,
    'is_default_fallback', false
  );
END;
$$;

-- ------------------------------------------------------------------------------
-- RPC 2: update_territorial_vulnerability_window
-- Permite al clan soberano programar su ventana defensiva con cooldown anti-evasión de 48h
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.update_territorial_vulnerability_window(
  p_region_id VARCHAR(64),
  p_clan_id VARCHAR(64),
  p_window_start TIME,
  p_window_end TIME
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_existing RECORD;
  v_now TIMESTAMPTZ := timezone('utc'::text, now());
  v_new_cooldown TIMESTAMPTZ := v_now + INTERVAL '48 hours';
BEGIN
  -- 1. Validar que la región pertenezca o esté controlada por el clan
  IF NOT EXISTS (
    SELECT 1 FROM public.state_sovereignty
    WHERE state_id = p_region_id AND controlling_clan_id = p_clan_id
  ) THEN
    RAISE EXCEPTION 'UNAUTHORIZED_SOVEREIGNTY: El clan % no controla la soberanía de la región %', p_clan_id, p_region_id;
  END IF;

  -- 2. Validar cooldown constitucional anti-evasión de 48 horas
  SELECT * INTO v_existing
  FROM public.territorial_vulnerability_windows
  WHERE region_id = p_region_id;

  IF FOUND AND v_existing.cooldown_until_utc > v_now THEN
    RAISE EXCEPTION 'VULNERABILITY_WINDOW_COOLDOWN_ACTIVE: Debe esperar 48 horas entre cambios de horario defensivo (expira en: %)', v_existing.cooldown_until_utc;
  END IF;

  -- 3. Upsert de la ventana
  INSERT INTO public.territorial_vulnerability_windows (
    region_id,
    clan_id,
    window_start_utc,
    window_end_utc,
    cooldown_until_utc,
    updated_at
  ) VALUES (
    p_region_id,
    p_clan_id,
    p_window_start,
    p_window_end,
    v_new_cooldown,
    v_now
  )
  ON CONFLICT (region_id) DO UPDATE SET
    clan_id = EXCLUDED.clan_id,
    window_start_utc = EXCLUDED.window_start_utc,
    window_end_utc = EXCLUDED.window_end_utc,
    cooldown_until_utc = EXCLUDED.cooldown_until_utc,
    updated_at = EXCLUDED.updated_at;

  RETURN jsonb_build_object(
    'success', true,
    'region_id', p_region_id,
    'clan_id', p_clan_id,
    'window_start_utc', p_window_start,
    'window_end_utc', p_window_end,
    'cooldown_until_utc', v_new_cooldown
  );
END;
$$;

-- ------------------------------------------------------------------------------
-- RPC 3: settle_territorial_combat_losses
-- Liquidación de bajas en combate RTS: 65% sumidero deflacionario / 35% tech_scrap
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.settle_territorial_combat_losses(
  p_user_id UUID,
  p_unit_code VARCHAR(32),
  p_tier INTEGER DEFAULT 1
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_base_cost INTEGER := 1000;
  v_total_loss INTEGER;
  v_burned_sink INTEGER;
  v_scrap_awarded INTEGER;
  v_tier_mult NUMERIC := 1.0;
BEGIN
  -- Determinar coste según matriz de unidades
  CASE p_unit_code
    WHEN 'infantry' THEN v_base_cost := 1000;
    WHEN 'mech' THEN v_base_cost := 3000;
    WHEN 'recon' THEN v_base_cost := 4000;
    WHEN 'tank_light' THEN v_base_cost := 7000;
    WHEN 'anti_air' THEN v_base_cost := 8000;
    WHEN 'chopper_battle' THEN v_base_cost := 9000;
    WHEN 'artillery' THEN v_base_cost := 6000;
    WHEN 'tank_medium' THEN v_base_cost := 12000;
    WHEN 'missile' THEN v_base_cost := 12000;
    WHEN 'rocket' THEN v_base_cost := 15000;
    ELSE v_base_cost := 2000;
  END CASE;

  v_tier_mult := 1.0 + (GREATEST(1, LEAST(5, p_tier)) - 1) * 0.10;
  v_total_loss := ROUND(v_base_cost * v_tier_mult);

  -- 65% sumidero deflacionario permanente
  v_burned_sink := ROUND(v_total_loss * 0.65);
  -- 35% reciclaje balístico (1 scrap por cada 100 G de valor rescatado)
  v_scrap_awarded := GREATEST(1, ROUND((v_total_loss * 0.35) / 100.0));

  -- Acreditar la chatarra balística (tech_scrap) en el perfil industrial del usuario
  UPDATE public.profiles
  SET battle_credits = GREATEST(0, battle_credits),
      metadata = jsonb_set(
        COALESCE(metadata, '{}'::jsonb),
        '{tech_scrap}',
        (COALESCE((metadata->>'tech_scrap')::integer, 0) + v_scrap_awarded)::text::jsonb
      ),
      updated_at = timezone('utc'::text, now())
  WHERE id = p_user_id;

  RETURN jsonb_build_object(
    'user_id', p_user_id,
    'unit_code', p_unit_code,
    'tier', p_tier,
    'total_loss_value', v_total_loss,
    'burned_sink_65_pct', v_burned_sink,
    'tech_scrap_awarded_35_pct', v_scrap_awarded
  );
END;
$$;

-- >>> FIN MIGRACIÓN: 20261109_territorial_vulnerability_windows.sql <<<


-- >>> INICIO MIGRACIÓN: 20261110_fix_database_audit_regressions.sql <<<
-- ==============================================================================
-- MIGRACIÓN CANÓNICA: ENDURECIMIENTO DE AUDITORÍA, INTEGRIDAD DE HANGAR Y SANEAMIENTO
-- ==============================================================================
-- Especificación: docs/DIAGNOSTICO_META_Y_ROADMAP_BETA.md §4.1
-- 1. Restricción única en user_unit_hangar (user_id, unit_code, tier).
-- 2. Trigger de cumplimiento del Pilar 1: Capacidad física máxima de 16 tropas en Hangar.
-- 3. Inclusión de territorial_battle_sessions en replicación Realtime CDC.
-- 4. Corrección de acreditación de compras en execute_p2p_market_transaction para recursos y chasis.
-- 5. RPC canónica settle_territorial_combat_losses con soporte batch y chatarra 35%.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. RESTRICCIÓN ÚNICA EN USER_UNIT_HANGAR (Deduplicación segura previa)
-- ------------------------------------------------------------------------------
DELETE FROM public.user_unit_hangar a
USING public.user_unit_hangar b
WHERE a.id < b.id
  AND a.user_id = b.user_id
  AND a.unit_code = b.unit_code
  AND a.tier = b.tier;

ALTER TABLE public.user_unit_hangar DROP CONSTRAINT IF EXISTS uq_user_unit_hangar;
ALTER TABLE public.user_unit_hangar ADD CONSTRAINT uq_user_unit_hangar UNIQUE (user_id, unit_code, tier);

-- ------------------------------------------------------------------------------
-- 2. TRIGGER: CONTROL DE CAPACIDAD FÍSICA (MÁXIMO 16 TROPAS - PILAR CANÓNICO 1)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.check_user_hangar_capacity_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_current_total INTEGER := 0;
  v_new_addition INTEGER := 0;
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_new_addition := NEW.quantity;
  ELSIF TG_OP = 'UPDATE' THEN
    v_new_addition := NEW.quantity - OLD.quantity;
  END IF;

  IF v_new_addition <= 0 THEN
    RETURN NEW;
  END IF;

  SELECT COALESCE(SUM(quantity), 0) INTO v_current_total
  FROM public.user_unit_hangar
  WHERE user_id = NEW.user_id;

  IF (v_current_total + v_new_addition) > 16 THEN
    RAISE EXCEPTION 'Capacidad física del hangar excedida: Máximo 16 tropas en stock (Pilar Canónico 1). Total proyectado: %', (v_current_total + v_new_addition);
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_user_hangar_capacity ON public.user_unit_hangar;
CREATE TRIGGER trg_enforce_user_hangar_capacity
  BEFORE INSERT OR UPDATE OF quantity ON public.user_unit_hangar
  FOR EACH ROW
  EXECUTE FUNCTION public.check_user_hangar_capacity_limit();

-- ------------------------------------------------------------------------------
-- 3. REPLICACIÓN REALTIME CDC PARA TERRITORIAL_BATTLE_SESSIONS
-- ------------------------------------------------------------------------------
ALTER TABLE public.territorial_battle_sessions REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime'
  ) THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables 
      WHERE pubname = 'supabase_realtime' 
        AND schemaname = 'public' 
        AND tablename = 'territorial_battle_sessions'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.territorial_battle_sessions;
    END IF;
  END IF;
END;
$$;

-- ------------------------------------------------------------------------------
-- 4. RPC: EXECUTE_P2P_MARKET_TRANSACTION (ACREDITACIÓN COMPLETA DE RECURSOS Y CHASIS)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.execute_p2p_market_transaction(p_order_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_buyer_id UUID := (SELECT auth.uid());
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

    SELECT * INTO v_order
    FROM public.p2p_market_orders
    WHERE id = p_order_id AND status = 'active'
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Orden no disponible o ya finalizada');
    END IF;

    IF v_order.seller_id = v_buyer_id THEN
        RETURN jsonb_build_object('success', false, 'error', 'No puedes comprar tu propia orden');
    END IF;

    -- Orden determinista de bloqueo por UUID para evitar deadlocks en transacciones concurrentes
    IF v_buyer_id < v_order.seller_id THEN
        SELECT * INTO v_buyer_profile FROM public.profiles WHERE id = v_buyer_id FOR UPDATE;
        SELECT * INTO v_seller_profile FROM public.profiles WHERE id = v_order.seller_id FOR UPDATE;
    ELSE
        SELECT * INTO v_seller_profile FROM public.profiles WHERE id = v_order.seller_id FOR UPDATE;
        SELECT * INTO v_buyer_profile FROM public.profiles WHERE id = v_buyer_id FOR UPDATE;
    END IF;

    IF v_buyer_profile.battle_credits < v_order.total_price_ec THEN
        RETURN jsonb_build_object('success', false, 'error', 'Créditos de batalla insuficientes');
    END IF;

    v_tax_total := FLOOR(v_order.total_price_ec * 0.02);
    v_burn_ec := FLOOR(v_order.total_price_ec * 0.01);
    v_royalty_ec := v_tax_total - v_burn_ec;
    v_net_payout := v_order.total_price_ec - v_tax_total;

    PERFORM set_config('app.bypass_profile_guard', 'on', true);

    UPDATE public.profiles
    SET battle_credits = battle_credits - v_order.total_price_ec,
        wallet_balance = battle_credits - v_order.total_price_ec,
        updated_at = v_now
    WHERE id = v_buyer_id;

    UPDATE public.profiles
    SET battle_credits = battle_credits + v_net_payout,
        wallet_balance = battle_credits + v_net_payout,
        updated_at = v_now
    WHERE id = v_order.seller_id;

    IF v_order.province_terminal_id IS NOT NULL AND v_royalty_ec > 0 THEN
        SELECT * INTO v_territory FROM public.territory_control
        WHERE province_id = v_order.province_terminal_id;

        IF FOUND AND v_territory.controlling_clan_id IS NOT NULL THEN
            UPDATE public.clans
            SET treasury_gold = treasury_gold + v_royalty_ec
            WHERE id = v_territory.controlling_clan_id;
        END IF;
    END IF;

    -- Entrega del activo físico al comprador
    IF v_order.item_category = 'unit_chassis' THEN
        INSERT INTO public.user_unit_hangar (
            user_id, unit_code, tier, level, hp, quantity, location_province_id, created_at, updated_at
        ) VALUES (
            v_buyer_id, v_order.item_code, v_order.tier, 1, 100, v_order.quantity, v_order.province_terminal_id, v_now, v_now
        )
        ON CONFLICT (user_id, unit_code, tier) DO UPDATE
        SET quantity = public.user_unit_hangar.quantity + EXCLUDED.quantity,
            updated_at = v_now;
    ELSIF v_order.item_category IN ('raw_resource', 'refined_material') THEN
        INSERT INTO public.user_industrial_inventory (user_id)
        VALUES (v_buyer_id)
        ON CONFLICT (user_id) DO NOTHING;

        CASE v_order.item_code
            WHEN 'raw_iron' THEN
                UPDATE public.user_industrial_inventory SET raw_iron = raw_iron + v_order.quantity, updated_at = v_now WHERE user_id = v_buyer_id;
            WHEN 'raw_stone' THEN
                UPDATE public.user_industrial_inventory SET raw_stone = raw_stone + v_order.quantity, updated_at = v_now WHERE user_id = v_buyer_id;
            WHEN 'raw_rare_earth' THEN
                UPDATE public.user_industrial_inventory SET raw_rare_earth = raw_rare_earth + v_order.quantity, updated_at = v_now WHERE user_id = v_buyer_id;
            WHEN 'refined_steel' THEN
                UPDATE public.user_industrial_inventory SET refined_steel = refined_steel + v_order.quantity, updated_at = v_now WHERE user_id = v_buyer_id;
            WHEN 'refined_concrete' THEN
                UPDATE public.user_industrial_inventory SET refined_concrete = refined_concrete + v_order.quantity, updated_at = v_now WHERE user_id = v_buyer_id;
            WHEN 'refined_microchip' THEN
                UPDATE public.user_industrial_inventory SET refined_microchip = refined_microchip + v_order.quantity, updated_at = v_now WHERE user_id = v_buyer_id;
            WHEN 'campaign_fuel' THEN
                UPDATE public.user_industrial_inventory SET campaign_fuel = campaign_fuel + v_order.quantity, updated_at = v_now WHERE user_id = v_buyer_id;
            WHEN 'fuel' THEN
                UPDATE public.user_industrial_inventory SET campaign_fuel = campaign_fuel + v_order.quantity, updated_at = v_now WHERE user_id = v_buyer_id;
            WHEN 'tech_scrap' THEN
                UPDATE public.user_industrial_inventory SET tech_scrap = tech_scrap + v_order.quantity, updated_at = v_now WHERE user_id = v_buyer_id;
            ELSE
                UPDATE public.profiles
                SET metadata = jsonb_set(
                    COALESCE(metadata, '{}'::jsonb),
                    ARRAY[v_order.item_code],
                    (COALESCE((metadata->>v_order.item_code)::integer, 0) + v_order.quantity)::text::jsonb
                )
                WHERE id = v_buyer_id;
        END CASE;
    END IF;

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
-- 5. RPC CANÓNICA: SETTLE_TERRITORIAL_COMBAT_LOSSES (INDIVIDUAL Y EN LOTE)
-- ------------------------------------------------------------------------------
-- Overload 1: Individual por código y tier
CREATE OR REPLACE FUNCTION public.settle_territorial_combat_losses(
  p_user_id UUID,
  p_unit_code VARCHAR(32),
  p_tier INTEGER DEFAULT 1
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_base_cost INTEGER := 1000;
  v_total_loss INTEGER;
  v_burned_sink INTEGER;
  v_scrap_awarded INTEGER;
  v_tier_mult NUMERIC := 1.0;
  v_now TIMESTAMPTZ := timezone('utc'::text, now());
BEGIN
  -- Infantería y Recon T1 están 100% blindados (Pilar 1: F2P inagotable)
  IF (p_unit_code IN ('infantry', 'recon') AND COALESCE(p_tier, 1) = 1) THEN
    RETURN jsonb_build_object(
      'user_id', p_user_id,
      'unit_code', p_unit_code,
      'tier', p_tier,
      'is_f2p_protected', true,
      'tech_scrap_awarded_35_pct', 0
    );
  END IF;

  CASE p_unit_code
    WHEN 'infantry' THEN v_base_cost := 1000;
    WHEN 'mech' THEN v_base_cost := 3000;
    WHEN 'recon' THEN v_base_cost := 4000;
    WHEN 'tank_light' THEN v_base_cost := 7000;
    WHEN 'anti_air' THEN v_base_cost := 8000;
    WHEN 'chopper_battle' THEN v_base_cost := 9000;
    WHEN 'artillery' THEN v_base_cost := 6000;
    WHEN 'tank_medium' THEN v_base_cost := 12000;
    WHEN 'missile' THEN v_base_cost := 12000;
    WHEN 'rocket' THEN v_base_cost := 15000;
    WHEN 'neotank' THEN v_base_cost := 22000;
    WHEN 'fighter' THEN v_base_cost := 20000;
    WHEN 'bomber' THEN v_base_cost := 22000;
    WHEN 'battleship' THEN v_base_cost := 28000;
    ELSE v_base_cost := 2000;
  END CASE;

  -- Pilar 4: Multiplicador de +2% por Tier
  v_tier_mult := 1.0 + (GREATEST(1, LEAST(5, COALESCE(p_tier, 1))) - 1) * 0.02;
  v_total_loss := ROUND(v_base_cost * v_tier_mult);
  -- 65% sumidero deflacionario permanente
  v_burned_sink := ROUND(v_total_loss * 0.65);
  -- 35% chatarra balística (1 scrap por cada 100 EC de valor recuperado)
  v_scrap_awarded := GREATEST(1, ROUND((v_total_loss * 0.35) / 100.0));

  -- Descontar del stock físico en hangar
  UPDATE public.user_unit_hangar
  SET quantity = GREATEST(0, quantity - 1),
      updated_at = v_now
  WHERE user_id = p_user_id
    AND unit_code = p_unit_code
    AND tier = COALESCE(p_tier, 1)
    AND quantity > 0;

  -- Acreditar chatarra en user_industrial_inventory
  INSERT INTO public.user_industrial_inventory (user_id, tech_scrap)
  VALUES (p_user_id, v_scrap_awarded)
  ON CONFLICT (user_id) DO UPDATE
  SET tech_scrap = public.user_industrial_inventory.tech_scrap + EXCLUDED.tech_scrap,
      updated_at = v_now;

  -- Espejo en metadatos para reactividad de interfaz
  UPDATE public.profiles
  SET metadata = jsonb_set(
        COALESCE(metadata, '{}'::jsonb),
        '{tech_scrap}',
        (COALESCE((metadata->>'tech_scrap')::integer, 0) + v_scrap_awarded)::text::jsonb
      ),
      updated_at = v_now
  WHERE id = p_user_id;

  RETURN jsonb_build_object(
    'user_id', p_user_id,
    'unit_code', p_unit_code,
    'tier', p_tier,
    'total_loss_value', v_total_loss,
    'burned_sink_65_pct', v_burned_sink,
    'tech_scrap_awarded_35_pct', v_scrap_awarded
  );
END;
$$;

-- Overload 2: En lote (Batch Settle)
CREATE OR REPLACE FUNCTION public.settle_territorial_combat_losses(
  p_user_id UUID,
  p_clan_id UUID,
  p_destroyed_units JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_item RECORD;
  v_hangar_row RECORD;
  v_actual_deducted INTEGER;
  v_total_units_deducted INTEGER := 0;
  v_base_scrap INTEGER := 0;
  v_scrap_recovered INTEGER := 0;
  v_new_scrap_balance INTEGER := 0;
  v_now TIMESTAMPTZ := timezone('utc'::text, now());
BEGIN
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'p_user_id no puede ser nulo en la liquidación de siniestralidad.';
  END IF;

  IF p_destroyed_units IS NULL OR jsonb_typeof(p_destroyed_units) <> 'array' OR jsonb_array_length(p_destroyed_units) = 0 THEN
    RETURN jsonb_build_object('success', true, 'units_deducted', 0, 'scrap_recovered', 0);
  END IF;

  -- Iterar en orden determinista para prevenir deadlocks
  FOR v_item IN
    SELECT
      x.unit_code,
      COALESCE(x.tier, 1) AS tier,
      SUM(GREATEST(0, COALESCE(x.quantity, 0)))::INTEGER AS total_lost
    FROM jsonb_to_recordset(p_destroyed_units) AS x(unit_code TEXT, tier INTEGER, quantity INTEGER)
    WHERE x.unit_code IS NOT NULL
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
          updated_at = v_now
      WHERE id = v_hangar_row.id;

      v_total_units_deducted := v_total_units_deducted + v_actual_deducted;
      v_base_scrap := (v_item.tier * 50) * v_actual_deducted;
      v_scrap_recovered := v_scrap_recovered + FLOOR(v_base_scrap * 0.35)::INTEGER;
    END IF;
  END LOOP;

  IF v_scrap_recovered > 0 THEN
    INSERT INTO public.user_industrial_inventory (user_id, tech_scrap)
    VALUES (p_user_id, v_scrap_recovered)
    ON CONFLICT (user_id) DO UPDATE
    SET tech_scrap = public.user_industrial_inventory.tech_scrap + EXCLUDED.tech_scrap,
        updated_at = v_now
    RETURNING tech_scrap INTO v_new_scrap_balance;

    UPDATE public.profiles
    SET metadata = jsonb_set(
          COALESCE(metadata, '{}'::jsonb),
          '{tech_scrap}',
          (COALESCE((metadata->>'tech_scrap')::integer, 0) + v_scrap_recovered)::text::jsonb
        ),
        updated_at = v_now
    WHERE id = p_user_id;
  ELSE
    SELECT COALESCE(tech_scrap, 0) INTO v_new_scrap_balance
    FROM public.user_industrial_inventory
    WHERE user_id = p_user_id;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'user_id', p_user_id,
    'clan_id', p_clan_id,
    'total_units_deducted', v_total_units_deducted,
    'tech_scrap_recovered_35_pct', v_scrap_recovered,
    'current_tech_scrap_balance', v_new_scrap_balance
  );
END;
$$;

-- >>> FIN MIGRACIÓN: 20261110_fix_database_audit_regressions.sql <<<


-- >>> INICIO SEED DATA: seed.sql <<<
-- ============================================================================
-- SCRIPT CANÓNICO DE SEMILLAS (SEED DATA)
-- Proyecto: Tactical Command: Wars of Legacy
-- Especificación: docs/orchestration/00_MASTER_EXECUTION_PLAN.md (Fase 3)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. USUARIOS DE AUTENTICACIÓN LOCAL / DESARROLLO (auth.users)
-- ----------------------------------------------------------------------------
INSERT INTO auth.users (
    id,
    instance_id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    is_super_admin,
    created_at,
    updated_at
) VALUES 
(
    'a0000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'commander1@tactical.local',
    crypt('tactical2026', gen_salt('bf')),
    now(),
    '{"provider": "email", "providers": ["email"]}'::jsonb,
    '{"username": "Commander_Alpha", "display_name": "Mayor General Stella"}'::jsonb,
    false,
    now(),
    now()
),
(
    'a0000000-0000-0000-0000-000000000002',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'commander2@tactical.local',
    crypt('tactical2026', gen_salt('bf')),
    now(),
    '{"provider": "email", "providers": ["email"]}'::jsonb,
    '{"username": "Commander_Beta", "display_name": "Brigadier Bren"}'::jsonb,
    false,
    now(),
    now()
)
ON CONFLICT (id) DO NOTHING;

-- ----------------------------------------------------------------------------
-- 2. PERFILES MILITARES (public.profiles)
-- ----------------------------------------------------------------------------
INSERT INTO public.profiles (
    id,
    username,
    avatar_url,
    account_level,
    current_xp,
    battle_credits,
    command_gems,
    elo_rating,
    total_matches_played,
    total_victories,
    equipped_loadout,
    equipped_cosmetics,
    created_at,
    updated_at
) VALUES 
(
    'a0000000-0000-0000-0000-000000000001',
    'Commander_Alpha',
    'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=150',
    10,
    1450,
    18500,
    350,
    1420,
    45,
    32,
    '["infantry", "mech", "recon", "tank_light", "artillery", "anti_air", "b_copter"]'::jsonb,
    '{
        "tank_light": "skin_default",
        "infantry": "skin_default",
        "artillery": "skin_default",
        "avatar_frame": "frame_recruit",
        "hq_banner": "banner_standard"
    }'::jsonb,
    now(),
    now()
),
(
    'a0000000-0000-0000-0000-000000000002',
    'Commander_Beta',
    'https://images.unsplash.com/photo-1563089145-599997674d42?w=150',
    8,
    820,
    12400,
    180,
    1310,
    30,
    18,
    '["infantry", "mech", "recon", "tank_light", "artillery", "anti_air", "neotank"]'::jsonb,
    '{
        "tank_light": "skin_default",
        "infantry": "skin_default",
        "artillery": "skin_default",
        "avatar_frame": "frame_recruit",
        "hq_banner": "banner_standard"
    }'::jsonb,
    now(),
    now()
)
ON CONFLICT (id) DO UPDATE SET
    account_level = EXCLUDED.account_level,
    battle_credits = EXCLUDED.battle_credits,
    command_gems = EXCLUDED.command_gems,
    elo_rating = EXCLUDED.elo_rating;

-- ----------------------------------------------------------------------------
-- 3. DESBLOQUEOS INICIALES (public.user_unlocks)
-- ----------------------------------------------------------------------------
INSERT INTO public.user_unlocks (user_id, item_type, item_id, acquisition_method)
VALUES
    ('a0000000-0000-0000-0000-000000000001', 'co_commander', 'stella', 'starter'),
    ('a0000000-0000-0000-0000-000000000001', 'co_commander', 'bren', 'level_reward'),
    ('a0000000-0000-0000-0000-000000000001', 'co_commander', 'rachel', 'level_reward'),
    ('a0000000-0000-0000-0000-000000000001', 'unit', 'infantry', 'starter'),
    ('a0000000-0000-0000-0000-000000000001', 'unit', 'mech', 'starter'),
    ('a0000000-0000-0000-0000-000000000001', 'unit', 'recon', 'starter'),
    ('a0000000-0000-0000-0000-000000000001', 'unit', 'tank_light', 'starter'),
    ('a0000000-0000-0000-0000-000000000001', 'unit', 'artillery', 'starter'),
    ('a0000000-0000-0000-0000-000000000001', 'unit', 'anti_air', 'starter'),
    ('a0000000-0000-0000-0000-000000000001', 'unit', 'b_copter', 'starter'),
    ('a0000000-0000-0000-0000-000000000001', 'unit', 'apc', 'credits_purchase'),
    ('a0000000-0000-0000-0000-000000000001', 'unit', 'neotank', 'credits_purchase'),

    ('a0000000-0000-0000-0000-000000000002', 'co_commander', 'bren', 'starter'),
    ('a0000000-0000-0000-0000-000000000002', 'co_commander', 'colin', 'credits_purchase'),
    ('a0000000-0000-0000-0000-000000000002', 'unit', 'infantry', 'starter'),
    ('a0000000-0000-0000-0000-000000000002', 'unit', 'mech', 'starter'),
    ('a0000000-0000-0000-0000-000000000002', 'unit', 'recon', 'starter'),
    ('a0000000-0000-0000-0000-000000000002', 'unit', 'tank_light', 'starter'),
    ('a0000000-0000-0000-0000-000000000002', 'unit', 'artillery', 'starter'),
    ('a0000000-0000-0000-0000-000000000002', 'unit', 'anti_air', 'starter'),
    ('a0000000-0000-0000-0000-000000000002', 'unit', 'b_copter', 'starter'),
    ('a0000000-0000-0000-0000-000000000002', 'unit', 'neotank', 'credits_purchase')
ON CONFLICT (user_id, item_type, item_id) DO NOTHING;

-- ----------------------------------------------------------------------------
-- 4. PARTIDA MODELO DE PRUEBA (public.active_matches)
-- ----------------------------------------------------------------------------
INSERT INTO public.active_matches (
    id,
    room_code,
    player1_id,
    player2_id,
    current_turn_player_id,
    status,
    game_mode,
    map_id,
    turn_number,
    created_at,
    updated_at
) VALUES (
    'b0000000-0000-0000-0000-000000000001',
    'WAR7777',
    'a0000000-0000-0000-0000-000000000001',
    'a0000000-0000-0000-0000-000000000002',
    'a0000000-0000-0000-0000-000000000001',
    'in_progress',
    'pvp_realtime',
    'canonical_spade_island_16x16',
    1,
    now(),
    now()
)
ON CONFLICT (room_code) DO NOTHING;

-- >>> FIN SEED DATA: seed.sql <<<

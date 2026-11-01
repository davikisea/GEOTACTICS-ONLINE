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

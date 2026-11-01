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

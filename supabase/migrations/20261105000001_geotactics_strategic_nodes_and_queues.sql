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

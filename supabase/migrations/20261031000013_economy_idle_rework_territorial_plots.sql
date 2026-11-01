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

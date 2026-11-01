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

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

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

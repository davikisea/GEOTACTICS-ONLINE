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

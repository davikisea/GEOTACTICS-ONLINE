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

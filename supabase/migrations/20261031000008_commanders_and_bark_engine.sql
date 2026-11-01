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

# Sistema de Comandantes con Bark Engine Visual (Estética Cómic) y Modelo de Monetización

Este documento detalla la arquitectura definitiva del **Sistema de Comandantes** (evolución estratégica de la Torre del Rey de *Clash Royale* y los Commanding Officers de *Advance Wars*), el **Bark Engine de Diálogo Procedimental en Viñetas de Cómic** (sin voces, 100% textual y visual) y la **Estructura de Base de Datos Telemetrizada** capaz de cruzar cientos de variables de comportamiento táctico partida tras partida.

---

# SECCIÓN 1: CADENA SOCRÁTICA DE PREGUNTAS LÓGICAS Y DECISIONES DE ARQUITECTURA

Para fundamentar y expandir al máximo la base de datos de manera robusta, formulamos y resolvemos la siguiente cadena de interrogantes arquitectónicos:

### P1: ¿Por qué los registros tradicionales agregados (Win Rate o K/D) son insuficientes para un Bark Engine de narrativa procedimental estilo *Hades*?
* **Respuesta:** Porque un Comandante militar en una viñeta de cómic no genera empatía repitiendo un frío porcentaje estadístico. El Comandante debe percibir **patrones de conducta táctica y estados emocionales**:
  1. ¿El jugador entra en "tilt" (juega turnos en < 8 segundos tras perder 2 tanques seguidos)?
  2. ¿Sufre de "sesgo de apego" (construye obsesivamente helicópteros aunque el rival tenga 3 antiaéreos en mapa)?
  3. ¿Es conservador ("tortuga/camper") que acumula más de $15,000G en reserva sin desplegar tropas mientras su cuartel general es rodeado?
  4. ¿Cómo reacciona frente a la niebla de guerra? ¿Avanza a ciegas y cae en emboscadas (TRAP)?
* **Impacto en BD:** Se requiere una tabla de agregación multidimensional (`player_tactical_behavior_profile`) alimentada por eventos de micro-telemetría por turno (`match_detailed_telemetry`).

### P2: ¿Cómo garantizar que cruzar cientos de datos de partidas pasadas no degrade el rendimiento en tiempo real?
* **Respuesta:** Separando estrictamente el almacenamiento en dos capas:
  1. **Capa OLTP de Registro Append-Only:** Durante la partida, solo se registran deltas de eventos en un buffer en memoria o en un registro JSONB ligero al finalizar la partida (`match_detailed_telemetry`).
  2. **Capa de Perfil Agregado ($O(1)$ de lectura):** Un trigger o Edge Function al concluir la partida actualiza la fila persistente del jugador en `player_tactical_behavior_profile`. El Bark Engine solo lee esa fila única indexada por `user_id`, resolviendo la evaluación contextual en menos de 2 milisegundos.

### P3: ¿Por qué se prescinde por completo de la actuación de voz (Voice Lines) y cuál es la directriz estética elegida?
* **Respuesta:** 
  1. **Agilidad Web y Cero Latencia:** El juego se ejecuta en navegadores y móviles. Descargar cientos de megabytes de audio comprimido destruye el tiempo de carga instantáneo (FCP < 1.0s).
  2. **Identidad Visual de Cómic / Novela Gráfica Táctica:** La estética del juego rinde tributo a las viñetas militares y al arte pop con tramas de puntos Ben-Day, bocadillos dinámicos y onomatopeyas impactantes. El impacto emocional y el carisma provienen de la expresividad visual: el tamaño de la tipografía, el estilo del bocadillo (dentado para gritos, punteado para susurros, nublado para pensamientos) y los sellos de texto onomatopéyicos (*BOOM!*, *RATATAT!*, *ALERT!*).

### P4: ¿Cómo modelar la relación y familiaridad entre el jugador y cada Comandante individual?
* **Respuesta:** La relación no es global, sino bilateral. Si un jugador combate siempre con la **Mayor Stella**, su nivel de vínculo (*Bonding Level*) aumenta, desbloqueando comentarios de mayor camaradería, apodos tácticos y viñetas con expresiones emocionales únicas. Si luego cambia al **Comandante Volkov**, este lo tratará con frialdad analítica como a un desconocido.
* **Impacto en BD:** Se crea la tabla relacional `commander_bonding_progress` con claves compuestas `(user_id, commander_id)`.

### P5: ¿Cómo se monetiza esta experiencia sin caer en el Pay-to-Win?
* **Respuesta:** La monetización se basa en el **Command Pass con Reclamación Retroactiva** y la personalización estética de cómic:
  1. Comandantes exclusivos con personalidades narrativas divergentes pero idénticos stats base de HQ y límites en liga.
  2. Estilos visuales de bocadillos de diálogo (Bocadillo Vintage Años 80, Bocadillo Ciberpunk Neón, Manga Shonen con tramas).
  3. Sellos de onomatopeyas visuales para remates críticos.
  4. Fondos de viñeta y marcos de perfil de novela gráfica.

---

# SECCIÓN 2: ARQUITECTURA VISUAL DEL BARK ENGINE (ESTÉTICA CÓMIC)

El Bark Engine no reproduce audio de voces. En su lugar, proyecta sobre la interfaz (Menú Principal, Cola de Espera, Partida en Vivo y Pantalla de Resultados) una **viñeta ilustrada con bocadillos de historieta dinámicos**:

```
 ┌───────────────────────────────────────────────────────────────┐
 │  VIÑETA DEL COMANDANTE: MAYOR STELLA (ESTILO NOVELA GRÁFICA)  │
 │  ┌──────────────┐                                             │
 │  │              │    /~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~\  │
 │  │   [RETRATO   │   |  ¡¿OTRA VEZ BOMBARDEIROS FRENTE A    |  │
 │  │    PIXEL/    │   <   TRES ANTIAÉREOS?! ¡¿ES QUE ACASO   |  │
 │  │    COMIC     │   |  QUIERES REGALARLES CHATARRA?!       |  │
 │  │   EXPRESIÓN: │    \__________________  _________________/  │
 │  │   SARCÁSTICA]│                       \/ [COLA DENTADA]     │
 │  │              │                                             │
 │  └──────────────┘      ┌──────────────┐                       │
 │      ★★★★★             │  ¡¡KABOOM!!  │ <- SELLO ONOMATOPEYA  │
 │   BOND NIVEL 6         └──────────────┘    ESTILO ARTE POP    │
 └───────────────────────────────────────────────────────────────┘
```

### 2.1 Tipología de Bocadillos de Diálogo (Bubble Taxonomy):
1. **Bocadillo Estándar (`speech`):** Óvalo suave con cola curva. Usado para consejos doctrinales y observaciones estándar.
2. **Bocadillo Dentado de Grito (`shout`):** Bordes angulares en zigzag con cola aguda. Usado en derrotas consecutivas, impactos críticos al HQ o activación de Superpoderes.
3. **Bocadillo de Pensamiento (`thought`):** Nube esponjosa con círculos ascendentes. Usado por Comandantes analíticos (como Volkov) evaluando las métricas en silencio.
4. **Bocadillo Punteado / Sigilo (`whisper`):** Contorno de trazos discontinuos. Usado al tender emboscadas en niebla de guerra o esconder unidades en bosques.
5. **Bocadillo de Transmisión Militar (`radio`):** Rectángulo con bisel técnico y textura de estática visual. Usado durante la búsqueda de emparejamiento (Matchmaking Queue).

### 2.2 Sellos Visuales de Onomatopeyas Pop-Art (`onomatopoeia_stamps`):
Textos tipográficos rotados con reborde negro y sombras proyectadas que aparecen momentáneamente junto al bocadillo:
* `¡BOOM!`: Remates de artillería pesada o impacto en HQ.
* `¡RATATAT!`: Ráfagas antiaéreas y ametralladoras ligeras.
* `¡TACTICAL!`: Jugada de flanqueo calculada o captura de sede enemiga.
* `¡PANIC!`: Detección de caída de fondos o pérdida de 3 unidades en el mismo turno.
* `¡CLUTCH!`: Supervivencia milagrosa con menos de 3 HP en el HQ.

---

# SECCIÓN 3: REPLANTEAMIENTO INTEGRAL DE LA BASE DE DATOS (DATA MODEL)

Para soportar la profundidad de datos cruzados partida tras partida, se diseña un esquema en PostgreSQL estructurado en 6 ejes relacionales:

```
                                  MAPA DE RELACIONES DEL BARK ENGINE & TELEMETRÍA
                                                        │
         ┌──────────────────────────────────────────────┼──────────────────────────────────────────────┐
         ▼                                              ▼                                              ▼
[ public.profiles ]                            [ user_commanders ]                            [ units_catalog ]
         │                                              │                                              │
         ├──────────────────────────────┐               ├──────────────────────────────┐               │
         ▼                              ▼               ▼                              ▼               │
[ player_tactical_behavior_profile ]    [ commander_bonding_progress ]   [ bark_dialogue_templates ]  │
         │                                                                             │               │
         ▼                                                                             ▼               ▼
[ match_detailed_telemetry ] ◄───────────────────────────────────────────── [ comic_cosmetics_catalog ]
```

## 3.1 Script DDL Completo de Tablas de Telemetría y Bark Engine

```sql
-- ============================================================================
-- 1. TABLA: player_tactical_behavior_profile
-- Perfil psicológico y hábitos tácticos consolidados del jugador (Cross-Match)
-- ============================================================================
CREATE TABLE public.player_tactical_behavior_profile (
    user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
    
    -- Métricas de Ritmo y Psicología de Decisión (PTE & Tilt)
    avg_pte_seconds NUMERIC(4,1) NOT NULL DEFAULT 25.0,
    fastest_turn_seconds NUMERIC(4,1) NOT NULL DEFAULT 6.0,
    slowest_turn_seconds NUMERIC(4,1) NOT NULL DEFAULT 58.0,
    tilt_index NUMERIC(3,2) NOT NULL DEFAULT 0.00 CHECK (tilt_index >= 0.00 AND tilt_index <= 1.00),
    patience_score NUMERIC(3,2) NOT NULL DEFAULT 0.50 CHECK (patience_score >= 0.00 AND patience_score <= 1.00),
    aggression_index NUMERIC(3,2) NOT NULL DEFAULT 0.50 CHECK (aggression_index >= 0.00 AND aggression_index <= 1.00),
    
    -- Hábitos de Gestión Económica
    avg_unspent_funds_per_turn INTEGER NOT NULL DEFAULT 450,
    factory_idle_turns_total INTEGER NOT NULL DEFAULT 0,
    prefers_high_cost_units BOOLEAN NOT NULL DEFAULT false,
    
    -- Sesgos de Mazo y Preferencias Bélicas
    favorite_unit_code VARCHAR(32) NOT NULL DEFAULT 'tank_light',
    most_lost_unit_code VARCHAR(32) NOT NULL DEFAULT 'infantry',
    favorite_branch VARCHAR(16) NOT NULL DEFAULT 'land' CHECK (favorite_branch IN ('land', 'air', 'naval', 'balanced')),
    air_bias_percentage NUMERIC(5,2) NOT NULL DEFAULT 20.00,
    siege_bias_percentage NUMERIC(5,2) NOT NULL DEFAULT 20.00,
    
    -- Comportamiento en Niebla de Guerra y Tácticas
    ambushes_suffered_count INTEGER NOT NULL DEFAULT 0,
    ambushes_inflicted_count INTEGER NOT NULL DEFAULT 0,
    mountain_scouting_frequency NUMERIC(5,2) NOT NULL DEFAULT 15.00,
    
    -- Rendimiento por Modo de Juego
    blitz_matches_played INTEGER NOT NULL DEFAULT 0,
    blitz_win_rate NUMERIC(5,2) NOT NULL DEFAULT 50.00,
    campaign_matches_played INTEGER NOT NULL DEFAULT 0,
    campaign_win_rate NUMERIC(5,2) NOT NULL DEFAULT 50.00,
    
    -- Eventos Límite y Resiliencia
    clutch_wins_count INTEGER NOT NULL DEFAULT 0, -- Ganar con HQ < 20% HP
    early_surrenders_count INTEGER NOT NULL DEFAULT 0, -- Rendirse antes del turno 5
    afk_timeouts_count INTEGER NOT NULL DEFAULT 0,
    comebacks_achieved_count INTEGER NOT NULL DEFAULT 0,
    
    -- Sesiones y Fatiga
    night_matches_played INTEGER NOT NULL DEFAULT 0, -- Partidas entre 00:00 y 05:00
    longest_play_session_minutes INTEGER NOT NULL DEFAULT 45,
    consecutive_loss_streak_peak INTEGER NOT NULL DEFAULT 0,
    consecutive_win_streak_peak INTEGER NOT NULL DEFAULT 0,
    current_streak INTEGER NOT NULL DEFAULT 0, -- Positivo = racha victorias, Negativo = derrotas
    
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX idx_behavior_user ON public.player_tactical_behavior_profile(user_id);

-- ============================================================================
-- 2. TABLA: match_detailed_telemetry
-- Registro granular de eventos por partida para cruce histórico
-- ============================================================================
CREATE TABLE public.match_detailed_telemetry (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    match_id UUID NOT NULL REFERENCES public.active_matches(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    game_mode VARCHAR(24) NOT NULL,
    selected_commander_id VARCHAR(32) NOT NULL,
    opponent_commander_id VARCHAR(32) NOT NULL,
    
    -- Métricas Temporales
    total_turns_played INTEGER NOT NULL DEFAULT 1,
    avg_turn_duration_sec NUMERIC(4,1) NOT NULL DEFAULT 20.0,
    turns_under_10s_count INTEGER NOT NULL DEFAULT 0,
    turns_over_45s_count INTEGER NOT NULL DEFAULT 0,
    
    -- Métricas de Combate
    units_produced_count INTEGER NOT NULL DEFAULT 0,
    units_lost_count INTEGER NOT NULL DEFAULT 0,
    units_killed_count INTEGER NOT NULL DEFAULT 0,
    funds_spent_total INTEGER NOT NULL DEFAULT 0,
    funds_wasted_idle INTEGER NOT NULL DEFAULT 0,
    damage_dealt_total INTEGER NOT NULL DEFAULT 0,
    damage_received_total INTEGER NOT NULL DEFAULT 0,
    
    -- Hitos Específicos de la Partida
    hq_lowest_hp_reached INTEGER NOT NULL DEFAULT 20,
    cop_activations_count INTEGER NOT NULL DEFAULT 0,
    scop_activations_count INTEGER NOT NULL DEFAULT 0,
    fow_traps_triggered INTEGER NOT NULL DEFAULT 0,
    surrendered_early BOOLEAN NOT NULL DEFAULT false,
    won_match BOOLEAN NOT NULL DEFAULT false,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX idx_telemetry_user_history ON public.match_detailed_telemetry(user_id, created_at DESC);
CREATE INDEX idx_telemetry_match ON public.match_detailed_telemetry(match_id);

-- ============================================================================
-- 3. TABLA: commander_bonding_progress
-- Nivel de afinidad y memoria compartida entre el jugador y cada Comandante
-- ============================================================================
CREATE TABLE public.commander_bonding_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    commander_id VARCHAR(32) NOT NULL,
    bonding_level INTEGER NOT NULL DEFAULT 1 CHECK (bonding_level >= 1 AND bonding_level <= 20),
    bonding_xp INTEGER NOT NULL DEFAULT 0,
    matches_together_count INTEGER NOT NULL DEFAULT 0,
    victories_together_count INTEGER NOT NULL DEFAULT 0,
    clutch_wins_together INTEGER NOT NULL DEFAULT 0,
    favorite_unit_assigned VARCHAR(32) DEFAULT NULL,
    unlocked_dialogue_tier INTEGER NOT NULL DEFAULT 1,
    last_interacted_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT uq_user_commander_bonding UNIQUE(user_id, commander_id)
);

CREATE INDEX idx_bonding_lookup ON public.commander_bonding_progress(user_id, commander_id);

-- ============================================================================
-- 4. TABLA: comic_cosmetics_catalog
-- Catálogo de cosméticos de estilo cómic (bocadillos, onomatopeyas, marcos)
-- ============================================================================
CREATE TABLE public.comic_cosmetics_catalog (
    id VARCHAR(64) PRIMARY KEY, -- ej: 'bubble_vintage_dots', 'stamp_boom_gold'
    cosmetic_type VARCHAR(32) NOT NULL CHECK (cosmetic_type IN ('speech_bubble_skin', 'onomatopoeia_stamp', 'vignette_frame', 'comic_font')),
    name VARCHAR(64) NOT NULL,
    description TEXT NOT NULL,
    rarity VARCHAR(16) NOT NULL DEFAULT 'common' CHECK (rarity IN ('common', 'rare', 'epic', 'legendary')),
    css_class_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    is_premium_pass_exclusive BOOLEAN NOT NULL DEFAULT false,
    price_gems INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- ============================================================================
-- 5. TABLA: user_comic_cosmetics
-- Cosméticos de cómic desbloqueados y equipados por el usuario
-- ============================================================================
CREATE TABLE public.user_comic_cosmetics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    cosmetic_id VARCHAR(64) NOT NULL REFERENCES public.comic_cosmetics_catalog(id) ON DELETE CASCADE,
    is_equipped BOOLEAN NOT NULL DEFAULT false,
    unlocked_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT uq_user_comic_item UNIQUE(user_id, cosmetic_id)
);

-- ============================================================================
-- 6. TABLA: bark_dialogue_templates
-- Catálogo paramétrico de diálogos en viñetas de cómic
-- ============================================================================
CREATE TABLE public.bark_dialogue_templates (
    id VARCHAR(64) PRIMARY KEY,
    commander_id VARCHAR(32) NOT NULL, -- 'vance', 'stella', 'volkov', o 'all'
    trigger_situation VARCHAR(48) NOT NULL, -- ej: 'MENU_TILT_STREAK', 'QUEUE_SLOW_PTE', 'MATCH_HQ_HIT', 'POST_CLUTCH_WIN'
    min_bonding_level INTEGER NOT NULL DEFAULT 1,
    required_condition_json JSONB NOT NULL DEFAULT '{}'::jsonb,
    
    -- Parámetros Visuales de Estilo Cómic
    bubble_shape VARCHAR(24) NOT NULL DEFAULT 'speech' CHECK (bubble_shape IN ('speech', 'shout', 'thought', 'whisper', 'radio')),
    onomatopoeia_stamp VARCHAR(32) DEFAULT NULL, -- '¡BOOM!', '¡RATATAT!', '¡TACTICAL!'
    comic_vignette_pose VARCHAR(32) NOT NULL DEFAULT 'neutral' CHECK (comic_vignette_pose IN ('neutral', 'stern', 'angry', 'mocking', 'proud', 'alarmed')),
    
    -- Texto de Viñeta con Variables Paramétricas ({unit}, {turns}, {losses}, etc.)
    dialogue_template_text TEXT NOT NULL,
    priority_weight INTEGER NOT NULL DEFAULT 10,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX idx_bark_templates_lookup ON public.bark_dialogue_templates(commander_id, trigger_situation);
```

---

# SECCIÓN 4: DISPARADORES Y PIPELINE DE ACTUALIZACIÓN DE TELEMETRÍA

Cuando concluye una partida, se ejecuta la función `rpc_process_match_end_telemetry`, la cual:
1. Registra la fila histórica inmutable en `match_detailed_telemetry`.
2. Cruza los datos con la historia previa del jugador en `player_tactical_behavior_profile`:
   - Si la partida se perdió en menos de 6 turnos y el PTE fue menor a 12s, incrementa el `tilt_index` (+0.15).
   - Si el jugador ganó tras haber tenido su HQ con $\le 4$ de vida, suma +1 a `clutch_wins_count` y reduce el `tilt_index` a 0.00.
   - Recalcula el promedio móvil de `avg_pte_seconds`.
3. Incrementa el vínculo en `commander_bonding_progress` (+150 XP al Comandante utilizado).

```sql
CREATE OR REPLACE FUNCTION public.rpc_process_match_end_telemetry(
    p_match_id UUID,
    p_user_id UUID,
    p_telemetry JSONB
)
RETURNS JSONB AS $$
DECLARE
    v_mode VARCHAR(24);
    v_won BOOLEAN;
    v_hq_hp INTEGER;
    v_turns INTEGER;
    v_pte NUMERIC(4,1);
    v_cmd VARCHAR(32);
    v_opp_cmd VARCHAR(32);
BEGIN
    v_mode := (p_telemetry->>'game_mode')::VARCHAR;
    v_won := (p_telemetry->>'won_match')::BOOLEAN;
    v_hq_hp := (p_telemetry->>'hq_lowest_hp_reached')::INTEGER;
    v_turns := (p_telemetry->>'total_turns_played')::INTEGER;
    v_pte := (p_telemetry->>'avg_turn_duration_sec')::NUMERIC;
    v_cmd := (p_telemetry->>'selected_commander_id')::VARCHAR;
    v_opp_cmd := (p_telemetry->>'opponent_commander_id')::VARCHAR;

    -- 1. Insertar telemetría detallada de la partida
    INSERT INTO public.match_detailed_telemetry (
        match_id, user_id, game_mode, selected_commander_id, opponent_commander_id,
        total_turns_played, avg_turn_duration_sec, units_produced_count,
        units_lost_count, units_killed_count, funds_spent_total,
        hq_lowest_hp_reached, won_match
    ) VALUES (
        p_match_id, p_user_id, v_mode, v_cmd, v_opp_cmd,
        v_turns, v_pte, (p_telemetry->>'units_produced_count')::INTEGER,
        (p_telemetry->>'units_lost_count')::INTEGER, (p_telemetry->>'units_killed_count')::INTEGER,
        (p_telemetry->>'funds_spent_total')::INTEGER, v_hq_hp, v_won
    );

    -- 2. Actualizar perfil de comportamiento cruzado
    UPDATE public.player_tactical_behavior_profile
    SET 
        avg_pte_seconds = ROUND((avg_pte_seconds * 0.7 + v_pte * 0.3), 1),
        current_streak = CASE WHEN v_won THEN GREATEST(1, current_streak + 1) ELSE LEAST(-1, current_streak - 1) END,
        consecutive_win_streak_peak = CASE WHEN v_won AND (current_streak + 1) > consecutive_win_streak_peak THEN current_streak + 1 ELSE consecutive_win_streak_peak END,
        consecutive_loss_streak_peak = CASE WHEN NOT v_won AND (ABS(current_streak) + 1) > consecutive_loss_streak_peak THEN ABS(current_streak) + 1 ELSE consecutive_loss_streak_peak END,
        tilt_index = CASE 
            WHEN NOT v_won AND v_pte < 14.0 THEN LEAST(1.00, tilt_index + 0.20)
            WHEN v_won THEN GREATEST(0.00, tilt_index - 0.25)
            ELSE tilt_index 
        END,
        clutch_wins_count = CASE WHEN v_won AND v_hq_hp <= 4 THEN clutch_wins_count + 1 ELSE clutch_wins_count END,
        updated_at = timezone('utc'::text, now())
    WHERE user_id = p_user_id;

    -- 3. Actualizar vínculo con el Comandante
    INSERT INTO public.commander_bonding_progress (user_id, commander_id, bonding_xp, matches_together_count, victories_together_count)
    VALUES (p_user_id, v_cmd, 150, 1, CASE WHEN v_won THEN 1 ELSE 0 END)
    ON CONFLICT (user_id, commander_id) DO UPDATE
    SET bonding_xp = commander_bonding_progress.bonding_xp + 150,
        matches_together_count = commander_bonding_progress.matches_together_count + 1,
        victories_together_count = commander_bonding_progress.victories_together_count + (CASE WHEN v_won THEN 1 ELSE 0 END),
        bonding_level = LEAST(20, 1 + (commander_bonding_progress.bonding_xp + 150) / 1000),
        last_interacted_at = timezone('utc'::text, now());

    RETURN jsonb_build_object('success', true, 'telemetry_processed', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

# SECCIÓN 5: INTEGRACIÓN DE COMANDANTES F2P VS EXCLUSIVOS EN LA MONETIZACIÓN

## 5.1 Trío Free-to-Play Inicial (Estilos de Bocadillo y Personalidad)
| Comandante | Perfil Táctico | Forma de Bocadillo | Estilo de Onomatopeya | Enfoque de Diálogo de Cómic |
| --- | --- | --- | --- | --- |
| **Capitán Vance** | Disciplina / Tanques | `speech` (Formal, bordes rectos) | `¡DOCTRINE!`, `¡HOLD!` | Corrige errores de suministro, reprocha turnos precipitados y elogia defensas sólidas. |
| **Mayor Stella** | Asalto Aéreo / Agro | `shout` (Puntiagudo, agresivo) | `¡RATATAT!`, `¡DIVE!`, `¡BOOM!` | Sarcástica y mordaz. Se burla si juegas demasiado lento y te incita a atacar sin contemplaciones. |
| **Comandante Volkov** | Artillería / Asedio | `thought` y `radio` (Técnico) | `¡CALCULATED!`, `¡IMPACT!` | Frío y matemático. Analiza rangos de tiro y reprende cuando acumulas fondos ociosos. |

## 5.2 Command Pass con Reclamación Retroactiva y Cosméticos de Cómic
* **Vía Gratuita:** Otorga Cofres Básicos, Oro, comodines de cartas y sellos estándar de cómic.
* **Vía Premium (Command Pass):** Desbloquea al Comandante de Temporada en Nivel 1, pieles exclusivas de bocadillos de diálogo (ej. *Bocadillo Vintage Noir*, *Efecto Tinta Japonesa*), marcos de viñeta dorados y cola automática de apertura de cofres.
* **Reclamación Retroactiva Garantizada:** Adquirir el pase en cualquier momento (ej. Nivel 40) desbloquea instantáneamente toda la cascada de recompensas de los niveles 1 al 40.

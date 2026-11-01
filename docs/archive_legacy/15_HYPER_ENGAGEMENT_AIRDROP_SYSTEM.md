# SISTEMA DE SUMINISTROS TÁCTICOS DINÁMICOS EN COMBATE (AIRDROP DYNAMIC BOUNTY)
**Documento Técnico de Integración:** `15_HYPER_ENGAGEMENT_AIRDROP_SYSTEM.md`  
**Referencia de Propuesta:** `HYPER-01`  
**Versión:** 1.0.0-PROD-SPEC  
**Estado:** Especificación de Producción para Integración en Motor Táctico y Metajuego  
**Pila Tecnológica:** TypeScript (Motor Canvas 2D/WebGL), Supabase Realtime, PostgreSQL 15+ (JSONB Delta State), Web Audio Procedural.

---

## 1. RESUMEN EJECUTIVO Y OBJETIVO CONDUCTUAL

El **Sistema de Suministros Tácticos Dinámicos (AirDrop Dynamic Bounty)** introduce un programa de refuerzo de razón variable (Variable Ratio Reinforcement - VR) directamente sobre la cuadrícula táctica determinista. 

Hasta ahora, *Tactical Command* basaba su economía en ingresos fijos predecibles por turno ($1,000G / propiedad), lo que generaba "certeza prematura": a partir del turno 6, el jugador con desventaja material calculaba su derrota inevitable y experimentaba desmotivación, mientras que el jugador con ventaja alcanzaba saciedad cognitiva.

El sistema AirDrop disrumpe este estancamiento mediante el lanzamiento en paracaídas de cajas de suministros militares en celdas neutrales de disputa durante los turnos críticos. Al pisar la caja con cualquier unidad, se desbloquea una recompensa instantánea incierta (inyección de liquidez, recarga de Super CO, planos del metajuego o gemas). Esto crea una tensión constante entre el posicionamiento defensivo conservador y la codicia por botín de alto valor (*Comeback Mechanic*).

```
                      ARQUITECTURA DE FLUJO DE UN AIRDROP
                                       │
                    ┌──────────────────┴──────────────────┐
                    ▼                                     ▼
        [ CONDICIÓN DE TURNO ]                 [ CÁLCULO DE COORDENADAS ]
        • Turnos 2 y 5 (Blitz)                 • Distancia Manhattan Equitativa
        • Turnos 3 y 7 (Campaña)               • Celda Transitable Terrestre
                    │                                     │
                    └──────────────────┬──────────────────┘
                                       ▼
                       [ EVENTO `AIRDROP_SPAWNED` ]
                       • Alerta Sonora Procedural (Radio Estática)
                       • Sello Pop-Art Cómic: ¡AIRDROP!
                       • TTL: 2 Turnos de Vida Útil
                                       │
                    ┌──────────────────┴──────────────────┐
                    ▼                                     ▼
        [ UNIDAD PISA LA CELDA ]              [ EXPIRA TIEMPO (2 Turnos) ]
        • Apertura Instantánea                • Detonación / Desaparición
        • Drop Table Ponderada                • Sello Cómic: ¡LOST!
        • Modificación de Estado Partida
```

---

## 2. ANÁLISIS DE CRUCE Y REFUTACIÓN DE LA DOCUMENTACIÓN EXISTENTE

### 2.1 Refutación de Supuestos en `01_GAME_DESIGN_DOCUMENT.md`
- **Sección 1.1 (Premisa de Cero Azar):** El GDD actual dictamina que el daño y la economía son 100% deterministas. La inclusión del AirDrop **no altera las fórmulas de combate atacante/defensor** (el daño sigue siendo determinista según la tabla oficial). Sin embargo, introduce variabilidad estocástica en la aparición de objetivos tácticos secundarios, emulando la doctrina militar real de "oportunismo logístico".
- **Sección 3.1 (Soft Cap de Suministros):** Las inyecciones de fondos de los AirDrops permiten rebasar momentáneamente el Soft Cap de 14 tropas si el jugador decide invertir en un contraataque masivo.

### 2.2 Modificación de `03_GAME_ENGINE_ARCHITECTURE.md`
- El motor de turnos (`TurnManager.ts`) debe evaluar al inicio de cada ciclo de ronda (`onRoundStart`) si el turno global califica para una tirada de inserción de AirDrop.
- El serializador de estado (`match_state`) debe incorporar la entidad `airdrops` dentro del árbol JSONB del mapa.

---

## 3. MODELO MATEMÁTICO Y REGLAS DE DESPLIEGUE

### 3.1 Algoritmo de Localización Equidistante (Fair Distance Allocation)
Para evitar que un AirDrop beneficie injustamente a un jugador por azar de proximidad, el algoritmo de selección de casillas filtra la matriz del mapa según la métrica de distancia Manhattan $D_M$:

$$D_M(P, C) = |x_P - x_C| + |y_P - y_C|$$

Donde $HQ_1$ y $HQ_2$ son los Cuarteles Generales de ambos bandos:
1. Se genera el conjunto de celdas candidatas $S_{valid}$:
   $$S_{valid} = \{ C(x,y) \mid |D_M(HQ_1, C) - D_M(HQ_2, C)| \le 1 \land \text{Terrain}(C) \in \{\text{plain, forest, road}\} \land \text{Unit}(C) = \emptyset \}$$
2. Si $S_{valid}$ contiene más de una celda, se aplica un hash determinista basado en `(match_id, turn_number)` para seleccionar la coordenada final sin desincronización entre clientes.

### 3.2 Tabla de Probabilidades Ponderadas (Loot Drop Matrix)

| Categoría de Recompensa | Probabilidad | Carga Útil (Payload) | Impacto Inmediato | Impacto Metajuego |
|:---|:---:|:---|:---|:---|
| **Inyección de Fondos** | **55%** | `+1,500G` (Blitz) / `+2,500G` (Campaña) | Fondos directos a la tesorería de partida | Ninguno |
| **Sobrecarga de Comando**| **25%** | `CO_POWER_GAUGE += 100%` | Carga instantánea del Superpoder del Comandante | +15 XP de Vínculo CO |
| **Planos Tácticos** | **15%** | 5 a 15 cartas de unidades o 10 Vigas de Acero | Ninguno en la partida en curso | Acreditado a `user_inventory` al finalizar |
| **Bolsa de Gemas** | **5%** | 3 a 5 Gemas de Mando (`command_gems`) | Sello Pop-Art ¡JACKPOT! en pantalla | Acreditado a `profiles.command_gems` |

---

## 4. ESPECIFICACIÓN DE BASE DE DATOS Y PERSISTENCIA (SUPABASE DDL)

Para integrar los AirDrops en el ciclo de persistencia de partidas activas y telemetría, se realizan las siguientes extensiones sobre el esquema de `02_DATABASE_SCHEMA.md`:

```sql
-- ============================================================================
-- EXTENSIÓN PARA SISTEMA DE AIRDROPS EN PARTIDA
-- ============================================================================

-- 1. Modificación de la tabla match_state para incorporar array de airdrops activos
ALTER TABLE public.match_state 
ADD COLUMN IF NOT EXISTS airdrops JSONB NOT NULL DEFAULT '[]'::jsonb;

-- Comentario de estructura esperada para 'airdrops':
-- [
--   {
--     "id": "drop_turn2_x8_y8",
--     "x": 8,
--     "y": 8,
--     "spawn_turn": 2,
--     "expires_turn": 4,
--     "reward_type": "funds",
--     "reward_value": 1500,
--     "is_claimed": false,
--     "claimed_by": null
--   }
-- ]

-- 2. Registro de auditoría de airdrops reclamados para análisis de telemetría
CREATE TABLE public.match_airdrop_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    match_id UUID NOT NULL REFERENCES public.active_matches(id) ON DELETE CASCADE,
    turn_number INTEGER NOT NULL,
    player_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    unit_type VARCHAR(32) NOT NULL,
    reward_type VARCHAR(32) NOT NULL CHECK (reward_type IN ('funds', 'co_power', 'blueprints', 'gems')),
    reward_payload JSONB NOT NULL,
    tile_x INTEGER NOT NULL,
    tile_y INTEGER NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX idx_airdrop_events_match ON public.match_airdrop_events(match_id);
CREATE INDEX idx_airdrop_events_player ON public.match_airdrop_events(player_id);

-- 3. Función RPC para procesar la captura de un airdrop con validación atómica
CREATE OR REPLACE FUNCTION public.claim_airdrop(
    p_match_id UUID,
    p_player_id UUID,
    p_airdrop_id TEXT,
    p_unit_id TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_state public.match_state%ROWTYPE;
    v_drops JSONB;
    v_drop JSONB;
    v_updated_drops JSONB := '[]'::jsonb;
    v_found BOOLEAN := false;
    v_reward_type TEXT;
    v_reward_value JSONB;
    v_funds JSONB;
    v_powers JSONB;
    v_turn_player UUID;
BEGIN
    -- Validar que la partida esté en progreso y sea el turno del jugador
    SELECT current_turn_player_id INTO v_turn_player
    FROM public.active_matches
    WHERE id = p_match_id AND status = 'in_progress';

    IF v_turn_player IS NULL OR v_turn_player <> p_player_id THEN
        RAISE EXCEPTION 'No es el turno del jugador solicitante o la partida ha concluido.';
    END IF;

    -- Obtener estado actual
    SELECT * INTO v_state FROM public.match_state WHERE match_id = p_match_id FOR UPDATE;
    v_drops := v_state.airdrops;

    -- Iterar y buscar el airdrop
    FOR v_drop IN SELECT * FROM jsonb_array_elements(v_drops)
    LOOP
        IF (v_drop->>'id') = p_airdrop_id AND (v_drop->>'is_claimed')::boolean = false THEN
            v_found := true;
            v_reward_type := v_drop->>'reward_type';
            v_reward_value := v_drop->'reward_value';

            -- Marcar como reclamado
            v_updated_drops := v_updated_drops || jsonb_build_array(
                v_drop || jsonb_build_object('is_claimed', true, 'claimed_by', p_player_id)
            );
        ELSE
            v_updated_drops := v_updated_drops || jsonb_build_array(v_drop);
        END IF;
    END LOOP;

    IF NOT v_found THEN
        RAISE EXCEPTION 'El AirDrop solicitado no existe o ya ha sido reclamado.';
    END IF;

    -- Aplicar recompensa in-game de forma atómica
    v_funds := v_state.player_funds;
    v_powers := v_state.co_power_gauge;

    IF v_reward_type = 'funds' THEN
        IF p_player_id = (SELECT player1_id FROM public.active_matches WHERE id = p_match_id) THEN
            v_funds := jsonb_set(v_funds, '{player1}', to_jsonb((v_funds->>'player1')::int + (v_reward_value)::int));
        ELSE
            v_funds := jsonb_set(v_funds, '{player2}', to_jsonb((v_funds->>'player2')::int + (v_reward_value)::int));
        END IF;
    ELSIF v_reward_type = 'co_power' THEN
        IF p_player_id = (SELECT player1_id FROM public.active_matches WHERE id = p_match_id) THEN
            v_powers := jsonb_set(v_powers, '{player1}', '100'::jsonb);
        ELSE
            v_powers := jsonb_set(v_powers, '{player2}', '100'::jsonb);
        END IF;
    END IF;

    -- Actualizar match_state
    UPDATE public.match_state
    SET airdrops = v_updated_drops,
        player_funds = v_funds,
        co_power_gauge = v_powers,
        updated_at = timezone('utc'::text, now())
    WHERE match_id = p_match_id;

    -- Registrar evento para telemetría
    INSERT INTO public.match_airdrop_events (
        match_id, turn_number, player_id, unit_type, reward_type, reward_payload, tile_x, tile_y
    ) VALUES (
        p_match_id,
        (SELECT turn_number FROM public.active_matches WHERE id = p_match_id),
        p_player_id,
        p_unit_id,
        v_reward_type,
        v_reward_value,
        (v_drop->>'x')::int,
        (v_drop->>'y')::int
    );

    RETURN jsonb_build_object(
        'success', true,
        'reward_type', v_reward_type,
        'reward_value', v_reward_value
    );
END;
$$;
```

---

## 5. INTEGRACIÓN EN FRONTEND, CANVAS Y BARK ENGINE

### 5.1 Renderizado en Canvas 2D / WebGL
1. **Animación de Caída:** Cuando el WebSocket recibe el evento `AIRDROP_SPAWNED`, el renderer de Canvas instancia un sprite de caja con paracaídas militar que desciende desde $Y = -64\text{px}$ hasta la celda destino durante $1.2\text{s}$ con interpolación de rebote (*easeOutBounce*).
2. **Efecto de Baliza:** Una vez en tierra, la celda renderiza un pulso translúcido amarillo/dorado (`ctx.arc` con gradiente radial y `globalAlpha` oscilante mediante $\sin(\text{time} \times 4)$).
3. **Sellos Pop-Art del Bark Engine:**
   - Al aterrizar: viñeta lateral con sello `¡AIRDROP ENTRANDO!`.
   - Al ser reclamado: sello de choque `¡BOTÍN CAPTURADO!` con partículas de monedas doradas y destellos estilo cómic.
   - Si expira sin ser reclamado: sello `¡EXPLOSIÓN!` con viñeta sarcástica del Comandante: *"¿Tanto miedo le tenías al fuego enemigo que dejaste pudrir esos suministros?"*.

### 5.2 Diseño Sonoro Procedural (Web Audio API)
No se utilizan archivos `.mp3` ni `.wav`. El audio se sintetiza al vuelo:
- **Sonido de Alerta de Lanzamiento:** Dos osciladores senoidales entrelazados en $520\,\text{Hz}$ y $660\,\text{Hz}$ modulados por un LFO en diente de sierra simulando una sirena militar de radio.
- **Sonido de Captura:** Arpegio ascendente de tres tonos en onda triangular ($440\,\text{Hz} \to 554\,\text{Hz} \to 659\,\text{Hz}$) con decaimiento rápido de ganancia ($0.15\text{s}$).

---

## 6. PROTOCOLO DE RED Y SINCRONIZACIÓN EDGE

El ciclo de vida del AirDrop viaja a través del canal de Supabase Realtime `match_feed:match_id`:

```json
// Broadcast al inicio del turno si hay AirDrop
{
  "event": "AIRDROP_SPAWNED",
  "payload": {
    "id": "drop_t2_8_8",
    "x": 8,
    "y": 8,
    "expires_at_turn": 4,
    "rarity": "rare"
  }
}

// Broadcast cuando una unidad entra a la casilla
{
  "event": "AIRDROP_CLAIMED",
  "payload": {
    "id": "drop_t2_8_8",
    "claimed_by_player_id": "8b3f2e10-...",
    "reward_type": "funds",
    "reward_amount": 1500,
    "unit_id": "tank_light_03"
  }
}
```

---

## 7. RIESGOS CRÍTICOS Y PLAN DE MITIGACIÓN

1. **Riesgo: Parálisis por Trampas en Niebla de Guerra:**
   - *Escenario:* Un jugador ve el AirDrop pero teme avanzar porque podría haber una emboscada (`¡TRAP!`) en un bosque intermedio.
   - *Mitigación:* La celda donde cae el AirDrop emite una pequeña ráfaga de visibilidad de radio 1 durante el turno de su aterrizaje, incentivando la carrera sin convertirlo en un suicidio a ciegas.
2. **Riesgo: Exceso de Liquidez (Snowball Effect):**
   - *Escenario:* El jugador dominante toma el AirDrop y amplía su ventaja a niveles irremontables.
   - *Mitigación:* Mecánica elástica (*Rubber-banding*): si el jugador que captura el AirDrop tiene un valor militar menor al 60% del rival, la recompensa de oro se incrementa automáticamente en un $+35\%$ (`Underdog Bonus`).

---

## 8. CONCLUSIÓN Y TAREAS DE IMPLEMENTACIÓN

El Sistema de Suministros Dinámicos reconecta la tensión estratégica con la recompensa inmediata. Transforma momentos de transición lenta en carreras frenéticas por el control de la casilla neutral, garantizando picos de dopamina cada 90-120 segundos de juego.

- [ ] **Tarea DB-1:** Ejecutar migración SQL para `match_state.airdrops` y tabla `match_airdrop_events`.
- [ ] **Tarea Engine-1:** Implementar generador de coordenadas equidistantes en `AirdropService.ts`.
- [ ] **Tarea UI-1:** Crear sprite procedimental de baliza y animación de paracaídas en Canvas.
- [ ] **Tarea Bark-1:** Integrar plantillas de diálogo de la Mayor Stella para captura y pérdida de AirDrop.

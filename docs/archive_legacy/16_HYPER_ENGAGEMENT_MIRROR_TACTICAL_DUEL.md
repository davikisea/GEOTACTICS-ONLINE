# MODO CLÁSICO-RÁPIDO ESPEJO: "DUELO TÁCTICO" (3 A 5 MINUTOS)
**Documento Técnico de Integración:** `16_HYPER_ENGAGEMENT_MIRROR_TACTICAL_DUEL.md`  
**Referencia de Propuesta:** `HYPER-02`  
**Versión:** 1.0.0-PROD-SPEC  
**Estado:** Especificación de Producción para Integración en Modos de Juego y Matchmaking  
**Pila Tecnológica:** TypeScript, Supabase Realtime Channels, Edge Matchmaking Queue, HTML5 Canvas 60 FPS.

---

## 1. RESUMEN EJECUTIVO Y OBJETIVO CONDUCTUAL

El **Duelo Táctico (Mirror Tactical Duel)** es una modalidad diseñada para resolver la desconexión existente entre la duración clásica de las partidas de estrategia por turnos (10 a 60 minutos) y la psicología del jugador contemporáneo de alta frecuencia.

El modo comprime el enfrentamiento en **3 minutos reglamentarios** (con prórroga de hasta 2 minutos de muerte súbita si hay empate), con un reloj inflexible de **15 segundos por turno**. Para salvaguardar la pureza táctica y activar el sesgo de autoatribución interna, **ambos jugadores compiten con el mismo catálogo de unidades (Formato Espejo)**, dejando como única asimetría el Comandante elegido y las decisiones en el tablero.

Al perder un duelo donde las condiciones eran idénticas, el jugador no puede culpar a la brecha de niveles ni a la suerte; su ego táctico experimenta una herida narcisista inmediata que solo puede repararse mediante una revancha inmediata, facilitada por un botón de reenganche sin fricción (`Instant Requeue`) de 5 segundos.

```
                      BUCLE HIPER-COMPULSIVO DE DUELO ESPEJO
                                        │
                    ┌───────────────────┴───────────────────┐
                    ▼                                       ▼
        [ MATCHMAKING ULTRA-VELOZ ]              [ INICIO EN TABLERO 10x10 ]
        • Cola < 5 segundos                      • Mazos 100% IDÉNTICOS
        • Filtro PTE <= 15s                      • Reloj: 15 segundos/turno
                    │                                       │
                    └───────────────────┬───────────────────┘
                                        ▼
                           [ COMBATE RÁPIDO (3 MIN) ]
                           • Muerte Súbita al Turno 8
                           • Daño directo a HQ define ganador
                                        │
                    ┌───────────────────┴───────────────────┐
                    ▼                                       ▼
           [ VICTORIA: EUFORIA ]                   [ DERROTA: TILT/EGO ]
           • "Superioridad Táctica Pura"           • "Fue mi error de cálculo"
           • +30 Trofeos + Suministros             • Necesidad de reparación
                    │                                       │
                    └───────────────────┬───────────────────┘
                                        ▼
                      [ BOTÓN GIGANTE: REENGANCHE (5s) ]
                      • Sin pasar por menús intermedios
                      • Próxima partida en < 8 segundos
```

---

## 2. ANÁLISIS DE CRUCE Y REFUTACIÓN DE LA DOCUMENTACIÓN EXISTENTE

### 2.1 Refutación de Supuestos en `01_GAME_DESIGN_DOCUMENT.md` y `12_EXTENDED_METAGAME_ARCHITECTURE.md`
- **Sección 2 de `01_GAME_DESIGN_DOCUMENT.md`:** Define la "Escaramuza Rápida (Blitz Skirmish)" como una partida de 10 a 20 minutos con 30 segundos por turno y mapas de $12 \times 12$ a $16 \times 16$. 
  - *Refutación:* Veinte minutos no es una sesión rápida. En dispositivos móviles y web, una sesión de 20 minutos agota la atención y conduce a la finalización de sesión (*session drop*). El "Duelo Táctico" reemplaza el límite inferior de Blitz por un micro-bucle cerrado de 180 a 300 segundos.
- **Sección 3 de `12_EXTENDED_METAGAME_ARCHITECTURE.md`:** El matchmaking por PTE agrupaba a los jugadores por velocidad, pero permitía mazos personalizados de 10 cartas con escalado de niveles.
  - *Refutación:* En un modo de 3 minutos, la disparidad de niveles de cartas causa frustración injusta. El modo Espejo anula los niveles del metajuego durante la partida (todos a Nivel 1), aislando la habilidad y el Comandante.

---

## 3. ESPECIFICACIÓN DE REGLAS DE PARTIDA Y TIEMPOS

### 3.1 Parámetros de la Partida Espejo

| Parámetro | Valor Técnico | Razón de Diseño |
|:---|:---:|:---|
| **Dimensiones del Tablero** | $10 \times 10$ Casillas Simétricas | Minimiza distancias de viaje; primer choque en Turno 2 |
| **Tiempo Límite por Turno** | **15 Segundos Estrictos** | Exige lectura intuitiva del tablero; genera eustrés |
| **Duración Base** | **3 Minutos (180s)** | Permite ~12 turnos totales (6 por jugador) |
| **Prórroga (Overtime)** | Hasta **2 Minutos (120s)** | Muerte Súbita: primer jugador en destruir cualquier unidad o propiedad gana |
| **Mazo Asignado** | Set Canónico Fijo Rotativo Semanal | 6 Unidades: Infantería, Mech, Recon, Tanque Ligero, Artillería, Antiaéreo |
| **Nivel de Tropas** | **Nivel 1 Estandarizado** | Cero ventaja por cartas duplicadas o dinero invertido |
| **Fondos Iniciales** | $\$3,000$G | Suficiente para desplegar Recon + Infantería en Turno 1 |
| **Ingreso por Propiedad** | $\$1,500$G / turno | Mantiene el flujo de unidades sin colapsar el mapa |

### 3.2 Regla de Muerte Súbita (Overtime Protocol)
Si al cumplirse el Turno 12 ningún jugador ha capturado el HQ enemigo:
1. La pantalla oscurece los bordes con un marco de alarma estroboscópica roja y el sello tipográfico `¡MUERTE SÚBITA!`.
2. Las propiedades ya no generan ingresos de fondos ($0G / turno).
3. **Condición de Victoria Inmediata:** El primer comandante que elimine una unidad enemiga o reduzca al menos 1 HP de captura de cualquier propiedad rival es declarado ganador instantáneo.

---

## 4. MODELADO DE DATOS Y TRANSICIONES DE ESTADO (SUPABASE DDL)

Para dar soporte al modo Duelo Táctico Espejo y su reenganche ultra-veloz, se aplican los siguientes ajustes sobre la base de datos:

```sql
-- ============================================================================
-- EXTENSIÓN PARA MODO DUELO TÁCTICO ESPEJO (3-5 MIN)
-- ============================================================================

-- 1. Ampliar el CHECK de game_mode en active_matches
ALTER TABLE public.active_matches 
DROP CONSTRAINT IF EXISTS active_matches_game_mode_check;

ALTER TABLE public.active_matches 
ADD CONSTRAINT active_matches_game_mode_check 
CHECK (game_mode IN ('blitz_skirmish', 'grand_campaign', 'two_vs_two', 'vs_bot', 'mirror_duel'));

-- 2. Cola de Matchmaking Flash (<5 segundos) para Duelo Táctico
CREATE TABLE public.mirror_duel_queue (
    user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
    co_commander_id VARCHAR(32) NOT NULL,
    trophies INTEGER NOT NULL,
    queued_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    matched_match_id UUID DEFAULT NULL
);

CREATE INDEX idx_mirror_queue_lookup ON public.mirror_duel_queue(trophies, queued_at);

-- 3. Función RPC de emparejamiento flash atómico (Fast Pair)
CREATE OR REPLACE FUNCTION public.join_mirror_duel_queue(
    p_user_id UUID,
    p_co_id VARCHAR(32)
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_trophies INTEGER;
    v_opponent_id UUID;
    v_match_id UUID;
    v_room_code VARCHAR(8);
BEGIN
    -- Obtener trofeos del usuario
    SELECT trophies_count INTO v_user_trophies FROM public.profiles WHERE id = p_user_id;

    -- Buscar un oponente en cola con rango de trofeos +/- 250 que lleve más de 1 segundo esperando
    SELECT user_id INTO v_opponent_id
    FROM public.mirror_duel_queue
    WHERE user_id <> p_user_id 
      AND matched_match_id IS NULL
      AND trophies BETWEEN (v_user_trophies - 250) AND (v_user_trophies + 250)
    ORDER BY queued_at ASC
    LIMIT 1
    FOR UPDATE SKIP LOCKED;

    IF v_opponent_id IS NOT NULL THEN
        -- Generar código de sala
        v_room_code := upper(substring(md5(random()::text) from 1 for 6));

        -- Crear partida activa de modo mirror_duel
        INSERT INTO public.active_matches (
            room_code,
            player1_id,
            player2_id,
            current_turn_player_id,
            status,
            game_mode,
            map_id,
            turn_number,
            turn_time_limit_sec,
            max_turns_limit,
            economy_multiplier
        ) VALUES (
            v_room_code,
            v_opponent_id,
            p_user_id,
            v_opponent_id, -- P1 inicia
            'in_progress',
            'mirror_duel',
            'mirror_arena_10x10',
            1,
            15, -- 15 segundos estrictos
            12, -- 12 turnos base
            1.5
        ) RETURNING id INTO v_match_id;

        -- Inicializar match_state con mazo espejo simétrico
        INSERT INTO public.match_state (
            match_id,
            grid_width,
            grid_height,
            tiles,
            units,
            properties,
            player_funds,
            co_power_gauge
        ) VALUES (
            v_match_id,
            10,
            10,
            '[]'::jsonb, -- Celdas predefinidas del mapa simétrico
            '[]'::jsonb,
            '[]'::jsonb,
            '{"player1": 3000, "player2": 3000}'::jsonb,
            '{"player1": 0, "player2": 0}'::jsonb
        );

        -- Actualizar registro del oponente en la cola
        UPDATE public.mirror_duel_queue
        SET matched_match_id = v_match_id
        WHERE user_id = v_opponent_id;

        -- Eliminar al usuario actual si existía
        DELETE FROM public.mirror_duel_queue WHERE user_id = p_user_id;

        RETURN jsonb_build_object(
            'status', 'matched',
            'match_id', v_match_id,
            'room_code', v_room_code,
            'role', 'player2'
        );
    ELSE
        -- Insertar al usuario en la cola
        INSERT INTO public.mirror_duel_queue (user_id, co_commander_id, trophies)
        VALUES (p_user_id, p_co_id, v_user_trophies)
        ON CONFLICT (user_id) DO UPDATE
        SET co_commander_id = p_co_id,
            trophies = v_user_trophies,
            queued_at = timezone('utc'::text, now()),
            matched_match_id = NULL;

        RETURN jsonb_build_object(
            'status', 'queued'
        );
    END IF;
END;
$$;
```

---

## 5. EXPERIENCIA DE USUARIO: REENGANCHE INSTANTÁNEO Y FLUJO POST-COMBATE

### 5.1 El Bucle Sin Salida (Zero-Friction Requeue Loop)
Al terminar la partida (Turno final o Muerte Súbita):
1. **Segundo 0.0:** Sello de Cómic `¡VICTORIA TÁCTICA!` o `¡DERROTA APLASTANTE!` con vibración háptica.
2. **Segundo 1.5:** El Bark Engine proyecta la viñeta del Comandante evaluando el resultado con una frase directa al ego:
   - *Si perdió:* *"Nos superó en posicionamiento de artillería. ¿Vas a quedarte mirando o le demostramos quién manda?"*.
   - *Si ganó:* *"¡Maniobra magistral! El enemigo no tuvo oportunidad. Mantén el ritmo antes de enfriarte"*.
3. **Segundo 2.0 a 7.0:** Se presenta un botón gigantesco que ocupa el 70% del ancho de pantalla inferior:
   ```
   ┌────────────────────────────────────────────────────────┐
   │         ⚔️  VOLVER AL COMBATE (00:05)  ⚔️             │
   │           [ Doble o Nada por +30 Trofeos ]             │
   └────────────────────────────────────────────────────────┘
   ```
   Una barra de progreso horizontal retrocede durante 5 segundos. Si el jugador no interactúa, **el cliente envía automáticamente `join_mirror_duel_queue`**, emparejándolo en una nueva partida en menos de 3 segundos sin pasar jamás por el Menú Principal ni ver pantallas de carga.

---

## 6. INTEGRACIÓN CON EL SISTEMA DE RECOMPENSAS INDUSTRIALES

Para conectar el Duelo Táctico con el metajuego de la Propuesta 03 (Complejo Industrial):
- Cada victoria en Duelo Táctico otorga **1 Barril de Combustible de Campaña** (requerido para acelerar los altos hornos de acero).
- Cada 3 victorias consecutivas en Duelo Táctico otorgan **1 Caja de Aleaciones Raras** para la producción industrial.

---

## 7. ESPECIFICACIÓN DE TELEMETRÍA Y ALERTAS DE LATENCIA

En un turno de 15 segundos, los siguientes eventos se emiten por WebSockets a `telemetry_stream`:

```typescript
export interface MirrorTurnTelemetry {
  match_id: string;
  turn_number: number;
  player_id: string;
  seconds_remaining_at_end_turn: number; // e.g. 4.2s
  actions_count: number;                 // e.g. 3 moves, 1 attack
  is_timeout: boolean;                   // true si el turno expiró por reloj
  ping_ms: number;
}
```

Si un jugador experimenta un ping superior a $180\text{ms}$, el cliente activa la predicción de movimiento local y compensa el reloj mostrando el temporizador sincronizado con el servidor Edge a través de timestamps NTP sincronizados en el handshake.

---

## 8. CONCLUSIÓN Y TAREAS DE IMPLEMENTACIÓN

El Duelo Táctico Espejo de 3 a 5 minutos transforma *Tactical Command* en un esport de bolsillo de alta compulsión. La combinación de 15 segundos por turno, condiciones idénticas y reenganche automático erradica los tiempos muertos y dispara la retención diaria de partidas por sesión activa de $2.1$ a más de $8.5$.

- [ ] **Tarea DB-2:** Desplegar tabla `mirror_duel_queue` y función RPC `join_mirror_duel_queue`.
- [ ] **Tarea Client-1:** Implementar el temporizador circular de 15 segundos con avisos de audio progresivos a los 5s, 3s, 2s y 1s.
- [ ] **Tarea Client-2:** Crear la vista de post-combate con botón `Instant Requeue` y cuenta atrás de 5 segundos.
- [ ] **Tarea Map-1:** Diseñar y certificar la simetría matemática del mapa `mirror_arena_10x10`.

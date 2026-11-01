# REDES MULTIJUGADOR, PROTOCOLO Y ARQUITECTURA DE IA (BOTS)
**Proyecto:** *Tactical Command: Wars of Legacy*  
**Versión:** 1.0.0-PROD-SPEC  
**Pila Tecnológica:** Supabase Realtime (WebSockets / Postgres Changes), Vercel Edge Functions, TypeScript.

---

## 1. SISTEMA MULTIJUGADOR REALTIME (SUPABASE REALTIME)

El juego utiliza el canal Realtime de Supabase con el esquema `postgres_changes` complementado con canales de difusión ultrarrápida `broadcast` para sincronización de cursores/animaciones en vivo sin recargar la base de datos.

```
       JUGADOR 1                               SERVIDOR / REALTIME                         JUGADOR 2
           |                                            |                                      |
           |-- 1. ACTION: MOVE_AND_ATTACK ------------->|                                      |
           |   (Validación en Edge Function)            |                                      |
           |                                            |-- 2. Broadcast 'unit_animating' ---->|
           |                                            |   (Renderiza trayectoria en vivo)    |
           |                                            |                                      |
           |                                            |-- 3. Aplica cambios en DB (RLS) ---->|
           |                                            |   (Dispara evento postgres_changes)  |
           |                                            |                                      |
           |<-- 4. ACK (Confirmación) ------------------|-- 5. UPDATE: match_state ----------->|
           |                                            |                                      |
```

### 1.1 Definición del Protocolo de Acciones (Payload Schemas)

```typescript
export type TacticalActionType = 
  | 'SPAWN_UNIT'
  | 'MOVE_UNIT'
  | 'ATTACK_TARGET'
  | 'CAPTURE_PROPERTY'
  | 'TRIGGER_CO_POWER'
  | 'END_TURN';

export interface BaseActionMessage {
  matchId: string;
  senderId: string;
  sequenceId: number;
  timestamp: number;
}

export interface SpawnUnitAction extends BaseActionMessage {
  type: 'SPAWN_UNIT';
  unitCode: string;
  factoryPosition: { x: number; y: number };
}

export interface MoveUnitAction extends BaseActionMessage {
  type: 'MOVE_UNIT';
  unitId: string;
  path: { x: number; y: number }[];
}

export interface AttackTargetAction extends BaseActionMessage {
  type: 'ATTACK_TARGET';
  attackerUnitId: string;
  targetUnitId: string;
  targetPosition: { x: number; y: number };
}

export interface CapturePropertyAction extends BaseActionMessage {
  type: 'CAPTURE_PROPERTY';
  unitId: string;
  propertyPosition: { x: number; y: number };
}

export interface EndTurnAction extends BaseActionMessage {
  type: 'END_TURN';
  nextPlayerId: string;
}
```

### 1.2 Manejo de Desconexiones y Reloj Dinámico Anti-AFK
En un juego táctico por turnos, un jugador inactivo o que desconecta no puede secuestrar el tiempo del rival. El sistema implementa un reloj dinámico:

1. **Temporizador según Modo de Juego:**
   - **Escaramuza Rápida (Blitz Skirmish):** **30 segundos** por turno.
   - **Campaña Táctica (Grand Campaign):** **60 segundos** por turno.
2. **Penalización por Inactividad (Anti-Roping):**
   - Si un jugador agota su tiempo de turno sin ejecutar ninguna acción (mover, atacar, fabricar o capturar), el servidor reduce su tiempo de turno en la siguiente ronda al **50%** (15s en Blitz / 30s en Campaña).
   - Si repite la inactividad por segundo turno consecutivo, el temporizador se comprime a **10 segundos**.
   - Al acumular **3 turnos consecutivos inactivo**, el servidor declara automáticamente **Derrota por Abandono (AFK Forfeit)**, otorgando la victoria y trofeos completos al jugador activo.
3. **Heartbeat y Presencia (Presence API):**
   - Ping cada 5 segundos al canal `match:{id}:presence`.
   - Si no hay señal en 30s, se activa un reloj de gracia de 60s. Si el socket no rehidrata el estado mediante `get_current_match_state(match_id)`, se declara abandono.

---

### 1.3 Algoritmo de Matchmaking por Ritmo de Juego (PTE)
El emparejamiento no solo evalúa el nivel de trofeos, sino el **Promedio de Tiempo de Espera (PTE)** del jugador para emparejar perfiles mentales compatibles:

$$PTE = \frac{\sum_{i=1}^{M} \text{Tiempo Usado en Turno}_i}{\text{Total de Turnos Jugados en las Últimas 10 Partidas}}$$

- **Perfil Blitz (Fast):** PTE $\le 15$ segundos (Predominante en Escaramuzas Rápidas).
- **Perfil Estándar (Tactical):** PTE entre $16$ y $35$ segundos.
- **Perfil Analítico (Calculated):** PTE entre $36$ y $60$ segundos (Predominante en Campaña Táctica).

#### Fases de la Cola de Emparejamiento:
- **Fase 1 (0 - 5 s):** Mismo Modo + Trofeos $\pm 100$ + Misma categoría de PTE.
- **Fase 2 (6 - 12 s):** Mismo Modo + Trofeos $\pm 200$ + Categorías de PTE adyacentes.
- **Fase 3 (> 12 s):** Expansión a Trofeos $\pm 300$, priorizando entrar a partida sobre la paridad de PTE.

---

### 1.4 Protocolo del Modo Cooperativo 2v2 (Turnos Cruzados)
- **Secuencia de Turnos:** Orden cruzado: **Jugador A1 $\rightarrow$ Jugador B1 $\rightarrow$ Jugador A2 $\rightarrow$ Jugador B2**.
- **Gestión Económica:** Cada jugador gestiona sus propios fondos ($) generados por sus capturas. No hay pozo común para evitar que un aliado consuma los recursos del otro.
- **Herramienta de Ping Táctico:** Sistema de marcado en el mapa para señalar objetivos y amenazas al compañero de equipo mediante los eventos `PING_ATTACK` (marcar objetivo), `PING_DEFEND` (solicitar defensa), `PING_MOVE` (indicar desplazamiento) y `PING_ASSIST` (pedir apoyo).

---

### 1.5 Capa Social y Moderación de Chat
- **Menú Principal:** Chat Global con salas regionales, canales de Clanes y canal de reclutamiento 2v2.
- **En Partida:**
  - *Chat de Alianza (2v2):* Canal de texto privado en tiempo real.
  - *Mensajes Directos (DM al Rival):* Quick Chat predeterminado ("¡Buen disparo!", "¡Bien jugado!") y texto libre filtrado por regex contra lenguaje tóxico.
  - *Botón de Pánico "Mute":* Silencia instantáneamente todos los mensajes y emotes del rival con un solo toque.

---

## 2. PREVENCIÓN DE TRAMPAS Y VALIDACIÓN EN EL SERVIDOR (EDGE FUNCTION)

Para garantizar la integridad competitiva, el cliente **nunca escribe directamente** el estado del juego arbitrariamente. Todas las acciones se envían a la Edge Function `/api/match/dispatch-action`.

### 2.1 Verificaciones Críticas en Edge Function:
1. **Validación de Turno:** `auth.uid() == active_matches.current_turn_player_id`.
2. **Validación de Propiedad:** La unidad seleccionada debe pertenecer al `senderId`.
3. **Validación de Rango de Movimiento:** Recalcula el coste del `path` enviado usando el mapa de costes de terreno. Si la longitud o coste excede los `movementPoints`, se rechaza con error 400.
4. **Validación de Emboscada TRAP en Niebla:** Si el camino atraviesa un bosque/arrecife con un enemigo oculto, la Edge Function interrumpe el movimiento en la celda anterior, aplica `hasActed = true`, cancela ataques y emite el evento `TRAP_TRIGGERED`.
5. **Validación de Mazo y Cooldowns en Construcción:**
   - Comprueba que la unidad a fabricar pertenezca a las **10 cartas del mazo** equipado.
   - Comprueba que el cooldown actual de la carta sea `0`.
   - Comprueba que el jugador no supere el tope estricto de **15 unidades vivas**.
   - Comprueba que la fábrica esté bajo control del jugador, libre de tropas y que el saldo sea $\ge \text{coste de unidad}$.
6. **Validación de Rango de Tiro y Niebla:** Si un ataque indirecto se dirige a una casilla fuera de rango o dentro de niebla de guerra sin visión directa aliada, el servidor rechaza la orden.

---

## 3. ARQUITECTURA DE BOTS (MOTOR DE INTELIGENCIA ARTIFICIAL)

El motor de IA ofrece 3 niveles de sofisticación táctica para el modo individual (PvE):

```
                   +------------------------------------+
                   |     COMIENZO DE TURNO DEL BOT      |
                   +-----------------+------------------+
                                     |
                       [Fase 1: Finanzas & Producción]
                                     |
                                     v
                   +------------------------------------+
                   | ¿Fábricas libres y fondos >= 1000G?|
                   | -> Evalúa amenaza y balance de tropa|
                   +-----------------+------------------+
                                     |
                       [Fase 2: Asignación de Objetivos]
                                     |
                                     v
         +---------------------------+---------------------------+
         |                                                       |
         v                                                       v
+-------------------------+                             +-------------------------+
| Prioridad 1: Capturar   |                             | Prioridad 2: Combate    |
| - Ciudades desprotegidas|                             | - Buscar flancos débiles|
| - QG enemigo            |                             | - Neutralizar amenazas  |
+------------+------------+                             +------------+------------+
         |                                                       |
         +---------------------------+---------------------------+
                                     |
                                     v
                   +------------------------------------+
                   |     EJECUCIÓN SECUENCIAL DE ÓRDENES|
                   |   (Mover -> Atacar -> Capturar)    |
                   +-----------------+------------------+
                                     |
                                     v
                   +------------------------------------+
                   |           FIN DE TURNO             |
                   +------------------------------------+
```

### 3.1 Niveles de Dificultad del Bot
- **Nivel Fácil (Cadete):**
  - Mueve sus unidades hacia la unidad enemiga más cercana en línea recta.
  - No calcula el terreno defensivo (se detiene en carreteras sin cobertura).
  - Solo construye Infantería y Tanques Ligeros si tiene fondos sobrantes.
- **Nivel Normal (Comandante Táctico):**
  - Aplica la **Función de Evaluación Heurística (Utility Score)**.
  - Prioriza capturar ciudades para estrangular la economía del jugador.
  - Posiciona Artillería y Lanzamisiles con protección de unidades blindadas en vanguardia.
  - Reconoce las ventajas de armas (Antiaéreo contra Helicópteros, Tanque contra Recon).
- **Nivel Difícil (General de Guerra):**
  - Pondera el rango de amenaza de la artillería enemiga para no entrar en casillas de disparo libre.
  - Embosca en bosques en partidas con Niebla de Guerra activada.
  - Acumula fondos estratégicamente para comprar Tanques Medianos y Bombarderos en los momentos decisivos.

### 3.2 Implementación de la Heurística de Decisión (TypeScript)

```typescript
export interface TacticalEvaluationScore {
  action: 'MOVE' | 'ATTACK' | 'CAPTURE' | 'BUILD' | 'WAIT';
  unitId?: string;
  targetPosition?: { x: number; y: number };
  score: number;
}

export class TacticalBotAI {
  /**
   * Evalúa la mejor acción para una unidad individual en el turno
   */
  public static evaluateUnitActions(
    botUnit: TacticalUnit,
    gameState: GameEngineState,
    difficulty: 'easy' | 'normal' | 'hard'
  ): TacticalEvaluationScore {
    let bestScore = -Infinity;
    let chosenAction: TacticalEvaluationScore = { action: 'WAIT', score: 0 };

    const reachable = TacticalPathfinder.getReachableTiles(
      botUnit,
      gameState.tiles,
      gameState.units,
      gameState.gridWidth,
      gameState.gridHeight
    );

    // 1. Evaluar Oportunidades de Captura (Infantería / Mecanizados)
    if (botUnit.unitCode === 'infantry' || botUnit.unitCode === 'mech') {
      for (const pos of reachable) {
        const tile = gameState.tiles[pos.y][pos.x];
        if ((tile.type === 'city' || tile.type === 'factory' || tile.type === 'hq') && tile.ownerId !== botUnit.ownerId) {
          let captureValue = tile.type === 'hq' ? 5000 : 800;
          if (difficulty === 'hard') {
            captureValue += (20 - (tile.captureHp ?? 20)) * 50; // Prioriza terminar capturas iniciadas
          }
          if (captureValue > bestScore) {
            bestScore = captureValue;
            chosenAction = { action: 'CAPTURE', unitId: botUnit.id, targetPosition: pos, score: captureValue };
          }
        }
      }
    }

    // 2. Evaluar Objetivos de Ataque
    for (const pos of reachable) {
      const tile = gameState.tiles[pos.y][pos.x];
      const terrainDefenseBonus = tile.defenseStars * 50;

      // Buscar enemigos en rango de disparo desde esta posición pos
      for (const enemy of Array.from(gameState.units.values())) {
        if (enemy.ownerId === botUnit.ownerId) continue;

        const distance = Math.abs(pos.x - enemy.x) + Math.abs(pos.y - enemy.y);
        if (distance >= botUnit.minRange && distance <= botUnit.maxRange) {
          // Calcular valor del objetivo
          let targetValue = 100;
          if (enemy.unitCode === 'hq' || enemy.unitCode === 'tank_heavy') targetValue = 1200;
          if (enemy.unitCode === 'artillery' || enemy.unitCode === 'rocket') targetValue = 900;
          if (enemy.unitCode === 'b_copter') targetValue = 750;

          // Daño esperado
          const estimatedDamage = Math.max(1, Math.floor((botUnit.hp / 10) * 6));
          const killBonus = (enemy.hp - estimatedDamage <= 0) ? 600 : 0;

          const totalCombatScore = targetValue + killBonus + terrainDefenseBonus - (distance * 10);

          if (totalCombatScore > bestScore) {
            bestScore = totalCombatScore;
            chosenAction = {
              action: 'ATTACK',
              unitId: botUnit.id,
              targetPosition: { x: enemy.x, y: enemy.y },
              score: totalCombatScore
            };
          }
        }
      }
    }

    return chosenAction;
  }

  /**
   * Decisión de Producción en Fábrica para el Bot
   */
  public static decideFactoryProduction(
    factoryPos: { x: number; y: number },
    currentFunds: number,
    armyUnits: TacticalUnit[]
  ): string | null {
    // Si no hay infantería suficiente para capturar, forzar infantería
    const infantryCount = armyUnits.filter(u => u.unitCode === 'infantry').length;
    if (infantryCount < 3 && currentFunds >= 1000) {
      return 'infantry';
    }

    // Si tiene fondos para tanque mediano
    if (currentFunds >= 16000) {
      return 'tank_medium';
    }

    // Si tiene fondos para artillería o tanque ligero
    if (currentFunds >= 7000) {
      return Math.random() > 0.4 ? 'tank_light' : 'artillery';
    }

    if (currentFunds >= 3000) {
      return 'mech';
    }

    return null;
  }
}
```

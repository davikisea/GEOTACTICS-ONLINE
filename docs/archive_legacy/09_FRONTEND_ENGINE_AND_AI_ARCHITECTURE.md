# ARQUITECTURA TÉCNICA DEL FRONTEND, REDES REALTIME Y MOTOR DE IA
**Proyecto:** *Tactical Command: Wars of Legacy*  
**Versión:** 1.0.0-FRONTEND-AI-SPEC  
**Rol:** Lead Frontend Architect & Game AI Systems Engineer  
**Stack Principal:** Next.js 15 (React 19), HTML5 Canvas 2D / PixiJS Core, TypeScript, Supabase Realtime, Vercel Edge Runtime, Web Workers.

---

## 1. MOTOR DE RENDERIZADO Y UI (FRONTEND ARCHITECTURE)

### 1.1 Estrategia de Componentes en Next.js y Desacoplamiento Gráfico

Para asegurar un rendimiento estable de 60 FPS sin re-renders innecesarios en React, la arquitectura desacopla el DOM declarativo de la UI del bucle imperativo del Canvas:

```
+---------------------------------------------------------------------------------------+
| NEXT.JS 15 APP ROUTER                                                                 |
|                                                                                       |
|  [RSC: React Server Components]                                                       |
|  - /lobby, /deck-builder, /profile, /leaderboard                                      |
|  - Consultas directas a Supabase vía Service Key en servidor                          |
|  - Carga de datos de perfil y catálogo sin enviar JS pesado al cliente                 |
|                                                                                       |
|  [RCC: React Client Components ('use client')]                                        |
|  - /match/[id]/page.tsx -> Host de la sesión de juego                                 |
|  - HUD de Recursos (Fondos G, Turno actual, Temporizador de 120s, Avatar del CO)      |
|  - Menú Radial de Acciones (Atacar / Capturar / Reparar / Esperar)                     |
+---------------------------------------------------------------------------------------+
                                           |
                                [Event Bridge: Custom Events / Hooks]
                                           |
                                           v
+---------------------------------------------------------------------------------------+
| MOTOR GRÁFICO (HTML5 CANVAS / PIXIJS / PHASER CORE)                                   |
|                                                                                       |
|  - Bucle desacoplado a 60 FPS con requestAnimationFrame                               |
|  - Renderizado por Capas (Layers):                                                    |
|      1. Background Layer: Terreno estático (Atlas WebP pre-renderizado en Offscreen)  |
|      2. Grid Layer: Superposiciones de movimiento A* (Azul) y rango de ataque (Rojo)  |
|      3. Property Layer: Ciudades, Fábricas y Cuartel General con banderas animadas    |
|      4. Unit Layer: Spritesheets de unidades con interpolación lineal (Lerp)          |
|      5. VFX & Particle Layer: Trazadores balísticos, humo y explosiones               |
|      6. Fog of War Layer: Máscara alfa negra con oclusión en bosques y montañas       |
+---------------------------------------------------------------------------------------+
```

### 1.2 Patrón de Puente de Eventos (Event Bridge: React ↔ Canvas)
```typescript
// /src/engine/EventBridge.ts
export type EngineEventType = 
  | 'CELL_CLICKED' 
  | 'UNIT_SELECTED' 
  | 'SHOW_ACTION_RADIAL' 
  | 'HIDE_ACTION_RADIAL'
  | 'ANIMATION_COMPLETED'
  | 'FUNDS_CHANGED';

export class EngineEventBridge {
  private static listeners: Map<EngineEventType, Function[]> = new Map();

  public static on(event: EngineEventType, callback: Function) {
    if (!this.listeners.has(event)) this.listeners.set(event, []);
    this.listeners.get(event)!.push(callback);
  }

  public static emit(event: EngineEventType, payload?: any) {
    const callbacks = this.listeners.get(event) || [];
    callbacks.forEach(cb => cb(payload));
  }

  public static off(event: EngineEventType, callback: Function) {
    const callbacks = this.listeners.get(event) || [];
    this.listeners.set(event, callbacks.filter(cb => cb !== callback));
  }
}
```

---

### 1.3 Algoritmo de Búsqueda de Caminos (A* Pathfinding con Costes de Terreno)

El algoritmo A* evalúa la topografía, los obstáculos del terreno y la presencia de unidades enemigas:
- **Locomoción heterogénea:** Los vehículos sobre ruedas (`wheels`) sufren penalización en bosques (coste 3) y no pueden cruzar ríos ni montañas.
- **Paso amistoso vs Bloqueo hostil:** Las unidades aliadas pueden ser atravesadas, pero no pueden compartir la casilla final de parada. Las unidades enemigas generan un muro infranqueable.

```typescript
// /src/engine/TacticalPathfinder.ts
export interface PathNode {
  x: number;
  y: number;
  costSoFar: number;
  fScore: number;
  parent?: PathNode;
}

export class TacticalPathfinder {
  /**
   * Obtiene todas las coordenadas dentro del rango de combustible/movimiento
   */
  public static getReachableTiles(
    unit: TacticalUnit,
    tiles: TerrainTile[][],
    unitsMap: Map<string, TacticalUnit>,
    gridWidth: number,
    gridHeight: number
  ): { x: number; y: number }[] {
    const reachable: { x: number; y: number }[] = [];
    const costMap: number[][] = Array.from({ length: gridHeight }, () => Array(gridWidth).fill(Infinity));
    const openSet: PathNode[] = [{ x: unit.x, y: unit.y, costSoFar: 0, fScore: 0 }];
    costMap[unit.y][unit.x] = 0;

    const directions = [{ dx: 0, dy: -1 }, { dx: 0, dy: 1 }, { dx: -1, dy: 0 }, { dx: 1, dy: 0 }];

    while (openSet.length > 0) {
      openSet.sort((a, b) => a.costSoFar - b.costSoFar);
      const current = openSet.shift()!;

      for (const dir of directions) {
        const nx = current.x + dir.dx;
        const ny = current.y + dir.dy;

        if (nx < 0 || nx >= gridWidth || ny < 0 || ny >= gridHeight) continue;

        const tile = tiles[ny][nx];
        const moveCost = TERRAIN_COSTS[tile.type]?.[unit.movementType] ?? Infinity;
        if (moveCost === Infinity) continue; // Infranqueable para este tipo de vehículo

        // Bloqueo total si hay una unidad enemiga en esa casilla
        const occupant = Array.from(unitsMap.values()).find(u => u.x === nx && u.y === ny);
        if (occupant && occupant.ownerId !== unit.ownerId) continue;

        const totalCost = current.costSoFar + moveCost;
        if (totalCost <= unit.movementPoints && totalCost < costMap[ny][nx]) {
          costMap[ny][nx] = totalCost;
          openSet.push({ x: nx, y: ny, costSoFar: totalCost, fScore: totalCost, parent: current });

          // Casilla válida de detención si no está ocupada por otra unidad (incluso aliada)
          if (!occupant || (occupant.x === unit.x && occupant.y === unit.y)) {
            reachable.push({ x: nx, y: ny });
          }
        }
      }
    }

    return reachable;
  }
}
```

---

## 2. SISTEMA MULTIJUGADOR EN TIEMPO REAL (SUPABASE REALTIME)

```
        CLIENTE LOCAL                                 SUPABASE (EDGE / REALTIME)                         CLIENTE RIVAL
              |                                                   |                                            |
              |-- 1. POST /api/match/dispatch-action ------------>|                                            |
              |   Payload: { type: 'MOVE', unitId, path }         |                                            |
              |                                                   |-- 2. Broadcast 'unit_moving' ------------->|
              |                                                   |   (Interpolación de marcha en pantalla)    |
              |                                                   |                                            |
              |                                                   |-- 3. Transacción en PostgreSQL (ACID) ---->|
              |                                                   |   (UPDATE match_state con RLS verificado)  |
              |                                                   |                                            |
              |<-- 4. ACK HTTP 200 (Success) ---------------------|-- 5. postgres_changes (UPDATE) ----------->|
              |                                                   |   (Sincronización autoritativa)            |
```

### 2.1 Protocolo de Sincronización de Acciones (JSON Payloads)

```typescript
export type MatchAction =
  | { type: 'MOVE_UNIT'; matchId: string; unitId: string; destination: { x: number; y: number }; path: { x: number; y: number }[]; sequenceId: number }
  | { type: 'ATTACK_TARGET'; matchId: string; attackerId: string; targetId: string; sequenceId: number }
  | { type: 'CAPTURE_PROPERTY'; matchId: string; unitId: string; propertyCoord: { x: number; y: number }; sequenceId: number }
  | { type: 'BUILD_UNIT'; matchId: string; factoryCoord: { x: number; y: number }; unitCode: string; sequenceId: number }
  | { type: 'END_TURN'; matchId: string; nextPlayerId: string; sequenceId: number };
```

### 2.2 Prevención de Trampas en Edge Functions (`/api/match/dispatch-action`)
El cliente no tiene permisos de inserción arbitraria en la tabla de estado del tablero. Cada acción es enviada a la Edge Function donde se aplican 5 validaciones criptográficas:
1. **Validación de Turno:** `auth.uid() == active_matches.current_turn_player_id`.
2. **Validación de Unidad:** El `ownerId` de la unidad coincide con `auth.uid()`.
3. **Validación de Cinemática:** Recalcula el coste del `path` usando `TERRAIN_COSTS`. Si `cost > unit.movementPoints`, rechaza inmediatamente.
4. **Validación de Niebla:** Comprueba si el objetivo del ataque está dentro del campo de visión (`visionRange`) o si está oculto en un bosque sin adyacencia.
5. **Validación de Saldo:** Deduce el coste de producción de la unidad (`production_cost_g`) del balance de fondos del jugador en una transacción atómica.

### 2.3 Manejo de Desconexiones y Reconexión
- **Heartbeat (Presence API):** Ping continuo cada 5 segundos al canal `match:{id}:presence`.
- **Ventana de Gracia (Grace Period):** Si el rival pierde conexión, se activa un temporizador de gracia de **60 segundos** en la UI del adversario.
- **Forfeit por Abandono:** Si expira el plazo sin reconexión o si el temporizador de turno (120 s) llega a cero, el servidor ejecuta la RPC `award_match_rewards` otorgando la victoria por abandono al jugador conectado.

---

## 3. ARQUITECTURA DEL BOT (IA LOCAL VS SERVIDOR)

### 3.1 Estrategia de Ejecución: Web Workers en Cliente
Para lograr **coste $0 en infraestructura serverless de Vercel** y latencia de respuesta de **0 ms**, la Inteligencia Artificial del modo Solo (vs Bot) se ejecuta en un **Dedicated Web Worker** en el navegador del cliente:
- **Cero carga en Edge Functions:** Vercel solo sirve assets estáticos y páginas HTML.
- **Sin congelamiento de la UI:** Los cálculos del árbol de decisión y pathfinding corren en un hilo secundario del CPU.
- **Fallback Serverless:** Si una partida es multijugador asíncrona y un jugador se desconecta, una Edge Function ligera ejecuta el turno del bot de reemplazo en menos de 45 ms.

```
       HILO PRINCIPAL (REACT / CANVAS)                     HILO SECUNDARIO (WEB WORKER)
             |                                                          |
             |-- 1. postMessage({ type: 'EVALUATE_TURN', gameState }) ->|
             |   (Renderiza animaciones a 60 FPS sin lag)               |
             |                                                          |-- 2. Itera unidades y calcula heurística
             |                                                          |-- 3. Ordena acciones por mayor utilidad
             |                                                          |
             |<-- 4. onmessage({ type: 'EXECUTE_ACTIONS', orders }) ----|
             |                                                          |
```

### 3.2 Heurística de Decisión por Niveles de Dificultad

#### Nivel Fácil (Cadete):
- Selección aleatoria de destino entre las casillas alcanzables.
- Dispara a cualquier unidad enemiga en rango sin considerar cobertura de terreno ni debilidad de tipo.
- Produce infantería básica en cada turno si tiene fondos.

#### Nivel Normal (Comandante Táctico):
Implementa una función de utilidad ponderada:

$$\text{Utilidad}(\text{Acción}) = W_{\text{captura}} + W_{\text{combate}} + W_{\text{posicionamiento}} - W_{\text{vulnerabilidad}}$$

```typescript
// /src/workers/tacticalAiWorker.ts
export class TacticalBotBrain {
  public static computeBestAction(unit: TacticalUnit, state: GameEngineState): TacticalOrder {
    const reachable = TacticalPathfinder.getReachableTiles(unit, state.tiles, state.units, state.gridWidth, state.gridHeight);
    let bestOrder: TacticalOrder = { action: 'WAIT', unitId: unit.id };
    let maxScore = -Infinity;

    // 1. Prioridad: Captura de Ciudades o HQ (Infantería / Mecanizados)
    if (unit.movementType === 'foot' || unit.movementType === 'mech') {
      for (const pos of reachable) {
        const tile = state.tiles[pos.y][pos.x];
        if ((tile.type === 'city' || tile.type === 'hq' || tile.type === 'factory') && tile.ownerId !== unit.ownerId) {
          const score = tile.type === 'hq' ? 8000 : 1500 + (20 - (tile.captureHp ?? 20)) * 50;
          if (score > maxScore) {
            maxScore = score;
            bestOrder = { action: 'CAPTURE', unitId: unit.id, targetPos: pos };
          }
        }
      }
    }

    // 2. Prioridad: Daño Concentrado y Eliminación de Amenazas
    for (const pos of reachable) {
      const tile = state.tiles[pos.y][pos.x];
      const defenseBonus = tile.defenseStars * 80;

      for (const enemy of Array.from(state.units.values())) {
        if (enemy.ownerId === unit.ownerId) continue;
        const dist = Math.abs(pos.x - enemy.x) + Math.abs(pos.y - enemy.y);

        if (dist >= unit.minRange && dist <= unit.maxRange) {
          const baseDmg = DAMAGE_MATRIX[unit.unitCode]?.[enemy.unitCode] ?? 30;
          const killBonus = (enemy.hp - Math.floor(baseDmg / 10) <= 0) ? 900 : 0;
          const combatScore = baseDmg * 10 + killBonus + defenseBonus;

          if (combatScore > maxScore) {
            maxScore = combatScore;
            bestOrder = { action: 'ATTACK', unitId: unit.id, targetPos: pos, targetEnemyId: enemy.id };
          }
        }
      }
    }

    return bestOrder;
  }
}
```

---

## 4. HITOS DE DESARROLLO FRONTEND (DEVELOPMENT MILESTONES)

| Hito | Alcance Técnico | Duración Estimada | Entregable Clave |
|:---:|:---|:---:|:---|
| **M1: Core Canvas & Viewport** | Configuración de Canvas interactivo en React 19, renderizado de matriz 16x16, escalado Retina 2x y navegación con Pan/Zoom táctil. | Sprint 1 (2 semanas) | Componente `TacticalBoardCanvas.tsx` con viewport fluido a 60 FPS. |
| **M2: Pathfinding & Animaciones** | Integración del algoritmo A* con costes de terreno, dibujado de rejilla azul de alcance y desplazamiento interpolado (Lerp). | Sprint 2 (2 semanas) | Movimiento funcional de unidades terrestres y aéreas. |
| **M3: HUD Táctico & Menú Radial** | Creación del HUD en Tailwind CSS (fondos G, contador de turno, timer) y menú contextual de órdenes (Atacar, Capturar, Esperar). | Sprint 3 (2 semanas) | Menú reactivo integrado mediante `EngineEventBridge`. |
| **M4: IA en Web Worker** | Implementación del worker multihilo `tacticalAiWorker.ts` con heurística Cadete y Táctica. | Sprint 4 (2 semanas) | Modo Solo (Jugador vs Bot) 100% funcional en cliente. |
| **M5: Enlace Realtime & Sync** | Conexión con Supabase Realtime Channels, despacho de acciones a `/api/match/dispatch-action` y control de desconexiones. | Sprint 5 (2 semanas) | PvP Realtime funcional en navegador. |
| **M6: Niebla de Guerra & Pulido** | Renderizado de shader de niebla con oclusión en bosques y prueba de estrés en dispositivos móviles. | Sprint 6 (2 semanas) | Versión Release Candidate lista para producción en Vercel. |

---

## 5. INTEGRACIÓN FRONTEND DEL BARK ENGINE EN VIÑETAS DE CÓMIC (VISUAL & TEXTUAL)

### 5.1 Componente React: `CommanderComicVignette` (Bocadillos y Onomatopeyas)
Renderiza las reacciones contextuales del Comandante activo como una **viñeta de novela gráfica / cómic militar** en la interfaz (sin audio de voz):
- **Ubicación:** Menú Principal, Búsqueda de Partida (Queue) y Pantalla de Resultados.
- **Formas de Bocadillo:** Soporte para clases CSS condicionales según `bubbleShape`:
  - `speech`: Burbuja ovalada clásica con reborde negro de 2px y sombreado de semitono.
  - `shout`: Contorno dentado en zigzag de color rojo/amarillo para alertas y momentos de tensión.
  - `thought`: Burbuja en forma de nube con círculos de pensamiento para comandantes tácticos.
- **Sello Pop-Art de Onomatopeya:** Insignia gráfica rotada (-6° a +8°) con tipografía de cómic pesada (`¡BOOM!`, `¡RATATAT!`, `¡ALERT!`, `¡CLUTCH!`).
- **Efecto Máquina de Escribir (Typewriter):** Despliegue de texto progresivo a 30 caracteres/segundo.

```tsx
// /src/components/game/CommanderComicVignette.tsx
import React, { useEffect, useState } from 'react';

export interface ComicVignetteProps {
  commanderId: string;
  dialogueText: string;
  bubbleShape?: 'speech' | 'shout' | 'thought' | 'whisper' | 'radio';
  onomatopoeiaStamp?: string;
  durationMs?: number;
  onDismiss?: () => void;
}

export const CommanderComicVignette: React.FC<ComicVignetteProps> = ({
  commanderId,
  dialogueText,
  bubbleShape = 'speech',
  onomatopoeiaStamp,
  durationMs = 4500,
  onDismiss
}) => {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    setVisible(true);
    const timer = setTimeout(() => {
      setVisible(false);
      onDismiss?.();
    }, durationMs);
    return () => clearTimeout(timer);
  }, [dialogueText, durationMs, onDismiss]);

  if (!visible || !dialogueText) return null;

  const shapeClasses = {
    speech: 'rounded-2xl border-3 border-black bg-white text-slate-900 shadow-[4px_4px_0px_#000]',
    shout: 'border-3 border-red-600 bg-amber-100 text-red-950 font-bold clip-path-jagged shadow-[5px_5px_0px_#991b1b]',
    thought: 'rounded-full border-3 border-dashed border-slate-700 bg-sky-50 text-slate-800',
    whisper: 'rounded-xl border-2 border-dotted border-slate-400 bg-slate-900/90 text-slate-200',
    radio: 'rounded-none border-2 border-emerald-500 bg-slate-950 text-emerald-400 font-mono'
  };

  return (
    <div className="relative animate-bounce-gentle max-w-sm p-4 z-50">
      {onomatopoeiaStamp && (
        <div className="absolute -top-3 -right-2 bg-yellow-400 text-black font-black text-sm px-2.5 py-0.5 border-2 border-black -rotate-6 shadow-[3px_3px_0px_#000] uppercase tracking-wider animate-pulse">
          {onomatopoeiaStamp}
        </div>
      )}
      <div className={`relative px-4 py-3 text-xs leading-relaxed ${shapeClasses[bubbleShape]}`}>
        <span className="font-extrabold uppercase tracking-wider block text-[10px] mb-1 opacity-75">
          [{commanderId.toUpperCase()}]
        </span>
        <p className="font-sans font-medium">{dialogueText}</p>
        {bubbleShape === 'speech' && (
          <div className="absolute -bottom-2.5 left-6 w-3 h-3 bg-white border-r-3 border-b-3 border-black rotate-45" />
        )}
      </div>
    </div>
  );
};
```

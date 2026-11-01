# ARQUITECTURA DEL MOTOR DE JUEGO (GAME ENGINE & FRONTEND)
**Proyecto:** *Tactical Command: Wars of Legacy*  
**Versión:** 1.0.0-PROD-SPEC  
**Stack de Renderizado:** Next.js (React 19), TypeScript, Tailwind CSS, HTML5 Canvas / Phaser 3 Core, Vercel Edge.

---

## 1. ESTRUCTURA DEL ESTADO DEL JUEGO (CLIENT VS SERVER)

```
   CLIENTE (Next.js / Canvas Engine)              SERVIDOR (Supabase / Edge Functions)
+---------------------------------------+       +---------------------------------------+
|  1. Interfaz de Usuario React         |       |  1. Verificación de Reglas & Turno    |
|     - HUD de Fondos y Turno           |       |     - ¿Es el turno del jugador?       |
|     - Panel de Propiedades y Unidades |       |     - ¿Tiene fondos suficientes?      |
+-------------------+-------------------+       +-------------------+-------------------+
                    |                                               ^
     [Input Click: Seleccionar Celda]                               |
                    v                                               |
+---------------------------------------+               [Transmisión RPC / Realtime]
|  2. Motor de Simulación Local (Canvas)|                           |
|     - Pathfinding A* (Cálculo Rango)  |                           |
|     - Dibujado de Superposiciones     |                           |
|     - Animación Interpolada (Lerp)    |                           |
+-------------------+-------------------+                           |
                    |                                               |
         [Acción Confirmada]                                        |
                    v                                               |
+---------------------------------------+       +-------------------+-------------------+
|  3. Estado Optimista (Client State)   |------>|  2. Estado Autoritativo (PostgreSQL)  |
|     - Aplica movimiento de inmediato  |       |     - Valida colisiones y Niebla      |
|     - Encola acción con sequenceId    |       |     - Aplica daño determinista        |
|     - Rollback si el servidor rechaza |       |     - Notifica al rival vía WebSocket |
+---------------------------------------+       +---------------------------------------+
```

### 1.1 Modelo de Datos del Estado en Cliente (TypeScript Interfaces)
```typescript
export type MovementType = 'foot' | 'mech' | 'wheels' | 'treads' | 'air' | 'sea';

export interface GridPosition {
  x: number;
  y: number;
}

export interface TerrainTile {
  x: number;
  y: number;
  type: 'plains' | 'forest' | 'mountain' | 'road' | 'river' | 'city' | 'factory' | 'airport' | 'port' | 'hq' | 'sea' | 'reef';
  defenseStars: number;
  ownerId?: string | null; // null si es neutral, 'player1' | 'player2'
  captureHp?: number;      // 0 a 20 (base 20)
}

export interface TacticalUnit {
  id: string;
  unitCode: string;
  ownerId: string;
  x: number;
  y: number;
  hp: number;              // 1 a 10
  ammo: number;
  fuel: number;
  movementPoints: number;
  movementType: MovementType;
  minRange: number;
  maxRange: number;
  visionRange: number;
  hasMoved: boolean;
  hasActed: boolean;
  skinId: string;
}

export interface GameEngineState {
  matchId: string;
  gridWidth: number;
  gridHeight: number;
  turnNumber: number;
  activePlayerId: string;
  localPlayerId: string;
  funds: Record<string, number>;
  selectedCell: GridPosition | null;
  selectedUnitId: string | null;
  reachableTiles: GridPosition[];
  attackableTargets: GridPosition[];
  fogMatrix: boolean[][]; // true = visible, false = oculto
  units: Map<string, TacticalUnit>;
  tiles: TerrainTile[][];
  isSimulatingAnimation: boolean;
}
```

---

## 2. MANEJO DE ENTRADAS (INPUT STATE MACHINE)

El motor implementa una máquina de estados finita (FSM) para garantizar transiciones fluidas de selección en la cuadrícula táctica:

```
               +-------------------+
               |    IDLE_STATE     |
               +---------+---------+
                         |
           [Click sobre unidad propia sin mover]
                         |
                         v
               +-------------------+
        +----->|  UNIT_SELECTED    |<----------------+
        |      +---------+---------+                 |
        |                |                           |
  [Click en      [Click en casilla válida            | [Click Cancelar /
   casilla        de movimiento]                     |  Botón Derecho]
   inválida]             |                           |
        |                v                           |
        |      +-------------------+                 |
        +------|  UNIT_MOVED_TEMP  |-----------------+
               +---------+---------+
                         |
           [Abre Menú Contextual: Atacar / Capturar / Esperar]
                         |
        +----------------+----------------+
        |                |                |
    [Atacar]        [Capturar]        [Esperar]
        v                v                v
  +-----------+    +-----------+    +-----------+
  | TARGETING |    | EXECUTING |    | COMMIT    |
  +-----+-----+    +-----+-----+    +-----+-----+
        |                |                |
        +----------------+----------------+
                         |
                         v
               +-------------------+
               |  ACTION_COMMITTED |
               | (Envío al Server) |
               +-------------------+
```

---

## 3. ALGORITMO DE BÚSQUEDA DE CAMINOS (A* PATHFINDING CON COSTES DE TERRENO)

A diferencia de un A* tradicional sobre grafos homogéneos, este algoritmo evalúa:
1. **Coste según el tipo de locomoción de la unidad** (`foot`, `wheels`, `treads`, etc.).
2. **Obstrucción por Unidades Enemigas:** Las unidades enemigas bloquean el paso (coste infinito).
3. **Paso a Través de Aliados:** Las unidades aliadas permiten ser atravesadas, pero no se puede terminar el movimiento sobre una casilla ocupada por otro aliado.
4. **Respeto a Puntos de Movimiento Totales:** El árbol de expansión se poda cuando el coste acumulado supera el `movementPoints` de la unidad.

### 3.1 Implementación Completa en TypeScript

```typescript
export interface TerrainCostMap {
  [terrainType: string]: {
    foot: number;
    mech: number;
    wheels: number;
    treads: number;
    air: number;
    sea: number;
  };
}

export const TERRAIN_COSTS: TerrainCostMap = {
  plains:   { foot: 1, mech: 1, wheels: 2, treads: 1, air: 1, sea: Infinity },
  forest:   { foot: 1, mech: 1, wheels: 3, treads: 2, air: 1, sea: Infinity },
  mountain: { foot: 2, mech: 1, wheels: Infinity, treads: Infinity, air: 1, sea: Infinity },
  road:     { foot: 1, mech: 1, wheels: 1, treads: 1, air: 1, sea: Infinity },
  river:    { foot: 2, mech: 1, wheels: Infinity, treads: Infinity, air: 1, sea: Infinity },
  city:     { foot: 1, mech: 1, wheels: 1, treads: 1, air: 1, sea: Infinity },
  factory:  { foot: 1, mech: 1, wheels: 1, treads: 1, air: 1, sea: Infinity },
  airport:  { foot: 1, mech: 1, wheels: 1, treads: 1, air: 1, sea: Infinity },
  port:     { foot: 1, mech: 1, wheels: 1, treads: 1, air: 1, sea: 1 },
  hq:       { foot: 1, mech: 1, wheels: 1, treads: 1, air: 1, sea: Infinity },
  sea:      { foot: Infinity, mech: Infinity, wheels: Infinity, treads: Infinity, air: 1, sea: 1 },
  reef:     { foot: Infinity, mech: Infinity, wheels: Infinity, treads: Infinity, air: 1, sea: 2 }
};

interface PathNode {
  x: number;
  y: number;
  costSoFar: number;
  parent?: PathNode;
}

export class TacticalPathfinder {
  /**
   * Calcula todos los nodos alcanzables por una unidad dado su combustible/movimiento
   */
  public static getReachableTiles(
    unit: TacticalUnit,
    tiles: TerrainTile[][],
    unitsMap: Map<string, TacticalUnit>,
    gridWidth: number,
    gridHeight: number
  ): GridPosition[] {
    const reachable: GridPosition[] = [];
    const costMap: number[][] = Array.from({ length: gridHeight }, () =>
      Array(gridWidth).fill(Infinity)
    );

    const queue: PathNode[] = [{ x: unit.x, y: unit.y, costSoFar: 0 }];
    costMap[unit.y][unit.x] = 0;

    const directions = [
      { dx: 0, dy: -1 }, // Arriba
      { dx: 0, dy: 1 },  // Abajo
      { dx: -1, dy: 0 }, // Izquierda
      { dx: 1, dy: 0 }   // Derecha
    ];

    while (queue.length > 0) {
      // Ordenar por menor coste (Dijkstra / Breadth-First Cost)
      queue.sort((a, b) => a.costSoFar - b.costSoFar);
      const current = queue.shift()!;

      for (const dir of directions) {
        const nx = current.x + dir.dx;
        const ny = current.y + dir.dy;

        // Validar límites del mapa
        if (nx < 0 || nx >= gridWidth || ny < 0 || ny >= gridHeight) continue;

        const tile = tiles[ny][nx];
        const moveCost = TERRAIN_COSTS[tile.type]?.[unit.movementType] ?? Infinity;
        if (moveCost === Infinity) continue;

        // Comprobar si hay unidad enemiga bloqueando
        const occupant = Array.from(unitsMap.values()).find(u => u.x === nx && u.y === ny);
        if (occupant && occupant.ownerId !== unit.ownerId) {
          // Bloqueo total de paso por unidad hostil
          continue;
        }

        const newCost = current.costSoFar + moveCost;
        if (newCost <= unit.movementPoints && newCost < costMap[ny][nx]) {
          costMap[ny][nx] = newCost;
          queue.push({ x: nx, y: ny, costSoFar: newCost });

          // La casilla es alcanzable si no está ocupada por otra unidad (incluso aliada) al finalizar
          if (!occupant || (occupant.x === unit.x && occupant.y === unit.y)) {
            reachable.push({ x: nx, y: ny });
          }
        }
      }
    }

    return reachable;
  }

  /**
   * A* Pathfinding hacia un destino específico con reconstrucción de ruta
   */
  public static findOptimalPath(
    startX: number,
    startY: number,
    targetX: number,
    targetY: number,
    unit: TacticalUnit,
    tiles: TerrainTile[][],
    unitsMap: Map<string, TacticalUnit>,
    gridWidth: number,
    gridHeight: number
  ): GridPosition[] | null {
    const heuristic = (x: number, y: number) => Math.abs(x - targetX) + Math.abs(y - targetY);
    const openSet: { node: PathNode; fScore: number }[] = [];
    const closedSet = new Set<string>();

    const startNode: PathNode = { x: startX, y: startY, costSoFar: 0 };
    openSet.push({ node: startNode, fScore: heuristic(startX, startY) });

    const directions = [{ dx: 0, dy: -1 }, { dx: 0, dy: 1 }, { dx: -1, dy: 0 }, { dx: 1, dy: 0 }];

    while (openSet.length > 0) {
      openSet.sort((a, b) => a.fScore - b.fScore);
      const { node: current } = openSet.shift()!;

      if (current.x === targetX && current.y === targetY) {
        // Reconstrucción del camino
        const path: GridPosition[] = [];
        let curr: PathNode | undefined = current;
        while (curr) {
          path.unshift({ x: curr.x, y: curr.y });
          curr = curr.parent;
        }
        return path;
      }

      const key = `${current.x},${current.y}`;
      closedSet.add(key);

      for (const dir of directions) {
        const nx = current.x + dir.dx;
        const ny = current.y + dir.dy;
        const nKey = `${nx},${ny}`;

        if (nx < 0 || nx >= gridWidth || ny < 0 || ny >= gridHeight) continue;
        if (closedSet.has(nKey)) continue;

        const tile = tiles[ny][nx];
        const moveCost = TERRAIN_COSTS[tile.type]?.[unit.movementType] ?? Infinity;
        if (moveCost === Infinity) continue;

        const occupant = Array.from(unitsMap.values()).find(u => u.x === nx && u.y === ny);
        if (occupant && occupant.ownerId !== unit.ownerId && !(nx === targetX && ny === targetY)) {
          continue; // Obstruido por enemigo
        }

        const tentativeG = current.costSoFar + moveCost;
        if (tentativeG > unit.movementPoints) continue;

        const existing = openSet.find(item => item.node.x === nx && item.node.y === ny);
        if (!existing || tentativeG < existing.node.costSoFar) {
          const neighborNode: PathNode = { x: nx, y: ny, costSoFar: tentativeG, parent: current };
          const fScore = tentativeG + heuristic(nx, ny);
          if (!existing) {
            openSet.push({ node: neighborNode, fScore });
          } else {
            existing.node = neighborNode;
            existing.fScore = fScore;
          }
        }
      }
    }

    return null; // No hay ruta viable
  }
}
```

---

## 4. INTEGRACIÓN Y OPTIMIZACIÓN EN VERCEL

### 4.1 Estrategia Híbrida de Renderizado (Next.js App Router)
- **RSC (React Server Components):**
  - Páginas de Rutas: `/lobby`, `/armory`, `/leaderboard`, `/profile`.
  - Carga los datos de catálogo de unidades y perfil de usuario directamente en el servidor utilizando conexión segura a Supabase vía Service Key, minimizando la transferencia de JavaScript inicial al cliente.
- **Client Components (`'use client'`):**
  - Ruta de Partida: `/match/[id]`.
  - El Canvas interactivo corre 100% en el cliente con un loop de animación desacoplado a 60 FPS gestionado por `requestAnimationFrame`.

### 4.2 Optimización de Assets y Spritesheets
1. **Textura Única de Atlas (Spritesheet Consolidation):**
   - Todos los sprites de terreno (16x16 px escalados pixel-art x3 a 48x48 px) y unidades se empaquetan en un único archivo WebP `atlas_terrain_units.webp` (peso inferior a 380 KB).
   - Evita cientos de peticiones HTTP en cada movimiento.
2. **Vercel Edge Network & Cache-Control:**
   - Cabeceras inmutables para assets estáticos: `Cache-Control: public, max-age=31536000, immutable`.
   - Compresión Brotli activada automáticamente por la CDN de Vercel.
3. **Audio Preload con Web Audio API:**
   - Sistema de efectos de sonido sintetizados o comprimidos en Opus/OGG cargados en buffer en memoria durante el lobby para respuesta de latencia de 0 ms en disparos y explosiones.

---

## 5. ARQUITECTURA DE DESPLIEGUE POR MAZO (DECK COOLDOWNS & GAME MODES)

### 5.1 Gestor de Despliegue en Fábricas (`DeckDeploymentManager`)
En lugar de mostrar un catálogo estático infinito o recurrir al azar de robo de cartas, el motor carga el mazo de 10 cartas del jugador y administra los turnos de recarga:

```typescript
export interface DeckCardSlot {
  unitCode: string;
  category: 'infantry' | 'vehicle' | 'indirect' | 'aircraft' | 'naval';
  cooldownMaxTurns: number;
  currentCooldown: number; // 0 = disponible para producir
}

export class DeckDeploymentManager {
  // Las 2 cartas obligatorias de infantería poseen Cooldown = 0 permanente
  public static isCardAvailable(card: DeckCardSlot, currentSimultaneousUnits: number): boolean {
    if (currentSimultaneousUnits >= 15) return false; // Límite técnico de 15 unidades por bando
    return card.currentCooldown === 0;
  }

  public static onUnitProduced(card: DeckCardSlot, gameMode: 'blitz_skirmish' | 'grand_campaign'): void {
    const multiplier = gameMode === 'blitz_skirmish' ? 0.5 : 1.0;
    card.currentCooldown = Math.max(0, Math.floor(card.cooldownMaxTurns * multiplier));
  }

  public static onTurnStarted(deck: DeckCardSlot[]): void {
    deck.forEach(card => {
      if (card.currentCooldown > 0) card.currentCooldown -= 1;
    });
  }
}
```

### 5.2 Parámetros del Motor según Modo de Juego
| Parámetro Táctico | Escaramuza Rápida (Blitz Skirmish) | Campaña Táctica (Grand Campaign) |
|:---|:---:|:---:|
| **Dimensiones de Mapa** | $12 \times 12$ a $16 \times 16$ | $24 \times 24$ a $32 \times 32$ |
| **Tiempo de Turno** | 30 segundos (Anti-AFK agresivo) | 60 segundos (Planificación profunda) |
| **Generación de Ingresos** | $\$2,000$ por propiedad/turno ($\times 2$) | $\$1,000$ por propiedad/turno ($\times 1$) |
| **Multiplicador de Cooldown** | $0.5\times$ (Recargas aceleradas) | $1.0\times$ (Enfriamiento completo) |
| **Límite de Turnos** | 12 a 15 Turnos | Hasta 40 Turnos |
| **Criterio de Desempate** | $\text{Valor Tropas Activas} + \text{Valor Propiedades}$ | Puntuación Logística y Cobertura Territorial |

---

## 6. ARQUITECTURA DEL BARK ENGINE VISUAL (ESTÉTICA CÓMIC Y DIÁLOGOS CONTEXTUALES)

El **Bark Engine** es el subsistema encargado de transformar eventos tácticos y la telemetría acumulada del usuario en viñetas ilustradas con bocadillos de cómic y sellos de onomatopeyas Pop-Art (sin voces grabadas ni actores de voz), dotando a cada Comandante de una identidad viva tanto fuera como dentro de la partida.

```
                                      FLUJO DEL BARK ENGINE (CÓMIC)
                                                    │
    ┌───────────────────────────────────────────────┼───────────────────────────────────────────────┐
    ▼                                               ▼                                               ▼
[ EVENTOS TÁCTICOS / TELEMETRÍA ]          [ EVALUADOR DE PRIORIDAD ]                  [ RENDERIZADO DE VIÑETA ]
  • OnCombatCriticalHit (HQ < 20%)           • Cooldown Anti-Saturación (12s)            • Bocadillo Dinámico (CSS Shape)
  • OnHQCaptured / HQ Damaged                • Coincidencia de Arquetipo CO              • Sello Onomatopeya (¡BOOM!, ¡ALERT!)
  • OnPlayerStreak (Loss/Win streak)         • Nivel de Vínculo (Bonding Level)          • Pose de Retrato y Expresión Cómic
  • OnTurnTimeExceeded (AFK Warning)         • Estado Psicológico (Tilt, Paciencia)      • Tipografía y Tramas de Semitono
```

### 6.1 Interfaz del Bus de Eventos y Despachador (`BarkEngineService`)
```typescript
export interface TacticalBehaviorContext {
  userId: string;
  currentStreak: number;
  winRateBlitz: number;
  winRateCampaign: number;
  avgPteSeconds: number;
  tiltIndex: number; // 0.0 a 1.0 (detecta frustración tras derrotas rápidas)
  patienceScore: number;
  favoriteBranch: 'land' | 'air' | 'naval' | 'balanced';
  favoriteUnitCode: string;
  mostLostUnitCode: string;
  clutchWinsCount: number;
}

export interface BarkTriggerEvent {
  eventType: 'MENU_IDLE' | 'MATCH_QUEUE' | 'COMBAT_HQ_HIT' | 'UNIT_LOST_ELITE' | 'POWER_TRIGGERED' | 'MATCH_VICTORY_CLUTCH';
  commanderId: 'vance' | 'stella' | 'volkov' | string;
  gameMode?: 'blitz_skirmish' | 'grand_campaign';
  metadata?: Partial<TacticalBehaviorContext>;
}

export interface ComicBarkPayload {
  dialogueText: string;
  bubbleShape: 'speech' | 'shout' | 'thought' | 'whisper' | 'radio';
  onomatopoeiaStamp?: '¡BOOM!' | '¡RATATAT!' | '¡TACTICAL!' | '¡ALERT!' | '¡CLUTCH!' | string;
  comicPose: 'neutral' | 'stern' | 'angry' | 'mocking' | 'proud' | 'alarmed';
  displayDurationMs: number;
}

export class BarkEngineService {
  private static lastBarkTimestamp: number = 0;
  private static readonly BARK_COOLDOWN_MS = 10000; // Evita fatiga visual en la UI

  public static evaluateBark(event: BarkTriggerEvent, context: TacticalBehaviorContext): ComicBarkPayload | null {
    const now = Date.now();
    if (now - this.lastBarkTimestamp < this.BARK_COOLDOWN_MS && event.eventType !== 'COMBAT_HQ_HIT') {
      return null;
    }

    this.lastBarkTimestamp = now;

    // Reglas contextuales según Comandante y Hábitos del Jugador
    if (event.commanderId === 'stella') {
      if (context.tiltIndex > 0.6) {
        return {
          dialogueText: "¡Deja de apretar botones a lo loco, Recluta! Acelerar el turno con rabia solo te dejará sin tanques otra vez.",
          bubbleShape: 'shout',
          onomatopoeiaStamp: '¡PANIC!',
          comicPose: 'angry',
          displayDurationMs: 4500
        };
      }
      if (event.eventType === 'MATCH_VICTORY_CLUTCH') {
        return {
          dialogueText: "¡Vaya milagro con el HQ en llamas! No fue la maniobra más limpia, pero esos escombros valieron la pena.",
          bubbleShape: 'speech',
          onomatopoeiaStamp: '¡CLUTCH!',
          comicPose: 'proud',
          displayDurationMs: 4000
        };
      }
    }

    if (event.commanderId === 'volkov') {
      if (context.avgPteSeconds >= 35) {
        return {
          dialogueText: "Una cadencia analítica impecable. Las trayectorias de artillería exigen trigonometría, no impulsividad.",
          bubbleShape: 'thought',
          onomatopoeiaStamp: '¡CALCULATED!',
          comicPose: 'neutral',
          displayDurationMs: 4500
        };
      }
    }

    // Default Vance
    return {
      dialogueText: "Revisa las líneas de suministro y mantén la cobertura en las montañas.",
      bubbleShape: 'speech',
      comicPose: 'stern',
      displayDurationMs: 3500
    };
  }
}
```

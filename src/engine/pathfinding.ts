import { GridPosition, MovementType, TacticalUnit, TerrainTile, TerrainType } from '../types';
import {
  WeatherType,
  CANONICAL_TERRAIN_PROPERTIES,
  getCanonicalMovementCost,
} from './canonicalMovement';

export type { WeatherType };
export { CANONICAL_TERRAIN_PROPERTIES, getCanonicalMovementCost };

/**
 * Tabla canónica de costes de movimiento según la locomoción de la unidad y el terreno.
 * Coste 'Infinity' representa terreno infranqueable para ese tipo de tracción.
 */
export const TERRAIN_MOVEMENT_COSTS: Record<TerrainType, Record<MovementType, number>> = {
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
  reef:     { foot: Infinity, mech: Infinity, wheels: Infinity, treads: Infinity, air: 1, sea: 2 },
};

export interface PathNode {
  x: number;
  y: number;
  costSoFar: number;
  fScore: number;
  parent?: PathNode;
}

export interface ReachableTileInfo {
  x: number;
  y: number;
  remainingMovement: number;
  costSoFar: number;
  path: GridPosition[];
}

export interface PathfindingContext {
  unit: TacticalUnit;
  tiles: TerrainTile[][];
  unitsMap: Map<string, TacticalUnit>;
  gridWidth: number;
  gridHeight: number;
  fogOfWarEnabled?: boolean;
  visibleTiles?: boolean[][]; // Matriz opcional de visibilidad del jugador activo
  weather?: WeatherType;
}

export class TacticalPathfindingEngine {
  /**
   * Obtiene todas las celdas alcanzables por una unidad en su turno actual,
   * considerando su tipo de tracción, costes de terreno y bloqueo por unidades enemigas.
   */
  public static getReachableTiles(context: PathfindingContext): ReachableTileInfo[] {
    const { unit, tiles, unitsMap, gridWidth, gridHeight, fogOfWarEnabled = false, visibleTiles, weather = 'clear' } = context;
    const reachableMap: Map<string, ReachableTileInfo> = new Map();

    const costMatrix: number[][] = Array.from({ length: gridHeight }, () =>
      Array(gridWidth).fill(Infinity)
    );

    const openQueue: PathNode[] = [
      { x: unit.x, y: unit.y, costSoFar: 0, fScore: 0 }
    ];
    costMatrix[unit.y][unit.x] = 0;

    const directions = [
      { dx: 0, dy: -1 }, // Arriba
      { dx: 0, dy: 1 },  // Abajo
      { dx: -1, dy: 0 }, // Izquierda
      { dx: 1, dy: 0 },  // Derecha
    ];

    while (openQueue.length > 0) {
      // Ordenar por menor coste acumulado
      openQueue.sort((a, b) => a.costSoFar - b.costSoFar);
      const current = openQueue.shift()!;

      for (const dir of directions) {
        const nx = current.x + dir.dx;
        const ny = current.y + dir.dy;

        // Comprobar límites del mapa
        if (nx < 0 || nx >= gridWidth || ny < 0 || ny >= gridHeight) continue;

        const targetTile = tiles[ny][nx];
        const stepCost = getCanonicalMovementCost(unit.movementType, targetTile.type, weather);

        // Terreno infranqueable para este tipo de vehículo/locomoción
        if (stepCost === Infinity) continue;

        // Evaluación de unidades que ocupan la celda
        const occupant = Array.from(unitsMap.values()).find(u => u.x === nx && u.y === ny);

        // Bloqueo total por unidad enemiga
        if (occupant && occupant.ownerId !== unit.ownerId) {
          // Si la niebla de guerra está activa y la unidad enemiga está oculta (ej. en bosque no visible),
          // el camino se bloquea en esa dirección
          if (fogOfWarEnabled && visibleTiles && !visibleTiles[ny][nx]) {
            continue;
          }
          continue;
        }

        const newCost = current.costSoFar + stepCost;

        if (newCost <= unit.movementPoints && newCost < costMatrix[ny][nx]) {
          costMatrix[ny][nx] = newCost;
          const nextNode: PathNode = {
            x: nx,
            y: ny,
            costSoFar: newCost,
            fScore: newCost,
            parent: current,
          };
          openQueue.push(nextNode);

          // Una casilla es destino válido de parada si no está ocupada por otra unidad (incluso aliada)
          if (!occupant || (occupant.x === unit.x && occupant.y === unit.y)) {
            const key = `${nx},${ny}`;
            reachableMap.set(key, {
              x: nx,
              y: ny,
              remainingMovement: unit.movementPoints - newCost,
              costSoFar: newCost,
              path: this.reconstructPath(nextNode),
            });
          }
        }
      }
    }

    return Array.from(reachableMap.values());
  }

  /**
   * Algoritmo A* (A-Star) para calcular la ruta óptima de menor coste hacia un destino concreto.
   * Utiliza la distancia Manhattan como función heurística admisible y consistente: h = |x1 - x2| + |y1 - y2|.
   */
  public static findOptimalPath(
    startX: number,
    startY: number,
    targetX: number,
    targetY: number,
    context: Omit<PathfindingContext, 'unit'> & { unit: TacticalUnit }
  ): GridPosition[] | null {
    const { unit, tiles, unitsMap, gridWidth, gridHeight } = context;

    // Validación de límites del destino
    if (targetX < 0 || targetX >= gridWidth || targetY < 0 || targetY >= gridHeight) {
      return null;
    }

    // Heurística Manhattan
    const heuristic = (x: number, y: number) => Math.abs(x - targetX) + Math.abs(y - targetY);

    const openSet: PathNode[] = [];
    const closedSet = new Set<string>();
    const gScoreMap = new Map<string, number>();

    const startNode: PathNode = {
      x: startX,
      y: startY,
      costSoFar: 0,
      fScore: heuristic(startX, startY),
    };

    openSet.push(startNode);
    gScoreMap.set(`${startX},${startY}`, 0);

    const directions = [
      { dx: 0, dy: -1 },
      { dx: 0, dy: 1 },
      { dx: -1, dy: 0 },
      { dx: 1, dy: 0 },
    ];

    while (openSet.length > 0) {
      // Extraer el nodo con menor fScore (f = g + h)
      openSet.sort((a, b) => a.fScore - b.fScore);
      const current = openSet.shift()!;

      // Si alcanzamos el objetivo, reconstruir el camino
      if (current.x === targetX && current.y === targetY) {
        return this.reconstructPath(current);
      }

      const currentKey = `${current.x},${current.y}`;
      closedSet.add(currentKey);

      for (const dir of directions) {
        const nx = current.x + dir.dx;
        const ny = current.y + dir.dy;
        const neighborKey = `${nx},${ny}`;

        if (nx < 0 || nx >= gridWidth || ny < 0 || ny >= gridHeight) continue;
        if (closedSet.has(neighborKey)) continue;

        const tile = tiles[ny][nx];
        const moveCost = TERRAIN_MOVEMENT_COSTS[tile.type]?.[unit.movementType] ?? Infinity;
        if (moveCost === Infinity) continue;

        // Comprobar bloqueo por tropas hostiles
        const occupant = Array.from(unitsMap.values()).find(u => u.x === nx && u.y === ny);
        if (occupant && occupant.ownerId !== unit.ownerId) {
          // Bloqueado si no es el destino o incluso en el destino
          continue;
        }

        const tentativeG = current.costSoFar + moveCost;
        if (tentativeG > unit.movementPoints) continue;

        const previousG = gScoreMap.get(neighborKey) ?? Infinity;
        if (tentativeG < previousG) {
          gScoreMap.set(neighborKey, tentativeG);
          const fScore = tentativeG + heuristic(nx, ny);

          const neighborNode: PathNode = {
            x: nx,
            y: ny,
            costSoFar: tentativeG,
            fScore,
            parent: current,
          };

          const existingOpenIndex = openSet.findIndex(n => n.x === nx && n.y === ny);
          if (existingOpenIndex >= 0) {
            openSet[existingOpenIndex] = neighborNode;
          } else {
            openSet.push(neighborNode);
          }
        }
      }
    }

    return null; // No hay ruta admisible dentro del límite de combustible/movimiento
  }

  /**
   * Reconstruye la secuencia de coordenadas desde el nodo inicial hasta el nodo objetivo.
   */
  private static reconstructPath(endNode: PathNode): GridPosition[] {
    const path: GridPosition[] = [];
    let current: PathNode | undefined = endNode;
    while (current) {
      path.unshift({ x: current.x, y: current.y });
      current = current.parent;
    }
    return path;
  }
}

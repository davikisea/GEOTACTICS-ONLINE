import { GridPosition, TacticalUnit, TerrainTile } from '../types';
import { isIndirectFireUnit } from './canonicalDamageChart';
import { TacticalPathfindingEngine } from './pathfinding';
import { WeatherType } from './canonicalMovement';

export interface ThreatAnalysisResult {
  threatenedTiles: GridPosition[];
  heatMap: number[][]; // How many enemies can strike each tile
  enemyThreatsByUnit: Map<string, GridPosition[]>;
}

/**
 * Calculates all tiles that a single unit can threaten/attack this turn.
 */
export function calculateSingleUnitThreat(
  unit: TacticalUnit,
  tiles: TerrainTile[][],
  unitsMap: Map<string, TacticalUnit>,
  gridWidth: number,
  gridHeight: number,
  weather: WeatherType = 'clear'
): GridPosition[] {
  const result: GridPosition[] = [];
  const threatenedKeys = new Set<string>();

  const isIndirect = isIndirectFireUnit(unit.unitCode);

  if (isIndirect) {
    // Indirect units threaten from their current position (they cannot move and fire in the same turn)
    for (let dy = -unit.maxRange; dy <= unit.maxRange; dy++) {
      for (let dx = -unit.maxRange; dx <= unit.maxRange; dx++) {
        const dist = Math.abs(dx) + Math.abs(dy);
        if (dist >= unit.minRange && dist <= unit.maxRange) {
          const tx = unit.x + dx;
          const ty = unit.y + dy;
          if (tx >= 0 && tx < gridWidth && ty >= 0 && ty < gridHeight) {
            const key = `${tx},${ty}`;
            if (!threatenedKeys.has(key)) {
              threatenedKeys.add(key);
              result.push({ x: tx, y: ty });
            }
          }
        }
      }
    }
  } else {
    // Direct combat units can move to any reachable tile and strike orthogonal neighbors
    const reachable = TacticalPathfindingEngine.getReachableTiles({
      unit,
      tiles,
      unitsMap,
      gridWidth,
      gridHeight,
      weather,
    });

    const potentialStandPositions = [{ x: unit.x, y: unit.y }, ...reachable.map(r => ({ x: r.x, y: r.y }))];

    for (const stand of potentialStandPositions) {
      // Direct units can attack 4 orthogonal neighbors
      const neighbors = [
        { x: stand.x, y: stand.y - 1 },
        { x: stand.x, y: stand.y + 1 },
        { x: stand.x - 1, y: stand.y },
        { x: stand.x + 1, y: stand.y },
      ];

      for (const n of neighbors) {
        if (n.x >= 0 && n.x < gridWidth && n.y >= 0 && n.y < gridHeight) {
          const key = `${n.x},${n.y}`;
          if (!threatenedKeys.has(key)) {
            threatenedKeys.add(key);
            result.push(n);
          }
        }
      }
    }
  }

  return result;
}

/**
 * Calculates the combined enemy threat overlay and danger heat map for the active player.
 */
export function calculateCombinedEnemyThreatMap(
  activePlayerId: string,
  units: Record<string, TacticalUnit> | TacticalUnit[],
  tiles: TerrainTile[][],
  gridWidth: number,
  gridHeight: number,
  weather: WeatherType = 'clear'
): ThreatAnalysisResult {
  const unitsArray = Array.isArray(units) ? units : Object.values(units);
  const unitsMap = new Map<string, TacticalUnit>();
  unitsArray.forEach(u => unitsMap.set(u.id, u));

  const heatMap: number[][] = Array.from({ length: gridHeight }, () =>
    Array(gridWidth).fill(0)
  );

  const enemyThreatsByUnit = new Map<string, GridPosition[]>();
  const allThreatenedKeys = new Set<string>();
  const threatenedTiles: GridPosition[] = [];

  for (const unit of unitsArray) {
    // Only analyze enemies that are alive
    if (unit.ownerId !== activePlayerId && unit.hp > 0) {
      const threatened = calculateSingleUnitThreat(
        unit,
        tiles,
        unitsMap,
        gridWidth,
        gridHeight,
        weather
      );

      enemyThreatsByUnit.set(unit.id, threatened);

      for (const pos of threatened) {
        heatMap[pos.y][pos.x] += 1;
        const key = `${pos.x},${pos.y}`;
        if (!allThreatenedKeys.has(key)) {
          allThreatenedKeys.add(key);
          threatenedTiles.push(pos);
        }
      }
    }
  }

  return {
    threatenedTiles,
    heatMap,
    enemyThreatsByUnit,
  };
}

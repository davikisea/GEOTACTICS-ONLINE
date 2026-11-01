import { GridPosition, TacticalUnit, TerrainTile } from '../types';
import { isFootSoldier } from './subActions';

export interface MissileLaunchParams {
  launcherUnit: TacticalUnit;
  siloPosition: GridPosition;
  targetPosition: GridPosition;
  tiles: TerrainTile[][];
  unitsMap: Map<string, TacticalUnit>;
  gridWidth: number;
  gridHeight: number;
  damageAmount?: number; // Canonical default: 3 HP
  radius?: number;       // Canonical default: 2 (Manhattan diamond radius)
}

export interface AffectedUnitResult {
  unitId: string;
  unitCode: string;
  ownerId: string;
  position: GridPosition;
  previousHp: number;
  newHp: number;
  damageDealt: number;
}

export interface MissileLaunchResult {
  success: boolean;
  error?: string;
  impactZone: GridPosition[];
  affectedUnits: AffectedUnitResult[];
  siloTileUpdated: boolean;
}

/**
 * Checks if a tile is an unused missile silo.
 */
export function isUnusedSilo(tile: TerrainTile): boolean {
  return tile.type === 'silo' && (tile.captureHp === undefined || tile.captureHp > 0);
}

/**
 * Calculates all tiles encompassed by a silo explosion radius.
 * In canonical Advance Wars, missile silos have a Manhattan radius of 2 (diamond shape).
 */
export function getExplosionTiles(
  center: GridPosition,
  radius: number = 2,
  gridWidth: number,
  gridHeight: number
): GridPosition[] {
  const result: GridPosition[] = [];

  for (let dy = -radius; dy <= radius; dy++) {
    for (let dx = -radius; dx <= radius; dx++) {
      if (Math.abs(dx) + Math.abs(dy) <= radius) {
        const x = center.x + dx;
        const y = center.y + dy;
        if (x >= 0 && x < gridWidth && y >= 0 && y < gridHeight) {
          result.push({ x, y });
        }
      }
    }
  }

  return result;
}

/**
 * Executes a tactical ballistic missile silo launch.
 * Marks the silo as spent and damages all units within blast radius by 3 HP (down to minimum 1 HP).
 */
export function launchMissile(params: MissileLaunchParams): MissileLaunchResult {
  const {
    launcherUnit,
    siloPosition,
    targetPosition,
    tiles,
    unitsMap,
    gridWidth,
    gridHeight,
    damageAmount = 3,
    radius = 2,
  } = params;

  // 1. Validations
  if (!isFootSoldier(launcherUnit.unitCode)) {
    return {
      success: false,
      error: 'Sólo la infantería o unidades mecanizadas pueden activar un Silo de Misiles.',
      impactZone: [],
      affectedUnits: [],
      siloTileUpdated: false,
    };
  }

  if (launcherUnit.x !== siloPosition.x || launcherUnit.y !== siloPosition.y) {
    return {
      success: false,
      error: 'La unidad lanzadora debe estar posicionada exactamente sobre la casilla del Silo.',
      impactZone: [],
      affectedUnits: [],
      siloTileUpdated: false,
    };
  }

  const siloTile = tiles[siloPosition.y]?.[siloPosition.x];
  if (!siloTile || !isUnusedSilo(siloTile)) {
    return {
      success: false,
      error: 'La casilla especificada no es un Silo activo o ya ha sido disparado previamente.',
      impactZone: [],
      affectedUnits: [],
      siloTileUpdated: false,
    };
  }

  if (
    targetPosition.x < 0 ||
    targetPosition.x >= gridWidth ||
    targetPosition.y < 0 ||
    targetPosition.y >= gridHeight
  ) {
    return {
      success: false,
      error: 'Las coordenadas de impacto están fuera de los límites del mapa.',
      impactZone: [],
      affectedUnits: [],
      siloTileUpdated: false,
    };
  }

  // 2. Mark Silo as spent (captureHp = 0 indicates spent silo)
  siloTile.captureHp = 0;

  // 3. Compute blast zone
  const blastZone = getExplosionTiles(targetPosition, radius, gridWidth, gridHeight);
  const blastSet = new Set(blastZone.map(p => `${p.x},${p.y}`));

  // 4. Apply damage (up to minimum 1 HP canonical rule)
  const affectedUnits: AffectedUnitResult[] = [];

  for (const unit of unitsMap.values()) {
    if (blastSet.has(`${unit.x},${unit.y}`)) {
      const prevHp = unit.hp;
      // Missiles cannot kill units, they leave them at 1 HP minimum
      const nextHp = Math.max(1, prevHp - damageAmount);
      const damageDealt = prevHp - nextHp;

      unit.hp = nextHp;
      affectedUnits.push({
        unitId: unit.id,
        unitCode: unit.unitCode,
        ownerId: unit.ownerId,
        position: { x: unit.x, y: unit.y },
        previousHp: prevHp,
        newHp: nextHp,
        damageDealt,
      });
    }
  }

  return {
    success: true,
    impactZone: blastZone,
    affectedUnits,
    siloTileUpdated: true,
  };
}

import { GridPosition, TacticalUnit, TerrainTile } from '../types';
import { canDirectlyAttack, isIndirectFireUnit } from './canonicalDamageChart';
import { getCanonicalMovementCost, WeatherType } from './canonicalMovement';

export type ActionType =
  | 'wait'
  | 'attack'
  | 'capture'
  | 'launch_silo'
  | 'join'
  | 'load'
  | 'unload'
  | 'supply'
  | 'explode'
  | 'hide'
  | 'show'
  | 'repair'
  | 'delete';

export interface AvailableSubAction {
  type: ActionType;
  displayName: string;
  description: string;
  validTargets?: GridPosition[];
  priority: number;
}

export interface SubActionContext {
  unit: TacticalUnit;
  destination: GridPosition;
  hasMoved: boolean;
  tiles: TerrainTile[][];
  unitsMap: Map<string, TacticalUnit>;
  gridWidth: number;
  gridHeight: number;
  weather?: WeatherType;
  loadedUnits?: TacticalUnit[]; // If unit is a transport with units inside
}

/**
 * Returns whether a unit type is infantry or mech capable of capturing / launching silos.
 */
export function isFootSoldier(unitCode: string): boolean {
  const code = unitCode.toLowerCase();
  return code === 'infantry' || code === 'mech';
}

/**
 * Returns whether a unit is an APC or supply vehicle.
 */
export function isSupplyVehicle(unitCode: string): boolean {
  const code = unitCode.toLowerCase();
  return code === 'apc';
}

/**
 * Evaluates all valid tactical sub-actions available to a unit arriving at a given tile.
 */
export function evaluateAvailableSubActions(context: SubActionContext): AvailableSubAction[] {
  const {
    unit,
    destination,
    hasMoved,
    tiles,
    unitsMap,
    gridWidth,
    gridHeight,
    weather = 'clear',
    loadedUnits = [],
  } = context;

  const actions: AvailableSubAction[] = [];
  const destTile = tiles[destination.y]?.[destination.x];
  if (!destTile) return actions;

  // Target occupant at destination (excluding self)
  let destOccupant: TacticalUnit | undefined;
  for (const other of unitsMap.values()) {
    if (other.id !== unit.id && other.x === destination.x && other.y === destination.y) {
      destOccupant = other;
      break;
    }
  }

  // 1. JOIN (Combining with an identical allied unit)
  if (destOccupant && destOccupant.ownerId === unit.ownerId && destOccupant.unitCode === unit.unitCode) {
    if (destOccupant.hp < 10) {
      actions.push({
        type: 'join',
        displayName: 'Unir',
        description: `Fusionar con unidad aliada (${destOccupant.hp} HP). Restaura hasta 10 HP.`,
        priority: 10,
      });
      return actions; // Join occupies the destination tile completely
    }
  }

  // 2. LOAD (Boarding a transport unit)
  if (destOccupant && destOccupant.ownerId === unit.ownerId && isTransportUnit(destOccupant.unitCode)) {
    if (canUnitBoardTransport(unit.unitCode, destOccupant.unitCode)) {
      actions.push({
        type: 'load',
        displayName: 'Cargar',
        description: `Embarcar dentro de ${destOccupant.displayName}.`,
        priority: 11,
      });
      return actions; // Loading occupies transport
    }
  }

  // If another unit occupies this tile and it wasn't join/load, tile is blocked
  if (destOccupant) {
    return actions;
  }

  // Adjacent tiles
  const neighbors: GridPosition[] = [
    { x: destination.x, y: destination.y - 1 },
    { x: destination.x, y: destination.y + 1 },
    { x: destination.x - 1, y: destination.y },
    { x: destination.x + 1, y: destination.y },
  ].filter(p => p.x >= 0 && p.x < gridWidth && p.y >= 0 && p.y < gridHeight);

  // 3. CAPTURE & SILO LAUNCH
  if (isFootSoldier(unit.unitCode)) {
    // Silo Launch
    if (destTile.type === 'silo' && (destTile.captureHp === undefined || destTile.captureHp > 0)) {
      actions.push({
        type: 'launch_silo',
        displayName: 'Lanzar Silo',
        description: 'Disparar misil nuclear balístico de área 3x3 contra cualquier punto del mapa.',
        priority: 2,
      });
    }

    // Capture property
    const capturableTypes = ['city', 'factory', 'airport', 'port', 'hq', 'commtower', 'lab'];
    if (capturableTypes.includes(destTile.type) && destTile.ownerId !== unit.ownerId) {
      actions.push({
        type: 'capture',
        displayName: 'Capturar',
        description: `Iniciar o continuar la captura de ${destTile.type.toUpperCase()} (Puntos restantes: ${destTile.captureHp ?? 20}).`,
        priority: 3,
      });
    }
  }

  // 4. ATTACK EVALUATION
  const indirect = isIndirectFireUnit(unit.unitCode);
  const validAttackTargets: GridPosition[] = [];

  if (indirect) {
    // Indirect units can only attack if they DID NOT move this turn
    if (!hasMoved) {
      for (const enemy of unitsMap.values()) {
        if (enemy.ownerId !== unit.ownerId && enemy.hp > 0) {
          const dist = Math.abs(enemy.x - destination.x) + Math.abs(enemy.y - destination.y);
          if (dist >= unit.minRange && dist <= unit.maxRange) {
            validAttackTargets.push({ x: enemy.x, y: enemy.y });
          }
        }
      }
    }
  } else {
    // Direct combat units attack adjacent enemies
    for (const neighbor of neighbors) {
      for (const enemy of unitsMap.values()) {
        if (enemy.ownerId !== unit.ownerId && enemy.hp > 0 && enemy.x === neighbor.x && enemy.y === neighbor.y) {
          if (canDirectlyAttack(unit.unitCode, enemy.unitCode)) {
            validAttackTargets.push({ x: enemy.x, y: enemy.y });
          }
        }
      }
    }
  }

  if (validAttackTargets.length > 0) {
    actions.push({
      type: 'attack',
      displayName: 'Atacar',
      description: `Disparar contra objetivo enemigo (${validAttackTargets.length} en rango).`,
      validTargets: validAttackTargets,
      priority: 1,
    });
  }

  // 5. SUPPLY (APC replenishing neighbors)
  if (isSupplyVehicle(unit.unitCode)) {
    const suppliesNeeded = neighbors.some(n => {
      for (const ally of unitsMap.values()) {
        if (ally.ownerId === unit.ownerId && ally.x === n.x && ally.y === n.y) {
          return ally.ammo < 5 || ally.fuel < 50;
        }
      }
      return false;
    });

    if (suppliesNeeded) {
      actions.push({
        type: 'supply',
        displayName: 'Suministrar',
        description: 'Reabastecer combustible y munición a todas las unidades aliadas adyacentes.',
        priority: 4,
      });
    }
  }

  // 6. UNLOAD (Transport dropping off passengers onto valid adjacent terrain)
  if (isTransportUnit(unit.unitCode) && loadedUnits.length > 0) {
    const validUnloadSpots: GridPosition[] = [];
    for (const neighbor of neighbors) {
      // Check if spot is unoccupied
      const isOccupied = Array.from(unitsMap.values()).some(u => u.x === neighbor.x && u.y === neighbor.y);
      if (!isOccupied) {
        const nTile = tiles[neighbor.y][neighbor.x];
        // Check if passenger can traverse destination tile
        const canTraverse = loadedUnits.some(passenger => {
          const cost = getCanonicalMovementCost(passenger.movementType, nTile.type, weather);
          return cost !== Infinity;
        });
        if (canTraverse) {
          validUnloadSpots.push(neighbor);
        }
      }
    }

    if (validUnloadSpots.length > 0) {
      actions.push({
        type: 'unload',
        displayName: 'Descargar',
        description: `Desembarcar pasajeros en casilla adyacente transitable.`,
        validTargets: validUnloadSpots,
        priority: 5,
      });
    }
  }

  // 7. EXPLODE (Black Bomb suicide blast)
  if (unit.unitCode.toLowerCase() === 'blackbomb' || unit.unitCode.toLowerCase() === 'bomb') {
    actions.push({
      type: 'explode',
      displayName: 'Detonar',
      description: 'Autodestruir la unidad causando 5 PV de daño a todas las unidades a 3 casillas.',
      priority: 6,
    });
  }

  // 8. HIDE / SHOW (Stealth units / Submarines)
  if (unit.unitCode.toLowerCase() === 'submarine' || unit.unitCode.toLowerCase() === 'stealth') {
    actions.push({
      type: 'hide',
      displayName: 'Invisibilidad / Inmersión',
      description: 'Ocultar la unidad al radar enemigo (consume +5 combustible por turno).',
      priority: 7,
    });
  }

  // 9. DELETE (Disband un-moved unit for funds refund)
  if (!hasMoved && destination.x === unit.x && destination.y === unit.y) {
    actions.push({
      type: 'delete',
      displayName: 'Licenciar',
      description: `Disolver unidad y recuperar el 50% de fondos (${Math.floor(unit.productionCost / 2)}G).`,
      priority: 20,
    });
  }

  // 10. WAIT (Always available fallback)
  actions.push({
    type: 'wait',
    displayName: 'Esperar',
    description: 'Finalizar acción y agotar el turno de la unidad en esta posición.',
    priority: 99,
  });

  // Sort by priority
  return actions.sort((a, b) => a.priority - b.priority);
}

export function isTransportUnit(unitCode: string): boolean {
  const code = unitCode.toLowerCase();
  return code === 'apc' || code === 'lander' || code === 'tcopter' || code === 'cruiser' || code === 'blackboat';
}

export function canUnitBoardTransport(passengerCode: string, transportCode: string): boolean {
  const p = passengerCode.toLowerCase();
  const t = transportCode.toLowerCase();

  if (t === 'apc' || t === 'tcopter') {
    return p === 'infantry' || p === 'mech';
  }
  if (t === 'lander') {
    return p === 'infantry' || p === 'mech' || p === 'tank' || p === 'md_tank' || p === 'recon' || p === 'artillery';
  }
  if (t === 'cruiser') {
    return p === 'bcopter' || p === 'tcopter';
  }
  if (t === 'blackboat') {
    return p === 'infantry' || p === 'mech';
  }
  return false;
}

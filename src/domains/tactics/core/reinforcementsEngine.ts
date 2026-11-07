/**
 * ==============================================================================
 * MOTOR DE STOCK DE RESERVA & SISTEMA DE REFUERZOS TÁCTICOS (FASE 2)
 * ==============================================================================
 * Gestiona:
 * - El inventario militar de retaguardia (PlayerReserveStock) para cada bando.
 * - La selección de vanguardia pre-batalla.
 * - La solicitud de refuerzos en combate con cuenta regresiva estricta (4 turnos,
 *   o 3 turnos con buff de complejo industrial/fábrica activa).
 * - El despliegue de refuerzos sobre bases aliadas o airdrop de emergencia.
 */

import { TacticalUnit, TerrainTile, GridPosition } from '../types';

export interface StockUnitMeta {
  code: string;
  displayName: string;
  movementType: 'foot' | 'mech' | 'wheels' | 'treads' | 'air';
  movementPoints: number;
  minRange: number;
  maxRange: number;
  baseAttack: number;
  maxHp: number;
  productionCost: number;
  description: string;
}

export const CANONICAL_RESERVE_CATALOG: Record<string, StockUnitMeta> = {
  infantry: {
    code: 'infantry',
    displayName: 'Infantería Ligera',
    movementType: 'foot',
    movementPoints: 3,
    minRange: 1,
    maxRange: 1,
    baseAttack: 55,
    maxHp: 10,
    productionCost: 1000,
    description: 'Especialistas en captura de ciudades y combate urbano.',
  },
  mech: {
    code: 'mech',
    displayName: 'Infantería Pesada (Bazooka)',
    movementType: 'mech',
    movementPoints: 2,
    minRange: 1,
    maxRange: 1,
    baseAttack: 65,
    maxHp: 10,
    productionCost: 3000,
    description: 'Antiblindados de montaña con misiles de carga hueca.',
  },
  recon: {
    code: 'recon',
    displayName: 'Blindado de Reconocimiento',
    movementType: 'wheels',
    movementPoints: 8,
    minRange: 1,
    maxRange: 1,
    baseAttack: 70,
    maxHp: 10,
    productionCost: 4000,
    description: 'Alta movilidad en carretera y visión extendida.',
  },
  tank_light: {
    code: 'tank_light',
    displayName: 'Tanque Ligero de Asalto',
    movementType: 'treads',
    movementPoints: 6,
    minRange: 1,
    maxRange: 1,
    baseAttack: 75,
    maxHp: 10,
    productionCost: 7000,
    description: 'Columna vertebral de blindaje y ruptura de líneas.',
  },
  tank_medium: {
    code: 'tank_medium',
    displayName: 'Tanque Medio de Combate',
    movementType: 'treads',
    movementPoints: 5,
    minRange: 1,
    maxRange: 1,
    baseAttack: 85,
    maxHp: 10,
    productionCost: 16000,
    description: 'Blindaje pesado y cañón de alta penetración.',
  },
  artillery: {
    code: 'artillery',
    displayName: 'Batería de Artillería',
    movementType: 'treads',
    movementPoints: 5,
    minRange: 2,
    maxRange: 3,
    baseAttack: 80,
    maxHp: 10,
    productionCost: 6000,
    description: 'Fuego indirecto devastador contra blindados y posiciones fijas.',
  },
  anti_air: {
    code: 'anti_air',
    displayName: 'Blindado Vulcan Antiaéreo',
    movementType: 'treads',
    movementPoints: 6,
    minRange: 1,
    maxRange: 1,
    baseAttack: 75,
    maxHp: 10,
    productionCost: 8000,
    description: 'Triturador de infantería y cazador supremo de helicópteros.',
  },
};

export interface PlayerReserveStock {
  playerId: 'p1' | 'p2';
  units: Record<string, number>; // unitCode -> stock numérico disponible
}

export interface ReinforcementRequest {
  id: string;
  playerId: 'p1' | 'p2';
  unitCodes: string[];
  initialDelayTurns: number;
  turnsUntilArrival: number;
  requestedAtTurn: number;
  status: 'en_route' | 'arrived' | 'cancelled';
}

export interface ReinforcementsEngineState {
  stocks: Record<'p1' | 'p2', PlayerReserveStock>;
  pendingRequests: ReinforcementRequest[];
  history: ReinforcementRequest[];
}

/**
 * Genera el stock de reserva militar inicial para un comandante.
 */
export function createInitialReserveStock(playerId: 'p1' | 'p2'): PlayerReserveStock {
  return {
    playerId,
    units: {
      infantry: 6,
      mech: 4,
      recon: 3,
      tank_light: 4,
      tank_medium: 2,
      artillery: 3,
      anti_air: 2,
    },
  };
}

export function initializeReinforcementsEngine(): ReinforcementsEngineState {
  return {
    stocks: {
      p1: createInitialReserveStock('p1'),
      p2: createInitialReserveStock('p2'),
    },
    pendingRequests: [],
    history: [],
  };
}

/**
 * Valida y descuenta las tropas seleccionadas para la vanguardia inicial.
 */
export function consumeVanguardDeployment(
  stock: PlayerReserveStock,
  selectedUnitCodes: string[]
): { success: boolean; error?: string; updatedStock: PlayerReserveStock } {
  const updatedUnits = { ...stock.units };

  for (const code of selectedUnitCodes) {
    if (!updatedUnits[code] || updatedUnits[code] <= 0) {
      return {
        success: false,
        error: `Stock insuficiente para la unidad '${code}'.`,
        updatedStock: stock,
      };
    }
    updatedUnits[code]--;
  }

  return {
    success: true,
    updatedStock: {
      ...stock,
      units: updatedUnits,
    },
  };
}

/**
 * Solicita una oleada de refuerzos en combate con delay estricto.
 */
export function requestReinforcements(
  state: ReinforcementsEngineState,
  payload: {
    playerId: 'p1' | 'p2';
    unitCodes: string[];
    currentTurnNumber: number;
    hasFactoryBuff: boolean; // Si tiene fábrica aliada activa, tarda 3 turnos en vez de 4
  }
): {
  success: boolean;
  error?: string;
  request?: ReinforcementRequest;
  nextState: ReinforcementsEngineState;
} {
  const { playerId, unitCodes, currentTurnNumber, hasFactoryBuff } = payload;
  const currentStock = state.stocks[playerId];

  if (unitCodes.length === 0) {
    return { success: false, error: 'Debes seleccionar al menos una unidad para los refuerzos.', nextState: state };
  }

  // Verificar stock disponible
  const consumptionResult = consumeVanguardDeployment(currentStock, unitCodes);
  if (!consumptionResult.success) {
    return { success: false, error: consumptionResult.error, nextState: state };
  }

  const delay = hasFactoryBuff ? 3 : 4;
  const newRequest: ReinforcementRequest = {
    id: `reinf_${playerId}_t${currentTurnNumber}_${Date.now() % 100000}`,
    playerId,
    unitCodes: [...unitCodes],
    initialDelayTurns: delay,
    turnsUntilArrival: delay,
    requestedAtTurn: currentTurnNumber,
    status: 'en_route',
  };

  const nextState: ReinforcementsEngineState = {
    ...state,
    stocks: {
      ...state.stocks,
      [playerId]: consumptionResult.updatedStock,
    },
    pendingRequests: [...state.pendingRequests, newRequest],
  };

  return {
    success: true,
    request: newRequest,
    nextState,
  };
}

export interface ReinforcementDeploymentResult {
  nextState: ReinforcementsEngineState;
  newUnitsDeployed: TacticalUnit[];
  arrivedRequestsCount: number;
}

/**
 * Procesa la cuenta regresiva al finalizar el turno de un jugador.
 * Cuando turnsUntilArrival llega a 0, despliega las tropas sobre fábricas/HQ aliadas.
 */
export function processTurnArrival(
  state: ReinforcementsEngineState,
  tiles: TerrainTile[][],
  existingUnits: TacticalUnit[],
  endingPlayer: 'p1' | 'p2'
): ReinforcementDeploymentResult {
  const remainingPending: ReinforcementRequest[] = [];
  const newlyArrived: ReinforcementRequest[] = [];

  for (const req of state.pendingRequests) {
    if (req.playerId === endingPlayer) {
      const nextTurns = req.turnsUntilArrival - 1;
      if (nextTurns <= 0) {
        newlyArrived.push({ ...req, turnsUntilArrival: 0, status: 'arrived' });
      } else {
        remainingPending.push({ ...req, turnsUntilArrival: nextTurns });
      }
    } else {
      remainingPending.push(req);
    }
  }

  // Generar posiciones de despliegue para las tropas que han llegado
  const newUnitsDeployed: TacticalUnit[] = [];
  const occupiedCoords = new Set<string>(existingUnits.map(u => `${u.x},${u.y}`));

  // Encontrar bases aliadas disponibles (Fábricas primero, luego HQ, luego ciudades aliadas)
  const spawnPoints: GridPosition[] = [];
  for (let y = 0; y < tiles.length; y++) {
    for (let x = 0; x < tiles[y].length; x++) {
      const tile = tiles[y][x];
      if (tile.ownerId === endingPlayer && (tile.type === 'factory' || tile.type === 'hq')) {
        spawnPoints.push({ x, y });
      }
    }
  }

  for (const req of newlyArrived) {
    for (const code of req.unitCodes) {
      const meta = CANONICAL_RESERVE_CATALOG[code] || CANONICAL_RESERVE_CATALOG.infantry;
      // Buscar el primer punto de spawn no ocupado
      let targetCoord = spawnPoints.find(pt => !occupiedCoords.has(`${pt.x},${pt.y}`));

      // Si todas las bases están ocupadas, desplegar en celda libre adyacente (Airdrop táctico)
      if (!targetCoord) {
        for (const base of spawnPoints) {
          const adj = [
            { x: base.x + 1, y: base.y },
            { x: base.x - 1, y: base.y },
            { x: base.x, y: base.y + 1 },
            { x: base.x, y: base.y - 1 },
          ].find(p => p.x >= 0 && p.x < tiles[0].length && p.y >= 0 && p.y < tiles.length && !occupiedCoords.has(`${p.x},${p.y}`));

          if (adj) {
            targetCoord = adj;
            break;
          }
        }
      }

      // Si aún no hay coordenada (caso extremo de cerco), usar primera casilla vacía
      if (!targetCoord) {
        targetCoord = { x: 0, y: 0 };
      }

      occupiedCoords.add(`${targetCoord.x},${targetCoord.y}`);

      const newUnit: TacticalUnit = {
        id: `reinf_${req.playerId}_${code}_${Date.now() % 10000}_${Math.floor(Math.random() * 999)}`,
        unitCode: meta.code,
        displayName: meta.displayName,
        ownerId: req.playerId,
        x: targetCoord.x,
        y: targetCoord.y,
        hp: meta.maxHp,
        maxHp: meta.maxHp,
        ammo: 10,
        fuel: 99,
        movementPoints: meta.movementPoints,
        movementType: meta.movementType,
        minRange: meta.minRange,
        maxRange: meta.maxRange,
        visionRange: 2,
        baseAttack: meta.baseAttack,
        productionCost: meta.productionCost,
        hasMoved: false,
        hasActed: false,
        skinId: req.playerId === 'p1' ? 'red_star_standard' : 'blue_moon_standard',
      };

      newUnitsDeployed.push(newUnit);
    }
  }

  const nextState: ReinforcementsEngineState = {
    ...state,
    pendingRequests: remainingPending,
    history: [...state.history, ...newlyArrived],
  };

  return {
    nextState,
    newUnitsDeployed,
    arrivedRequestsCount: newlyArrived.length,
  };
}

/**
 * SISTEMA CANÓNICO DE ECONOMÍA, FLUJO DE TURNOS Y PRODUCCIÓN MILITAR
 * Especificación Advance Wars / WarsWorld / AWBW
 * 
 * Reglas:
 * 1. Ingresos por turno: +1.000G por cada propiedad operativa controlada (Ciudades, Bases, HQs, Aeropuertos, Puertos, Torres, Labs).
 * 2. Reparación y reabastecimiento: unidades sobre propiedades aliadas reparan +2 HP por turno a un coste de 10% del valor base por HP, y recargan munición y combustible al máximo.
 * 3. Menú de producción en fábricas y bases aliadas.
 * 4. Detección de fin de partida (Captura de HQ o destrucción total del ejército rival).
 */

import { GridPosition, TacticalUnit, TerrainTile, TerrainType } from '../types';

export interface ProductionCatalogEntry {
  displayName: string;
  cost: number;
  facility: 'factory' | 'airport' | 'port';
  movementPoints: number;
  movementType: 'foot' | 'mech' | 'wheels' | 'treads' | 'air' | 'sea';
  minRange: number;
  maxRange: number;
  baseAttack: number;
  ammo: number;
  fuel: number;
  description: string;
}

export const CANONICAL_UNIT_PRODUCTION_CATALOG: Record<string, ProductionCatalogEntry> = {
  infantry: {
    displayName: 'Infantería',
    cost: 1000,
    facility: 'factory',
    movementPoints: 3,
    movementType: 'foot',
    minRange: 1,
    maxRange: 1,
    baseAttack: 55,
    ammo: 9,
    fuel: 99,
    description: 'Tropa ligera a pie. Especialista en captura de sedes y avance en montañas.',
  },
  mech: {
    displayName: 'Mecanizado (Bazooka)',
    cost: 3000,
    facility: 'factory',
    movementPoints: 2,
    movementType: 'mech',
    minRange: 1,
    maxRange: 1,
    baseAttack: 65,
    ammo: 3,
    fuel: 70,
    description: 'Infantería pesada con bazooka antitanque. Alta defensa en terreno abrupto.',
  },
  recon: {
    displayName: 'Vehículo de Reconocimiento',
    cost: 4000,
    facility: 'factory',
    movementPoints: 8,
    movementType: 'wheels',
    minRange: 1,
    maxRange: 1,
    baseAttack: 70,
    ammo: 9,
    fuel: 80,
    description: 'Vehículo veloz sobre ruedas con rango de visión superior (5 casillas).',
  },
  artillery: {
    displayName: 'Artillería de Asedio',
    cost: 6000,
    facility: 'factory',
    movementPoints: 5,
    movementType: 'treads',
    minRange: 2,
    maxRange: 3,
    baseAttack: 80,
    ammo: 9,
    fuel: 50,
    description: 'Fuego indirecto móvil. Bombardea a distancia sin exponerse al contraataque.',
  },
  tank_light: {
    displayName: 'Tanque Ligero',
    cost: 7000,
    facility: 'factory',
    movementPoints: 6,
    movementType: 'treads',
    minRange: 1,
    maxRange: 1,
    baseAttack: 75,
    ammo: 9,
    fuel: 70,
    description: 'Blindado estándar rápido y versátil. Columna vertebral de combate terrestre.',
  },
  anti_air: {
    displayName: 'Unidad Antiaérea (Vulcan)',
    cost: 8000,
    facility: 'factory',
    movementPoints: 6,
    movementType: 'treads',
    minRange: 1,
    maxRange: 1,
    baseAttack: 105,
    ammo: 9,
    fuel: 60,
    description: 'Cañón rotativo devastador contra helicópteros, aviones e infantería.',
  },
  rocket: {
    displayName: 'Lanzacohetes Múltiple',
    cost: 15000,
    facility: 'factory',
    movementPoints: 5,
    movementType: 'wheels',
    minRange: 3,
    maxRange: 5,
    baseAttack: 95,
    ammo: 6,
    fuel: 50,
    description: 'Batería de misiles de largo alcance (3-5 casillas). Gran poder de disuasión.',
  },
  tank_medium: {
    displayName: 'Tanque Mediano (Heavy)',
    cost: 16000,
    facility: 'factory',
    movementPoints: 5,
    movementType: 'treads',
    minRange: 1,
    maxRange: 1,
    baseAttack: 105,
    ammo: 8,
    fuel: 50,
    description: 'Blindaje reforzado y cañón de grueso calibre. Destructor de primera línea.',
  },
  b_copter: {
    displayName: 'Helicóptero de Batalla',
    cost: 9000,
    facility: 'airport',
    movementPoints: 6,
    movementType: 'air',
    minRange: 1,
    maxRange: 1,
    baseAttack: 75,
    ammo: 6,
    fuel: 99,
    description: 'Unidad aérea táctica versátil contra tanques e infantería enemiga.',
  },
  fighter: {
    displayName: 'Caza Interceptor',
    cost: 20000,
    facility: 'airport',
    movementPoints: 9,
    movementType: 'air',
    minRange: 1,
    maxRange: 1,
    baseAttack: 100,
    ammo: 9,
    fuel: 99,
    description: 'Supremacía aérea total. Destruye cazas, bombarderos y helicópteros.',
  },
  bomber: {
    displayName: 'Bombardero Pesado',
    cost: 22000,
    facility: 'airport',
    movementPoints: 7,
    movementType: 'air',
    minRange: 1,
    maxRange: 1,
    baseAttack: 110,
    ammo: 9,
    fuel: 99,
    description: 'Bombardeo en picado catastrófico contra blindados terrestres y buques.',
  },
  battleship: {
    displayName: 'Acorazado Naval',
    cost: 28000,
    facility: 'port',
    movementPoints: 5,
    movementType: 'sea',
    minRange: 2,
    maxRange: 6,
    baseAttack: 100,
    ammo: 9,
    fuel: 99,
    description: 'Fortaleza flotante de bombardeo naval costero con alcance de 6 casillas.',
  },
  apc: {
    displayName: 'Transporte Blindado (APC)',
    cost: 5000,
    facility: 'factory',
    movementPoints: 6,
    movementType: 'treads',
    minRange: 1,
    maxRange: 1,
    baseAttack: 0,
    ammo: 0,
    fuel: 70,
    description: 'Transporta 1 Inf/Mech y suministra munición/combustible a tropas adyacentes.',
  },
  neotank: {
    displayName: 'Neotanque Pesado',
    cost: 22000,
    facility: 'factory',
    movementPoints: 6,
    movementType: 'treads',
    minRange: 1,
    maxRange: 1,
    baseAttack: 115,
    ammo: 9,
    fuel: 99,
    description: 'Superblindado de vanguardia con alta movilidad (6 casillas) y cañón de plasma.',
  },
  t_copter: {
    displayName: 'Helicóptero de Transporte',
    cost: 5000,
    facility: 'airport',
    movementPoints: 6,
    movementType: 'air',
    minRange: 1,
    maxRange: 1,
    baseAttack: 0,
    ammo: 0,
    fuel: 99,
    description: 'Transporte aéreo veloz y desarmado para 1 unidad de infantería o mecanizada.',
  },
  missiles: {
    displayName: 'Batería de Misiles AA',
    cost: 12000,
    facility: 'factory',
    movementPoints: 4,
    movementType: 'wheels',
    minRange: 3,
    maxRange: 5,
    baseAttack: 100,
    ammo: 6,
    fuel: 50,
    description: 'Defensa antiaérea indirecta de largo alcance (3-5 casillas).',
  },
  missile: {
    displayName: 'Batería de Misiles AA',
    cost: 12000,
    facility: 'factory',
    movementPoints: 4,
    movementType: 'wheels',
    minRange: 3,
    maxRange: 5,
    baseAttack: 100,
    ammo: 6,
    fuel: 50,
    description: 'Defensa antiaérea indirecta de largo alcance (3-5 casillas).',
  },
};

export interface TurnProcessingResult {
  nextPlayerId: string;
  turnNumber: number;
  fundsAdded: number;
  newFunds: number;
  unitsRepairedCount: number;
  totalRepairCost: number;
  gameOver: {
    isOver: boolean;
    winnerId: string | null;
    reason: 'hq_captured' | 'all_units_destroyed' | null;
  };
}

export class TurnEconomyEngine {
  /**
   * Calcula los ingresos generados por propiedades controladas (+1000G c/u).
   */
  public static calculateIncome(playerId: string, tiles: TerrainTile[][]): number {
    let income = 0;
    const height = tiles.length;
    const width = tiles[0]?.length || 0;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const tile = tiles[y][x];
        if (tile.ownerId === playerId) {
          if (
            ['city', 'factory', 'airport', 'port', 'hq', 'commtower', 'lab'].includes(
              tile.type
            )
          ) {
            income += 1000;
          }
        }
      }
    }

    return income;
  }

  /**
   * Repara unidades (+2 HP máx) y reabastece munición/combustible en sedes aliadas.
   */
  public static processRepairsAndResupply(
    playerId: string,
    units: TacticalUnit[],
    tiles: TerrainTile[][],
    currentFunds: number
  ): {
    updatedUnits: TacticalUnit[];
    updatedFunds: number;
    unitsRepaired: number;
    spentFunds: number;
  } {
    let funds = currentFunds;
    let unitsRepaired = 0;
    let spentFunds = 0;

    const updatedUnits = units.map(unit => {
      // Solo procesar unidades del jugador que entra en turno
      if (unit.ownerId !== playerId) {
        return unit;
      }

      // Reiniciar estado de acción para el nuevo turno
      const refreshedUnit: TacticalUnit = {
        ...unit,
        hasMoved: false,
        hasActed: false,
      };

      const tile = tiles[unit.y]?.[unit.x];
      if (!tile || tile.ownerId !== playerId) {
        return refreshedUnit;
      }

      // Comprobar si la sede es compatible con el tipo de unidad
      const isLandRepair =
        ['factory', 'city', 'hq'].includes(tile.type) &&
        ['foot', 'mech', 'wheels', 'treads'].includes(unit.movementType);
      const isAirRepair = tile.type === 'airport' && unit.movementType === 'air';
      const isSeaRepair = tile.type === 'port' && unit.movementType === 'sea';

      if (isLandRepair || isAirRepair || isSeaRepair) {
        // Reabastecimiento completo gratuito
        refreshedUnit.fuel = 99;
        refreshedUnit.ammo = CANONICAL_UNIT_PRODUCTION_CATALOG[unit.unitCode]?.ammo ?? 9;

        // Reparación de salud (Escala nativa continua 1-100 HP: +20 HP/turno, 1% de coste por HP)
        const is100Scale = unit.maxHp === 100 || unit.hp > 10;
        const maxHp = is100Scale ? 100 : 10;
        const maxRepair = is100Scale ? 20 : 2;
        const divisor = is100Scale ? 100 : 10;

        const missingHp = maxHp - unit.hp;
        if (missingHp > 0 && funds > 0) {
          const costPerHp = Math.max(1, Math.floor(unit.productionCost / divisor));
          const maxHpAffordable = Math.floor(funds / costPerHp);
          const hpToHeal = Math.min(maxRepair, missingHp, maxHpAffordable);

          if (hpToHeal > 0) {
            const repairCost = hpToHeal * costPerHp;
            funds -= repairCost;
            spentFunds += repairCost;
            refreshedUnit.hp = Math.min(maxHp, unit.hp + hpToHeal);
            unitsRepaired++;
          }
        }
      }

      return refreshedUnit;
    });

    return {
      updatedUnits,
      updatedFunds: funds,
      unitsRepaired,
      spentFunds,
    };
  }

  /**
   * Calcula el impuesto logístico por sobrecapacidad militar (Soft Cap de Suministros).
   * Hasta 14 unidades el coste es $0G. A partir de la unidad 15, -$200G por cada unidad excedente.
   */
  public static calculateSupplyUpkeep(
    playerId: string,
    units: TacticalUnit[],
    freeCap: number = 14,
    upkeepPerUnit: number = 200
  ): {
    totalUnits: number;
    excessUnits: number;
    upkeepCost: number;
    totalUpkeepG: number;
    isOverCapacity: boolean;
  } {
    const playerUnits = units.filter(u => u.ownerId === playerId);
    const totalUnits = playerUnits.length;
    const excessUnits = Math.max(0, totalUnits - freeCap);
    const upkeepCost = excessUnits * upkeepPerUnit;

    return {
      totalUnits,
      excessUnits,
      upkeepCost,
      totalUpkeepG: upkeepCost,
      isOverCapacity: excessUnits > 0,
    };
  }

  /**
   * Produce una unidad en una instalación aliada si hay fondos suficientes y la casilla está libre.
   */
  public static produceUnit(
    unitCode: string,
    facilityCoord: GridPosition,
    ownerId: string,
    currentFunds: number,
    existingUnits: TacticalUnit[],
    tiles: TerrainTile[][],
    costModifier?: (baseCost: number) => number
  ): {
    success: boolean;
    newUnit: TacticalUnit | null;
    remainingFunds: number;
    errorMessage?: string;
  } {
    const tile = tiles[facilityCoord.y]?.[facilityCoord.x];
    if (!tile || tile.ownerId !== ownerId) {
      return {
        success: false,
        newUnit: null,
        remainingFunds: currentFunds,
        errorMessage: 'La instalación no pertenece al comandante activo.',
      };
    }

    const catalogEntry = CANONICAL_UNIT_PRODUCTION_CATALOG[unitCode];
    if (!catalogEntry) {
      return {
        success: false,
        newUnit: null,
        remainingFunds: currentFunds,
        errorMessage: 'Código de unidad militar no registrado.',
      };
    }

    // Validar tipo de instalación
    if (tile.type !== catalogEntry.facility) {
      return {
        success: false,
        newUnit: null,
        remainingFunds: currentFunds,
        errorMessage: `Esta unidad solo se produce en ${catalogEntry.facility}.`,
      };
    }

    // Validar casilla desocupada
    const unitOnTile = existingUnits.find(
      u => u.x === facilityCoord.x && u.y === facilityCoord.y
    );
    if (unitOnTile) {
      return {
        success: false,
        newUnit: null,
        remainingFunds: currentFunds,
        errorMessage: 'La plataforma de despliegue se encuentra ocupada.',
      };
    }

    const finalCost = costModifier ? costModifier(catalogEntry.cost) : catalogEntry.cost;

    // Validar fondos
    if (currentFunds < finalCost) {
      return {
        success: false,
        newUnit: null,
        remainingFunds: currentFunds,
        errorMessage: `Fondos insuficientes (${currentFunds}G / ${finalCost}G requeridos).`,
      };
    }

    const uniqueId = `unit_${ownerId}_${unitCode}_${Date.now()}`;
    const newUnit: TacticalUnit = {
      id: uniqueId,
      unitCode,
      displayName: catalogEntry.displayName,
      ownerId,
      x: facilityCoord.x,
      y: facilityCoord.y,
      hp: 100,
      maxHp: 100,
      ammo: catalogEntry.ammo,
      fuel: catalogEntry.fuel,
      movementPoints: catalogEntry.movementPoints,
      movementType: catalogEntry.movementType,
      minRange: catalogEntry.minRange,
      maxRange: catalogEntry.maxRange,
      visionRange: unitCode === 'recon' ? 5 : 2,
      baseAttack: catalogEntry.baseAttack,
      productionCost: finalCost,
      hasMoved: true, // Nace en espera durante su turno de fabricación
      hasActed: true,
      skinId: 'default',
      tier: 1,
    };

    return {
      success: true,
      newUnit,
      remainingFunds: currentFunds - finalCost,
    };
  }

  /**
   * Evalúa las condiciones canónicas de victoria de la partida.
   */
  public static checkGameOver(
    tiles: TerrainTile[][],
    units: TacticalUnit[]
  ): {
    isOver: boolean;
    winnerId: string | null;
    reason: 'hq_captured' | 'all_units_destroyed' | null;
  } {
    const p1Units = units.filter(u => u.ownerId === 'p1');
    const p2Units = units.filter(u => u.ownerId === 'p2');

    // 1. Victoria por aniquilación de tropas
    if (p1Units.length === 0 && p2Units.length > 0) {
      return { isOver: true, winnerId: 'p2', reason: 'all_units_destroyed' };
    }
    if (p2Units.length === 0 && p1Units.length > 0) {
      return { isOver: true, winnerId: 'p1', reason: 'all_units_destroyed' };
    }

    // 2. Comprobar posesión de cuarteles generales (HQ)
    let p1HasHq = false;
    let p2HasHq = false;

    const height = tiles.length;
    const width = tiles[0]?.length || 0;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const t = tiles[y][x];
        if (t.type === 'hq') {
          if (t.ownerId === 'p1') p1HasHq = true;
          if (t.ownerId === 'p2') p2HasHq = true;
        }
      }
    }

    if (!p1HasHq && p2HasHq) {
      return { isOver: true, winnerId: 'p2', reason: 'hq_captured' };
    }
    if (!p2HasHq && p1HasHq) {
      return { isOver: true, winnerId: 'p1', reason: 'hq_captured' };
    }

    return { isOver: false, winnerId: null, reason: null };
  }
}

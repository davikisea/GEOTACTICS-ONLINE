import { TacticalUnit, TerrainTile } from '../types';

export interface UnitMaintenanceReport {
  unitId: string;
  unitCode: string;
  repairedHp: number;
  repairCost: number;
  newHp: number;
  resuppliedAmmo: boolean;
  resuppliedFuel: boolean;
  facilityType: string;
}

export interface MaintenanceProcessingResult {
  updatedUnits: TacticalUnit[];
  updatedFunds: number;
  totalFundsSpent: number;
  reports: UnitMaintenanceReport[];
}

/**
 * Validates if a property tile is compatible to repair/resupply a specific unit traction.
 */
export function isPropertyCompatibleWithUnit(
  propertyType: string,
  movementType: string
): boolean {
  const p = propertyType.toLowerCase();
  const m = movementType.toLowerCase();

  if (m === 'air') {
    return p === 'airport';
  }
  if (m === 'sea') {
    return p === 'port';
  }
  // Ground units (foot, mech, wheels, treads)
  return p === 'city' || p === 'factory' || p === 'hq' || p === 'lab' || p === 'commtower';
}

/**
 * Processes start-of-turn property repairs and resupplies for the active player.
 * Canon Advance Wars rules:
 * - Full ammo & fuel resupply is FREE on compatible allied properties.
 * - Repairs up to +2 HP (or +3 HP for Rachel).
 * - Repair cost per HP = productionCost / 10.
 * - Deducts funds from player treasury; limited by treasury balance.
 */
export function processPropertyMaintenance(
  units: TacticalUnit[],
  tiles: TerrainTile[][],
  activePlayerId: string,
  playerFunds: number,
  coId?: string
): MaintenanceProcessingResult {
  const normCO = (coId || '').toLowerCase();
  const maxHpRepair = normCO === 'rachel' ? 3 : 2;

  let currentFunds = playerFunds;
  let totalFundsSpent = 0;
  const updatedUnits: TacticalUnit[] = [];
  const reports: UnitMaintenanceReport[] = [];

  for (const unit of units) {
    if (unit.ownerId !== activePlayerId || unit.hp <= 0) {
      updatedUnits.push(unit);
      continue;
    }

    const tile = tiles[unit.y]?.[unit.x];
    const isAlliedProperty = tile && tile.ownerId === activePlayerId;

    if (!isAlliedProperty || !isPropertyCompatibleWithUnit(tile.type, unit.movementType)) {
      updatedUnits.push(unit);
      continue;
    }

    // 1. Resupply Ammo & Fuel (Always free on compatible properties)
    const resuppliedAmmo = unit.ammo < 9;
    const resuppliedFuel = unit.fuel < (unit.movementType === 'air' ? 99 : 70);
    const newAmmo = 9;
    const newFuel = unit.movementType === 'air' ? 99 : 70;

    // 2. Repair HP (Up to maxHpRepair, capped by missing HP and available funds)
    const missingHp = 10 - unit.hp;
    const costPerHp = Math.max(1, Math.floor(unit.productionCost / 10));

    let hpToHeal = 0;
    if (missingHp > 0) {
      const affordableHp = Math.floor(currentFunds / costPerHp);
      hpToHeal = Math.min(maxHpRepair, missingHp, affordableHp);
    }

    const repairCost = hpToHeal * costPerHp;
    currentFunds -= repairCost;
    totalFundsSpent += repairCost;
    const newHp = unit.hp + hpToHeal;

    const updatedUnit: TacticalUnit = {
      ...unit,
      hp: newHp,
      ammo: newAmmo,
      fuel: newFuel,
    };
    updatedUnits.push(updatedUnit);

    reports.push({
      unitId: unit.id,
      unitCode: unit.unitCode,
      repairedHp: hpToHeal,
      repairCost,
      newHp,
      resuppliedAmmo,
      resuppliedFuel,
      facilityType: tile.type,
    });
  }

  return {
    updatedUnits,
    updatedFunds: currentFunds,
    totalFundsSpent,
    reports,
  };
}

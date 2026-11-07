import { TacticalUnit } from '../types';
import { WeatherType } from './canonicalMovement';

export interface FuelConsumptionReport {
  unitId: string;
  unitCode: string;
  previousFuel: number;
  fuelConsumed: number;
  remainingFuel: number;
  crashed: boolean;
  sunken: boolean;
  immobilized: boolean;
  logMessage: string;
}

export interface FuelProcessingResult {
  updatedUnits: TacticalUnit[];
  destroyedUnitIds: string[];
  reports: FuelConsumptionReport[];
}

/**
 * Calculates per-turn fuel burn for a unit based on type, stealth/submerge state, CO and weather.
 * Canon Advance Wars / WarsWorld rule:
 * - Air: 5 fuel/turn (Copter: 2/turn, Hidden stealth: 8/turn, Eagle CO: -2 fuel discount)
 * - Sea: 1 fuel/turn (Submerged sub: 5/turn)
 * - Snow: doubles fuel burn for vehicles/treads/wheels
 */
export function getUnitTurnFuelConsumption(
  unit: TacticalUnit,
  weather: WeatherType = 'clear',
  coId?: string,
  isHidden: boolean = false
): number {
  const code = unit.unitCode.toLowerCase();
  const normCO = (coId || '').toLowerCase();
  let consumption = 0;

  if (unit.movementType === 'air') {
    consumption = 5;
    if (code === 'b_copter' || code === 't_copter' || code === 'copter') {
      consumption = 2;
    } else if (code === 'stealth' && isHidden) {
      consumption = 8;
    }

    // Eagle CO passive: aircraft consume 2 less fuel per day (minimum 1)
    if (normCO === 'eagle') {
      consumption = Math.max(1, consumption - 2);
    }
  } else if (unit.movementType === 'sea') {
    consumption = 1;
    if (code === 'submarine' && isHidden) {
      consumption = 5;
    }
  } else {
    // Ground units consume 0 passive fuel unless moving or in extreme weather
    consumption = 0;
  }

  // Snow doubles fuel burn
  if (weather === 'snow' && normCO !== 'olaf') {
    consumption = consumption > 0 ? consumption * 2 : 0;
  }

  return consumption;
}

/**
 * Processes daily fuel drain for all active units of a player at turn start.
 * Implements canonical crash and sink fatalities when fuel runs dry:
 * - Aircraft at 0 fuel CRASH and are destroyed.
 * - Submerged submarines at 0 fuel SINK and are destroyed.
 * - Ground units and surface ships are IMMOBILIZED at 0 fuel.
 */
export function processTurnFuelConsumption(
  units: TacticalUnit[],
  activePlayerId: string,
  weather: WeatherType = 'clear',
  coId?: string,
  submergedUnitIds: Set<string> = new Set()
): FuelProcessingResult {
  const updatedUnits: TacticalUnit[] = [];
  const destroyedUnitIds: string[] = [];
  const reports: FuelConsumptionReport[] = [];

  for (const unit of units) {
    if (unit.ownerId !== activePlayerId || unit.hp <= 0) {
      updatedUnits.push(unit);
      continue;
    }

    const isHidden = submergedUnitIds.has(unit.id);
    const burn = getUnitTurnFuelConsumption(unit, weather, coId, isHidden);
    const newFuel = Math.max(0, unit.fuel - burn);

    let crashed = false;
    let sunken = false;
    let immobilized = false;
    let newHp = unit.hp;
    let logMsg = '';

    if (newFuel === 0) {
      if (unit.movementType === 'air') {
        crashed = true;
        newHp = 0;
        destroyedUnitIds.push(unit.id);
        logMsg = `¡${unit.displayName} se quedó sin combustible y se estrelló!`;
      } else if (unit.movementType === 'sea' && isHidden) {
        sunken = true;
        newHp = 0;
        destroyedUnitIds.push(unit.id);
        logMsg = `¡${unit.displayName} se quedó sin combustible en inmersión y se hundió!`;
      } else {
        immobilized = true;
        logMsg = `${unit.displayName} ha agotado su combustible y no puede desplazarse.`;
      }
    } else {
      logMsg = `${unit.displayName} consumió ${burn} fuel. Restante: ${newFuel}.`;
    }

    const updated: TacticalUnit = {
      ...unit,
      fuel: newFuel,
      hp: newHp,
    };

    if (newHp > 0) {
      updatedUnits.push(updated);
    }

    reports.push({
      unitId: unit.id,
      unitCode: unit.unitCode,
      previousFuel: unit.fuel,
      fuelConsumed: burn,
      remainingFuel: newFuel,
      crashed,
      sunken,
      immobilized,
      logMessage: logMsg,
    });
  }

  return {
    updatedUnits,
    destroyedUnitIds,
    reports,
  };
}

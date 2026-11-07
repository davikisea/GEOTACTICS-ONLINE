/**
 * SUITE DE PRUEBAS DE COMANDANTES (COs) Y SUPERPODERES
 * Especificación Advance Wars / WarsWorld / TacticalCommand
 */

import {
  COEngine,
  CANONICAL_CO_REGISTRY,
  PlayerCOState,
  STAR_CHARGE_VALUE,
} from '@domains/tactics';
import { TacticalUnit, TerrainTile } from '../types';

export function runCOTests(): {
  passed: number;
  total: number;
  results: { name: string; passed: boolean; message: string }[];
} {
  const results: { name: string; passed: boolean; message: string }[] = [];

  // TEST 1: Andy Hyper Repair (+2 HP a todas las unidades aliadas)
  try {
    const units: TacticalUnit[] = [
      {
        id: 'u1',
        unitCode: 'infantry',
        displayName: 'Infantería',
        ownerId: 'p1',
        x: 0,
        y: 0,
        hp: 6,
        maxHp: 10,
        ammo: 9,
        fuel: 99,
        movementPoints: 3,
        movementType: 'foot',
        minRange: 1,
        maxRange: 1,
        visionRange: 2,
        baseAttack: 55,
        productionCost: 1000,
        hasMoved: false,
        hasActed: false,
      },
      {
        id: 'u2',
        unitCode: 'tank_light',
        displayName: 'Tanque',
        ownerId: 'p1',
        x: 1,
        y: 0,
        hp: 9,
        maxHp: 10,
        ammo: 9,
        fuel: 70,
        movementPoints: 6,
        movementType: 'treads',
        minRange: 1,
        maxRange: 1,
        visionRange: 3,
        baseAttack: 75,
        productionCost: 7000,
        hasMoved: false,
        hasActed: false,
      },
    ];

    const state: PlayerCOState = {
      coId: 'andy',
      powerMeter: 27000, // 3 estrellas llenas
      activePower: null,
    };

    const res = COEngine.activatePower(state, 'cop', {
      player: 'p1',
      units,
      tiles: [],
      funds: 5000,
    });

    const infHp = res.updatedUnits?.find(u => u.id === 'u1')?.hp;
    const tankHp = res.updatedUnits?.find(u => u.id === 'u2')?.hp;

    const passed = infHp === 8 && tankHp === 10 && res.updatedState.activePower === 'cop';
    results.push({
      name: 'Test 1: Andy Hyper Repair (+2 HP curados a todo el ejército)',
      passed,
      message: `Infantería 6->${infHp} HP, Tanque 9->${tankHp} HP (tope 10). Medidor vaciado.`,
    });
  } catch (err: any) {
    results.push({ name: 'Test 1: Andy Hyper Repair', passed: false, message: err.message });
  }

  // TEST 2: Colin Gold Rush (multiplica fondos x1.5)
  try {
    const state: PlayerCOState = {
      coId: 'colin',
      powerMeter: 18000, // 2 estrellas llenas
      activePower: null,
    };

    const res = COEngine.activatePower(state, 'cop', {
      player: 'p1',
      units: [],
      tiles: [],
      funds: 6000,
    });

    const passed = res.updatedFunds === 9000;
    results.push({
      name: 'Test 2: Colin Gold Rush (Multiplicador de Fondos 1.5x)',
      passed,
      message: `Fondos iniciales: 6.000G -> Fondos tras Gold Rush: ${res.updatedFunds?.toLocaleString()}G (+50%).`,
    });
  } catch (err: any) {
    results.push({ name: 'Test 2: Colin Gold Rush', passed: false, message: err.message });
  }

  // TEST 3: Colin Descuento Militar (-20% de coste en producción)
  try {
    const tankNormalCost = 7000;
    const tankColinCost = COEngine.getProductionCostModifier('colin', tankNormalCost);
    const passed = tankColinCost === 5600;

    results.push({
      name: 'Test 3: Colin Descuento Industrial (-20% en Fábricas)',
      passed,
      message: `Tanque Ligero: Coste estándar 7.000G -> Coste Colin: ${tankColinCost}G.`,
    });
  } catch (err: any) {
    results.push({ name: 'Test 3: Colin Descuento Industrial', passed: false, message: err.message });
  }

  // TEST 4: Sami Victory March (Captura Instantánea de 20 HP)
  try {
    const stateD2D: PlayerCOState = { coId: 'sami', powerMeter: 0, activePower: null };
    const pointsD2D = COEngine.getCapturePoints(stateD2D, 10); // 1.5x = 15

    const stateSCOP: PlayerCOState = { coId: 'sami', powerMeter: 0, activePower: 'scop' };
    const pointsSCOP = COEngine.getCapturePoints(stateSCOP, 10); // 20

    const passed = pointsD2D === 15 && pointsSCOP === 20;
    results.push({
      name: 'Test 4: Sami Victory March (Captura Instantánea de Sedes)',
      passed,
      message: `Tasa D2D: ${pointsD2D} pts/turno. Durante SCOP: ${pointsSCOP} pts (Toma Inmediata en 1 Turno).`,
    });
  } catch (err: any) {
    results.push({ name: 'Test 4: Sami Victory March', passed: false, message: err.message });
  }

  // TEST 5: Acumulación Canónica de Carga (100% daño recibido, 50% daño infligido)
  try {
    // Tanque (7.000G) ataca a Mech (3.000G)
    // Tanque inflige 6 HP de daño a Mech -> (3.000 / 10) * 6 * 0.5 = 900G ofensivos
    // Mech contraataca e inflige 2 HP de daño a Tanque -> (7.000 / 10) * 2 * 1.0 = 1.400G defensivos recibidos por el tanque
    const charge = COEngine.calculateCombatCharge(6, 3000, 2, 7000);
    const expectedCharge = 900 + 1400; // 2300G
    const passed = charge === expectedCharge;

    results.push({
      name: 'Test 5: Acumulación Canónica de Medidor CO',
      passed,
      message: `Daño infligido (50% valor) + Daño recibido (100% valor) = ${charge}G cargados al medidor.`,
    });
  } catch (err: any) {
    results.push({ name: 'Test 5: Acumulación Canónica de Medidor CO', passed: false, message: err.message });
  }

  // TEST 6: Max Force (+20% ataque y +1 movilidad a blindados directos)
  try {
    const dummyUnit: TacticalUnit = {
      id: 'tank1',
      unitCode: 'tank_light',
      displayName: 'Tanque Ligero',
      ownerId: 'p1',
      x: 0,
      y: 0,
      hp: 10,
      maxHp: 10,
      ammo: 9,
      fuel: 70,
      movementPoints: 6,
      movementType: 'treads',
      minRange: 1,
      maxRange: 1,
      visionRange: 3,
      baseAttack: 75,
      productionCost: 7000,
      hasMoved: false,
      hasActed: false,
    };

    const maxState: PlayerCOState = { coId: 'max', powerMeter: 0, activePower: 'cop' };
    const enemyState: PlayerCOState = { coId: 'andy', powerMeter: 0, activePower: null };

    const moveBonus = COEngine.getMovementBonus(maxState, 'tank_light', 1);
    const combatMods = COEngine.getCombatModifiers(dummyUnit, dummyUnit, maxState, enemyState);

    // Max D2D (+20%) + Max COP (+20%) + Universal COP (+10%) = 150%
    const passed = moveBonus === 1 && combatMods.attackerModifier === 150;

    results.push({
      name: 'Test 6: Max Force (+1 Movilidad y Potencia Acorazada)',
      passed,
      message: `Movilidad adicional: +${moveBonus} casilla. Ataque total blindado: ${combatMods.attackerModifier}%.`,
    });
  } catch (err: any) {
    results.push({ name: 'Test 6: Max Force', passed: false, message: err.message });
  }

  // TEST 7: Grit Super Snipe (+2 rango adicional y +30% ataque indirecto)
  try {
    const gritState: PlayerCOState = { coId: 'grit', powerMeter: 0, activePower: 'scop' };
    const rangeBonus = COEngine.getRangeBonus(gritState, 2, 3); // Artillería rango 2-3

    // D2D (+1) + SCOP (+2) = +3 Rango máximo
    const passed = rangeBonus.maxBonus === 3;

    results.push({
      name: 'Test 7: Grit Super Snipe (+3 Rango de Asedio Máximo)',
      passed,
      message: `Artillería de Asedio (Rango base 2-3) alcanza rango [2 - ${3 + rangeBonus.maxBonus}].`,
    });
  } catch (err: any) {
    results.push({ name: 'Test 7: Grit Super Snipe', passed: false, message: err.message });
  }

  // TEST 8: Disipación de Poder al Finalizar el Turno
  try {
    const activeState: PlayerCOState = { coId: 'andy', powerMeter: 0, activePower: 'scop' };
    const expiredState = COEngine.expirePowerOnTurnEnd(activeState);

    const passed = expiredState.activePower === null;
    results.push({
      name: 'Test 8: Expiración Canónica de Efectos al Ceder Turno',
      passed,
      message: 'El superpoder concluye formalmente y el estado regresa a reposo activo.',
    });
  } catch (err: any) {
    results.push({ name: 'Test 8: Expiración de Efectos', passed: false, message: err.message });
  }

  const passedCount = results.filter(r => r.passed).length;
  return {
    passed: passedCount,
    total: results.length,
    results,
  };
}
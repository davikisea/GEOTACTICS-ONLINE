/**
 * SUITE DE PRUEBAS AUTOMATIZADAS DE ECONOMÍA, FLUJO DE TURNOS Y CAPTURA
 */

import { TacticalUnit, TerrainTile } from '../types';
import { TurnEconomyEngine } from './turnEconomy';
import { CaptureEngine } from './captureSystem';

export interface TurnTestResult {
  id: string;
  name: string;
  passed: boolean;
  message: string;
}

export function runTurnEconomyTests(): {
  total: number;
  passed: number;
  failed: number;
  results: TurnTestResult[];
} {
  const results: TurnTestResult[] = [];

  const createDummyTile = (
    x: number,
    y: number,
    type: any,
    owner: string | null = null,
    captureHp: number = 20
  ): TerrainTile => ({
    x,
    y,
    type,
    defenseStars: 3,
    ownerId: owner,
    captureHp,
  });

  const createDummyUnit = (
    id: string,
    code: string,
    owner: string,
    x: number,
    y: number,
    hp: number = 10
  ): TacticalUnit => ({
    id,
    unitCode: code,
    displayName: code,
    ownerId: owner,
    x,
    y,
    hp,
    maxHp: 10,
    ammo: 1,
    fuel: 10,
    movementPoints: 4,
    movementType: code === 'infantry' ? 'foot' : 'treads',
    minRange: 1,
    maxRange: 1,
    visionRange: 2,
    baseAttack: 55,
    productionCost: code === 'infantry' ? 1000 : 7000,
    hasMoved: true,
    hasActed: true,
    skinId: 'default',
  });

  // Test 1: Ingresos por propiedades (+1000G por propiedad)
  try {
    const tiles: TerrainTile[][] = [
      [
        createDummyTile(0, 0, 'hq', 'p1'),
        createDummyTile(1, 0, 'city', 'p1'),
        createDummyTile(2, 0, 'factory', 'p1'),
        createDummyTile(3, 0, 'commtower', 'p1'),
        createDummyTile(4, 0, 'city', 'p2'),
      ],
    ];

    const p1Income = TurnEconomyEngine.calculateIncome('p1', tiles);
    const p2Income = TurnEconomyEngine.calculateIncome('p2', tiles);

    const pass = p1Income === 4000 && p2Income === 1000;
    results.push({
      id: 'turn_t1',
      name: 'Test 1: Generación de Fondos por Propiedad (+1000G por Sede)',
      passed: pass,
      message: pass
        ? 'El Jugador 1 generó 4.000G (4 sedes) y el Jugador 2 generó 1.000G (1 sede).'
        : `Fallo: p1=${p1Income}, p2=${p2Income}`,
    });
  } catch (err: any) {
    results.push({ id: 'turn_t1', name: 'Test 1: Ingresos por Propiedad', passed: false, message: err?.message });
  }

  // Test 2: Reparación de unidades (+2 HP en base aliada con fondos suficientes)
  try {
    const tiles: TerrainTile[][] = [[createDummyTile(0, 0, 'factory', 'p1')]];
    const damagedTank = createDummyUnit('u1', 'tank_light', 'p1', 0, 0, 6); // Coste 7000G -> 700G por HP

    const result = TurnEconomyEngine.processRepairsAndResupply(
      'p1',
      [damagedTank],
      tiles,
      5000 // Fondos de sobra
    );

    const repairedTank = result.updatedUnits[0];
    const pass =
      repairedTank.hp === 8 && // 6 + 2 = 8 HP
      result.updatedFunds === 5000 - 1400 && // 2 * 700G = 1400G
      result.unitsRepaired === 1 &&
      repairedTank.fuel === 99; // Reabastecimiento full

    results.push({
      id: 'turn_t2',
      name: 'Test 2: Reparación Táctica en Base (+2 HP y Descuento de Fondos Proporcional)',
      passed: pass,
      message: pass
        ? 'El tanque ligero reparó de 6 a 8 HP descontando exactamente 1.400G (10% de coste por HP).'
        : `Fallo: hp=${repairedTank.hp}, funds=${result.updatedFunds}`,
    });
  } catch (err: any) {
    results.push({ id: 'turn_t2', name: 'Test 2: Reparación Táctica', passed: false, message: err?.message });
  }

  // Test 3: Restricción de fondos en reparación (solo repara lo que pueda pagar)
  try {
    const tiles: TerrainTile[][] = [[createDummyTile(0, 0, 'factory', 'p1')]];
    const damagedTank = createDummyUnit('u1', 'tank_light', 'p1', 0, 0, 6); // 700G por HP

    const result = TurnEconomyEngine.processRepairsAndResupply(
      'p1',
      [damagedTank],
      tiles,
      800 // Solo alcanza para 1 HP (sobran 100G)
    );

    const pass = result.updatedUnits[0].hp === 7 && result.updatedFunds === 100;
    results.push({
      id: 'turn_t3',
      name: 'Test 3: Límite Presupuestario en Mantenimiento Militar',
      passed: pass,
      message: pass
        ? 'Con 800G disponibles, el taller solo reparó 1 HP (700G) dejando 100G en caja.'
        : `Fallo: hp=${result.updatedUnits[0].hp}, funds=${result.updatedFunds}`,
    });
  } catch (err: any) {
    results.push({ id: 'turn_t3', name: 'Test 3: Límite Presupuestario', passed: false, message: err?.message });
  }

  // Test 4: Captura paso 1 (Infantería de 10 HP reduce 20 a 10 HP)
  try {
    const neutralCity = createDummyTile(0, 0, 'city', null, 20);
    const soldier = createDummyUnit('s1', 'infantry', 'p1', 0, 0, 10);

    const step1 = CaptureEngine.executeCaptureStep(soldier, neutralCity);
    const pass =
      step1.success === true &&
      step1.captured === false &&
      step1.remainingCapturePoints === 10 &&
      step1.damageInflictedToProperty === 10;

    results.push({
      id: 'turn_t4',
      name: 'Test 4: Captura de Sede - Paso 1 (Reducción de 20 a 10 Puntos con Soldado 10 HP)',
      passed: pass,
      message: pass
        ? 'La resistencia de la ciudad neutral se redujo exactamente a la mitad (10/20).'
        : `Fallo: remaining=${step1.remainingCapturePoints}`,
    });
  } catch (err: any) {
    results.push({ id: 'turn_t4', name: 'Test 4: Captura Paso 1', passed: false, message: err?.message });
  }

  // Test 5: Captura paso 2 (Completar captura y cambio de soberanía)
  try {
    const contestedCity = createDummyTile(0, 0, 'city', null, 10);
    const soldier = createDummyUnit('s1', 'infantry', 'p1', 0, 0, 10);

    const step2 = CaptureEngine.executeCaptureStep(soldier, contestedCity);
    const pass =
      step2.success === true &&
      step2.captured === true &&
      step2.newOwnerId === 'p1' &&
      step2.remainingCapturePoints === 20; // Se resetea

    results.push({
      id: 'turn_t5',
      name: 'Test 5: Consumación de Captura (Transferencia de Propiedad a P1)',
      passed: pass,
      message: pass
        ? 'La sede fue asegurada exitosamente y transferida a soberanía Orange Star (P1).'
        : `Fallo: captured=${step2.captured}, owner=${step2.newOwnerId}`,
    });
  } catch (err: any) {
    results.push({ id: 'turn_t5', name: 'Test 5: Consumación de Captura', passed: false, message: err?.message });
  }

  // Test 6: Captura de Cuartel General (HQ) Rival -> Victoria Inmediata
  try {
    const enemyHq = createDummyTile(5, 5, 'hq', 'p2', 10);
    const victorSoldier = createDummyUnit('s1', 'infantry', 'p1', 5, 5, 10);

    const hqCapture = CaptureEngine.executeCaptureStep(victorSoldier, enemyHq);
    const pass = hqCapture.captured === true && hqCapture.isHqCaptured === true;

    results.push({
      id: 'turn_t6',
      name: 'Test 6: Captura de Cuartel General Rival (Condición de Victoria Mayor)',
      passed: pass,
      message: pass
        ? 'La caída del Cuartel General de Blue Moon detonó la condición de victoria absoluta.'
        : 'Fallo al detectar captura de HQ.',
    });
  } catch (err: any) {
    results.push({ id: 'turn_t6', name: 'Test 6: Captura de HQ', passed: false, message: err?.message });
  }

  // Test 7: Producción Militar en Fábrica (Deducción y despliegue)
  try {
    const tiles: TerrainTile[][] = [[createDummyTile(0, 0, 'factory', 'p1')]];
    const produceResult = TurnEconomyEngine.produceUnit(
      'tank_light',
      { x: 0, y: 0 },
      'p1',
      10000,
      [],
      tiles
    );

    const pass =
      produceResult.success === true &&
      produceResult.newUnit !== null &&
      produceResult.newUnit.unitCode === 'tank_light' &&
      produceResult.remainingFunds === 3000 && // 10000 - 7000 = 3000G
      produceResult.newUnit.hasActed === true; // Nace en espera

    results.push({
      id: 'turn_t7',
      name: 'Test 7: Despliegue de Blindados en Fábrica Operativa (-7.000G)',
      passed: pass,
      message: pass
        ? 'El Tanque Ligero se fabricó correctamente dejando 3.000G y nació en estado de espera.'
        : `Fallo: success=${produceResult.success}, funds=${produceResult.remainingFunds}`,
    });
  } catch (err: any) {
    results.push({ id: 'turn_t7', name: 'Test 7: Producción Militar', passed: false, message: err?.message });
  }

  const passed = results.filter(r => r.passed).length;
  return {
    total: results.length,
    passed,
    failed: results.length - passed,
    results,
  };
}

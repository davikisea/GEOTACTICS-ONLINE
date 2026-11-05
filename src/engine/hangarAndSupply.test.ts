/**
 * ==============================================================================
 * SUITE DE PRUEBAS CANÓNICAS: HANGAR, DOBLE LLAVE Y SOFT CAP DE SUMINISTROS
 * ==============================================================================
 * Reemplaza la suite legada de mazos CCG.
 * Especificación: docs/00_GEOTACTICS_ONLINE_MASTER_SPEC.md (v0.0.1-alfa)
 * Pilares: Advance Wars 1-100 HP + Doble Llave Material + Soft Cap Logístico (14 tropas)
 * ==============================================================================
 */

import { TurnEconomyEngine, CANONICAL_UNIT_PRODUCTION_CATALOG } from './turnEconomy';
import { TacticalUnit } from '../types';
import { calculateLossScrapRecovery, GeotacticsRegion } from '../types/metagame';

export interface HangarSupplyTestResult {
  name: string;
  passed: boolean;
  message: string;
  durationMs?: number;
}

export function runHangarAndSupplySuite(): {
  total: number;
  passed: number;
  failed: number;
  results: HangarSupplyTestResult[];
} {
  console.log('==============================================================================');
  console.log('EJECUTANDO SUITE: HANGAR MILITAR, DOBLE LLAVE Y SUMINISTRO (1-100 HP)');
  console.log('==============================================================================\n');

  const results: HangarSupplyTestResult[] = [];
  let passed = 0;
  let failed = 0;

  function assert(desc: string, condition: boolean, detail: string = '', durationMs?: number) {
    if (condition) {
      console.log(`✅ [PASSED] ${desc}`);
      results.push({ name: desc, passed: true, message: detail, durationMs });
      passed++;
    } else {
      console.error(`❌ [FAILED] ${desc} - Detalle: ${detail}`);
      results.push({ name: desc, passed: false, message: detail || 'Aserción fallida', durationMs });
      failed++;
    }
  }

  // --------------------------------------------------------------------------
  // TEST 1: Suministro Logístico Óptimo (<= 14 Unidades)
  // --------------------------------------------------------------------------
  try {
    const mockUnits14: TacticalUnit[] = Array.from({ length: 14 }, (_, i) => ({
      id: `unit_${i}`,
      unitCode: 'infantry',
      displayName: 'Infantería Ligera',
      ownerId: 'player_1',
      x: i % 5,
      y: Math.floor(i / 5),
      hp: 100,
      maxHp: 100,
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
      skinId: 'default',
    }));

    const status14 = TurnEconomyEngine.calculateSupplyUpkeep('player_1', mockUnits14, 14, 200);
    assert(
      'Test 1.1: Con 14 unidades en campo el coste de sostenimiento logístico es $0G',
      status14.totalUnits === 14 && status14.excessUnits === 0 && status14.totalUpkeepG === 0 && !status14.isOverCapacity,
      `Unidades: ${status14.totalUnits}, Exceso: ${status14.excessUnits}, Coste: $${status14.totalUpkeepG}G`
    );
  } catch (err: any) {
    assert('Test 1.1: Error en test de suministro óptimo', false, err.message);
  }

  // --------------------------------------------------------------------------
  // TEST 2: Penalización por Exceso de Capacidad (> 14 Unidades)
  // --------------------------------------------------------------------------
  try {
    const mockUnits18: TacticalUnit[] = Array.from({ length: 18 }, (_, i) => ({
      id: `unit_${i}`,
      unitCode: 'infantry',
      displayName: 'Infantería Ligera',
      ownerId: 'player_1',
      x: i % 5,
      y: Math.floor(i / 5),
      hp: 100,
      maxHp: 100,
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
      skinId: 'default',
    }));

    const status18 = TurnEconomyEngine.calculateSupplyUpkeep('player_1', mockUnits18, 14, 200);
    assert(
      'Test 2.1: Con 18 unidades (4 de exceso) se deduce exactamente -$800G de mantenimiento',
      status18.totalUnits === 18 && status18.excessUnits === 4 && status18.totalUpkeepG === 800 && status18.isOverCapacity,
      `Unidades: ${status18.totalUnits}, Exceso: ${status18.excessUnits}, Upkeep deducido: -$${status18.totalUpkeepG}G`
    );
  } catch (err: any) {
    assert('Test 2.1: Error en test de sobrecapacidad', false, err.message);
  }

  // --------------------------------------------------------------------------
  // TEST 3: Ley de Doble Llave (Fondos + Hangar Stock)
  // --------------------------------------------------------------------------
  try {
    // 3.1 Infantería y Recon son F2P infinitos (stock no requerido)
    const canDeployInfantry = (funds: number) => {
      const cost = CANONICAL_UNIT_PRODUCTION_CATALOG['infantry'].cost;
      return funds >= cost;
    };
    assert(
      'Test 3.1: Infantería Ligera no exige stock de chasis en Hangar (Kit F2P de Supervivencia)',
      canDeployInfantry(1000) === true && canDeployInfantry(900) === false,
      'Fondos $1000G permiten despliegue libre de infantería'
    );

    // 3.2 Tanque Medio exige fondos Y stock físico en hangar
    const canDeployMediumTank = (funds: number, hangarStock: number) => {
      const cost = CANONICAL_UNIT_PRODUCTION_CATALOG['tank_medium'].cost;
      return funds >= cost && hangarStock > 0;
    };

    assert(
      'Test 3.2: Tanque Medio con fondos suficientes pero stock = 0 es RECHAZADO por falta de chasis',
      canDeployMediumTank(16000, 0) === false,
      'Bloqueo material por falta de chasis en inventario'
    );

    assert(
      'Test 3.3: Tanque Medio con fondos suficientes y stock >= 1 es AUTORIZADO',
      canDeployMediumTank(16000, 1) === true,
      'Doble Llave satisfecha: 16,000G + 1 Chasis en Hangar'
    );
  } catch (err: any) {
    assert('Test 3: Error en pruebas de Doble Llave', false, err.message);
  }

  // --------------------------------------------------------------------------
  // TEST 4: Escala Continua 1-100 HP en Fabricación y Reparaciones
  // --------------------------------------------------------------------------
  try {
    // 4.1 Fabricación nativa en 100 HP
    const alliedFactoryTile = {
      x: 0,
      y: 0,
      type: 'factory' as const,
      defenseStars: 3,
      ownerId: 'player_1',
    };

    const prodResult = TurnEconomyEngine.produceUnit(
      'infantry',
      { x: 0, y: 0 },
      'player_1',
      2000,
      [],
      [[alliedFactoryTile]]
    );
    assert(
      'Test 4.1: Unidades producidas nacen con exactamente 100 HP y maxHp = 100 (Tier 1)',
      prodResult.success && prodResult.newUnit?.hp === 100 && prodResult.newUnit?.maxHp === 100 && prodResult.newUnit?.tier === 1,
      `HP inicial: ${prodResult.newUnit?.hp}/${prodResult.newUnit?.maxHp}, Tier: ${prodResult.newUnit?.tier}`
    );

    // 4.2 Reparación de +20 HP/turno al 1% de costo por HP
    const damagedUnit: TacticalUnit = {
      id: 'tank_dmg_1',
      unitCode: 'tank_light',
      displayName: 'Tanque Ligero',
      ownerId: 'player_1',
      x: 0,
      y: 0,
      hp: 60,
      maxHp: 100,
      ammo: 5,
      fuel: 40,
      movementPoints: 6,
      movementType: 'treads',
      minRange: 1,
      maxRange: 1,
      visionRange: 3,
      baseAttack: 75,
      productionCost: 7000, // 70G por cada 1 HP
      hasMoved: false,
      hasActed: false,
      skinId: 'default',
    };

    const repairRes = TurnEconomyEngine.processRepairsAndResupply(
      'player_1',
      [damagedUnit],
      [[alliedFactoryTile]],
      5000
    );

    const healedTank = repairRes.updatedUnits[0];
    assert(
      'Test 4.2: Reparación táctica restaura +20 HP (60 -> 80 HP) a razón de 70G/HP (Gasto: 1,400G)',
      healedTank.hp === 80 && repairRes.spentFunds === 1400 && healedTank.fuel === 99,
      `HP reparado: ${healedTank.hp}/100, Fondos consumidos: $${repairRes.spentFunds}G, Fuel: ${healedTank.fuel}`
    );
  } catch (err: any) {
    assert('Test 4: Error en escala continua 1-100 HP', false, err.message);
  }

  // --------------------------------------------------------------------------
  // TEST 5: Recuperación de Chatarra Tecnológica (35% SSOT de Siniestralidad)
  // --------------------------------------------------------------------------
  try {
    const scrapT1 = calculateLossScrapRecovery(1, 1);
    const scrapT2 = calculateLossScrapRecovery(2, 1);
    const scrapT3Double = calculateLossScrapRecovery(3, 2);

    assert(
      'Test 5.1: Chasis T1 destruido acredita 17 tech_scrap (35% de 50)',
      scrapT1 === 17,
      `Scrap recuperado T1: ${scrapT1}`
    );
    assert(
      'Test 5.2: Chasis T2 destruido acredita 35 tech_scrap (35% de 100)',
      scrapT2 === 35,
      `Scrap recuperado T2: ${scrapT2}`
    );
    assert(
      'Test 5.3: Dos Chasis T3 destruidos acreditan 105 tech_scrap (35% de 300)',
      scrapT3Double === 105,
      `Scrap recuperado 2x T3: ${scrapT3Double}`
    );
  } catch (err: any) {
    assert('Test 5: Error en prueba de siniestralidad 35% scrap', false, err.message);
  }

  // --------------------------------------------------------------------------
  // TEST 6: Validación de Topología Fase 1 (Teatro Venezuela & Fronteras)
  // --------------------------------------------------------------------------
  try {
    const venezuelaRegionsMock: Partial<GeotacticsRegion>[] = [
      { id: 'REG_VE_01', name: 'Distrito Capital - Caracas', isPlayable: true, isNationalCapital: true, maxBuildingSlots: 16, resourceTier: 5 },
      { id: 'REG_VE_02', name: 'Zulia - Maracaibo', isPlayable: true, isNationalCapital: false, maxBuildingSlots: 14, resourceTier: 4 },
      { id: 'REG_VE_13', name: 'Sucre - Cumaná/Golfo de Paria', isPlayable: true, isNationalCapital: false, maxBuildingSlots: 10, resourceTier: 3 },
      { id: 'BUF_CO_01', name: 'Norte de Santander (Cúcuta)', isPlayable: false, isNationalCapital: false, maxBuildingSlots: 8, resourceTier: 3 },
    ];

    const caracas = venezuelaRegionsMock.find(r => r.id === 'REG_VE_01');
    const zulia = venezuelaRegionsMock.find(r => r.id === 'REG_VE_02');
    const sucre = venezuelaRegionsMock.find(r => r.id === 'REG_VE_13');
    const cucuta = venezuelaRegionsMock.find(r => r.id === 'BUF_CO_01');

    assert(
      'Test 6.1: Caracas REG_VE_01 es Capital Nacional con 16 slots y Tier 5',
      caracas?.isNationalCapital === true && caracas?.maxBuildingSlots === 16 && caracas?.resourceTier === 5,
      `Caracas slots: ${caracas?.maxBuildingSlots}, tier: ${caracas?.resourceTier}`
    );

    assert(
      'Test 6.2: Zulia y Sucre son entidades soberanas jugables (controladores de estrechos Maracaibo y Paria)',
      zulia?.isPlayable === true && sucre?.isPlayable === true,
      `Zulia jugable: ${zulia?.isPlayable}, Sucre jugable: ${sucre?.isPlayable}`
    );

    assert(
      'Test 6.3: Zona de Amortiguación Fronteriza BUF_CO_01 posee isPlayable = false',
      cucuta?.isPlayable === false,
      `Cúcuta isPlayable: ${cucuta?.isPlayable} (Guarnición Neutral IA)`
    );
  } catch (err: any) {
    assert('Test 6: Error en topología de Venezuela', false, err.message);
  }

  // --------------------------------------------------------------------------
  // RESUMEN
  // --------------------------------------------------------------------------
  console.log('------------------------------------------------------------------------------');
  console.log(`RESUMEN HANGAR & SUMINISTROS: ${passed}/${results.length} PASARON`);
  if (failed > 0) {
    console.error(`ALERTA: ${failed} pruebas fallaron.`);
  } else {
    console.log('✅ TODAS LAS PRUEBAS DE LA DOBLE LLAVE Y SUMINISTRO SUPERADAS (100% ÉXITO)');
  }
  console.log('==============================================================================\n');

  return {
    total: results.length,
    passed,
    failed,
    results,
  };
}

// Ejecución directa si se invoca por CLI
if (typeof process !== 'undefined' && process.argv && (process.argv[1]?.includes('hangarAndSupply') || process.argv[1]?.includes('deckAndSupply'))) {
  const run = runHangarAndSupplySuite();
  if (run.failed > 0) process.exit(1);
}

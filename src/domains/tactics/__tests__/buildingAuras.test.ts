/**
 * ==============================================================================
 * SUITE DE PRUEBAS AUTOMATIZADAS: MOTOR DE AURAS DE EDIFICIOS & DESGASTE (FASE 1)
 * ==============================================================================
 * Valida los 5 ciclos de optimización e invariantes:
 * Ciclo 1: Tipado y perfilado de auras de edificios
 * Ciclo 2: Casos borde (infantería vs vehículos, ciudades neutrales vs aliadas)
 * Ciclo 3: Integración directa en CanonicalCombatEngine y cálculo balístico
 * Ciclo 4: Fricción territorial de asedio (-1 PM en ciudades hostiles)
 * Ciclo 5: Benchmark de latencia (< 0.05 ms por evaluación)
 */

import {
  calculateBuildingAuras,
  resolveCombatAuras,
  getHostileCityFriction,
  BuildingAuraProfile,
} from '@domains/tactics';
import { CanonicalCombatEngine } from '@domains/tactics';
import { TerrainTile, TacticalUnit } from '../types';

export function runBuildingAurasSuite(): {
  total: number;
  passed: number;
  failed: number;
  avgDurationMs: number;
  results: { name: string; passed: boolean; message: string }[];
} {
  const results: { name: string; passed: boolean; message: string }[] = [];
  let passed = 0;
  let failed = 0;

  function assert(desc: string, condition: boolean, detail: string = '') {
    if (condition) {
      results.push({ name: desc, passed: true, message: detail });
      passed++;
    } else {
      results.push({ name: desc, passed: false, message: detail || 'Aserción fallida' });
      failed++;
    }
  }

  // Creación de cuadrícula de prueba con edificios
  const mockTiles: TerrainTile[][] = [
    [
      { x: 0, y: 0, type: 'hq', defenseStars: 4, ownerId: 'p1', captureHp: 20 },
      { x: 1, y: 0, type: 'factory', defenseStars: 3, ownerId: 'p1', captureHp: 20 },
      { x: 2, y: 0, type: 'city', defenseStars: 3, ownerId: 'p1', captureHp: 20 },
      { x: 3, y: 0, type: 'commtower', defenseStars: 3, ownerId: 'p1', captureHp: 20 },
      { x: 4, y: 0, type: 'lab', defenseStars: 3, ownerId: 'p1', captureHp: 20 },
    ],
    [
      { x: 0, y: 1, type: 'plains', defenseStars: 1, ownerId: null, captureHp: 20 },
      { x: 1, y: 1, type: 'city', defenseStars: 3, ownerId: 'p2', captureHp: 20 },
      { x: 2, y: 1, type: 'factory', defenseStars: 3, ownerId: 'p2', captureHp: 20 },
      { x: 3, y: 1, type: 'hq', defenseStars: 4, ownerId: 'p2', captureHp: 20 },
      { x: 4, y: 1, type: 'plains', defenseStars: 1, ownerId: null, captureHp: 20 },
    ],
  ];

  const p1Infantry: TacticalUnit = {
    id: 'u_p1_inf',
    unitCode: 'infantry',
    displayName: 'Infantería P1',
    ownerId: 'p1',
    x: 0,
    y: 0,
    hp: 10,
    maxHp: 10,
    ammo: 10,
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
  };

  const p1Artillery: TacticalUnit = {
    id: 'u_p1_art',
    unitCode: 'artillery',
    displayName: 'Artillería P1',
    ownerId: 'p1',
    x: 0,
    y: 0,
    hp: 10,
    maxHp: 10,
    ammo: 9,
    fuel: 50,
    movementPoints: 5,
    movementType: 'treads',
    minRange: 2,
    maxRange: 3,
    visionRange: 1,
    baseAttack: 80,
    productionCost: 6000,
    hasMoved: false,
    hasActed: false,
    skinId: 'default',
  };

  const p2Tank: TacticalUnit = {
    id: 'u_p2_tank',
    unitCode: 'tank_light',
    displayName: 'Tanque Ligero P2',
    ownerId: 'p2',
    x: 1,
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
    baseAttack: 70,
    productionCost: 7000,
    hasMoved: false,
    hasActed: false,
    skinId: 'default',
  };

  // ----------------------------------------------------------------------------
  // CICLO 1: Conteo y Cálculo de Auras de Edificios
  // ----------------------------------------------------------------------------
  const p1Auras = calculateBuildingAuras(mockTiles, 'p1');
  const p2Auras = calculateBuildingAuras(mockTiles, 'p2');

  assert(
    'Ciclo 1.1: Conteo exacto de edificios P1 (HQ=1, Factory=1, City=1, Comm=1, Lab=1)',
    p1Auras.hqCount === 1 &&
      p1Auras.factoryCount === 1 &&
      p1Auras.cityCount === 1 &&
      p1Auras.commtowerCount === 1 &&
      p1Auras.labCount === 1,
    `Edificios detectados: HQ=${p1Auras.hqCount}, Comm=${p1Auras.commtowerCount}, Lab=${p1Auras.labCount}`
  );

  assert(
    'Ciclo 1.2: Fórmulas de Buffs P1 (+10% HQ, +15% Comm, +10% Armor, delay refuerzos = 3)',
    p1Auras.hqAttackBonusPercent === 10 &&
      p1Auras.commtowerDamageBonusPercent === 15 &&
      p1Auras.vehicleArmorBonusPercent === 10 &&
      p1Auras.reinforcementTurnDelay === 3,
    `Buffs verificados: Attk=${p1Auras.hqAttackBonusPercent + p1Auras.commtowerDamageBonusPercent}%, Delay=${p1Auras.reinforcementTurnDelay}`
  );

  assert(
    'Ciclo 1.3: Conteo P2 sin Commtower ni Lab tiene delay por defecto de 3 por tener fábrica',
    p2Auras.commtowerCount === 0 && p2Auras.labCount === 0 && p2Auras.reinforcementTurnDelay === 3,
    `P2 delay=${p2Auras.reinforcementTurnDelay}`
  );

  // ----------------------------------------------------------------------------
  // CICLO 2: Modificadores Específicos por Tipo de Tropa y Terreno
  // ----------------------------------------------------------------------------
  const combatAurasP1vsP2 = resolveCombatAuras(
    p1Auras,
    p2Auras,
    p1Infantry,
    p2Tank,
    mockTiles[0][0], // P1 en su HQ
    mockTiles[0][1]  // P2 en fábrica P1 (no es ciudad P2)
  );

  assert(
    'Ciclo 2.1: El atacante P1 acumula bonos de HQ y Commtower menos debuff de moral de P2',
    combatAurasP1vsP2.attackerEffectiveAttackBonus === 10 + 15 - 5, // 20%
    `Bono efectivo atacante: ${combatAurasP1vsP2.attackerEffectiveAttackBonus}%`
  );

  assert(
    'Ciclo 2.2: Tanque P2 (vehículo) recibe blindaje de su fábrica P2 pero sufre EW de Commtower P1',
    combatAurasP1vsP2.defenderEffectiveDefenseBonus === 10 - 5, // 5%
    `Blindaje neto defensor: ${combatAurasP1vsP2.defenderEffectiveDefenseBonus}%`
  );

  // Cobertura de Ciudad
  const combatOnCity = resolveCombatAuras(
    p1Auras,
    p2Auras,
    p1Infantry,
    p2Tank,
    mockTiles[0][0],
    mockTiles[1][1] // P2 defendiendo en su propia ciudad
  );

  assert(
    'Ciclo 2.3: Defensor en su propia ciudad recibe +2 estrellas de baluarte defensivo',
    combatOnCity.defenderExtraStars === 2,
    `Estrellas extra en ciudad aliada: ${combatOnCity.defenderExtraStars}`
  );

  // ----------------------------------------------------------------------------
  // CICLO 3: Fricción Territorial de Asedio (-1 PM)
  // ----------------------------------------------------------------------------
  // Casilla (1, 0) está adyacente a Ciudad P2 en (1, 1) -> P1 sufre fricción
  const frictionForP1 = getHostileCityFriction(mockTiles, 'p1', { x: 1, y: 0 });
  // Casilla (0, 1) tiene como vecinos (0, 0)=HQ P1 y (1, 1)=Ciudad P2 -> P2 no tiene ciudades hostiles adyacentes
  const frictionForP2 = getHostileCityFriction(mockTiles, 'p2', { x: 0, y: 1 });

  assert(
    'Ciclo 3.1: Unidad P1 sufre -1 PM por fricción de asedio al pasar junto a ciudad enemiga P2',
    frictionForP1 === 1,
    `Fricción P1: -${frictionForP1} PM`
  );

  assert(
    'Ciclo 3.2: Unidad P2 NO sufre fricción junto a su propia ciudad',
    frictionForP2 === 0,
    `Fricción P2: ${frictionForP2} PM`
  );

  // ----------------------------------------------------------------------------
  // CICLO 4: Integración en Combate Balístico & Bono de Alcance Lab (+1 Rango)
  // ----------------------------------------------------------------------------
  // Artillería atacando a distancia 4 (base maxRange es 3, pero con Lab P1 alcanza 4)
  const targetAtDist4: TacticalUnit = { ...p2Tank, x: 4, y: 0 };
  const combatAurasIndirect = resolveCombatAuras(
    p1Auras,
    p2Auras,
    p1Artillery,
    targetAtDist4,
    mockTiles[0][0],
    mockTiles[0][4]
  );

  const engagementAt4 = CanonicalCombatEngine.calculateEngagement(
    p1Artillery,
    targetAtDist4,
    mockTiles[0][0],
    mockTiles[0][4],
    {
      buildingAuraModifiers: combatAurasIndirect,
      deterministic: true,
    }
  );

  assert(
    'Ciclo 4.1: Artillería indirecta con bono de Lab puede disparar a distancia 4 (inRange = true)',
    engagementAt4.canAttack && engagementAt4.distance === 4,
    `Disparo exitoso a distancia ${engagementAt4.distance} con daño ${engagementAt4.attackerDamagePercent}%`
  );

  // ----------------------------------------------------------------------------
  // CICLO 5: Benchmark de Rendimiento de Auras (<0.01 ms por cálculo)
  // ----------------------------------------------------------------------------
  const benchIterations = 5000;
  const startBench = performance.now();
  for (let i = 0; i < benchIterations; i++) {
    const auras = calculateBuildingAuras(mockTiles, 'p1');
    resolveCombatAuras(auras, p2Auras, p1Infantry, p2Tank, mockTiles[0][0], mockTiles[0][1]);
  }
  const durationBench = performance.now() - startBench;
  const avgMs = durationBench / benchIterations;

  assert(
    'Ciclo 5: Benchmark de auras ultrarrápido (< 0.05 ms por evaluación completa)',
    avgMs < 0.05,
    `Tiempo medio: ${avgMs.toFixed(4)} ms (${benchIterations} evaluaciones en ${durationBench.toFixed(2)} ms)`
  );

  return {
    total: passed + failed,
    passed,
    failed,
    avgDurationMs: avgMs,
    results,
  };
}

// Ejecución CLI directa
if (
  typeof process !== 'undefined' &&
  process.argv &&
  process.argv[1]?.includes('buildingAuras.test.ts')
) {
  console.log('==============================================================================');
  console.log('EJECUTANDO SUITE: MOTOR DE AURAS DE EDIFICIOS & DESGASTE (FASE 1)');
  console.log('==============================================================================\n');

  const summary = runBuildingAurasSuite();
  summary.results.forEach(r => {
    const icon = r.passed ? '✅ [PASSED]' : '❌ [FAILED]';
    console.log(`${icon} ${r.name}`);
    if (r.message) console.log(`   └─ ${r.message}`);
  });

  console.log('\n------------------------------------------------------------------------------');
  console.log(`RESUMEN FASE 1: ${summary.passed}/${summary.total} PRUEBAS SUPERADAS`);
  console.log(`LATENCIA PROMEDIO: ${summary.avgDurationMs.toFixed(4)} ms`);
  console.log('------------------------------------------------------------------------------\n');

  if (summary.failed > 0) {
    process.exit(1);
  }
}
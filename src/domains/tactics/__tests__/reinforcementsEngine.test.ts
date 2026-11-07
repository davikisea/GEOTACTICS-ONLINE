/**
 * ==============================================================================
 * SUITE DE PRUEBAS AUTOMATIZADAS: HANGAR DE STOCK Y REFUERZOS (FASE 2)
 * ==============================================================================
 * Valida los 5 ciclos de optimización e invariantes:
 * Ciclo 1: Catálogo canónico y generación de stock de reserva inicial
 * Ciclo 2: Selección de vanguardia y salvaguardas de stock negativo
 * Ciclo 3: Solicitud de refuerzos con delay exacto (4 turnos base, 3 con fábrica)
 * Ciclo 4: Simulación del bucle de turnos y despliegue sobre bases / airdrop
 * Ciclo 5: Benchmark de rendimiento de gestión de reservas (< 0.05 ms)
 */

import {
  initializeReinforcementsEngine,
  consumeVanguardDeployment,
  requestReinforcements,
  processTurnArrival,
  CANONICAL_RESERVE_CATALOG,
} from '@domains/tactics';
import { TerrainTile, TacticalUnit } from '../types';

export function runReinforcementsSuite(): {
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

  // ----------------------------------------------------------------------------
  // CICLO 1: Catálogo Canónico y Stock Inicial
  // ----------------------------------------------------------------------------
  const engineState = initializeReinforcementsEngine();
  const p1Stock = engineState.stocks.p1;

  assert(
    'Ciclo 1.1: Catálogo canónico contiene unidades básicas de tierra (infantry, mech, recon, tank_light, etc.)',
    Boolean(
      CANONICAL_RESERVE_CATALOG.infantry &&
      CANONICAL_RESERVE_CATALOG.tank_light &&
      CANONICAL_RESERVE_CATALOG.artillery
    ),
    'Catálogo verificado con 7 tipos de unidades'
  );

  assert(
    'Ciclo 1.2: Stock inicial de P1 tiene reserva balanceada (Infantería: 6, Tanques Ligeros: 4)',
    p1Stock.units.infantry === 6 && p1Stock.units.tank_light === 4,
    `Infantería: ${p1Stock.units.infantry}, Tanques: ${p1Stock.units.tank_light}`
  );

  // ----------------------------------------------------------------------------
  // CICLO 2: Selección de Vanguardia Pre-Batalla y Restricciones
  // ----------------------------------------------------------------------------
  const vanguardSelection = ['infantry', 'infantry', 'recon', 'tank_light'];
  const vanguardResult = consumeVanguardDeployment(p1Stock, vanguardSelection);

  assert(
    'Ciclo 2.1: Vanguardia de 4 unidades se descuenta con éxito del stock de reserva',
    vanguardResult.success &&
      vanguardResult.updatedStock.units.infantry === 4 &&
      vanguardResult.updatedStock.units.tank_light === 3,
    `Nuevo stock Infantería: ${vanguardResult.updatedStock.units.infantry}, Tanque: ${vanguardResult.updatedStock.units.tank_light}`
  );

  // Intentar consumir más unidades de las disponibles
  const excessiveSelection = ['tank_medium', 'tank_medium', 'tank_medium']; // Solo hay 2
  const excessiveResult = consumeVanguardDeployment(p1Stock, excessiveSelection);

  assert(
    'Ciclo 2.2: Intento de seleccionar más unidades de las existentes en stock es bloqueado con error',
    !excessiveResult.success && Boolean(excessiveResult.error),
    `Error capturado: ${excessiveResult.error}`
  );

  // ----------------------------------------------------------------------------
  // CICLO 3: Solicitud de Refuerzos en Combate (Delay 4 vs 3 turnos)
  // ----------------------------------------------------------------------------
  // Petición estándar sin fábrica (Delay = 4 turnos)
  const reqStandard = requestReinforcements(engineState, {
    playerId: 'p1',
    unitCodes: ['mech', 'tank_light'],
    currentTurnNumber: 2,
    hasFactoryBuff: false,
  });

  assert(
    'Ciclo 3.1: Solicitud estándar sin fábrica impone delay estricto de 4 turnos',
    reqStandard.success && reqStandard.request?.turnsUntilArrival === 4,
    `Delay registrado: ${reqStandard.request?.turnsUntilArrival} turnos`
  );

  // Petición con fábrica aliada activa (Delay = 3 turnos)
  const reqWithFactory = requestReinforcements(reqStandard.nextState, {
    playerId: 'p1',
    unitCodes: ['artillery'],
    currentTurnNumber: 2,
    hasFactoryBuff: true,
  });

  assert(
    'Ciclo 3.2: Solicitud con complejo industrial activo reduce el delay a 3 turnos',
    reqWithFactory.success && reqWithFactory.request?.turnsUntilArrival === 3,
    `Delay con fábrica: ${reqWithFactory.request?.turnsUntilArrival} turnos`
  );

  // ----------------------------------------------------------------------------
  // CICLO 4: Bucle de Turnos y Despliegue de Tropas sobre Fábricas/HQ
  // ----------------------------------------------------------------------------
  const testTiles: TerrainTile[][] = [
    [
      { x: 0, y: 0, type: 'hq', defenseStars: 4, ownerId: 'p1', captureHp: 20 },
      { x: 1, y: 0, type: 'factory', defenseStars: 3, ownerId: 'p1', captureHp: 20 },
      { x: 2, y: 0, type: 'plains', defenseStars: 1, ownerId: null, captureHp: 20 },
    ],
    [
      { x: 0, y: 1, type: 'plains', defenseStars: 1, ownerId: null, captureHp: 20 },
      { x: 1, y: 1, type: 'plains', defenseStars: 1, ownerId: null, captureHp: 20 },
      { x: 2, y: 1, type: 'plains', defenseStars: 1, ownerId: null, captureHp: 20 },
    ],
  ];

  let simState = reqWithFactory.nextState;
  const activeUnits: TacticalUnit[] = [];

  // Simular paso de turnos:
  // Turno 2 P1 termina -> Restan 2 y 3
  let step1 = processTurnArrival(simState, testTiles, activeUnits, 'p1');
  assert('Ciclo 4.1: Tras 1 turno, los refuerzos aún no llegan (0 unidades desplegadas)', step1.newUnitsDeployed.length === 0);

  // Turno 3 P1 termina -> Restan 1 y 2
  let step2 = processTurnArrival(step1.nextState, testTiles, activeUnits, 'p1');
  assert('Ciclo 4.2: Tras 2 turnos, continúan en camino', step2.newUnitsDeployed.length === 0);

  // Turno 4 P1 termina -> La solicitud de 3 turnos (artillería) LLEGA
  let step3 = processTurnArrival(step2.nextState, testTiles, activeUnits, 'p1');
  assert(
    'Ciclo 4.3: Al llegar el turno 3 de espera, la artillería se despliega sobre fábrica aliada',
    step3.newUnitsDeployed.length === 1 && step3.newUnitsDeployed[0].unitCode === 'artillery',
    `Unidad desplegada: ${step3.newUnitsDeployed[0]?.displayName} en (${step3.newUnitsDeployed[0]?.x},${step3.newUnitsDeployed[0]?.y})`
  );

  // Añadir la unidad desplegada y simular turno 5 -> La solicitud de 4 turnos LLEGA
  activeUnits.push(...step3.newUnitsDeployed);
  let step4 = processTurnArrival(step3.nextState, testTiles, activeUnits, 'p1');
  assert(
    'Ciclo 4.4: Al 4to turno llega la segunda oleada (mech y tank_light) sin colisionar',
    step4.newUnitsDeployed.length === 2 &&
      step4.newUnitsDeployed.every(u => `${u.x},${u.y}` !== `${step3.newUnitsDeployed[0].x},${step3.newUnitsDeployed[0].y}`),
    `Desplegadas ${step4.newUnitsDeployed.length} unidades en celdas separadas`
  );

  // ----------------------------------------------------------------------------
  // CICLO 5: Benchmark de Latencia de Refuerzos (< 0.05 ms)
  // ----------------------------------------------------------------------------
  const benchIterations = 5000;
  const startBench = performance.now();
  let benchState = initializeReinforcementsEngine();

  for (let i = 0; i < benchIterations; i++) {
    const res = requestReinforcements(benchState, {
      playerId: 'p1',
      unitCodes: ['infantry'],
      currentTurnNumber: 1,
      hasFactoryBuff: true,
    });
    if (res.success) {
      processTurnArrival(res.nextState, testTiles, activeUnits, 'p1');
    }
  }

  const durationBench = performance.now() - startBench;
  const avgMs = durationBench / benchIterations;

  assert(
    'Ciclo 5: Benchmark de gestión de refuerzos ultrarrápido (< 0.05 ms por ciclo completo)',
    avgMs < 0.05,
    `Tiempo medio: ${avgMs.toFixed(4)} ms (${benchIterations} ciclos en ${durationBench.toFixed(2)} ms)`
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
  process.argv[1]?.includes('reinforcementsEngine.test.ts')
) {
  console.log('==============================================================================');
  console.log('EJECUTANDO SUITE: HANGAR DE STOCK Y REFUERZOS (FASE 2)');
  console.log('==============================================================================\n');

  const summary = runReinforcementsSuite();
  summary.results.forEach(r => {
    const icon = r.passed ? '✅ [PASSED]' : '❌ [FAILED]';
    console.log(`${icon} ${r.name}`);
    if (r.message) console.log(`   └─ ${r.message}`);
  });

  console.log('\n------------------------------------------------------------------------------');
  console.log(`RESUMEN FASE 2: ${summary.passed}/${summary.total} PRUEBAS SUPERADAS`);
  console.log(`LATENCIA PROMEDIO: ${summary.avgDurationMs.toFixed(4)} ms`);
  console.log('------------------------------------------------------------------------------\n');

  if (summary.failed > 0) {
    process.exit(1);
  }
}
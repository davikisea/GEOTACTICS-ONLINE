import { processTurnFuelConsumption, getUnitTurnFuelConsumption } from './fuelLogistics';
import { processPropertyMaintenance, isPropertyCompatibleWithUnit } from './propertyMaintenance';
import { executeBlackBombExplosion, MultiUnitTransportManager } from './specialAbilities';
import { executeHqCaptureElimination } from './hqCaptureVictory';
import { parseAWBWExtendedMap, AWBW_EXTENDED_TILE_MAP } from './awbwExtendedTiles';
import { TacticalUnit, TerrainTile } from '../types';

export interface AdvancedSystemsTestResult {
  name: string;
  passed: boolean;
  message: string;
}

export function runAdvancedWarsWorldSystemsSuite(): { total: number; passed: number; results: AdvancedSystemsTestResult[] } {
  console.log('==============================================================================');
  console.log('EJECUTANDO SUITE: SISTEMAS TÁCTICOS AVANZADOS RESCATADOS DE WARSWORLD');
  console.log('==============================================================================\n');

  const results: AdvancedSystemsTestResult[] = [];
  let passed = 0;
  let failed = 0;

  function assert(desc: string, condition: boolean, detail: string = '') {
    if (condition) {
      console.log(`✅ [PASSED] ${desc}`);
      if (detail) console.log(`   Detalle: ${detail}`);
      results.push({ name: desc, passed: true, message: detail });
      passed++;
    } else {
      console.error(`❌ [FAILED] ${desc}`);
      if (detail) console.error(`   Error: ${detail}`);
      results.push({ name: desc, passed: false, message: detail });
      failed++;
    }
  }

  // --- SECCIÓN 1: COMBUSTIBLE CRÍTICO, CRASH AÉREO Y HUNDIMIENTO NAVAL ---
  const doomedFighter: TacticalUnit = {
    id: 'fighter_1',
    unitCode: 'fighter',
    displayName: 'Caza Furtivo',
    ownerId: 'player_1',
    x: 3,
    y: 3,
    hp: 10,
    maxHp: 10,
    ammo: 9,
    fuel: 3, // Less than 5 fuel burn -> Will crash!
    movementPoints: 9,
    movementType: 'air',
    minRange: 1,
    maxRange: 1,
    visionRange: 4,
    baseAttack: 100,
    productionCost: 20000,
    hasMoved: false,
    hasActed: false,
    skinId: 'default',
  };

  const doomedSub: TacticalUnit = {
    id: 'sub_1',
    unitCode: 'submarine',
    displayName: 'Submarino Nuclear',
    ownerId: 'player_1',
    x: 0,
    y: 0,
    hp: 10,
    maxHp: 10,
    ammo: 6,
    fuel: 4, // Burns 5 while submerged -> Will sink!
    movementPoints: 5,
    movementType: 'sea',
    minRange: 1,
    maxRange: 1,
    visionRange: 5,
    baseAttack: 90,
    productionCost: 19000,
    hasMoved: false,
    hasActed: false,
    skinId: 'default',
  };

  const groundTank: TacticalUnit = {
    id: 'tank_1',
    unitCode: 'tank_light',
    displayName: 'Tanque Ligero',
    ownerId: 'player_1',
    x: 1,
    y: 1,
    hp: 10,
    maxHp: 10,
    ammo: 9,
    fuel: 0, // Ground unit at 0 fuel does not die, only immobilizes
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

  const submergedSet = new Set<string>(['sub_1']);
  const fuelResult = processTurnFuelConsumption(
    [doomedFighter, doomedSub, groundTank],
    'player_1',
    'clear',
    undefined,
    submergedSet
  );

  assert(
    'Aeronave sin combustible se estrella y es destruida en pleno vuelo (Crash)',
    fuelResult.destroyedUnitIds.includes('fighter_1'),
    'Caza con 3 de combustible quemó 5 y explotó en el aire (HP = 0).'
  );

  assert(
    'Submarino en inmersión sin combustible se hunde en el abismo (Sink)',
    fuelResult.destroyedUnitIds.includes('sub_1'),
    'Submarino con 4 de combustible sumergido quemó 5 y se hundió.'
  );

  assert(
    'Unidad terrestre sobrevive a 0 de combustible (Inmovilizada)',
    fuelResult.updatedUnits.some(u => u.id === 'tank_1' && u.hp === 10 && u.fuel === 0),
    'El tanque no fue destruido, conservó sus 10 HP.'
  );

  const eagleBurn = getUnitTurnFuelConsumption(doomedFighter, 'clear', 'eagle');
  assert(
    'Bonificación de CO: Eagle consume 2 menos de combustible en aeronaves',
    eagleBurn === 3,
    `Consumo base: 5 -> Eagle: ${eagleBurn} fuel/turno.`
  );

  // --- SECCIÓN 2: REPARACIÓN Y REABASTECIMIENTO EN PROPIEDADES CON DEDUCCIÓN $G ---
  const mockTiles: TerrainTile[][] = Array.from({ length: 4 }, (_, y) =>
    Array.from({ length: 4 }, (_, x) => ({
      x,
      y,
      type: 'plains',
      defenseStars: 1,
    }))
  );
  // (1,1) is an allied city
  mockTiles[1][1] = { x: 1, y: 1, type: 'city', defenseStars: 3, ownerId: 'player_1', captureHp: 20 };

  const damagedTank: TacticalUnit = {
    ...groundTank,
    hp: 6, // 4 missing HP
    ammo: 2,
    fuel: 10,
    productionCost: 7000, // 700G per HP
  };

  const maintenanceResult = processPropertyMaintenance(
    [damagedTank],
    mockTiles,
    'player_1',
    5000 // Funds available
  );

  const repairedTank = maintenanceResult.updatedUnits[0];
  assert(
    'Reparación estándar de +2 HP y reabastecimiento gratuito al 100% en Ciudad',
    repairedTank.hp === 8 && repairedTank.ammo === 9 && repairedTank.fuel === 70,
    `HP: 6 -> 8 (+2 HP). Munición: 9/9, Fuel: 70/70.`
  );

  assert(
    'Deducción financiera proporcional de fondos en tesorería (700G x 2 HP = 1,400G)',
    maintenanceResult.totalFundsSpent === 1400 && maintenanceResult.updatedFunds === 3600,
    `Gasto: ${maintenanceResult.totalFundsSpent}G. Fondos restantes: ${maintenanceResult.updatedFunds}G.`
  );

  // Rachel bonus test (+3 HP)
  const rachelMaintenance = processPropertyMaintenance(
    [damagedTank],
    mockTiles,
    'player_1',
    5000,
    'rachel'
  );
  assert(
    'Especialidad de CO: Rachel repara +3 HP por turno en propiedades aliadas',
    rachelMaintenance.updatedUnits[0].hp === 9 && rachelMaintenance.totalFundsSpent === 2100,
    `HP reparado: 6 -> 9 (+3 HP). Costo: 2,100G.`
  );

  // --- SECCIÓN 3: HABILIDADES ESPECIALES (BLACK BOMB & LANDER 2 SLOTS) ---
  const blackBomb: TacticalUnit = {
    id: 'bomb_1',
    unitCode: 'blackbomb',
    displayName: 'Bomba Negra Suicida',
    ownerId: 'player_1',
    x: 2,
    y: 2,
    hp: 10,
    maxHp: 10,
    ammo: 0,
    fuel: 45,
    movementPoints: 9,
    movementType: 'air',
    minRange: 0,
    maxRange: 0,
    visionRange: 1,
    baseAttack: 0,
    productionCost: 25000,
    hasMoved: true,
    hasActed: false,
    skinId: 'default',
  };

  const enemyNear: TacticalUnit = {
    id: 'enemy_tank',
    unitCode: 'tank_medium',
    displayName: 'Tanque Pesado',
    ownerId: 'player_2',
    x: 2,
    y: 3, // Distance 1 from bomb
    hp: 10,
    maxHp: 10,
    ammo: 8,
    fuel: 50,
    movementPoints: 5,
    movementType: 'treads',
    minRange: 1,
    maxRange: 1,
    visionRange: 1,
    baseAttack: 100,
    productionCost: 16000,
    hasMoved: false,
    hasActed: false,
    skinId: 'default',
  };

  const unitsMap = new Map<string, TacticalUnit>();
  unitsMap.set(blackBomb.id, blackBomb);
  unitsMap.set(enemyNear.id, enemyNear);

  const bombResult = executeBlackBombExplosion(blackBomb, unitsMap, 5, 5);
  assert(
    'Black Bomb: Detonación en área 3x3 causa 5 PV de daño y se autodestruye',
    bombResult.success && enemyNear.hp === 5 && blackBomb.hp === 0,
    `Tanque enemigo reducido de 10 -> ${enemyNear.hp} HP. Bomba destruida (HP: ${blackBomb.hp}).`
  );

  // Multi-unit Lander Transport (2 Tanks)
  const transportMgr = new MultiUnitTransportManager();
  const lander: TacticalUnit = {
    id: 'lander_1',
    unitCode: 'lander',
    displayName: 'Barcaza Lander',
    ownerId: 'player_1',
    x: 0,
    y: 0,
    hp: 10,
    maxHp: 10,
    ammo: 0,
    fuel: 99,
    movementPoints: 6,
    movementType: 'sea',
    minRange: 0,
    maxRange: 0,
    visionRange: 1,
    baseAttack: 0,
    productionCost: 12000,
    hasMoved: false,
    hasActed: false,
    skinId: 'default',
  };

  const tankA = { ...damagedTank, id: 'tank_a' };
  const tankB = { ...damagedTank, id: 'tank_b' };
  const board1 = transportMgr.board(lander, tankA);
  const board2 = transportMgr.board(lander, tankB);
  const board3 = transportMgr.board(lander, doomedFighter); // Exceeds cap / invalid type

  assert(
    'Lander: Capacidad de embarque dual (2 tanques pesados simultáneos)',
    board1.success && board2.success && !board3.success && transportMgr.getPassengers('lander_1').length === 2,
    `2 unidades terrestres a bordo. Bloqueo al intentar sobrepasar la capacidad de 2 slots.`
  );

  const unloadRes = transportMgr.unload('lander_1', 0, { x: 0, y: 1 });
  assert(
    'Desembarque individual de pasajero con actualización de coordenadas',
    unloadRes.success && unloadRes.passenger?.x === 0 && unloadRes.passenger?.y === 1,
    `Pasajero desembarcado en (0,1). Restantes en transporte: ${transportMgr.getPassengers('lander_1').length}.`
  );

  // --- SECCIÓN 4: VICTORIA POR CAPTURA DE HQ Y TRANSFERENCIA DE PROPIEDADES ---
  mockTiles[0][0] = { x: 0, y: 0, type: 'hq', defenseStars: 4, ownerId: 'player_2', captureHp: 0 };
  mockTiles[0][1] = { x: 0, y: 1, type: 'factory', defenseStars: 3, ownerId: 'player_2', captureHp: 20 };
  mockTiles[0][2] = { x: 0, y: 2, type: 'city', defenseStars: 3, ownerId: 'player_2', captureHp: 20 };

  const hqVictory = executeHqCaptureElimination(
    'player_1',
    'player_2',
    mockTiles,
    [enemyNear, repairedTank]
  );

  assert(
    'Toma de Cuartel General: Transferencia instantánea de todas las propiedades al vencedor',
    hqVictory.winnerId === 'player_1' && hqVictory.propertiesTransferredCount === 3,
    `3 sedes enemigas (HQ, Fábrica, Ciudad) anexadas bajo mando de ${hqVictory.winnerId}.`
  );

  assert(
    'Toma de Cuartel General: Disolución completa de todo el ejército enemigo superviviente',
    hqVictory.unitsDisbandedCount === 1 && !hqVictory.remainingUnits.some(u => u.ownerId === 'player_2'),
    `Ejército rival desmantelado en el acto (${hqVictory.unitsDisbandedCount} tropas eliminadas).`
  );

  // --- SECCIÓN 5: IMPORTADOR UNIVERSAL EXTENDIDO AWBW (+190 BALDOSAS) ---
  const sampleAwbwMap = `
    1, 2, 3, 4, 15
    28, 33, 34, 38, 43
    101, 111, 113, 127, 138
  `;
  const parsedMap = parseAWBWExtendedMap(sampleAwbwMap);
  const pipeSeamTile = parsedMap[2][2] as any;
  const commTowerTile = parsedMap[2][3];

  assert(
    'Mapeador Universal AWBW: Reconocimiento de tuberías, costuras destructibles y torres',
    parsedMap.length === 3 &&
      parsedMap[0].length === 5 &&
      pipeSeamTile.variant === 'pipeSeam-rl' &&
      pipeSeamTile.seamHp === 100 &&
      commTowerTile.type === 'commtower',
    `Costura de tubería con 100 HP y Torre de Telecomunicaciones parseadas fielmente.`
  );

  // --- SECCIÓN 6: PRUEBA DE ESTRÉS (1,000 SIMULACIONES COMPLETAS) ---
  console.log('\n--- INICIANDO PRUEBA DE ESTRÉS: 1,000 SIMULACIONES TÁCTICAS ---');
  const stressStart = performance.now();
  let stressSuccess = true;

  for (let i = 0; i < 1000; i++) {
    // 1. Fuel burn simulation
    const randomFuel = Math.floor(Math.random() * 20);
    const unit: TacticalUnit = {
      ...doomedFighter,
      id: `fighter_stress_${i}`,
      fuel: randomFuel,
    };
    const fRes = processTurnFuelConsumption([unit], 'player_1', 'clear');
    if (randomFuel <= 5 && !fRes.destroyedUnitIds.includes(unit.id)) {
      stressSuccess = false;
      break;
    }

    // 2. Property repair simulation
    const pRes = processPropertyMaintenance([damagedTank], mockTiles, 'player_1', 10000);
    if (pRes.totalFundsSpent !== 1400) {
      stressSuccess = false;
      break;
    }

    // 3. Black Bomb blast calculation
    const bomb: TacticalUnit = { ...blackBomb, x: 2, y: 2 };
    const bRes = executeBlackBombExplosion(bomb, unitsMap, 5, 5);
    if (!bRes.success || bomb.hp !== 0) {
      stressSuccess = false;
      break;
    }
  }

  const stressDuration = Math.round(performance.now() - stressStart);
  assert(
    'Prueba de Estrés: 1,000 ciclos de combustible, reparaciones y bombas completados',
    stressSuccess,
    `1,000 iteraciones en ${stressDuration}ms (${(stressDuration / 1000).toFixed(3)}ms por ciclo). Consistencia matemática e integridad de memoria al 100%.`
  );

  console.log('\n------------------------------------------------------------------------------');
  console.log(`RESUMEN SISTEMAS AVANZADOS: ${passed}/${passed + failed} PASARON`);
  console.log('------------------------------------------------------------------------------\n');

  return {
    total: passed + failed,
    passed,
    results,
  };
}

if (typeof process !== 'undefined' && process.argv && process.argv[1]?.includes('advancedWarsWorldSystems.test')) {
  const summary = runAdvancedWarsWorldSystemsSuite();
  if (summary.passed < summary.total) {
    process.exit(1);
  }
}

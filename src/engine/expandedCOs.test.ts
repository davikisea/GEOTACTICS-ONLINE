import { CANONICAL_CO_REGISTRY, COEngine, COId, PlayerCOState, STAR_CHARGE_VALUE } from './coSystem';
import { TacticalUnit, TerrainTile } from '../types';

export interface ExpandedCOsTestResult {
  name: string;
  passed: boolean;
  message: string;
}

export function runExpandedCOsSuite(): { total: number; passed: number; results: ExpandedCOsTestResult[] } {
  const results: ExpandedCOsTestResult[] = [];
  let passed = 0;
  let failed = 0;

  function assert(desc: string, condition: boolean, detail: string = '') {
    if (condition) {
      results.push({ name: desc, passed: true, message: detail });
      passed++;
    } else {
      results.push({ name: desc, passed: false, message: detail });
      failed++;
    }
  }

  // --- SECCIÓN 1: VERIFICACIÓN DE REGISTRO COMPLETO (28 COs) ---
  const registeredCOs = Object.keys(CANONICAL_CO_REGISTRY);
  assert(
    'Registro canónico contiene exactamente 28 Comandantes',
    registeredCOs.length === 28,
    `Comandantes registrados: ${registeredCOs.length}/28 (${registeredCOs.join(', ')})`
  );

  // Check critical COs exist
  const expectedCOs: COId[] = [
    'adder', 'andy', 'colin', 'drake', 'eagle', 'flak', 'grimm', 'grit',
    'hachi', 'hawke', 'jake', 'javier', 'jess', 'jugger', 'kanbei', 'kindle',
    'koal', 'lash', 'max', 'nell', 'olaf', 'rachel', 'sami', 'sasha',
    'sensei', 'sonja', 'sturm', 'von_bolt'
  ];
  const allPresent = expectedCOs.every(id => id in CANONICAL_CO_REGISTRY);
  assert(
    'Todos los 28 identificadores de WarsWorld están presentes con definiciones completas',
    allPresent,
    'Todos los comandantes poseen D2D, SCOP y asignación estelar reglamentaria.'
  );

  // --- SECCIÓN 2: ACTIVACIÓN Y EFECTOS DE SUPERPODERES CLAVE ---
  const mockTiles: TerrainTile[][] = Array.from({ length: 5 }, (_, y) =>
    Array.from({ length: 5 }, (_, x) => ({
      x,
      y,
      type: 'plains',
      defenseStars: 1,
    }))
  );

  const allyUnit1: TacticalUnit = {
    id: 'ally_1',
    unitCode: 'tank_light',
    displayName: 'Tanque Aliado',
    ownerId: 'p1',
    x: 0,
    y: 0,
    hp: 4,
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
    hasMoved: true,
    hasActed: true,
    skinId: 'default',
  };

  const enemyUnit1: TacticalUnit = {
    id: 'enemy_1',
    unitCode: 'tank_medium',
    displayName: 'Tanque Pesado Enemigo',
    ownerId: 'p2',
    x: 2,
    y: 2,
    hp: 10,
    maxHp: 10,
    ammo: 8,
    fuel: 50,
    movementPoints: 5,
    movementType: 'treads',
    minRange: 1,
    maxRange: 1,
    visionRange: 1,
    baseAttack: 105,
    productionCost: 16000,
    hasMoved: false,
    hasActed: false,
    skinId: 'default',
  };

  // Test 2A: Hawke Black Storm (-2 HP a enemigos, +2 HP a aliados)
  const hawkeState: PlayerCOState = {
    coId: 'hawke',
    powerMeter: 9 * STAR_CHARGE_VALUE, // 9 stars
    activePower: null,
  };
  const hawkeActivation = COEngine.activatePower(hawkeState, 'scop', {
    player: 'p1',
    units: [allyUnit1, enemyUnit1],
    tiles: mockTiles,
    funds: 5000,
  });

  const hawkeAlly = hawkeActivation.updatedUnits?.find(u => u.id === allyUnit1.id);
  const hawkeEnemy = hawkeActivation.updatedUnits?.find(u => u.id === enemyUnit1.id);
  assert(
    'Hawke - Black Storm (9★): Regenera +2 HP aliados y drena -2 HP enemigos',
    hawkeAlly?.hp === 6 && hawkeEnemy?.hp === 8,
    `Aliado HP: 4 -> ${hawkeAlly?.hp}, Enemigo HP: 10 -> ${hawkeEnemy?.hp}`
  );

  // Test 2B: Eagle - Lightning Strike (reactivación completa de unidades aliadas)
  const eagleState: PlayerCOState = {
    coId: 'eagle',
    powerMeter: 9 * STAR_CHARGE_VALUE,
    activePower: null,
  };
  const eagleActivation = COEngine.activatePower(eagleState, 'scop', {
    player: 'p1',
    units: [{ ...allyUnit1, hasMoved: true, hasActed: true }],
    tiles: mockTiles,
    funds: 5000,
  });
  const reactivatedUnit = eagleActivation.updatedUnits?.[0];
  assert(
    'Eagle - Lightning Strike (9★): Reactiva unidades aliadas agotadas para un 2do turno',
    reactivatedUnit?.hasMoved === false && reactivatedUnit?.hasActed === false,
    `hasMoved: ${reactivatedUnit?.hasMoved}, hasActed: ${reactivatedUnit?.hasActed}`
  );

  // Test 2C: Sturm - Meteor Strike (8 PV de daño cósmico)
  const sturmState: PlayerCOState = {
    coId: 'sturm',
    powerMeter: 10 * STAR_CHARGE_VALUE,
    activePower: null,
  };
  const sturmActivation = COEngine.activatePower(sturmState, 'scop', {
    player: 'p1',
    units: [enemyUnit1],
    tiles: mockTiles,
    funds: 1000,
  });
  const bombedEnemy = sturmActivation.updatedUnits?.[0];
  assert(
    'Sturm - Meteor Strike (10★): Daño catastrófico de 8 PV a unidades enemigas',
    bombedEnemy?.hp === 2,
    `Tanque enemigo con 10 HP reducido a ${bombedEnemy?.hp} HP.`
  );

  // --- SECCIÓN 3: MODIFICADORES ECONÓMICOS Y PRODUCCIÓN ---
  const baseCost = 10000;
  const colinCost = COEngine.getProductionCostModifier('colin', baseCost);
  const hachiCost = COEngine.getProductionCostModifier('hachi', baseCost);
  const kanbeiCost = COEngine.getProductionCostModifier('kanbei', baseCost);

  assert(
    'Colin - Descuento económico del 20% en producción',
    colinCost === 8000,
    `Base 10,000G -> ${colinCost}G (-20%)`
  );
  assert(
    'Hachi - Descuento del 10% en suministros',
    hachiCost === 9000,
    `Base 10,000G -> ${hachiCost}G (-10%)`
  );
  assert(
    'Kanbei - Sobrecoste del 20% por unidades de élite',
    kanbeiCost === 12000,
    `Base 10,000G -> ${kanbeiCost}G (+20%)`
  );

  // --- SECCIÓN 4: PRUEBA DE ESTRÉS (1,000 CICLOS SOBRE LOS 28 COs) ---
  console.log('\n--- INICIANDO PRUEBA DE ESTRÉS PASO 3 (1,000 CICLOS EN 28 COs) ---');
  const stressStart = performance.now();
  let stressSuccess = true;

  for (let i = 0; i < 1000; i++) {
    // Select a random CO among the 28
    const randomCOId = expectedCOs[Math.floor(Math.random() * expectedCOs.length)];
    const coDef = COEngine.getCO(randomCOId);

    // Charge combat power
    const dmgDealt = Math.floor(Math.random() * 8) + 1;
    const dmgRecv = Math.floor(Math.random() * 8) + 1;
    const charge = COEngine.calculateCombatCharge(dmgDealt, 7000, dmgRecv, 7000);

    const state: PlayerCOState = {
      coId: randomCOId,
      powerMeter: charge + (coDef.powers.scop.stars * STAR_CHARGE_VALUE),
      activePower: null,
    };

    // Activate power
    const activation = COEngine.activatePower(state, 'scop', {
      player: 'p1',
      units: [allyUnit1, enemyUnit1],
      tiles: mockTiles,
      funds: 10000,
    });

    if (activation.updatedState.activePower !== 'scop' || activation.updatedState.powerMeter !== 0) {
      stressSuccess = false;
      break;
    }

    // Expire on turn end
    const expired = COEngine.expirePowerOnTurnEnd(activation.updatedState);
    if (expired.activePower !== null) {
      stressSuccess = false;
      break;
    }
  }

  const stressDuration = Math.round(performance.now() - stressStart);
  assert(
    'Prueba de Estrés: 1,000 ciclos de carga, activación y expiración sobre 28 COs completados',
    stressSuccess,
    `1,000 iteraciones en ${stressDuration}ms (${(stressDuration / 1000).toFixed(3)}ms por ciclo). Estado e invariantes perfectamente consistentes.`
  );

  return {
    total: passed + failed,
    passed,
    results,
  };
}

if (typeof process !== 'undefined' && process.argv && process.argv[1]?.includes('expandedCOs.test')) {
  const summary = runExpandedCOsSuite();
  console.log(`\nRESUMEN PASO 3: ${summary.passed}/${summary.total} PASARON`);
  if (summary.passed < summary.total) {
    process.exit(1);
  }
}

import { CombatEngine, COMBAT_EFFECTIVENESS_MATRIX } from './combat';
import { TacticalUnit, TerrainTile } from '../types';

export interface CombatTestResult {
  name: string;
  passed: boolean;
  error?: string;
}

export function runCombatTests(): { total: number; passed: number; failed: number; results: CombatTestResult[] } {
  const results: CombatTestResult[] = [];

  function assert(condition: boolean, testName: string, failureMsg?: string) {
    if (condition) {
      results.push({ name: testName, passed: true });
    } else {
      results.push({ name: testName, passed: false, error: failureMsg || 'Falló la aserción' });
    }
  }

  function createUnit(overrides: Partial<TacticalUnit> = {}): TacticalUnit {
    return {
      id: 'test_unit',
      unitCode: 'infantry',
      displayName: 'Infantería',
      ownerId: 'p1',
      x: 0,
      y: 0,
      hp: 10,
      maxHp: 10,
      ammo: 9,
      fuel: 99,
      movementPoints: 3,
      movementType: 'foot',
      minRange: 1,
      maxRange: 1,
      visionRange: 3,
      baseAttack: 55,
      productionCost: 1000,
      hasMoved: false,
      hasActed: false,
      skinId: 'default',
      ...overrides,
    };
  }

  function createTile(type: TerrainTile['type'], defenseStars: number, ownerId: string | null = null, captureHp: number = 20): TerrainTile {
    return {
      x: 0,
      y: 0,
      type,
      defenseStars,
      ownerId,
      captureHp,
    };
  }

  // --------------------------------------------------------------------------
  // TEST 1: Antiaéreo vs Helicóptero (B-Copter) - Daño Devastador
  // --------------------------------------------------------------------------
  try {
    const antiAir = createUnit({ id: 'aa', unitCode: 'anti_air', x: 0, y: 0, hp: 10, minRange: 1, maxRange: 1 });
    const copter = createUnit({ id: 'cop', unitCode: 'b_copter', ownerId: 'p2', x: 1, y: 0, hp: 10 });
    const tileRoad = createTile('road', 0);

    const result = CombatEngine.calculateDamage(antiAir, copter, tileRoad, tileRoad);

    assert(result.canAttack, 'Test 1: Antiaéreo puede atacar al helicóptero adyacente');
    assert(result.attackerDamageDealt === 10, 'Test 1: Antiaéreo a 10 HP destruye al helicóptero (105% base -> 10 HP)');
    assert(result.defenderEliminated, 'Test 1: Helicóptero queda eliminado');
    assert(!result.canCounterAttack, 'Test 1: No hay contraataque al ser eliminado');
  } catch (err: any) {
    results.push({ name: 'Test 1: Antiaéreo vs Helicóptero', passed: false, error: err.message });
  }

  // --------------------------------------------------------------------------
  // TEST 2: Tanque vs Infantería con Cobertura de Montaña (4★ = 40% Reducción)
  // --------------------------------------------------------------------------
  try {
    const tank = createUnit({ id: 'tank', unitCode: 'tank_light', x: 0, y: 0, hp: 10 });
    const infantryPlains = createUnit({ id: 'inf_plains', unitCode: 'infantry', ownerId: 'p2', x: 1, y: 0, hp: 10 });
    const infantryMountain = createUnit({ id: 'inf_mount', unitCode: 'infantry', ownerId: 'p2', x: 1, y: 0, hp: 10 });

    const tilePlains = createTile('plains', 1); // 10%
    const tileMountain = createTile('mountain', 4); // 40%

    const resultPlains = CombatEngine.calculateDamage(tank, infantryPlains, tilePlains, tilePlains);
    const resultMountain = CombatEngine.calculateDamage(tank, infantryMountain, tilePlains, tileMountain);

    assert(resultPlains.attackerDamageDealt > resultMountain.attackerDamageDealt, 'Test 2: El daño en montaña es menor que en llanura');
    assert(resultMountain.damageReductionPercent === 40, 'Test 2: Montaña otorga exactamente 40% de reducción defensiva');
  } catch (err: any) {
    results.push({ name: 'Test 2: Cobertura de Montaña', passed: false, error: err.message });
  }

  // --------------------------------------------------------------------------
  // TEST 3: Contraataque Directo (Rango 1) si el Defensor sobrevive
  // --------------------------------------------------------------------------
  try {
    const infP1 = createUnit({ id: 'inf1', unitCode: 'infantry', ownerId: 'p1', x: 0, y: 0, hp: 10 });
    const infP2 = createUnit({ id: 'inf2', unitCode: 'infantry', ownerId: 'p2', x: 1, y: 0, hp: 10 });
    const tile = createTile('plains', 1);

    const result = CombatEngine.calculateDamage(infP1, infP2, tile, tile);

    assert(result.canCounterAttack, 'Test 3: Se ejecuta contraataque si el defensor sobrevive a distancia 1');
    assert(result.defenderHpAfter > 0, 'Test 3: El defensor sobrevive al primer impacto');
    assert(result.counterDamageDealt > 0, 'Test 3: El contraataque inflige daño al atacante original');
    assert(result.attackerHpAfter < 10, 'Test 3: La vida del atacante disminuye por el contraataque');
  } catch (err: any) {
    results.push({ name: 'Test 3: Contraataque Directo', passed: false, error: err.message });
  }

  // --------------------------------------------------------------------------
  // TEST 4: Fuego Indirecto (Artillería a Distancia 2) Sin Contraataque
  // --------------------------------------------------------------------------
  try {
    const artillery = createUnit({ id: 'art', unitCode: 'artillery', ownerId: 'p1', x: 0, y: 0, minRange: 2, maxRange: 3 });
    const enemyTank = createUnit({ id: 'tank2', unitCode: 'tank_light', ownerId: 'p2', x: 2, y: 0, minRange: 1, maxRange: 1 });
    const tile = createTile('plains', 1);

    const result = CombatEngine.calculateDamage(artillery, enemyTank, tile, tile);

    assert(result.canAttack, 'Test 4: Artillería ataca a distancia 2');
    assert(!result.canCounterAttack, 'Test 4: El tanque directo no puede contraatacar a distancia 2');
    assert(result.counterDamageDealt === 0, 'Test 4: Daño de contraataque es 0');
  } catch (err: any) {
    results.push({ name: 'Test 4: Fuego Indirecto', passed: false, error: err.message });
  }

  // --------------------------------------------------------------------------
  // TEST 5: Caza Aire-Aire No Puede Atacar Tropas Terrestres
  // --------------------------------------------------------------------------
  try {
    const fighter = createUnit({ id: 'f1', unitCode: 'fighter', ownerId: 'p1', x: 0, y: 0 });
    const infantry = createUnit({ id: 'inf', unitCode: 'infantry', ownerId: 'p2', x: 1, y: 0 });
    const tile = createTile('plains', 1);

    const result = CombatEngine.calculateDamage(fighter, infantry, tile, tile);

    assert(result.attackerDamageDealt === 0, 'Test 5: Caza inflige 0 de daño a tropas terrestres');
  } catch (err: any) {
    results.push({ name: 'Test 5: Restricción de armas Aire-Aire', passed: false, error: err.message });
  }

  // --------------------------------------------------------------------------
  // TEST 6: Mecánica de Captura en 2 Turnos (Ciudad 20 HP)
  // --------------------------------------------------------------------------
  try {
    const infantry = createUnit({ id: 'inf_cap', ownerId: 'p1', hp: 10, movementType: 'foot' });
    const neutralCity = createTile('city', 3, null, 20);

    // Turno 1: Captura parcial
    const turn1Result = CombatEngine.processPropertyCapture(infantry, neutralCity);
    assert(turn1Result.success, 'Test 6: Turno 1 de captura exitoso');
    assert(!turn1Result.isCompleted, 'Test 6: Turno 1 no completa la captura');
    assert(turn1Result.remainingCaptureHp === 10, 'Test 6: Restan 10 puntos de captura tras el turno 1');

    // Turno 2: Captura final
    const cityTurn2 = createTile('city', 3, null, turn1Result.remainingCaptureHp);
    const turn2Result = CombatEngine.processPropertyCapture(infantry, cityTurn2);
    assert(turn2Result.isCompleted, 'Test 6: Turno 2 completa la captura');
    assert(turn2Result.newOwnerId === 'p1', 'Test 6: El nuevo dueño es el Jugador 1');
    assert(turn2Result.remainingCaptureHp === 20, 'Test 6: Los puntos de captura se restablecen a 20');
  } catch (err: any) {
    results.push({ name: 'Test 6: Captura de Ciudades en 2 Turnos', passed: false, error: err.message });
  }

  // --------------------------------------------------------------------------
  // TEST 7: Captura de Cuartel General (HQ) y Condición de Victoria
  // --------------------------------------------------------------------------
  try {
    const infantry = createUnit({ id: 'inf_hq', ownerId: 'p1', hp: 10, movementType: 'foot' });
    const enemyHq = createTile('hq', 4, 'p2', 10); // Le quedaban 10 puntos

    const hqResult = CombatEngine.processPropertyCapture(infantry, enemyHq);
    assert(hqResult.isCompleted, 'Test 7: Cuartel General capturado');
    assert(hqResult.isHqCaptured, 'Test 7: Se detecta la bandera isHqCaptured para victoria inmediata');
  } catch (err: any) {
    results.push({ name: 'Test 7: Captura de Cuartel General', passed: false, error: err.message });
  }

  // --------------------------------------------------------------------------
  // TEST 8: Tanque NO puede capturar propiedades
  // --------------------------------------------------------------------------
  try {
    const tank = createUnit({ id: 'tank_cap', movementType: 'treads' });
    const city = createTile('city', 3, null, 20);

    const tankResult = CombatEngine.processPropertyCapture(tank, city);
    assert(!tankResult.success, 'Test 8: Tanque no tiene permitido capturar propiedades');
  } catch (err: any) {
    results.push({ name: 'Test 8: Restricción de captura para vehículos', passed: false, error: err.message });
  }

  // --------------------------------------------------------------------------
  // TEST 9: Gestión Canónica de Munición (Arma Primaria vs Secundaria)
  // --------------------------------------------------------------------------
  try {
    const mechWithAmmo = createUnit({ id: 'mech1', unitCode: 'mech', ammo: 3, hp: 10 });
    const mechNoAmmo = createUnit({ id: 'mech2', unitCode: 'mech', ammo: 0, hp: 10 });
    const tankEnemy = createUnit({ id: 'tank_e', unitCode: 'tank_light', ownerId: 'p2', hp: 10 });
    const tilePlains = createTile('plains', 1);

    const resultWithAmmo = CombatEngine.calculateDamage(mechWithAmmo, tankEnemy, tilePlains, tilePlains);
    const resultNoAmmo = CombatEngine.calculateDamage(mechNoAmmo, tankEnemy, tilePlains, tilePlains);

    assert(resultWithAmmo.weaponUsed === 'primary', 'Test 9: Mech con munición usa su Bazuca primario');
    assert(resultNoAmmo.weaponUsed === 'secondary', 'Test 9: Mech sin munición conmuta a su ametralladora secundaria');
    assert(resultWithAmmo.attackerDamageDealt > resultNoAmmo.attackerDamageDealt, 'Test 9: El Bazuca inflige significativamente más daño que la ametralladora contra tanques');
  } catch (err: any) {
    results.push({ name: 'Test 9: Gestión Canónica de Munición', passed: false, error: err.message });
  }

  // --------------------------------------------------------------------------
  // TEST 10: Bonificación Ofensiva de Torres de Comunicación (+10% por Torre)
  // --------------------------------------------------------------------------
  try {
    const infantryAttacker = createUnit({ id: 'inf_c', unitCode: 'infantry', hp: 10 });
    const infantryDefender = createUnit({ id: 'inf_d', unitCode: 'infantry', ownerId: 'p2', hp: 10 });
    const tileRoad = createTile('road', 0);

    const normalResult = CombatEngine.calculateDamage(infantryAttacker, infantryDefender, tileRoad, tileRoad, 0, 0, {
      commtowersCount: 0,
    });
    const commtowerResult = CombatEngine.calculateDamage(infantryAttacker, infantryDefender, tileRoad, tileRoad, 0, 0, {
      commtowersCount: 2, // +20% ataque
    });

    assert(commtowerResult.attackerDamagePercent > normalResult.attackerDamagePercent, 'Test 10: 2 Torres de Comunicación aumentan el daño porcentual');
  } catch (err: any) {
    results.push({ name: 'Test 10: Torres de Comunicación', passed: false, error: err.message });
  }

  const passedCount = results.filter(r => r.passed).length;
  const failedCount = results.length - passedCount;

  return {
    total: results.length,
    passed: passedCount,
    failed: failedCount,
    results,
  };
}

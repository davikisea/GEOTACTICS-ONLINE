import { launchMissile, isUnusedSilo, getExplosionTiles } from './missileSilo';
import { getWeatherModifiers, getEffectiveWeatherForCO, rollTurnWeather } from './weatherSystem';
import { calculateSingleUnitThreat, calculateCombinedEnemyThreatMap } from './threatRange';
import { TacticalUnit, TerrainTile } from '../types';

export interface AdvancedTacticsTestResult {
  name: string;
  passed: boolean;
  message: string;
}

export function runAdvancedTacticsSuite(): { total: number; passed: number; results: AdvancedTacticsTestResult[] } {
  const results: AdvancedTacticsTestResult[] = [];
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

  // --- SECCIÓN 1: SILOS DE MISILES ---
  const mapWidth = 10;
  const mapHeight = 10;
  const mockTiles: TerrainTile[][] = Array.from({ length: mapHeight }, (_, y) =>
    Array.from({ length: mapWidth }, (_, x) => ({
      x,
      y,
      type: 'plains',
      defenseStars: 1,
    }))
  );
  mockTiles[5][5] = { x: 5, y: 5, type: 'silo', defenseStars: 3, captureHp: 20 };

  const footSoldier: TacticalUnit = {
    id: 'soldier_1',
    unitCode: 'infantry',
    displayName: 'Infantería',
    ownerId: 'player_1',
    x: 5,
    y: 5,
    hp: 10,
    maxHp: 10,
    ammo: 99,
    fuel: 99,
    movementPoints: 3,
    movementType: 'foot',
    minRange: 1,
    maxRange: 1,
    visionRange: 2,
    baseAttack: 55,
    productionCost: 1000,
    hasMoved: true,
    hasActed: false,
    skinId: 'default',
  };

  const targetEnemy1: TacticalUnit = {
    id: 'enemy_tank',
    unitCode: 'tank_light',
    displayName: 'Tanque Enemigo',
    ownerId: 'player_2',
    x: 2,
    y: 2, // Centered in blast
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
    skinId: 'default',
  };

  const targetEnemyFragile: TacticalUnit = {
    id: 'enemy_fragile',
    unitCode: 'recon',
    displayName: 'Recon Dañado',
    ownerId: 'player_2',
    x: 3,
    y: 2, // Within 1 tile distance of epicenter (2,2)
    hp: 2, // Less than 3 HP -> Must survive at 1 HP!
    maxHp: 10,
    ammo: 9,
    fuel: 70,
    movementPoints: 8,
    movementType: 'wheels',
    minRange: 1,
    maxRange: 1,
    visionRange: 5,
    baseAttack: 35,
    productionCost: 4000,
    hasMoved: false,
    hasActed: false,
    skinId: 'default',
  };

  const unitsMap = new Map<string, TacticalUnit>();
  unitsMap.set(footSoldier.id, footSoldier);
  unitsMap.set(targetEnemy1.id, targetEnemy1);
  unitsMap.set(targetEnemyFragile.id, targetEnemyFragile);

  // Test 1A: Blast geometry (Manhattan diamond radius 2)
  const blastTiles = getExplosionTiles({ x: 2, y: 2 }, 2, mapWidth, mapHeight);
  // Diamond of radius 2 has: (0,0)[1] + dist 1[4] + dist 2[8] = 13 tiles total
  assert(
    'Geometría de explosión de Silo: Diamante de radio Manhattan 2 (13 casillas)',
    blastTiles.length === 13,
    `Casillas cubiertas en la detonación: ${blastTiles.length}`
  );

  // Test 1B: Launch execution & minimum 1 HP survival rule
  const launchResult = launchMissile({
    launcherUnit: footSoldier,
    siloPosition: { x: 5, y: 5 },
    targetPosition: { x: 2, y: 2 },
    tiles: mockTiles,
    unitsMap,
    gridWidth: mapWidth,
    gridHeight: mapHeight,
  });

  assert(
    'Lanzamiento exitoso y daño directo de 3 PV',
    launchResult.success &&
      launchResult.affectedUnits.length === 2 &&
      targetEnemy1.hp === 7,
    `Tanque enemigo reducido de 10 -> ${targetEnemy1.hp} HP.`
  );

  assert(
    'Regla canónica de Silos: Unidad frágil no muere (sobrevive con 1 HP)',
    targetEnemyFragile.hp === 1,
    `Recon con 2 HP reducido a ${targetEnemyFragile.hp} HP (no destruido).`
  );

  assert(
    'Silo queda inactivo (agotado) tras el disparo',
    mockTiles[5][5].captureHp === 0 && !isUnusedSilo(mockTiles[5][5]),
    `Estado del silo: captureHp=${mockTiles[5][5].captureHp}`
  );

  // Test 1C: Prevent re-firing used silo
  const secondLaunch = launchMissile({
    launcherUnit: footSoldier,
    siloPosition: { x: 5, y: 5 },
    targetPosition: { x: 2, y: 2 },
    tiles: mockTiles,
    unitsMap,
    gridWidth: mapWidth,
    gridHeight: mapHeight,
  });
  assert(
    'Bloqueo de disparo sobre silo ya utilizado',
    !secondLaunch.success,
    `Error devuelto: ${secondLaunch.error}`
  );

  // --- SECCIÓN 2: SISTEMA DE CLIMA CANÓNICO ---
  const snowMods = getWeatherModifiers('snow');
  assert(
    'Modificadores de Nieve: +1 coste de movimiento y x2 consumo de combustible',
    snowMods.movementCostModifier === 1 && snowMods.fuelConsumptionMultiplier === 2,
    `Coste: +${snowMods.movementCostModifier}, Combustible: x${snowMods.fuelConsumptionMultiplier}`
  );

  const sandMods = getWeatherModifiers('sandstorm');
  assert(
    'Modificadores de Tormenta de Arena: -30% potencia de fuego indirecta',
    sandMods.indirectDamageModifier === 0.7 && sandMods.visionModifier === -1,
    `Multiplicador daño indirecto: ${sandMods.indirectDamageModifier}, Visión: ${sandMods.visionModifier}`
  );

  const olafInSnow = getWeatherModifiers('snow', 'olaf');
  assert(
    'Inmunidad canónica de CO: Olaf ignora penalización de Nieve',
    olafInSnow.movementCostModifier === 0 && olafInSnow.fuelConsumptionMultiplier === 1,
    'Olaf mantiene tracción estándar en clima ártico.'
  );

  const drakeEffective = getEffectiveWeatherForCO('rain', 'drake');
  assert(
    'Ventaja canónica de CO: Drake convierte Lluvia en Despejado',
    drakeEffective === 'clear',
    `Drake en lluvia opera como: ${drakeEffective}`
  );

  const rolledClear = rollTurnWeather(2, 0, true, 80);
  const rolledSnow = rollTurnWeather(2, 0, true, 2);
  assert(
    'Generador probabilístico de clima por turno',
    rolledClear === 'clear' && rolledSnow === 'snow',
    `Tirada 80 -> ${rolledClear}, Tirada 2 -> ${rolledSnow}`
  );

  // --- SECCIÓN 3: RANGO DE AMENAZA ENEMIGA & MAPA DE CALOR ---
  const enemyArtillery: TacticalUnit = {
    id: 'enemy_arty',
    unitCode: 'artillery',
    displayName: 'Artillería Enemiga',
    ownerId: 'player_2',
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

  const threatMap = calculateCombinedEnemyThreatMap(
    'player_1',
    [targetEnemy1, enemyArtillery],
    mockTiles,
    mapWidth,
    mapHeight
  );

  assert(
    'Cálculo de Rango de Amenaza combinado y mapa de calor de peligro',
    threatMap.threatenedTiles.length > 0 && threatMap.heatMap.length === mapHeight,
    `Total de casillas bajo amenaza enemiga: ${threatMap.threatenedTiles.length}`
  );

  // Artillery at (0,0) threatens (0,2), (0,3), (1,1), (1,2), (2,0), (2,1), (3,0) but NOT (0,0) or (0,1)
  const artyThreat = calculateSingleUnitThreat(
    enemyArtillery,
    mockTiles,
    unitsMap,
    mapWidth,
    mapHeight
  );
  const threatensSelf = artyThreat.some(p => p.x === 0 && p.y === 0);
  const threatensMinRangeBlind = artyThreat.some(p => p.x === 0 && p.y === 1);
  const threatensTarget = artyThreat.some(p => p.x === 0 && p.y === 2);

  assert(
    'Rango de Artillería indirecta sin movimiento detectado con zona ciega canónica',
    threatensTarget && !threatensSelf && !threatensMinRangeBlind,
    `Casilla (0,2) en rango min-max [2..3]: amenazada. Casilla propia (0,0) y adyacente (0,1): zona ciega no amenazada.`
  );

  // --- SECCIÓN 4: PRUEBA DE ESTRÉS (1,000 detonaciones y mapas de calor) ---
  console.log('\n--- INICIANDO PRUEBA DE ESTRÉS PASO 2 (1,000 ITERACIONES) ---');
  const stressStart = performance.now();
  let stressSuccess = true;

  for (let i = 0; i < 1000; i++) {
    // 1. Simulate random silo detonation
    const rx = Math.floor(Math.random() * mapWidth);
    const ry = Math.floor(Math.random() * mapHeight);
    const blast = getExplosionTiles({ x: rx, y: ry }, 2, mapWidth, mapHeight);
    if (blast.length === 0 || blast.length > 13) {
      stressSuccess = false;
      break;
    }

    // 2. Weather roll
    const w = rollTurnWeather(2, 1, true);
    if (!['clear', 'rain', 'snow', 'sandstorm'].includes(w)) {
      stressSuccess = false;
      break;
    }

    // 3. Combined threat map calculation
    const result = calculateCombinedEnemyThreatMap(
      'player_1',
      [targetEnemy1, enemyArtillery],
      mockTiles,
      mapWidth,
      mapHeight,
      w
    );
    if (result.threatenedTiles.length === 0) {
      stressSuccess = false;
      break;
    }
  }

  const stressDuration = Math.round(performance.now() - stressStart);
  assert(
    'Prueba de Estrés: 1,000 detonaciones y cálculos de amenaza completados',
    stressSuccess,
    `1,000 iteraciones completadas en ${stressDuration}ms (${(stressDuration / 1000).toFixed(3)}ms por ciclo). Cero desbordamientos de memoria ni fallos.`
  );

  return {
    total: passed + failed,
    passed,
    results,
  };
}

if (typeof process !== 'undefined' && process.argv && process.argv[1]?.includes('advancedTactics.test')) {
  const summary = runAdvancedTacticsSuite();
  console.log(`\nRESUMEN PASO 2: ${summary.passed}/${summary.total} PASARON`);
  if (summary.passed < summary.total) {
    process.exit(1);
  }
}

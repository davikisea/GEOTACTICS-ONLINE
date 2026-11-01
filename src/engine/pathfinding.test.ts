import { TacticalPathfindingEngine, TERRAIN_MOVEMENT_COSTS } from './pathfinding';
import { TacticalUnit, TerrainTile } from '../types';

// ============================================================================
// SUITE DE PRUEBAS UNITARIAS: TACTICAL PATHFINDING & A*
// ============================================================================

export interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
}

export function runPathfindingTests(): { total: number; passed: number; failed: number; results: TestResult[] } {
  const results: TestResult[] = [];

  function assert(condition: boolean, testName: string, failureMsg?: string) {
    if (condition) {
      results.push({ name: testName, passed: true });
    } else {
      results.push({ name: testName, passed: false, error: failureMsg || 'Falló la aserción' });
    }
  }

  // --- Helper para crear matriz homogénea ---
  function createGrid(width: number, height: number, defaultType: TerrainTile['type'] = 'plains'): TerrainTile[][] {
    return Array.from({ length: height }, (_, y) =>
      Array.from({ length: width }, (_, x) => ({
        x,
        y,
        type: defaultType,
        defenseStars: 1,
      }))
    );
  }

  // --- Helper para crear unidad básica ---
  function createTestUnit(overrides: Partial<TacticalUnit> = {}): TacticalUnit {
    return {
      id: 'test_unit_1',
      unitCode: 'infantry',
      displayName: 'Infantería de Prueba',
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

  // --------------------------------------------------------------------------
  // TEST 1: Infantería en Llanuras vs Montañas
  // --------------------------------------------------------------------------
  try {
    const grid = createGrid(5, 5, 'plains');
    // Poner una montaña en (1, 0)
    grid[0][1].type = 'mountain';

    const infantry = createTestUnit({ x: 0, y: 0, movementPoints: 3, movementType: 'foot' });
    const unitsMap = new Map<string, TacticalUnit>([[infantry.id, infantry]]);

    const reachable = TacticalPathfindingEngine.getReachableTiles({
      unit: infantry,
      tiles: grid,
      unitsMap,
      gridWidth: 5,
      gridHeight: 5,
    });

    const mountainCell = reachable.find(r => r.x === 1 && r.y === 0);
    assert(mountainCell !== undefined, 'Test 1: Infantería puede alcanzar una montaña');
    assert(mountainCell?.costSoFar === 2, 'Test 1: El coste de entrar a la montaña es 2 para infantería');
  } catch (err: any) {
    results.push({ name: 'Test 1: Infantería en Llanuras vs Montañas', passed: false, error: err.message });
  }

  // --------------------------------------------------------------------------
  // TEST 2: Tanque (Treads) no puede cruzar Montañas ni Ríos
  // --------------------------------------------------------------------------
  try {
    const grid = createGrid(5, 5, 'plains');
    grid[0][1].type = 'mountain';
    grid[1][0].type = 'river';

    const tank = createTestUnit({
      id: 'tank_1',
      unitCode: 'tank_light',
      movementType: 'treads',
      movementPoints: 6,
      x: 0,
      y: 0,
    });
    const unitsMap = new Map<string, TacticalUnit>([[tank.id, tank]]);

    const reachable = TacticalPathfindingEngine.getReachableTiles({
      unit: tank,
      tiles: grid,
      unitsMap,
      gridWidth: 5,
      gridHeight: 5,
    });

    const hasMountain = reachable.some(r => r.x === 1 && r.y === 0);
    const hasRiver = reachable.some(r => r.x === 0 && r.y === 1);

    assert(!hasMountain, 'Test 2: Tanque sobre orugas NO puede entrar a montañas (costo infinito)');
    assert(!hasRiver, 'Test 2: Tanque sobre orugas NO puede entrar a ríos sin puente');
  } catch (err: any) {
    results.push({ name: 'Test 2: Restricciones de terreno para Tanques', passed: false, error: err.message });
  }

  // --------------------------------------------------------------------------
  // TEST 3: Vehículo con ruedas (Recon) penalizado en bosque vs carretera
  // --------------------------------------------------------------------------
  try {
    const costForestWheels = TERRAIN_MOVEMENT_COSTS.forest.wheels;
    const costRoadWheels = TERRAIN_MOVEMENT_COSTS.road.wheels;

    assert(costForestWheels === 3, 'Test 3: Ruedas en bosque cuesta 3 puntos de movimiento');
    assert(costRoadWheels === 1, 'Test 3: Ruedas en carretera cuesta 1 punto de movimiento');
  } catch (err: any) {
    results.push({ name: 'Test 3: Penalización de ruedas', passed: false, error: err.message });
  }

  // --------------------------------------------------------------------------
  // TEST 4: Bloqueo de paso por unidad enemiga (A* busca ruta alternativa)
  // --------------------------------------------------------------------------
  try {
    const grid = createGrid(5, 5, 'plains');
    const playerUnit = createTestUnit({ id: 'p1_unit', ownerId: 'p1', x: 0, y: 1, movementPoints: 6 });
    // Enemigo bloquea directamente en (1, 1)
    const enemyUnit = createTestUnit({ id: 'e1_unit', ownerId: 'p2', x: 1, y: 1 });

    const unitsMap = new Map<string, TacticalUnit>([
      [playerUnit.id, playerUnit],
      [enemyUnit.id, enemyUnit],
    ]);

    // Calcular camino desde (0, 1) hasta (2, 1)
    const optimalPath = TacticalPathfindingEngine.findOptimalPath(0, 1, 2, 1, {
      unit: playerUnit,
      tiles: grid,
      unitsMap,
      gridWidth: 5,
      gridHeight: 5,
    });

    assert(optimalPath !== null, 'Test 4: Se encuentra ruta rodeando al enemigo');
    const passesThroughEnemy = optimalPath?.some(p => p.x === 1 && p.y === 1);
    assert(!passesThroughEnemy, 'Test 4: La ruta calculada no atraviesa la celda del enemigo bloqueada');
  } catch (err: any) {
    results.push({ name: 'Test 4: Bloqueo de paso por unidad enemiga', passed: false, error: err.message });
  }

  // --------------------------------------------------------------------------
  // TEST 5: Tránsito a través de unidad aliada permitido, pero no detención
  // --------------------------------------------------------------------------
  try {
    const grid = createGrid(5, 5, 'plains');
    const movingUnit = createTestUnit({ id: 'p1_moving', ownerId: 'p1', x: 0, y: 0, movementPoints: 4 });
    const allyUnit = createTestUnit({ id: 'p1_ally', ownerId: 'p1', x: 1, y: 0 });

    const unitsMap = new Map<string, TacticalUnit>([
      [movingUnit.id, movingUnit],
      [allyUnit.id, allyUnit],
    ]);

    const reachable = TacticalPathfindingEngine.getReachableTiles({
      unit: movingUnit,
      tiles: grid,
      unitsMap,
      gridWidth: 5,
      gridHeight: 5,
    });

    const canStopOnAlly = reachable.some(r => r.x === 1 && r.y === 0);
    const canPassBeyondAlly = reachable.some(r => r.x === 2 && r.y === 0);

    assert(!canStopOnAlly, 'Test 5: NO se puede terminar el movimiento sobre una unidad aliada');
    assert(canPassBeyondAlly, 'Test 5: SÍ se puede atravesar la celda del aliado para llegar más allá');
  } catch (err: any) {
    results.push({ name: 'Test 5: Tránsito entre aliados', passed: false, error: err.message });
  }

  // --------------------------------------------------------------------------
  // TEST 6: Precisión de reconstrucción de ruta A* (Longitud mínima)
  // --------------------------------------------------------------------------
  try {
    const grid = createGrid(6, 6, 'plains');
    const unit = createTestUnit({ x: 0, y: 0, movementPoints: 6 });
    const unitsMap = new Map<string, TacticalUnit>([[unit.id, unit]]);

    const path = TacticalPathfindingEngine.findOptimalPath(0, 0, 3, 2, {
      unit,
      tiles: grid,
      unitsMap,
      gridWidth: 6,
      gridHeight: 6,
    });

    // Distancia Manhattan = |3 - 0| + |2 - 0| = 5 pasos (6 nodos contando inicio)
    assert(path !== null, 'Test 6: Ruta A* encontrada exitosamente');
    assert(path?.length === 6, 'Test 6: La ruta contiene exactamente 6 nodos (5 pasos)');
    assert(path?.[0].x === 0 && path?.[0].y === 0, 'Test 6: El primer nodo es el inicio (0, 0)');
    assert(path?.[path.length - 1].x === 3 && path?.[path.length - 1].y === 2, 'Test 6: El último nodo es el objetivo (3, 2)');
  } catch (err: any) {
    results.push({ name: 'Test 6: Reconstrucción de ruta A*', passed: false, error: err.message });
  }

  // --------------------------------------------------------------------------
  // TEST 7: Penalización Meteorológica Canónica (Lluvia vs Despejado para Tanques)
  // --------------------------------------------------------------------------
  try {
    const grid = createGrid(8, 8, 'plains');
    const tank = createTestUnit({ id: 'tank_w', unitCode: 'tank_light', movementType: 'treads', movementPoints: 6 });
    const unitsMap = new Map<string, TacticalUnit>([[tank.id, tank]]);

    const reachableClear = TacticalPathfindingEngine.getReachableTiles({
      unit: tank,
      tiles: grid,
      unitsMap,
      gridWidth: 8,
      gridHeight: 8,
      weather: 'clear',
    });

    const reachableRain = TacticalPathfindingEngine.getReachableTiles({
      unit: tank,
      tiles: grid,
      unitsMap,
      gridWidth: 8,
      gridHeight: 8,
      weather: 'rain',
    });

    assert(reachableClear.length > reachableRain.length, 'Test 7: La lluvia reduce el rango de movimiento de los vehículos sobre orugas en llanura');
  } catch (err: any) {
    results.push({ name: 'Test 7: Penalización Meteorológica', passed: false, error: err.message });
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

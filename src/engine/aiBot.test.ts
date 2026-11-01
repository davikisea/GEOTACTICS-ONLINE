import { TacticalBotAI, BotGameState } from './aiBot';
import { TacticalUnit, TerrainTile } from '../types';

export interface BotTestResult {
  name: string;
  passed: boolean;
  error?: string;
}

export async function runBotTests(): Promise<{ total: number; passed: number; failed: number; results: BotTestResult[] }> {
  const results: BotTestResult[] = [];

  function assert(condition: boolean, testName: string, failureMsg?: string) {
    if (condition) {
      results.push({ name: testName, passed: true });
    } else {
      results.push({ name: testName, passed: false, error: failureMsg || 'Falló la aserción' });
    }
  }

  function createTile(x: number, y: number, type: TerrainTile['type'], ownerId: string | null = null, captureHp: number = 20): TerrainTile {
    return { x, y, type, defenseStars: type === 'mountain' || type === 'hq' ? 4 : 1, ownerId, captureHp };
  }

  function createUnit(overrides: Partial<TacticalUnit> = {}): TacticalUnit {
    return {
      id: 'bot_u1',
      unitCode: 'infantry',
      displayName: 'Infantería Bot',
      ownerId: 'p2',
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
  // TEST 1: El Bot prioriza la captura del Cuartel General (HQ)
  // --------------------------------------------------------------------------
  try {
    const grid: TerrainTile[][] = [
      [createTile(0, 0, 'plains'), createTile(1, 0, 'hq', 'p1', 10), createTile(2, 0, 'plains')],
      [createTile(0, 1, 'plains'), createTile(1, 1, 'plains'), createTile(2, 1, 'plains')],
    ];

    const botInfantry = createUnit({ id: 'bot_inf', x: 0, y: 0, movementPoints: 3, movementType: 'foot' });

    const state: BotGameState = {
      botPlayerId: 'p2',
      opponentPlayerId: 'p1',
      gridWidth: 3,
      gridHeight: 2,
      tiles: grid,
      units: [botInfantry],
      botFunds: 0,
    };

    const plan = TacticalBotAI.computeBotTurn(state, 'normal');
    const captureAction = plan.actions.find(a => a.actionType === 'MOVE_AND_CAPTURE');

    assert(captureAction !== undefined, 'Test 1: El bot decide capturar el HQ rival');
    assert(captureAction?.moveDestination?.x === 1 && captureAction?.moveDestination?.y === 0, 'Test 1: El destino es el HQ (1, 0)');
    assert((captureAction?.score ?? 0) >= 8000, 'Test 1: La puntuación del HQ supera los 8,000 puntos');
  } catch (err: any) {
    results.push({ name: 'Test 1: Prioridad de captura de HQ', passed: false, error: err.message });
  }

  // --------------------------------------------------------------------------
  // TEST 2: El Bot prioriza eliminar a un enemigo con baja vida
  // --------------------------------------------------------------------------
  try {
    const grid: TerrainTile[][] = [
      [createTile(0, 0, 'plains'), createTile(1, 0, 'plains'), createTile(2, 0, 'plains')],
      [createTile(0, 1, 'plains'), createTile(1, 1, 'plains'), createTile(2, 1, 'plains')],
    ];

    const botTank = createUnit({ id: 'bot_tank', unitCode: 'tank_light', movementType: 'treads', x: 0, y: 0, movementPoints: 3 });
    const weakEnemy = createUnit({ id: 'enemy_weak', unitCode: 'infantry', ownerId: 'p1', x: 1, y: 0, hp: 2 });

    const state: BotGameState = {
      botPlayerId: 'p2',
      opponentPlayerId: 'p1',
      gridWidth: 3,
      gridHeight: 2,
      tiles: grid,
      units: [botTank, weakEnemy],
      botFunds: 0,
    };

    const plan = TacticalBotAI.computeBotTurn(state, 'normal');
    const attackAction = plan.actions.find(a => a.actionType === 'MOVE_AND_ATTACK');

    assert(attackAction !== undefined, 'Test 2: El bot decide atacar a la unidad enemiga');
    assert(attackAction?.targetUnitId === 'enemy_weak', 'Test 2: El objetivo es el enemigo vulnerable');
  } catch (err: any) {
    results.push({ name: 'Test 2: Eliminación de enemigo vulnerable', passed: false, error: err.message });
  }

  // --------------------------------------------------------------------------
  // TEST 3: Producción en Fábrica según Fondos
  // --------------------------------------------------------------------------
  try {
    const grid: TerrainTile[][] = [
      [createTile(0, 0, 'factory', 'p2'), createTile(1, 0, 'plains'), createTile(2, 0, 'plains')],
    ];

    const botInfantry1 = createUnit({ id: 'inf1', ownerId: 'p2', x: 1, y: 0 });
    const botInfantry2 = createUnit({ id: 'inf2', ownerId: 'p2', x: 2, y: 0 });

    const stateRich: BotGameState = {
      botPlayerId: 'p2',
      opponentPlayerId: 'p1',
      gridWidth: 3,
      gridHeight: 1,
      tiles: grid,
      units: [botInfantry1, botInfantry2],
      botFunds: 18000, // Fondos para tanque mediano
    };

    const planRich = TacticalBotAI.computeBotTurn(stateRich, 'normal');
    const spawnAction = planRich.actions.find(a => a.actionType === 'SPAWN_UNIT');

    assert(spawnAction !== undefined, 'Test 3: El bot produce una unidad con fondos disponibles');
    assert(spawnAction?.spawnUnitCode === 'tank_medium', 'Test 3: Produce un tanque mediano con 18,000G');
  } catch (err: any) {
    results.push({ name: 'Test 3: Producción en Fábrica', passed: false, error: err.message });
  }

  // --------------------------------------------------------------------------
  // TEST 4: Ejecución Asíncrona Simulando Tiempos Naturales
  // --------------------------------------------------------------------------
  try {
    const grid: TerrainTile[][] = [[createTile(0, 0, 'plains')]];
    const unit = createUnit({ x: 0, y: 0 });

    const state: BotGameState = {
      botPlayerId: 'p2',
      opponentPlayerId: 'p1',
      gridWidth: 1,
      gridHeight: 1,
      tiles: grid,
      units: [unit],
      botFunds: 0,
    };

    let actionsReceived = 0;
    await TacticalBotAI.executeBotTurnAsync(
      state,
      'normal',
      () => {
        actionsReceived++;
      },
      10 // 10ms para el test
    );

    assert(actionsReceived >= 2, 'Test 4: Se despacharon todas las acciones en la secuencia asíncrona');
  } catch (err: any) {
    results.push({ name: 'Test 4: Ejecución Asíncrona', passed: false, error: err.message });
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

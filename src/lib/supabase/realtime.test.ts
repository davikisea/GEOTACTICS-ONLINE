import {
  MultiplayerStateManager,
  MultiplayerGameState,
  MoveUnitPayload,
  AttackUnitPayload,
  CaptureBuildingPayload,
  EndTurnPayload,
} from './realtime';
import { TacticalUnit, TerrainTile } from '../../types';

export interface RealtimeTestResult {
  name: string;
  passed: boolean;
  error?: string;
}

export function runRealtimeTests(): { total: number; passed: number; failed: number; results: RealtimeTestResult[] } {
  const results: RealtimeTestResult[] = [];

  function assert(condition: boolean, testName: string, failureMsg?: string) {
    if (condition) {
      results.push({ name: testName, passed: true });
    } else {
      results.push({ name: testName, passed: false, error: failureMsg || 'Falló la aserción' });
    }
  }

  function createUnit(overrides: Partial<TacticalUnit> = {}): TacticalUnit {
    return {
      id: 'unit_1',
      unitCode: 'tank_light',
      displayName: 'Tanque Ligero',
      ownerId: 'p1',
      x: 0,
      y: 0,
      hp: 10,
      maxHp: 10,
      ammo: 9,
      fuel: 99,
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
      ...overrides,
    };
  }

  function createTile(x: number, y: number, type: TerrainTile['type'], ownerId: string | null = null, captureHp: number = 20): TerrainTile {
    return { x, y, type, defenseStars: 1, ownerId, captureHp };
  }

  // --------------------------------------------------------------------------
  // TEST 1: Aplicación determinista de MOVE_UNIT
  // --------------------------------------------------------------------------
  try {
    const unit1 = createUnit({ id: 'u1', x: 1, y: 1, hasMoved: false });
    const initialState: MultiplayerGameState = {
      matchId: 'match_123',
      currentTurnPlayerId: 'p1',
      turnNumber: 1,
      lastSequenceId: 0,
      units: new Map([['u1', unit1]]),
      tiles: [[createTile(0, 0, 'plains')]],
      playerFunds: { p1: 1000, p2: 1000 },
      isSynchronized: true,
    };

    const movePayload: MoveUnitPayload = {
      matchId: 'match_123',
      senderId: 'p1',
      sequenceId: 1,
      timestamp: Date.now(),
      type: 'MOVE_UNIT',
      unitId: 'u1',
      destination: { x: 3, y: 2 },
      path: [{ x: 1, y: 1 }, { x: 2, y: 1 }, { x: 3, y: 1 }, { x: 3, y: 2 }],
    };

    const nextState = MultiplayerStateManager.applyRemoteAction(movePayload, initialState);
    const movedUnit = nextState.units.get('u1');

    assert(movedUnit?.x === 3 && movedUnit?.y === 2, 'Test 1: La posición se actualiza a (3, 2)');
    assert(movedUnit?.hasMoved === true, 'Test 1: La unidad queda marcada como movida');
    assert(nextState.lastSequenceId === 1, 'Test 1: El lastSequenceId se actualiza');
  } catch (err: any) {
    results.push({ name: 'Test 1: MOVE_UNIT', passed: false, error: err.message });
  }

  // --------------------------------------------------------------------------
  // TEST 2: Aplicación determinista de ATTACK_UNIT con eliminación
  // --------------------------------------------------------------------------
  try {
    const attacker = createUnit({ id: 'att', hp: 10, ownerId: 'p1' });
    const defender = createUnit({ id: 'def', hp: 4, ownerId: 'p2' });

    const state: MultiplayerGameState = {
      matchId: 'match_123',
      currentTurnPlayerId: 'p1',
      turnNumber: 1,
      lastSequenceId: 1,
      units: new Map([['att', attacker], ['def', defender]]),
      tiles: [[createTile(0, 0, 'plains')]],
      playerFunds: { p1: 1000, p2: 1000 },
      isSynchronized: true,
    };

    const attackPayload: AttackUnitPayload = {
      matchId: 'match_123',
      senderId: 'p1',
      sequenceId: 2,
      timestamp: Date.now(),
      type: 'ATTACK_UNIT',
      attackerId: 'att',
      targetId: 'def',
      attackerDamageDealt: 4,
      defenderHpRemaining: 0, // Aniquilado
      counterDamageDealt: 0,
      attackerHpRemaining: 10,
    };

    const nextState = MultiplayerStateManager.applyRemoteAction(attackPayload, state);

    assert(!nextState.units.has('def'), 'Test 2: El defensor aniquilado se elimina del mapa');
    assert(nextState.units.get('att')?.hasActed === true, 'Test 2: El atacante queda marcado como que ha actuado');
  } catch (err: any) {
    results.push({ name: 'Test 2: ATTACK_UNIT', passed: false, error: err.message });
  }

  // --------------------------------------------------------------------------
  // TEST 3: Aplicación determinista de CAPTURE_BUILDING
  // --------------------------------------------------------------------------
  try {
    const infantry = createUnit({ id: 'inf_cap', unitCode: 'infantry', ownerId: 'p2', x: 0, y: 0 });
    const city = createTile(0, 0, 'city', null, 10);

    const state: MultiplayerGameState = {
      matchId: 'match_123',
      currentTurnPlayerId: 'p2',
      turnNumber: 2,
      lastSequenceId: 3,
      units: new Map([['inf_cap', infantry]]),
      tiles: [[city]],
      playerFunds: { p1: 1000, p2: 1000 },
      isSynchronized: true,
    };

    const capturePayload: CaptureBuildingPayload = {
      matchId: 'match_123',
      senderId: 'p2',
      sequenceId: 4,
      timestamp: Date.now(),
      type: 'CAPTURE_BUILDING',
      unitId: 'inf_cap',
      propertyPosition: { x: 0, y: 0 },
      previousCaptureHp: 10,
      remainingCaptureHp: 0,
      isCaptured: true,
      newOwnerId: 'p2',
    };

    const nextState = MultiplayerStateManager.applyRemoteAction(capturePayload, state);
    const updatedTile = nextState.tiles[0][0];

    assert(updatedTile.ownerId === 'p2', 'Test 3: La propiedad pasa a pertenecer al jugador 2');
    assert(updatedTile.captureHp === 20, 'Test 3: Los puntos de captura se restablecen a 20 para su defensa');
  } catch (err: any) {
    results.push({ name: 'Test 3: CAPTURE_BUILDING', passed: false, error: err.message });
  }

  // --------------------------------------------------------------------------
  // TEST 4: Cambio de turno (END_TURN) y liquidación económica
  // --------------------------------------------------------------------------
  try {
    const unitP2 = createUnit({ id: 'u_p2', ownerId: 'p2', hasMoved: true, hasActed: true });
    const p2City = createTile(0, 0, 'city', 'p2', 20);

    const state: MultiplayerGameState = {
      matchId: 'match_123',
      currentTurnPlayerId: 'p1',
      turnNumber: 1,
      lastSequenceId: 5,
      units: new Map([['u_p2', unitP2]]),
      tiles: [[p2City]],
      playerFunds: { p1: 1000, p2: 1500 },
      isSynchronized: true,
    };

    const endTurnPayload: EndTurnPayload = {
      matchId: 'match_123',
      senderId: 'p1',
      sequenceId: 6,
      timestamp: Date.now(),
      type: 'END_TURN',
      nextPlayerId: 'p2',
      turnNumber: 2,
    };

    const nextState = MultiplayerStateManager.applyRemoteAction(endTurnPayload, state);

    assert(nextState.currentTurnPlayerId === 'p2', 'Test 4: El turno pasa a p2');
    assert(nextState.turnNumber === 2, 'Test 4: El número de turno avanza a 2');
    assert(nextState.units.get('u_p2')?.hasMoved === false, 'Test 4: Tropas de p2 reactivadas para mover');
    assert(nextState.playerFunds['p2'] === 2500, 'Test 4: Fondos de p2 incrementan en +1000G por su ciudad (1500 -> 2500)');
  } catch (err: any) {
    results.push({ name: 'Test 4: END_TURN', passed: false, error: err.message });
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

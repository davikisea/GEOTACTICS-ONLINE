import {
  AutonomousTurnOrchestrator,
  GameMode,
  MatchFormat,
  MatchEndSummary
} from './autonomousOrchestrator';
import { TacticalUnit, TerrainTile } from '../types';

export interface OrchestratorTestResult {
  name: string;
  passed: boolean;
  message: string;
  durationMs?: number;
}

export async function runAutonomousOrchestratorSuite(): Promise<{
  total: number;
  passed: number;
  failed: number;
  results: OrchestratorTestResult[];
  stressReport: {
    totalBotVsBotMatchesSimulated: number;
    totalTurnsSimulated: number;
    avgTurnComputeTimeMs: number;
    allInvariantsMaintained: boolean;
  };
}> {
  console.log('==============================================================================');
  console.log('EJECUTANDO SUITE: ORQUESTADOR DE TURNOS AUTÓNOMO & MOTOR PVE');
  console.log('==============================================================================\n');

  const results: OrchestratorTestResult[] = [];
  let passed = 0;
  let failed = 0;

  function assert(desc: string, condition: boolean, detail: string = '', durationMs?: number) {
    if (condition) {
      results.push({ name: desc, passed: true, message: detail, durationMs });
      passed++;
    } else {
      results.push({ name: desc, passed: false, message: detail || 'Aserción fallida', durationMs });
      failed++;
    }
  }

  function createTestGrid(): TerrainTile[][] {
    return [
      [
        { x: 0, y: 0, type: 'hq', defenseStars: 4, ownerId: 'p1', captureHp: 20 },
        { x: 1, y: 0, type: 'factory', defenseStars: 3, ownerId: 'p1', captureHp: 20 },
        { x: 2, y: 0, type: 'road', defenseStars: 0, ownerId: null },
        { x: 3, y: 0, type: 'plains', defenseStars: 1, ownerId: null },
      ],
      [
        { x: 0, y: 1, type: 'city', defenseStars: 2, ownerId: null, captureHp: 20 },
        { x: 1, y: 1, type: 'plains', defenseStars: 1, ownerId: null },
        { x: 2, y: 1, type: 'forest', defenseStars: 2, ownerId: null },
        { x: 3, y: 1, type: 'plains', defenseStars: 1, ownerId: null },
      ],
      [
        { x: 0, y: 2, type: 'plains', defenseStars: 1, ownerId: null },
        { x: 1, y: 2, type: 'city', defenseStars: 2, ownerId: null, captureHp: 20 },
        { x: 2, y: 2, type: 'factory', defenseStars: 3, ownerId: 'p2', captureHp: 20 },
        { x: 3, y: 2, type: 'hq', defenseStars: 4, ownerId: 'p2', captureHp: 20 },
      ],
    ];
  }

  function createTestUnits(): TacticalUnit[] {
    return [
      {
        id: 'p1_inf',
        unitCode: 'infantry',
        displayName: 'Infantería P1',
        ownerId: 'p1',
        x: 0,
        y: 1,
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
      },
      {
        id: 'p2_tank',
        unitCode: 'tank_light',
        displayName: 'Tanque Ligero Bot',
        ownerId: 'p2',
        x: 2,
        y: 2,
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
      },
    ];
  }

  // --------------------------------------------------------------------------
  // TEST 1: Configuración de Formatos (Blitz Skirmish vs Grand Campaign)
  // --------------------------------------------------------------------------
  try {
    const blitz = new AutonomousTurnOrchestrator(createTestGrid(), createTestUnits(), {
      matchFormat: 'blitz_skirmish',
      initialFunds: { p1: 1000, p2: 1000 },
    });

    const campaign = new AutonomousTurnOrchestrator(createTestGrid(), createTestUnits(), {
      matchFormat: 'grand_campaign',
      initialFunds: { p1: 1000, p2: 1000 },
    });

    assert(
      'Test 1.1: Blitz Skirmish aplica +2,000G de bono inicial',
      blitz.getPlayerFunds().p1 === 3000 && blitz.getPlayerFunds().p2 === 3000,
      `Fondos Blitz: P1=${blitz.getPlayerFunds().p1}G`
    );

    assert(
      'Test 1.2: Grand Campaign mantiene fondos estándar iniciales',
      campaign.getPlayerFunds().p1 === 1000 && campaign.getPlayerFunds().p2 === 1000,
      `Fondos Campaign: P1=${campaign.getPlayerFunds().p1}G`
    );
  } catch (err: any) {
    assert('Test 1: Error en configuración de formatos', false, err.message);
  }

  // --------------------------------------------------------------------------
  // TEST 2: Transición de Turnos y Economía Canónica
  // --------------------------------------------------------------------------
  try {
    const orch = new AutonomousTurnOrchestrator(createTestGrid(), createTestUnits(), {
      gameMode: 'hotseat_2p',
      matchFormat: 'blitz_skirmish',
    });

    const initialP2Funds = orch.getPlayerFunds().p2;
    await orch.endTurn({ botStepDelayMs: 0 });

    assert(
      'Test 2.1: El turno cambia exitosamente a p2',
      orch.getCurrentTurn() === 'p2',
      `Turno actual: ${orch.getCurrentTurn()}`
    );

    // En el grid de prueba, p2 posee 1 factory y 1 hq = 2 sedes. En Blitz (x2), 2 * 2000 = +4000G
    const currentP2Funds = orch.getPlayerFunds().p2;
    assert(
      'Test 2.2: P2 recibe ingresos multiplicados de Blitz ($2000/sede)',
      currentP2Funds === initialP2Funds + 4000,
      `Fondos calculados: ${currentP2Funds} (Esperado: ${initialP2Funds + 4000})`
    );
  } catch (err: any) {
    assert('Test 2: Transición de turnos', false, err.message);
  }

  // --------------------------------------------------------------------------
  // TEST 3: Ejecución de Turno de IA en Modo vs_bot
  // --------------------------------------------------------------------------
  try {
    const orch = new AutonomousTurnOrchestrator(createTestGrid(), createTestUnits(), {
      gameMode: 'vs_bot',
      botDifficulty: 'normal',
    });

    let botPlanEventFired = false;
    let actionsExecutedCount = 0;

    orch.subscribe(evt => {
      if (evt.type === 'BOT_PLAN_COMPUTED') {
        botPlanEventFired = true;
      }
      if (evt.type === 'ACTION_EXECUTED') {
        actionsExecutedCount++;
      }
    });

    // P1 termina su turno -> La IA debe tomar el control, actuar y devolver el turno a P1
    await orch.endTurn({ botStepDelayMs: 0 });

    assert(
      'Test 3.1: La IA computó su plan táctico automáticamente',
      botPlanEventFired,
      `Evento BOT_PLAN_COMPUTED disparado`
    );

    assert(
      'Test 3.2: La IA ejecutó acciones válidas de forma autónoma',
      actionsExecutedCount > 0,
      `Acciones ejecutadas: ${actionsExecutedCount}`
    );

    assert(
      'Test 3.3: Tras completar sus maniobras, la IA retornó el control a P1',
      orch.getCurrentTurn() === 'p1' && orch.getTurnNumber() === 2,
      `Turno resultante: ${orch.getCurrentTurn()}, Ronda: ${orch.getTurnNumber()}`
    );
  } catch (err: any) {
    assert('Test 3: Ejecución de turno de IA', false, err.message);
  }

  // --------------------------------------------------------------------------
  // TEST 4: Detección Inmediata de Victoria por Captura de HQ
  // --------------------------------------------------------------------------
  try {
    const grid = createTestGrid();
    // Colocar el HQ de P1 a 5 HP de captura
    grid[0][0].captureHp = 5;

    // Infantería de P2 lista sobre el HQ de P1
    const invadingUnits: TacticalUnit[] = [
      {
        id: 'invader_inf',
        unitCode: 'infantry',
        displayName: 'Infantería Asaltante',
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
      },
    ];

    const orch = new AutonomousTurnOrchestrator(grid, invadingUnits, {
      gameMode: 'vs_bot',
      botDifficulty: 'hard',
    });

    let matchFinishedFired = false;
    let finishSummary: MatchEndSummary | null = null;

    orch.subscribe(evt => {
      if (evt.type === 'MATCH_FINISHED') {
        matchFinishedFired = true;
        finishSummary = evt.summary;
      }
    });

    // P1 concluye su turno -> P2 actúa y captura el HQ
    await orch.endTurn({ botStepDelayMs: 0 });

    assert(
      'Test 4.1: Victoria por decapitación de HQ detectada',
      matchFinishedFired && orch.getIsMatchOver(),
      `isMatchOver=${orch.getIsMatchOver()}`
    );

    assert(
      'Test 4.2: Resumen de partida adjudicado correctamente a P2',
      finishSummary?.winner === 'p2' && finishSummary?.reason === 'hq_captured',
      `Ganador: ${finishSummary?.winner}, Razón: ${finishSummary?.reason}`
    );
  } catch (err: any) {
    assert('Test 4: Victoria por HQ', false, err.message);
  }

  // --------------------------------------------------------------------------
  // TEST 5: Telemetría y Detección de Tilt Factor
  // --------------------------------------------------------------------------
  try {
    const orch = new AutonomousTurnOrchestrator(createTestGrid(), createTestUnits(), {
      gameMode: 'hotseat_2p',
    });

    // Forzar en telemetría pérdida de unidades y turnos ultrarrápidos (< 8 segundos)
    const telemetry = orch.getTelemetry();
    telemetry.p1UnitsLost = 3;
    telemetry.p1TurnDurationsSec = [5, 6, 7];

    await orch.endTurn({ botStepDelayMs: 0 });

    const updatedTelemetry = orch.getTelemetry();
    assert(
      'Test 5.1: El Tilt Index escala ante turnos apresurados (<10s) con bajas',
      updatedTelemetry.tiltIndex > 0,
      `Tilt Index registrado: ${updatedTelemetry.tiltIndex}/100`
    );
  } catch (err: any) {
    assert('Test 5: Telemetría de Tilt', false, err.message);
  }

  // --------------------------------------------------------------------------
  // TEST 6: PRUEBA DE ESTRÉS MASIVA (Simulación Headless Bot vs Bot)
  // --------------------------------------------------------------------------
  const stressStartTime = performance.now();
  let totalTurns = 0;
  let matchesCompleted = 0;
  let allInvariantsOk = true;

  try {
    const MATCHES_TO_SIMULATE = 5;

    for (let i = 0; i < MATCHES_TO_SIMULATE; i++) {
      const orch = new AutonomousTurnOrchestrator(createTestGrid(), createTestUnits(), {
        gameMode: 'bot_vs_bot',
        matchFormat: 'blitz_skirmish',
        botDifficulty: i % 2 === 0 ? 'hard' : 'normal',
      });

      // Simular hasta 15 turnos completos o fin de partida
      let maxSafety = 15;
      while (!orch.getIsMatchOver() && maxSafety > 0) {
        await orch.endTurn({ botStepDelayMs: 0 });
        totalTurns++;
        maxSafety--;

        // Validar invariantes: sin fondos negativos
        const funds = orch.getPlayerFunds();
        if (funds.p1 < 0 || funds.p2 < 0) {
          allInvariantsOk = false;
        }

        // Validar invariantes: sin unidades en celdas idénticas (colisión)
        const units = orch.getUnits();
        const positions = new Set<string>();
        for (const u of units) {
          const key = `${u.x},${u.y}`;
          if (positions.has(key)) {
            allInvariantsOk = false;
          }
          positions.add(key);
        }
      }
      matchesCompleted++;
    }

    const stressDuration = performance.now() - stressStartTime;
    const avgComputeMs = totalTurns > 0 ? Number((stressDuration / totalTurns).toFixed(3)) : 0;

    assert(
      `Test 6.1: Simulación de ${MATCHES_TO_SIMULATE} partidas completas Bot vs Bot terminada con éxito`,
      matchesCompleted === MATCHES_TO_SIMULATE,
      `Partidas: ${matchesCompleted}, Turnos totales: ${totalTurns}, Tiempo total: ${stressDuration.toFixed(1)}ms`
    );

    assert(
      'Test 6.2: Rendimiento óptimo en cálculo de IA (< 10ms por turno completo)',
      avgComputeMs < 10,
      `Tiempo promedio por turno: ${avgComputeMs} ms`
    );

    assert(
      'Test 6.3: Integridad de invariantes matemáticas (0 fondos negativos, 0 colisiones)',
      allInvariantsOk,
      `Invariantes 100% verificadas`
    );
  } catch (err: any) {
    assert('Test 6: Prueba de estrés masiva', false, err.message);
  }

  const stressDurationTotal = performance.now() - stressStartTime;

  return {
    total: passed + failed,
    passed,
    failed,
    results,
    stressReport: {
      totalBotVsBotMatchesSimulated: matchesCompleted,
      totalTurnsSimulated: totalTurns,
      avgTurnComputeTimeMs: totalTurns > 0 ? Number((stressDurationTotal / totalTurns).toFixed(3)) : 0,
      allInvariantsMaintained: allInvariantsOk,
    },
  };
}

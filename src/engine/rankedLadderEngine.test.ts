/**
 * ==============================================================================
 * PRUEBAS UNITARIAS: MOTOR DE LADDER CLASIFICATORIO, SISTEMA ELO Y ARENAS
 * ==============================================================================
 * Proyecto: Tactical Command: Wars of Legacy
 * Especificación Canónica Calibrada: docs/PROPOSAL_DB_ARCHITECTURE.md (v2.0.0-CALIBRATED)
 * Base de Datos: supabase/migrations/20261031000014_unified_matchmaking_and_ranked_ladder.sql
 */

import {
  RankedLadderEngine,
  RANKED_ARENAS,
  RankedArena,
} from './rankedLadderEngine';

export interface RankedLadderTestResult {
  name: string;
  passed: boolean;
  message: string;
  details?: any;
}

export function runRankedLadderTests(): {
  total: number;
  passed: number;
  failed: number;
  results: RankedLadderTestResult[];
} {
  const results: RankedLadderTestResult[] = [];

  const record = (name: string, fn: () => void) => {
    try {
      fn();
      results.push({ name, passed: true, message: 'Validación superada con éxito' });
    } catch (e: any) {
      results.push({ name, passed: false, message: e.message || String(e) });
    }
  };

  // 1. Mapeo de Arenas y Umbrales
  record('Escala Maestra: 10 Arenas Progresivas + 3 Divisiones Legendarias', () => {
    if (RANKED_ARENAS.length !== 13) {
      throw new Error(`Se esperaban 13 arenas/ligas, obtenidas: ${RANKED_ARENAS.length}`);
    }
    if (RANKED_ARENAS[0].id !== 'arena_1') throw new Error('Arena inicial debe ser arena_1');
    if (RANKED_ARENAS[9].id !== 'arena_10') throw new Error('Arena 10 debe ser arena_10');
    if (RANKED_ARENAS[10].id !== 'league_1') throw new Error('Liga inicial debe ser league_1');
    if (RANKED_ARENAS[12].id !== 'league_3') throw new Error('Liga final debe ser league_3');
  });

  record('Asignación de Arenas por Trofeos y Hitos Clave', () => {
    const a1 = RankedLadderEngine.getArenaForTrophies(250);
    if (a1.id !== 'arena_1') throw new Error(`Esperado arena_1, obtenido: ${a1.id}`);

    const a6 = RankedLadderEngine.getArenaForTrophies(2000);
    if (a6.id !== 'arena_6' || a6.lossMultiplier !== 1.0) {
      throw new Error(`Arena 6 debe ser suma cero estricta (1.0x), obtenido: ${a6.lossMultiplier}`);
    }
    if (!a6.unlockMilestone.includes('MERCADO GLOBAL P2P')) {
      throw new Error('Arena 6 debe desbloquear el Mercado Global P2P');
    }

    const a9 = RankedLadderEngine.getArenaForTrophies(3200);
    if (a9.id !== 'arena_9' || a9.kFactor !== 24) {
      throw new Error(`Arena 9 debe tener factor K=24, obtenido: ${a9.kFactor}`);
    }

    const l1 = RankedLadderEngine.getArenaForTrophies(4000);
    if (l1.id !== 'league_1') throw new Error(`Esperado league_1 a 4000 trofeos, obtenido: ${l1.id}`);
  });

  // 2. Elo Delta y Factor K Dinámico
  record('Elo Delta: Arena 1 con Amortiguación Total (+20 Victoria / 0 Derrota)', () => {
    const win = RankedLadderEngine.calculateEloDelta(200, 200, 1, true);
    const loss = RankedLadderEngine.calculateEloDelta(200, 200, 1, false);
    if (win !== 20) throw new Error(`Victoria en Arena 1 debe otorgar +20, obtenido: ${win}`);
    if (loss !== 0) throw new Error(`Derrota en Arena 1 debe restar 0, obtenido: ${loss}`);
  });

  record('Elo Delta: Arena 3 con Inyección Neta (+18 Victoria / -11 Derrota)', () => {
    const win = RankedLadderEngine.calculateEloDelta(1000, 1000, 3, true);
    const loss = RankedLadderEngine.calculateEloDelta(1000, 1000, 3, false);
    if (win !== 18) throw new Error(`Victoria en Arena 3 debe otorgar +18, obtenido: ${win}`);
    if (loss !== -11) throw new Error(`Derrota en Arena 3 debe restar -11, obtenido: ${loss}`);
  });

  record('Elo Delta: Arena 6 Suma Cero Estricta (+14 Victoria / -14 Derrota)', () => {
    const win = RankedLadderEngine.calculateEloDelta(2100, 2100, 6, true);
    const loss = RankedLadderEngine.calculateEloDelta(2100, 2100, 6, false);
    if (win !== 14) throw new Error(`Victoria en Arena 6 debe otorgar +14, obtenido: ${win}`);
    if (loss !== -14) throw new Error(`Derrota en Arena 6 debe restar -14, obtenido: ${loss}`);
    if (win + loss !== 0) throw new Error('Arena 6 debe tener suma neta exactamente igual a 0');
  });

  record('Elo Delta: Ajuste Logístico por Disparidad de Elo (Underdog vs Favorito)', () => {
    const upsetWin = RankedLadderEngine.calculateEloDelta(2000, 2200, 6, true);
    if (upsetWin <= 14) throw new Error(`Victoria como underdog debe superar +14, obtenido: ${upsetWin}`);

    const underdogLoss = RankedLadderEngine.calculateEloDelta(2000, 2200, 6, false);
    if (Math.abs(underdogLoss) >= 14) {
      throw new Error(`Derrota como underdog debe restar menos de -14, obtenido: ${underdogLoss}`);
    }
  });

  // 3. Escudo Dinámico de Descenso
  record('Descent Shield: Trophy Gate Absoluto en Arenas 1 a 3', () => {
    const res = RankedLadderEngine.applyDescentShield(380, 0, true);
    if (res.demotedToPreviousArena) throw new Error('No debe democionar en Arenas 1-3');
  });

  record('Descent Shield: 3 Cargas Amortiguadoras en Arena 4 antes de Descender', () => {
    const s1 = RankedLadderEngine.applyDescentShield(1200, 3, true);
    if (s1.remainingShieldCharges !== 2 || s1.demotedToPreviousArena) throw new Error('Carga 1 no consumida correctamente');

    const s2 = RankedLadderEngine.applyDescentShield(1200, s1.remainingShieldCharges, true);
    if (s2.remainingShieldCharges !== 1 || s2.demotedToPreviousArena) throw new Error('Carga 2 no consumida correctamente');

    const s3 = RankedLadderEngine.applyDescentShield(1200, s2.remainingShieldCharges, true);
    if (s3.remainingShieldCharges !== 0 || s3.demotedToPreviousArena) throw new Error('Carga 3 no consumida correctamente');

    const demotion = RankedLadderEngine.applyDescentShield(1200, 0, true);
    if (!demotion.demotedToPreviousArena || demotion.newTrophies !== 1170) {
      throw new Error(`Descenso amortiguado debe fijar 1170 trofeos, obtenido: ${demotion.newTrophies}`);
    }
  });

  // 4. Compresión Estacional
  record('Season Reset: Protección hasta 3,200 trofeos y Compresión del 30%/50%', () => {
    if (RankedLadderEngine.calculateSeasonReset(2500) !== 2500) {
      throw new Error('Bajo 3,200 trofeos no debe haber compresión');
    }
    // 3600 -> 3200 + 400 * 0.7 = 3480
    const r3600 = RankedLadderEngine.calculateSeasonReset(3600);
    if (r3600 !== 3480) throw new Error(`Compresión a 3,600 errónea, esperada 3,480, obtenida: ${r3600}`);

    // 4600 -> 4000 + 600 * 0.5 = 4300
    const r4600 = RankedLadderEngine.calculateSeasonReset(4600);
    if (r4600 !== 4300) throw new Error(`Compresión a 4,600 errónea, esperada 4,300, obtenida: ${r4600}`);
  });

  // 5. Ventanas de Búsqueda de Colas Multi-Modo
  record('Multi-Queue Windows: Expansión Progresiva y Timeouts Exactos', () => {
    const blitzEarly = RankedLadderEngine.calculateQueueSearchWindow(5, 'blitz_skirmish');
    if (blitzEarly.trophyWindow !== 150 || blitzEarly.isTimeout) throw new Error('Ventana Blitz 5s errónea');

    const blitzTimeout = RankedLadderEngine.calculateQueueSearchWindow(32, 'blitz_skirmish');
    if (!blitzTimeout.isTimeout) throw new Error('Blitz debe dar timeout a los 30s');

    const campTimeout = RankedLadderEngine.calculateQueueSearchWindow(65, 'grand_campaign');
    if (!campTimeout.isTimeout) throw new Error('Campaign debe dar timeout a los 60s');
  });

  // 6. Cofres y Recompensas
  record('Cofres: Duración de Desbloqueo y Escalado por Arena Tier', () => {
    if (RankedLadderEngine.getChestUnlockDurationSeconds('wood') !== 10800) throw new Error('Cofre madera != 3h');
    if (RankedLadderEngine.getChestUnlockDurationSeconds('legendary') !== 86400) throw new Error('Cofre legendario != 24h');

    const a1Wood = RankedLadderEngine.calculateChestRewards('wood', 1);
    if (a1Wood.credits !== 450 || a1Wood.blueprints !== 45) throw new Error('Cofre madera A1 erróneo');

    const a5Iron = RankedLadderEngine.calculateChestRewards('iron', 5);
    // 1400 * 1.6 = 2240, 140 * 1.6 = 224, steel = 5
    if (a5Iron.credits !== 2240 || a5Iron.blueprints !== 224 || a5Iron.steel !== 5) {
      throw new Error(`Cofre hierro A5 erróneo: ${JSON.stringify(a5Iron)}`);
    }
  });

  const total = results.length;
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;

  return { total, passed, failed, results };
}

// Bloque Jest / Vitest
if (typeof describe !== 'undefined') {
  describe('Motor de Ladder Clasificatorio, Sistema Elo y Arenas (RankedLadderEngine)', () => {
    const suite = runRankedLadderTests();
    for (const testCase of suite.results) {
      it(testCase.name, () => {
        if (!testCase.passed) {
          throw new Error(testCase.message);
        }
      });
    }
  });
}

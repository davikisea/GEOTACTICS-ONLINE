/**
 * ==============================================================================
 * SUITE DE PRUEBAS UNITARIAS: LADDER ASIMÉTRICO, TOURNAMENT CAP, NEAR-MISS Y TILT
 * ==============================================================================
 * Cobertura de especificaciones:
 * - docs/01_MASTER_GAME_DESIGN_DOCUMENT.md §4
 * - docs/02_MASTER_METAGAME_INDUSTRY_ECONOMY.md §4 & §6
 * - docs/03_MASTER_COMMANDERS_BARK_AND_SOCIAL.md §3
 * - docs/04_MASTER_DATABASE_AND_SECURITY_SPEC.md §3.8 & §3.9
 */

import {
  AsymmetricLadderEngine,
  UNIT_PROGRESSION_TABLE
} from './asymmetricLadderEngine';

export interface AsymmetricLadderTestResult {
  name: string;
  passed: boolean;
  message: string;
  details?: any;
}

export function runAsymmetricLadderTests(): {
  total: number;
  passed: number;
  failed: number;
  results: AsymmetricLadderTestResult[];
} {
  const results: AsymmetricLadderTestResult[] = [];

  const record = (name: string, fn: () => void) => {
    try {
      fn();
      results.push({ name, passed: true, message: 'Validación superada con éxito' });
    } catch (e: any) {
      results.push({ name, passed: false, message: e.message || String(e) });
    }
  };

  // 1. Escalado Estadístico y Cap de Torneo (Nivel 11)
  record('Bifurcación Competitiva: Escalado asintótico (+1.2% N1-11, +0.5% N12-15) y Cap forzoso a Nivel 11 en Torneos', () => {
    // Ladder Diario (Modo Normal)
    const multL1 = AsymmetricLadderEngine.calculateStatMultiplier(1, false);
    const multL5 = AsymmetricLadderEngine.calculateStatMultiplier(5, false);
    const multL11 = AsymmetricLadderEngine.calculateStatMultiplier(11, false);
    const multL15 = AsymmetricLadderEngine.calculateStatMultiplier(15, false);

    if (multL1 !== 1.0) throw new Error(`Nivel 1 debe tener multiplicador 1.0, obtenido: ${multL1}`);
    if (multL5 !== 1.048) throw new Error(`Nivel 5 debe tener multiplicador 1.048, obtenido: ${multL5}`);
    if (multL11 !== 1.12) throw new Error(`Nivel 11 debe tener multiplicador 1.12, obtenido: ${multL11}`);
    if (multL15 !== 1.14) throw new Error(`Nivel 15 debe tener multiplicador 1.14, obtenido: ${multL15}`);

    // Torneo Oficial Esports (Cap a Nivel 11)
    const tourneyL5 = AsymmetricLadderEngine.calculateStatMultiplier(5, true);
    const tourneyL11 = AsymmetricLadderEngine.calculateStatMultiplier(11, true);
    const tourneyL15 = AsymmetricLadderEngine.calculateStatMultiplier(15, true);

    if (tourneyL5 !== 1.048) throw new Error(`Torneo Nivel 5 debe ser 1.048, obtenido: ${tourneyL5}`);
    if (tourneyL11 !== 1.12) throw new Error(`Torneo Nivel 11 debe ser 1.12, obtenido: ${tourneyL11}`);
    if (tourneyL15 !== 1.12) throw new Error(`Torneo Nivel 15 debe estar capeado a Nivel 11 (1.12), obtenido: ${tourneyL15}`);
  });

  // 2. Cálculo de APL de Mazo y Emparejamiento con Tolerancia Delta <= 1.5
  record('Matchmaking Ladder: Cálculo de APL de Mazo y límite de disparidad (Delta APL <= 1.5)', () => {
    const deckA = [9, 9, 10, 10, 11, 11, 10, 10]; // Promedio = 10.0
    const deckB = [11, 11, 12, 11, 11, 12, 11, 11]; // Promedio = 11.25
    const deckC = [13, 13, 14, 14, 13, 13, 14, 14]; // Promedio = 13.5

    const aplA = AsymmetricLadderEngine.calculateDeckAPL(deckA);
    const aplB = AsymmetricLadderEngine.calculateDeckAPL(deckB);
    const aplC = AsymmetricLadderEngine.calculateDeckAPL(deckC);

    if (aplA !== 10.0) throw new Error(`APL mazo A esperado 10.0, obtenido: ${aplA}`);
    if (aplB !== 11.25) throw new Error(`APL mazo B esperado 11.25, obtenido: ${aplB}`);
    if (aplC !== 13.5) throw new Error(`APL mazo C esperado 13.5, obtenido: ${aplC}`);

    // Emparejamiento A vs B: Delta = 1.25 <= 1.5 -> VÁLIDO
    const matchAB = AsymmetricLadderEngine.validateLadderMatchmaking(aplA, aplB);
    if (!matchAB.canMatch || matchAB.deltaAPL !== 1.25) {
      throw new Error(`A vs B debió ser válido (Delta 1.25): ${JSON.stringify(matchAB)}`);
    }

    // Emparejamiento A vs C: Delta = 3.5 > 1.5 -> RECHAZADO
    const matchAC = AsymmetricLadderEngine.validateLadderMatchmaking(aplA, aplC);
    if (matchAC.canMatch || matchAC.deltaAPL !== 3.5) {
      throw new Error(`A vs C debió ser rechazado por disparidad abusiva: ${JSON.stringify(matchAC)}`);
    }
  });

  // 2.1 W-APL Convexo (Softmax Boltzmann) y Protocolo Dual-Shield Anti-Sandbagging
  record('Matchmaking Dual-Shield: Neutralización matemática de Sandbagging y Hard Safety Cap', () => {
    // Caso Sandbagging Clásico: 2x L15 + 8x L1 vs Novato 5x L4 + 5x L5
    const cheaterDeck = [15, 15, 1, 1, 1, 1, 1, 1, 1, 1];
    const noviceDeck = [4, 4, 4, 4, 4, 5, 5, 5, 5, 5];

    const cheaterWAPL = AsymmetricLadderEngine.calculateDeckWAPL(cheaterDeck);
    const noviceWAPL = AsymmetricLadderEngine.calculateDeckWAPL(noviceDeck);

    // Verificación de W-APL: Cheater debe ponderar ~14.60 y novato ~4.55
    if (cheaterWAPL < 14.0 || cheaterWAPL > 15.0) {
      throw new Error(`W-APL de tramposo debe situarse entre 14 y 15 (obtenido: ${cheaterWAPL})`);
    }
    if (noviceWAPL < 4.0 || noviceWAPL > 5.0) {
      throw new Error(`W-APL de novato debe situarse entre 4 y 5 (obtenido: ${noviceWAPL})`);
    }

    // Emparejamiento Dual-Shield: Debe ser BLOQUEADO por Hard Safety Cap (|15 - 5| = 10 > 2)
    const matchCheaterNovice = AsymmetricLadderEngine.validateLadderMatchmaking(cheaterDeck, noviceDeck);
    if (matchCheaterNovice.canMatch) {
      throw new Error('El sistema permitió emparejar al Agente Tramposo con el Agente Novato (FALLO DE SEGURIDAD)');
    }
    if (matchCheaterNovice.rejectionReason !== 'MAX_LEVEL_DISPARITY') {
      throw new Error(`Esperado rechazo MAX_LEVEL_DISPARITY, obtenido: ${matchCheaterNovice.rejectionReason}`);
    }

    // Caso 2: Lobo Solitario (1x L15 + 9x L1 vs 10x L4)
    const loneWolfDeck = [15, 1, 1, 1, 1, 1, 1, 1, 1, 1];
    const pureL4Deck = [4, 4, 4, 4, 4, 4, 4, 4, 4, 4];
    const matchLoneWolf = AsymmetricLadderEngine.validateLadderMatchmaking(loneWolfDeck, pureL4Deck);
    if (matchLoneWolf.canMatch || matchLoneWolf.rejectionReason !== 'MAX_LEVEL_DISPARITY') {
      throw new Error('Lobo Solitario L15 debió ser vetado incondicionalmente por Hard Safety Cap');
    }

    // Caso 3: Jugador F2P con 1 carta líder (1x L11 + 9x L8 vs 5x L8 + 5x L9)
    const f2pDeck = [11, 8, 8, 8, 8, 8, 8, 8, 8, 8];
    const fairRivalDeck = [8, 8, 8, 8, 8, 9, 9, 9, 9, 9];
    const matchF2P = AsymmetricLadderEngine.validateLadderMatchmaking(f2pDeck, fairRivalDeck);
    if (!matchF2P.canMatch) {
      throw new Error(`Jugador F2P legítimo debió ser emparejado con rival paritario: ${matchF2P.reason}`);
    }

    // Caso 4: Paridad en Torneo Esports (10x L15 vs 10x L11 en isTournamentMode = true)
    const whaleDeckL15 = [15, 15, 15, 15, 15, 15, 15, 15, 15, 15];
    const esportsDeckL11 = [11, 11, 11, 11, 11, 11, 11, 11, 11, 11];
    const matchTournament = AsymmetricLadderEngine.validateLadderMatchmaking(whaleDeckL15, esportsDeckL11, true);
    if (!matchTournament.canMatch) {
      throw new Error(`En Torneo Esports ambas cuentas deben nivelarse a L11 y emparejarse: ${matchTournament.reason}`);
    }

    // Caso 5: En Ladder Diario, 10x L15 vs 10x L11 debe ser RECHAZADO (|15 - 11| = 4 > 2)
    const matchLadderDisparity = AsymmetricLadderEngine.validateLadderMatchmaking(whaleDeckL15, esportsDeckL11, false);
    if (matchLadderDisparity.canMatch) {
      throw new Error('En Ladder Diario, L15 vs L11 debió ser vetado por Hard Safety Cap');
    }
  });

  // 3. Tabla de Progresión y Costos Industriales (Planos, Acero, Chips, Hormigón)
  record('Tabla de Progresión Canónica: Costos de Planos, Acero y Microchips', () => {
    const l11Cost = UNIT_PROGRESSION_TABLE[11];
    if (l11Cost.requiredBlueprints !== 600 || l11Cost.requiredGold !== 14000 || l11Cost.requiredSteel !== 100 || l11Cost.requiredMicrochips !== 26) {
      throw new Error(`Costos de Nivel 11 difieren de la especificación calibrada: ${JSON.stringify(l11Cost)}`);
    }

    const l15Cost = UNIT_PROGRESSION_TABLE[15];
    if (l15Cost.requiredBlueprints !== 3200 || l15Cost.requiredGold !== 75000 || l15Cost.requiredSteel !== 340 || l15Cost.requiredConcrete !== 60) {
      throw new Error(`Costos de Nivel 15 difieren de la especificación calibrada: ${JSON.stringify(l15Cost)}`);
    }
  });

  // 4. Diagnóstico Balístico Near-Miss y Análisis Contrafáctico a Nivel 11
  record('Diagnóstico Near-Miss: Detección cuando el rival sobrevive con <= 2 HP y cálculo a Nivel 11', () => {
    const playerUnit = { id: 'tank_light', name: 'Tanque Ligero', level: 9, currentBlueprints: 250 };
    const rivalUnit = { id: 'tank_medium', name: 'Tanque Pesado Rival', level: 12, remainingHp: 1.0 };
    const playerInv = { refinedSteel: 35, refinedMicrochip: 10 };

    // En Victoria no debe dispararse
    const victoryReport = AsymmetricLadderEngine.evaluateNearMiss(true, playerUnit, rivalUnit, playerInv);
    if (victoryReport !== null) throw new Error('En victoria no debe haber reporte near-miss');

    // Con rival superviviente a 3 HP no debe ser near-miss (umbral <= 2 HP)
    const farMiss = AsymmetricLadderEngine.evaluateNearMiss(false, playerUnit, { ...rivalUnit, remainingHp: 3.5 }, playerInv);
    if (farMiss !== null) throw new Error('Rival con 3.5 HP no califica como near-miss');

    // Caso canónico: Derrota con rival a 1.0 HP
    const report = AsymmetricLadderEngine.evaluateNearMiss(false, playerUnit, rivalUnit, playerInv, 7.0);
    if (!report || !report.isNearMiss) {
      throw new Error('Debió generar un reporte Near-Miss válido');
    }

    // A Nivel 9: mult = 1.16, daño = 8.1
    // A Nivel 11: mult = 1.20, daño = 8.4 -> delta daño = +0.3
    if (report.extraDamageAtL11 <= 0) {
      throw new Error(`El daño contrafáctico a L11 debe ser superior: ${JSON.stringify(report)}`);
    }

    if (!report.commanderBark.dialogue.includes('blindaje de Nivel 12')) {
      throw new Error(`Diálogo de bark no contiene contexto de nivel rival: ${report.commanderBark.dialogue}`);
    }

    if (report.nextLevel !== 10 || report.requiredSteel !== 75 || report.currentSteel !== 35) {
      throw new Error(`Recursos para siguiente nivel erróneos: ${JSON.stringify(report)}`);
    }
  });

  // 5. Oferta Flash de Emergencia por Tilt ($0.99 en 180s)
  record('Oferta Flash por Tilt: Disparo por derrotas consecutivas o PTE < 10s con cooldown de 48h', () => {
    const now = Date.now();

    // Sin tilt: 1 derrota y PTE normal (20s) -> No hay oferta
    const noTilt = AsymmetricLadderEngine.evaluateTiltOffer('u1', 'tank_light', 'Tanque Ligero', 1, 20, false, 0, now);
    if (noTilt !== null) throw new Error('No debe emitir oferta sin condición de tilt');

    // Con tilt: 2 derrotas consecutivas -> Emite oferta
    const tiltOffer = AsymmetricLadderEngine.evaluateTiltOffer('u1', 'tank_light', 'Tanque Ligero', 2, 18, false, 0, now);
    if (!tiltOffer || tiltOffer.offerPriceUsd !== 0.99 || tiltOffer.rewardBlueprints !== 100 || tiltOffer.rewardSteel !== 30) {
      throw new Error(`Oferta flash generada no coincide con especificación: ${JSON.stringify(tiltOffer)}`);
    }

    // Cooldown de 48h: si se emitió hace 10 horas, se rechaza
    const tenHoursAgo = now - 10 * 3600 * 1000;
    const cooldownRejected = AsymmetricLadderEngine.evaluateTiltOffer('u1', 'tank_light', 'Tanque Ligero', 2, 8, true, tenHoursAgo, now);
    if (cooldownRejected !== null) {
      throw new Error('Debe respetar el cooldown de 48 horas entre ofertas flash');
    }

    // Disparo por Near-Miss con turnos precipitados (PTE < 10s)
    const fiftyHoursAgo = now - 50 * 3600 * 1000;
    const pteTiltOffer = AsymmetricLadderEngine.evaluateTiltOffer('u1', 'tank_light', 'Tanque Ligero', 1, 6, true, fiftyHoursAgo, now);
    if (!pteTiltOffer) {
      throw new Error('Debió generar oferta flash por turnos precipitados (PTE < 10s) en Near-Miss');
    }
  });

  const total = results.length;
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;

  return { total, passed, failed, results };
}

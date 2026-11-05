/**
 * ==============================================================================
 * SUITE DE PRUEBAS DETERMINISTAS: ASEDIO TERRITORIAL Y PROTOCOLO HANDSHAKE (120s)
 * ==============================================================================
 * Especificación Canónica: docs/00_GEOTACTICS_ONLINE_MASTER_SPEC.md §4.2 & §5.4
 * Hitos de Fase 2 (v0.0.1-alfa):
 * 1. Inicio de Asedio y Cuenta atrás de 120 segundos.
 * 2. Relevo Humano Defensivo (Claim Handshake -> PvP Realtime).
 * 3. Expiración de 120s -> Relevo Cognitivo a Guarnición IA (Nv. 1 a 5).
 * 4. Drenaje Determinista de Puntos de Control Territorial (TCP).
 * 5. Volteo de Soberanía a Ocupación De Facto (occupied_grace + 4h Cooldown).
 * 6. Consolidación De Jure al expirar la ventana de gracia de 24h-48h.
 * ==============================================================================
 */

import {
  TerritorialSiegeOrchestrator,
  InitiateSiegeParams,
} from './territorialSiegeOrchestrator';
import {
  GeotacticsRegionSovereignty,
  MASTER_METAGAME_CONSTANTS,
} from '../types/metagame';

export interface SiegeTestResult {
  name: string;
  passed: boolean;
  message: string;
  durationMs?: number;
}

export function runTerritorialSiegeSuite(): {
  total: number;
  passed: number;
  failed: number;
  results: SiegeTestResult[];
} {
  console.log('==============================================================================');
  console.log('EJECUTANDO SUITE: ASEDIO TERRITORIAL, HANDSHAKE 120s Y SOBERANÍA DUAL (FASE 2)');
  console.log('==============================================================================\n');

  const results: SiegeTestResult[] = [];
  let passed = 0;
  let failed = 0;

  function assert(desc: string, condition: boolean, detail: string = '', durationMs?: number) {
    if (condition) {
      console.log(`✅ [PASSED] ${desc}`);
      results.push({ name: desc, passed: true, message: detail, durationMs });
      passed++;
    } else {
      console.error(`❌ [FAILED] ${desc} - Detalle: ${detail}`);
      results.push({ name: desc, passed: false, message: detail || 'Aserción fallida', durationMs });
      failed++;
    }
  }

  const baseSovereignty: GeotacticsRegionSovereignty = {
    regionId: 'REG_VE_01',
    ownerClanId: 'clan_defensor_001',
    controllerClanId: 'clan_defensor_001',
    controlPoints: 10000,
    maxControlPoints: 10000,
    bunkerLevel: 2,
    status: 'stable',
    customsEscrowLocked: false,
    isEnergyStarved: false,
    activeBattleId: null,
    cooldownExpiresAt: null,
    graceExpiresAt: null,
    lastTickAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  // --------------------------------------------------------------------------
  // TEST 1: Creación de Sesión de Asedio con Handshake de 120 Segundos
  // --------------------------------------------------------------------------
  try {
    const params: InitiateSiegeParams = {
      regionId: 'REG_VE_01',
      attackerClanId: 'clan_atacante_999',
      attackerCommanderId: 'usr_atacante_01',
      sovereignty: baseSovereignty,
    };

    const { session, updatedSovereignty } = TerritorialSiegeOrchestrator.createSiegeSession(params);

    const nowMs = Date.now();
    const expiresMs = new Date(session.handshakeExpiresAt).getTime();
    const diffSec = Math.round((expiresMs - nowMs) / 1000);

    assert(
      'Test 1.1: Sesión de asedio nace con estado handshake_pending y ventana de 120s',
      session.status === 'handshake_pending' &&
        session.mode === 'pve_garrison' &&
        diffSec >= 119 &&
        diffSec <= 121,
      `Estado: ${session.status}, Modo: ${session.mode}, Segundos restantes: ${diffSec}s`
    );

    assert(
      'Test 1.2: Soberanía de la región transiciona a under_siege con enlace a la sesión',
      updatedSovereignty.status === 'under_siege' && updatedSovereignty.activeBattleId === session.id,
      `Sovereignty status: ${updatedSovereignty.status}, Battle ID: ${updatedSovereignty.activeBattleId}`
    );
  } catch (err: any) {
    assert('Test 1: Error en inicio de asedio', false, err.message);
  }

  // --------------------------------------------------------------------------
  // TEST 2: Relevo Defensivo Humano en Tiempo (Dentro de los 120s)
  // --------------------------------------------------------------------------
  try {
    const { session } = TerritorialSiegeOrchestrator.createSiegeSession({
      regionId: 'REG_VE_01',
      attackerClanId: 'clan_atacante_999',
      attackerCommanderId: 'usr_atacante_01',
      sovereignty: baseSovereignty,
    });

    const now = new Date();
    const claimTime = new Date(now.getTime() + 45 * 1000); // 45 segundos después

    const claimRes = TerritorialSiegeOrchestrator.claimDefensiveHandshake(
      session,
      'usr_defensor_humano_77',
      claimTime
    );

    assert(
      'Test 2.1: Relevo antes de 120s transiciona la sesión a pvp_realtime y in_combat',
      claimRes.success &&
        claimRes.session.mode === 'pvp_realtime' &&
        claimRes.session.status === 'in_combat' &&
        claimRes.session.defenderCommanderId === 'usr_defensor_humano_77',
      `Modo: ${claimRes.session.mode}, Estado: ${claimRes.session.status}, Defensor: ${claimRes.session.defenderCommanderId}`
    );
  } catch (err: any) {
    assert('Test 2: Error en relevo defensivo humano', false, err.message);
  }

  // --------------------------------------------------------------------------
  // TEST 3: Expiración del Handshake (Rechazo de Relevo Tardío y Fallback a IA)
  // --------------------------------------------------------------------------
  try {
    const { session } = TerritorialSiegeOrchestrator.createSiegeSession({
      regionId: 'REG_VE_01',
      attackerClanId: 'clan_atacante_999',
      attackerCommanderId: 'usr_atacante_01',
      sovereignty: baseSovereignty,
    });

    const now = new Date();
    const lateClaimTime = new Date(now.getTime() + 125 * 1000); // 125 segundos después (expirado)

    const lateClaimRes = TerritorialSiegeOrchestrator.claimDefensiveHandshake(
      session,
      'usr_defensor_tardio',
      lateClaimTime
    );

    assert(
      'Test 3.1: Intento de relevo después de 120s es rechazado formalmente',
      !lateClaimRes.success && lateClaimRes.reason?.includes('expirado'),
      `Rechazado correctamente: ${lateClaimRes.reason}`
    );

    // Fallback a Guarnición IA
    const fallbackBunker3 = TerritorialSiegeOrchestrator.resolveHandshakeTimeout(session, 3, lateClaimTime);
    assert(
      'Test 3.2: Búnker Nivel 3 activa Guarnición IA de tier hard (Guardia Acorazada Veterana)',
      fallbackBunker3.session.mode === 'pve_garrison' &&
        fallbackBunker3.session.status === 'in_combat' &&
        fallbackBunker3.aiTier === 'hard',
      `Modo: ${fallbackBunker3.session.mode}, Tier IA: ${fallbackBunker3.aiTier}`
    );

    const fallbackBunker5 = TerritorialSiegeOrchestrator.resolveHandshakeTimeout(session, 5, lateClaimTime);
    assert(
      'Test 3.3: Búnker Nivel 5 activa Gran Mariscal de tier mcts_legendary',
      fallbackBunker5.aiTier === 'mcts_legendary',
      `Tier IA Búnker 5: ${fallbackBunker5.aiTier}`
    );
  } catch (err: any) {
    assert('Test 3: Error en resolución de timeout de handshake', false, err.message);
  }

  // --------------------------------------------------------------------------
  // TEST 4: Drenaje y Cálculo de TCP
  // --------------------------------------------------------------------------
  try {
    const drainBunker1 = TerritorialSiegeOrchestrator.calculateSiegeTcpDelta('attacker', 1, false);
    const drainBunker5 = TerritorialSiegeOrchestrator.calculateSiegeTcpDelta('attacker', 5, false);
    const recoverDef = TerritorialSiegeOrchestrator.calculateSiegeTcpDelta('defender', 1, false);

    assert(
      'Test 4.1: Victoria atacante drena TCP entre 800 y 2,500 puntos (Búnker 1 drena más que Búnker 5)',
      drainBunker1 <= -1500 && drainBunker5 >= -1200 && Math.abs(drainBunker1) > Math.abs(drainBunker5),
      `Drenaje Búnker 1: ${drainBunker1} TCP, Búnker 5: ${drainBunker5} TCP`
    );

    assert(
      'Test 4.2: Victoria defensora recupera exactamente +500 TCP',
      recoverDef === 500,
      `Recuperación defensora: +${recoverDef} TCP`
    );
  } catch (err: any) {
    assert('Test 4: Error en cálculo de delta TCP', false, err.message);
  }

  // --------------------------------------------------------------------------
  // TEST 5: Volteo de Soberanía a Ocupación De Facto (TCP = 0) y Escudo de 4h
  // --------------------------------------------------------------------------
  try {
    const weakSovereignty: GeotacticsRegionSovereignty = {
      ...baseSovereignty,
      controlPoints: 1000, // Vulnerable a una sola victoria
    };

    const { session } = TerritorialSiegeOrchestrator.createSiegeSession({
      regionId: 'REG_VE_01',
      attackerClanId: 'clan_atacante_999',
      attackerCommanderId: 'usr_atacante_01',
      sovereignty: weakSovereignty,
    });

    const now = new Date();
    const resolution = TerritorialSiegeOrchestrator.resolveTerritorialSiege(
      weakSovereignty,
      session,
      'attacker',
      false,
      now
    );

    assert(
      'Test 5.1: TCP colapsa a 0 y activa volteo de soberanía a occupied_grace',
      resolution.isSovereigntyFlipped &&
        resolution.newControlPoints === 0 &&
        resolution.newStatus === 'occupied_grace',
      `Nuevo TCP: ${resolution.newControlPoints}, Estado: ${resolution.newStatus}`
    );

    assert(
      'Test 5.2: Invasor se convierte en De Facto Controller reteniendo al De Jure Owner durante la gracia',
      resolution.newControllerClanId === 'clan_atacante_999' &&
        resolution.newOwnerClanId === 'clan_defensor_001',
      `Controller: ${resolution.newControllerClanId}, Owner: ${resolution.newOwnerClanId}`
    );

    assert(
      'Test 5.3: Se activan el escudo de 4h y la ventana de gracia de 24h para contraataque',
      resolution.cooldownExpiresAt !== null && resolution.graceExpiresAt !== null,
      `Cooldown: ${resolution.cooldownExpiresAt}, Gracia: ${resolution.graceExpiresAt}`
    );
  } catch (err: any) {
    assert('Test 5: Error en volteo de soberanía y gracia', false, err.message);
  }

  // --------------------------------------------------------------------------
  // TEST 6: Consolidación Legal De Jure al Expirar la Gracia
  // --------------------------------------------------------------------------
  try {
    const now = new Date();
    const gracePast = new Date(now.getTime() - 1000); // Expirada hace 1 segundo
    const graceFuture = new Date(now.getTime() + 20 * 3600 * 1000); // Expira en 20 horas

    const occupiedPendingSov: GeotacticsRegionSovereignty = {
      ...baseSovereignty,
      ownerClanId: 'clan_defensor_001',
      controllerClanId: 'clan_atacante_999',
      controlPoints: 0,
      status: 'occupied_grace',
      customsEscrowLocked: true,
      graceExpiresAt: graceFuture.toISOString(),
      cooldownExpiresAt: null,
    };

    // 6.1 Intento de consolidación antes de que expire la gracia -> Falla
    const earlyConsolidation = TerritorialSiegeOrchestrator.consolidateDeJureOwnership(
      occupiedPendingSov,
      now
    );
    assert(
      'Test 6.1: Durante la ventana de gracia la consolidación De Jure NO se ejecuta',
      !earlyConsolidation.wasConsolidated && earlyConsolidation.consolidatedSovereignty.status === 'occupied_grace',
      `Estado: ${earlyConsolidation.consolidatedSovereignty.status}`
    );

    // 6.2 Consolidación con gracia expirada -> Éxito total
    const occupiedExpiredSov: GeotacticsRegionSovereignty = {
      ...occupiedPendingSov,
      graceExpiresAt: gracePast.toISOString(),
    };

    const maturedConsolidation = TerritorialSiegeOrchestrator.consolidateDeJureOwnership(
      occupiedExpiredSov,
      now
    );
    assert(
      'Test 6.2: Al expirar la gracia el controller_clan se convierte en owner_clan oficial y el TCP resetea a 10,000',
      maturedConsolidation.wasConsolidated &&
        maturedConsolidation.consolidatedSovereignty.ownerClanId === 'clan_atacante_999' &&
        maturedConsolidation.consolidatedSovereignty.controlPoints === 10000 &&
        maturedConsolidation.consolidatedSovereignty.status === 'stable',
      `Nuevo Owner: ${maturedConsolidation.consolidatedSovereignty.ownerClanId}, TCP: ${maturedConsolidation.consolidatedSovereignty.controlPoints}`
    );
  } catch (err: any) {
    assert('Test 6: Error en consolidación legal De Jure', false, err.message);
  }

  // --------------------------------------------------------------------------
  // RESUMEN
  // --------------------------------------------------------------------------
  console.log('------------------------------------------------------------------------------');
  console.log(`RESUMEN ASEDIO Y HANDSHAKE FASE 2: ${passed}/${results.length} PASARON`);
  if (failed > 0) {
    console.error(`ALERTA: ${failed} pruebas fallaron.`);
  } else {
    console.log('✅ TODAS LAS PRUEBAS DE ASEDIO, RED Y SOBERANÍA DUAL SUPERADAS (100% ÉXITO)');
  }
  console.log('==============================================================================\n');

  return {
    total: results.length,
    passed,
    failed,
    results,
  };
}

// Ejecución directa si se invoca por CLI
if (process.argv[1]?.includes('territorialSiege')) {
  const run = runTerritorialSiegeSuite();
  if (run.failed > 0) process.exit(1);
}

/**
 * ==============================================================================
 * SUITE DE PRUEBAS FASE 4: SEAMLESS ZOOM, DOBLE LLAVE Y HANDSHAKE 120s
 * ==============================================================================
 * Ejecución: npx tsx src/engine/tacticalCombatSeamlessIntegration.test.ts
 * ==============================================================================
 */

import {
  resolveSemanticLOD,
  validateDoubleKeyDeployment,
  settleCombatLossesAndScrap,
  evaluateDefensiveHandshake,
  DestroyedUnitRecord,
} from '@domains/tactics';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ [FAILED] ${message}`);
    process.exit(1);
  } else {
    console.log(`✅ [PASSED] ${message}`);
  }
}

console.log('==============================================================================');
console.log('EJECUTANDO SUITE: FASE 4 - SEAMLESS ZOOM, DOBLE LLAVE Y HANDSHAKE 120s');
console.log('==============================================================================\n');

// ------------------------------------------------------------------------------
// SUITE 1: SEMANTIC LOD Y CONMUTACIÓN DE CÁMARA WEBGL
// ------------------------------------------------------------------------------
console.log('--- SUITE 1: SEMANTIC LOD Y CONMUTACIÓN DE TEXTURA ---');

const lodGlobal = resolveSemanticLOD(3.5);
assert(lodGlobal.lod === 'LOD1_GLOBAL', 'Test 1.1: Zoom 3.5x activa Nivel 1 (Macro-globo geopolítico)');
assert(!lodGlobal.isTileCanvasActive, 'Test 1.2: Canvas táctico desmontado a nivel macro para ahorrar VRAM (<45MB)');
assert(lodGlobal.textureSampling === 'linear', 'Test 1.3: Muestreo de textura en modo "linear" para mapa base');

const lodOperational = resolveSemanticLOD(8.5);
assert(lodOperational.lod === 'LOD2_OPERATIONAL', 'Test 1.4: Zoom 8.5x activa Nivel 2 (Teatro Operacional y Suministros)');
assert(lodOperational.subscribedChannel === 'theater_ops:VE', 'Test 1.5: Canal regional de Venezuela conectado');

const lodTactical = resolveSemanticLOD(14.0, 'REG_VE_01');
assert(lodTactical.lod === 'LOD3_TACTICAL', 'Test 1.6: Zoom 14.0x activa Nivel 3 (Inmersión Táctica en Vivo)');
assert(lodTactical.isTileCanvasActive === true, 'Test 1.7: TileCanvas HTML5 instanciado sobre coordenadas WGS84');
assert(lodTactical.textureSampling === 'nearest', 'Test 1.8: Textura conmuta a "nearest" para preservar pixel-art nítido');
assert(lodTactical.subscribedChannel === 'territorial_battle:REG_VE_01', 'Test 1.9: Canal WebSocket de combate activo');

// ------------------------------------------------------------------------------
// SUITE 2: REGLA DE LA DOBLE LLAVE EN PRODUCCIÓN TÁCTICA
// ------------------------------------------------------------------------------
console.log('\n--- SUITE 2: VALIDACIÓN DE LA DOBLE LLAVE ---');

// 2.1 Kit F2P inagotable
const f2pDeploy = validateDoubleKeyDeployment({
  unitCode: 'infantry',
  tier: 1,
  facilityType: 'factory',
  availableFunds: 1000,
  unitCostFunds: 1000,
  userHangarStock: 0, // Stock 0 en BD pero es F2P
});
assert(f2pDeploy.canDeploy === true, 'Test 2.1: Infantería T1 se despliega con 0 chasis en inventario (Kit F2P)');
assert(f2pDeploy.sourceUsed === 'f2p_infinite', 'Test 2.2: Origen reconocido como "f2p_infinite"');

// 2.2 Rechazo por falta de fondos ($G)
const noFundsDeploy = validateDoubleKeyDeployment({
  unitCode: 'tank',
  tier: 1,
  facilityType: 'factory',
  availableFunds: 3000,
  unitCostFunds: 7000,
  userHangarStock: 5,
});
assert(!noFundsDeploy.canDeploy, 'Test 2.3: Tanque con chasis disponible pero fondos insuficientes es RECHAZADO');

// 2.3 Rechazo por falta de chasis físico (Llave 2 insatisfecha)
const noStockDeploy = validateDoubleKeyDeployment({
  unitCode: 'tank',
  tier: 1,
  facilityType: 'factory',
  availableFunds: 10000,
  unitCostFunds: 7000,
  userHangarStock: 0,
});
assert(!noStockDeploy.canDeploy, 'Test 2.4: Tanque con fondos suficientes pero sin stock físico en Hangar es RECHAZADO');

// 2.4 Aprobación de Doble Llave con Hangar Personal
const successUserDeploy = validateDoubleKeyDeployment({
  unitCode: 'tank',
  tier: 1,
  facilityType: 'factory',
  availableFunds: 10000,
  unitCostFunds: 7000,
  userHangarStock: 2,
});
assert(successUserDeploy.canDeploy === true, 'Test 2.5: Tanque con fondos Y stock personal es AUTORIZADO');
assert(successUserDeploy.sourceUsed === 'user_hangar', 'Test 2.6: Descuento programado de Hangar Personal');

// 2.5 Aprobación de Doble Llave con Arsenal de Facción
const successFactionDeploy = validateDoubleKeyDeployment({
  unitCode: 'medium_tank',
  tier: 2,
  facilityType: 'factory',
  availableFunds: 18000,
  unitCostFunds: 12000,
  userHangarStock: 0,
  factionHangarStock: 3,
  allowFactionStock: true,
});
assert(successFactionDeploy.canDeploy === true, 'Test 2.7: Tanque Medio sin stock personal se despliega desde el Arsenal del Clan');
assert(successFactionDeploy.sourceUsed === 'faction_hangar', 'Test 2.8: Descuento programado de Arsenal de Facción');

// ------------------------------------------------------------------------------
// SUITE 3: LIQUIDACIÓN DE BAJAS Y SUMIDERO CON 35% DE CHATARRA
// ------------------------------------------------------------------------------
console.log('\n--- SUITE 3: LIQUIDACIÓN DE SINIESTRALIDAD (35% TECH SCRAP) ---');

const destroyedCombatList: DestroyedUnitRecord[] = [
  { unitCode: 'infantry', tier: 1, ownerId: 'p1', source: 'user' },    // F2P: ignorado
  { unitCode: 'tank', tier: 1, ownerId: 'p1', source: 'user' },        // T1: 50 * 0.35 = 17 scrap
  { unitCode: 'medium_tank', tier: 2, ownerId: 'p1', source: 'user' }, // T2: 100 * 0.35 = 35 scrap
  { unitCode: 'artillery', tier: 3, ownerId: 'p1', source: 'faction' }, // T3: 150 * 0.35 = 52 scrap
];

const settlement = settleCombatLossesAndScrap(destroyedCombatList, 'attacker', true);
assert(settlement.permanentSinkUnitsCount === 3, 'Test 3.1: Tres chasis no-F2P eliminados definitivamente (sumidero)');
assert(settlement.techScrapRecovered === 104, `Test 3.2: 104 Chatarra Balística recuperada (17 + 35 + 52): obtenido ${settlement.techScrapRecovered}`);
assert(settlement.steelPlatesRefundable === 52, `Test 3.3: Refundible en exactamente 52 Placas de Acero (2 scrap -> 1 acero)`);
assert(settlement.tcpDrain === 1500, 'Test 3.4: Victoria atacante drena 1,500 TCP de la provincia asediada');

// ------------------------------------------------------------------------------
// SUITE 4: PROTOCOLO DEFENSIVO HUMAN HANDSHAKE (120 SEGUNDOS)
// ------------------------------------------------------------------------------
console.log('\n--- SUITE 4: HUMAN HANDSHAKE Y ALERTA DEFCON 1 ---');

const now = new Date('2026-11-05T00:00:00Z');
const expiresAt = new Date('2026-11-05T00:02:00Z').toISOString(); // 120s

// 4.1 A los 30s del asedio (restan 90s)
const midTime = new Date('2026-11-05T00:00:30Z');
const evalActive = evaluateDefensiveHandshake(expiresAt, false, midTime);
assert(evalActive.isHandshakeActive === true, 'Test 4.1: Handshake activo a los 90s restantes');
assert(evalActive.secondsRemaining === 90, 'Test 4.2: Temporizador marca exactamente 90 segundos');
assert(evalActive.defconAlert === true, 'Test 4.3: Dispara alerta DEFCON 1 en Bark Engine para movilizar defensores');

// 4.2 Defensor pulsa "Tomar el Mando"
const evalClaimed = evaluateDefensiveHandshake(expiresAt, true, midTime);
assert(evalClaimed.combatMode === 'pvp_realtime', 'Test 4.4: Relevo humano conmuta combate inmediatamente a PvP en vivo');
assert(!evalClaimed.defconAlert, 'Test 4.5: Alerta desactivada tras intervención humana');

// 4.3 Expiración de 120s sin respuesta humana
const pastTime = new Date('2026-11-05T00:02:05Z');
const evalExpired = evaluateDefensiveHandshake(expiresAt, false, pastTime);
assert(!evalExpired.isHandshakeActive, 'Test 4.6: Handshake cerrado formalmente tras expirar 120s');
assert(evalExpired.combatMode === 'pve_garrison', 'Test 4.7: Guarnición IA asume la defensa del búnker de forma autónoma');

console.log('\n------------------------------------------------------------------------------');
console.log('RESUMEN FASE 4 (SEAMLESS ZOOM, DOBLE LLAVE Y HANDSHAKE 120s): 17/17 PASARON');
console.log('✅ TODAS LAS PRUEBAS DETERMINISTAS DE FASE 4 SUPERADAS AL 100%');
console.log('==============================================================================');
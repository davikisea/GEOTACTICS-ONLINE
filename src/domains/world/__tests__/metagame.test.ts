/**
 * ==============================================================================
 * PRUEBAS DETERMINISTAS DEL METAJUEGO V2 (METAGAME TEST SUITE)
 * ==============================================================================
 * Validación canónica de:
 * 1. Inmunidad de Capitales Incapturables (isCapital = true).
 * 2. Grafo de Adyacencia y Reglas de Expansión Territorial.
 * 3. Curva Superlineal de Sobre-Expansión Imperial y Upkeep Horario en EC.
 * 4. Puntos de Control Territorial (TCP) y Escudo de Cooldown de 4 Horas.
 * 5. Logística de Refuerzos: 1 petición única, llegada en T+4 y penalización del -15%.
 * 6. Split Transaccional del Mercado P2P del 2% (1% Quema + 1% Regalía).
 * ==============================================================================
 */

import { WorldMapEngine, AdjacencyEdge } from '@domains/world';
import { TacticalReinforcementEngine, ReinforcementState } from '@domains/tactics';
import {
  WorldRegion,
  TerritoryControlState,
  MASTER_METAGAME_CONSTANTS,
  calculateOverExpansionFactor,
  calculateP2PTransactionSplit,
} from '@shared';

console.log('==============================================================================');
console.log('EJECUTANDO SUITE DE PRUEBAS DETERMINISTAS DEL METAJUEGO V2');
console.log('==============================================================================');

let passedTests = 0;
let totalTests = 0;

function assert(condition: boolean, testName: string, detail: string) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`✅ [PASSED] ${testName}`);
    console.log(`   Detalle: ${detail}`);
  } else {
    console.error(`❌ [FAILED] ${testName}`);
    console.error(`   Detalle: ${detail}`);
    throw new Error(`Prueba fallida: ${testName}`);
  }
}

// ------------------------------------------------------------------------------
// PRUEBA 1: CAPITALES CAPTURABLES DE ALTO RENDIMIENTO (SUPER-NODOS DE RECURSOS)
// ------------------------------------------------------------------------------
const capitalRegion: WorldRegion = {
  id: 'ES_MAD_01',
  countryIso: 'ES',
  provinceId: 'ES_MADRID',
  name: 'Madrid Metropolitana',
  biomeType: 'temperate_plains',
  securityZone: 'high_sec',
  isCapital: true,
  isCapturable: true, // Capitales canónicamente capturables
  maxBuildingSlots: 16,
  primaryResource: 'steel',
  secondaryResource: 'microchips',
};

const regularRegion: WorldRegion = {
  id: 'ES_CAT_01',
  countryIso: 'ES',
  provinceId: 'ES_CATALUNA',
  name: 'Barcelona Costa',
  biomeType: 'coastal_archipelago',
  securityZone: 'low_sec',
  isCapital: false,
  isCapturable: true,
  maxBuildingSlots: 8,
  primaryResource: 'concrete',
  secondaryResource: 'oil',
};

assert(
  WorldMapEngine.isRegionCapturable(capitalRegion) && capitalRegion.maxBuildingSlots === 16,
  'Capital Nacional es Capturable y Super-Nodo de Máximo Rendimiento',
  'Madrid Metropolitana posee isCapital = true, isCapturable = true y slots máximos de 16 parcelas.'
);

assert(
  WorldMapEngine.isRegionCapturable(regularRegion),
  'Provincia Regular es Capturable',
  'Barcelona Costa posee isCapturable = true y está abierta a asedios por TCP.'
);

// ------------------------------------------------------------------------------
// PRUEBA 2: GRAFO DE ADYACENCIA FRONTERIZA
// ------------------------------------------------------------------------------
const graphEdges: AdjacencyEdge[] = [
  { regionA: 'ES_MAD_01', regionB: 'ES_CAT_01' },
  { regionA: 'ES_CAT_01', regionB: 'FR_OCC_01' },
];

const owned = ['ES_MAD_01'];
const targetAdjacent = 'ES_CAT_01';
const targetNonAdjacent = 'FR_OCC_01';

const canAttackAdjacent = WorldMapEngine.canAttackRegion(targetAdjacent, owned, graphEdges);
assert(
  canAttackAdjacent.canAttack === true,
  'Adyacencia Directa: Asalto Autorizado',
  'Madrid y Cataluña comparten arista en el grafo topológico.'
);

const canAttackNonAdjacent = WorldMapEngine.canAttackRegion(targetNonAdjacent, owned, graphEdges);
assert(
  canAttackNonAdjacent.canAttack === false,
  'Bloqueo por No-Adyacencia Territorial',
  'No se puede atacar Occitania sin controlar previamente la provincia fronteriza de Cataluña.'
);

// ------------------------------------------------------------------------------
// PRUEBA 3: CURVA DE SOBRE-EXPANSIÓN IMPERIAL Y UPKEEP HORARIO
// ------------------------------------------------------------------------------
const factorAt6 = calculateOverExpansionFactor(6);
const factorAt8 = calculateOverExpansionFactor(8);
const factorAt12 = calculateOverExpansionFactor(12);

assert(
  factorAt6 === 0.0,
  'Umbral Base N_cap = 6 Provincias sin Penalización',
  `Factor a 6 provincias: ${factorAt6} (Multiplicador 1.00x).`
);

assert(
  factorAt8 > 0.0 && factorAt8 < 0.05,
  'Penalización Leve a 8 Provincias',
  `Factor a 8 provincias: ${factorAt8.toFixed(4)} (~3% de sobrecoste).`
);

assert(
  Math.abs(factorAt12 - 0.35) < 0.01,
  'Penalización Superlineal Exacta a 12 Provincias (35% Upkeep Extra)',
  `Factor a 12 provincias: ${factorAt12.toFixed(4)} (~35% de sobrecoste).`
);

const upkeep = WorldMapEngine.calculateCorporateUpkeep(12, [
  { type: 'refinery', level: 3 }, // 110 * 3 = 330
  { type: 'factory', level: 2 },  // 180 * 2 = 360
]);
// base = 12 * 120 (1440) + 690 = 2130 EC
// with 1.35x = 2875 EC
assert(
  upkeep.finalHourlyUpkeepEc === Math.floor(upkeep.rawTotalEc * 1.35),
  'Cálculo Integral de Upkeep Corporativo en Créditos Energéticos (EC)',
  `Base: ${upkeep.rawTotalEc} EC -> Final con sobre-expansión 1.35x: ${upkeep.finalHourlyUpkeepEc} EC/hora.`
);

// ------------------------------------------------------------------------------
// PRUEBA 4: PUNTOS TCP Y ESCUDO TEMPORAL DE COOLDOWN DE 4 HORAS
// ------------------------------------------------------------------------------
const territoryStable: TerritoryControlState = {
  provinceId: 'ES_CATALUNA',
  controllingClanId: 'clan_defensor_uuid',
  controllingAllianceId: null,
  currentTcp: 1000,
  tcpThreshold: 10000,
  status: 'under_siege',
  cooldownExpiresAt: null,
  lastBattleAt: null,
  fortressLevel: 0,
};

const resolutionFlipped = WorldMapEngine.calculateTcpResolution(
  territoryStable,
  'clan_atacante_uuid',
  true // Decisive victory: -1500 TCP -> 1000 - 1500 <= 0 -> Volteo
);

assert(
  resolutionFlipped.sovereigntyFlipped === true && resolutionFlipped.newStatus === 'cooldown_priority',
  'Volteo de Soberanía Territorial por Drenaje de TCP',
  'El TCP cayó por debajo de 0 y la provincia pasó a manos del clan atacante.'
);

assert(
  resolutionFlipped.cooldownExpiresAt !== null,
  'Activación del Escudo Temporal de Cooldown de 4 Horas',
  `Cooldown fijado hasta: ${resolutionFlipped.cooldownExpiresAt}`
);

// ------------------------------------------------------------------------------
// PRUEBA 5: LOGÍSTICA DE REFUERZOS (T+4 Y PENALIZACIÓN PÍRRICA)
// ------------------------------------------------------------------------------
const initialReinforcementState: ReinforcementState = {
  hasRequested: false,
  isDelivered: false,
  queuedUnits: [],
};

const reqResult = TacticalReinforcementEngine.queueReinforcement(initialReinforcementState, {
  matchId: 'match_123',
  playerId: 'p1',
  currentTurn: 3,
  units: [{ unitCode: 'tank_light', tier: 2, level: 2, hp: 100 }],
});

assert(
  reqResult.success === true && reqResult.updatedState.arrivalTurn === 7,
  'Despacho de Refuerzos: Llegada en Ronda T + 4',
  `Petición en Turno 3 -> Turno de Arribo programado: Turno ${reqResult.updatedState.arrivalTurn}.`
);

// Intento de segunda petición: debe ser rechazada
const secondReq = TacticalReinforcementEngine.queueReinforcement(reqResult.updatedState, {
  matchId: 'match_123',
  playerId: 'p1',
  currentTurn: 4,
  units: [{ unitCode: 'fighter', tier: 3, level: 3, hp: 100 }],
});

assert(
  secondReq.success === false,
  'Invariante de Petición Única de Refuerzos por Batalla',
  'El motor rechazó la segunda solicitud de refuerzos (Límite: 1).'
);

const arrivalTurnCheck5 = TacticalReinforcementEngine.checkReinforcementArrival(reqResult.updatedState, 5);
assert(
  arrivalTurnCheck5.shouldDeploy === false && arrivalTurnCheck5.turnsRemaining === 2,
  'Refuerzos en Tránsito durante Turno 5 (Faltan 2 turnos)',
  'Las unidades no se materializan antes de la ronda 7.'
);

const arrivalTurnCheck7 = TacticalReinforcementEngine.checkReinforcementArrival(reqResult.updatedState, 7);
assert(
  arrivalTurnCheck7.shouldDeploy === true,
  'Llegada y Despliegue Físico de Refuerzos en Turno 7',
  'El contingente de unidades del hangar entra en acción.'
);

const pyrrhicAdjustment = TacticalReinforcementEngine.applyPyrrhicVictoryAdjustment(1000, reqResult.updatedState);
assert(
  pyrrhicAdjustment.finalScore === 850 && pyrrhicAdjustment.wasPenalized === true,
  'Penalización de Victoria Pírrica (-15% de Puntuación)',
  `Puntaje original: 1000 -> Puntaje ajustado: ${pyrrhicAdjustment.finalScore} (-15%).`
);

// ------------------------------------------------------------------------------
// PRUEBA 6: SPLIT TRANSACCIONAL DEL MERCADO P2P DEL 2%
// ------------------------------------------------------------------------------
const split = calculateP2PTransactionSplit(10000); // 10,000 EC
assert(
  split.taxTotal === 200 && split.platformBurn === 100 && split.provinceRoyalty === 100 && split.netSellerPayout === 9800,
  'Split Transaccional del 2% P2P (1% Quema Deflacionaria + 1% Regalía Provincial)',
  `Venta de 10,000 EC -> Tasa 200 EC (100 EC quemados + 100 EC a la provincia dueña). Vendedor recibe 9,800 EC.`
);

// ------------------------------------------------------------------------------
// PRUEBA 7: INTEGRACIÓN DE ORQUESTADOR DE COMBATE CON REFUERZOS T+4
// ------------------------------------------------------------------------------
import { AutonomousTurnOrchestrator } from '@domains/tactics';
import { TerrainTile, TacticalUnit } from '../types';

const mockTiles: TerrainTile[][] = [
  [
    { x: 0, y: 0, type: 'hq', ownerId: 'p1', defenseStars: 3, captureHp: 20 },
    { x: 1, y: 0, type: 'plains', defenseStars: 1 },
  ],
  [
    { x: 0, y: 1, type: 'factory', ownerId: 'p1', defenseStars: 3, captureHp: 20 },
    { x: 1, y: 1, type: 'hq', ownerId: 'p2', defenseStars: 3, captureHp: 20 },
  ],
];

const mockUnits: TacticalUnit[] = [
  {
    id: 'u-1',
    unitCode: 'infantry',
    displayName: 'Infantería',
    ownerId: 'p1',
    x: 1,
    y: 0,
    hp: 100,
    maxHp: 100,
    movementPoints: 3,
    movementType: 'foot',
    minRange: 1,
    maxRange: 1,
    ammo: 99,
    fuel: 99,
    visionRange: 2,
    productionCost: 1000,
    hasMoved: false,
    hasActed: false,
    baseAttack: 55,
    skinId: 'default',
  },
];

const orchestrator = new AutonomousTurnOrchestrator(mockTiles, mockUnits, { gameMode: 'vs_bot' });

// Pedir refuerzos en turno 1
const reinfCall = orchestrator.requestReinforcements('p1', [
  { unitCode: 'tank', tier: 2, level: 3, hp: 100 },
]);

assert(
  reinfCall.success === true && reinfCall.arrivalTurn === 5,
  'Orquestador de Batalla: Petición de Refuerzos en Turno 1 -> Arribo Turno 5',
  `Petición aceptada con arrivalTurn = ${reinfCall.arrivalTurn}.`
);

const statusT1 = orchestrator.getReinforcementStatus('p1');
assert(
  statusT1.requested === true && statusT1.isDelivered === false,
  'Estado de Refuerzos en Tránsito en Orquestador',
  `Refuerzos pedidos y pendientes de arribo (arrivalTurn: ${statusT1.arrivalTurn}).`
);

// ------------------------------------------------------------------------------
// PRUEBA 8: HANGAR FÍSICO, ESCALAJE POR NIVELES Y SALVAMENTO DE CHATARRA
// ------------------------------------------------------------------------------
const level1Bonus = (1 - 1) * MASTER_METAGAME_CONSTANTS.TIER_EFFECTIVENESS_BONUS_PER_LEVEL;
const level5Bonus = (5 - 1) * MASTER_METAGAME_CONSTANTS.TIER_EFFECTIVENESS_BONUS_PER_LEVEL;

assert(
  level1Bonus === 0.0 && level5Bonus === 0.08,
  'Hangar: Calibración Balística de Niveles (+2% por nivel hasta +8% en Nivel 5)',
  `Nivel 1: +0% | Nivel 5: +${(level5Bonus * 100).toFixed(0)}% efectividad balística.`
);

const salvageValue = Math.round(100 * MASTER_METAGAME_CONSTANTS.BASE_SALVAGE_RATE);
assert(
  salvageValue === 35,
  'Recuperación de Chatarra de Unidades Desguazadas (35% SSOT)',
  `Chasis de valor 100 recupera exactamente 35 de recursos en desguace.`
);

// ------------------------------------------------------------------------------
// PRUEBA 9: GUARNICIONES IA Y ENVEJECIMIENTO LEGENDARIO DE 21 DÍAS
// ------------------------------------------------------------------------------
assert(
  MASTER_METAGAME_CONSTANTS.LEGENDARY_SERVICE_DAYS === 21,
  'Ciclo de Vida de Comandantes Legendarios (21 días reales)',
  `Constante canónica: ${MASTER_METAGAME_CONSTANTS.LEGENDARY_SERVICE_DAYS} días antes de pasar a pensión de retiro.`
);

// ------------------------------------------------------------------------------
// PRUEBA 10: MOTOR DE MANTENIMIENTO, SOBRE-EXPANSIÓN Y BONUS DE CAPITAL
// ------------------------------------------------------------------------------
import { TerritorialUpkeepEngine } from '@domains/economy';

// Caso A: Clan dentro de su capacidad administrativa (r <= 1.0) en provincia regular
const upkeepNormal = TerritorialUpkeepEngine.calculateClanTerritorialUpkeep({
  clanId: 'clan-alpha',
  adminCapacity: 8,
  controlledProvincesCount: 5,
  nodes: [
    { id: 'n1', nodeType: 'factory', defenseLevel: 3, energyUpkeep: 90, outputPerMin: 75 },
    { id: 'n2', nodeType: 'warehouse', defenseLevel: 2, energyUpkeep: 40, outputPerMin: 40 },
  ],
  isCapitalProvince: false,
});

assert(
  upkeepNormal.overexpansionPenaltyPercent === 0.0 && upkeepNormal.finalUpkeepEc === upkeepNormal.totalBaseUpkeepEc,
  'Upkeep Territorial Normal: Cero Penalización con r <= 1.0',
  `Admin Ratio: ${upkeepNormal.adminRatio} <= 1.0 -> Penalización: ${upkeepNormal.overexpansionPenaltyPercent}%.`
);

// Caso B: Clan en provincia capital (multiplicador de producción masivo 2.0x)
const upkeepCapital = TerritorialUpkeepEngine.calculateClanTerritorialUpkeep({
  clanId: 'clan-emperor',
  adminCapacity: 10,
  controlledProvincesCount: 2,
  nodes: [
    { id: 'n-cap', nodeType: 'capital_citadel', defenseLevel: 5, energyUpkeep: 120, outputPerMin: 120 },
  ],
  isCapitalProvince: true,
  activeWeather: 'clear',
});

assert(
  upkeepCapital.productionMultiplier === 2.0,
  'Multiplicador de Producción Masivo en Capital Nacional (2.00x)',
  `Producción en Capital: Multiplicador final = ${upkeepCapital.productionMultiplier}x.`
);

// Caso C: Sobre-expansión severa (r = 1.5)
const penaltyAt1_5 = TerritorialUpkeepEngine.calculateOverexpansionPenalty(1.5, false);
assert(
  Math.abs(penaltyAt1_5 - (0.15 + (2 / 3) * (1.5 - 1.3))) < 0.001,
  'Ecuación por Tramos de Sobre-Expansión Imperial Psi_Over(1.50)',
  `Penalización calculada: ${(penaltyAt1_5 * 100).toFixed(2)}% en Tramo III.`
);

// Caso D: Mitigación de IND-T4
const penaltyWithIndT4 = TerritorialUpkeepEngine.calculateOverexpansionPenalty(1.2, true);
assert(
  penaltyWithIndT4 === 0.0,
  'Mitigación de Sobre-Expansión con Perk IND-T4 en Tramo II (r = 1.20)',
  'IND-T4 otorga inmunidad completa en el tramo de tensión administrativa.'
);

// ------------------------------------------------------------------------------
// PRUEBA 11: MOTOR DE GUARNICIONES IA ESCALABLES Y REBALANCEO
// ------------------------------------------------------------------------------
import { GarrisonAIEngine } from '@domains/tactics';

const specL1 = GarrisonAIEngine.getSpec(1);
const specL5 = GarrisonAIEngine.getSpec(5);

assert(
  specL1.aiEngineTier === 'easy' && specL1.baseHourlyUpkeepEc === 0,
  'Guarnición Nivel 1: Milicia Gratuita (Tier easy)',
  'La milicia básica no requiere mantenimiento horario.'
);

assert(
  specL5.aiEngineTier === 'mcts_legendary' && specL5.baseSupplyPoolChassis === 85 && specL5.difficultyMultiplier === 3.0,
  'Guarnición Nivel 5: Gran Mariscal Búnker Implacable (Tier mcts_legendary)',
  '85 chasis en pool, multiplicador de dificultad 3.0x y MCTS con heatmaps.'
);

const rebalanceSuccess = GarrisonAIEngine.calculateRebalance(1, 3, 25000);
assert(
  rebalanceSuccess.isValid === true && rebalanceSuccess.upgradeCostEc === 18000,
  'Modo Balanceador: Rebalance de Inversión Nv.1 a Nv.3',
  `Coste de 18,000 EC aprobado (fondos: 25,000 EC). Delta pool: +${rebalanceSuccess.supplyPoolCapacityDelta} chasis.`
);

const rebalanceFail = GarrisonAIEngine.calculateRebalance(1, 4, 10000);
assert(
  rebalanceFail.isValid === false,
  'Modo Balanceador: Rechazo por Créditos Insuficientes',
  `Rechazado correctamente: ${rebalanceFail.error}`
);

const attritionCheck = GarrisonAIEngine.checkAttritionDowngrade(4, 0);
assert(
  attritionCheck.needsDowngrade === true && attritionCheck.effectiveLevel === 1,
  'Degradación por Desgaste: Chasis Agotados (Pool = 0 -> Nivel 1)',
  'La guarnición colapsa a Milicia Local por falta física de unidades.'
);

// ------------------------------------------------------------------------------
// PRUEBA 12: ARQUITECTURA DE 3 CAPAS, MOTOR POLÍTICO PROJECT ALICE (VENEZUELA) & BARK STELLA
// ------------------------------------------------------------------------------
import {
  politicalAliceEngine,
  THREE_LAYER_ARCHITECTURE,
  CANONICAL_VENEZUELA_REGIONS,
} from '@domains/world';
import { barkEngine } from '@domains/game-feel';

politicalAliceEngine.resetTheaterState();

const playableVeRegions = CANONICAL_VENEZUELA_REGIONS.filter(r => r.isPlayable);
const bufferVeRegions = CANONICAL_VENEZUELA_REGIONS.filter(r => !r.isPlayable);

assert(
  THREE_LAYER_ARCHITECTURE.layer1PoliticalMetagame.enabled === true &&
    THREE_LAYER_ARCHITECTURE.layer2TacticalCombat.enabled === false &&
    THREE_LAYER_ARCHITECTURE.layer3BarkEngine.singleTestSubjectCommanderId === 'stella',
  'Arquitectura de 3 Capas: Capa 1 Política ON, Capa 2 Batalla OFF, Capa 3 Sujeto Único Stella',
  'El sistema aisla la implicación política en el mapa y deshabilita el combate táctico.'
);

assert(
  playableVeRegions.length === 24 && bufferVeRegions.length === 7,
  'Topología Canónica Teatro Venezuela: 24 Regiones Soberanas + 7 Zonas Buffer',
  `Playable: ${playableVeRegions.length} (REG_VE_01..24), Buffers: ${bufferVeRegions.length} (BUF_CO/BR/GY/TT/CW).`
);

const bufferAttackAttempt = politicalAliceEngine.executePoliticalSiegeOperation('BUF_CO_01');
assert(
  bufferAttackAttempt.success === false &&
    bufferAttackAttempt.message.includes('SECTOR FUERA DEL TEATRO OPERACIONAL DE FASE 1'),
  'Candado Fronterizo de Fase 1 sobre Zonas de Amortiguación (is_playable = false)',
  bufferAttackAttempt.message
);

const siegeCojedes = politicalAliceEngine.executePoliticalSiegeOperation('REG_VE_20');
assert(
  siegeCojedes.success === true && siegeCojedes.tcpDamageDealt >= 2000,
  'Operación de Asedio Político Autónomo en Región Adyacente (Cojedes REG_VE_20)',
  `Daño TCP infligido: -${siegeCojedes.tcpDamageDealt} TCP -> Restante: ${siegeCojedes.remainingTcp} TCP.`
);

const lobbyBarkCheck = barkEngine.getLobbyContextualBark({
  commanderId: 'volkov', // Incluso si se solicita otro comandante, Capa 3 fuerza al sujeto de prueba 'stella'
  intent: 'commander_poke',
  pokeCounter: 1,
});
const optMetricsAfter = barkEngine.recordUserPokeOptimization();

assert(
  lobbyBarkCheck.commanderId === 'stella' && optMetricsAfter.testSubjectCommanderId === 'stella',
  'Capa 3 Bark Engine: Bloqueo en Sujeto de Prueba Único (Mayor Stella) y Auto-Optimización',
  `Comandante devuelto: ${lobbyBarkCheck.commanderId} (${lobbyBarkCheck.commanderName}) • Eficacia adaptativa: ${optMetricsAfter.adaptiveScorePercent}%.`
);

console.log('------------------------------------------------------------------------------');
console.log(`RESUMEN SUITE METAJUEGO V2: ${passedTests}/${totalTests} PASARON (100% ÉXITO)`);
console.log('==============================================================================');
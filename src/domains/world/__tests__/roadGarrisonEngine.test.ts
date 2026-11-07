import assert from 'node:assert';
import { roadGarrisonEngine, ClanTreasury } from '@domains/world';
import { roadNetworkEngine } from '@domains/world';

console.log('==============================================================================');
console.log('TEST SUITE: MOTOR DE GUARNICIONES IA, DOCTRINAS 2026, KILLZONES Y RELEVO');
console.log('==============================================================================');

// Tesoros de prueba
const ferroTreasury: ClanTreasury = { clanId: 'clan-ferro', energyCredits: 100000 };
const orinocoTreasury: ClanTreasury = { clanId: 'clan-orinoco', energyCredits: 100000 };

// -----------------------------------------------------------------------------
// TEST 1: Despliegue Estándar y deducción de costes
// -----------------------------------------------------------------------------
const deployRes1 = roadGarrisonEngine.deployGarrison(
  'node-la-salina',
  'seg-intercomunal-ambrosio-salina',
  'clan-ferro',
  2,
  ferroTreasury,
  'standard_infantry'
);

console.log('[TEST 1] Despliegue en La Salina:', deployRes1);
assert(deployRes1.success === true, 'El despliegue debe ser exitoso');
assert(deployRes1.garrison?.tierLevel === 2, 'El nivel de la guarnición debe ser 2');
assert(deployRes1.garrison?.doctrine === 'standard_infantry', 'Doctrina debe ser standard_infantry');
assert(deployRes1.garrison?.maxHp === 2500, 'HP máximo de nivel 2 debe ser 2500');
assert(ferroTreasury.energyCredits === 96000, 'Se debieron deducir 4000 EC del tesoro');
console.log('✅ [PASSED] Test 1: Despliegue de guarnición y deducción de coste inicial verificado.');

// -----------------------------------------------------------------------------
// TEST 2: Doctrina 'anti_armor_ditch' (Zanja antitanque y estrangulamiento de throughput)
// -----------------------------------------------------------------------------
const deployAntiArmor = roadGarrisonEngine.deployGarrison(
  'node-cabimas-centro',
  'seg-salina-centro',
  'clan-ferro',
  2,
  ferroTreasury,
  'anti_armor_ditch'
);

assert(deployAntiArmor.success === true);
assert(deployAntiArmor.garrison?.doctrine === 'anti_armor_ditch');

const segSalinaCentro = roadNetworkEngine.getSegment('seg-salina-centro');
assert(segSalinaCentro !== undefined);
assert(
  segSalinaCentro.currentThroughput === 25,
  `El throughput debe reducirse al 25% por la zanja antitanque (obtenido: ${segSalinaCentro.currentThroughput}%)`
);
console.log('✅ [PASSED] Test 2: Doctrina anti_armor_ditch frena el throughput del segmento al 25%.');

// -----------------------------------------------------------------------------
// TEST 3: Doctrina 'ew_jammer_bubble' (Inhibición C4ISR y ceguera de radar hostil)
// -----------------------------------------------------------------------------
const deployEW = roadGarrisonEngine.deployGarrison(
  'node-puente-urdaneta',
  'seg-puente-cabimas-norte',
  'clan-ferro',
  4,
  ferroTreasury,
  'ew_jammer_bubble'
);

assert(deployEW.success === true);
const jammingRadius = roadGarrisonEngine.getGarrisonJammingRadiusKm(deployEW.garrison!.id);
assert(jammingRadius === 7.0, `Radio EW en Tier 4 debe ser 7.0 km (obtenido: ${jammingRadius})`);

// Coordenadas cercanas a Puente Urdaneta (a ~2 km)
const jammedCheck = roadGarrisonEngine.isAreaJammedByEW([-71.50, 10.58], 'clan-orinoco');
assert(jammedCheck.jammed === true, 'Observador hostil debe estar bajo inhibición EW activa');
assert(jammedCheck.radiusKm === 7.0, 'Radio de burbuja debe ser 7.0 km');

// Misma posición para un aliado no debe sufrir interferencia
const allyCheck = roadGarrisonEngine.isAreaJammedByEW([-71.50, 10.58], 'clan-ferro');
assert(allyCheck.jammed === false, 'El propio clan aliado no sufre ceguera EW');

// Coordenadas lejanas (a 30 km)
const farCheck = roadGarrisonEngine.isAreaJammedByEW([-71.10, 10.20], 'clan-orinoco');
assert(farCheck.jammed === false, 'Posición fuera del radio no debe sufrir inhibición EW');
console.log('✅ [PASSED] Test 3: Doctrina ew_jammer_bubble proyecta 7.0 km de ceguera C4ISR a enemigos.');

// -----------------------------------------------------------------------------
// TEST 4: Doctrina 'c_uas_air_defense' (Intercepción letal a helicópteros y drones)
// -----------------------------------------------------------------------------
const deployCUAS = roadGarrisonEngine.deployGarrison(
  'node-el-barroso',
  'seg-centro-barroso',
  'clan-ferro',
  3,
  ferroTreasury,
  'c_uas_air_defense'
);
assert(deployCUAS.success === true);

// 1. Intercepción a helicóptero de ataque
const heloInterception = roadGarrisonEngine.interceptAerialThreat(deployCUAS.garrison!.id, {
  unitType: 'attack_helicopter',
  hp: 1200,
});
assert(heloInterception.intercepted === true, 'Helicóptero debe ser interceptado');
assert(heloInterception.lethal === true, 'La intercepción debe ser letal');
assert(heloInterception.remainingHp === 0, 'HP restante debe ser 0 tras fuego C-UAS');

// 2. Intercepción a dron de reconocimiento térmico
const droneInterception = roadGarrisonEngine.interceptAerialThreat(deployCUAS.garrison!.id, {
  unitType: 'recon_drone_fpv',
  hp: 350,
});
assert(droneInterception.intercepted === true, 'Dron de reconocimiento debe ser interceptado');
assert(droneInterception.lethal === true, 'La intercepción del dron debe ser letal');
assert(droneInterception.remainingHp === 0, 'HP restante de dron debe ser 0');
console.log('✅ [PASSED] Test 4: Doctrina c_uas_air_defense ejecuta intercepción letal a drones y helicópteros.');

// -----------------------------------------------------------------------------
// TEST 5: Doctrina 'artillery_firebase' (Fuego de apoyo a <= 2 saltos con suministros)
// -----------------------------------------------------------------------------
const deployArtillery = roadGarrisonEngine.deployGarrison(
  'node-cabimas-norte',
  'seg-intercomunal-ambrosio-salina',
  'clan-ferro',
  3,
  ferroTreasury,
  'artillery_firebase'
);
assert(deployArtillery.success === true);

// Segmento contiguo (1 salto): seg-intercomunal-ambrosio-salina
const support1Hop = roadGarrisonEngine.canProvideArtillerySupport(
  deployArtillery.garrison!.id,
  'seg-intercomunal-ambrosio-salina'
);
assert(support1Hop.canSupport === true, 'Debe prestar apoyo a 1 salto');
assert(support1Hop.hops <= 1);

// Segmento a 2 saltos (seg-salina-centro)
const support2Hops = roadGarrisonEngine.canProvideArtillerySupport(
  deployArtillery.garrison!.id,
  'seg-salina-centro'
);
assert(support2Hops.canSupport === true, 'Debe prestar apoyo a 2 saltos');
assert(support2Hops.hops <= 2);

// Segmento a más de 2 saltos (seg-carretera-f-lara-zulia)
const supportDistant = roadGarrisonEngine.canProvideArtillerySupport(
  deployArtillery.garrison!.id,
  'seg-carretera-f-lara-zulia'
);
assert(supportDistant.canSupport === false, 'No debe prestar apoyo a > 2 saltos');

// Si la guarnición queda aislada sin suministros
const artGar = roadGarrisonEngine.getGarrisonById(deployArtillery.garrison!.id)!;
artGar.isIsolatedFromSupply = true;
const supportIsolated = roadGarrisonEngine.canProvideArtillerySupport(
  deployArtillery.garrison!.id,
  'seg-intercomunal-ambrosio-salina'
);
assert(supportIsolated.canSupport === false, 'Sin suministros no puede prestar fuego de apoyo');
artGar.isIsolatedFromSupply = false; // Restaurar
console.log('✅ [PASSED] Test 5: Doctrina artillery_firebase presta fuego a 2 saltos condicionado a suministros.');

// -----------------------------------------------------------------------------
// TEST 6: Evaluación de Zonas de Muerte (Killzones) y Riesgo de Emboscada
// -----------------------------------------------------------------------------
// 6.1 Pista de tierra con throughput bajo (20%) -> Killzone extrema
const dirtSegmentId = 'seg-test-dirt';
roadNetworkEngine.addSegment({
  id: dirtSegmentId,
  name: 'Trocha Rural Descampada',
  fromNodeId: 'node-el-barroso',
  toNodeId: 'node-cabimas-carretera-k',
  roadClass: 'rural_track',
  lengthKm: 4.5,
  surfaceQuality: 'dirt',
  throughputCapacity: 100,
  currentThroughput: 20, // Muy bajo throughput
  controllerClanId: null,
  isBlocked: false,
});

const killzoneEval = roadGarrisonEngine.evaluateRoadAmbushRisk(dirtSegmentId);
console.log('[TEST 6.1] Evaluación Killzone Vía de Tierra:', killzoneEval);
assert(killzoneEval.isKillzone === true, 'Vía dirt con throughput bajo debe ser una Killzone');
assert(killzoneEval.riskLevel === 'EXTREME_KILLZONE', 'Nivel de riesgo debe ser EXTREME_KILLZONE');
assert(killzoneEval.iedVulnerabilityMultiplier >= 2.0, 'Multiplicador IED debe ser elevado (>= 2.0x)');
assert(killzoneEval.ambushDamageBonusPercent >= 50, 'Bono de emboscada debe ser >= +50%');

// 6.2 Autopista de concreto reforzado con 100% throughput -> Bajo riesgo
const highwayEval = roadGarrisonEngine.evaluateRoadAmbushRisk(
  'seg-puente-cabimas-norte',
  'highway',
  'reinforced_concrete'
);
console.log('[TEST 6.2] Evaluación Autopista Blindada:', highwayEval);
assert(highwayEval.isKillzone === false, 'Autopista de concreto no es killzone');
assert(highwayEval.riskLevel === 'LOW', 'Nivel de riesgo debe ser LOW');
console.log('✅ [PASSED] Test 6: Cálculo de Killzones, riesgo de emboscada y vulnerabilidad IED verificado.');

// -----------------------------------------------------------------------------
// TEST 7: Cola de Relevo Operacional (2 Titulares + 2 Reservas de Apoyo +10%)
// -----------------------------------------------------------------------------
const battle = roadGarrisonEngine.initiateRoadBattle(
  'node-la-salina',
  'seg-intercomunal-ambrosio-salina',
  'clan-orinoco',
  4000
);

// 2 Titulares activos
const cmd1 = roadGarrisonEngine.joinBattleAsCommander(battle.battleId, 'cmd-ferro-1', 'defender');
const cmd2 = roadGarrisonEngine.joinBattleAsCommander(battle.battleId, 'cmd-ferro-2', 'defender');
assert(cmd1.success === true && cmd1.role === 'active', 'Comandante 1 debe ser titular');
assert(cmd2.success === true && cmd2.role === 'active', 'Comandante 2 debe ser titular');

// 3er y 4to ingresan a la reserva de apoyo (+10% potencia de fuego)
const cmd3 = roadGarrisonEngine.joinBattleAsCommander(battle.battleId, 'cmd-ferro-3', 'defender');
const cmd4 = roadGarrisonEngine.joinBattleAsCommander(battle.battleId, 'cmd-ferro-4', 'defender');
assert(cmd3.success === true && cmd3.role === 'reserve', 'Comandante 3 debe entrar en reserva');
assert(cmd4.success === true && cmd4.role === 'reserve', 'Comandante 4 debe entrar en reserva');

// 5to comandante debe ser rechazado
const cmd5 = roadGarrisonEngine.joinBattleAsCommander(battle.battleId, 'cmd-ferro-5', 'defender');
assert(cmd5.success === false, 'El 5to comandante debe ser rechazado por límite');

// Prueba de Relevo Operacional: cmd1 se retira y cmd3 es promovido automáticamente a titular
const relief = roadGarrisonEngine.relieveCommander(battle.battleId, 'cmd-ferro-1', 'defender');
assert(relief.success === true, 'El relevo debe ser exitoso');
assert(relief.promotedUserId === 'cmd-ferro-3', 'cmd-ferro-3 debe ser promovido de la reserva a titular');
assert(battle.defenderReinforcingPlayers.includes('cmd-ferro-3'), 'cmd-ferro-3 debe figurar entre los activos');
assert(!battle.defenderReservePlayers?.includes('cmd-ferro-3'), 'cmd-ferro-3 ya no debe estar en la reserva');
console.log('✅ [PASSED] Test 7: Cola de relevo operacional (2 activos, 2 reservas +10% y rotación) validada.');

// -----------------------------------------------------------------------------
// TEST 8: Resolución determinista de batalla con bonos de orugas y artillería
// -----------------------------------------------------------------------------
let simBattle = battle;
for (let i = 0; i < 25; i++) {
  if (simBattle.status !== 'in_progress') break;
  simBattle = roadGarrisonEngine.resolveBattleTick(battle.battleId, 'treads')!;
}
console.log(`[TEST 8] Desenlace de batalla: ${simBattle.status} (Atacante HP: ${simBattle.attackerHp}, Defensor HP: ${simBattle.defenderHp})`);
assert(simBattle.status === 'attacker_victory' || simBattle.status === 'defender_victory');
console.log('✅ [PASSED] Test 8: Simulación de combate resuelta exitosamente con modificadores doctrinales.');

// -----------------------------------------------------------------------------
// TEST 9: Upkeep horario y atrición por inanición de suministros
// -----------------------------------------------------------------------------
const treasuries = new Map<string, ClanTreasury>([
  ['clan-ferro', ferroTreasury],
  ['clan-orinoco', orinocoTreasury],
]);
const activeHubs = new Set<string>(['node-la-salina']);

const upkeepTick = roadGarrisonEngine.processHourlyUpkeepTick(treasuries, activeHubs);
console.log('[TEST 9] Upkeep Tick:', upkeepTick);
assert(upkeepTick.totalUpkeepDeducted > 0, 'Debe deducirse upkeep de las guarniciones activas');

// Si aislamos completamente un nodo sin hubs de suministro
const isolatedHubs = new Set<string>(['node-non-existent-hub']);
const isolatedTick = roadGarrisonEngine.processHourlyUpkeepTick(treasuries, isolatedHubs);
assert(isolatedTick.isolatedGarrisons.length > 0, 'Las guarniciones desconectadas deben sufrir aislamiento');
console.log('✅ [PASSED] Test 9: Ciclo de cobro de upkeep y atrición por inanición verificado.');

console.log('==============================================================================');
console.log('TODAS LAS PRUEBAS DE DOCTRINAS 2026, KILLZONES Y RELEVO OPERACIONAL SUPERADAS (9/9)');
console.log('==============================================================================');
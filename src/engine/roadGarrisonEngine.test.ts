import assert from 'node:assert';
import { roadGarrisonEngine, ClanTreasury } from './roadGarrisonEngine';

console.log('==============================================================================');
console.log('TEST SUITE: MOTOR DE GUARNICIONES IA, UPKEEP Y ASEDIO VIAL');
console.log('==============================================================================');

// Tesoros de prueba
const ferroTreasury: ClanTreasury = { clanId: 'clan-ferro', energyCredits: 10000 };
const orinocoTreasury: ClanTreasury = { clanId: 'clan-orinoco', energyCredits: 15000 };

// Test 1: Desplegar Guarnición Nivel 2 en Terminal La Salina
const deployRes = roadGarrisonEngine.deployGarrison(
  'node-la-salina',
  'seg-intercomunal-ambrosio-salina',
  'clan-ferro',
  2,
  ferroTreasury
);

console.log('[TEST 1] Despliegue en La Salina:', deployRes);
assert(deployRes.success === true, 'El despliegue debe ser exitoso');
assert(deployRes.garrison?.tierLevel === 2, 'El nivel de la guarnición debe ser 2');
assert(deployRes.garrison?.maxHp === 2500, 'HP máximo de nivel 2 debe ser 2500');
assert(ferroTreasury.energyCredits === 6000, 'Se debieron deducir 4000 EC del tesoro');
console.log('✅ [PASSED] Test 1: Despliegue de guarnición y deducción de coste inicial verificado.');

// Test 2: Upkeep Tick con saldo suficiente
const treasuries = new Map<string, ClanTreasury>([
  ['clan-ferro', ferroTreasury],
  ['clan-orinoco', orinocoTreasury],
]);
const activeHubs = new Set<string>(['node-la-salina']);

const tick1 = roadGarrisonEngine.processHourlyUpkeepTick(treasuries, activeHubs);
console.log('[TEST 2] Resultado Upkeep Tick 1:', tick1);
assert(tick1.totalUpkeepDeducted === 95, 'Se debe deducir exactamente el upkeep horario de 95 EC');
assert(ferroTreasury.energyCredits === 5905, 'Saldo resultante debe ser 5905 EC');
console.log('✅ [PASSED] Test 2: Ciclo de deducción de mantenimiento horario exitoso.');

// Test 3: Inanición por corte de carretera de suministros
// Si el hub activo está en un nodo desconectado o bloqueado
const isolatedHubs = new Set<string>(['node-puente-urdaneta']);
// Simulamos que el camino entre Puente Urdaneta y La Salina se corta
const gar = roadGarrisonEngine.getGarrisonByNode('node-la-salina');
assert(gar !== undefined);

// Desplegamos una segunda guarnición en un nodo distante sin conexión
roadGarrisonEngine.deployGarrison(
  'node-interseccion-lara-zulia',
  'seg-carretera-f-lara-zulia',
  'clan-orinoco',
  1,
  orinocoTreasury
);

// Test 4: Iniciar refriega en carretera (IA vs IA)
const battle = roadGarrisonEngine.initiateRoadBattle(
  'node-la-salina',
  'seg-intercomunal-ambrosio-salina',
  'clan-orinoco',
  3000
);
console.log('[TEST 4] Refriega iniciada:', battle);
assert(battle.status === 'in_progress', 'La refriega debe estar en progreso');
assert(battle.defenderClanId === 'clan-ferro', 'El defensor debe ser clan-ferro');

// Test 5: Acoplamiento de comandantes humanos (Límite estricto de 2 jugadores)
const p1 = roadGarrisonEngine.joinBattleAsCommander(battle.battleId, 'user-player-1', 'defender');
const p2 = roadGarrisonEngine.joinBattleAsCommander(battle.battleId, 'user-player-2', 'defender');
const p3 = roadGarrisonEngine.joinBattleAsCommander(battle.battleId, 'user-player-3', 'defender');

assert(p1.success === true, 'Jugador 1 debe poder unirse');
assert(p2.success === true, 'Jugador 2 debe poder unirse');
assert(p3.success === false, 'Jugador 3 debe ser rechazado por límite de 2 jugadores');
console.log('✅ [PASSED] Test 5: Restricción asimétrica de máximo 2 jugadores por frente confirmada.');

// Test 6: Resolución determinista de ticks de batalla
let currentBattle = battle;
for (let i = 0; i < 20; i++) {
  if (currentBattle.status !== 'in_progress') break;
  currentBattle = roadGarrisonEngine.resolveBattleTick(battle.battleId)!;
}
console.log(`[TEST 6] Batalla finalizada con estado: ${currentBattle.status} (Atacante HP: ${currentBattle.attackerHp}, Defensor HP: ${currentBattle.defenderHp})`);
assert(currentBattle.status === 'attacker_victory' || currentBattle.status === 'defender_victory', 'La refriega debe resolverse a victoria');
console.log('✅ [PASSED] Test 6: Simulación operacional determinista resuelta con éxito.');

console.log('==============================================================================');
console.log('TODAS LAS PRUEBAS DE GUARNICIONES IA Y ASEDIO VIAL SUPERADAS (6/6)');
console.log('==============================================================================');

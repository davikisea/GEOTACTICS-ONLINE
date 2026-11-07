import assert from 'node:assert';
import { fiefBuildingService, ClanTreasuryState } from './fiefBuildingService';

console.log('==============================================================================');
console.log('TEST SUITE: SERVICIO DE FEUDOS URBANOS Y EDIFICIOS INDUSTRIALES');
console.log('==============================================================================');

// Test 1: Comprobar feudos iniciales en Cabimas
const fiefs = fiefBuildingService.getAllFiefs();
console.log(`[TEST 1] Feudos iniciales cargados en Cabimas: ${fiefs.length}`);
assert(fiefs.length >= 3, 'Deben existir al menos 3 feudos en Cabimas');

const salinaFief = fiefBuildingService.getFief('fief-cabimas-salina');
assert(salinaFief !== undefined, 'El feudo de La Salina debe existir');
assert(salinaFief.taxRatePercent === 10.0, 'El arancel municipal de La Salina debe ser 10.0%');
console.log('✅ [PASSED] Test 1: Feudos de Cabimas verificados con aranceles municipales.');

// Test 2: Comprobar edificios industriales iniciales en coordenadas
const buildings = fiefBuildingService.getAllBuildings();
console.log(`[TEST 2] Edificios industriales iniciales: ${buildings.length}`);
assert(buildings.length >= 5, 'Deben existir al menos 5 edificios semilleros');

const microchips = fiefBuildingService.getBuilding('bld-universidad-microchips');
assert(microchips !== undefined, 'El taller de microchips debe existir');
assert(microchips.buildingType === 'microchip_foundry');
console.log('✅ [PASSED] Test 2: Edificios industriales iniciales posicionados en coordenadas reales.');

// Test 3: Colocación de nuevo edificio con fondos suficientes y adyacencia a carretera
const treasury: ClanTreasuryState = { clanId: 'clan-ferro', energyCredits: 25000 };
const placeSuccess = fiefBuildingService.placeBuilding(
  {
    fiefId: 'fief-cabimas-centro',
    clanId: 'clan-ferro',
    buildingType: 'logistics_silo',
    location: [-71.448, 10.388], // En Cabimas Centro, adyacente a la Av. Miraflores
  },
  treasury
);

console.log('[TEST 3] Colocación válida en Cabimas Centro:', placeSuccess);
assert(placeSuccess.success === true, 'La colocación debe ser exitosa');
assert(placeSuccess.building?.buildingType === 'logistics_silo');
assert(treasury.energyCredits === 19000, 'Se debieron deducir 6000 EC del tesoro');
console.log('✅ [PASSED] Test 3: Validación y deducción de colocación adyacente a carretera exitosa.');

// Test 4: Rechazo de colocación por distancia excesiva a carretera (> 150m)
const placeFailDist = fiefBuildingService.placeBuilding(
  {
    fiefId: 'fief-cabimas-centro',
    clanId: 'clan-ferro',
    buildingType: 'radar_station',
    location: [-71.200, 10.100], // Coordenadas remotas sin carretera
  },
  treasury
);

console.log('[TEST 4] Rechazo por lejanía a carretera:', placeFailDist);
assert(placeFailDist.success === false, 'Debe rechazar colocación no adyacente a vía');
assert(placeFailDist.reason?.includes('adyacente a una carretera'), 'El motivo debe indicar lejanía vial');
console.log('✅ [PASSED] Test 4: Regla de adyacencia vial (<= 150m) validada estrictamente.');

// Test 5: Rechazo de colocación por fondos insuficientes
const poorTreasury: ClanTreasuryState = { clanId: 'clan-andes', energyCredits: 500 };
const placeFailFunds = fiefBuildingService.placeBuilding(
  {
    fiefId: 'fief-cabimas-salina',
    clanId: 'clan-andes',
    buildingType: 'refinery', // Cuesta 12000 EC
    location: [-71.458, 10.395],
  },
  poorTreasury
);

console.log('[TEST 5] Rechazo por fondos insuficientes:', placeFailFunds);
assert(placeFailFunds.success === false, 'Debe rechazar por falta de fondos');
console.log('✅ [PASSED] Test 5: Restricción presupuestaria de colocación comprobada.');

// Test 6: Ciclo horario de mantenimiento de edificios (Upkeep Tick)
const treasuriesMap = new Map<string, ClanTreasuryState>([
  ['clan-ferro', treasury],
  ['clan-orinoco', { clanId: 'clan-orinoco', energyCredits: 10000 }],
]);

const tickRes = fiefBuildingService.processHourlyBuildingTick(treasuriesMap);
console.log('[TEST 6] Resultado Upkeep Tick de Edificios:', tickRes);
assert(tickRes.operatingBuildingsCount >= 5, 'Los edificios con fondos deben continuar operando');
assert(tickRes.totalUpkeepDeducted > 0, 'Se debe haber cobrado upkeep');
console.log('✅ [PASSED] Test 6: Mantenimiento horario de estructuras industriales validado.');

// Test 7: Generación de GeoJSON para MapLibre GL
const geojson = fiefBuildingService.toGeoJSON();
assert(geojson.type === 'FeatureCollection');
assert(geojson.features.length >= 6);
console.log(`✅ [PASSED] Test 7: GeoJSON de estructuras industriales generado con ${geojson.features.length} features.`);

console.log('==============================================================================');
console.log('TODAS LAS PRUEBAS DE FEUDOS URBANOS Y EDIFICIOS COMPLETADAS (7/7)');
console.log('==============================================================================');

import { describe, it } from 'node:test';
import assert from 'node:assert';
import { roadNetworkEngine } from './roadNetworkEngine';

console.log('==============================================================================');
console.log('TEST SUITE: MOTOR DE RED VIAL, GRAFO DE CARRETERAS Y A* CABIMAS');
console.log('==============================================================================');

// Test 1: Verificar carga de nodos clave del corredor Cabimas
const allNodes = roadNetworkEngine.getAllNodes();
console.log(`[TEST 1] Nodos cargados en el Teatro Cabimas: ${allNodes.length}`);
assert(allNodes.length >= 10, 'Deben existir al menos 10 nodos en el Teatro Cabimas');

const salinaNode = roadNetworkEngine.getNode('node-la-salina');
assert(salinaNode !== undefined, 'El nodo de Terminal La Salina debe existir');
assert(salinaNode.poiType === 'oil_terminal', 'La Salina debe ser de tipo oil_terminal');
console.log('✅ [PASSED] Test 1: Nodos y POIs del corredor Cabimas verificados correctamente.');

// Test 2: Búsqueda de camino A* entre Cabimas Norte y Terminal La Salina
const route1 = roadNetworkEngine.findOptimalRoadRoute('node-cabimas-norte', 'node-la-salina');
console.log('[TEST 2] Ruta Cabimas Norte -> La Salina:', route1);
assert(route1.found === true, 'Debe encontrarse una ruta directa por carretera');
assert(route1.pathNodeIds.length === 2, 'Ruta debe tener 2 nodos contiguos');
assert(route1.totalDistanceKm === 3.2, 'Distancia debe ser exactamente 3.2 km');
console.log('✅ [PASSED] Test 2: Ruta A* directa por Av. Intercomunal calculada con éxito.');

// Test 3: Búsqueda de ruta transversal: Puente Urdaneta -> Refinería Ciudad Ojeda
const route2 = roadNetworkEngine.findOptimalRoadRoute('node-puente-urdaneta', 'node-ciudad-ojeda');
console.log(`[TEST 3] Ruta Puente Urdaneta -> Ciudad Ojeda: ${route2.totalDistanceKm} km en ${route2.totalEstimatedHours} horas`);
assert(route2.found === true, 'Debe existir ruta entre el Puente Urdaneta y Ciudad Ojeda');
assert(route2.pathNodeIds[0] === 'node-puente-urdaneta');
assert(route2.pathNodeIds[route2.pathNodeIds.length - 1] === 'node-ciudad-ojeda');
console.log('✅ [PASSED] Test 3: Ruta A* continental completa a través del eje petrolero de la COL superada.');

// Test 4: Bloqueo de ruta por Guarnición Hostil
const hostileGarrisons = new Set<string>(['node-punta-gorda']);
const routeBlocked = roadNetworkEngine.findOptimalRoadRoute(
  'node-cabimas-centro',
  'node-tia-juana',
  'clan-ferro',
  hostileGarrisons
);
// Al estar Punta Gorda bloqueado por guarnición enemiga, la ruta debe desviarse por la Carretera Lara-Zulia si existe alternativa o fallar
console.log('[TEST 4] Ruta con guarnición hostil en Punta Gorda:', routeBlocked.found, routeBlocked.pathNodeIds);
assert(!routeBlocked.pathNodeIds.includes('node-punta-gorda') || !routeBlocked.found, 'La ruta no debe transitar libremente por un nodo bloqueado');
console.log('✅ [PASSED] Test 4: Intercepción de ruta por guarnición hostil validada.');

// Test 5: Snapping analítico de coordenadas geográficas al nodo más cercano
const testCoord: [number, number] = [-71.460, 10.392]; // Cerca de La Salina
const snap = roadNetworkEngine.snapCoordinatesToNearestNode(testCoord);
console.log('[TEST 5] Snapping de [-71.460, 10.392]:', snap.nearestNode?.name, `(Distancia: ${snap.distanceKm} km)`);
assert(snap.nearestNode?.id === 'node-la-salina', 'Debe hacer snapping al Terminal La Salina');
assert(snap.distanceKm < 1.0, 'Distancia de snapping debe ser menor a 1 km');
console.log('✅ [PASSED] Test 5: Snapping analítico WGS84 verificado.');

// Test 6: Conversión a GeoJSON dinámico para MapLibre GL
const geojson = roadNetworkEngine.toGeoJSON();
assert(geojson.type === 'FeatureCollection', 'Debe ser FeatureCollection');
assert(geojson.features.length >= 10, 'Debe contener todas las vías como LineString');
console.log(`✅ [PASSED] Test 6: Generación GeoJSON para MapLibre GL con ${geojson.features.length} segmentos viales.`);

console.log('==============================================================================');
console.log('TODAS LAS PRUEBAS DE LA RED VIAL Y A* CABIMAS COMPLETADAS CON ÉXITO (6/6)');
console.log('==============================================================================');

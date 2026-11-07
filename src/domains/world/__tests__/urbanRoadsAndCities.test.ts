/**
 * ==============================================================================
 * TEST SUITE: RED VIAL URBANA REAL, CIUDADES Y UNIDADES OPERACIONALES (SPRINT 2)
 * ==============================================================================
 * Conforme a @game-dev-quality-gate y docs/00_GEOTACTICS_ONLINE_MASTER_SPEC.md
 * Valida la fidelidad geográfica real de avenidas, ciudades y despliegue a z=10.
 * ==============================================================================
 */

import fs from 'fs';
import path from 'path';
import { ZOOM_OPERACIONAL } from '@domains/world';
import { operationalUnitsService } from '@domains/tactics';

function assert(condition: boolean, msg: string) {
  if (!condition) {
    console.error(`❌ [FAILED]: ${msg}`);
    process.exit(1);
  }
}

console.log('==============================================================================');
console.log('EJECUTANDO SUITE: RED VIAL URBANA REAL, CIUDADES Y DESPLIEGUE A ZOOM X10');
console.log('==============================================================================\n');

let passedTests = 0;

try {
  // ----------------------------------------------------------------------------
  // SUITE 1: Verificación de Umbral Canónico de Zoom x10
  // ----------------------------------------------------------------------------
  console.log('--- SUITE 1: UMBRAL CANÓNICO DE VISTA OPERACIONAL URBANA ---');

  assert(ZOOM_OPERACIONAL === 10.0, 'ZOOM_OPERACIONAL debe ser exactamente 10.0 para conmutar a la Vista 2');
  console.log(`✅ [PASSED] Test 1.1: Umbral operacional verificado a z=${ZOOM_OPERACIONAL}`);
  passedTests++;

  // ----------------------------------------------------------------------------
  // SUITE 2: Fidelidad Cartográfica de la Red Vial Urbana Real (OpenStreetMap)
  // ----------------------------------------------------------------------------
  console.log('\n--- SUITE 2: RED VIAL URBANA REAL (AVENIDAS Y CALLES PRINCIPALES) ---');

  const urbanRoadsPath = path.resolve('public/map/theatre_urban_roads.json');
  assert(fs.existsSync(urbanRoadsPath), 'theatre_urban_roads.json debe existir en public/map');

  const urbanRoadsData = JSON.parse(fs.readFileSync(urbanRoadsPath, 'utf8'));
  assert(urbanRoadsData.type === 'FeatureCollection', 'Debe ser un FeatureCollection válido');
  assert(Array.isArray(urbanRoadsData.features) && urbanRoadsData.features.length >= 20, 'Debe contener al menos 20 ejes viales urbanos');

  const roadNames: string[] = urbanRoadsData.features.map((f: any) => f.properties?.name || '');

  // 1. Cabimas
  assert(roadNames.some(n => n.includes('Intercomunal')), 'Debe incluir la Av. Intercomunal de Cabimas');
  assert(roadNames.some(n => n.includes('Avenida 32')), 'Debe incluir la Av. 32 de Cabimas');
  assert(roadNames.some(n => n.includes('Carretera H')), 'Debe incluir la Carretera H de Cabimas');
  assert(roadNames.some(n => n.includes('Carretera K')), 'Debe incluir la Carretera K de Cabimas');
  console.log('✅ [PASSED] Test 2.1: Ejes viales reales de Cabimas verificados (Intercomunal, Av. 32, Carretera H/K)');
  passedTests++;

  // 2. Maracaibo
  assert(roadNames.some(n => n.includes('Bella Vista')), 'Debe incluir Av. Bella Vista de Maracaibo');
  assert(roadNames.some(n => n.includes('Las Delicias')), 'Debe incluir Av. Las Delicias de Maracaibo');
  assert(roadNames.some(n => n.includes('La Limpia')), 'Debe incluir Av. La Limpia de Maracaibo');
  assert(roadNames.some(n => n.includes('Circunvalación 2')), 'Debe incluir la C2 de Maracaibo');
  console.log('✅ [PASSED] Test 2.2: Avenidas principales de Maracaibo verificadas (Bella Vista, Delicias, Limpia, C2)');
  passedTests++;

  // 3. Caracas
  assert(roadNames.some(n => n.includes('Francisco de Miranda')), 'Debe incluir Av. Francisco de Miranda');
  assert(roadNames.some(n => n.includes('Libertador')), 'Debe incluir Av. Libertador');
  assert(roadNames.some(n => n.includes('Baralt')), 'Debe incluir Av. Baralt');
  console.log('✅ [PASSED] Test 2.3: Arterias principales de Caracas verificadas (Miranda, Libertador, Baralt)');
  passedTests++;

  // ----------------------------------------------------------------------------
  // SUITE 3: Catálogo de Ciudades y Metrópolis Reales
  // ----------------------------------------------------------------------------
  console.log('\n--- SUITE 3: CATÁLOGO DE CIUDADES REALES Y COORDENADAS ---');

  const citiesPath = path.resolve('public/map/theatre_cities.json');
  assert(fs.existsSync(citiesPath), 'theatre_cities.json debe existir en public/map');

  const citiesData = JSON.parse(fs.readFileSync(citiesPath, 'utf8'));
  assert(citiesData.type === 'FeatureCollection', 'theatre_cities.json debe ser un FeatureCollection');

  const citiesList = citiesData.features;
  const cityNames: string[] = citiesList.map((f: any) => f.properties?.name || '');

  assert(cityNames.includes('Caracas'), 'Caracas debe figurar en el mapa');
  assert(cityNames.includes('Cabimas'), 'Cabimas debe figurar en el mapa');
  assert(cityNames.includes('Maracaibo'), 'Maracaibo debe figurar en el mapa');
  assert(cityNames.includes('Valencia'), 'Valencia debe figurar en el mapa');
  assert(cityNames.includes('Barquisimeto'), 'Barquisimeto debe figurar en el mapa');

  // Validar coordenadas de Cabimas [-71.45, 10.39]
  const cabimasFeat = citiesList.find((f: any) => f.properties?.name === 'Cabimas');
  const [cabLng, cabLat] = cabimasFeat.geometry.coordinates;
  assert(cabLng < -71.0 && cabLng > -72.0, 'Longitud de Cabimas debe estar en la cuenca del Lago (-71.x)');
  assert(cabLat > 10.0 && cabLat < 10.8, 'Latitud de Cabimas debe estar en 10.x');

  console.log(`✅ [PASSED] Test 3.1: Coordenadas de Cabimas verificadas en [${cabLng}, ${cabLat}]`);
  passedTests++;

  // ----------------------------------------------------------------------------
  // SUITE 4: Unidades Operacionales Desplegadas en el Mapa (x10)
  // ----------------------------------------------------------------------------
  console.log('\n--- SUITE 4: SERVICIO DE UNIDADES OPERACIONALES DESPLEGADAS ---');

  const initialUnits = operationalUnitsService.getAllUnits();
  assert(initialUnits.length >= 5, 'Debe haber al menos 5 unidades operacionales iniciales');

  const cabimasTank = initialUnits.find(u => u.id === 'unit-cab-01');
  assert(!!cabimasTank, 'Debe existir la División Blindada Ferro A-1 en Cabimas');
  assert(cabimasTank!.factionId === 'blue_moon', 'Tanque de Cabimas debe pertenecer a Blue Moon');
  assert(cabimasTank!.hp === 100, 'Tanque nace con 100 HP');

  // Test de despliegue dinámico de nueva unidad operacional
  let unitNotified = false;
  const unsubUnits = operationalUnitsService.subscribe(() => {
    unitNotified = true;
  });

  operationalUnitsService.deployUnit({
    id: 'unit-test-deploy-01',
    name: 'Escuadrón Rápido de Prueba',
    code: 'recon',
    clanId: 'clan-ferro',
    clanTag: 'FERR',
    factionId: 'blue_moon',
    coordinates: [-71.445, 10.392],
    hp: 100,
    maxHp: 100,
    tier: 1,
    status: 'holding',
    callsign: 'PRUEBA-RECON',
    colorHex: '#1D4ED8',
  });

  assert(Boolean(unitNotified), 'El servicio debe notificar a los suscriptores al desplegar');
  const geojsonUnits = operationalUnitsService.toGeoJSON();
  assert(geojsonUnits.type === 'FeatureCollection', 'toGeoJSON() debe ser FeatureCollection');
  assert(geojsonUnits.features.some(f => f.id === 'unit-test-deploy-01'), 'La nueva unidad debe figurar en el GeoJSON');

  // Limpiar unidad de prueba
  operationalUnitsService.removeUnit('unit-test-deploy-01');
  unsubUnits();

  console.log('✅ [PASSED] Test 4.1: Despliegue, notificación y serialización GeoJSON de tropas verificado');
  passedTests++;

  console.log('------------------------------------------------------------------------------');
  console.log(`RESUMEN RED VIAL URBANA, CIUDADES Y UNIDADES SPRINT 2: ${passedTests}/6 PASARON`);
  console.log('✅ TODAS LAS PRUEBAS DE LA VISTA OPERACIONAL (ZOOM X10) SUPERADAS (100% ÉXITO)');
  console.log('==============================================================================\n');
} catch (err) {
  console.error('Error fatal durante la ejecución de pruebas:', err);
  process.exit(1);
}
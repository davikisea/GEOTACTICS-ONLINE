/**
 * ==============================================================================
 * TEST SUITE: ASIGNACIÓN ESPACIAL O(1), DESPLIEGUE Y CONSTRUCCIÓN (SPRINT 3)
 * ==============================================================================
 * Conforme a @game-dev-quality-gate y docs/00_GEOTACTICS_ONLINE_MASTER_SPEC.md §3.3
 * Valida la asignación matemática unívoca a Zoom x15, despliegue de tropas
 * y construcción in-situ de estructuras industriales.
 * ==============================================================================
 */

import { ZOOM_TACTICO, lngLatToGridCoords, gridCoordsToLngLat } from './coordinates';
import { spatialDeploymentService } from '../services/spatialDeploymentService';
import { operationalUnitsService } from '../services/operationalUnitsService';
import { fiefBuildingService } from '../services/fiefBuildingService';

function assert(condition: boolean, msg: string) {
  if (!condition) {
    console.error(`❌ [FAILED]: ${msg}`);
    process.exit(1);
  }
}

console.log('==============================================================================');
console.log('EJECUTANDO SUITE: ASIGNACIÓN ESPACIAL O(1), DESPLIEGUE Y CONSTRUCCIÓN (ZOOM X15)');
console.log('==============================================================================\n');

let passedTests = 0;

try {
  // ----------------------------------------------------------------------------
  // SUITE 1: Constante Canónica y Asignación Espacial O(1)
  // ----------------------------------------------------------------------------
  console.log('--- SUITE 1: ASIGNACIÓN ESPACIAL ANALÍTICA O(1) (WGS84 -> GRID) ---');

  assert(ZOOM_TACTICO === 15.0, 'ZOOM_TACTICO debe ser exactamente 15.0 para el Microjuego');
  console.log(`✅ [PASSED] Test 1.1: Umbral de microjuego táctico verificado a z=${ZOOM_TACTICO}`);
  passedTests++;

  // Coordenadas de prueba en Cabimas: [-71.4550, 10.3950]
  const cabimasCoord: [number, number] = [-71.4550, 10.3950];
  const assignment = spatialDeploymentService.getSpatialAssignment(cabimasCoord);

  assert(Array.isArray(assignment.sector) && assignment.sector.length === 2, 'Sector debe ser [x, y]');
  assert(Array.isArray(assignment.cell) && assignment.cell.length === 2, 'Celda debe ser [x, y]');
  assert(assignment.cell[0] >= 0 && assignment.cell[0] < 20, 'Celda X debe estar en [0, 19]');
  assert(assignment.cell[1] >= 0 && assignment.cell[1] < 20, 'Celda Y debe estar en [0, 19]');
  assert(assignment.formattedCoordinate.includes('SEC'), 'Debe formatear la coordenada con SEC y CELL');
  assert(assignment.defenseCoverPercent >= 10 && assignment.defenseCoverPercent <= 40, 'Cobertura entre 10% y 40%');
  assert(assignment.movementCost >= 1, 'Coste de movimiento debe ser >= 1');

  console.log(`✅ [PASSED] Test 1.2: Asignación O(1) calculada: ${assignment.formattedCoordinate} (${assignment.terrainName})`);
  passedTests++;

  // ----------------------------------------------------------------------------
  // SUITE 2: Detección de Tropas y Edificios Preexistentes
  // ----------------------------------------------------------------------------
  console.log('\n--- SUITE 2: DETECCIÓN DE OCUPACIÓN Y UNIDADES PREVIAS ---');

  // La tropa unit-cab-01 está sembrada en [-71.458, 10.395]
  const occupiedCoord: [number, number] = [-71.458, 10.395];
  const occupiedAssignment = spatialDeploymentService.getSpatialAssignment(occupiedCoord);

  assert(!!occupiedAssignment.deployedUnit, 'Debe detectar la unidad preexistente en la coordenada de La Salina');
  assert(occupiedAssignment.isDeployable === false, 'Celda con unidad preexistente NO debe ser desplegable');
  assert(occupiedAssignment.deployedUnit!.callsign === 'FERRO-TITÁN-01', 'Debe identificar el callsign de la unidad');

  console.log(`✅ [PASSED] Test 2.1: Ocupación detectada: ${occupiedAssignment.deployedUnit!.name} (${occupiedAssignment.deployedUnit!.callsign})`);
  passedTests++;

  // ----------------------------------------------------------------------------
  // SUITE 3: Despliegue de Unidades en Coordenadas Libres
  // ----------------------------------------------------------------------------
  console.log('\n--- SUITE 3: DESPLIEGUE TÁCTICO EN COORDENADAS ---');

  // Coordenada despejada de prueba
  const freeCoord: [number, number] = [-71.4420, 10.3850];
  const freeAssignment = spatialDeploymentService.getSpatialAssignment(freeCoord);
  assert(freeAssignment.isDeployable === true, 'Celda libre debe permitir despliegue');

  // Intento de despliegue sobre celda ocupada debe fallar
  const failDeploy = spatialDeploymentService.deployUnitAt({
    sector: occupiedAssignment.sector,
    cell: occupiedAssignment.cell,
    lngLat: occupiedCoord,
    unitCode: 'recon',
    unitName: 'Patrulla Rechazada',
    clanId: 'clan-ferro',
    clanTag: 'FERR',
    factionId: 'blue_moon',
    callsign: 'RECHAZADO-1',
  });
  assert(failDeploy.success === false, 'Despliegue sobre celda ocupada debe ser rechazado');
  assert(failDeploy.reason!.includes('CELDA OCUPADA'), 'Debe retornar motivo de rechazo');
  console.log('✅ [PASSED] Test 3.1: Despliegue en celda ocupada bloqueado con motivo balístico');
  passedTests++;

  // Despliegue válido en celda libre
  let notifyFired = false;
  const unsub = spatialDeploymentService.subscribe(() => {
    notifyFired = true;
  });

  const validDeploy = spatialDeploymentService.deployUnitAt({
    sector: freeAssignment.sector,
    cell: freeAssignment.cell,
    lngLat: freeCoord,
    unitCode: 'artillery',
    unitName: 'Batería de Artillería Trueno',
    clanId: 'clan-ferro',
    clanTag: 'FERR',
    factionId: 'blue_moon',
    callsign: 'TRUENO-CABIMAS',
    tier: 2,
  });

  assert(validDeploy.success === true, 'Despliegue en celda libre debe ser exitoso');
  assert(!!validDeploy.unit, 'Debe retornar la unidad desplegada');
  assert(validDeploy.unit!.hp === 100, 'Unidad nace con 100 HP');
  assert(Boolean(notifyFired), 'Debe notificar a los suscriptores reactivos');

  // Re-consultar la celda para confirmar ocupación
  const postDeploy = spatialDeploymentService.getSpatialAssignment(freeCoord);
  assert(postDeploy.isDeployable === false, 'Tras despliegue, la celda queda ocupada');
  assert(postDeploy.deployedUnit?.callsign === 'TRUENO-CABIMAS', 'La unidad figura como ocupante de la celda');

  console.log(`✅ [PASSED] Test 3.2: Tropa [${validDeploy.unit!.callsign}] desplegada con éxito en ${freeAssignment.formattedCoordinate}`);
  passedTests++;

  // ----------------------------------------------------------------------------
  // SUITE 4: Construcción in-situ de Estructuras Industriales / Búnkeres
  // ----------------------------------------------------------------------------
  console.log('\n--- SUITE 4: CONSTRUCCIÓN IN-SITU DE EDIFICIOS ---');

  // Coordenada vial libre adyacente para construir
  const buildCoord: [number, number] = [-71.4480, 10.3880];
  const buildAssignment = spatialDeploymentService.getSpatialAssignment(buildCoord);

  const constructRes = spatialDeploymentService.constructBuildingAt({
    sector: buildAssignment.sector,
    cell: buildAssignment.cell,
    lngLat: buildCoord,
    buildingType: 'radar_station',
    clanId: 'clan-ferro',
  });

  assert(constructRes.success === true, 'Construcción debe autorizarse');
  assert(!!constructRes.building, 'Debe retornar el edificio construido');
  assert(constructRes.building!.buildingType === 'radar_station', 'Tipo de edificio debe coincidir');

  const postBuild = spatialDeploymentService.getSpatialAssignment(buildCoord);
  assert(postBuild.isConstructible === false, 'Tras construir, la celda no permite duplicar estructura');
  assert(postBuild.deployedBuilding?.buildingType === 'radar_station', 'El edificio figura como estructura activa');

  console.log(`✅ [PASSED] Test 4.1: Estructura [${constructRes.building!.buildingType}] construida exitosamente en ${buildAssignment.formattedCoordinate}`);
  passedTests++;

  // Limpieza
  operationalUnitsService.removeUnit(validDeploy.unit!.id);
  unsub();

  console.log('------------------------------------------------------------------------------');
  console.log(`RESUMEN ASIGNACIÓN ESPACIAL Y CONSTRUCCIÓN SPRINT 3: ${passedTests}/6 PASARON`);
  console.log('✅ TODAS LAS PRUEBAS DE MICROJUEGO, DESPLIEGUE Y CONSTRUCCIÓN SUPERADAS (100% ÉXITO)');
  console.log('==============================================================================\n');
} catch (err) {
  console.error('Error fatal durante la ejecución de pruebas:', err);
  process.exit(1);
}

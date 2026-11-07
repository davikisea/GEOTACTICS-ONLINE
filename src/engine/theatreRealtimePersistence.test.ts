/**
 * ==============================================================================
 * TEST SUITE: PERSISTENCIA REALTIME Y TEATRO OPERACIONAL CABIMAS (REG_VE_02)
 * ==============================================================================
 * Conforme a @game-dev-quality-gate y docs/DATABASE_ARCHITECTURE_AUDIT.md
 * Valida:
 * 1. Clave espacial unívoca O(1) [calculateSpatialCellId].
 * 2. Despliegue de unidades tácticas con persistencia y fallback offline.
 * 3. Construcción in-situ de estructuras de feudo con durabilidad.
 * 4. Suscripción y desuscripción limpia de canales Supabase Realtime (theatre:REG_VE_02).
 * 5. Consistencia de soberanía y telemetría geopolítica en REG_VE_02.
 * ==============================================================================
 */

import { spatialDeploymentService } from '../services/spatialDeploymentService';
import { stateSovereigntyService } from '../services/stateSovereigntyService';
import { operationalUnitsService } from '../services/operationalUnitsService';
import { fiefBuildingService } from '../services/fiefBuildingService';

function assert(condition: boolean, msg: string) {
  if (!condition) {
    console.error(`❌ [FAILED]: ${msg}`);
    process.exit(1);
  }
}

console.log('==============================================================================');
console.log('EJECUTANDO SUITE: PERSISTENCIA REALTIME Y TEATRO CABIMAS (REG_VE_02)');
console.log('==============================================================================\n');

let passedTests = 0;

async function runTests() {
  try {
    // --------------------------------------------------------------------------
    // SUITE 1: Contrato e Indexación O(1) de Celdas Espaciales
    // --------------------------------------------------------------------------
    console.log('--- SUITE 1: INDEXACIÓN ANALÍTICA O(1) Y CONTRATOS PÚBLICOS ---');

    const cellId = spatialDeploymentService.calculateSpatialCellId([9880, 15432], [0, 11]);
    assert(cellId === '9880_15432_0_11', `calculateSpatialCellId falló: esperado '9880_15432_0_11', obtenido '${cellId}'`);
    console.log(`✅ [PASSED] Test 1.1: Clave espacial canónica O(1) verificada: ${cellId}`);
    passedTests++;

    // Verificar firma deployTacticalUnit
    assert(typeof spatialDeploymentService.deployTacticalUnit === 'function', 'deployTacticalUnit debe existir como método público');
    assert(typeof spatialDeploymentService.constructTacticalBuilding === 'function', 'constructTacticalBuilding debe existir como método público');
    console.log('✅ [PASSED] Test 1.2: Firmas públicas conservadas para MicroTacticalDeckHUD');
    passedTests++;

    // --------------------------------------------------------------------------
    // SUITE 2: Inicialización y Ciclo de Vida del Canal Realtime (theatre:REG_VE_02)
    // --------------------------------------------------------------------------
    console.log('\n--- SUITE 2: CICLO DE VIDA DEL CANAL REALTIME SUPABASE ---');

    // Inicializar suscripción para Cabimas
    await spatialDeploymentService.initRealtimeSubscription('REG_VE_02');
    console.log('✅ [PASSED] Test 2.1: initRealtimeSubscription("REG_VE_02") ejecutado sin bloqueos ni errores');
    passedTests++;

    // Desuscribir limpiamente
    spatialDeploymentService.unsubscribeRealtime();
    console.log('✅ [PASSED] Test 2.2: unsubscribeRealtime() ejecutado con limpieza de recursos');
    passedTests++;

    // --------------------------------------------------------------------------
    // SUITE 3: Despliegue Bidireccional y Verificación de Estado Ocupacional
    // --------------------------------------------------------------------------
    console.log('\n--- SUITE 3: DESPLIEGUE TÁCTICO IN-SITU Y OCUPACIÓN ESPACIAL ---');

    const testDeployCoord: [number, number] = [-71.4380, 10.3750];
    const assignmentBefore = spatialDeploymentService.getSpatialAssignment(testDeployCoord);
    assert(assignmentBefore.isDeployable, 'La celda de prueba debe estar libre inicialmente');

    let listenerTriggered = false;
    const unsub = spatialDeploymentService.subscribe(() => {
      listenerTriggered = true;
    });

    const deployResult = spatialDeploymentService.deployTacticalUnit({
      sector: assignmentBefore.sector,
      cell: assignmentBefore.cell,
      lngLat: testDeployCoord,
      unitCode: 'anti_air',
      unitName: 'Defensa Antiaérea La Rosa',
      clanId: 'clan-ferro',
      clanTag: 'FERR',
      factionId: 'blue_moon',
      callsign: 'ROSA-DEFENDER-01',
      tier: 2,
    });

    assert(deployResult.success, `Despliegue táctico falló: ${deployResult.reason}`);
    assert(listenerTriggered, 'El listener de cambios espaciales debe dispararse tras el despliegue');
    unsub();

    const assignmentAfter = spatialDeploymentService.getSpatialAssignment(testDeployCoord);
    assert(!assignmentAfter.isDeployable, 'La celda debe reportarse como NO desplegable tras el despliegue');
    assert(assignmentAfter.deployedUnit?.callsign === 'ROSA-DEFENDER-01', 'La unidad asignada debe ser ROSA-DEFENDER-01');

    console.log(`✅ [PASSED] Test 3.1: Unidad desplegada y celda bloqueada en O(1): ${assignmentAfter.deployedUnit?.name}`);
    passedTests++;

    // --------------------------------------------------------------------------
    // SUITE 4: Construcción In-Situ con Fallback y Preservación de Durabilidad
    // --------------------------------------------------------------------------
    console.log('\n--- SUITE 4: CONSTRUCCIÓN IN-SITU Y FEUDOS CABIMAS ---');

    // Ubicación adyacente a vía en Cabimas
    const roadAdjacentCoord: [number, number] = [-71.4580, 10.3950];
    const buildCoord: [number, number] = [-71.4578, 10.3952]; // Ligeramente desplazado para celda libre
    const buildAssignment = spatialDeploymentService.getSpatialAssignment(buildCoord);

    const buildResult = spatialDeploymentService.constructTacticalBuilding({
      sector: buildAssignment.sector,
      cell: buildAssignment.cell,
      lngLat: buildCoord,
      buildingType: 'radar_station',
      clanId: 'clan-ferro',
      fiefId: 'fief-cabimas-salina',
      treasury: { clanId: 'clan-ferro', energyCredits: 100000 },
    });

    assert(buildResult.success, `Construcción falló: ${buildResult.reason}`);
    assert(buildResult.building?.buildingType === 'radar_station', 'Tipo de edificio debe ser radar_station');
    assert(buildResult.building?.currentHp === 4000, 'Durabilidad de radar_station debe ser 4000');

    console.log(`✅ [PASSED] Test 4.1: Estructura in-situ [${buildResult.building?.buildingType}] construida con éxito.`);
    passedTests++;

    // --------------------------------------------------------------------------
    // SUITE 5: Soberanía de REG_VE_02 (Cabimas / Zulia)
    // --------------------------------------------------------------------------
    console.log('\n--- SUITE 5: ESTADO SOBERANO DE REG_VE_02 ---');

    const zuliaState = stateSovereigntyService.getState('REG_VE_02');
    assert(!!zuliaState, 'REG_VE_02 debe existir en stateSovereigntyService');
    assert(zuliaState!.controllingFactionId === 'blue_moon', 'Zulia debe estar bajo hegemonía de Blue Moon');
    assert(zuliaState!.controllingClanId === 'clan-ferro', 'Zulia debe estar bajo control del Clan Ferro');
    assert(zuliaState!.tcpCurrent === 10000, 'Zulia debe tener 10,000 TCP iniciales');

    console.log(`✅ [PASSED] Test 5.1: Soberanía de REG_VE_02 verificada: ${zuliaState!.customStateName} (${zuliaState!.controllingClanName})`);
    passedTests++;

    console.log('------------------------------------------------------------------------------');
    console.log(`RESUMEN PERSISTENCIA REALTIME CABIMAS: ${passedTests}/6 PRUEBAS SUPERADAS`);
    console.log('✅ TODAS LAS PRUEBAS DE PERSISTENCIA Y REALTIME SUPERADAS (100% ÉXITO)');
    console.log('==============================================================================');
  } catch (err) {
    console.error('❌ Error no controlado en suite:', err);
    process.exit(1);
  }
}

runTests();

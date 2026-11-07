/**
 * ==============================================================================
 * SUITE DE PRUEBAS UNITARIAS: ESTRATOS SOCIALES (POPS) Y SECESIÓN PROVINCIAL
 * ==============================================================================
 * Paradigma: Clausewitz & Metapolitics (Paradox / Firaxis Lens).
 * Verifica:
 * 1. Purga de localStorage y persistencia centralizada en stateSovereigntyService.
 * 2. Dinámica de Estratos Sociales (POPs): Lealtad militar, burocracia, descontento
 *    obrero y fuga de capitales de oligarcas.
 * 3. Fricción Anti-Snowballing Orgánica: Secesión armada ('under_siege') y
 *    desconexión de líneas de suministro logístico al superar el 80% de riesgo.
 * ==============================================================================
 */

import { politicalAliceEngine } from './politicalAliceEngine';
import { stateSovereigntyService } from '../services/stateSovereigntyService';
import type { ProvincialStrataState } from '../types/stateSovereigntyTypes';

function assert(condition: boolean, msg: string) {
  if (!condition) {
    console.error(`❌ [FAILED]: ${msg}`);
    process.exit(1);
  }
}

console.log('==============================================================================');
console.log('EJECUTANDO SUITE: ESTRATOS SOCIALES, ANTI-SNOWBALLING Y SECESIÓN PROVINCIAL');
console.log('==============================================================================\n');

let passedTests = 0;

try {
  // Reiniciar estado limpio del teatro
  politicalAliceEngine.resetTheaterState();

  // ----------------------------------------------------------------------------
  // SUITE 1: PURGA DE LOCALSTORAGE Y PERSISTENCIA CENTRALIZADA
  // ----------------------------------------------------------------------------
  console.log('--- SUITE 1: PURGA DE LOCALSTORAGE Y SINCRONIZACIÓN CENTRALIZADA ---');

  // Verificar que el motor opera en memoria y sincroniza con stateSovereigntyService
  const caracasRecord = stateSovereigntyService.getState('REG_VE_01');
  assert(!!caracasRecord, 'Caracas debe estar sincronizado en stateSovereigntyService');
  assert(caracasRecord!.tcpCurrent === 15000, 'Caracas debe tener 15,000 TCP (Super-Nodo Capital Nacional)');
  console.log('✅ [PASSED] Test 1.1: Sincronización reactiva con stateSovereigntyService confirmada.');
  passedTests++;

  // ----------------------------------------------------------------------------
  // SUITE 2: ESTRATOS SOCIALES PROVINCIALES (POPS) BASE
  // ----------------------------------------------------------------------------
  console.log('\n--- SUITE 2: TELEMETRÍA Y ESTRUCTURA DE ESTRATOS SOCIALES (POPS) ---');

  const strataCaracas = politicalAliceEngine.getProvincialStrata('REG_VE_01');
  assert(strataCaracas.stateId === 'REG_VE_01', 'El stateId debe corresponder a REG_VE_01');
  assert(strataCaracas.militaristsLoyalty >= 90, 'Lealtad militar en capital debe ser alta (>= 90%)');
  assert(strataCaracas.bureaucratsSatisfaction === 90, 'Satisfacción burocrática inicial debe ser 90%');
  assert(strataCaracas.petroLaborUnrest <= 15, 'Descontento obrero inicial debe ser bajo (<= 15%)');
  assert(strataCaracas.isRebelControlled === false, 'Provincia no debe iniciar bajo control rebelde');
  console.log(`✅ [PASSED] Test 2.1: Estratos de Capital verificados (Lealtad: ${strataCaracas.militaristsLoyalty}%, Descontento: ${strataCaracas.petroLaborUnrest}%).`);
  passedTests++;

  const strataZulia = politicalAliceEngine.getProvincialStrata('REG_VE_02');
  assert(strataZulia.stateId === 'REG_VE_02', 'Zulia debe tener estrato provincial');
  assert(strataZulia.secessionRiskPercent < 25, 'Riesgo inicial de secesión debe ser bajo (< 25%)');
  console.log(`✅ [PASSED] Test 2.2: Estratos de Zulia verificados (Riesgo Secesión: ${strataZulia.secessionRiskPercent}%).`);
  passedTests++;

  // ----------------------------------------------------------------------------
  // SUITE 3: DINÁMICAS SECTORIALES DE POPs (FRICCIÓN METAPOLÍTICA)
  // ----------------------------------------------------------------------------
  console.log('\n--- SUITE 3: DINÁMICAS SECTORIALES DE POPs (CLAUSEWITZ LENS) ---');

  // Caso 3.1: Fuga de capitales de oligarcas si aranceles/peajes superan el 15%
  const initialFlight = strataZulia.oligarchCapitalFlight;
  politicalAliceEngine.setChokepointToll('CHK-MARACAIBO', 22.0); // 22% > 15%
  const updatedZulia = politicalAliceEngine.getProvincialStrata('REG_VE_02');
  assert(
    updatedZulia.oligarchCapitalFlight > initialFlight,
    'Fuga de capitales de oligarcas debe aumentar cuando el peaje supera el 15%'
  );
  console.log(`✅ [PASSED] Test 3.1: Fuga de capitales activada por peaje del 22%: ${initialFlight}% -> ${updatedZulia.oligarchCapitalFlight}%.`);
  passedTests++;

  // Caso 3.2: Actualización granular de estratos con updateProvincialStrata
  const updatedMérida = politicalAliceEngine.updateProvincialStrata('REG_VE_10', {
    militaristsLoyalty: 40,
    bureaucratsSatisfaction: 50,
    petroLaborUnrest: 65,
  });
  assert(updatedMérida.militaristsLoyalty === 40, 'Militarists loyalty debe ser 40%');
  assert(updatedMérida.petroLaborUnrest === 65, 'Petro labor unrest debe ser 65%');
  assert(updatedMérida.secessionRiskPercent > 35, 'Riesgo de secesión debe subir con la degradación de estratos');
  console.log(`✅ [PASSED] Test 3.2: updateProvincialStrata recalculó riesgo de secesión a ${updatedMérida.secessionRiskPercent}%.`);
  passedTests++;

  // ----------------------------------------------------------------------------
  // SUITE 4: ESCALADO SUPERLINEAL Y CÁLCULO DE RIESGO DE SECESIÓN
  // ----------------------------------------------------------------------------
  console.log('\n--- SUITE 4: ESCALADO SUPERLINEAL DEL RIESGO DE SECESIÓN (UNREST > 70%) ---');

  // Riesgo con Unrest al 68% (sub-umbral crítico)
  const riskSubThreshold = politicalAliceEngine.calculateSecessionRisk({
    militaristsLoyalty: 30,
    petroLaborUnrest: 68,
    bureaucratsSatisfaction: 40,
    oligarchCapitalFlight: 20,
  });

  // Riesgo con Unrest al 88% (superlineal desbordado)
  const riskSuperlinear = politicalAliceEngine.calculateSecessionRisk({
    militaristsLoyalty: 15,
    petroLaborUnrest: 88,
    bureaucratsSatisfaction: 20,
    oligarchCapitalFlight: 30,
  });

  assert(riskSuperlinear > 80, `Riesgo superlineal debe exceder 80% (Calculado: ${riskSuperlinear}%)`);
  assert(
    riskSuperlinear > riskSubThreshold + 25,
    'El incremento superlineal debe acelerar drásticamente el riesgo de secesión'
  );
  console.log(`✅ [PASSED] Test 4.1: Explosión superlineal validada: Sub-umbral ${riskSubThreshold}% vs Crítico ${riskSuperlinear}%.`);
  passedTests++;

  // ----------------------------------------------------------------------------
  // SUITE 5: FRICCIÓN ANTI-SNOWBALLING: SOBRE-EXTENSIÓN IMPERIAL
  // ----------------------------------------------------------------------------
  console.log('\n--- SUITE 5: SOBRE-EXTENSIÓN IMPERIAL Y CAÍDA DE SATISFACCIÓN BUROCRÁTICA ---');

  // Simular expansión imperial masiva (más de 6 provincias bajo control)
  // El clan-ferro controla 5 inicialmente; le asignamos 4 más para llegar a 9 (K_Limite = 6)
  const state = politicalAliceEngine.getState();
  const additionalProvinces = ['REG_VE_09', 'REG_VE_10', 'REG_VE_15', 'REG_VE_16'];
  additionalProvinces.forEach(id => {
    state.sovereigntyMap[id].controllerClanId = 'clan-ferro';
    state.sovereigntyMap[id].status = 'stable';
  });

  const metricsBefore = politicalAliceEngine.getEmpireMetrics('clan-ferro');
  assert(metricsBefore.controlledRegions.length === 9, 'El imperio debe controlar 9 regiones');

  const bureaucratBefore = politicalAliceEngine.getProvincialStrata('REG_VE_05').bureaucratsSatisfaction;

  // Ejecutar avance del ciclo macroeconómico
  politicalAliceEngine.advancePoliticalEconomyCycle();

  const bureaucratAfter = politicalAliceEngine.getProvincialStrata('REG_VE_05').bureaucratsSatisfaction;
  assert(
    bureaucratAfter < bureaucratBefore,
    `La satisfacción burocrática debe caer por sobre-extensión imperial (Antes: ${bureaucratBefore}%, Después: ${bureaucratAfter}%)`
  );
  console.log(`✅ [PASSED] Test 5.1: Sobre-extensión imperial penalizó burócratas: ${bureaucratBefore}% -> ${bureaucratAfter}%.`);
  passedTests++;

  // ----------------------------------------------------------------------------
  // SUITE 6: DETONACIÓN DE SECESIÓN ARMADA Y CORTE DE LÍNEAS DE SUMINISTRO
  // ----------------------------------------------------------------------------
  console.log('\n--- SUITE 6: DETONACIÓN DE SECESIÓN ARMADA Y CORTE DE SUMINISTROS ---');

  // 6.1: Región con riesgo moderado (<= 80%) no detona secesión
  const calmResult = politicalAliceEngine.evaluateProvincialSecession('REG_VE_01');
  assert(calmResult.seceded === false, 'Caracas no debe secesionarse con riesgo bajo');
  console.log(`✅ [PASSED] Test 6.1: Rechazo de secesión en provincia leal confirmado.`);
  passedTests++;

  // 6.2: Inducir colapso crítico en Mérida (REG_VE_10): Unrest 92%, Lealtad 8%
  politicalAliceEngine.updateProvincialStrata('REG_VE_10', {
    militaristsLoyalty: 8,
    petroLaborUnrest: 92,
    bureaucratsSatisfaction: 10,
    oligarchCapitalFlight: 40,
  });

  const meridaStrata = politicalAliceEngine.getProvincialStrata('REG_VE_10');
  assert(
    meridaStrata.secessionRiskPercent > 80,
    `Riesgo de secesión en Mérida debe ser > 80% (Actual: ${meridaStrata.secessionRiskPercent}%)`
  );

  // Ejecutar tirada de ruptura forzada (true)
  const secessionResult = politicalAliceEngine.evaluateProvincialSecession('REG_VE_10', true);
  assert(secessionResult.seceded === true, 'Mérida debe haber consumado la secesión armada');
  assert(secessionResult.strata.isRebelControlled === true, 'Mérida debe estar bajo control rebelde');

  // Verificar cambio a status 'under_siege' en motor y servicio central
  const meridaSov = politicalAliceEngine.getState().sovereigntyMap['REG_VE_10'];
  assert(meridaSov.status === 'under_siege', 'El estado de soberanía debe ser under_siege');

  const meridaServiceRecord = stateSovereigntyService.getState('REG_VE_10');
  assert(meridaServiceRecord?.status === 'under_siege', 'stateSovereigntyService debe reflejar under_siege');
  console.log(`✅ [PASSED] Test 6.2: Secesión armada detonada en Mérida: status = 'under_siege', isRebelControlled = true.`);
  passedTests++;

  // 6.3: Fricción logística: La provincia secesionista desconecta sus líneas de suministro
  const metricsAfterSecession = politicalAliceEngine.getEmpireMetrics('clan-ferro');
  assert(
    metricsAfterSecession.supplyConnectedMap['REG_VE_10'] === false,
    'Mérida rebelde debe estar completamente desconectada de la red logística imperial'
  );
  assert(
    !metricsAfterSecession.controlledRegions.some(r => r.id === 'REG_VE_10'),
    'Mérida rebelde debe ser excluida de las provincias pacíficas controladas'
  );
  console.log('✅ [PASSED] Test 6.3: Líneas de suministro seccionadas orgánicamente por rebelión.');
  passedTests++;

  // ----------------------------------------------------------------------------
  // SUITE 7: RECONSOLIDACIÓN Y PACIFICACIÓN MILITAR
  // ----------------------------------------------------------------------------
  console.log('\n--- SUITE 7: PACIFICACIÓN Y RESTAURACIÓN DE SOBERANÍA ---');

  // Dar recursos al jugador para la operación de reconsolidación
  politicalAliceEngine.getState().energyCells = 5000;
  politicalAliceEngine.getState().industrialSteel = 1000;

  const reconsolidateResult = politicalAliceEngine.reinforceAndConsolidateRegion('REG_VE_10');
  assert(reconsolidateResult.success === true, 'Reconsolidación debe ser exitosa');

  const pacifiedStrata = politicalAliceEngine.getProvincialStrata('REG_VE_10');
  assert(pacifiedStrata.isRebelControlled === false, 'El control rebelde debe ser revocado');
  assert(pacifiedStrata.petroLaborUnrest < meridaStrata.petroLaborUnrest, 'El descontento debe reducirse');

  const pacifiedSov = politicalAliceEngine.getState().sovereigntyMap['REG_VE_10'];
  assert(pacifiedSov.status === 'stable', 'Status debe restaurarse a stable');
  console.log(`✅ [PASSED] Test 7.1: Pacificación completada (Status: ${pacifiedSov.status}, Rebel: ${pacifiedStrata.isRebelControlled}).`);
  passedTests++;

  console.log('------------------------------------------------------------------------------');
  console.log(`RESUMEN SUITE ESTRATOS Y SECESIÓN: ${passedTests}/10 PRUEBAS SUPERADAS`);
  console.log('✅ TODAS LAS PRUEBAS DE ESTRATOS SOCIALES Y SECESIÓN SUPERADAS (100% ÉXITO)');
  console.log('==============================================================================');
} catch (err) {
  console.error('❌ Error no controlado en suite:', err);
  process.exit(1);
}

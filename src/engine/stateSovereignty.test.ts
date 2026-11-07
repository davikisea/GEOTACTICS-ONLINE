/**
 * ==============================================================================
 * TEST SUITE: SOBERANÍA TERRITORIAL, RBAC Y CONTROL DE ESTADOS C4ISR
 * ==============================================================================
 * Conforme a @game-dev-quality-gate y docs/00_GEOTACTICS_ONLINE_MASTER_SPEC.md
 * Valida permisos de líderes de clan, gestores de facción y renombre de países.
 * ==============================================================================
 */

import { stateSovereigntyService } from '../services/stateSovereigntyService';
import type { UserRoleContext } from '../types/stateSovereigntyTypes';

function assert(condition: boolean, msg: string) {
  if (!condition) {
    console.error(`❌ [FAILED]: ${msg}`);
    process.exit(1);
  }
}

console.log('==============================================================================');
console.log('EJECUTANDO SUITE: SOBERANÍA TERRITORIAL, RBAC Y CONTROL DE ESTADOS');
console.log('==============================================================================\n');

let passedTests = 0;

try {
  // ----------------------------------------------------------------------------
  // SUITE 1: Consulta Inicial y SSOT de Estados
  // ----------------------------------------------------------------------------
  console.log('--- SUITE 1: CONSULTA DE ESTADOS Y TELEMETRÍA GEOPOLÍTICA ---');

  const caracas = stateSovereigntyService.getState('REG_VE_01');
  assert(!!caracas, 'Caracas (REG_VE_01) debe existir en el SSOT de soberanía');
  assert(caracas!.canonicalStateName === 'Distrito Capital', 'Caracas debe mapear a Distrito Capital');
  assert(caracas!.controllingFactionId === 'orange_star', 'Caracas controlada inicialmente por Orange Star');
  assert(caracas!.tcpCurrent === 10000, 'TCP inicial debe ser 10,000');
  assert(caracas!.gdpWarCreditsPerHour > 0, 'PIB de guerra debe ser mayor a 0');
  console.log(`✅ [PASSED] Test 1.1: Caracas verificado con ${caracas!.gdpWarCreditsPerHour} $G/hr`);
  passedTests++;

  const zulia = stateSovereigntyService.getState('REG_VE_02');
  assert(!!zulia, 'Zulia (REG_VE_02) debe existir');
  assert(zulia!.controllingFactionId === 'blue_moon', 'Zulia controlado por Blue Moon (Clan Ferro)');
  assert(zulia!.resources.oil > 500, 'Zulia debe tener alto rendimiento de crudo (>500)');
  console.log(`✅ [PASSED] Test 1.2: Zulia verificado con ${zulia!.resources.oil} barriles de petróleo`);
  passedTests++;

  // ----------------------------------------------------------------------------
  // SUITE 2: RBAC Estricto (Líderes de Clan y Gestores de Facción)
  // ----------------------------------------------------------------------------
  console.log('\n--- SUITE 2: RBAC ESTRICTO Y CONTROL DE ACCESO ---');

  // Caso 2.1: Soldado / Recluta de tropa ordinaria intenta desbloquear
  const recruitUser: UserRoleContext = {
    userId: 'user-soldier-01',
    userName: 'Soldado Pérez',
    clanId: 'clan-ferro',
    clanTag: 'FERR',
    clanRole: 'recruit',
    factionId: 'blue_moon',
    isFactionManager: false,
  };

  const recruitCheck = stateSovereigntyService.canUnlockStateControl(recruitUser, 'REG_VE_02');
  assert(recruitCheck.allowed === false, 'Recluta NO debe tener autorización para alterar soberanía');
  assert(recruitCheck.reason!.includes('AUTORIZACIÓN INSUFICIENTE'), 'Debe advertir sobre jerarquía insuficiente');
  console.log('✅ [PASSED] Test 2.1: Recluta denegado con feedback de rango militar');
  passedTests++;

  // Caso 2.2: Miembro de facción rival intenta acceder a Zulia (Orange Star intentando gobernar Blue Moon)
  const rivalLeaderUser: UserRoleContext = {
    userId: 'user-rival-leader',
    userName: 'Comandante Rival',
    clanId: 'clan-orinoco',
    clanTag: 'ORNC',
    clanRole: 'leader',
    factionId: 'orange_star',
    isFactionManager: false,
  };

  const rivalCheck = stateSovereigntyService.canUnlockStateControl(rivalLeaderUser, 'REG_VE_02');
  assert(rivalCheck.allowed === false, 'Líder de facción rival NO puede gobernar un estado ajeno');
  assert(rivalCheck.reason!.includes('bajo control de la facción'), 'Debe advertir sobre soberanía enemiga');
  console.log('✅ [PASSED] Test 2.2: Facción rival bloqueada con advertencia de control soberano');
  passedTests++;

  // Caso 2.3: Líder de Clan Hegemónico autorizado
  const ferroLeaderUser: UserRoleContext = {
    userId: 'user-ferro-cmd',
    userName: 'General Ferro',
    clanId: 'clan-ferro',
    clanTag: 'FERR',
    clanRole: 'leader',
    factionId: 'blue_moon',
    isFactionManager: false,
  };

  const leaderCheck = stateSovereigntyService.canUnlockStateControl(ferroLeaderUser, 'REG_VE_02');
  assert(leaderCheck.allowed === true, 'Líder del clan controlador DEBE estar autorizado');
  console.log('✅ [PASSED] Test 2.3: Líder de clan hegemónico autorizado exitosamente');
  passedTests++;

  // Caso 2.4: Gestor de Facción autorizado (incluso si no es el líder directo del clan)
  const factionManagerUser: UserRoleContext = {
    userId: 'user-manager-bluemoon',
    userName: 'Comisario Político Blue Moon',
    clanId: 'clan-sub-ferro',
    clanTag: 'FERR-2',
    clanRole: 'officer',
    factionId: 'blue_moon',
    isFactionManager: true,
  };

  const managerCheck = stateSovereigntyService.canUnlockStateControl(factionManagerUser, 'REG_VE_02');
  assert(managerCheck.allowed === true, 'Gestor de facción DEBE estar autorizado');
  console.log('✅ [PASSED] Test 2.4: Gestor de facción autorizado exitosamente');
  passedTests++;

  // ----------------------------------------------------------------------------
  // SUITE 3: Proclamación Soberana y Mutación de Nombre de País y Estado
  // ----------------------------------------------------------------------------
  console.log('\n--- SUITE 3: PROCLAMACIÓN SOBERANA Y PROPAGACIÓN DE PAÍS ---');

  let notificationFired: boolean = false;
  const unsubscribe = stateSovereigntyService.subscribe((updated) => {
    if (updated.stateId === 'REG_VE_02') {
      notificationFired = true;
    }
  });

  const proclamationResult = await stateSovereigntyService.updateStateSovereignty(ferroLeaderUser, {
    stateId: 'REG_VE_02',
    newCountryName: 'Confederación Ártica de Venezuela',
    newStateName: 'República Petrolera de Zulia',
    customMotto: 'Acero Frío y Victoria Continental',
    sovereignProclamation: 'Por decreto militar del Clan Ferro, la cuenca del Lago de Maracaibo queda formalmente reestructurada.',
  });

  assert(Boolean(proclamationResult.success), 'La proclamación debe ser exitosa');
  assert(Boolean(notificationFired), 'Los suscriptores deben recibir la notificación reactiva');

  const updatedZulia = stateSovereigntyService.getState('REG_VE_02')!;
  assert(updatedZulia.customCountryName === 'Confederación Ártica de Venezuela', 'Nombre de país debe actualizarse');
  assert(updatedZulia.customStateName === 'República Petrolera de Zulia', 'Nombre de estado debe actualizarse');
  assert(updatedZulia.customMotto === 'Acero Frío y Victoria Continental', 'Lema debe registrarse');
  assert(updatedZulia.unlockedByUserId === ferroLeaderUser.userId, 'ID del proclamador registrado');

  console.log(`✅ [PASSED] Test 3.1: Soberanía mutada: [${updatedZulia.customCountryName} / ${updatedZulia.customStateName}]`);
  passedTests++;

  unsubscribe();

  console.log('------------------------------------------------------------------------------');
  console.log(`RESUMEN SOBERANÍA Y RBAC SPRINT 1: ${passedTests}/5 PASARON`);
  console.log('✅ TODAS LAS PRUEBAS DE SOBERANÍA Y CONTROL DE ESTADOS SUPERADAS (100% ÉXITO)');
  console.log('==============================================================================\n');
} catch (e) {
  console.error('Error fatal durante la ejecución de pruebas:', e);
  process.exit(1);
}

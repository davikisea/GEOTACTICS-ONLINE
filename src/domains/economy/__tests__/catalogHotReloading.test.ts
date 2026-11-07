/**
 * Tactical Command - Catalog Hot-Reloading Suite
 * 
 * Verifica que el `catalogRegistry` soporte parches reactivos en caliente (Hot-Reloading)
 * en tiempo de ejecución sin reiniciar la aplicación ni afectar los contratos de memoria O(1).
 */

import { catalogRegistry } from '@shared';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ ASSERTION FAILED: ${message}`);
    process.exit(1);
  }
}

async function runHotReloadingTest() {
  console.log('🧪 Iniciando prueba de Hot-Reloading reactivo de Catálogos...');

  // 1. Obtener estado base de una unidad conocida
  const baseTank = catalogRegistry.getUnit('tank_light');
  assert(baseTank !== undefined, 'tank_light debe existir en el registro');
  const originalAttack = baseTank!.baseAttack;
  const originalCost = baseTank!.productionCostG;
  console.log(`ℹ️ [tank_light] Estadísticas base: Ataque = ${originalAttack}, Costo = ${originalCost}`);

  // 2. Suscribirse a cambios en caliente
  let subscriberNotificationReceived = false;
  let receivedManifestHash = '';

  const unsubscribe = catalogRegistry.onReload((hash) => {
    subscriberNotificationReceived = true;
    receivedManifestHash = hash;
    console.log(`🔔 Notificación reactiva recibida! Nuevo Hash: ${hash}`);
  });

  // 3. Aplicar un parche dinámico (simulando balance de servidor vía Hotfix)
  const patchedAttack = 95;
  const patchedCost = 1400;
  const testPatchHash = 'hotfix-v1.0.4-tank-buff';

  catalogRegistry.applyDynamicPatch(
    {
      units: {
        tank_light: {
          baseAttack: patchedAttack,
          productionCostG: patchedCost,
        },
      },
    },
    testPatchHash
  );

  // 4. Validar que la suscripción disparó sincrónicamente
  assert(subscriberNotificationReceived, 'El callback de onReload debió dispararse');
  assert(receivedManifestHash === testPatchHash, `El hash reportado debe ser '${testPatchHash}', recibido: '${receivedManifestHash}'`);

  // 5. Validar que la consulta O(1) refleja de inmediato los valores nuevos sin reiniciar
  const patchedTank = catalogRegistry.getUnit('tank_light');
  assert(patchedTank !== undefined, 'tank_light debe seguir disponible');
  assert(patchedTank!.baseAttack === patchedAttack, `El ataque debe ser ${patchedAttack}, obtenido: ${patchedTank!.baseAttack}`);
  assert(patchedTank!.productionCostG === patchedCost, `El costo debe ser ${patchedCost}, obtenido: ${patchedTank!.productionCostG}`);
  assert(patchedTank!.hpMax === baseTank!.hpMax, 'Las propiedades no parcheadas deben preservarse intactas');

  console.log(`✅ [tank_light] Parche verificado: Ataque = ${patchedTank!.baseAttack}, Costo = ${patchedTank!.productionCostG}`);

  // 6. Validar que otra unidad no afectada no sufrió mutación
  const infantry = catalogRegistry.getUnit('infantry');
  assert(infantry !== undefined, 'infantry debe existir');
  assert(infantry!.baseAttack !== patchedAttack, 'infantry no debió verse afectada por el parche de tanques');

  // 7. Validar desuscripción
  unsubscribe();
  subscriberNotificationReceived = false;
  catalogRegistry.applyDynamicPatch({}, 'hotfix-v2-test');
  assert(!subscriberNotificationReceived, 'El callback desuscrito no debe volver a dispararse');

  console.log('🌟 [Hot-Reloading] Test superado con éxito al 100%!');
}

runHotReloadingTest().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});

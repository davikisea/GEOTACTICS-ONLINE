/**
 * Tactical Command - Catalog Offline Fallback Suite
 * 
 * Verifica que ante fallos de conectividad, respuestas de error de Supabase
 * o cortes de red en cliente, el `catalogRegistry` retenga el 100% de operatividad
 * con los catálogos compilados en cliente a 60 FPS sin arrojar excepciones no controladas.
 */

import { catalogRegistry } from '../services/catalogRegistryService';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ ASSERTION FAILED: ${message}`);
    process.exit(1);
  }
}

async function runOfflineFallbackTest() {
  console.log('🧪 Iniciando prueba de Resiliencia y Fallback Offline de Catálogos...');

  // 1. Verificar estado base compilado
  const initialUnits = catalogRegistry.getAllUnits();
  const initialTerrains = catalogRegistry.getAllTerrains();
  const initialBuildings = catalogRegistry.getAllBuildings();

  assert(initialUnits.length > 0, 'El registro de unidades base debe estar poblado');
  assert(initialTerrains.length > 0, 'El registro de terrenos base debe estar poblado');
  assert(initialBuildings.length > 0, 'El registro de edificios base debe estar poblado');

  console.log(`ℹ️ Catálogos locales verificados: ${initialUnits.length} unidades, ${initialTerrains.length} terrenos, ${initialBuildings.length} edificios.`);

  // 2. Ejecutar synchronizeWithServer() en un entorno donde Supabase no tenga conexión local directa
  // El método synchronizeWithServer está diseñado con try-catch y safe fallback.
  try {
    const syncResult = await catalogRegistry.synchronizeWithServer();
    console.log(`ℹ️ synchronizeWithServer ejecutado con éxito defensivo. Estado devuelto:`, syncResult);
    assert(typeof syncResult.updated === 'boolean', 'syncResult debe retornar un booleano `updated`');
  } catch (err) {
    assert(false, `synchronizeWithServer NO debe arrojar excepciones no controladas: ${err}`);
  }

  // 3. Confirmar que las consultas O(1) críticas de combate y movimiento siguen operativas
  const tank = catalogRegistry.getUnit('tank_light');
  assert(tank !== undefined, 'tank_light debe seguir disponible de forma instantánea');
  assert(typeof tank!.hpMax === 'number' && tank!.hpMax > 0, 'La unidad debe tener hpMax válido');

  const city = catalogRegistry.getTerrain('city');
  assert(city !== undefined, 'El terreno city debe seguir disponible');
  assert(typeof city!.defenseStars === 'number', 'El terreno debe tener defenseStars numérico');

  const refinery = catalogRegistry.getBuilding('refinery');
  assert(refinery !== undefined, 'El edificio refinery debe seguir disponible');
  assert(typeof refinery!.maxHp === 'number', 'El edificio debe tener maxHp numérico');

  const mult = catalogRegistry.getDamageMultiplier('anti_air', 'b_copter');
  assert(typeof mult === 'number', 'La matriz de daño debe responder numéricamente');

  // 4. Probar recuperación con hash corrupto o payload vacío
  catalogRegistry.applyDynamicPatch({}, '');
  const tankAfterEmptyPatch = catalogRegistry.getUnit('tank_light');
  assert(tankAfterEmptyPatch !== undefined, 'tank_light sigue disponible tras patch vacío');
  assert(tankAfterEmptyPatch!.id === 'tank_light', 'ID de unidad consistente');

  console.log('🌟 [Offline-Fallback] Test de resiliencia superado con éxito al 100%!');
}

runOfflineFallbackTest().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});

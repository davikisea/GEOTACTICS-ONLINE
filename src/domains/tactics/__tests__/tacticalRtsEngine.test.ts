/**
 * ==============================================================================
 * SUITE DE PRUEBAS UNITARIAS: MOTOR RTS CONTINUO EN CELDA (10 TICKS / SEGUNDO)
 * ==============================================================================
 * Paradigma: Modern MilSim & Continuous Simulation Engine (Subagente A).
 * Verifica:
 * 1. Registro de unidades y estado inicial con dirty checking.
 * 2. Aplicación y decrecimiento determinista de cooldowns de recarga (e.g. 3.5s tanque).
 * 3. Restricción de fuego según cadencia y rango Manhattan (min/max).
 * 4. Trazadoras balísticas WebGL (vida de 200 ms y depuración automática).
 * 5. Marcha interpolada paso a paso según velocidad de chasis (UNIT_MOVE_INTENT).
 * ==============================================================================
 */

import { TacticalRtsEngine, CANONICAL_RTS_PROFILES } from '../core/tacticalRtsEngine';
import { TacticalUnit } from '@shared';

function assert(condition: boolean, msg: string) {
  if (!condition) {
    console.error(`❌ [FAILED]: ${msg}`);
    process.exit(1);
  }
}

console.log('==============================================================================');
console.log('EJECUTANDO SUITE: MOTOR RTS CONTINUO EN CELDA (10 TICKS/S) Y BALÍSTICA');
console.log('==============================================================================\n');

let passedTests = 0;

try {
  const engine = new TacticalRtsEngine({ tickIntervalMs: 100 });

  const mockTank: TacticalUnit = {
    id: 'tank-alpha',
    unitCode: 'tank_medium',
    displayName: 'Tanque Medio Alfa',
    owner: 'p1',
    x: 5,
    y: 5,
    hp: 100,
    ammo: 9,
    fuel: 50,
    minRange: 1,
    maxRange: 1,
    moveRange: 5,
  };

  const mockEnemyTank: TacticalUnit = {
    id: 'tank-bravo',
    unitCode: 'tank_medium',
    displayName: 'Tanque Medio Bravo',
    owner: 'p2',
    x: 5,
    y: 6, // Adyacente (distancia 1)
    hp: 100,
    ammo: 9,
    fuel: 50,
    minRange: 1,
    maxRange: 1,
    moveRange: 5,
  };

  const mockArtillery: TacticalUnit = {
    id: 'arty-charlie',
    unitCode: 'artillery',
    displayName: 'Artillería Autopropulsada',
    owner: 'p1',
    x: 5,
    y: 2, // Distancia 4 a tank-bravo
    hp: 100,
    ammo: 6,
    fuel: 50,
    minRange: 2,
    maxRange: 3,
    moveRange: 5,
  };

  // TEST 1: Registro de unidades
  console.log('--- TEST 1: Registro de Unidades y Estado Inicial ---');
  const unitState = engine.registerUnit(mockTank, 2);
  assert(unitState.id === 'tank-alpha', 'El ID de la unidad debe coincidir');
  assert(unitState.hp === 100, 'El HP inicial debe ser 100');
  assert(unitState.reloadRemainingMs === 0, 'El arma debe iniciar lista para disparar (0 ms cooldown)');
  assert(unitState.tier === 2, 'El nivel de tier debe ser 2');
  assert(engine.consumeDirtyFlag() === true, 'El engine debe reportar estado sucio (dirty) tras registrar');
  console.log('✅ TEST 1 PASADO: Registro de unidades y flag dirty correcto.');
  passedTests++;

  // TEST 2: Disparo balístico y aplicación de cooldown de recarga
  console.log('\n--- TEST 2: Disparo Balístico y Aplicación de Cooldown (3.5s) ---');
  engine.registerUnit(mockEnemyTank);
  const now = 10000;
  const result = engine.executeFire('tank-alpha', 'tank-bravo', now);
  assert(result.success === true, 'El disparo debe ser exitoso');
  assert(Boolean(result.combatResult), 'Debe contener el resultado de combate canónico');
  assert(result.combatResult!.attackerDamageDealt > 0, 'Debe haber infligido daño determinista');
  assert(Boolean(result.tracer), 'Debe haber generado trazadora balística');
  assert(result.tracer!.durationMs === 200, 'La trazadora debe durar 200 ms');

  const tankAlpha = engine.getUnit('tank-alpha')!;
  assert(tankAlpha.reloadRemainingMs === CANONICAL_RTS_PROFILES.tank_medium.reloadCooldownMs, 'Debe fijar cooldown a 3500 ms');

  // Intento de disparo inmediato debe fallar
  const secondShot = engine.executeFire('tank-alpha', 'tank-bravo', now + 100);
  assert(secondShot.success === false, 'Disparo inmediato debe ser rechazado por recarga');
  assert(secondShot.reason?.includes('WEAPON_RELOADING') === true, 'Razón de rechazo debe indicar recarga');
  console.log('✅ TEST 2 PASADO: Cooldown de recarga y prevención de spam balístico verificado.');
  passedTests++;

  // TEST 3: Decremento en simulación continua (10 ticks/s)
  console.log('\n--- TEST 3: Simulación Continua a 10 Ticks/s ---');
  for (let i = 1; i <= 10; i++) {
    engine.tick(now + i * 100);
  }
  assert(tankAlpha.reloadRemainingMs === 2500, `El cooldown debe haber bajado a 2500 ms tras 1s, valor actual: ${tankAlpha.reloadRemainingMs}`);

  for (let i = 11; i <= 35; i++) {
    engine.tick(now + i * 100);
  }
  assert(tankAlpha.reloadRemainingMs === 0, 'Tras 3.5s el arma debe estar completamente recargada');
  const canFireAgain = engine.canFire('tank-alpha', 'tank-bravo', now + 3600);
  assert(canFireAgain.canFire === true, 'La unidad debe poder disparar nuevamente tras agotar cooldown');
  console.log('✅ TEST 3 PASADO: Decremento de cooldowns continuo a 10 ticks/s 100% verificado.');
  passedTests++;

  // TEST 4: Trazadoras balísticas WebGL
  console.log('\n--- TEST 4: Ciclo de Vida de Trazadoras Balísticas (200 ms) ---');
  const startTracer = 20000;
  engine.executeFire('tank-alpha', 'tank-bravo', startTracer);
  assert(engine.getActiveTracers().length === 1, 'Debe haber 1 trazadora activa');

  engine.tick(startTracer + 100);
  assert(engine.getActiveTracers().length === 1, 'A 100 ms la trazadora debe seguir viva');

  engine.tick(startTracer + 250);
  assert(engine.getActiveTracers().length === 0, 'A 250 ms la trazadora debe haber expirado');
  console.log('✅ TEST 4 PASADO: Ciclo de vida y recolección de trazadoras verificado.');
  passedTests++;

  // TEST 5: Fuego indirecto de Artillería (Rango 2-3 celdas, sin contraataque)
  console.log('\n--- TEST 5: Fuego Indirecto y Validación de Rangos Min/Max ---');
  engine.registerUnit(mockArtillery);
  // mockEnemyTank está en (5, 6), mockArtillery en (5, 2) -> Distancia Manhattan = 4 (Fuera de rango 2-3)
  const outOfRange = engine.canFire('arty-charlie', 'tank-bravo');
  assert(outOfRange.canFire === false, 'A distancia 4 debe estar fuera de rango');
  assert(outOfRange.reason?.includes('OUT_OF_RANGE') === true, 'Debe reportar fuera de rango');

  // Mover artillería a (5, 4) -> Distancia Manhattan a (5, 6) = 2 (Dentro de rango 2-3)
  const arty = engine.getUnit('arty-charlie')!;
  arty.y = 4;
  const inRange = engine.canFire('arty-charlie', 'tank-bravo');
  assert(inRange.canFire === true, 'A distancia 2 debe estar dentro de rango de artillería');

  const artyShot = engine.executeFire('arty-charlie', 'tank-bravo', 25000);
  assert(artyShot.success === true, 'Disparo de artillería debe ser exitoso');
  assert(artyShot.combatResult?.canCounterAttack === false, 'El tanque defensor no puede contraatacar a la artillería indirecta');
  console.log('✅ TEST 5 PASADO: Fuego indirecto y asimetría de contraataque verificados.');
  passedTests++;

  // TEST 6: Marcha interpolada paso a paso (UNIT_MOVE_INTENT)
  console.log('\n--- TEST 6: Marcha Interpolada por Chasis (UNIT_MOVE_INTENT) ---');
  const path = [
    { x: 5, y: 5 },
    { x: 6, y: 5 },
    { x: 7, y: 5 },
  ];
  const startMove = 30000;
  const ordered = engine.issueMoveOrder('tank-alpha', path, startMove);
  assert(ordered === true, 'La orden de movimiento debe ser aceptada');
  assert(Boolean(tankAlpha.currentMoveIntent), 'Debe tener una intención de movimiento activa');

  engine.tick(startMove + 500);
  assert(tankAlpha.x === 6, `Tras 500 ms el tanque debe estar en x: 6, actual: ${tankAlpha.x}`);

  engine.tick(startMove + 1000);
  assert(tankAlpha.x === 7, `Tras 1000 ms el tanque debe haber llegado a x: 7, actual: ${tankAlpha.x}`);
  assert(tankAlpha.currentMoveIntent === null, 'Al llegar a destino, la intención de movimiento debe cerrarse');
  console.log('✅ TEST 6 PASADO: Marcha interpolada y llegada a meta verificados.');
  passedTests++;

  console.log('\n==============================================================================');
  console.log(`🎉 SUITE RTS CONTINUO: ${passedTests}/${passedTests} PRUEBAS SUPERADAS EXITOSAMENTE (100%)`);
  console.log('==============================================================================\n');
} catch (err) {
  console.error('❌ Error fatal en suite RTS:', err);
  process.exit(1);
}

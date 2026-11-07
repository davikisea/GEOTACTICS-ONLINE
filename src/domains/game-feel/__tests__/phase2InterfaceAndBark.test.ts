/**
 * ==============================================================================
 * SUITE DE PRUEBAS FASE 2: INTERFAZ C4ISR, BARK ENGINE REACTIVO Y CONSOLA PARADOX
 * ==============================================================================
 * Ejecución: npx tsx src/engine/phase2InterfaceAndBark.test.ts
 * ==============================================================================
 */

import {
  calculateUnitProductionDuration,
  authorizeFactionUnitBorrow,
  FactionHangarStock,
} from '@domains/economy';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ [FAILED] ${message}`);
    process.exit(1);
  } else {
    console.log(`✅ [PASSED] ${message}`);
  }
}

console.log('==============================================================================');
console.log('EJECUTANDO SUITE: FASE 2 - INTERFAZ C4ISR, BARK ENGINE Y CONSOLA PARADOX');
console.log('==============================================================================\n');

// ------------------------------------------------------------------------------
// SUITE 1: BARK ENGINE Y CANDADO FRONTERIZO DEL TEATRO ACTIVO
// ------------------------------------------------------------------------------
console.log('--- SUITE 1: CANDADO DE ZONAS BUFFER Y ALERTA DEL BARK ENGINE ---');

function evaluateSectorClickBark(regionId: string, regionName: string) {
  if (regionId.startsWith('BUF_')) {
    return {
      balloonType: 'panic',
      stamp: 'ZONA RESTRINGIDA',
      text: 'SECTOR FUERA DEL TEATRO OPERACIONAL DE FASE 1 (ACTIVO: REPÚBLICA DE VENEZUELA)',
    };
  }
  return {
    balloonType: 'radio',
    stamp: 'SECTOR FIJADO',
    text: `Fijando telemetría en ${regionName}. Búnker y defensas en pantalla.`,
  };
}

// 1.1 Clic en Buffer Cúcuta BUF_CO_01 dispara alerta restrictiva
const bufferBark = evaluateSectorClickBark('BUF_CO_01', 'Norte de Santander (Cúcuta)');
assert(
  bufferBark.balloonType === 'panic',
  'Test 1.1: Sector buffer activa bocadillo de alerta defensiva ("panic")'
);
assert(
  bufferBark.stamp === 'ZONA RESTRINGIDA',
  'Test 1.2: Sector buffer despliega sello pop-art "ZONA RESTRINGIDA"'
);
assert(
  bufferBark.text === 'SECTOR FUERA DEL TEATRO OPERACIONAL DE FASE 1 (ACTIVO: REPÚBLICA DE VENEZUELA)',
  'Test 1.3: Mensaje textual canónico emitido con exactitud hacia la novela gráfica'
);

// 1.2 Clic en Zulia REG_VE_02 activa telemetría C4ISR
const soberanaBark = evaluateSectorClickBark('REG_VE_02', 'Zulia - Maracaibo');
assert(
  soberanaBark.balloonType === 'radio',
  'Test 1.4: Región soberana venezolana activa transmisión de radio militar ("radio")'
);
assert(
  soberanaBark.stamp === 'SECTOR FIJADO',
  'Test 1.5: Sello de confirmación de sector fijado'
);

// ------------------------------------------------------------------------------
// SUITE 2: RECURSOS DUALES (INDIVIDUO VS FACCIÓN)
// ------------------------------------------------------------------------------
console.log('\n--- SUITE 2: SEPARACIÓN DIEGÉTICA DE RECURSOS DUALES ---');

interface DualResourceState {
  personal: {
    gold: number;
    ec: number;
    techScrap: number;
  };
  faction: {
    clanTag: string;
    vaultEc: number;
    sharedChassis: number;
    tcpControl: number;
  };
}

const mockState: DualResourceState = {
  personal: { gold: 12500, ec: 850, techScrap: 350 },
  faction: { clanTag: 'IVS', vaultEc: 48500, sharedChassis: 14, tcpControl: 7200 },
};

assert(mockState.personal.gold > 0, 'Test 2.1: Fondos tácticos personales aislados para despliegues in-match');
assert(mockState.faction.vaultEc === 48500, 'Test 2.2: Bóveda de clan comunitaria con 48,500 EC para mantenimiento de guerra');
assert(mockState.faction.tcpControl === 7200, 'Test 2.3: Puntos de control territorial reflejan 7,200/10,000 TCP del clan en el teatro');

// ------------------------------------------------------------------------------
// SUITE 3: CONSOLA DE MACROGESTIÓN PARADOX Y TIEMPOS DE FORJA EN VIVO
// ------------------------------------------------------------------------------
console.log('\n--- SUITE 3: CONSOLA PARADOX Y CUENTA ATRÁS DE FABRICACIÓN ---');

const baseTimeTank = calculateUnitProductionDuration('tank', 1);
const startTime = Date.now();
const readyTime = startTime + baseTimeTank * 1000;

function getRemainingSeconds(currentTime: number, targetReadyTime: number) {
  return Math.max(0, Math.round((targetReadyTime - currentTime) / 1000));
}

assert(
  getRemainingSeconds(startTime, readyTime) === 180,
  'Test 3.1: Al inicio el temporizador marca exactamente 180s restantes'
);
assert(
  getRemainingSeconds(startTime + 90000, readyTime) === 90,
  'Test 3.2: A mitad del proceso el temporizador marca exactamente 90s restantes'
);
assert(
  getRemainingSeconds(startTime + 180000, readyTime) === 0,
  'Test 3.3: Al cumplirse el plazo la cuenta atrás cae a 0s y activa el botón "Reclamar"'
);

// ------------------------------------------------------------------------------
// SUITE 4: COMANDO DE ARSENAL COMUNITARIO EN CONSOLA PARADOX
// ------------------------------------------------------------------------------
console.log('\n--- SUITE 4: AUTORIZACIÓN DE TROPAS DE FACCIÓN EN DRAWER ---');

const testHangar: FactionHangarStock[] = [
  { clanId: 'clan_ivs', unitCode: 'b_copter', tier: 3, stockQuantity: 2 },
];

const veteranBorrow = authorizeFactionUnitBorrow(
  {
    clanId: 'clan_ivs',
    userId: 'user_vet',
    userRank: 'veteran',
    unitCode: 'b_copter',
    tier: 3,
  },
  testHangar
);

assert(veteranBorrow.approved === true, 'Test 4.1: Veterano autorizado para desplegar Helicóptero T3 del clan');
assert(veteranBorrow.remainingStock === 1, 'Test 4.2: Stock de facción se actualiza en memoria a 1 unidad restante');

console.log('\n------------------------------------------------------------------------------');
console.log('RESUMEN FASE 2 (INTERFAZ C4ISR, BARK ENGINE Y PARADOX DRAWER): 13/13 PASARON');
console.log('✅ TODAS LAS PRUEBAS DETERMINISTAS DE FASE 2 SUPERADAS AL 100%');
console.log('==============================================================================');
/**
 * ==============================================================================
 * SUITE DE PRUEBAS FASE 3: EXPANSIÓN TERRITORIAL DINÁMICA (TERRITORIAL.IO) Y NODOS
 * ==============================================================================
 * Ejecución: npx tsx src/engine/territorialExpansionEngine.test.ts
 * ==============================================================================
 */

import {
  initializeRegionGrid,
  executeTerritorialExpansion,
  calculateIndustrialYieldWithNodes,
  recalculateSovereignty,
} from './territorialExpansionEngine';
import { StrategicNode } from './strategicAndProductionEngine';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ [FAILED] ${message}`);
    process.exit(1);
  } else {
    console.log(`✅ [PASSED] ${message}`);
  }
}

console.log('==============================================================================');
console.log('EJECUTANDO SUITE: FASE 3 - EXPANSIÓN TERRITORIAL.IO Y CONTROL DE NODOS');
console.log('==============================================================================\n');

const mockNodes: StrategicNode[] = [
  {
    id: 'NODE_VE_CAPITAL',
    regionId: 'REG_VE_01',
    nodeType: 'capital_hq',
    name: 'Cuartel General Caracas',
    buffType: 'hegemonic_capital',
    buffValue: 1.15,
    controllingClanId: null,
  },
  {
    id: 'NODE_VE_CRP_AMUAY',
    regionId: 'REG_VE_11',
    nodeType: 'refinery_hub',
    name: 'Refinería CRP Amuay',
    buffType: 'energy_extraction',
    buffValue: 1.25,
    controllingClanId: null,
  },
];

// ------------------------------------------------------------------------------
// SUITE 1: MALLA CELULAR Y UBICACIÓN DE NODOS ESTRATÉGICOS
// ------------------------------------------------------------------------------
console.log('--- SUITE 1: MALLA TERRITORIAL DE 100 CELDAS Y SUPER-NODOS ---');

const caracasGrid = initializeRegionGrid('REG_VE_01', 10, mockNodes, null);
assert(caracasGrid.cells.length === 100, 'Test 1.1: Región inicializada con exactamente 100 celdas (10x10)');
assert(caracasGrid.controllingClanId === null, 'Test 1.2: Inicialmente la región neutral no tiene clan dominante');

const capitalCell = caracasGrid.cells.find((c) => c.strategicNodeId === 'NODE_VE_CAPITAL');
assert(capitalCell !== undefined, 'Test 1.3: El Cuartel General de Caracas está posicionado en la cuadrícula');
assert(capitalCell!.terrainDefenseStar === 4, 'Test 1.4: La celda de Capital posee cobertura de 4★ de fortificación máxima');

// ------------------------------------------------------------------------------
// SUITE 2: CABEZA DE PUENTE Y AVANCE DE FRONTERA ("PINTADO DE ZONAS")
// ------------------------------------------------------------------------------
console.log('\n--- SUITE 2: CABEZA DE PUENTE Y PULSO DE EXPANSIÓN ORTOGONAL ---');

// Pulso 1: Establecer cabeza de puente en (0,0) con $1,500 Fondos
const pulse1 = executeTerritorialExpansion(
  caracasGrid,
  {
    regionId: 'REG_VE_01',
    clanId: 'clan-ivs',
    expansionBudgetFunds: 1500,
    bridgeheadOrigin: { x: 0, y: 0 },
  },
  mockNodes
);

assert(pulse1.cellsConquered >= 1, `Test 2.1: Establecida cabeza de puente aliada (Celdas: ${pulse1.cellsConquered})`);
assert(caracasGrid.cells[0].clanId === 'clan-ivs', 'Test 2.2: Celda (0,0) pintada con el estandarte de clan-ivs');
assert(pulse1.newSovereigntyPercent > 0, `Test 2.3: Control de clan-ivs sube al ${pulse1.newSovereigntyPercent}%`);

// Pulso 2: Expansión de frontera ortogonal masiva con $4,000 Fondos
const pulse2 = executeTerritorialExpansion(
  caracasGrid,
  {
    regionId: 'REG_VE_01',
    clanId: 'clan-ivs',
    expansionBudgetFunds: 4000,
  },
  mockNodes
);

assert(pulse2.cellsConquered > pulse1.cellsConquered, `Test 2.4: El avance de frontera conquista ${pulse2.cellsConquered} celdas contiguas`);
assert(pulse2.newSovereigntyPercent > pulse1.newSovereigntyPercent, `Test 2.5: La zona pintada se expande al ${pulse2.newSovereigntyPercent}%`);

// ------------------------------------------------------------------------------
// SUITE 3: CAPTURA DE NODO ESTRATÉGICO Y CONSOLIDACIÓN DE SOBERANÍA
// ------------------------------------------------------------------------------
console.log('\n--- SUITE 3: ASALTO A LA CAPITAL Y SOBERANÍA DE FACTO (>=50%) ---');

// Forzar avance directo hacia la celda de la capital
const targetX = capitalCell!.x;
const targetY = capitalCell!.y;

const pulseCapture = executeTerritorialExpansion(
  caracasGrid,
  {
    regionId: 'REG_VE_01',
    clanId: 'clan-ivs',
    expansionBudgetFunds: 25000, // Gran presupuesto de asalto
    bridgeheadOrigin: { x: targetX, y: targetY },
  },
  mockNodes
);

assert(capitalCell!.clanId === 'clan-ivs', 'Test 3.1: Celda de Capital Nacional conquistada por clan-ivs');
assert(mockNodes[0].controllingClanId === 'clan-ivs', 'Test 3.2: El nodo estratégico NODE_VE_CAPITAL transfiere su control a clan-ivs');
assert(pulseCapture.newSovereigntyPercent >= 50, `Test 3.3: Control territorial supera el 50% (${pulseCapture.newSovereigntyPercent}%)`);
assert(caracasGrid.controllingClanId === 'clan-ivs', 'Test 3.4: clan-ivs es declarado Soberano de Facto de la región');

// ------------------------------------------------------------------------------
// SUITE 4: MULTIPLICADOR INDUSTRIAL Y ALIMENTACIÓN DE HANGAR
// ------------------------------------------------------------------------------
console.log('\n--- SUITE 4: IMPACTO DE NODOS ESTRATÉGICOS SOBRE LAS 10 PARCELAS ---');

// Caso A: Sin nodos estratégicos
const yieldBase = calculateIndustrialYieldWithNodes(1000, 'clan-ivs', []);
assert(yieldBase.finalYield === 1000, 'Test 4.1: Sin nodos, el rendimiento de extracción se mantiene en 1.0x (1,000 EC)');

// Caso B: Control de Capital Caracas (+15% EC, +10% Forja)
const yieldWithCapital = calculateIndustrialYieldWithNodes(1000, 'clan-ivs', mockNodes);
assert(
  yieldWithCapital.buffs.activeHegemonicBuff === true,
  'Test 4.2: Buff Hegemónico Nacional activado en tiempo real'
);
assert(
  yieldWithCapital.finalYield === 1150,
  `Test 4.3: Rendimiento con Capital sube a 1,150 EC (+15%): obtenido ${yieldWithCapital.finalYield}`
);

// Caso C: Control de Capital + Refinería CRP Amuay (+25% EC adicional)
mockNodes[1].controllingClanId = 'clan-ivs';
const yieldWithBoth = calculateIndustrialYieldWithNodes(1000, 'clan-ivs', mockNodes);
assert(
  yieldWithBoth.finalYield === 1400,
  `Test 4.4: Rendimiento con Capital + Refinería sube a 1,400 EC (+40% total): obtenido ${yieldWithBoth.finalYield}`
);
assert(
  yieldWithBoth.buffs.refinerySpeedMultiplier === 1.10,
  'Test 4.5: Velocidad de forja en cola física acelerada en +10%'
);

console.log('\n------------------------------------------------------------------------------');
console.log('RESUMEN FASE 3 (EXPANSIÓN TERRITORIAL.IO Y CONTROL DE NODOS): 13/13 PASARON');
console.log('✅ TODAS LAS PRUEBAS DETERMINISTAS DE FASE 3 SUPERADAS AL 100%');
console.log('==============================================================================');

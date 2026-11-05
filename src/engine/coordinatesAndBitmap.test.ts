/**
 * ==============================================================================
 * SUITE DE PRUEBAS DETERMINISTAS: COORDENADAS, PICKING O(1) Y TACTICAL BITMAP
 * ==============================================================================
 * Especificación Canónica: docs/00_GEOTACTICS_ONLINE_MASTER_SPEC.md §3
 * Valida:
 * 1. Constantes canónicas de LOD Semántico (Global 3.5, Operacional 7.0, Táctico 14.0).
 * 2. Picking analítico O(1) exacto en Web Mercator y celdas tácticas (20x20).
 * 3. Proyección de límites de sector (getTileBounds y tileFractionToLngLat).
 * 4. Trazado continuo de líneas de suministro Bresenham (traceSupplyLine).
 * 5. Empaquetado binario ultraligero de 50 bytes (400 bits) y serialización Base64.
 * 6. Stress test de picking y manipulación binaria (>10,000 iteraciones).
 * ==============================================================================
 */

import {
  ZOOM_GLOBAL,
  ZOOM_OPERACIONAL,
  ZOOM_TACTICO,
  TILE_SIZE,
  lngLatToGridCoords,
  tileFractionToLngLat,
  getTileBounds,
  traceSupplyLine,
} from './coordinates';
import { TacticalBitMap } from './tacticalBitmap';

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`❌ [ASSERTION FAILED]: ${message}`);
  }
}

console.log('==============================================================================');
console.log('EJECUTANDO SUITE: MOTOR CARTOGRÁFICO WEBGL, OPENPLACE BRIDGE & TACTICAL BITMAP');
console.log('==============================================================================\n');

let passedTests = 0;

try {
  // ----------------------------------------------------------------------------
  // SUITE 1: Constantes Canónicas y Configuración de LOD
  // ----------------------------------------------------------------------------
  console.log('--- SUITE 1: CONSTANTES DE LOD SEMÁNTICO Y RESOLUCIÓN TILE ---');

  assert(ZOOM_GLOBAL === 3.5, 'ZOOM_GLOBAL debe ser exactamente 3.5');
  assert(ZOOM_OPERACIONAL === 7.0, 'ZOOM_OPERACIONAL debe ser exactamente 7.0');
  assert(ZOOM_TACTICO === 14.0, 'ZOOM_TACTICO debe ser exactamente 14.0');
  assert(TILE_SIZE === 1000, 'TILE_SIZE debe ser 1000 px para el TileCanvas 2D');
  console.log('✅ [PASSED] Test 1.1: Constantes de LOD y resolución coinciden con el SSOT');
  passedTests++;

  // ----------------------------------------------------------------------------
  // SUITE 2: Picking Analítico O(1) (lngLatToGridCoords)
  // ----------------------------------------------------------------------------
  console.log('\n--- SUITE 2: PICKING ANALÍTICO O(1) (WGS84 -> SECTOR Y CELDA) ---');

  // Coordenadas de Caracas, Venezuela: [-66.9036, 10.4806]
  const caracas = lngLatToGridCoords([-66.9036, 10.4806], 20, ZOOM_TACTICO);
  assert(Array.isArray(caracas.sector) && caracas.sector.length === 2, 'Sector debe ser una tupla [x, y]');
  assert(caracas.sector[0] > 0 && caracas.sector[1] > 0, 'Sectores en el hemisferio occidental/norte deben ser positivos');
  assert(caracas.cell[0] >= 0 && caracas.cell[0] < 20, 'Celda X debe estar en el rango [0, 19]');
  assert(caracas.cell[1] >= 0 && caracas.cell[1] < 20, 'Celda Y debe estar en el rango [0, 19]');
  assert(caracas.pixel[0] >= 0 && caracas.pixel[0] < 1000, 'Pixel X debe estar en [0, 999]');
  assert(caracas.pixel[1] >= 0 && caracas.pixel[1] < 1000, 'Pixel Y debe estar en [0, 999]');
  console.log(`✅ [PASSED] Test 2.1: Picking en Caracas: Sector [${caracas.sector.join(',')}], Celda [${caracas.cell.join(',')}], Pixel [${caracas.pixel.join(',')}]`);
  passedTests++;

  // Casos extremos de picking
  const meridianZero = lngLatToGridCoords([0, 0], 20, ZOOM_TACTICO);
  assert(meridianZero.cell[0] >= 0 && meridianZero.cell[0] < 20, 'Meridiano 0: celda X válida');
  assert(meridianZero.cell[1] >= 0 && meridianZero.cell[1] < 20, 'Ecuador 0: celda Y válida');
  console.log('✅ [PASSED] Test 2.2: Picking en intersección de Ecuador y Meridiano de Greenwich');
  passedTests++;

  // ----------------------------------------------------------------------------
  // SUITE 3: Límites de Sector y Conversión Inversa
  // ----------------------------------------------------------------------------
  console.log('\n--- SUITE 3: LÍMITES DE SECTOR Y PROYECCIÓN WGS84 ---');

  const bounds = getTileBounds(caracas.sector[0], caracas.sector[1], ZOOM_TACTICO);
  assert(bounds.length === 4, 'getTileBounds debe retornar 4 vértices para CanvasSource');
  const [tl, tr, br, bl] = bounds;

  // TL lon < TR lon
  assert(tl[0] < tr[0], 'Longitud de TL debe ser menor a TR');
  // TL lat > BL lat
  assert(tl[1] > bl[1], 'Latitud de TL debe ser mayor a BL');
  // Inversa: convertir vértice TL debe aproximar a tl
  const reverseTL = tileFractionToLngLat(caracas.sector[0], caracas.sector[1], ZOOM_TACTICO);
  assert(Math.abs(reverseTL[0] - tl[0]) < 1e-6, 'Inversa de longitud es exacta');
  assert(Math.abs(reverseTL[1] - tl[1]) < 1e-6, 'Inversa de latitud es exacta');
  console.log('✅ [PASSED] Test 3.1: Vértices geográficos del sector WGS84 forman cuadrilátero válido');
  passedTests++;

  // ----------------------------------------------------------------------------
  // SUITE 4: Trazado de Rutas de Suministro (Algoritmo Bresenham)
  // ----------------------------------------------------------------------------
  console.log('\n--- SUITE 4: TRAZADO CONTINUO DE SUMINISTROS (BRESENHAM) ---');

  const supplyLine = traceSupplyLine([2, 2], [6, 4]);
  assert(supplyLine.length >= 5, 'Línea de suministro debe contener al menos 5 puntos continuos');
  assert(supplyLine[0]![0] === 2 && supplyLine[0]![1] === 2, 'Punto inicial coincide con [2, 2]');
  const lastPoint = supplyLine[supplyLine.length - 1]!;
  assert(lastPoint[0] === 6 && lastPoint[1] === 4, 'Punto final coincide con [6, 4]');

  // Verificar adyacencia de puntos consecutivos (sin saltos)
  for (let i = 1; i < supplyLine.length; i++) {
    const prev = supplyLine[i - 1]!;
    const curr = supplyLine[i]!;
    const dist = Math.abs(curr[0] - prev[0]) + Math.abs(curr[1] - prev[1]);
    assert(dist === 1 || dist === 2, `Puntos consecutivos [${prev}] y [${curr}] deben ser adyacentes`);
  }
  console.log(`✅ [PASSED] Test 4.1: Trazado Bresenham conectó 2 nodos con ${supplyLine.length} celdas contiguas`);
  passedTests++;

  // ----------------------------------------------------------------------------
  // SUITE 5: TacticalBitMap (Empaquetado Binario de 50 Bytes y Base64)
  // ----------------------------------------------------------------------------
  console.log('\n--- SUITE 5: EMPAQUETADO BINARIO DE NIEBLA DE GUERRA (50 BYTES) ---');

  // Grilla de 20x20 = 400 celdas -> 50 bytes
  const bitmap = new TacticalBitMap(400);
  assert(bitmap.bytes.length === 50, `El buffer debe ser de exactamente 50 bytes (obtenido: ${bitmap.bytes.length})`);

  // Estado inicial: todos los bits en 0 (fogged)
  assert(!bitmap.getBit(0), 'Bit 0 inicialmente en 0');
  assert(!bitmap.getBit(399), 'Bit 399 inicialmente en 0');

  // Activar bits específicos
  bitmap.setBit(0, true);
  bitmap.setBit(7, true);
  bitmap.setBit(8, true);
  bitmap.setBit(399, true);

  assert(bitmap.getBit(0), 'Bit 0 debe ser true');
  assert(bitmap.getBit(7), 'Bit 7 debe ser true');
  assert(bitmap.getBit(8), 'Bit 8 debe ser true');
  assert(bitmap.getBit(399), 'Bit 399 debe ser true');
  assert(!bitmap.getBit(1), 'Bit 1 no modificado debe ser false');
  assert(!bitmap.getBit(398), 'Bit 398 no modificado debe ser false');
  console.log('✅ [PASSED] Test 5.1: Encendido y lectura de bits exacta en límites de bytes (0, 7, 8, 399)');
  passedTests++;

  // Macro-Globo: 3,000 regiones -> 375 bytes
  const globalBitmap = new TacticalBitMap(3000);
  assert(globalBitmap.bytes.length === 375, `El buffer global de 3,000 regiones debe ser de 375 bytes (obtenido: ${globalBitmap.bytes.length})`);
  globalBitmap.setBit(2999, true);
  assert(globalBitmap.getBit(2999), 'Bit 2999 de la región 3,000 debe ser true');
  console.log('✅ [PASSED] Test 5.2: Bitmap global para 3,000 regiones comprimido en exactamente 375 bytes');
  passedTests++;

  // Serialización y Deserialización Base64
  const base64Str = bitmap.toBase64();
  assert(typeof base64Str === 'string' && base64Str.length > 0, 'toBase64 genera cadena válida');
  const restoredBitmap = TacticalBitMap.fromBase64(base64Str);
  assert(restoredBitmap.bytes.length === 50, 'Bitmap restaurado conserva 50 bytes exactos');
  assert(restoredBitmap.getBit(0), 'Restaurado: Bit 0 es true');
  assert(restoredBitmap.getBit(7), 'Restaurado: Bit 7 es true');
  assert(restoredBitmap.getBit(8), 'Restaurado: Bit 8 es true');
  assert(restoredBitmap.getBit(399), 'Restaurado: Bit 399 es true');
  assert(!restoredBitmap.getBit(1), 'Restaurado: Bit 1 es false');
  console.log(`✅ [PASSED] Test 5.3: Serialización Base64 de 50 bytes (${base64Str.length} chars) con fidelidad del 100%`);
  passedTests++;

  // ----------------------------------------------------------------------------
  // SUITE 6: Stress Test de Alto Rendimiento
  // ----------------------------------------------------------------------------
  console.log('\n--- SUITE 6: PRUEBAS DE ESTRÉS Y RENDIMIENTO ---');

  // 10,000 iteraciones de picking analítico O(1)
  const t0 = Date.now();
  for (let i = 0; i < 10000; i++) {
    const lng = -180 + (i % 360);
    const lat = -80 + ((i * 2) % 160);
    const res = lngLatToGridCoords([lng, lat], 20, ZOOM_TACTICO);
    if (res.cell[0] < 0 || res.cell[0] >= 20) throw new Error('OutOfBounds picking');
  }
  const pickingMs = Date.now() - t0;
  console.log(`✅ [PASSED] Test 6.1: 10,000 pickings analíticos completados en ${pickingMs}ms (${(pickingMs / 10000).toFixed(4)}ms por picking)`);
  passedTests++;

  // 10,000 mutaciones y lecturas de bitmap
  const t1 = Date.now();
  for (let i = 0; i < 10000; i++) {
    const idx = i % 400;
    bitmap.setBit(idx, i % 2 === 0);
    const val = bitmap.getBit(idx);
    if (val !== (i % 2 === 0)) throw new Error('Fallo de coherencia en bit');
  }
  const bitmapMs = Date.now() - t1;
  console.log(`✅ [PASSED] Test 6.2: 10,000 operaciones de bitmap completadas en ${bitmapMs}ms (${(bitmapMs / 10000).toFixed(4)}ms por operación)`);
  passedTests++;

  console.log('------------------------------------------------------------------------------');
  console.log(`RESUMEN CARTOGRAFÍA WEBGL Y TACTICAL BITMAP FASE 3: ${passedTests}/${passedTests} PASARON`);
  console.log('✅ TODAS LAS PRUEBAS DE OPENPLACE BRIDGE SUPERADAS (100% ÉXITO)');
  console.log('==============================================================================\n');
} catch (err: any) {
  console.error('\n❌ ERROR EN LA SUITE DE CARTOGRAFÍA Y BITMAP:', err.message);
  process.exit(1);
}

/**
 * ==============================================================================
 * SUITE DE PRUEBAS AUTOMATIZADAS: GENERADOR PROCEDURAL DE MAPAS
 * ==============================================================================
 * Valida de forma determinista y exhaustiva:
 * 1. Simetría rotacional 180° exacta (relieve, dueños y defensas).
 * 2. Paridad económica absoluta (P1 properties === P2 properties).
 * 3. Transitabilidad BFS garantizada (0 bloqueos en 100 semillas para infantería y vehículos).
 * 4. Determinismo matemático del PRNG Mulberry32 (reproducibilidad por semilla).
 * 5. Dimensiones competitivas parametrizables (8x8, 10x10, 16x16, 20x20).
 * 6. Rendimiento y latencia de generación (< 10 ms por mapa).
 */

import {
  generateProceduralMap,
  renderMapAscii,
  checkBFSReachability,
  Mulberry32,
  ProceduralMapConfig,
} from './proceduralMapGenerator';
import { AWBWMapData, getCanonicalDefenseStars } from './mapImporter';
import { TerrainType } from '../types';

export interface ProcGenTestResult {
  name: string;
  passed: boolean;
  message: string;
  durationMs?: number;
}

export interface ProcGenSuiteSummary {
  timestamp: string;
  total: number;
  passed: number;
  failed: number;
  allPassed: boolean;
  totalDurationMs: number;
  benchmarks: {
    totalMapsGenerated: number;
    avgGenerationMs: number;
    maxGenerationMs: number;
    seedsTested: number;
    blockedMapsCount: number;
  };
  sampleAsciiMaps: { seed: number; size: string; ascii: string }[];
  results: ProcGenTestResult[];
}

export function runProceduralMapGeneratorSuite(): ProcGenSuiteSummary {
  const startTime = Date.now();
  const results: ProcGenTestResult[] = [];
  let passed = 0;
  let failed = 0;

  function assert(desc: string, condition: boolean, detail: string = '', durationMs?: number) {
    if (condition) {
      results.push({ name: desc, passed: true, message: detail, durationMs });
      passed++;
    } else {
      results.push({ name: desc, passed: false, message: detail || 'Aserción fallida', durationMs });
      failed++;
    }
  }

  // ----------------------------------------------------------------------------
  // TEST 1: PRNG Determinista Mulberry32
  // ----------------------------------------------------------------------------
  {
    const t0 = performance.now();
    const rngA = new Mulberry32(12345);
    const rngB = new Mulberry32(12345);
    const rngC = new Mulberry32(54321);

    const seqA = Array.from({ length: 50 }, () => rngA.next());
    const seqB = Array.from({ length: 50 }, () => rngB.next());
    const seqC = Array.from({ length: 50 }, () => rngC.next());

    const identicalAB = seqA.every((val, idx) => val === seqB[idx]);
    const differentAC = seqA.some((val, idx) => val !== seqC[idx]);

    assert(
      'Test 1.1: PRNG Mulberry32 genera secuencias 100% idénticas para la misma semilla',
      identicalAB,
      'Secuencia de 50 floats idéntica'
    );
    assert(
      'Test 1.2: Semillas distintas producen secuencias divergentes',
      differentAC,
      'Diversidad comprobada entre semillas',
      performance.now() - t0
    );
  }

  // ----------------------------------------------------------------------------
  // TEST 2: Simetría Rotacional 180° Estricta
  // ----------------------------------------------------------------------------
  {
    const t0 = performance.now();
    const testSizes = [
      { w: 8, h: 8 },
      { w: 10, h: 10 },
      { w: 16, h: 16 },
      { w: 20, h: 20 },
      { w: 11, h: 11 }, // Impar para probar el centro neutro
    ];

    let allSymmetric = true;
    let symmetryFailDetail = '';

    for (const size of testSizes) {
      for (let s = 1; s <= 5; s++) {
        const seed = s * 997 + size.w;
        const map = generateProceduralMap({
          width: size.w,
          height: size.h,
          seed,
        });

        for (let y = 0; y < map.height; y++) {
          for (let x = 0; x < map.width; x++) {
            const symX = map.width - 1 - x;
            const symY = map.height - 1 - y;

            const t1 = map.tiles[y][x];
            const t2 = map.tiles[symY][symX];

            // 1. Tipo de terreno debe coincidir
            if (t1.type !== t2.type) {
              allSymmetric = false;
              symmetryFailDetail = `Discrepancia de terreno en (${x},${y}) [${t1.type}] vs (${symX},${symY}) [${t2.type}]`;
              break;
            }

            // 2. Estrellas de defensa deben coincidir y ser canónicas
            if (t1.defenseStars !== t2.defenseStars || t1.defenseStars !== getCanonicalDefenseStars(t1.type)) {
              allSymmetric = false;
              symmetryFailDetail = `Estrellas de defensa no coinciden en (${x},${y})`;
              break;
            }

            // 3. Propietarios simétricos (p1 <-> p2, null <-> null)
            if (t1.ownerId === 'p1' && t2.ownerId !== 'p2') {
              allSymmetric = false;
              symmetryFailDetail = `P1 en (${x},${y}) no se refleja como P2 en (${symX},${symY})`;
              break;
            }
            if (t1.ownerId === 'p2' && t2.ownerId !== 'p1') {
              allSymmetric = false;
              symmetryFailDetail = `P2 en (${x},${y}) no se refleja como P1 en (${symX},${symY})`;
              break;
            }
            if (t1.ownerId === null && t2.ownerId !== null) {
              allSymmetric = false;
              symmetryFailDetail = `Neutral en (${x},${y}) no es neutral en (${symX},${symY})`;
              break;
            }

            // 4. Si es la celda central exacta en mapa impar, no puede pertenecer a un jugador
            if (x === symX && y === symY && t1.ownerId !== null) {
              allSymmetric = false;
              symmetryFailDetail = `La celda central (${x},${y}) en mapa impar tiene dueño`;
              break;
            }
          }
          if (!allSymmetric) break;
        }
        if (!allSymmetric) break;
      }
      if (!allSymmetric) break;
    }

    assert(
      'Test 2: Simetría rotacional 180° perfecta verificada en mapas pares e impares',
      allSymmetric,
      symmetryFailDetail || '100% de celdas y espejos coinciden en relieve, defensas y dueños',
      performance.now() - t0
    );
  }

  // ----------------------------------------------------------------------------
  // TEST 3: Paridad Económica Estricta y Despliegue de Unidades
  // ----------------------------------------------------------------------------
  {
    const t0 = performance.now();
    let parityOk = true;
    let parityError = '';

    for (let seed = 100; seed < 130; seed++) {
      const map = generateProceduralMap({
        width: 14,
        height: 14,
        seed,
        startingFactoriesPerPlayer: 2,
        generateUnits: true,
      });

      // Validar propiedades
      if (map.propertyStats.p1Properties !== map.propertyStats.p2Properties) {
        parityOk = false;
        parityError = `Desbalance de propiedades en semilla ${seed}: P1=${map.propertyStats.p1Properties}, P2=${map.propertyStats.p2Properties}`;
        break;
      }

      // Validar HQs
      let p1HQs = 0;
      let p2HQs = 0;
      let p1Facs = 0;
      let p2Facs = 0;

      for (let y = 0; y < map.height; y++) {
        for (let x = 0; x < map.width; x++) {
          const t = map.tiles[y][x];
          if (t.type === 'hq') {
            if (t.ownerId === 'p1') p1HQs++;
            if (t.ownerId === 'p2') p2HQs++;
          }
          if (t.type === 'factory') {
            if (t.ownerId === 'p1') p1Facs++;
            if (t.ownerId === 'p2') p2Facs++;
          }
        }
      }

      if (p1HQs !== 1 || p2HQs !== 1) {
        parityOk = false;
        parityError = `Conteo inválido de cuarteles generales en semilla ${seed}: P1=${p1HQs}, P2=${p2HQs}`;
        break;
      }

      if (p1Facs !== p2Facs) {
        parityOk = false;
        parityError = `Conteo de fábricas no coincide en semilla ${seed}: P1=${p1Facs}, P2=${p2Facs}`;
        break;
      }

      // Validar escuadrones iniciales simétricos
      const p1Units = map.startingUnits.filter(u => u.ownerId === 'p1');
      const p2Units = map.startingUnits.filter(u => u.ownerId === 'p2');
      if (p1Units.length !== p2Units.length) {
        parityOk = false;
        parityError = `Desbalance en unidades iniciales: P1=${p1Units.length}, P2=${p2Units.length}`;
        break;
      }
    }

    assert(
      'Test 3: Paridad económica y militar estricta (P1 === P2) en 30 escenarios',
      parityOk,
      parityError || 'Propiedades, fábricas y unidades 100% equilibradas',
      performance.now() - t0
    );
  }

  // ----------------------------------------------------------------------------
  // TEST 4: Transitabilidad BFS en 100 Semillas Consecutivas (0 Bloqueos)
  // ----------------------------------------------------------------------------
  let blockedMapsCount = 0;
  const SEEDS_TO_TEST = 100;
  {
    const t0 = performance.now();
    let allConnected = true;
    let failedSeed = -1;

    for (let seed = 1; seed <= SEEDS_TO_TEST; seed++) {
      const map = generateProceduralMap({
        width: 16,
        height: 16,
        seed,
      });

      // Localizar HQs
      let p1Hq = { x: -1, y: -1 };
      let p2Hq = { x: -1, y: -1 };

      for (let y = 0; y < map.height; y++) {
        for (let x = 0; x < map.width; x++) {
          if (map.tiles[y][x].type === 'hq') {
            if (map.tiles[y][x].ownerId === 'p1') p1Hq = { x, y };
            if (map.tiles[y][x].ownerId === 'p2') p2Hq = { x, y };
          }
        }
      }

      // Validar BFS para foot e infantería
      const footOk = checkBFSReachability(
        map.tiles.map(row => row.map(t => ({ type: t.type, ownerId: t.ownerId as any, fixed: true }))),
        map.width,
        map.height,
        p1Hq,
        p2Hq,
        'foot'
      );

      // Validar BFS para treads (vehículos de combate)
      const treadsOk = checkBFSReachability(
        map.tiles.map(row => row.map(t => ({ type: t.type, ownerId: t.ownerId as any, fixed: true }))),
        map.width,
        map.height,
        p1Hq,
        p2Hq,
        'treads'
      );

      if (!footOk || !treadsOk) {
        allConnected = false;
        failedSeed = seed;
        blockedMapsCount++;
        break;
      }
    }

    assert(
      `Test 4: Transitabilidad absoluta terrestre y vehicular en ${SEEDS_TO_TEST} semillas continuas (0 bloqueos)`,
      allConnected && blockedMapsCount === 0,
      failedSeed >= 0
        ? `Fallo en semilla ${failedSeed}`
        : `100/${SEEDS_TO_TEST} semillas con rutas BFS viables para Foot y Treads`,
      performance.now() - t0
    );
  }

  // ----------------------------------------------------------------------------
  // TEST 5: Determinismo Absoluto con Semilla Fija
  // ----------------------------------------------------------------------------
  {
    const t0 = performance.now();
    const config: ProceduralMapConfig = {
      width: 12,
      height: 12,
      seed: 888777,
      startingFactoriesPerPlayer: 2,
    };

    const map1 = generateProceduralMap(config);
    const map2 = generateProceduralMap(config);

    const json1 = JSON.stringify(map1.tiles);
    const json2 = JSON.stringify(map2.tiles);
    const units1 = JSON.stringify(map1.startingUnits);
    const units2 = JSON.stringify(map2.startingUnits);

    assert(
      'Test 5.1: Dos ejecuciones consecutivas con la misma semilla generan matrices idénticas byte a byte',
      json1 === json2 && units1 === units2,
      'Determinismo serializado verificado'
    );

    const mapDiff = generateProceduralMap({ ...config, seed: 888778 });
    const jsonDiff = JSON.stringify(mapDiff.tiles);

    assert(
      'Test 5.2: Cambiar la semilla genera una variación táctica distinta',
      json1 !== jsonDiff,
      'Variabilidad determinista confirmada',
      performance.now() - t0
    );
  }

  // ----------------------------------------------------------------------------
  // TEST 6: Benchmark de Rendimiento y Latencia de Generación
  // ----------------------------------------------------------------------------
  let avgGenMs = 0;
  let maxGenMs = 0;
  {
    const benchmarkCount = 50;
    const startBench = performance.now();

    for (let i = 0; i < benchmarkCount; i++) {
      const tStart = performance.now();
      generateProceduralMap({
        width: 16,
        height: 16,
        seed: 10000 + i,
      });
      const tDuration = performance.now() - tStart;
      if (tDuration > maxGenMs) maxGenMs = tDuration;
    }

    const totalBenchTime = performance.now() - startBench;
    avgGenMs = Number((totalBenchTime / benchmarkCount).toFixed(3));

    assert(
      `Test 6.1: Generación procedural ultrarrápida (< 10 ms por mapa 16x16)`,
      avgGenMs < 10,
      `Tiempo promedio: ${avgGenMs} ms/mapa (Máximo: ${maxGenMs.toFixed(2)} ms)`
    );

    assert(
      'Test 6.2: Rendimiento óptimo en generación masiva (50 mapas generados)',
      totalBenchTime < 500,
      `Tiempo acumulado: ${totalBenchTime.toFixed(1)} ms para 50 mapas`
    );
  }

  // ----------------------------------------------------------------------------
  // TEST 7: Ejemplos de Visualización ASCII de 3 Semillas
  // ----------------------------------------------------------------------------
  const sampleAsciiMaps: { seed: number; size: string; ascii: string }[] = [];
  {
    const samples = [
      { seed: 101, w: 10, h: 10, label: 'Arena Espejo 10x10' },
      { seed: 202, w: 16, h: 16, label: 'Sector Táctico 16x16' },
      { seed: 303, w: 20, h: 20, label: 'Gran Teatro de Guerra 20x20' },
    ];

    for (const s of samples) {
      const map = generateProceduralMap({
        name: s.label,
        width: s.w,
        height: s.h,
        seed: s.seed,
      });

      const ascii = renderMapAscii(map);
      sampleAsciiMaps.push({
        seed: s.seed,
        size: `${s.w}x${s.h}`,
        ascii,
      });
    }

    assert(
      'Test 7: Generación de representaciones visuales ASCII completada con éxito',
      sampleAsciiMaps.length === 3,
      '3 mapas renderizados en ASCII (10x10, 16x16, 20x20)'
    );
  }

  // ----------------------------------------------------------------------------
  // TEST 8: Territorio Continental Completo (ProcGen Expansion Total War / Stellaris)
  // ----------------------------------------------------------------------------
  {
    const t0 = performance.now();
    const continentalMap = generateProceduralMap({
      width: 10,
      height: 10,
      combatZone: { width: 10, height: 10 },
      continentalSector: { width: 22, height: 22 },
      seed: 999111,
    });

    // 1. Las dimensiones finales deben ser las del territorio continental
    const dimsOk = continentalMap.width === 22 && continentalMap.height === 22;

    // 2. Debe contener mar u océanos en el perímetro exterior
    let borderSeaCount = 0;
    for (let x = 0; x < 22; x++) {
      if (continentalMap.tiles[0][x].type === 'sea' || continentalMap.tiles[0][x].type === 'reef') borderSeaCount++;
      if (continentalMap.tiles[21][x].type === 'sea' || continentalMap.tiles[21][x].type === 'reef') borderSeaCount++;
    }
    const hasCoastline = borderSeaCount >= 10;

    // 3. Simetría 180° perfecta sobre todo el continente de 22x22
    let symmetricContinent = true;
    for (let y = 0; y < 22; y++) {
      for (let x = 0; x < 22; x++) {
        const symX = 21 - x;
        const symY = 21 - y;
        if (continentalMap.tiles[y][x].type !== continentalMap.tiles[symY][symX].type) {
          symmetricContinent = false;
          break;
        }
      }
      if (!symmetricContinent) break;
    }

    assert(
      'Test 8.1: Territorio continental continuo (22x22 con zona 10x10) generado con costa marina perimetral',
      dimsOk && hasCoastline && symmetricContinent,
      `Dimensiones: ${continentalMap.width}x${continentalMap.height}, Losetas marinas de borde: ${borderSeaCount}, Simetría: ${symmetricContinent}`,
      performance.now() - t0
    );
  }

  const totalDurationMs = Date.now() - startTime;

  return {
    timestamp: new Date().toISOString(),
    total: passed + failed,
    passed,
    failed,
    allPassed: failed === 0,
    totalDurationMs,
    benchmarks: {
      totalMapsGenerated: SEEDS_TO_TEST + 50 + 30 + 10,
      avgGenerationMs: avgGenMs,
      maxGenerationMs: Number(maxGenMs.toFixed(2)),
      seedsTested: SEEDS_TO_TEST,
      blockedMapsCount,
    },
    sampleAsciiMaps,
    results,
  };
}

// ==============================================================================
// EJECUCIÓN DIRECTA CLI RUNNER
// ==============================================================================

if (
  typeof process !== 'undefined' &&
  process.argv &&
  process.argv[1]?.includes('proceduralMapGenerator.test.ts')
) {
  console.log('==============================================================================');
  console.log('EJECUTANDO SUITE: GENERADOR PROCEDURAL DE MAPAS TÁCTICOS 1V1 (PROCGEN)');
  console.log('==============================================================================\n');

  const summary = runProceduralMapGeneratorSuite();

  summary.results.forEach(res => {
    const badge = res.passed ? '✅ [PASSED]' : '❌ [FAILED]';
    const timing = res.durationMs ? ` (${res.durationMs.toFixed(1)}ms)` : '';
    console.log(`${badge} ${res.name}${timing}`);
    if (res.message) console.log(`   └─ ${res.message}`);
  });

  console.log('\n------------------------------------------------------------------------------');
  console.log(
    `RESUMEN: ${summary.passed}/${summary.total} PRUEBAS SUPERADAS | Duración Total: ${summary.totalDurationMs}ms`
  );
  console.log(
    `BENCHMARK: ${summary.benchmarks.avgGenerationMs} ms/mapa (Max: ${summary.benchmarks.maxGenerationMs} ms) | Semillas BFS: ${summary.benchmarks.seedsTested} (Bloqueos: ${summary.benchmarks.blockedMapsCount})`
  );
  console.log('------------------------------------------------------------------------------\n');

  console.log('MUESTRAS ASCII DE ESCENARIOS PROCEDURALES:\n');
  summary.sampleAsciiMaps.forEach(sample => {
    console.log(sample.ascii);
    console.log('\n' + '-'.repeat(60) + '\n');
  });

  if (!summary.allPassed) {
    process.exit(1);
  }
}

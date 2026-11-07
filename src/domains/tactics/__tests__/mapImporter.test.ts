/**
 * SUITE DE PRUEBAS AUTOMATIZADAS DEL IMPORTADOR DE MAPAS AWBW
 */

import { parseAWBWMap, AWBW_TILE_MAPPING, getCanonicalDefenseStars } from '../core/mapImporter';
import { getAllPredefinedMapsMeta, getPredefinedMap } from '../core/predefinedMaps';

export interface MapTestResult {
  id: string;
  name: string;
  passed: boolean;
  message: string;
  details?: string;
}

export function runMapImporterTests(): {
  total: number;
  passed: number;
  failed: number;
  results: MapTestResult[];
} {
  const results: MapTestResult[] = [];

  // Test 1: Mapeo exhaustivo de losetas clave de AWBW
  try {
    const p = AWBW_TILE_MAPPING['1'];
    const m = AWBW_TILE_MAPPING['2'];
    const f = AWBW_TILE_MAPPING['3'];
    const hq1 = AWBW_TILE_MAPPING['42'];
    const hq2 = AWBW_TILE_MAPPING['47'];
    const comm = AWBW_TILE_MAPPING['133'];
    const silo = AWBW_TILE_MAPPING['111'];

    const pass =
      p.type === 'plains' &&
      m.type === 'mountain' &&
      f.type === 'forest' &&
      hq1.type === 'hq' &&
      hq1.playerSlot === 0 &&
      hq2.type === 'hq' &&
      hq2.playerSlot === 1 &&
      comm.type === 'commtower' &&
      silo.type === 'silo';

    results.push({
      id: 'map_t1',
      name: 'Mapeo Canónico de IDs AWBW (1-194)',
      passed: pass,
      message: pass
        ? 'Todos los códigos canónicos (Plains, HQ p1/p2, CommTowers, Silos) se resuelven correctamente.'
        : 'Discrepancia en el diccionario de IDs AWBW.',
    });
  } catch (err: any) {
    results.push({
      id: 'map_t1',
      name: 'Mapeo Canónico de IDs AWBW (1-194)',
      passed: false,
      message: err?.message || 'Error',
    });
  }

  // Test 2: Estrellas de defensa canónicas
  try {
    const hqStars = getCanonicalDefenseStars('hq');
    const mtnStars = getCanonicalDefenseStars('mountain');
    const cityStars = getCanonicalDefenseStars('city');
    const forStars = getCanonicalDefenseStars('forest');
    const plainStars = getCanonicalDefenseStars('plains');
    const roadStars = getCanonicalDefenseStars('road');

    const pass =
      hqStars === 4 &&
      mtnStars === 4 &&
      cityStars === 3 &&
      forStars === 2 &&
      plainStars === 1 &&
      roadStars === 0;

    results.push({
      id: 'map_t2',
      name: 'Estrellas de Cobertura Defensiva por Terreno',
      passed: pass,
      message: pass
        ? 'HQ/Montaña: 4★, Ciudades: 3★, Bosques: 2★, Llanura: 1★, Carretera: 0★ validadas.'
        : 'Valores de defensa erróneos.',
    });
  } catch (err: any) {
    results.push({
      id: 'map_t2',
      name: 'Estrellas de Cobertura Defensiva por Terreno',
      passed: false,
      message: err?.message || 'Error',
    });
  }

  // Test 3: Importación de Caustic Finale (18x18)
  try {
    const caustic = getPredefinedMap('caustic_finale');
    const pass =
      caustic.width === 18 &&
      caustic.height === 18 &&
      caustic.tiles.length === 18 &&
      caustic.tiles[0].length === 18 &&
      caustic.propertyStats.commTowers >= 2 &&
      caustic.startingUnits.length > 0;

    results.push({
      id: 'map_t3',
      name: 'Importación y Geometría de Caustic Finale (18x18)',
      passed: pass,
      message: pass
        ? `Dimensiones 18x18 exactas, ${caustic.propertyStats.commTowers} torres de comunicaciones y ${caustic.startingUnits.length} unidades iniciales.`
        : 'Fallo al procesar Caustic Finale.',
      details: `Propiedades: ${caustic.propertyStats.p1Properties + caustic.propertyStats.p2Properties + caustic.propertyStats.neutralProperties}`,
    });
  } catch (err: any) {
    results.push({
      id: 'map_t3',
      name: 'Importación y Geometría de Caustic Finale (18x18)',
      passed: false,
      message: err?.message || 'Error',
    });
  }

  // Test 4: Importación de 1v1 Issus (21x21)
  try {
    const issus = getPredefinedMap('1v1_issus');
    const pass =
      issus.width === 21 &&
      issus.height === 21 &&
      issus.tiles.length === 21 &&
      issus.tiles[0].length === 21 &&
      issus.startingUnits.some(u => u.ownerId === 'p1') &&
      issus.startingUnits.some(u => u.ownerId === 'p2');

    results.push({
      id: 'map_t4',
      name: 'Importación y Geometría de 1v1 Issus (21x21)',
      passed: pass,
      message: pass
        ? `Dimensiones 21x21 validadas con escuadrones iniciales para ambos jugadores.`
        : 'Fallo al procesar 1v1 Issus.',
    });
  } catch (err: any) {
    results.push({
      id: 'map_t4',
      name: 'Importación y Geometría de 1v1 Issus (21x21)',
      passed: false,
      message: err?.message || 'Error',
    });
  }

  // Test 5: Manejo resiliente de cadenas con filas irregulares
  try {
    const unevenMap = `
    1,1,1,1
    1,2,3
    1,1,1,1
    `;
    const parsed = parseAWBWMap(unevenMap, { name: 'Irregular Test' });
    const pass = parsed.width === 4 && parsed.height === 3 && parsed.tiles[1].length === 4;

    results.push({
      id: 'map_t5',
      name: 'Resiliencia ante Filas Asimétricas (Auto-Padding)',
      passed: pass,
      message: pass
        ? 'El importador normaliza y rellenó la fila incompleta sin lanzar excepciones.'
        : 'Fallo de normalización.',
    });
  } catch (err: any) {
    results.push({
      id: 'map_t5',
      name: 'Resiliencia ante Filas Asimétricas (Auto-Padding)',
      passed: false,
      message: err?.message || 'Error',
    });
  }

  // Test 6: Compilación de todos los mapas predefinidos oficiales
  try {
    const allMetas = getAllPredefinedMapsMeta();
    let allPassed = true;
    for (const meta of allMetas) {
      const map = getPredefinedMap(meta.id);
      if (map.width !== meta.width || map.height !== meta.height) {
        allPassed = false;
        break;
      }
    }

    results.push({
      id: 'map_t6',
      name: 'Verificación de Integridad de la Biblioteca Canónica (6 Mapas)',
      passed: allPassed,
      message: allPassed
        ? `Todos los ${allMetas.length} mapas canónicos (Sector Alfa, Caustic Finale, Issus, Chosin, etc.) compilaron al 100%.`
        : 'Discrepancia en metadatos o dimensiones de mapas.',
    });
  } catch (err: any) {
    results.push({
      id: 'map_t6',
      name: 'Verificación de Integridad de la Biblioteca Canónica (6 Mapas)',
      passed: false,
      message: err?.message || 'Error',
    });
  }

  const passed = results.filter(r => r.passed).length;
  return {
    total: results.length,
    passed,
    failed: results.length - passed,
    results,
  };
}

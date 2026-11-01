/**
 * SUITE DE PRUEBAS AUTOMATIZADAS DE NIEBLA DE GUERRA (FOG OF WAR) & EMBOSCADAS
 */

import { TacticalUnit, TerrainTile } from '../types';
import { FogOfWarEngine, CANONICAL_UNIT_BASE_VISION } from './fogOfWar';

export interface FoWTestResult {
  id: string;
  name: string;
  passed: boolean;
  message: string;
}

export function runFogOfWarTests(): {
  total: number;
  passed: number;
  failed: number;
  results: FoWTestResult[];
} {
  const results: FoWTestResult[] = [];

  const createDummyUnit = (
    id: string,
    code: string,
    owner: string,
    x: number,
    y: number
  ): TacticalUnit => ({
    id,
    unitCode: code,
    displayName: code,
    ownerId: owner,
    x,
    y,
    hp: 10,
    maxHp: 10,
    ammo: 9,
    fuel: 99,
    movementPoints: 4,
    movementType: 'foot',
    minRange: 1,
    maxRange: 1,
    visionRange: CANONICAL_UNIT_BASE_VISION[code] || 2,
    baseAttack: 55,
    productionCost: 1000,
    hasMoved: false,
    hasActed: false,
    skinId: 'default',
  });

  const createBlankMap = (w: number, h: number): TerrainTile[][] => {
    const tiles: TerrainTile[][] = [];
    for (let y = 0; y < h; y++) {
      const row: TerrainTile[] = [];
      for (let x = 0; x < w; x++) {
        row.push({ x, y, type: 'plains', defenseStars: 1, ownerId: null });
      }
      tiles.push(row);
    }
    return tiles;
  };

  // Test 1: Radios de visión base canónicos
  try {
    const reconVision = FogOfWarEngine.calculateUnitVisionRange(
      createDummyUnit('u1', 'recon', 'p1', 0, 0),
      null,
      'clear'
    );
    const tankVision = FogOfWarEngine.calculateUnitVisionRange(
      createDummyUnit('u2', 'tank_light', 'p1', 0, 0),
      null,
      'clear'
    );
    const infVision = FogOfWarEngine.calculateUnitVisionRange(
      createDummyUnit('u3', 'infantry', 'p1', 0, 0),
      null,
      'clear'
    );
    const artVision = FogOfWarEngine.calculateUnitVisionRange(
      createDummyUnit('u4', 'artillery', 'p1', 0, 0),
      null,
      'clear'
    );

    const pass = reconVision === 5 && tankVision === 3 && infVision === 2 && artVision === 1;
    results.push({
      id: 'fow_t1',
      name: 'Test 1: Radios de Visión Base Canónicos (Recon: 5, Tanque: 3, Infantería: 2, Artillería: 1)',
      passed: pass,
      message: pass
        ? 'Valores base de visibilidad Advance Wars conformes.'
        : `Discrepancia en radios: Recon=${reconVision}, Tanque=${tankVision}, Inf=${infVision}, Art=${artVision}`,
    });
  } catch (err: any) {
    results.push({ id: 'fow_t1', name: 'Test 1: Radios de Visión Base', passed: false, message: err?.message });
  }

  // Test 2: Bonificación de elevación en Montaña (+3 Visión para soldados a pie)
  try {
    const mtnTile: TerrainTile = { x: 2, y: 2, type: 'mountain', defenseStars: 4, ownerId: null };
    const infOnMtn = createDummyUnit('u1', 'infantry', 'p1', 2, 2);
    const tankOnMtn = createDummyUnit('u2', 'tank_light', 'p1', 2, 2);

    const infVision = FogOfWarEngine.calculateUnitVisionRange(infOnMtn, mtnTile, 'clear');
    const tankVision = FogOfWarEngine.calculateUnitVisionRange(tankOnMtn, mtnTile, 'clear');

    const pass = infVision === 5 && tankVision === 3; // Infantería pasa de 2 a 5 (+3). Tanque no recibe bono de montaña
    results.push({
      id: 'fow_t2',
      name: 'Test 2: Elevación en Montaña (+3 Visión para Infantería/Mech)',
      passed: pass,
      message: pass
        ? 'Infantería en cumbre alcanza 5 casillas de visión; vehículos no se bonifican.'
        : `Error: Infantería=${infVision}, Tanque=${tankVision}`,
    });
  } catch (err: any) {
    results.push({ id: 'fow_t2', name: 'Test 2: Elevación en Montaña', passed: false, message: err?.message });
  }

  // Test 3: Ocultación en Bosques y Arrecifes (Solo revelables si una unidad aliada es adyacente)
  try {
    const tiles = createBlankMap(10, 10);
    tiles[4][4] = { x: 4, y: 4, type: 'forest', defenseStars: 2, ownerId: null };

    const allyRecon = createDummyUnit('a1', 'recon', 'p1', 4, 1); // A 3 casillas de distancia
    const enemyInForest = createDummyUnit('e1', 'tank_light', 'p2', 4, 4);

    // Con el Recon a 3 de distancia, la casilla [4,4] no se ilumina porque es bosque profundo (>1 distancia)
    const visionDistant = FogOfWarEngine.computeVision('p1', [allyRecon, enemyInForest], tiles);
    const hiddenFromAfar = !visionDistant.revealedEnemyUnitIds.has('e1');

    // Ahora movemos el aliado a [4,3] (adyacente, distancia 1)
    const allyAdjacent = createDummyUnit('a1', 'recon', 'p1', 4, 3);
    const visionAdjacent = FogOfWarEngine.computeVision('p1', [allyAdjacent, enemyInForest], tiles);
    const revealedWhenAdjacent = visionAdjacent.revealedEnemyUnitIds.has('e1');

    const pass = hiddenFromAfar && revealedWhenAdjacent;
    results.push({
      id: 'fow_t3',
      name: 'Test 3: Ocultación en Bosque (Invisible a distancia, revelado al estar adyacente)',
      passed: pass,
      message: pass
        ? 'El tanque enemigo en bosque permanece oculto hasta que un aliado se posiciona adyacente.'
        : `Fallo: hiddenFromAfar=${hiddenFromAfar}, revealedAdjacent=${revealedWhenAdjacent}`,
    });
  } catch (err: any) {
    results.push({ id: 'fow_t3', name: 'Test 3: Ocultación en Bosque', passed: false, message: err?.message });
  }

  // Test 4: Visión otorgada por propiedades aliadas (Radio 1)
  try {
    const tiles = createBlankMap(6, 6);
    tiles[2][2] = { x: 2, y: 2, type: 'hq', defenseStars: 4, ownerId: 'p1' };

    const vision = FogOfWarEngine.computeVision('p1', [], tiles);
    const hqSeen = vision.visibleTileKeys.has('2,2');
    const northSeen = vision.visibleTileKeys.has('2,1');
    const eastSeen = vision.visibleTileKeys.has('3,2');
    const distantUnseen = !vision.visibleTileKeys.has('2,4');

    const pass = hqSeen && northSeen && eastSeen && distantUnseen;
    results.push({
      id: 'fow_t4',
      name: 'Test 4: Visión Perimétrica de Propiedades Aliadas (Radio 1)',
      passed: pass,
      message: pass
        ? 'El cuartel general y sus 4 casillas ortogonales se encuentran iluminadas sin requerir unidades.'
        : 'Fallo en visión de propiedades.',
    });
  } catch (err: any) {
    results.push({ id: 'fow_t4', name: 'Test 4: Visión de Propiedades', passed: false, message: err?.message });
  }

  // Test 5: Penalización meteorológica por Lluvia (-1 casilla)
  try {
    const recon = createDummyUnit('u1', 'recon', 'p1', 0, 0);
    const clearVision = FogOfWarEngine.calculateUnitVisionRange(recon, null, 'clear');
    const rainVision = FogOfWarEngine.calculateUnitVisionRange(recon, null, 'rain');

    const pass = clearVision === 5 && rainVision === 4;
    results.push({
      id: 'fow_t5',
      name: 'Test 5: Penalización Meteorológica (Lluvia reduce -1 casilla de visión)',
      passed: pass,
      message: pass
        ? 'El alcance del Recon disminuyó de 5 a 4 casillas bajo lluvia torrencial.'
        : `Fallo: Despejado=${clearVision}, Lluvia=${rainVision}`,
    });
  } catch (err: any) {
    results.push({ id: 'fow_t5', name: 'Test 5: Penalización por Lluvia', passed: false, message: err?.message });
  }

  // Test 6: Emboscada (TRAP) al colisionar con unidad oculta en trayectoria
  try {
    const tiles = createBlankMap(8, 8);
    tiles[0][2] = { x: 2, y: 0, type: 'forest', defenseStars: 2, ownerId: null };

    const movingTank = createDummyUnit('a1', 'tank_light', 'p1', 0, 0);
    const hiddenEnemy = createDummyUnit('e1', 'tank_light', 'p2', 2, 0); // En el bosque

    // Trayectoria planificada: (0,0) -> (1,0) -> (2,0) -> (3,0)
    const plannedPath = [
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 2, y: 0 },
      { x: 3, y: 0 },
    ];

    const trapResult = FogOfWarEngine.checkTrapOnPath(
      movingTank,
      plannedPath,
      [movingTank, hiddenEnemy],
      'p1',
      tiles
    );

    const pass =
      trapResult.isTrapped === true &&
      trapResult.interruptedAt.x === 1 &&
      trapResult.interruptedAt.y === 0 &&
      trapResult.trappingUnit?.id === 'e1' &&
      trapResult.finalPath.length === 2; // (0,0) y (1,0)

    results.push({
      id: 'fow_t6',
      name: 'Test 6: Emboscada / TRAP (Interrupción de desplazamiento antes de la casilla oculta)',
      passed: pass,
      message: pass
        ? 'El tanque aliado fue interceptado en (1,0) inmediatamente antes del bosque emboscado en (2,0).'
        : `Fallo en interrupción: trapped=${trapResult.isTrapped}, at=(${trapResult.interruptedAt.x},${trapResult.interruptedAt.y})`,
    });
  } catch (err: any) {
    results.push({ id: 'fow_t6', name: 'Test 6: Emboscada / TRAP', passed: false, message: err?.message });
  }

  // Test 7: Visión penetrante de poder CO (Sonja)
  try {
    const tiles = createBlankMap(10, 10);
    tiles[4][4] = { x: 4, y: 4, type: 'forest', defenseStars: 2, ownerId: null };

    const allyRecon = createDummyUnit('a1', 'recon', 'p1', 4, 1); // A 3 de distancia
    const enemyInForest = createDummyUnit('e1', 'tank_light', 'p2', 4, 4);

    const sonjaVision = FogOfWarEngine.computeVision('p1', [allyRecon, enemyInForest], tiles, 'clear', true);
    const revealedBySonja = sonjaVision.revealedEnemyUnitIds.has('e1');

    results.push({
      id: 'fow_t7',
      name: 'Test 7: Visión Penetrante (Poder CO revela bosques sin requerir adyacencia)',
      passed: revealedBySonja,
      message: revealedBySonja
        ? 'El sensor avanzado penetra la espesura forestal a distancia.'
        : 'Fallo al penetrar cobertura con poder CO.',
    });
  } catch (err: any) {
    results.push({ id: 'fow_t7', name: 'Test 7: Visión Penetrante', passed: false, message: err?.message });
  }

  const passed = results.filter(r => r.passed).length;
  return {
    total: results.length,
    passed,
    failed: results.length - passed,
    results,
  };
}

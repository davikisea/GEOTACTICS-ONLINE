/**
 * ==============================================================================
 * PROCEDURAL MAP GENERATOR (TACTICAL COMMAND / ADVANCE WARS CANONICAL ENGINE)
 * ==============================================================================
 * Motor determinista de generación procedural de escenarios tácticos 1v1 simétricos
 * (180° rotacional) para Tactical Command.
 *
 * Características principales:
 * - Determinismo estricto mediante PRNG Mulberry32 con soporte de semilla (`seed`).
 * - Simetría rotacional 180° exacta en relieve, defensas, bases y propiedades.
 * - Simulación biológica por Autómata Celular (Smoothing Moore 2-pass) para parches
 *   orgánicos de bosques, montañas y cuencas fluviales.
 * - Carving vial inteligente (A* / Manhattan) con puentes automáticos sobre ríos.
 * - Validación exhaustiva de transitabilidad terrestre y vehicular (BFS).
 * - Balance económico estricto (P1 properties === P2 properties).
 */

import { TerrainTile, TerrainType, TacticalUnit, GridPosition } from '../types';
import { AWBWMapData, getCanonicalDefenseStars } from './mapImporter';
import { CANONICAL_TERRAIN_PROPERTIES } from './canonicalMovement';

// ==============================================================================
// PRNG DETERMINISTA (MULBERRY32)
// ==============================================================================

export class Mulberry32 {
  private state: number;

  constructor(seed: number) {
    this.state = seed >>> 0;
  }

  /**
   * Genera un float pseudo-aleatorio en [0, 1)
   */
  next(): number {
    let t = (this.state += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /**
   * Entero inclusivo en [min, max]
   */
  nextInt(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }

  /**
   * Float en [min, max)
   */
  nextFloat(min: number, max: number): number {
    return this.next() * (max - min) + min;
  }

  /**
   * Booleano con probabilidad p de ser true
   */
  chance(probability: number): boolean {
    return this.next() < probability;
  }
}

// ==============================================================================
// CONFIGURACIÓN Y TIPOS
// ==============================================================================

export interface TerrainDensityConfig {
  forestWeight?: number;       // Peso de bosques (~0.18)
  mountainWeight?: number;     // Peso de montañas (~0.12)
  waterWeight?: number;        // Peso de ríos/agua (~0.08)
  neutralCitiesCount?: number; // Cantidad aproximada de ciudades neutrales (4 - 8)
  neutralCommsCount?: number;  // Cantidad de torres de comunicaciones neutrales (0 - 2)
  neutralFactoriesCount?: number; // Fábricas neutrales disputadas (0 - 2)
}

export interface ProceduralMapConfig {
  id?: string;
  name?: string;
  author?: string;
  width: number;
  height: number;
  seed?: number;
  density?: TerrainDensityConfig;
  startingFactoriesPerPlayer?: number; // 1 o 2 (por defecto 1)
  generateUnits?: boolean;            // Desplegar escuadrón inicial balanceado
  combatZone?: { width: number; height: number };         // Sub-zona táctica activa (ej. 8x8, 16x16)
  continentalSector?: { width: number; height: number };  // Territorio continental continuo (ej. 24x24, 32x32)
}

interface InternalCell {
  type: TerrainType;
  ownerId: 'p1' | 'p2' | null;
  fixed: boolean; // Si es true, el autómata celular no sobreescribe la celda
}

// ==============================================================================
// GENERADOR PRINCIPAL
// ==============================================================================

export function generateProceduralMap(config: ProceduralMapConfig): AWBWMapData {
  const width = Math.max(8, config.continentalSector?.width ?? config.width);
  const height = Math.max(8, config.continentalSector?.height ?? config.height);
  const baseSeed = config.seed !== undefined ? config.seed : Math.floor(Math.random() * 2147483647);

  const maxAttempts = 10;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const currentSeed = (baseSeed + attempt * 7919) >>> 0;
    const prng = new Mulberry32(currentSeed);

    const generated = tryGenerateMap(width, height, prng, config, currentSeed);
    if (generated) {
      return generated;
    }
  }

  // Fallback de emergencia garantizado: generar con carving forzado directo
  const fallbackPrng = new Mulberry32(baseSeed);
  const fallback = tryGenerateMap(width, height, fallbackPrng, config, baseSeed, true);
  if (fallback) {
    return fallback;
  }

  throw new Error(`[ProceduralMapGenerator] Error fatal: No se pudo generar un mapa transitable tras ${maxAttempts} intentos.`);
}

function tryGenerateMap(
  width: number,
  height: number,
  prng: Mulberry32,
  config: ProceduralMapConfig,
  usedSeed: number,
  forceDirectPath = false
): AWBWMapData | null {
  // 1. Inicializar grilla con llanuras
  const grid: InternalCell[][] = Array.from({ length: height }, () =>
    Array.from({ length: width }, () => ({
      type: 'plains',
      ownerId: null,
      fixed: false,
    }))
  );

  // Parámetros de Zona de Combate y Territorio Continental
  const combatW = Math.min(width, config.combatZone?.width ?? config.width);
  const combatH = Math.min(height, config.combatZone?.height ?? config.height);
  const offsetX = Math.floor((width - combatW) / 2);
  const offsetY = Math.floor((height - combatH) / 2);

  // 2. Colocar Cuarteles Generales (HQs) y Fábricas con simetría 180°
  const hqOffset = Math.max(1, Math.min(2, Math.floor(Math.min(combatW, combatH) / 4)));
  const p1HqX = offsetX + hqOffset;
  const p1HqY = offsetY + hqOffset;
  const p2HqX = width - 1 - p1HqX;
  const p2HqY = height - 1 - p1HqY;

  setSymmetricCell(grid, width, height, p1HqX, p1HqY, 'hq', 'p1', true);

  // Fábricas iniciales
  const p1Factories: GridPosition[] = [];
  const p2Factories: GridPosition[] = [];
  const factoryCandidates: GridPosition[] = [
    { x: p1HqX + 1, y: p1HqY },
    { x: p1HqX, y: p1HqY + 1 },
    { x: p1HqX + 1, y: p1HqY + 1 },
  ].filter(p => p.x < width / 2 && p.y < height / 2);

  const numFactories = Math.min(config.startingFactoriesPerPlayer ?? 1, factoryCandidates.length);
  for (let i = 0; i < numFactories; i++) {
    const pos = factoryCandidates[i];
    setSymmetricCell(grid, width, height, pos.x, pos.y, 'factory', 'p1', true);
    p1Factories.push({ x: pos.x, y: pos.y });
    p2Factories.push({ x: width - 1 - pos.x, y: height - 1 - pos.y });
  }

  // 3. Simiente de Terreno Natural para el autómata celular
  const density = config.density || {};
  const forestWeight = density.forestWeight ?? 0.18;
  const mountainWeight = density.mountainWeight ?? 0.12;
  const waterWeight = density.waterWeight ?? 0.08;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (grid[y][x].fixed) continue;
      if (!isPrimaryHalf(x, y, width, height)) continue;

      const isInsideCombatZone =
        x >= offsetX && x < offsetX + combatW &&
        y >= offsetY && y < offsetY + combatH;

      if (!isInsideCombatZone) {
        // Territorio Continental Perimetral: Océanos en los bordes y cadenas montañosas/bosques
        const isBorderCoast = x <= 1 || y <= 1 || (width - 1 - x) <= 1 || (height - 1 - y) <= 1;
        const isNearCoast = x <= 2 || y <= 2 || (width - 1 - x) <= 2 || (height - 1 - y) <= 2;
        let chosenType: TerrainType = 'plains';

        if (isBorderCoast) {
          chosenType = prng.chance(0.85) ? 'sea' : 'reef';
        } else if (isNearCoast) {
          chosenType = prng.chance(0.50) ? 'sea' : prng.chance(0.35) ? 'shoal' : 'mountain';
        } else {
          // Zona intermedia continental: cordilleras fronterizas y bosques densos
          const roll = prng.next();
          if (roll < 0.35) chosenType = 'mountain';
          else if (roll < 0.65) chosenType = 'forest';
          else if (roll < 0.75) chosenType = 'river';
          else chosenType = 'plains';
        }
        setSymmetricCell(grid, width, height, x, y, chosenType, null, false);
      } else {
        // Zona de Combate Activa: balance táctico estándar
        const roll = prng.next();
        let chosenType: TerrainType = 'plains';
        if (roll < forestWeight) {
          chosenType = 'forest';
        } else if (roll < forestWeight + mountainWeight) {
          chosenType = 'mountain';
        } else if (roll < forestWeight + mountainWeight + waterWeight) {
          chosenType = 'river';
        }
        setSymmetricCell(grid, width, height, x, y, chosenType, null, false);
      }
    }
  }

  // 4. Autómata Celular: Moore Smoothing (2 pasadas)
  runCellularSmoothing(grid, width, height);

  // 5. Ubicación Estratégica de Propiedades Neutrales
  placeNeutralProperties(grid, width, height, prng, density, { x: offsetX, y: offsetY, w: combatW, h: combatH });

  // 6. Carving de Carreteras y Puentes (Conectar bases al eje central)
  carveRoadNetwork(grid, width, height, p1HqX, p1HqY, p2HqX, p2HqY, p1Factories, p2Factories, forceDirectPath);

  // 7. Sincronización y Validación Rotacional Estricta
  enforceStrictSymmetry(grid, width, height);

  // 8. Verificación de Transitabilidad BFS (Foot & Treads)
  const canFootTraverse = checkBFSReachability(grid, width, height, { x: p1HqX, y: p1HqY }, { x: p2HqX, y: p2HqY }, 'foot');
  const canTreadsTraverse = checkBFSReachability(grid, width, height, { x: p1HqX, y: p1HqY }, { x: p2HqX, y: p2HqY }, 'treads');

  if (!canFootTraverse || !canTreadsTraverse) {
    return null; // Rechazar y reintentar con otra semilla
  }

  // 9. Construir AWBWMapData final
  return buildAWBWMapData(grid, width, height, config, usedSeed, { x: p1HqX, y: p1HqY }, { x: p2HqX, y: p2HqY }, p1Factories, p2Factories);
}

// ==============================================================================
// HELPERS DE SIMETRÍA Y MATRIZ
// ==============================================================================

function isPrimaryHalf(x: number, y: number, width: number, height: number): boolean {
  const symX = width - 1 - x;
  const symY = height - 1 - y;
  if (y < symY) return true;
  if (y === symY && x <= symX) return true;
  return false;
}

function setSymmetricCell(
  grid: InternalCell[][],
  width: number,
  height: number,
  x: number,
  y: number,
  type: TerrainType,
  ownerId: 'p1' | 'p2' | null,
  fixed: boolean
): void {
  const symX = width - 1 - x;
  const symY = height - 1 - y;

  let mirrorOwner: 'p1' | 'p2' | null = null;
  if (ownerId === 'p1') mirrorOwner = 'p2';
  else if (ownerId === 'p2') mirrorOwner = 'p1';

  grid[y][x] = { type, ownerId, fixed };
  grid[symY][symX] = { type, ownerId: mirrorOwner, fixed };
}

function enforceStrictSymmetry(grid: InternalCell[][], width: number, height: number): void {
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (isPrimaryHalf(x, y, width, height)) {
        const symX = width - 1 - x;
        const symY = height - 1 - y;

        if (x === symX && y === symY) {
          // Celda central exacta (en mapas impares): debe ser neutral
          if (grid[y][x].ownerId !== null) {
            grid[y][x].ownerId = null;
          }
          continue;
        }

        const primary = grid[y][x];
        let mirrorOwner: 'p1' | 'p2' | null = null;
        if (primary.ownerId === 'p1') mirrorOwner = 'p2';
        else if (primary.ownerId === 'p2') mirrorOwner = 'p1';

        grid[symY][symX] = {
          type: primary.type,
          ownerId: mirrorOwner,
          fixed: primary.fixed,
        };
      }
    }
  }
}

// ==============================================================================
// AUTÓMATA CELULAR (SMOOTHING)
// ==============================================================================

function runCellularSmoothing(grid: InternalCell[][], width: number, height: number): void {
  const passes = 2;
  for (let p = 0; p < passes; p++) {
    const nextTypes: (TerrainType | null)[][] = Array.from({ length: height }, () =>
      Array.from({ length: width }, () => null)
    );

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        if (!isPrimaryHalf(x, y, width, height)) continue;
        if (grid[y][x].fixed) {
          nextTypes[y][x] = grid[y][x].type;
          continue;
        }

        // Conteo de vecinos Moore (rango 1)
        const counts: Record<string, number> = { plains: 0, forest: 0, mountain: 0, river: 0 };
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            if (dx === 0 && dy === 0) continue;
            const nx = x + dx;
            const ny = y + dy;
            if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
              const t = grid[ny][nx].type;
              if (counts[t] !== undefined) counts[t]++;
            }
          }
        }

        const currentType = grid[y][x].type;
        // Si una celda de bosque o montaña está aislada (<= 1 vecino similar), se vuelve llanura
        if (currentType === 'mountain' && counts.mountain <= 1) {
          nextTypes[y][x] = 'plains';
        } else if (currentType === 'forest' && counts.forest <= 1) {
          nextTypes[y][x] = 'plains';
        } else if (counts.mountain >= 4) {
          nextTypes[y][x] = 'mountain';
        } else if (counts.forest >= 4) {
          nextTypes[y][x] = 'forest';
        } else {
          nextTypes[y][x] = currentType;
        }
      }
    }

    // Aplicar con simetría
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        if (isPrimaryHalf(x, y, width, height) && nextTypes[y][x] !== null) {
          setSymmetricCell(grid, width, height, x, y, nextTypes[y][x]!, grid[y][x].ownerId, grid[y][x].fixed);
        }
      }
    }
  }
}

// ==============================================================================
// DISTRIBUCIÓN DE PROPIEDADES NEUTRALES
// ==============================================================================

function placeNeutralProperties(
  grid: InternalCell[][],
  width: number,
  height: number,
  prng: Mulberry32,
  density: TerrainDensityConfig,
  combatBounds?: { x: number; y: number; w: number; h: number }
): void {
  const targetCities = density.neutralCitiesCount ?? Math.max(4, Math.floor((width * height) / 25));
  const targetComms = density.neutralCommsCount ?? (width >= 14 ? 2 : 0);
  const targetFactories = density.neutralFactoriesCount ?? (width >= 16 ? 2 : 0);

  // Lista de celdas candidatas en la mitad primaria
  const candidates: GridPosition[] = [];
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      if (!isPrimaryHalf(x, y, width, height)) continue;
      if (grid[y][x].fixed) continue;
      if (
        grid[y][x].type === 'mountain' ||
        grid[y][x].type === 'river' ||
        grid[y][x].type === 'sea' ||
        grid[y][x].type === 'reef'
      )
        continue;

      // Si se definió zona de combate, priorizar celdas dentro de ella
      if (combatBounds) {
        const inZone =
          x >= combatBounds.x &&
          x < combatBounds.x + combatBounds.w &&
          y >= combatBounds.y &&
          y < combatBounds.y + combatBounds.h;
        if (!inZone && prng.chance(0.85)) continue;
      }

      candidates.push({ x, y });
    }
  }

  // Barajar candidatos con PRNG determinista (Fisher-Yates)
  for (let i = candidates.length - 1; i > 0; i--) {
    const j = prng.nextInt(0, i);
    const temp = candidates[i];
    candidates[i] = candidates[j];
    candidates[j] = temp;
  }

  let placedCities = 0;
  let placedComms = 0;
  let placedFactories = 0;

  for (const pos of candidates) {
    const symX = width - 1 - pos.x;
    const symY = height - 1 - pos.y;
    const isCenter = pos.x === symX && pos.y === symY;

    if (placedComms < targetComms) {
      setSymmetricCell(grid, width, height, pos.x, pos.y, 'commtower', null, true);
      placedComms += isCenter ? 1 : 2;
    } else if (placedFactories < targetFactories && !isCenter) {
      setSymmetricCell(grid, width, height, pos.x, pos.y, 'factory', null, true);
      placedFactories += 2;
    } else if (placedCities < targetCities) {
      setSymmetricCell(grid, width, height, pos.x, pos.y, 'city', null, true);
      placedCities += isCenter ? 1 : 2;
    }
  }
}

// ==============================================================================
// CARVING DE RED VIAL (ROADS & BRIDGES)
// ==============================================================================

function carveRoadNetwork(
  grid: InternalCell[][],
  width: number,
  height: number,
  p1HqX: number,
  p1HqY: number,
  p2HqX: number,
  p2HqY: number,
  p1Factories: GridPosition[],
  p2Factories: GridPosition[],
  forceDirectPath: boolean
): void {
  // Punto central focal del mapa
  const centerX = Math.floor((width - 1) / 2);
  const centerY = Math.floor((height - 1) / 2);

  // Orígenes a conectar: P1 HQ y sus fábricas
  const origins = [{ x: p1HqX, y: p1HqY }, ...p1Factories];

  for (const start of origins) {
    // Carve hacia el centro y hacia su punto simétrico
    const path = findCarvingPath(grid, width, height, start, { x: centerX, y: centerY }, forceDirectPath);
    for (const pt of path) {
      applyRoadOrBridge(grid, width, height, pt.x, pt.y);
    }
  }

  // Conectar el centro hacia su espejo central si es par
  const mirrorCenterX = width - 1 - centerX;
  const mirrorCenterY = height - 1 - centerY;
  if (centerX !== mirrorCenterX || centerY !== mirrorCenterY) {
    const midStep = { x: mirrorCenterX, y: centerY };
    applyRoadOrBridge(grid, width, height, centerX, centerY);
    applyRoadOrBridge(grid, width, height, midStep.x, midStep.y);
    applyRoadOrBridge(grid, width, height, mirrorCenterX, mirrorCenterY);
  }
}

function findCarvingPath(
  grid: InternalCell[][],
  width: number,
  height: number,
  start: GridPosition,
  goal: GridPosition,
  forceDirect: boolean
): GridPosition[] {
  // Búsqueda simple basada en A* para priorizar llanuras y evitar atravesar demasiadas montañas
  const path: GridPosition[] = [];
  let curr = { ...start };

  const maxSteps = width + height + 10;
  let steps = 0;

  while ((curr.x !== goal.x || curr.y !== goal.y) && steps < maxSteps) {
    steps++;
    const neighbors: GridPosition[] = [
      { x: curr.x + 1, y: curr.y },
      { x: curr.x - 1, y: curr.y },
      { x: curr.x, y: curr.y + 1 },
      { x: curr.x, y: curr.y - 1 },
    ].filter(p => p.x >= 0 && p.x < width && p.y >= 0 && p.y < height);

    let bestScore = Infinity;
    let bestNext = curr;

    for (const n of neighbors) {
      const dist = Math.abs(n.x - goal.x) + Math.abs(n.y - goal.y);
      let cost = 1;
      const t = grid[n.y][n.x].type;

      if (!forceDirect) {
        if (t === 'mountain') cost = 6;
        else if (t === 'river') cost = 3;
        else if (t === 'forest') cost = 2;
        else if (t === 'road' || t === 'bridge') cost = 0.5;
      }

      const score = dist * 2 + cost;
      if (score < bestScore) {
        bestScore = score;
        bestNext = n;
      }
    }

    if (bestNext.x === curr.x && bestNext.y === curr.y) break;
    curr = bestNext;
    path.push(curr);
  }

  return path;
}

function applyRoadOrBridge(grid: InternalCell[][], width: number, height: number, x: number, y: number): void {
  const current = grid[y][x];
  // No sobreescribir HQs ni Fábricas
  if (current.type === 'hq' || current.type === 'factory') return;

  const newType: TerrainType = current.type === 'river' ? 'bridge' : 'road';
  setSymmetricCell(grid, width, height, x, y, newType, current.ownerId, true);
}

// ==============================================================================
// VERIFICACIÓN BFS DE TRANSITABILIDAD
// ==============================================================================

export function checkBFSReachability(
  grid: InternalCell[][],
  width: number,
  height: number,
  start: GridPosition,
  goal: GridPosition,
  movementType: 'foot' | 'treads'
): boolean {
  if (start.x === goal.x && start.y === goal.y) return true;

  const visited = Array.from({ length: height }, () => new Uint8Array(width));
  const queue: GridPosition[] = [start];
  visited[start.y][start.x] = 1;

  while (queue.length > 0) {
    const { x, y } = queue.shift()!;

    if (x === goal.x && y === goal.y) {
      return true;
    }

    const neighbors: GridPosition[] = [
      { x: x + 1, y },
      { x: x - 1, y },
      { x, y: y + 1 },
      { x, y: y - 1 },
    ];

    for (const n of neighbors) {
      if (n.x >= 0 && n.x < width && n.y >= 0 && n.y < height && !visited[n.y][n.x]) {
        const tileType = grid[n.y][n.x].type;
        const terrainProps = CANONICAL_TERRAIN_PROPERTIES[tileType];
        const moveCost = terrainProps ? terrainProps.movementCosts[movementType] : Infinity;

        if (Number.isFinite(moveCost)) {
          visited[n.y][n.x] = 1;
          queue.push(n);
        }
      }
    }
  }

  return false;
}

// ==============================================================================
// CONSTRUCCIÓN DEL OBJETO FINAL AWBWMapData
// ==============================================================================

function buildAWBWMapData(
  grid: InternalCell[][],
  width: number,
  height: number,
  config: ProceduralMapConfig,
  seed: number,
  p1Hq: GridPosition,
  p2Hq: GridPosition,
  p1Factories: GridPosition[],
  p2Factories: GridPosition[]
): AWBWMapData {
  let p1Properties = 0;
  let p2Properties = 0;
  let neutralProperties = 0;
  let commTowers = 0;
  let totalFactories = 0;

  const tiles: TerrainTile[][] = [];

  for (let y = 0; y < height; y++) {
    const row: TerrainTile[] = [];
    for (let x = 0; x < width; x++) {
      const cell = grid[y][x];
      const defenseStars = getCanonicalDefenseStars(cell.type);

      if (cell.ownerId === 'p1') {
        p1Properties++;
      } else if (cell.ownerId === 'p2') {
        p2Properties++;
      } else if (['city', 'factory', 'airport', 'port', 'commtower', 'lab'].includes(cell.type)) {
        neutralProperties++;
      }

      if (cell.type === 'commtower') commTowers++;
      if (cell.type === 'factory') totalFactories++;

      row.push({
        x,
        y,
        type: cell.type,
        defenseStars,
        ownerId: cell.ownerId,
        captureHp: 20,
      });
    }
    tiles.push(row);
  }

  // Generar unidades iniciales tácticas si se solicita (por defecto true)
  const shouldGenUnits = config.generateUnits !== false;
  const startingUnits = shouldGenUnits
    ? generateBalancedStartingUnits(tiles, p1Hq, p2Hq, p1Factories, p2Factories)
    : [];

  const mapName = config.name || `Procedural Sector ${width}x${height} (#${seed % 10000})`;
  const mapId = config.id || `proc_map_${seed}_${width}x${height}`;

  return {
    id: mapId,
    name: mapName,
    width,
    height,
    numberOfPlayers: 2,
    tiles,
    startingUnits,
    description:
      config.author
        ? `Mapa generado proceduralmente por ${config.author} (Semilla: ${seed}).`
        : `Arena táctica simétrica 1v1 generada proceduralmente (Semilla: ${seed}).`,
    author: config.author || 'Tactical Command ProcGen Engine',
    propertyStats: {
      p1Properties,
      p2Properties,
      neutralProperties,
      commTowers,
      factories: totalFactories,
    },
  };
}

/**
 * Despliega un escuadrón inicial idéntico y simétrico para cada bando.
 */
function generateBalancedStartingUnits(
  tiles: TerrainTile[][],
  p1Hq: GridPosition,
  p2Hq: GridPosition,
  p1Factories: GridPosition[],
  p2Factories: GridPosition[]
): TacticalUnit[] {
  const units: TacticalUnit[] = [];

  const createUnit = (
    id: string,
    owner: 'p1' | 'p2',
    code: string,
    displayName: string,
    pos: GridPosition,
    movePts: number,
    moveType: 'foot' | 'mech' | 'wheels' | 'treads',
    maxHp: number,
    attack: number,
    cost: number
  ): TacticalUnit => ({
    id,
    unitCode: code,
    displayName,
    ownerId: owner,
    x: pos.x,
    y: pos.y,
    hp: maxHp,
    maxHp,
    ammo: 10,
    fuel: 99,
    movementPoints: movePts,
    movementType: moveType,
    minRange: 1,
    maxRange: 1,
    visionRange: 2,
    baseAttack: attack,
    productionCost: cost,
    hasMoved: false,
    hasActed: false,
    skinId: owner === 'p1' ? 'red_star_standard' : 'blue_moon_standard',
  });

  // 1. Infantería sobre cada HQ
  units.push(
    createUnit('unit_p1_inf_hq', 'p1', 'INF', 'Infantería Ligera P1', p1Hq, 3, 'foot', 100, 55, 1000),
    createUnit('unit_p2_inf_hq', 'p2', 'INF', 'Infantería Ligera P2', p2Hq, 3, 'foot', 100, 55, 1000)
  );

  // 2. Blindado de reconocimiento o tanque ligero sobre fábricas iniciales
  p1Factories.forEach((fPos, idx) => {
    units.push(
      createUnit(`unit_p1_veh_${idx}`, 'p1', 'RECON', 'Vehículo Reconocimiento P1', fPos, 8, 'wheels', 100, 70, 4000)
    );
  });
  p2Factories.forEach((fPos, idx) => {
    units.push(
      createUnit(`unit_p2_veh_${idx}`, 'p2', 'RECON', 'Vehículo Reconocimiento P2', fPos, 8, 'wheels', 100, 70, 4000)
    );
  });

  return units;
}

// ==============================================================================
// RENDERIZADOR ASCII (UTILIDAD DE VISUALIZACIÓN Y DEBUG)
// ==============================================================================

export function renderMapAscii(map: AWBWMapData): string {
  const symbolMap: Record<TerrainType, string> = {
    plains: '.',
    forest: 'T',
    mountain: '^',
    road: '=',
    river: '~',
    bridge: '#',
    city: 'c',
    factory: 'f',
    airport: 'a',
    port: 'p',
    hq: 'H',
    sea: 'S',
    reef: 'r',
    shoal: 's',
    commtower: '!',
    silo: 'o',
    lab: 'L',
    pipe: '|',
  };

  const lines: string[] = [];
  lines.push(`=== MAPA: ${map.name} (${map.width}x${map.height}) ===`);
  lines.push(`P1 Props: ${map.propertyStats.p1Properties} | P2 Props: ${map.propertyStats.p2Properties} | Neutral: ${map.propertyStats.neutralProperties}`);

  for (let y = 0; y < map.height; y++) {
    let rowStr = '';
    for (let x = 0; x < map.width; x++) {
      const tile = map.tiles[y][x];
      let sym = symbolMap[tile.type] || '?';
      if (tile.type === 'hq') {
        sym = tile.ownerId === 'p1' ? '1' : '2';
      } else if (tile.type === 'factory') {
        sym = tile.ownerId === 'p1' ? 'F' : tile.ownerId === 'p2' ? 'B' : 'f';
      } else if (tile.type === 'city' && tile.ownerId) {
        sym = tile.ownerId === 'p1' ? 'C' : 'D';
      }
      rowStr += sym + ' ';
    }
    lines.push(rowStr.trimEnd());
  }

  return lines.join('\n');
}

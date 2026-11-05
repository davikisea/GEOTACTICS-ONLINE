/**
 * ==============================================================================
 * MOTOR DE COORDENADAS Y PICKING ANALÍTICO O(1) - OPENPLACE BRIDGE
 * ==============================================================================
 * Especificación Canónica: docs/00_GEOTACTICS_ONLINE_MASTER_SPEC.md §3.3
 * Conversión WGS84 (Lng/Lat) <-> Sectores Planetarios <-> Cuadrícula Táctica (20x20).
 * Soporta LOD Semántico y Trazado de Suministros Bresenham.
 * ==============================================================================
 */

export const ZOOM_GLOBAL = 3.5;       // Nivel 1: Macro-Geopolítica (Continentes y Países)
export const ZOOM_OPERACIONAL = 7.0;  // Nivel 2: Provincias, Rutas de Suministro y TCP
export const ZOOM_TACTICO = 14.0;     // Nivel 3: Cuadrícula de Combate Advance Wars en vivo

export const TILE_SIZE = 1000;        // Resolución canónica en píxeles de cada TileCanvas (1000x1000 px)
export const EARTH_RADIUS_M = 6_371_000;

export type LngLat = [number, number];
export type QuadLngLatBounds = [LngLat, LngLat, LngLat, LngLat];

export interface TacticalGridCoords {
  sector: [number, number];
  cell: [number, number];
  pixel: [number, number];
}

/**
 * Picking analítico O(1): Convierte cualquier coordenada geográfica (Lng, Lat)
 * al Sector Tile (Web Mercator a nivel de zoom dado) y su celda táctica interna.
 */
export function lngLatToGridCoords(
  lngLat: LngLat,
  gridSize: number = 20,
  zoom: number = ZOOM_TACTICO
): TacticalGridCoords {
  const [lng, lat] = lngLat;
  const clampedLat = Math.max(-85.05112878, Math.min(85.05112878, lat));
  const n = Math.pow(2, zoom);

  const tileXFloat = ((lng + 180) / 360) * n;
  const latRad = (clampedLat * Math.PI) / 180;
  const tileYFloat =
    ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n;

  const sectorX = Math.floor(tileXFloat);
  const sectorY = Math.floor(tileYFloat);

  const fracX = tileXFloat - sectorX;
  const fracY = tileYFloat - sectorY;

  const cellX = Math.max(0, Math.min(gridSize - 1, Math.floor(fracX * gridSize)));
  const cellY = Math.max(0, Math.min(gridSize - 1, Math.floor(fracY * gridSize)));

  const pixelX = Math.max(0, Math.min(TILE_SIZE - 1, Math.floor(fracX * TILE_SIZE)));
  const pixelY = Math.max(0, Math.min(TILE_SIZE - 1, Math.floor(fracY * TILE_SIZE)));

  return {
    sector: [sectorX, sectorY],
    cell: [cellX, cellY],
    pixel: [pixelX, pixelY],
  };
}

/**
 * Convierte un par fraccionario de sector Web Mercator a coordenadas geográficas (Lng, Lat).
 */
export function tileFractionToLngLat(
  tileXFloat: number,
  tileYFloat: number,
  zoom: number = ZOOM_TACTICO
): LngLat {
  const n = Math.pow(2, zoom);
  const lng = (tileXFloat / n) * 360 - 180;
  const latRad = Math.atan(Math.sinh(Math.PI * (1 - (2 * tileYFloat) / n)));
  const lat = (latRad * 180) / Math.PI;
  return [lng, lat];
}

/**
 * Obtiene los 4 vértices geográficos [Top-Left, Top-Right, Bottom-Right, Bottom-Left]
 * requeridos por MapLibre GL para anclar un CanvasSource.
 */
export function getTileBounds(
  sectorX: number,
  sectorY: number,
  zoom: number = ZOOM_TACTICO
): QuadLngLatBounds {
  return [
    tileFractionToLngLat(sectorX, sectorY, zoom),
    tileFractionToLngLat(sectorX + 1, sectorY, zoom),
    tileFractionToLngLat(sectorX + 1, sectorY + 1, zoom),
    tileFractionToLngLat(sectorX, sectorY + 1, zoom),
  ];
}

/**
 * Traza la línea continua de suministro logístico entre dos nodos geográficos
 * o provinciales mediante el algoritmo raster clásico de Bresenham.
 */
export function traceSupplyLine(
  from: [number, number],
  to: [number, number]
): [number, number][] {
  const points: [number, number][] = [];
  let [x0, y0] = [Math.floor(from[0]), Math.floor(from[1])];
  const [x1, y1] = [Math.floor(to[0]), Math.floor(to[1])];

  const dx = Math.abs(x1 - x0);
  const dy = Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx - dy;

  while (true) {
    points.push([x0, y0]);
    if (x0 === x1 && y0 === y1) break;
    const e2 = err * 2;
    if (e2 > -dy) {
      err -= dy;
      x0 += sx;
    }
    if (e2 < dx) {
      err += dx;
      y0 += sy;
    }
  }
  return points;
}

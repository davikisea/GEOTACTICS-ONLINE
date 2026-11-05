export const MACRO_MATRIX_CONSTANTS = {
  MACRO_ZOOM_LEVEL: 14,
  WORLD_GRID_DIM: 16_384,
  WORLD_TOTAL_CELLS: 268_435_456,
  CHUNK_DIM: 256,
  CHUNK_CELL_COUNT: 65_536,
  WORLD_CHUNKS_PER_AXIS: 64,
  CHUNK_SOA_BYTE_LENGTH: 606_208,
  TACTICAL_SUBGRID_DIM: 20,
  STANDARD_MAX_TCP: 10_000,
  CAPITAL_MAX_TCP: 15_000,
  HANDSHAKE_TIMEOUT_SECONDS: 120,
  PRIORITY_COOLDOWN_HOURS: 4,
  CONSOLIDATION_GRACE_HOURS: 24,
  IMPERIAL_CAP_TEST_ISLAND: 6,
  IMPERIAL_CAP_GLOBAL: 12,
  OVEREXPANSION_EXPONENT: 1.8,
  CAPITAL_EC_MULTIPLIER: 1.15,
  CAPITAL_FORGE_SPEED_MULTIPLIER: 1.10,
  CAPITAL_P2P_TARIFF_MULTIPLIER: 0.80,
  SCRAP_RECOVERY_RATE: 0.35,
} as const;

export const MACRO_TOPOLOGY_FLAGS = {
  LAND_OPEN: 0x01,
  NATIONAL_BORDER: 0x02,
  COASTAL: 0x04,
  IMPASSIBLE: 0x08,
  STRAIT_CHOKE: 0x10,
  RIVER_CROSSING: 0x20,
} as const;

export type IndustrialTier = 1 | 2 | 3 | 4 | 5;
export type CanonicalBiomeCode = 'SEA' | 'BIO-PLA' | 'BIO-HGH' | 'BIO-URB' | 'BIO-ARC-ISL' | 'BIO-JGL' | 'BIO-DES' | 'BIO-ARC';
export type MacroRoadClass = 'none' | 'secondary_unpaved' | 'troncal_paved' | 'autopista' | 'river_bridge' | 'strait_ferry' | 'maritime_lane';
export type SovereigntyLifecycleStatus = 'stable' | 'under_siege' | 'occupied_grace';
export type StrategicChokepointId = 'CHK-MARACAIBO' | 'CHK-PARIA' | (string & {});

export interface WorldCoordinate {
  readonly lng: number;
  readonly lat: number;
  readonly gx: number;
  readonly gy: number;
  readonly linearIndex: number;
  readonly chunkId: number;
  readonly localIndex: number;
  readonly tacticalCellX: number;
  readonly tacticalCellY: number;
}

export interface DirtyRect {
  readonly minX: number;
  readonly minY: number;
  readonly maxX: number;
  readonly maxY: number;
  readonly isEmpty: boolean;
}

export interface MacroChunkSoAView {
  readonly chunkId: number;
  readonly chunkX: number;
  readonly chunkY: number;
  readonly rawBuffer: ArrayBuffer;
  readonly regionId: Uint16Array;
  readonly deJureClan: Uint16Array;
  readonly deFactoClan: Uint16Array;
  readonly controlDensity: Uint8Array;
  readonly terrainPacked: Uint8Array;
  readonly roadMask: Uint8Array;
  readonly fogExploredBits: Uint8Array;
  readonly fogLiveBits: Uint8Array;
}

export function packMacroLinearIndex(gx: number, gy: number): number {
  return ((gy & 0x3fff) << 14) | (gx & 0x3fff);
}

export function unpackMacroLinearIndex(linearIndex: number): readonly [number, number] {
  return [linearIndex & 0x3fff, (linearIndex >>> 14) & 0x3fff] as const;
}

export function createMacroChunkSoA(chunkX: number, chunkY: number, backingBuffer?: ArrayBuffer): MacroChunkSoAView {
  const buffer = backingBuffer ?? new ArrayBuffer(MACRO_MATRIX_CONSTANTS.CHUNK_SOA_BYTE_LENGTH);
  if (buffer.byteLength < MACRO_MATRIX_CONSTANTS.CHUNK_SOA_BYTE_LENGTH) {
    throw new RangeError('Buffer insuficiente para MacroChunkSoA');
  }
  const N = MACRO_MATRIX_CONSTANTS.CHUNK_CELL_COUNT;
  return {
    chunkId: ((chunkY & 0x3f) << 6) | (chunkX & 0x3f),
    chunkX,
    chunkY,
    rawBuffer: buffer,
    regionId: new Uint16Array(buffer, 0, N),
    deJureClan: new Uint16Array(buffer, 131_072, N),
    deFactoClan: new Uint16Array(buffer, 262_144, N),
    controlDensity: new Uint8Array(buffer, 393_216, N),
    terrainPacked: new Uint8Array(buffer, 458_752, N),
    roadMask: new Uint8Array(buffer, 524_288, N),
    fogExploredBits: new Uint8Array(buffer, 589_824, N >>> 3),
    fogLiveBits: new Uint8Array(buffer, 598_016, N >>> 3),
  };
}

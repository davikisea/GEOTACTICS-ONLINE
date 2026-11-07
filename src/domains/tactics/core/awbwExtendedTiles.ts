import { TerrainTile, TerrainType } from '../types';

export interface ExtendedTerrainTile extends TerrainTile {
  variant?: string;
  isDestructible?: boolean;
  seamHp?: number;
  playerSlot?: number;
}

/**
 * Canonical dictionary mapping 194 AWBW numeric tile IDs to TacticalCommand tiles.
 * Extracted and unified from WarsWorld map importer engine.
 */
export const AWBW_EXTENDED_TILE_MAP: Record<string, { type: TerrainType; defenseStars: number; variant?: string; seamHp?: number; slot?: number }> = {
  // Natural Terrains
  '1':  { type: 'plains', defenseStars: 1, variant: 'normal' },
  '2':  { type: 'mountain', defenseStars: 4 },
  '3':  { type: 'forest', defenseStars: 2 },
  '4':  { type: 'river', defenseStars: 0, variant: 'right-left' },
  '5':  { type: 'river', defenseStars: 0, variant: 'top-bottom' },
  '6':  { type: 'river', defenseStars: 0, variant: 'top-right-bottom-left' },
  '7':  { type: 'river', defenseStars: 0, variant: 'right-bottom' },
  '8':  { type: 'river', defenseStars: 0, variant: 'bottom-left' },
  '9':  { type: 'river', defenseStars: 0, variant: 'top-left' },
  '10': { type: 'river', defenseStars: 0, variant: 'top-right' },
  '11': { type: 'river', defenseStars: 0, variant: 'right-bottom-left' },
  '12': { type: 'river', defenseStars: 0, variant: 'top-bottom-left' },
  '13': { type: 'river', defenseStars: 0, variant: 'top-right-left' },
  '14': { type: 'river', defenseStars: 0, variant: 'top-right-bottom' },
  '15': { type: 'road', defenseStars: 0, variant: 'right-left' },
  '16': { type: 'road', defenseStars: 0, variant: 'top-bottom' },
  '17': { type: 'road', defenseStars: 0, variant: 'top-right-bottom-left' },
  '18': { type: 'road', defenseStars: 0, variant: 'right-bottom' },
  '19': { type: 'road', defenseStars: 0, variant: 'bottom-left' },
  '20': { type: 'road', defenseStars: 0, variant: 'top-left' },
  '21': { type: 'road', defenseStars: 0, variant: 'top-right' },
  '22': { type: 'road', defenseStars: 0, variant: 'right-bottom-left' },
  '23': { type: 'road', defenseStars: 0, variant: 'top-bottom-left' },
  '24': { type: 'road', defenseStars: 0, variant: 'top-right-left' },
  '25': { type: 'road', defenseStars: 0, variant: 'top-right-bottom' },
  '26': { type: 'bridge', defenseStars: 0, variant: 'right-left' },
  '27': { type: 'bridge', defenseStars: 0, variant: 'top-bottom' },
  '28': { type: 'sea', defenseStars: 0 },
  '29': { type: 'shoal', defenseStars: 0 },
  '30': { type: 'shoal', defenseStars: 0 },
  '31': { type: 'shoal', defenseStars: 0 },
  '32': { type: 'shoal', defenseStars: 0 },
  '33': { type: 'reef', defenseStars: 2 },

  // Neutral Facilities
  '34': { type: 'city', defenseStars: 3, slot: -1 },
  '35': { type: 'factory', defenseStars: 3, slot: -1 },
  '36': { type: 'airport', defenseStars: 3, slot: -1 },
  '37': { type: 'port', defenseStars: 3, slot: -1 },

  // Player 0 (Orange Star) Facilities
  '38': { type: 'city', defenseStars: 3, slot: 0 },
  '39': { type: 'factory', defenseStars: 3, slot: 0 },
  '40': { type: 'airport', defenseStars: 3, slot: 0 },
  '41': { type: 'port', defenseStars: 3, slot: 0 },
  '42': { type: 'hq', defenseStars: 4, slot: 0 },

  // Player 1 (Blue Moon) Facilities
  '43': { type: 'city', defenseStars: 3, slot: 1 },
  '44': { type: 'factory', defenseStars: 3, slot: 1 },
  '45': { type: 'airport', defenseStars: 3, slot: 1 },
  '46': { type: 'port', defenseStars: 3, slot: 1 },
  '47': { type: 'hq', defenseStars: 4, slot: 1 },

  // Player 2 (Green Earth) Facilities
  '48': { type: 'city', defenseStars: 3, slot: 2 },
  '49': { type: 'factory', defenseStars: 3, slot: 2 },
  '50': { type: 'airport', defenseStars: 3, slot: 2 },
  '51': { type: 'port', defenseStars: 3, slot: 2 },
  '52': { type: 'hq', defenseStars: 4, slot: 2 },

  // Player 3 (Yellow Comet) Facilities
  '53': { type: 'city', defenseStars: 3, slot: 3 },
  '54': { type: 'factory', defenseStars: 3, slot: 3 },
  '55': { type: 'airport', defenseStars: 3, slot: 3 },
  '56': { type: 'port', defenseStars: 3, slot: 3 },
  '57': { type: 'hq', defenseStars: 4, slot: 3 },

  // Pipes & Silos
  '101': { type: 'pipe', defenseStars: 0, variant: 'right-left' },
  '102': { type: 'pipe', defenseStars: 0, variant: 'top-bottom' },
  '103': { type: 'pipe', defenseStars: 0, variant: 'top-right' },
  '104': { type: 'pipe', defenseStars: 0, variant: 'right-bottom' },
  '105': { type: 'pipe', defenseStars: 0, variant: 'bottom-left' },
  '106': { type: 'pipe', defenseStars: 0, variant: 'top-left' },
  '111': { type: 'silo', defenseStars: 3, variant: 'unused' },
  '112': { type: 'silo', defenseStars: 3, variant: 'used' },
  '113': { type: 'pipe', defenseStars: 0, variant: 'pipeSeam-rl', seamHp: 100 },
  '114': { type: 'pipe', defenseStars: 0, variant: 'pipeSeam-tb', seamHp: 100 },

  // Comm Towers & Labs
  '127': { type: 'commtower', defenseStars: 3, slot: 8 },
  '128': { type: 'commtower', defenseStars: 3, slot: 4 },
  '129': { type: 'commtower', defenseStars: 3, slot: 1 },
  '130': { type: 'commtower', defenseStars: 3, slot: 7 },
  '131': { type: 'commtower', defenseStars: 3, slot: 2 },
  '132': { type: 'commtower', defenseStars: 3, slot: 9 },
  '133': { type: 'commtower', defenseStars: 3, slot: -1 },
  '134': { type: 'commtower', defenseStars: 3, slot: 0 },
  '135': { type: 'commtower', defenseStars: 3, slot: 5 },
  '136': { type: 'commtower', defenseStars: 3, slot: 3 },
  '137': { type: 'commtower', defenseStars: 3, slot: 6 },
  '138': { type: 'lab', defenseStars: 3, slot: 8 },
  '139': { type: 'lab', defenseStars: 3, slot: 4 },
  '140': { type: 'lab', defenseStars: 3, slot: 1 },
  '141': { type: 'lab', defenseStars: 3, slot: 7 },
  '142': { type: 'lab', defenseStars: 3, slot: 2 },
  '143': { type: 'lab', defenseStars: 3, slot: 6 },
  '144': { type: 'lab', defenseStars: 3, slot: 9 },
  '145': { type: 'lab', defenseStars: 3, slot: -1 },
  '146': { type: 'lab', defenseStars: 3, slot: 0 },
  '147': { type: 'lab', defenseStars: 3, slot: 5 },
  '148': { type: 'lab', defenseStars: 3, slot: 3 },
};

/**
 * Parses an Advance Wars By Web (AWBW) CSV tile data string into an array of TerrainTile matrix.
 */
export function parseAWBWExtendedMap(
  tileDataCsv: string,
  playerSlotToOwnerIdMap: Record<number, string> = { 0: 'player_p1', 1: 'player_p2', [-1]: '' }
): TerrainTile[][] {
  const rows = tileDataCsv
    .trim()
    .split('\n')
    .map(line =>
      line
        .trim()
        .split(',')
        .map(t => t.trim())
    );

  const gridHeight = rows.length;
  const gridWidth = rows[0]?.length || 0;
  const result: TerrainTile[][] = [];

  for (let y = 0; y < gridHeight; y++) {
    const rowTiles: TerrainTile[] = [];
    for (let x = 0; x < gridWidth; x++) {
      const code = rows[y][x];
      const mapping = AWBW_EXTENDED_TILE_MAP[code] || { type: 'plains', defenseStars: 1 };
      const ownerId = mapping.slot !== undefined ? (playerSlotToOwnerIdMap[mapping.slot] || null) : null;
      const captureHp = mapping.slot !== undefined ? 20 : undefined;

      const tile: ExtendedTerrainTile = {
        x,
        y,
        type: mapping.type,
        defenseStars: mapping.defenseStars,
        ownerId,
        captureHp: mapping.variant === 'used' ? 0 : captureHp,
        variant: mapping.variant,
        seamHp: mapping.seamHp,
        isDestructible: mapping.seamHp !== undefined,
      };
      rowTiles.push(tile);
    }
    result.push(rowTiles);
  }

  return result;
}

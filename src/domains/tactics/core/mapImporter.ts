/**
 * IMPORTADOR CANÓNICO DE MAPAS AWBW (ADVANCE WARS BY WEB / WARSWORLD)
 * 
 * Permite importar matrices de tiles de la comunidad (AWBW IDs 1-194)
 * convirtiéndolas automáticamente a la estructura canónica de TacticalCommand:
 * - Detección de dimensiones (ancho x alto).
 * - Mapeo de terrenos, propiedades, estrellas de defensa y pertenencia de jugador.
 * - Generación automática de unidades iniciales desplegadas sobre cuarteles y fábricas.
 */

import { TerrainTile, TerrainType, TacticalUnit, GridPosition } from '../types';

export interface AWBWMapData {
  id: string;
  name: string;
  width: number;
  height: number;
  numberOfPlayers: number;
  tiles: TerrainTile[][];
  startingUnits: TacticalUnit[];
  description?: string;
  author?: string;
  propertyStats: {
    p1Properties: number;
    p2Properties: number;
    neutralProperties: number;
    commTowers: number;
    factories: number;
  };
}

interface RawTileDef {
  type: TerrainType;
  playerSlot?: number; // -1 = neutral, 0 = p1, 1 = p2, 2..15 = otros
}

/**
 * Mapeo oficial de códigos de losetas numéricas AWBW (1 a 194)
 */
export const AWBW_TILE_MAPPING: Record<string, RawTileDef> = {
  // Terrenos Naturales
  '1': { type: 'plains' },
  '2': { type: 'mountain' },
  '3': { type: 'forest' },
  '4': { type: 'river' },
  '5': { type: 'river' },
  '6': { type: 'river' },
  '7': { type: 'river' },
  '8': { type: 'river' },
  '9': { type: 'river' },
  '10': { type: 'river' },
  '11': { type: 'river' },
  '12': { type: 'river' },
  '13': { type: 'river' },
  '14': { type: 'river' },
  '15': { type: 'road' },
  '16': { type: 'road' },
  '17': { type: 'road' },
  '18': { type: 'road' },
  '19': { type: 'road' },
  '20': { type: 'road' },
  '21': { type: 'road' },
  '22': { type: 'road' },
  '23': { type: 'road' },
  '24': { type: 'road' },
  '25': { type: 'road' },
  '26': { type: 'bridge' },
  '27': { type: 'bridge' },
  '28': { type: 'sea' },
  '29': { type: 'shoal' },
  '30': { type: 'shoal' },
  '31': { type: 'shoal' },
  '32': { type: 'shoal' },
  '33': { type: 'reef' },

  // Propiedades Neutrales
  '34': { type: 'city', playerSlot: -1 },
  '35': { type: 'factory', playerSlot: -1 },
  '36': { type: 'airport', playerSlot: -1 },
  '37': { type: 'port', playerSlot: -1 },

  // Orange Star (Jugador 1 / p1)
  '38': { type: 'city', playerSlot: 0 },
  '39': { type: 'factory', playerSlot: 0 },
  '40': { type: 'airport', playerSlot: 0 },
  '41': { type: 'port', playerSlot: 0 },
  '42': { type: 'hq', playerSlot: 0 },

  // Blue Moon (Jugador 2 / p2)
  '43': { type: 'city', playerSlot: 1 },
  '44': { type: 'factory', playerSlot: 1 },
  '45': { type: 'airport', playerSlot: 1 },
  '46': { type: 'port', playerSlot: 1 },
  '47': { type: 'hq', playerSlot: 1 },

  // Green Earth (Slot 2)
  '48': { type: 'city', playerSlot: 2 },
  '49': { type: 'factory', playerSlot: 2 },
  '50': { type: 'airport', playerSlot: 2 },
  '51': { type: 'port', playerSlot: 2 },
  '52': { type: 'hq', playerSlot: 2 },

  // Yellow Comet (Slot 3)
  '53': { type: 'city', playerSlot: 3 },
  '54': { type: 'factory', playerSlot: 3 },
  '55': { type: 'airport', playerSlot: 3 },
  '56': { type: 'port', playerSlot: 3 },
  '57': { type: 'hq', playerSlot: 3 },

  // Red Fire (Slot 5)
  '81': { type: 'city', playerSlot: 5 },
  '82': { type: 'factory', playerSlot: 5 },
  '83': { type: 'airport', playerSlot: 5 },
  '84': { type: 'port', playerSlot: 5 },
  '85': { type: 'hq', playerSlot: 5 },

  // Grey Sky (Slot 6)
  '86': { type: 'city', playerSlot: 6 },
  '87': { type: 'factory', playerSlot: 6 },
  '88': { type: 'airport', playerSlot: 6 },
  '89': { type: 'port', playerSlot: 6 },
  '90': { type: 'hq', playerSlot: 6 },

  // Black Hole (Slot 4)
  '91': { type: 'city', playerSlot: 4 },
  '92': { type: 'factory', playerSlot: 4 },
  '93': { type: 'airport', playerSlot: 4 },
  '94': { type: 'port', playerSlot: 4 },
  '95': { type: 'hq', playerSlot: 4 },

  // Brown Desert (Slot 7)
  '96': { type: 'city', playerSlot: 7 },
  '97': { type: 'factory', playerSlot: 7 },
  '98': { type: 'airport', playerSlot: 7 },
  '99': { type: 'port', playerSlot: 7 },
  '100': { type: 'hq', playerSlot: 7 },

  // Oleoductos y Silos
  '101': { type: 'pipe' },
  '102': { type: 'pipe' },
  '103': { type: 'pipe' },
  '104': { type: 'pipe' },
  '105': { type: 'pipe' },
  '106': { type: 'pipe' },
  '107': { type: 'pipe' },
  '108': { type: 'pipe' },
  '109': { type: 'pipe' },
  '110': { type: 'pipe' },
  '111': { type: 'silo' }, // Unused missile silo
  '112': { type: 'silo' }, // Used missile silo
  '113': { type: 'pipe' }, // Pipe seam
  '114': { type: 'pipe' },
  '115': { type: 'plains' }, // Broken pipe
  '116': { type: 'plains' },

  // Amber Blossom (Slot 8)
  '117': { type: 'factory', playerSlot: 8 },
  '118': { type: 'airport', playerSlot: 8 },
  '119': { type: 'city', playerSlot: 8 },
  '120': { type: 'hq', playerSlot: 8 },
  '121': { type: 'port', playerSlot: 8 },

  // Jade Falcon (Slot 9)
  '122': { type: 'factory', playerSlot: 9 },
  '123': { type: 'airport', playerSlot: 9 },
  '124': { type: 'city', playerSlot: 9 },
  '125': { type: 'hq', playerSlot: 9 },
  '126': { type: 'port', playerSlot: 9 },

  // Torres de Comunicaciones (Commtowers)
  '127': { type: 'commtower', playerSlot: 8 },
  '128': { type: 'commtower', playerSlot: 4 },
  '129': { type: 'commtower', playerSlot: 1 }, // p2
  '130': { type: 'commtower', playerSlot: 7 },
  '131': { type: 'commtower', playerSlot: 2 },
  '132': { type: 'commtower', playerSlot: 9 },
  '133': { type: 'commtower', playerSlot: -1 }, // neutral
  '134': { type: 'commtower', playerSlot: 0 }, // p1
  '135': { type: 'commtower', playerSlot: 5 },
  '136': { type: 'commtower', playerSlot: 3 },
  '137': { type: 'commtower', playerSlot: 6 },

  // Laboratorios de Investigación (Labs)
  '138': { type: 'lab', playerSlot: 8 },
  '139': { type: 'lab', playerSlot: 4 },
  '140': { type: 'lab', playerSlot: 1 },
  '141': { type: 'lab', playerSlot: 7 },
  '142': { type: 'lab', playerSlot: 2 },
  '143': { type: 'lab', playerSlot: 6 },
  '144': { type: 'lab', playerSlot: 9 },
  '145': { type: 'lab', playerSlot: -1 },
  '146': { type: 'lab', playerSlot: 0 },
  '147': { type: 'lab', playerSlot: 5 },
  '148': { type: 'lab', playerSlot: 3 },

  // Facciones Extendidas 10-15
  '149': { type: 'airport', playerSlot: 10 },
  '150': { type: 'factory', playerSlot: 10 },
  '151': { type: 'city', playerSlot: 10 },
  '152': { type: 'commtower', playerSlot: 10 },
  '153': { type: 'hq', playerSlot: 10 },
  '154': { type: 'lab', playerSlot: 10 },
  '155': { type: 'port', playerSlot: 10 },

  '156': { type: 'airport', playerSlot: 11 },
  '157': { type: 'factory', playerSlot: 11 },
  '158': { type: 'city', playerSlot: 11 },
  '159': { type: 'commtower', playerSlot: 11 },
  '160': { type: 'hq', playerSlot: 11 },
  '161': { type: 'lab', playerSlot: 11 },
  '162': { type: 'port', playerSlot: 11 },

  '163': { type: 'airport', playerSlot: 12 },
  '164': { type: 'factory', playerSlot: 12 },
  '165': { type: 'city', playerSlot: 12 },
  '166': { type: 'commtower', playerSlot: 12 },
  '167': { type: 'hq', playerSlot: 12 },
  '168': { type: 'lab', playerSlot: 12 },
  '169': { type: 'port', playerSlot: 12 },

  '170': { type: 'airport', playerSlot: 13 },
  '171': { type: 'factory', playerSlot: 13 },
  '172': { type: 'city', playerSlot: 13 },
  '173': { type: 'commtower', playerSlot: 13 },
  '174': { type: 'hq', playerSlot: 13 },
  '175': { type: 'lab', playerSlot: 13 },
  '176': { type: 'port', playerSlot: 13 },

  '181': { type: 'airport', playerSlot: 14 },
  '182': { type: 'factory', playerSlot: 14 },
  '183': { type: 'city', playerSlot: 14 },
  '184': { type: 'commtower', playerSlot: 14 },
  '185': { type: 'hq', playerSlot: 14 },
  '186': { type: 'lab', playerSlot: 14 },
  '187': { type: 'port', playerSlot: 14 },

  '188': { type: 'airport', playerSlot: 15 },
  '189': { type: 'factory', playerSlot: 15 },
  '190': { type: 'city', playerSlot: 15 },
  '191': { type: 'commtower', playerSlot: 15 },
  '192': { type: 'hq', playerSlot: 15 },
  '193': { type: 'lab', playerSlot: 15 },
  '194': { type: 'port', playerSlot: 15 },
};

/**
 * Retorna las estrellas de defensa canónicas según el tipo de terreno.
 */
export function getCanonicalDefenseStars(type: TerrainType): number {
  switch (type) {
    case 'hq':
    case 'mountain':
      return 4;
    case 'city':
    case 'factory':
    case 'airport':
    case 'port':
    case 'commtower':
    case 'lab':
    case 'silo':
      return 3;
    case 'forest':
    case 'reef':
      return 2;
    case 'plains':
      return 1;
    case 'road':
    case 'river':
    case 'bridge':
    case 'sea':
    case 'shoal':
    case 'pipe':
    default:
      return 0;
  }
}

/**
 * Transforma una cadena de losetas AWBW en un objeto de mapa estructurado para TacticalCommand.
 */
export function parseAWBWMap(
  tileDataString: string,
  metadata?: Partial<AWBWMapData>
): AWBWMapData {
  const cleaned = tileDataString.trim();
  const rawRows = cleaned
    .split(/\r?\n/)
    .map(r => r.trim())
    .filter(r => r.length > 0);

  if (rawRows.length === 0) {
    throw new Error('La cadena de mapa AWBW está vacía.');
  }

  const height = rawRows.length;
  const parsedRows: string[][] = rawRows.map(rowStr =>
    rowStr.split(',').map(item => item.trim()).filter(item => item.length > 0)
  );
  const width = parsedRows[0].length;

  // Validar coherencia dimensional
  for (let y = 0; y < height; y++) {
    if (parsedRows[y].length !== width) {
      console.warn(
        `[MapImporter] Fila ${y} tiene ${parsedRows[y].length} losetas, esperado: ${width}. Rellenando con llanuras.`
      );
      while (parsedRows[y].length < width) {
        parsedRows[y].push('1');
      }
    }
  }

  let p1Properties = 0;
  let p2Properties = 0;
  let neutralProperties = 0;
  let commTowers = 0;
  let factories = 0;

  let p1HQ: GridPosition | null = null;
  let p2HQ: GridPosition | null = null;
  const p1Factories: GridPosition[] = [];
  const p2Factories: GridPosition[] = [];

  const tiles: TerrainTile[][] = [];

  for (let y = 0; y < height; y++) {
    const rowTiles: TerrainTile[] = [];
    for (let x = 0; x < width; x++) {
      const code = parsedRows[y][x];
      const def = AWBW_TILE_MAPPING[code] || { type: 'plains' };

      // Normalizar dueño: 0 -> 'p1', 1 -> 'p2', otros -> null
      let ownerId: string | null = null;
      if (def.playerSlot === 0) {
        ownerId = 'p1';
        p1Properties++;
      } else if (def.playerSlot === 1) {
        ownerId = 'p2';
        p2Properties++;
      } else if (['city', 'factory', 'airport', 'port', 'commtower', 'lab'].includes(def.type)) {
        neutralProperties++;
      }

      if (def.type === 'commtower') {
        commTowers++;
      }
      if (def.type === 'factory') {
        factories++;
        if (ownerId === 'p1') p1Factories.push({ x, y });
        if (ownerId === 'p2') p2Factories.push({ x, y });
      }
      if (def.type === 'hq') {
        if (ownerId === 'p1') p1HQ = { x, y };
        if (ownerId === 'p2') p2HQ = { x, y };
      }

      const tileEntry: any = {
        x,
        y,
        type: def.type,
        defenseStars: getCanonicalDefenseStars(def.type),
        ownerId,
        captureHp: 20,
      };
      if (code === 113 || code === 114 || String(code) === '113' || String(code) === '114') {
        tileEntry.variant = 'pipeSeam-rl';
        tileEntry.seamHp = 100;
      }
      rowTiles.push(tileEntry);
    }
    tiles.push(rowTiles);
  }

  // Generar unidades de partida tácticas si no fueron provistas
  const startingUnits = generateStartingUnits(tiles, p1HQ, p2HQ, p1Factories, p2Factories);

  const mapName = metadata?.name || `Mapa Comunitario AWBW (${width}x${height})`;
  const mapId =
    metadata?.id ||
    `map_${mapName.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${width}x${height}`;

  return {
    id: mapId,
    name: mapName,
    width,
    height,
    numberOfPlayers: 2,
    tiles,
    startingUnits,
    description:
      metadata?.description ||
      `Mapa canónico AWBW de ${width}x${height} casillas con ${p1Properties + p2Properties + neutralProperties} propiedades y ${commTowers} torres de comunicaciones.`,
    author: metadata?.author || 'Comunidad Advance Wars',
    propertyStats: {
      p1Properties,
      p2Properties,
      neutralProperties,
      commTowers,
      factories,
    },
  };
}

/**
 * Despliega automáticamente un escuadrón inicial balanceado para cada comandante
 * sobre sus cuarteles y bases operativas.
 */
function generateStartingUnits(
  tiles: TerrainTile[][],
  p1HQ: GridPosition | null,
  p2HQ: GridPosition | null,
  p1Factories: GridPosition[],
  p2Factories: GridPosition[]
): TacticalUnit[] {
  const units: TacticalUnit[] = [];
  const occupied = new Set<string>();

  const addUnit = (
    id: string,
    owner: 'p1' | 'p2',
    code: string,
    name: string,
    pos: GridPosition,
    movePts: number,
    moveType: 'foot' | 'mech' | 'wheels' | 'treads',
    baseAtk: number
  ) => {
    const key = `${pos.x},${pos.y}`;
    if (occupied.has(key)) return;
    occupied.add(key);

    units.push({
      id,
      unitCode: code,
      displayName: name,
      ownerId: owner,
      x: pos.x,
      y: pos.y,
      hp: 100,
      maxHp: 100,
      tier: 1,
      ammo: 9,
      fuel: 99,
      movementPoints: movePts,
      movementType: moveType,
      minRange: 1,
      maxRange: 1,
      visionRange: 3,
      baseAttack: baseAtk,
      productionCost: 1000,
      hasMoved: false,
      hasActed: false,
      skinId: 'default',
    });
  };

  // 1. Unidades para Jugador 1 (Orange Star)
  if (p1HQ) {
    addUnit('p1_inf_hq', 'p1', 'infantry', 'Infantería OS', p1HQ, 3, 'foot', 55);
  }
  if (p1Factories.length > 0) {
    addUnit('p1_tank_1', 'p1', 'tank_light', 'Tanque Ligero OS', p1Factories[0], 6, 'treads', 75);
    if (p1Factories.length > 1) {
      addUnit('p1_recon_1', 'p1', 'recon', 'Reconocimiento OS', p1Factories[1], 8, 'wheels', 70);
    }
  }

  // 2. Unidades para Jugador 2 (Blue Moon)
  if (p2HQ) {
    addUnit('p2_inf_hq', 'p2', 'infantry', 'Infantería BM', p2HQ, 3, 'foot', 55);
  }
  if (p2Factories.length > 0) {
    addUnit('p2_tank_1', 'p2', 'tank_light', 'Tanque Ligero BM', p2Factories[0], 6, 'treads', 75);
    if (p2Factories.length > 1) {
      addUnit('p2_recon_1', 'p2', 'recon', 'Reconocimiento BM', p2Factories[1], 8, 'wheels', 70);
    }
  }

  // Fallback si el mapa no tiene HQ o bases asignadas
  if (units.length === 0) {
    const height = tiles.length;
    const width = tiles[0]?.length || 0;
    addUnit('p1_fallback_inf', 'p1', 'infantry', 'Infantería Aliada', { x: 0, y: 0 }, 3, 'foot', 55);
    addUnit(
      'p2_fallback_inf',
      'p2',
      'infantry',
      'Infantería Enemiga',
      { x: Math.max(0, width - 1), y: Math.max(0, height - 1) },
      3,
      'foot',
      55
    );
  }

  return units;
}

export const AWBW_EXTENDED_TILE_MAP = AWBW_TILE_MAPPING;
export function parseAWBWExtendedMap(rawText: string): TerrainTile[][] {
  return parseAWBWMap(rawText).tiles;
}

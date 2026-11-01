export type MovementType = 'foot' | 'mech' | 'wheels' | 'treads' | 'air' | 'sea';

export type EconomicCurrency = 'funds' | 'battleCredits' | 'commandGems';

export type TerrainType =
  | 'plains'
  | 'forest'
  | 'mountain'
  | 'road'
  | 'river'
  | 'city'
  | 'factory'
  | 'airport'
  | 'port'
  | 'hq'
  | 'sea'
  | 'reef'
  | 'shoal'
  | 'bridge'
  | 'commtower'
  | 'silo'
  | 'lab'
  | 'pipe';

export interface GridPosition {
  x: number;
  y: number;
}

export interface TerrainTile {
  x: number;
  y: number;
  type: TerrainType;
  defenseStars: number;
  ownerId?: string | null;
  captureHp?: number;
}

export interface TacticalUnit {
  id: string;
  unitCode: string;
  displayName: string;
  ownerId: string;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  ammo: number;
  fuel: number;
  movementPoints: number;
  movementType: MovementType;
  minRange: number;
  maxRange: number;
  visionRange: number;
  baseAttack: number;
  productionCost: number;
  hasMoved: boolean;
  hasActed: boolean;
  skinId: string;
  loadedUnitIds?: string[];
  isLoadedInsideId?: string | null;
}

export interface PlayerProfile {
  id: string;
  username: string;
  avatarUrl: string;
  accountLevel: number;
  currentXp: number;
  battleCredits: number;
  commandGems: number;
  eloRating: number;
  trophiesCount: number;
  totalMatchesPlayed: number;
  totalVictories: number;
  dailyOfflineMatchesCount: number;
  lastOfflineMatchDate: string;
  equippedLoadout: string[];
  equippedCosmetics: Record<string, string>;
}

export interface ActiveMatch {
  id: string;
  roomCode: string;
  player1Id: string;
  player2Id: string | null;
  currentTurnPlayerId: string;
  turnNumber: number;
  status: 'waiting' | 'in_progress' | 'finished' | 'abandoned';
  gameMode: 'pvp_realtime' | 'pvp_async' | 'vs_bot' | 'offline_practice' | 'tutorial';
  botDifficulty?: 'easy' | 'normal' | 'hard' | 'chess';
  mapId: string;
  turnDeadline?: string;
  winnerId?: string | null;
}

export interface MatchState {
  matchId: string;
  gridWidth: number;
  gridHeight: number;
  tiles: TerrainTile[][];
  units: Record<string, TacticalUnit>;
  playerFunds: Record<string, number>;
  lastActionSeq: number;
}

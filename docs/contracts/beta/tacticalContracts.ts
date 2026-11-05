export type CanonicalUnitCode =
  | 'infantry'
  | 'recon'
  | 'mech'
  | 'apc'
  | 'artillery'
  | 'tank_light'
  | 'anti_air'
  | 'missiles'
  | 'rocket'
  | 'tank_medium'
  | 'neotank'
  | 't_copter'
  | 'b_copter'
  | 'fighter'
  | 'bomber'
  | 'battleship';

export type IndustrialTier = 1 | 2 | 3 | 4 | 5;
export type TacticalGridDimension = 16 | 20 | 24;
export type SectorBiomeCode = 'BIO-URB' | 'BIO-PLA' | 'BIO-HGH' | 'BIO-JGL' | 'BIO-ARC-ISL';
export type TacticalWeather = 'clear' | 'rain' | 'snow' | 'sandstorm';
export type CardinalDirection = 'N' | 'E' | 'S' | 'W';
export type CardinalRoadBitMask = number;

export const CARDINAL_ROAD_BITS: Readonly<Record<CardinalDirection, number>> = {
  N: 0b0001,
  E: 0b0010,
  S: 0b0100,
  W: 0b1000,
} as const;

export type BattleTeam = 'attacker' | 'defender';
export type CommanderSlotId = 'atk_1' | 'atk_2' | 'def_1' | 'def_2';
export type SlotControlMode = 'VACANT' | 'AI_GARRISON' | 'HUMAN_ACTIVE' | 'HUMAN_DISCONNECTED_GRACE';

export type GarrisonRarityTier =
  | 'COMMON_MILITIA'
  | 'UNCOMMON_REGULAR'
  | 'RARE_VETERAN'
  | 'EPIC_GENERAL_STAFF'
  | 'LEGENDARY_GRAND_MARSHAL';

export type ChassisOriginSource = 'f2p_infinite' | 'user_hangar' | 'faction_hangar' | 'garrison_pool';

export type SessionLifecycleState =
  | 'BOOTSTRAPPING'
  | 'ACTIVE_PVE_HANDSHAKE_OPEN'
  | 'HANDSHAKE_QUEUED_AT_TURN_BOUNDARY'
  | 'ACTIVE_PVE_GARRISON_LOCKED'
  | 'ACTIVE_PVP_1V1'
  | 'COOP_TRANSITION_QUEUED'
  | 'ACTIVE_COOP_2V1'
  | 'ACTIVE_COOP_2V2'
  | 'SETTLING_ATTRITION'
  | 'CONCLUDED';

export type TieredStockCount = Readonly<Record<IndustrialTier, number>>;

export interface UnitManifest {
  readonly manifestId: string;
  readonly commanderSlot: CommanderSlotId;
  readonly ownerUserId: string | null;
  readonly ownerFactionId: string | null;
  readonly allowFactionFallback: boolean;
  readonly f2pInfiniteBasicKitEnabled: true;
  readonly userHangarStock: Readonly<Partial<Record<CanonicalUnitCode, Partial<TieredStockCount>>>>;
  readonly factionHangarStock: Readonly<Partial<Record<CanonicalUnitCode, Partial<TieredStockCount>>>>;
  readonly garrisonPoolStock: Readonly<Partial<Record<CanonicalUnitCode, Partial<TieredStockCount>>>>;
}

export interface EntryCorridorSpec {
  readonly edge: CardinalDirection;
  readonly permittedTeam: BattleTeam | 'neutral_open';
  readonly roadFrictionMultiplier: number;
  readonly isCoastalLanding: boolean;
  readonly hasRiverCrossing: boolean;
  readonly allowExfiltration: boolean;
}

export interface FischerClockConfig {
  readonly initialBankSeconds: number;
  readonly turnIncrementSeconds: number;
  readonly validActionBonusSeconds: number;
  readonly maxActionBonusPerTurnSeconds: number;
  readonly maxAccumulatedCapSeconds: number;
  readonly disconnectGraceBankSeconds: number;
}

export interface GarrisonAISpec {
  readonly bunkerLevel: 1 | 2 | 3 | 4 | 5;
  readonly rarity: GarrisonRarityTier;
  readonly maxSearchPlies: 1 | 2 | 3 | 5 | 6;
  readonly maxStateBudget: number;
  readonly maxOperableTier: IndustrialTier;
  readonly canTriggerCOP: boolean;
  readonly canTriggerSCOP: boolean;
}

export interface CommanderSlotBootstrap {
  readonly slotId: CommanderSlotId;
  readonly team: BattleTeam;
  readonly controlMode: SlotControlMode;
  readonly commanderCOId: string;
  readonly initialFundsG: number;
  readonly spawnEdge: CardinalDirection | 'INTERIOR_BUNKER';
  readonly vanguardUnits: ReadonlyArray<{
    readonly unitCode: CanonicalUnitCode;
    readonly tier: IndustrialTier;
    readonly initialHp: number;
    readonly source: ChassisOriginSource;
  }>;
  readonly manifest: UnitManifest;
  readonly garrisonAI?: GarrisonAISpec;
}

export interface PregeneratedTileCell {
  readonly x: number;
  readonly y: number;
  readonly terrainType:
    | 'plains' | 'forest' | 'mountain' | 'road' | 'river' | 'bridge'
    | 'city' | 'factory' | 'airport' | 'port' | 'hq'
    | 'sea' | 'reef' | 'shoal' | 'commtower' | 'silo' | 'lab' | 'pipe';
  readonly controllerSlot: CommanderSlotId | null;
  readonly capturePoints: number;
}

export interface CombatContext {
  readonly sessionId: string;
  readonly sectorId: string;
  readonly macroSectorCoord: readonly [number, number];
  readonly deterministicSeed: number;
  readonly gridDimension: TacticalGridDimension;
  readonly biome: SectorBiomeCode;
  readonly initialWeather: TacticalWeather;
  readonly cardinalRoadMask: CardinalRoadBitMask;
  readonly topologyFlags: number;
  readonly entryCorridors: ReadonlyArray<EntryCorridorSpec>;
  readonly ruleset: {
    readonly normalizeAllTiersToT1: boolean;
    readonly fogOfWarEnabled: boolean;
    readonly maxGlobalRounds: number;
    readonly handshakeWindowSeconds: 120;
    readonly handshakeStartedAtEpochMs: number;
    readonly allowDynamicCoopDropIn: boolean;
    readonly soloSupplySoftCap: number;
    readonly coopSlotSupplySoftCap: number;
    readonly excessUnitUpkeepG: number;
    readonly clockConfig: FischerClockConfig;
  };
  readonly strategicValuation: {
    readonly isCapitalSector: boolean;
    readonly isChokepointOrStrategicNode: boolean;
    readonly bunkerLevel: 1 | 2 | 3 | 4 | 5;
    readonly currentSectorTcp: number;
    readonly maxSectorTcp: 10000 | 15000;
    readonly strategicSectorValueEc: number;
  };
  readonly slots: Readonly<Record<CommanderSlotId, CommanderSlotBootstrap>>;
  readonly pregeneratedGrid?: ReadonlyArray<ReadonlyArray<PregeneratedTileCell>>;
}

export interface ReinforcementUnitSpec {
  readonly unitCode: CanonicalUnitCode;
  readonly tier: IndustrialTier;
  readonly initialHp: number;
  readonly source: Exclude<ChassisOriginSource, 'garrison_pool'>;
  readonly originOwnerUserId: string;
}

export interface ReinforcementTicket {
  readonly ticketId: string;
  readonly sessionId: string;
  readonly commanderSlot: CommanderSlotId;
  readonly requestedByUserId: string;
  readonly requestedAtRound: number;
  readonly entryEdge: CardinalDirection;
  readonly transitMetrics: {
    readonly roadDistanceKm: number;
    readonly graphHops: number;
    readonly fuelCostCommitted: number;
    readonly roadFrictionMultiplier: number;
    readonly hasLocalFactoryHubBuff: boolean;
  };
  readonly units: ReadonlyArray<ReinforcementUnitSpec>;
}

export function computeTravelTurnDelay(ticket: ReinforcementTicket): number {
  const {
    roadDistanceKm,
    graphHops,
    fuelCostCommitted,
    roadFrictionMultiplier,
    hasLocalFactoryHubBuff,
  } = ticket.transitMetrics;

  const baseTurns = 3;
  const hubDiscount = hasLocalFactoryHubBuff ? 1 : 0;
  const hopTerm = 0.5 * Math.max(0, graphHops);
  const roadTerm = (Math.max(0, roadDistanceKm) / 90.0) * Math.max(1.0, roadFrictionMultiplier);
  const fuelTerm = Math.max(0, fuelCostCommitted) / 25.0;
  const massTerm = 0.5 * Math.max(0, ticket.units.length - 2);

  const rawDelay = Math.ceil(baseTurns - hubDiscount + hopTerm + roadTerm + fuelTerm + massTerm);
  return Math.max(2, Math.min(10, rawDelay));
}

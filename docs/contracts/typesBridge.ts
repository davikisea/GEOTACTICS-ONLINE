export interface WorldCoordinate {
  readonly latitude: number;
  readonly longitude: number;
  readonly altitudeMeters?: number;
}

export interface SectorAddress {
  readonly theaterCode: string;
  readonly countryIso: string;
  readonly regionId: string;
  readonly webMercatorSector: readonly [number, number];
  readonly tacticalGridCell: readonly [number, number];
  readonly fullAddress: string;
}

export type CanonicalBiome =
  | 'BIO-PLA'
  | 'BIO-HGH'
  | 'BIO-URB'
  | 'BIO-ARC-ISL'
  | 'BIO-JGL';

export type WeatherType = 'clear' | 'rain' | 'snow' | 'sandstorm';

export interface StrategicNodeSnapshot {
  readonly nodeId: string;
  readonly nodeType: 'capital_hq' | 'refinery_hub' | 'strait_canal' | 'radar_c4isr' | 'missile_silo';
  readonly name: string;
  readonly buffType: 'hegemonic_capital' | 'energy_extraction' | 'toll_chokepoint' | 'radar_recon' | 'area_denial';
  readonly buffValue: number;
  readonly controllingClanId: string | null;
}

export interface ConnectedRoadNetSnapshot {
  readonly topologyFlags: number;
  readonly adjacentRegionIds: readonly string[];
  readonly isSupplyBlocked: boolean;
  readonly transitCostMultiplier: number;
  readonly tollFeePercent: number;
  readonly activeEntryEdges: readonly ('north' | 'south' | 'east' | 'west')[];
}

export interface SectorPropertyInitialState {
  readonly x: number;
  readonly y: number;
  readonly type: 'city' | 'factory' | 'airport' | 'port' | 'hq' | 'commtower' | 'silo';
  readonly initialOwner: 'attacker' | 'defender' | 'neutral';
  readonly captureHp: number;
}

export interface SectorSnapshot {
  readonly sectorAddress: SectorAddress;
  readonly worldCoordinate: WorldCoordinate;
  readonly biome: CanonicalBiome;
  readonly weather: WeatherType;
  readonly bunkerLevel: 1 | 2 | 3 | 4 | 5;
  readonly defenseCoverageBonus: number;
  readonly connectedRoadNet: ConnectedRoadNetSnapshot;
  readonly strategicNode?: StrategicNodeSnapshot | null;
  readonly initialProperties: readonly SectorPropertyInitialState[];
  readonly snapshotTimestampUtc: string;
}

export type CanonicalChassisCode =
  | 'infantry' | 'mech' | 'recon' | 'tank' | 'medium_tank' | 'neotank'
  | 'artillery' | 'rockets' | 'anti_air' | 'missiles'
  | 'b_copter' | 'fighter' | 'bomber' | 'apc' | 't_copter' | 'battleship';

export type ChassisTier = 1 | 2 | 3 | 4 | 5;

export type HangarSource = 'f2p_infinite' | 'user_hangar' | 'faction_hangar';

export interface UnitChassisAllocation {
  readonly allocationId: string;
  readonly chassisCode: CanonicalChassisCode;
  readonly tier: ChassisTier;
  readonly sourceHangar: HangarSource;
  readonly ownerUserId: string;
  readonly ownerClanId?: string | null;
  readonly currentHp: number;
  readonly maxHp: 100;
  readonly ammoRemaining: number;
  readonly fuelRemaining: number;
  readonly skinId: string;
  readonly hangarDbRowId?: string | null;
}

export interface UnitManifest {
  readonly manifestId: string;
  readonly matchId: string;
  readonly partySide: 'attacker' | 'defender';
  readonly commanderId: string;
  readonly clanId?: string | null;
  readonly allocations: readonly UnitChassisAllocation[];
  readonly allowFactionStock: boolean;
  readonly totalArmyEvaluationEc: number;
  readonly manifestChecksum: string;
}

export interface FischerClockConfig {
  readonly turnTimeLimitSec: number;
  readonly actionBonusSec: number;
  readonly maxTurnCapSec: number;
  readonly disconnectGraceBankSec: number;
}

export interface CombatPartyConfig {
  readonly partySide: 'attacker' | 'defender';
  readonly commanderId: string;
  readonly commanderName: string;
  readonly clanId: string | null;
  readonly clanTag?: string | null;
  readonly coId: string;
  readonly initialFunds: number;
  readonly manifest: UnitManifest;
  readonly isAiControlled: boolean;
  readonly aiDifficulty?: 'easy' | 'normal' | 'hard' | 'chess' | 'mcts_legendary';
}

export interface DefensiveHandshakeContext {
  readonly isHandshakeActive: boolean;
  readonly handshakeDeadlineUtc: string | null;
  readonly secondsRemaining: number;
  readonly canDropInPvp: boolean;
}

export interface CombatContext {
  readonly contextVersion: '5.1.0-MODULAR-FOUNDATION';
  readonly matchId: string;
  readonly sectorSnapshot: SectorSnapshot;
  readonly fischerClock: FischerClockConfig;
  readonly attacker: CombatPartyConfig;
  readonly defender: CombatPartyConfig;
  readonly defensiveHandshake: DefensiveHandshakeContext;
  readonly rngSeed: number;
  readonly createdAtUtc: string;
}

export interface DestroyedChassisRecord {
  readonly allocationId: string;
  readonly chassisCode: CanonicalChassisCode;
  readonly tier: ChassisTier;
  readonly ownerUserId: string;
  readonly ownerClanId?: string | null;
  readonly sourceHangar: HangarSource;
  readonly isPermanentLoss: boolean;
  readonly techScrapGenerated: number;
  readonly steelPlatesRefundable: number;
  readonly hangarDbRowId?: string | null;
}

export type MatchEndReason =
  | 'army_wiped'
  | 'hq_captured'
  | 'turn_limit'
  | 'resignation'
  | 'forfeit_disconnect';

export type PyrrhicVictoryRating =
  | 'decisive_victory'
  | 'sustainable_victory'
  | 'pyrrhic_moderate'
  | 'pyrrhic_catastrophic';

export interface BattleSettlementEvent {
  readonly eventType: 'BATTLE_SETTLEMENT_COMMITTED';
  readonly battleId: string;
  readonly sectorAddress: SectorAddress;
  readonly winner: 'attacker' | 'defender' | 'draw';
  readonly endReason: MatchEndReason;
  readonly turnsElapsed: number;
  readonly durationSeconds: number;
  readonly attackerDestroyedUnits: readonly DestroyedChassisRecord[];
  readonly defenderDestroyedUnits: readonly DestroyedChassisRecord[];
  readonly permanentSinksCount: number;
  readonly totalScrapRecoveredAttacker: number;
  readonly totalScrapRecoveredDefender: number;
  readonly totalSteelPlatesAttacker: number;
  readonly totalSteelPlatesDefender: number;
  readonly pyrrhicVictoryIndex: number;
  readonly pyrrhicRating: PyrrhicVictoryRating;
  readonly pyrrhicPenaltyPercent: number;
  readonly tcpDelta: number;
  readonly newSectorControlPoints: number;
  readonly isSovereigntyFlipped: boolean;
  readonly cooldownExpiresAtUtc: string | null;
  readonly graceExpiresAtUtc: string | null;
  readonly fuelConsumedTotal: number;
  readonly ammoRoundsExpendedTotal: number;
  readonly siegeHoursIncrement: number;
  readonly settlementTimestampUtc: string;
  readonly settlementDigest: string;
}

export type BarkPriority =
  | 'P0_DEFCON'
  | 'P1_TACTICAL_MILESTONE'
  | 'P2_OPERATIONAL_RESPONSE'
  | 'P3_AMBIENT_IDLE';

export type BarkTriggerContext =
  | 'fuel_starvation'
  | 'hq_under_siege'
  | 'defcon1_handshake'
  | 'loss_high_tier_unit'
  | 'scop_activated'
  | 'allied_reinforcement'
  | 'pyrrhic_victory'
  | 'cop_activated'
  | 'trap_ambush'
  | 'near_miss_clutch'
  | 'first_blood'
  | 'capital_hegemony'
  | 'airdrop_spawned'
  | 'supply_depleted'
  | 'silo_launched'
  | 'idle_war_room';

export interface BarkTriggerStreamEvent {
  readonly eventId: string;
  readonly timestampEpochMs: number;
  readonly sourceCommanderId: string;
  readonly triggerContext: BarkTriggerContext;
  readonly priority: BarkPriority;
  readonly actorTeam: 'p1' | 'p2' | 'neutral';
  readonly payload: {
    readonly playerName: string;
    readonly unitName?: string;
    readonly unitTier?: ChassisTier;
    readonly hpRemaining?: number;
    readonly regionName?: string;
    readonly bondingLevel: number;
    readonly secondsRemaining?: number;
    readonly customMessage?: string;
  };
  readonly routing: {
    readonly isLocalOnly: boolean;
    readonly broadcastToLobby: boolean;
    readonly ttlMs: number;
  };
}

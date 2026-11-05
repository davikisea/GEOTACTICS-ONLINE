/**
 * ==============================================================================
 * CONTRATOS DE TIPOS Y MODELOS DEL METAJUEGO V2 (GLOBAL SOVEREIGNTY)
 * ==============================================================================
 * Especificación Canónica: METAGAME_DESIGN/ + CANON RATIFICADO
 * Pilares: Risk.io + Albion P2P + Victoria 3 Macro-Economy + Advance Wars 1-100 HP
 * ==============================================================================
 */

export type ContinentCode = 'EU' | 'NA' | 'SA' | 'AS' | 'AF' | 'OC' | 'MECA';

export type BiomeType =
  | 'temperate_plains'
  | 'boreal_forest'
  | 'arid_desert'
  | 'arctic_tundra'
  | 'tropical_jungle'
  | 'mountain_highland'
  | 'coastal_archipelago';

export type BaseTerrainType =
  | 'plains'
  | 'mountain'
  | 'desert'
  | 'tundra'
  | 'forest'
  | 'archipelago';

export type WeatherType = 'clear' | 'rain' | 'snow' | 'sandstorm';

export type SecurityZone = 'high_sec' | 'low_sec' | 'null_sec';

export type TerritoryStatus = 'stable' | 'under_siege' | 'disputed' | 'cooldown_priority';

export type GarrisonAIEngineTier = 'easy' | 'normal' | 'hard' | 'chess' | 'mcts_legendary';

export type MetagameItemCategory =
  | 'raw_resource'
  | 'refined_material'
  | 'patent_blueprint'
  | 'buff_consumable'
  | 'unit_chassis'
  | 'cosmetic';

export type AdjacencyConnectionType =
  | 'land_open'
  | 'land_choke'
  | 'river'
  | 'strait'
  | 'sea_lane'
  | 'air_corridor';

export type TerritoryNodeType =
  | 'capital_citadel'
  | 'city'
  | 'factory'
  | 'refinery'
  | 'warehouse'
  | 'comm_tower'
  | 'radar'
  | 'fortress';

// ------------------------------------------------------------------------------
// MODELOS GEOGRÁFICOS Y CARTOGRÁFICOS (SUPABASE SSOT)
// ------------------------------------------------------------------------------

export interface WorldCountry {
  isoCode: string; // ej: 'ES', 'US', 'JP'
  name: string;
  continent: ContinentCode;
  coordinates: { lat: number; lng: number };
  defenseDoctrine: string;
  createdAt?: string;
}

export interface WorldProvince {
  id: string; // ej: 'ES_MADRID'
  countryIso: string;
  name: string;
  isCapital: boolean;
  isCapturable: boolean; // Las capitales son capturables
  baseTerrain: BaseTerrainType;
  nativeWeather: WeatherType;
  resourceMultiplier: number; // Multiplicador de recursos (1.75x - 2.0x en capitales)
  buildingSlots: number; // 4 a 16 parcelas (12-16 en capitales)
  posX: number; // Porcentaje relativo X (0-100)
  posY: number; // Porcentaje relativo Y (0-100)
  width: number;
  height: number;
  createdAt?: string;
}

export interface TerritoryNode {
  id: string; // ej: 'NODE_ES_MAD_CITADEL'
  provinceId: string;
  name: string;
  nodeType: TerritoryNodeType;
  controllerClanId: string | null;
  defenseLevel: 1 | 2 | 3 | 4 | 5;
  energyUpkeep: number; // EC / hora
  structuralHp: number;
  maxHp: number;
  outputPerMin: number;
  isUnderAttack: boolean;
  updatedAt?: string;
}

export interface TerritoryAdjacency {
  id: string;
  fromProvinceId: string;
  toProvinceId: string;
  connectionType: AdjacencyConnectionType;
  isBlocked: boolean;
  maxBandwidthTons: number;
  tollRatePercent: number;
}

export interface WorldRegion {
  id: string; // ej: 'ES_MAD_01'
  countryIso: string;
  provinceId: string;
  name: string;
  biomeType: BiomeType;
  securityZone: SecurityZone;
  isCapital: boolean;
  isCapturable: boolean;
  maxBuildingSlots: number;
  primaryResource: string;
  secondaryResource: string;
}

export interface TerritoryControlState {
  provinceId: string;
  controllingClanId: string | null;
  controllingAllianceId: string | null;
  currentTcp: number;
  tcpThreshold: number;
  status: TerritoryStatus;
  cooldownExpiresAt: string | null;
  lastBattleAt: string | null;
  fortressLevel: number; // 0 to 5
}

// ------------------------------------------------------------------------------
// GOBERNANZA, ALIANZAS Y SUBSIDIARIAS
// ------------------------------------------------------------------------------

export interface CorporateSubsidiary {
  id: string;
  parentCorpId: string;
  subsidiaryClanId: string;
  tributeRatePercent: number; // 5.00 to 25.00 %
  autonomousMarketAllowed: boolean;
  status: 'active' | 'grace_period' | 'seceded';
  graceExpiresAt: string | null;
}

// ------------------------------------------------------------------------------
// LOGÍSTICA, INVENTARIO Y REFUERZOS
// ------------------------------------------------------------------------------

export interface UnitHangarEntry {
  id: string;
  userId: string;
  clanId?: string | null;
  unitCode: string;
  tier: number; // 1 to 5
  level: number; // 1 to 5 (+2% eff per lvl)
  hp: number; // 1 to 100
  quantity: number;
  locationProvinceId?: string | null;
}

export interface PatentRegistryEntry {
  id: string;
  userId: string;
  patentCode: string;
  tier: number; // 1 to 5
  unlockedAt: string;
}

export interface GarrisonDeploymentState {
  id: string;
  regionId: string;
  owningClanId: string;
  garrisonLevel: 1 | 2 | 3 | 4 | 5;
  aiEngineTier: GarrisonAIEngineTier;
  hourlyUpkeepEc: number;
  isLegendary: boolean;
  serviceStartedAt: string;
  retirementDueAt: string | null; // 21 días reales para legendarios
  isUnderAttack: boolean;
  handshakeDeadline: string | null; // 120 segundos (Handshake Defensivo)
}

export interface ReinforcementQueueEntry {
  matchId: string;
  playerId: string;
  requestedAtTurn: number;
  arrivalTurn: number; // requestedAtTurn + 4
  unitsToDeploy: Array<{
    unitCode: string;
    tier: number;
    level: number;
    hp: number; // 1-100
  }>;
  isDelivered: boolean;
}

// ------------------------------------------------------------------------------
// MERCADO P2P
// ------------------------------------------------------------------------------

export interface P2PMarketOrderV2 {
  id: string;
  sellerId: string;
  buyerId?: string | null;
  provinceTerminalId?: string | null;
  itemCategory: MetagameItemCategory;
  itemCode: string;
  tier: number;
  quantity: number;
  unitPriceEc: number;
  totalPriceEc: number;
  platformBurnEc: number;
  provinceRoyaltyEc: number;
  netSellerRevenueEc: number;
  status: 'active' | 'completed' | 'cancelled';
  createdAt: string;
  completedAt?: string | null;
}

// ------------------------------------------------------------------------------
// CONSTANTES MATEMÁTICAS SSOT DE BALANCE CANÓNICO V2.0
// ------------------------------------------------------------------------------
export const MASTER_METAGAME_CONSTANTS = {
  // Geopolítica & Sobre-Expansión
  BASE_PROVINCES_CAP: 6, // N_cap: Provincias óptimas sin penalización
  OVER_EXPANSION_EXPONENT: 2.4, // gamma
  OVER_EXPANSION_COEFFICIENT: 0.35, // alpha
  PROVINCE_BASE_UPKEEP_EC: 120, // EC / h
  CAPITAL_IMMUNITY: false, // Las capitales SON capturables
  CAPITAL_RESOURCE_MULTIPLIER: 2.0, // Multiplicador masivo de producción en capitales
  COOLDOWN_PRIORITY_HOURS: 4, // Escudo post-conquista (240 min)
  TCP_MAX_STABLE: 10000,
  TCP_MAX_FORTRESS: 15000,
  TCP_PASSIVE_DECAY_PER_MIN: 50,

  // Logística y Refuerzos
  REINFORCEMENT_ARRIVAL_TURNS: 4, // 4 rondas completas
  MAX_REINFORCEMENT_CALLS_PER_MATCH: 1, // Exactamente 1 vez
  PYRRHIC_VICTORY_PENALTY: 0.15, // -15% score si se piden refuerzos

  // Balística y Escala de Integridad
  CANONICAL_MAX_HP: 100, // Escala 1-100 HP
  TIER_EFFECTIVENESS_BONUS_PER_LEVEL: 0.02, // +2% por nivel de tropa (hasta +10% en Nv. 5)
  BASE_SALVAGE_RATE: 0.35, // 35% base para lootbox de chatarra
  RECYCLE_SCRAP_RATE: 0.35, // 35% SSOT recuperación de chatarra en desguace y siniestralidad

  // Mercado P2P
  TOTAL_P2P_TAX_RATE: 0.02, // 2% total
  PLATFORM_BURN_RATE: 0.01, // 1% sink deflacionario permanente
  PROVINCE_ROYALTY_RATE: 0.01, // 1% regalía para clan dueño de la terminal
  VWAP_COLLAR_PERCENT: 0.25, // +/- 25% bandas anti-dumping / anti-RMT
  P2P_COLLAR_MAX_DEVIATION: 0.25,
  P2P_MARKET_FEE_RATE: 0.02,
  P2P_FEE_BURN_SHARE: 0.50,

  // Soberanía Dual & Asedio Geopolítico (Project Alice)
  CAPITAL_TCP_THRESHOLD: 15000,
  STANDARD_TCP_THRESHOLD: 10000,
  TCP_LOSS_ATTACKER_VICTORY: 3500,
  OCCUPIED_GRACE_HOURS_MIN: 24,

  // Guarnición IA
  HANDSHAKE_TIMEOUT_SECONDS: 120, // Ventana de 120s para drop-in humano
  LEGENDARY_SERVICE_DAYS: 21, // 21 días reales (504 horas) antes de retiro
  MAX_CLANS_PER_ALLIANCE: 10, // Máximo estricto de 10 clanes por corporación
} as const;

export const TOPOLOGY_FLAGS = {
  LAND_OPEN: 0x01,
  NATIONAL_BORDER: 0x02,
  COASTAL: 0x04,
  IMPASSIBLE: 0x08,
  STRAIT_CHOKE: 0x10,
  RIVER_CROSSING: 0x20,
} as const;

// ------------------------------------------------------------------------------
// MODELOS CANÓNICOS DE GEOTACTICS: ONLINE (ALICE TOPOLOGY & SOBERANÍA DUAL)
// ------------------------------------------------------------------------------

export type CanonicalBiome =
  | 'BIO-PLA'
  | 'BIO-HGH'
  | 'BIO-URB'
  | 'BIO-ARC-ISL'
  | 'BIO-JGL';

export interface GeotacticsRegion {
  id: string; // ej: 'REG_VE_01'
  countryIso: string;
  name: string;
  biome: CanonicalBiome;
  isPlayable: boolean;
  isNationalCapital: boolean;
  isCapturable: boolean;
  centerX: number;
  centerY: number;
  primaryCommodity: string;
  resourceTier: 1 | 2 | 3 | 4 | 5;
  baseHourlyYield: number;
  baseEnergyUpkeepEc: number;
  maxBuildingSlots: number;
  createdAt?: string;
}

export interface GeotacticsRegionAdjacency {
  id: string;
  fromRegionId: string;
  toRegionId: string;
  topologyFlags: number; // 0x01 land_open, 0x02 national_border, 0x04 coastal, 0x08 impassible, 0x10 strait_choke, 0x20 river_crossing
  chokeControllingRegionId?: string | null;
  distanceKm: number;
  transitRounds: number;
  tollFeePercent: number;
  createdAt?: string;
}

export interface GeotacticsRegionSovereignty {
  regionId: string;
  ownerClanId: string | null;      // De Jure Owner
  controllerClanId: string | null; // De Facto Controller
  controlPoints: number;           // 0..15000 TCP
  maxControlPoints: number;        // 10000 o 15000
  bunkerLevel: 1 | 2 | 3 | 4 | 5;
  status: 'stable' | 'under_siege' | 'occupied_grace';
  customsEscrowLocked: boolean;
  isEnergyStarved: boolean;
  activeBattleId?: string | null;
  cooldownExpiresAt?: string | null;
  graceExpiresAt?: string | null;
  lastTickAt: string;
  updatedAt: string;
}

export interface TerritorialBattleSession {
  id: string;
  regionId: string;
  attackerClanId: string;
  defenderClanId?: string | null;
  attackerCommanderId: string;
  defenderCommanderId?: string | null;
  mode: 'pve_garrison' | 'pvp_realtime';
  handshakeExpiresAt: string;
  status: 'handshake_pending' | 'in_combat' | 'concluded' | 'aborted';
  createdAt: string;
  concludedAt?: string | null;
}

/**
 * Calcula la recuperación de chatarra tecnológica (35% SSOT) por pérdida de un chasis destruido.
 */
export function calculateLossScrapRecovery(tier: number, quantity: number = 1): number {
  const baseValue = tier * 50 * Math.max(0, quantity);
  return Math.floor(baseValue * MASTER_METAGAME_CONSTANTS.RECYCLE_SCRAP_RATE);
}

/**
 * Calcula el factor multiplicador de sobre-expansión imperial (Victoria 3 Macro-Economy).
 */
export function calculateOverExpansionFactor(provincesCount: number): number {
  const cap = MASTER_METAGAME_CONSTANTS.BASE_PROVINCES_CAP;
  if (provincesCount <= cap) return 0.0;
  const ratio = (provincesCount - cap) / cap;
  return (
    MASTER_METAGAME_CONSTANTS.OVER_EXPANSION_COEFFICIENT *
    Math.pow(ratio, MASTER_METAGAME_CONSTANTS.OVER_EXPANSION_EXPONENT)
  );
}

/**
 * Calcula la liquidación exacta del split del 2% en una transacción P2P.
 */
export function calculateP2PTransactionSplit(totalPriceEc: number): {
  taxTotal: number;
  platformBurn: number;
  provinceRoyalty: number;
  netSellerPayout: number;
} {
  const taxTotal = Math.floor(totalPriceEc * MASTER_METAGAME_CONSTANTS.TOTAL_P2P_TAX_RATE);
  const platformBurn = Math.floor(totalPriceEc * MASTER_METAGAME_CONSTANTS.PLATFORM_BURN_RATE);
  const provinceRoyalty = taxTotal - platformBurn;
  const netSellerPayout = totalPriceEc - taxTotal;

  return {
    taxTotal,
    platformBurn,
    provinceRoyalty,
    netSellerPayout,
  };
}

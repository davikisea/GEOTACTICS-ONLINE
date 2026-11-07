// ==============================================================================
// PUBLIC API: DOMINIO WORLD
// Cartografía MapLibre, Carreteras, Logística, Asedios Territoriales y Clanes
// ==============================================================================

// Core Motors & Algorithms
export {
  WorldMapEngine,
  validateSupplyLineConnectivity,
  type AdjacencyEdge,
} from './core/worldMapEngine';
export {
  ZOOM_GLOBAL,
  ZOOM_OPERACIONAL,
  ZOOM_TACTICO,
  TILE_SIZE,
  EARTH_RADIUS_M,
  lngLatToGridCoords,
  tileFractionToLngLat,
  gridCoordsToLngLat,
  getTileBounds,
  traceSupplyLine,
  type LngLat,
  type QuadLngLatBounds,
  type TacticalGridCoords,
} from './core/coordinates';
export {
  SpatialRoadIndex,
  getCellKey,
  calculateAnalyticalDistanceKm,
  type NearestNodeResult,
  type RoadAdjacencyResult,
  type SpatialBoundingBox,
} from './core/spatialRoadIndex';
export { roadNetworkEngine, RoadNetworkEngine } from './core/roadNetworkEngine';
export { roadGarrisonEngine, RoadGarrisonEngine } from './core/roadGarrisonEngine';
export {
  TerritorialSiegeOrchestrator,
  type VulnerabilityWindowConfig,
  type InitiateSiegeParams,
  type SiegeResolutionResult,
} from './core/territorialSiegeOrchestrator';
export const HUMAN_HANDSHAKE_WINDOW_MS = 120_000;
export {
  initializeRegionGrid,
  recalculateSovereignty,
  executeTerritorialExpansion,
  calculateIndustrialYieldWithNodes,
  type ExpansionOrder,
  type ExpansionResult,
  type RegionGridMap,
} from './core/territorialExpansionEngine';
export {
  politicalAliceEngine,
  PoliticalAliceEngine,
  THREE_LAYER_ARCHITECTURE,
  VENEZUELA_FACTION_REGISTRY,
  POLITICAL_EDICTS_CATALOG,
  CANONICAL_VENEZUELA_REGIONS,
  CANONICAL_VENEZUELA_ADJACENCIES,
} from './core/politicalAliceEngine';
export {
  TacticalBitMap,
} from './core/tacticalBitmap';
export {
  ClanEngine,
  CLAN_VAULT_TIERS,
  CANONICAL_TERRITORY_SECTORS,
  CLAN_PROJECTS,
  type Clan,
  type ClanMember,
  type ClanRole,
  type VaultTier,
  type UserProfileIdentity,
  type SafeguardInventory,
  type TerritorySector,
} from './core/clanSystem';

// Services
export { stateSovereigntyService } from './services/stateSovereigntyService';
export { spatialDeploymentService } from './services/spatialDeploymentService';

// Hooks
export { useTerritoryMap } from './hooks/useTerritoryMap';
export { useSiegeRealtime } from './hooks/useSiegeRealtime';

// Types
export type {
  StateSovereigntyRecord,
  UserRoleContext,
  SovereignStateUpdateInput,
  ProvincialStrataState,
  SecessionEvaluationResult,
} from './types/stateSovereigntyTypes';
export * from './types/tacticalRoadTypes';

// Components
export {
  TacticalWorldMap,
  TacticalWorldMap as WorldMapCanvas,
  type TacticalWorldMapProps,
} from './components/TacticalWorldMap';
export { MapLoadingScreen } from './components/MapLoadingScreen';
export { WarLobbyHub } from './components/WarLobbyHub';
export { WarRoomModal } from './components/WarRoomModal';
export { ClanHeadquartersView } from './components/ClanHeadquartersView';
export { MetaCommandConsole } from './components/MetaCommandConsole';
export { GarrisonManagementDrawer } from './components/GarrisonManagementDrawer';
export { TerritorySiegeModal } from './components/TerritorySiegeModal';
export { TerritoryInspectorModal } from './components/TerritoryInspectorModal';
export { StateInspectorDrawer } from './components/StateInspectorDrawer';
export { StateSovereignDeckModal } from './components/StateSovereignDeckModal';
export { DualResourceHeader } from './components/DualResourceHeader';
export { CommandHUD } from './components/CommandHUD';
export { FactionBanner } from './components/FactionBanner';
export { ParadoxCommandDrawer } from './components/ParadoxCommandDrawer';
export { TacticalC4ISRBaseDiorama } from './components/TacticalC4ISRBaseDiorama';
export { TacticalDock, type LobbyStationView } from './components/TacticalDock';
export { TacticalMapControls } from './components/TacticalMapControls';

// ==============================================================================
// PUBLIC API: DOMINIO TACTICS
// Motor Balístico 1-100 HP, Cuadrícula Táctica, Superpoderes CO, IA Guarnición
// ==============================================================================

// Core Motors
export {
  CanonicalCombatEngine,
  type CanonicalCombatOptions,
} from './core/canonicalCombat';
export {
  CombatEngine,
} from './core/combat';
export {
  COEngine,
  CANONICAL_CO_REGISTRY,
  ALL_CANONICAL_CO_IDS,
  CO_FACTION_META,
  resolveCanonicalCOId,
  STAR_CHARGE_VALUE,
  type COId,
  type COPowerType,
  type PlayerCOState,
  type CODefinition,
  getCOFullBodyUrl,
} from './core/coSystem';
export {
  GarrisonAIEngine,
  type GarrisonLevelSpec,
  type GarrisonInvestmentRebalance,
} from './core/garrisonAIEngine';
export {
  CANONICAL_DAMAGE_CHART,
  COMBAT_EFFECTIVENESS_MATRIX,
  getCanonicalBaseDamage,
  normalizeUnitCode,
  isIndirectFireUnit,
  canDirectlyAttack,
} from './core/canonicalDamageChart';
export {
  CANONICAL_TERRAIN_PROPERTIES,
  getCanonicalMovementCost,
  getCanonicalDefenseStars,
} from './core/canonicalMovement';
export {
  getWeatherModifiers,
  getEffectiveWeatherForCO,
  rollTurnWeather,
  type WeatherState,
  type WeatherModifiers,
} from './core/weatherSystem';
export {
  TacticalPathfindingEngine,
  TERRAIN_MOVEMENT_COSTS,
} from './core/pathfinding';
export {
  calculatePathArrow,
  getArrowSegmentCode,
  updateDynamicPath,
  areNeighbors,
} from './core/pathingArrow';
export {
  calculateSingleUnitThreat,
  calculateCombinedEnemyThreatMap,
} from './core/threatRange';
export {
  executeHqCaptureElimination,
  type HqCaptureResult,
} from './core/hqCaptureVictory';
export {
  getUnitTurnFuelConsumption,
  processTurnFuelConsumption,
} from './core/fuelLogistics';
export {
  executeBlackBombExplosion,
  getBlackBombBlastZone,
  MultiUnitTransportManager,
} from './core/specialAbilities';
export {
  launchMissile,
  isUnusedSilo,
  getExplosionTiles,
  type MissileLaunchParams,
  type MissileLaunchResult,
  type AffectedUnitResult,
} from './core/missileSilo';
export {
  TacticalRtsEngine,
  CANONICAL_RTS_PROFILES,
  type TacticalRtsUnitState,
  type BallisticTracer,
} from './core/tacticalRtsEngine';
export {
  OperationalUnitsEngine,
  operationalUnitsEngine,
  type OperationalDeployedUnit,
} from './core/operationalUnitsEngine';
export {
  TacticalBotAI,
  type BotDifficulty,
  type BotGameState,
} from './core/aiBot';
export {
  AutonomousTurnOrchestrator,
  MATCH_FORMAT_CONFIGS,
  type MatchFormat,
  type GameMode,
  type MatchEndSummary,
} from './core/autonomousOrchestrator';
export {
  evaluateAvailableSubActions,
  isFootSoldier,
  isTransportUnit,
  canUnitBoardTransport,
  type AvailableSubAction,
  type ActionType,
} from './core/subActions';
export {
  calculateBuildingAuras,
  resolveCombatAuras,
  getHostileCityFriction,
  type BuildingAuraProfile,
} from './core/buildingAuras';
export {
  RankedLadderEngine,
  RANKED_ARENAS,
  type RankedArena,
} from './core/rankedLadderEngine';
export {
  resolveSemanticLOD,
  validateDoubleKeyDeployment,
  settleCombatLossesAndScrap,
  evaluateDefensiveHandshake,
  type DestroyedUnitRecord,
} from './core/tacticalCombatSeamlessIntegration';
export {
  PREDEFINED_MAPS_META,
  getPredefinedMap,
  getAllPredefinedMapsMeta,
  type PredefinedMapMeta,
} from './core/predefinedMaps';
export {
  generateProceduralMap,
  renderMapAscii,
  checkBFSReachability,
  Mulberry32,
  type ProceduralMapConfig,
} from './core/proceduralMapGenerator';
export {
  FogOfWarEngine,
  CANONICAL_UNIT_BASE_VISION,
  type FogOfWarState,
  type TrapCheckResult,
} from './core/fogOfWar';
export {
  CaptureEngine,
} from './core/captureSystem';
export {
  parseAWBWMap,
  parseAWBWExtendedMap,
  AWBW_EXTENDED_TILE_MAP,
  type AWBWMapData,
} from './core/mapImporter';
export {
  TacticalReinforcementEngine,
  type ReinforcementState,
  type ReinforcementRequestPayload,
} from './core/reinforcementEngine';
export {
  initializeReinforcementsEngine,
  createInitialReserveStock,
  requestReinforcements,
  processTurnArrival,
  consumeVanguardDeployment,
  type ReinforcementsEngineState,
  type PlayerReserveStock,
  CANONICAL_RESERVE_CATALOG,
} from './core/reinforcementsEngine';

export {
  type CampaignMission,
  CAMPAIGN_ACT_I_MISSIONS,
} from './core/campaignEngine';

// Services & Hooks
export {
  operationalUnitsService,
  type DeployedOperationalUnit,
} from './services/operationalUnitsService';
export {
  useMatchSync,
} from './hooks/useMatchSync';

// Components
export { COCommandBar } from './components/COCommandBar';
export { PreBattleDeploymentModal, type DeploymentConfig } from './components/PreBattleDeploymentModal';
export { TacticalUnitDeployModal } from './components/TacticalUnitDeployModal';
export { MicroTacticalDeckHUD } from './components/MicroTacticalDeckHUD';
export { TacticalStudioEditor } from './components/TacticalStudioEditor';
export { GameCanvas, type AmbushAlert } from './components/GameCanvas';
export { ProductionModal } from './components/ProductionModal';
export { ComicVignetteOverlay } from './components/ComicVignetteOverlay';
export { CombatTheaterView } from './components/CombatTheaterView';
export { ReinforcementRequestModal } from './components/ReinforcementRequestModal';
export { GeotacticsLoadingScreen } from './components/GeotacticsLoadingScreen';

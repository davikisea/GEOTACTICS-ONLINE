import React, { useState, useMemo } from 'react';
import {
  Shield,
  Database,
  Cpu,
  Radio,
  Coins,
  Calendar,
  Copy,
  Check,
  Search,
  Crosshair,
  Award,
  Layers,
  Sparkles,
  Download,
  Flame,
  ArrowRight,
  ArrowLeft,
  Sword,
  SlidersHorizontal,
  Maximize2,
  Trophy,
  ShoppingBag,
  Palette,
  BookOpen,
  Activity,
  Map as MapIcon,
  UploadCloud,
  RotateCcw,
  CloudFog,
  Eye,
  EyeOff,
  AlertTriangle,
  Coins as CoinsIcon,
  Flag,
  Wrench,
  Factory,
  Bot,
  User,
  Timer,
  Scale
} from 'lucide-react';
import { GAME_DOCUMENTS, DocItem } from './docsData';
import { GameCanvas, AmbushAlert } from './components/game/GameCanvas';
import { TacticalUnit, TerrainTile } from './types';
import { CosmeticSkin } from './lib/shopData';
import { assetLoader } from './engine/assetLoader';
import { audioManager } from './engine/audioManager';
import { triggerHaptic } from './engine/hapticFeedback';
import { CombatEngine } from './engine/combat';
import { getPredefinedMap, getAllPredefinedMapsMeta, PredefinedMapMeta } from './engine/predefinedMaps';
import { parseAWBWMap, AWBWMapData } from './engine/mapImporter';
import { FogOfWarEngine } from './engine/fogOfWar';
import { TurnEconomyEngine, CANONICAL_UNIT_PRODUCTION_CATALOG } from './engine/turnEconomy';
import { CaptureEngine } from './engine/captureSystem';
import { ProductionModal } from './components/game/ProductionModal';
import { COEngine, COId, COPowerType, PlayerCOState, CANONICAL_CO_REGISTRY } from './engine/coSystem';
import { COCommandBar } from './components/game/COCommandBar';
import { CanonicalCombatEngine } from './engine/canonicalCombat';
import { TacticalBotAI, BotDifficulty, BotGameState } from './engine/aiBot';
import { AvailableSubAction, evaluateAvailableSubActions } from './engine/subActions';
import { MATCH_FORMAT_CONFIGS, MatchFormat } from './engine/autonomousOrchestrator';
import { PREDEFINED_DECKS, DeckManager } from './engine/deckManager';
import { ComicVignetteOverlay } from './components/game/ComicVignetteOverlay';
import { barkEngine } from './engine/barkEngine';
import { AirDrop, AirDropEngine } from './engine/airdropSystem';
import { IndustrialInventory, ActiveRefiningJob } from './engine/industrialEngine';
import { Clan, ClanMember, SafeguardInventory, ClanEngine, UserProfileIdentity } from './engine/clanSystem';
import { AsymmetricLadderEngine, NearMissReport, TiltEmergencyOffer } from './engine/asymmetricLadderEngine';
import { WarLobbyHub } from './components/lobby/WarLobbyHub';
import { CombatTheaterView } from './components/game/CombatTheaterView';

// Lazy loading de módulos pesados para optimización de bundle inicial en Vercel
const ShopCatalog = React.lazy(() => import('./components/shop/ShopCatalog').then(m => ({ default: m.ShopCatalog })));
const LoadoutCustomizer = React.lazy(() => import('./components/armory/LoadoutCustomizer').then(m => ({ default: m.LoadoutCustomizer })));
const MatchSummaryModal = React.lazy(() => import('./components/ui/MatchSummaryModal').then(m => ({ default: m.MatchSummaryModal })));
const MapLoadingScreen = React.lazy(() => import('./components/game/MapLoadingScreen').then(m => ({ default: m.MapLoadingScreen })));
const QADevOpsRunner = React.lazy(() => import('./components/qa/QADevOpsRunner').then(m => ({ default: m.QADevOpsRunner })));
const TacticalStudioEditor = React.lazy(() => import('./editor/TacticalStudioEditor').then(m => ({ default: m.TacticalStudioEditor })));
const IndustrialComplexView = React.lazy(() => import('./components/industry/IndustrialComplexView').then(m => ({ default: m.IndustrialComplexView })));
const P2PMarketplaceView = React.lazy(() => import('./components/industry/P2PMarketplaceView').then(m => ({ default: m.P2PMarketplaceView })));
const ClanHeadquartersView = React.lazy(() => import('./components/clans/ClanHeadquartersView').then(m => ({ default: m.ClanHeadquartersView })));
const NearMissAnalysisModal = React.lazy(() => import('./components/battle/NearMissAnalysisModal').then(m => ({ default: m.NearMissAnalysisModal })));
const TiltEmergencyOfferModal = React.lazy(() => import('./components/shop/TiltEmergencyOfferModal').then(m => ({ default: m.TiltEmergencyOfferModal })));
const CommanderProfileModal = React.lazy(() => import('./components/profile/CommanderProfileModal').then(m => ({ default: m.CommanderProfileModal })));

export function TacticalLoadingFallback() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-12 text-[#F2E8D5] font-mono bg-[#181914]">
      <div className="relative w-14 h-14 flex items-center justify-center mb-3">
        <div className="absolute inset-0 rounded-[14px_4px_14px_4px] border-2 border-[#7B8A4A]/40 animate-ping"></div>
        <div className="w-10 h-10 rounded-[10px_2px_10px_2px] border-2 border-[#C46A3A] border-t-transparent animate-spin"></div>
        <span className="text-xs">📡</span>
      </div>
      <span className="text-xs text-[#F2E8D5] font-black uppercase tracking-widest">
        Estableciendo Enlace Táctico con el Estado Mayor...
      </span>
      <span className="text-[10px] text-[#7B8A4A] mt-1 font-bold">
        Sincronizando Frecuencia Militar Encriptada • Cero Latencia
      </span>
    </div>
  );
}

// --- Tipos de Terreno para el Simulador Interactivo ---
type TerrainType = 'plains' | 'forest' | 'mountain' | 'road' | 'city' | 'hq';

interface SimTile {
  x: number;
  y: number;
  type: TerrainType;
  stars: number;
  owner?: 'p1' | 'p2' | null;
}

interface SimUnit {
  id: string;
  name: string;
  code: string;
  owner: 'p1' | 'p2';
  x: number;
  y: number;
  hp: number;
  movePoints: number;
  moveType: 'foot' | 'mech' | 'wheels' | 'treads';
  minRange: number;
  maxRange: number;
  baseAtk: number;
  hasMoved?: boolean;
  hasActed?: boolean;
}

const INITIAL_GRID: SimTile[][] = [
  [
    { x: 0, y: 0, type: 'hq', stars: 4, owner: 'p1' },
    { x: 1, y: 0, type: 'city', stars: 3, owner: 'p1' },
    { x: 2, y: 0, type: 'road', stars: 0 },
    { x: 3, y: 0, type: 'forest', stars: 2 },
    { x: 4, y: 0, type: 'plains', stars: 1 },
    { x: 5, y: 0, type: 'plains', stars: 1 },
    { x: 6, y: 0, type: 'city', stars: 3, owner: null },
    { x: 7, y: 0, type: 'forest', stars: 2 },
  ],
  [
    { x: 0, y: 1, type: 'road', stars: 0 },
    { x: 1, y: 1, type: 'road', stars: 0 },
    { x: 2, y: 1, type: 'road', stars: 0 },
    { x: 3, y: 1, type: 'mountain', stars: 4 },
    { x: 4, y: 1, type: 'forest', stars: 2 },
    { x: 5, y: 1, type: 'plains', stars: 1 },
    { x: 6, y: 1, type: 'road', stars: 0 },
    { x: 7, y: 1, type: 'city', stars: 3, owner: 'p2' },
  ],
  [
    { x: 0, y: 2, type: 'plains', stars: 1 },
    { x: 1, y: 2, type: 'mountain', stars: 4 },
    { x: 2, y: 2, type: 'forest', stars: 2 },
    { x: 3, y: 2, type: 'mountain', stars: 4 },
    { x: 4, y: 2, type: 'plains', stars: 1 },
    { x: 5, y: 2, type: 'forest', stars: 2 },
    { x: 6, y: 2, type: 'road', stars: 0 },
    { x: 7, y: 2, type: 'hq', stars: 4, owner: 'p2' },
  ],
  [
    { x: 0, y: 3, type: 'forest', stars: 2 },
    { x: 1, y: 3, type: 'plains', stars: 1 },
    { x: 2, y: 3, type: 'road', stars: 0 },
    { x: 3, y: 3, type: 'road', stars: 0 },
    { x: 4, y: 3, type: 'road', stars: 0 },
    { x: 5, y: 3, type: 'plains', stars: 1 },
    { x: 6, y: 3, type: 'plains', stars: 1 },
    { x: 7, y: 3, type: 'mountain', stars: 4 },
  ],
  [
    { x: 0, y: 4, type: 'city', stars: 3, owner: 'p1' },
    { x: 1, y: 4, type: 'forest', stars: 2 },
    { x: 2, y: 4, type: 'plains', stars: 1 },
    { x: 3, y: 4, type: 'mountain', stars: 4 },
    { x: 4, y: 4, type: 'plains', stars: 1 },
    { x: 5, y: 4, type: 'road', stars: 0 },
    { x: 6, y: 4, type: 'forest', stars: 2 },
    { x: 7, y: 4, type: 'city', stars: 3, owner: 'p2' },
  ],
  [
    { x: 0, y: 5, type: 'plains', stars: 1 },
    { x: 1, y: 5, type: 'road', stars: 0 },
    { x: 2, y: 5, type: 'road', stars: 0 },
    { x: 3, y: 5, type: 'plains', stars: 1 },
    { x: 4, y: 5, type: 'forest', stars: 2 },
    { x: 5, y: 5, type: 'mountain', stars: 4 },
    { x: 6, y: 5, type: 'plains', stars: 1 },
    { x: 7, y: 5, type: 'plains', stars: 1 },
  ],
  [
    { x: 0, y: 6, type: 'forest', stars: 2 },
    { x: 1, y: 6, type: 'plains', stars: 1 },
    { x: 2, y: 6, type: 'mountain', stars: 4 },
    { x: 3, y: 6, type: 'forest', stars: 2 },
    { x: 4, y: 6, type: 'city', stars: 3, owner: null },
    { x: 5, y: 6, type: 'plains', stars: 1 },
    { x: 6, y: 6, type: 'road', stars: 0 },
    { x: 7, y: 6, type: 'road', stars: 0 },
  ],
  [
    { x: 0, y: 7, type: 'plains', stars: 1 },
    { x: 1, y: 7, type: 'city', stars: 3, owner: 'p1' },
    { x: 2, y: 7, type: 'plains', stars: 1 },
    { x: 3, y: 7, type: 'plains', stars: 1 },
    { x: 4, y: 7, type: 'road', stars: 0 },
    { x: 5, y: 7, type: 'forest', stars: 2 },
    { x: 6, y: 7, type: 'plains', stars: 1 },
    { x: 7, y: 7, type: 'city', stars: 3, owner: 'p2' },
  ],
];

const INITIAL_UNITS: SimUnit[] = [
  { id: 'u1', name: 'Infantería Aliada', code: 'infantry', owner: 'p1', x: 1, y: 0, hp: 10, movePoints: 3, moveType: 'foot', minRange: 1, maxRange: 1, baseAtk: 55 },
  { id: 'u2', name: 'Tanque Ligero Aliado', code: 'tank_light', owner: 'p1', x: 2, y: 1, hp: 10, movePoints: 6, moveType: 'treads', minRange: 1, maxRange: 1, baseAtk: 75 },
  { id: 'u3', name: 'Artillería de Asedio', code: 'artillery', owner: 'p1', x: 0, y: 2, hp: 8, movePoints: 5, moveType: 'treads', minRange: 2, maxRange: 3, baseAtk: 80 },
  { id: 'e1', name: 'Infantería Hostil', code: 'infantry', owner: 'p2', x: 6, y: 0, hp: 10, movePoints: 3, moveType: 'foot', minRange: 1, maxRange: 1, baseAtk: 55 },
  { id: 'e2', name: 'Tanque Ligero Hostil', code: 'tank_light', owner: 'p2', x: 6, y: 1, hp: 9, movePoints: 6, moveType: 'treads', minRange: 1, maxRange: 1, baseAtk: 75 },
];

export default function App() {
  const [activeTab, setActiveTab] = useState<string>('01_gdd');
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Estados de Mapas & Importador Comunitario AWBW
  const predefinedMapsMeta = useMemo(() => getAllPredefinedMapsMeta(), []);
  const [selectedMapId, setSelectedMapId] = useState<string>('caustic_finale');
  const [customMaps, setCustomMaps] = useState<AWBWMapData[]>([]);
  const [isImportModalOpen, setIsImportModalOpen] = useState<boolean>(false);
  const [importMapName, setImportMapName] = useState<string>('');
  const [importRawTiles, setImportRawTiles] = useState<string>('');
  const [importError, setImportError] = useState<string | null>(null);

  const activeMap: AWBWMapData = useMemo(() => {
    const custom = customMaps.find(m => m.id === selectedMapId);
    if (custom) return custom;
    return getPredefinedMap(selectedMapId);
  }, [selectedMapId, customMaps]);

  // Estados del Simulador Táctico Interactivo
  const [units, setUnits] = useState<SimUnit[]>(() => {
    const initialMap = getPredefinedMap('caustic_finale');
    return initialMap.startingUnits.map(u => ({
      id: u.id,
      name: u.displayName,
      code: u.unitCode,
      owner: u.ownerId as 'p1' | 'p2',
      x: u.x,
      y: u.y,
      hp: u.hp,
      movePoints: u.movementPoints,
      moveType: u.movementType as any,
      minRange: u.minRange,
      maxRange: u.maxRange,
      baseAtk: u.baseAttack,
      hasMoved: false,
      hasActed: false,
    }));
  });
  const [selectedUnitId, setSelectedUnitId] = useState<string>('p1_inf_hq');
  const [targetEnemyId, setTargetEnemyId] = useState<string>('p2_inf_hq');
  const [turn, setTurn] = useState<'p1' | 'p2'>('p1');

  // Estados de Tablero Mutable, Economía y Producción
  const [matchTiles, setMatchTiles] = useState<TerrainTile[][]>(() =>
    activeMap.tiles.map(row => row.map(t => ({ ...t })))
  );
  const [playerFunds, setPlayerFunds] = useState<Record<'p1' | 'p2', number>>({ p1: 6000, p2: 6000 });
  const [turnNumber, setTurnNumber] = useState<number>(1);
  const [isProductionModalOpen, setIsProductionModalOpen] = useState<boolean>(false);
  const [selectedFactoryCoord, setSelectedFactoryCoord] = useState<GridPosition | null>(null);

  // Estados de Comandantes (COs), Medidores de Energía y Superpoderes
  const [playerCOs, setPlayerCOs] = useState<Record<'p1' | 'p2', PlayerCOState>>({
    p1: { coId: 'andy', powerMeter: 27000, activePower: null }, // 3 estrellas cargadas para probar COP
    p2: { coId: 'colin', powerMeter: 18000, activePower: null },
  });
  const [coInspectorView, setCoInspectorView] = useState<'p1' | 'p2'>('p1');

  // Estados del Modo de Juego, Formato y Motor de Inteligencia Artificial (Sprint 2)
  const [gameMode, setGameMode] = useState<'vs_bot' | 'hotseat_2p'>('vs_bot');
  const [botDifficulty, setBotDifficulty] = useState<BotDifficulty>('normal');
  const [matchFormat, setMatchFormat] = useState<MatchFormat>('blitz_skirmish');
  const [isBotThinking, setIsBotThinking] = useState<boolean>(false);
  const [botActionLog, setBotActionLog] = useState<string | null>(null);

  // Control de Ciclo de Vida y Cancelación del Bot de IA (Fase 1 / Tarea 1.3)
  const botTurnSessionIdRef = React.useRef<number>(0);
  const botAbortControllerRef = React.useRef<AbortController | null>(null);

  const cancelBotExecution = React.useCallback(() => {
    if (botAbortControllerRef.current) {
      botAbortControllerRef.current.abort();
      botAbortControllerRef.current = null;
    }
    botTurnSessionIdRef.current += 1;
    setIsBotThinking(false);
    setBotActionLog(null);
  }, []);

  const handleSetGameMode = React.useCallback((mode: 'vs_bot' | 'hotseat_2p') => {
    if (mode === 'hotseat_2p') {
      cancelBotExecution();
    }
    setGameMode(mode);
  }, [cancelBotExecution]);

  // Estados de AirDrops Tácticos Canónicos y Temporizador Retro-Futurista en Vivo
  const [airDrops, setAirDrops] = useState<AirDrop[]>([]);
  const [turnTimeRemaining, setTurnTimeRemaining] = useState<number>(() => MATCH_FORMAT_CONFIGS.blitz_skirmish.turnTimeLimitSec);

  // Estados del Mazo de 10 Cartas y Logística Militar (Sprint 3 - Opción 2: Libertad Orgánica)
  const [activeDeckKey, setActiveDeckKey] = useState<string>('balanced');
  const [activeDeck, setActiveDeck] = useState<string[]>(PREDEFINED_DECKS.balanced.cards);

  // Función canónica para reiniciar o reemparejar el escenario de combate
  const resetMatchState = React.useCallback((format?: MatchFormat) => {
    cancelBotExecution();
    const fmt = format || matchFormat;
    const formatConfig = MATCH_FORMAT_CONFIGS[fmt];
    const initialFunds = 6000 + (formatConfig.initialFundsBonus || 0);

    setMatchTiles(activeMap.tiles.map(row => row.map(t => ({ ...t }))));
    setPlayerFunds({ p1: initialFunds, p2: initialFunds });
    setTurn('p1');
    setTurnNumber(1);
    setAmbushAlert(null);
    setAirDrops([]);
    setIsProductionModalOpen(false);
    setSelectedFactoryCoord(null);
    setPlayerCOs({
      p1: { coId: 'andy', powerMeter: 27000, activePower: null },
      p2: { coId: 'colin', powerMeter: 18000, activePower: null },
    });
    setTurnTimeRemaining(formatConfig.turnTimeLimitSec);

    const newUnits: SimUnit[] = activeMap.startingUnits.map(u => ({
      id: u.id,
      name: u.displayName,
      code: u.unitCode,
      owner: u.ownerId as 'p1' | 'p2',
      x: u.x,
      y: u.y,
      hp: u.hp,
      movePoints: u.movementPoints,
      moveType: u.movementType as any,
      minRange: u.minRange,
      maxRange: u.maxRange,
      baseAtk: u.baseAttack,
      hasMoved: false,
      hasActed: false,
    }));
    setUnits(newUnits);
    const p1 = newUnits.find(u => u.owner === 'p1');
    const p2 = newUnits.find(u => u.owner === 'p2');
    if (p1) setSelectedUnitId(p1.id);
    if (p2) setTargetEnemyId(p2.id);
  }, [activeMap, matchFormat]);

  // Sincronizar unidades y losetas mutables al conmutar de mapa
  React.useEffect(() => {
    resetMatchState();
  }, [activeMap, resetMatchState]);

  // Preview en vivo del mapa pegado en el modal de importación
  const importPreview = useMemo(() => {
    if (!importRawTiles.trim()) return null;
    try {
      const parsed = parseAWBWMap(importRawTiles, {
        name: importMapName.trim() || 'Nuevo Escenario AWBW',
      });
      return {
        valid: true,
        width: parsed.width,
        height: parsed.height,
        p1Props: parsed.propertyStats.p1Properties,
        p2Props: parsed.propertyStats.p2Properties,
        neutralProps: parsed.propertyStats.neutralProperties,
        commTowers: parsed.propertyStats.commTowers,
        factories: parsed.propertyStats.factories,
        data: parsed,
      };
    } catch (err: any) {
      return {
        valid: false,
        error: err?.message || 'Formato de losetas inválido',
      };
    }
  }, [importRawTiles, importMapName]);

  // Estados de Niebla de Guerra (Fog of War) y Emboscadas
  const [isFogOfWarEnabled, setIsFogOfWarEnabled] = useState<boolean>(true);
  const [viewerPerspective, setViewerPerspective] = useState<'p1' | 'p2' | 'spectator'>('p1');
  const [ambushAlert, setAmbushAlert] = useState<AmbushAlert | null>(null);
  const [fowWeather, setFowWeather] = useState<'clear' | 'rain'>('clear');
  const [sonjaSensorActive, setSonjaSensorActive] = useState<boolean>(false);

  // Estados de la Calculadora de XP y Progresión
  const [simLevel, setSimLevel] = useState<number>(5);
  const [matchCities, setMatchCities] = useState<number>(3);
  const [matchKills, setMatchKills] = useState<number>(4);
  const [matchTurns, setMatchTurns] = useState<number>(14);
  const [isVictory, setIsVictory] = useState<boolean>(true);
  const [viewMode, setViewMode] = useState<'canvas' | 'grid'>('canvas');
  const [showLoadingRadar, setShowLoadingRadar] = useState<boolean>(false);
  const [lazyStatus, setLazyStatus] = useState<string | null>(null);
  const [isSummaryModalOpen, setIsSummaryModalOpen] = useState<boolean>(false);
  const [isDevStudioOpen, setIsDevStudioOpen] = useState<boolean>(false);

  // Modo de Navegación Principal Diegético (Lobby Bélico, Despliegue de Combate y Módulos Logísticos)
  const [mainNav, setMainNav] = useState<'lobby' | 'combat' | 'docs' | 'shop' | 'armory' | 'industry' | 'marketplace' | 'clans' | 'qa'>('lobby');
  const [isTacticalDrawerOpen, setIsTacticalDrawerOpen] = useState<boolean>(false);

  // Despliegue de Combate Inmersivo desde el Lobby Bélico (1 Clic)
  const handleStartMatchFromLobby = (format: 'mirror_duel' | 'blitz_skirmish' | 'campaign') => {
    const canonicalFormat: MatchFormat = format === 'campaign' ? 'grand_campaign' : format;
    setMatchFormat(canonicalFormat);
    if (canonicalFormat === 'mirror_duel') {
      setSelectedMapId('mirror_arena_10x10');
    }
    setTurnTimeRemaining(MATCH_FORMAT_CONFIGS[canonicalFormat].turnTimeLimitSec);
    resetMatchState(canonicalFormat);
    setMainNav('combat');
    audioManager.playSFX('co_power');
  };

  // Estados del Complejo Industrial Militar (Fase 5)
  const [industrialInventory, setIndustrialInventory] = useState<IndustrialInventory>({
    userId: 'user_commander_01',
    rawIron: 350,
    rawStone: 240,
    rawRareEarth: 110,
    refinedSteel: 45,
    refinedConcrete: 30,
    refinedMicrochip: 15,
    campaignFuel: 5,
    specialization: 'vulcan',
    lastHarvestAt: Date.now() - 4 * 3600 * 1000, // 4 horas acumuladas de producción
  });
  const [activeRefiningJobs, setActiveRefiningJobs] = useState<ActiveRefiningJob[]>([]);

  // Estados de Corporaciones Militares y Salvaguarda Táctica (Fase 6)
  const [clan, setClan] = useState<Clan>({
    id: 'clan_legion_iron_01',
    name: 'Legión de Hierro',
    tag: '[FERRO]',
    emblemIcon: '🛡️',
    tier: 'tier_2',
    treasuryGold: 45000,
    treasurySteel: 320,
    warScore: 18450,
    activeMembersCount: 6,
    maxMembers: 30,
  });

  const [clanMembers, setClanMembers] = useState<ClanMember[]>([
    {
      userId: 'user_commander_01',
      userName: 'Comandante en Jefe (Tú)',
      role: 'commander_in_chief',
      contributionPoints: 12500,
      warBattlesCount: 5,
      isEmbargoed: false,
      embargoFeeGold: 0,
      embargoFeeSteel: 0,
      isImmuneNewRecruit: false,
      joinedAt: Date.now() - 30 * 86400000,
    },
    {
      userId: 'user_officer_02',
      userName: 'Mayor Valkiria (XO)',
      role: 'executive_officer',
      contributionPoints: 9800,
      warBattlesCount: 4,
      isEmbargoed: false,
      embargoFeeGold: 0,
      embargoFeeSteel: 0,
      isImmuneNewRecruit: false,
      joinedAt: Date.now() - 20 * 86400000,
    },
    {
      userId: 'user_officer_03',
      userName: 'Capitán Tormenta',
      role: 'field_officer',
      contributionPoints: 7400,
      warBattlesCount: 3,
      isEmbargoed: false,
      embargoFeeGold: 0,
      embargoFeeSteel: 0,
      isImmuneNewRecruit: false,
      joinedAt: Date.now() - 15 * 86400000,
    },
    {
      userId: 'user_cadet_04',
      userName: 'Sargento Blindado',
      role: 'cadet',
      contributionPoints: 4200,
      warBattlesCount: 2,
      isEmbargoed: false,
      embargoFeeGold: 0,
      embargoFeeSteel: 0,
      isImmuneNewRecruit: false,
      joinedAt: Date.now() - 10 * 86400000,
    },
    {
      userId: 'user_cadet_05',
      userName: 'Cabo Centinela',
      role: 'cadet',
      contributionPoints: 3100,
      warBattlesCount: 1,
      isEmbargoed: false,
      embargoFeeGold: 0,
      embargoFeeSteel: 0,
      isImmuneNewRecruit: false,
      joinedAt: Date.now() - 8 * 86400000,
    },
    {
      userId: 'user_cadet_06',
      userName: 'Operador Radar',
      role: 'cadet',
      contributionPoints: 2100,
      warBattlesCount: 1,
      isEmbargoed: false,
      embargoFeeGold: 0,
      embargoFeeSteel: 0,
      isImmuneNewRecruit: false,
      joinedAt: Date.now() - 5 * 86400000,
    },
    {
      userId: 'user_cadet_07',
      userName: 'Recluta Desertor',
      role: 'cadet',
      contributionPoints: 400,
      warBattlesCount: 0,
      isEmbargoed: true,
      embargoFeeGold: 1500,
      embargoFeeSteel: 30,
      isImmuneNewRecruit: false,
      joinedAt: Date.now() - 12 * 86400000,
    },
  ]);

  const [safeguardInventory, setSafeguardInventory] = useState<SafeguardInventory>({
    isEquipped: false,
    stock: 2,
    currentStreak: 4,
    isCrafting: false,
  });

  // Estados de Identidad de Comandante y Expediente Retro-Futurista (Fase 8)
  const [userProfileIdentity, setUserProfileIdentity] = useState<UserProfileIdentity>({
    userId: 'user_commander_01',
    displayName: 'VANGUARD_01',
    tagId: '#8492',
    countryCode: 'PMC_TITAN',
    customBio: 'El acero no negocia con proyectiles. Victoria o chatarra.',
    militaryTitle: 'Coronel de Brigada',
    activeAvatarFrameId: 'frame_cyber_neon',
    activeBannerId: 'banner_bunker_mesh',
    activeLobbyVfxId: 'vfx_standard_alert',
    uiPaletteId: 'palette_olive_retro',
    militaryFurloughsLeft: 2,
    pinnedMedals: ['medal_recruit', 'medal_first_blood', null],
    winrate1v1: 64.2,
    winrate2v2: 71.8,
    eloRating: 4850,
    favoriteCommanderId: 'stella',
    commanderBondLevel: 8,
  });
  const [isProfileModalOpen, setIsProfileModalOpen] = useState<boolean>(false);

  // Estados de Ladder Asimétrico, Near-Miss y Tilt (Fase 7)
  const [isTournamentMode, setIsTournamentMode] = useState<boolean>(false);
  const [defeatStreak, setDefeatStreak] = useState<number>(1);
  const [lastTiltOfferTimestamp, setLastTiltOfferTimestamp] = useState<number>(0);
  const [activeNearMissReport, setActiveNearMissReport] = useState<NearMissReport | null>(null);
  const [activeTiltOffer, setActiveTiltOffer] = useState<TiltEmergencyOffer | null>(null);
  const [playerBlueprints, setPlayerBlueprints] = useState<Record<string, number>>({
    tank_light: 250,
    infantry: 120,
    artillery: 80,
  });
  const [userTrophies, setUserTrophies] = useState<number>(2450);
  const [shieldCharges, setShieldCharges] = useState<number>(3);

  const handleTiltPurchaseSuccess = (rewardBlueprints: number, rewardSteel: number) => {
    setPlayerBlueprints(prev => ({
      ...prev,
      tank_light: (prev['tank_light'] || 0) + rewardBlueprints,
    }));
    setIndustrialInventory(prev => ({
      ...prev,
      refinedSteel: prev.refinedSteel + rewardSteel,
    }));
    setActiveTiltOffer(null);
  };

  const handleConcludeMatch = (won: boolean) => {
    setIsVictory(won);
    const outcome = ClanEngine.processMatchOutcome(safeguardInventory, won);
    setSafeguardInventory(outcome.updatedInventory);
    setIsSummaryModalOpen(true);

    if (won) {
      setDefeatStreak(0);
    } else {
      const nextDefeatStreak = defeatStreak + 1;
      setDefeatStreak(nextDefeatStreak);

      // Evaluar Diagnóstico Near-Miss (ej. Tanque Ligero N9 vs Tanque Rival N12 con 1 HP)
      const nearMiss = AsymmetricLadderEngine.evaluateNearMiss(
        false,
        { id: 'tank_light', name: 'Tanque Ligero', level: isTournamentMode ? 11 : 9, currentBlueprints: playerBlueprints['tank_light'] || 250 },
        { id: 'tank_medium', name: 'Tanque Medio Rival', level: isTournamentMode ? 11 : 12, remainingHp: 1.0 },
        { refinedSteel: industrialInventory.refinedSteel, refinedMicrochip: industrialInventory.refinedMicrochip },
        7.0
      );

      if (nearMiss) {
        setActiveNearMissReport(nearMiss);
      }

      // Evaluar Oferta Flash de Emergencia por Tilt ($0.99 en 180s)
      const tiltOffer = AsymmetricLadderEngine.evaluateTiltOffer(
        'user_commander_01',
        'tank_light',
        'Tanque Ligero',
        nextDefeatStreak,
        8, // PTE de turnos precipitados
        !!nearMiss,
        lastTiltOfferTimestamp,
        Date.now()
      );

      if (tiltOffer) {
        setActiveTiltOffer(tiltOffer);
        setLastTiltOfferTimestamp(Date.now());
      }
    }
  };

  // Estados del Jugador (Economía & Progresión)
  const [userGold, setUserGold] = useState<number>(2400);
  const [userGems, setUserGems] = useState<number>(650);
  const [unlockedSkinIds, setUnlockedSkinIds] = useState<string[]>([
    'skin_tank_desert',
    'skin_infantry_urban',
  ]);
  const [equippedCosmetics, setEquippedCosmetics] = useState<Record<string, string>>({
    tank_light: 'skin_tank_desert',
    infantry: 'skin_infantry_urban',
  });
  const [activeLoadoutUnits, setActiveLoadoutUnits] = useState<string[]>([
    'infantry',
    'mech',
    'recon',
    'tank_light',
    'artillery',
    'anti_air',
    'b_copter',
  ]);

  // Precargar atlas de spritesheets de Advance Wars en segundo plano al montar la aplicación
  React.useEffect(() => {
    assetLoader.preloadCriticalAssets().catch(err => {
      console.warn('Precarga de sprites en segundo plano:', err);
    });
  }, []);

  const handlePurchaseSuccess = (skin: CosmeticSkin, newGold: number, newGems: number) => {
    setUserGold(newGold);
    setUserGems(newGems);
    setUnlockedSkinIds(prev => (prev.includes(skin.id) ? prev : [...prev, skin.id]));
  };

  const handleEquipSkin = (unitTarget: string, skinId: string) => {
    setEquippedCosmetics(prev => ({
      ...prev,
      [unitTarget]: skinId,
    }));
  };

  // Conversión para GameCanvas
  const convertedTiles: TerrainTile[][] = matchTiles;

  const convertedUnits: TacticalUnit[] = useMemo(() => {
    return units.map(u => {
      const coState = playerCOs[u.owner];
      const moveBonus = COEngine.getMovementBonus(coState, u.code, u.minRange);
      const rangeBonus = COEngine.getRangeBonus(coState, u.minRange, u.maxRange);
      const visionBonus = coState.coId === 'sonja' ? 1 + (coState.activePower ? 1 : 0) : 0;

      return {
        id: u.id,
        unitCode: u.code,
        displayName: u.name,
        ownerId: u.owner,
        x: u.x,
        y: u.y,
        hp: u.hp,
        maxHp: 10,
        ammo: 9,
        fuel: 99,
        movementPoints: u.movePoints + moveBonus,
        movementType: u.moveType,
        minRange: Math.max(1, u.minRange + rangeBonus.minBonus),
        maxRange: Math.max(1, u.maxRange + rangeBonus.maxBonus),
        visionRange: (u.code === 'recon' ? 5 : 2) + visionBonus,
        baseAttack: u.baseAtk,
        productionCost: COEngine.getProductionCostModifier(
          coState.coId,
          CANONICAL_UNIT_PRODUCTION_CATALOG[u.code]?.cost ?? 1000
        ),
        hasMoved: u.hasMoved ?? false,
        hasActed: u.hasActed ?? false,
        skinId: equippedCosmetics[u.code] || 'default',
      };
    });
  }, [units, equippedCosmetics, playerCOs]);

  // Ingresos por turno por facción
  const p1Income = useMemo(() => TurnEconomyEngine.calculateIncome('p1', matchTiles), [matchTiles]);
  const p2Income = useMemo(() => TurnEconomyEngine.calculateIncome('p2', matchTiles), [matchTiles]);

  // Cálculo Dinámico de Niebla de Guerra (Fog of War) y Visión Perceptual
  const currentVision = useMemo(() => {
    return FogOfWarEngine.computeVision(
      viewerPerspective,
      convertedUnits,
      convertedTiles,
      fowWeather,
      sonjaSensorActive
    );
  }, [viewerPerspective, convertedUnits, convertedTiles, fowWeather, sonjaSensorActive]);

  // Selección de unidad en el simulador
  const selectedUnit = units.find(u => u.id === selectedUnitId);
  const targetEnemy = units.find(u => u.id === targetEnemyId);

  // Casilla actual bajo la unidad seleccionada y comprobación de captura
  const currentTileUnderSelected = useMemo(() => {
    if (!selectedUnit) return null;
    return matchTiles[selectedUnit.y]?.[selectedUnit.x] || null;
  }, [selectedUnit, matchTiles]);

  const canActiveUnitCapture = useMemo(() => {
    if (!selectedUnit || !currentTileUnderSelected) return false;
    const activeTactical = convertedUnits.find(u => u.id === selectedUnit.id);
    if (!activeTactical) return false;
    return CaptureEngine.canCapture(activeTactical, currentTileUnderSelected);
  }, [selectedUnit, currentTileUnderSelected, convertedUnits]);

  // Ejecución de captura de sede
  const handleExecuteCapture = () => {
    if (!selectedUnit || !currentTileUnderSelected) return;
    const activeTactical = convertedUnits.find(u => u.id === selectedUnit.id);
    if (!activeTactical) return;

    // Puntos de captura modificados por el Comandante (ej: Sami 1.5x o 20 instantáneo en SCOP)
    const effectiveCaptureHp = COEngine.getCapturePoints(playerCOs[selectedUnit.owner], activeTactical.hp);
    const simulatedUnit = { ...activeTactical, hp: effectiveCaptureHp };

    const result = CaptureEngine.executeCaptureStep(simulatedUnit, currentTileUnderSelected);
    if (!result.success) return;

    audioManager.playSFX('button_click');

    // Actualizar loseta en el tablero
    setMatchTiles(prev =>
      prev.map((row, y) =>
        row.map((t, x) => {
          if (x === currentTileUnderSelected.x && y === currentTileUnderSelected.y) {
            return {
              ...t,
              captureHp: result.remainingCapturePoints,
              ownerId: result.newOwnerId,
            };
          }
          return t;
        })
      )
    );

    // Sellar turno de la tropa de forma inmutable (hasActed = true)
    setUnits(prev =>
      prev.map(u =>
        u.id === selectedUnit.id
          ? { ...u, hasMoved: true, hasActed: true }
          : u
      )
    );

    // Bono de acción del Reloj Fischer Táctico (RFC Sección 2.1)
    const bonusSec = matchFormat === 'mirror_duel' ? 2 : matchFormat === 'blitz_skirmish' ? 3 : 4;
    const maxCapSec = matchFormat === 'mirror_duel' ? 25 : matchFormat === 'blitz_skirmish' ? 45 : 90;
    setTurnTimeRemaining(prev => Math.min(maxCapSec, prev + bonusSec));

    if (result.captured) {
      setMatchCities(prev => prev + 1);
      if (result.isHqCaptured) {
        audioManager.playSFX('button_click');
        handleConcludeMatch(selectedUnit.owner === 'p1');
      }
    }
  };

  // Ejecución autónoma secuencial del turno de la IA (Sprint 2 - Fase 1 con Cancelación Blindada)
  const triggerBotTurn = async (currentUnitsList: SimUnit[], currentTiles: TerrainTile[][], fundsP2: number) => {
    cancelBotExecution();
    const sessionId = botTurnSessionIdRef.current;
    const controller = new AbortController();
    botAbortControllerRef.current = controller;

    setIsBotThinking(true);
    setBotActionLog('Iniciando cálculo táctico del Bot...');

    try {
      await new Promise<void>((resolve, reject) => {
        const t = setTimeout(resolve, 450);
        controller.signal.addEventListener('abort', () => {
          clearTimeout(t);
          reject(new Error('Bot aborted'));
        }, { once: true });
      });

      if (controller.signal.aborted || sessionId !== botTurnSessionIdRef.current) return;

      // Convertir para la IA respetando bonificaciones
      const tacticalUnits: TacticalUnit[] = currentUnitsList.map(u => ({
        id: u.id,
        unitCode: u.code,
        displayName: u.name,
        ownerId: u.owner,
        x: u.x,
        y: u.y,
        hp: u.hp,
        maxHp: 10,
        ammo: 9,
        fuel: 99,
        movementPoints: u.movePoints,
        movementType: u.moveType,
        minRange: u.minRange,
        maxRange: u.maxRange,
        visionRange: u.code === 'recon' ? 5 : 2,
        baseAttack: u.baseAtk,
        productionCost: 1000,
        hasMoved: false,
        hasActed: false,
        skinId: 'default',
      }));

      const botState: BotGameState = {
        botPlayerId: 'p2',
        opponentPlayerId: 'p1',
        gridWidth: currentTiles[0]?.length || 16,
        gridHeight: currentTiles.length,
        tiles: currentTiles,
        units: tacticalUnits,
        botFunds: fundsP2,
      };

      const plan = TacticalBotAI.computeBotTurn(botState, botDifficulty);
      let mutableUnits = currentUnitsList.map(u => ({ ...u }));
      let mutableTiles = currentTiles.map(row => row.map(t => ({ ...t })));
      let mutableFundsP2 = fundsP2;

      for (const action of plan.actions) {
        if (controller.signal.aborted || sessionId !== botTurnSessionIdRef.current) break;
        if (action.actionType === 'END_TURN') break;

        setBotActionLog(action.explanation);
        audioManager.playSFX('button_click');

        await new Promise<void>((resolve, reject) => {
          const t = setTimeout(resolve, 400);
          controller.signal.addEventListener('abort', () => {
            clearTimeout(t);
            reject(new Error('Bot aborted'));
          }, { once: true });
        });

        if (controller.signal.aborted || sessionId !== botTurnSessionIdRef.current) break;

        if (action.actionType === 'SPAWN_UNIT' && action.spawnUnitCode && action.factoryPosition) {
          const entry = CANONICAL_UNIT_PRODUCTION_CATALOG[action.spawnUnitCode];
          if (entry && mutableFundsP2 >= entry.cost) {
            mutableFundsP2 -= entry.cost;
            const spawned: SimUnit = {
              id: `bot_${action.spawnUnitCode}_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
              name: entry.name,
              code: action.spawnUnitCode,
              owner: 'p2',
              x: action.factoryPosition.x,
              y: action.factoryPosition.y,
              hp: 10,
              movePoints: entry.movementPoints,
              moveType: entry.movementType as any,
              minRange: entry.minRange,
              maxRange: entry.maxRange,
              baseAtk: entry.baseAttack,
            };
            mutableUnits.push(spawned);
            setUnits([...mutableUnits]);
            setPlayerFunds(prev => ({ ...prev, p2: mutableFundsP2 }));
          }
        } else if (action.actionType === 'MOVE_AND_CAPTURE' && action.unitId && action.moveDestination) {
          const u = mutableUnits.find(unit => unit.id === action.unitId);
          if (u) {
            u.x = action.moveDestination.x;
            u.y = action.moveDestination.y;
            setSelectedUnitId(u.id);
            setUnits([...mutableUnits]);

            const tile = mutableTiles[u.y]?.[u.x];
            if (tile) {
              const simulatedTac: TacticalUnit = {
                id: u.id,
                unitCode: u.code,
                displayName: u.name,
                ownerId: u.owner,
                x: u.x,
                y: u.y,
                hp: u.hp,
                maxHp: 10,
                ammo: 9,
                fuel: 99,
                movementPoints: u.movePoints,
                movementType: u.moveType,
                minRange: u.minRange,
                maxRange: u.maxRange,
                visionRange: 3,
                baseAttack: u.baseAtk,
                productionCost: 1000,
                hasMoved: true,
                hasActed: true,
                skinId: 'default',
              };
              const capResult = CaptureEngine.executeCaptureStep(simulatedTac, tile);
              if (capResult.success) {
                tile.captureHp = capResult.remainingCapturePoints;
                tile.ownerId = capResult.newOwnerId;
                setMatchTiles(mutableTiles.map(r => r.map(t => ({ ...t }))));

                if (capResult.isHqCaptured) {
                  handleConcludeMatch(false);
                  setIsBotThinking(false);
                  setBotActionLog('¡Victoria de la IA por captura del HQ!');
                  return;
                }
              }
            }
          }
        } else if (action.actionType === 'MOVE_AND_ATTACK' && action.unitId && action.moveDestination && action.targetUnitId) {
          const atk = mutableUnits.find(unit => unit.id === action.unitId);
          const def = mutableUnits.find(unit => unit.id === action.targetUnitId);
          if (atk && def) {
            atk.x = action.moveDestination.x;
            atk.y = action.moveDestination.y;
            setSelectedUnitId(atk.id);
            setTargetEnemyId(def.id);

            const atkTile = mutableTiles[atk.y][atk.x];
            const defTile = mutableTiles[def.y][def.x];

            const combat = CombatEngine.calculateDamage(
              { ...atk, unitCode: atk.code, displayName: atk.name, ownerId: atk.owner, maxHp: 10, ammo: 9, fuel: 99, movementPoints: atk.movePoints, movementType: atk.moveType, visionRange: 3, productionCost: 1000, hasMoved: true, hasActed: true, skinId: 'default' },
              { ...def, unitCode: def.code, displayName: def.name, ownerId: def.owner, maxHp: 10, ammo: 9, fuel: 99, movementPoints: def.movePoints, movementType: def.moveType, visionRange: 3, productionCost: 1000, hasMoved: false, hasActed: false, skinId: 'default' },
              atkTile,
              defTile
            );

            def.hp = combat.defenderHpRemaining;
            if (combat.defenderEliminated) {
              mutableUnits = mutableUnits.filter(unit => unit.id !== def.id);
            } else if (combat.canCounterAttack && combat.counterDamageDealt > 0) {
              atk.hp = combat.attackerHpRemaining;
              if (combat.attackerEliminated) {
                mutableUnits = mutableUnits.filter(unit => unit.id !== atk.id);
              }
            }
            setUnits([...mutableUnits]);
          }
        } else if (action.moveDestination && action.unitId) {
          const u = mutableUnits.find(unit => unit.id === action.unitId);
          if (u) {
            u.x = action.moveDestination.x;
            u.y = action.moveDestination.y;
            setUnits([...mutableUnits]);
          }
        }
      }

      if (controller.signal.aborted || sessionId !== botTurnSessionIdRef.current) return;

      setBotActionLog('Fin del turno de la IA. Cediendo control a Orange Star (P1).');
      await new Promise<void>((resolve, reject) => {
        const t = setTimeout(resolve, 450);
        controller.signal.addEventListener('abort', () => {
          clearTimeout(t);
          reject(new Error('Bot aborted'));
        }, { once: true });
      });

      if (controller.signal.aborted || sessionId !== botTurnSessionIdRef.current) return;

      setIsBotThinking(false);
      setBotActionLog(null);

      // Turno regresa a P1 con cobro de ingresos
      const p1Inc = TurnEconomyEngine.calculateIncome('p1', mutableTiles);
      setPlayerFunds(prev => ({ ...prev, p1: prev.p1 + p1Inc }));
      setTurn('p1');
      setTurnNumber(prev => prev + 1);
      setViewerPerspective('p1');
      audioManager.playSFX('button_click');

      const firstP1 = mutableUnits.find(unit => unit.owner === 'p1');
      if (firstP1) setSelectedUnitId(firstP1.id);
      const firstP2 = mutableUnits.find(unit => unit.owner === 'p2');
      if (firstP2) setTargetEnemyId(firstP2.id);
    } catch (e) {
      // Abortado limpiamente
    } finally {
      if (sessionId === botTurnSessionIdRef.current) {
        setIsBotThinking(false);
      }
    }
  };

  // Finalizar turno canónico (Ingresos, reparaciones, resuministro y cambio de jugador)
  const handleEndTurn = () => {
    if (isBotThinking) return;

    const nextPlayer: 'p1' | 'p2' = turn === 'p1' ? 'p2' : 'p1';
    const nextTurnNum = nextPlayer === 'p1' ? turnNumber + 1 : turnNumber;

    // 1. Ingresos generados por sedes
    const income = TurnEconomyEngine.calculateIncome(nextPlayer, matchTiles);
    const availableFunds = playerFunds[nextPlayer] + income;

    // 2. Mantenimiento, reabastecimiento y reparaciones
    const repairResult = TurnEconomyEngine.processRepairsAndResupply(
      nextPlayer,
      convertedUnits,
      matchTiles,
      availableFunds
    );

    const updatedUnitsSim: SimUnit[] = repairResult.updatedUnits.map(u => ({
      id: u.id,
      name: u.displayName,
      code: u.unitCode,
      owner: u.ownerId as 'p1' | 'p2',
      x: u.x,
      y: u.y,
      hp: u.hp,
      movePoints: u.movementPoints,
      moveType: u.movementType as any,
      minRange: u.minRange,
      maxRange: u.maxRange,
      baseAtk: u.baseAttack,
      hasMoved: false,
      hasActed: false,
    }));

    // 3. Actualizar estados
    setUnits(updatedUnitsSim);

    setPlayerFunds(prev => ({
      ...prev,
      [nextPlayer]: repairResult.updatedFunds,
    }));

    setTurn(nextPlayer);
    setTurnNumber(nextTurnNum);
    setViewerPerspective(nextPlayer);

    const nextFirstUnit = repairResult.updatedUnits.find(u => u.ownerId === nextPlayer);
    if (nextFirstUnit) setSelectedUnitId(nextFirstUnit.id);
    const enemyUnit = repairResult.updatedUnits.find(u => u.ownerId !== nextPlayer);
    if (enemyUnit) setTargetEnemyId(enemyUnit.id);

    audioManager.playSFX('button_click');

    // 4. Disipar superpoder del jugador que concluye su turno
    setPlayerCOs(prev => ({
      ...prev,
      [turn]: COEngine.expirePowerOnTurnEnd(prev[turn]),
    }));

    // 5. Gestión dinámica de AirDrops (Aparición en T2/T5 en Blitz y Espejo, T3/T7 en Campaña)
    const spawnTurns = matchFormat === 'grand_campaign' ? [3, 7] : [2, 5];
    let currentDrops = AirDropEngine.purgeExpiredDrops(airDrops, nextTurnNum);

    if (spawnTurns.includes(nextTurnNum) && !currentDrops.some(d => d.spawnTurn === nextTurnNum)) {
      const newDrop = AirDropEngine.calculateEquidistantDrop(
        activeMap.width,
        activeMap.height,
        matchTiles,
        updatedUnitsSim,
        currentDrops,
        nextTurnNum
      );
      if (newDrop) {
        currentDrops = [...currentDrops, newDrop];
        audioManager.playSFX('co_power');
        barkEngine.triggerBark({
          commanderId: playerCOs[nextPlayer].coId,
          triggerContext: 'airdrop_spawn',
          bondingLevel: 3,
          playerName: nextPlayer === 'p1' ? 'Orange Star' : 'Blue Moon',
        });
      }
    }
    setAirDrops(currentDrops);

    // Reiniciar temporizador de turno
    setTurnTimeRemaining(MATCH_FORMAT_CONFIGS[matchFormat].turnTimeLimitSec);

    // 6. Comprobar límite de turnos según formato
    if (nextTurnNum > MATCH_FORMAT_CONFIGS[matchFormat].maxTurnsLimit) {
      const p1Units = updatedUnitsSim.filter(u => u.owner === 'p1').length;
      const p2Units = updatedUnitsSim.filter(u => u.owner === 'p2').length;
      handleConcludeMatch(p1Units >= p2Units);
      return;
    }

    // 7. Comprobar fin de partida por destrucción o conquista
    const gameOverCheck = TurnEconomyEngine.checkGameOver(matchTiles, repairResult.updatedUnits);
    if (gameOverCheck.isOver) {
      handleConcludeMatch(gameOverCheck.winnerId === 'p1');
      return;
    }

    // 8. Si el modo es vs_bot y pasa al turno de P2, disparar la IA autónomamente
    if (nextPlayer === 'p2' && gameMode === 'vs_bot') {
      triggerBotTurn(updatedUnitsSim, matchTiles, repairResult.updatedFunds);
    }
  };

  // Activación de Superpoderes CO (COP / SCOP)
  const handleActivateCOPower = (powerType: COPowerType) => {
    const activeState = playerCOs[turn];
    if (!COEngine.canActivatePower(activeState, powerType)) return;

    const result = COEngine.activatePower(activeState, powerType, {
      player: turn,
      units: convertedUnits,
      tiles: matchTiles,
      funds: playerFunds[turn],
    });

    setPlayerCOs(prev => ({
      ...prev,
      [turn]: result.updatedState,
    }));

    // Disparo reactivo del Bark Engine en cómic
    barkEngine.triggerBark({
      commanderId: activeState.coId,
      triggerContext: powerType === 'scop' ? 'scop_activated' : 'cop_activated',
      bondingLevel: 3,
      playerName: 'Comandante en Jefe',
    });

    if (result.updatedUnits) {
      setUnits(
        result.updatedUnits.map(u => ({
          id: u.id,
          name: u.displayName,
          code: u.unitCode,
          owner: u.ownerId as 'p1' | 'p2',
          x: u.x,
          y: u.y,
          hp: u.hp,
          movePoints: u.movementPoints,
          moveType: u.movementType as any,
          minRange: u.minRange,
          maxRange: u.maxRange,
          baseAtk: u.baseAttack,
        }))
      );
    }

    if (result.updatedFunds !== undefined) {
      setPlayerFunds(prev => ({
        ...prev,
        [turn]: result.updatedFunds!,
      }));
    }
  };

  // Producción militar en fábrica/base
  const handleProduceUnit = (unitCode: string) => {
    if (!selectedFactoryCoord) return;

    const result = TurnEconomyEngine.produceUnit(
      unitCode,
      selectedFactoryCoord,
      turn,
      playerFunds[turn],
      convertedUnits,
      matchTiles,
      baseCost => COEngine.getProductionCostModifier(playerCOs[turn].coId, baseCost)
    );

    if (result.success && result.newUnit) {
      audioManager.playSFX('button_click');
      const u = result.newUnit;
      const simU: SimUnit = {
        id: u.id,
        name: u.displayName,
        code: u.unitCode,
        owner: u.ownerId as 'p1' | 'p2',
        x: u.x,
        y: u.y,
        hp: u.hp,
        movePoints: u.movementPoints,
        moveType: u.movementType as any,
        minRange: u.minRange,
        maxRange: u.maxRange,
        baseAtk: u.baseAttack,
      };

      setUnits(prev => [...prev, simU]);
      setPlayerFunds(prev => ({
        ...prev,
        [turn]: result.remainingFunds,
      }));
      setSelectedUnitId(simU.id);
      setIsProductionModalOpen(false);
      setSelectedFactoryCoord(null);
    }
  };

  // Manejo de Movimiento de Unidades con Detección de Emboscadas Canónica (TRAP / Dijkstra)
  const handleMoveUnit = (targetCoord: { x: number; y: number }, customPath?: { x: number; y: number }[]) => {
    if (!selectedUnit) return;

    if (isFogOfWarEnabled && viewerPerspective !== 'spectator') {
      const reachable = reachableCells.find(c => c.x === targetCoord.x && c.y === targetCoord.y) as any;
      const actualPath: { x: number; y: number }[] = customPath && customPath.length > 1
        ? customPath
        : reachable?.path || [{ x: selectedUnit.x, y: selectedUnit.y }, targetCoord];

      const activeTactical = convertedUnits.find(u => u.id === selectedUnit.id);
      if (activeTactical) {
        const trapCheck = FogOfWarEngine.checkTrapOnPath(
          activeTactical,
          actualPath,
          convertedUnits,
          viewerPerspective,
          convertedTiles
        );

        if (trapCheck.isTrapped) {
          triggerHaptic('trap');
          audioManager.playSFX('combat_hit');
          barkEngine.triggerBark({
            commanderId: playerCOs[turn].coId,
            triggerContext: 'trap_ambush',
            bondingLevel: 3,
            playerName: 'Comandante en Jefe',
          });
          setAmbushAlert({
            coord: trapCheck.interruptedAt,
            text: '¡EMBOSCADA DETECTADA! (TRAP)',
            startTime: performance.now(),
          });
          // Regla canónica Advance Wars: la emboscada agota el turno completo
          setUnits(prev =>
            prev.map(u =>
              u.id === selectedUnit.id
                ? { ...u, x: trapCheck.interruptedAt.x, y: trapCheck.interruptedAt.y, hasMoved: true, hasActed: true }
                : u
            )
          );
          return;
        }
      }
    }

    triggerHaptic('movement');
    setUnits(prev =>
      prev.map(u => (u.id === selectedUnit.id ? { ...u, x: targetCoord.x, y: targetCoord.y } : u))
    );

    // Reclamación canónica de AirDrop si la unidad activa ocupa la casilla del suministro
    const dropOnCoord = airDrops.find(d => !d.isClaimed && d.x === targetCoord.x && d.y === targetCoord.y);
    if (dropOnCoord) {
      const claimResult = AirDropEngine.claimAirDrop(
        dropOnCoord,
        { id: selectedUnit.id, ownerId: turn, x: targetCoord.x, y: targetCoord.y },
        playerCOs[turn].coId
      );

      if (claimResult.success) {
        if (dropOnCoord.rewardType === 'funds') {
          setPlayerFunds(prev => ({
            ...prev,
            [turn]: prev[turn] + dropOnCoord.rewardValue,
          }));
        } else if (dropOnCoord.rewardType === 'co_power') {
          setPlayerCOs(prev => ({
            ...prev,
            [turn]: {
              ...prev[turn],
              powerMeter: 54000,
            },
          }));
        }

        setAirDrops(prev =>
          prev.map(d => (d.id === dropOnCoord.id ? claimResult.claimedDrop : d))
        );
      }
    }
  };

  // Temporizador de Turno en Tiempo Real (Anti-AFK & Arbitraje Blitz / Espejo)
  React.useEffect(() => {
    if (isSummaryModalOpen || isBotThinking || viewMode !== 'canvas') {
      return;
    }

    const interval = setInterval(() => {
      setTurnTimeRemaining(prev => {
        if (prev <= 1) {
          // Árbitro Anti-AFK: Agotamiento de tiempo -> Forzar paso de turno automático
          audioManager.playSFX('combat_hit');
          setTimeout(() => handleEndTurn(), 0);
          return MATCH_FORMAT_CONFIGS[matchFormat].turnTimeLimitSec;
        }

        // Tictac sonoro de urgencia en los últimos 5 segundos
        if (prev <= 6) {
          audioManager.playSFX('button_click');
        }

        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [turn, turnNumber, matchFormat, isSummaryModalOpen, isBotThinking, viewMode]);

  // Copiar al portapapeles
  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const currentDoc: DocItem = useMemo(() => {
    return GAME_DOCUMENTS.find(d => d.id === activeTab) || GAME_DOCUMENTS[0];
  }, [activeTab]);

  // Documentos filtrados
  const filteredDocs = useMemo(() => {
    if (!searchQuery.trim()) return GAME_DOCUMENTS;
    const q = searchQuery.toLowerCase();
    return GAME_DOCUMENTS.filter(
      d =>
        d.title.toLowerCase().includes(q) ||
        d.summary.toLowerCase().includes(q) ||
        d.sections.some(s => s.heading.toLowerCase().includes(q) || s.content.toLowerCase().includes(q))
    );
  }, [searchQuery]);

  // Cálculo de casillas alcanzables (Manhattan / Terreno con límites dinámicos de mapa)
  const reachableCells = useMemo(() => {
    if (!selectedUnit) return [];
    const list: { x: number; y: number }[] = [];
    const maxDist = selectedUnit.movePoints;
    const h = matchTiles.length;
    const w = matchTiles[0]?.length || 0;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const dist = Math.abs(selectedUnit.x - x) + Math.abs(selectedUnit.y - y);
        if (dist > 0 && dist <= maxDist) {
          const tile = matchTiles[y]?.[x];
          if (!tile) continue;
          if (tile.type === 'mountain' && (selectedUnit.moveType === 'treads' || selectedUnit.moveType === 'wheels')) {
            continue;
          }
          if (tile.type === 'sea' && selectedUnit.moveType !== 'air') {
            continue;
          }
          list.push({ x, y });
        }
      }
    }
    return list;
  }, [selectedUnit, matchTiles]);

  // Cálculo de Combate Canónico
  const combatResult = useMemo(() => {
    if (!selectedUnit || !targetEnemy) return null;
    const dist = Math.abs(selectedUnit.x - targetEnemy.x) + Math.abs(selectedUnit.y - targetEnemy.y);
    const inRange = dist >= selectedUnit.minRange && dist <= selectedUnit.maxRange;

    const defenderTile = matchTiles[targetEnemy.y]?.[targetEnemy.x] || {
      defenseStars: 0,
      type: 'plains' as const,
      x: targetEnemy.x,
      y: targetEnemy.y,
    };
    const attackerTile = matchTiles[selectedUnit.y]?.[selectedUnit.x] || {
      defenseStars: 0,
      type: 'plains' as const,
      x: selectedUnit.x,
      y: selectedUnit.y,
    };

    // Mapear SimUnit a TacticalUnit para el motor canónico
    const atkUnit: TacticalUnit = {
      id: selectedUnit.id,
      unitCode: selectedUnit.code,
      displayName: selectedUnit.name,
      ownerId: selectedUnit.owner,
      x: selectedUnit.x,
      y: selectedUnit.y,
      hp: selectedUnit.hp,
      maxHp: 10,
      ammo: 9,
      fuel: 99,
      movementPoints: selectedUnit.movePoints,
      movementType: selectedUnit.moveType,
      minRange: selectedUnit.minRange,
      maxRange: selectedUnit.maxRange,
      visionRange: 3,
      baseAttack: selectedUnit.baseAtk,
      productionCost: 1000,
      hasMoved: false,
      hasActed: false,
      skinId: equippedCosmetics[selectedUnit.code] || 'default',
    };

    const defUnit: TacticalUnit = {
      id: targetEnemy.id,
      unitCode: targetEnemy.code,
      displayName: targetEnemy.name,
      ownerId: targetEnemy.owner,
      x: targetEnemy.x,
      y: targetEnemy.y,
      hp: targetEnemy.hp,
      maxHp: 10,
      ammo: 9,
      fuel: 99,
      movementPoints: targetEnemy.movePoints,
      movementType: targetEnemy.moveType,
      minRange: targetEnemy.minRange,
      maxRange: targetEnemy.maxRange,
      visionRange: 3,
      baseAttack: targetEnemy.baseAtk,
      productionCost: 1000,
      hasMoved: false,
      hasActed: false,
      skinId: 'default',
    };

    const atkTileData: TerrainTile = {
      x: selectedUnit.x,
      y: selectedUnit.y,
      type: attackerTile.type,
      defenseStars: attackerTile.stars,
      ownerId: attackerTile.owner || null,
      captureHp: 20,
    };

    const defTileData: TerrainTile = {
      x: targetEnemy.x,
      y: targetEnemy.y,
      type: defenderTile.type,
      defenseStars: defenderTile.stars,
      ownerId: defenderTile.owner || null,
      captureHp: 20,
    };

    const atkCoState = playerCOs[selectedUnit.owner];
    const defCoState = playerCOs[targetEnemy.owner];
    const coMods = COEngine.getCombatModifiers(
      atkUnit,
      defUnit,
      atkCoState,
      defCoState,
      playerFunds[selectedUnit.owner]
    );

    const result = CanonicalCombatEngine.calculateEngagement(
      atkUnit,
      defUnit,
      atkTileData,
      defTileData,
      {
        coAttackModifier: coMods.attackerModifier,
        coDefenseModifier: coMods.defenderModifier,
        deterministic: true,
        isTournamentMode: matchFormat === 'mirror_duel',
      }
    );

    return {
      inRange,
      distance: dist,
      estimatedDamage: result.attackerDamageDealt,
      damagePercent: result.attackerDamagePercent,
      weaponUsed: result.weaponUsed,
      defenderHpAfter: result.defenderHpAfter,
      canCounter: result.canCounterAttack,
      counterDamage: result.counterDamageDealt,
      attackerHpAfter: result.attackerHpAfter,
      defenseStars: defenderTile.stars,
      terrainName: defenderTile.type,
      attackerModifier: coMods.attackerModifier,
      defenderModifier: coMods.defenderModifier,
    };
  }, [selectedUnit, targetEnemy, equippedCosmetics, playerCOs, playerFunds]);

  // Cálculo de XP de la calculadora
  const requiredXpForLevel = Math.floor(150 * Math.pow(simLevel, 1.85));
  const matchResultXp = useMemo(() => {
    const base = 120;
    const score = base + (matchCities * 45) + (matchKills * 35) + (Math.min(matchTurns, 30) * 6);
    const mult = isVictory ? 2.2 : 0.85;
    return Math.floor(score * mult);
  }, [matchCities, matchKills, matchTurns, isVictory]);

  const matchResultCredits = useMemo(() => {
    const base = 60;
    const score = base + (matchCities * 20) + (matchKills * 15);
    const mult = isVictory ? 2.0 : 0.8;
    return Math.floor(score * mult);
  }, [matchCities, matchKills, isVictory]);

  const handleDeployLazyUnit = async (unitCode: 'fighter' | 'battleship') => {
    setLazyStatus(`Estableciendo enlace logístico de despliegue: ${unitCode.toUpperCase()}...`);
    const success = await assetLoader.loadLazyAsset(unitCode);
    if (success) {
      audioManager.playSFX('unit_order');
      const newUnit: SimUnit = unitCode === 'fighter'
        ? {
            id: `deploy_air_${Date.now()}`,
            name: 'Caza Supersónico P1',
            code: 'fighter',
            owner: 'p1',
            x: 3,
            y: 4,
            hp: 10,
            movePoints: 9,
            moveType: 'foot',
            minRange: 1,
            maxRange: 1,
            baseAtk: 95,
          }
        : {
            id: `deploy_sea_${Date.now()}`,
            name: 'Acorazado Naval P1',
            code: 'battleship',
            owner: 'p1',
            x: 4,
            y: 6,
            hp: 10,
            movePoints: 5,
            moveType: 'treads',
            minRange: 2,
            maxRange: 5,
            baseAtk: 90,
          };
      setUnits(prev => [...prev, newUnit]);
      setSelectedUnitId(newUnit.id);
      setLazyStatus(`¡${unitCode.toUpperCase()} en posición operacional y listo para el combate!`);
      setTimeout(() => setLazyStatus(null), 3500);
    }
  };

  const handleExecuteCombat = () => {
    if (!combatResult || !combatResult.inRange || !selectedUnit || !targetEnemy) return;

    if (selectedUnit.code === 'infantry' || selectedUnit.code === 'recon') {
      audioManager.playSFX('machinegun');
    } else if (selectedUnit.code === 'artillery' || selectedUnit.code === 'rocket') {
      audioManager.playSFX('rocket');
    } else {
      audioManager.playSFX('cannon');
    }

    const defRemaining = combatResult.defenderHpAfter;
    const atkRemaining = combatResult.attackerHpAfter;

    // Carga de energía de Comandante (CO) en función del daño infligido y recibido
    const targetCost = CANONICAL_UNIT_PRODUCTION_CATALOG[targetEnemy.code]?.cost ?? 1000;
    const ownCost = CANONICAL_UNIT_PRODUCTION_CATALOG[selectedUnit.code]?.cost ?? 1000;
    const dmgDealt = combatResult.estimatedDamage;
    const dmgRecv = combatResult.canCounter ? combatResult.counterDamage : 0;

    const atkCharge = COEngine.calculateCombatCharge(dmgDealt, targetCost, dmgRecv, ownCost);
    const defCharge = COEngine.calculateCombatCharge(dmgRecv, ownCost, dmgDealt, targetCost);

    setPlayerCOs(prev => ({
      ...prev,
      [selectedUnit.owner]: {
        ...prev[selectedUnit.owner],
        powerMeter: Math.min(
          COEngine.getPowerChargeThreshold(prev[selectedUnit.owner].coId, 'scop'),
          prev[selectedUnit.owner].powerMeter + atkCharge
        ),
      },
      [targetEnemy.owner]: {
        ...prev[targetEnemy.owner],
        powerMeter: Math.min(
          COEngine.getPowerChargeThreshold(prev[targetEnemy.owner].coId, 'scop'),
          prev[targetEnemy.owner].powerMeter + defCharge
        ),
      },
    }));

    setTimeout(() => {
      // Recompensa de Primera Sangre (First Strike Bounty: +$600G) - RFC Sección 2.2
      if (defRemaining <= 0) {
        audioManager.playSFX('explosion');
        if (matchKills === 0) {
          setPlayerFunds(prev => ({
            ...prev,
            [selectedUnit.owner]: prev[selectedUnit.owner] + 600,
          }));
          barkEngine.triggerBark({
            commanderId: playerCOs[turn].coId,
            triggerContext: 'kill_heavy_tank',
            unitName: '¡PRIMERA SANGRE! (+$600G)',
            bondingLevel: 3,
          });
        }
        setMatchKills(k => k + 1);
        setUnits(prev =>
          prev
            .filter(u => u.id !== targetEnemy.id)
            .map(u => (u.id === selectedUnit.id ? { ...u, hp: atkRemaining, hasMoved: true, hasActed: true } : u))
        );
        setTargetEnemyId('');
        barkEngine.triggerBark({
          commanderId: playerCOs[turn].coId,
          triggerContext: 'kill_heavy_tank',
          unitName: targetEnemy.name,
          bondingLevel: 3,
        });
      } else {
        if (defRemaining <= 2) {
          barkEngine.triggerBark({
            commanderId: playerCOs[turn].coId,
            triggerContext: 'enemy_near_miss',
            unitName: targetEnemy.name,
            bondingLevel: 3,
          });
        }
        if (combatResult.canCounter) {
          audioManager.playSFX('cannon');
        }
        setUnits(prev =>
          prev.map(u => {
            if (u.id === targetEnemy.id) return { ...u, hp: defRemaining };
            if (u.id === selectedUnit.id) return { ...u, hp: atkRemaining, hasMoved: true, hasActed: true };
            return u;
          })
        );
      }

      // Bono de acción del Reloj Fischer Táctico (RFC Sección 2.1)
      const bonusSec = matchFormat === 'mirror_duel' ? 2 : matchFormat === 'blitz_skirmish' ? 3 : 4;
      const maxCapSec = matchFormat === 'mirror_duel' ? 25 : matchFormat === 'blitz_skirmish' ? 45 : 90;
      setTurnTimeRemaining(prev => Math.min(maxCapSec, prev + bonusSec));
    }, 350);
  };

  // Manejador Canónico Atómico Move + Attack (Fase 1 / Tarea 1.1 - Sin Race Conditions)
  const handleAtomicMoveAndAttack = React.useCallback(
    (payload: {
      unitId: string;
      destination: { x: number; y: number };
      path?: { x: number; y: number }[];
      targetEnemyId: string;
    }) => {
      const atkSim = units.find(u => u.id === payload.unitId);
      const defSim = units.find(u => u.id === payload.targetEnemyId);
      if (!atkSim || !defSim) return;

      const finalDest = { ...payload.destination };

      // 1. Detección de Emboscada (TRAP) si la niebla está activa
      if (isFogOfWarEnabled && viewerPerspective !== 'spectator') {
        const reachable = reachableCells.find(c => c.x === finalDest.x && c.y === finalDest.y) as any;
        const actualPath = payload.path && payload.path.length > 1
          ? payload.path
          : reachable?.path || [{ x: atkSim.x, y: atkSim.y }, finalDest];

        const activeTactical = convertedUnits.find(u => u.id === atkSim.id);
        if (activeTactical) {
          const trapCheck = FogOfWarEngine.checkTrapOnPath(
            activeTactical,
            actualPath,
            convertedUnits,
            viewerPerspective,
            convertedTiles
          );

          if (trapCheck.isTrapped) {
            triggerHaptic('trap');
            audioManager.playSFX('combat_hit');
            barkEngine.triggerBark({
              commanderId: playerCOs[turn].coId,
              triggerContext: 'trap_ambush',
              bondingLevel: 3,
              playerName: 'Comandante en Jefe',
            });
            setAmbushAlert({
              coord: trapCheck.interruptedAt,
              text: '¡EMBOSCADA DETECTADA! (TRAP)',
              startTime: performance.now(),
            });
            // La unidad se detiene y agota todo el turno
            setUnits(prev =>
              prev.map(u =>
                u.id === atkSim.id
                  ? { ...u, x: trapCheck.interruptedAt.x, y: trapCheck.interruptedAt.y, hasMoved: true, hasActed: true }
                  : u
              )
            );
            return;
          }
        }
      }

      // 2. Reclamación canónica de AirDrop si la casilla final tiene un suministro
      const dropOnCoord = airDrops.find(d => !d.isClaimed && d.x === finalDest.x && d.y === finalDest.y);
      if (dropOnCoord) {
        const claimResult = AirDropEngine.claimAirDrop(
          dropOnCoord,
          { id: atkSim.id, ownerId: turn, x: finalDest.x, y: finalDest.y },
          playerCOs[turn].coId
        );
        if (claimResult.success) {
          if (dropOnCoord.rewardType === 'funds') {
            setPlayerFunds(prev => ({ ...prev, [turn]: prev[turn] + dropOnCoord.rewardValue }));
          } else if (dropOnCoord.rewardType === 'co_power') {
            setPlayerCOs(prev => ({ ...prev, [turn]: { ...prev[turn], powerMeter: 54000 } }));
          }
          setAirDrops(prev => prev.map(d => (d.id === dropOnCoord.id ? claimResult.claimedDrop : d)));
        }
      }

      // 3. Audio balístico según el tipo de arma y háptica táctil
      triggerHaptic('attack');
      if (atkSim.code === 'infantry' || atkSim.code === 'recon') {
        audioManager.playSFX('machinegun');
      } else if (atkSim.code === 'artillery' || atkSim.code === 'rocket') {
        audioManager.playSFX('rocket');
      } else {
        audioManager.playSFX('cannon');
      }

      // 4. Cálculo balístico directo desde la casilla de destino proyectada
      const dist = Math.abs(finalDest.x - defSim.x) + Math.abs(finalDest.y - defSim.y);
      const inRange = dist >= atkSim.minRange && dist <= atkSim.maxRange;

      if (!inRange) {
        // Fuera de alcance: sólo trasladar la unidad
        setUnits(prev =>
          prev.map(u =>
            u.id === atkSim.id
              ? { ...u, x: finalDest.x, y: finalDest.y, hasMoved: true, hasActed: true }
              : u
          )
        );
        return;
      }

      const defenderTile = matchTiles[defSim.y]?.[defSim.x] || {
        defenseStars: 0,
        type: 'plains' as const,
        x: defSim.x,
        y: defSim.y,
      };
      const attackerTile = matchTiles[finalDest.y]?.[finalDest.x] || {
        defenseStars: 0,
        type: 'plains' as const,
        x: finalDest.x,
        y: finalDest.y,
      };

      const atkTactical: TacticalUnit = {
        id: atkSim.id,
        unitCode: atkSim.code,
        displayName: atkSim.name,
        ownerId: atkSim.owner,
        x: finalDest.x,
        y: finalDest.y,
        hp: atkSim.hp,
        maxHp: 10,
        ammo: 9,
        fuel: 99,
        movementPoints: atkSim.movePoints,
        movementType: atkSim.moveType,
        minRange: atkSim.minRange,
        maxRange: atkSim.maxRange,
        visionRange: 3,
        baseAttack: atkSim.baseAtk,
        productionCost: 1000,
        hasMoved: true,
        hasActed: true,
        skinId: equippedCosmetics[atkSim.code] || 'default',
      };

      const defTactical: TacticalUnit = {
        id: defSim.id,
        unitCode: defSim.code,
        displayName: defSim.name,
        ownerId: defSim.owner,
        x: defSim.x,
        y: defSim.y,
        hp: defSim.hp,
        maxHp: 10,
        ammo: 9,
        fuel: 99,
        movementPoints: defSim.movePoints,
        movementType: defSim.moveType,
        minRange: defSim.minRange,
        maxRange: defSim.maxRange,
        visionRange: 3,
        baseAttack: defSim.baseAtk,
        productionCost: 1000,
        hasMoved: false,
        hasActed: false,
        skinId: 'default',
      };

      const atkTileData: TerrainTile = {
        x: finalDest.x,
        y: finalDest.y,
        type: attackerTile.type,
        defenseStars: attackerTile.stars,
        ownerId: attackerTile.owner || null,
        captureHp: 20,
      };

      const defTileData: TerrainTile = {
        x: defSim.x,
        y: defSim.y,
        type: defenderTile.type,
        defenseStars: defenderTile.stars,
        ownerId: defenderTile.owner || null,
        captureHp: 20,
      };

      const atkCoState = playerCOs[atkSim.owner];
      const defCoState = playerCOs[defSim.owner];
      const coMods = COEngine.getCombatModifiers(
        atkTactical,
        defTactical,
        atkCoState,
        defCoState,
        playerFunds[atkSim.owner]
      );

      const engagement = CanonicalCombatEngine.calculateEngagement(
        atkTactical,
        defTactical,
        atkTileData,
        defTileData,
        {
          coAttackModifier: coMods.attackerModifier,
          coDefenseModifier: coMods.defenderModifier,
          deterministic: true,
          isTournamentMode: matchFormat === 'mirror_duel',
        }
      );

      const defRemaining = engagement.defenderHpAfter;
      const atkRemaining = engagement.attackerHpAfter;

      // Carga del medidor de energía CO
      const targetCost = CANONICAL_UNIT_PRODUCTION_CATALOG[defSim.code]?.cost ?? 1000;
      const ownCost = CANONICAL_UNIT_PRODUCTION_CATALOG[atkSim.code]?.cost ?? 1000;
      const atkCharge = COEngine.calculateCombatCharge(engagement.attackerDamageDealt, targetCost, engagement.counterDamageDealt, ownCost);
      const defCharge = COEngine.calculateCombatCharge(engagement.counterDamageDealt, ownCost, engagement.attackerDamageDealt, targetCost);

      setPlayerCOs(prev => ({
        ...prev,
        [atkSim.owner]: {
          ...prev[atkSim.owner],
          powerMeter: Math.min(
            COEngine.getPowerChargeThreshold(prev[atkSim.owner].coId, 'scop'),
            prev[atkSim.owner].powerMeter + atkCharge
          ),
        },
        [defSim.owner]: {
          ...prev[defSim.owner],
          powerMeter: Math.min(
            COEngine.getPowerChargeThreshold(prev[defSim.owner].coId, 'scop'),
            prev[defSim.owner].powerMeter + defCharge
          ),
        },
      }));

      setTimeout(() => {
        if (defRemaining <= 0) {
          audioManager.playSFX('explosion');
          if (matchKills === 0) {
            setPlayerFunds(prev => ({
              ...prev,
              [atkSim.owner]: prev[atkSim.owner] + 600,
            }));
            barkEngine.triggerBark({
              commanderId: playerCOs[turn].coId,
              triggerContext: 'kill_heavy_tank',
              unitName: '¡PRIMERA SANGRE! (+$600G)',
              bondingLevel: 3,
            });
          }
          setMatchKills(k => k + 1);
          setUnits(prev =>
            prev
              .filter(u => u.id !== defSim.id)
              .map(u => (u.id === atkSim.id ? { ...u, x: finalDest.x, y: finalDest.y, hp: atkRemaining, hasMoved: true, hasActed: true } : u))
          );
          setTargetEnemyId('');
          barkEngine.triggerBark({
            commanderId: playerCOs[turn].coId,
            triggerContext: 'kill_heavy_tank',
            unitName: defSim.name,
            bondingLevel: 3,
          });
        } else {
          if (defRemaining <= 2) {
            barkEngine.triggerBark({
              commanderId: playerCOs[turn].coId,
              triggerContext: 'enemy_near_miss',
              unitName: defSim.name,
              bondingLevel: 3,
            });
          }
          if (engagement.canCounterAttack && engagement.counterDamageDealt > 0) {
            audioManager.playSFX('cannon');
          }
          setUnits(prev =>
            prev.map(u => {
              if (u.id === defSim.id) return { ...u, hp: defRemaining };
              if (u.id === atkSim.id) return { ...u, x: finalDest.x, y: finalDest.y, hp: atkRemaining, hasMoved: true, hasActed: true };
              return u;
            })
          );
        }

        // Reloj Fischer
        const bonusSec = matchFormat === 'mirror_duel' ? 2 : matchFormat === 'blitz_skirmish' ? 3 : 4;
        const maxCapSec = matchFormat === 'mirror_duel' ? 25 : matchFormat === 'blitz_skirmish' ? 45 : 90;
        setTurnTimeRemaining(prev => Math.min(maxCapSec, prev + bonusSec));
      }, 350);
    },
    [
      units,
      matchTiles,
      isFogOfWarEnabled,
      viewerPerspective,
      reachableCells,
      convertedUnits,
      convertedTiles,
      airDrops,
      turn,
      playerCOs,
      equippedCosmetics,
      playerFunds,
      matchKills,
      matchFormat,
    ]
  );

  // Manejador Canónico de Sub-Acciones Tácticas (RFC Sección 1 / Entregable 4)
  const handleExecuteSubAction = (action: AvailableSubAction, targetCoord?: { x: number; y: number }) => {
    if (!selectedUnit) return;

    const bonusSec = matchFormat === 'mirror_duel' ? 2 : matchFormat === 'blitz_skirmish' ? 3 : 4;
    const maxCapSec = matchFormat === 'mirror_duel' ? 25 : matchFormat === 'blitz_skirmish' ? 45 : 90;

    if (action.type === 'wait') {
      const dest = targetCoord || { x: selectedUnit.x, y: selectedUnit.y };
      setUnits(prev =>
        prev.map(u =>
          u.id === selectedUnit.id
            ? { ...u, x: dest.x, y: dest.y, hasMoved: true, hasActed: true }
            : u
        )
      );
      setTurnTimeRemaining(prev => Math.min(maxCapSec, prev + bonusSec));
      audioManager.playSFX('button_click');
    } else if (action.type === 'capture') {
      handleExecuteCapture();
    } else if (action.type === 'join') {
      const dest = targetCoord || { x: selectedUnit.x, y: selectedUnit.y };
      const ally = units.find(u => u.id !== selectedUnit.id && u.x === dest.x && u.y === dest.y && u.owner === turn);
      if (ally) {
        const combined = ally.hp + selectedUnit.hp;
        const finalHp = Math.min(10, combined);
        const excess = Math.max(0, combined - 10);
        const cost = CANONICAL_UNIT_PRODUCTION_CATALOG[selectedUnit.code]?.cost ?? 1000;
        const refund = excess * Math.floor(cost / 10);

        if (refund > 0) {
          setPlayerFunds(prev => ({
            ...prev,
            [turn]: prev[turn] + refund,
          }));
        }

        setUnits(prev =>
          prev
            .filter(u => u.id !== selectedUnit.id)
            .map(u =>
              u.id === ally.id
                ? { ...u, hp: finalHp, hasMoved: true, hasActed: true }
                : u
            )
        );
        setTurnTimeRemaining(prev => Math.min(maxCapSec, prev + bonusSec));
        audioManager.playSFX('unit_order');
      }
    } else if (action.type === 'supply') {
      const dest = targetCoord || { x: selectedUnit.x, y: selectedUnit.y };
      setUnits(prev =>
        prev.map(u =>
          u.id === selectedUnit.id
            ? { ...u, x: dest.x, y: dest.y, hasMoved: true, hasActed: true }
            : u
        )
      );
      setTurnTimeRemaining(prev => Math.min(maxCapSec, prev + bonusSec));
      audioManager.playSFX('unit_order');
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-emerald-500 selection:text-slate-950">
      {/* Cabecera Militar Contextual para Sub-Vistas (Desacoplada del Lobby y del Combate) */}
      {mainNav !== 'lobby' && mainNav !== 'combat' && (
        <header className="border-b-2 border-[#181914] bg-[#2B2C24] px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 shadow-[0_4px_0px_#181914] sticky top-0 z-40 shrink-0 font-sans">
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                setMainNav('lobby');
                audioManager.playSFX('button_click');
              }}
              className="flex items-center gap-2 px-3 py-1.5 rounded-[8px_2px_8px_2px] bg-[#46521F] hover:bg-[#586827] text-[#F2E8D5] font-black text-xs uppercase tracking-wider border-2 border-[#181914] shadow-[3px_3px_0px_#181914] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all cursor-pointer"
              title="Volver al Cuartel General (Lobby Bélico)"
            >
              <ArrowLeft className="w-4 h-4 text-[#C46A3A]" />
              <span>Cuartel General</span>
            </button>
            <div className="h-6 w-0.5 bg-[#181914] hidden sm:block" />
            <div className="flex items-center gap-2">
              <span className="font-black text-xs sm:text-sm text-[#F2E8D5] uppercase tracking-wide">
                {mainNav === 'shop' && 'Intendencia Militar • Suministros'}
                {mainNav === 'armory' && 'Hangar de Personalización de Tropas'}
                {mainNav === 'industry' && 'Complejo Industrial Militar'}
                {mainNav === 'marketplace' && 'Bolsa Negra P2P • Comercio Táctico'}
                {mainNav === 'clans' && 'Cuartel General Corporativo'}
                {mainNav === 'docs' && 'Archivos de Doctrina Militar & Inteligencia'}
                {mainNav === 'qa' && 'Centro de Telemetría Táctica'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Medidores de Recursos en Tiempo Real */}
            <div className="flex items-center gap-2 text-xs font-mono font-bold">
              <span className="px-2.5 py-1 rounded bg-[#181914] border border-[#7B8A4A]/50 text-amber-400">
                💰 {userGold.toLocaleString()}G
              </span>
              <span className="px-2.5 py-1 rounded bg-[#181914] border border-[#7B8A4A]/50 text-purple-300">
                💎 {userGems.toLocaleString()}
              </span>
              <span className="px-2.5 py-1 rounded bg-[#181914] border border-[#7B8A4A]/50 text-[#7B8A4A]">
                ⚙️ {industrialInventory.refinedSteel} Acero
              </span>
            </div>

            {/* Expediente Militar del Comandante */}
            <button
              onClick={() => {
                setIsProfileModalOpen(true);
                audioManager.playSFX('button_click');
              }}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-[6px_2px_6px_2px] bg-[#46521F] hover:bg-[#586827] text-[#F2E8D5] text-xs font-mono font-bold border-2 border-[#181914] shadow-[2px_2px_0px_#181914] transition-all cursor-pointer"
              title="Abrir Expediente Militar, Identidad y Cosméticos"
            >
              <User className="w-3.5 h-3.5 text-[#C46A3A]" />
              <span className="hidden sm:inline">{userProfileIdentity.displayName}</span>
              <span className="text-[#7B8A4A]">{userProfileIdentity.tagId}</span>
            </button>

            {/* Selector de Modo Competitivo: Torneo (Cap N11) vs Ladder (N1-N15) */}
            <button
              onClick={() => {
                setIsTournamentMode(!isTournamentMode);
                audioManager.playSFX('button_click');
              }}
              className={`hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-[6px_2px_6px_2px] text-xs font-mono font-bold border-2 border-[#181914] shadow-[2px_2px_0px_#181914] transition-all cursor-pointer ${
                isTournamentMode
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/50'
                  : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50'
              }`}
              title="Conmutar entre Cap de Torneo Esports (Nivel 11) y Ladder Asimétrico Diario (Nivel 1-15)"
            >
              <Trophy className="w-3.5 h-3.5" />
              <span>{isTournamentMode ? 'Torneo (Cap N11)' : 'Ladder (N1-N15)'}</span>
            </button>

            {/* Botón de Despliegue Rápido al Frente (Garantía Red Teaming: 1 Clic desde Cualquier Menú) */}
            <button
              onClick={() => handleStartMatchFromLobby('blitz_skirmish')}
              className="flex items-center gap-2 px-3.5 py-1.5 rounded-[8px_2px_8px_2px] bg-[#C46A3A] hover:bg-[#d67440] text-[#F2E8D5] font-black text-xs uppercase tracking-wider border-2 border-[#181914] shadow-[3px_3px_0px_#181914] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all cursor-pointer animate-pulse"
              title="Desplegar inmediatamente al campo de batalla en 1 solo clic"
            >
              <Sword className="w-3.5 h-3.5 text-yellow-300" />
              <span>Desplegar al Frente</span>
            </button>
          </div>
        </header>
      )}

      {/* Renderizado Condicional de Vistas: Lobby Bélico Principal */}
      {mainNav === 'lobby' ? (
        <WarLobbyHub
          userGold={userGold}
          userGems={userGems}
          userSteel={industrialInventory.refinedSteel}
          userLevel={simLevel}
          userXp={850}
          nextLevelXp={requiredXpForLevel}
          clanName={clan.name}
          clanTag={clan.tag}
          clanEmblem={clan.emblemIcon}
          clan={clan}
          industrialInventory={industrialInventory}
          safeguardInventory={safeguardInventory}
          winStreak={safeguardInventory.currentStreak}
          userTrophies={userTrophies}
          shieldCharges={shieldCharges}
          isTournamentMode={isTournamentMode}
          onToggleTournament={() => {
            setIsTournamentMode(!isTournamentMode);
            audioManager.playSFX('button_click');
          }}
          onStartMatch={handleStartMatchFromLobby}
          onOpenShop={() => setMainNav('shop')}
          onOpenArmory={() => setMainNav('armory')}
          onOpenIndustry={() => setMainNav('industry')}
          onOpenMarketplace={() => setMainNav('marketplace')}
          onOpenClans={() => setMainNav('clans')}
          onOpenDocs={() => setMainNav('docs')}
          onOpenEditor={() => setIsDevStudioOpen(true)}
          onOpenProfile={() => setIsProfileModalOpen(true)}
        />
      ) : mainNav === 'shop' ? (
        <React.Suspense fallback={<TacticalLoadingFallback />}>
          <div className="flex-1 overflow-y-auto p-4 lg:p-6 max-w-7xl mx-auto w-full">
            <ShopCatalog
              userGold={userGold}
              userGems={userGems}
              unlockedSkinIds={unlockedSkinIds}
              equippedSkins={equippedCosmetics}
              onPurchaseSuccess={handlePurchaseSuccess}
              onEquipSkin={handleEquipSkin}
            />
          </div>
        </React.Suspense>
      ) : mainNav === 'armory' ? (
        <React.Suspense fallback={<TacticalLoadingFallback />}>
          <div className="flex-1 overflow-y-auto p-4 lg:p-6 max-w-7xl mx-auto w-full">
            <LoadoutCustomizer
              equippedCosmetics={equippedCosmetics}
              unlockedSkinIds={unlockedSkinIds}
              activeLoadoutUnits={activeLoadoutUnits}
              onEquipSkin={handleEquipSkin}
              onUpdateLoadout={setActiveLoadoutUnits}
              onNavigateToShop={() => setMainNav('shop')}
            />
          </div>
        </React.Suspense>
      ) : mainNav === 'industry' ? (
        <React.Suspense fallback={<TacticalLoadingFallback />}>
          <div className="flex-1 overflow-y-auto w-full flex flex-col">
            <IndustrialComplexView
              inventory={industrialInventory}
              onUpdateInventory={setIndustrialInventory}
              activeJobs={activeRefiningJobs}
              onUpdateJobs={setActiveRefiningJobs}
              onNavigateToMarket={() => setMainNav('marketplace')}
              userCredits={userGold}
              onUpdateUserCredits={setUserGold}
              accountLevel={simLevel}
            />
          </div>
        </React.Suspense>
      ) : mainNav === 'marketplace' ? (
        <React.Suspense fallback={<TacticalLoadingFallback />}>
          <div className="flex-1 overflow-y-auto w-full flex flex-col">
            <P2PMarketplaceView
              currentUserId="user_commander_01"
              currentUserName="Comandante en Jefe"
              userGold={userGold}
              onUpdateUserGold={setUserGold}
              inventory={industrialInventory}
              onUpdateInventory={setIndustrialInventory}
              onNavigateToIndustry={() => setMainNav('industry')}
            />
          </div>
        </React.Suspense>
      ) : mainNav === 'clans' ? (
        <React.Suspense fallback={<TacticalLoadingFallback />}>
          <div className="flex-1 overflow-y-auto w-full flex flex-col">
            <ClanHeadquartersView
              clan={clan}
              onUpdateClan={setClan}
              members={clanMembers}
              onUpdateMembers={setClanMembers}
              currentUserId="user_commander_01"
              userGold={userGold}
              onUpdateUserGold={setUserGold}
              userSteel={industrialInventory.refinedSteel}
              onUpdateUserSteel={newSteel =>
                setIndustrialInventory(prev => ({ ...prev, refinedSteel: newSteel }))
              }
              userChips={industrialInventory.refinedMicrochip}
              onUpdateUserChips={newChips =>
                setIndustrialInventory(prev => ({ ...prev, refinedMicrochip: newChips }))
              }
              safeguardInventory={safeguardInventory}
              onUpdateSafeguardInventory={setSafeguardInventory}
            />
          </div>
        </React.Suspense>
      ) : mainNav === 'qa' ? (
        <React.Suspense fallback={<TacticalLoadingFallback />}>
          <QADevOpsRunner />
        </React.Suspense>
      ) : mainNav === 'combat' ? (
        <CombatTheaterView
          matchFormat={matchFormat}
          turn={turn}
          turnNumber={turnNumber}
          turnTimeRemaining={turnTimeRemaining}
          playerFunds={playerFunds}
          p1Income={p1Income}
          p2Income={p2Income}
          gameMode={gameMode}
          setGameMode={handleSetGameMode}
          botDifficulty={botDifficulty}
          setBotDifficulty={setBotDifficulty}
          isBotThinking={isBotThinking}
          botActionLog={botActionLog}
          handleEndTurn={handleEndTurn}
          units={units}
          matchTiles={matchTiles}
          convertedTiles={convertedTiles}
          convertedUnits={convertedUnits}
          selectedUnit={selectedUnit}
          setSelectedUnitId={setSelectedUnitId}
          targetEnemy={targetEnemy}
          setTargetEnemyId={setTargetEnemyId}
          reachableCells={reachableCells}
          handleMoveUnit={handleMoveUnit}
          combatResult={combatResult}
          handleExecuteCombat={handleExecuteCombat}
          handleAtomicMoveAndAttack={handleAtomicMoveAndAttack}
          currentTileUnderSelected={currentTileUnderSelected}
          canActiveUnitCapture={canActiveUnitCapture}
          handleExecuteCapture={handleExecuteCapture}
          onExecuteSubAction={handleExecuteSubAction}
          selectedMapId={selectedMapId}
          setSelectedMapId={setSelectedMapId}
          predefinedMapsMeta={predefinedMapsMeta}
          customMaps={customMaps}
          activeMap={activeMap}
          setIsImportModalOpen={setIsImportModalOpen}
          coInspectorView={coInspectorView}
          setCoInspectorView={setCoInspectorView}
          playerCOs={playerCOs}
          setPlayerCOs={setPlayerCOs}
          handleActivateCOPower={handleActivateCOPower}
          viewMode={viewMode}
          setViewMode={setViewMode}
          showLoadingRadar={showLoadingRadar}
          setShowLoadingRadar={setShowLoadingRadar}
          isFogOfWarEnabled={isFogOfWarEnabled}
          setIsFogOfWarEnabled={setIsFogOfWarEnabled}
          viewerPerspective={viewerPerspective}
          setViewerPerspective={setViewerPerspective}
          fowWeather={fowWeather}
          setFowWeather={setFowWeather}
          sonjaSensorActive={sonjaSensorActive}
          setSonjaSensorActive={setSonjaSensorActive}
          currentVision={currentVision}
          ambushAlert={ambushAlert}
          airDrops={airDrops}
          setSelectedFactoryCoord={setSelectedFactoryCoord}
          setIsProductionModalOpen={setIsProductionModalOpen}
          isTacticalDrawerOpen={isTacticalDrawerOpen}
          setIsTacticalDrawerOpen={setIsTacticalDrawerOpen}
          onRetreatToLobby={() => {
            setMainNav('lobby');
            audioManager.playSFX('button_click');
          }}
          onBarkTrigger={() => {
            barkEngine.triggerBark({
              commanderId: playerCOs[coInspectorView].coId,
              triggerContext: 'match_start',
              bondingLevel: 3,
              playerName: 'Comandante en Jefe',
            });
          }}
        />
      ) : (
        /* Contenedor Principal en Layout Dual */
        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Barra Lateral Izquierda: Selector de Documentos */}
        <aside className="w-full lg:w-80 border-r border-slate-800 bg-slate-900/50 p-4 flex flex-col gap-3 shrink-0">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Buscar en documentación..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 text-xs rounded pl-9 pr-3 py-2 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
            />
          </div>

          <div className="text-[11px] font-mono uppercase tracking-wider text-slate-400 px-1 pt-1 flex items-center justify-between">
            <span>Archivos /docs</span>
            <span>{filteredDocs.length} specs</span>
          </div>

          <div className="space-y-1.5 overflow-y-auto max-h-[40vh] lg:max-h-[calc(100vh-230px)] pr-1">
            {filteredDocs.map(doc => {
              const isActive = doc.id === activeTab;
              return (
                <button
                  key={doc.id}
                  onClick={() => setActiveTab(doc.id)}
                  className={`w-full text-left p-3 rounded border transition-all text-xs flex flex-col gap-1.5 ${
                    isActive
                      ? 'bg-emerald-950/40 border-emerald-500/50 text-white shadow-[0_0_12px_rgba(16,185,129,0.15)]'
                      : 'bg-slate-900/40 border-slate-800/80 hover:bg-slate-800/60 text-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <span className="font-mono text-[10px] text-emerald-400 font-semibold">{doc.badge}</span>
                    <span className="font-mono text-[9px] text-slate-500">{doc.filename.split('/').pop()}</span>
                  </div>
                  <div className="font-semibold text-slate-200 line-clamp-1">{doc.title}</div>
                  <div className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">{doc.summary}</div>
                </button>
              );
            })}
          </div>

          {/* Acceso Táctico a Despliegue en el Frente */}
          <div className="mt-auto pt-3 border-t border-[#181914]">
            <div className="p-3 rounded-[8px_2px_8px_2px] bg-[#181914] border-2 border-[#181914] flex flex-col gap-2">
              <div className="flex items-center gap-2 text-xs font-mono text-[#F2E8D5] font-black uppercase">
                <Crosshair className="w-3.5 h-3.5 text-[#C46A3A]" />
                TEATRO DE COMBATE DIRECTO
              </div>
              <p className="text-[11px] text-[#F2E8D5]/70 leading-relaxed font-sans">
                Prueba en tiempo real las soluciones balísticas, rutas tácticas A* y el mérito operativo en el Frente.
              </p>
              <button
                onClick={() => handleStartMatchFromLobby('blitz_skirmish')}
                className="mt-1 py-1.5 px-3 rounded-[6px_2px_6px_2px] bg-[#46521F] hover:bg-[#586827] text-[#F2E8D5] font-black text-xs uppercase tracking-wider border-2 border-[#181914] shadow-[2px_2px_0px_#181914] flex items-center justify-center gap-1.5 transition-all cursor-pointer"
              >
                <Sword className="w-3 h-3 text-yellow-300" />
                <span>Desplegar al Frente</span>
              </button>
            </div>
          </div>
        </aside>

        {/* Panel Central: Contenido del Documento y Pestañas Interactivas */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-6 space-y-6">
          {/* Tarjeta del Documento Actual */}
          <section className="bg-slate-900 border border-slate-800 rounded-lg p-5 shadow-lg">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-4 mb-5">
              <div>
                <div className="flex items-center gap-2 text-xs font-mono text-emerald-400 mb-1">
                  <span className="px-2 py-0.5 rounded bg-emerald-950 border border-emerald-800/50 font-bold">
                    {currentDoc.badge}
                  </span>
                  <span className="text-slate-500 font-mono">ruta: /{currentDoc.filename}</span>
                </div>
                <h2 className="text-xl sm:text-2xl font-bold text-white">{currentDoc.title}</h2>
                <p className="text-xs text-slate-400 mt-1">{currentDoc.summary}</p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleCopy(currentDoc.sections.map(s => `## ${s.heading}\n${s.content}\n${s.codeSnippet?.code || ''}`).join('\n\n'), currentDoc.id)}
                  className="px-3 py-1.5 bg-[#181914] hover:bg-[#46521F] text-xs font-mono font-bold rounded-[6px_2px_6px_2px] border-2 border-[#181914] flex items-center gap-1.5 text-[#F2E8D5] shadow-[2px_2px_0px_#181914] transition-all cursor-pointer"
                >
                  {copiedKey === currentDoc.id ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-[#C46A3A]" />}
                  <span>Transmitir Inteligencia Completa</span>
                </button>
              </div>
            </div>

            {/* Secciones del Documento */}
            <div className="space-y-6">
              {currentDoc.sections.map((sec, idx) => (
                <div key={idx} className="space-y-2.5">
                  <h3 className="text-sm font-bold font-mono text-emerald-300 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                    {sec.heading}
                  </h3>
                  <div className="text-xs sm:text-sm text-slate-300 whitespace-pre-line leading-relaxed bg-slate-950/40 p-3.5 rounded border border-slate-800/60 font-sans">
                    {sec.content}
                  </div>

                  {sec.codeSnippet && (
                    <div className="mt-3 rounded border border-slate-800 bg-slate-950 overflow-hidden">
                      <div className="bg-slate-900/80 px-3 py-1.5 border-b border-slate-800 flex items-center justify-between text-[11px] font-mono text-slate-400">
                        <span>{sec.codeSnippet.language.toUpperCase()} SNIPPET</span>
                        <button
                          onClick={() => handleCopy(sec.codeSnippet!.code, `code_${idx}`)}
                          className="flex items-center gap-1 hover:text-white transition-colors text-slate-300 cursor-pointer"
                        >
                          {copiedKey === `code_${idx}` ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-[#C46A3A]" />}
                          <span>Copiar Cifra Militar</span>
                        </button>
                      </div>
                      <pre className="p-3 text-xs font-mono text-emerald-300/90 overflow-x-auto leading-relaxed">
                        <code>{sec.codeSnippet.code}</code>
                      </pre>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>

          {/* Llamada Táctica a Despliegue en el Frente */}
          <section className="bg-[#2B2C24] border-2 border-[#181914] rounded-lg p-5 shadow-[4px_4px_0px_#181914] flex flex-col sm:flex-row items-center justify-between gap-4 font-mono">
            <div>
              <div className="flex items-center gap-2 text-xs text-[#7B8A4A] font-black uppercase mb-1">
                <Sword className="w-4 h-4 text-[#C46A3A]" />
                <span>Doctrina Operacional & Validación en Combate</span>
              </div>
              <h3 className="text-base font-black text-[#F2E8D5]">¿Listo para ejecutar esta doctrina táctica?</h3>
              <p className="text-xs text-[#F2E8D5]/70 mt-0.5">
                Despliega inmediatamente al Frente de Combate en pantalla completa con soporte de AWBW, niebla de guerra y duelo con IA.
              </p>
            </div>
            <button
              onClick={() => handleStartMatchFromLobby('blitz_skirmish')}
              className="px-4 py-2.5 rounded-[8px_2px_8px_2px] bg-[#C46A3A] hover:bg-[#d67440] text-[#F2E8D5] font-black text-xs uppercase tracking-wider border-2 border-[#181914] shadow-[3px_3px_0px_#181914] flex items-center gap-2 cursor-pointer active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all shrink-0 animate-pulse"
            >
              <Crosshair className="w-4 h-4 text-yellow-300" />
              <span>Desplegar al Frente Táctico</span>
            </button>
          </section>

        </main>
      </div>
      )}

      {/* Modal Importador de Mapas de la Comunidad (AWBW) */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl max-w-2xl w-full p-6 text-slate-200 flex flex-col gap-4 font-mono">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
                  <UploadCloud className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Importador de Mapas de la Comunidad (AWBW)</h3>
                  <p className="text-[11px] text-slate-400">
                    Soporta matrices de losetas CSV canónicas (Advance Wars by Web / WarsWorld IDs 1-194).
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsImportModalOpen(false)}
                className="text-slate-400 hover:text-white text-lg font-bold px-2 py-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="flex flex-col gap-3">
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">Nombre del Escenario:</label>
                <input
                  type="text"
                  value={importMapName}
                  onChange={(e) => setImportMapName(e.target.value)}
                  placeholder="Ej: Asalto a la Península (1v1)"
                  className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-slate-300">
                    Matriz de Losetas (Valores separados por comas, fila por línea):
                  </label>
                  <div className="flex items-center gap-1.5 text-[10px]">
                    <button
                      onClick={() => {
                        setImportMapName('Caustic Finale (Copia)');
                        setImportRawTiles(predefinedMapsMeta[1].rawTileData.trim());
                      }}
                      className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer"
                    >
                      Ej: Caustic Finale
                    </button>
                    <button
                      onClick={() => {
                        setImportMapName('1v1 Issus (Copia)');
                        setImportRawTiles(predefinedMapsMeta[2].rawTileData.trim());
                      }}
                      className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer"
                    >
                      Ej: Issus
                    </button>
                    <button
                      onClick={() => setImportRawTiles('')}
                      className="px-2 py-0.5 rounded bg-red-950/60 hover:bg-red-900/60 text-red-300 cursor-pointer"
                    >
                      Limpiar
                    </button>
                  </div>
                </div>
                <textarea
                  rows={8}
                  value={importRawTiles}
                  onChange={(e) => setImportRawTiles(e.target.value)}
                  placeholder="1,34,2,3,16,1,28...&#10;1,1,39,16,5,2...&#10;Pega aquí las filas de números exportadas desde AWBW"
                  className="w-full bg-slate-950 border border-slate-800 rounded p-2.5 text-[11px] font-mono text-emerald-300 focus:outline-none focus:border-emerald-500 resize-none leading-relaxed"
                />
              </div>

              {/* Tarjeta de Validación en Tiempo Real */}
              {importPreview ? (
                importPreview.valid ? (
                  <div className="bg-emerald-950/40 border border-emerald-500/40 rounded p-3 text-xs flex flex-col gap-1.5">
                    <div className="flex items-center justify-between text-emerald-400 font-bold">
                      <span>✓ Matriz AWBW Válida</span>
                      <span>{importPreview.width} x {importPreview.height} casillas ({importPreview.width * importPreview.height} tiles)</span>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] text-slate-300 mt-1">
                      <div className="bg-slate-900/80 p-2 rounded border border-slate-800">
                        <span className="text-slate-400">Azul (P1):</span> {importPreview.p1Props} props
                      </div>
                      <div className="bg-slate-900/80 p-2 rounded border border-slate-800">
                        <span className="text-slate-400">Rojo (P2):</span> {importPreview.p2Props} props
                      </div>
                      <div className="bg-slate-900/80 p-2 rounded border border-slate-800">
                        <span className="text-slate-400">Rojo (P2):</span> {importPreview.p2Props} props
                      </div>
                      <div className="bg-slate-900/80 p-2 rounded border border-slate-800">
                        <span className="text-slate-400">Neutrales:</span> {importPreview.neutralProps} props
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-red-950/40 border border-red-500/40 rounded p-3 text-xs text-red-300 flex items-center justify-between">
                    <span>⚠️ Error al procesar: {importPreview.error}</span>
                  </div>
                )
              ) : null}
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-800">
              <button
                onClick={() => setIsImportModalOpen(false)}
                className="px-4 py-2 rounded text-xs text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                disabled={!importPreview?.valid}
                onClick={() => {
                  if (importPreview?.valid && importPreview.data) {
                    const newMap = importPreview.data;
                    setCustomMaps(prev => [newMap, ...prev.filter(m => m.id !== newMap.id)]);
                    setSelectedMapId(newMap.id);
                    setIsImportModalOpen(false);
                    audioManager.playSFX('button_click');
                  }
                }}
                className={`px-4 py-2 rounded text-xs font-bold transition-all ${
                  importPreview?.valid
                    ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-[0_0_12px_rgba(16,185,129,0.4)] cursor-pointer'
                    : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                }`}
              >
                Cargar en el Simulador
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Ensamblaje Militar / Producción Canónica (Mazo de 10 Cartas - Sin Cooldowns) */}
      <ProductionModal
        isOpen={isProductionModalOpen}
        onClose={() => {
          setIsProductionModalOpen(false);
          setSelectedFactoryCoord(null);
        }}
        currentFunds={playerFunds[turn]}
        player={turn}
        facilityCoord={selectedFactoryCoord}
        facilityTile={selectedFactoryCoord ? matchTiles[selectedFactoryCoord.y]?.[selectedFactoryCoord.x] || null : null}
        onProduce={handleProduceUnit}
        coId={playerCOs[turn].coId}
        activeDeck={activeDeck}
        currentUnitCount={units.filter(u => u.owner === turn).length}
      />

      {/* Modal de Fin de Partida (Lazy Loaded) */}
      <React.Suspense fallback={null}>
        <MatchSummaryModal
          isOpen={isSummaryModalOpen}
          onClose={() => setIsSummaryModalOpen(false)}
          isMirrorDuel={matchFormat === 'mirror_duel'}
          onInstantRequeue={() => {
            setIsSummaryModalOpen(false);
            resetMatchState('mirror_duel');
            audioManager.playSFX('co_power');
          }}
          onRematch={() => {
            setIsSummaryModalOpen(false);
            resetMatchState();
          }}
          data={{
            isVictory,
            matchId: 'match_preview_01',
            turnsPlayed: matchTurns,
            citiesCaptured: matchCities,
            unitsDestroyed: matchKills,
            xpGained: matchResultXp,
            goldGained: matchResultCredits,
            eloDelta: isVictory ? 20 : -15,
            currentLevel: simLevel,
            currentXp: 850,
            nextLevelXp: requiredXpForLevel,
            leveledUp: matchResultXp + 850 >= requiredXpForLevel,
            newLevel: matchResultXp + 850 >= requiredXpForLevel ? simLevel + 1 : undefined,
          }}
        />
      </React.Suspense>

      {/* Modal de Diagnóstico Balístico Post-Combate (Near-Miss) */}
      {activeNearMissReport && (
        <React.Suspense fallback={null}>
          <NearMissAnalysisModal
            report={activeNearMissReport}
            isOpen={!!activeNearMissReport}
            onClose={() => setActiveNearMissReport(null)}
            onNavigateToMarketplace={() => {
              setActiveNearMissReport(null);
              setMainNav('marketplace');
            }}
            onNavigateToIndustry={() => {
              setActiveNearMissReport(null);
              setMainNav('industry');
            }}
          />
        </React.Suspense>
      )}

      {/* Modal de Oferta Flash de Emergencia por Tilt ($0.99 en 180s) */}
      {activeTiltOffer && (
        <React.Suspense fallback={null}>
          <TiltEmergencyOfferModal
            offer={activeTiltOffer}
            isOpen={!!activeTiltOffer}
            onClose={() => setActiveTiltOffer(null)}
            onPurchaseSuccess={handleTiltPurchaseSuccess}
          />
        </React.Suspense>
      )}

      {/* Modal de Expediente Militar e Identidad del Comandante (Fase 8) */}
      <React.Suspense fallback={null}>
        <CommanderProfileModal
          isOpen={isProfileModalOpen}
          onClose={() => setIsProfileModalOpen(false)}
          profile={userProfileIdentity}
          onUpdateProfile={setUserProfileIdentity}
          userGems={userGems}
          onUpdateUserGems={setUserGems}
        />
      </React.Suspense>

      {/* Overlay Flotante del Bark Engine de Novela Gráfica */}
      <ComicVignetteOverlay />

      {/* Herramienta Interna de Desarrollo: Tactical Studio Editor (Desacoplado) */}
      {isDevStudioOpen && (
        <React.Suspense fallback={<TacticalLoadingFallback />}>
          <div className="fixed inset-0 z-50 flex flex-col bg-[#2B2C24]">
            <TacticalStudioEditor onClose={() => setIsDevStudioOpen(false)} />
          </div>
        </React.Suspense>
      )}

      {/* Pie de Página Militar Diegético con Acceso a Doctrina y Cartografía */}
      <footer className="border-t-2 border-[#181914] bg-[#2B2C24] px-4 py-2 text-center text-xs text-[#7B8A4A] font-mono flex flex-wrap items-center justify-between gap-2 shadow-[0_-2px_0px_#181914]">
        <div className="flex items-center gap-3">
          <span className="text-[#F2E8D5]/70">Red Operacional de Alta Disponibilidad • Cifrado Militar Cuántico</span>
          <button
            onClick={() => setIsDevStudioOpen(true)}
            className="px-2.5 py-1 rounded-[8px_2px_8px_2px] bg-[#181914] hover:bg-[#46521F] text-[#F2E8D5] hover:border-[#7B8A4A] border-2 border-[#181914] text-[10px] font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-[2px_2px_0px_#181914]"
            title="Terminal de Mando y Edición Táctica de Doctrina, Mapas y Fuerzas"
          >
            <Wrench className="w-3 h-3 text-[#C46A3A]" />
            <span>Terminal de Cartografía y Doctrina</span>
          </button>
        </div>
        <span className="text-[#F2E8D5]/60">Protocolo Canónico de Defensa Territorial • Estado Mayor Conjunto</span>
      </footer>
    </div>
  );
}

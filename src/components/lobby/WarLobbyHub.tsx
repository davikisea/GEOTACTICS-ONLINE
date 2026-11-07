/**
 * ==============================================================================
 * CENTRAL DE INTELIGENCIA MILITAR & CUARTEL GENERAL (WAR LOBBY HUB v5.0.0)
 * ==============================================================================
 * Rediseño Competitivo "The Living Comic Canvas" conforme a @tactical-command-intel
 * e @indie-game-ui-architect:
 * - Cuadrante Izquierdo/Central (~58%): CommanderLivingVignette con el Comandante
 *   Táctico activo a cuerpo completo (smoothFull), respiración procedural, parallax
 *   y bocadillo persistente del Bark Engine (hora del día, último resultado, clic
 *   y hover sobre terminales).
 * - Cuadrante Derecho (~42%): Matriz de Navegación Diegética conectada al 100%
 *   con las tablas y estaciones reales (Despliegue, Hangar, Cuartel de Oficiales,
 *   Industria & Silos, Intendencia, Corporación/Clanes, Expediente Militar).
 * - Shell Persistente (Zero-Unmount HQ): Renderiza las sub-vistas superpuestas sin
 *   desmontar el estado del lobby ni reiniciar temporizadores.
 */

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ArrowLeft,
  Sword,
  Swords,
  Zap,
  Palette,
  Users,
  Factory,
  ShoppingBag,
  Shield,
  Trophy,
  Scale,
  Crosshair,
  Activity,
  Award,
  Radar,
  Globe,
  MapPin,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { MatchFormat } from '../../engine/autonomousOrchestrator';
import { Clan, SafeguardInventory } from '../../engine/clanSystem';
import { IndustrialInventory } from '../../engine/industrialEngine';
import { RankedLadderEngine } from '../../engine/rankedLadderEngine';
import {
  CANONICAL_CO_REGISTRY,
  COId,
  resolveCanonicalCOId,
} from '../../engine/coSystem';
import { LobbyBarkIntent } from '../../engine/barkEngine';
import { audioManager } from '../../engine/audioManager';
import { supabase } from '../../lib/supabase/client';
import { DualResourceHeader } from './DualResourceHeader';
import { CommanderBarkWidget, BarkMessage } from '../comic/CommanderBarkWidget';
import { ParadoxCommandDrawer } from '../metagame/ParadoxCommandDrawer';
import { CommandHUD } from './CommandHUD';
import { CommanderLivingVignette } from './CommanderLivingVignette';
import { TacticalDock, LobbyStationView } from './TacticalDock';
import { TacticalGhostBar } from './TacticalGhostBar';
import { WarRoomModal, PrizeItem } from './WarRoomModal';
import { TacticalWorldMap } from '../world/TacticalWorldMap';
import { TerritoryInspectorModal } from '../world/TerritoryInspectorModal';
import { UnitHangarModal } from '../world/UnitHangarModal';
import { GarrisonManagementDrawer } from '../world/GarrisonManagementDrawer';
import { StateInspectorDrawer } from '../world/StateInspectorDrawer';
import type { UserRoleContext } from '../../types/stateSovereigntyTypes';
import { MetaCommandConsole } from '../metagame/MetaCommandConsole';
import { useTerritoryMap } from '../../hooks/useTerritoryMap';
import { useTerritoryEconomyTicker } from '../../hooks/useTerritoryEconomyTicker';

export interface WarLobbyHubProps {
  userId?: string;
  onDeployCombat?: (format: MatchFormat, context?: any) => void;
  onStartMatch?: (format: MatchFormat, context?: any) => void;
  onNavigateToView?: (view: LobbyStationView) => void;
  onOpenShop?: () => void;
  onOpenArmory?: () => void;
  onOpenIndustry?: () => void;
  onOpenMarketplace?: () => void;
  onOpenClans?: () => void;
  onOpenDocs?: () => void;
  onOpenEditor?: () => void;
  onOpenProfile?: () => void;
  onOpenLoadingScreen?: () => void;
  userGold: number;
  userGems: number;
  userSteel?: number;
  userLevel?: number;
  userXp?: number;
  nextLevelXp?: number;
  clanName?: string;
  clanTag?: string;
  clanEmblem?: string;
  clan?: Clan;
  industrialInventory?: IndustrialInventory;
  safeguardInventory?: SafeguardInventory;
  isTournamentMode: boolean;
  onToggleTournament?: () => void;
  onToggleTournamentMode?: () => void;
  activeStreakMultiplier?: number;
  winStreak?: number;
  simLevel?: number;
  userTrophies?: number;
  shieldCharges?: number;
  // Sincronización con el Comandante Táctico Activo (28 COs smoothFull)
  activeCommanderId?: COId | string;
  onSelectCommander?: (coId: COId) => void;
  commanderBondLevel?: number;
  lastMatchResult?: 'victory' | 'defeat' | null;
  // Extensiones para el Shell Diegético Persistente (Zero-Unmount)
  activeStation?: LobbyStationView | null;
  onCloseStation?: () => void;
  onGainGold?: (deltaGold: number) => void;
  onGainSteel?: (deltaSteel: number) => void;
  isGuestMode?: boolean;
  onOpenAuthModal?: (customNotice?: string) => void;
  children?: React.ReactNode;
}

const STATION_TITLES: Record<LobbyStationView, { badge: string; title: string }> = {
  shop: { badge: 'ESTACIÓN 01 // INTENDENCIA', title: 'Intendencia Militar • Suministros & Skins' },
  industry: { badge: 'ESTACIÓN 02 // FUNDICIÓN', title: 'Complejo Industrial • Refinería & Silos' },
  armory: { badge: 'ESTACIÓN 03 // HANGAR', title: 'Hangar de Tropas • Mazo de 10 Cartas' },
  marketplace: { badge: 'ESTACIÓN 04 // COMERCIO', title: 'Bolsa Negra P2P • Mercado de Recursos' },
  clans: { badge: 'ESTACIÓN 05 // CORPORACIÓN', title: 'Cuartel General de Alianza & Salvaguarda' },
  docs: { badge: 'ESTACIÓN 06 // INTELIGENCIA', title: 'Archivos de Doctrina Militar & Especificaciones' },
  qa: { badge: 'ESTACIÓN 07 // TELEMETRÍA', title: 'Centro de Telemetría Táctica & QA' },
};

const WHEEL_PRIZES: PrizeItem[] = [
  { text: '1,500 FONDOS ($G)', color: '#2B2C24', type: 'gold', amount: 1500, rarity: 'COMMON' },
  { text: '45t ACERO REFINADO', color: '#46521F', type: 'steel', amount: 45, rarity: 'RARE' },
  { text: '+20 CÉLULAS ENERGÍA', color: '#C46A3A', type: 'energy', amount: 20, rarity: 'COMMON' },
  { text: '5,000 FONDOS ($G)', color: '#161712', type: 'gold', amount: 5000, rarity: 'LEGENDARY' },
  { text: '100 GEMAS TÁCTICAS', color: '#4C1D95', type: 'gems', amount: 100, rarity: 'EPIC' },
  { text: '120t ACERO PESADO', color: '#1D4ED8', type: 'steel', amount: 120, rarity: 'EPIC' },
];

export const WarLobbyHub: React.FC<WarLobbyHubProps> = ({
  userId,
  onDeployCombat,
  onStartMatch,
  onNavigateToView,
  onOpenShop,
  onOpenArmory,
  onOpenIndustry,
  onOpenMarketplace,
  onOpenClans,
  onOpenDocs,
  onOpenEditor,
  onOpenProfile,
  onOpenLoadingScreen,
  userGold,
  userGems,
  userSteel = 25,
  userLevel,
  userXp = 720,
  nextLevelXp = 1000,
  clanName,
  clanTag,
  clan,
  industrialInventory,
  safeguardInventory,
  isTournamentMode,
  onToggleTournament,
  onToggleTournamentMode,
  activeStreakMultiplier,
  winStreak = 3,
  simLevel,
  userTrophies = 2450,
  shieldCharges = 3,
  activeCommanderId = 'andy',
  onSelectCommander,
  commanderBondLevel = 8,
  lastMatchResult = null,
  activeStation = null,
  onCloseStation,
  onGainGold,
  onGainSteel,
  isGuestMode = false,
  onOpenAuthModal,
  children,
}) => {
  // Estados Locales de Recursos Dinámicos & Cosecha
  const [localGold, setLocalGold] = useState(userGold);
  const [localSteel, setLocalSteel] = useState(userSteel);
  const [localEnergy, setLocalEnergy] = useState(75);
  const maxEnergy = 80;
  const [energyTimerSeconds, setEnergyTimerSeconds] = useState(312);
  const [offerTimerSeconds, setOfferTimerSeconds] = useState(899);

  // Estado sincronizado del Comandante Activo y Hover Contextual del Bark Engine (CAPA 3 MVP: Sujeto único 'stella')
  const [selectedCOId, setSelectedCOId] = useState<COId>('stella');
  const [hoverIntent, setHoverIntent] = useState<LobbyBarkIntent | null>(null);

  // Estados de Interfaz, Accesibilidad & Modales
  const [isAudioMuted, setIsAudioMuted] = useState(() => audioManager.getSettings().muted);
  const [isCrtActive, setIsCrtActive] = useState(true);
  const [isReducedMotion, setIsReducedMotion] = useState(false);
  const [activeModal, setActiveModal] = useState<string | null>(null);
  const [genericModalData, setGenericModalData] = useState<{
    title: string;
    content: React.ReactNode;
  } | null>(null);

  // Ruleta de Reabastecimiento (Ceremonia de 3 Tiempos)
  const wheelCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isWheelSpinning, setIsWheelSpinning] = useState(false);
  const [wheelAngle, setWheelAngle] = useState(0);
  const [wheelResultText, setWheelResultText] = useState<string | null>(null);
  const [wonPrize, setWonPrize] = useState<PrizeItem | null>(null);

  // Estados del Metajuego V2 (Global Sovereignty, Hangar Físico y Guarniciones)
  // En el MVP de Capa 1 (Implicación Política en Mapa Venezuela), el mapa se abre como experiencia principal
  const [isWorldMapExpanded, setIsWorldMapExpanded] = useState(true);
  const [inspectedProvinceId, setInspectedProvinceId] = useState<string | null>(null);
  const [isHangarModalOpen, setIsHangarModalOpen] = useState(false);
  const [isGarrisonDrawerOpen, setIsGarrisonDrawerOpen] = useState(false);
  const [isMetaConsoleOpen, setIsMetaConsoleOpen] = useState(true);
  const [isVignetteCollapsed, setIsVignetteCollapsed] = useState(false);
  const [selectedProvinceId, setSelectedProvinceId] = useState<string | null>('REG_VE_01');
  const [isStateInspectorOpen, setIsStateInspectorOpen] = useState(false);
  const [userEc, setUserEc] = useState(4850);
  const [userRareEarth, setUserRareEarth] = useState(140);
  const [userComposites, setUserComposites] = useState(95);

  const userRoleContext: UserRoleContext = useMemo(() => ({
    userId: userId || 'a0000000-0000-0000-0000-000000000001',
    userName: clan?.name || 'Comandante en Jefe',
    clanId: clan?.id || 'clan-ferro',
    clanTag: clan?.tag || 'FERR',
    clanRole: (clan as any)?.userRole || 'leader',
    factionId: 'blue_moon',
    isFactionManager: true,
  }), [userId, clan]);

  // Estados Fase 2: Consola Paradox y Bark Widget Interactivo
  const [isParadoxDrawerOpen, setIsParadoxDrawerOpen] = useState(false);
  const [barkWidgetMessage, setBarkWidgetMessage] = useState<BarkMessage | null>(null);

  // Datos Soberanos del Metajuego Territorial en Vivo (Supabase SSOT - 0% mock data)
  const {
    countries,
    provinces,
    nodes,
    adjacencies,
    controlMap,
    clansMap,
    isLoading: isTerritoryLoading,
    declareAttack,
    syncTerritoryData,
  } = useTerritoryMap(clan?.id ?? 'clan-ferro');

  const selectedProvince =
    (selectedProvinceId ? provinces.find((p) => p.id === selectedProvinceId) : null) ||
    provinces[0] ||
    null;
  const selectedProvinceNodes = selectedProvince
    ? nodes.filter((n) => n.provinceId === selectedProvince.id)
    : [];
  const selectedProvinceControl = selectedProvince
    ? controlMap[selectedProvince.id]
    : null;

  const addGoldReward = useCallback(
    (amount: number) => {
      setLocalGold((g) => g + amount);
      onGainGold?.(amount);
    },
    [onGainGold]
  );

  const addSteelReward = useCallback(
    (amount: number) => {
      setLocalSteel((s) => s + amount);
      onGainSteel?.(amount);
    },
    [onGainSteel]
  );

  // Ticker de Generación Continua Wplace & Upkeep Territorial (Victoria 3 Pipeline)
  const territoryTicker = useTerritoryEconomyTicker({
    clanId: clan?.id ?? 'clan-ferro',
    provinces,
    nodes,
    controlMap,
    onHarvestResources: ({ ec, steel }) => {
      setUserEc((prev) => prev + ec);
      addSteelReward(steel);
    },
    onDeductUpkeep: (upkeep) => {
      setUserEc((prev) => Math.max(0, prev - upkeep));
    },
  });

  const currentArena = RankedLadderEngine.getArenaForTrophies(userTrophies);
  const resolvedClanName = clan?.name ?? clanName ?? 'Legión de Hierro';
  const resolvedClanTag = clan?.tag ?? clanTag ?? '[FERRO]';
  const streak = safeguardInventory?.currentStreak ?? winStreak;
  const streakMultiplier = activeStreakMultiplier ?? (streak >= 6 ? 2.0 : 1.25);
  const resolvedLevel = userLevel ?? simLevel ?? 5;
  const activeCO = CANONICAL_CO_REGISTRY[selectedCOId] ?? CANONICAL_CO_REGISTRY.andy;

  // Horas acumuladas de extracción en silos (conectado a industrialInventory)
  const [siloHarvestedInSession, setSiloHarvestedInSession] = useState(false);
  const lastHarvest = industrialInventory?.lastHarvestAt ?? Date.now() - 4.5 * 3600 * 1000;
  const elapsedSiloHours = siloHarvestedInSession
    ? 0
    : Number(Math.min(10, (Date.now() - lastHarvest) / (3600 * 1000)).toFixed(1));
  const pendingSiloSteel = Math.max(0, Math.round(elapsedSiloHours * 6));

  useEffect(() => {
    setSelectedCOId('stella');
  }, [activeCommanderId]);

  useEffect(() => {
    setLocalGold(userGold);
  }, [userGold]);

  useEffect(() => {
    setLocalSteel(userSteel);
  }, [userSteel]);

  const handleCommanderChange = useCallback(
    (_nextCoId: COId) => {
      // CAPA 3 MVP: Sujeto de prueba único bloqueado en Mayor Stella ('stella')
      setSelectedCOId('stella');
      onSelectCommander?.('stella');
    },
    [onSelectCommander]
  );

  // Temporizadores militares de energía y oferta
  useEffect(() => {
    const timer = setInterval(() => {
      setEnergyTimerSeconds((prev) => {
        if (prev <= 1) {
          setLocalEnergy((e) => Math.min(maxEnergy, e + 1));
          return 300;
        }
        return prev - 1;
      });
      setOfferTimerSeconds((prev) => (prev > 0 ? prev - 1 : 900));
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const formatTime = (totalSeconds: number) => {
    const m = Math.floor(totalSeconds / 60)
      .toString()
      .padStart(2, '0');
    const s = (totalSeconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const handleDeploy = useCallback(
    (_format: MatchFormat, targetProvId?: string) => {
      // CAPA 2 (Combate Táctico Advance Wars) deshabilitada en este MVP:
      // Redirige cualquier intento de batalla hacia la Operación Geopolítica en el Mapa de Venezuela (Capa 1).
      audioManager.playDeployHorn();
      setActiveModal(null);
      setIsWorldMapExpanded(true);
      setIsMetaConsoleOpen(true);

      const targetId = targetProvId || selectedProvince?.id || 'REG_VE_20';
      setSelectedProvinceId(targetId);
      declareAttack(selectedProvince?.id || 'REG_VE_01', targetId, clan?.id ?? 'clan-ferro');
    },
    [clan?.id, declareAttack, selectedProvince]
  );

  const handleNavigate = useCallback(
    (view: LobbyStationView) => {
      audioManager.playSFX('button_click');
      if (isGuestMode && view !== 'docs') {
        onOpenAuthModal?.('Esta terminal militar está reservada a personal en activo. Identifícate para ingresar.');
        return;
      }
      if (onNavigateToView) {
        onNavigateToView(view);
        return;
      }
      switch (view) {
        case 'shop':
          onOpenShop?.();
          break;
        case 'armory':
          onOpenArmory?.();
          break;
        case 'industry':
          onOpenIndustry?.();
          break;
        case 'marketplace':
          onOpenMarketplace?.();
          break;
        case 'clans':
          onOpenClans?.();
          break;
        case 'docs':
          onOpenDocs?.();
          break;
        case 'qa':
          break;
      }
    },
    [
      onNavigateToView,
      onOpenShop,
      onOpenArmory,
      onOpenIndustry,
      onOpenMarketplace,
      onOpenClans,
      onOpenDocs,
    ]
  );

  const handleSelectProvinceFromMap = useCallback((provId: string) => {
    setSelectedProvinceId(provId);
    setIsStateInspectorOpen(true);
    setIsMetaConsoleOpen(true);
    if (provId.startsWith('BUF_')) {
      setBarkWidgetMessage({
        id: `buf_${Date.now()}`,
        text: 'SECTOR FUERA DEL TEATRO OPERACIONAL DE FASE 1 (ACTIVO: REPÚBLICA DE VENEZUELA)',
        balloonType: 'panic',
        stamp: 'ZONA RESTRINGIDA',
        durationMs: 5000,
      });
    } else {
      const prov = provinces.find((p) => p.id === provId);
      setBarkWidgetMessage({
        id: `sel_${Date.now()}`,
        text: `Fijando telemetría en ${prov?.name || provId}. Búnker y defensas en pantalla.`,
        balloonType: 'radio',
        stamp: 'SECTOR FIJADO',
        durationMs: 4500,
      });
    }
  }, [provinces]);

  const toggleTournament = () => {
    audioManager.playSFX('button_click');
    if (onToggleTournamentMode) onToggleTournamentMode();
    else if (onToggleTournament) onToggleTournament();
  };

  const toggleAudio = () => {
    const muted = audioManager.toggleMute();
    setIsAudioMuted(muted);
  };

  const handleCollectSiloSteel = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (pendingSiloSteel <= 0) {
      handleNavigate('industry');
      return;
    }
    audioManager.playComboAction(5);
    addSteelReward(pendingSiloSteel);
    setSiloHarvestedInSession(true);
  };

  const openGenericModal = (title: string, content: React.ReactNode) => {
    audioManager.playSFX('button_click');
    setGenericModalData({ title, content });
    setActiveModal('modal-generic');
  };

  // =========================================================================
  // HOTKEYS GLOBALES DEL CUARTEL GENERAL ([1]-[6], [SPACE], [F], [R], [P], [C], [ESC])
  // =========================================================================
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement
      ) {
        return;
      }

      if (e.key === 'Escape') {
        if (activeModal) {
          audioManager.playCue('ui_cancel_rollback');
          setActiveModal(null);
          return;
        }
        if (activeStation && onCloseStation) {
          audioManager.playCue('ui_cancel_rollback');
          onCloseStation();
          return;
        }
        if (isWorldMapExpanded) {
          audioManager.playCue('ui_cancel_rollback');
          setIsWorldMapExpanded(false);
          return;
        }
      }

      if (activeModal) return;

      switch (e.key) {
        case '1':
          handleNavigate('shop');
          break;
        case '2':
          handleNavigate('industry');
          break;
        case '3':
          handleNavigate('armory');
          break;
        case '4':
          handleNavigate('marketplace');
          break;
        case '5':
          handleNavigate('clans');
          break;
        case '6':
          handleNavigate('docs');
          break;
        case 'm':
        case 'M':
          if (!e.ctrlKey && !e.metaKey && !activeStation) {
            e.preventDefault();
            audioManager.playSFX('button_click');
            setIsWorldMapExpanded(prev => !prev);
          }
          break;
        case ' ':
          if (!activeStation) {
            e.preventDefault();
            audioManager.playSFX('button_click');
            setActiveModal('modal-battle-hq');
          }
          break;
        case 'f':
        case 'F':
          if (!e.ctrlKey && !e.metaKey && !activeStation) {
            e.preventDefault();
            handleDeploy('blitz_skirmish');
          }
          break;
        case 'r':
        case 'R':
          if (!e.ctrlKey && !e.metaKey && !activeStation) {
            e.preventDefault();
            audioManager.playSFX('button_click');
            setActiveModal('modal-ruleta');
          }
          break;
        case 'c':
        case 'C':
          if (!e.ctrlKey && !e.metaKey && !activeStation) {
            e.preventDefault();
            audioManager.playSFX('button_click');
            setActiveModal('modal-commander-dossier');
          }
          break;
        case 'p':
        case 'P':
          if (!e.ctrlKey && !e.metaKey && !activeStation) {
            e.preventDefault();
            audioManager.playSFX('button_click');
            onOpenProfile?.();
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeModal, activeStation, onCloseStation, handleNavigate, handleDeploy, onOpenProfile]);

  // =========================================================================
  // RULETA DE REABASTECIMIENTO MECÁNICO (CEREMONIA DE 3 TIEMPOS)
  // =========================================================================
  const drawWheel = useCallback(() => {
    const canvas = wheelCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const numSegments = WHEEL_PRIZES.length;
    const arcSize = (2 * Math.PI) / numSegments;
    const radius = canvas.width / 2;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (let i = 0; i < numSegments; i++) {
      const angle = i * arcSize;
      ctx.beginPath();
      ctx.fillStyle = WHEEL_PRIZES[i].color;
      ctx.moveTo(radius, radius);
      ctx.arc(radius, radius, radius, angle, angle + arcSize);
      ctx.lineTo(radius, radius);
      ctx.fill();
      ctx.strokeStyle = '#0A0B08';
      ctx.lineWidth = 3;
      ctx.stroke();

      ctx.save();
      ctx.translate(radius, radius);
      ctx.rotate(angle + arcSize / 2);
      ctx.textAlign = 'right';
      ctx.fillStyle = '#F2E8D5';
      ctx.font = "800 11px 'JetBrains Mono', monospace";
      ctx.fillText(WHEEL_PRIZES[i].text, radius - 14, 4);
      ctx.restore();
    }
  }, []);

  useEffect(() => {
    if (activeModal === 'modal-ruleta') {
      const id = setTimeout(drawWheel, 40);
      return () => clearTimeout(id);
    }
  }, [activeModal, drawWheel]);

  const spinWheel = async () => {
    if (isWheelSpinning) return;
    setIsWheelSpinning(true);
    setWonPrize(null);
    audioManager.playSFX('button_click');
    setWheelResultText('TIEMPO 1 // SOLICITANDO SUMINISTRO AL SERVIDOR C4ISR...');

    if (!userId || isGuestMode) {
      setIsWheelSpinning(false);
      onOpenAuthModal?.('Debes iniciar sesión para girar la ruleta y recibir suministros del Alto Mando.');
      setWheelResultText('FALLO // AUTORIZACIÓN MILITAR REQUERIDA');
      return;
    }

    try {
      const { data, error } = await supabase.rpc('rpc_spin_daily_wheel', {
        p_user_id: userId,
      });

      if (error || !data || !(data as any).success) {
        setIsWheelSpinning(false);
        const errMsg = error?.message || (data as any)?.error || 'NO AUTORIZADO';
        setWheelResultText(`RECHAZO // ${errMsg.toUpperCase()}`);
        return;
      }

      const res = data as {
        success: boolean;
        reward_type: string;
        reward_amount: number;
        reward_label: string;
        wallet_balance?: number;
      };

      // Mapear segmento del rotor según el tipo de recompensa del servidor
      let targetIndex = 0;
      if (res.reward_type === 'credits') {
        targetIndex = res.reward_amount >= 1200 ? 3 : 0;
      } else if (res.reward_type === 'gems') {
        targetIndex = res.reward_amount >= 100 ? 4 : 4;
      } else if (res.reward_type === 'steel') {
        targetIndex = res.reward_amount >= 100 ? 5 : 1;
      }

      const extraRounds = 5;
      const segmentAngle = 360 / WHEEL_PRIZES.length;
      const targetDeg =
        extraRounds * 360 + (360 - (targetIndex * segmentAngle + segmentAngle / 2) - 90);

      const nextAngle = wheelAngle + targetDeg;
      setWheelAngle(nextAngle);

      const tickDelays = [180, 380, 620, 900, 1250, 1650, 2150, 2750, 3450];
      tickDelays.forEach((delay, idx) => {
        setTimeout(() => {
          audioManager.playGoldTick(idx);
        }, delay);
      });

      setTimeout(() => {
        setIsWheelSpinning(false);
        const won = WHEEL_PRIZES[targetIndex];
        setWonPrize(won);
        audioManager.playComboAction(8);
        setWheelResultText(`¡SUMINISTRO ASEGURADO: ${res.reward_label.toUpperCase()}!`);

        if (res.reward_type === 'credits') {
          addGoldReward(res.reward_amount);
        } else if (res.reward_type === 'steel') {
          addSteelReward(res.reward_amount);
        }
      }, 4050);
    } catch (err: any) {
      setIsWheelSpinning(false);
      setWheelResultText(`FALLO DE ENLACE // ${err?.message?.toUpperCase() || 'ERROR DESCONOCIDO'}`);
    }
  };

  return (
    <div className="h-screen max-h-screen w-full overflow-hidden flex flex-col justify-between bg-[#161712] text-[#F2E8D5] font-sans select-none relative">
      {/* 1. ZONA SUPERIOR: DUAL RESOURCE HEADER (RECURSOS INDIVIDUALES Y DE FACCIÓN) */}
      <DualResourceHeader
        userGold={localGold}
        userEnergyEc={userEc}
        maxEnergyEc={8000}
        userTechScrap={industrialInventory?.techScrap ?? 350}
        userLevel={resolvedLevel}
        userXp={userXp}
        nextLevelXp={nextLevelXp}
        userTrophies={userTrophies}
        activeStreak={streak}
        clanTag={resolvedClanTag}
        clanName={resolvedClanName}
        clanColor={clan?.color ?? '#3B82F6'}
        clanVaultEc={48500}
        clanSharedStockCount={14}
        factionTcpControl={7200}
        isGuestMode={isGuestMode}
        onOpenAuthModal={onOpenAuthModal}
        onOpenProfile={onOpenProfile}
        onToggleDrawer={() => setIsParadoxDrawerOpen((prev) => !prev)}
        isDrawerOpen={isParadoxDrawerOpen}
      />

      {/* 2. ESCENARIO COMPETITIVO PRINCIPAL: VISTA DUAL (LIVING COMIC COMMAND HUB vs TEATRO SOBERANO MAPA MUNDIAL) */}
      <main className="relative flex-1 min-h-0 w-full overflow-y-auto lg:overflow-hidden bg-[#161712] ben-day-dark">
        {isWorldMapExpanded ? (
          /* ==================================================================
             MODO SOBERANÍA TERRITORIAL EXPANDIDO: WORLD MAP CANVAS + METAMANDO
             ================================================================== */
          <div className="absolute inset-0 w-full h-full z-0 overflow-hidden">
            <TacticalWorldMap
              className="w-full h-full"
              activeProvinceId={selectedProvince?.id}
              onSelectProvince={handleSelectProvinceFromMap}
              userClanId={clan?.id ?? 'clan-ferro'}
            />

            {/* PANEL INSPECTOR DE ESTADO AL CLICK (SOBERANÍA Y DATOS DE JUEGO C4ISR) */}
            <StateInspectorDrawer
              stateId={selectedProvinceId}
              isOpen={isStateInspectorOpen && Boolean(selectedProvinceId)}
              onClose={() => setIsStateInspectorOpen(false)}
              userContext={userRoleContext}
            />

            {/* C4ISR THEATER STRIP (BARRA DIEGÉTICA SUPERIOR FLOTANTE DEL MAPA) */}
            <div className="absolute top-2.5 left-3 right-3 z-20 pointer-events-none flex items-center justify-between gap-2">
              <div className="pointer-events-auto flex items-center gap-2 px-3 py-1.5 bg-[#2B2C24]/90 backdrop-blur border-2 border-[#0A0B08] rounded-[6px_2px_6px_2px] shadow-[4px_4px_0px_#0A0B08]">
                <button
                  type="button"
                  onMouseEnter={() => audioManager.playHoverTick()}
                  onClick={() => {
                    audioManager.playCue('ui_cancel_rollback');
                    setIsWorldMapExpanded(false);
                  }}
                  className="px-2.5 py-1 bg-[#46521F] hover:bg-[#586827] text-amber-300 border border-[#0A0B08] font-mono font-bold text-xs uppercase rounded flex items-center gap-1 shadow cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>VOLVER AL MANDO [ESC]</span>
                </button>
                <span className="text-xs font-mono text-amber-300 font-bold hidden sm:inline ml-1">
                  MAPA TERRITORIAL GLOBAL • SOBERANÍA Y CAPITALES
                </span>
                <span className="px-2 py-0.5 bg-[#161712] text-emerald-400 border border-[#46521F] font-mono font-bold text-[10px] uppercase rounded ml-2 shadow">
                  ⚡ WEBGL 2.0 (MAPLIBRE)
                </span>
              </div>

              <div className="pointer-events-auto flex items-center gap-1.5">
                <button
                  type="button"
                  onMouseEnter={() => audioManager.playHoverTick()}
                  onClick={() => {
                    audioManager.playSFX('button_click');
                    setActiveModal('modal-battle-hq');
                  }}
                  className="px-3 py-1.5 bg-[#E65100] hover:bg-amber-400 text-black border-2 border-[#0A0B08] text-xs font-display font-black uppercase rounded shadow-[3px_3px_0px_#0A0B08] cursor-pointer flex items-center gap-1.5 transition-transform active:translate-y-0.5"
                >
                  <Swords className="w-3.5 h-3.5" />
                  <span>¡COMBATE INMEDIATO!</span>
                </button>

                <button
                  type="button"
                  onMouseEnter={() => audioManager.playHoverTick()}
                  onClick={() => {
                    audioManager.playSFX('button_click');
                    setIsHangarModalOpen(true);
                  }}
                  className="px-2.5 py-1.5 bg-[#161712]/90 hover:bg-[#2B2C24] text-amber-300 border-2 border-[#0A0B08] text-xs font-mono font-bold uppercase rounded shadow-[3px_3px_0px_#0A0B08] cursor-pointer flex items-center gap-1"
                >
                  <Palette className="w-3.5 h-3.5" />
                  <span className="hidden md:inline">Hangar</span>
                </button>

                <button
                  type="button"
                  onMouseEnter={() => audioManager.playHoverTick()}
                  onClick={() => {
                    audioManager.playSFX('button_click');
                    handleNavigate('marketplace');
                  }}
                  className="px-2.5 py-1.5 bg-[#161712]/90 hover:bg-[#2B2C24] text-amber-300 border-2 border-[#0A0B08] text-xs font-mono font-bold uppercase rounded shadow-[3px_3px_0px_#0A0B08] cursor-pointer flex items-center gap-1"
                >
                  <Scale className="w-3.5 h-3.5" />
                  <span className="hidden md:inline">Bolsa P2P</span>
                </button>

                <button
                  type="button"
                  onMouseEnter={() => audioManager.playHoverTick()}
                  onClick={() => {
                    audioManager.playSFX('button_click');
                    setIsMetaConsoleOpen((prev) => !prev);
                  }}
                  className={`px-3 py-1.5 border-2 border-[#0A0B08] text-xs font-display font-black uppercase rounded shadow-[3px_3px_0px_#0A0B08] cursor-pointer flex items-center gap-1.5 transition-colors ${
                    isMetaConsoleOpen
                      ? 'bg-amber-400 text-black'
                      : 'bg-[#2B2C24] text-[#F2E8D5] hover:bg-[#3A3B30]'
                  }`}
                >
                  <Crosshair className="w-3.5 h-3.5" />
                  <span>{isMetaConsoleOpen ? 'PLEGAR CONSOLA' : 'METAMANDO'}</span>
                </button>
              </div>
            </div>

            {/* CONSOLA LATERAL DESPLEGABLE DE METAMANDO (BORDE DERECHO) */}
            <div className="absolute right-0 top-0 bottom-0 pointer-events-auto z-30 flex items-stretch">
              <MetaCommandConsole
                isOpen={isMetaConsoleOpen}
                onToggleOpen={() => setIsMetaConsoleOpen((prev) => !prev)}
                isGuestMode={isGuestMode}
                onOpenAuthModal={onOpenAuthModal}
                selectedProvince={selectedProvince}
                provinceNodes={selectedProvinceNodes}
                controlState={selectedProvinceControl}
                adjacencies={adjacencies}
                userClanId={clan?.id ?? 'clan-ferro'}
                userClanTag={resolvedClanTag}
                userEc={userEc}
                userSteel={localSteel}
                ticker={territoryTicker}
                onDeclareAttack={async (targetProvinceId) => {
                  if (!selectedProvince) return;
                  const res = await declareAttack(
                    selectedProvince.id,
                    targetProvinceId,
                    clan?.id ?? 'clan-ferro'
                  );
                  if (res.success) {
                    audioManager.playComboAction(8);
                    syncTerritoryData();
                  } else {
                    audioManager.playSFX('button_click');
                  }
                  return res;
                }}
                onJoinActiveBattle={(provId) => handleDeploy('blitz_skirmish', provId)}
                onOpenFullHangar={() => setIsHangarModalOpen(true)}
                onRebalanceGarrison={(targetLevel) => {
                  const upkeep = targetLevel * 150;
                  setUserEc((prev) => Math.max(0, prev - upkeep));
                }}
              />
            </div>
          </div>
        ) : (
          /* ==================================================================
             MODO CENTRAL DE MANDO ESTÁNDAR: THE LIVING COMIC CANVAS (CANÓNICO)
             ================================================================== */
          <div className="max-w-[1600px] mx-auto w-full h-full grid grid-cols-1 lg:grid-cols-12 gap-3.5 items-stretch p-2.5 sm:p-3.5">
            {/* CUADRANTE IZQUIERDO/CENTRAL (7/12 ~58%): THE LIVING COMIC CANVAS */}
            <div className="lg:col-span-7 h-full min-h-[420px] flex flex-col">
              <CommanderLivingVignette
                activeCommanderId={selectedCOId}
                onSelectCommander={handleCommanderChange}
                commanderBondLevel={commanderBondLevel}
                hoverIntent={hoverIntent}
                lastMatchResult={lastMatchResult}
                streak={streak}
                streakMultiplier={streakMultiplier}
                resolvedClanTag={resolvedClanTag}
                isReducedMotion={isReducedMotion}
                isCrtActive={isCrtActive}
                onOpenCommanderDossier={() => {
                  audioManager.playSFX('button_click');
                  setActiveModal('modal-commander-dossier');
                }}
                onClaimSupplyGift={() =>
                  openGenericModal(
                    'DEPÓSITO DE SUMINISTROS DE ALIANZA',
                    <div className="p-3.5 rounded-[10px_2px_10px_2px] bg-[#161712] border-2 border-[#0A0B08] space-y-3">
                      <p className="text-xs text-[#F2E8D5] leading-relaxed">
                        Cargamento logístico recibido del Cuartel General de{' '}
                        <strong className="text-amber-400">{resolvedClanName}</strong> ({resolvedClanTag}).
                      </p>
                      <button
                        type="button"
                        onMouseEnter={() => audioManager.playHoverTick()}
                        onClick={() => {
                          audioManager.playComboAction(4);
                          addSteelReward(50);
                          setActiveModal(null);
                        }}
                        className="tactical-btn-heavy w-full py-2 text-xs"
                      >
                        Reclamar Suministro (+50t Acero)
                      </button>
                    </div>
                  )
                }
                onOpenEncryptedMail={() =>
                  openGenericModal(
                    'TRANSMISIONES ENCRIPTADAS C4ISR',
                    <div className="p-3.5 rounded-[10px_2px_10px_2px] bg-[#161712] border-2 border-[#0A0B08] space-y-2">
                      <p className="text-xs text-[#F2E8D5]">
                        Frecuencia segura de Estado Mayor activa. Todas las directivas de{' '}
                        <strong className="text-amber-400">{resolvedClanTag}</strong> y el oficial{' '}
                        <strong className="text-amber-300">{activeCO.name}</strong> están sincronizadas.
                      </p>
                    </div>
                  )
                }
              />
            </div>

            {/* CUADRANTE DERECHO (5/12 ~42%): MATRIZ DE NAVEGACIÓN DIEGÉTICA & DESPLIEGUE */}
            <aside
              aria-label="Terminales Operativas de Mando"
              className="lg:col-span-5 h-full flex flex-col justify-between gap-2.5 overflow-y-auto pr-0.5"
            >
              {/* BLOQUE 1: TERMINAL TITÁN DE DESPLIEGUE INMEDIATO A COMBATE */}
              <div
                onMouseEnter={() => setHoverIntent('hover_deploy')}
                onMouseLeave={() => setHoverIntent(null)}
                className="tactical-comic-card p-3 sm:p-3.5 bg-[#2B2C24] border-3 border-[#0A0B08] shadow-[6px_6px_0px_#0A0B08] flex flex-col gap-2.5 relative overflow-hidden shrink-0"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-[4px_1px_4px_1px] bg-[#E65100] text-[#F2E8D5] font-display font-extrabold text-[10px] uppercase border border-[#0A0B08]">
                      DEFCON-1 // FRENTE ACTIVO
                    </span>
                    <span className="text-[11px] font-mono font-extrabold text-amber-400 tabular-nums">
                      {currentArena.name.toUpperCase()} ({userTrophies} 🏆)
                    </span>
                  </div>

                  {/* Botón Switch a Teatro Soberano Mapa Mundial */}
                  <button
                    type="button"
                    onMouseEnter={() => audioManager.playHoverTick()}
                    onClick={() => {
                      audioManager.playDeployHorn();
                      setIsWorldMapExpanded(true);
                    }}
                    className="px-2.5 py-0.5 rounded-[6px_2px_6px_2px] bg-[#161712] border-2 border-amber-400 text-[10px] font-mono font-extrabold text-amber-300 flex items-center gap-1.5 cursor-pointer hover:bg-amber-400 hover:text-black transition-colors shadow-[2px_2px_0px_#0A0B08]"
                    title="Abrir Teatro Soberano Global (Victoria 3 × Wplace) [M]"
                  >
                    <Globe className="w-3.5 h-3.5" />
                    <span>MAPA MUNDIAL [M]</span>
                  </button>
                </div>

                {/* Botón Titán Principal: ¡DESPLEGAR A COMBATE! */}
                <button
                  type="button"
                  onMouseEnter={() => {
                    audioManager.playHoverTick();
                    setHoverIntent('hover_deploy');
                  }}
                  onClick={() => {
                    audioManager.playSFX('button_click');
                    setActiveModal('modal-battle-hq');
                  }}
                  className="tactical-btn-heavy w-full px-4 py-3 flex items-center justify-between gap-3 group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-[10px_3px_10px_3px] bg-[#161712] border-2 border-[#0A0B08] flex items-center justify-center shrink-0 group-hover:rotate-12 transition-transform shadow-[3px_3px_0px_#0A0B08]">
                      <Swords className="w-6 h-6 text-amber-300" />
                    </div>
                    <div className="text-left">
                      <div className="text-base sm:text-xl font-display font-black uppercase tracking-wider text-[#F2E8D5] leading-none">
                        ¡DESPLEGAR A COMBATE!
                      </div>
                      <div className="text-[10px] font-mono font-bold text-[#F2E8D5]/90 uppercase tracking-widest mt-1">
                        COMANDANTE ACTIVO: {activeCO.name.toUpperCase()} •{' '}
                        {isTournamentMode ? 'CAP SIMÉTRICO N11' : 'LADDER ASIMÉTRICO'}
                      </div>
                    </div>
                  </div>

                  <span className="px-2 py-1 rounded-[6px_2px_6px_2px] bg-[#0A0B08] text-amber-300 text-[10px] font-mono font-extrabold shrink-0">
                    [SPACE]
                  </span>
                </button>

                {/* Selector Rápido de Modalidades de Combate Real (1 Clic) */}
                <div className="grid grid-cols-3 gap-1.5">
                  <button
                    type="button"
                    onMouseEnter={() => audioManager.playHoverTick()}
                    onClick={() => handleDeploy('mirror_duel')}
                    className="tactical-juice-btn px-2 py-1.5 bg-[#161712] hover:bg-[#1F201A] border-2 border-[#E65100] text-left flex flex-col justify-between"
                    title="Entrar directo a Duelo Espejo 1v1 Simétrico (15s)"
                  >
                    <span className="text-[9px] font-mono font-extrabold text-[#E65100] uppercase">
                      1V1 ESPEJO • 15S
                    </span>
                    <span className="font-display font-extrabold text-xs text-[#F2E8D5] uppercase">
                      ⚔️ Duelo Justo
                    </span>
                  </button>

                  <button
                    type="button"
                    onMouseEnter={() => {
                      audioManager.playHoverTick();
                      setHoverIntent('hover_blitz');
                    }}
                    onClick={() => handleDeploy('blitz_skirmish')}
                    className="tactical-juice-btn px-2 py-1.5 bg-[#46521F] hover:bg-[#586827] border-2 border-[#0A0B08] text-left flex flex-col justify-between"
                    title="Despliegue Inmediato a Escaramuza Blitz 30s [Atajo F]"
                  >
                    <span className="text-[9px] font-mono font-extrabold text-amber-300 uppercase flex items-center justify-between">
                      <span>BLITZ 2.0X</span>
                      <span>[F]</span>
                    </span>
                    <span className="font-display font-extrabold text-xs text-[#F2E8D5] uppercase flex items-center gap-1">
                      <Zap className="w-3 h-3 text-amber-300 shrink-0" />
                      <span>Blitz 30s</span>
                    </span>
                  </button>

                  <button
                    type="button"
                    onMouseEnter={() => audioManager.playHoverTick()}
                    onClick={() => handleDeploy('grand_campaign')}
                    className="tactical-juice-btn px-2 py-1.5 bg-[#161712] hover:bg-[#1F201A] border-2 border-[#1D4ED8] text-left flex flex-col justify-between"
                    title="Iniciar Gran Campaña Táctica con Niebla de Guerra (60s)"
                  >
                    <span className="text-[9px] font-mono font-extrabold text-sky-400 uppercase">
                      GUERRA TOTAL • 60S
                    </span>
                    <span className="font-display font-extrabold text-xs text-[#F2E8D5] uppercase">
                      🎖️ Campaña
                    </span>
                  </button>
                </div>
              </div>

              {/* BLOQUE 2: MATRIZ DE 6 TERMINALES OPERATIVAS REALES */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 flex-1">
                {/* 1. HANGAR DE TROPAS / ARMERÍA */}
                <button
                  type="button"
                  onMouseEnter={() => {
                    audioManager.playHoverTick();
                    setHoverIntent('hover_armory');
                  }}
                  onMouseLeave={() => setHoverIntent(null)}
                  onClick={() => {
                    audioManager.playSFX('button_click');
                    setIsHangarModalOpen(true);
                  }}
                  className="tactical-comic-card-interactive p-3 bg-[#2B2C24] border-2 border-[#0A0B08] hover:border-sky-400 text-left flex flex-col justify-between"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="w-8 h-8 rounded-[8px_2px_8px_2px] bg-[#161712] border border-sky-400/60 flex items-center justify-center text-sky-400">
                      <Palette className="w-4 h-4" />
                    </div>
                    <span className="px-1.5 py-0.5 rounded bg-[#161712] border border-[#7B8A4A]/60 text-[10px] font-mono font-extrabold text-sky-400">
                      [1] HANGAR
                    </span>
                  </div>
                  <div className="mt-2">
                    <h3 className="font-display font-extrabold text-sm text-[#F2E8D5] uppercase tracking-wider">
                      Hangar & Patentes
                    </h3>
                    <p className="text-[11px] text-[#A9B87A] font-sans leading-tight mt-0.5">
                      Forja de unidades T1-T5 y stock físico de reserva.
                    </p>
                  </div>
                </button>

                {/* 2. GUARNICIONES IA & ESTADO MAYOR */}
                <button
                  type="button"
                  onMouseEnter={() => {
                    audioManager.playHoverTick();
                    setHoverIntent('hover_war_room');
                  }}
                  onMouseLeave={() => setHoverIntent(null)}
                  onClick={() => {
                    audioManager.playSFX('button_click');
                    setIsGarrisonDrawerOpen(true);
                  }}
                  className="tactical-comic-card-interactive p-3 bg-[#2B2C24] border-2 border-[#0A0B08] hover:border-amber-400 text-left flex flex-col justify-between"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="w-8 h-8 rounded-[8px_2px_8px_2px] bg-[#161712] border border-amber-400/60 flex items-center justify-center text-amber-400">
                      <Users className="w-4 h-4" />
                    </div>
                    <span className="px-1.5 py-0.5 rounded bg-[#161712] border border-[#7B8A4A]/60 text-[10px] font-mono font-extrabold text-amber-300">
                      [2] GUARNICIÓN
                    </span>
                  </div>
                  <div className="mt-2">
                    <h3 className="font-display font-extrabold text-sm text-[#F2E8D5] uppercase tracking-wider">
                      Guarnición & IA
                    </h3>
                    <p className="text-[11px] text-[#A9B87A] font-sans leading-tight mt-0.5">
                      Defensa territorial automatizada y rebalanceo en Postgres.
                    </p>
                  </div>
                </button>

                {/* 3. COMPLEJO INDUSTRIAL MILITAR */}
                <button
                  type="button"
                  onMouseEnter={() => {
                    audioManager.playHoverTick();
                    setHoverIntent('hover_industry');
                  }}
                  onMouseLeave={() => setHoverIntent(null)}
                  onClick={() => handleNavigate('industry')}
                  className="tactical-comic-card-interactive p-3 bg-[#2B2C24] border-2 border-[#0A0B08] hover:border-[#7B8A4A] text-left flex flex-col justify-between"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="w-8 h-8 rounded-[8px_2px_8px_2px] bg-[#161712] border border-[#7B8A4A] flex items-center justify-center text-amber-300">
                      <Factory className="w-4 h-4" />
                    </div>
                    <span className="px-1.5 py-0.5 rounded bg-[#161712] border border-[#7B8A4A]/60 text-[10px] font-mono font-extrabold text-amber-300">
                      [3] {localSteel}t
                    </span>
                  </div>
                  <div className="mt-2">
                    <h3 className="font-display font-extrabold text-sm text-[#F2E8D5] uppercase tracking-wider">
                      Industria & Silos
                    </h3>
                    <p className="text-[11px] text-[#A9B87A] font-sans leading-tight mt-0.5">
                      Refinería de acero, microchips y combustible.
                    </p>
                  </div>
                </button>

                {/* 4. BOLSA DE COMERCIO P2P */}
                <button
                  type="button"
                  onMouseEnter={() => {
                    audioManager.playHoverTick();
                    setHoverIntent('hover_shop');
                  }}
                  onMouseLeave={() => setHoverIntent(null)}
                  onClick={() => handleNavigate('marketplace')}
                  className="tactical-comic-card-interactive p-3 bg-[#2B2C24] border-2 border-[#0A0B08] hover:border-[#C46A3A] text-left flex flex-col justify-between"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="w-8 h-8 rounded-[8px_2px_8px_2px] bg-[#161712] border border-[#C46A3A]/60 flex items-center justify-center text-[#C46A3A]">
                      <Scale className="w-4 h-4" />
                    </div>
                    <span className="px-1.5 py-0.5 rounded bg-[#161712] border border-[#7B8A4A]/60 text-[10px] font-mono font-extrabold text-[#C46A3A]">
                      [4] BOLSA P2P
                    </span>
                  </div>
                  <div className="mt-2">
                    <h3 className="font-display font-extrabold text-sm text-[#F2E8D5] uppercase tracking-wider">
                      Mercado Libre P2P
                    </h3>
                    <p className="text-[11px] text-[#A9B87A] font-sans leading-tight mt-0.5">
                      Canon 2% canónico y bandas VWAP Collar ±25%.
                    </p>
                  </div>
                </button>

                {/* 5. CENTRO DE CLANES / CORPORACIÓN */}
                <button
                  type="button"
                  onMouseEnter={() => {
                    audioManager.playHoverTick();
                    setHoverIntent('hover_clans');
                  }}
                  onMouseLeave={() => setHoverIntent(null)}
                  onClick={() => handleNavigate('clans')}
                  className="tactical-comic-card-interactive p-3 bg-[#2B2C24] border-2 border-[#0A0B08] hover:border-emerald-400 text-left flex flex-col justify-between"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="w-8 h-8 rounded-[8px_2px_8px_2px] bg-[#161712] border border-emerald-400/60 flex items-center justify-center text-emerald-400">
                      <Shield className="w-4 h-4" />
                    </div>
                    <span className="px-1.5 py-0.5 rounded bg-[#46521F] border border-[#0A0B08] text-[10px] font-mono font-extrabold text-[#F2E8D5]">
                      [5] {resolvedClanTag}
                    </span>
                  </div>
                  <div className="mt-2">
                    <h3 className="font-display font-extrabold text-sm text-[#F2E8D5] uppercase tracking-wider truncate">
                      {resolvedClanName}
                    </h3>
                    <p className="text-[11px] text-[#A9B87A] font-sans leading-tight mt-0.5">
                      Alianza militar y Salvaguarda ({shieldCharges}/3).
                    </p>
                  </div>
                </button>

                {/* 6. EXPEDIENTE & RÉCORDS */}
                <button
                  type="button"
                  onMouseEnter={() => {
                    audioManager.playHoverTick();
                    setHoverIntent('hover_profile');
                  }}
                  onMouseLeave={() => setHoverIntent(null)}
                  onClick={() => {
                    audioManager.playSFX('button_click');
                    onOpenProfile?.();
                  }}
                  className="tactical-comic-card-interactive p-3 bg-[#2B2C24] border-2 border-[#0A0B08] hover:border-amber-400 text-left flex flex-col justify-between"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="w-8 h-8 rounded-[8px_2px_8px_2px] bg-[#161712] border border-amber-400/60 flex items-center justify-center text-amber-400">
                      <Trophy className="w-4 h-4" />
                    </div>
                    <span className="px-1.5 py-0.5 rounded bg-[#161712] border border-[#7B8A4A]/60 text-[10px] font-mono font-extrabold text-amber-300 tabular-nums">
                      [6] {userTrophies} 🏆
                    </span>
                  </div>
                  <div className="mt-2">
                    <h3 className="font-display font-extrabold text-sm text-[#F2E8D5] uppercase tracking-wider">
                      Expediente & Récords
                    </h3>
                    <p className="text-[11px] text-[#A9B87A] font-sans leading-tight mt-0.5">
                      Hoja de servicio y medallas competitivas.
                    </p>
                  </div>
                </button>
              </div>

              {/* BLOQUE 3: DOSSIER DE MISIÓN & ROTOR C4ISR */}
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 shrink-0">
                <div
                  role="button"
                  tabIndex={0}
                  onMouseEnter={() => audioManager.playHoverTick()}
                  onClick={() =>
                    openGenericModal(
                      'DOSSIER TÁCTICO // DEFENSA COSTERA',
                      <div className="tactical-dossier-card p-3.5 space-y-3">
                        <h4 className="font-display font-extrabold text-xs text-[#0A0B08] uppercase">
                          Sector Alpha // Baterías Costeras
                        </h4>
                        <p className="text-xs text-[#2B2C24] font-bold">
                          Completa 2 escaramuzas con {activeCO.name} para asegurar la bahía.
                        </p>
                        <div className="pt-2 flex items-center justify-between border-t border-[#0A0B08]/20">
                          <span className="text-xs font-mono font-extrabold text-[#0A0B08]">
                            Progreso: 1/2
                          </span>
                          <button
                            type="button"
                            onMouseEnter={() => audioManager.playHoverTick()}
                            onClick={() => {
                              audioManager.playComboAction(5);
                              addGoldReward(500);
                              setActiveModal(null);
                            }}
                            className="tactical-btn-heavy px-4 py-1.5 text-xs"
                          >
                            Reclamar Botín (+500G)
                          </button>
                        </div>
                      </div>
                    )
                  }
                  className="sm:col-span-6 tactical-dossier-card p-2.5 cursor-pointer flex flex-col justify-between"
                >
                  <div className="flex items-center justify-between gap-1.5 mb-1">
                    <span className="font-display font-extrabold text-xs uppercase tracking-wider text-[#0A0B08] flex items-center gap-1">
                      <Crosshair className="w-3.5 h-3.5 text-[#C46A3A] shrink-0" />
                      <span>Misión: Sector Alpha</span>
                    </span>
                    <span className="px-1.5 py-0.5 rounded bg-[#0A0B08] text-amber-300 font-mono font-extrabold text-[10px]">
                      +500G
                    </span>
                  </div>
                  <TacticalGhostBar
                    value={1}
                    max={2}
                    heightClassName="h-2.5"
                    fillClassName="bg-[#C46A3A]"
                    ghostClassName="bg-amber-300"
                    label="ESCARAMUZAS 1/2"
                  />
                </div>

                <div className="sm:col-span-6 flex flex-col gap-1.5">
                  <button
                    type="button"
                    onMouseEnter={() => audioManager.playHoverTick()}
                    onClick={() => {
                      audioManager.playSFX('button_click');
                      setActiveModal('modal-ruleta');
                    }}
                    className="tactical-btn-heavy w-full px-3 py-1.5 flex items-center justify-between text-xs"
                  >
                    <span className="flex items-center gap-1.5 font-display font-extrabold">
                      <span>🎡</span>
                      <span>ROTOR SUMINISTROS</span>
                    </span>
                    <span className="bg-[#0A0B08] text-amber-300 px-1.5 py-0.5 rounded text-[10px] font-mono font-extrabold">
                      [R]
                    </span>
                  </button>

                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      type="button"
                      onMouseEnter={() => audioManager.playHoverTick()}
                      onClick={() =>
                        openGenericModal(
                          'ÓRDENES OPERATIVAS DIARIAS',
                          <div className="p-3 rounded-[8px_2px_8px_2px] bg-[#161712] border-2 border-[#0A0B08] space-y-2 text-xs font-mono">
                            <p className="text-amber-400 font-bold">✓ 1. Desplegar 1 división (1/1)</p>
                            <p className="text-[#F2E8D5]">○ 2. Vencer en Duelo Espejo (0/1)</p>
                            <p className="text-[#A9B87A]">○ 3. Ganar 1 Blitz 30s (0/1)</p>
                          </div>
                        )
                      }
                      className="tactical-juice-btn px-2 py-1 bg-[#2B2C24] border border-[#0A0B08] text-[10px] font-mono font-bold text-[#F2E8D5] flex items-center justify-between"
                    >
                      <span className="flex items-center gap-1">
                        <Activity className="w-3 h-3 text-amber-400" />
                        <span>Órdenes</span>
                      </span>
                      <span className="text-amber-300">1/3</span>
                    </button>

                    <button
                      type="button"
                      onMouseEnter={() => audioManager.playHoverTick()}
                      onClick={() =>
                        openGenericModal(
                          'CONDECORACIONES MILITARES',
                          <div className="p-3 rounded-[8px_2px_8px_2px] bg-[#161712] border-2 border-amber-400 flex items-center justify-between text-xs">
                            <div>
                              <span className="font-display font-extrabold text-amber-400 block">★ VETERANO DE ACERO</span>
                              <span className="text-[11px] text-[#A9B87A]">Reserva de intendencia activa.</span>
                            </div>
                            <span className="px-2 py-0.5 bg-amber-400 text-[#0A0B08] font-mono font-bold text-[10px] rounded">DOMINADO</span>
                          </div>
                        )
                      }
                      className="tactical-juice-btn px-2 py-1 bg-[#2B2C24] border border-[#0A0B08] text-[10px] font-mono font-bold text-[#F2E8D5] flex items-center justify-between"
                    >
                      <span className="flex items-center gap-1">
                        <Award className="w-3 h-3 text-amber-400" />
                        <span>Logros</span>
                      </span>
                      <span className="text-amber-300">★</span>
                    </button>
                  </div>
                </div>
              </div>
            </aside>
          </div>
        )}

        {/* ====================================================================
            SHELL DIEGÉTICO SUPERPUESTO PARA SUB-VISTAS (ZERO-UNMOUNT HQ)
            Mantiene la Viñeta Viva y los temporizadores activos detrás
           ==================================================================== */}
        <AnimatePresence>
          {activeStation && children && (
            <motion.section
              key={activeStation}
              initial={{ opacity: 0, scale: 0.96, y: 14 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.97, y: 10 }}
              transition={{ type: 'spring', stiffness: 420, damping: 28 }}
              className="absolute inset-2 sm:inset-3 z-30 flex flex-col tactical-comic-card bg-[#161712]/95 backdrop-blur-md border-3 border-[#0A0B08] shadow-[10px_10px_0px_#0A0B08] overflow-hidden"
            >
              {/* Barra de Cabecera de la Terminal de Estación */}
              <div className="px-4 py-2 bg-[#2B2C24] border-b-2 border-[#0A0B08] flex flex-wrap items-center justify-between gap-2 ben-day-dark shrink-0">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onMouseEnter={() => audioManager.playHoverTick()}
                    onClick={() => {
                      audioManager.playCue('ui_cancel_rollback');
                      onCloseStation?.();
                    }}
                    className="tactical-juice-btn flex items-center gap-1.5 px-3 py-1 bg-[#46521F] hover:bg-[#586827] text-[#F2E8D5] font-display font-extrabold text-xs uppercase tracking-wider border-2 border-[#0A0B08]"
                    title="Cerrar estación y volver al Cuartel General [ESC]"
                  >
                    <ArrowLeft className="w-4 h-4 text-amber-300" />
                    <span>Volver al Mando [ESC]</span>
                  </button>

                  <div className="flex items-center gap-2">
                    <span className="hidden sm:inline-block px-2 py-0.5 rounded-[4px_1px_4px_1px] bg-[#E65100] text-[#F2E8D5] font-mono font-extrabold text-[10px] uppercase border border-[#0A0B08]">
                      {STATION_TITLES[activeStation]?.badge}
                    </span>
                    <h2 className="font-display font-extrabold text-sm sm:text-base text-[#F2E8D5] uppercase tracking-wider">
                      {STATION_TITLES[activeStation]?.title}
                    </h2>
                  </div>
                </div>

                {/* Garantía Red-Teaming: 1 Clic a Combate desde Cualquier Estación */}
                <button
                  type="button"
                  onMouseEnter={() => audioManager.playHoverTick()}
                  onClick={() => handleDeploy('blitz_skirmish')}
                  className="tactical-btn-heavy px-3.5 py-1 text-xs flex items-center gap-1.5"
                  title="Desplegar inmediatamente al Frente de Combate en 1 clic"
                >
                  <Sword className="w-3.5 h-3.5 text-amber-300" />
                  <span>Desplegar al Frente</span>
                </button>
              </div>

              {/* Contenido de la Estación (Shop, Armory, Industry, Market, Clans, Docs, QA) */}
              <div className="flex-1 overflow-y-auto overflow-x-hidden flex flex-col">
                {children}
              </div>
            </motion.section>
          )}
        </AnimatePresence>
      </main>

      {/* 3. ZONA INFERIOR: DOCK TÁCTICO + BOTÓN TITÁN + RADIO-NET */}
      <TacticalDock
        activeStation={activeStation}
        resolvedLevel={resolvedLevel}
        resolvedClanTag={resolvedClanTag}
        onHoverIntent={setHoverIntent}
        onNavigate={(view) => {
          if (activeStation === view && onCloseStation) {
            onCloseStation();
            return;
          }
          handleNavigate(view);
        }}
        onOpenEditor={onOpenEditor}
        onOpenBattleHQ={() => {
          if (isGuestMode) {
            onOpenAuthModal?.('Debes iniciar sesión para acceder al Estado Mayor de Batalla.');
            return;
          }
          setActiveModal('modal-battle-hq');
        }}
        onQuickDeployBlitz={() => handleDeploy('blitz_skirmish')}
        onInspectAlly={(allyName, sector) =>
          openGenericModal(
            `INSPECCIÓN DE GUARNICIÓN ALIADA // ${allyName.toUpperCase()}`,
            <p className="text-xs text-[#F2E8D5] leading-relaxed">
              Inspeccionando perímetro defensivo de <strong>{allyName}</strong> ({sector}). Baterías
              antiaéreas y silos operando al 100% de eficiencia.
            </p>
          )
        }
        onTransferSupplyToAlly={(allyName) => {
          audioManager.playComboAction(3);
          addSteelReward(25);
          openGenericModal(
            'TRANSFERENCIA LOGÍSTICA COMPLETADA',
            <p className="text-xs text-[#F2E8D5] leading-relaxed">
              Transferiste combustible táctico a <strong>{allyName}</strong>. ¡Recibiste{' '}
              <strong className="text-amber-400">+25t de Acero Refinado</strong> en reciprocidad!
            </p>
          );
        }}
        onCoordinateAlly={(allyName) =>
          openGenericModal(
            'TRANSMISIÓN DE COORDINACIÓN ALIADA',
            <p className="text-xs text-[#F2E8D5] leading-relaxed">
              Enviada solicitud de maniobra conjunta a <strong>{allyName}</strong> para el próximo
              Torneo de Alianzas ({resolvedClanTag}).
            </p>
          )
        }
        onOpenRecruitModal={() =>
          openGenericModal(
            'FRECUENCIA DE RECLUTAMIENTO DE ALIANZA',
            <div className="p-3 rounded-[8px_2px_8px_2px] bg-[#161712] border-2 border-[#0A0B08] space-y-2">
              <p className="text-xs text-[#F2E8D5]">
                Código táctico de invitación directa para <strong>{resolvedClanName}</strong>:
              </p>
              <code className="block p-2 bg-[#2B2C24] text-amber-300 font-mono font-extrabold text-xs border border-[#7B8A4A] rounded">
                TACTICAL-HQ-{resolvedClanTag}-9942
              </code>
            </div>
          )
        }
      />

      {/* 4. MODALES INTERNOS ANIMADOS CON MOTION (SALA DE OPERACIONES, DOSSIER CO, ROTOR, RADAR) */}
      <WarRoomModal
        activeModal={activeModal}
        onClose={() => setActiveModal(null)}
        onDeploy={handleDeploy}
        onOpenBattleHQ={() => {
          if (isGuestMode) {
            onOpenAuthModal?.('Debes iniciar sesión para acceder al Estado Mayor de Batalla.');
            return;
          }
          setActiveModal('modal-battle-hq');
        }}
        wheelCanvasRef={wheelCanvasRef}
        isWheelSpinning={isWheelSpinning}
        wheelAngle={wheelAngle}
        wheelResultText={wheelResultText}
        wonPrize={wonPrize}
        onSpinWheel={spinWheel}
        genericModalData={genericModalData}
        activeCommanderId={selectedCOId}
        onSelectCommander={handleCommanderChange}
        commanderBondLevel={commanderBondLevel}
      />

      {/* 5. MODALES DEL METAJUEGO V2 (SOBERANÍA TERRITORIAL, HANGAR FÍSICO & GUARNICIÓN IA) */}
      <TerritoryInspectorModal
        isOpen={Boolean(inspectedProvinceId)}
        onClose={() => setInspectedProvinceId(null)}
        province={
          inspectedProvinceId
            ? (() => {
                const p = provinces.find(pr => pr.id === inspectedProvinceId);
                if (!p) return null;
                const ctrl = controlMap[p.id];
                const cl = ctrl?.controllingClanId ? clansMap[ctrl.controllingClanId] : null;
                return {
                  id: p.id,
                  name: p.name,
                  countryIso: p.countryIso,
                  isCapital: p.isCapital,
                  biome: p.baseTerrain,
                  x: p.posX,
                  y: p.posY,
                  width: p.width,
                  height: p.height,
                  ownerTag: cl?.tag || 'ESTADO',
                  ownerColor: cl?.color || '#7B8A4A',
                  tcp: ctrl?.currentTcp ?? 10000,
                  tcpMax: ctrl?.tcpThreshold ?? 10000,
                  status: ctrl?.status || 'stable',
                  resourcePerMin: `${Math.round(p.resourceMultiplier * 100)} EC/h`,
                };
              })()
            : null
        }
        userClanTag={resolvedClanTag}
        onInitiateAssault={(provId) => {
          setInspectedProvinceId(null);
          handleDeploy('grand_campaign', provId);
        }}
        onDeployReinforcements={(provId) => {
          setInspectedProvinceId(null);
          handleDeploy('blitz_skirmish', provId);
        }}
      />

      <UnitHangarModal
        isOpen={isHangarModalOpen}
        onClose={() => setIsHangarModalOpen(false)}
        userEc={userEc}
        userSteel={localSteel}
        userRareEarth={userRareEarth}
        userComposites={userComposites}
        onUpdateResources={(delta) => {
          if (delta.ec) setUserEc((e) => Math.max(0, e + delta.ec!));
          if (delta.steel) addSteelReward(delta.steel);
          if (delta.rareEarth) setUserRareEarth((r) => Math.max(0, r + delta.rareEarth!));
          if (delta.composites) setUserComposites((c) => Math.max(0, c + delta.composites!));
        }}
      />

      <GarrisonManagementDrawer
        isOpen={isGarrisonDrawerOpen}
        onClose={() => setIsGarrisonDrawerOpen(false)}
        userEc={userEc}
        clanTag={resolvedClanTag}
        controlledProvinces={[
          { id: 'REG_VE_01', name: 'Distrito Capital - Caracas (Hegemonía)' },
          { id: 'REG_VE_05', name: 'Carabobo - Valencia/Pto. Cabello' },
          { id: 'REG_VE_06', name: 'Miranda - Valles del Tuy' },
          { id: 'REG_VE_08', name: 'Aragua - Maracay' },
          { id: 'REG_VE_17', name: 'Guárico - Calabozo/San Juan' },
        ]}
        onSpendEc={(amount) => setUserEc((e) => Math.max(0, e - amount))}
      />

      {/* 3. COMANDANTE REACTIVO (BARK ENGINE - ESQUINA INFERIOR IZQUIERDA) */}
      <CommanderBarkWidget
        commanderId={selectedCOId}
        externalMessage={barkWidgetMessage}
        onClearExternalMessage={() => setBarkWidgetMessage(null)}
        selectedSectorName={selectedProvince?.name}
        onOpenDossier={() => setActiveModal('modal-commander-dossier')}
      />

      {/* 4. CONSOLA DE MACROGESTIÓN Y FORJA (ESTILO PARADOX - LATERAL DERECHO) */}
      <ParadoxCommandDrawer
        isOpen={isParadoxDrawerOpen}
        onClose={() => setIsParadoxDrawerOpen(false)}
        userRank={resolvedLevel >= 8 ? 'veteran' : resolvedLevel >= 4 ? 'sergeant' : resolvedLevel >= 2 ? 'corporal' : 'recruit'}
        userGold={localGold}
        userEnergyEc={userEc}
        clanTag={resolvedClanTag}
        onTriggerBark={(text, balloonType) =>
          setBarkWidgetMessage({
            id: `drawer_${Date.now()}`,
            text,
            balloonType: balloonType ?? 'radio',
            durationMs: 5000,
          })
        }
        onSelectRegion={(regId) => {
          setSelectedProvinceId(regId);
          setIsMetaConsoleOpen(true);
        }}
      />
    </div>
  );
};

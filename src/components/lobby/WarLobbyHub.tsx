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

import React, { useState, useEffect, useRef, useCallback } from 'react';
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
import { CommandHUD } from './CommandHUD';
import { CommanderLivingVignette } from './CommanderLivingVignette';
import { TacticalDock, LobbyStationView } from './TacticalDock';
import { TacticalGhostBar } from './TacticalGhostBar';
import { WarRoomModal, PrizeItem } from './WarRoomModal';

export interface WarLobbyHubProps {
  onDeployCombat?: (format: MatchFormat) => void;
  onStartMatch?: (format: MatchFormat) => void;
  onNavigateToView?: (view: LobbyStationView) => void;
  onOpenShop?: () => void;
  onOpenArmory?: () => void;
  onOpenIndustry?: () => void;
  onOpenMarketplace?: () => void;
  onOpenClans?: () => void;
  onOpenDocs?: () => void;
  onOpenEditor?: () => void;
  onOpenProfile?: () => void;
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
  activeDeckCount?: number;
  // Extensiones para el Shell Diegético Persistente (Zero-Unmount)
  activeStation?: LobbyStationView | null;
  onCloseStation?: () => void;
  onGainGold?: (deltaGold: number) => void;
  onGainSteel?: (deltaSteel: number) => void;
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
  activeDeckCount = 10,
  activeStation = null,
  onCloseStation,
  onGainGold,
  onGainSteel,
  children,
}) => {
  // Estados Locales de Recursos Dinámicos & Cosecha
  const [localGold, setLocalGold] = useState(userGold);
  const [localSteel, setLocalSteel] = useState(userSteel);
  const [localEnergy, setLocalEnergy] = useState(75);
  const maxEnergy = 80;
  const [energyTimerSeconds, setEnergyTimerSeconds] = useState(312);
  const [offerTimerSeconds, setOfferTimerSeconds] = useState(899);

  // Estado sincronizado del Comandante Activo y Hover Contextual del Bark Engine
  const [selectedCOId, setSelectedCOId] = useState<COId>(() =>
    resolveCanonicalCOId(activeCommanderId)
  );
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
    setSelectedCOId(resolveCanonicalCOId(activeCommanderId));
  }, [activeCommanderId]);

  useEffect(() => {
    setLocalGold(userGold);
  }, [userGold]);

  useEffect(() => {
    setLocalSteel(userSteel);
  }, [userSteel]);

  const handleCommanderChange = useCallback(
    (nextCoId: COId) => {
      setSelectedCOId(nextCoId);
      onSelectCommander?.(nextCoId);
    },
    [onSelectCommander]
  );

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
    (format: MatchFormat) => {
      audioManager.playSFX('cannon');
      setActiveModal(null);
      if (onDeployCombat) onDeployCombat(format);
      else if (onStartMatch) onStartMatch(format);
    },
    [onDeployCombat, onStartMatch]
  );

  const handleNavigate = useCallback(
    (view: LobbyStationView) => {
      audioManager.playSFX('button_click');
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

  const spinWheel = () => {
    if (isWheelSpinning) return;
    setIsWheelSpinning(true);
    setWonPrize(null);
    audioManager.playSFX('button_click');
    setWheelResultText('TIEMPO 1 // ACELERANDO ROTOR C4ISR...');

    const extraRounds = 5 + Math.floor(Math.random() * 4);
    const randomSegment = Math.floor(Math.random() * WHEEL_PRIZES.length);
    const segmentAngle = 360 / WHEEL_PRIZES.length;
    const targetDeg =
      extraRounds * 360 + (360 - (randomSegment * segmentAngle + segmentAngle / 2) - 90);

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
      const won = WHEEL_PRIZES[randomSegment];
      setWonPrize(won);
      audioManager.playComboAction(8);
      setWheelResultText(`¡SUMINISTRO ASEGURADO: ${won.text}!`);

      if (won.type === 'gold') addGoldReward(won.amount);
      if (won.type === 'steel') addSteelReward(won.amount);
      if (won.type === 'energy') setLocalEnergy((e) => Math.min(maxEnergy, e + won.amount));
    }, 4050);
  };

  return (
    <div className="h-screen max-h-screen w-full overflow-hidden flex flex-col justify-between bg-[#161712] text-[#F2E8D5] font-sans select-none relative">
      {/* 1. ZONA SUPERIOR: COMMAND HUD (CAPA 4 NO-DIEGÉTICA) */}
      <CommandHUD
        resolvedLevel={resolvedLevel}
        userXp={userXp}
        nextLevelXp={nextLevelXp}
        resolvedClanTag={resolvedClanTag}
        arenaName={currentArena.name}
        userTrophies={userTrophies}
        shieldCharges={shieldCharges}
        isTournamentMode={isTournamentMode}
        onToggleTournament={toggleTournament}
        localGold={localGold}
        userGems={userGems}
        localSteel={localSteel}
        localEnergy={localEnergy}
        maxEnergy={maxEnergy}
        energyTimerFormatted={formatTime(energyTimerSeconds)}
        isAudioMuted={isAudioMuted}
        onToggleAudio={toggleAudio}
        isCrtActive={isCrtActive}
        onToggleCrt={() => setIsCrtActive((prev) => !prev)}
        isReducedMotion={isReducedMotion}
        onToggleReducedMotion={() => setIsReducedMotion((prev) => !prev)}
        onOpenProfile={onOpenProfile}
        onNavigate={handleNavigate}
        activeCommanderId={selectedCOId}
        onHoverIntent={setHoverIntent}
      />

      {/* 2. ESCENARIO COMPETITIVO PRINCIPAL: THE LIVING COMIC CANVAS + MATRIZ DIEGÉTICA */}
      <main className="relative flex-1 min-h-0 w-full overflow-y-auto lg:overflow-hidden bg-[#161712] ben-day-dark p-2.5 sm:p-3.5">
        <div className="max-w-[1600px] mx-auto w-full h-full grid grid-cols-1 lg:grid-cols-12 gap-3.5 items-stretch">
          {/* ==================================================================
              CUADRANTE IZQUIERDO/CENTRAL (7/12 ~58%): THE LIVING COMIC CANVAS
             ================================================================== */}
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
                      <strong className="text-amber-400">{resolvedClanName}</strong> (
                      {resolvedClanTag}).
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

          {/* ==================================================================
              CUADRANTE DERECHO (5/12 ~42%): MATRIZ DE NAVEGACIÓN DIEGÉTICA
             ================================================================== */}
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

                <button
                  type="button"
                  onMouseEnter={() => audioManager.playHoverTick()}
                  onClick={() => setActiveModal('modal-radar-map')}
                  className="px-2 py-0.5 rounded-[6px_2px_6px_2px] bg-[#161712] border border-[#00FF66]/60 text-[10px] font-mono font-extrabold text-[#00FF66] flex items-center gap-1 cursor-pointer hover:bg-[#1F201A]"
                  title="Inspeccionar Radar Polar de Sectores"
                >
                  <Radar className="w-3 h-3" />
                  <span>RADAR</span>
                </button>
              </div>

              {/* Botón Titán Principal con Squash & Stretch */}
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
              {/* 1. HANGAR DE TROPAS / ARMERÍA (user_cards) */}
              <button
                type="button"
                onMouseEnter={() => {
                  audioManager.playHoverTick();
                  setHoverIntent('hover_armory');
                }}
                onMouseLeave={() => setHoverIntent(null)}
                onClick={() => handleNavigate('armory')}
                className="tactical-comic-card-interactive p-3 bg-[#2B2C24] border-2 border-[#0A0B08] hover:border-sky-400 text-left flex flex-col justify-between"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="w-8 h-8 rounded-[8px_2px_8px_2px] bg-[#161712] border border-sky-400/60 flex items-center justify-center text-sky-400">
                    <Palette className="w-4 h-4" />
                  </div>
                  <span className="px-1.5 py-0.5 rounded bg-[#161712] border border-[#7B8A4A]/60 text-[10px] font-mono font-extrabold text-sky-300">
                    [3] MAZO {activeDeckCount}/10
                  </span>
                </div>
                <div className="mt-2">
                  <h3 className="font-display font-extrabold text-sm text-[#F2E8D5] uppercase tracking-wider">
                    Hangar & Armería
                  </h3>
                  <p className="text-[11px] text-[#A9B87A] font-sans leading-tight mt-0.5">
                    Mazo Táctico de 10 Cartas y camuflaje de unidades.
                  </p>
                </div>
              </button>

              {/* 2. CUARTEL DE OFICIALES / WAR ROOM (commanders_catalog / user_commanders) */}
              <button
                type="button"
                onMouseEnter={() => {
                  audioManager.playHoverTick();
                  setHoverIntent('hover_war_room');
                }}
                onMouseLeave={() => setHoverIntent(null)}
                onClick={() => {
                  audioManager.playSFX('button_click');
                  setActiveModal('modal-commander-dossier');
                }}
                className="tactical-comic-card-interactive p-3 bg-[#2B2C24] border-2 border-[#0A0B08] hover:border-amber-400 text-left flex flex-col justify-between"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="w-8 h-8 rounded-[8px_2px_8px_2px] bg-[#161712] border border-amber-400/60 flex items-center justify-center text-amber-400">
                    <Users className="w-4 h-4" />
                  </div>
                  <span className="px-1.5 py-0.5 rounded bg-[#161712] border border-[#7B8A4A]/60 text-[10px] font-mono font-extrabold text-amber-300">
                    [C] 28 OFICIALES
                  </span>
                </div>
                <div className="mt-2">
                  <h3 className="font-display font-extrabold text-sm text-[#F2E8D5] uppercase tracking-wider">
                    Cuartel de Oficiales
                  </h3>
                  <p className="text-[11px] text-[#A9B87A] font-sans leading-tight mt-0.5">
                    Dossier D2D, COP/SCOP y Vínculo Nv.{commanderBondLevel}/10.
                  </p>
                </div>
              </button>

              {/* 3. COMPLEJO INDUSTRIAL & SILOS (user_industrial_inventory) */}
              <div
                onMouseEnter={() => {
                  audioManager.playHoverTick();
                  setHoverIntent('hover_industry');
                }}
                onMouseLeave={() => setHoverIntent(null)}
                onClick={() => handleNavigate('industry')}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleNavigate('industry');
                  }
                }}
                className="tactical-comic-card-interactive p-3 bg-[#2B2C24] border-2 border-[#0A0B08] hover:border-[#C46A3A] text-left flex flex-col justify-between"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="w-8 h-8 rounded-[8px_2px_8px_2px] bg-[#161712] border border-[#C46A3A]/60 flex items-center justify-center text-[#C46A3A]">
                    <Factory className="w-4 h-4" />
                  </div>
                  {pendingSiloSteel > 0 ? (
                    <button
                      type="button"
                      onClick={handleCollectSiloSteel}
                      className="px-2 py-0.5 rounded bg-amber-400 text-[#0A0B08] border border-[#0A0B08] text-[10px] font-mono font-extrabold uppercase animate-pulse cursor-pointer"
                      title="Extraer producción acumulada de los silos"
                    >
                      ¡COSECHAR +{pendingSiloSteel}t!
                    </button>
                  ) : (
                    <span className="px-1.5 py-0.5 rounded bg-[#161712] border border-[#7B8A4A]/60 text-[10px] font-mono font-extrabold text-[#A9B87A]">
                      [2] RESERVA {localSteel}t
                    </span>
                  )}
                </div>
                <div className="mt-2">
                  <h3 className="font-display font-extrabold text-sm text-[#F2E8D5] uppercase tracking-wider">
                    Complejo Industrial
                  </h3>
                  <p className="text-[11px] text-[#A9B87A] font-sans leading-tight mt-0.5">
                    Refinería de acero, silicio y extracción de silos ({elapsedSiloHours}h).
                  </p>
                </div>
              </div>

              {/* 4. INTENDENCIA MILITAR & BOLSA P2P (user_cosmetics / store_products_catalog) */}
              <div
                onMouseEnter={() => {
                  audioManager.playHoverTick();
                  setHoverIntent('hover_shop');
                }}
                onMouseLeave={() => setHoverIntent(null)}
                onClick={() => handleNavigate('shop')}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleNavigate('shop');
                  }
                }}
                className="tactical-comic-card-interactive p-3 bg-[#2B2C24] border-2 border-[#0A0B08] hover:border-purple-400 text-left flex flex-col justify-between"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="w-8 h-8 rounded-[8px_2px_8px_2px] bg-[#161712] border border-purple-400/60 flex items-center justify-center text-purple-400">
                    <ShoppingBag className="w-4 h-4" />
                  </div>
                  <button
                    type="button"
                    onMouseEnter={(e) => {
                      e.stopPropagation();
                      setHoverIntent('hover_marketplace');
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleNavigate('marketplace');
                    }}
                    className="px-2 py-0.5 rounded bg-[#161712] hover:border-amber-400 border border-[#7B8A4A] text-[10px] font-mono font-extrabold text-amber-300 flex items-center gap-1 cursor-pointer"
                    title="Abrir Bolsa Negra P2P [Tecla 4]"
                  >
                    <Scale className="w-3 h-3" />
                    <span>[4] BOLSA P2P</span>
                  </button>
                </div>
                <div className="mt-2">
                  <div className="flex items-center justify-between">
                    <h3 className="font-display font-extrabold text-sm text-[#F2E8D5] uppercase tracking-wider">
                      Intendencia [1]
                    </h3>
                    <span className="text-[10px] font-mono font-extrabold text-[#C46A3A] tabular-nums">
                      {formatTime(offerTimerSeconds)}
                    </span>
                  </div>
                  <p className="text-[11px] text-[#A9B87A] font-sans leading-tight mt-0.5">
                    Skins cosméticas, suministros y comercio P2P.
                  </p>
                </div>
              </div>

              {/* 5. CENTRO DE CLANES / CORPORACIÓN (clans / clan_members) */}
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
                    Alianza militar, donaciones y Salvaguarda ({shieldCharges}/3).
                  </p>
                </div>
              </button>

              {/* 6. PERFIL MILITAR & RÉCORDS (profiles) */}
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
                    [P] {userTrophies} 🏆
                  </span>
                </div>
                <div className="mt-2">
                  <h3 className="font-display font-extrabold text-sm text-[#F2E8D5] uppercase tracking-wider">
                    Expediente & Récords
                  </h3>
                  <p className="text-[11px] text-[#A9B87A] font-sans leading-tight mt-0.5">
                    Hoja de servicio, medallas fijas y rango competitivo.
                  </p>
                </div>
              </button>
            </div>

            {/* BLOQUE 3: OPERACIONES DIARIAS, DOSSIER DE MISIÓN Y ROTOR C4ISR */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 shrink-0">
              {/* Dossier de Misión en Papel Crema */}
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
                        Completa 2 escaramuzas mecanizadas con {activeCO.name} para asegurar la bahía.
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
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                  }
                }}
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

              {/* Botones Compactos: Rotor [R], Órdenes Diarias y Condecoraciones */}
              <div className="sm:col-span-6 flex flex-col gap-1.5">
                <button
                  type="button"
                  onMouseEnter={() => {
                    audioManager.playHoverTick();
                    setHoverIntent('hover_rotor');
                  }}
                  onMouseLeave={() => setHoverIntent(null)}
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
                          <p className="text-amber-400 font-bold">
                            ✓ 1. Desplegar 1 tanque ligero (1/1) — COMPLETADO
                          </p>
                          <p className="text-[#F2E8D5]">
                            ○ 2. Capturar 2 ciudades en Duelo Espejo (0/2)
                          </p>
                          <p className="text-[#A9B87A]">
                            ○ 3. Ganar 1 Escaramuza Blitz sin perder artillería (0/1)
                          </p>
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
                        'CONDECORACIONES Y COMPENDIO MILITAR',
                        <div className="space-y-2.5">
                          <div className="p-3 rounded-[8px_2px_8px_2px] bg-[#161712] border-2 border-amber-400 flex items-center justify-between">
                            <div>
                              <span className="font-display font-extrabold text-xs text-amber-400 block">
                                ★ VETERANO DE ACERO
                              </span>
                              <span className="text-[11px] text-[#A9B87A]">
                                Acumula reservas estratégicas en la fundición.
                              </span>
                            </div>
                            <span className="px-2 py-0.5 bg-amber-400 text-[#0A0B08] font-mono font-extrabold text-[10px] rounded">
                              DOMINADO
                            </span>
                          </div>
                          <div className="p-3 rounded-[8px_2px_8px_2px] bg-[#161712]/70 border border-dashed border-[#7B8A4A] flex items-center justify-between opacity-85">
                            <div>
                              <span className="font-display font-extrabold text-xs text-[#F2E8D5] block">
                                🔒 ??? // PROTOCOLO RELÁMPAGO
                              </span>
                              <span className="text-[11px] text-[#A9B87A]">
                                Pista: Vence un Duelo Espejo en menos de 6 turnos sin perder tanques.
                              </span>
                            </div>
                            <span className="text-xs font-mono font-extrabold text-amber-400">
                              +1,000G
                            </span>
                          </div>
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
        onOpenBattleHQ={() => setActiveModal('modal-battle-hq')}
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
        onOpenBattleHQ={() => setActiveModal('modal-battle-hq')}
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
    </div>
  );
};

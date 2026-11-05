import React from 'react';
import { motion } from 'motion/react';
import {
  Coins,
  Sparkles,
  Layers,
  Zap,
  Volume2,
  VolumeX,
  Tv,
  Trophy,
  ShieldCheck,
  Activity,
  LogIn,
  Eye,
  Radio,
  Globe,
} from 'lucide-react';
import { audioManager } from '../../engine/audioManager';
import {
  CANONICAL_CO_REGISTRY,
  COId,
  CO_FACTION_META,
  getCOFullBodyUrl,
  resolveCanonicalCOId,
} from '../../engine/coSystem';
import { LobbyBarkIntent } from '../../engine/barkEngine';
import { TacticalGhostBar } from './TacticalGhostBar';

export interface CommandHUDProps {
  resolvedLevel: number;
  userXp: number;
  nextLevelXp: number;
  resolvedClanTag: string;
  arenaName: string;
  userTrophies: number;
  shieldCharges: number;
  isTournamentMode: boolean;
  onToggleTournament: () => void;
  localGold: number;
  userGems: number;
  localSteel: number;
  localEnergy: number;
  maxEnergy: number;
  energyTimerFormatted: string;
  isAudioMuted: boolean;
  onToggleAudio: () => void;
  isCrtActive: boolean;
  onToggleCrt: () => void;
  isReducedMotion: boolean;
  onToggleReducedMotion: () => void;
  onOpenProfile?: () => void;
  onNavigate: (view: 'shop' | 'armory' | 'industry' | 'marketplace' | 'clans' | 'docs' | 'qa') => void;
  activeCommanderId?: COId;
  onHoverIntent?: (intent: LobbyBarkIntent | null) => void;
  isGuestMode?: boolean;
  onOpenAuthModal?: () => void;
  onOpenLoadingScreen?: () => void;
}

export const CommandHUD: React.FC<CommandHUDProps> = ({
  resolvedLevel,
  userXp,
  nextLevelXp,
  resolvedClanTag,
  arenaName,
  userTrophies,
  shieldCharges,
  isTournamentMode,
  onToggleTournament,
  localGold,
  userGems,
  localSteel,
  localEnergy,
  maxEnergy,
  energyTimerFormatted,
  isAudioMuted,
  onToggleAudio,
  isCrtActive,
  onToggleCrt,
  isReducedMotion,
  onToggleReducedMotion,
  onOpenProfile,
  onNavigate,
  activeCommanderId = 'andy',
  onHoverIntent,
  isGuestMode = false,
  onOpenAuthModal,
  onOpenLoadingScreen,
}) => {
  const canonicalId = resolveCanonicalCOId(activeCommanderId);
  const activeCO = CANONICAL_CO_REGISTRY[canonicalId];
  const factionMeta = CO_FACTION_META[activeCO.faction];

  return (
    <header className="relative z-30 px-3 py-1.5 flex items-center justify-between gap-2 max-w-full bg-[#1F201A] border-b-2 border-[#0A0B08] shadow-[0_4px_0px_#0A0B08] ben-day-dark shrink-0">
      {/* 1. EXPEDIENTE DEL COMANDANTE EN JEFE + RETRATO HERÁLDICO + GHOST BAR EXP */}
      <button
        type="button"
        onMouseEnter={() => {
          audioManager.playHoverTick();
          onHoverIntent?.('hover_profile');
        }}
        onMouseLeave={() => onHoverIntent?.(null)}
        onClick={() => {
          audioManager.playSFX('button_click');
          onOpenProfile?.();
        }}
        className="tactical-comic-card-interactive flex items-center gap-2.5 px-2.5 py-1.5 bg-[#2B2C24] hover:border-[#F59E0B] text-left group"
        title="Inspeccionar Expediente Militar e Identidad de Mando [P]"
      >
        {/* Retrato del Comandante Activo con Marco de Facción */}
        <div
          className={`relative w-11 h-11 rounded-[10px_3px_10px_3px] bg-[#161712] border-2 ${factionMeta.borderClass} overflow-hidden flex items-center justify-center shrink-0 shadow-[2px_2px_0px_#0A0B08]`}
        >
          <img
            src={getCOFullBodyUrl(canonicalId)}
            alt={activeCO.name}
            className="w-full h-full object-cover object-top"
          />
          <span
            className="absolute bottom-0 right-0 text-[#F2E8D5] text-[10px] font-display font-extrabold px-1.5 leading-tight border-t-2 border-l-2 border-[#0A0B08] tabular-nums"
            style={{ backgroundColor: factionMeta.primaryHex }}
          >
            {resolvedLevel}
          </span>
        </div>

        {/* Telemetría de Rango & Barra de EXP con Ghost Trail */}
        <div className="flex flex-col min-w-[148px]">
          <div className="flex items-center justify-between gap-2 leading-none mb-1">
            <span className="font-display font-extrabold text-xs text-[#F2E8D5] uppercase tracking-wider group-hover:text-amber-400 transition-colors">
              NVL. {resolvedLevel} ★ {activeCO.name}
            </span>
            <span className="px-1.5 py-0.5 rounded-[4px_1px_4px_1px] bg-[#161712] border border-[#7B8A4A]/60 text-[9px] font-mono font-bold text-[#A9B87A]">
              [P]
            </span>
          </div>

          <TacticalGhostBar
            value={userXp}
            max={nextLevelXp}
            heightClassName="h-3.5"
            fillClassName="bg-gradient-to-r from-[#E65100] via-[#C46A3A] to-amber-400"
            ghostClassName="bg-[#F2E8D5]"
            label={`EXP ${userXp}/${nextLevelXp}`}
          />
        </div>
      </button>

      {/* 2. CONSOLA CENTRAL C4ISR: ESTADO ONLINE, ARENA Y CONMUTADOR DE TORNEO */}
      <div className="hidden xl:flex items-center gap-3 bg-[#161712] border-2 border-[#0A0B08] rounded-[14px_4px_14px_4px] px-3.5 py-1.5 shadow-[3px_3px_0px_#0A0B08]">
        <div className="flex items-center gap-2.5">
          {/* Único LED CRT Verde Fósforo Online en Header */}
          <span className="w-2.5 h-2.5 rounded-full bg-[#00FF66] shadow-[0_0_8px_#00FF66] animate-pulse shrink-0" />
          <div className="text-left">
            <div className="flex items-center gap-2">
              <span className="font-display font-extrabold text-xs tracking-wider text-[#F2E8D5] uppercase">
                CENTRAL C4ISR // SALA DE GUERRA
              </span>
              <span className="text-[10px] px-1.5 py-0.5 rounded-[4px_1px_4px_1px] bg-[#46521F] text-[#F2E8D5] border border-[#0A0B08] font-mono font-bold">
                {resolvedClanTag}
              </span>
            </div>
            <div className="flex items-center gap-2.5 text-[10px] text-[#A9B87A] font-mono font-bold mt-0.5 tabular-nums">
              <span>
                FRENTE: <strong className="text-[#F2E8D5]">{arenaName.toUpperCase()}</strong>
              </span>
              <span className="text-[#7B8A4A]">•</span>
              <span className="text-amber-400 flex items-center gap-1">
                <Trophy className="w-3 h-3" /> {userTrophies}
              </span>
              <span className="text-[#7B8A4A]">•</span>
              <span className="text-emerald-400 flex items-center gap-1">
                <ShieldCheck className="w-3 h-3" /> ESCUDO {shieldCharges}/3
              </span>
            </div>
          </div>
        </div>

        {/* Conmutador Elástico Torneo (Cap N11) vs Ladder Diario (N15) */}
        <button
          type="button"
          onMouseEnter={() => audioManager.playHoverTick()}
          onClick={onToggleTournament}
          className={`tactical-juice-btn px-3 py-1 text-[11px] font-display font-extrabold uppercase tracking-wider border-2 border-[#0A0B08] ${
            isTournamentMode
              ? 'bg-amber-400 text-[#0A0B08]'
              : 'bg-[#2B2C24] text-[#F2E8D5] hover:border-amber-400'
          }`}
          title="Alternar reglamento competitivo: Cap Simétrico N11 vs Ladder Asimétrico N15"
        >
          {isTournamentMode ? '⚖️ TORNEO (CAP N11)' : '⚔️ LADDER (N1-N15)'}
        </button>
      </div>

      {/* 3. BANCO DE RECURSOS EN TIEMPO REAL CON ODÓMETRO MOTION Y BOTONES >=24PX */}
      <div className="flex items-center gap-2 flex-wrap justify-end">
        {/* Fondos Militares ($G) */}
        <div className="tactical-comic-card flex items-center gap-2 px-2.5 py-1 bg-[#2B2C24]">
          <Coins className="w-4 h-4 text-amber-400 shrink-0" />
          <div className="flex flex-col">
            <span className="text-[10px] text-[#A9B87A] uppercase font-bold leading-none">
              Fondos
            </span>
            <motion.span
              key={localGold}
              initial={{ scale: 1.32, color: '#F59E0B' }}
              animate={{ scale: 1, color: '#F2E8D5' }}
              transition={{ type: 'spring', stiffness: 460, damping: 18 }}
              className="text-xs font-mono font-extrabold tracking-wide leading-none mt-0.5 tabular-nums inline-block"
            >
              {localGold.toLocaleString()}G
            </motion.span>
          </div>
          <button
            type="button"
            onMouseEnter={() => audioManager.playHoverTick()}
            onClick={() => onNavigate('shop')}
            aria-label="Adquirir más Fondos en Intendencia"
            className="w-6 h-6 rounded-[6px_2px_6px_2px] bg-[#C46A3A] hover:bg-[#df7b48] active:scale-95 text-[#F2E8D5] border border-[#0A0B08] text-xs font-black flex items-center justify-center leading-none ml-0.5 cursor-pointer transition-transform"
          >
            +
          </button>
        </div>

        {/* Gemas / Isótopos */}
        <div className="tactical-comic-card flex items-center gap-2 px-2.5 py-1 bg-[#2B2C24]">
          <Sparkles className="w-4 h-4 text-purple-400 shrink-0" />
          <div className="flex flex-col">
            <span className="text-[10px] text-[#A9B87A] uppercase font-bold leading-none">
              Gemas
            </span>
            <motion.span
              key={userGems}
              initial={{ scale: 1.32, color: '#C084FC' }}
              animate={{ scale: 1, color: '#E9D5FF' }}
              transition={{ type: 'spring', stiffness: 460, damping: 18 }}
              className="text-xs font-mono font-extrabold tracking-wide leading-none mt-0.5 tabular-nums inline-block"
            >
              {userGems.toLocaleString()}
            </motion.span>
          </div>
          <button
            type="button"
            onMouseEnter={() => audioManager.playHoverTick()}
            onClick={() => onNavigate('shop')}
            aria-label="Adquirir más Gemas en Intendencia"
            className="w-6 h-6 rounded-[6px_2px_6px_2px] bg-[#C46A3A] hover:bg-[#df7b48] active:scale-95 text-[#F2E8D5] border border-[#0A0B08] text-xs font-black flex items-center justify-center leading-none ml-0.5 cursor-pointer transition-transform"
          >
            +
          </button>
        </div>

        {/* Acero Refinado */}
        <div className="hidden sm:flex tactical-comic-card items-center gap-2 px-2.5 py-1 bg-[#2B2C24]">
          <Layers className="w-4 h-4 text-[#A9B87A] shrink-0" />
          <div className="flex flex-col">
            <span className="text-[10px] text-[#A9B87A] uppercase font-bold leading-none">
              Acero
            </span>
            <motion.span
              key={localSteel}
              initial={{ scale: 1.35, color: '#00FF66' }}
              animate={{ scale: 1, color: '#F2E8D5' }}
              transition={{ type: 'spring', stiffness: 460, damping: 18 }}
              className="text-xs font-mono font-extrabold tracking-wide leading-none mt-0.5 tabular-nums inline-block"
            >
              {localSteel}t
            </motion.span>
          </div>
          <button
            type="button"
            onMouseEnter={() => audioManager.playHoverTick()}
            onClick={() => onNavigate('industry')}
            aria-label="Abrir Complejo Industrial de Acero"
            className="w-6 h-6 rounded-[6px_2px_6px_2px] bg-[#46521F] hover:bg-[#586827] active:scale-95 text-[#F2E8D5] border border-[#0A0B08] text-xs font-black flex items-center justify-center leading-none ml-0.5 cursor-pointer transition-transform"
          >
            +
          </button>
        </div>

        {/* Células de Energía Operacional con Mini Ghost Bar */}
        <div className="hidden md:flex tactical-comic-card items-center gap-2 px-2.5 py-1 bg-[#2B2C24] min-w-[105px]">
          <Zap className="w-4 h-4 text-amber-400 shrink-0" />
          <div className="flex flex-col flex-1">
            <div className="flex items-center justify-between text-[10px] font-mono font-extrabold leading-none tabular-nums">
              <span className="text-[#F2E8D5]">
                {localEnergy}/{maxEnergy}
              </span>
              <span className="text-amber-400 ml-1">{energyTimerFormatted}</span>
            </div>
            <div className="mt-1">
              <TacticalGhostBar
                value={localEnergy}
                max={maxEnergy}
                heightClassName="h-2"
                fillClassName="bg-amber-400"
                ghostClassName="bg-[#F2E8D5]"
              />
            </div>
          </div>
        </div>

        {/* Botón de Enlistarse si es Modo Huésped */}
        {isGuestMode && onOpenAuthModal && (
          <button
            type="button"
            onClick={() => {
              audioManager.playDeployHorn();
              onOpenAuthModal();
            }}
            onMouseEnter={() => audioManager.playHoverTick()}
            className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 bg-[#E65100] hover:bg-amber-400 text-black border-2 border-[#0A0B08] font-display font-black text-[11px] uppercase rounded-[6px_2px_6px_2px] shadow-[2px_2px_0px_#0A0B08] cursor-pointer transition-transform active:translate-y-0.5 ml-1"
            title="Iniciar sesión para guardar tu expediente militar en Supabase"
          >
            <LogIn className="w-3.5 h-3.5" />
            <span>ACCEDER</span>
          </button>
        )}

        {/* Controles de Consola: Audio, Scanlines CRT y Accesibilidad Reduce Motion */}
        <div className="flex items-center gap-1 ml-0.5">
          {onOpenLoadingScreen && (
            <button
              type="button"
              onMouseEnter={() => audioManager.playHoverTick()}
              onClick={() => {
                audioManager.playSFX('button_click');
                onOpenLoadingScreen();
              }}
              title="Ver Pantalla de Carga Táctica // GEOTACTICS ONLINE"
              aria-label="Ver Pantalla de Carga Táctica"
              className="w-8 h-8 rounded-[8px_2px_8px_2px] flex items-center justify-center bg-[#2B2C24] border-2 border-[#0A0B08] shadow-[2px_2px_0px_#0A0B08] hover:border-[#00FF66] text-xs text-[#00FF66] cursor-pointer transition-colors"
            >
              <Radio className="w-4 h-4 animate-pulse" />
            </button>
          )}

          <button
            type="button"
            onMouseEnter={() => audioManager.playHoverTick()}
            onClick={onToggleAudio}
            title={isAudioMuted ? 'Activar Audio Táctico' : 'Silenciar Audio Táctico'}
            aria-label={isAudioMuted ? 'Activar Audio Táctico' : 'Silenciar Audio Táctico'}
            className="w-8 h-8 rounded-[8px_2px_8px_2px] flex items-center justify-center bg-[#2B2C24] border-2 border-[#0A0B08] shadow-[2px_2px_0px_#0A0B08] hover:border-amber-400 text-xs text-[#F2E8D5] cursor-pointer transition-colors"
          >
            {isAudioMuted ? (
              <VolumeX className="w-4 h-4 text-red-400" />
            ) : (
              <Volume2 className="w-4 h-4 text-amber-400" />
            )}
          </button>

          <button
            type="button"
            onMouseEnter={() => audioManager.playHoverTick()}
            onClick={() => {
              audioManager.playSFX('button_click');
              onToggleCrt();
            }}
            title="Alternar Malla CRT Táctica"
            aria-label="Alternar Malla CRT Táctica"
            className={`w-8 h-8 rounded-[8px_2px_8px_2px] flex items-center justify-center bg-[#2B2C24] border-2 border-[#0A0B08] shadow-[2px_2px_0px_#0A0B08] hover:border-amber-400 text-xs cursor-pointer transition-colors ${
              isCrtActive ? 'text-[#00FF66]' : 'text-[#A9B87A]'
            }`}
          >
            <Tv className="w-4 h-4" />
          </button>

          <button
            type="button"
            onMouseEnter={() => audioManager.playHoverTick()}
            onClick={() => {
              audioManager.playSFX('button_click');
              onToggleReducedMotion();
            }}
            title={
              isReducedMotion
                ? 'Modo Movimiento Reducido ACTIVO (WCAG 2.3.1)'
                : 'Alternar Movimiento Reducido (Accesibilidad)'
            }
            aria-label="Alternar Movimiento Reducido"
            className={`w-8 h-8 rounded-[8px_2px_8px_2px] flex items-center justify-center bg-[#2B2C24] border-2 border-[#0A0B08] shadow-[2px_2px_0px_#0A0B08] hover:border-amber-400 text-xs cursor-pointer transition-colors ${
              isReducedMotion ? 'text-amber-400' : 'text-[#A9B87A]'
            }`}
          >
            <Activity className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};

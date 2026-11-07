import React, { useState } from 'react';
import { motion } from 'motion/react';
import {
  Crosshair,
  AlertTriangle,
  Flame,
  Gift,
  Mail,
  Award,
  Shield,
  Activity,
  MessageSquare,
} from 'lucide-react';
import { audioManager } from '@domains/game-feel';
import { barkEngine } from '@domains/game-feel';
import { TacticalGhostBar } from './TacticalGhostBar';

export interface FactionBannerProps {
  resolvedClanTag: string;
  streak: number;
  streakMultiplier: number;
  offerTimerFormatted: string;
  onClaimSupplyGift: () => void;
  onOpenEncryptedMail: () => void;
  onOpenMissionModal: () => void;
  onOpenBattleHQ: () => void;
  onOpenRuleta: () => void;
  onOpenAchievements: () => void;
  onOpenDailyOrders: () => void;
  onNavigate: (view: 'shop' | 'armory' | 'industry' | 'marketplace' | 'clans' | 'docs' | 'qa') => void;
}

const LOBBY_COMMANDER_REPORTS = [
  {
    stamp: '¡TACTICAL!',
    stampColor: 'bg-yellow-400 text-[#0A0B08]',
    text: '¡Silos de acero al 90% de capacidad! Extrae los lingotes o despliega tanques en el sector costero.',
  },
  {
    stamp: '¡RATATAT!',
    stampColor: 'bg-[#E65100] text-[#F2E8D5]',
    text: '¡El Mazo de 10 Cartas está cebado en el Hangar! Cero enfriamientos artificiales, pura cadencia de fuego.',
  },
  {
    stamp: '¡ALERT!',
    stampColor: 'bg-red-500 text-white',
    text: '¡Radares C4ISR detectan actividad de Blue Moon en el arrecife! Recomiendo salida inmediata en Duelo Espejo.',
  },
];

export const FactionBanner: React.FC<FactionBannerProps> = ({
  resolvedClanTag,
  streak,
  streakMultiplier,
  offerTimerFormatted,
  onClaimSupplyGift,
  onOpenEncryptedMail,
  onOpenMissionModal,
  onOpenBattleHQ,
  onOpenRuleta,
  onOpenAchievements,
  onOpenDailyOrders,
  onNavigate,
}) => {
  const [barkIndex, setBarkIndex] = useState(0);
  const currentReport = LOBBY_COMMANDER_REPORTS[barkIndex % LOBBY_COMMANDER_REPORTS.length];

  const handleCycleCommanderBark = () => {
    audioManager.playComboAction(barkIndex + 1);
    setBarkIndex((prev) => prev + 1);
    barkEngine.triggerBark({
      commanderId: 'stella',
      triggerContext: 'match_start',
      bondingLevel: 4,
      playerName: 'Comandante',
    });
  };

  return (
    <>
      {/* ====================================================================
          ZONA 3A: COLUMNA IZQUIERDA COMPACTA (BARK GUARDIA + DOSSIER + DEFCON)
          Ancho contenido (w-64) para dejar despejada la Bahía y el Astillero
         ==================================================================== */}
      <aside className="absolute left-3 top-3 z-20 flex flex-col gap-2.5 pointer-events-none w-64 max-w-[44vw]">
        {/* 1. VIÑETA REACTIVA DEL COMANDANTE EN GUARDIA (BARK ENGINE CÓMIC) */}
        <motion.button
          type="button"
          onMouseEnter={() => audioManager.playHoverTick()}
          onClick={handleCycleCommanderBark}
          whileTap={{ scale: 0.97 }}
          className="pointer-events-auto tactical-comic-card-interactive p-2.5 bg-[#2B2C24] border-2 border-[#0A0B08] text-left relative overflow-visible group"
          title="Solicitar parte táctico de la Mayor Stella (Activa Bark Engine)"
        >
          {/* Sello Pop-Art Rotado de Onomatopeya */}
          <span
            className={`absolute -top-2.5 -right-2 z-20 px-2 py-0.5 font-display font-extrabold text-[10px] uppercase tracking-widest border-2 border-[#0A0B08] shadow-[3px_3px_0px_#0A0B08] rotate-[-5deg] ${currentReport.stampColor}`}
          >
            {currentReport.stamp}
          </span>

          <div className="flex items-center justify-between gap-1.5 mb-1.5">
            <span className="px-1.5 py-0.5 rounded-[4px_1px_4px_1px] bg-[#E65100] text-[#F2E8D5] font-display font-extrabold text-[10px] uppercase tracking-wider border border-[#0A0B08]">
              ★ MAYOR STELLA // OFICIAL GUARDIA
            </span>
            <MessageSquare className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          </div>

          {/* Bocadillo en Papel Táctico Crema (#F2E8D5) con Trama Ben-Day */}
          <div className="p-2 rounded-[10px_3px_10px_3px] bg-[#F2E8D5] text-[#0A0B08] border-2 border-[#0A0B08] ben-day-rust text-[11px] font-sans font-bold leading-snug shadow-[2px_2px_0px_#0A0B08]">
            “{currentReport.text}”
          </div>
        </motion.button>

        {/* 2. DOSSIER DE MISIÓN DE CAMPAÑA (PAPEL TÁCTICO CREMA DE ALTO CONTRASTE) */}
        <div
          role="button"
          tabIndex={0}
          onMouseEnter={() => audioManager.playHoverTick()}
          onClick={onOpenMissionModal}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onOpenMissionModal();
            }
          }}
          className="pointer-events-auto tactical-dossier-card p-2.5 cursor-pointer"
        >
          <div className="flex items-center justify-between gap-2 mb-1">
            <span className="font-display font-extrabold text-xs uppercase tracking-wider text-[#0A0B08] flex items-center gap-1.5">
              <Crosshair className="w-4 h-4 text-[#C46A3A] shrink-0" />
              <span>¡Refuerza el Sector!</span>
            </span>
            <span className="px-1.5 py-0.5 rounded-[4px_1px_4px_1px] bg-[#0A0B08] text-amber-300 font-mono font-extrabold text-[10px] tabular-nums">
              +500G
            </span>
          </div>

          <p className="text-[11px] font-sans font-bold text-[#2B2C24] mb-1.5 leading-tight">
            Baterías costeras listas: 1/2 escaramuzas
          </p>

          <TacticalGhostBar
            value={1}
            max={2}
            heightClassName="h-3"
            fillClassName="bg-[#C46A3A]"
            ghostClassName="bg-amber-300"
            label="PROGRESO 50%"
          />
        </div>

        {/* 3. TARJETA COMPACTA DEFCON-1 + RACHA DE VICTORIAS */}
        <div className="pointer-events-auto tactical-comic-card p-2 bg-[#2B2C24] flex flex-col gap-1.5">
          <button
            type="button"
            onMouseEnter={() => audioManager.playHoverTick()}
            onClick={onOpenBattleHQ}
            className="w-full p-1.5 rounded-[8px_2px_8px_2px] bg-[#161712] hover:bg-[#1F201A] border border-[#C46A3A] flex items-center gap-2 text-left cursor-pointer transition-colors"
          >
            <div className="w-7 h-7 rounded-[6px_2px_6px_2px] bg-[#C46A3A] border border-[#0A0B08] flex items-center justify-center animate-pulse shrink-0">
              <AlertTriangle className="w-4 h-4 text-[#F2E8D5]" />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="font-display font-extrabold text-[11px] text-[#F2E8D5] uppercase tracking-wider truncate">
                DEFCON-1 // INCURSIÓN
              </span>
              <span className="text-[10px] text-[#C46A3A] font-bold truncate">
                Hostiles en arrecife • Desplegar
              </span>
            </div>
          </button>

          {/* Barra de Racha y Botín + Comunicaciones Rápidas */}
          <div className="flex items-center justify-between gap-1 pt-0.5">
            <div className="flex items-center gap-1 text-[11px] font-mono font-extrabold text-amber-400 tabular-nums">
              <Flame className="w-3.5 h-3.5 text-[#C46A3A]" />
              <span>Racha {streak}</span>
              <span className="px-1 py-0.2 bg-[#161712] border border-[#7B8A4A]/60 text-[#F2E8D5] rounded text-[10px]">
                {streakMultiplier}x
              </span>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onMouseEnter={() => audioManager.playHoverTick()}
                onClick={onClaimSupplyGift}
                title={`Reclamar Suministros de Alianza ${resolvedClanTag}`}
                className="px-2 py-1 rounded-[6px_2px_6px_2px] bg-[#46521F] hover:bg-[#586827] border border-[#0A0B08] text-[10px] font-mono font-bold text-[#F2E8D5] flex items-center gap-1 cursor-pointer"
              >
                <Gift className="w-3 h-3 text-amber-300" />
                <span>+50t</span>
              </button>
              <button
                type="button"
                onMouseEnter={() => audioManager.playHoverTick()}
                onClick={onOpenEncryptedMail}
                title="Abrir Transmisiones Encriptadas"
                className="p-1 rounded-[6px_2px_6px_2px] bg-[#161712] hover:border-amber-400 border border-[#7B8A4A] text-[#F2E8D5] cursor-pointer"
              >
                <Mail className="w-3.5 h-3.5 text-sky-400" />
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* ====================================================================
          ZONA 3B: COLUMNA DERECHA COMPACTA (ROTOR DE SUMINISTROS & OBJETIVOS)
          Sin Radar Polar duplicado (el Radar Polar vive en el Diorama)
         ==================================================================== */}
      <aside className="absolute right-3 top-3 z-20 flex flex-col items-end gap-2.5 pointer-events-none w-52 max-w-[42vw]">
        <div className="pointer-events-auto tactical-comic-card p-2.5 flex flex-col gap-2 w-full bg-[#2B2C24]">
          {/* Botón Principal de Ceremonia de Suministros (Rotor) */}
          <button
            type="button"
            onMouseEnter={() => audioManager.playHoverTick()}
            onClick={() => {
              audioManager.playSFX('button_click');
              onOpenRuleta();
            }}
            className="tactical-btn-heavy w-full px-3 py-2 flex items-center justify-between text-xs"
            title="Abrir Rotor Mecánico de Reabastecimiento Diario [R]"
          >
            <span className="flex items-center gap-1.5 font-display font-extrabold">
              <span>🎡</span>
              <span>ROTOR SUMINISTRO</span>
            </span>
            <span className="bg-[#0A0B08] text-amber-300 px-1.5 py-0.5 rounded-[4px_1px_4px_1px] text-[10px] font-mono font-extrabold">
              [R]
            </span>
          </button>

          {/* Accesos Compactos a Órdenes Diarias, Logros y Torneo */}
          <div className="grid grid-cols-1 gap-1.5">
            <button
              type="button"
              onMouseEnter={() => audioManager.playHoverTick()}
              onClick={onOpenDailyOrders}
              className="tactical-juice-btn flex items-center justify-between px-2.5 py-1.5 bg-[#161712] hover:bg-[#1F201A] border border-[#7B8A4A] text-xs font-mono font-bold text-[#F2E8D5]"
            >
              <span className="flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-amber-400" />
                <span>Órdenes Diarias</span>
              </span>
              <span className="px-1.5 py-0.2 rounded bg-[#46521F] text-[#F2E8D5] text-[10px] tabular-nums">
                1/3
              </span>
            </button>

            <div className="grid grid-cols-2 gap-1.5">
              <button
                type="button"
                onMouseEnter={() => audioManager.playHoverTick()}
                onClick={onOpenAchievements}
                className="tactical-juice-btn flex items-center justify-between px-2 py-1.5 bg-[#161712] hover:bg-[#1F201A] border border-[#7B8A4A] text-[11px] font-mono font-bold text-[#F2E8D5]"
              >
                <span className="flex items-center gap-1">
                  <Award className="w-3.5 h-3.5 text-amber-400" />
                  <span>Logros</span>
                </span>
                <span className="text-[10px] text-amber-300">★</span>
              </button>

              <button
                type="button"
                onMouseEnter={() => audioManager.playHoverTick()}
                onClick={() => onNavigate('clans')}
                className="tactical-juice-btn flex items-center justify-between px-2 py-1.5 bg-[#161712] hover:bg-[#1F201A] border border-[#7B8A4A] text-[11px] font-mono font-bold text-[#F2E8D5]"
              >
                <span className="flex items-center gap-1">
                  <Shield className="w-3.5 h-3.5 text-sky-400" />
                  <span>Liga</span>
                </span>
                <span className="text-[10px] text-amber-400 font-extrabold">#4</span>
              </button>
            </div>
          </div>

          {/* Pase de Mando / Suministro Temporal */}
          <button
            type="button"
            onMouseEnter={() => audioManager.playHoverTick()}
            onClick={() => onNavigate('shop')}
            className="w-full px-2.5 py-1.5 rounded-[8px_2px_8px_2px] bg-[#161712] hover:border-amber-400 border border-[#7B8A4A]/60 flex items-center justify-between text-[10px] font-mono cursor-pointer transition-colors"
          >
            <span className="font-bold text-[#C46A3A] uppercase">📦 PASE MANDO -50%</span>
            <span className="text-[#F2E8D5] font-extrabold tabular-nums bg-[#2B2C24] px-1.5 py-0.5 rounded border border-[#0A0B08]">
              {offerTimerFormatted}
            </span>
          </button>
        </div>
      </aside>
    </>
  );
};

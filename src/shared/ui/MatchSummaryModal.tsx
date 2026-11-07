import React, { useEffect, useState } from 'react';
import { Award, Coins, Shield, Trophy, ArrowRight, RotateCcw, Home, Sparkles, Check, Zap } from 'lucide-react';
import { audioManager } from '@domains/game-feel';
import { TacticalGhostBar } from './TacticalGhostBar';

export interface MatchSummaryData {
  isVictory: boolean;
  matchId: string;
  turnsPlayed: number;
  citiesCaptured: number;
  unitsDestroyed: number;
  xpGained: number;
  goldGained: number;
  eloDelta: number;
  currentLevel: number;
  currentXp: number;
  nextLevelXp: number;
  leveledUp: boolean;
  newLevel?: number;
}

interface MatchSummaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRematch?: () => void;
  onInstantRequeue?: () => void;
  isMirrorDuel?: boolean;
  data: MatchSummaryData;
}

export const MatchSummaryModal: React.FC<MatchSummaryModalProps> = ({
  isOpen,
  onClose,
  onRematch,
  onInstantRequeue,
  isMirrorDuel = false,
  data,
}) => {
  // Estados para animación de números y barra de progreso
  const [animatedXpPercent, setAnimatedXpPercent] = useState(0);
  const [displayedXp, setDisplayedXp] = useState(0);
  const [displayedGold, setDisplayedGold] = useState(0);
  const [showLevelUpAlert, setShowLevelUpAlert] = useState(false);
  const [requeueCountdown, setRequeueCountdown] = useState(5);

  useEffect(() => {
    if (!isOpen) {
      setAnimatedXpPercent(0);
      setDisplayedXp(0);
      setDisplayedGold(0);
      setShowLevelUpAlert(false);
      setRequeueCountdown(5);
      return;
    }

    // Cuenta regresiva para reemparejamiento instantáneo en Duelo Espejo
    let countdownTimer: NodeJS.Timeout | null = null;
    if (isMirrorDuel && onInstantRequeue) {
      setRequeueCountdown(5);
      countdownTimer = setInterval(() => {
        setRequeueCountdown(prev => {
          if (prev <= 1) {
            if (countdownTimer) clearInterval(countdownTimer);
            onInstantRequeue();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    // 1. Animación incremental de los números de XP y Oro con odómetro acústico
    const duration = 1200; // ms
    const steps = 24;
    const intervalTime = duration / steps;
    let step = 0;

    const timer = setInterval(() => {
      step++;
      const progress = step / steps;
      setDisplayedXp(Math.floor(data.xpGained * progress));
      setDisplayedGold(Math.floor(data.goldGained * progress));

      // Satisfacción táctil auditiva por tick (estilo Balatro / Persona 5)
      audioManager.playGoldTick(Math.min(step, 14));

      if (step >= steps) {
        clearInterval(timer);
        setDisplayedXp(data.xpGained);
        setDisplayedGold(data.goldGained);

        // 2. Animar la barra de XP hacia el nuevo porcentaje
        const targetPercent = Math.min(
          100,
          Math.round(((data.currentXp + data.xpGained) / data.nextLevelXp) * 100)
        );
        setAnimatedXpPercent(targetPercent);

        // 3. Si hubo subida de nivel, activar el banner festivo
        if (data.leveledUp) {
          audioManager.playSFX('super_co_power');
          setTimeout(() => setShowLevelUpAlert(true), 300);
        }
      }
    }, intervalTime);

    return () => {
      clearInterval(timer);
      if (countdownTimer) clearInterval(countdownTimer);
    };
  }, [isOpen, data, isMirrorDuel, onInstantRequeue]);

  // Atajos de teclado para flujo de speedrunner (Space = Requeue/Continuar, ESC = Continuar)
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        audioManager.playSFX('button_click');
        onClose();
      } else if (e.key === ' ' || e.code === 'Space') {
        e.preventDefault();
        if (isMirrorDuel && onInstantRequeue) {
          audioManager.playSFX('button_click');
          onInstantRequeue();
        } else {
          audioManager.playSFX('button_click');
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isMirrorDuel, onClose, onInstantRequeue]);

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          audioManager.playSFX('button_click');
          onClose();
        }
      }}
    >
      <div className="relative w-full max-w-lg bg-[#2B2C24] border-4 border-[#0A0B08] rounded-[24px_6px_24px_6px] shadow-[12px_12px_0px_#0A0B08] overflow-hidden font-mono text-[#F2E8D5] flex flex-col select-none">
        {/* Banner Superior de Estado de Partida */}
        <div
          className={`p-5 text-center border-b-4 border-[#0A0B08] flex flex-col items-center justify-center relative overflow-hidden ${
            data.isVictory
              ? 'bg-[#46521F] text-[#F2E8D5]'
              : 'bg-[#7F1D1D] text-[#F2E8D5]'
          }`}
        >
          <div
            className={`w-14 h-14 rounded-[14px_4px_14px_4px] flex items-center justify-center border-2 border-[#0A0B08] shadow-[4px_4px_0px_#0A0B08] mb-2 z-10 ${
              data.isVictory
                ? 'bg-amber-400 text-slate-950'
                : 'bg-[#991B1B] text-[#F2E8D5]'
            }`}
          >
            {data.isVictory ? <Trophy className="w-8 h-8" /> : <Shield className="w-8 h-8" />}
          </div>

          <h2 className="text-2xl font-black tracking-wider uppercase z-10">
            {data.isVictory ? '¡VICTORIA TÁCTICA!' : 'DERROTA EN COMBATE'}
          </h2>
          <p className="text-xs text-[#F2E8D5]/80 mt-0.5 z-10 font-bold">
            {data.isVictory
              ? 'El Cuartel General ha sido asegurado con éxito.'
              : 'Nuestras fuerzas han debido replegarse al perímetro.'}
          </p>

          {/* Notificación de Subida de Nivel */}
          {showLevelUpAlert && (
            <div className="mt-3 px-3.5 py-1 rounded-[10px_2px_10px_2px] bg-amber-400 text-slate-950 border-2 border-[#0A0B08] shadow-[3px_3px_0px_#0A0B08] text-xs font-black flex items-center gap-1.5 animate-bounce z-10">
              <Sparkles className="w-4 h-4 text-slate-950" />
              ¡SUBIDA DE NIVEL! ASCENDIDO A NIVEL {data.newLevel || data.currentLevel + 1}
            </div>
          )}
        </div>

        {/* Cuerpo del Resumen de Puntos y Recompensas */}
        <div className="p-5 space-y-4">
          {/* Tarjetas de Recompensa Principal: XP y Oro */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-[#181914] p-3.5 rounded-[12px_3px_12px_3px] border-2 border-[#7B8A4A]/50 shadow-[4px_4px_0px_#0A0B08] flex flex-col items-center justify-center text-center">
              <span className="text-[11px] text-[#7B8A4A] flex items-center gap-1 mb-1 font-bold">
                <Award className="w-3.5 h-3.5 text-emerald-400" /> EXPERIENCIA
              </span>
              <span className="text-xl sm:text-2xl font-black text-emerald-400 tabular-nums">
                +{displayedXp.toLocaleString()} XP
              </span>
              <span className="text-[10px] text-[#7B8A4A] font-mono">
                {data.isVictory ? 'Multiplicador x2.2' : 'Multiplicador x0.85'}
              </span>
            </div>

            <div className="bg-[#181914] p-3.5 rounded-[12px_3px_12px_3px] border-2 border-[#7B8A4A]/50 shadow-[4px_4px_0px_#0A0B08] flex flex-col items-center justify-center text-center">
              <span className="text-[11px] text-[#7B8A4A] flex items-center gap-1 mb-1 font-bold">
                <Coins className="w-3.5 h-3.5 text-amber-400" /> ORO DE BATALLA
              </span>
              <span className="text-xl sm:text-2xl font-black text-amber-400 tabular-nums">
                +{displayedGold.toLocaleString()}G
              </span>
              <span className="text-[10px] text-[#7B8A4A] font-mono">
                Créditos Tácticos
              </span>
            </div>
          </div>

          {/* Barra de Progreso de Nivel (TacticalGhostBar con Ghost Trail) */}
          <div className="bg-[#181914] p-3.5 rounded-[12px_3px_12px_3px] border-2 border-[#7B8A4A]/50 shadow-[4px_4px_0px_#0A0B08] space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-[#F2E8D5] font-black flex items-center gap-1.5 uppercase">
                <Shield className="w-3.5 h-3.5 text-amber-400" />
                NIVEL DE CUENTA {data.currentLevel}
              </span>
              <span className="text-[#7B8A4A] text-[11px] font-bold tabular-nums">
                {data.currentXp + displayedXp} / {data.nextLevelXp} XP
              </span>
            </div>

            {/* Ghost Bar Canónica */}
            <TacticalGhostBar
              value={data.currentXp + displayedXp}
              max={data.nextLevelXp}
              heightClassName="h-3.5"
              fillClassName={data.isVictory ? 'bg-gradient-to-r from-emerald-500 to-emerald-300' : 'bg-gradient-to-r from-[#C46A3A] to-amber-400'}
            />

            <div className="text-[10px] text-[#7B8A4A] text-right font-mono tabular-nums">
              {animatedXpPercent}% hacia el siguiente rango militar
            </div>
          </div>

          {/* Desglose Táctico de Acciones */}
          <div className="bg-[#181914]/90 p-3 rounded-[12px_3px_12px_3px] border border-[#7B8A4A]/40 space-y-1.5 text-xs text-[#F2E8D5]/80 font-mono">
            <div className="text-[10px] uppercase font-black text-[#7B8A4A] pb-1 border-b border-[#7B8A4A]/30 flex justify-between">
              <span>Desglose de Rendimiento</span>
              <span>Puntuación</span>
            </div>
            <div className="flex justify-between">
              <span>Puntaje Base de Despliegue</span>
              <span className="text-[#F2E8D5] font-bold tabular-nums">120 XP</span>
            </div>
            <div className="flex justify-between">
              <span>Ciudades Capturadas ({data.citiesCaptured} x 45 XP)</span>
              <span className="text-[#F2E8D5] font-bold tabular-nums">+{data.citiesCaptured * 45} XP</span>
            </div>
            <div className="flex justify-between">
              <span>Unidades Hostiles Neutralizadas ({data.unitsDestroyed} x 35 XP)</span>
              <span className="text-[#F2E8D5] font-bold tabular-nums">+{data.unitsDestroyed * 35} XP</span>
            </div>
            <div className="flex justify-between">
              <span>Turnos de Resistencia ({Math.min(data.turnsPlayed, 30)} x 6 XP)</span>
              <span className="text-[#F2E8D5] font-bold tabular-nums">+{Math.min(data.turnsPlayed, 30) * 6} XP</span>
            </div>
            <div className="flex justify-between pt-1 border-t border-[#7B8A4A]/30 font-black">
              <span>Ajuste de Rango ELO</span>
              <span className={data.eloDelta >= 0 ? 'text-emerald-400 font-black tabular-nums' : 'text-red-400 font-black tabular-nums'}>
                {data.eloDelta >= 0 ? `+${data.eloDelta}` : data.eloDelta} pts
              </span>
            </div>
          </div>
        </div>

        {/* Botones de Acción */}
        <div className="p-4 bg-[#181914] border-t-2 border-[#0A0B08] flex flex-wrap items-center justify-end gap-2.5">
          {isMirrorDuel && onInstantRequeue && (
            <button
              onClick={() => {
                audioManager.playSFX('button_click');
                onInstantRequeue();
              }}
              onMouseEnter={() => audioManager.playHoverTick()}
              className="px-4 py-2 bg-[#C46A3A] hover:bg-[#b05c2e] text-[#F2E8D5] font-black text-xs uppercase tracking-wider rounded-[14px_4px_14px_4px] border-2 border-[#0A0B08] shadow-[4px_4px_0px_#0A0B08] active:translate-x-[2px] active:translate-y-[2px] active:shadow-[2px_2px_0px_#0A0B08] flex items-center gap-1.5 transition-all animate-pulse cursor-pointer"
              title="Reemparejamiento exprés canónico para Duelo Espejo (5 segundos) [SPACE]"
            >
              <Zap className="w-4 h-4 text-amber-300" />
              <span>Revancha Exprés ({requeueCountdown}s) [SPACE]</span>
            </button>
          )}

          {onRematch && (
            <button
              onClick={() => {
                audioManager.playSFX('button_click');
                onRematch();
              }}
              onMouseEnter={() => audioManager.playHoverTick()}
              className="px-3.5 py-2 bg-[#2B2C24] hover:bg-[#383a2e] text-[#F2E8D5] text-xs font-black rounded-[8px_2px_8px_2px] border-2 border-[#0A0B08] shadow-[3px_3px_0px_#0A0B08] flex items-center gap-1.5 transition-all cursor-pointer active:translate-x-0.5 active:translate-y-0.5"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Revancha
            </button>
          )}

          <button
            onClick={() => {
              audioManager.playSFX('button_click');
              onClose();
            }}
            onMouseEnter={() => audioManager.playHoverTick()}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-black text-xs rounded-[8px_2px_8px_2px] border-2 border-[#0A0B08] shadow-[4px_4px_0px_#0A0B08] flex items-center gap-1.5 transition-all cursor-pointer active:translate-x-0.5 active:translate-y-0.5"
          >
            Continuar al Cuartel General <ArrowRight className="w-3.5 h-3.5" />
            <span className="text-[10px] text-emerald-950/80 font-mono hidden sm:inline">[ESC/SPACE]</span>
          </button>
        </div>
      </div>
    </div>
  );
};

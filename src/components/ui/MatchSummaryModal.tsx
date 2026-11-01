import React, { useEffect, useState } from 'react';
import { Award, Coins, Shield, Trophy, ArrowRight, RotateCcw, Home, Sparkles, Check, Zap } from 'lucide-react';

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

    // 1. Animación incremental de los números de XP y Oro
    const duration = 1200; // ms
    const steps = 30;
    const intervalTime = duration / steps;
    let step = 0;

    const timer = setInterval(() => {
      step++;
      const progress = step / steps;
      setDisplayedXp(Math.floor(data.xpGained * progress));
      setDisplayedGold(Math.floor(data.goldGained * progress));

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
          setTimeout(() => setShowLevelUpAlert(true), 400);
        }
      }
    }, intervalTime);

    return () => {
      clearInterval(timer);
      if (countdownTimer) clearInterval(countdownTimer);
    };
  }, [isOpen, data, isMirrorDuel, onInstantRequeue]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-700/80 rounded-xl shadow-2xl overflow-hidden font-mono text-slate-100 flex flex-col">
        {/* Banner Superior de Estado de Partida */}
        <div
          className={`p-6 text-center border-b flex flex-col items-center justify-center relative overflow-hidden ${
            data.isVictory
              ? 'bg-gradient-to-b from-emerald-950/80 to-slate-900 border-emerald-500/40'
              : 'bg-gradient-to-b from-red-950/80 to-slate-900 border-red-500/40'
          }`}
        >
          {/* Brillo de Fondo */}
          <div
            className={`absolute -top-12 w-48 h-48 rounded-full blur-3xl opacity-40 pointer-events-none ${
              data.isVictory ? 'bg-emerald-500' : 'bg-red-500'
            }`}
          />

          <div
            className={`w-14 h-14 rounded-full flex items-center justify-center border shadow-lg mb-2 z-10 ${
              data.isVictory
                ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300 shadow-[0_0_20px_rgba(16,185,129,0.3)]'
                : 'bg-red-500/20 border-red-400 text-red-300 shadow-[0_0_20px_rgba(239,68,68,0.3)]'
            }`}
          >
            {data.isVictory ? <Trophy className="w-7 h-7" /> : <Shield className="w-7 h-7" />}
          </div>

          <h2 className="text-2xl font-bold tracking-wider uppercase z-10">
            {data.isVictory ? '¡VICTORIA TÁCTICA!' : 'DERROTA EN COMBATE'}
          </h2>
          <p className="text-xs text-slate-400 mt-0.5 z-10">
            {data.isVictory
              ? 'El Cuartel General ha sido asegurado con éxito.'
              : 'Nuestras fuerzas han debido replegarse.'}
          </p>

          {/* Notificación de Subida de Nivel */}
          {showLevelUpAlert && (
            <div className="mt-3 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-400/60 text-amber-300 text-xs font-bold flex items-center gap-1.5 animate-bounce z-10">
              <Sparkles className="w-3.5 h-3.5" />
              ¡SUBIDA DE NIVEL! ASCENDIDO A NIVEL {data.newLevel || data.currentLevel + 1}
            </div>
          )}
        </div>

        {/* Cuerpo del Resumen de Puntos y Recompensas */}
        <div className="p-5 space-y-4">
          {/* Tarjetas de Recompensa Principal: XP y Oro */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-slate-950 p-3.5 rounded-lg border border-slate-800 flex flex-col items-center justify-center text-center">
              <span className="text-[11px] text-slate-400 flex items-center gap-1 mb-1">
                <Award className="w-3.5 h-3.5 text-emerald-400" /> EXPERIENCIA
              </span>
              <span className="text-xl sm:text-2xl font-bold text-emerald-400">
                +{displayedXp.toLocaleString()} XP
              </span>
              <span className="text-[10px] text-slate-500 font-mono">
                {data.isVictory ? 'Multiplicador x2.2' : 'Multiplicador x0.85'}
              </span>
            </div>

            <div className="bg-slate-950 p-3.5 rounded-lg border border-slate-800 flex flex-col items-center justify-center text-center">
              <span className="text-[11px] text-slate-400 flex items-center gap-1 mb-1">
                <Coins className="w-3.5 h-3.5 text-amber-400" /> ORO DE BATALLA
              </span>
              <span className="text-xl sm:text-2xl font-bold text-amber-400">
                +{displayedGold.toLocaleString()}G
              </span>
              <span className="text-[10px] text-slate-500 font-mono">
                Créditos Tácticos
              </span>
            </div>
          </div>

          {/* Barra de Progreso de Nivel (Curva Exponencial) */}
          <div className="bg-slate-950 p-3.5 rounded-lg border border-slate-800 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-300 font-bold flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-blue-400" />
                NIVEL DE CUENTA {data.currentLevel}
              </span>
              <span className="text-slate-400 text-[11px]">
                {data.currentXp + displayedXp} / {data.nextLevelXp} XP
              </span>
            </div>

            {/* Track de la barra */}
            <div className="w-full h-3 bg-slate-900 rounded-full overflow-hidden border border-slate-800 relative">
              <div
                className="h-full bg-gradient-to-r from-emerald-600 to-emerald-400 rounded-full transition-all duration-1000 ease-out shadow-[0_0_10px_rgba(16,185,129,0.5)]"
                style={{ width: `${animatedXpPercent}%` }}
              />
            </div>
            <div className="text-[10px] text-slate-500 text-right">
              {animatedXpPercent}% hacia el siguiente rango militar
            </div>
          </div>

          {/* Desglose Táctico de Acciones */}
          <div className="bg-slate-950/60 p-3 rounded-lg border border-slate-800/80 space-y-1.5 text-xs text-slate-400">
            <div className="text-[10px] uppercase font-bold text-slate-500 pb-1 border-b border-slate-800 flex justify-between">
              <span>Desglose de Rendimiento</span>
              <span>Puntuación</span>
            </div>
            <div className="flex justify-between">
              <span>Puntaje Base de Despliegue</span>
              <span className="text-slate-300">120 XP</span>
            </div>
            <div className="flex justify-between">
              <span>Ciudades Capturadas ({data.citiesCaptured} x 45 XP)</span>
              <span className="text-slate-300">+{data.citiesCaptured * 45} XP</span>
            </div>
            <div className="flex justify-between">
              <span>Unidades Hostiles Neutralizadas ({data.unitsDestroyed} x 35 XP)</span>
              <span className="text-slate-300">+{data.unitsDestroyed * 35} XP</span>
            </div>
            <div className="flex justify-between">
              <span>Turnos de Resistencia ({Math.min(data.turnsPlayed, 30)} x 6 XP)</span>
              <span className="text-slate-300">+{Math.min(data.turnsPlayed, 30) * 6} XP</span>
            </div>
            <div className="flex justify-between pt-1 border-t border-slate-800/60 font-bold">
              <span>Ajuste de Rango ELO</span>
              <span className={data.eloDelta >= 0 ? 'text-emerald-400' : 'text-red-400'}>
                {data.eloDelta >= 0 ? `+${data.eloDelta}` : data.eloDelta} pts
              </span>
            </div>
          </div>
        </div>

        {/* Botones de Acción */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex flex-wrap items-center justify-end gap-2.5">
          {isMirrorDuel && onInstantRequeue && (
            <button
              onClick={onInstantRequeue}
              className="px-4 py-2 bg-[#C46A3A] hover:bg-[#b05c2e] text-[#F2E8D5] font-black text-xs uppercase tracking-wider rounded-[14px_4px_14px_4px] border-2 border-[#2B2C24] shadow-[4px_4px_0px_#2B2C24] active:translate-x-[2px] active:translate-y-[2px] active:shadow-[2px_2px_0px_#2B2C24] flex items-center gap-1.5 transition-all animate-pulse cursor-pointer"
              title="Reemparejamiento exprés canónico para Duelo Espejo (5 segundos)"
            >
              <Zap className="w-4 h-4 text-amber-300" />
              <span>Revancha Exprés ({requeueCountdown}s)</span>
            </button>
          )}

          {onRematch && (
            <button
              onClick={onRematch}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded border border-slate-700 flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Revancha
            </button>
          )}

          <button
            onClick={onClose}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold text-xs rounded shadow-[0_0_15px_rgba(16,185,129,0.3)] flex items-center gap-1.5 transition-all cursor-pointer"
          >
            Continuar al Cuartel General <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};

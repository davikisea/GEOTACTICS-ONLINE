import React from 'react';
import {
  COEngine,
  CANONICAL_CO_REGISTRY,
  COId,
  COPowerType,
  PlayerCOState,
  STAR_CHARGE_VALUE,
} from '../../engine/coSystem';
import { audioManager } from '../../engine/audioManager';
import { triggerHaptic } from '../../engine/hapticFeedback';
import { Zap, Flame, ShieldAlert, Sparkles, ChevronDown } from 'lucide-react';

interface COCommandBarProps {
  player: 'p1' | 'p2';
  isCurrentTurn: boolean;
  coState: PlayerCOState;
  onSelectCO: (coId: COId) => void;
  onActivatePower: (powerType: COPowerType) => void;
  compact?: boolean;
}

export const COCommandBar: React.FC<COCommandBarProps> = ({
  player,
  isCurrentTurn,
  coState,
  onSelectCO,
  onActivatePower,
  compact = false,
}) => {
  const co = COEngine.getCO(coState.coId);
  const copThreshold = COEngine.getPowerChargeThreshold(coState.coId, 'cop');
  const scopThreshold = COEngine.getPowerChargeThreshold(coState.coId, 'scop');

  const totalStars = co.powers.scop.stars;
  const copStars = co.powers.cop.stars;

  const currentMeter = coState.powerMeter;
  const maxMeter = scopThreshold;
  const meterPercent = Math.min(100, Math.floor((currentMeter / maxMeter) * 100));

  const canCop = isCurrentTurn && COEngine.canActivatePower(coState, 'cop');
  const canScop = isCurrentTurn && COEngine.canActivatePower(coState, 'scop');

  const isPowerActive = coState.activePower !== null;
  const activePowerDef = coState.activePower ? co.powers[coState.activePower] : null;

  if (compact) {
    const currentStars = Math.floor(currentMeter / STAR_CHARGE_VALUE);
    return (
      <div className="flex items-center gap-2 bg-[#181914] px-2 py-0.5 rounded-[6px_2px_6px_2px] border border-[#7B8A4A]/50 shadow-[2px_2px_0px_#181914] select-none font-mono">
        {/* Avatar Miniatura del Comandante */}
        <div className="relative w-7 h-7 rounded-[4px_1px_4px_1px] overflow-hidden border border-[#7B8A4A] bg-[#2B2C24] shrink-0" title={`${co.name}: ${co.title}`}>
          <img
            src={co.portraitSmall}
            alt={co.name}
            className="w-full h-full object-cover pixelated"
            onError={(e) => {
              (e.target as HTMLElement).style.display = 'none';
            }}
          />
          {isPowerActive && (
            <span className="absolute top-0 right-0 w-2 h-2 rounded-full bg-amber-400 animate-ping" />
          )}
        </div>

        {/* Estrellas de Carga en Línea */}
        <div className="hidden sm:flex items-center gap-0.5">
          {Array.from({ length: totalStars }).map((_, idx) => {
            const filled = currentMeter >= (idx + 1) * STAR_CHARGE_VALUE;
            const isCopStar = idx < copStars;
            return (
              <span
                key={idx}
                className={`text-[11px] leading-none ${
                  filled
                    ? isCopStar
                      ? 'text-amber-400'
                      : 'text-[#C46A3A]'
                    : 'text-slate-700'
                }`}
                title={`Estrella ${idx + 1}/${totalStars}`}
              >
                ★
              </span>
            );
          })}
        </div>

        {/* Botón 1-Clic COP */}
        <button
          disabled={!canCop}
          onClick={() => {
            triggerHaptic('co_power');
            audioManager.playSFX('co_power');
            onActivatePower('cop');
          }}
          className={`px-2 py-0.5 rounded-[4px_1px_4px_1px] text-[10px] font-black uppercase transition-all flex items-center gap-1 ${
            canCop
              ? 'bg-amber-400 hover:bg-amber-300 text-slate-950 shadow-[0_0_8px_rgba(251,191,36,0.6)] animate-pulse cursor-pointer'
              : 'bg-[#2B2C24] text-slate-600 border border-slate-800 cursor-not-allowed opacity-50'
          }`}
          title={`Activar Poder Menor: ${co.powers.cop.name} (${copStars}★) - Atajo: [P]`}
        >
          <Zap className="w-2.5 h-2.5" />
          <span>COP</span>
          <span className="text-[8px] opacity-75 font-mono">(P)</span>
        </button>

        {/* Botón 1-Clic SCOP */}
        <button
          disabled={!canScop}
          onClick={() => {
            triggerHaptic('co_power');
            audioManager.playSFX('super_co_power');
            onActivatePower('scop');
          }}
          className={`px-2 py-0.5 rounded-[4px_1px_4px_1px] text-[10px] font-black uppercase transition-all flex items-center gap-1 ${
            canScop
              ? 'bg-[#C46A3A] hover:bg-[#d67b4b] text-[#F2E8D5] shadow-[0_0_10px_rgba(196,106,58,0.8)] animate-bounce cursor-pointer'
              : 'bg-[#2B2C24] text-slate-600 border border-slate-800 cursor-not-allowed opacity-50'
          }`}
          title={`Activar Superpoder: ${co.powers.scop.name} (${totalStars}★) - Atajo: [O]`}
        >
          <Flame className="w-2.5 h-2.5" />
          <span>SCOP</span>
          <span className="text-[8px] opacity-75 font-mono">(O)</span>
        </button>
      </div>
    );
  }

  return (
    <div
      className={`p-3.5 rounded-xl border transition-all ${
        player === 'p1'
          ? 'bg-slate-950/90 border-blue-900/60 shadow-[0_0_15px_rgba(37,99,235,0.15)]'
          : 'bg-slate-950/90 border-red-900/60 shadow-[0_0_15px_rgba(220,38,38,0.15)]'
      }`}
    >
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        {/* Retrato y Datos del CO */}
        <div className="flex items-center gap-3">
          <div className="relative shrink-0">
            <div
              className={`w-12 h-12 rounded-lg overflow-hidden border-2 flex items-center justify-center bg-slate-900 ${
                player === 'p1' ? 'border-blue-500' : 'border-red-500'
              } ${isPowerActive ? 'ring-2 ring-amber-400 animate-pulse' : ''}`}
            >
              <img
                src={co.portraitSmall}
                alt={co.name}
                className="w-full h-full object-cover pixelated"
                onError={(e) => {
                  // Fallback visual si el asset no está cargado
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
            </div>
            {isPowerActive && (
              <span className="absolute -top-1 -right-1 flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500"></span>
              </span>
            )}
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs uppercase text-slate-400">
                {player === 'p1' ? 'Orange Star' : 'Blue Moon'}
              </span>
              {/* Selector de Comandante */}
              <div className="relative">
                <select
                  value={coState.coId}
                  onChange={(e) => {
                    audioManager.playSFX('button_click');
                    onSelectCO(e.target.value as COId);
                  }}
                  className="bg-slate-900 border border-slate-700 text-white font-bold text-xs rounded px-2 py-0.5 font-mono cursor-pointer hover:border-emerald-500 focus:outline-none"
                >
                  {Object.values(CANONICAL_CO_REGISTRY).map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="text-[11px] font-mono text-slate-400 mt-0.5 line-clamp-1">
              {co.title} • {co.dayToDay.description}
            </div>
          </div>
        </div>

        {/* Botones de Activación de Poder */}
        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <button
            disabled={!canCop}
            onClick={() => {
              triggerHaptic('co_power');
              audioManager.playSFX('co_power');
              onActivatePower('cop');
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              canCop
                ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-[0_0_12px_rgba(245,158,11,0.5)] animate-bounce'
                : 'bg-slate-800/60 text-slate-500 border border-slate-800 cursor-not-allowed'
            }`}
            title={`${co.powers.cop.description} - Atajo: [P]`}
          >
            <Zap className="w-3.5 h-3.5" />
            <span>COP: {co.powers.cop.name} ({copStars}★)</span>
            <span className="text-[9px] px-1 py-0.5 rounded bg-slate-900/40 text-slate-950 font-black">[P]</span>
          </button>

          <button
            disabled={!canScop}
            onClick={() => {
              triggerHaptic('co_power');
              audioManager.playSFX('super_co_power');
              onActivatePower('scop');
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              canScop
                ? 'bg-gradient-to-r from-red-600 via-amber-500 to-yellow-400 text-slate-950 shadow-[0_0_16px_rgba(239,68,68,0.6)] animate-pulse'
                : 'bg-slate-800/60 text-slate-500 border border-slate-800 cursor-not-allowed'
            }`}
            title={`${co.powers.scop.description} - Atajo: [O]`}
          >
            <Flame className="w-3.5 h-3.5 text-slate-950" />
            <span>SCOP: {co.powers.scop.name} ({totalStars}★)</span>
            <span className="text-[9px] px-1 py-0.5 rounded bg-slate-900/40 text-slate-950 font-black">[O]</span>
          </button>
        </div>
      </div>

      {/* Medidor de Estrellas de Poder */}
      <div className="mt-3 pt-2.5 border-t border-slate-800/80">
        <div className="flex items-center justify-between text-[11px] font-mono mb-1.5">
          <div className="flex items-center gap-2">
            <span className="text-slate-400">MEDIDOR DE ENERGÍA TÁCTICA:</span>
            <div className="flex items-center gap-1">
              {Array.from({ length: totalStars }).map((_, idx) => {
                const starFilled = currentMeter >= (idx + 1) * STAR_CHARGE_VALUE;
                const isCopStar = idx < copStars;
                return (
                  <span
                    key={idx}
                    className={`text-xs ${
                      starFilled
                        ? isCopStar
                          ? 'text-amber-400 filter drop-shadow-[0_0_4px_rgba(251,191,36,0.8)]'
                          : 'text-red-400 filter drop-shadow-[0_0_4px_rgba(248,113,113,0.8)]'
                        : 'text-slate-700'
                    }`}
                    title={`Estrella ${idx + 1} (${(idx + 1) * STAR_CHARGE_VALUE}G)`}
                  >
                    ★
                  </span>
                );
              })}
            </div>
          </div>
          <span className="text-slate-400 font-bold">
            {currentMeter.toLocaleString()} / {maxMeter.toLocaleString()} pts ({meterPercent}%)
          </span>
        </div>

        {/* Barra de progreso */}
        <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden border border-slate-800 relative">
          <div
            className={`h-2 transition-all duration-300 ${
              currentMeter >= scopThreshold
                ? 'bg-gradient-to-r from-amber-500 to-red-500'
                : currentMeter >= copThreshold
                ? 'bg-amber-500'
                : player === 'p1'
                ? 'bg-blue-500'
                : 'bg-red-500'
            }`}
            style={{ width: `${meterPercent}%` }}
          />
          {/* Marcador divisor de COP */}
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-white/40"
            style={{ left: `${(copStars / totalStars) * 100}%` }}
            title={`Umbral COP (${copStars} Estrellas)`}
          />
        </div>
      </div>

      {/* Banner de Poder Activo */}
      {isPowerActive && activePowerDef && (
        <div className="mt-2.5 p-2 rounded bg-amber-950/60 border border-amber-500/50 flex items-center justify-between text-xs font-mono text-amber-200 animate-pulse">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
            <span>
              <b>¡{activePowerDef.name.toUpperCase()} ACTIVO!</b> {activePowerDef.description}
            </span>
          </div>
          <span className="text-[10px] uppercase px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-400/40">
            TURNO ACTUAL
          </span>
        </div>
      )}
    </div>
  );
};

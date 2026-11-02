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
import { TacticalGhostBar } from '../lobby/TacticalGhostBar';

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
      className={`p-3.5 tactical-comic-card transition-all ${
        player === 'p1'
          ? 'border-[#1E64D0]'
          : 'border-[#E84A27]'
      }`}
    >
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        {/* Retrato y Datos del CO */}
        <div className="flex items-center gap-3">
          <div className="relative shrink-0">
            <div
              className={`w-12 h-12 rounded-[10px_2px_10px_2px] overflow-hidden border-2 flex items-center justify-center bg-[#181914] shadow-[2px_2px_0px_#0A0B08] ${
                player === 'p1' ? 'border-[#1E64D0]' : 'border-[#E84A27]'
              } ${isPowerActive ? 'ring-2 ring-[#F2B705] animate-pulse' : ''}`}
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
              <span className="font-mono text-xs font-black uppercase text-[#D8D1C5]">
                {player === 'p1' ? 'Blue Moon' : 'Orange Star'}
              </span>
              {/* Selector de Comandante */}
              <div className="relative">
                <select
                  value={coState.coId}
                  onChange={(e) => {
                    audioManager.playSFX('button_click');
                    onSelectCO(e.target.value as COId);
                  }}
                  className="bg-[#181914] border-2 border-[#0A0B08] text-[#F2E8D5] font-bold text-xs rounded-[6px_2px_6px_2px] px-2 py-0.5 font-mono cursor-pointer hover:border-[#F2B705] focus:outline-none shadow-[2px_2px_0px_#0A0B08]"
                >
                  {Object.values(CANONICAL_CO_REGISTRY).map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="text-[11px] font-mono text-[#D8D1C5]/80 mt-0.5 line-clamp-1">
              {co.title} • {co.dayToDay.description}
            </div>
          </div>
        </div>

        {/* Botones de Activación de Poder */}
        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <button
            disabled={!canCop}
            onMouseEnter={() => canCop && audioManager.playHoverTick()}
            onClick={() => {
              triggerHaptic('co_power');
              audioManager.playSFX('co_power');
              onActivatePower('cop');
            }}
            className={`px-3 py-1.5 rounded-[10px_2px_10px_2px] text-xs font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer tactical-juice-btn ${
              canCop
                ? 'bg-[#F2B705] hover:bg-amber-300 text-[#0A0B08] border-2 border-[#0A0B08] shadow-[3px_3px_0px_#0A0B08] animate-bounce'
                : 'bg-[#181914] text-[#D8D1C5]/40 border border-[#0A0B08] cursor-not-allowed'
            }`}
            title={`${co.powers.cop.description} - Atajo: [P]`}
          >
            <Zap className="w-3.5 h-3.5" />
            <span>COP: {co.powers.cop.name} ({copStars}★)</span>
            <span className="text-[9px] px-1 py-0.5 rounded bg-[#0A0B08]/20 text-[#0A0B08] font-black">[P]</span>
          </button>

          <button
            disabled={!canScop}
            onMouseEnter={() => canScop && audioManager.playHoverTick()}
            onClick={() => {
              triggerHaptic('co_power');
              audioManager.playSFX('super_co_power');
              onActivatePower('scop');
            }}
            className={`px-3 py-1.5 rounded-[10px_2px_10px_2px] text-xs font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer tactical-juice-btn ${
              canScop
                ? 'bg-gradient-to-r from-[#E84A27] via-[#F2B705] to-amber-300 text-[#0A0B08] border-2 border-[#0A0B08] shadow-[3px_3px_0px_#0A0B08] animate-pulse'
                : 'bg-[#181914] text-[#D8D1C5]/40 border border-[#0A0B08] cursor-not-allowed'
            }`}
            title={`${co.powers.scop.description} - Atajo: [O]`}
          >
            <Flame className="w-3.5 h-3.5 text-[#0A0B08]" />
            <span>SCOP: {co.powers.scop.name} ({totalStars}★)</span>
            <span className="text-[9px] px-1 py-0.5 rounded bg-[#0A0B08]/20 text-[#0A0B08] font-black">[O]</span>
          </button>
        </div>
      </div>

      {/* Medidor de Estrellas de Poder */}
      <div className="mt-3 pt-2.5 border-t border-[#46521F]/60">
        <div className="flex items-center justify-between text-[11px] font-mono mb-1.5">
          <div className="flex items-center gap-2">
            <span className="text-[#D8D1C5]/80 font-bold">MEDIDOR DE ENERGÍA TÁCTICA:</span>
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
                          ? 'text-[#F2B705] filter drop-shadow-[0_0_4px_rgba(242,183,5,0.8)]'
                          : 'text-[#E84A27] filter drop-shadow-[0_0_4px_rgba(232,74,39,0.8)]'
                        : 'text-[#181914]'
                    }`}
                    title={`Estrella ${idx + 1} (${(idx + 1) * STAR_CHARGE_VALUE}G)`}
                  >
                    ★
                  </span>
                );
              })}
            </div>
          </div>
          <span className="text-[#F2E8D5] font-bold tabular-nums">
            {currentMeter.toLocaleString()} / {maxMeter.toLocaleString()} pts ({meterPercent}%)
          </span>
        </div>

        {/* Barra de progreso con Ghost Trail Canónico */}
        <TacticalGhostBar
          value={currentMeter}
          max={maxMeter}
          heightClass="h-2.5"
          fillClass={
            currentMeter >= scopThreshold
              ? 'bg-gradient-to-r from-[#F2B705] to-[#E84A27]'
              : currentMeter >= copThreshold
              ? 'bg-[#F2B705]'
              : player === 'p1'
              ? 'bg-[#1E64D0]'
              : 'bg-[#E84A27]'
          }
          ghostClass="bg-[#F2E8D5]/60"
          showMarkerAtPercent={(copStars / totalStars) * 100}
          markerTitle={`Umbral COP (${copStars} Estrellas)`}
        />
      </div>

      {/* Banner de Poder Activo */}
      {isPowerActive && activePowerDef && (
        <div className="mt-2.5 p-2 rounded-[8px_2px_8px_2px] bg-[#181914] border-2 border-[#F2B705] shadow-[2px_2px_0px_#0A0B08] flex items-center justify-between text-xs font-mono text-[#F2E8D5] animate-pulse">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#F2B705] shrink-0" />
            <span>
              <b className="text-[#F2B705]">¡{activePowerDef.name.toUpperCase()} ACTIVO!</b> {activePowerDef.description}
            </span>
          </div>
          <span className="text-[10px] uppercase px-2 py-0.5 rounded bg-[#F2B705] text-[#0A0B08] font-black">
            TURNO ACTUAL
          </span>
        </div>
      )}
    </div>
  );
};

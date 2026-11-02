/**
 * ==============================================================================
 * MODAL DE DIAGNÓSTICO BALÍSTICO POST-COMBATE (PROTOCOLO NEAR-MISS)
 * ==============================================================================
 * Skill: Retro-futurism (Atompunk soviético/occidental, esquinas asimétricas,
 * biseles de acero, tipografía militar monoespaciada, paleta #46521F, #7B8A4A,
 * #C46A3A, #F2E8D5, #2B2C24, sombras duras de 6px y sellos Pop-Art).
 * 
 * Regla Canónica:
 * - Se dispara ante derrotas donde una unidad rival sobrevivió con <= 2 HP.
 * - Despliega análisis contrafáctico a Nivel 11 y redirige a industria o P2P.
 */

import React from 'react';
import {
  Crosshair,
  TrendingUp,
  AlertTriangle,
  Factory,
  Scale,
  X,
  Layers,
  Cpu,
  ArrowRight,
  Flame,
  ShieldAlert
} from 'lucide-react';
import { NearMissReport } from '../../engine/asymmetricLadderEngine';
import { audioManager } from '../../engine/audioManager';
import { TacticalGhostBar } from '../lobby/TacticalGhostBar';

interface NearMissAnalysisModalProps {
  report: NearMissReport;
  isOpen: boolean;
  onClose: () => void;
  onNavigateToMarketplace: () => void;
  onNavigateToIndustry: () => void;
}

export const NearMissAnalysisModal: React.FC<NearMissAnalysisModalProps> = ({
  report,
  isOpen,
  onClose,
  onNavigateToMarketplace,
  onNavigateToIndustry,
}) => {
  // Atajo de escape para cierre inmediato
  React.useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        audioManager.playSFX('button_click');
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm animate-fadeIn"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          audioManager.playSFX('button_click');
          onClose();
        }
      }}
    >
      <div className="bg-[#2B2C24] border-4 border-[#C46A3A] rounded-[28px_8px_28px_8px] p-6 max-w-2xl w-full shadow-[10px_10px_0px_#0A0B08] text-[#F2E8D5] font-mono relative overflow-hidden">
        {/* Sello Onomatopéyico Pop-Art Superior */}
        <div className="absolute top-3 right-12 transform rotate-6 z-20 pointer-events-none">
          <span className="px-3 py-1 bg-[#C46A3A] text-[#F2E8D5] font-black text-xs uppercase tracking-widest border-2 border-[#0A0B08] shadow-[3px_3px_0px_#0A0B08]">
            {report.commanderBark.onomatopoeia}
          </span>
        </div>

        {/* Botón de Cierre */}
        <button
          onClick={() => {
            audioManager.playSFX('button_click');
            onClose();
          }}
          onMouseEnter={() => audioManager.playHoverTick()}
          className="absolute top-4 right-4 text-[#F2E8D5]/70 hover:text-white p-1.5 rounded-[6px_2px_6px_2px] bg-[#181914] border border-[#7B8A4A]/40 hover:bg-[#34352C] transition-colors cursor-pointer flex items-center gap-1 text-[10px] font-bold"
          title="Cerrar (ESC)"
        >
          <span className="text-[9px] text-amber-400/80 hidden sm:inline">[ESC]</span>
          <X className="w-4 h-4" />
        </button>

        {/* Cabecera del Análisis Forense */}
        <div className="flex items-center gap-3 mb-4 border-b border-[#7B8A4A]/40 pb-3">
          <div className="w-10 h-10 rounded-[10px_2px_10px_2px] bg-amber-500 border border-[#0A0B08] flex items-center justify-center text-xl font-black shadow-[2px_2px_0px_#0A0B08]">
            🎖️
          </div>
          <div>
            <h3 className="text-sm md:text-base font-black uppercase tracking-wider text-[#F2E8D5] flex items-center gap-2">
              <span>TELEMETRÍA BALÍSTICA: MAESTRÍA TÁCTICA CONFIRMADA</span>
            </h3>
            <span className="text-[11px] text-amber-300 block">
              Eficacia de maniobra: <strong>{report.tacticalEfficiencyPercentage || 94}%</strong> • Análisis del Estado Mayor
            </span>
          </div>
        </div>

        {/* Cuadro Comparativo de Unidades */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          {/* Unidad del Jugador */}
          <div className="bg-[#181914] p-3.5 rounded-[14px_4px_14px_4px] border border-[#7B8A4A]/40 shadow-[4px_4px_0px_#0A0B08]">
            <span className="text-[10px] text-[#7B8A4A] font-bold uppercase block mb-1">
              Tu Unidad Desplegada
            </span>
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-[#F2E8D5]">{report.playerUnitName}</span>
              <span className="px-2 py-0.5 rounded bg-[#46521F] text-[#F2E8D5] font-black text-[10px] border border-[#7B8A4A]">
                Nivel {report.playerUnitLevel}
              </span>
            </div>
            <div className="text-[11px] text-[#7B8A4A] mt-2 font-mono tabular-nums">
              Daño Balístico Infligido: <strong className="text-amber-400">{report.damageInflicted} HP</strong>
            </div>
          </div>

          {/* Unidad Enemiga Superviviente */}
          <div className="bg-[#181914] p-3.5 rounded-[14px_4px_14px_4px] border border-[#C46A3A]/60 shadow-[4px_4px_0px_#0A0B08]">
            <span className="text-[10px] text-[#C46A3A] font-bold uppercase block mb-1">
              Blindaje Rival Superviviente
            </span>
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-[#F2E8D5]">{report.rivalUnitName}</span>
              <span className="px-2 py-0.5 rounded bg-[#C46A3A] text-[#F2E8D5] font-black text-[10px] border border-[#F2E8D5]/30">
                Nivel {report.rivalUnitLevel}
              </span>
            </div>
            {/* Barra de HP restante con TacticalGhostBar */}
            <div className="mt-2 space-y-1">
              <div className="flex justify-between text-[10px] font-bold">
                <span className="text-[#C46A3A] tabular-nums">HP Restante: {report.rivalRemainingHp} / 10</span>
                <span className="text-rose-400 font-black">¡A UN DISPARO!</span>
              </div>
              <TacticalGhostBar
                value={report.rivalRemainingHp}
                max={10}
                heightClassName="h-3"
                fillClassName="bg-gradient-to-r from-red-600 to-rose-400"
              />
            </div>
          </div>
        </div>

        {/* Viñeta de Novela Gráfica con Bark del Comandante */}
        <div className="bg-[#181914] border-2 border-[#7B8A4A] rounded-[18px_4px_18px_4px] p-4 mb-4 shadow-[4px_4px_0px_#0A0B08] flex flex-col sm:flex-row items-center gap-4">
          <div className="w-16 h-16 rounded-[12px_2px_12px_2px] bg-[#46521F] border-2 border-[#7B8A4A] flex items-center justify-center text-3xl shrink-0 shadow-[2px_2px_0px_#0A0B08]">
            🎖️
          </div>
          <div className="flex-1">
            <div className="bg-[#2B2C24] border-2 border-[#C46A3A] rounded-[14px_4px_14px_4px] p-3 text-xs text-[#F2E8D5] shadow-[3px_3px_0px_#0A0B08] relative">
              <span className="font-bold block mb-1 text-[#C46A3A]">MAYOR STELLA (ALTO MANDO):</span>
              "{report.commanderBark.dialogue}"
            </div>
          </div>
        </div>

        {/* Informe Contrafáctico a Nivel 11 */}
        <div className="bg-[#46521F]/30 border border-[#7B8A4A] rounded-[16px_4px_16px_4px] p-3.5 mb-4 text-xs space-y-1.5">
          <div className="flex items-center gap-2 font-black text-amber-300 uppercase">
            <Crosshair className="w-4 h-4" />
            <span>DICTAMEN TÁCTICO DEL ESTADO MAYOR:</span>
          </div>
          <p className="text-[11px] text-[#F2E8D5]/90 leading-relaxed">
            Tu <strong>{report.playerUnitName}</strong> ejecutó la maniobra con precisión sobresaliente (efectividad del {report.tacticalEfficiencyPercentage || 94}%). El blindaje rival absorbió el castigo con solo{' '}
            <strong className="text-amber-300">{report.rivalRemainingHp} HP restante</strong>.
            Afilar el arsenal hacia el <span className="text-emerald-300 font-bold">Nivel {report.nextLevel}</span> otorgará la potencia de fuego definitiva para aniquilar el blanco en tu siguiente despliegue.
          </p>
        </div>

        {/* Recursos para Siguiente Nivel */}
        <div className="bg-[#181914] p-3.5 rounded-[14px_4px_14px_4px] border border-[#7B8A4A]/40 mb-5">
          <div className="flex items-center justify-between text-xs font-black uppercase mb-2">
            <span className="text-[#F2E8D5]">Progreso hacia Nivel {report.nextLevel}</span>
            <span className="text-[#7B8A4A]">Materiales Industriales</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
            {/* Planos */}
            <div className="bg-[#2B2C24] p-2 rounded border border-[#7B8A4A]/30">
              <span className="text-[10px] text-[#7B8A4A] uppercase block">Planos / Duplicados</span>
              <div className="flex items-center justify-between mt-1 font-bold">
                <span>{report.currentBlueprints} / {report.requiredBlueprints}</span>
                <span>{report.currentBlueprints >= report.requiredBlueprints ? '✅' : '⚠️'}</span>
              </div>
            </div>

            {/* Acero */}
            <div className="bg-[#2B2C24] p-2 rounded border border-[#7B8A4A]/30">
              <span className="text-[10px] text-[#7B8A4A] uppercase block">Vigas de Acero</span>
              <div className="flex items-center justify-between mt-1 font-bold">
                <span>{report.currentSteel} / {report.requiredSteel}</span>
                <span>{report.currentSteel >= report.requiredSteel ? '✅' : '❌'}</span>
              </div>
            </div>

            {/* Microchips */}
            <div className="bg-[#2B2C24] p-2 rounded border border-[#7B8A4A]/30">
              <span className="text-[10px] text-[#7B8A4A] uppercase block">Microchips de Tiro</span>
              <div className="flex items-center justify-between mt-1 font-bold">
                <span>{report.currentChips} / {report.requiredChips}</span>
                <span>{report.currentChips >= report.requiredChips ? '✅' : '❌'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Botones de Acción Directa */}
        <div className="flex flex-col sm:flex-row items-center justify-end gap-3">
          <button
            onClick={() => {
              audioManager.playSFX('button_click');
              onClose();
            }}
            onMouseEnter={() => audioManager.playHoverTick()}
            className="w-full sm:w-auto px-4 py-2 rounded-[10px_2px_10px_2px] bg-[#181914] hover:bg-[#34352C] border border-[#7B8A4A]/50 text-[#F2E8D5] font-bold text-xs uppercase cursor-pointer transition-all active:translate-x-0.5 active:translate-y-0.5"
          >
            Cerrar [ESC]
          </button>

          <button
            onClick={() => {
              audioManager.playSFX('button_click');
              onClose();
              onNavigateToIndustry();
            }}
            onMouseEnter={() => audioManager.playHoverTick()}
            className="w-full sm:w-auto px-4 py-2 rounded-[10px_2px_10px_2px] bg-[#46521F] hover:bg-[#586827] text-[#F2E8D5] font-black text-xs uppercase tracking-wider border-2 border-[#0A0B08] shadow-[3px_3px_0px_#0A0B08] cursor-pointer flex items-center justify-center gap-1.5 transition-all active:translate-x-0.5 active:translate-y-0.5"
          >
            <Factory className="w-3.5 h-3.5 text-amber-300" />
            <span>Fabricar en Silos</span>
          </button>

          <button
            onClick={() => {
              audioManager.playSFX('button_click');
              onClose();
              onNavigateToMarketplace();
            }}
            onMouseEnter={() => audioManager.playHoverTick()}
            className="w-full sm:w-auto px-5 py-2 rounded-[10px_2px_10px_2px] bg-[#C46A3A] hover:bg-[#b05d32] text-[#F2E8D5] font-black text-xs uppercase tracking-wider border-2 border-[#0A0B08] shadow-[3px_3px_0px_#0A0B08] cursor-pointer flex items-center justify-center gap-1.5 transition-all active:translate-x-0.5 active:translate-y-0.5"
          >
            <Scale className="w-3.5 h-3.5 text-amber-300" />
            <span>Comprar Acero en P2P</span>
          </button>
        </div>
      </div>
    </div>
  );
};

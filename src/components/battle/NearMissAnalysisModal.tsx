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
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm animate-fadeIn">
      <div className="bg-[#2B2C24] border-4 border-[#C46A3A] rounded-[28px_8px_28px_8px] p-6 max-w-2xl w-full shadow-[10px_10px_0px_#181914] text-[#F2E8D5] font-mono relative overflow-hidden">
        {/* Sello Onomatopéyico Pop-Art Superior */}
        <div className="absolute top-3 right-12 transform rotate-6 z-20 pointer-events-none">
          <span className="px-3 py-1 bg-[#C46A3A] text-[#F2E8D5] font-black text-xs uppercase tracking-widest border-2 border-[#F2E8D5] shadow-[3px_3px_0px_#181914]">
            {report.commanderBark.onomatopoeia}
          </span>
        </div>

        {/* Botón de Cierre */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded hover:bg-slate-800 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Cabecera del Análisis Forense */}
        <div className="flex items-center gap-3 mb-4 border-b border-[#7B8A4A]/40 pb-3">
          <div className="w-10 h-10 rounded-[10px_2px_10px_2px] bg-amber-500 border border-[#F2E8D5] flex items-center justify-center text-xl font-black shadow-[2px_2px_0px_#181914]">
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
          <div className="bg-[#181914] p-3.5 rounded-[14px_4px_14px_4px] border border-[#7B8A4A]/40">
            <span className="text-[10px] text-[#7B8A4A] font-bold uppercase block mb-1">
              Tu Unidad Desplegada
            </span>
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-[#F2E8D5]">{report.playerUnitName}</span>
              <span className="px-2 py-0.5 rounded bg-[#46521F] text-[#F2E8D5] font-black text-[10px]">
                Nivel {report.playerUnitLevel}
              </span>
            </div>
            <div className="text-[11px] text-[#7B8A4A] mt-2">
              Daño Balístico Infligido: <strong className="text-amber-400">{report.damageInflicted} HP</strong>
            </div>
          </div>

          {/* Unidad Enemiga Superviviente */}
          <div className="bg-[#181914] p-3.5 rounded-[14px_4px_14px_4px] border border-[#C46A3A]/60">
            <span className="text-[10px] text-[#C46A3A] font-bold uppercase block mb-1">
              Blindaje Rival Superviviente
            </span>
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-[#F2E8D5]">{report.rivalUnitName}</span>
              <span className="px-2 py-0.5 rounded bg-[#C46A3A] text-[#F2E8D5] font-black text-[10px]">
                Nivel {report.rivalUnitLevel}
              </span>
            </div>
            {/* Barra de HP restante */}
            <div className="mt-2 space-y-1">
              <div className="flex justify-between text-[10px] font-bold">
                <span className="text-[#C46A3A]">HP Restante: {report.rivalRemainingHp} / 10</span>
                <span className="text-rose-400 font-black">¡A UN DISPARO!</span>
              </div>
              <div className="w-full h-2.5 bg-slate-900 rounded-full overflow-hidden border border-rose-500/30">
                <div
                  className="h-full bg-rose-600 rounded-full transition-all duration-500"
                  style={{ width: `${(report.rivalRemainingHp / 10) * 100}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Viñeta de Novela Gráfica con Bark del Comandante */}
        <div className="bg-[#181914] border-2 border-[#7B8A4A] rounded-[18px_4px_18px_4px] p-4 mb-4 shadow-[4px_4px_0px_#181914] flex flex-col sm:flex-row items-center gap-4">
          <div className="w-16 h-16 rounded-[12px_2px_12px_2px] bg-[#46521F] border-2 border-[#7B8A4A] flex items-center justify-center text-3xl shrink-0 shadow-[2px_2px_0px_#181914]">
            🎖️
          </div>
          <div className="flex-1">
            <div className="bg-[#2B2C24] border-2 border-[#C46A3A] rounded-[14px_4px_14px_4px] p-3 text-xs text-[#F2E8D5] shadow-[3px_3px_0px_#181914] relative">
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
            className="w-full sm:w-auto px-4 py-2 rounded-[10px_2px_10px_2px] bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs uppercase cursor-pointer"
          >
            Cerrar Análisis
          </button>

          <button
            onClick={() => {
              audioManager.playSFX('button_click');
              onClose();
              onNavigateToIndustry();
            }}
            className="w-full sm:w-auto px-4 py-2 rounded-[10px_2px_10px_2px] bg-[#46521F] hover:bg-[#7B8A4A] text-[#F2E8D5] font-black text-xs uppercase tracking-wider shadow-[3px_3px_0px_#181914] cursor-pointer flex items-center justify-center gap-1.5"
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
            className="w-full sm:w-auto px-5 py-2 rounded-[10px_2px_10px_2px] bg-[#C46A3A] hover:bg-[#C46A3A]/90 text-[#F2E8D5] font-black text-xs uppercase tracking-wider shadow-[3px_3px_0px_#181914] cursor-pointer flex items-center justify-center gap-1.5"
          >
            <Scale className="w-3.5 h-3.5" />
            <span>Comprar Acero en P2P</span>
          </button>
        </div>
      </div>
    </div>
  );
};

/**
 * ==============================================================================
 * PANEL DE CONTROL C4ISR: SELECTOR DE VISTAS Y HERRAMIENTA WPLACE (MAP CONTROLS)
 * ==============================================================================
 * Especificación Canónica: docs/ANALISIS_PROJECT_ALICE_RUTAS_INGENIERIA_MAPA_METAPOLITICA.md
 * Integración: 4 Vistas Especializadas C4ISR + Marcado Táctico WPlace en Vivo
 * ==============================================================================
 */

import React from 'react';
import {
  C4ISRMapViewMode,
  TacticalMarkType,
  CommanderFieldPosition,
  TacticalMapMark,
} from '@domains/world';
import {
  Shield,
  Truck,
  Flame,
  Radio,
  Crosshair,
  AlertTriangle,
  Flag,
  Target,
  Navigation,
} from 'lucide-react';

export interface TacticalMapControlsProps {
  currentViewMode: C4ISRMapViewMode;
  onSelectViewMode: (mode: C4ISRMapViewMode) => void;
  commander: CommanderFieldPosition | null;
  activeMarksCount: number;
  onStampMark: (type: TacticalMarkType) => void;
  onCenterCabimas: () => void;
  className?: string;
}

export const TacticalMapControls: React.FC<TacticalMapControlsProps> = ({
  currentViewMode,
  onSelectViewMode,
  commander,
  activeMarksCount,
  onStampMark,
  onCenterCabimas,
  className = '',
}) => {
  const views: { mode: C4ISRMapViewMode; label: string; icon: React.ReactNode; desc: string; color: string }[] = [
    {
      mode: 'V1_SOVEREIGNTY',
      label: 'V1 Soberanía',
      icon: <Shield className="w-4 h-4" />,
      desc: 'Control Político y Heráldica',
      color: 'border-blue-500/50 text-blue-400 bg-blue-950/30',
    },
    {
      mode: 'V2_LOGISTICS',
      label: 'V2 Logística',
      icon: <Truck className="w-4 h-4" />,
      desc: 'Throughput y Carreteras',
      color: 'border-cyan-500/50 text-cyan-400 bg-cyan-950/30',
    },
    {
      mode: 'V3_RESOURCES',
      label: 'V3 Recursos',
      icon: <Flame className="w-4 h-4" />,
      desc: 'Pozos y Patios Petroleros',
      color: 'border-amber-500/50 text-amber-400 bg-amber-950/30',
    },
    {
      mode: 'V4_THREATS',
      label: 'V4 Amenazas',
      icon: <Radio className="w-4 h-4" />,
      desc: 'Visión FLIR y Guarniciones IA',
      color: 'border-red-500/50 text-red-400 bg-red-950/30',
    },
  ];

  return (
    <div className={`absolute top-4 left-4 z-30 flex flex-col gap-2 pointer-events-auto ${className}`}>
      {/* 1. Selector de las 4 Vistas Especializadas C4ISR */}
      <div className="bg-[#12130E]/90 backdrop-blur-md border border-[#46521F] p-1.5 rounded-lg shadow-2xl flex gap-1.5">
        {views.map(v => {
          const isActive = currentViewMode === v.mode;
          return (
            <button
              key={v.mode}
              onClick={() => onSelectViewMode(v.mode)}
              title={v.desc}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-mono font-bold tracking-wider transition-all duration-150 ${
                isActive
                  ? `${v.color} border shadow-lg ring-1 ring-white/20 scale-105`
                  : 'text-stone-400 hover:text-stone-200 hover:bg-stone-800/40 border border-transparent'
              }`}
            >
              {v.icon}
              <span>{v.label}</span>
            </button>
          );
        })}

        <div className="h-6 w-px bg-stone-700/50 my-auto mx-1" />

        <button
          onClick={onCenterCabimas}
          title="Centrar Teatro Cabimas (COL, Zulia)"
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs font-mono font-bold text-amber-400 bg-amber-950/20 border border-amber-500/30 hover:bg-amber-900/40 transition-colors"
        >
          <Navigation className="w-3.5 h-3.5" />
          <span>CABIMAS</span>
        </button>
      </div>

      {/* 2. Barra de Herramientas WPlace (Marcas Tácticas Colaborativas) */}
      <div className="bg-[#12130E]/90 backdrop-blur-md border border-[#46521F] p-2 rounded-lg shadow-2xl flex items-center justify-between text-xs font-mono text-stone-300">
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-stone-500 uppercase tracking-widest font-bold">WPLACE MARKS ({activeMarksCount})</span>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => onStampMark('recon')}
            title="Sello de Reconocimiento Dron (Cian)"
            className="flex items-center gap-1 px-2 py-1 rounded bg-cyan-950/40 border border-cyan-500/30 hover:bg-cyan-800/50 text-cyan-300 transition-colors"
          >
            <Crosshair className="w-3.5 h-3.5" />
            <span>DRON</span>
          </button>
          <button
            onClick={() => onStampMark('danger_mine')}
            title="Alerta de Minas / Trampa (Amarillo)"
            className="flex items-center gap-1 px-2 py-1 rounded bg-yellow-950/40 border border-yellow-500/30 hover:bg-yellow-800/50 text-yellow-300 transition-colors"
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>MINAS</span>
          </button>
          <button
            onClick={() => onStampMark('claim')}
            title="Reclamo de Soberanía Clan (Azul Mando)"
            className="flex items-center gap-1 px-2 py-1 rounded bg-blue-950/40 border border-blue-500/30 hover:bg-blue-800/50 text-blue-300 transition-colors"
          >
            <Flag className="w-3.5 h-3.5" />
            <span>RECLAMO</span>
          </button>
          <button
            onClick={() => onStampMark('rally_strike')}
            title="Punto de Asalto y Concentración (Rojo)"
            className="flex items-center gap-1 px-2 py-1 rounded bg-red-950/40 border border-red-500/30 hover:bg-red-800/50 text-red-300 transition-colors"
          >
            <Target className="w-3.5 h-3.5" />
            <span>ASALTO</span>
          </button>
        </div>
      </div>

      {/* 3. Panel de Estado del Comandante en Campo */}
      {commander && (
        <div className="bg-[#12130E]/90 backdrop-blur-md border border-[#46521F] p-2 rounded-lg shadow-xl text-xs font-mono text-stone-300 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-bold text-stone-100">{commander.callsign}</span>
            <span className="text-stone-500 text-[10px]">[{commander.clanId}]</span>
          </div>
          <div className="flex items-center gap-3 text-[11px] text-stone-400">
            <span>Vel: <strong className="text-stone-200">{commander.speedKmh} km/h</strong></span>
            <span>Suministro: <strong className="text-emerald-400">{commander.supplyPercent}%</strong></span>
          </div>
        </div>
      )}
    </div>
  );
};

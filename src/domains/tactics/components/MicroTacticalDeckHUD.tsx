/**
 * ==============================================================================
 * PANEL DE DETALLE DEL MICROJUEGO C4ISR - MICRO TACTICAL DECK HUD (ZOOM X15)
 * ==============================================================================
 * Especificación Canónica: docs/00_GEOTACTICS_ONLINE_MASTER_SPEC.md §3.3
 * Conforme a @tactical-command-intel y @indie-game-ui-architect
 * - Activación reactiva al cruzar Zoom >= 15.0 en el mapa continuo.
 * - Asignación espacial analítica O(1): Coordenadas WGS84, Sector Mercator y Celda.
 * - Consola de despliegue de unidades y construcción in-situ de estructuras.
 * ==============================================================================
 */

import React from 'react';
import {
  Crosshair,
  Shield,
  Layers,
  MapPin,
  Hammer,
  Swords,
  ChevronRight,
  Sparkles,
  Zap,
} from 'lucide-react';
import { audioManager } from '@domains/game-feel';

export interface MicroTacticalDeckHUDProps {
  currentZoom: number;
  selectedSector: [number, number] | null;
  selectedCell: [number, number] | null;
  selectedLngLat: [number, number] | null;
  terrainType?: string;
  defenseStars?: number;
  occupantName?: string | null;
  onOpenDeploy: () => void;
  onOpenBuild: () => void;
  onClose?: () => void;
}

export const MicroTacticalDeckHUD: React.FC<MicroTacticalDeckHUDProps> = ({
  currentZoom,
  selectedSector,
  selectedCell,
  selectedLngLat,
  terrainType = 'Asfalto Urbano / Red Vial',
  defenseStars = 2,
  occupantName = null,
  onOpenDeploy,
  onOpenBuild,
  onClose,
}) => {
  // El panel de detalle del microjuego se activa al alcanzar el nivel de zoom x15
  if (currentZoom < 15.0) return null;

  const sectorStr = selectedSector ? `[${selectedSector[0]}, ${selectedSector[1]}]` : '[10294, 15424]';
  const cellStr = selectedCell ? `[${selectedCell[0]}, ${selectedCell[1]}]` : '[10, 10]';
  const coordsStr = selectedLngLat
    ? `${selectedLngLat[0].toFixed(5)}°O, ${selectedLngLat[1].toFixed(5)}°N`
    : '-71.45800°O, 10.39500°N';

  return (
    <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-40 w-11/12 max-w-3xl pointer-events-auto animate-in slide-in-from-bottom duration-300">
      <div
        className="bg-[#161712]/95 backdrop-blur-md border-3 border-[#0A0B08] shadow-[8px_8px_0px_#0A0B08] rounded-[14px_4px_14px_4px] p-3 sm:p-4 text-[#F2E8D5] flex flex-col md:flex-row items-center justify-between gap-3 relative overflow-hidden"
        style={{
          backgroundImage: 'radial-gradient(#46521F 15%, transparent 16%)',
          backgroundSize: '10px 10px',
        }}
      >
        {/* Indicador de Modo Microjuego Activo */}
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="w-10 h-10 rounded-[6px_2px_6px_2px] bg-[#E65100] border-2 border-[#0A0B08] flex items-center justify-center text-amber-200 shadow-[2px_2px_0px_#0A0B08] shrink-0">
            <Crosshair className="w-5 h-5 animate-pulse" />
          </div>

          <div className="space-y-0.5">
            <div className="flex items-center gap-1.5">
              <span className="px-1.5 py-0.5 bg-[#46521F] text-amber-300 border border-[#0A0B08] text-[9px] font-mono font-black uppercase rounded">
                LOD 3 • MICROJUEGO TÁCTICO
              </span>
              <span className="text-[10px] font-mono text-emerald-400 font-bold">
                ZOOM {currentZoom.toFixed(1)}x
              </span>
            </div>
            <h4 className="text-xs sm:text-sm font-display font-black text-[#F2E8D5] uppercase tracking-wide">
              ASIGNACIÓN ESPACIAL O(1)
            </h4>
          </div>
        </div>

        {/* Telemetría de Coordenadas de Celda */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 w-full md:w-auto text-[11px] font-mono bg-[#2B2C24]/90 p-2 rounded-[8px_2px_8px_2px] border border-[#7B8A4A]">
          <div>
            <span className="text-[9px] text-[#F2E8D5]/60 flex items-center gap-1">
              <Layers className="w-3 h-3 text-cyan-400" /> SECTOR / CELDA
            </span>
            <span className="font-bold text-amber-300">
              {sectorStr} • {cellStr}
            </span>
          </div>

          <div>
            <span className="text-[9px] text-[#F2E8D5]/60 flex items-center gap-1">
              <MapPin className="w-3 h-3 text-emerald-400" /> COORD WGS84
            </span>
            <span className="font-bold text-[#F2E8D5] truncate block">
              {coordsStr}
            </span>
          </div>

          <div className="col-span-2 sm:col-span-1">
            <span className="text-[9px] text-[#F2E8D5]/60 flex items-center gap-1">
              <Shield className="w-3 h-3 text-sky-400" /> COBERTURA
            </span>
            <span className="font-bold text-sky-300">
              {'★'.repeat(defenseStars)} ({defenseStars * 10}%)
            </span>
          </div>
        </div>

        {/* Botones de Acción de Microjuego */}
        <div className="flex items-center gap-2 w-full md:w-auto justify-end">
          <button
            type="button"
            onClick={() => {
              audioManager.playCue('tactical_confirm_click');
              onOpenDeploy();
            }}
            className="tactical-btn-heavy px-3 py-2 text-xs flex items-center gap-1.5 cursor-pointer"
            title="Desplegar tropa en esta coordenada"
          >
            <Swords className="w-3.5 h-3.5" />
            <span>DESPLEGAR</span>
          </button>

          <button
            type="button"
            onClick={() => {
              audioManager.playCue('tactical_confirm_click');
              onOpenBuild();
            }}
            className="px-3 py-2 bg-[#46521F] hover:bg-[#586827] text-amber-200 border-2 border-[#0A0B08] font-display font-black text-xs uppercase tracking-wide rounded-[6px_2px_6px_2px] shadow-[3px_3px_0px_#0A0B08] flex items-center gap-1.5 cursor-pointer transition-transform active:translate-y-0.5"
            title="Construir edificio in-situ"
          >
            <Hammer className="w-3.5 h-3.5" />
            <span>CONSTRUIR</span>
          </button>
        </div>
      </div>
    </div>
  );
};

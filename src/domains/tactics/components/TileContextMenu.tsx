import React, { useMemo } from 'react';
import {
  Crosshair,
  Flag,
  Zap,
  Wrench,
  Layers,
  ArrowDownToLine,
  EyeOff,
  Flame,
  Clock,
  Trash2,
  HelpCircle
} from 'lucide-react';
import { AvailableSubAction, ActionType } from '@domains/tactics';
import { audioManager } from '@domains/game-feel';

export interface TileContextMenuProps {
  screenX: number;
  screenY: number;
  tileSizePx: number;
  viewportWidth?: number;
  viewportHeight?: number;
  actions: AvailableSubAction[];
  onSelectAction: (action: AvailableSubAction) => void;
  onCancel: () => void;
}

const ACTION_ICONS: Record<ActionType, React.ReactNode> = {
  attack: <Crosshair className="w-3.5 h-3.5 text-red-400" />,
  capture: <Flag className="w-3.5 h-3.5 text-amber-400" />,
  launch_silo: <Zap className="w-3.5 h-3.5 text-purple-400 animate-pulse" />,
  supply: <Wrench className="w-3.5 h-3.5 text-cyan-400" />,
  join: <Layers className="w-3.5 h-3.5 text-emerald-400" />,
  unload: <ArrowDownToLine className="w-3.5 h-3.5 text-yellow-300" />,
  load: <Layers className="w-3.5 h-3.5 text-blue-400" />,
  wait: <Clock className="w-3.5 h-3.5 text-slate-300" />,
  hide: <EyeOff className="w-3.5 h-3.5 text-indigo-400" />,
  show: <EyeOff className="w-3.5 h-3.5 text-indigo-400" />,
  explode: <Flame className="w-3.5 h-3.5 text-orange-500 animate-bounce" />,
  delete: <Trash2 className="w-3.5 h-3.5 text-red-500" />,
  repair: <Wrench className="w-3.5 h-3.5 text-green-400" />,
};

const ACTION_KEY_HINTS: Record<ActionType, string> = {
  attack: '1',
  capture: '2',
  launch_silo: '3',
  supply: '4',
  join: '5',
  unload: '6',
  load: 'L',
  wait: 'Space',
  hide: 'H',
  show: 'H',
  explode: 'X',
  delete: 'Del',
  repair: 'R',
};

export const TileContextMenu: React.FC<TileContextMenuProps> = ({
  screenX,
  screenY,
  tileSizePx,
  viewportWidth = 940,
  viewportHeight = 540,
  actions,
  onSelectAction,
  onCancel,
}) => {
  // Dimensiones del Menú según la especificación del RFC (Sección 1.1)
  const menuWidth = 172;
  const menuHeight = 16 + actions.length * 36;
  const margin = 12;
  const delta = 8;

  // Algoritmo Canónico de Clamping Espacial con Flip Logic
  const clampedPos = useMemo(() => {
    // Intento 1: Posicionar a la derecha de la baldosa
    let finalX = screenX + tileSizePx + delta;
    if (finalX + menuWidth > viewportWidth - margin) {
      // Inversión al lado izquierdo si desborda la derecha
      finalX = screenX - menuWidth - delta;
      if (finalX < margin) {
        // Pinzamiento extremo dentro del viewport
        finalX = Math.max(margin, Math.min(screenX + tileSizePx + delta, viewportWidth - menuWidth - margin));
      }
    }

    // Eje Vertical: acotado dentro de los márgenes del viewport
    const finalY = Math.max(margin, Math.min(screenY, viewportHeight - menuHeight - margin));

    return { x: finalX, y: finalY };
  }, [screenX, screenY, tileSizePx, viewportWidth, viewportHeight, menuHeight]);

  return (
    <>
      {/* Backdrop transparente para cancelar al hacer clic fuera */}
      <div
        className="fixed inset-0 z-30 cursor-default"
        onClick={(e) => {
          e.stopPropagation();
          onCancel();
        }}
        onContextMenu={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onCancel();
        }}
      />

      {/* Menú Contextual Flotante */}
      <div
        style={{
          position: 'absolute',
          left: `${clampedPos.x}px`,
          top: `${clampedPos.y}px`,
          width: `${menuWidth}px`,
        }}
        onClick={(e) => e.stopPropagation()}
        className="z-40 bg-[#2B2C24]/95 backdrop-blur-md border-2 border-[#0A0B08] rounded-[8px_2px_8px_2px] shadow-[6px_6px_0px_#0A0B08] p-1.5 flex flex-col gap-1 select-none font-mono animate-in fade-in zoom-in-95 duration-100"
      >
        <div className="px-2 py-0.5 border-b border-[#7B8A4A]/30 flex items-center justify-between text-[10px] text-[#7B8A4A] font-black uppercase">
          <span>Órdenes Tácticas</span>
          <span className="text-[9px] text-[#F2E8D5]/60 font-mono">ESC</span>
        </div>

        <div className="flex flex-col gap-1 mt-0.5">
          {actions.map((act) => {
            const icon = ACTION_ICONS[act.type] || <HelpCircle className="w-3.5 h-3.5 text-slate-400" />;
            const keyHint = ACTION_KEY_HINTS[act.type] || '';

            return (
              <button
                key={act.type}
                onClick={() => onSelectAction(act)}
                onMouseEnter={() => audioManager.playHoverTick()}
                className="w-full text-left px-2.5 py-1.5 rounded-[4px_1px_4px_1px] bg-[#181914] hover:bg-[#46521F] text-[#F2E8D5] hover:text-white border border-[#7B8A4A]/40 hover:border-[#F2E8D5] flex items-center justify-between text-xs font-black transition-all cursor-pointer group active:translate-x-0.5 active:translate-y-0.5"
                title={act.description}
              >
                <div className="flex items-center gap-2">
                  {icon}
                  <span className="uppercase tracking-wide">{act.displayName}</span>
                </div>
                {keyHint && (
                  <span className="px-1 py-0.2 rounded bg-[#2B2C24] group-hover:bg-[#C46A3A] text-[#7B8A4A] group-hover:text-[#F2E8D5] text-[9px] font-mono border border-[#7B8A4A]/50">
                    {keyHint}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
};

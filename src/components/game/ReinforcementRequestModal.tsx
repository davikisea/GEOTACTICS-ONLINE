/**
 * ==============================================================================
 * MODAL DE SOLICITUD DE REFUERZOS EN COMBATE (DELAY 4 TURNOS / 3 CON FÁBRICA)
 * ==============================================================================
 * Permite al comandante solicitar una oleada de refuerzos de su reserva durante
 * el combate activo, con cuenta regresiva estricta de turnos.
 */

import React, { useState } from 'react';
import { Radio, Plus, Minus, X, Timer, Shield, AlertCircle } from 'lucide-react';
import {
  CANONICAL_RESERVE_CATALOG,
  PlayerReserveStock,
} from '../../engine/reinforcementsEngine';
import { audioManager } from '../../engine/audioManager';

export interface ReinforcementRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmRequest: (selectedCodes: string[]) => void;
  stock: PlayerReserveStock;
  hasFactoryBuff: boolean;
  currentPendingCount: number;
}

export const ReinforcementRequestModal: React.FC<ReinforcementRequestModalProps> = ({
  isOpen,
  onClose,
  onConfirmRequest,
  stock,
  hasFactoryBuff,
  currentPendingCount,
}) => {
  const [selection, setSelection] = useState<Record<string, number>>({});
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const totalSelected = Object.values(selection).reduce((a, b) => a + b, 0);
  const MAX_REINFORCEMENT_UNITS = 3;
  const turnsDelay = hasFactoryBuff ? 3 : 4;

  const handleAdd = (code: string) => {
    setErrorMsg(null);
    if (totalSelected >= MAX_REINFORCEMENT_UNITS) {
      setErrorMsg(`Máximo ${MAX_REINFORCEMENT_UNITS} unidades por solicitud de refuerzos.`);
      return;
    }
    const available = stock.units[code] || 0;
    const current = selection[code] || 0;
    if (current >= available) {
      setErrorMsg(`No dispones de más stock de ${CANONICAL_RESERVE_CATALOG[code].displayName}.`);
      return;
    }
    audioManager.playHoverTick();
    setSelection(prev => ({ ...prev, [code]: (prev[code] || 0) + 1 }));
  };

  const handleRemove = (code: string) => {
    setErrorMsg(null);
    if (!selection[code] || selection[code] <= 0) return;
    audioManager.playHoverTick();
    setSelection(prev => ({ ...prev, [code]: prev[code] - 1 }));
  };

  const handleConfirm = () => {
    if (totalSelected === 0) {
      setErrorMsg('Debes seleccionar al menos una unidad para los refuerzos.');
      return;
    }
    const flatCodes: string[] = [];
    Object.entries(selection).forEach(([code, count]) => {
      for (let i = 0; i < count; i++) flatCodes.push(code);
    });
    audioManager.playSFX('co_power');
    onConfirmRequest(flatCodes);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-150">
      <div className="relative w-full max-w-2xl bg-[#161712] border-2 border-[#0A0B08] rounded-[14px_4px_14px_4px] shadow-[6px_6px_0px_#0A0B08] text-[#F2E8D5] font-mono select-none">
        {/* Cabecera */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-[#2B2C24] border-b-2 border-[#0A0B08]">
          <div className="flex items-center gap-2.5">
            <Radio className="w-5 h-5 text-amber-400 animate-pulse" />
            <div>
              <h3 className="text-xs font-black uppercase text-white tracking-wider">
                Solicitud de Refuerzos de Emergencia
              </h3>
              <p className="text-[10px] text-amber-300">
                Llegada al frente en {turnsDelay} turnos ({hasFactoryBuff ? 'Complejo Industrial Activo' : 'Logística Estándar'})
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 text-zinc-400 hover:text-white rounded cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Contenido */}
        <div className="p-5 space-y-4">
          {errorMsg && (
            <div className="px-3 py-1.5 rounded bg-red-950/80 border border-red-500 text-xs text-red-200 font-bold">
              ⚠️ {errorMsg}
            </div>
          )}

          <div className="p-2.5 rounded bg-[#46521F]/40 border border-[#7B8A4A]/50 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <Timer className="w-4 h-4 text-emerald-400" />
              <span>Tiempo de Tránsito al Frente:</span>
              <span className="font-black text-amber-300 font-mono">{turnsDelay} Turnos</span>
            </div>
            {hasFactoryBuff && (
              <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 font-bold border border-emerald-600">
                -1T por Fábrica Aliada
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {Object.values(CANONICAL_RESERVE_CATALOG).map(unit => {
              const available = stock.units[unit.code] || 0;
              const count = selection[unit.code] || 0;
              const remaining = available - count;

              return (
                <div
                  key={unit.code}
                  className="p-2.5 rounded-[8px_2px_8px_2px] bg-[#2B2C24] border border-[#0A0B08] flex items-center justify-between"
                >
                  <div>
                    <div className="text-xs font-bold text-white">{unit.displayName}</div>
                    <div className="text-[10px] text-zinc-400">
                      En Reserva: <span className="text-amber-300 font-mono">{remaining}/{available}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleRemove(unit.code)}
                      disabled={count <= 0}
                      className="w-6 h-6 rounded bg-red-900/60 hover:bg-red-800 disabled:opacity-30 border border-[#0A0B08] flex items-center justify-center text-white cursor-pointer"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="w-5 text-center text-xs font-mono font-black text-white">
                      {count}
                    </span>
                    <button
                      onClick={() => handleAdd(unit.code)}
                      disabled={remaining <= 0 || totalSelected >= MAX_REINFORCEMENT_UNITS}
                      className="w-6 h-6 rounded bg-emerald-800 hover:bg-emerald-700 disabled:opacity-30 border border-[#0A0B08] flex items-center justify-center text-white cursor-pointer"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-[#2B2C24] border-t-2 border-[#0A0B08] flex items-center justify-between">
          <div className="text-xs text-zinc-400">
            Unidades Seleccionadas: <span className="text-white font-bold">{totalSelected}/{MAX_REINFORCEMENT_UNITS}</span>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={onClose}
              className="px-3 py-1.5 text-xs font-bold rounded bg-[#161712] text-zinc-300 border border-[#0A0B08] cursor-pointer"
            >
              Cancelar
            </button>
            <button
              onClick={handleConfirm}
              disabled={totalSelected === 0}
              className="px-4 py-1.5 rounded-[6px_2px_6px_2px] bg-[#C46A3A] hover:bg-[#a8572d] disabled:opacity-40 text-white font-black text-xs uppercase tracking-wider border-2 border-[#0A0B08] shadow-[2px_2px_0px_#0A0B08] flex items-center gap-1.5 cursor-pointer"
            >
              <Radio className="w-3.5 h-3.5" />
              <span>Confirmar Envío ({turnsDelay}T)</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

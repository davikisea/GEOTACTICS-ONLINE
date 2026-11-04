/**
 * ==============================================================================
 * MODAL DE DESPLIEGUE PRE-BATALLA & SELECCIÓN DE VANGUARDIA (TOTAL WAR STYLE)
 * ==============================================================================
 * Se abre antes de entrar al combate táctico:
 * 1. Muestra el Hangar de Stock de Reserva Militar del comandante.
 * 2. Permite elegir las tropas de vanguardia inicial (4 a 6 divisiones).
 * 3. Selector de escala de territorio continental y semilla procedural.
 * 4. Botón de Despliegue con SFX y animaciones tácticas.
 */

import React, { useState } from 'react';
import {
  Shield,
  Crosshair,
  MapPin,
  Dice5,
  Play,
  RotateCcw,
  Sparkles,
  Award,
  Layers,
  Cpu,
  X,
  Plus,
  Minus,
} from 'lucide-react';
import {
  CANONICAL_RESERVE_CATALOG,
  PlayerReserveStock,
  createInitialReserveStock,
  consumeVanguardDeployment,
} from '../../engine/reinforcementsEngine';
import { audioManager } from '../../engine/audioManager';
import { triggerHaptic } from '../../engine/hapticFeedback';

export interface DeploymentConfig {
  selectedUnits: string[];
  territoryPreset: 'skirmish' | 'tactical' | 'continental';
  seed: number;
  combatZone: { width: number; height: number };
  continentalSector: { width: number; height: number };
}

export interface PreBattleDeploymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmDeployment: (config: DeploymentConfig) => void;
  reserveStock?: PlayerReserveStock;
}

export const PreBattleDeploymentModal: React.FC<PreBattleDeploymentModalProps> = ({
  isOpen,
  onClose,
  onConfirmDeployment,
  reserveStock: externalStock,
}) => {
  const [stock] = useState<PlayerReserveStock>(() => externalStock || createInitialReserveStock('p1'));

  // Selección de vanguardia (por defecto: 2 infanterías, 1 recon, 1 tanque ligero)
  const [vanguard, setVanguard] = useState<Record<string, number>>({
    infantry: 2,
    recon: 1,
    tank_light: 1,
    mech: 0,
    tank_medium: 0,
    artillery: 0,
    anti_air: 0,
  });

  const [preset, setPreset] = useState<'skirmish' | 'tactical' | 'continental'>('tactical');
  const [seed, setSeed] = useState<number>(() => Math.floor(Math.random() * 9000000) + 1000000);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  React.useEffect(() => {
    if (isOpen) {
      setSeed(Math.floor(Math.random() * 9000000) + 1000000);
      setErrorMsg(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const totalSelectedUnits = Object.values(vanguard).reduce((a, b) => a + b, 0);
  const MAX_VANGUARD_UNITS = 6;
  const MIN_VANGUARD_UNITS = 3;

  const handleAddUnit = (code: string) => {
    setErrorMsg(null);
    if (totalSelectedUnits >= MAX_VANGUARD_UNITS) {
      setErrorMsg(`Capacidad de vanguardia máxima alcanzada (${MAX_VANGUARD_UNITS} divisiones).`);
      audioManager.playSFX('button_click');
      return;
    }

    const available = stock.units[code] || 0;
    const currentSelected = vanguard[code] || 0;
    if (currentSelected >= available) {
      setErrorMsg(`No dispones de más stock de ${CANONICAL_RESERVE_CATALOG[code].displayName}.`);
      return;
    }

    audioManager.playHoverTick();
    setVanguard(prev => ({
      ...prev,
      [code]: (prev[code] || 0) + 1,
    }));
  };

  const handleRemoveUnit = (code: string) => {
    setErrorMsg(null);
    if (!vanguard[code] || vanguard[code] <= 0) return;
    audioManager.playHoverTick();
    setVanguard(prev => ({
      ...prev,
      [code]: prev[code] - 1,
    }));
  };

  const handleRandomizeSeed = () => {
    audioManager.playSFX('button_click');
    setSeed(Math.floor(Math.random() * 900000) + 100000);
  };

  const handleDeploy = () => {
    if (totalSelectedUnits < MIN_VANGUARD_UNITS) {
      setErrorMsg(`Debes seleccionar al menos ${MIN_VANGUARD_UNITS} divisiones de vanguardia.`);
      return;
    }

    // Convertir diccionario a array plano de códigos
    const flatUnitCodes: string[] = [];
    Object.entries(vanguard).forEach(([code, count]) => {
      for (let i = 0; i < count; i++) flatUnitCodes.push(code);
    });

    const validation = consumeVanguardDeployment(stock, flatUnitCodes);
    if (!validation.success) {
      setErrorMsg(validation.error || 'Error al validar stock.');
      return;
    }

    let combatZone = { width: 14, height: 14 };
    let continentalSector = { width: 24, height: 24 };

    if (preset === 'skirmish') {
      combatZone = { width: 8, height: 8 };
      continentalSector = { width: 18, height: 18 };
    } else if (preset === 'continental') {
      combatZone = { width: 20, height: 20 };
      continentalSector = { width: 30, height: 30 };
    }

    triggerHaptic('success');
    audioManager.playSFX('co_power');

    onConfirmDeployment({
      selectedUnits: flatUnitCodes,
      territoryPreset: preset,
      seed,
      combatZone,
      continentalSector,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-150">
      <div className="relative w-full max-w-4xl max-h-[92vh] overflow-hidden flex flex-col bg-[#161712] border-2 border-[#0A0B08] rounded-[16px_4px_16px_4px] shadow-[6px_6px_0px_#0A0B08] text-[#F2E8D5] font-mono select-none">
        {/* Cabecera Estilo Total War / Mando Militar */}
        <div className="flex items-center justify-between px-6 py-4 bg-[#2B2C24] border-b-2 border-[#0A0B08]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-[8px_2px_8px_2px] bg-[#C46A3A] border border-[#0A0B08] flex items-center justify-center shadow-[2px_2px_0px_#0A0B08]">
              <Shield className="w-5 h-5 text-[#F2E8D5]" />
            </div>
            <div>
              <h2 className="text-sm font-black uppercase tracking-wider text-[#F2E8D5]">
                Plan de Despliegue de Vanguardia
              </h2>
              <p className="text-[11px] text-[#7B8A4A] font-bold">
                Asignación de Tropas desde el Hangar de Reserva Militar
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-white rounded hover:bg-white/10 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Cuerpo del Modal */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {errorMsg && (
            <div className="px-3.5 py-2 rounded bg-red-950/80 border border-red-500 text-xs text-red-200 font-bold">
              ⚠️ {errorMsg}
            </div>
          )}

          {/* 1. Selector de Escala de Territorio Continental */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-black uppercase tracking-wide text-zinc-300">
                1. Teatro de Operaciones Geográfico
              </span>
              <span className="text-[11px] text-[#C46A3A] font-bold">
                Territorio continuo sin bordes negros
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                {
                  id: 'skirmish',
                  title: 'Escaramuza Relámpago',
                  zone: '8x8 Choque',
                  continent: '18x18 Continente',
                  desc: 'Duelo rápido e hipercompulsivo en sector costero.',
                },
                {
                  id: 'tactical',
                  title: 'Sector Táctico Estándar',
                  zone: '14x14 Choque',
                  continent: '24x24 Continente',
                  desc: 'Equilibrio de blindados, artillería y cuencas fluviales.',
                },
                {
                  id: 'continental',
                  title: 'Gran Teatro Continental',
                  zone: '20x20 Choque',
                  continent: '30x30 Continente',
                  desc: 'Guerra total de desgaste con múltiples frentes y costas.',
                },
              ].map(item => (
                <button
                  key={item.id}
                  onClick={() => {
                    audioManager.playHoverTick();
                    setPreset(item.id as any);
                  }}
                  className={`p-3 text-left rounded-[10px_3px_10px_3px] border-2 transition-all cursor-pointer ${
                    preset === item.id
                      ? 'bg-[#46521F] border-[#C46A3A] text-white shadow-[3px_3px_0px_#0A0B08]'
                      : 'bg-[#2B2C24]/60 border-[#0A0B08] text-zinc-400 hover:border-zinc-500'
                  }`}
                >
                  <div className="text-xs font-black text-white">{item.title}</div>
                  <div className="text-[10px] text-amber-300 font-bold mt-0.5">
                    {item.zone} • {item.continent}
                  </div>
                  <div className="text-[10px] text-zinc-400 mt-1">{item.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* 2. Control de Semilla Procedural */}
          <div className="p-3 bg-[#2B2C24]/40 border border-[#0A0B08] rounded-[8px_2px_8px_2px] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Dice5 className="w-4 h-4 text-[#C46A3A]" />
              <span className="text-xs font-bold text-zinc-300">Semilla PRNG Determinista:</span>
              <span className="text-xs font-mono font-black text-amber-400">#{seed}</span>
            </div>
            <button
              onClick={handleRandomizeSeed}
              className="px-2.5 py-1 text-xs font-bold rounded bg-[#46521F] hover:bg-[#7B8A4A] text-white border border-[#0A0B08] flex items-center gap-1.5 transition cursor-pointer"
            >
              <Dice5 className="w-3.5 h-3.5" />
              <span>Aleatorizar</span>
            </button>
          </div>

          {/* 3. Catálogo de Hangar & Asignación de Tropas */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-black uppercase tracking-wide text-zinc-300">
                2. Selección de Tropas de Vanguardia ({totalSelectedUnits}/{MAX_VANGUARD_UNITS})
              </span>
              <span className="text-[11px] text-emerald-400 font-bold">
                Mínimo requerido: {MIN_VANGUARD_UNITS} unidades
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
              {Object.values(CANONICAL_RESERVE_CATALOG).map(unit => {
                const available = stock.units[unit.code] || 0;
                const count = vanguard[unit.code] || 0;
                const remainingInStock = available - count;

                return (
                  <div
                    key={unit.code}
                    className="p-3 rounded-[10px_3px_10px_3px] bg-[#2B2C24]/80 border border-[#0A0B08] flex items-center justify-between shadow-[2px_2px_0px_#0A0B08]"
                  >
                    <div className="flex-1 pr-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black text-white">{unit.displayName}</span>
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-black/40 text-amber-300 font-mono">
                          {unit.movementType} ({unit.movementPoints} PM)
                        </span>
                      </div>
                      <p className="text-[10px] text-zinc-400 mt-0.5 leading-snug">{unit.description}</p>
                      <div className="text-[10px] text-zinc-500 font-bold mt-1">
                        Stock Reserva: <span className="text-zinc-300 font-mono">{remainingInStock}/{available}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => handleRemoveUnit(unit.code)}
                        disabled={count <= 0}
                        className="w-7 h-7 rounded bg-red-900/60 hover:bg-red-800 disabled:opacity-30 border border-[#0A0B08] flex items-center justify-center text-white font-bold cursor-pointer"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className="w-6 text-center text-xs font-mono font-black text-white">
                        {count}
                      </span>
                      <button
                        onClick={() => handleAddUnit(unit.code)}
                        disabled={remainingInStock <= 0 || totalSelectedUnits >= MAX_VANGUARD_UNITS}
                        className="w-7 h-7 rounded bg-emerald-800/80 hover:bg-emerald-700 disabled:opacity-30 border border-[#0A0B08] flex items-center justify-center text-white font-bold cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Pie del Modal con Acción de Despliegue */}
        <div className="px-6 py-4 bg-[#2B2C24] border-t-2 border-[#0A0B08] flex items-center justify-between">
          <div className="text-xs text-zinc-400">
            Fuerza de Choque: <span className="text-white font-bold font-mono">{totalSelectedUnits} Divisiones</span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold rounded bg-[#161712] hover:bg-black/40 text-zinc-300 border border-[#0A0B08] cursor-pointer"
            >
              Cancelar
            </button>
            <button
              onClick={handleDeploy}
              disabled={totalSelectedUnits < MIN_VANGUARD_UNITS}
              className="px-5 py-2 rounded-[8px_2px_8px_2px] bg-[#C46A3A] hover:bg-[#a8572d] disabled:opacity-40 text-white font-black text-xs uppercase tracking-wider border-2 border-[#0A0B08] shadow-[3px_3px_0px_#0A0B08] flex items-center gap-2 cursor-pointer transition active:translate-x-0.5 active:translate-y-0.5"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>Desplegar en el Frente</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

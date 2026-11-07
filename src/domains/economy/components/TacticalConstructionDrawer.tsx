/**
 * ==============================================================================
 * DRAWER DE CONSTRUCCIÓN TÁCTICA IN-SITU C4ISR (OPENPLACE BRIDGE - SPRINT 3)
 * ==============================================================================
 * Especificación Canónica: docs/00_GEOTACTICS_ONLINE_MASTER_SPEC.md §3.3
 * Conforme a @tactical-command-intel y @indie-game-ui-architect
 * Permite edificar búnkeres, refinerías, silos y radares en coordenadas exactas a z=15.
 * ==============================================================================
 */

import React, { useState } from 'react';
import {
  Building2,
  Hammer,
  Shield,
  Zap,
  Radio,
  Flame,
  Truck,
  Cpu,
  X,
  AlertTriangle,
  CheckCircle2,
} from 'lucide-react';
import type { FiefBuildingType } from '@domains/world';
import { spatialDeploymentService } from '@domains/world';
import { audioManager } from '@domains/game-feel';

export interface TacticalConstructionDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  sector: [number, number];
  cell: [number, number];
  lngLat: [number, number];
  userClanId?: string;
  userCredits?: number;
  onConstructionSuccess?: (buildingType: FiefBuildingType) => void;
}

interface BuildingOption {
  type: FiefBuildingType;
  name: string;
  category: string;
  icon: React.ReactNode;
  costEc: number;
  hpMax: number;
  upkeepEc: number;
  description: string;
  tacticalBuff: string;
  colorHex: string;
}

const BUILDINGS_CATALOG: BuildingOption[] = [
  {
    type: 'refinery',
    name: 'Refinería Modular Pesada',
    category: 'INDUSTRIA ENERGÉTICA',
    icon: <Flame className="w-5 h-5 text-amber-400" />,
    costEc: 1500,
    hpMax: 6000,
    upkeepEc: 150,
    description: 'Extrae y refina crudo pesado para sostener convoyes mecanizados y aeronaves.',
    tacticalBuff: '+250 Barriles de Petróleo / Ciclo • Suministro Vial continuo',
    colorHex: '#E5A93C',
  },
  {
    type: 'radar_station',
    name: 'Estación de Radar FLIR & C4ISR',
    category: 'VIGILANCIA ELECTRÓNICA',
    icon: <Radio className="w-5 h-5 text-purple-400" />,
    costEc: 1200,
    hpMax: 3500,
    upkeepEc: 190,
    description: 'Disipa la niebla de guerra en 5 celdas y detecta emboscadas enemigas en carreteras.',
    tacticalBuff: 'Visión FLIR activa • Revela tropas camufladas en el sector',
    colorHex: '#A855F7',
  },
  {
    type: 'weapons_factory',
    name: 'Búnker de Armería & Municiones',
    category: 'FORTIFICACIÓN Y DEFENSA',
    icon: <Shield className="w-5 h-5 text-red-400" />,
    costEc: 1800,
    hpMax: 7000,
    upkeepEc: 220,
    description: 'Búnker blindado con guarnición IA activa y reabastecimiento de municiones pesadas.',
    tacticalBuff: '+40% Cobertura de Terreno • Guarnición autónoma integrada',
    colorHex: '#EF4444',
  },
  {
    type: 'logistics_silo',
    name: 'Silo Logístico de Suministro',
    category: 'LOGÍSTICA VIAL',
    icon: <Truck className="w-5 h-5 text-emerald-400" />,
    costEc: 800,
    hpMax: 4000,
    upkeepEc: 80,
    description: 'Incrementa la capacidad de paso (throughput) y repara convoyes en tránsito.',
    tacticalBuff: '+30% Throughput Logístico • Reparación táctica in-situ',
    colorHex: '#22C55E',
  },
  {
    type: 'microchip_foundry',
    name: 'Fundición Tecnológica C4ISR',
    category: 'ALTA TECNOLOGÍA',
    icon: <Cpu className="w-5 h-5 text-cyan-400" />,
    costEc: 2200,
    hpMax: 5000,
    upkeepEc: 260,
    description: 'Fabricación de microchips de tiro y sensores ópticos para blindados Tier 3-5.',
    tacticalBuff: '+15 Microchips / Ciclo • Habilita producción de drones',
    colorHex: '#06B6D4',
  },
];

export const TacticalConstructionDrawer: React.FC<TacticalConstructionDrawerProps> = ({
  isOpen,
  onClose,
  sector,
  cell,
  lngLat,
  userClanId = 'clan-ferro',
  userCredits = 10000,
  onConstructionSuccess,
}) => {
  const [selectedBuildingType, setSelectedBuildingType] = useState<FiefBuildingType>('refinery');
  const [isBuilding, setIsBuilding] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const selectedBuilding = BUILDINGS_CATALOG.find((b) => b.type === selectedBuildingType)!;

  const handleExecuteConstruction = () => {
    setErrorMsg(null);
    setSuccessMsg(null);
    setIsBuilding(true);

    try {
      const res = spatialDeploymentService.constructBuildingAt({
        sector,
        cell,
        lngLat,
        buildingType: selectedBuildingType,
        clanId: userClanId,
      });

      if (!res.success || !res.building) {
        audioManager.playCue('defeat_sting');
        setErrorMsg(res.reason || 'Fallo al autorizar la construcción en esta coordenada.');
      } else {
        audioManager.playCue('victory_fanfare');
        setSuccessMsg(`¡${selectedBuilding.name.toUpperCase()} CONSTRUIDA EXITOSAMENTE!`);
        if (onConstructionSuccess) onConstructionSuccess(selectedBuildingType);
        window.setTimeout(() => {
          onClose();
        }, 1500);
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Error inesperado al emitir la orden de ingeniería.');
    } finally {
      setIsBuilding(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-end p-2 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="w-full max-w-md h-full max-h-[92vh] bg-[#161712] border-3 border-[#0A0B08] shadow-[10px_10px_0px_#0A0B08] rounded-[14px_4px_14px_4px] flex flex-col overflow-hidden text-[#F2E8D5]"
        style={{
          backgroundImage: 'radial-gradient(#46521F 15%, transparent 16%)',
          backgroundSize: '10px 10px',
        }}
      >
        {/* Cabecera C4ISR */}
        <div className="px-4 py-3 bg-[#2B2C24] border-b-3 border-[#0A0B08] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-[#E65100] text-black rounded-[4px_1px_4px_1px] border border-[#0A0B08] shadow-[2px_2px_0px_#0A0B08]">
              <Hammer className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[10px] font-mono font-black uppercase text-amber-400 tracking-widest block leading-tight">
                INGENIERÍA MILITAR • ZOOM x15
              </span>
              <h3 className="text-sm font-display font-black text-[#F2E8D5] uppercase tracking-wide">
                CONSTRUCCIÓN IN-SITU
              </h3>
            </div>
          </div>

          <button
            type="button"
            title="Cerrar Construcción"
            onClick={() => {
              audioManager.playCue('ui_cancel_rollback');
              onClose();
            }}
            className="p-1 bg-[#161712] hover:bg-[#873612] text-[#F2E8D5] border border-[#0A0B08] rounded cursor-pointer transition-transform active:translate-y-0.5"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Telemetría Espacial de Destino */}
        <div className="px-4 py-2.5 bg-[#1F201A] border-b-2 border-[#0A0B08] flex items-center justify-between text-xs font-mono">
          <div>
            <span className="text-[10px] text-amber-300 font-bold block">COORDENADA DE OBRA:</span>
            <span className="text-[11px] text-[#F2E8D5]">
              SEC [{sector.join(',')}] • CELDA [{cell.join(',')}]
            </span>
          </div>
          <div className="text-right">
            <span className="text-[10px] text-amber-300 font-bold block">POSICIÓN GPS:</span>
            <span className="text-[10px] text-emerald-400">
              [{lngLat[0].toFixed(4)}, {lngLat[1].toFixed(4)}]
            </span>
          </div>
        </div>

        {/* Lista de Edificios Disponibles */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
          {errorMsg && (
            <div className="p-2.5 bg-red-950/80 border-2 border-red-500 rounded text-red-200 text-xs font-mono flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-red-400" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-2.5 bg-emerald-950/80 border-2 border-emerald-500 rounded text-emerald-200 text-xs font-mono flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
              <span>{successMsg}</span>
            </div>
          )}

          <div className="space-y-2">
            {BUILDINGS_CATALOG.map((b) => {
              const isSelected = selectedBuildingType === b.type;
              return (
                <div
                  key={b.type}
                  onClick={() => {
                    audioManager.playHoverTick();
                    setSelectedBuildingType(b.type);
                  }}
                  className={`p-3 rounded-[8px_2px_8px_2px] border-2 transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-[#2B2C24] border-amber-400 shadow-[4px_4px_0px_#0A0B08] translate-x-1'
                      : 'bg-[#1C1E17] border-[#0A0B08] hover:border-[#46521F] opacity-90'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      {b.icon}
                      <div>
                        <span className="text-[9px] font-mono text-amber-400/80 font-bold uppercase block leading-tight">
                          {b.category}
                        </span>
                        <h4 className="text-xs font-display font-black text-[#F2E8D5] uppercase">
                          {b.name}
                        </h4>
                      </div>
                    </div>

                    <span className="px-2 py-0.5 bg-[#161712] border border-[#0A0B08] text-amber-300 font-mono font-bold text-xs rounded">
                      {b.costEc} $G
                    </span>
                  </div>

                  <p className="text-[11px] font-mono text-[#F2E8D5]/70 leading-relaxed mb-2">
                    {b.description}
                  </p>

                  <div className="flex items-center justify-between text-[10px] font-mono pt-1 border-t border-[#46521F]/40 text-emerald-400 font-bold">
                    <span>{b.tacticalBuff}</span>
                    <span className="text-[#F2E8D5]/60">HP: {b.hpMax}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Pie de Mando con Botón Pesado */}
        <div className="p-3 bg-[#2B2C24] border-t-3 border-[#0A0B08] flex items-center justify-between gap-3">
          <div className="text-xs font-mono">
            <span className="text-[10px] text-[#F2E8D5]/60 block">COSTE TOTAL:</span>
            <span className="text-sm font-black text-amber-400">
              {selectedBuilding.costEc.toLocaleString()} $G
            </span>
          </div>

          <button
            type="button"
            disabled={isBuilding}
            onClick={handleExecuteConstruction}
            className="tactical-btn-heavy px-5 py-2.5 text-xs flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <Building2 className="w-4 h-4" />
            <span>{isBuilding ? 'CONSTRUYENDO...' : '¡ORDENAR CONSTRUCCIÓN!'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

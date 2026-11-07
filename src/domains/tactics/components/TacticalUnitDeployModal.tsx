/**
 * ==============================================================================
 * MODAL DE DESPLIEGUE ESPACIAL DE TROPAS EN COORDENADAS C4ISR (SPRINT 3)
 * ==============================================================================
 * Especificación Canónica: docs/00_GEOTACTICS_ONLINE_MASTER_SPEC.md §3.3
 * Conforme a @tactical-command-intel y @indie-game-ui-architect
 * Posiciona tropas del Hangar en coordenadas exactas a Zoom x15.
 * ==============================================================================
 */

import React, { useState } from 'react';
import {
  Crosshair,
  Shield,
  Radio,
  Swords,
  X,
  AlertTriangle,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';
import { spatialDeploymentService } from '@domains/world';
import { audioManager } from '@domains/game-feel';

export interface TacticalUnitDeployModalProps {
  isOpen: boolean;
  onClose: () => void;
  sector: [number, number];
  cell: [number, number];
  lngLat: [number, number];
  userClanId?: string;
  userClanTag?: string;
  userFactionId?: string;
  onDeploySuccess?: (unitCode: string) => void;
}

interface UnitDeployOption {
  code: string;
  name: string;
  tier: number;
  costGold: number;
  role: string;
  specs: string;
}

const DEPLOY_UNITS_CATALOG: UnitDeployOption[] = [
  {
    code: 'md_tank',
    name: 'Tanque Medio Blindado',
    tier: 2,
    costGold: 1200,
    role: 'Ofensiva y Ruptura',
    specs: 'Blindaje Pesado • 100 HP • Cañón de 90mm',
  },
  {
    code: 'recon',
    name: 'Vehículo Ligero de Reconocimiento',
    tier: 1,
    costGold: 400,
    role: 'Exploración y Vigilancia',
    specs: 'Alta Movilidad • Visión +3 Casillas • Radio VHF',
  },
  {
    code: 'mech',
    name: 'Infantería Pesada Mecanizada',
    tier: 1,
    costGold: 300,
    role: 'Captura y Emboscada',
    specs: 'Lanzacohetes Antitanque • Captura de Búnkeres',
  },
  {
    code: 'artillery',
    name: 'Batería de Artillería Autopropulsada',
    tier: 2,
    costGold: 1500,
    role: 'Ataque Indirecto',
    specs: 'Alcance 2-3 Casillas • Fuego Balístico Pesado',
  },
  {
    code: 'anti_air',
    name: 'Blindado Antiaéreo Vulcan',
    tier: 2,
    costGold: 1400,
    role: 'Defensa Aérea',
    specs: 'Doble Cañón Rotativo • Letal contra Drones/Copters',
  },
  {
    code: 'b_copter',
    name: 'Helicóptero de Ataque Aéreo',
    tier: 3,
    costGold: 2000,
    role: 'Dominio Aéreo Táctico',
    specs: 'Misiles Antitanque AGM • Tránsito sin fricción vial',
  },
];

export const TacticalUnitDeployModal: React.FC<TacticalUnitDeployModalProps> = ({
  isOpen,
  onClose,
  sector,
  cell,
  lngLat,
  userClanId = 'clan-ferro',
  userClanTag = 'FERR',
  userFactionId = 'blue_moon',
  onDeploySuccess,
}) => {
  const [selectedCode, setSelectedCode] = useState<string>('md_tank');
  const [callsign, setCallsign] = useState<string>('VANGUARDIA-ALFA');
  const [isDeploying, setIsDeploying] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const selectedUnit = DEPLOY_UNITS_CATALOG.find((u) => u.code === selectedCode)!;

  const handleExecuteDeploy = () => {
    setErrorMsg(null);
    setSuccessMsg(null);
    setIsDeploying(true);

    try {
      const res = spatialDeploymentService.deployUnitAt({
        sector,
        cell,
        lngLat,
        unitCode: selectedUnit.code,
        unitName: selectedUnit.name,
        clanId: userClanId,
        clanTag: userClanTag,
        factionId: userFactionId,
        callsign: callsign.trim().toUpperCase() || 'ESCUADRÓN-TÁCTICO',
        tier: selectedUnit.tier,
      });

      if (!res.success || !res.unit) {
        audioManager.playCue('defeat_sting');
        setErrorMsg(res.reason || 'Fallo al posicionar la unidad en las coordenadas.');
      } else {
        audioManager.playCue('victory_fanfare');
        setSuccessMsg(`¡${res.unit.callsign} DESPLEGADO EN COORDENADAS CON ÉXITO!`);
        if (onDeploySuccess) onDeploySuccess(selectedUnit.code);
        window.setTimeout(() => {
          onClose();
        }, 1400);
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Error inesperado al emitir la orden de despliegue.');
    } finally {
      setIsDeploying(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className="w-full max-w-lg bg-[#161712] border-3 border-[#0A0B08] shadow-[10px_10px_0px_#0A0B08] rounded-[14px_4px_14px_4px] flex flex-col overflow-hidden text-[#F2E8D5]"
        style={{
          backgroundImage: 'radial-gradient(#46521F 14%, transparent 15%)',
          backgroundSize: '10px 10px',
        }}
      >
        {/* Cabecera C4ISR */}
        <div className="px-4 py-3 bg-[#2B2C24] border-b-3 border-[#0A0B08] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-[#1D4ED8] text-white rounded-[4px_1px_4px_1px] border border-[#0A0B08] shadow-[2px_2px_0px_#0A0B08]">
              <Crosshair className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[10px] font-mono font-black uppercase text-amber-400 tracking-widest block leading-tight">
                ORDEN OPERACIONAL • ZOOM x15
              </span>
              <h3 className="text-sm font-display font-black text-[#F2E8D5] uppercase tracking-wide">
                DESPLIEGUE TÁCTICO DE TROPA
              </h3>
            </div>
          </div>

          <button
            type="button"
            title="Cerrar Despliegue"
            onClick={() => {
              audioManager.playCue('ui_cancel_rollback');
              onClose();
            }}
            className="p-1 bg-[#161712] hover:bg-[#873612] text-[#F2E8D5] border border-[#0A0B08] rounded cursor-pointer transition-transform active:translate-y-0.5"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Coordenadas Espaciales */}
        <div className="px-4 py-2 bg-[#1C1E17] border-b-2 border-[#0A0B08] flex items-center justify-between text-xs font-mono">
          <div>
            <span className="text-[10px] text-amber-300 font-bold block">ASIGNACIÓN ESPACIAL:</span>
            <span className="text-[#F2E8D5]">
              SEC [{sector.join(',')}] • CELDA [{cell.join(',')}]
            </span>
          </div>
          <div className="text-right">
            <span className="text-[10px] text-amber-300 font-bold block">GPS RADAR:</span>
            <span className="text-emerald-400">
              [{lngLat[0].toFixed(4)}, {lngLat[1].toFixed(4)}]
            </span>
          </div>
        </div>

        {/* Formulario y Catálogo de Tropas */}
        <div className="p-4 space-y-3.5 overflow-y-auto max-h-[60vh]">
          {errorMsg && (
            <div className="p-2.5 bg-red-950/80 border-2 border-red-500 rounded text-red-200 text-xs font-mono flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-red-400" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-2.5 bg-emerald-950/80 border-2 border-emerald-500 rounded text-emerald-200 text-xs font-mono flex items-center gap-2">
              <Sparkles className="w-4 h-4 shrink-0 text-emerald-400" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Indicativo de Radio / Callsign */}
          <div className="space-y-1">
            <label className="text-[11px] font-mono font-bold text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
              <Radio className="w-3.5 h-3.5" />
              <span>Indicativo de Radio (Callsign)</span>
            </label>
            <input
              type="text"
              value={callsign}
              onChange={(e) => setCallsign(e.target.value)}
              maxLength={24}
              className="w-full px-3 py-2 bg-[#161712] border-2 border-[#0A0B08] text-xs font-mono text-[#F2E8D5] uppercase rounded-[6px_2px_6px_2px] focus:outline-none focus:border-amber-400 shadow-[inset_2px_2px_4px_rgba(0,0,0,0.6)]"
              placeholder="Ej. VANGUARDIA-ALFA, FERRO-1..."
            />
          </div>

          {/* Selector de Unidades */}
          <div className="space-y-1.5">
            <span className="text-[11px] font-mono font-bold text-amber-300 uppercase tracking-wider block">
              Seleccionar Chasis del Hangar
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {DEPLOY_UNITS_CATALOG.map((u) => {
                const isSelected = selectedCode === u.code;
                return (
                  <div
                    key={u.code}
                    onClick={() => {
                      audioManager.playHoverTick();
                      setSelectedCode(u.code);
                    }}
                    className={`p-2.5 rounded-[6px_2px_6px_2px] border-2 transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-[#2B2C24] border-amber-400 shadow-[3px_3px_0px_#0A0B08] scale-[1.02]'
                        : 'bg-[#1C1E17] border-[#0A0B08] hover:border-[#46521F]'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-display font-black text-[#F2E8D5] uppercase">
                        {u.name}
                      </span>
                      <span className="px-1.5 py-0.5 bg-[#161712] border border-[#0A0B08] text-amber-400 font-mono font-bold text-[10px] rounded">
                        T{u.tier}
                      </span>
                    </div>

                    <p className="text-[10px] font-mono text-[#F2E8D5]/70 mb-1">
                      {u.specs}
                    </p>

                    <div className="flex items-center justify-between text-[10px] font-mono text-emerald-400 font-bold border-t border-[#46521F]/40 pt-1">
                      <span>{u.role}</span>
                      <span>{u.costGold} $G</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Pie con Botón de Despliegue Pesado */}
        <div className="p-3.5 bg-[#2B2C24] border-t-3 border-[#0A0B08] flex items-center justify-between gap-3">
          <div className="text-xs font-mono">
            <span className="text-[10px] text-[#F2E8D5]/60 block">COSTE DE SALIDA:</span>
            <span className="text-sm font-black text-amber-400">
              {selectedUnit.costGold.toLocaleString()} $G
            </span>
          </div>

          <button
            type="button"
            disabled={isDeploying}
            onClick={handleExecuteDeploy}
            className="tactical-btn-heavy px-5 py-2.5 text-xs flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <Swords className="w-4 h-4" />
            <span>{isDeploying ? 'DESPLEGANDO...' : '¡DESPLEGAR EN COORDENADAS!'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

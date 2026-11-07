/**
 * ==============================================================================
 * PANEL INSPECTOR DE ESTADO - STATE INSPECTOR DRAWER (C4ISR DIEGÉTICO)
 * ==============================================================================
 * Especificación Canónica: docs/00_GEOTACTICS_ONLINE_MASTER_SPEC.md §3.1 & §3.2
 * Conforme a @tactical-command-intel y @indie-game-ui-architect
 * - Muestra la telemetría de juego de un estado al hacer click en el mapa (z < 10).
 * - Identifica la facción hegemónica que lo controla con heráldica y colores oficiales.
 * - Incluye el botón de acceso para desbloquear el Panel de Control del Estado.
 * ==============================================================================
 */

import React, { useState, useEffect } from 'react';
import {
  Shield,
  Coins,
  Fuel,
  Hammer,
  Gem,
  Cpu,
  Lock,
  Unlock,
  Flag,
  Globe,
  X,
  Zap,
} from 'lucide-react';
import type {
  StateSovereigntyRecord,
  UserRoleContext,
} from '@domains/world';
import { stateSovereigntyService } from '@domains/world';
import { StateSovereignDeckModal } from './StateSovereignDeckModal';
import { audioManager } from '@domains/game-feel';

export interface StateInspectorDrawerProps {
  stateId: string | null;
  isOpen: boolean;
  onClose: () => void;
  userContext: UserRoleContext;
  onStateUpdated?: (updated: StateSovereigntyRecord) => void;
}

const FACTION_COLORS: Record<string, { bg: string; text: string; border: string; name: string }> = {
  orange_star: {
    bg: '#E65100',
    text: '#FDE047',
    border: '#F59E0B',
    name: 'Orange Star (Vanguardia)',
  },
  blue_moon: {
    bg: '#1D4ED8',
    text: '#93C5FD',
    border: '#3B82F6',
    name: 'Blue Moon (Legión Ártica)',
  },
  green_earth: {
    bg: '#15803D',
    text: '#86EFAC',
    border: '#22C55E',
    name: 'Green Earth (Superioridad)',
  },
  yellow_comet: {
    bg: '#D97706',
    text: '#FEF08A',
    border: '#FBBF24',
    name: 'Yellow Comet (Élite Marcial)',
  },
  black_hole: {
    bg: '#4C1D95',
    text: '#FCA5A5',
    border: '#991B1B',
    name: 'Black Hole (Dominio Táctico)',
  },
};

export const StateInspectorDrawer: React.FC<StateInspectorDrawerProps> = ({
  stateId,
  isOpen,
  onClose,
  userContext,
  onStateUpdated,
}) => {
  const [stateRecord, setStateRecord] = useState<StateSovereigntyRecord | null>(null);
  const [isSovereignDeckOpen, setIsSovereignDeckOpen] = useState(false);

  useEffect(() => {
    if (!stateId) {
      setStateRecord(null);
      return;
    }
    const record = stateSovereigntyService.getState(stateId);
    setStateRecord(record || null);

    const unsubscribe = stateSovereigntyService.subscribe((updated) => {
      if (updated.stateId === stateId) {
        setStateRecord(updated);
      }
    });

    return () => unsubscribe();
  }, [stateId]);

  if (!isOpen || !stateRecord) return null;

  const factionMeta = FACTION_COLORS[stateRecord.controllingFactionId] || {
    bg: '#2B2C24',
    text: '#F2E8D5',
    border: '#7B8A4A',
    name: stateRecord.controllingFactionId,
  };

  const authCheck = stateSovereigntyService.canUnlockStateControl(userContext, stateRecord.stateId);
  const tcpPercentage = Math.round((stateRecord.tcpCurrent / stateRecord.tcpMax) * 100);

  return (
    <>
      <div className="absolute top-16 left-3.5 z-30 w-84 sm:w-96 bg-[#161712]/95 backdrop-blur-md border-3 border-[#0A0B08] shadow-[8px_8px_0px_#0A0B08] rounded-[14px_4px_14px_4px] overflow-hidden flex flex-col text-[#F2E8D5] animate-in slide-in-from-left duration-200">
        {/* Cabecera con estandarte de Facción */}
        <div
          className="px-3.5 py-2.5 border-b-2 border-[#0A0B08] flex items-center justify-between"
          style={{ backgroundColor: factionMeta.bg }}
        >
          <div className="flex items-center gap-2">
            <Flag className="w-4 h-4 text-white drop-shadow" />
            <div>
              <span className="text-[10px] font-mono font-black uppercase tracking-wider text-black/80 block leading-tight">
                {factionMeta.name}
              </span>
              <h3 className="text-sm font-display font-black text-white uppercase tracking-wide drop-shadow-sm">
                {stateRecord.customStateName}
              </h3>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              audioManager.playCue('ui_cancel_rollback');
              onClose();
            }}
            className="p-1 bg-[#161712]/80 hover:bg-[#873612] text-[#F2E8D5] border border-[#0A0B08] rounded cursor-pointer transition-transform active:translate-y-0.5"
            title="Cerrar Inspector"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Cuerpo del Inspector */}
        <div className="p-3.5 space-y-3 font-mono text-xs">
          {/* País y Soberanía Nacional */}
          <div className="p-2.5 bg-[#2B2C24] border-2 border-[#0A0B08] rounded-[8px_2px_8px_2px] space-y-1">
            <div className="flex items-center justify-between text-[10px] text-[#F2E8D5]/70">
              <span className="flex items-center gap-1 font-bold">
                <Globe className="w-3 h-3 text-amber-400" />
                SOBERANÍA NACIONAL
              </span>
              <span className="text-emerald-400 font-bold uppercase">{stateRecord.status}</span>
            </div>
            <p className="text-xs font-display font-black text-amber-300 uppercase">
              {stateRecord.customCountryName}
            </p>
            {stateRecord.customMotto && (
              <p className="text-[10px] italic text-[#F2E8D5]/80 border-t border-[#46521F] pt-1">
                "{stateRecord.customMotto}"
              </p>
            )}
          </div>

          {/* Clan Controlador */}
          <div className="flex items-center justify-between p-2 bg-[#1C1E17] border border-[#46521F] rounded">
            <span className="text-[11px] text-[#F2E8D5]/70">Clan Hegemónico:</span>
            <div className="flex items-center gap-1.5">
              <span className="px-1.5 py-0.5 bg-[#46521F] text-amber-300 font-bold text-[10px] rounded border border-[#0A0B08]">
                [{stateRecord.controllingClanTag}]
              </span>
              <span className="font-bold text-[#F2E8D5]">{stateRecord.controllingClanName}</span>
            </div>
          </div>

          {/* Métricas de Guerra: TCP y PIB */}
          <div className="grid grid-cols-2 gap-2">
            <div className="p-2 bg-[#2B2C24] border border-[#0A0B08] rounded">
              <span className="text-[10px] text-[#F2E8D5]/70 flex items-center gap-1">
                <Shield className="w-3 h-3 text-sky-400" />
                CONTROL (TCP)
              </span>
              <span className="text-xs font-black text-sky-300">
                {stateRecord.tcpCurrent.toLocaleString()} / {stateRecord.tcpMax.toLocaleString()}
              </span>
              <div className="w-full bg-[#161712] h-1.5 mt-1 rounded overflow-hidden border border-[#0A0B08]">
                <div
                  className="bg-sky-400 h-full transition-all"
                  style={{ width: `${tcpPercentage}%` }}
                />
              </div>
            </div>

            <div className="p-2 bg-[#2B2C24] border border-[#0A0B08] rounded">
              <span className="text-[10px] text-[#F2E8D5]/70 flex items-center gap-1">
                <Coins className="w-3 h-3 text-amber-400" />
                PIB DE GUERRA
              </span>
              <span className="text-xs font-black text-amber-400">
                +{stateRecord.gdpWarCreditsPerHour.toLocaleString()} $G/hr
              </span>
              <span className="text-[9px] text-[#F2E8D5]/60 block mt-0.5">
                Defensa: Lvl {stateRecord.defenseLevel}/5
              </span>
            </div>
          </div>

          {/* Rendimiento de Recursos Estratégicos */}
          <div className="p-2 bg-[#1C1E17] border border-[#46521F] rounded space-y-1.5">
            <span className="text-[10px] text-[#F2E8D5]/70 uppercase font-bold flex items-center gap-1">
              <Zap className="w-3 h-3 text-emerald-400" />
              Rendimiento de Recursos / Ciclo
            </span>
            <div className="grid grid-cols-4 gap-1 text-[10px] text-center">
              <div className="p-1 bg-[#2B2C24] rounded border border-[#0A0B08]">
                <Fuel className="w-3 h-3 text-amber-400 mx-auto" />
                <span className="font-bold block mt-0.5">+{stateRecord.resources.oil}</span>
                <span className="text-[8px] text-[#F2E8D5]/50">Crudo</span>
              </div>
              <div className="p-1 bg-[#2B2C24] rounded border border-[#0A0B08]">
                <Hammer className="w-3 h-3 text-stone-300 mx-auto" />
                <span className="font-bold block mt-0.5">+{stateRecord.resources.steel}</span>
                <span className="text-[8px] text-[#F2E8D5]/50">Acero</span>
              </div>
              <div className="p-1 bg-[#2B2C24] rounded border border-[#0A0B08]">
                <Gem className="w-3 h-3 text-cyan-400 mx-auto" />
                <span className="font-bold block mt-0.5">+{stateRecord.resources.rareEarth}</span>
                <span className="text-[8px] text-[#F2E8D5]/50">Raros</span>
              </div>
              <div className="p-1 bg-[#2B2C24] rounded border border-[#0A0B08]">
                <Cpu className="w-3 h-3 text-purple-400 mx-auto" />
                <span className="font-bold block mt-0.5">+{stateRecord.resources.composites}</span>
                <span className="text-[8px] text-[#F2E8D5]/50">Blindaje</span>
              </div>
            </div>
          </div>

          {/* Botón para Desbloquear Panel de Control del Estado */}
          <button
            type="button"
            onClick={() => {
              if (authCheck.allowed) {
                audioManager.playCue('tactical_confirm_click');
                setIsSovereignDeckOpen(true);
              } else {
                audioManager.playCue('defeat_sting');
                setIsSovereignDeckOpen(true); // Abre modal para ver el aviso DEFCON 1
              }
            }}
            className={`w-full py-2.5 px-3 rounded-[6px_2px_6px_2px] border-2 border-[#0A0B08] shadow-[3px_3px_0px_#0A0B08] flex items-center justify-center gap-2 font-display font-black text-xs uppercase tracking-wide cursor-pointer transition-transform active:translate-y-0.5 ${
              authCheck.allowed
                ? 'bg-[#E65100] hover:bg-[#F59E0B] text-black'
                : 'bg-[#2B2C24] hover:bg-[#3B3C32] text-amber-300/80'
            }`}
          >
            {authCheck.allowed ? (
              <>
                <Unlock className="w-4 h-4" />
                <span>DESBLOQUEAR PANEL DE CONTROL</span>
              </>
            ) : (
              <>
                <Lock className="w-4 h-4 text-red-400" />
                <span>PANEL RESTRINGIDO (LÍDER/GESTOR)</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Modal de Control Soberano */}
      <StateSovereignDeckModal
        isOpen={isSovereignDeckOpen}
        onClose={() => setIsSovereignDeckOpen(false)}
        state={stateRecord}
        userContext={userContext}
        onSuccess={(updated) => {
          setStateRecord(updated);
          if (onStateUpdated) onStateUpdated(updated);
        }}
      />
    </>
  );
};

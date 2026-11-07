/**
 * ==============================================================================
 * PANEL DE CONTROL SOBERANO DEL ESTADO - STATE SOVEREIGN DECK (C4ISR DIEGÉTICO)
 * ==============================================================================
 * Conforme a @tactical-command-intel y @indie-game-ui-architect
 * - Desbloqueo exclusivo para Líderes de Clan y Gestores de Facción.
 * - Permite transformar y renombrar el concepto oficial de País y Estado.
 * - Estética Cómic War-Room con chaflanes a 45°, sombras de tinta y feedback reactivo.
 * ==============================================================================
 */

import React, { useState } from 'react';
import {
  ShieldAlert,
  Crown,
  Flag,
  Globe,
  CheckCircle2,
  AlertTriangle,
  X,
  Sparkles,
  Lock,
} from 'lucide-react';
import type {
  StateSovereigntyRecord,
  UserRoleContext,
} from '@domains/world';
import { stateSovereigntyService } from '@domains/world';
import { audioManager } from '@domains/game-feel';

export interface StateSovereignDeckModalProps {
  isOpen: boolean;
  onClose: () => void;
  state: StateSovereigntyRecord;
  userContext: UserRoleContext;
  onSuccess?: (updated: StateSovereigntyRecord) => void;
}

export const StateSovereignDeckModal: React.FC<StateSovereignDeckModalProps> = ({
  isOpen,
  onClose,
  state,
  userContext,
  onSuccess,
}) => {
  const [countryName, setCountryName] = useState(state.customCountryName);
  const [stateName, setStateName] = useState(state.customStateName);
  const [customMotto, setCustomMotto] = useState(state.customMotto || '');
  const [proclamation, setProclamation] = useState(state.sovereignProclamation || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const authCheck = stateSovereigntyService.canUnlockStateControl(userContext, state.stateId);

  const handleProclaimSovereignty = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    setIsSubmitting(true);

    try {
      const res = await stateSovereigntyService.updateStateSovereignty(userContext, {
        stateId: state.stateId,
        newCountryName: countryName,
        newStateName: stateName,
        customMotto: customMotto,
        sovereignProclamation: proclamation,
      });

      if (!res.success || !res.state) {
        audioManager.playCue('defeat_sting');
        setErrorMsg(res.error || 'Fallo de autorización al proclamar soberanía.');
      } else {
        audioManager.playCue('victory_fanfare');
        setSuccessMsg('¡DECRETO SOBERANO APROBADO Y TRANSMITIDO AL TEATRO GLOBAL!');
        if (onSuccess) onSuccess(res.state);
        window.setTimeout(() => {
          onClose();
        }, 1800);
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Error inesperado al emitir el decreto militar.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className="w-full max-w-2xl bg-[#1C1E17] border-3 border-[#0A0B08] shadow-[10px_10px_0px_#0A0B08] rounded-[14px_4px_14px_4px] overflow-hidden flex flex-col"
        style={{
          backgroundImage: 'radial-gradient(#46521F 12%, transparent 13%)',
          backgroundSize: '12px 12px',
        }}
      >
        {/* Cabecera de Mando Blindada */}
        <div className="px-4 py-3 bg-[#2B2C24] border-b-3 border-[#0A0B08] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-[6px_2px_6px_2px] bg-[#E65100] border-2 border-[#0A0B08] flex items-center justify-center text-amber-100 shadow-[2px_2px_0px_#0A0B08]">
              <Crown className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[10px] font-mono uppercase tracking-widest text-amber-400 font-bold block">
                C4ISR SOBERANÍA • GOBERNANZA DE ESTADO
              </span>
              <h2 className="text-sm sm:text-base font-display font-black text-[#F2E8D5] uppercase tracking-wide flex items-center gap-2">
                PANEL DE CONTROL DEL ESTADO: {state.canonicalStateName}
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              audioManager.playCue('ui_cancel_rollback');
              onClose();
            }}
            className="p-1.5 bg-[#161712] hover:bg-[#873612] text-[#F2E8D5] border-2 border-[#0A0B08] rounded-[4px_1px_4px_1px] cursor-pointer shadow-[2px_2px_0px_#0A0B08] transition-transform active:translate-y-0.5"
            title="Cerrar Consola"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Verificación de Acceso RBAC */}
        {!authCheck.allowed ? (
          <div className="p-6 flex flex-col items-center justify-center text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-red-950/80 border-3 border-red-600 flex items-center justify-center text-red-400 shadow-[4px_4px_0px_#0A0B08] animate-pulse">
              <Lock className="w-8 h-8" />
            </div>
            <div className="space-y-1.5 max-w-md">
              <h3 className="text-base font-display font-black text-red-400 uppercase tracking-wide">
                ¡ACCESO DENEGADO (DEFCON 1)!
              </h3>
              <p className="text-xs font-mono text-[#F2E8D5]/80 leading-relaxed">
                {authCheck.reason}
              </p>
            </div>
            <div className="p-3 bg-[#161712] border-2 border-[#0A0B08] rounded-[8px_2px_8px_2px] text-[11px] font-mono text-amber-300">
              Rango actual: <strong className="text-red-400 uppercase">{userContext.clanRole}</strong> • Facción: <strong className="text-amber-400 uppercase">{userContext.factionId}</strong>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 bg-[#2B2C24] hover:bg-[#46521F] text-[#F2E8D5] border-2 border-[#0A0B08] font-mono font-bold text-xs uppercase shadow-[3px_3px_0px_#0A0B08] cursor-pointer"
            >
              RETIRARSE AL MANDO
            </button>
          </div>
        ) : (
          /* Formulario de Decreto Soberano para Comandantes Autorizados */
          <form onSubmit={handleProclaimSovereignty} className="p-4 sm:p-5 space-y-4 overflow-y-auto max-h-[75vh]">
            {/* Banner de Autorización Verificada */}
            <div className="p-2.5 bg-[#46521F]/40 border-2 border-[#7B8A4A] rounded-[8px_2px_8px_2px] flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 text-emerald-400 font-mono font-bold">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>COMANDANTE EN JEFE AUTORIZADO ({userContext.clanRole.toUpperCase()})</span>
              </div>
              <span className="text-[10px] font-mono text-[#F2E8D5]/70">
                Clan: <strong className="text-amber-400">{userContext.clanTag}</strong>
              </span>
            </div>

            {errorMsg && (
              <div className="p-3 bg-red-950/70 border-2 border-red-500 rounded-[6px_2px_6px_2px] flex items-center gap-2 text-red-200 text-xs font-mono">
                <AlertTriangle className="w-4 h-4 shrink-0 text-red-400" />
                <span>{errorMsg}</span>
              </div>
            )}

            {successMsg && (
              <div className="p-3 bg-emerald-950/80 border-2 border-emerald-500 rounded-[6px_2px_6px_2px] flex items-center gap-2 text-emerald-200 text-xs font-mono">
                <Sparkles className="w-4 h-4 shrink-0 text-emerald-400" />
                <span>{successMsg}</span>
              </div>
            )}

            {/* Campo 1: Nombre Soberano del País */}
            <div className="space-y-1">
              <label className="text-[11px] font-mono font-bold text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5" />
                <span>Concepto Oficial del País / Nación</span>
              </label>
              <p className="text-[10px] text-[#F2E8D5]/60 font-mono">
                Puedes redefinir el nombre de Venezuela para reflejar la identidad y doctrina de tu facción.
              </p>
              <input
                type="text"
                value={countryName}
                onChange={(e) => setCountryName(e.target.value)}
                required
                maxLength={60}
                className="w-full px-3 py-2 bg-[#161712] border-2 border-[#0A0B08] text-sm font-mono text-[#F2E8D5] rounded-[6px_2px_6px_2px] focus:outline-none focus:border-amber-400 shadow-[inset_2px_2px_4px_rgba(0,0,0,0.6)]"
                placeholder="Ej. Hegemonía Petrolera de Maracaibo, Unión Bolivariana Ferro..."
              />
            </div>

            {/* Campo 2: Nombre Renombrado del Estado */}
            <div className="space-y-1">
              <label className="text-[11px] font-mono font-bold text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
                <Flag className="w-3.5 h-3.5" />
                <span>Nombre Oficial del Estado / Entidad Federal</span>
              </label>
              <input
                type="text"
                value={stateName}
                onChange={(e) => setStateName(e.target.value)}
                required
                maxLength={60}
                className="w-full px-3 py-2 bg-[#161712] border-2 border-[#0A0B08] text-sm font-mono text-[#F2E8D5] rounded-[6px_2px_6px_2px] focus:outline-none focus:border-amber-400 shadow-[inset_2px_2px_4px_rgba(0,0,0,0.6)]"
                placeholder="Ej. Estado Zulia (Teatro Cabimas), Caracas Metrópolis Central..."
              />
            </div>

            {/* Campo 3: Lema de la Facción */}
            <div className="space-y-1">
              <label className="text-[11px] font-mono font-bold text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
                <ShieldAlert className="w-3.5 h-3.5" />
                <span>Lema Soberano de la Facción</span>
              </label>
              <input
                type="text"
                value={customMotto}
                onChange={(e) => setCustomMotto(e.target.value)}
                maxLength={80}
                className="w-full px-3 py-2 bg-[#161712] border-2 border-[#0A0B08] text-sm font-mono text-[#F2E8D5] rounded-[6px_2px_6px_2px] focus:outline-none focus:border-amber-400 shadow-[inset_2px_2px_4px_rgba(0,0,0,0.6)]"
                placeholder="Ej. Acero Frío y Petróleo Pesado • Victoria sin Piedad"
              />
            </div>

            {/* Campo 4: Proclama o Manifiesto */}
            <div className="space-y-1">
              <label className="text-[11px] font-mono font-bold text-amber-300 uppercase tracking-wider block">
                Manifiesto Soberano de Guerra (Transmitido a todos los Comandantes)
              </label>
              <textarea
                value={proclamation}
                onChange={(e) => setProclamation(e.target.value)}
                maxLength={240}
                rows={3}
                className="w-full px-3 py-2 bg-[#161712] border-2 border-[#0A0B08] text-xs font-mono text-[#F2E8D5] rounded-[6px_2px_6px_2px] focus:outline-none focus:border-amber-400 shadow-[inset_2px_2px_4px_rgba(0,0,0,0.6)] resize-none"
                placeholder="Escribe la proclama oficial de soberanía de tu clan..."
              />
            </div>

            {/* Botón de Acción Pesado C4ISR */}
            <div className="pt-2 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="px-4 py-2 bg-[#2B2C24] hover:bg-[#3B3C32] text-[#F2E8D5] border-2 border-[#0A0B08] text-xs font-mono font-bold uppercase rounded-[6px_2px_6px_2px] shadow-[2px_2px_0px_#0A0B08] cursor-pointer"
              >
                CANCELAR
              </button>

              <button
                type="submit"
                disabled={isSubmitting}
                className="tactical-btn-heavy px-5 py-2.5 text-xs flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <Crown className="w-4 h-4" />
                <span>{isSubmitting ? 'EMITIENDO DECRETO...' : '¡PROCLAMAR NUEVA SOBERANÍA!'}</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

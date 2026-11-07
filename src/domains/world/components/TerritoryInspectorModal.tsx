/**
 * ==============================================================================
 * TERRITORY INSPECTOR MODAL: CONSOLA C4ISR DE PROVINCIA SOBERANA
 * ==============================================================================
 * Especificación Canónica: METAGAME_DESIGN/MASTER_METAGAME_SPEC_V1.md §3 y §10.3
 * ==============================================================================
 */

import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Shield,
  Crown,
  Swords,
  Factory,
  Radio,
  Zap,
  TrendingUp,
  AlertOctagon,
  Clock,
  Layers,
  ChevronRight,
} from 'lucide-react';
import { ProvinceVisualData } from '@shared';

export interface TerritoryInspectorModalProps {
  province: ProvinceVisualData | null;
  isOpen: boolean;
  onClose: () => void;
  onInitiateAssault?: (provinceId: string) => void;
  onDeployReinforcements?: (provinceId: string) => void;
  userClanTag?: string;
}

export const TerritoryInspectorModal: React.FC<TerritoryInspectorModalProps> = ({
  province,
  isOpen,
  onClose,
  onInitiateAssault,
  onDeployReinforcements,
  userClanTag = 'TITAN',
}) => {
  if (!isOpen || !province) return null;

  const isOwner = province.ownerTag === userClanTag;
  const tcpPercent = Math.round((province.tcp / province.tcpMax) * 100);

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-2xl bg-[#161712] border-2 border-[#7B8A4A] rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.9)] overflow-hidden text-[#F2E8D5]"
          style={{
            boxShadow: '8px 8px 0px #0A0B08, 0 0 30px rgba(70,82,31,0.5)',
          }}
        >
          {/* Cabecera Blindada */}
          <div
            className="px-6 py-4 border-b border-[#46521F] flex items-center justify-between"
            style={{ backgroundColor: `${province.ownerColor}33` }}
          >
            <div className="flex items-center gap-3">
              {province.isCapital ? (
                <div className="p-2 bg-yellow-500/20 border border-yellow-500 rounded-lg">
                  <Crown className="w-6 h-6 text-yellow-400" />
                </div>
              ) : (
                <div className="p-2 bg-[#46521F]/40 border border-[#7B8A4A] rounded-lg">
                  <Shield className="w-6 h-6 text-[#7B8A4A]" />
                </div>
              )}
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-black uppercase tracking-wider">{province.name}</h2>
                  <span className="text-xs font-mono bg-black/60 px-2 py-0.5 rounded text-amber-400 border border-amber-500/30">
                    {province.countryIso}
                  </span>
                </div>
                <p className="text-xs font-mono text-[#F2E8D5]/60">
                  Sector Soberano • Bioma: {province.biome.replace('_', ' ').toUpperCase()}
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg bg-[#2B2C24] hover:bg-[#C46A3A] text-[#F2E8D5] transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Cuerpo de Telemetría */}
          <div className="p-6 space-y-6">
            {/* Aviso de Capital de Alto Rendimiento */}
            {province.isCapital && (
              <div className="flex items-center gap-3 p-3 bg-yellow-950/40 border border-yellow-500/50 rounded-xl text-yellow-300 text-xs font-mono">
                <Crown className="w-5 h-5 flex-shrink-0 text-yellow-400" />
                <span>
                  <strong>CAPITAL HISTÓRICA DE ALTO RENDIMIENTO (CAPTURABLE):</strong> Super-nodo con la mayor capacidad
                  de generación de recursos del planeta y slots máximos de producción. ¡Objetivo militar codiciado!
                </span>
              </div>
            )}

            {/* Aviso de Cooldown Post-Conquista */}
            {province.status === 'cooldown_priority' && (
              <div className="flex items-center gap-3 p-3 bg-cyan-950/40 border border-cyan-500/50 rounded-xl text-cyan-300 text-xs font-mono">
                <Clock className="w-5 h-5 flex-shrink-0" />
                <span>
                  <strong>ESCUDO TEMPORAL DE 4 HORAS ACTIVO:</strong> Provincia en periodo de
                  asimilación y fortificación post-conquista. Ataques enemigos suspendidos.
                </span>
              </div>
            )}

            {/* Fila de Métricas: Soberano, TCP y Flujo de Recursos */}
            <div className="grid grid-cols-3 gap-4">
              <div className="p-3 bg-[#2B2C24] border border-[#46521F] rounded-xl font-mono text-center">
                <span className="text-[10px] text-[#F2E8D5]/60 uppercase">Corporación Soberana</span>
                <p className="text-lg font-black text-amber-400 mt-1">[{province.ownerTag}]</p>
              </div>

              <div className="p-3 bg-[#2B2C24] border border-[#46521F] rounded-xl font-mono text-center">
                <span className="text-[10px] text-[#F2E8D5]/60 uppercase">Puntos de Control (TCP)</span>
                <p
                  className={`text-lg font-black mt-1 ${
                    tcpPercent < 50
                      ? 'text-red-400'
                      : tcpPercent < 80
                      ? 'text-amber-400'
                      : 'text-emerald-400'
                  }`}
                >
                  {province.tcp} / {province.tcpMax}
                </p>
              </div>

              <div className="p-3 bg-[#2B2C24] border border-[#46521F] rounded-xl font-mono text-center">
                <span className="text-[10px] text-[#F2E8D5]/60 uppercase">Flujo por Minuto</span>
                <p className="text-sm font-black text-emerald-400 mt-1 truncate">
                  {province.resourcePerMin}
                </p>
              </div>
            </div>

            {/* Barra Visual de TCP */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-[#F2E8D5]/70">Integridad de Control Territorial</span>
                <span className="font-bold">{tcpPercent}%</span>
              </div>
              <div className="w-full h-3 bg-black/60 rounded-full overflow-hidden border border-[#46521F]">
                <div
                  className={`h-full transition-all duration-500 ${
                    tcpPercent < 50
                      ? 'bg-red-500'
                      : tcpPercent < 80
                      ? 'bg-amber-500'
                      : 'bg-emerald-500'
                  }`}
                  style={{ width: `${tcpPercent}%` }}
                />
              </div>
            </div>

            {/* Módulos Industriales y Guarnición */}
            <div className="grid grid-cols-2 gap-4 text-xs font-mono">
              <div className="p-3 bg-[#2B2C24]/60 border border-[#46521F] rounded-xl flex items-center gap-3">
                <Factory className="w-5 h-5 text-amber-400 flex-shrink-0" />
                <div>
                  <span className="font-bold text-[#F2E8D5]">Complejo Industrial:</span>
                  <p className="text-[#F2E8D5]/60">4 / 8 Parcelas Edificadas</p>
                </div>
              </div>

              <div className="p-3 bg-[#2B2C24]/60 border border-[#46521F] rounded-xl flex items-center gap-3">
                <Radio className="w-5 h-5 text-cyan-400 flex-shrink-0" />
                <div>
                  <span className="font-bold text-[#F2E8D5]">Búnker de Guarnición:</span>
                  <p className="text-[#F2E8D5]/60">Nivel 3 (Minimax d=2)</p>
                </div>
              </div>
            </div>
          </div>

          {/* Barra de Acciones */}
          <div className="px-6 py-4 bg-[#12130e] border-t border-[#46521F] flex items-center justify-between">
            <span className="text-xs font-mono text-[#F2E8D5]/50">
              {isOwner ? 'Territorio propio bajo tu coalición.' : 'Territorio hostil o neutral.'}
            </span>

            <div className="flex items-center gap-3">
              {isOwner ? (
                <button
                  onClick={() => {
                    if (onDeployReinforcements) onDeployReinforcements(province.id);
                  }}
                  className="px-4 py-2 bg-[#46521F] hover:bg-[#7B8A4A] text-[#F2E8D5] font-black text-xs uppercase tracking-wider rounded-lg transition-colors flex items-center gap-2"
                >
                  <Shield className="w-4 h-4" />
                  <span>Reforzar Guarnición</span>
                </button>
              ) : (
                <button
                  disabled={province.status === 'cooldown_priority'}
                  onClick={() => {
                    if (onInitiateAssault) onInitiateAssault(province.id);
                  }}
                  className={`px-5 py-2 font-black text-xs uppercase tracking-wider rounded-lg transition-all flex items-center gap-2 ${
                    province.status === 'cooldown_priority'
                      ? 'bg-neutral-800 text-neutral-500 cursor-not-allowed border border-neutral-700'
                      : 'bg-[#C46A3A] hover:bg-red-600 text-white shadow-[0_0_15px_rgba(196,106,58,0.5)]'
                  }`}
                >
                  <Swords className="w-4 h-4" />
                  <span>Declarar Asedio Táctico</span>
                </button>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

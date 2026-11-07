/**
 * ==============================================================================
 * MODAL DE ASEDIO TERRITORIAL Y ALERTA DE HANDSHAKE C4ISR (120s)
 * ==============================================================================
 * Especificación Canónica: docs/00_GEOTACTICS_ONLINE_MASTER_SPEC.md §5.4
 * Estilo Visual: Skill retro-futurism (atompunk, ben-day, bordes rígidos C4ISR).
 * Presenta el temporizador de 120 segundos para el relevo defensivo humano y
 * el estado de fortificación de los puntos de control territorial (TCP).
 * ==============================================================================
 */

import React from 'react';
import {
  Shield,
  AlertTriangle,
  Timer,
  Crosshair,
  Bot,
  UserCheck,
  Swords,
  X,
  Factory,
} from 'lucide-react';
import {
  TerritorialBattleSession,
  GeotacticsRegionSovereignty,
} from '@shared';
import { GarrisonAIEngine } from '@domains/tactics';
import { audioManager } from '@domains/game-feel';

interface TerritorySiegeModalProps {
  isOpen: boolean;
  onClose: () => void;
  session: TerritorialBattleSession | null;
  sovereignty: GeotacticsRegionSovereignty | null;
  regionName?: string;
  isCapital?: boolean;
  handshakeSecondsRemaining: number;
  isDefendingClan: boolean;
  onClaimHandshake: () => void;
  onEnterBattle: () => void;
}

export const TerritorySiegeModal: React.FC<TerritorySiegeModalProps> = ({
  isOpen,
  onClose,
  session,
  sovereignty,
  regionName = 'Sector Operacional',
  isCapital = false,
  handshakeSecondsRemaining,
  isDefendingClan,
  onClaimHandshake,
  onEnterBattle,
}) => {
  if (!isOpen || !session || !sovereignty) return null;

  const bunkerLevel = sovereignty.bunkerLevel || 1;
  const garrisonSpec = GarrisonAIEngine.GARRISON_TIER_SPECS[bunkerLevel] || GarrisonAIEngine.GARRISON_TIER_SPECS[1];
  const maxTcp = sovereignty.maxControlPoints || (isCapital ? 15000 : 10000);
  const currentTcp = sovereignty.controlPoints;
  const tcpPercent = Math.max(0, Math.min(100, (currentTcp / maxTcp) * 100));

  const minutes = Math.floor(handshakeSecondsRemaining / 60);
  const seconds = handshakeSecondsRemaining % 60;
  const formattedTime = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  const isHandshakeExpired = handshakeSecondsRemaining <= 0;
  const isPvP = session.mode === 'pvp_realtime';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fade-in font-mono select-none"
      onClick={e => {
        if (e.target === e.currentTarget) {
          audioManager.playSFX('button_click');
          onClose();
        }
      }}
    >
      <div className="bg-[#2B2C24] border-4 border-[#0A0B08] w-full max-w-2xl rounded-[24px_6px_24px_6px] shadow-[12px_12px_0px_#0A0B08] flex flex-col overflow-hidden text-[#F2E8D5] ben-day-dark">
        {/* Encabezado C4ISR */}
        <div className="p-4 border-b-2 border-[#0A0B08] flex items-center justify-between bg-[#181914]">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-950 text-red-400 border-2 border-red-700 rounded-[8px_2px_8px_2px] shadow-[2px_2px_0px_#0A0B08] animate-pulse">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-widest text-red-400 font-bold">
                C4ISR // ALERTA ROJA DE ASALTO PROVINCIAL
              </div>
              <h2 className="text-xl font-black tracking-wider text-[#F2E8D5] flex items-center gap-2">
                {regionName}
                {isCapital && (
                  <span className="text-[10px] px-2 py-0.5 bg-amber-500/20 text-amber-300 border border-amber-500 rounded">
                    CAPITAL NACIONAL
                  </span>
                )}
              </h2>
            </div>
          </div>
          <button
            onClick={() => {
              audioManager.playSFX('button_click');
              onClose();
            }}
            className="p-1.5 text-[#A4B382] hover:text-[#F2E8D5] hover:bg-[#3E4233] border-2 border-transparent hover:border-[#0A0B08] rounded transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Cuerpo del Asedio */}
        <div className="p-6 space-y-6">
          {/* Cronómetro Fischer de Handshake (120s) */}
          <div className="bg-[#181914] border-2 border-[#0A0B08] rounded-[16px_4px_16px_4px] p-4 text-center shadow-[4px_4px_0px_#0A0B08]">
            <div className="flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-widest text-[#A4B382] mb-1">
              <Timer className="w-4 h-4 text-amber-400" />
              {isPvP
                ? 'COMANDANTE HUMANO CONFIRMADO // DUELO PvP EN VIVO'
                : isHandshakeExpired
                ? 'PLAZO EXPIRADO // GUARNICIÓN IA ASIGNADA'
                : 'VENTANA DE RELEVO DEFENSIVO HUMANO (HANDSHAKE 120s)'}
            </div>
            <div
              className={`text-5xl font-black tracking-widest font-mono ${
                isPvP
                  ? 'text-emerald-400'
                  : isHandshakeExpired
                  ? 'text-amber-400'
                  : handshakeSecondsRemaining <= 30
                  ? 'text-red-500 animate-pulse'
                  : 'text-amber-400'
              }`}
            >
              {isPvP ? 'PvP ACTIVO' : formattedTime}
            </div>
            <p className="text-xs text-[#A4B382] mt-2 max-w-md mx-auto">
              {isPvP
                ? 'Un oficial humano del clan defensor ha tomado el mando. El combate se resolverá en tiempo real bajo reloj Fischer.'
                : isHandshakeExpired
                ? `La Guarnición IA (${garrisonSpec.name}) ha tomado el control defensivo con motor ${garrisonSpec.searchEngine}.`
                : 'Los miembros del clan defensor tienen 120 segundos para responder a la alerta C4ISR y tomar el mando antes de que la Guarnición IA asuma el control.'}
            </p>
          </div>

          {/* Barra de Puntos de Control Territorial (TCP) */}
          <div className="bg-[#1E2018] border-2 border-[#0A0B08] rounded-[12px_4px_12px_4px] p-4 shadow-[3px_3px_0px_#0A0B08]">
            <div className="flex justify-between items-center text-xs font-bold mb-2">
              <span className="text-[#A4B382] uppercase flex items-center gap-1.5">
                <Shield className="w-4 h-4 text-amber-400" />
                Fortificación de Búnker (TCP)
              </span>
              <span className="text-amber-300 font-mono">
                {currentTcp.toLocaleString()} / {maxTcp.toLocaleString()} TCP ({tcpPercent.toFixed(1)}%)
              </span>
            </div>
            <div className="w-full h-4 bg-[#0A0B08] rounded-full overflow-hidden border border-[#3E4233] p-0.5">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  tcpPercent <= 25
                    ? 'bg-red-600 animate-pulse'
                    : tcpPercent <= 50
                    ? 'bg-amber-500'
                    : 'bg-emerald-500'
                }`}
                style={{ width: `${tcpPercent}%` }}
              />
            </div>
            <div className="mt-2 text-[11px] text-[#A4B382] flex justify-between">
              <span>Búnker Nivel {bunkerLevel}: {garrisonSpec.name}</span>
              <span>Drenaje estimado: -800 a -2,500 TCP/derrota</span>
            </div>
          </div>

          {/* Comparación de Bandos */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-[#181914] border-2 border-red-900/60 p-3 rounded-[12px_4px_12px_4px]">
              <div className="text-[10px] uppercase font-bold text-red-400 tracking-wider flex items-center gap-1">
                <Crosshair className="w-3.5 h-3.5" /> Bando Atacante
              </div>
              <div className="text-sm font-bold text-[#F2E8D5] mt-1 truncate">
                Clan: {session.attackerClanId.slice(0, 8)}...
              </div>
              <div className="text-xs text-[#A4B382] mt-0.5">Comandante Ofensivo</div>
            </div>

            <div className="bg-[#181914] border-2 border-blue-900/60 p-3 rounded-[12px_4px_12px_4px]">
              <div className="text-[10px] uppercase font-bold text-blue-400 tracking-wider flex items-center gap-1">
                <Shield className="w-3.5 h-3.5" /> Bando Defensor
              </div>
              <div className="text-sm font-bold text-[#F2E8D5] mt-1 truncate">
                {session.defenderClanId ? `Clan: ${session.defenderClanId.slice(0, 8)}...` : 'Guarnición Neutral'}
              </div>
              <div className="text-xs text-[#A4B382] mt-0.5 flex items-center gap-1">
                {isPvP ? (
                  <>
                    <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-400 font-bold">Oficial Humano</span>
                  </>
                ) : (
                  <>
                    <Bot className="w-3.5 h-3.5 text-amber-400" />
                    <span>IA: {garrisonSpec.name}</span>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Botones de Acción */}
        <div className="p-4 border-t-2 border-[#0A0B08] bg-[#181914] flex flex-wrap gap-3 justify-end items-center">
          <button
            onClick={() => {
              audioManager.playSFX('button_click');
              onClose();
            }}
            className="px-4 py-2 text-xs font-bold uppercase tracking-wider text-[#A4B382] hover:text-[#F2E8D5] border-2 border-transparent hover:border-[#0A0B08] rounded transition-all"
          >
            Retirada / Cerrar
          </button>

          {isDefendingClan && !isPvP && !isHandshakeExpired && (
            <button
              onClick={() => {
                audioManager.playSFX('co_power');
                onClaimHandshake();
              }}
              className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs uppercase tracking-wider rounded-[8px_2px_8px_2px] border-2 border-[#0A0B08] shadow-[3px_3px_0px_#0A0B08] flex items-center gap-2 animate-bounce transition-all"
            >
              <UserCheck className="w-4 h-4" />
              Tomar el Mando (PvP en Vivo)
            </button>
          )}

          <button
            onClick={() => {
              audioManager.playSFX('unit_order');
              onEnterBattle();
            }}
            className="px-6 py-2.5 bg-[#46521F] hover:bg-[#586727] text-amber-300 font-bold text-xs uppercase tracking-wider rounded-[8px_2px_8px_2px] border-2 border-[#0A0B08] shadow-[3px_3px_0px_#0A0B08] flex items-center gap-2 transition-all"
          >
            <Swords className="w-4 h-4" />
            {isPvP ? 'Ingresar a Duelo PvP' : 'Iniciar Asalto Táctico'}
          </button>
        </div>
      </div>
    </div>
  );
};

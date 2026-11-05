/**
 * ==============================================================================
 * DUAL RESOURCE HEADER (C4ISR DUAL CONTROL BAR)
 * ==============================================================================
 * Conforme a @tactical-command-intel y PLAN_MAESTRO_IMPLEMENTACION_GEOTACTICS_ALICE
 * - Bloque Izquierdo: Recursos Individuales ($G, EC, tech_scrap, Rango/Nivel)
 * - Bloque Derecho: Recursos de Facción (Estandarte de Clan, Bóveda, Manpower/Stock, TCP)
 * ==============================================================================
 */

import React from 'react';
import {
  Coins,
  Zap,
  Wrench,
  Shield,
  Users,
  Trophy,
  Flame,
  Globe,
  Radio,
  Lock,
  LogIn,
} from 'lucide-react';
import { TacticalGhostBar } from './TacticalGhostBar';
import { audioManager } from '../../engine/audioManager';

export interface DualResourceHeaderProps {
  // Recursos Individuales
  userGold: number;
  userEnergyEc: number;
  maxEnergyEc?: number;
  userTechScrap: number;
  userLevel: number;
  userXp: number;
  nextLevelXp: number;
  userTrophies?: number;
  activeStreak?: number;

  // Recursos de Facción / Corporación
  clanTag?: string;
  clanName?: string;
  clanEmblem?: string;
  clanColor?: string;
  clanVaultEc?: number;
  clanSharedStockCount?: number;
  factionTcpControl?: number; // e.g. 6800 de 10000

  // Estado y Navegación
  isGuestMode?: boolean;
  onOpenAuthModal?: () => void;
  onOpenProfile?: () => void;
  onToggleDrawer?: () => void;
  isDrawerOpen?: boolean;
}

export const DualResourceHeader: React.FC<DualResourceHeaderProps> = ({
  userGold,
  userEnergyEc,
  maxEnergyEc = 1000,
  userTechScrap,
  userLevel,
  userXp,
  nextLevelXp,
  userTrophies = 0,
  activeStreak = 0,
  clanTag = 'IVS',
  clanName = 'Iron Vanguard Syndicate',
  clanEmblem = '🛡️',
  clanColor = '#3B82F6',
  clanVaultEc = 45000,
  clanSharedStockCount = 14,
  factionTcpControl = 7200,
  isGuestMode = false,
  onOpenAuthModal,
  onOpenProfile,
  onToggleDrawer,
  isDrawerOpen = false,
}) => {
  const xpPercent = Math.min(100, Math.round((userXp / Math.max(1, nextLevelXp)) * 100));

  return (
    <header className="relative z-30 px-3 py-1.5 flex items-center justify-between gap-2 max-w-full bg-[#1A1B15] border-b-2 border-[#0A0B08] shadow-[0_4px_0px_#0A0B08] shrink-0 select-none">
      {/* -------------------------------------------------------------------- */}
      {/* BLOQUE IZQUIERDO: COMANDO Y RECURSOS INDIVIDUALES                    */}
      {/* -------------------------------------------------------------------- */}
      <div className="flex items-center gap-2.5">
        {/* Insignia de Nivel y Rango */}
        <button
          type="button"
          onClick={() => {
            audioManager.play('menu_select');
            onOpenProfile?.();
          }}
          className="flex items-center gap-2 px-2.5 py-1 bg-[#2B2C24] hover:bg-[#383A2E] border border-[#7B8A4A] rounded-[8px_2px_8px_2px] shadow-[2px_2px_0px_#0A0B08] transition-transform active:scale-95 text-left cursor-pointer"
          title="Ver Expediente de Mando"
        >
          <div className="w-7 h-7 rounded-[4px_1px_4px_1px] bg-[#46521F] border border-[#7B8A4A] flex items-center justify-center font-black text-xs text-[#F2E8D5]">
            N{userLevel}
          </div>
          <div className="hidden sm:flex flex-col">
            <span className="text-[10px] font-black uppercase tracking-wider text-[#F2E8D5] leading-none">
              {userLevel >= 8 ? 'VETERANO' : userLevel >= 4 ? 'SARGENTO' : userLevel >= 2 ? 'CABO' : 'RECLUTA'}
            </span>
            <div className="w-16 mt-1">
              <TacticalGhostBar
                value={userXp}
                max={nextLevelXp}
                variant="xp"
                showNumericLabel={false}
              />
            </div>
          </div>
        </button>

        {/* Fondos Tácticos ($G) */}
        <div
          className="flex items-center gap-1.5 px-2 py-1 bg-[#22231C] border border-[#46521F] rounded-[6px_2px_6px_2px] shadow-[2px_2px_0px_#0A0B08]"
          title="Fondos Tácticos ($G) para despliegues en partida"
        >
          <Coins className="w-3.5 h-3.5 text-yellow-400 shrink-0" />
          <span className="font-mono font-black text-xs text-[#F2E8D5]">
            ${userGold.toLocaleString()}
          </span>
        </div>

        {/* Créditos Energéticos (EC) */}
        <div
          className="flex items-center gap-1.5 px-2 py-1 bg-[#22231C] border border-[#46521F] rounded-[6px_2px_6px_2px] shadow-[2px_2px_0px_#0A0B08]"
          title={`Créditos Energéticos (EC): ${userEnergyEc}/${maxEnergyEc}`}
        >
          <Zap className="w-3.5 h-3.5 text-[#00FF66] shrink-0" />
          <span className="font-mono font-black text-xs text-[#00FF66]">
            {userEnergyEc.toLocaleString()}
          </span>
          <span className="text-[9px] text-[#7B8A4A] font-bold">EC</span>
        </div>

        {/* Chatarra Balística (tech_scrap) */}
        <div
          className="hidden md:flex items-center gap-1.5 px-2 py-1 bg-[#22231C] border border-[#46521F] rounded-[6px_2px_6px_2px] shadow-[2px_2px_0px_#0A0B08]"
          title="Chatarra Balística recuperada de combates (refundible en Altos Hornos)"
        >
          <Wrench className="w-3.5 h-3.5 text-[#C46A3A] shrink-0" />
          <span className="font-mono font-black text-xs text-[#F2E8D5]">
            {userTechScrap.toLocaleString()}
          </span>
          <span className="text-[9px] text-[#C46A3A] font-bold">SCRAP</span>
        </div>

        {/* Trofeos & Racha */}
        {userTrophies > 0 && (
          <div className="hidden lg:flex items-center gap-1.5 px-2 py-1 bg-[#22231C] border border-[#46521F] rounded-[6px_2px_6px_2px]">
            <Trophy className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span className="font-mono font-black text-xs text-[#F2E8D5]">
              {userTrophies}
            </span>
            {activeStreak > 0 && (
              <span className="flex items-center gap-0.5 text-[10px] text-[#C46A3A] font-black">
                <Flame className="w-3 h-3 fill-current" />
                {activeStreak}
              </span>
            )}
          </div>
        )}
      </div>

      {/* -------------------------------------------------------------------- */}
      {/* BLOQUE DERECHO: CORPORACIÓN / FACCIÓN Y CONTROL DEL TEATRO           */}
      {/* -------------------------------------------------------------------- */}
      <div className="flex items-center gap-2">
        {isGuestMode ? (
          <button
            type="button"
            onClick={() => {
              audioManager.play('menu_confirm');
              onOpenAuthModal?.();
            }}
            className="flex items-center gap-1.5 px-3 py-1 bg-[#C46A3A] hover:bg-[#d67845] text-[#F2E8D5] font-black text-xs uppercase tracking-wider border border-[#F2E8D5] rounded-[6px_2px_6px_2px] shadow-[2px_2px_0px_#0A0B08] active:translate-y-0.5 cursor-pointer"
          >
            <LogIn className="w-3.5 h-3.5" />
            <span>Ingresar al Estado Mayor</span>
          </button>
        ) : (
          <>
            {/* Estandarte y Bóveda del Clan */}
            <div
              className="flex items-center gap-2 px-2.5 py-1 bg-[#22231C] border border-[#7B8A4A] rounded-[8px_2px_8px_2px] shadow-[2px_2px_0px_#0A0B08]"
              style={{ borderLeftColor: clanColor, borderLeftWidth: '3px' }}
              title={`Corporación Militar: [${clanTag}] ${clanName} • Bóveda Común: ${clanVaultEc.toLocaleString()} EC`}
            >
              <span className="text-sm">{clanEmblem}</span>
              <div className="flex flex-col">
                <div className="flex items-center gap-1">
                  <span className="font-black text-xs tracking-wider text-[#F2E8D5]">
                    [{clanTag}]
                  </span>
                  <span className="hidden xl:inline text-[10px] text-[#7B8A4A] font-bold">
                    {clanName}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-[9px] text-[#F2E8D5]">
                  <span className="text-[#00FF66] font-mono font-bold">
                    {clanVaultEc.toLocaleString()} EC Bóveda
                  </span>
                  <span className="text-[#7B8A4A]">•</span>
                  <span className="text-amber-400 font-mono font-bold">
                    {clanSharedStockCount} Chasis Clan
                  </span>
                </div>
              </div>
            </div>

            {/* Puntos de Control Territorial (TCP) */}
            <div
              className="hidden sm:flex flex-col gap-0.5 px-2 py-1 bg-[#1A1B15] border border-[#46521F] rounded-[6px_2px_6px_2px]"
              title={`Puntos de Control Territorial de Facción en el Teatro: ${factionTcpControl}/10000 TCP`}
            >
              <div className="flex items-center justify-between gap-2 text-[9px] font-black uppercase text-[#F2E8D5]">
                <span className="flex items-center gap-1">
                  <Globe className="w-2.5 h-2.5 text-[#00FF66]" />
                  Control TCP
                </span>
                <span className="font-mono text-[#00FF66]">{factionTcpControl}</span>
              </div>
              <div className="w-20 h-1.5 bg-[#0A0B08] rounded-[2px] overflow-hidden border border-[#46521F]">
                <div
                  className="h-full bg-gradient-to-r from-[#46521F] to-[#00FF66] transition-[width] duration-300"
                  style={{ width: `${Math.min(100, (factionTcpControl / 10000) * 100)}%` }}
                />
              </div>
            </div>

            {/* Botón Toggle del Cajón Lateral Paradox */}
            <button
              type="button"
              onClick={() => {
                audioManager.play('menu_select');
                onToggleDrawer?.();
              }}
              className={`flex items-center gap-1.5 px-2.5 py-1 font-black text-xs uppercase tracking-wider border rounded-[6px_2px_6px_2px] shadow-[2px_2px_0px_#0A0B08] transition-all cursor-pointer ${
                isDrawerOpen
                  ? 'bg-[#C46A3A] border-[#F2E8D5] text-[#F2E8D5]'
                  : 'bg-[#2B2C24] hover:bg-[#383A2E] border-[#7B8A4A] text-[#F2E8D5]'
              }`}
              title="Abrir/Cerrar Consola de Macrogestión (Estilo Paradox)"
            >
              <Radio className={`w-3.5 h-3.5 ${isDrawerOpen ? 'animate-pulse' : ''}`} />
              <span className="hidden sm:inline">CONSOLA</span>
            </button>
          </>
        )}
      </div>
    </header>
  );
};

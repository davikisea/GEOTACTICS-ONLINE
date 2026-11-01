/**
 * ==============================================================================
 * CUARTEL GENERAL Y LOBBY BÉLICO (WAR LOBBY HUB)
 * ==============================================================================
 * Dirección de Arte:
 * - Estilo de animación de vector plano con contornos negros gruesos y limpios.
 * - Paleta militar arenosa pero vibrante (#46521F, #7B8A4A, #C46A3A, #F2E8D5, #2B2C24).
 * - Sombras sólidas de alto contraste (shadow-[6px_6px_0px_#181914]).
 * - Encuadres cinemáticos inspirados en la fotografía de guerra documental y cómic bélico.
 * - Navegación inmediata a combate en 1 clic y acceso a operaciones de metajuego en 2 clics.
 */

import React from 'react';
import {
  Swords,
  Zap,
  Map as MapIcon,
  Shield,
  Factory,
  Scale,
  Palette,
  ShoppingBag,
  Flame,
  Award,
  Coins,
  Sparkles,
  Layers,
  Cpu,
  Trophy,
  Activity,
  FileText,
  Clock,
  ArrowRight,
  Crosshair,
  Volume2
} from 'lucide-react';
import { MatchFormat } from '../../engine/autonomousOrchestrator';
import { Clan } from '../../engine/clanSystem';
import { IndustrialInventory } from '../../engine/industrialEngine';
import { SafeguardInventory } from '../../engine/clanSystem';
import { RankedLadderEngine } from '../../engine/rankedLadderEngine';
import { audioManager } from '../../engine/audioManager';

interface WarLobbyHubProps {
  onDeployCombat?: (format: MatchFormat) => void;
  onStartMatch?: (format: MatchFormat) => void;
  onNavigateToView?: (view: 'shop' | 'armory' | 'industry' | 'marketplace' | 'clans' | 'docs' | 'qa') => void;
  onOpenShop?: () => void;
  onOpenArmory?: () => void;
  onOpenIndustry?: () => void;
  onOpenMarketplace?: () => void;
  onOpenClans?: () => void;
  onOpenDocs?: () => void;
  onOpenEditor?: () => void;
  onOpenProfile?: () => void;
  userGold: number;
  userGems: number;
  userSteel?: number;
  userLevel?: number;
  userXp?: number;
  nextLevelXp?: number;
  clanName?: string;
  clanTag?: string;
  clanEmblem?: string;
  clan?: Clan;
  industrialInventory?: IndustrialInventory;
  safeguardInventory?: SafeguardInventory;
  isTournamentMode: boolean;
  onToggleTournament?: () => void;
  onToggleTournamentMode?: () => void;
  activeStreakMultiplier?: number;
  winStreak?: number;
  simLevel?: number;
  userTrophies?: number;
  shieldCharges?: number;
}

export const WarLobbyHub: React.FC<WarLobbyHubProps> = ({
  onDeployCombat,
  onStartMatch,
  onNavigateToView,
  onOpenShop,
  onOpenArmory,
  onOpenIndustry,
  onOpenMarketplace,
  onOpenClans,
  onOpenDocs,
  onOpenEditor,
  onOpenProfile,
  userGold,
  userGems,
  userSteel,
  userLevel,
  userXp,
  nextLevelXp,
  clanName,
  clanTag,
  clanEmblem,
  clan,
  industrialInventory,
  safeguardInventory,
  isTournamentMode,
  onToggleTournament,
  onToggleTournamentMode,
  activeStreakMultiplier,
  winStreak,
  simLevel,
  userTrophies = 2450,
  shieldCharges = 3,
}) => {
  const currentArena = RankedLadderEngine.getArenaForTrophies(userTrophies);
  
  const handleDeploy = (format: MatchFormat) => {
    if (onDeployCombat) onDeployCombat(format);
    else if (onStartMatch) onStartMatch(format);
  };

  const handleNavigate = (view: 'shop' | 'armory' | 'industry' | 'marketplace' | 'clans' | 'docs' | 'qa') => {
    if (onNavigateToView) {
      onNavigateToView(view);
      return;
    }
    switch (view) {
      case 'shop': onOpenShop?.(); break;
      case 'armory': onOpenArmory?.(); break;
      case 'industry': onOpenIndustry?.(); break;
      case 'marketplace': onOpenMarketplace?.(); break;
      case 'clans': onOpenClans?.(); break;
      case 'docs': onOpenDocs?.(); break;
      case 'qa': break;
    }
  };

  const toggleTournament = () => {
    if (onToggleTournamentMode) onToggleTournamentMode();
    else if (onToggleTournament) onToggleTournament();
  };

  const resolvedClanName = clan?.name ?? clanName ?? 'Séptima División Mecanizada';
  const resolvedClanTag = clan?.tag ?? clanTag ?? '[VANGUARD]';
  const resolvedClanTier = clan?.tier ?? 'tier_2';
  const resolvedSteel = industrialInventory?.refinedSteel ?? userSteel ?? 25;
  const resolvedSimLevel = simLevel ?? userLevel ?? 1;
  const streak = safeguardInventory?.currentStreak ?? winStreak ?? 3;
  const streakMultiplier = activeStreakMultiplier ?? (streak >= 6 ? 2.0 : 1.25);
  const isSafeguardEquipped = safeguardInventory?.isEquipped ?? false;

  // Horas acumuladas de extracción en silos
  const lastHarvest = industrialInventory?.lastHarvestAt ?? (Date.now() - 4.5 * 3600 * 1000);
  const elapsedSiloHours = Number(
    Math.min(10, (Date.now() - lastHarvest) / (3600 * 1000)).toFixed(1)
  );

  return (
    <div className="flex-1 flex flex-col overflow-y-auto bg-[#181914] text-[#F2E8D5] font-mono p-4 lg:p-6 select-none">
      <div className="max-w-7xl mx-auto w-full space-y-6">
        
        {/* ====================================================================
            1. CABECERA CINEMÁTICA DEL ALTO MANDO (HERO BANNER)
           ==================================================================== */}
        <div className="bg-[#2B2C24] border-4 border-[#181914] rounded-[28px_8px_28px_8px] p-4 lg:p-6 shadow-[8px_8px_0px_#181914] relative overflow-hidden">
          {/* Trama de fondo militar y acento angular */}
          <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-gradient-to-l from-[#46521F]/30 to-transparent pointer-events-none hidden md:block" />
          
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 relative z-10">
            {/* Perfil del Comandante e Insignias */}
            <div 
              onClick={() => {
                if (onOpenProfile) {
                  audioManager.play('menu_select');
                  onOpenProfile();
                }
              }}
              className="flex items-center gap-4 cursor-pointer group"
              title="Haz clic para inspeccionar tu Expediente Militar e Identidad"
            >
              <div className="w-16 h-16 rounded-[16px_4px_16px_4px] bg-[#46521F] group-hover:bg-[#586827] border-2 border-[#181914] flex items-center justify-center text-3xl shadow-[4px_4px_0px_#181914] shrink-0 transition-colors">
                ⭐
              </div>
              <div>
                <div className="flex items-center gap-2.5">
                  <span className="px-2 py-0.5 rounded-[6px_2px_6px_2px] bg-[#C46A3A] text-[#F2E8D5] text-[10px] font-black uppercase tracking-wider border border-[#181914]">
                    Rango Oficial
                  </span>
                  <h1 className="text-xl md:text-2xl font-black uppercase tracking-wide text-[#F2E8D5] group-hover:text-amber-300 transition-colors">
                    Comandante en Jefe <span className="text-xs text-[#7B8A4A]">#8492</span>
                  </h1>
                </div>

                <div className="flex flex-wrap items-center gap-3 text-xs text-[#7B8A4A] mt-1 font-bold">
                  <span>Nivel de Campaña: <strong className="text-amber-400">{resolvedSimLevel}</strong></span>
                  <span>•</span>
                  <span>Frente Territorial: <strong className="text-[#F2E8D5]">Sector Alpha</strong></span>
                  <span>•</span>
                  <span className="flex items-center gap-1 text-emerald-400">
                    <Shield className="w-3.5 h-3.5" /> {resolvedClanTag} {resolvedClanName}
                  </span>
                </div>

                {/* Insignia Atompunk de Arena Clasificatoria y Escudo de Descenso */}
                <div className="flex flex-wrap items-center gap-2 mt-2 pt-2 border-t border-[#7B8A4A]/20">
                  <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-[6px_2px_6px_2px] bg-[#181914] text-amber-300 font-mono text-[11px] font-black border border-amber-500/40 shadow-[2px_2px_0px_#181914]">
                    <Trophy className="w-3.5 h-3.5 text-amber-400" />
                    <span>{userTrophies.toLocaleString()} Trofeos</span>
                  </div>
                  <span className="text-[11px] text-[#F2E8D5] font-black uppercase tracking-wider">
                    {currentArena.name}
                  </span>
                  {currentArena.tier >= 4 && currentArena.tier <= 8 && (
                    <div className="flex items-center gap-1 px-2 py-0.5 rounded-[4px_1px_4px_1px] bg-[#181914] text-cyan-300 font-mono text-[10px] border border-cyan-500/40">
                      <Shield className="w-3 h-3 text-cyan-400" />
                      <span>Escudo: {shieldCharges}/3</span>
                    </div>
                  )}
                  <span className="text-[10px] text-[#7B8A4A] font-bold">
                    (K={currentArena.kFactor} • {currentArena.lossMultiplier === 0 ? 'Pérdida 0' : currentArena.lossMultiplier === 1 ? 'Suma Cero' : `Pérdida x${currentArena.lossMultiplier}`})
                  </span>
                </div>
              </div>
            </div>

            {/* Balances de Intendencia & Conmutador de Modo */}
            <div className="flex flex-wrap items-center gap-3 bg-[#181914] p-3 rounded-[16px_4px_16px_4px] border-2 border-[#181914] shadow-[4px_4px_0px_#2B2C24]">
              {/* Oro */}
              <div
                onClick={() => handleNavigate('shop')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-[8px_2px_8px_2px] bg-[#2B2C24] border border-[#7B8A4A]/40 text-amber-400 font-black text-xs cursor-pointer hover:border-amber-400 transition-colors"
                title="Bóveda de Fondos Militares (G)"
              >
                <Coins className="w-4 h-4" />
                <span>{userGold.toLocaleString()}G</span>
              </div>

              {/* Gemas */}
              <div
                onClick={() => handleNavigate('shop')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-[8px_2px_8px_2px] bg-[#2B2C24] border border-[#7B8A4A]/40 text-purple-300 font-black text-xs cursor-pointer hover:border-purple-300 transition-colors"
                title="Gemas de Mando del Estado Mayor"
              >
                <Sparkles className="w-4 h-4 text-purple-400" />
                <span>{userGems.toLocaleString()}</span>
              </div>

              {/* Acero */}
              <div
                onClick={() => handleNavigate('industry')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-[8px_2px_8px_2px] bg-[#2B2C24] border border-[#7B8A4A]/40 text-slate-300 font-black text-xs cursor-pointer hover:border-slate-300 transition-colors"
                title="Vigas de Acero Militar en Hangar"
              >
                <Layers className="w-4 h-4 text-[#7B8A4A]" />
                <span>{resolvedSteel}</span>
              </div>

              {/* Conmutador Torneo vs Ladder */}
              <button
                onClick={toggleTournament}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-[8px_2px_8px_2px] font-black text-xs uppercase tracking-wider border-2 border-[#181914] shadow-[2px_2px_0px_#181914] transition-all cursor-pointer ${
                  isTournamentMode
                    ? 'bg-amber-400 text-slate-950 shadow-[2px_2px_0px_#F2E8D5]'
                    : 'bg-[#46521F] text-[#F2E8D5] hover:bg-[#7B8A4A]'
                }`}
                title="Conmutar entre Reglamento Esports (Cap N11) y Ladder Asimétrico (N1-N15)"
              >
                <Trophy className="w-3.5 h-3.5" />
                <span>{isTournamentMode ? 'Torneo Esports (N11)' : 'Ladder Diario (N15)'}</span>
              </button>
            </div>
          </div>

          {/* Barra de Racha Invicta y Multiplicador */}
          <div className="flex flex-wrap items-center justify-between gap-3 mt-4 pt-3 border-t border-[#7B8A4A]/30 text-xs">
            <div className="flex items-center gap-2">
              <span className="text-[#7B8A4A] font-bold uppercase">Estado de Moral Bélica:</span>
              <div className="flex items-center gap-1.5 text-amber-300 font-black">
                <Flame className={`w-4 h-4 ${streak >= 6 ? 'text-[#C46A3A] animate-bounce' : 'text-amber-400'}`} />
                <span>
                  Racha de {streak} Victorias consecutivas
                </span>
              </div>
              <span className="px-2 py-0.5 rounded bg-[#181914] text-[#C46A3A] font-black text-[11px] border border-[#C46A3A]/40">
                Multiplicador: {streakMultiplier}x {streak >= 6 ? '🔥 ¡DOBLE BOTÍN!' : ''}
              </span>
            </div>

            <div className="flex items-center gap-2 text-[11px] text-[#7B8A4A]">
              <span>Seguro de Racha:</span>
              <strong className={isSafeguardEquipped ? 'text-amber-400' : 'text-slate-400'}>
                {isSafeguardEquipped ? 'BLINDADO (1 Uso Listo)' : 'INACTIVO'}
              </strong>
            </div>
          </div>
        </div>

        {/* ====================================================================
            2. TEATROS DE OPERACIONES Y DESPLIEGUE EN COMBATE (1 CLIC)
           ==================================================================== */}
        <div>
          <div className="flex items-center justify-between mb-3 px-1">
            <div className="flex items-center gap-2">
              <Crosshair className="w-5 h-5 text-[#C46A3A]" />
              <h2 className="text-sm md:text-base font-black uppercase tracking-wider text-[#F2E8D5]">
                Despliegue Operacional Inmediato
              </h2>
            </div>
            <span className="text-[11px] text-[#7B8A4A] uppercase font-bold">
              Selecciona frente de combate (Cero esperas)
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            
            {/* TARJETA 1: DUELO TÁCTICO ESPEJO (15s) */}
            <div className="bg-[#2B2C24] border-4 border-[#181914] rounded-[24px_6px_24px_6px] p-5 shadow-[6px_6px_0px_#181914] flex flex-col justify-between relative overflow-hidden group hover:border-[#C46A3A] transition-all">
              <div className="absolute top-3 right-3">
                <span className="px-2.5 py-0.5 rounded-[6px_2px_6px_2px] bg-[#C46A3A] text-[#F2E8D5] text-[10px] font-black uppercase border border-[#181914] shadow-[2px_2px_0px_#181914]">
                  ¡FRENTE RECOMENDADO!
                </span>
              </div>

              <div>
                <div className="w-12 h-12 rounded-[12px_2px_12px_2px] bg-[#C46A3A] border-2 border-[#181914] flex items-center justify-center text-2xl shadow-[3px_3px_0px_#181914] mb-3">
                  ⚡
                </div>
                <h3 className="text-base font-black uppercase tracking-wide text-[#F2E8D5] flex items-center gap-1.5">
                  <span>Duelo Espejo (15s)</span>
                </h3>
                <p className="text-xs text-[#7B8A4A] mt-1 leading-relaxed">
                  Micro-sesiones de 3 minutos. Mapa simétrico 10x10, mazo idéntico Nivel 1 y cajas de suministros
                  aéreos (AirDrops) en los turnos 2 y 5.
                </p>

                <div className="mt-4 pt-3 border-t border-[#7B8A4A]/30 space-y-1.5 text-xs text-[#F2E8D5]/80">
                  <div className="flex justify-between">
                    <span>Tiempo por Turno:</span>
                    <strong className="text-amber-400">15 Segundos</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Financiamiento Base:</span>
                    <strong className="text-slate-300">3,000G</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Reenganche:</span>
                    <strong className="text-emerald-400">Revancha Exprés (5s)</strong>
                  </div>
                </div>
              </div>

              <button
                onClick={() => {
                  audioManager.playSFX('button_click');
                  handleDeploy('mirror_duel');
                }}
                className="mt-5 w-full py-3 rounded-[12px_3px_12px_3px] bg-[#C46A3A] hover:bg-[#C46A3A]/90 text-[#F2E8D5] font-black text-xs uppercase tracking-wider border-2 border-[#181914] shadow-[4px_4px_0px_#181914] flex items-center justify-center gap-2 cursor-pointer transition-transform active:translate-x-1 active:translate-y-1"
              >
                <Swords className="w-4 h-4" />
                <span>Entrar al Frente Espejo</span>
              </button>
            </div>

            {/* TARJETA 2: ESCARAMUZA BLITZ (30s) */}
            <div className="bg-[#2B2C24] border-4 border-[#181914] rounded-[24px_6px_24px_6px] p-5 shadow-[6px_6px_0px_#181914] flex flex-col justify-between relative overflow-hidden group hover:border-[#7B8A4A] transition-all">
              <div>
                <div className="w-12 h-12 rounded-[12px_2px_12px_2px] bg-[#46521F] border-2 border-[#181914] flex items-center justify-center text-2xl shadow-[3px_3px_0px_#181914] mb-3">
                  🚀
                </div>
                <h3 className="text-base font-black uppercase tracking-wide text-[#F2E8D5]">
                  Escaramuza Blitz (30s)
                </h3>
                <p className="text-xs text-[#7B8A4A] mt-1 leading-relaxed">
                  Acción táctica mecanizada ágil. Mapas medianos de 16x16, economía acelerada 2.0x y despliegue libre
                  con tu mazo personalizado de 10 cartas.
                </p>

                <div className="mt-4 pt-3 border-t border-[#7B8A4A]/30 space-y-1.5 text-xs text-[#F2E8D5]/80">
                  <div className="flex justify-between">
                    <span>Tiempo por Turno:</span>
                    <strong className="text-amber-400">30 Segundos</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Economía por Sede:</span>
                    <strong className="text-slate-300">2,000G / Turno</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Límite de Batalla:</span>
                    <strong className="text-slate-300">15 Turnos Máx</strong>
                  </div>
                </div>
              </div>

              <button
                onClick={() => {
                  audioManager.playSFX('button_click');
                  handleDeploy('blitz_skirmish');
                }}
                className="mt-5 w-full py-3 rounded-[12px_3px_12px_3px] bg-[#46521F] hover:bg-[#7B8A4A] text-[#F2E8D5] font-black text-xs uppercase tracking-wider border-2 border-[#181914] shadow-[4px_4px_0px_#181914] flex items-center justify-center gap-2 cursor-pointer transition-transform active:translate-x-1 active:translate-y-1"
              >
                <Zap className="w-4 h-4 text-amber-300" />
                <span>Desplegar Escaramuza</span>
              </button>
            </div>

            {/* TARJETA 3: GRAN CAMPAÑA TÁCTICA (60s) */}
            <div className="bg-[#2B2C24] border-4 border-[#181914] rounded-[24px_6px_24px_6px] p-5 shadow-[6px_6px_0px_#181914] flex flex-col justify-between relative overflow-hidden group hover:border-[#7B8A4A] transition-all">
              <div>
                <div className="w-12 h-12 rounded-[12px_2px_12px_2px] bg-[#181914] border-2 border-[#7B8A4A] flex items-center justify-center text-2xl shadow-[3px_3px_0px_#181914] mb-3">
                  🗺️
                </div>
                <h3 className="text-base font-black uppercase tracking-wide text-[#F2E8D5]">
                  Gran Campaña (60s)
                </h3>
                <p className="text-xs text-[#7B8A4A] mt-1 leading-relaxed">
                  Maniobras bélicas combinadas a gran escala. Mapas de hasta 32x32 con niebla de guerra estricta,
                  logística de combustible y silos balísticos.
                </p>

                <div className="mt-4 pt-3 border-t border-[#7B8A4A]/30 space-y-1.5 text-xs text-[#F2E8D5]/80">
                  <div className="flex justify-between">
                    <span>Tiempo por Turno:</span>
                    <strong className="text-amber-400">60 Segundos</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Niebla de Guerra:</span>
                    <strong className="text-emerald-400">Activa con TRAP</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Teatros:</span>
                    <strong className="text-slate-300">Tierra, Aire y Mar</strong>
                  </div>
                </div>
              </div>

              <button
                onClick={() => {
                  audioManager.playSFX('button_click');
                  handleDeploy('grand_campaign');
                }}
                className="mt-5 w-full py-3 rounded-[12px_3px_12px_3px] bg-[#181914] hover:bg-[#2B2C24] text-[#F2E8D5] font-black text-xs uppercase tracking-wider border-2 border-[#7B8A4A] shadow-[4px_4px_0px_#181914] flex items-center justify-center gap-2 cursor-pointer transition-transform active:translate-x-1 active:translate-y-1"
              >
                <MapIcon className="w-4 h-4 text-emerald-300" />
                <span>Planificar Campaña</span>
              </button>
            </div>

          </div>
        </div>

        {/* ====================================================================
            3. DÁRSENA DE OPERACIONES Y LOGÍSTICA (ACCESOS DE METAJUEGO)
           ==================================================================== */}
        <div>
          <div className="flex items-center justify-between mb-3 px-1">
            <div className="flex items-center gap-2">
              <Factory className="w-5 h-5 text-[#7B8A4A]" />
              <h2 className="text-sm md:text-base font-black uppercase tracking-wider text-[#F2E8D5]">
                Dársena de Operaciones y Logística Estratégica
              </h2>
            </div>
            <span className="text-[11px] text-[#7B8A4A] uppercase font-bold">
              Industria, clanes, mercado y armamento
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            
            {/* ESTACIÓN 1: COMPLEJO INDUSTRIAL (DESBLOQUEO EN NIVEL 8 - RFC SECCIÓN 2.3) */}
            <div
              onClick={() => {
                if (resolvedSimLevel < 8) return;
                audioManager.playSFX('button_click');
                handleNavigate('industry');
              }}
              className={`bg-[#2B2C24] border-2 border-[#181914] rounded-[16px_4px_16px_4px] p-3 shadow-[4px_4px_0px_#181914] transition-all flex flex-col justify-between ${
                resolvedSimLevel >= 8
                  ? 'hover:border-[#C46A3A] cursor-pointer'
                  : 'opacity-50 cursor-not-allowed border-dashed'
              }`}
            >
              <div>
                <div className="flex items-center justify-between">
                  <Factory className="w-5 h-5 text-[#C46A3A]" />
                  {resolvedSimLevel >= 8 ? (
                    <span className="text-[10px] text-amber-400 font-bold">{elapsedSiloHours}/10h</span>
                  ) : (
                    <span className="text-[9px] text-red-400 font-bold">🔒 NIVEL 8</span>
                  )}
                </div>
                <h4 className="text-xs font-black uppercase text-[#F2E8D5] mt-2">Complejo Industrial</h4>
                <p className="text-[10px] text-[#7B8A4A] mt-0.5">
                  {resolvedSimLevel >= 8 ? 'Silos y fundición de acero' : 'Requiere Rango Veterano'}
                </p>
              </div>
              <span className="text-[10px] text-amber-300 font-bold mt-2 flex items-center gap-1">
                {resolvedSimLevel >= 8 ? (
                  <>Abrir <ArrowRight className="w-3 h-3" /></>
                ) : (
                  'Bloqueado'
                )}
              </span>
            </div>

            {/* ESTACIÓN 2: MERCADO P2P (DESBLOQUEO EN NIVEL 8 - RFC SECCIÓN 2.3) */}
            <div
              onClick={() => {
                if (resolvedSimLevel < 8) return;
                audioManager.playSFX('button_click');
                handleNavigate('marketplace');
              }}
              className={`bg-[#2B2C24] border-2 border-[#181914] rounded-[16px_4px_16px_4px] p-3 shadow-[4px_4px_0px_#181914] transition-all flex flex-col justify-between ${
                resolvedSimLevel >= 8
                  ? 'hover:border-[#C46A3A] cursor-pointer'
                  : 'opacity-50 cursor-not-allowed border-dashed'
              }`}
            >
              <div>
                <div className="flex items-center justify-between">
                  <Scale className="w-5 h-5 text-amber-400" />
                  {resolvedSimLevel >= 8 ? (
                    <span className="text-[10px] text-emerald-400 font-bold">12% Tasa</span>
                  ) : (
                    <span className="text-[9px] text-red-400 font-bold">🔒 NIVEL 8</span>
                  )}
                </div>
                <h4 className="text-xs font-black uppercase text-[#F2E8D5] mt-2">Bolsa P2P</h4>
                <p className="text-[10px] text-[#7B8A4A] mt-0.5">
                  {resolvedSimLevel >= 8 ? 'Comercio de suministros' : 'Requiere Rango Veterano'}
                </p>
              </div>
              <span className="text-[10px] text-amber-300 font-bold mt-2 flex items-center gap-1">
                {resolvedSimLevel >= 8 ? (
                  <>Negociar <ArrowRight className="w-3 h-3" /></>
                ) : (
                  'Bloqueado'
                )}
              </span>
            </div>

            {/* ESTACIÓN 3: HANGAR Y ARMERÍA (DESBLOQUEO EN NIVEL 2 - RFC SECCIÓN 2.3) */}
            <div
              onClick={() => {
                if (resolvedSimLevel < 2) return;
                audioManager.playSFX('button_click');
                handleNavigate('armory');
              }}
              className={`bg-[#2B2C24] border-2 border-[#181914] rounded-[16px_4px_16px_4px] p-3 shadow-[4px_4px_0px_#181914] transition-all flex flex-col justify-between ${
                resolvedSimLevel >= 2
                  ? 'hover:border-[#7B8A4A] cursor-pointer'
                  : 'opacity-50 cursor-not-allowed border-dashed'
              }`}
            >
              <div>
                <div className="flex items-center justify-between">
                  <Palette className="w-5 h-5 text-cyan-400" />
                  {resolvedSimLevel >= 2 ? (
                    <span className="text-[10px] text-slate-300 font-bold">10 Cartas</span>
                  ) : (
                    <span className="text-[9px] text-red-400 font-bold">🔒 NIVEL 2</span>
                  )}
                </div>
                <h4 className="text-xs font-black uppercase text-[#F2E8D5] mt-2">Hangar Bélico</h4>
                <p className="text-[10px] text-[#7B8A4A] mt-0.5">
                  {resolvedSimLevel >= 2 ? 'Mazo y camuflajes' : 'Misión Bautismo de Fuego'}
                </p>
              </div>
              <span className="text-[10px] text-cyan-300 font-bold mt-2 flex items-center gap-1">
                {resolvedSimLevel >= 2 ? (
                  <>Equipar <ArrowRight className="w-3 h-3" /></>
                ) : (
                  'Bloqueado'
                )}
              </span>
            </div>

            {/* ESTACIÓN 4: CORPORACIÓN (CLANES) (DESBLOQUEO EN NIVEL 4 - RFC SECCIÓN 2.3) */}
            <div
              onClick={() => {
                if (resolvedSimLevel < 4) return;
                audioManager.playSFX('button_click');
                handleNavigate('clans');
              }}
              className={`bg-[#2B2C24] border-2 border-[#181914] rounded-[16px_4px_16px_4px] p-3 shadow-[4px_4px_0px_#181914] transition-all flex flex-col justify-between ${
                resolvedSimLevel >= 4
                  ? 'hover:border-[#7B8A4A] cursor-pointer'
                  : 'opacity-50 cursor-not-allowed border-dashed'
              }`}
            >
              <div>
                <div className="flex items-center justify-between">
                  <Shield className="w-5 h-5 text-emerald-400" />
                  {resolvedSimLevel >= 4 ? (
                    <span className="text-[10px] text-amber-400 font-bold">Bóveda {resolvedClanTier.toUpperCase()}</span>
                  ) : (
                    <span className="text-[9px] text-red-400 font-bold">🔒 NIVEL 4</span>
                  )}
                </div>
                <h4 className="text-xs font-black uppercase text-[#F2E8D5] mt-2">Corporación</h4>
                <p className="text-[10px] text-[#7B8A4A] mt-0.5">
                  {resolvedSimLevel >= 4 ? 'Guerra y salvaguarda' : 'Requiere Rango Sargento'}
                </p>
              </div>
              <span className="text-[10px] text-emerald-300 font-bold mt-2 flex items-center gap-1">
                {resolvedSimLevel >= 4 ? (
                  <>Cuartel <ArrowRight className="w-3 h-3" /></>
                ) : (
                  'Bloqueado'
                )}
              </span>
            </div>

            {/* ESTACIÓN 5: INTENDENCIA Y TIENDA (DESBLOQUEO EN NIVEL 2 - RFC SECCIÓN 2.3) */}
            <div
              onClick={() => {
                if (resolvedSimLevel < 2) return;
                audioManager.playSFX('button_click');
                handleNavigate('shop');
              }}
              className={`bg-[#2B2C24] border-2 border-[#181914] rounded-[16px_4px_16px_4px] p-3 shadow-[4px_4px_0px_#181914] transition-all flex flex-col justify-between ${
                resolvedSimLevel >= 2
                  ? 'hover:border-[#C46A3A] cursor-pointer'
                  : 'opacity-50 cursor-not-allowed border-dashed'
              }`}
            >
              <div>
                <div className="flex items-center justify-between">
                  <ShoppingBag className="w-5 h-5 text-purple-400" />
                  {resolvedSimLevel >= 2 ? (
                    <span className="text-[10px] text-purple-300 font-bold">Pass Mando</span>
                  ) : (
                    <span className="text-[9px] text-red-400 font-bold">🔒 NIVEL 2</span>
                  )}
                </div>
                <h4 className="text-xs font-black uppercase text-[#F2E8D5] mt-2">Intendencia</h4>
                <p className="text-[10px] text-[#7B8A4A] mt-0.5">
                  {resolvedSimLevel >= 2 ? 'Skins y suministros' : 'Requiere Nivel 2'}
                </p>
              </div>
              <span className="text-[10px] text-purple-300 font-bold mt-2 flex items-center gap-1">
                {resolvedSimLevel >= 2 ? (
                  <>Catálogo <ArrowRight className="w-3 h-3" /></>
                ) : (
                  'Bloqueado'
                )}
              </span>
            </div>

            {/* ESTACIÓN 6: ARCHIVOS DEL ESTADO MAYOR (DOCS) */}
            <div
              onClick={() => {
                audioManager.playSFX('button_click');
                handleNavigate('docs');
              }}
              className="bg-[#2B2C24] border-2 border-[#181914] hover:border-slate-500 rounded-[16px_4px_16px_4px] p-3 shadow-[4px_4px_0px_#181914] cursor-pointer transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between">
                  <FileText className="w-5 h-5 text-slate-300" />
                  <span className="text-[10px] text-[#7B8A4A] font-bold">Specs</span>
                </div>
                <h4 className="text-xs font-black uppercase text-[#F2E8D5] mt-2">Inteligencia</h4>
                <p className="text-[10px] text-[#7B8A4A] mt-0.5">Archivos doctrinarios</p>
              </div>
              <span className="text-[10px] text-slate-300 font-bold mt-2 flex items-center gap-1">
                Consultar <ArrowRight className="w-3 h-3" />
              </span>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
};

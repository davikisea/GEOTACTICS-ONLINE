/**
 * ==============================================================================
 * CONSOLA LATERAL DESPLEGABLE DE METAMANDO (META COMMAND CONSOLE - PROJECT ALICE)
 * ==============================================================================
 * Arquitectura de 3 Capas:
 * - CAPA 1 (ACTIVA): Metajuego Geopolítico & Macroeconomía (Victoria 3 × Stellaris × Alice)
 *   sobre el Teatro Venezuela (24 Estados Soberanos + 7 Zonas Buffer).
 * - CAPA 2 (DESHABILITADA EN MVP): Combate Táctico Advance Wars 1-100 HP.
 * - CAPA 3 (SUJETO ÚNICO + AUTO-OPTIMIZACIÓN): Bark Engine operado exclusivamente con
 *   la Mayor Stella ('stella') con telemetría adaptativa en tiempo real.
 * ==============================================================================
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ChevronLeft,
  ChevronRight,
  Shield,
  Swords,
  Crown,
  Factory,
  Radio,
  Flame,
  Zap,
  TrendingUp,
  Layers,
  AlertTriangle,
  RotateCcw,
  Cpu,
  Crosshair,
  Lock,
  Scale,
  Anchor,
  Activity,
  CheckCircle2,
  ScrollText,
} from 'lucide-react';
import { audioManager } from '@domains/game-feel';
import { GarrisonAIEngine } from '@domains/tactics';
import {
  politicalAliceEngine,
  POLITICAL_EDICTS_CATALOG,
  VENEZUELA_FACTION_REGISTRY,
  THREE_LAYER_ARCHITECTURE,
  PoliticalEdictId,
} from '@domains/world';
import { barkEngine, BarkSelfOptimizationMetrics } from '@domains/game-feel';
import {
  WorldProvince,
  TerritoryNode,
  TerritoryControlState,
  TerritoryAdjacency,
} from '@shared';
import { TerritoryEconomyTickerState } from '@domains/economy';

export type MetaToolTab = 'inspector' | 'politics' | 'garrison' | 'economy';

export interface MetaCommandConsoleProps {
  isOpen: boolean;
  onToggleOpen: () => void;
  selectedProvince: WorldProvince | null;
  provinceNodes: TerritoryNode[];
  controlState?: TerritoryControlState | null;
  adjacencies: TerritoryAdjacency[];
  userClanId?: string | null;
  userClanTag?: string;
  userEc: number;
  userSteel?: number;
  ticker?: TerritoryEconomyTickerState;
  onDeclareAttack?: (targetProvinceId: string) => Promise<{ success: boolean; message?: string; error?: string }> | void;
  onJoinActiveBattle?: (provinceId: string) => void;
  onOpenFullHangar?: () => void;
  onRebalanceGarrison?: (targetLevel: 1 | 2 | 3 | 4 | 5) => void;
  isGuestMode?: boolean;
  onOpenAuthModal?: (notice?: string) => void;
  className?: string;
}

export const MetaCommandConsole: React.FC<MetaCommandConsoleProps> = ({
  isOpen,
  onToggleOpen,
  selectedProvince,
  provinceNodes,
  controlState,
  userClanId = 'clan-ferro',
  userClanTag = '[IVS]',
  onDeclareAttack,
  onOpenFullHangar,
  onRebalanceGarrison,
  isGuestMode = false,
  onOpenAuthModal,
  className = '',
}) => {
  const [activeTab, setActiveTab] = useState<MetaToolTab>('inspector');
  const [selectedGarrisonLevel, setSelectedGarrisonLevel] = useState<1 | 2 | 3 | 4 | 5>(3);
  const [aliceState, setAliceState] = useState(() => politicalAliceEngine.getState());
  const [barkMetrics, setBarkMetrics] = useState<BarkSelfOptimizationMetrics>(() =>
    barkEngine.getSelfOptimizationMetrics()
  );
  const [statusFeedback, setStatusFeedback] = useState<{ text: string; isError: boolean } | null>(
    null
  );

  useEffect(() => {
    const unsubAlice = politicalAliceEngine.subscribe(nextState => {
      setAliceState({ ...nextState });
      setBarkMetrics(barkEngine.getSelfOptimizationMetrics());
    });
    const unsubBark = barkEngine.subscribe(() => {
      setBarkMetrics(barkEngine.getSelfOptimizationMetrics());
    });
    return () => {
      unsubAlice();
      unsubBark();
    };
  }, []);

  const effectiveClanId =
    userClanId && VENEZUELA_FACTION_REGISTRY[userClanId] ? userClanId : aliceState.playerClanId;
  const empireMetrics = politicalAliceEngine.getEmpireMetrics(effectiveClanId);
  const selectedRegionSpec = selectedProvince
    ? politicalAliceEngine.getRegionById(selectedProvince.id)
    : undefined;
  const selectedRegionSov = selectedProvince
    ? aliceState.sovereigntyMap[selectedProvince.id]
    : undefined;

  const isBufferZone = Boolean(selectedRegionSpec && !selectedRegionSpec.isPlayable);
  const tcp = selectedRegionSov?.controlPoints ?? controlState?.currentTcp ?? 10000;
  const tcpMax = selectedRegionSov?.maxControlPoints ?? controlState?.tcpThreshold ?? 10000;
  const tcpPercent = Math.round((tcp / tcpMax) * 100);

  const deJureClan = selectedRegionSov?.ownerClanId
    ? VENEZUELA_FACTION_REGISTRY[selectedRegionSov.ownerClanId]
    : null;
  const deFactoClan = selectedRegionSov?.controllerClanId
    ? VENEZUELA_FACTION_REGISTRY[selectedRegionSov.controllerClanId]
    : null;

  const isController = selectedRegionSov?.controllerClanId === effectiveClanId;
  const isDeFactoOccupation =
    selectedRegionSov?.controllerClanId !== selectedRegionSov?.ownerClanId;

  const adjacencyCheck = selectedProvince
    ? politicalAliceEngine.findOriginAdjacentRegion(selectedProvince.id, effectiveClanId)
    : { valid: false, originRegionId: null, adjacency: null };

  const bresenhamSupplyCells =
    selectedProvince && empireMetrics.controlsNationalCapital
      ? politicalAliceEngine.getBresenhamSupplyVector('REG_VE_01', selectedProvince.id)
      : [];

  const handleExecutePoliticalSiege = async () => {
    if (!selectedProvince) return;
    audioManager.playDeployHorn();
    if (onDeclareAttack) {
      const attackRes = await onDeclareAttack(selectedProvince.id);
      if (attackRes && typeof attackRes === 'object') {
        setStatusFeedback({
          text: attackRes.message || attackRes.error || 'Operación ejecutada.',
          isError: !attackRes.success,
        });
      }
      return;
    }
    const res = politicalAliceEngine.executePoliticalSiegeOperation(selectedProvince.id);
    setStatusFeedback({ text: res.message, isError: !res.success });
  };

  const handleReinforceRegion = () => {
    if (!selectedProvince) return;
    audioManager.playComboAction(5);
    const res = politicalAliceEngine.reinforceAndConsolidateRegion(selectedProvince.id);
    setStatusFeedback({ text: res.message, isError: !res.success });
    if (res.success) {
      barkEngine.triggerBark({
        commanderId: 'stella',
        triggerContext: 'region_claimed',
        unitName: selectedProvince.name,
        bondingLevel: 5,
      });
    }
  };

  const handleToggleEdict = (edictId: PoliticalEdictId, edictName: string) => {
    audioManager.playSFX('button_click');
    const res = politicalAliceEngine.togglePoliticalEdict(edictId);
    setStatusFeedback({ text: res.message, isError: !res.success });
    if (res.success && res.enacted) {
      barkEngine.triggerBark({
        commanderId: 'stella',
        triggerContext: 'edict_enacted',
        unitName: edictName,
        bondingLevel: 5,
      });
    }
  };

  const handleAdjustToll = (chokeId: 'CHK-MARACAIBO' | 'CHK-PARIA', nextVal: number) => {
    audioManager.playHoverTick();
    const res = politicalAliceEngine.setChokepointToll(chokeId, nextVal);
    setStatusFeedback({ text: res.message, isError: false });
    barkEngine.triggerBark({
      commanderId: 'stella',
      triggerContext: 'chokepoint_toll',
      unitName: chokeId,
      bondingLevel: 5,
    });
  };

  const handleAdvanceEconomyCycle = () => {
    audioManager.playComboAction(7);
    const res = politicalAliceEngine.advancePoliticalEconomyCycle();
    setStatusFeedback({ text: res.summary, isError: res.isEnergyStarved });
    if (res.isEnergyStarved || empireMetrics.upkeepBreakdown.overExtendedRegions > 0) {
      barkEngine.triggerBark({
        commanderId: 'stella',
        triggerContext: 'overexpansion_warning',
        bondingLevel: 5,
      });
    } else if (empireMetrics.controlsNationalCapital) {
      barkEngine.triggerBark({
        commanderId: 'stella',
        triggerContext: 'capital_hegemony',
        bondingLevel: 5,
      });
    }
  };

  return (
    <div className={`relative flex items-stretch z-40 select-none ${className}`}>
      {/* 1. Botón Pestaña Retráctil Diegético C4ISR (Borde Exterior) */}
      <button
        type="button"
        onClick={() => {
          audioManager.playSFX('button_click');
          onToggleOpen();
        }}
        onMouseEnter={() => audioManager.playHoverTick()}
        className="self-center -ml-3 px-1.5 py-4 bg-[#2B2C24] hover:bg-[#E65100] hover:text-black text-[#F2E8D5] border-2 border-[#0A0B08] rounded-l-[10px] shadow-[-4px_4px_0px_#0A0B08] transition-all cursor-pointer flex flex-col items-center gap-1.5 z-50 group"
        title={isOpen ? 'Replegar Consola de Metamando' : 'Desplegar Consola de Metamando'}
      >
        {isOpen ? (
          <ChevronRight className="w-4 h-4 text-amber-400 group-hover:text-black transition-transform group-hover:translate-x-0.5" />
        ) : (
          <ChevronLeft className="w-4 h-4 text-amber-400 group-hover:text-black transition-transform group-hover:-translate-x-0.5" />
        )}
        <span className="[writing-mode:vertical-rl] text-[9px] font-mono font-black tracking-widest uppercase">
          {isOpen ? 'OCULTAR' : 'METAMANDO'}
        </span>
      </button>

      {/* 2. Cuerpo del Panel Lateral Desplegable con Física de Resorte */}
      <AnimatePresence>
        {isOpen && (
          <motion.aside
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 410, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.28, ease: [0.34, 1.56, 0.64, 1] }}
            className="h-full bg-[#161712]/95 border-l-2 border-y-2 border-[#0A0B08] shadow-[-8px_0px_25px_rgba(0,0,0,0.8)] backdrop-blur-md flex flex-col overflow-hidden ben-day-dark rounded-l-[14px_4px_14px_4px]"
          >
            {/* Cabecera de la Consola C4ISR + Estado de las 3 Capas */}
            <div className="p-3 bg-[#2B2C24] border-b-2 border-[#0A0B08] flex flex-col gap-1.5 shrink-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 truncate">
                  <div className="w-7 h-7 rounded-[6px_2px_6px_2px] bg-[#161712] border border-amber-400/60 flex items-center justify-center text-amber-400 shrink-0">
                    <Crosshair className="w-4 h-4" />
                  </div>
                  <div className="truncate">
                    <h2 className="text-xs font-display font-black text-[#F2E8D5] uppercase tracking-wider truncate">
                      METAMANDO POLÍTICO • PROJECT ALICE
                    </h2>
                    <p className="text-[10px] font-mono text-emerald-400 font-bold">
                      TEATRO VENEZUELA (24 ESTADOS + 7 BUFFERS)
                    </p>
                  </div>
                </div>
                <span className="px-1.5 py-0.5 rounded bg-black/60 border border-amber-500/30 text-[9px] font-mono text-amber-300 shrink-0">
                  {userClanTag}
                </span>
              </div>

              {/* Píldoras de Estado de las 3 Capas */}
              <div className="grid grid-cols-3 gap-1 text-[8px] font-mono font-bold pt-0.5">
                <div className="px-1.5 py-0.5 rounded bg-emerald-950/80 border border-emerald-500/50 text-emerald-300 truncate text-center">
                  L1: POLÍTICA ON
                </div>
                <div className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-700 text-slate-400 truncate text-center" title={THREE_LAYER_ARCHITECTURE.layer2TacticalCombat.disabledReason}>
                  L2: BATALLA OFF
                </div>
                <div className="px-1.5 py-0.5 rounded bg-amber-950/80 border border-amber-500/50 text-amber-300 truncate text-center">
                  L3: STELLA ({barkMetrics.adaptiveScorePercent}%)
                </div>
              </div>
            </div>

            {/* Resumen Rápido de Tesorería Macroeconómica */}
            <div className="grid grid-cols-4 bg-[#181914] border-b border-[#0A0B08] px-2.5 py-1.5 text-[10px] font-mono shrink-0 gap-1">
              <div>
                <span className="text-[#A2A790] block text-[8px]">ENERGÍA</span>
                <span className="text-amber-300 font-black">{aliceState.energyCells} EC</span>
              </div>
              <div>
                <span className="text-[#A2A790] block text-[8px]">ACERO RGO</span>
                <span className="text-sky-300 font-black">{aliceState.industrialSteel} t</span>
              </div>
              <div>
                <span className="text-[#A2A790] block text-[8px]">INFLUENCIA</span>
                <span className="text-purple-300 font-black">{aliceState.politicalInfluence} IP</span>
              </div>
              <div>
                <span className="text-[#A2A790] block text-[8px]">IMPERIO</span>
                <span
                  className={`font-black ${
                    empireMetrics.controlledRegions.length >
                    THREE_LAYER_ARCHITECTURE.layer1PoliticalMetagame.imperialCapRegions
                      ? 'text-red-400'
                      : 'text-emerald-400'
                  }`}
                >
                  {empireMetrics.controlledRegions.length}/{THREE_LAYER_ARCHITECTURE.layer1PoliticalMetagame.imperialCapRegions} REG
                </span>
              </div>
            </div>

            {/* Barra de 4 Pestañas de Herramientas Especializadas */}
            <div className="grid grid-cols-4 bg-[#1F201A] border-b-2 border-[#0A0B08] shrink-0 p-1 gap-1 text-[10px] font-mono font-bold">
              <button
                type="button"
                onClick={() => {
                  audioManager.playHoverTick();
                  setActiveTab('inspector');
                }}
                className={`py-1.5 px-1 rounded flex flex-col items-center gap-0.5 transition-colors cursor-pointer ${
                  activeTab === 'inspector'
                    ? 'bg-[#E65100] text-black font-black shadow-[2px_2px_0px_#0A0B08]'
                    : 'text-[#A2A790] hover:text-[#F2E8D5] hover:bg-[#2B2C24]'
                }`}
              >
                <Shield className="w-3.5 h-3.5" />
                <span>SOBERANÍA</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  audioManager.playHoverTick();
                  setActiveTab('politics');
                }}
                className={`py-1.5 px-1 rounded flex flex-col items-center gap-0.5 transition-colors cursor-pointer ${
                  activeTab === 'politics'
                    ? 'bg-[#E65100] text-black font-black shadow-[2px_2px_0px_#0A0B08]'
                    : 'text-[#A2A790] hover:text-[#F2E8D5] hover:bg-[#2B2C24]'
                }`}
              >
                <Scale className="w-3.5 h-3.5" />
                <span>EDICTOS</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  audioManager.playHoverTick();
                  setActiveTab('garrison');
                }}
                className={`py-1.5 px-1 rounded flex flex-col items-center gap-0.5 transition-colors cursor-pointer ${
                  activeTab === 'garrison'
                    ? 'bg-[#E65100] text-black font-black shadow-[2px_2px_0px_#0A0B08]'
                    : 'text-[#A2A790] hover:text-[#F2E8D5] hover:bg-[#2B2C24]'
                }`}
              >
                <Cpu className="w-3.5 h-3.5" />
                <span>BÚNKER</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  audioManager.playHoverTick();
                  setActiveTab('economy');
                }}
                className={`py-1.5 px-1 rounded flex flex-col items-center gap-0.5 transition-colors cursor-pointer ${
                  activeTab === 'economy'
                    ? 'bg-[#E65100] text-black font-black shadow-[2px_2px_0px_#0A0B08]'
                    : 'text-[#A2A790] hover:text-[#F2E8D5] hover:bg-[#2B2C24]'
                }`}
              >
                <TrendingUp className="w-3.5 h-3.5" />
                <span>ECONOMÍA</span>
              </button>
            </div>

            {/* Banner de Feedback de Operaciones Políticas */}
            {statusFeedback && (
              <div
                className={`mx-3 mt-2 p-2 rounded border text-[10px] font-mono flex items-center justify-between gap-2 ${
                  statusFeedback.isError
                    ? 'bg-red-950/80 border-red-500/60 text-red-200'
                    : 'bg-emerald-950/80 border-emerald-500/60 text-emerald-200'
                }`}
              >
                <span className="leading-tight">{statusFeedback.text}</span>
                <button
                  type="button"
                  onClick={() => setStatusFeedback(null)}
                  className="text-xs font-black hover:text-white cursor-pointer"
                >
                  ×
                </button>
              </div>
            )}

            {/* Contenedor con Scroll de la Herramienta Activa */}
            <div className="flex-1 overflow-y-auto p-3 space-y-3 text-[#F2E8D5] custom-scrollbar">
              {/* ============================================================= */}
              {/* PESTAÑA 1: INSPECTOR DE SOBERANÍA DUAL (DE JURE / DE FACTO)   */}
              {/* ============================================================= */}
              {activeTab === 'inspector' && (
                <div className="space-y-3 animate-fade-in">
                  {selectedProvince ? (
                    <>
                      {/* Ficha Geopolítica de la Región */}
                      <div className="p-3 bg-[#2B2C24] border-2 border-[#0A0B08] rounded-[10px_2px_10px_2px] shadow-[3px_3px_0px_#0A0B08] space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            {selectedProvince.isCapital ? (
                              <Crown className="w-4 h-4 text-yellow-400" />
                            ) : (
                              <Shield className="w-4 h-4 text-[#7B8A4A]" />
                            )}
                            <h3 className="font-display font-black text-sm uppercase tracking-wide">
                              {selectedProvince.name}
                            </h3>
                          </div>
                          <span className="text-[10px] font-mono bg-black/60 px-1.5 py-0.5 rounded text-amber-400">
                            {selectedProvince.id}
                          </span>
                        </div>

                        {isBufferZone && (
                          <div className="p-2 bg-red-950/60 border border-red-500/60 rounded text-[10px] font-mono text-red-200 flex items-center gap-1.5">
                            <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                            <span>
                              <strong>ZONA BUFFER INTERNACIONAL:</strong> SECTOR FUERA DEL TEATRO OPERACIONAL DE FASE 1 (ACTIVO: REPÚBLICA DE VENEZUELA).
                            </span>
                          </div>
                        )}

                        {selectedProvince.isCapital && (
                          <div className="flex items-center gap-1.5 p-1.5 bg-yellow-950/40 border border-yellow-500/50 rounded text-yellow-300 text-[10px] font-mono">
                            <Flame className="w-3.5 h-3.5 text-yellow-400 shrink-0" />
                            <span>
                              <strong>BONO HEGEMÓNICO NACIONAL (CARACAS):</strong> +15% Energía RGO, +10% Forja, -20% Aranceles P2P (Umbral 15,000 TCP).
                            </span>
                          </div>
                        )}

                        {/* Soberanía Dual: De Jure vs De Facto */}
                        <div className="grid grid-cols-2 gap-2 p-2 bg-[#161712] rounded border border-[#0A0B08] text-[10px] font-mono">
                          <div>
                            <span className="text-[#A2A790] block text-[9px]">PROPIETARIO DE JURE:</span>
                            <span className="font-bold text-amber-300">
                              {deJureClan ? `${deJureClan.emblem} ${deJureClan.name}` : isBufferZone ? 'Frontera Exterior' : 'Estado Neutral'}
                            </span>
                          </div>
                          <div>
                            <span className="text-[#A2A790] block text-[9px]">CONTROLADOR DE FACTO:</span>
                            <span className="font-bold text-emerald-400">
                              {deFactoClan ? `${deFactoClan.emblem} ${deFactoClan.name}` : isBufferZone ? 'Bloqueado (Fase 1)' : 'Estado Neutral'}
                            </span>
                          </div>
                        </div>

                        {isDeFactoOccupation && !isBufferZone && (
                          <div className="p-1.5 bg-amber-950/50 border border-amber-500/50 rounded text-[10px] font-mono text-amber-200">
                            ⏳ <strong>OCUPACIÓN MILITAR DE FACTO:</strong> Ventana de consolidación soberana activa (24h). Refuerza el sector para reclamar la propiedad De Jure.
                          </div>
                        )}

                        {/* RGO & Logística */}
                        <div className="grid grid-cols-2 gap-2 text-[10px] font-mono pt-1">
                          <div>
                            <span className="text-[#A2A790]">RGO Primario: </span>
                            <span className="text-amber-300 font-bold uppercase">
                              {selectedRegionSpec?.primaryCommodity.replace(/_/g, ' ') || 'Industrial'} (T{selectedRegionSpec?.resourceTier || 3})
                            </span>
                          </div>
                          <div>
                            <span className="text-[#A2A790]">Rendimiento Base: </span>
                            <span className="text-emerald-400 font-bold">
                              +{selectedRegionSpec?.baseHourlyYield || 400} EC/h
                            </span>
                          </div>
                          <div>
                            <span className="text-[#A2A790]">Upkeep Regional: </span>
                            <span className="text-red-400 font-bold">
                              -{selectedRegionSpec?.baseEnergyUpkeepEc || 150} EC/h
                            </span>
                          </div>
                          <div>
                            <span className="text-[#A2A790]">Línea Suministro: </span>
                            <span className="text-cyan-300 font-bold">
                              {bresenhamSupplyCells.length > 0 ? `${bresenhamSupplyCells.length} celdas BFS` : 'Directa'}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Barra de Puntos de Control Territorial (TCP) */}
                      <div className="p-3 bg-[#2B2C24] border-2 border-[#0A0B08] rounded-[10px_2px_10px_2px] shadow-[3px_3px_0px_#0A0B08] space-y-2">
                        <div className="flex items-center justify-between text-[11px] font-mono">
                          <span className="text-[#A2A790]">Puntos de Control Territorial (TCP):</span>
                          <span className="font-bold text-amber-300">
                            {tcp.toLocaleString()} / {tcpMax.toLocaleString()}
                          </span>
                        </div>
                        <div className="w-full h-2.5 bg-black/60 rounded-full overflow-hidden border border-black/40">
                          <div
                            className={`h-full transition-all duration-300 ${
                              tcpPercent < 50 ? 'bg-red-500' : tcpPercent < 80 ? 'bg-amber-500' : 'bg-emerald-500'
                            }`}
                            style={{ width: `${tcpPercent}%` }}
                          />
                        </div>
                        <div className="flex items-center justify-between text-[10px] font-mono">
                          <span className="text-[#A2A790]">Estado Topológico:</span>
                          <span className="text-amber-300 font-bold uppercase">
                            {selectedRegionSov?.status || 'STABLE'} • Búnker Nv.{selectedRegionSov?.bunkerLevel ?? 1}
                          </span>
                        </div>
                      </div>

                      {/* Acciones Geopolíticas Directas en el Mapa (Capa 1 - Sin Batalla Táctica) */}
                      <div className="space-y-2 pt-1">
                        {!isController ? (
                          <div className="space-y-1.5">
                            <button
                              type="button"
                              onClick={handleExecutePoliticalSiege}
                              className={`w-full py-2.5 px-3 font-display font-black text-xs uppercase rounded-[8px_2px_8px_2px] border-2 border-[#0A0B08] shadow-[4px_4px_0px_#0A0B08] cursor-pointer flex items-center justify-center gap-2 transition-transform active:translate-y-0.5 ${
                                isBufferZone
                                  ? 'bg-slate-800 text-red-300 border-red-500/50'
                                  : adjacencyCheck.valid
                                  ? 'bg-[#E65100] hover:bg-amber-400 text-black'
                                  : 'bg-[#2B2C24] text-amber-300 hover:bg-[#3A3B30]'
                              }`}
                            >
                              <Swords className="w-4 h-4" />
                              <span>
                                {isBufferZone
                                  ? 'ZONA BUFFER BLOQUEADA (FASE 1)'
                                  : 'EJECUTAR PRESIÓN DE ASEDIO (-TCP)'}
                              </span>
                            </button>
                            <div className="text-[9px] font-mono text-[#A2A790] text-center">
                              {adjacencyCheck.valid
                                ? `✓ Vector de ataque adyacente habilitado desde ${adjacencyCheck.originRegionId} (Coste: 180 EC / 20t Acero)`
                                : adjacencyCheck.reason}
                            </div>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={handleReinforceRegion}
                            className="w-full py-2.5 px-3 bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-display font-black text-xs uppercase rounded-[8px_2px_8px_2px] border-2 border-[#0A0B08] shadow-[4px_4px_0px_#0A0B08] cursor-pointer flex items-center justify-center gap-2"
                          >
                            <CheckCircle2 className="w-4 h-4" />
                            <span>
                              {isDeFactoOccupation
                                ? 'CONSOLIDAR SOBERANÍA DE JURE (+2,500 TCP)'
                                : 'REFORZAR SECTOR & BÚNKER (+2,500 TCP)'}
                            </span>
                          </button>
                        )}
                      </div>

                      {/* Bitácora en Vivo de Eventos Geopolíticos (Project Alice) */}
                      <div className="space-y-1.5 pt-1">
                        <div className="text-[10px] font-mono font-bold text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
                          <ScrollText className="w-3.5 h-3.5" />
                          <span>Bitácora Geopolítica del Teatro</span>
                        </div>
                        <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                          {aliceState.operationLogs.slice(0, 5).map(log => (
                            <div
                              key={log.id}
                              className="p-2 bg-[#1F201A] border border-[#0A0B08] rounded text-[10px] font-mono space-y-0.5"
                            >
                              <div className="flex items-center justify-between text-amber-300 font-bold">
                                <span className="truncate">{log.headline}</span>
                                <span className="text-[8px] text-[#A2A790] shrink-0">{log.timestamp}</span>
                              </div>
                              <p className="text-[9px] text-[#D8D1C5] leading-snug">{log.detail}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="p-6 text-center text-xs font-mono text-[#A2A790] space-y-2">
                      <Shield className="w-8 h-8 text-[#46521F] mx-auto" />
                      <p>Haz clic sobre cualquier región de Venezuela para inspeccionar su soberanía.</p>
                    </div>
                  )}
                </div>
              )}

              {/* ============================================================= */}
              {/* PESTAÑA 2: EDICTOS POLÍTICOS, PEAJES & BARK ENGINE TELEMETRY  */}
              {/* ============================================================= */}
              {activeTab === 'politics' && (
                <div className="space-y-3 animate-fade-in">
                  {/* Gobernanza de Estrechos Marítimos (CHK-MARACAIBO & CHK-PARIA) */}
                  <div className="p-3 bg-[#2B2C24] border-2 border-[#0A0B08] rounded-[10px_2px_10px_2px] shadow-[3px_3px_0px_#0A0B08] space-y-2.5">
                    <h3 className="text-xs font-display font-black uppercase text-cyan-300 flex items-center gap-1.5">
                      <Anchor className="w-4 h-4" />
                      <span>Aduanas de Estrechos Estratégicos (0% - 10%)</span>
                    </h3>

                    {/* Estrecho de Maracaibo */}
                    <div className="p-2 bg-[#161712] rounded border border-[#0A0B08] space-y-1 text-[10px] font-mono">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-[#F2E8D5]">CHK-MARACAIBO (Zulia REG_VE_02)</span>
                        <span className="text-amber-300 font-black">
                          {aliceState.chokepointTolls['CHK-MARACAIBO'].toFixed(1)}%
                        </span>
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={10}
                        step={0.5}
                        value={aliceState.chokepointTolls['CHK-MARACAIBO']}
                        onChange={e =>
                          handleAdjustToll('CHK-MARACAIBO', parseFloat(e.target.value))
                        }
                        className="w-full accent-amber-400 cursor-pointer"
                      />
                      <div className="text-[9px] text-[#A2A790]">
                        {empireMetrics.controlsMaracaiboChoke
                          ? '✓ Bajo control de tu Corporación (Recaudando peajes)'
                          : '⚠️ Controlado por facción rival (Captura REG_VE_02 Zulia para recaudar)'}
                      </div>
                    </div>

                    {/* Estrecho Bocas del Dragón / Paria */}
                    <div className="p-2 bg-[#161712] rounded border border-[#0A0B08] space-y-1 text-[10px] font-mono">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-[#F2E8D5]">CHK-PARIA (Sucre REG_VE_13)</span>
                        <span className="text-amber-300 font-black">
                          {aliceState.chokepointTolls['CHK-PARIA'].toFixed(1)}%
                        </span>
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={10}
                        step={0.5}
                        value={aliceState.chokepointTolls['CHK-PARIA']}
                        onChange={e =>
                          handleAdjustToll('CHK-PARIA', parseFloat(e.target.value))
                        }
                        className="w-full accent-amber-400 cursor-pointer"
                      />
                      <div className="text-[9px] text-[#A2A790]">
                        {empireMetrics.controlsPariaChoke
                          ? '✓ Bajo control de tu Corporación (Recaudando peajes)'
                          : '⚠️ Controlado por facción rival (Captura REG_VE_13 Sucre para recaudar)'}
                      </div>
                    </div>
                  </div>

                  {/* Catálogo de Edictos Políticos (Victoria 3 × Stellaris) */}
                  <div className="space-y-2">
                    <span className="text-[10px] font-mono font-bold text-amber-300 uppercase block">
                      Edictos de Estado Mayor (Victoria 3 / Stellaris):
                    </span>
                    {POLITICAL_EDICTS_CATALOG.map(edict => {
                      const isActive = aliceState.activeEdictIds.includes(edict.id);
                      return (
                        <div
                          key={edict.id}
                          className={`p-2.5 rounded-[8px_2px_8px_2px] border-2 font-mono text-[10px] space-y-1.5 transition-all ${
                            isActive
                              ? 'bg-[#2B2C24] border-amber-400 shadow-[2px_2px_0px_#0A0B08]'
                              : 'bg-[#1F201A] border-[#0A0B08]'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-bold text-[#F2E8D5]">{edict.name}</span>
                            <span
                              className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase ${
                                isActive
                                  ? 'bg-emerald-500 text-black'
                                  : 'bg-black/60 text-amber-300'
                              }`}
                            >
                              {isActive ? 'ACTIVO' : `${edict.costEc} EC`}
                            </span>
                          </div>
                          <p className="text-[9px] text-[#A2A790] font-sans leading-snug">
                            {edict.description}
                          </p>
                          <div className="flex items-center justify-between pt-1">
                            <span className="text-[9px] text-amber-400">
                              Upkeep: -{edict.upkeepEcPerCycle} EC/ciclo
                            </span>
                            <button
                              type="button"
                              onClick={() => handleToggleEdict(edict.id, edict.name)}
                              className={`px-2.5 py-1 rounded text-[9px] font-black uppercase border border-[#0A0B08] cursor-pointer ${
                                isActive
                                  ? 'bg-red-900/80 hover:bg-red-700 text-white'
                                  : 'bg-[#E65100] hover:bg-amber-400 text-black'
                              }`}
                            >
                              {isActive ? 'Derogar' : 'Promulgar'}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Telemetría de Auto-Optimización del Bark Engine (Capa 3: Sujeto Mayor Stella) */}
                  <div className="p-3 bg-[#1F201A] border-2 border-amber-500/40 rounded-[10px_2px_10px_2px] space-y-1.5 text-[10px] font-mono">
                    <div className="flex items-center justify-between text-amber-300 font-black">
                      <span className="flex items-center gap-1">
                        <Activity className="w-3.5 h-3.5" />
                        <span>CAPA 3: AUTO-OPTIMIZACIÓN BARK</span>
                      </span>
                      <span>{barkMetrics.adaptiveScorePercent}% EFIC.</span>
                    </div>
                    <div className="text-[9px] text-[#A2A790]">
                      Sujeto de Prueba Único: <strong className="text-[#F2E8D5]">Mayor Stella (stella)</strong>
                    </div>
                    <div className="grid grid-cols-3 gap-1 pt-1 text-center">
                      <div className="bg-black/50 p-1 rounded">
                        <span className="block text-[8px] text-[#A2A790]">EMITIDOS</span>
                        <span className="text-emerald-400 font-bold">{barkMetrics.totalBarksEmitted}</span>
                      </div>
                      <div className="bg-black/50 p-1 rounded">
                        <span className="block text-[8px] text-[#A2A790]">FILTRADOS</span>
                        <span className="text-cyan-400 font-bold">{barkMetrics.repetitionSuppressionsCount}</span>
                      </div>
                      <div className="bg-black/50 p-1 rounded">
                        <span className="block text-[8px] text-[#A2A790]">POKES</span>
                        <span className="text-amber-400 font-bold">{barkMetrics.userPokeCount}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ============================================================= */}
              {/* PESTAÑA 3: MANDO DE GUARNICIONES IA & HANGAR ESTRATÉGICO      */}
              {/* ============================================================= */}
              {activeTab === 'garrison' && (
                <div className="space-y-3 animate-fade-in">
                  <div className="p-3 bg-[#2B2C24] border-2 border-[#0A0B08] rounded-[10px_2px_10px_2px] shadow-[3px_3px_0px_#0A0B08] space-y-2">
                    <h3 className="text-xs font-display font-black uppercase text-amber-400 flex items-center gap-1.5">
                      <Cpu className="w-4 h-4" />
                      <span>Búnker de Defensa Autónoma 24/7</span>
                    </h3>
                    <p className="text-[11px] text-[#A2A790] font-sans">
                      Eleva el nivel de búnker y doctrina cognitiva de tus provincias para mitigar la erosión de TCP enemiga.
                    </p>
                  </div>

                  {/* Selector de Nivel 1 a 5 */}
                  <div className="space-y-2">
                    <span className="text-[10px] font-mono font-bold text-[#A2A790] uppercase">
                      Seleccionar Nivel de Búnker Regional:
                    </span>
                    <div className="grid grid-cols-5 gap-1.5">
                      {([1, 2, 3, 4, 5] as const).map(lvl => {
                        const spec = GarrisonAIEngine.getSpec(lvl);
                        const isSelected = selectedGarrisonLevel === lvl;
                        return (
                          <button
                            key={lvl}
                            type="button"
                            onClick={() => {
                              audioManager.playHoverTick();
                              setSelectedGarrisonLevel(lvl);
                            }}
                            className={`py-2 px-1 rounded-[6px_2px_6px_2px] border-2 font-mono font-black text-xs flex flex-col items-center gap-0.5 cursor-pointer transition-all ${
                              isSelected
                                ? 'bg-amber-400 text-black border-[#0A0B08] shadow-[2px_2px_0px_#0A0B08]'
                                : 'bg-[#2B2C24] text-[#F2E8D5] border-[#0A0B08] hover:border-amber-400'
                            }`}
                          >
                            <span>Nv.{lvl}</span>
                            <span className="text-[8px] font-sans opacity-80 truncate max-w-full">
                              {spec.aiEngineTier}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {(() => {
                    const spec = GarrisonAIEngine.getSpec(selectedGarrisonLevel);
                    return (
                      <div className="p-3 bg-[#1F201A] border-2 border-[#0A0B08] rounded-[10px_2px_10px_2px] space-y-2 text-[11px] font-mono">
                        <div className="flex justify-between items-center border-b border-[#0A0B08] pb-1.5">
                          <span className="font-bold text-amber-300">{spec.name}</span>
                          <span className="text-[10px] bg-black/60 px-2 py-0.5 rounded text-emerald-400">
                            {spec.difficultyMultiplier}x Blindaje
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-[#A2A790]">Motor Heurístico:</span>
                          <span className="text-right truncate max-w-[180px]">{spec.searchEngine}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-[#A2A790]">Capacidad Supply Pool:</span>
                          <span className="font-bold">{spec.baseSupplyPoolChassis} Chasis</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-[#A2A790]">Mantenimiento Horario:</span>
                          <span className="text-amber-400 font-bold">{spec.baseHourlyUpkeepEc} EC/h</span>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            audioManager.playAirdropImpact();
                            onRebalanceGarrison?.(selectedGarrisonLevel);
                            handleReinforceRegion();
                          }}
                          className="w-full mt-2 py-2 bg-[#E65100] hover:bg-amber-400 text-black font-display font-black text-xs uppercase rounded-[6px_2px_6px_2px] border border-[#0A0B08] shadow-[3px_3px_0px_#0A0B08] cursor-pointer flex items-center justify-center gap-1.5"
                        >
                          <span>FORTIFICAR GUARNICIÓN DEL SECTOR</span>
                        </button>
                      </div>
                    );
                  })()}

                  <button
                    type="button"
                    onClick={() => {
                      audioManager.playSFX('button_click');
                      onOpenFullHangar?.();
                    }}
                    className="w-full py-2.5 bg-[#46521F] hover:bg-[#7B8A4A] text-[#F2E8D5] font-display font-black text-xs uppercase rounded-[8px_2px_8px_2px] border-2 border-[#0A0B08] shadow-[3px_3px_0px_#0A0B08] cursor-pointer flex items-center justify-center gap-2"
                  >
                    <Layers className="w-4 h-4 text-amber-400" />
                    <span>ABRIR HANGAR INDUSTRIAL T1-T5</span>
                  </button>
                </div>
              )}

              {/* ============================================================= */}
              {/* PESTAÑA 4: MOTOR MACROECONÓMICO & ANTI-SNOWBALLING (EXP 1.8)  */}
              {/* ============================================================= */}
              {activeTab === 'economy' && (
                <div className="space-y-3 animate-fade-in">
                  <div className="p-3 bg-[#2B2C24] border-2 border-[#0A0B08] rounded-[10px_2px_10px_2px] shadow-[3px_3px_0px_#0A0B08] space-y-2">
                    <h3 className="text-xs font-display font-black uppercase text-emerald-400 flex items-center gap-1.5">
                      <TrendingUp className="w-4 h-4" />
                      <span>Balance Imperial & Curva Anti-Snowballing (1.8)</span>
                    </h3>
                    <p className="text-[11px] text-[#A2A790] font-sans">
                      Límite administrativo en Teatro Venezuela: <strong>6 Regiones</strong>. Cada región adicional eleva el mantenimiento exponencialmente ($N^{1.8}$).
                    </p>
                  </div>

                  <div className="p-3 bg-[#1F201A] border-2 border-[#0A0B08] rounded space-y-2 text-[11px] font-mono">
                    <div className="flex justify-between">
                      <span className="text-[#A2A790]">Regiones Controladas:</span>
                      <span className="text-[#F2E8D5] font-bold">
                        {empireMetrics.controlledRegions.length} / {empireMetrics.upkeepBreakdown.imperialCap} (Exceso: {empireMetrics.upkeepBreakdown.overExtendedRegions})
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#A2A790]">Extracción RGO Bruta:</span>
                      <span className="text-emerald-400 font-bold">
                        +{empireMetrics.hourlyEcGrossYield} EC / ciclo
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#A2A790]">Recaudación Estrechos:</span>
                      <span className="text-cyan-300 font-bold">
                        +{empireMetrics.hourlyTollRevenueEc} EC / ciclo
                      </span>
                    </div>
                    <div className="flex justify-between border-t border-[#0A0B08] pt-1">
                      <span className="text-[#A2A790]">Upkeep Base Territorial:</span>
                      <span className="text-amber-300 font-bold">
                        -{empireMetrics.upkeepBreakdown.baseUpkeepEc} EC
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#A2A790]">Recargo Sobre-Expansión (1.8):</span>
                      <span className="text-red-400 font-bold">
                        -{empireMetrics.upkeepBreakdown.overExpansionSurchargeEc} EC
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#A2A790]">Coste de Edictos Activos:</span>
                      <span className="text-red-300 font-bold">
                        -{empireMetrics.edictUpkeepEc} EC
                      </span>
                    </div>
                    <div className="flex justify-between border-t border-[#0A0B08] pt-1.5 text-xs">
                      <span className="font-bold text-[#F2E8D5]">BALANCE NETO POR CICLO:</span>
                      <span
                        className={`font-black ${
                          empireMetrics.netEcPerCycle >= 0 ? 'text-emerald-400' : 'text-red-400'
                        }`}
                      >
                        {empireMetrics.netEcPerCycle >= 0 ? '+' : ''}
                        {empireMetrics.netEcPerCycle} EC
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#A2A790]">Bono Hegemónico Caracas:</span>
                      <span className="text-yellow-400 font-bold">
                        {empireMetrics.controlsNationalCapital ? 'ACTIVO (+15% EC)' : 'INACTIVO'}
                      </span>
                    </div>
                  </div>

                  {/* Botón de Ejecución de Ciclo Macroeconómico */}
                  <button
                    type="button"
                    onClick={handleAdvanceEconomyCycle}
                    className="w-full py-2.5 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 text-white font-display font-black text-xs uppercase rounded-[8px_2px_8px_2px] border-2 border-[#0A0B08] shadow-[3px_3px_0px_#0A0B08] cursor-pointer flex items-center justify-center gap-2 transition-transform active:translate-y-0.5"
                  >
                    <Zap className="w-4 h-4 text-amber-300" />
                    <span>EJECUTAR CICLO MACROECONÓMICO (#{aliceState.cycleCount + 1})</span>
                  </button>

                  {/* Botón de Reinicio de Teatro de Pruebas */}
                  <button
                    type="button"
                    onClick={() => {
                      audioManager.playCancelRollback();
                      politicalAliceEngine.resetTheaterState();
                      setStatusFeedback({
                        text: 'Teatro Venezuela reiniciado a su configuración geopolítica inicial.',
                        isError: false,
                      });
                    }}
                    className="w-full py-1.5 bg-[#181914] hover:bg-[#2B2C24] text-[#A2A790] hover:text-[#F2E8D5] font-mono font-bold text-[10px] uppercase rounded border border-[#0A0B08] cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Restablecer Semilla Geopolítica Venezuela</span>
                  </button>
                </div>
              )}
            </div>
          </motion.aside>
        )}
      </AnimatePresence>
    </div>
  );
};

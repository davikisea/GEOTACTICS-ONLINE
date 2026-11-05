/**
 * ==============================================================================
 * WORLD MAP CANVAS: LIENZO TERRITORIAL INTERACTIVO V2 (VICTORIA 3 × RISK)
 * ==============================================================================
 * Eje Gravitacional de Datos en Vivo (Supabase SSOT - Zero Mock Data):
 * - Renderizado en vivo de Provincias, Capitales de Alto Rendimiento y Nodos.
 * - Grafo de Adyacencia Topológico interactivo con líneas de proyección bélica.
 * - Suscripción Realtime a estados de asedio, TCP y cooldowns de prioridad.
 * - Estética Canónica C4ISR: Ben-day dots, sombras duras y cortes asimétricos.
 * ==============================================================================
 */

import React, { useState, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Shield,
  Swords,
  Crown,
  Zap,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Crosshair,
  Clock,
  Radio,
  Factory,
  Flame,
  AlertTriangle,
  RefreshCw,
} from 'lucide-react';
import { useTerritoryMap } from '../../hooks/useTerritoryMap';
import { WorldProvince, TerritoryNode, TerritoryAdjacency } from '../../types/metagame';

export interface WorldMapCanvasProps {
  onSelectProvince?: (provinceId: string) => void;
  onJoinActiveBattle?: (provinceId: string) => void;
  activeProvinceId?: string | null;
  userClanId?: string | null;
  className?: string;
}

export interface ProvinceVisualData {
  id: string;
  name: string;
  countryIso: string;
  isCapital: boolean;
  biome: string;
  x: number;
  y: number;
  width: number;
  height: number;
  ownerTag: string;
  ownerColor: string;
  tcp: number;
  tcpMax: number;
  status: 'stable' | 'under_siege' | 'disputed' | 'cooldown_priority';
  hasActiveBattle?: boolean;
  resourcePerMin: string;
}

export const WorldMapCanvas: React.FC<WorldMapCanvasProps> = ({
  onSelectProvince,
  onJoinActiveBattle,
  activeProvinceId,
  userClanId = 'clan-ferro',
  className = '',
}) => {
  const {
    countries,
    provinces,
    nodes,
    adjacencies,
    controlMap,
    clansMap,
    isLoading,
    error,
    refreshMap,
    declareAttack,
  } = useTerritoryMap(userClanId);

  const effectiveClanId = userClanId && clansMap[userClanId] ? userClanId : 'clan-ferro';

  const [zoomLevel, setZoomLevel] = useState<number>(1.0);
  const [panOffset, setPanOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [hoveredProvinceId, setHoveredProvinceId] = useState<string | null>(null);
  const [isAttacking, setIsAttacking] = useState<boolean>(false);
  const [attackFeedback, setAttackFeedback] = useState<{ msg: string; isError: boolean } | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);

  // Manejo de Navegación por Arrastre (Pan)
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPanOffset({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleZoom = (delta: number) => {
    setZoomLevel(prev => Math.min(2.5, Math.max(0.65, prev + delta)));
  };

  const resetView = () => {
    setZoomLevel(1.0);
    setPanOffset({ x: 0, y: 0 });
  };

  // Diccionario rápido de provincias por ID
  const provinceLookup = useMemo(() => {
    const map = new Map<string, WorldProvince>();
    provinces.forEach(p => map.set(p.id, p));
    return map;
  }, [provinces]);

  // Provincia actualmente bajo el cursor
  const hoveredProvince = useMemo(() => {
    if (!hoveredProvinceId) return null;
    return provinceLookup.get(hoveredProvinceId) || null;
  }, [hoveredProvinceId, provinceLookup]);

  // Nodos de la provincia seleccionada o inspeccionada
  const activeNodes = useMemo(() => {
    const targetId = activeProvinceId || hoveredProvinceId;
    if (!targetId) return [];
    return nodes.filter(n => n.provinceId === targetId);
  }, [activeProvinceId, hoveredProvinceId, nodes]);

  // Ejecución de asedio desde una provincia aliada
  const handleLaunchAttack = async (targetProvId: string) => {
    if (!effectiveClanId) {
      setAttackFeedback({ msg: 'Debes pertenecer a un Clan para iniciar asedios.', isError: true });
      return;
    }

    // Buscar una provincia aliada adyacente que el clan controle
    const alliedAdjacent = adjacencies.find(adj => {
      const isConnected =
        (adj.fromProvinceId === targetProvId && controlMap[adj.toProvinceId]?.controllingClanId === effectiveClanId) ||
        (adj.toProvinceId === targetProvId && controlMap[adj.fromProvinceId]?.controllingClanId === effectiveClanId);
      return isConnected && !adj.isBlocked;
    });

    if (!alliedAdjacent) {
      setAttackFeedback({
        msg: 'Infracción de Adyacencia: Necesitas una provincia aliada vecina conectada para atacar.',
        isError: true,
      });
      return;
    }

    const originProvId =
      alliedAdjacent.fromProvinceId === targetProvId
        ? alliedAdjacent.toProvinceId
        : alliedAdjacent.fromProvinceId;

    setIsAttacking(true);
    setAttackFeedback(null);

    const res = await declareAttack(originProvId, targetProvId, effectiveClanId);
    setIsAttacking(false);

    if (res.success) {
      setAttackFeedback({ msg: `¡ORDEN DE ASEDIO CONFIRMADA! Objetivo: ${targetProvId}`, isError: false });
    } else {
      setAttackFeedback({ msg: res.error || 'Fallo en la declaración de asedio.', isError: true });
    }
  };

  return (
    <div
      ref={containerRef}
      className={`relative w-full h-full overflow-hidden select-none bg-[#12130e] ${className}`}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
    >
      {/* 1. Malla Táctica y Fondo Geopolítico C4ISR */}
      <div
        className="absolute inset-0 opacity-25 pointer-events-none"
        style={{
          backgroundImage: `
            linear-gradient(to right, #46521F 1px, transparent 1px),
            linear-gradient(to bottom, #46521F 1px, transparent 1px)
          `,
          backgroundSize: '40px 40px',
        }}
      />

      {/* 2. Capa Transformable del Planisferio (Zoom y Pan) */}
      <div
        className="absolute inset-0 transition-transform duration-75 ease-out"
        style={{
          transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoomLevel})`,
          transformOrigin: 'center center',
        }}
      >
        {/* Capa de Aristas y Conexiones Topológicas del Grafo (Líneas de Riesgo) */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ minWidth: '100%', minHeight: '100%' }}>
          {adjacencies.map(adj => {
            const fromP = provinceLookup.get(adj.fromProvinceId);
            const toP = provinceLookup.get(adj.toProvinceId);
            if (!fromP || !toP) return null;

            const x1 = `${fromP.posX + fromP.width / 2}%`;
            const y1 = `${fromP.posY + fromP.height / 2}%`;
            const x2 = `${toP.posX + toP.width / 2}%`;
            const y2 = `${toP.posY + toP.height / 2}%`;

            const isStraitOrSea = adj.connectionType === 'strait' || adj.connectionType === 'sea_lane';
            const strokeColor = adj.isBlocked
              ? '#EF4444'
              : isStraitOrSea
              ? '#38BDF8'
              : '#EAB308';

            return (
              <line
                key={adj.id}
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke={strokeColor}
                strokeWidth={isStraitOrSea ? '2' : '1.5'}
                strokeDasharray={isStraitOrSea ? '5,5' : undefined}
                strokeOpacity="0.45"
              />
            );
          })}
        </svg>

        {/* Renderizado en Vivo de Provincias Soberanas (Supabase SSOT + Project Alice) */}
        {provinces.map(prov => {
          const isSelected = activeProvinceId === prov.id;
          const isBufferZone = prov.id.startsWith('BUF_');
          const ctrl = controlMap[prov.id];
          const controllingClan = ctrl?.controllingClanId ? clansMap[ctrl.controllingClanId] : null;

          const tcp = ctrl?.currentTcp ?? 10000;
          const tcpMax = ctrl?.tcpThreshold ?? 10000;
          const tcpPercent = Math.round((tcp / tcpMax) * 100);

          const ownerTag = isBufferZone ? 'BUFFER' : controllingClan?.tag || 'ESTADO';
          const ownerColor = isBufferZone
            ? '#334155'
            : controllingClan?.color || (prov.isCapital ? '#D97706' : '#7B8A4A');
          const isUnderSiege = ctrl?.status === 'under_siege';
          const isDisputed = ctrl?.status === 'disputed';
          const isCooldown = ctrl?.status === 'cooldown_priority';
          const isChokepointGuardian = prov.id === 'REG_VE_02' || prov.id === 'REG_VE_13';

          return (
            <div
              key={prov.id}
              data-region-id={prov.id}
              data-buffer-zone={isBufferZone ? 'true' : 'false'}
              onClick={e => {
                e.stopPropagation();
                if (onSelectProvince) onSelectProvince(prov.id);
              }}
              onMouseEnter={() => setHoveredProvinceId(prov.id)}
              onMouseLeave={() => setHoveredProvinceId(null)}
              className={`absolute rounded-[6px_2px_6px_2px] cursor-pointer transition-all duration-200 border-2 ${
                isSelected
                  ? 'border-amber-400 ring-4 ring-amber-400/40 z-30 shadow-[0_0_25px_rgba(245,158,11,0.6)]'
                  : isBufferZone
                  ? 'border-slate-700/70 opacity-65 hover:opacity-90 z-10 border-dashed'
                  : prov.isCapital
                  ? 'border-yellow-500/80 hover:border-yellow-300 z-20 shadow-[0_0_12px_rgba(234,179,8,0.3)]'
                  : 'border-[#7B8A4A]/60 hover:border-[#F2E8D5] z-10'
              }`}
              style={{
                left: `${prov.posX}%`,
                top: `${prov.posY}%`,
                width: `${prov.width * 18}px`,
                height: `${prov.height * 16}px`,
                backgroundColor: `${ownerColor}2e`,
                backdropFilter: 'blur(2px)',
              }}
            >
              {/* Cabecera del Bloque Territorial */}
              <div
                className="w-full px-1.5 py-0.5 flex items-center justify-between text-[10px] font-black uppercase text-[#F2E8D5] tracking-wider rounded-t-[4px]"
                style={{ backgroundColor: `${ownerColor}d9` }}
              >
                <div className="flex items-center gap-1 truncate">
                  {prov.isCapital ? (
                    <Crown className="w-3 h-3 text-yellow-300 drop-shadow shrink-0" />
                  ) : (
                    <Shield className="w-2.5 h-2.5 text-[#F2E8D5] shrink-0" />
                  )}
                  <span className="truncate">{prov.name}</span>
                </div>
                <span className="text-[8px] bg-black/70 px-1 py-0.2 rounded font-mono font-bold shrink-0">
                  [{ownerTag}]
                </span>
              </div>

              {/* Cuerpo del Bloque: TCP, Nivel y Producción */}
              <div className="p-1 flex flex-col justify-between h-[calc(100%-20px)]">
                <div className="flex items-center justify-between text-[9px] font-mono text-[#F2E8D5]/90">
                  <span className="font-bold">{isBufferZone ? 'ZONA BUFFER' : 'TCP'}</span>
                  <span
                    className={
                      isBufferZone
                        ? 'text-slate-400'
                        : tcpPercent < 50
                        ? 'text-red-400 font-black'
                        : tcpPercent < 80
                        ? 'text-amber-400'
                        : 'text-emerald-400'
                    }
                  >
                    {isBufferZone ? 'FASE 2' : `${tcpPercent}%`}
                  </span>
                </div>

                {/* Barra de Progreso TCP */}
                <div className="w-full h-1.5 bg-black/60 rounded-full overflow-hidden border border-black/40">
                  <div
                    className={`h-full transition-all duration-300 ${
                      isBufferZone
                        ? 'bg-slate-600'
                        : tcpPercent < 50
                        ? 'bg-red-500'
                        : tcpPercent < 80
                        ? 'bg-amber-500'
                        : 'bg-emerald-500'
                    }`}
                    style={{ width: `${isBufferZone ? 100 : tcpPercent}%` }}
                  />
                </div>

                {/* Etiquetas de Estado: Capital, Estrecho, Asedio o Escudo */}
                <div className="flex items-center justify-between mt-0.5">
                  {isBufferZone ? (
                    <span className="text-[8px] text-red-300 font-mono font-bold">
                      BLOQUEADO F1
                    </span>
                  ) : isUnderSiege ? (
                    <button
                      type="button"
                      onClick={e => {
                        e.stopPropagation();
                        handleLaunchAttack(prov.id);
                      }}
                      className="flex items-center gap-0.5 bg-red-600 hover:bg-red-500 text-white text-[8px] font-black px-1 py-0.5 rounded animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.8)]"
                    >
                      <Swords className="w-2.5 h-2.5" />
                      <span>¡ASEDIO!</span>
                    </button>
                  ) : isDisputed ? (
                    <span className="text-[8px] text-amber-300 font-mono font-bold bg-amber-950/70 px-1 rounded">
                      DE FACTO (24H)
                    </span>
                  ) : isCooldown ? (
                    <div className="flex items-center gap-1 text-cyan-300 text-[8px] font-mono font-bold bg-cyan-950/70 px-1 py-0.5 rounded border border-cyan-500/40">
                      <Clock className="w-2 h-2" />
                      <span>ESCUDO</span>
                    </div>
                  ) : (
                    <span className="text-[8px] text-[#A2A790] font-mono">
                      {isChokepointGuardian ? '⚓ PEAJE' : `x${prov.resourceMultiplier.toFixed(1)} RGO`}
                    </span>
                  )}

                  {prov.isCapital && (
                    <span className="text-amber-300 text-[8px] font-mono font-black bg-black/60 px-1 py-0.5 rounded border border-amber-500/40 flex items-center gap-0.5">
                      <Flame className="w-2.5 h-2.5 text-amber-400" />
                      <span>HEGEMONÍA</span>
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* 3. Panel de Control de Navegación (Zoom y Centrado) */}
      <div className="absolute top-3 left-3 z-40 flex flex-col gap-1 bg-[#161712]/95 border-2 border-[#0A0B08] p-1.5 rounded-[6px_2px_6px_2px] shadow-[4px_4px_0px_#0A0B08] backdrop-blur-md">
        <button
          type="button"
          onClick={() => handleZoom(0.25)}
          className="p-1.5 hover:bg-[#2B2C24] text-[#F2E8D5] rounded transition-colors"
          title="Aumentar Zoom"
        >
          <ZoomIn className="w-4 h-4 text-amber-400" />
        </button>
        <button
          type="button"
          onClick={() => handleZoom(-0.25)}
          className="p-1.5 hover:bg-[#2B2C24] text-[#F2E8D5] rounded transition-colors"
          title="Reducir Zoom"
        >
          <ZoomOut className="w-4 h-4 text-amber-400" />
        </button>
        <div className="w-full h-px bg-[#2B2C24]" />
        <button
          type="button"
          onClick={resetView}
          className="p-1.5 hover:bg-[#2B2C24] text-[#F2E8D5] rounded transition-colors"
          title="Centrar Vista"
        >
          <RotateCcw className="w-4 h-4 text-[#A2A790]" />
        </button>
        <button
          type="button"
          onClick={refreshMap}
          className="p-1.5 hover:bg-[#2B2C24] text-[#F2E8D5] rounded transition-colors"
          title="Recargar desde Supabase"
        >
          <RefreshCw className={`w-4 h-4 text-emerald-400 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* 4. Feedback de Asedio / Ataque */}
      {attackFeedback && (
        <div
          className={`absolute top-3 right-3 z-50 px-3 py-2 rounded-[6px_2px_6px_2px] border-2 font-mono text-xs shadow-[4px_4px_0px_#0A0B08] flex items-center gap-2 ${
            attackFeedback.isError
              ? 'bg-red-950/90 border-red-500 text-red-200'
              : 'bg-emerald-950/90 border-emerald-500 text-emerald-200'
          }`}
        >
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{attackFeedback.msg}</span>
          <button
            type="button"
            onClick={() => setAttackFeedback(null)}
            className="ml-2 font-black hover:text-white"
          >
            ×
          </button>
        </div>
      )}

      {/* 5. Radar HUD de Telemetría al Pasar el Ratón o Seleccionar */}
      <AnimatePresence>
        {hoveredProvince && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="absolute bottom-4 left-4 z-40 bg-[#161712]/95 border-2 border-[#0A0B08] p-3.5 rounded-[8px_2px_8px_2px] shadow-[4px_4px_0px_#0A0B08] backdrop-blur-md w-80 text-[#F2E8D5]"
          >
            <div className="flex items-center justify-between border-b border-[#2B2C24] pb-2 mb-2">
              <div className="flex items-center gap-1.5">
                {hoveredProvince.isCapital ? (
                  <Crown className="w-4 h-4 text-yellow-400" />
                ) : (
                  <Shield className="w-4 h-4 text-amber-500" />
                )}
                <span className="font-display font-black text-sm uppercase tracking-wide">
                  {hoveredProvince.name}
                </span>
              </div>
              <span className="text-[10px] font-mono bg-black/60 px-2 py-0.5 rounded text-amber-400 border border-amber-500/20">
                {hoveredProvince.countryIso}
              </span>
            </div>

            <div className="space-y-1.5 text-[11px] font-mono">
              <div className="flex justify-between">
                <span className="text-[#A2A790]">Categoría:</span>
                <span className="font-bold text-amber-300">
                  {hoveredProvince.isCapital
                    ? 'CAPITAL HISTÓRICA (CAPTURABLE)'
                    : 'PROVINCIA ESTRATÉGICA'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#A2A790]">Multiplicador Rec:</span>
                <span className="font-bold text-emerald-400">
                  {hoveredProvince.resourceMultiplier}x ({hoveredProvince.buildingSlots} parcelas)
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#A2A790]">Clima / Terreno:</span>
                <span className="capitalize text-[#F2E8D5]">
                  {hoveredProvince.nativeWeather} • {hoveredProvince.baseTerrain}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#A2A790]">Soberano Actual:</span>
                <span className="font-bold text-amber-400">
                  {controlMap[hoveredProvince.id]?.controllingClanId
                    ? clansMap[controlMap[hoveredProvince.id]!.controllingClanId!]?.name || 'Clan Desconocido'
                    : 'Estado Nacional'}
                </span>
              </div>

              {/* Botón de Asedio si el clan no es el soberano */}
              {controlMap[hoveredProvince.id]?.controllingClanId !== userClanId && (
                <div className="pt-2 border-t border-[#2B2C24] mt-2">
                  <button
                    type="button"
                    disabled={isAttacking}
                    onClick={() => handleLaunchAttack(hoveredProvince.id)}
                    className="w-full py-1.5 px-2 bg-[#E65100] hover:bg-amber-400 text-black font-display font-black text-xs uppercase rounded-[4px_2px_4px_2px] border border-[#0A0B08] shadow-[2px_2px_0px_#0A0B08] cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50"
                  >
                    <Crosshair className="w-3.5 h-3.5" />
                    <span>{isAttacking ? 'PROCESANDO...' : 'DECLARAR ASEDIO RISK'}</span>
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

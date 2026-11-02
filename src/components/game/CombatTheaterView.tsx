import React from 'react';
import {
  RotateCcw,
  SlidersHorizontal,
  ArrowLeft,
  Crosshair,
  Flag,
  Factory,
  Bot,
  Zap,
  Map as MapIcon,
  UploadCloud,
  CloudFog,
  Sparkles,
  Timer,
  Layers,
  Award,
  Terminal,
  LogOut,
  ShieldAlert,
} from 'lucide-react';
import { GameCanvas, AmbushAlert, InSituTargetBadgeData, TileContextMenuData } from './GameCanvas';
import { TacticalUnit, TerrainTile } from '../../types';
import { PredefinedMapMeta } from '../../engine/predefinedMaps';
import { COPowerType, PlayerCOState, CANONICAL_CO_REGISTRY } from '../../engine/coSystem';
import { COCommandBar } from './COCommandBar';
import { BotDifficulty } from '../../engine/aiBot';
import { MatchFormat } from '../../engine/autonomousOrchestrator';
import { DeckManager } from '../../engine/deckManager';
import { TacticalLoadingFallback } from '../../App';
import { AvailableSubAction, evaluateAvailableSubActions } from '../../engine/subActions';
import { CanonicalCombatEngine } from '../../engine/canonicalCombat';
import { audioManager } from '../../engine/audioManager';
import { triggerHaptic } from '../../engine/hapticFeedback';
import { DebugDevConsoleModal } from './DebugDevConsoleModal';

const MapLoadingScreen = React.lazy(() =>
  import('./MapLoadingScreen').then(m => ({ default: m.MapLoadingScreen }))
);

export interface CombatTheaterViewProps {
  matchFormat: MatchFormat;
  turn: 'p1' | 'p2';
  turnNumber: number;
  turnTimeRemaining: number;
  playerFunds: { p1: number; p2: number };
  p1Income: number;
  p2Income: number;
  gameMode: 'vs_bot' | 'hotseat_2p';
  setGameMode: (mode: 'vs_bot' | 'hotseat_2p') => void;
  botDifficulty: BotDifficulty;
  setBotDifficulty: (d: BotDifficulty) => void;
  isBotThinking: boolean;
  botActionLog: string | null;
  handleEndTurn: () => void;
  units: TacticalUnit[];
  matchTiles: TerrainTile[][];
  convertedTiles: any[];
  convertedUnits: any[];
  selectedUnit: TacticalUnit | null;
  setSelectedUnitId: (id: string | null) => void;
  targetEnemy: TacticalUnit | null;
  setTargetEnemyId: (id: string | null) => void;
  reachableCells: { x: number; y: number }[];
  handleMoveUnit: (coord: { x: number; y: number }, path?: { x: number; y: number }[]) => void;
  combatResult: any;
  handleExecuteCombat: () => void;
  handleAtomicMoveAndAttack?: (payload: {
    unitId: string;
    destination: { x: number; y: number };
    path?: { x: number; y: number }[];
    targetEnemyId: string;
  }) => void;
  currentTileUnderSelected: any;
  canActiveUnitCapture: boolean;
  handleExecuteCapture: () => void;
  onExecuteSubAction?: (action: AvailableSubAction, targetCoord?: { x: number; y: number }) => void;
  selectedMapId: string;
  setSelectedMapId: (id: string) => void;
  predefinedMapsMeta: PredefinedMapMeta[];
  customMaps: PredefinedMapMeta[];
  activeMap: any;
  setIsImportModalOpen: (open: boolean) => void;
  coInspectorView: 'p1' | 'p2';
  setCoInspectorView: (p: 'p1' | 'p2') => void;
  playerCOs: Record<'p1' | 'p2', PlayerCOState>;
  setPlayerCOs: React.Dispatch<React.SetStateAction<Record<'p1' | 'p2', PlayerCOState>>>;
  handleActivateCOPower: (p: 'p1' | 'p2', type: COPowerType) => void;
  viewMode: 'canvas' | 'grid';
  setViewMode: (v: 'canvas' | 'grid') => void;
  showLoadingRadar: boolean;
  setShowLoadingRadar: (s: boolean) => void;
  isFogOfWarEnabled: boolean;
  setIsFogOfWarEnabled: React.Dispatch<React.SetStateAction<boolean>>;
  viewerPerspective: 'p1' | 'p2' | 'spectator';
  setViewerPerspective: (p: 'p1' | 'p2' | 'spectator') => void;
  fowWeather: 'clear' | 'rain';
  setFowWeather: React.Dispatch<React.SetStateAction<'clear' | 'rain'>>;
  sonjaSensorActive: boolean;
  setSonjaSensorActive: React.Dispatch<React.SetStateAction<boolean>>;
  currentVision: any;
  ambushAlert: AmbushAlert | null;
  airDrops: any[];
  setSelectedFactoryCoord: (coord: { x: number; y: number } | null) => void;
  setIsProductionModalOpen: (open: boolean) => void;
  isTacticalDrawerOpen: boolean;
  setIsTacticalDrawerOpen: (open: boolean) => void;
  onRetreatToLobby: () => void;
  onBarkTrigger: () => void;
}

export const CombatTheaterView: React.FC<CombatTheaterViewProps> = ({
  matchFormat,
  turn,
  turnNumber,
  turnTimeRemaining,
  playerFunds,
  p1Income,
  p2Income,
  gameMode,
  setGameMode,
  botDifficulty,
  setBotDifficulty,
  isBotThinking,
  botActionLog,
  handleEndTurn,
  units,
  matchTiles,
  convertedTiles,
  convertedUnits,
  selectedUnit,
  setSelectedUnitId,
  targetEnemy,
  setTargetEnemyId,
  reachableCells,
  handleMoveUnit,
  combatResult,
  handleExecuteCombat,
  handleAtomicMoveAndAttack,
  currentTileUnderSelected,
  canActiveUnitCapture,
  handleExecuteCapture,
  onExecuteSubAction,
  selectedMapId,
  setSelectedMapId,
  predefinedMapsMeta,
  customMaps,
  activeMap,
  setIsImportModalOpen,
  coInspectorView,
  setCoInspectorView,
  playerCOs,
  setPlayerCOs,
  handleActivateCOPower,
  viewMode,
  setViewMode,
  showLoadingRadar,
  setShowLoadingRadar,
  isFogOfWarEnabled,
  setIsFogOfWarEnabled,
  viewerPerspective,
  setViewerPerspective,
  fowWeather,
  setFowWeather,
  sonjaSensorActive,
  setSonjaSensorActive,
  currentVision,
  ambushAlert,
  airDrops,
  setSelectedFactoryCoord,
  setIsProductionModalOpen,
  isTacticalDrawerOpen,
  setIsTacticalDrawerOpen,
  onRetreatToLobby,
  onBarkTrigger,
}) => {
  const p1Count = units.filter(u => u.owner === 'p1').length;
  const supply = DeckManager.calculateSupplyStatus(p1Count);

  // Estados para Paridad de Sub-Acciones y Menú Contextual (RFC Sección 1)
  const [tileContextMenu, setTileContextMenu] = React.useState<TileContextMenuData | null>(null);
  const [inSituTargetBadge, setInSituTargetBadge] = React.useState<InSituTargetBadgeData | null>(null);
  const [targetingState, setTargetingState] = React.useState<{ actionType: 'attack' | 'unload' | 'launch_silo'; validTargets: { x: number; y: number }[] } | null>(null);
  const [pendingMove, setPendingMove] = React.useState<{ unitId: string; destination: { x: number; y: number } } | null>(null);

  // Aislamiento de Consola Debug (Fase 2 - Ctrl + Shift + D)
  const [isDebugConsoleOpen, setIsDebugConsoleOpen] = React.useState(false);

  // Hotkeys Canónicos para Alto APM (RFC Sección 3 / Anexo A)
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      // Atajo de Consola de Depuración de Estado Mayor (Ctrl + Shift + D)
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'D' || e.key === 'd')) {
        e.preventDefault();
        setIsDebugConsoleOpen(prev => !prev);
        triggerHaptic('selection');
        return;
      }

      if (e.key === 'Tab') {
        e.preventDefault();
        const availableUnits = units.filter(u => u.owner === turn && !u.hasActed);
        if (availableUnits.length > 0) {
          const currentIdx = availableUnits.findIndex(u => u.id === selectedUnit?.id);
          const nextIdx = e.shiftKey
            ? (currentIdx - 1 + availableUnits.length) % availableUnits.length
            : (currentIdx + 1) % availableUnits.length;
          setSelectedUnitId(availableUnits[nextIdx].id);
          triggerHaptic('selection');
          audioManager.playSFX('unit_select');
        }
      } else if (e.key === 'Escape') {
        setTileContextMenu(null);
        setTargetingState(null);
        setInSituTargetBadge(null);
        setPendingMove(null);
        setSelectedUnitId(null);
        setTargetEnemyId(null);
        triggerHaptic('error');
      } else if (e.key === ' ' || e.code === 'Space') {
        e.preventDefault();
        if (tileContextMenu) {
          const waitAction = tileContextMenu.actions.find(a => a.type === 'wait') || tileContextMenu.actions[0];
          if (waitAction) {
            triggerHaptic('selection');
            tileContextMenu.onSelectAction(waitAction);
          }
        } else if (selectedUnit && selectedUnit.owner === turn && !selectedUnit.hasActed) {
          triggerHaptic('movement');
          handleMoveUnit({ x: selectedUnit.x, y: selectedUnit.y });
        }
      } else if (e.ctrlKey && e.key === 'Enter') {
        e.preventDefault();
        triggerHaptic('movement');
        handleEndTurn();
      } else if ((e.key === 'p' || e.key === 'P') && !e.ctrlKey) {
        triggerHaptic('co_power');
        handleActivateCOPower(turn, 'cop');
      } else if ((e.key === 'o' || e.key === 'O') && !e.ctrlKey) {
        triggerHaptic('co_power');
        handleActivateCOPower(turn, 'scop');
      } else if (tileContextMenu) {
        let actionToTrigger = null;
        if (['1', '2', '3', '4', '5', '6', '7'].includes(e.key)) {
          const actionIdx = parseInt(e.key, 10) - 1;
          actionToTrigger = tileContextMenu.actions[actionIdx];
        } else {
          const k = e.key.toLowerCase();
          if (k === 'w') actionToTrigger = tileContextMenu.actions.find(a => a.type === 'wait');
          else if (k === 'l') actionToTrigger = tileContextMenu.actions.find(a => a.type === 'load');
          else if (k === 'c') actionToTrigger = tileContextMenu.actions.find(a => a.type === 'capture');
          else if (k === 'a') actionToTrigger = tileContextMenu.actions.find(a => a.type === 'attack');
          else if (k === 'r') actionToTrigger = tileContextMenu.actions.find(a => a.type === 'repair');
          else if (k === 'h') actionToTrigger = tileContextMenu.actions.find(a => a.type === 'hide' || a.type === 'show');
          else if (k === 'x') actionToTrigger = tileContextMenu.actions.find(a => a.type === 'explode');
        }
        if (actionToTrigger) {
          e.preventDefault();
          triggerHaptic('selection');
          tileContextMenu.onSelectAction(actionToTrigger);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [units, selectedUnit, turn, tileContextMenu, handleEndTurn, handleMoveUnit, handleActivateCOPower, setSelectedUnitId, setTargetEnemyId]);

  return (
    <div className="flex-1 flex flex-col w-full h-screen max-h-screen overflow-hidden bg-[#161712] relative font-sans select-none">
      {/* CABECERA BÉLICA SUPERIOR */}
      <header className="border-b-2 border-[#0A0B08] bg-[#2B2C24] px-3 py-1.5 flex flex-wrap items-center justify-between gap-2 shadow-[0_3px_0px_#0A0B08] ben-day-dark shrink-0 z-30">
        <div className="flex items-center gap-2">
          <button
            onMouseEnter={() => audioManager.playHoverTick()}
            onClick={onRetreatToLobby}
            className="tactical-juice-btn flex items-center gap-1.5 px-2.5 py-1 bg-[#46521F] hover:bg-[#586827] text-[#F2E8D5] text-[11px] font-display font-extrabold border-2 border-[#0A0B08]"
            title="Retirarse al Cuartel General (Lobby Bélico)"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-amber-300" />
            <span className="hidden sm:inline">Cuartel</span>
          </button>

          <div className="flex items-center gap-1 px-2 py-0.5 rounded bg-[#181914] border border-[#7B8A4A]/50 text-[#F2E8D5] text-[10px] font-mono font-black uppercase">
            {matchFormat === 'mirror_duel'
              ? '⚔️ Duelo Espejo (15s)'
              : matchFormat === 'blitz_skirmish'
              ? '⚡ Blitz (30s)'
              : '🎖️ Gran Campaña (60s)'}
          </div>

          {/* Indicador de Turno */}
          <div
            className={`px-2.5 py-0.5 rounded text-[11px] font-mono font-black border ${
              turn === 'p1'
                ? 'bg-blue-600/90 border-blue-400 text-white shadow-[0_0_8px_rgba(37,99,235,0.4)]'
                : 'bg-red-600/90 border-red-400 text-white shadow-[0_0_8px_rgba(220,38,38,0.4)]'
            }`}
          >
            {turn === 'p1' ? 'EJÉRCITO AZUL' : gameMode === 'vs_bot' ? 'IA BLUE MOON' : 'EJÉRCITO ROJO'} • T{turnNumber}
          </div>

          {/* Reloj Digital Militar Retro-Futurista */}
          <div
            className={`flex items-center gap-1 px-2 py-0.5 rounded font-mono font-black text-xs border ${
              turnTimeRemaining <= 5
                ? 'bg-[#C46A3A] border-[#181914] text-white animate-pulse'
                : 'bg-[#181914] border-[#7B8A4A]/50 text-amber-300'
            }`}
          >
            <Timer className="w-3 h-3 text-amber-400" />
            <span>00:{turnTimeRemaining < 10 ? `0${turnTimeRemaining}` : turnTimeRemaining}</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Mando de Comandante (1-Clic COP/SCOP) - RFC Sección 1.2 */}
          <COCommandBar
            compact={true}
            player={turn}
            isCurrentTurn={true}
            coState={playerCOs[turn]}
            onSelectCO={(coId) => {
              setPlayerCOs(prev => ({
                ...prev,
                [turn]: { ...prev[turn], coId },
              }));
            }}
            onActivatePower={(powerType) => handleActivateCOPower(turn, powerType)}
          />

          {/* Fondos */}
          <div className="flex items-center gap-2 bg-[#181914] px-2 py-0.5 rounded border border-[#7B8A4A]/40 text-[11px] font-mono font-bold">
            <span className="text-blue-400">P1: {playerFunds.p1.toLocaleString()}G</span>
            <span className="text-slate-600">|</span>
            <span className="text-red-400">P2: {playerFunds.p2.toLocaleString()}G</span>
          </div>

          {/* Suministro */}
          <div
            className={`hidden md:flex px-2 py-0.5 rounded border text-[10px] font-mono items-center gap-1 ${
              supply.isOverCapacity
                ? 'bg-amber-950/80 border-amber-500/50 text-amber-300'
                : 'bg-[#181914] border-[#7B8A4A]/40 text-slate-300'
            }`}
            title="Capacidad logística: 14 unidades sin coste. Exceso = penalización de fondos"
          >
            <span>Sum: {supply.unitCount}/14</span>
            {supply.isOverCapacity && (
              <span className="text-amber-400 font-bold">(-{supply.totalUpkeepG}G)</span>
            )}
          </div>

          {/* Botón de Ceder Turno */}
          <button
            onClick={handleEndTurn}
            onMouseEnter={() => audioManager.playHoverTick()}
            disabled={isBotThinking || (gameMode === 'vs_bot' && turn === 'p2')}
            className="px-3 py-1 rounded-[6px_2px_6px_2px] font-black text-xs bg-emerald-600 hover:bg-emerald-500 text-slate-950 border-2 border-[#0A0B08] shadow-[2px_2px_0px_#0A0B08] flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-40 active:translate-x-0.5 active:translate-y-0.5"
            title="Ceder Turno [Ctrl+Enter]"
          >
            <RotateCcw className={`w-3.5 h-3.5 ${isBotThinking ? 'animate-spin' : ''}`} />
            <span>{isBotThinking ? 'IA...' : 'Ceder Turno'}</span>
            <span className="hidden xl:inline text-[9px] font-mono text-emerald-950/80 font-bold ml-0.5">[Ctrl+↵]</span>
          </button>

          {/* Conmutador Consola Táctica Lateral */}
          <button
            onClick={() => setIsTacticalDrawerOpen(!isTacticalDrawerOpen)}
            onMouseEnter={() => audioManager.playHoverTick()}
            className={`px-2.5 py-1 rounded-[6px_2px_6px_2px] text-xs font-mono font-black border-2 border-[#0A0B08] flex items-center gap-1 transition-all cursor-pointer ${
              isTacticalDrawerOpen
                ? 'bg-[#C46A3A] text-[#F2E8D5] shadow-[2px_2px_0px_#0A0B08]'
                : 'bg-[#46521F] text-[#F2E8D5] shadow-[2px_2px_0px_#0A0B08]'
            }`}
            title="Abrir o cerrar la consola lateral de táctica, balística y mapas"
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-yellow-300" />
            <span className="hidden sm:inline">
              {isTacticalDrawerOpen ? 'Cerrar Consola' : 'Consola Táctica'}
            </span>
          </button>
        </div>
      </header>

      {/* BANNER DE MANIOBRA HEURÍSTICA DE LA IA */}
      {isBotThinking && (
        <div className="w-full bg-red-950/90 border-b border-red-500/60 px-4 py-1.5 flex items-center justify-between text-xs font-mono text-red-200 animate-pulse shrink-0">
          <div className="flex items-center gap-2">
            <Bot className="w-4 h-4 text-red-400 animate-bounce" />
            <span className="font-bold uppercase tracking-wider text-red-300">
              MANIOBRA DE LA IA ({botDifficulty.toUpperCase()}):
            </span>
            <span className="text-white">{botActionLog || 'Calculando solución táctica...'}</span>
          </div>
          <div className="flex items-center gap-1.5 text-[10px] text-red-400 font-bold">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
            MOTOR ACTIVO
          </div>
        </div>
      )}

      {/* ÁREA CENTRAL DEL LIENZO (100% VIEWPORT DISPONIBLE - 0 SCROLL EN 1366x768) */}
      <div className="flex-1 flex flex-col items-center justify-center p-2 relative overflow-hidden">
        {showLoadingRadar ? (
          <div className="w-full max-w-xl">
            <React.Suspense fallback={<TacticalLoadingFallback />}>
              <MapLoadingScreen onLoadingComplete={() => setShowLoadingRadar(false)} />
            </React.Suspense>
          </div>
        ) : viewMode === 'canvas' ? (
          <div className="w-full h-full flex flex-col items-center justify-center">
            <GameCanvas
              tiles={convertedTiles}
              units={convertedUnits}
              selectedCoord={selectedUnit ? { x: selectedUnit.x, y: selectedUnit.y } : null}
              reachableCoords={reachableCells}
              targetCoords={
                targetingState?.validTargets ||
                (targetEnemy ? [{ x: targetEnemy.x, y: targetEnemy.y }] : [])
              }
              onCellHover={(coord) => {
                if (!coord) {
                  setInSituTargetBadge(null);
                  return;
                }
                if (targetingState?.actionType === 'attack' && selectedUnit) {
                  const targetUnit = units.find(u => u.x === coord.x && u.y === coord.y && u.owner !== selectedUnit.owner);
                  const isValidTarget = targetingState.validTargets.some(t => t.x === coord.x && t.y === coord.y);
                  if (targetUnit && isValidTarget) {
                    const atkCoord = pendingMove ? pendingMove.destination : { x: selectedUnit.x, y: selectedUnit.y };
                    const atkTile = matchTiles[atkCoord.y]?.[atkCoord.x];
                    const defTile = matchTiles[targetUnit.y]?.[targetUnit.x];
                    if (atkTile && defTile) {
                      const res = CanonicalCombatEngine.calculateEngagement(
                        { ...selectedUnit, x: atkCoord.x, y: atkCoord.y } as any,
                        targetUnit as any,
                        atkTile,
                        defTile
                      );
                      setInSituTargetBadge({
                        coord,
                        attackerName: selectedUnit.name,
                        defenderName: targetUnit.name,
                        estimatedDamage: res.estimatedDamage,
                        counterDamage: res.counterDamage,
                        canCounter: res.canCounter,
                        defenderHp: targetUnit.hp,
                        terrainStars: defTile.defenseStars,
                      });
                      return;
                    }
                  }
                }
                setInSituTargetBadge(null);
              }}
              onCellSelect={(coord) => {
                // Caso 1: En modo puntería de ataque (RFC Sección 1.3 / Acción Atómica)
                if (targetingState?.actionType === 'attack') {
                  const enemyOnTile = units.find(u => u.x === coord.x && u.y === coord.y && u.owner !== turn);
                  const isTargetValid = targetingState.validTargets.some(t => t.x === coord.x && t.y === coord.y);
                  if (enemyOnTile && isTargetValid && selectedUnit) {
                    const dest = pendingMove?.destination || { x: selectedUnit.x, y: selectedUnit.y };
                    const reachable = reachableCells.find(c => c.x === dest.x && c.y === dest.y) as any;
                    const path = reachable?.path || [{ x: selectedUnit.x, y: selectedUnit.y }, dest];

                    if (handleAtomicMoveAndAttack) {
                      handleAtomicMoveAndAttack({
                        unitId: selectedUnit.id,
                        destination: dest,
                        path,
                        targetEnemyId: enemyOnTile.id,
                      });
                    } else {
                      if (pendingMove) {
                        handleMoveUnit(pendingMove.destination, path);
                      }
                      setTargetEnemyId(enemyOnTile.id);
                      handleExecuteCombat();
                    }
                    setTargetingState(null);
                    setInSituTargetBadge(null);
                    setTileContextMenu(null);
                    setPendingMove(null);
                    return;
                  }
                  // Clic en otra casilla cancela el modo puntería
                  setTargetingState(null);
                  setInSituTargetBadge(null);
                  return;
                }

                // Caso 2: Clic sobre unidad
                const unitOnTile = units.find(u => u.x === coord.x && u.y === coord.y);
                if (unitOnTile) {
                  if (unitOnTile.owner === turn) {
                    setSelectedUnitId(unitOnTile.id);
                    setTileContextMenu(null);
                    setTargetingState(null);
                    setPendingMove(null);
                  } else {
                    setTargetEnemyId(unitOnTile.id);
                  }
                } else {
                  // Caso 3: Clic sobre fábrica aliada vacía -> Producción
                  const clickedTile = matchTiles[coord.y]?.[coord.x];
                  if (clickedTile && clickedTile.type === 'factory' && clickedTile.ownerId === turn) {
                    setSelectedFactoryCoord(coord);
                    setIsProductionModalOpen(true);
                  } else if (selectedUnit && reachableCells.some(c => c.x === coord.x && c.y === coord.y)) {
                    // Caso 4: Movimiento y apertura de menú de sub-acciones contextual en baldosa
                    const unitsMap = new Map<string, TacticalUnit>();
                    convertedUnits.forEach(u => unitsMap.set(u.id, u));
                    const activeTac = convertedUnits.find(u => u.id === selectedUnit.id);
                    if (activeTac) {
                      const actions = evaluateAvailableSubActions({
                        unit: activeTac,
                        destination: coord,
                        hasMoved: activeTac.x !== coord.x || activeTac.y !== coord.y,
                        tiles: matchTiles,
                        unitsMap,
                        gridWidth: matchTiles[0]?.length || 10,
                        gridHeight: matchTiles.length || 10,
                        weather: fowWeather,
                      });

                      if (actions.length > 0) {
                        setPendingMove({ unitId: selectedUnit.id, destination: coord });
                        setTileContextMenu({
                          coord,
                          actions,
                          onSelectAction: (act) => {
                            if (act.type === 'attack') {
                              setTargetingState({ actionType: 'attack', validTargets: act.validTargets || [] });
                              setTileContextMenu(null);
                            } else if (act.type === 'capture') {
                              const reachable = reachableCells.find(c => c.x === coord.x && c.y === coord.y) as any;
                              handleMoveUnit(coord, reachable?.path);
                              handleExecuteCapture();
                              setTileContextMenu(null);
                              setPendingMove(null);
                            } else if (act.type === 'wait') {
                              if (onExecuteSubAction) onExecuteSubAction(act, coord);
                              else handleMoveUnit(coord);
                              setTileContextMenu(null);
                              setPendingMove(null);
                            } else {
                              if (onExecuteSubAction) onExecuteSubAction(act, coord);
                              else handleMoveUnit(coord);
                              setTileContextMenu(null);
                              setPendingMove(null);
                            }
                          },
                          onCancel: () => {
                            setTileContextMenu(null);
                            setPendingMove(null);
                          },
                        });
                      } else {
                        handleMoveUnit(coord);
                      }
                    }
                  }
                }
              }}
              width={940}
              height={540}
              fogOfWar={{
                enabled: isFogOfWarEnabled,
                visibleCoords: currentVision.visibleTileKeys,
                revealedEnemyUnitIds: currentVision.revealedEnemyUnitIds,
                viewerPlayerId: viewerPerspective,
              }}
              ambushAlert={ambushAlert}
              airdrops={airDrops}
              tileContextMenu={tileContextMenu}
              inSituTargetBadge={inSituTargetBadge}
            />
          </div>
        ) : (
          <div
            className="w-full max-w-md aspect-square bg-slate-900 p-1.5 rounded border border-slate-800 overflow-auto"
            style={{
              display: 'grid',
              gridTemplateColumns: `repeat(${activeMap.width}, minmax(0, 1fr))`,
              gap: '2px',
            }}
          >
            {activeMap.tiles.map((row: any[], y: number) =>
              row.map((tile: any, x: number) => {
                const unitOnTile = units.find(u => u.x === x && u.y === y);
                const isSelected = selectedUnit?.x === x && selectedUnit?.y === y;
                const isReachable = reachableCells.some(c => c.x === x && c.y === y);
                const isTarget = targetEnemy?.x === x && targetEnemy?.y === y;

                const isVisible =
                  !isFogOfWarEnabled ||
                  viewerPerspective === 'spectator' ||
                  currentVision.visibleTileKeys.has(`${x},${y}`);

                const isEnemyVisible =
                  unitOnTile &&
                  (unitOnTile.owner === viewerPerspective ||
                    !isFogOfWarEnabled ||
                    viewerPerspective === 'spectator' ||
                    currentVision.revealedEnemyUnitIds.has(unitOnTile.id));

                return (
                  <button
                    key={`${x}-${y}`}
                    onClick={() => {
                      if (unitOnTile && isEnemyVisible) {
                        if (unitOnTile.owner === 'p1') setSelectedUnitId(unitOnTile.id);
                        if (unitOnTile.owner === 'p2') setTargetEnemyId(unitOnTile.id);
                      } else if (!unitOnTile && tile.type === 'factory' && tile.ownerId === turn) {
                        setSelectedFactoryCoord({ x, y });
                        setIsProductionModalOpen(true);
                      } else if (selectedUnit && isReachable) {
                        handleMoveUnit({ x, y });
                      }
                    }}
                    className={`relative aspect-square rounded flex flex-col items-center justify-center border text-[8px] font-mono select-none bg-slate-950 ${
                      isSelected ? 'ring-2 ring-blue-400' : ''
                    } ${isTarget ? 'ring-2 ring-red-400' : ''} ${
                      isReachable ? 'bg-emerald-950/60 ring-1 ring-emerald-500' : ''
                    }`}
                  >
                    <span className="text-[7px] text-slate-400 uppercase">
                      {isVisible ? tile.type.substring(0, 3) : '?'}
                    </span>
                    {unitOnTile && isEnemyVisible && (
                      <span className="text-[8px] font-bold text-amber-300">
                        {unitOnTile.hp}
                      </span>
                    )}
                  </button>
                );
              })
            )}
          </div>
        )}

        {/* Guía Rápida de Atajos de Teclado (RFC Sección 3 / Anexo A) */}
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-[#2B2C24]/90 backdrop-blur border border-[#7B8A4A]/40 px-3 py-1 rounded-[6px_2px_6px_2px] shadow-[2px_2px_0px_#181914] z-20 text-[10px] font-mono text-[#F2E8D5]/80 pointer-events-none">
          <span className="text-[#C46A3A] font-black">TAB:</span> Sig. Tropa •
          <span className="text-slate-300 font-black"> SPACE:</span> Esperar •
          <span className="text-red-400 font-black"> ESC:</span> Cancelar •
          <span className="text-emerald-400 font-black"> CTRL+ENTER:</span> Fin Turno
        </div>
      </div>

      {/* CONSOLA TÁCTICA LATERAL DESPLEGABLE (SLIDE-OVER DRAWER) - PURGADA DE DEBUG */}
      {isTacticalDrawerOpen && (
        <div className="absolute right-0 top-0 bottom-0 w-full sm:w-[420px] bg-[#2B2C24]/95 backdrop-blur-md border-l-2 border-[#181914] shadow-2xl z-40 flex flex-col p-4 overflow-y-auto font-mono text-slate-200">
          <div className="flex items-center justify-between pb-3 border-b-2 border-[#181914] mb-3">
            <span className="text-xs font-black uppercase text-[#F2E8D5] flex items-center gap-2">
              <SlidersHorizontal className="w-4 h-4 text-[#C46A3A]" />
              Consola de Telemetría Táctica
            </span>
            <button
              onClick={() => setIsTacticalDrawerOpen(false)}
              className="px-2 py-0.5 rounded bg-[#181914] text-[#F2E8D5] text-xs font-bold border border-[#7B8A4A] cursor-pointer"
            >
              ✕
            </button>
          </div>

          <div className="space-y-4 text-xs">
            {/* Parámetros Operativos */}
            <div className="bg-[#181914] p-3 rounded border border-[#7B8A4A]/40 space-y-2">
              <span className="text-[10px] font-bold text-[#7B8A4A] uppercase block">
                Parámetros Operativos
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setGameMode(gameMode === 'vs_bot' ? 'hotseat_2p' : 'vs_bot')}
                  className="px-2 py-1 rounded bg-[#2B2C24] border border-[#7B8A4A] text-[11px] font-bold cursor-pointer"
                >
                  {gameMode === 'vs_bot' ? 'Modo: vs IA (PvE)' : 'Modo: Hotseat (2P)'}
                </button>
                {gameMode === 'vs_bot' && (
                  <select
                    value={botDifficulty}
                    onChange={(e) => setBotDifficulty(e.target.value as BotDifficulty)}
                    className="bg-[#2B2C24] border border-[#7B8A4A] text-emerald-400 rounded px-2 py-1 text-[11px] cursor-pointer"
                  >
                    <option value="easy">Cadete (Fácil)</option>
                    <option value="normal">Comandante (Normal)</option>
                    <option value="hard">General (Difícil)</option>
                  </select>
                )}
              </div>
            </div>

            {/* Cartografía del Teatro */}
            <div className="bg-[#181914] p-3 rounded border border-[#7B8A4A]/40 space-y-2">
              <span className="text-[10px] font-bold text-[#7B8A4A] uppercase block">
                Cartografía del Teatro
              </span>
              <select
                value={selectedMapId}
                onChange={(e) => setSelectedMapId(e.target.value)}
                className="w-full bg-[#2B2C24] border border-[#7B8A4A] text-emerald-300 rounded px-2 py-1 text-[11px] cursor-pointer"
              >
                <optgroup label="Mapas Canónicos">
                  {predefinedMapsMeta.map(m => (
                    <option key={m.id} value={m.id}>
                      {m.name} ({m.width}x{m.height})
                    </option>
                  ))}
                </optgroup>
                {customMaps.length > 0 && (
                  <optgroup label="Mapas Importados AWBW">
                    {customMaps.map(m => (
                      <option key={m.id} value={m.id}>
                        {m.name} ({m.width}x{m.height})
                      </option>
                    ))}
                  </optgroup>
                )}
              </select>
            </div>

            {/* Alto Mando (COs) */}
            <div className="bg-[#181914] p-3 rounded border border-[#7B8A4A]/40 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-[#7B8A4A] uppercase">
                  Alto Mando (COs)
                </span>
                <span className="text-[9px] text-[#7B8A4A]">Perspectiva: {coInspectorView.toUpperCase()}</span>
              </div>
              <COCommandBar
                player={coInspectorView}
                isCurrentTurn={turn === coInspectorView}
                coState={playerCOs[coInspectorView]}
                onSelectCO={(coId) => {
                  setPlayerCOs(prev => ({
                    ...prev,
                    [coInspectorView]: { ...prev[coInspectorView], coId },
                  }));
                }}
                onActivatePower={handleActivateCOPower}
              />
            </div>

            {/* Acciones de Combate y Rendición */}
            <div className="bg-[#181914] p-3 rounded border border-red-950/60 space-y-2">
              <span className="text-[10px] font-bold text-red-400 uppercase block">
                Protocolo de Mando
              </span>
              <button
                onClick={() => {
                  triggerHaptic('error');
                  onRetreatToLobby();
                }}
                className="w-full py-2 px-3 rounded bg-red-950/40 hover:bg-red-900/60 border border-red-700/50 text-red-200 text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-all"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Rendición Táctica / Retirada al Lobby</span>
              </button>
            </div>

            {/* Enlace de Auditoría en Entorno de Desarrollo */}
            {import.meta.env.DEV && (
              <div className="pt-2 border-t border-[#7B8A4A]/20 flex items-center justify-between text-[10px]">
                <button
                  onClick={() => {
                    setIsTacticalDrawerOpen(false);
                    setIsDebugConsoleOpen(true);
                  }}
                  className="text-amber-400/80 hover:text-amber-300 flex items-center gap-1 cursor-pointer font-mono"
                >
                  <Terminal className="w-3 h-3" />
                  <span>Consola Debug (Ctrl+Shift+D)</span>
                </button>
                <span className="text-slate-500">DEV MODE</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL AISLADO DE CONSOLA DE DEPURACIÓN (ESTADO MAYOR) */}
      <DebugDevConsoleModal
        isOpen={isDebugConsoleOpen}
        onClose={() => setIsDebugConsoleOpen(false)}
        isFogOfWarEnabled={isFogOfWarEnabled}
        setIsFogOfWarEnabled={setIsFogOfWarEnabled}
        fowWeather={fowWeather}
        setFowWeather={setFowWeather}
        sonjaSensorActive={sonjaSensorActive}
        setSonjaSensorActive={setSonjaSensorActive}
        onBarkTrigger={onBarkTrigger}
        setIsImportModalOpen={setIsImportModalOpen}
      />
    </div>
  );
};

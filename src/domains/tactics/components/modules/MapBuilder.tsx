/**
 * ==============================================================================
 * TACTICAL STUDIO EDITOR — MÓDULO 1: MAP BUILDER (EDITOR DE MAPAS TÁCTICOS)
 * ==============================================================================
 * Herramienta de desarrollo interna para diseño de mapas competitivos 100% originales.
 * Implementa la especificación de diseño de la skill retro-futurism:
 * - Esquinas asimétricas (40px 10px 40px 10px / 16px 4px 16px 4px).
 * - Sombra sólida dura (box-shadow: 4px 4px 0px #2B2C24).
 * - Paleta canónica: Dark Olive (#46521F), Muted Green (#7B8A4A),
 *   Rust Orange (#C46A3A), Cream (#F2E8D5) y Carbon (#2B2C24).
 * - Herramienta de Simetría Asistida (Rotacional 180°, Horizontal, Vertical).
 * - Validación automática de celdas candidatas a AirDrops (|D1 - D2| <= 1).
 * - Exportador e importador bidireccional (JSON canónico y AWBW raw text).
 */

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  Grid,
  Layers,
  RotateCw,
  FlipHorizontal,
  FlipVertical,
  Download,
  Upload,
  Copy,
  Check,
  Eye,
  Crosshair,
  Sparkles,
  MapPin,
  RefreshCcw,
  Sliders,
  Undo2,
  Redo2,
  AlertTriangle
} from 'lucide-react';
import { TerrainType, GridPosition, TerrainTile } from '@shared';
import { parseAWBWMap } from '@domains/tactics';
import { audioManager } from '@domains/game-feel';

export type SymmetryMode = 'none' | 'rotational_180' | 'horizontal' | 'vertical';

export interface MapBuilderTile {
  type: TerrainType;
  ownerId?: 'p1' | 'p2' | null;
  defenseStars: number;
}

const TILE_PRESETS: { type: TerrainType; label: string; iconText: string; color: string; defaultOwner?: 'p1' | 'p2' }[] = [
  { type: 'plains', label: 'Llanura', iconText: 'Lla', color: '#2d5a27' },
  { type: 'forest', label: 'Bosque', iconText: 'Bos', color: '#1c4218' },
  { type: 'mountain', label: 'Montaña', iconText: 'Mnt', color: '#4a4e51' },
  { type: 'road', label: 'Carretera', iconText: 'Car', color: '#606468' },
  { type: 'river', label: 'Río', iconText: 'Río', color: '#1e488f' },
  { type: 'city', label: 'Ciudad Neutra', iconText: 'Ciu', color: '#8a6529' },
  { type: 'factory', label: 'Fábrica Neutra', iconText: 'Fab', color: '#5e4334' },
  { type: 'airport', label: 'Aeródromo', iconText: 'Air', color: '#4d5b68' },
  { type: 'port', label: 'Puerto Naval', iconText: 'Pto', color: '#20586e' },
  { type: 'commtower', label: 'Torre Com.', iconText: 'Com', color: '#385566' },
  { type: 'sea', label: 'Mar Profundo', iconText: 'Mar', color: '#123060' },
  { type: 'reef', label: 'Arrecife', iconText: 'Arr', color: '#1a4759' },
  { type: 'shoal', label: 'Playa / Vado', iconText: 'Pla', color: '#3a726f' },
  { type: 'hq', label: 'HQ Orange Star (P1)', iconText: 'HQ1', color: '#dc2626', defaultOwner: 'p1' },
  { type: 'hq', label: 'HQ Blue Moon (P2)', iconText: 'HQ2', color: '#2563eb', defaultOwner: 'p2' },
  { type: 'factory', label: 'Fábrica P1 (Roja)', iconText: 'Fb1', color: '#dc2626', defaultOwner: 'p1' },
  { type: 'factory', label: 'Fábrica P2 (Azul)', iconText: 'Fb2', color: '#2563eb', defaultOwner: 'p2' },
];

export const MapBuilder: React.FC = () => {
  // Dimensiones del escenario en edición
  const [width, setWidth] = useState<number>(10);
  const [height, setHeight] = useState<number>(10);
  const [mapName, setMapName] = useState<string>('Arena Espejo 10x10 Original');
  const [authorName, setAuthorName] = useState<string>('Dev Team / Tactical Studio');

  // Matriz de losetas en edición
  const [grid, setGrid] = useState<MapBuilderTile[][]>(() => {
    return Array.from({ length: 10 }, (_, y) =>
      Array.from({ length: 10 }, (_, x) => {
        if (x === 0 && y === 0) return { type: 'hq', ownerId: 'p1', defenseStars: 4 };
        if (x === 9 && y === 9) return { type: 'hq', ownerId: 'p2', defenseStars: 4 };
        if (x === 1 && y === 0) return { type: 'factory', ownerId: 'p1', defenseStars: 3 };
        if (x === 8 && y === 9) return { type: 'factory', ownerId: 'p2', defenseStars: 3 };
        return { type: 'plains', defenseStars: 1 };
      })
    );
  });

  // Herramientas activas
  const [selectedBrush, setSelectedBrush] = useState<typeof TILE_PRESETS[0]>(TILE_PRESETS[0]);
  const [symmetryMode, setSymmetryMode] = useState<SymmetryMode>('rotational_180');
  const [showAirDropHeatmap, setShowAirDropHeatmap] = useState<boolean>(true);
  const [isMouseDown, setIsMouseDown] = useState<boolean>(false);
  const [copiedNotification, setCopiedNotification] = useState<string | null>(null);

  // Estados de exportación / importación modal
  const [ioText, setIoText] = useState<string>('');
  const [ioMode, setIoMode] = useState<'none' | 'export_json' | 'export_awbw' | 'import'>('none');

  // Buffer de Deshacer / Rehacer (Hasta 20 pasos de historia para resiliencia de creación)
  const historyRef = useRef<MapBuilderTile[][][]>([]);
  const historyIndexRef = useRef<number>(-1);
  const [canUndo, setCanUndo] = useState<boolean>(false);
  const [canRedo, setCanRedo] = useState<boolean>(false);

  // Confirmación de seguridad para vaciado de mapa
  const [confirmClear, setConfirmClear] = useState<boolean>(false);

  const updateUndoRedoState = () => {
    setCanUndo(historyIndexRef.current > 0);
    setCanRedo(historyIndexRef.current < historyRef.current.length - 1);
  };

  const pushSnapshot = useCallback((newGrid: MapBuilderTile[][]) => {
    // Truncar historial si estábamos en medio de la pila
    const newHistory = historyRef.current.slice(0, historyIndexRef.current + 1);
    newHistory.push(newGrid.map(row => row.map(cell => ({ ...cell }))));
    if (newHistory.length > 20) {
      newHistory.shift();
    }
    historyRef.current = newHistory;
    historyIndexRef.current = newHistory.length - 1;
    updateUndoRedoState();
  }, []);

  // Inicializar primer snapshot del historial
  useEffect(() => {
    if (historyRef.current.length === 0) {
      historyRef.current = [grid.map(row => row.map(cell => ({ ...cell })))];
      historyIndexRef.current = 0;
      updateUndoRedoState();
    }
  }, []);

  const handleUndo = useCallback(() => {
    if (historyIndexRef.current > 0) {
      historyIndexRef.current -= 1;
      const targetGrid = historyRef.current[historyIndexRef.current];
      setGrid(targetGrid.map(row => row.map(cell => ({ ...cell }))));
      audioManager.playSFX('button_click');
      updateUndoRedoState();
    }
  }, []);

  const handleRedo = useCallback(() => {
    if (historyIndexRef.current < historyRef.current.length - 1) {
      historyIndexRef.current += 1;
      const targetGrid = historyRef.current[historyIndexRef.current];
      setGrid(targetGrid.map(row => row.map(cell => ({ ...cell }))));
      audioManager.playSFX('button_click');
      updateUndoRedoState();
    }
  }, []);

  // Hotkeys globales de Undo / Redo (Ctrl+Z y Ctrl+Y / Ctrl+Shift+Z)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if ((e.ctrlKey || e.metaKey) && (e.key === 'z' || e.key === 'Z')) {
        if (e.shiftKey) {
          e.preventDefault();
          handleRedo();
        } else {
          e.preventDefault();
          handleUndo();
        }
      } else if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || e.key === 'Y')) {
        e.preventDefault();
        handleRedo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleUndo, handleRedo]);

  // Redimensionar cuadrícula preservando celdas existentes
  const handleResize = (newW: number, newH: number) => {
    const clampedW = Math.max(8, Math.min(32, newW));
    const clampedH = Math.max(8, Math.min(32, newH));
    setWidth(clampedW);
    setHeight(clampedH);

    setGrid(prev => {
      const nextGrid: MapBuilderTile[][] = [];
      for (let y = 0; y < clampedH; y++) {
        const row: MapBuilderTile[] = [];
        for (let x = 0; x < clampedW; x++) {
          if (prev[y]?.[x]) {
            row.push({ ...prev[y][x] });
          } else {
            row.push({ type: 'plains', defenseStars: 1 });
          }
        }
        nextGrid.push(row);
      }
      pushSnapshot(nextGrid);
      return nextGrid;
    });
  };

  // Pintar celda respetando la simetría asistida
  const paintCell = useCallback(
    (x: number, y: number) => {
      if (x < 0 || x >= width || y < 0 || y >= height) return;

      audioManager.playHoverTick();

      const defenseStars =
        selectedBrush.type === 'mountain' || selectedBrush.type === 'hq'
          ? 4
          : selectedBrush.type === 'city' || selectedBrush.type === 'factory'
          ? 3
          : selectedBrush.type === 'forest'
          ? 2
          : 1;

      const newTile: MapBuilderTile = {
        type: selectedBrush.type,
        ownerId: selectedBrush.defaultOwner || null,
        defenseStars,
      };

      setGrid(prev => {
        const next = prev.map(row => row.map(cell => ({ ...cell })));
        next[y][x] = { ...newTile };

        // Aplicar simetría asistida
        if (symmetryMode === 'rotational_180') {
          const symX = width - 1 - x;
          const symY = height - 1 - y;
          if (symX >= 0 && symX < width && symY >= 0 && symY < height) {
            let mirrorOwner = newTile.ownerId;
            if (mirrorOwner === 'p1') mirrorOwner = 'p2';
            else if (mirrorOwner === 'p2') mirrorOwner = 'p1';

            next[symY][symX] = {
              ...newTile,
              ownerId: mirrorOwner,
            };
          }
        } else if (symmetryMode === 'horizontal') {
          const symX = width - 1 - x;
          if (symX >= 0 && symX < width) {
            next[y][symX] = { ...newTile };
          }
        } else if (symmetryMode === 'vertical') {
          const symY = height - 1 - y;
          if (symY >= 0 && symY < height) {
            next[symY][x] = { ...newTile };
          }
        }

        pushSnapshot(next);
        return next;
      });
    },
    [width, height, selectedBrush, symmetryMode, pushSnapshot]
  );

  // Localizar HQs para el mapa de calor de AirDrops
  const airDropCandidates = useMemo(() => {
    let hq1: GridPosition | null = null;
    let hq2: GridPosition | null = null;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const tile = grid[y]?.[x];
        if (tile && tile.type === 'hq') {
          if (tile.ownerId === 'p1') hq1 = { x, y };
          if (tile.ownerId === 'p2') hq2 = { x, y };
        }
      }
    }

    if (!hq1) hq1 = { x: 0, y: 0 };
    if (!hq2) hq2 = { x: width - 1, y: height - 1 };

    const candidates = new Set<string>();
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const tile = grid[y]?.[x];
        if (!tile) continue;
        if (tile.type === 'sea' || tile.type === 'mountain' || tile.type === 'hq') continue;

        const d1 = Math.abs(x - hq1.x) + Math.abs(y - hq1.y);
        const d2 = Math.abs(x - hq2.x) + Math.abs(y - hq2.y);
        if (Math.abs(d1 - d2) <= 1) {
          candidates.add(`${x},${y}`);
        }
      }
    }

    return candidates;
  }, [grid, width, height]);

  // Exportar a JSON canónico
  const handleExportJSON = () => {
    const canonicalMapData = {
      id: `map_${Date.now()}`,
      name: mapName,
      author: authorName,
      width,
      height,
      tiles: grid.map((row, y) =>
        row.map((cell, x) => ({
          x,
          y,
          type: cell.type,
          defenseStars: cell.defenseStars,
          ownerId: cell.ownerId || undefined,
        }))
      ),
      startingUnits: [],
    };
    setIoText(JSON.stringify(canonicalMapData, null, 2));
    setIoMode('export_json');
  };

  // Exportar a formato AWBW
  const handleExportAWBW = () => {
    // Generar representación compacta AWBW CSV
    const rows = grid.map(row => {
      return row
        .map(cell => {
          if (cell.type === 'plains') return '1';
          if (cell.type === 'forest') return '2';
          if (cell.type === 'mountain') return '3';
          if (cell.type === 'road') return '4';
          if (cell.type === 'river') return '5';
          if (cell.type === 'sea') return '6';
          if (cell.type === 'city') return cell.ownerId === 'p1' ? '14' : cell.ownerId === 'p2' ? '15' : '13';
          if (cell.type === 'factory') return cell.ownerId === 'p1' ? '17' : cell.ownerId === 'p2' ? '18' : '16';
          if (cell.type === 'hq') return cell.ownerId === 'p1' ? '20' : '21';
          return '1';
        })
        .join(',');
    });
    setIoText(rows.join('\n'));
    setIoMode('export_awbw');
  };

  // Importar desde JSON o texto crudo AWBW
  const handleImport = () => {
    try {
      const trimmed = ioText.trim();
      if (trimmed.startsWith('{')) {
        const parsed = JSON.parse(trimmed);
        if (parsed.width && parsed.height && parsed.tiles) {
          setWidth(parsed.width);
          setHeight(parsed.height);
          if (parsed.name) setMapName(parsed.name);
          setGrid(parsed.tiles);
          setIoMode('none');
          return;
        }
      }

      // Si no es JSON, intentar parsear AWBW
      const parsedAWBW = parseAWBWMap(trimmed, { name: mapName });
      setWidth(parsedAWBW.width);
      setHeight(parsedAWBW.height);
      setGrid(
        parsedAWBW.tiles.map(row =>
          row.map(t => ({
            type: t.type,
            ownerId: t.ownerId as any,
            defenseStars: t.defenseStars,
          }))
        )
      );
      setIoMode('none');
    } catch (err: any) {
      alert(`Error al importar mapa: ${err.message}`);
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-[#2B2C24] text-[#F2E8D5] font-mono p-4 sm:p-6 overflow-y-auto select-none">
      {/* Cabecera Atompunk del Map Builder */}
      <div className="bg-[#46521F] border-2 border-[#2B2C24] rounded-[24px_6px_24px_6px] p-4 shadow-[6px_6px_0px_#2B2C24] mb-4 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-[8px_2px_8px_2px] bg-[#C46A3A] text-[#F2E8D5] font-black text-xs uppercase tracking-wider border border-[#2B2C24]">
              DEV TOOL
            </span>
            <h1 className="text-lg font-black tracking-wide text-[#F2E8D5] flex items-center gap-2">
              <Grid className="w-5 h-5 text-[#C46A3A]" />
              TACTICAL STUDIO: MAP BUILDER
            </h1>
          </div>
          <p className="text-xs text-[#F2E8D5]/80 mt-1">
            Diseñador canónico de escenarios militares con simetría asistida 180° y validación de AirDrops.
          </p>
        </div>

        {/* Acciones de Edición, Exportación e Importación */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Botones de Deshacer / Rehacer con Atajos Visibles */}
          <button
            onClick={handleUndo}
            disabled={!canUndo}
            onMouseEnter={() => canUndo && audioManager.playHoverTick()}
            className={`px-3 py-1.5 font-bold text-xs rounded-[10px_3px_10px_3px] border border-[#0A0B08] shadow-[3px_3px_0px_#0A0B08] flex items-center gap-1.5 transition-all ${
              canUndo
                ? 'bg-[#2B2C24] hover:bg-[#383a2e] text-[#F2E8D5] cursor-pointer active:translate-x-0.5 active:translate-y-0.5'
                : 'bg-[#2B2C24]/40 text-[#7B8A4A]/50 border-transparent cursor-not-allowed shadow-none'
            }`}
            title="Deshacer última acción (Ctrl + Z)"
          >
            <Undo2 className="w-3.5 h-3.5" />
            <span>Deshacer</span>
            <span className="text-[9px] text-amber-300/80 font-mono hidden sm:inline">[Ctrl+Z]</span>
          </button>

          <button
            onClick={handleRedo}
            disabled={!canRedo}
            onMouseEnter={() => canRedo && audioManager.playHoverTick()}
            className={`px-3 py-1.5 font-bold text-xs rounded-[10px_3px_10px_3px] border border-[#0A0B08] shadow-[3px_3px_0px_#0A0B08] flex items-center gap-1.5 transition-all ${
              canRedo
                ? 'bg-[#2B2C24] hover:bg-[#383a2e] text-[#F2E8D5] cursor-pointer active:translate-x-0.5 active:translate-y-0.5'
                : 'bg-[#2B2C24]/40 text-[#7B8A4A]/50 border-transparent cursor-not-allowed shadow-none'
            }`}
            title="Rehacer acción (Ctrl + Y)"
          >
            <Redo2 className="w-3.5 h-3.5" />
            <span>Rehacer</span>
            <span className="text-[9px] text-amber-300/80 font-mono hidden sm:inline">[Ctrl+Y]</span>
          </button>

          <span className="text-[#7B8A4A]">|</span>

          <button
            onClick={handleExportJSON}
            onMouseEnter={() => audioManager.playHoverTick()}
            className="px-3 py-1.5 bg-[#7B8A4A] hover:bg-[#68763d] text-[#F2E8D5] font-bold text-xs rounded-[10px_3px_10px_3px] border border-[#0A0B08] shadow-[3px_3px_0px_#0A0B08] flex items-center gap-1.5 cursor-pointer active:translate-x-0.5 active:translate-y-0.5"
          >
            <Download className="w-3.5 h-3.5" /> Exportar JSON
          </button>
          <button
            onClick={handleExportAWBW}
            onMouseEnter={() => audioManager.playHoverTick()}
            className="px-3 py-1.5 bg-[#46521F] hover:bg-[#384219] text-[#F2E8D5] font-bold text-xs rounded-[10px_3px_10px_3px] border border-[#0A0B08] shadow-[3px_3px_0px_#0A0B08] flex items-center gap-1.5 cursor-pointer active:translate-x-0.5 active:translate-y-0.5"
          >
            <Download className="w-3.5 h-3.5" /> Exportar AWBW
          </button>
          <button
            onClick={() => {
              audioManager.playSFX('button_click');
              setIoText('');
              setIoMode('import');
            }}
            onMouseEnter={() => audioManager.playHoverTick()}
            className="px-3 py-1.5 bg-[#C46A3A] hover:bg-[#b05c2e] text-[#F2E8D5] font-bold text-xs rounded-[10px_3px_10px_3px] border border-[#0A0B08] shadow-[3px_3px_0px_#0A0B08] flex items-center gap-1.5 cursor-pointer active:translate-x-0.5 active:translate-y-0.5"
          >
            <Upload className="w-3.5 h-3.5" /> Importar Mapa
          </button>
        </div>
      </div>

      {/* Barra de Configuración de Cuadrícula y Simetría */}
      <div className="bg-[#46521F] border-2 border-[#2B2C24] rounded-[18px_4px_18px_4px] p-3 shadow-[4px_4px_0px_#2B2C24] mb-4 flex flex-wrap items-center justify-between gap-3 text-xs">
        {/* Metadatos y Dimensiones */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="text-[#F2E8D5]/70">Mapa:</span>
            <input
              type="text"
              value={mapName}
              onChange={e => setMapName(e.target.value)}
              className="bg-[#2B2C24] border border-[#7B8A4A] text-[#F2E8D5] px-2 py-1 rounded text-xs focus:outline-none w-48"
            />
          </div>

          <div className="flex items-center gap-1 bg-[#2B2C24] px-2 py-1 rounded border border-[#7B8A4A]">
            <span className="text-[#F2E8D5]/70">Dimensiones:</span>
            <select
              value={`${width}x${height}`}
              onChange={e => {
                const [w, h] = e.target.value.split('x').map(Number);
                handleResize(w, h);
              }}
              className="bg-transparent text-[#F2E8D5] font-bold focus:outline-none cursor-pointer"
            >
              <option value="10x10">10 x 10 (Duelo Espejo)</option>
              <option value="16x16">16 x 16 (Blitz Skirmish)</option>
              <option value="20x20">20 x 20 (Batalla Estándar)</option>
              <option value="28x28">28 x 28 (Gran Campaña)</option>
            </select>
          </div>
        </div>

        {/* Herramientas de Simetría Asistida */}
        <div className="flex items-center gap-1.5">
          <span className="text-[#F2E8D5]/70 flex items-center gap-1">
            <Sliders className="w-3.5 h-3.5 text-[#C46A3A]" /> Simetría:
          </span>

          <button
            onClick={() => setSymmetryMode('rotational_180')}
            className={`px-2.5 py-1 rounded-[8px_2px_8px_2px] border text-xs font-bold flex items-center gap-1 transition-all cursor-pointer ${
              symmetryMode === 'rotational_180'
                ? 'bg-[#C46A3A] border-[#2B2C24] text-[#F2E8D5] shadow-[2px_2px_0px_#2B2C24]'
                : 'bg-[#2B2C24] border-[#7B8A4A] text-[#F2E8D5]/70 hover:text-white'
            }`}
            title="Simetría Rotacional 180°: Obligatoria para balance competitivo"
          >
            <RotateCw className="w-3 h-3" /> 180° Espejo
          </button>

          <button
            onClick={() => setSymmetryMode('horizontal')}
            className={`px-2 py-1 rounded-[8px_2px_8px_2px] border text-xs font-bold flex items-center gap-1 transition-all cursor-pointer ${
              symmetryMode === 'horizontal'
                ? 'bg-[#C46A3A] border-[#2B2C24] text-[#F2E8D5] shadow-[2px_2px_0px_#2B2C24]'
                : 'bg-[#2B2C24] border-[#7B8A4A] text-[#F2E8D5]/70 hover:text-white'
            }`}
          >
            <FlipHorizontal className="w-3 h-3" /> Horiz
          </button>

          <button
            onClick={() => setSymmetryMode('vertical')}
            className={`px-2 py-1 rounded-[8px_2px_8px_2px] border text-xs font-bold flex items-center gap-1 transition-all cursor-pointer ${
              symmetryMode === 'vertical'
                ? 'bg-[#C46A3A] border-[#2B2C24] text-[#F2E8D5] shadow-[2px_2px_0px_#2B2C24]'
                : 'bg-[#2B2C24] border-[#7B8A4A] text-[#F2E8D5]/70 hover:text-white'
            }`}
          >
            <FlipVertical className="w-3 h-3" /> Vert
          </button>

          <button
            onClick={() => setSymmetryMode('none')}
            className={`px-2 py-1 rounded-[8px_2px_8px_2px] border text-xs font-bold transition-all cursor-pointer ${
              symmetryMode === 'none'
                ? 'bg-[#C46A3A] border-[#2B2C24] text-[#F2E8D5] shadow-[2px_2px_0px_#2B2C24]'
                : 'bg-[#2B2C24] border-[#7B8A4A] text-[#F2E8D5]/70 hover:text-white'
            }`}
          >
            Libre
          </button>

          <span className="text-[#7B8A4A]">|</span>

          {/* Interruptor de Mapa de Calor de AirDrops */}
          <button
            onClick={() => setShowAirDropHeatmap(prev => !prev)}
            className={`px-2.5 py-1 rounded-[8px_2px_8px_2px] border text-xs font-bold flex items-center gap-1 transition-all cursor-pointer ${
              showAirDropHeatmap
                ? 'bg-[#7B8A4A] border-[#2B2C24] text-[#F2E8D5] shadow-[2px_2px_0px_#2B2C24]'
                : 'bg-[#2B2C24] border-[#7B8A4A] text-[#F2E8D5]/70'
            }`}
            title="Muestra las casillas candidatas donde pueden caer los AirDrops (|D1 - D2| <= 1)"
          >
            <MapPin className="w-3 h-3 text-amber-300" />
            <span>Zona AirDrops</span>
          </button>
        </div>
      </div>

      {/* Cuerpo Principal: Paleta de Baldosas a la Izquierda y Lienzo Interactivo al Centro */}
      <div className="flex-1 flex flex-col lg:flex-row gap-4 items-start overflow-hidden">
        {/* Paleta de Baldosas y Pinceles */}
        <div className="w-full lg:w-64 bg-[#46521F] border-2 border-[#2B2C24] rounded-[18px_4px_18px_4px] p-3 shadow-[4px_4px_0px_#2B2C24] flex flex-col gap-2 shrink-0">
          <div className="flex items-center justify-between pb-1.5 border-b border-[#7B8A4A] text-xs font-bold">
            <span className="flex items-center gap-1.5 text-[#F2E8D5]">
              <Layers className="w-3.5 h-3.5 text-[#C46A3A]" /> Pincel de Terreno
            </span>
            <span className="text-[#C46A3A]">{selectedBrush.label}</span>
          </div>

          <div className="grid grid-cols-2 gap-1.5 max-h-[480px] overflow-y-auto pr-1">
            {TILE_PRESETS.map((p, idx) => {
              const isSelected = selectedBrush === p;
              return (
                <button
                  key={`${p.type}_${p.defaultOwner || 'neu'}_${idx}`}
                  onClick={() => setSelectedBrush(p)}
                  className={`p-2 rounded-[8px_2px_8px_2px] border text-left text-[11px] font-bold flex items-center gap-2 transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-[#C46A3A] border-[#2B2C24] text-[#F2E8D5] shadow-[2px_2px_0px_#2B2C24]'
                      : 'bg-[#2B2C24] border-[#7B8A4A]/60 text-[#F2E8D5]/80 hover:bg-[#34362c]'
                  }`}
                >
                  <span
                    className="w-4 h-4 rounded text-[8px] font-mono flex items-center justify-center font-black border border-[#2B2C24] shrink-0"
                    style={{ backgroundColor: p.color }}
                  >
                    {p.iconText[0]}
                  </span>
                  <span className="truncate">{p.label}</span>
                </button>
              );
            })}
          </div>

          <div className="pt-2 border-t border-[#7B8A4A] text-[10px] text-[#F2E8D5]/70 flex items-center justify-between">
            <span>AirDrops: {airDropCandidates.size} celdas</span>
            {confirmClear ? (
              <button
                onClick={() => {
                  const clearedGrid = grid.map(row => row.map(() => ({ type: 'plains' as TerrainType, defenseStars: 1 })));
                  setGrid(clearedGrid);
                  pushSnapshot(clearedGrid);
                  audioManager.playSFX('button_click');
                  setConfirmClear(false);
                }}
                className="px-2 py-0.5 rounded bg-rose-600 hover:bg-rose-500 text-white font-black text-[9px] uppercase cursor-pointer flex items-center gap-1 border border-[#0A0B08] animate-pulse"
                title="Haz clic de nuevo para vaciar todo el mapa"
              >
                <AlertTriangle className="w-2.5 h-2.5" /> ¿Confirmar vaciado?
              </button>
            ) : (
              <button
                onClick={() => {
                  audioManager.playHoverTick();
                  setConfirmClear(true);
                  setTimeout(() => setConfirmClear(false), 3500);
                }}
                className="hover:text-amber-400 cursor-pointer flex items-center gap-1 text-[10px]"
                title="Limpiar mapa a llanuras (requiere 2 clics para prevenir pérdidas)"
              >
                <RefreshCcw className="w-2.5 h-2.5" /> Limpiar
              </button>
            )}
          </div>
        </div>

        {/* Cuadrícula Táctica Interactiva */}
        <div
          className="flex-1 bg-[#2B2C24] border-2 border-[#7B8A4A] rounded-[20px_5px_20px_5px] p-3 shadow-[6px_6px_0px_#2B2C24] overflow-auto flex items-center justify-center min-h-[500px] w-full"
          onMouseDown={() => setIsMouseDown(true)}
          onMouseUp={() => setIsMouseDown(false)}
          onMouseLeave={() => setIsMouseDown(false)}
        >
          <div
            className="grid gap-[2px] bg-[#2B2C24] p-1.5 rounded border border-[#7B8A4A]/50 shadow-inner"
            style={{
              gridTemplateColumns: `repeat(${width}, minmax(0, 1fr))`,
            }}
          >
            {grid.map((row, y) =>
              row.map((cell, x) => {
                const isAirDropZone = showAirDropHeatmap && airDropCandidates.has(`${x},${y}`);

                // Color del terreno
                let bgStyle = '#2d5a27'; // plains
                if (cell.type === 'forest') bgStyle = '#1c4218';
                if (cell.type === 'mountain') bgStyle = '#4a4e51';
                if (cell.type === 'road') bgStyle = '#606468';
                if (cell.type === 'river') bgStyle = '#1e488f';
                if (cell.type === 'city') bgStyle = cell.ownerId === 'p1' ? '#991b1b' : cell.ownerId === 'p2' ? '#1e40af' : '#8a6529';
                if (cell.type === 'factory') bgStyle = cell.ownerId === 'p1' ? '#b91c1c' : cell.ownerId === 'p2' ? '#1d4ed8' : '#5e4334';
                if (cell.type === 'hq') bgStyle = cell.ownerId === 'p1' ? '#7f1d1d' : '#1e3a8a';
                if (cell.type === 'airport') bgStyle = '#4d5b68';
                if (cell.type === 'port') bgStyle = '#20586e';
                if (cell.type === 'commtower') bgStyle = '#385566';
                if (cell.type === 'sea') bgStyle = '#123060';
                if (cell.type === 'reef') bgStyle = '#1a4759';
                if (cell.type === 'shoal') bgStyle = '#3a726f';

                return (
                  <div
                    key={`tile_${x}_${y}`}
                    onMouseDown={() => paintCell(x, y)}
                    onMouseEnter={() => {
                      if (isMouseDown) paintCell(x, y);
                    }}
                    style={{ backgroundColor: bgStyle }}
                    className={`w-9 h-9 sm:w-11 sm:h-11 rounded-[4px] border border-[#2B2C24]/80 flex flex-col items-center justify-center relative cursor-crosshair transition-all hover:scale-105 hover:z-10 shadow-sm ${
                      isAirDropZone ? 'ring-2 ring-amber-400 ring-inset' : ''
                    }`}
                    title={`(${x}, ${y}) - ${cell.type.toUpperCase()}${cell.ownerId ? ` [${cell.ownerId.toUpperCase()}]` : ''}`}
                  >
                    <span className="text-[9px] font-black text-[#F2E8D5] uppercase drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
                      {cell.type === 'hq'
                        ? cell.ownerId === 'p1'
                          ? 'HQ1'
                          : 'HQ2'
                        : cell.type === 'factory'
                        ? cell.ownerId === 'p1'
                          ? 'FB1'
                          : cell.ownerId === 'p2'
                          ? 'FB2'
                          : 'FAB'
                        : cell.type === 'plains'
                        ? ''
                        : cell.type.substring(0, 3)}
                    </span>

                    {/* Indicador de zona AirDrop */}
                    {isAirDropZone && (
                      <span className="absolute top-0.5 right-0.5 w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
                    )}

                    {/* Estrellas defensivas de terreno */}
                    {cell.defenseStars > 1 && (
                      <span className="absolute bottom-0.5 left-1 text-[7px] text-amber-300 font-bold opacity-80">
                        {cell.defenseStars}★
                      </span>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Modal de Importación / Exportación */}
      {ioMode !== 'none' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#2B2C24]/85 backdrop-blur-md">
          <div className="relative w-full max-w-xl bg-[#46521F] border-2 border-[#2B2C24] rounded-[24px_6px_24px_6px] p-5 shadow-[10px_10px_0px_#2B2C24] font-mono text-[#F2E8D5] flex flex-col gap-3">
            <div className="flex items-center justify-between pb-2 border-b border-[#7B8A4A]">
              <h2 className="text-sm font-black uppercase tracking-wider text-[#F2E8D5]">
                {ioMode === 'export_json' && 'Exportar Mapa (JSON Canónico)'}
                {ioMode === 'export_awbw' && 'Exportar Mapa (Texto Plano AWBW)'}
                {ioMode === 'import' && 'Importar Escenario (JSON o AWBW)'}
              </h2>
              <button
                onClick={() => setIoMode('none')}
                className="text-xs text-[#F2E8D5]/70 hover:text-white cursor-pointer"
              >
                ✕ Cerrar
              </button>
            </div>

            <textarea
              value={ioText}
              onChange={e => setIoText(e.target.value)}
              placeholder={
                ioMode === 'import'
                  ? 'Pega aquí el código JSON canónico o la matriz de texto crudo de AWBW...'
                  : ''
              }
              rows={12}
              className="w-full bg-[#2B2C24] border border-[#7B8A4A] text-[#F2E8D5] p-3 rounded text-xs font-mono focus:outline-none resize-none"
            />

            <div className="flex items-center justify-between pt-2 border-t border-[#7B8A4A]">
              {ioMode === 'import' ? (
                <button
                  onClick={handleImport}
                  className="px-4 py-2 bg-[#C46A3A] hover:bg-[#b05c2e] text-[#F2E8D5] font-bold text-xs rounded-[10px_3px_10px_3px] border border-[#2B2C24] shadow-[3px_3px_0px_#2B2C24] cursor-pointer"
                >
                  Procesar e Importar al Lienzo
                </button>
              ) : (
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(ioText);
                    setCopiedNotification('¡Copiado al portapapeles!');
                    setTimeout(() => setCopiedNotification(null), 2000);
                  }}
                  className="px-4 py-2 bg-[#7B8A4A] hover:bg-[#68763d] text-[#F2E8D5] font-bold text-xs rounded-[10px_3px_10px_3px] border border-[#2B2C24] shadow-[3px_3px_0px_#2B2C24] flex items-center gap-1.5 cursor-pointer"
                >
                  <Copy className="w-3.5 h-3.5" /> Copiar al Portapapeles
                </button>
              )}

              {copiedNotification && (
                <span className="text-xs text-amber-300 font-bold flex items-center gap-1">
                  <Check className="w-3.5 h-3.5" /> {copiedNotification}
                </span>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

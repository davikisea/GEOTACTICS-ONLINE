import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { Volume2, VolumeX, Music, Sparkles } from 'lucide-react';
import { GridPosition, TacticalUnit, TerrainTile, TerrainType } from '../../types';
import { assetLoader } from '../../engine/assetLoader';
import { audioManager, SfxType } from '../../engine/audioManager';
import { triggerHaptic } from '../../engine/hapticFeedback';
import { AirDrop } from '../../engine/airdropSystem';
import { AvailableSubAction } from '../../engine/subActions';
import { TileContextMenu } from './TileContextMenu';

export interface InSituTargetBadgeData {
  coord: GridPosition;
  attackerName: string;
  defenderName: string;
  estimatedDamage: number;
  counterDamage: number;
  canCounter: boolean;
  defenderHp: number;
  terrainStars?: number;
}

export interface TileContextMenuData {
  coord: GridPosition;
  actions: AvailableSubAction[];
  onSelectAction: (action: AvailableSubAction) => void;
  onCancel: () => void;
}

export interface FogOfWarVisualConfig {
  enabled: boolean;
  visibleCoords: Set<string>;
  revealedEnemyUnitIds: Set<string>;
  viewerPlayerId: string;
}

export interface AmbushAlert {
  coord: GridPosition;
  text: string;
  startTime: number;
}

export interface GameCanvasProps {
  tiles: TerrainTile[][];
  units?: TacticalUnit[];
  selectedCoord?: GridPosition | null;
  reachableCoords?: GridPosition[];
  targetCoords?: GridPosition[];
  onCellSelect?: (coord: GridPosition) => void;
  onCellHover?: (coord: GridPosition | null) => void;
  width?: number;
  height?: number;
  fogOfWar?: FogOfWarVisualConfig | null;
  ambushAlert?: AmbushAlert | null;
  airdrops?: AirDrop[];
  tileContextMenu?: TileContextMenuData | null;
  inSituTargetBadge?: InSituTargetBadgeData | null;
}

const TILE_SIZE = 48; // Tamaño base de tile en píxeles

// Paleta de colores militares tácticos para renderizado procedural de terreno
const TERRAIN_PALETTE: Record<TerrainType, { bg: string; border: string; detail: string; label: string }> = {
  plains:   { bg: '#2d5a27', border: '#1e3f1a', detail: '#3b7433', label: 'Llanura' },
  forest:   { bg: '#1c4218', border: '#0f290d', detail: '#143311', label: 'Bosque' },
  mountain: { bg: '#4a4e51', border: '#2e3133', detail: '#6c7276', label: 'Montaña' },
  road:     { bg: '#606468', border: '#404346', detail: '#d0d4d8', label: 'Carretera' },
  river:    { bg: '#1e488f', border: '#122c59', detail: '#2f6bc4', label: 'Río' },
  city:     { bg: '#8a6529', border: '#594018', detail: '#d4a24a', label: 'Ciudad' },
  factory:  { bg: '#5e4334', border: '#3b291f', detail: '#966a52', label: 'Fábrica' },
  airport:  { bg: '#4d5b68', border: '#2f3942', detail: '#8193a3', label: 'Aeródromo' },
  port:     { bg: '#20586e', border: '#123745', detail: '#3888a6', label: 'Puerto' },
  hq:       { bg: '#54206e', border: '#341245', detail: '#8b38b5', label: 'Cuartel Gral' },
  sea:      { bg: '#123060', border: '#091c3b', detail: '#1a458a', label: 'Océano' },
  reef:     { bg: '#1a4759', border: '#0d2833', detail: '#276882', label: 'Arrecife' },
  shoal:    { bg: '#3a726f', border: '#1f4846', detail: '#63b2ad', label: 'Playa' },
  bridge:   { bg: '#735738', border: '#42311f', detail: '#a37e55', label: 'Puente' },
  commtower:{ bg: '#385566', border: '#20323d', detail: '#5ca2c9', label: 'Torre Com.' },
  silo:     { bg: '#4f5459', border: '#2f3236', detail: '#8b949e', label: 'Silo Misil' },
  lab:      { bg: '#3e5449', border: '#24332c', detail: '#659c81', label: 'Laboratorio' },
  pipe:     { bg: '#5c636b', border: '#33373b', detail: '#8a949f', label: 'Oleoducto' },
};

export const GameCanvas: React.FC<GameCanvasProps> = ({
  tiles,
  units = [],
  selectedCoord = null,
  reachableCoords = [],
  targetCoords = [],
  onCellSelect,
  onCellHover,
  width = 640,
  height = 560,
  fogOfWar = null,
  ambushAlert = null,
  airdrops = [],
  tileContextMenu = null,
  inSituTargetBadge = null,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Dimensiones dinámicas con ResizeObserver para pantalla completa sin bordes negros
  const [dimensions, setDimensions] = useState<{ width: number; height: number }>({
    width: width || 800,
    height: height || 600,
  });

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver(entries => {
      for (const entry of entries) {
        const { width: w, height: h } = entry.contentRect;
        if (w > 20 && h > 20) {
          setDimensions({ width: Math.floor(w), height: Math.floor(h) });
        }
      }
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const viewportW = dimensions.width;
  const viewportH = dimensions.height;

  // Referencias para discriminación de gestos táctiles (RFC Sección 3 / Anexo B)
  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null);
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Gestos Multitáctiles: Pinch-to-Zoom & Doble Toque (Fase 2)
  const pinchRef = useRef<{ dist: number; center: { x: number; y: number } } | null>(null);
  const lastTapRef = useRef<{ coord: GridPosition; time: number; x: number; y: number } | null>(null);

  // Estados de Cámara: Panning (Desplazamiento) y Zoom
  const [camera, setCamera] = useState({
    x: 40,
    y: 40,
    zoom: 1.0,
  });

  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [hoveredCoord, setHoveredCoord] = useState<GridPosition | null>(null);

  // Estados de audio
  const [isMuted, setIsMuted] = useState<boolean>(() => audioManager.getSettings().muted);
  const [isMusicPlaying, setIsMusicPlaying] = useState<boolean>(() => audioManager.isMusicActive());

  // Efecto de combate temporal (explosión animada) y Trauma de Cámara
  const [activeFx, setActiveFx] = useState<{ x: number; y: number; startTime: number } | null>(null);
  const traumaRef = useRef<number>(0);

  // Impulso de Trauma cuando ocurre una alerta de emboscada o explosión
  useEffect(() => {
    if (ambushAlert || activeFx) {
      traumaRef.current = Math.min(1.0, traumaRef.current + 0.55);
    }
  }, [ambushAlert, activeFx]);

  const gridHeight = tiles.length;
  const gridWidth = tiles[0]?.length || 0;

  // Zoom mínimo estricto que llena 100% de la pantalla sin bordes negros (Cover Mode)
  const coverZoom = useMemo(() => {
    if (gridWidth <= 0 || gridHeight <= 0 || viewportW <= 0 || viewportH <= 0) return 1.0;
    const horizontalCover = viewportW / (gridWidth * TILE_SIZE);
    const verticalCover = viewportH / (gridHeight * TILE_SIZE);
    return Math.max(0.35, Math.max(horizontalCover, verticalCover));
  }, [viewportW, viewportH, gridWidth, gridHeight]);

  // Clamp de cámara espacial: impide que el mapa se despegue de los bordes del canvas
  const clampCamera = useCallback(
    (x: number, y: number, currentZoom: number) => {
      const mapPixelW = gridWidth * TILE_SIZE * currentZoom;
      const mapPixelH = gridHeight * TILE_SIZE * currentZoom;

      let clampedX = x;
      let clampedY = y;

      if (mapPixelW <= viewportW) {
        clampedX = Math.floor((viewportW - mapPixelW) / 2);
      } else {
        const minX = viewportW - mapPixelW;
        const maxX = 0;
        clampedX = Math.min(maxX, Math.max(minX, x));
      }

      if (mapPixelH <= viewportH) {
        clampedY = Math.floor((viewportH - mapPixelH) / 2);
      } else {
        const minY = viewportH - mapPixelH;
        const maxY = 0;
        clampedY = Math.min(maxY, Math.max(minY, y));
      }

      return { x: clampedX, y: clampedY };
    },
    [viewportW, viewportH, gridWidth, gridHeight]
  );

  // Auto-ajuste de cámara dinámico al cargar un mapa nuevo o redimensionar ventana
  useEffect(() => {
    if (gridWidth > 0 && gridHeight > 0 && viewportW > 0 && viewportH > 0) {
      const targetZoom = Number(coverZoom.toFixed(2));
      const mapPixelW = gridWidth * TILE_SIZE * targetZoom;
      const mapPixelH = gridHeight * TILE_SIZE * targetZoom;
      const targetX = Math.floor((viewportW - mapPixelW) / 2);
      const targetY = Math.floor((viewportH - mapPixelH) / 2);
      const clamped = clampCamera(targetX, targetY, targetZoom);
      setCamera({
        x: clamped.x,
        y: clamped.y,
        zoom: targetZoom,
      });
    }
  }, [gridWidth, gridHeight, coverZoom, viewportW, viewportH, clampCamera]);

  // Convertir coordenadas de pantalla a celda de la cuadrícula
  const screenToGrid = useCallback(
    (clientX: number, clientY: number): GridPosition | null => {
      const canvas = canvasRef.current;
      if (!canvas) return null;
      const rect = canvas.getBoundingClientRect();

      const mouseX = clientX - rect.left;
      const mouseY = clientY - rect.top;

      // Aplicar transformación inversa de la cámara
      const worldX = (mouseX - camera.x) / camera.zoom;
      const worldY = (mouseY - camera.y) / camera.zoom;

      const gx = Math.floor(worldX / TILE_SIZE);
      const gy = Math.floor(worldY / TILE_SIZE);

      if (gx >= 0 && gx < gridWidth && gy >= 0 && gy < gridHeight) {
        return { x: gx, y: gy };
      }
      return null;
    },
    [camera, gridWidth, gridHeight]
  );

  // Bucle de Renderizado Principal a 60 FPS con Animaciones y Sprites
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;

    const render = (timestamp: number) => {
      ctx.save();
      // Limpiar fondo
      ctx.fillStyle = '#181914'; // Carbón de búnker táctico
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Aplicar Screen Shake cuadrático basado en Trauma (Shake = Trauma^2)
      let shakeX = 0;
      let shakeY = 0;
      if (traumaRef.current > 0.01) {
        const shake = traumaRef.current * traumaRef.current;
        shakeX = (Math.random() * 2 - 1) * 10 * shake;
        shakeY = (Math.random() * 2 - 1) * 10 * shake;
        traumaRef.current = Math.max(0, traumaRef.current - 0.035);
      } else {
        traumaRef.current = 0;
      }

      // Aplicar Matriz de Transformación de Cámara + Screen Shake
      ctx.translate(camera.x + shakeX, camera.y + shakeY);
      ctx.scale(camera.zoom, camera.zoom);

      // 1. DIBUJAR TERRENO MEDIANTE EL ATLAS REAL O PROCEDURAL
      for (let y = 0; y < gridHeight; y++) {
        for (let x = 0; x < gridWidth; x++) {
          const tile = tiles[y]?.[x];
          if (!tile) continue;

          const px = x * TILE_SIZE;
          const py = y * TILE_SIZE;

          // Intento de renderizado con texturas de spritesheet de Advance Wars
          const renderedWithSprite = assetLoader.drawTerrainTile(
            ctx,
            tile,
            px,
            py,
            TILE_SIZE,
            tiles,
            timestamp
          );

          if (!renderedWithSprite) {
            const palette = TERRAIN_PALETTE[tile.type] || TERRAIN_PALETTE.plains;

            // Relleno base de tile
            ctx.fillStyle = palette.bg;
            ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);

            // Borde del tile
            ctx.strokeStyle = palette.border;
            ctx.lineWidth = 1;
            ctx.strokeRect(px, py, TILE_SIZE, TILE_SIZE);

            // Detalles decorativos del terreno
            drawTerrainDetails(ctx, tile.type, px, py, palette.detail);

            // Indicador de propiedad de ciudad/HQ (P1 = Blue Moon #1E64D0, P2 = Orange Star #E84A27)
            if (tile.ownerId) {
              ctx.fillStyle = tile.ownerId === 'p1' ? 'rgba(30, 100, 208, 0.42)' : 'rgba(232, 74, 39, 0.42)';
              ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
            }
          }

          // Estrellas de Defensa
          if (tile.defenseStars > 0) {
            ctx.fillStyle = '#fbbf24';
            for (let s = 0; s < tile.defenseStars; s++) {
              ctx.fillRect(px + 4 + s * 6, py + 4, 3, 3);
            }
          }
        }
      }

      // 1b. VELO TÁCTICO DE NIEBLA DE GUERRA (FOG OF WAR)
      if (fogOfWar && fogOfWar.enabled) {
        for (let y = 0; y < gridHeight; y++) {
          for (let x = 0; x < gridWidth; x++) {
            const key = `${x},${y}`;
            if (!fogOfWar.visibleCoords.has(key)) {
              const px = x * TILE_SIZE;
              const py = y * TILE_SIZE;

              // Velo de oscuridad opaco táctico
              ctx.fillStyle = 'rgba(6, 10, 18, 0.78)';
              ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);

              // Trama sutil de cuadrícula de satélite
              ctx.strokeStyle = 'rgba(30, 41, 59, 0.35)';
              ctx.lineWidth = 0.5;
              ctx.strokeRect(px, py, TILE_SIZE, TILE_SIZE);
            }
          }
        }
      }

      // 1c. DIBUJAR AIRDROPS / SUMINISTROS TÁCTICOS DINÁMICOS (SPRINT CANÓNICO)
      if (airdrops && airdrops.length > 0) {
        for (const drop of airdrops) {
          if (drop.isClaimed) continue;

          // Si hay niebla de guerra activa, validar visibilidad para el espectador/jugador
          if (fogOfWar && fogOfWar.enabled && fogOfWar.viewerPlayerId !== 'spectator') {
            const key = `${drop.x},${drop.y}`;
            if (!fogOfWar.visibleCoords.has(key)) continue;
          }

          const dx = drop.x * TILE_SIZE;
          const dy = drop.y * TILE_SIZE;
          drawAirDropBeacon(ctx, drop, dx, dy, timestamp);
        }
      }

      // 2. DIBUJAR RANGO ALCANZABLE (AZUL TRASLÚCIDO)
      if (reachableCoords.length > 0) {
        ctx.fillStyle = 'rgba(59, 130, 246, 0.35)';
        ctx.strokeStyle = '#3b82f6';
        ctx.lineWidth = 1.5;
        for (const coord of reachableCoords) {
          const rx = coord.x * TILE_SIZE;
          const ry = coord.y * TILE_SIZE;
          ctx.fillRect(rx, ry, TILE_SIZE, TILE_SIZE);
          ctx.strokeRect(rx, ry, TILE_SIZE, TILE_SIZE);
        }
      }

      // 3. DIBUJAR OBJETIVOS DE ATAQUE (ROJO PARPADEANTE)
      if (targetCoords.length > 0) {
        const pulse = 0.35 + 0.15 * Math.sin(timestamp / 150);
        ctx.fillStyle = `rgba(239, 68, 68, ${pulse})`;
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 2;
        for (const target of targetCoords) {
          const tx = target.x * TILE_SIZE;
          const ty = target.y * TILE_SIZE;
          ctx.fillRect(tx, ty, TILE_SIZE, TILE_SIZE);
          ctx.strokeRect(tx, ty, TILE_SIZE, TILE_SIZE);
        }
      }

      // 4. DIBUJAR CELDA EN HOVER
      if (hoveredCoord) {
        const hx = hoveredCoord.x * TILE_SIZE;
        const hy = hoveredCoord.y * TILE_SIZE;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.18)';
        ctx.fillRect(hx, hy, TILE_SIZE, TILE_SIZE);
        ctx.strokeStyle = '#34d399';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(hx, hy, TILE_SIZE, TILE_SIZE);
      }

      // 5. DIBUJAR CELDA SELECCIONADA
      if (selectedCoord) {
        const sx = selectedCoord.x * TILE_SIZE;
        const sy = selectedCoord.y * TILE_SIZE;
        ctx.strokeStyle = '#60a5fa'; // Azul brillante
        ctx.lineWidth = 3;
        ctx.strokeRect(sx, sy, TILE_SIZE, TILE_SIZE);

        // Brillo pulsante en esquinas
        drawCornerBrackets(ctx, sx, sy, TILE_SIZE);
      }

      // 6. DIBUJAR UNIDADES TÁCTICAS MEDIANTE EL SPRITESHEET ENGINE
      for (const unit of units) {
        // Si la unidad está embarcada en un transporte, no se dibuja en la cuadrícula
        if (unit.isLoadedInsideId) {
          continue;
        }

        if (fogOfWar && fogOfWar.enabled && fogOfWar.viewerPlayerId !== 'spectator') {
          const isAlly = unit.ownerId === fogOfWar.viewerPlayerId;
          if (!isAlly && !fogOfWar.revealedEnemyUnitIds.has(unit.id)) {
            // Unidad enemiga oculta en la niebla o emboscada en bosque: omitir renderizado
            continue;
          }
        }
        const ux = unit.x * TILE_SIZE;
        const uy = unit.y * TILE_SIZE;
        drawTacticalUnitSprite(ctx, unit, ux, uy, timestamp);
      }

      // 7. DIBUJAR EFECTO DE IMPACTO / EXPLOSIÓN EN VIVO
      if (activeFx) {
        const elapsed = timestamp - activeFx.startTime;
        const duration = 500; // 500ms duración de explosión
        if (elapsed < duration) {
          const progress = elapsed / duration;
          assetLoader.drawExplosion(ctx, activeFx.x, activeFx.y, progress, 56);
        } else {
          setActiveFx(null);
        }
      }

      // 7b. ALERTA DE EMBOSCADA DETECTADA (TRAP)
      if (ambushAlert) {
        const elapsed = timestamp - ambushAlert.startTime;
        if (elapsed < 3000) {
          const ax = ambushAlert.coord.x * TILE_SIZE;
          const ay = ambushAlert.coord.y * TILE_SIZE;
          const pulse = 0.7 + 0.3 * Math.sin(timestamp / 70);

          ctx.fillStyle = `rgba(239, 68, 68, ${pulse * 0.4})`;
          ctx.fillRect(ax - 4, ay - 4, TILE_SIZE + 8, TILE_SIZE + 8);
          ctx.strokeStyle = '#ef4444';
          ctx.lineWidth = 2.5;
          ctx.strokeRect(ax - 4, ay - 4, TILE_SIZE + 8, TILE_SIZE + 8);

          // Rótulo militar flotante
          ctx.fillStyle = 'rgba(15, 23, 42, 0.95)';
          ctx.fillRect(ax - 32, ay - 26, TILE_SIZE + 64, 20);
          ctx.strokeStyle = '#ef4444';
          ctx.lineWidth = 1;
          ctx.strokeRect(ax - 32, ay - 26, TILE_SIZE + 64, 20);

          ctx.fillStyle = '#f87171';
          ctx.font = 'bold 9px monospace';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('⚠️ ¡EMBOSCADA!', ax + TILE_SIZE / 2, ay - 16);
        }
      }

      ctx.restore();

      // 8. HUD de Cámara (Overlay no transformado en pantalla)
      drawCameraHUD(ctx, camera.zoom, hoveredCoord, fogOfWar);

      animationFrameId = requestAnimationFrame(render);
    };

    animationFrameId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [camera, tiles, units, selectedCoord, reachableCoords, targetCoords, hoveredCoord, gridWidth, gridHeight, activeFx, fogOfWar, ambushAlert, airdrops]);

  // Manejadores de Eventos del Ratón
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (e.button === 0) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - camera.x, y: e.clientY - camera.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isDragging) {
      setCamera(prev => {
        const rawX = e.clientX - dragStart.x;
        const rawY = e.clientY - dragStart.y;
        const clamped = clampCamera(rawX, rawY, prev.zoom);
        return {
          ...prev,
          x: clamped.x,
          y: clamped.y,
        };
      });
    } else {
      const coord = screenToGrid(e.clientX, e.clientY);
      setHoveredCoord(coord);
      onCellHover?.(coord);
    }
  };

  const handleMouseUp = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isDragging) {
      const movedDist = Math.hypot(e.clientX - camera.x - dragStart.x, e.clientY - camera.y - dragStart.y);
      if (movedDist < 5) {
        const coord = screenToGrid(e.clientX, e.clientY);
        if (coord) {
          // Reproducir SFX táctico al seleccionar (excluyendo unidades embarcadas en transporte)
          const unitAtCell = units.find(u => u.x === coord.x && u.y === coord.y && !u.isLoadedInsideId);
          if (unitAtCell) {
            triggerHaptic('selection');
            audioManager.playSFX('unit_select');
          } else {
            triggerHaptic('selection');
            audioManager.playSFX('button_click');
          }
          onCellSelect?.(coord);
        }
      }
      setIsDragging(false);
    }
  };

  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.15 : 0.87;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    setCamera(prev => {
      const nextZoom = Math.max(coverZoom, Math.min(3.0, prev.zoom * zoomFactor));
      const nextX = mouseX - (mouseX - prev.x) * (nextZoom / prev.zoom);
      const nextY = mouseY - (mouseY - prev.y) * (nextZoom / prev.zoom);
      const clamped = clampCamera(nextX, nextY, nextZoom);
      return { x: clamped.x, y: clamped.y, zoom: nextZoom };
    });
  };

  const handleResetCamera = () => {
    const targetZoom = Number(coverZoom.toFixed(2));
    const mapPixelW = gridWidth * TILE_SIZE * targetZoom;
    const mapPixelH = gridHeight * TILE_SIZE * targetZoom;
    const targetX = Math.floor((viewportW - mapPixelW) / 2);
    const targetY = Math.floor((viewportH - mapPixelH) / 2);
    const clamped = clampCamera(targetX, targetY, targetZoom);
    setCamera({ x: clamped.x, y: clamped.y, zoom: targetZoom });
  };

  // Manejadores de Gestos Táctiles Móviles Multitáctil y Háptico (Fase 2 / RFC Sección 3)
  const handleTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();

    if (e.touches.length === 2) {
      // Gestos a 2 dedos: Pinch-to-Zoom
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
        longPressTimerRef.current = null;
      }
      setIsDragging(false);

      const t1 = e.touches[0];
      const t2 = e.touches[1];
      const dist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
      const center = {
        x: (t1.clientX + t2.clientX) / 2 - rect.left,
        y: (t1.clientY + t2.clientY) / 2 - rect.top,
      };
      pinchRef.current = { dist, center };
    } else if (e.touches.length === 1) {
      pinchRef.current = null;
      const touch = e.touches[0];
      const startPos = { x: touch.clientX, y: touch.clientY, time: Date.now() };
      touchStartRef.current = startPos;
      setDragStart({ x: touch.clientX - camera.x, y: touch.clientY - camera.y });

      // Timer de Long Press (350ms para inspección táctica)
      longPressTimerRef.current = setTimeout(() => {
        const coord = screenToGrid(startPos.x, startPos.y);
        if (coord) {
          triggerHaptic('selection');
          audioManager.playSFX('button_click');
          onCellHover?.(coord);
        }
      }, 350);
    }
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();

    if (e.touches.length === 2 && pinchRef.current) {
      // Pinch-to-Zoom acotado en [0.65, 1.80] con centroide invariante
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      const currentDist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
      const currentCenter = {
        x: (t1.clientX + t2.clientX) / 2 - rect.left,
        y: (t1.clientY + t2.clientY) / 2 - rect.top,
      };

      if (pinchRef.current.dist > 10 && currentDist > 10) {
        const scaleFactor = currentDist / pinchRef.current.dist;

        setCamera(prev => {
          const rawZoom = prev.zoom * scaleFactor;
          const nextZoom = Math.max(coverZoom, Math.min(3.0, rawZoom));
          const zoomRatio = nextZoom / prev.zoom;

          // Corrección espacial del centroide invariante
          const nextX = currentCenter.x - (currentCenter.x - prev.x) * zoomRatio;
          const nextY = currentCenter.y - (currentCenter.y - prev.y) * zoomRatio;
          const clamped = clampCamera(nextX, nextY, nextZoom);

          return {
            x: Math.round(clamped.x),
            y: Math.round(clamped.y),
            zoom: Number(nextZoom.toFixed(3)),
          };
        });

        pinchRef.current = { dist: currentDist, center: currentCenter };
      }
    } else if (e.touches.length === 1 && touchStartRef.current) {
      const touch = e.touches[0];
      const dist = Math.hypot(touch.clientX - touchStartRef.current.x, touch.clientY - touchStartRef.current.y);

      // Supera el umbral de arrastre de 8px: activar panning y cancelar pulsación larga
      if (dist >= 8.0) {
        if (longPressTimerRef.current) {
          clearTimeout(longPressTimerRef.current);
          longPressTimerRef.current = null;
        }
        setIsDragging(true);
        setCamera(prev => {
          const rawX = touch.clientX - dragStart.x;
          const rawY = touch.clientY - dragStart.y;
          const clamped = clampCamera(rawX, rawY, prev.zoom);
          return {
            ...prev,
            x: clamped.x,
            y: clamped.y,
          };
        });
      }
    }
  };

  const handleTouchEnd = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }

    if (e.touches.length < 2) {
      pinchRef.current = null;
    }

    if (touchStartRef.current) {
      const now = Date.now();
      const duration = now - touchStartRef.current.time;

      if (!isDragging && duration < 350) {
        const touch = touchStartRef.current;
        const coord = screenToGrid(touch.x, touch.y);

        if (coord) {
          // Reconocimiento de Doble Toque (Double-Tap Confirmation <= 300ms, dist <= 16px)
          const lastTap = lastTapRef.current;
          const isDoubleTap =
            lastTap &&
            now - lastTap.time <= 300 &&
            Math.hypot(touch.x - lastTap.x, touch.y - lastTap.y) <= 16 &&
            lastTap.coord.x === coord.x &&
            lastTap.coord.y === coord.y;

          if (isDoubleTap) {
            triggerHaptic('movement');
            audioManager.playSFX('button_click');
            onCellSelect?.(coord);
            lastTapRef.current = null;
          } else {
            const unitAtCell = units.find(u => u.x === coord.x && u.y === coord.y && !u.isLoadedInsideId);
            if (unitAtCell) {
              triggerHaptic('selection');
              audioManager.playSFX('unit_select');
            } else {
              triggerHaptic('selection');
              audioManager.playSFX('button_click');
            }
            onCellSelect?.(coord);
            lastTapRef.current = { coord, time: now, x: touch.x, y: touch.y };
          }
        }
      }
      touchStartRef.current = null;
    }
    setIsDragging(false);
  };

  // Controles de Audio Tácticos
  const handleToggleMute = () => {
    const muted = audioManager.toggleMute();
    setIsMuted(muted);
    if (!muted) {
      audioManager.playSFX('unit_order');
    }
  };

  const handleToggleMusic = () => {
    if (isMusicPlaying) {
      audioManager.stopBgm();
      setIsMusicPlaying(false);
    } else {
      audioManager.startBgm('march');
      setIsMusicPlaying(true);
    }
  };

  const triggerTestSound = (sfx: SfxType) => {
    audioManager.playSFX(sfx);
    if (sfx === 'cannon' || sfx === 'explosion') {
      // Activar animación de explosión en celda seleccionada o centro
      const targetX = (selectedCoord ? selectedCoord.x : 3) * TILE_SIZE + TILE_SIZE / 2;
      const targetY = (selectedCoord ? selectedCoord.y : 3) * TILE_SIZE + TILE_SIZE / 2;
      setActiveFx({ x: targetX, y: targetY, startTime: performance.now() });
    }
  };

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full flex-1 overflow-hidden rounded-[14px_4px_14px_4px] border-2 border-[#0A0B08] bg-[#181914] select-none shadow-[4px_4px_0px_#0A0B08]"
    >
      <canvas
        ref={canvasRef}
        width={viewportW}
        height={viewportH}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={() => {
          setIsDragging(false);
          setHoveredCoord(null);
          onCellHover?.(null);
        }}
        onWheel={handleWheel}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className="block cursor-crosshair touch-none w-full h-full"
      />

      {/* Badge Flotante de Pronóstico Balístico In-Situ (RFC Sección 1 / Dilema 2) */}
      {inSituTargetBadge && (
        <div
          style={{
            position: 'absolute',
            left: `${camera.x + inSituTargetBadge.coord.x * TILE_SIZE * camera.zoom + (TILE_SIZE * camera.zoom) / 2}px`,
            top: `${camera.y + inSituTargetBadge.coord.y * TILE_SIZE * camera.zoom - 10}px`,
            transform: 'translate(-50%, -100%)',
          }}
          className="z-30 pointer-events-none bg-[#2B2C24]/95 backdrop-blur border-2 border-[#0A0B08] px-2.5 py-1 rounded-[10px_2px_10px_2px] shadow-[3px_3px_0px_#0A0B08] text-xs font-mono select-none flex items-center gap-2 whitespace-nowrap animate-in fade-in zoom-in-95 duration-100"
        >
          <div className="flex items-center gap-1">
            <span className="text-[#E84A27] font-black">💥 -{inSituTargetBadge.estimatedDamage} HP</span>
            <span className="text-[#D8D1C5]">
              ({Math.max(0, inSituTargetBadge.defenderHp - inSituTargetBadge.estimatedDamage)}/10)
            </span>
          </div>
          <span className="text-[#46521F]">|</span>
          <div className="flex items-center gap-1">
            {inSituTargetBadge.canCounter ? (
              <span className="text-[#F2B705] font-bold">
                🛡️ Contra: -{inSituTargetBadge.counterDamage} HP
              </span>
            ) : (
              <span className="text-[#3A9D4E] font-bold">🚫 Sin Contra</span>
            )}
          </div>
          {inSituTargetBadge.terrainStars !== undefined && (
            <>
              <span className="text-[#46521F]">|</span>
              <span className="text-[#F2B705]">★{inSituTargetBadge.terrainStars}</span>
            </>
          )}
        </div>
      )}

      {/* Menú Contextual en Baldosa con Clamping Espacial (RFC Sección 1.1) */}
      {tileContextMenu && (
        <TileContextMenu
          screenX={camera.x + tileContextMenu.coord.x * TILE_SIZE * camera.zoom}
          screenY={camera.y + tileContextMenu.coord.y * TILE_SIZE * camera.zoom}
          tileSizePx={TILE_SIZE * camera.zoom}
          viewportWidth={width}
          viewportHeight={height}
          actions={tileContextMenu.actions}
          onSelectAction={tileContextMenu.onSelectAction}
          onCancel={tileContextMenu.onCancel}
        />
      )}

      {/* Barra de Herramientas de Audio Militar */}
      <div className="absolute top-2.5 right-2.5 flex items-center gap-1.5 bg-[#2B2C24]/95 border-2 border-[#0A0B08] rounded-[10px_2px_10px_2px] px-2.5 py-1 text-xs font-mono shadow-[3px_3px_0px_#0A0B08]">
        <button
          onClick={handleToggleMute}
          className={`flex items-center gap-1 px-1.5 py-0.5 rounded-[4px_1px_4px_1px] transition-colors cursor-pointer tactical-juice-btn ${
            isMuted ? 'text-[#E84A27] bg-[#181914]' : 'text-[#00FF66] hover:text-[#F2E8D5]'
          }`}
          title={isMuted ? 'Desmutear audio' : 'Silenciar audio'}
        >
          {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
          <span className="text-[10px] font-bold">{isMuted ? 'MUTED' : 'SFX ON'}</span>
        </button>

        <span className="text-[#46521F]">|</span>

        <button
          onClick={handleToggleMusic}
          className={`flex items-center gap-1 px-1.5 py-0.5 rounded-[4px_1px_4px_1px] transition-colors cursor-pointer tactical-juice-btn ${
            isMusicPlaying ? 'text-[#F2B705] bg-[#181914]' : 'text-[#D8D1C5]/70 hover:text-[#F2E8D5]'
          }`}
          title={isMusicPlaying ? 'Pausar música de marcha' : 'Reproducir marcha táctica'}
        >
          <Music className={`w-3.5 h-3.5 ${isMusicPlaying ? 'animate-pulse' : ''}`} />
          <span className="text-[10px] font-bold">{isMusicPlaying ? 'BGM 125BPM' : 'BGM OFF'}</span>
        </button>
      </div>

      {/* Controles Flotantes de Cámara */}
      <div className="absolute bottom-3 right-3 flex items-center gap-1.5 bg-[#2B2C24]/95 border-2 border-[#0A0B08] rounded-[10px_2px_10px_2px] px-2.5 py-1 text-xs font-mono shadow-[3px_3px_0px_#0A0B08]">
        <button
          onClick={() => setCamera(prev => ({ ...prev, zoom: Math.min(2.5, prev.zoom * 1.2) }))}
          className="hover:text-[#F2B705] text-[#F2E8D5] font-black px-1.5 cursor-pointer tactical-juice-btn"
          title="Zoom In"
        >
          +
        </button>
        <span className="text-[#D8D1C5] text-[11px] font-bold tabular-nums">{Math.round(camera.zoom * 100)}%</span>
        <button
          onClick={() => setCamera(prev => ({ ...prev, zoom: Math.max(0.5, prev.zoom / 1.2) }))}
          className="hover:text-[#F2B705] text-[#F2E8D5] font-black px-1.5 cursor-pointer tactical-juice-btn"
          title="Zoom Out"
        >
          -
        </button>
        <span className="text-[#46521F]">|</span>
        <button
          onClick={handleResetCamera}
          className="hover:text-[#F2B705] text-[11px] text-[#F2E8D5] font-bold cursor-pointer tactical-juice-btn"
        >
          Reset
        </button>
      </div>
    </div>
  );
};

// ============================================================================
// FUNCIONES AUXILIARES DE RENDERIZADO EN CANVAS CON SPRITES
// ============================================================================

function drawTerrainDetails(ctx: CanvasRenderingContext2D, type: TerrainType, px: number, py: number, detailColor: string) {
  ctx.fillStyle = detailColor;
  if (type === 'forest') {
    ctx.beginPath();
    ctx.arc(px + 16, py + 20, 7, 0, Math.PI * 2);
    ctx.arc(px + 32, py + 22, 8, 0, Math.PI * 2);
    ctx.arc(px + 24, py + 34, 9, 0, Math.PI * 2);
    ctx.fill();
  } else if (type === 'mountain') {
    ctx.beginPath();
    ctx.moveTo(px + 24, py + 10);
    ctx.lineTo(px + 40, py + 38);
    ctx.lineTo(px + 8, py + 38);
    ctx.closePath();
    ctx.fill();
  } else if (type === 'city' || type === 'hq' || type === 'factory') {
    ctx.fillRect(px + 12, py + 16, 24, 22);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(px + 16, py + 20, 4, 4);
    ctx.fillRect(px + 28, py + 20, 4, 4);
  } else if (type === 'road') {
    ctx.strokeStyle = '#ffffff';
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(px + 24, py);
    ctx.lineTo(px + 24, py + TILE_SIZE);
    ctx.stroke();
    ctx.setLineDash([]);
  }
}

function drawTacticalUnitSprite(
  ctx: CanvasRenderingContext2D,
  unit: TacticalUnit,
  ux: number,
  uy: number,
  timestamp: number
) {
  const team: 'p1' | 'p2' = unit.ownerId === 'p1' ? 'p1' : 'p2';

  // 1. Renderizar el Sprite animado mediante el motor de assets
  assetLoader.drawSprite(ctx, unit.unitCode, {
    x: ux,
    y: uy,
    width: TILE_SIZE,
    height: TILE_SIZE,
    team,
    skinId: unit.skinId || 'default',
    animation: unit.hasMoved ? 'idle' : 'idle',
    frameTimeMs: timestamp,
    alpha: unit.hasActed ? 0.6 : 1.0, // Oscurecer unidad si ya actuó este turno
  });

  // 2. Placa de HP militar táctica (1 a 10) - P1 = Blue Moon #1E64D0, P2 = Orange Star #E84A27
  ctx.fillStyle = '#0A0B08';
  ctx.fillRect(ux + 28, uy + 28, 16, 16);
  ctx.strokeStyle = team === 'p1' ? '#1E64D0' : '#E84A27';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(ux + 28, uy + 28, 16, 16);

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 10px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(`${unit.hp}`, ux + 36, uy + 36);
}

function drawCornerBrackets(ctx: CanvasRenderingContext2D, sx: number, sy: number, size: number) {
  const len = 8;
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2;

  ctx.beginPath();
  ctx.moveTo(sx, sy + len);
  ctx.lineTo(sx, sy);
  ctx.lineTo(sx + len, sy);

  ctx.moveTo(sx + size - len, sy);
  ctx.lineTo(sx + size, sy);
  ctx.lineTo(sx + size, sy + len);

  ctx.moveTo(sx, sy + size - len);
  ctx.lineTo(sx, sy + size);
  ctx.lineTo(sx + len, sy + size);

  ctx.moveTo(sx + size - len, sy + size);
  ctx.lineTo(sx + size, sy + size);
  ctx.lineTo(sx + size, sy + size - len);
  ctx.stroke();
}

function drawCameraHUD(
  ctx: CanvasRenderingContext2D,
  zoom: number,
  hovered: GridPosition | null,
  fow?: FogOfWarVisualConfig | null
) {
  const fowText = fow && fow.enabled ? ` | FoW: ${fow.viewerPlayerId.toUpperCase()}` : ' | FoW: OFF';
  // Sombra dura de tinta offset
  ctx.fillStyle = '#0A0B08';
  ctx.fillRect(10, 10, 224, 26);
  // Cuerpo blindado C4ISR
  ctx.fillStyle = 'rgba(43, 44, 36, 0.94)';
  ctx.fillRect(8, 8, 224, 26);
  ctx.strokeStyle = '#0A0B08';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(8, 8, 224, 26);

  ctx.fillStyle = '#D8D1C5';
  ctx.font = 'bold 10px monospace';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';

  const coordText = hovered ? `X:${hovered.x} Y:${hovered.y}` : '---';
  ctx.fillText(`CAM: ${Math.round(zoom * 100)}% | GRID: ${coordText}${fowText}`, 14, 21);
}

function drawAirDropBeacon(
  ctx: CanvasRenderingContext2D,
  drop: AirDrop,
  dx: number,
  dy: number,
  timestamp: number
) {
  const pulse = 0.5 + 0.5 * Math.sin(timestamp / 200);
  const centerX = dx + TILE_SIZE / 2;
  const centerY = dy + TILE_SIZE / 2;

  // Retro-Futurism: Rust Orange #C46A3A, Dark Olive #46521F, Cream #F2E8D5, Carbon #2B2C24
  const isFunds = drop.rewardType === 'funds';
  const isCoPower = drop.rewardType === 'co_power';
  const themeColor = isFunds ? '#C46A3A' : isCoPower ? '#38bdf8' : '#a855f7';
  const themeBg = isFunds
    ? 'rgba(196, 106, 58, 0.22)'
    : isCoPower
    ? 'rgba(56, 189, 248, 0.22)'
    : 'rgba(168, 85, 247, 0.22)';

  ctx.save();

  // 1. Baliza pulsante concéntrica en el suelo
  ctx.fillStyle = themeBg;
  ctx.beginPath();
  ctx.arc(centerX, centerY + 8, 16 + pulse * 5, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = themeColor;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(centerX, centerY + 8, 14 + pulse * 4, 0, Math.PI * 2);
  ctx.stroke();

  // Retícula de mira táctica
  ctx.strokeStyle = `rgba(242, 232, 213, ${0.25 + 0.25 * pulse})`;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(centerX - 18, centerY + 8);
  ctx.lineTo(centerX + 18, centerY + 8);
  ctx.moveTo(centerX, centerY - 6);
  ctx.lineTo(centerX, centerY + 22);
  ctx.stroke();

  // 2. Paracaídas Retro-Futurista (Canopy estilo Cómic)
  const canopyHover = Math.sin(timestamp / 350) * 2;
  const canopyY = dy + 6 + canopyHover;

  ctx.beginPath();
  ctx.arc(centerX, canopyY + 7, 13, Math.PI, 0, false);
  ctx.closePath();
  ctx.fillStyle = '#F2E8D5'; // Cream canónico
  ctx.fill();
  ctx.strokeStyle = '#2B2C24';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Franja central en cúpula de paracaídas
  ctx.beginPath();
  ctx.arc(centerX, canopyY + 7, 6, Math.PI, 0, false);
  ctx.fillStyle = '#C46A3A'; // Rust Orange
  ctx.fill();
  ctx.stroke();

  // Cuerdas de suspensión hacia el contenedor
  ctx.strokeStyle = 'rgba(43, 44, 36, 0.75)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(centerX - 12, canopyY + 7);
  ctx.lineTo(centerX - 7, dy + 24);
  ctx.moveTo(centerX, canopyY + 7);
  ctx.lineTo(centerX, dy + 24);
  ctx.moveTo(centerX + 12, canopyY + 7);
  ctx.lineTo(centerX + 7, dy + 24);
  ctx.stroke();

  // 3. Caja Blindada de Suministros (Estilo Retro-Futurism / Hard Shadow)
  const crateX = dx + 13;
  const crateY = dy + 24;
  const crateW = 22;
  const crateH = 18;

  // Sombra dura sólida de 2px
  ctx.fillStyle = '#2B2C24';
  ctx.fillRect(crateX + 2, crateY + 2, crateW, crateH);

  // Cuerpo militar de la caja
  ctx.fillStyle = '#46521F'; // Dark Olive
  ctx.fillRect(crateX, crateY, crateW, crateH);
  ctx.strokeStyle = '#2B2C24';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(crateX, crateY, crateW, crateH);

  // Remaches / Refuerzo diagonal en X
  ctx.strokeStyle = '#7B8A4A'; // Muted Green
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(crateX + 2, crateY + 2);
  ctx.lineTo(crateX + crateW - 2, crateY + crateH - 2);
  ctx.moveTo(crateX + crateW - 2, crateY + 2);
  ctx.lineTo(crateX + 2, crateY + crateH - 2);
  ctx.stroke();

  // Icono Pop-Art sobre la caja
  ctx.fillStyle = '#F2E8D5';
  ctx.font = 'bold 9px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const badgeIcon = isFunds ? '$' : isCoPower ? '⚡' : '★';
  ctx.fillText(badgeIcon, centerX, crateY + crateH / 2);

  // 4. Cartela Retro Flotante con el Botín
  const label = isFunds ? `+$${drop.rewardValue}G` : isCoPower ? 'SUPER-CO' : '+15 GEM';
  ctx.fillStyle = '#2B2C24';
  ctx.fillRect(centerX - 21, dy - 3, 42, 11);
  ctx.strokeStyle = themeColor;
  ctx.lineWidth = 1;
  ctx.strokeRect(centerX - 21, dy - 3, 42, 11);

  ctx.fillStyle = themeColor;
  ctx.font = 'bold 8px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, centerX, dy + 2.5);

  ctx.restore();
}

/**
 * ==============================================================================
 * RENDERIZADOR CARTOGRÁFICO WEBGL C4ISR - TACTICAL WORLD MAP (OPENPLACE BRIDGE)
 * ==============================================================================
 * Especificación Canónica: docs/00_GEOTACTICS_ONLINE_MASTER_SPEC.md §3.2
 * Motor: MapLibre GL (WebGL 2.0) + HTML5 TileCanvas 2D Proyectado.
 * - Semantic LOD: Macro-Globo (LOD 1) -> Operacional (LOD 2) -> Combate Táctico (LOD 3).
 * - Zero-SSR: Importación dinámica en useEffect para compatibilidad con Vite/SSR.
 * - WebGL Canvas Pump Hack: Renderizado por demanda a 60 FPS con 0% CPU en standby.
 * - Inactividad / Blur: Congelación automática tras 5 min sin actividad.
 * ==============================================================================
 */

import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import type {
  Map as MapLibreMap,
  GeoJSONSource,
  CanvasSource,
  MapMouseEvent,
  StyleSpecification,
} from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import {
  ZOOM_GLOBAL,
  ZOOM_OPERACIONAL,
  ZOOM_TACTICO,
  TILE_SIZE,
  lngLatToGridCoords,
  getTileBounds,
} from '../../engine/coordinates';
import { TacticalBitMap } from '../../engine/tacticalBitmap';
import { useTerritoryMap } from '../../hooks/useTerritoryMap';
import type { TacticalUnit } from '../../types';
import {
  C4ISRMapViewMode,
  TacticalMarkType,
  TacticalMapMark,
  CommanderFieldPosition,
} from '../../types/tacticalRoadTypes';
import { roadNetworkEngine } from '../../engine/roadNetworkEngine';
import { roadGarrisonEngine } from '../../engine/roadGarrisonEngine';
import { fiefBuildingService } from '../../services/fiefBuildingService';
import { stateSovereigntyService } from '../../services/stateSovereigntyService';
import { operationalUnitsService } from '../../services/operationalUnitsService';
import { spatialDeploymentService } from '../../services/spatialDeploymentService';
import { MicroTacticalDeckHUD } from '../game/MicroTacticalDeckHUD';
import { TacticalUnitDeployModal } from '../game/TacticalUnitDeployModal';
import { TacticalConstructionDrawer } from '../industry/TacticalConstructionDrawer';
import { TacticalMapControls } from './TacticalMapControls';

export interface TacticalWorldMapProps {
  userClanId?: string | null;
  activeProvinceId?: string | null;
  activeBattleUnits?: TacticalUnit[];
  fogOfWarBase64?: string | null;
  onSelectProvince?: (provinceId: string) => void;
  onSelectTacticalCell?: (
    sector: [number, number],
    cell: [number, number],
    lngLat?: [number, number]
  ) => void;
  className?: string;
}

interface ActiveTileCanvasState {
  sectorKey: string;
  sector: [number, number];
  sourceId: string;
  layerId: string;
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  isDirty: boolean;
}

const C4ISR_HIDE_LAYERS_REGEX = /^poi_|^landuse|^building(-3d)?$|^road_label|^waterway_label|^transit_/;
const ACTIVITY_TIMEOUT_MS = 300_000; // 5 minutos para standby automático (0% CPU)
const TACTICAL_GRID_DIMENSION = 20;  // Cuadrícula de 20x20 celdas (50x50 px por celda en canvas de 1000px)

/**
 * ESTILO VECTORIAL ZERO-RASTER C4ISR (CONFORME A @tactical-command-intel)
 * - 0% Peticiones HTTP de teselas raster externas (CartoDB erradicado).
 * - Cero API Keys. Cero coste de ancho de banda o límites de peticiones.
 * - Fondo de búnker ciego (#12130E) + Chasis blindado continental (#23241C / #46521F).
 */
const ZERO_RASTER_MILITARY_STYLE: StyleSpecification = {
  version: 8,
  sources: {
    'world-land': {
      type: 'geojson',
      data: '/map/world_land.json',
    },
  },
  layers: [
    {
      id: 'background',
      type: 'background',
      paint: {
        'background-color': '#0E100C', // --color-bunker-void (profundidad oceánica de búnker)
      },
    },
    {
      id: 'world-land-mass',
      type: 'fill',
      source: 'world-land',
      paint: {
        'fill-color': '#1C1E17', // --color-armor-base secundario (Colombia, Brasil, Caribe)
        'fill-opacity': 0.95,
      },
    },
    {
      id: 'world-land-border',
      type: 'line',
      source: 'world-land',
      paint: {
        'line-color': '#46521F', // --color-military-olive (bisel militar exterior)
        'line-width': 1.2,
        'line-opacity': 0.65,
      },
    },
  ],
};

export const TacticalWorldMap: React.FC<TacticalWorldMapProps> = ({
  userClanId = 'clan-ferro',
  activeProvinceId = null,
  activeBattleUnits = [],
  fogOfWarBase64 = null,
  onSelectProvince,
  onSelectTacticalCell,
  className = '',
}) => {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<MapLibreMap | null>(null);
  const tileCanvasRef = useRef<ActiveTileCanvasState | null>(null);
  const isStandbyRef = useRef<boolean>(false);
  const inactivityTimerRef = useRef<number | null>(null);

  // Stable refs para desacoplar el ciclo de vida del mapa WebGL y evitar parpadeos
  const onSelectProvinceRef = useRef(onSelectProvince);
  onSelectProvinceRef.current = onSelectProvince;

  const onSelectTacticalCellRef = useRef(onSelectTacticalCell);
  onSelectTacticalCellRef.current = onSelectTacticalCell;

  const [currentZoom, setCurrentZoom] = useState<number>(ZOOM_GLOBAL);
  const [hoveredProvinceId] = useState<string | null>(null);
  const [hoveredCell, setHoveredCell] = useState<[number, number] | null>(null);
  const [isStandbyUI, setIsStandbyUI] = useState<boolean>(false);
  const [webglError, setWebglError] = useState<string | null>(null);

  // Estados de Microjuego Táctico y Asignación Espacial (Sprint 3: Zoom x15)
  const [selectedMicroCoords, setSelectedMicroCoords] = useState<{
    sector: [number, number];
    cell: [number, number];
    lngLat: [number, number];
  } | null>(null);
  const [isDeployModalOpen, setIsDeployModalOpen] = useState(false);
  const [isBuildDrawerOpen, setIsBuildDrawerOpen] = useState(false);

  // Estados de Capa C4ISR y Metajuego Vial 2026
  const [currentViewMode, setCurrentViewMode] = useState<C4ISRMapViewMode>('V1_SOVEREIGNTY');
  const [tacticalMarks, setTacticalMarks] = useState<TacticalMapMark[]>([
    {
      id: 'mark-init-1',
      clanId: userClanId || 'clan-ferro',
      createdBy: 'commander-lead',
      markType: 'recon',
      location: [-71.458, 10.395],
      label: 'Terminal La Salina',
      colorHex: '#06B6D4',
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 3600000).toISOString(),
    },
    {
      id: 'mark-init-2',
      clanId: userClanId || 'clan-ferro',
      createdBy: 'commander-lead',
      markType: 'claim',
      location: [-71.425, 10.370],
      label: 'Pozo El Barroso II',
      colorHex: '#3B82F6',
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 3600000).toISOString(),
    },
  ]);

  const [commander, setCommander] = useState<CommanderFieldPosition>({
    userId: 'cmd-player-me',
    callsign: 'Vanguardia-1',
    clanId: userClanId || 'clan-ferro',
    currentRoadSegmentId: 'seg-intercomunal-ambrosio-salina',
    currentCoord: [-71.460, 10.405],
    targetNodeId: 'node-la-salina',
    pathRemainingNodeIds: ['node-la-salina'],
    speedKmh: 65,
    isMoving: true,
    supplyPercent: 92,
    lastMovedAt: new Date().toISOString(),
  });

  const [baseRegionsGeoJSON, setBaseRegionsGeoJSON] = useState<any>(null);

  useEffect(() => {
    let isSubscribed = true;
    fetch('/map/theatre_regions.json')
      .then((res) => res.json())
      .then((data) => {
        if (isSubscribed) setBaseRegionsGeoJSON(data);
      })
      .catch((err) => {
        console.warn('[TacticalWorldMap] No se pudo cargar theatre_regions.json local:', err);
      });
    return () => {
      isSubscribed = false;
    };
  }, []);

  const [sovereignVersion, setSovereignVersion] = useState(0);

  useEffect(() => {
    const unsub = stateSovereigntyService.subscribe(() => {
      setSovereignVersion((v) => v + 1);
    });
    return () => unsub();
  }, []);

  const { provinces, controlMap, clansMap } = useTerritoryMap(userClanId);

  // Selector cromático de facción conforme a @tactical-command-intel
  const resolveFactionColor = useCallback((
    controllingClanId?: string | null,
    isBuffer?: boolean,
    isUnderSiege?: boolean,
    fallbackClanColor?: string
  ): string => {
    if (isUnderSiege) return '#EF4444'; // Alerta DEFCON 1 / Asedio balístico
    if (isBuffer) return '#2B2C24';     // --color-armor-base neutro
    if (controllingClanId === 'clan-ferro') return '#1D4ED8';   // Blue Moon: Azul Mando Asedio
    if (controllingClanId === 'clan-orinoco') return '#E65100'; // Orange Star: Naranja Petroquímico
    if (controllingClanId === 'clan-andes') return '#991B1B';   // Black Hole: Carmesí Hostil
    return fallbackClanColor || '#2B2C24';
  }, []);

  const pruneCivilianLayers = useCallback((map: MapLibreMap) => {
    const style = map.getStyle();
    if (!style || !style.layers) return;
    for (const layer of style.layers) {
      if (C4ISR_HIDE_LAYERS_REGEX.test(layer.id)) {
        map.setLayoutProperty(layer.id, 'visibility', 'none');
      }
    }
  }, []);

  const pumpCanvasToWebGL = useCallback((map: MapLibreMap, sourceId: string) => {
    if (isStandbyRef.current) return;
    const source = map.getSource(sourceId) as (CanvasSource & {
      play?: () => void;
      pause?: () => void;
    }) | undefined;

    if (source && typeof source.play === 'function') {
      source.play();
      map.triggerRepaint();
      window.setTimeout(() => {
        if (typeof source.pause === 'function') source.pause();
      }, 0);
    } else {
      map.triggerRepaint();
    }
  }, []);

  const renderTacticalBattleCanvas = useCallback(
    (
      tileState: ActiveTileCanvasState,
      units: TacticalUnit[],
      fowBitmap: TacticalBitMap | null,
      highlightCell: [number, number] | null
    ) => {
      const { ctx, sourceId } = tileState;
      const cellPx = TILE_SIZE / TACTICAL_GRID_DIMENSION;

      ctx.clearRect(0, 0, TILE_SIZE, TILE_SIZE);

      // 1. Dibujar celdas tácticas y niebla de guerra binaria
      for (let gy = 0; gy < TACTICAL_GRID_DIMENSION; gy++) {
        for (let gx = 0; gx < TACTICAL_GRID_DIMENSION; gx++) {
          const bitIndex = gy * TACTICAL_GRID_DIMENSION + gx;
          const isFogged = fowBitmap ? !fowBitmap.getBit(bitIndex) : false;
          const px = gx * cellPx;
          const py = gy * cellPx;

          ctx.fillStyle = isFogged ? 'rgba(9, 13, 20, 0.72)' : 'rgba(70, 82, 31, 0.14)';
          ctx.fillRect(px, py, cellPx, cellPx);

          ctx.strokeStyle = isFogged ? 'rgba(51, 65, 85, 0.35)' : 'rgba(163, 230, 53, 0.32)';
          ctx.lineWidth = 1;
          ctx.strokeRect(px + 0.5, py + 0.5, cellPx - 1, cellPx - 1);
        }
      }

      // 2. Destacar celda bajo cursor (Hover)
      if (highlightCell) {
        const [hx, hy] = highlightCell;
        ctx.strokeStyle = '#FACC15';
        ctx.lineWidth = 3;
        ctx.strokeRect(hx * cellPx + 1.5, hy * cellPx + 1.5, cellPx - 3, cellPx - 3);
      }

      // 3. Renderizar unidades militares activas con barra de 1 a 100 HP
      for (const unit of units) {
        if (
          unit.x < 0 ||
          unit.x >= TACTICAL_GRID_DIMENSION ||
          unit.y < 0 ||
          unit.y >= TACTICAL_GRID_DIMENSION
        ) {
          continue;
        }

        const bitIndex = unit.y * TACTICAL_GRID_DIMENSION + unit.x;
        if (fowBitmap && !fowBitmap.getBit(bitIndex) && unit.ownerId !== userClanId) {
          continue; // Unidad enemiga oculta bajo la niebla de guerra
        }

        const ux = unit.x * cellPx;
        const uy = unit.y * cellPx;

        // Chasis de la unidad
        ctx.fillStyle = unit.ownerId === userClanId ? '#E65100' : '#0284C7';
        ctx.fillRect(ux + 6, uy + 6, cellPx - 12, cellPx - 16);
        ctx.strokeStyle = '#090D14';
        ctx.lineWidth = 2;
        ctx.strokeRect(ux + 6, uy + 6, cellPx - 12, cellPx - 16);

        // Código de la unidad
        ctx.fillStyle = '#F2E8D5';
        ctx.font = 'bold 11px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(unit.unitCode.slice(0, 3).toUpperCase(), ux + cellPx / 2, uy + 24);

        // Barra de Salud Continua 1-100 HP
        const hpRatio = Math.max(0, Math.min(1, unit.hp / 100));
        const barWidth = cellPx - 12;
        ctx.fillStyle = '#090D14';
        ctx.fillRect(ux + 6, uy + cellPx - 8, barWidth, 5);
        ctx.fillStyle = hpRatio > 0.5 ? '#22C55E' : hpRatio > 0.25 ? '#F59E0B' : '#EF4444';
        ctx.fillRect(ux + 6, uy + cellPx - 8, Math.round(barWidth * hpRatio), 5);
      }

      tileState.isDirty = true;
      if (mapInstanceRef.current) {
        pumpCanvasToWebGL(mapInstanceRef.current, sourceId);
      }
    },
    [pumpCanvasToWebGL, userClanId]
  );

  const syncTileCanvasLifecycle = useCallback(
    (map: MapLibreMap) => {
      const zoom = map.getZoom();
      if (zoom < ZOOM_TACTICO) {
        if (tileCanvasRef.current) {
          const { layerId, sourceId } = tileCanvasRef.current;
          if (map.getLayer(layerId)) map.removeLayer(layerId);
          if (map.getSource(sourceId)) map.removeSource(sourceId);
          tileCanvasRef.current = null;
        }
        return;
      }

      // Al estar en zoom >= ZOOM_TACTICO (15.0), proyectar la cuadrícula analítica O(1)
      const center = map.getCenter();
      const { sector } = lngLatToGridCoords([center.lng, center.lat], TACTICAL_GRID_DIMENSION, ZOOM_TACTICO);
      const sectorKey = `${sector[0]}_${sector[1]}`;

      if (tileCanvasRef.current && tileCanvasRef.current.sectorKey === sectorKey) {
        return; // Mismo sector activo en pantalla
      }

      if (tileCanvasRef.current) {
        const { layerId, sourceId } = tileCanvasRef.current;
        if (map.getLayer(layerId)) map.removeLayer(layerId);
        if (map.getSource(sourceId)) map.removeSource(sourceId);
        tileCanvasRef.current = null;
      }

      const canvas = document.createElement('canvas');
      canvas.width = TILE_SIZE;
      canvas.height = TILE_SIZE;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const sourceId = `tile-canvas-source-${sectorKey}`;
      const layerId = `tile-canvas-layer-${sectorKey}`;
      const bounds = getTileBounds(sector[0], sector[1], ZOOM_TACTICO);

      try {
        map.addSource(sourceId, {
          type: 'canvas',
          canvas,
          coordinates: bounds,
          animate: false,
        });

        map.addLayer({
          id: layerId,
          type: 'raster',
          source: sourceId,
          paint: {
            'raster-opacity': 0.88,
            'raster-fade-duration': 0,
          },
        });

        const newTileState: ActiveTileCanvasState = {
          sectorKey,
          sector,
          sourceId,
          layerId,
          canvas,
          ctx,
          isDirty: true,
        };

        tileCanvasRef.current = newTileState;
        const fow = fogOfWarBase64 ? TacticalBitMap.fromBase64(fogOfWarBase64) : null;
        renderTacticalBattleCanvas(newTileState, activeBattleUnits, fow, hoveredCell);
      } catch (err) {
        console.warn('[TacticalWorldMap] Fallo no crítico al montar TileCanvas:', err);
      }
    },
    [renderTacticalBattleCanvas, fogOfWarBase64, activeBattleUnits, hoveredCell]
  );

  const adjacenciesGeoJSON = useMemo<any>(() => {
    const features: any[] = [];
    const provMap = new Map(provinces.map(p => [p.id, p]));
    void provMap;
    return { type: 'FeatureCollection', features };
  }, [provinces]);

  const provincesGeoJSON = useMemo<any>(() => {
    // Si tenemos las geometrías oficiales reales (/map/theatre_regions.json), las usamos directamente
    if (baseRegionsGeoJSON && Array.isArray(baseRegionsGeoJSON.features) && baseRegionsGeoJSON.features.length > 0) {
      const features = baseRegionsGeoJSON.features.map((feat: any) => {
        const provId = feat.id || feat.properties?.id;
        const ctrl = controlMap[provId];
        const clan = ctrl?.controllingClanId ? clansMap[ctrl.controllingClanId] : null;
        const isBuffer = String(provId).startsWith('BUF_');
        const isUnderSiege = ctrl?.status === 'under_siege';
        const isSelected = provId === activeProvinceId;
        const ownerColor = resolveFactionColor(
          ctrl?.controllingClanId,
          isBuffer,
          isUnderSiege,
          clan?.color
        );
        const sov = stateSovereigntyService.getState(String(provId));

        return {
          ...feat,
          id: provId,
          properties: {
            ...feat.properties,
            id: provId,
            name: sov?.customStateName || feat.properties?.name || provId,
            countryName: sov?.customCountryName || 'República Soberana de Venezuela',
            controllingFaction: sov?.controllingFactionId || 'blue_moon',
            ownerColor,
            isBuffer,
            isCapital: provId === 'REG_VE_01',
            isUnderSiege,
            isSelected,
            tcp: sov?.tcpCurrent ?? (ctrl?.currentTcp ?? 10000),
            tcpMax: sov?.tcpMax ?? (ctrl?.tcpThreshold ?? 10000),
          },
        };
      });

      return { type: 'FeatureCollection', features };
    }

    // Fallback proyectado referencial mientras descarga el GeoJSON
    const features: any[] = provinces.map((prov) => {
      const ctrl = controlMap[prov.id];
      const clan = ctrl?.controllingClanId ? clansMap[ctrl.controllingClanId] : null;
      const isBuffer = prov.id.startsWith('BUF_');
      const isUnderSiege = ctrl?.status === 'under_siege';
      const ownerColor = resolveFactionColor(
        ctrl?.controllingClanId,
        isBuffer,
        isUnderSiege,
        clan?.color
      );
      const sov = stateSovereigntyService.getState(prov.id);

      // Proyección referencial sobre el teatro venezolano y caribeño
      const lngCenter = (prov.posX - 50) * 0.28 - 66.5;
      const latCenter = (50 - prov.posY) * 0.16 + 7.8;
      const halfW = (prov.width * 0.11) / 2;
      const halfH = (prov.height * 0.09) / 2;

      return {
        type: 'Feature',
        id: prov.id,
        geometry: {
          type: 'Polygon',
          coordinates: [
            [
              [lngCenter - halfW, latCenter + halfH],
              [lngCenter + halfW, latCenter + halfH],
              [lngCenter + halfW, latCenter - halfH],
              [lngCenter - halfW, latCenter - halfH],
              [lngCenter - halfW, latCenter + halfH],
            ],
          ],
        },
        properties: {
          id: prov.id,
          name: sov?.customStateName || prov.name,
          countryName: sov?.customCountryName || 'República Soberana de Venezuela',
          controllingFaction: sov?.controllingFactionId || 'blue_moon',
          ownerColor,
          isBuffer,
          isCapital: prov.isCapital,
          tcp: sov?.tcpCurrent ?? (ctrl?.currentTcp ?? 10000),
          tcpMax: sov?.tcpMax ?? (ctrl?.tcpThreshold ?? 10000),
          isSelected: prov.id === activeProvinceId,
          isHovered: prov.id === hoveredProvinceId,
        },
      };
    });

    return { type: 'FeatureCollection', features };
  }, [baseRegionsGeoJSON, provinces, controlMap, clansMap, activeProvinceId, hoveredProvinceId, resolveFactionColor, sovereignVersion]);

  const provincesGeoJSONRef = useRef(provincesGeoJSON);
  provincesGeoJSONRef.current = provincesGeoJSON;

  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;
    let isMounted = true;

    const enterStandby = () => {
      if (isStandbyRef.current) return;
      isStandbyRef.current = true;
      setIsStandbyUI(true);
      if (mapInstanceRef.current && tileCanvasRef.current) {
        const src = mapInstanceRef.current.getSource(tileCanvasRef.current.sourceId) as
          | (CanvasSource & { pause?: () => void })
          | undefined;
        if (src && typeof src.pause === 'function') src.pause();
      }
    };

    const wakeFromStandby = () => {
      if (inactivityTimerRef.current !== null) {
        window.clearTimeout(inactivityTimerRef.current);
      }
      inactivityTimerRef.current = window.setTimeout(enterStandby, ACTIVITY_TIMEOUT_MS);

      if (!isStandbyRef.current) return;
      isStandbyRef.current = false;
      setIsStandbyUI(false);
      if (mapInstanceRef.current && tileCanvasRef.current) {
        pumpCanvasToWebGL(mapInstanceRef.current, tileCanvasRef.current.sourceId);
      }
    };

    const initMapEngine = async () => {
      try {
        const maplibreMod = await import('maplibre-gl');
        const maplibregl = (maplibreMod as any).default || maplibreMod;
        if (!isMounted || !mapContainerRef.current) return;

        if (typeof maplibregl.supported === 'function' && !maplibregl.supported()) {
          setWebglError('El acelerador gráfico o navegador no soporta WebGL 2.0.');
          return;
        }

        const setWorker = (maplibregl as any).setWorkerUrl || (maplibreMod as any).setWorkerUrl;
        if (typeof setWorker === 'function') {
          setWorker('/maplibre-gl-worker.mjs');
        }

        const map = new maplibregl.Map({
          container: mapContainerRef.current,
          style: ZERO_RASTER_MILITARY_STYLE,
          center: [-71.455, 10.395], // Epicentro Operacional Inicial: Teatro Cabimas (Zulia)
          zoom: 9.8,
          minZoom: 2.0,
          maxZoom: 18,
          doubleClickZoom: false,
          attributionControl: false,
        });

        map.on('zoom', () => {
          if (isMounted) {
            setCurrentZoom(Number(map.getZoom().toFixed(2)));
          }
        });

        if (typeof window !== 'undefined') {
          (window as any).__TACTICAL_MAP_INSTANCE__ = map;
          (window as any).__SET_TACTICAL_ZOOM__ = (z: number) => {
            try { map.setZoom(z); } catch {}
            if (isMounted) setCurrentZoom(z);
          };
        }

      map.on('load', () => {
        if (!isMounted) return;
        pruneCivilianLayers(map);

        // 1. Capa de Provincias Soberanas (theatre_regions.json)
        map.addSource('tactical-provinces', {
          type: 'geojson',
          data: provincesGeoJSONRef.current,
        });

        map.addLayer({
          id: 'provinces-fill',
          type: 'fill',
          source: 'tactical-provinces',
          maxzoom: ZOOM_TACTICO - 0.5,
          paint: {
            'fill-color': ['get', 'ownerColor'],
            'fill-opacity': [
              'case',
              ['boolean', ['get', 'isSelected'], false],
              0.92,
              ['boolean', ['get', 'isUnderSiege'], false],
              0.84,
              0.68,
            ],
          },
        });

        map.addLayer({
          id: 'provinces-borders',
          type: 'line',
          source: 'tactical-provinces',
          paint: {
            'line-color': [
              'case',
              ['boolean', ['get', 'isSelected'], false],
              '#00FF66', // Verde Fósforo CRT Radar al seleccionar
              ['boolean', ['get', 'isUnderSiege'], false],
              '#EF4444', // Borde rojo DEFCON 1 en asedio
              '#7B8A4A', // Bisel metálico militar --color-metal-edge
            ],
            'line-width': [
              'case',
              ['boolean', ['get', 'isSelected'], false],
              3.2,
              1.5,
            ],
            'line-opacity': 0.95,
          },
        });

        // 2. Capa de Red Vial Troncal Real de Venezuela (theatre_roads.json)
        map.addSource('tactical-roads', {
          type: 'geojson',
          data: '/map/theatre_roads.json',
        });

        // Capa 2A: Sombra de Tinta Cómic (#0A0B08)
        map.addLayer({
          id: 'roads-ink-shadow',
          type: 'line',
          source: 'tactical-roads',
          paint: {
            'line-color': '#0A0B08',
            'line-width': ['interpolate', ['linear'], ['zoom'], 4, 1.8, 8, 4.2, 14, 7.0],
            'line-opacity': 0.85,
          },
        });

        // Capa 2B: Resplandor Radar
        map.addLayer({
          id: 'roads-glow',
          type: 'line',
          source: 'tactical-roads',
          paint: {
            'line-color': [
              'match',
              ['get', 'highway'],
              'motorway', '#00FF66', // Verde Fósforo CRT
              '#F59E0B',             // Ámbar Militar C4ISR
            ],
            'line-width': ['interpolate', ['linear'], ['zoom'], 4, 1.4, 8, 3.6, 14, 6.0],
            'line-opacity': 0.35,
            'line-blur': 2.0,
          },
        });

        // Capa 2C: Núcleo de Carretera de Alta Definición
        map.addLayer({
          id: 'roads-core',
          type: 'line',
          source: 'tactical-roads',
          paint: {
            'line-color': [
              'match',
              ['get', 'highway'],
              'motorway', '#00FF66', // Autopistas troncales verde fósforo CRT
              '#FBBF24',             // Troncales nacionales ámbar radar
            ],
            'line-width': ['interpolate', ['linear'], ['zoom'], 4, 0.8, 8, 1.8, 14, 3.2],
            'line-opacity': 0.95,
          },
        });

        // 3. Capa Especializada del Teatro Cabimas (Grafo Activo A* y POIs Petroleros)
        map.addSource('cabimas-road-network', {
          type: 'geojson',
          data: roadNetworkEngine.toGeoJSON(),
        });

        map.addLayer({
          id: 'cabimas-roads-highlight',
          type: 'line',
          source: 'cabimas-road-network',
          paint: {
            'line-color': '#06B6D4', // Cian brillante táctico para el corredor Cabimas
            'line-width': ['interpolate', ['linear'], ['zoom'], 8, 3.5, 14, 6.0],
            'line-opacity': 0.9,
          },
        });

        // 4. Capa de POIs Estratégicos Cabimas (La Salina, Barroso II, etc.)
        const cabimasPoisGeoJSON = {
          type: 'FeatureCollection',
          features: roadNetworkEngine.getAllNodes().map(node => ({
            type: 'Feature',
            geometry: { type: 'Point', coordinates: node.coordinates },
            properties: {
              id: node.id,
              name: node.name,
              poiType: node.poiType || 'junction',
            },
          })),
        };

        map.addSource('cabimas-pois', {
          type: 'geojson',
          data: cabimasPoisGeoJSON as any,
        });

        map.addLayer({
          id: 'cabimas-pois-circle',
          type: 'circle',
          source: 'cabimas-pois',
          paint: {
            'circle-radius': ['interpolate', ['linear'], ['zoom'], 8, 5, 12, 9],
            'circle-color': '#F59E0B',
            'circle-stroke-color': '#090D14',
            'circle-stroke-width': 2,
          },
        });

        // 5. Capa de Marcas Tácticas WPlace
        map.addSource('tactical-marks-source', {
          type: 'geojson',
          data: {
            type: 'FeatureCollection',
            features: [],
          },
        });

        map.addLayer({
          id: 'tactical-marks-layer',
          type: 'circle',
          source: 'tactical-marks-source',
          paint: {
            'circle-radius': 7,
            'circle-color': ['get', 'colorHex'],
            'circle-stroke-color': '#FFFFFF',
            'circle-stroke-width': 2,
          },
        });

        // 6. Capa de Edificios Industriales de Feudos (OpenPlace en Coordenadas)
        map.addSource('fief-buildings-source', {
          type: 'geojson',
          data: fiefBuildingService.toGeoJSON(),
        });

        // Capa 6A: Resplandor de Producción Activa (Glow)
        map.addLayer({
          id: 'fief-buildings-glow',
          type: 'circle',
          source: 'fief-buildings-source',
          paint: {
            'circle-radius': ['interpolate', ['linear'], ['zoom'], 8, 10, 14, 18],
            'circle-color': [
              'match',
              ['get', 'buildingType'],
              'refinery', '#E5A93C',
              'microchip_foundry', '#06B6D4',
              'weapons_factory', '#EF4444',
              'logistics_silo', '#22C55E',
              'radar_station', '#A855F7',
              '#38BDF8',
            ],
            'circle-opacity': 0.35,
            'circle-blur': 1.5,
          },
        });

        // Capa 6B: Núcleo de Estructura Industrial
        map.addLayer({
          id: 'fief-buildings-circle',
          type: 'circle',
          source: 'fief-buildings-source',
          paint: {
            'circle-radius': ['interpolate', ['linear'], ['zoom'], 8, 6, 14, 10],
            'circle-color': [
              'match',
              ['get', 'buildingType'],
              'refinery', '#E5A93C',
              'microchip_foundry', '#06B6D4',
              'weapons_factory', '#EF4444',
              'logistics_silo', '#22C55E',
              'radar_station', '#A855F7',
              '#38BDF8',
            ],
            'circle-stroke-color': '#0E100C',
            'circle-stroke-width': 2.5,
          },
        });

        // Capa 6C: Etiquetas de Edificios Industriales (minzoom: 11.0)
        map.addLayer({
          id: 'fief-buildings-labels',
          type: 'symbol',
          source: 'fief-buildings-source',
          minzoom: 11.0,
          layout: {
            'text-field': ['get', 'name'],
            'text-size': ['interpolate', ['linear'], ['zoom'], 11, 9, 14, 11],
            'text-offset': [0, 1.4],
            'text-anchor': 'top',
          },
          paint: {
            'text-color': '#FBBF24',
            'text-halo-color': '#0A0B08',
            'text-halo-width': 2,
          },
        });

        // 7. Capa de Red Vial Urbana Real (theatre_urban_roads.json - minzoom: 10.0)
        map.addSource('tactical-urban-roads', {
          type: 'geojson',
          data: '/map/theatre_urban_roads.json',
        });

        // 7A: Sombra de Tinta Cómic
        map.addLayer({
          id: 'urban-roads-shadow',
          type: 'line',
          source: 'tactical-urban-roads',
          minzoom: 10.0,
          paint: {
            'line-color': '#0A0B08',
            'line-width': ['interpolate', ['linear'], ['zoom'], 10, 2.5, 14, 5.0],
            'line-opacity': 0.85,
          },
        });

        // 7B: Resplandor Radar Cian/Fósforo C4ISR
        map.addLayer({
          id: 'urban-roads-glow',
          type: 'line',
          source: 'tactical-urban-roads',
          minzoom: 10.0,
          paint: {
            'line-color': [
              'match',
              ['get', 'highway'],
              'primary', '#00FF66', // Avenidas principales en verde fósforo
              '#06B6D4',            // Avenidas secundarias en cian táctico
            ],
            'line-width': ['interpolate', ['linear'], ['zoom'], 10, 2.0, 14, 4.0],
            'line-opacity': 0.45,
            'line-blur': 1.5,
          },
        });

        // 7C: Núcleo de Vía Urbana de Alta Definición
        map.addLayer({
          id: 'urban-roads-core',
          type: 'line',
          source: 'tactical-urban-roads',
          minzoom: 10.0,
          paint: {
            'line-color': [
              'match',
              ['get', 'highway'],
              'primary', '#6EE7B7', // Verde menta nítido
              '#38BDF8',            // Azul cielo nítido
            ],
            'line-width': ['interpolate', ['linear'], ['zoom'], 10, 1.2, 14, 2.5],
            'line-opacity': 0.95,
          },
        });

        // 8. Capa de Nombres de Ciudades y Metrópolis Reales (theatre_cities.json - minzoom: 9.0)
        map.addSource('tactical-cities', {
          type: 'geojson',
          data: '/map/theatre_cities.json',
        });

        // 8A: Marcador Radar de Ciudad
        map.addLayer({
          id: 'cities-glow',
          type: 'circle',
          source: 'tactical-cities',
          minzoom: 9.0,
          maxzoom: 15.0,
          paint: {
            'circle-radius': ['interpolate', ['linear'], ['zoom'], 9, 6, 14, 12],
            'circle-color': '#F59E0B',
            'circle-opacity': 0.4,
            'circle-blur': 1.2,
          },
        });

        map.addLayer({
          id: 'cities-point',
          type: 'circle',
          source: 'tactical-cities',
          minzoom: 9.0,
          maxzoom: 15.0,
          paint: {
            'circle-radius': ['interpolate', ['linear'], ['zoom'], 9, 3.5, 14, 6],
            'circle-color': '#F2E8D5',
            'circle-stroke-color': '#0A0B08',
            'circle-stroke-width': 2,
          },
        });

        // 8B: Etiquetas de Texto con el Nombre de la Ciudad
        map.addLayer({
          id: 'cities-labels',
          type: 'symbol',
          source: 'tactical-cities',
          minzoom: 9.0,
          maxzoom: 15.0,
          layout: {
            'text-field': ['get', 'name'],
            'text-size': ['interpolate', ['linear'], ['zoom'], 9, 11, 14, 15],
            'text-offset': [0, 1.2],
            'text-anchor': 'top',
            'text-transform': 'uppercase',
            'text-letter-spacing': 0.1,
          },
          paint: {
            'text-color': '#F2E8D5',
            'text-halo-color': '#0A0B08',
            'text-halo-width': 2,
          },
        });

        // 9. Capa de Unidades Desplegadas Operacionales (operationalUnitsService - minzoom: 10.0)
        map.addSource('operational-units-source', {
          type: 'geojson',
          data: operationalUnitsService.toGeoJSON() as any,
        });

        map.addLayer({
          id: 'operational-units-glow',
          type: 'circle',
          source: 'operational-units-source',
          minzoom: 10.0,
          paint: {
            'circle-radius': ['interpolate', ['linear'], ['zoom'], 10, 8, 14, 14],
            'circle-color': ['get', 'colorHex'],
            'circle-opacity': 0.4,
            'circle-blur': 1.5,
          },
        });

        map.addLayer({
          id: 'operational-units-circle',
          type: 'circle',
          source: 'operational-units-source',
          minzoom: 10.0,
          paint: {
            'circle-radius': ['interpolate', ['linear'], ['zoom'], 10, 5, 14, 9],
            'circle-color': ['get', 'colorHex'],
            'circle-stroke-color': '#0A0B08',
            'circle-stroke-width': 2,
          },
        });

        map.addLayer({
          id: 'operational-units-labels',
          type: 'symbol',
          source: 'operational-units-source',
          minzoom: 10.0,
          layout: {
            'text-field': ['concat', ['get', 'callsign'], ' • ', ['get', 'hp'], 'HP'],
            'text-size': ['interpolate', ['linear'], ['zoom'], 10, 9, 14, 11],
            'text-offset': [0, -1.4],
            'text-anchor': 'bottom',
          },
          paint: {
            'text-color': '#00FF66', // Verde fósforo CRT militar
            'text-halo-color': '#0A0B08',
            'text-halo-width': 2,
          },
        });

        // Cursores tácticos e interactividad
        map.on('mouseenter', 'provinces-fill', () => {
          map.getCanvas().style.cursor = 'pointer';
        });
        map.on('mouseleave', 'provinces-fill', () => {
          map.getCanvas().style.cursor = '';
        });

        map.on('mousemove', (e: MapMouseEvent) => {
          wakeFromStandby();
          if (map.getZoom() >= ZOOM_TACTICO - 1.0) {
            const { cell } = lngLatToGridCoords([e.lngLat.lng, e.lngLat.lat], TACTICAL_GRID_DIMENSION);
            setHoveredCell((prev) => (prev && prev[0] === cell[0] && prev[1] === cell[1] ? prev : cell));
          } else {
            setHoveredCell(null);
          }
        });

        map.on('click', (e: MapMouseEvent) => {
          wakeFromStandby();
          if (map.getZoom() >= ZOOM_TACTICO - 1.0) {
            const { sector, cell } = lngLatToGridCoords([e.lngLat.lng, e.lngLat.lat], TACTICAL_GRID_DIMENSION, ZOOM_TACTICO);
            setSelectedMicroCoords({
              sector,
              cell,
              lngLat: [e.lngLat.lng, e.lngLat.lat],
            });
            if (onSelectTacticalCellRef.current) {
              onSelectTacticalCellRef.current(sector, cell, [e.lngLat.lng, e.lngLat.lat]);
            }
          }
        });

        map.on('click', 'provinces-fill', (e: MapMouseEvent) => {
          if (map.getZoom() >= ZOOM_TACTICO - 1.0) return;
          const featureId = (e as any).features?.[0]?.properties?.id;
          if (featureId && onSelectProvinceRef.current) {
            onSelectProvinceRef.current(String(featureId));
          }
        });

        map.on('zoom', () => {
          setCurrentZoom(Number(map.getZoom().toFixed(2)));
          syncTileCanvasLifecycle(map);
        });

        map.on('moveend', () => {
          syncTileCanvasLifecycle(map);
        });
      });

        mapInstanceRef.current = map;
        if (typeof window !== 'undefined') {
          (window as any).__TACTICAL_MAP_INSTANCE__ = map;
        }
      } catch (err: any) {
        console.error('[TacticalWorldMap] Fallo crítico al inicializar MapLibre WebGL:', err);
        setWebglError(err?.message || 'Error de contexto WebGL al inicializar mapa.');
      }
    };

    initMapEngine();

    window.addEventListener('blur', enterStandby);
    window.addEventListener('focus', wakeFromStandby);
    inactivityTimerRef.current = window.setTimeout(enterStandby, ACTIVITY_TIMEOUT_MS);

    return () => {
      isMounted = false;
      window.removeEventListener('blur', enterStandby);
      window.removeEventListener('focus', wakeFromStandby);
      if (inactivityTimerRef.current !== null) window.clearTimeout(inactivityTimerRef.current);
      if (mapInstanceRef.current) {
        if (typeof window !== 'undefined' && (window as any).__TACTICAL_MAP_INSTANCE__ === mapInstanceRef.current) {
          (window as any).__TACTICAL_MAP_INSTANCE__ = null;
        }
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !map.isStyleLoaded()) return;

    const provSource = map.getSource('tactical-provinces') as GeoJSONSource | undefined;
    if (provSource) provSource.setData(provincesGeoJSON);

    if (tileCanvasRef.current) {
      const fow = fogOfWarBase64 ? TacticalBitMap.fromBase64(fogOfWarBase64) : null;
      renderTacticalBattleCanvas(tileCanvasRef.current, activeBattleUnits, fow, hoveredCell);
    }
  }, [provincesGeoJSON, activeBattleUnits, fogOfWarBase64, hoveredCell, renderTacticalBattleCanvas]);

  useEffect(() => {
    const unsub = operationalUnitsService.subscribe(() => {
      const map = mapInstanceRef.current;
      if (!map || !map.isStyleLoaded()) return;
      const src = map.getSource('operational-units-source') as GeoJSONSource | undefined;
      if (src) src.setData(operationalUnitsService.toGeoJSON() as any);
    });
    return () => unsub();
  }, []);

  // Actualización de Vistas C4ISR en el lienzo WebGL
  const handleSelectViewMode = useCallback((mode: C4ISRMapViewMode) => {
    setCurrentViewMode(mode);
    const map = mapInstanceRef.current;
    if (!map || !map.isStyleLoaded() || !map.getLayer('cabimas-roads-highlight')) return;

    const colors: Record<C4ISRMapViewMode, string> = {
      V1_SOVEREIGNTY: '#06B6D4',
      V2_LOGISTICS: '#22C55E',
      V3_RESOURCES: '#E5A93C',
      V4_THREATS: '#EF4444',
    };

    map.setPaintProperty('cabimas-roads-highlight', 'line-color', colors[mode]);

    // Resaltado de Edificios Industriales en Vista V3 Recursos
    if (map.getLayer('fief-buildings-glow')) {
      map.setPaintProperty(
        'fief-buildings-glow',
        'circle-opacity',
        mode === 'V3_RESOURCES' ? 0.75 : 0.35
      );
    }
  }, []);

  const handleCenterCabimas = useCallback(() => {
    mapInstanceRef.current?.flyTo({
      center: [-71.455, 10.395],
      zoom: 11.2,
      essential: true,
      duration: 1800,
    });
  }, []);

  const handleStampMark = useCallback((type: TacticalMarkType) => {
    const center = mapInstanceRef.current ? mapInstanceRef.current.getCenter() : { lng: -71.455, lat: 10.395 };
    const colorMap: Record<TacticalMarkType, string> = {
      recon: '#06B6D4',
      danger_mine: '#EAB308',
      claim: '#3B82F6',
      rally_strike: '#EF4444',
    };
    const newMark: TacticalMapMark = {
      id: `mark-${Date.now()}`,
      clanId: userClanId || 'clan-ferro',
      createdBy: commander?.callsign || 'cmd',
      markType: type,
      location: [center.lng, center.lat],
      colorHex: colorMap[type],
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 3600000).toISOString(),
    };
    setTacticalMarks(prev => [newMark, ...prev.slice(0, 49)]);
  }, [userClanId, commander]);

  // Sincronización de marcas tácticas WPlace con la fuente WebGL
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !map.isStyleLoaded()) return;
    const marksSource = map.getSource('tactical-marks-source') as GeoJSONSource | undefined;
    if (marksSource) {
      marksSource.setData({
        type: 'FeatureCollection',
        features: tacticalMarks.map(m => ({
          type: 'Feature',
          geometry: { type: 'Point', coordinates: m.location },
          properties: { id: m.id, colorHex: m.colorHex, markType: m.markType },
        })),
      });
    }
  }, [tacticalMarks]);

  const activeMicroCoords = useMemo(() => {
    if (selectedMicroCoords) return selectedMicroCoords;
    if (currentZoom >= 15.0 && mapInstanceRef.current) {
      const center = mapInstanceRef.current.getCenter();
      const coords = lngLatToGridCoords([center.lng, center.lat], TACTICAL_GRID_DIMENSION, ZOOM_TACTICO);
      return {
        sector: coords.sector,
        cell: coords.cell,
        lngLat: [center.lng, center.lat] as [number, number],
      };
    }
    return null;
  }, [selectedMicroCoords, currentZoom]);

  const microAssignment = useMemo(() => {
    if (!activeMicroCoords || currentZoom < 15.0) return null;
    return spatialDeploymentService.getSpatialAssignment(activeMicroCoords.lngLat);
  }, [activeMicroCoords, currentZoom]);

  if (webglError) {
    return (
      <div className={`relative w-full h-full flex flex-col items-center justify-center bg-[#090D14] p-6 text-center select-none ${className}`}>
        <div className="max-w-md p-6 bg-[#161712] border-2 border-amber-500 rounded-[6px_2px_6px_2px] shadow-[4px_4px_0px_#0A0B08] space-y-4">
          <div className="text-amber-400 font-mono text-xs font-black tracking-widest uppercase">
            [ALERTA C4ISR: FALLO EN MOTOR GRÁFICO WEBGL 2.0]
          </div>
          <p className="text-[#F2E8D5] text-xs font-mono leading-relaxed">
            {webglError}
          </p>
          <div className="text-[11px] font-mono text-neutral-400 bg-black/60 p-2.5 rounded border border-neutral-800">
            Verifica que la aceleración por hardware WebGL 2.0 esté habilitada en tu navegador para continuar la campaña.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative w-full h-full overflow-hidden bg-[#090D14] ${className}`}>
      <div ref={mapContainerRef} className="w-full h-full" />

      {/* Controles C4ISR: Selector de 4 Vistas y Herramientas WPlace */}
      <TacticalMapControls
        currentViewMode={currentViewMode}
        onSelectViewMode={handleSelectViewMode}
        commander={commander}
        activeMarksCount={tacticalMarks.length}
        onStampMark={handleStampMark}
        onCenterCabimas={handleCenterCabimas}
      />
      {/* Capa Semántica e Interactiva Accesible (Habilita accesibilidad y orquestación E2E en Playwright) */}
      <div className="absolute inset-0 pointer-events-none z-10 overflow-hidden" aria-hidden="false">
        {provinces.map((prov) => {
          const isBuffer = prov.id.startsWith('BUF_');
          return (
            <button
              key={prov.id}
              data-region-id={prov.id}
              data-buffer-zone={isBuffer ? 'true' : 'false'}
              onClick={(e) => {
                e.stopPropagation();
                if (onSelectProvince) onSelectProvince(prov.id);
              }}
              tabIndex={-1}
              aria-label={`Región ${prov.name}`}
              className="absolute pointer-events-auto opacity-0 focus:opacity-100 w-8 h-8 -translate-x-1/2 -translate-y-1/2 cursor-pointer"
              style={{
                left: `${prov.posX}%`,
                top: `${prov.posY}%`,
              }}
            />
          );
        })}
      </div>
      <div className="absolute bottom-3 right-3 z-20 bg-[#090D14]/90 border-2 border-[#46521F] px-3 py-1.5 text-[10px] font-mono text-emerald-400 rounded shadow-[3px_3px_0px_#0A0B08]">
        <div>OPENPLACE WEBGL • ZOOM: {currentZoom.toFixed(2)}x • TEATRO VENEZUELA ({provinces.filter(p => !p.id.startsWith('BUF_')).length} SOBERANAS + {provinces.filter(p => p.id.startsWith('BUF_')).length} BUFFERS)</div>
        {isStandbyUI && <div className="text-amber-500 font-bold">[MODO AHORRO C4ISR: 0% GPU STANDBY]</div>}
      </div>

      {/* Panel de Detalle del Microjuego Táctico C4ISR (Activo a Zoom >= 15.0) */}
      <MicroTacticalDeckHUD
        currentZoom={currentZoom}
        selectedSector={activeMicroCoords?.sector ?? null}
        selectedCell={activeMicroCoords?.cell ?? null}
        selectedLngLat={activeMicroCoords?.lngLat ?? null}
        terrainType={microAssignment?.terrainName}
        defenseStars={microAssignment ? Math.round(microAssignment.defenseCoverPercent / 10) : 2}
        occupantName={
          microAssignment?.deployedUnit?.callsign ||
          microAssignment?.deployedBuilding?.buildingType ||
          null
        }
        onOpenDeploy={() => setIsDeployModalOpen(true)}
        onOpenBuild={() => setIsBuildDrawerOpen(true)}
      />

      {/* Modales de Despliegue y Construcción Espacial */}
      {activeMicroCoords && (
        <>
          <TacticalUnitDeployModal
            isOpen={isDeployModalOpen}
            onClose={() => setIsDeployModalOpen(false)}
            sector={activeMicroCoords.sector}
            cell={activeMicroCoords.cell}
            lngLat={activeMicroCoords.lngLat}
            userClanId={userClanId || 'clan-ferro'}
            userFactionId="blue_moon"
            onDeploySuccess={() => {
              if (tileCanvasRef.current) {
                renderTacticalBattleCanvas(tileCanvasRef.current, activeBattleUnits, null, hoveredCell);
              }
            }}
          />

          <TacticalConstructionDrawer
            isOpen={isBuildDrawerOpen}
            onClose={() => setIsBuildDrawerOpen(false)}
            sector={activeMicroCoords.sector}
            cell={activeMicroCoords.cell}
            lngLat={activeMicroCoords.lngLat}
            userClanId={userClanId || 'clan-ferro'}
            onConstructionSuccess={() => {
              const map = mapInstanceRef.current;
              if (map && map.isStyleLoaded()) {
                const bldSrc = map.getSource('fief-buildings-source') as GeoJSONSource | undefined;
                if (bldSrc) bldSrc.setData(fiefBuildingService.toGeoJSON());
              }
            }}
          />
        </>
      )}
    </div>
  );
};

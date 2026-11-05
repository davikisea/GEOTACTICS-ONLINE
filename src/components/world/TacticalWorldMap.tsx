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

export interface TacticalWorldMapProps {
  userClanId?: string | null;
  activeProvinceId?: string | null;
  activeBattleUnits?: TacticalUnit[];
  fogOfWarBase64?: string | null;
  onSelectProvince?: (provinceId: string) => void;
  onSelectTacticalCell?: (sector: [number, number], cell: [number, number]) => void;
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
      // CAPA 2 (Combate Táctico Advance Wars LOD 3) deshabilitada en el MVP Político.
      // Nunca se monta el TileCanvas de batalla sobre el globo para mantener 100% foco en la Capa 1.
      if (tileCanvasRef.current) {
        const { layerId, sourceId } = tileCanvasRef.current;
        if (map.getLayer(layerId)) map.removeLayer(layerId);
        if (map.getSource(sourceId)) map.removeSource(sourceId);
        tileCanvasRef.current = null;
      }
      return;
    },
    []
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

        return {
          ...feat,
          id: provId,
          properties: {
            ...feat.properties,
            id: provId,
            ownerColor,
            isBuffer,
            isCapital: provId === 'REG_VE_01',
            isUnderSiege,
            isSelected,
            tcp: ctrl?.currentTcp ?? 10000,
            tcpMax: ctrl?.tcpThreshold ?? 10000,
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
          name: prov.name,
          ownerColor,
          isBuffer,
          isCapital: prov.isCapital,
          tcp: ctrl?.currentTcp ?? 10000,
          tcpMax: ctrl?.tcpThreshold ?? 10000,
          isSelected: prov.id === activeProvinceId,
          isHovered: prov.id === hoveredProvinceId,
        },
      };
    });

    return { type: 'FeatureCollection', features };
  }, [baseRegionsGeoJSON, provinces, controlMap, clansMap, activeProvinceId, hoveredProvinceId, resolveFactionColor]);

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
          center: [-66.5, 7.8], // Centroide Geográfico Nacional: República de Venezuela
          zoom: 5.7,
          minZoom: 2.0,
          maxZoom: 18,
          doubleClickZoom: false,
          attributionControl: false,
        });

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
          if (map.getZoom() >= ZOOM_TACTICO - 1.0 && onSelectTacticalCellRef.current) {
            const { sector, cell } = lngLatToGridCoords([e.lngLat.lng, e.lngLat.lat], TACTICAL_GRID_DIMENSION);
            onSelectTacticalCellRef.current(sector, cell);
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
    </div>
  );
};

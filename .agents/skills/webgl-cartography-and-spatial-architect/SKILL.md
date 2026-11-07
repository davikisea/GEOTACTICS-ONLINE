---
name: webgl-cartography-and-spatial-architect
description: Arquitecto de Cartografía WebGL 2.0 Zero-Raster (MapLibre GL JS v6), Semantic Zoom de 3 estratos, proyección analítica WGS84 O(1) (coordinates.ts), niebla empaquetada de 50 bytes (tacticalBitmap.ts) y grafos viales A* con índice espacial bitwise O(1) (roadNetworkEngine.ts, spatialRoadIndex.ts) para GEOTACTICS ONLINE (@domains/world). Usa esta skill siempre que trabajes en el mapa estratégico, capas GeoJSON, carreteras, peajes, feudos espaciales o shaders del teatro de operaciones.
---

# WEBGL CARTOGRAPHY, ZERO-RASTER SHADERS & SPATIAL ROAD ARCHITECT (`@domains/world`)

Gobierna el motor cartográfico y espacial de **GEOTACTICS: ONLINE** en `src/domains/world/`, garantizando un renderizado **100% Zero-Raster (0 peticiones a servidores externos de teselas)**, picking matemático en tiempo constante $O(1)$ y navegación vial $A^*$ de alta precisión.

---

## 1. CUÁNDO ACTIVAR ESTA SKILL

- Al modificar `src/domains/world/components/TacticalWorldMap.tsx`, `TacticalMapControls.tsx` o `src/domains/world/hooks/useTerritoryMap.ts`.
- Al trabajar con coordenadas geográficas, grillas de sector, niebla de guerra o zoom semántico (`src/domains/world/core/coordinates.ts`, `tacticalBitmap.ts`, `worldMapEngine.ts`).
- Al editar o consultar la red de carreteras, guarniciones viales, convoyes o emplazamiento de edificios de feudos a $\le 150\text{ m}$ de una vía (`roadNetworkEngine.ts`, `spatialRoadIndex.ts`, `roadGarrisonEngine.ts`, `spatialDeploymentService.ts`).
- Al inspeccionar o actualizar los archivos GeoJSON locales en `public/map/`.

---

## 2. ARQUITECTURA ZERO-RASTER Y FUENTES GEOJSON LOCALES

1. **Aislamiento Total de Red (Cero Tiles Raster Comerciales)**:
   - Está **terminantemente prohibido** añadir URLs externas de CartoDB, Mapbox, OpenStreetMap raster (`{z}/{x}/{y}.png`) o fuentes remotas.
   - El estilo base `ZERO_RASTER_MILITARY_STYLE` en `src/domains/world/components/TacticalWorldMap.tsx` utiliza fondo `#0E100C` y el worker local `/maplibre-gl-worker.mjs`.
2. **Los 5 Assets GeoJSON Locales en `public/map/`**:
   - `/map/world_land.json`: Masa continental base (`fill: #1C1E17`, `line: #46521F`).
   - `/map/theatre_regions.json`: Polígonos soberanos del Teatro Venezuela (**24 Estados Jugables `REG_VE_01`..`REG_VE_24` + 7 Zonas Buffer Fronterizas `BUF_*` = 31 Regiones Canónicas** definidas en `CANONICAL_VENEZUELA_REGIONS` de `src/domains/world/core/politicalAliceEngine.ts`).
   - `/map/theatre_roads.json`: Red vial troncal nacional renderizada en 3 capas en GPU (`roads-ink-shadow` `#0A0B08`, `roads-glow` `#00FF66`/`#F59E0B`, `roads-core` `#FBBF24`).
   - `/map/theatre_urban_roads.json`: Malla vial intra-urbana (`source: 'tactical-urban-roads'`, activa en `minzoom: 10.0`).
   - `/map/theatre_cities.json`: Polígonos y etiquetas de núcleos urbanos (`source: 'tactical-cities'`, activa entre `minzoom: 9.0` y `maxzoom: 15.0`).
3. **Las 4 Vistas Tácticas C4ISR (`C4ISRMapViewMode` en `TacticalMapControls.tsx`)**:
   - `V1_SOVEREIGNTY`: Colores heráldicos de facción/clan y fronteras De Jure / De Facto.
   - `V2_LOGISTICS`: Corredores viales, cuellos de botella, estrechos (Maracaibo/Paria) y líneas de suministro BFS.
   - `V3_RESOURCES`: RGOs regionales (Tier 1 a Tier 5), complejos industriales y nodos estratégicos.
   - `V4_THREATS`: Regiones bajo asedio (`under_siege`), guarniciones viales, minas WPlace y burbujas EW.

---

## 3. LOS 3 ESTRATOS DE SEMANTIC LOD Y MATEMÁTICA ESPACIAL $O(1)$

Definidos en `src/domains/world/core/coordinates.ts`:
- **`ZOOM_GLOBAL = 3.5` (Estrato 1: $1.5 \le z < 10.0$)**: Vista macro geopolítica de estados, capitales (`15,000 TCP`) y estrechos estratégicos.
- **`ZOOM_OPERACIONAL = 10.0` (Estrato 2: $10.0 \le z < 15.0$)**: Vista operacional de carreteras urbanas, 15 nodos viales del Teatro Cabimas (`center: [-71.455, 10.395]`, `zoom: 9.8`), feudos de clanes y guarniciones de ruta.
- **`ZOOM_TACTICO = 15.0` (Estrato 3: $z \ge 15.0$)**: Micro-vista táctica donde `syncTileCanvasLifecycle` proyecta el `CanvasSource` de `TILE_SIZE = 1000` ($20\times 20$ celdas) con unidades en escala **1–100 HP enteros**, niebla de guerra empaquetada en 50 bytes (`TacticalBitMap` en `src/domains/world/core/tacticalBitmap.ts`) y despliegue espacial (`spatialDeploymentService.ts`).

### Funciones Analíticas Obligatorias (`coordinates.ts` — Prohibido Raycasting Poligonal Pesado)
- Usa siempre `lngLatToGridCoords(lng, lat)`, `tileFractionToLngLat`, `gridCoordsToLngLat`, `getTileBounds(sectorX, sectorY)` y `traceSupplyLine(start, end)` (algoritmo Bresenham entero).
- Toda validación de cambios en coordenadas o bitmap debe correr:
  ```powershell
  npx tsx src/domains/world/__tests__/coordinatesAndBitmap.test.ts
  ```

---

## 4. RED VIAL $A^*$, ÍNDICE ESPACIAL BITWISE $O(1)$ Y GUARNICIONES DE RUTA

1. **Índice Espacial 2D (`src/domains/world/core/spatialRoadIndex.ts`)**:
   - Empaqueta coordenadas `(cellX, cellY)` en un entero SMI de 32 bits (`getCellKey`) con celdas de `0.08°`.
   - Para validar si un edificio industrial o de feudo (`fiefBuildingService.ts`) puede construirse junto a una carretera, usa siempre `isLocationAdjacentToRoad(lng, lat, 0.15)` ($\le 150\text{ m}$ en $O(1)$).
2. **Motor de Red Vial (`src/domains/world/core/roadNetworkEngine.ts`)**:
   - Calcula rutas óptimas con `findOptimalRoadRoute` ($A^*$), ponderando `BASE_ROAD_CLASS_SPEED_KMH` (`highway: 80` a `rural_track: 30`) y `SURFACE_SPEED_MULTIPLIER` (`reinforced_concrete: 1.15` a `dirt: 0.40`).
3. **Guarniciones Viales y 5 Doctrinas 2026 (`src/domains/world/core/roadGarrisonEngine.ts`)**:
   - Soporta Niveles 1 a 4 (`1,000` a `15,000 HP`), cola de relevo de 4 comandantes (2 titulares `+25%` + 2 en reserva `+10%`) y las 5 doctrinas: `standard_infantry`, `anti_armor_ditch` (-75% velocidad blindada al 25% de daño), `ew_jammer_bubble` (radio EW de 7.0 km), `c_uas_air_defense` y `artillery_firebase`.
   - Valida siempre con:
     ```powershell
     npx tsx src/domains/world/__tests__/roadNetworkEngine.test.ts
     npx tsx src/domains/world/__tests__/roadGarrisonEngine.test.ts
     npx tsx src/domains/world/__tests__/urbanRoadsAndCities.test.ts
     ```

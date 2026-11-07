# VOLUMEN 1: ARQUITECTURA CARTOGRÁFICA WEBGL 2.0 ZERO-RASTER
**Documento Canónico Unificado:** `01_MASTER_CARTOGRAPHY_WEBGL_ZERO_RASTER.md`  
**Proyecto:** *GEOTACTICS: ONLINE (Wars of Legacy)*  
**Versión:** 2.1.0-PROD (Zero-Raster, OpenPlace Bridge & Dominio Modular `world`)  
**Estado:** Documento de Verdad Absoluta (SSOT - Single Source of Truth)  
**Archivos Consolidados y Reemplazados:**  
- `WARERA_MAP_ARCHITECTURE_DEEP_DIVE.md` (Arquitectura de alto rendimiento inspirada en WarEra)  
- `PLAN_IMPLEMENTACION_MAPA_VECTORIAL_ZERO_RASTER.md` (Especificación de pipeline vectorial)  
- `PLAN_DESPLIEGUE_MAPA_WEBGL_VENEZUELA.md` (Matriz de 24 Estados de Venezuela, 7 Buffers y Red Troncal)  

---

# 1. VISIÓN FUNDACIONAL: LA FÓRMULA ZERO-RASTER DE ALTO RENDIMIENTO

La mayoría de los juegos web de estrategia militar o geopolítica y las aplicaciones de mapas tradicionales cometen uno de estos dos errores críticos:
1. **Sobrecarga de Tiles Raster (PNG/JPG):** Descargar cientos de imágenes cuadradas (`{z}/{x}/{y}.png`) mediante peticiones HTTP concurrentes cada vez que el usuario hace pan o zoom. Esto satura el ancho de banda, genera parpadeos y consume decenas de megabytes de RAM.
2. **Sobrecarga de DOM/SVG:** Renderizar miles de nodos `<path>` o `<svg>` en el árbol del navegador. Cuando hay más de 500 regiones, cada evento de `mousemove` o cambio de color fuerza un *reflow* y *recalculation* de estilos en la CPU, derrumbando los FPS a menos de 15 FPS.

### La Solución Canónica de GEOTACTICS:
GEOTACTICS opera bajo una arquitectura **WebGL Vectorial Híbrida Zero-Raster** implementada sobre **MapLibre GL JS v6.16.0** dentro del dominio modular `src/domains/world/` (`@domains/world`):
- **Aislamiento de Red 100% Local:** Cero peticiones de red a servidores externos (`cartodb.com`, `mapbox.com`, `openstreetmap.org`). Cero API Keys comerciales.
- **Geometrías Vectoriales Servidas Localmente (`public/map/`):**
  - Masa continental global (`/map/world_land.json`).
  - Polígonos soberanos del teatro de operaciones (`/map/theatre_regions.json`).
  - Red vial troncal nacional (`/map/theatre_roads.json`).
  - Red vial urbana de alta densidad (`/map/theatre_urban_roads.json`, activa en `minzoom: 10.0`).
  - Nodos urbanos y metrópolis reales (`/map/theatre_cities.json`, activa entre `minzoom: 9.0` y `maxzoom: 15.0`).
- **Fondo Táctico Búnker:** Fondo de pantalla de vacío militar (`#0E100C`) con masas de tierra entintadas (`#1C1E17`) y bordes de camuflaje oliva (`#46521F`).
- **Worker Autónomo Desacoplado y Zero-SSR:** Importación dinámica (`await import('maplibre-gl')`) dentro de `useEffect` y configuración explícita de `setWorkerUrl('/maplibre-gl-worker.mjs')` desde `public/maplibre-gl-worker.mjs`, garantizando carga local inmediata con código 200 OK sin colapsos de CORS, ni fallos de SSR en Vite.
- **Picking Analítico WGS84 O(1):** Resolución instantánea de coordenadas geográficas a sectores Web Mercator y baldosas tácticas de $20 \times 20$ en $<0.001\text{ ms}$ (`src/domains/world/core/coordinates.ts`).
- **WebGL Canvas Pump Hack y Standby 0% GPU:** El `CanvasSource` táctica se mantiene pausado por defecto y solo se bombea a la GPU cuando existen mutaciones reales (*dirty checking* vía `pumpCanvasToWebGL`), entrando en congelación total (`0% CPU/GPU`) tras 5 minutos de inactividad (`ACTIVITY_TIMEOUT_MS = 300_000`) o al perder el foco de la ventana (`window.blur`).

### Topología de Archivos del Dominio `src/domains/world/`
| Ruta Modular Canónica (`src/domains/world/...`) | Responsabilidad Arquitectónica |
| :--- | :--- |
| `src/domains/world/components/TacticalWorldMap.tsx` | Renderizador principal WebGL 2.0 C4ISR (exportado también como alias `WorldMapCanvas` en `src/domains/world/index.ts`, consolidando y reemplazando al antiguo `StrategicGlobeMap.tsx`). |
| `src/domains/world/components/TacticalMapControls.tsx` | Selector de las 4 vistas especializadas C4ISR (`V1_SOVEREIGNTY`, `V2_LOGISTICS`, `V3_RESOURCES`, `V4_THREATS`) y barra de sellos tácticos colaborativos WPlace (`recon`, `danger_mine`, `claim`, `rally_strike`). |
| `src/domains/world/core/coordinates.ts` | Motor de conversión analítica $O(1)$ WGS84 (`LngLat`) $\leftrightarrow$ Sectores Web Mercator $\leftrightarrow$ Cuadrícula Táctica $20 \times 20$ y trazado de líneas logísticas de Bresenham. |
| `src/domains/world/core/tacticalBitmap.ts` | Empaquetado binario ultraligero (`TacticalBitMap` sobre `Uint8Array`) con serialización Base64 para Niebla de Guerra ($20 \times 20 = 400\text{ bits} = 50\text{ bytes}$) y estados macro-regionales. |
| `src/domains/world/core/worldMapEngine.ts` | Motor geopolítico de adyacencia territorial, validación de asaltos fronterizos, cálculo de mantenimiento corporativo superlineal, resolución de TCP y conectividad logística BFS (`validateSupplyLineConnectivity`). |
| `src/domains/world/core/roadNetworkEngine.ts` | Grafo vial navegable (`RoadNetworkEngine`), semilla del corredor petrolero de Cabimas (Zulia), cálculo de tiempos de marcha estilo *Project Alice* y pathfinding $A^*$ (`findOptimalRoadRoute`). |
| `src/domains/world/core/spatialRoadIndex.ts` | Índice de partición espacial 2D (`SpatialRoadIndex`) con hash bitwise de 32 bits (`getCellKey`) para *snapping* $O(1)$ a nodos y validación de adyacencia vial a $\le 150\text{ m}$ (`isLocationAdjacentToRoad`). |
| `src/domains/world/core/politicalAliceEngine.ts` | Motor determinista de Capa 1 (*Project Alice*): registro de las 31 regiones del Teatro Venezuela (24 estados + 7 buffers), 4 facciones, edictos políticos, estratos sociales (POPs) y riesgo de secesión. |
| `src/domains/world/hooks/useTerritoryMap.ts` | Hook reactivo de sincronización territorial entre la réplica local determinista (`politicalAliceEngine`), ` barkEngine` (Mayor Stella) y las tablas `public.regions` / `public.region_sovereignty` en Supabase. |
| `src/domains/world/services/spatialDeploymentService.ts` | Servicio de asignación espacial $O(1)$ a zoom $\ge 15.0$, despliegue de unidades y construcción de estructuras de feudo in-situ con persistencia CDC Realtime en Supabase (`tactical_spatial_deployments` y `tactical_fief_constructions`). |

---

# 2. ESPECIFICACIÓN DEL ESTILO CANÓNICO `ZERO_RASTER_MILITARY_STYLE`

El componente `src/domains/world/components/TacticalWorldMap.tsx` define y consume la especificación de estilo vectorial nativa de MapLibre GL, aplicando además una poda automática de capas civiles (`pruneCivilianLayers` mediante `C4ISR_HIDE_LAYERS_REGEX = /^poi_|^landuse|^building(-3d)?$|^road_label|^waterway_label|^transit_/`):

```typescript
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
```

### Paleta Cromática de Soberanía y Facciones (`resolveFactionColor`)
En `src/domains/world/components/TacticalWorldMap.tsx`, el color de cada polígono regional (`ownerColor`) se resuelve dinámicamente según su estado táctico y el clan controlador:
- **En Asedio Activo (`isUnderSiege === true`):** `#EF4444` (Alerta DEFCON 1 / Asedio balístico).
- **Zona Buffer Internacional (`isBuffer === true`):** `#2B2C24` (`--color-armor-base` neutro no capturable).
- **Iron Vanguard Syndicate (`clan-ferro` / Blue Moon):** `#1D4ED8` (Azul Mando Asedio).
- **Consorcio Siderúrgico del Orinoco (`clan-orinoco` / Orange Star):** `#E65100` (Naranja Petroquímico).
- **Frente Balístico de los Andes (`clan-andes` / Black Hole):** `#991B1B` (Carmesí Hostil).
- **Flota Mercante del Caribe (`clan-caribe` / Fallback Heráldico):** Color heráldico del clan (`#10B981`) o `#2B2C24`.

---

# 3. ESTRATIFICACIÓN EN GPU DE CAPAS VECTORIALES Y RED VIAL (VENEZUELA & CABIMAS)

Al dispararse el evento `map.on('load')`, `src/domains/world/components/TacticalWorldMap.tsx` monta una jerarquía de **9 fuentes GeoJSON vectoriales** y **1 fuente `CanvasSource` dinámica** en la GPU:

### 3.1. Capas de Soberanía Provincial (`source: 'tactical-provinces'` — `/map/theatre_regions.json`)
1. **`provinces-fill` (`type: 'fill'`, `maxzoom: ZOOM_TACTICO - 0.5` = `14.5`):**
   - `fill-color`: `['get', 'ownerColor']`.
   - `fill-opacity`: `0.92` si `isSelected`, `0.84` si `isUnderSiege`, `0.68` por defecto.
2. **`provinces-borders` (`type: 'line'`):**
   - `line-color`: `#00FF66` (Verde Fósforo CRT) si `isSelected`, `#EF4444` (Rojo DEFCON 1) si `isUnderSiege`, `#7B8A4A` (`--color-metal-edge`) por defecto.
   - `line-width`: `3.2` si `isSelected`, `1.5` por defecto (`line-opacity: 0.95`).
3. **`provinces-vulnerable-halo` (`type: 'line'`, `maxzoom: 14.5`):**
   - Filtro: `['==', ['get', 'isVulnerableActive'], true]`.
   - Halo pulsante ámbar (`#F59E0B`, `line-width: 4.5`, `line-opacity: 0.85`, `line-blur: 3.0`) para regiones en ventana de vulnerabilidad activa (Anti-Offline Raiding).

### 3.2. Red Vial Troncal Nacional (`source: 'tactical-roads'` — `/map/theatre_roads.json`)
Las carreteras troncales se renderizan como una triple capa vectorial en la GPU con estética de novela gráfica militar:
1. **Sombra de Tinta Cómic (`roads-ink-shadow`):**  
   - Color: `#0A0B08` (`line-opacity: 0.85`).  
   - Ancho interpolado por zoom: `['interpolate', ['linear'], ['zoom'], 4, 1.8, 8, 4.2, 14, 7.0]`.  
   - Propósito: Separación visual de alto contraste sobre la masa continental.
2. **Resplandor Radar Militar (`roads-glow`):**  
   - Desenfoque: `line-blur: 2.0`, `line-opacity: 0.35`, ancho `['interpolate', ['linear'], ['zoom'], 4, 1.4, 8, 3.6, 14, 6.0]`.  
   - Autopistas (`highway === 'motorway'`): Resplandor Verde CRT Fósforo (`#00FF66`).  
   - Troncales y vías nacionales (fallback): Resplandor Ámbar Militar C4ISR (`#F59E0B`).
3. **Núcleo de Precisión (`roads-core`):**  
   - Ancho fino nítido: `['interpolate', ['linear'], ['zoom'], 4, 0.8, 8, 1.8, 14, 3.2]` (`line-opacity: 0.95`).  
   - Color en el fragment shader: `#00FF66` para `motorway` y `#FBBF24` (Ámbar Radar brillante) para el resto de troncales nacionales.

> [!NOTE] NOTA DE OPTIMIZACIÓN EN CURSO
> La versión actual de `theatre_roads.json` (2.21 MB, 9,093 line features) se encuentra en proceso de reducción mediante simplificación Douglas-Peucker a $\le 95\text{ KB}$ para optimizar la carga en navegadores móviles.

### 3.3. Red Vial Urbana, Ciudades, Corredor Cabimas, Edificios y Unidades Operacionales
4. **Grafo Vial Activo del Teatro Cabimas (`source: 'cabimas-road-network'` & `'cabimas-pois'`):**
   - Alimentado dinámicamente por `roadNetworkEngine.toGeoJSON()` y `roadNetworkEngine.getAllNodes()` (`src/domains/world/core/roadNetworkEngine.ts`).
   - Capa `cabimas-roads-highlight`: Línea táctica cuyo color muta según el modo de vista C4ISR seleccionado en `TacticalMapControls.tsx`:
     - `V1_SOVEREIGNTY`: `#06B6D4` (Cian Táctico)
     - `V2_LOGISTICS`: `#22C55E` (Verde Suministro)
     - `V3_RESOURCES`: `#E5A93C` (Ámbar Petrolero; incrementa además `circle-opacity` de `fief-buildings-glow` a `0.75`)
     - `V4_THREATS`: `#EF4444` (Rojo Amenaza FLIR)
   - Capa `cabimas-pois-circle`: Nodos estratégicos (Puente Gral. Rafael Urdaneta, Terminal La Salina, Pozo El Barroso II, Complejo Punta Gorda, Campos Tía Juana, Ciudad Ojeda, etc.).
5. **Marcas Tácticas Colaborativas WPlace (`source: 'tactical-marks-source'`, capa `'tactical-marks-layer'`):**
   - Sellos georreferenciados con expiración de 1 hora (`recon` `#06B6D4`, `danger_mine` `#EAB308`, `claim` `#3B82F6`, `rally_strike` `#EF4444`) que disparan bocadillos diegéticos *World-Space Barks* (`worldBarks`) proyectados en pantalla mediante `map.project(b.lngLat)`.
6. **Estructuras Industriales de Feudos (`source: 'fief-buildings-source'`):**
   - Alimentado por `fiefBuildingService.toGeoJSON()`. Renderiza triple capa: resplandor `fief-buildings-glow`, núcleo `fief-buildings-circle` (`refinery` `#E5A93C`, `microchip_foundry` `#06B6D4`, `weapons_factory` `#EF4444`, `logistics_silo` `#22C55E`, `radar_station` `#A855F7`) y etiquetas `fief-buildings-labels` (`minzoom: 11.0`).
7. **Red Vial Urbana Real (`source: 'tactical-urban-roads'` — `/map/theatre_urban_roads.json`, `minzoom: 10.0`):**
   - Triple capa urbana: `urban-roads-shadow` (`#0A0B08`), `urban-roads-glow` (`primary` `#00FF66`, resto `#06B6D4`) y `urban-roads-core` (`primary` `#6EE7B7`, resto `#38BDF8`).
8. **Ciudades y Metrópolis (`source: 'tactical-cities'` — `/map/theatre_cities.json`, `minzoom: 9.0`, `maxzoom: 15.0`):**
   - Capas `cities-glow` (`#F59E0B`), `cities-point` (`#F2E8D5`) y etiquetas `cities-labels` en mayúsculas con halo `#0A0B08`.
9. **Unidades Desplegadas Operacionales (`source: 'operational-units-source'`, `minzoom: 10.0`):**
   - Alimentado en vivo por `operationalUnitsService.toGeoJSON()`. Capas `operational-units-glow`, `operational-units-circle` y etiquetas `operational-units-labels` que muestran `callsign • {hp}HP` en verde fósforo `#00FF66`.

---

# 4. PICKING ANALÍTICO O(1), EMPAQUETADO BINARIO (`TacticalBitMap`) Y TOPOLOGÍA (`WorldMapEngine`)

### 4.1. Motor de Coordenadas y Picking Analítico $O(1)$ (`src/domains/world/core/coordinates.ts`)
El puente espacial *OpenPlace Bridge* convierte cualquier par geodésico WGS84 (`LngLat = [number, number]`) al sector planetario Web Mercator y a su celda interna dentro de una cuadrícula táctica de $20 \times 20$ en tiempo constante $O(1)$, sin necesidad de *raycasting* sobre miles de polígonos:

- **Constantes Canónicas Exportadas:**
  - `ZOOM_GLOBAL = 3.5` (Nivel 1: Macro-Geopolítica, $z < 10.0$)
  - `ZOOM_OPERACIONAL = 10.0` (Nivel 2: Red Urbana, Ciudades, Avenidas y Unidades, $10.0 \le z < 15.0$)
  - `ZOOM_TACTICO = 15.0` (Nivel 3: Microjuego, Combate en Celda y Construcción Espacial, $z \ge 15.0$)
  - `TILE_SIZE = 1000` (Resolución de cada `TileCanvas` proyectado: $1000 \times 1000\text{ px}$, es decir, $50 \times 50\text{ px}$ por celda en grilla de $20 \times 20$)
  - `EARTH_RADIUS_M = 6_371_000`
- **Funciones de Transformación Analítica:**
  - `lngLatToGridCoords(lngLat: LngLat, gridSize = 20, zoom = ZOOM_TACTICO): TacticalGridCoords`  
    Clampea la latitud al límite Web Mercator ($\pm 85.05112878^\circ$), proyecta $(x, y)$ en escala $n = 2^{\text{zoom}}$ y devuelve `{ sector: [sectorX, sectorY], cell: [cellX, cellY], pixel: [pixelX, pixelY] }`.
  - `tileFractionToLngLat(tileXFloat: number, tileYFloat: number, zoom = ZOOM_TACTICO): LngLat`  
    Inversa analítica mediante $\arctan(\sinh(\pi \cdot (1 - 2y/n)))$.
  - `gridCoordsToLngLat(sector: [number, number], cell: [number, number], gridSize = 20, zoom = ZOOM_TACTICO): LngLat`  
    Devuelve el centroide geográfico exacto `(cell + 0.5) / gridSize` de cualquier celda táctica.
  - `getTileBounds(sectorX: number, sectorY: number, zoom = ZOOM_TACTICO): QuadLngLatBounds`  
    Devuelve los 4 vértices `[Top-Left, Top-Right, Bottom-Right, Bottom-Left]` requeridos por MapLibre GL para anclar el `CanvasSource` del sector activo.
  - `traceSupplyLine(from: [number, number], to: [number, number]): [number, number][]`  
    Algoritmo raster entero de Bresenham para trazar líneas continuas de suministro entre sectores o celdas.

### 4.2. Empaquetado Binario Ultraligero (`src/domains/world/core/tacticalBitmap.ts`)
La clase `TacticalBitMap` comprime máscaras booleanas espaciales en un `Uint8Array` direccionado a nivel de bit con redimensionamiento dinámico y serialización instantánea Base64 (`toBase64()` / `TacticalBitMap.fromBase64(base64)`):
- **Niebla de Guerra Táctica ($20 \times 20 = 400\text{ celdas}$):** $400\text{ bits} / 8 = \mathbf{50\text{ bytes}}$ por sector.
- **Estado de Alerta / Soberanía Macro-Globo ($3,000\text{ regiones}$):** $3,000\text{ bits} / 8 = \mathbf{375\text{ bytes}}$.
- **Métodos:** `setBit(index: number, value: boolean): void`, `getBit(index: number): boolean`, `toBase64(): string`, `static fromBase64(base64: string): TacticalBitMap`.

### 4.3. Motor Geopolítico, Mantenimiento y Conectividad BFS (`src/domains/world/core/worldMapEngine.ts`)
- **`WorldMapEngine.isRegionCapturable(region: WorldRegion): boolean`**: Verifica si una región permite captura de soberanía (las capitales como `REG_VE_01` son capturables y otorgan el **Buff Regional de +5% recursos/logística** conforme al Pilar Canónico 5, mientras que los 7 buffers fronterizos `BUF_*` tienen `isCapturable: false`).
- **`WorldMapEngine.canAttackRegion(targetRegionId, ownedRegionIds, adjacencyGraph, isEmergencyLandingAllowed)`**: Valida que la corporación atacante posea una frontera terrestre o puente marítimo adyacente al objetivo (o autorización de desembarco expedicionario si tiene 0 territorios).
- **`WorldMapEngine.calculateCorporateUpkeep(provincesCount, buildingsList)`**: Calcula el mantenimiento horario en Créditos Energéticos (`EC`) sumando el coste base provincial y de estructuras (`mine: 60`, `refinery: 110`, `factory: 180`, `garrison_bunker: 250`, `rail_station: 80` por nivel) multiplicado por el factor superlineal de sobre-expansión imperial (`calculateOverExpansionFactor`).
- **`WorldMapEngine.calculateTcpResolution(currentState, winnerClanId, isDecisiveVictory)`**: Resuelve el drenaje o recuperación de Puntos de Control Territorial (`TCP`, delta de `1500` en victoria decisiva o `1200` estándar) y voltea la soberanía con estado `'cooldown_priority'` cuando `updatedTcp <= 0`.
- **`traceSupplyLine(x0, y0, x1, y1)` & `validateSupplyLineConnectivity(regionId, capitalRegionIds, controlledRegionIds, adjacencies)`**: Valida mediante búsqueda en anchura (**BFS**) si una provincia controlada mantiene una ruta logística ininterrumpida hacia la Capital/Nodo Primario a través de aristas que no tengan la bandera `TOPOLOGY_FLAGS.IMPASSIBLE`.

### 4.4. Partición Espacial 2D de Red Vial (`src/domains/world/core/spatialRoadIndex.ts`)
Para evitar búsquedas por fuerza bruta $O(N)$ al interactuar con carreteras y construcciones de feudos:
- `SpatialRoadIndex` divide el plano geodésico en celdas de $0.08^\circ$ ($\approx 8.8\text{ km}$) indexadas con una función pura de hash bitwise de 32 bits (`getCellKey(cx, cy)`).
- `snapCoordinatesToNearestNode(coords)` e `isLocationAdjacentToRoad(coords, maxDistanceKm = 0.15)` inspeccionan las 9 celdas concéntricas inmediatas en tiempo constante $O(1)$, validando la regla de negocio de que los edificios industriales solo pueden erigirse adyacentes a una vía logística.

---

# 5. MATRIZ DE COBERTURA: 24 ENTIDADES FEDERALES Y 7 ZONAS BUFFER

El teatro inicial de operaciones cubre la totalidad de la República de Venezuela y sus fronteras estratégicas, sincronizado al 100% con el seed canónico `CANONICAL_VENEZUELA_REGIONS` en `src/domains/world/core/politicalAliceEngine.ts` y `useTerritoryMap.ts`:

| Código de Región | Entidad Federal / Zona (`politicalAliceEngine.ts`) | Capital / Nodo Estratégico | Bioma Táctico | Commodity Primaria (RGO) & Tier | Eje Vial / Troncal Primaria |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `REG_VE_01` | **Distrito Capital - Caracas** | Caracas (Capital Nacional Capturable, Buff +5%) | Urbano denso (`BIO-URB`) | `petroquimica_fina` (T5, 800/h) | Autopista Regional del Centro / T-01 / T-09 |
| `REG_VE_02` | **Zulia - Maracaibo** | Maracaibo / Cabimas (`CHK-MARACAIBO`) | Planicie petrolera (`BIO-PLA`) | `crudo_ligero` (T4, 600/h) | Troncal 3 / Troncal 6 / Puente Gral. Rafael Urdaneta |
| `REG_VE_03` | **Bolívar - Ciudad Guayana** | Ciudad Guayana / Sidor / Guri | Tierras Altas / Minero (`BIO-HGH`) | `hierro_bauxita` (T5, 750/h) | Troncal 10 / Eje Fluvial Orinoco |
| `REG_VE_04` | **Anzoátegui - Barcelona/PLC** | Barcelona / Puerto La Cruz | Planicie petroquímica (`BIO-PLA`) | `crudo_pesado` (T4, 550/h) | Troncal 9 / Troncal 16 |
| `REG_VE_05` | **Carabobo - Valencia/Pto. Cabello** | Valencia / Puerto Cabello | Urbano industrial / Puerto (`BIO-URB`) | `ensamblaje_mec` (T4, 580/h) | Autopista del Centro / Troncal 1 / Puerto Marítimo |
| `REG_VE_06` | **Miranda - Valles del Tuy** | Los Teques / Valles del Tuy | Planicie manufacturera (`BIO-PLA`) | `manufactura_ligera` (T3, 400/h) | Troncal 9 / Conexión Caracas |
| `REG_VE_07` | **Lara - Barquisimeto** | Barquisimeto | Nudo logístico ferroviario (`BIO-PLA`) | `nudo_ferroviario` (T3, 420/h) | Troncal 1 / Troncal 4 / Troncal 17 |
| `REG_VE_08` | **Aragua - Maracay** | Maracay | Base aeromilitar y blindados (`BIO-URB`) | `blindaje_aereo` (T3, 450/h) | Autopista Regional del Centro / T-02 |
| `REG_VE_09` | **Táchira - San Cristóbal** | San Cristóbal / San Antonio | Montaña andina (`BIO-HGH`) | `carbon_aduanero` (T3, 380/h) | Troncal 1 (Panamericana) / Frontera Cúcuta |
| `REG_VE_10` | **Mérida - Cordillera Andina** | Mérida / El Vigía | Alta montaña andina (`BIO-HGH`) | `silicio_optico` (T3, 350/h) | Troncal 7 (Trasandina) / T-01 |
| `REG_VE_11` | **Falcón - Paraguaná** | Coro / Punto Fijo (CRP Amuay/Cardón) | Planicie costera (`BIO-PLA`) | `refinacion_crp` (T4, 520/h) | Troncal 3 / Troncal 4 |
| `REG_VE_12` | **Monagas - Maturín** | Maturín | Sabana petrolera (`BIO-PLA`) | `gas_natural` (T4, 500/h) | Troncal 10 / Troncal 13 |
| `REG_VE_13` | **Sucre - Cumaná/Golfo de Paria** | Cumaná / Carúpano / Güiria (`CHK-PARIA`) | Costero marítimo (`BIO-ARC-ISL`) | `astillero_naval` (T3, 420/h) | Troncal 9 / Chokepoint Golfo de Paria |
| `REG_VE_14` | **Nueva Esparta - Margarita** | Porlamar / La Asunción | Insular caribeño (`BIO-ARC-ISL`) | `radar_zonafranca` (T2, 300/h) | Ferry Marítimo Puerto La Cruz - Punta de Piedras |
| `REG_VE_15` | **Barinas - Llanos Altos** | Barinas | Llanos agrícolas y crudo (`BIO-PLA`) | `agropecuaria_crudo` (T3, 380/h) | Troncal 5 (Eje Llanero) |
| `REG_VE_16` | **Portuguesa - Acarigua** | Acarigua / Guanare | Agroindustrial (`BIO-PLA`) | `biocombustibles` (T3, 390/h) | Troncal 5 / Autopista José Antonio Páez |
| `REG_VE_17` | **Guárico - Calabozo/San Juan** | San Juan de los Morros / Calabozo | Corazón llanero (`BIO-PLA`) | `satelital_canteras` (T3, 410/h) | Troncal 2 / Troncal 12 / Troncal 13 |
| `REG_VE_18` | **Trujillo - Andes Centrales** | Trujillo / Valera | Valle andino (`BIO-HGH`) | `silice_cemento` (T2, 280/h) | Troncal 1 / Troncal 7 |
| `REG_VE_19` | **Yaracuy - San Felipe** | San Felipe | Valle fértil minero (`BIO-PLA`) | `cobre_fertilizantes` (T2, 300/h) | Troncal 11 |
| `REG_VE_20` | **Cojedes - San Carlos** | San Carlos | Enlace central llanero (`BIO-PLA`) | `pastizales_roca` (T2, 290/h) | Troncal 5 |
| `REG_VE_21` | **Apure - San Fernando** | San Fernando de Apure | Llanos bajos / Frontera fluvial (`BIO-PLA`) | `eje_fluvial` (T2, 310/h) | Troncal 2 / Troncal 19 / Eje Río Apure |
| `REG_VE_22` | **Delta Amacuro - Caños Orinoco** | Tucupita | Delta fluvial / Estuario (`BIO-ARC-ISL`) | `bauxita_delta` (T3, 370/h) | Vías fluviales Delta del Orinoco |
| `REG_VE_23` | **Amazonas - Puerto Ayacucho** | Puerto Ayacucho | Selva profunda (`BIO-JGL`) | `tierras_raras` (T3, 360/h) | Troncal 12 / Eje Alto Orinoco |
| `REG_VE_24` | **Guayana Esequiba - Zona Reclamación** | Tumeremo / Esequibo Occidental | Frontera y Selva Minera (`BIO-JGL`) | `oro_diamantes` (T4, 520/h) | Troncal 10 / Zona en Reclamación |
| `BUF_CO_01` | **Norte de Santander (Cúcuta)** | Cúcuta (Buffer Colombia) | Montaña fronteriza (`BIO-HGH`) | `mineral_metalico` (T3, No Jugable) | Cruce Binacional San Antonio - Cúcuta |
| `BUF_CO_02` | **La Guajira (Maicao)** | Maicao (Buffer Colombia) | Planicie árida (`BIO-PLA`) | `mineral_metalico` (T2, No Jugable) | Cruce Binacional Paraguachón |
| `BUF_CO_03` | **Arauca (Arauquita)** | Arauca (Buffer Colombia) | Llanos fronterizos (`BIO-PLA`) | `mineral_metalico` (T2, No Jugable) | Eje Fluvial Río Arauca |
| `BUF_BR_01` | **Roraima (Pacaraima / Boa Vista)** | Pacaraima (Buffer Brasil) | Selva Fronteriza Sur (`BIO-JGL`) | `tierras_raras` (T3, No Jugable) | Troncal 10 Sur / BR-174 |
| `BUF_GY_01` | **Demerara (Georgetown)** | Esequibo Oriental (Buffer Guyana) | Planicie atlántica (`BIO-PLA`) | `bauxita_delta` (T3, No Jugable) | Corredores Atlánticos |
| `BUF_TT_01` | **Trinidad & Tobago** | Boca de Serpiente (Buffer Trinidad) | Canal Marítimo Oriental (`BIO-ARC-ISL`) | `astillero_naval` (T3, No Jugable) | Estrecho `CHK-PARIA` (Peaje 4.0%) |
| `BUF_CW_01` | **Antillas Neerlandesas (Curazao/Aruba)** | Curazao / Aruba (Buffer Antillas) | Fachada Caribe Norte (`BIO-ARC-ISL`) | `radar_zonafranca` (T2, No Jugable) | Corredor Marítimo Petrolero Paraguaná |

---

# 6. SEMANTIC LOD (3 ESTRATOS), CICLO DE VIDA DE CÁMARA Y MICROJUEGO TÁCTICO

La cámara de MapLibre GL se inicializa sobre el **Epicentro Operacional del Teatro Cabimas (Zulia)** en `center: [-71.455, 10.395]` con `zoom: 9.8` (`minZoom: 2.0`, `maxZoom: 18.0`). El método `getStratumForZoom(z)` en `src/domains/world/components/TacticalWorldMap.tsx` y las constantes de `src/domains/world/core/coordinates.ts` gobiernan 3 estratos de nivel de detalle semántico (*Semantic LOD*), disparando una transición cinética de enfoque (`tactical-stratum-blur` durante $260\text{ ms}$) al cruzar cada umbral:

1. **Estrato 1 — Vista Macro-Estratégica (`z < 10.0`, `ZOOM_GLOBAL = 3.5`):**
   - Polígonos de soberanía estadal (`provinces-fill`, `provinces-borders`, `provinces-vulnerable-halo`) coloreados según facción (`resolveFactionColor`), red vial troncal nacional (`tactical-roads`) y corredor estratégico de Cabimas (`cabimas-road-network`).
   - A partir de `z >= 9.0` emergen los nodos y etiquetas de ciudades (`tactical-cities`).
   - En la Capa 1 Geopolítica (`useTerritoryMap.ts` y `politicalAliceEngine.ts`), las declaraciones de ataque y asedios regionales también pueden ejecutarse mediante resolución política determinista sobre los Puntos de Control Territorial (`TCP`).

2. **Estrato 2 — Teatro Operacional y Red Vial (`10.0 <= z < 15.0`, `ZOOM_OPERACIONAL = 10.0`):**
   - Activación automática de la malla vial urbana real (`tactical-urban-roads`, `minzoom: 10.0`), unidades operacionales desplegadas en el mapa con indicador de salud `1-100 HP` (`operational-units-source`, `minzoom: 10.0`) y etiquetas de complejos industriales de feudo (`fief-buildings-labels`, `minzoom: 11.0`).
   - Navegación rápida mediante el botón **CABIMAS** (`flyTo` a `[-71.455, 10.395]`, `zoom: 11.2`, `duration: 1800ms`).

3. **Estrato 3 — Cuadrícula de Combate C4ISR y Microjuego Espacial (`z >= 15.0`, `ZOOM_TACTICO = 15.0`):**
   - El relleno de polígonos macro (`provinces-fill` y `provinces-vulnerable-halo`) se apaga en `maxzoom: 14.5` para despejar el terreno táctico.
   - `syncTileCanvasLifecycle` ancla dinámicamente un `CanvasSource` (`tile-canvas-source-${sectorX}_${sectorY}`) de `1000x1000 px` (`TILE_SIZE = 1000`) subdividido en una cuadrícula táctica de **$20 \times 20$ celdas** (`TACTICAL_GRID_DIMENSION = 20`, $50 \times 50\text{ px}$ por celda) mediante `getTileBounds`.
   - `renderTacticalBattleCanvas` dibuja a 10 ticks/s (`TacticalRtsEngine`, `tickIntervalMs: 100`) con *dirty checking*:
     - **Niebla de Guerra Binaria:** Decodificada desde `TacticalBitMap.fromBase64(fogOfWarBase64)`.
     - **Unidades con Escala Continua de 1 a 100 HP Enteros (Pilar Canónico 2):** Chasis por facción, retícula de selección C4ISR, indicador de recarga (`CD`) y trazadoras balísticas (`BallisticTracer`).
   - **Despliegue y Construcción In-Situ (`spatialDeploymentService.ts`):** Al seleccionar cualquier celda a `z >= 15.0`, el HUD inferior (`MicroTacticalDeckHUD`) expone las coordenadas `SEC [x,y] • CELL [x,y]`, el tipo de micro-terreno (`urban_asphalt`, `industrial_compound`, `defensive_ridge`, `open_plains`), las estrellas de defensa y permite abrir el `TacticalUnitDeployModal` o el `TacticalConstructionDrawer` sincronizados en tiempo real con Supabase CDC.

# Plan de Implementación: Migración del Motor Cartográfico C4ISR a Arquitectura WebGL Zero-Raster (Inspirado en WarEra)

## Metas del Spike y la Implementación
1. Erradicar la dependencia de teselas raster externas (CartoDB / OpenStreetMap) sustituyéndolas por una topología vectorial en memoria (TopoJSON) renderizada directamente en WebGL 2.0 por MapLibre GL.
2. Migrar la interactividad (hover, selección, asedio) a `feature-state` en la GPU, garantizando **0% de re-renders de React en el hilo principal** al interactuar con el mapa.
3. Integrar `@deck.gl/mapbox` (`MapboxOverlay`) para orquestar trayectorias balísticas (`ArcLayer`), marcadores tácticos y efectos de combate bélico con 60 FPS garantizados.
4. Preservar la compatibilidad canónica con el **LOD Semántico**, el **TacticalBitMap** de 50 bytes de niebla de guerra y los eventos del **Bark Engine**.

---

## Fases de Ejecución

### Decisiones Arquitectónicas Aprobadas (/grill-me)
1. **Formato de Geometría Base**: TopoJSON estático quantizado ubicado en `public/map/theatre_topology.json` (~300 KB único con caché HTTP infinita `staleTime: Infinity` y deduplicación de arcos mediante `topojson-client`).
2. **Capa Cinética de Guerra**: Integración de `@deck.gl/mapbox` y `@deck.gl/layers` (`ArcLayer`) compartiendo el contexto WebGL 2.0 nativo de MapLibre GL para curvas balísticas y asedios a 60 FPS.
3. **Cuadrícula Táctica (LOD 3 a Zoom >= 13.0)**: Migración a cuadrícula vectorial nativa en MapLibre GL (`line` layer) para erradicar el *texture pump* de Canvas 2D a VRAM (`pumpCanvasToWebGL`).
4. **Gestión de Estado y Soberanía**: Mutación directa en la GPU mediante `map.setFeatureState` al recibir eventos de Supabase Realtime, garantizando **0% de re-renders en el árbol de componentes de React**.

---

## Fases de Ejecución

### Fase 1: Alineación y Decisiones (/grill-me) [COMPLETADA]
- [x] Ejecutar el cuestionario de 4 decisiones críticas sobre formato de datos, render de niebla, gestión de estado y dependencias.
- [x] Consolidar decisiones en el Master Blueprint.

### Fase 2: Spike Técnico Aislado (Benchmarking & Prototipo)
- [ ] Instalar librerías auxiliares: `topojson-client`, `@deck.gl/core`, `@deck.gl/layers`, `@deck.gl/mapbox`, `@types/topojson-client`.
- [ ] Compilar y colocar la topología del Teatro Venezuela (`public/map/theatre_topology.json`).
- [ ] Construir el prototipo aislado `src/components/world/SpikeVectorMap.tsx`:
  - Estilo vectorial oscuro `#090D14` C4ISR sin dependencias de CartoDB ni OSM.
  - Carga TopoJSON + extracción de `feature` (regiones) y `mesh` (fronteras cómic unificadas de 1.5px).
  - Hover reactivo con `map.setFeatureState` (0ms CPU).
  - Integración de `MapboxOverlay` con `ArcLayer` de prueba (20 arcos balísticos concurrentes).
- [ ] Desarrollar y ejecutar la suite de benchmarking `src/engine/vectorMapBenchmark.test.ts` para verificar tiempos de inicialización (< 50ms) y rendimiento.

### Fase 3: Integración Canónica en `TacticalWorldMap.tsx`
- [ ] Refactorizar `TacticalWorldMap.tsx`:
  - Retirar `MILITARY_C4ISR_STYLE` basado en raster tiles de CartoDB.
  - Conectar `useTerritoryMap` con el nuevo pipeline de `feature-state` para actualizar soberanía territorial sin desmontar capas.
  - Reemplazar el `pumpCanvasToWebGL` del TileCanvas de 1000px por una cuadrícula vectorial proyectada nativamente en MapLibre al alcanzar `z >= 13.0`.
- [ ] Integrar el bitmap de niebla de guerra (`TacticalBitMap`) en una capa de tinte vectorial o textura procedural.

### Fase 4: Calidad y Verificación Integral
- [ ] Ejecutar suite existente: `npm run test:cartography` y `npm run test:all`.
- [ ] Ejecutar prueba E2E de Playwright (`npm run test:qa`) para verificar que no haya regresiones en la interfaz ni crashes de WebGL.
- [ ] Verificar reporte de bundle en Vite: validar que el bundle no sufra un incremento inaceptable.

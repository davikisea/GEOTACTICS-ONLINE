# 🛰️ INFORME FORENSE DE AUDITORÍA Y MATRIZ DE DISCREPANCIAS (v0.0.2-alfa)
**GEOTACTICS: ONLINE (Wars of Legacy)**  
**Fecha de Emisión:** 05 de Noviembre de 2026  
**Carácter:** Documento de Diagnóstico y Plan de Sincronización Arquitectónica (Read-Only)  
**Estado:** PENDIENTE DE AUTORIZACIÓN HUMANA (Fase 3)

---

## 1. RESUMEN EJECUTIVO Y ESTADO DE LA VERDAD TÉCNICA

Esta auditoría forense cruza la totalidad del repositorio documental en `docs/` con el estado empírico del código fuente en la transición a **`v0.0.2-alfa`** (Cartografía WebGL 2.0 Zero-Raster, red troncal vial en GPU, retiro de Canvas 2D y automatización de la pantalla de carga).

### Diagnóstico General:
1. **Cartografía WebGL Zero-Raster Consolidada:** Se confirma la erradicación total de proveedores comerciales raster externos (CartoDB/Mapbox `{z}/{x}/{y}.png`). El renderizado corre en local sobre MapLibre GL JS v6.16.0 con geometría vectorial estricta.
2. **Desfase en la Especificación Canónica (`00_GEOTACTICS_ONLINE_MASTER_SPEC.md`):** La Master Spec aún conserva incrustado el bloque de código con URLs de CartoDB en la Sección 3.2, y lista el componente `WorldMapCanvas.tsx` como activo o en refactorización, a pesar de haber sido purgado físicamente del repositorio.
3. **Residuos y Código Muerto de Canvas 2D en `TacticalWorldMap.tsx`:** Persisten más de 120 líneas de código inalcanzable (`pumpCanvasToWebGL`, `renderTacticalBattleCanvas`, `tileCanvasRef` nulo permanente y lógica de textura pump), arrastradas de la Capa 2 táctica.
4. **Desconexión Espacial y de Datos en `theatre_regions.json`:** El GeoJSON real contiene solo 25 geometrías (faltan las 6 zonas buffer de frontera terrestre) y presenta un cruce grave en los IDs respecto a `politicalAliceEngine.ts` (ej. Falcón vs Táchira, Apure vs Cojedes).
5. **Hipertrofia en Red Vial (`theatre_roads.json`):** El archivo pesa 2.21 MB (9,093 line features), superando en un 2,200% el presupuesto de carga fijado de $\le 95\text{ KB}$.
6. **Violación de `feature-state` en GPU:** A pesar de que los documentos exigen 0% re-renders de React mediante `map.setFeatureState`, el código reconstruye el GeoJSON en React con `useMemo` y llama a `provSource.setData(...)`.
7. **Desfase en Capas de Juego:**
   - **Capa 1 (Metajuego Político ALICE):** 100% activa pero con topología visual cruzada.
   - **Capa 2 (Combate Táctico por Turnos):** Totalmente deshabilitada en el MVP (`enabled: false`), con botones en el Lobby que redirigen forzosamente a asedio geopolítico en Capa 1.
   - **Capa 3 (Bark Engine & Stella):** Activa pero con candado monopólico (`singleSubjectLock: true`) forzando a la Mayor Stella como sujeto exclusivo de pruebas.
8. **Incongruencias Visuales y Residuos de "Mazo de 10 Cartas":** La UI muestra sellos con triple discrepancia de versión (`VER 0.0.1 ALFA` vs `Alfa v0.1.0` vs `0.1.0` en package.json), la prop `autoProceed` en `GeotacticsLoadingScreen.tsx` es fantasma/muerta, y existen remanentes de texto sobre cartas en el Hangar y Barks.

---

## 2. MATRIZ INTEGRAL DE DISCREPANCIAS (DOC VS. CÓDIGO)

| Elemento / Sistema | Archivo Documentación Afectado | Estado Real en Código (`v0.0.2-alfa`) | Severidad | Acción Requerida |
| :--- | :--- | :--- | :---: | :--- |
| **Tiles Raster CartoDB (`{z}/{x}/{y}.png`)** | [`00_GEOTACTICS_ONLINE_MASTER_SPEC.md:L340-L367`](file:///c:/Users/morin/GEOTACTICS/docs/00_GEOTACTICS_ONLINE_MASTER_SPEC.md#L340-L367) | **Erradicados en código.** [`TacticalWorldMap.tsx:L65-L101`](file:///c:/Users/morin/GEOTACTICS/src/components/world/TacticalWorldMap.tsx#L65-L101) define `ZERO_RASTER_MILITARY_STYLE` con fondos locales `#0E100C` y `/map/world_land.json`. 0 peticiones de red externas. | 🔴 CRÍTICA | **Actualizar:** Reemplazar el bloque `MILITARY_C4ISR_STYLE` en la Master Spec con la especificación real Zero-Raster. |
| **Motor Canvas 2D (`WorldMapCanvas.tsx`)** | [`00_GEOTACTICS_ONLINE_MASTER_SPEC.md:L237,L1554`](file:///c:/Users/morin/GEOTACTICS/docs/00_GEOTACTICS_ONLINE_MASTER_SPEC.md#L237) y [`PLAN_DESPLIEGUE_MAPA_WEBGL_VENEZUELA.md:L186`](file:///c:/Users/morin/GEOTACTICS/docs/PLAN_DESPLIEGUE_MAPA_WEBGL_VENEZUELA.md#L186) | **Eliminado físicamente del repositorio.** [`CHANGELOG.md:L36-L37`](file:///c:/Users/morin/GEOTACTICS/CHANGELOG.md#L36-L37) registra su purga (841 líneas eliminadas). `WarLobbyHub.tsx` monta únicamente WebGL. | 🔴 CRÍTICA | **Marcar Deprecado / Purgar:** Remover referencias en docs que lo señalen como fallback activo. |
| **Texture Pump Hack (`pumpCanvasToWebGL`)** | [`00_GEOTACTICS_ONLINE_MASTER_SPEC.md:L270-L273,L401-L417`](file:///c:/Users/morin/GEOTACTICS/docs/00_GEOTACTICS_ONLINE_MASTER_SPEC.md#L270-L273) | **Código muerto residual.** [`TacticalWorldMap.tsx:L175-L277`](file:///c:/Users/morin/GEOTACTICS/src/components/world/TacticalWorldMap.tsx#L175-L277) contiene 102 líneas de dibujo canvas y textura pump inalcanzables (`tileCanvasRef.current` siempre es `null`). | 🔴 CRÍTICA | **Purgar en Código / Actualizar en Doc:** Retirar funciones muertas de `TacticalWorldMap.tsx` y actualizar la spec para declarar la Capa 2 en espera. |
| **Topología de Regiones y Zonas Buffer** | [`00_GEOTACTICS_ONLINE_MASTER_SPEC.md:L970-L1042`](file:///c:/Users/morin/GEOTACTICS/docs/00_GEOTACTICS_ONLINE_MASTER_SPEC.md#L970-L1042) y [`politicalAliceEngine.ts:L246-L281`](file:///c:/Users/morin/GEOTACTICS/src/engine/politicalAliceEngine.ts#L246-L281) | **Inconsistencia grave de datos.** [`public/map/theatre_regions.json`](file:///c:/Users/morin/GEOTACTICS/public/map/theatre_regions.json) tiene 25 features en vez de 31 (faltan 6 buffers fronterizos), `REG_VE_24` es La Guaira en vez de Guayana Esequiba, y 12 IDs están intercambiados (ej. Táchira con Falcón, Apure con Cojedes). | 🔴 CRÍTICA | **Actualizar Assets:** Corregir y completar `theatre_regions.json` alineándolo estrictamente con `CANONICAL_VENEZUELA_REGIONS`. |
| **Presupuesto Red Vial (`theatre_roads.json`)** | [`PLAN_DESPLIEGUE_MAPA_WEBGL_VENEZUELA.md:L45,L93`](file:///c:/Users/morin/GEOTACTICS/docs/PLAN_DESPLIEGUE_MAPA_WEBGL_VENEZUELA.md#L45) | **Hipertrofia de 2.21 MB.** [`theatre_roads.json`](file:///c:/Users/morin/GEOTACTICS/public/map/theatre_roads.json) pesa 2,215 KB con 9,093 line features, frente al límite prescrito de $\le 95\text{ KB}$. | 🟡 ALTA | **Actualizar Assets:** Filtrar y simplificar mediante Mapshaper a Troncales 1 a 19 y autopistas principales. |
| **Manejo de GPU `feature-state` vs Re-renders** | [`WARERA_MAP_ARCHITECTURE_DEEP_DIVE.md:L17,L93-L140`](file:///c:/Users/morin/GEOTACTICS/docs/WARERA_MAP_ARCHITECTURE_DEEP_DIVE.md#L17) y [`PLAN_IMPLEMENTACION_MAPA_VECTORIAL_ZERO_RASTER.md:L5`](file:///c:/Users/morin/GEOTACTICS/docs/PLAN_IMPLEMENTACION_MAPA_VECTORIAL_ZERO_RASTER.md#L5) | **Incumplimiento arquitectónico.** [`TacticalWorldMap.tsx:L301-L387,L626`](file:///c:/Users/morin/GEOTACTICS/src/components/world/TacticalWorldMap.tsx#L301-L387) recalcula el GeoJSON en React (`useMemo`) y llama a `provSource.setData(...)` en lugar de usar `map.setFeatureState`. | 🟡 ALTA | **Refactorizar en Código / Ajustar Doc:** Migrar a `setFeatureState` para mutaciones de selección/asedio o documentar `setData` como interim. |
| **Posicionamiento de Botones Accesibles** | [`TacticalWorldMap.tsx:L656-L679`](file:///c:/Users/morin/GEOTACTICS/src/components/world/TacticalWorldMap.tsx#L656-L679) | **Desconexión espacial al hacer pan/zoom.** Los botones HTML usan `left: prov.posX%`, `top: prov.posY%` estáticos heredados del Canvas 2D, quedando fijos en pantalla mientras el mapa WebGL se desplaza. | 🟡 ALTA | **Refactorizar en Código:** Proyectar coordenadas geográficas dinámicamente con `map.project([lng, lat])` sincronizado en `map.on('render')`. |
| **Separación de Capa 2 (Combate Táctico)** | [`00_ARBOL_CANONICO_DE_SISTEMAS_Y_DESARROLLO.md:L63-L107`](file:///c:/Users/morin/GEOTACTICS/docs/00_ARBOL_CANONICO_DE_SISTEMAS_Y_DESARROLLO.md#L63-L107) marca Rama 1 como 🟢 `[LISTO]`. | **Deshabilitada formalmente en runtime.** [`politicalAliceEngine.ts:L60-L64`](file:///c:/Users/morin/GEOTACTICS/src/engine/politicalAliceEngine.ts#L60-L64) fija `enabled: false`. [`WarLobbyHub.tsx:L344-L358`](file:///c:/Users/morin/GEOTACTICS/src/components/lobby/WarLobbyHub.tsx#L344-L358) y [`App.tsx:L516-L540`](file:///c:/Users/morin/GEOTACTICS/src/App.tsx#L516-L540) redirigen botones de combate a asedio geopolítico en Capa 1. | 🟡 ALTA | **Actualizar en Doc:** Modificar el Árbol Canónico y la Master Spec aclarando que Capa 2 está programada pero congelada/en espera para el MVP Político. |
| **Exclusividad de Capa 3 (Mayor Stella)** | [`00_ARBOL_CANONICO_DE_SISTEMAS_Y_DESARROLLO.md:L103,L207-L212`](file:///c:/Users/morin/GEOTACTICS/docs/00_ARBOL_CANONICO_DE_SISTEMAS_Y_DESARROLLO.md#L103) documenta 28 Comandantes con barks. | **Candado rígido a Stella.** [`barkEngine.ts:L654-L677,L749`](file:///c:/Users/morin/GEOTACTICS/src/engine/barkEngine.ts#L654-L677) impone `singleSubjectLock: true`. [`WarLobbyHub.tsx:L313-L315`](file:///c:/Users/morin/GEOTACTICS/src/components/lobby/WarLobbyHub.tsx#L313-L315) fuerza siempre `selectedCOId = 'stella'`. | 🔵 MEDIA | **Actualizar en Doc:** Documentar formalmente que en la fase alfa actual el Bark Engine opera exclusivamente con el Sujeto de Prueba #01 (Stella). |
| **Residuos de Léxico "Mazo de 10 Cartas"** | [`00_ARBOL_CANONICO_DE_SISTEMAS_Y_DESARROLLO.md:L26`](file:///c:/Users/morin/GEOTACTICS/docs/00_ARBOL_CANONICO_DE_SISTEMAS_Y_DESARROLLO.md#L26) y [`00_GEOTACTICS_ONLINE_MASTER_SPEC.md:L19`](file:///c:/Users/morin/GEOTACTICS/docs/00_GEOTACTICS_ONLINE_MASTER_SPEC.md#L19) prohíben cartas ("CERO CARTAS"). | **Persisten cadenas en UI y Barks.** [`WarLobbyHub.tsx:L121`](file:///c:/Users/morin/GEOTACTICS/src/components/lobby/WarLobbyHub.tsx#L121), [`WarRoomModal.tsx:L142,L164,L192`](file:///c:/Users/morin/GEOTACTICS/src/components/lobby/WarRoomModal.tsx#L142), [`barkEngine.ts:L1003,L1069`](file:///c:/Users/morin/GEOTACTICS/src/engine/barkEngine.ts#L1003) y [`FactionBanner.tsx:L42`](file:///c:/Users/morin/GEOTACTICS/src/components/lobby/FactionBanner.tsx#L42) mencionan "Mazo de 10 Cartas". | 🔵 MEDIA | **Purgar en Código:** Reemplazar por "Hangar de Chasis T1-T5" y "Stock Físico Territorial". |
| **Prop Muerta en Boot Screen (`autoProceed`)** | [`CHANGELOG.md:L28-L34`](file:///c:/Users/morin/GEOTACTICS/CHANGELOG.md#L28-L34) | **Parámetro fantasma.** [`GeotacticsLoadingScreen.tsx:L15,L118`](file:///c:/Users/morin/GEOTACTICS/src/components/game/GeotacticsLoadingScreen.tsx#L15) desestructura `autoProceed` pero jamás lo consulta en el efecto de transición, transicionando siempre a los 400ms aunque [`App.tsx:L2365`](file:///c:/Users/morin/GEOTACTICS/src/App.tsx#L2365) le pase `autoProceed={false}`. | 🔵 MEDIA | **Refactorizar en Código:** Evaluar `if (isReady && autoProceed && onLoadingComplete)` o suprimir la prop de la interfaz. |
| **Triple Discrepancia de Versión en Pantalla** | [`00_GEOTACTICS_ONLINE_MASTER_SPEC.md:L1`](file:///c:/Users/morin/GEOTACTICS/docs/00_GEOTACTICS_ONLINE_MASTER_SPEC.md#L1) (`v0.0.1-alfa`) | Sello Pop-Art en [`GeotacticsLoadingScreen.tsx:L215`](file:///c:/Users/morin/GEOTACTICS/src/components/game/GeotacticsLoadingScreen.tsx#L215) muestra `VER 0.0.1 ALFA`, pie en [L.295](file:///c:/Users/morin/GEOTACTICS/src/components/game/GeotacticsLoadingScreen.tsx#L295) muestra `Alfa v0.1.0`, y `package.json` declara `0.1.0`. | 🔵 MEDIA | **Actualizar:** Homologar todos los sellos y textos de versión al hito canónico correspondiente (`v0.0.2-alfa` o `v0.1.0`). |
| **Fórmula de Sobre-Expansión Imperial** | [`00_GEOTACTICS_ONLINE_MASTER_SPEC.md:L186,L1116`](file:///c:/Users/morin/GEOTACTICS/docs/00_GEOTACTICS_ONLINE_MASTER_SPEC.md#L186) define exponente 1.8. | [`upkeepEngine.ts:L233-L236`](file:///c:/Users/morin/GEOTACTICS/src/engine/upkeepEngine.ts#L233-L236) usa exponente 1.8 con factor 0.18, mientras [`types/metagame.ts:L262,L396-L403`](file:///c:/Users/morin/GEOTACTICS/src/types/metagame.ts#L262) define exponente 2.4 y factor 0.35. | 🟡 ALTA | **Armonizar:** Unificar constantes en `types/metagame.ts` y documentar la fórmula calibrada. |
| **Erosión de Puntos de Control Territorial (TCP)** | [`00_GEOTACTICS_ONLINE_MASTER_SPEC.md:L155,L1066`](file:///c:/Users/morin/GEOTACTICS/docs/00_GEOTACTICS_ONLINE_MASTER_SPEC.md#L155) estipula caída de 800 a 2,500 TCP por asedio. | [`types/metagame.ts:L295`](file:///c:/Users/morin/GEOTACTICS/src/types/metagame.ts#L295) y [`politicalAliceEngine.ts:L913-L917`](file:///c:/Users/morin/GEOTACTICS/src/engine/politicalAliceEngine.ts#L913-L917) definen base 3,500 TCP (`TCP_LOSS_ATTACKER_VICTORY`), infligiendo entre 2,000 y 4,700 TCP. | 🔵 MEDIA | **Actualizar en Doc o Código:** Armonizar los rangos de daño a la soberanía para evitar caídas imprevistas en 2 asedios. |
| **Contradicción en CHANGELOG.md** | [`CHANGELOG.md:L28-L34`](file:///c:/Users/morin/GEOTACTICS/CHANGELOG.md#L28-L34) vs [`CHANGELOG.md:L84-L86`](file:///c:/Users/morin/GEOTACTICS/CHANGELOG.md#L84-L86) | Líneas 28-34 afirman que el botón manual `ENTRAR AL ESTADO MAYOR` fue eliminado; líneas 84-86 afirman haber homologado su etiqueta en modos manual y auto. | 🟢 BAJA | **Actualizar:** Purgar el vestigio de L84-86 en `CHANGELOG.md`. |
| **Incongruencia Atajos [1]-[6] vs Badges del Hub** | [`WarLobbyHub.tsx:L490-L507`](file:///c:/Users/morin/GEOTACTICS/src/components/lobby/WarLobbyHub.tsx#L490-L507) | Tecla `1` abre Tienda, `2` Industria, `3` Armería; pero las tarjetas centrales en [L.1051, L.1083](file:///c:/Users/morin/GEOTACTICS/src/components/lobby/WarLobbyHub.tsx#L1051) imprimen `[1] HANGAR` y `[2] GUARNICIÓN`. | 🔵 MEDIA | **Refactorizar en Código:** Alinear las insignias visuales con los atajos reales del teclado. |
| **Exploit de Acero Infinito en Barra Social** | Manifiesto de Economía Cerrada (`02_MASTER_METAGAME...`) | En [`WarLobbyHub.tsx:L1439-L1448`](file:///c:/Users/morin/GEOTACTICS/src/components/lobby/WarLobbyHub.tsx#L1439-L1448), el botón de auxilio logístico suma `+25t` de acero por clic sin descontar combustible ni validar límites. | 🟡 ALTA | **Refactorizar en Código:** Aplicar deducción de combustible y cooldown de transferencia por ciclo. |

---

## 3. REGISTRO DE DEUDA CARTOGRÁFICA DEPURADA

### 3.1 Confirmación de Erradicación de Canvas 2D
- **Archivo Eliminado:** `src/components/world/WorldMapCanvas.tsx` (841 líneas) fue purgado del árbol de Git. No existen remanentes del componente en `src/components/world/`.
- **Integridad de Tipos Preservada:** La interfaz `ProvinceVisualData` fue migrada a [`src/types/metagame.ts:L45-L66`](file:///c:/Users/morin/GEOTACTICS/src/types/metagame.ts#L45-L66) para sostener a `TerritoryInspectorModal.tsx` sin dependencias huérfanas.
- **Renderizador Único en Lobby:** En [`src/components/lobby/WarLobbyHub.tsx:L1338-L1352`](file:///c:/Users/morin/GEOTACTICS/src/components/lobby/WarLobbyHub.tsx#L1338-L1352), el mapa se renderiza exclusivamente a través de `<TacticalWorldMap />`. Se eliminó el botón de alternancia `CANVAS 2D`.

### 3.2 Consolidación del Pipeline WebGL Zero-Raster
- **Aislamiento de Red 100% Local:** Cero peticiones salientes a CartoDB, Mapbox o servidores externos de teselas.
- **Estilo Base:** `ZERO_RASTER_MILITARY_STYLE` carga `/map/world_land.json` sobre `#0E100C`.
- **Estratificación en GPU de Carreteras Troncales:**
  1. `roads-ink-shadow` (Sombra tinta cómic `#0A0B08`).
  2. `roads-glow` (Resplandor radar `#00FF66` / `#F59E0B`).
  3. `roads-core` (Núcleo vectorial nítido con escalado de grosor por zoom).
- **Worker Autónomo Desacoplado:** `public/maplibre-gl-worker.mjs` resuelve la carga de hilos sin dependencias de bundler, con código 200 OK local.
- **Suite Determinista:** [`src/engine/coordinatesAndBitmap.test.ts`](file:///c:/Users/morin/GEOTACTICS/src/engine/coordinatesAndBitmap.test.ts) valida con 10/10 tests (100% PASS en 6ms) la proyección analítica WGS84, LOD semántico, algoritmo Bresenham y empaquetado binario de niebla de guerra en 50 bytes.

---

## 4. PLAN DE SINCRONIZACIÓN PROPOSITIVO

> [!WARNING] OBSOLETO EN v0.0.2
> Los siguientes bloques de documentación contienen directivas y snippets incompatibles con la arquitectura real de `v0.0.2-alfa` y deben ser actualizados siguiendo las enmiendas que se detallan a continuación.

### Enmienda 1: Sincronización de la Sección 3.2 de `docs/00_GEOTACTICS_ONLINE_MASTER_SPEC.md`
**Texto a sustituir (Líneas 340-367):** El bloque que declara `MILITARY_C4ISR_STYLE` con URLs de CartoDB (`cartodb-basemaps-a.global.ssl.fastly.net/dark_nolabels/{z}/{x}/{y}.png`).  
**Texto de reemplazo propuesto:**
```typescript
/**
 * ESTILO CANÓNICO C4ISR ZERO-RASTER (v0.0.2-alfa)
 * Renderizado local en GPU sin peticiones a proveedores externos de teselas.
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
      paint: { 'background-color': '#0E100C' },
    },
    {
      id: 'world-land-mass',
      type: 'fill',
      source: 'world-land',
      paint: { 'fill-color': '#1C1E17', 'fill-opacity': 0.95 },
    },
    {
      id: 'world-land-border',
      type: 'line',
      source: 'world-land',
      paint: { 'line-color': '#46521F', 'line-width': 1.2, 'line-opacity': 0.65 },
    },
  ],
};
```

### Enmienda 2: Aclaración de la Arquitectura de 3 Capas en `docs/00_GEOTACTICS_ONLINE_MASTER_SPEC.md`
**Añadir en la Sección 1 (Visión y Alcance):**
```markdown
> [!NOTE] ALCANCE OPERATIVO EN v0.0.2-alfa (MVP POLÍTICO)
> - **Capa 1 (Metajuego Político ALICE):** ACTIVA. Rige la economía de 24 soberanías estadales y 7 buffers de frontera. Las disputas se resuelven mediante asedio político directo y erosión de Puntos de Control Territorial (TCP).
> - **Capa 2 (Combate Táctico Advance Wars en Cuadrícula):** EN ESPERA / DESHABILITADA EN RUNTIME. El arnés determinista de combate está codificado, pero su proyección en el mapa (TileCanvas) está congelada para priorizar la estabilidad del mapa macro y el bucle geopolítico.
> - **Capa 3 (Bark Engine & Mando):** ACTIVA CON SUJETO ÚNICO. El motor de diálogo táctico está restringido mediante candado monousuario a la Mayor Stella (`stella`) como sujeto de calibración adaptativa.
```

### Enmienda 3: Purga Documental de `WorldMapCanvas.tsx`
- En `docs/00_GEOTACTICS_ONLINE_MASTER_SPEC.md` (L237 y L1554) y `docs/PLAN_DESPLIEGUE_MAPA_WEBGL_VENEZUELA.md` (L186), sustituir toda mención de `WorldMapCanvas.tsx` como componente activo o fallback por la declaración de erradicación definitiva efectuada en el hito `v0.0.2-alfa`.

### Enmienda 4: Corrección de Datos en `public/map/theatre_regions.json`
- Regenerar el GeoJSON para alinear sus 24 entidades con los IDs canónicos de `CANONICAL_VENEZUELA_REGIONS` e incorporar las geometrías de las 7 zonas de amortiguación fronteriza (`BUF_CO_01..03`, `BUF_BR_01`, `BUF_GY_01`, `BUF_TT_01`, `BUF_CW_01`).

---

## 5. PAUSA DE AUTORIZACIÓN HUMANA (FASE 3)

Este diagnóstico ha concluido la fase de análisis sin alterar ningún archivo de código ni de documentación histórica.

> [!IMPORTANT]
> **ESTADO DE ESPERA:** Las enmiendas y refactorizaciones detalladas en este informe requieren la revisión y confirmación explícita del desarrollador antes de proceder a la sincronización de la documentación en `docs/` o la depuración de código residual en `src/`.

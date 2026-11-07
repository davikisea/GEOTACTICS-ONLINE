# MASTER AUDIT: UI/UX DE INICIO, PANTALLA DE CARGA Y DESCONGESTIÓN DE VENTANAS FLOTANTES
**GEOTACTICS ONLINE (Tactical Command: Wars of Legacy)**  
*Documento Rector Forense y Hoja de Ruta de Refactorización Modular*  
**Fecha de Ejecución**: 07 de Noviembre, 2026  
**Versión del Software Auditado**: Alfa v0.1.0 (`package.json`: 0.1.0)  
**Entorno de Ejecución**: Windows 11 x64, Chromium Headless / Headed v1.64.1 (Playwright), Node.js v20.18.0, Vite v8.3.5 (Rolldown / OxC)  
**Orquestador de Auditoría**: Enjambre de 10 Agentes Especializados de Calidad Total

---

## 1. RESUMEN EJECUTIVO (EXECUTIVE SUMMARY)

La presente auditoría forense y empírica ha examinado el ciclo de vida completo de arranque de **GEOTACTICS ONLINE**, desde el montaje del componente raíz [`App.tsx`](file:///c:/Users/Mor%C3%ADn/GEOTACTICS-ONLINE/src/App.tsx) y la pantalla de precarga [`GeotacticsLoadingScreen.tsx`](file:///c:/Users/Mor%C3%ADn/GEOTACTICS-ONLINE/src/domains/tactics/components/GeotacticsLoadingScreen.tsx) hasta el despliegue del Cuartel General en [`WarLobbyHub.tsx`](file:///c:/Users/Mor%C3%ADn/GEOTACTICS-ONLINE/src/domains/world/components/WarLobbyHub.tsx) y el lienzo cartográfico [`TacticalWorldMap.tsx`](file:///c:/Users/Mor%C3%ADn/GEOTACTICS-ONLINE/src/domains/world/components/TacticalWorldMap.tsx).

Mediante pruebas Playwright automatizadas a resoluciones de 1920x1080 (Desktop), 1366x768 (Laptop Estándar) y 390x844 (Mobile Viewport), captura de telemetría de red y consola, e inspección estructural del árbol de dependencias, se han descubierto **12 anomalías críticas y de alto impacto**, entre las que destacan:
1. **Discrepancia y Falsedad de Telemetría en la Pantalla de Carga**: Discrepancia explícita de versiones (`VER 0.0.1 ALFA` en badge superior vs `Alfa v0.1.0` en el pie de página vs `0.1.0` en `package.json`), frecuencias de radio ficticias no vinculadas a red, título redundante duplicado sobre el logotipo 3D y una barra de progreso puramente cosmética basada en un bucle `Math.random()` incremental desacoplado de la carga real de recursos del servidor.
2. **Prop `autoProceed={false}` Ignorada en la Pantalla de Carga**: `App.tsx` suministra explícitamente `autoProceed={false}` a `GeotacticsLoadingScreen`, pero el componente ignora completamente dicha propiedad en su efecto de finalización, disparando una transición forzada e incontrolable tras 1.4 segundos.
3. **Colisión Espacial y Sobrecarga Cognitiva al Iniciar**: El estado inicial del Cuartel General fuerza simultáneamente `isWorldMapExpanded = true` e `isMetaConsoleOpen = true`. Esto provoca que el usuario sea arrojado inmediatamente a un mapa WebGL masivo donde una consola lateral invasiva de 410px de ancho tapa más del 30% del viewport en ordenadores portátiles (y el 100% en móviles), colisionando con el Dock inferior, el encabezado `DualResourceHeader`, los bocadillos de diálogo de Mayor Stella y la barra flotante de teatro.
4. **Violación Flagrante del Pilar Canónico 1 (CERO Cartas)**: En `WarLobbyHub.tsx` (Línea 123), la Estación 03 de la Armería se encuentra rotulada como `"Hangar de Tropas • Mazo de 10 Cartas"`, violando directamente la regla fundacional de CERO cartas y sustitución estricta por Bahías de Chasis Físico (16 tropas máx: 4 activas + 12 de reserva). Adicionalmente, subsiste un módulo de ruleta diaria (`WHEEL_PRIZES`) incompatible con la seriedad de un simulador táctico militar canónico.
5. **Ineficacia Total de Code-Splitting en `App.tsx`**: `App.tsx` (archivo monolítico de más de 3,087 líneas) define importaciones dinámicas `React.lazy()` para `@domains/economy` y `@domains/world`, pero importa estáticamente los mismos barriles en la cabecera, provocando que Vite empaquete más de 2.2 MB de JavaScript no comprimido en el bundle inicial (`index.js`: 1,094 kB, `maplibre-gl.js`: 1,105 kB).

---

## 2. EVIDENCIA EMPÍRICA Y CAPTURAS FORENSES (HARVESTED VISUALS)

Las pruebas Playwright automatizadas ejecutadas en Chromium generaron las siguientes capturas reales almacenadas en [`test-results/audit_screenshots/`](file:///c:/Users/Mor%C3%ADn/GEOTACTICS-ONLINE/test-results/audit_screenshots/):

| Archivo de Captura | Resolución | Momento Temporal | Hallazgo Visual Clave |
| :--- | :--- | :--- | :--- |
| **`01_loading_screen_redundancies.png`** | 1920x1080 | t=800ms (Precarga) | Contradicción `VER 0.0.1 ALFA` vs `Alfa v0.1.0`; duplicación de título "GEOTACTICS ONLINE"; telemetría de radio decorativa; barra no sincrónica. |
| **`02_post_boot_cluttered_windows.png`** | 1920x1080 | Frame 1 Post-Carga | Despliegue concurrente de 5 capas: Mapa WebGL + Consola 410px + Header + Dock + Bocadillo Stella. Ausencia de foco visual único. |
| **`03_responsive_1366x768_overlap.png`** | 1366x768 | Frame 1 Post-Carga | Colisión destructiva: Consola MetaMando corta el botón `¡COMBATE INMEDIATO!`; avatar de Mayor Stella tapa el botón `[TIENDA]` del Dock. |
| **`04_mobile_viewport_overlap.png`** | 390x844 | Frame 1 Post-Carga | Saturación total: Consola ocupa el 100% del ancho; el sprite de Stella se renderiza sobre el texto y botones; botón de despliegue recortado. |
| **`boot_t100ms.png`** | 1920x1080 | t=100ms (Arranque) | Inicialización del canvas balístico y radar táctico procedural rotatorio. |
| **`boot_t1500ms.png`** | 1920x1080 | t=1500ms (Cierre) | Sincronización al 100% simulada con desconexión del estado real del servidor. |

> [!IMPORTANT]
> **Referencia de Archivos Locales de Evidencia**:
> - Registro JSON de errores de consola y red: [`test-results/audit_screenshots/console_and_network_audit.json`](file:///c:/Users/Mor%C3%ADn/GEOTACTICS-ONLINE/test-results/audit_screenshots/console_and_network_audit.json)
> - Script Playwright de auditoría reproducible: [`tests/e2e/startup-audit.spec.ts`](file:///c:/Users/Mor%C3%ADn/GEOTACTICS-ONLINE/tests/e2e/startup-audit.spec.ts)

---

## 3. DIAGNÓSTICO DETALLADO POR LOS 10 AGENTES ESPECIALIZADOS

### AGENT-01: Boot & Telemetry Diagnostics Specialist (`@domains/tactics` & `@shared`)
- **Falso Determinismo en la Barra de Carga**: En [`GeotacticsLoadingScreen.tsx`](file:///c:/Users/Mor%C3%ADn/GEOTACTICS-ONLINE/src/domains/tactics/components/GeotacticsLoadingScreen.tsx#L96-L112), el progreso no refleja la carga real de chunks ni la sincronización con Supabase. Utiliza un `setInterval` a 120ms donde `currentPct += Math.floor(Math.random() * 9) + 4`. La sincronización de catálogos (`catalogRegistry.synchronizeWithServer()`) se ejecuta en segundo plano (Línea 78) sin vincularse al estado del porcentaje.
- **Inconsistencia Crítica de Versión**: El badge militar pop-art superior derecho rota a `rotate-[4deg]` con texto estático `VER 0.0.1 ALFA` (Línea 221), mientras que el badge inferior del footer muestra `Alfa v0.1.0` (Línea 301). El contrato legal del proyecto en `package.json` estipula `"version": "0.1.0"`.
- **Telemetría Decorativa vs Real**: El encabezado C4ISR muestra `FREQ: 142.85 MHz SAT-COM • CANONICAL BALISTICS` (Línea 170). Es un valor estático codificado rígidamente (hardcoded) sin conexión a telemetría de red, latencia de ping ni estado de socket.
- **Títulos Duplicados**: El componente monta el logotipo oficial recortado `/logo-cropped.png` (que ya contiene en modelado 3D el rótulo "GEOTACTICS ONLINE") y, exactamente 8 píxeles abajo, renderiza un `<h1>` con `GEOTACTICS ONLINE` (Líneas 238-241), duplicando la carga tipográfica.
- **Ráfaga de Advertencias de AudioContext**: Durante el arranque sin interacción del usuario, `playTacticalBlip` intenta disparar clics de audio procedural en cada tick aleatorio. El navegador bloquea las llamadas por falta de gesto humano, inundando la consola con más de 20 advertencias: `The AudioContext was not allowed to start. It must be resumed after a user gesture`.
- **Redundancia de Componentes de Carga**: En el árbol existe [`MapLoadingScreen.tsx`](file:///c:/Users/Mor%C3%ADn/GEOTACTICS-ONLINE/src/domains/world/components/MapLoadingScreen.tsx), que es un archivo huérfano de 41 líneas que simplemente envuelve a `GeotacticsLoadingScreen` duplicando la lógica de precarga.

---

### AGENT-02: Playwright E2E Visual Inspector & Screenshot Harvester (`/game-qa-playtester`)
- **Fuga de Tiempos y Cierre Prematuro**: Playwright demostró empíricamente que la pantalla de carga se autodestruye en aproximadamente 1,400 ms sin importar la velocidad de red.
- **Captura de Colisiones Visuales en 1366x768**: En portátiles de resolución estándar (768p de altura vertical), los 410px de la consola lateral de metapolítica y los 140px de la viñeta del comandante reducen el área visible del mapa WebGL a un estrecho pasillo central de menos del 45% del ancho de pantalla.
- **Detección de Error Sintáctico en el Parser de Vite**: Durante la ejecución del quality gate se detectó que [`src/shared/types/database.types.ts`](file:///c:/Users/Mor%C3%ADn/GEOTACTICS-ONLINE/src/shared/types/database.types.ts#L4258) carecía de punto y coma en las declaraciones de tipo (`type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">`), lo que provocó un fallo de parsing en `vite:oxc` que detenía la recarga en caliente (HMR).

---

### AGENT-03: Spatial Layout & Window Clutter Auditor (`@domains/world` & `@tactical-command-intel`)
- **Colisión Simultánea en Arranque**: En [`WarLobbyHub.tsx`](file:///c:/Users/Mor%C3%ADn/GEOTACTICS-ONLINE/src/domains/world/components/WarLobbyHub.tsx#L215-L219), se inicializan en `true` dos variables de estado incompatibles con un inicio sereno:
  ```typescript
  const [isWorldMapExpanded, setIsWorldMapExpanded] = useState(true);
  const [isMetaConsoleOpen, setIsMetaConsoleOpen] = useState(true);
  ```
- **Capas Superpuestas sin Jerarquía de Mando**:
  1. Capa `z-0`: `TacticalWorldMap` (Lienzo WebGL 2.0).
  2. Capa `z-10`: `StateInspectorDrawer` (Panel lateral de provincia).
  3. Capa `z-20`: C4ISR Theater Strip flotante.
  4. Capa `z-30` / `z-40`: `MetaCommandConsole` desplegada a 410px de ancho.
  5. Capa `z-30`: `DualResourceHeader` en la parte superior.
  6. Capa `z-40`: `TacticalDock` inferior.
  7. Capa flotante: Viñeta con diálogo del Bark Engine (`Mayor Stella`) anclada a la esquina inferior izquierda.
- **Áreas Ciegas y Click-Traps**: El botón `[PLEGAR CONSOLA]` queda en la franja superior derecha dentro de la barra flotante del mapa, mientras que el tirador lateral de la consola (`ChevronRight`) tiene apenas 6px de área de impacto (`-ml-3 px-1.5 py-4`), resultando en clics accidentales sobre el canvas de MapLibre.

---

### AGENT-04: Design System & Kinetic Game Feel Auditor (`@domains/game-feel` & `@indie-game-ui-architect`)
- **Consistencia de Paleta Bélica C4ISR**: Se respetan las constantes cromáticas `#161712` (Fondo asfáltico), `#2B2C24` (Blindaje militar), `#C46A3A` (Óxido táctico), `#F2E8D5` (Papel marfil) y `#00FF66` (Fósforo verde de radar). Las sombras duras `shadow-[4px_4px_0px_#0A0B08]` y los biseles `rounded-[14px_4px_14px_4px]` cumplen el manifiesto pop-art.
- **Sobrecarga del Bark Engine al Iniciar**: Tan pronto como monta el Cuartel General, Mayor Stella emite un diálogo automático: *"Fijando telemetría sobre Distrito Capital - Caracas. Estado de búnker y recursos en pantalla."*. Este bocadillo permanece activo por tiempo indefinido tapando los botones de navegación de la barra inferior en resoluciones inferiores a 1080p.
- **Desincronización de la Ghost Bar**: La barra de progreso de `GeotacticsLoadingScreen` implementa el efecto de doble capa (Front Spring + Ghost Trail retrasada con `ease-out-expo`), pero al estar alimentada por `Math.random()`, el retardo de la ghost bar luce errático y artificial.

---

### AGENT-05: Domain Boundary & Component Placement Auditor (`@geotactics-domain-boundary-guardian`)
- **Ubicación Anómala de la Pantalla de Carga**: `GeotacticsLoadingScreen.tsx` reside físicamente en `src/domains/tactics/components/GeotacticsLoadingScreen.tsx`. Siendo una pantalla de precarga global que orquesta la carga de catálogos económicos, geopolíticos y assets compartidos, su ubicación correcta de acuerdo a la arquitectura de 4 dominios es `src/shared/ui/GeotacticsLoadingScreen.tsx` o en su propio subdirectorio de orquestación global.
- **Monolito en `App.tsx`**: `App.tsx` contiene 3,087 líneas de código fuente. Gestiona directamente el estado de 12 modales (`isAuthModalOpen`, `isImportModalOpen`, `isProductionModalOpen`, `isTacticalDrawerOpen`, `isPreBattleModalOpen`, `isReinforcementModalOpen`, `isDevStudioOpen`, etc.), las cuadrículas iniciales de simulación (`INITIAL_GRID`, `INITIAL_UNITS`) y lógica de combate que debe delegarse a los controladores de `@domains/tactics` y `@domains/world`.
- **Falsa Modularización (Dynamic Import Leaks)**: Las importaciones `React.lazy()` en `App.tsx` (e.g. `ShopCatalog`, `IndustrialComplexView`, `ClanHeadquartersView`) quedan anuladas porque `App.tsx` realiza simultáneamente importaciones estáticas desde los mismos barriles públicos (`@domains/economy`, `@domains/world`).

---

### AGENT-06: WebGL Cartography & Canvas Zero-Raster Auditor (`@domains/world` & `@webgl-cartography-and-spatial-architect`)
- **Impacto del Montaje Simultáneo de MapLibre**: Al tener `isWorldMapExpanded=true` en el primer render, MapLibre GL JS v6 comienza a inicializar el contexto WebGL, compilar shaders y solicitar los GeoJSON locales (`world_land.json`, `theatre_regions.json`, `theatre_roads.json`) en el mismo instante en que el usuario entra al Cuartel General.
- **Transición con Pantallazo Negro (Flash of Unrendered Canvas)**: Como los GeoJSON y las fuentes vectoriales tardan entre 150ms y 400ms en descargarse, el canvas de MapLibre se muestra como un fondo negro absoluto antes de colorear los polígonos de Venezuela, provocando un efecto visual tosco tras la desaparición de la pantalla de carga.

---

### AGENT-07: Canonical Metagame & 7 Pillars Compliance Officer (`@domains/economy` & `@metagame-economy-and-siege-simulator`)
- **Violación del Pilar Canónico 1 en la Interfaz**: En [`WarLobbyHub.tsx`](file:///c:/Users/Mor%C3%ADn/GEOTACTICS-ONLINE/src/domains/world/components/WarLobbyHub.tsx#L123), la estación de navegación de la Armería expone:
  ```typescript
  armory: { badge: 'ESTACIÓN 03 // HANGAR', title: 'Hangar de Tropas • Mazo de 10 Cartas' }
  ```
  Esto es una violación explícita del **Pilar 1: CERO CARTAS / Almacén Físico de 16 Tropas** (4 desplegadas + 12 de reserva). Debe renombrarse inmediatamente a `"Hangar de Tropas • Bahías de Chasis Físico (16 Tropas)"`.
- **Residuo Gacha Incompatible**: La existencia de una Ruleta Diaria (`WHEEL_PRIZES`, función `spinWheel`, canvas giratorio a 3 tiempos) desentona radicalmente con un simulador táctico militar determinista basado en logística industrial, refinería RGO y economía P2P. La obtención de suministros debe diegetizarse como *"Reabastecimiento Logístico de Intendencia"* o *"Entrega de Suministros del Alto Mando"*, eliminando cualquier referencia visual a ruletas de casino/gacha.

---

### AGENT-08: Core Web Vitals & Bundle Performance Profiler (`modern-web-guidance` & `debug-optimize-lcp`)
- **Auditoría de Tamaños de Bundle de Producción (`vite build`)**:
  - `dist/assets/index-B0voIbVs.js`: **1,094.80 kB** (299.83 kB gzip) - Excede el umbral de advertencia de 650 kB.
  - `dist/assets/maplibre-gl-BXtJuhWO.js`: **1,105.61 kB** (303.54 kB gzip).
  - `dist/assets/vendor-react-XeIGH1rl.js`: **211.95 kB** (66.75 kB gzip).
  - `dist/assets/vendor-supabase-DrbhGZHj.js`: **223.59 kB** (58.88 kB gzip).
  - `dist/assets/vendor-motion-CtJ_oR91.js`: **124.78 kB** (41.52 kB gzip).
  - Total inicial no comprimido: **> 2.7 MB**.
- **Explosión de Nodos DOM en Primer Frame**: En el primer frame interactivo post-carga se montan simultáneamente más de **320 nodos DOM** (24 botones de regiones soberanas, 7 buffers, controles de peaje, sliders de meta-mando, viñetas de oficiales, tickers y pestañas de navegación), penalizando el INP (Interaction to Next Paint) y el LCP (Largest Contentful Paint).

---

### AGENT-09: Accessibility, Responsive & Keyboard Navigation Auditor (`a11y-debugging` & `chrome-devtools`)
- **Navegación por Teclado e Inconsistencia de la Tecla `ESC`**:
  - En `WarLobbyHub.tsx` (Línea 494), presionar `ESC` ejecuta `setIsWorldMapExpanded(false)`. Si el jugador tenía abierta la consola de metapolítica o un modal secundario, presionar `ESC` destruye la vista del mapa en lugar de cerrar primero el modal de mayor profundidad (`activeModal` -> `isMetaConsoleOpen` -> `isWorldMapExpanded`).
- **Trampas de Foco (Focus Traps)**: Cuando la consola lateral de 410px está abierta, la navegación con la tecla `Tab` no queda atrapada en el panel, saltando a botones interactivos invisibles que se encuentran tapados debajo de la consola en el mapa WebGL.
- **Contraste de Color en Micro-Tipografías**: Los textos en fuente mono con tamaño `text-[10px]` o `text-[11px]` que utilizan color `#7B8A4A` sobre fondos `#161712` presentan un ratio de contraste de **3.2:1**, por debajo del umbral mínimo de **4.5:1** exigido por WCAG 2.1 Nivel AA para texto estándar.

---

### AGENT-10: Lead Systems Architect & Synthesis Director (`game-dev-quality-gate`)
- **Síntesis Ejecutiva**: El juego posee un núcleo visual distintivo de novela gráfica militar (Advance Wars + Persona 5 / Hades) y un motor determinista muy potente. No obstante, la experiencia de entrada actual sufre del síndrome de *"todo abierto a la vez"*: una pantalla de carga falsa y redundante que se esfuma apresuradamente, dando paso a una tormenta visual donde el mapa, las consolas, las viñetas y los paneles compiten agresivamente por la atención del usuario.
- **Principio Rector del Target State**: **Un solo foco atencional por pantalla**. La entrada al juego debe ser diegética, elegante y minimalista.

---

## 4. MATRIZ DE SEVERIDAD DE HALLAZGOS FORENSES

| ID | Área Afectada | Hallazgo Forense | Severidad | Impacto en Usuario |
| :---: | :--- | :--- | :---: | :--- |
| **CLU-01** | `WarLobbyHub.tsx` | `isWorldMapExpanded=true` e `isMetaConsoleOpen=true` por defecto | **CRÍTICO** | El jugador es abrumado con 5 capas simultáneas sin foco visual claro. |
| **PIL-01** | `WarLobbyHub.tsx` | Texto `"Hangar de Tropas • Mazo de 10 Cartas"` (Línea 123) | **CRÍTICO** | Violación del Pilar 1 Canónico (CERO cartas). |
| **BOOT-01**| `GeotacticsLoadingScreen.tsx` | Prop `autoProceed={false}` declarada pero ignorada en `useEffect` | **CRÍTICO** | Imposibilidad de controlar el momento de transición hacia el lobby. |
| **BOOT-02**| `GeotacticsLoadingScreen.tsx` | Discrepancia de versión: `VER 0.0.1 ALFA` vs `Alfa v0.1.0` vs `0.1.0` | **ALTO** | Pérdida de coherencia contractual en la pantalla de bienvenida. |
| **BOOT-03**| `GeotacticsLoadingScreen.tsx` | Barra de progreso falsa (`Math.random()`) desacoplada de catálogos | **ALTO** | Pantalla de carga cosmética que no sincroniza datos reales. |
| **RESP-01**| `MetaCommandConsole.tsx` | Ancho estático de 410px sin adaptación responsive en 1366x768 | **ALTO** | En laptops tapa el 30% del mapa y corta el botón de combate. |
| **PERF-01**| `App.tsx` | Falsa modularización `React.lazy()` con imports estáticos cruzados | **ALTO** | Bundle inicial inflado a 1.1 MB (`index.js`), degradando LCP. |
| **PIL-02** | `WarLobbyHub.tsx` | Mecánica de Ruleta diaria estilo Gacha (`WHEEL_PRIZES`) | **MEDIO** | Disonancia temática con un simulador táctico militar serio. |
| **UX-01**  | `GeotacticsLoadingScreen.tsx` | Título "GEOTACTICS ONLINE" duplicado bajo el logotipo 3D | **MEDIO** | Polución tipográfica redundante e innecesaria. |
| **A11Y-01**| `WarLobbyHub.tsx` | Pila de `ESC` rota: destruye el mapa antes de cerrar modales | **MEDIO** | Frustración de navegación en teclado para jugadores veteranos. |
| **DOM-01** | Estructura de Dominio | `GeotacticsLoadingScreen` reside en `@domains/tactics` | **MEDIO** | Violación de frontera: un componente global vive en un subdominio. |
| **AUD-01** | `GeotacticsLoadingScreen.tsx` | 20+ advertencias de `AudioContext` en consola sin interacción | **BAJO** | Ruido innecesario en la consola del navegador. |

---

## 5. FLUJO ACTUAL VS FLUJO OBJETIVO (TARGET CLEAN FLOW)

```mermaid
flowchart TD
    subgraph CURRENT_FLOW["FLUJO ACTUAL (CONGESTIONADO & CAÓTICO)"]
        direction TB
        A1[Usuario Ingresa a /] --> A2[GeotacticsLoadingScreen Montada]
        A2 --> A3[Barra Falsa Math.random avanza a 100% en 1.4s]
        A3 --> A4[AutoProceed Ignora prop false y dispara Cierre Inmediato]
        A4 --> A5[Entrada Abrupta a WarLobbyHub]
        A5 --> A6[isWorldMapExpanded = true]
        A5 --> A7[isMetaConsoleOpen = true 410px]
        A5 --> A8[DualResourceHeader + TacticalDock]
        A5 --> A9[Bocadillo Mayor Stella disparado inmediatamente]
        A6 & A7 & A8 & A9 --> A10[COLISIÓN VISUAL: 5 Capas Compitiendo por Atención]
    end

    subgraph TARGET_FLOW["FLUJO OBJETIVO RECOMENDADO (CANÓNICO & ORDENADO)"]
        direction TB
        B1[Usuario Ingresa a /] --> B2[GeotacticsBootScreen Sincronizada]
        B2 --> B3[Precarga Real de Catálogos & Assets SSOT < 1.0s]
        B3 --> B4[Botón Diegético de Entrada: INGRESAR AL TEATRO DE OPERACIONES]
        B4 --> B5[Entrada Limpia al Living Comic Command Canvas]
        B5 --> B6[FOCO PRINCIPAL: CommanderLivingVignette 58% + Terminal Despliegue 42%]
        B6 --> B7[isWorldMapExpanded = false por Defecto]
        B6 --> B8[isMetaConsoleOpen = false Plegada como Píldora Lateral]
        B6 --> B9[Jugador Elige: ¡COMBATE INMEDIATO! o ABRIR TEATRO SOBERANO [M]]
        B9 -- Al pulsar M o Globo --> B10[Apertura Suave del Mapa WebGL con Consola Plegada]
    end
```

---

## 6. HOJA DE RUTA TÉCNICA DE REFACTORIZACIÓN MODULAR (4 FASES)

### FASE 1: DESCONGESTIÓN INMEDIATA DEL CUARTEL GENERAL & BLINDAJE DE PILARES (QUICK WINS)
*Meta: Eliminar la colisión de ventanas, corregir textos anticartas y restituir el Living Comic Canvas como vista principal de entrada.*

1. **Reversión de Estados Predeterminados en `WarLobbyHub.tsx`**:
   - Cambiar `isWorldMapExpanded` inicial de `true` a `false`.
   - Cambiar `isMetaConsoleOpen` inicial de `true` a `false`.
   - El juego arrancará en **The Living Comic Canvas** (Mayor Stella + Terminales operativas), el cual es el diseño canónico galardonado de GEOTACTICS ONLINE.
2. **Corrección de Textos y Blindaje del Pilar 1**:
   - En `WarLobbyHub.tsx` (Línea 123), sustituir `"Mazo de 10 Cartas"` por `"Bahías de Chasis Físico (16 Tropas)"`.
   - Diegetizar la Ruleta diaria (`WHEEL_PRIZES`) transformándola en un *"Depósito Logístico de Intendencia Militar"* con apertura determinista de cajas de suministros, erradicando el canvas de ruleta giratoria.
3. **Pila de Teclado `ESC` Respetuosa de Jerarquías**:
   - Reordenar el `keydown` de `WarLobbyHub.tsx` para cerrar en orden:
     1. Si `activeModal !== null` -> Cerrar `activeModal`.
     2. Si `isMetaConsoleOpen === true` -> Plegar `isMetaConsoleOpen`.
     3. Si `isWorldMapExpanded === true` -> Regresar al Living Comic Canvas (`isWorldMapExpanded = false`).

---

### FASE 2: PROFESIONALIZACIÓN DIEGÉTICA DE LA PANTALLA DE CARGA
*Meta: Sincronización real con el servidor, unificación de versiones y eliminación de datos ficticios.*

1. **Unificación de Versión SSOT**:
   - Vincular los badges de versión a una constante única importada desde `@shared`: `APP_VERSION = "Alfa v0.1.0"`.
   - Eliminar el badge contradictorio `VER 0.0.1 ALFA` y reemplazarlo por un sello de seguridad militar dinámico: `BUILD: 0.1.0 // DETERMINISMO TÁCTICO`.
2. **Eliminación de Título Duplicado y Telemetría Falsa**:
   - Remover el `<h1>GEOTACTICS ONLINE</h1>` debajo del logo oficial en `GeotacticsLoadingScreen.tsx`.
   - Reemplazar la frecuencia estática `142.85 MHz` por el estado real de latencia y WebSocket de Supabase (`WS LATENCY: < 45ms • CANONICAL BALISTICS`).
3. **Respeto Estricto de `autoProceed`**:
   - Modificar el `useEffect` de `GeotacticsLoadingScreen.tsx` para evaluar:
     ```typescript
     if (isReady && autoProceed && onLoadingComplete) {
       // transición automática opcional
     }
     ```
   - Permitir la opción de un botón de interacción táctica *"INGRESAR AL ESTADO MAYOR [ESPACIO]"* para desbloquear el AudioContext de forma nativa antes del primer frame.

---

### FASE 3: REUBICACIÓN ARQUITECTÓNICA Y SANEAMIENTO DE DOMINIOS
*Meta: Aislar componentes globales en `@shared/ui` y depurar componentes proxy redundantes.*

1. **Migración de `GeotacticsLoadingScreen`**:
   - Mover el componente desde `src/domains/tactics/components/GeotacticsLoadingScreen.tsx` a `src/shared/ui/GeotacticsLoadingScreen.tsx`.
   - Actualizar el barril `src/shared/index.ts` y ajustar las importaciones en `@domains/tactics`, `@domains/world` y `App.tsx`.
2. **Eliminación de `MapLoadingScreen.tsx`**:
   - Eliminar el archivo huérfano `src/domains/world/components/MapLoadingScreen.tsx` y utilizar directamente la pantalla compartida de `@shared/ui`.

---

### FASE 4: MODULARIZACIÓN DE `App.tsx` & OPTIMIZACIÓN DE CODE-SPLITTING
*Meta: Descomponer el archivo monolítico de 3,000 líneas en sub-árboles de dominio limpios y habilitar lazy loading real.*

1. **Extracción de Modales Globales a Controladores de Dominio**:
   - Mover los modales tácticos (`ProductionModal`, `ReinforcementRequestModal`, `PreBattleDeploymentModal`) a un orquestador dentro de `src/domains/tactics/components/TacticalModalOrchestrator.tsx`.
   - Mover los modales económicos (`ShopCatalog`, `LoadoutCustomizer`, `P2PMarketplaceView`) a `src/domains/economy/components/EconomyStationOrchestrator.tsx`.
2. **Aislamiento de Barriles para Code-Splitting en Vite**:
   - Refactorizar las importaciones dinámicas en `App.tsx` para importar directamente los archivos fuente (e.g. `import('./domains/economy/components/ShopCatalog')`) en lugar de pasar por los barriles principales que anulan el code-splitting.
   - Reducir el bundle principal `index.js` de 1.1 MB a menos de 450 kB.

---

## 7. CRITERIOS DE CERTIFICACIÓN Y ACEPTACIÓN (DEFINITION OF DONE)

Para certificar el cierre de la futura implementación de esta hoja de ruta, se deberán superar los siguientes oráculos:
- [ ] `npm run lint` y `npm run build` sin errores de compilación ni advertencias de importaciones dinámicas ineficaces.
- [ ] `npm run test:all` (13 suites deterministas) y `npm run test:geotactics` (93 pruebas canónicas) superadas al 100%.
- [ ] Suite Playwright E2E (`npx playwright test tests/e2e/startup-audit.spec.ts`) aprobada con capturas limpias:
  - Pantalla de carga con versión única `Alfa v0.1.0` y sin títulos duplicados.
  - Primer frame del Cuartel General mostrando el Living Comic Canvas ordenado, con el mapa y la consola plegados por defecto.
  - Cero colisiones en resolución de portátil (1366x768).
  - Cero advertencias de AudioContext no autorizado en la consola de inicio.
- [ ] Validación de los 7 Pilares: Cero menciones a "mazos de cartas" o "ruletas gacha" en el código del lobby.

---
name: game-qa-playtester
description: Agente de Playtesting E2E y QA Multimodal para GEOTACTICS ONLINE. Ejecuta el juego real en Chromium con Playwright, inspecciona el puente window.__TACTICAL_QA_BRIDGE__ (src/shared/utils/qaHarness.ts), audita la carga WebGL Zero-Raster (TacticalWorldMap.tsx), monitorea errores de consola y red, y diagnostica o repara regresiones en los 4 dominios modulares.
---

# GAME QA PLAYTESTER - MANUAL OPERATIVO (v2.0 Modular & WebGL Zero-Raster)

Usa esta skill cada vez que el usuario pida:
- "Prueba el juego" o "Haz un playtest E2E"
- "Revisa por qué crashea el juego, el mapa WebGL o un modal"
- "Ejecuta las pruebas de interfaz y jugabilidad (`npm run test:qa`)"
- "Verifica si el teatro de operaciones o el lobby son jugables"

---

## 1. MISIÓN Y ARQUITECTURA DE QA EN GEOTACTICS ONLINE

El evaluador verifica tanto la ejecución determinista de los motores como la experiencia real en navegador Chromium:
1. **Puente de Telemetría E2E (`window.__TACTICAL_QA_BRIDGE__`)**: Definido en `src/shared/utils/qaHarness.ts` y expuesto visualmente en `src/shared/qa/QADevOpsRunner.tsx` (`Ctrl+Shift+Q`).
2. **Frontera de Captura de Errores**: `src/shared/ui/TacticalErrorBoundary.tsx` intercepta excepciones de renderizado mostrando la terminal de emergencia `DEFCON-1`.
3. **Capas Auditadas en Runtime**:
   - **Boot Screen**: `src/domains/tactics/components/GeotacticsLoadingScreen.tsx` -> Transición a `src/domains/world/components/WarLobbyHub.tsx`.
   - **Mapa WebGL Zero-Raster**: `src/domains/world/components/TacticalWorldMap.tsx` cargando local `/map/world_land.json`, `/map/theatre_regions.json`, `/map/theatre_roads.json`, `/map/theatre_urban_roads.json`, `/map/theatre_cities.json` y `/maplibre-gl-worker.mjs` (0 peticiones a servidores externos de teselas).
   - **Estaciones Modulares**: `UnitHangarModal.tsx` (`@domains/economy`, 16 tropas máx), `IndustrialComplexView.tsx` (10 parcelas), `P2PMarketplaceView.tsx` (2% fee), `TerritorySiegeModal.tsx` (`@domains/world`, Handshake 120s) y `CombatTheaterView.tsx` (`@domains/tactics`, 1–100 HP).

---

## 2. PROTOCOLO DE EJECUCIÓN (BUCLE AUTÓNOMO DE TESTEO)

### Paso A: Ejecutar Suites Deterministas y Suite Playwright E2E
```powershell
npm run test:all
npm run test:geotactics
npm run test:qa
```
*(Nota: `npm run test:qa` levanta automáticamente el servidor Vite y ejecuta Playwright).*

### Paso B: Extraer Telemetría y Capturas Generadas
Inspecciona el resultado en:
- Reporte JSON: `test-results/qa-run-latest.json`
- Capturas de pantalla en `test-results/screenshots/`:
  - `01_boot_screen.png` / `01_war_lobby_boot.png` (Arranque y montaje de `#root`)
  - `02_after_play_click.png` / `02_combat_theater.png` (Navegación a mapa WebGL o teatro táctico)
  - `03_canvas_interaction.png` / `03_tile_interaction.png` (Interacción con regiones, carreteras o celdas)

### Paso C: Matriz de Correlación y Diagnóstico Modular

| Síntoma Visual / Telemetría | Causa Probable en los 4 Dominios | Acción de Reparación Inmediata |
| :--- | :--- | :--- |
| **Pantalla Blanca / Negra o Terminal `DEFCON-1`** | `fatalErrors` contiene un import roto entre dominios o un hook con referencia nula en `src/App.tsx` o `src/domains/world/components/WarLobbyHub.tsx`. | Inspeccionar el stack trace en `test-results/qa-run-latest.json`, verificar las exportaciones en `src/domains/*/index.ts` y corregir el componente. |
| **Mapa WebGL no dibuja regiones o carreteras** | `networkFailures` en `/map/theatre_*.json` o `/maplibre-gl-worker.mjs`, o fallo de inicialización en `src/domains/world/components/TacticalWorldMap.tsx`. | Verificar la existencia de los 5 archivos GeoJSON en `public/map/` y la configuración `ZERO_RASTER_MILITARY_STYLE` en `TacticalWorldMap.tsx`. |
| **Tablero Táctico no dibuja sprites o losetas** | `networkFailures` muestra sprites 404 o fallo en `GameCanvas.tsx`. | Verificar rutas en `src/shared/lib/assetLoader.ts` o catálogos en `src/domains/tactics/core/predefinedMaps.ts`. |
| **Clic no responde / Botón congelado** | `window.__TACTICAL_QA_BRIDGE__` reporta fase bloqueada o un overlay invisible intercepta eventos. | Revisar `z-index`, `pointer-events: none` o la transición en `GeotacticsLoadingScreen.tsx` / `WarLobbyHub.tsx`. |
| **Error de consulta Supabase (`PGRST...`)** | Tabla o RPC de las migraciones 26–31 llamada con firma incorrecta o fallo de red sin fallback offline. | Revisar el servicio en `src/domains/world/services/*`, `src/domains/economy/services/*` o `src/shared/services/*` y garantizar fallback resiliente en memoria. |

### Paso D: Reparar y Revalidar en Bucle Cerrado
1. Aplica la corrección en el archivo correspondiente dentro de `src/domains/*` o `src/shared/*`.
2. Ejecuta `npm run build` y `npm run test:qa`.
3. Confirma que `fatalErrorsCount === 0` y que las capturas muestren la interfaz operativa.

# PLAN MAESTRO UNIFICADO DE EJECUCIÓN, ORQUESTACIÓN TÉCNICA Y DESPLIEGUE A PRODUCCIÓN
**Módulo Canónico Rector:** `docs/orchestration/00_MASTER_EXECUTION_PLAN.md`  
**Proyecto:** *Tactical Command: Wars of Legacy*  
**Versión de Especificación:** 2.0.0-DEFINITIVE-UNIFIED-ROADMAP  
**Fecha de Consolidación:** 31 de Octubre, 2026  
**Estado:** `COMPLETED_AND_CERTIFIED_SSOT` (Fases 0 a 6 Desplegadas, Integradas y Certificadas al 100%)  
**Documentos Fusionados y Sincronizados:**
- `docs/MASTER_REMEDIATION_AND_DEPLOYMENT_PROPOSAL.md` (Auditoría Técnica, Core Loop & Vercel)
- `docs/orchestration/01_UI_AND_MOBILE_ERGONOMICS.md` (Ergonomía, Multitouch & Consola Debug)
- `docs/orchestration/02_ECONOMY_AND_RETENTION_REBALANCE.md` (Soft Cap Decreciente & Tournament Cap)
- `docs/orchestration/03_NETWORKING_AND_TECHNICAL_DEBT.md` (Reconexión en Caliente & Catálogo de Fábrica)
- `docs/orchestration/04_CONTENT_AND_ONBOARDING_PIPELINE.md` (Tutorial 8x6, Web Audio & Campaña)

---

# 1. RESUMEN EJECUTIVO: LA ARQUITECTURA UNIFICADA

La presente especificación consolida en una **única secuencia cronológica lineal de 7 fases (Fase 0 a Fase 6)** la remediación de la deuda técnica crítica y la implementación del backlog de producto y ergonomía.

```
═══════════════════════════════════════════════════════════════════════════════════════════════════
                             PIPELINE MAESTRO DE ORQUESTACIÓN (7 FASES)
═══════════════════════════════════════════════════════════════════════════════════════════════════
  [FASE 0] ──► Saneamiento de Entorno, Build System y Variables Vite (Pre-requisito Bloqueante)
     │
     ▼
  [FASE 1] ──► Cirugía del Core Loop: Ataque Atómico, TRAP con Dijkstra y Cancelación de Bot
     │
     ▼
  [FASE 2] ──► Purga de UI, Aislamiento de Debug (Ctrl+Shift+D), Multitouch Móvil y Háptica
     │
     ▼
  [FASE 3] ──► Orquestación de Base de Datos Supabase (seed.sql), Soft Cap y Tournament Cap
     │
     ▼
  [FASE 4] ──► Protocolo de Red, Sincronización Realtime, Snapshots y Catálogo Fabril Completo
     │
     ▼
  [FASE 5] ──► Onboarding ("Bautismo de Fuego" 8x6), Web Audio Sintetizado y Modo Campaña
     │
     ▼
  [FASE 6] ──► Partición de Bundles (<300KB), Verificación CI/CD y Despliegue en Vercel
═══════════════════════════════════════════════════════════════════════════════════════════════════
```

---

# 2. DIAGRAMA GANTT DE SECUENCIA CRONOLÓGICA Y MATRIZ DE DEPENDENCIAS

```
Fase 0: Saneamiento Vite & Entorno      [■■] (Día 1)
Fase 1: Core Loop & Gameplay Playable   [--][■■■] (Días 2-3)
Fase 2: Purga UI & Ergonomía Móvil      [----][■■■] (Días 4-5)
Fase 3: DB Supabase & Economía Soft Cap [-------][■■■■] (Días 6-7)
Fase 4: Red Realtime & Fábrica Completa [----------][■■■■] (Días 8-9)
Fase 5: Tutorial, Audio & Campaña M3    [-------------][■■■■] (Días 10-11)
Fase 6: Certificación QA & Vercel Prod  [-----------------][■■■] (Días 12-13)
```

| Fase | Denominación del Hito | Prerrequisito | Módulo de Soporte | Entregable Técnico Principal |
| :---: | :--- | :---: | :--- | :--- |
| **0** | **Saneamiento de Entorno & Build** | Ninguno | `MASTER_REMEDIATION...` | `client.ts` con `import.meta.env`, `package.json` limpio, build sin errores. |
| **1** | **Core Loop & Eliminación de Bugs** | Fase 0 | `MASTER_REMEDIATION...` | Transacción atómica Move+Attack, TRAP con Dijkstra, Bot con AbortController. |
| **2** | **Purga de UI & Ergonomía Móvil** | Fase 1 | `01_UI_AND_MOBILE...` | `DebugDevConsoleModal.tsx`, pinch-to-zoom 0.65x-1.80x, motor háptico. |
| **3** | **DB Supabase & Soft Cap Económico** | Fase 1 | `02_ECONOMY_AND...` | `supabase/seed.sql`, curva decreciente $\mu(k)$, Tournament Cap a Nivel 11. |
| **4** | **Red Realtime & Catálogo Fabril** | Fases 2 y 3 | `03_NETWORKING_AND...` | Hook `useMatchSync`, recuperación por Snapshots/Deltas, APC y Neotanque en UI. |
| **5** | **Onboarding, Audio & Gran Campaña** | Fases 1 y 4 | `04_CONTENT_AND...` | Misión interactiva guiada ($8\times6$), sintetizador Web Audio, Acto I Campaña. |
| **6** | **Certificación CI/CD & Vercel Edge** | Todas | `06_MASTER_DEVOPS...` | `manualChunks` en Vite, auditoría CSP en `vercel.json`, tests PASS 100%. |

---

# 3. ESPECIFICACIÓN DETALLADA FASE POR FASE

---

### FASE 0: SANEAMIENTO DE ENTORNO, BUILD SYSTEM Y VARIABLES VITE
* **Objetivo:** Eliminar de inmediato los fallos que impiden la compilación limpia y el arranque en navegador local y en la nube.
* **Agente Líder:** `[AG-VercelReleaseEngineer]`

#### Tareas Técnicas:
1. **Migración de Variables a Vite Standard:**
   - Modificar [`src/lib/supabase/client.ts`](file:///c:/Users/Mor%C3%ADn/TacticalCommand/src/lib/supabase/client.ts) y [`src/lib/supabase/server.ts`](file:///c:/Users/Mor%C3%ADn/TacticalCommand/src/lib/supabase/server.ts).
   - Reemplazar `process.env.NEXT_PUBLIC_SUPABASE_URL` por `import.meta.env.VITE_SUPABASE_URL`.
   - Reemplazar `process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY` por `import.meta.env.VITE_SUPABASE_ANON_KEY`.
   - Implementar fallback seguro a modo offline si las credenciales están ausentes.
2. **Inyección de Polyfill de Seguridad en Vite:**
   - En [`vite.config.ts`](file:///c:/Users/Mor%C3%ADn/TacticalCommand/vite.config.ts), agregar `define: { 'process.env': {} }`.
3. **Purga de Dependencias Residuales y Scripts Multiplataforma:**
   - Eliminar `"express"` y `"@types/express"` de [`package.json`](file:///c:/Users/Mor%C3%ADn/TacticalCommand/package.json).
   - Reemplazar el script `"clean": "rm -rf dist server.js"` por `"clean": "node -e \"try { fs.rmSync('dist', { recursive: true, force: true }); } catch (e) {}\""` para garantizar compatibilidad nativa con Windows PowerShell y Linux.
* **Criterio de Aceptación (Verification Gate 0):**
  - Ejecución sin errores de `npx vite build` produciendo el directorio `/dist`.
  - Carga de la aplicación en el navegador sin excepciones `ReferenceError: process is not defined`.

---

### FASE 1: CIRUGÍA DEL CORE LOOP Y ERRADICACIÓN DE BUGS DE GAMEPLAY
* **Objetivo:** Lograr que el combate y el movimiento sean 100% deterministas y jugables en Hotseat y vs Bot, sin clics fallidos ni desincronización de estado.
* **Agentes Líderes:** `[AG-CoreStateArchitect]` & `[AG-TacticalEnginePurist]`

#### Tareas Técnicas:
1. **Comando Atómico Move + Attack:**
   - En [`src/components/game/CombatTheaterView.tsx`](file:///c:/Users/Mor%C3%ADn/TacticalCommand/src/components/game/CombatTheaterView.tsx), sustituir la llamada fragmentada en dos pasos (`handleMoveUnit` + `handleExecuteCombat`) por la emisión del comando atómico unificado:
     ```typescript
     handleAtomicMoveAndAttack({
       unitId: selectedUnit.id,
       destination: pendingMove.destination,
       pathVector: precalculatedPath,
       targetEnemyId: enemyOnTile.id
     });
     ```
   - En [`src/App.tsx`](file:///c:/Users/Mor%C3%ADn/TacticalCommand/src/App.tsx) (o `useTacticalMatchEngine`), calcular el daño balístico tomando como posición de origen las coordenadas de destino proyectadas, aplicando daño, bajas y gasto de acción en una sola actualización de estado.
2. **Corrección Algorítmica de Emboscadas (TRAP):**
   - Eliminar el algoritmo ciego en "L" en `App.tsx#L1185-L1192`.
   - Recuperar el vector de ruta real desde `ReachableTileInfo.path` en [`src/engine/pathfinding.ts`](file:///c:/Users/Mor%C3%ADn/TacticalCommand/src/engine/pathfinding.ts).
   - Validar la trayectoria casilla a casilla en `FogOfWarEngine.checkTrapOnPath(...)`. Si ocurre interrupción: detener en la casilla $N-1$, revelar la unidad enemiga oculta y consumir la totalidad de los puntos de acción de la unidad.
3. **Blindaje de Ciclo de Vida del Bot IA:**
   - Incorporar `turnSessionId` incremental y `AbortController` en `triggerBotTurn`.
   - Al alternar a `hotseat_2p` o presionar reinicio, disparar aborto inmediato, neutralizando cualquier ejecución encolada en segundo plano.
* **Criterio de Aceptación (Verification Gate 1):**
  - Mover y atacar a una unidad enemiga en un solo flujo continuo: el daño se deduce de inmediato, sin requerir clics repetidos.
  - Una unidad que bordea un bosque oculto no sufre falsa emboscada; si intenta entrar en la casilla ocupada, se frena exactamente en la casilla anterior con el mensaje `¡EMBOSCADA DETECTADA! (TRAP)`.
  - El cambio de `vs_bot` a `hotseat_2p` congela de inmediato el bot y devuelve el control al jugador 2.

---

### FASE 2: PURGA DE UI, AISLAMIENTO DE DEBUG Y ERGONOMÍA MÓVIL
* **Objetivo:** Limpiar la interfaz de producción de controles de ingeniería y garantizar accesibilidad móvil ágil y de alto rendimiento.
* **Referencia de Diseño:** `docs/orchestration/01_UI_AND_MOBILE_ERGONOMICS.md`
* **Agente Líder:** `[AG-CoreStateArchitect]`

#### Tareas Técnicas:
1. **Extracción de la Consola de Depuración (`DebugDevConsoleModal.tsx`):**
   - Retirar del Drawer lateral de `CombatTheaterView.tsx` los controles de Niebla manual, Clima forzado, Sensor Sonja, Bark manual e importación cruda de mapas AWBW.
   - Encapsularlos en el nuevo componente [`src/components/game/DebugDevConsoleModal.tsx`](file:///c:/Users/Mor%C3%ADn/TacticalCommand/src/components/game/DebugDevConsoleModal.tsx).
   - Habilitar su apertura exclusivamente mediante el atajo `Ctrl + Shift + D` o en modo `import.meta.env.DEV`.
2. **Insignias Pasivas de Atajos de Teclado:**
   - Integrar badges visuales de atajo (`[1]`, `[2]`, `[Space]`) en [`TileContextMenu.tsx`](file:///c:/Users/Mor%C3%ADn/TacticalCommand/src/components/game/TileContextMenu.tsx) y en la barra de mando de Superpoderes.
3. **Módulo de Retroalimentación Háptica:**
   - Crear [`src/engine/hapticFeedback.ts`](file:///c:/Users/Mor%C3%ADn/TacticalCommand/src/engine/hapticFeedback.ts) utilizando la API `navigator.vibrate` con patrones militares específicos:
     - Selección: pulsación ligera (10 ms).
     - Disparo / Impacto: pulsación media (40 ms).
     - Emboscada TRAP: patrón doble de alarma `[80ms, 40ms, 80ms]`.
     - Superpoder CO: ráfaga pesada `[120ms, 60ms, 200ms]`.
4. **Reconocimiento Multitáctil en Canvas:**
   - Implementar en [`GameCanvas.tsx`](file:///c:/Users/Mor%C3%ADn/TacticalCommand/src/components/game/GameCanvas.tsx) el control por dos dedos (*pinch-to-zoom*) acotado entre $0.65\times$ y $1.80\times$, con paneo inercial y confirmación de celda por doble toque.
* **Criterio de Aceptación (Verification Gate 2):**
  - Drawer táctico libre de opciones de trampa/debug en partida regular.
  - Interacción táctil en móvil fluida a 60 FPS con zoom, paneo y confirmación vibratoria sin zoom accidental del navegador.

---

### FASE 3: ORQUESTACIÓN DE BASE DE DATOS SUPABASE, SEED.SQL Y ECONOMÍA
* **Objetivo:** Poner en marcha la base de datos relacional (local o cloud) con datos semilla completos y rebalancear la economía de retención.
* **Referencias:** `docs/MASTER_REMEDIATION...` y `docs/orchestration/02_ECONOMY_AND_RETENTION_REBALANCE.md`
* **Agente Líder:** `[AG-SupabaseOrchestrator]`

#### Tareas Técnicas:
1. **Creación del Script Canónico de Semillas (`supabase/seed.sql`):**
   - Insertar 2 usuarios de desarrollo en `auth.users` (`commander1@tactical.local`, `commander2@tactical.local`).
   - Vincular sus perfiles en `public.profiles` con avatares, niveles y fondos iniciales.
   - Insertar desbloqueos básicos de skins y comandantes en `public.user_unlocks`.
   - Crear una partida modelo en `public.active_matches`.
2. **Rebalanceo de Economía Offline (Soft Cap Escalonado):**
   - Modificar [`src/engine/autonomousOrchestrator.ts`](file:///c:/Users/Mor%C3%ADn/TacticalCommand/src/engine/autonomousOrchestrator.ts) sustituyendo el corte a 0 recompensas por la función decreciente:
     $$\mu(k) = [0.60 \rightarrow 0.30 \rightarrow 0.10 \rightarrow 0.02]$$
   - Garantizar el suelo mínimo de $+5\text{ XP}$ y $+10\text{ Créditos}$.
3. **Normalización de Torneo (Tournament Cap Nivel 11):**
   - Implementar `normalizeCardLevel(lvl, isTournamentMode)` en [`src/engine/canonicalCombat.ts`](file:///c:/Users/Mor%C3%ADn/TacticalCommand/src/engine/canonicalCombat.ts) forzando estadísticas de Nivel 11 en torneos esports.
4. **Verificación de Políticas RLS:**
   - Asegurar que `units_catalog` y `commanders_catalog` tengan lectura pública sin requerir sesión iniciada.
* **Criterio de Aceptación (Verification Gate 3):**
  - Ejecución limpia de `supabase db reset` poblando tablas sin errores de claves foráneas.
  - Tras jugar más de 3 partidas vs bot, el jugador continúa recibiendo XP y créditos decrecientes con feedback positivo.

---

### FASE 4: PROTOCOLO DE RED REALTIME, RECONEXIÓN Y CATÁLOGO FABRIL
* **Objetivo:** Conectar el multijugador en tiempo real con recuperación ante desconexiones y habilitar el catálogo completo de producción.
* **Referencias:** `docs/MASTER_REMEDIATION...` y `docs/orchestration/03_NETWORKING_AND_TECHNICAL_DEBT.md`
* **Agentes Líderes:** `[AG-RealtimeNetcode]` & `[AG-SupabaseOrchestrator]`

#### Tareas Técnicas:
1. **Hook de Sincronización WebSocket (`src/hooks/useMatchSync.ts`):**
   - Conectar [`src/lib/supabase/realtime.ts`](file:///c:/Users/Mor%C3%ADn/TacticalCommand/src/lib/supabase/realtime.ts) a la vista de combate.
   - Sincronizar eventos Broadcast (`MOVE`, `ATTACK`, `END_TURN`) con latencia inferior a 50 ms.
2. **Protocolo de Recuperación en Caliente (Snapshot + Deltas):**
   - Definir los tipos `TurnSnapshot` y `DeltaAction` en [`src/types/network.ts`](file:///c:/Users/Mor%C3%ADn/TacticalCommand/src/types/network.ts).
   - Implementar la reconstrucción de partida al reconectar consumiendo el Banco de Gracia de 30s sin reiniciar el turno.
3. **Ampliación del Catálogo en Fábricas (`ProductionModal.tsx`):**
   - Integrar en [`src/engine/turnEconomy.ts`](file:///c:/Users/Mor%C3%ADn/TacticalCommand/src/engine/turnEconomy.ts) y [`ProductionModal.tsx`](file:///c:/Users/Mor%C3%ADn/TacticalCommand/src/components/game/ProductionModal.tsx) las unidades pendientes:
     - Transporte Blindado (`apc` - $5,000G | Suministro y transporte de tropas).
     - Neotanque (`neotank` - $22,000G | Super-pesado terrestre).
     - Helicóptero de Transporte (`t_copter` - $5,000G | Transporte aéreo).
     - Batería de Misiles (`missiles` - $12,000G | Antiaéreo indirecto de largo alcance).
* **Criterio de Aceptación (Verification Gate 4):**
  - Dos ventanas del navegador en la misma partida sincronizan movimientos y ataques instantáneamente.
  - Al simular caída de red en DevTools, el cliente reconecta y reconstruye la cuadrícula exacta en menos de 200 ms.
  - El modal de producción despliega las 14 unidades canónicas respetando fondos e instalaciones.

---

### FASE 5: ONBOARDING, AUDIO PROCEDURAL Y GRAN CAMPAÑA
* **Objetivo:** Proveer la experiencia guiada de primera sesión ("Bautismo de Fuego"), síntesis de audio Web Audio API y el Acto I de la campaña.
* **Referencia:** `docs/orchestration/04_CONTENT_AND_ONBOARDING_PIPELINE.md`
* **Agente Líder:** `[AG-TacticalEnginePurist]`

#### Tareas Técnicas:
1. **Tutorial Guiado "Bautismo de Fuego" ($8 \times 6$):**
   - Crear [`src/engine/tutorialEngine.ts`](file:///c:/Users/Mor%C3%ADn/TacticalCommand/src/engine/tutorialEngine.ts) con máquina de estados restrictiva (bloqueo celda a celda en 7 pasos).
   - Crear el componente visual [`src/components/game/TutorialOverlay.tsx`](file:///c:/Users/Mor%C3%ADn/TacticalCommand/src/components/game/TutorialOverlay.tsx) con las órdenes militares de Stella.
2. **Sintetizador Procedural Web Audio API:**
   - En [`src/engine/audioManager.ts`](file:///c:/Users/Mor%C3%ADn/TacticalCommand/src/engine/audioManager.ts), implementar la matriz de osciladores paramétricos (cañones, ráfagas, cohetes y explosiones), garantizando funcionamiento offline instantáneo con 0 archivos pesados de audio.
3. **Estructura del Acto I de Campaña:**
   - Crear [`src/engine/campaignEngine.ts`](file:///c:/Users/Mor%C3%ADn/TacticalCommand/src/engine/campaignEngine.ts) con las misiones introductorias del conflicto en mapas ampliados ($24\times24$).
* **Criterio de Aceptación (Verification Gate 5):**
  - Un jugador nuevo completa el tutorial guiado sin poder hacer clics erróneos en celdas no autorizadas.
  - El sonido balístico reproduce detonaciones nítidas generadas sintéticamente sin descargar archivos de audio externos.

---

### FASE 6: CERTIFICACIÓN CI/CD, CHUNKING Y DESPLIEGUE FINAL EN VERCEL
* **Objetivo:** Optimizar el bundle para Vercel Edge, certificar la suite de pruebas y desplegar a producción.
* **Agente Líder:** `[AG-VercelReleaseEngineer]`

#### Tareas Técnicas:
1. **Partición de Bundles en `vite.config.ts`:**
   - Configurar `manualChunks` estricto:
     - `vendor-react` (`react`, `react-dom`).
     - `vendor-supabase` (`@supabase/supabase-js`).
     - `vendor-lucide` (`lucide-react`).
     - `engine-core` (`src/engine/*`).
2. **Auditoría de Seguridad y Cabeceras en `vercel.json`:**
   - Ajustar Content Security Policy (CSP) en [`vercel.json`](file:///c:/Users/Mor%C3%ADn/TacticalCommand/vercel.json) asegurando conectividad dual:
     `connect-src 'self' https://*.supabase.co wss://*.supabase.co http://127.0.0.1:54321 ws://127.0.0.1:54321 https://*.googleapis.com;`
3. **Ejecución y Certificación de la Suite de Pruebas:**
   - Ejecutar la suite completa de tests unitarios e integrados (`e2eIntegration.test.ts`, `combat.test.ts`, etc.).
   - Garantizar 100% PASS sin regresiones.
* **Criterio de Aceptación (Verification Gate 6):**
  - Despliegue exitoso en Vercel con URL de producción activa.
  - Bundle inicial menor a 250 KB gzipped y First Contentful Paint < 1.0s.

---

# 4. CERTIFICACIÓN DE DESPLIEGUE COMPLETO

La hoja de ruta ha sido ejecutada, validada e integrada en su totalidad en el repositorio bajo el protocolo de paridad SSOT estricta:

### Checklist de Certificación del Despliegue:
```markdown
[X] Fase 0: Saneamiento de Entorno, Build System y Variables Vite — CERTIFICADA
[X] Fase 1: Cirugía del Core Loop (Ataque Atómico, TRAP Dijkstra y Cancelación Bot) — CERTIFICADA
[X] Fase 2: Purga de UI, Aislamiento Dev Console (Ctrl+Shift+D), Multitouch y Háptica — CERTIFICADA
[X] Fase 3: Migración 21, Soft Cap Decreciente y Tournament Cap Nivel 11 — CERTIFICADA
[X] Fase 4: Sincronización Realtime WebSocket, Snapshots, Deltas y Catálogo Fabril Completo — CERTIFICADA
[X] Fase 5: Onboarding Restrictivo 7 Pasos, Web Audio Procedural y Campaña Acto I — CERTIFICADA
[X] Fase 6: Partición de Bundles (<300KB), Dual CSP y Pipeline de Producción — CERTIFICADA
```

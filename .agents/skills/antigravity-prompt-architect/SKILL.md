---
name: antigravity-prompt-architect
description: Transforma ideas, requerimientos o descripciones de tareas de desarrollo de software en prompts altamente estructurados, viables y optimizados para Google Antigravity, Cursor, Windsurf y Claude Code. Calibrada específicamente para la arquitectura de 4 dominios (@domains/world, @domains/tactics, @domains/economy, @domains/game-feel, @shared), los 7 Pilares Canónicos y los oráculos deterministas de GEOTACTICS ONLINE.
---
# Antigravity Prompt Architect (v2.0 — GEOTACTICS Canonical Edition)

Convierte descripciones de funcionalidades, bugs, migraciones o arquitecturas en prompts de alta densidad semántica diseñados para disparar los flujos de trabajo nativos más eficientes en Google Antigravity. Prioriza el ahorro del presupuesto de atención (*context engineering*), el anclaje exacto a los **4 Dominios Funcionales (`@domains/*`) + `@shared`**, la protección de los **7 Pilares Canónicos** y el cierre mediante **oráculos deterministas**.

## When to Use

- El usuario quiere crear, estructurar o mejorar un prompt para desarrollar una funcionalidad, corregir un bug, refactorizar módulos o coordinar un enjambre de subagentes (`/teamwork`, `/goal`, `/plan`, `/boost`).
- El usuario describe una idea o requerimiento para **GEOTACTICS: ONLINE** y solicita el prompt óptimo para ejecutarlo sin romper la arquitectura modular ni las invariantes de diseño.

## Steps

### Paso 1: Clasificar la Tarea y Seleccionar el Disparador de Modo (Slash Command)

1. **Requisitos ambiguos o decisiones de diseño abiertas**: Usa `/plan /grill-me` para inspeccionar primero el repositorio y entrevistar al usuario antes de tocar código.
2. **Features multi-archivo o cambios estructurales**: Usa `/plan` para generar `implementation_plan.md` y pausar para revisión humana.
3. **Ejecución autónoma en bucle cerrado hasta 0 errores**: Usa `/goal` cuando los requisitos y los comandos de verificación (`npm run build`, `npm run test:all`, `npm run test:geotactics`) están claramente definidos.
4. **Bugs complejos, shaders WebGL o cuellos de botella**: Usa `/boost` para investigación profunda e hipótesis en paralelo.
5. **Auditorías masivas o refactorizaciones multi-dominio**: Usa `/teamwork` (o `/teamwork /goal`) desplegando subagentes aislados por dominio (`world`, `tactics`, `economy`, `game-feel`, `shared`).
6. **Validación visual en Chromium**: Añade `/browser` o invoca la skill `/game-qa-playtester` (`npm run test:qa`).

### Paso 2: Anclar Siempre a la Arquitectura Modular de 4 Dominios + Shared

Cuando el prompt sea para **GEOTACTICS: ONLINE**, ancla siempre las menciones `@` a las rutas modulares reales (nunca a las carpetas legacy `src/engine/*` o `src/components/*`):

- **Documento Rector (SSOT)**: `@docs/00_ARBOL_CANONICO_DE_SISTEMAS_Y_DESARROLLO.md`
- **Dominio 1 — Mundo, Cartografía WebGL & Asedios (`@domains/world`)**:
  - `@src/domains/world/index.ts`, `TacticalWorldMap.tsx`, `coordinates.ts`, `tacticalBitmap.ts`, `roadNetworkEngine.ts`, `spatialRoadIndex.ts`, `territorialSiegeOrchestrator.ts`, `politicalAliceEngine.ts`, `clanSystem.ts`.
  - Spec: `@docs/01_MASTER_CARTOGRAPHY_WEBGL_ZERO_RASTER.md`.
- **Dominio 2 — Motor Balístico 1–100 HP & Táctica (`@domains/tactics`)**:
  - `@src/domains/tactics/index.ts`, `canonicalCombat.ts`, `canonicalDamageChart.ts`, `coSystem.ts` (29 COs), `garrisonAIEngine.ts` (IA Nv. 1–5), `tacticalRtsEngine.ts`, `CombatTheaterView.tsx`, `GameCanvas.tsx`.
  - Spec: `@docs/05_MASTER_GAME_ENGINE_AND_NETWORKING.md`.
- **Dominio 3 — Economía, 10 Parcelas, Hangar 16 Tropas & P2P 2% (`@domains/economy`)**:
  - `@src/domains/economy/index.ts`, `industrialEngine.ts`, `strategicAndProductionEngine.ts`, `upkeepEngine.ts`, `turnEconomy.ts`, `UnitHangarModal.tsx`, `IndustrialComplexView.tsx`, `P2PMarketplaceView.tsx`.
  - Spec: `@docs/02_MASTER_METAGAME_INDUSTRY_ECONOMY.md`.
- **Dominio 4 — Bark Engine Cómic, Web Audio API & Háptica (`@domains/game-feel`)**:
  - `@src/domains/game-feel/index.ts`, `barkEngine.ts`, `audioManager.ts`, `hapticFeedback.ts`, `CommanderBarkWidget.tsx`, `CommanderLivingVignette.tsx`.
  - Spec: `@docs/03_MASTER_COMMANDERS_BARK_AND_SOCIAL.md`.
- **Capa Compartida & Base de Datos (`@shared` & `@supabase`)**:
  - `@src/shared/index.ts`, `@src/shared/types/metagame.ts`, `@src/shared/types/database.types.ts`, `@supabase/migrations/`, `@supabase/CONSOLIDATED_FULL_DATABASE_DEPLOY.sql`.
  - Spec: `@docs/04_MASTER_DATABASE_AND_SECURITY_SPEC.md`, `@docs/06_MASTER_DEVOPS_QA_AND_TELEMETRY.md`, `@docs/07_MASTER_UI_UX_WAR_ROOM.md`.

### Paso 3: Blindar las Restricciones con los 7 Pilares Canónicos

En la sección `## 4. Restricciones e Invariantes` de todo prompt de GEOTACTICS, incluye siempre el blindaje de los **7 Pilares Inmutables**:
1. **CERO CARTAS**: Almacén físico de **16 tropas máximo por jugador** (4 activas en vanguardia + 12 en reserva) y Doble Llave (Chasis + Fondos `$G`).
2. **Escala Balística 1 a 100 HP enteros**: Prohibida la escala legacy de 1–10 HP.
3. **Derrota por 0 Tropas**: Quedar con 0 unidades vivas en el tablero causa derrota inmediata e inapelable.
4. **Tiers T1 a T5 (+2% por tier)**: Bono horizontal estricto de `+0%` (T1) a `+8%` máximo (T5).
5. **Conquista de Capitales (`15,000 TCP`)**: Otorga Buff Regional de `+5%` en recursos/logística en la región (+ bonos hegemónicos nacionales).
6. **Muerte Permanente de Chasis y 35% Chatarra (`tech_scrap`)**: Toda baja no-F2P destruye el chasis físico y acredita el `35%` en `tech_scrap`.
7. **Human Handshake de 120s**: Ventana de 120 segundos para relevo humano PvP antes de activar la IA de Guarnición (Niveles 1 a 5).
8. **Mercado P2P al 2%**: Impuesto total del `2%` (`1%` quemado en Sink + `1%` regalía al Clan dueño del Hub regional) y bandas **VWAP Collar ±25%**.

### Paso 4: Estructurar el Prompt con la Plantilla de 5 Bloques

```markdown
[COMANDO SLASH: /plan | /plan /grill-me | /goal | /boost | /teamwork /goal]

## 1. Objetivo y Resultado Esperado (Goal & Target State)
[1-2 oraciones declarativas precisas que definan qué cambio arquitectónico o funcional debe lograrse y en qué dominio (`@domains/world`, `@domains/tactics`, `@domains/economy`, `@domains/game-feel`, `@shared`).]

## 2. Anclaje de Contexto (@Mentions & Grounding)
- **Archivos objetivo a modificar**: `@src/domains/<dominio>/...`
- **Barril público del dominio**: `@src/domains/<dominio>/index.ts`
- **Contratos y Especificación Canónica**: `@src/shared/types/metagame.ts`, `@docs/00_ARBOL_CANONICO_DE_SISTEMAS_Y_DESARROLLO.md`, `@docs/<SPEC_CORRESPONDIENTE>.md`

## 3. Protocolo de Ejecución por Fases (Execution Trajectory)
1. **Exploración (Read-Only)**: Inspecciona los archivos objetivo y verifica sus contratos en `@src/shared/types/metagame.ts`.
2. **Implementación Modular**: Aplica los cambios dentro del dominio correspondiente y re-exporta los símbolos públicos en su `index.ts`.
3. **Sincronización Documental**: Si cambia una interfaz o flujo, actualiza la especificación maestra correspondiente en `docs/`.

## 4. Restricciones e Invariantes (Strict Boundaries)
- **Frontera de Dominio**: Importa de otros dominios únicamente a través de `@domains/*` y `@shared` (prohibido importar desde carpetas legacy `src/engine/*` o `src/components/*`).
- **Invariantes de los 7 Pilares**: Respetar estrictamente 0 cartas / 16 tropas máx, escala 1-100 HP, derrota por 0 tropas, Tiers T1-T5 (+2%/tier, máx +8%), capitales +5% regional, pérdida física con 35% `tech_scrap`, Handshake de 120s y Mercado P2P con split del 2% (1% Sink + 1% Clan, VWAP Collar ±25%).

## 5. Bucle de Verificación Determinista y Criterio de Éxito
1. `npm run build` (Exit Code 0).
2. `npm run test:all` (13/13 suites deterministas aprobadas al 100%).
3. `npm run test:geotactics` (93/93 pruebas deterministas aprobadas al 100%).
4. Documentar la evidencia en `walkthrough.md`.
```

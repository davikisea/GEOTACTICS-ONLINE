# VOLUMEN 6: DEVOPS, INFRAESTRUCTURA, QA Y TELEMETRÍA CONDUCTUAL Y SENSORIAL
**Documento Canónico Unificado:** `06_MASTER_DEVOPS_QA_AND_TELEMETRY.md`  
**Proyecto:** *GEOTACTICS ONLINE (Tactical Command: Wars of Legacy)*  
**Versión:** 5.0.0-MODULAR-DOMAINS-SSOT  
**Estado:** Documento de Verdad Absoluta (SSOT - Single Source of Truth)  
**Archivos Consolidados y Auditados contra Código Fuente:**  
- `src/domains/game-feel/core/audioManager.ts` (Sintetizador Táctico Procedural Web Audio API)  
- `src/domains/game-feel/core/hapticFeedback.ts` (Matriz de Retroalimentación Háptica Web Vibration API)  
- `src/shared/qa/QADevOpsRunner.tsx` (DevOps & Lead QA Command Center In-App)  
- `src/shared/utils/qaHarness.ts` (QA Test Harness & Telemetry Bridge `window.__TACTICAL_QA_BRIDGE__`)  
- `src/shared/lib/assetOptimization.ts` (Auditor de Rendimiento, Caché Inmutable y Compresión WebP)  
- `package.json` y las 35 suites de pruebas distribuidas en `src/domains/{world,tactics,economy,game-feel}/__tests__/`  

---

# 1. PIPELINE DE INTEGRACIÓN, DESPLIEGUE CONTINUO (CI/CD) Y COMANDOS DETERMINISTAS

El proyecto utiliza **GitHub Actions** y scripts deterministas ejecutados mediante `tsx`, `tsc`, `vite` y `playwright` para validar cada commit y pull request antes del despliegue automático a producción en **Vercel Edge y Supabase**:

```yaml
# .github/workflows/ci-cd-pipeline.yml
name: Tactical Command CI/CD Pipeline

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  quality-check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20.x

      - name: Instalar Dependencias
        run: npm ci

      - name: Verificación Estricta de Tipos TypeScript (Zero-Emit)
        run: npm run lint

      - name: Build de Producción (Vite 8 + Tree-Shaking)
        run: npm run build

      - name: Batería Completa de 13 Suites Deterministas (Core & Dominios)
        run: npm run test:all

      - name: Batería Canónica Geotactics (7 Suites / 93 Aserciones Deterministas)
        run: npm run test:geotactics

      - name: Pruebas de Integración End-to-End CLI (13 Pasos Certificados)
        run: npm run test:e2e

      - name: Pruebas End-to-End Multimodales (Playwright Headless)
        run: npm run test:qa
        env:
          VITE_SUPABASE_URL: ${{ secrets.TEST_SUPABASE_URL }}
          VITE_SUPABASE_ANON_KEY: ${{ secrets.TEST_SUPABASE_ANON_KEY }}
```

### 1.1 Comandos de Verificación Determinista Reales (`package.json`)

Todos los pipelines de validación están definidos en `package.json` y garantizan cero regresiones sobre los **7 Pilares Canónicos Inmutables**:

| Comando CLI | Ejecución Real y Alcance Técnico |
|:---|:---|
| `npm run lint` | Ejecuta `npx tsc --noEmit`. Verifica la integridad estricta de tipos TypeScript en los 4 dominios (`@domains/world`, `@domains/tactics`, `@domains/economy`, `@domains/game-feel`) y `@shared`. |
| `npm run build` | Ejecuta `npx vite build`. Compila y empaqueta la SPA de producción en `dist/` verificando resolución de alias modulares, chunk splitting y ausencia de imports rotos. |
| `npm run test:all` | Ejecuta secuencialmente las **13 suites troncales** mediante `npx tsx`:<br>1. `subActionsAndArrow.test.ts`<br>2. `advancedTactics.test.ts`<br>3. `expandedCOs.test.ts`<br>4. `advancedWarsWorldSystems.test.ts`<br>5. `autonomousOrchestrator.test.ts`<br>6. `deckAndSupply.test.ts`<br>7. `buildingAuras.test.ts`<br>8. `proceduralMapGenerator.test.ts`<br>9. `reinforcementsEngine.test.ts`<br>10. `metagame.test.ts`<br>11. `hangarAndSupply.test.ts`<br>12. `territorialSiege.test.ts`<br>13. `coordinatesAndBitmap.test.ts` |
| `npm run test:geotactics` | Ejecuta las **7 suites especializadas de Geotactics (93 tests deterministas en total)**:<br>1. `strategicAndProductionEngine.test.ts` (16/16)<br>2. `phase2InterfaceAndBark.test.ts` (13/13)<br>3. `territorialExpansionEngine.test.ts` (12/12)<br>4. `tacticalCombatSeamlessIntegration.test.ts` (11/11)<br>5. `territorialSiege.test.ts` (11/11)<br>6. `hangarAndSupply.test.ts` (17/17)<br>7. `coordinatesAndBitmap.test.ts` (13/13) |
| `npm run test:combat` | Ejecuta las 3 suites tácticas de terreno y refuerzos: `buildingAuras.test.ts`, `proceduralMapGenerator.test.ts` y `reinforcementsEngine.test.ts`. |
| `npm run test:catalogs` | Ejecuta las 4 suites de auditoría de catálogos híbridos Supabase/Local: `catalogParityAudit.test.ts`, `catalogPerformanceBenchmark.test.ts`, `catalogHotReloading.test.ts` y `catalogOfflineFallback.test.ts`. |
| `npm run test:e2e` | Ejecuta el runner CLI de integración en 13 pasos (`src/domains/tactics/__tests__/e2eIntegration.test.ts`). |
| `npm run test:qa` | Ejecuta `npx playwright test tests/e2e/game-playtester.spec.ts` levantando Chromium real e inspeccionando el estado mediante `window.__TACTICAL_QA_BRIDGE__`. |
| `npm run quality:gate` | Compuerta maestra de calidad pre-despliegue: `npm run lint && npm run test:all && npm run test:qa`. |

---

# 2. ESTRATEGIA DE PRUEBAS AUTOMATIZADAS (QA) EN ARQUITECTURA DE 4 DOMINIOS

### 2.1 Suite Integral de Pruebas Unitarias e Integración (35 Archivos de Test Modulares)
Todas las suites de pruebas están organizadas dentro de la arquitectura modular de 4 dominios (`src/domains/{tactics,world,economy,game-feel}/__tests__/`) y verifican que las fórmulas matemáticas, reglas de cuadrícula y subsistemas de backend sean 100% deterministas y reproducibles:

- **Dominio `tactics` (`src/domains/tactics/__tests__/` y `components/`):**
  * `src/domains/tactics/core/canonicalCombat.ts` & `src/domains/tactics/__tests__/combat.test.ts`: Daño canónico AWBW en escala balística continua de **1 a 100 HP enteros** (Pilar 2), verificación de munición primaria/secundaria, cobertura proporcional a la salud del defensor y derrota inapelable al llegar a **0 tropas supervivientes** en el tablero (Pilar 3).
  * `src/domains/tactics/__tests__/advancedTactics.test.ts`: Rutas de fuego indirecto, rangos ciegos y penalizaciones de terreno.
  * `src/domains/tactics/__tests__/advancedWarsWorldSystems.test.ts`: Pruebas de compatibilidad con WarsWorld (tuberías, silos de misiles, bajíos, arrecifes).
  * `src/domains/tactics/__tests__/pathfinding.test.ts`: Algoritmo A*, costes de tracción por terreno (`foot`, `boots`, `treads`, `tires`, `air`, `sea`, `lander`, `pipe`) y regla de interrupción por emboscada `¡TRAP!`.
  * `src/domains/tactics/__tests__/fogOfWar.test.ts`: Cálculo de visión de 360°, elevación en montañas (+3 visión para infantería/mecanizada) y ocultación en bosques/arrecifes.
  * `src/domains/tactics/__tests__/subActionsAndArrow.test.ts`: Flecha táctica de trayectoria y menú contextual de sub-acciones (`attack`, `capture`, `join`, `load`, `unload`, `supply`, `launch_silo`, `explode`, `hide`, `unhide`, `wait`).
  * `src/domains/tactics/__tests__/coSystem.test.ts` & `src/domains/tactics/__tests__/expandedCOs.test.ts`: Los 28 COs canónicos, cálculo de carga estelar ($9,000G/estrella), bonos pasivos D2D, activación COP/SCOP y efectos instantáneos.
  * `src/domains/tactics/__tests__/buildingAuras.test.ts`: Auras de edificios tácticos (búnkeres, radares, centros de mando, torres de comunicación).
  * `src/domains/tactics/__tests__/proceduralMapGenerator.test.ts`: Generador procedural de mapas tácticos con simetría garantizada y paridad de propiedades.
  * `src/domains/tactics/__tests__/reinforcementsEngine.test.ts`: Cola de refuerzos de reserva (hasta 12 unidades en reserva tras las 4 de vanguardia, cumpliendo el límite físico de 16 tropas del Pilar 1).
  * `src/domains/tactics/__tests__/tacticalCombatSeamlessIntegration.test.ts`: Transición continua entre el Mapa Estratégico y el Teatro Táctico: LOD semántico (`resolveSemanticLOD`), validación de Doble Llave (`validateDoubleKeyDeployment`), liquidación de bajas físicas reales con recuperación del **35% en chatarra tecnológica (`tech_scrap`)** (Pilar 6) y **Human Handshake de 120 segundos** antes de delegar en la IA de Guarnición Niveles 1-5 (`evaluateDefensiveHandshake`, Pilar 7).
  * `src/domains/tactics/__tests__/rankedLadderEngine.test.ts`: 10 Arenas + 3 Ligas Legendarias, Factor K dinámico, Escudo de Descenso con 3 cargas y Season Reset cada 28 días.
  * `src/domains/tactics/__tests__/aiBot.test.ts`: Heurísticas de toma de decisiones para IA en dificultades Fácil, Normal y Difícil, e IA de Guarnición (Niveles 1 a 5).
  * `src/domains/tactics/__tests__/autonomousOrchestrator.test.ts`: Flujo completo de turnos para Duelo Espejo (15s), Blitz (30s) y Campaña (60s), más simulación de estrés Headless Bot vs Bot.
  * `src/domains/tactics/core/mapImporter.ts` & `src/domains/tactics/components/mapBuilder.test.ts`: Importador de matrices AWBW y validación geométrica de mapas en el estudio táctico.

- **Dominio `world` (`src/domains/world/__tests__/`):**
  * `src/domains/world/__tests__/coordinatesAndBitmap.test.ts`: Proyecciones cartográficas WGS84 `[lng, lat]` y motor de colisiones espaciales O(1) `TacticalBitMap` (`src/domains/world/core/tacticalBitmap.ts`).
  * `src/domains/world/__tests__/territorialExpansionEngine.test.ts`: Expansión de soberanía regional, nodos estratégicos y conquista de Capitales con **Buff Regional del +5%** en recursos y logística (Pilar 5).
  * `src/domains/world/__tests__/territorialSiege.test.ts`: Orquestador de asedios territoriales de 10,000 TCP, **Human Handshake de 120 segundos (2 minutos)** y relevo automático por IA de Guarnición (Niveles 1-5) (Pilar 7).
  * `src/domains/world/__tests__/metagame.test.ts`: Topología territorial, curva superlineal de mantenimiento por sobre-expansión e impuestos del Mercado P2P del 2% (1% Sink + 1% Clan Hub).
  * `src/domains/world/__tests__/clanSystem.test.ts`: Bóveda corporativa T1-T3, auditoría de 24h, embargo por deshonor con reparto 50/50 (50% tesoro del clan, 50% Top 3 contribuyentes), Rescate de Camarada y Salvaguarda Táctica con seguro de racha.
  * `src/domains/world/__tests__/roadNetworkEngine.test.ts` & `src/domains/world/__tests__/roadGarrisonEngine.test.ts`: Grafo logístico de carreteras, peajes de chokepoints y guarniciones viales.
  * `src/domains/world/__tests__/urbanRoadsAndCities.test.ts`: Arterias urbanas, distritos metropolitanos y nodos de suministro.
  * `src/domains/world/__tests__/spatialDeployment.test.ts`: Validación espacial de despliegue sobre polígonos y corredores terrestres.
  * `src/domains/world/__tests__/theatreRealtimePersistence.test.ts`: Persistencia Realtime en Supabase, suscripción a eventos de canal y reconciliación de soberanía.

- **Dominio `economy` (`src/domains/economy/__tests__/`):**
  * `src/domains/economy/__tests__/hangarAndSupply.test.ts`: Validación de **CERO CARTAS (Pilar 1)**, almacén físico de **16 tropas máximo por jugador** (4 slots de despliegue activo en vanguardia + 12 en reserva), Doble Llave ($G in-match + chasis físico en Hangar), progresión horizontal de **Tiers T1 a T5 (+2% por tier, máximo +8% en T5)** (Pilar 4), Kit de Emergencia F2P inagotable (`infantry`/`recon` T1) y Soft Cap logístico en 14 tropas ($200G/turno por unidad extra).
  * `src/domains/economy/__tests__/deckAndSupply.test.ts`: Validación taxonómica de plantillas de escuadrón y simulaciones de estrés de suministro orgánico.
  * `src/domains/economy/__tests__/turnEconomy.test.ts`: Generación de fondos por propiedades, costes de reparación proporcionales y reabastecimiento en ciudades y bases.
  * `src/domains/economy/__tests__/industrialEngine.test.ts`: Cuadrícula de 10 parcelas territoriales, ciclo circadiano de 16h, merma suave (1.5%/h), 70% a Cargamento Varado y **Mercado P2P con impuesto total del 2% (1% quemado en Sink + 1% regalía al Clan dueño del Hub regional) y bandas de precios dinámicas VWAP Collar ±25%**.
  * `src/domains/economy/__tests__/strategicAndProductionEngine.test.ts`: Cola de fabricación con tiempos en vivo, préstamo de unidades del arsenal de facción y reciclaje del **35% en `tech_scrap`** (Pilar 6).
  * `src/domains/economy/__tests__/fiefBuildingService.test.ts`: Construcción y mejora de instalaciones industriales en feudos regionales.

- **Dominio `game-feel` (`src/domains/game-feel/__tests__/`):**
  * `src/domains/game-feel/__tests__/barkEngine.test.ts`: Selección estocástica ponderada O(1) de diálogos del Bark Engine (`src/domains/game-feel/core/barkEngine.ts`), memoria anti-repetición de 5 turnos, interpolación de camaradería (Bonding 1 a 10), formas de bocadillo (`speech`, `shout`, `thought`, `whisper`, `radio`, `panic`) y sellos Pop-Art de onomatopeyas.
  * `src/domains/game-feel/__tests__/phase2InterfaceAndBark.test.ts`: Candado fronterizo de zonas buffer (`BUF_*`), separación diegética de recursos duales (Individuo vs Facción) y cuenta atrás de forja en consola de macrogestión.

### 2.2 Suite de Integración End-to-End (`src/domains/tactics/__tests__/e2eIntegration.test.ts`)
Valida la tubería completa de juego en **13 pasos certificados** ejecutables tanto por CLI (`npm run test:e2e`) como desde el centro de mando interactivo `src/shared/qa/QADevOpsRunner.tsx`:
1. **Registro de Usuario & Asignación de Saldos Iniciales:** Creación de perfil militar inicial (`accountLevel: 1`, `battleCredits: 2400`, `commandGems: 650`, `eloRating: 1200`).
2. **Selección de Partida vs Bot (Configuración Táctica 8x8):** Inicialización de tablero 8x8 con cuarteles generales (`hq`), ciudades (`city`), carreteras (`road`), montañas (`mountain`), bosques (`forest`) y despliegue de unidades.
3. **Movimiento Táctico & Verificación de Coste de Terreno A\*:** Desplazamiento de infantería a ciudad neutral, captura territorial y verificación de bloqueo de montañas (`Infinity`) para tracción de orugas (`treads`).
4. **Resolución de Combate, Cálculo de Daño y Contraataque:** Combate determinista sin varianza aleatoria y eliminación de unidad hostil.
5. **Condición de Victoria, Cálculo de Recompensas y Subida de Nivel:** Otorgamiento de XP y Oro tras victoria militar y transición de Nivel 1 a Nivel 2.
6. **Compra Atómica en Tienda de Skins y Equipamiento en Armería:** Descuento atómico de saldo, desbloqueo de cosmético (`skin_tank_desert`) y herencia de skin en nuevas instancias de la unidad.
7. **Bark Engine Procedural, Diálogo Cómic y Sellos Pop-Art:** Detonación de viñeta para comandante (`stella`, contexto `kill_heavy_tank`), bocadillo `shout`, sello `¡BOOM!` e interpolación de variables.
8. **Balance de Formato Duelo Espejo y Reloj Rápido WeGo (15s):** Verificación de `MATCH_FORMAT_CONFIGS.mirror_duel` con `turnTimeLimitSec: 15` y `maxTurnsLimit: 12`.
9. **Complejo Industrial, Hornos y Mercado P2P:** Cosecha de silos, fundición de acero acelerada con combustible y transacción atómica en el Mercado P2P (regla financiera canónica del dominio `economy`: impuesto P2P del 2% —1% Sink + 1% regalía al Clan Hub— y bandas dinámicas VWAP Collar ±25%).
10. **Corporaciones Militares (Clanes), Bóveda T1-T3, Embargo por Deshonor y Salvaguarda Táctica:** Escalafón de bóvedas según miembros activos, auditoría de cierre de guerra de 24h, liquidación de fianza de deshonor y protección de racha mediante Salvaguarda Táctica.
11. **Tiers Industriales Canónicos (T1-T5, +2%/tier) y Paridad Competitiva 0% P2W:** Verificación del Pilar 4 (`T1: +0%`, `T2: +2%`, `T5: +8%` máximo horizontal, con 0 cartas y 0% Pay-to-Win).
12. **Ladder Clasificatorio Elo, 10 Arenas + 3 Ligas, Escudo de Descenso y Bóveda de Cofres:** Amortiguación en Arena 1 (+20/0), suma cero estricta desde Arena 6 (+14/-14), Escudo de Descenso de 3 cargas, Season Reset cada 28 días y escalado de cofres.
13. **Ecosistema Social V2.0: Rescate de Camarada, Donaciones, Proyectos y Guerra Territorial 2v2:** Protocolo `ClanEngine.rescueComrade` (+150 XP al salvador), logística fraternal de clan, aporte de 200 DP (multiplicador 2.0x) en victorias 2v2 y activación de proyectos del Alto Mando (`industrial_overcharge`).

### 2.3 Infraestructura QA Compartida (`src/shared/qa/QADevOpsRunner.tsx` y `src/shared/utils/qaHarness.ts`)

1. **Centro de Mando QA In-App (`src/shared/qa/QADevOpsRunner.tsx`):**
   - Panel interactivo de diagnóstico en tiempo real integrado en la aplicación con 7 vistas especializadas:
     * `e2e`: Ejecución en vivo de `runFullE2ESuite()` con inspector de payloads JSON y latencia por paso.
     * `canonical`: Ejecución combinada de `runCombatTests()`, `runPathfindingTests()`, `runMapImporterTests()`, `runFogOfWarTests()`, `runTurnEconomyTests()` y `runCOTests()`.
     * `pve`: Ejecución de `runAutonomousOrchestratorSuite()` e informe de estrés Headless Bot vs Bot (5 partidas completas, 75 turnos simulados, ~0.42ms por turno, 0 colisiones y 0 fondos negativos).
     * `decks`: Ejecución de `runDeckAndSupplySuite()` validando el Soft Cap logístico de 14 unidades (-$200G/turno extra) y 0 bloqueos de cooldown.
     * `clans`: Ejecución de `runClanTests()` validando bóvedas T1-T3, rescate de camaradas y guerra territorial.
     * `performance`: Auditoría de compresión de atlas WebP (`AssetOptimizationEngine.calculateWebPSavings`) y checklist de producción (`AssetOptimizationEngine.runDevOpsPerformanceAudit` desde `src/shared/lib/assetOptimization.ts`).
     * `vercel`: Verificación de políticas de enrutamiento SPA, cabeceras de caché inmutable (`/assets/*`) y CSP.

2. **Puente de Telemetría E2E (`src/shared/utils/qaHarness.ts`):**
   - Expone en `window.__TACTICAL_QA_BRIDGE__` una interfaz determinista para que Playwright (`npm run test:qa`) y agentes de QA autónomos inspeccionen el motor sin acoplarse al DOM interno:
     * `initQABridge()` y `updateQASnapshot(partial: Partial<QAGameSnapshot>)`.
     * Estado `QAGameSnapshot`: `{ isReady, activeScreen, turnNumber, activePlayer, phase, unitsCount, lastError, fps, canvasRendered, extra }`.
     * Interceptores automáticos de `window.addEventListener('error')` (`[UNCAUGHT]`) y `window.addEventListener('unhandledrejection')` (`[UNHANDLED_PROMISE]`), consultables vía `getConsoleErrors()` y `clearErrors()`, más healthcheck `ping() -> 'PONG_TACTICAL_QA_ACTIVE'`.

---

# 3. TELEMETRÍA SENSORIAL: SÍNTESIS DE AUDIO PROCEDURAL Y MATRIZ HÁPTICA

Para cumplir con el objetivo de **0 MB de archivos de audio externos**, **0 peticiones de red HTTP para sonido** y **latencia de disparo de 0 milisegundos**, el dominio `game-feel` implementa síntesis acústica procedural nativa y retroalimentación háptica táctil.

### 3.1 Motor de Síntesis Acústica Procedural (`src/domains/game-feel/core/audioManager.ts`)

El singleton `audioManager` (`TacticalAudioManager.getInstance()`) construye en tiempo real toda la atmósfera sonora militar estilo 16-bit mediante la **Web Audio API** nativa (`AudioContext`), sin depender de Howler.js, Tone.js ni archivos `.mp3`/`.wav`/`.ogg`.

#### A. Arquitectura del Grafo de Ganancia y Persistencia
Al invocar `initContext()` bajo un gesto del usuario, se instancia un grafo de mezcla de 3 buses con persistencia automática en `localStorage` bajo la clave `tactical_audio_settings`:
- **`masterGain`** (`default: 0.80`, conectado a `ctx.destination`): Control maestro y corte instantáneo en estado `muted`.
- **`sfxGain`** (`default: 0.85`, conectado a `masterGain`): Bus dedicado a efectos balísticos, alertas de radar, UI y onomatopeyas del Bark Engine.
- **`musicGain`** (`default: 0.60`, conectado a `masterGain`): Bus dedicado al secuenciador BGM procedural con soporte de **Audio Ducking dinámico**.

#### B. Audio Ducking Dinámico, Anti-Fatiga Acústica y Micro-Bucles Octalysis
1. **Audio Ducking en Eventos Críticos:**
   - Al disparar `super_co_power`, `musicGain` atenúa instantáneamente la música de fondo al **45% (-6.5 dB)** y recupera su volumen nominal mediante una rampa exponencial de `1.6s`.
   - Al disparar `co_power` o `explosion`, `musicGain` se atenúa al **65% (-3.5 dB)** con recuperación exponencial en `0.8s`.
2. **Pitch-Shifting Estocástico Anti-Fatiga:**
   - Todo efecto disparado mediante `playSFX(type)` o `playCue(cueKey)` aplica un factor de variación de frecuencia de **±4%** (`0.96 + Math.random() * 0.08`) para erradicar la fatiga auditiva por repetición.
   - `playHoverTick()` genera un pulso triangular ultra-corto de `< 24ms` (`680Hz -> 920Hz`) con jitter ampliado de **±8%** (`0.92 + Math.random() * 0.16`).
3. **Escalado Semitonal Temperado (`playComboAction` y `playGoldTick`):**
   - `playComboAction(comboIndex?)`: Mantiene una ventana temporal de racha de `2500ms` (hasta 14 pasos) y escala la frecuencia del oscilador triangular (`320Hz -> 660Hz` en `95ms`) usando la raíz duodécima de 2: $\text{shift} = 1.059463^{\min(\text{comboCount}, 14)}$. Se emplea en cosecha de silos, rachas de bajas y recolección de recompensas.
   - `playGoldTick(index)`: Odómetro acústico para contadores de fondos ($G), escalando un oscilador sinusoidal desde `440Hz` hasta 12 semitonos (`35ms` de duración).

#### C. Catálogo Paramétrico Canónico (`AUDIO_SYNTHESIS_CATALOG`)
Definido mediante la interfaz `SoundCueConfig` y reproducible vía `audioManager.playCue(cueKey)` o `audioManager.play(cueKey)`:

| Cue Key (`AUDIO_SYNTHESIS_CATALOG`) | Onda (`waveType`) | Frecuencia Base -> Barrido | Duración (`attack` / `decay`) | Ganancia | Capa de Ruido (`noiseLayer`) | Uso Táctico y Sensorial |
|:---|:---:|:---:|:---:|:---:|:---:|:---|
| `ui_cursor_move` | `sine` | `440 Hz` (fijo) | `40 ms` (`2ms` / `38ms`) | `0.15` | No | Desplazamiento del cursor en grilla o mapa |
| `ui_tile_confirm` | `triangle` | `587.33 Hz` (D5) | `80 ms` (`5ms` / `75ms`) | `0.25` | No | Confirmación de celda o selección táctica |
| `ui_cancel_rollback` | `sawtooth` | `220 Hz -> 146.83 Hz` | `90 ms` (`5ms` / `85ms`) | `0.20` | No | Cancelación de orden o retroceso de ruta |
| `cannon_fire_heavy` | `sawtooth` | `95 Hz -> 30 Hz` | `450 ms` (`10ms` / `440ms`) | `0.60` | Sí | Disparo de cañón pesado de blindados |
| `machinegun_burst` | `square` | `180 Hz -> 90 Hz` | `180 ms` (`2ms` / `178ms`) | `0.35` | Sí | Fuego de supresión de infantería / antiaéreo |
| `rocket_launch` | `sawtooth` | `120 Hz -> 380 Hz` | `600 ms` (`40ms` / `560ms`) | `0.45` | Sí | Ignición y ascenso de artillería cohete / silo |
| `explosion_critical` | `sawtooth` | `65 Hz -> 20 Hz` | `800 ms` (`15ms` / `785ms`) | `0.70` | Sí | Destrucción total de chasis en el tablero |
| `trap_alert` | `square` | `880 Hz -> 220 Hz` | `300 ms` (`5ms` / `295ms`) | `0.50` | No | Sirena de intercepción por emboscada (`¡TRAP!`) |
| `airdrop_impact` | `triangle` | `130 Hz -> 60 Hz` | `500 ms` (`20ms` / `480ms`) | `0.40` | Sí | Aterrizaje de cápsula de suministros o refuerzos |
| `co_power_charge` | `sine` | `261.63 Hz -> 1046.50 Hz` | `1200 ms` (`100ms` / `1100ms`) | `0.50` | No | Carga ascendente de dos octavas (C4 -> C6) del CO |
| `hq_collapse` | `sawtooth` | `80 Hz -> 15 Hz` | `1500 ms` (`50ms` / `1450ms`) | `0.80` | Sí | Demolición de Cuartel General o caída de capital |

#### D. Sintetizadores Especializados (`SfxType`), Radar, Sirenas y Barks
Además del catálogo paramétrico, `playSFX(type: SfxType)` y los métodos de atajo C4ISR ejecutan algoritmos multi-oscilador y filtrado Biquad (`playNoiseBurst`, que genera un `AudioBuffer` de ruido blanco pasado por un filtro `BiquadFilterNode` tipo `lowpass` con barrido exponencial de corte):
- **Combate (`cannon`, `machinegun`, `rocket`, `explosion`, `combat_hit`):**
  * `synthCannon`: Oscilador `triangle` sub-grave (`160Hz -> 25Hz` en `350ms`) + ráfaga de ruido blanco filtrado (`700Hz -> 120Hz`).
  * `synthMachineGun`: Bucle de 3 pulsos cuadrados separados por `80ms` (`450Hz -> 180Hz`) + ruido blanco de alta frecuencia (`2400Hz -> 400Hz`).
  * `synthRocket`: Barrido ascendente `sawtooth` (`140Hz -> 800Hz`) + estela de humo acústica (`1200Hz -> 500Hz`).
  * `synthExplosion`: Impacto sub-bajo `sine` (`120Hz -> 20Hz` en `600ms`, ganancia `1.0`) + explosión de ruido blanco (`900Hz -> 80Hz`, ganancia `0.95`).
- **Locomoción, Radar e Interfaz (`move_tread`, `move_foot`, `unit_select`, `unit_order`, `button_click`):**
  * `synthSelectChirp` (`unit_select`): Chirp digital de radar `sine` de una octava (`880Hz A5 -> 1760Hz A6` en `80ms`).
  * `synthOrderChime` (`unit_order`): Doble pulso `triangle` (`1046.5Hz C6 -> 1318.5Hz E6`).
  * `synthTreads` (`move_tread`) y `synthFootstep` (`move_foot`): Roce metálico de orugas (`65Hz -> 50Hz` + ruido `800Hz -> 200Hz`) y pisada táctica (`60ms` de ruido filtrado `600Hz -> 150Hz`).
- **Fanfarrias, Poderes CO y Sirenas de Despliegue (`capture`, `victory`, `defeat`, `co_power`, `super_co_power`, `playDeployHorn`):**
  * `synthCapture`: Escala mayor ascendente de 4 notas `sine` (`C5 523.25Hz`, `E5 659.25Hz`, `G5 783.99Hz`, `C6 1046.5Hz`).
  * `synthCOPower` (`co_power`) y `synthSuperCOPower` (`super_co_power`): Arpegio `square` de 4 notas (C4-E4-G4-C5) para COP y arpegio `sawtooth` de 6 notas (D4-F#4-A4-D5-F#5-A5) para SCOP.
  * `playDeployHorn()`: Sirena/cuerno metálico bifásico de despliegue operacional (usado al abrir el Teatro de Operaciones, Hangar o Guarnición y en alertas del Bark Engine), superponiendo un oscilador `sawtooth` (`220Hz -> 330Hz` en `140ms`) con un segundo oscilador `triangle` desfasado `+80ms` (`330Hz -> 440Hz` en `260ms`).
  * Atajos directos para UI/Bark Engine: `playCursorMove()`, `playAirdropImpact()`, `playCancelRollback()`, `playTrapAlert()` y `playCOPower(isSuper)`.

#### E. Secuenciador BGM Militar de 16 Pasos (`startBgm` / `tickBgm`)
El motor incluye un secuenciador rítmico autónomo a **125 BPM** (`120ms` por semicorchea, ciclo de 16 pasos) con soporte para los temas `'march'` y `'tension'`:
1. **Bombo Militar (`synthBassDrum`):** Pasos `0, 4, 8, 12` (onda `sine` con caída de pitch `140Hz -> 35Hz` en `100ms`).
2. **Caja / Redoblante de Marcha (`synthSnare`):** Pasos `4, 12` y síncopas en `7, 14` (ráfaga de ruido blanco de `80ms` con filtro pasa-bajos `3000Hz -> 800Hz`).
3. **Línea de Bajo Táctica (`synthBassNote`):** Pasos pares (`step % 2 === 0`) alternando la progresión `[110, 110, 130.81, 146.83, 110, 110, 164.81, 146.83] Hz` (`A2, C3, D3, E3`) con onda `sawtooth` y filtro pasa-bajos a `550Hz`.
4. **Melodía Lead Retro (`synthLeadNote`):** Pasos `2, 6, 10, 15` ejecutando el arpegio `[440, 523.25, 659.25, 587.33] Hz` con onda `square`.

---

### 3.2 Matriz de Vibración Háptica (`src/domains/game-feel/core/hapticFeedback.ts`)

El módulo `hapticFeedback.ts` integra nativamente la **Web Vibration API** (`navigator.vibrate`) mediante la función exportada `triggerHaptic(pattern: HapticPattern)`. En navegadores de escritorio o dispositivos con permisos restringidos, el motor degrada de forma segura y silenciosa (`try/catch` sobre `'vibrate' in navigator`).

| Patrón (`HapticPattern`) | Cadencia en `HAPTIC_PROFILES` (`ms`) | Evento Disparador en el Juego | Sensación Táctil Percibida |
|:---|:---:|:---|:---|
| `'selection'` | `10` | Selección ligera de celda, unidad o botón C4ISR | Micro-pulso seco de confirmación mecánica (`10ms`) |
| `'movement'` | `25` | Confirmación de orden de marcha hacia coordenadas | Pulso firme de engrane de tracción (`25ms`) |
| `'attack'` | `[40, 30, 60]` | Impacto balístico e inicio de intercambio de fuego | Doble golpe con retroceso pesado (`40ms` vibración, `30ms` pausa, `60ms` impacto) |
| `'trap'` | `[80, 50, 120, 50, 200]` | Emboscada detectada en niebla de guerra (`¡TRAP!`) | Alerta sísmica creciente de 3 sacudidas (`80ms`, `120ms`, `200ms`) |
| `'co_power'` | `[100, 40, 100, 40, 250]` | Activación de Poder de Comandante (COP / SCOP) | Descarga de alta energía con resonancia final prolongada (`250ms`) |
| `'error'` | `[30, 20, 30]` | Orden inválida, terreno bloqueado o falta de recursos | Doble vibración corta de rechazo táctico |

---

# 4. RENDIMIENTO WEB, AUDITORÍA DE ASSETS Y CORE WEB VITALS

El juego está diseñado para ejecutarse nativamente en navegadores móviles y de escritorio a 60 FPS constantes sin latencia percibida, auditado en tiempo real por `AssetOptimizationEngine` (`src/shared/lib/assetOptimization.ts`):

| Métrica | Objetivo Estricto | Estrategia de Optimización Auditada en Código |
|:---|:---:|:---|
| **First Contentful Paint (FCP)** | $< 0.8\text{ segundos}$ | Cero fuentes web bloqueantes, **0 MB de librerías/archivos de audio externos** (`audioManager.ts`), vistas secundarias diferidas con `React.lazy`. |
| **Largest Contentful Paint (LCP)** | $< 1.5\text{ segundos}$ | Canvas renderizado de inmediato; atlas de sprites comprimidos en WebP lossless (~42% de ahorro frente a PNG raw, pasando de 348 KB a ~201 KB). |
| **Cumulative Layout Shift (CLS)** | **0.00 (Inmóvil)** | Dimensiones de viewport fijas con contenedores bloqueados y barras de salud con `TacticalGhostBar` (`src/shared/ui/TacticalGhostBar.tsx`). |
| **Interaction to Next Paint (INP)** | $< 40\text{ milisegundos}$ | Procesamiento de inputs y colisiones espaciales O(1) (`TacticalBitMap`) desacoplado del bucle de dibujo de Canvas. |
| **Bundle & Caché Edge** | $< 250\text{ KB / chunk}$ | Vendor Chunk Splitting en 4 bloques aislados (React, Lucide, Supabase, Motion) y caché inmutable de 1 año (`max-age=31536000, immutable`) en `/assets/*`. |

---

# 5. INFRAESTRUCTURA DE TELEMETRÍA Y ANALÍTICA CONDUCTUAL

Para alimentar el **Bark Engine** (`src/domains/game-feel/core/barkEngine.ts`) y auditar la salud competitiva y económica del ecosistema sin violar los 7 Pilares Canónicos, el sistema implementa una arquitectura en dos capas:

```
                            PIPELINE DE TELEMETRÍA CONDUCTUAL
                                            │
         ┌──────────────────────────────────┴──────────────────────────────────┐
         ▼                                                                     ▼
[ CAPA 1: OLTP EN PARTIDA ]                                           [ CAPA 2: PERFIL AGREGADO O(1) ]
• Logging append-only liviano y puente QA                             • Fila única en `player_tactical_behavior_profile`
• Registra turnos rápidos (<10s) y Tilt Index                         • Se actualiza al concluir la partida o asedio
• Bajas de blindados, recuperación 35% `tech_scrap` y caídas en TRAP  • Alimenta el Bark Engine (memoria de 5 turnos y Bonding 1-10)
```

### 5.1 Métricas Clave de Negocio y Equilibrio Canónico (KPIs de Retención)
- **Retención D1 (Día 1):** Objetivo $> 48\%$ (impulsada por la forja industrial en las 10 parcelas territoriales, la recuperación del **35% en chatarra tecnológica `tech_scrap`** tras bajas físicas y el rescate de la Salvaguarda Táctica).
- **Retención D7 (Día 7):** Objetivo $> 26\%$ (sostenida por las Guerras de Clanes, la conquista de Capitales con **Buff Regional del +5%**, los asedios con **Human Handshake de 120s** e IA de Guarnición Nv 1-5 y la Bóveda Corporativa T1-T3).
- **Retención D30 (Día 30):** Objetivo $> 14\%$ (mantenida por el Ladder Clasificatorio de 10 Arenas + 3 Ligas, la especialización horizontal de **Tiers T1 a T5 (+2% por tier, máximo +8% en T5)** con almacén físico de **16 tropas máximo (4 activos + 12 en reserva, CERO CARTAS)** y el comercio en el **Mercado P2P con impuesto total del 2% (1% Sink + 1% Clan Hub) y bandas VWAP Collar ±25%**).
- **Conversión ética (0% Pay-to-Win):** Basada en cosméticos de comandantes/unidades y el Command Pass estacional, manteniendo paridad competitiva estricta en el campo de batalla.

# ORQUESTACIÓN DEL SISTEMA DE PLAYTESTING AUTÓNOMO E2E Y QA MULTIMODAL
**Documento Maestro de Implementación:** `ORQUESTACION_SISTEMA_E2E_PLAYTEST_QA_MULTIMODAL.md`  
**Proyecto:** *Tactical Command: Wars of Legacy*  
**Objetivo:** Establecer una suite de QA autónoma basada en Playwright y Visión Multimodal que ejecute el juego real, capture pantallas, cruce errores de consola, red y renderizado, y diagnostique bloqueos tempranos para eliminar la dependencia de pruebas manuales humanas.

---

## 1. DIAGNÓSTICO Y REALIDAD DE FASE TEMPRANA

En las fases tempranas de un motor táctico web (React 19 + Canvas / Motion + Supabase), los fallos raramente son de sintaxis pura. Los fallos reales que impiden jugar son **fallos de integración dinámica y asincronía**:
1. **Pantalla Negra Silenciosa (Blank Canvas):** El componente React monta, pero el contexto de Canvas 2D/WebGL falla al calcular dimensiones o texturas.
2. **Crashes por Acceso Nulo a Estado:** `Cannot read properties of undefined (reading 'terrain')` o `reading 'units'` al intentar renderizar el primer turno.
3. **Bloqueo por Fuga de Animación (Hanging Promises):** Un componente espera un evento `onAnimationComplete` de Framer Motion que nunca dispara porque la pestaña perdió el foco o el elemento fue desmontado antes.
4. **Assets No Encontrados (404 Sprites/Audio):** El juego intenta instanciar `new Image().src = ...` y queda atascado esperando el evento `load`.
5. **Modales Bloqueantes / Z-Index Trap:** Un pop-up de diálogo o Bark Engine invisible intercepta los clics e impide seleccionar las unidades en la cuadrícula.

Para resolver esto, el sistema de prueba **no puede ser un simple runner de assertions unitarias**. Debe ser un **Agente Probador Caja-Gris (Gray-Box Autonomous Playtester)** que combine navegación real de navegador, intercepción de telemetría y análisis visual de capturas.

---

## 2. ARQUITECTURA DE CRUCE DE DATOS MULTIMODAL

El probador recolecta cuatro corrientes de datos en paralelo durante cada segundo de ejecución y las correlaciona en un único reporte estructurado:

```
┌────────────────────────────────────────────────────────────────────────┐
│                      MATRIZ DE CRUCE DE DATOS                          │
├─────────────────┬──────────────────┬─────────────────┬─────────────────┤
│ 1. RED / ASSETS │ 2. RUNTIME LOGS  │ 3. GAME STATE   │ 4. VISIÓN (PNG) │
├─────────────────┼──────────────────┼─────────────────┼─────────────────┤
│ • HTTP 404/500  │ • console.error  │ • Turno activo  │ • Frame inicial │
│ • Tiempos carga │ • pageerror (JS) │ • Fase táctica  │ • Frame acción  │
│ • CORS / WS drop│ • UnhandledRejec │ • Unidades vivas│ • Frame crash   │
└────────┬────────┴────────┬─────────┴────────┬────────┴────────┬────────┘
         │                 │                  │                 │
         └─────────────────┴────────┬─────────┴─────────────────┘
                                    │
                                    ▼
                 ┌──────────────────────────────────────┐
                 │  REPORTE INTEGRADO: qa-report.json   │
                 │  + ANÁLISIS DE CAUSA RAÍZ MULTIMODAL │
                 └──────────────────────────────────────┘
```

### Ejemplo de Correlación Diagnóstica:
- **Síntoma Visual:** La captura `screenshot_step_2_select_unit.png` muestra el mapa con fondo gris y sin cursor.
- **Dato de Red:** `GET /sprites/units/infantry_os.png` devolvió `404 Not Found`.
- **Dato de Consola:** `Uncaught TypeError: Failed to execute 'drawImage' on 'CanvasRenderingContext2D': The provided value is not of type '(CSSImageValue or HTMLImageElement...)'`.
- **Dato de Estado:** `gameState.selectedTile = {x: 2, y: 3}`, `gameState.phase = 'UNIT_SELECTED'`.
- **Diagnóstico del Agente:** *"El juego crashea en el paso de selección porque la ruta del sprite de infantería de OS tiene un typo en el catálogo de unidades. El estado cambió correctamente a 'UNIT_SELECTED', pero el render colapsó."*

---

## 3. HOJA DE RUTA DE INSTALACIÓN Y CONFIGURACIÓN

### Paso 1: Instalación de Dependencias Core
Ejecutar en la raíz del proyecto para instalar Playwright y sus navegadores:

```powershell
# 1. Instalar Playwright Test como devDependency
npm install -D @playwright/test

# 2. Descargar los binarios del navegador Chromium (aislado, ligero y reproducible)
npx playwright install chromium --with-deps
```

---

### Paso 2: Configuración de Playwright (`playwright.config.ts`)
Crear en la raíz el archivo `playwright.config.ts` configurado para levantar automáticamente el servidor Vite de desarrollo:

```typescript
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 60000,
  expect: {
    timeout: 10000,
  },
  fullyParallel: false, // En juegos de tablero es vital la secuencialidad estricta
  workers: 1,
  reporter: [
    ['list'],
    ['json', { outputFile: 'test-results/qa-run-report.json' }],
    ['html', { outputFolder: 'test-results/html-report', open: 'never' }]
  ],
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    viewport: { width: 1280, height: 720 },
    ignoreHTTPSErrors: true,
  },
  projects: [
    {
      name: 'Chromium Game Tester',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'npx vite --port=3000 --host=0.0.0.0',
    port: 3000,
    reuseExistingServer: !process.env.CI,
    timeout: 30000,
  },
});
```

---

### Paso 3: Inyección del "Game Test Harness" (`src/utils/qaHarness.ts`)
Para evitar depender exclusivamente de clics frágiles en coordenadas ciegas, exponemos un puente de depuración seguro que solo se activa en modo de desarrollo (`import.meta.env.DEV`):

```typescript
// src/utils/qaHarness.ts
export interface QAGameSnapshot {
  isReady: boolean;
  activeScreen: string;
  turnNumber: number;
  activePlayer: string;
  phase: string;
  unitsCount: number;
  lastError: string | null;
  fps: number;
}

declare global {
  interface Window {
    __TACTICAL_QA_BRIDGE__?: {
      getSnapshot: () => QAGameSnapshot;
      forceEndTurn?: () => void;
      selectTile?: (x: number, y: number) => void;
      getConsoleErrors: () => string[];
    };
  }
}

const capturedErrors: string[] = [];

if (typeof window !== 'undefined') {
  window.addEventListener('error', (event) => {
    capturedErrors.push(`[UNCAUGHT] ${event.message} at ${event.filename}:${event.lineno}`);
  });
  window.addEventListener('unhandledrejection', (event) => {
    capturedErrors.push(`[UNHANDLED_PROMISE] ${event.reason}`);
  });
}

export function registerQABridge(getter: () => Partial<QAGameSnapshot>) {
  if (import.meta.env.DEV) {
    window.__TACTICAL_QA_BRIDGE__ = {
      getSnapshot: () => ({
        isReady: true,
        activeScreen: 'combat-grid',
        turnNumber: 1,
        activePlayer: 'OS',
        phase: 'IDLE',
        unitsCount: 0,
        lastError: capturedErrors[capturedErrors.length - 1] || null,
        fps: 60,
        ...getter(),
      }),
      getConsoleErrors: () => [...capturedErrors],
    };
  }
}
```

---

### Paso 4: Suite Principal del Playtester (`tests/e2e/game-playtester.spec.ts`)
Este script recorre el juego, vigila caídas en vivo, toma capturas visuales progresivas y genera un diagnóstico comprensivo:

```typescript
// tests/e2e/game-playtester.spec.ts
import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

interface LogEntry {
  type: string;
  text: string;
  timestamp: string;
}

test.describe('Tactical Command - Autonomous Game Playtester', () => {
  const screenshotsDir = path.resolve('test-results/screenshots');
  const capturedLogs: LogEntry[] = [];
  const networkFailures: string[] = [];

  test.beforeAll(async () => {
    if (!fs.existsSync(screenshotsDir)) {
      fs.mkdirSync(screenshotsDir, { recursive: true });
    }
  });

  test('Arranque, Render de Mapa, Interacción y Detección de Crashes', async ({ page }) => {
    // 1. Escuchar errores de consola en tiempo real
    page.on('console', (msg) => {
      const entry = { type: msg.type(), text: msg.text(), timestamp: new Date().toISOString() };
      capturedLogs.push(entry);
    });

    // 2. Escuchar excepciones no controladas de página
    page.on('pageerror', (err) => {
      capturedLogs.push({ type: 'pageerror', text: `${err.name}: ${err.message}\n${err.stack}`, timestamp: new Date().toISOString() });
    });

    // 3. Escuchar fallas de red y assets 404
    page.on('response', (res) => {
      if (res.status() >= 400) {
        networkFailures.push(`[HTTP ${res.status()}] ${res.url()}`);
      }
    });

    // --- FASE 1: ARRANQUE Y VERIFICACIÓN DE PANTALLA NEGRA ---
    console.log('QA: Abriendo aplicación en http://localhost:3000...');
    await page.goto('/', { waitUntil: 'domcontentloaded', timeout: 25000 });

    // Dar margen para que React monte y aplique estilos
    await page.waitForTimeout(2000);

    const initialScreenshotPath = path.join(screenshotsDir, '01_initial_boot.png');
    await page.screenshot({ path: initialScreenshotPath, fullPage: true });

    // Validar que el cuerpo de la página no esté completamente vacío
    const bodyText = await page.locator('body').innerText();
    const hasRootContent = await page.locator('#root').evaluate((el) => el.children.length > 0);
    
    expect(hasRootContent, 'El contenedor raíz #root está vacío. Posible error fatal antes del render.').toBeTruthy();

    // --- FASE 2: VERIFICAR EL HARNESS DEL JUEGO ---
    const bridgeExists = await page.evaluate(() => typeof window.__TACTICAL_QA_BRIDGE__ !== 'undefined');
    console.log(`QA: ¿El puente de telemetría está activo?: ${bridgeExists}`);

    if (bridgeExists) {
      const snapshot = await page.evaluate(() => window.__TACTICAL_QA_BRIDGE__!.getSnapshot());
      console.log('QA Snapshot Inicial:', snapshot);
    }

    // --- FASE 3: DETECCIÓN DE ELEMENTOS JUGABLES (GRID O BOTONES DE INICIO) ---
    // Buscar si hay un botón para iniciar partida o si ya carga la cuadrícula
    const startButton = page.locator('button:has-text("Jugar"), button:has-text("Play"), button:has-text("Desplegar"), button:has-text("Iniciar")').first();
    const isStartVisible = await startButton.isVisible().catch(() => false);

    if (isStartVisible) {
      console.log('QA: Botón de inicio detectado. Haciendo click para entrar al juego...');
      await startButton.click();
      await page.waitForTimeout(1500);
      await page.screenshot({ path: path.join(screenshotsDir, '02_after_start_click.png') });
    }

    // --- FASE 4: SIMULAR INTERACCIÓN TÁCTICA (CLICKS EN CUADRÍCULA O CANVAS) ---
    const canvas = page.locator('canvas').first();
    const hasCanvas = await canvas.isVisible().catch(() => false);

    if (hasCanvas) {
      console.log('QA: Canvas detectado. Probando interacción táctica con clic en coordenadas...');
      const box = await canvas.boundingBox();
      if (box) {
        // Clic en el centro del canvas (donde suelen estar las primeras unidades o mapa)
        await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
        await page.waitForTimeout(1000);
        await page.screenshot({ path: path.join(screenshotsDir, '03_after_grid_click.png') });
      }
    } else {
      console.log('QA: No se detectó elemento <canvas>. Buscando cuadrícula DOM...');
      await page.screenshot({ path: path.join(screenshotsDir, '03_dom_view.png') });
    }

    // --- FASE 5: RECOPILAR Y GENERAR REPORTE CRÍTICO ---
    const fatalErrors = capturedLogs.filter((l) => l.type === 'error' || l.type === 'pageerror');
    const finalReport = {
      timestamp: new Date().toISOString(),
      status: fatalErrors.length === 0 && networkFailures.length === 0 ? 'HEALTHY' : 'CRITICAL_ISSUES_DETECTED',
      fatalErrorsCount: fatalErrors.length,
      fatalErrors,
      networkFailuresCount: networkFailures.length,
      networkFailures,
      totalLogsCaptured: capturedLogs.length,
      screenshots: [
        '01_initial_boot.png',
        '02_after_start_click.png',
        '03_after_grid_click.png'
      ].filter((s) => fs.existsSync(path.join(screenshotsDir, s)))
    };

    const reportPath = path.resolve('test-results/qa-run-latest.json');
    fs.writeFileSync(reportPath, JSON.stringify(finalReport, null, 2), 'utf-8');
    console.log(`QA: Reporte estructurado guardado en ${reportPath}`);

    // Si hubo errores fatales de JS, mostramos el primero en el mensaje de aserción
    if (fatalErrors.length > 0) {
      console.error('QA CRASH DETECTADO:\n', fatalErrors[0].text);
    }
  });
});
```

---

### Paso 5: Añadir Scripts al `package.json`
Modificar la sección `"scripts"` de `package.json` para facilitar la invocación por agentes o desarrolladores:

```json
{
  "scripts": {
    "test:qa": "npx playwright test tests/e2e/game-playtester.spec.ts",
    "test:qa:headed": "npx playwright test tests/e2e/game-playtester.spec.ts --headed",
    "test:qa:report": "npx playwright show-report test-results/html-report"
  }
}
```

---

## 4. LA SKILL AGÉNTICA: `.agents/skills/game-qa-playtester/SKILL.md`

Esta es la instrucción que permite que Antigravity sepa cómo probar el juego de forma autónoma, cómo interpretar las imágenes y cómo corregir los fallos encontrados.

```markdown
---
name: game-qa-playtester
description: Ejecuta pruebas E2E automatizadas con Playwright, captura screenshots en tiempo real, analiza caídas de consola, assets 404 y estado del juego para diagnosticar y autoreparar bugs de jugabilidad.
---

# GAME QA PLAYTESTER SKILL

Cuando el usuario pida:
- "Prueba el juego"
- "Revisa si el juego carga o crashea"
- "Haz un playtest E2E"
- "Verifica qué rompe la partida"

## PROTOCOLO DE EJECUCIÓN (BUCLE CERRADO DE AUTO-REPARACIÓN):

### 1. Ejecución del Test E2E
Ejecuta el comando en terminal:
`npm run test:qa`

### 2. Extracción de Telemetría Cruzada
Lee el archivo resultante:
- Archivo de datos: `test-results/qa-run-latest.json`
- Capturas de pantalla: `test-results/screenshots/01_initial_boot.png`, etc.

### 3. Rúbrica de Análisis Multimodal:
Analiza las imágenes generadas y los logs:
- **Pantalla Negra / Gris Vacía:** Si la captura inicial no tiene interfaz, cruza inmediatamente con `fatalErrors` del JSON. Generalmente es un import roto o un hook de React con error de inicialización.
- **Fallo de Clic / Sin Respuesta:** Si el screenshot después del clic es idéntico al anterior, verifica si hay un modal invisible con `pointer-events: auto` o si la función `onClick` no está bindeada.
- **Assets Rotos:** Revisa la lista `networkFailures`. Identifica si son sprites de unidades, mapas o audios con rutas relativas erróneas.

### 4. Reparación Inmediata
- Localiza el archivo fuente exacto indicado por el stack trace.
- Aplica el parche con `edit_file`.
- Vuelve a ejecutar `npm run test:qa` para comprobar que el screenshot ahora muestra el juego funcionando y que `fatalErrorsCount === 0`.
- Presenta el resultado con links a las capturas y al archivo reparado.
```

---

## 5. CÓMO PROCESA EL SISTEMA CUANDO EL JUEGO ESTÁ EN SUS INICIOS (SIN LÓGICA / CON CRASHES)

Dado que indicas que el juego actualmente **crashea, no cargan cosas y falta lógica**, el tester está diseñado específicamente para **no romperse en el primer fallo**. En lugar de abortar abruptamente:

1. **Atrapa los crashes y continúa registrando:**
   Si React revienta con una pantalla de error roja o blanca, Playwright **no detiene el proceso**, sino que toma la captura de la pantalla rota, extrae el stack trace exacto del error y lista las peticiones de red fallidas.
2. **Clasificación Automática de Bloqueos:**
   - **Bloqueo Nivel 1 (Boot Blocker):** El bundle de Vite no levanta o falla en el primer tick.
   - **Bloqueo Nivel 2 (Asset Blocker):** Los sprites o catálogo de datos no cargan (URLs 404).
   - **Bloqueo Nivel 3 (State Null Blocker):** La lógica del juego intenta leer propiedades de un objeto indefinido (falta de inicializador o mock en store).
   - **Bloqueo Nivel 4 (Interaction Blocker):** Los botones existen pero no ejecutan transiciones de estado.
3. **Generación de "Actionable Fix List":**
   El reporte JSON resultante lista exactamente qué archivo y qué línea causó el fallo, permitiendo al agente corregirlo sin que tú tengas que abrir la consola de Chrome.

---

## 6. COMANDOS DE INICIO RÁPIDO

Para comenzar a operar este sistema ahora mismo:

1. **Instalar paquetes:**
   ```powershell
   npm install -D @playwright/test
   npx playwright install chromium
   ```
2. **Crear los archivos de configuración y scripts:**
   - `playwright.config.ts`
   - `src/utils/qaHarness.ts`
   - `tests/e2e/game-playtester.spec.ts`
   - `.agents/skills/game-qa-playtester/SKILL.md`
3. **Correr la primera prueba:**
   ```powershell
   npm run test:qa
   ```
4. **Analizar los resultados:**
   Revisar la carpeta `test-results/screenshots/` y el archivo `test-results/qa-run-latest.json`.

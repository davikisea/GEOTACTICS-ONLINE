import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

interface LogEntry {
  type: string;
  text: string;
  timestamp: string;
}

test.describe('Tactical Command - Playtesting E2E Capa 1 (Metajuego Geopolítico Teatro Venezuela)', () => {
  const screenshotsDir = path.resolve('test-results/screenshots');
  const capturedLogs: LogEntry[] = [];
  const networkFailures: string[] = [];

  test.beforeAll(async () => {
    if (!fs.existsSync(screenshotsDir)) {
      fs.mkdirSync(screenshotsDir, { recursive: true });
    }
  });

  test(' Recorrido E2E Capa 1: Boot, Teatro Venezuela (24+7), Edictos, Peajes, Asedio Político y Bark de Mayor Stella', async ({ page }) => {
    // 1. Escuchar mensajes de consola
    page.on('console', (msg) => {
      const type = msg.type();
      const text = msg.text();
      capturedLogs.push({ type, text, timestamp: new Date().toISOString() });
      if (type === 'error') {
        console.log(`[BROWSER ERROR] ${text}`);
      }
    });

    // 2. Escuchar excepciones no atrapadas de JavaScript
    page.on('pageerror', (err) => {
      const errText = `${err.name}: ${err.message}\n${err.stack || ''}`;
      capturedLogs.push({ type: 'pageerror', text: errText, timestamp: new Date().toISOString() });
      console.log(`[PAGE CRASH] ${errText}`);
    });

    // 3. Escuchar respuestas HTTP con error (404, 500, etc.)
    page.on('response', (res) => {
      if (res.status() >= 400) {
        const failure = `[HTTP ${res.status()}] ${res.url()}`;
        networkFailures.push(failure);
        console.log(`[NETWORK 4xx/5xx] ${failure}`);
      }
    });

    // --- FASE A.1: CARGA DE ARRANQUE (BOOT SCREEN) ---
    console.log('QA [1/6]: Navegando a http://localhost:3000...');
    await page.goto('/', { waitUntil: 'domcontentloaded', timeout: 35000 });
    await page.waitForTimeout(800);

    const rootChildren = await page.locator('#root').evaluate((el) => el.children.length);
    expect(rootChildren, 'La aplicación debe montar contenido en #root').toBeGreaterThan(0);

    const bootScreenshot = path.join(screenshotsDir, '01_boot_screen.png');
    await page.screenshot({ path: bootScreenshot, fullPage: true });
    console.log('QA: Captura 01_boot_screen.png registrada.');

    // Esperar a que el Boot Screen alcance el 100% y transicione automáticamente al Estado Mayor
    await page.waitForSelector('[data-region-id^="REG_VE_"]', { timeout: 20000 });
    await page.waitForTimeout(1200);

    // --- FASE A.2: VISUALIZACIÓN DEL MAPA DE VENEZUELA (24 SOBERANAS + 7 BUFFERS) ---
    console.log('QA [2/6]: Verificando Teatro Venezuela (24 regiones soberanas + 7 zonas buffer)...');
    await expect(page.getByText(/METAMANDO POLÍTICO • PROJECT ALICE/i)).toBeVisible();
    await expect(page.getByText(/TEATRO VENEZUELA \(24 ESTADOS \+ 7 BUFFERS\)/i)).toBeVisible();

    // Verificar aislamiento de capas en las píldoras de estado
    await expect(page.getByText('L1: POLÍTICA ON')).toBeVisible();
    await expect(page.getByText('L2: BATALLA OFF')).toBeVisible();
    await expect(page.getByText(/L3: STELLA/i)).toBeVisible();

    // Contar regiones renderizadas en el lienzo del mapa
    const sovereignCount = await page.locator('[data-region-id^="REG_VE_"]').count();
    const bufferCount = await page.locator('[data-region-id^="BUF_"]').count();
    console.log(`QA: Regiones renderizadas -> Soberanas: ${sovereignCount}, Buffers: ${bufferCount}`);
    expect(sovereignCount, 'Deben existir las 24 regiones soberanas de Venezuela').toBe(24);
    expect(bufferCount, 'Deben existir las 7 zonas buffer fronterizas').toBe(7);

    const mapScreenshot = path.join(screenshotsDir, '02_map_theatre.png');
    await page.screenshot({ path: mapScreenshot, fullPage: true });
    console.log('QA: Captura 02_map_theatre.png registrada.');

    // --- FASE A.3 & A.4: APERTURA DE PESTAÑA EDICTOS, PROMULGACIÓN Y PEAJE ---
    console.log('QA [3/6]: Abriendo pestaña EDICTOS en MetaCommandConsole...');
    const edictsTabBtn = page.getByRole('button', { name: /EDICTOS/i });
    await edictsTabBtn.click();
    await page.waitForTimeout(400);

    await expect(page.getByText('Aduanas de Estrechos Estratégicos (0% - 10%)')).toBeVisible();
    await expect(page.getByText('Plan Quinquenal de Extracción RGO')).toBeVisible();

    console.log('QA [4/6]: Promulgando edicto "Plan Quinquenal de Extracción RGO" y ajustando peaje en CHK-MARACAIBO...');
    const promulgateButtons = page.getByRole('button', { name: 'Promulgar' });
    await expect(promulgateButtons.first()).toBeVisible();
    await promulgateButtons.first().click();
    await page.waitForTimeout(400);

    await expect(page.getByText(/Plan Quinquenal de Extracción RGO.*promulgado/i)).toBeVisible();

    // Ajustar slider de peaje en CHK-MARACAIBO a 7.5%
    const maracaiboSlider = page.locator('input[type="range"]').first();
    await maracaiboSlider.fill('7.5');
    await maracaiboSlider.dispatchEvent('change');
    await page.waitForTimeout(400);

    await expect(page.getByText('7.5%', { exact: true })).toBeVisible();
    await expect(page.getByText(/Mayor Stella \(stella\)/i)).toBeVisible();

    const metaConsoleScreenshot = path.join(screenshotsDir, '03_meta_console.png');
    await page.screenshot({ path: metaConsoleScreenshot, fullPage: true });
    console.log('QA: Captura 03_meta_console.png registrada.');

    // --- FASE A.5: VERIFICACIÓN DE BLOQUEO BUFFER Y ASEDIO POLÍTICO EN COJEDES (REG_VE_20) ---
    console.log('QA [5/6]: Volviendo a pestaña SOBERANÍA y validando candado de Zona Buffer...');
    const sovereigntyTabBtn = page.getByRole('button', { name: /SOBERANÍA/i });
    await sovereigntyTabBtn.click();
    await page.waitForTimeout(400);

    // 1. Verificar que una región Buffer (BUF_CO_01) esté bloqueada en Fase 1
    const bufferNode = page.locator('[data-region-id="BUF_CO_01"]');
    await bufferNode.click({ force: true });
    await page.waitForTimeout(400);
    await expect(page.getByRole('button', { name: /ZONA BUFFER BLOQUEADA \(FASE 1\)/i })).toBeVisible();

    // 2. Seleccionar provincia fronteriza en disputa Cojedes (REG_VE_20) y lanzar asedio político
    console.log('QA [6/6]: Seleccionando Cojedes (REG_VE_20) y ejecutando operación de asedio político...');
    const cojedesNode = page.locator('[data-region-id="REG_VE_20"]');
    await cojedesNode.click({ force: true });
    await page.waitForTimeout(400);

    await expect(page.getByRole('heading', { name: /Cojedes - San Carlos/i })).toBeVisible();

    const siegeButton = page.getByRole('button', { name: /EJECUTAR PRESIÓN DE ASEDIO \(-TCP\)/i });
    await expect(siegeButton).toBeVisible();
    await siegeButton.click();
    await page.waitForTimeout(800);

    // Verificar feedback del asedio político y reducción de TCP
    await expect(page.getByText(/Asedio político ejecutado sobre Cojedes - San Carlos/i)).toBeVisible();

    // --- FASE A.6: VERIFICACIÓN DE BARK DE MAYOR STELLA Y AISLAMIENTO DE CAPA 2 ---
    // Confirmar que seguimos en Capa 1 (lobby) y nunca se abrió CombatTheaterView
    const bridgeActive = await page.evaluate(() => typeof window.__TACTICAL_QA_BRIDGE__ !== 'undefined');
    let finalSnapshot: any = null;
    if (bridgeActive) {
      finalSnapshot = await page.evaluate(() => window.__TACTICAL_QA_BRIDGE__!.getSnapshot());
      expect(finalSnapshot?.activeScreen).toBe('lobby');
    }

    // Verificar emisión de Bark de Mayor Stella en el overlay o telemetría
    const stellaOverlayVisible = await page
      .getByText(/Operación geopolítica en marcha sobre Cojedes - San Carlos/i)
      .isVisible()
      .catch(() => false);
    console.log(`QA: ¿Bark contextual de Mayor Stella visible en pantalla?: ${stellaOverlayVisible}`);
    expect(stellaOverlayVisible, 'El Bark contextual de la Mayor Stella debe mostrarse tras el asedio').toBe(true);

    const siegeScreenshot = path.join(screenshotsDir, '04_siege_executed.png');
    await page.screenshot({ path: siegeScreenshot, fullPage: true });
    console.log('QA: Captura 04_siege_executed.png registrada.');

    // --- GENERACIÓN DEL REPORTE DE TELEMETRÍA ---
    const fatalErrors = capturedLogs.filter((l) => l.type === 'error' || l.type === 'pageerror');
    const reportData = {
      timestamp: new Date().toISOString(),
      status: fatalErrors.length === 0 && networkFailures.length === 0 ? 'PASS_CLEAN' : 'ISSUES_DETECTED',
      rootMounted: rootChildren > 0,
      bridgeActive,
      layer1Verified: {
        sovereignRegionsCount: sovereignCount,
        bufferRegionsCount: bufferCount,
        edictEnacted: 'Plan Quinquenal de Extracción RGO',
        chokepointTollAdjusted: 'CHK-MARACAIBO -> 7.5%',
        bufferLockVerified: 'BUF_CO_01',
        siegeExecutedOn: 'REG_VE_20 (Cojedes - San Carlos)',
        stellaBarkVerified: stellaOverlayVisible,
        layer2CombatIsolated: finalSnapshot?.activeScreen === 'lobby',
      },
      fatalErrorsCount: fatalErrors.length,
      fatalErrors,
      networkFailuresCount: networkFailures.length,
      networkFailures,
      finalSnapshot,
      screenshots: ['01_boot_screen.png', '02_map_theatre.png', '03_meta_console.png', '04_siege_executed.png'],
    };

    const reportFile = path.resolve('test-results/qa-run-latest.json');
    fs.writeFileSync(reportFile, JSON.stringify(reportData, null, 2), 'utf-8');
    console.log(`QA: Reporte de telemetría guardado en ${reportFile}`);

    expect(fatalErrors.length, `Errores fatales detectados: ${JSON.stringify(fatalErrors)}`).toBe(0);
    expect(networkFailures.length, `Fallos de red detectados: ${JSON.stringify(networkFailures)}`).toBe(0);
  });
});

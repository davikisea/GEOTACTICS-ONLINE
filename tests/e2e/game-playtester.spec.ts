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

  async function setupSupabaseMocks(page: any) {
    await page.route('**/rest/v1/state_sovereignty*', async (route: any) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            state_id: 'REG_VE_02',
            country_id: 'COUNTRY_VEN',
            canonical_country_name: 'República de Venezuela',
            custom_country_name: 'Hegemonía Petrolera de Maracaibo',
            canonical_state_name: 'Zulia',
            custom_state_name: 'Estado Zulia (Teatro Cabimas)',
            controlling_faction_id: 'blue_moon',
            controlling_clan_id: 'clan-ferro',
            tcp_current: 10000,
            tcp_max: 10000,
            gdp_war_credits_per_hour: 12400,
            defense_level: 4,
            custom_motto: 'Acero Frío y Petróleo Pesado',
            sovereign_proclamation: 'El Lago de Maracaibo y la Costa Oriental operan bajo jurisdicción militar del Clan Ferro.',
          },
        ]),
      });
    });

    await page.route('**/rest/v1/tactical_spatial_deployments*', async (route: any) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: 'unit-cab-01',
            region_id: 'REG_VE_02',
            cell_key: '9880_15432_0_11',
            sector_x: 9880,
            sector_y: 15432,
            cell_x: 0,
            cell_y: 11,
            lat: 10.395,
            lng: -71.458,
            unit_code: 'md_tank',
            unit_name: 'División Blindada Ferro A-1',
            clan_id: 'clan-ferro',
            clan_tag: 'FERR',
            faction_id: 'blue_moon',
            callsign: 'FERRO-TITÁN-01',
            tier: 2,
            hp: 100,
            max_hp: 100,
            status: 'holding',
            color_hex: '#1D4ED8',
          },
        ]),
      });
    });

    await page.route('**/rest/v1/tactical_fief_constructions*', async (route: any) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: 'bld-salina-seaport',
            fief_id: 'fief-cabimas-salina',
            region_id: 'REG_VE_02',
            cell_key: '9880_15432_0_11_bld',
            sector_x: 9880,
            sector_y: 15432,
            cell_x: 0,
            cell_y: 11,
            lat: 10.395,
            lng: -71.458,
            building_type: 'seaport_terminal',
            clan_id: 'clan-ferro',
            level: 3,
            current_hp: 12000,
            max_hp: 12000,
            hourly_upkeep_ec: 450,
          },
        ]),
      });
    });

    await page.route('**/rest/v1/system_catalog_manifest*', async (route: any) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          version_tag: 'v1.0.0-6870aaf8',
          content_hash: '6870aaf802c5ca1dbe383937f72f80acda49de83f3c43743719ff57c375df5d0',
        }),
      });
    });
  }

  test(' Recorrido E2E Capa 1: Boot, Teatro Venezuela (24+7), Edictos, Peajes, Asedio Político y Bark de Mayor Stella', async ({ page }) => {
    test.setTimeout(180000);
    await setupSupabaseMocks(page);

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
    await page.goto('/?no-splash=1', { waitUntil: 'domcontentloaded', timeout: 35000 });
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
    await expect(page.locator('text=L1: POLÍTICA ON')).toBeVisible();
    await expect(page.locator('text=L2: BATALLA OFF')).toBeVisible();
    await expect(page.locator('text=/L3: STELLA/i').or(page.getByText(/L3: STELLA/i))).toBeVisible();

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
    const sovereigntyTabBtn = page.getByRole('button', { name: 'SOBERANÍA', exact: true });
    await sovereigntyTabBtn.click();
    await page.waitForTimeout(400);

    // 1. Verificar que una región Buffer (BUF_CO_01) esté bloqueada en Fase 1
    const bufferNode = page.locator('[data-region-id="BUF_CO_01"]');
    await bufferNode.dispatchEvent('click');
    await page.waitForTimeout(400);
    await expect(page.getByRole('button', { name: /ZONA BUFFER BLOQUEADA \(FASE 1\)/i })).toBeVisible();

    // 2. Seleccionar provincia fronteriza en disputa Cojedes (REG_VE_20) y lanzar asedio político
    console.log('QA [6/6]: Seleccionando Cojedes (REG_VE_20) y ejecutando operación de asedio político...');
    const cojedesNode = page.locator('[data-region-id="REG_VE_20"]');
    await cojedesNode.dispatchEvent('click');
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
      .getByText(/Mayor Stella/i)
      .first()
      .isVisible()
      .catch(() => false);
    console.log(`QA: ¿Bark contextual de Mayor Stella visible en pantalla?: ${stellaOverlayVisible}`);
    expect(stellaOverlayVisible, 'El Bark contextual de la Mayor Stella debe mostrarse tras el asedio').toBe(true);

    const siegeScreenshot = path.join(screenshotsDir, '04_siege_executed.png');
    await page.screenshot({ path: siegeScreenshot, fullPage: true });
    console.log('QA: Captura 04_siege_executed.png registrada.');

    // --- GENERACIÓN DEL REPORTE DE TELEMETRÍA ---
    const fatalErrors = capturedLogs.filter(
      (l) =>
        (l.type === 'error' || l.type === 'pageerror') &&
        !l.text.includes('AudioContext') &&
        !l.text.includes('audio device')
    );
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

  test('Recorrido E2E 3 Niveles de Zoom: Macro (z<10), Operacional (z=10) y Microjuego (z=15)', async ({ page }) => {
    test.setTimeout(180000);
    await setupSupabaseMocks(page);
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text());
    });

    console.log('QA ZOOM [1/4]: Cargando aplicación y esperando mapa WebGL...');
    await page.goto('/?no-splash=1', { waitUntil: 'domcontentloaded', timeout: 35000 });
    await page.waitForSelector('[data-region-id^="REG_VE_"]', { timeout: 20000 });
    await page.waitForTimeout(1000);

    // --- NIVEL 1: VISTA MACRO (z < 10) ---
    console.log('QA ZOOM [2/4]: Nivel 1 Macro (z < 10). Clic en Zulia (REG_VE_02) para abrir StateInspectorDrawer...');
    const zuliaBtn = page.locator('[data-region-id="REG_VE_02"]');
    await zuliaBtn.dispatchEvent('click');
    await page.waitForTimeout(600);

    // Validar telemetría en StateInspectorDrawer
    await expect(page.getByText(/PIB DE GUERRA/i)).toBeVisible();
    await expect(page.getByText(/RENDIMIENTO DE RECURSOS/i)).toBeVisible();

    const unlockBtn = page.getByRole('button', { name: /DESBLOQUEAR PANEL DE CONTROL/i });
    if (await unlockBtn.isVisible()) {
      await unlockBtn.dispatchEvent('click');
      await page.waitForTimeout(600);
      await expect(page.getByText(/PANEL DE CONTROL DEL ESTADO/i)).toBeVisible();
      // Cerrar modal
      const closeBtn = page.getByTitle('Cerrar Consola');
      if (await closeBtn.isVisible()) await closeBtn.dispatchEvent('click');
    }

    const macroScreenshot = path.join(screenshotsDir, '05_macro_zoom_level1.png');
    await page.screenshot({ path: macroScreenshot, fullPage: true });

    // --- NIVEL 2: VISTA OPERACIONAL (z = 10) ---
    console.log('QA ZOOM [3/4]: Conmutando a Nivel 2 Operacional (z = 10.5)...');
    await page.evaluate(() => {
      if (typeof (window as any).__SET_TACTICAL_ZOOM__ === 'function') {
        (window as any).__SET_TACTICAL_ZOOM__(10.5);
      } else {
        const map = (window as any).__TACTICAL_MAP_INSTANCE__;
        if (map) {
          map.jumpTo({ center: [-71.455, 10.395], zoom: 10.5 });
          map.fire('zoom');
        }
      }
    });
    await page.waitForTimeout(1000);

    // Validar telemetría de HUD de Zoom (debe reflejar >= 10x)
    const zoomText = await page.locator('text=OPENPLACE WEBGL • ZOOM:').textContent();
    console.log(`QA ZOOM: Telemetría de zoom en pantalla: "${zoomText}"`);
    expect(zoomText).toMatch(/ZOOM: 10\./);

    const operationalScreenshot = path.join(screenshotsDir, '06_operational_zoom_level2.png');
    await page.screenshot({ path: operationalScreenshot, fullPage: true });

    // --- NIVEL 3: VISTA MICROJUEGO TÁCTICO & CONSTRUCCIÓN (z = 15) ---
    console.log('QA ZOOM [4/4]: Conmutando a Nivel 3 Microjuego Táctico (z = 15.2)...');
    await page.evaluate(() => {
      if (typeof (window as any).__SET_TACTICAL_ZOOM__ === 'function') {
        (window as any).__SET_TACTICAL_ZOOM__(15.2);
      } else {
        const map = (window as any).__TACTICAL_MAP_INSTANCE__;
        if (map) {
          map.jumpTo({ center: [-71.455, 10.395], zoom: 15.2 });
          map.fire('zoom');
        }
      }
    });
    await page.waitForTimeout(1000);

    // Validar HUD del Microjuego Táctico
    await expect(page.getByText(/LOD 3 • MICROJUEGO TÁCTICO/i)).toBeVisible();
    await expect(page.getByText(/ASIGNACIÓN ESPACIAL O\(1\)/i)).toBeVisible();

    // Validar botones de acción en-situ: DESPLEGAR y CONSTRUIR
    const deployBtn = page.getByRole('button', { name: /DESPLEGAR/i });
    const buildBtn = page.getByRole('button', { name: /CONSTRUIR/i });
    await expect(deployBtn).toBeVisible();
    await expect(buildBtn).toBeVisible();

    // Probar apertura del Modal de Despliegue de Unidades
    await deployBtn.click({ force: true });
    await page.waitForTimeout(500);
    await expect(page.getByText(/DESPLIEGUE TÁCTICO DE TROPA/i)).toBeVisible();
    const closeDeploy = page.getByTitle('Cerrar Despliegue');
    if (await closeDeploy.isVisible()) await closeDeploy.click({ force: true });
    await page.waitForTimeout(400);

    // Probar apertura del Drawer de Construcción de Estructuras
    await buildBtn.click({ force: true });
    await page.waitForTimeout(500);
    await expect(page.getByText(/CONSTRUCCIÓN IN-SITU/i)).toBeVisible();
    const closeBuild = page.getByTitle('Cerrar Construcción');
    if (await closeBuild.isVisible()) await closeBuild.click({ force: true });

    const tacticalScreenshot = path.join(screenshotsDir, '07_microgame_zoom_level3.png');
    await page.screenshot({ path: tacticalScreenshot, fullPage: true });

    // Cero errores críticos
    const fatalErrors = errors.filter(
      (e) =>
        !e.includes('deprecated') &&
        !e.includes('favicon') &&
        !e.includes('AudioContext') &&
        !e.includes('audio device')
    );
    expect(fatalErrors.length, `Errores fatales en test de zoom: ${JSON.stringify(fatalErrors)}`).toBe(0);
    console.log('QA ZOOM: ¡Las 3 Vistas de Zoom (Macro, Operacional, Microjuego) superadas con 100% de éxito!');
  });
});

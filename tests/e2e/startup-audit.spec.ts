import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

interface LogEntry {
  type: string;
  text: string;
  timestamp: string;
}

test.describe('Audit Forense: Startup UI/UX, Loading Screen & Window Clutter', () => {
  const auditScreenshotsDir = path.resolve('test-results/audit_screenshots');
  const capturedLogs: LogEntry[] = [];
  const networkFailures: string[] = [];

  test.beforeAll(async () => {
    if (!fs.existsSync(auditScreenshotsDir)) {
      fs.mkdirSync(auditScreenshotsDir, { recursive: true });
    }
  });

  async function setupMocks(page: any) {
    await page.route('**/auth/v1/**', async (route: any) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ user: null, session: null }),
      });
    });

    await page.route('**/rest/v1/**', async (route: any) => {
      const url = route.request().url();
      if (url.includes('state_sovereignty')) {
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
      } else if (url.includes('tactical_spatial_deployments')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([]),
        });
      } else if (url.includes('tactical_fief_constructions')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([]),
        });
      } else if (url.includes('system_catalog_manifest')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            version_tag: 'v1.0.0-6870aaf8',
            content_hash: '6870aaf802c5ca1dbe383937f72f80acda49de83f3c43743719ff57c375df5d0',
          }),
        });
      } else if (url.includes('territorial_vulnerability_windows')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([]),
        });
      } else {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([]),
        });
      }
    });
  }

  test('Captura de Momentos Críticos de Inicio y Pantallas Clave (1920x1080)', async ({ page }) => {
    test.setTimeout(120000);
    await page.setViewportSize({ width: 1920, height: 1080 });
    await setupMocks(page);

    page.on('console', (msg) => {
      const type = msg.type();
      const text = msg.text();
      capturedLogs.push({ type, text, timestamp: new Date().toISOString() });
    });

    page.on('response', (res) => {
      if (res.status() >= 400) {
        networkFailures.push(`[HTTP ${res.status()}] ${res.url()}`);
      }
    });

    const startTime = Date.now();

    // 1. Navegar con Splash screen activado
    await page.goto('/', { waitUntil: 'domcontentloaded', timeout: 45000 });
    await page.waitForTimeout(3000); // Esperar que el ciclo inicial termine y el lobby se monte

    // Momento D: Primer frame interactivo post-carga del Cuartel General
    await page.screenshot({ path: path.join(auditScreenshotsDir, '02_post_boot_cluttered_windows.png') });

    // 2. Invocar la pantalla de carga mediante QA Bridge para capturar empíricamente cada estado
    await page.evaluate(() => {
      (window as any).__TACTICAL_QA_BRIDGE__?.openLoadingScreen();
    });

    // Momento A: Inicio de precarga (t=100ms)
    await page.waitForTimeout(100);
    await page.screenshot({ path: path.join(auditScreenshotsDir, 'boot_t100ms.png') });

    // Momento B: Progreso Medio (t=700ms) & Captura de Redundancias
    await page.waitForTimeout(600);
    await page.screenshot({ path: path.join(auditScreenshotsDir, 'boot_t800ms.png') });
    await page.screenshot({ path: path.join(auditScreenshotsDir, '01_loading_screen_redundancies.png') });

    // Momento C: Finalización inmediata (t=1400ms)
    await page.waitForTimeout(600);
    await page.screenshot({ path: path.join(auditScreenshotsDir, 'boot_t1500ms.png') });

    // Restaurar estado al lobby
    await page.evaluate(() => {
      (window as any).__TACTICAL_QA_BRIDGE__?.dismissLoadingScreen();
    });
    await page.waitForTimeout(1000);

    fs.writeFileSync(
      path.join(auditScreenshotsDir, 'console_and_network_audit.json'),
      JSON.stringify({ capturedLogs, networkFailures, elapsedMs: Date.now() - startTime }, null, 2)
    );
  });

  test('Evaluación Responsiva Laptop Estándar (1366x768)', async ({ page }) => {
    test.setTimeout(90000);
    await page.setViewportSize({ width: 1366, height: 768 });
    await setupMocks(page);

    await page.goto('/?no-splash=1', { waitUntil: 'domcontentloaded', timeout: 45000 });
    await page.waitForSelector('main', { timeout: 30000 });
    await page.waitForTimeout(3000);

    await page.screenshot({ path: path.join(auditScreenshotsDir, '03_responsive_1366x768_overlap.png') });
  });

  test('Evaluación Responsiva Móvil (390x844)', async ({ page }) => {
    test.setTimeout(90000);
    await page.setViewportSize({ width: 390, height: 844 });
    await setupMocks(page);

    await page.goto('/?no-splash=1', { waitUntil: 'domcontentloaded', timeout: 45000 });
    await page.waitForSelector('main', { timeout: 30000 });
    await page.waitForTimeout(3000);

    await page.screenshot({ path: path.join(auditScreenshotsDir, '04_mobile_viewport_overlap.png') });
  });
});

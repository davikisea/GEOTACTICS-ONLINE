import { chromium } from '@playwright/test';
import { preview } from 'vite';
import path from 'node:path';

async function main() {
  const server = await preview({
    preview: {
      port: 4173,
      host: '127.0.0.1'
    }
  });

  const url = server.resolvedUrls.local[0] || 'http://127.0.0.1:4173/';

  const browser = await chromium.launch();
  const page = await browser.newPage({
    viewport: { width: 1440, height: 900 }
  });

  page.on('console', msg => console.log('PAGE LOG:', msg.type(), msg.text()));
  page.on('pageerror', err => console.log('PAGE ERROR:', err.message, err.stack));

  console.log('Navigating to', url);
  await page.goto(url, { waitUntil: 'networkidle' });

  await page.waitForTimeout(1000);
  const shot1 = path.resolve('public', 'loading_screen_preview_mid.png');
  await page.screenshot({ path: shot1 });

  await page.waitForTimeout(2500);
  const shot2 = path.resolve('public', 'loading_screen_preview_ready.png');
  await page.screenshot({ path: shot2 });

  await browser.close();
  await server.close();
  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});

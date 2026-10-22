const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');
const { boot, watchErrors, expectNoErrors } = require('./helpers');

const root = path.join(__dirname, '..');
const swSource = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');
const VERSION = /const VERSION = '([^']+)'/.exec(swSource)[1];
const SHELL = [...swSource.matchAll(/SHELL = \[([^\]]+)\]/g)][0][1]
  .split(',')
  .map(x => x.trim().replace(/^'|'$/g, ''))
  .filter(Boolean);

test.describe('PWA, манифест и офлайн', () => {
  test.use({ serviceWorkers: 'allow' });

  test('манифест описывает устанавливаемое приложение', async ({ page, request }) => {
    await boot(page);
    const manifest = await (await request.get('/manifest.json')).json();
    expect(manifest).toMatchObject({
      id: './',
      name: 'RitmDojo: ритм-тренажёр для гитары',
      short_name: 'RitmDojo',
      lang: 'ru',
      start_url: './',
      scope: './',
      display: 'standalone',
      orientation: 'any',
      background_color: '#0f1418',
      theme_color: '#0f1418',
    });
    expect(manifest.categories).toEqual(['music', 'education']);
    expect(manifest.icons).toEqual([
      { src: 'icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: 'icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ]);
    for (const icon of manifest.icons) {
      const response = await request.get('/' + icon.src);
      expect(response.status(), icon.src).toBe(200);
    }
  });

  test('service worker перечисляет существующий shell и версию', async ({ request }) => {
    expect(VERSION).toMatch(/^ritmdojo-v\d+$/);
    expect(SHELL).toEqual(expect.arrayContaining(['./', 'index.html', 'style.css', 'app.js', 'manifest.json', 'icon-192.png', 'icon-512.png', 'icon-maskable-512.png', 'apple-touch-icon.png',
      'voice/raz.mp3', 'voice/dva.mp3', 'voice/tri.mp3', 'voice/chetyre.mp3', 'voice/i.mp3']));
    for (const item of SHELL) {
      const url = item === './' ? '/' : '/' + item;
      const response = await request.get(url);
      expect(response.status(), item).toBe(200);
    }
    const nojekyll = await request.get('/.nojekyll');
    expect(nojekyll.status()).toBe(200);
  });

  test('service worker регистрируется и кеширует оболочку', async ({ page }) => {
    await boot(page);
    await page.waitForFunction(() => navigator.serviceWorker && navigator.serviceWorker.ready, null, { timeout: 15000 });
    await page.reload();
    await page.waitForFunction(() => !!navigator.serviceWorker.controller, null, { timeout: 15000 });
    const state = await page.evaluate(async () => ({
      controller: !!navigator.serviceWorker.controller,
      keys: await caches.keys(),
      shell: await (async () => {
        const keys = await caches.keys();
        const cache = await caches.open(keys[0]);
        return (await cache.keys()).map(r => new URL(r.url).pathname);
      })(),
    }));
    expect(state.controller).toBe(true);
    expect(state.keys).toContain(VERSION);
    expect(state.shell).toEqual(expect.arrayContaining(['/', '/index.html', '/style.css', '/app.js', '/manifest.json', '/icon-192.png']));
  });

  test('офлайн-перезагрузка открывает приложение из кеша', async ({ page, context }) => {
    await boot(page);
    await page.waitForFunction(() => navigator.serviceWorker && navigator.serviceWorker.ready, null, { timeout: 15000 });
    await page.reload();
    await page.waitForFunction(() => !!navigator.serviceWorker.controller, null, { timeout: 15000 });
    await context.setOffline(true);
    try {
      await page.reload({ waitUntil: 'domcontentloaded' });
      await page.waitForFunction(() => typeof B !== 'undefined' && B.length === 123, null, { timeout: 15000 });
      await expect(page.locator('h1')).toHaveText('RitmDojo');
      await expect(page.locator('#bplay')).toHaveText('Старт (пробел)');
      await page.waitForFunction(() => typeof full === 'function' && full(), null, { timeout: 15000 });
      expect(await page.evaluate(() => ({ vdata: !!document.getElementById('vdata'), words: Object.keys(VB).length }))).toEqual({ vdata: false, words: 5 });
    } finally {
      await context.setOffline(false);
    }
  });

  test('офлайн-переход на index.html тоже отдаётся из кеша', async ({ page, context }) => {
    await boot(page);
    await page.waitForFunction(() => navigator.serviceWorker && navigator.serviceWorker.ready, null, { timeout: 15000 });
    await page.reload();
    await page.waitForFunction(() => !!navigator.serviceWorker.controller, null, { timeout: 15000 });
    await context.setOffline(true);
    try {
      await page.goto('/index.html', { waitUntil: 'domcontentloaded' });
      await expect(page.locator('h1')).toHaveText('RitmDojo');
      await page.waitForFunction(() => typeof B !== 'undefined');
    } finally {
      await context.setOffline(false);
    }
  });

  test('ошибка регистрации service worker не ломает страницу', async ({ page }) => {
    await page.route('**/sw.js', route => route.abort());
    const errors = watchErrors(page);
    await boot(page);
    await expect(page.locator('h1')).toHaveText('RitmDojo');
    await page.waitForTimeout(300);
    await expectNoErrors(errors);
    expect(await page.evaluate(() => typeof B)).toBe('object');
  });
});

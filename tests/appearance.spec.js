const { test, expect } = require('@playwright/test');
const { boot } = require('./helpers');

const bg = page => page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--bg').trim());

test.describe('оформление и адаптивность', () => {
  test('светлая тема по умолчанию', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'light' });
    await boot(page);
    expect(await bg(page)).toBe('#eceff3');
    await expect(page.locator('.card').first()).toHaveCSS('background-color', 'rgb(255, 255, 255)');
  });

  test('тёмная тема по prefers-color-scheme', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark' });
    await boot(page);
    expect(await bg(page)).toBe('#0f1418');
    await expect(page.locator('.card').first()).toHaveCSS('background-color', 'rgb(24, 32, 39)');
  });

  test('data-theme переопределяет системную тему', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark' });
    await boot(page);
    await page.evaluate(() => { document.documentElement.dataset.theme = 'light'; });
    expect(await bg(page)).toBe('#eceff3');
    await page.evaluate(() => { document.documentElement.dataset.theme = 'dark'; });
    expect(await bg(page)).toBe('#0f1418');
    await page.emulateMedia({ colorScheme: 'light' });
    expect(await bg(page)).toBe('#0f1418');
    await page.evaluate(() => { document.documentElement.dataset.theme = 'light'; });
    expect(await bg(page)).toBe('#eceff3');
  });

  test('цветовые переменные заданы и используются', async ({ page }) => {
    await boot(page);
    const vars = await page.evaluate(() => {
      const s = getComputedStyle(document.documentElement);
      return Object.fromEntries(['--bg', '--card', '--fg', '--mut', '--line', '--lis', '--ok', '--need']
        .map(name => [name, s.getPropertyValue(name).trim()]));
    });
    for (const [name, value] of Object.entries(vars)) {
      expect(value, name).toMatch(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
    }
    await expect(page.locator('#m5')).toHaveCSS('color', 'rgb(16, 24, 32)');
    await expect(page.locator('kbd').first()).toHaveCSS('border-bottom-width', '2px');
  });

  test('мобильный вид не даёт горизонтальной прокрутки', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await boot(page);
    const layout = await page.evaluate(() => ({
      scroll: document.documentElement.scrollWidth,
      inner: window.innerWidth,
      main: document.querySelector('main').getBoundingClientRect().width,
    }));
    expect(layout.scroll).toBeLessThanOrEqual(layout.inner + 1);
    expect(layout.main).toBeLessThanOrEqual(375);
    await expect(page.locator('#bplay')).toBeVisible();
    await expect(page.locator('#strip')).toBeVisible();
  });

  test('фокус виден на элементах управления', async ({ page }) => {
    await boot(page);
    await page.locator('#bplay').focus();
    const outline = await page.locator('#bplay').evaluate(el => getComputedStyle(el).outlineStyle);
    expect(['solid', 'auto']).toContain(outline);
  });
});

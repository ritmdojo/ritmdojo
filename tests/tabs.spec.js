const { test, expect } = require('@playwright/test');
const { boot, openTab, watchErrors, expectNoErrors } = require('./helpers');

const fast = {
  opt: { L: 0, P: 1, count: false, V: false, N: false, GM: false },
  cur: 2,
  shift: 60,
};

test.describe('вкладки, шапка и логотип', () => {
  test('по умолчанию открыта игра, шапка содержит пиксельные иконки', async ({ page }) => {
    const errors = watchErrors(page);
    await boot(page);
    await expect(page.locator('#vplay')).toBeVisible();
    await expect(page.locator('#vscore')).toBeHidden();
    await expect(page.locator('#vset')).toBeHidden();
    await expect(page.locator('#tplay')).toHaveAttribute('aria-selected', 'true');
    await expect(page.locator('#tscore')).toHaveAttribute('aria-selected', 'false');
    await expect(page.locator('#bset')).toHaveAttribute('aria-pressed', 'false');
    await expect(page.locator('h1')).toHaveText('RitmDojo');

    const art = await page.evaluate(() => ({
      logoRects: document.querySelectorAll('#logo rect').length,
      gearRects: document.querySelectorAll('#bset svg rect').length,
      crisp: document.getElementById('logo').getAttribute('shape-rendering'),
      gearBeforeLogo: !!(document.getElementById('bset').compareDocumentPosition(document.getElementById('logo')) & Node.DOCUMENT_POSITION_FOLLOWING),
      logoColor: getComputedStyle(document.documentElement).getPropertyValue('--lis').trim(),
    }));
    expect(art.logoRects).toBeGreaterThan(20);
    expect(art.gearRects).toBeGreaterThan(20);
    expect(art.crisp).toBe('crispEdges');
    expect(art.gearBeforeLogo).toBe(true);
    expect(art.logoColor).toMatch(/^#/);
    await expectNoErrors(errors);
  });

  test('шестерёнка открывает настройки и возвращает обратно', async ({ page }) => {
    await boot(page);
    await page.locator('#bset').click();
    await expect(page.locator('#vset')).toBeVisible();
    await expect(page.locator('#vplay')).toBeHidden();
    await expect(page.locator('#bset')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('#tplay')).toHaveAttribute('aria-selected', 'false');
    await expect(page.locator('#oloop')).toBeVisible();
    await page.locator('#bset').click();
    await expect(page.locator('#vplay')).toBeVisible();
    await expect(page.locator('#vset')).toBeHidden();
    await expect(page.locator('#bset')).toHaveAttribute('aria-pressed', 'false');
  });

  test('вкладка «Счёт» показывает результат и скрывает остальные экраны', async ({ page }) => {
    await boot(page);
    await openTab(page, 'score');
    await expect(page.locator('#vscore')).toBeVisible();
    await expect(page.locator('#hud')).toBeVisible();
    await expect(page.locator('#vplay')).toBeHidden();
    await expect(page.locator('#vset')).toBeHidden();
    await expect(page.locator('#tscore')).toHaveAttribute('aria-selected', 'true');
    await expect(page.locator('#tplay')).toHaveAttribute('aria-selected', 'false');
    await expect(page.locator('#bset')).toHaveAttribute('aria-pressed', 'false');
    await openTab(page, 'play');
    await expect(page.locator('#vplay')).toBeVisible();
    await expect(page.locator('#vscore')).toBeHidden();
  });

  test('переключение вкладок не сбрасывает урок и настройки', async ({ page }) => {
    await boot(page);
    await page.selectOption('#sx', '2');
    await expect(page.locator('#pgt4')).toHaveText('Урок 31 из 123');
    await openTab(page, 'settings');
    await page.locator('#oloop').check();
    await openTab(page, 'score');
    await openTab(page, 'play');
    await expect(page.locator('#sx')).toHaveValue('2');
    await expect(page.locator('#pgt4')).toHaveText('Урок 31 из 123');
    expect(await page.evaluate(() => opt.loop)).toBe(true);
  });

  test('воспроизведение продолжается при переключении вкладок', async ({ page }) => {
    await boot(page, fast);
    await openTab(page, 'play');
    await page.locator('#bplay').click();
    await expect.poll(() => page.evaluate(() => playing)).toBe(true);
    await openTab(page, 'score');
    expect(await page.evaluate(() => playing)).toBe(true);
    await openTab(page, 'settings');
    expect(await page.evaluate(() => playing)).toBe(true);
    await openTab(page, 'play');
    await expect(page.locator('#bplay')).toHaveText('Пауза (пробел)');
    await page.locator('#bplay').click();
    expect(await page.evaluate(() => playing)).toBe(false);
  });

  test('настройки не видны на игровом экране и наоборот', async ({ page }) => {
    await boot(page);
    await expect(page.locator('#oloop')).toBeHidden();
    await expect(page.locator('#bcal')).toBeHidden();
    await expect(page.locator('#bplay')).toBeVisible();
    await openTab(page, 'settings');
    await expect(page.locator('#oloop')).toBeVisible();
    await expect(page.locator('#bcal')).toBeVisible();
    await expect(page.locator('#bplay')).toBeHidden();
    await expect(page.locator('#strip')).toBeHidden();
  });
});

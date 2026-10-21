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

    const art = await page.evaluate(() => {
      const b = id => document.getElementById(id);
      const before = (a, c) => !!(b(a).compareDocumentPosition(b(c)) & Node.DOCUMENT_POSITION_FOLLOWING);
      return {
        logoRects: document.querySelectorAll('#logo rect').length,
        wordRects: document.querySelectorAll('#wm rect').length,
        gearRects: document.querySelectorAll('#bset svg rect').length,
        helpRects: document.querySelectorAll('#bhelp svg rect').length,
        crisp: document.getElementById('logo').getAttribute('shape-rendering'),
        wordCrisp: document.getElementById('wm').getAttribute('shape-rendering'),
        gearBeforeHelp: before('bset', 'bhelp'),
        helpBeforeLogo: before('bhelp', 'logo'),
        gearBeforeLogo: before('bset', 'logo'),
        logoColor: getComputedStyle(document.documentElement).getPropertyValue('--lis').trim(),
      };
    });
    expect(art.logoRects).toBeGreaterThan(15);
    expect(art.wordRects).toBeGreaterThan(50);
    expect(art.gearRects).toBeGreaterThan(20);
    expect(art.helpRects).toBeGreaterThan(10);
    expect(art.crisp).toBe('crispEdges');
    expect(art.wordCrisp).toBe('crispEdges');
    expect(art.gearBeforeHelp).toBe(true);
    expect(art.helpBeforeLogo).toBe(true);
    expect(art.gearBeforeLogo).toBe(true);
    expect(art.logoColor).toMatch(/^#/);
    await expectNoErrors(errors);
  });

  test('кнопка ? открывает подсказки и возвращает на игру', async ({ page }) => {
    await boot(page);
    await expect(page.locator('#vplay dl')).toHaveCount(0);
    await page.locator('#bhelp').click();
    await expect(page.locator('#vhelp')).toBeVisible();
    await expect(page.locator('#vplay')).toBeHidden();
    await expect(page.locator('#bhelp')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('#vhelp')).toContainText('Горячие клавиши');
    await expect(page.locator('#vhelp')).toContainText('Пробел');
    await expect(page.locator('#vhelp')).toContainText('два такта сначала «раз — два —»');
    await page.locator('#bhelp').click();
    await expect(page.locator('#vplay')).toBeVisible();
    await expect(page.locator('#vhelp')).toBeHidden();
    await expect(page.locator('#bhelp')).toHaveAttribute('aria-pressed', 'false');
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
    await expect(page.locator('#rt')).toBeVisible();
    await expect(page.locator('#hst')).toBeVisible();
    await expect(page.locator('#hh')).toBeVisible();
    await expect(page.locator('#hud')).toBeHidden();
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

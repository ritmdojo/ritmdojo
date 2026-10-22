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
        logoBeforeTabs: before('logo', 'tplay'),
        tabsBeforeHelp: before('tscore', 'bhelp'),
        helpBeforeGear: before('bhelp', 'bset'),
        gearLast: document.querySelector('.topin').lastElementChild.id,
        shoe: getComputedStyle(document.querySelector('#lfoot g rect')).fill,
      };
    });
    expect(art.logoRects).toBeGreaterThan(14);
    expect(art.wordRects).toBeGreaterThan(50);
    expect(art.gearRects).toBeGreaterThan(20);
    expect(art.helpRects).toBeGreaterThan(10);
    expect(art.crisp).toBe('crispEdges');
    expect(art.wordCrisp).toBe('crispEdges');
    expect(art.logoBeforeTabs).toBe(true);
    expect(art.tabsBeforeHelp).toBe(true);
    expect(art.helpBeforeGear).toBe(true);
    expect(art.gearLast).toBe('bset');
    expect(art.shoe).toMatch(/^rgb/);
    await expectNoErrors(errors);
  });

  test('логотип и название переключаются между светлой и тёмной темой', async ({ page }) => {
    await boot(page);
    const colors = await page.evaluate(() => {
      const shoe = () => getComputedStyle(document.querySelector('#lfoot g rect')).fill;
      const word = () => getComputedStyle(document.querySelector('#wm rect')).fill;
      const accent = () => getComputedStyle(document.querySelector('#wm rect[fill*="need"]')).fill;
      const light = { shoe: shoe(), word: word(), accent: accent() };
      document.documentElement.dataset.theme = 'dark';
      const dark = { shoe: shoe(), word: word(), accent: accent() };
      document.documentElement.removeAttribute('data-theme');
      return { light, dark };
    });
    expect(colors.light.shoe).not.toBe(colors.dark.shoe);
    expect(colors.light.word).not.toBe(colors.dark.word);
    expect(colors.dark.shoe).not.toBe(colors.dark.accent);
    expect(colors.light.word).not.toBe(colors.light.accent);
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

  test('управление перенесено в карточку урока и стало иконками', async ({ page }) => {
    await boot(page);
    const layout = await page.evaluate(() => {
      const card = document.getElementById('bplay').closest('.card');
      return {
        inCard: !!card,
        sameCard: card && card.contains(document.getElementById('bprev')) && card.contains(document.getElementById('brst')) && card.contains(document.getElementById('bnext')),
        oldRow: document.querySelectorAll('.tr').length,
        icons: document.querySelectorAll('#bprev svg, #brst svg, #bnext svg').length,
        playIcons: document.querySelectorAll('#bplay svg').length,
        chips: document.querySelectorAll('#tempos .chip').length,
      };
    });
    expect(layout.inCard).toBe(true);
    expect(layout.sameCard).toBe(true);
    expect(layout.oldRow).toBe(0);
    expect(layout.icons).toBe(3);
    expect(layout.playIcons).toBe(2);
    expect(layout.chips).toBe(3);
    await expect(page.locator('#bplay')).toHaveText('Старт (пробел)');
    await expect(page.locator('#bplay')).toHaveAttribute('aria-label', /Старт/);
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

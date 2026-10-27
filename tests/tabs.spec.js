const { test, expect } = require('@playwright/test');
const { boot, openTab, watchErrors, expectNoErrors } = require('./helpers');

const fast = {
  opt: { L: 0, P: 1, count: false, V: false, N: false, GM: false },
  cur: 2,
  shift: 60,
};

test.describe('вкладки, шапка и логотип', () => {
  test('по умолчанию открыта игра, шапка содержит название и обычные иконки', async ({ page }) => {
    const errors = watchErrors(page);
    await boot(page);
    await expect(page.locator('#vplay')).toBeVisible();
    await expect(page.locator('#vscore')).toBeHidden();
    await expect(page.locator('#vset')).toBeHidden();
    await expect(page.locator('#tplay')).toHaveCount(0);
    await expect(page.locator('#tscore')).toHaveAttribute('aria-pressed', 'false');
    await expect(page.locator('#bset')).toHaveAttribute('aria-pressed', 'false');
    await expect(page.locator('h1')).toHaveText('RitmDojo');

    const art = await page.evaluate(() => {
      const b = id => document.getElementById(id);
      const before = (a, c) => !!(b(a).compareDocumentPosition(b(c)) & Node.DOCUMENT_POSITION_FOLLOWING);
      return {
        logoRects: document.querySelectorAll('#logo rect').length,
        wordRects: document.querySelectorAll('#wm rect').length,
        gearPaths: document.querySelectorAll('#bset svg path, #bset svg circle').length,
        gearCrisp: document.getElementById('bset').querySelector('svg').getAttribute('shape-rendering'),
        helpSvg: document.querySelectorAll('#bhelp svg').length,
        helpText: document.getElementById('bhelp').textContent.trim(),
        crisp: document.getElementById('logo').getAttribute('shape-rendering'),
        wordCrisp: document.getElementById('wm').getAttribute('shape-rendering'),
        logoBeforeScore: before('logo', 'tscore'),
        scoreBeforeHelp: before('tscore', 'bhelp'),
        helpBeforeGear: before('bhelp', 'bset'),
        gearLast: document.querySelector('.topin').lastElementChild.id,
        shoe: getComputedStyle(document.querySelector('#lfoot g rect')).fill,
        iconBoxes: ['bprev', 'brst', 'bplay', 'bnext'].map(id => {
          const r = document.querySelector('#' + id + ' svg').getBoundingClientRect();
          return [Math.round(r.width), Math.round(r.height)];
        }),
        gearIcon: (() => { const r = document.querySelector('#bset svg').getBoundingClientRect(); return [Math.round(r.width), Math.round(r.height)]; })(),
        helpFont: getComputedStyle(document.getElementById('bhelp')).fontSize,
        gearBox: (() => { const r = document.getElementById('bset').getBoundingClientRect(); return [Math.round(r.width), Math.round(r.height)]; })(),
        helpBox: (() => { const r = document.getElementById('bhelp').getBoundingClientRect(); return [Math.round(r.width), Math.round(r.height)]; })(),
      };
    });
    expect(art.logoRects).toBeGreaterThan(14);
    expect(art.wordRects).toBeGreaterThan(50);
    expect(art.gearPaths).toBeGreaterThanOrEqual(2);
    expect(art.gearCrisp).toBeNull();
    expect(art.helpSvg).toBe(0);
    expect(art.helpText).toBe('?');
    expect(art.crisp).toBe('crispEdges');
    expect(art.wordCrisp).toBe('crispEdges');
    expect(art.logoBeforeScore).toBe(true);
    expect(art.scoreBeforeHelp).toBe(true);
    expect(art.helpBeforeGear).toBe(true);
    expect(art.gearLast).toBe('bset');
    expect(art.shoe).toMatch(/^rgb/);
    expect(art.iconBoxes).toEqual(Array(4).fill([20, 20]));
    expect(art.gearIcon).toEqual([20, 20]);
    expect(art.helpFont).toBe('20px');
    expect(art.gearBox).toEqual(art.helpBox);
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
    await expect(page.locator('#vhelp')).toContainText('Два такта: сначала «раз — два —»');
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
    await expect(page.locator('#tscore')).toHaveAttribute('aria-pressed', 'false');
    await expect(page.locator('#oloop')).toBeVisible();
    await page.locator('#bset').click();
    await expect(page.locator('#vplay')).toBeVisible();
    await expect(page.locator('#vset')).toBeHidden();
    await expect(page.locator('#bset')).toHaveAttribute('aria-pressed', 'false');
  });

  test('«Счёт» работает переключателем, как «?» и шестерёнка', async ({ page }) => {
    await boot(page);
    await page.locator('#tscore').click();
    await expect(page.locator('#vscore')).toBeVisible();
    await expect(page.locator('#rt')).toBeVisible();
    await expect(page.locator('#hst')).toBeVisible();
    await expect(page.locator('#hh')).toBeVisible();
    await expect(page.locator('#hud')).toBeHidden();
    await expect(page.locator('#vplay')).toBeHidden();
    await expect(page.locator('#vset')).toBeHidden();
    await expect(page.locator('#tscore')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('#bset')).toHaveAttribute('aria-pressed', 'false');
    await page.locator('#tscore').click();
    await expect(page.locator('#vplay')).toBeVisible();
    await expect(page.locator('#vscore')).toBeHidden();
    await expect(page.locator('#tscore')).toHaveAttribute('aria-pressed', 'false');
  });

  test('«Счёт» закрывается при переходе в настройки и подсказки', async ({ page }) => {
    await boot(page);
    await openTab(page, 'score');
    await expect(page.locator('#vscore')).toBeVisible();
    await openTab(page, 'settings');
    await expect(page.locator('#vscore')).toBeHidden();
    await expect(page.locator('#tscore')).toHaveAttribute('aria-pressed', 'false');
    await expect(page.locator('#bset')).toHaveAttribute('aria-pressed', 'true');
    await openTab(page, 'play');
    await expect(page.locator('#vplay')).toBeVisible();
    await expect(page.locator('#bset')).toHaveAttribute('aria-pressed', 'false');
  });

  test('управление перенесено в карточку урока и стало иконками', async ({ page }) => {
    await boot(page);
    const layout = await page.evaluate(() => {
      const ids = ['bprev', 'brst', 'bplay', 'bnext'];
      const card = document.getElementById('bplay').closest('.card');
      return {
        inCard: !!card,
        sameCard: ids.every(id => card && card.contains(document.getElementById(id))),
        oldRow: document.querySelectorAll('.tr').length,
        icons: document.querySelectorAll('#bprev svg, #brst svg, #bnext svg').length,
        playIcons: document.querySelectorAll('#bplay svg').length,
        chips: document.querySelectorAll('#tempos .chip').length,
        order: [...document.querySelectorAll('.tbtns .ic')].map(e => e.id),
        widths: ids.map(id => Math.round(document.getElementById(id).getBoundingClientRect().width)),
        heights: ids.map(id => Math.round(document.getElementById(id).getBoundingClientRect().height)),
        prevStroke: document.querySelector('#bprev svg').getAttribute('stroke'),
        playFill: document.querySelector('#bplay svg').getAttribute('fill'),
      };
    });
    expect(layout.inCard).toBe(true);
    expect(layout.sameCard).toBe(true);
    expect(layout.oldRow).toBe(0);
    expect(layout.icons).toBe(3);
    expect(layout.playIcons).toBe(2);
    expect(layout.chips).toBe(3);
    expect(layout.order).toEqual(['brst', 'bprev', 'bplay', 'bnext']);
    expect(new Set(layout.widths).size).toBe(1);
    expect(new Set(layout.heights).size).toBe(1);
    expect(layout.heights[0]).toBeGreaterThanOrEqual(36);
    expect(layout.widths[0]).toBe(layout.heights[0]);
    expect(layout.prevStroke).toBe('currentColor');
    expect(layout.playFill).toBe('currentColor');
    await expect(page.locator('#bplay')).toHaveText('Старт (пробел)');
    await expect(page.locator('#bplay')).toHaveAttribute('aria-label', /Старт/);
  });

  test('выбор темпа и кнопки транспорта стоят в одну строку', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await boot(page);
    const rows = await page.evaluate(() => {
      const tops = sel => [...document.querySelectorAll(sel)].map(e => Math.round(e.getBoundingClientRect().top));
      const mid = sel => {
        const r = document.querySelector(sel).getBoundingClientRect();
        return Math.round(r.top + r.height / 2);
      };
      const card = document.getElementById('pg').getBoundingClientRect();
      const bp = document.getElementById('bplay').getBoundingClientRect();
      const spans = [...document.querySelectorAll('#pg .pgr span')].map(e => Math.round(e.getBoundingClientRect().right));
      const ctl = document.querySelector('.ctl');
      return {
        progress: tops('#pg .pgr span'),
        transport: tops('.tbtns .ic'),
        tempoRow: ['#m5', '#tempos', '#p5', '#bdem'].map(mid),
        playMid: Math.round(bp.left + bp.width / 2),
        cardMid: Math.round(card.left + card.width / 2),
        overflow: ctl.scrollWidth - ctl.clientWidth,
        cardRight: Math.round(card.right),
        spans,
      };
    });
    expect(new Set(rows.progress).size).toBe(1);
    expect(new Set(rows.transport).size).toBe(1);
    expect(new Set(rows.tempoRow).size).toBe(1);
    expect(rows.playMid).toBe(rows.cardMid);
    expect(rows.overflow).toBeLessThanOrEqual(1);
    expect(Math.max(...rows.spans)).toBeLessThanOrEqual(rows.cardRight);
  });

  test('подсказки игрового окна прячутся в кружок ? и не занимают высоту', async ({ page }) => {
    await boot(page);
    await expect(page.locator('#hb')).toBeHidden();
    await expect(page.locator('#bhud')).toHaveAttribute('aria-expanded', 'false');
    const before = await page.evaluate(() => document.getElementById('hud').getBoundingClientRect().height);
    await page.locator('#bhud').click();
    await expect(page.locator('#hb')).toBeVisible();
    await expect(page.locator('#bhud')).toHaveAttribute('aria-expanded', 'true');
    await expect(page.locator('#hb')).toContainText('Круги сверху');
    const shown = await page.evaluate(() => {
      const el = document.getElementById('hb');
      return {
        pos: getComputedStyle(el).position,
        card: document.getElementById('hud').getBoundingClientRect().height,
        onCard: Math.abs(el.getBoundingClientRect().top - document.getElementById('hud').getBoundingClientRect().top) < 200,
        dotRight: Math.round(document.getElementById('bhud').getBoundingClientRect().right),
        prowRight: Math.round(document.querySelector('.prow').getBoundingClientRect().right),
      };
    });
    expect(shown.pos).toBe('absolute');
    expect(shown.onCard).toBe(true);
    expect(shown.dotRight).toBe(shown.prowRight);
    expect(Math.abs(shown.card - before)).toBeLessThan(1);
    await page.keyboard.press('Escape');
    await expect(page.locator('#hb')).toBeHidden();
    await page.locator('#bhud').click();
    await page.locator('#pname').click();
    await expect(page.locator('#hb')).toBeHidden();
  });

  test('справка идёт от игры к клавишам и пишет с заглавной', async ({ page }) => {
    await boot(page);
    await openTab(page, 'help');
    const help = await page.evaluate(() => ({
      heads: [...document.querySelectorAll('#vhelp .card h2')].map(e => e.textContent),
      dds: [...document.querySelectorAll('#vhelp dd')].map(e => e.textContent.trim()),
    }));
    expect(help.heads).toEqual(['Как играть', 'Как заниматься', 'Горячие клавиши']);
    expect(help.dds.filter(t => /(?:^|\.\s+)[а-яё]/.test(t))).toEqual([]);
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

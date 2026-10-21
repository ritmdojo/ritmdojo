const { test, expect } = require('@playwright/test');
const { boot, readState, openTab, watchErrors, expectNoErrors } = require('./helpers');

test.describe('загрузка и исходное состояние', () => {
  test('разметка, PWA-ссылки и отсутствие ошибок', async ({ page }) => {
    const errors = watchErrors(page);
    await boot(page);
    await expect(page).toHaveTitle('RitmDojo: ритм-тренажёр для гитары');
    await expect(page.locator('h1')).toHaveText('RitmDojo');
    await expect(page.locator('p.sub')).toContainText('Голос считает четверти');
    await expect(page.locator('link[rel=manifest]')).toHaveAttribute('href', 'manifest.json');
    await expect(page.locator('link[rel=icon]')).toHaveAttribute('href', 'icon-192.png');
    await expect(page.locator('link[rel=apple-touch-icon]')).toHaveAttribute('href', 'apple-touch-icon.png');
    await expect(page.locator('meta[name=theme-color]')).toHaveCount(2);
    await expectNoErrors(errors);
  });

  test('глобальная модель данных и дефолтные настройки', async ({ page }) => {
    await boot(page);
    const state = await readState(page);
    expect(state.cur).toBe(0);
    expect(state.shift).toBe(0);
    expect(state.opt).toMatchObject({
      loop: false,
      count: true,
      CB: 2,
      L: 2,
      P: 4,
      V: true,
      D: 150,
      G: 130,
      N: true,
      NP: false,
      NG: 100,
      GM: false,
      S: 60,
      CAL: 0,
      CALD: false,
      OUT: '',
      MIC: '',
      HI: 0,
      best: {},
      rec: {},
    });
    expect(state.opt.O).toMatchObject({ c: 0, t: 0, n: 0, v: 0 });
    expect(await page.evaluate(() => B.length)).toBe(123);
    expect(await page.evaluate(() => EX.map(x => x.t))).toEqual([
      'Четверти',
      'Восьмые',
      'Шестнадцатые',
      'Восьмые триоли',
      'Шестнадцатые триоли',
      'Ноты с точкой',
      'Ноты с двумя точками',
      'Синкопа',
    ]);
  });

  test('исходный интерфейс и полоса рисунка', async ({ page }) => {
    await boot(page);
    await expect(page.locator('#sx')).toHaveValue('0');
    await expect(page.locator('#sp')).toHaveValue('0');
    await expect(page.locator('#bpm')).toHaveText('60');
    await expect(page.locator('#tempos button')).toHaveText(['60', '80', '100']);
    await expect(page.locator('#tempos button.on')).toHaveText('60');
    await expect(page.locator('#pname')).toHaveText('Четверти. Все четверти');
    await expect(page.locator('#pgt1')).toHaveText('Прошло 0:00');
    await expect(page.locator('#pgt2')).toHaveText('Осталось 45:16');
    await expect(page.locator('#pgt3')).toHaveText('Всего 45:16');
    await expect(page.locator('#pgt4')).toHaveText('Урок 1 из 123');
    await expect(page.locator('#pgf')).toHaveCSS('width', '0px');
    await expect(page.locator('#phase')).toHaveText('Стоп');
    await expect(page.locator('#bars')).toHaveText('');
    await expect(page.locator('#bplay')).toHaveText('Старт (пробел)');
    await expect(page.locator('#vscore')).toBeHidden();
    await expect(page.locator('#vset')).toBeHidden();
    await expect(page.locator('#vhelp')).toBeHidden();
    await expect(page.locator('#bhelp')).toHaveAttribute('aria-pressed', 'false');
    await expect(page.locator('#bsave')).toHaveCount(0);
    expect(await page.evaluate(() => window.claude)).toBeUndefined();
    await expect(page.locator('#mst')).toHaveText('');
    await expect(page.locator('#lneedle')).toHaveAttribute('transform', 'translate(0 0)');
    await expect(page.locator('#lfoot')).toHaveAttribute('transform', 'translate(0 0)');
    expect(await page.evaluate(() => document.querySelectorAll('#wm rect').length)).toBeGreaterThan(50);
    await expect(page.locator('#strip .gr span')).toHaveCount(8);
    await expect(page.locator('#strip .gr span.bt')).toHaveText(['1', '2', '3', '4']);
    await expect(page.locator('#strip .nt b')).toHaveCount(4);
    await expect(page.locator('#strip .nt b.a')).toHaveCount(1);
    await expect(page.locator('#strip .ft span.d')).toHaveCount(4);
    await expect(page.locator('#strip #ph')).toHaveAttribute('style', 'left:0%');
    await expect(page.locator('#strip')).not.toHaveClass(/mute/);
    await expect(page.locator('#hl')).toHaveText('1 из 123');
    await expect(page.locator('#hs')).toHaveText('0');
    await expect(page.locator('#hc')).toHaveText('x1, серия 0');
    await expect(page.locator('#ha')).toHaveText('-');
    await expect(page.locator('#hst')).toHaveText('0 из 369');
    await expect(page.locator('#hh')).toHaveText('0');
    await expect(page.locator('#hg i')).toHaveCount(21);
    await expect(page.locator('#tm')).toHaveText('Тайминг: пока нет данных');
    await expect(page.locator('#lst')).toContainText('Детектор: выключен');
  });

  test('настройки синхронизированы с opt', async ({ page }) => {
    await boot(page);
    await openTab(page, 'settings');
    await expect(page.locator('#vset')).toBeVisible();
    await expect(page.locator('#bset')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('#oloop')).not.toBeChecked();
    await expect(page.locator('#ocnt')).toBeChecked();
    await expect(page.locator('#ocb')).toHaveValue('2');
    await expect(page.locator('#ocb')).toBeEnabled();
    await expect(page.locator('#oL')).toHaveValue('2');
    await expect(page.locator('#oP')).toHaveValue('4');
    await expect(page.locator('#ovoc')).toBeChecked();
    await expect(page.locator('#ovol')).toHaveValue('130');
    await expect(page.locator('#ovolv')).toHaveText('130%');
    await expect(page.locator('#onote')).toBeChecked();
    await expect(page.locator('#onp')).not.toBeChecked();
    await expect(page.locator('#onv')).toHaveValue('100');
    await expect(page.locator('#onvv')).toHaveText('100%');
    await expect(page.locator('#ogm')).not.toBeChecked();
    await expect(page.locator('#osn')).toHaveValue('60');
    await expect(page.locator('#min')).toHaveValue('Системный вход');
    await expect(page.locator('#min option')).toHaveCount(1);
  });

  test('B разложен по теме, рисунку и темпу', async ({ page }) => {
    await boot(page);
    const blocks = await page.evaluate(() => B.slice(0, 20).map(b => ({ ...b })));
    expect(blocks[0]).toEqual({ xi: 0, pi: 0, ti: 0, bpm: 60 });
    expect(blocks[1]).toEqual({ xi: 0, pi: 0, ti: 1, bpm: 80 });
    expect(blocks[2]).toEqual({ xi: 0, pi: 0, ti: 2, bpm: 100 });
    expect(blocks[3]).toEqual({ xi: 0, pi: 1, ti: 0, bpm: 60 });
    expect(blocks[15]).toEqual({ xi: 1, pi: 0, ti: 0, bpm: 60 });
    expect(await page.evaluate(() => B[122])).toEqual({ xi: 7, pi: 4, ti: 2, bpm: 90 });
  });

  test('g() разбирает рисунок, а e() считает длительности и акценты', async ({ page }) => {
    await boot(page);
    const result = await page.evaluate(() => ({
      g: g('Xx.x', .5),
      spaced: g('X x . x', .25),
      e: e([0, 1.5, 3]),
      off: e([0, .5, 1.5, 2, 3], 1),
    }));
    expect(result.g).toEqual([
      [0, true, .5],
      [.5, false, .5],
      [1.5, false, .5],
    ]);
    expect(result.spaced).toEqual([
      [0, true, .25],
      [.25, false, .25],
      [.75, false, .25],
    ]);
    expect(result.e).toEqual([
      [0, true, 1.5],
      [1.5, false, 1.5],
      [3, true, 1],
    ]);
    expect(result.off).toEqual([
      [0, false, .5],
      [.5, true, 1],
      [1.5, true, .5],
      [2, false, 1],
      [3, false, 1],
    ]);
  });

  test('события не выходят за такт, а последняя нота замыкает его одинаково у g() и e()', async ({ page }) => {
    await boot(page);
    const out = await page.evaluate(() => {
      const outside = [];
      EX.forEach((x, xi) => x.p.forEach((p, pi) => p[1].forEach(([s, a, d], ei) => {
        if (!(s >= 0 && d > 0 && s + d <= 4 + 1e-9)) outside.push([xi, pi, ei, s, d]);
      })));
      const end = ev => ev.at(-1)[0] + ev.at(-1)[2];
      return { outside, filled: [end(g('Xxxx', 1)), end(g('Xxxxxxxx', .5))], rest: end(g('X...', 1)), abs: end(e([0, 3])) };
    });
    expect(out.outside).toEqual([]);
    expect(out.filled).toEqual([4, 4]);
    expect(out.rest).toBe(1);
    expect(out.abs).toBe(4);
  });

  test('find, bpmOf и ограничения темпа', async ({ page }) => {
    await boot(page);
    const data = await page.evaluate(() => {
      const findAt = {
        '0,0,0': find(0, 0, 0),
        '0,1,0': find(0, 1, 0),
        '1,0,0': find(1, 0, 0),
        '5,0,0': find(5, 0, 0),
        '5,5,2': find(5, 5, 2),
        '6,0,0': find(6, 0, 0),
        '7,0,0': find(7, 0, 0),
        '7,4,2': find(7, 4, 2),
        missing: find(9, 0, 0),
      };
      shift = 60;
      const high = bpmOf(0);
      shift = -100;
      const low = bpmOf(0);
      shift = 1000;
      const top = bpmOf(122);
      shift = 0;
      return { findAt, high, low, top, back: bpmOf(0) };
    });
    expect(data.findAt).toEqual({
      '0,0,0': 0,
      '0,1,0': 3,
      '1,0,0': 15,
      '5,0,0': 75,
      '5,5,2': 92,
      '6,0,0': 93,
      '7,0,0': 108,
      '7,4,2': 122,
      missing: -1,
    });
    expect(data.high).toBe(120);
    expect(data.low).toBe(30);
    expect(data.top).toBe(240);
    expect(data.back).toBe(60);
  });
});

test.describe('отрисовка рисунка', () => {
  test('сетка подстраивается под длительности', async ({ page }) => {
    await boot(page);
    const grid = async (xi, pi) => {
      await page.selectOption('#sx', String(xi));
      await page.selectOption('#sp', String(pi));
      return page.evaluate(() => {
        const row = document.querySelector('#strip .gr');
        const spans = [...row.querySelectorAll('span')];
        return {
          columns: row.getAttribute('style'),
          labels: spans.map(s => s.textContent),
          triplets: spans.filter(s => s.classList.contains('tc')).length,
          notes: document.querySelectorAll('#strip .nt b').length,
        };
      });
    };
    const quarters = await grid(0, 0);
    expect(quarters.columns).toBe('grid-template-columns:repeat(8,1fr)');
    expect(quarters.labels).toEqual(['1', 'и', '2', 'и', '3', 'и', '4', 'и']);
    expect(quarters.notes).toBe(4);
    expect(quarters.triplets).toBe(0);

    const sixteenths = await grid(2, 0);
    expect(sixteenths.columns).toBe('grid-template-columns:repeat(16,1fr)');
    expect(sixteenths.labels).toEqual(['1', '', 'и', '', '2', '', 'и', '', '3', '', 'и', '', '4', '', 'и', '']);
    expect(sixteenths.notes).toBe(16);

    const triplets = await grid(3, 0);
    expect(triplets.columns).toBe('grid-template-columns:repeat(12,1fr)');
    expect(triplets.labels).toEqual(['1', 'и', '', '2', 'и', '', '3', 'и', '', '4', 'и', '']);
    expect(triplets.triplets).toBe(12);
    expect(triplets.notes).toBe(12);

    const sixteenthTriplets = await grid(4, 0);
    expect(sixteenthTriplets.columns).toBe('grid-template-columns:repeat(24,1fr)');
    expect(sixteenthTriplets.notes).toBe(24);

    const dotted = await grid(5, 0);
    expect(dotted.columns).toBe('grid-template-columns:repeat(8,1fr)');
    expect(dotted.notes).toBe(4);

    const doubleDotted = await grid(6, 0);
    expect(doubleDotted.columns).toBe('grid-template-columns:repeat(16,1fr)');
    expect(doubleDotted.notes).toBe(4);

    const syncope = await grid(7, 0);
    expect(syncope.columns).toBe('grid-template-columns:repeat(8,1fr)');
    expect(syncope.notes).toBe(4);
  });

  test('длительности и акценты событий видны в полосе', async ({ page }) => {
    await boot(page);
    await page.evaluate(() => drawStrip(['Проверка', [[0, true, 1], [1.5, false, .5], [3, true, 1]]]));
    await expect(page.locator('#strip .nt b')).toHaveCount(3);
    const widths = await page.evaluate(() => [...document.querySelectorAll('#strip .nt b')].map(b => b.getAttribute('style')));
    expect(widths[0]).toContain('left:0%');
    expect(widths[0]).toContain('width:calc(25% - 3px)');
    expect(widths[1]).toContain('left:37.5%');
    expect(widths[1]).toContain('width:calc(12.5% - 3px)');
    expect(widths[2]).toContain('left:75%');
    expect(widths[2]).toContain('width:calc(25% - 3px)');
    const accents = await page.evaluate(() => [...document.querySelectorAll('#strip .nt b')].map(b => b.classList.contains('a')));
    expect(accents).toEqual([true, false, true]);
  });
});

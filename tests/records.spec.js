const { test, expect } = require('@playwright/test');
const { boot, readState, openTab, watchErrors, expectNoErrors } = require('./helpers');

const game = {
  opt: { L: 0, P: 1, count: false, V: false, N: false, GM: true },
  cur: 2,
  shift: 0,
};

test.describe('таблица рекордов', () => {
  test('пустая таблица подсказывает сыграть уровень', async ({ page }) => {
    await boot(page);
    await openTab(page, 'score');
    await expect(page.locator('#rt tbody tr')).toHaveCount(0);
    await expect(page.locator('#rte')).toHaveText('Рекордов пока нет: сыграйте уровень в тактах «Играй».');
  });

  test('рекорды сортируются по звёздам, затем по точности', async ({ page }) => {
    await boot(page, {
      opt: {
        L: 0,
        P: 1,
        rec: {
          5: { a: 88, st: 2, bpm: 80 },
          2: { a: 96, st: 3, bpm: 100 },
          7: { a: 96, st: 0, bpm: 60 },
        },
      },
      cur: 0,
    });
    await openTab(page, 'score');
    const rows = page.locator('#rt tbody tr');
    await expect(rows).toHaveCount(3);
    await expect(rows.nth(0)).toContainText('Четверти. Все четверти');
    await expect(rows.nth(0)).toContainText('96%');
    await expect(rows.nth(0)).toContainText('100');
    await expect(rows.nth(0).locator('.st b')).toHaveCount(3);
    await expect(rows.nth(1)).toContainText('88%');
    await expect(rows.nth(1).locator('.st b')).toHaveCount(2);
    await expect(rows.nth(2)).toContainText('96%');
    await expect(rows.nth(2).locator('.st b')).toHaveCount(0);
    await expect(page.locator('#rte')).toHaveText('Лучшие 3 из 3. Рекорд обновляется по точности, звёзды не сбрасываются.');
  });

  test('result записывает точность и звёзды в opt.rec и в localStorage', async ({ page }) => {
    await boot(page, game);
    const data = await page.evaluate(() => {
      gs = { n: 4, p: 3, g: 1, x: 0, m: 0, d: [] };
      R = null;
      const res = result(2);
      return {
        a: res.a,
        st: res.st,
        rec: opt.rec[2],
        saved: JSON.parse(localStorage.getItem('rt2')).opt.rec[2],
        rows: document.querySelectorAll('#rt tbody tr').length,
      };
    });
    expect(data.a).toBe(90);
    expect(data.st).toBe(3);
    expect(data.rec).toMatchObject({ a: 90, st: 3, bpm: 100 });
    expect(data.saved).toMatchObject({ a: 90, st: 3, bpm: 100 });
    expect(data.rows).toBe(1);
  });

  test('слабое повторение не понижает рекорд и звёзды', async ({ page }) => {
    await boot(page, {
      opt: { ...game.opt, rec: { 2: { a: 96, st: 3, bpm: 100 } }, best: { 2: 3 } },
      cur: 2,
    });
    const data = await page.evaluate(() => {
      gs = { n: 4, p: 2, g: 1, x: 1, m: 0, d: [] };
      R = null;
      const res = result(2);
      return { a: res.a, st: res.st, rec: opt.rec[2], best: opt.best[2] };
    });
    expect(data.a).toBeCloseTo(57.5, 6);
    expect(data.st).toBe(0);
    expect(data.rec).toEqual({ a: 96, st: 3, bpm: 100 });
    expect(data.best).toBe(3);
  });

  test('после игры таблица показывает последний результат без ошибок', async ({ page }) => {
    const errors = watchErrors(page);
    await boot(page, game);
    const upd = await page.evaluate(() => {
      gs = { n: 4, p: 4, g: 0, x: 0, m: 0, d: [] };
      R = null;
      result(2);
      hudUpd();
      return { stars: document.getElementById('hst').textContent, rows: document.querySelectorAll('#rt tbody tr').length };
    });
    expect(upd.stars).toBe('3 из 369');
    expect(upd.rows).toBe(1);
    expect((await readState(page)).opt.rec[2].a).toBe(100);
    await openTab(page, 'score');
    await expect(page.locator('#rt tbody tr').nth(0).locator('.st b')).toHaveCount(3);
    await expectNoErrors(errors);
  });
});

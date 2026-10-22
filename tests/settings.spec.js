const { test, expect } = require('@playwright/test');
const { boot, readState, openTab, watchErrors, expectNoErrors } = require('./helpers');

async function setRange(page, selector, value) {
  await page.locator(selector).evaluate((el, v) => {
    el.value = String(v);
    el.dispatchEvent(new Event('input', { bubbles: true }));
  }, value);
}

test.describe('настройки и сохранения', () => {
  test('чекбоксы и числа меняют opt и сохраняются', async ({ page }) => {
    await boot(page);
    await openTab(page, 'settings');
    await page.locator('#oloop').check();
    await page.locator('#ocnt').uncheck();
    await page.locator('#oL').fill('5');
    await page.locator('#oL').press('Tab');
    await page.locator('#oP').fill('7');
    await page.locator('#oP').press('Tab');
    await page.locator('#ovoc').uncheck();
    await page.locator('#onote').uncheck();
    await page.locator('#onp').check();
    const state = await readState(page);
    expect(state.opt).toMatchObject({ loop: true, count: false, L: 5, P: 7, V: false, N: false, NP: true });
    expect(state.saved.opt).toMatchObject({ loop: true, count: false, L: 5, P: 7, V: false, N: false, NP: true });
    await expect(page.locator('#oloop')).toBeChecked();
    await expect(page.locator('#ocnt')).not.toBeChecked();
    await expect(page.locator('#oL')).toHaveValue('5');
    await expect(page.locator('#oP')).toHaveValue('7');
    await expect(page.locator('#ovoc')).not.toBeChecked();
    await expect(page.locator('#onote')).not.toBeChecked();
    await expect(page.locator('#onp')).toBeChecked();
  });

  test('количество тактов зажимается в диапазонах 0–8 и 1–16', async ({ page }) => {
    await boot(page);
    await openTab(page, 'settings');
    await page.locator('#oL').fill('99');
    await page.locator('#oL').press('Tab');
    await expect(page.locator('#oL')).toHaveValue('8');
    expect((await readState(page)).opt.L).toBe(8);
    await page.locator('#oL').fill('-5');
    await page.locator('#oL').press('Tab');
    await expect(page.locator('#oL')).toHaveValue('0');
    expect((await readState(page)).opt.L).toBe(0);
    await page.locator('#oP').fill('0');
    await page.locator('#oP').press('Tab');
    await expect(page.locator('#oP')).toHaveValue('1');
    expect((await readState(page)).opt.P).toBe(1);
    await page.locator('#oP').fill('99');
    await page.locator('#oP').press('Tab');
    await expect(page.locator('#oP')).toHaveValue('16');
    expect((await readState(page)).opt.P).toBe(16);
  });

  test('такт счёта: выбор одного или двух тактов и блокировка без счёта', async ({ page }) => {
    await boot(page);
    await openTab(page, 'settings');
    await expect(page.locator('#ocb')).toHaveValue('2');
    await expect(page.locator('#ocb')).toBeEnabled();
    await page.selectOption('#ocb', '1');
    expect((await readState(page)).opt.CB).toBe(1);
    expect((await readState(page)).saved.opt.CB).toBe(1);
    await page.locator('#ocnt').uncheck();
    await expect(page.locator('#ocb')).toBeDisabled();
    await page.locator('#ocnt').check();
    await expect(page.locator('#ocb')).toBeEnabled();
    await expect(page.locator('#ocb')).toHaveValue('1');
  });

  test('громкость голоса и рисунка обновляет подписи и opt', async ({ page }) => {
    await boot(page);
    await openTab(page, 'settings');
    await setRange(page, '#ovol', 0);
    await expect(page.locator('#ovolv')).toHaveText('0%');
    await setRange(page, '#ovol', 200);
    await expect(page.locator('#ovolv')).toHaveText('200%');
    await setRange(page, '#onv', 55);
    await expect(page.locator('#onvv')).toHaveText('55%');
    const state = await readState(page);
    expect(state.opt.G).toBe(200);
    expect(state.opt.NG).toBe(55);
    expect(state.saved.opt.G).toBe(200);
    expect(state.saved.opt.NG).toBe(55);
  });

  test('чувствительность меняет порог детектора', async ({ page }) => {
    await boot(page);
    await openTab(page, 'settings');
    const threshold = s => .002 * Math.pow(50, (100 - s) / 100);
    await setRange(page, '#osn', 0);
    expect(await page.evaluate(() => opt.S)).toBe(0);
    expect(await page.evaluate(() => thr())).toBeCloseTo(threshold(0), 12);
    await setRange(page, '#osn', 100);
    expect(await page.evaluate(() => opt.S)).toBe(100);
    expect(await page.evaluate(() => thr())).toBeCloseTo(threshold(100), 12);
    expect((await readState(page)).saved.opt.S).toBe(100);
    await expect(page.locator('#osn')).toHaveValue('100');
  });

  test('lvl учитывает N, NP и NG для слушания и игры', async ({ page }) => {
    await boot(page);
    const levels = await page.evaluate(() => {
      opt.N = false;
      const off = [lvl(false), lvl(true)];
      opt.N = true;
      opt.NP = false;
      opt.NG = 80;
      const onlyListen = [lvl(false), lvl(true)];
      opt.NP = true;
      const both = [lvl(false), lvl(true)];
      opt.NG = 0;
      const muted = [lvl(false), lvl(true)];
      return { off, onlyListen, both, muted };
    });
    expect(levels.off).toEqual([0, 0]);
    expect(levels.onlyListen).toEqual([.8, 0]);
    expect(levels.both).toEqual([.8, .8]);
    expect(levels.muted).toEqual([0, 0]);
  });

  test('все настройки и позиция восстанавливаются после перезагрузки', async ({ page }) => {
    await boot(page);
    await page.selectOption('#sx', '1');
    await page.selectOption('#sp', '2');
    await page.locator('#tempos button').nth(2).click();
    await page.keyboard.press('=');
    await page.keyboard.press('=');
    await openTab(page, 'settings');
    await page.locator('#oloop').check();
    await page.locator('#oL').fill('1');
    await page.locator('#oL').press('Tab');
    await page.locator('#oP').fill('3');
    await page.locator('#oP').press('Tab');
    await page.locator('#ovoc').uncheck();
    await page.locator('#onote').uncheck();
    await page.locator('#onp').check();
    await setRange(page, '#ovol', 200);
    await setRange(page, '#onv', 0);
    await setRange(page, '#osn', 0);
    const before = await readState(page);
    expect(before.cur).toBe(23);
    await page.reload();
    await page.waitForFunction(() => typeof B !== 'undefined');
    const after = await readState(page);
    expect(after.cur).toBe(23);
    expect(after.shift).toBe(10);
    expect(after.opt).toMatchObject({
      loop: true,
      L: 1,
      P: 3,
      V: false,
      N: false,
      NP: true,
      G: 200,
      NG: 0,
      S: 0,
    });
    await expect(page.locator('#sx')).toHaveValue('1');
    await expect(page.locator('#sp')).toHaveValue('2');
    await expect(page.locator('#tempos button.on')).toHaveText('110');
    await expect(page.locator('#bpm')).toHaveText('110');
    await expect(page.locator('#pgt4')).toHaveText('Урок 24 из 123');
    await expect(page.locator('#oloop')).toBeChecked();
    await expect(page.locator('#oL')).toHaveValue('1');
    await expect(page.locator('#oP')).toHaveValue('3');
    await expect(page.locator('#ovoc')).not.toBeChecked();
    await expect(page.locator('#onote')).not.toBeChecked();
    await expect(page.locator('#onp')).toBeChecked();
    await expect(page.locator('#ovol')).toHaveValue('200');
    await expect(page.locator('#onv')).toHaveValue('0');
    await expect(page.locator('#osn')).toHaveValue('0');
  });

  test('неизвестный cur игнорируется, частичный opt дополняется дефолтами', async ({ page }) => {
    await boot(page, { cur: 9999, opt: { L: 1, zzz: 'ignored' } });
    const state = await readState(page);
    expect(state.cur).toBe(0);
    expect(state.opt.L).toBe(1);
    expect(state.opt.P).toBe(4);
    expect(state.opt.loop).toBe(false);
    expect(state.opt.zzz).toBe('ignored');
    await expect(page.locator('#oL')).toHaveValue('1');
    await expect(page.locator('#oP')).toHaveValue('4');
    await expect(page.locator('#oret')).toBeChecked();
  });

  test('битый JSON и нечисловой shift не ломают загрузку', async ({ page }) => {
    await page.addInitScript(() => {
      if (!sessionStorage.getItem('__bad_seed')) {
        localStorage.setItem('rt2', '{битый json');
        sessionStorage.setItem('__bad_seed', '1');
      }
    });
    const errors = watchErrors(page);
    await boot(page);
    const state = await readState(page);
    expect(state.cur).toBe(0);
    expect(state.shift).toBe(0);
    expect(state.opt.L).toBe(2);
    await page.evaluate(() => localStorage.setItem('rt2', JSON.stringify({ shift: 'abc', cur: 0 })));
    await page.reload();
    await page.waitForFunction(() => typeof B !== 'undefined');
    expect(await page.evaluate(() => shift)).toBe(0);
    await expectNoErrors(errors);
  });

  test('при включённой игре результат доступен на вкладке «Счёт»', async ({ page }) => {
    await boot(page, { opt: { GM: true } });
    await expect(page.locator('#vscore')).toBeHidden();
    await openTab(page, 'score');
    await expect(page.locator('#hst')).toBeVisible();
    await expect(page.locator('#rt')).toBeVisible();
    await expect(page.locator('#hud')).toBeHidden();
    await expect(page.locator('#tscore')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('#mst')).toHaveText('Нажмите Старт, чтобы включить вход');
    await expect(page.locator('#ogm')).toBeChecked();
  });

  test('ошибки записи localStorage не ломают страницу', async ({ page }) => {
    await page.addInitScript(() => {
      const original = Storage.prototype.setItem;
      Storage.prototype.setItem = function (key, value) {
        if (key === 'rt2') throw new Error('storage denied');
        return original.call(this, key, value);
      };
    });
    const errors = watchErrors(page);
    await boot(page);
    await openTab(page, 'settings');
    await page.locator('#oloop').check();
    await page.locator('#oL').fill('3');
    await page.locator('#oL').press('Tab');
    await expect(page.locator('#oloop')).toBeChecked();
    await expect(page.locator('#oL')).toHaveValue('3');
    await expectNoErrors(errors);
  });
});

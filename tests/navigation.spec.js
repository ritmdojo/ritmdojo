const { test, expect } = require('@playwright/test');
const { boot, readState } = require('./helpers');

test.describe('навигация по урокам', () => {
  test('смена темы сбрасывает рисунок и темп', async ({ page }) => {
    await boot(page);
    await page.selectOption('#sx', '2');
    await expect(page.locator('#sx')).toHaveValue('2');
    await expect(page.locator('#sp')).toHaveValue('0');
    await expect(page.locator('#sp option')).toHaveCount(5);
    await expect(page.locator('#pname')).toHaveText('Шестнадцатые. Сплошные: 1 е и а');
    await expect(page.locator('#bpm')).toHaveText('50');
    await expect(page.locator('#tempos button')).toHaveText(['50', '65', '80']);
    await expect(page.locator('#tempos button.on')).toHaveText('50');
    await expect(page.locator('#pgt4')).toHaveText('Урок 31 из 123');
    await expect(page.locator('#strip .gr span')).toHaveCount(16);
    expect((await readState(page)).cur).toBe(30);
  });

  test('смена рисунка сбрасывает темп на первый', async ({ page }) => {
    await boot(page);
    await page.locator('#tempos button').nth(2).click();
    await expect(page.locator('#bpm')).toHaveText('100');
    await page.selectOption('#sp', '2');
    await expect(page.locator('#pname')).toHaveText('Четверти. Только 2 и 4');
    await expect(page.locator('#bpm')).toHaveText('60');
    await expect(page.locator('#tempos button.on')).toHaveText('60');
    expect((await readState(page)).cur).toBe(6);
  });

  test('чипы темпа выбирают блок и сохраняются', async ({ page }) => {
    await boot(page);
    await page.locator('#tempos button').nth(1).click();
    await expect(page.locator('#bpm')).toHaveText('80');
    await expect(page.locator('#tempos button.on')).toHaveText('80');
    await expect(page.locator('#pname')).toHaveText('Четверти. Все четверти');
    const state = await readState(page);
    expect(state.cur).toBe(1);
    expect(state.saved.cur).toBe(1);
    await page.reload();
    await expect(page.locator('#bpm')).toHaveText('80');
    await expect(page.locator('#tempos button.on')).toHaveText('80');
  });

  test('тема с шестью рисунками показывает все варианты', async ({ page }) => {
    await boot(page);
    await page.selectOption('#sx', '5');
    await expect(page.locator('#sp option')).toHaveCount(6);
    await expect(page.locator('#sp option').last()).toHaveText('6. Половинная с точкой + четверть');
    await page.selectOption('#sp', '5');
    await expect(page.locator('#pname')).toHaveText('Ноты с точкой. Половинная с точкой + четверть');
    expect((await readState(page)).cur).toBe(90);
  });

  test('кнопки Назад и Дальше закольцованы', async ({ page }) => {
    await boot(page);
    await page.locator('#bprev').click();
    await expect(page.locator('#pgt4')).toHaveText('Урок 123 из 123');
    await page.locator('#bnext').click();
    await expect(page.locator('#pgt4')).toHaveText('Урок 1 из 123');
    await page.locator('#bnext').click();
    await expect(page.locator('#pgt4')).toHaveText('Урок 2 из 123');
  });

  test('стрелки влево и вправо двигают темп', async ({ page }) => {
    await boot(page);
    await page.keyboard.press('ArrowRight');
    await expect(page.locator('#bpm')).toHaveText('80');
    await expect(page.locator('#tempos button.on')).toHaveText('80');
    await page.keyboard.press('ArrowRight');
    await expect(page.locator('#bpm')).toHaveText('100');
    await page.keyboard.press('ArrowLeft');
    await expect(page.locator('#bpm')).toHaveText('80');
    await page.keyboard.press('ArrowLeft');
    await expect(page.locator('#bpm')).toHaveText('60');
    await page.keyboard.press('ArrowLeft');
    await expect(page.locator('#pgt4')).toHaveText('Урок 123 из 123');
    await page.keyboard.press('ArrowRight');
    await expect(page.locator('#pgt4')).toHaveText('Урок 1 из 123');
  });

  test('стрелки вверх и вниз двигают рисунок в первом темпе', async ({ page }) => {
    await boot(page);
    const firstPatternIndexes = await page.evaluate(() => B.map((b, i) => b.ti == 0 ? i : -1).filter(i => i >= 0));
    await page.keyboard.press('ArrowDown');
    await expect(page.locator('#pgt4')).toHaveText(`Урок ${firstPatternIndexes[1] + 1} из 123`);
    await page.keyboard.press('ArrowUp');
    await expect(page.locator('#pgt4')).toHaveText('Урок 1 из 123');
    await page.keyboard.press('ArrowUp');
    await expect(page.locator('#pgt4')).toHaveText(`Урок ${firstPatternIndexes.at(-1) + 1} из 123`);
    await page.keyboard.press('ArrowDown');
    await expect(page.locator('#pgt4')).toHaveText('Урок 1 из 123');
  });

  test('цифры 1–8 открывают первую тему', async ({ page }) => {
    await boot(page);
    const starts = [0, 15, 30, 45, 60, 75, 93, 108];
    for (let i = 0; i < starts.length; i++) {
      await page.keyboard.press(String(i + 1));
      await expect(page.locator('#pgt4')).toHaveText(`Урок ${starts[i] + 1} из 123`);
    }
  });

  test('go закольцовывает индекс, а find возвращает -1 для неизвестного блока', async ({ page }) => {
    await boot(page);
    await page.evaluate(() => go(123));
    expect((await readState(page)).cur).toBe(0);
    await page.evaluate(() => go(-1));
    expect((await readState(page)).cur).toBe(122);
    expect(await page.evaluate(() => find(42, 0, 0))).toBe(-1);
  });

  test('jump игнорирует ненайденный блок и не прыгает в конец', async ({ page }) => {
    await boot(page);
    await page.evaluate(() => go(5));
    const cur = (await readState(page)).cur;
    await page.evaluate(() => jump(42, 0, 0));
    expect((await readState(page)).cur).toBe(cur);
    await page.evaluate(() => jump(B[cur].xi, 99, 0));
    expect((await readState(page)).cur).toBe(cur);
    await page.evaluate(() => jump(B[cur].xi, B[cur].pi, 99));
    expect((await readState(page)).cur).toBe(cur);
  });

  test('клик по прогрессу открывает соответствующий урок', async ({ page }) => {
    await boot(page);
    const clickAt = async ratio => {
      const expected = await page.evaluate(r => {
        const d = B.map((_, i) => bdur(i));
        const total = d.reduce((a, b) => a + b, 0);
        let acc = 0;
        let index = 0;
        for (; index < B.length - 1; index++) {
          if (acc + d[index] > r * total) break;
          acc += d[index];
        }
        return index;
      }, ratio);
      await page.evaluate(r => {
        const bar = document.getElementById('pgb');
        const rect = bar.getBoundingClientRect();
        bar.dispatchEvent(new MouseEvent('click', {
          bubbles: true,
          clientX: rect.left + rect.width * r,
          clientY: rect.top + rect.height / 2,
        }));
      }, ratio);
      await expect(page.locator('#pgt4')).toHaveText(`Урок ${expected + 1} из 123`);
      expect((await readState(page)).cur).toBe(expected);
    };
    await clickAt(0);
    await clickAt(.5);
    await clickAt(.999);
  });

  test('прогресс считает время по bdur', async ({ page }) => {
    await boot(page);
    const expected = await page.evaluate(() => {
      const fmt = t => {
        t = Math.max(0, Math.round(t));
        return Math.floor(t / 60) + ':' + String(t % 60).padStart(2, '0');
      };
      const total = B.map((_, i) => bdur(i)).reduce((a, b) => a + b, 0);
      const block = 61;
      const elapsed = B.slice(0, block).map((_, i) => bdur(i)).reduce((a, b) => a + b, 0);
      return { total: fmt(total), elapsed: fmt(elapsed), left: fmt(total - elapsed) };
    });
    const actual = await page.evaluate(() => {
      go(61);
      return {
        total: document.getElementById('pgt3').textContent.replace('Всего ', ''),
        elapsed: document.getElementById('pgt1').textContent.replace('Прошло ', ''),
        left: document.getElementById('pgt2').textContent.replace('Осталось ', ''),
        width: document.getElementById('pgf').style.width,
      };
    });
    expect(actual.total).toBe(expected.total);
    expect(actual.elapsed).toBe(expected.elapsed);
    expect(actual.left).toBe(expected.left);
    expect(parseFloat(actual.width)).toBeGreaterThan(0);
  });

  test('навигация во время проигрывания перезапускает блок', async ({ page }) => {
    await boot(page, { opt: { L: 0, P: 1, count: false, V: false, N: false, GM: false }, cur: 0, shift: 60 });
    await page.locator('#bplay').click();
    await expect.poll(() => page.evaluate(() => playing)).toBe(true);
    await page.selectOption('#sx', '1');
    await expect(page.locator('#pname')).toHaveText('Восьмые. Сплошные восьмые');
    await page.waitForFunction(() => cur === 15 && q.some(x => x.bi === 15), null, { timeout: 5000 });
    const player = await page.evaluate(() => ({ playing, sc, k, cur, q: q.length }));
    expect(player.playing).toBe(true);
    expect(player.sc).toBeGreaterThanOrEqual(15);
    expect(player.cur).toBe(15);
    expect(player.q).toBeGreaterThan(0);
    await page.locator('#bplay').click();
  });
});

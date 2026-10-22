const { test, expect } = require('@playwright/test');
const { boot, watchErrors, expectNoErrors } = require('./helpers');

const fast = (extra = {}) => ({
  opt: { L: 0, P: 1, count: false, V: false, N: false, GM: false, ...extra },
  cur: 2,
  shift: 60,
});

test.describe('планировщик и воспроизведение', () => {
  test('такт счёта и переход к следующему блоку', async ({ page }) => {
    await boot(page, fast({ count: true, CB: 1 }));
    await page.locator('#bplay').click();
    await expect(page.locator('#bplay')).toHaveText('Пауза (пробел)');
    await expect(page.locator('#phase')).toHaveText('Счёт');
    await expect(page.locator('#bars')).toHaveText('такт счёта');
    const first = await page.evaluate(() => ({ k: q[0] && q[0].k, sc, cur, q: q.length, playing }));
    expect(first.k).toBe(-1);
    expect(first.sc).toBe(2);
    expect(first.cur).toBe(2);
    expect(first.q).toBeGreaterThan(0);
    expect(first.playing).toBe(true);
    await expect(page.locator('#phase')).toHaveText('Играй', { timeout: 5000 });
    await expect(page.locator('#bars')).toHaveText('такт 1 из 1');
    await expect.poll(() => page.evaluate(() => cur), { timeout: 5000 }).toBe(3);
    await expect(page.locator('#pname')).toHaveText('Четверти. Только 1 и 3');
    await expect(page.locator('#bpm')).toHaveText('120');
    await expect(page.locator('#pgt4')).toHaveText('Урок 4 из 123');
    await page.locator('#bplay').click();
  });

  test('два такта счёта идут «раз — два —», потом «раз, два, три, четыре»', async ({ page }) => {
    await boot(page, fast({ count: true, CB: 2 }));
    await page.locator('#bplay').click();
    await expect(page.locator('#phase')).toHaveText('Счёт');
    await expect(page.locator('#bars')).toHaveText('счёт 1 из 2');
    const first = await page.evaluate(() => ({ k: q[0].k, tot: q[0].tot }));
    expect(first.k).toBe(-2);
    expect(first.tot).toBe(1);
    await expect(page.locator('#bars')).toHaveText('счёт 2 из 2', { timeout: 6000 });
    await expect(page.locator('#phase')).toHaveText('Играй', { timeout: 6000 });
    await expect(page.locator('#bars')).toHaveText('такт 1 из 1');
    await page.locator('#bplay').click();
  });

  test('в первом такте двухтактного счёта звучат только «раз» и «два»', async ({ page }) => {
    await boot(page, fast({ count: true, CB: 2 }));
    const log = await page.evaluate(() => {
      if (!ctx) ac();
      kill();
      const orig = say, out = [];
      say = (t, w) => out.push(w);
      sc = 2; k = -2; nextT = ctx.currentTime + .1; playing = true;
      sched(); sched();
      playing = false; say = orig; k = 0;
      return out;
    });
    expect(log).toEqual(['раз', 'два', 'раз', 'два', 'три', 'четыре']);
  });

  test('фазы Слушай, Играй и приглушение полосы', async ({ page }) => {
    await boot(page, fast({ L: 1, P: 1 }));
    await page.locator('#bplay').click();
    await expect(page.locator('#phase')).toHaveText('Слушай', { timeout: 5000 });
    await expect(page.locator('#bars')).toHaveText('такт 1 из 2');
    await expect(page.locator('#strip')).not.toHaveClass(/mute/);
    await expect(page.locator('#phase')).toHaveText('Играй', { timeout: 5000 });
    await expect(page.locator('#bars')).toHaveText('такт 2 из 2');
    await expect(page.locator('#strip')).toHaveClass(/mute/);
    await expect.poll(() => page.evaluate(() => cur), { timeout: 5000 }).toBe(3);
    await expect(page.locator('#phase')).toHaveText('Слушай', { timeout: 5000 });
    await expect(page.locator('#strip')).not.toHaveClass(/mute/);
    await page.locator('#bplay').click();
  });

  test('без счёта первый такт сразу Играй', async ({ page }) => {
    await boot(page, fast());
    await page.locator('#bplay').click();
    await expect(page.locator('#phase')).toHaveText('Играй', { timeout: 5000 });
    await expect(page.locator('#bars')).toHaveText('такт 1 из 1');
    await page.locator('#bplay').click();
  });

  test('без повтора блок сменяется', async ({ page }) => {
    await boot(page, fast());
    await page.locator('#bplay').click();
    await expect.poll(() => page.evaluate(() => cur), { timeout: 5000 }).toBe(3);
    await expect(page.locator('#bpm')).toHaveText('120');
    expect(await page.evaluate(() => sc)).toBeGreaterThanOrEqual(3);
    expect(await page.evaluate(() => q.some(x => x.bi === 3))).toBe(true);
    await page.locator('#bplay').click();
  });

  test('с повтором блок остаётся на месте', async ({ page }) => {
    await boot(page, fast({ loop: true }));
    await page.locator('#bplay').click();
    await page.waitForFunction(() => playing && q.length > 0);
    const start = await page.evaluate(() => q[0].t);
    await page.waitForFunction(t => q.length > 0 && q[0].t > t + 1.6, start, { timeout: 5000 });
    expect(await page.evaluate(() => ({ cur, sc, playing }))).toEqual({ cur: 2, sc: 2, playing: true });
    await page.locator('#bplay').click();
  });

  test('пауза очищает очередь и возвращает исходный вид', async ({ page }) => {
    await boot(page, fast({ L: 2, P: 4 }));
    await page.locator('#bplay').click();
    await expect.poll(() => page.evaluate(() => q.length)).toBeGreaterThan(0);
    await page.locator('#bplay').click();
    await expect(page.locator('#bplay')).toHaveText('Старт (пробел)');
    await expect(page.locator('#phase')).toHaveText('Стоп');
    await expect(page.locator('#bars')).toHaveText('');
    await expect(page.locator('#strip')).not.toHaveClass(/mute/);
    await expect(page.locator('#ltoe')).toHaveAttribute('transform', 'translate(0 0)');
    await expect(page.locator('#ltap')).toHaveAttribute('opacity', '1');
    await expect(page.locator('#ph')).toHaveAttribute('style', 'left:0%');
    const state = await page.evaluate(() => ({ playing, q: q.length, sc: sc }));
    expect(state.playing).toBe(false);
    expect(state.q).toBe(0);
    await page.locator('#bplay').click();
    await expect.poll(() => page.evaluate(() => playing)).toBe(true);
    await page.locator('#bplay').click();
  });

  test('start ставит курсор планировщика и очередь тактов', async ({ page }) => {
    await boot(page, fast({ L: 2, P: 4 }));
    const data = await page.evaluate(() => {
      start();
      return { sc, cur, playing, q: q.map(x => ({ bi: x.bi, k: x.k, tot: x.tot, spb: x.spb, t: x.t })), nextT: nextT, now: ctx.currentTime };
    });
    expect(data.sc).toBe(2);
    expect(data.cur).toBe(2);
    expect(data.playing).toBe(true);
    expect(data.q.length).toBeGreaterThan(0);
    expect(data.q[0].bi).toBe(2);
    expect(data.q[0].k).toBe(0);
    expect(data.q[0].tot).toBe(6);
    expect(data.q[0].spb).toBeCloseTo(60 / 160, 10);
    expect(data.q[0].t).toBeGreaterThan(data.now);
    expect(data.nextT).toBeGreaterThan(data.now);
    await page.evaluate(() => stop());
  });

  test('start с countIn=false не включает такт счёта', async ({ page }) => {
    await boot(page, fast({ count: true, CB: 2 }));
    const state = await page.evaluate(() => {
      start(true);
      const withCount = { q0: q[0] && q[0].k, playing };
      stop();
      opt.CB = 1;
      start(true);
      const oneBar = { q0: q[0] && q[0].k, playing };
      stop();
      start(false);
      const withoutCount = { q0: q[0] && q[0].k, playing };
      stop();
      return { withCount, oneBar, withoutCount };
    });
    expect(state.withCount.q0).toBe(-2);
    expect(state.oneBar.q0).toBe(-1);
    expect(state.withoutCount.q0).toBe(0);
    expect(state.withCount.playing).toBe(true);
    expect(state.withoutCount.playing).toBe(true);
  });

  test('шина рисунка ставит такты слушания и игры', async ({ page }) => {
    await boot(page, fast({ L: 1, P: 1, N: true, NP: false, NG: 50 }));
    await page.locator('#bplay').click();
    await page.waitForFunction(() => playing && bq.length >= 2);
    const bus = await page.evaluate(() => bq.map(x => ({ play: x.play, t0: x.t0, t1: x.t1 })));
    expect(bus.some(x => x.play === false)).toBe(true);
    expect(bus.some(x => x.play === true)).toBe(true);
    for (const bar of bus) expect(bar.t1).toBeGreaterThan(bar.t0);
    await page.locator('#bplay').click();
  });

  test('смена темпа во время игры перезапускает блок', async ({ page }) => {
    await boot(page, { ...fast(), shift: 55 });
    await page.locator('#bplay').click();
    await expect.poll(() => page.evaluate(() => playing)).toBe(true);
    await page.locator('#p5').click();
    await expect(page.locator('#bpm')).toHaveText('160');
    const state = await page.evaluate(() => ({ playing, sc, cur, shift, q: q.length }));
    expect(state).toMatchObject({ playing: true, cur: 2, shift: 60 });
    expect(state.sc).toBeGreaterThanOrEqual(2);
    expect(state.q).toBeGreaterThan(0);
    await page.locator('#bplay').click();
  });

  test('щелчок метронома ярче голоса и разведён по панораме', async ({ page }) => {
    await boot(page, fast({ N: true }));
    await page.evaluate(() => {
      window.__osc = [];
      const st = OscillatorNode.prototype.start;
      OscillatorNode.prototype.start = function (...a) {
        window.__osc.push({ f: Math.round(this.frequency.value), type: this.type });
        return st.apply(this, a);
      };
      window.__pan = [];
      const sp = AudioContext.prototype.createStereoPanner;
      AudioContext.prototype.createStereoPanner = function () {
        const n = sp.call(this);
        window.__pan.push(n);
        return n;
      };
    });
    await page.locator('#bplay').click();
    await page.waitForFunction(() => window.__osc.length > 4);
    await page.locator('#bplay').click();
    const data = await page.evaluate(() => ({ osc: window.__osc, pan: window.__pan.map(n => n.pan.value) }));
    const clicks = data.osc.filter(o => o.f > 1000);
    expect(clicks.length).toBeGreaterThanOrEqual(4);
    expect(clicks.every(o => o.type === 'triangle')).toBe(true);
    expect(clicks.some(o => o.f === 2400)).toBe(true);
    expect(clicks.filter(o => o.f === 2000).length).toBeGreaterThanOrEqual(3);
    expect(data.pan.map(v => +v.toFixed(2))).toContain(-0.45);
    expect(data.pan.map(v => +v.toFixed(2))).toContain(0.18);
  });

  test('кадр не меряет разметку каждый раз', async ({ page }) => {
    await boot(page, fast({ N: true, GM: true }));
    await page.evaluate(() => {
      window.__rect = 0;
      const o = Element.prototype.getBoundingClientRect;
      Element.prototype.getBoundingClientRect = function () {
        if (this.id === 'cv' && new Error().stack.includes('at draw')) window.__rect++;
        return o.call(this);
      };
    });
    await page.locator('#bplay').click();
    await page.waitForTimeout(1500);
    const first = await page.evaluate(() => window.__rect);
    await page.waitForTimeout(1500);
    const second = await page.evaluate(() => window.__rect);
    await page.locator('#bplay').click();
    expect(first).toBeLessThanOrEqual(3);
    expect(second).toBeLessThanOrEqual(first + 1);
  });

  test('foot притопывает кедом в логотипе', async ({ page }) => {
    await boot(page);
    const poses = await page.evaluate(() => {
      const out = [];
      for (const f of [0, .125, .25, .375, .5]) {
        foot(f);
        out.push({
          f,
          shoe: document.getElementById('ltoe').getAttribute('transform'),
          mid: document.getElementById('lmid').getAttribute('transform'),
          heel: document.getElementById('lback').getAttribute('transform'),
          tap: document.getElementById('ltap').getAttribute('opacity'),
        });
      }
      return out;
    });
    expect(poses[0]).toMatchObject({ shoe: 'translate(0 0)', mid: 'translate(0 0)', heel: null, tap: '1' });
    expect(poses[1]).toMatchObject({ shoe: 'translate(0 -2)', mid: 'translate(0 -1)', heel: null, tap: '0' });
    expect(poses[2]).toMatchObject({ shoe: 'translate(0 0)', mid: 'translate(0 0)', heel: null, tap: '1' });
    expect(poses[3]).toMatchObject({ shoe: 'translate(0 -2)', mid: 'translate(0 -1)', heel: null, tap: '0' });
    expect(poses[4]).toMatchObject({ shoe: 'translate(0 0)', mid: 'translate(0 0)', heel: null, tap: '1' });
  });

  test('bdur добавляет такт итога только в игре', async ({ page }) => {
    await boot(page);
    const data = await page.evaluate(() => {
      opt.L = 2;
      opt.P = 4;
      opt.GM = false;
      const without = bdur(2);
      opt.GM = true;
      const withGame = bdur(2);
      return { without, withGame, bpm: bpmOf(2) };
    });
    expect(data.without).toBeCloseTo(6 * 240 / data.bpm, 10);
    expect(data.withGame).toBeCloseTo(7 * 240 / data.bpm, 10);
  });

  test('прогресс внутри такта учитывает k и долю', async ({ page }) => {
    await boot(page, fast({ L: 2, P: 4 }));
    const data = await page.evaluate(() => {
      const total = B.map((_, i) => bdur(i)).reduce((a, b) => a + b, 0);
      const before = B.slice(0, 2).map((_, i) => bdur(i)).reduce((a, b) => a + b, 0);
      prog({ bi: 2, k: 0, spb: 60 / 160 }, .5);
      return {
        width: parseFloat(document.getElementById('pgf').style.width),
        expected: (before + .5 * 4 * 60 / 160) / total * 100,
      };
    });
    expect(data.width).toBeCloseTo(data.expected, 5);
  });

  test('stop пересоздаёт выход и шину нот', async ({ page }) => {
    await boot(page, fast());
    const data = await page.evaluate(() => {
      const before = { out, nb };
      start();
      const during = { out, nb };
      stop();
      return {
        startRecreated: before.out !== during.out,
        stopRecreated: during.out !== out,
        busRecreated: before.nb !== nb,
      };
    });
    expect(data.startRecreated).toBe(true);
    expect(data.stopRecreated).toBe(true);
    expect(data.busRecreated).toBe(true);
  });

  test('нет ошибок при старте, паузе и повторе', async ({ page }) => {
    const errors = watchErrors(page);
    await boot(page, fast({ L: 1, P: 1 }));
    await page.locator('#bplay').click();
    await page.waitForTimeout(200);
    await page.locator('#bplay').click();
    await page.locator('#bplay').click();
    await page.waitForTimeout(200);
    await page.locator('#bplay').click();
    await expectNoErrors(errors);
  });
});

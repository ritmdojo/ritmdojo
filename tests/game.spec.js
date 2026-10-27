const { test, expect } = require('@playwright/test');
const { boot, readState, openTab, watchErrors, expectNoErrors } = require('./helpers');

const gameState = (extra = {}) => ({
  opt: { L: 0, P: 1, count: false, V: false, N: false, GM: true, ...extra },
  cur: 2,
  shift: 60,
});

async function enableGame(page) {
  await openTab(page, 'settings');
  if (await page.locator('#ogm').isChecked()) {
    await page.evaluate(() => micOn());
  } else {
    await page.locator('#ogm').check();
  }
  await expect(page.locator('#mst')).toContainText('Вход включён', { timeout: 15000 });
}

async function installOscillatorSpy(page) {
  await page.evaluate(() => {
    window.__oscStarts = 0;
    const original = OscillatorNode.prototype.start;
    OscillatorNode.prototype.start = function (...args) {
      window.__oscStarts++;
      return original.apply(this, args);
    };
  });
}

test.describe('режим игры: вход и настройки', () => {
  test('включение игры поднимает AudioWorklet и показывает HUD', async ({ page }) => {
    const errors = watchErrors(page);
    await boot(page, gameState());
    await enableGame(page);
    const state = await page.evaluate(() => ({
      mode,
      mic: !!mic,
      proc: proc && proc.constructor.name,
      scoreHidden: document.getElementById('vscore').hidden,
      mst: document.getElementById('mst').textContent,
      lst: document.getElementById('lst').textContent,
      min: [...document.getElementById('min').options].map(o => o.textContent),
      out: getComputedStyle(document.getElementById('lout')).display,
      mout: document.getElementById('mout').options.length,
      gm: opt.GM,
      saved: JSON.parse(localStorage.getItem('rt2')).opt.GM,
    }));
    expect(state.mode).toBe('worklet');
    expect(state.mic).toBe(true);
    expect(state.proc).toBe('AudioWorkletNode');
    expect(state.scoreHidden).toBe(true);
    expect(state.mst).toContain('Вход включён');
    expect(state.lst).toContain('AudioWorklet');
    expect(state.lst).toContain('Задержка выход+вход');
    expect(state.min.length).toBeGreaterThanOrEqual(1);
    expect(['none', 'flex']).toContain(state.out);
    expect(state.mout).toBeGreaterThanOrEqual(0);
    expect(state.gm).toBe(true);
    expect(state.saved).toBe(true);
    await expect(page.locator('#ogm')).toBeChecked();
    await openTab(page, 'score');
    await expect(page.locator('#rt')).toBeVisible();
    await expect(page.locator('#hud')).toBeHidden();
    await expectNoErrors(errors);
  });

  test('выключение игры останавливает поток и очищает статус', async ({ page }) => {
    await boot(page, gameState());
    await enableGame(page);
    await page.locator('#ogm').uncheck();
    await expect(page.locator('#mst')).toHaveText('');
    const state = await page.evaluate(() => ({
      mode,
      mic,
      proc,
      det,
      gm: opt.GM,
      saved: JSON.parse(localStorage.getItem('rt2')).opt.GM,
      lst: document.getElementById('lst').textContent,
    }));
    expect(state).toMatchObject({ mode: '', mic: null, proc: null, det: null, gm: false, saved: false });
    expect(state.lst).toContain('выключен');
  });

  test('ошибка getUserMedia выключает игру и сохраняет это', async ({ page }) => {
    await page.addInitScript(() => {
      navigator.mediaDevices.getUserMedia = () => Promise.reject(new DOMException('нет входа', 'NotFoundError'));
    });
    const errors = watchErrors(page);
    await boot(page, { opt: { GM: false } });
    await openTab(page, 'settings');
    await page.locator('#ogm').click();
    await expect(page.locator('#mst')).toContainText('Вход недоступен (NotFoundError)');
    await expect(page.locator('#ogm')).not.toBeChecked();
    const state = await readState(page);
    expect(state.opt.GM).toBe(false);
    expect(state.saved.opt.GM).toBe(false);
    expect(await page.evaluate(() => ({ mic, proc, mode }))).toEqual({ mic: null, proc: null, mode: '' });
    await expect(page.locator('#lst')).toContainText('выключен');
    await expectNoErrors(errors);
  });

  test('поздний ответ getUserMedia после выключения не оставляет поток', async ({ page }) => {
    await page.addInitScript(() => {
      window.__stops = 0;
      const stop = MediaStreamTrack.prototype.stop;
      MediaStreamTrack.prototype.stop = function (...args) {
        window.__stops++;
        return stop.apply(this, args);
      };
      const original = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
      navigator.mediaDevices.getUserMedia = async (...args) => {
        await new Promise(r => setTimeout(r, 300));
        return original(...args);
      };
    });
    await boot(page, { opt: { GM: false } });
    await openTab(page, 'settings');
    await page.locator('#ogm').check();
    await page.locator('#ogm').uncheck();
    await page.waitForTimeout(700);
    const state = await page.evaluate(() => ({ mic, proc, mode, gm: opt.GM, stops: window.__stops }));
    expect(state.mic).toBeNull();
    expect(state.proc).toBeNull();
    expect(state.mode).toBe('');
    expect(state.gm).toBe(false);
    expect(state.stops).toBeGreaterThan(0);
    await expect(page.locator('#mst')).toHaveText('');
  });

  test('без AudioWorklet используется ScriptProcessor и Det', async ({ page }) => {
    await page.addInitScript(() => {
      Object.defineProperty(window, 'AudioWorkletNode', { value: undefined, configurable: true });
    });
    const errors = watchErrors(page);
    await boot(page, gameState());
    await enableGame(page);
    const state = await page.evaluate(() => ({
      mode,
      det: det && det.constructor.name,
      proc: proc && proc.constructor.name,
      thr: det && det.thr,
      expected: thr(),
      lst: document.getElementById('lst').textContent,
    }));
    expect(state.mode).toBe('script');
    expect(state.det).toBe('Det');
    expect(state.proc).toBe('ScriptProcessorNode');
    expect(state.thr).toBeCloseTo(state.expected, 12);
    expect(state.lst).toContain('ScriptProcessor');
    await page.locator('#osn').evaluate(el => {
      el.value = '100';
      el.dispatchEvent(new Event('input', { bubbles: true }));
    });
    expect(await page.evaluate(() => det.thr)).toBeCloseTo(.002, 12);
    await expectNoErrors(errors);
  });

  test('чувствительность меняет порог и сохраняется', async ({ page }) => {
    await boot(page, gameState());
    await enableGame(page);
    await page.locator('#osn').evaluate(el => {
      el.value = '0';
      el.dispatchEvent(new Event('input', { bubbles: true }));
    });
    expect(await page.evaluate(() => ({ s: opt.S, t: thr() }))).toEqual({ s: 0, t: .1 });
    await page.locator('#osn').evaluate(el => {
      el.value = '100';
      el.dispatchEvent(new Event('input', { bubbles: true }));
    });
    expect(await page.evaluate(() => ({ s: opt.S, t: thr() }))).toEqual({ s: 100, t: .002 });
    expect((await readState(page)).saved.opt.S).toBe(100);
  });

  test('задержка берётся из калибровки или из оценки браузера', async ({ page }) => {
    await boot(page, gameState());
    const data = await page.evaluate(() => {
      opt.CALD = true;
      opt.CAL = 123;
      const calibrated = lat();
      latUpd();
      const calibratedText = document.getElementById('lst').textContent;
      opt.CALD = false;
      trkLat = 7;
      const estimated = lat();
      latUpd();
      const estimatedText = document.getElementById('lst').textContent;
      return { calibrated, calibratedText, estimated, estimatedText };
    });
    expect(data.calibrated).toBe(123);
    expect(data.calibratedText).toContain('по калибровке');
    expect(data.estimated).toBeGreaterThanOrEqual(7);
    expect(data.estimatedText).toContain('оценка браузера');
  });
});

test.describe('режим игры: оценка и статистика', () => {
  test('onset различает идеально, хорошо, рано, поздно и лишнюю ноту', async ({ page }) => {
    await boot(page);
    const result = await page.evaluate(() => {
      opt.GM = true;
      opt.CALD = true;
      opt.CAL = 0;
      playing = true;
      inPlay = true;
      score = 0;
      combo = 0;
      const base = ctx.currentTime + 100;
      const g = { n: 5, p: 0, g: 0, x: 0, m: 0, d: [] };
      gs = g;
      const check = (offset, onsetTime) => {
        xq = [{ t: base + offset, s: g, u: offset % 1 != 0, d: 0 }];
        onset(onsetTime);
        return {
          flash: document.getElementById('fb').textContent,
          cls: document.getElementById('fb').className,
          p: g.p,
          g: g.g,
          x: g.x,
          m: g.m,
          score,
          combo,
          last: pv[pv.length - 1],
        };
      };
      const perfect = check(0, base + .02);
      const good = check(10, base + 10.07);
      const early = check(20, base + 20 - .11);
      const late = check(30, base + 30.11);
      const edgePerfect = check(40, base + 40.045);
      const edgeGood = check(50, base + 50.046);
      const extra = check(60, base + 60.5);
      const note = { t: base + 70, s: g, u: true, d: 0 };
      xq = [note];
      onset(base + 70.01);
      const offbeat = { ...g.d[g.d.length - 1] };
      return { perfect, good, early, late, edgePerfect, edgeGood, extra, offbeat };
    });
    expect(result.perfect).toMatchObject({ flash: 'Идеально', cls: 'ok', p: 1, combo: 1, score: 100 });
    expect(result.good).toMatchObject({ flash: 'Хорошо', g: 1, combo: 2, score: 150 });
    expect(result.early).toMatchObject({ flash: 'Рано', cls: 'bad', m: 1, combo: 0 });
    expect(result.early.last.r).toBe('e');
    expect(result.late).toMatchObject({ flash: 'Поздно', m: 2, combo: 0 });
    expect(result.late.last.r).toBe('l');
    expect(result.edgePerfect).toMatchObject({ flash: 'Идеально', p: 2 });
    expect(result.edgeGood).toMatchObject({ flash: 'Хорошо', g: 2 });
    expect(result.extra).toMatchObject({ x: 1 });
    expect(result.extra.last.r).toBe('x');
    expect(result.offbeat.u).toBe(true);
  });

  test('onset учитывает задержку и игнорирует неиграющие состояния', async ({ page }) => {
    await boot(page);
    const data = await page.evaluate(() => {
      opt.GM = true;
      opt.CALD = true;
      opt.CAL = 100;
      playing = true;
      inPlay = true;
      const base = ctx.currentTime + 100;
      const g = { n: 1, p: 0, g: 0, x: 0, m: 0, d: [] };
      gs = g;
      xq = [{ t: base, s: g, u: false, d: 0 }];
      onset(base + .1);
      const corrected = { p: g.p, d: g.d[0] && g.d[0].d };
      playing = false;
      xq = [{ t: base + 10, s: g, u: false, d: 0 }];
      const before = pv.length;
      onset(base + 10);
      const ignoredStopped = { before, after: pv.length };
      playing = true;
      opt.GM = false;
      onset(base + 20);
      const ignoredNoGame = pv.length;
      opt.GM = true;
      inPlay = false;
      const x = g.x;
      xq = [];
      onset(base + 30);
      const listen = pv[pv.length - 1];
      return { corrected, ignoredStopped, ignoredNoGame, x, listen: listen && listen.r };
    });
    expect(data.corrected.p).toBe(1);
    expect(data.corrected.d).toBeCloseTo(0, 6);
    expect(data.ignoredStopped).toEqual({ before: 1, after: 1 });
    expect(data.ignoredNoGame).toBe(1);
    expect(data.listen).toBe('o');
    expect(data.x).toBe(0);
  });

  test('result начисляет очки, звёзды, рекорд и кэширует итог', async ({ page }) => {
    await boot(page);
    const data = await page.evaluate(() => {
      score = 0;
      combo = 0;
      opt.HI = 0;
      opt.best = {};
      gs = { n: 10, p: 5, g: 3, x: 2, m: 0, d: [] };
      R = null;
      const first = result(0);
      const second = result(0);
      hudUpd();
      return {
        acc: acc(gs),
        first,
        same: first === second,
        best: opt.best[0],
        hi: opt.HI,
        score,
        hud: {
          score: document.getElementById('hs').textContent,
          combo: document.getElementById('hc').textContent,
          accuracy: document.getElementById('ha').textContent,
          stars: document.getElementById('hst').textContent,
          high: document.getElementById('hh').textContent,
        },
      };
    });
    expect(data.acc).toBe(62);
    expect(data.first).toMatchObject({ a: 62, st: 1 });
    expect(data.same).toBe(true);
    expect(data.best).toBe(1);
    expect(data.hi).toBe(310);
    expect(data.score).toBe(310);
    expect(data.hud).toEqual({ score: '310', combo: 'x1, серия 0', accuracy: '78%', stars: '1 из 369', high: '310' });
  });

  test('порог звёзд и множитель комбо', async ({ page }) => {
    await boot(page);
    const data = await page.evaluate(() => {
      const stars = [];
      for (const a of [59.9, 60, 74.9, 75, 89.9, 90]) {
        const g = { n: 100, p: a, g: 0, x: 0, m: 0, d: [] };
        gs = g;
        R = null;
        stars.push({ a, st: result(0).st });
      }
      const multipliers = [0, 7, 8, 15, 16, 23, 24, 100].map(c => {
        combo = c;
        return mult();
      });
      return { stars, multipliers };
    });
    expect(data.stars).toEqual([
      { a: 59.9, st: 0 },
      { a: 60, st: 1 },
      { a: 74.9, st: 1 },
      { a: 75, st: 2 },
      { a: 89.9, st: 2 },
      { a: 90, st: 3 },
    ]);
    expect(data.multipliers).toEqual([1, 1, 2, 2, 3, 3, 4, 4]);
  });

  test('endBlock переходит дальше или повторяет уровень', async ({ page }) => {
    await boot(page);
    const data = await page.evaluate(() => {
      const out = {};
      gs = null;
      out.none = endBlock(0);
      gs = { n: 0, p: 0, g: 0, x: 0, m: 0, d: [] };
      out.empty = endBlock(0);
      gs = { n: 4, p: 0, g: 0, x: 0, m: 4, d: [] };
      R = null;
      out.zeroStars = endBlock(0);
      gs = { n: 4, p: 4, g: 0, x: 0, m: 0, d: [] };
      R = null;
      out.oneStar = endBlock(0);
      return out;
    });
    expect(data).toEqual({ none: 'next', empty: 'next', zeroStars: 'again', oneStar: 'next' });
  });

  test('статистика считает среднее, разброс и гистограмму', async ({ page }) => {
    await boot(page);
    const data = await page.evaluate(() => {
      const st = stats([0, 10, 20]);
      gs = { n: 3, p: 0, g: 0, x: 0, m: 0, d: [{ d: -20, u: false }, { d: 0, u: false }, { d: 20, u: true }] };
      tmG = null;
      tmUpd();
      return {
        st,
        text: document.getElementById('tm').innerText,
        heights: [...document.querySelectorAll('#hg i')].map(i => i.style.height),
        bars: document.querySelectorAll('#hg i').length,
      };
    });
    expect(data.st.n).toBe(3);
    expect(data.st.m).toBe(10);
    expect(data.st.sd).toBeCloseTo(Math.sqrt(200 / 3), 10);
    expect(data.st.sk).toBeCloseTo(0, 10);
    expect(data.st.ku).toBeCloseTo(-1.5, 10);
    expect(data.text).toContain('Нот: 3');
    expect(data.text).toContain('Сдвиг μ: 0 мс');
    expect(data.text).toContain('Разброс σ: 16 мс');
    expect(data.bars).toBe(21);
    expect(data.heights.filter(x => x === '100%')).toHaveLength(3);
  });

  test('tmUpd без данных и со сдвигами долей', async ({ page }) => {
    await boot(page);
    const noData = await page.evaluate(() => {
      gs = null;
      tmG = null;
      tmUpd();
      return document.getElementById('tm').innerText;
    });
    expect(noData).toBe('Тайминг: пока нет данных');
    const text = await page.evaluate(() => {
      gs = {
        n: 8,
        p: 0,
        g: 0,
        x: 0,
        m: 0,
        d: [
          { d: -30, u: false }, { d: -20, u: false }, { d: -10, u: false }, { d: -40, u: false },
          { d: 10, u: true }, { d: 20, u: true }, { d: 30, u: true }, { d: 40, u: true },
        ],
      };
      tmG = null;
      tmUpd();
      return document.getElementById('tm').innerText;
    });
    expect(text).toContain('На долю -25 мс, на «и» +25 мс');
    expect(text).toContain('штрихи звучат неодинаково');
  });

  test('gameTick засчитывает пропуск и показывает итог', async ({ page }) => {
    await boot(page);
    const data = await page.evaluate(() => {
      opt.GM = true;
      opt.L = 0;
      opt.P = 1;
      playing = true;
      inPlay = true;
      combo = 5;
      const g = { n: 1, p: 0, g: 0, x: 0, m: 0, d: [] };
      gs = g;
      xq = [{ t: 1.5, s: g, u: false, d: 0 }];
      gameTick({ k: 0, t: 0, spb: .5, bi: 0 }, 2);
      const missed = { xq: xq.map(x => x.r), m: g.m, combo, flash: document.getElementById('fb').textContent };
      const r = { n: 1, p: 0, g: 0, x: 0, m: 1, d: [] };
      gs = r;
      xq = [];
      gameTick({ k: 1, t: 0, spb: .5, bi: 2 }, 1);
      const fb = document.getElementById('fb'), pop = document.getElementById('pop');
      return { missed, result: fb.textContent, cls: fb.className, pop: pop.textContent, popCls: pop.className, popHidden: pop.hidden, shown: R && R.shown };
    });
    expect(data.missed).toEqual({ xq: ['m'], m: 1, combo: 0, flash: 'Мимо' });
    expect(data.result).toBe('Мимо');
    expect(data.cls).toBe('bad');
    expect(data.pop).toBe('Неудача 0%');
    expect(data.popCls).toContain('bad');
    expect(data.popHidden).toBe(false);
    expect(data.shown).toBe(1);
  });

  test('итог уровня всплывает над канвасом и гаснет сам', async ({ page }) => {
    await boot(page);
    await page.evaluate(() => {
      opt.GM = true;
      opt.L = 0;
      opt.P = 1;
      playing = true;
      const g = { n: 4, p: 4, g: 0, x: 0, m: 0, d: [] };
      gs = g;
      gameTick({ k: 1, t: 0, spb: .5, bi: 0 }, 1);
    });
    await expect(page.locator('#pop')).toHaveText('Отлично 100%');
    await expect(page.locator('#pop')).toHaveClass(/ok/);
    await expect(page.locator('#pop')).toBeVisible();
    await expect(page.locator('#pop')).toBeHidden({ timeout: 3000 });
    await page.evaluate(() => { R = null; gameTick({ k: 1, t: 0, spb: .5, bi: 0 }, 1); });
    await expect(page.locator('#pop')).toBeVisible();
    await page.evaluate(() => stop());
    await expect(page.locator('#pop')).toBeHidden();
    await expect(page.locator('#fb')).toHaveText('');
  });

  test('попап итога называет оценку по звёздам', async ({ page }) => {
    await boot(page);
    const words = await page.evaluate(() => {
      const out = [];
      for (const [p, n] of [[6, 10], [15, 20], [18, 20]]) {
        opt.GM = true;
        opt.L = 0;
        opt.P = 1;
        playing = true;
        R = null;
        gs = { n, p, g: 0, x: 0, m: 0, d: [] };
        gameTick({ k: 1, t: 0, spb: .5, bi: 0 }, 1);
        out.push(document.getElementById('pop').textContent);
      }
      return out;
    });
    expect(words).toEqual(['Удовлетворительно 60%', 'Хорошо 75%', 'Отлично 90%']);
  });

  test('HUD считает точность без лишних нот в знаменателе', async ({ page }) => {
    await boot(page);
    const data = await page.evaluate(() => {
      gs = { n: 10, p: 1, g: 1, x: 5, m: 1, d: [] };
      hudUpd();
      return {
        acc: acc(gs),
        ha: document.getElementById('ha').textContent,
        hc: document.getElementById('hc').textContent,
        hs: document.getElementById('hs').textContent,
      };
    });
    expect(data.acc).toBeCloseTo(1, 10);
    expect(data.ha).toBe('3%');
    expect(data.hc).toBe('x1, серия 0');
  });
});

test.describe('режим игры: воспроизведение и калибровка', () => {
  test('в игре планируются ожидаемые ноты, такты и шина', async ({ page }) => {
    await boot(page, gameState());
    await enableGame(page);
    await openTab(page, 'play');
    await page.locator('#bplay').click();
    await page.waitForFunction(() => playing && q.length > 0);
    const state = await page.evaluate(() => ({
      xq: xq.length,
      nv: nv.length,
      bh: bh.length,
      bq: bq.length,
      gsN: gs && gs.n,
      tot: q[0].tot,
    }));
    expect(state.xq).toBe(4);
    expect(state.nv).toBe(4);
    expect(state.gsN).toBe(4);
    expect(state.bh).toBeGreaterThanOrEqual(2);
    expect(state.bq).toBeGreaterThanOrEqual(1);
    expect(state.tot).toBe(2);
    await openTab(page, 'score');
    await expect(page.locator('#rt')).toBeVisible();
    await expect(page.locator('#hud')).toBeHidden();
    await expect(page.locator('#phase')).toHaveText('Играй');
    await openTab(page, 'play');
    await page.locator('#bplay').click();
  });

  test('без попаданий уровень повторяется после итога', async ({ page }) => {
    await boot(page, gameState());
    await enableGame(page);
    await openTab(page, 'play');
    await page.locator('#bplay').click();
    await expect(page.locator('#pop')).toHaveText('Неудача 0%', { timeout: 6000 });
    await expect(page.locator('#phase')).toHaveText('Итог');
    const atResult = await page.evaluate(() => ({ sc, cur, result: R && { n: R.gs.n, st: R.st, a: R.a } }));
    expect(atResult).toEqual({ sc: 2, cur: 2, result: { n: 4, st: 0, a: 0 } });
    await expect(page.locator('#phase')).toHaveText('Играй', { timeout: 5000 });
    expect(await page.evaluate(() => ({ sc, cur }))).toEqual({ sc: 2, cur: 2 });
    await page.locator('#bplay').click();
  });

  test('после такта счёта появляется «Погнали!»', async ({ page }) => {
    await boot(page, gameState({ count: true, CB: 1 }));
    await openTab(page, 'play');
    await page.locator('#bplay').click();
    await expect(page.locator('#pop')).toHaveText('Погнали!', { timeout: 5000 });
    await expect(page.locator('#pop')).toHaveClass(/go/);
    await page.locator('#bplay').click();
    await expect(page.locator('#pop')).toBeHidden();
  });

  test('первые две неудачи повторяются без слушания, дальше слушание возвращается', async ({ page }) => {
    await boot(page, gameState({ skip: true, L: 2 }));
    const out = await page.evaluate(() => {
      const step = ok => {
        gs = { n: 1, p: ok ? 1 : 0, g: 0, x: 0, m: ok ? 0 : 1, d: [] };
        R = null;
        return { res: endBlock(2), L: opt.L, fails, saved: JSON.parse(localStorage.getItem('rt2')).opt.L };
      };
      const one = step(false), two = step(false), three = step(false), pass = step(true);
      return { one, two, three, pass };
    });
    expect(out.one).toMatchObject({ res: 'again', L: 0, fails: 1 });
    expect(out.two).toMatchObject({ res: 'again', L: 0, fails: 2 });
    expect(out.three).toMatchObject({ res: 'again', L: 2, fails: 3, saved: 2 });
    expect(out.pass).toMatchObject({ res: 'next', L: 2, fails: 0, saved: 2 });
  });

  test('пропуск слушания можно выключить в настройках', async ({ page }) => {
    await boot(page, gameState({ skip: false, L: 2 }));
    await openTab(page, 'settings');
    await expect(page.locator('#oskip')).not.toBeChecked();
    const out = await page.evaluate(() => {
      const out = [];
      for (let i = 0; i < 4; i++) {
        gs = { n: 1, p: 0, g: 0, x: 0, m: 1, d: [] };
        R = null;
        out.push(endBlock(2));
      }
      return { out, L: opt.L };
    });
    expect(out.out).toEqual(['again', 'again', 'again', 'again']);
    expect(out.L).toBe(2);
  });

  test('калибровка по щелчкам сохраняет задержку', async ({ page }) => {
    await boot(page, gameState());
    await enableGame(page);
    await installOscillatorSpy(page);
    await page.clock.install();
    await page.locator('#bcal').click();
    await expect(page.locator('#mst')).toHaveText(/играйте любую ноту/);
    const started = await page.evaluate(() => window.__oscStarts);
    expect(started).toBeGreaterThanOrEqual(12);
    await page.evaluate(() => {
      const dO = Math.max(0, -Math.min(0, ...['раз', 'два', 'три', 'четыре', 'и'].map(w => opt.O[w] || 0))) / 1000;
      cal.on = Array.from({ length: 12 }, (_, i) => ctx.currentTime + dO + 4.2 + i * .75);
    });
    await page.clock.fastForward(20000);
    await expect(page.locator('#mst')).toHaveText(/Калибровка: -?\d+ мс, разброс \d+ мс/);
    const state = await page.evaluate(() => ({ cal, cald: opt.CALD, calv: opt.CAL, saved: JSON.parse(localStorage.getItem('rt2')).opt }));
    expect(state.cal).toBeNull();
    expect(state.cald).toBe(true);
    expect(Math.abs(state.calv)).toBeLessThan(30);
    expect(state.saved.CALD).toBe(true);
    expect(state.saved.CAL).toBe(state.calv);
    await expect(page.locator('#lst')).toContainText('по калибровке');
  });

  test('мало пойманных нот оставляет калибровку прежней', async ({ page }) => {
    await boot(page, gameState());
    await enableGame(page);
    await page.clock.install();
    await page.locator('#bcal').click();
    await page.clock.fastForward(20000);
    await expect(page.locator('#mst')).toHaveText('Поймано мало нот (0 из 12), повторите');
    expect(await page.evaluate(() => ({ cald: opt.CALD, cal: cal }))).toEqual({ cald: false, cal: null });
  });

  test('двойной запуск калибровки не даёт ошибок', async ({ page }) => {
    const errors = watchErrors(page);
    await boot(page, gameState());
    await enableGame(page);
    await page.clock.install();
    await page.locator('#bcal').click();
    await page.locator('#bcal').click();
    await page.clock.fastForward(20000);
    await expect(page.locator('#mst')).toHaveText('Поймано мало нот (0 из 12), повторите');
    expect(await page.evaluate(() => cal)).toBeNull();
    await expectNoErrors(errors);
  });

  test('выключение игры во время калибровки её отменяет', async ({ page }) => {
    await boot(page, gameState());
    await enableGame(page);
    await page.clock.install();
    await page.locator('#bcal').click();
    await page.locator('#ogm').uncheck();
    await expect(page.locator('#mst')).toHaveText('Калибровка отменена');
    await page.clock.fastForward(20000);
    expect(await page.evaluate(() => ({ cal: cal, cald: opt.CALD }))).toEqual({ cal: null, cald: false });
  });

  test('старт во время калибровки её отменяет', async ({ page }) => {
    await boot(page, gameState());
    await enableGame(page);
    await page.clock.install();
    await page.locator('#bcal').click();
    await openTab(page, 'play');
    await page.locator('#bplay').click();
    await expect(page.locator('#mst')).toHaveText('Калибровка отменена');
    expect(await page.evaluate(() => ({ cal, playing }))).toEqual({ cal: null, playing: true });
    await page.locator('#bplay').click();
  });

  test('калибровка без микрофона просит включить игру', async ({ page }) => {
    await boot(page);
    await openTab(page, 'settings');
    await page.locator('#bcal').click();
    await expect(page.locator('#mst')).toHaveText('Сначала включите игру');
    expect(await page.evaluate(() => cal)).toBeNull();
  });

  test('смена выхода сохраняет устройство и вызывает setSinkId', async ({ page }) => {
    await page.addInitScript(() => {
      window.__sink = [];
      const original = AudioContext.prototype.setSinkId;
      if (original) {
        AudioContext.prototype.setSinkId = function (id) {
          window.__sink.push(id);
          return Promise.resolve();
        };
      }
    });
    await boot(page, gameState());
    await enableGame(page);
    const hasOutputs = await page.evaluate(() => document.getElementById('mout').options.length > 0 && getComputedStyle(document.getElementById('lout')).display !== 'none');
    test.skip(!hasOutputs, 'в headless нет списка выходных устройств');
    const value = await page.locator('#mout option').nth(1).getAttribute('value');
    await page.selectOption('#mout', value);
    expect((await readState(page)).opt.OUT).toBe(value);
    expect((await readState(page)).saved.opt.OUT).toBe(value);
    expect(await page.evaluate(() => window.__sink)).toContain(value);
  });

  test('смена входа перезапускает микрофон и сохраняет устройство', async ({ page }) => {
    await boot(page, gameState());
    await enableGame(page);
    const value = await page.locator('#min option').first().getAttribute('value');
    test.skip(!value, 'в headless нет идентификатора входа');
    await page.locator('#min').evaluate((el, v) => {
      el.value = v;
      el.dispatchEvent(new Event('change', { bubbles: true }));
    }, value);
    await page.waitForFunction(() => !!mic && mode === 'worklet', null, { timeout: 15000 });
    const state = await readState(page);
    expect(state.opt.MIC).toBe(value);
    expect(state.saved.opt.MIC).toBe(value);
    expect(await page.evaluate(() => ({ mic: !!mic, mode }))).toEqual({ mic: true, mode: 'worklet' });
  });

  test('кнопка авто возвращает оценку задержки браузера', async ({ page }) => {
    await boot(page, gameState());
    await enableGame(page);
    await page.evaluate(() => { opt.CALD = true; opt.CAL = 123; save(); });
    await page.locator('#bauto').click();
    expect(await page.evaluate(() => opt.CALD)).toBe(false);
    expect((await readState(page)).saved.opt.CALD).toBe(false);
    await expect(page.locator('#lst')).toContainText('оценка браузера');
  });

  test('канвас и полоса уровня появляются в игре', async ({ page }) => {
    await boot(page, gameState());
    await enableGame(page);
    await openTab(page, 'play');
    await page.locator('#bplay').click();
    await expect.poll(() => page.evaluate(() => document.getElementById('cv').dataset.w)).toBeTruthy();
    const canvas = await page.evaluate(() => {
      const c = document.getElementById('cv');
      return { width: c.width, height: c.height, css: c.getBoundingClientRect().width, level: document.getElementById('lvf').style.width };
    });
    expect(canvas.width).toBeGreaterThan(0);
    expect(canvas.height).toBeGreaterThan(0);
    expect(canvas.css).toBeGreaterThan(0);
    expect(canvas.level).toMatch(/^\d+(\.\d+)?%$/);
    await expect(page.locator('#hg i')).toHaveCount(21);
    const painted = await page.evaluate(() => {
      const c = document.getElementById('cv');
      const data = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
      let alpha = 0;
      for (let i = 3; i < data.length; i += 4) alpha += data[i];
      return alpha;
    });
    expect(painted).toBeGreaterThan(0);
    await page.locator('#bplay').click();
  });
});

test.describe('тап по канвасу, демо и автокалибровка', () => {
  test('игра включена по умолчанию', async ({ page }) => {
    await boot(page);
    expect(await page.evaluate(() => opt.GM)).toBe(true);
    await expect(page.locator('#ogm')).toBeChecked();
  });

  test('тап по канвасу ловится как удар', async ({ page }) => {
    await boot(page, gameState({ CALD: true, CAL: 0, S: 100 }));
    await page.evaluate(() => {
      opt.L = 0; opt.P = 1; playing = true;
      gs = { n: 1, p: 0, g: 0, x: 0, m: 0, d: [] };
      xq.push({ t: ctx.currentTime + .05, s: gs, u: false });
    });
    await page.locator('#cv').dispatchEvent('pointerdown');
    const r = await page.evaluate(() => ({ p: gs.p, txt: document.getElementById('fb').textContent, c: combo }));
    expect(r.p).toBe(1);
    expect(r.c).toBe(1);
    expect(r.txt).toBe('Идеально');
  });

  test('тап вне игры ничего не ловит', async ({ page }) => {
    await boot(page, gameState({ CALD: true, CAL: 0 }));
    await page.evaluate(() => {
      playing = false;
      gs = { n: 1, p: 0, g: 0, x: 0, m: 0, d: [] };
      xq.push({ t: ctx.currentTime + .05, s: gs, u: false });
    });
    await page.locator('#cv').dispatchEvent('pointerdown');
    expect(await page.evaluate(() => gs.p)).toBe(0);
  });

  test('клавиша X ловится как удар без микрофона', async ({ page }) => {
    await boot(page, gameState({ CALD: true, CAL: 0, S: 100 }));
    await page.evaluate(() => {
      opt.L = 0; opt.P = 1; playing = true;
      gs = { n: 1, p: 0, g: 0, x: 0, m: 0, d: [] };
      xq.push({ t: ctx.currentTime + .05, s: gs, u: false });
    });
    await page.keyboard.press('x');
    expect(await page.evaluate(() => gs.p)).toBe(1);
  });

  test('клавиша X в демо ничего не ловит', async ({ page }) => {
    await boot(page, gameState({ CALD: true, CAL: 0, DEM: true }));
    await openTab(page, 'play');
    await page.locator('#bdem').click();
    await page.evaluate(() => {
      playing = true;
      gs = { n: 1, p: 0, g: 0, x: 0, m: 0, d: [] };
      xq.push({ t: ctx.currentTime + .05, s: gs, u: false });
    });
    await page.keyboard.press('x');
    expect(await page.evaluate(() => gs.p)).toBe(0);
  });

  test('кнопка демо включает режим без микрофона', async ({ page }) => {
    await boot(page, gameState());
    await openTab(page, 'play');
    await page.locator('#bdem').click();
    await expect(page.locator('#bdem')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('#mst')).toContainText('Демо');
    expect(await page.evaluate(() => ({ dem: opt.DEM, mic: mic }))).toEqual({ dem: true, mic: null });
  });

  test('демо делает идеальные удары и не пишет рекорды', async ({ page }) => {
    await boot(page, gameState({ CALD: true, CAL: 0 }));
    const r = await page.evaluate(() => {
      opt.DEM = true; playing = true; opt.L = 0; opt.P = 1;
      gs = { n: 2, p: 0, g: 0, x: 0, m: 0, d: [] };
      xq.push({ t: ctx.currentTime + .1, s: gs, u: false });
      xq.push({ t: ctx.currentTime + .2, s: gs, u: false });
      gameTick({ k: 1, t: 0, spb: .5, bi: 2 }, ctx.currentTime + .3);
      return { p: gs.p, txt: document.getElementById('fb').textContent, best: opt.best[2], hi: opt.HI, pop: document.getElementById('pop').textContent };
    });
    expect(r.p).toBe(2);
    expect(r.txt).toBe('Идеально');
    expect(r.best).toBeUndefined();
    expect(r.hi).toBe(0);
    expect(r.pop).toContain('Отлично 100%');
  });

  test('калибровка привязана к входу: смена входа сбрасывает её', async ({ page }) => {
    await boot(page, gameState());
    await enableGame(page);
    const r = await page.evaluate(async () => {
      const min = document.getElementById('min');
      min.innerHTML = '<option value="devB">Второй</option><option value="devA">Первый</option>';
      min.value = 'devA';
      const res = [];
      opt.CALP = {}; opt.CAL = 17; opt.CALD = true; opt.CALDEV = 'devA';
      await micOn();
      min.value = 'devB';
      await micOn();
      res.push({ cald: opt.CALD, cal: opt.CAL });
      min.innerHTML = '<option value="devB">Второй</option><option value="devA">Первый</option>';
      min.value = 'devB';
      await calib();
      res.push({ dev: cal && cal.dev });
      return res;
    });
    expect(r[0]).toEqual({ cald: false, cal: 17 });
    expect(r[1]).toEqual({ dev: 'devB' });
  });

  test('выход не наушники: микрофон не включается', async ({ page }) => {
    await page.addInitScript(() => {
      navigator.mediaDevices.enumerateDevices = async () => [
        { kind: 'audiooutput', deviceId: 'default', label: 'динамики' },
        { kind: 'audiooutput', deviceId: 'spk', label: 'динамики' },
        { kind: 'audioinput', deviceId: 'd1', label: '' },
      ];
    });
    await boot(page, gameState());
    await openTab(page, 'settings');
    await page.evaluate(() => micOn());
    await expect(page.locator('#mst')).toContainText('не похож на наушники');
    expect(await page.evaluate(() => ({ g: opt.GM, mic: mic }))).toEqual({ g: false, mic: null });
  });
});

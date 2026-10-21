const { test, expect } = require('@playwright/test');
const { boot, waitVoice, readState, openTab, openDetails, watchErrors, expectNoErrors } = require('./helpers');

const words = ['раз', 'два', 'три', 'четыре', 'и'];
const centers = { 'раз': 45, 'два': 130, 'три': 50, 'четыре': 175, 'и': 10 };
const files = { 'раз': 'raz.mp3', 'два': 'dva.mp3', 'три': 'tri.mp3', 'четыре': 'chetyre.mp3', 'и': 'i.mp3' };

async function bootWithFakeSpeech(page) {
  await page.addInitScript(() => {
    const voices = [
      { name: 'Yuri', lang: 'ru-RU' },
      { name: 'Alice', lang: 'en-US' },
      { name: 'Milena', lang: 'ru-RU' },
    ];
    const fake = {
      spoken: [],
      cancels: 0,
      getVoices: () => voices,
      speak(utterance) { this.spoken.push(utterance); },
      cancel() { this.cancels++; },
      onvoiceschanged: null,
    };
    Object.defineProperty(window, 'speechSynthesis', { value: fake, configurable: true });
    window.__fakeSS = fake;
  });
  await boot(page);
  await waitVoice(page);
}

test.describe('голос и выравнивание', () => {
  test('внешние сэмплы загружаются по ссылке и дают автосмещения', async ({ page, request }) => {
    await boot(page);
    for (const word of words) {
      const response = await request.get('/voice/' + files[word]);
      expect(response.status(), word).toBe(200);
      expect((await response.body()).subarray(0, 3).toString()).toBe('ID3');
    }
    await waitVoice(page);
    const voice = await page.evaluate(() => ({
      words: Object.keys(VB),
      lengths: Object.fromEntries(Object.entries(VB).map(([k, b]) => [k, b.length])),
      pc: { ...PC },
      offsets: { ...opt.O },
      full: full(),
    }));
    expect(voice.full).toBe(true);
    expect(voice.words.sort()).toEqual([...words].sort());
    for (const word of words) {
      expect(voice.lengths[word]).toBeGreaterThan(1000);
      expect(voice.pc[word]).toBeCloseTo(centers[word], -1);
      expect(voice.offsets[word]).toBe(-voice.pc[word]);
    }
  });

  test('статус точного голоса виден, а строка браузерного голоса скрыта', async ({ page }) => {
    await boot(page);
    await waitVoice(page);
    await openTab(page, 'settings');
    await expect(page.locator('#vst2')).toBeVisible();
    await expect(page.locator('#vst2')).toHaveText('Точный голос загружен');
    await expect(page.locator('#vst')).toBeHidden();
  });

  test('таблица выравнивания показывает пять слов и текущие смещения', async ({ page }) => {
    await boot(page);
    await waitVoice(page);
    await openTab(page, 'settings');
    await openDetails(page, 'Выравнивание голоса');
    await expect(page.locator('#tune > div')).toHaveCount(5);
    for (const word of words) {
      await expect(page.locator(`#tw${word}`)).toHaveCSS('display', 'contents');
      await expect(page.locator(`#r${word}`)).toHaveValue(String(-centers[word]));
      await expect(page.locator(`#rv${word}`)).toHaveText(`${-centers[word]} мс`);
    }
  });

  test('слайдер, авто и сброс меняют opt.O и сохраняются', async ({ page }) => {
    await boot(page);
    await waitVoice(page);
    await openTab(page, 'settings');
    await openDetails(page, 'Выравнивание голоса');
    await page.locator('#rраз').evaluate(el => {
      el.value = '-200';
      el.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await expect(page.locator('#rvраз')).toHaveText('-200 мс');
    expect((await readState(page)).opt.O['раз']).toBe(-200);
    expect((await readState(page)).saved.opt.O['раз']).toBe(-200);
    await page.locator('#tz').click();
    for (const word of words) {
      expect((await readState(page)).opt.O[word]).toBe(0);
      await expect(page.locator(`#r${word}`)).toHaveValue('0');
      await expect(page.locator(`#rv${word}`)).toHaveText('0 мс');
    }
    await page.locator('#ta').click();
    for (const word of words) {
      await expect(page.locator(`#r${word}`)).toHaveValue(String(-centers[word]));
    }
    expect((await readState(page)).saved.opt.O['четыре']).toBe(-175);
  });

  test('двойной щелчок по слайдеру возвращает автозначение', async ({ page }) => {
    await boot(page);
    await waitVoice(page);
    await openTab(page, 'settings');
    await openDetails(page, 'Выравнивание голоса');
    await page.locator('#rдва').evaluate(el => {
      el.value = '50';
      el.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await expect(page.locator('#rvдва')).toHaveText('+50 мс');
    await page.locator('#rдва').dispatchEvent('dblclick');
    await expect(page.locator('#rдва')).toHaveValue('-130');
    await expect(page.locator('#rvдва')).toHaveText('-130 мс');
    expect((await readState(page)).opt.O['два']).toBe(-130);
  });

  test('ручное смещение не перетирается при следующей загрузке', async ({ page }) => {
    await boot(page, { opt: { O: { 'раз': -200 } } });
    await waitVoice(page);
    await openTab(page, 'settings');
    const state = await readState(page);
    expect(state.opt.O['раз']).toBe(-200);
    expect(state.opt.O['два']).toBe(-130);
    expect(state.opt.O['и']).toBe(-10);
    await expect(page.locator('#rраз')).toHaveValue('-200');
  });

  test('частичная загрузка слов меняет статус и скрывает строки', async ({ page }) => {
    await boot(page);
    await waitVoice(page);
    const status = await page.evaluate(() => {
      delete VB['раз'];
      vstat();
      return {
        text: document.getElementById('vst2').textContent,
        row: getComputedStyle(document.getElementById('twраз')).display,
        other: getComputedStyle(document.getElementById('twдва')).display,
        voiceText: document.getElementById('vst').textContent,
        voiceDisplay: getComputedStyle(document.getElementById('vst')).display,
      };
    });
    expect(status.text).toBe('Загружено слов: 4 из 5');
    expect(status.row).toBe('none');
    expect(status.other).toBe('contents');
    expect(status.voiceDisplay).not.toBe('none');
    const empty = await page.evaluate(() => {
      Object.keys(VB).forEach(k => delete VB[k]);
      vstat();
      return {
        text: document.getElementById('vst2').textContent,
        voiceDisplay: getComputedStyle(document.getElementById('vst')).display,
      };
    });
    expect(empty.text).toContain('Сейчас голос браузера');
    expect(empty.voiceDisplay).not.toBe('none');
  });

  test('буферизованный голос запускает источник, opt.V выключает его', async ({ page }) => {
    await page.addInitScript(() => {
      window.__bufStarts = 0;
      const original = AudioBufferSourceNode.prototype.start;
      AudioBufferSourceNode.prototype.start = function (...args) {
        window.__bufStarts++;
        return original.apply(this, args);
      };
    });
    await boot(page);
    await waitVoice(page);
    await page.evaluate(() => { kill(); say(ctx.currentTime + .02, 'раз'); });
    await expect.poll(() => page.evaluate(() => window.__bufStarts)).toBe(1);
    await page.evaluate(() => { opt.V = false; say(ctx.currentTime + .02, 'два'); });
    await page.waitForTimeout(100);
    expect(await page.evaluate(() => window.__bufStarts)).toBe(1);
  });

  test('без загруженных сэмплов say говорит через speechSynthesis', async ({ page }) => {
    await bootWithFakeSpeech(page);
    const spoken = await page.evaluate(async () => {
      Object.keys(VB).forEach(k => delete VB[k]);
      window.__fakeSS.getVoices = () => [];
      pickVoice();
      opt.V = true;
      opt.D = 0;
      say(ctx.currentTime + .02, 'раз');
      await new Promise(r => setTimeout(r, 150));
      const u = window.__fakeSS.spoken[0];
      return u ? { text: u.text, lang: u.lang, rate: u.rate, voice: u.voice, cancels: window.__fakeSS.cancels } : null;
    });
    expect(spoken).toMatchObject({ text: 'раз', lang: 'ru-RU', rate: 1.5, voice: null });
    expect(spoken.cancels).toBeGreaterThan(0);
  });

  test('выбор русского голоса предпочитает Milena, Yuri или Katya', async ({ page }) => {
    await bootWithFakeSpeech(page);
    await openTab(page, 'settings');
    await expect(page.locator('#vst')).toHaveText('Голос: Yuri');
    await page.evaluate(() => { Object.keys(VB).forEach(k => delete VB[k]); vstat(); });
    await expect(page.locator('#vst')).toBeVisible();
    await expect(page.locator('#vst')).toHaveText('Голос: Yuri');
  });

  test('голос браузера обновляется по событию voiceschanged', async ({ page }) => {
    await bootWithFakeSpeech(page);
    const text = await page.evaluate(() => {
      window.__fakeSS.getVoices = () => [{ name: 'Milena', lang: 'ru-RU' }];
      window.__fakeSS.onvoiceschanged();
      return document.getElementById('vst').textContent;
    });
    expect(text).toBe('Голос: Milena');
  });

  test('выключение голоса отменяет отложенное произнесение', async ({ page }) => {
    await bootWithFakeSpeech(page);
    const data = await page.evaluate(async () => {
      Object.keys(VB).forEach(k => delete VB[k]);
      opt.D = 0;
      say(ctx.currentTime + 1, 'раз');
      const pending = vt.length;
      document.getElementById('ovoc').checked = false;
      document.getElementById('ovoc').dispatchEvent(new Event('change', { bubbles: true }));
      return { pending, after: vt.length, cancels: window.__fakeSS.cancels, v: opt.V };
    });
    expect(data.pending).toBe(1);
    expect(data.after).toBe(0);
    expect(data.cancels).toBeGreaterThan(0);
    expect(data.v).toBe(false);
  });

  test('нет ошибок при загрузке голоса и работе с тюнингом', async ({ page }) => {
    const errors = watchErrors(page);
    await boot(page);
    await waitVoice(page);
    await openTab(page, 'settings');
    await openDetails(page, 'Выравнивание голоса');
    await page.locator('#tz').click();
    await page.locator('#ta').click();
    await expectNoErrors(errors);
  });
});

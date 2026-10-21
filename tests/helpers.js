const { expect } = require('@playwright/test');

async function boot(page, state) {
  if (state) {
    await page.addInitScript(seed => {
      if (!sessionStorage.getItem('__rt_seeded')) {
        localStorage.clear();
        localStorage.setItem('rt2', JSON.stringify(seed));
        sessionStorage.setItem('__rt_seeded', '1');
      }
    }, state);
  }
  await page.goto('/');
  await page.waitForFunction(() => typeof B !== 'undefined' && B.length > 0);
}

async function waitVoice(page) {
  await page.waitForFunction(() => {
    if (typeof full !== 'function' || !full()) return false;
    const slider = document.getElementById('rраз');
    return !!slider && opt.O['раз'] !== undefined && slider.value === String(opt.O['раз']);
  }, null, { timeout: 15000 });
}

async function readState(page) {
  return page.evaluate(() => ({
    cur,
    shift,
    opt: JSON.parse(JSON.stringify(opt)),
    saved: JSON.parse(localStorage.getItem('rt2') || 'null'),
  }));
}

const TABS = { play: '#tplay', score: '#tscore' };

async function openTab(page, name) {
  if (name === 'settings') {
    if (await page.locator('#bset').getAttribute('aria-pressed') !== 'true') await page.locator('#bset').click();
    return;
  }
  await page.locator(TABS[name]).click();
}

async function openDetails(page, title) {
  const summary = page.locator('summary', { hasText: title });
  const details = summary.locator('..');
  if (!(await details.evaluate(el => el.open))) await summary.click();
}

function watchErrors(page) {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => {
    if (message.type() === 'error') errors.push(message.text());
  });
  return errors;
}

async function expectNoErrors(errors) {
  expect(errors, 'ошибки страницы').toEqual([]);
}

module.exports = { boot, waitVoice, readState, openTab, openDetails, watchErrors, expectNoErrors };

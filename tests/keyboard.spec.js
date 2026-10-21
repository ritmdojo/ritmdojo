const { test, expect } = require('@playwright/test');
const { boot, openTab } = require('./helpers');

test.describe('клавиатура', () => {
  test('пробел запускает и останавливает воспроизведение', async ({ page }) => {
    await boot(page, { opt: { L: 2, P: 4, count: false, V: false, N: false, GM: false }, cur: 0, shift: 0 });
    await page.keyboard.press('Space');
    await expect(page.locator('#bplay')).toHaveText('Пауза (пробел)');
    await expect.poll(() => page.evaluate(() => playing)).toBe(true);
    await page.keyboard.press('Space');
    await expect(page.locator('#bplay')).toHaveText('Старт (пробел)');
    await expect(page.locator('#phase')).toHaveText('Стоп');
    expect(await page.evaluate(() => playing)).toBe(false);
  });

  test('Enter запускает с тактом счёта', async ({ page }) => {
    await boot(page, { opt: { L: 2, P: 4, count: true, V: false, N: false, GM: false }, cur: 0, shift: 0 });
    await page.keyboard.press('Enter');
    await expect.poll(() => page.evaluate(() => playing)).toBe(true);
    await expect(page.locator('#phase')).toHaveText('Счёт');
    await expect(page.locator('#bars')).toHaveText('счёт 1 из 2');
    await expect(page.locator('#bplay')).toHaveText('Пауза (пробел)');
    await page.keyboard.press('Space');
  });

  test('стрелки, минус и равно меняют урок и темп', async ({ page }) => {
    await boot(page);
    await page.keyboard.press('ArrowRight');
    await expect(page.locator('#bpm')).toHaveText('80');
    await page.keyboard.press('ArrowLeft');
    await expect(page.locator('#bpm')).toHaveText('60');
    await page.keyboard.press('ArrowDown');
    await expect(page.locator('#pgt4')).toHaveText('Урок 4 из 123');
    await page.keyboard.press('ArrowUp');
    await expect(page.locator('#pgt4')).toHaveText('Урок 1 из 123');
    await page.keyboard.press('=');
    await expect(page.locator('#bpm')).toHaveText('65');
    await page.keyboard.press('-');
    await expect(page.locator('#bpm')).toHaveText('60');
    await page.keyboard.press('NumpadAdd');
    await expect(page.locator('#bpm')).toHaveText('65');
    await page.keyboard.press('NumpadSubtract');
    await expect(page.locator('#bpm')).toHaveText('60');
  });

  test('темп зажимается в допустимых пределах', async ({ page }) => {
    await boot(page);
    for (let i = 0; i < 20; i++) await page.keyboard.press('=');
    await expect(page.locator('#bpm')).toHaveText('120');
    expect((await page.evaluate(() => shift))).toBe(60);
    for (let i = 0; i < 30; i++) await page.keyboard.press('-');
    await expect(page.locator('#bpm')).toHaveText('30');
    expect((await page.evaluate(() => shift))).toBe(-30);
    expect(await page.evaluate(() => JSON.parse(localStorage.getItem('rt2')).shift)).toBe(-30);
  });

  test('L и N переключают повтор и звук рисунка в игре', async ({ page }) => {
    await boot(page);
    await page.keyboard.press('l');
    await expect(page.locator('#oloop')).toBeChecked();
    expect((await page.evaluate(() => opt.loop))).toBe(true);
    await page.keyboard.press('l');
    await expect(page.locator('#oloop')).not.toBeChecked();
    expect((await page.evaluate(() => opt.loop))).toBe(false);
    await page.keyboard.press('n');
    await expect(page.locator('#onp')).toBeChecked();
    expect((await page.evaluate(() => opt.NP))).toBe(true);
    await page.keyboard.press('n');
    await expect(page.locator('#onp')).not.toBeChecked();
    expect((await page.evaluate(() => opt.NP))).toBe(false);
  });

  test('цифры 1–8 игнорируются с модификаторами', async ({ page }) => {
    await boot(page);
    await page.keyboard.press('Control+2');
    await expect(page.locator('#pgt4')).toHaveText('Урок 1 из 123');
    await page.keyboard.press('Meta+3');
    await expect(page.locator('#pgt4')).toHaveText('Урок 1 из 123');
    await page.keyboard.press('Alt+4');
    await expect(page.locator('#pgt4')).toHaveText('Урок 1 из 123');
    await page.keyboard.press('Control+ArrowRight');
    await expect(page.locator('#bpm')).toHaveText('60');
    await page.keyboard.press('Meta+ArrowLeft');
    await expect(page.locator('#bpm')).toHaveText('60');
    await page.keyboard.press('Alt+=');
    await expect(page.locator('#bpm')).toHaveText('60');
  });

  test('клавиатура не перехватывает ввод в number и range', async ({ page }) => {
    await boot(page);
    await openTab(page, 'settings');
    await page.locator('#oL').focus();
    await page.keyboard.press('ArrowRight');
    await expect(page.locator('#pgt4')).toHaveText('Урок 1 из 123');
    await page.keyboard.press('Space');
    expect(await page.evaluate(() => playing)).toBe(false);
    await page.locator('#ovol').focus();
    await page.keyboard.press('ArrowLeft');
    await expect(page.locator('#pgt4')).toHaveText('Урок 1 из 123');
    expect(await page.evaluate(() => opt.G)).toBe(125);
  });

  test('Enter на кнопке не запускает обработчик дважды', async ({ page }) => {
    await boot(page, { opt: { L: 2, P: 4, count: false, V: false, N: false, GM: false }, cur: 0, shift: 0 });
    await page.locator('#bplay').focus();
    await page.keyboard.press('Enter');
    await expect.poll(() => page.evaluate(() => playing)).toBe(true);
    await expect(page.locator('#bplay')).toHaveText('Пауза (пробел)');
    await page.locator('#bplay').click();
  });

  test('пробел на кнопке Старт не запускает и не останавливает дважды', async ({ page }) => {
    await boot(page, { opt: { L: 2, P: 4, count: false, V: false, N: false, GM: false }, cur: 0, shift: 0 });
    await page.locator('#bplay').focus();
    await page.keyboard.press('Space');
    await expect.poll(() => page.evaluate(() => playing)).toBe(true);
    await expect(page.locator('#bplay')).toHaveText('Пауза (пробел)');
    expect(await page.evaluate(() => document.activeElement === document.getElementById('bplay'))).toBe(false);
    await page.locator('#bplay').click();
  });

  test('кнопка Сначала перезапускает с тактом счёта', async ({ page }) => {
    await boot(page, { opt: { L: 0, P: 1, count: true, V: false, N: false, GM: false }, cur: 5, shift: 0 });
    await page.locator('#brst').click();
    await expect(page.locator('#phase')).toHaveText('Счёт');
    await expect(page.locator('#bars')).toHaveText('счёт 1 из 2');
    expect(await page.evaluate(() => sc === cur && cur === 5)).toBe(true);
    await page.locator('#bplay').click();
  });

  test('кнопки темпа и переключения урока работают мышью', async ({ page }) => {
    await boot(page);
    await page.locator('#m5').click();
    await expect(page.locator('#bpm')).toHaveText('55');
    await page.locator('#p5').click();
    await expect(page.locator('#bpm')).toHaveText('60');
    await page.locator('#bnext').click();
    await expect(page.locator('#pgt4')).toHaveText('Урок 2 из 123');
    await page.locator('#bprev').click();
    await expect(page.locator('#pgt4')).toHaveText('Урок 1 из 123');
  });
});

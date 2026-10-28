import { chromium } from 'playwright-core';
import { pathToFileURL } from 'url';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const file = process.argv[2];
const browser = await chromium.launch({ executablePath: CHROME, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox'] });
const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
const errs = [];
page.on('pageerror', (e) => errs.push('PAGEERROR: ' + e.message));
page.on('console', (m) => { if (m.type() === 'error') errs.push('CONSOLE: ' + m.text()); });
await page.goto(pathToFileURL(file).href, { waitUntil: 'load', timeout: 90000 });
await page.waitForTimeout(11000);
await page.click('#enterBtn');
await page.waitForTimeout(2000);

const steps = [];
async function step(name, fn) { try { await fn(); steps.push(name + ':ok'); } catch (e) { steps.push(name + ':FAIL ' + e.message.slice(0, 60)); } }

await step('views', async () => {
  for (const v of ['overview', 'entrance', 'compute', 'field', 'pond', 'aqua', 'control', 'north']) {
    await page.evaluate((n) => document.querySelector('[data-view=' + n + ']').click(), v);
    await page.waitForTimeout(120);
  }
});
await step('weather', async () => {
  for (const w of ['cloud', 'rain', 'storm', 'heat', 'wind', 'fog', 'clear']) {
    await page.evaluate((k) => document.querySelector('.weather-chip[data-w=' + k + ']').click(), w);
    await page.waitForTimeout(120);
  }
});
await step('layers', async () => { await page.evaluate(() => document.querySelectorAll('.switch[data-layer]').forEach(s => s.click())); });
await step('scenarios', async () => { await page.evaluate(() => document.querySelectorAll('.scenario').forEach(s => s.click())); });
await step('modals', async () => {
  await page.evaluate(() => { for (const id of ['systemBtn', 'storyBtn', 'basisBtn']) { document.getElementById(id).click(); document.querySelector('#' + id.replace('Btn', 'Modal') + ' .closebtn')?.click(); } });
});
await step('tour', async () => { await page.click('#tourBtn'); await page.waitForTimeout(300); await page.click('#tourBtn'); });
await step('drawer', async () => { await page.click('#dataBtn'); await page.waitForTimeout(200); await page.click('#dataBtn'); });
await step('quality-perf', async () => { await page.click('#qualityPerf'); await page.waitForTimeout(600); await page.click('#qualityHigh'); });
await step('tod-slider', async () => { await page.evaluate(() => { const s = document.getElementById('v7Tod'); s.value = 75; s.dispatchEvent(new Event('input')); }); await page.waitForTimeout(300); await page.evaluate(() => { const s = document.getElementById('v7Tod'); s.value = 20; s.dispatchEvent(new Event('input')); }); });
await step('photo-mode', async () => { await page.click('#v7Photo'); await page.waitForTimeout(500); await page.click('#v7ExitPhoto'); });
await step('walk-enter', async () => { await page.click('#v8Walk'); await page.waitForTimeout(1500); });
await step('walk-third', async () => { await page.evaluate(() => document.getElementById('v8Third').click()); await page.waitForTimeout(800); });
await step('walk-fp', async () => { await page.evaluate(() => document.getElementById('v8First').click()); await page.waitForTimeout(800); });
await step('walk-move', async () => {
  await page.keyboard.down('w'); await page.waitForTimeout(1500); await page.keyboard.up('w');
  await page.keyboard.down('a'); await page.waitForTimeout(1000); await page.keyboard.up('a');
  await page.keyboard.down('Shift'); await page.keyboard.down('w'); await page.waitForTimeout(1200); await page.keyboard.up('w'); await page.keyboard.up('Shift');
});
await step('walk-vkey', async () => { await page.keyboard.press('v'); await page.waitForTimeout(600); await page.keyboard.press('v'); await page.waitForTimeout(600); });
await step('walk-exit', async () => { await page.evaluate(() => document.getElementById('v8Exit').click()); await page.waitForTimeout(1200); });
await step('snapshot', async () => { await page.click('#v7Shot'); await page.waitForTimeout(1500); });

const st = await page.evaluate(() => ({ v8: window.__v8(), v7: window.__v7() }));
console.log('STEPS', JSON.stringify(steps, null, 0));
console.log('STATE', JSON.stringify(st));
console.log('ERRORS', JSON.stringify(errs.slice(0, 8)));
await browser.close();

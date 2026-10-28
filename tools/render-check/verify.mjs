import { chromium } from 'playwright-core';
import { pathToFileURL } from 'url';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const file = process.argv[2];
const browser = await chromium.launch({ executablePath: CHROME, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox'] });
const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
const errs = [];
page.on('pageerror', (e) => errs.push('PAGEERROR: ' + e.message));
page.on('console', (m) => { if (m.type() === 'error') errs.push('CONSOLE-ERR: ' + m.text()); });
await page.goto(pathToFileURL(file).href, { waitUntil: 'load', timeout: 60000 });
await page.waitForTimeout(6000);
await page.click('#enterBtn');
await page.waitForTimeout(2500);

const res = {};
res.snapshot = await page.evaluate(() => { try { return document.getElementById('gl').toDataURL('image/png').length; } catch (e) { return 'ERR ' + e.message; } });
res.targets = await page.evaluate(() => {
  const g = document.getElementById('gl').getContext('webgl2');
  return { maxSamples: g.getParameter(g.MAX_SAMPLES) };
});
// exercise UI
for (const w of ['cloud', 'rain', 'storm', 'heat', 'wind', 'fog', 'clear']) {
  await page.evaluate((k) => document.querySelector('.weather-chip[data-w=' + k + ']').click(), w);
  await page.waitForTimeout(120);
}
for (const v of ['overview', 'entrance', 'compute', 'field', 'pond', 'aqua', 'control', 'north']) {
  await page.evaluate((n) => document.querySelector('[data-view=' + n + ']').click(), v);
  await page.waitForTimeout(120);
}
await page.evaluate(() => { document.getElementById('dataBtn').click(); document.getElementById('systemBtn').click(); document.getElementById('storyBtn').click(); document.getElementById('basisBtn').click(); document.getElementById('tourBtn').click(); });
await page.waitForTimeout(800);
res.layerToggles = await page.evaluate(() => { let n = 0; document.querySelectorAll('.switch[data-layer]').forEach(s => { s.click(); n++; }); return n; });
await page.keyboard.press('w'); await page.keyboard.press('c'); await page.keyboard.press('l'); await page.keyboard.press('d');
await page.waitForTimeout(800);
res.fps = await page.evaluate(() => new Promise((res) => { let c = 0; const t0 = performance.now(); const f = () => { c++; if (performance.now() - t0 < 2000) requestAnimationFrame(f); else res(Math.round(c / ((performance.now() - t0) / 1000))); }; requestAnimationFrame(f); }));
res.errors = errs.slice(0, 12);
console.log(JSON.stringify(res, null, 1));
await browser.close();

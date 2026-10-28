import { chromium } from 'playwright-core';
import { pathToFileURL } from 'url';
import fs from 'fs';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const file = process.argv[2];
const browser = await chromium.launch({ executablePath: CHROME, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox'] });
const ctx = await browser.newContext({ viewport: { width: 1600, height: 1000 }, acceptDownloads: true });
const page = await ctx.newPage();
await page.goto(pathToFileURL(file).href, { waitUntil: 'load', timeout: 60000 });
await page.waitForTimeout(6000);
try { await page.click('#enterBtn'); } catch (e) {}
await page.waitForTimeout(2500);

const fps = await page.evaluate(() => new Promise((res) => {
  let c = 0; const t0 = performance.now();
  const f = () => { c++; if (performance.now() - t0 < 3000) requestAnimationFrame(f); else res(+(c / ((performance.now() - t0) / 1000)).toFixed(1)); };
  requestAnimationFrame(f);
}));

let dl = 'n/a';
const shotBtn = await page.$('#v7Shot');
if (shotBtn) {
  const [download] = await Promise.all([
    page.waitForEvent('download', { timeout: 20000 }).catch(() => null),
    page.click('#v7Shot'),
  ]);
  if (download) { const p = 'snap_test.png'; await download.saveAs(p); dl = p + ' ' + fs.statSync(p).size + ' bytes'; }
  else dl = 'no download event';
}
console.log(JSON.stringify({ file: file.split('/').pop(), fps, download: dl }));
await browser.close();

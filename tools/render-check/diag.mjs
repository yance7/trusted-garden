import { chromium } from 'playwright-core';
import { pathToFileURL } from 'url';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const file = process.argv[2];
const browser = await chromium.launch({
  executablePath: CHROME,
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox'],
});
const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
page.on('pageerror', (e) => console.log('PAGEERROR:', e.message));
page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') console.log('CONSOLE', m.type(), m.text()); });
await page.goto(pathToFileURL(file).href, { waitUntil: 'load', timeout: 60000 });
await page.waitForTimeout(6000);
await page.click('#enterBtn');
await page.waitForTimeout(1500);
const r = await page.evaluate(() => {
  const app = document.getElementById('app');
  const before = getComputedStyle(document.querySelector('.topbar')).opacity;
  document.getElementById('v7Photo').click();
  return {
    cls: app.className,
    before,
    parentOfTopbar: document.querySelector('.topbar').parentElement.id || document.querySelector('.topbar').parentElement.className,
    rulesFound: (() => { let n = 0; for (const ss of document.styleSheets) { try { for (const r of ss.cssRules) if (r.cssText && r.cssText.indexOf('v7-photo') >= 0) n++; } catch (e) {} } return n; })(),
    sheets: document.styleSheets.length,
  };
});
await page.waitForTimeout(1200);
const after = await page.evaluate(() => ({
  cls: document.getElementById('app').className,
  topbar: getComputedStyle(document.querySelector('.topbar')).opacity,
  leftRail: getComputedStyle(document.querySelector('.left-rail')).opacity,
  exitBtn: getComputedStyle(document.getElementById('v7ExitPhoto')).display,
}));
console.log(JSON.stringify({ ...r, after }, null, 2));
await browser.close();

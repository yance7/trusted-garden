import { chromium } from 'playwright-core';
import { pathToFileURL } from 'url';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const file = process.argv[2];
const browser = await chromium.launch({ executablePath: CHROME, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox'] });
const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
await page.goto(pathToFileURL(file).href, { waitUntil: 'load', timeout: 60000 });
await page.waitForTimeout(6000);
await page.click('#enterBtn');
await page.waitForTimeout(1200);
const r = await page.evaluate(() => {
  document.getElementById('v7Photo').click();
  const tb = document.querySelector('.topbar');
  const out = { matches: tb.matches('#app.v7-photo .topbar'), rules: [], matched: [] };
  for (const ss of document.styleSheets) {
    let rules; try { rules = ss.cssRules; } catch (e) { continue; }
    for (const rule of rules) {
      if (rule.selectorText && rule.selectorText.indexOf('v7-photo') >= 0) {
        out.rules.push(rule.selectorText.slice(0, 120) + '  ==>  ' + rule.style.cssText.slice(0, 80));
      }
    }
  }
  return out;
});
await page.waitForTimeout(1000);
const after = await page.evaluate(() => {
  const tb = document.querySelector('.topbar');
  const cs = getComputedStyle(tb);
  return { opacity: cs.opacity, transition: cs.transition.slice(0, 60), cls: document.getElementById('app').className };
});
console.log(JSON.stringify(r, null, 1));
console.log('AFTER', JSON.stringify(after));
await browser.close();

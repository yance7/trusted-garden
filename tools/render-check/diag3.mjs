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
await page.evaluate(() => document.getElementById('v7Photo').click());
await page.waitForTimeout(3000);
const r = await page.evaluate(() => {
  const tb = document.querySelector('.topbar');
  const cs = getComputedStyle(tb);
  return {
    inlineStyle: tb.getAttribute('style'),
    inlineOpacity: tb.style.opacity,
    anims: tb.getAnimations().map(a => (a.transitionProperty || a.animationName || '?') + ':' + a.playState),
    count: document.querySelectorAll('.topbar').length,
    opacity: cs.opacity,
    visibility: cs.visibility,
    display: cs.display,
    parentOpacity: getComputedStyle(tb.parentElement).opacity,
    appOpacity: getComputedStyle(document.getElementById('app')).opacity,
    appFilter: getComputedStyle(document.getElementById('app')).filter,
  };
});
console.log(JSON.stringify(r, null, 1));
await browser.close();

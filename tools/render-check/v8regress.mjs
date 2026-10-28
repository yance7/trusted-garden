import { chromium } from 'playwright-core';
import { pathToFileURL } from 'url';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const file = process.argv[2];
const browser = await chromium.launch({ executablePath: CHROME, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox'] });
const page = await browser.newPage({ viewport: { width: 1300, height: 850 } });
const errs = [];
page.on('pageerror', (e) => errs.push('PAGEERROR: ' + e.message));
page.on('console', (m) => { if (m.type() === 'error') errs.push('CONSOLE: ' + m.text()); });
await page.goto(pathToFileURL(file).href, { waitUntil: 'load', timeout: 90000 });
await page.waitForTimeout(11000);
await page.click('#enterBtn');
await page.waitForTimeout(2000);

const R = {};
async function snap(tag) { R[tag] = await page.evaluate(() => ({ v8: window.__v8(), v7: window.__v7(), head: window.__v8head() })); }

// force weather to clear
await page.evaluate(() => document.querySelector('.weather-chip[data-w=clear]').click());
await page.waitForTimeout(600);
await snap('before');

// enter walk mode
await page.click('#v8Walk');
await page.waitForTimeout(2000);
await snap('walkEntered');

// walk forward with W (the key that used to also cycle the weather)
await page.keyboard.down('w');
await page.waitForTimeout(2500);
await page.keyboard.up('w');
await page.keyboard.down('d');
await page.waitForTimeout(1500);
await page.keyboard.up('d');
await page.waitForTimeout(800);
await snap('afterWalk');

// V -> first person; head must be hidden
await page.keyboard.press('v');
await page.waitForTimeout(1200);
await snap('firstPerson');

// G -> exit, G -> enter
await page.keyboard.press('g');
await page.waitForTimeout(1200);
await snap('afterG1');
await page.keyboard.press('g');
await page.waitForTimeout(1500);
await snap('afterG2');

const rows = Object.keys(R).map(k => {
  const r = R[k];
  return [
    k.padEnd(13),
    'walk=' + String(r.v8.walkMode).padEnd(5),
    'cam=' + r.v8.cam.padEnd(6),
    'weather=' + r.v7.weather.padEnd(6),
    'pos=(' + r.v8.charPos[0] + ',' + r.v8.charPos[1] + ')'.padEnd(4),
    'headVisible=' + r.head.visible + '/' + r.head.headParts
  ].join('  ');
});
console.log(rows.join('\n'));
console.log('ERRORS', JSON.stringify(errs));
await browser.close();

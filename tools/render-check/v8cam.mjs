import { chromium } from 'playwright-core';
import { pathToFileURL } from 'url';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const file = process.argv[2];
const browser = await chromium.launch({ executablePath: CHROME, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox'] });
const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
const errs = [];
page.on('pageerror', (e) => errs.push('PAGEERROR: ' + e.message));
await page.goto(pathToFileURL(file).href, { waitUntil: 'load', timeout: 90000 });
await page.waitForTimeout(10000);
await page.click('#enterBtn');
await page.waitForTimeout(2000);
// orbit view aimed straight at the character
await page.evaluate(() => window.__v8look());
await page.waitForTimeout(5000);
console.log('ORBIT_AT_CHAR', JSON.stringify(await page.evaluate(() => window.__v8cam())));
await page.screenshot({ path: '../screenshots/v0.8/d1_charbox.png' });

await page.click('#v8Walk');
await page.waitForTimeout(5000);
console.log('THIRD', JSON.stringify(await page.evaluate(() => window.__v8cam())));
await page.screenshot({ path: '../screenshots/v0.8/d2_third.png' });
console.log('ERRORS', JSON.stringify(errs.slice(0, 6)));
await browser.close();

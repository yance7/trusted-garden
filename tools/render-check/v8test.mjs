import { chromium } from 'playwright-core';
import { pathToFileURL } from 'url';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const file = process.argv[2];
const browser = await chromium.launch({ executablePath: CHROME, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox'] });
const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
const errs = [];
page.on('pageerror', (e) => errs.push('PAGEERROR: ' + e.message));
page.on('console', (m) => { if (m.type() === 'error') errs.push('CONSOLE: ' + m.text()); });
await page.goto(pathToFileURL(file).href, { waitUntil: 'load', timeout: 90000 });
await page.waitForTimeout(12000);

const boot = await page.evaluate(() => ({ v7: window.__v7 ? window.__v7() : 'none', v8: window.__v8 ? window.__v8() : 'none' }));
console.log('BOOT', JSON.stringify(boot));

await page.click('#enterBtn');
await page.waitForTimeout(2500);
await page.evaluate(() => document.querySelector('[data-view=overview]').click());
await page.waitForTimeout(3500);
await page.screenshot({ path: '../screenshots/v0.8/w1_orbit.png' });

// enter walk mode (third person)
await page.click('#v8Walk');
await page.waitForTimeout(3500);
await page.screenshot({ path: '../screenshots/v0.8/w2_third.png' });

// walk forward a bit
await page.keyboard.down('w');
await page.waitForTimeout(3000);
await page.keyboard.up('w');
await page.waitForTimeout(1200);
const afterWalk = await page.evaluate(() => window.__v8());
await page.screenshot({ path: '../screenshots/v0.8/w3_walked.png' });

// first person
await page.evaluate(() => document.getElementById('v8First').click());
await page.waitForTimeout(3000);
await page.screenshot({ path: '../screenshots/v0.8/w4_first.png' });

// look around in first person
await page.mouse.move(800, 500);
await page.mouse.down();
await page.mouse.move(560, 470, { steps: 10 });
await page.mouse.up();
await page.waitForTimeout(2500);
await page.screenshot({ path: '../screenshots/v0.8/w5_first_look.png' });

const fp = await page.evaluate(() => window.__v8());
console.log('AFTER_WALK', JSON.stringify(afterWalk));
console.log('FIRST_PERSON', JSON.stringify(fp));
console.log('ERRORS', JSON.stringify(errs.slice(0, 10)));
await browser.close();

import { chromium } from 'playwright-core';
import { pathToFileURL } from 'url';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const file = process.argv[2];
const browser = await chromium.launch({ executablePath: CHROME, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const errs = [];
page.on('pageerror', (e) => errs.push(e.message));
await page.goto(pathToFileURL(file).href, { waitUntil: 'load', timeout: 60000 });
await page.waitForTimeout(9000);
await page.click('#enterBtn');
await page.waitForTimeout(3000);
await page.evaluate(() => document.querySelector('[data-view=field]').click());
await page.waitForTimeout(4000);

// static-camera temporal stability (measures intentional animation only)
await page.evaluate(() => window.__v7flicker(6));
await page.waitForTimeout(30000);
const staticRes = await page.evaluate(() => window.__v7flickerResult());

// tiny-rotation test: nudge yaw between frames -> exposes z-fighting swaps
await page.evaluate(() => { window.__v7nudge = true; window.__v7flicker(6); });
await page.waitForTimeout(30000);
const rotRes = await page.evaluate(() => window.__v7flickerResult());
console.log(JSON.stringify({ staticRes, rotRes, errors: errs.slice(0, 5) }, null, 1));
await browser.close();

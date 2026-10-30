import { chromium } from 'playwright-core';
import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';

const target = process.argv[2] || 'http://127.0.0.1:4175/';
const out = process.env.EVIDENCE_DIR || 'evidence/viewport';
mkdirSync(out, { recursive: true });
const browser = await chromium.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  args: ['--use-angle=d3d11', '--ignore-gpu-blocklist', '--disable-gpu-sandbox', '--no-sandbox'],
  ...(process.env.BROWSER_PROXY ? { proxy: { server: process.env.BROWSER_PROXY } } : {})
});
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(target, { timeout: 300000 });
  await page.waitForFunction(() => window.__garden?.ready, null, { timeout: 300000 });
  await page.click('#enterBtn');
  const results = [];
  for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
    await page.setViewportSize(viewport);
    // Reproduce focus/scroll-into-view shifting a body with overflow:hidden.
    await page.evaluate(() => { document.body.scrollLeft = 28; });
    await page.screenshot({ path: `${out}/${viewport.width}.png` });
    const initial = await page.evaluate(() => ({
      bodyLeft: document.body.scrollLeft, bodyWidth: document.body.scrollWidth,
      appLeft: document.querySelector('#app').getBoundingClientRect().left
    }));
    assert.equal(initial.bodyLeft, 0, 'closed drawer must not create a horizontally scrollable body');
    assert.equal(initial.appLeft, 0, 'farm must stay aligned with viewport');
    await page.evaluate(() => document.querySelector('#dataBtn').click());
    await page.waitForTimeout(400);
    const bounds = await page.locator('#drawer').boundingBox();
    assert.ok(bounds && bounds.x >= 0 && bounds.x + bounds.width <= viewport.width + 1);
    await page.evaluate(() => document.querySelector('#dataBtn').click());
    await page.waitForTimeout(400);
    await page.evaluate(() => { document.body.scrollLeft = 28; });
    assert.equal(await page.evaluate(() => document.body.scrollLeft), 0);
    await page.screenshot({ path: `${out}/${viewport.width}.png` });
    results.push({ viewport, ...initial });
  }
  assert.deepEqual(errors, []);
  writeFileSync(`${out}/results.json`, JSON.stringify({ target, results, errors }, null, 2));
  console.log(JSON.stringify({ results, errors }));
} finally { await browser.close(); }

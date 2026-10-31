import {chromium} from 'playwright-core';
import {writeFileSync} from 'node:fs';

const target = process.argv[2] || 'http://127.0.0.1:4175/';
const seconds = Number(process.argv[3] || 20);
const browser = await chromium.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  args: ['--use-angle=d3d11', '--ignore-gpu-blocklist', '--disable-gpu-sandbox', '--no-sandbox']
});
try {
  const page = await browser.newPage({viewport: {width: 1920, height: 1080}});
  await page.goto(target);
  await page.waitForFunction(() => window.__garden?.ready, null, {timeout: 180000});
  await page.click('#enterBtn');
  await page.keyboard.press('g');
  await page.waitForTimeout(1200);
  const samples = await page.evaluate(async secs => {
    const values = [];
    let previous = performance.now(); const start = previous;
    window.__walk = true;
    window.dispatchEvent(new KeyboardEvent('keydown', {key: 'w'}));
    await new Promise(resolve => {
      function frame(now) {
        values.push(now - previous); previous = now;
        if (now - start < secs * 1000) requestAnimationFrame(frame); else resolve();
      }
      requestAnimationFrame(frame);
    });
    window.dispatchEvent(new KeyboardEvent('keyup', {key: 'w'}));
    return values.slice(30);
  }, seconds);
  const sorted = [...samples].sort((a, b) => a - b);
  const result = {
    mode: 'walk-forward', seconds, frames: samples.length,
    meanMs: +(samples.reduce((a, b) => a + b, 0) / samples.length).toFixed(2),
    p95Ms: +sorted[Math.floor(sorted.length * .95)].toFixed(2),
    stats: await page.evaluate(() => window.__garden.stats())
  };
  writeFileSync('evidence/benchmark-walk.json', JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result));
} finally { await browser.close(); }

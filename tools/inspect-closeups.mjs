import {chromium} from 'playwright-core';
import {mkdirSync} from 'node:fs';

const base = process.argv[2] || 'http://127.0.0.1:4175/';
const out = process.env.EVIDENCE_DIR || 'evidence/polish';
mkdirSync(out, {recursive: true});

// Orbit + zoom the way a visitor does, so captures show the real reachable framing.
const shots = [
  ['corn',   'field',  {zoom: 9,  orbit: [-260, 40]}],
  ['plot-a', 'field',  {zoom: 14, orbit: [300, -60]}],
  ['tree',   'north',  {zoom: 16, orbit: [120, 30]}],
  ['control','control',{zoom: 10, orbit: [-140, 20]}],
  ['pond',   'pond',   {zoom: 12, orbit: [200, -70]}],
  ['aqua',   'aqua',   {zoom: 11, orbit: [-180, 25]}],
  ['robot',  'compute',{zoom: 15, orbit: [90, 60]}],
  ['walk',   null,     {zoom: 0,  orbit: []}],
  ['ground', 'entrance',{zoom: 18, orbit: [40, -80]}],
];

const browser = await chromium.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  args: ['--use-angle=d3d11', '--ignore-gpu-blocklist', '--disable-gpu-sandbox', '--no-sandbox'],
  ...(process.env.BROWSER_PROXY ? {proxy: {server: process.env.BROWSER_PROXY}} : {})
});
try {
  const page = await browser.newPage({viewport: {width: 1600, height: 1000}});
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto(base, {waitUntil: 'domcontentloaded'});
  await page.waitForFunction(() => window.__garden?.ready, null, {timeout: 180000});
  await page.click('#enterBtn');
  await page.click('#v7Photo');           // hide chrome so only the model is judged
  await page.waitForFunction(() => window.__garden.stats().textureDelivery.status === 'complete', null, {timeout: 300000})
    .catch(() => console.log('note: native textures still upgrading'));

  for (const [name, view, {zoom, orbit}] of shots) {
    if (view) {
      await page.evaluate(v => window.__garden.focus(v), view);
      await page.waitForTimeout(1400);
    } else {
      await page.evaluate(() => window.__garden.focus('entrance'));
      await page.waitForTimeout(900);
      await page.keyboard.press('g');
      await page.waitForTimeout(600);
      await page.keyboard.down('w'); await page.waitForTimeout(1600); await page.keyboard.up('w');
      await page.waitForTimeout(900);
    }
    for (let i = 0; i < zoom; i++) { await page.mouse.wheel(0, -240); await page.waitForTimeout(70); }
    if (orbit.length) {
      const [dx, dy] = orbit;
      await page.mouse.move(800, 500); await page.mouse.down();
      await page.mouse.move(800 + dx, 500 + dy, {steps: 14}); await page.mouse.up();
      await page.waitForTimeout(1200);
    }
    await page.waitForTimeout(500);
    await page.screenshot({path: `${out}/${name}.png`});
    const s = await page.evaluate(() => window.__garden.stats());
    console.log(JSON.stringify({name, view, calls: s.calls, tris: s.renderedTriangles, cam: s.camera.map(n => +n.toFixed(2))}));
  }
  await page.keyboard.press('Escape');
  console.log('ERRORS ' + JSON.stringify(errors));
} finally { await browser.close(); }

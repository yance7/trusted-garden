import {chromium} from 'playwright-core';
import {mkdirSync} from 'node:fs';

// Surface-level material audit: tight framing on each authored family so tiling,
// specular and silhouette defects are visible at the sizes visitors actually use.
const base = process.argv[2] || 'http://127.0.0.1:4174/';
const out = process.env.EVIDENCE_DIR || 'evidence/materials';
const time = process.env.AUDIT_TIME ? Number(process.env.AUDIT_TIME) : null;
mkdirSync(out, {recursive: true});

// view, wheel zooms, orbit [dx, dy], optional walk-mode ground level
const shots = ([
  ['path',     'entrance', {zoom: 12, orbit: [-120, -40]}],
  ['kerb',     'entrance', {zoom: 16, orbit: [220, -20]}],
  ['deck',     'pond',     {zoom: 14, orbit: [-200, -30]}],
  ['water',    'pond',     {zoom: 18, orbit: [60, -60]}],
  ['bark',     'north',    {zoom: 20, orbit: [140, -40]}],
  ['canopy',   'north',    {zoom: 10, orbit: [-90, -80]}],
  ['soil',     'field',    {zoom: 16, orbit: [180, -50]}],
  ['leaf',     'field',    {zoom: 20, orbit: [-140, -30]}],
  ['metal',    'control',  {zoom: 14, orbit: [90, -40]}],
  ['screens',  'control',  {zoom: 12, orbit: [-60, -20]}],
  ['glass',    'aqua',     {zoom: 13, orbit: [150, -30]}],
  ['robot',    'compute',  {zoom: 14, orbit: [-110, -30]}],
  ['ground',   null,       {zoom: 0,  orbit: [], mode: 'first'}],
  ['trunk',    'north',    {zoom: 26, orbit: [40, -90]}],
  ['person',   null,       {zoom: 4,  orbit: [40, 10], mode: 'third'}],
]).filter(([name]) => !process.env.AUDIT_ONLY || process.env.AUDIT_ONLY.split(',').includes(name));

const browser = await chromium.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  args: ['--use-angle=d3d11', '--ignore-gpu-blocklist', '--disable-gpu-sandbox', '--no-sandbox'],
  ...(process.env.BROWSER_PROXY ? {proxy: {server: process.env.BROWSER_PROXY}} : {})
});
try {
  const page = await browser.newPage({viewport: {width: 1600, height: 1000}, deviceScaleFactor: 1});
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto(base, {waitUntil: 'domcontentloaded'});
  await page.waitForFunction(() => window.__garden?.ready, null, {timeout: 180000});
  await page.click('#enterBtn');
  await page.click(`#quality-${process.env.AUDIT_QUALITY || 'photo'}`);
  if (time !== null) await page.evaluate(t => window.__garden.setTime(t), time);
  await page.click('#v7Photo');
  await page.waitForFunction(() => window.__garden.stats().textureDelivery.status === 'complete', null, {timeout: 300000})
    .catch(() => console.log('note: native textures still upgrading'));

  for (const [name, view, {zoom, orbit, mode = 'first'}] of shots) {
    if (view) {
      await page.evaluate(v => window.__garden.focus(v), view);
      await page.waitForTimeout(1500);
    } else {
      await page.evaluate(() => window.__garden.focus('entrance'));
      await page.waitForTimeout(900);
      await page.keyboard.press('g');
      await page.waitForTimeout(700);
      await page.keyboard.down('w'); await page.waitForTimeout(1500); await page.keyboard.up('w');
      await page.waitForTimeout(900);
      if (mode === 'first') await page.keyboard.press('v');   // first person, eye height
      await page.waitForTimeout(700);
    }
    for (let i = 0; i < zoom; i++) { await page.mouse.wheel(0, -240); await page.waitForTimeout(70); }
    if (orbit.length) {
      const [dx, dy] = orbit;
      await page.mouse.move(800, 500); await page.mouse.down();
      await page.mouse.move(800 + dx, 500 + dy, {steps: 14}); await page.mouse.up();
      await page.waitForTimeout(1300);
    }
    await page.waitForTimeout(600);
    await page.screenshot({path: `${out}/${name}.png`});
    const s = await page.evaluate(() => window.__garden.stats());
    console.log(JSON.stringify({name, calls: s.calls, tris: s.renderedTriangles, canvas: s.canvas}));
    if (!view) { if (mode === 'first') await page.keyboard.press('v'); await page.keyboard.press('g'); }
  }
  console.log('ERRORS ' + JSON.stringify(errors));
} finally { await browser.close(); }

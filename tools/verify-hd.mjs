import { chromium } from 'playwright-core';
import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
const target = process.argv[2] || 'http://127.0.0.1:4173/';
const out = process.env.EVIDENCE_DIR || 'evidence'; mkdirSync(out, { recursive: true });
const args = process.env.SOFTWARE_RENDERING ? ['--use-angle=swiftshader','--enable-unsafe-swiftshader','--no-sandbox'] : ['--use-angle=d3d11','--ignore-gpu-blocklist','--disable-gpu-sandbox','--no-sandbox'];
const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', args, headless: true });
try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, acceptDownloads: true });
  const page = await context.newPage(), errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto(target.startsWith('http') ? target : pathToFileURL(target).href, { timeout: 120000, waitUntil: 'load' });
  await page.waitForFunction(() => window.__garden?.ready, null, { timeout: 120000 });
  await page.click('#enterBtn');
  await page.waitForTimeout(1200);
  const state = () => page.evaluate(() => window.__garden.getState());
  const steps = [];
  for (const view of ['overview', 'entrance', 'compute', 'field', 'pond', 'aqua', 'control', 'north']) {
    await page.click(`[data-view="${view}"]`);
    assert.equal((await state()).view, view);
    if (process.env.CAPTURE_ALL) { await page.waitForTimeout(2200); await page.screenshot({ path: `${out}/${view}.png` }); }
  }
  steps.push('eight views');
  for (const weather of ['clear', 'cloud', 'rain', 'storm', 'heat', 'wind', 'fog']) { await page.click(`[data-w="${weather}"]`); assert.equal((await state()).weather, weather); }
  steps.push('seven weather states');
  await page.click('[data-w="clear"]');
  for (const quality of ['performance', 'high', 'photo']) { await page.click(`#quality-${quality}`); assert.equal((await state()).quality, quality); }
  await page.click('#quality-high'); steps.push('quality modes');
  await page.click('#dataBtn');
  for(const layer of ['sensors','robotics','compute','network','actuators','irrigation','waterloop']){
    await page.click(`[data-layer="${layer}"]`);assert.equal((await state()).layers[layer],false);
  }
  await page.click('#dataBtn');await page.click('#quality-performance');
  assert.equal((await state()).layers.sensors,false);
  await page.click('#quality-high');await page.click('#dataBtn');
  for(const layer of ['sensors','robotics','compute','network','actuators','irrigation','waterloop'])await page.click(`[data-layer="${layer}"]`);
  for(const scenario of ['drought','oxygen','nutrient','normal']){await page.click(`[data-s="${scenario}"]`);assert.equal((await state()).scenario,scenario);}
  await page.click('#dataBtn');steps.push('layers, scenarios, drawer and quality persistence');
  for(const button of ['system','story','basis']){await page.click(`#${button}Btn`);assert.ok(await page.locator(`#${button}Modal`).evaluate(e=>e.classList.contains('open')));await page.locator(`#${button}Modal .closebtn`).click();}
  steps.push('three authored dialogs');
  await page.click('#tourBtn');assert.equal((await state()).tour,true);await page.click('#nextTour');await page.click('#tourBtn');assert.equal((await state()).tour,false);steps.push('guided tour');
  await page.locator('#v7Tod').fill('75');await page.locator('#v7Tod').dispatchEvent('input');assert.equal((await state()).time,.75);
  await page.locator('#daySlider').fill('20');await page.locator('#daySlider').dispatchEvent('input');assert.equal((await state()).day,20);
  await page.locator('#daySlider').fill('46');await page.locator('#daySlider').dispatchEvent('input');
  await page.locator('#v7Tod').fill('44');await page.locator('#v7Tod').dispatchEvent('input');steps.push('time and growth');
  await page.click('#v7Photo');assert.equal((await state()).photo,true);await page.click('#v7ExitPhoto');assert.equal((await state()).photo,false);steps.push('photo mode');
  const downloadPromise=page.waitForEvent('download');await page.click('#v7Shot');const download=await downloadPromise;assert.match(download.suggestedFilename(),/\.png$/);await download.saveAs(`${out}/snapshot.png`);steps.push('actual PNG snapshot download');
  await page.click('#v8Walk'); assert.equal((await state()).walkMode, true);
  const before = await state(); await page.keyboard.down('w'); await page.waitForTimeout(700); await page.keyboard.up('w');
  assert.equal((await state()).weather, before.weather);
  const afterMove=await state();assert.ok(Math.hypot(afterMove.position[0]-before.position[0],afterMove.position[2]-before.position[2])>.1);
  await page.keyboard.press('v'); assert.equal((await state()).person, 'first');
  await page.waitForFunction(()=>window.__garden.stats().headVisible===false);
  assert.equal((await page.evaluate(() => window.__garden.stats())).headVisible, false);
  await page.keyboard.press('g'); assert.equal((await state()).walkMode, false); steps.push('walk and first-person shortcut priority');
  await page.click('[data-view="overview"]'); await page.waitForTimeout(1600);
  await page.screenshot({ path: `${out}/hd-overview.png` });
  const stats = await page.evaluate(() => window.__garden.stats());
  assert.ok(stats.triangles > 0); assert.ok(stats.meshes > 0); assert.deepEqual(errors, []);
  const failPage=await context.newPage();await failPage.route('**/assets/manifest.json',route=>route.fulfill({status:503,body:'unavailable'}));
  await failPage.goto(target);await failPage.waitForSelector('#hdRetry');assert.match(await failPage.locator('#hdLoadError').innerText(),/503/);await failPage.unroute('**/assets/manifest.json');await failPage.click('#hdRetry');await failPage.waitForFunction(()=>window.__garden?.ready,null,{timeout:120000});await failPage.close();steps.push('asset failure and retry');
  writeFileSync(`${out}/browser.json`, JSON.stringify({ target, steps, stats, errors }, null, 2));
  console.log(JSON.stringify({ steps, stats, errors }));
  await context.close();
} finally { await browser.close(); }

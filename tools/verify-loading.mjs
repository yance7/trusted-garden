import {chromium} from 'playwright-core';
import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';
const target=process.argv[2]||'http://127.0.0.1:4175/';
const out=process.env.EVIDENCE_DIR||'evidence/loading-regression';mkdirSync(out,{recursive:true});
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',args:['--use-angle=d3d11','--ignore-gpu-blocklist','--disable-gpu-sandbox','--no-sandbox'],...(process.env.BROWSER_PROXY?{proxy:{server:process.env.BROWSER_PROXY}}:{})});
try{
 const p=await browser.newPage({viewport:{width:1440,height:900}}),requests=[],errors=[];
 p.on('request',r=>requests.push(r.url()));p.on('pageerror',e=>errors.push(e.message));
 // A single stalled native texture must not gate entry into the farm.
 let hold=true;const held=[];const nativeTextures=/\/assets\/textures\/.*\.(webp|ktx2)(\?|$)/;
 await p.route(nativeTextures,r=>hold?held.push(r):r.request().url().includes('soil-normal')?r.fulfill({status:503,body:'temporarily unavailable'}):r.continue());
 const start=Date.now();await p.goto(target,{waitUntil:'domcontentloaded',timeout:120000});
 await p.waitForFunction(()=>window.__garden?.ready,null,{timeout:15000});
 await p.click('#enterBtn');await p.click('[data-view="field"]');
 assert.equal((await p.evaluate(()=>window.__garden.getState())).view,'field');
 assert.equal(await p.locator('#loading').isVisible(),false);
 assert.ok((await p.evaluate(()=>window.__garden.stats())).triangles>=500000);
 assert.deepEqual(errors,[]);
 await p.screenshot({path:`${out}/interactive-with-hd-blocked.png`});
 const readyMs=Date.now()-start;
 if(process.argv.includes('--entry-only')){
  const stats=await p.evaluate(()=>window.__garden.stats());writeFileSync(`${out}/entry.json`,JSON.stringify({readyMs,stats,errors},null,2));console.log(JSON.stringify({readyMs,stats,errors}));
 }else{
 hold=false;for(const route of held)await route.continue();
 await p.waitForSelector('#hdTextureRetry',{timeout:120000});
 const partial=await p.evaluate(()=>window.__garden.stats().textureDelivery);assert.ok(partial.completed>0&&partial.completed<partial.total);
 assert.equal(await p.locator('#loading').isVisible(),false);
 await p.unroute(nativeTextures);
 await p.click('#hdTextureRetry');
 await p.waitForFunction(()=>window.__garden.stats().textureDelivery?.status==='complete',null,{timeout:180000});
 const stats=await p.evaluate(()=>window.__garden.stats());assert.ok(stats.textureDelivery.compressed>0);
 assert.deepEqual(errors,[]);
 assert.equal(stats.textureDelivery.completed,partial.completed+1,'retry only fills the failed map');
 writeFileSync(`${out}/results.json`,JSON.stringify({readyMs,partial,stats,requests,errors},null,2));console.log(JSON.stringify({readyMs,partial,stats,errors}));
 }
}finally{await browser.close()}

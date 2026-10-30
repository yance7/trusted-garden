import {chromium} from 'playwright-core';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const target=process.argv[2]||'http://127.0.0.1:4175/';
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',args:['--use-angle=d3d11','--ignore-gpu-blocklist','--disable-gpu-sandbox','--no-sandbox']});
const fixture=readFileSync('tools/fixtures/test-native.ktx2'),results=[];
try{
 for(const mode of ['no-ImageBitmap','decoder-error','decoder-stall']){
  const p=await browser.newPage({viewport:{width:1024,height:768}});let requests=0;
  if(mode==='no-ImageBitmap')await p.addInitScript(()=>{window.ImageBitmap=undefined;window.createImageBitmap=undefined;});
  await p.route('**/assets/textures/*.ktx2',r=>{requests++;return r.fulfill({status:200,body:fixture,contentType:'image/ktx2'});});
  // Small native-format fixture isolates recovery from asset size/authoring.
  if(mode==='decoder-error')await p.route('**/assets/basis/*.wasm',r=>r.fulfill({status:503,body:'decoder unavailable'}));
  if(mode==='decoder-stall')await p.route('**/assets/basis/*.wasm',()=>{});
  await p.goto(target);await p.waitForFunction(()=>window.__garden?.ready,null,{timeout:30000});await p.click('#enterBtn');
  if(mode==='no-ImageBitmap')await p.waitForFunction(()=>window.__garden.stats().textureDelivery.status==='complete',null,{timeout:20000});
  else{
   await p.waitForSelector('#hdTextureRetry',{timeout:40000});assert.ok(requests<=1,`shared decoder failure downloaded ${requests} native maps`);
   assert.equal(await p.locator('#loading').isVisible(),false);
   await p.unroute('**/assets/basis/*.wasm');await p.click('#hdTextureRetry');
   await p.waitForFunction(()=>window.__garden.stats().textureDelivery.status==='complete',null,{timeout:20000});
  }
  const delivery=await p.evaluate(()=>window.__garden.stats().textureDelivery);assert.equal(delivery.completed,delivery.total);
  results.push({mode,requests,delivery});await p.close();
 }
 console.log(JSON.stringify(results));
}finally{await browser.close()}

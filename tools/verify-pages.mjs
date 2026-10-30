import {chromium} from 'playwright-core';
import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';
const base=process.argv[2]||'http://127.0.0.1:4175/',out=process.env.EVIDENCE_DIR||'evidence/pages';mkdirSync(out,{recursive:true});
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',args:['--use-angle=d3d11','--ignore-gpu-blocklist','--disable-gpu-sandbox','--no-sandbox'],...(process.env.BROWSER_PROXY?{proxy:{server:process.env.BROWSER_PROXY}}:{})});
const url=file=>new URL(file,base).href,results=[],errors=[];
try{
 const context=await browser.newContext(),page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
 for(const viewport of [{width:1440,height:900},{width:390,height:844}]){
  await page.setViewportSize(viewport);
  for(const file of ['story.html','design.html','architecture.html','notes.html']){
   const requests=[];const track=r=>requests.push(r.url());page.on('request',track);
   const response=await page.goto(url(file));assert.equal(response.status(),200);await page.waitForLoadState('networkidle');page.off('request',track);
   assert.equal(await page.locator('h1').count(),1);assert.ok((await page.locator('article').innerText()).length>250);
   assert.equal(await page.locator('#siteNav a[aria-current="page"]').count(),1);
   assert.equal(await page.evaluate(()=>!!window.__garden),false);
   assert.deepEqual(requests.filter(r=>/\.(glb|ktx2|wasm)(?:\?|$)|\/assets\/(?:textures|previews|manifest\.json|delivery\.json|inventory\.json)/.test(r)),[]);
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
   if(viewport.width<800){await page.click('#siteMenu');assert.equal(await page.locator('#siteNav a:visible').count(),5);await page.keyboard.press('Escape');assert.equal(await page.locator('#siteMenu').getAttribute('aria-expanded'),'false');}
   await page.screenshot({path:`${out}/${file}-${viewport.width}.png`,fullPage:true});
   results.push(`${file} ${viewport.width}: direct HTML, no scene assets, responsive navigation`);
  }
 }
 await page.goto(url('notes.html?region=plotC&scenario=nutrient'));await page.waitForSelector('#notesRegion:enabled');assert.equal(await page.locator('#notesRegion').inputValue(),'plotC');
 await page.locator('#notesRegion').selectOption('pond');await page.locator('#notesScenario').selectOption('oxygen');assert.match(await page.locator('#notesFarmLink').getAttribute('href'),/view=pond&scenario=oxygen/);
 for(const width of [1440,390]){const noJS=await browser.newPage({javaScriptEnabled:false,viewport:{width,height:900}});await noJS.goto(url('story.html'));assert.equal(await noJS.locator('h1').innerText(),'One system, four lines of prior work.');assert.equal(await noJS.locator('#siteNav a:visible').count(),5,'document navigation must also work without JavaScript');await noJS.close();}results.push('notes state and no-JavaScript readable documents at both widths');
 await page.goto(url('story.html'));await page.keyboard.press('Tab');assert.equal(await page.locator('.skip-link').evaluate(e=>document.activeElement===e),true);await page.keyboard.press('Enter');assert.equal(await page.evaluate(()=>document.activeElement.id),'main');results.push('keyboard skip link reaches main content');
 if(!process.argv.includes('--documents-only')){
  await page.setViewportSize({width:1440,height:900});
  // The document navigation must work even when the scene is still loading.
  await page.route('**/assets/manifest.json',()=>{});await page.goto(base,{waitUntil:'domcontentloaded'});await page.locator('#siteNav [data-page-link="story"]').click();await page.waitForURL(/story\.html/);await page.unroute('**/assets/manifest.json');results.push('document links accessible before scene finishes');
  await page.route('**/assets/textures/*.ktx2',r=>r.fulfill({status:503,body:'paused for navigation checks'}));
  await page.goto(base);await page.waitForFunction(()=>window.__garden?.ready,null,{timeout:120000});await page.click('#enterBtn');
  await page.click('[data-view="field"]');await page.click('#dataBtn');await page.click('[data-s="drought"]');assert.equal(await page.locator('#dataBtn').getAttribute('aria-expanded'),'true');await page.click('#dataBtn');
  await page.click('#siteNav [data-page-link="story"]');await page.waitForURL(/story\.html/);assert.match(await page.locator('#siteNav [data-page-link="farm"]').getAttribute('href'),/view=field&scenario=drought/);
  await page.goBack();await page.waitForFunction(()=>window.__garden?.ready,null,{timeout:120000});if(await page.locator('#enterBtn').isVisible())await page.click('#enterBtn');
  assert.equal((await page.evaluate(()=>window.__garden.getState())).view,'field');assert.equal((await page.evaluate(()=>window.__garden.getState())).scenario,'drought');results.push('browser Back retains viewpoint and scenario');
  await page.click('#dataBtn');await page.click('#drawerNotes');await page.waitForURL(/notes\.html/);assert.equal(await page.locator('#notesScenario').inputValue(),'drought');
  await page.locator('#notesRegion').selectOption('pond');await page.locator('#notesScenario').selectOption('oxygen');await page.click('#notesFarmLink');await page.waitForFunction(()=>window.__garden?.ready,null,{timeout:120000});await page.click('#enterBtn');
  assert.equal((await page.evaluate(()=>window.__garden.getState())).view,'pond');assert.equal((await page.evaluate(()=>window.__garden.getState())).scenario,'oxygen');results.push('contextual field notes return to correct farm view');
  await page.setViewportSize({width:390,height:844});await page.waitForTimeout(250);
  const layout=await page.evaluate(()=>({time:document.querySelector('.timebar').getBoundingClientRect().bottom,toolbar:document.querySelector('.hd-toolbar').getBoundingClientRect().top}));assert.ok(layout.time+7<=layout.toolbar,'crop controls must stay above the expanded mobile toolbar');
  await page.screenshot({path:`${out}/farm-mobile.png`});await page.setViewportSize({width:1440,height:900});await page.screenshot({path:`${out}/farm-desktop.png`});
 }
 assert.deepEqual(errors,[]);writeFileSync(`${out}/results.json`,JSON.stringify({base,results,errors},null,2));console.log(JSON.stringify({results,errors}));
}finally{await browser.close()}

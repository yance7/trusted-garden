import { chromium } from 'playwright-core';
import { mkdirSync, writeFileSync } from 'node:fs';
const target=process.argv[2]||'http://127.0.0.1:4174/';mkdirSync('evidence',{recursive:true});
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',args:['--use-angle=d3d11','--ignore-gpu-blocklist','--disable-gpu-sandbox','--no-sandbox']});
try{
 const context=await browser.newContext({viewport:{width:1920,height:1080},...(process.env.CAPTURE_ONLY?{}:{recordVideo:{dir:'evidence/video',size:{width:1280,height:720}}})});
 const page=await context.newPage();await page.goto(target);await page.waitForFunction(()=>window.__garden?.ready,null,{timeout:120000});await page.click('#enterBtn');
 await page.click('#v7Photo');
 for(const view of ['overview','compute','control','pond','aqua','field']){await page.evaluate(v=>window.__garden.focus(v),view);await page.waitForTimeout(2200);await page.screenshot({path:`evidence/clean-${view}.png`});}
 await page.evaluate(()=>document.querySelector('[data-w="wind"]').click());await page.waitForTimeout(1000);await page.screenshot({path:'evidence/wind-a.png'});await page.waitForTimeout(500);await page.screenshot({path:'evidence/wind-b.png'});await page.evaluate(()=>document.querySelector('[data-w="clear"]').click());
 await page.evaluate(()=>window.__garden.focus('overview'));await page.waitForTimeout(1800);
 for(const [name,time]of[['morning',.2],['noon',.5],['golden',.92]]){await page.evaluate(t=>window.__garden.setTime(t),time);await page.waitForTimeout(1000);await page.screenshot({path:`evidence/light-${name}.png`});}
 await page.evaluate(()=>window.__garden.setTime(.44));await page.click('#v7ExitPhoto');
 const measurements=[];
 for(const quality of (process.env.CAPTURE_ONLY?[]:['performance','high'])){
  await page.click(`#quality-${quality}`);await page.waitForTimeout(1800);
  const timings=await page.evaluate(()=>new Promise(resolve=>{const data=[];let previous=0,start=0;function tick(now){if(!start)start=now;if(previous)data.push(now-previous);previous=now;if(now-start<30000)requestAnimationFrame(tick);else resolve(data)}requestAnimationFrame(tick)}));
  const sorted=timings.slice().sort((a,b)=>a-b),stats=await page.evaluate(()=>window.__garden.stats());measurements.push({quality,durationSeconds:30,frames:timings.length,meanMs:timings.reduce((a,b)=>a+b,0)/timings.length,p95Ms:sorted[Math.floor(sorted.length*.95)],stats});
 }
 await page.click('#v8Walk');await page.keyboard.down('w');await page.waitForTimeout(2500);await page.keyboard.up('w');await page.screenshot({path:'evidence/character-third.png'});await page.keyboard.press('v');await page.waitForTimeout(1000);await page.screenshot({path:'evidence/character-first.png'});await page.keyboard.press('g');
 await page.click('#v7Cinema');await page.waitForTimeout(6000);await page.click('#v7Cinema');
 if(measurements.length)writeFileSync('evidence/performance.json',JSON.stringify(measurements,null,2));console.log(JSON.stringify(measurements));await context.close();
 const narrow=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:1,reducedMotion:'reduce'});const p=await narrow.newPage();await p.goto(target);await p.waitForFunction(()=>window.__garden?.ready,null,{timeout:120000});await p.click('#enterBtn');await p.waitForTimeout(700);await p.screenshot({path:'evidence/narrow.png'});await narrow.close();
 const retina=await browser.newContext({viewport:{width:1440,height:900},deviceScaleFactor:2});const r=await retina.newPage();await r.goto(target);await r.waitForFunction(()=>window.__garden?.ready,null,{timeout:120000});await r.click('#enterBtn');await r.waitForTimeout(800);await r.screenshot({path:'evidence/dpr2.png'});await retina.close();
}finally{await browser.close()}

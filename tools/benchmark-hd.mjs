import{chromium}from'playwright-core';
import{writeFileSync}from'node:fs';
const target=process.argv[2]||'http://127.0.0.1:4175/';
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',args:['--use-angle=d3d11','--ignore-gpu-blocklist','--disable-gpu-sandbox','--no-sandbox']});
try{
 const context=await browser.newContext({viewport:{width:1920,height:1080}});const page=await context.newPage();await page.goto(target);await page.waitForFunction(()=>window.__garden?.ready,null,{timeout:120000});await page.click('#enterBtn');const rows=[];
 for(const quality of ['performance','high']){
  await page.click(`#quality-${quality}`);await page.waitForTimeout(2000);
  const samples=await page.evaluate(()=>new Promise(resolve=>{const views=['overview','entrance','compute','field','pond','aqua','control','north'];let previous=0,start=0,last=-1;const values=[];function frame(now){if(!start)start=now;const elapsed=now-start,index=Math.min(7,Math.floor(elapsed/3750));if(index!==last){window.__garden.focus(views[index]);last=index;}if(previous)values.push(now-previous);previous=now;if(elapsed<30000)requestAnimationFrame(frame);else resolve(values);}requestAnimationFrame(frame);}));
  const ordered=samples.slice().sort((a,b)=>a-b);rows.push({quality,path:'8 original viewpoints, 3.75 seconds each, no video capture',durationSeconds:30,meanMs:samples.reduce((a,b)=>a+b,0)/samples.length,p95Ms:ordered[Math.floor(ordered.length*.95)],frames:samples.length,stats:await page.evaluate(()=>window.__garden.stats())});
 }
 writeFileSync('evidence/benchmark-path.json',JSON.stringify(rows,null,2));console.log(JSON.stringify(rows));await context.close();
}finally{await browser.close()}

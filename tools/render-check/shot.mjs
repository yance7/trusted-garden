import { chromium } from 'playwright-core';
import { pathToFileURL } from 'url';

const file = process.argv[2];
const out = process.argv[3] || 'shot.png';
const waitMs = parseInt(process.argv[4] || '6000', 10);
// optional actions JSON: [{type:'click',sel}, {type:'key',key}, {type:'eval',js}, {type:'wait',ms}, {type:'move',x,y}]
const actions = process.argv[5] ? JSON.parse(process.argv[5]) : [];

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';

const browser = await chromium.launch({
  executablePath: CHROME,
  args: [
    '--use-angle=swiftshader',
    '--enable-unsafe-swiftshader',
    '--ignore-gpu-blocklist',
    '--enable-webgl',
    '--use-gl=angle',
    '--disable-gpu-sandbox',
    '--no-sandbox',
    '--hide-scrollbars',
  ],
});
const page = await browser.newPage({
  viewport: { width: 1600, height: 1000 },
  deviceScaleFactor: 1,
});
const logs = [];
page.on('console', (m) => logs.push('[' + m.type() + '] ' + m.text()));
page.on('pageerror', (e) => logs.push('[pageerror] ' + e.message));

await page.goto(pathToFileURL(file).href, { waitUntil: 'load', timeout: 60000 });
await page.waitForTimeout(waitMs);

for (const a of actions) {
  try {
    if (a.type === 'click') await page.click(a.sel, { timeout: 5000 });
    else if (a.type === 'key') await page.keyboard.press(a.key);
    else if (a.type === 'eval') await page.evaluate(a.js);
    else if (a.type === 'move') await page.mouse.move(a.x, a.y);
    else if (a.type === 'drag') {
      await page.mouse.move(a.x1, a.y1);
      await page.mouse.down();
      await page.mouse.move(a.x2, a.y2, { steps: 12 });
      await page.mouse.up();
    } else if (a.type === 'wait') await page.waitForTimeout(a.ms);
    else if (a.type === 'shot') await page.screenshot({ path: a.path });
  } catch (e) {
    logs.push('[action-error] ' + a.type + ' ' + (a.sel || '') + ' :: ' + e.message);
  }
}
await page.waitForTimeout(400);
if (!actions.some((a) => a.type === 'shot')) await page.screenshot({ path: out });

// report webgl status + a few diagnostics
const diag = await page.evaluate(() => {
  const c = document.getElementById('gl');
  const g = c && (c.getContext('webgl2') || c.getContext('webgl'));
  return {
    canvas: c ? c.width + 'x' + c.height : 'none',
    gl: !!g,
    renderer: g ? (g.getExtension('WEBGL_debug_renderer_info') ? g.getParameter(g.getExtension('WEBGL_debug_renderer_info').UNMASKED_RENDERER_WEBGL) : 'n/a') : 'n/a',
    loading: document.getElementById('loading') ? getComputedStyle(document.getElementById('loading')).display + '/' + getComputedStyle(document.getElementById('loading')).opacity : 'none',
    bodyText: document.body.innerText.slice(0, 200),
  };
});
console.log(JSON.stringify(diag, null, 2));
console.log('--- console logs ---');
console.log(logs.slice(0, 40).join('\n'));

await browser.close();

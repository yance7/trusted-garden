import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import vm from 'node:vm';
const html = readFileSync('v0.8/trusted-garden-v0.8-showcase.html', 'utf8');
function literal(name, scenario = 'normal') {
  const start = html.indexOf(`const ${name}=`) + `const ${name}=`.length;
  if (start < name.length + 7) throw new Error(`Missing legacy ${name}`);
  let quote = '', escape = false, depth = 0;
  for (let i = start; i < html.length; i++) {
    const c = html[i];
    if (quote) { if (escape) escape = false; else if (c === '\\') escape = true; else if (c === quote) quote = ''; }
    else if (c === '"' || c === "'" || c === '`') quote = c;
    else if ('[{('.includes(c)) depth++;
    else if (']})'.includes(c)) depth--;
    else if (c === ';' && depth === 0) return vm.runInNewContext(`(${html.slice(start, i)})`, { scenario, day: 46 });
  }
  throw new Error(`Unterminated ${name}`);
}
mkdirSync('src', { recursive: true });
writeFileSync('src/content.json', JSON.stringify({ views: literal('views'), data: literal('DATA'), scenarios: Object.fromEntries(['normal','drought','oxygen','nutrient'].map(s => [s,literal('DATA',s)])), weather: literal('WEATHER'), labels: literal('labelData') }, null, 2));
// Preserve authored content and the existing interface; replace rendering scripts only.
let page = html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '');
page = page.replace(/<title>.*?<\/title>/, '<title>Trusted Garden — V0.8 HD · Intelligent Reference Farm</title>');
page = page.replace('</head>', '<link rel="stylesheet" href="/src/style.css">\n</head>');
page = page.replace('</body>', '<script type="module" src="/src/main.ts"></script>\n</body>');
writeFileSync('index.html', page);
console.log('Original views, research copy and UI extracted without renderer payload');

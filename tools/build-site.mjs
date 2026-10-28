import { copyFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = new URL('../', import.meta.url);
const output = new URL('dist/', root);
mkdirSync(output, { recursive: true });
copyFileSync(new URL('v0.8/trusted-garden-v0.8-showcase.html', root), new URL('index.html', output));
copyFileSync(new URL('v0.8/trusted-garden-v0.8-model.glb', root), new URL('trusted-garden-v0.8-model.glb', output));
writeFileSync(new URL('.nojekyll', output), '');
console.log(`GitHub Pages site: ${fileURLToPath(output)}`);

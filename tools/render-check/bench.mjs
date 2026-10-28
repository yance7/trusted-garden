import fs from 'fs';
const t0 = Date.now();
const s = fs.readFileSync(new URL('../../v0.8/trusted-garden-v0.8-showcase.html', import.meta.url), 'utf8');
const t1 = Date.now();
const marker = 'const PAYLOAD=';
const i = s.indexOf(marker) + marker.length;
const j = s.indexOf(';', i);
const data = JSON.parse(s.slice(i, j));
const t2 = Date.now();

function f32(b64) {
  const u = Buffer.from(b64, 'base64');
  return new Float32Array(u.buffer.slice(u.byteOffset, u.byteOffset + u.byteLength));
}
let nv = 0;
const lo = [1e9, 1e9, 1e9], hi = [-1e9, -1e9, -1e9];
for (const d of data) {
  const p = f32(d.positions);
  for (let k = 0; k < p.length; k += 9) {   // 每 3 个顶点采 1 次
    for (let a = 0; a < 3; a++) { const v = p[k + a]; if (v < lo[a]) lo[a] = v; if (v > hi[a]) hi[a] = v; }
  }
  nv += p.length / 3;
}
const t3 = Date.now();
console.log('读文件      %d ms', t1 - t0);
console.log('JSON.parse  %d ms', t2 - t1);
console.log('解码+包围盒 %d ms  (顶点 %d, 采样 1/3)', t3 - t2, nv);
console.log('包围盒      %s -> %s', lo.map(x => x.toFixed(2)).join(', '), hi.map(x => x.toFixed(2)).join(', '));

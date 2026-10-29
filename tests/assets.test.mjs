import test from 'node:test';
import assert from 'node:assert/strict';
import { readSource, readAccessor } from '../tools/assets/source.mjs';
import { existsSync, readFileSync } from 'node:fs';

test('source inventory covers every named object in farm coordinates', () => {
  const source = readSource('v0.8/trusted-garden-v0.8-model.glb');
  assert.equal(source.objects.length, 2624);
  assert.equal(new Set(source.objects.map(o => o.id)).size, 2624);
  const lo = [Infinity, Infinity, Infinity], hi = [-Infinity, -Infinity, -Infinity];
  for (const o of source.objects) {
    assert.ok(o.region && o.layer && o.category && o.material);
    assert.ok(o.indices.length > 0);
    for (let i = 0; i < o.positions.length; i++) {
      assert.ok(Number.isFinite(o.positions[i]));
      lo[i % 3] = Math.min(lo[i % 3], o.positions[i]);
      hi[i % 3] = Math.max(hi[i % 3], o.positions[i]);
    }
  }
  assert.ok(lo[1] > -0.6 && hi[1] < 6.1, 'Z-up source converted to Y-up');
  assert.ok(lo[0] < -21 && hi[2] > 16);
  const plot = source.objects.find(o => o.name === 'Plot_A_Soil');
  assert.ok(plot.bounds.center[2] > 3, 'Plot A must stay on the positive-Z side as in the displayed V0.8');
  assert.ok(source.objects.filter(o=>/corn/i.test(o.name)).every(o=>/^plot[ABC]$/.test(o.region)), 'Hero corn must participate in its plot growth and scenario');
});

test('generated HD model covers all originals with normals, UVs, real material maps and richer equipment', () => {
  assert.ok(existsSync('public/assets/manifest.json'), 'HD manifest must be generated');
  const manifest = JSON.parse(readFileSync('public/assets/manifest.json'));
  const inventory = JSON.parse(readFileSync('public/assets/inventory.json'));
  assert.equal(inventory.sourceObjects.length, 2624);
  assert.equal(new Set(inventory.sourceObjects.map(o => o.id)).size, 2624);
  assert.ok(inventory.sourceObjects.every(o => o.method && o.family && o.outputTriangles > 0));
  assert.ok(inventory.sourceObjects.filter(o => o.category === 'equipment').some(o => o.outputTriangles > o.inputTriangles));
  assert.ok(manifest.stats.triangles > 355244);
  const file=readFileSync('public/assets/'+manifest.model);
  const doc=JSON.parse(file.toString('utf8',20,20+file.readUInt32LE(12)));
  assert.ok(doc.images.every(image=>image.uri && existsSync('public/assets/'+image.uri)), 'High-resolution textures must stay beside the model without oversized embedded blobs');
  for(const m of doc.meshes)for(const p of m.primitives){
    assert.ok(p.attributes.NORMAL !== undefined && p.attributes.TEXCOORD_0 !== undefined);
    const pos=doc.accessors[p.attributes.POSITION], nor=doc.accessors[p.attributes.NORMAL];
    assert.equal(pos.count,nor.count);
  }
  const textureDoc=JSON.parse(readFileSync('public/assets/textures/manifest.json'));
  assert.equal(Object.keys(textureDoc.families).length,6);
  for(const family of Object.values(textureDoc.families))for(const map of Object.values(family))if(typeof map==='object')assert.ok(existsSync('public/assets/'+map.url));
  for(const family of Object.values(textureDoc.families))assert.equal(family.color.width,4096);
});

test('accessor reader honors interleaved stride and view/accessor offsets', () => {
  const b = Buffer.alloc(48);
  for (const [i, v] of [1, 2, 9, 3, 4, 9].entries()) b.writeFloatLE(v, 12 + i * 4);
  const doc = { bufferViews: [{ byteOffset: 8, byteLength: 32, byteStride: 12 }], accessors: [{ bufferView: 0, byteOffset: 4, componentType: 5126, type: 'VEC2', count: 2 }] };
  assert.deepEqual([...readAccessor(doc, b, 0)], [1, 2, 3, 4]);
});

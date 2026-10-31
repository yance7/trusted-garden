import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync,openSync,readSync,closeSync} from 'node:fs';

const textureDoc=JSON.parse(readFileSync('public/assets/textures/manifest.json'));
const expectedMaps=Object.values(textureDoc.families).flatMap(f=>Object.values(f).filter(v=>typeof v==='object')).length+1;
test('fast entry maps have matching native-resolution GPU textures with mipmaps',()=>{
 const manifest=JSON.parse(readFileSync('public/assets/delivery.json'));
 assert.equal(manifest.textures.length,expectedMaps);
 for(const map of manifest.textures){
  assert.ok(existsSync(`public/assets/${map.preview}`));
  assert.ok(existsSync(`public/assets/${map.compressed}`),map.compressed);
  const fd=openSync(`public/assets/${map.compressed}`,'r'),header=Buffer.alloc(48);try{readSync(fd,header,0,48,0)}finally{closeSync(fd)}
  assert.deepEqual([...header.subarray(0,12)],[171,75,84,88,32,50,48,187,13,10,26,10]);
  assert.equal(header.readUInt32LE(20),map.width);assert.equal(header.readUInt32LE(24),map.height);
  assert.ok(header.readUInt32LE(40)>1,'offline mipmaps must avoid runtime full-size generation');
  assert.equal(header.readUInt32LE(44),2,'UASTC payload must use lossless Zstandard supercompression');
  assert.ok(map.bytes>0);
 }
});

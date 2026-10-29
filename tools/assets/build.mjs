import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import * as T from 'three';
import { mergeGeometries, mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import { readSource, classify } from './source.mjs';
import { upgradeGeometry, familyFor, extraGeometry, grassGeometry, finish } from './geometry.mjs';

const out = 'public/assets'; mkdirSync(out, { recursive: true });
const source = readSource('v0.8/trusted-garden-v0.8-model.glb');
const batches = new Map(), inventory = [], collisions = [];
function add(geometry, opt) {
  const key = [opt.materialKey, opt.region, opt.layer, opt.kind, opt.category === 'plant' ? 'plant' : 'solid'].join('|');
  if (!batches.has(key)) batches.set(key, { geometries: [], ...opt });
  batches.get(key).geometries.push(finish(geometry));
}
for (const [index, object] of source.objects.entries()) {
  const result = upgradeGeometry(object, index + 901), family = familyFor(object);
  const mat = object.material.pbrMetallicRoughness, color = ['wood','bark','soil'].includes(family) ? [.92,.92,.92,1] : mat.baseColorFactor || [.6, .6, .6, 1];
  const kind = /glass/.test(object.material.name.toLowerCase()) ? 'glass' : /water surface|pond water|water/.test(object.material.name.toLowerCase()) && !/fish/.test(object.name.toLowerCase()) ? 'water' : 'solid';
  add(result.geometry, { materialKey: `source-${object.materialIndex}`, color, family, kind, region: object.region, layer: object.layer, category: object.category, roughness: mat.roughnessFactor, metallic: mat.metallicFactor, doubleSided: object.material.doubleSided || ['plant', 'tree', 'shrub', 'ground'].includes(object.category) });
  inventory.push({ id: object.id, name: object.name, region: object.region, layer: object.layer, category: object.category, family, inputTriangles: object.indices.length / 3, outputTriangles: result.geometry.getAttribute('position').count / 3, method: result.method, bounds: object.bounds });
  const b = object.bounds;
  if (b.lo[1] < .70 && b.hi[1] > .85 && !['ground', 'plant', 'shrub', 'water'].includes(object.category) && !/crown|foliage|roof|canopy|overhead/i.test(object.name)) {
    // Large merged plant/field structures cannot act as one farm-sized collision box.
    if (b.size[0] < 12 && b.size[2] < 12) collisions.push({ min: b.lo, max: b.hi, name: object.name });
  }
}
const extras = extraGeometry(source.objects);
for (const extra of extras) add(extra.geometry, { ...extra, layer:classify(extra.name).layer, materialKey: `extra-${extra.family}-${extra.color.join('-')}-${extra.emissive || false}`, kind: 'solid', metallic: extra.metallic ?? (extra.family === 'metal' ? .65 : 0), roughness: extra.roughness ?? .5 });
const grass = grassGeometry(source.objects);
if (grass) add(grass, { materialKey: 'grass', family: 'leaf', color: [.32, .46, .17, 1], kind: 'solid', region: 'site', layer: 'base', category: 'plant', doubleSided: true, roughness: .85, metallic: 0 });

const doc = { asset: { version: '2.0', generator: 'Trusted Garden V0.8 HD reproducible asset builder' }, scene: 0, scenes: [{ nodes: [] }], nodes: [], meshes: [], materials: [], accessors: [], bufferViews: [], buffers: [{ byteLength: 0 }] };
const buffers = [], materials = [], materialMap = new Map(); let byteLength = 0, totalTriangles = 0;
function accessor(array, type, target) {
  const buf = Buffer.from(array.buffer, array.byteOffset, array.byteLength), padded = Buffer.alloc(Math.ceil(buf.length / 4) * 4); buf.copy(padded);
  const view = doc.bufferViews.length; doc.bufferViews.push({ buffer: 0, byteOffset: byteLength, byteLength: buf.length, target }); buffers.push(padded); byteLength += padded.length;
  const dim = type === 'VEC3' ? 3 : type === 'VEC2' ? 2 : 1;
  const a = { bufferView: view, componentType: array instanceof Float32Array ? 5126 : 5125, count: array.length / dim, type };
  if (type === 'VEC3') {
    a.min = [Infinity, Infinity, Infinity]; a.max = [-Infinity, -Infinity, -Infinity];
    for (let i = 0; i < array.length; i++) { a.min[i % 3] = Math.min(a.min[i % 3], array[i]); a.max[i % 3] = Math.max(a.max[i % 3], array[i]); }
  }
  doc.accessors.push(a); return doc.accessors.length - 1;
}
for (const [key, batch] of batches) {
  const merged = mergeVertices(mergeGeometries(batch.geometries), .00001);
  const p = merged.getAttribute('position').array, normal = merged.getAttribute('normal').array, uv = merged.getAttribute('uv').array;
  // Guard against the source's zero normal defects reaching the renderer again.
  for (let i = 0; i < normal.length; i += 3) if (Math.hypot(normal[i], normal[i + 1], normal[i + 2]) < .1) { normal[i] = 0; normal[i + 1] = 1; normal[i + 2] = 0; }
  const materialKey = `${batch.materialKey}-${batch.kind}`;
  if (!materialMap.has(materialKey)) {
    const index = doc.materials.length, base = batch.color.length === 4 ? batch.color : [...batch.color, 1];
    const descriptor = { name: materialKey, family: batch.family, kind: batch.kind, roughness: batch.roughness ?? .7, metallic: batch.metallic ?? 0, color: base, emissive: !!batch.emissive, doubleSided: !!batch.doubleSided };
    doc.materials.push({ name: materialKey, pbrMetallicRoughness: { baseColorFactor: base.map((v, i) => i < 3 ? (v < .04045 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4)) : v), roughnessFactor: descriptor.roughness, metallicFactor: descriptor.metallic }, doubleSided: descriptor.doubleSided, extras: descriptor, ...(batch.kind !== 'solid' ? { alphaMode: 'BLEND' } : {}) });
    materials.push(descriptor); materialMap.set(materialKey, index);
  }
  const pos = accessor(new Float32Array(p), 'VEC3', 34962), nor = accessor(new Float32Array(normal), 'VEC3', 34962), tex = accessor(new Float32Array(uv), 'VEC2', 34962);
  const indices = new Uint32Array(merged.index.array), idx = accessor(indices, 'SCALAR', 34963); totalTriangles += indices.length / 3;
  const extra = { region: batch.region, layer: batch.layer, category: batch.category || 'detail', kind: batch.kind, family: batch.family, grass: batch.materialKey === 'grass' };
  doc.meshes.push({ name: key, primitives: [{ attributes: { POSITION: pos, NORMAL: nor, TEXCOORD_0: tex }, indices: idx, material: materialMap.get(materialKey) }], extras: extra });
  doc.nodes.push({ name: key, mesh: doc.meshes.length - 1, extras: extra }); doc.scenes[0].nodes.push(doc.nodes.length - 1);
}
doc.buffers[0].byteLength = byteLength;
const json = Buffer.from(JSON.stringify(doc)); const paddedJSON = Buffer.alloc(Math.ceil(json.length / 4) * 4, 32); json.copy(paddedJSON);
const header = Buffer.alloc(20); header.write('glTF'); header.writeUInt32LE(2, 4); header.writeUInt32LE(28 + paddedJSON.length + byteLength, 8); header.writeUInt32LE(paddedJSON.length, 12); header.writeUInt32LE(0x4e4f534a, 16);
const binHeader = Buffer.alloc(8); binHeader.writeUInt32LE(byteLength); binHeader.writeUInt32LE(0x004e4942, 4);
const raw = Buffer.concat([header, paddedJSON, binHeader, ...buffers]);
// Meshoptimizer compresses attributes and indices; images retain their authored WebP quality.
const { NodeIO } = await import('@gltf-transform/core'); const { ALL_EXTENSIONS } = await import('@gltf-transform/extensions'); const { meshopt } = await import('@gltf-transform/functions'); const { MeshoptEncoder, MeshoptDecoder } = await import('meshoptimizer');
await MeshoptEncoder.ready; await MeshoptDecoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.encoder': MeshoptEncoder, 'meshopt.decoder': MeshoptDecoder });
const asset = await io.readBinary(raw); await asset.transform(meshopt({ encoder: MeshoptEncoder, level: 'medium' }));
const compressed = Buffer.from(await io.writeBinary(asset));
const compressedJSONLength=compressed.readUInt32LE(12), compressedDoc=JSON.parse(compressed.toString('utf8',20,20+compressedJSONLength));
const compressedBin=compressed.subarray(28+compressedJSONLength);
// Keep original 4K maps local and external: no file-size ceiling forces quality loss.
const textures=JSON.parse(readFileSync(`${out}/textures/manifest.json`));
compressedDoc.images=[]; compressedDoc.textures=[]; compressedDoc.samplers=[{magFilter:9729,minFilter:9987,wrapS:10497,wrapT:10497}];
compressedDoc.extensionsUsed=[...(compressedDoc.extensionsUsed||[]),'EXT_texture_webp'];
compressedDoc.extensionsRequired=[...(compressedDoc.extensionsRequired||[]),'EXT_texture_webp'];
const textureIds=new Map();
for(const[family,maps]of Object.entries(textures.families))for(const[kind,map]of Object.entries(maps)){
 if(typeof map!=='object'||kind==='color4k')continue;
 compressedDoc.images.push({uri:map.url,mimeType:'image/webp'});
 compressedDoc.textures.push({sampler:0,extensions:{EXT_texture_webp:{source:compressedDoc.images.length-1}}});
 textureIds.set(`${family}-${kind}`,compressedDoc.textures.length-1);
}
for(const material of compressedDoc.materials){
 const family=material.extras.family;if(material.extras.kind!=='solid')continue;
 material.pbrMetallicRoughness.baseColorTexture={index:textureIds.get(`${family}-color`)};
 material.pbrMetallicRoughness.metallicRoughnessTexture={index:textureIds.get(`${family}-orm`)};
 material.normalTexture={index:textureIds.get(`${family}-normal`),scale:family==='metal'?.25:.6};
 material.occlusionTexture={index:textureIds.get(`${family}-orm`),strength:.45};
}
const finalJSON=Buffer.from(JSON.stringify(compressedDoc)), finalPadded=Buffer.alloc(Math.ceil(finalJSON.length/4)*4,32);finalJSON.copy(finalPadded);
const finalHeader=Buffer.alloc(20);finalHeader.write('glTF');finalHeader.writeUInt32LE(2,4);finalHeader.writeUInt32LE(28+finalPadded.length+compressedBin.length,8);finalHeader.writeUInt32LE(finalPadded.length,12);finalHeader.writeUInt32LE(0x4e4f534a,16);
const finalBinHeader=Buffer.alloc(8);finalBinHeader.writeUInt32LE(compressedBin.length);finalBinHeader.writeUInt32LE(0x004e4942,4);
const encoded=Buffer.concat([finalHeader,finalPadded,finalBinHeader,compressedBin]);
writeFileSync(`${out}/trusted-garden-v0.8-hd.glb`,encoded);
const manifest = { version: '0.8-HD', model: 'trusted-garden-v0.8-hd.glb', materials, textures: 'textures/manifest.json', inventory: 'inventory.json', stats: { triangles: totalTriangles, drawBatches: batches.size, modelBytes: encoded.length, originalObjects: inventory.length, extraComponents: extras.length, generatedGrassTriangles: grass ? grass.getAttribute('position').count / 3 : 0 } };
writeFileSync(`${out}/manifest.json`, JSON.stringify(manifest, null, 2));
writeFileSync(`${out}/inventory.json`, JSON.stringify({ sourceObjects: inventory, additions: extras.map(e => ({ name: e.name, region: e.region })), collisions, authoring: { textures: '4K Poly Haven CC0 photographic maps plus original authored leaf/metal; see textures/sources.json', geometry: 'Original farm geometry repaired and enhanced with procedural detail' } }));
console.log(JSON.stringify(manifest.stats));

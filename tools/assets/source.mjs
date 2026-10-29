import { readFileSync } from 'node:fs';

export function readAccessor(doc, binary, index) {
  const a = doc.accessors[index], v = doc.bufferViews[a.bufferView];
  const info = { 5120: [Int8Array, 1, 'readInt8'], 5121: [Uint8Array, 1, 'readUInt8'], 5122: [Int16Array, 2, 'readInt16LE'], 5123: [Uint16Array, 2, 'readUInt16LE'], 5125: [Uint32Array, 4, 'readUInt32LE'], 5126: [Float32Array, 4, 'readFloatLE'] }[a.componentType];
  if (!info) throw new Error(`Unsupported component ${a.componentType}`);
  const [Type, bytes, read] = info;
  const dim = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4, MAT4: 16 }[a.type];
  const output = new Type(a.count * dim), stride = v.byteStride || dim * bytes;
  for (let i = 0; i < a.count; i++) for (let k = 0; k < dim; k++) output[i * dim + k] = binary[read]((v.byteOffset || 0) + (a.byteOffset || 0) + i * stride + k * bytes);
  return output;
}

export function classify(name, materialName = '') {
  const n = name.toLowerCase(), m = materialName.toLowerCase();
  const region = /plot[_ ]a|sensor_a|irrigation_a|actuator_a/.test(n) ? 'plotA' : /plot[_ ]b|sensor_b|irrigation_b|actuator_b/.test(n) ? 'plotB' : /plot[_ ]c|sensor_c|irrigation_c|actuator_c/.test(n) ? 'plotC' : /pond|fish|rov/.test(n) ? 'pond' : /aqua|dwc|greenhouse/.test(n) ? 'aqua' : /control|pavilion|server|rack|operator/.test(n) ? 'control' : /robot|sensor|gateway|phenotyp|rtk|uav|drone/.test(n) ? 'compute' : 'site';
  const category = /tree/.test(n) ? 'tree' : /shrub/.test(n) ? 'shrub' : /corn|reed|leaf|lettuce|plant/.test(n) ? 'plant' : /meadow|grass/.test(n + m) ? 'ground' : /water|fish|bubble/.test(n + m) ? 'water' : /sensor|actuator|robot|uav|drone|gateway|camera|rtk|solar|plc|server/.test(n) ? 'equipment' : /pipe|valve|irrigation|tank|pond/.test(n) ? 'infrastructure' : 'architecture';
  const layer = /robot|uav|drone|rov/.test(n) ? 'robotics' : /sensor|camera|rgb|probe|lidar|rtk/.test(n) ? 'sensors' : /actuator|valve|motor/.test(n) ? 'actuators' : /irrigation|fertig/.test(n) ? 'irrigation' : /pump|waterloop|aqua_pipe/.test(n) ? 'waterloop' : category === 'plant' ? 'crop' : category === 'water' ? 'water' : /cable|network|data/.test(n) ? 'network' : category === 'equipment' ? 'compute' : 'base';
  return { region, category, layer };
}

export function readSource(path) {
  const file = readFileSync(path);
  if (file.toString('ascii', 0, 4) !== 'glTF' || file.readUInt32LE(4) !== 2) throw new Error('Expected glTF 2 GLB');
  const jsonLength = file.readUInt32LE(12), document = JSON.parse(file.toString('utf8', 20, 20 + jsonLength));
  const start = 20 + jsonLength, binary = file.subarray(start + 8, start + 8 + file.readUInt32LE(start));
  const objects = document.meshes.map((mesh, id) => {
    const prim = mesh.primitives[0], positions = readAccessor(document, binary, prim.attributes.POSITION);
    // Match the actual HTML farm, including its handedness, not a conventional Z-up rotation.
    for (let i = 0; i < positions.length; i += 3) { const y = positions[i + 1]; positions[i + 1] = positions[i + 2]; positions[i + 2] = y; }
    const indices = readAccessor(document, binary, prim.indices), material = document.materials[prim.material];
    for (let i = 0; i < indices.length; i += 3) { const j = indices[i + 1]; indices[i + 1] = indices[i + 2]; indices[i + 2] = j; }
    const lo = [Infinity, Infinity, Infinity], hi = [-Infinity, -Infinity, -Infinity];
    for (let i = 0; i < positions.length; i++) { const k = i % 3; lo[k] = Math.min(lo[k], positions[i]); hi[k] = Math.max(hi[k], positions[i]); }
    return { id: `farm-${id}`, name: mesh.name, positions, indices, material, materialIndex: prim.material, shape: mesh.extras?.shape || 'unknown', extras: mesh.extras || {}, bounds: { lo, hi, center: lo.map((v, i) => (v + hi[i]) / 2), size: lo.map((v, i) => hi[i] - v) }, ...classify(mesh.name, material.name) };
  });
  return { document, binary, objects };
}

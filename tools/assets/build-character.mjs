import { createTechnician } from './character.mjs';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import { writeFileSync } from 'node:fs';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { meshopt } from '@gltf-transform/functions';
import { MeshoptEncoder, MeshoptDecoder } from 'meshoptimizer';
globalThis.FileReader = class {
  readAsArrayBuffer(blob) { blob.arrayBuffer().then(buffer => { this.result = buffer; this.onloadend?.(); }); }
};
const { root } = createTechnician();
const buffer = await new GLTFExporter().parseAsync(root, { binary: true, onlyVisible: false });
await MeshoptEncoder.ready; await MeshoptDecoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.encoder': MeshoptEncoder, 'meshopt.decoder': MeshoptDecoder });
const document = await io.readBinary(new Uint8Array(buffer)); await document.transform(meshopt({ encoder: MeshoptEncoder, level: 'medium' }));
const encoded = await io.writeBinary(document);
writeFileSync('public/assets/researcher-v0.8-hd.glb', encoded);
console.log('Skinned researcher exported:', encoded.byteLength);

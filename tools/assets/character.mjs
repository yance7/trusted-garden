import * as T from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

/** Authored field technician. One skinned surface with a reproducible procedural source. */
export function createTechnician() {
  const root = new T.Group(); root.name = 'Field_Researcher_HD';
  const palette = [
    ['technical-jacket', 0x59776c, .85], ['work-trousers', 0x303c3b, .91], ['skin', 0xbe9273, .68], ['safety-vest', 0xb1b970, .76], ['boots-gloves', 0x272f2c, .84], ['equipment', 0x5e7477, .42], ['reflective-piping', 0xc4dad7, .48], ['visor', 0x283b43, .20]
  ];
  const materials = palette.map(([name, color, roughness]) => { const m = new T.MeshStandardMaterial({ color, roughness }); m.name = name; return m; });
  const bones = [], named = {};
  const bone = (name, parent, pos) => { const b = new T.Bone(); b.name = name; b.position.set(...pos); (parent || root).add(b); bones.push(b); named[name] = b; return b; };
  const hips = bone('hips', null, [0, .90, 0]), chest = bone('chest', hips, [0, .20, 0]), neck = bone('neck', chest, [0, .43, 0]);
  const shoulderL = bone('shoulderL', chest, [.225, .32, 0]), elbowL = bone('elbowL', shoulderL, [0, -.27, 0]);
  const shoulderR = bone('shoulderR', chest, [-.225, .32, 0]), elbowR = bone('elbowR', shoulderR, [0, -.27, 0]);
  const hipL = bone('hipL', hips, [.095, -.015, 0]), kneeL = bone('kneeL', hipL, [0, -.40, 0]);
  const hipR = bone('hipR', hips, [-.095, -.015, 0]), kneeR = bone('kneeR', hipR, [0, -.40, 0]);
  root.updateMatrixWorld(true);
  const pieces = [], headPieces = [];
  const add = (geo, b, position, material, head = false) => {
    if (geo.index) geo = geo.toNonIndexed(); geo.translate(...position); geo.applyMatrix4(b.matrixWorld);
    const count = geo.attributes.position.count, indices = new Uint16Array(count * 4), weights = new Float32Array(count * 4);
    const index = bones.indexOf(b); for (let i = 0; i < count; i++) { indices[i * 4] = index; weights[i * 4] = 1; }
    geo.setAttribute('skinIndex', new T.Uint16BufferAttribute(indices, 4)); geo.setAttribute('skinWeight', new T.Float32BufferAttribute(weights, 4));
    pieces.push({ geo, material, head }); if (head) headPieces.push(pieces.length - 1);
  };
  const oval = (x, y, z) => new T.SphereGeometry(1, 24, 16).scale(x, y, z);
  const softBox = (w, h, d, r = .015) => new RoundedBoxGeometry(w, h, d, 3, r);
  const limb = (r, h) => new T.CapsuleGeometry(r, h, 8, 20);
  add(softBox(.31, .22, .22, .045), hips, [0, -.03, 0], 1);
  const jacket = new T.LatheGeometry([new T.Vector2(.143,-.13),new T.Vector2(.16,-.06),new T.Vector2(.177,.10),new T.Vector2(.195,.25),new T.Vector2(.18,.36),new T.Vector2(.09,.435),new T.Vector2(.052,.445)],40);jacket.scale(1,1,.66);
  add(jacket, chest, [0,0,0], 0);
  add(softBox(.33, .31, .04), chest, [0, .25, -.112], 3);
  for (const x of [-.105, .105]) { add(softBox(.074, .26, .025), chest, [x, .25, .111], 3); add(softBox(.085, .055, .022, .005), chest, [x, .18, .13], 5); add(softBox(.078, .014, .007, .003), chest, [x, .33, .13], 6); }
  add(softBox(.014, .36, .011, .003), chest, [0, .23, .125], 6);
  add(softBox(.29, .036, .235, .008), hips, [0, .025, 0], 4);
  add(softBox(.048, .036, .017, .005), hips, [0, .025, .125], 5);
  add(limb(.045, .07), neck, [0, .035, 0], 2);
  add(oval(.087, .117, .085), neck, [0, .15, .002], 2, true);
  add(oval(.066, .047, .071), neck, [0, .085, .020], 2, true);
  add(oval(.018, .028, .019), neck, [0, .145, .086], 2, true);
  for (const x of [-1, 1]) { add(oval(.015, .025, .014), neck, [x * .087, .145, 0], 2, true); add(oval(.018, .007, .006), neck, [x * .033, .167, .077], 7, true); add(softBox(.04, .005, .005, .001), neck, [x * .034, .184, .076], 4, true); }
  add(oval(.092, .06, .091), neck, [0, .235, -.003], 3, true);
  add(softBox(.19, .014, .12, .012), neck, [0, .205, .051], 3, true);
  add(softBox(.045, .017, .01, .004), neck, [0, .248, .086], 6, true);
  for (const [shoulder, elbow, hip, knee] of [[shoulderL, elbowL, hipL, kneeL], [shoulderR, elbowR, hipR, kneeR]]) {
    add(limb(.066, .16), shoulder, [0, -.125, 0], 0);
    add(limb(.057, .20), elbow, [0, -.11, 0], 0);
    add(softBox(.065, .07, .022, .009), shoulder, [0, -.10, .057], 3);
    add(softBox(.066, .018, .018, .004), elbow, [0, -.19, .047], 6);
    add(oval(.046, .06, .029), elbow, [0, -.28, .005], 4);
    for (let j = 0; j < 4; j++) add(limb(.008, .040), elbow, [-.026 + j * .017, -.32, .012], 4);
    add(limb(.083, .27), hip, [0, -.20, 0], 1);
    add(limb(.065, .26), knee, [0, -.18, 0], 1);
    add(softBox(.09, .08, .028, .02), knee, [0, -.03, .057], 4);
    add(softBox(.114, .105, .235, .025), knee, [0, -.385, .055], 4);
    add(softBox(.12, .022, .24, .008), knee, [0, -.43, .055], 5);
    for (let j = 0; j < 3; j++) add(softBox(.066, .008, .01, .002), knee, [0, -.34 + j * .017, .14], 6);
  }
  add(softBox(.205, .018, .285, .014).rotateX(-.65), elbowR, [0, -.27, .15], 5);
  add(softBox(.175, .004, .23, .008).rotateX(-.65), elbowR, [0, -.25, .16], 7);
  const byMaterial = materials.map((_, index) => mergeGeometries(pieces.filter(p => p.material === index).map(p => p.geo), false));
  const merged = mergeGeometries(byMaterial, true);
  const mesh = new T.SkinnedMesh(merged, materials); mesh.name = 'Researcher_skin'; mesh.castShadow = true; mesh.receiveShadow = true;
  root.add(mesh); const skeleton = new T.Skeleton(bones); mesh.bind(skeleton); root.userData.headGroups = headPieces; root.userData.generatedBy = 'tools/assets/character.mjs';
  // Map each mesh group to the shared authored material rather than duplicating material instances.
  merged.groups.forEach((g, i) => g.materialIndex = i);
  return { root, mesh, bones: named };
}

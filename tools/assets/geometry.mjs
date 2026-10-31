import * as T from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries, toCreasedNormals } from 'three/addons/utils/BufferGeometryUtils.js';

export const rng = (seed) => () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
export function finish(g, scale = 1) {
  if (g.index) g = g.toNonIndexed();
  if (!g.getAttribute('normal')) g.computeVertexNormals();
  if (!g.getAttribute('uv')) {
    const p = g.getAttribute('position'), n = g.getAttribute('normal'), uv = [];
    for (let i = 0; i < p.count; i++) {
      const a = [Math.abs(n.getX(i)), Math.abs(n.getY(i)), Math.abs(n.getZ(i))];
      const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
      uv.push((a[1] >= a[0] && a[1] >= a[2] ? x : a[0] > a[2] ? z : x) * scale, (a[1] >= a[0] && a[1] >= a[2] ? z : y) * scale);
    }
    g.setAttribute('uv', new T.Float32BufferAttribute(uv, 2));
  }
  for (const key of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(key)) g.deleteAttribute(key);
  return g;
}
export function join(geometries) { return mergeGeometries(geometries.map(g => finish(g)), false); }
export function leaf(length = .35, width = .10, segments = 8, bend = .12) {
  const p = [], uv = [], idx = [];
  for (let j = 0; j <= segments; j++) {
    const t = j / segments, w = Math.max(.002, Math.pow(Math.sin(Math.PI * Math.pow(t, .85)), .7) * width * 1.14);
    for (let k = 0; k < 3; k++) { const s = k - 1; p.push(s * w, Math.sin(t * Math.PI) * bend - t * t * bend * .7 - Math.abs(s) * width * .08, t * length); uv.push(k / 2, t); }
  }
  for (let j = 0; j < segments; j++) for (let k = 0; k < 2; k++) { const i = j * 3 + k; idx.push(i, i + 3, i + 1, i + 1, i + 3, i + 4); }
  const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(p, 3)); g.setAttribute('uv', new T.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals(); return finish(g);
}
/** Crossed alpha cards: dense turf silhouette for a fraction of blade geometry. */
export function grassCard(size, seed) {
  const r = rng(seed), quads = [];
  for (let k = 0; k < 2; k++) {
    const g = new T.PlaneGeometry(size * (.85 + r() * .3), size * (.8 + r() * .45), 1, 1);
    const pos = g.getAttribute('position');
    for (let i = 0; i < pos.count; i++) { const t = (pos.getY(i) + size * .5) / size; pos.setX(i, pos.getX(i) + (r() - .5) * .02 + t * t * (r() - .5) * size * .3); pos.setY(i, pos.getY(i) + size * .5); }
    g.rotateY(k * Math.PI / 2 + r() * .8); quads.push(g);
  }
  return join(quads);
}
export function discGrid(radius, rings, segments) {
  const p = [], uv = [], idx = [];
  for (let i = 0; i <= rings; i++) for (let j = 0; j <= segments; j++) {
    const a = j / segments * Math.PI * 2, rr = radius * i / rings;
    p.push(Math.cos(a) * rr, 0, Math.sin(a) * rr); uv.push(Math.cos(a) * rr, Math.sin(a) * rr);
  }
  for (let i = 0; i < rings; i++) for (let j = 0; j < segments; j++) {
    const a = i * (segments + 1) + j, b = a + segments + 1; idx.push(a, b, a + 1, a + 1, b, b + 1);
  }
  const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(p, 3)); g.setAttribute('uv', new T.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals(); return finish(g, 1);
}
/** Recover authored plant positions from the merged stem cylinders. */
export function cornStemPlants(object) {
  const p = object.positions, idx = object.indices, key = new Map(), parent = [];
  const id = i => { const k = `${Math.round(p[i * 3] * 900)},${Math.round(p[i * 3 + 1] * 900)},${Math.round(p[i * 3 + 2] * 900)}`; if (!key.has(k)) { key.set(k, parent.length); parent.push(parent.length); } return key.get(k); };
  const find = a => { while (parent[a] !== a) { parent[a] = parent[parent[a]]; a = parent[a]; } return a; };
  for (let i = 0; i < idx.length; i += 3) { const a = find(id(idx[i])), b = find(id(idx[i + 1])), c = find(id(idx[i + 2])); if (a !== b) parent[b] = a; if (find(c) !== a) parent[find(c)] = a; }
  const groups = new Map();
  for (let i = 0; i < p.length / 3; i++) { const g = find(id(i)); if (!groups.has(g)) groups.set(g, { lo: [9, 9, 9], hi: [-9, -9, -9], n: 0 }); const b = groups.get(g); for (let k = 0; k < 3; k++) { b.lo[k] = Math.min(b.lo[k], p[i * 3 + k]); b.hi[k] = Math.max(b.hi[k], p[i * 3 + k]); } b.n++; }
  return [...groups.values()].filter(b => b.n >= 8 && b.hi[1] - b.lo[1] > .5).map(b => ({ base: [(b.lo[0] + b.hi[0]) / 2, b.lo[1], (b.lo[2] + b.hi[2]) / 2], height: b.hi[1] - b.lo[1] }));
}
export function cornPlant(plant, seed) {
  const r = rng(seed), parts = [], h = plant.height, lean = (r() - .5) * .12;
  const stem = new T.CylinderGeometry(.020, .034, h, 8, 3, true);
  const sp = stem.getAttribute('position');
  for (let i = 0; i < sp.count; i++) { const t = (sp.getY(i) + h / 2) / h; sp.setX(i, sp.getX(i) + lean * t * t); sp.setZ(i, sp.getZ(i) + lean * .6 * t * t); }
  stem.translate(plant.base[0] + lean * .5, plant.base[1] + h / 2, plant.base[2] + lean * .3); parts.push({ geometry: stem, part: 'stem' });
  for (let j = 0; j < 9; j++) {
    const t = .28 + j * .082 + r() * .03, length = (.36 + r() * .24) * (1 - Math.abs(t - .62) * .8);
    const g = leaf(length, .060 + r() * .018, 5, length * (.30 + t * .55));
    g.rotateX(-.35 - t * .9 - r() * .25); g.rotateY(j * 2.39996 + r() * .5); g.rotateZ((r() - .5) * .3);
    g.translate(plant.base[0] + lean * t * t, plant.base[1] + h * t, plant.base[2] + lean * .6 * t * t); parts.push({ geometry: g, part: 'leaf' });
  }
  if (r() > .12) {
    const earY = plant.base[1] + h * .58, az = r() * 6.28;
    const ear = new T.CylinderGeometry(.020, .034, .19, 8, 2, true); ear.rotateZ(.5); ear.rotateY(az);
    ear.translate(plant.base[0] + Math.cos(az) * .07, earY, plant.base[2] + Math.sin(az) * .07); parts.push({ geometry: ear, part: 'ear' });
    for (let k = 0; k < 4; k++) { const husk = leaf(.24, .030, 4, .10); husk.rotateX(-.9 - k * .12); husk.rotateY(az + k * 1.7); husk.translate(plant.base[0] + Math.cos(az) * .05, earY - .06, plant.base[2] + Math.sin(az) * .05); parts.push({ geometry: husk, part: 'husk' }); }
    for (let k = 0; k < 5; k++) { const silk = new T.ConeGeometry(.0035, .10, 4, 1, true); silk.rotateZ((r() - .5) * .9); silk.rotateY(r() * 6.28); silk.translate(plant.base[0] + Math.cos(az) * .12, earY + .11, plant.base[2] + Math.sin(az) * .12); parts.push({ geometry: silk, part: 'silk' }); }
  }
  const top = plant.base[1] + h + .02;
  const spike = new T.ConeGeometry(.010, .22, 5, 2, true); spike.translate(plant.base[0] + lean, top + .10, plant.base[2] + lean * .6); parts.push({ geometry: spike, part: 'tassel' });
  for (let k = 0; k < 6; k++) {
    const g = new T.ConeGeometry(.007, .13, 4, 1, true); const az = k * 1.047 + r() * .4;
    g.rotateZ(.55 + r() * .3); g.rotateY(az); g.translate(plant.base[0] + lean + Math.cos(az) * .05, top + .05, plant.base[2] + lean * .6 + Math.sin(az) * .05); parts.push({ geometry: g, part: 'tassel' });
  }
  return parts;
}
export function fishFin(body, tail) {
  const bc = body.bounds.center, tc = tail.bounds.center;
  const dir = new T.Vector3(tc[0] - bc[0], 0, tc[2] - bc[2]);
  if (dir.lengthSq() < 1e-6) dir.set(1, 0, 0); dir.normalize();
  const h = .13, w = .075;
  const c = new T.Vector3(tc[0], bc[1] - .28, tc[2]);
  const p = [], idx = [];
  const push = v => { p.push(v.x, v.y, v.z); return p.length / 3 - 1; };
  const a = push(c.clone()), b = push(c.clone().addScaledVector(dir, w).add(new T.Vector3(0, h, 0))), d = push(c.clone().addScaledVector(dir, w * 1.5)), e = push(c.clone().addScaledVector(dir, w).add(new T.Vector3(0, -h * .8, 0)));
  idx.push(a, b, d, a, d, e);
  const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(p, 3)); g.setIndex(idx); g.computeVertexNormals();
  return finish(g, 3);
}
function spray(o, seed) {
  const r = rng(seed), c = o.bounds.center, sz = o.bounds.size;
  const shells = /crown/i.test(o.name) ? 2 : 1, leaves = [];
  const count = (/crown/i.test(o.name) ? 190 : o.category === 'shrub' ? 62 : 32) * shells;
  for (let j = 0; j < count; j++) {
    const shell = shells === 2 ? (j % 2 ? .62 : 1) : .55 + r() * .45;
    const phi = r() * Math.PI * 2, z = r() * 2 - 1, radius = Math.pow(r(), .22), v = Math.sqrt(1 - z * z);
    const length = o.category === 'shrub' ? .09 + r() * .10 : Math.min(.30, Math.max(.11, sz[1] * .16)) * (.7 + r() * .6);
    const g = leaf(length, length * .40, 4, length * .16);
    // Leaves hang outward and slightly down so the canopy reads as layered foliage.
    g.rotateX(-.5 - r() * 1.1); g.rotateY(phi); g.rotateZ((r() - .5) * .9);
    g.translate(c[0] + Math.cos(phi) * v * sz[0] * .45 * radius * shell, c[1] + z * sz[1] * .45 * radius * shell, c[2] + Math.sin(phi) * v * sz[2] * .45 * radius * shell); leaves.push(g);
  }
  if (o.category === 'shrub') for (let j = 0; j < 7; j++) {
    const s = new T.CylinderGeometry(.004, .007, sz[1] * .8, 5, 1, true);
    // Twigs share the leaf batch, so pin their UVs to the silhouette's opaque spine.
    const suv = s.getAttribute('uv'); for (let i = 0; i < suv.count; i++) suv.setXY(i, .5, .5);
    s.rotateZ((r() - .5) * .8); s.rotateX((r() - .5) * .8); s.translate(c[0] + (r() - .5) * sz[0] * .5, c[1] - sz[1] * .1, c[2] + (r() - .5) * sz[2] * .5); leaves.push(s);
  }
  return join(leaves);
}
function rounded(o) {
  const p = o.positions, origin = new T.Vector3(p[0], p[1], p[2]), vectors = [];
  for (let i = 3; i < p.length; i += 3) vectors.push(new T.Vector3(p[i], p[i + 1], p[i + 2]).sub(origin));
  vectors.sort((a, b) => a.lengthSq() - b.lengthSq());
  const axes = [];
  for (const v of vectors) if (v.lengthSq() > 1e-9 && axes.every(e => Math.abs(e.clone().normalize().dot(v.clone().normalize())) < .001)) { axes.push(v); if (axes.length === 3) break; }
  if (axes.length < 3) return null;
  const size = axes.map(v => v.length()), basis = axes.map(v => v.clone().normalize());
  if (new T.Vector3().crossVectors(basis[0], basis[1]).dot(basis[2]) < 0) basis[2].negate();
  const g = new RoundedBoxGeometry(...size, 2, Math.min(.035, Math.min(...size) * .17));
  g.applyMatrix4(new T.Matrix4().makeBasis(...basis)); g.translate(...o.bounds.center);
  // Physical UVs, independent of small-object UV normalization.
  g.deleteAttribute('uv'); return finish(g, .75);
}
function original(o) {
  const g = new T.BufferGeometry(); g.setAttribute('position', new T.BufferAttribute(o.positions.slice(), 3));
  const keep = [];
  const a = new T.Vector3(), b = new T.Vector3(), c = new T.Vector3();
  for (let i = 0; i < o.indices.length; i += 3) {
    const ia = o.indices[i], ib = o.indices[i + 1], ic = o.indices[i + 2];
    a.fromArray(o.positions, ia * 3); b.fromArray(o.positions, ib * 3).sub(a); c.fromArray(o.positions, ic * 3).sub(a);
    if (b.cross(c).lengthSq() > 1e-14) keep.push(ia, ib, ic);
  }
  g.setIndex(keep); g.computeVertexNormals();
  return finish(toCreasedNormals(g, o.category === 'plant' || o.category === 'tree' || /sphere|cylinder|cone/.test(o.shape) ? 1.1 : .45), .7);
}
export function upgradeGeometry(o, seed) {
  const n = o.name.toLowerCase();
  if (/corn_(leaves|ears|husks|tassels|stems)/.test(n)) return { geometry: null, method: 'superseded-by-generated-corn' };
  if (n === 'pond_water') return { geometry: null, method: 'superseded-by-generated-water-surface' };
  if (/^fish_\d+_tail$/.test(n)) return { geometry: null, method: 'superseded-by-caudal-fin' };
  if (/^aeration_bubble_/.test(n)) {
    const index = Number(n.split('_').pop()), c = o.bounds.center;
    const g = new T.SphereGeometry(.028 + (index % 3) * .012, 10, 8);
    g.translate(c[0], .58 + ((index * 37) % 60) / 100, c[2]); return { geometry: finish(g), method: 'submerged-aeration-bubble' };
  }
  if (/^fish/.test(n)) { const g = original(o); g.translate(0, -.28, 0); return { geometry: g, method: 'repaired-normals-physical-uv-submerged' }; }
  if (/crown|foliage/.test(n) || o.category === 'shrub') return { geometry: spray(o, seed), method: 'curved-leaf-canopy' };
  if (/aqua_leaf/.test(n)) {
    const s = o.bounds.size, g = leaf(Math.max(s[0], s[2]), Math.min(s[0], s[2]) * .5, 10, s[1] * .65);
    g.rotateY(seed * 2.39996); g.translate(...o.bounds.center); return { geometry: g, method: 'curved-leaf-rebuild' };
  }
  if (o.shape === 'cylinder' && o.positions.length >= 12 && o.extras.radius && o.extras.height) {
    const start = new T.Vector3().fromArray(o.positions,0), end = new T.Vector3().fromArray(o.positions,9);
    const length = start.distanceTo(end);
    if (Math.abs(length-o.extras.height)<.015 && length>.002) {
      const radius=o.extras.radius, segments=radius>1?160:radius>.10?64:32;
      const g=new T.CylinderGeometry(radius,radius,length,segments,2);
      const uv=g.getAttribute('uv');for(let i=0;i<uv.count;i++){uv.setXY(i,uv.getX(i)*Math.max(.1,2*Math.PI*radius),uv.getY(i)*Math.max(.1,length));}
      g.applyQuaternion(new T.Quaternion().setFromUnitVectors(new T.Vector3(0,1,0),end.clone().sub(start).normalize()));g.translate(...start.add(end).multiplyScalar(.5).toArray());
      return {geometry:finish(g),method:'high-resolution-oriented-cylinder'};
    }
  }
  if (o.shape === 'box' && o.positions.length === 24 && !/glass|water|soil|meadow|base|row_/i.test(o.material.name + n)) {
    const g = rounded(o); if (g) return { geometry: g, method: 'oriented-beveled-solid' };
  }
  if (o.category === 'ground' || /meadow|site_base/i.test(n)) {
    // Source ground UVs span the whole 38x31 m site, which stretches one material tile across it.
    const g = original(o); g.deleteAttribute('uv');
    return { geometry: finish(g, .5), method: 'repaired-normals-world-scaled-ground-uv' };
  }
  return { geometry: original(o), method: 'repaired-normals-physical-uv' };
}

export function familyFor(o) {
  const n = (o.material.name + ' ' + o.name).toLowerCase();
  if (/meadow|lawn|turf/.test(n)) return 'turf';
  if (/leaf|foliage|corn|shrub|reed|plant|lettuce/.test(n)) return 'leaf';
  if (/wood|boardwalk|timber|deck/.test(n)) return 'wood';
  if (/bark|trunk|branch/.test(n) && o.category === 'tree') return 'bark';
  if (/soil|earth|mulch/.test(n)) return 'soil';
  if (/metal|steel|alumin|glass|water|sensor|plastic|polymer|rubber|equipment|display/.test(n) || o.category === 'equipment') return 'metal';
  return 'concrete';
}

export function extraGeometry(objects) {
  const extra = [];
  const add = (geometry, family, color, region, layer, name, options = {}) => extra.push({ geometry: finish(geometry), family, color, region, layer, name, ...options });
  const ring = (radius, tube, pos, region, name, color = [.10, .56, .48]) => { const g = new T.TorusGeometry(radius, tube, 6, 32); g.translate(...pos); add(g, 'metal', color, region, 'compute', name); };
  for (const o of objects) {
    const n = o.name.toLowerCase(), c = o.bounds.center, s = o.bounds.size;
    if (o.shape === 'box' && /camera|rgb|lidar/.test(n) && !/post|mast|cable/.test(n) && s[1] > .09) {
      const r = Math.min(.10, Math.max(.026, Math.min(s[0], s[1]) * .30));
      const z = c[2] + s[2] * .5 + .018;
      ring(r, .009, [c[0], c[1], z], o.region, o.name + '-lens-rim');
      const lens = new T.SphereGeometry(r * .85, 20, 12); lens.scale(1, 1, .19); lens.translate(c[0], c[1], z);
      add(lens, 'metal', [.025, .09, .13], o.region, 'compute', o.name + '-optics', { roughness: .05, metallic: .4 });
      for (const sx of [-1, 1]) for (const sy of [-1, 1]) { const bolt = new T.CylinderGeometry(.008, .008, .007, 8); bolt.rotateX(Math.PI / 2); bolt.translate(c[0] + sx * s[0] * .38, c[1] + sy * s[1] * .34, z - .008); add(bolt, 'metal', [.40, .47, .47], o.region, 'compute', o.name + '-fastener'); }
    }
    if (/server|rack|gateway|plc/.test(n) && o.shape === 'box' && s[1] > .20 && s[0] > .20 && !/panel|door|rail/.test(n)) {
      for (let j = 0; j < 6; j++) {
        const vent = new T.BoxGeometry(s[0] * .65, .011, .008); vent.translate(c[0], c[1] - s[1] * .25 + j * s[1] * .075, c[2] + s[2] * .5 + .004);
        add(vent, 'metal', [.035, .045, .047], o.region, 'compute', o.name + '-vent');
      }
      const led = new T.SphereGeometry(.013, 8, 6); led.translate(c[0] + s[0] * .32, c[1] + s[1] * .33, c[2] + s[2] / 2 + .01); add(led, 'metal', [.08, .85, .55], o.region, 'compute', o.name + '-status', { emissive: true });
    }
    if (/trunk/.test(n) && o.category === 'tree') {
      for (let j = 0; j < 5; j++) {
        const angle = j * 2.39996, start = new T.Vector3(c[0], c[1] + s[1] * .3, c[2]);
        const end = start.clone().add(new T.Vector3(Math.cos(angle) * .7, .55 + j * .05, Math.sin(angle) * .7));
        const g = new T.CylinderGeometry(.018, .06, start.distanceTo(end), 10, 2); g.applyQuaternion(new T.Quaternion().setFromUnitVectors(new T.Vector3(0, 1, 0), end.clone().sub(start).normalize())); g.translate(...start.add(end).multiplyScalar(.5).toArray()); add(g, 'bark', [.35, .28, .20], 'site', 'base', o.name + '-branch');
      }
    }
  }
  return extra;
}

export function grassGeometry(objects) {
  const random = rng(20261029), cards = [], blades = [], ground = objects.filter(o => /meadow|lawn|grass/i.test(o.name) && o.bounds.size[1] < .3);
  let cardSeed = 7000;
  for (const o of ground) {
    const [sx, , sz] = o.bounds.size, top = o.bounds.hi[1] + .004;
    const cardCount = Math.ceil(sx * sz * 24);
    for (let j = 0; j < cardCount; j++) {
      const g = grassCard(.20 + random() * .12, cardSeed++);
      g.translate(o.bounds.lo[0] + sx * random(), top, o.bounds.lo[2] + sz * random()); cards.push(g);
    }
    const bladeCount = Math.ceil(sx * sz * 2);
    for (let j = 0; j < bladeCount; j++) {
      const x = o.bounds.lo[0] + sx * random(), z = o.bounds.lo[2] + sz * random();
      for (let b = 0; b < 3; b++) { const g = leaf(.12 + random() * .18, .010 + random() * .010, 4, .04); g.rotateX(-1.12 + random() * .26); g.rotateY(random() * 6.28); g.translate(x, top, z); blades.push(g); }
    }
  }
  const out = [];
  if (cards.length) out.push({ geometry: join(cards), family: 'grass', key: 'grass-cards' });
  if (blades.length) out.push({ geometry: join(blades), family: 'leaf', key: 'grass-blades' });
  return out;
}

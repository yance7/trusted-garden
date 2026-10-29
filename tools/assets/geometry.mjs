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
    const t = j / segments, w = Math.max(.002, Math.pow(Math.sin(Math.PI * t), .8) * width);
    for (let k = 0; k < 3; k++) { const s = k - 1; p.push(s * w, Math.sin(t * Math.PI) * bend - t * t * bend * .7 - Math.abs(s) * width * .08, t * length); uv.push(k / 2, t); }
  }
  for (let j = 0; j < segments; j++) for (let k = 0; k < 2; k++) { const i = j * 3 + k; idx.push(i, i + 3, i + 1, i + 1, i + 3, i + 4); }
  const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(p, 3)); g.setAttribute('uv', new T.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals(); return finish(g);
}
function spray(o, seed) {
  const r = rng(seed), c = o.bounds.center, sz = o.bounds.size;
  const count = /crown/i.test(o.name) ? 150 : o.category === 'shrub' ? 55 : 32, leaves = [];
  for (let j = 0; j < count; j++) {
    const phi = r() * Math.PI * 2, z = r() * 2 - 1, radius = Math.pow(r(), .25), v = Math.sqrt(1 - z * z);
    const length = o.category === 'shrub' ? .10 + r() * .11 : Math.min(.28, Math.max(.10, sz[1] * .17));
    const g = leaf(length, length * .34, 5, length * .14);
    g.rotateX((r() - .5) * 2); g.rotateY(phi); g.rotateZ((r() - .5) * 1.2);
    g.translate(c[0] + Math.cos(phi) * v * sz[0] * .43 * radius, c[1] + z * sz[1] * .43 * radius, c[2] + Math.sin(phi) * v * sz[2] * .43 * radius); leaves.push(g);
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
  return { geometry: original(o), method: 'repaired-normals-physical-uv' };
}

export function familyFor(o) {
  const n = (o.material.name + ' ' + o.name).toLowerCase();
  if (/leaf|foliage|grass|meadow|corn|shrub|reed|plant|lettuce/.test(n)) return 'leaf';
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
  const random = rng(20261029), blades = [], ground = objects.filter(o => /meadow|lawn|grass/i.test(o.name) && o.bounds.size[1] < .3);
  // Ground-mapped placement: preserve paths, beds and water by only using meadow footprints.
  for (const o of ground) {
    const [sx, , sz] = o.bounds.size, count = Math.min(7000, Math.ceil(sx * sz * 12));
    for (let j = 0; j < count; j++) {
      const x = o.bounds.lo[0] + sx * random(), z = o.bounds.lo[2] + sz * random();
      for (let b = 0; b < 3; b++) { const g = leaf(.10 + random() * .16, .009 + random() * .009, 4, .035); g.rotateX(-1.15 + random() * .28); g.rotateY(random() * 6.28); g.translate(x, o.bounds.hi[1] + .006, z); blades.push(g); }
    }
  }
  return blades.length ? join(blades) : null;
}

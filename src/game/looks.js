// What the campaign's things look like: resource nodes (one look per material), the quest
// objects of each region (springs, valves, chimneys, crystals...), workbenches and camps.
// Each quest object has parts that are always there, parts that go away once it is done
// (rubble, ice, blockages) and parts that appear once done (a woven web, a raised sail).
// Built from primitives, shared materials, no textures.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { lumpy, boulder } from '../organic.js';
import { taperTube, facet } from '../biomes/common.js';
import { makeBarrel, makeChestModel, makeCrate, makeLantern, makeWorkbench as detailedBench } from './props.js';

const cache = new Map();
const mat = (c, o = {}) => {
  const k = c + JSON.stringify(o);
  if (!cache.has(k)) cache.set(k, new THREE.MeshStandardMaterial({ color: c, roughness: 0.8, ...o }));
  return cache.get(k);
};
const glow = (c, k = 1.6) => {
  const key = `glow${c}${k}`;
  if (!cache.has(key)) cache.set(key, new THREE.MeshBasicMaterial({ color: new THREE.Color(c).multiplyScalar(k) }));
  return cache.get(key);
};
const mesh = (geo, m, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0) => {
  const o = new THREE.Mesh(geo, m);
  o.position.set(x, y, z);
  o.rotation.set(rx, ry, rz);
  o.castShadow = true;
  return o;
};
const scaled = (o, x, y, z) => { o.scale.set(x, y, z); return o; };
const group = (...kids) => { const g = new THREE.Group(); kids.flat().forEach((k) => g.add(k)); return g; };

// ---------------------------------------------------------------- resource nodes
const gem = (c) => group(mesh(new THREE.OctahedronGeometry(0.32, 0), new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: 0.8 }), 0, 0.45, 0));
const NODES = {
  log: () => group(mesh(new THREE.CylinderGeometry(0.3, 0.3, 1.6, 14), mat('#6a4a2a'), 0, 0.3, 0, 0, 0, Math.PI / 2), ...[-1, 1].map((s) => mesh(new THREE.CircleGeometry(0.3, 14), mat('#d8b480'), s * 0.81, 0.3, 0, 0, s * Math.PI / 2, 0)), mesh(new THREE.TorusGeometry(0.18, 0.025, 4, 14), mat('#a8804a'), 0.82, 0.3, 0, 0, Math.PI / 2, 0)),
  fiber: () => group([0, 1, 2, 3].map((k) => mesh(new THREE.ConeGeometry(0.06, 0.9, 4), mat('#c9b07a'), Math.cos(k * 1.6) * 0.15, 0.45, Math.sin(k * 1.6) * 0.15, (k - 1.5) * 0.15, 0, 0))),
  plate: () => group(mesh(new RoundedBoxGeometry(0.9, 0.14, 0.7, 2, 0.05), mat('#a8642a'), 0, 0.1, 0, 0, 0.4, 0.15), mesh(new RoundedBoxGeometry(0.6, 0.12, 0.5, 2, 0.04), mat('#c98a4a'), 0.1, 0.2, 0.05, 0, 1.1, -0.1)),
  resin: () => group(mesh(new THREE.SphereGeometry(0.3, 12, 10), glow('#ffb347', 1.3), 0, 0.4, 0)),
  coral: () => group([0, 1, 2].map((k) => mesh(new THREE.ConeGeometry(0.1, 0.9, 5), mat('#ff8a7a', { emissive: '#5a1a1a', emissiveIntensity: 0.4 }), (k - 1) * 0.2, 0.45, 0, 0, 0, (k - 1) * 0.4))),
  shell: () => group(scaled(mesh(new THREE.SphereGeometry(0.3, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), mat('#f0e8da', { roughness: 0.3 }), 0, 0.02, 0), 1, 0.7, 1.3)),
  obsidian: () => group(mesh(new THREE.DodecahedronGeometry(0.42, 0), mat('#151218', { roughness: 0.15, metalness: 0.3 }), 0, 0.35, 0)),
  ore: () => group(mesh(new THREE.DodecahedronGeometry(0.42, 0), new THREE.MeshStandardMaterial({ color: '#5a3a2a', emissive: '#ff6a1a', emissiveIntensity: 0.7 }), 0, 0.38, 0)),
  ice: () => group(mesh(new THREE.OctahedronGeometry(0.45, 0), mat('#cfeaff', { roughness: 0.05, transparent: true, opacity: 0.85 }), 0, 0.45, 0)),
  lichen: () => group(mesh(new THREE.CircleGeometry(0.5, 10), mat('#8ab0a0', { side: THREE.DoubleSide }), 0, 0.05, 0, -Math.PI / 2)),
  vine: () => group(mesh(new THREE.TorusGeometry(0.35, 0.07, 6, 14), mat('#3f7a2a'), 0, 0.12, 0, Math.PI / 2)),
  leaf: () => group(mesh(new THREE.ConeGeometry(0.5, 1.4, 4), mat('#4f8a3a', { side: THREE.DoubleSide }), 0, 0.15, 0, Math.PI / 2, 0.5, 0)),
  peat: () => group(scaled(mesh(boulder(17), mat('#3a2a1a'), 0, 0.12, 0, 0, 0.3, 0), 0.45, 0.3, 0.35), scaled(mesh(lumpy({ detail: 1, amp: 0.2, seed: 3, flatten: 0.4 }), mat('#5a7a2a'), 0, 0.25, 0), 0.3, 0.2, 0.25)),
  spore: () => group(mesh(new THREE.SphereGeometry(0.32, 10, 8), new THREE.MeshStandardMaterial({ color: '#8aa04a', emissive: '#a8ff5a', emissiveIntensity: 0.6 }), 0, 0.35, 0)),
  quartz: () => group(mesh(new THREE.ConeGeometry(0.2, 1, 6), mat('#eef0ff', { roughness: 0.1, emissive: '#8a8aaa', emissiveIntensity: 0.3 }), 0, 0.5, 0)),
  amethyst: () => group(mesh(new THREE.ConeGeometry(0.22, 0.9, 6), new THREE.MeshStandardMaterial({ color: '#9a6ad0', emissive: '#c59bff', emissiveIntensity: 0.5, roughness: 0.1 }), 0, 0.45, 0, 0.2, 0, 0)),
  feather: () => group(mesh(new THREE.PlaneGeometry(0.25, 0.9), mat('#f4f4ea', { side: THREE.DoubleSide }), 0, 0.5, 0, 0, 0, 0.3)),
  sap: () => group(mesh(new THREE.SphereGeometry(0.28, 12, 10), glow('#d0a040', 1.2), 0, 0.35, 0)),
  pollen: () => group(mesh(new THREE.SphereGeometry(0.3, 12, 10), glow('#ffd76a', 1.6), 0, 0.45, 0)),
  petal: () => group(mesh(new THREE.SphereGeometry(0.4, 10, 6, 0, Math.PI * 2, 0, Math.PI / 3), mat('#ff9ad0', { side: THREE.DoubleSide }), 0, 0.1, 0)),
  cogumelo: () => group(mesh(new THREE.CylinderGeometry(0.08, 0.1, 0.4, 8), mat('#efe6d0'), 0, 0.2, 0), mesh(new THREE.SphereGeometry(0.3, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshStandardMaterial({ color: '#c96a3a', emissive: '#5a1a0a', emissiveIntensity: 0.4 }), 0, 0.38, 0)),
  erva: () => group(mesh(new THREE.ConeGeometry(0.35, 0.7, 6), new THREE.MeshStandardMaterial({ color: '#7fd16a', emissive: '#2a6a1a', emissiveIntensity: 0.5 }), 0, 0.35, 0)),
  fruta: () => group(mesh(new THREE.SphereGeometry(0.28, 12, 10), mat('#ff7a3a', { emissive: '#5a1a00', emissiveIntensity: 0.4 }), 0, 0.3, 0)),
  alga: () => group(mesh(new THREE.ConeGeometry(0.25, 0.9, 5), new THREE.MeshStandardMaterial({ color: '#3fae7a', emissive: '#155a3a', emissiveIntensity: 0.6 }), 0, 0.45, 0)),
};
const DROP_COLORS = { ambar: '#ffb347', ferrao: '#c9702a', alga: '#3fae7a', cinza: '#7a7470', pele: '#e8eef5', presa: '#efe6d0', quitina: '#8aa04a', po_prisma: '#c59bff', escama: '#7fe08a', luz: '#fff6b0' };
export function makeNode(item, lookName) {
  if (NODES[item]) return NODES[item]();
  if (lookName && NODES[lookName]) return NODES[lookName]();
  return gem(DROP_COLORS[item] ?? '#ffd76a');
}

// ---------------------------------------------------------------- quest objects
// returns { root, done(bool) }
const rockGeo = (seed) => { const k = `rock${seed}`; if (!cache.has(k)) cache.set(k, boulder(seed)); return cache.get(k); };
const blobGeo = (seed, amp = 0.25, flatten = 1) => { const k = `blob${seed},${amp},${flatten}`; if (!cache.has(k)) cache.set(k, lumpy({ detail: 2, amp, seed, flatten })); return cache.get(k); };
const lathe = (pts, seg = 20) => new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r, y)), seg);
const steamMat = () => mat('#eef4f6', { transparent: true, opacity: 0.55, depthWrite: false });
// a ring of rounded stones (wells, vents, springs)
const stoneRing = (r, n, c, s = 0.5) => group(Array.from({ length: n }, (_, k) => { const a = (k / n) * Math.PI * 2; return scaled(mesh(rockGeo(k % 4), mat(c), Math.cos(a) * r, s * 0.35, Math.sin(a) * r, 0, a, 0), s * 1.1, s * 0.8, s); }));
// puffs of smoke or steam rising in a column
const puffs = (m, y, n = 4, s = 0.7) => group(Array.from({ length: n }, (_, k) => scaled(mesh(blobGeo(k + 20, 0.3), m, Math.sin(k * 2.3) * 0.25 * k, y + k * s * 1.3, Math.cos(k * 1.7) * 0.2 * k), s * (1 + k * 0.35), s * (0.85 + k * 0.3), s * (1 + k * 0.35))));
// a jagged glowing seam from bottom to top (lava cracks)
const seam = (h, w, m, r = 0.12) => mesh(taperTube(Array.from({ length: 7 }, (_, k) => [(k % 2 ? 1 : -1) * w * (0.4 + (k % 3) * 0.2), (k / 6) * h, 0]), r, r * 0.4, 6, 24), m);
const footprints = (c) => group([0, 1, 2, 3, 4].map((k) => group(
  scaled(mesh(new THREE.CircleGeometry(0.3, 14), mat(c, { polygonOffset: true, polygonOffsetFactor: -4 }), k * 0.9 - 1.8, 0.06, (k % 2) * 0.6 - 0.3, -Math.PI / 2), 0.8, 1.2, 1),
  ...[-1, 0, 1].map((t) => mesh(new THREE.CircleGeometry(0.09, 10), mat(c, { polygonOffset: true, polygonOffsetFactor: -4 }), k * 0.9 - 1.8 + t * 0.14, 0.06, (k % 2) * 0.6 - 0.3 - 0.42, -Math.PI / 2)))));
const rubble = (c, n = 6) => group(Array.from({ length: n }, (_, k) => scaled(mesh(rockGeo(k % 5), mat(c), Math.cos(k * 2.1) * 0.9, 0.3 + (k % 2) * 0.5, Math.sin(k * 2.1) * 0.9, 0, k, 0), 0.7 + (k % 3) * 0.2, 0.6 + (k % 2) * 0.2, 0.7 + (k % 3) * 0.15)));
const water = () => new THREE.MeshStandardMaterial({ color: '#3a8fb0', roughness: 0.05, emissive: '#0f3a55', emissiveIntensity: 0.7 });
const gemGeo = () => { if (!cache.has('gem')) cache.set('gem', mergeGeometries([facet(new THREE.CylinderGeometry(0.8, 0.9, 0.72, 6).translate(0, 0.36, 0)), facet(new THREE.ConeGeometry(0.8, 0.32, 6).translate(0, 0.88, 0))].map((g) => { g.deleteAttribute('uv'); return g; }))); return cache.get('gem'); };
// a cluster of gems: one tall in the middle, smaller ones leaning out
const gemCluster = (m, h, w = 0.5) => group(scaled(mesh(gemGeo(), m), w, h, w),
  ...[0, 1, 2, 3].map((k) => { const a = k * 1.7; const o = scaled(mesh(gemGeo(), m, Math.cos(a) * w * 0.9, -0.05, Math.sin(a) * w * 0.9, Math.sin(a) * 0.6, k, -Math.cos(a) * 0.6), w * 0.55, h * (0.3 + (k % 2) * 0.15), w * 0.55); return o; }));
const wood = () => mat('#6a4a2a'), darkWood = () => mat('#4a3420'), iron = () => mat('#4a4a50', { metalness: 0.6, roughness: 0.4 });
const rope = () => mat('#c9b07a');
// a log between two points, with rope lashings
const logBetween = (a, b, r, m = wood()) => { const d = new THREE.Vector3().subVectors(b, a), o = new THREE.Mesh(new THREE.CapsuleGeometry(r, d.length(), 4, 10), m); o.position.copy(a).addScaledVector(d, 0.5); o.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize()); o.castShadow = true; return o; };
const V3 = (x, y, z) => new THREE.Vector3(x, y, z);

const OBJECTS = {
  spring: () => ({ always: [stoneRing(1.45, 11, '#7d7a70', 0.55), scaled(mesh(blobGeo(3, 0.2, 0.4), mat('#5a8a3a'), 1.3, 0.35, 0.6), 0.5, 0.5, 0.5)], before: [mesh(new THREE.CircleGeometry(1.25, 24), mat('#5a5a3a', { roughness: 0.2 }), 0, 0.12, 0, -Math.PI / 2), scaled(mesh(blobGeo(8, 0.3, 0.5), mat('#4a4232'), 0.2, 0.2, -0.1), 0.7, 0.5, 0.6)], after: [mesh(new THREE.CircleGeometry(1.25, 24), water(), 0, 0.14, 0, -Math.PI / 2), mesh(new THREE.TorusGeometry(0.5, 0.03, 6, 24), glow('#bff6ff', 1.3), 0, 0.17, 0, Math.PI / 2)] }),
  tracks: () => ({ always: [footprints('#2a2018')], before: [], after: [] }),
  tracksRed: () => ({ always: [footprints('#6a2a1a')], before: [mesh(lathe([[0, 0], [0.16, 0.12], [0.12, 0.35], [0.04, 0.55], [0, 0.6]], 10), glow('#ff6a2a', 1.2), 0, 0, 0)], after: [] }),
  rescue: () => ({ always: [], before: [rubble('#4a3a30')], after: [mesh(new THREE.TorusGeometry(0.9, 0.06, 6, 24), glow('#7fe08a', 1.4), 0, 0.05, 0, Math.PI / 2)] }),
  web: () => {
    const post = (x) => group(mesh(taperTube([[x, 0, 0], [x * 1.02, 1.5, 0.05], [x * 0.98, 3.1, 0]], 0.17, 0.1, 8, 8), darkWood()), scaled(mesh(blobGeo(4, 0.2), mat('#4f7a35'), x, 0.1, 0), 0.4, 0.25, 0.4));
    const silk = mat('#f4f0e6', { roughness: 0.3, emissive: '#ffffff', emissiveIntensity: 0.15 });
    const strands = [];
    for (let k = 0; k < 8; k++) { const a = (k / 8) * Math.PI * 2; strands.push(mesh(new THREE.CylinderGeometry(0.02, 0.02, 1.3, 4), silk, Math.cos(a) * 0.65, 1.6 + Math.sin(a) * 0.65, 0, 0, 0, a - Math.PI / 2)); }
    for (const r of [0.35, 0.75, 1.15]) strands.push(mesh(new THREE.TorusGeometry(r, 0.018, 4, 8), silk, 0, 1.6, 0, 0, 0, Math.PI / 8));
    return { always: [post(-1.4), post(1.4)], before: [], after: [group(strands)] };
  },
  canal: () => ({ always: [mesh(new RoundedBoxGeometry(4, 0.35, 0.3, 2, 0.1), mat('#7d7468'), 0, 0.17, 0.62), mesh(new RoundedBoxGeometry(4, 0.35, 0.3, 2, 0.1), mat('#7d7468'), 0, 0.17, -0.62), mesh(new RoundedBoxGeometry(4, 0.12, 1.4, 2, 0.05), mat('#5a4a3a'), 0, 0.06, 0)], before: [scaled(mesh(blobGeo(6, 0.3, 0.3), new THREE.MeshStandardMaterial({ color: '#4a5a1a', emissive: '#3a5a0a', emissiveIntensity: 0.5 }), 0, 0.25, 0), 1.8, 0.4, 0.5)], after: [mesh(new RoundedBoxGeometry(3.8, 0.12, 0.95, 2, 0.05), water(), 0, 0.26, 0)] }),
  barrel: () => ({ always: [makeBarrel()], before: [mesh(new THREE.CircleGeometry(0.42, 16), new THREE.MeshStandardMaterial({ color: '#3a8fb0', emissive: '#0f3a55', emissiveIntensity: 0.8 }), 0, 1.07, 0, -Math.PI / 2)], after: [] }),
  sand: () => ({ always: [stoneRing(1.3, 10, '#8d8576', 0.6)], before: [scaled(mesh(blobGeo(5, 0.15, 0.5), mat('#d8a868'), 0, 0.3, 0), 1.2, 0.9, 1.2)], after: [mesh(new THREE.CircleGeometry(1.05, 20), water(), 0, 0.35, 0, -Math.PI / 2)] }),
  valve: () => {
    const pipe = mat('#6a6a6e', { metalness: 0.5, roughness: 0.4 });
    const wheel = (m) => group(mesh(new THREE.TorusGeometry(0.5, 0.06, 8, 24), m, 0, 0, 0), ...[0, 1, 2].map((k) => mesh(new THREE.CylinderGeometry(0.035, 0.035, 1, 6), m, 0, 0, 0, 0, 0, (k / 3) * Math.PI)), mesh(new THREE.SphereGeometry(0.1, 10, 8), m));
    const w0 = wheel(mat('#a83a2a', { metalness: 0.4, roughness: 0.5 })), w1 = wheel(glow('#7fe3ff', 1.3));
    for (const w of [w0, w1]) { w.position.set(0, 1.25, -0.28); }
    return {
      always: [mesh(new THREE.TorusGeometry(0.6, 0.16, 10, 16, Math.PI / 2), pipe, -0.6, 0.45, 0, 0, 0, -Math.PI / 2), mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.6, 14), pipe, 0, 0.75, 0),
        mesh(new THREE.SphereGeometry(0.3, 16, 12), pipe, 0, 1.1, 0), ...[0.45, 1.35].map((y) => mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.08, 14), iron(), 0, y, 0)), mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.35, 8), iron(), 0, 1.2, -0.15, Math.PI / 2, 0, 0),
        scaled(mesh(rockGeo(2), mat('#7d7a70'), -0.9, 0.1, 0.2), 0.5, 0.35, 0.5)],
      before: [w0], after: [w1],
    };
  },
  sample: () => {
    const glass = mat('#d8f0f4', { transparent: true, opacity: 0.45, roughness: 0.05 });
    const vial = (m) => group(mesh(new THREE.CapsuleGeometry(0.13, 0.5, 4, 12), glass, 0, 1.3, 0), mesh(new THREE.CapsuleGeometry(0.1, 0.25, 4, 12), m, 0, 1.2, 0), mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.1, 12), mat('#8a5a2a'), 0, 1.65, 0));
    return {
      always: [mesh(lathe([[0, 0], [0.75, 0], [0.8, 0.1], [0.6, 0.25], [0.55, 0.7], [0.62, 0.8], [0, 0.82]], 18), mat('#6a5a4a'), 0, 0, 0),
        mesh(new THREE.TorusGeometry(0.45, 0.03, 6, 20), mat('#3a3a3a', { metalness: 0.6 }), 0, 0.83, 0, Math.PI / 2), ...[-1, 1].map((s) => mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.7, 6), iron(), s * 0.2, 1.15, 0))],
      before: [vial(glow('#9a9a5a', 1))], after: [vial(glow('#7fe08a', 1.4))],
    };
  },
  station: () => {
    const wall = mat('#c9b48a'), trim = mat('#6a4a2a'), roof = mat('#4f7a6a');
    const roofSide = (s) => mesh(new RoundedBoxGeometry(4.8, 0.2, 2.4, 2, 0.08), roof, 0, 3.2, s * 1.0, s * 0.62, 0, 0);
    return {
      always: [mesh(new RoundedBoxGeometry(4, 2.6, 3.4, 3, 0.18), wall, 0, 1.3, 0), mesh(new RoundedBoxGeometry(4.2, 0.3, 3.6, 2, 0.1), trim, 0, 0.15, 0),
        roofSide(1), roofSide(-1), mesh(new THREE.CylinderGeometry(0.12, 0.12, 4.9, 10), trim, 0, 3.9, 0, 0, 0, Math.PI / 2),
        // gable ends
        ...[-1, 1].map((s) => mesh(gable(), wall, s * 1.95 - 0.075, 2.6, 0, 0, Math.PI / 2, 0)),
        mesh(new RoundedBoxGeometry(1, 1.8, 0.15, 2, 0.06), trim, 0, 0.95, 1.72), mesh(new THREE.SphereGeometry(0.05, 8, 6), mat('#d9a531', { metalness: 0.7 }), 0.35, 0.95, 1.82),
        ...[-1, 1].map((s) => mesh(new THREE.CircleGeometry(0.32, 18), glow('#ffd88a', 1.2), s * 1.3, 1.6, 1.71)), ...[-1, 1].map((s) => mesh(new THREE.TorusGeometry(0.34, 0.05, 6, 18), trim, s * 1.3, 1.6, 1.72)),
        mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.4, 6), iron(), 1.4, 4.4, -0.6), mesh(new THREE.ConeGeometry(0.25, 0.3, 12, 1, true), iron(), 1.4, 5.1, -0.6, Math.PI, 0, 0), makeCrateAt(-2.5, 0, 1.2)],
      before: [], after: [mesh(new THREE.SphereGeometry(0.22, 12, 10), glow('#7fe08a', 1.6), 1.4, 5.25, -0.6)],
    };
  },
  algae: () => {
    const kelp = (m) => group(Array.from({ length: 5 }, (_, k) => { const a = k * 1.3, x = Math.cos(a) * 0.7, z = Math.sin(a) * 0.7, h = 1.2 + (k % 3) * 0.4; return mesh(taperTube([[x, 0, z], [x + 0.15, h * 0.4, z], [x - 0.1, h * 0.75, z + 0.1], [x + 0.1, h, z]], 0.12, 0.03, 6, 10), m); }));
    return { always: [], before: [kelp(mat('#2a5a3a')), scaled(mesh(blobGeo(9, 0.3, 0.4), mat('#3a4a2a'), 0, 0.1, 0), 1, 0.5, 1)], after: [mesh(new THREE.TorusGeometry(0.9, 0.06, 6, 24), glow('#7fe3ff', 1.3), 0, 0.05, 0, Math.PI / 2)] };
  },
  crack: () => {
    const rock = mat('#2e2a2c');
    const wallL = scaled(mesh(rockGeo(7), rock, 0, 1.2, -1.15), 0.7, 1.45, 1.2), wallR = scaled(mesh(rockGeo(8), rock, 0, 1.2, 1.15), 0.7, 1.4, 1.2);
    return {
      always: [wallL, wallR, scaled(mesh(rockGeo(9), rock, 0, 2.3, 0), 0.6, 0.5, 0.9)],
      before: [group(seam(2.2, 0.15, glow('#ff4a1a', 1.8), 0.14), scaled(mesh(blobGeo(10, 0.3, 0.5), glow('#ffb347', 1.6), 0, 0.08, 0), 0.4, 0.3, 0.5))],
      after: [seam(2.2, 0.15, mat('#5a5658'), 0.18), mesh(gemGeo(), glow('#7fe08a', 1.4), 0, 2.65, 0, 0, 0, 0)].map((o, k) => (k ? scaled(o, 0.18, 0.5, 0.18) : o)),
    };
  },
  chimney: () => {
    const stack = mat('#3a3330'), band = mat('#5a504a');
    return {
      always: [mesh(lathe([[0, 0], [1.8, 0], [1.75, 0.5], [1.35, 1.2], [1.15, 3], [1.0, 6.5], [1.15, 7.4], [1.2, 8], [0.85, 8], [0.85, 7.6], [0, 7.6]], 22), stack),
        ...[2.4, 4.5, 6.6].map((y) => mesh(new THREE.TorusGeometry(1.12 - y * 0.02, 0.12, 8, 28), band, 0, y, 0, Math.PI / 2)),
        ...[0, 1, 2, 3, 4].map((k) => { const a = k * 1.26; return scaled(mesh(rockGeo(k), mat('#4a4240'), Math.cos(a) * 1.8, 0.3, Math.sin(a) * 1.8, 0, a, 0), 0.6, 0.45, 0.5); })],
      before: [group(mesh(lathe([[0, 0], [0.7, 0.3], [0.55, 1.1], [0.25, 2.0], [0, 2.4]], 14), glow('#ff8a3a', 1.2), 0, 7.9, 0), mesh(lathe([[0, 0], [0.4, 0.25], [0.3, 0.9], [0, 1.5]], 12), glow('#ffd76a', 1.8), 0, 7.9, 0), puffs(mat('#3a3434'), 10.6, 3, 0.8))],
      after: [puffs(steamMat(), 8.6, 4, 0.7)],
    };
  },
  forge: () => {
    const brick = mat('#5a3f34'), stone = mat('#3a3330');
    return {
      always: [mesh(lathe([[0, 0], [1.3, 0], [1.3, 0.5], [1.15, 1.0], [0.8, 1.45], [0.3, 1.65], [0, 1.68]], 20), brick),
        mesh(new THREE.TorusGeometry(1.3, 0.12, 8, 28), stone, 0, 0.1, 0, Math.PI / 2), mesh(new THREE.TorusGeometry(0.52, 0.12, 8, 16, Math.PI), stone, 0, 0.55, -1.27, 0, 0, 0),
        mesh(new THREE.CylinderGeometry(0.28, 0.34, 1.4, 12), stone, 0.25, 2.2, 0.25), mesh(new THREE.TorusGeometry(0.3, 0.07, 6, 14), band2(), 0.25, 2.9, 0.25, Math.PI / 2),
        mesh(new RoundedBoxGeometry(0.6, 0.3, 0.32, 2, 0.06), iron(), 1.6, 0.75, -0.5), mesh(new THREE.CylinderGeometry(0.16, 0.22, 0.6, 10), darkWood(), 1.6, 0.3, -0.5), mesh(new THREE.ConeGeometry(0.11, 0.3, 10), iron(), 1.98, 0.78, -0.5, 0, 0, Math.PI / 2)],
      before: [group(mesh(new THREE.CircleGeometry(0.5, 16, 0, Math.PI), glow('#ff7a1a', 1.8), 0, 0.55, -1.3, 0, Math.PI, 0), mesh(new THREE.PlaneGeometry(1.0, 0.45), glow('#ff7a1a', 1.8), 0, 0.33, -1.3, 0, Math.PI, 0), mesh(lathe([[0, 0], [0.3, 0.2], [0.2, 0.7], [0, 1.1]], 12), glow('#ffb347', 1.8), 0.25, 2.9, 0.25))],
      after: [group(mesh(new THREE.CircleGeometry(0.5, 16, 0, Math.PI), mat('#1a1414'), 0, 0.55, -1.3, 0, Math.PI, 0), mesh(new THREE.PlaneGeometry(1.0, 0.45), mat('#1a1414'), 0, 0.33, -1.3, 0, Math.PI, 0))],
    };
  },
  tower: () => {
    const stone = mat('#9aa8b8'), cap = mat('#5a7a9a');
    return {
      always: [mesh(lathe([[0, 0], [1.8, 0], [1.6, 0.6], [1.35, 2], [1.15, 8.6], [1.45, 8.8], [1.45, 9.4], [0, 9.4]], 20), stone),
        ...Array.from({ length: 8 }, (_, k) => { const a = (k / 8) * Math.PI * 2; return mesh(new RoundedBoxGeometry(0.5, 0.55, 0.35, 2, 0.08), stone, Math.cos(a) * 1.3, 9.65, Math.sin(a) * 1.3, 0, -a, 0); }),
        ...[3.5, 6.2].map((y) => mesh(new THREE.CircleGeometry(0.28, 14, 0, Math.PI), glow('#ffd88a', 1.1), 0, y, 1.26)), ...[3.5, 6.2].map((y) => mesh(new THREE.PlaneGeometry(0.56, 0.4), glow('#ffd88a', 1.1), 0, y - 0.2, 1.26)),
        mesh(new THREE.TorusGeometry(1.3, 0.1, 8, 28), cap, 0, 2, 0, Math.PI / 2), mesh(new THREE.TorusGeometry(1.18, 0.1, 8, 28), cap, 0, 8.6, 0, Math.PI / 2)],
      before: [scaled(mesh(blobGeo(11, 0.3), mat('#cfeaff', { transparent: true, opacity: 0.85, roughness: 0.1 }), 0, 1.2, 0), 2.3, 1.6, 2.3), ...[0, 1, 2].map((k) => scaled(mesh(gemGeo(), mat('#e8f6ff', { transparent: true, opacity: 0.85, roughness: 0.1 }), Math.cos(k * 2.1) * 1.8, 0.5, Math.sin(k * 2.1) * 1.8, Math.sin(k * 2.1) * 0.5, 0, -Math.cos(k * 2.1) * 0.5), 0.5, 2, 0.5))],
      after: [mesh(new THREE.TorusGeometry(1.2, 0.08, 6, 24), glow('#7fe3ff', 1.2), 0, 10.2, 0, Math.PI / 2), mesh(new THREE.SphereGeometry(0.4, 14, 10), glow('#bff6ff', 1.6), 0, 10.3, 0)],
    };
  },
  icePlate: () => ({ always: [], before: [scaled(mesh(blobGeo(12, 0.2, 0.25), mat('#d8f0ff', { transparent: true, opacity: 0.85, roughness: 0.1 }), 0, 0.2, 0), 1.7, 1, 1.7), ...[0, 1, 2].map((k) => scaled(mesh(gemGeo(), mat('#eef8ff', { roughness: 0.1 }), Math.cos(k * 2) * 0.8, 0.3, Math.sin(k * 2) * 0.8, 0.3, k, 0.2), 0.25, 0.8, 0.25))], after: [mesh(new THREE.CircleGeometry(1.3, 20), water(), 0, 0.06, 0, -Math.PI / 2)] }),
  root: () => ({ always: [], before: [mesh(taperTube([[-3, 0.3, 0.4], [-1.5, 0.9, 0], [0, 0.7, -0.3], [1.5, 1.0, 0.2], [3, 0.3, 0]], 0.6, 0.35, 10, 20), mat('#4a3a1a')), scaled(mesh(blobGeo(13, 0.3, 0.5), mat('#4f7a35'), -0.5, 1.3, 0), 0.7, 0.35, 0.5)], after: [mesh(lathe([[0, 0], [0.85, 0], [0.75, 0.2], [0.65, 0.5], [0, 0.5]], 16), mat('#6a5a3a')), mesh(new THREE.CircleGeometry(0.62, 16), mat('#c9a870'), 0, 0.51, 0, -Math.PI / 2)] }),
  logs: () => ({ always: [], before: [group([0, 1, 2, 3].map((k) => mesh(new THREE.CapsuleGeometry(0.38, 3.4, 4, 12), mat(k % 2 ? '#5a4228' : '#6a4e30'), 0, 0.38 + k * 0.55, 0, Math.PI / 2, k * 0.7, 0)))], after: [] }),
  bones: () => {
    const bone = mat('#e8e2d0', { roughness: 0.5 });
    const b = (x, z, ry) => group(mesh(new THREE.CapsuleGeometry(0.09, 1.1, 4, 8), bone, x, 0.12, z, Math.PI / 2, ry, 0), ...[-1, 1].map((s) => mesh(new THREE.SphereGeometry(0.15, 10, 8), bone, x + Math.sin(ry) * 0.65 * s, 0.14, z + Math.cos(ry) * 0.65 * s)));
    return { always: [group([0, 1, 2, 3, 4].map((k) => b(Math.cos(k * 1.3) * 1.2, Math.sin(k * 1.3) * 1.2, k))), scaled(mesh(new THREE.SphereGeometry(0.35, 14, 10), bone, 0.2, 0.25, 0.1), 1, 0.8, 1.2)], before: [], after: [] };
  },
  sporeFocus: () => {
    const pod = new THREE.MeshStandardMaterial({ color: '#6a7a2a', emissive: '#a8ff5a', emissiveIntensity: 0.8 });
    return {
      always: [],
      before: [group(...[0, 1, 2, 3].map((k) => scaled(mesh(blobGeo(14 + k, 0.25), pod, Math.cos(k * 2) * 0.7, 0.45 + (k === 3 ? 0.5 : 0), Math.sin(k * 2) * 0.7), 0.6 - k * 0.08, 0.55 - k * 0.06, 0.6 - k * 0.08)),
        ...[0, 1, 2, 3, 4, 5].map((k) => { const a = k * 1.05; return mesh(new THREE.SphereGeometry(0.1, 8, 6), pod, Math.cos(a) * 0.35, 0.9 + (k % 2) * 0.25, Math.sin(a) * 0.35); }),
        ...[0, 1, 2].map((k) => { const a = k * 2.1 + 0.5; return group(mesh(new THREE.CylinderGeometry(0.06, 0.08, 0.6, 8), mat('#cfc6a8'), Math.cos(a) * 1.2, 0.3, Math.sin(a) * 1.2), mesh(new THREE.SphereGeometry(0.25, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2), mat('#8a6a4a'), Math.cos(a) * 1.2, 0.58, Math.sin(a) * 1.2)); }))],
      after: [mesh(new THREE.CircleGeometry(1.1, 16), mat('#3a2a1a'), 0, 0.05, 0, -Math.PI / 2), ...[0, 1, 2].map((k) => mesh(new THREE.ConeGeometry(0.06, 0.3, 6), mat('#7fd16a'), Math.cos(k * 2) * 0.4, 0.15, Math.sin(k * 2) * 0.4))],
    };
  },
  vent: () => ({ always: [stoneRing(1.05, 9, '#5a5a4a', 0.55)], before: [mesh(new THREE.CircleGeometry(0.9, 16), mat('#2a2a1a'), 0, 0.3, 0, -Math.PI / 2), scaled(mesh(blobGeo(16, 0.3, 0.5), mat('#3a3a2a'), 0, 0.35, 0), 0.6, 0.4, 0.6)], after: [puffs(steamMat(), 1.0, 4, 0.6)] }),
  crystal: () => ({ always: [gemCluster(new THREE.MeshStandardMaterial({ color: '#8a6ab0', emissive: '#c59bff', emissiveIntensity: 0.25, roughness: 0.1 }), 2.4, 0.55), scaled(mesh(rockGeo(3), mat('#3a3150'), 0, 0.05, 0), 0.9, 0.35, 0.9)], before: [], after: [mesh(new THREE.OctahedronGeometry(0.35, 0), glow('#e6d6ff', 2), 0, 2.9, 0)] }),
  crystalDark: () => ({ always: [scaled(mesh(rockGeo(4), mat('#2a2438'), 0, 0.05, 0), 0.9, 0.35, 0.9)], before: [gemCluster(new THREE.MeshStandardMaterial({ color: '#2a1a3a', emissive: '#ff3a8a', emissiveIntensity: 0.6, roughness: 0.1 }), 2.6, 0.6)], after: [scaled(mesh(gemGeo(), mat('#3a3a4a')), 0.6, 0.6, 0.6)] }),
  mirror: () => {
    const metal = mat('#8a8a9a', { metalness: 0.6, roughness: 0.35 }), gold = mat('#d9a531', { metalness: 0.8, roughness: 0.3 });
    const disk = (m, tilt) => group(mesh(new THREE.CylinderGeometry(0.7, 0.7, 0.06, 28), m, 0, 0, 0, Math.PI / 2, 0, 0), mesh(new THREE.TorusGeometry(0.72, 0.06, 8, 32), gold)).rotateX(tilt).translateY(0);
    const d0 = disk(mat('#4a4a5a', { metalness: 0.6, roughness: 0.4 }), 0), d1 = disk(new THREE.MeshBasicMaterial({ color: new THREE.Color('#e6d6ff').multiplyScalar(1.6) }), -0.5);
    d0.position.y = d1.position.y = 2.3;
    return {
      always: [mesh(lathe([[0, 0], [0.5, 0], [0.45, 0.15], [0.15, 0.3], [0, 0.3]], 16), metal), mesh(new THREE.CylinderGeometry(0.08, 0.1, 1.6, 10), metal, 0, 1.0, 0), mesh(new THREE.TorusGeometry(0.82, 0.05, 6, 20, Math.PI), metal, 0, 2.3, 0, 0, 0, Math.PI)],
      before: [d0], after: [d1],
    };
  },
  brace: () => ({ always: [], before: [logBetween(V3(-1.2, 0.18, 0), V3(1.2, 0.18, 0.1), 0.16)],
    after: [logBetween(V3(-1.1, 0, 0), V3(0.2, 2.8, 0), 0.17), logBetween(V3(1.1, 0, 0), V3(-0.2, 2.8, 0), 0.17), ...[1.0, 2.3].map((y) => mesh(new THREE.TorusGeometry(0.26, 0.05, 6, 14), rope(), 0, y + 0.3, 0, Math.PI / 2)), mesh(new THREE.TorusGeometry(0.3, 0.06, 6, 12), mat('#3f7a2a'), 0, 2.6, 0)] }),
  sail: () => {
    const cloth = mat('#f4f0e2', { side: THREE.DoubleSide });
    const sheet = (() => { const g = new THREE.PlaneGeometry(2.2, 2.8, 10, 6), p = g.attributes.position; for (let i = 0; i < p.count; i++) { const u = (p.getX(i) + 1.1) / 2.2, v = (p.getY(i) + 1.4) / 2.8; p.setZ(i, Math.sin(u * Math.PI) * (0.5 - Math.abs(v - 0.5) * 0.4)); } g.computeVertexNormals(); return g; })();
    return {
      always: [mesh(taperTube([[0, 0, 0], [0, 2, 0], [0, 4.2, 0]], 0.13, 0.08, 8, 6), wood(), 0, 0, 0), mesh(new THREE.CylinderGeometry(0.06, 0.06, 2.3, 8), wood(), 1.1, 1.0, 0, 0, 0, Math.PI / 2), scaled(mesh(rockGeo(5), mat('#7d7a70'), 0, 0.1, 0), 0.5, 0.3, 0.5)],
      before: [mesh(new THREE.CapsuleGeometry(0.2, 1.8, 4, 10), cloth, 1.1, 1.22, 0, 0, 0, Math.PI / 2), ...[0.5, 1.6].map((x) => mesh(new THREE.TorusGeometry(0.21, 0.03, 6, 12), rope(), x, 1.22, 0, 0, Math.PI / 2, 0))],
      after: [mesh(sheet, cloth, 1.1, 2.45, 0), mesh(new THREE.ConeGeometry(0.2, 0.7, 3), mat('#e04a3a', { side: THREE.DoubleSide }), 0.3, 4.1, 0, 0, 0, -Math.PI / 2)],
    };
  },
  flower: () => ({ always: [mesh(taperTube([[0, 0, 0], [0.08, 0.8, 0], [0, 1.6, 0]], 0.12, 0.07, 6, 8), mat('#3f7a2a')), ...[-1, 1].map((s) => scaled(mesh(new THREE.SphereGeometry(0.3, 10, 8), mat('#4f8a35'), s * 0.25, 0.5 + (s > 0 ? 0.25 : 0), 0, 0, 0, s * -0.5), 1, 0.25, 0.5))], before: [scaled(mesh(new THREE.SphereGeometry(0.4, 14, 10), mat('#8a6a4a'), 0, 1.75, 0), 0.8, 1.1, 0.8), ...[0, 1, 2, 3].map((k) => scaled(mesh(new THREE.SphereGeometry(0.4, 10, 8), mat('#4f8a35'), Math.cos(k * 1.57) * 0.14, 1.6, Math.sin(k * 1.57) * 0.14, Math.sin(k * 1.57) * 0.4, 0, -Math.cos(k * 1.57) * 0.4), 0.35, 0.9, 0.35))], after: [group([0, 1, 2, 3, 4, 5].map((k) => scaled(mesh(new THREE.SphereGeometry(0.4, 12, 8), mat('#ff9ad0', { emissive: '#ff6ab0', emissiveIntensity: 0.4 }), Math.cos(k * 1.05) * 0.5, 1.8, Math.sin(k * 1.05) * 0.5, 0, -k * 1.05, 0.3), 1, 0.3, 0.6))), mesh(new THREE.SphereGeometry(0.22, 12, 10), glow('#ffd76a', 1.6), 0, 1.85, 0)] }),
};
function gable() { if (!cache.has('gable')) { const sh = new THREE.Shape(); sh.moveTo(-1.7, 0); sh.lineTo(1.7, 0); sh.lineTo(0, 1.25); sh.lineTo(-1.7, 0); cache.set('gable', new THREE.ExtrudeGeometry(sh, { depth: 0.15, bevelEnabled: false })); } return cache.get('gable'); }
function band2() { return mat('#6a5a50'); }
function makeCrateAt(x, y, z) { const c = makeCrate(); c.position.set(x, y, z); c.rotation.y = 0.4; return c; }
OBJECTS.crate = () => ({ always: [], before: [makeCrate(), (() => { const c = makeCrate(); c.position.set(0.5, 0.7, 0.1); c.rotation.y = 0.5; c.scale.setScalar(0.8); return c; })()], after: [mesh(new THREE.TorusGeometry(0.9, 0.05, 6, 24), glow('#7fe08a', 1.4), 0, 0.05, 0, Math.PI / 2)] });
OBJECTS.lantern = () => { const l = makeLantern(); const off = new THREE.Group(), on = new THREE.Group(); return { always: [l.root], before: [off], after: [on], lit: l.lit }; };
export function makeObject(look) {
  const def = (OBJECTS[look] ?? OBJECTS.sample)();
  const root = group(...def.always, ...def.before, ...def.after);
  const done = (v) => { def.before.forEach((o) => { o.visible = !v; }); def.after.forEach((o) => { o.visible = v; }); def.lit?.(v); };
  done(false);
  return { root, done };
}

// ---------------------------------------------------------------- the camp's workbench
export const makeWorkbench = detailedBench;

// ---------------------------------------------------------------- treasure chests
// a chest with gold trim and a glowing seam, and a faint column of light that can be seen from
// afar (it pulls the explorer off the trail). open(true) lifts the lid and puts the light out.
export function makeChest() {
  const { root, lid } = makeChestModel();
  const seam = mesh(new THREE.BoxGeometry(1.18, 0.05, 0.78), glow('#ffd76a', 2.2), 0, 0.63, 0);
  const beamMat = new THREE.MeshBasicMaterial({ color: '#ffd76a', transparent: true, opacity: 0.18, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
  const beam = mesh(new THREE.CylinderGeometry(0.25, 0.6, 14, 16, 1, true), beamMat, 0, 7, 0);
  beam.castShadow = false;
  root.add(seam, beam);
  return {
    root,
    open(v) { lid.rotation.x = v ? -1.9 : 0; seam.visible = !v; beam.visible = !v; },
    pulse(t) { beamMat.opacity = 0.12 + Math.sin(t * 2) * 0.06; },
  };
}

// What the campaign's things look like: resource nodes (one look per material), the quest
// objects of each region (springs, valves, chimneys, crystals...), workbenches and camps.
// Each quest object has parts that are always there, parts that go away once it is done
// (rubble, ice, blockages) and parts that appear once done (a woven web, a raised sail).
// Built from primitives, shared materials, no textures.
import * as THREE from 'three';

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
const gem = (c) => group(mesh(new THREE.OctahedronGeometry(0.32, 0), new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: 0.8, flatShading: true }), 0, 0.45, 0));
const NODES = {
  log: () => group(mesh(new THREE.CylinderGeometry(0.28, 0.32, 1.6, 7), mat('#6a4a2a'), 0, 0.3, 0, 0, 0, Math.PI / 2)),
  fiber: () => group([0, 1, 2, 3].map((k) => mesh(new THREE.ConeGeometry(0.06, 0.9, 4), mat('#c9b07a'), Math.cos(k * 1.6) * 0.15, 0.45, Math.sin(k * 1.6) * 0.15, (k - 1.5) * 0.15, 0, 0))),
  plate: () => group(mesh(new THREE.BoxGeometry(0.9, 0.12, 0.7), mat('#a8642a', { flatShading: true }), 0, 0.1, 0, 0, 0.4, 0.15)),
  resin: () => group(mesh(new THREE.SphereGeometry(0.3, 12, 10), glow('#ffb347', 1.3), 0, 0.4, 0)),
  coral: () => group([0, 1, 2].map((k) => mesh(new THREE.ConeGeometry(0.1, 0.9, 5), mat('#ff8a7a', { emissive: '#5a1a1a', emissiveIntensity: 0.4 }), (k - 1) * 0.2, 0.45, 0, 0, 0, (k - 1) * 0.4))),
  shell: () => group(scaled(mesh(new THREE.SphereGeometry(0.3, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), mat('#f0e8da', { roughness: 0.3 }), 0, 0.02, 0), 1, 0.7, 1.3)),
  obsidian: () => group(mesh(new THREE.DodecahedronGeometry(0.42, 0), mat('#151218', { roughness: 0.15, metalness: 0.3, flatShading: true }), 0, 0.35, 0)),
  ore: () => group(mesh(new THREE.DodecahedronGeometry(0.42, 0), new THREE.MeshStandardMaterial({ color: '#5a3a2a', emissive: '#ff6a1a', emissiveIntensity: 0.7, flatShading: true }), 0, 0.38, 0)),
  ice: () => group(mesh(new THREE.OctahedronGeometry(0.45, 0), mat('#cfeaff', { roughness: 0.05, transparent: true, opacity: 0.85 }), 0, 0.45, 0)),
  lichen: () => group(mesh(new THREE.CircleGeometry(0.5, 10), mat('#8ab0a0', { side: THREE.DoubleSide }), 0, 0.05, 0, -Math.PI / 2)),
  vine: () => group(mesh(new THREE.TorusGeometry(0.35, 0.07, 6, 14), mat('#3f7a2a'), 0, 0.12, 0, Math.PI / 2)),
  leaf: () => group(mesh(new THREE.ConeGeometry(0.5, 1.4, 4), mat('#4f8a3a', { flatShading: true }), 0, 0.15, 0, Math.PI / 2, 0.5, 0)),
  peat: () => group(mesh(new THREE.BoxGeometry(0.7, 0.35, 0.5), mat('#3a2a1a'), 0, 0.18, 0, 0, 0.3, 0)),
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
const footprints = (c) => group([0, 1, 2, 3, 4].map((k) => mesh(new THREE.CircleGeometry(0.4, 10), mat(c, { polygonOffset: true, polygonOffsetFactor: -4 }), k * 0.9 - 1.8, 0.06, (k % 2) * 0.6 - 0.3, -Math.PI / 2)));
const rubble = (c, n = 6) => group(Array.from({ length: n }, (_, k) => mesh(new THREE.DodecahedronGeometry(0.55 + (k % 3) * 0.15, 0), mat(c, { flatShading: true }), Math.cos(k * 2.1) * 0.9, 0.35 + (k % 2) * 0.6, Math.sin(k * 2.1) * 0.9)));
const OBJECTS = {
  spring: () => ({ always: [mesh(new THREE.TorusGeometry(1.4, 0.28, 6, 18), mat('#7d7a70', { flatShading: true }), 0, 0.15, 0, Math.PI / 2)], before: [mesh(new THREE.CircleGeometry(1.2, 18), mat('#5a5a3a', { roughness: 0.2 }), 0, 0.08, 0, -Math.PI / 2)], after: [mesh(new THREE.CircleGeometry(1.2, 18), new THREE.MeshStandardMaterial({ color: '#3a8fb0', roughness: 0.05, emissive: '#0f3a55', emissiveIntensity: 0.7 }), 0, 0.1, 0, -Math.PI / 2)] }),
  tracks: () => ({ always: [footprints('#2a2018')], before: [], after: [] }),
  tracksRed: () => ({ always: [footprints('#6a2a1a')], before: [mesh(new THREE.ConeGeometry(0.15, 0.6, 5), glow('#ff6a2a', 1.2), 0, 0.3, 0)], after: [] }),
  rescue: () => ({ always: [], before: [rubble('#4a3a30')], after: [mesh(new THREE.TorusGeometry(0.9, 0.06, 6, 20), glow('#7fe08a', 1.4), 0, 0.05, 0, Math.PI / 2)] }),
  web: () => ({ always: [mesh(new THREE.CylinderGeometry(0.12, 0.15, 3, 6), mat('#5a3a1a'), -1.4, 1.5, 0), mesh(new THREE.CylinderGeometry(0.12, 0.15, 3, 6), mat('#5a3a1a'), 1.4, 1.5, 0)], before: [], after: [mesh(new THREE.TorusGeometry(1.2, 0.08, 6, 6), mat('#8a6a3a'), 0, 1.5, 0), mesh(new THREE.TorusGeometry(0.6, 0.06, 6, 6), mat('#8a6a3a'), 0, 1.5, 0)] }),
  canal: () => ({ always: [mesh(new THREE.BoxGeometry(4, 0.3, 1.4), mat('#5a4a3a'), 0, 0.15, 0)], before: [mesh(new THREE.BoxGeometry(3.6, 0.2, 1), new THREE.MeshStandardMaterial({ color: '#4a5a1a', emissive: '#3a5a0a', emissiveIntensity: 0.5 }), 0, 0.32, 0)], after: [mesh(new THREE.BoxGeometry(3.6, 0.15, 1), new THREE.MeshStandardMaterial({ color: '#3a8fb0', emissive: '#0f3a55', emissiveIntensity: 0.7, roughness: 0.05 }), 0, 0.3, 0)] }),
  barrel: () => ({ always: [mesh(new THREE.CylinderGeometry(0.45, 0.5, 1, 10), mat('#7a5a3a'), 0, 0.5, 0)], before: [mesh(new THREE.CircleGeometry(0.42, 12), new THREE.MeshStandardMaterial({ color: '#3a8fb0', emissive: '#0f3a55', emissiveIntensity: 0.8 }), 0, 1.01, 0, -Math.PI / 2)], after: [] }),
  sand: () => ({ always: [mesh(new THREE.CylinderGeometry(1.2, 1.4, 0.6, 12), mat('#7d7a70', { flatShading: true }), 0, 0.3, 0)], before: [mesh(new THREE.SphereGeometry(1.1, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), mat('#d0a060', { flatShading: true }), 0, 0.55, 0)], after: [mesh(new THREE.CircleGeometry(1, 14), new THREE.MeshStandardMaterial({ color: '#3a8fb0', emissive: '#0f3a55', emissiveIntensity: 0.7 }), 0, 0.62, 0, -Math.PI / 2)] }),
  valve: () => ({ always: [mesh(new THREE.CylinderGeometry(0.15, 0.15, 1.2, 8), mat('#5a5a5a', { metalness: 0.6 }), 0, 0.6, 0)], before: [mesh(new THREE.TorusGeometry(0.5, 0.07, 6, 16), mat('#8a3a2a', { metalness: 0.5 }), 0, 1.25, 0)], after: [mesh(new THREE.TorusGeometry(0.5, 0.07, 6, 16), glow('#7fe3ff', 1.3), 0, 1.25, 0)] }),
  sample: () => ({ always: [mesh(new THREE.CylinderGeometry(0.6, 0.6, 0.8, 10), mat('#6a5a4a'), 0, 0.4, 0)], before: [mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.4, 8), glow('#9a9a5a', 1), 0, 1, 0)], after: [mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.4, 8), glow('#7fe08a', 1.4), 0, 1, 0)] }),
  station: () => ({ always: [mesh(new THREE.BoxGeometry(4, 2.6, 3.4), mat('#7a8a9a', { flatShading: true }), 0, 1.3, 0), mesh(new THREE.ConeGeometry(3.2, 1.6, 4), mat('#c9d4dc', { flatShading: true }), 0, 3.4, 0, 0, Math.PI / 4)], before: [], after: [mesh(new THREE.SphereGeometry(0.25, 8, 6), glow('#7fe08a', 1.6), 0, 4.4, 0)] }),
  algae: () => ({ always: [], before: [group([0, 1, 2, 3, 4].map((k) => mesh(new THREE.ConeGeometry(0.3, 1.6, 5), mat('#2a5a3a'), Math.cos(k) * 0.8, 0.8, Math.sin(k) * 0.8)))], after: [mesh(new THREE.TorusGeometry(0.9, 0.06, 6, 20), glow('#7fe3ff', 1.3), 0, 0.05, 0, Math.PI / 2)] }),
  crack: () => ({ always: [], before: [mesh(new THREE.BoxGeometry(0.4, 2.4, 3.6), glow('#ff4a1a', 1.8), 0, 1.2, 0)], after: [mesh(new THREE.BoxGeometry(0.4, 2.4, 3.6), mat('#3a3a3a'), 0, 1.2, 0), mesh(new THREE.ConeGeometry(0.15, 0.5, 4), glow('#7fe08a', 1.4), 0, 2.8, 0)] }),
  chimney: () => ({ always: [mesh(new THREE.CylinderGeometry(1, 1.4, 8, 10), mat('#2a2522', { flatShading: true }), 0, 4, 0)], before: [mesh(new THREE.ConeGeometry(1.1, 2.6, 8), glow('#ff8a3a', 1.2), 0, 9.2, 0)], after: [mesh(new THREE.ConeGeometry(1.1, 2.6, 8), mat('#9a9a9a', { transparent: true, opacity: 0.6 }), 0, 9.2, 0)] }),
  forge: () => ({ always: [mesh(new THREE.BoxGeometry(2.4, 1.6, 2.4), mat('#3a3330', { flatShading: true }), 0, 0.8, 0)], before: [mesh(new THREE.ConeGeometry(0.8, 1.6, 8), glow('#ff7a1a', 1.8), 0, 2.4, 0)], after: [] }),
  tower: () => ({ always: [mesh(new THREE.CylinderGeometry(1.1, 1.5, 10, 8), mat('#9aa8b8', { flatShading: true }), 0, 5, 0)], before: [mesh(new THREE.OctahedronGeometry(1.5, 0), mat('#cfeaff', { transparent: true, opacity: 0.85 }), 0, 1.5, 0)], after: [mesh(new THREE.TorusGeometry(1.2, 0.08, 6, 20), glow('#7fe3ff', 1.2), 0, 10.2, 0, Math.PI / 2)] }),
  icePlate: () => ({ always: [], before: [mesh(new THREE.BoxGeometry(3, 0.6, 3), mat('#d8f0ff', { transparent: true, opacity: 0.85, roughness: 0.1 }), 0, 0.3, 0)], after: [mesh(new THREE.CircleGeometry(1.3, 14), new THREE.MeshStandardMaterial({ color: '#3a8fb0', emissive: '#0f3a55', emissiveIntensity: 0.6 }), 0, 0.06, 0, -Math.PI / 2)] }),
  root: () => ({ always: [], before: [mesh(new THREE.CylinderGeometry(0.5, 0.8, 6, 8), mat('#4a3a1a'), 0, 0.6, 0, Math.PI / 2, 0, 0.3)], after: [mesh(new THREE.CylinderGeometry(0.6, 0.8, 0.5, 8), mat('#6a5a3a'), 0, 0.25, 0)] }),
  logs: () => ({ always: [], before: [group([0, 1, 2, 3].map((k) => mesh(new THREE.CylinderGeometry(0.35, 0.4, 4, 7), mat('#5a4228'), 0, 0.35 + k * 0.5, 0, Math.PI / 2, k * 0.7, 0)))], after: [] }),
  bones: () => ({ always: [group([0, 1, 2, 3, 4, 5].map((k) => mesh(new THREE.CylinderGeometry(0.1, 0.12, 1.4, 6), mat('#e8e2d0'), Math.cos(k * 1.3) * 1.2, 0.15, Math.sin(k * 1.3) * 1.2, Math.PI / 2, k, 0)))], before: [], after: [] }),
  sporeFocus: () => ({ always: [], before: [group([0, 1, 2].map((k) => mesh(new THREE.SphereGeometry(0.6 - k * 0.12, 10, 8), new THREE.MeshStandardMaterial({ color: '#6a7a2a', emissive: '#a8ff5a', emissiveIntensity: 0.8 }), Math.cos(k * 2) * 0.7, 0.5, Math.sin(k * 2) * 0.7)))], after: [mesh(new THREE.CircleGeometry(1.1, 12), mat('#3a2a1a'), 0, 0.05, 0, -Math.PI / 2)] }),
  vent: () => ({ always: [mesh(new THREE.TorusGeometry(1, 0.3, 6, 14), mat('#5a5a4a', { flatShading: true }), 0, 0.3, 0, Math.PI / 2)], before: [mesh(new THREE.CircleGeometry(0.9, 12), mat('#2a2a1a'), 0, 0.4, 0, -Math.PI / 2)], after: [mesh(new THREE.ConeGeometry(0.8, 3, 8, 1, true), new THREE.MeshBasicMaterial({ color: '#dff6ff', transparent: true, opacity: 0.25, depthWrite: false, side: THREE.DoubleSide }), 0, 1.9, 0)] }),
  crystal: () => ({ always: [mesh(new THREE.ConeGeometry(0.5, 2.4, 6), new THREE.MeshStandardMaterial({ color: '#8a6ab0', emissive: '#c59bff', emissiveIntensity: 0.25, roughness: 0.1 }), 0, 1.2, 0)], before: [], after: [mesh(new THREE.OctahedronGeometry(0.35, 0), glow('#e6d6ff', 2), 0, 2.7, 0)] }),
  crystalDark: () => ({ always: [], before: [mesh(new THREE.ConeGeometry(0.55, 2.6, 6), new THREE.MeshStandardMaterial({ color: '#2a1a3a', emissive: '#ff3a8a', emissiveIntensity: 0.6, roughness: 0.1 }), 0, 1.3, 0)], after: [mesh(new THREE.ConeGeometry(0.55, 0.6, 6), mat('#3a3a4a'), 0, 0.3, 0)] }),
  mirror: () => ({ always: [mesh(new THREE.CylinderGeometry(0.1, 0.12, 2, 6), mat('#6a6a7a', { metalness: 0.5 }), 0, 1, 0)], before: [mesh(new THREE.PlaneGeometry(1.4, 1.4), mat('#4a4a5a', { side: THREE.DoubleSide, metalness: 0.6, roughness: 0.4 }), 0, 2.4, 0, 0, 0, Math.PI / 4)], after: [mesh(new THREE.PlaneGeometry(1.4, 1.4), new THREE.MeshBasicMaterial({ color: new THREE.Color('#e6d6ff').multiplyScalar(1.6), side: THREE.DoubleSide }), 0, 2.4, 0, -0.5, 0, Math.PI / 4)] }),
  brace: () => ({ always: [], before: [mesh(new THREE.BoxGeometry(0.2, 0.2, 2.4), mat('#6a5a3a'), 0, 0.1, 0)], after: [mesh(new THREE.CylinderGeometry(0.16, 0.2, 3, 6), mat('#6a4a2a'), -0.6, 1.4, 0, 0, 0, 0.35), mesh(new THREE.CylinderGeometry(0.16, 0.2, 3, 6), mat('#6a4a2a'), 0.6, 1.4, 0, 0, 0, -0.35), mesh(new THREE.TorusGeometry(0.3, 0.06, 6, 12), mat('#3f7a2a'), 0, 2.6, 0)] }),
  sail: () => ({ always: [mesh(new THREE.CylinderGeometry(0.1, 0.12, 4, 6), mat('#6a4a2a'), 0, 2, 0)], before: [mesh(new THREE.CylinderGeometry(0.2, 0.2, 1.2, 6), mat('#e8e2d0'), 0, 0.8, 0)], after: [mesh(new THREE.PlaneGeometry(2.2, 2.8), mat('#f4f0e2', { side: THREE.DoubleSide }), 1.1, 2.4, 0)] }),
  flower: () => ({ always: [mesh(new THREE.CylinderGeometry(0.08, 0.12, 1.6, 6), mat('#3f7a2a'), 0, 0.8, 0)], before: [mesh(new THREE.SphereGeometry(0.4, 10, 8), mat('#8a6a4a'), 0, 1.75, 0)], after: [group([0, 1, 2, 3, 4, 5].map((k) => scaled(mesh(new THREE.SphereGeometry(0.4, 8, 6), mat('#ff9ad0', { emissive: '#ff6ab0', emissiveIntensity: 0.4 }), Math.cos(k * 1.05) * 0.5, 1.8, Math.sin(k * 1.05) * 0.5), 1, 0.3, 1))), mesh(new THREE.SphereGeometry(0.22, 8, 6), glow('#ffd76a', 1.6), 0, 1.85, 0)] }),
};
export function makeObject(look) {
  const def = (OBJECTS[look] ?? OBJECTS.sample)();
  const root = group(...def.always, ...def.before, ...def.after);
  const done = (v) => { def.before.forEach((o) => { o.visible = !v; }); def.after.forEach((o) => { o.visible = v; }); };
  done(false);
  return { root, done };
}

// ---------------------------------------------------------------- the camp's workbench
export function makeWorkbench() {
  const wood = mat('#7a5a3a'), dark = mat('#4a3a2a');
  const root = group(
    mesh(new THREE.BoxGeometry(2.4, 0.18, 1.1), wood, 0, 0.95, 0),
    ...[[-1, -0.4], [1, -0.4], [-1, 0.4], [1, 0.4]].map(([x, z]) => mesh(new THREE.BoxGeometry(0.14, 0.95, 0.14), dark, x, 0.47, z)),
    mesh(new THREE.BoxGeometry(0.5, 0.35, 0.4), mat('#5a5a5a', { metalness: 0.6, roughness: 0.4 }), -0.6, 1.2, 0),      // anvil
    mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.6, 6), dark, 0.5, 1.1, 0.1, 0, 0, Math.PI / 2),                       // hammer
    mesh(new THREE.BoxGeometry(0.2, 0.14, 0.12), mat('#5a5a5a', { metalness: 0.6 }), 0.78, 1.1, 0.1),
    mesh(new THREE.TorusGeometry(0.22, 0.04, 6, 14), glow('#ffd76a', 1.4), 0.1, 1.3, -0.2, Math.PI / 2),
  );
  return root;
}

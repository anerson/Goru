// Ecosystems specific to Aetherion's design document: Pântano da Decomposição, Reino dos
// Cristais and Floresta Suspensa, plus the coral beds of the Oceano Interior and the giant
// flowers of the Jardim da Copa. Same contract as the builders in index.js and more.js.
import * as THREE from 'three';
import { V, polar, instances } from '../geom.js';
import { makeTerrain, makeTrails, scatter, noise2, entryAngles, drift, fernGeometry, lerpColor, std } from './common.js';

const cyl = () => new THREE.CylinderGeometry(1, 1, 1, 9).translate(0, 0.5, 0);
const glowMat = () => new THREE.MeshBasicMaterial({ color: '#ffffff' });
const DISK_R = 66;

// ---------------------------------------------------------------------------
// Pântano da Decomposição: stagnant black water (not walkable), peat, rotting logs,
// pale and glowing fungi, drifting spores. Boardwalks cross it.
export function swamp({ scene, mats, rand, b }) {
  const L = b.level, W = -0.8;
  const pool = (x, z) => {
    const r = Math.hypot(x, z);
    const s = Math.min(1, Math.max(0, (noise2(x, z, 0.045, 101) - 0.47) / 0.03));
    return s * 2.5 * Math.min(1, Math.max(0, (r - 14) / 6));
  };
  const terrain = makeTerrain({
    level: L, name: 'biome-pantano',
    height: (x, z) => (noise2(x, z, 0.07, 102) - 0.5) * 1.2 - pool(x, z),
    color: (x, z, h, c) => (h < W - 0.2 ? c.set('#141a10') : lerpColor(c, '#2f3a1e', '#4e5a2a', noise2(x, z, 0.15, 103))),
    material: mats.terrain,
  });
  scene.add(terrain.mesh);
  const water = new THREE.Mesh(new THREE.CircleGeometry(DISK_R - 5, 96), new THREE.MeshStandardMaterial({ color: '#1d2a17', roughness: 0.15, transparent: true, opacity: 0.9, emissive: '#0c1a08', emissiveIntensity: 0.5 }));
  water.rotation.x = -Math.PI / 2;
  water.position.y = L + W;
  scene.add(water);
  const deck = (x, z) => Math.max(terrain.h(x, z), L + W + 0.6);
  const trails = makeTrails({ rand, h: terrain.h, surface: deck, entries: entryAngles(L), loopR: 40, material: mats.planks, lift: 0.12, width: 3 });
  trails.meshes.forEach((m) => { m.castShadow = true; });
  const dry = (x, z) => terrain.h(x, z) > L + W + 0.2;
  const free = (x, z, d) => Math.hypot(x, z) > 14 && !trails.near(x, z, d) && dry(x, z);

  // rotting logs lying on the ground
  scene.add(instances(cyl(), mats.barkStatic, scatter(rand, 40, 15, 62, (x, z) => free(x, z, 4)).map(([x, z]) => ({
    p: V(x, terrain.h(x, z) + 0.4, z), s: V(0.6 + rand() * 0.5, 6 + rand() * 8, 0.6 + rand() * 0.5), rot: [Math.PI / 2, rand() * 6, 0],
  }))));
  // dead standing trees
  scene.add(instances(new THREE.CylinderGeometry(0.2, 0.5, 1, 7).translate(0, 0.5, 0), mats.barkStatic,
    scatter(rand, 30, 15, 62, (x, z) => free(x, z, 3)).map(([x, z]) => ({ p: V(x, terrain.h(x, z), z), s: V(1, 6 + rand() * 8, 1), rot: [(rand() - 0.5) * 0.3, 0, (rand() - 0.5) * 0.3] }))));
  // fungi: pale shelf caps and glowing green ones
  const stems = [], caps = [];
  scatter(rand, 110, 14, 63, (x, z) => free(x, z, 1.8)).forEach(([x, z]) => {
    const h = 0.4 + rand() * 2.2, cap = 0.4 + h * 0.6, y = terrain.h(x, z), glow = rand() < 0.4;
    stems.push({ p: V(x, y, z), s: V(0.12 + h * 0.05, h, 0.12 + h * 0.05), color: '#cfc6a8' });
    caps.push({ p: V(x, y + h, z), s: V(cap, cap * 0.45, cap), color: glow ? new THREE.Color('#a8ff5a').multiplyScalar(1.4) : new THREE.Color('#bdb08a') });
  });
  scene.add(instances(cyl(), std({ roughness: 0.6 }), stems));
  scene.add(instances(new THREE.SphereGeometry(1, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), glowMat(), caps));
  // reeds in the shallows
  scene.add(instances(new THREE.ConeGeometry(0.06, 1, 4).translate(0, 0.5, 0), std({ color: '#5a5f2a' }),
    scatter(rand, 500, 14, 62, (x, z) => { const h = terrain.h(x, z) - L; return h > W - 1 && h < W + 0.5; }).map(([x, z]) => ({ p: V(x, terrain.h(x, z), z), s: V(0.6, 1.5 + rand() * 1.5, 0.6) }))));
  // landmark: a fallen giant log arching over the middle, covered in glowing fungus
  const y0 = terrain.h(0, 0);
  const arch = new THREE.Mesh(new THREE.TorusGeometry(10, 1.8, 10, 40, Math.PI), mats.barkStatic);
  arch.position.set(0, y0 - 1, 0); arch.castShadow = true;
  scene.add(arch);
  scene.add(instances(new THREE.SphereGeometry(1, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), glowMat(),
    Array.from({ length: 40 }, () => { const a = rand() * Math.PI; return { p: V(Math.cos(a) * 10, y0 - 1 + Math.sin(a) * 10 + 1.7, (rand() - 0.5) * 2), s: 0.3 + rand() * 0.4, color: new THREE.Color('#a8ff5a').multiplyScalar(1.5) }; }), { shadow: false }));
  const spores = drift(scene, rand, { count: 700, rMax: 62, y0: L, y1: L + 10, color: '#c8ff7a', size: 0.12, speed: 0.4, opacity: 0.7 });
  return {
    h: terrain.h, walkables: [terrain.mesh, ...trails.meshes], trails, trailLength: trails.length,
    update: (dt, t) => spores(dt, t, 0.7 + 0.3 * Math.sin(t * 1.7)),
    noGo: (x, z, floor) => Math.abs(floor - L) < 12 && floor < L + W - 0.05 && Math.hypot(x, z) < DISK_R,
  };
}

// ---------------------------------------------------------------------------
// Reino dos Cristais: dark mineral floor, clusters of glowing crystals in many colours,
// quartz pillars, luminous fungi, a still underground pool.
export function crystals({ scene, mats, rand, b }) {
  const L = b.level;
  const terrain = makeTerrain({
    level: L, name: 'biome-cristais',
    height: (x, z) => (noise2(x, z, 0.06, 111) - 0.5) * 3 + Math.max(0, noise2(x, z, 0.12, 112) - 0.6) * 5,
    color: (x, z, h, c) => lerpColor(c, '#1b1726', '#3a3150', noise2(x, z, 0.14, 113)),
    material: mats.terrain,
  });
  scene.add(terrain.mesh);
  const trails = makeTrails({ rand, h: terrain.h, entries: entryAngles(L), loopR: 40, material: mats.trailSnow });
  const free = (x, z, d) => Math.hypot(x, z) > 15 && !trails.near(x, z, d);
  const hues = ['#c59bff', '#7fd4ff', '#ff8fd8', '#9dffcf', '#ffd27a'];
  const shards = [];
  scatter(rand, 70, 15, 63, (x, z) => free(x, z, 4)).forEach(([x, z]) => {
    const col = new THREE.Color(hues[(rand() * hues.length) | 0]), y = terrain.h(x, z);
    for (let k = 0; k < 6; k++) shards.push({ p: V(x + (rand() - 0.5) * 2, y, z + (rand() - 0.5) * 2), s: V(0.3 + rand() * 0.5, 1.5 + rand() * 4, 0.3 + rand() * 0.5), rot: [(rand() - 0.5) * 0.9, rand() * 6, (rand() - 0.5) * 0.9], color: col.clone().multiplyScalar(1.2 + rand() * 0.6) });
  });
  // landmark: a ring of huge crystals around a glowing core
  for (let k = 0; k < 10; k++) shards.push({ p: polar(12, (k / 10) * Math.PI * 2, terrain.h(0, 0) - 0.5), s: V(1.6, 7 + rand() * 9, 1.6), rot: [(rand() - 0.5) * 0.4, rand() * 6, (rand() - 0.5) * 0.4], color: new THREE.Color(hues[k % hues.length]).multiplyScalar(1.5) });
  scene.add(instances(new THREE.OctahedronGeometry(1, 0), glowMat(), shards, { shadow: false }));
  scene.add(instances(new THREE.CylinderGeometry(1, 1.1, 1, 6).translate(0, 0.5, 0), std({ color: '#d9d3ea', roughness: 0.2, metalness: 0.1, transparent: true, opacity: 0.75 }),
    scatter(rand, 30, 16, 62, (x, z) => free(x, z, 4)).map(([x, z]) => ({ p: V(x, terrain.h(x, z) - 0.5, z), s: V(1 + rand(), 4 + rand() * 10, 1 + rand()) }))));
  scene.add(instances(new THREE.SphereGeometry(1, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), glowMat(),
    scatter(rand, 200, 12, 64, (x, z) => free(x, z, 1.5)).map(([x, z]) => ({ p: V(x, terrain.h(x, z), z), s: V(0.3 + rand() * 0.4, 0.2, 0.3 + rand() * 0.4), color: new THREE.Color('#7fffe0').multiplyScalar(1.2) })), { shadow: false }));
  const core = new THREE.Mesh(new THREE.IcosahedronGeometry(2.2, 1), new THREE.MeshBasicMaterial({ color: new THREE.Color('#e6d6ff').multiplyScalar(2) }));
  core.position.set(0, terrain.h(0, 0) + 4, 0);
  scene.add(core);
  const motes = drift(scene, rand, { count: 500, rMax: 62, y0: L + 0.5, y1: L + 20, color: '#d9c4ff', size: 0.12, speed: 0.3, opacity: 0.8 });
  return { h: terrain.h, walkables: [terrain.mesh], trails, trailLength: trails.length, update: (dt, t) => { motes(dt, t, 0.7 + 0.3 * Math.sin(t)); core.rotation.y += dt * 0.4; core.position.y = terrain.h(0, 0) + 4 + Math.sin(t) * 0.3; } };
}

// ---------------------------------------------------------------------------
// Floresta Suspensa: smaller trees rooted in soil gathered on wood, bromeliads, hanging
// creepers, high-altitude ponds and giant nests on dead stumps.
export function suspended({ scene, mats, rand, b }) {
  const L = b.level;
  const terrain = makeTerrain({
    level: L, name: 'biome-suspensa',
    height: (x, z) => (noise2(x, z, 0.05, 121) - 0.5) * 3,
    color: (x, z, h, c) => lerpColor(c, '#3f6a2c', '#7aa04a', noise2(x, z, 0.12, 122)),
    material: mats.terrain,
  });
  scene.add(terrain.mesh);
  const trails = makeTrails({ rand, h: terrain.h, entries: entryAngles(L), loopR: 40, material: mats.trailDirt });
  const free = (x, z, d) => Math.hypot(x, z) > 15 && !trails.near(x, z, d);
  const trees = scatter(rand, 45, 15, 62, (x, z) => free(x, z, 5));
  scene.add(instances(new THREE.CylinderGeometry(0.3, 0.5, 1, 8).translate(0, 0.5, 0), mats.barkStatic, trees.map(([x, z]) => ({ p: V(x, terrain.h(x, z), z), s: V(1, 5 + rand() * 5, 1) }))));
  const crowns = [];
  trees.forEach(([x, z]) => { const top = terrain.h(x, z) + 5; for (let k = 0; k < 5; k++) crowns.push({ p: V(x + (rand() - 0.5) * 4.5, top + rand() * 4, z + (rand() - 0.5) * 4.5), s: 2.2 + rand() * 1.8, color: ['#3f7d34', '#5a9a3c', '#2f6a2a', '#76a84a'][k % 4] }); });
  scene.add(instances(new THREE.IcosahedronGeometry(1, 1), std({ flatShading: true, roughness: 0.8 }), crowns));
  // bromeliads: rosettes with a coloured heart
  const rosettes = scatter(rand, 160, 12, 64, (x, z) => free(x, z, 1.8));
  scene.add(instances(fernGeometry(), std({ side: THREE.DoubleSide, roughness: 0.6 }), rosettes.map(([x, z]) => ({ p: V(x, terrain.h(x, z), z), s: 0.9 + rand() * 0.8, rot: [0, rand() * 6, 0], color: '#4f8f3a' }))));
  scene.add(instances(new THREE.ConeGeometry(0.25, 0.6, 6).translate(0, 0.3, 0), glowMat(), rosettes.map(([x, z]) => ({ p: V(x, terrain.h(x, z) + 0.2, z), s: 1, color: new THREE.Color(['#ff3d6b', '#ff8a1f', '#ffd23f'][(rand() * 3) | 0]).multiplyScalar(1.1) })), { shadow: false }));
  // giant nests on stumps
  const nests = scatter(rand, 6, 22, 58, (x, z) => free(x, z, 8));
  scene.add(instances(cyl(), mats.barkStatic, nests.map(([x, z]) => ({ p: V(x, terrain.h(x, z), z), s: V(1.4, 6, 1.4) }))));
  scene.add(instances(new THREE.TorusGeometry(2.6, 0.9, 8, 20).rotateX(Math.PI / 2), std({ color: '#7a5a32', roughness: 1 }), nests.map(([x, z]) => ({ p: V(x, terrain.h(x, z) + 6.4, z), s: 1, rot: [0, rand() * 6, 0] }))));
  scene.add(instances(new THREE.SphereGeometry(0.55, 12, 8), std({ color: '#efe8d8', roughness: 0.4 }), nests.flatMap(([x, z]) => [0, 1, 2].map((k) => ({ p: V(x + (k - 1) * 0.9, terrain.h(x, z) + 6.6, z + (rand() - 0.5)), s: V(1, 1.3, 1) })))));
  // creepers hanging from above
  scene.add(instances(cyl(), std({ color: '#4f7a2e' }), scatter(rand, 120, 6, 62, () => true).map(([x, z]) => { const len = 6 + rand() * 12; return { p: V(x, L + 27 - len, z), s: V(0.1, len, 0.1) }; }), { shadow: false }));
  // landmark: a high-altitude pond with an island tree
  const pond = new THREE.Mesh(new THREE.CircleGeometry(9, 48), std({ color: '#3d8fa0', roughness: 0.1, metalness: 0.1, emissive: '#0f3a44', emissiveIntensity: 0.5 }));
  pond.rotation.x = -Math.PI / 2; pond.position.set(0, terrain.h(0, 0) + 0.12, 0);
  scene.add(pond);
  const pollen = drift(scene, rand, { count: 500, rMax: 62, y0: L + 0.5, y1: L + 16, color: '#fff6b0', size: 0.1, speed: 0.6, opacity: 0.8 });
  return { h: terrain.h, walkables: [terrain.mesh], trails, trailLength: trails.length, update: (dt, t) => pollen(dt, t, 1) };
}

// ---------------------------------------------------------------------------
// coral beds on the floor of the Oceano Interior, seen through the water
export function corals(scene, rand, h, isDeep) {
  const colors = ['#ff6f91', '#ff9671', '#ffc75f', '#c34a9b', '#7bffb0'];
  const stalks = [];
  scatter(rand, 90, 18, 62, isDeep).forEach(([x, z]) => {
    const col = colors[(rand() * colors.length) | 0], y = h(x, z);
    for (let k = 0; k < 7; k++) stalks.push({ p: V(x, y, z), s: V(0.16, 0.8 + rand() * 1.6, 0.16), rot: [(rand() - 0.5) * 1.1, rand() * 6, (rand() - 0.5) * 1.1], color: col });
  });
  scene.add(instances(cyl(), std({ roughness: 0.6 }), stalks, { shadow: false }));
}

// giant flowers for the Jardim da Copa
export function giantFlowers(scene, rand, h, free, n = 18) {
  const petals = [], stems = [], hearts = [];
  scatter(rand, n, 16, 60, (x, z) => free(x, z, 4)).forEach(([x, z]) => {
    const stem = 3 + rand() * 4, y = h(x, z) + stem, col = ['#ff6fa8', '#ffd23f', '#ffffff', '#b07dff'][(rand() * 4) | 0];
    stems.push({ p: V(x, h(x, z), z), s: V(0.2, stem, 0.2) });
    for (let k = 0; k < 6; k++) { const a = (k / 6) * Math.PI * 2; petals.push({ p: V(x + Math.cos(a) * 1.1, y, z + Math.sin(a) * 1.1), s: V(1.2, 0.15, 0.6), rot: [0, -a, 0.35], color: col }); }
    hearts.push({ p: V(x, y + 0.1, z), s: 0.5, color: new THREE.Color('#ffe08a').multiplyScalar(1.5) });
  });
  scene.add(instances(cyl(), std({ color: '#4f8a35' }), stems));
  scene.add(instances(new THREE.SphereGeometry(1, 12, 8), std({ roughness: 0.6 }), petals));
  scene.add(instances(new THREE.SphereGeometry(1, 12, 8), glowMat(), hearts, { shadow: false }));
}

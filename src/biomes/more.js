// Five more ecosystems: jungle, savanna, volcano, coral reef, autumn wood.
// Same contract as the others in index.js: build props on a terrain disk, return its
// walkables, trails, trail length and an optional per-frame update and no-go test.
// Every level has 27 m of headroom under the slab above, so nothing here is taller than ~22 m.
import * as THREE from 'three';
import { DISK_R, junctionAngle } from '../tree/layout.js';
import { V, polar, instances } from '../geom.js';
import { makeTerrain, makeTrails, scatter, noise2, entryAngles, drift, fernGeometry, lerpColor, std } from './common.js';

const cyl = () => new THREE.CylinderGeometry(1, 1, 1, 9).translate(0, 0.5, 0);
const cone = () => new THREE.ConeGeometry(1, 1, 9).translate(0, 0.5, 0);
const glowMat = () => new THREE.MeshBasicMaterial({ color: '#ffffff' });

// ---------------------------------------------------------------------------
export function jungle({ scene, mats, rand, b }) {
  const L = b.level;
  const terrain = makeTerrain({
    level: L, name: 'biome-selva',
    height: (x, z) => (noise2(x, z, 0.05, 51) - 0.5) * 3.5 + Math.max(0, noise2(x, z, 0.11, 52) - 0.55) * 4,
    color: (x, z, h, c) => lerpColor(c, '#24451f', '#3f6e2a', noise2(x, z, 0.12, 53)),
    material: mats.terrain,
  });
  scene.add(terrain.mesh);
  const trails = makeTrails({ rand, h: terrain.h, entries: entryAngles(L), loopR: 40, material: mats.trailDirt });
  const free = (x, z, d) => Math.hypot(x, z) > 16 && !trails.near(x, z, d);

  // palms: a slightly leaning trunk and a crown of long fronds
  const palms = scatter(rand, 40, 16, 62, (x, z) => free(x, z, 4));
  const trunks = [], fronds = [];
  palms.forEach(([x, z]) => {
    const h = 9 + rand() * 9, lean = [(rand() - 0.5) * 0.25, 0, (rand() - 0.5) * 0.25], y = terrain.h(x, z);
    trunks.push({ p: V(x, y, z), s: V(0.45, h, 0.45), rot: lean });
    const top = V(0, h, 0).applyEuler(new THREE.Euler(...lean)).add(V(x, y, z));
    fronds.push({ p: top, s: V(5.5, 3, 5.5), rot: [0, rand() * 6, 0], color: rand() < 0.5 ? '#2f7a2e' : '#3d8f36' });
  });
  scene.add(instances(cyl(), mats.barkStatic, trunks));
  const frondGeo = fernGeometry().translate(0, -0.35, 0);
  scene.add(instances(frondGeo, std({ side: THREE.DoubleSide, roughness: 0.6 }), fronds));
  // giant understorey leaves
  scene.add(instances(fernGeometry(), std({ side: THREE.DoubleSide, roughness: 0.6 }),
    scatter(rand, 260, 10, 64, (x, z) => free(x, z, 2)).map(([x, z]) => ({ p: V(x, terrain.h(x, z), z), s: 2 + rand() * 3, rot: [0, rand() * 6, 0], color: ['#1f5e2a', '#2c7a33', '#3a8a2e'][(rand() * 3) | 0] }))));
  // vines hanging from the floor above, almost to the ground
  const top = L + 27;
  scene.add(instances(cyl(), std({ color: '#3f6b2a', roughness: 0.8 }),
    scatter(rand, 160, 6, 62, () => true).map(([x, z]) => {
      const len = 10 + rand() * 14;
      return { p: V(x, top - len, z), s: V(0.12, len, 0.12) };
    }), { shadow: false }));
  // bright flowers
  scene.add(instances(new THREE.IcosahedronGeometry(0.35, 0), glowMat(),
    scatter(rand, 300, 12, 64, (x, z) => free(x, z, 1.5)).map(([x, z]) => ({ p: V(x, terrain.h(x, z) + 0.6 + rand(), z), s: 0.7 + rand() * 0.8, color: new THREE.Color(['#ff4d6d', '#ff9f1c', '#c77dff', '#ffd60a'][(rand() * 4) | 0]).multiplyScalar(1.1) })), { shadow: false }));
  // landmark: a stepped stone temple with a glowing top
  const y0 = terrain.h(0, 0) - 0.3;
  const steps = [0, 1, 2, 3].map((k) => ({ p: V(0, y0 + k * 2.2, 0), s: V(16 - k * 3.6, 2.2, 16 - k * 3.6), rot: [0, junctionAngle(L), 0], color: k % 2 ? '#7d8a6a' : '#8c9877' }));
  scene.add(instances(new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0), std({ flatShading: true }), steps));
  const flame = new THREE.Mesh(new THREE.OctahedronGeometry(1.4, 0), new THREE.MeshBasicMaterial({ color: new THREE.Color('#9dffb0').multiplyScalar(2) }));
  flame.position.set(0, y0 + 10.5, 0);
  scene.add(flame);
  const mist = drift(scene, rand, { count: 400, rMax: 62, y0: L + 0.3, y1: L + 6, color: '#d9ffe0', size: 0.4, speed: 0.3, opacity: 0.3 });
  return { walkables: [terrain.mesh], trails, trailLength: trails.length, update: (dt, t) => { mist(dt, t, 1); flame.rotation.y += dt; } };
}

// ---------------------------------------------------------------------------
export function savanna({ scene, mats, rand, b }) {
  const L = b.level;
  const terrain = makeTerrain({
    level: L, name: 'biome-savana',
    height: (x, z) => (noise2(x, z, 0.03, 61) - 0.5) * 2,
    color: (x, z, h, c) => lerpColor(c, '#a8883e', '#d9b45a', noise2(x, z, 0.09, 62)),
    material: mats.terrain,
  });
  scene.add(terrain.mesh);
  const trails = makeTrails({ rand, h: terrain.h, entries: entryAngles(L), loopR: 42, material: mats.trailSand });
  const free = (x, z, d) => Math.hypot(x, z) > 16 && !trails.near(x, z, d);

  scene.add(instances(new THREE.ConeGeometry(0.07, 1, 3).translate(0, 0.5, 0), std({ roughness: 1 }),
    scatter(rand, 9000, 8, 64, (x, z) => free(x, z, 1.6)).map(([x, z]) => ({ p: V(x, terrain.h(x, z), z), s: V(1, 0.8 + rand() * 1.2, 1), rot: [(rand() - 0.5) * 0.4, rand() * 6, 0], color: rand() < 0.5 ? '#d1a84a' : '#b8913a' })), { shadow: false }));

  // acacias: a forked trunk and a wide flat crown
  const acacias = scatter(rand, 16, 18, 60, (x, z) => free(x, z, 8));
  scene.add(instances(cyl(), mats.barkStatic, acacias.flatMap(([x, z]) => {
    const y = terrain.h(x, z);
    return [{ p: V(x, y, z), s: V(0.45, 4, 0.45) }, { p: V(x, y + 3.8, z), s: V(0.3, 3.5, 0.3), rot: [0.5, rand() * 6, 0] }, { p: V(x, y + 3.8, z), s: V(0.3, 3.5, 0.3), rot: [-0.5, rand() * 6, 0] }];
  })));
  scene.add(instances(new THREE.CylinderGeometry(1, 0.8, 1, 14), std({ flatShading: true }),
    acacias.map(([x, z]) => ({ p: V(x, terrain.h(x, z) + 7.4, z), s: V(6 + rand() * 2, 1.2, 6 + rand() * 2), color: '#5e7a2e' }))));
  // termite mounds and rocks
  scene.add(instances(cone(), std({ color: '#9a6a3c', flatShading: true }),
    scatter(rand, 30, 16, 62, (x, z) => free(x, z, 3)).map(([x, z]) => ({ p: V(x, terrain.h(x, z) - 0.2, z), s: V(1 + rand(), 2.5 + rand() * 3, 1 + rand()) }))));
  scene.add(instances(new THREE.DodecahedronGeometry(1, 0), std({ color: '#8f8576', flatShading: true }),
    scatter(rand, 40, 16, 62, (x, z) => free(x, z, 3)).map(([x, z]) => ({ p: V(x, terrain.h(x, z), z), s: V(1.5 + rand() * 2.5, 1 + rand() * 2, 1.5 + rand() * 2.5), rot: [rand(), rand() * 6, rand()] }))));
  // landmark: a great baobab
  const y0 = terrain.h(0, 0);
  const baobab = new THREE.Mesh(new THREE.CylinderGeometry(3.2, 4.6, 13, 18), mats.barkStatic);
  baobab.position.set(0, y0 + 6.5, 0);
  baobab.castShadow = true;
  scene.add(baobab);
  scene.add(instances(cyl(), mats.barkStatic, Array.from({ length: 8 }, (_, k) => ({ p: V(0, y0 + 12.5, 0), s: V(0.6, 5 + rand() * 2, 0.6), rot: [0.7 + rand() * 0.3, (k / 8) * Math.PI * 2, 0] }))));
  const dust = drift(scene, rand, { count: 300, rMax: 62, y0: L, y1: L + 12, color: '#ffe2a8', size: 0.15, speed: 2, opacity: 0.45 });
  return { walkables: [terrain.mesh], trails, trailLength: trails.length, update: (dt, t) => dust(dt, t, 1) };
}

// ---------------------------------------------------------------------------
export function volcano({ scene, mats, rand, b }) {
  const L = b.level, LAVA = -0.9;
  const channel = (x, z) => {
    const r = Math.hypot(x, z);
    const n = 1 - Math.abs(2 * noise2(x, z, 0.03, 71) - 1);          // ridged noise -> winding rivers
    const s = Math.min(1, Math.max(0, (n - 0.86) / 0.04));
    return s * 2.2 * Math.min(1, Math.max(0, (r - 15) / 5));           // keep the middle solid
  };
  const terrain = makeTerrain({
    level: L, name: 'biome-vulcao',
    height: (x, z) => (noise2(x, z, 0.06, 72) - 0.5) * 2.4 - channel(x, z),
    color: (x, z, h, c) => (h < LAVA + 0.2 ? c.set('#2a0f08') : lerpColor(c, '#1c1b1d', '#3b3433', noise2(x, z, 0.15, 73))),
    material: mats.terrain,
  });
  scene.add(terrain.mesh);
  const lava = new THREE.Mesh(new THREE.CircleGeometry(DISK_R - 5, 96), new THREE.MeshBasicMaterial({ color: new THREE.Color('#ff5a1a').multiplyScalar(1.8) }));
  lava.rotation.x = -Math.PI / 2;
  lava.position.y = L + LAVA;
  scene.add(lava);
  const trails = makeTrails({ rand, h: terrain.h, surface: (x, z) => Math.max(terrain.h(x, z), L + LAVA + 0.8), entries: entryAngles(L), loopR: 40, material: mats.basalt, lift: 0.12, width: 3.2 });
  const free = (x, z, d) => Math.hypot(x, z) > 15 && !trails.near(x, z, d) && terrain.h(x, z) > L + LAVA + 0.3;

  // basalt columns in clusters
  const cols = [];
  scatter(rand, 22, 18, 62, (x, z) => free(x, z, 5)).forEach(([x, z]) => {
    for (let k = 0; k < 7; k++) {
      const px = x + (rand() - 0.5) * 5, pz = z + (rand() - 0.5) * 5;
      cols.push({ p: V(px, terrain.h(px, pz) - 0.5, pz), s: V(0.8, 2 + rand() * 9, 0.8), color: rand() < 0.5 ? '#222023' : '#2c292b' });
    }
  });
  scene.add(instances(new THREE.CylinderGeometry(1, 1, 1, 6).translate(0, 0.5, 0), std({ flatShading: true, roughness: 0.7 }), cols));
  scene.add(instances(new THREE.OctahedronGeometry(1, 0), std({ color: '#121014', roughness: 0.15, metalness: 0.3 }),
    scatter(rand, 60, 15, 62, (x, z) => free(x, z, 2.5)).map(([x, z]) => ({ p: V(x, terrain.h(x, z), z), s: V(0.5 + rand(), 1 + rand() * 2.5, 0.5 + rand()), rot: [(rand() - 0.5) * 0.8, rand() * 6, (rand() - 0.5) * 0.8] }))));
  // landmark: an obsidian spire in a ring of glowing rocks
  const y0 = terrain.h(0, 0);
  const spire = new THREE.Mesh(new THREE.OctahedronGeometry(1, 0), std({ color: '#0d0b10', roughness: 0.1, metalness: 0.4 }));
  spire.scale.set(3, 14, 3);
  spire.position.set(0, y0 + 9, 0);
  spire.castShadow = true;
  scene.add(spire);
  scene.add(instances(new THREE.DodecahedronGeometry(1, 0), glowMat(), Array.from({ length: 10 }, (_, k) => ({ p: polar(7, (k / 10) * Math.PI * 2, y0 + 0.3), s: 0.8 + rand() * 0.6, color: new THREE.Color('#ff7a2a').multiplyScalar(1.6) })), { shadow: false }));
  const heat = new THREE.PointLight('#ff6a2a', 900, 0, 2);
  heat.position.set(0, y0 + 3, 0);
  scene.add(heat);
  const embers = drift(scene, rand, { count: 700, rMax: 62, y0: L, y1: L + 24, color: '#ff8a3a', size: 0.14, speed: 0.6, fall: -2.4, opacity: 0.95 });
  return {
    walkables: [terrain.mesh, ...trails.meshes], trails, trailLength: trails.length,
    update: (dt, t) => { embers(dt, t, 0.8 + 0.2 * Math.sin(t * 7)); lava.material.color.setRGB(1.8, 0.5 + 0.08 * Math.sin(t * 1.3), 0.18); },
    // lava is not walkable: stay on rock or the raised paths
    noGo: (x, z, floor) => Math.abs(floor - L) < 12 && floor < L + LAVA + 0.25 && Math.hypot(x, z) < DISK_R,
  };
}

// ---------------------------------------------------------------------------
export function reef({ scene, mats, rand, b }) {
  const L = b.level;
  const terrain = makeTerrain({
    level: L, name: 'biome-recife',
    height: (x, z) => (noise2(x, z, 0.05, 81) - 0.5) * 2.4 + Math.sin(x * 0.4 + noise2(x, z, 0.1, 82) * 4) * 0.12,
    color: (x, z, h, c) => lerpColor(c, '#c9b98a', '#efe3bd', noise2(x, z, 0.1, 83)),
    material: mats.terrain,
  });
  scene.add(terrain.mesh);
  const trails = makeTrails({ rand, h: terrain.h, entries: entryAngles(L), loopR: 40, material: mats.trailSand });
  const free = (x, z, d) => Math.hypot(x, z) > 15 && !trails.near(x, z, d);
  const coralColors = ['#ff6f91', '#ff9671', '#ffc75f', '#c34a9b', '#f9f871', '#ff5e78'];

  // branching coral: bundles of thin tilted stalks
  const stalks = [];
  scatter(rand, 70, 15, 63, (x, z) => free(x, z, 2.5)).forEach(([x, z]) => {
    const col = coralColors[(rand() * coralColors.length) | 0], y = terrain.h(x, z);
    for (let k = 0; k < 9; k++) stalks.push({ p: V(x, y, z), s: V(0.18, 1.2 + rand() * 2.6, 0.18), rot: [(rand() - 0.5) * 1.2, rand() * 6, (rand() - 0.5) * 1.2], color: col });
  });
  scene.add(instances(cyl(), std({ roughness: 0.6 }), stalks));
  // brain coral domes and sea fans
  scene.add(instances(new THREE.SphereGeometry(1, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), std({ roughness: 0.8 }),
    scatter(rand, 60, 15, 63, (x, z) => free(x, z, 2.5)).map(([x, z]) => ({ p: V(x, terrain.h(x, z) - 0.1, z), s: V(1 + rand() * 1.5, 0.7 + rand(), 1 + rand() * 1.5), color: ['#d9a066', '#b7c96a', '#e58f6d'][(rand() * 3) | 0] }))));
  scene.add(instances(new THREE.CircleGeometry(1, 18).translate(0, 1, 0), std({ side: THREE.DoubleSide, roughness: 0.7 }),
    scatter(rand, 50, 15, 63, (x, z) => free(x, z, 2.5)).map(([x, z]) => ({ p: V(x, terrain.h(x, z), z), s: V(1.4 + rand(), 1.6 + rand(), 1), rot: [0, rand() * 6, 0], color: ['#9b5de5', '#f15bb5', '#7b2cbf'][(rand() * 3) | 0] }))));
  // kelp: tall swaying strands (static here), anemones that glow
  scene.add(instances(cyl(), std({ color: '#5c7d2a', roughness: 0.7 }),
    scatter(rand, 140, 15, 64, (x, z) => free(x, z, 2)).map(([x, z]) => ({ p: V(x, terrain.h(x, z), z), s: V(0.15, 6 + rand() * 12, 0.15), rot: [(rand() - 0.5) * 0.15, 0, (rand() - 0.5) * 0.15] })), { shadow: false }));
  scene.add(instances(cone(), glowMat(),
    scatter(rand, 120, 15, 63, (x, z) => free(x, z, 1.5)).map(([x, z]) => ({ p: V(x, terrain.h(x, z), z), s: V(0.35, 0.8 + rand() * 0.6, 0.35), color: new THREE.Color(['#5ef2ff', '#7bffb0', '#ff8ff0'][(rand() * 3) | 0]).multiplyScalar(1.4) })), { shadow: false }));
  // landmark: a giant open clam with a glowing pearl
  const y0 = terrain.h(0, 0);
  const shell = std({ color: '#d8c7ef', roughness: 0.35, side: THREE.DoubleSide });
  const lower = new THREE.Mesh(new THREE.SphereGeometry(6, 32, 16, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), shell);
  lower.scale.set(1, 0.45, 1); lower.position.set(0, y0 + 2.6, 0);
  const upper = new THREE.Mesh(new THREE.SphereGeometry(6, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2), shell);
  upper.scale.set(1, 0.45, 1); upper.position.set(0, y0 + 2.8, -0.2); upper.rotation.x = -0.9;
  const pearl = new THREE.Mesh(new THREE.SphereGeometry(1.4, 24, 16), new THREE.MeshBasicMaterial({ color: new THREE.Color('#f4fbff').multiplyScalar(1.6) }));
  pearl.position.set(0, y0 + 2.8, 0.8);
  for (const m of [lower, upper]) m.castShadow = true;
  scene.add(lower, upper, pearl);
  const bubbles = drift(scene, rand, { count: 900, rMax: 62, y0: L, y1: L + 26, color: '#cfefff', size: 0.2, speed: 0.4, fall: -1.6, opacity: 0.6 });
  const plankton = drift(scene, rand, { count: 400, rMax: 62, y0: L + 1, y1: L + 20, color: '#7fe7ff', size: 0.1, speed: 0.5, opacity: 0.8 });
  return { walkables: [terrain.mesh], trails, trailLength: trails.length, update: (dt, t) => { bubbles(dt, t, 1); plankton(dt, t, 0.6 + 0.4 * Math.sin(t)); } };
}

// ---------------------------------------------------------------------------
export function autumn({ scene, mats, rand, b }) {
  const L = b.level;
  const terrain = makeTerrain({
    level: L, name: 'biome-outono',
    height: (x, z) => (noise2(x, z, 0.04, 91) - 0.5) * 3,
    color: (x, z, h, c) => lerpColor(c, '#7a3f1d', '#c27a2c', noise2(x, z, 0.14, 92)),
    material: mats.terrain,
  });
  scene.add(terrain.mesh);
  const trails = makeTrails({ rand, h: terrain.h, entries: entryAngles(L), loopR: 40, material: mats.trailDirt });
  const free = (x, z, d) => Math.hypot(x, z) > 16 && !trails.near(x, z, d);
  const leafColors = ['#d94f1e', '#f08a24', '#f2c12e', '#b8321a', '#e3a52e'];

  const trees = scatter(rand, 48, 16, 62, (x, z) => free(x, z, 5));
  scene.add(instances(new THREE.CylinderGeometry(0.3, 0.55, 1, 8).translate(0, 0.5, 0), mats.barkStatic,
    trees.map(([x, z]) => ({ p: V(x, terrain.h(x, z), z), s: V(1, 6 + rand() * 4, 1) }))));
  const crowns = [];
  trees.forEach(([x, z]) => {
    const col = leafColors[(rand() * leafColors.length) | 0], top = terrain.h(x, z) + 6;
    for (let k = 0; k < 5; k++) crowns.push({ p: V(x + (rand() - 0.5) * 5, top + rand() * 4, z + (rand() - 0.5) * 5), s: 2.4 + rand() * 2, color: col });
  });
  // landmark: a great maple
  const y0 = terrain.h(0, 0);
  const maple = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 2, 9, 12).translate(0, 4.5, 0), mats.barkStatic);
  maple.position.set(0, y0, 0); maple.castShadow = true;
  scene.add(maple);
  for (let k = 0; k < 16; k++) crowns.push({ p: V((rand() - 0.5) * 12, y0 + 10 + rand() * 6, (rand() - 0.5) * 12), s: 3.5 + rand() * 2.5, color: rand() < 0.6 ? '#c9301a' : '#e0531f' });
  scene.add(instances(new THREE.IcosahedronGeometry(1, 1), std({ flatShading: true, roughness: 0.8 }), crowns));
  // leaf litter on the ground
  scene.add(instances(new THREE.CircleGeometry(0.25, 5).rotateX(-Math.PI / 2), std({ side: THREE.DoubleSide }),
    scatter(rand, 4000, 6, 64, () => true).map(([x, z]) => ({ p: V(x, terrain.h(x, z) + 0.12, z), s: 0.8 + rand() * 0.8, rot: [0, rand() * 6, 0], color: leafColors[(rand() * leafColors.length) | 0] })), { shadow: false }));
  // mushrooms and a few benches along the loop
  scene.add(instances(new THREE.SphereGeometry(1, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), std({ roughness: 0.6 }),
    scatter(rand, 80, 16, 62, (x, z) => free(x, z, 1.5)).map(([x, z]) => ({ p: V(x, terrain.h(x, z) + 0.25, z), s: V(0.35, 0.25, 0.35), color: rand() < 0.5 ? '#c0392b' : '#d8b48a' }))));
  const falling = drift(scene, rand, { count: 800, rMax: 62, y0: L, y1: L + 22, color: '#ff9a3c', size: 0.3, speed: 0.8, fall: 1.1, opacity: 0.9 });
  return { walkables: [terrain.mesh], trails, trailLength: trails.length, update: (dt, t) => falling(dt, t, 1) };
}

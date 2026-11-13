// Aetherion's ten ecosystems stacked inside the trunk, one every 33.3 m, bottom to top
// (the order of the design document's altitudes):
//   Floresta das Raízes       glowing mushrooms, ferns, small trees, fireflies
//   Deserto da Casca          dunes of sediment, wood canyons, succulents and cacti
//   Oceano Interior           a lake with fossil-wood islands, coral beds, boardwalks
//   Fornalha de Ignar         black rock, lava channels (no-go), basalt, embers (more.js)
//   Selva dos Gigantes        palms, giant leaves, hanging vines, a stepped temple (more.js)
//   Pântano da Decomposição   black water, rotting logs, fungi, spores (aetherion.js)
//   Reino dos Cristais        glowing crystal clusters, quartz pillars (aetherion.js)
//   Nivéria                   snow, conifers, ice crystals, a frozen lake
//   Floresta Suspensa         small trees, bromeliads, giant nests, creepers (aetherion.js)
//   Jardim da Copa            flower fields and giant flowers under the open sky
// Each one is a terrain disk you can walk anywhere on, with marked trails from every entry
// (ramp junction, level bridges, trunk entrances) to a landmark in the middle.
import * as THREE from 'three';
import { mulberry32 } from '../noise.js';
import { SEED, BIOMES, ENTRANCES, DISK_R, SLAB, LEVEL_STEP, junctionAngle } from '../tree/layout.js';
import { V, polar, instances, label } from '../geom.js';
import { makeTerrain, makeTrails, scatter, ceiling, noise2, entryAngles, drift, fernGeometry, lerpColor, std } from './common.js';
import { jungle, volcano } from './more.js';
import { swamp, crystals, suspended, corals, giantFlowers } from './aetherion.js';


export function buildBiomes(scene, mats) {
  const walkables = [];
  const updates = [];
  const noGo = [];
  const paths = {};
  let trailLength = 0;
  const builders = { raizes: forest, deserto: canyon, oceano: ocean, fornalha: volcano, selva: jungle, pantano: swamp, cristais: crystals, niveria: ice, suspensa: suspended, copa: meadow };
  const terrains = {};
  BIOMES.forEach((b, i) => {
    const rand = mulberry32(SEED + 100 + i);
    const out = builders[b.id]({ scene, mats, rand, b });
    walkables.push(...out.walkables);
    if (out.update) updates.push(out.update);
    if (out.noGo) noGo.push(out.noGo);
    trailLength += out.trailLength;
    terrains[b.id] = out.h;
    paths[b.id] = out.trails.lines.map((l) => l.map((p) => ({ x: p.x, z: p.z })));
    out.trails.meshes.forEach((m) => scene.add(m));
    if (i < BIOMES.length - 1) ceiling(scene, { rand, top: BIOMES[i + 1].level, below: b, mats });
    scene.add(label(b.name, b.color, polar(DISK_R - 8, junctionAngle(b.level), b.level + 6), 22));
  });
  return { walkables, trailLength, noGo, paths, terrains, update: (dt, t) => updates.forEach((u) => u(dt, t)) };
}

// ---------------------------------------------------------------------------
function forest({ scene, mats, rand, b }) {
  const L = b.level, R = 104;
  const terrain = makeTerrain({
    level: L, radius: R, flatFrom: 54, name: 'biome-raizes',
    height: (x, z) => (noise2(x, z, 0.035, 1) - 0.5) * 4 + Math.max(0, noise2(x, z, 0.08, 2) - 0.6) * 6,
    color: (x, z, h, c) => lerpColor(c, '#3d5a26', '#6b8f3a', noise2(x, z, 0.1, 3) * 1.4 - 0.2).lerp(new THREE.Color('#4a3a28'), Math.max(0, -h) * 0.3),
    material: mats.terrain,
  });
  scene.add(terrain.mesh);
  const trails = makeTrails({ rand, h: terrain.h, entries: [junctionAngle(0)], entryR: 62, loopR: 42, material: mats.trailDirt });
  // spokes to every trunk entrance as well
  const more = makeTrails({ rand, h: terrain.h, entries: ENTRANCES, entryR: 98, loopR: 30, material: mats.trailDirt, withPlaza: false });
  trails.meshes.push(...more.meshes);
  const near = (x, z, d) => trails.near(x, z, d) || more.near(x, z, d);
  const free = (x, z, d = 3.5) => {
    const r = Math.hypot(x, z);
    return r > 15 && !(r > 56 && r < 82) && !near(x, z, d);
  };

  const trees = scatter(rand, 42, 15, 96, (x, z) => free(x, z, 6));
  scene.add(instances(new THREE.CylinderGeometry(0.35, 0.6, 1, 8).translate(0, 0.5, 0), mats.barkStatic,
    trees.map(([x, z]) => ({ p: V(x, terrain.h(x, z), z), s: V(1.2, 6 + rand() * 4, 1.2) }))));
  const crowns = [];
  trees.forEach(([x, z]) => {
    const top = terrain.h(x, z) + 7;
    for (let k = 0; k < 4; k++) crowns.push({ p: V(x + (rand() - 0.5) * 5, top + rand() * 4, z + (rand() - 0.5) * 5), s: 3 + rand() * 2.5, color: ['#3f6b2a', '#4f7d30', '#2f5a24'][k % 3] });
  });
  scene.add(instances(new THREE.IcosahedronGeometry(1, 1), std({ flatShading: true, roughness: 0.8 }), crowns));

  const fern = fernGeometry();
  scene.add(instances(fern, std({ side: THREE.DoubleSide, roughness: 0.7 }),
    scatter(rand, 320, 8, 100, (x, z) => free(x, z, 2)).map(([x, z]) => ({ p: V(x, terrain.h(x, z), z), s: 1 + rand() * 1.8, rot: [0, rand() * 6, 0], color: ['#4f8a35', '#6aa03e', '#3d7030'][(rand() * 3) | 0] }))));

  // glowing mushrooms: pale stems, caps that light up
  const shrooms = scatter(rand, 90, 14, 96, (x, z) => free(x, z, 2.5));
  const capColors = ['#4ff0ff', '#ffb347', '#ff6ad5', '#9dff6a'];
  const stems = [], caps = [];
  shrooms.forEach(([x, z]) => {
    const h = 0.8 + Math.pow(rand(), 2) * 4, cap = 0.6 + h * 0.6, y = terrain.h(x, z);
    stems.push({ p: V(x, y, z), s: V(0.15 + h * 0.06, h, 0.15 + h * 0.06), color: '#e9e2cf' });
    caps.push({ p: V(x, y + h, z), s: V(cap, cap * 0.55, cap), color: new THREE.Color(capColors[(rand() * 4) | 0]).multiplyScalar(1.6) });
  });
  // the landmark: one giant mushroom in the middle
  stems.push({ p: V(0, terrain.h(0, 0), 0), s: V(1.6, 13, 1.6), color: '#efe6d0' });
  caps.push({ p: V(0, terrain.h(0, 0) + 13, 0), s: V(11, 5, 11), color: new THREE.Color('#4ff0ff').multiplyScalar(1.3) });
  scene.add(instances(new THREE.CylinderGeometry(1, 1.2, 1, 10).translate(0, 0.5, 0), std({ roughness: 0.6 }), stems));
  scene.add(instances(new THREE.SphereGeometry(1, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshBasicMaterial({ color: '#ffffff' }), caps));
  const glow = new THREE.PointLight('#7ff6ff', 1800, 0, 2);
  glow.position.set(0, 13, 0);
  scene.add(glow);

  scene.add(instances(new THREE.DodecahedronGeometry(1, 0), std({ color: '#6c7660', flatShading: true }),
    scatter(rand, 45, 12, 98, (x, z) => free(x, z, 3)).map(([x, z]) => ({ p: V(x, terrain.h(x, z), z), s: V(1 + rand() * 2.5, 0.6 + rand() * 1.4, 1 + rand() * 2.5), rot: [rand(), rand() * 6, rand()] }))));

  const flies = drift(scene, rand, { count: 500, rMax: 90, y0: L + 0.5, y1: L + 14, color: '#d8ff7a', size: 0.25, speed: 0.6 });
  return { h: terrain.h, walkables: [terrain.mesh], trails, trailLength: trails.length + more.length, update: (dt, t) => flies(dt, t, 0.5 + 0.5 * Math.sin(t * 2.3)) };
}

// ---------------------------------------------------------------------------
function ocean({ scene, mats, rand, b }) {
  const L = b.level, W = -1.2;
  const lakeDepth = (x, z) => {
    const r = Math.hypot(x, z);
    const n = noise2(x, z, 0.035, 11);
    const s = Math.min(1, Math.max(0, (n - 0.44) / 0.035));     // steep banks: you can't wade in
    return s * 4 * Math.min(1, Math.max(0, (r - 16) / 6));      // keep the middle dry
  };
  const terrain = makeTerrain({
    level: L, name: 'biome-oceano',
    height: (x, z) => (noise2(x, z, 0.05, 12) - 0.5) * 1.6 - lakeDepth(x, z),
    color: (x, z, h, c) => {
      if (h < W - 0.3) return c.set('#1f3b3a');
      if (h < W + 0.5) return c.set('#9b8f6a');
      return lerpColor(c, '#4f7a3a', '#7aa04a', noise2(x, z, 0.12, 13));
    },
    material: mats.terrain,
  });
  scene.add(terrain.mesh);

  const water = new THREE.Mesh(new THREE.CircleGeometry(DISK_R - 5, 96),
    new THREE.MeshStandardMaterial({ color: '#2c7f8a', roughness: 0.08, metalness: 0.1, transparent: true, opacity: 0.82, emissive: '#0d3c44', emissiveIntensity: 0.6 }));
  water.rotation.x = -Math.PI / 2;
  water.position.y = L + W;
  scene.add(water);

  // every trail here is a boardwalk, raised over the water and walkable
  const deck = (x, z) => Math.max(terrain.h(x, z), L + W + 0.7);
  const trails = makeTrails({ rand, h: terrain.h, surface: deck, entries: entryAngles(L), loopR: 42, material: mats.planks, lift: 0.12, width: 3.2 });
  trails.meshes.forEach((m) => { m.castShadow = true; });
  const inWater = (x, z) => terrain.h(x, z) < L + W - 0.2;
  corals(scene, rand, terrain.h, (x, z) => terrain.h(x, z) < L + W - 1.5 && !trails.near(x, z, 3));
  const free = (x, z, d) => Math.hypot(x, z) > 14 && !trails.near(x, z, d);

  const reeds = [];
  scatter(rand, 260, 14, 62, (x, z) => { const h = terrain.h(x, z) - L; return h > W - 1.5 && h < W + 0.6 && free(x, z, 2); }).forEach(([x, z]) => {
    for (let k = 0; k < 5; k++) reeds.push({ p: V(x + (rand() - 0.5) * 1.5, terrain.h(x, z), z + (rand() - 0.5) * 1.5), s: V(0.6, 1.6 + rand() * 2, 0.6), rot: [(rand() - 0.5) * 0.3, 0, (rand() - 0.5) * 0.3], color: ['#6f7d3a', '#8a8a45', '#5b6a30'][(rand() * 3) | 0] });
  });
  scene.add(instances(new THREE.ConeGeometry(0.06, 1, 4).translate(0, 0.5, 0), std({}), reeds));

  const pads = scatter(rand, 220, 16, 60, (x, z) => inWater(x, z) && free(x, z, 2.2));
  scene.add(instances(new THREE.CylinderGeometry(1, 1, 0.05, 14, 1, false, 0.3, Math.PI * 2 - 0.3), std({ roughness: 0.5 }),
    pads.map(([x, z]) => ({ p: V(x, L + W + 0.03, z), s: V(0.6 + rand(), 1, 0.6 + rand()), rot: [0, rand() * 6, 0], color: rand() < 0.5 ? '#3f7d3a' : '#4f8f45' }))));
  scene.add(instances(new THREE.SphereGeometry(0.3, 10, 8), new THREE.MeshBasicMaterial({ color: '#ffffff' }),
    pads.filter(() => rand() < 0.35).map(([x, z]) => ({ p: V(x, L + W + 0.2, z), s: 1, color: new THREE.Color(rand() < 0.5 ? '#ffb3d9' : '#fff2c4').multiplyScalar(1.3) })), { shadow: false }));

  const willows = scatter(rand, 20, 18, 60, (x, z) => !inWater(x, z) && terrain.h(x, z) > L + W + 0.5 && free(x, z, 6));
  scene.add(instances(new THREE.CylinderGeometry(0.4, 0.7, 1, 8).translate(0, 0.5, 0), mats.barkStatic,
    willows.map(([x, z]) => ({ p: V(x, terrain.h(x, z), z), s: V(1, 7, 1) }))));
  const drapes = [];
  willows.forEach(([x, z]) => {
    const y = terrain.h(x, z) + 6.5;
    for (let k = 0; k < 9; k++) { const a = (k / 9) * Math.PI * 2, d = 1.8 + rand() * 1.6; drapes.push({ p: V(x + Math.cos(a) * d, y - 2 - rand() * 1.5, z + Math.sin(a) * d), s: V(0.9, 3.5 + rand() * 1.5, 0.9), rot: [(rand() - 0.5) * 0.3, 0, (rand() - 0.5) * 0.3], color: ['#4f7a35', '#5f8a3e', '#6a9444'][k % 3] }); }
    drapes.push({ p: V(x, y + 0.5, z), s: V(3.6, 2, 3.6), color: '#557f3a' });
  });
  scene.add(instances(new THREE.IcosahedronGeometry(1, 1), std({ flatShading: true, roughness: 0.7 }), drapes));

  // landmark: a pavilion in the dry middle
  const y0 = terrain.h(0, 0);
  const posts = Array.from({ length: 8 }, (_, k) => ({ p: polar(7, (k / 8) * Math.PI * 2, y0), s: V(0.35, 6, 0.35) }));
  scene.add(instances(new THREE.CylinderGeometry(1, 1, 1, 8).translate(0, 0.5, 0), mats.wood, posts));
  const roof = new THREE.Mesh(new THREE.ConeGeometry(9.5, 4, 8), mats.wood);
  roof.position.set(0, y0 + 8, 0);
  roof.castShadow = true;
  scene.add(roof);
  const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.9, 16, 12), new THREE.MeshBasicMaterial({ color: new THREE.Color('#bff6ff').multiplyScalar(2) }));
  lamp.position.set(0, y0 + 4.5, 0);
  scene.add(lamp);

  const mist = drift(scene, rand, { count: 500, rMax: 62, y0: L + W + 0.2, y1: L + W + 3, color: '#dff6ff', size: 0.5, speed: 0.3, opacity: 0.35 });
  return {
    h: terrain.h, walkables: [terrain.mesh, ...trails.meshes], trails, trailLength: trails.length,
    // the water is not walkable: stay on the shore or the boardwalks
    noGo: (x, z, floor) => Math.abs(floor - L) < 12 && floor < L + W - 0.05 && Math.hypot(x, z) < DISK_R,
    update: (dt, t) => { mist(dt, t, 1); water.material.emissiveIntensity = 0.55 + Math.sin(t * 0.8) * 0.08; },
  };
}

// ---------------------------------------------------------------------------
function canyon({ scene, mats, rand, b }) {
  const L = b.level;
  const ridge = (x, z) => 1 - Math.abs(2 * noise2(x, z, 0.045, 21) - 1);
  const terrain = makeTerrain({
    level: L, name: 'biome-deserto',
    height: (x, z) => ridge(x, z) * 3.2 - 1.2 + (noise2(x, z, 0.15, 22) - 0.5) * 0.6,
    color: (x, z, h, c) => lerpColor(c, '#b5652f', '#e0a060', (h + 1.2) / 3.5),
    material: mats.terrain,
  });
  scene.add(terrain.mesh);
  const trails = makeTrails({ rand, h: terrain.h, entries: entryAngles(L), loopR: 40, material: mats.trailSand });
  const free = (x, z, d) => Math.hypot(x, z) > 15 && !trails.near(x, z, d);

  const rock = std({ flatShading: true, roughness: 0.95 });
  const mesas = [];
  scatter(rand, 26, 18, 60, (x, z) => free(x, z, 9)).forEach(([x, z]) => {
    const r = 3 + rand() * 6, h = 5 + Math.pow(rand(), 1.5) * 12, y = terrain.h(x, z) - 0.5;
    const tone = ['#9e4a2a', '#b85a32', '#c97a45'][(rand() * 3) | 0];
    mesas.push({ p: V(x, y, z), s: V(r, h, r), rot: [0, rand() * 6, 0], color: tone });
    if (rand() < 0.6) mesas.push({ p: V(x, y + h, z), s: V(r * 0.7, h * 0.35, r * 0.7), rot: [0, rand() * 6, 0], color: '#d08a50' });
  });
  scene.add(instances(new THREE.CylinderGeometry(1, 1.15, 1, 9).translate(0, 0.5, 0), rock, mesas));
  scene.add(instances(new THREE.DodecahedronGeometry(1, 0), rock,
    scatter(rand, 70, 15, 62, (x, z) => free(x, z, 3)).map(([x, z]) => ({ p: V(x, terrain.h(x, z), z), s: V(0.8 + rand() * 2, 0.6 + rand() * 1.6, 0.8 + rand() * 2), rot: [rand(), rand() * 6, rand()], color: '#a85a35' }))));

  // saguaro-style cacti: a trunk and two arms
  const cactusMat = std({ color: '#5d7d3a', roughness: 0.7 });
  const trunks = [], arms = [];
  scatter(rand, 50, 15, 62, (x, z) => free(x, z, 3)).forEach(([x, z]) => {
    const h = 3 + rand() * 4, y = terrain.h(x, z), a = rand() * 6;
    trunks.push({ p: V(x, y, z), s: V(0.45, h, 0.45) });
    for (const s of [-1, 1]) if (rand() < 0.8) arms.push({ p: V(x + Math.cos(a) * s * 0.85, y + h * (0.35 + rand() * 0.2), z + Math.sin(a) * s * 0.85), s: V(0.3, h * 0.45, 0.3) });
  });
  const cyl = new THREE.CylinderGeometry(1, 1, 1, 10).translate(0, 0.5, 0);
  scene.add(instances(cyl, cactusMat, trunks), instances(cyl, cactusMat, arms));

  // cairns marking the trails
  const cairns = [];
  trails.lines.forEach((line) => line.forEach((p, i) => {
    if (i % 9 !== 4) return;
    for (let k = 0; k < 3; k++) cairns.push({ p: V(p.x + 2.4, terrain.h(p.x + 2.4, p.z) + k * 0.45, p.z), s: V(0.55 - k * 0.12, 0.35, 0.55 - k * 0.12), rot: [0, rand() * 6, 0] });
  }));
  scene.add(instances(new THREE.DodecahedronGeometry(1, 0), std({ color: '#8f7a68', flatShading: true }), cairns));

  // landmark: a stone arch over the middle
  const arch = new THREE.Mesh(new THREE.TorusGeometry(11, 2, 12, 48, Math.PI), std({ color: '#b5552e', flatShading: true }));
  arch.position.set(0, terrain.h(0, 0) - 1, 0);
  arch.rotation.y = junctionAngle(L);
  arch.castShadow = arch.receiveShadow = true;
  scene.add(arch);

  const dust = drift(scene, rand, { count: 500, rMax: 62, y0: L, y1: L + 20, color: '#ffc89a', size: 0.18, speed: 2.5, opacity: 0.5 });
  return { h: terrain.h, walkables: [terrain.mesh], trails, trailLength: trails.length, update: (dt, t) => dust(dt, t, 1) };
}

// ---------------------------------------------------------------------------
function ice({ scene, mats, rand, b }) {
  const L = b.level;
  const terrain = makeTerrain({
    level: L, name: 'biome-niveria',
    height: (x, z) => {
      const r = Math.hypot(x, z);
      const hills = (noise2(x, z, 0.04, 31) - 0.5) * 5 + Math.max(0, noise2(x, z, 0.09, 32) - 0.55) * 7;
      return r < 13 ? 0 : hills * Math.min(1, (r - 13) / 8);                // flat frozen pond in the middle
    },
    color: (x, z, h, c) => lerpColor(c, '#c9d6e6', '#f4f8ff', (h + 1) / 4),
    material: mats.terrain,
  });
  scene.add(terrain.mesh);
  const pond = new THREE.Mesh(new THREE.CircleGeometry(12.5, 64), new THREE.MeshStandardMaterial({ color: '#a9d6f2', roughness: 0.05, metalness: 0.2, emissive: '#1a3a55', emissiveIntensity: 0.4 }));
  pond.rotation.x = -Math.PI / 2;
  pond.position.y = L + 0.04;
  pond.receiveShadow = true;
  scene.add(pond);
  const trails = makeTrails({ rand, h: terrain.h, entries: entryAngles(L), loopR: 42, material: mats.trailSnow });
  const free = (x, z, d) => Math.hypot(x, z) > 15 && !trails.near(x, z, d);

  // frosted pines: three stacked cones, each with a snow cap
  const pines = scatter(rand, 55, 16, 62, (x, z) => free(x, z, 4));
  const greens = [], snow = [];
  pines.forEach(([x, z]) => {
    const h = 6 + rand() * 8, y = terrain.h(x, z);
    for (let k = 0; k < 3; k++) {
      const w = (1 - k * 0.28) * h * 0.32, base = y + h * (0.15 + k * 0.25);
      greens.push({ p: V(x, base, z), s: V(w, h * 0.45, w), color: '#2c4a36' });
      snow.push({ p: V(x, base + h * 0.12, z), s: V(w * 0.85, h * 0.36, w * 0.85), color: '#f2f7ff' });
    }
  });
  const cone = new THREE.ConeGeometry(1, 1, 9).translate(0, 0.5, 0);
  scene.add(instances(cone, std({ roughness: 0.85 }), greens), instances(cone, std({ roughness: 0.6 }), snow));

  const crystalMat = new THREE.MeshStandardMaterial({ color: '#b9e3ff', roughness: 0.1, metalness: 0.1, transparent: true, opacity: 0.8, emissive: '#3a90ff', emissiveIntensity: 0.6 });
  const crystals = scatter(rand, 70, 15, 62, (x, z) => free(x, z, 3)).map(([x, z]) => ({
    p: V(x, terrain.h(x, z), z), s: V(0.6 + rand(), 2 + rand() * 6, 0.6 + rand()), rot: [(rand() - 0.5) * 0.7, rand() * 6, (rand() - 0.5) * 0.7],
  }));
  // landmark: a cluster of huge crystals at the edge of the pond
  for (let k = 0; k < 9; k++) crystals.push({ p: polar(14 + rand() * 2, (k / 9) * Math.PI * 2, L), s: V(2 + rand() * 1.5, 7 + rand() * 7, 2 + rand() * 1.5), rot: [(rand() - 0.5) * 0.5, rand() * 6, (rand() - 0.5) * 0.5] });
  scene.add(instances(new THREE.OctahedronGeometry(1, 0), crystalMat, crystals));

  const snowfall = drift(scene, rand, { count: 1600, rMax: 64, y0: L, y1: L + LEVEL_STEP - SLAB, color: '#ffffff', size: 0.16, speed: 0, fall: 2.2, opacity: 0.9 });
  return { h: terrain.h, walkables: [terrain.mesh], trails, trailLength: trails.length, update: (dt, t) => snowfall(dt, t, 1) };
}

// ---------------------------------------------------------------------------
function meadow({ scene, mats, rand, b }) {
  const L = b.level;
  const terrain = makeTerrain({
    level: L, name: 'biome-copa',
    height: (x, z) => (noise2(x, z, 0.04, 41) - 0.5) * 2.5,
    color: (x, z, h, c) => lerpColor(c, '#5f8a35', '#9bb84a', noise2(x, z, 0.08, 42)),
    material: mats.terrain,
  });
  scene.add(terrain.mesh);
  const trails = makeTrails({ rand, h: terrain.h, entries: entryAngles(L), loopR: 40, material: mats.trailDirt });
  const free = (x, z, d) => Math.hypot(x, z) > 14 && !trails.near(x, z, d);

  const flowerColors = ['#e23b3b', '#f2c230', '#f5f2e8', '#9b5de5', '#ff7aa8', '#4aa3ff'];
  scene.add(instances(new THREE.IcosahedronGeometry(0.14, 1), new THREE.MeshStandardMaterial({ roughness: 0.6 }),
    scatter(rand, 5000, 10, 63, (x, z) => free(x, z, 1.8)).map(([x, z]) => ({ p: V(x, terrain.h(x, z) + 0.4, z), s: 0.7 + rand() * 0.6, color: flowerColors[(rand() * flowerColors.length) | 0] })), { shadow: false }));
  scene.add(instances(new THREE.ConeGeometry(0.05, 1, 3).translate(0, 0.5, 0), std({ roughness: 1 }),
    scatter(rand, 5000, 8, 64, (x, z) => free(x, z, 1.6)).map(([x, z]) => ({ p: V(x, terrain.h(x, z), z), s: V(1, 0.4 + rand() * 0.6, 1), rot: [(rand() - 0.5) * 0.4, rand() * 6, 0], color: rand() < 0.5 ? '#7d9a3e' : '#a3b555' })), { shadow: false }));

  // young olive trees
  const saplings = scatter(rand, 14, 18, 58, (x, z) => free(x, z, 6));
  scene.add(instances(new THREE.CylinderGeometry(0.3, 0.5, 1, 8).translate(0, 0.5, 0), mats.barkStatic, saplings.map(([x, z]) => ({ p: V(x, terrain.h(x, z), z), s: V(1, 4, 1) }))));
  const blobs = [];
  saplings.forEach(([x, z]) => { for (let k = 0; k < 5; k++) blobs.push({ p: V(x + (rand() - 0.5) * 4, terrain.h(x, z) + 5 + rand() * 2, z + (rand() - 0.5) * 4), s: V(2.4, 1.6, 2.4), color: '#68724c' }); });
  scene.add(instances(new THREE.IcosahedronGeometry(1, 1), std({ flatShading: true }), blobs));

  giantFlowers(scene, rand, terrain.h, free);

  // landmark: a ring of standing stones
  const stones = Array.from({ length: 11 }, (_, k) => ({ p: polar(9, (k / 11) * Math.PI * 2, terrain.h(0, 0) - 0.3), s: V(1.3, 5 + rand() * 3, 0.8), rot: [0, (k / 11) * Math.PI * 2, (rand() - 0.5) * 0.1], color: '#9a958a' }));
  scene.add(instances(new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0), std({ flatShading: true }), stones));

  return { h: terrain.h, walkables: [terrain.mesh], trails, trailLength: trails.length };
}

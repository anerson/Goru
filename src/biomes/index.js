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
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { lumpy, boulder } from '../organic.js';
import { mulberry32 } from '../noise.js';
import { SEED, BIOMES, ENTRANCES, DISK_R, SLAB, LEVEL_STEP, junctionAngle } from '../tree/layout.js';
import { V, polar, instances, label } from '../geom.js';
import { makeTerrain, makeTrails, scatter, ceiling, noise2, entryAngles, drift, fernGeometry, lerpColor, std, trunkGeometry, capGeometry, capSpotsGeometry, stemGeometry, cactusGeometry, mesaGeometry, menhirGeometry, obstacleList, facet } from './common.js';
import { jungle, volcano } from './more.js';
import { landscapeObstacles } from '../landscape.js';
import { swamp, crystals, suspended, corals, giantFlowers } from './aetherion.js';


export function buildBiomes(scene, mats) {
  const walkables = [];
  const updates = [];
  const noGo = [];
  const paths = {};
  let trailLength = 0;
  const builders = { raizes: forest, deserto: canyon, oceano: ocean, fornalha: volcano, selva: jungle, pantano: swamp, cristais: crystals, niveria: ice, suspensa: suspended, copa: meadow };
  const terrains = {};
  const obstacles = {};
  BIOMES.forEach((b, i) => {
    const rand = mulberry32(SEED + 100 + i);
    const out = builders[b.id]({ scene, mats, rand, b });
    walkables.push(...out.walkables);
    if (out.update) updates.push(out.update);
    if (out.noGo) noGo.push(out.noGo);
    trailLength += out.trailLength;
    terrains[b.id] = out.h;
    obstacles[b.id] = out.obstacles ?? [];
    paths[b.id] = out.trails.lines.map((l) => l.map((p) => ({ x: p.x, z: p.z })));
    out.trails.meshes.forEach((m) => scene.add(m));
    if (i < BIOMES.length - 1) ceiling(scene, { rand, top: BIOMES[i + 1].level, below: b, mats });
    scene.add(label(b.name, b.color, polar(DISK_R - 8, junctionAngle(b.level), b.level + 6), 22));
  });
  obstacles.fora = landscapeObstacles;
  return { walkables, trailLength, noGo, paths, terrains, obstacles, update: (dt, t) => updates.forEach((u) => u(dt, t)) };
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

  const obs = obstacleList(near);
  const trees = scatter(rand, 42, 15, 96, (x, z) => free(x, z, 6));
  scene.add(instances(trunkGeometry(1), mats.barkStatic,
    trees.map(([x, z]) => { obs.add(x, z, 1.0); return { p: V(x, terrain.h(x, z) - 0.2, z), s: V(2.2, 7 + rand() * 4, 2.2), rot: [0, rand() * 6, 0] }; })));
  // crowns: a big dark mass under lighter lumps on top, so each tree reads as layered foliage
  const crowns = [], tops = [];
  trees.forEach(([x, z]) => {
    const top = terrain.h(x, z) + 7.5;
    for (let k = 0; k < 4; k++) { const a = k * 1.7 + rand(); crowns.push({ p: V(x + Math.cos(a) * 2.2, top + rand() * 1.5, z + Math.sin(a) * 2.2), s: V(3 + rand() * 1.5, 2.4 + rand(), 3 + rand() * 1.5), rot: [0, rand() * 6, 0], color: ['#2f5a24', '#3a6a28', '#355f26'][k % 3] }); }
    for (let k = 0; k < 3; k++) { const a = k * 2.1 + rand(); tops.push({ p: V(x + Math.cos(a) * 1.4, top + 2.4 + rand() * 1.2, z + Math.sin(a) * 1.4), s: 2 + rand() * 1.3, rot: [0, rand() * 6, 0], color: ['#5f8f34', '#6e9c3a', '#4f8030'][k % 3] }); }
  });
  scene.add(instances(lumpy({ detail: 2, amp: 0.25, seed: 1 }), std({ roughness: 0.85 }), crowns));
  scene.add(instances(lumpy({ detail: 2, amp: 0.22, seed: 7 }), std({ roughness: 0.8 }), tops));

  const fern = fernGeometry();
  scene.add(instances(fern, std({ side: THREE.DoubleSide, roughness: 0.7 }),
    scatter(rand, 320, 8, 100, (x, z) => free(x, z, 2)).map(([x, z]) => ({ p: V(x, terrain.h(x, z), z), s: 1 + rand() * 1.8, rot: [0, rand() * 6, 0], color: ['#4f8a35', '#6aa03e', '#3d7030'][(rand() * 3) | 0] }))));

  // glowing mushrooms: pale stems, caps that light up
  const shrooms = scatter(rand, 90, 14, 96, (x, z) => free(x, z, 2.5));
  const capColors = ['#4ff0ff', '#ffb347', '#ff6ad5', '#9dff6a'];
  const stems = [], caps = [], spots = [];
  const tilt = () => [(rand() - 0.5) * 0.25, rand() * 6, (rand() - 0.5) * 0.25];
  shrooms.forEach(([x, z]) => {
    const h = 0.8 + Math.pow(rand(), 2) * 4, cap = 0.6 + h * 0.6, y = terrain.h(x, z), rot = tilt();
    stems.push({ p: V(x, y, z), s: V(0.15 + h * 0.06, h, 0.15 + h * 0.06), color: '#e9e2cf' });
    const top = V(0, h * 0.97, 0).applyEuler(new THREE.Euler(rot[0], 0, rot[2])).add(V(x, y, z));
    caps.push({ p: top, s: V(cap, cap * 0.6, cap), rot, color: new THREE.Color(capColors[(rand() * 4) | 0]).multiplyScalar(1.6) });
    spots.push({ p: top, s: V(cap, cap * 0.6, cap), rot, color: '#fff8e6' });
    if (h > 3) obs.add(x, z, 0.15 + h * 0.06 + 0.2);
  });
  // the landmark: one giant mushroom in the middle
  stems.push({ p: V(0, terrain.h(0, 0), 0), s: V(1.6, 13, 1.6), color: '#efe6d0' });
  caps.push({ p: V(0, terrain.h(0, 0) + 12.6, 0), s: V(11, 5.5, 11), color: new THREE.Color('#4ff0ff').multiplyScalar(1.3) });
  spots.push({ p: V(0, terrain.h(0, 0) + 12.6, 0), s: V(11, 5.5, 11), color: '#fff8e6' });
  obs.add(0, 0, 1.9);
  scene.add(instances(stemGeometry(), std({ roughness: 0.6 }), stems));
  scene.add(instances(capGeometry(), new THREE.MeshBasicMaterial({ color: '#ffffff' }), caps));
  scene.add(instances(capSpotsGeometry(), std({ roughness: 0.5 }), spots, { shadow: false }));
  const glow = new THREE.PointLight('#7ff6ff', 1800, 0, 2);
  glow.position.set(0, 13, 0);
  scene.add(glow);

  // mossy boulders: grey stone with a green cap of moss on top
  const rocks = scatter(rand, 45, 12, 98, (x, z) => free(x, z, 3)).map(([x, z]) => {
    const sx = 1 + rand() * 2.5, sz = 1 + rand() * 2.5, sy = 0.6 + rand() * 1.4;
    if (sy > 1.1) obs.add(x, z, Math.min(sx, sz) * 0.85);
    return { p: V(x, terrain.h(x, z), z), s: V(sx, sy, sz), rot: [(rand() - 0.5) * 0.3, rand() * 6, (rand() - 0.5) * 0.3], color: ['#6c7660', '#7a8070', '#636a58'][(rand() * 3) | 0] };
  });
  scene.add(instances(boulder(4), std({ roughness: 0.9 }), rocks));
  scene.add(instances(lumpy({ detail: 2, amp: 0.2, seed: 12, flatten: 0.35 }), std({ roughness: 1 }),
    rocks.map((r) => ({ p: r.p.clone().setY(r.p.y + r.s.y * 0.6), s: V(r.s.x * 0.66, r.s.y * 0.55, r.s.z * 0.66), rot: r.rot, color: '#5a8a35' })), { shadow: false }));

  const flies = drift(scene, rand, { count: 500, rMax: 90, y0: L + 0.5, y1: L + 14, color: '#d8ff7a', size: 0.25, speed: 0.6 });
  return { h: terrain.h, walkables: [terrain.mesh], trails, trailLength: trails.length + more.length, obstacles: obs.list, update: (dt, t) => flies(dt, t, 0.5 + 0.5 * Math.sin(t * 2.3)) };
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

  const obs = obstacleList(trails.near);
  const willows = scatter(rand, 20, 18, 60, (x, z) => !inWater(x, z) && terrain.h(x, z) > L + W + 0.5 && free(x, z, 6));
  scene.add(instances(trunkGeometry(4), mats.barkStatic,
    willows.map(([x, z]) => { obs.add(x, z, 0.9); return { p: V(x, terrain.h(x, z) - 0.2, z), s: V(1.9, 7.2, 1.9), rot: [0, rand() * 6, 0] }; })));
  const drapes = [];
  willows.forEach(([x, z]) => {
    const y = terrain.h(x, z) + 6.5;
    for (let k = 0; k < 9; k++) { const a = (k / 9) * Math.PI * 2, d = 1.8 + rand() * 1.6; drapes.push({ p: V(x + Math.cos(a) * d, y - 2 - rand() * 1.5, z + Math.sin(a) * d), s: V(0.9, 3.5 + rand() * 1.5, 0.9), rot: [(rand() - 0.5) * 0.3, 0, (rand() - 0.5) * 0.3], color: ['#4f7a35', '#5f8a3e', '#6a9444'][k % 3] }); }
    drapes.push({ p: V(x, y + 0.5, z), s: V(3.6, 2, 3.6), color: '#557f3a' });
  });
  scene.add(instances(lumpy({ detail: 2, amp: 0.22, seed: 2 }), std({ roughness: 0.75 }), drapes));

  // landmark: a pavilion in the dry middle
  const y0 = terrain.h(0, 0);
  const posts = Array.from({ length: 8 }, (_, k) => ({ p: polar(7, (k / 8) * Math.PI * 2, y0), s: V(0.35, 6, 0.35) }));
  scene.add(instances(new THREE.CylinderGeometry(1, 1, 1, 12).translate(0, 0.5, 0), mats.wood, posts));
  posts.forEach(({ p }) => obs.add(p.x, p.z, 0.5));
  // a curved pagoda roof with a turned-up rim
  const roof = new THREE.Mesh(new THREE.LatheGeometry([[0, 2.4], [1.2, 2.1], [4, 0.9], [8, -0.1], [9.8, -0.35], [10.2, 0.1], [9.6, -0.6], [0, -0.6]].map(([r, y]) => new THREE.Vector2(r, y)), 16), std({ color: '#3f7a6a', roughness: 0.7 }));
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
    obstacles: obs.list,
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

  const rock = std({ roughness: 0.95 });
  const obs = obstacleList(trails.near);
  const mesas = [];
  scatter(rand, 26, 18, 60, (x, z) => free(x, z, 9)).forEach(([x, z]) => {
    const r = 3 + rand() * 6, h = 5 + Math.pow(rand(), 1.5) * 12, y = terrain.h(x, z) - 0.5;
    const tone = ['#9e4a2a', '#b85a32', '#c97a45'][(rand() * 3) | 0];
    mesas.push({ p: V(x, y, z), s: V(r, h, r), rot: [0, rand() * 6, 0], color: tone });
    if (rand() < 0.6) mesas.push({ p: V(x, y + h - 0.2, z), s: V(r * 0.62, h * 0.35, r * 0.62), rot: [0, rand() * 6, 0], color: '#d89a5c' });
    obs.add(x, z, r * 1.05);
  });
  scene.add(instances(mesaGeometry(3), std({ roughness: 0.95, vertexColors: true }), mesas));
  scene.add(instances(boulder(5), rock,
    scatter(rand, 70, 15, 62, (x, z) => free(x, z, 3)).map(([x, z]) => {
      const sx = 0.8 + rand() * 2, sy = 0.6 + rand() * 1.6, sz = 0.8 + rand() * 2;
      if (sy > 1.2) obs.add(x, z, Math.min(sx, sz) * 0.85);
      return { p: V(x, terrain.h(x, z), z), s: V(sx, sy, sz), rot: [(rand() - 0.5) * 0.4, rand() * 6, (rand() - 0.5) * 0.4], color: ['#a85a35', '#b86a40', '#94502e'][(rand() * 3) | 0] };
    })));

  // saguaro-style cacti: a trunk and two arms
  const cactusMat = std({ roughness: 0.7 });
  const cacti = [], blooms = [];
  scatter(rand, 50, 15, 62, (x, z) => free(x, z, 3)).forEach(([x, z]) => {
    const h = 3 + rand() * 4, y = terrain.h(x, z), w = h * (0.9 + rand() * 0.3);
    cacti.push({ p: V(x, y - 0.1, z), s: V(w, h, w), rot: [0, rand() * 6, 0], color: ['#5d7d3a', '#6a8a40', '#4f7034'][(rand() * 3) | 0] });
    blooms.push({ p: V(x, y + h * 0.99, z), s: 0.18 + rand() * 0.1, color: new THREE.Color(['#ff6fa8', '#ffd23f', '#ff8a3a'][(rand() * 3) | 0]).multiplyScalar(1.2) });
    obs.add(x, z, h * 0.13);
  });
  scene.add(instances(cactusGeometry(), cactusMat, cacti));
  scene.add(instances(new THREE.IcosahedronGeometry(1, 1), new THREE.MeshBasicMaterial({ color: '#ffffff' }), blooms, { shadow: false }));

  // cairns marking the trails
  const cairns = [];
  trails.lines.forEach((line) => line.forEach((p, i) => {
    if (i % 9 !== 4) return;
    for (let k = 0; k < 3; k++) cairns.push({ p: V(p.x + 2.4, terrain.h(p.x + 2.4, p.z) + k * 0.45, p.z), s: V(0.55 - k * 0.12, 0.35, 0.55 - k * 0.12), rot: [0, rand() * 6, 0] });
  }));
  scene.add(instances(boulder(6), std({ color: '#8f7a68', roughness: 0.9 }), cairns));

  // landmark: a stone arch over the middle
  const arch = new THREE.Mesh(new THREE.TorusGeometry(11, 2, 16, 64, Math.PI), std({ color: '#b5552e', roughness: 0.9 }));
  arch.position.set(0, terrain.h(0, 0) - 1, 0);
  arch.rotation.y = junctionAngle(L);
  arch.castShadow = arch.receiveShadow = true;
  scene.add(arch);
  for (const s of [-1, 1]) obs.add(Math.cos(junctionAngle(L)) * 11 * s, -Math.sin(junctionAngle(L)) * 11 * s, 2.2);

  const dust = drift(scene, rand, { count: 500, rMax: 62, y0: L, y1: L + 20, color: '#ffc89a', size: 0.18, speed: 2.5, opacity: 0.5 });
  return { h: terrain.h, walkables: [terrain.mesh], trails, trailLength: trails.length, obstacles: obs.list, update: (dt, t) => dust(dt, t, 1) };
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
  const obs = obstacleList(trails.near);
  const pines = scatter(rand, 55, 16, 62, (x, z) => free(x, z, 4));
  const greens = [], snow = [], pineTrunks = [];
  // a pine tier: a cone with a scalloped, drooping skirt; snow sits on its upper half
  const tier = (() => {
    const g = new THREE.ConeGeometry(1, 1, 16, 3).translate(0, 0.5, 0);
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), y = p.getY(i), z = p.getZ(i), a = Math.atan2(z, x);
      const droop = y < 0.05 ? -0.08 * (1 + Math.cos(a * 8)) : 0;
      const k = 1 + (y < 0.05 ? Math.cos(a * 8) * 0.06 : 0);
      p.setXYZ(i, x * k, y + droop, z * k);
    }
    g.computeVertexNormals();
    return g;
  })();
  pines.forEach(([x, z]) => {
    const h = 6 + rand() * 8, y = terrain.h(x, z), dark = rand() < 0.5 ? '#2c4a36' : '#2f5540';
    pineTrunks.push({ p: V(x, y - 0.1, z), s: V(0.9, h * 0.35, 0.9), rot: [0, rand() * 6, 0] });
    for (let k = 0; k < 3; k++) {
      const w = (1 - k * 0.28) * h * 0.32, base = y + h * (0.15 + k * 0.25);
      greens.push({ p: V(x, base, z), s: V(w, h * 0.45, w), color: dark });
      snow.push({ p: V(x, base + h * 0.2, z), s: V(w * 0.66, h * 0.3, w * 0.66), color: '#f2f7ff' });
    }
    obs.add(x, z, 0.7);
  });
  scene.add(instances(trunkGeometry(2, 4), mats.barkStatic, pineTrunks));
  scene.add(instances(tier, std({ roughness: 0.85 }), greens), instances(tier, std({ roughness: 0.6 }), snow));

  const crystalMat = new THREE.MeshStandardMaterial({ color: '#b9e3ff', roughness: 0.1, metalness: 0.1, transparent: true, opacity: 0.8, emissive: '#3a90ff', emissiveIntensity: 0.6 });
  // ice crystals grow in clusters: a tall one with smaller ones leaning out around it
  const crystals = [];
  scatter(rand, 26, 15, 62, (x, z) => free(x, z, 3.5)).forEach(([x, z]) => {
    const y = terrain.h(x, z), H = 2.5 + rand() * 5;
    crystals.push({ p: V(x, y, z), s: V(0.6 + rand() * 0.4, H, 0.6 + rand() * 0.4), rot: [(rand() - 0.5) * 0.2, rand() * 6, (rand() - 0.5) * 0.2] });
    for (let k = 0; k < 3; k++) { const a = rand() * 6; crystals.push({ p: V(x + Math.cos(a) * 0.7, y, z + Math.sin(a) * 0.7), s: V(0.35 + rand() * 0.3, H * (0.3 + rand() * 0.3), 0.35 + rand() * 0.3), rot: [Math.sin(a) * 0.6, rand() * 6, -Math.cos(a) * 0.6] }); }
    if (H > 4) obs.add(x, z, 1.0);
  });
  // landmark: a cluster of huge crystals at the edge of the pond
  for (let k = 0; k < 9; k++) { const c = { p: polar(14 + rand() * 2, (k / 9) * Math.PI * 2, L), s: V(2 + rand() * 1.5, 7 + rand() * 7, 2 + rand() * 1.5), rot: [(rand() - 0.5) * 0.5, rand() * 6, (rand() - 0.5) * 0.5] }; crystals.push(c); obs.add(c.p.x, c.p.z, c.s.x * 0.75); }
  // a hexagonal prism with a pointed tip (faceted normals, like cut ice)
  const prism = facet(new THREE.CylinderGeometry(0.55, 0.7, 0.75, 6).translate(0, 0.375, 0)).clone();
  const tip = facet(new THREE.ConeGeometry(0.55, 0.3, 6).translate(0, 0.9, 0));
  const shard = mergeGeometries([prism, tip].map((g) => { g.deleteAttribute('uv'); return g; }));
  scene.add(instances(shard, crystalMat, crystals));

  const snowfall = drift(scene, rand, { count: 1600, rMax: 64, y0: L, y1: L + LEVEL_STEP - SLAB, color: '#ffffff', size: 0.16, speed: 0, fall: 2.2, opacity: 0.9 });
  return { h: terrain.h, walkables: [terrain.mesh], trails, trailLength: trails.length, obstacles: obs.list, update: (dt, t) => snowfall(dt, t, 1) };
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
  const obs = obstacleList(trails.near);
  const saplings = scatter(rand, 14, 18, 58, (x, z) => free(x, z, 6));
  scene.add(instances(trunkGeometry(3), mats.barkStatic, saplings.map(([x, z]) => { obs.add(x, z, 0.7); return { p: V(x, terrain.h(x, z) - 0.15, z), s: V(1.5, 5, 1.5), rot: [0, rand() * 6, 0] }; })));
  const blobs = [];
  saplings.forEach(([x, z]) => {
    for (let k = 0; k < 5; k++) { const a = k * 1.3 + rand(); blobs.push({ p: V(x + Math.cos(a) * 1.8, terrain.h(x, z) + 5 + rand() * 1.5, z + Math.sin(a) * 1.8), s: V(2.4, 1.6, 2.4), rot: [0, rand() * 6, 0], color: ['#68724c', '#7a8456', '#5d6844'][k % 3] }); }
    blobs.push({ p: V(x, terrain.h(x, z) + 7, z), s: V(2, 1.5, 2), color: '#8a9460' });
  });
  scene.add(instances(lumpy({ detail: 2, amp: 0.2, seed: 3 }), std({ roughness: 0.8 }), blobs));

  giantFlowers(scene, rand, terrain.h, free, 18, obs);

  // landmark: a ring of weathered standing stones
  const stones = Array.from({ length: 11 }, (_, k) => ({ p: polar(9, (k / 11) * Math.PI * 2, terrain.h(0, 0) - 0.3), s: V(1.5, 5 + rand() * 3, 1.5), rot: [0, -(k / 11) * Math.PI * 2 + Math.PI / 2, (rand() - 0.5) * 0.12], color: ['#9a958a', '#a8a294', '#8d897e'][k % 3] }));
  scene.add(instances(menhirGeometry(2), std({ roughness: 0.95 }), stones));
  stones.forEach(({ p }) => obs.add(p.x, p.z, 0.8));

  return { h: terrain.h, walkables: [terrain.mesh], trails, trailLength: trails.length, obstacles: obs.list };
}

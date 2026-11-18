// Two more ecosystems: Selva dos Gigantes (jungle) and Fornalha de Ignar (volcano).
// Same contract as the others in index.js: build props on a terrain disk, return its
// walkables, trails, trail length and an optional per-frame update and no-go test.
// Every level has 27 m of headroom under the slab above, so nothing here is taller than ~22 m.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { DISK_R, junctionAngle } from '../tree/layout.js';
import { V, polar, instances } from '../geom.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { lumpy } from '../organic.js';
import { makeTerrain, makeTrails, scatter, noise2, entryAngles, drift, fernGeometry, lerpColor, std, palmTrunkGeometry, obstacleList, facet, taperTube } from './common.js';

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
  const obs = obstacleList(trails.near);
  const palms = scatter(rand, 40, 16, 62, (x, z) => free(x, z, 4));
  const trunks = [], fronds = [], nuts = [];
  palms.forEach(([x, z]) => {
    const h = 9 + rand() * 9, yaw = rand() * 6, y = terrain.h(x, z);
    trunks.push({ p: V(x, y - 0.2, z), s: V(h, h, h), rot: [0, yaw, 0] });
    // the trunk curves 0.3 h sideways (along its local +x) before the crown
    const top = V(0.3 * h, h * 0.98, 0).applyEuler(new THREE.Euler(0, yaw, 0)).add(V(x, y - 0.2, z));
    fronds.push({ p: top, s: V(5.5, 3, 5.5), rot: [0, rand() * 6, 0], color: rand() < 0.5 ? '#2f7a2e' : '#3d8f36' });
    fronds.push({ p: top.clone().setY(top.y + 0.3), s: V(3.8, 2.6, 3.8), rot: [0, rand() * 6, 0], color: '#58a83e' });
    for (let k = 0; k < 3; k++) nuts.push({ p: V(top.x + Math.cos(k * 2.1) * 0.4, top.y - 0.4, top.z + Math.sin(k * 2.1) * 0.4), s: 0.32, color: '#6a4a22' });
    obs.add(x, z, 0.75);
  });
  scene.add(instances(palmTrunkGeometry(), mats.barkStatic, trunks));
  // fronds: long leaves that arch out and droop at the tips
  const frondGeo = (() => {
    const parts = [];
    for (let k = 0; k < 8; k++) {
      const g = new THREE.PlaneGeometry(1, 1, 8, 2), p = g.attributes.position;
      for (let i = 0; i < p.count; i++) {
        const u = p.getX(i) + 0.5, w = p.getY(i), half = Math.sin(Math.PI * Math.min(u * 1.1, 1)) * 0.13;
        p.setXYZ(i, u * 1.1, 0.35 * u - 0.75 * u * u + Math.abs(w) * 0.06, w * 2 * half);
      }
      g.rotateY(-(k / 8) * Math.PI * 2 + k * 0.1);
      parts.push(g);
    }
    const g = mergeGeometries(parts); g.computeVertexNormals(); return g;
  })();
  scene.add(instances(frondGeo, std({ side: THREE.DoubleSide, roughness: 0.6 }), fronds));
  scene.add(instances(new THREE.SphereGeometry(1, 10, 8), std({ roughness: 0.6 }), nuts, { shadow: false }));
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
  scene.add(instances(new RoundedBoxGeometry(1, 1, 1, 2, 0.08).translate(0, 0.5, 0), std({}), steps));
  // moss spilling over the temple's ledges
  scene.add(instances(lumpy({ detail: 2, amp: 0.25, seed: 5, flatten: 0.4 }), std({ roughness: 1 }), steps.flatMap((st, k) => [0, 1, 2, 3].map((j) => {
    const a = junctionAngle(L) + j * Math.PI / 2 + 0.4 + k, d = (16 - k * 3.6) / 2 * 0.9;
    return { p: V(Math.cos(a) * d, st.p.y + 2.2, Math.sin(a) * d), s: V(1.6, 0.9, 1.6), rot: [0, rand() * 6, 0], color: j % 2 ? '#4f8a35' : '#3f7a2e' };
  })), { shadow: false }));
  obs.add(0, 0, 7.5);
  const flame = new THREE.Mesh(new THREE.OctahedronGeometry(1.4, 0), new THREE.MeshBasicMaterial({ color: new THREE.Color('#9dffb0').multiplyScalar(2) }));
  flame.position.set(0, y0 + 10.5, 0);
  scene.add(flame);
  const mist = drift(scene, rand, { count: 400, rMax: 62, y0: L + 0.3, y1: L + 6, color: '#d9ffe0', size: 0.4, speed: 0.3, opacity: 0.3 });
  return { h: terrain.h, walkables: [terrain.mesh], trails, trailLength: trails.length, obstacles: obs.list, update: (dt, t) => { mist(dt, t, 1); flame.rotation.y += dt; } };
}

// ---------------------------------------------------------------------------
export function volcano({ scene, mats, rand, b }) {
  const L = b.level, LAVA = -0.9;
  const channel = (x, z) => {
    const r = Math.hypot(x, z);
    const n = 1 - Math.abs(2 * noise2(x, z, 0.03, 71) - 1);          // ridged noise -> winding rivers
    const s = Math.min(1, Math.max(0, (n - 0.86) / 0.04));
    // keep the middle and a 12 m band along the edge solid, so the bridges and the ramp land on rock
    return s * 2.2 * Math.min(1, Math.max(0, (r - 15) / 5)) * Math.min(1, Math.max(0, (54 - r) / 4));
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
  const obs = obstacleList(trails.near);
  const cols = [], caps = [];
  scatter(rand, 22, 18, 62, (x, z) => free(x, z, 5)).forEach(([x, z]) => {
    for (let k = 0; k < 7; k++) {
      const px = x + (rand() - 0.5) * 5, pz = z + (rand() - 0.5) * 5, h = 2 + rand() * 9, y = terrain.h(px, pz) - 0.5;
      cols.push({ p: V(px, y, pz), s: V(0.8, h, 0.8), rot: [0, rand(), 0], color: rand() < 0.5 ? '#2a2629' : '#353033' });
      caps.push({ p: V(px, y + h, pz), s: V(0.8, 1, 0.8), rot: [0, rand(), 0], color: new THREE.Color(rand() < 0.4 ? '#ff6a1a' : '#4a4044').multiplyScalar(rand() < 0.4 ? 1.4 : 1) });
    }
    obs.add(x, z, 2.6);
  });
  // hexagonal basalt columns with bevelled tops; some tops still glow with heat
  scene.add(instances(facet(new THREE.CylinderGeometry(0.92, 1, 1, 6).translate(0, 0.5, 0)), std({ roughness: 0.7 }), cols));
  scene.add(instances(facet(new THREE.CylinderGeometry(0.6, 0.92, 0.18, 6)), new THREE.MeshBasicMaterial({ color: '#ffffff' }), caps, { shadow: false }));
  scene.add(instances(new THREE.OctahedronGeometry(1, 0), std({ color: '#1a1520', roughness: 0.15, metalness: 0.3, emissive: '#3a1a4a', emissiveIntensity: 0.3 }),
    scatter(rand, 60, 15, 62, (x, z) => free(x, z, 2.5)).map(([x, z]) => ({ p: V(x, terrain.h(x, z), z), s: V(0.5 + rand(), 1 + rand() * 2.5, 0.5 + rand()), rot: [(rand() - 0.5) * 0.8, rand() * 6, (rand() - 0.5) * 0.8] }))));
  // landmark: an obsidian spire in a ring of glowing rocks
  const y0 = terrain.h(0, 0);
  const spire = new THREE.Mesh(new THREE.OctahedronGeometry(1, 0), std({ color: '#0d0b10', roughness: 0.1, metalness: 0.4 }));
  spire.scale.set(3, 14, 3);
  spire.position.set(0, y0 + 9, 0);
  spire.castShadow = true;
  scene.add(spire);
  obs.add(0, 0, 3.2);
  scene.add(instances(new THREE.DodecahedronGeometry(1, 0), glowMat(), Array.from({ length: 10 }, (_, k) => ({ p: polar(7, (k / 10) * Math.PI * 2, y0 + 0.3), s: 0.8 + rand() * 0.6, color: new THREE.Color('#ff7a2a').multiplyScalar(1.6) })), { shadow: false }));
  const heat = new THREE.PointLight('#ff6a2a', 900, 0, 2);
  heat.position.set(0, y0 + 3, 0);
  scene.add(heat);
  const embers = drift(scene, rand, { count: 700, rMax: 62, y0: L, y1: L + 24, color: '#ff8a3a', size: 0.14, speed: 0.6, fall: -2.4, opacity: 0.95 });
  return {
    h: terrain.h, walkables: [terrain.mesh, ...trails.meshes], trails, trailLength: trails.length, obstacles: obs.list,
    update: (dt, t) => { embers(dt, t, 0.8 + 0.2 * Math.sin(t * 7)); lava.material.color.setRGB(1.8, 0.5 + 0.08 * Math.sin(t * 1.3), 0.18); },
    // lava is not walkable: stay on rock or the raised paths
    noGo: (x, z, floor) => Math.abs(floor - L) < 12 && floor < L + LAVA + 0.25 && Math.hypot(x, z) < DISK_R,
  };
}

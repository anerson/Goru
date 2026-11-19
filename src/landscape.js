// The meadow around Aetherion: green grass and flowers, a wood of round oaks and pines lining
// every trail and filling the plain, and a ring of mountains closing the valley, open only
// where the approach trail comes in. Trees (8-14 m) and the people (1.8 m) set the scale.
import * as THREE from 'three';
import { lumpy } from './organic.js';
import { trunkGeometry } from './biomes/common.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { fbm, mulberry32 } from './noise.js';
import { SEED, TAU, ENTRANCES, LOOP_R, APPROACH } from './tree/layout.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const angDist = (a, b) => Math.abs(Math.atan2(Math.sin(a - b), Math.cos(a - b)));

// distance (m) from (x, z) to the centre line of the nearest outside trail
function trailDist(x, z) {
  const seg = (a, t0, t1) => {
    const c = Math.cos(a), s = Math.sin(a), t = x * c + z * s;
    const tt = Math.min(Math.max(t, t0), t1);
    return Math.hypot(x - c * tt, z - s * tt);
  };
  let d = Math.abs(Math.hypot(x, z) - LOOP_R);
  d = Math.min(d, seg(APPROACH.angle, APPROACH.from, APPROACH.to));
  for (const e of ENTRANCES) d = Math.min(d, seg(e, 96, LOOP_R));
  return d;
}
// true where a trail runs, so grass and trees stay off it
const onTrail = (x, z) => trailDist(x, z) < 4;

// trunks outside the tree the explorer should walk around: [{ x, z, r }], filled by buildLandscape
// (the same array is returned by it and by buildBiomes as obstacles.fora)
export const landscapeObstacles = [];

// a mountain of unit radius and height: a noisy cone, green at the foot, grey rock, snow on top
function mountainGeometry(seed) {
  const g = new THREE.ConeGeometry(1, 1, 40, 14).translate(0, 0.5, 0);
  const p = g.attributes.position, cols = [], c = new THREE.Color();
  const grass = new THREE.Color('#3f7d2c'), rock = new THREE.Color('#56606c'), dark = new THREE.Color('#444c58'), snow = new THREE.Color('#ffffff');
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i), a = Math.atan2(z, x);
    const n = fbm(Math.cos(a) * 2 + seed, y * 3, Math.sin(a) * 2 - seed);
    const k = 1 + (n - 0.5) * 0.7 * Math.min(y * 4, 1);        // ridges and gullies, peak kept
    const yy = y < 0.999 ? y * (0.85 + n * 0.3) : y;
    p.setXYZ(i, x * k, yy, z * k);
    const h = yy + (n - 0.5) * 0.25;
    if (h < 0.5) c.copy(grass).lerp(rock, Math.max(0, (h - 0.36) / 0.14));
    else if (h < 0.72) c.copy(rock).lerp(dark, n);
    else c.copy(rock).lerp(snow, Math.min((h - 0.72) / 0.06, 1));
    cols.push(c.r, c.g, c.b);
  }
  g.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3));
  g.computeVertexNormals();
  return g;
}

export function buildLandscape(scene, mats) {
  const rand = mulberry32(SEED + 4);

  // ground: rings packed toward the middle so the colour can vary where you walk
  const gg = new THREE.RingGeometry(0.5, 7000, 220, 90);
  gg.rotateX(-Math.PI / 2);
  const pos = gg.attributes.position, cols = [];
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), z = pos.getZ(i), r = Math.hypot(x, z), r2 = 7000 * Math.pow(r / 7000, 2.2);
    if (r > 0) pos.setXYZ(i, (x / r) * r2, 0, (z / r) * r2);
  }
  const a = new THREE.Color('#5f9a38'), b = new THREE.Color('#7fb347'), c = new THREE.Color('#4a8530');
  const shade = new THREE.Color('#3f7230'), tmp = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), z = pos.getZ(i);
    const n = fbm(x * 0.004 + 7, 0, z * 0.004) * 2 - 1;
    tmp.copy(a).lerp(n > 0 ? b : c, Math.min(Math.abs(n) * 1.6, 1));
    const d = Math.hypot(x, z);
    if (d < 560) tmp.lerp(shade, (1 - d / 560) * 0.5); // under the crown
    cols.push(tmp.r, tmp.g, tmp.b);
  }
  gg.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3));
  gg.computeVertexNormals();
  const ground = new THREE.Mesh(gg, mats.ground);
  ground.name = 'ground';
  ground.receiveShadow = true;
  scene.add(ground);

  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), sc = V(1, 1, 1), p = V(0, 0, 0);
  const col = new THREE.Color();

  // ---- mountains: a closed ring around the valley, with one pass where the approach comes in
  const mtnMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1 });
  const peaks = [];
  for (let i = 0; i < 46; i++) {
    const an = (i / 46) * TAU + (rand() - 0.5) * 0.08;
    if (angDist(an, APPROACH.angle) < 0.09) continue;            // the pass
    const near = angDist(an, APPROACH.angle) < 0.25;             // lower shoulders beside the pass
    peaks.push({ an, r: 1750 + rand() * 500, w: 380 + rand() * 260, h: (near ? 320 : 520) + rand() * 420 });
    peaks.push({ an: an + (rand() - 0.5) * 0.1, r: 2500 + rand() * 600, w: 500 + rand() * 300, h: 700 + rand() * 500 });
  }
  const mtnGeos = [0, 1, 2, 3].map((k) => mountainGeometry(k * 7.3 + 1));
  const mtns = mtnGeos.map((g) => new THREE.InstancedMesh(g, mtnMat, peaks.length));
  const used = [0, 0, 0, 0];
  peaks.forEach((m, i) => {
    const k = i % 4;
    mtns[k].setMatrixAt(used[k]++, m4.compose(V(Math.cos(m.an) * m.r, -15, Math.sin(m.an) * m.r), q.setFromEuler(e.set(0, rand() * TAU, 0)), sc.set(m.w, m.h, m.w * (0.8 + rand() * 0.4))));
  });
  mtns.forEach((m, k) => { m.count = used[k]; m.name = 'mountains'; m.receiveShadow = true; scene.add(m); });
  // green foothills at the foot of the range
  const hills = new THREE.InstancedMesh(lumpy({ detail: 2, amp: 0.25, seed: 5, flatten: 0.45 }), new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 1 }), 60);
  let hn = 0;
  for (let i = 0; i < 60; i++) {
    const an = (i / 60) * TAU + rand() * 0.05;
    if (angDist(an, APPROACH.angle) < 0.1) continue;
    const r = 1450 + rand() * 200, s = 140 + rand() * 120;
    hills.setMatrixAt(hn, m4.compose(V(Math.cos(an) * r, -s * 0.12, Math.sin(an) * r), q.setFromEuler(e.set(0, rand() * TAU, 0)), sc.set(s * 1.5, s, s * 1.2)));
    hills.setColorAt(hn++, col.set(['#4e8a33', '#5a9638', '#447a2c'][i % 3]));
  }
  hills.count = hn;
  hills.receiveShadow = true;
  scene.add(hills);

  // ---- grass and flowers: dense near the tree and the trails, thinning outward
  const N = 42000;
  const grass = new THREE.InstancedMesh(new THREE.ConeGeometry(0.07, 1, 3).translate(0, 0.5, 0), new THREE.MeshStandardMaterial({ roughness: 1 }), N);
  const ga = new THREE.Color('#4f8f2e'), gb = new THREE.Color('#9cc957');
  for (let gi = 0; gi < N;) {
    const an = rand() * TAU;
    const r = 150 + Math.pow(rand(), 0.9) * 1250;
    const x = Math.cos(an) * r, z = Math.sin(an) * r;
    if (onTrail(x, z)) continue;
    p.set(x, 0, z);
    q.setFromEuler(e.set((rand() - 0.5) * 0.4, rand() * 6, (rand() - 0.5) * 0.4));
    const s = 0.7 + rand() * 0.9;
    grass.setMatrixAt(gi, m4.compose(p, q, sc.set(s, 0.3 + rand() * 0.6, s)));
    grass.setColorAt(gi, col.copy(ga).lerp(gb, rand()));
    gi++;
  }
  grass.receiveShadow = true;
  scene.add(grass);
  const F = 5000;
  const flowers = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.12, 0), new THREE.MeshStandardMaterial({ roughness: 0.8 }), F);
  const petals = ['#ffffff', '#ffe066', '#ff9ec7', '#c9a6ff', '#ff7b5c'].map((h) => new THREE.Color(h));
  for (let fi = 0; fi < F;) {
    const an = rand() * TAU, r = 200 + Math.pow(rand(), 1.2) * 1000;
    const x = Math.cos(an) * r, z = Math.sin(an) * r;
    if (trailDist(x, z) < 3) continue;
    flowers.setMatrixAt(fi, m4.compose(p.set(x, 0.25 + rand() * 0.2, z), q.identity(), sc.setScalar(0.8 + rand() * 0.8)));
    flowers.setColorAt(fi++, petals[(rand() * petals.length) | 0]);
  }
  scene.add(flowers);

  // ---- the wood: round oaks and pines; rows 5-10 m off every trail, then a forest out to
  // the foothills. Every trunk goes into the obstacle list.
  const obstacles = landscapeObstacles;
  obstacles.length = 0;
  const spots = [];
  const taken = new Map();
  const free = (x, z) => {
    const i = Math.floor(x / 7), j = Math.floor(z / 7);
    for (let di = -1; di <= 1; di++) for (let dj = -1; dj <= 1; dj++) {
      for (const o of taken.get(`${i + di},${j + dj}`) ?? []) if (Math.hypot(o.x - x, o.z - z) < 7) return false;
    }
    return true;
  };
  const plant = (x, z, minTrail = 5) => {
    const r = Math.hypot(x, z);
    if (r < 345 || r > 1420 || trailDist(x, z) < minTrail || !free(x, z)) return false;
    const k = `${Math.floor(x / 7)},${Math.floor(z / 7)}`;
    if (!taken.has(k)) taken.set(k, []);
    taken.get(k).push({ x, z });
    spots.push({ x, z, pine: rand() < (r > 800 ? 0.5 : 0.3) });
    return true;
  };
  // beside the approach trail, both sides
  const A = APPROACH.angle, ca = Math.cos(A), sa = Math.sin(A);
  for (let t = APPROACH.from + 14; t < APPROACH.to + 60; t += 9 + rand() * 5) {
    for (const side of [-1, 1]) {
      const off = side * (5.5 + rand() * 4.5);
      plant(ca * t - sa * off, sa * t + ca * off);
    }
  }
  // outside the loop trail
  for (let t = 0; t < TAU; t += 11 / LOOP_R) {
    const r = LOOP_R + 6 + rand() * 4;
    plant(Math.cos(t) * r, Math.sin(t) * r, 5.5);
  }
  // the forest
  for (let k = 0; k < 9000 && spots.length < 2100; k++) {
    const an = rand() * TAU, r = 360 + Math.pow(rand(), 0.85) * 1060;
    plant(Math.cos(an) * r, Math.sin(an) * r, 9);
  }

  const leafMat = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.85 });
  const oakCrown = mergeGeometries([
    lumpy({ detail: 1, amp: 0.2, seed: 2, flatten: 0.85 }),
    lumpy({ detail: 1, amp: 0.25, seed: 6 }).scale(0.62, 0.55, 0.62).translate(0.55, -0.25, 0.1),
    lumpy({ detail: 1, amp: 0.25, seed: 8 }).scale(0.6, 0.55, 0.6).translate(-0.45, -0.2, -0.35),
    lumpy({ detail: 1, amp: 0.25, seed: 4 }).scale(0.55, 0.5, 0.55).translate(0.1, 0.55, 0.2),
  ]);
  const pineCrown = mergeGeometries([0, 1, 2, 3].map((k) => new THREE.ConeGeometry(1 - k * 0.2, 0.5, 9).translate(0, 0.25 + k * 0.27, 0)));
  const oaks = spots.filter((s) => !s.pine), pines = spots.filter((s) => s.pine);
  const trunks = new THREE.InstancedMesh(trunkGeometry(3, 4), mats.barkStatic, spots.length);
  const oakTops = new THREE.InstancedMesh(oakCrown, leafMat, oaks.length);
  const pineTops = new THREE.InstancedMesh(pineCrown, leafMat, pines.length);
  const oakGreens = ['#4f9a33', '#63ad3c', '#3f8a2d', '#76b845', '#5aa037'].map((h) => new THREE.Color(h));
  const pineGreens = ['#2f6f3a', '#3a7d3f', '#28603a', '#447f45'].map((h) => new THREE.Color(h));
  let ti = 0, oi = 0, pi = 0;
  for (const s of spots) {
    q.setFromEuler(e.set(0, rand() * TAU, 0));
    if (s.pine) {
      const h = 11 + rand() * 7, w = h * (0.28 + rand() * 0.06);
      trunks.setMatrixAt(ti++, m4.compose(V(s.x, -0.2, s.z), q, sc.set(1.3, h * 0.35, 1.3)));
      pineTops.setMatrixAt(pi, m4.compose(V(s.x, h * 0.18, s.z), q, sc.set(w, h * 0.9, w)));
      pineTops.setColorAt(pi++, pineGreens[(rand() * pineGreens.length) | 0]);
      obstacles.push({ x: Math.round(s.x * 100) / 100, z: Math.round(s.z * 100) / 100, r: 0.7 });
    } else {
      const h = 7 + rand() * 5, w = 3.4 + rand() * 1.8;
      trunks.setMatrixAt(ti++, m4.compose(V(s.x, -0.2, s.z), q, sc.set(1.8, h * 0.62, 1.8)));
      oakTops.setMatrixAt(oi, m4.compose(V(s.x, h * 0.62 + w * 0.55, s.z), q, sc.set(w, w * 0.9, w)));
      oakTops.setColorAt(oi++, col.copy(oakGreens[(rand() * oakGreens.length) | 0]).offsetHSL(0, 0, (rand() - 0.5) * 0.06));
      obstacles.push({ x: Math.round(s.x * 100) / 100, z: Math.round(s.z * 100) / 100, r: 0.9 });
    }
  }
  trunks.castShadow = oakTops.castShadow = pineTops.castShadow = true;
  oakTops.receiveShadow = pineTops.receiveShadow = true;
  trunks.name = 'wood-trunks'; oakTops.name = 'wood-oaks'; pineTops.name = 'wood-pines';
  scene.add(trunks, oakTops, pineTops);

  // people, 1.8 m tall
  const shirts = ['#b8432f', '#2f6aa3', '#e2c04a', '#f2f2f2', '#6f4c99', '#2e8466'];
  const skin = new THREE.MeshStandardMaterial({ color: '#c99674', roughness: 0.8 });
  const legs = new THREE.MeshStandardMaterial({ color: '#2b2f3a', roughness: 0.9 });
  const person = (at, face, i) => {
    const g = new THREE.Group();
    const l = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.15, 0.85, 8), legs); l.position.y = 0.42;
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.21, 0.19, 0.65, 8), new THREE.MeshStandardMaterial({ color: shirts[i % shirts.length], roughness: 0.9 })); body.position.y = 1.17;
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.14, 12, 8), skin); head.position.y = 1.64;
    for (const m of [l, body, head]) { m.castShadow = true; g.add(m); }
    g.position.copy(at);
    g.lookAt(face.x, at.y, face.z);
    scene.add(g);
  };
  const along = (r, side) => V(Math.cos(APPROACH.angle) * r - Math.sin(APPROACH.angle) * side, 0, Math.sin(APPROACH.angle) * r + Math.cos(APPROACH.angle) * side);
  person(along(560, 1), V(0, 0, 0), 0);
  person(along(562, -1), V(0, 0, 0), 1);
  person(along(360, 1.5), V(0, 0, 0), 2);
  person(along(250, 1), V(0, 0, 0), 3);
  person(along(252, -1), V(0, 0, 0), 4);
  // tree trunks the explorer should walk around
  return { obstacles };
}

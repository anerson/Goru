// The savanna around Aetherion: golden grass, acacias, far sandstone cliffs and people.
// The acacias (6-8 m) and the people (1.8 m) set the scale.
import * as THREE from 'three';
import { lumpy } from './organic.js';
import { trunkGeometry, taperTube, facet } from './biomes/common.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { fbm, mulberry32 } from './noise.js';
import { SEED, TAU, ENTRANCES, LOOP_R, APPROACH } from './tree/layout.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const angDist = (a, b) => Math.abs(Math.atan2(Math.sin(a - b), Math.cos(a - b)));

// true where a trail runs, so grass and trees stay off it
function onTrail(x, z) {
  const r = Math.hypot(x, z), a = Math.atan2(z, x);
  if (Math.abs(r - LOOP_R) < 4) return true;
  if (r < LOOP_R + 2 && ENTRANCES.some((e) => angDist(a, e) * r < 4)) return true;
  if (r > LOOP_R - 2 && r < APPROACH.to && angDist(a, APPROACH.angle) * r < 4) return true;
  return false;
}

// trunks outside the tree the explorer should walk around: [{ x, z, r }], filled by buildLandscape
// (the same array is returned by it and by buildBiomes as obstacles.fora)
export const landscapeObstacles = [];

export function buildLandscape(scene, mats) {
  const rand = mulberry32(SEED + 4);

  const gg = new THREE.CircleGeometry(7000, 220);
  gg.rotateX(-Math.PI / 2);
  const pos = gg.attributes.position, cols = [];
  const a = new THREE.Color('#7d7a43'), b = new THREE.Color('#a39552'), c = new THREE.Color('#5d6534');
  const shade = new THREE.Color('#4f4a30'), tmp = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), z = pos.getZ(i);
    const n = fbm(x * 0.0015 + 7, 0, z * 0.0015) * 2 - 1;
    tmp.copy(a).lerp(n > 0 ? b : c, Math.min(Math.abs(n) * 1.4, 1));
    const d = Math.hypot(x, z);
    if (d < 600) tmp.lerp(shade, (1 - d / 600) * 0.55); // under the crown
    cols.push(tmp.r, tmp.g, tmp.b);
  }
  gg.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3));
  const ground = new THREE.Mesh(gg, mats.ground);
  ground.name = 'ground';
  ground.receiveShadow = true;
  scene.add(ground);

  // distant sandstone cliffs and mesas, banded like the walls in a canyon
  const cliffMat = new THREE.MeshStandardMaterial({ color: '#a8754a', roughness: 1 });
  const capMat = new THREE.MeshStandardMaterial({ color: '#c99a66', roughness: 1 });
  for (let i = 0; i < 26; i++) {
    const an = (i / 26) * TAU + rand() * 0.2, r = 3200 + rand() * 2400;
    const w = 300 + rand() * 600, h = 180 + rand() * 420;
    const base = new THREE.Mesh(facet(new THREE.CylinderGeometry(w * 0.8, w, h, 9)), cliffMat);
    base.position.set(Math.cos(an) * r, h / 2 - 10, Math.sin(an) * r);
    base.rotation.y = rand() * 3;
    const cap = new THREE.Mesh(facet(new THREE.CylinderGeometry(w * 0.7, w * 0.8, h * 0.12, 9)), capMat);
    cap.position.set(base.position.x, h + h * 0.06 - 10, base.position.z);
    cap.rotation.y = base.rotation.y;
    scene.add(base, cap);
  }

  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), sc = V(1, 1, 1), p = V(0, 0, 0);

  // dry grass: dense near the tree and the trails, thinning outward
  const N = 26000;
  const grass = new THREE.InstancedMesh(new THREE.ConeGeometry(0.06, 1, 3).translate(0, 0.5, 0), new THREE.MeshStandardMaterial({ roughness: 1 }), N);
  const ga = new THREE.Color('#8e8a48'), gb = new THREE.Color('#c2ae6a'), col = new THREE.Color();
  for (let gi = 0; gi < N;) {
    const an = rand() * TAU;
    const r = 180 + Math.pow(rand(), 0.8) * 900;
    const x = Math.cos(an) * r, z = Math.sin(an) * r;
    if (onTrail(x, z)) continue;
    p.set(x, 0, z);
    q.setFromEuler(e.set((rand() - 0.5) * 0.4, rand() * 6, (rand() - 0.5) * 0.4));
    const s = 0.6 + rand() * 0.8;
    grass.setMatrixAt(gi, m4.compose(p, q, sc.set(s, 0.25 + rand() * 0.55, s)));
    grass.setColorAt(gi, col.copy(ga).lerp(gb, rand()));
    gi++;
  }
  grass.receiveShadow = true;
  scene.add(grass);

  // acacias: an avenue along the approach plus scattered ones on the savanna
  const small = 90;
  // an acacia: a short flared trunk that forks into three branches spreading up and out
  // (unit height 1; the branch tips end at y ~ 1, about 0.4 out from the axis)
  const acacia = mergeGeometries([
    trunkGeometry(9, 4).scale(0.15, 0.55, 0.15),
    taperTube([[0, 0.45, 0], [0.12, 0.7, 0.05], [0.38, 1.0, 0.1]], 0.04, 0.014, 7, 8),
    taperTube([[0, 0.45, 0], [-0.1, 0.72, 0.08], [-0.3, 0.98, 0.28]], 0.035, 0.012, 7, 8),
    taperTube([[0, 0.45, 0], [0.0, 0.75, -0.12], [-0.05, 1.0, -0.38]], 0.035, 0.012, 7, 8),
  ]);
  const tips = [[0.38, 0.1], [-0.3, 0.28], [-0.05, -0.38]];
  const trunks = new THREE.InstancedMesh(acacia, mats.barkStatic, small);
  const crowns = new THREE.InstancedMesh(lumpy({ detail: 2, amp: 0.2, seed: 9, flatten: 0.32 }), new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.85 }), small * 5);
  const greens = ['#4f6a2a', '#5a7a30', '#466026'].map((c) => new THREE.Color(c));
  let ci = 0;
  const obstacles = landscapeObstacles;
  obstacles.length = 0;
  for (let i = 0; i < small; i++) {
    let x, z;
    if (i < 40) { // two rows beside the approach trail
      const d = 420 + (i >> 1) * 16, side = i % 2 ? 1 : -1;
      const a0 = APPROACH.angle;
      x = Math.cos(a0) * d - Math.sin(a0) * side * 9;
      z = Math.sin(a0) * d + Math.cos(a0) * side * 9;
    } else {
      const an = rand() * TAU, r = 500 + rand() * 2500;
      x = Math.cos(an) * r; z = Math.sin(an) * r;
      if (onTrail(x, z)) { x += 20; }
    }
    const h = 2.2 + rand() * 1.2, yaw = rand() * TAU, W = 7;
    trunks.setMatrixAt(i, m4.compose(V(x, -0.2, z), q.setFromEuler(e.set(0, yaw, 0)), sc.set(W, h * 2, W)));
    obstacles.push({ x: Math.round(x * 100) / 100, z: Math.round(z * 100) / 100, r: 0.7 });
    // a flat layered crown: one lump on each branch tip, two more spanning between them
    const cy = Math.cos(yaw), sy = Math.sin(yaw);
    const spots = tips.map(([tx, tz]) => [tx * W, tz * W]).concat([[0, 0], [(tips[0][0] + tips[1][0]) * W * 0.5, (tips[0][1] + tips[1][1]) * W * 0.5]]);
    spots.forEach(([lx, lz], k) => {
      const s = 2.2 + rand() * 1.4;
      const wx = x + lx * cy + lz * sy, wz = z - lx * sy + lz * cy;
      crowns.setMatrixAt(ci, m4.compose(V(wx, h * 2 + 0.6 + (k === 3 ? 0.7 : rand() * 0.4), wz), q.setFromEuler(e.set(0, rand() * 6, 0)), sc.set(s * 1.4, 1 + (k === 3 ? 0.3 : 0), s * 1.4)));
      crowns.setColorAt(ci++, greens[(i + k) % 3]);
    });
  }
  trunks.castShadow = crowns.castShadow = true;
  scene.add(trunks, crowns);

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
  // acacia trunks the explorer should walk around (the avenue along the approach included)
  return { obstacles };
}

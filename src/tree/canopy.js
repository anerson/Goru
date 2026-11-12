// Branches grown recursively from each limb tip, then clusters of narrow olive leaves
// and fruit at the outer twigs. All drawn with InstancedMesh: ~70k leaves in 1 draw call.
import * as THREE from 'three';
import { mulberry32 } from '../noise.js';
import { SEED, TAU } from './layout.js';

const UP = new THREE.Vector3(0, 1, 0);
const MAX_DEPTH = 8;
const LEAVES_PER_SPOT = 46;

function leafGeometry() {
  // lanceolate blade with a slight fold along the midrib
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute([
    0, 0, 0, 0.11, 0.42, 0.03, 0, 1, 0,
    0, 0, 0, 0, 1, 0, -0.11, 0.42, 0.03,
  ], 3));
  g.computeVertexNormals();
  return g;
}

export function buildCanopy(group, trunk, mats) {
  const rand = mulberry32(SEED + 2);
  const rv = (s) => new THREE.Vector3((rand() - 0.5) * s, (rand() - 0.5) * s, (rand() - 0.5) * s);
  const segs = [], spots = [];

  function grow(pos, dir, len, rad, depth) {
    const steps = 3;
    const p = pos.clone(), d = dir.clone();
    const rEnd = rad * 0.68;
    for (let i = 0; i < steps; i++) {
      d.add(rv(0.4)).normalize();
      d.y += depth < 5 ? 0.04 : -0.03 * (depth - 4); // young wood climbs, outer twigs droop
      d.normalize();
      const l = len / steps;
      segs.push({ p: p.clone(), d: d.clone(), l: l * 1.06, r: rad + (rEnd - rad) * (i / steps) });
      p.addScaledVector(d, l);
    }
    if (depth >= MAX_DEPTH - 1) spots.push(p.clone());
    if (depth >= MAX_DEPTH) return;
    const kids = rand() < 0.55 ? 3 : 2;
    const u = new THREE.Vector3().crossVectors(d, Math.abs(d.y) < 0.9 ? UP : new THREE.Vector3(1, 0, 0)).normalize();
    const v = new THREE.Vector3().crossVectors(d, u).normalize();
    const base = rand() * TAU;
    for (let k = 0; k < kids; k++) {
      const a = base + (k / kids) * TAU + (rand() - 0.5) * 0.8;
      const spread = 0.5 + rand() * 0.45;
      const cd = d.clone().multiplyScalar(Math.cos(spread))
        .addScaledVector(u, Math.cos(a) * Math.sin(spread))
        .addScaledVector(v, Math.sin(a) * Math.sin(spread));
      cd.y += 0.05; cd.normalize();
      grow(p, cd, len * (0.74 + rand() * 0.12), rEnd * (kids === 2 ? 0.8 : 0.7) * (0.9 + rand() * 0.15), depth + 1);
    }
  }

  trunk.limbEnds.forEach((L) => grow(L.p, L.d, 14, L.r * 1.02, 3));
  trunk.limbMids.forEach((M) => grow(M.p, new THREE.Vector3(Math.cos(M.th), 0.9, Math.sin(M.th)).normalize(), 11, M.r * 0.55, 4));

  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new THREE.Vector3();

  const cylinder = new THREE.CylinderGeometry(0.86, 1, 1, 12, 1, true).translate(0, 0.5, 0);
  const bark = new THREE.InstancedMesh(cylinder, mats.bark, segs.length);
  const joints = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 12, 8), mats.bark, segs.length + trunk.limbEnds.length);
  segs.forEach((s, i) => {
    q.setFromUnitVectors(UP, s.d);
    bark.setMatrixAt(i, m4.compose(s.p, q, sc.set(s.r, s.l, s.r)));
    joints.setMatrixAt(i, m4.compose(s.p, q, sc.set(s.r, s.r, s.r)));
  });
  trunk.limbEnds.forEach((L, i) => joints.setMatrixAt(segs.length + i, m4.compose(L.p, q.identity(), sc.set(L.r, L.r, L.r))));
  bark.name = 'branches'; joints.name = 'branch-joints';
  bark.castShadow = bark.receiveShadow = joints.castShadow = joints.receiveShadow = true;
  group.add(bark, joints);

  const leafCount = spots.length * LEAVES_PER_SPOT;
  const leaves = new THREE.InstancedMesh(leafGeometry(), mats.leaf, leafCount);
  const greens = ['#4a5733', '#56643b', '#636f45', '#3f4a2b', '#6e7a50', '#59663f'].map((h) => new THREE.Color(h));
  const silver = new THREE.Color('#8f9870');
  const col = new THREE.Color(), e = new THREE.Euler(), pp = new THREE.Vector3();
  const tipPoints = [];
  let li = 0, maxY = 0, crownR = 0;
  for (const sp of spots) {
    tipPoints.push(sp);
    for (let k = 0; k < LEAVES_PER_SPOT; k++) {
      const o = rv(1).normalize().multiplyScalar(Math.pow(rand(), 0.55) * 3.6);
      o.y = Math.abs(o.y) * 0.6 + o.y * 0.4;
      pp.copy(sp).add(o);
      q.setFromEuler(e.set(rand() * TAU, rand() * TAU, rand() * TAU));
      const s = 0.9 + rand() * 0.7;
      leaves.setMatrixAt(li, m4.compose(pp, q, sc.set(s, s, s)));
      leaves.setColorAt(li, col.copy(greens[(rand() * greens.length) | 0]).lerp(silver, rand() * 0.25));
      maxY = Math.max(maxY, pp.y);
      crownR = Math.max(crownR, Math.hypot(pp.x, pp.z));
      li++;
    }
  }
  leaves.name = 'leaves';
  leaves.castShadow = leaves.receiveShadow = true;
  group.add(leaves);

  const oliveCount = Math.min(3200, spots.length * 3);
  const olives = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 10, 8), mats.olive, oliveCount);
  const oliveTones = ['#2e1d33', '#3b2640', '#5c6a2a', '#4a2a3a'].map((h) => new THREE.Color(h));
  for (let i = 0; i < oliveCount; i++) {
    pp.copy(spots[(rand() * spots.length) | 0]).add(rv(5));
    olives.setMatrixAt(i, m4.compose(pp, q.identity(), sc.set(0.2, 0.27, 0.2)));
    olives.setColorAt(i, oliveTones[(rand() * oliveTones.length) | 0]);
  }
  olives.name = 'olives';
  group.add(olives);

  return { tipPoints, leafCount, maxY, crownR, leafGeo: leaves.geometry };
}

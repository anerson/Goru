// Branches grown recursively from each limb tip, then sprigs of narrow olive leaves and fruit
// at the outer twigs. Everything is instanced. Sprigs are written in shuffled order so a
// lower quality setting can draw just the first N and still cover the whole crown evenly.
import * as THREE from 'three';
import { mulberry32 } from '../noise.js';
import { SEED, TAU } from './layout.js';

const UP = new THREE.Vector3(0, 1, 0);
const MAX_DEPTH = 8;
const SPRIGS_PER_SPOT = 60;
const CLUSTER_RADIUS = 22; // m

// One oak sprig, 1 unit long: eight broad leaves alternating up a stem, plus a tip leaf.
function sprigGeometry() {
  const pos = [];
  const leaf = (t, side, angle, len) => {
    const bx = 0, by = t, w = 0.11; // broad oak leaves
    const dx = Math.sin(angle) * side, dy = Math.cos(angle);
    const tx = bx + dx * len, ty = by + dy * len;
    const mx = bx + dx * len * 0.42, my = by + dy * len * 0.42;
    const nx = -dy * w * side, ny = dx * w * side;
    // two triangles, slightly folded along the midrib (z)
    pos.push(bx, by, 0, mx + nx, my + ny, 0.02, tx, ty, 0);
    pos.push(bx, by, 0, tx, ty, 0, mx - nx, my - ny, 0.02);
  };
  for (let k = 0; k < 8; k++) leaf(0.12 + k * 0.1, k % 2 ? 1 : -1, 0.75, 0.3 - k * 0.012);
  leaf(0.9, 1, 0.05, 0.25);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.computeVertexNormals();
  return g;
}

// a single leaf, for the ones that fall
export function singleLeafGeometry() {
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

  trunk.limbEnds.forEach((L) => grow(L.p, L.d, 110, L.r * 1.02, 3));
  trunk.limbMids.forEach((M) => grow(M.p, new THREE.Vector3(Math.cos(M.th), 0.9, Math.sin(M.th)).normalize(), 85, M.r * 0.5, 4));

  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new THREE.Vector3();

  const cylinder = new THREE.CylinderGeometry(0.86, 1, 1, 14, 1, true).translate(0, 0.5, 0);
  const bark = new THREE.InstancedMesh(cylinder, mats.bark, segs.length);
  const joints = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 14, 10), mats.bark, segs.length + trunk.limbEnds.length);
  segs.forEach((s, i) => {
    q.setFromUnitVectors(UP, s.d);
    bark.setMatrixAt(i, m4.compose(s.p, q, sc.set(s.r, s.l, s.r)));
    joints.setMatrixAt(i, m4.compose(s.p, q, sc.set(s.r, s.r, s.r)));
  });
  trunk.limbEnds.forEach((L, i) => joints.setMatrixAt(segs.length + i, m4.compose(L.p, q.identity(), sc.set(L.r, L.r, L.r))));
  bark.name = 'branches'; joints.name = 'branch-joints';
  bark.castShadow = bark.receiveShadow = joints.castShadow = joints.receiveShadow = true;
  group.add(bark, joints);

  // shuffled slots: instance k of the mesh holds sprig order[k]
  const total = spots.length * SPRIGS_PER_SPOT;
  const order = Array.from({ length: total }, (_, i) => i);
  for (let i = total - 1; i > 0; i--) { const j = (rand() * (i + 1)) | 0; [order[i], order[j]] = [order[j], order[i]]; }

  const leaves = new THREE.InstancedMesh(sprigGeometry(), mats.leaf, total);
  const greens = ['#2f4a1f', '#3a5a25', '#46682b', '#2a4019', '#55772f', '#3d5f22'].map((h) => new THREE.Color(h));
  const silver = new THREE.Color('#7f9a4a');
  const col = new THREE.Color(), e = new THREE.Euler(), pp = new THREE.Vector3(), out = new THREE.Vector3();
  const tipPoints = [];
  let n = 0, maxY = 0, crownR = 0;
  for (const sp of spots) {
    tipPoints.push(sp);
    for (let k = 0; k < SPRIGS_PER_SPOT; k++) {
      const o = rv(1).normalize().multiplyScalar(Math.pow(rand(), 0.5) * CLUSTER_RADIUS);
      o.y = Math.abs(o.y) * 0.5 + o.y * 0.5;
      pp.copy(sp).add(o);
      // point each sprig roughly outward from its cluster centre, then jitter
      out.copy(o).normalize().add(rv(1.2)).normalize();
      q.setFromUnitVectors(UP, out);
      q.multiply(new THREE.Quaternion().setFromEuler(e.set(0, rand() * TAU, 0)));
      const s = 4.5 + rand() * 2.5;
      const slot = order[n++];
      leaves.setMatrixAt(slot, m4.compose(pp, q, sc.set(s, s, s)));
      leaves.setColorAt(slot, col.copy(greens[(rand() * greens.length) | 0]).lerp(silver, rand() * 0.25));
      maxY = Math.max(maxY, pp.y + s);
      crownR = Math.max(crownR, Math.hypot(pp.x, pp.z));
    }
  }
  leaves.name = 'leaves';
  leaves.castShadow = leaves.receiveShadow = true;
  group.add(leaves);

  const oliveCount = Math.min(5000, spots.length * 4);
  const olives = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 10, 8), mats.olive, oliveCount);
  const oliveTones = ['#7a5428', '#8f6630', '#5f4a22', '#a07a3a'].map((h) => new THREE.Color(h)); // acorns
  for (let i = 0; i < oliveCount; i++) {
    pp.copy(spots[(rand() * spots.length) | 0]).add(rv(CLUSTER_RADIUS * 1.5));
    olives.setMatrixAt(i, m4.compose(pp, q.identity(), sc.set(0.8, 1.1, 0.8)));
    olives.setColorAt(i, oliveTones[(rand() * oliveTones.length) | 0]);
  }
  olives.name = 'acorns';
  group.add(olives);

  return {
    tipPoints, maxY, crownR, leaves, leafTotal: total,
    setFoliage(fraction) { leaves.count = Math.max(1, Math.round(total * fraction)); },
  };
}

// Branches grown recursively from each limb tip, then sprigs of narrow olive leaves and fruit
// at the outer twigs. Everything is instanced. Sprigs are written in shuffled order so a
// lower quality setting can draw just the first N and still cover the whole crown evenly.
import * as THREE from 'three';
import { mulberry32 } from '../noise.js';
import { SEED, TAU, TRUNK, ringR } from './layout.js';
import { lumpy } from '../organic.js';
import { addWind } from '../wind.js';

const UP = new THREE.Vector3(0, 1, 0);
const MAX_DEPTH = 8;
const SPRIGS_PER_SPOT = 34;   // fringe of single leaves around the solid clumps below
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

  // The crown is a dome: an ellipsoid over the trunk. A branch that reaches its shell stops and
  // carries its foliage there, so the outline comes out round and even all the way around.
  const CROWN = { y: 420, rh: 820, up: 320, down: 210 };
  const outside = (p) => {
    const r = Math.hypot(p.x, p.z) / CROWN.rh, h = (p.y - CROWN.y) / (p.y > CROWN.y ? CROWN.up : CROWN.down);
    return r * r + h * h > 1;
  };
  const o = new THREE.Vector3(), t = new THREE.Vector3(), fan = new THREE.Vector3();
  // Keep a direction growing away from the trunk (never back in through it) and inside the
  // branch's own wedge of the crown, so it never crosses into a neighbouring limb's wood.
  function steer(p, d, b) {
    o.set(p.x, 0, p.z).normalize();
    const h = d.x * o.x + d.z * o.z;
    const hMin = Math.hypot(p.x, p.z) < 420 ? 0.25 : 0.05;
    if (h < hMin) d.addScaledVector(o, hMin - h);
    t.set(-o.z, 0, o.x);
    const az = Math.atan2(p.z, p.x), dA = Math.atan2(Math.sin(az - b.home), Math.cos(az - b.home));
    const tc = d.dot(t);
    if (Math.abs(dA) > b.half * 0.8 && tc * dA > 0) d.addScaledVector(t, -tc * (Math.abs(dA) > b.half ? 2 : 1.2));
    // lean toward the dome's own radial lines, which fan the twigs evenly over the shell
    fan.set(p.x, p.y - b.fanY, p.z).normalize();
    d.addScaledVector(fan, 0.08);
    return d.normalize();
  }

  function grow(pos, dir, len, rad, depth, b) {
    const steps = 3;
    const p = pos.clone(), d = dir.clone();
    const rEnd = rad * 0.7;   // smooth taper: each branch ends where its children begin
    for (let i = 0; i < steps; i++) {
      d.addScaledVector(rv(1), 0.14);
      d.y += depth < 6 ? 0.03 : -0.02 * (depth - 5); // young wood climbs, outer twigs droop a little
      steer(p, d, b);
      const l = len / steps;
      segs.push({ p: p.clone(), d: d.clone(), l: l * 1.06, r: rad + (rEnd - rad) * (i / steps) });
      p.addScaledVector(d, l);
    }
    const atShell = outside(p);
    if (depth >= MAX_DEPTH - 1 || (atShell && depth >= 5)) spots.push(p.clone());
    if (depth >= MAX_DEPTH || atShell) return;
    const kids = rand() < 0.55 ? 3 : 2;
    const u = new THREE.Vector3().crossVectors(d, Math.abs(d.y) < 0.9 ? UP : new THREE.Vector3(1, 0, 0)).normalize();
    const v = new THREE.Vector3().crossVectors(d, u).normalize();
    const base = rand() * TAU;
    for (let k = 0; k < kids; k++) {
      const a = base + (k / kids) * TAU + (rand() - 0.5) * 0.3;   // evenly fanned children
      const spread = 0.62 + rand() * 0.16;
      const cd = d.clone().multiplyScalar(Math.cos(spread))
        .addScaledVector(u, Math.cos(a) * Math.sin(spread))
        .addScaledVector(v, Math.sin(a) * Math.sin(spread));
      cd.y += 0.05;
      steer(p, cd, b);
      grow(p, cd, len * (0.76 + rand() * 0.06), rEnd * (kids === 2 ? 0.8 : 0.7), depth + 1, b);
    }
  }

  // nine limbs, each owning the 40-degree wedge around its own angle. Inside every wedge the limb
  // spreads low and wide, and two climbing branches (one from the limb's shoulder, one from its
  // middle, on either side of it) fill the upper dome, so the crown is even all the way round.
  const wedge = Math.PI / trunk.limbEnds.length;
  const climb = (th, lean) => new THREE.Vector3(Math.cos(th) * lean, 1, Math.sin(th) * lean).normalize();
  trunk.limbEnds.forEach((L, i) => {
    const home = Math.atan2(L.p.z, L.p.x);
    grow(L.p, L.d, 110, L.r * 1.02, 3, { home, half: wedge, fanY: 0 });
    const M = trunk.limbMids[i];
    if (!M) return;
    const mh = M.th + wedge * 0.5;
    grow(M.p.clone().setY(M.p.y + M.r * 0.55), climb(mh, 0.4), 105, M.r * 0.5, 4, { home: mh, half: wedge * 0.5, fanY: -300 });
    const sh = M.th - wedge * 0.5, R = ringR(TRUNK.top) + 55;
    const S = new THREE.Vector3(Math.cos(M.th) * R, TRUNK.top + 40, Math.sin(M.th) * R);
    grow(S, climb(sh, 0.22), 115, M.r * 0.45, 4, { home: sh, half: wedge * 0.5, fanY: -700 });
  });

  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new THREE.Vector3();

  const cylinder = new THREE.CylinderGeometry(0.86, 1, 1, 10, 1, true).translate(0, 0.5, 0);
  const bark = new THREE.InstancedMesh(cylinder, mats.bark, segs.length);
  const joints = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 10, 6), mats.bark, segs.length + trunk.limbEnds.length);
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
  const greens = ['#6f9e36', '#82b240', '#5e8f2f', '#93c24a', '#76a83a', '#4f8029'].map((h) => new THREE.Color(h));
  const silver = new THREE.Color('#c4d870');
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
  // The body of the crown: one big rounded clump of foliage per twig cluster, plus a smaller
  // one hanging under it, so the crown reads as a dense green mass from anywhere (cartoon
  // style). Two instanced meshes, a few thousand instances, ~80 triangles each.
  const clumpMat = addWind(new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.9 }));
  const clumpGeos = [lumpy({ detail: 1, amp: 0.24, seed: 3, flatten: 0.72 }), lumpy({ detail: 1, amp: 0.3, seed: 11, flatten: 0.8 })];
  const clumpTones = ['#2c681e', '#357524', '#3f8229', '#245a18', '#4a8c2e', '#2f6e22'].map((h) => new THREE.Color(h));
  const sun = new THREE.Color('#7fb03a');
  const clumps = clumpGeos.map((g, k) => {
    const m = new THREE.InstancedMesh(g, clumpMat, spots.length);
    m.name = `leaf-clumps-${k}`;
    m.castShadow = m.receiveShadow = true;
    return m;
  });
  spots.forEach((sp, i) => {
    for (let k = 0; k < 2; k++) {
      const big = k === 0;
      const s = (big ? 23 : 16) * (0.8 + rand() * 0.4);
      pp.copy(sp).add(rv(big ? 6 : 18));
      if (!big) pp.y -= 9;
      q.setFromEuler(e.set((rand() - 0.5) * 0.4, rand() * TAU, (rand() - 0.5) * 0.4));
      clumps[k].setMatrixAt(i, m4.compose(pp, q, sc.set(s * (1 + rand() * 0.3), s, s * (1 + rand() * 0.3))));
      // higher clumps catch more sun
      const lift = Math.min(Math.max((pp.y - 330) / 180, 0), 1);
      clumps[k].setColorAt(i, col.copy(clumpTones[(rand() * clumpTones.length) | 0]).lerp(sun, lift * 0.25 + rand() * 0.08));
    }
  });
  group.add(...clumps);

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

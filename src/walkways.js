// Everything you can walk on besides the ground: the spiral ramp inside the hollow, the deck
// at its top, the bridge out through the trunk gap, the lookout, and the dirt trail outside.
import * as THREE from 'three';
import { mulberry32 } from './noise.js';
import { SEED, TAU, RAMP, LOOKOUT, ringR, rampAt, rampStart, thetaBridge, thetaEntrance } from './tree/layout.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const UP = V(0, 1, 0);

function beam(a, b, r, mat) {
  const d = b.clone().sub(a), L = d.length();
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, L, 8), mat);
  m.position.copy(a).addScaledVector(d, 0.5);
  m.quaternion.setFromUnitVectors(UP, d.normalize());
  m.castShadow = true;
  return m;
}

const angDist = (a, b) => Math.abs(Math.atan2(Math.sin(a - b), Math.cos(a - b)));

export function buildWalkways(scene, mats, tex) {
  const rand = mulberry32(SEED + 3);
  const walkables = [];
  const posts = [];
  const lanterns = [];
  const steps = RAMP.turns * 120;

  // --- spiral ramp (one ribbon) ---
  {
    const pos = [], uv = [], idx = [];
    let len = 0, prev = null;
    for (let k = 0; k <= steps; k++) {
      const { a, y } = rampAt(k / steps);
      const mid = V(Math.cos(a), 0, Math.sin(a)).multiplyScalar((RAMP.rin + RAMP.rout) / 2).setY(y);
      if (prev) len += mid.distanceTo(prev);
      prev = mid;
      pos.push(Math.cos(a) * RAMP.rin, y, Math.sin(a) * RAMP.rin, Math.cos(a) * RAMP.rout, y, Math.sin(a) * RAMP.rout);
      uv.push(0, len, 1, len);
      if (k < steps) { const b = k * 2; idx.push(b, b + 2, b + 1, b + 1, b + 2, b + 3); }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    g.setIndex(idx); g.computeVertexNormals();
    const ramp = new THREE.Mesh(g, mats.planks);
    ramp.name = 'ramp';
    ramp.castShadow = ramp.receiveShadow = true;
    scene.add(ramp);
    walkables.push(ramp);
  }

  // --- fascia boards along both ramp edges ---
  {
    const pos = [], idx = [];
    for (const R of [RAMP.rin, RAMP.rout]) {
      const base = pos.length / 3;
      for (let k = 0; k <= steps; k++) {
        const { a, y } = rampAt(k / steps);
        pos.push(Math.cos(a) * R, y, Math.sin(a) * R, Math.cos(a) * R, y - 0.45, Math.sin(a) * R);
        if (k < steps) { const b = base + k * 2; idx.push(b, b + 1, b + 2, b + 1, b + 3, b + 2); }
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setIndex(idx); g.computeVertexNormals();
    scene.add(new THREE.Mesh(g, mats.woodDouble));
  }

  // --- railings: posts + handrails on both ramp edges, lanterns on the inner one ---
  [[RAMP.rin + 0.12, 48], [RAMP.rout - 0.12, 76]].forEach(([R, count], side) => {
    for (let k = 0; k <= count; k++) {
      const { a, y } = rampAt(k / count);
      const p = V(Math.cos(a) * R, y, Math.sin(a) * R);
      posts.push(p);
      if (side === 0 && k % 4 === 2) lanterns.push(V(p.x, y + 1.25, p.z));
    }
    const railPts = [];
    for (let k = 0; k <= 160; k++) {
      const { a, y } = rampAt(k / 160);
      railPts.push(V(Math.cos(a) * R, y + 1.08, Math.sin(a) * R));
    }
    scene.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(railPts), 480, 0.05, 6), mats.wood));
  });

  // --- deck at the top of the ramp ---
  const deck = new THREE.Mesh(new THREE.CylinderGeometry(RAMP.rin, RAMP.rin, 0.4, 48), mats.planks);
  deck.name = 'deck';
  deck.position.y = RAMP.top - 0.2;
  deck.castShadow = deck.receiveShadow = true;
  scene.add(deck);
  walkables.push(deck);
  for (let k = 0; k < 28; k++) {
    const a = (k / 28) * TAU;
    if (angDist(a, thetaBridge) < 0.35 || angDist(a, rampStart) < 0.45) continue; // openings
    posts.push(V(Math.cos(a) * (RAMP.rin - 0.1), RAMP.top, Math.sin(a) * (RAMP.rin - 0.1)));
  }

  // --- bridge through the gap ---
  const out = V(Math.cos(thetaBridge), 0, Math.sin(thetaBridge));
  const side = V(-Math.sin(thetaBridge), 0, Math.cos(thetaBridge));
  const { bridgeFrom: B0, bridgeTo: B1, bridgeWidth: BW } = LOOKOUT;
  const bridge = new THREE.Mesh(new THREE.BoxGeometry(B1 - B0, 0.4, BW), mats.planks);
  bridge.name = 'bridge';
  bridge.position.copy(out).multiplyScalar((B0 + B1) / 2).setY(RAMP.top - 0.2);
  bridge.rotation.y = -thetaBridge;
  bridge.castShadow = bridge.receiveShadow = true;
  scene.add(bridge);
  walkables.push(bridge);
  for (let d = B0 + 0.5; d <= B1; d += 1.6) {
    for (const s of [-1, 1]) posts.push(out.clone().multiplyScalar(d).addScaledVector(side, s * (BW / 2 - 0.08)).setY(RAMP.top));
  }
  for (const s of [-1, 1]) {
    const a = out.clone().multiplyScalar(B0).addScaledVector(side, s * (BW / 2 - 0.08)).setY(RAMP.top + 1.08);
    const b = out.clone().multiplyScalar(B1).addScaledVector(side, s * (BW / 2 - 0.08)).setY(RAMP.top + 1.08);
    scene.add(beam(a, b, 0.05, mats.rope));
  }

  // --- lookout platform + struts back to the trunk ---
  const lookout = new THREE.Mesh(new THREE.CylinderGeometry(LOOKOUT.radius, LOOKOUT.radius, 0.4, 40), mats.planks);
  lookout.name = 'lookout';
  lookout.position.copy(out).multiplyScalar(LOOKOUT.centre).setY(RAMP.top - 0.2);
  lookout.castShadow = lookout.receiveShadow = true;
  scene.add(lookout);
  walkables.push(lookout);
  const bridgeEnd = out.clone().multiplyScalar(B1).setY(RAMP.top);
  for (let k = 0; k < 26; k++) {
    const a = (k / 26) * TAU;
    const p = V(lookout.position.x + Math.cos(a) * (LOOKOUT.radius - 0.1), RAMP.top, lookout.position.z + Math.sin(a) * (LOOKOUT.radius - 0.1));
    if (p.distanceTo(bridgeEnd) > 1.6) posts.push(p);
  }
  const ring = new THREE.Mesh(new THREE.TorusGeometry(LOOKOUT.radius - 0.1, 0.05, 6, 64), mats.rope);
  ring.rotation.x = Math.PI / 2;
  ring.position.copy(lookout.position).setY(RAMP.top + 1.08);
  scene.add(ring);
  for (const s of [-1, 0, 1]) {
    const top = lookout.position.clone().addScaledVector(side, s * 2.6).addScaledVector(out, s === 0 ? 2.5 : -1).setY(RAMP.top - 0.4);
    const bottom = out.clone().multiplyScalar(ringR(22) + 1).addScaledVector(side, s * 3).setY(22);
    scene.add(beam(top, bottom, 0.28, mats.wood));
  }
  scene.add(beam(out.clone().multiplyScalar(17).setY(RAMP.top - 0.4), out.clone().multiplyScalar(ringR(28) + 0.5).setY(28), 0.2, mats.wood));

  // --- posts and lanterns as instances ---
  const postGeo = new THREE.BoxGeometry(0.12, 1.1, 0.12).translate(0, 0.55, 0);
  const postMesh = new THREE.InstancedMesh(postGeo, mats.wood, posts.length);
  const m4 = new THREE.Matrix4();
  posts.forEach((p, i) => postMesh.setMatrixAt(i, m4.makeTranslation(p.x, p.y, p.z)));
  postMesh.castShadow = true;
  scene.add(postMesh);

  const lanternMesh = new THREE.InstancedMesh(new THREE.SphereGeometry(0.22, 12, 8), mats.lantern, lanterns.length);
  lanterns.forEach((p, i) => lanternMesh.setMatrixAt(i, m4.makeTranslation(p.x, p.y, p.z)));
  scene.add(lanternMesh);

  // A few unshadowed point lights stand in for the lanterns (point shadows cost 6 renders each).
  const lights = [3, 13, 23, 33].map((y) => {
    const L = new THREE.PointLight(0xffb867, 90, 30, 2);
    L.position.set(0, y, 0);
    scene.add(L);
    return L;
  });

  // --- floor of the hollow + trail to the entrance, lined with stones ---
  const inner = new THREE.Mesh(new THREE.CircleGeometry(11, 48), mats.innerFloor);
  inner.rotation.x = -Math.PI / 2;
  inner.position.y = 0.02;
  inner.receiveShadow = true;
  scene.add(inner);

  const trailPts = [];
  for (let k = 0; k <= 40; k++) {
    const r = 9 + k * 2.2;
    const a = thetaEntrance + Math.sin(k * 0.18) * 0.06 * (k / 40);
    trailPts.push([Math.cos(a) * r, Math.sin(a) * r]);
  }
  const tp = [], tuv = [], ti = [], stones = [];
  trailPts.forEach(([x, z], k) => {
    const [nx, nz] = trailPts[Math.min(k + 1, trailPts.length - 1)];
    const [px, pz] = trailPts[Math.max(k - 1, 0)];
    let dx = nx - px, dz = nz - pz;
    const l = Math.hypot(dx, dz); dx /= l; dz /= l;
    const w = 1.7 * (1 + 0.15 * Math.sin(k * 0.9));
    tp.push(x - dz * w, 0.03, z + dx * w, x + dz * w, 0.03, z - dx * w);
    tuv.push(0, k * 0.7, 1, k * 0.7);
    if (k < trailPts.length - 1) { const b = k * 2; ti.push(b, b + 1, b + 2, b + 1, b + 3, b + 2); }
    if (k % 2 === 0 && k > 2) for (const s of [-1, 1]) stones.push([x - dz * w * s * 1.25, z + dx * w * s * 1.25]);
  });
  const tg = new THREE.BufferGeometry();
  tg.setAttribute('position', new THREE.Float32BufferAttribute(tp, 3));
  tg.setAttribute('uv', new THREE.Float32BufferAttribute(tuv, 2));
  tg.setIndex(ti); tg.computeVertexNormals();
  const trail = new THREE.Mesh(tg, mats.trail);
  trail.receiveShadow = true;
  scene.add(trail);

  const stoneMesh = new THREE.InstancedMesh(new THREE.DodecahedronGeometry(0.35, 0), mats.stone, stones.length);
  const q = new THREE.Quaternion(), e = new THREE.Euler();
  stones.forEach(([x, z], i) => {
    const s = 0.7 + rand() * 0.8;
    stoneMesh.setMatrixAt(i, m4.compose(V(x, 0.05, z), q.setFromEuler(e.set(rand(), rand() * 6, rand())), V(s, s * 0.55, s)));
  });
  stoneMesh.castShadow = stoneMesh.receiveShadow = true;
  scene.add(stoneMesh);

  return { walkables, lights };
}

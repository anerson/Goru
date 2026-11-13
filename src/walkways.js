// Every built path in the world. Inside the trunk: a four-turn spiral ramp along the wall,
// four circular galleries (75/150/225/300 m), short bridges from each gallery onto that level's
// ecosystem, and from the top gallery three bridges out to lookouts. Outside: nine trails
// to the trunk entrances, a loop around the tree and a long approach. Floors you can stand on
// are returned in `walkables`; the player finds the floor with a downward ray against them.
import * as THREE from 'three';
import { mulberry32 } from './noise.js';
import {
  SEED, TAU, TRUNK, RAMP, GALLERY, TOP_BRIDGES, LOOKOUT, LEVEL_COLORS, DISK_R, junctionAngle, levelBridges,
  ENTRANCES, LOOP_R, APPROACH, ringR, strandR, strandTheta, rampAt,
} from './tree/layout.js';
import { V, angDist, polar, ribbon, offsetLine, label } from './geom.js';

const UP = V(0, 1, 0);

const circle = (r, y, n, a0 = 0) => Array.from({ length: n }, (_, i) => polar(r, a0 + (i / n) * TAU, y));
const rampLine = (r, n) => Array.from({ length: n + 1 }, (_, i) => { const { a, y } = rampAt(i / n); return polar(r, a, y); });
const sagLine = (from, to, sag, n) => Array.from({ length: n + 1 }, (_, i) => {
  const t = i / n;
  return from.clone().lerp(to, t).setY(from.y + (to.y - from.y) * t - sag * Math.sin(Math.PI * t));
});

export function buildWalkways(scene, mats) {
  const rand = mulberry32(SEED + 3);
  const walkables = [];
  const posts = [];           // railing posts (instanced)
  const beams = [];           // [a, b, radius] structural beams (instanced)
  const lanterns = [];        // [position, colour]
  let totalLength = 0;

  const floor = (geo, mat, name) => {
    const m = new THREE.Mesh(geo, mat);
    m.name = name;
    m.castShadow = m.receiveShadow = true;
    scene.add(m);
    walkables.push(m);
    totalLength += geo.userData.length || 0;
    return m;
  };
  const rail = (line, closed = false, mat = mats.wood, radius = 0.06) => {
    if (line.length < 2) return;
    const curve = new THREE.CatmullRomCurve3(line.map((p) => p.clone().setY(p.y + 1.1)), closed);
    scene.add(new THREE.Mesh(new THREE.TubeGeometry(curve, Math.min(line.length * 3, 3000), radius, 5, closed), mat));
  };
  // posts every `step` metres along a line, except where skip(point) says there is an opening
  const postsAlong = (line, step, skip = () => false) => {
    let acc = step;
    for (let i = 1; i < line.length; i++) {
      acc += line[i].distanceTo(line[i - 1]);
      if (acc >= step) { acc = 0; if (!skip(line[i])) posts.push(line[i]); }
    }
  };
  // split a line into runs where keep(point) holds (for handrails broken by openings)
  const runs = (line, keep) => {
    const out = []; let cur = [];
    for (const p of line) { if (keep(p)) cur.push(p); else { if (cur.length > 1) out.push(cur); cur = []; } }
    if (cur.length > 1) out.push(cur);
    return out;
  };
  const atJunction = (p) => {
    const a = Math.atan2(p.z, p.x);
    return GALLERY.levels.some((L) => Math.abs(p.y - L) < 2 && angDist(a, junctionAngle(L)) < 0.11);
  };

  // ---- spiral ramp -------------------------------------------------------
  const RN = RAMP.turns * 240;
  const rampMid = (RAMP.rin + RAMP.rout) / 2;
  floor(ribbon(rampLine(rampMid, RN), RAMP.rout - RAMP.rin), mats.planks, 'ramp');
  {
    const inner = rampLine(RAMP.rin + 0.15, RN), outer = rampLine(RAMP.rout - 0.15, RN);
    postsAlong(inner, 4, atJunction);
    postsAlong(outer, 4, atJunction);
    for (const run of runs(inner, (p) => !atJunction(p))) rail(run);
    for (const run of runs(outer, (p) => !atJunction(p))) rail(run);
    // fascia under both edges
    for (const R of [RAMP.rin, RAMP.rout]) {
      const top = rampLine(R, RN), pos = [], idx = [];
      top.forEach((p, i) => {
        pos.push(p.x, p.y, p.z, p.x, p.y - 0.6, p.z);
        if (i < top.length - 1) { const k = i * 2; idx.push(k, k + 1, k + 2, k + 1, k + 3, k + 2); }
      });
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      g.setIndex(idx); g.computeVertexNormals();
      scene.add(new THREE.Mesh(g, mats.woodDouble));
    }
    // supports: posts to the ground near the bottom, brackets into the nearest strand above that
    const n = Math.round((RAMP.turns * TAU * rampMid) / 12);
    for (let k = 0; k <= n; k++) {
      const { a, y } = rampAt(k / n);
      if (y < 14) {
        for (const R of [RAMP.rin + 0.5, RAMP.rout - 0.5]) beams.push([polar(R, a, 0), polar(R, a, y - 0.3), 0.35]);
        continue;
      }
      const yb = y - 12;
      let best = 0, bd = Infinity;
      for (let i = 0; i < TRUNK.strands; i++) { const d = angDist(strandTheta(i, yb), a); if (d < bd) { bd = d; best = i; } }
      const th = strandTheta(best, yb), c = polar(ringR(yb), th, yb);
      const end = c.clone().add(V(-Math.cos(th), 0, -Math.sin(th)).multiplyScalar(strandR(yb) * 0.85));
      beams.push([polar(RAMP.rout - 0.4, a, y - 0.5), end, 0.45]);
      if (k % 6 === 0) lanterns.push([polar(RAMP.rin + 0.15, a, y + 1.4), bandColor(y)]);
    }
  }

  // ---- galleries ---------------------------------------------------------
  const GN = 360;
  const gMid = (GALLERY.rin + GALLERY.rout) / 2;
  for (const level of GALLERY.levels) {
    floor(ribbon(circle(gMid, level, GN), GALLERY.rout - GALLERY.rin, true), mats.planks, `gallery-${level}`);
    const mouths = levelBridges(level), junction = junctionAngle(level);
    const outerMouths = level === RAMP.top ? TOP_BRIDGES : [];
    const inner = circle(GALLERY.rin + 0.15, level, GN), outer = circle(GALLERY.rout - 0.15, level, GN);
    const innerOpen = (p) => { const a = Math.atan2(p.z, p.x); return angDist(a, junction) < 0.11 || mouths.some((m) => angDist(a, m) < 0.03); };
    const outerOpen = (p) => { const a = Math.atan2(p.z, p.x); return outerMouths.some((m) => angDist(a, m) < 0.025); };
    postsAlong(inner.concat([inner[0]]), 4, innerOpen);
    postsAlong(outer.concat([outer[0]]), 4, outerOpen);
    for (const run of runs(inner.concat([inner[0]]), (p) => !innerOpen(p))) rail(run);
    for (const run of runs(outer.concat([outer[0]]), (p) => !outerOpen(p))) rail(run);
    for (let k = 0; k < 24; k++) lanterns.push([polar(GALLERY.rout - 0.15, (k / 24) * TAU + 0.07, level + 1.4), LEVEL_COLORS[level]]);
    // brackets under the gallery into the strands
    for (let i = 0; i < TRUNK.strands; i++) {
      const th = strandTheta(i, level - 10), c = polar(ringR(level - 10), th, level - 10);
      const end = c.clone().add(V(-Math.cos(th), 0, -Math.sin(th)).multiplyScalar(strandR(level - 10) * 0.85));
      for (const d of [-0.04, 0.04]) beams.push([polar(GALLERY.rout - 0.5, th + d, level - 0.5), end, 0.6]);
    }

    // short bridges across the ramp gap onto the ecosystem, and a rail round the floor's edge
    for (const ang of mouths) {
      const line = Array.from({ length: 9 }, (_, i) => polar(DISK_R - 1 + (i / 8) * (GALLERY.rin - DISK_R + 1.4), ang, level));
      floor(ribbon(line, 3.2), mats.planks, 'level-bridge');
      for (const s of [-1, 1]) {
        const edge = offsetLine(line, s * 1.5);
        postsAlong(edge, 2);
        rail(edge, false, mats.wood, 0.06);
      }
    }
    const edge = circle(DISK_R - 0.2, level, 360);
    const edgeOpen = (p) => { const a = Math.atan2(p.z, p.x); return angDist(a, junction) < 0.11 || mouths.some((m) => angDist(a, m) < 0.035); };
    postsAlong(edge.concat([edge[0]]), 4, edgeOpen);
    for (const run of runs(edge.concat([edge[0]]), (p) => !edgeOpen(p))) rail(run);
  }

  // ---- top bridges and lookouts --------------------------------------------
  const top = RAMP.top;
  const lookoutCentres = [];
  for (const ang of TOP_BRIDGES) {
    const from = polar(GALLERY.rout - 0.2, ang, top), to = polar(LOOKOUT.centre - LOOKOUT.radius + 0.5, ang, top);
    const line = sagLine(from, to, 3, 120);
    floor(ribbon(line, LOOKOUT.width), mats.planks, 'top-bridge');
    for (const s of [-1, 1]) {
      const edge = offsetLine(line, s * (LOOKOUT.width / 2 - 0.1));
      postsAlong(edge, 2.5);
      rail(edge, false, mats.rope, 0.07);
    }
    const c = polar(LOOKOUT.centre, ang, top);
    lookoutCentres.push(c);
    const disk = new THREE.Mesh(new THREE.CylinderGeometry(LOOKOUT.radius, LOOKOUT.radius, 0.6, 64), mats.planks);
    disk.position.copy(c).setY(top - 0.3);
    disk.name = 'lookout';
    disk.castShadow = disk.receiveShadow = true;
    scene.add(disk);
    walkables.push(disk);
    const ring = circle(LOOKOUT.radius - 0.15, top, 120).map((p) => p.add(V(c.x, 0, c.z)));
    const toBridge = (p) => p.distanceTo(to) < 2.2;
    postsAlong(ring.concat([ring[0]]), 3, toBridge);
    for (const run of runs(ring.concat([ring[0]]), (p) => !toBridge(p))) rail(run);
    // struts down to the two strands beside the opening
    for (const s of [-1, 1]) {
      const th = ang + s * (TAU / TRUNK.strands / 2), y = top - 80;
      beams.push([c.clone().setY(top - 0.6).add(V(-Math.sin(ang) * s * 6, 0, Math.cos(ang) * s * 6)), polar(ringR(y), th, y), 1.2]);
    }
    scene.add(label('Mirante', LEVEL_COLORS[300], c.clone().setY(top + 9), 18));
    for (let k = 0; k < 8; k++) lanterns.push([c.clone().add(polar(LOOKOUT.radius - 0.15, (k / 8) * TAU, 1.4)), LEVEL_COLORS[300]]);
  }

  // ---- ground outside: nine trails to the entrances, loop, approach ------------
  const stones = [];
  const trail = (line, width, closed = false) => {
    const g = ribbon(line, width, closed);
    totalLength += g.userData.length;
    const m = new THREE.Mesh(g, mats.trail);
    m.receiveShadow = true;
    scene.add(m);
    if (!closed) for (const s of [-1, 1]) offsetLine(line, s * (width / 2 + 0.6)).forEach((p, i) => { if (i % 2 === 0) stones.push(p); });
  };
  for (const a of ENTRANCES) {
    const line = Array.from({ length: 70 }, (_, i) => polar(96 + (i / 69) * (LOOP_R - 96), a + Math.sin(i * 0.15) * 0.004, 0.05));
    trail(line, 4);
  }
  trail(circle(LOOP_R, 0.05, 400), 5, true);
  trail(Array.from({ length: 120 }, (_, i) => polar(APPROACH.from + (i / 119) * (APPROACH.to - APPROACH.from), APPROACH.angle + Math.sin(i * 0.11) * 0.01, 0.05)), 5);

  const stoneMesh = new THREE.InstancedMesh(new THREE.DodecahedronGeometry(0.5, 0), mats.stone, stones.length);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler();
  stones.forEach((p, i) => {
    const s = 0.7 + rand() * 0.9;
    stoneMesh.setMatrixAt(i, m4.compose(p.clone().setY(0.1), q.setFromEuler(e.set(rand(), rand() * 6, rand())), V(s, s * 0.55, s)));
  });
  stoneMesh.castShadow = stoneMesh.receiveShadow = true;
  scene.add(stoneMesh);

  // ---- instanced posts, beams and lanterns ----------------------------------
  const postMesh = new THREE.InstancedMesh(new THREE.BoxGeometry(0.14, 1.15, 0.14).translate(0, 0.575, 0), mats.wood, posts.length);
  posts.forEach((p, i) => postMesh.setMatrixAt(i, m4.makeTranslation(p.x, p.y, p.z)));
  postMesh.castShadow = true;
  scene.add(postMesh);

  const beamMesh = new THREE.InstancedMesh(new THREE.CylinderGeometry(1, 1, 1, 8).translate(0, 0.5, 0), mats.wood, beams.length);
  beams.forEach(([a, b, r], i) => {
    const d = b.clone().sub(a);
    beamMesh.setMatrixAt(i, m4.compose(a, q.setFromUnitVectors(UP, d.clone().normalize()), V(r, d.length(), r)));
  });
  beamMesh.castShadow = beamMesh.receiveShadow = true;
  scene.add(beamMesh);

  const lanternMesh = new THREE.InstancedMesh(new THREE.SphereGeometry(0.3, 12, 8), new THREE.MeshBasicMaterial({ color: '#ffffff' }), lanterns.length);
  const col = new THREE.Color();
  lanterns.forEach(([p, c], i) => {
    lanternMesh.setMatrixAt(i, m4.makeTranslation(p.x, p.y, p.z));
    lanternMesh.setColorAt(i, col.set(c).multiplyScalar(2.2));
  });
  scene.add(lanternMesh);

  return { walkables, totalLength, lookoutCentres };
}

function bandColor(y) {
  let best = GALLERY.levels[0];
  for (const L of GALLERY.levels) if (Math.abs(L - y) < Math.abs(best - y)) best = L;
  return LEVEL_COLORS[best];
}

// Creature models built from primitives, with a tiny procedural animation rig:
// legs swing with movement, the body dips for a wind-up, and every material can flash.
// Every creature faces -z, like the explorer, so the same yaw convention applies.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { lumpy, boulder } from '../organic.js';
import { REGIONS, gameStats } from './bestiary.js';

const mat = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.75, ...o });

function rig(root, body, legs, mats, { radius, height, dip = height, extra = {} }) {
  let phase = 0;
  const base = body.position.y;
  return {
    root, radius, height, ...extra,
    // speed in m/s, windup 0..1 (crouch), dt
    animate(dt, speed, windup = 0) {
      phase += dt * (3 + speed * 1.6);
      const k = Math.min(speed / 3, 1);
      const swing = Math.sin(phase) * k * 0.6;
      legs.forEach((l, i) => { l.rotation.x = (i % 2 ? swing : -swing) + (l.userData.rest ?? 0); });
      body.position.y = base - windup * 0.25 * dip + Math.abs(Math.sin(phase)) * 0.03 * Math.min(speed, 1);
      body.rotation.x = -windup * 0.25;
      extra.onAnimate?.(phase, windup, k);
    },
    flash(k) { for (const m of mats) m.emissiveIntensity = k; },
  };
}

// four-legged animals: wolves, big cats, boars, the beast king. A deep chest and slimmer hips,
// a neck that lifts the head, a muzzle with a dark nose and a jaw, eyes with a bright iris,
// two-part legs with paws, a ruff of fur at the neck and a tail made of shrinking segments.
function quadruped({ color, belly, size = 1, snout = true, tail = true }) {
  const root = new THREE.Group();
  const fur = mat(color, { emissive: '#ffffff', emissiveIntensity: 0 });
  const light = mat(belly, { emissive: '#ffffff', emissiveIntensity: 0 });
  const dark = mat('#1a1410', { roughness: 0.4 });
  const add = (parent, geo, m, x, y, z, sx = 1, sy = 1, sz = 1, rx = 0, ry = 0, rz = 0) => {
    const o = new THREE.Mesh(geo, m);
    o.position.set(x * size, y * size, z * size); o.scale.set(sx, sy, sz); o.rotation.set(rx, ry, rz);
    o.castShadow = true; parent.add(o); return o;
  };
  const S = (r) => new THREE.SphereGeometry(r * size, 24, 18);
  const body = new THREE.Group();
  body.position.y = 0.78 * size;
  root.add(body);
  add(body, S(0.32), fur, 0, 0.04, -0.28, 1, 1.05, 1.15);                // chest
  add(body, S(0.26), fur, 0, 0.0, 0.3, 1, 0.95, 1.2);                    // hips
  add(body, new THREE.CapsuleGeometry(0.25 * size, 0.42 * size, 8, 20), fur, 0, 0.0, 0, 1, 1, 1, Math.PI / 2);
  add(body, new THREE.CapsuleGeometry(0.2 * size, 0.5 * size, 8, 16), light, 0, -0.1, -0.05, 1, 0.8, 1, Math.PI / 2);   // belly
  // a ruff of fur around the neck
  for (let k = 0; k < 9; k++) { const a = (k / 9) * Math.PI * 2; add(body, new THREE.ConeGeometry(0.07 * size, 0.24 * size, 6), fur, Math.cos(a) * 0.24, 0.12 + Math.sin(a) * 0.2, -0.45, 1, 1, 1, Math.PI / 2 + 0.3, 0, a); }
  const neck = new THREE.Group(); neck.position.set(0, 0.16 * size, -0.48 * size); neck.rotation.x = 0.55; body.add(neck);
  add(neck, new THREE.CylinderGeometry(0.13 * size, 0.18 * size, 0.36 * size, 16), fur, 0, 0.12, 0);
  const head = new THREE.Group(); head.position.set(0, 0.32 * size, -0.05 * size); head.rotation.x = -0.55; neck.add(head);
  add(head, S(0.18), fur, 0, 0.02, 0, 1, 0.92, 1.05);                    // skull
  if (snout) {
    add(head, new THREE.CapsuleGeometry(0.09 * size, 0.16 * size, 6, 14), light, 0, -0.04, -0.2, 1, 0.85, 1, Math.PI / 2);
    add(head, S(0.045), dark, 0, -0.01, -0.33);                         // nose
    add(head, new THREE.CapsuleGeometry(0.06 * size, 0.12 * size, 6, 12), light, 0, -0.1, -0.17, 1, 0.6, 1, Math.PI / 2 - 0.15);   // jaw
  }
  for (const sx of [-1, 1]) {
    add(head, new THREE.ConeGeometry(0.065 * size, 0.18 * size, 4), fur, sx * 0.1, 0.17, 0.03, 1, 1, 0.45, -0.15, 0, sx * -0.25);   // ears
    add(head, S(0.038), mat('#f4efe6', { roughness: 0.3 }), sx * 0.085, 0.05, -0.13);                                              // eye
    add(head, S(0.024), new THREE.MeshBasicMaterial({ color: '#ffcf4a' }), sx * 0.092, 0.055, -0.155);                             // iris
  }
  if (tail) {
    const tl = new THREE.Group(); tl.position.set(0, 0.12 * size, 0.52 * size); tl.rotation.x = -0.9; body.add(tl);
    for (let k = 0; k < 5; k++) add(tl, S(0.075 - k * 0.011), k === 4 ? light : fur, 0, 0.11 + k * 0.11, k * k * 0.008);
  }
  // legs: a thick upper part on the pivot, a slimmer lower part and a paw
  const leg = (x, z, front) => {
    const p = new THREE.Group();
    p.position.set(x * size, 0.72 * size, z * size);
    root.add(p);
    add(p, new THREE.CapsuleGeometry(0.085 * size, 0.24 * size, 6, 12), fur, 0, -0.18, front ? 0 : 0.03);
    add(p, new THREE.CapsuleGeometry(0.055 * size, 0.26 * size, 6, 12), fur, 0, -0.48, front ? -0.02 : 0.05);
    add(p, S(0.07), dark, 0, -0.66, -0.04, 1, 0.55, 1.3);
    return p;
  };
  const legs = [leg(-0.17, -0.34, true), leg(0.17, -0.34, true), leg(-0.16, 0.32, false), leg(0.16, 0.32, false)];
  return rig(root, body, legs, [fur, light], {
    radius: 0.6 * size, height: 1.15 * size,
    extra: { body, head, onAnimate(phase, windup) { head.rotation.x = -0.55 - windup * 0.3; } },
  });
}

// ---------------------------------------------------------------- shared shape helpers
// The builders below are modelled at size 1 inside a group scaled by `size`, so every
// geometry is built once and shared by all the creatures that use it.
const GEO = new Map();
const geo = (key, make) => { if (!GEO.has(key)) GEO.set(key, make()); return GEO.get(key); };
const ball = () => geo('ball', () => new THREE.SphereGeometry(1, 22, 16));
const dome = () => geo('dome', () => new THREE.SphereGeometry(1, 22, 10, 0, Math.PI * 2, 0, Math.PI / 2));
const rock = (seed) => geo(`rock${seed}`, () => boulder(seed));
const blob = (seed, amp = 0.3) => geo(`blob${seed},${amp}`, () => lumpy({ detail: 2, amp, seed }));
const _m4 = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _s = new THREE.Vector3();
// a copy of `g` moved, turned and scaled (for merging many small parts into one mesh)
const placed = (g, x, y, z, sx = 1, sy = sx, sz = sx, rx = 0, ry = 0, rz = 0) =>
  g.clone().applyMatrix4(_m4.compose(new THREE.Vector3(x, y, z), _q.setFromEuler(_e.set(rx, ry, rz)), _s.set(sx, sy, sz)));
const merged = (key, make) => geo(key, () => { const parts = make(); const g = mergeGeometries(parts); parts.forEach((p) => p.dispose()); return g; });
// a smooth tube through points that narrows from r0 to r1 (legs, horns, tails, antennae)
function taper(points, r0, r1, radial = 8, seg = 16) {
  const curve = new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p)));
  const g = new THREE.TubeGeometry(curve, seg, 1, radial, false);
  const p = g.attributes.position, v = new THREE.Vector3(), c = new THREE.Vector3();
  for (let i = 0; i <= seg; i++) {
    const t = i / seg, r = r0 + (r1 - r0) * t;
    curve.getPointAt(t, c);
    for (let j = 0; j <= radial; j++) {
      const k = i * (radial + 1) + j;
      v.fromBufferAttribute(p, k).sub(c).multiplyScalar(r).add(c);
      p.setXYZ(k, v.x, v.y, v.z);
    }
  }
  g.computeVertexNormals();
  return g;
}
const add = (parent, g, m, x = 0, y = 0, z = 0, sx = 1, sy = sx, sz = sx, rx = 0, ry = 0, rz = 0) => {
  const o = new THREE.Mesh(g, m);
  o.position.set(x, y, z); o.scale.set(sx, sy, sz); o.rotation.set(rx, ry, rz);
  o.castShadow = true;
  parent.add(o);
  return o;
};
// parts that should not get the cartoon outline (flat sheets, thin trailing bits)
const noLine = (o) => { o.userData.hasOutline = true; return o; };
const grp = (parent, x = 0, y = 0, z = 0) => { const g = new THREE.Group(); g.position.set(x, y, z); parent.add(g); return g; };
const tint = (c, to, k) => '#' + new THREE.Color(c).lerp(new THREE.Color(to), k).getHexString();
const flashMat = (color, o = {}) => mat(color, { emissive: '#ffffff', emissiveIntensity: 0, ...o });
const EYE_DARK = () => mat('#120c10', { roughness: 0.2 });
const SHINE = new THREE.MeshBasicMaterial({ color: '#ffffff' });
// a pair of cartoon eyes: glossy dark balls with a white glint (one mesh each)
function bugEyes(parent, x, y, z, r, m = EYE_DARK()) {
  add(parent, merged(`eyes${x},${y},${z},${r}`, () => [-1, 1].map((s) => placed(ball(), s * x, y, z, r, r * 1.1, r))), m);
  add(parent, merged(`glint${x},${y},${z},${r}`, () => [-1, 1].map((s) => placed(ball(), s * x + s * r * 0.25, y + r * 0.45, z - r * 0.7, r * 0.3))), SHINE).castShadow = false;
}

// insects and arachnids: beetles (split wing cases, antennae), spiders (big round abdomen,
// eight high-kneed legs, a cluster of eyes), scorpions (armour plates, claws, a curled tail)
// and the legless ones (snakes, leeches, the leviathan) made of a swaying chain of segments.
function arthropod({ color, shell, size = 1, legs: nLegs = 6, pincers = false, stinger = false, mandibles = false, long = 1, worm = 'snake' }) {
  if (nLegs === 0) return wyrm({ color, shell, size, long, worm });
  const root = new THREE.Group();
  const S = grp(root); S.scale.setScalar(size);
  const skin = flashMat(color, { roughness: 0.55 });
  const carapace = flashMat(shell, { roughness: 0.3 });
  const big = size >= 2.4;
  const pattern = mat(tint(shell, '#fff4c0', 0.45), { roughness: 0.3, emissive: shell, emissiveIntensity: big ? 0.5 : 0.1 });
  const spider = nLegs === 8 && !pincers, scorpion = pincers;
  const L = long;
  const body = grp(S, 0, scorpion ? 0.36 : 0.45, 0);
  // thorax and head
  add(body, ball(), skin, 0, 0.02, -0.16 * L, 0.27, 0.22, 0.28);
  const head = grp(body, 0, scorpion ? 0 : 0.05, (spider ? -0.36 : -0.44) * L);
  add(head, ball(), spider ? skin : carapace, 0, 0, 0, 0.22, 0.19, 0.22);
  if (spider) {
    bugEyes(head, 0.07, 0.07, -0.17, 0.055);
    add(head, merged('spEyes', () => [[-0.13, 0.12], [0.13, 0.12], [-0.05, 0.16], [0.05, 0.16]].map(([x, y]) => placed(ball(), x, y, -0.12, 0.03))), mat('#ff3b2f', { emissive: '#ff3b2f', emissiveIntensity: 0.6 }));
    // fangs
    add(head, merged('fangs', () => [-1, 1].map((s) => taper([[s * 0.06, -0.06, -0.15], [s * 0.07, -0.16, -0.2], [s * 0.04, -0.24, -0.16]], 0.04, 0.008, 6, 6))), carapace);
  } else {
    bugEyes(head, 0.12, 0.05, -0.12, scorpion ? 0.045 : 0.07);
    if (!scorpion) add(head, merged('antennae', () => [-1, 1].map((s) => taper([[s * 0.07, 0.12, -0.12], [s * 0.18, 0.4, -0.3], [s * 0.3, 0.5, -0.5], [s * 0.36, 0.42, -0.62]], 0.022, 0.01, 5, 12))), skin);
  }
  if (mandibles && !pincers) add(head, merged('mandibles', () => [-1, 1].map((s) => taper([[s * 0.1, -0.06, -0.12], [s * 0.18, -0.06, -0.3], [s * 0.1, -0.05, -0.45], [s * 0.01, -0.04, -0.47]], 0.05, 0.01, 6, 10))), carapace);
  if (size >= 1.8 && !spider && !scorpion) add(head, merged('horn', () => [taper([[0, 0.1, -0.1], [0, 0.32, -0.3], [0, 0.62, -0.32], [0, 0.78, -0.18]], 0.09, 0.015, 8, 12)]), pattern);
  // abdomen
  if (spider) {
    const ab = grp(body, 0, 0.14, 0.32 * L);
    ab.rotation.x = -0.35;
    add(ab, ball(), skin, 0, 0, 0, 0.42, 0.36, 0.48 * L);
    add(ab, merged('spMark', () => [0, 1, 2].map((k) => placed(ball(), 0, 0.31 - k * 0.04, -0.12 + k * 0.18, 0.16 - k * 0.03, 0.06, 0.09))), pattern);
    add(ab, merged('spSpots', () => [-1, 1].flatMap((s) => [placed(ball(), s * 0.24, 0.24, 0.0, 0.07, 0.04, 0.07), placed(ball(), s * 0.26, 0.18, 0.22, 0.06, 0.04, 0.06)])), carapace);
  } else if (scorpion) {
    for (let k = 0; k < 4; k++) add(body, ball(), k % 2 ? carapace : skin, 0, 0.02 + k * 0.01, (0.0 + k * 0.15) * L, 0.3 - k * 0.03, 0.14, 0.14);
    add(body, merged('scPlates', () => [0, 1, 2, 3].map((k) => placed(ball(), 0, 0.1 + k * 0.01, k * 0.15, 0.22 - k * 0.025, 0.05, 0.11))), pattern);
  } else {
    add(body, ball(), skin, 0, -0.03, 0.26 * L, 0.38, 0.24, 0.5 * L);
    const halves = [-1, 1].map((s) => {
      const g = new THREE.SphereGeometry(1, 16, 10, s > 0 ? Math.PI / 2 : -Math.PI / 2, Math.PI, 0, Math.PI / 2);
      return g;
    });
    halves.forEach((g, i) => add(body, g, carapace, (i ? 1 : -1) * 0.012, -0.02, 0.27 * L, 0.42, 0.34, 0.56 * L, 0, 0, (i ? -1 : 1) * 0.05));
    add(body, merged(`beSpots${L}`, () => [-1, 1].flatMap((s) => [placed(ball(), s * 0.2, 0.27, 0.12 * L, 0.08, 0.05, 0.1), placed(ball(), s * 0.22, 0.24, 0.42 * L, 0.07, 0.05, 0.08), placed(ball(), s * 0.12, 0.31, 0.27 * L, 0.05, 0.04, 0.06)])), pattern);
  }
  if (big) add(body, merged(`spikes${L},${spider}`, () => [0, 1, 2, 3, 4].map((k) => placed(new THREE.ConeGeometry(0.06, 0.28, 8), 0, (spider ? 0.48 : 0.36) - Math.abs(k - 2) * 0.03, (-0.05 + k * 0.15) * L, 1, 1 + (k === 2 ? 0.4 : 0), 1, 0.25))), pattern);
  const parts = {};
  if (pincers) {
    parts.claws = [-1, 1].map((s) => {
      const p = grp(body, s * 0.18, 0, -0.42 * L);
      add(p, taper([[0, 0, 0], [s * 0.18, 0.05, -0.12], [s * 0.2, 0.06, -0.3]], 0.07, 0.05, 8, 8), skin);
      const hand = grp(p, s * 0.2, 0.06, -0.38);
      add(hand, ball(), carapace, 0, 0, 0, 0.13, 0.1, 0.16);
      add(hand, taper([[s * 0.04, 0, -0.1], [s * 0.06, 0, -0.25], [0, 0, -0.36]], 0.06, 0.01, 8, 8), carapace);
      const finger = grp(hand, -s * 0.05, 0, -0.1);
      add(finger, taper([[0, 0, 0], [-s * 0.04, 0, -0.14], [s * 0.03, 0, -0.25]], 0.045, 0.01, 8, 8), pattern);
      p.userData.finger = finger;
      return p;
    });
  }
  if (stinger) {
    let parent = body, z = 0.55 * L, y = 0.06;
    parts.tail = [];
    for (let k = 0; k < 5; k++) {
      const seg = grp(parent, 0, y, z);
      seg.rotation.x = -0.5;
      add(seg, ball(), k % 2 ? skin : carapace, 0, 0, 0, 0.12 - k * 0.012, 0.12 - k * 0.012, 0.15 - k * 0.012);
      parts.tail.push(seg);
      parent = seg; z = 0.0; y = 0.2;
    }
    add(parent, ball(), pattern, 0, 0.14, -0.04, 0.11, 0.13, 0.11);
    add(parent, taper([[0, 0.2, -0.06], [0, 0.32, -0.16], [0, 0.28, -0.32]], 0.05, 0.005, 8, 8), mat('#2a1a10', { roughness: 0.3 }));
  }
  // legs: one smooth tube each, rising to a high knee and down to the ground, splayed fore and aft
  const reach = spider ? [0.48, 0.38, 0.9] : scorpion ? [0.32, 0.14, 0.56] : [0.36, 0.22, 0.64];
  const hipY = body.position.y;
  const legGeo = geo(`leg${reach}`, () => taper([[0, 0, 0], [reach[0] * 0.5, reach[1] * 0.85, 0], [reach[0], reach[1], 0], [(reach[0] + reach[2]) / 2, (reach[1] - hipY) / 2, 0], [reach[2], -hipY + 0.02, 0]], spider ? 0.045 : scorpion ? 0.06 : 0.07, 0.018, 7, 18));
  const legs = [];
  const per = nLegs / 2;
  for (let i = 0; i < per; i++) {
    const f = per > 1 ? i / (per - 1) : 0.5;
    for (const s of [-1, 1]) {
      const p = grp(S, s * 0.14, hipY, (-0.3 + f * (spider ? 0.26 : 0.36)) * L);
      const spread = 0.7 - f * 1.4;
      p.userData.rest = s > 0 ? spread : Math.PI - spread;
      p.userData.off = ((i + (s > 0 ? 0 : 1)) % 2) * Math.PI;
      p.rotation.y = p.userData.rest;
      add(p, legGeo, i % 2 ? skin : carapace);
      legs.push(p);
    }
  }
  return rig(root, body, [], [skin, carapace], {
    radius: 0.7 * size * long, height: 0.9 * size, dip: 0.9,
    extra: {
      onAnimate(phase, windup, k) {
        legs.forEach((l) => { const a = phase * 1.6 + l.userData.off; l.rotation.y = l.userData.rest + Math.sin(a) * 0.32 * k; l.rotation.z = Math.max(0, Math.cos(a)) * 0.3 * k; });
        head.rotation.x = -windup * 0.2;
        if (parts.claws) parts.claws.forEach((c, i) => { c.rotation.y = (i ? -1 : 1) * (0.15 + Math.sin(phase * 2) * 0.12 + windup * 0.5); c.userData.finger.rotation.y = (i ? 1 : -1) * (0.15 + Math.abs(Math.sin(phase * 3)) * 0.35); });
        if (parts.tail) parts.tail.forEach((t, n) => { t.rotation.x = -0.5 - windup * 0.28 * (n + 1) / 5 + Math.sin(phase * 1.3 + n) * 0.04; });
      },
    },
  });
}

// legless: a chain of segments that sways like a snake; banded in two colours.
// worm: 'snake' (eyes, forked tongue), 'leech' (a round sucking mouth), 'eel' (the
// leviathan: fins, a jaw full of teeth, glowing spots)
function wyrm({ color, shell, size, long, worm }) {
  const root = new THREE.Group();
  const S = grp(root); S.scale.setScalar(size);
  const skin = flashMat(color, { roughness: 0.5 });
  const band = flashMat(shell, { roughness: 0.35 });
  const body = grp(S, 0, 0.3, 0);
  const n = Math.round(6 + long * 2.2), segLen = 0.24 * long * 6 / n;
  const segs = [];
  for (let k = 0; k < n; k++) {
    const t = k / (n - 1), r = 0.27 * (1 - t * 0.7) * (worm === 'leech' ? 1.15 - Math.abs(t - 0.4) * 0.6 : 1);
    const o = add(body, ball(), k % 2 ? band : skin, 0, 0, -0.2 * long + k * segLen, r, r * (worm === 'leech' ? 0.75 : 0.85), r * 1.25);
    o.userData = { z: o.position.z, r, t };
    segs.push(o);
  }
  if (worm === 'eel') add(body, merged(`eelFins${n}`, () => [1, 2, 3, 4, 5, 6].map((k) => placed(new THREE.ConeGeometry(0.1, 0.4, 8), 0, 0.2 - k * 0.012, -0.2 * long + k * segLen * 1.4, 0.4, 1, 1.5, 0.5))), band);
  const head = grp(body, 0, worm === 'snake' ? 0.22 : 0.05, -0.2 * long - 0.26);
  head.rotation.x = worm === 'snake' ? 0.3 : 0;
  add(head, ball(), skin, 0, 0, 0, 0.26, 0.2, 0.32);
  if (worm === 'leech') {
    add(head, new THREE.TorusGeometry(0.15, 0.06, 10, 20), band, 0, 0, -0.27);
    add(head, ball(), mat('#3a0f12'), 0, 0, -0.26, 0.13, 0.13, 0.04);
  } else {
    add(head, ball(), band, 0, -0.04, -0.06, 0.22, 0.12, 0.3);       // lighter jaw
    const eyeM = mat(worm === 'eel' ? '#e8fbff' : '#ffe14a', { roughness: 0.2, emissive: worm === 'eel' ? '#7fe3ff' : '#000000', emissiveIntensity: 0.4 });
    add(head, merged('wyEyes', () => [-1, 1].map((s) => placed(ball(), s * 0.16, 0.1, -0.08, 0.08))), eyeM);
    add(head, merged('wyPupils', () => [-1, 1].map((s) => placed(ball(), s * 0.19, 0.11, -0.12, 0.02, 0.06, 0.04))), EYE_DARK());
    if (worm === 'snake') add(head, merged('tongue', () => [-1, 1].map((s) => taper([[0, -0.05, -0.28], [0, -0.05, -0.4], [s * 0.04, -0.04, -0.48]], 0.015, 0.006, 5, 6))), mat('#e0304a'));
    else {
      add(head, merged('eelTeeth', () => [-3, -2, -1, 0, 1, 2, 3].map((k) => placed(new THREE.ConeGeometry(0.02, 0.08, 6), k * 0.035, -0.06, -0.26 + Math.abs(k) * 0.02, 1, 1, 1, Math.PI))), mat('#f4efe6'));
      add(head, merged('eelCrest', () => [0, 1, 2].map((k) => placed(new THREE.ConeGeometry(0.05, 0.3, 8), 0, 0.2, -0.05 + k * 0.12, 1, 1, 1, 0.6))), band);
      add(body, merged(`eelGlow${n}`, () => segs.filter((_, k) => k % 2 === 0).flatMap((s) => [-1, 1].map((x) => placed(ball(), x * s.userData.r * 0.75, s.userData.r * 0.35, s.userData.z, 0.04)))), new THREE.MeshBasicMaterial({ color: '#9ff6ff' })).castShadow = false;
    }
  }
  return rig(root, body, [], [skin, band], {
    radius: 0.7 * size * long, height: 0.9 * size, dip: 0.6,
    extra: {
      onAnimate(phase, windup, k) {
        const amp = 0.12 + k * 0.1;
        segs.forEach((s) => { s.position.x = Math.sin(phase * 1.2 - s.userData.t * 5) * amp * (0.3 + s.userData.t); s.position.y = s.userData.t < 0.2 && worm === 'snake' ? (0.2 - s.userData.t) * 1.1 : 0; });
        head.position.x = Math.sin(phase * 1.2 + 0.4) * amp * 0.2;
        head.rotation.x = (worm === 'snake' ? 0.3 : 0) - windup * 0.5;
        head.position.y = (worm === 'snake' ? 0.22 : 0.05) + windup * 0.3;
      },
    },
  });
}

// golems: a heap of rounded boulders with glowing eyes, heavy fists and crystals growing on
// the shoulders and back (ice, stone, bark, fungus or amethyst depending on the colours)
function golem({ color, accent, size = 1, glow = null }) {
  const root = new THREE.Group();
  const S = grp(root); S.scale.setScalar(size);
  const stone = flashMat(color, { roughness: 0.85 });
  const dark = flashMat(tint(color, '#000000', 0.25), { roughness: 0.9 });
  const trim = flashMat(accent, { roughness: 0.5 });
  const crystal = mat(accent, { roughness: 0.2, emissive: glow ?? accent, emissiveIntensity: glow ? 0.9 : 0.25 });
  const eyeGlow = new THREE.MeshBasicMaterial({ color: new THREE.Color(glow ?? '#fff1a8').multiplyScalar(1.6) });
  const body = grp(S, 0, 1.12, 0);
  add(body, rock(31), stone, 0, 0.08, 0, 0.66, 0.62, 0.48);                 // chest
  add(body, rock(32), dark, 0, -0.42, 0.02, 0.44, 0.34, 0.34);              // hips
  add(body, rock(33), trim, 0, 0.0, -0.33, 0.3, 0.26, 0.12);                // a plate on the chest
  add(body, new THREE.OctahedronGeometry(0.09, 0), eyeGlow, 0, 0.02, -0.44, 1, 1.3, 0.6).castShadow = false;   // the heart rune
  const head = grp(body, 0, 0.6, -0.16);
  add(head, rock(34), stone, 0, 0, 0, 0.27, 0.24, 0.26);
  add(head, rock(35), dark, 0, 0.08, -0.13, 0.25, 0.08, 0.12, 0.2);          // heavy brow
  add(head, merged('gEyes', () => [-1, 1].map((s) => placed(ball(), s * 0.1, 0.0, -0.22, 0.055, 0.035, 0.03))), eyeGlow).castShadow = false;
  add(head, rock(36), dark, 0, -0.14, -0.08, 0.18, 0.09, 0.15);             // jaw
  for (const s of [-1, 1]) add(body, rock(37), stone, s * 0.6, 0.36, 0.02, 0.32, 0.28, 0.32, 0, s);   // shoulders
  // crystals on the shoulders and along the back
  add(body, merged('gCrystals', () => [[-0.62, 0.62, 0.05, 0.2, 0.35], [-0.72, 0.55, 0.12, -0.5, 0.25], [0.62, 0.62, 0.05, -0.2, 0.35], [0.7, 0.56, -0.08, 0.5, 0.24],
    [0, 0.55, 0.32, 0.5, 0.45], [-0.18, 0.4, 0.38, 0.8, 0.32], [0.18, 0.42, 0.38, 0.8, 0.36], [0, 0.18, 0.44, 1.1, 0.28]]
    .map(([x, y, z, tilt, h]) => placed(new THREE.OctahedronGeometry(1, 0), x, y, z, 0.08, h, 0.08, tilt, 0, x * 0.6))), crystal);
  const arms = [-1, 1].map((s) => {
    const p = grp(body, s * 0.66, 0.3, 0);
    add(p, rock(38), stone, s * 0.04, -0.32, 0, 0.19, 0.3, 0.19);
    add(p, rock(39), stone, s * 0.06, -0.74, -0.02, 0.25, 0.3, 0.25);
    add(p, rock(40), trim, s * 0.06, -1.06, -0.04, 0.29, 0.24, 0.3);
    return p;
  });
  const legs = [-1, 1].map((s) => {
    const p = grp(S, s * 0.27, 0.78, 0);
    add(p, rock(41), dark, 0, -0.3, 0, 0.23, 0.36, 0.23);
    add(p, rock(42), stone, 0, -0.66, -0.06, 0.28, 0.16, 0.34);
    return p;
  });
  return rig(root, body, legs, [stone, dark, trim], {
    radius: 0.7 * size, height: 1.9 * size, dip: 1.9,
    extra: { onAnimate(phase, windup) { arms.forEach((a, i) => { a.rotation.x = (i ? 1 : -1) * Math.sin(phase) * 0.4 - windup * 1.6; a.rotation.z = (i ? 1 : -1) * 0.1; }); head.rotation.x = -windup * 0.25; } },
  });
}

// ash, fire, rot and crystal elementals: a glowing flame-shaped heart with a face, an aura,
// floating armour chunks for shoulders and fists, a crown of flame and a trailing tail of smoke
function elemental({ color, core, size = 1, shards = false }) {
  const root = new THREE.Group();
  const S = grp(root); S.scale.setScalar(size);
  const shell = flashMat(color, { roughness: shards ? 0.25 : 0.9 });
  const heart = new THREE.MeshBasicMaterial({ color: new THREE.Color(core).multiplyScalar(1.35) });
  const aura = new THREE.MeshBasicMaterial({ color: core, transparent: true, opacity: 0.28, depthWrite: false, blending: THREE.AdditiveBlending });
  const body = grp(S, 0, 1.15, 0);
  const flame = geo('flameLathe', () => new THREE.LatheGeometry([[0, -0.55], [0.22, -0.45], [0.38, -0.2], [0.42, 0.05], [0.36, 0.3], [0.22, 0.52], [0.08, 0.78], [0, 0.92]].map(([r, y]) => new THREE.Vector2(r, y)), 24));
  const c = add(body, flame, heart);
  c.castShadow = false;
  const halo = add(body, flame, aura, 0, 0.02, 0, 1.3, 1.25, 1.3);
  halo.castShadow = false;
  // the face: two dark eyes and angry brows
  add(body, merged('elEyes', () => [-1, 1].map((s) => placed(ball(), s * 0.13, 0.14, -0.37, 0.065, 0.1, 0.04, 0, s * 0.3))), mat('#1a0e08', { roughness: 0.3 }));
  add(body, merged('elBrows', () => [-1, 1].map((s) => placed(new THREE.CapsuleGeometry(0.025, 0.12, 4, 8), s * 0.13, 0.27, -0.36, 1, 1, 1, 0, s * 0.3, Math.PI / 2 + s * 0.45))), mat('#1a0e08', { roughness: 0.3 }));
  const chunk = (seed) => (shards ? geo('octa', () => new THREE.OctahedronGeometry(1, 0)) : blob(seed, 0.35));
  for (const s of [-1, 1]) add(body, chunk(51 + s), shell, s * 0.42, 0.28, 0.04, 0.24, shards ? 0.32 : 0.22, 0.24, 0.2, 0, s * -0.3);
  add(body, chunk(53), shell, 0, -0.3, 0.18, 0.36, 0.2, 0.28);
  add(body, merged('elCrown', () => [[-0.16, -0.25], [0, 0], [0.16, 0.25], [-0.07, -0.1], [0.07, 0.1]].map(([x, rz], k) => placed(new THREE.ConeGeometry(0.07, k < 3 ? 0.42 : 0.3, 10), x, 0.92 + (k < 3 ? 0.06 : 0), 0.08, 1, 1, 1, 0.2, 0, rz))), heart).castShadow = false;
  const hands = [-1, 1].map((s) => add(body, chunk(55 + s), shell, s * 0.72, -0.05, -0.1, 0.2, shards ? 0.26 : 0.2, 0.2));
  const tail = [0, 1, 2].map((k) => add(body, chunk(60 + k), shell, 0, -0.62 - k * 0.24, 0.12 + k * 0.08, 0.26 - k * 0.07));
  const embers = [0, 1, 2, 3].map(() => { const e = add(body, geo('ember', () => new THREE.OctahedronGeometry(0.06, 0)), heart); e.castShadow = false; return e; });
  return rig(root, body, [], [shell], {
    radius: 0.6 * size, height: 1.6 * size, dip: 1.2,
    extra: {
      onAnimate(phase, windup) {
        body.position.y = 1.15 + Math.sin(phase * 0.7) * 0.08 - windup * 0.2;
        hands.forEach((h, i) => { const s = i ? 1 : -1; h.position.set(s * (0.72 - windup * 0.25), -0.05 + Math.sin(phase * 0.9 + i * 2) * 0.08 + windup * 0.35, -0.1 - windup * 0.45); h.rotation.y = phase * 0.4 * s; });
        tail.forEach((t, k) => { t.position.x = Math.sin(phase * 0.8 + k) * 0.08 * (k + 1); });
        embers.forEach((e, k) => { const a = phase * 0.6 + (k / 4) * Math.PI * 2, r = 0.62 + windup * 0.3; e.position.set(Math.cos(a) * r, Math.sin(a * 2 + k) * 0.35, Math.sin(a) * r); e.rotation.y = phase; });
        const pulse = 1 + Math.sin(phase * 1.5) * 0.04 + windup * 0.25;
        c.scale.setScalar(pulse); halo.scale.set(1.3 * pulse, 1.25 * pulse, 1.3 * pulse);
      },
    },
  });
}

// a carnivorous plant that does not walk: a bulb in a rosette of curled leaves, a thorny
// neck and a snapping head (green outside, pink inside, a ring of white teeth), roots in the soil
function plant({ size = 1, color = '#4f8a2e', mouth = '#d8486a' }) {
  const root = new THREE.Group();
  const S = grp(root); S.scale.setScalar(size);
  const green = flashMat(color, { roughness: 0.6 });
  const darkGreen = flashMat(tint(color, '#0a1a08', 0.35), { roughness: 0.7 });
  const pink = flashMat(mouth, { roughness: 0.4 });
  const spot = mat(tint(color, '#fff6b0', 0.55), { roughness: 0.5 });
  const teeth = mat('#f6f0de', { roughness: 0.3 });
  const body = grp(S, 0, 0.2, 0);
  add(body, geo('bulb', () => new THREE.LatheGeometry([[0, 0], [0.7, 0.05], [0.95, 0.35], [0.85, 0.7], [0.5, 1.0], [0.32, 1.15]].map(([r, y]) => new THREE.Vector2(r, y)), 24)), darkGreen);
  // leaves: long, pointed, curling down at the tip
  const leafGeo = geo('leaf', () => {
    const g = new THREE.PlaneGeometry(1, 1, 10, 4);
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const u = p.getX(i) + 0.5, w = p.getY(i);
      const half = Math.pow(Math.sin(Math.PI * Math.min(u * 1.05, 1)), 0.7) * 0.32;
      p.setXYZ(i, u * 2.4, 0.7 * u - 1.0 * u * u + Math.abs(w) * 0.25, w * 2 * half);
    }
    g.computeVertexNormals();
    return g;
  });
  noLine(add(body, merged('rosette', () => [0, 1, 2, 3, 4, 5, 6].map((k) => placed(leafGeo, Math.cos(k * 0.9) * 0.6, 0.15, Math.sin(k * 0.9) * 0.6, 0.9 + (k % 3) * 0.15, 1, 1, 0, -k * 0.9, 0))), mat(tint(color, '#9ad04a', 0.25), { side: THREE.DoubleSide, roughness: 0.6, emissive: '#ffffff', emissiveIntensity: 0 })));
  noLine(add(body, merged('roots', () => [0, 1, 2, 3].map((k) => { const a = k * 1.6 + 0.4; return taper([[Math.cos(a) * 0.6, 0.1, Math.sin(a) * 0.6], [Math.cos(a) * 1.4, 0.05, Math.sin(a) * 1.4], [Math.cos(a + 0.3) * 2.1, -0.1, Math.sin(a + 0.3) * 2.1]], 0.16, 0.03, 7, 10); })), darkGreen));
  const neck = grp(body, 0, 1.0, 0);
  const neckPts = [[0, 0, 0], [0.25, 0.9, 0.15], [-0.15, 1.8, 0.05], [0, 2.4, -0.25]];
  add(neck, geo('neck', () => taper(neckPts, 0.34, 0.2, 12, 20)), green);
  add(neck, merged('thorns', () => [0.3, 0.6, 0.95, 1.3, 1.65, 2.0].map((y, k) => placed(new THREE.ConeGeometry(0.06, 0.28, 8), (k % 2 ? 1 : -1) * 0.25 + (k < 3 ? 0.1 : -0.05), y, 0.05, 1, 1, 1, 0, 0, (k % 2 ? -1 : 1) * 1.2))), spot);
  const head = grp(neck, 0, 2.55, -0.35);
  head.rotation.x = 0.25;
  const jaw = (up) => {
    const p = grp(head, 0, 0, 0.85);
    const j = grp(p, 0, 0, -0.85);
    j.rotation.x = up ? 0 : Math.PI;
    add(j, dome(), green, 0, 0, 0, 1.05, 0.62, 1.05);
    noLine(add(j, geo('lip', () => new THREE.CircleGeometry(1, 28)), pink, 0, 0.01, 0, 1.0, 1.0, 1.0, Math.PI / 2));   // pink inside
    add(j, merged('teeth', () => Array.from({ length: 16 }, (_, k) => { const a = (k / 16) * Math.PI * 2; return placed(new THREE.ConeGeometry(0.07, 0.3, 8), Math.cos(a) * 0.95, -0.1, Math.sin(a) * 0.95, 1, 1, 1, Math.PI, 0, 0); })), teeth);
    if (up) add(j, merged('pSpots', () => [[0.3, 0.45, -0.4], [-0.4, 0.4, -0.2], [0.05, 0.58, 0.1], [0.5, 0.3, 0.35], [-0.35, 0.35, 0.45]].map(([x, y, z]) => placed(ball(), x, y, z, 0.13, 0.05, 0.13, x * 0.8, 0, -z * 0.8))), spot);
    return p;
  };
  const upper = jaw(true), lower = jaw(false);
  add(head, ball(), pink, 0, 0, 0, 0.9, 0.12, 0.9);                                 // the throat
  return rig(root, body, [], [green, darkGreen, pink], {
    radius: 1.6 * size, height: 4.5 * size, dip: 2,
    extra: {
      onAnimate(phase, windup) {
        const open = 0.35 + windup * 0.5 + Math.abs(Math.sin(phase * 0.8)) * 0.15;
        upper.rotation.x = open; lower.rotation.x = -open * 0.6;
        neck.rotation.z = Math.sin(phase * 0.5) * 0.08;
        neck.rotation.x = -windup * 0.25 + Math.sin(phase * 0.4) * 0.05;
        head.rotation.x = 0.25 + windup * 0.4;
      },
    },
  });
}

// add horns or tusks, wings and a row of back spines to a quadruped (beast king, dragons,
// the boar); the wings flap and fold as the creature moves
function decorate(model, { horns = null, wings = null, spines = null, size = 1 }) {
  const body = model.body ?? model.root.children[0];
  const head = model.head ?? body;
  if (horns) {
    const g = grp(head); g.scale.setScalar(size);
    const hm = mat(horns, { roughness: 0.4 });
    if (size < 1.5) add(g, merged('tusks', () => [-1, 1].map((s) => taper([[s * 0.06, -0.1, -0.24], [s * 0.12, -0.08, -0.3], [s * 0.17, 0.0, -0.34], [s * 0.15, 0.08, -0.3]], 0.035, 0.008, 7, 10))), hm);
    else {
      add(g, merged('horns', () => [-1, 1].map((s) => taper([[s * 0.08, 0.12, 0.0], [s * 0.2, 0.22, 0.05], [s * 0.3, 0.3, 0.2], [s * 0.28, 0.42, 0.36], [s * 0.2, 0.46, 0.4]], 0.06, 0.008, 8, 16))), hm);
      add(g, merged('hornRings', () => [-1, 1].flatMap((s) => [0, 1].map((k) => placed(new THREE.TorusGeometry(0.055 - k * 0.012, 0.014, 6, 14), s * (0.15 + k * 0.08), 0.18 + k * 0.08, 0.03 + k * 0.08, 1, 1, 1, Math.PI / 2 - 0.4, 0, s * 0.9)))), mat(tint(horns, '#3a2a1a', 0.4)));
    }
  }
  if (spines) {
    const g = grp(body); g.scale.setScalar(size);
    add(g, merged('spines', () => [0, 1, 2, 3, 4, 5].map((k) => placed(new THREE.ConeGeometry(0.06, 0.26 - Math.abs(k - 2) * 0.03, 8), 0, 0.32 - k * 0.012, -0.22 + k * 0.14, 1, 1, 1, 0.45))), mat(spines, { roughness: 0.3, emissive: spines, emissiveIntensity: 0.25 }));
  }
  const flaps = [];
  if (wings) {
    const membrane = mat(wings, { side: THREE.DoubleSide, roughness: 0.6 });
    const bone = mat(tint(wings, '#2a2018', 0.5), { roughness: 0.5 });
    const wingGeo = geo('wing', () => {
      const s = new THREE.Shape();
      s.moveTo(0, 0); s.quadraticCurveTo(0.5, 0.25, 0.75, 0.15); s.lineTo(1.4, 0.05);
      s.quadraticCurveTo(1.15, -0.2, 1.05, -0.45); s.quadraticCurveTo(0.9, -0.3, 0.75, -0.55);
      s.quadraticCurveTo(0.6, -0.35, 0.42, -0.6); s.quadraticCurveTo(0.3, -0.35, 0.05, -0.45); s.lineTo(0, 0);
      return new THREE.ShapeGeometry(s, 10).rotateX(-Math.PI / 2);
    });
    const boneGeo = merged('wingBones', () => [taper([[0, 0, 0], [0.4, 0.04, -0.2], [0.75, 0, -0.15], [1.4, 0, -0.05]], 0.035, 0.01, 6, 12),
      taper([[0.75, 0, -0.15], [1.05, 0, 0.45]], 0.022, 0.008, 5, 4), taper([[0.75, 0, -0.15], [0.75, 0, 0.55]], 0.022, 0.008, 5, 4), taper([[0.75, 0, -0.15], [0.42, 0, 0.6]], 0.022, 0.008, 5, 4)]);
    for (const s of [-1, 1]) {
      const p = grp(body, s * 0.18 * size, 0.28 * size, -0.12 * size);
      p.scale.set(s * size, size, size);
      const w = add(p, wingGeo, membrane);
      w.userData.hasOutline = true;                         // a flat sheet: no outline hull
      add(p, boneGeo, bone);
      p.userData.side = s;
      flaps.push(p);
    }
  }
  if (flaps.length) {
    const animate = model.animate;
    let t = 0;
    model.animate = (dt, speed, windup = 0) => {
      animate(dt, speed, windup);
      t += dt * (2 + speed * 0.6);
      flaps.forEach((p) => { p.rotation.z = p.userData.side * (0.6 + Math.sin(t) * 0.4 - windup * 0.7); p.rotation.y = p.userData.side * -0.25; });
    };
  }
  return model;
}

// in-game body for each bestiary model name
const BODIES = {
  besouro: () => arthropod({ color: '#2a3a2a', shell: '#3f6a5a', mandibles: true }),
  aranha: () => arthropod({ color: '#2a2420', shell: '#3a4a2a', legs: 8, mandibles: true, size: 0.8 }),
  lobo: () => quadruped({ color: '#6b6258', belly: '#a89c8a' }),
  escorpiao: () => arthropod({ color: '#7a4a22', shell: '#a8642a', legs: 8, pincers: true, stinger: true, size: 0.9 }),
  lagarto: () => quadruped({ color: '#a8642a', belly: '#e0b070', size: 0.9, tail: true }),
  salamandra: () => quadruped({ color: '#a8301a', belly: '#ff9a3c', size: 0.9 }),
  besouroObsidiana: () => arthropod({ color: '#151218', shell: '#2a2238', mandibles: true, size: 1.2 }),
  elemental: () => elemental({ color: '#4a4440', core: '#ff7a2a' }),
  loboBranco: () => quadruped({ color: '#e8eef5', belly: '#ffffff', size: 1.2 }),
  golem: () => golem({ color: '#b9d6ea', accent: '#e8f4ff', size: 1.1 }),
  felino: () => quadruped({ color: '#4f6a2a', belly: '#c9b870', size: 1.2 }),
  besouroColossal: () => arthropod({ color: '#2a3a1a', shell: '#5a7a2a', mandibles: true, size: 1.9 }),
  serpente: () => arthropod({ color: '#3f7a3a', shell: '#6aa04a', legs: 0, long: 2, size: 0.7 }),
  sanguessuga: () => arthropod({ color: '#3a4a22', shell: '#5a6a2a', legs: 0, long: 1.6, size: 0.8, worm: 'leech' }),
  sapo: () => quadruped({ color: '#5a6a2a', belly: '#c9c08a', size: 0.9, snout: false, tail: false }),
  cristalino: () => arthropod({ color: '#5a4a7a', shell: '#c59bff', legs: 8, mandibles: true, size: 0.9 }),
};

// creatures that share a body in the bestiary but should not look alike
const OWN = {
  carnical: () => golem({ color: '#5a4a3a', accent: '#a8c060', glow: '#c8ff6a', size: 1 }),
  guardiaoFloral: () => golem({ color: '#6a8a4a', accent: '#ff9ad0', size: 1 }),
  lagartoMineral: () => quadruped({ color: '#6a6878', belly: '#c59bff', size: 0.9 }),
  serpentePlanadora: () => arthropod({ color: '#2f6a5a', shell: '#ffd23f', legs: 0, long: 2, size: 0.7 }),
};
const mob = (region, entry) => {
  const g = gameStats(entry, 'mob');
  return { name: entry.nome, region, hp: g.hp, damage: g.damage, speed: g.speed, armor: g.armor, xp: g.xp, range: 1.6, build: OWN[entry.id] ?? BODIES[entry.model] };
};
const bossOf = (region, entry, kind, build, range = 3.4) => {
  const g = gameStats(entry, kind);
  return { name: entry.nome, boss: true, region, hp: g.hp, damage: g.damage, speed: g.speed, armor: g.armor, xp: g.xp, range, build };
};

export const CREATURES = {};
for (const r of REGIONS) for (const e of r.mobs) if (e.model) CREATURES[e.id] = mob(r.id, e);
const R = Object.fromEntries(REGIONS.map((r) => [r.id, r]));
Object.assign(CREATURES, {
  // the manual's sub-bosses and bosses of regions 1-3 and 7-10
  escavadorAmbar: bossOf('raizes', R.raizes.subBoss, 'subBoss', () => decorate(quadruped({ color: '#8a6a3a', belly: '#ffb347', size: 2.2, tail: true }), { spines: '#ffb347', size: 2.2 })),
  rainhaRaizes: bossOf('raizes', R.raizes.boss, 'boss', () => arthropod({ color: '#3a2a1a', shell: '#ffb347', legs: 6, mandibles: true, size: 3, long: 1.6 }), 4),
  escorpiaoReiSol: bossOf('deserto', R.deserto.subBoss, 'subBoss', () => arthropod({ color: '#7a3a12', shell: '#ffcf4a', legs: 8, pincers: true, stinger: true, size: 2.6 })),
  colossoCasca: bossOf('deserto', R.deserto.boss, 'boss', () => golem({ color: '#8a5a2a', accent: '#e0a060', glow: '#ffcf4a', size: 2.8 }), 4.2),
  guardiaoMares: bossOf('oceano', R.oceano.subBoss, 'subBoss', () => decorate(quadruped({ color: '#3a6a5a', belly: '#9ad0c0', size: 3, snout: false }), { spines: '#7fe3ff', size: 3 })),
  leviata: bossOf('oceano', R.oceano.boss, 'boss', () => arthropod({ color: '#1f3a5a', shell: '#2a8a9a', legs: 0, long: 3, size: 2.4, worm: 'eel' }), 4.2),
  pastorFungos: bossOf('pantano', R.pantano.subBoss, 'subBoss', () => golem({ color: '#5a6a3a', accent: '#a8ff5a', glow: '#a8ff5a', size: 2.2 })),
  maeDecomposicao: bossOf('pantano', R.pantano.boss, 'boss', () => elemental({ color: '#4a5a2a', core: '#a8ff5a', size: 3.4 }), 4.2),
  cavaleiroAmetista: bossOf('cristais', R.cristais.subBoss, 'subBoss', () => golem({ color: '#5a4a7a', accent: '#c59bff', glow: '#c59bff', size: 2.4 })),
  arquiteto: bossOf('cristais', R.cristais.boss, 'boss', () => elemental({ color: '#8a7ab0', core: '#e6d6ff', size: 3.6, shards: true }), 4.2),
  guardiaVentos: bossOf('suspensa', R.suspensa.subBoss, 'subBoss', () => decorate(quadruped({ color: '#e8f0d0', belly: '#ffffff', size: 2.2 }), { wings: '#d0e8c0', spines: '#ffffff', size: 2.2 })),
  dragaoSeteGalhos: bossOf('suspensa', R.suspensa.boss, 'boss', () => decorate(quadruped({ color: '#4a7a3a', belly: '#9ac07a', size: 3.8, tail: true }), { horns: '#e8e0c0', wings: '#7fe08a', spines: '#e8e0c0', size: 3.8 }), 4.4),
  sacerdotisa: bossOf('copa', R.copa.subBoss, 'subBoss', () => plant({ size: 1.3, color: '#5a9a3a', mouth: '#ff6fa8' }), 4.6),
  devoradorSeiva: bossOf('copa', R.copa.boss, 'boss', () => arthropod({ color: '#3a1a2a', shell: '#ffb347', legs: 8, mandibles: true, size: 4, long: 1.8 }), 4.6),
  // Act II: the manual's sub-bosses and bosses of regions 4-6
  ferreiro: bossOf('fornalha', R.fornalha.subBoss, 'subBoss', () => golem({ color: '#3a3330', accent: '#ff7a2a', glow: '#ff5a10', size: 2.4 })),
  ignar: bossOf('fornalha', R.fornalha.boss, 'boss', () => elemental({ color: '#7a2a10', core: '#ffcf4a', size: 3.4 }), 4.2),
  matriarca: bossOf('niveria', R.niveria.subBoss, 'subBoss', () => decorate(quadruped({ color: '#f4f8ff', belly: '#ffffff', size: 2.6 }), { spines: '#9fd2ff', size: 2.6 })),
  reiInverno: bossOf('niveria', R.niveria.boss, 'boss', () => decorate(quadruped({ color: '#9fd2ff', belly: '#e8f4ff', size: 3.6 }), { horns: '#e8f4ff', wings: '#b9e3ff', spines: '#e8f4ff', size: 3.6 }), 4.2),
  devoradorTroncos: bossOf('selva', R.selva.subBoss, 'subBoss', () => plant({ size: 1.4, color: '#3f6a2a', mouth: '#c0303a' }), 5),
  reiFeras: bossOf('selva', R.selva.boss, 'boss', () => decorate(quadruped({ color: '#7a5a3a', belly: '#c9a87a', size: 4 }), { horns: '#efe6d0', spines: '#3a2a1a', size: 4 }), 4.4),
});

// the clearing outside the tree (levels 1-5): weak creatures for the first steps
Object.assign(CREATURES, {
  besouroMusgo: { name: 'Besouro-de-Musgo', region: 'fora', hp: 24, damage: 3, speed: 3.2, armor: 1, xp: 8, range: 1.5, build: () => arthropod({ color: '#2a3a22', shell: '#5a7a3a', mandibles: true, size: 0.7 }) },
  loboJovem: { name: 'Lobo Jovem', region: 'fora', hp: 34, damage: 4, speed: 4.6, armor: 1, xp: 12, range: 1.6, build: () => quadruped({ color: '#7a6a58', belly: '#b8a88a', size: 0.8 }) },
  javaliCasca: { name: 'Javali de Casca', region: 'fora', hp: 52, damage: 6, speed: 4.2, armor: 0.9, xp: 18, range: 1.8, build: () => decorate(quadruped({ color: '#5a3a22', belly: '#8a6a4a', size: 1, snout: true }), { horns: '#efe6d0', size: 1 }) },
});

// which creatures live on each level, from the manual (flyers and swimmers not in the game yet)
const COUNTS = { raizes: 3, deserto: 3, fornalha: 3, niveria: 3, selva: 3, pantano: 2, cristais: 3, suspensa: 4, copa: 2 };
export const FAUNA = Object.fromEntries(REGIONS.map((r) => [r.id, r.mobs.filter((e) => e.model).map((e) => [e.id, COUNTS[r.id] ?? 0])]));
FAUNA.oceano = [];
FAUNA.fora = [['besouroMusgo', 6], ['loboJovem', 5], ['javaliCasca', 4]];

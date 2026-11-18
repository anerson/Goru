// Building blocks shared by every ecosystem: a terrain disk, trails across it, the slab
// ceiling above it (roots, glowing moss) and the level's own sun.
import * as THREE from 'three';
import { fbm } from '../noise.js';
import { DISK_R, SLAB, junctionAngle, levelBridges } from '../tree/layout.js';
import { V, polar, ribbon, smoothPath, instances } from '../geom.js';

const smoothstep = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

// Polar-grid terrain disk at `level`. height(x, z) is relative to the level and is faded to
// 0 between flatFrom and radius, so every level meets the ramp and its bridges flush.
export function makeTerrain({ level, radius = DISK_R, flatFrom = DISK_R - 6, height, color, material, name }) {
  const rings = 60, segs = 200;
  const pos = [], cols = [], uv = [], idx = [];
  const c = new THREE.Color();
  const h = (x, z) => {
    const r = Math.hypot(x, z);
    return height(x, z) * (1 - smoothstep(flatFrom, radius, r));
  };
  pos.push(0, level + h(0, 0), 0); color(0, 0, h(0, 0), c); cols.push(c.r, c.g, c.b); uv.push(0, 0);
  for (let i = 1; i <= rings; i++) {
    const r = radius * Math.pow(i / rings, 0.9);
    for (let j = 0; j < segs; j++) {
      const a = (j / segs) * Math.PI * 2, x = Math.cos(a) * r, z = Math.sin(a) * r, y = h(x, z);
      pos.push(x, level + y, z);
      color(x, z, y, c); cols.push(c.r, c.g, c.b);
      uv.push(x / 5, z / 5);
    }
  }
  for (let j = 0; j < segs; j++) idx.push(0, 1 + ((j + 1) % segs), 1 + j);
  for (let i = 1; i < rings; i++) {
    for (let j = 0; j < segs; j++) {
      const a = 1 + (i - 1) * segs + j, b = 1 + (i - 1) * segs + ((j + 1) % segs);
      const a2 = a + segs, b2 = b + segs;
      idx.push(a, b, a2, b, b2, a2);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  const mesh = new THREE.Mesh(g, material);
  mesh.name = name;
  mesh.castShadow = mesh.receiveShadow = true;
  return { mesh, h: (x, z) => level + h(x, z) };
}

export const noise2 = (x, z, f, seed = 0, oct = 4) => fbm(x * f + seed, seed * 0.37, z * f - seed, oct);

// Where trails start: the ramp junction and the three level bridges, just inside the edge.
export function entryAngles(level, extra = []) {
  return [junctionAngle(level), ...(level > 0 ? levelBridges(level) : []), ...extra];
}

// Trails: one spoke from each entry to a central plaza, plus a loop. Returns the sampled
// lines (for keeping props off them) and the meshes.
export function makeTrails({ rand, h, entries, entryR = DISK_R - 3, loopR = 40, width = 3, material, lift = 0.08, surface, withPlaza = true }) {
  const lines = [];
  for (const a of entries) {
    const w1 = (rand() - 0.5) * 0.5, w2 = (rand() - 0.5) * 0.8;
    lines.push(smoothPath([
      [Math.cos(a) * entryR, Math.sin(a) * entryR],
      [Math.cos(a + w1) * entryR * 0.62, Math.sin(a + w1) * entryR * 0.62],
      [Math.cos(a + w2) * 13, Math.sin(a + w2) * 13],
    ]));
  }
  const loop = smoothPath(Array.from({ length: 10 }, (_, i) => {
    const a = (i / 10) * Math.PI * 2, r = loopR + (rand() - 0.5) * 8;
    return [Math.cos(a) * r, Math.sin(a) * r];
  }), 1.5, true);
  const plaza = smoothPath(Array.from({ length: 8 }, (_, i) => [Math.cos((i / 8) * Math.PI * 2) * 12, Math.sin((i / 8) * Math.PI * 2) * 12]), 1.2, true);
  const meshes = [];
  let length = 0;
  const lay = (pts, closed) => {
    for (const p of pts) p.y = (surface ? surface(p.x, p.z) : h(p.x, p.z)) + lift;
    const g = ribbon(pts, width, closed);
    length += g.userData.length;
    const m = new THREE.Mesh(g, material);
    m.receiveShadow = true;
    meshes.push(m);
  };
  lines.forEach((l) => lay(l, false));
  lay(loop, true);
  if (withPlaza) lay(plaza, true);
  const all = lines.concat([loop, plaza]).flat();
  const near = (x, z, d) => all.some((p) => Math.abs(p.x - x) < d && Math.abs(p.z - z) < d && Math.hypot(p.x - x, p.z - z) < d);
  return { meshes, near, length, lines: lines.concat([loop, plaza]) };
}

// Random points in an annulus that pass `ok`.
export function scatter(rand, n, rMin, rMax, ok, tries = 20) {
  const out = [];
  for (let k = 0; k < n * tries && out.length < n; k++) {
    const a = rand() * Math.PI * 2, r = Math.sqrt(rMin * rMin + rand() * (rMax * rMax - rMin * rMin));
    const x = Math.cos(a) * r, z = Math.sin(a) * r;
    if (ok(x, z)) out.push([x, z]);
  }
  return out;
}

// The slab that is the floor of level `top`, seen from below as the sky of the level under
// it: bark sides, a dark underside, hanging roots, glowing moss, and the lower level's sun.
export function ceiling(scene, { rand, top, below, mats }) {
  const group = new THREE.Group();
  group.name = `ceiling-${top}`;
  const under = top - SLAB;
  const side = new THREE.Mesh(new THREE.CylinderGeometry(DISK_R, DISK_R - 4, SLAB, 128, 1, true), mats.barkStatic);
  side.position.y = top - SLAB / 2;
  const bottom = new THREE.Mesh(new THREE.CircleGeometry(DISK_R - 4, 96), mats.slabUnder);
  bottom.rotation.x = Math.PI / 2;
  bottom.position.y = under;
  side.castShadow = bottom.castShadow = true;
  group.add(side, bottom);

  const roots = [];
  for (let i = 0; i < 170; i++) {
    const a = rand() * Math.PI * 2, r = Math.sqrt(rand()) * (DISK_R - 7);
    const len = 2 + Math.pow(rand(), 2) * 10, rad = 0.3 + rand() * 1.1;
    roots.push({ p: polar(r, a, under + 0.2), s: V(rad, len, rad), rot: [(rand() - 0.5) * 0.25, 0, (rand() - 0.5) * 0.25] });
  }
  const rootGeo = new THREE.ConeGeometry(1, 1, 7).rotateX(Math.PI).translate(0, -0.5, 0);
  group.add(instances(rootGeo, mats.barkStatic, roots));

  const moss = [];
  const glow = new THREE.Color(below.color);
  for (let i = 0; i < 420; i++) {
    const a = rand() * Math.PI * 2, r = Math.sqrt(rand()) * (DISK_R - 6);
    moss.push({ p: polar(r, a, under - 0.15), s: 0.25 + rand() * 0.7, color: glow.clone().multiplyScalar(0.8 + rand() * 1.4) });
  }
  group.add(instances(new THREE.SphereGeometry(1, 8, 6), new THREE.MeshBasicMaterial({ color: '#ffffff' }), moss, { shadow: false }));

  // the lower level's sun: a cluster of glowing crystals with a point light under it
  const sunColor = new THREE.Color(below.light);
  const crystals = [];
  for (let i = 0; i < 14; i++) {
    const a = rand() * Math.PI * 2, r = rand() * 6;
    crystals.push({ p: polar(r, a, under - 1.5 - rand() * 2.5), s: V(0.9 + rand() * 1.2, 2 + rand() * 3.5, 0.9 + rand() * 1.2), rot: [(rand() - 0.5) * 0.6, rand() * 3, (rand() - 0.5) * 0.6], color: sunColor.clone().multiplyScalar(2.2 + rand()) });
  }
  group.add(instances(new THREE.OctahedronGeometry(1, 0), new THREE.MeshBasicMaterial({ color: '#ffffff' }), crystals, { shadow: false }));
  const light = new THREE.PointLight(sunColor, 3600, 0, 2);
  light.position.set(0, under - 5, 0);
  group.add(light);
  scene.add(group);
}

export const lerpColor = (c, a, b, t) => c.set(a).lerp(new THREE.Color(b), Math.min(1, Math.max(0, t)));
export const std = (o) => new THREE.MeshStandardMaterial({ roughness: 0.9, ...o });

export function fernGeometry() {
  const pos = [];
  for (let k = 0; k < 7; k++) {
    const a = (k / 7) * Math.PI * 2, c = Math.cos(a), s = Math.sin(a);
    const tip = [c * 1.1, 0.55, s * 1.1], mid = [c * 0.55, 0.55, s * 0.55];
    const w = 0.18, nx = -s * w, nz = c * w;
    pos.push(0, 0.05, 0, mid[0] + nx, mid[1], mid[2] + nz, ...tip);
    pos.push(0, 0.05, 0, ...tip, mid[0] - nx, mid[1], mid[2] - nz);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.computeVertexNormals();
  return g;
}

// Floating particles in a cylinder: fireflies, mist, dust or (with `fall`) snow.
export function drift(scene, rand, { count, rMax, y0, y1, color, size, speed, fall = 0, opacity = 0.85 }) {
  const geo = new THREE.BufferGeometry();
  const arr = new Float32Array(count * 3), base = [];
  for (let i = 0; i < count; i++) {
    const a = rand() * Math.PI * 2, r = Math.sqrt(rand()) * rMax;
    base.push([Math.cos(a) * r, y0 + rand() * (y1 - y0), Math.sin(a) * r, rand() * 10]);
  }
  geo.setAttribute('position', new THREE.BufferAttribute(arr, 3));
  const mat = new THREE.PointsMaterial({ color, size, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false });
  const pts = new THREE.Points(geo, mat);
  pts.frustumCulled = false;
  scene.add(pts);
  const span = y1 - y0;
  return (dt, t, pulse) => {
    for (let i = 0; i < count; i++) {
      const b = base[i];
      let y = b[1];
      if (fall) { y = y0 + ((((b[1] - y0) - t * fall * (0.7 + (b[3] % 1) * 0.6)) % span) + span) % span; }
      arr[i * 3] = b[0] + Math.sin(t * 0.3 * (speed + 0.2) + b[3]) * (1 + speed * 2);
      arr[i * 3 + 1] = y + (fall ? 0 : Math.sin(t * 0.25 + b[3] * 2) * 1.2);
      arr[i * 3 + 2] = b[2] + Math.cos(t * 0.27 * (speed + 0.2) + b[3]) * (1 + speed * 2);
    }
    geo.attributes.position.needsUpdate = true;
    mat.opacity = opacity * pulse;
  };
}

// ---------------------------------------------------------------------------
// Organic shapes shared by the ecosystems (all built once, then instanced). Unit sized:
// height 1 unless said otherwise, base at y = 0.
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const mergeAll = (parts) => { const g = mergeGeometries(parts); parts.forEach((p) => p.dispose()); return g; };
// hard edges without the flatShading flag: split the vertices, recompute the normals
export function facet(g) { const n = g.index ? g.toNonIndexed() : g; n.computeVertexNormals(); return n; }

// a smooth tube through points narrowing from r0 to r1
export function taperTube(points, r0, r1, radial = 8, seg = 12, ring = null) {
  const curve = new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p)));
  const g = new THREE.TubeGeometry(curve, seg, 1, radial, false);
  const p = g.attributes.position, v = new THREE.Vector3(), c = new THREE.Vector3();
  for (let i = 0; i <= seg; i++) {
    curve.getPointAt(i / seg, c);
    const r = (r0 + (r1 - r0) * (i / seg)) * (ring ? ring(i / seg) : 1);
    for (let j = 0; j <= radial; j++) { const k = i * (radial + 1) + j; v.fromBufferAttribute(p, k).sub(c).multiplyScalar(r).add(c); p.setXYZ(k, v.x, v.y, v.z); }
  }
  g.computeVertexNormals();
  return g;
}

// a tree trunk: flared base with buttress roots, a gentle bend, narrowing to the top
export function trunkGeometry(seed = 0, roots = 5) {
  const prof = [[0.0, 1.35], [0.04, 1.12], [0.1, 0.95], [0.25, 0.82], [0.5, 0.72], [0.75, 0.62], [1.0, 0.52]];
  const g = new THREE.LatheGeometry(prof.map(([y, r]) => new THREE.Vector2(r * 0.5, y)), 14, 0, Math.PI * 2);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {                         // a slight S-bend and knobbly bark
    const y = p.getY(i), x = p.getX(i), z = p.getZ(i), a = Math.atan2(z, x);
    const k = 1 + Math.sin(a * 3 + seed + y * 6) * 0.05;
    p.setXYZ(i, x * k + Math.sin(y * 3 + seed) * 0.08 * y, y, z * k + Math.cos(y * 2.4 + seed) * 0.05 * y);
  }
  g.computeVertexNormals();
  const parts = [g];
  for (let k = 0; k < roots; k++) {
    const a = (k / roots) * Math.PI * 2 + seed, c = Math.cos(a), s = Math.sin(a);
    parts.push(taperTube([[c * 0.3, 0.16, s * 0.3], [c * 0.6, 0.05, s * 0.6], [c * 0.95, -0.01, s * 0.95]], 0.17, 0.03, 6, 6));
  }
  return mergeAll(parts);
}

// a mushroom cap: domed top with a curled rim and a pale gill underside (one piece)
export function capGeometry() {
  const pts = [[0, 1.0], [0.35, 0.96], [0.68, 0.8], [0.92, 0.5], [1.02, 0.18], [0.98, 0.02], [0.85, -0.02], [0.5, 0.06], [0.15, 0.1], [0, 0.1]];
  return new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r, y)), 22);
}
// spots that sit on that cap (same transform as the cap's instance)
export function capSpotsGeometry() {
  const parts = [];
  const spots = [[0, 1.0, 0, 0.16], [0.55, 0.84, 0.1, 0.13], [-0.3, 0.86, 0.48, 0.12], [-0.42, 0.82, -0.45, 0.14], [0.25, 0.8, -0.62, 0.1], [0.82, 0.48, -0.32, 0.1], [-0.8, 0.5, 0.2, 0.11]];
  for (const [x, y, z, r] of spots) {
    const n = new THREE.Vector3(x, y * 1.6, z).normalize();
    const s = new THREE.SphereGeometry(r, 10, 6);
    s.scale(1, 0.35, 1);
    s.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), n));
    s.translate(x, y + 0.01, z);
    parts.push(s);
  }
  return mergeAll(parts);
}
// a mushroom stem: a little bulb at the foot, slimmer in the middle
export function stemGeometry() {
  const pts = [[0, 0], [0.75, 0.0], [0.9, 0.08], [0.72, 0.25], [0.6, 0.6], [0.66, 0.92], [0.5, 1.0], [0, 1.0]];
  return new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r, y)), 12);
}

// a saguaro cactus: rounded trunk and two arms that bend upward
export function cactusGeometry() {
  const parts = [new THREE.CapsuleGeometry(0.11, 0.8, 6, 12).translate(0, 0.5, 0)];
  parts.push(taperTube([[0.05, 0.4, 0], [0.28, 0.42, 0], [0.32, 0.55, 0], [0.32, 0.75, 0]], 0.075, 0.07, 10, 10));
  parts.push(new THREE.SphereGeometry(0.07, 10, 8).translate(0.32, 0.75, 0));
  parts.push(taperTube([[-0.05, 0.55, 0], [-0.24, 0.57, 0], [-0.27, 0.68, 0], [-0.27, 0.82, 0]], 0.065, 0.06, 10, 10));
  parts.push(new THREE.SphereGeometry(0.06, 10, 8).translate(-0.27, 0.82, 0));
  return mergeAll(parts);
}

// a canyon mesa: a tapering column with eroded strata (vertex colours give light and dark bands)
export function mesaGeometry(seed = 0) {
  const g = new THREE.CylinderGeometry(1, 1, 1, 20, 10).translate(0, 0.5, 0);
  const p = g.attributes.position, col = [], c = new THREE.Color();
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i), a = Math.atan2(z, x), r = Math.hypot(x, z);
    const band = Math.floor(y * 5);
    const k = r < 1e-3 ? 0 : (1.08 - y * 0.25) * (1 + Math.sin(a * 3 + seed + band) * 0.07 + Math.sin(a * 7 + seed * 2) * 0.04) * (band % 2 ? 0.96 : 1.0);
    p.setXYZ(i, x * k, y, z * k);
    c.setScalar(band % 2 ? 0.86 : 1.0);
    if (y > 0.97) c.setScalar(1.1);
    col.push(c.r, c.g, c.b);
  }
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.computeVertexNormals();
  return g;
}

// a palm trunk: curved, ringed, thicker at the foot
export function palmTrunkGeometry() {
  return taperTube([[0, 0, 0], [0.04, 0.35, 0], [0.15, 0.7, 0], [0.3, 1.0, 0]], 0.042, 0.026, 10, 60, (t) => 1 + Math.max(0, Math.sin(t * 160)) * 0.12 + (t < 0.06 ? (0.06 - t) * 6 : 0));
}

// a standing stone: a rounded slab, wider at the foot
export function menhirGeometry(seed = 0) {
  const g = new THREE.CapsuleGeometry(0.5, 1, 6, 12);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const t = (y + 1) / 2;
    const n = 1 + Math.sin(x * 5 + seed) * Math.cos(y * 3 + seed) * 0.08;
    p.setXYZ(i, x * (1.15 - t * 0.35) * n, y, z * 0.6 * n);
  }
  g.computeVertexNormals();
  return g.translate(0, 0.9, 0).scale(1, 1 / 1.9, 1);
}

// things the explorer should not walk through: circles { x, z, r } on the floor, kept off trails
export function obstacleList(near) {
  const list = [];
  return { list, add(x, z, r) { if (r >= 0.3 && !near(x, z, r + 0.6)) list.push({ x: Math.round(x * 100) / 100, z: Math.round(z * 100) / 100, r: Math.round(r * 100) / 100 }); } };
}

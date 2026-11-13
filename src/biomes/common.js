// Building blocks shared by every ecosystem: a terrain disk, trails across it, the slab
// ceiling above it (roots, glowing moss) and the level's own sun.
import * as THREE from 'three';
import { fbm } from '../noise.js';
import { DISK_R, SLAB, rampStart, LEVEL_BRIDGES } from '../tree/layout.js';
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
  return [rampStart, ...(level > 0 ? LEVEL_BRIDGES : []), ...extra];
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
    const len = 3 + Math.pow(rand(), 2) * 22, rad = 0.4 + rand() * 1.4;
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
    crystals.push({ p: polar(r, a, under - 4 - rand() * 6), s: V(1.2 + rand() * 1.5, 4 + rand() * 7, 1.2 + rand() * 1.5), rot: [(rand() - 0.5) * 0.6, rand() * 3, (rand() - 0.5) * 0.6], color: sunColor.clone().multiplyScalar(2.2 + rand()) });
  }
  group.add(instances(new THREE.OctahedronGeometry(1, 0), new THREE.MeshBasicMaterial({ color: '#ffffff' }), crystals, { shadow: false }));
  const light = new THREE.PointLight(sunColor, 16000, 0, 2);
  light.position.set(0, under - 16, 0);
  group.add(light);
  scene.add(group);
}

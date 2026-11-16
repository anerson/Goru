// Organic shapes for a softer, less blocky look: smooth lumpy blobs (bushes, rocks), tree
// crowns made of several merged lumps, and a rounded rock. Vertices are pushed out by a few
// layers of smooth 3D noise and the normals are recomputed, so lighting is soft (no facets).
// Geometry is built once per kind and shared by every instance.
import * as THREE from 'three';
import { mergeGeometries, mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';

// cheap smooth 3D value noise
function hash(x, y, z) { const s = Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453; return s - Math.floor(s); }
function vnoise(x, y, z) {
  const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
  const xf = x - xi, yf = y - yi, zf = z - zi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf), w = zf * zf * (3 - 2 * zf);
  const L = (a, b, t) => a + (b - a) * t;
  const c = (dx, dy, dz) => hash(xi + dx, yi + dy, zi + dz);
  return L(L(L(c(0, 0, 0), c(1, 0, 0), u), L(c(0, 1, 0), c(1, 1, 0), u), v), L(L(c(0, 0, 1), c(1, 0, 1), u), L(c(0, 1, 1), c(1, 1, 1), u), v), w);
}
const fbm = (x, y, z) => vnoise(x, y, z) * 0.6 + vnoise(x * 2.1, y * 2.1, z * 2.1) * 0.28 + vnoise(x * 4.3, y * 4.3, z * 4.3) * 0.12;

// a sphere pushed out by noise: amp 0.15 = gentle bush, 0.35 = knobbly rock
export function lumpy({ detail = 3, amp = 0.22, freq = 1.6, seed = 0, flatten = 1 } = {}) {
  let g = new THREE.IcosahedronGeometry(1, detail);
  g.deleteAttribute('normal'); g.deleteAttribute('uv');
  g = mergeVertices(g);                                   // shared vertices: smooth, no cracks
  const p = g.attributes.position, v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    const n = fbm(v.x * freq + seed, v.y * freq + seed * 1.7, v.z * freq - seed);
    v.multiplyScalar(1 + (n - 0.5) * 2 * amp);
    v.y *= flatten;
    p.setXYZ(i, v.x, v.y, v.z);
  }
  g.computeVertexNormals();
  return g;
}

// a tree crown: a big lump with smaller lumps around and on top, merged into one geometry
export function crown(seed = 0) {
  const parts = [];
  const add = (x, y, z, s, k) => { const g = lumpy({ detail: 2, amp: 0.2, seed: seed + k * 3.1 }); g.scale(s, s * 0.85, s); g.translate(x, y, z); parts.push(g); };
  add(0, 0, 0, 0.8, 0);
  for (let k = 0; k < 5; k++) { const a = (k / 5) * Math.PI * 2 + seed; add(Math.cos(a) * 0.5, -0.1 + (k % 2) * 0.15, Math.sin(a) * 0.5, 0.5, k + 1); }
  add(0.1, 0.45, -0.05, 0.5, 7);
  const g = mergeGeometries(parts);
  parts.forEach((x) => x.dispose());
  return g;
}

// a rounded boulder: lumpy, a little flattened, sits on its base
export const boulder = (seed = 0) => lumpy({ detail: 2, amp: 0.3, freq: 1.2, seed, flatten: 0.7 });

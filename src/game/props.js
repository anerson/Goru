// Detailed props for camps and the prologue: rounded, layered shapes instead of plain boxes.
// Tents with poles, guy ropes and an open flap; huts with log walls, a door and a thatched roof;
// a campfire ringed by stones; barrels with bulging staves and iron hoops; a workbench with a
// vice and tools; chests with a domed lid; supply crates; trail lanterns; a broken wagon; and
// the root portal that seals the tree until level 5.
// Materials are shared and cached; the cartoon pass (toon.js) converts them afterwards.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { lumpy, boulder } from '../organic.js';

const cache = new Map();
const mat = (c, o = {}) => {
  const k = c + JSON.stringify(o);
  if (!cache.has(k)) cache.set(k, new THREE.MeshStandardMaterial({ color: c, roughness: 0.85, ...o }));
  return cache.get(k);
};
const glow = (c, k = 1.6) => {
  const key = `g${c}${k}`;
  if (!cache.has(key)) cache.set(key, new THREE.MeshBasicMaterial({ color: new THREE.Color(c).multiplyScalar(k) }));
  return cache.get(key);
};
function part(parent, geo, m, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0) {
  const o = new THREE.Mesh(geo, m);
  o.position.set(x, y, z); o.rotation.set(rx, ry, rz);
  o.castShadow = true; o.receiveShadow = true;
  parent.add(o);
  return o;
}
// a cylinder from a to b (poles, ropes, logs)
function rod(parent, a, b, r, m, seg = 8) {
  const d = new THREE.Vector3().subVectors(b, a), len = d.length();
  const o = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, seg), m);
  o.position.copy(a).addScaledVector(d, 0.5);
  o.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize());
  o.castShadow = true;
  parent.add(o);
  return o;
}
const V = (x, y, z) => new THREE.Vector3(x, y, z);

// ---- a canvas tent: round, sagging a little between its ribs, flap open on one side ----
export function makeTent(color = '#c9a36a') {
  const g = new THREE.Group();
  const geo = new THREE.ConeGeometry(2.6, 3.2, 18, 3, true, 0.5, Math.PI * 2 - 1.0);
  const p = geo.attributes.position, v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {                       // sag between the ribs
    v.fromBufferAttribute(p, i);
    const a = Math.atan2(v.z, v.x), r = Math.hypot(v.x, v.z);
    const k = 1 - 0.06 * Math.abs(Math.sin(a * 4.5)) * (r / 2.6);
    p.setXYZ(i, v.x * k, v.y, v.z * k);
  }
  geo.computeVertexNormals();
  part(g, geo, mat(color, { side: THREE.DoubleSide, roughness: 1 }), 0, 1.6, 0);
  part(g, new THREE.ConeGeometry(2.55, 3.1, 18, 1, true), mat('#6a5030', { side: THREE.BackSide }), 0, 1.6, 0);   // the dark inside
  // the open flap folded back
  part(g, new THREE.PlaneGeometry(1.1, 2), mat(color, { side: THREE.DoubleSide }), 1.9, 0.9, 0.9, 0, -0.6, 0.15);
  rod(g, V(0, 0, 0), V(0, 3.5, 0), 0.06, mat('#5a3a1a'));
  for (let k = 0; k < 4; k++) {                             // guy ropes and pegs
    const a = (k / 4) * Math.PI * 2 + 0.4;
    const top = V(Math.cos(a) * 1.2, 2.1, Math.sin(a) * 1.2), peg = V(Math.cos(a) * 3.6, 0.05, Math.sin(a) * 3.6);
    rod(g, top, peg, 0.012, mat('#d8cfb0'), 4);
    part(g, new THREE.CylinderGeometry(0.04, 0.02, 0.35, 5), mat('#5a3a1a'), peg.x, 0.12, peg.z);
  }
  part(g, new THREE.CircleGeometry(2.4, 24), mat('#7a6040', { roughness: 1 }), 0, 0.03, 0, -Math.PI / 2);   // a rug inside
  return g;
}

// ---- a round hut: log walls, a door, a lit window and a two-layer thatched roof ----
export function makeHut(r = 3) {
  const g = new THREE.Group();
  const logM = mat('#7a5634'), dark = mat('#4a3420');
  part(g, new THREE.CylinderGeometry(r, r * 1.04, 2.6, 28), logM, 0, 1.3, 0);
  for (let k = 0; k < 14; k++) {                            // the posts that hold the wall
    const a = (k / 14) * Math.PI * 2;
    part(g, new THREE.CylinderGeometry(0.16, 0.18, 2.9, 8), dark, Math.cos(a) * r * 1.02, 1.45, Math.sin(a) * r * 1.02);
  }
  part(g, new THREE.TorusGeometry(r * 1.03, 0.09, 6, 40), dark, 0, 2.55, 0, Math.PI / 2);
  part(g, new RoundedBoxGeometry(1.1, 1.9, 0.25, 3, 0.06), mat('#5a3a20'), 0, 0.95, r * 0.98);          // door
  part(g, new THREE.TorusGeometry(0.62, 0.08, 6, 16, Math.PI), dark, 0, 1.85, r * 1.0);
  part(g, new THREE.CircleGeometry(0.32, 16), glow('#ffcf7a', 1.3), r * 0.71, 1.6, r * 0.71, 0, Math.PI / 4, 0);   // window
  const thatch = (rad, h, y, c) => {
    const geo = new THREE.ConeGeometry(rad, h, 28, 5);
    const p = geo.attributes.position, v = new THREE.Vector3();
    for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i); const n = Math.sin(v.x * 7) * Math.cos(v.z * 6) * 0.08; p.setXYZ(i, v.x * (1 + n), v.y, v.z * (1 + n)); }
    geo.computeVertexNormals();
    return part(g, geo, mat(c, { roughness: 1 }), 0, y, 0);
  };
  thatch(r * 1.45, 2.2, 3.6, '#b08a4a');
  thatch(r * 0.85, 1.6, 4.6, '#c49a55');
  part(g, new THREE.CylinderGeometry(0.18, 0.22, 0.8, 8), dark, 0.6, 5.2, 0.2);   // chimney
  return g;
}

// ---- a campfire: a ring of rounded stones, crossed logs, three flames ----
export function makeCampfire() {
  const g = new THREE.Group();
  const stone = mat('#7d786c', { roughness: 0.95 });
  const sGeo = boulder(11);
  for (let k = 0; k < 9; k++) {
    const a = (k / 9) * Math.PI * 2;
    const s = part(g, sGeo, stone, Math.cos(a) * 0.95, 0.12, Math.sin(a) * 0.95);
    s.scale.set(0.28, 0.22, 0.24); s.rotation.y = a;
  }
  for (let k = 0; k < 4; k++) {
    const a = (k / 4) * Math.PI;
    rod(g, V(Math.cos(a) * 0.7, 0.1, Math.sin(a) * 0.7), V(-Math.cos(a) * 0.7, 0.3, -Math.sin(a) * 0.7), 0.09, mat('#5a3a1a'), 10);
  }
  part(g, new THREE.CircleGeometry(0.75, 20), mat('#2a1a10'), 0, 0.02, 0, -Math.PI / 2);
  const flame = new THREE.Group();
  flame.position.y = 0.3;
  // three teardrop flames, a hot core inside, and a few embers
  part(flame, new THREE.LatheGeometry(Array.from({ length: 12 }, (_, k) => { const t = k / 11; return new THREE.Vector2(Math.sin(Math.PI * Math.pow(t, 0.7)) * 0.42 * (1 - t * 0.6), t * 1.3); }), 14), glow('#ff7a1a', 1.5), 0, 0, 0).castShadow = false;
  part(flame, new THREE.LatheGeometry(Array.from({ length: 12 }, (_, k) => { const t = k / 11; return new THREE.Vector2(Math.sin(Math.PI * Math.pow(t, 0.7)) * 0.3 * (1 - t * 0.6), t * 1.0); }), 14), glow('#ffc23a', 1.9), 0.1, 0, 0.06).castShadow = false;
  part(flame, new THREE.LatheGeometry(Array.from({ length: 12 }, (_, k) => { const t = k / 11; return new THREE.Vector2(Math.sin(Math.PI * Math.pow(t, 0.7)) * 0.17 * (1 - t * 0.6), t * 0.7); }), 14), glow('#fff2b0', 2.4), -0.06, 0, -0.04).castShadow = false;
  for (let k = 0; k < 5; k++) part(flame, new THREE.SphereGeometry(0.035, 6, 4), glow('#ffb347', 2.2), Math.cos(k * 2.3) * 0.35, 0.9 + (k % 3) * 0.35, Math.sin(k * 2.3) * 0.35).castShadow = false;
  g.add(flame);
  return { root: g, flame };
}

// ---- a barrel: bulging staves (lathe), iron hoops, a lid ----
export function makeBarrel() {
  const g = new THREE.Group();
  const pts = [];
  for (let k = 0; k <= 10; k++) { const t = k / 10; pts.push(new THREE.Vector2(0.42 + Math.sin(t * Math.PI) * 0.09, t * 1.05)); }
  part(g, new THREE.LatheGeometry(pts, 20), mat('#8a6038'));
  const iron = mat('#3a3a3a', { metalness: 0.6, roughness: 0.4 });
  for (const [y, rr] of [[0.12, 0.46], [0.52, 0.51], [0.93, 0.46]]) part(g, new THREE.TorusGeometry(rr, 0.025, 6, 28), iron, 0, y, 0, Math.PI / 2);
  part(g, new THREE.CylinderGeometry(0.43, 0.43, 0.04, 20), mat('#6a4628'), 0, 1.04, 0);
  return g;
}

// ---- the workbench: a thick top, splayed legs, a vice, an anvil, tools and a lamp ----
export function makeWorkbench() {
  const g = new THREE.Group();
  const wood = mat('#8a6038'), dark = mat('#5a3e24'), iron = mat('#4a4a4e', { metalness: 0.7, roughness: 0.35 });
  part(g, new RoundedBoxGeometry(2.5, 0.2, 1.15, 3, 0.05), wood, 0, 0.98, 0);
  for (const [x, z] of [[-1.05, -0.42], [1.05, -0.42], [-1.05, 0.42], [1.05, 0.42]]) part(g, new THREE.CylinderGeometry(0.07, 0.09, 1, 8), dark, x, 0.48, z, z * 0.12, 0, -x * 0.05);
  part(g, new RoundedBoxGeometry(2.1, 0.08, 0.9, 2, 0.03), dark, 0, 0.3, 0);                       // shelf
  part(g, new RoundedBoxGeometry(0.5, 0.3, 0.32, 3, 0.05), iron, -0.65, 1.23, 0);                   // anvil body
  part(g, new THREE.ConeGeometry(0.12, 0.35, 10), iron, -0.98, 1.3, 0, 0, 0, Math.PI / 2);           // horn
  part(g, new RoundedBoxGeometry(0.22, 0.18, 0.2, 2, 0.03), iron, 0.95, 1.17, 0.35);                // vice
  rod(g, V(0.45, 1.1, 0.15), V(0.85, 1.1, -0.1), 0.025, dark);                                       // hammer
  part(g, new RoundedBoxGeometry(0.2, 0.12, 0.1, 2, 0.02), iron, 0.86, 1.12, -0.11);
  for (let k = 0; k < 3; k++) part(g, new THREE.CylinderGeometry(0.05, 0.05, 0.18, 10), mat(['#9a6a3a', '#5a7a8a', '#7a4a7a'][k]), 0.2 + k * 0.14, 1.17, -0.38);   // jars
  part(g, new THREE.SphereGeometry(0.1, 12, 10), glow('#ffd76a', 1.6), -0.15, 1.5, 0.4);
  rod(g, V(-0.15, 1.08, 0.4), V(-0.15, 1.42, 0.4), 0.015, iron);
  return g;
}

// ---- a chest with a domed lid; open(true) tips the lid back ----
export function makeChestModel() {
  const g = new THREE.Group();
  const wood = mat('#6a3f1f'), gold = mat('#d9a531', { metalness: 0.8, roughness: 0.3 });
  part(g, new RoundedBoxGeometry(1.2, 0.62, 0.8, 3, 0.05), wood, 0, 0.31, 0);
  for (const x of [-0.45, 0.45]) part(g, new RoundedBoxGeometry(0.08, 0.66, 0.84, 2, 0.02), gold, x, 0.33, 0);
  const lid = new THREE.Group();
  lid.position.set(0, 0.62, -0.4);
  part(lid, new THREE.CylinderGeometry(0.4, 0.4, 1.2, 20, 1, false, 0, Math.PI), wood, 0, 0, 0.4, 0, 0, Math.PI / 2).rotation.set(0, 0, Math.PI / 2);
  for (const x of [-0.45, 0.45]) part(lid, new THREE.TorusGeometry(0.41, 0.03, 6, 20, Math.PI), gold, x, 0, 0.4, 0, Math.PI / 2, 0);
  part(lid, new RoundedBoxGeometry(0.16, 0.2, 0.06, 2, 0.02), gold, 0, 0.0, 0.82);
  g.add(lid);
  return { root: g, lid };
}

// ---- a supply crate: rounded planks with a darker frame ----
export function makeCrate() {
  const g = new THREE.Group();
  part(g, new RoundedBoxGeometry(0.9, 0.7, 0.7, 3, 0.05), mat('#9a7448'), 0, 0.35, 0);
  for (const y of [0.08, 0.62]) part(g, new RoundedBoxGeometry(0.94, 0.08, 0.74, 2, 0.02), mat('#5a3e24'), 0, y, 0);
  part(g, new RoundedBoxGeometry(0.08, 0.6, 0.74, 2, 0.02), mat('#5a3e24'), 0, 0.35, 0, 0, 0, 0.75);
  return g;
}

// ---- a trail lantern: a post, a hook and a glass lamp; lit(true) lights it ----
export function makeLantern() {
  const g = new THREE.Group();
  const wood = mat('#5a3e24'), iron = mat('#3a3a3e', { metalness: 0.6, roughness: 0.4 });
  rod(g, V(0, 0, 0), V(0, 2.4, 0), 0.08, wood, 10);
  rod(g, V(0, 2.3, 0), V(0.5, 2.3, 0), 0.04, iron);
  part(g, new THREE.CylinderGeometry(0.16, 0.2, 0.08, 12), iron, 0.5, 2.1, 0);
  const off = part(g, new THREE.SphereGeometry(0.17, 16, 12), mat('#556070', { transparent: true, opacity: 0.6, roughness: 0.1 }), 0.5, 1.92, 0);
  const on = part(g, new THREE.SphereGeometry(0.17, 16, 12), glow('#ffd88a', 2.2), 0.5, 1.92, 0);
  on.castShadow = false;
  part(g, new THREE.ConeGeometry(0.2, 0.16, 12), iron, 0.5, 1.72, 0, Math.PI);
  return { root: g, lit(v) { on.visible = v; off.visible = !v; } };
}

// ---- a broken caravan wagon: tipped over, one wheel off ----
export function makeWagon() {
  const g = new THREE.Group();
  const wood = mat('#8a6038'), dark = mat('#4a3420');
  const bed = new THREE.Group();
  bed.rotation.z = 0.35;
  bed.position.set(0, 0.7, 0);
  g.add(bed);
  part(bed, new RoundedBoxGeometry(3.2, 0.18, 1.6, 2, 0.04), wood, 0, 0, 0);
  for (const z of [-0.78, 0.78]) part(bed, new RoundedBoxGeometry(3.2, 0.6, 0.08, 2, 0.02), wood, 0, 0.35, z);
  part(bed, new THREE.CylinderGeometry(0.8, 0.8, 3, 16, 1, true, 0, Math.PI), mat('#e8dcc0', { side: THREE.DoubleSide }), 0, 0.6, 0, 0, 0, Math.PI / 2);
  const wheel = (x, y, z, rx) => {
    const w = new THREE.Group();
    w.position.set(x, y, z); w.rotation.x = rx;
    part(w, new THREE.TorusGeometry(0.5, 0.06, 8, 24), dark);
    for (let k = 0; k < 6; k++) part(w, new THREE.CylinderGeometry(0.03, 0.03, 0.95, 6), dark, 0, 0, 0, 0, 0, (k / 6) * Math.PI);
    g.add(w);
  };
  wheel(-1.1, 0.5, -0.9, 0); wheel(1.1, 0.95, -0.9, 0); wheel(2.4, 0.07, 1.2, Math.PI / 2);
  return g;
}

// ---- the root portal: two pillars of rounded stones, an arch, vines and a swirling veil ----
// open(t) runs the dissolve (0 = sealed, 1 = gone); spin(t) turns the veil
// a soft cloud puff for fog: overlapping blurred blobs, white with a soft edge
let cloudTex = null;
function cloudTexture() {
  if (cloudTex) return cloudTex;
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const x = c.getContext('2d');
  for (let k = 0; k < 14; k++) {
    const cx = 64 + Math.cos(k * 2.4) * (8 + (k % 4) * 6), cy = 64 + Math.sin(k * 2.4) * (8 + (k % 3) * 6), r = 26 + (k % 5) * 5;
    const gr = x.createRadialGradient(cx, cy, 0, cx, cy, r);
    gr.addColorStop(0, 'rgba(255,255,255,0.55)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    x.fillStyle = gr; x.fillRect(0, 0, 128, 128);
  }
  // a round mask so the puff fades out well before the canvas edge (no square)
  x.globalCompositeOperation = 'destination-in';
  const mask = x.createRadialGradient(64, 64, 20, 64, 64, 62);
  mask.addColorStop(0, 'rgba(0,0,0,1)'); mask.addColorStop(1, 'rgba(0,0,0,0)');
  x.fillStyle = mask; x.fillRect(0, 0, 128, 128);
  cloudTex = new THREE.CanvasTexture(c);
  cloudTex.colorSpace = THREE.SRGBColorSpace;
  return cloudTex;
}

export function makePortal() {
  const g = new THREE.Group();
  const stone = mat('#8a8070', { roughness: 0.95 }), moss = mat('#4f7a35', { roughness: 1 });
  const sGeo = boulder(21);
  for (const side of [-1, 1]) for (let k = 0; k < 5; k++) {
    const s = part(g, sGeo, stone, side * 4.6 + (k % 2 ? 0.2 : -0.2), 0.8 + k * 1.45, 0);
    s.scale.set(1.15 - k * 0.06, 0.85, 1.1 - k * 0.05); s.rotation.y = k * 1.3;
  }
  part(g, new THREE.TorusGeometry(4.6, 0.85, 12, 40, Math.PI), stone, 0, 7.2, 0);
  part(g, new THREE.TorusGeometry(4.6, 0.9, 10, 40, Math.PI), moss, 0, 7.45, 0).scale.set(1, 1, 0.6);
  // vines hanging from the arch
  const vineM = mat('#3f6a2a');
  for (let k = 0; k < 9; k++) {
    const a = 0.2 + (k / 8) * (Math.PI - 0.4), x = Math.cos(a) * 4.6, y = 7.2 + Math.sin(a) * 4.6;
    const len = 1.5 + ((k * 37) % 5) * 0.5;
    const curve = new THREE.CatmullRomCurve3([V(x, y, 0.5), V(x + 0.2, y - len * 0.5, 0.7), V(x - 0.1, y - len, 0.55)]);
    part(g, new THREE.TubeGeometry(curve, 10, 0.06, 6), vineM);
    for (let j = 0; j < 3; j++) { const p = curve.getPoint(0.3 + j * 0.3); part(g, new THREE.SphereGeometry(0.16, 8, 6), moss, p.x, p.y, p.z + 0.05).scale.set(1.4, 0.5, 1); }
  }
  // the veil: a swirl of light filling the arch
  const c = document.createElement('canvas'); c.width = c.height = 256;
  const x = c.getContext('2d');
  const grd = x.createRadialGradient(128, 128, 10, 128, 128, 128);
  grd.addColorStop(0, 'rgba(255,240,180,0.95)'); grd.addColorStop(0.55, 'rgba(255,190,90,0.55)'); grd.addColorStop(1, 'rgba(255,150,60,0)');
  x.fillStyle = grd; x.fillRect(0, 0, 256, 256);
  x.strokeStyle = 'rgba(255,255,230,0.55)'; x.lineWidth = 5;
  for (let k = 0; k < 6; k++) { x.beginPath(); for (let t = 0; t < 1; t += 0.01) { const a = k + t * 7, r = t * 120; x.lineTo(128 + Math.cos(a) * r, 128 + Math.sin(a) * r); } x.stroke(); }
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
  const veilMat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, side: THREE.DoubleSide });
  const veil = new THREE.Mesh(new THREE.CircleGeometry(4.2, 48), veilMat);
  veil.position.y = 6.2; veil.scale.y = 1.45;
  g.add(veil);
  const veil2 = veil.clone(); veil2.material = veilMat.clone(); veil2.material.opacity = 0.5; veil2.scale.set(0.8, 1.2, 1);
  g.add(veil2);
  const runes = part(g, new THREE.TorusGeometry(4.25, 0.07, 6, 64), glow('#ffcf7a', 2), 0, 6.2, 0);
  runes.scale.y = 1.45; runes.castShadow = false;
  // the fog behind the portal: a dense bank of soft clouds filling the arch and the passage
  // behind it, layered so nothing of the inside shows through; it drifts slowly and clears
  // when the seal breaks
  const fog = new THREE.Group();
  g.add(fog);
  const fogTex = cloudTexture();
  const puffs = [];
  for (let k = 0; k < 0; k++) {   // the opaque mist wall (makeMistWall) does the hiding now
    const layer = k % 6;                                  // 0 at the arch, 5 deep inside
    // pale warm mist, not tinted by the scene's own fog (inside the trunk it is dark)
    const m = new THREE.SpriteMaterial({ map: fogTex, color: new THREE.Color().setHSL(0.12, 0.3, 0.85), transparent: true, depthWrite: false, opacity: 0.45, fog: false, toneMapped: false, blending: THREE.AdditiveBlending });
    const sp = new THREE.Sprite(m);
    const x = ((k * 7.31) % 1 - 0.5) * 10, y = 1.5 + ((k * 3.17) % 1) * 10, z = -0.6 - layer * 2.2;
    const sz = 6 + ((k * 5.13) % 1) * 4 + layer * 0.8;
    sp.scale.set(sz, sz, 1);
    sp.position.set(x, y, z);
    sp.userData = { base: sp.position.clone(), phase: k * 1.7, size: sz };
    fog.add(sp);
    puffs.push(sp);
  }
  let openT = 0;
  return {
    root: g,
    spin(t) {
      veil.rotation.z = t * 0.6; veil2.rotation.z = -t * 0.9; veilMat.opacity = 0.85 + Math.sin(t * 2) * 0.1;
      for (const p of puffs) {                            // the fog breathes; once open it lifts and spreads
        const b = p.userData.base, o = openT;
        p.position.set(b.x * (1 + o * 1.5) + Math.sin(t * 0.3 + p.userData.phase) * 0.6, b.y + o * 9 + Math.sin(t * 0.4 + p.userData.phase) * 0.3, b.z - o * 4);
        p.material.opacity = 0.45 * Math.max(0, 1 - o * 1.15);
        p.material.rotation = t * 0.03 + p.userData.phase;
      }
      fog.visible = openT < 0.98;
    },
    open(k) {                                                // 0 sealed .. 1 open
      openT = k;
      const v = Math.max(0, 1 - k);
      veil.visible = veil2.visible = runes.visible = v > 0.01;
      veil.scale.set(v, 1.45 * v, 1); veil2.scale.set(0.8 * v, 1.2 * v, 1); runes.scale.set(v, 1.45 * v, 1);
    },
    get openness() { return openT; },
  };
}

// ---- a wall of mist that closes a whole opening in the trunk (opaque, so nothing of the inside
// shows through and the scene's ambient shading cannot darken it); fade(k) clears it
let mistTex = null;
function mistTexture() {
  if (mistTex) return mistTex;
  const c = document.createElement('canvas'); c.width = 512; c.height = 256;
  const x = c.getContext('2d');
  x.fillStyle = '#d8d0bc'; x.fillRect(0, 0, 512, 256);
  for (let k = 0; k < 160; k++) {                          // soft swirls of lighter and darker mist
    const cx = (k * 97.3) % 512, cy = (k * 53.7) % 256, r = 18 + (k % 7) * 9;
    const light = k % 3 !== 0;
    const gr = x.createRadialGradient(cx, cy, 0, cx, cy, r);
    gr.addColorStop(0, light ? 'rgba(255,252,240,0.5)' : 'rgba(170,160,140,0.35)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    x.fillStyle = gr; x.fillRect(cx - r, cy - r, r * 2, r * 2);
  }
  mistTex = new THREE.CanvasTexture(c);
  mistTex.colorSpace = THREE.SRGBColorSpace;
  mistTex.wrapS = THREE.RepeatWrapping;
  return mistTex;
}
// a cloud puff for the mist: a soft lump, lighter on top and shaded underneath (baked into
// vertex colours, so it reads as a volume without any lighting)
let mistPuff = null;
function mistPuffGeometry() {
  if (mistPuff) return mistPuff;
  const g = lumpy({ detail: 3, amp: 0.16, freq: 1.3, seed: 5 });
  const n = g.attributes.normal, col = [];
  for (let i = 0; i < n.count; i++) { const k = 0.66 + 0.38 * Math.pow(n.getY(i) * 0.5 + 0.5, 1.5) + 0.04 * n.getZ(i); col.push(k, k, k * 0.98); }
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  mistPuff = g;
  return g;
}
export function makeMistWall({ radius = 103, angle = 0, halfWidth = 0.42, height = 36, y = 0 } = {}) {
  const tex = mistTexture().clone();
  tex.needsUpdate = true;
  tex.repeat.set(3, 1);
  const root = new THREE.Group();
  root.userData.noToon = true;
  // the opaque core: a curved sheet across the whole opening (nothing of the inside shows)
  const m = new THREE.MeshBasicMaterial({ map: tex, color: '#d9bf86', side: THREE.DoubleSide, fog: false, transparent: false });
  const theta = Math.atan2(Math.cos(angle), Math.sin(angle));          // three's cylinder: x = r sin(t), z = r cos(t)
  const wall = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, height, 32, 1, true, theta - halfWidth, halfWidth * 2), m);
  wall.position.y = y + height / 2 - 1;
  wall.raycast = () => {};
  wall.userData.noToon = true;
  root.add(wall);
  // billowing banks of cloud on both faces, so the mist has depth and a soft, lumpy outline
  const pm = new THREE.MeshBasicMaterial({ vertexColors: true, fog: false });
  const items = [];
  const rnd = (k) => { const s = Math.sin(k * 127.1 + angle * 311.7) * 43758.5453; return s - Math.floor(s); };
  const span = radius * halfWidth * 2;
  const cols = Math.max(6, Math.round(span / 6.5)), rows = Math.max(3, Math.round(height / 7));
  for (const side of [1, -1]) for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) {
    const k = items.length;
    const u = (i + 0.5 + (rnd(k) - 0.5) * 0.6) / cols * 2 - 1;
    const a = angle + u * halfWidth * 0.94;
    const lift = j / (rows - 1);
    const s = (6 + rnd(k + 0.5) * 3.5) * (1 - lift * 0.25) * (1 - Math.abs(u) * 0.25);
    const r = radius + side * (0.8 + rnd(k + 0.7) * 1.0);
    items.push({ base: new THREE.Vector3(Math.cos(a) * r, y + 2 + lift * (height - 7) + (rnd(k + 0.3) - 0.5) * 2, Math.sin(a) * r), s, phase: rnd(k + 0.9) * 6.28, tone: 0.86 + rnd(k + 0.2) * 0.18, yaw: Math.atan2(Math.cos(a), Math.sin(a)) });
  }
  const puffs = new THREE.InstancedMesh(mistPuffGeometry(), pm, items.length);
  puffs.raycast = () => {};
  puffs.userData.noToon = true;
  puffs.frustumCulled = false;
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), sc = new THREE.Vector3(), p = new THREE.Vector3(), c = new THREE.Color();
  const base = new THREE.Color('#f2dcaa');
  items.forEach((it, i) => puffs.setColorAt(i, c.copy(base).multiplyScalar(it.tone)));
  let shrink = 1;
  const place = (t) => {
    items.forEach((it, i) => {
      p.set(it.base.x + Math.sin(t * 0.21 + it.phase) * 0.8, it.base.y + Math.sin(t * 0.17 + it.phase * 1.3) * 0.6 + (1 - shrink) * 6, it.base.z + Math.cos(t * 0.19 + it.phase) * 0.8);
      const s = it.s * (1 + Math.sin(t * 0.3 + it.phase) * 0.05) * shrink;
      puffs.setMatrixAt(i, m4.compose(p, q.setFromEuler(e.set(0, it.yaw, Math.sin(t * 0.05 + it.phase) * 0.3)), sc.set(s, s * 0.8, s * 0.38)));
    });
    puffs.instanceMatrix.needsUpdate = true;
  };
  place(0);
  root.add(puffs);
  return {
    root,
    drift(t) { tex.offset.x = t * 0.01; if (root.visible) place(t); },
    fade(k) {                                                // 0 = solid mist, 1 = gone
      const o = Math.max(0, 1 - k);
      for (const mm of [m, pm]) { mm.transparent = o < 1; mm.opacity = o; mm.depthWrite = o >= 1; }
      shrink = 0.6 + 0.4 * o;
      root.visible = o > 0.01;
    },
  };
}

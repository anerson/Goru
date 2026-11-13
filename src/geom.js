// Small geometry helpers shared by the walkways and the biomes.
import * as THREE from 'three';

export const V = (x, y, z) => new THREE.Vector3(x, y, z);
export const angDist = (a, b) => Math.abs(Math.atan2(Math.sin(a - b), Math.cos(a - b)));
export const polar = (r, a, y = 0) => V(Math.cos(a) * r, y, Math.sin(a) * r);

// Flat strip along a centre line with horizontal sides; v runs in metres along the strip.
export function ribbon(points, width, closed = false) {
  const pts = closed ? points.concat([points[0]]) : points;
  const pos = [], uv = [], idx = [];
  let len = 0;
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i];
    const a = pts[Math.max(i - 1, 0)], b = pts[Math.min(i + 1, pts.length - 1)];
    let tx = b.x - a.x, tz = b.z - a.z;
    if (closed && (i === 0 || i === pts.length - 1)) { tx = pts[1].x - pts[pts.length - 2].x; tz = pts[1].z - pts[pts.length - 2].z; }
    const tl = Math.hypot(tx, tz) || 1;
    const sx = (-tz / tl) * width / 2, sz = (tx / tl) * width / 2;
    if (i > 0) len += p.distanceTo(pts[i - 1]);
    pos.push(p.x - sx, p.y, p.z - sz, p.x + sx, p.y, p.z + sz);
    uv.push(0, len, width / 3, len);
    if (i < pts.length - 1) { const k = i * 2; idx.push(k, k + 2, k + 1, k + 1, k + 2, k + 3); }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  g.userData.length = len;
  return g;
}

// the same line pushed sideways by `offset` metres
export function offsetLine(points, offset, closed = false) {
  return points.map((p, i) => {
    const a = points[i === 0 ? (closed ? points.length - 1 : 0) : i - 1];
    const b = points[i === points.length - 1 ? (closed ? 0 : i) : i + 1];
    const tx = b.x - a.x, tz = b.z - a.z;
    const tl = Math.hypot(tx, tz) || 1;
    return V(p.x - (tz / tl) * offset, p.y, p.z + (tx / tl) * offset);
  });
}

// smooth 2D path through control points [x, z], sampled about every `step` metres
export function smoothPath(ctrl, step = 1.5, closed = false) {
  const curve = new THREE.CatmullRomCurve3(ctrl.map(([x, z]) => V(x, 0, z)), closed, 'centripetal');
  const n = Math.max(8, Math.round(curve.getLength() / step));
  return curve.getSpacedPoints(n);
}

// A floating sign: big, readable text on a sprite, used as a landmark.
export function label(text, color, position, width) {
  const c = document.createElement('canvas');
  c.width = 1024; c.height = 160;
  const g = c.getContext('2d');
  g.fillStyle = 'rgba(20, 22, 16, 0.72)';
  g.beginPath(); g.roundRect(8, 8, 1008, 144, 28); g.fill();
  g.fillStyle = color;
  g.font = '700 72px "Bricolage Grotesque", "Segoe UI", system-ui, sans-serif';
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText(text, 512, 84);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, fog: false }));
  s.scale.set(width, (width * 160) / 1024, 1);
  s.position.copy(position);
  return s;
}

// Fill an InstancedMesh from a list of { p, rot?, s (number|Vector3), color? }.
export function instances(geo, mat, items, { shadow = true } = {}) {
  const mesh = new THREE.InstancedMesh(geo, mat, Math.max(items.length, 1));
  mesh.count = items.length;
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), sc = new THREE.Vector3(), col = new THREE.Color();
  items.forEach((it, i) => {
    q.setFromEuler(e.set(it.rot?.[0] ?? 0, it.rot?.[1] ?? 0, it.rot?.[2] ?? 0));
    if (typeof it.s === 'number') sc.setScalar(it.s); else sc.copy(it.s ?? V(1, 1, 1));
    mesh.setMatrixAt(i, m4.compose(it.p, q, sc));
    if (it.color) mesh.setColorAt(i, col.set(it.color));
  });
  mesh.castShadow = shadow;
  mesh.receiveShadow = true;
  return mesh;
}

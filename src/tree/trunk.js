// Seven twisted strands that fuse into an olive trunk, hollow in the middle, each one
// bending out at the top into a main limb. Buttress roots spread from every strand's foot.
import * as THREE from 'three';
import { fbm, vnoise, mulberry32 } from '../noise.js';
import { TAU, TRUNK, ringR, strandR, strandTheta, SEED } from './layout.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);

// A tube along a Catmull-Rom curve with per-control-point radius, knobbly noise and
// vertical grooves, so it reads as old wood rather than a pipe.
export function buildTube(points, radii, segs, radial, o) {
  const curve = new THREE.CatmullRomCurve3(points, false, 'centripetal');
  const frames = curve.computeFrenetFrames(segs, false);
  const length = curve.getLength(), n = points.length;
  const rep = Math.max(1, Math.round((TAU * Math.max(...radii)) / 6));
  const pos = [], uv = [], idx = [];
  const P = new THREE.Vector3();
  for (let i = 0; i <= segs; i++) {
    const u = i / segs;
    curve.getPointAt(u, P);
    const f = curve.getUtoTmapping(u) * (n - 1);
    const k = Math.min(Math.floor(f), n - 2), w = f - k;
    const r = radii[k] * (1 - w) + radii[k + 1] * w;
    const N = frames.normals[i], B = frames.binormals[i];
    for (let j = 0; j <= radial; j++) {
      const a = (j / radial) * TAU, c = Math.cos(a), s = Math.sin(a);
      const dx = N.x * c + B.x * s, dy = N.y * c + B.y * s, dz = N.z * c + B.z * s;
      const sx = P.x + dx * r, sy = P.y + dy * r, sz = P.z + dz * r;
      let rr = r * (1 + o.knob * (fbm(sx * 0.12 + 50, sy * 0.1, sz * 0.12) - 0.5) * 2);
      const groove = Math.pow(Math.abs(Math.sin(a * o.flutes + P.y * 0.07 + o.phase)), 0.6);
      rr *= 1 - o.groove + o.groove * groove;
      rr *= 1 + 0.05 * (vnoise(sx * 0.6, sy * 0.25, sz * 0.6) - 0.5);
      pos.push(P.x + dx * rr, P.y + dy * rr, P.z + dz * rr);
      uv.push((j / radial) * rep, (u * length) / 6);
    }
  }
  for (let i = 0; i < segs; i++) {
    for (let j = 0; j < radial; j++) {
      const a = i * (radial + 1) + j, b = a + radial + 1;
      idx.push(a, b, a + 1, b, b + 1, a + 1);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  return { geo, curve };
}

export function buildTrunk(group, barkMat) {
  const rand = mulberry32(SEED + 1);
  const limbEnds = [], limbMids = [], rootMeshes = [], rootSegs = [];

  for (let i = 0; i < TRUNK.strands; i++) {
    const pts = [], radii = [];
    for (let y = -4; y <= TRUNK.top; y += 2.5) {
      const th = strandTheta(i, y), R = ringR(y);
      pts.push(V(Math.cos(th) * R, y, Math.sin(th) * R));
      radii.push(strandR(y));
    }
    // limb: arcs outward and up; `tilt` decides between a spreading or a climbing limb
    const tilt = 0.35 + rand() * 0.85;
    let R = ringR(TRUNK.top), y = TRUNK.top, th = strandTheta(i, TRUNK.top);
    const r0 = strandR(TRUNK.top);
    for (let s = 1; s <= 6; s++) {
      R += 5.2 * (1.25 - tilt * 0.45);
      y += 3.2 + tilt * 3.0 - s * 0.35;
      th += (rand() - 0.5) * 0.12;
      pts.push(V(Math.cos(th) * R, y, Math.sin(th) * R));
      radii.push(r0 * (1 - s * 0.115));
      if (s === 3) limbMids.push({ p: pts[pts.length - 1].clone(), th, r: radii[radii.length - 1] });
    }
    const { geo, curve } = buildTube(pts, radii, 190, 56, { knob: 0.16, groove: 0.14, flutes: 5, phase: i * 1.3 });
    const mesh = new THREE.Mesh(geo, barkMat);
    mesh.name = `strand-${i}`;
    mesh.castShadow = mesh.receiveShadow = true;
    group.add(mesh);
    limbEnds.push({ p: curve.getPointAt(1), d: curve.getTangentAt(1), r: radii[radii.length - 1] });
  }

  for (let i = 0; i < TRUNK.strands; i++) {
    const pts = [], radii = [0.0, 0, 0, 0, 0, 0, 0];
    const rr = [3.6, 2.9, 2.2, 1.6, 1.15, 0.8, 0.5];
    let th = strandTheta(i, 0);
    for (let k = 0; k < rr.length; k++) {
      const R = ringR(0) - 1 + k * (3.6 + rand() * 0.8);
      th += (rand() - 0.5) * 0.06;
      const y = 0.9 - k * 0.42 - (k > 3 ? 0.2 : 0);
      pts.push(V(Math.cos(th) * R, y, Math.sin(th) * R));
      radii[k] = rr[k];
    }
    const { geo } = buildTube(pts, radii, 60, 28, { knob: 0.14, groove: 0.1, flutes: 3, phase: i });
    const mesh = new THREE.Mesh(geo, barkMat);
    mesh.name = `root-${i}`;
    mesh.castShadow = mesh.receiveShadow = true;
    group.add(mesh);
    rootMeshes.push(mesh);
    for (let k = 0; k < pts.length - 1; k++) rootSegs.push({ a: pts[k], b: pts[k + 1], ra: radii[k], rb: radii[k + 1] });
  }

  return { limbEnds, limbMids, rootMeshes, rootSegs };
}

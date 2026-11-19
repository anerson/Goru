// Nine twisted strands that fuse into the oak's trunk, hollow in the middle, each one bending
// out at the top into a main limb. Buttress roots spread from every strand's foot.
import * as THREE from 'three';
import { fbm, vnoise, mulberry32 } from '../noise.js';
import { TAU, TRUNK, ringR, strandR, strandTheta, gapAngles, SEED, RAMP, TOP_BRIDGES } from './layout.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const BARK_TILE = 8; // metres covered by one repeat of the bark texture

// A tube along a Catmull-Rom curve with per-control-point radius, knobbly noise and
// vertical grooves, so it reads as old wood rather than a pipe.
export function buildTube(points, radii, segs, radial, o) {
  const curve = new THREE.CatmullRomCurve3(points, false, 'centripetal');
  const frames = curve.computeFrenetFrames(segs, false);
  const length = curve.getLength(), n = points.length;
  const rep = Math.max(1, Math.round((TAU * Math.max(...radii)) / BARK_TILE));
  const pos = [], uv = [], idx = [];
  const P = new THREE.Vector3();
  const f1 = o.freq, f2 = o.freq * 4;
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
      // big lumps, then smaller burls, then vertical grooves
      let rr = r * (1 + o.knob * (fbm(sx * f1 + 50, sy * f1 * 0.8, sz * f1) - 0.5) * 2);
      rr *= 1 + 0.06 * (fbm(sx * f2, sy * f2 * 0.6, sz * f2, 3) - 0.5) * 2;
      const groove = Math.pow(Math.abs(Math.sin(a * o.flutes + P.y * o.freq * 0.6 + o.phase)), 0.6);
      rr *= 1 - o.groove + o.groove * groove;
      rr *= 1 + 0.03 * (vnoise(sx * f2 * 3, sy * f2, sz * f2 * 3) - 0.5);
      pos.push(P.x + dx * rr, P.y + dy * rr, P.z + dz * rr);
      uv.push((j / radial) * rep, (u * length) / BARK_TILE);
    }
  }
  for (let i = 0; i < segs; i++) {
    for (let j = 0; j < radial; j++) {
      const a = i * (radial + 1) + j, b = a + radial + 1;
      idx.push(a, a + 1, b, b, a + 1, b + 1);   // wound to face outward (ring runs N -> B = T x N)
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
    for (let y = -20; y <= TRUNK.top; y += 12) {
      const th = strandTheta(i, y), R = ringR(y);
      pts.push(V(Math.cos(th) * R, y, Math.sin(th) * R));
      radii.push(strandR(y));
    }
    // limb: one smooth arc straight out along the strand's own angle and gently up. Every limb
    // gets the same rise (a hair of variation only), so the nine read as one even crown rhythm
    // and none of them swings sideways across its neighbour.
    const tilt = 0.42 + (rand() - 0.5) * 0.06;
    let R = ringR(TRUNK.top), y = TRUNK.top;
    const th = strandTheta(i, TRUNK.top);
    const r0 = strandR(TRUNK.top);
    for (let s = 1; s <= 6; s++) {
      R += 48 * (1.25 - tilt * 0.45);
      y += 20 + tilt * 20 - s * 3.2;
      pts.push(V(Math.cos(th) * R, y, Math.sin(th) * R));
      radii.push(r0 * (1 - s * 0.115));
      if (s === 3) limbMids.push({ p: pts[pts.length - 1].clone(), th, r: radii[radii.length - 1] });
    }
    const { geo, curve } = buildTube(pts, radii, 320, 96, { knob: 0.12, groove: 0.12, flutes: 9, phase: i * 1.3, freq: 0.012 });
    const mesh = new THREE.Mesh(geo, barkMat);
    mesh.name = `strand-${i}`;
    mesh.castShadow = mesh.receiveShadow = true;
    group.add(mesh);
    limbEnds.push({ p: curve.getPointAt(1), d: curve.getTangentAt(1), r: radii[radii.length - 1] });
  }

  buildWall(group, barkMat);

  const rr = [26, 21, 16, 12, 8.5, 6, 3.8];
  for (let i = 0; i < TRUNK.strands; i++) {
    const pts = [];
    let th = strandTheta(i, 0);
    for (let k = 0; k < rr.length; k++) {
      const R = ringR(0) - 8 + k * (25 + rand() * 5);
      th += (rand() - 0.5) * 0.02;
      pts.push(V(Math.cos(th) * R, 6 - k * 3 - (k > 3 ? 2 : 0), Math.sin(th) * R));
    }
    const { geo } = buildTube(pts, rr, 90, 48, { knob: 0.12, groove: 0.1, flutes: 5, phase: i, freq: 0.03 });
    const mesh = new THREE.Mesh(geo, barkMat);
    mesh.name = `root-${i}`;
    mesh.castShadow = mesh.receiveShadow = true;
    group.add(mesh);
    rootMeshes.push(mesh);
    for (let k = 0; k < pts.length - 1; k++) rootSegs.push({ a: pts[k], b: pts[k + 1], ra: rr[k], rb: rr[k + 1] });
  }

  return { limbEnds, limbMids, rootMeshes, rootSegs };
}

// The wood that grew between the strands: a knobbly sleeve along the strands' centre line that
// fills the gaps, so from outside the trunk reads as one solid, fluted column and the hollow
// stays hidden. Left open: an arch at the foot of every gap (the ground entrances, ~28 m tall)
// and a window where each top bridge leaves for its lookout.
function buildWall(group, barkMat) {
  const COLS = 324, Y0 = 30, Y1 = TRUNK.top + 2, DY = 4;   // stops under the limbs, no rim above the strands
  const rows = Math.ceil((Y1 - Y0) / DY) + 1;            // row 0 is the arch line
  const angDist = (a, b) => Math.abs(Math.atan2(Math.sin(a - b), Math.cos(a - b)));
  const nearestGap = (a, y) => Math.min(...gapAngles(y).map((g) => angDist(a, g)));
  const archY = (a) => {                                  // high over the gap centre, low inside the strands
    const d = nearestGap(a, 20) * ringR(20);
    const t = Math.min(d / 13, 1);
    return 28 - 22 * t * t;
  };
  const rep = Math.round((TAU * ringR(150)) / BARK_TILE);
  const pos = [], uv = [], idx = [], open = [];
  for (let i = 0; i < rows; i++) {
    for (let j = 0; j <= COLS; j++) {
      const a = (j / COLS) * TAU;
      const y = i === 0 ? archY(a) : Math.min(Y0 + (i - 1) * DY + 2, Y1);
      const x0 = Math.cos(a), z0 = Math.sin(a);
      // lumps and vertical grooves, slightly recessed between the strands
      let r = ringR(y) * 0.985 * (1 + 0.05 * (fbm(x0 * 3 + 9, y * 0.02, z0 * 3) - 0.5) * 2);
      r *= 1 - 0.035 * Math.pow(Math.abs(Math.sin(a * 60 + y * 0.01)), 0.7);
      pos.push(x0 * r, y, z0 * r);
      uv.push((j / COLS) * rep, y / BARK_TILE);
      // the top-bridge windows: about 16 m wide, from just under the deck to 13 m over it
      open.push(y > RAMP.top - 4 && y < RAMP.top + 13 && TOP_BRIDGES.some((b) => angDist(a, b) * r < 8));
    }
  }
  for (let i = 0; i < rows - 1; i++) {
    for (let j = 0; j < COLS; j++) {
      const a = i * (COLS + 1) + j, b = a + COLS + 1;
      if (open[a] || open[a + 1] || open[b] || open[b + 1]) continue;
      idx.push(a, b, a + 1, b, b + 1, a + 1);   // outward-facing
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  // seen from both sides (from the galleries you look out at it), same wind sway as the bark
  const mat = barkMat.clone();
  mat.side = THREE.DoubleSide;
  mat.onBeforeCompile = barkMat.onBeforeCompile;
  mat.customProgramCacheKey = barkMat.customProgramCacheKey;
  const mesh = new THREE.Mesh(geo, mat);
  mesh.name = 'trunk-wall';
  mesh.receiveShadow = true;   // casts none, so the hollow keeps the light it had through the gaps
  group.add(mesh);
}

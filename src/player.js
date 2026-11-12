// First-person walker. Movement is resolved against analytic shapes (trunk strands, roots)
// and a downward ray onto walkable meshes, so it costs a few hundred operations per frame.
import * as THREE from 'three';
import { TRUNK, ringR, strandR, strandTheta } from './tree/layout.js';

const EYE = 1.65;          // m above the feet
const STEP_PROBE = 0.9;    // the down-ray starts this far above the feet: max step-up height
const EDGE_DROP = 0.7;     // refuse a move that would drop further than this off a raised walkway
const BODY = 0.3;          // player radius in metres
const PITCH_LIMIT = THREE.MathUtils.degToRad(80);
const WALK = 4.2, RUN = 9;  // m/s
const GRAVITY = 22;

export function createWalker({ walkables, rootMeshes, rootSegs }) {
  const state = { x: 0, z: 0, feet: 0, vy: 0, yaw: 0, pitch: 0, moving: false, running: false };
  const ray = new THREE.Raycaster();
  ray.ray.direction.set(0, -1, 0);
  ray.far = 80;
  const floorMeshes = walkables.concat(rootMeshes);

  function floorAt(x, z, feet) {
    ray.ray.origin.set(x, feet + STEP_PROBE, z);
    const hits = ray.intersectObjects(floorMeshes, false);
    return hits.length ? Math.max(hits[0].point.y, 0) : 0;
  }

  function pushOut(cx, cz, r) {
    const dx = state.x - cx, dz = state.z - cz, d = Math.hypot(dx, dz);
    if (d < r && d > 1e-4) { state.x = cx + (dx / d) * r; state.z = cz + (dz / d) * r; }
  }

  function collide() {
    const y = Math.max(state.feet + 0.9, 0);
    if (y < TRUNK.top + 1) {
      for (let i = 0; i < TRUNK.strands; i++) {
        const th = strandTheta(i, y), R = ringR(y);
        pushOut(Math.cos(th) * R, Math.sin(th) * R, strandR(y) * 1.06 + BODY);
      }
    }
    for (const s of rootSegs) {
      const bx = s.b.x - s.a.x, bz = s.b.z - s.a.z;
      const t = Math.max(0, Math.min(1, ((state.x - s.a.x) * bx + (state.z - s.a.z) * bz) / (bx * bx + bz * bz)));
      const r = s.ra + (s.rb - s.ra) * t;
      const top = s.a.y + (s.b.y - s.a.y) * t + r;
      if (top > state.feet + 1.0) pushOut(s.a.x + bx * t, s.a.z + bz * t, r * 0.95 + BODY); // too tall to step onto
    }
  }

  function teleport(spot) {
    Object.assign(state, { x: spot.x, z: spot.z, feet: spot.feet, vy: 0, yaw: spot.yaw, pitch: spot.pitch });
  }

  function look(dx, dy) {
    state.yaw -= dx;
    state.pitch = THREE.MathUtils.clamp(state.pitch - dy, -PITCH_LIMIT, PITCH_LIMIT);
  }

  // input: { forward, right } in [-1, 1], run: boolean
  function update(dt, input) {
    let f = input.forward, r = input.right;
    const mag = Math.hypot(f, r);
    if (mag > 1) { f /= mag; r /= mag; }
    state.moving = mag > 0.1;
    state.running = input.run;
    const speed = (input.run ? RUN : WALK) * dt;
    const sy = Math.sin(state.yaw), cy = Math.cos(state.yaw);
    const mx = (-sy * f + cy * r) * speed, mz = (-cy * f - sy * r) * speed;
    const raised = state.feet > 0.6;
    const allowed = (x, z) => !(raised && floorAt(x, z, state.feet) < state.feet - EDGE_DROP);
    if (mx && allowed(state.x + mx, state.z)) state.x += mx; // per-axis so you slide along rails
    if (mz && allowed(state.x, state.z + mz)) state.z += mz;
    collide();

    const floor = floorAt(state.x, state.z, state.feet);
    if (floor >= state.feet - 0.35 && state.vy <= 0) {
      state.feet = floor; state.vy = 0;        // walk up and down ramps without hopping
    } else {
      state.vy -= GRAVITY * dt;
      state.feet += state.vy * dt;
      if (state.feet <= floor) { state.feet = floor; state.vy = 0; }
    }
    const d = Math.hypot(state.x, state.z);
    if (d > 400) { state.x *= 400 / d; state.z *= 400 / d; }
  }

  function applyToCamera(camera, time) {
    const bob = state.moving && state.vy === 0 ? Math.sin(time * (state.running ? 13 : 9)) * 0.035 : 0;
    camera.position.set(state.x, state.feet + EYE + bob, state.z);
    camera.rotation.set(state.pitch, state.yaw, 0, 'YXZ');
  }

  return { state, update, teleport, look, applyToCamera, floorAt };
}

// First-person walker (and flyer). Movement is resolved against analytic shapes (trunk
// strands, roots, the planet) and a downward ray onto walkable meshes.
//
// Player metrics (level-design skill: size the world from these, not from guesses):
//   step-up 0.9 m · edge guard 0.7 m · body radius 0.3 m · eye 1.65 m
//   walk 6 m/s · run 18 m/s · fly 40 m/s (fast 140 m/s)
// The steepest walkway (hanging bridge ends) rises 0.25 m per metre, the ramp 0.17 m per metre:
// at run speed and a 0.05 s step that is <= 0.23 m of climb per step, well under the step-up.
import * as THREE from 'three';
import { TRUNK, PLANET, ringR, strandR, strandTheta } from './tree/layout.js';

export const METRICS = { eye: 1.65, step: 0.9, edgeDrop: 0.7, body: 0.3, walk: 6, run: 18, fly: 40, flyFast: 140 };
const PITCH_LIMIT = THREE.MathUtils.degToRad(80);
const GRAVITY = 22;
const WORLD_RADIUS = 3000;

export function createWalker({ walkables, rootMeshes, rootSegs }) {
  const state = { x: 0, z: 0, feet: 0, vy: 0, yaw: 0, pitch: 0, moving: false, running: false, flying: false };
  const ray = new THREE.Raycaster();
  ray.ray.direction.set(0, -1, 0);
  ray.far = 400;
  const floorMeshes = walkables.concat(rootMeshes);

  function floorAt(x, z, feet) {
    ray.ray.origin.set(x, feet + METRICS.step, z);
    const hits = ray.intersectObjects(floorMeshes, false);
    return hits.length ? Math.max(hits[0].point.y, 0) : 0;
  }

  function pushOut(cx, cz, r) {
    const dx = state.x - cx, dz = state.z - cz, d = Math.hypot(dx, dz);
    if (d < r && d > 1e-4) { state.x = cx + (dx / d) * r; state.z = cz + (dz / d) * r; }
  }

  function collide() {
    const y = Math.max(state.feet + 0.9, 0);
    if (y < TRUNK.top + 5) {
      for (let i = 0; i < TRUNK.strands; i++) {
        const th = strandTheta(i, y), R = ringR(y);
        pushOut(Math.cos(th) * R, Math.sin(th) * R, strandR(y) * 1.04 + METRICS.body);
      }
    }
    for (const s of rootSegs) {
      const bx = s.b.x - s.a.x, bz = s.b.z - s.a.z;
      const t = Math.max(0, Math.min(1, ((state.x - s.a.x) * bx + (state.z - s.a.z) * bz) / (bx * bx + bz * bz)));
      const r = s.ra + (s.rb - s.ra) * t;
      const top = s.a.y + (s.b.y - s.a.y) * t + r;
      if (top > state.feet + 1.0 && state.feet < top) pushOut(s.a.x + bx * t, s.a.z + bz * t, r * 0.95 + METRICS.body);
    }
    // the planet is solid
    const eyeY = state.feet + METRICS.eye;
    const dx = state.x, dy = eyeY - PLANET.y, dz = state.z;
    const d = Math.hypot(dx, dy, dz), min = PLANET.radius * 1.03 + 1;
    if (d < min && d > 1e-4) {
      state.x = (dx / d) * min; state.z = (dz / d) * min;
      state.feet = PLANET.y + (dy / d) * min - METRICS.eye;
    }
  }

  function teleport(spot) {
    Object.assign(state, { x: spot.x, z: spot.z, feet: spot.feet, vy: 0, yaw: spot.yaw, pitch: spot.pitch });
  }

  function look(dx, dy) {
    state.yaw -= dx;
    state.pitch = THREE.MathUtils.clamp(state.pitch - dy, -PITCH_LIMIT, PITCH_LIMIT);
  }

  function setFlying(on) {
    state.flying = on;
    state.vy = 0;
  }

  // input: { forward, right, up, run }, each axis in [-1, 1]
  function update(dt, input) {
    let f = input.forward, r = input.right;
    const mag = Math.hypot(f, r);
    if (mag > 1) { f /= mag; r /= mag; }
    state.moving = mag > 0.1;
    state.running = input.run;
    const sy = Math.sin(state.yaw), cy = Math.cos(state.yaw);

    if (state.flying) {
      // fly where you look; up/down keys move straight up and down
      const speed = (input.run ? METRICS.flyFast : METRICS.fly) * dt;
      const cp = Math.cos(state.pitch), sp = Math.sin(state.pitch);
      state.x += (-sy * cp * f + cy * r) * speed;
      state.z += (-cy * cp * f - sy * r) * speed;
      state.feet += (sp * f + input.up) * speed;
      collide();
      state.feet = Math.max(state.feet, floorAt(state.x, state.z, state.feet), 0);
    } else {
      const speed = (input.run ? METRICS.run : METRICS.walk) * dt;
      const mx = (-sy * f + cy * r) * speed, mz = (-cy * f - sy * r) * speed;
      const raised = state.feet > 0.6;
      const allowed = (x, z) => !(raised && floorAt(x, z, state.feet) < state.feet - METRICS.edgeDrop);
      if (mx && allowed(state.x + mx, state.z)) state.x += mx; // per axis so you slide along rails
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
    }
    const d = Math.hypot(state.x, state.z);
    if (d > WORLD_RADIUS) { state.x *= WORLD_RADIUS / d; state.z *= WORLD_RADIUS / d; }
    state.feet = Math.min(state.feet, 1500);
  }

  function applyToCamera(camera, time) {
    const bob = !state.flying && state.moving && state.vy === 0 ? Math.sin(time * (state.running ? 13 : 9)) * 0.035 : 0;
    camera.position.set(state.x, state.feet + METRICS.eye + bob, state.z);
    camera.rotation.set(state.pitch, state.yaw, 0, 'YXZ');
  }

  return { state, update, teleport, look, setFlying, applyToCamera, floorAt };
}

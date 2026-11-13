// The explorer's movement (walking and flying) and the third-person camera that follows it.
// Movement is resolved against analytic shapes (trunk strands, roots, the floors between
// levels) and a downward ray onto walkable meshes.
//
// Camera (camera-systems skill): yaw and pitch orbit a pivot at the explorer's shoulders,
// pitch is clamped (-80° to +50°), a spring arm pulls the camera in when the line from the
// pivot hits a trunk strand, a floor or a ceiling, and every follow uses 1 - exp(-rate * dt)
// so it feels the same at any frame rate.
//
// Player metrics (level-design skill: size the world from these, not from guesses):
//   step-up 0.9 m · edge guard 0.7 m · body radius 0.3 m · eye 1.65 m
//   walk 6 m/s · run 18 m/s · fly 40 m/s (fast 140 m/s)
// The steepest walkway (hanging bridge ends) rises 0.25 m per metre, the ramp 0.17 m per metre:
// at run speed and a 0.05 s step that is <= 0.23 m of climb per step, well under the step-up.
import * as THREE from 'three';
import { TRUNK, BIOMES, DISK_R, SLAB, ringR, strandR, strandTheta } from './tree/layout.js';

export const METRICS = { eye: 1.65, step: 0.9, edgeDrop: 0.7, body: 0.3, walk: 6, run: 18, fly: 40, flyFast: 140 };
const PITCH_MIN = THREE.MathUtils.degToRad(-80), PITCH_MAX = THREE.MathUtils.degToRad(50);
const ZOOM = { min: 2, max: 16, start: 6 };
const PIVOT = 1.55; // m above the feet: shoulder height
const GRAVITY = 22;
const WORLD_RADIUS = 3000;

export function createWalker({ walkables, rootMeshes, rootSegs, noGo = [] }) {
  const state = { x: 0, z: 0, feet: 0, vy: 0, yaw: 0, pitch: 0, moving: false, running: false, flying: false, speed: 0, moveYaw: null, zoom: ZOOM.start };
  const cam = { pivot: new THREE.Vector3(), dist: ZOOM.start, ready: false };
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
  }

  // Flying must not pass through the floors between ecosystems: stop under a slab when
  // rising into it (falling onto it is already handled by the floor ray).
  function blockSlabs(prevFeet) {
    if (Math.hypot(state.x, state.z) > DISK_R + 1) return;
    const head = state.feet + METRICS.eye + 0.3, prevHead = prevFeet + METRICS.eye + 0.3;
    for (const b of BIOMES) {
      const under = b.level - SLAB;
      if (b.level > 0 && prevHead <= under + 0.01 && head > under) state.feet = under - METRICS.eye - 0.3;
    }
  }

  function teleport(spot) {
    Object.assign(state, { x: spot.x, z: spot.z, feet: spot.feet, vy: 0, yaw: spot.yaw, pitch: spot.pitch });
    cam.ready = false; // hard cut: no smoothing across the map
  }

  function zoom(delta) {
    state.zoom = THREE.MathUtils.clamp(state.zoom * Math.exp(delta), ZOOM.min, ZOOM.max);
  }

  function look(dx, dy) {
    state.yaw -= dx;
    state.pitch = THREE.MathUtils.clamp(state.pitch - dy, PITCH_MIN, PITCH_MAX);
  }

  function setFlying(on) {
    state.flying = on;
    state.vy = 0;
  }

  // input: { forward, right, up, run }, each axis in [-1, 1]
  function update(dt, input) {
    const x0 = state.x, z0 = state.z;
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
      const prevFeet = state.feet;
      state.feet += (sp * f + input.up) * speed;
      collide();
      blockSlabs(prevFeet);
      state.feet = Math.max(state.feet, floorAt(state.x, state.z, state.feet), 0);
    } else {
      const speed = (input.run ? METRICS.run : METRICS.walk) * dt;
      const mx = (-sy * f + cy * r) * speed, mz = (-cy * f - sy * r) * speed;
      const raised = state.feet > 0.6;
      // refuse a step that drops off a raised walkway or lands in a no-go area (deep water)
      const allowed = (x, z) => {
        const fl = floorAt(x, z, state.feet);
        if (raised && fl < state.feet - METRICS.edgeDrop) return false;
        return !noGo.some((f) => f(x, z, fl));
      };
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
    // what the character animation needs: how fast and which way it actually moved
    const mx = state.x - x0, mz = state.z - z0, moved = Math.hypot(mx, mz);
    state.speed = dt > 0 ? moved / dt : 0;
    state.moveYaw = moved > 1e-4 ? Math.atan2(-mx, -mz) : null;
  }

  // Is this camera point inside something solid?
  function blocked(p, pivotY) {
    const r = Math.hypot(p.x, p.z);
    if (p.y < TRUNK.top + 5) {
      for (let i = 0; i < TRUNK.strands; i++) {
        const th = strandTheta(i, p.y), R = ringR(p.y);
        if (Math.hypot(p.x - Math.cos(th) * R, p.z - Math.sin(th) * R) < strandR(p.y) * 1.04 + 0.3) return true;
      }
    }
    if (r < DISK_R + 1) {
      for (const b of BIOMES) {
        if (b.level === 0) continue;
        const under = b.level - SLAB;
        if (pivotY < under && p.y > under - 0.4) return true;              // ceiling of this level
        if (pivotY >= b.level && p.y < b.level + 0.2) return true;          // below this floor
      }
    }
    return p.y < floorAt(p.x, p.z, pivotY - METRICS.step) + 0.35;
  }

  const look3 = new THREE.Vector3(), want = new THREE.Vector3(), probe = new THREE.Vector3();
  function applyToCamera(camera, time, dt) {
    const target = want.set(state.x, state.feet + PIVOT, state.z);
    if (!cam.ready) { cam.pivot.copy(target); cam.dist = state.zoom; cam.ready = true; }
    cam.pivot.lerp(target, 1 - Math.exp(-14 * dt)); // soften steps and ramps
    // view direction from yaw/pitch (the same convention as movement)
    const cp = Math.cos(state.pitch);
    look3.set(-Math.sin(state.yaw) * cp, Math.sin(state.pitch), -Math.cos(state.yaw) * cp);
    // spring arm: walk out from the pivot and stop before the first solid sample
    let free = state.zoom;
    const N = 8;
    for (let k = 1; k <= N; k++) {
      const d = (k / N) * state.zoom;
      probe.copy(cam.pivot).addScaledVector(look3, -d);
      if (blocked(probe, cam.pivot.y)) { free = Math.max(0.5, d - state.zoom / N); break; }
    }
    // pull in at once when blocked, ease back out when clear
    cam.dist = free < cam.dist ? free : cam.dist + (free - cam.dist) * (1 - Math.exp(-4 * dt));
    camera.position.copy(cam.pivot).addScaledVector(look3, -cam.dist);
    camera.rotation.set(state.pitch, state.yaw, 0, 'YXZ');
  }

  return { state, update, teleport, look, zoom, setFlying, applyToCamera, floorAt };
}

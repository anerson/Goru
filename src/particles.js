// Leaves drifting down from the crown.
// Simulation state lives in plain arrays; the meshes are only a view of it.
import * as THREE from 'three';

const FALL = 400;

export function createParticles(scene, leafGeo, leafMat, tipPoints) {
  const falling = new THREE.InstancedMesh(leafGeo, leafMat, FALL);
  falling.frustumCulled = false;
  const tones = ['#56643b', '#8f8a4a', '#a28a45', '#6e7a50'].map((h) => new THREE.Color(h));
  const state = [];

  function reset(f, anywhere) {
    const tip = tipPoints[(Math.random() * tipPoints.length) | 0];
    f.p.copy(tip).add(new THREE.Vector3((Math.random() - 0.5) * 30, (Math.random() - 0.5) * 20, (Math.random() - 0.5) * 30));
    if (anywhere) f.p.y = Math.random() * tip.y;
    f.v = 3 + Math.random() * 3;
    f.ph = Math.random() * 10;
    f.spin.set(Math.random() * 2, Math.random() * 2, Math.random() * 2);
    f.rest = 0;
  }
  for (let i = 0; i < FALL; i++) {
    const f = { p: new THREE.Vector3(), r: new THREE.Euler(), spin: new THREE.Vector3() };
    reset(f, true);
    state.push(f);
    falling.setColorAt(i, tones[i % tones.length]);
  }
  scene.add(falling);

  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), scale = new THREE.Vector3(3, 3, 3);

  return function update(dt, t, wind) {
    const gust = 1 + wind * 4;
    for (let i = 0; i < FALL; i++) {
      const f = state[i];
      if (f.p.y > 0.08) {
        f.p.y -= f.v * dt;
        f.p.x += (Math.sin(t * 0.9 + f.ph) * 2.5 + gust) * dt;
        f.p.z += Math.cos(t * 0.8 + f.ph * 1.7) * 2.5 * dt;
        f.r.x += f.spin.x * dt; f.r.y += f.spin.y * dt; f.r.z += f.spin.z * dt;
      } else {
        f.p.y = 0.08; f.r.x = -Math.PI / 2;
        f.rest += dt;
        if (f.rest > 8 + f.ph) reset(f, false);
      }
      falling.setMatrixAt(i, m4.compose(f.p, q.setFromEuler(f.r), scale));
    }
    falling.instanceMatrix.needsUpdate = true;

  };
}

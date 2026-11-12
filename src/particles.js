// Leaves drifting down from the canopy and dust motes hanging in the light.
// Simulation state lives in plain arrays; the meshes are only a view of it.
import * as THREE from 'three';

const FALL = 200;
const MOTES = 500;

export function createParticles(scene, leafGeo, leafMat, tipPoints) {
  const falling = new THREE.InstancedMesh(leafGeo, leafMat, FALL);
  falling.frustumCulled = false;
  const tones = ['#56643b', '#8f8a4a', '#a28a45', '#6e7a50'].map((h) => new THREE.Color(h));
  const state = [];

  function reset(f, anywhere) {
    const tip = tipPoints[(Math.random() * tipPoints.length) | 0];
    f.p.copy(tip).add(new THREE.Vector3((Math.random() - 0.5) * 6, (Math.random() - 0.5) * 4, (Math.random() - 0.5) * 6));
    if (anywhere) f.p.y = Math.random() * tip.y;
    f.v = 1.6 + Math.random() * 2;
    f.ph = Math.random() * 10;
    f.spin.set(Math.random() * 3, Math.random() * 3, Math.random() * 3);
    f.rest = 0;
  }
  for (let i = 0; i < FALL; i++) {
    const f = { p: new THREE.Vector3(), r: new THREE.Euler(), spin: new THREE.Vector3() };
    reset(f, true);
    state.push(f);
    falling.setColorAt(i, tones[i % tones.length]);
  }
  scene.add(falling);

  const moteGeo = new THREE.BufferGeometry();
  moteGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(MOTES * 3), 3));
  const base = [];
  for (let i = 0; i < MOTES; i++) {
    const inside = i < 200; // a denser cloud inside the hollow, where the lanterns light it
    const an = Math.random() * Math.PI * 2, r = Math.random() * (inside ? 9 : 70);
    base.push([Math.cos(an) * r, 1 + Math.random() * (inside ? 38 : 70), Math.sin(an) * r, Math.random() * 10]);
  }
  const motes = new THREE.Points(moteGeo, new THREE.PointsMaterial({
    color: 0xffe0a0, size: 0.06, transparent: true, opacity: 0.7, blending: THREE.AdditiveBlending, depthWrite: false,
  }));
  motes.frustumCulled = false;
  scene.add(motes);

  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), scale = new THREE.Vector3(1.3, 1.3, 1.3);

  return function update(dt, t, wind) {
    const gust = 0.4 + wind * 1.6;
    for (let i = 0; i < FALL; i++) {
      const f = state[i];
      if (f.p.y > 0.05) {
        f.p.y -= f.v * dt;
        f.p.x += (Math.sin(t * 1.3 + f.ph) * 1.1 + gust) * dt;
        f.p.z += Math.cos(t * 1.1 + f.ph * 1.7) * 1.1 * dt;
        f.r.x += f.spin.x * dt; f.r.y += f.spin.y * dt; f.r.z += f.spin.z * dt;
      } else {
        f.p.y = 0.05; f.r.x = -Math.PI / 2;
        f.rest += dt;
        if (f.rest > 6 + f.ph) reset(f, false);
      }
      falling.setMatrixAt(i, m4.compose(f.p, q.setFromEuler(f.r), scale));
    }
    falling.instanceMatrix.needsUpdate = true;

    const mp = moteGeo.attributes.position.array;
    for (let i = 0; i < MOTES; i++) {
      const b = base[i];
      mp[i * 3] = b[0] + Math.sin(t * 0.3 + b[3]) * 1.5;
      mp[i * 3 + 1] = b[1] + Math.sin(t * 0.21 + b[3] * 2) * 1.2;
      mp[i * 3 + 2] = b[2] + Math.cos(t * 0.27 + b[3]) * 1.5;
    }
    moteGeo.attributes.position.needsUpdate = true;
  };
}

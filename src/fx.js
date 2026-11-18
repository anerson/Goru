// Particles for feedback (game-feel): sparks on hits, bursts on kills, sparkles on pickups,
// a rising ring when the explorer levels up, a column of light on a new weapon. One pooled
// InstancedMesh with additive blending and per-instance colour: a single draw call.
import * as THREE from 'three';

const MAX = 600;
export function createFx(scene, reduceMotion = false) {
  const geo = new THREE.OctahedronGeometry(0.09, 0);
  const mat = new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending, depthWrite: false });
  const mesh = new THREE.InstancedMesh(geo, mat, MAX);
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  mesh.frustumCulled = false;
  mesh.setColorAt(0, new THREE.Color('#ffffff'));   // create the colour buffer before the first compile
  mesh.count = 0;
  scene.add(mesh);
  const parts = [];
  const col = new THREE.Color(), m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), p = new THREE.Vector3();
  const scale = reduceMotion ? 0.5 : 1;

  // rings (level up, crafting): expanding torus that fades
  const rings = [];
  function ring(pos, color, radius = 4, life = 0.8) {
    const r = new THREE.Mesh(new THREE.TorusGeometry(1, 0.06, 6, 48).rotateX(Math.PI / 2), new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(2), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
    r.position.copy(pos);
    scene.add(r);
    rings.push({ r, t: 0, life, radius });
  }

  function emit(pos, { n = 12, color = '#ffd76a', speed = 5, up = 2, life = 0.6, size = 1, gravity = 9, spread = 1, rise = 0 } = {}) {
    n = Math.round(n * scale);
    for (let i = 0; i < n && parts.length < MAX; i++) {
      const a = Math.random() * Math.PI * 2, e = (Math.random() - 0.3) * spread;
      const v = speed * (0.4 + Math.random() * 0.6);
      parts.push({
        x: pos.x, y: pos.y, z: pos.z,
        vx: Math.cos(a) * v * Math.cos(e), vy: up + Math.random() * up + rise, vz: Math.sin(a) * v * Math.cos(e),
        t: 0, life: life * (0.6 + Math.random() * 0.6), size: size * (0.6 + Math.random() * 0.8), gravity,
        color: new THREE.Color(color).multiplyScalar(1.6),
      });
    }
  }

  const fx = {
    hit: (pos, big) => emit(pos, { n: big ? 22 : 10, color: big ? '#ffcf4a' : '#fff2c8', speed: big ? 7 : 5, life: 0.4 }),
    crit: (pos) => { emit(pos, { n: 30, color: '#ffd76a', speed: 9, life: 0.55, size: 1.4 }); emit(pos, { n: 12, color: '#ffffff', speed: 4, life: 0.3 }); },
    kill: (pos, color = '#ff9a6a') => { emit(pos, { n: 34, color, speed: 6, up: 3, life: 0.9, size: 1.3 }); emit(pos, { n: 14, color: '#ffffff', speed: 3, up: 4, life: 0.6 }); },
    pickup: (pos, color = '#9dffcf') => emit(pos, { n: 14, color, speed: 1.5, up: 1.5, rise: 2, gravity: -1, life: 0.9, size: 0.8 }),
    quest: (pos) => { emit(pos, { n: 26, color: '#ffd76a', speed: 2, up: 2, rise: 3, gravity: -2, life: 1.2 }); ring(pos, '#ffd76a', 3, 0.7); },
    levelUp: (pos) => { ring(pos, '#ffd76a', 7, 1.1); ring(pos.clone().setY(pos.y + 1), '#9dffcf', 5, 1.3); emit(pos, { n: 60, color: '#ffd76a', speed: 3, up: 3, rise: 5, gravity: -2, life: 1.6, size: 1.2 }); },
    craft: (pos) => { ring(pos, '#ffcf4a', 3, 0.6); emit(pos, { n: 40, color: '#ffb347', speed: 6, up: 4, life: 0.8 }); emit(pos, { n: 30, color: '#ffffff', speed: 1, up: 1, rise: 8, gravity: -3, life: 1.5, spread: 0.2 }); },
    chest: (pos, color) => { ring(pos, color, 4, 0.9); emit(pos, { n: 50, color, speed: 3, up: 5, rise: 4, gravity: -1, life: 1.6, size: 1.2 }); },
    dodge: (pos) => emit(pos, { n: 10, color: '#9dffcf', speed: 2, up: 0.5, life: 0.4, gravity: 0 }),
    yield: (pos) => { ring(pos, '#9dffcf', 8, 1.4); emit(pos, { n: 50, color: '#9dffcf', speed: 2, up: 2, rise: 3, gravity: -1, life: 2 }); },
    ring,
    // free-form bursts for ability effects
    burst: (pos, o) => emit(pos, o),
    update(dt) {
      let k = 0;
      for (let i = parts.length - 1; i >= 0; i--) {
        const P = parts[i];
        P.t += dt;
        if (P.t >= P.life) { parts.splice(i, 1); continue; }
        P.vy -= P.gravity * dt;
        P.x += P.vx * dt; P.y += P.vy * dt; P.z += P.vz * dt;
        P.vx *= 1 - 2 * dt; P.vz *= 1 - 2 * dt;
        const f = 1 - P.t / P.life;
        s.setScalar(P.size * f + 0.001);
        m4.compose(p.set(P.x, P.y, P.z), q, s);
        mesh.setMatrixAt(k, m4);
        mesh.setColorAt(k, col.copy(P.color).multiplyScalar(f));
        k++;
      }
      mesh.count = k;
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
      for (let i = rings.length - 1; i >= 0; i--) {
        const R = rings[i];
        R.t += dt;
        const f = R.t / R.life;
        if (f >= 1) { scene.remove(R.r); R.r.geometry.dispose(); R.r.material.dispose(); rings.splice(i, 1); continue; }
        R.r.scale.setScalar(0.3 + R.radius * (1 - (1 - f) ** 3));
        R.r.material.opacity = 1 - f;
      }
    },
  };
  return fx;
}

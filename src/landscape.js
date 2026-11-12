// Dry Mediterranean ground, distant hills, grass, ordinary-sized olive trees and people.
// The normal trees (6-8 m) and the people (1.8 m) are there to make the giant read as giant.
import * as THREE from 'three';
import { fbm, mulberry32 } from './noise.js';
import { SEED, TAU, RAMP, thetaEntrance, thetaBridge, rampAt } from './tree/layout.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const angDist = (a, b) => Math.abs(Math.atan2(Math.sin(a - b), Math.cos(a - b)));

export function buildLandscape(scene, mats, tex) {
  const rand = mulberry32(SEED + 4);

  // ground with large-scale colour variation baked into vertex colours
  const gg = new THREE.CircleGeometry(900, 160);
  gg.rotateX(-Math.PI / 2);
  const pos = gg.attributes.position, cols = [];
  const a = new THREE.Color('#7d7a43'), b = new THREE.Color('#a39552'), c = new THREE.Color('#5d6534');
  const shade = new THREE.Color('#5a5435'), tmp = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), z = pos.getZ(i);
    const n = fbm(x * 0.01 + 7, 0, z * 0.01) * 2 - 1;
    tmp.copy(a).lerp(n > 0 ? b : c, Math.min(Math.abs(n) * 1.4, 1));
    const d = Math.hypot(x, z);
    if (d < 60) tmp.lerp(shade, (1 - d / 60) * 0.5);
    cols.push(tmp.r, tmp.g, tmp.b);
  }
  gg.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3));
  const ground = new THREE.Mesh(gg, new THREE.MeshStandardMaterial({ vertexColors: true, map: tex.groundDetail, roughness: 1 }));
  ground.name = 'ground';
  ground.receiveShadow = true;
  scene.add(ground);

  const hillMat = new THREE.MeshStandardMaterial({ color: '#6b6a3d', roughness: 1 });
  for (let i = 0; i < 16; i++) {
    const an = (i / 16) * TAU + rand() * 0.3, r = 560 + rand() * 260, s = 80 + rand() * 120;
    const h = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 12), hillMat);
    h.scale.set(s * 1.8, s * (0.3 + rand() * 0.3), s);
    h.position.set(Math.cos(an) * r, -s * 0.12, Math.sin(an) * r);
    h.rotation.y = rand() * 3;
    scene.add(h);
  }

  // dry grass blades, kept off the trail
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), sc = V(1, 1, 1), p = V(0, 0, 0);
  const N = 9000;
  const grass = new THREE.InstancedMesh(new THREE.ConeGeometry(0.06, 1, 3).translate(0, 0.5, 0), new THREE.MeshStandardMaterial({ roughness: 1 }), N);
  const ga = new THREE.Color('#8e8a48'), gb = new THREE.Color('#c2ae6a'), col = new THREE.Color();
  for (let gi = 0; gi < N;) {
    const an = rand() * TAU, r = 17 + Math.pow(rand(), 0.7) * 190;
    if (angDist(an, thetaEntrance) * r < 2.6 && r < 100) continue;
    p.set(Math.cos(an) * r, 0, Math.sin(an) * r);
    q.setFromEuler(e.set((rand() - 0.5) * 0.4, rand() * 6, (rand() - 0.5) * 0.4));
    const s = 0.6 + rand() * 0.8;
    grass.setMatrixAt(gi, m4.compose(p, q, sc.set(s, 0.25 + rand() * 0.55, s)));
    grass.setColorAt(gi, col.copy(ga).lerp(gb, rand()));
    gi++;
  }
  grass.receiveShadow = true;
  scene.add(grass);

  // ordinary olive trees for scale
  const small = 28;
  const trunks = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.25, 0.4, 1, 7).translate(0, 0.5, 0), mats.barkStatic, small);
  const crowns = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 1), new THREE.MeshStandardMaterial({ color: '#68724c', roughness: 0.85, flatShading: true }), small * 5);
  let ci = 0;
  for (let i = 0; i < small; i++) {
    let an = rand() * TAU;
    const r = 75 + rand() * 170;
    if (angDist(an, thetaEntrance) < 0.15) an += 0.3;
    const x = Math.cos(an) * r, z = Math.sin(an) * r, h = 2.2 + rand() * 1.2;
    trunks.setMatrixAt(i, m4.compose(V(x, 0, z), q.setFromEuler(e.set((rand() - 0.5) * 0.3, 0, (rand() - 0.5) * 0.3)), sc.set(1, h, 1)));
    for (let k = 0; k < 5; k++) {
      const s = 1.6 + rand() * 1.4;
      crowns.setMatrixAt(ci++, m4.compose(V(x + (rand() - 0.5) * 3.5, h + 1.4 + rand() * 2, z + (rand() - 0.5) * 3.5), q.identity(), sc.set(s * 1.2, s * 0.8, s * 1.2)));
    }
  }
  trunks.castShadow = crowns.castShadow = true;
  scene.add(trunks, crowns);

  // people, 1.8 m tall
  const shirts = ['#b8432f', '#2f6aa3', '#e2c04a', '#f2f2f2', '#6f4c99', '#2e8466'];
  const skin = new THREE.MeshStandardMaterial({ color: '#c99674', roughness: 0.8 });
  const legs = new THREE.MeshStandardMaterial({ color: '#2b2f3a', roughness: 0.9 });
  function person(at, y, face, i) {
    const g = new THREE.Group();
    const l = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.15, 0.85, 8), legs); l.position.y = 0.42;
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.21, 0.19, 0.65, 8), new THREE.MeshStandardMaterial({ color: shirts[i % shirts.length], roughness: 0.9 })); body.position.y = 1.17;
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.14, 12, 8), skin); head.position.y = 1.64;
    for (const m of [l, body, head]) { m.castShadow = true; g.add(m); }
    g.position.set(at.x, y, at.z);
    g.lookAt(face.x, y, face.z);
    scene.add(g);
  }
  const onTrail = (r, da) => V(Math.cos(thetaEntrance + da) * r, 0, Math.sin(thetaEntrance + da) * r);
  const p1 = onTrail(24, 0.06);
  person(p1, 0, V(0, 0, 0), 0);
  person(onTrail(25, -0.05), 0, p1, 1);
  person(onTrail(40, 0.05), 0, V(0, 0, 0), 2);
  person(V(1.5, 0, -1), 0, V(4, 0, 4), 3);
  {
    const { a, y } = rampAt(0.18);
    person(V(Math.cos(a) * 5.9, 0, Math.sin(a) * 5.9), y, V(Math.cos(a + 0.4) * 5.9, 0, Math.sin(a + 0.4) * 5.9), 4);
  }
  {
    const out = V(Math.cos(thetaBridge), 0, Math.sin(thetaBridge)), side = V(-out.z, 0, out.x);
    person(out.clone().multiplyScalar(24.5).addScaledVector(side, 2.4), RAMP.top, out.clone().multiplyScalar(60), 5);
  }
}

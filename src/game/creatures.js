// Creature models built from primitives, with a tiny procedural animation rig:
// legs swing with movement, the body dips for a wind-up, and every material can flash.
// Every creature faces -z, like the explorer, so the same yaw convention applies.
import * as THREE from 'three';

const mat = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.75, ...o });

function rig(root, body, legs, mats, { radius, height, extra = {} }) {
  let phase = 0;
  const base = body.position.y;
  return {
    root, radius, height, ...extra,
    // speed in m/s, windup 0..1 (crouch), dt
    animate(dt, speed, windup = 0) {
      phase += dt * (3 + speed * 1.6);
      const swing = Math.sin(phase) * Math.min(speed / 3, 1) * 0.6;
      legs.forEach((l, i) => { l.rotation.x = (i % 2 ? swing : -swing) + (l.userData.rest ?? 0); });
      body.position.y = base - windup * 0.25 * height + Math.abs(Math.sin(phase)) * 0.03 * Math.min(speed, 1);
      body.rotation.x = -windup * 0.25;
      extra.onAnimate?.(phase, windup);
    },
    flash(k) { for (const m of mats) m.emissiveIntensity = k; },
  };
}

function legPivot(parent, x, y, z, len, rad, m, splay = 0) {
  const p = new THREE.Group();
  p.position.set(x, y, z);
  p.rotation.z = splay;
  const leg = new THREE.Mesh(new THREE.CylinderGeometry(rad, rad * 0.7, len, 6), m);
  leg.position.y = -len / 2;
  leg.castShadow = true;
  p.add(leg);
  parent.add(p);
  return p;
}

// four-legged animals: wolves, big cats
function quadruped({ color, belly, size = 1, snout = true, tail = true }) {
  const root = new THREE.Group();
  const fur = mat(color, { emissive: '#ffffff', emissiveIntensity: 0 });
  const light = mat(belly, { emissive: '#ffffff', emissiveIntensity: 0 });
  const body = new THREE.Group();
  body.position.y = 0.75 * size;
  root.add(body);
  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.28 * size, 0.8 * size, 4, 10), fur);
  torso.rotation.x = Math.PI / 2;
  torso.castShadow = true;
  body.add(torso);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.24 * size, 12, 10), fur);
  head.position.set(0, 0.18 * size, -0.62 * size);
  head.castShadow = true;
  body.add(head);
  if (snout) { const s = new THREE.Mesh(new THREE.ConeGeometry(0.11 * size, 0.3 * size, 8), light); s.rotation.x = -Math.PI / 2; s.position.set(0, 0.12 * size, -0.86 * size); body.add(s); }
  for (const x of [-0.13, 0.13]) { const ear = new THREE.Mesh(new THREE.ConeGeometry(0.06 * size, 0.16 * size, 4), fur); ear.position.set(x * size, 0.42 * size, -0.6 * size); body.add(ear); }
  const eyes = new THREE.MeshBasicMaterial({ color: '#ffcf4a' });
  for (const x of [-0.09, 0.09]) { const e = new THREE.Mesh(new THREE.SphereGeometry(0.03 * size, 6, 6), eyes); e.position.set(x * size, 0.24 * size, -0.82 * size); body.add(e); }
  if (tail) { const t = new THREE.Mesh(new THREE.ConeGeometry(0.07 * size, 0.6 * size, 6), fur); t.rotation.x = Math.PI / 2 + 0.6; t.position.set(0, 0.15 * size, 0.6 * size); body.add(t); }
  const legs = [[-0.16, -0.32], [0.16, -0.32], [-0.16, 0.32], [0.16, 0.32]].map(([x, z]) => legPivot(root, x * size, 0.7 * size, z * size, 0.7 * size, 0.07 * size, fur));
  return rig(root, body, legs, [fur, light], { radius: 0.6 * size, height: 1.1 * size });
}

// insects and arachnids: beetles, spiders, scorpions, the big grub
function arthropod({ color, shell, size = 1, legs: nLegs = 6, pincers = false, stinger = false, mandibles = false, long = 1 }) {
  const root = new THREE.Group();
  const skin = mat(color, { emissive: '#ffffff', emissiveIntensity: 0 });
  const carapace = mat(shell, { roughness: 0.35, emissive: '#ffffff', emissiveIntensity: 0 });
  const body = new THREE.Group();
  body.position.y = 0.45 * size;
  root.add(body);
  const abdomen = new THREE.Mesh(new THREE.SphereGeometry(0.5 * size, 16, 12), carapace);
  abdomen.scale.set(1, 0.6, 1.2 * long);
  abdomen.position.z = 0.25 * size * long;
  abdomen.castShadow = true;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.3 * size, 12, 10), skin);
  head.position.set(0, 0, -0.5 * size * long);
  head.castShadow = true;
  body.add(abdomen, head);
  const eyes = new THREE.MeshBasicMaterial({ color: '#ff3b2f' });
  for (const x of [-0.12, 0.12]) { const e = new THREE.Mesh(new THREE.SphereGeometry(0.05 * size, 6, 6), eyes); e.position.set(x * size, 0.12 * size, -0.74 * size * long); body.add(e); }
  const parts = {};
  if (mandibles || pincers) {
    parts.claws = [-1, 1].map((s) => {
      const p = new THREE.Group();
      p.position.set(s * 0.22 * size, 0, -0.7 * size * long);
      const c = new THREE.Mesh(new THREE.ConeGeometry(0.08 * size, (pincers ? 0.7 : 0.45) * size, 6), carapace);
      c.rotation.x = -Math.PI / 2;
      c.position.z = -0.25 * size;
      p.add(c);
      body.add(p);
      return p;
    });
  }
  if (stinger) {
    let parent = body, z = 0.75 * size * long, y = 0.1 * size;
    parts.tail = [];
    for (let k = 0; k < 5; k++) {
      const seg = new THREE.Group();
      seg.position.set(0, y, z);
      seg.rotation.x = -0.45;
      const m = new THREE.Mesh(new THREE.SphereGeometry((0.16 - k * 0.015) * size, 10, 8), carapace);
      m.castShadow = true;
      seg.add(m);
      parent.add(seg);
      parts.tail.push(seg);
      parent = seg; z = 0.0; y = 0.28 * size;
    }
    const sting = new THREE.Mesh(new THREE.ConeGeometry(0.07 * size, 0.35 * size, 6), mat('#2a1a10'));
    sting.position.set(0, 0.2 * size, -0.1 * size);
    sting.rotation.x = Math.PI * 0.8;
    parent.add(sting);
  }
  const legs = [];
  const per = nLegs / 2;
  for (let i = 0; i < per; i++) {
    for (const s of [-1, 1]) {
      const z = (-0.35 + (i / Math.max(per - 1, 1)) * 0.75) * size * long;
      const l = legPivot(root, s * 0.35 * size, 0.45 * size, z, 0.6 * size, 0.04 * size, skin, s * 0.9);
      l.userData.rest = 0;
      legs.push(l);
    }
  }
  return rig(root, body, legs, [skin, carapace], {
    radius: 0.7 * size * long, height: 0.9 * size,
    extra: {
      onAnimate(phase, windup) {
        if (parts.claws) parts.claws.forEach((c, i) => { c.rotation.y = (i ? -1 : 1) * (0.2 + Math.sin(phase * 2) * 0.15 + windup * 0.5); });
        if (parts.tail) parts.tail.forEach((t, k) => { t.rotation.x = -0.45 - windup * 0.25 * (k + 1) / 5; });
      },
    },
  });
}

export const CREATURES = {
  lobo: { name: 'Lobo das raízes', hp: 40, damage: 8, speed: 5.2, range: 1.6, build: () => quadruped({ color: '#6b6258', belly: '#a89c8a' }) },
  aranha: { name: 'Aranha de raiz', hp: 26, damage: 6, speed: 4.6, range: 1.4, build: () => arthropod({ color: '#2a2420', shell: '#3a2a22', legs: 8, mandibles: true, size: 0.8 }) },
  besouro: { name: 'Besouro escavador', hp: 60, damage: 10, speed: 3.2, range: 1.6, build: () => arthropod({ color: '#2a3a2a', shell: '#3f6a5a', mandibles: true }) },
  escorpiao: { name: 'Escorpião da casca', hp: 50, damage: 11, speed: 4.2, range: 1.8, build: () => arthropod({ color: '#7a4a22', shell: '#a8642a', legs: 8, pincers: true, stinger: true, size: 0.9 }) },
  salamandra: { name: 'Salamandra de Ignar', hp: 45, damage: 12, speed: 4.4, range: 1.6, build: () => quadruped({ color: '#a8301a', belly: '#ff9a3c', size: 0.8, snout: true }) },
  felino: { name: 'Felino da selva', hp: 55, damage: 13, speed: 6.4, range: 1.8, build: () => quadruped({ color: '#c99a3a', belly: '#e8d3a0', size: 1.15 }) },
  sanguessuga: { name: 'Larva do pântano', hp: 35, damage: 7, speed: 3, range: 1.3, build: () => arthropod({ color: '#3a4a22', shell: '#5a6a2a', legs: 0, long: 1.6, size: 0.8 }) },
  cristalino: { name: 'Aranha de cristal', hp: 50, damage: 11, speed: 4.8, range: 1.5, build: () => arthropod({ color: '#5a4a7a', shell: '#c59bff', legs: 8, mandibles: true, size: 0.9 }) },
  loboBranco: { name: 'Lobo de Nivéria', hp: 60, damage: 12, speed: 5.6, range: 1.7, build: () => quadruped({ color: '#e8eef5', belly: '#ffffff', size: 1.2 }) },
  serpente: { name: 'Serpente planadora', hp: 40, damage: 10, speed: 5, range: 1.6, build: () => arthropod({ color: '#3f7a3a', shell: '#6aa04a', legs: 0, long: 2, size: 0.6 }) },
  // bosses
  devorador: { name: 'Devorador de Raízes', boss: true, hp: 420, damage: 16, speed: 3.6, range: 3.2, build: () => arthropod({ color: '#4a3a28', shell: '#6a4a2a', legs: 6, mandibles: true, size: 3.2, long: 1.4 }) },
  escorpiaoRei: { name: 'Escorpião-Rei da Casca', boss: true, hp: 520, damage: 14, speed: 4, range: 3.4, build: () => arthropod({ color: '#5a2a12', shell: '#c9702a', legs: 8, pincers: true, stinger: true, size: 3 }) },
};

// which creatures live on each level (the design document's fauna, as far as primitives allow)
export const FAUNA = {
  raizes: [['lobo', 4], ['aranha', 4], ['besouro', 2]],
  deserto: [['escorpiao', 5], ['besouro', 2]],
  oceano: [],
  fornalha: [['salamandra', 6]],
  selva: [['felino', 4], ['serpente', 3]],
  pantano: [['sanguessuga', 6], ['aranha', 2]],
  cristais: [['cristalino', 6]],
  niveria: [['loboBranco', 5]],
  suspensa: [['serpente', 5]],
  copa: [],
};

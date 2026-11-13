// Creature models built from primitives, with a tiny procedural animation rig:
// legs swing with movement, the body dips for a wind-up, and every material can flash.
// Every creature faces -z, like the explorer, so the same yaw convention applies.
import * as THREE from 'three';
import { REGIONS, gameStats } from './bestiary.js';

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

// golems: stacked blocks of ice, stone or dead wood
function golem({ color, accent, size = 1, glow = null }) {
  const root = new THREE.Group();
  const stone = mat(color, { flatShading: true, emissive: '#ffffff', emissiveIntensity: 0 });
  const trim = mat(accent, { flatShading: true, emissive: glow ?? '#ffffff', emissiveIntensity: glow ? 0.8 : 0 });
  const body = new THREE.Group();
  body.position.y = 1.1 * size;
  root.add(body);
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.9 * size, 0.9 * size, 0.6 * size), stone);
  torso.castShadow = true;
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.45 * size, 0.4 * size, 0.4 * size), trim);
  head.position.set(0, 0.62 * size, -0.05 * size);
  body.add(torso, head);
  const arms = [-1, 1].map((s) => {
    const p = new THREE.Group();
    p.position.set(s * 0.62 * size, 0.3 * size, 0);
    const a = new THREE.Mesh(new THREE.BoxGeometry(0.3 * size, 0.95 * size, 0.3 * size), stone);
    a.position.y = -0.45 * size;
    a.castShadow = true;
    const fist = new THREE.Mesh(new THREE.BoxGeometry(0.38 * size, 0.32 * size, 0.38 * size), trim);
    fist.position.y = -0.95 * size;
    p.add(a, fist);
    body.add(p);
    return p;
  });
  const legs = [-1, 1].map((s) => legPivot(root, s * 0.25 * size, 0.75 * size, 0, 0.75 * size, 0.16 * size, stone));
  return rig(root, body, legs, [stone, trim], {
    radius: 0.7 * size, height: 1.9 * size,
    extra: { onAnimate(phase, windup) { arms.forEach((a, i) => { a.rotation.x = (i ? 1 : -1) * Math.sin(phase) * 0.4 - windup * 1.6; }); } },
  });
}

// ash and fire elementals: a core with orbiting embers
function elemental({ color, core, size = 1 }) {
  const root = new THREE.Group();
  const smoke = mat(color, { transparent: true, opacity: 0.75, emissive: '#ffffff', emissiveIntensity: 0 });
  const heart = new THREE.MeshBasicMaterial({ color: new THREE.Color(core).multiplyScalar(1.8) });
  const body = new THREE.Group();
  body.position.y = 1.1 * size;
  root.add(body);
  const puffs = [];
  for (let k = 0; k < 7; k++) {
    const p = new THREE.Mesh(new THREE.IcosahedronGeometry((0.35 + (k % 3) * 0.08) * size, 0), smoke);
    body.add(p);
    puffs.push(p);
  }
  const c = new THREE.Mesh(new THREE.OctahedronGeometry(0.28 * size, 0), heart);
  body.add(c);
  return rig(root, body, [], [smoke], {
    radius: 0.6 * size, height: 1.6 * size,
    extra: {
      onAnimate(phase, windup) {
        puffs.forEach((p, k) => { const a = phase * 0.5 + (k / puffs.length) * Math.PI * 2; const r = (0.45 + windup * 0.3) * size; p.position.set(Math.cos(a) * r, Math.sin(a * 2) * 0.25 * size, Math.sin(a) * r); });
        c.rotation.y = phase;
        c.scale.setScalar(1 + windup * 0.6);
      },
    },
  });
}

// a carnivorous plant that does not walk: thick stem, jaws, feeding roots
function plant({ size = 1 }) {
  const root = new THREE.Group();
  const green = mat('#3f6a2a', { emissive: '#ffffff', emissiveIntensity: 0 });
  const jaw = mat('#8a2a3a', { emissive: '#ffffff', emissiveIntensity: 0 });
  const body = new THREE.Group();
  body.position.y = 0.2;
  root.add(body);
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.5 * size, 0.9 * size, 3.5 * size, 10), green);
  stem.position.y = 1.75 * size;
  stem.castShadow = true;
  const head = new THREE.Group();
  head.position.set(0, 3.6 * size, -0.3 * size);
  const upper = new THREE.Mesh(new THREE.SphereGeometry(1.2 * size, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), jaw);
  const lower = upper.clone();
  lower.rotation.x = Math.PI;
  head.add(upper, lower);
  body.add(stem, head);
  for (let k = 0; k < 6; k++) {
    const leaf = new THREE.Mesh(new THREE.ConeGeometry(0.5 * size, 2.5 * size, 4), green);
    const a = (k / 6) * Math.PI * 2;
    leaf.position.set(Math.cos(a) * 1.2 * size, 0.5 * size, Math.sin(a) * 1.2 * size);
    leaf.rotation.set(Math.sin(a) * 1.1, 0, -Math.cos(a) * 1.1);
    body.add(leaf);
  }
  return rig(root, body, [], [green, jaw], {
    radius: 1.6 * size, height: 4.5 * size,
    extra: { onAnimate(phase, windup) { upper.rotation.x = -0.3 - windup * 0.6 - Math.abs(Math.sin(phase)) * 0.2; lower.rotation.x = Math.PI + 0.3 + windup * 0.6; head.rotation.x = windup * 0.5; } },
  });
}

// add horns or tusks, and wings, to a quadruped (beast king, winter dragon)
function decorate(model, { horns = null, wings = null, size = 1 }) {
  const body = model.root.children[0];
  if (horns) for (const s of [-1, 1]) {
    const h = new THREE.Mesh(new THREE.ConeGeometry(0.06 * size, 0.5 * size, 6), mat(horns));
    h.position.set(s * 0.15 * size, 0.38 * size, -0.62 * size);
    h.rotation.set(-0.6, 0, s * 0.5);
    body.add(h);
  }
  if (wings) for (const s of [-1, 1]) {
    const w = new THREE.Mesh(new THREE.PlaneGeometry(1.2 * size, 0.6 * size), mat(wings, { side: THREE.DoubleSide, transparent: true, opacity: 0.85 }));
    w.position.set(s * 0.65 * size, 0.25 * size, 0);
    w.rotation.set(-Math.PI / 2, 0, s * 0.35);
    body.add(w);
  }
  return model;
}

// in-game body for each bestiary model name
const BODIES = {
  besouro: () => arthropod({ color: '#2a3a2a', shell: '#3f6a5a', mandibles: true }),
  aranha: () => arthropod({ color: '#2a2420', shell: '#3a4a2a', legs: 8, mandibles: true, size: 0.8 }),
  lobo: () => quadruped({ color: '#6b6258', belly: '#a89c8a' }),
  escorpiao: () => arthropod({ color: '#7a4a22', shell: '#a8642a', legs: 8, pincers: true, stinger: true, size: 0.9 }),
  lagarto: () => quadruped({ color: '#a8642a', belly: '#e0b070', size: 0.9, tail: true }),
  salamandra: () => quadruped({ color: '#a8301a', belly: '#ff9a3c', size: 0.9 }),
  besouroObsidiana: () => arthropod({ color: '#151218', shell: '#2a2238', mandibles: true, size: 1.2 }),
  elemental: () => elemental({ color: '#4a4440', core: '#ff7a2a' }),
  loboBranco: () => quadruped({ color: '#e8eef5', belly: '#ffffff', size: 1.2 }),
  golem: () => golem({ color: '#b9d6ea', accent: '#e8f4ff', size: 1.1 }),
  felino: () => quadruped({ color: '#4f6a2a', belly: '#c9b870', size: 1.2 }),
  besouroColossal: () => arthropod({ color: '#2a3a1a', shell: '#5a7a2a', mandibles: true, size: 1.9 }),
  serpente: () => arthropod({ color: '#3f7a3a', shell: '#6aa04a', legs: 0, long: 2, size: 0.7 }),
  sanguessuga: () => arthropod({ color: '#3a4a22', shell: '#5a6a2a', legs: 0, long: 1.6, size: 0.8 }),
  sapo: () => quadruped({ color: '#5a6a2a', belly: '#c9c08a', size: 0.9, snout: false, tail: false }),
  cristalino: () => arthropod({ color: '#5a4a7a', shell: '#c59bff', legs: 8, mandibles: true, size: 0.9 }),
};

const mob = (region, entry) => {
  const g = gameStats(entry, 'mob');
  return { name: entry.nome, region, hp: g.hp, damage: g.damage, speed: g.speed, armor: g.armor, xp: g.xp, range: 1.6, build: BODIES[entry.model] };
};
const bossOf = (region, entry, kind, build, range = 3.4) => {
  const g = gameStats(entry, kind);
  return { name: entry.nome, boss: true, region, hp: g.hp, damage: g.damage, speed: g.speed, armor: g.armor, xp: g.xp, range, build };
};

export const CREATURES = {};
for (const r of REGIONS) for (const e of r.mobs) if (e.model) CREATURES[e.id] = mob(r.id, e);
const R = Object.fromEntries(REGIONS.map((r) => [r.id, r]));
Object.assign(CREATURES, {
  // the manual's sub-bosses and bosses of regions 1-3 and 7-10
  escavadorAmbar: bossOf('raizes', R.raizes.subBoss, 'subBoss', () => quadruped({ color: '#8a6a3a', belly: '#ffb347', size: 2.2, tail: true })),
  rainhaRaizes: bossOf('raizes', R.raizes.boss, 'boss', () => arthropod({ color: '#3a2a1a', shell: '#ffb347', legs: 6, mandibles: true, size: 3, long: 1.6 }), 4),
  escorpiaoReiSol: bossOf('deserto', R.deserto.subBoss, 'subBoss', () => arthropod({ color: '#7a3a12', shell: '#ffcf4a', legs: 8, pincers: true, stinger: true, size: 2.6 })),
  colossoCasca: bossOf('deserto', R.deserto.boss, 'boss', () => golem({ color: '#8a5a2a', accent: '#e0a060', glow: '#ffcf4a', size: 2.8 }), 4.2),
  guardiaoMares: bossOf('oceano', R.oceano.subBoss, 'subBoss', () => quadruped({ color: '#3a6a5a', belly: '#9ad0c0', size: 3, snout: false })),
  leviata: bossOf('oceano', R.oceano.boss, 'boss', () => arthropod({ color: '#1f3a5a', shell: '#2a8a9a', legs: 0, long: 3, size: 2.4 }), 4.2),
  pastorFungos: bossOf('pantano', R.pantano.subBoss, 'subBoss', () => golem({ color: '#5a6a3a', accent: '#a8ff5a', glow: '#a8ff5a', size: 2.2 })),
  maeDecomposicao: bossOf('pantano', R.pantano.boss, 'boss', () => elemental({ color: '#4a5a2a', core: '#a8ff5a', size: 3.4 }), 4.2),
  cavaleiroAmetista: bossOf('cristais', R.cristais.subBoss, 'subBoss', () => golem({ color: '#5a4a7a', accent: '#c59bff', glow: '#c59bff', size: 2.4 })),
  arquiteto: bossOf('cristais', R.cristais.boss, 'boss', () => elemental({ color: '#8a7ab0', core: '#e6d6ff', size: 3.6 }), 4.2),
  guardiaVentos: bossOf('suspensa', R.suspensa.subBoss, 'subBoss', () => decorate(quadruped({ color: '#e8f0d0', belly: '#ffffff', size: 2.2 }), { wings: '#d0e8c0', size: 2.2 })),
  dragaoSeteGalhos: bossOf('suspensa', R.suspensa.boss, 'boss', () => decorate(quadruped({ color: '#4a7a3a', belly: '#9ac07a', size: 3.8, tail: true }), { horns: '#e8e0c0', wings: '#7fe08a', size: 3.8 }), 4.4),
  sacerdotisa: bossOf('copa', R.copa.subBoss, 'subBoss', () => plant({ size: 1.3 }), 4.6),
  devoradorSeiva: bossOf('copa', R.copa.boss, 'boss', () => arthropod({ color: '#3a1a2a', shell: '#ffb347', legs: 8, mandibles: true, size: 4, long: 1.8 }), 4.6),
  // Act II: the manual's sub-bosses and bosses of regions 4-6
  ferreiro: bossOf('fornalha', R.fornalha.subBoss, 'subBoss', () => golem({ color: '#3a3330', accent: '#ff7a2a', glow: '#ff5a10', size: 2.4 })),
  ignar: bossOf('fornalha', R.fornalha.boss, 'boss', () => elemental({ color: '#7a2a10', core: '#ffcf4a', size: 3.4 }), 4.2),
  matriarca: bossOf('niveria', R.niveria.subBoss, 'subBoss', () => quadruped({ color: '#f4f8ff', belly: '#ffffff', size: 2.6 })),
  reiInverno: bossOf('niveria', R.niveria.boss, 'boss', () => decorate(quadruped({ color: '#9fd2ff', belly: '#e8f4ff', size: 3.6 }), { horns: '#e8f4ff', wings: '#b9e3ff', size: 3.6 }), 4.2),
  devoradorTroncos: bossOf('selva', R.selva.subBoss, 'subBoss', () => plant({ size: 1.4 }), 5),
  reiFeras: bossOf('selva', R.selva.boss, 'boss', () => decorate(quadruped({ color: '#7a5a3a', belly: '#c9a87a', size: 4 }), { horns: '#efe6d0', size: 4 }), 4.4),
});

// which creatures live on each level, from the manual (flyers and swimmers not in the game yet)
const COUNTS = { raizes: 3, deserto: 3, fornalha: 3, niveria: 3, selva: 3, pantano: 2, cristais: 3, suspensa: 4, copa: 2 };
export const FAUNA = Object.fromEntries(REGIONS.map((r) => [r.id, r.mobs.filter((e) => e.model).map((e) => [e.id, COUNTS[r.id] ?? 0])]));
FAUNA.oceano = [];

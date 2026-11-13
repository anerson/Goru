// Combat: the explorer's staff, the creatures of each level and the two Act I bosses.
//
// Creature AI (game-ai skill): perceive -> decide -> steer -> animate.
//   Perception runs at 5 Hz and only writes facts (distance, same level).
//   An FSM decides: idle (wander near home) -> alert (0.35 s reaction delay, so it is fair)
//   -> chase -> windup (telegraphed: the creature crouches and glows) -> strike -> recover.
//   Chase starts at 12 m and gives up at 20 m (hysteresis, no flicker); a leash sends it home.
// Bosses add telegraphed specials: a charge along a red line and a ground slam inside a red
// ring, and the Devorador calls two beetles at half health.
// Feedback (game-feel skill): hits flash the target, knock it back, shake the camera from a
// decaying trauma value and freeze combat for 50 ms (one hit-stop at a time); big hits use
// the large tier. Shake writes only the camera offset, after the camera has been placed.
import * as THREE from 'three';
import { mulberry32 } from '../noise.js';
import { BIOMES, DISK_R } from '../tree/layout.js';
import { CREATURES, FAUNA } from './creatures.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const PLAYER = { damage: [18, 26], range: 2.6, cone: Math.cos(THREE.MathUtils.degToRad(60)), cooldown: 0.45 };
const CHASE_IN = 12, CHASE_OUT = 20, LEASH = 32, BOSS_LEASH = 46;

export function createCombat({ scene, camera, walker, character, biomes, game, hud, reduceMotion }) {
  const rand = mulberry32(4242);
  const mobs = [];
  const bosses = {};
  const levelOf = (feet, r) => (r > DISK_R + 20 ? null : BIOMES.filter((b) => feet > b.level - 1.5 && feet < b.level + 26).pop() ?? null);

  // ---------- spawning ----------
  function spawn(type, biome, x, z, opts = {}) {
    const def = CREATURES[type];
    const model = def.build();
    const level = BIOMES.find((b) => b.id === biome).level;
    const y = biomes.terrains[biome](x, z);
    model.root.position.set(x, y, z);
    scene.add(model.root);
    const m = {
      type, def, model, biome, level, home: V(x, y, z), pos: V(x, y, z), yaw: rand() * 6.28,
      hp: def.hp, state: 'idle', timer: rand() * 2, wander: null, knock: V(0, 0, 0), flash: 0,
      cooldown: 0, specialCd: 4, summoned: false, ...opts,
    };
    mobs.push(m);
    return m;
  }
  const ok = (biome, x, z) => {
    const r = Math.hypot(x, z);
    if (r < 18 || r > DISK_R - 5) return false;
    const b = BIOMES.find((v) => v.id === biome);
    return biomes.terrains[biome](x, z) > b.level - 0.5 && !game.nearSafeZone(biome, x, z, 18);
  };
  for (const [biome, list] of Object.entries(FAUNA)) {
    for (const [type, n] of list) {
      for (let k = 0, tries = 0; k < n && tries < 200; tries++) {
        const a = rand() * 6.28, r = 20 + rand() * 40, x = Math.cos(a) * r, z = Math.sin(a) * r;
        if (ok(biome, x, z)) { spawn(type, biome, x, z); k++; }
      }
    }
  }
  // bosses wait buried at their lairs until the story wakes them
  for (const [id, type, biome] of [['devorador', 'devorador', 'raizes'], ['escorpiao', 'escorpiaoRei', 'deserto']]) {
    const lair = game.lairs[id];
    const b = spawn(type, biome, lair.x, lair.z, { boss: id, state: 'dormant' });
    b.model.root.visible = false;
    bosses[id] = b;
  }

  // ---------- telegraphs ----------
  const warnMat = new THREE.MeshBasicMaterial({ color: '#ff3b2f', transparent: true, opacity: 0.45, depthWrite: false, side: THREE.DoubleSide });
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.85, 1, 48).rotateX(-Math.PI / 2), warnMat);
  const lane = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 1).rotateX(-Math.PI / 2).translate(0, 0, -0.5), warnMat);
  ring.visible = lane.visible = false;
  scene.add(ring, lane);

  // ---------- the explorer's slash ----------
  const slash = new THREE.Mesh(new THREE.RingGeometry(1.2, 2.4, 24, 1, -Math.PI / 3, (Math.PI * 2) / 3).rotateX(-Math.PI / 2),
    new THREE.MeshBasicMaterial({ color: '#fff2c8', transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending }));
  scene.add(slash);
  let slashT = 0, attackCd = 0;

  // ---------- feedback: trauma shake, hit-stop, numbers ----------
  let trauma = 0, shakeT = 0, stopUntil = 0;
  const shakeStrength = reduceMotion ? 0.3 : 1;
  function feedback(tier) {
    const T = { small: [0.15, 0], medium: [0.35, 0.05], large: [0.8, 0.12] }[tier];
    trauma = Math.min(1, trauma + T[0]);
    const now = performance.now() / 1000;
    if (T[1] && now > stopUntil) stopUntil = now + T[1];   // skip a new stop during one
  }
  const numbers = [];
  function popNumber(pos, text, color) {
    const el = document.createElement('div');
    el.className = 'dmg';
    el.textContent = text;
    el.style.color = color;
    document.getElementById('hud').append(el);
    numbers.push({ el, pos: pos.clone(), t: 0 });
  }

  // ---------- damage ----------
  function hurtMob(m, amount, from) {
    if (m.state === 'dead' || m.state === 'dormant') return;
    m.hp -= amount;
    m.flash = 0.12;
    const away = m.pos.clone().sub(from).setY(0).normalize();
    m.knock.copy(away).multiplyScalar(m.boss ? 2 : 7);
    popNumber(m.pos.clone().setY(m.pos.y + m.model.height + 0.6), String(Math.round(amount)), '#ffe9a8');
    feedback(m.boss ? 'large' : 'medium');
    if (m.state === 'idle' || m.state === 'alert' || m.state === 'return') { m.state = 'chase'; m.timer = 0; }
    if (m.hp <= 0) die(m);
  }
  function die(m) {
    m.state = 'dead';
    m.timer = 0;
    lane.visible = ring.visible = false;
    if (m.boss) {
      hud.boss(null);
      game.bossDefeated(m.boss);
      feedback('large');
    } else if (rand() < 0.35) {
      game.loot(m.biome);
    }
  }
  function hurtPlayer(amount) {
    game.hurt(amount);
    feedback(amount >= 20 ? 'large' : 'medium');
  }

  // ---------- the explorer attacks ----------
  function attack() {
    if (attackCd > 0 || game.busy || walker.state.flying) return;
    attackCd = PLAYER.cooldown;
    character.swing();
    slashT = 0.18;
    const me = walker.state;
    const heading = character.root.rotation.y;
    const fwd = V(-Math.sin(heading), 0, -Math.cos(heading));
    slash.position.set(me.x, me.feet + 1, me.z);
    slash.rotation.y = heading;
    const from = V(me.x, me.feet, me.z);
    for (const m of mobs) {
      if (m.state === 'dead' || m.state === 'dormant') continue;
      const d = V(m.pos.x - me.x, 0, m.pos.z - me.z);
      const dist = d.length();
      if (dist > PLAYER.range + m.model.radius || Math.abs(m.pos.y - me.feet) > 3) continue;
      if (dist > 0.6 && d.normalize().dot(fwd) < PLAYER.cone) continue;
      hurtMob(m, PLAYER.damage[0] + rand() * (PLAYER.damage[1] - PLAYER.damage[0]), from);
    }
  }

  // ---------- creature brains ----------
  const toPlayer = new THREE.Vector3();
  function face(m, x, z, dt, rate = 8) {
    const want = Math.atan2(-(x - m.pos.x), -(z - m.pos.z));
    const d = Math.atan2(Math.sin(want - m.yaw), Math.cos(want - m.yaw));
    m.yaw += d * (1 - Math.exp(-rate * dt));
  }
  function move(m, dx, dz, speed, dt) {
    const l = Math.hypot(dx, dz);
    if (l < 1e-4) return 0;
    const step = Math.min(l, speed * dt);
    const nx = m.pos.x + (dx / l) * step, nz = m.pos.z + (dz / l) * step;
    const y = biomes.terrains[m.biome](nx, nz);
    if (Math.hypot(nx, nz) > DISK_R - 3 || y < m.level - 0.6) return 0;   // edge, water or lava
    m.pos.set(nx, y, nz);
    return step / dt;
  }

  function think(m, dt, me, sameLevel) {
    const dx = me.x - m.pos.x, dz = me.z - m.pos.z, dist = Math.hypot(dx, dz);
    const homeD = Math.hypot(m.pos.x - m.home.x, m.pos.z - m.home.z);
    const def = m.def;
    let speed = 0, windup = 0;
    m.timer -= dt;
    m.cooldown -= dt;
    m.specialCd -= dt;
    switch (m.state) {
      case 'idle': {
        if (!m.wander || m.timer <= 0) {
          const a = rand() * 6.28, r = rand() * 7;
          m.wander = V(m.home.x + Math.cos(a) * r, 0, m.home.z + Math.sin(a) * r);
          m.timer = 2 + rand() * 4;
        }
        face(m, m.wander.x, m.wander.z, dt, 3);
        speed = move(m, m.wander.x - m.pos.x, m.wander.z - m.pos.z, def.speed * 0.3, dt);
        if (m.sense && sameLevel && dist < CHASE_IN) { m.state = 'alert'; m.timer = 0.35; }
        break;
      }
      case 'alert':
        face(m, me.x, me.z, dt);
        if (m.timer <= 0) m.state = 'chase';
        break;
      case 'chase': {
        if (!sameLevel || dist > (m.boss ? BOSS_LEASH : CHASE_OUT) || homeD > (m.boss ? BOSS_LEASH : LEASH)) { m.state = 'return'; break; }
        face(m, me.x, me.z, dt);
        const reach = def.range + m.model.radius * 0.5;
        if (m.boss && m.specialCd <= 0) {
          if (m.hp < def.hp * 0.5 && rand() < 0.5) { m.state = 'slamWind'; m.timer = 1.2; ring.visible = true; m.specialCd = 7; break; }
          if (dist > 5 && dist < 18) { m.state = 'chargeWind'; m.timer = 0.9; m.lock = V(dx / dist, 0, dz / dist); lane.visible = true; m.specialCd = 6; break; }
        }
        if (m.boss === 'devorador' && !m.summoned && m.hp < def.hp * 0.5) {
          m.summoned = true;
          for (let k = 0; k < 2; k++) { const s = spawn('besouro', m.biome, m.pos.x + (k ? 3 : -3), m.pos.z + 2); s.state = 'chase'; s.sense = true; s.temp = true; }
          hud.toast('O Devorador chama sua prole!');
        }
        if (dist < reach && m.cooldown <= 0) { m.state = 'windup'; m.timer = m.boss ? 0.7 : 0.5; break; }
        const stop = def.range * 0.8 + m.model.radius * 0.5;
        if (dist > stop) speed = move(m, dx, dz, def.speed, dt);
        break;
      }
      case 'windup':
        face(m, me.x, me.z, dt, 4);
        windup = 1 - Math.max(0, m.timer) / (m.boss ? 0.7 : 0.5);
        m.flash = Math.max(m.flash, 0.25 * windup);            // glow before the bite: the tell
        if (m.timer <= 0) {
          const fwd = V(-Math.sin(m.yaw), 0, -Math.cos(m.yaw));
          const d = V(dx, 0, dz);
          if (sameLevel && dist < def.range + m.model.radius * 0.5 + 0.6 && (dist < 1 || d.normalize().dot(fwd) > 0.3)) hurtPlayer(def.damage);
          m.state = 'recover'; m.timer = m.boss ? 0.8 : 0.6; m.cooldown = m.boss ? 0.6 : 1.2;
        }
        break;
      case 'recover':
        if (m.timer <= 0) m.state = 'chase';
        break;
      case 'chargeWind': {
        windup = 1;
        lane.position.copy(m.pos).setY(m.pos.y + 0.08);
        lane.rotation.y = Math.atan2(-m.lock.x, -m.lock.z);
        lane.scale.set(1, 1, 18);
        face(m, m.pos.x + m.lock.x, m.pos.z + m.lock.z, dt, 10);
        if (m.timer <= 0) { m.state = 'charge'; m.timer = 1.1; m.hitDone = false; lane.visible = false; }
        break;
      }
      case 'charge':
        speed = move(m, m.lock.x, m.lock.z, 16, dt);
        if (!m.hitDone && sameLevel && dist < m.model.radius + 1) { m.hitDone = true; hurtPlayer(22); }
        if (m.timer <= 0 || speed === 0) { m.state = 'recover'; m.timer = 1.2; }
        break;
      case 'slamWind': {
        const k = 1 - Math.max(0, m.timer) / 1.2;
        ring.position.copy(m.pos).setY(m.pos.y + 0.1);
        ring.scale.setScalar(7 * k);
        windup = k;
        if (m.timer <= 0) {
          ring.visible = false;
          if (sameLevel && dist < 7 + 0.4) hurtPlayer(25);
          feedback('large');
          m.state = 'recover'; m.timer = 1.4;
        }
        break;
      }
      case 'return':
        if (m.boss) lane.visible = ring.visible = false;
        face(m, m.home.x, m.home.z, dt);
        speed = move(m, m.home.x - m.pos.x, m.home.z - m.pos.z, def.speed, dt);
        m.hp = Math.min(def.hp, m.hp + def.hp * 0.1 * dt);
        if (m.boss) hud.boss(null);
        if (homeD < 2) { m.state = m.boss ? 'lurk' : 'idle'; m.timer = 1; }
        if (sameLevel && dist < CHASE_IN * 0.7 && homeD < (m.boss ? BOSS_LEASH : LEASH) * 0.6) m.state = 'chase';
        break;
      case 'lurk':                                           // a boss back home, waiting
        m.hp = Math.min(def.hp, m.hp + def.hp * 0.2 * dt);
        if (sameLevel && dist < 16) { m.state = 'chase'; hud.boss(def.name, m.hp / def.hp); }
        break;
      default: break;
    }
    // knockback (eased out), separation from the explorer
    if (m.knock.lengthSq() > 0.01) {
      move(m, m.knock.x, m.knock.z, m.knock.length(), dt);
      m.knock.multiplyScalar(Math.exp(-10 * dt));
    }
    return { speed, windup };
  }

  // ---------- boss triggers from the story ----------
  function wake(id) {
    const b = bosses[id];
    if (!b || b.state !== 'dormant') return;
    b.state = 'rise';
    b.timer = 1.6;
    b.model.root.visible = true;
    hud.toast(`${b.def.name} desperta!`);
    feedback('large');
  }
  function resetBosses() {
    for (const b of Object.values(bosses)) {
      if (b.state === 'dead') continue;
      b.hp = b.def.hp;
      b.pos.copy(b.home);
      b.state = game.bossAwake(b.boss) ? 'lurk' : 'dormant';
      b.model.root.visible = b.state !== 'dormant';
      b.summoned = false;
    }
    for (let i = mobs.length - 1; i >= 0; i--) if (mobs[i].temp) { scene.remove(mobs[i].model.root); mobs.splice(i, 1); }
    lane.visible = ring.visible = false;
    hud.boss(null);
  }

  // ---------- per frame ----------
  let senseTimer = 0;
  function update(dt, t) {
    const now = performance.now() / 1000;
    const sim = now < stopUntil ? dt * 0.05 : dt;           // hit-stop slows combat only
    attackCd -= dt;
    const me = walker.state;
    const r = Math.hypot(me.x, me.z);
    const here = levelOf(me.feet, r);

    // the story wakes the bosses when the explorer comes close at the right moment
    for (const [id, b] of Object.entries(bosses)) {
      if (b.state === 'dormant' && game.bossShouldWake(id) && here?.id === b.biome && Math.hypot(me.x - b.home.x, me.z - b.home.z) < 24) wake(id);
    }

    senseTimer -= dt;
    const sense = senseTimer <= 0;
    if (sense) senseTimer = 0.2;                             // perception at 5 Hz
    let fighting = null;
    for (const m of mobs) {
      const active = here && m.biome === here.id && Math.hypot(m.pos.x - me.x, m.pos.z - me.z) < 90;
      if (m.state === 'dead') {
        m.timer += dt;
        const k = Math.max(0, 1 - m.timer / 1.2);
        m.model.root.scale.setScalar(Math.max(k, 0.001));
        if (k === 0) m.model.root.visible = false;
        if (!m.boss && !m.temp && m.timer > 90 && !active) { m.hp = m.def.hp; m.pos.copy(m.home); m.state = 'idle'; m.model.root.visible = true; m.model.root.scale.setScalar(1); }
        continue;
      }
      if (m.state === 'dormant') continue;
      if (m.state === 'rise') {
        m.timer -= sim;
        const k = 1 - Math.max(0, m.timer) / 1.6;
        m.model.root.position.set(m.pos.x, m.pos.y - (1 - k) * m.model.height * 1.5, m.pos.z);
        m.model.root.rotation.y = m.yaw;
        if (m.timer <= 0) { m.state = 'chase'; hud.boss(m.def.name, 1); }
        continue;
      }
      if (!active || game.busy) { m.model.animate(sim, 0, 0); continue; }
      m.sense = sense;
      const sameLevel = Math.abs(me.feet - m.level) < 6;
      const { speed, windup } = think(m, sim, me, sameLevel);
      // keep a little space from the explorer and from each other
      const px = m.pos.x - me.x, pz = m.pos.z - me.z, pd = Math.hypot(px, pz), minD = m.model.radius + 0.5;
      if (pd < minD && pd > 1e-3) { m.pos.x = me.x + (px / pd) * minD; m.pos.z = me.z + (pz / pd) * minD; }
      m.flash = Math.max(0, m.flash - dt);
      m.model.flash(m.flash > 0 ? 0.6 : 0);
      m.model.root.position.copy(m.pos);
      m.model.root.rotation.y = m.yaw;
      m.model.animate(sim, speed, windup);
      if (m.boss && m.state !== 'lurk' && m.state !== 'return') fighting = m;
    }
    if (fighting) hud.boss(fighting.def.name, Math.max(0, fighting.hp) / fighting.def.hp);

    // slash fade
    slashT -= dt;
    slash.material.opacity = Math.max(0, slashT / 0.18) * 0.7;
    // damage numbers float up and fade (projected to the screen)
    for (let i = numbers.length - 1; i >= 0; i--) {
      const n = numbers[i];
      n.t += dt;
      const p = n.pos.clone().setY(n.pos.y + n.t * 1.2).project(camera);
      n.el.style.transform = `translate(${(p.x * 0.5 + 0.5) * innerWidth}px, ${(-p.y * 0.5 + 0.5) * innerHeight}px) translate(-50%, -50%)`;
      n.el.style.opacity = String(Math.max(0, 1 - n.t / 0.9));
      n.el.hidden = p.z > 1;
      if (n.t > 0.9) { n.el.remove(); numbers.splice(i, 1); }
    }
  }

  // camera shake: trauma squared, summed sines, decays in real time (keeps decaying in hit-stop)
  function shake(dt) {
    if (trauma <= 0) return;
    trauma = Math.max(0, trauma - 1.4 * dt);
    shakeT += dt * 30;
    const s = trauma * trauma * shakeStrength;
    camera.position.x += 0.35 * s * Math.sin(shakeT * 1.7);
    camera.position.y += 0.25 * s * Math.sin(shakeT * 2.3);
    camera.rotation.z += 0.04 * s * Math.sin(shakeT * 1.1);
  }

  return {
    update, attack, shake, resetBosses,
    debug: {
      mobs, bosses, wake,
      killBoss(id) { const b = bosses[id]; if (b.state === 'dormant') wake(id); b.state = 'chase'; hurtMob(b, b.hp + 1, b.pos.clone().add(V(0, 0, 1))); },
      hurtMob,
    },
  };
}

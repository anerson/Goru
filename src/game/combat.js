// Combat: the explorer's crafted weapon, the creatures of each level and the guardians.
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
import { BIOMES, DISK_R, APPROACH } from '../tree/layout.js';
import { CREATURES, FAUNA } from './creatures.js';
import { UNDER_TIER } from './campaign_data.js';
import { sfx, setBattle } from '../audio.js';
import { toonify } from '../toon.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
// Weapons. The explorer's staff is a melee weapon. The Cajado do GM belongs to the Game Master
// (gm.js): 999.999.999 damage, and it fires a beam of sap at whatever is under the crosshair, up to
// 40 m away (with nothing aimed it still sweeps close range).
export const WEAPONS = {
  cajado: { name: 'Cajado do explorador', damage: [18, 26], range: 2.6, cone: Math.cos(THREE.MathUtils.degToRad(60)), cooldown: 0.45, color: '#fff2c8' },
  gm: { name: 'Cajado do GM', damage: [999999999, 999999999], range: 6, reach: 40, cone: Math.cos(THREE.MathUtils.degToRad(80)), cooldown: 0.25, color: '#ffd76a' },
};
const CHASE_IN = 12, CHASE_OUT = 20, LEASH = 32, BOSS_LEASH = 46;

export function createCombat({ scene, camera, walker, character, biomes, game, hud, reduceMotion, fx }) {
  const rand = mulberry32(4242);
  const mobs = [];
  const bosses = {};
  // outside the trunk, near the ground, is the clearing ('fora'), levels 1-5
  const FORA = { id: 'fora', level: 0, name: 'Clareira de Aetherion' };
  const levelOf = (feet, r) => (r > DISK_R + 20 ? (feet < 30 ? FORA : null) : BIOMES.filter((b) => feet > b.level - 1.5 && feet < b.level + 26).pop() ?? null);
  const groundAt = (biome, x, z) => (biome === 'fora' ? walker.floorAt(x, z, 30) : biomes.terrains[biome](x, z));

  // ---------- spawning ----------
  function spawn(type, biome, x, z, opts = {}) {
    const def = CREATURES[type];
    const model = def.build();
    toonify(model.root, { outline: true, thickness: def.boss ? 0.05 : 0.07 });
    const level = biome === 'fora' ? 0 : BIOMES.find((b) => b.id === biome).level;
    const y = groundAt(biome, x, z);
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
    if (biome === 'fora') return r > 170 && r < 760 && Math.abs(walker.floorAt(x, z, 30)) < 3 && !game.nearSafeZone(biome, x, z, 24);
    if (r < 18 || r > DISK_R - 5) return false;
    const b = BIOMES.find((v) => v.id === biome);
    return biomes.terrains[biome](x, z) > b.level - 0.5 && !game.nearSafeZone(biome, x, z, 18);
  };
  for (const [biome, list] of Object.entries(FAUNA)) {
    for (const [type, n] of list) {
      for (let k = 0, tries = 0; k < n && tries < 200; tries++) {
        // in the clearing most creatures roam near the one trail toward the tree (the missions' way)
        const a = biome === 'fora' && k % 3 !== 2 ? APPROACH.angle + (rand() - 0.5) * 0.5 : rand() * 6.28;
        const r = biome === 'fora' ? 170 + rand() * 560 : 20 + rand() * 40, x = Math.cos(a) * r, z = Math.sin(a) * r;
        if (ok(biome, x, z)) { spawn(type, biome, x, z); k++; }
      }
    }
  }
  // bosses wait buried at their lairs until the story wakes them
  for (const { id, type, biome, lair } of game.bossList) {
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
  // the explorer's weapon is whatever the game says is equipped (crafted at the workbenches);
  // in Modo Mestre it is the Cajado do GM
  let gmOn = false;
  const cur = () => (gmOn ? WEAPONS.gm : game.weapon());
  let gateToast = 0;

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
  function popNumber(pos, text, color, cls = '') {
    const el = document.createElement('div');
    el.className = `dmg ${cls}`;
    el.textContent = text;
    el.style.color = color;
    document.getElementById('hud').append(el);
    numbers.push({ el, pos: pos.clone(), t: 0 });
  }

  // ---------- damage ----------
  // opts.quiet: a damage-over-time tick (no push, no shake, no sound); opts.skill: an ability hit
  function hurtMob(m, amount, from, crit = false, opts = {}) {
    if (m.state === 'dead' || m.state === 'dormant' || !(amount > 0)) return;
    // armour from the bestiary's Defesa (and a boss's own mechanics); the GM's staff ignores it
    if (amount < 1e6) amount *= (m.def.armor ?? 1) * (rulesOf(m).armorMul ?? 1);
    // a marked creature takes more from everyone (Marca do Caçador, Flecha Elemental, Pulso)
    if (amount < 1e6 && m.markT > 0) amount *= m.markMore ?? 1.15;
    let weakHit = false;
    // a guardian barely feels a weapon below its floor's tier: craft that floor's weapon first
    if (amount < 1e6 && m.boss && m.boss !== 'gm' && !gmOn) {
      const need = game.bossTier(m.boss);
      if (cur().tier < need) {
        amount *= UNDER_TIER;
        weakHit = true;
        sfx('weak');
        if (performance.now() / 1000 > gateToast) { gateToast = performance.now() / 1000 + 6; hud.toast(`${cur().name} mal arranha ${m.def.name}. Crie a arma deste andar na bancada.`); }
      }
    }
    m.hp -= amount;
    m.flash = 0.12;
    const huge = amount >= 1e6;
    const top = m.pos.clone().setY(m.pos.y + m.model.height + 0.6);
    if (!opts.quiet) {
      if (!weakHit) sfx(m.boss || amount >= 1e6 ? 'bigHit' : 'hit');
      const away = m.pos.clone().sub(from).setY(0).normalize();
      m.knock.copy(away).multiplyScalar(m.boss ? 2 : 7);
      const mid = m.pos.clone().setY(m.pos.y + m.model.height * 0.6);
      if (crit) { fx?.crit(mid); sfx('crit'); } else if (!weakHit) fx?.hit(mid, !!m.boss);
      feedback(m.boss ? 'large' : 'medium');
    }
    const colour = huge || crit ? '#ffd76a' : weakHit ? '#9a9a9a' : opts.skill ? opts.skill : opts.quiet ? '#b0e0ff' : '#ffe9a8';
    popNumber(top, `${crit ? 'CRÍTICO ' : ''}${Math.max(1, Math.round(amount)).toLocaleString('pt-BR')}`, colour, crit ? 'crit' : '');
    if (m.state === 'idle' || m.state === 'alert' || m.state === 'return') { m.state = 'chase'; m.timer = 0; }
    if (m.hp <= 0) { die(m); return; }
    // a story boss at a quarter of its health yields instead of fighting on: the player chooses
    if (m.boss && m.boss !== 'gm' && !m.yielded && m.hp <= m.def.hp * (rulesOf(m).yieldAt ?? 0.25)) {
      m.yielded = true;
      m.state = 'yield';
      m.knock.set(0, 0, 0);
      lane.visible = ring.visible = false;
      hud.boss(`${m.def.name} · rendido`, m.hp / m.def.hp);
      fx?.yield(m.pos.clone().setY(m.pos.y + 0.3));
      game.bossYield(m.boss);
    }
  }
  function die(m) {
    m.state = 'dead';
    m.timer = 0;
    fx?.kill(m.pos.clone().setY(m.pos.y + m.model.height * 0.5), m.boss ? '#ffcf4a' : '#ff9a6a');
    if (!m.boss) sfx('kill');
    lane.visible = ring.visible = false;
    if (m.boss !== 'gm' && !m.temp) game.onKill(m.biome, m.boss ?? null);
    if (m.boss) {
      hud.boss(null);
      if (m.boss !== 'gm') game.bossDefeated(m.boss);   // a boss the GM summoned is not the story's
      feedback('large');
    } else if (rand() < 0.7) {
      game.loot(m.biome);
    }
  }
  function hurtPlayer(amount) {
    if (shield.t > 0) amount *= 1 - shield.red;
    if (invul > 0) { popNumber(V(walker.state.x, walker.state.feet + 2.2, walker.state.z), 'invulnerável', '#9dffcf'); return; }
    if (walker.state.dodgeT > 0) { fx?.dodge(V(walker.state.x, walker.state.feet + 1, walker.state.z)); popNumber(V(walker.state.x, walker.state.feet + 2.2, walker.state.z), 'esquivou', '#9dffcf'); return; }
    game.hurt(amount);
    sfx('hurt');
    popNumber(V(walker.state.x, walker.state.feet + 2.3, walker.state.z), `-${Math.round(amount)}`, '#ff6a5a');
    dropCombo();
    feedback(amount >= 20 ? 'large' : 'medium');
  }

  // ---------- aiming: the crosshair is the camera's centre ----------
  // Melee: the creature closest to the centre inside the weapon's arc and reach, measured from
  // where the camera looks. Ranged (Cajado do GM): the creature closest to the line of sight,
  // within a few degrees, up to its reach. The HUD crosshair turns red over a target.
  const camDir = new THREE.Vector3(), toMob = new THREE.Vector3();
  let aimed = null;
  function findAim() {
    const me = walker.state, w = cur();
    camera.getWorldDirection(camDir);
    const yaw = me.yaw, fwd = V(-Math.sin(yaw), 0, -Math.cos(yaw));
    let best = null, bestScore = Infinity;
    for (const m of mobs) {
      if (['dead', 'dormant', 'rise', 'yield', 'gone', 'retreat'].includes(m.state) || m.ally) continue;
      const flat = Math.hypot(m.pos.x - me.x, m.pos.z - me.z);
      if (w.reach) {
        toMob.set(m.pos.x, m.pos.y + m.model.height * 0.5, m.pos.z).sub(camera.position);
        const d = toMob.length();
        if (d > w.reach + 6) continue;
        const angle = Math.acos(Math.min(1, toMob.divideScalar(d).dot(camDir)));
        const allow = THREE.MathUtils.degToRad(4) + Math.atan(m.model.radius / d);
        if (angle < allow && angle < bestScore) { best = m; bestScore = angle; }
      } else {
        if (flat > w.range + m.model.radius || Math.abs(m.pos.y - me.feet) > 3) continue;
        const dot = flat > 0.6 ? (fwd.x * (m.pos.x - me.x) + fwd.z * (m.pos.z - me.z)) / flat : 1;
        if (dot < w.cone) continue;
        const score = flat * (2 - dot);
        if (score < bestScore) { best = m; bestScore = score; }
      }
    }
    return best;
  }

  // the GM's sap beam
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 1, 6, 1, true).translate(0, 0.5, 0).rotateX(Math.PI / 2),
    new THREE.MeshBasicMaterial({ color: '#ffd76a', transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }));
  scene.add(beam);
  let beamT = 0;
  function fireBeam(from, to) {
    beam.position.copy(from);
    beam.lookAt(to);
    beam.scale.set(1, 1, from.distanceTo(to));
    beamT = 0.18;
  }

  // a roll between the weapon's min and max (Infinity - Infinity would be NaN, so fixed values skip it)
  const rollDamage = (w) => (w.damage[0] === w.damage[1] ? w.damage[0] : w.damage[0] + rand() * (w.damage[1] - w.damage[0]));

  // a story boss's special rules from the game (armour multiplier, regeneration, summons...)
  const rulesOf = (m) => (m.boss && m.boss !== 'gm' ? game.bossRules(m.boss) : {});

  // ---------- the explorer attacks ----------
  // combo: hits within 2.2 s of each other chain; each link adds 5% damage, up to +50%.
  // crit: 12% of hits (20% at a combo of 10) do 1.8x, with a gold number and a burst.
  let combo = 0, comboT = 0;
  // class effects: Ladino's crits, Sábio's bonus against guardians, Mago's and Arqueiro's
  // area burst (the ability is their ranged hit with a splash), the Ladino's sure crit after
  // Golpe Preciso and the Guerreiro's bastion (less damage taken, see hurtPlayer)
  function strike(m, w, from) {
    const c = game.cls;
    combo = comboT > 0 ? combo + 1 : 1;
    comboT = 2.2;
    hud.combo(combo);
    const boss = !!(m.boss && m.boss !== 'gm');
    // Arqueiro's steady aim: standing still before the shot is a sure-er crit
    const steady = c.id === 'arqueiro' && !walker.state.moving ? 0.2 : 0;
    const opportunist = c.id === 'ladino' && m.markT > 0 ? 0.3 : 0;   // Ataque Oportunista
    const crit = readyCrit > 0 || rand() < (combo >= 10 ? 0.2 : 0.12) + (c.crit ?? 0) + steady + opportunist;
    const ready = readyCrit > 0 ? readyMult : 1;
    if (readyCrit > 0) { readyCrit = 0; readyMult = 1; }
    const bonus = (boss && c.bossBonus ? 1 + c.bossBonus : 1) * buff.dmg * ready;
    hurtMob(m, rollDamage(w) * game.power() * (1 + Math.min(combo - 1, 10) * 0.05) * (crit ? 1.8 : 1) * bonus, from, crit);
  }
  // ---- class abilities: four active (keys 1-4) and the supreme one (R). Each is data (campaign_data
  // CLASSES): effects the engine plays in order. Cooldowns run on the game clock.
  const cds = [0, 0, 0, 0, 0];           // 0-3 active, 4 supreme
  let shield = { t: 0, red: 0 }, buff = { t: 0, dmg: 1, plan: false }, invul = 0, readyCrit = 0, readyMult = 1;
  let traps = [];
  const aimPoint = (target) => {
    if (target) return target.pos;
    const me = walker.state, dx = -Math.sin(me.yaw) * 4, dz = -Math.cos(me.yaw) * 4;
    return V(me.x + dx, me.feet, me.z + dz);
  };
  // ---- what each ability looks like ----
  const shots = [];                       // projectiles in flight: { mesh, from, to, t, dur, color, splash }
  const shotGeo = { orb: new THREE.SphereGeometry(0.35, 16, 12), arrow: new THREE.CylinderGeometry(0.04, 0.04, 1.4, 6).rotateX(Math.PI / 2) };
  function launch(kind, from, to, color, splash) {
    const mesh = new THREE.Mesh(shotGeo[kind], new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(2) }));
    mesh.position.copy(from);
    mesh.lookAt(to);
    scene.add(mesh);
    shots.push({ mesh, from: from.clone(), to: to.clone(), t: 0, dur: Math.max(0.12, from.distanceTo(to) / 45), color, splash, kind });
  }
  const bubble = new THREE.Mesh(new THREE.SphereGeometry(1.25, 28, 20), new THREE.MeshBasicMaterial({ color: '#9ad0ff', transparent: true, opacity: 0.22, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending }));
  const aura = new THREE.Mesh(new THREE.TorusGeometry(0.9, 0.06, 6, 40).rotateX(Math.PI / 2), new THREE.MeshBasicMaterial({ color: '#ffd76a', transparent: true, opacity: 0.8, depthWrite: false, blending: THREE.AdditiveBlending }));
  bubble.visible = aura.visible = false;
  scene.add(bubble, aura);
  const trapMeshes = [];
  function trapDisc(pos, r, color) {
    const m = new THREE.Mesh(new THREE.RingGeometry(r * 0.15, r, 40).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.35, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending }));
    m.position.copy(pos).setY(pos.y + 0.08);
    scene.add(m);
    return m;
  }
  function runEffect(e, target) {
    const me = walker.state, self = V(me.x, me.feet, me.z);
    switch (e.v) {
      case 'hit': {
        const center = e.at === 'self' ? self : aimPoint(target);
        if (!e.mult && !e.stun && !e.mark) break;
        for (const m of mobs) {
          if (['dead', 'dormant', 'rise', 'gone', 'retreat', 'yield'].includes(m.state) || m.ally) continue;
          if (m.pos.distanceTo(center) > (e.radius ?? 2)) continue;
          if (e.execute && !(m.boss && m.boss !== 'gm') && m.hp / m.def.hp < e.execute) { m.hp = 0; die(m); continue; }
          if (e.mult) hurtMob(m, rollDamage(cur()) * game.power() * e.mult * buff.dmg, center, false, { skill: game.cls.color });
          if (m.state !== 'dead') {
            if (e.stun && m.state !== 'yield') { if (m.boss) lane.visible = ring.visible = false; m.state = 'recover'; m.timer = e.stun; m.knock.set(0, 0, 0); }
            if (e.mark) { m.markT = e.mark; m.markMore = e.markMore ?? 1.15; }
            if (e.knock) { const d = m.pos.clone().sub(center).setY(0).normalize(); m.knock.copy(d).multiplyScalar(e.knock); }
          }
        }
        const col = game.cls.color ?? '#ffe9a0';
        if (e.at === 'aim' && game.cls.reach) launch(game.cls.id === 'arqueiro' ? 'arrow' : 'orb', V(me.x, me.feet + 1.5, me.z), V(center.x, center.y + 1, center.z), col, e.radius ?? 2);
        else {
          fx?.ring(V(center.x, center.y + 0.2, center.z), col, e.radius ?? 2, 0.45);
          fx?.burst(V(center.x, center.y + 0.6, center.z), { n: 26, color: col, speed: 6, up: 2, life: 0.5 });
        }
        if (e.stun) fx?.burst(V(center.x, center.y + 1.8, center.z), { n: 16, color: '#fff2a0', speed: 1.5, up: 0.5, gravity: 0, life: 0.9 });
        if (e.mark) fx?.ring(V(center.x, center.y + 2.2, center.z), '#ff6a5a', 1, 0.8);
        break;
      }
      case 'heal': game.healPct(e.pct); fx?.burst(V(me.x, me.feet + 0.3, me.z), { n: 40, color: '#7fe0b0', speed: 1.4, up: 1, rise: 4, gravity: -1, life: 1.3, size: 1.2 }); fx?.ring(V(me.x, me.feet + 0.1, me.z), '#7fe0b0', 3, 0.8); break;
      case 'shield': shield = { t: e.time, red: e.reduce }; bubble.material.color.set(game.cls.color ?? '#9ad0ff'); break;
      case 'buff': buff = { t: e.time, dmg: e.dmg ?? 1, plan: !!e.plan }; aura.material.color.set(game.cls.color ?? '#ffd76a'); break;
      case 'calm': {
        for (const m of mobs) if (!m.boss && m.pos.distanceTo(self) < e.radius) { m.calmUntil = now() + e.time; if (m.state === 'chase' || m.state === 'alert') m.state = 'return'; }
        fx?.burst(V(me.x, me.feet + 0.6, me.z), { n: 60, color: '#c8d0dc', speed: 4, up: 0.6, gravity: -0.4, life: 2, size: 2.2 });
        break;
      }
      case 'taunt': {
        for (const m of mobs) if (!m.boss && !['dead', 'dormant', 'rise', 'gone'].includes(m.state) && m.pos.distanceTo(self) < e.radius) { m.calmUntil = 0; m.state = 'chase'; m.timer = 0; }
        for (let k = 0; k < 3; k++) fx?.ring(V(me.x, me.feet + 0.2 + k * 0.4, me.z), '#ff5a3a', 4 + k * 3, 0.5 + k * 0.2);
        break;
      }
      case 'trap': { const tp = aimPoint(target).clone(); traps.push({ pos: tp, r: e.radius, t: e.time, dps: e.dps, slow: e.slow, mesh: trapDisc(tp, e.radius, game.cls.color ?? '#b0e07a') }); break; }
      case 'knock': {
        for (const m of mobs) { if (['dead', 'dormant', 'gone'].includes(m.state) || m.ally) continue; if (m.pos.distanceTo(self) < e.radius) m.knock.copy(m.pos.clone().sub(self).setY(0).normalize()).multiplyScalar(e.dist); }
        fx?.ring(V(me.x, me.feet + 0.3, me.z), '#ffffff', e.radius, 0.35);
        fx?.burst(V(me.x, me.feet + 0.3, me.z), { n: 30, color: '#e8e0c8', speed: 9, up: 0.4, gravity: 2, life: 0.4 });
        break;
      }
      case 'dash': {
        // a step along the view (forward for a positive distance, back for a negative one), only
        // onto solid floor at the same height; the walker is moved, the rest is the walker's own
        const L = Math.abs(e.dist ?? 0), fwd = (e.dist ?? 0) >= 0 ? 1 : -1;
        if (L) {
          const nx = me.x - fwd * Math.sin(me.yaw) * L, nz = me.z - fwd * Math.cos(me.yaw) * L;
          const fl = walker.floorAt(nx, nz, me.feet);
          if (Math.abs(fl - me.feet) < 1.5 && !biomes.noGo.some((f) => f(nx, nz, fl))) {
            for (let k = 0; k <= 6; k++) fx?.burst(V(me.x + (nx - me.x) * k / 6, me.feet + 0.8, me.z + (nz - me.z) * k / 6), { n: 4, color: game.cls.color ?? '#ffffff', speed: 0.6, up: 0.3, gravity: 0, life: 0.5 });
            walker.teleport({ x: nx, z: nz, feet: fl, yaw: me.yaw, pitch: -0.15 });
          }
        }
        if (e.ready) { readyCrit = 1; readyMult = e.mult ?? 1; fx?.burst(V(me.x, me.feet + 1.4, me.z), { n: 18, color: '#ffd76a', speed: 1, up: 0.5, gravity: 0, life: 0.8 }); }
        if (e.dist < 0) invul = 0.5;
        break;
      }
      case 'reveal': {
        const t = target ?? aimed;
        if (t) { hud.toast(`${t.def.name}: ${Math.max(0, Math.round(t.hp))}/${t.def.hp} de vida${t.boss ? ' · guardião' : ''}`, 'xp'); fx?.ring(V(t.pos.x, t.pos.y + 0.1, t.pos.z), '#7fe0b0', 2.5, 1); fx?.burst(V(t.pos.x, t.pos.y + 3, t.pos.z), { n: 20, color: '#7fe0b0', speed: 0.5, up: -1, gravity: 3, life: 1 }); }
        else hud.toast('Nada na mira para analisar.', 'xp');
        break;
      }
    }
  }
  function useAbility(slot) {
    if (game.busy || walker.state.flying) return;
    const cls = game.cls;
    const a = slot === 4 ? cls.ultimate : cls.abilities[slot];
    if (!a || cds[slot] > 0) return;
    cds[slot] = a.cd * (cls.id === 'mago' ? 0.9 : 1);
    const target = findAim();
    for (const e of a.fx) runEffect(e, target);
    sfx('craft');
    hud.toast(`${a.name}!`, slot === 4 ? 'epic' : 'loot');
    if (slot === 4) fx?.levelUp(V(walker.state.x, walker.state.feet + 0.2, walker.state.z));
  }
  const ability = () => useAbility(4);       // R: the supreme ability
  // a different character (or a new one) starts without the last one's cooldowns and effects
  function resetCharacter() {
    cds.fill(0); shield = { t: 0, red: 0 }; buff = { t: 0, dmg: 1, plan: false }; invul = 0; readyCrit = 0; readyMult = 1;
    for (const t of traps) scene.remove(t.mesh);
    traps = [];
    dropCombo();
  }

  function dropCombo() { if (combo) { combo = 0; hud.combo(0); } }
  function attack() {
    if (attackCd > 0 || game.busy || walker.state.flying) return;
    const PLAYER = cur();
    attackCd = PLAYER.cooldown;
    sfx('swing');
    slash.material.color.set(PLAYER.color);
    slash.scale.setScalar(PLAYER.range / 2.6);
    // swing toward the crosshair: the explorer turns to where the camera looks
    character.setHeading(walker.state.yaw);
    character.swing();
    slashT = 0.18;
    const me = walker.state;
    const target = findAim();
    if (PLAYER.reach) {
      // ranged: a beam to the aimed creature, or straight ahead to the full reach
      const tip = V(me.x, me.feet + 1.6, me.z);
      camera.getWorldDirection(camDir);
      const end = target ? V(target.pos.x, target.pos.y + target.model.height * 0.5, target.pos.z) : camera.position.clone().addScaledVector(camDir, PLAYER.reach);
      fireBeam(tip, end);
      if (target && target.pos.distanceTo(V(me.x, me.feet, me.z)) > PLAYER.range + target.model.radius) {
        strike(target, PLAYER, V(me.x, me.feet, me.z));
        return;
      }
    }
    const heading = walker.state.yaw;
    const fwd = V(-Math.sin(heading), 0, -Math.cos(heading));
    slash.position.set(me.x, me.feet + 1, me.z);
    slash.rotation.y = heading;
    const from = V(me.x, me.feet, me.z);
    for (const m of mobs) {
      if (['dead', 'dormant', 'rise', 'yield', 'gone', 'retreat'].includes(m.state) || m.ally) continue;
      const d = V(m.pos.x - me.x, 0, m.pos.z - me.z);
      const dist = d.length();
      if (dist > PLAYER.range + m.model.radius || Math.abs(m.pos.y - me.feet) > 3) continue;
      if (dist > 0.6 && d.normalize().dot(fwd) < PLAYER.cone) continue;
      strike(m, PLAYER, from);
    }
  }

  const now = () => performance.now() / 1000;

  // ---------- Game Master powers (used by gm.js) ----------
  const ringFx = new THREE.Mesh(new THREE.RingGeometry(0.9, 1, 64).rotateX(-Math.PI / 2),
    new THREE.MeshBasicMaterial({ color: '#ffd76a', transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending }));
  scene.add(ringFx);
  let ringFxT = 0, ringFxR = 1;
  function pulse(color, radius) {
    const me = walker.state;
    ringFx.material.color.set(color);
    ringFx.position.set(me.x, me.feet + 0.2, me.z);
    ringFxT = 0.6; ringFxR = radius;
  }
  function nearby(radius) {
    const me = walker.state;
    return mobs.filter((m) => m.state !== 'dead' && m.state !== 'dormant' && Math.hypot(m.pos.x - me.x, m.pos.z - me.z) < radius && Math.abs(m.pos.y - me.feet) < 8);
  }
  const gm = {
    setWeapon(id) { gmOn = id === 'gm'; character.setWeapon(gmOn ? 'gm' : 'cajado'); },
    ability,
    get weapon() { return cur(); },
    // Onda de Seiva: everything within the radius falls
    wave(radius = 18) {
      const me = walker.state, from = V(me.x, me.feet, me.z);
      const hit = nearby(radius);
      hit.forEach((m) => hurtMob(m, m.hp + 1, from));
      pulse('#9dffcf', radius);
      feedback('large');
      return hit.length;
    },
    // Acalmar: creatures stop hunting and go home for a while (the base of 'negotiate')
    calm(radius = 25, seconds = 30) {
      const hit = nearby(radius);
      for (const m of hit) { m.calmUntil = now() + seconds; if (!m.boss || m.state !== 'lurk') { m.state = 'return'; } }
      lane.visible = ring.visible = false;
      hud.boss(null);
      pulse('#7fd4ff', radius);
      return hit.length;
    },
    // Invocar: any creature or boss, a few metres in front of the explorer, on the current level
    summon(type) {
      const me = walker.state, r = Math.hypot(me.x, me.z);
      const here = levelOf(me.feet, r);
      if (!here) return null;
      const heading = me.yaw; // where the crosshair looks
      const x = me.x - Math.sin(heading) * 8, z = me.z - Math.cos(heading) * 8;
      const m = spawn(type, here.id, x, z, { temp: true, boss: CREATURES[type].boss ? 'gm' : undefined, state: 'chase' });
      m.yaw = heading + Math.PI;
      if (CREATURES[type].boss) hud.boss(CREATURES[type].name, 1);
      return m;
    },
    reviveBosses() {
      for (const b of Object.values(bosses)) { b.state = 'dormant'; b.hp = b.def.hp; b.pos.copy(b.home); b.model.root.visible = false; b.model.root.scale.setScalar(1); b.summoned = false; b.yielded = false; b.ally = false; }
      resetBosses();
    },
    clearSummons() {
      for (let i = mobs.length - 1; i >= 0; i--) if (mobs[i].temp) { scene.remove(mobs[i].model.root); mobs.splice(i, 1); }
      hud.boss(null);
    },
    creatures: Object.entries(CREATURES).map(([id, c]) => ({ id, name: c.name, boss: !!c.boss })),
  };

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
    const step = Math.min(l, speed * dt * (m.slowMul ?? 1));
    const nx = m.pos.x + (dx / l) * step, nz = m.pos.z + (dz / l) * step;
    const y = groundAt(m.biome, nx, nz);
    if (m.biome === 'fora' ? Math.hypot(nx, nz) < 150 || Math.abs(y) > 3 : Math.hypot(nx, nz) > DISK_R - 3 || y < m.level - 0.6) return 0;   // edge, water, lava, trunk
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
        if (!m.ally && m.sense && sameLevel && dist < CHASE_IN && !(m.calmUntil > now())) { m.state = 'alert'; m.timer = 0.35; }
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
          if (dist > 5 && dist < 18 && !rulesOf(m).stationary) { m.state = 'chargeWind'; m.timer = 0.9; m.lock = V(dx / dist, 0, dz / dist); lane.visible = true; m.specialCd = 6; break; }
        }
        // reinforcements while the boss's mechanic allows (the Matriarca's pack while the ice stands)
        const sm = rulesOf(m).summon;
        if (sm) {
          m.summonT = (m.summonT ?? 4) - dt;
          const alive = mobs.filter((x) => x.temp && x.callerId === m.boss && x.state !== 'dead').length;
          if (m.summonT <= 0 && alive < sm.max) {
            m.summonT = sm.every;
            const s2 = spawn(sm.type, m.biome, m.pos.x + (rand() - 0.5) * 8, m.pos.z + (rand() - 0.5) * 8, { temp: true, callerId: m.boss, state: 'chase' });
            s2.sense = true;
            hud.toast(`${def.name} chama reforços!`);
          }
        }
        if (dist < reach && m.cooldown <= 0) { m.state = 'windup'; m.timer = m.boss ? 0.7 : 0.5; break; }
        const stop = def.range * 0.8 + m.model.radius * 0.5;
        if (dist > stop && !rulesOf(m).stationary) speed = move(m, dx, dz, def.speed, dt);
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
        if (!m.hitDone && sameLevel && dist < m.model.radius + 1) { m.hitDone = true; hurtPlayer(Math.round(def.damage * 1.5)); }
        if (m.timer <= 0 || speed === 0) { m.state = 'recover'; m.timer = 1.2; }
        break;
      case 'slamWind': {
        const k = 1 - Math.max(0, m.timer) / 1.2;
        ring.position.copy(m.pos).setY(m.pos.y + 0.1);
        ring.scale.setScalar(7 * k);
        windup = k;
        if (m.timer <= 0) {
          ring.visible = false;
          if (sameLevel && dist < 7 + 0.4) hurtPlayer(Math.round(def.damage * 1.8));
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
        if (sameLevel && dist < CHASE_IN * 0.7 && homeD < (m.boss ? BOSS_LEASH : LEASH) * 0.6 && !(m.calmUntil > now())) m.state = 'chase';
        break;
      case 'yield':                                          // kneeling, waiting for the choice
        windup = 1;
        break;
      case 'retreat':                                        // spared: goes back into its lair and vanishes
        face(m, m.home.x, m.home.z, dt);
        speed = move(m, m.home.x - m.pos.x, m.home.z - m.pos.z, def.speed * 0.6, dt);
        if (homeD < 2) { m.state = 'gone'; m.model.root.visible = false; }
        break;
      case 'lurk':                                           // a boss back home, waiting
        m.hp = Math.min(def.hp, m.hp + def.hp * 0.2 * dt);
        if (sameLevel && dist < 16) { m.state = 'chase'; hud.boss(def.name, m.hp / def.hp); }
        break;
      default: break;
    }
    const regen = rulesOf(m).regen;
    if (regen && m.state !== 'yield' && m.state !== 'dead') m.hp = Math.min(def.hp, m.hp + def.hp * regen * dt);
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
    const info = game.bossList.find((x) => x.id === id);
    hud.banner(info?.kind === 'sub' ? 'Subchefe' : 'Guardião do andar', b.def.name,
      game.bossTier(id) > cur().tier ? 'Sua arma é fraca demais: crie a arma deste andar na bancada' : 'Ataque, encadeie golpes e esquive do que brilhar em vermelho', 'boss');
    sfx('boss');
    feedback('large');
  }
  // what the player chose for a yielded boss
  function applyOutcome(id, how) {
    const b = bosses[id];
    if (!b) return;
    hud.boss(null);
    if (how === 'destruir') { if (b.state !== 'dead') { b.state = 'chase'; b.yielded = true; die(b); } return; }
    b.yielded = true;
    b.hp = b.def.hp;
    if (how === 'poupar') { b.state = 'retreat'; return; }
    // restored or negotiated: it stays as a guardian that no longer fights the explorer
    b.ally = true;
    b.state = 'idle';
    b.model.root.visible = true;
  }
  game.onBossOutcome(applyOutcome);
  // hunting objectives point at the nearest living creature of that place (never the camp)
  game.setMobFinder((biome) => {
    const me = walker.state;
    let best = null, bd = Infinity;
    for (const m of mobs) {
      if (m.boss || m.temp || m.biome !== biome || ['dead', 'dormant'].includes(m.state)) continue;
      const d = Math.hypot(m.pos.x - me.x, m.pos.z - me.z);
      if (d < bd) { bd = d; best = m; }
    }
    return best ? best.pos.clone().setY(best.pos.y + 1) : null;
  });
  // a saved game: put each resolved boss where the player's choice left it
  function syncBossesWithStory() {
    for (const [id, b] of Object.entries(bosses)) {
      const how = game.bossChoice(id);
      if (!how) continue;
      if (how === 'destruir') { b.state = 'dead'; b.model.root.visible = false; }
      else if (how === 'poupar') { b.state = 'gone'; b.model.root.visible = false; }
      else { b.ally = true; b.state = 'idle'; b.pos.copy(b.home); b.model.root.visible = true; }
      b.yielded = true;
    }
  }

  function resetBosses() {
    for (const b of Object.values(bosses)) {
      if (b.state === 'dead' || b.state === 'gone' || b.ally || game.bossChoice(b.boss)) continue;
      b.yielded = false;
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
    hud.skills(game.cls, cds);
    shield.t -= dt; buff.t -= dt; if (buff.t <= 0) { buff.dmg = 1; buff.plan = false; } invul -= dt;
    for (let i = 0; i < cds.length; i++) cds[i] = Math.max(0, cds[i] - dt);
    traps = traps.filter((t) => { t.t -= dt; if (t.t > 0) { t.mesh.material.opacity = 0.25 + Math.sin(performance.now() / 150) * 0.1; return true; } scene.remove(t.mesh); t.mesh.geometry.dispose(); return false; });
    for (let i = shots.length - 1; i >= 0; i--) {
      const sh = shots[i];
      sh.t += dt;
      const k = Math.min(1, sh.t / sh.dur);
      sh.mesh.position.lerpVectors(sh.from, sh.to, k);
      if (sh.kind === 'orb') fx?.burst(sh.mesh.position, { n: 2, color: sh.color, speed: 0.4, up: 0.2, gravity: 0, life: 0.35 });
      if (k >= 1) {
        fx?.ring(V(sh.to.x, sh.to.y - 0.8, sh.to.z), sh.color, sh.splash, 0.45);
        fx?.burst(sh.to, { n: 34, color: sh.color, speed: 7, up: 2, life: 0.55, size: 1.3 });
        scene.remove(sh.mesh); sh.mesh.material.dispose();
        shots.splice(i, 1);
      }
    }
    const mp = walker.state;
    bubble.visible = shield.t > 0;
    if (bubble.visible) { bubble.position.set(mp.x, mp.feet + 1, mp.z); bubble.material.opacity = 0.16 + Math.sin(performance.now() / 120) * 0.05; }
    aura.visible = buff.t > 0;
    if (aura.visible) { aura.position.set(mp.x, mp.feet + 0.12, mp.z); aura.rotation.y += dt * 3; aura.scale.setScalar(1 + Math.sin(performance.now() / 200) * 0.1); }
    for (const m of mobs) { m.slowMul = 1; if (m.markT > 0) m.markT -= dt; }
    for (const tr of traps) for (const m of mobs) {
      if (['dead', 'dormant', 'rise', 'gone', 'retreat'].includes(m.state) || m.ally) continue;
      if (m.pos.distanceTo(tr.pos) < tr.r) {
        m.slowMul = 1 - tr.slow;
        m.trapAcc = (m.trapAcc ?? 0) + dt;
        if (m.trapAcc >= 0.5 && !m.boss) { m.trapAcc = 0; hurtMob(m, tr.dps * 0.5 * game.power() * (1 + 0.28 * cur().tier), tr.pos, false, { quiet: true }); }
      }
    }
    comboT -= dt;
    if (comboT <= 0 && combo) dropCombo();
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
        // creatures come back after 30 s at their home, unless the explorer is standing right there
        if (!m.boss && !m.temp && m.timer > 30 && Math.hypot(m.home.x - me.x, m.home.z - me.z) > 25) { m.hp = m.def.hp; m.pos.copy(m.home); m.state = 'idle'; m.model.root.visible = true; m.model.root.scale.setScalar(1); }
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
      if (m.boss && !m.ally && !m.yielded && m.state !== 'lurk' && m.state !== 'return') fighting = m;
    }
    setBattle(!!fighting);
    if (fighting) hud.boss(fighting.def.name, Math.max(0, fighting.hp) / fighting.def.hp);
    else if (!game.busy) hud.boss(null);

    ringFxT -= dt;
    if (ringFxT > 0) { const k = 1 - ringFxT / 0.6; ringFx.scale.setScalar(Math.max(0.01, ringFxR * k)); ringFx.material.opacity = 0.8 * (1 - k); }
    else ringFx.material.opacity = 0;
    aimed = game.busy ? null : findAim();
    hud.aim(aimed ? { name: aimed.def.name, frac: Math.max(0, aimed.hp) / aimed.def.hp } : null, !!cur().reach);
    beamT -= dt;
    beam.material.opacity = Math.max(0, beamT / 0.18) * 0.9;
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

  function dodge() {
    if (game.busy || !walker.dodge(game.cls.dodgeCd)) return;
    fx?.dodge(V(walker.state.x, walker.state.feet + 0.5, walker.state.z));
    character.roll();
    sfx('dodge');
  }
  return {
    dodge, ability, useAbility, resetCharacter,
    update, attack, shake, resetBosses, gm, syncBossesWithStory,
    debug: {
      mobs, bosses, wake,
      killBoss(id) { const b = bosses[id]; if (b.state === 'dormant') wake(id); b.state = 'chase'; hurtMob(b, b.hp + 1, b.pos.clone().add(V(0, 0, 1))); },
      hurtMob,
    },
  };
}

// Oliveira Colossal: entry point. Builds the world once, then runs one animation loop
// that either orbits the tree or walks (or flies) the player through it.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { createEnvironment, QUALITY } from './environment.js';
import { createTextures } from './textures.js';
import { addWind, windUniforms } from './wind.js';
import { buildTrunk } from './tree/trunk.js';
import { buildCanopy, singleLeafGeometry } from './tree/canopy.js';
import { buildWalkways } from './walkways.js';
import { buildLandscape } from './landscape.js';
import { buildBiomes } from './biomes/index.js';
import { createParticles } from './particles.js';
import { createWalker } from './player.js';
import { createInput } from './input.js';
import { createCharacter } from './character.js';
import { createGame } from './game/game.js';
import { createFx } from './fx.js';
import { createParty } from './party.js';
import { toonify } from './toon.js';
import { startAudio, toggleMute, isMuted, sfx } from './audio.js';
import { CLASSES as CLASSES_PLAN, APPEARANCE, DEFAULT_APPEARANCE, STYLES } from './game/campaign_data.js';
import { STAGES, RECIPES } from './game/campaign_data.js';
import { createHud } from './game/hud.js';
import { createCombat } from './game/combat.js';
import { createGM } from './game/gm.js';
import {
  TRUNK, ringR, strandR, strandTheta,
  RAMP, GALLERY, BIOMES, LOOKOUT, TOP_BRIDGES, ENTRANCES, APPROACH, ROUTES, DISK_R, levelBridges, junctionAngle,
  rampAt, rampStart,
} from './tree/layout.js';

const $ = (id) => document.getElementById(id);
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const coarse = matchMedia('(pointer: coarse)').matches;

const env = createEnvironment($('scene'));
const { renderer, scene, camera } = env;
Object.assign(window, { renderer, scene }); // for the smoke check and console debugging

const ORBIT_HOME = { pos: new THREE.Vector3(1500, 650, 1150), target: new THREE.Vector3(0, 320, 0) };
const orbit = new OrbitControls(camera, renderer.domElement);
camera.position.copy(ORBIT_HOME.pos);
orbit.target.copy(ORBIT_HOME.target);
orbit.enableDamping = true;
orbit.autoRotate = !reduceMotion;
orbit.autoRotateSpeed = 0.25;
orbit.minDistance = 120;
orbit.maxDistance = 6000;
orbit.maxPolarAngle = THREE.MathUtils.degToRad(92);

let qualityIndex = coarse ? 0 : 1;
env.setQuality(QUALITY[qualityIndex]);
addEventListener('resize', env.resize);

let world = null;
let mode = 'orbit';
let windOn = true;
let windLevel = reduceMotion ? 0.3 : 1;

function buildWorld() {
  const tex = createTextures(renderer);
  const barkProps = { color: '#a89a88', map: tex.bark, normalMap: tex.barkNormal, normalScale: new THREE.Vector2(1.4, 1.4), roughness: 0.93 };
  const mats = {
    bark: addWind(new THREE.MeshStandardMaterial(barkProps)),
    barkStatic: new THREE.MeshStandardMaterial(barkProps),
    leaf: addWind(new THREE.MeshStandardMaterial({ color: '#9aa48a', side: THREE.DoubleSide, roughness: 0.7 }), { flutter: true, silverBack: true }),
    olive: addWind(new THREE.MeshStandardMaterial({ roughness: 0.35 })),
    planks: new THREE.MeshStandardMaterial({ map: tex.planks, normalMap: tex.planksNormal, roughness: 0.85, side: THREE.DoubleSide }),
    wood: new THREE.MeshStandardMaterial({ color: '#5c4129', roughness: 0.8 }),
    woodDouble: new THREE.MeshStandardMaterial({ color: '#5c4129', roughness: 0.8, side: THREE.DoubleSide }),
    rope: new THREE.MeshStandardMaterial({ color: '#b59b6c', roughness: 1 }),
    trail: new THREE.MeshStandardMaterial({ map: tex.trail, roughness: 1, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -3 }),
    trailDirt: new THREE.MeshStandardMaterial({ map: tex.trail, color: '#c9b28c', roughness: 1, polygonOffset: true, polygonOffsetFactor: -3 }),
    trailSand: new THREE.MeshStandardMaterial({ map: tex.trail, color: '#f0c99a', roughness: 1, polygonOffset: true, polygonOffsetFactor: -3 }),
    trailSnow: new THREE.MeshStandardMaterial({ map: tex.trail, color: '#b9c6d9', roughness: 0.9, polygonOffset: true, polygonOffsetFactor: -3 }),
    terrain: new THREE.MeshStandardMaterial({ vertexColors: true, map: tex.terrainDetail, roughness: 0.95 }),
    slabUnder: new THREE.MeshStandardMaterial({ color: '#3a3326', map: tex.bark, roughness: 1, side: THREE.DoubleSide }),
    stone: new THREE.MeshStandardMaterial({ color: '#9b958a', roughness: 0.9 }),
    // walkable raised paths over lava: double-sided so the floor ray finds them from above
    basalt: new THREE.MeshStandardMaterial({ color: '#3a3330', roughness: 0.9, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -3 }),
    ground: new THREE.MeshStandardMaterial({ vertexColors: true, map: tex.groundDetail, roughness: 1 }),
  };
  tex.groundDetail.repeat.set(1400, 1400);

  const tree = new THREE.Group();
  tree.name = 'olive-tree';
  scene.add(tree);
  const trunk = buildTrunk(tree, mats.bark);
  const canopy = buildCanopy(tree, trunk, mats);
  canopy.setFoliage(QUALITY[qualityIndex].foliage);
  const paths = buildWalkways(scene, mats);
  buildLandscape(scene, mats);
  const biomes = buildBiomes(scene, mats);
  const updateParticles = createParticles(scene, singleLeafGeometry(), mats.leaf, canopy.tipPoints);
  const walker = createWalker({ walkables: paths.walkables.concat(biomes.walkables), rootMeshes: trunk.rootMeshes, rootSegs: trunk.rootSegs, noGo: biomes.noGo });
  const character = createCharacter();
  character.root.visible = false;
  scene.add(character.root);
  const hud = createHud($('hud'));
  const fx = createFx(scene, reduceMotion);
  const game = createGame({ scene, biomes, walker, hud, fx });
  // the seals: the walker cannot step through a locked floor's ramp or the trunk's mouth
  biomes.noGo.push((x, z, fl) => !!game.blockedAt(x, z, fl));
  // big trunks, rocks and crystals of every floor are solid too; any that would sit on top of
  // something you must reach (a villager, a bench, a quest object, a resource) is left out
  const reach = game.debug.items.filter((i) => i.radius > 0);
  let solidCount = 0;
  for (const [id, list] of Object.entries(biomes.obstacles ?? {})) {
    const y = id === 'fora' ? 0 : (BIOMES.find((b) => b.id === id)?.level ?? 0);
    for (const o of list) {
      if (reach.some((i) => Math.abs(i.pos.y - 1 - y) < 12 && Math.hypot(i.pos.x - o.x, i.pos.z - o.z) < o.r + 1.6)) continue;
      walker.addObstacle(o.x, o.z, o.r, y - 2, y + 25);
      solidCount++;
    }
  }
  window.__solidCount = solidCount;
  const combat = createCombat({ scene, camera, walker, character, biomes, game, hud, reduceMotion, fx });
  game.onFaint(() => combat.resetBosses());
  // crafted gear shows on the explorer: the weapon recolours the staff, the outfit the clothes
  game.onGear((w, o) => { character.setWeaponLook(w.look, w.tier); character.setOutfit(o?.look ?? null); });
  // the class's weapon in hand and the character's own look (chosen at creation)
  game.onIdentity((s) => {
    character.setAppearance({ ...s.appearance, hat: CLASSES_PLAN[s.cls]?.look.hat });
    character.setClass(s.cls);
    character.setStyle({ top: s.appearance.top, head: s.appearance.head, hair: s.appearance.hairStyle });
    toonify(character.root, { outline: true });      // new parts (class gear, clothes) join the cartoon look
  });

  $('sHeight').textContent = `${Math.round(canopy.maxY)} m`;
  $('sCrown').textContent = `${(canopy.crownR * 2 / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} km`;
  $('sPaths').textContent = `${((paths.totalLength + biomes.trailLength) / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} km`;
  const gm = createGM({ root: $('gmPanel'), game, combat, hud, isJourney: () => journey && mode === 'walk' });
  // the cartoon look: banded light everywhere, an outline on every character
  toonify(scene);
  const people = [];
  scene.traverse((o) => { if (o.userData.character) people.push(o); });
  for (const o of people) toonify(o, { outline: true });
  return { walker, character, canopy, game, hud, combat, gm, fx, updateParticles, updateBiomes: biomes.update, paths: biomes.paths };
}

// ---------- places you can jump to ----------
const yawToward = (dx, dz) => Math.atan2(-dx, -dz);
const at = (r, a) => ({ x: Math.cos(a) * r, z: Math.sin(a) * r });
// arriving on a level: just inside its first bridge, looking toward the middle
// arriving on a level: just inside its first bridge (or a trunk entrance on the ground),
// with the camera behind the explorer looking toward the landmark in the middle
const onLevel = (b) => () => {
  const a = b.level === 0 ? ENTRANCES[0] : levelBridges(b.level)[0];
  const p = at(b.level === 0 ? 88 : DISK_R - 6, a);
  return { ...p, feet: b.level + 0.5, yaw: yawToward(-p.x, -p.z), pitch: -0.18, label: `${Math.round(b.level)} m · ${b.name}` };
};
const PLACES = {
  fora() {
    const p = at(955, APPROACH.angle);
    return { ...p, feet: 0, yaw: yawToward(-p.x, -p.z), pitch: 0.05, label: 'Clareira de Aetherion' };
  },
  trilha() {
    const p = at(700, APPROACH.angle);
    return { ...p, feet: 0, yaw: yawToward(-p.x, -p.z), pitch: 0.2, label: 'Trilha de chegada' };
  },
  entrada() {
    const p = at(230, ENTRANCES[0]);
    return { ...p, feet: 0, yaw: yawToward(-p.x, -p.z), pitch: 0.05, label: 'Entrada entre as raízes' };
  },
  ...Object.fromEntries(BIOMES.map((b) => [b.id, onLevel(b)])),
  rampa() {
    const { a, y } = rampAt(0.62);
    const p = at(70, a);
    return { ...p, feet: y, yaw: yawToward(-Math.sin(a), Math.cos(a)) + 0.5, pitch: 0.1, label: `Rampa · ${Math.round(y)} m` };
  },
  mirante() {
    const a = TOP_BRIDGES[0], p = at(LOOKOUT.centre + 4, a);
    return { ...p, feet: RAMP.top, yaw: yawToward(Math.cos(a), Math.sin(a)), pitch: 0.05, label: 'Mirante · 300 m' };
  },
};

function goTo(name) {
  // in the journey, the seals decide: you can only jump to floors you have unlocked
  const floorIdx = BIOMES.findIndex((b) => b.id === name);
  // the ramp and the lookout sit above every seal: only in free exploration (or for the GM)
  if (journey && (name === 'rampa' || name === 'mirante') && !world.gm?.on) { world.hud.toast('Durante a jornada, a rampa e o mirante só se alcançam a pé.', 'xp'); return; }
  if (journey && floorIdx >= 0 && world && floorIdx >= world.game.openFloors()) {
    world.hud.toast('Este andar está selado. Suba de nível e vença o guardião do andar anterior.', 'xp');
    return;
  }
  const spot = PLACES[name]();
  world.walker.teleport(spot); // hard cut: no smoothing to whip across the map
  $('place').textContent = spot.label;
  $('places').hidden = true;
  $('bPlaces').setAttribute('aria-expanded', 'false');
}
function enterWalk(name = 'trilha') {
  if (!world) return;
  mode = 'walk';
  orbit.enabled = false;
  world.character.root.visible = true;
  document.body.classList.add('walking');
  goTo(name);
}
function exitWalk() {
  mode = 'orbit';
  orbit.enabled = true;
  camera.position.copy(ORBIT_HOME.pos);
  orbit.target.copy(ORBIT_HOME.target);
  document.body.classList.remove('walking', 'journey');
  if (world) { world.character.root.visible = false; if (journey) world.game.save(); }
  journey = false;
  input.releaseLock();
  setFly(false);
}
function setFly(on) {
  if (!world) return;
  if (on && journey && !world.gm?.on) { world.hud.toast('Na jornada não se voa: suba pelas rampas e abra os selos.', 'xp'); return; }
  world.walker.setFlying(on);
  $('bFly').setAttribute('aria-pressed', String(on));
  document.body.classList.toggle('flying', on);
}

const input = createInput(renderer.domElement, $('joy'), $('knob'), {
  isWalking: () => mode === 'walk',
  onLook: (dx, dy) => world?.walker.look(dx, dy),
});
addEventListener('keydown', (e) => {
  if (mode !== 'walk' || !world) return;
  const g = world.game, h = world.hud;
  if (journey && h.dialogueOpen) {
    // dialogue box: number keys pick a choice, Enter / Space / E continue
    const n = Number(e.key);
    if (n >= 1 && n <= 9) { h.pick(n - 1); e.preventDefault(); return; }
    if (['Enter', 'Space', 'KeyE'].includes(e.code) && !e.repeat) { h.pick(0); e.preventDefault(); return; }
  }
  if (e.repeat) return;
  if (e.code === 'KeyF') setFly(!world.walker.state.flying);
  if (!journey) return;
  if (e.code === 'KeyE') g.interact();
  if (e.code === 'KeyJ' || (e.code === 'Space' && !world.walker.state.flying)) { world.combat.attack(); e.preventDefault(); }
  if ((e.code === 'KeyC' || e.code === 'ControlLeft') && !e.repeat) { world.combat.dodge(); e.preventDefault(); }
  if (e.code === 'KeyR' && !e.repeat && journey) { world.combat.useAbility(4); e.preventDefault(); }
  if (/^Digit[1-4]$/.test(e.code) && !e.repeat && journey) { world.combat.useAbility(Number(e.code.slice(-1)) - 1); e.preventDefault(); }
  if (e.code === 'KeyM' && !e.repeat) setMute(toggleMute());
  if (e.code === 'KeyQ') g.drink();
  if (e.code === 'KeyI') h.toggleBag();
});
// a quick click (or tap) without dragging attacks; a drag turns the camera
{
  let down = null;
  renderer.domElement.addEventListener('pointerdown', (e) => { down = { x: e.clientX, y: e.clientY, t: performance.now() }; });
  renderer.domElement.addEventListener('pointerup', (e) => {
    if (!down || mode !== 'walk' || !journey || !world) return;
    const moved = Math.hypot(e.clientX - down.x, e.clientY - down.y), held = performance.now() - down.t;
    if ((moved < 6 && held < 300) || document.pointerLockElement === renderer.domElement) world.combat.attack();
    down = null;
  });
}
// mouse wheel / trackpad pinch: move the third-person camera closer or further
renderer.domElement.addEventListener('wheel', (e) => {
  if (mode !== 'walk' || !world) return;
  e.preventDefault();
  world.walker.zoom(e.deltaY * 0.0015);
}, { passive: false });

// ---------- friends: the group panel, pings and the shared guardians ----------
let party = null;
function partyState() {
  const s = world.walker.state;
  return { ...world.game.partySnapshot(), x: s.x, z: s.z, feet: s.feet, yaw: s.yaw };
}
function renderParty(members, code) {
  $('partyIdle').hidden = !!code;
  $('partyIn').hidden = !code;
  if (!code) return;
  $('partyCodeText').textContent = code.replace(/^aeth-/, '');
  const list = $('partyList');
  list.innerHTML = '';
  for (const m of members) {
    const li = document.createElement('li');
    if (m.mine) li.className = 'me';
    const name = document.createElement('b');
    name.textContent = `${m.mine ? 'Você · ' : ''}${m.name ?? 'Alguém'}`;
    const info = document.createElement('small');
    info.textContent = `${CLASSES_NAME[m.cls] ?? ''} · nível ${m.level ?? 1} · ${m.place === 'fora' ? 'fora da árvore' : `andar ${(['fora', ...REGION_ORDER].indexOf(m.place))}`}${m.mine ? '' : ` · ${Math.round(m.dist ?? 0)} m`}`;
    const bar = document.createElement('div'); bar.className = 'bar'; bar.innerHTML = '<i></i>';
    bar.firstChild.style.width = `${Math.max(0, Math.min(100, m.hp ?? 0))}%`;
    li.append(name, info, bar);
    if (!m.mine && m.place === world.game.partySnapshot().place) {
      const go = document.createElement('button');
      go.type = 'button'; go.textContent = 'Ir até';
      go.onclick = () => {
        const f = [m.x, m.z, m.feet].every((v) => Number.isFinite(v) && Math.abs(v) < 2000) ? m : null;
        if (!f) return;
        if (world.game.blockedAt(f.x, f.z, f.feet)) { world.hud.toast('Seu amigo está além de um selo que você ainda não abriu.', 'xp'); return; }
        world.walker.teleport({ x: f.x + 2, z: f.z + 2, feet: f.feet, yaw: 0, pitch: -0.15 });
        $('party').hidden = true;
      };
      li.append(go);
    }
    list.append(li);
  }
}
const REGION_ORDER = ['raizes', 'deserto', 'oceano', 'fornalha', 'niveria', 'selva', 'pantano', 'cristais', 'suspensa', 'copa'];
function markPing(p) {
  const floor = world.walker.floorAt(p.x, p.z, world.walker.state.feet);
  world.fx.ring(V3(p.x, floor + 0.2, p.z), '#ffd76a', 5, 2.2);
  world.hud.toast(`${p.name} marcou um ponto`, 'xp');
  sfx('quest');
}
const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
async function connectParty() {
  party = await createParty({
    scene, getState: partyState, walker: world.walker,
    onBoss: (id, how) => { world.game.remoteBoss(id, how); world.combat.syncBossesWithStory(); },
    onMembers: renderParty,
    onPing: markPing,
  });
  if (!party.available) return;
  world.party = party;
  world.game.onBossEvent((id, how) => party.bossDown(id, how));
  $('bParty').hidden = false;
}
function partyErr(msg) { $('partyErr').textContent = msg; $('partyErr').hidden = !msg; }
$('bParty').onclick = () => { const open = $('party').hidden; $('party').hidden = !open; $('bParty').setAttribute('aria-expanded', String(open)); };
$('partyClose').onclick = () => { $('party').hidden = true; $('bParty').setAttribute('aria-expanded', 'false'); };
$('partyNew').onclick = async () => {
  const code = Math.random().toString(36).slice(2, 8);
  try { partyErr(''); await party.join(code); } catch { partyErr('Não foi possível criar o grupo agora. Tente de novo.'); }
};
$('partyJoin').onclick = async () => {
  const code = $('partyCode').value.trim().toLowerCase();
  try { partyErr(''); await party.join(code); $('partyCode').value = ''; } catch { partyErr('Código inválido. Use letras e números (4 a 12).'); }
};
$('partyLeave').onclick = () => party.leave();
$('partyPing').onclick = () => pingHere();
$('partyCopy').onclick = () => { navigator.clipboard?.writeText($('partyCodeText').textContent).catch(() => {}); world.hud.toast('Código copiado', 'xp'); };
function pingHere() {
  if (!party?.code) return;
  const s = world.walker.state;
  party.ping({ x: s.x, z: s.z, name: world.game.state.name });
  markPing({ x: s.x, z: s.z, name: 'Você' });
}

// ---------- the objective marker: over its target, or an arrow on the edge of the screen ----------
const markerV = new THREE.Vector3();
function placeMarker() {
  const tp = world.game.targetPoint?.();
  if (!tp) { world.hud.marker(null); return; }
  markerV.set(tp.x, tp.y + 2.2, tp.z).project(camera);
  const W = innerWidth, H = innerHeight, cx = W / 2, cy = H / 2;
  let sx = (markerV.x * 0.5 + 0.5) * W, sy = (-markerV.y * 0.5 + 0.5) * H;
  const behind = markerV.z > 1;
  const onScreen = !behind && sx > 40 && sx < W - 40 && sy > 90 && sy < H - 180;
  const dist = Math.hypot(tp.x - world.walker.state.x, tp.z - world.walker.state.z, tp.y - world.walker.state.feet);
  if (!onScreen) {
    let dx = sx - cx, dy = sy - cy;
    if (behind) { dx = -dx; dy = -dy; }
    const k = Math.min((W / 2 - 48) / (Math.abs(dx) || 1e-6), (H / 2 - 120) / (Math.abs(dy) || 1e-6));
    sx = cx + dx * k; sy = cy + dy * k;
    world.hud.marker(sx, sy, false, Math.atan2(dy, dx), dist);
  } else world.hud.marker(sx, sy, true, 0, dist);
}

// ---------- UI ----------
let journey = false;
// slot = which of the four characters (0-3); profile = a new character's name and class
function startJourney(slot, profile = null) {
  if (!world) return;
  startAudio();
  journey = true;
  document.body.classList.add('journey');
  $('slots').hidden = true;
  enterWalk('fora');
  world.hud.reset();
  world.game.start(slot, profile);
  world.combat.resetCharacter?.();
  setFly(false);
  world.game.setSeals(true);
  // a new character brings every boss back; a continued one puts them where its choices left them
  if (profile) world.combat.gm.reviveBosses(); else world.combat.resetBosses();
  world.combat.syncBossesWithStory();
}

// ---------- the four character slots (with the five classes of the manual) ----------
const CLASS_KEYS = ['guerreiro', 'mago', 'sabio', 'ladino', 'arqueiro'];
const CLASS_COLOR = { guerreiro: '#ff8a5a', mago: '#9a8aff', sabio: '#7fe0b0', ladino: '#c0c0d0', arqueiro: '#b0e07a' };
let pickedClass = null;
function renderSlots() {
  const grid = $('slotGrid');
  grid.innerHTML = '';
  const profiles = world.game.profiles();
  profiles.forEach((p, n) => {
    const el = document.createElement('div');
    el.className = `slot ${p ? 'filled' : 'empty'}`;
    if (p) {
      el.innerHTML = `<b></b><small></small><div class="row"><button class="primary" type="button">Continuar</button><button type="button" data-del>Apagar</button></div>`;
      el.querySelector('b').textContent = `${p.name} · ${CLASSES_NAME[p.cls] ?? p.cls}`;
      el.querySelector('small').textContent = `Nível ${p.level} · ${p.place}${p.done ? ' · campanha concluída' : ''}`;
      el.querySelector('.primary').onclick = () => startJourney(n);
      el.querySelector('[data-del]').onclick = () => {
        if (!window.confirm(`Apagar ${p.name}? O progresso dessa vaga some.`)) return;
        world.game.deleteSlot(n); renderSlots();
      };
    } else {
      el.innerHTML = `<small>Vaga ${n + 1} livre</small><button class="primary" type="button">Criar personagem</button>`;
      el.querySelector('button').onclick = () => openNewCharacter(n);
    }
    grid.append(el);
  });
}
const CLASSES_NAME = { guerreiro: 'Guerreiro', mago: 'Mago', sabio: 'Sábio', ladino: 'Ladino', arqueiro: 'Arqueiro' };
let newSlot = 0;
function openNewCharacter(n) {
  newSlot = n;
  pickedClass = null;
  pickedLook = { ...DEFAULT_APPEARANCE };
  $('pName').value = '';
  renderLooks();
  $('pickTitle').textContent = `Novo personagem · vaga ${n + 1}`;
  $('classPick').hidden = false;
  $('slotGrid').hidden = true;
  $('slotsFoot').hidden = true;
  const box = $('classes');
  box.innerHTML = '';
  for (const k of CLASS_KEYS) {
    const c = CLASSES_PLAN[k];
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'cls';
    b.setAttribute('aria-pressed', 'false');
    b.style.setProperty('--cls', CLASS_COLOR[k]);
    b.innerHTML = `<b></b><small></small><em></em><ul class="abil"></ul>`;
    b.querySelector('b').textContent = c.name;
    b.querySelector('small').textContent = `${c.title} · ${c.role}`;
    b.querySelector('em').textContent = `Arma: ${WEAPON_NAME[c.weapon] ?? c.weapon}. ${c.passive}`;
    const ul = b.querySelector('ul');
    for (const a of [...c.abilities, c.ultimate]) { const li = document.createElement('li'); li.textContent = `${a.name}${a === c.ultimate ? ' (R)' : ''}: ${a.text}`; ul.append(li); }
    b.onclick = () => { pickedClass = k; box.querySelectorAll('.cls').forEach((x) => x.setAttribute('aria-pressed', String(x === b))); checkGo(); updatePreview(); };
    box.append(b);
  }
  checkGo();
  updatePreview();
  $('pName').focus();
}
let pickedLook = { ...DEFAULT_APPEARANCE };
const WEAPON_NAME = { espada: 'espada e escudo', cajado: 'cajado de seiva', livro: 'livro de campo', adagas: 'duas adagas', arco: 'arco e aljava' };
function renderLooks() {
  const box = $('looks');
  box.innerHTML = '';
  const styleRows = [['top', 'Roupa'], ['head', 'Cabeça'], ['hairStyle', 'Penteado']];
  for (const [k, label] of styleRows) {
    const row = document.createElement('div');
    row.className = 'lrow';
    row.innerHTML = `<span>${label}</span>`;
    for (const [id, name] of STYLES[k]) {
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'chip'; b.textContent = name;
      b.setAttribute('aria-pressed', String(pickedLook[k] === id));
      b.onclick = () => { pickedLook[k] = id; renderLooks(); updatePreview(); };
      row.append(b);
    }
    box.append(row);
  }
  const rows = [['skin', 'Pele'], ['hair', 'Cor do cabelo'], ['shirt', 'Cor da roupa'], ['pants', 'Calça']];
  for (const [k, label] of rows) {
    const row = document.createElement('div');
    row.className = 'lrow';
    row.innerHTML = `<span>${label}</span>`;
    for (const col of APPEARANCE[k]) {
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'sw'; b.style.background = col;
      b.setAttribute('aria-label', `${label} ${col}`);
      b.setAttribute('aria-pressed', String(pickedLook[k] === col));
      b.onclick = () => { pickedLook[k] = col; renderLooks(); updatePreview(); };
      row.append(b);
    }
    box.append(row);
  }
}
// ---------- the live preview of the character being made: a small renderer of its own ----------
let preview = null;
function updatePreview() {
  if (!preview) {
    const canvas = $('pPreview');
    const r = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    r.setPixelRatio(Math.min(2, devicePixelRatio));
    r.toneMapping = THREE.ACESFilmicToneMapping;
    r.outputColorSpace = THREE.SRGBColorSpace;
    const sc = new THREE.Scene();
    sc.add(new THREE.HemisphereLight('#fff4e0', '#3a3020', 2.2));
    const sun = new THREE.DirectionalLight('#ffffff', 2.4); sun.position.set(2, 4, 3); sc.add(sun);
    const cam = new THREE.PerspectiveCamera(32, 1, 0.1, 50);
    cam.position.set(0, 1.25, 4.4); cam.lookAt(0, 0.95, 0);
    const disc = new THREE.Mesh(new THREE.CircleGeometry(0.9, 40).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: '#3a3424', transparent: true, opacity: 0.6 }));
    sc.add(disc);
    preview = { r, sc, cam, ch: null, raf: 0 };
  }
  const p = preview;
  if (p.ch) p.sc.remove(p.ch.root);
  p.ch = createCharacter({ name: 'preview', light: false });
  p.ch.setAppearance({ ...pickedLook, hat: CLASSES_PLAN[pickedClass ?? 'guerreiro']?.look.hat });
  p.ch.setClass(pickedClass ?? 'guerreiro');
  p.ch.setStyle({ top: pickedLook.top, head: pickedLook.head, hair: pickedLook.hairStyle });
  toonify(p.ch.root, { outline: true });
  p.sc.add(p.ch.root);
  const w = $('pPreview').clientWidth || 200, h = $('pPreview').clientHeight || 260;
  p.r.setSize(w, h, false); p.cam.aspect = w / h; p.cam.updateProjectionMatrix();
  if (!p.raf) {
    let t0 = performance.now();
    const loop = (t) => {
      if ($('classPick').hidden || $('slots').hidden) { p.raf = 0; return; }
      const dt = Math.min(0.05, (t - t0) / 1000); t0 = t;
      p.ch.root.rotation.y += dt * 0.6;
      p.ch.idle(dt, t / 1000, null);
      p.r.render(p.sc, p.cam);
      p.raf = requestAnimationFrame(loop);
    };
    p.raf = requestAnimationFrame(loop);
  }
}
function checkGo() {
  const nameOk = $('pName').value.trim().length >= 2;
  $('pGo').disabled = !(pickedClass && nameOk);
  $('pHint').textContent = !nameOk ? 'Escreva um nome (2 letras ou mais)' : !pickedClass ? 'Escolha uma classe abaixo' : 'Pronto!';
}
$('pName').addEventListener('input', checkGo);
$('pBack').onclick = () => { $('classPick').hidden = true; $('slotGrid').hidden = false; $('slotsFoot').hidden = false; };
$('pGo').onclick = () => {
  if ($('pGo').disabled) return;
  startJourney(newSlot, { name: $('pName').value.trim().slice(0, 14), cls: pickedClass, appearance: { ...pickedLook } });
};
$('slotsBack').onclick = () => { $('slots').hidden = true; };
function openSlots() {
  if (!world) return;
  $('classPick').hidden = true; $('slotGrid').hidden = false; $('slotsFoot').hidden = false;
  renderSlots();
  $('slots').hidden = false;
}
// sound: starts inside the first click (browser rule); M or the button mutes it
function setMute(m) { $('bSound').setAttribute('aria-pressed', String(!m)); $('bSound').textContent = m ? 'Som: não (M)' : 'Som (M)'; }
setMute(isMuted());
$('bSound').onclick = () => { startAudio(); setMute(toggleMute()); };
$('bStart').onclick = () => { startAudio(); openSlots(); };
$('bWalk').onclick = () => { journey = false; document.body.classList.remove('journey'); world?.game.setSeals(false); enterWalk('trilha'); };
$('bExit').onclick = exitWalk;
// the GM's door: only shown when the page is opened with #mestre
$('bGM').hidden = location.hash !== '#mestre';
addEventListener('hashchange', () => { $('bGM').hidden = location.hash !== '#mestre'; });
$('bGM').onclick = () => world?.gm.toggle();
$('bFly').onclick = () => setFly(!world.walker.state.flying);
$('bPlaces').onclick = () => {
  const open = $('places').hidden;
  $('places').hidden = !open;
  $('bPlaces').setAttribute('aria-expanded', String(open));
};
document.querySelectorAll('[data-go]').forEach((b) => { b.onclick = () => goTo(b.dataset.go); });
const bSpin = $('bSpin'), bWind = $('bWind'), bQuality = $('bQuality');
bSpin.setAttribute('aria-pressed', String(orbit.autoRotate));
bSpin.onclick = () => { orbit.autoRotate = !orbit.autoRotate; bSpin.setAttribute('aria-pressed', String(orbit.autoRotate)); };
bWind.onclick = () => { windOn = !windOn; bWind.setAttribute('aria-pressed', String(windOn)); };
bQuality.textContent = `Qualidade: ${QUALITY[qualityIndex].name}`;
bQuality.onclick = () => {
  qualityIndex = (qualityIndex + 1) % QUALITY.length;
  env.setQuality(QUALITY[qualityIndex]);
  world?.canopy.setFoliage(QUALITY[qualityIndex].foliage);
  bQuality.textContent = `Qualidade: ${QUALITY[qualityIndex].name}`;
};

// ---------- loop ----------
const timer = new THREE.Timer();
timer.connect(document);
const shadowCenter = new THREE.Vector3();

renderer.setAnimationLoop(() => {
  timer.update();
  const dt = Math.min(Math.max(timer.getDelta(), 0), 0.05);
  const t = timer.getElapsed();

  const windTarget = windOn ? (reduceMotion ? 0.3 : 1) : 0;
  windLevel += (windTarget - windLevel) * (1 - Math.exp(-2 * dt)); // frame-rate independent ease
  windUniforms.uWind.value = windLevel;
  windUniforms.uTime.value = t;
  env.setTime(t);

  if (world) {
    if (mode === 'walk') {
      // no walking while a conversation is open
      const busy = journey && world.game.busy;
      world.walker.update(dt, busy ? { forward: 0, right: 0, up: 0, run: false } : input.read());
      world.walker.applyToCamera(camera, t, dt);
      const s = world.walker.state;
      if (journey) {
        world.game.update(dt, t, { running: s.running && s.moving, flying: s.flying, camYaw: s.yaw });
        placeMarker();
        if (party?.available) { party.update(dt); world.game.setPartyNear(party.nearCount); }
        world.combat.update(dt, t);
        world.combat.shake(dt);
        world.fx.update(dt);
      }
      world.character.update(dt, { x: s.x, y: s.feet, z: s.z, speed: s.speed, flying: s.flying, moveYaw: s.moveYaw });
      env.setShadowFocus(shadowCenter.set(s.x, s.feet, s.z), 220);
    } else {
      env.setShadowFocus(shadowCenter.set(0, 300, 0), 1100);
    }
    world.updateParticles(dt, t, windLevel);
    world.updateBiomes(dt, t);
  }
  if (mode === 'orbit') orbit.update(dt);
  env.render();
});

// Build after the loading screen has painted; it takes a few seconds on a phone.
requestAnimationFrame(() => setTimeout(() => {
  try {
    world = buildWorld();
    $('loading').hidden = true;
    connectParty();
    world.hud.bind({ interact: () => world.game.interact(), drink: () => world.game.drink(), useItem: (id) => world.game.useItem(id), attack: () => world.combat.attack(), dodge: () => world.combat.dodge(), skill: (i) => world.combat.useAbility(i), craft: (id) => world.game.craft(id), equip: (id) => world.game.equip(id) });
  } catch (err) {
    $('loading').textContent = 'Não foi possível montar a cena. Recarregue a página.';
    console.error(err);
  }
}, 30));

// Hooks for automated checks (tests/smoke.mjs).
window.__oliveira = {
  get ready() { return !!world; },
  get walker() { return world?.walker.state; },
  floorAt: (x, z, feet) => world?.walker.floorAt(x, z, feet),
  get paths() { return world?.paths; },
  get camera() { return camera.position.clone(); },
  strands: (y) => Array.from({ length: TRUNK.strands }, (_, i) => ({ x: Math.cos(strandTheta(i, y)) * ringR(y), z: Math.sin(strandTheta(i, y)) * ringR(y), r: strandR(y) })),
  enterWalk, goTo, setFly, startJourney,
  get game() { return world?.game; },
  get hud() { return world?.hud; },
  get combat() { return world?.combat; },
  get gm() { return world?.gm; },
  campaign: { STAGES, RECIPES },
  layout: { RAMP, GALLERY, BIOMES, TOP_BRIDGES, LOOKOUT, ENTRANCES, APPROACH, ROUTES, DISK_R, rampStart, bridges: BIOMES.map((b) => levelBridges(b.level)), junctions: BIOMES.map((b) => junctionAngle(b.level)) },
  keys: input.keys,
  step(n, dt = 0.05) { for (let i = 0; i < n; i++) world.walker.update(dt, input.read()); },
};

// The game rules for the whole Aetherion campaign (campaign_data.js): ten regions climbed from
// the roots to the canopy. On every floor: meet the community, gather that floor's materials,
// craft its weapon and outfit at the camp's workbench, do the manual's investigations, solve the
// sub-boss's mechanic and fight it, solve the guardian's mechanic and fight it, then choose its
// fate. Without the floor's weapon the guardians barely take damage; without the right outfit
// heat, cold or spores wear you down.
// Also: survival needs, the flask, resource nodes, levels, saving and guidance toward the next
// objective. Game state lives in one plain object (`state`); meshes only show it.
import * as THREE from 'three';
import { mulberry32 } from '../noise.js';
import { BIOMES, DISK_R, ENTRANCES, junctionAngle, APPROACH, LOOP_R, rampAt, TRUNK, RAMP } from '../tree/layout.js';
import { createCharacter } from '../character.js';
import {
  REGIONS_PLAN, ITEMS, RECIPES, RESOURCES, STAGES, stageIndex, DIALOGUES, dialogueFor, SPEAKERS, STRINGS, BOSSES,
  NEEDS, FLASK, HAZARD_NAMES, BASE_WEAPON, weaponStats, FRAGMENTS, ENDINGS, guardianName, REGION_NAMES,
  FLOOR_IDS, levelCap, xpNeed, bandXp, XP_SHARE, CLASSES, STORIES, MAX_LEVEL, DEFAULT_APPEARANCE, SIDES, SIDE_BONUS,
} from './campaign_data.js';
import { makeNode, makeObject, makeWorkbench, makeChest } from './looks.js';
import { makeHut, makeTent, makeCampfire, makeWagon, makePortal, makeMistWall } from './props.js';
import { sfx, setAmbience } from '../audio.js';

const SAVE_PREFIX = 'aetherion-v3-vaga-';   // one save per character slot (4 slots)
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const PLAN = Object.fromEntries(REGIONS_PLAN.map((r) => [r.id, r]));
const ORDER = REGIONS_PLAN.map((r) => r.id);
const LAST = REGIONS_PLAN[REGIONS_PLAN.length - 1];   // the last floor: its guardian decides the ending
const FINAL_BOSS = LAST.boss.type;
const ROMAN = ['I', 'II', 'III', 'IV'];

function freshState(profile = {}) {
  return {
    name: profile.name ?? 'Explorador', cls: profile.cls ?? 'guerreiro',
    appearance: { ...DEFAULT_APPEARANCE, ...(profile.appearance ?? {}) },
    seen: {},                // stories already shown
    stage: STAGES[0].id,
    inv: {},                 // item id -> count
    flask: FLASK.capacity,   // sips left
    flags: { cantil: true }, // done objects, bosses, choices, intact fragments
    health: 100, mana: 100, barrier: 0,
    count: {},               // quest counters per group
    equip: { weapon: null, outfit: null },
    camp: 'fora',            // where you wake after fainting
    xp: 0, level: 1,
    bonus: { hp: 0, dmg: 0 }, // permanent upgrades from legendary chests
    chestsSinceEpic: 0,
    pos: null,
  };
}

export function createGame({ scene, biomes, walker, hud, fx }) {
  const rand = mulberry32(777);
  const h = (id, x, z) => (id === 'fora' ? 0 : biomes.terrains[id](x, z));
  let state = freshState();
  let dialogue = null;
  let ended = false;
  const levelY = Object.fromEntries(BIOMES.map((b) => [b.id, b.level]));
  levelY.fora = 0;
  let slot = 0;
  let sealsOn = false;

  // ---- placement: everything sits on or beside a trail, so it is reachable ----
  // the clearing outside: the approach trail, the ring trail around the tree, the way in
  const lines = { ...biomes.paths };
  const ray = (a, r0, r1, n = 60) => Array.from({ length: n + 1 }, (_, k) => { const r = r0 + (r1 - r0) * (k / n); return { x: Math.cos(a) * r, z: Math.sin(a) * r }; });
  lines.fora = [ray(APPROACH.angle, 1000, LOOP_R + 2), Array.from({ length: 241 }, (_, k) => ({ x: Math.cos((k / 240) * Math.PI * 2) * LOOP_R, z: Math.sin((k / 240) * Math.PI * 2) * LOOP_R })), ray(ENTRANCES[0], LOOP_R, 100, 50)];
  const loopOf = (id) => (id === 'raizes' ? 1 : 4);
  const plazaOf = (id) => (id === 'raizes' ? 2 : 5);
  function along(id, li, frac, side = 0) {
    const line = lines[id][li];
    const i = Math.min(line.length - 2, Math.max(0, Math.floor(frac * (line.length - 1))));
    const a = line[i], b = line[i + 1];
    const tx = b.x - a.x, tz = b.z - a.z, tl = Math.hypot(tx, tz) || 1;
    const x = a.x - (tz / tl) * side, z = a.z + (tx / tl) * side;
    return V(x, h(id, x, z), z);
  }
  // a spot on solid, walkable floor: off the trail by `side` if that is dry land, else closer
  function spot(id, li, frac, side = 0) {
    for (const k of [1, 0.6, 0.3, 0]) {
      const p = along(id, li, frac, side * k);
      const fl = walker.floorAt(p.x, p.z, levelY[id] + 12);
      if (fl < levelY[id] - 2 || fl > levelY[id] + 22) continue;
      if (biomes.noGo.some((f) => f(p.x, p.z, fl))) continue;
      p.y = fl;
      return p;
    }
    const p = along(id, li, frac, 0);
    p.y = walker.floorAt(p.x, p.z, levelY[id] + 12);
    return p;
  }

  // ---- interactables ----
  const items = [];          // { id, pos, radius, label, enabled, use, kind, group? }
  const add = (o) => { items.push({ radius: 3.2, enabled: () => true, ...o }); return o; };
  const put = (obj, p) => { obj.position.add(p); scene.add(obj); return obj; };

  const npcs = {};
  // solid things: the explorer walks around them, never through (player.js keeps them in a grid)
  const solid = (p, r) => walker.addObstacle?.(p.x, p.z, r, p.y - 1, p.y + 6);
  function villager(id, pos, look) {
    const c = createCharacter({ name: id, light: false, pack: false, scale: 1, ...look });
    c.root.position.copy(pos);
    solid(pos, 0.45);
    scene.add(c.root);
    npcs[id] = { c, pos };
    add({ id, kind: 'npc', pos: pos.clone().setY(pos.y + 1), radius: 4, label: () => `Falar com ${SPEAKERS[id]}`, use: () => talk(id) });
  }
  // camp props (props.js): rounded, layered models instead of plain cones and boxes
  const TENT_COLORS = ['#c9a36a', '#b8834a', '#8a9a6a', '#a86a5a'];
  function hut(pos, r = 3) {
    const h = makeHut(r);
    h.position.copy(pos);
    solid(pos, r * 1.05);
    h.rotation.y = Math.atan2(-pos.x, -pos.z) + Math.PI;   // door toward the middle of the floor
    scene.add(h);
  }
  function tent(pos, rot) {
    const t = makeTent(TENT_COLORS[Math.floor(rand() * TENT_COLORS.length)]);
    t.position.copy(pos);
    t.rotation.y = rot;
    scene.add(t);
    solid(pos, 2.3);
  }
  const flames = [];
  function fire(pos) {
    const { root, flame } = makeCampfire();
    root.position.copy(pos);
    solid(pos, 1.1);
    const light = new THREE.PointLight('#ffb062', 120, 25, 2);
    light.position.copy(pos).setY(pos.y + 2);
    scene.add(root, light);
    flames.push(flame);
  }
  function label(text, pos, color = '#ffd76a') {
    const c = document.createElement('canvas'); c.width = 256; c.height = 128;
    const g = c.getContext('2d');
    g.fillStyle = 'rgba(20,18,12,0.75)'; g.fillRect(0, 0, 256, 128);
    g.fillStyle = color; g.font = '700 64px system-ui, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(text, 128, 66);
    const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthWrite: false }));
    s.scale.set(2.4, 1.2, 1); s.position.copy(pos);
    scene.add(s);
  }

  // which quest objects you can walk over or into (things on the floor, things that get removed)
  const SOFT_LOOKS = { tracks: 1, tracksRed: 1, spring: 1, canal: 1, icePlate: 1, sample: 0, crate: 1, sand: 0, bones: 1, algae: 1, sporeFocus: 1, logs: 1, rescue: 1, web: 1, brace: 1, flower: 0 };
  const SOLID_R = { station: 2.6, tower: 1.6, chimney: 1.5, forge: 1.4, crystal: 0.6, crystalDark: 0.6, mirror: 0.4, sail: 0.4, lantern: 0.3, vent: 1.2, valve: 0.4, barrel: 0.6, crack: 0.4 };
  // =================== the ten regions ===================
  const camps = {};          // region -> camp centre (safe zone, respawn)
  const lairs = {};          // boss id -> position
  const objects = [];        // { group, i, done(bool), flag }
  const stageOfGroup = {};   // group -> the stage from which its objects can be used
  for (const st of STAGES) {
    if (st.kind === 'group') stageOfGroup[st.target] = st.id;
    else if (st.kind === 'side') for (const g of Object.values(st.groups)) stageOfGroup[g] = st.id;
    else if (st.group) stageOfGroup[st.group] = st.id;
  }
  const LABELS = {
    spring: 'Examinar a nascente', tracks: 'Examinar as marcas', tracksRed: 'Examinar a marca de ferrão', rescue: 'Remover os escombros',
    web: 'Tecer a trama de raízes', canal: 'Limpar o canal', barrel: 'Levar o jarro de água', sand: 'Desobstruir o reservatório',
    valve: 'Girar a válvula', sample: 'Coletar a amostra', station: 'Vasculhar a estação', algae: 'Desobstruir sem ferir os filtradores',
    crack: 'Mapear a ruptura', chimney: 'Regular a chaminé', forge: 'Desligar a fornalha', tower: 'Desobstruir a torre de ar',
    icePlate: 'Derreter a placa de gelo', root: 'Cortar a raiz', logs: 'Desfazer o bloqueio', bones: 'Examinar os restos',
    sporeFocus: 'Drenar o foco fúngico', vent: 'Abrir a ventilação', crystal: 'Tocar o cristal', crystalDark: 'Desativar o cristal falso',
    mirror: 'Ativar o refletor', brace: 'Instalar a escora', sail: 'Armar a vela', flower: 'Restaurar as flores',
  };

  // the clearing (prologue): one straight trail from far out to the tree, and each mission a
  // little closer to it. Fractions run along the approach, 0 = 1000 m out, 1 = the ring trail.
  const along0 = (r) => (1000 - r) / (1000 - LOOP_R - 2);
  const foraObjects = [];
  {
    const L = 'fora', f = along0(940);
    camps.fora = spot(L, 0, f, 0);
    tent(spot(L, 0, f - 0.012, 9), 0.6); tent(spot(L, 0, f + 0.014, -10), 2.1); tent(spot(L, 0, f + 0.03, 10), 4.0);
    fire(spot(L, 0, f, 4));
    villager('thalor', spot(L, 0, f + 0.004, -3.5), { shirt: '#5a4a2a', pants: '#3a3020', hat: '#7a5a2a', skin: '#a87a58' });
    const barrel = spot(L, 0, f - 0.006, -5);
    put(makeObject('barrel').root, barrel);
    solid(barrel, 0.6);
    add({ id: 'agua_fora', kind: 'water', pos: barrel.clone().setY(barrel.y + 1), radius: 3, label: () => 'Fonte: recuperar vida, mana e poções', use: () => water() });
    // 3. the caravan tipped over on the trail, its crates scattered
    const wagon = makeWagon();
    wagon.position.copy(spot(L, 0, along0(690), 9));
    solid(wagon.position, 2);
    wagon.rotation.y = 0.7;
    scene.add(wagon);
    const crates = [[700, 6], [684, 11], [672, 5]].map(([r, sd]) => spot(L, 0, along0(r), sd));
    // 5. the lanterns along the last stretch to the ring trail
    const lamps = [470, 410, 352].map((r, k) => spot(L, 0, along0(r), k % 2 ? -3.2 : 3.2));
    for (const [def, list] of [[{ group: 'caixote', count: 3, look: 'crate', label: 'Recuperar os mantimentos', done: 'Caixote recuperado.' }, crates],
      [{ group: 'lanterna', count: 3, look: 'lantern', label: 'Acender a lanterna', done: 'A lanterna ilumina a trilha.' }, lamps]]) {
      list.forEach((p, i) => {
        const obj = makeObject(def.look);
        if (!SOFT_LOOKS[def.look]) solid(p, SOLID_R[def.look] ?? 0.7);
        put(obj.root, p);
        const flag = `${def.group}_${i}`;
        objects.push({ group: def.group, i, done: obj.done, flag });
        add({ id: flag, group: def.group, kind: 'quest', pos: p.clone().setY(p.y + 1), radius: 3.8, label: () => def.label,
          enabled: () => stageIndex(state.stage) >= stageIndex(stageOfGroup[def.group]) && !state.flags[flag], use: () => useObject(def, i, 0) });
      });
    }
  }
  for (const [ri, r] of REGIONS_PLAN.entries()) {
    const L = r.id, lo = loopOf(L), pl = plazaOf(L);
    // the camp: tents, fire, the community's speaker, a water barrel and the workbench
    const camp = spot(L, lo, 0.1, 0);
    camps[L] = camp;
    if (L === 'raizes') for (const [f, s] of [[0.07, 9], [0.1, 10], [0.13, 9], [0.12, -10]]) hut(spot(L, lo, f, s), 2.6 + rand());
    else { tent(spot(L, lo, 0.08, 8), rand() * 3); tent(spot(L, lo, 0.12, 9), rand() * 3); }
    fire(spot(L, lo, 0.1, 3.5));
    villager(r.npc.id, spot(L, lo, 0.1, -3), r.npc.look);
    const bench = spot(L, lo, 0.125, -5);
    put(makeWorkbench(), bench);
    solid(bench, 1.3);
    add({ id: `bancada_${L}`, kind: 'bench', pos: bench.clone().setY(bench.y + 1), radius: 3.5, enabled: () => ri < openFloors(), label: () => 'Usar a bancada de criação', use: () => openBench(L) });
    const barrel = spot(L, lo, 0.075, -5);
    put(makeObject('barrel').root, barrel);
    solid(barrel, 0.6);
    add({ id: `agua_${L}`, kind: 'water', pos: barrel.clone().setY(barrel.y + 1), radius: 3, label: () => 'Fonte: recuperar vida, mana e poções', use: () => water() });

    // the investigation steps along the loop trail
    const slots = [0.2, 0.26, 0.32, 0.38, 0.44, 0.74, 0.8, 0.86, 0.92];
    let si = 0;
    const place = (def, posFor) => {
      for (let i = 0; i < def.count; i++) {
        const p = posFor(i);
        const obj = makeObject(def.look);
        if (!SOFT_LOOKS[def.look]) solid(p, SOLID_R[def.look] ?? 0.7);
        put(obj.root, p);
        if (def.ordered) label(ROMAN[i], p.clone().setY(p.y + (def.look === 'chimney' ? 11.5 : 4)));
        const flag = `${def.group}_${i}`;
        objects.push({ group: def.group, i, done: obj.done, flag });
        add({
          id: flag, group: def.group, kind: 'quest', pos: p.clone().setY(p.y + 1), radius: def.look === 'station' ? 5 : 3.8,
          label: () => `${def.label ?? LABELS[def.look] ?? 'Examinar'}${def.ordered ? ` ${ROMAN[i]}` : ''}`,
          enabled: () => stageIndex(state.stage) >= stageIndex(stageOfGroup[def.group]) && !state.flags[flag] && (!def.side || state.flags[`lado_${L}`] === def.side),
          def, use: () => useObject(def, i, ri),
        });
      }
    };
    for (const s of r.steps) place(s, () => { const k = si++; return k < slots.length ? spot(L, lo, slots[k], k % 2 ? -6 : 6) : spot(L, (k % 3) + (L === 'raizes' ? 0 : 1), 0.35, 4); });
    // the dilemma's two tasks: the A side's spots out on the loop, the B side's on the spokes
    const sd = SIDES[L];
    if (sd) {
      place({ group: `${L}_lado_a`, count: 3, look: sd.a.look, label: sd.a.label, side: 'a' }, (i) => spot(L, lo, [0.17, 0.53, 0.63][i], 14));
      place({ group: `${L}_lado_b`, count: 3, look: sd.b.look, label: sd.b.label, side: 'b' }, (i) => (L === 'raizes' ? spot(L, pl, 0.3 + i * 0.3, -6) : spot(L, 1 + i, 0.5, -4)));
    }
    // the sub-boss waits on the loop, its mechanic around it; the guardian waits on the plaza
    lairs[r.sub.type] = spot(L, lo, 0.6, 0);
    if (r.sub.mechanic) place(r.sub.mechanic, (i) => spot(L, lo, 0.55 + i * 0.05, i % 2 ? -8 : 8));
    lairs[r.boss.type] = spot(L, pl, 0.5, 0);
    if (r.boss.mechanic) place(r.boss.mechanic, (i) => (L === 'raizes' ? spot(L, pl, 0.1 + i * 0.3, 4) : spot(L, 1 + i, 0.72, 3)));
  }

  // resource nodes: materials, food and herbs, spread along each level's trails
  const nodes = [];
  const lookOf = {};
  for (const r of REGIONS_PLAN) for (const [item, , look] of r.mats.nodes) lookOf[item] = look;
  for (const res of RESOURCES) {
    const ls = lines[res.biome];
    for (let k = 0; k < res.count; k++) {
      const FORA_SPAN = { erva: [0.12, 0.3], cogumelo: [0.3, 0.44], madeira: [0.5, 0.62] };
      const span = res.biome === 'fora' ? FORA_SPAN[res.item] ?? [0.1, 0.9] : null;
      const li = span ? 0 : k % ls.length;
      const frac = span ? span[0] + (span[1] - span[0]) * (k / Math.max(1, res.count - 1)) : 0.14 + ((k * 0.37 + res.item.length * 0.11) % 0.74);
      const side = (k % 2 ? 1 : -1) * (span ? 4 + (k % 3) : 2.4 + (k % 3));
      const pos = spot(res.biome, li, frac, side);
      const mesh = makeNode(res.item, lookOf[res.item]);
      put(mesh, pos);
      const node = { item: res.item, mesh, respawn: res.respawn, timer: 0 };
      nodes.push(node);
      add({ id: `node_${res.biome}_${res.item}_${k}`, group: res.item, kind: 'resource', pos: pos.clone().setY(pos.y + 0.6), radius: 2.4, label: () => `Coletar ${ITEMS[res.item].name.toLowerCase()}`, enabled: () => node.timer <= 0, use: () => collect(node) });
    }
  }

  // treasure chests: three per floor, off the trail, each with a column of light. Variable
  // reward: common (the floor's materials), rare (a potion and the creatures' material) or
  // legendary (a permanent upgrade). A legendary is guaranteed within every 6 chests.
  const chests = [];
  {
    const p = spot('fora', 0, along0(560), 13);    // on the trail, between the caravan and the lanterns
    const c = makeChest();
    put(c.root, p);
    solid(p, 0.75);
    chests.push({ id: 'bau_fora_0', c });
    add({ id: 'bau_fora_0', kind: 'chest', pos: p.clone().setY(p.y + 1), radius: 3, label: () => 'Abrir o baú', enabled: () => !state.flags.bau_fora_0, use: () => openChest('bau_fora_0', PLAN.raizes, -1, p) });
  }
  for (const [ri, r] of REGIONS_PLAN.entries()) {
    [[0.49, 11], [0.69, -11], [0.97, 11]].forEach(([f, side], k) => {
      const p = spot(r.id, loopOf(r.id), f, side);
      const c = makeChest();
      c.root.rotation.y = rand() * 6.28;
      put(c.root, p);
      solid(p, 0.75);
      const id = `bau_${r.id}_${k}`;
      chests.push({ id, c });
      add({ id, kind: 'chest', pos: p.clone().setY(p.y + 1), radius: 3, label: () => 'Abrir o baú', enabled: () => !state.flags[id] && ri < openFloors(), use: () => openChest(id, r, ri, p) });
    });
  }
  const LEGENDS = [
    { name: 'Semente de Vigor', line: '+20 de vida máxima, para sempre', apply: () => { state.bonus.hp += 20; } },
    { name: 'Pedra de Afiar Ancestral', line: '+6% de dano, para sempre', apply: () => { state.bonus.dmg += 0.06; } },
  ];
  function openChest(id, r, ri, p) {
    state.flags[id] = true;
    state.bonus = state.bonus ?? { hp: 0, dmg: 0 };
    chests.find((x) => x.id === id)?.c.open(true);
    const roll = rand();
    const epic = roll < 0.14 || (state.chestsSinceEpic ?? 0) >= 5;
    gainXp(xpFor('chest'));
    sfx('chest');
    if (epic) {
      state.chestsSinceEpic = 0;
      state.legends = (state.legends ?? 0) + 1;
      const L = LEGENDS[(state.legends - 1) % 2];   // alternates: vigour, then edge
      L.apply();
      state.health = maxHealth();
      fx?.chest(p.clone().setY(p.y + 0.6), '#ffcf4a');
      sfx('epic');
      hud.reveal('Achado lendário', L.name, [L.line], '#ffcf4a');
    } else if (roll < 0.5) {
      state.chestsSinceEpic = (state.chestsSinceEpic ?? 0) + 1;
      give('pocao', 1); give(r.mats.drop[0], 2);
      fx?.chest(p.clone().setY(p.y + 0.6), '#7fb8ff');
      sfx('rare');
      hud.toast(`Baú raro: Poção de Seiva + 2 ${ITEMS[r.mats.drop[0]].name}`, 'rare');
    } else {
      state.chestsSinceEpic = (state.chestsSinceEpic ?? 0) + 1;
      for (const [item] of r.mats.nodes) give(item, 2);
      give('erva', 1);
      fx?.chest(p.clone().setY(p.y + 0.6), '#9dffcf');
      hud.toast(`Baú: 2 ${ITEMS[r.mats.nodes[0][0]].name}, 2 ${ITEMS[r.mats.nodes[1][0]].name} e 1 erva`, 'loot');
    }
    const opened = Object.keys(state.flags).filter((k) => k.startsWith('bau_')).length;
    hud.toast(`Baús encontrados: ${opened}/${chests.length}`, 'xp');
    save();
  }

  // every boss in the story: where it waits and the stage that wakes it
  const bossList = BOSSES.map((b) => ({ ...b, lair: lairs[b.id] }));
  for (const b of bossList) add({ id: b.id, kind: 'marker', pos: b.lair.clone().setY(b.lair.y + 1), radius: 0, label: () => '', enabled: () => false, use: () => {} });
  const bossName = (id) => guardianName(id);

  // ---------- quest beacon ----------
  const beacon = new THREE.Group();
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 18, 12, 1, true), new THREE.MeshBasicMaterial({ color: '#ffd76a', transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
  beam.position.y = 9;
  const ring = new THREE.Mesh(new THREE.TorusGeometry(1.4, 0.08, 6, 32).rotateX(Math.PI / 2), new THREE.MeshBasicMaterial({ color: new THREE.Color('#ffd76a').multiplyScalar(1.5) }));
  beacon.add(beam, ring);
  scene.add(beacon);

  // ---------- gear ----------
  const weaponDef = () => (state.equip.weapon && ITEMS[state.equip.weapon]?.weapon) || BASE_WEAPON;
  const outfitDef = () => (state.equip.outfit && ITEMS[state.equip.outfit]?.outfit) || null;
  let weaponCache = null;
  // the weapon's stats shaped by the class: reach for Mago and Arqueiro, speed and crits for the
  // Ladino, range for the Guerreiro
  const weapon = () => {
    const w = weaponDef(), c = cls(), k = `${w.id}/${state.cls}`;
    if (weaponCache?.id !== k) {
      const base = weaponStats(w);
      weaponCache = { id: k, stats: { ...base, range: c.range + Math.min(1, w.tier * 0.1), reach: c.reach ?? 0, ranged: !!c.reach, cooldown: c.cooldown, crit: c.crit, color: c.reach ? c.color : base.color } };
    }
    return weaponCache.stats;
  };
  const gearHooks = [];
  function equip(id) {
    const it = ITEMS[id];
    if (!it || !state.inv[id]) return;
    if (it.weapon) { state.equip.weapon = id; hud.toast(`Empunhando: ${it.name}`); }
    else if (it.outfit) { state.equip.outfit = id; hud.toast(`Vestindo: ${it.name}`); }
    applyGear();
    hud.inventory(state);
  }
  function applyGear() { gearHooks.forEach((f) => f(weaponDef(), outfitDef())); }

  // ---------- levels ----------
  // levels 1-100: the current place's band caps them (outside 5, floor N 10 x N)
  const cls = () => CLASSES[state.cls] ?? CLASSES.guerreiro;
  const maxHealth = () => Math.round((100 + 2.5 * (state.level - 1)) * cls().hp + (state.bonus?.hp ?? 0));
  const power = () => (1 + 0.012 * (state.level - 1)) * (1 + (state.bonus?.dmg ?? 0)) * cls().dmg;
  const capNow = () => Math.min(MAX_LEVEL, levelCap(stage().region));
  let partyNear = false, capToast = 0;
  // an action's XP as a share of the floor's band, so every floor paces the same
  const xpFor = (what, region = stage().region) => Math.max(1, Math.round(bandXp(region) * XP_SHARE[what]));
  function gainXp(n) {
    if (partyNear) n *= 1 + XP_SHARE.party;
    if (state.level >= capNow()) {
      state.xp = Math.min(xpNeed(state.level), state.xp + Math.round(n));
      if (performance.now() > capToast) { capToast = performance.now() + 20000; hud.toast(`Nível máximo deste andar (${capNow()}). Conclua o andar para subir o teto.`, 'xp'); }
      return;
    }
    hud.toast(`+${Math.round(n)} XP${partyNear ? ' (bônus de grupo)' : ''}`, 'xp');
    state.xp += Math.round(n);
    while (state.xp >= xpNeed(state.level) && state.level < capNow()) {
      state.xp -= xpNeed(state.level);
      state.level++;
      state.health = maxHealth();
      if (!dialogue) hud.closeDialogue();
      hud.banner('Subiu de nível', `Nível ${state.level}`, `Vida máxima ${maxHealth()} · dano +${Math.round((power() - 1) * 100)}%`, 'level');
      fx?.levelUp(V(walker.state.x, walker.state.feet + 0.2, walker.state.z));
      sfx('level');
    }
  }

  // =================== rules ===================
  const stage = () => STAGES[stageIndex(state.stage)];
  const regionIndex = () => ORDER.indexOf(stage().region) + 1;   // 0 = the clearing outside
  const stageText = (st = stage()) => (st.textBySide ? st.textBySide[state.flags[`lado_${st.region}`]] ?? 'Cumpra a tarefa do lado que você escolheu' : st.text);
  const showObjective = () => hud.objective(stageText(), stage().act, regionIndex(), REGION_NAMES[stage().region]);
  function advance() {
    const i = stageIndex(state.stage);
    if (STAGES[i].kind === 'side') bless(STAGES[i].region);
    if (STAGES[i].region === 'fora' && STAGES[i].kind !== 'level') gainXp(xpFor('stage', 'fora'));   // prologue: each step pays
    if (i < STAGES.length - 1) state.stage = STAGES[i + 1].id;
    const st = stage();
    // the camp you wake at: the new place's as soon as it opens (never back at the clearing)
    if (st.region !== STAGES[i].region) state.camp = st.region;
    showObjective();
    const newPlace = st.region !== STAGES[i].region && st.kind !== 'end';
    sfx(newPlace ? 'floor' : 'objective');
    if (newPlace && STAGES[i].region === 'fora') { storyPending = st.region; hud.closeDialogue(); }
    else if (newPlace) tellStory(st.region, () => hud.banner('Selo aberto', `${REGION_NAMES[st.region].replace(/^(a|o) /, '')[0].toUpperCase()}${REGION_NAMES[st.region].replace(/^(a|o) /, '').slice(1)}`, 'Siga a trilha de luz até a entrada', 'level'));
    else hud.toast('Novo objetivo');
    save();
    if (st.kind === 'end') finish();
  }
  // the side's blessing: permanent, shown like a legendary find
  function bless(P) {
    const side = state.flags[`lado_${P}`];
    if (!side || state.flags[`bencao_${P}`]) return;
    state.flags[`bencao_${P}`] = true;
    const b = SIDE_BONUS[side], sd = SIDES[P][side];
    state.bonus = state.bonus ?? { hp: 0, dmg: 0 };
    if (b.dmg) state.bonus.dmg += b.dmg;
    if (b.hp) { state.bonus.hp += b.hp; state.health = maxHealth(); }
    gainXp(xpFor('craft'));
    sfx('epic');
    fx?.levelUp(V(walker.state.x, walker.state.feet + 0.2, walker.state.z));
    hud.reveal(`Bênção · ${sd.who}`, sd.bless, [b.dmg ? `+${Math.round(b.dmg * 100)}% de dano, para sempre` : `+${b.hp} de vida máxima, para sempre`, sd.after], side === 'a' ? '#ff8a5a' : '#7fe0b0');
  }
  function floorBanner() {
    if (stage().region === 'fora') { hud.banner('Prólogo', 'Clareira de Aetherion', 'Chegue ao nível 5 para entrar na árvore'); return; }
    const r = PLAN[stage().region];
    const name = REGION_NAMES[r.id].replace(/^(a|o) /, '');
    hud.banner(`Andar ${regionIndex()} de ${REGIONS_PLAN.length}`, name[0].toUpperCase() + name.slice(1), `Missão: ${r.mission}`);
  }
  function finish() {
    ended = true;
    sfx('ending');
    const how = state.flags[`escolha_${FINAL_BOSS}`] ?? 'destruir';
    const outcome = LAST.boss.options.find((o) => o[0] === how)?.[2] ?? '';
    hud.ending(ENDINGS[how] ?? 'Fim da campanha', `${outcome}${choicesSummary()}`);
  }
  // how far the current objective is: [done, total]
  function stageProgress() {
    const st = stage();
    if (st.kind === 'craft') return [Object.keys(st.need).filter((k) => state.inv[k]).length, Object.keys(st.need).length];
    if (st.kind === 'side') { const g = st.groups[state.flags[`lado_${st.region}`]]; return [Math.min(3, state.count[g] ?? 0), 3]; }
    if (st.kind === 'level') return [Math.round(state.xp / xpNeed(state.level) * 100), 100, `Nível ${state.level}/${st.need.nivel}`];
    if (st.kind === 'kill' || st.kind === 'collect') { const [k, n] = Object.entries(st.need)[0]; return [Math.min(n, (ITEMS[k] ? state.inv[k] : state.count[k]) ?? 0), n]; }
    const g = st.kind === 'group' ? st.target : st.group;
    if (!g) return [0, 0];
    const n = st.need[g] ?? 3;
    return [Math.min(n, state.count[g] ?? 0), n];
  }
  const intact = () => FRAGMENTS.filter((f) => state.flags[`intacto_${f}`]).length;
  const held = () => FRAGMENTS.filter((f) => state.inv[f]).length;
  function needsMet() {
    const st0 = stage();
    if (st0.kind === 'side') { const g = st0.groups[state.flags[`lado_${st0.region}`]]; return !!g && (state.count[g] ?? 0) >= 3; }
    const n = st0.need;
    if (!n) return false;
    return Object.entries(n).every(([k, v]) => {
      if (k.startsWith('boss_')) return !!state.flags[k];
      if (k === 'nivel') return state.level >= v;
      if (ITEMS[k]) return (state.inv[k] ?? 0) >= v;
      return (state.count[k] ?? 0) >= v;
    });
  }
  function give(item, n) { state.inv[item] = (state.inv[item] ?? 0) + n; hud.inventory(state); }
  function take(item, n) { state.inv[item] = Math.max(0, (state.inv[item] ?? 0) - n); if (!state.inv[item]) delete state.inv[item]; hud.inventory(state); }
  const has = (inputs) => Object.entries(inputs).every(([k, v]) => (state.inv[k] ?? 0) >= v);

  function collect(node) {
    give(node.item, 1);
    node.timer = node.respawn;
    node.mesh.visible = false;
    hud.toast(`+1 ${ITEMS[node.item].name}  (${state.inv[node.item]})`, 'loot');
    fx?.pickup(node.mesh.position.clone().setY(node.mesh.position.y + 0.5), ITEMS[node.item].material ? '#ffd76a' : '#9dffcf');
    sfx('pickup');
  }
  function water() {
    state.health = maxHealth(); state.mana = NEEDS.mana;
    state.flask = FLASK.capacity;
    hud.toast(`Vida e mana cheias. Poções: ${FLASK.capacity}.`);
    sfx('water');
    hud.inventory(state);
  }
  function drink() {
    if (state.flask <= 0) return hud.toast('Sem poções. Encha na fonte de um acampamento.');
    state.flask -= 1;
    state.health = Math.min(maxHealth(), state.health + maxHealth() * FLASK.sip);
    state.mana = Math.min(NEEDS.mana, state.mana + NEEDS.mana * FLASK.sip);
    fx?.pickup(new THREE.Vector3(walker.state.x, walker.state.feet + 1, walker.state.z), '#ff8a8a');
    hud.toast(`Poção! Restam ${state.flask}.`);
    hud.inventory(state);
  }
  function useItem(id) {
    const it = ITEMS[id];
    if (!it || !state.inv[id]) return;
    if (it.weapon || it.outfit) return equip(id);
    if (!it.use) return;
    take(id, 1);
    if (it.use.hunger) state.health = Math.min(maxHealth(), state.health + maxHealth() * it.use.hunger / 200);
    if (it.use.health) state.health = Math.min(maxHealth(), state.health + it.use.health);
    hud.toast(`${it.verb}: ${it.name}`);
    sfx('eat');
  }

  // ---- crafting (survival-crafting: recipes as data, crafting is atomic) ----
  // the bench of a region offers that region's recipes and every recipe from the floors below
  const benchRecipes = (region) => RECIPES.filter((rc) => !rc.region || ORDER.indexOf(rc.region) <= ORDER.indexOf(region));
  let benchOpen = null;
  function craft(id) {
    const rc = RECIPES.find((x) => x.id === id);
    if (!rc || !has(rc.inputs)) { hud.toast('Faltam materiais.'); return false; }
    if ((rc.kind === 'arma' || rc.kind === 'roupa') && state.inv[rc.output]) { hud.toast('Você já tem isso.'); return false; }
    for (const [k, v] of Object.entries(rc.inputs)) take(k, v);
    give(rc.output, 1);
    sfx('craft');
    fx?.craft(V(walker.state.x, walker.state.feet + 1, walker.state.z));
    const it = ITEMS[rc.output];
    const before = { w: weapon(), o: outfitDef() };
    if (it.weapon) {
      const now = weaponStats(it.weapon), avg = (w) => (w.damage[0] + w.damage[1]) / 2;
      const up = Math.round((avg(now) / avg(before.w) - 1) * 100);
      hud.reveal('Nova arma', it.name, [`Dano ${Math.round(avg(before.w))} → ${Math.round(avg(now))}  (+${up}%)`, `Nível ${it.weapon.tier}: fere de verdade os guardiões do andar ${it.weapon.tier}`], it.weapon.look.tip);
    } else if (it.outfit) {
      const pct = (o) => Math.round((o?.guard ?? 0) * 100);
      hud.reveal('Nova roupa', it.name, [`Proteção ${pct(before.o)}% → ${pct(it.outfit)}%`, it.outfit.resist ? `Protege do ${it.outfit.resist}` : 'Visual novo no explorador'], it.outfit.look.glow ?? it.outfit.look.shirt);
    } else hud.toast(`Criado: ${it.name}`, 'loot');
    // a new weapon or outfit is put on at once when it is better than what is worn
    if (it.weapon && it.weapon.tier > weaponDef().tier) equip(rc.output);
    if (it.outfit && it.outfit.guard > (outfitDef()?.guard ?? 0)) equip(rc.output);
    if (it.weapon || it.outfit) gainXp(xpFor('craft'));         // potions give none (no endless XP)
    if (benchOpen) openBench(benchOpen);
    return true;
  }
  function openBench(region) {
    benchOpen = region;
    const rows = benchRecipes(region).map((rc) => {
      const it = ITEMS[rc.output];
      const gear = it.weapon || it.outfit;
      return {
        id: rc.id, name: rc.name, kind: rc.kind, note: it.note ?? (it.use?.health ? `+${it.use.health} vida` : ''),
        inputs: Object.entries(rc.inputs).map(([k, v]) => ({ name: ITEMS[k].name, have: state.inv[k] ?? 0, need: v })),
        can: has(rc.inputs) && !(gear && state.inv[rc.output]),
        owned: !!(gear && state.inv[rc.output]),
        equipped: state.equip.weapon === rc.output || state.equip.outfit === rc.output,
      };
    });
    hud.workbench(`Bancada · ${REGION_NAMES[region]}`, rows);
  }

  // ---- quest objects ----
  // ambush: creatures guard the spot and must fall first; cost: the step takes materials
  const ambushActive = {};
  let ambushHook = null;
  const costText = (cost) => Object.entries(cost).map(([k, v]) => `${v} ${ITEMS[k].name.toLowerCase()}`).join(' e ');
  function useObject(def, i, ri) {
    const flag = `${def.group}_${i}`;
    if (def.cost && !state.flags[`${flag}_pago`]) {
      if (!has(def.cost)) { hud.message(`Para isso você precisa de ${costText(def.cost)}. Colete pelo andar e volte.`); return; }
      for (const [k, v] of Object.entries(def.cost)) take(k, v);
      state.flags[`${flag}_pago`] = true;
      hud.toast(`Usou ${costText(def.cost)}`, 'loot');
    }
    if (def.ambush && !state.flags[`${flag}_livre`]) {
      if (ambushActive[flag]) { hud.toast('Derrote as criaturas que vigiam o lugar primeiro', 'xp'); return; }
      const it = items.find((x) => x.id === flag);
      if (ambushHook && it) {
        ambushActive[flag] = true;
        sfx('boss');
        hud.banner('Emboscada!', 'Criaturas guardavam este lugar', 'Derrote-as para continuar', 'boss');
        ambushHook(REGIONS_PLAN[ri]?.id ?? 'raizes', it.pos, def.ambush, () => {
          delete ambushActive[flag];
          state.flags[`${flag}_livre`] = true;
          hud.toast('Lugar livre: termine a tarefa (E)', 'loot');
        });
        return;
      }
    }
    const n = state.count[def.group] ?? 0;
    if (def.ordered && i !== n) {
      // out of order: the sequence resets, and it hurts
      for (const o of objects) if (o.group === def.group) { delete state.flags[o.flag]; o.done(false); }
      state.count[def.group] = 0;
      hurt(8 + ri * 2);
      sfx('wrong');
      hud.message(`Ordem errada! Tudo volta ao início. Siga a sequência ${ROMAN.slice(0, def.count).join(', ')}.`);
      return;
    }
    state.flags[flag] = true;
    state.count[def.group] = n + 1;
    objects.find((o) => o.flag === flag)?.done(true);
    const it = items.find((x) => x.id === flag);
    if (it) fx?.quest(it.pos.clone().setY(it.pos.y - 0.5));
    gainXp(xpFor('object'));
    sfx('quest');
    const line = def.done ? `${def.done} (${n + 1}/${def.count})` : `${def.label ?? LABELS[def.look]}: ${n + 1}/${def.count}`;
    if (def.look === 'station' || def.look === 'bones' || def.look === 'rescue') hud.message(line); else hud.toast(line);
  }
  function applyWorld() {
    for (const o of objects) o.done(!!state.flags[o.flag]);
    for (const ch of chests) ch.c.open(!!state.flags[ch.id]);
    applyGear();
  }

  // ---- conversations ----
  function talk(npc) {
    const id = dialogueFor(npc, state.stage);
    if (!id) return;
    dialogue = { graph: DIALOGUES[id], npc };
    goto(dialogue.graph.start);
  }
  function applyEffects(fx) {
    if (!fx) return;
    if (fx.side) { const [P, side] = fx.side; state.flags[`lado_${P}`] = side; hud.toast(`Você ficou com ${SIDES[P][side].who}`, 'xp'); }
    if (fx.resolve) resolveBoss(...fx.resolve);
    if (fx.advance) advance();
  }
  const meets = (cond) => {
    if (!cond) return true;
    if (cond.fragments && intact() < cond.fragments) return false;
    if (cond.has && !has(cond.has)) return false;
    return true;
  };
  function goto(nodeId) {
    const node = dialogue.graph.nodes[nodeId];
    applyEffects(node.do);
    if (node.end) { dialogue = null; hud.closeDialogue(); return; }
    const choices = node.choices?.filter((c) => meets(c.if)).map((c) => ({ text: STRINGS[c.text], pick: () => { applyEffects(c.do); goto(c.to); } }));
    hud.dialogue(SPEAKERS[node.speaker], STRINGS[node.line], choices ?? [{ text: 'Continuar', pick: () => goto(node.next) }]);
  }

  // ---- guidance: the next place to walk toward, through the ramp if it is on another level ----
  const FORA = { id: 'fora', level: 0, name: 'Clareira de Aetherion' };
  function levelOf(y, r) {
    if (r > DISK_R + 25) return y < 30 ? FORA : null;
    let best = null;
    for (const b of BIOMES) if (y > b.level - 1.5 && y < b.level + 26) best = b;
    return best;
  }
  function nearestOf(pred) {
    const me = walker.state;
    let best = null, bd = Infinity;
    for (const it of items) if (pred(it) && it.enabled()) { const d = Math.hypot(it.pos.x - me.x, it.pos.z - me.z) + Math.abs(it.pos.y - me.feet) * 4; if (d < bd) { bd = d; best = it; } }
    return best;
  }
  function targetPos() {
    const st = stage();
    if (!st.target && st.kind !== 'side') return null;
    if (st.kind === 'craft') {
      // materials still missing for this floor's gear: point at the nearest node of one of them
      const missing = new Set();
      for (const out of Object.keys(st.need)) {
        if (state.inv[out]) continue;
        const rc = RECIPES.find((x) => x.output === out);
        for (const [k, v] of Object.entries(rc.inputs)) if ((state.inv[k] ?? 0) < v) missing.add(k);
      }
      if (missing.size) {
        const node = nearestOf((it) => it.kind === 'resource' && missing.has(it.group) && it.id.startsWith(`node_${st.region}_`));
        if (node) return node.pos;
      }
    }
    if (st.kind === 'side') {
      const g = st.groups[state.flags[`lado_${st.region}`]];
      const it = g && nearestOf((x) => x.group === g);
      return it ? it.pos : null;
    }
    if (st.target.startsWith('node:')) {
      const it = nearestOf((x) => x.kind === 'resource' && x.id.startsWith(`node_${st.region}_${st.target.slice(5)}_`));
      if (it) return it.pos;
    }
    if (st.id === 'fora_portal' && state.level < 5) {
      const chest = items.find((i) => i.id === 'bau_fora_0');
      if (chest?.enabled()) return chest.pos;
      return mobFinder?.('fora') ?? chest?.pos ?? null;
    }
    if (st.target.startsWith('mob:')) {
      // the nearest living creature of this place (combat tells), else the camp
      const m = mobFinder?.(st.target.slice(4));
      return m ?? camps[st.region] ?? null;
    }
    const group = st.kind === 'group' ? st.target : st.group;
    if (group && st.region === 'fora') { const it = items.find((x) => x.group === group && x.enabled()); if (it) return it.pos; }
    if (group) { const it = nearestOf((x) => x.group === group); if (it) return it.pos; }
    return items.find((i) => i.id === st.target)?.pos ?? null;
  }
  const way = new THREE.Vector3();
  function waypoint() {
    const tp = targetPos();
    if (!tp) return null;
    const me = walker.state, r = Math.hypot(me.x, me.z);
    const here = levelOf(me.feet, r), there = levelOf(tp.y - 1, Math.hypot(tp.x, tp.z));
    if (here?.id === 'fora' && there?.id === 'fora') return { pos: tp, hint: null };
    if (here && here.id !== 'fora' && there?.id === 'fora') {
      const a = ENTRANCES[0];
      return { pos: way.set(Math.cos(a) * 110, 0, Math.sin(a) * 110), hint: 'Saia da árvore pela abertura entre as raízes' };
    }
    if (!here || here.id === 'fora') {
      let best = ENTRANCES[0], bd = Infinity;
      for (const a of ENTRANCES) { const d = Math.hypot(Math.cos(a) * 100 - me.x, Math.sin(a) * 100 - me.z); if (d < bd) { bd = d; best = a; } }
      return { pos: way.set(Math.cos(best) * 96, 0, Math.sin(best) * 96), hint: 'Entre no tronco por uma das aberturas entre as raízes' };
    }
    if (there && here.id !== there.id) {
      const up = there.level > here.level;
      const onRamp = r > DISK_R - 0.5 && r < 74.5 && Math.abs(me.feet - here.level) > 1.5;
      const a = junctionAngle(onRamp ? there.level : here.level), y = onRamp ? there.level : here.level;
      return { pos: way.set(Math.cos(a) * 64, y, Math.sin(a) * 64), hint: `Pegue a rampa e ${up ? 'suba' : 'desça'} até ${there.name} (${Math.round(there.level)} m)` };
    }
    return { pos: tp, hint: null };
  }

  // =================== per-frame ===================
  let saveTimer = 0, hazardToast = 0;
  // the light trail on the ground: glowing dots from the explorer toward the next objective,
  // only where the floor is walkable (so it never shows through a wall or over water)
  const TRAIL_N = 22;
  const trailMesh = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.16, 0.2, 0.05, 14), new THREE.MeshBasicMaterial({ color: new THREE.Color('#ffd98a').multiplyScalar(1.6), transparent: true, opacity: 0.85, depthWrite: false }), TRAIL_N);
  trailMesh.frustumCulled = false;
  scene.add(trailMesh);
  const tm4 = new THREE.Matrix4(), tq = new THREE.Quaternion(), tsc = new THREE.Vector3(), tpos = new THREE.Vector3();
  let targetNow = null;
  function updateTrail(me, goal, t) {
    const hide = (k) => { tsc.setScalar(0.0001); tm4.compose(tpos.set(0, -999, 0), tq, tsc); trailMesh.setMatrixAt(k, tm4); };
    if (!goal) { for (let k = 0; k < TRAIL_N; k++) hide(k); trailMesh.instanceMatrix.needsUpdate = true; return; }
    const dx = goal.x - me.x, dz = goal.z - me.z, len = Math.hypot(dx, dz) || 1;
    for (let k = 0; k < TRAIL_N; k++) {
      const d = Math.min(len, 2.4 * (k + 1));
      const x = me.x + (dx / len) * d, z = me.z + (dz / len) * d;
      const fl = walker.floorAt(x, z, me.feet);
      const ok = d < len && Math.abs(fl - me.feet) < 2.5 && !biomes.noGo.some((f) => f(x, z, fl)) && !blockedAt(x, z, fl);
      if (!ok) { hide(k); continue; }
      const pulse = 0.85 + 0.25 * Math.sin(t * 4 - k * 0.45);
      tsc.setScalar(pulse * (0.7 + 0.3 * (1 - k / TRAIL_N)));
      tm4.compose(tpos.set(x, fl + 0.12, z), tq, tsc);
      trailMesh.setMatrixAt(k, tm4);
    }
    trailMesh.instanceMatrix.needsUpdate = true;
  }
  // the objective's world point for the screen marker (main.js projects it)
  const targetPoint = () => targetNow;
  let mobFinder = null;
  let current = null;
  function update(dt, t, { running, flying, camYaw }) {
    flames.forEach((f, i) => { f.scale.y = 1 + Math.sin(t * 9 + i) * 0.15; });
    for (const ch of chests) ch.c.pulse(t);
    updateSeals(t, dt);
    if (storyPending && Math.hypot(walker.state.x, walker.state.z) < 98 && !dialogue) {
      const r = storyPending; storyPending = null;
      tellStory(r, () => hud.banner(`Andar 1 de ${REGIONS_PLAN.length}`, 'Floresta das Raízes', `Missão: ${PLAN.raizes.mission}`));
    }
    hud.progress(...stageProgress());
    for (const n of nodes) if (n.timer > 0) { n.timer -= dt; if (n.timer <= 0) n.mesh.visible = true; }
    const me = walker.state;
    for (const n of Object.values(npcs)) {
      const d = Math.hypot(me.x - n.pos.x, me.z - n.pos.z);
      n.c.idle(dt, t, d < 10 ? Math.atan2(-(me.x - n.pos.x), -(me.z - n.pos.z)) : null);
    }
    if (ended) return;
    const here = levelOf(me.feet, Math.hypot(me.x, me.z));
    setAmbience(here?.id ?? 'fora');

    if (!dialogue && !storyOpen) {
      // mana refills steadily; life comes back on its own a few seconds after the last hit
      state.mana = Math.min(NEEDS.mana, (state.mana ?? NEEDS.mana) + NEEDS.manaPerSec * dt);
      sinceHurt += dt;
      if (sinceHurt > 5) state.health = Math.min(maxHealth(), state.health + NEEDS.regenPerSec * (cls().regen ?? 1) * dt * (1 + state.level * 0.1));
      // heat, cold or spores: the region's outfit protects; the camp is always safe
      const hz = here && PLAN[here.id]?.hazard;
      hazardToast -= dt;
      if (hz && outfitDef()?.resist !== hz && !cheats.invulnerable && Math.hypot(me.x - camps[here.id].x, me.z - camps[here.id].z) > 16) {
        state.health = Math.max(0, state.health - NEEDS.hazardPerSec * dt);
        if (hazardToast <= 0) { hud.toast(HAZARD_NAMES[hz]); hazardToast = 14; }
      }
      if (state.health <= 0) faint();
      if (needsMet()) advance();
    }

    // nearest usable thing
    let near = null, nd = Infinity;
    for (const it of items) {
      if (!it.radius || !it.enabled()) continue;
      const dx = it.pos.x - me.x, dz = it.pos.z - me.z, dy = it.pos.y - (me.feet + 1);
      const d = Math.hypot(dx, dz);
      if (d < it.radius && Math.abs(dy) < 4 && d < nd) { nd = d; near = it; }
    }
    current = near;
    hud.prompt(near && !dialogue ? near.label() : null);
    if (benchOpen && (!near || near.id !== `bancada_${benchOpen}`)) { benchOpen = null; hud.workbench(null); }

    const wp = waypoint();
    const tp = targetPos();
    targetNow = tp;
    updateTrail(me, wp ? wp.pos : tp, t);
    const tpDist = tp ? Math.hypot(tp.x - me.x, tp.z - me.z) : 0;
    beacon.visible = !!tp && tpDist > 6;               // close by, the beam would hide what you came for
    if (tp) { beacon.position.set(tp.x, tp.y - 1.2, tp.z); ring.scale.setScalar(1 + Math.sin(t * 3) * 0.12); beam.material.opacity = 0.25 + Math.sin(t * 3) * 0.1; }
    if (wp) {
      const dx = wp.pos.x - me.x, dz = wp.pos.z - me.z;
      hud.guide(Math.hypot(dx, dz, (wp.pos.y || me.feet) - me.feet), Math.atan2(-dx, -dz) - camYaw, wp.hint);
    } else hud.guide(null);
    hud.needs(state, { maxHealth: maxHealth(), maxMana: NEEDS.mana, xpFrac: state.xp / xpNeed(state.level) });

    saveTimer += dt;
    if (saveTimer > 15) { saveTimer = 0; save(); }
  }
  const onFaint = [];

  // ---- combat hooks ----
  const cheats = { invulnerable: false, frozenNeeds: false };
  let sinceHurt = 99;
  function hurt(n) {
    if (cheats.invulnerable) return;
    sinceHurt = 0;
    let dmg = n * (1 - Math.min(0.65, (outfitDef()?.guard ?? 0) + cls().guard));
    // the shield layer takes the blow first
    if (state.barrier > 0) { const a = Math.min(state.barrier, dmg); state.barrier -= a; dmg -= a; if (state.barrier <= 0) hud.toast('O escudo quebrou!', 'xp'); }
    state.health = Math.max(0, state.health - dmg);
    hud.hurt();
    if (state.health <= 0) faint();
  }
  // creatures drop their region's material (the one that is not a node)
  function loot(biome) {
    const item = PLAN[biome]?.mats.drop[0] ?? 'erva';
    give(item, 1);
    hud.toast(`A criatura deixou: ${ITEMS[item].name}`, 'loot');
  }
  // the guardian's fragment: intact when the guardian was restored or spared, cracked when destroyed
  function fragmentOf(id, how) {
    const b = bossList.find((x) => x.id === id);
    if (!b?.fragment) return;
    const [fid] = b.fragment;
    if (!state.inv[fid]) give(fid, 1);
    if (how !== 'destruir') state.flags[`intacto_${fid}`] = true;
    hud.reveal(how === 'destruir' ? 'Fragmento rachado' : 'Fragmento do Coração', ITEMS[fid].name, [ITEMS[fid].fragment, `Fragmentos: ${held()}/${FRAGMENTS.length} · intactos ${intact()}/${FRAGMENTS.length}`], how === 'destruir' ? '#a8a8a8' : '#9dffcf');
  }
  // killed outright (no yield, e.g. by the GM's staff): counts as destroying it
  function bossDefeated(id, remote = false) {
    if (state.flags[`boss_${id}`]) return;
    state.flags[`boss_${id}`] = true;
    state.flags[`escolha_${id}`] = state.flags[`escolha_${id}`] ?? 'destruir';
    hud.message(remote ? `Um amigo derrotou ${bossName(id)}.` : `${bossName(id)} caiu.`);
    fragmentOf(id, 'destruir');
    if (!remote) bossEvents.forEach((f) => f(id, 'destruir'));
    save();
  }
  // the boss yields: the player decides its fate in a conversation
  function bossYield(id) {
    sfx('yield');
    dialogue = { graph: DIALOGUES[`${id}_rendido`], npc: null };
    goto(dialogue.graph.start);
  }
  const outcomeHooks = [];
  const identityHooks = [];       // told the character's class and look when a character starts
  const bossEvents = [];          // told to the party when this player decides a guardian's fate
  function resolveBoss(id, how, remote = false) {
    if (state.flags[`boss_${id}`]) return;
    state.flags[`boss_${id}`] = true;
    state.flags[`escolha_${id}`] = how;
    outcomeHooks.forEach((f) => f(id, how));
    if (remote) hud.toast(`Um amigo ${how === 'destruir' ? 'destruiu' : 'restaurou'} ${bossName(id)}.`, 'xp');
    else bossEvents.forEach((f) => f(id, how));
    if (how !== 'destruir') gainXp(xpFor(bossList.find((b) => b.id === id)?.kind === 'sub' ? 'sub' : 'boss'));
    fragmentOf(id, how);
    save();
  }
  const CHOICE_NAMES = { destruir: 'destruído', poupar: 'poupado', restaurar: 'restaurado', simbiose: 'em simbiose' };
  function choicesSummary() {
    const rows = bossList.filter((b) => b.kind === 'boss' && state.flags[`escolha_${b.id}`]).map((b) => `${bossName(b.id)}: ${CHOICE_NAMES[state.flags[`escolha_${b.id}`]]}`);
    const sides = Object.keys(SIDES).filter((P) => state.flags[`lado_${P}`]).map((P) => SIDES[P][state.flags[`lado_${P}`]].after);
    return (rows.length ? ` ${STRINGS.ESCOLHAS} ${rows.join(' · ')}. Fragmentos intactos: ${intact()}/${FRAGMENTS.length}.` : '') + (sides.length ? ` Pelos andares: ${sides.join(' ')}` : '');
  }
  // each guardian's special rules, from its mechanic (counted in state.count)
  const mechDone = (m) => (state.count[m.group] ?? 0) >= m.count;
  function bossRules(id) {
    const b = bossList.find((x) => x.id === id);
    if (!b) return {};
    if (id === FINAL_BOSS) return { armorMul: Math.min(1, 0.5 + 0.1 * held()), ...(b.mechanic?.effect === 'summon' ? {} : {}) };
    const m = b.mechanic;
    const out = {};
    if (id === 'devoradorTroncos' || id === 'sacerdotisa') out.stationary = true;
    if (!m) return out;
    if (m.effect === 'armor') out.armorMul = mechDone(m) ? 1 : 0.35;
    if (m.effect === 'regen') out.regen = mechDone(m) ? 0 : 0.04;
    if (m.effect === 'summon') out.summon = mechDone(m) ? null : { type: 'loboGeada', every: 12, max: 3 };
    if (m.effect === 'yield') out.yieldAt = mechDone(m) ? 0.9 : 0.25;
    return out;
  }

  function faint() {
    hud.message(`Você desmaiou. A comunidade de ${REGION_NAMES[state.camp]} te encontrou e cuidou de você.`);
    onFaint.forEach((f) => f());
    state.health = Math.round(maxHealth() * 0.6); state.mana = NEEDS.mana; state.barrier = 0;
    spawnAtCamp();
  }
  function spawnAtCamp() {
    const L = state.camp ?? 'fora';
    const p = L === 'fora' ? camps.fora.clone().add(V(Math.cos(APPROACH.angle) * 7, 0, Math.sin(APPROACH.angle) * 7)) : spot(L, loopOf(L), 0.1, 6);
    if (L === 'fora') p.y = walker.floorAt(p.x, p.z, 20);
    const m = npcs[L === 'fora' ? 'thalor' : PLAN[L].npc.id].pos;
    walker.teleport({ x: p.x, z: p.z, feet: p.y, yaw: Math.atan2(-(m.x - p.x), -(m.z - p.z)), pitch: -0.15 });
  }

  // ---- four character slots, each with its own save (per-viewer convenience: wrapped in
  // try/catch; the game works without storage, progress then lasts for this visit) ----
  const key = (n) => `${SAVE_PREFIX}${n}`;
  function save() {
    if (deleted) return;
    try {
      const me = walker.state;
      state.pos = { x: me.x, z: me.z, feet: me.feet, yaw: me.yaw };
      localStorage.setItem(key(slot), JSON.stringify(state));
    } catch { /* storage unavailable */ }
  }
  function readSlot(n) {
    try { const s = JSON.parse(localStorage.getItem(key(n))); return s && STAGES.some((x) => x.id === s.stage) ? s : null; } catch { return null; }
  }
  // what the title screen shows for each slot
  function profiles() {
    return [0, 1, 2, 3].map((n) => {
      const s = readSlot(n);
      if (!s) return null;
      const st = STAGES[stageIndex(s.stage)];
      return { name: s.name, cls: s.cls, level: s.level, place: st.region === 'fora' ? 'Fora da árvore' : `Andar ${ORDER.indexOf(st.region) + 1}`, done: st.kind === 'end' };
    });
  }
  let deleted = false;
  function deleteSlot(n) { if (n === slot) deleted = true; try { localStorage.removeItem(key(n)); } catch { /* ignore */ } }
  // start the slot: a new character when `profile` is given, else continue its save
  function start(n = 0, profile = null) {
    slot = n;
    deleted = false;
    ended = false;
    dialogue = null;
    benchOpen = null;
    hud.workbench(null);
    const saved = profile ? null : readSlot(n);
    state = saved ? { ...freshState(), ...saved } : freshState(profile ?? {});
    if (!saved) { state.health = maxHealth(); save(); }
    identityHooks.forEach((f) => f(state));
    applyWorld();
    showObjective();
    hud.inventory(state);
    hud.closeDialogue();
    if (saved && state.pos) walker.teleport({ x: state.pos.x, z: state.pos.z, feet: state.pos.feet, yaw: state.pos.yaw, pitch: -0.15 });
    else spawnAtCamp();
    if (stage().kind === 'end') finish();
    else tellStory(stage().region, floorBanner);
  }

  // ---- the story card before each place, shown once per character ----
  let storyOpen = false;
  let storyPending = null;          // the Raízes story, told when the explorer walks through the portal
  function tellStory(region, then) {
    const st = STORIES[region];
    if (!st || state.seen?.[region]) { then?.(); return; }
    state.seen = { ...(state.seen ?? {}), [region]: true };
    storyOpen = true;
    const kicker = region === 'fora' ? 'Prólogo' : `Andar ${ORDER.indexOf(region) + 1} de ${REGIONS_PLAN.length}`;
    hud.story(kicker, st.title, st.lines, () => { storyOpen = false; save(); then?.(); });
  }

  // ---- the seals: outside until level 5; floor N+1 needs level 10 x N and floor N's guardian ----
  function openFloors() {
    if (state.level < 5) return 0;
    let n = 1;
    for (let i = 0; i < REGIONS_PLAN.length - 1; i++) {
      if (state.flags[`boss_${REGIONS_PLAN[i].boss.type}`] && state.level >= (i + 1) * 10) n++;
      else break;
    }
    return n;
  }
  function sealReason(n) {   // why floor n (1-based) is still sealed
    if (n === 1) return `Selo das raízes: alcance o nível 5 (você está no ${state.level})`;
    const r = REGIONS_PLAN[n - 2];
    const need = [];
    if (state.level < (n - 1) * 10) need.push(`nível ${(n - 1) * 10} (você está no ${state.level})`);
    if (!state.flags[`boss_${r.boss.type}`]) need.push(`vencer ${guardianName(r.boss.type)}`);
    return `Selo de ${REGION_NAMES[REGIONS_PLAN[n - 1].id].replace(/^(a|o) /, '')}: falta ${need.join(' e ')}`;
  }
  // can the explorer step onto (x, z) at floor height fl? returns null or the reason
  function blockedAt(x, z, fl) {
    if (!sealsOn) return null;                 // free exploration (Explorar livremente) ignores them
    const open = openFloors();
    const r = Math.hypot(x, z);
    if (open === 0 && r < 104) return sealReason(1);                       // the trunk's mouth
    if (open < BIOMES.length && r > 58 && r < 84 && fl >= BIOMES[open].level - 1) return sealReason(open + 1);  // the ramp up to the locked floor
    return null;
  }
  // seal visuals: a glowing rune wall across the ramp above each locked floor, and rings at the
  // tree's entrances while the outside is not done
  const sealMat = new THREE.MeshBasicMaterial({ color: '#ffb347', transparent: true, opacity: 0.35, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false });
  const seals = [];
  for (let n = 2; n <= BIOMES.length; n++) {
    const y = BIOMES[n - 2].level + 16, { a } = rampAt(y / RAMP.top);
    const wall = new THREE.Mesh(new THREE.PlaneGeometry(9, 6), sealMat);
    wall.position.set(Math.cos(a) * 70, y + 3, Math.sin(a) * 70);
    wall.lookAt(wall.position.x - Math.sin(a), wall.position.y, wall.position.z + Math.cos(a));
    scene.add(wall);
    label(`Selo · nível ${(n - 1) * 10}`, wall.position.clone().setY(y + 7), '#ffcf8a');
    seals.push({ n, wall });
  }
  // the Portal das Raízes at every way into the trunk: sealed until level 5, then it dissolves
  const portals = ENTRANCES.map((a) => {
    const pt = makePortal();
    const r = 107, x = Math.cos(a) * r, z = Math.sin(a) * r;
    pt.root.position.set(x, walker.floorAt(x, z, 20), z);
    pt.root.rotation.y = Math.atan2(Math.cos(a), Math.sin(a));
    for (const side of [-1, 1]) {               // the two stone pillars (the tangent is (-sin a, cos a))
      const px = x - Math.sin(a) * 4.6 * side, pz = z + Math.cos(a) * 4.6 * side;
      walker.addObstacle?.(px, pz, 1.3, pt.root.position.y - 1, pt.root.position.y + 14);
    }
    scene.add(pt.root);
    // the mist that fills the whole opening behind it, so the inside cannot be seen
    const mist = makeMistWall({ radius: 101, angle: a, y: walker.floorAt(Math.cos(a) * 101, Math.sin(a) * 101, 20) });
    scene.add(mist.root);
    pt.mist = mist;
    return pt;
  });
  {
    const a = ENTRANCES[0], p = V(Math.cos(a) * 112, 0, Math.sin(a) * 112);
    p.y = walker.floorAt(p.x, p.z, 20);
    label('Portal das Raízes · nível 5', p.clone().setY(p.y + 13.5), '#ffcf8a');
    add({ id: 'portal', kind: 'quest', pos: p.clone().setY(p.y + 1), radius: 7, label: () => (openFloors() ? 'Atravessar o portal' : `Portal selado: nível 5 (você está no ${state.level})`), enabled: () => openFloors() === 0, use: () => hud.message(`${sealReason(1)}. Cace criaturas e abra o baú da clareira para ganhar experiência.`) });
  }
  let portalOpen = 0;
  function updateSeals(t, dt = 0.016) {
    const open = openFloors();
    for (const s of seals) s.wall.visible = s.n > open;
    sealMat.opacity = 0.25 + Math.sin(t * 2) * 0.1;
    // the portal: when the seal breaks it dissolves over 1.5 s, with a burst and a title card
    if (open >= 1 && portalOpen === 0 && !state.flags.portal_aberto) {
      state.flags.portal_aberto = true;
      portalOpen = 0.0001;
      for (const pt of portals) fx?.chest(pt.root.position.clone().setY(pt.root.position.y + 6), '#ffcf7a');
      sfx('epic');
      hud.banner('Portal das Raízes', 'O selo se abriu', 'Você é forte o bastante: entre na árvore', 'level');
    }
    if (state.flags.portal_aberto && portalOpen < 1) portalOpen = portalOpen === 0 ? 1 : Math.min(1, portalOpen + dt / 1.5);
    if (!state.flags.portal_aberto) portalOpen = 0;
    for (const pt of portals) { pt.spin(t); pt.open(portalOpen); pt.mist.drift(t); pt.mist.fade(Math.min(1, portalOpen * 1.2)); }
  }

  // every kill: XP as a share of the place's band, and kill counters for objectives
  function onKill(biome, bossId) {
    if (bossId) { gainXp(xpFor(bossList.find((b) => b.id === bossId)?.kind === 'sub' ? 'sub' : 'boss', biome)); return; }
    state.count[`abate_${biome}`] = (state.count[`abate_${biome}`] ?? 0) + 1;
    gainXp(xpFor('mob', biome));
  }

  applyWorld();

  return {
    get state() { return state; },
    get busy() { return !!dialogue || storyOpen; },
    profiles, deleteSlot, openFloors, blockedAt, onKill, tellStory,
    get cls() { return cls(); },
    setMobFinder: (f) => { mobFinder = f; },
    setAmbushHook: (f) => { ambushHook = f; },
    onBossEvent: (f) => bossEvents.push(f),
    onIdentity: (f) => { identityHooks.push(f); f(state); },
    // a friend decided a guardian's fate: the same outcome here, without the conversation
    remoteBoss(id, how) {
      if (!bossList.some((b) => b.id === id) || state.flags[`boss_${id}`]) return;
      if (!['destruir', 'poupar', 'restaurar'].includes(how) || id === FINAL_BOSS) return;
      const b = bossList.find((x) => x.id === id);
      if (stageIndex(state.stage) < stageIndex(b.wakeFrom)) return;     // not there yet: no skipping
      how = 'destruir';                                                  // the fragment comes cracked
      if (how === 'destruir') bossDefeated(id, true); else resolveBoss(id, how, true);
      save();
    },
    // what the party sees of this player (display data for the group)
    partySnapshot() {
      const me = walker.state, here = levelOf(me.feet, Math.hypot(me.x, me.z));
      const r = here?.id ?? stage().region;
      return { name: state.name, cls: state.cls, level: state.level, place: r, hp: Math.round((state.health / maxHealth()) * 100) };
    },
    setPartyNear(n) { partyNear = n > 0; },
    setSeals(on) { sealsOn = !!on; },
    set partyNear(v) { partyNear = v; },
    get partyNear() { return partyNear; },
    healPct(p) { state.health = Math.min(maxHealth(), state.health + maxHealth() * p); },
    get slot() { return slot; },
    interact() { if (!dialogue && current) current.use(); },
    update, drink, useItem, equip, craft, start, save, targetPoint, hurt, loot, bossDefeated, bossYield, cheats, gainXp, bossList,
    power, maxHealth, weapon, bossRules, lairs, camps, weaponDef, outfitDef,
    bossTier: (id) => ORDER.indexOf(bossList.find((b) => b.id === id)?.biome) + 1,
    onGear: (f) => { gearHooks.push(f); f(weaponDef(), outfitDef()); },
    onBossOutcome: (f) => outcomeHooks.push(f),
    bossChoice: (id) => state.flags[`escolha_${id}`] ?? null,
    heal() { state.health = maxHealth(); state.mana = NEEDS.mana; },
    // mana for abilities: false (and a notice) when there is not enough
    spendMana(n) { if (cheats.invulnerable || (state.mana ?? 0) >= n) { if (!cheats.invulnerable) state.mana -= n; return true; } hud.toast(`Mana insuficiente (${Math.floor(state.mana)}/${n})`, 'xp'); return false; },
    gainMana(n) { state.mana = Math.min(NEEDS.mana, (state.mana ?? 0) + n); },
    addBarrier(n) { state.barrier = Math.min(maxHealth(), (state.barrier ?? 0) + n); },
    // GM: jump to any stage with the world made consistent (what the stages before it needed)
    jumpTo(id) {
      const i = stageIndex(id);
      const f = state.flags;
      state.count = {};
      for (const k of Object.keys(f)) if (k !== 'cantil') delete f[k];
      for (const st of STAGES.slice(0, i)) if (st.kind === 'side') {
        const side = f[`lado_${st.region}`] ?? 'a';
        f[`lado_${st.region}`] = side;
        state.count[st.groups[side]] = 3;
        for (let n = 0; n < 3; n++) f[`${st.groups[side]}_${n}`] = true;
      }
      for (const st of STAGES.slice(0, i)) for (const [k, v] of Object.entries(st.need ?? {})) {
        if (k.startsWith('boss_')) {
          const bid = k.slice(5), b = bossList.find((x) => x.id === bid);
          f[k] = true; f[`escolha_${bid}`] = 'restaurar';
          if (b?.fragment) { state.inv[b.fragment[0]] = 1; f[`intacto_${b.fragment[0]}`] = true; }
        } else if (ITEMS[k]) state.inv[k] = Math.max(state.inv[k] ?? 0, v);
        else { state.count[k] = v; for (let n = 0; n < v; n++) f[`${k}_${n}`] = true; }
      }
      // wear the best gear among what the stages gave
      const owned = Object.keys(state.inv).map((k) => [k, ITEMS[k]]);
      const bestW = owned.filter(([, it]) => it.weapon).sort((a, b) => b[1].weapon.tier - a[1].weapon.tier)[0];
      const bestO = owned.filter(([, it]) => it.outfit).sort((a, b) => b[1].outfit.guard - a[1].outfit.guard)[0];
      state.equip = { weapon: bestW?.[0] ?? null, outfit: bestO?.[0] ?? null };
      state.stage = id;
      state.camp = STAGES[i].region;
      ended = false;
      applyWorld();
      showObjective();
      hud.inventory(state);
      save();
      if (stage().kind === 'end') finish();
    },
    reviveBosses() { for (const b of bossList) { delete state.flags[`boss_${b.id}`]; delete state.flags[`escolha_${b.id}`]; } save(); },
    onFaint: (f) => onFaint.push(f),
    nearSafeZone: (biome, x, z, d) => (camps[biome] && Math.hypot(camps[biome].x - x, camps[biome].z - z) < d) || Math.hypot(x, z) < 15,
    bossShouldWake: (id) => {
      const b = bossList.find((x) => x.id === id);
      return !!b && !state.flags[`boss_${id}`] && stageIndex(state.stage) >= stageIndex(b.wakeFrom);
    },
    bossAwake: (id) => { const b = bossList.find((x) => x.id === id); return !!b && !state.flags[`boss_${id}`] && stageIndex(state.stage) >= stageIndex(b.wakeFrom); },
    choose(i) { hud.pick(i); },
    debug: { items, objects, advance, talk, goto: (n) => goto(n), get dialogue() { return dialogue; }, targetPos, waypoint, openBench, intact, held, setStage: (s) => { state.stage = s; applyWorld(); showObjective(); } },
  };
}

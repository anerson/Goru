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
import { BIOMES, DISK_R, ENTRANCES, junctionAngle } from '../tree/layout.js';
import { createCharacter } from '../character.js';
import {
  REGIONS_PLAN, ITEMS, RECIPES, RESOURCES, STAGES, stageIndex, DIALOGUES, dialogueFor, SPEAKERS, STRINGS, BOSSES,
  NEEDS, FLASK, HAZARD_NAMES, BASE_WEAPON, weaponStats, FRAGMENTS, ENDINGS, guardianName, REGION_NAMES,
} from './campaign_data.js';
import { makeNode, makeObject, makeWorkbench } from './looks.js';

const SAVE_KEY = 'aetherion-campanha-v2';
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const PLAN = Object.fromEntries(REGIONS_PLAN.map((r) => [r.id, r]));
const ORDER = REGIONS_PLAN.map((r) => r.id);
const ROMAN = ['I', 'II', 'III', 'IV'];

function freshState() {
  return {
    stage: STAGES[0].id,
    inv: {},                 // item id -> count
    flask: FLASK.capacity,   // sips left
    flags: { cantil: true }, // done objects, bosses, choices, intact fragments
    health: 100, thirst: 100, hunger: 100,
    count: {},               // quest counters per group
    equip: { weapon: null, outfit: null },
    camp: 'raizes',          // where you wake after fainting
    xp: 0, level: 1,
    pos: null,
  };
}

export function createGame({ scene, biomes, walker, hud }) {
  const rand = mulberry32(777);
  const h = (id, x, z) => biomes.terrains[id](x, z);
  let state = freshState();
  let dialogue = null;
  let ended = false;
  const levelY = Object.fromEntries(BIOMES.map((b) => [b.id, b.level]));

  // ---- placement: everything sits on or beside a trail, so it is reachable ----
  const lines = biomes.paths;
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
  function villager(id, pos, look) {
    const c = createCharacter({ name: id, light: false, pack: false, scale: 1, ...look });
    c.root.position.copy(pos);
    scene.add(c.root);
    npcs[id] = { c, pos };
    add({ id, kind: 'npc', pos: pos.clone().setY(pos.y + 1), radius: 4, label: () => `Falar com ${SPEAKERS[id]}`, use: () => talk(id) });
  }
  const hutMat = new THREE.MeshStandardMaterial({ color: '#7a5a3a', roughness: 0.9 });
  const roofMat = new THREE.MeshStandardMaterial({ color: '#8a6a3a', roughness: 1, flatShading: true });
  const tentMat = new THREE.MeshStandardMaterial({ color: '#c9a36a', roughness: 1, side: THREE.DoubleSide, flatShading: true });
  function hut(pos, r = 3) {
    const wall = new THREE.Mesh(new THREE.CylinderGeometry(r, r * 1.05, 2.6, 12), hutMat);
    wall.position.copy(pos).setY(pos.y + 1.3);
    const roof = new THREE.Mesh(new THREE.ConeGeometry(r * 1.35, 2.4, 12), roofMat);
    roof.position.copy(pos).setY(pos.y + 3.8);
    wall.castShadow = roof.castShadow = true;
    scene.add(wall, roof);
  }
  function tent(pos, rot) {
    const t = new THREE.Mesh(new THREE.ConeGeometry(2.6, 3, 4, 1, true), tentMat);
    t.position.copy(pos).setY(pos.y + 1.5);
    t.rotation.y = rot;
    t.castShadow = true;
    scene.add(t);
  }
  const flames = [];
  function fire(pos) {
    const logs = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 1, 0.3, 10), hutMat);
    logs.position.copy(pos).setY(pos.y + 0.15);
    const flame = new THREE.Mesh(new THREE.ConeGeometry(0.5, 1.3, 8), new THREE.MeshBasicMaterial({ color: new THREE.Color('#ffb347').multiplyScalar(2) }));
    flame.position.copy(pos).setY(pos.y + 0.9);
    const light = new THREE.PointLight('#ffb062', 120, 25, 2);
    light.position.copy(pos).setY(pos.y + 2);
    scene.add(logs, flame, light);
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

  // =================== the ten regions ===================
  const camps = {};          // region -> camp centre (safe zone, respawn)
  const lairs = {};          // boss id -> position
  const objects = [];        // { group, i, done(bool), flag }
  const stageOfGroup = {};   // group -> the stage from which its objects can be used
  for (const st of STAGES) if (st.kind === 'group') stageOfGroup[st.target] = st.id; else if (st.group) stageOfGroup[st.group] = st.id;
  const LABELS = {
    spring: 'Examinar a nascente', tracks: 'Examinar as marcas', tracksRed: 'Examinar a marca de ferrão', rescue: 'Remover os escombros',
    web: 'Tecer a trama de raízes', canal: 'Limpar o canal', barrel: 'Levar o jarro de água', sand: 'Desobstruir o reservatório',
    valve: 'Girar a válvula', sample: 'Coletar a amostra', station: 'Vasculhar a estação', algae: 'Desobstruir sem ferir os filtradores',
    crack: 'Mapear a ruptura', chimney: 'Regular a chaminé', forge: 'Desligar a fornalha', tower: 'Desobstruir a torre de ar',
    icePlate: 'Derreter a placa de gelo', root: 'Cortar a raiz', logs: 'Desfazer o bloqueio', bones: 'Examinar os restos',
    sporeFocus: 'Drenar o foco fúngico', vent: 'Abrir a ventilação', crystal: 'Tocar o cristal', crystalDark: 'Desativar o cristal falso',
    mirror: 'Ativar o refletor', brace: 'Instalar a escora', sail: 'Armar a vela', flower: 'Restaurar as flores',
  };

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
    add({ id: `bancada_${L}`, kind: 'bench', pos: bench.clone().setY(bench.y + 1), radius: 3.5, label: () => 'Usar a bancada de criação', use: () => openBench(L) });
    const barrel = spot(L, lo, 0.075, -5);
    put(makeObject('barrel').root, barrel);
    add({ id: `agua_${L}`, kind: 'water', pos: barrel.clone().setY(barrel.y + 1), radius: 3, label: () => 'Beber e encher o cantil', use: () => water() });

    // the investigation steps along the loop trail
    const slots = [0.2, 0.26, 0.32, 0.38, 0.44, 0.74, 0.8, 0.86, 0.92];
    let si = 0;
    const place = (def, posFor) => {
      for (let i = 0; i < def.count; i++) {
        const p = posFor(i);
        const obj = makeObject(def.look);
        put(obj.root, p);
        if (def.ordered) label(ROMAN[i], p.clone().setY(p.y + (def.look === 'chimney' ? 11.5 : 4)));
        const flag = `${def.group}_${i}`;
        objects.push({ group: def.group, i, done: obj.done, flag });
        add({
          id: flag, group: def.group, kind: 'quest', pos: p.clone().setY(p.y + 1), radius: def.look === 'station' ? 5 : 3.8,
          label: () => `${def.label ?? LABELS[def.look] ?? 'Examinar'}${def.ordered ? ` ${ROMAN[i]}` : ''}`,
          enabled: () => stageIndex(state.stage) >= stageIndex(stageOfGroup[def.group]) && !state.flags[flag],
          use: () => useObject(def, i, ri),
        });
      }
    };
    for (const s of r.steps) place(s, () => { const k = si++; return k < slots.length ? spot(L, lo, slots[k], k % 2 ? -6 : 6) : spot(L, (k % 3) + (L === 'raizes' ? 0 : 1), 0.35, 4); });
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
      const li = k % ls.length, frac = 0.14 + ((k * 0.37 + res.item.length * 0.11) % 0.74), side = (k % 2 ? 1 : -1) * (2.4 + (k % 3));
      const pos = spot(res.biome, li, frac, side);
      const mesh = makeNode(res.item, lookOf[res.item]);
      put(mesh, pos);
      const node = { item: res.item, mesh, respawn: res.respawn, timer: 0 };
      nodes.push(node);
      add({ id: `node_${res.biome}_${res.item}_${k}`, group: res.item, kind: 'resource', pos: pos.clone().setY(pos.y + 0.6), radius: 2.4, label: () => `Coletar ${ITEMS[res.item].name.toLowerCase()}`, enabled: () => node.timer <= 0, use: () => collect(node) });
    }
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
  const weapon = () => { const w = weaponDef(); if (weaponCache?.id !== w.id) weaponCache = { id: w.id, stats: weaponStats(w) }; return weaponCache.stats; };
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
  const xpNeed = (L) => Math.round(60 * L ** 1.35);
  const maxHealth = () => 100 + 10 * (state.level - 1);
  const power = () => 1 + 0.05 * (state.level - 1);
  function gainXp(n) {
    state.xp += Math.round(n);
    while (state.xp >= xpNeed(state.level)) {
      state.xp -= xpNeed(state.level);
      state.level++;
      state.health = maxHealth();
      hud.toast(`Nível ${state.level}! Vida máxima ${maxHealth()}`);
    }
  }

  // =================== rules ===================
  const stage = () => STAGES[stageIndex(state.stage)];
  const regionIndex = () => ORDER.indexOf(stage().region) + 1;
  const showObjective = () => hud.objective(stage().text, stage().act, regionIndex(), REGION_NAMES[stage().region]);
  function advance() {
    const i = stageIndex(state.stage);
    if (i < STAGES.length - 1) state.stage = STAGES[i + 1].id;
    const st = stage();
    if (st.region !== STAGES[i].region || st.kind === 'talk') state.camp = STAGES[i].region;
    showObjective();
    hud.toast(st.region !== STAGES[i].region && st.kind !== 'end' ? `Andar ${regionIndex()} de 10: ${REGION_NAMES[st.region]}` : 'Novo objetivo');
    save();
    if (st.kind === 'end') finish();
  }
  function finish() {
    ended = true;
    const how = state.flags.escolha_devoradorSeiva ?? 'destruir';
    const outcome = PLAN.copa.boss.options.find((o) => o[0] === how)?.[2] ?? '';
    hud.ending(ENDINGS[how] ?? 'Fim da campanha', `${outcome}${choicesSummary()}`);
  }
  const intact = () => FRAGMENTS.filter((f) => state.flags[`intacto_${f}`]).length;
  const held = () => FRAGMENTS.filter((f) => state.inv[f]).length;
  function needsMet() {
    const n = stage().need;
    if (!n) return false;
    return Object.entries(n).every(([k, v]) => {
      if (k.startsWith('boss_')) return !!state.flags[k];
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
    hud.toast(`+1 ${ITEMS[node.item].name}`);
  }
  function water() {
    state.thirst = 100;
    state.flask = FLASK.capacity;
    hud.toast('Sede saciada. Cantil cheio (3 goles).');
    hud.inventory(state);
  }
  function drink() {
    if (state.flask <= 0) return hud.toast('O cantil está vazio. Encha no barril de um acampamento.');
    state.flask -= 1;
    state.thirst = Math.min(100, state.thirst + FLASK.sip);
    hud.toast(`Um gole. Restam ${state.flask}.`);
    hud.inventory(state);
  }
  function useItem(id) {
    const it = ITEMS[id];
    if (!it || !state.inv[id]) return;
    if (it.weapon || it.outfit) return equip(id);
    if (!it.use) return;
    take(id, 1);
    if (it.use.hunger) state.hunger = Math.min(100, state.hunger + it.use.hunger);
    if (it.use.health) state.health = Math.min(maxHealth(), state.health + it.use.health);
    hud.toast(`${it.verb}: ${it.name}`);
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
    hud.toast(`Criado: ${ITEMS[rc.output].name}`);
    // a new weapon or outfit is put on at once when it is better than what is worn
    const it = ITEMS[rc.output];
    if (it.weapon && it.weapon.tier > weaponDef().tier) equip(rc.output);
    if (it.outfit && it.outfit.guard > (outfitDef()?.guard ?? 0)) equip(rc.output);
    gainXp(10 + 6 * ORDER.indexOf(rc.region ?? 'raizes'));
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
  function useObject(def, i, ri) {
    const flag = `${def.group}_${i}`;
    const n = state.count[def.group] ?? 0;
    if (def.ordered && i !== n) {
      // out of order: the sequence resets, and it hurts
      for (const o of objects) if (o.group === def.group) { delete state.flags[o.flag]; o.done(false); }
      state.count[def.group] = 0;
      hurt(8 + ri * 2);
      hud.message(`Ordem errada! Tudo volta ao início. Siga a sequência ${ROMAN.slice(0, def.count).join(', ')}.`);
      return;
    }
    state.flags[flag] = true;
    state.count[def.group] = n + 1;
    objects.find((o) => o.flag === flag)?.done(true);
    gainXp(12 + ri * 4);
    const line = def.done ? `${def.done} (${n + 1}/${def.count})` : `${def.label ?? LABELS[def.look]}: ${n + 1}/${def.count}`;
    if (def.look === 'station' || def.look === 'bones' || def.look === 'rescue') hud.message(line); else hud.toast(line);
  }
  function applyWorld() {
    for (const o of objects) o.done(!!state.flags[o.flag]);
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
  function levelOf(y, r) {
    if (r > DISK_R + 25) return null;
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
    if (!st.target) return null;
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
    const group = st.kind === 'group' ? st.target : st.group;
    if (group) { const it = nearestOf((x) => x.group === group); if (it) return it.pos; }
    return items.find((i) => i.id === st.target)?.pos ?? null;
  }
  const way = new THREE.Vector3();
  function waypoint() {
    const tp = targetPos();
    if (!tp) return null;
    const me = walker.state, r = Math.hypot(me.x, me.z);
    const here = levelOf(me.feet, r), there = levelOf(tp.y - 1, Math.hypot(tp.x, tp.z));
    if (!here) {
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
  let current = null;
  function update(dt, t, { running, flying, camYaw }) {
    flames.forEach((f, i) => { f.scale.y = 1 + Math.sin(t * 9 + i) * 0.15; });
    for (const n of nodes) if (n.timer > 0) { n.timer -= dt; if (n.timer <= 0) n.mesh.visible = true; }
    const me = walker.state;
    for (const n of Object.values(npcs)) {
      const d = Math.hypot(me.x - n.pos.x, me.z - n.pos.z);
      n.c.idle(dt, t, d < 10 ? Math.atan2(-(me.x - n.pos.x), -(me.z - n.pos.z)) : null);
    }
    if (ended) return;
    const here = levelOf(me.feet, Math.hypot(me.x, me.z));

    if (!dialogue) {
      // needs drain on the game clock
      const k = flying ? NEEDS.flyFactor : running ? NEEDS.runFactor : 1;
      if (cheats.frozenNeeds) { state.thirst = 100; state.hunger = 100; }
      else {
        state.thirst = Math.max(0, state.thirst - NEEDS.thirstPerSec * k * dt);
        state.hunger = Math.max(0, state.hunger - NEEDS.hungerPerSec * dt);
      }
      if (state.thirst <= 0 || state.hunger <= 0) state.health = Math.max(0, state.health - NEEDS.starvePerSec * dt * ((state.thirst <= 0) + (state.hunger <= 0)));
      else if (state.thirst > 50 && state.hunger > 50) state.health = Math.min(maxHealth(), state.health + NEEDS.regenPerSec * dt);
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
    beacon.visible = !!tp;
    if (tp) { beacon.position.set(tp.x, tp.y - 1.2, tp.z); ring.scale.setScalar(1 + Math.sin(t * 3) * 0.12); beam.material.opacity = 0.25 + Math.sin(t * 3) * 0.1; }
    if (wp) {
      const dx = wp.pos.x - me.x, dz = wp.pos.z - me.z;
      hud.guide(Math.hypot(dx, dz, (wp.pos.y || me.feet) - me.feet), Math.atan2(-dx, -dz) - camYaw, wp.hint);
    } else hud.guide(null);
    hud.needs(state, { maxHealth: maxHealth(), xpFrac: state.xp / xpNeed(state.level) });

    saveTimer += dt;
    if (saveTimer > 15) { saveTimer = 0; save(); }
  }
  const onFaint = [];

  // ---- combat hooks ----
  const cheats = { invulnerable: false, frozenNeeds: false };
  function hurt(n) {
    if (cheats.invulnerable) return;
    state.health = Math.max(0, state.health - n * (1 - (outfitDef()?.guard ?? 0)));
    hud.hurt();
    if (state.health <= 0) faint();
  }
  // creatures drop their region's material (the one that is not a node)
  function loot(biome) {
    const item = PLAN[biome]?.mats.drop[0] ?? 'erva';
    give(item, 1);
    hud.toast(`A criatura deixou: ${ITEMS[item].name}`);
  }
  // the guardian's fragment: intact when the guardian was restored or spared, cracked when destroyed
  function fragmentOf(id, how) {
    const b = bossList.find((x) => x.id === id);
    if (!b?.fragment) return;
    const [fid] = b.fragment;
    if (!state.inv[fid]) give(fid, 1);
    if (how !== 'destruir') state.flags[`intacto_${fid}`] = true;
    hud.toast(`Fragmento obtido: ${ITEMS[fid].name}${how === 'destruir' ? ' (rachado)' : ''}`);
  }
  // killed outright (no yield, e.g. by the GM's staff): counts as destroying it
  function bossDefeated(id) {
    if (state.flags[`boss_${id}`]) return;
    state.flags[`boss_${id}`] = true;
    state.flags[`escolha_${id}`] = state.flags[`escolha_${id}`] ?? 'destruir';
    hud.message(`${bossName(id)} caiu.`);
    fragmentOf(id, 'destruir');
    save();
  }
  // the boss yields: the player decides its fate in a conversation
  function bossYield(id) {
    dialogue = { graph: DIALOGUES[`${id}_rendido`], npc: null };
    goto(dialogue.graph.start);
  }
  const outcomeHooks = [];
  const BOSS_XP = {};
  function resolveBoss(id, how) {
    state.flags[`boss_${id}`] = true;
    state.flags[`escolha_${id}`] = how;
    outcomeHooks.forEach((f) => f(id, how));
    if (how !== 'destruir') gainXp(BOSS_XP[id] ?? 200);
    fragmentOf(id, how);
    save();
  }
  const CHOICE_NAMES = { destruir: 'destruído', poupar: 'poupado', restaurar: 'restaurado', simbiose: 'em simbiose' };
  function choicesSummary() {
    const rows = bossList.filter((b) => b.kind === 'boss' && state.flags[`escolha_${b.id}`]).map((b) => `${bossName(b.id)}: ${CHOICE_NAMES[state.flags[`escolha_${b.id}`]]}`);
    return rows.length ? ` ${STRINGS.ESCOLHAS} ${rows.join(' · ')}. Fragmentos intactos: ${intact()}/10.` : '';
  }
  // each guardian's special rules, from its mechanic (counted in state.count)
  const mechDone = (m) => (state.count[m.group] ?? 0) >= m.count;
  function bossRules(id) {
    const b = bossList.find((x) => x.id === id);
    if (!b) return {};
    if (id === 'devoradorSeiva') return { armorMul: Math.min(1, 0.3 + 0.07 * held()) };
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
    state.health = Math.round(maxHealth() * 0.6); state.thirst = 60; state.hunger = 60;
    spawnAtCamp();
  }
  function spawnAtCamp() {
    const L = state.camp ?? 'raizes';
    const p = spot(L, loopOf(L), 0.1, 6);
    const m = npcs[PLAN[L].npc.id].pos;
    walker.teleport({ x: p.x, z: p.z, feet: p.y, yaw: Math.atan2(-(m.x - p.x), -(m.z - p.z)), pitch: -0.15 });
  }

  // ---- save / load (per-viewer convenience: wrapped in try/catch, game works without it) ----
  function save() {
    try {
      const me = walker.state;
      state.pos = { x: me.x, z: me.z, feet: me.feet, yaw: me.yaw };
      localStorage.setItem(SAVE_KEY, JSON.stringify(state));
    } catch { /* storage unavailable */ }
  }
  function hasSave() { try { return !!localStorage.getItem(SAVE_KEY); } catch { return false; } }
  function load() {
    try {
      const s = JSON.parse(localStorage.getItem(SAVE_KEY));
      if (s && STAGES.some((x) => x.id === s.stage)) { state = { ...freshState(), ...s }; return true; }
    } catch { /* new game */ }
    return false;
  }
  function start(continueGame) {
    ended = false;
    dialogue = null;
    benchOpen = null;
    hud.workbench(null);
    if (!(continueGame && load())) {
      state = freshState();
      try { localStorage.removeItem(SAVE_KEY); } catch { /* ignore */ }
    }
    applyWorld();
    showObjective();
    hud.inventory(state);
    hud.closeDialogue();
    if (continueGame && state.pos) walker.teleport({ x: state.pos.x, z: state.pos.z, feet: state.pos.feet, yaw: state.pos.yaw, pitch: -0.15 });
    else spawnAtCamp();
    if (stage().kind === 'end') finish();
  }

  applyWorld();

  return {
    get state() { return state; },
    get busy() { return !!dialogue; },
    interact() { if (!dialogue && current) current.use(); },
    update, drink, useItem, equip, craft, start, hasSave, save, hurt, loot, bossDefeated, bossYield, cheats, gainXp, bossList,
    power, maxHealth, weapon, bossRules, lairs, camps, weaponDef, outfitDef,
    bossTier: (id) => ORDER.indexOf(bossList.find((b) => b.id === id)?.biome) + 1,
    setBossXp: (id, xp) => { BOSS_XP[id] = xp; },
    onGear: (f) => { gearHooks.push(f); f(weaponDef(), outfitDef()); },
    onBossOutcome: (f) => outcomeHooks.push(f),
    bossChoice: (id) => state.flags[`escolha_${id}`] ?? null,
    heal() { state.health = maxHealth(); state.thirst = 100; state.hunger = 100; },
    // GM: jump to any stage with the world made consistent (what the stages before it needed)
    jumpTo(id) {
      const i = stageIndex(id);
      const f = state.flags;
      state.count = {};
      for (const k of Object.keys(f)) if (k !== 'cantil') delete f[k];
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

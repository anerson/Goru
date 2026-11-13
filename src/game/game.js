// Act I gameplay: survival needs, inventory and flask, resource nodes, villagers and their
// conversations, the quest chain, the sluice and shrine, the water that comes back, the
// contamination signs, guidance toward the next objective, and saving.
// Game state lives in one plain object (`state`); meshes only show it.
import * as THREE from 'three';
import { mulberry32 } from '../noise.js';
import { BIOMES, DISK_R, ENTRANCES, junctionAngle } from '../tree/layout.js';
import { createCharacter } from '../character.js';
import { NEEDS, ITEMS, FLASK, RESOURCES, STAGES, stageIndex, DIALOGUES, dialogueFor, SPEAKERS, STRINGS, INSPECT } from './data.js';

const SAVE_KEY = 'aetherion-ato1-v1';
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const LEVEL = Object.fromEntries(BIOMES.map((b) => [b.id, b]));

function freshState() {
  return {
    stage: 'chegada',
    inv: {},                 // item id -> count
    flask: 0,                // sips left (0..FLASK.capacity)
    flags: {},               // cantil, sinal_1.., nucleo_colocado, ...
    health: 100, thirst: 100, hunger: 100,
    pos: null,               // { x, z, feet, yaw } when saved
  };
}

export function createGame({ scene, biomes, walker, hud }) {
  const rand = mulberry32(777);
  const h = (id, x, z) => biomes.terrains[id](x, z);
  let state = freshState();
  let dialogue = null;       // { graph, node }
  let ended = false;

  // ---- placement helpers: everything sits on or beside a trail, so it is reachable ----
  const lines = biomes.paths;
  function along(id, li, frac, side = 0) {
    const line = lines[id][li];
    const i = Math.min(line.length - 2, Math.max(0, Math.floor(frac * (line.length - 1))));
    const a = line[i], b = line[i + 1];
    const tx = b.x - a.x, tz = b.z - a.z, tl = Math.hypot(tx, tz) || 1;
    const x = a.x - (tz / tl) * side, z = a.z + (tx / tl) * side;
    return V(x, h(id, x, z), z);
  }
  const LOOP = { raizes: 1 };                          // index of the loop trail per level
  const loopOf = (id) => LOOP[id] ?? 4;

  // ---- interactables ----
  const items = [];          // { id, pos, radius, label, enabled, use, kind, mesh? }
  const add = (o) => { items.push({ radius: 3.2, enabled: () => true, ...o }); return o; };

  // villagers
  const npcs = {};
  function villager(id, pos, look) {
    const c = createCharacter({ name: id, light: false, pack: false, scale: 1, ...look });
    c.root.position.copy(pos);
    scene.add(c.root);
    npcs[id] = { c, pos };
    add({ id, kind: 'npc', pos: pos.clone().setY(pos.y + 1), radius: 4, label: () => `Falar com ${SPEAKERS[id]}`, use: () => talk(id) });
  }

  // simple huts and tents
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
  function fire(pos) {
    const logs = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 1, 0.3, 10), hutMat);
    logs.position.copy(pos).setY(pos.y + 0.15);
    const flame = new THREE.Mesh(new THREE.ConeGeometry(0.5, 1.3, 8), new THREE.MeshBasicMaterial({ color: new THREE.Color('#ffb347').multiplyScalar(2) }));
    flame.position.copy(pos).setY(pos.y + 0.9);
    const light = new THREE.PointLight('#ffb062', 120, 25, 2);
    light.position.copy(pos).setY(pos.y + 2);
    scene.add(logs, flame, light);
    return flame;
  }
  const flames = [];
  const glowMat = (c, k = 1.6) => new THREE.MeshBasicMaterial({ color: new THREE.Color(c).multiplyScalar(k) });

  // ---------- Floresta das Raízes: the village, the spring, the dry stream ----------
  const village = along('raizes', loopOf('raizes'), 0.5, 0);
  {
    const L = 'raizes';
    for (const [f, s] of [[0.45, 8], [0.5, 9], [0.55, 8], [0.52, -8]]) hut(along(L, loopOf(L), f, s), 2.6 + rand());
    flames.push(fire(along(L, loopOf(L), 0.5, 3.5)));
    villager('maela', along(L, loopOf(L), 0.49, -3), { shirt: '#6b4a7a', pants: '#3a2a3a', hat: '#d8d0c0', skin: '#b98a68' });
    villager('brin', along(L, loopOf(L), 0.56, -3.5), { shirt: '#8a5a2a', pants: '#3a3a2a', hat: '#5a4a2a', skin: '#d0a07c' });
    const spring = along(L, loopOf(L), 0.43, -6);
    const pool = new THREE.Mesh(new THREE.CircleGeometry(2.2, 24), new THREE.MeshStandardMaterial({ color: '#3a8fb0', roughness: 0.05, emissive: '#0f3a55', emissiveIntensity: 0.7 }));
    pool.rotation.x = -Math.PI / 2; pool.position.copy(spring).setY(spring.y + 0.06);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(2.3, 0.35, 6, 20), new THREE.MeshStandardMaterial({ color: '#7d7a70', flatShading: true }));
    rim.rotation.x = Math.PI / 2; rim.position.copy(pool.position);
    scene.add(pool, rim);
    add({ id: 'nascente', kind: 'water', pos: spring.clone().setY(spring.y + 1), radius: 3.5, label: () => (state.flags.cantil ? 'Encher o cantil e beber' : 'Beber da nascente'), use: () => water('nascente') });
  }
  // the dry stream: a cracked bed from the trunk wall to the clearing, water appears once restored
  const streamA = junctionAngle(0) + Math.PI / 2;
  const streamPts = [];
  for (let k = 0; k <= 60; k++) {
    const r = 98 - k * 1.4, a = streamA + Math.sin(k * 0.17) * 0.06;
    const x = Math.cos(a) * r, z = Math.sin(a) * r;
    streamPts.push(V(x, h('raizes', x, z) + 0.06, z));
  }
  const bedMat = new THREE.MeshStandardMaterial({ color: '#6a5236', roughness: 1, polygonOffset: true, polygonOffsetFactor: -4 });
  const streamWater = new THREE.MeshStandardMaterial({ color: '#2f5f63', roughness: 0.05, emissive: '#16302e', emissiveIntensity: 0.6, transparent: true, opacity: 0.9, polygonOffset: true, polygonOffsetFactor: -6 });
  const bed = new THREE.Mesh(strip(streamPts, 3.2, 0), bedMat);
  const flow = new THREE.Mesh(strip(streamPts, 2.6, 0.08), streamWater);
  bed.receiveShadow = true;
  scene.add(bed, flow);
  const leitoPos = streamPts[22];
  add({ id: 'leito', kind: 'inspect', pos: leitoPos.clone().setY(leitoPos.y + 1), radius: 5, label: () => 'Examinar o leito do riacho', enabled: () => true, use: () => inspect('leito') });

  // ---------- Deserto da Casca: caravan, sluice, shrine, oasis ----------
  {
    const L = 'deserto';
    const camp = along(L, 4, 0.25, 7);
    tent(camp, 0.3); tent(along(L, 4, 0.22, 10), 1.1); tent(along(L, 4, 0.28, 11), 2.2);
    flames.push(fire(along(L, 4, 0.25, 3)));
    villager('tarek', along(L, 4, 0.255, -3), { shirt: '#c96a2a', pants: '#5a4a3a', hat: '#e0c080', skin: '#a87a58' });
  }
  const comportaPos = along('deserto', 2, 0.4, 7);
  const comporta = buildSluice(comportaPos);
  add({ id: 'comporta', kind: 'inspect', pos: comportaPos.clone().setY(comportaPos.y + 1.5), radius: 5.5, label: () => (state.inv.nucleo ? 'Encaixar o Núcleo de Seiva I' : 'Examinar a Comporta Antiga'), use: () => useSluice() });
  const santuarioPos = along('deserto', 4, 0.7, 8);
  const shrine = buildShrine(santuarioPos);
  add({ id: 'santuario', kind: 'inspect', pos: santuarioPos.clone().setY(santuarioPos.y + 1.5), radius: 5, label: () => (state.flags.santuario ? 'Santuário aberto' : 'Abrir o Santuário da Resina'), enabled: () => !state.flags.santuario, use: () => useShrine() });
  const oasisPos = along('deserto', 3, 0.5, 8);
  const oasisDry = new THREE.Mesh(new THREE.CircleGeometry(5, 32), new THREE.MeshStandardMaterial({ color: '#8a6a44', roughness: 1, polygonOffset: true, polygonOffsetFactor: -4 }));
  oasisDry.rotation.x = -Math.PI / 2; oasisDry.position.copy(oasisPos).setY(oasisPos.y + 0.05);
  const oasisWet = new THREE.Mesh(new THREE.CircleGeometry(4.6, 32), new THREE.MeshStandardMaterial({ color: '#2f7f8a', roughness: 0.05, emissive: '#0d3c44', emissiveIntensity: 0.6, polygonOffset: true, polygonOffsetFactor: -6 }));
  oasisWet.rotation.x = -Math.PI / 2; oasisWet.position.copy(oasisPos).setY(oasisPos.y + 0.1);
  scene.add(oasisDry, oasisWet);
  add({ id: 'oasis', kind: 'water', pos: oasisPos.clone().setY(oasisPos.y + 1), radius: 6, label: () => 'Beber no oásis', enabled: () => !!state.flags.agua, use: () => water('oasis') });

  // ---------- Oceano Interior: Ilian and the contamination signs ----------
  villager('ilian', along('oceano', 5, 0.1, 0), { shirt: '#2a6a8a', pants: '#2a3a4a', hat: '#c9b88a', skin: '#c08a64' });
  const signs = [];
  [[0.15, 1], [0.5, 2], [0.82, 3]].forEach(([f, n]) => {
    const p = along('oceano', 4, f, 5.5);
    const level = LEVEL.oceano.level - 1.2 + 0.05;
    const patch = new THREE.Mesh(new THREE.CircleGeometry(3 + n * 0.5, 24), new THREE.MeshStandardMaterial({ color: '#1a1f12', roughness: 0.3, transparent: true, opacity: 0.85 }));
    patch.rotation.x = -Math.PI / 2; patch.position.set(p.x, Math.max(level, p.y + 0.05), p.z);
    scene.add(patch);
    if (n === 2) for (let k = 0; k < 6; k++) {
      const fish = new THREE.Mesh(new THREE.SphereGeometry(0.25, 8, 6), new THREE.MeshStandardMaterial({ color: '#c9c9b8' }));
      fish.scale.set(1.8, 0.5, 0.7); fish.position.set(p.x + (rand() - 0.5) * 4, patch.position.y + 0.08, p.z + (rand() - 0.5) * 4);
      scene.add(fish);
    }
    signs.push(add({ id: `sinal_${n}`, group: 'sinal', kind: 'inspect', pos: patch.position.clone().setY(patch.position.y + 1.2), radius: 7, label: () => 'Examinar a água escura', enabled: () => stageIndex(state.stage) >= stageIndex('sinais') && !state.flags[`sinal_${n}`], use: () => inspectSign(n) }));
  });

  // ---------- resource nodes along each region's trails ----------
  const nodeMeshes = {};
  const nodeLook = {
    cogumelo: () => { const g = new THREE.Group(); const st = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 0.35, 8), new THREE.MeshStandardMaterial({ color: '#efe6d0' })); st.position.y = 0.17; const cap = new THREE.Mesh(new THREE.SphereGeometry(0.28, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshStandardMaterial({ color: '#e8d6b0', emissive: '#6a5a30', emissiveIntensity: 0.4 })); cap.position.y = 0.35; g.add(st, cap); return g; },
    erva: () => { const m = new THREE.Mesh(new THREE.ConeGeometry(0.35, 0.7, 6), new THREE.MeshStandardMaterial({ color: '#7fd16a', emissive: '#2a6a1a', emissiveIntensity: 0.5 })); m.position.y = 0.35; return m; },
    resina: () => { const m = new THREE.Mesh(new THREE.SphereGeometry(0.35, 12, 10), glowMat('#ffb347', 1.3)); m.scale.set(1, 1.4, 1); m.position.y = 0.4; return m; },
    alga: () => { const m = new THREE.Mesh(new THREE.ConeGeometry(0.25, 0.9, 5), new THREE.MeshStandardMaterial({ color: '#3fae7a', emissive: '#155a3a', emissiveIntensity: 0.6 })); m.position.y = 0.45; return m; },
  };
  const nodes = [];
  for (const res of RESOURCES) {
    const ls = lines[res.biome];
    for (let k = 0; k < res.count; k++) {
      const li = k % ls.length, frac = 0.12 + ((k * 0.37 + res.item.length * 0.11) % 0.76), side = (k % 2 ? 1 : -1) * (2.6 + (k % 3));
      const pos = along(res.biome, li, frac, side);
      if (res.biome === 'oceano') pos.y = Math.max(pos.y, LEVEL.oceano.level - 1.2 + 0.7);
      const mesh = nodeLook[res.item]();
      mesh.position.add(pos);
      scene.add(mesh);
      const node = { item: res.item, mesh, respawn: res.respawn, timer: 0 };
      nodes.push(node);
      add({ id: `node_${res.item}_${k}`, group: res.item, kind: 'resource', pos: pos.clone().setY(pos.y + 0.6), radius: 2.4, label: () => `Coletar ${ITEMS[res.item].name.toLowerCase()}`, enabled: () => node.timer <= 0, use: () => collect(node) });
    }
  }

  // ---------- quest beacon ----------
  const beacon = new THREE.Group();
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 18, 12, 1, true), new THREE.MeshBasicMaterial({ color: '#ffd76a', transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
  beam.position.y = 9;
  const ring = new THREE.Mesh(new THREE.TorusGeometry(1.4, 0.08, 6, 32).rotateX(Math.PI / 2), new THREE.MeshBasicMaterial({ color: new THREE.Color('#ffd76a').multiplyScalar(1.5) }));
  beacon.add(beam, ring);
  scene.add(beacon);

  // =================== rules ===================
  const stage = () => STAGES[stageIndex(state.stage)];
  function advance() {
    const i = stageIndex(state.stage);
    if (i < STAGES.length - 1) state.stage = STAGES[i + 1].id;
    hud.objective(stage().text);
    hud.toast('Novo objetivo');
    applyWorld();
    save();
    if (state.stage === 'concluido') { ended = true; hud.ending(STRINGS.FIM_ATO); }
  }
  function needsMet() {
    const n = stage().need;
    if (!n) return false;
    return Object.entries(n).every(([k, v]) => {
      if (k === 'cantil') return state.flags.cantil && state.flask >= v;
      if (k === 'sinal') return [1, 2, 3].filter((i) => state.flags[`sinal_${i}`]).length >= v;
      return (state.inv[k] ?? 0) >= v;
    });
  }
  function give(item, n) { state.inv[item] = (state.inv[item] ?? 0) + n; hud.inventory(state); }
  function take(item, n) { state.inv[item] = Math.max(0, (state.inv[item] ?? 0) - n); if (!state.inv[item]) delete state.inv[item]; hud.inventory(state); }

  function collect(node) {
    give(node.item, 1);
    node.timer = node.respawn;
    node.mesh.visible = false;
    hud.toast(`+1 ${ITEMS[node.item].name}`);
  }
  function water(source) {
    state.thirst = 100;
    if (state.flags.cantil) { state.flask = FLASK.capacity; hud.toast(source === 'oasis' ? INSPECT.oasis : 'Cantil cheio (3 goles). Sede saciada.'); }
    else hud.toast('Você bebe da nascente. Sede saciada.');
    hud.inventory(state);
  }
  function drink() {
    if (!state.flags.cantil) return hud.toast('Você ainda não tem um cantil.');
    if (state.flask <= 0) return hud.toast('O cantil está vazio. Encha numa fonte de água.');
    state.flask -= 1;
    state.thirst = Math.min(100, state.thirst + FLASK.sip);
    hud.toast(`Um gole. Restam ${state.flask}.`);
    hud.inventory(state);
  }
  function useItem(id) {
    const it = ITEMS[id];
    if (!it?.use || !state.inv[id]) return;
    take(id, 1);
    if (it.use.hunger) state.hunger = Math.min(100, state.hunger + it.use.hunger);
    if (it.use.health) state.health = Math.min(100, state.health + it.use.health);
    hud.toast(`${it.verb}: ${it.name}`);
  }
  function inspect(what) {
    hud.message(INSPECT[what]);
    if (what === 'leito' && state.stage === 'leito') advance();
  }
  function inspectSign(n) {
    state.flags[`sinal_${n}`] = true;
    hud.message(INSPECT[`sinal_${n}`]);
    const count = [1, 2, 3].filter((i) => state.flags[`sinal_${i}`]).length;
    hud.toast(`Sinais de contaminação: ${count}/3`);
  }
  function useSluice() {
    if (state.flags.agua) return hud.message(INSPECT.comporta_restaurada);
    if (state.inv.nucleo) {
      take('nucleo', 1);
      state.flags.agua = true;
      hud.message(INSPECT.comporta_restaurada);
      // whatever order the player did things in, restoring the water moves the story on
      while (stageIndex(state.stage) < stageIndex('amarga')) advance();
      applyWorld();
      return;
    }
    hud.message(stageIndex(state.stage) > stageIndex('comporta') ? INSPECT.comporta_sem_nucleo : INSPECT.comporta_fechada);
    if (state.stage === 'comporta') advance();
  }
  function useShrine() {
    if (!state.inv.chave) return hud.message(INSPECT.santuario_trancado);
    take('chave', 1);
    give('nucleo', 1);
    state.flags.santuario = true;
    hud.message(INSPECT.santuario_aberto);
    applyWorld();
    if (state.stage === 'nucleo') advance();
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
    if (fx.take) for (const [k, v] of Object.entries(fx.take)) take(k, v);
    if (fx.give) for (const [k, v] of Object.entries(fx.give)) give(k, v);
    if (fx.flag) { state.flags[fx.flag] = true; if (fx.flag === 'cantil') { state.flask = 0; hud.toast('Você recebeu um cantil.'); } }
    if (fx.advance) advance();
  }
  function goto(nodeId) {
    const node = dialogue.graph.nodes[nodeId];
    applyEffects(node.do);
    if (node.end) { dialogue = null; hud.closeDialogue(); return; }
    const choices = node.choices?.map((c) => ({ text: STRINGS[c.text], pick: () => { applyEffects(c.do); goto(c.to); } }));
    hud.dialogue(SPEAKERS[node.speaker], STRINGS[node.line], choices ?? [{ text: 'Continuar', pick: () => goto(node.next) }]);
  }

  // ---- what the world shows for the current state ----
  function applyWorld() {
    const restored = !!state.flags.agua;
    flow.visible = restored;
    oasisWet.visible = restored;
    oasisDry.visible = !restored;
    comporta.lit(restored, !!state.inv.nucleo || restored);
    shrine.open(!!state.flags.santuario);
  }

  // ---- guidance: the next place to walk toward, through the ramp if the target is on another level ----
  function levelOf(y, r) {
    if (r > DISK_R + 25) return null;                      // outside the trunk
    let best = null;
    for (const b of BIOMES) if (y > b.level - 1.5 && y < b.level + 26) best = b;
    return best;
  }
  function targetPos() {
    const st = stage();
    if (!st.target) return null;
    if (st.target === 'sinal') {
      const open = signs.filter((s) => !state.flags[s.id]);
      return open.length ? open[0].pos : null;
    }
    if (st.target === 'nascente' && (state.inv.cogumelo ?? 0) < 3) {
      // first the mushrooms, then the spring: point at the nearest mushroom still growing
      const me = walker.state;
      let best = null, bd = Infinity;
      for (const it of items) if (it.group === 'cogumelo' && it.enabled()) { const d = Math.hypot(it.pos.x - me.x, it.pos.z - me.z); if (d < bd) { bd = d; best = it; } }
      if (best) return best.pos;
    }
    if (st.target === 'tarek' && st.id === 'resina') {
      const me = walker.state;
      let best = null, bd = Infinity;
      for (const it of items) if (it.group === 'resina' && it.enabled()) { const d = Math.hypot(it.pos.x - me.x, it.pos.z - me.z); if (d < bd) { bd = d; best = it; } }
      if (best) return best.pos;
    }
    return items.find((i) => i.id === st.target)?.pos ?? null;
  }
  const way = new THREE.Vector3();
  function waypoint() {
    const tp = targetPos();
    if (!tp) return null;
    const me = walker.state, r = Math.hypot(me.x, me.z);
    const here = levelOf(me.feet, r), there = levelOf(tp.y - 1, Math.hypot(tp.x, tp.z));
    if (!here) {
      // outside: head for the nearest trunk entrance
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
  let saveTimer = 0;
  function update(dt, t, { running, flying, camYaw }) {
    flames.forEach((f, i) => { f.scale.y = 1 + Math.sin(t * 9 + i) * 0.15; });
    for (const n of nodes) if (n.timer > 0) { n.timer -= dt; if (n.timer <= 0) n.mesh.visible = true; }
    for (const [id, n] of Object.entries(npcs)) {
      const me = walker.state;
      const d = Math.hypot(me.x - n.pos.x, me.z - n.pos.z);
      n.c.idle(dt, t, d < 10 ? Math.atan2(-(me.x - n.pos.x), -(me.z - n.pos.z)) : null);
    }
    comporta.tick(t);
    if (ended) return;

    if (!dialogue) {
      // needs drain on the game clock (survival-crafting: tick with dt, never per frame)
      const k = flying ? NEEDS.flyFactor : running ? NEEDS.runFactor : 1;
      state.thirst = Math.max(0, state.thirst - NEEDS.thirstPerSec * k * dt);
      state.hunger = Math.max(0, state.hunger - NEEDS.hungerPerSec * dt);
      if (state.thirst <= 0 || state.hunger <= 0) state.health = Math.max(0, state.health - NEEDS.starvePerSec * dt * ((state.thirst <= 0) + (state.hunger <= 0)));
      else if (state.thirst > 50 && state.hunger > 50) state.health = Math.min(100, state.health + NEEDS.regenPerSec * dt);
      if (state.health <= 0) faint();
      if (needsMet()) advance();
    }

    // nearest usable thing
    const me = walker.state;
    let near = null, nd = Infinity;
    for (const it of items) {
      if (!it.enabled()) continue;
      const dx = it.pos.x - me.x, dz = it.pos.z - me.z, dy = it.pos.y - (me.feet + 1);
      const d = Math.hypot(dx, dz);
      if (d < it.radius && Math.abs(dy) < 4 && d < nd) { nd = d; near = it; }
    }
    current = near;
    hud.prompt(near && !dialogue ? near.label() : null);

    const wp = waypoint();
    const tp = targetPos();
    beacon.visible = !!tp;
    if (tp) { beacon.position.set(tp.x, tp.y - 1.2, tp.z); ring.scale.setScalar(1 + Math.sin(t * 3) * 0.12); beam.material.opacity = 0.25 + Math.sin(t * 3) * 0.1; }
    if (wp) {
      const dx = wp.pos.x - me.x, dz = wp.pos.z - me.z;
      const bearing = Math.atan2(-dx, -dz) - camYaw; // 0 = straight ahead
      hud.guide(Math.hypot(dx, dz, (wp.pos.y || me.feet) - me.feet), bearing, wp.hint);
    } else hud.guide(null);
    hud.needs(state);

    saveTimer += dt;
    if (saveTimer > 15) { saveTimer = 0; save(); }
  }
  let current = null;

  function faint() {
    hud.message('Você desmaiou de exaustão. Os moradores da Vila das Raízes te encontraram e cuidaram de você.');
    state.health = 60; state.thirst = 50; state.hunger = 50;
    spawnAtVillage();
  }
  function spawnAtVillage() {
    const p = along('raizes', loopOf('raizes'), 0.47, 0);
    const m = npcs.maela.pos;
    walker.teleport({ x: p.x, z: p.z, feet: p.y, yaw: Math.atan2(-(m.x - p.x), -(m.z - p.z)), pitch: -0.15 });
  }

  // ---- save / load (per-viewer convenience: wrapped in try/catch, game works without it) ----
  function save() {
    try {
      const me = walker.state;
      state.pos = { x: me.x, z: me.z, feet: me.feet, yaw: me.yaw };
      localStorage.setItem(SAVE_KEY, JSON.stringify(state));
    } catch { /* storage unavailable: progress lasts for this visit only */ }
  }
  function hasSave() {
    try { return !!localStorage.getItem(SAVE_KEY); } catch { return false; }
  }
  function load() {
    try {
      const s = JSON.parse(localStorage.getItem(SAVE_KEY));
      if (s && STAGES.some((x) => x.id === s.stage)) { state = { ...freshState(), ...s }; return true; }
    } catch { /* fall through to a new game */ }
    return false;
  }
  function start(continueGame) {
    ended = false;
    dialogue = null;
    if (!(continueGame && load())) {
      state = freshState();
      try { localStorage.removeItem(SAVE_KEY); } catch { /* ignore */ }
    }
    applyWorld();
    hud.objective(stage().text);
    hud.inventory(state);
    hud.closeDialogue();
    if (continueGame && state.pos) walker.teleport({ x: state.pos.x, z: state.pos.z, feet: state.pos.feet, yaw: state.pos.yaw, pitch: -0.15 });
    else spawnAtVillage();
    if (state.stage === 'concluido') { ended = true; hud.ending(STRINGS.FIM_ATO); }
  }

  applyWorld();

  return {
    get state() { return state; },
    get busy() { return !!dialogue; },
    interact() { if (!dialogue && current) current.use(); },
    update, drink, useItem, start, hasSave, save,
    choose(i) { hud.pick(i); },
    // test hooks
    debug: { items, advance, talk, goto: (n) => goto(n), get dialogue() { return dialogue; }, targetPos, waypoint, setStage: (s) => { state.stage = s; applyWorld(); hud.objective(stage().text); } },
  };

  // ---------- builders for the two ancient structures ----------
  function buildSluice(pos) {
    const g = new THREE.Group();
    g.position.copy(pos);
    const stone = new THREE.MeshStandardMaterial({ color: '#8a7f6a', roughness: 0.95, flatShading: true });
    for (const s of [-1, 1]) {
      const p = new THREE.Mesh(new THREE.BoxGeometry(1.6, 7, 1.6), stone);
      p.position.set(s * 3.4, 3.5, 0); p.castShadow = true; g.add(p);
    }
    const lintel = new THREE.Mesh(new THREE.BoxGeometry(8.6, 1.2, 1.8), stone);
    lintel.position.set(0, 7.4, 0); lintel.castShadow = true; g.add(lintel);
    const gates = new THREE.Mesh(new THREE.BoxGeometry(5.2, 4, 0.4), new THREE.MeshStandardMaterial({ color: '#5a4630', roughness: 0.8 }));
    gates.position.set(0, 2, 0); g.add(gates);
    const channel = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.4, 14), stone);
    channel.position.set(0, 0.2, 7); g.add(channel);
    const runeMat = new THREE.MeshBasicMaterial({ color: '#3a3a30' });
    const runes = [];
    for (let k = 0; k < 6; k++) { const r = new THREE.Mesh(new THREE.TorusGeometry(0.28, 0.06, 6, 12), runeMat); r.position.set((k - 2.5) * 1.3, 7.4, 0.95); g.add(r); runes.push(r); }
    const socket = new THREE.Mesh(new THREE.SphereGeometry(0.5, 16, 12), new THREE.MeshBasicMaterial({ color: '#2a2a22' }));
    socket.position.set(0, 4.6, 0.3); g.add(socket);
    g.lookAt(0, pos.y, 0);
    scene.add(g);
    let litNow = false;
    return {
      lit(on) {
        litNow = on;
        runeMat.color.set(on ? new THREE.Color('#7fffd0').multiplyScalar(1.6) : '#3a3a30');
        socket.material.color.set(on ? new THREE.Color('#9dffcf').multiplyScalar(2) : '#2a2a22');
        gates.position.y = on ? 5.4 : 2;
      },
      tick(t) { if (litNow) runes.forEach((r, i) => { r.rotation.z = t + i; }); },
    };
  }
  function buildShrine(pos) {
    const g = new THREE.Group();
    g.position.copy(pos);
    const stone = new THREE.MeshStandardMaterial({ color: '#b08a5a', roughness: 0.95, flatShading: true });
    const walls = new THREE.Mesh(new THREE.CylinderGeometry(3, 3.4, 4, 8, 1, true), stone);
    walls.position.y = 2; walls.castShadow = true;
    const roof = new THREE.Mesh(new THREE.ConeGeometry(3.8, 2.6, 8), stone);
    roof.position.y = 5.3; roof.castShadow = true;
    const door = new THREE.Mesh(new THREE.BoxGeometry(1.8, 2.8, 0.4), new THREE.MeshStandardMaterial({ color: '#ffb347', roughness: 0.2, transparent: true, opacity: 0.85, emissive: '#a85a10', emissiveIntensity: 0.6 }));
    door.position.set(0, 1.4, 3.1);
    const core = new THREE.Mesh(new THREE.IcosahedronGeometry(0.5, 1), glowMat('#9dffcf', 2));
    core.position.set(0, 1.6, 0);
    g.add(walls, roof, door, core);
    g.lookAt(0, pos.y, 0);
    scene.add(g);
    return { open(on) { door.visible = !on; core.visible = !on; } };
  }
}

// flat strip along points (for the stream bed and its water)
function strip(points, width, lift) {
  const pos = [], idx = [];
  points.forEach((p, i) => {
    const a = points[Math.max(i - 1, 0)], b = points[Math.min(i + 1, points.length - 1)];
    const tx = b.x - a.x, tz = b.z - a.z, tl = Math.hypot(tx, tz) || 1;
    const sx = (-tz / tl) * width / 2, sz = (tx / tl) * width / 2;
    pos.push(p.x - sx, p.y + lift, p.z - sz, p.x + sx, p.y + lift, p.z + sz);
    if (i < points.length - 1) { const k = i * 2; idx.push(k, k + 2, k + 1, k + 1, k + 2, k + 3); }
  });
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

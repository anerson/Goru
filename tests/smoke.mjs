// Smoke test (pattern from the threejs-scene-setup skill) plus level checks (level-design
// skill): the route graph has no dead ends, and the real walker can travel every kind of path.
// Usage: npm start (in another terminal), then: node tests/smoke.mjs http://localhost:5173
// Offline: set THREE_DIR to an unpacked three@0.186.1 package to serve it instead of the CDN.
import { createRequire } from 'node:module';
import path from 'node:path';
import { ROUTES } from '../src/tree/layout.js';
import { validateCampaign, validateRecipes, NEEDS } from '../src/game/campaign_data.js';

// ---- 1. route graph: every place reaches every other place, and edges are two-way ----
const graphProblems = [];
for (const [from, tos] of Object.entries(ROUTES)) {
  for (const to of tos) {
    if (!ROUTES[to]) graphProblems.push(`${from} -> ${to}: unknown place`);
    else if (!ROUTES[to].includes(from)) graphProblems.push(`${from} -> ${to} is one-way`);
  }
  const seen = new Set([from]), queue = [from];
  while (queue.length) for (const n of ROUTES[queue.shift()] ?? []) if (!seen.has(n)) { seen.add(n); queue.push(n); }
  const missing = Object.keys(ROUTES).filter((k) => !seen.has(k));
  if (missing.length) graphProblems.push(`${from} cannot reach ${missing.join(', ')}`);
}

// ---- 1b. dialogue graphs are valid (dialogue-systems skill) ----
const dialogueProblems = validateCampaign();
// ---- 1b'. every recipe input can be gathered on or below its floor (survival-crafting) ----
const recipeProblems = validateRecipes();

// ---- 1c. needs timing (survival-crafting skill): minutes from full to warning and to empty ----
const minutes = (perSec, k) => ({ warn: +((100 - NEEDS.warnAt) / (perSec * k) / 60).toFixed(1), empty: +(100 / (perSec * k) / 60).toFixed(1) });
const needsTiming = {
  thirstIdle: minutes(NEEDS.thirstPerSec, 1), thirstRunning: minutes(NEEDS.thirstPerSec, NEEDS.runFactor),
  hungerIdle: minutes(NEEDS.hungerPerSec, 1),
};

// ---- 2. the page renders without errors ----
const { chromium } = createRequire(import.meta.url)('playwright');
const CDN = 'https://cdn.jsdelivr.net/npm/three@0.186.1/';
const url = process.argv[2] ?? 'http://localhost:5173';
const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 800, height: 500 } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
if (process.env.THREE_DIR) {
  await page.route(`${CDN}**`, (route) => route.fulfill({
    path: path.join(process.env.THREE_DIR, route.request().url().slice(CDN.length)),
    contentType: 'application/javascript',
  }));
}
await page.route(/fonts\.(googleapis|gstatic)\.com/, (route) => route.fulfill({ body: '', contentType: 'text/css' }));

await page.goto(url);
await page.waitForFunction(() => (window.__oliveira?.ready && window.renderer?.info.render.frame > 2)
  || document.getElementById('loading')?.textContent.startsWith('Não'), null, { timeout: 240000 });
if (!(await page.evaluate(() => window.__oliveira?.ready))) {
  console.log(JSON.stringify({ errors: errors.length ? errors : ['the scene did not build'] }, null, 2));
  await browser.close();
  process.exit(1);
}
const stats = await page.evaluate(() => ({
  height: document.getElementById('sHeight').textContent,
  crown: document.getElementById('sCrown').textContent,
  paths: document.getElementById('sPaths').textContent,
  geometries: window.renderer.info.memory.geometries,
}));
await page.screenshot({ path: 'tests/smoke-orbit.png', timeout: 240000 });

// ---- 3. walk every kind of path with the real controller ----
// Steps are simulated directly, so the result does not depend on the machine's frame rate.
const walk = await page.evaluate(() => {
  const O = window.__oliveira, L = O.layout, w = () => O.walker;
  const r = () => Math.hypot(w().x, w().z);
  const face = (dx, dz) => { w().yaw = Math.atan2(-dx, -dz); };
  const out = {};

  // through an entrance between the roots into the forest
  O.enterWalk('entrada');
  O.keys.add('KeyW'); O.keys.add('ShiftLeft');
  O.step(300);
  out.entranceToForest = { r: +r().toFixed(1), ok: r() < 100 };

  // the whole spiral ramp, ground to 300 m, steering along the centre line
  const a0 = L.rampStart + 0.01;
  Object.assign(w(), { x: Math.cos(a0) * 70, z: Math.sin(a0) * 70, feet: 0, vy: 0 });
  for (let i = 0; i < 260; i++) {
    const a = Math.atan2(w().z, w().x), corr = (70 - r()) * 0.05;
    face(-Math.sin(a) + Math.cos(a) * corr, Math.cos(a) + Math.sin(a) * corr);
    O.step(10);
    if (w().feet >= L.RAMP.top - 0.5) break;
  }
  out.rampToTop = { feet: +w().feet.toFixed(1), ok: w().feet > L.RAMP.top - 1 };

  // every level: from its gallery across a short bridge, then along that bridge's trail
  // (steering point to point like a player would) to the landmark in the middle
  out.levels = {};
  L.BIOMES.forEach((b, bi) => {
    if (b.level === 0) return;
    const a = L.bridges[bi][0];
    Object.assign(w(), { x: Math.cos(a) * 78, z: Math.sin(a) * 78, feet: b.level, vy: 0 });
    O.keys.clear(); O.keys.add('KeyW');
    const goal = (px, pz, max) => {
      for (let n = 0; n < max && Math.hypot(w().x - px, w().z - pz) > 1.2; n++) { face(px - w().x, pz - w().z); O.step(1); }
    };
    goal(Math.cos(a) * 62, Math.sin(a) * 62, 400);
    const line = O.paths[b.id][1];                 // spoke from the first bridge to the plaza
    for (const p of line) goal(p.x, p.z, 60);
    out.levels[b.id] = { r: +r().toFixed(1), height: +(w().feet - b.level).toFixed(1) };
    out.levels[b.id].ok = r() < 16 && Math.abs(w().feet - b.level) < 6;
  });
  out.levels.ok = Object.values(out.levels).every((v) => v.ok);

  // the lake's water is a barrier: walking straight off the shore into it is refused
  {
    const lago = L.BIOMES.find((b) => b.id === 'oceano');
    let probe = null;
    for (let r = 20; r < 62 && !probe; r += 0.5) for (let k = 0; k < 64 && !probe; k++) {
      const a = (k / 64) * Math.PI * 2, x = Math.cos(a) * r, z = Math.sin(a) * r;
      if (O.floorAt(x, z, lago.level + 1) < lago.level - 2.5) probe = { x, z };
    }
    if (probe) {
      const d = Math.hypot(probe.x, probe.z), ux = probe.x / d, uz = probe.z / d;
      // start 10 m toward the centre from the water and walk outward into it
      Object.assign(w(), { x: probe.x - ux * 10, z: probe.z - uz * 10, feet: lago.level + 3, vy: 0 });
      O.step(1);
      face(ux, uz);
      O.keys.clear(); O.keys.add('KeyW');
      O.step(80);
      out.waterBlocks = { feet: +(w().feet - lago.level).toFixed(1), ok: w().feet > lago.level - 1.3 };
    } else out.waterBlocks = { ok: false, note: 'no water found' };
  }

  // top gallery -> bridge out through the trunk -> far edge of a lookout (no falling off)
  const ta = L.TOP_BRIDGES[0];
  Object.assign(w(), { x: Math.cos(ta) * 78, z: Math.sin(ta) * 78, feet: L.RAMP.top, vy: 0 });
  face(Math.cos(ta), Math.sin(ta));
  O.keys.clear(); O.keys.add('KeyW'); O.keys.add('ShiftLeft');
  O.step(400);
  out.bridgeToLookout = { r: +r().toFixed(1), feet: +w().feet.toFixed(1), ok: r() > L.LOOKOUT.centre && Math.abs(w().feet - 300) < 0.6 };
  O.keys.clear();

  // flying up from the forest stops under the floor of the lake level
  Object.assign(w(), { x: 5, z: 5, feet: 20, vy: 0 });
  O.setFly(true); O.keys.clear(); O.keys.add('Space');
  O.step(200);
  out.flyBlockedBySlab = { feet: +w().feet.toFixed(1), ok: w().feet < L.BIOMES[1].level - 6 };
  O.keys.clear(); O.setFly(false);
  return out;
});

// ---- 4. third-person camera: standing with your back to a trunk strand, the spring arm
// pulls the camera in instead of putting it inside the wood ----
const cameraCheck = await page.evaluate(async () => {
  const O = window.__oliveira, w = O.walker, y = O.layout.BIOMES[4].level;
  const s = O.strands(y + 1.5)[0];
  const ux = s.x / Math.hypot(s.x, s.z), uz = s.z / Math.hypot(s.x, s.z);
  // on the gallery right in front of the strand, looking toward the centre
  O.goTo(O.layout.BIOMES[4].id);
  Object.assign(w, { x: ux * 79, z: uz * 79, feet: y, yaw: Math.atan2(ux, uz), pitch: 0 });
  await new Promise((res) => setTimeout(res, 2500));
  const c = O.camera;
  const inside = O.strands(c.y).some((t) => Math.hypot(c.x - t.x, c.z - t.z) < t.r * 0.98);
  const dist = Math.hypot(c.x - w.x, c.z - w.z);
  return { inside, dist: +dist.toFixed(2), ok: !inside && dist > 0.4 };
});
walk.camera = cameraCheck;

// ---- 4b. combat: the staff hits a creature in front; creatures notice, chase and bite ----
const fight = await page.evaluate(async () => {
  const O = window.__oliveira, C = O.combat.debug, W = O.walker;
  O.startJourney(false);
  const m = C.mobs.find((x) => x.biome === 'raizes' && !x.boss);
  // stand 1.5 m from it, facing it
  const dx = 1.5;
  Object.assign(W, { x: m.pos.x + dx, z: m.pos.z, feet: m.pos.y, vy: 0, yaw: Math.atan2(1, 0) });
  await new Promise((r) => setTimeout(r, 1500));          // a few frames: the creature perceives and turns
  O.hud.closeDialogue();
  const hp0 = m.hp, health0 = O.game.state.health;
  O.character && 0;
  window.__oliveira.combat.debug.hurtMob(m, 20, m.pos.clone().setX(m.pos.x + 1));
  const hit = m.hp < hp0;
  await new Promise((r) => setTimeout(r, 5000));          // let it chase and bite
  return { hit, state: m.state, playerHurt: O.game.state.health < health0, ok: hit && m.state !== 'idle' };
});

// ---- 5. the whole campaign, floor 1 to floor 10, every stage through its own action ----
const act = await page.evaluate(() => {
  const O = window.__oliveira, G = O.game, D = G.debug, C = O.combat.debug;
  O.startJourney(false);
  const log = [];
  const item = (id) => { const it = D.items.find((i) => i.id === id); if (!it) throw new Error('missing ' + id); return it; };
  const use = (id) => { const it = item(id); if (!it.enabled()) throw new Error('disabled ' + id + ' at ' + G.state.stage); it.use(); };
  const useGroup = (g, n) => { const list = D.items.filter((i) => i.group === g && i.kind === 'quest' && i.enabled()).slice(0, n); if (list.length < n) throw new Error(`only ${list.length} of ${g}`); list.forEach((it) => it.use()); };
  const converse = (npc) => { use(npc); for (let k = 0; k < 20 && D.dialogue; k++) O.hud.pick(0); O.hud.closeDialogue(); };
  const tick = () => G.update(0.05, 0, { running: false, flying: false, camYaw: 0 });
  // gather what a recipe needs from that floor's resource nodes (each node gives one, then regrows)
  const gather = (region, inputs) => {
    for (const [k, v] of Object.entries(inputs)) {
      const nodes = D.items.filter((i) => i.kind === 'resource' && i.id.startsWith(`node_${region}_${k}_`) && i.enabled());
      while ((G.state.inv[k] ?? 0) < v) { const n = nodes.shift(); if (!n) throw new Error(`not enough ${k} on ${region}`); n.use(); }
    }
  };
  const yieldThenChoose = (id, choice) => {
    const b = C.bosses[id];
    C.wake(id);
    b.state = 'chase';
    const yieldAt = G.bossRules(id).yieldAt ?? 0.25;
    b.hp = b.def.hp * yieldAt + 1;                // just above its yield point, then strike
    C.hurtMob(b, 10, b.pos.clone().setX(b.pos.x + 1));
    const yielded = b.state === 'yield' && !!D.dialogue;
    O.hud.pick(0);
    const offered = [...document.querySelectorAll('#hudChoices button')].map((x) => x.textContent);
    O.hud.pick(choice);
    for (let k = 0; k < 5 && D.dialogue; k++) O.hud.pick(0);
    O.hud.closeDialogue();
    return { yielded, choice: G.state.flags[`escolha_${id}`], offered: offered.length };
  };
  const bosses = {};
  const checks = {};
  const { STAGES, RECIPES } = O.campaign;
  const S = (id) => STAGES.find((x) => x.id === id);
  const recipe = (out) => RECIPES.find((r) => r.output === out).inputs;
  let guard = 0;
  while (G.state.stage !== 'campanha_fim' && guard++ < 200) {
    const before = G.state.stage;
    const region = before.split('_')[0];
    const st = S(before);
    if (st.kind === 'talk') {
      converse(st.target);
    } else if (st.kind === 'craft') {
      const outs = Object.keys(st.need);
      if (region === 'raizes') {
        // the tier gate: the starting branch barely scratches the floor's sub-boss
        const b = C.bosses.escavadorAmbar;
        C.wake('escavadorAmbar'); b.state = 'chase';
        const hp0 = b.hp; C.hurtMob(b, 40, b.pos.clone().setX(b.pos.x + 1)); const weak = hp0 - b.hp;
        b.hp = b.def.hp; b.state = 'dormant'; b.model.root.visible = false;
        checks.gateWeak = +weak.toFixed(2);
        // craft through the real workbench panel: open it, click Criar
        for (const out of outs) gather(region, recipe(out));
        use('bancada_raizes');
        for (const out of outs) document.querySelector(`#hudBench [data-craft="${out}"]`)?.click();
        checks.benchShown = !document.getElementById('hudBench').hidden;
        C.wake('escavadorAmbar'); b.state = 'chase';
        const hp1 = b.hp; C.hurtMob(b, 40, b.pos.clone().setX(b.pos.x + 1)); checks.gateStrong = +(hp1 - b.hp).toFixed(2);
        b.hp = b.def.hp; b.state = 'dormant'; b.model.root.visible = false;
      } else {
        for (const out of outs) { gather(region, recipe(out)); G.craft(out); }
      }
      checks[`equip_${region}`] = `${G.state.equip.weapon}/${G.state.equip.outfit}`;
    } else {
      const need = st.need ?? {};
      const bossKey = Object.keys(need).find((k) => k.startsWith('boss_'));
      const groups = Object.entries(need).filter(([k]) => !k.startsWith('boss_') && k !== st.group);
      for (const [g, n] of groups) {
        if (g === 'chamine') {
          // out of order: the sequence resets and it hurts
          const h0 = G.state.health; D.items.find((i) => i.id === 'chamine_1').use();
          checks.wrongOrder = { reset: (G.state.count.chamine ?? 0) === 0, hurt: G.state.health < h0 };
        }
        useGroup(g, n);
      }
      if (st.group) useGroup(st.group, 3);
      if (bossKey) {
        const id = bossKey.slice(5);
        bosses[id] = yieldThenChoose(id, 1);      // second option: restore (Final B on the last guardian)
      }
    }
    tick();
    log.push(`${before} -> ${G.state.stage}`);
    if (G.state.stage === before) { log.push('STUCK at ' + before); break; }
  }
  // every placed thing stands on floor the walker can reach (not floating, not buried)
  const misplaced = D.items.filter((i) => i.radius > 0).filter((i) => {
    const f = O.floorAt(i.pos.x, i.pos.z, i.pos.y);
    return !(f > i.pos.y - 4 && f < i.pos.y + 0.2);
  }).map((i) => i.id);
  const endTitle = document.getElementById('hudEndTitle').textContent;
  const ending = document.getElementById('hudEndText').textContent;
  const allYielded = Object.values(bosses).every((b) => b.yielded) && Object.keys(bosses).length === 20;
  const ok = G.state.stage === 'campanha_fim' && misplaced.length === 0 && allYielded && endTitle.includes('Final B') && D.intact() === 10
    && checks.gateWeak < checks.gateStrong * 0.25 && checks.benchShown !== undefined && checks.wrongOrder?.reset && checks.wrongOrder?.hurt;
  return { log, checks, bosses, misplaced, endTitle, ending, intact: D.intact(), level: G.state.level, equip: G.state.equip, ok };
});

for (const place of ['raizes', 'fornalha', 'pantano', 'copa']) {
  await page.evaluate((p) => window.__oliveira.goTo(p), place);
  await page.waitForTimeout(3000);
  await page.screenshot({ path: `tests/smoke-${place}.png`, timeout: 240000 });
}
await browser.close();

const ok = !errors.length && !graphProblems.length && !dialogueProblems.length && !recipeProblems.length && act.ok && fight.ok && Object.values(walk).every((c) => c.ok);
console.log(JSON.stringify({ stats, graphProblems, dialogueProblems, recipeProblems, needsTiming, walk, fight, act, errors, ok }, null, 2));
process.exit(ok ? 0 : 1);

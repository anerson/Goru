// Smoke test (pattern from the threejs-scene-setup skill) plus level checks (level-design
// skill): the route graph has no dead ends, and the real walker can travel every kind of path.
// Usage: npm start (in another terminal), then: node tests/smoke.mjs http://localhost:5173
// Offline: set THREE_DIR to an unpacked three@0.186.1 package to serve it instead of the CDN.
import { createRequire } from 'node:module';
import path from 'node:path';
import { ROUTES } from '../src/tree/layout.js';

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
await page.waitForFunction(() => window.__oliveira?.ready && window.renderer?.info.render.frame > 2, null, { timeout: 240000 });
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

  // through an entrance between the roots into the hall
  O.enterWalk('entrada');
  O.keys.add('KeyW'); O.keys.add('ShiftLeft');
  O.step(300);
  out.entranceToHall = { r: +r().toFixed(1), ok: r() < 100 };

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

  // gallery 150 -> hanging bridge -> planet ring (and the ring's inner rail stops you)
  O.goTo('galeria');
  O.step(200);
  out.bridgeToPlanet = { r: +r().toFixed(1), feet: +w().feet.toFixed(1), ok: r() < L.PLANET.ringOut && Math.abs(w().feet - L.PLANET.y) < 0.6 };

  // top gallery -> bridge out through the trunk -> far edge of a lookout (no falling off)
  const ta = L.TOP_BRIDGES[0];
  Object.assign(w(), { x: Math.cos(ta) * 78, z: Math.sin(ta) * 78, feet: L.GALLERY.levels[3], vy: 0 });
  face(Math.cos(ta), Math.sin(ta));
  O.step(400);
  out.bridgeToLookout = { r: +r().toFixed(1), feet: +w().feet.toFixed(1), ok: r() > L.LOOKOUT.centre && Math.abs(w().feet - 300) < 0.6 };

  // flying up from the hall stops at the planet instead of passing through it
  O.goTo('salao');
  Object.assign(w(), { x: 0, z: 0, feet: 20 });
  O.setFly(true); O.keys.clear(); O.keys.add('Space');
  O.step(200);
  out.flyBlockedByPlanet = { feet: +w().feet.toFixed(1), ok: w().feet < L.PLANET.y - L.PLANET.radius };
  O.keys.clear(); O.setFly(false);
  return out;
});

await page.evaluate(() => window.__oliveira.goTo('salao'));
await page.waitForTimeout(4000);
await page.screenshot({ path: 'tests/smoke-hall.png', timeout: 240000 });
await page.evaluate(() => window.__oliveira.goTo('planeta'));
await page.waitForTimeout(4000);
await page.screenshot({ path: 'tests/smoke-planet.png', timeout: 240000 });
await browser.close();

const ok = !errors.length && !graphProblems.length && Object.values(walk).every((c) => c.ok);
console.log(JSON.stringify({ stats, graphProblems, walk, errors, ok }, null, 2));
process.exit(ok ? 0 : 1);

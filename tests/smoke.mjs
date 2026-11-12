// Smoke test (pattern from the threejs-scene-setup skill), extended with walk checks.
// Usage: npm start (in another terminal), then: node tests/smoke.mjs http://localhost:5173
// Fails on page errors, checks the renderer draws, and walks the three routes in the tree.
// Offline: set THREE_DIR to an unpacked three@0.186.1 package to serve it instead of the CDN.
import { createRequire } from 'node:module';
import path from 'node:path';

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
await page.waitForFunction(() => window.__oliveira?.ready && window.renderer?.info.render.calls > 0, null, { timeout: 120000 });
const render = await page.evaluate(() => ({
  drawCalls: window.renderer.info.render.calls,
  triangles: window.renderer.info.render.triangles,
  canvas: [window.renderer.domElement.width, window.renderer.domElement.height],
}));
await page.screenshot({ path: 'tests/smoke-orbit.png', timeout: 120000 });

// Movement is stepped directly so the result does not depend on the test machine's frame rate.
const walk = await page.evaluate(() => {
  const O = window.__oliveira, w = () => O.walker;
  const r = () => Math.hypot(w().x, w().z);
  const out = {};

  O.enterWalk('entrada');
  O.keys.add('KeyW'); O.step(240); O.keys.clear();
  out.trailReachesHollow = r() < 9;

  O.goTo('dentro');
  const a0 = O.thetaBridge - 0.6 + 0.05;
  Object.assign(w(), { x: Math.cos(a0) * 5.9, z: Math.sin(a0) * 5.9, feet: 0 });
  O.keys.add('KeyW');
  for (let i = 0; i < 60; i++) {
    const a = Math.atan2(w().z, w().x), corr = (5.9 - r()) * 0.15;
    const tx = -Math.sin(a) + Math.cos(a) * corr, tz = Math.cos(a) + Math.sin(a) * corr;
    w().yaw = Math.atan2(-tx, -tz);
    O.step(10);
  }
  O.keys.clear();
  out.rampTopFeet = +w().feet.toFixed(2);

  Object.assign(w(), { x: 0, z: 0, feet: 36, yaw: Math.atan2(-Math.cos(O.thetaBridge), -Math.sin(O.thetaBridge)) });
  O.keys.add('KeyW'); O.step(200); O.keys.clear();
  out.lookoutFeet = +w().feet.toFixed(2);
  out.lookoutDistance = +r().toFixed(1);
  return out;
});
await page.evaluate(() => window.__oliveira.goTo('dentro'));
await page.waitForTimeout(2000);
await page.screenshot({ path: 'tests/smoke-inside.png', timeout: 120000 });
await browser.close();

const ok = render.drawCalls > 0 && walk.trailReachesHollow && walk.rampTopFeet > 34 && walk.lookoutFeet === 36 && walk.lookoutDistance > 26;
console.log(JSON.stringify({ render, walk, errors, ok }, null, 2));
process.exit(errors.length || !ok ? 1 : 0);

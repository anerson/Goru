// Oliveira Colossal: entry point. Builds the world once, then runs one animation loop
// that either orbits the tree or walks the player through it.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { createEnvironment, QUALITY } from './environment.js';
import { createTextures } from './textures.js';
import { addWind, windUniforms } from './wind.js';
import { buildTrunk } from './tree/trunk.js';
import { buildCanopy } from './tree/canopy.js';
import { buildWalkways } from './walkways.js';
import { buildLandscape } from './landscape.js';
import { createParticles } from './particles.js';
import { createWalker } from './player.js';
import { createInput } from './input.js';
import { RAMP, LOOKOUT, rampAt, thetaEntrance, thetaBridge } from './tree/layout.js';

const $ = (id) => document.getElementById(id);
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const coarse = matchMedia('(pointer: coarse)').matches;

const env = createEnvironment($('scene'));
const { renderer, scene, camera } = env;
Object.assign(window, { renderer, scene }); // for the smoke check and console debugging

const orbit = new OrbitControls(camera, renderer.domElement);
orbit.target.set(0, 45, 0);
camera.position.set(190, 95, 150);
orbit.enableDamping = true;
orbit.autoRotate = !reduceMotion;
orbit.autoRotateSpeed = 0.35;
orbit.minDistance = 25;
orbit.maxDistance = 600;
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
  const barkProps = { color: '#b3afa2', map: tex.bark, normalMap: tex.barkNormal, normalScale: new THREE.Vector2(1.4, 1.4), roughness: 0.93 };
  const mats = {
    bark: addWind(new THREE.MeshStandardMaterial(barkProps)),
    barkStatic: new THREE.MeshStandardMaterial(barkProps),
    leaf: addWind(new THREE.MeshStandardMaterial({ color: '#8a8f80', side: THREE.DoubleSide, roughness: 0.7 }), { flutter: true, silverBack: true }),
    olive: addWind(new THREE.MeshStandardMaterial({ roughness: 0.35 })),
    planks: new THREE.MeshStandardMaterial({ map: tex.planks, normalMap: tex.planksNormal, roughness: 0.85, side: THREE.DoubleSide }),
    wood: new THREE.MeshStandardMaterial({ color: '#5c4129', roughness: 0.8 }),
    woodDouble: new THREE.MeshStandardMaterial({ color: '#5c4129', roughness: 0.8, side: THREE.DoubleSide }),
    rope: new THREE.MeshStandardMaterial({ color: '#b59b6c', roughness: 1 }),
    lantern: new THREE.MeshStandardMaterial({ color: '#000000', emissive: '#ffb560', emissiveIntensity: 4 }),
    innerFloor: new THREE.MeshStandardMaterial({ map: tex.dirt, color: '#8a7a62', roughness: 1, polygonOffset: true, polygonOffsetFactor: -2 }),
    trail: new THREE.MeshStandardMaterial({ map: tex.trail, roughness: 1, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -2 }),
    stone: new THREE.MeshStandardMaterial({ color: '#9b958a', roughness: 0.9 }),
  };

  const tree = new THREE.Group();
  tree.name = 'olive-tree';
  scene.add(tree);
  const trunk = buildTrunk(tree, mats.bark);
  const canopy = buildCanopy(tree, trunk, mats);
  const paths = buildWalkways(scene, mats, tex);
  buildLandscape(scene, mats, tex);
  const updateParticles = createParticles(scene, canopy.leafGeo, mats.leaf, canopy.tipPoints);
  const walker = createWalker({ walkables: paths.walkables, rootMeshes: trunk.rootMeshes, rootSegs: trunk.rootSegs });

  $('sHeight').textContent = `${Math.round(canopy.maxY)} m`;
  $('sCrown').textContent = `${Math.round(canopy.crownR * 2)} m`;
  $('sLeaves').textContent = canopy.leafCount.toLocaleString('pt-BR');
  return { walker, updateParticles, lights: paths.lights };
}

// ---------- places you can jump to ----------
const yawToward = (dx, dz) => Math.atan2(-dx, -dz);
const PLACES = {
  entrada() {
    const x = Math.cos(thetaEntrance) * 52, z = Math.sin(thetaEntrance) * 52;
    return { x, z, feet: 0, yaw: yawToward(-x, -z), pitch: 0.12, label: 'Trilha' };
  },
  dentro() {
    return { x: Math.cos(thetaEntrance) * 2, z: Math.sin(thetaEntrance) * 2, feet: 0,
      yaw: yawToward(-Math.cos(thetaEntrance), -Math.sin(thetaEntrance)), pitch: 0.75, label: 'Dentro do tronco' };
  },
  rampa() {
    const { a, y } = rampAt(0.45);
    return { x: Math.cos(a) * 5.9, z: Math.sin(a) * 5.9, feet: y, yaw: yawToward(-Math.sin(a), Math.cos(a)), pitch: 0.05, label: `Rampa · ${Math.round(y)} m` };
  },
  mirante() {
    const r = LOOKOUT.centre + 1;
    return { x: Math.cos(thetaBridge) * r, z: Math.sin(thetaBridge) * r, feet: RAMP.top,
      yaw: yawToward(Math.cos(thetaBridge + 0.5), Math.sin(thetaBridge + 0.5)), pitch: 0.08, label: `Mirante · ${RAMP.top} m` };
  },
};

function goTo(name) {
  const spot = PLACES[name]();
  world.walker.teleport(spot); // hard cut, no smoothing to whip across the map
  $('place').textContent = spot.label;
}
function enterWalk(name = 'entrada') {
  if (!world) return;
  mode = 'walk';
  orbit.enabled = false;
  document.body.classList.add('walking');
  goTo(name);
}
function exitWalk() {
  mode = 'orbit';
  orbit.enabled = true;
  camera.position.set(190, 95, 150);
  orbit.target.set(0, 45, 0);
  document.body.classList.remove('walking');
  input.releaseLock();
}

const input = createInput(renderer.domElement, $('joy'), $('knob'), {
  isWalking: () => mode === 'walk',
  onLook: (dx, dy) => world?.walker.look(dx, dy),
});

// ---------- UI ----------
$('bWalk').onclick = () => enterWalk('entrada');
$('bExit').onclick = exitWalk;
document.querySelectorAll('[data-go]').forEach((b) => { b.onclick = () => goTo(b.dataset.go); });
const bSpin = $('bSpin'), bWind = $('bWind'), bQuality = $('bQuality');
bSpin.setAttribute('aria-pressed', String(orbit.autoRotate));
bSpin.onclick = () => { orbit.autoRotate = !orbit.autoRotate; bSpin.setAttribute('aria-pressed', String(orbit.autoRotate)); };
bWind.onclick = () => { windOn = !windOn; bWind.setAttribute('aria-pressed', String(windOn)); };
bQuality.textContent = `Qualidade: ${QUALITY[qualityIndex].name}`;
bQuality.onclick = () => {
  qualityIndex = (qualityIndex + 1) % QUALITY.length;
  env.setQuality(QUALITY[qualityIndex]);
  bQuality.textContent = `Qualidade: ${QUALITY[qualityIndex].name}`;
};

// ---------- loop ----------
const timer = new THREE.Timer();
timer.connect(document);

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
      world.walker.update(dt, input.read());
      world.walker.applyToCamera(camera, t);
    }
    world.updateParticles(dt, t, windLevel);
    world.lights.forEach((L, i) => { L.intensity = 90 + Math.sin(t * 7 + i * 3) * 4 + Math.sin(t * 13 + i) * 3; });
  }
  if (mode === 'orbit') orbit.update(dt);
  env.render();
});

// Build after the loading screen has painted; it takes a second or two on a phone.
requestAnimationFrame(() => setTimeout(() => {
  try {
    world = buildWorld();
    $('loading').hidden = true;
  } catch (err) {
    $('loading').textContent = 'Não foi possível montar a cena. Recarregue a página.';
    console.error(err);
  }
}, 30));

// Hooks for automated checks (tests/smoke.mjs).
window.__oliveira = {
  get ready() { return !!world; },
  get walker() { return world?.walker.state; },
  enterWalk, goTo, thetaEntrance, thetaBridge,
  keys: input.keys,
  step(n, dt = 0.05) { for (let i = 0; i < n; i++) world.walker.update(dt, input.read()); },
};

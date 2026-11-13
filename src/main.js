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
import {
  RAMP, GALLERY, BIOMES, LOOKOUT, TOP_BRIDGES, ENTRANCES, APPROACH, ROUTES, LEVEL_BRIDGES, DISK_R,
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
    trail: new THREE.MeshStandardMaterial({ map: tex.trail, roughness: 1, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -3 }),
    trailDirt: new THREE.MeshStandardMaterial({ map: tex.trail, color: '#c9b28c', roughness: 1, polygonOffset: true, polygonOffsetFactor: -3 }),
    trailSand: new THREE.MeshStandardMaterial({ map: tex.trail, color: '#f0c99a', roughness: 1, polygonOffset: true, polygonOffsetFactor: -3 }),
    trailSnow: new THREE.MeshStandardMaterial({ map: tex.trail, color: '#b9c6d9', roughness: 0.9, polygonOffset: true, polygonOffsetFactor: -3 }),
    terrain: new THREE.MeshStandardMaterial({ vertexColors: true, map: tex.terrainDetail, roughness: 0.95 }),
    slabUnder: new THREE.MeshStandardMaterial({ color: '#3a3326', map: tex.bark, roughness: 1, side: THREE.DoubleSide }),
    stone: new THREE.MeshStandardMaterial({ color: '#9b958a', roughness: 0.9 }),
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

  $('sHeight').textContent = `${Math.round(canopy.maxY)} m`;
  $('sCrown').textContent = `${(canopy.crownR * 2 / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} km`;
  $('sPaths').textContent = `${((paths.totalLength + biomes.trailLength) / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} km`;
  return { walker, canopy, updateParticles, updateBiomes: biomes.update };
}

// ---------- places you can jump to ----------
const yawToward = (dx, dz) => Math.atan2(-dx, -dz);
const at = (r, a) => ({ x: Math.cos(a) * r, z: Math.sin(a) * r });
// arriving on a level: just inside its first bridge, looking toward the middle
const onLevel = (b, label, pitch = 0.08) => () => {
  const a = b.level === 0 ? ENTRANCES[0] : LEVEL_BRIDGES[0];
  const p = at(b.level === 0 ? 90 : DISK_R - 4, a);
  return { ...p, feet: b.level + 0.5, yaw: yawToward(-p.x, -p.z), pitch, label };
};
const PLACES = {
  trilha() {
    const p = at(700, APPROACH.angle);
    return { ...p, feet: 0, yaw: yawToward(-p.x, -p.z), pitch: 0.28, label: 'Trilha de chegada' };
  },
  entrada() {
    const p = at(230, ENTRANCES[0]);
    return { ...p, feet: 0, yaw: yawToward(-p.x, -p.z), pitch: 0.1, label: 'Entrada entre as raízes' };
  },
  floresta: onLevel(BIOMES[0], `0 m · ${BIOMES[0].name}`, 0.12),
  lago: onLevel(BIOMES[1], `75 m · ${BIOMES[1].name}`),
  canion: onLevel(BIOMES[2], `150 m · ${BIOMES[2].name}`),
  gelo: onLevel(BIOMES[3], `225 m · ${BIOMES[3].name}`),
  prado: onLevel(BIOMES[4], `300 m · ${BIOMES[4].name}`),
  rampa() {
    const { a, y } = rampAt(0.62);
    const p = at(70, a);
    return { ...p, feet: y, yaw: yawToward(-Math.sin(a), Math.cos(a)) + 0.5, pitch: 0.1, label: `Rampa · ${Math.round(y)} m` };
  },
  mirante() {
    const a = TOP_BRIDGES[0], p = at(LOOKOUT.centre + 4, a);
    return { ...p, feet: GALLERY.levels[3], yaw: yawToward(Math.cos(a), Math.sin(a)), pitch: 0.05, label: 'Mirante · 300 m' };
  },
};

function goTo(name) {
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
  document.body.classList.add('walking');
  goTo(name);
}
function exitWalk() {
  mode = 'orbit';
  orbit.enabled = true;
  camera.position.copy(ORBIT_HOME.pos);
  orbit.target.copy(ORBIT_HOME.target);
  document.body.classList.remove('walking');
  input.releaseLock();
  setFly(false);
}
function setFly(on) {
  if (!world) return;
  world.walker.setFlying(on);
  $('bFly').setAttribute('aria-pressed', String(on));
  document.body.classList.toggle('flying', on);
}

const input = createInput(renderer.domElement, $('joy'), $('knob'), {
  isWalking: () => mode === 'walk',
  onLook: (dx, dy) => world?.walker.look(dx, dy),
});
addEventListener('keydown', (e) => {
  if (mode === 'walk' && e.code === 'KeyF' && !e.repeat) setFly(!world.walker.state.flying);
});

// ---------- UI ----------
$('bWalk').onclick = () => enterWalk('trilha');
$('bExit').onclick = exitWalk;
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
      world.walker.update(dt, input.read());
      world.walker.applyToCamera(camera, t);
      const s = world.walker.state;
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
  enterWalk, goTo, setFly,
  layout: { RAMP, GALLERY, BIOMES, TOP_BRIDGES, LOOKOUT, ENTRANCES, APPROACH, ROUTES, LEVEL_BRIDGES, DISK_R, rampStart },
  keys: input.keys,
  step(n, dt = 0.05) { for (let i = 0; i < n; i++) world.walker.update(dt, input.read()); },
};

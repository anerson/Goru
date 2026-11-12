// Renderer, sky, sun, image-based lighting, fog and the post-processing chain.
// Follows threejs-materials-lighting: env map + one shadowed directional key light,
// PCF shadows fitted to the tree, colour textures in sRGB, OutputPass last.
import * as THREE from 'three';
import { Sky } from 'three/addons/objects/Sky.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

// Late-afternoon sun: low in the west-south-west, warm, long shadows.
const SUN_ELEVATION = 9; // degrees
const SUN_AZIMUTH = 40;   // degrees

export const QUALITY = [
  { name: 'Leve', pixelRatio: () => Math.min(devicePixelRatio || 1, 1) * 0.75, shadow: 1024, ao: false, foliage: 0.3 },
  { name: 'Alta', pixelRatio: () => Math.min(devicePixelRatio || 1, 1.25), shadow: 2048, ao: true, foliage: 0.75 },
  { name: 'Ultra', pixelRatio: () => Math.min(devicePixelRatio || 1, 2), shadow: 4096, ao: true, foliage: 1 },
];

export function createEnvironment(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.62;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap; // soft since r182

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2('#d8b98f', 0.00022);
  const camera = new THREE.PerspectiveCamera(55, 1, 0.3, 15000);

  const sunDir = new THREE.Vector3().setFromSphericalCoords(
    1, THREE.MathUtils.degToRad(90 - SUN_ELEVATION), THREE.MathUtils.degToRad(SUN_AZIMUTH));

  function makeSky() {
    const sky = new Sky();
    sky.scale.setScalar(10000);
    const u = sky.material.uniforms;
    u.turbidity.value = 8;
    u.rayleigh.value = 2.8;
    u.mieCoefficient.value = 0.006;
    u.mieDirectionalG.value = 0.86;
    u.cloudCoverage.value = 0.32;
    u.cloudDensity.value = 0.35;
    u.sunPosition.value.copy(sunDir);
    return sky;
  }
  const sky = makeSky();
  scene.add(sky);

  // Image-based lighting from the same sky, prefiltered once.
  {
    const pmrem = new THREE.PMREMGenerator(renderer);
    const envScene = new THREE.Scene();
    envScene.add(makeSky());
    scene.environment = pmrem.fromScene(envScene, 0.02, 0.1, 20000).texture;
    scene.environmentIntensity = 0.5;
    pmrem.dispose();
  }

  scene.add(new THREE.HemisphereLight('#ffe6c4', '#5a5a36', 0.3));
  const sun = new THREE.DirectionalLight('#ffd49c', 4.2);
  sun.castShadow = true;
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 0.5;
  scene.add(sun, sun.target);

  // The world is too big for one sharp shadow map, so the shadow box follows what you look
  // at (threejs-materials-lighting: move the light and its target, don't grow the frustum).
  // Walking: a 440 m box around the player. Orbiting: a 2.2 km box around the whole tree.
  function setShadowFocus(center, half) {
    sun.target.position.copy(center);
    sun.position.copy(center).addScaledVector(sunDir, 3000);
    const cam = sun.shadow.camera;
    if (cam.right !== half) {
      Object.assign(cam, { left: -half, right: half, top: half, bottom: -half, near: 100, far: 6500 });
      cam.updateProjectionMatrix();
    }
  }
  setShadowFocus(new THREE.Vector3(0, 300, 0), 1100);

  // Post: scene -> ground-truth ambient occlusion (darkens the hollow, the crevices between
  // strands and under the walkways) -> OutputPass for tone mapping and sRGB.
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const gtao = new GTAOPass(scene, camera, 512, 512);
  gtao.updateGtaoMaterial({ radius: 5, distanceExponent: 1.5, thickness: 6, scale: 1.5, samples: 16 });
  gtao.updatePdMaterial({ lumaPhi: 10, depthPhi: 2, normalPhi: 3, radius: 6, rings: 2, samples: 16 });
  gtao.blendIntensity = 0.9;
  composer.addPass(gtao);
  composer.addPass(new OutputPass());

  let quality = QUALITY[1];
  function resize() {
    const w = innerWidth, h = innerHeight, pr = quality.pixelRatio();
    renderer.setPixelRatio(pr);
    renderer.setSize(w, h, false);
    composer.setPixelRatio(pr);
    composer.setSize(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  function setQuality(q) {
    quality = q;
    sun.shadow.mapSize.set(q.shadow, q.shadow);
    if (sun.shadow.map) { sun.shadow.map.dispose(); sun.shadow.map = null; }
    gtao.enabled = q.ao;
    resize();
  }
  function render() {
    if (quality.ao) composer.render();
    else renderer.render(scene, camera);
  }
  function setTime(t) { sky.material.uniforms.time.value = t; }

  return { renderer, scene, camera, sun, resize, setQuality, render, setTime, setShadowFocus };
}

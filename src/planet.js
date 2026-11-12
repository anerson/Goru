// A small living world hanging in the hollow of the trunk: oceans, continents, polar ice,
// a drifting cloud layer, a glowing atmosphere and warm points of light on the land.
// It is also the hollow's main light source and the landmark you navigate by inside.
import * as THREE from 'three';
import { fbm, mulberry32 } from './noise.js';
import { PLANET, SEED } from './tree/layout.js';

const W = 1024, H = 512;

function paintSurface() {
  const color = document.createElement('canvas'); color.width = W; color.height = H;
  const glow = document.createElement('canvas'); glow.width = W; glow.height = H;
  const cctx = color.getContext('2d'), gctx = glow.getContext('2d');
  const cimg = cctx.createImageData(W, H), gimg = gctx.createImageData(W, H);
  const rand = mulberry32(SEED + 7);
  const ramp = [
    [-1.0, [10, 34, 78]], [-0.12, [22, 70, 128]], [-0.02, [44, 120, 160]], [0.0, [196, 180, 128]],
    [0.05, [92, 128, 58]], [0.22, [52, 92, 44]], [0.38, [116, 100, 72]], [0.5, [150, 146, 140]], [1.0, [240, 240, 236]],
  ];
  const sample = (h) => {
    for (let i = 1; i < ramp.length; i++) {
      if (h <= ramp[i][0]) {
        const [h0, c0] = ramp[i - 1], [h1, c1] = ramp[i];
        const t = (h - h0) / (h1 - h0);
        return [c0[0] + (c1[0] - c0[0]) * t, c0[1] + (c1[1] - c0[1]) * t, c0[2] + (c1[2] - c0[2]) * t];
      }
    }
    return ramp[ramp.length - 1][1];
  };
  for (let y = 0; y < H; y++) {
    const lat = (0.5 - y / H) * Math.PI;
    for (let x = 0; x < W; x++) {
      const lon = (x / W) * Math.PI * 2;
      const px = Math.cos(lat) * Math.cos(lon), py = Math.sin(lat), pz = Math.cos(lat) * Math.sin(lon);
      let h = (fbm(px * 1.6 + 10, py * 1.6, pz * 1.6, 5) - 0.5) * 2.4;
      h += (fbm(px * 6, py * 6, pz * 6, 3) - 0.5) * 0.25;
      let [r, g, b] = sample(h);
      const ice = Math.max(0, (Math.abs(py) - 0.82) / 0.18);
      if (ice > 0) { const t = Math.min(1, ice * 1.5); r += (235 - r) * t; g += (240 - g) * t; b += (245 - b) * t; }
      const o = (y * W + x) * 4;
      cimg.data[o] = r; cimg.data[o + 1] = g; cimg.data[o + 2] = b; cimg.data[o + 3] = 255;
      // glow: dim self-light everywhere, sparks of warm light on low land (settlements)
      let gl = 0.18, gr = 0.18, gb = 0.2;
      if (h > 0.02 && h < 0.3 && ice === 0 && rand() < 0.02) { gr = 1.0; gl = 0.75; gb = 0.4; }
      gimg.data[o] = r * gr; gimg.data[o + 1] = g * gl + (gl > 0.5 ? 120 : 0); gimg.data[o + 2] = b * gb; gimg.data[o + 3] = 255;
    }
  }
  cctx.putImageData(cimg, 0, 0);
  gctx.putImageData(gimg, 0, 0);
  return { color, glow };
}

function paintClouds() {
  const c = document.createElement('canvas'); c.width = 512; c.height = 256;
  const ctx = c.getContext('2d'), img = ctx.createImageData(512, 256);
  for (let y = 0; y < 256; y++) {
    const lat = (0.5 - y / 256) * Math.PI;
    for (let x = 0; x < 512; x++) {
      const lon = (x / 512) * Math.PI * 2;
      const px = Math.cos(lat) * Math.cos(lon), py = Math.sin(lat), pz = Math.cos(lat) * Math.sin(lon);
      const n = fbm(px * 3 + 40, py * 5, pz * 3, 5);
      const a = Math.max(0, Math.min(1, (n - 0.5) * 3.2));
      const o = (y * 512 + x) * 4;
      img.data[o] = img.data[o + 1] = img.data[o + 2] = 255;
      img.data[o + 3] = a * 230;
    }
  }
  ctx.putImageData(img, 0, 0);
  return c;
}

export function buildPlanet(scene) {
  const group = new THREE.Group();
  group.name = 'planet';
  group.position.set(0, PLANET.y, 0);
  group.rotation.z = 0.35; // axial tilt

  const { color, glow } = paintSurface();
  const map = new THREE.CanvasTexture(color); map.colorSpace = THREE.SRGBColorSpace;
  const emissiveMap = new THREE.CanvasTexture(glow); emissiveMap.colorSpace = THREE.SRGBColorSpace;
  const surface = new THREE.Mesh(
    new THREE.SphereGeometry(PLANET.radius, 96, 64),
    new THREE.MeshStandardMaterial({ map, emissive: '#ffffff', emissiveMap, emissiveIntensity: 0.65, roughness: 0.75 }),
  );
  group.add(surface);

  const cloudTex = new THREE.CanvasTexture(paintClouds()); cloudTex.colorSpace = THREE.SRGBColorSpace;
  const clouds = new THREE.Mesh(
    new THREE.SphereGeometry(PLANET.radius * 1.025, 96, 64),
    new THREE.MeshStandardMaterial({ map: cloudTex, transparent: true, depthWrite: false, emissive: '#ffffff', emissiveMap: cloudTex, emissiveIntensity: 0.3, roughness: 1 }),
  );
  group.add(clouds);

  // atmosphere: fresnel rim, additive, no depth write
  const atmosphere = new THREE.Mesh(
    new THREE.SphereGeometry(PLANET.radius * 1.12, 64, 48),
    new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.BackSide,
      uniforms: { color: { value: new THREE.Color('#7fd8ff') } },
      vertexShader: `
        varying vec3 vN; varying vec3 vV;
        void main() {
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz);
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: `
        uniform vec3 color; varying vec3 vN; varying vec3 vV;
        void main() {
          float rim = pow(clamp(1.0 - abs(dot(vN, vV)), 0.0, 1.0), 2.5);
          gl_FragColor = vec4(color * rim * 1.6, rim);
        }`,
    }),
  );
  atmosphere.name = 'atmosphere';
  scene.add(group);
  const halo = new THREE.Group();
  halo.position.copy(group.position);
  halo.add(atmosphere);
  scene.add(halo);

  // the planet lights the hollow (no shadows: a point light shadow costs six extra renders)
  const light = new THREE.PointLight('#bfe6ff', 9000, 0, 2);
  light.position.copy(group.position);
  scene.add(light);

  return function update(dt) {
    surface.rotation.y += dt * 0.02;
    clouds.rotation.y += dt * 0.028;
  };
}

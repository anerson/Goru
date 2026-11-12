// Procedural textures painted on canvases. Colour maps are tagged sRGB; normal maps are
// derived from a height field and stay linear (threejs-materials-lighting, step 5).
import * as THREE from 'three';
import { mulberry32 } from './noise.js';

const TAU = Math.PI * 2;

function makeCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return c;
}

function toTexture(canvas, { srgb, repeat, aniso }) {
  const t = new THREE.CanvasTexture(canvas);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = aniso;
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  if (repeat) t.repeat.set(repeat[0], repeat[1]);
  return t;
}

// Sobel over the luminance of `src` -> tangent-space normal map (wraps at the edges).
function normalFromHeight(src, strength) {
  const w = src.width, h = src.height;
  const data = src.getContext('2d').getImageData(0, 0, w, h).data;
  const lum = new Float32Array(w * h);
  for (let i = 0; i < w * h; i++) lum[i] = (data[i * 4] * 0.3 + data[i * 4 + 1] * 0.59 + data[i * 4 + 2] * 0.11) / 255;
  const out = makeCanvas(w, h);
  const ctx = out.getContext('2d');
  const img = ctx.createImageData(w, h);
  const at = (x, y) => lum[((y + h) % h) * w + ((x + w) % w)];
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const dx = (at(x + 1, y - 1) + 2 * at(x + 1, y) + at(x + 1, y + 1)) - (at(x - 1, y - 1) + 2 * at(x - 1, y) + at(x - 1, y + 1));
      const dy = (at(x - 1, y + 1) + 2 * at(x, y + 1) + at(x + 1, y + 1)) - (at(x - 1, y - 1) + 2 * at(x, y - 1) + at(x + 1, y - 1));
      let nx = -dx * strength, ny = dy * strength, nz = 1;
      const l = Math.hypot(nx, ny, nz); nx /= l; ny /= l; nz /= l;
      const o = (y * w + x) * 4;
      img.data[o] = (nx * 0.5 + 0.5) * 255;
      img.data[o + 1] = (ny * 0.5 + 0.5) * 255;
      img.data[o + 2] = (nz * 0.5 + 0.5) * 255;
      img.data[o + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return out;
}

// Olive bark: grey-brown base, long twisting fissures with pale ridges, silvery plates, lichen.
function paintBark(rand) {
  const W = 1024, H = 1024;
  const c = makeCanvas(W, H), g = c.getContext('2d');
  g.fillStyle = '#7a7364'; g.fillRect(0, 0, W, H);
  const tones = ['#8d8673', '#655e50', '#9c9582', '#585145', '#867d68', '#a7a18f'];
  for (let i = 0; i < 6000; i++) {
    g.globalAlpha = 0.1 + rand() * 0.15;
    g.fillStyle = tones[(rand() * tones.length) | 0];
    const x = rand() * W, y = rand() * H, rx = 4 + rand() * 24, ry = 10 + rand() * 70;
    for (const ox of [-W, 0, W]) for (const oy of [-H, 0, H]) {
      g.beginPath(); g.ellipse(x + ox, y + oy, rx, ry, 0, 0, TAU); g.fill();
    }
  }
  for (let i = 0; i < 190; i++) {
    const x0 = rand() * W, k1 = 1 + ((rand() * 3) | 0), k2 = 2 + ((rand() * 4) | 0);
    const A = 8 + rand() * 40, B = 3 + rand() * 14, p1 = rand() * TAU, p2 = rand() * TAU;
    const width = 1.5 + Math.pow(rand(), 2) * 10;
    const y0 = rand() * H, len = H * (0.25 + rand() * 0.75);
    for (const pass of [0, 1]) {
      g.globalAlpha = pass ? 0.4 : 0.9;
      g.strokeStyle = pass ? '#b8b09b' : '#231e18';
      g.lineWidth = pass ? width * 0.5 : width;
      for (const ox of [-W, 0, W]) {
        g.beginPath();
        let prevY = -1;
        for (let y = 0; y <= len; y += 5) {
          const yy = y0 + y;
          const x = x0 + ox + A * Math.sin((TAU * yy / H) * k1 + p1) + B * Math.sin((TAU * yy / H) * k2 + p2) + (pass ? width * 0.9 : 0);
          const py = ((yy % H) + H) % H;
          if (y === 0 || py < prevY) g.moveTo(x, py); else g.lineTo(x, py);
          prevY = py;
        }
        g.stroke();
      }
    }
  }
  for (let i = 0; i < 320; i++) {
    g.globalAlpha = 0.15 + rand() * 0.3;
    g.fillStyle = rand() < 0.6 ? '#bcbf9f' : '#9aa07a';
    const x = rand() * W, y = rand() * H, r = 2 + Math.pow(rand(), 2) * 16;
    g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill();
  }
  g.globalAlpha = 1;
  return c;
}

function paintPlanks(rand) {
  const W = 512, H = 512, n = 4, ph = H / n;
  const c = makeCanvas(W, H), g = c.getContext('2d');
  const bases = ['#7d5a3a', '#86603e', '#6f4f33', '#8f6845'];
  for (let i = 0; i < n; i++) {
    g.fillStyle = bases[i]; g.fillRect(0, i * ph, W, ph);
    for (let k = 0; k < 70; k++) {
      g.globalAlpha = 0.13;
      g.strokeStyle = rand() < 0.5 ? '#4e3622' : '#a37d55';
      g.lineWidth = 1 + rand() * 2;
      const y = i * ph + 6 + rand() * (ph - 12);
      g.beginPath(); g.moveTo(0, y);
      g.bezierCurveTo(W * 0.3, y + (rand() - 0.5) * 8, W * 0.7, y + (rand() - 0.5) * 8, W, y);
      g.stroke();
    }
    g.globalAlpha = 1;
    g.fillStyle = '#21160d'; g.fillRect(0, i * ph, W, 5);
    g.fillStyle = '#3a2818';
    g.beginPath(); g.arc(30, i * ph + ph / 2, 4, 0, TAU); g.arc(W - 30, i * ph + ph / 2, 4, 0, TAU); g.fill();
  }
  return c;
}

function paintDirt(rand) {
  const W = 512, H = 512;
  const c = makeCanvas(W, H), g = c.getContext('2d');
  g.fillStyle = '#9c8461'; g.fillRect(0, 0, W, H);
  const tones = ['#b39a72', '#857053', '#a58c66', '#6f5d45', '#c2ad86'];
  for (let i = 0; i < 12000; i++) {
    g.globalAlpha = 0.25 + rand() * 0.4;
    g.fillStyle = tones[(rand() * tones.length) | 0];
    const s = 1 + rand() * 4;
    g.fillRect(rand() * W, rand() * H, s, s);
  }
  g.globalAlpha = 1;
  return c;
}

function paintGroundDetail(rand) {
  const W = 256, H = 256;
  const c = makeCanvas(W, H), g = c.getContext('2d');
  g.fillStyle = '#c8c8c8'; g.fillRect(0, 0, W, H);
  for (let i = 0; i < 6000; i++) {
    const v = (150 + rand() * 105) | 0;
    g.globalAlpha = 0.5;
    g.fillStyle = `rgb(${v},${v},${(v * 0.92) | 0})`;
    g.fillRect(rand() * W, rand() * H, 1 + rand() * 3, 2 + rand() * 5);
  }
  g.globalAlpha = 1;
  return c;
}

export function createTextures(renderer) {
  const rand = mulberry32(99);
  const aniso = renderer.capabilities.getMaxAnisotropy();
  const bark = paintBark(rand);
  const planks = paintPlanks(rand);
  const dirt = paintDirt(rand);
  return {
    bark: toTexture(bark, { srgb: true, aniso }),
    barkNormal: toTexture(normalFromHeight(bark, 2.2), { srgb: false, aniso }),
    planks: toTexture(planks, { srgb: true, aniso }),
    planksNormal: toTexture(normalFromHeight(planks, 1.2), { srgb: false, aniso }),
    dirt: toTexture(dirt, { srgb: true, aniso, repeat: [3, 3] }),
    trail: toTexture(dirt, { srgb: true, aniso }),
    groundDetail: toTexture(paintGroundDetail(rand), { srgb: true, aniso, repeat: [220, 220] }),
  };
}

// Sound (audio-design): every effect is synthesised with Web Audio, so there are no files to
// download. sfx(name) plays a short effect; the ambience is soft filtered wind whose colour
// changes per floor. Nothing plays until startAudio() runs inside a click (browser rule).
// Volume levels: ambience well under effects, effects under 0 dB; one master gain for mute.
let ctx = null, master = null, noiseBuf = null, amb = null;
let muted = false;
try { muted = localStorage.getItem('aetherion-mudo') === '1'; } catch { /* storage unavailable */ }

export function startAudio() {
  if (ctx) { ctx.resume?.(); return; }
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return;
  ctx = new AC();
  master = ctx.createGain();
  master.gain.value = muted ? 0 : 0.8;
  master.connect(ctx.destination);
  noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
  const d = noiseBuf.getChannelData(0);
  let b = 0;
  for (let i = 0; i < d.length; i++) { b = (b + 0.02 * (Math.random() * 2 - 1)) / 1.02; d[i] = b * 3.5; } // brown noise
  // ambience: looping noise through a slowly moving band-pass
  const src = ctx.createBufferSource(); src.buffer = noiseBuf; src.loop = true;
  const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 400; bp.Q.value = 0.7;
  const g = ctx.createGain(); g.gain.value = 0.12;
  const lfo = ctx.createOscillator(); lfo.frequency.value = 0.07;
  const lfoG = ctx.createGain(); lfoG.gain.value = 180;
  lfo.connect(lfoG).connect(bp.frequency);
  src.connect(bp).connect(g).connect(master);
  src.start(); lfo.start();
  amb = { bp, g };
}

export function toggleMute() {
  muted = !muted;
  try { localStorage.setItem('aetherion-mudo', muted ? '1' : '0'); } catch { /* ignore */ }
  if (master) master.gain.setTargetAtTime(muted ? 0 : 0.8, ctx.currentTime, 0.05);
  return muted;
}
export const isMuted = () => muted;

// the ambience's colour per floor: [centre Hz, level]
const AMBIENCE = { raizes: [380, 0.12], deserto: [700, 0.14], oceano: [260, 0.16], fornalha: [160, 0.18], niveria: [900, 0.15], selva: [520, 0.13], pantano: [220, 0.14], cristais: [1200, 0.08], suspensa: [800, 0.17], copa: [600, 0.1] };
let lastAmb = null;
export function setAmbience(id) {
  if (!amb || id === lastAmb) return;
  lastAmb = id;
  const [f, v] = AMBIENCE[id] ?? [450, 0.07];
  amb.bp.frequency.setTargetAtTime(f, ctx.currentTime, 1.5);
  amb.g.gain.setTargetAtTime(v, ctx.currentTime, 1.5);
}

// ---- building blocks ----
function tone(freq, dur, { type = 'sine', vol = 0.3, at = 0, slide = 0, attack = 0.005 } = {}) {
  const t = ctx.currentTime + at;
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, freq * slide), t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(master);
  o.start(t); o.stop(t + dur + 0.05);
}
function noise(dur, { vol = 0.3, at = 0, from = 2000, to = 400, q = 1, type = 'bandpass' } = {}) {
  const t = ctx.currentTime + at;
  const s = ctx.createBufferSource(); s.buffer = noiseBuf;
  const f = ctx.createBiquadFilter(); f.type = type; f.Q.value = q;
  f.frequency.setValueAtTime(from, t); f.frequency.exponentialRampToValueAtTime(Math.max(30, to), t + dur);
  const g = ctx.createGain();
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  s.connect(f).connect(g).connect(master);
  s.start(t, Math.random()); s.stop(t + dur + 0.05);
}

// pitch varies a little each time so repeated sounds do not grate
const vary = () => 0.92 + Math.random() * 0.16;
const SOUNDS = {
  swing: () => noise(0.16, { vol: 0.25, from: 2400 * vary(), to: 700, q: 2 }),
  hit: () => { tone(140 * vary(), 0.14, { type: 'triangle', vol: 0.45, slide: 0.5 }); noise(0.08, { vol: 0.3, from: 1800, to: 500 }); },
  bigHit: () => { tone(90, 0.3, { type: 'triangle', vol: 0.6, slide: 0.4 }); noise(0.2, { vol: 0.4, from: 1200, to: 200 }); },
  weak: () => tone(900 * vary(), 0.08, { type: 'square', vol: 0.08, slide: 0.8 }),   // the weapon barely scratches
  hurt: () => { tone(220, 0.22, { type: 'sawtooth', vol: 0.2, slide: 0.55 }); noise(0.12, { vol: 0.2, from: 900, to: 300 }); },
  dodge: () => noise(0.22, { vol: 0.22, from: 600, to: 2600, q: 1.5 }),
  pickup: () => { tone(660 * vary(), 0.09, { vol: 0.18 }); tone(990 * vary(), 0.12, { vol: 0.15, at: 0.06 }); },
  craft: () => { for (const [k, at] of [[1, 0], [1.02, 0.18], [0.98, 0.36]]) { tone(1240 * k, 0.5, { type: 'triangle', vol: 0.18, at }); tone(1870 * k, 0.3, { vol: 0.08, at }); noise(0.05, { vol: 0.25, at, from: 5000, to: 2000 }); } tone(523, 0.6, { vol: 0.15, at: 0.55 }); tone(784, 0.7, { vol: 0.15, at: 0.65 }); },
  quest: () => { tone(587, 0.25, { vol: 0.16 }); tone(880, 0.35, { vol: 0.14, at: 0.1 }); },
  objective: () => [523, 659, 784].forEach((f, i) => tone(f, 0.4, { vol: 0.15, at: i * 0.12 })),
  floor: () => [392, 523, 659, 784, 1046].forEach((f, i) => tone(f, 0.6, { vol: 0.14, at: i * 0.13, type: 'triangle' })),
  level: () => [523, 659, 784, 1046].forEach((f, i) => { tone(f, 0.35, { vol: 0.16, at: i * 0.08 }); tone(f * 2, 0.2, { vol: 0.05, at: i * 0.08 }); }),
  wrong: () => { tone(200, 0.25, { type: 'square', vol: 0.12 }); tone(150, 0.35, { type: 'square', vol: 0.12, at: 0.18 }); },
  boss: () => { tone(70, 1.4, { type: 'sawtooth', vol: 0.35, slide: 0.6, attack: 0.15 }); tone(105, 1.2, { type: 'sawtooth', vol: 0.2, slide: 0.5, attack: 0.2 }); noise(1.2, { vol: 0.25, from: 400, to: 80, type: 'lowpass' }); },
  yield: () => [659, 587, 523, 440].forEach((f, i) => tone(f, 0.5, { vol: 0.13, at: i * 0.18, type: 'triangle' })),
  ending: () => [262, 330, 392, 523, 659, 784].forEach((f, i) => tone(f, 1.6, { vol: 0.12, at: i * 0.22, type: 'triangle', attack: 0.05 })),
  water: () => noise(0.5, { vol: 0.2, from: 900, to: 2500, q: 3 }),
  eat: () => { noise(0.07, { vol: 0.2, from: 1500, to: 800 }); noise(0.07, { vol: 0.2, at: 0.12, from: 1500, to: 800 }); },
};
export function sfx(name) {
  if (!ctx || muted || ctx.state !== 'running') return;
  try { SOUNDS[name]?.(); } catch { /* never let sound break the game */ }
}

// The tree's floor plan. One place defines where the trunk strands sit at every height and
// where every walkway goes, so the meshes, the paths and the player's collision all agree.
//
// Scale: 1 unit = 1 m. The trunk is a ring of nine strands about 320 m across; the hollow
// inside is ~180 m wide and holds a small glowing planet at mid-height.
import { mulberry32 } from '../noise.js';

export const SEED = 20261112;
export const TAU = Math.PI * 2;

export const TRUNK = {
  strands: 9,
  top: 300,        // m: where strands stop rising and bend out into limbs
  twist: 0.0035,   // rad per metre of height
};

// distance from the axis to each strand's centre line, and one strand's radius
export const ringR = (y) => 120 + 40 * Math.exp(-Math.max(y, 0) / 40) + 4 * Math.sin(y * 0.02 + 1.3);
export const strandR = (y) => 30 + 18 * Math.exp(-Math.max(y, 0) / 60);

const rand = mulberry32(SEED);
const theta0 = Array.from({ length: TRUNK.strands }, (_, i) => (i / TRUNK.strands) * TAU + 0.15 + (rand() - 0.5) * 0.04);
export const strandTheta = (i, y) => theta0[i] + y * TRUNK.twist + 0.02 * Math.sin(y * 0.012 + i * 2.1);

// angle midway between strand i and strand i+1 at height y: the openings in the trunk
export const gapAngles = (y) => theta0.map((_, i) => {
  const a = strandTheta(i, y);
  let b = strandTheta((i + 1) % TRUNK.strands, y);
  if (b < a) b += TAU;
  return (a + b) / 2;
});

// ---- walkways ------------------------------------------------------------
// Spiral ramp hugging the inner wall: 4 turns, 300 m of climb over ~1.8 km of path.
export const RAMP = { rin: 66, rout: 74, top: 300, turns: 4 };
export const rampStart = 0.2;
export const rampAt = (f) => ({ a: rampStart + f * RAMP.turns * TAU, y: f * RAMP.top });
// metres of height per radian of ramp
export const RAMP_RISE = RAMP.top / (RAMP.turns * TAU);

// Circular galleries just outside the ramp. One ramp turn = 75 m, so the ramp meets every
// gallery at the same angle (rampStart): a vertical "junction" you can always find again.
export const GALLERY = { rin: RAMP.rout, rout: 82, levels: [75, 150, 225, 300] };
// lantern colour per level, so the player can tell floors apart at a glance
export const LEVEL_COLORS = { 75: '#ffb35c', 150: '#6fe3d2', 225: '#c59bff', 300: '#ffd76a' };

export const PLANET = {
  y: 150, radius: 32,
  ringIn: 36, ringOut: 42,          // walkable ring around the equator
  bridgeAngles: [0, 1, 2, 3].map((k) => rampStart + Math.PI / 4 + (k * Math.PI) / 2),
  sag: 2.5, bridgeWidth: 3,
};

// From the top gallery, three bridges leave through openings to lookouts outside the trunk.
export const TOP_BRIDGES = (() => {
  const gaps = gapAngles(GALLERY.levels[3]);
  return [gaps[0], gaps[3], gaps[6]];
})();
export const LOOKOUT = { centre: 230, radius: 12, width: 3 };

// Ground: one entrance per gap, spokes from the hall out to a loop trail around the tree,
// and one long approach trail.
export const ENTRANCES = gapAngles(1);
export const LOOP_R = 340;
export const APPROACH = { angle: ENTRANCES[0], from: LOOP_R, to: 1100 };
export const HALL_R = 110; // interior floor radius

// Route graph (level-design skill): every place and the places you can walk to from it.
// Edges are written in both directions where the path is two-way. tests/smoke.mjs checks
// that every place can reach every other one, so nothing is a dead end.
export const ROUTES = {
  trilha: ['anel_externo'],
  anel_externo: ['trilha', 'entradas'],
  entradas: ['anel_externo', 'salao'],
  salao: ['entradas', 'rampa'],
  rampa: ['salao', 'galeria75', 'galeria150', 'galeria225', 'topo'],
  galeria75: ['rampa'],
  galeria150: ['rampa', 'pontes_planeta'],
  pontes_planeta: ['galeria150', 'anel_planeta'],
  anel_planeta: ['pontes_planeta'],
  galeria225: ['rampa'],
  topo: ['rampa', 'pontes_topo'],
  pontes_topo: ['topo', 'mirantes'],
  mirantes: ['pontes_topo'],
};

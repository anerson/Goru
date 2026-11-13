// The tree's floor plan. One place defines where the trunk strands sit at every height and
// where every walkway goes, so the meshes, the paths and the player's collision all agree.
//
// Scale: 1 unit = 1 m. The trunk is a ring of nine strands about 320 m across; the hollow
// inside is ~180 m wide and is stacked with five ecosystems, one per level.
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
// level at the same angle (rampStart): a vertical "junction" you can always find again.
export const GALLERY = { rin: RAMP.rout, rout: 82, levels: [75, 150, 225, 300] };

// ---- the ecosystems -------------------------------------------------------
// Each level inside the trunk is its own world: a terrain disk inside the ramp, lit by its
// own "sun" hanging from the floor above. The floor of each level is a 6 m slab whose
// underside (roots, glowing moss) is the sky of the level below.
export const DISK_R = RAMP.rin;   // 66 m: biome floors stop where the ramp begins
export const SLAB = 6;            // m: thickness of each floor
export const BIOMES = [
  { id: 'floresta', name: 'Floresta das Raízes', level: 0, color: '#a6e07e', light: '#ffd9a0' },
  { id: 'lago', name: 'Lago Suspenso', level: 75, color: '#6fe3d2', light: '#c4f1ff' },
  { id: 'canion', name: 'Cânion Vermelho', level: 150, color: '#ff9a5c', light: '#ffb070' },
  { id: 'gelo', name: 'Caverna de Gelo', level: 225, color: '#9fd2ff', light: '#d6e9ff' },
  { id: 'prado', name: 'Prado do Céu', level: 300, color: '#ffd76a', light: null }, // open to the sky
];
export const LEVEL_COLORS = Object.fromEntries(BIOMES.map((b) => [b.level, b.color]));
// Three short bridges per level cross the ramp gap from the biome floor to its gallery.
// At these angles the ramp is 19-56 m above or below, so nothing collides.
export const LEVEL_BRIDGES = [1, 2, 3].map((k) => rampStart + (k * Math.PI) / 2);

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

// Route graph (level-design skill): every place and the places you can walk to from it.
// Edges are written in both directions where the path is two-way. tests/smoke.mjs checks
// that every place can reach every other one, so nothing is a dead end.
export const ROUTES = {
  trilha: ['anel_externo'],
  anel_externo: ['trilha', 'entradas'],
  entradas: ['anel_externo', 'floresta'],
  floresta: ['entradas', 'rampa'],
  rampa: ['floresta', 'galeria75', 'galeria150', 'galeria225', 'galeria300', 'lago', 'canion', 'gelo', 'prado'],
  galeria75: ['rampa', 'lago'],
  lago: ['galeria75', 'rampa'],
  galeria150: ['rampa', 'canion'],
  canion: ['galeria150', 'rampa'],
  galeria225: ['rampa', 'gelo'],
  gelo: ['galeria225', 'rampa'],
  galeria300: ['rampa', 'prado', 'pontes_topo'],
  prado: ['galeria300', 'rampa'],
  pontes_topo: ['galeria300', 'mirantes'],
  mirantes: ['pontes_topo'],
};

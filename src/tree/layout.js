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

// ---- the ecosystems -------------------------------------------------------
// Ten levels inside the trunk, one every 33.3 m, each its own world: a terrain disk inside
// the ramp, lit by its own "sun" hanging from the floor above. The floor of each level is a
// 6 m slab whose underside (roots, glowing moss) is the sky of the level below.
export const LEVEL_STEP = RAMP.top / 9;
export const DISK_R = RAMP.rin;   // 66 m: biome floors stop where the ramp begins
export const SLAB = 6;            // m: thickness of each floor (27 m of headroom per level)
const B = (id, name, k, color, light) => ({ id, name, level: +(k * LEVEL_STEP).toFixed(3), color, light });
export const BIOMES = [
  // order and names from the Aetherion campaign manual (section 5, regional progression)
  B('raizes', 'Floresta das Raízes', 0, '#a6e07e', '#ffd9a0'),
  B('deserto', 'Deserto da Casca', 1, '#ffb070', '#ffc58a'),
  B('oceano', 'Oceano Interior', 2, '#6fd6e3', '#c4f1ff'),
  B('fornalha', 'Fornalha de Ignar', 3, '#ff5a36', '#ff8a5c'),
  B('niveria', 'Nivéria, o Reino Congelado', 4, '#9fd2ff', '#d6e9ff'),
  B('selva', 'Selva dos Gigantes', 5, '#4fd18b', '#d9ffb8'),
  B('pantano', 'Pântano da Decomposição', 6, '#9bbf4a', '#cfe08a'),
  B('cristais', 'Reino dos Cristais', 7, '#c59bff', '#d8c4ff'),
  B('suspensa', 'Floresta Suspensa', 8, '#7fe08a', '#e8ffd0'),
  B('copa', 'Jardim da Copa', 9, '#ffd76a', null), // open to the sky
];
export const LEVEL_COLORS = Object.fromEntries(BIOMES.map((b) => [b.level, b.color]));

// Circular gallery just outside the ramp at every level above the ground.
export const GALLERY = { rin: RAMP.rout, rout: 82, levels: BIOMES.slice(1).map((b) => b.level) };

// The ramp reaches each level at one angle: the junction where ramp, gallery and floor meet.
export const junctionAngle = (level) => rampStart + level / RAMP_RISE;
// Three short bridges per level cross the ramp gap from the biome floor to its gallery.
// A quarter, half and three-quarter turn from the junction the ramp is 19-56 m away
// vertically, so nothing collides.
export const levelBridges = (level) => [1, 2, 3].map((k) => junctionAngle(level) + (k * Math.PI) / 2);

// From the top gallery, three bridges leave through openings to lookouts outside the trunk.
export const TOP_BRIDGES = (() => {
  const gaps = gapAngles(RAMP.top);
  return [gaps[0], gaps[3], gaps[6]];
})();
export const LOOKOUT = { centre: 230, radius: 12, width: 3 };

// Ground: one entrance per gap, spokes from the hall out to a loop trail around the tree,
// and one long approach trail.
export const ENTRANCES = gapAngles(1);
export const LOOP_R = 340;
export const APPROACH = { angle: ENTRANCES[0], from: LOOP_R, to: 1100 };

// Route graph (level-design skill): every place and the places you can walk to from it.
// Edges are two-way. tests/smoke.mjs checks that every place can reach every other one.
export const ROUTES = (() => {
  const g = {
    trilha: ['anel_externo'],
    anel_externo: ['trilha', 'entradas'],
    entradas: ['anel_externo', 'raizes'],
    raizes: ['entradas', 'rampa'],
    rampa: ['raizes'],
    pontes_topo: ['galeria_copa', 'mirantes'],
    mirantes: ['pontes_topo'],
  };
  for (const b of BIOMES.slice(1)) {
    const gal = `galeria_${b.id}`;
    g.rampa.push(gal, b.id);
    g[gal] = ['rampa', b.id];
    g[b.id] = [gal, 'rampa'];
  }
  g.galeria_copa.push('pontes_topo');
  return g;
})();

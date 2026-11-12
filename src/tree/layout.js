// The tree's floor plan. One place defines where the seven trunk strands sit at every
// height, so the mesh builder, the walkways and the player's collision all agree.
import { mulberry32 } from '../noise.js';

export const SEED = 20261112;
export const TAU = Math.PI * 2;

export const TRUNK = {
  strands: 7,
  top: 40,       // m: where strands stop rising and bend out into limbs
  twist: 0.03,   // rad per metre of height
};

export const RAMP = {
  rin: 4.6,      // m from the trunk axis
  rout: 7.2,
  top: 36,       // m: deck height
  turns: 3,
};

// distance from the axis to each strand's centre line
export const ringR = (y) => 11.5 + 3.2 * Math.exp(-Math.max(y, 0) / 6) + 0.4 * Math.sin(y * 0.11 + 1.3);
// radius of one strand
export const strandR = (y) => 3.0 + 1.7 * Math.exp(-Math.max(y, 0) / 8);

const rand = mulberry32(SEED);
// Strands are packed into 93% of the circle; the leftover becomes one wide gap that
// twists up the trunk. At ground level it is the entrance, at deck level the bridge exit.
const spacing = (TAU * 0.93) / TRUNK.strands;
const theta0 = Array.from({ length: TRUNK.strands }, (_, i) => 0.4 + i * spacing + (rand() - 0.5) * 0.08);

export const strandTheta = (i, y) => theta0[i] + y * TRUNK.twist + 0.1 * Math.sin(y * 0.16 + i * 2.1);
const gapMid = (y) => (strandTheta(TRUNK.strands - 1, y) + strandTheta(0, y) + TAU) / 2;

export const thetaEntrance = gapMid(1.0);
export const thetaBridge = gapMid(RAMP.top + 0.5);

// The ramp ends 0.6 rad before the bridge so the bridge never passes over the last ramp turn.
export const rampStart = thetaBridge - 0.6;
export const rampAt = (f) => ({ a: rampStart + f * RAMP.turns * TAU, y: f * RAMP.top });

export const LOOKOUT = { centre: 26, radius: 4.6, bridgeFrom: RAMP.rin - 0.3, bridgeTo: 22.5, bridgeWidth: 2.2 };

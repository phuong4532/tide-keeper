// Fixed numbers for Tide Keeper: the size of the picture, where things stand, the tides, beams and abilities.
export const W = 1280;
export const H = 800;
/** The simulation always advances in steps of this many seconds. */
export const STEP = 1 / 60;
/** Screen y where the sea meets the sky. */
export const HORIZON = 330;
/** The lamp the beam leaves from. */
export const LAMP = { x: 640, y: 428 };
/** Where creatures are heading: the foot of the tower. */
export const BASE = { x: 640, y: 598 };
export const TOWER_HIT_RADIUS = 58;
export const TOTAL_WAVES = 12;

/** Twelve waves in three tides; the sky and the sea change with each. */
export const TIDES = [
  { id: 'dusk', name: 'Dusk', from: 1, to: 4, line: 'Embers on the water' },
  { id: 'midnight', name: 'Midnight', from: 5, to: 8, line: 'The deep stirs' },
  { id: 'dawn', name: 'Dawn', from: 9, to: 12, line: 'Hold until the sun' },
];

/** Waves that end in a named boss. */
export const BOSS_WAVES = [5, 10];

export const START = { hp: 16, power: 100 };

export const BEAM = {
  half: 0.15, // half-angle of the wide cone, radians
  range: 520,
  dps: 34, // damage per second at point blank, falling off with distance
  focusHalf: 0.035,
  focusRangeMul: 1.3,
  focusDps: 150,
  focusDrain: 36, // power per second while focused
  regen: 15, // power per second otherwise
  unlockAt: 30, // power needed to focus again after running dry
  turnK: 70, // how hard the beam is pulled toward the aim
  turnD: 11, // damping, so it overshoots a touch
  maxTurn: 7, // radians per second
  shieldLeak: 0.12, // share of unfocused damage a shielded creature still takes
};

/** The three lamps a keeper can light. Prism and Ember are unlocked with the sea glass in the bank. */
export const BEAMS = {
  sun: { id: 'sun', name: 'Sun Beam', cost: 0, rgb: '255,236,170', blurb: 'One honest cone of light.', detail: 'Balanced. Wide sweep, deadly focus.' },
  prism: { id: 'prism', name: 'Prism Beam', cost: 140, rgb: '170,215,255', blurb: 'Splits into three rays.', detail: 'Covers more sea, hits each ray softer.' },
  ember: { id: 'ember', name: 'Ember Beam', cost: 300, rgb: '255,170,90', blurb: 'Sets creatures burning.', detail: 'Burn keeps damaging after the light moves on.' },
};
export const BEAM_ORDER = ['sun', 'prism', 'ember'];

/** The keeper's three abilities: key, cooldown in seconds. */
export const ABILITIES = [
  { id: 'pulse', key: 'Q', name: 'Pulse Nova', cd: 18, blurb: 'A ring of light hurls the sea back.' },
  { id: 'buoy', key: 'E', name: 'Lantern Buoy', cd: 22, blurb: 'Drop a burning buoy where you aim.' },
  { id: 'storm', key: 'R', name: 'Storm Call', cd: 52, blurb: 'Lightning on the nearest creatures.' },
];

export const COMBO = { window: 3, step: 5, perStep: 0.5, max: 5 };

/** Where collected pearls fly to on the HUD. */
export const PEARL_HUD = { x: 934, y: 98 };
/** The centre of the Pulse Nova: the foot of the tower. */
export const PULSE_CENTER = { x: 640, y: 520 };

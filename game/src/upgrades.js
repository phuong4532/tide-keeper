// What pearls buy between waves. Upgrades stack as levels; relics are one-of-a-kind trinkets that
// bend a rule for the rest of the run. Each item says its rarity, which sets its colour and its price.

export const RARITY = {
  common: { name: 'COMMON', color: '#9fc4ff', glow: '120,170,255', base: 18, weight: 60 },
  rare: { name: 'RARE', color: '#c79bff', glow: '180,130,255', base: 34, weight: 28 },
  epic: { name: 'EPIC', color: '#ffc861', glow: '255,190,80', base: 58, weight: 12 },
};

export const MAX_LEVEL = 4;

export const UPGRADES = [
  { id: 'wide', icon: 'cone', rarity: 'common', name: 'Wide Lens', desc: 'The beam cone grows 22% wider.' },
  { id: 'bright', icon: 'sun', rarity: 'common', name: 'Bright Lamp', desc: 'Beam reaches 12% farther and burns 15% harder.' },
  { id: 'cell', icon: 'cell', rarity: 'common', name: 'Deep Battery', desc: '+25 maximum power and faster recharge.' },
  { id: 'slow', icon: 'waves', rarity: 'common', name: 'Slow Tide', desc: 'Every creature moves 9% slower.' },
  { id: 'focus', icon: 'laser', rarity: 'rare', name: 'Hardened Laser', desc: 'Focused beam hits 30% harder and drains less.' },
  { id: 'bolts', icon: 'bolt', rarity: 'rare', name: 'Storm Coil', desc: 'Lightning now and then strikes the nearest creatures.' },
  { id: 'haste', icon: 'clock', rarity: 'rare', name: "Keeper's Haste", desc: 'Q, E and R recharge 12% faster.' },
  { id: 'might', icon: 'nova', rarity: 'rare', name: 'Nova Might', desc: 'Pulse and Buoy reach 12% farther and hit 20% harder.' },
  { id: 'polish', icon: 'laser', rarity: 'rare', name: 'Polished Shards', desc: 'Mirror lasers hit 30% harder and reach 8% farther.' },
  { id: 'hull', icon: 'shield', rarity: 'rare', name: 'Stone Footing', desc: '+4 maximum hull and mend 4.' },
];

export const RELICS = [
  { id: 'net', icon: 'pearl', rarity: 'rare', name: "Diver's Net", desc: '+35% pearls from every creature.' },
  { id: 'ward', icon: 'barnacle', rarity: 'rare', name: 'Barnacle Ward', desc: 'The first hit each wave is blocked.' },
  { id: 'bell', icon: 'bell', rarity: 'rare', name: "Siren's Bell", desc: 'Every kill shaves 0.35s off all cooldowns.' },
  { id: 'anchor', icon: 'anchor', rarity: 'rare', name: 'Old Anchor', desc: '+6 maximum hull and mend 6.' },
  { id: 'gull', icon: 'feather', rarity: 'rare', name: 'Gull Feather', desc: 'Combos last 2 seconds longer.' },
  { id: 'hourglass', icon: 'glass', rarity: 'epic', name: 'Dusk Hourglass', desc: 'Focused beam drains 35% less power.' },
  { id: 'crown', icon: 'crown', rarity: 'epic', name: 'Coral Crown', desc: '+30% score from everything.' },
  { id: 'heart', icon: 'heart', rarity: 'epic', name: 'Fresnel Heart', desc: 'The wide beam bites through shields (50%).' },
  { id: 'kaleido', icon: 'sun', rarity: 'epic', name: 'Kaleidoscope', desc: 'A lit mirror shard keeps firing 2 seconds after the beam leaves it.' },
  { id: 'bottle', icon: 'bottle', rarity: 'epic', name: 'Storm in a Bottle', desc: 'Storm Call strikes 5 more targets and recharges 25% faster.' },
];

export const FRESH_LEVELS = { wide: 0, bright: 0, cell: 0, bolts: 0, slow: 0, focus: 0, haste: 0, might: 0, polish: 0 };

export const ITEMS = [...UPGRADES.map((u) => ({ ...u, kind: 'upgrade' })), ...RELICS.map((r) => ({ ...r, kind: 'relic' }))];
export const itemById = (id) => ITEMS.find((i) => i.id === id);

/** How much `item` costs this run: upgrades get dearer with each level. */
export function priceOf(world, item) {
  const base = RARITY[item.rarity].base;
  return item.kind === 'upgrade' ? base + 6 * (world.up[item.id] || 0) : base;
}

/** Apply a bought item to the world. */
export function applyItem(world, item) {
  if (item.kind === 'relic') world.relics.push(item.id);
  else if (item.id === 'hull') {
    world.up.hull = (world.up.hull || 0) + 1;
    world.addMaxHp(4);
  } else world.up[item.id] += 1;
  if (item.id === 'anchor') world.addMaxHp(6);
}

function available(world, item) {
  if (item.kind === 'relic') return !world.relics.includes(item.id);
  return (world.up[item.id] || 0) < MAX_LEVEL;
}

/** Three different offers for the shop, drawn by rarity weight. */
export function pickOffers(world, rng, count = 3, avoid = []) {
  const taken = new Set(avoid);
  const offers = [];
  for (let n = 0; n < count; n += 1) {
    const roll = rng.next() * 100;
    let rarity = 'common';
    if (roll > 88) rarity = 'epic';
    else if (roll > 60) rarity = 'rare';
    let pool = ITEMS.filter((i) => i.rarity === rarity && available(world, i) && !taken.has(i.id));
    if (pool.length === 0) pool = ITEMS.filter((i) => available(world, i) && !taken.has(i.id));
    if (pool.length === 0) break;
    const item = pool[Math.floor(rng.next() * pool.length)];
    taken.add(item.id);
    offers.push({ item, cost: priceOf(world, item), sold: false });
  }
  return offers;
}

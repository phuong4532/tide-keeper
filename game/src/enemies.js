// The sea creatures: their numbers, how they spawn and move, and which ones each wave brings.
// Eight kinds plus the boss: crabs, eels, ghosts, leviathans, moon jellies (which split), spratlings,
// gunboats (which shell the tower) and the Kraken Queen.
import { BASE, BOSS_WAVES, H, HORIZON, W } from './config.js';

export const TYPES = {
  crab: { name: 'Shadow Crab', hp: 36, speed: 34, r: 18, damage: 1, score: 10, pearls: 0.8, shielded: false, blurb: 'Slow, steady, comes in numbers.' },
  eel: { name: 'Needle Eel', hp: 22, speed: 84, r: 14, damage: 1, score: 18, pearls: 0.85, shielded: false, blurb: 'Fast and weaving. Sweep it down.' },
  ghost: { name: 'Ghost Light', hp: 20, speed: 46, r: 15, damage: 2, score: 30, pearls: 1.6, shielded: false, blurb: 'Dodges the wide beam. Focus it.' },
  leviathan: { name: 'Leviathan', hp: 260, speed: 20, r: 40, damage: 5, score: 120, pearls: 7, shielded: true, blurb: 'Shielded. Only the focused beam bites.' },
  jelly: { name: 'Moon Jelly', hp: 52, speed: 26, r: 21, damage: 2, score: 28, pearls: 1.6, shielded: false, blurb: 'Bursts into three spratlings.' },
  sprat: { name: 'Spratling', hp: 9, speed: 98, r: 9, damage: 1, score: 4, pearls: 0.3, shielded: false, blurb: 'Tiny, quick, everywhere.' },
  gunboat: { name: 'Drowned Gunboat', hp: 110, speed: 30, r: 26, damage: 2, score: 70, pearls: 6, shielded: false, blurb: 'Holds back and shells the tower.' },
  shell: { name: 'Cannonball', hp: 7, speed: 118, r: 8, damage: 1, score: 3, pearls: 0.15, shielded: false, blurb: 'Burn it before it lands.' },
  kraken: { name: 'Kraken Queen', hp: 1150, speed: 15, r: 66, damage: 4, score: 900, pearls: 36, shielded: false, blurb: 'Boss. Break her shield, then burn.' },
};

/** The boss each boss wave brings. */
export const BOSSES = {
  5: { title: 'Kraken Queen', sub: 'Mother of the Midnight Tide', hp: 1150, shield: 320, summon: 'sprat', summonCount: 3, summonEvery: 7.5 },
  10: { title: 'Kraken Queen, Risen', sub: 'She comes again, crowned in dawnfire', hp: 2300, shield: 620, summon: 'jelly', summonCount: 2, summonEvery: 8, volley: true },
};

let nextId = 1;

/** A new creature of `type` at (x, y), tougher the later the wave. */
export function makeEnemy(type, x, y, wave, rng) {
  const spec = TYPES[type];
  const boss = type === 'kraken' ? BOSSES[wave] || BOSSES[5] : null;
  const hp = boss ? boss.hp : spec.hp * (1 + 0.12 * wave);
  return {
    id: nextId++,
    type,
    x,
    y,
    vx: 0,
    vy: 0,
    hp,
    maxHp: hp,
    r: spec.r,
    speed: spec.speed * (1 + 0.02 * wave) * rng.range(0.9, 1.12),
    shielded: spec.shielded,
    lit: 0, // 0..1, how brightly the beam shows it
    flash: 0, // white flash after being hit
    shieldGlow: 0,
    phase: rng.range(0, 6.28),
    t: 0,
    alert: 0, // ghosts: how long the beam has been on them
    dodgeCooldown: 0,
    dodgeX: 0,
    dodgeY: 0,
    acc: 0, // damage taken since the last damage number
    accT: 0,
    accBurn: false,
    chill: 0,
    burn: 0, // Ember beam: seconds of burning left
    shield: boss ? boss.shield : 0, // the boss's shield, hit points
    shieldMax: boss ? boss.shield : 0,
    exposed: 0, // the boss, seconds with her shield down
    cd: rng.range(1.2, 3), // gunboat and boss: seconds to the next shot or summon
    slam: 2.5,
    enraged: false,
    boss: boss ? { ...boss } : null,
  };
}

/** Where a new creature appears: ghosts in the sky, the rest from the sides or the horizon. */
export function spawnPoint(type, rng) {
  if (type === 'ghost') {
    return { x: rng.chance(0.5) ? -30 : W + 30, y: rng.range(80, HORIZON - 30) };
  }
  if (type === 'kraken') return { x: rng.chance(0.5) ? 220 : W - 220, y: HORIZON + 30 };
  if (type === 'gunboat') return { x: rng.chance(0.5) ? -50 : W + 50, y: rng.range(HORIZON + 60, HORIZON + 200) };
  if (rng.chance(0.4)) return { x: rng.range(80, W - 80), y: HORIZON + rng.range(6, 24) };
  return { x: rng.chance(0.5) ? -40 : W + 40, y: rng.range(HORIZON + 40, H - 90) };
}

/**
 * Move one creature for `dt` seconds. `slow` scales its speed; `beam` tells ghosts where the light is
 * so they can slip out of it.
 */
export function moveEnemy(e, dt, slow, beam) {
  e.t += dt;
  e.flash = Math.max(0, e.flash - dt);
  e.shieldGlow = Math.max(0, e.shieldGlow - dt);
  const dx = BASE.x - e.x;
  const dy = BASE.y - e.y;
  const dist = Math.hypot(dx, dy) || 1;
  const ux = dx / dist;
  const uy = dy / dist;
  let speed = e.speed * slow * (e.enraged ? 1.5 : 1);
  if (e.stun > 0) {
    e.stun -= dt;
    speed *= 0.15;
  }
  // Creatures that hold their distance stop at their firing range.
  if (e.type === 'gunboat' && dist < 330) speed = 0;
  if (e.type === 'kraken' && dist < 190) speed = 0;
  let vx = ux * speed;
  let vy = uy * speed;
  if (e.push) {
    vx += e.push.x;
    vy += e.push.y;
    const keep = Math.exp(-dt * 4);
    e.push.x *= keep;
    e.push.y *= keep;
    if (Math.abs(e.push.x) + Math.abs(e.push.y) < 4) e.push = null;
  }

  if (e.type === 'eel') {
    const sway = Math.sin(e.t * 3.2 + e.phase) * 70 * slow;
    vx += -uy * sway;
    vy += ux * sway;
  } else if (e.type === 'crab') {
    vx += Math.sin(e.t * 2 + e.phase) * 9;
  } else if (e.type === 'sprat') {
    const sway = Math.sin(e.t * 6 + e.phase) * 46 * slow;
    vx += -uy * sway;
    vy += ux * sway;
  } else if (e.type === 'jelly') {
    vy += Math.sin(e.t * 2.4 + e.phase) * 18;
  } else if (e.type === 'gunboat') {
    vy += Math.sin(e.t * 1.3 + e.phase) * 8;
  } else if (e.type === 'ghost') {
    e.dodgeCooldown = Math.max(0, e.dodgeCooldown - dt);
    e.dodgeX *= Math.exp(-dt * 3);
    e.dodgeY *= Math.exp(-dt * 3);
    vx += e.dodgeX;
    vy += e.dodgeY;
    vy += Math.sin(e.t * 1.7 + e.phase) * 14;
    if (beam.onMe && !beam.focusing) {
      e.alert += dt;
      if (e.alert > 0.16 && e.dodgeCooldown === 0) {
        const side = beam.side >= 0 ? 1 : -1;
        const ang = beam.angle + (Math.PI / 2) * side;
        e.dodgeX = Math.cos(ang) * 340;
        e.dodgeY = Math.sin(ang) * 340;
        e.dodgeCooldown = 0.9;
        e.alert = 0;
      }
    } else {
      e.alert = Math.max(0, e.alert - dt * 2);
    }
  }

  e.vx = vx;
  e.vy = vy;
  e.x += vx * dt;
  e.y += vy * dt;
  if (e.type !== 'ghost' && e.y < HORIZON + 4) e.y = HORIZON + 4;
}

/** What wave `n` sends, as [type, count] pairs (the boss comes separately). */
export function waveCounts(n) {
  const boss = BOSS_WAVES.includes(n);
  const scale = (count) => Math.round(count * (boss ? 0.55 : 1) * (n > 8 ? 1 + 0.12 * (n - 8) : 1));
  const rows = [
    ['crab', 9 + Math.ceil(3 * n)],
    ['eel', n >= 2 ? Math.min(24, 3 * n) : 0],
    ['jelly', n >= 3 ? Math.min(12, n) : 0],
    ['ghost', n >= 4 ? Math.min(12, n) : 0],
    ['gunboat', n >= 6 ? Math.min(4, Math.floor((n - 3) / 2)) : 0],
    ['leviathan', n >= 6 ? Math.floor((n - 2) / 2.5) : 0],
  ].map(([type, count]) => [type, scale(count)]);
  if (n === 12) rows.push(['leviathan', scale(1)]);
  return rows.filter(([, count]) => count > 0);
}

/** The creatures wave `n` sends, as a shuffled list of type names (the boss comes separately). */
export function waveRoster(n, rng) {
  const list = [];
  for (const [type, count] of waveCounts(n)) for (let i = 0; i < count; i += 1) list.push(type);
  return rng.shuffle(list);
}

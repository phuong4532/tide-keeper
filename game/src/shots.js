// The screenshot scenes behind ?shot=play|shop|title|win. Each plays the real rules forward from a fixed
// seed, steered by the autopilot bot, so the frame is what a real run looks like and the same seed always
// gives the same frame. Only the meta bank and the shop's purse are staged.
import { Autopilot, simulate } from './autopilot.js';
import { STEP } from './config.js';
import { Rng } from './random.js';
import { pickOffers } from './upgrades.js';
import { SCREEN_OVER, SCREEN_SHOP, SCREEN_WIN } from './world.js';

const BOSS_WAVE = 5;

function freshRun(world, seed, beam, relics = []) {
  world.reset(seed);
  world.meta.unlocked = { sun: true, prism: true, ember: true };
  world.meta.beam = beam;
  world.meta.best = 18420;
  world.meta.bank = 212;
  world.startRun();
  world.meta.runs = 7;
  world.relics.push(...relics);
  return new Autopilot('expert', seed);
}

/** How crowded and dramatic the frame is: creatures, lit ones, boss, abilities in flight, numbers. */
function busyness(world) {
  const lit = world.enemies.filter((e) => e.lit > 0.5).length;
  const kinds = new Set(world.enemies.map((e) => e.type)).size;
  return world.enemies.length + lit * 3 + kinds * 4 + (world.focusing ? 5 : 0) + world.rings.length * 22 + world.buoys.length * 10 + (world.boss && world.boss.lit > 0.5 ? 16 : 0) + world.bolts.length * 3 + world.floaters.length * 0.6;
}

/** Play wave 5 (the Kraken Queen) once to find the busiest moment, then replay to it. */
function stagePlay(world, seed) {
  let bestStep = 0;
  let bestScore = -1;
  let use = seed;
  for (let pass = 0; pass < 2; pass += 1) {
    const bot = freshRun(world, use, 'prism', ['ward', 'bell', 'hourglass']);
    simulate(world, bot, 900, (i) => {
      if (pass === 1) return i + 1 < bestStep;
      if (world.wave > BOSS_WAVE || world.screen === SCREEN_OVER) return false;
      const boss = world.boss;
      if (world.wave === BOSS_WAVE && boss && world.bannerT <= 0 && world.bossIntro <= 0 && boss.y > 360) {
        const score = busyness(world) + (boss.exposed > 0 ? 0 : 6);
        if (score > bestScore) {
          bestScore = score;
          bestStep = i + 1;
        }
      }
      return true;
    });
    if (pass === 0 && bestScore < 0) {
      // This seed's run fell before the boss; try the next one.
      use += 1;
      pass = -1;
      if (use > seed + 40) return;
    }
  }
  world.bannerT = 0;
}

/** The shop after wave 5, with a full purse and one card of each rarity if the seed allows. */
function stageShop(world, seed) {
  const bot = freshRun(world, seed, 'sun', ['net', 'gull']);
  simulate(world, bot, 900, () => !(world.screen === SCREEN_SHOP && world.wave === BOSS_WAVE));
  world.pearls += 46;
  const rng = new Rng(seed + 99);
  for (let tries = 0; tries < 60; tries += 1) {
    const offers = pickOffers(world, rng);
    const rarities = new Set(offers.map((o) => o.item.rarity));
    if (rarities.size === 3 && offers.some((o) => o.item.kind === 'relic')) {
      world.shop.offers = offers;
      break;
    }
  }
}

/** A victory: the first seed from `seed` on whose expert run reaches dawn. */
function stageWin(world, seed) {
  for (let s = seed; s < seed + 60; s += 1) {
    const bot = freshRun(world, s, 'prism');
    simulate(world, bot, 1800);
    if (world.screen === SCREEN_WIN) return;
  }
}

function stageTitle(world, seed) {
  world.reset(seed);
  world.meta.unlocked = { sun: true, prism: true, ember: false };
  world.meta.beam = 'prism';
  world.meta.best = 18420;
  world.meta.bank = 212;
  world.beamId = 'prism';
  for (let i = 0; i < 7.4 / STEP; i += 1) world.step(STEP, { aim: world.beamAngle, focus: false, cast: [] });
}

/** Set `world` to the named scene (play, shop, title or win; anything else is the title). */
export function stageShot(name, world, seed = 1) {
  if (name === 'play') stagePlay(world, seed);
  else if (name === 'shop') stageShop(world, seed);
  else if (name === 'win' || name === 'end') stageWin(world, seed);
  else stageTitle(world, seed);
}

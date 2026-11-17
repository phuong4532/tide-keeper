// A bot keeper. It drives the same World a player does: it aims, focuses, casts abilities and shops.
// Screenshot scenes use it to play real moments, and tools/simulate.mjs uses it (at different skill
// levels) to check the game can be both lost and won.
import { BASE, LAMP, PULSE_CENTER, STEP } from './config.js';
import { Rng } from './random.js';
import { MAX_LEVEL } from './upgrades.js';
import { SCREEN_PLAY, SCREEN_SHOP } from './world.js';

/** Skill presets: how sharp the aim is, how fast it re-targets, how well it times abilities. */
export const SKILLS = {
  expert: { jitter: 0.012, retarget: 0.15, react: 0.2, abilityUse: 1, focusFloor: 6, shop: 1 },
  good: { jitter: 0.05, retarget: 0.6, react: 1.0, abilityUse: 0.7, focusFloor: 18, shop: 0.85 },
  casual: { jitter: 0.075, retarget: 0.9, react: 1.4, abilityUse: 0.5, focusFloor: 30, shop: 0.5 },
};

const SHOP_PRIORITY = ['heart', 'hourglass', 'bottle', 'wide', 'bright', 'focus', 'cell', 'might', 'haste', 'bolts', 'ward', 'bell', 'net', 'hull', 'anchor', 'slow', 'crown', 'gull'];

export class Autopilot {
  constructor(skill = 'good', seed = 5) {
    this.skill = typeof skill === 'string' ? SKILLS[skill] : skill;
    this.rng = new Rng(seed * 31 + 7);
    this.target = null;
    this.retargetT = 0;
    this.err = 0;
    this.thinkT = 0;
    this.wantCast = [];
  }

  threat(world, e) {
    const d = Math.hypot(e.x - BASE.x, e.y - BASE.y);
    let score = d;
    if (e.type === 'shell') score -= 160;
    if (e.shielded || e.type === 'ghost') score -= 90;
    if (e.type === 'kraken') score -= 40;
    if (e.type === 'gunboat') score -= 60;
    return score;
  }

  /** What the bot does this step. */
  act(world) {
    const s = this.skill;
    this.retargetT -= STEP;
    if (!this.target || this.target.hp <= 0 || !world.enemies.includes(this.target) || this.retargetT <= 0) {
      let best = Infinity;
      this.target = null;
      for (const e of world.enemies) {
        const sc = this.threat(world, e);
        if (sc < best) {
          best = sc;
          this.target = e;
        }
      }
      this.retargetT = s.retarget;
    }
    this.err += (this.rng.range(-1, 1) * s.jitter - this.err * 0.08) * 1;
    const cast = [];
    this.thinkT -= STEP;
    if (this.thinkT <= 0) {
      this.thinkT = s.react;
      this.decideAbilities(world, cast);
    }
    const t = this.target;
    if (!t) return { aim: world.beamAngle, focus: false, cast, cursor: { x: BASE.x, y: 480 } };
    const x = t.x + t.vx * 0.25;
    const y = t.y + t.vy * 0.25;
    const tough = t.shielded || t.type === 'ghost' || t.type === 'gunboat' || t.type === 'kraken' || t.type === 'shell';
    const bossFight = t.type === 'kraken';
    return {
      aim: Math.atan2(y - LAMP.y, x - LAMP.x) + this.err,
      focus: tough && world.power > s.focusFloor && (!bossFight || world.power > 3),
      cast,
      cursor: { x: t.x, y: t.y },
    };
  }

  decideAbilities(world, cast) {
    const s = this.skill;
    if (this.rng.next() > s.abilityUse) return;
    const near = world.enemies.filter((e) => Math.hypot(e.x - PULSE_CENTER.x, e.y - PULSE_CENTER.y) < 300 + 40 * world.up.might);
    const close = near.some((e) => Math.hypot(e.x - BASE.x, e.y - BASE.y) < 190);
    if (world.cooldowns.pulse === 0 && (near.length >= 5 || (close && near.length >= 2) || near.some((e) => e.type === 'shell'))) cast.push('pulse');
    if (world.cooldowns.buoy === 0 && world.enemies.length >= 3) {
      let best = null;
      let count = 0;
      for (const e of world.enemies) {
        const n = world.enemies.filter((o) => Math.hypot(o.x - e.x, o.y - e.y) < 140).length;
        if (n > count) {
          count = n;
          best = e;
        }
      }
      if (best && count >= 3) {
        cast.push('buoy');
        this.buoyAt = { x: best.x, y: best.y };
      }
    }
    if (world.cooldowns.storm === 0 && (world.enemies.length >= 6 || world.boss)) cast.push('storm');
  }

  /** Spend pearls like a keeper who has read the cards, then sail on. */
  shop(world) {
    const s = this.skill;
    for (let guard = 0; guard < 8; guard += 1) {
      const options = world.shop.offers
        .map((o, i) => ({ o, i }))
        .filter(({ o }) => !o.sold && o.cost <= world.pearls && !(o.item.kind === 'upgrade' && world.up[o.item.id] >= MAX_LEVEL));
      if (options.length === 0) break;
      options.sort((a, b) => SHOP_PRIORITY.indexOf(a.o.item.id) - SHOP_PRIORITY.indexOf(b.o.item.id));
      if (this.rng.next() > s.shop + 0.15) break;
      world.buy(options[0].i);
    }
    while (world.hp <= world.maxHp - 5 && world.pearls >= world.mendCost) world.mend();
    world.nextWave();
  }
}

/** Run the world forward `seconds`, shopping between waves, until the run ends or time is up. */
export function simulate(world, bot, seconds, onStep) {
  for (let i = 0; i < seconds / STEP; i += 1) {
    if (world.screen === SCREEN_SHOP) bot.shop(world);
    else if (world.screen !== SCREEN_PLAY) break;
    const input = bot.act(world);
    if (bot.buoyAt && input.cast.includes('buoy')) input.cursor = bot.buoyAt;
    world.step(STEP, input);
    world.events.length = 0;
    if (onStep && onStep(i) === false) break;
  }
}

// The rules of Tide Keeper. A World holds everything that happens: the beam, the creatures, the waves,
// the abilities, the pearls and shop, the score. It never touches the screen or the browser, so it runs
// the same in a page or in a headless test.
import { BASE, BEAM, BEAMS, BOSS_WAVES, COMBO, LAMP, PULSE_CENTER, START, TIDES, TOTAL_WAVES, TOWER_HIT_RADIUS, ABILITIES } from './config.js';
import { BOSSES, makeEnemy, moveEnemy, spawnPoint, TYPES, waveRoster } from './enemies.js';
import { Rng } from './random.js';
import { freshMeta, loadMeta, saveMeta } from './storage.js';
import { applyItem, FRESH_LEVELS, pickOffers } from './upgrades.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_SHOP = 'shop';
export const SCREEN_OVER = 'over';
export const SCREEN_WIN = 'win';

const MAX_PARTICLES = 800;
const BANNER_SECONDS = 2.6;
const MEND_COST = 14;
const REROLL_COST = 8;

const wrap = (a) => {
  let x = a;
  while (x > Math.PI) x -= Math.PI * 2;
  while (x < -Math.PI) x += Math.PI * 2;
  return x;
};

/** The tide (Dusk, Midnight, Dawn) a wave belongs to. */
export const tideOf = (wave) => TIDES.find((t) => wave >= t.from && wave <= t.to) || TIDES[2];

export class World {
  constructor(seed = 1, persist = true) {
    this.persist = persist;
    this.meta = persist ? loadMeta() : freshMeta();
    this.reset(seed);
  }

  get best() {
    return this.meta.best;
  }

  /** Back to a fresh title screen with the same meta bank. */
  reset(seed = this.seed) {
    this.seed = seed;
    this.rng = new Rng(seed);
    this.fx = new Rng(seed * 7919 + 13);
    this.screen = SCREEN_TITLE;
    this.attract = true;
    this.time = 0;
    this.hp = START.hp;
    this.maxHp = START.hp;
    this.power = START.power;
    this.locked = false;
    this.focusing = false;
    this.wave = 1;
    this.tideF = 0;
    this.score = 0;
    this.combo = 0;
    this.maxCombo = 0;
    this.comboTimer = 0;
    this.kills = 0;
    this.pearls = 0;
    this.pearlsEarned = 0;
    this.bossesSlain = 0;
    this.bankGain = 0;
    this.newBest = false;
    this.beamId = this.meta.beam;
    this.up = { ...FRESH_LEVELS };
    this.relics = [];
    this.shop = { offers: [], rerolls: 0 };
    this.enemies = [];
    this.particles = [];
    this.bolts = [];
    this.floaters = [];
    this.orbs = [];
    this.rings = [];
    this.buoys = [];
    this.storm = null;
    this.cooldowns = { pulse: 0, buoy: 0, storm: 0 };
    this.cdFlash = { pulse: 0, buoy: 0, storm: 0 };
    this.events = [];
    this.spawnList = [];
    this.bossPending = null;
    this.bossT = 0;
    this.bossIntro = 0;
    this.spawnTimer = 0;
    this.spawnGap = 1;
    this.waveTotal = 0;
    this.bannerT = 0;
    this.wardUsed = false;
    this.boltTimer = 3;
    this.burnSoundTimer = 0;
    this.beamAngle = -Math.PI / 2;
    this.beamVel = 0;
    this.shake = 0;
    this.flash = 0;
    this.attractTimer = 0;
  }

  // Derived numbers, read from the upgrade levels and relics.
  hasRelic(id) {
    return this.relics.includes(id);
  }
  get beamHalf() {
    return this.focusing ? BEAM.focusHalf : BEAM.half * (1 + 0.22 * this.up.wide);
  }
  get beamRange() {
    return BEAM.range * (1 + 0.12 * this.up.bright) * (this.focusing ? BEAM.focusRangeMul : 1);
  }
  get maxPower() {
    return START.power + 25 * this.up.cell;
  }
  get comboMultiplier() {
    return Math.min(COMBO.max, 1 + Math.floor(this.combo / COMBO.step) * COMBO.perStep);
  }
  get enemiesLeft() {
    return this.enemies.length + this.spawnList.length + (this.bossPending ? 1 : 0);
  }
  get tide() {
    return tideOf(this.wave);
  }
  get boss() {
    return this.enemies.find((e) => e.type === 'kraken') || null;
  }
  /** Each ray of the beam: its offset from the aim, half-angle and strength. Prism makes three. */
  get beamArms() {
    const half = this.beamHalf;
    if (this.beamId === 'prism') {
      return this.focusing
        ? [{ off: 0, half, mul: 1 }, { off: -0.2, half, mul: 0.45 }, { off: 0.2, half, mul: 0.45 }]
        : [{ off: 0, half: half * 0.8, mul: 0.85 }, { off: -0.34 - half * 0.4, half: half * 0.55, mul: 0.55 }, { off: 0.34 + half * 0.4, half: half * 0.55, mul: 0.55 }];
    }
    return [{ off: 0, half, mul: this.beamId === 'ember' ? 0.7 : 1 }];
  }
  cooldownMax(id) {
    const spec = ABILITIES.find((a) => a.id === id);
    return spec.cd * Math.pow(0.88, this.up.haste) * (id === 'storm' && this.hasRelic('bottle') ? 0.75 : 1);
  }

  // ---- meta bank ----
  saveMeta() {
    if (this.persist) saveMeta(this.meta);
  }
  selectBeam(id) {
    if (!BEAMS[id] || !this.meta.unlocked[id]) return false;
    this.meta.beam = id;
    this.beamId = id;
    this.saveMeta();
    return true;
  }
  /** Spend sea glass from the bank on a new beam. */
  unlockBeam(id) {
    const spec = BEAMS[id];
    if (!spec || this.meta.unlocked[id] || this.meta.bank < spec.cost) return false;
    this.meta.bank -= spec.cost;
    this.meta.unlocked[id] = true;
    this.events.push('upgrade');
    return this.selectBeam(id);
  }

  /** Begin a new run from wave 1. */
  startRun() {
    this.reset(this.seed);
    this.screen = SCREEN_PLAY;
    this.attract = false;
    this.meta.runs += 1;
    this.startWave(1);
  }

  startWave(n) {
    this.wave = n;
    this.spawnList = waveRoster(n, this.rng);
    this.bossPending = BOSS_WAVES.includes(n) ? BOSSES[n] : null;
    this.bossT = 7;
    this.waveTotal = this.spawnList.length + (this.bossPending ? 1 : 0);
    this.spawnGap = (9 + n * 0.55) / Math.max(1, this.spawnList.length);
    this.spawnTimer = 0.2;
    this.bannerT = BANNER_SECONDS;
    this.wardUsed = false;
    this.events.push('wave');
  }

  heal(n) {
    this.hp = Math.min(this.maxHp, this.hp + n);
  }
  addMaxHp(n) {
    this.maxHp += n;
    this.heal(n);
  }

  // ---- shop ----
  openShop() {
    this.screen = SCREEN_SHOP;
    this.floaters = [];
    this.orbs = [];
    this.shop = { offers: pickOffers(this, this.rng), rerolls: 0 };
    this.events.push('clear');
  }
  get rerollCost() {
    return REROLL_COST + 4 * this.shop.rerolls;
  }
  get mendCost() {
    return MEND_COST;
  }
  /** Buy offer number `index` with pearls. */
  buy(index) {
    const offer = this.shop.offers[index];
    if (this.screen !== SCREEN_SHOP || !offer || offer.sold || this.pearls < offer.cost) return false;
    this.pearls -= offer.cost;
    offer.sold = true;
    applyItem(this, offer.item);
    this.events.push('upgrade');
    return true;
  }
  mend() {
    if (this.screen !== SCREEN_SHOP || this.pearls < MEND_COST || this.hp >= this.maxHp) return false;
    this.pearls -= MEND_COST;
    this.heal(5);
    this.events.push('upgrade');
    return true;
  }
  reroll() {
    if (this.screen !== SCREEN_SHOP || this.pearls < this.rerollCost) return false;
    this.pearls -= this.rerollCost;
    this.shop.rerolls += 1;
    const keep = this.shop.offers.filter((o) => o.sold);
    const fresh = pickOffers(this, this.rng, 3 - keep.length, keep.map((o) => o.item.id));
    this.shop.offers = [...this.shop.offers.filter((o) => o.sold), ...fresh];
    this.events.push('wave');
    return true;
  }
  /** Leave the shop and sail into the next wave. */
  nextWave() {
    if (this.screen !== SCREEN_SHOP) return;
    this.power = this.maxPower;
    this.screen = SCREEN_PLAY;
    this.startWave(this.wave + 1);
  }

  /** Advance the game by `dt` seconds. `input` is { aim, focus, cast: [ability ids], cursor: {x, y} }. */
  step(dt, input) {
    this.time += dt;
    this.shake = Math.max(0, this.shake - dt * 30);
    this.flash = Math.max(0, this.flash - dt * 2.5);
    if (this.screen === SCREEN_PLAY) this.stepPlay(dt, input, false);
    else if (this.screen === SCREEN_TITLE) this.stepAttract(dt);
    else this.stepIdle(dt, input);
    this.stepEffects(dt);
    const progress = this.screen === SCREEN_SHOP || this.screen === SCREEN_WIN ? 1 : this.waveTotal ? 1 - this.enemiesLeft / this.waveTotal : 0;
    const target = this.screen === SCREEN_TITLE ? 0 : this.wave - 1 + Math.max(0, Math.min(1, progress));
    this.tideF += (target - this.tideF) * Math.min(1, dt * 1.5);
  }

  /** Title screen: a tame demonstration where the tower cannot be hurt. */
  stepAttract(dt) {
    this.attractTimer -= dt;
    if (this.attractTimer <= 0) {
      this.attractTimer = 1.6;
      const type = this.rng.pick(['crab', 'crab', 'eel', 'ghost', 'jelly', 'crab']);
      const p = spawnPoint(type, this.rng);
      this.enemies.push(makeEnemy(type, p.x, p.y, 3, this.rng));
    }
    let target = null;
    let best = Infinity;
    for (const e of this.enemies) {
      const d = Math.hypot(e.x - BASE.x, e.y - BASE.y);
      if (d < best) {
        best = d;
        target = e;
      }
    }
    const aim = target ? Math.atan2(target.y - LAMP.y, target.x - LAMP.x) : -Math.PI / 2 + Math.sin(this.time * 0.6) * 0.9;
    this.stepPlay(dt, { aim, focus: false, cast: [] }, true);
  }

  /** Shop, game over and victory screens: the beam still follows the aim, but nothing attacks. */
  stepIdle(dt, input) {
    this.turnBeam(dt, input.aim);
    this.power = Math.min(this.maxPower, this.power + BEAM.regen * dt);
    this.focusing = false;
    for (const e of this.enemies) {
      moveEnemy(e, dt, 1, { onMe: false, focusing: false, side: 1, angle: 0 });
      e.lit *= 0.9;
    }
  }

  turnBeam(dt, target) {
    const diff = wrap(target - this.beamAngle);
    this.beamVel += (diff * BEAM.turnK - this.beamVel * BEAM.turnD) * dt;
    this.beamVel = Math.max(-BEAM.maxTurn, Math.min(BEAM.maxTurn, this.beamVel));
    this.beamAngle = wrap(this.beamAngle + this.beamVel * dt);
  }

  /** Damage `amount` to creature `e`. `pierce` ignores shields; `focused` is the laser. Returns damage dealt. */
  hurt(e, amount, { pierce = false, focused = false, burn = false } = {}) {
    let amt = amount;
    if (e.type === 'kraken') {
      if (e.exposed > 0) amt *= 1.3;
      else {
        e.shield -= amt;
        e.shieldGlow = 0.15;
        if (e.shield <= 0) {
          e.shield = 0;
          e.exposed = 6.5;
          this.shake = Math.max(this.shake, 14);
          this.spark(e.x, e.y, 40, '190,160,255', 300, 0.8);
          this.floaters.push({ x: e.x, y: e.y - e.r - 20, text: 'SHIELD BROKEN', life: 1.6, size: 30, color: '#d9c2ff' });
          this.events.push('shatter');
        }
        e.acc += amt;
        return amt;
      }
    } else if (e.shielded && !focused && !pierce) {
      amt *= this.hasRelic('heart') ? 0.5 : BEAM.shieldLeak;
      e.shieldGlow = 0.15;
    }
    e.hp -= amt;
    e.flash = 0.1;
    e.acc += amt;
    e.accBurn = burn;
    return amt;
  }

  stepPlay(dt, input, attract) {
    this.attract = attract;
    this.turnBeam(dt, input.aim);
    this.updatePower(dt, input.focus);
    if (!attract) {
      this.updateAbilities(dt, input);
    }
    this.spawnCreatures(dt, attract);

    const chillSlow = Math.pow(0.91, this.up.slow);
    const arms = this.beamArms;
    const range = this.beamRange;
    const ember = this.beamId === 'ember';
    let burned = false;

    for (let i = this.enemies.length - 1; i >= 0; i -= 1) {
      const e = this.enemies[i];
      const dx = e.x - LAMP.x;
      const dy = e.y - LAMP.y;
      const dist = Math.hypot(dx, dy);
      const dir = Math.atan2(dy, dx);
      let mul = 0;
      let watched = false;
      for (const arm of arms) {
        const offset = wrap(dir - (this.beamAngle + arm.off));
        const reach = arm.half + e.r / Math.max(dist, 40);
        if (dist < range + e.r && Math.abs(offset) < reach) mul = Math.max(mul, arm.mul);
        if (dist < range && Math.abs(offset) < arm.half + 0.12) watched = true;
      }
      const inBeam = mul > 0;
      const side = wrap(dir - this.beamAngle);
      e.chill = Math.max(0, (e.chill || 0) - dt);
      moveEnemy(e, dt, chillSlow * (e.chill > 0 ? 0.55 : 1), { onMe: watched, focusing: this.focusing, side, angle: this.beamAngle });
      e.lit += ((inBeam || e.burn > 0 ? 1 : 0) - e.lit) * Math.min(1, dt * 12);
      this.stepSpecials(e, dt, attract);

      if (inBeam) {
        const dmg = this.focusing
          ? BEAM.focusDps * (1 + 0.3 * this.up.focus)
          : BEAM.dps * (1 + 0.15 * this.up.bright) * (1 - 0.45 * Math.min(1, dist / range));
        this.hurt(e, dmg * mul * dt, { focused: this.focusing });
        if (ember) e.burn = Math.max(e.burn, 3.2);
        burned = true;
        if (this.fx.chance(this.focusing ? 0.7 : 0.25)) this.spark(e.x, e.y, 1, this.focusing ? '180,240,255' : ember ? '255,150,70' : '255,200,110', 120, 0.45);
      }
      if (e.burn > 0) {
        e.burn -= dt;
        this.hurt(e, (9 + 1.5 * this.up.bright) * dt, { burn: true });
        if (this.fx.chance(0.35)) this.spark(e.x + this.fx.range(-e.r, e.r) * 0.6, e.y - this.fx.range(0, e.r), 1, '255,120,50', 70, 0.6);
      }
      e.accT -= dt;
      if (e.accT <= 0 && e.acc >= 3 && !attract) this.emitDamage(e);
      if (e.hp <= 0) {
        this.kill(e, i, attract);
        continue;
      }
      if (Math.hypot(e.x - BASE.x, e.y - BASE.y) < TOWER_HIT_RADIUS + e.r * 0.4 && e.type !== 'kraken') {
        this.enemies.splice(i, 1);
        this.hitTower(TYPES[e.type].damage, e.x < BASE.x ? -1 : 1, attract);
      }
    }

    this.burnSoundTimer -= dt;
    if (burned && this.burnSoundTimer <= 0) {
      this.burnSoundTimer = this.focusing ? 0.09 : 0.2;
      this.events.push(this.focusing ? 'laser' : 'burn');
    }

    this.updateCombo(dt);
    this.updateLightning(dt, attract);
    if (!attract) this.checkWaveEnd();
  }

  emitDamage(e) {
    const n = Math.round(e.acc);
    e.acc = 0;
    e.accT = 0.38;
    if (this.floaters.length > 70) return;
    this.floaters.push({
      x: e.x + this.fx.range(-10, 10),
      y: e.y - e.r - 6,
      text: String(n),
      life: 0.7,
      size: n >= 60 ? 26 : n >= 15 ? 20 : 16,
      color: e.accBurn ? '#ff9a4a' : n >= 60 ? '#fff3a6' : '#ffffff',
      dmg: true,
    });
  }

  /** What a creature does besides walking: gunboats fire, the Kraken Queen shields, summons and slams. */
  stepSpecials(e, dt, attract) {
    if (attract) return;
    const dist = Math.hypot(e.x - BASE.x, e.y - BASE.y);
    if (e.type === 'gunboat' && dist <= 370) {
      e.cd -= dt;
      if (e.cd <= 0) {
        e.cd = 3.6;
        this.spawnEnemy('shell', e.x + (e.x < BASE.x ? 24 : -24), e.y - 14);
        this.events.push('cannon');
        this.spark(e.x, e.y - 14, 8, '255,200,120', 120, 0.4);
      }
    } else if (e.type === 'kraken') {
      if (e.exposed > 0) {
        e.exposed -= dt;
        if (e.exposed <= 0) e.shield = e.shieldMax * 0.7;
      }
      if (!e.enraged && e.hp < e.maxHp * 0.4) {
        e.enraged = true;
        this.floaters.push({ x: e.x, y: e.y - e.r - 30, text: 'ENRAGED', life: 1.8, size: 34, color: '#ff8f84' });
        this.events.push('boom');
      }
      e.cd -= dt;
      if (e.cd <= 0) {
        e.cd = e.boss.summonEvery * (e.enraged ? 0.65 : 1);
        for (let k = 0; k < e.boss.summonCount; k += 1) {
          const child = this.spawnEnemy(e.boss.summon, e.x + this.fx.range(-50, 50), e.y + this.fx.range(10, 50));
          child.push = { x: this.fx.range(-60, 60), y: 40 };
        }
        this.spark(e.x, e.y, 20, '200,150,255', 180, 0.7);
        this.events.push('summon');
      }
      if (e.boss.volley) {
        e.vol = (e.vol === undefined ? 5 : e.vol) - dt;
        if (e.vol <= 0) {
          e.vol = e.enraged ? 6 : 9;
          for (let k = -1; k <= 1; k += 1) this.spawnEnemy('shell', e.x + k * 40, e.y + 20);
          this.events.push('cannon');
        }
      }
      if (dist < 230) {
        e.slam -= dt;
        if (e.slam <= 0) {
          e.slam = e.enraged ? 2.2 : 3.2;
          this.hitTower(e.exposed > 0 ? 2 : 3, e.x < BASE.x ? -1 : 1, false);
        }
      }
    }
  }

  spawnEnemy(type, x, y) {
    const e = makeEnemy(type, x, y, this.wave, this.rng);
    this.enemies.push(e);
    return e;
  }

  updatePower(dt, wantFocus) {
    this.focusing = false;
    if (this.locked && this.power >= BEAM.unlockAt) this.locked = false;
    if (wantFocus && !this.locked && this.power > 0) {
      this.focusing = true;
      this.power -= BEAM.focusDrain * (1 - 0.1 * this.up.focus) * (this.hasRelic('hourglass') ? 0.65 : 1) * dt;
      if (this.power <= 0) {
        this.power = 0;
        this.locked = true;
        this.focusing = false;
        this.events.push('dry');
      }
    } else {
      this.power = Math.min(this.maxPower, this.power + (BEAM.regen + 3 * this.up.cell) * dt);
    }
  }

  // ---- abilities: Q Pulse Nova, E Lantern Buoy, R Storm Call ----
  updateAbilities(dt, input) {
    for (const spec of ABILITIES) {
      const id = spec.id;
      if (this.cooldowns[id] > 0) {
        this.cooldowns[id] = Math.max(0, this.cooldowns[id] - dt);
        if (this.cooldowns[id] === 0) this.cdFlash[id] = 1;
      }
      this.cdFlash[id] = Math.max(0, this.cdFlash[id] - dt * 2.5);
    }
    for (const id of input.cast || []) this.cast(id, input.cursor);

    const might = 1 + 0.12 * this.up.might;
    const dmgMul = 1 + 0.2 * this.up.might;
    for (let i = this.rings.length - 1; i >= 0; i -= 1) {
      const ring = this.rings[i];
      ring.t += dt;
      const r = ring.max * Math.min(1, ring.t / 0.5);
      for (const e of this.enemies) {
        if (ring.hit.has(e.id)) continue;
        if (Math.hypot(e.x - PULSE_CENTER.x, e.y - PULSE_CENTER.y) <= r + e.r) {
          ring.hit.add(e.id);
          this.hurt(e, 45 * dmgMul, { pierce: true });
          e.stun = 0.9;
          const a = Math.atan2(e.y - PULSE_CENTER.y, e.x - PULSE_CENTER.x);
          const kick = e.type === 'kraken' ? 60 : e.type === 'leviathan' ? 140 : 320;
          e.push = { x: Math.cos(a) * kick, y: Math.sin(a) * kick * 0.6 };
          e.flash = 0.2;
          this.spark(e.x, e.y, 6, '255,235,170', 180, 0.5);
        }
      }
      if (ring.t > 0.9) this.rings.splice(i, 1);
    }
    for (let i = this.buoys.length - 1; i >= 0; i -= 1) {
      const b = this.buoys[i];
      b.life -= dt;
      const radius = 125 * might;
      for (const e of this.enemies) {
        if (Math.hypot(e.x - b.x, e.y - b.y) < radius + e.r * 0.6) {
          this.hurt(e, 32 * dmgMul * dt, { pierce: e.type !== 'kraken' });
          e.chill = 0.25;
          e.lit = Math.max(e.lit, 0.8);
        }
      }
      if (this.fx.chance(0.3)) this.spark(b.x + this.fx.range(-radius, radius) * 0.7, b.y + this.fx.range(-20, 20), 1, '255,210,120', 40, 0.9);
      if (b.life <= 0) this.buoys.splice(i, 1);
    }
    if (this.storm) {
      this.storm.timer -= dt;
      if (this.storm.timer <= 0 && this.storm.left > 0) {
        this.storm.timer = 0.16;
        this.storm.left -= 1;
        const pool = this.enemies.filter((e) => e.hp > 0);
        if (pool.length) {
          const e = pool[Math.floor(this.fx.next() * Math.min(pool.length, 10 + this.storm.left))] || pool[0];
          this.strike(e, 80);
        }
      }
      if (this.storm.left <= 0) this.storm = null;
    }
  }

  cast(id, cursor) {
    if (this.cooldowns[id] > 0) return false;
    if (id === 'pulse') {
      this.rings.push({ t: 0, max: 330 * (1 + 0.12 * this.up.might), hit: new Set() });
      this.events.push('pulse');
      this.shake = Math.max(this.shake, 6);
    } else if (id === 'buoy') {
      const c = cursor || { x: BASE.x, y: 480 };
      this.buoys.push({ x: Math.max(60, Math.min(1220, c.x)), y: Math.max(380, Math.min(740, c.y)), life: 7, max: 7, radius: 125 * (1 + 0.12 * this.up.might) });
      if (this.buoys.length > 3) this.buoys.shift();
      this.events.push('buoy');
    } else if (id === 'storm') {
      this.storm = { left: 7 + (this.hasRelic('bottle') ? 5 : 0), timer: 0 };
      this.events.push('zap');
    } else return false;
    this.cooldowns[id] = this.cooldownMax(id);
    return true;
  }

  strike(e, damage) {
    this.hurt(e, damage, { pierce: true });
    e.flash = 0.25;
    this.bolts.push({ x: e.x, y: e.y, life: 0.3, seed: this.fx.next(), top: true });
    this.spark(e.x, e.y, 10, '200,220,255', 200, 0.5);
    if (e.hp <= 0) {
      const index = this.enemies.indexOf(e);
      if (index >= 0) this.kill(e, index, false);
    }
  }

  spawnCreatures(dt, attract) {
    if (attract) return;
    if (this.bannerT > 0) {
      this.bannerT -= dt;
      return;
    }
    if (this.bossIntro > 0) this.bossIntro -= dt;
    if (this.bossPending) {
      this.bossT -= dt;
      if (this.bossT <= 0) {
        const boss = this.bossPending;
        this.bossPending = null;
        const p = spawnPoint('kraken', this.rng);
        this.spawnEnemy('kraken', p.x, p.y);
        this.bossIntro = 3.2;
        this.bossTitle = boss;
        this.events.push('boss');
      }
    }
    if (this.spawnList.length === 0) return;
    this.spawnTimer -= dt;
    if (this.spawnTimer > 0) return;
    const type = this.spawnList.pop();
    const p = spawnPoint(type, this.rng);
    this.spawnEnemy(type, p.x, p.y);
    this.spawnTimer = this.spawnGap * this.rng.range(0.6, 1.4);
  }

  kill(e, index, attract) {
    this.enemies.splice(index, 1);
    const color = e.type === 'ghost' ? '170,255,210' : e.type === 'eel' ? '110,240,230' : e.type === 'leviathan' || e.type === 'kraken' ? '200,150,255' : e.type === 'jelly' ? '255,170,230' : '255,150,100';
    const big = e.type === 'leviathan' || e.type === 'kraken';
    this.spark(e.x, e.y, e.type === 'kraken' ? 140 : big ? 60 : e.type === 'sprat' || e.type === 'shell' ? 8 : 18, color, e.type === 'kraken' ? 420 : 220, e.type === 'kraken' ? 1.6 : 0.9);
    if (big) this.shake = Math.max(this.shake, e.type === 'kraken' ? 24 : 10);
    if (e.type === 'jelly') {
      for (let k = 0; k < 3; k += 1) {
        const child = this.spawnEnemy('sprat', e.x + this.fx.range(-10, 10), e.y + this.fx.range(-10, 10));
        const a = (k / 3) * 6.283 + this.fx.range(0, 1);
        child.push = { x: Math.cos(a) * 140, y: Math.sin(a) * 90 };
      }
    }
    if (attract) return;
    this.kills += 1;
    this.combo += 1;
    this.maxCombo = Math.max(this.maxCombo, this.combo);
    this.comboTimer = COMBO.window + (this.hasRelic('gull') ? 2 : 0);
    const points = Math.round(TYPES[e.type].score * this.comboMultiplier * (this.hasRelic('crown') ? 1.3 : 1));
    this.score += points;
    this.floaters.push({ x: e.x, y: e.y - e.r - 24, text: `+${points}`, life: 1.1, size: big ? 32 : 19, color: '#ffe08a' });
    const drop = TYPES[e.type].pearls * (this.hasRelic('net') ? 1.35 : 1);
    const pearls = Math.floor(drop + this.rng.next());
    if (pearls > 0) this.gainPearls(pearls, e.x, e.y);
    if (e.type === 'kraken') {
      this.bossesSlain += 1;
      this.events.push('boom');
      for (let k = 0; k < 10; k += 1) this.orbs.push({ x: e.x + this.fx.range(-60, 60), y: e.y + this.fx.range(-40, 40), t: -k * 0.05, life: 0.9 });
    } else this.events.push(big ? 'boom' : 'kill');
    if (this.hasRelic('bell')) for (const id of Object.keys(this.cooldowns)) this.cooldowns[id] = Math.max(0, this.cooldowns[id] - 0.35);
  }

  gainPearls(n, x, y) {
    this.pearls += n;
    this.pearlsEarned += n;
    this.floaters.push({ x: x + 14, y: y - 8, text: `+${n}`, life: 0.9, size: 17, color: '#9ff4ff', pearl: true });
    const orbs = Math.min(n, 4);
    for (let k = 0; k < orbs; k += 1) this.orbs.push({ x: x + this.fx.range(-8, 8), y: y + this.fx.range(-8, 8), t: -k * 0.06, life: 0.8 });
  }

  /** The tower takes `damage`. Barnacle Ward blocks the first hit each wave. */
  hitTower(damage, side, attract) {
    this.spark(BASE.x + side * 30, BASE.y - 20, 20, '255,90,70', 260, 0.8);
    if (attract) return;
    if (this.hasRelic('ward') && !this.wardUsed) {
      this.wardUsed = true;
      this.floaters.push({ x: BASE.x, y: BASE.y - 150, text: 'WARD BLOCKS', life: 1.4, size: 26, color: '#b6f0ff' });
      this.events.push('clear');
      return;
    }
    this.hp -= damage;
    this.combo = 0;
    this.comboTimer = 0;
    this.shake = 18;
    this.flash = 1;
    this.events.push('hurt');
    if (this.hp <= 0) {
      this.hp = 0;
      this.finish(SCREEN_OVER);
    }
  }

  updateCombo(dt) {
    if (this.comboTimer > 0) {
      this.comboTimer -= dt;
      if (this.comboTimer <= 0) this.combo = 0;
    }
  }

  /** Storm Coil: now and then, lightning strikes the creatures nearest the tower. */
  updateLightning(dt, attract) {
    if (this.up.bolts === 0 || attract) return;
    this.boltTimer -= dt;
    if (this.boltTimer > 0 || this.enemies.length === 0) return;
    this.boltTimer = Math.max(1.8, 5.5 - 0.7 * this.up.bolts);
    const near = this.enemies
      .slice()
      .sort((a, b) => Math.hypot(a.x - BASE.x, a.y - BASE.y) - Math.hypot(b.x - BASE.x, b.y - BASE.y))
      .slice(0, 2 + this.up.bolts);
    this.events.push('zap');
    for (const e of near) {
      this.hurt(e, 40 + 8 * this.up.bolts, { pierce: true });
      e.flash = 0.2;
      this.bolts.push({ x: e.x, y: e.y, life: 0.28, seed: this.fx.next() });
      this.spark(e.x, e.y, 10, '200,220,255', 200, 0.5);
    }
    for (let i = this.enemies.length - 1; i >= 0; i -= 1) {
      if (this.enemies[i].hp <= 0) this.kill(this.enemies[i], i, false);
    }
  }

  checkWaveEnd() {
    if (this.bannerT > 0 || this.enemiesLeft > 0) return;
    this.score += Math.round(100 * this.wave * (this.hasRelic('crown') ? 1.3 : 1));
    const bonus = 5 + Math.round(1.5 * this.wave);
    this.pearls += bonus;
    this.pearlsEarned += bonus;
    this.rings = [];
    this.buoys = [];
    this.storm = null;
    if (this.wave >= TOTAL_WAVES) {
      this.score += this.hp * 50;
      this.finish(SCREEN_WIN);
      return;
    }
    this.waveBonus = bonus;
    this.openShop();
  }

  finish(screen) {
    this.screen = screen;
    this.floaters = [];
    this.enemies = screen === SCREEN_WIN ? [] : this.enemies;
    if (this.score > this.meta.best) {
      this.meta.best = this.score;
      this.newBest = true;
    }
    this.bankGain = Math.floor(this.score / 400 + this.pearlsEarned / 6) + (screen === SCREEN_WIN ? 60 : 0);
    this.meta.bank += this.bankGain;
    if (screen === SCREEN_WIN) this.meta.wins += 1;
    this.saveMeta();
    this.events.push(screen === SCREEN_WIN ? 'win' : 'over');
  }

  spark(x, y, count, color, speed, life) {
    for (let i = 0; i < count; i += 1) {
      if (this.particles.length >= MAX_PARTICLES) this.particles.shift();
      const a = this.fx.range(0, 6.283);
      const s = this.fx.range(0.2, 1) * speed;
      this.particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 30, life: life * this.fx.range(0.6, 1), max: life, size: this.fx.range(1.5, 3.6), color });
    }
  }

  stepEffects(dt) {
    for (let i = this.particles.length - 1; i >= 0; i -= 1) {
      const p = this.particles[i];
      p.life -= dt;
      p.vy += 160 * dt;
      p.vx *= 1 - dt * 1.5;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      if (p.life <= 0) this.particles.splice(i, 1);
    }
    for (let i = this.bolts.length - 1; i >= 0; i -= 1) {
      this.bolts[i].life -= dt;
      if (this.bolts[i].life <= 0) this.bolts.splice(i, 1);
    }
    for (let i = this.floaters.length - 1; i >= 0; i -= 1) {
      const f = this.floaters[i];
      f.life -= dt * 0.9;
      f.y -= (f.dmg ? 46 : 32) * dt;
      if (f.life <= 0) this.floaters.splice(i, 1);
    }
    for (let i = this.orbs.length - 1; i >= 0; i -= 1) {
      const o = this.orbs[i];
      o.t += dt;
      if (o.t >= o.life) this.orbs.splice(i, 1);
    }
  }
}

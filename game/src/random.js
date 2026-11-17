// A small seeded random source (mulberry32), so the same seed always plays out the same way.
export class Rng {
  constructor(seed = 1) {
    this.state = (seed >>> 0) || 1;
  }

  /** A number in [0, 1). */
  next() {
    this.state = (this.state + 0x6d2b79f5) >>> 0;
    let t = this.state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  range(low, high) {
    return low + (high - low) * this.next();
  }

  int(low, high) {
    return Math.floor(this.range(low, high + 1));
  }

  chance(p) {
    return this.next() < p;
  }

  pick(list) {
    return list[Math.floor(this.next() * list.length)];
  }

  /** The list, shuffled in place. */
  shuffle(list) {
    for (let i = list.length - 1; i > 0; i -= 1) {
      const j = Math.floor(this.next() * (i + 1));
      [list[i], list[j]] = [list[j], list[i]];
    }
    return list;
  }
}

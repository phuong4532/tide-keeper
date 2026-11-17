// Keyboard and mouse state turned into the two things the world wants each step: where to aim and
// whether to focus, plus any ability the keeper cast (Q, E, R). The mouse sets the aim; A/D and the arrows nudge it from wherever it is.
import { LAMP } from './config.js';

const NUDGE_SPEED = 2.2; // radians per second

export class Input {
  constructor() {
    this.aim = -Math.PI / 2;
    this.keys = new Set();
    this.mouseDown = false;
    this.cursor = { x: LAMP.x, y: 480 };
    this.pending = [];
  }

  /** Queue an ability cast (Q, E or R) for the next step. */
  cast(id) {
    if (this.pending.length < 4) this.pending.push(id);
  }

  /** The mouse is at (x, y) in game coordinates. */
  pointAt(x, y) {
    this.aim = Math.atan2(y - LAMP.y, x - LAMP.x);
    this.cursor = { x, y };
  }

  keyDown(code) {
    this.keys.add(code);
  }

  keyUp(code) {
    this.keys.delete(code);
  }

  /** What the world should do for the next `dt` seconds. */
  read(dt) {
    const left = this.keys.has('KeyA') || this.keys.has('ArrowLeft');
    const right = this.keys.has('KeyD') || this.keys.has('ArrowRight');
    this.aim += ((right ? 1 : 0) - (left ? 1 : 0)) * NUDGE_SPEED * dt;
    const cast = this.pending;
    this.pending = [];
    return { aim: this.aim, focus: this.mouseDown || this.keys.has('Space'), cast, cursor: this.cursor };
  }

  clear() {
    this.keys.clear();
    this.mouseDown = false;
    this.pending = [];
  }
}

// Headless balance check: plays whole runs with bots of different skill and prints how they fare.
//   node tools/simulate.mjs [runsPerCell]
import { Autopilot } from '../game/src/autopilot.js';
import { simulate } from '../game/src/autopilot.js';
import { World, SCREEN_WIN } from '../game/src/world.js';

const runs = Number(process.argv[2]) || 20;
const skills = ['expert', 'good', 'casual'];
const beams = ['sun', 'prism', 'ember'];
for (const skill of skills) {
  for (const beam of beams) {
    let wins = 0;
    let waves = 0;
    let secs = 0;
    for (let seed = 1; seed <= runs; seed += 1) {
      const world = new World(seed, false);
      world.meta.unlocked = { sun: true, prism: true, ember: true };
      world.meta.beam = beam;
      world.startRun();
      const bot = new Autopilot(skill, seed);
      simulate(world, bot, 1800);
      if (world.screen === SCREEN_WIN) wins += 1;
      waves += world.wave;
      secs += world.time;
    }
    console.log(`${skill.padEnd(7)} ${beam.padEnd(6)} wins ${String(wins).padStart(2)}/${runs}  avg wave ${(waves / runs).toFixed(1)}  avg time ${(secs / runs).toFixed(0)}s`);
  }
}

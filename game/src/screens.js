// Full-screen overlays for the end of a run (defeat and victory with their stats) and for pause.
import { BEAMS, BEAM_ORDER, H, TOTAL_WAVES, W } from './config.js';
import { relicChip } from './hud.js';
import { drawIcon } from './icons.js';
import { outlined, panel, roundRect, SERIF, text } from './ui.js';
import { tideOf } from './world.js';

function dim(ctx, alpha, tint = '3,6,22') {
  ctx.fillStyle = `rgba(${tint},${alpha})`;
  ctx.fillRect(0, 0, W, H);
}

const pulse = (t, speed = 3) => 0.65 + 0.35 * Math.sin(t * speed);

function stat(ctx, label, value, x, y, color = '#ffffff') {
  text(ctx, label, x, y, 15, '#9fc4ff', 'left', 800);
  text(ctx, String(value), x + 250, y + 2, 24, color, 'right', 900);
}

function drawResult(ctx, world, t, config) {
  dim(ctx, config.dim, config.tint);
  if (config.dawn) {
    const glow = ctx.createRadialGradient(W / 2, 300, 20, W / 2, 300, 640);
    glow.addColorStop(0, 'rgba(255,196,120,0.8)');
    glow.addColorStop(1, 'rgba(255,150,80,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, W, H);
  }
  ctx.save();
  ctx.shadowColor = config.glow;
  ctx.shadowBlur = 44;
  text(ctx, config.title, W / 2, 136, 96, config.color, 'center', 900, SERIF);
  ctx.restore();
  text(ctx, config.subtitle, W / 2, 180, 24, '#e6eeff', 'center', 600);

  // Results card.
  const x = W / 2 - 400;
  const y = 214;
  panel(ctx, x, y, 800, 376, 0.8, config.edge);
  text(ctx, 'FINAL SCORE', x + 40, y + 42, 17, '#9fc4ff', 'left', 800);
  text(ctx, world.score.toLocaleString('en-US'), x + 40, y + 112, 76, '#ffffff', 'left', 900);
  if (world.newBest) {
    roundRect(ctx, x + 40, y + 128, 150, 30, 15);
    ctx.fillStyle = '#ffd35a';
    ctx.fill();
    text(ctx, 'NEW BEST!', x + 115, y + 149, 16, '#2a1c08', 'center', 900);
  } else text(ctx, `Best ${world.best.toLocaleString('en-US')}`, x + 40, y + 150, 18, '#9fc4ff', 'left', 700);

  const tide = tideOf(world.wave);
  stat(ctx, 'Tide', `${tide.name}`, x + 40, y + 198);
  stat(ctx, 'Wave reached', `${world.wave} / ${TOTAL_WAVES}`, x + 40, y + 232);
  stat(ctx, 'Creatures burned', world.kills, x + 40, y + 266);
  stat(ctx, 'Best chain', `${world.maxCombo} kills`, x + 40, y + 300);
  stat(ctx, 'Lamp', BEAMS[world.beamId].name, x + 40, y + 334);

  const x2 = x + 430;
  stat(ctx, 'Pearls earned', world.pearlsEarned, x2, y + 60, '#9ff4ff');
  stat(ctx, 'Kraken Queens slain', `${world.bossesSlain} / 2`, x2, y + 94, world.bossesSlain > 0 ? '#ff9ac8' : '#ffffff');
  stat(ctx, 'Hull left', `${world.hp} / ${world.maxHp}`, x2, y + 128);
  text(ctx, 'RELICS', x2, y + 172, 15, '#9fc4ff', 'left', 800);
  if (world.relics.length === 0) text(ctx, 'none this run', x2 + 80, y + 172, 15, 'rgba(200,220,255,0.55)', 'left', 600);
  world.relics.forEach((id, i) => relicChip(ctx, id, x2 + (i % 7) * 48, y + 184 + Math.floor(i / 7) * 48, 42));
  // The meta bank.
  roundRect(ctx, x2, y + 290, 340, 66, 14);
  ctx.fillStyle = 'rgba(40,110,140,0.45)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(150,240,255,0.5)';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  drawIcon(ctx, 'pearl', x2 + 28, y + 323, 28, '#bff6ff');
  text(ctx, `+${world.bankGain} sea glass banked`, x2 + 52, y + 319, 20, '#9ff4ff', 'left', 900);
  const next = BEAM_ORDER.map((id) => BEAMS[id]).find((b) => !world.meta.unlocked[b.id]);
  text(ctx, next ? `Bank ${world.meta.bank}  |  ${next.name} costs ${next.cost}` : `Bank ${world.meta.bank}  |  every lamp unlocked`, x2 + 52, y + 344, 14, '#cfe0ff', 'left', 700);

  ctx.save();
  ctx.globalAlpha = 0.55 + 0.45 * pulse(t, 3);
  outlined(ctx, config.prompt, W / 2, 650, 34, '#ffffff', 'center', 900);
  ctx.restore();
  text(ctx, 'ENTER plays again   |   T returns to the title and the lamp picker   |   M sound', W / 2, 690, 17, '#b9d0ff', 'center', 600);
}

export function drawOver(ctx, world, t) {
  drawResult(ctx, world, t, {
    tint: '24,4,10',
    dim: 0.7,
    glow: 'rgba(255,70,70,0.8)',
    edge: 'rgba(255,120,120,0.45)',
    color: '#ff8f84',
    title: 'THE LIGHT GOES OUT',
    subtitle: `The tide swallows the tower in the ${tideOf(world.wave).name} tide. The keeper will be back.`,
    prompt: 'PRESS ENTER TO RELIGHT THE LAMP',
  });
}

export function drawWin(ctx, world, t) {
  drawResult(ctx, world, t, {
    tint: '60,36,20',
    dim: 0.45,
    dawn: true,
    glow: 'rgba(255,215,120,0.9)',
    edge: 'rgba(255,220,140,0.55)',
    color: '#ffe3a0',
    title: 'DAWN BREAKS',
    subtitle: `Twelve waves turned back. The lighthouse stands with ${world.hp} hull to spare.`,
    prompt: 'PRESS ENTER TO KEEP THE LIGHT AGAIN',
  });
}

export function drawPause(ctx) {
  dim(ctx, 0.6);
  outlined(ctx, 'PAUSED', W / 2, H / 2 - 10, 90, '#ffe7a6', 'center', 900, SERIF);
  text(ctx, 'P or click to continue   |   X abandons the run', W / 2, H / 2 + 36, 24, '#cfe0ff', 'center', 600);
}

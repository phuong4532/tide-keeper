// The title screen: logo, tagline, the lamp picker (the meta bank unlocks Prism and Ember), the rules,
// the creatures that wait in the deep, and the click-to-begin button.
import { BEAMS, BEAM_ORDER, TOTAL_WAVES, W } from './config.js';
import { drawEnemyIcon } from './creatures.js';
import { TYPES } from './enemies.js';
import { drawIcon } from './icons.js';
import { outlined, panel, roundRect, SERIF, text, wrapText } from './ui.js';

const CARD = { x: 36, y: 212, w: 372, h: 118, gap: 12 };
const BEGIN = { x: W / 2 - 200, y: 728, w: 400, h: 56 };

export function beamCardRect(i) {
  return { x: CARD.x, y: CARD.y + i * (CARD.h + CARD.gap), w: CARD.w, h: CARD.h };
}

const inside = (r, x, y) => x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;

/** What a click on the title screen lands on: a lamp card or the begin button. */
export function titleHit(x, y) {
  for (let i = 0; i < BEAM_ORDER.length; i += 1) if (inside(beamCardRect(i), x, y)) return { beam: BEAM_ORDER[i] };
  if (inside(BEGIN, x, y)) return { begin: true };
  return null;
}

function drawBeamCard(ctx, world, id, i, ui, t) {
  const spec = BEAMS[id];
  const r = beamCardRect(i);
  const unlocked = world.meta.unlocked[id];
  const selected = world.beamId === id;
  const afford = world.meta.bank >= spec.cost;
  const hover = ui.mouse.x > r.x && ui.mouse.x < r.x + r.w && ui.mouse.y > r.y && ui.mouse.y < r.y + r.h;
  const color = `rgb(${spec.rgb})`;
  roundRect(ctx, r.x, r.y, r.w, r.h, 16);
  const g = ctx.createLinearGradient(r.x, 0, r.x + r.w, 0);
  g.addColorStop(0, selected ? `rgba(${spec.rgb},0.28)` : 'rgba(14,22,56,0.88)');
  g.addColorStop(1, 'rgba(8,12,34,0.9)');
  ctx.fillStyle = g;
  ctx.fill();
  ctx.strokeStyle = selected ? color : hover ? 'rgba(255,255,255,0.7)' : 'rgba(150,190,255,0.35)';
  ctx.lineWidth = selected ? 3.5 : 2;
  ctx.stroke();
  // Medallion with the lamp's icon and a little beam.
  const mx = r.x + 56;
  const my = r.y + r.h / 2;
  const glow = ctx.createRadialGradient(mx, my, 4, mx, my, 44);
  glow.addColorStop(0, `rgba(${spec.rgb},${unlocked ? 0.55 : 0.12})`);
  glow.addColorStop(1, `rgba(${spec.rgb},0)`);
  ctx.fillStyle = glow;
  ctx.fillRect(mx - 44, my - 44, 88, 88);
  drawIcon(ctx, id === 'sun' ? 'sunbeam' : id, mx, my, 46, unlocked ? color : 'rgba(150,160,190,0.6)');
  text(ctx, `${i + 1}`, r.x + r.w - 20, r.y + 30, 18, 'rgba(200,220,255,0.55)', 'right', 900);
  text(ctx, spec.name.toUpperCase(), r.x + 100, r.y + 38, 24, unlocked ? '#ffffff' : '#b9c4e0', 'left', 900);
  text(ctx, spec.blurb, r.x + 100, r.y + 62, 16, '#cfe0ff', 'left', 700);
  text(ctx, spec.detail, r.x + 100, r.y + 82, 13, 'rgba(190,208,240,0.8)', 'left', 600);
  if (unlocked) {
    text(ctx, selected ? 'SELECTED' : 'CLICK TO SELECT', r.x + 100, r.y + 105, 13, selected ? color : 'rgba(180,200,240,0.7)', 'left', 900);
  } else {
    const frac = Math.min(1, world.meta.bank / spec.cost);
    roundRect(ctx, r.x + 100, r.y + 94, 150, 10, 5);
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fill();
    roundRect(ctx, r.x + 100, r.y + 94, 150 * frac, 10, 5);
    ctx.fillStyle = afford ? '#9ff4ff' : '#6e8fc0';
    ctx.fill();
    text(ctx, afford ? `CLICK TO UNLOCK  ${spec.cost}` : `LOCKED  ${world.meta.bank} / ${spec.cost}`, r.x + 260, r.y + 104, 13, afford ? '#9ff4ff' : '#9fb4d8', 'left', 900);
  }
}

export function drawTitle(ctx, world, ui, t) {
  ctx.fillStyle = 'rgba(3,6,22,0.34)';
  ctx.fillRect(0, 0, W, 800);
  // Logo.
  ctx.save();
  ctx.shadowColor = 'rgba(255,200,110,0.95)';
  ctx.shadowBlur = 40;
  text(ctx, 'TIDE KEEPER', W / 2, 122, 90, '#ffe3a0', 'center', 900, SERIF);
  ctx.restore();
  text(ctx, 'Hold the light. Bounce it off the mirror shards.', W / 2, 168, 28, '#fff1d0', 'center', 700);
  text(ctx, `A lighthouse roguelite  |  ${TOTAL_WAVES} waves  |  3 tides  |  2 Kraken Queens`, W / 2, 196, 17, '#cfe0ff', 'center', 700);

  // Bank and best score.
  panel(ctx, 36, 22, 250, 50, 0.7);
  drawIcon(ctx, 'pearl', 62, 47, 26, '#bff6ff');
  text(ctx, `${world.meta.bank}`, 84, 56, 28, '#9ff4ff', 'left', 900);
  text(ctx, 'SEA GLASS BANK', 278, 53, 12, '#9fc4ff', 'right', 800);
  panel(ctx, W - 286, 22, 250, 50, 0.7);
  text(ctx, 'BEST', W - 266, 53, 13, '#9fc4ff', 'left', 800);
  text(ctx, world.best > 0 ? world.best.toLocaleString('en-US') : '-', W - 52, 56, 28, '#ffe7a6', 'right', 900);

  // Lamp picker, left.
  text(ctx, 'CHOOSE YOUR LAMP', 40, 206, 15, '#ffd35a', 'left', 900);
  BEAM_ORDER.forEach((id, i) => drawBeamCard(ctx, world, id, i, ui, t));

  // Rules, right.
  const px = W - 36 - 372;
  panel(ctx, px, 212, 372, 392, 0.72);
  text(ctx, 'KEEP THE LIGHT', px + 20, 242, 15, '#ffd35a', 'left', 900);
  const rows = [
    ['MOUSE', 'sweep the beam'],
    ['SPACE / CLICK', 'focus a deadly laser'],
    ['Q', 'Pulse Nova: hurl the sea back'],
    ['E', 'Lantern Buoy: a burning trap'],
    ['R', 'Storm Call: lightning strikes'],
    ['MIRRORS', 'light a shard: it bounces a laser'],
  ];
  rows.forEach(([key, what], i) => {
    const y = 276 + i * 31;
    roundRect(ctx, px + 20, y - 19, key.length > 3 ? 120 : 34, 26, 7);
    ctx.fillStyle = 'rgba(120,170,255,0.2)';
    ctx.fill();
    text(ctx, key, px + 20 + (key.length > 3 ? 60 : 17), y, 14, '#ffffff', 'center', 800);
    text(ctx, what, px + (key.length > 3 ? 152 : 66), y, 15, '#cfe0ff', 'left', 600);
  });
  text(ctx, 'Burn creatures for pearls, spend them on relics', px + 20, 472, 14, '#ffe7a6', 'left', 700);
  text(ctx, 'and upgrades between waves. Lose all hull and', px + 20, 490, 14, '#ffe7a6', 'left', 700);
  text(ctx, `the light goes out. Survive wave ${TOTAL_WAVES} for dawn.`, px + 20, 508, 14, '#ffe7a6', 'left', 700);
  // The creatures.
  text(ctx, 'THE DEEP SENDS', px + 20, 538, 13, '#ffd35a', 'left', 900);
  ['crab', 'ghost', 'jelly', 'gunboat', 'leviathan', 'kraken'].forEach((type, i) => {
    const small = type === 'kraken' ? 0.3 : type === 'leviathan' ? 0.32 : type === 'gunboat' ? 0.5 : 0.62;
    drawEnemyIcon(ctx, type, px + 44 + i * 60, 574 + (type === 'kraken' ? 8 : 0), small, t + i);
  });

  // Click to begin.
  const pulse = 0.65 + 0.35 * Math.sin(t * 3.2);
  roundRect(ctx, BEGIN.x, BEGIN.y, BEGIN.w, BEGIN.h, 28);
  ctx.fillStyle = `rgba(255,200,100,${0.2 + 0.2 * pulse})`;
  ctx.fill();
  ctx.strokeStyle = `rgba(255,230,160,${0.6 + 0.4 * pulse})`;
  ctx.lineWidth = 3;
  ctx.stroke();
  outlined(ctx, 'CLICK TO BEGIN', W / 2, BEGIN.y + 39, 34, '#ffffff', 'center', 900);
  text(ctx, 'or press ENTER   |   1 2 3 pick a lamp   |   M sound', W / 2, 794, 13, 'rgba(210,225,255,0.65)', 'center', 600);
}

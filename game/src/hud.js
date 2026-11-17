// The heads-up display while playing: hull and lamp, tide and wave, score, pearls and combo, the relic
// strip, the boss bar, the radar, the ability bar and the wave banner. Biggest numbers first, so it
// still reads when the picture is shrunk.
import { BEAMS, H, TOTAL_WAVES, W } from './config.js';
import { drawAbilityBar } from './abilities.js';
import { BOSSES } from './enemies.js';
import { drawIcon } from './icons.js';
import { drawRadar } from './radar.js';
import { bar, outlined, panel, roundRect, SERIF, text } from './ui.js';
import { itemById, RARITY } from './upgrades.js';
import { tideOf } from './world.js';

/** One small framed relic icon, shared with the shop and the end screen. */
export function relicChip(ctx, id, x, y, size) {
  const item = itemById(id);
  const rarity = RARITY[item.rarity];
  roundRect(ctx, x, y, size, size, 8);
  ctx.fillStyle = 'rgba(8,12,34,0.82)';
  ctx.fill();
  ctx.strokeStyle = rarity.color;
  ctx.lineWidth = 2;
  ctx.stroke();
  drawIcon(ctx, item.icon, x + size / 2, y + size / 2, size * 0.58, rarity.color);
}

function drawBossBar(ctx, world, boss, t) {
  const spec = boss.boss;
  const x = W / 2 - 290;
  const y = 134;
  panel(ctx, x, y, 580, 62, 0.74, 'rgba(255,120,170,0.5)');
  text(ctx, spec.title.toUpperCase(), x + 20, y + 25, 21, '#ffd1e6', 'left', 900, SERIF);
  const state = boss.exposed > 0 ? `SHIELD DOWN ${boss.exposed.toFixed(0)}s` : boss.enraged ? 'ENRAGED' : 'SHIELDED';
  text(ctx, state, x + 560, y + 25, 15, boss.exposed > 0 ? '#ff9a8a' : '#c6a8ff', 'right', 900);
  bar(ctx, x + 20, y + 33, 540, 16, boss.hp / boss.maxHp, '#ff3f7a', '#ff9ac0');
  if (boss.exposed <= 0 && boss.shieldMax > 0) {
    ctx.fillStyle = 'rgba(190,160,255,0.85)';
    ctx.fillRect(x + 22, y + 52, 536 * (boss.shield / boss.shieldMax), 4);
  }
  text(ctx, `${Math.ceil(boss.hp)}`, x + 550, y + 46, 12, '#ffffff', 'right', 800);
}

function drawRelicStrip(ctx, world) {
  if (world.relics.length === 0) return;
  const size = 36;
  const gap = 6;
  const total = world.relics.length * (size + gap) - gap;
  let x = W - 20 - total;
  text(ctx, 'RELICS', x - 10, 148, 13, 'rgba(200,220,255,0.7)', 'right', 800);
  for (const id of world.relics) {
    relicChip(ctx, id, x, 128, size);
    x += size + gap;
  }
}

export function drawHud(ctx, world, ui, pal) {
  const t = world.time;
  const accent = pal.accentCss;
  // Left: hull and lamp power.
  panel(ctx, 16, 14, 350, 112);
  text(ctx, 'HULL', 34, 42, 16, '#9fc4ff', 'left', 800);
  text(ctx, `${Math.ceil(world.hp)} / ${world.maxHp}`, 348, 42, 20, '#ffffff', 'right', 900);
  const hullFrac = world.hp / world.maxHp;
  bar(ctx, 32, 50, 318, 20, hullFrac, hullFrac > 0.4 ? '#3fd68a' : '#ff9a3c', hullFrac > 0.4 ? '#a6f0b4' : '#ff4a3a');
  const lampLabel = world.locked ? 'LAMP OVERHEATED' : world.focusing ? 'LAMP FOCUSED' : 'LAMP POWER';
  text(ctx, lampLabel, 34, 98, 16, world.locked ? '#ff9a6a' : '#9fc4ff', 'left', 800);
  text(ctx, `${Math.ceil(world.power)}`, 348, 98, 20, '#ffffff', 'right', 900);
  bar(ctx, 32, 106, 318, 14, world.power / world.maxPower, world.locked ? '#ff7a3a' : '#3aa8ff', world.locked ? '#ffb06a' : '#9ff0ff');

  // Centre: the tide, the wave and how many creatures remain.
  const tide = tideOf(world.wave);
  panel(ctx, W / 2 - 160, 14, 320, 84);
  text(ctx, `${tide.name.toUpperCase()} TIDE`, W / 2, 38, 17, accent, 'center', 900);
  text(ctx, `WAVE ${world.wave} / ${TOTAL_WAVES}`, W / 2, 72, 32, '#ffe7a6', 'center', 900);
  const total = Math.max(1, world.waveTotal);
  bar(ctx, W / 2 - 130, 80, 260, 9, 1 - world.enemiesLeft / total, '#ffb347', '#ffe58a');
  // Tide markers: one pip per wave, lit up to the current one.
  for (let i = 1; i <= TOTAL_WAVES; i += 1) {
    ctx.fillStyle = i < world.wave ? accent : i === world.wave ? '#ffffff' : 'rgba(160,190,240,0.3)';
    ctx.fillRect(W / 2 - 150 + (i - 1) * 25 + (i > 4 ? 6 : 0) + (i > 8 ? 6 : 0), 91, 20, 3);
  }

  // Right: score, pearls, combo and best.
  panel(ctx, W - 376, 14, 360, 112);
  text(ctx, 'SCORE', W - 356, 40, 16, '#9fc4ff', 'left', 800);
  text(ctx, `BEST ${world.best}`, W - 32, 40, 15, '#9fc4ff', 'right', 800);
  text(ctx, String(world.score), W - 32, 78, 42, '#ffffff', 'right', 900);
  drawIcon(ctx, 'pearl', 934, 98, 22, '#bff6ff');
  text(ctx, String(world.pearls), 952, 106, 26, '#9ff4ff', 'left', 900);
  if (world.combo >= 2) {
    const mult = world.comboMultiplier;
    text(ctx, `x${mult % 1 === 0 ? mult : mult.toFixed(1)} COMBO ${world.combo}`, W - 32, 106, 22, '#ffd35a', 'right', 900);
    bar(ctx, W - 356, 113, 324, 6, world.comboTimer / 3, '#ffb347', '#fff1a8');
  } else {
    text(ctx, 'chain kills for a combo', W - 32, 106, 14, 'rgba(200,220,255,0.6)', 'right', 600);
  }
  drawRelicStrip(ctx, world);

  const boss = world.boss;
  if (boss) drawBossBar(ctx, world, boss, t);

  drawRadar(ctx, world, t, accent);
  drawAbilityBar(ctx, world, t);

  // Bottom right: the lamp in use and the keys.
  panel(ctx, W - 300, H - 92, 284, 78);
  drawIcon(ctx, world.beamId === 'sun' ? 'sunbeam' : world.beamId, W - 270, H - 66, 26, `rgb(${BEAMS[world.beamId].rgb})`);
  text(ctx, BEAMS[world.beamId].name.toUpperCase(), W - 246, H - 60, 17, '#ffffff', 'left', 900);
  text(ctx, 'MOUSE aim  SPACE focus', W - 34, H - 38, 13, 'rgba(210,225,255,0.75)', 'right', 700);
  text(ctx, `Q E R powers  P pause  M ${ui.muted ? 'sound OFF' : 'sound'}`, W - 34, H - 20, 13, ui.muted ? '#ff9a8a' : 'rgba(210,225,255,0.75)', 'right', 700);

  if (world.bannerT > 0) drawBanner(ctx, world, tide, accent);
  else if (world.bossIntro > 0 && world.bossTitle) drawBossIntro(ctx, world);
}

function drawBanner(ctx, world, tide, accent) {
  const k = Math.min(1, world.bannerT / 0.6, (2.6 - world.bannerT) / 0.3);
  ctx.save();
  ctx.globalAlpha = Math.max(0, k);
  const final = world.wave === TOTAL_WAVES;
  const boss = BOSSES[world.wave];
  outlined(ctx, final ? 'FINAL WAVE' : `WAVE ${world.wave}`, W / 2, 250, 84, '#ffe7a6', 'center', 900, SERIF);
  const first = world.wave === tide.from;
  outlined(ctx, first ? `${tide.name.toUpperCase()} TIDE: ${tide.line}` : boss ? `Something huge stirs: ${boss.title}` : 'The tide rises. Hold the light.', W / 2, 296, 26, first ? accent : '#cfe0ff', 'center', 800);
  ctx.restore();
}

function drawBossIntro(ctx, world) {
  const k = Math.min(1, world.bossIntro / 0.5, (3.2 - world.bossIntro) / 0.25);
  ctx.save();
  ctx.globalAlpha = Math.max(0, k);
  ctx.shadowColor = 'rgba(255,60,140,0.9)';
  ctx.shadowBlur = 30;
  outlined(ctx, world.bossTitle.title.toUpperCase(), W / 2, 250, 66, '#ffc2dd', 'center', 900, SERIF);
  ctx.shadowBlur = 0;
  outlined(ctx, world.bossTitle.sub, W / 2, 292, 24, '#ffe0ee', 'center', 700);
  ctx.restore();
}

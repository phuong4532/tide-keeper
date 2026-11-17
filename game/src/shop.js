// The shop between waves: three cards (upgrades and relics) paid for with pearls, with rarity colours,
// icons and prices, plus Mend, Reroll and Sail On. Everything the player owns is listed underneath.
import { BOSS_WAVES, H, W } from './config.js';
import { relicChip } from './hud.js';
import { drawIcon } from './icons.js';
import { outlined, panel, roundRect, SERIF, text, wrapText } from './ui.js';
import { MAX_LEVEL, RARITY, UPGRADES } from './upgrades.js';
import { tideOf } from './world.js';

const CARD = { w: 330, h: 342, gap: 26, y: 178 };

/** Where shop card `i` sits, for drawing and for mouse clicks. */
export function cardRect(i) {
  const left = (W - (3 * CARD.w + 2 * CARD.gap)) / 2;
  return { x: left + i * (CARD.w + CARD.gap), y: CARD.y, w: CARD.w, h: CARD.h };
}

/** The three buttons under the cards. */
export function shopButtons() {
  const y = 540;
  return [
    { id: 'mend', x: 214, y, w: 270, h: 54 },
    { id: 'reroll', x: 505, y, w: 270, h: 54 },
    { id: 'go', x: 796, y, w: 270, h: 54 },
  ];
}

const inside = (r, x, y) => x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;

/** What a click in the shop lands on: { card: i } or { button: id }. */
export function shopHit(x, y) {
  for (let i = 0; i < 3; i += 1) if (inside(cardRect(i), x, y)) return { card: i };
  for (const b of shopButtons()) if (inside(b, x, y)) return { button: b.id };
  return null;
}

function drawCard(ctx, world, offer, i, ui, t) {
  const r = cardRect(i);
  const item = offer.item;
  const rarity = RARITY[item.rarity];
  const afford = world.pearls >= offer.cost;
  const hover = !offer.sold && ui.mouse.x > r.x && ui.mouse.x < r.x + r.w && ui.mouse.y > r.y && ui.mouse.y < r.y + r.h;
  const y = r.y + (hover ? -8 : 0);
  ctx.save();
  if (offer.sold) ctx.globalAlpha = 0.45;
  // Card body with a rarity glow behind it.
  const aura = ctx.createRadialGradient(r.x + r.w / 2, y + 120, 10, r.x + r.w / 2, y + 120, 230);
  aura.addColorStop(0, `rgba(${rarity.glow},${hover ? 0.4 : 0.24})`);
  aura.addColorStop(1, `rgba(${rarity.glow},0)`);
  ctx.fillStyle = aura;
  ctx.fillRect(r.x - 40, y - 40, r.w + 80, r.h + 80);
  roundRect(ctx, r.x, y, r.w, r.h, 20);
  const g = ctx.createLinearGradient(0, y, 0, y + r.h);
  g.addColorStop(0, hover ? 'rgba(40,58,120,0.97)' : 'rgba(20,30,72,0.95)');
  g.addColorStop(1, 'rgba(8,12,34,0.97)');
  ctx.fillStyle = g;
  ctx.fill();
  ctx.strokeStyle = rarity.color;
  ctx.lineWidth = item.rarity === 'epic' ? 4 : 3;
  ctx.stroke();
  // Rarity ribbon.
  roundRect(ctx, r.x + 20, y + 16, 104, 26, 13);
  ctx.fillStyle = rarity.color;
  ctx.fill();
  text(ctx, rarity.name, r.x + 72, y + 35, 14, '#10122a', 'center', 900);
  text(ctx, item.kind === 'relic' ? 'RELIC' : 'UPGRADE', r.x + r.w - 20, y + 35, 14, 'rgba(200,220,255,0.75)', 'right', 800);
  // Icon medallion.
  const cx = r.x + r.w / 2;
  const cy = y + 118;
  const med = ctx.createRadialGradient(cx, cy, 6, cx, cy, 58);
  med.addColorStop(0, `rgba(${rarity.glow},0.5)`);
  med.addColorStop(1, `rgba(${rarity.glow},0.06)`);
  ctx.fillStyle = med;
  ctx.beginPath();
  ctx.arc(cx, cy, 56, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = rarity.color;
  ctx.lineWidth = 2;
  ctx.stroke();
  drawIcon(ctx, item.icon, cx, cy, 64, '#ffffff');
  text(ctx, item.name, cx, y + 214, 27, '#ffffff', 'center', 900);
  wrapText(ctx, item.desc, cx, y + 244, r.w - 56, 21, 17, '#bcd0f2');
  if (item.kind === 'upgrade') {
    const level = world.up[item.id] || 0;
    for (let k = 0; k < MAX_LEVEL; k += 1) {
      ctx.fillStyle = k < level ? rarity.color : k === level ? `rgba(${rarity.glow},0.9)` : 'rgba(140,160,210,0.28)';
      roundRect(ctx, cx - 56 + k * 29, y + 280, 24, 8, 4);
      ctx.fill();
    }
    text(ctx, `LV ${level} > ${level + 1}`, cx + 74, y + 289, 12, '#9fc4ff', 'left', 800);
  }
  // Price pill.
  roundRect(ctx, cx - 62, y + r.h - 40, 124, 32, 16);
  ctx.fillStyle = afford && !offer.sold ? 'rgba(40,120,150,0.85)' : 'rgba(90,30,40,0.85)';
  ctx.fill();
  ctx.strokeStyle = afford ? '#9ff4ff' : '#ff8a8a';
  ctx.lineWidth = 2;
  ctx.stroke();
  drawIcon(ctx, 'pearl', cx - 30, y + r.h - 24, 20, afford ? '#bff6ff' : '#ffb0b0');
  text(ctx, String(offer.cost), cx - 14, y + r.h - 16, 22, afford ? '#ffffff' : '#ffb0b0', 'left', 900);
  text(ctx, String(i + 1), r.x + 24, y + 80, 22, '#ffd35a', 'left', 900, SERIF);
  ctx.restore();
  if (offer.sold) {
    ctx.save();
    ctx.translate(cx, y + 160);
    ctx.rotate(-0.18);
    outlined(ctx, 'BOUGHT', 0, 0, 52, '#9ff4a8', 'center', 900);
    ctx.restore();
  }
}

function drawButton(ctx, b, label, sub, enabled, ui, icon) {
  const hover = enabled && ui.mouse.x > b.x && ui.mouse.x < b.x + b.w && ui.mouse.y > b.y && ui.mouse.y < b.y + b.h;
  roundRect(ctx, b.x, b.y, b.w, b.h, 27);
  ctx.fillStyle = enabled ? (hover ? 'rgba(70,100,180,0.95)' : 'rgba(30,48,110,0.92)') : 'rgba(20,24,44,0.8)';
  ctx.fill();
  ctx.strokeStyle = enabled ? (hover ? '#ffe3a0' : 'rgba(170,200,255,0.65)') : 'rgba(110,120,150,0.4)';
  ctx.lineWidth = 2.5;
  ctx.stroke();
  drawIcon(ctx, icon, b.x + 34, b.y + b.h / 2, 26, enabled ? '#ffe3a0' : '#6e7898');
  text(ctx, label, b.x + 62, b.y + 25, 19, enabled ? '#ffffff' : '#7c88a8', 'left', 900);
  text(ctx, sub, b.x + 62, b.y + 44, 14, enabled ? '#9fc4ff' : '#667090', 'left', 700);
}

export function drawShop(ctx, world, ui, t, pal) {
  ctx.fillStyle = 'rgba(3,6,22,0.56)';
  ctx.fillRect(0, 0, W, H);
  const tide = tideOf(world.wave + 1);
  const bossDone = BOSS_WAVES.includes(world.wave);
  outlined(ctx, `WAVE ${world.wave} CLEARED`, W / 2, 84, 60, '#ffe7a6', 'center', 900, SERIF);
  text(ctx, bossDone ? 'The Kraken Queen sinks beneath the swell.' : `Next: ${tide.name} Tide, wave ${world.wave + 1}.  Spend pearls, then sail on.`, W / 2, 120, 21, pal.accentCss, 'center', 700);
  text(ctx, `Wave bonus +${100 * world.wave} score  +${world.waveBonus || 0} pearls     Score ${world.score}`, W / 2, 148, 16, '#9fc4ff', 'center', 700);
  // Pearl purse.
  panel(ctx, W - 250, 28, 214, 64, 0.8, 'rgba(120,230,255,0.5)');
  drawIcon(ctx, 'pearl', W - 222, 60, 34, '#bff6ff');
  text(ctx, String(world.pearls), W - 196, 74, 40, '#9ff4ff', 'left', 900);
  text(ctx, 'PEARLS', W - 52, 52, 12, '#9fc4ff', 'right', 800);

  world.shop.offers.forEach((offer, i) => drawCard(ctx, world, offer, i, ui, t));
  const [mend, reroll, go] = shopButtons();
  drawButton(ctx, mend, `Mend hull +5`, `${world.mendCost} pearls   (${world.hp}/${world.maxHp})`, world.pearls >= world.mendCost && world.hp < world.maxHp, ui, 'mend');
  drawButton(ctx, reroll, 'Reroll offers', `${world.rerollCost} pearls`, world.pearls >= world.rerollCost, ui, 'reroll');
  drawButton(ctx, go, 'Sail on', 'SPACE or ENTER', true, ui, 'cone');

  // What the keeper owns.
  panel(ctx, 36, 626, 560, 148, 0.7);
  text(ctx, `RELICS  ${world.relics.length}`, 56, 656, 15, '#ffd35a', 'left', 900);
  if (world.relics.length === 0) text(ctx, 'None yet. Rare and epic cards can be relics.', 56, 700, 15, 'rgba(200,220,255,0.6)', 'left', 600);
  world.relics.forEach((id, i) => relicChip(ctx, id, 56 + (i % 9) * 56, 670 + Math.floor(i / 9) * 52, 46));
  panel(ctx, 616, 626, 628, 148, 0.7);
  text(ctx, 'LAMP UPGRADES', 636, 656, 15, '#ffd35a', 'left', 900);
  const owned = UPGRADES.filter((u) => (world.up[u.id] || 0) > 0);
  if (owned.length === 0) text(ctx, 'Nothing bought yet.', 636, 700, 15, 'rgba(200,220,255,0.6)', 'left', 600);
  owned.forEach((u, i) => {
    const x = 636 + (i % 4) * 150;
    const y = 676 + Math.floor(i / 4) * 44;
    drawIcon(ctx, u.icon, x + 14, y + 8, 24, '#ffe3a0');
    text(ctx, u.name, x + 34, y + 6, 13, '#ffffff', 'left', 800);
    text(ctx, `Lv ${world.up[u.id]}`, x + 34, y + 22, 13, '#9fc4ff', 'left', 700);
  });
}

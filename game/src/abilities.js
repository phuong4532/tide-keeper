// The keeper's ability bar: Q Pulse Nova, E Lantern Buoy, R Storm Call, each with a cooldown ring.
import { ABILITIES, H, W } from './config.js';
import { drawIcon } from './icons.js';
import { text, roundRect } from './ui.js';

const SLOT = 86;
const GAP = 16;

export function slotRect(i) {
  const total = ABILITIES.length * SLOT + (ABILITIES.length - 1) * GAP;
  return { x: (W - total) / 2 + i * (SLOT + GAP), y: H - SLOT - 14, w: SLOT, h: SLOT };
}

export function drawAbilityBar(ctx, world, t) {
  ABILITIES.forEach((spec, i) => {
    const r = slotRect(i);
    const cd = world.cooldowns[spec.id];
    const max = world.cooldownMax(spec.id);
    const ready = cd <= 0;
    const frac = ready ? 0 : cd / max;
    const cx = r.x + r.w / 2;
    const cy = r.y + r.h / 2 - 6;
    const flash = world.cdFlash[spec.id];
    ctx.save();
    roundRect(ctx, r.x, r.y, r.w, r.h, 16);
    const g = ctx.createLinearGradient(0, r.y, 0, r.y + r.h);
    g.addColorStop(0, ready ? 'rgba(40,52,110,0.9)' : 'rgba(14,20,48,0.88)');
    g.addColorStop(1, 'rgba(6,10,28,0.92)');
    ctx.fillStyle = g;
    ctx.fill();
    // The cooldown wipe: a dark pie that shrinks clockwise as the ability comes back.
    if (!ready) {
      ctx.save();
      roundRect(ctx, r.x, r.y, r.w, r.h, 16);
      ctx.clip();
      ctx.fillStyle = 'rgba(0,0,10,0.62)';
      ctx.beginPath();
      ctx.moveTo(cx, r.y + r.h / 2);
      ctx.arc(cx, r.y + r.h / 2, r.w, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * frac);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
    // Rim: gold glow when ready, a thin ring that fills as it recharges.
    roundRect(ctx, r.x, r.y, r.w, r.h, 16);
    ctx.strokeStyle = ready ? `rgba(255,222,140,${0.75 + 0.25 * Math.sin(t * 5)})` : 'rgba(140,170,230,0.4)';
    ctx.lineWidth = ready ? 3 : 2;
    ctx.stroke();
    if (flash > 0) {
      ctx.strokeStyle = `rgba(255,255,255,${flash})`;
      ctx.lineWidth = 6;
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.arc(cx, cy, 26, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (1 - frac));
    ctx.strokeStyle = ready ? 'rgba(255,222,140,0.9)' : 'rgba(150,200,255,0.9)';
    ctx.lineWidth = 3;
    ctx.stroke();
    drawIcon(ctx, spec.id, cx, cy, 38, ready ? '#ffe3a0' : 'rgba(190,205,235,0.75)');
    // Key badge.
    roundRect(ctx, r.x + 6, r.y + 6, 24, 24, 7);
    ctx.fillStyle = ready ? '#ffd98a' : 'rgba(150,175,230,0.75)';
    ctx.fill();
    text(ctx, spec.key, r.x + 18, r.y + 24, 17, '#1b1a2e', 'center', 900);
    text(ctx, ready ? spec.name.toUpperCase() : `${cd.toFixed(1)}s`, cx, r.y + r.h - 8, ready ? 11 : 15, ready ? '#ffe9b0' : '#cfe0ff', 'center', 800);
    ctx.restore();
  });
}

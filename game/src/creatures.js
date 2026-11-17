// Drawing the sea creatures: crab, eel, ghost, leviathan, moon jelly, spratling, gunboat, cannonball and the Kraken Queen. Out of the beam they are dark shapes with glowing eyes; the beam
// lights them up (`lit`) and a hit flashes them white.
import { BASE, H, HORIZON } from './config.js';

const mix = (a, b, k) => `rgb(${Math.round(a[0] + (b[0] - a[0]) * k)},${Math.round(a[1] + (b[1] - a[1]) * k)},${Math.round(a[2] + (b[2] - a[2]) * k)})`;

function glowDot(ctx, x, y, r, rgb) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r * 3);
  g.addColorStop(0, `rgba(${rgb},1)`);
  g.addColorStop(0.35, `rgba(${rgb},0.55)`);
  g.addColorStop(1, `rgba(${rgb},0)`);
  ctx.globalCompositeOperation = 'lighter';
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, r * 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalCompositeOperation = 'source-over';
}

function ellipse(ctx, x, y, rx, ry, fill, stroke) {
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  if (fill) {
    ctx.fillStyle = fill;
    ctx.fill();
  }
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 1.6;
    ctx.stroke();
  }
}

function drawCrab(ctx, e) {
  const body = mix([26, 38, 66], [235, 105, 80], e.lit);
  const rim = 'rgba(130,190,255,0.45)';
  const walk = e.t * 9;
  ctx.strokeStyle = body;
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  for (let side = -1; side <= 1; side += 2) {
    for (let i = 0; i < 3; i += 1) {
      const a = Math.sin(walk + i * 1.7 + (side > 0 ? 0 : 3)) * 3;
      ctx.beginPath();
      ctx.moveTo(side * 8, 4 + i * 3);
      ctx.lineTo(side * (20 + i * 3), 10 + i * 5 + a);
      ctx.lineTo(side * (25 + i * 4), 18 + i * 5);
      ctx.stroke();
    }
    // Raised claw.
    ctx.beginPath();
    ctx.moveTo(side * 12, -4);
    ctx.lineTo(side * 24, -14);
    ctx.stroke();
    ellipse(ctx, side * 26, -19, 8, 7, body, rim);
    ctx.fillStyle = 'rgba(6,10,24,0.9)';
    ctx.beginPath();
    ctx.moveTo(side * 26, -19);
    ctx.lineTo(side * 31, -28);
    ctx.lineTo(side * 21, -26);
    ctx.fill();
  }
  ellipse(ctx, 0, 0, 19, 13, body, rim);
  ellipse(ctx, 0, -3, 12, 6, `rgba(255,255,255,${0.06 + 0.2 * e.lit})`);
  for (let side = -1; side <= 1; side += 2) {
    ctx.strokeStyle = body;
    ctx.beginPath();
    ctx.moveTo(side * 5, -10);
    ctx.lineTo(side * 6, -17);
    ctx.stroke();
    glowDot(ctx, side * 6, -18, 2.4, '255,70,60');
  }
}

function drawEel(ctx, e) {
  const body = mix([18, 52, 74], [95, 235, 225], e.lit);
  const speed = Math.hypot(e.vx, e.vy) || 1;
  const dx = e.vx / speed;
  const dy = e.vy / speed;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  const points = [];
  for (let i = 0; i < 10; i += 1) {
    const back = i * 8;
    const wob = Math.sin(e.t * 7 - i * 0.8 + e.phase) * (2 + i * 0.7);
    points.push([-dx * back - dy * wob, -dy * back + dx * wob]);
  }
  for (let pass = 0; pass < 2; pass += 1) {
    ctx.strokeStyle = pass === 0 ? 'rgba(130,200,255,0.4)' : body;
    for (let i = 0; i < points.length - 1; i += 1) {
      ctx.lineWidth = (pass === 0 ? 4 : 0) + 11 - i * 1.0;
      ctx.beginPath();
      ctx.moveTo(points[i][0], points[i][1]);
      ctx.lineTo(points[i + 1][0], points[i + 1][1]);
      ctx.stroke();
    }
  }
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.arc(0, 0, 8, 0, Math.PI * 2);
  ctx.fill();
  glowDot(ctx, dx * 3 - dy * 3, dy * 3 + dx * 3, 2.4, '120,255,245');
  glowDot(ctx, dx * 3 + dy * 3, dy * 3 - dx * 3, 2.4, '120,255,245');
}

function drawGhost(ctx, e) {
  const bob = Math.sin(e.t * 3 + e.phase) * 3;
  ctx.translate(0, bob);
  const body = ctx.createRadialGradient(0, -2, 1, 0, 0, 22);
  body.addColorStop(0, `rgba(235,255,240,${0.7 + 0.3 * e.lit})`);
  body.addColorStop(0.5, 'rgba(140,255,190,0.55)');
  body.addColorStop(1, 'rgba(60,200,150,0)');
  ctx.globalCompositeOperation = 'lighter';
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.arc(0, 0, 22, 0, Math.PI * 2);
  ctx.fill();
  // Trailing wisps.
  for (let i = 0; i < 3; i += 1) {
    const sway = Math.sin(e.t * 4 + i * 2 + e.phase) * 8;
    ctx.strokeStyle = `rgba(150,255,205,${0.35 - i * 0.07})`;
    ctx.lineWidth = 7 - i * 1.6;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo((i - 1) * 6, 6);
    ctx.quadraticCurveTo((i - 1) * 8 + sway, 22, (i - 1) * 10 - sway, 36);
    ctx.stroke();
  }
  ctx.globalCompositeOperation = 'source-over';
  ctx.fillStyle = 'rgba(8,40,40,0.9)';
  ellipse(ctx, -5, -2, 2.6, 3.6, 'rgba(8,40,40,0.9)');
  ellipse(ctx, 5, -2, 2.6, 3.6, 'rgba(8,40,40,0.9)');
}

function drawLeviathan(ctx, e) {
  const body = mix([34, 26, 60], [165, 120, 220], e.lit);
  const rim = 'rgba(190,150,255,0.5)';
  // Tentacles.
  ctx.strokeStyle = body;
  ctx.lineWidth = 7;
  ctx.lineCap = 'round';
  for (let i = -3; i <= 3; i += 1) {
    const sway = Math.sin(e.t * 3 + i) * 7;
    ctx.beginPath();
    ctx.moveTo(i * 12, 14);
    ctx.quadraticCurveTo(i * 15 + sway, 34, i * 17 - sway, 48);
    ctx.stroke();
  }
  // Back plates.
  for (let i = -3; i <= 3; i += 1) {
    ctx.fillStyle = mix([26, 18, 48], [120, 80, 180], e.lit);
    ctx.beginPath();
    ctx.moveTo(i * 13 - 8, -22 + Math.abs(i) * 3);
    ctx.lineTo(i * 13, -40 + Math.abs(i) * 5);
    ctx.lineTo(i * 13 + 8, -22 + Math.abs(i) * 3);
    ctx.fill();
  }
  ellipse(ctx, 0, 0, 48, 32, body, rim);
  ellipse(ctx, 0, -12, 34, 9, `rgba(255,255,255,${0.05 + 0.16 * e.lit})`);
  ellipse(ctx, 0, 2, 13, 11, '#0a0714');
  glowDot(ctx, 0, 2, 6, '255,70,90');
  ctx.fillStyle = '#ffd6dc';
  ctx.fillRect(-1.2, -7, 2.4, 18);
}

function drawJelly(ctx, e) {
  const pulse = Math.sin(e.t * 3 + e.phase);
  const bell = ctx.createRadialGradient(0, -4, 2, 0, 0, 26);
  bell.addColorStop(0, `rgba(255,${200 + 40 * e.lit},245,0.95)`);
  bell.addColorStop(0.6, `rgba(${180 + 50 * e.lit},110,${200 + 30 * e.lit},0.7)`);
  bell.addColorStop(1, 'rgba(120,60,170,0.25)');
  for (let i = -3; i <= 3; i += 1) {
    ctx.strokeStyle = `rgba(255,170,235,${0.4 + 0.3 * e.lit})`;
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.moveTo(i * 5, 8);
    for (let k = 1; k <= 4; k += 1) ctx.lineTo(i * 5 + Math.sin(e.t * 4 + k + i) * 4, 8 + k * 8);
    ctx.stroke();
  }
  ctx.fillStyle = bell;
  ctx.beginPath();
  ctx.ellipse(0, 0, 24 + pulse * 2, 16 - pulse * 1.5, 0, Math.PI, 0);
  ctx.quadraticCurveTo(0, 12 + pulse * 2, -24 - pulse * 2, 0);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,220,250,0.55)';
  ctx.lineWidth = 1.4;
  ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.25)';
  ctx.beginPath();
  ctx.ellipse(-7, -8, 7, 3, -0.4, 0, Math.PI * 2);
  ctx.fill();
  glowDot(ctx, 0, -3, 3, '255,140,230');
}

function drawSprat(ctx, e) {
  const body = mix([30, 50, 78], [255, 190, 110], e.lit);
  const speed = Math.hypot(e.vx, e.vy) || 1;
  const ang = Math.atan2(e.vy, e.vx);
  ctx.rotate(ang);
  const wag = Math.sin(e.t * 16 + e.phase) * 3;
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.moveTo(10, 0);
  ctx.quadraticCurveTo(0, -8, -8, 0);
  ctx.quadraticCurveTo(0, 8, 10, 0);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(-7, 0);
  ctx.lineTo(-15, -5 + wag);
  ctx.lineTo(-15, 5 + wag);
  ctx.fill();
  glowDot(ctx, 5, -2, 1.6, '120,255,240');
  return speed;
}

function drawShell(ctx, e) {
  const speed = Math.hypot(e.vx, e.vy) || 1;
  const dx = e.vx / speed;
  const dy = e.vy / speed;
  ctx.globalCompositeOperation = 'lighter';
  const trail = ctx.createLinearGradient(0, 0, -dx * 36, -dy * 36);
  trail.addColorStop(0, 'rgba(255,170,80,0.8)');
  trail.addColorStop(1, 'rgba(255,100,40,0)');
  ctx.strokeStyle = trail;
  ctx.lineWidth = 9;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(-dx * 36, -dy * 36);
  ctx.stroke();
  ctx.globalCompositeOperation = 'source-over';
  ctx.fillStyle = mix([40, 30, 36], [255, 200, 140], e.lit);
  ctx.beginPath();
  ctx.arc(0, 0, 7, 0, Math.PI * 2);
  ctx.fill();
  glowDot(ctx, 0, 0, 4, '255,150,70');
}

function drawGunboat(ctx, e) {
  const bob = Math.sin(e.t * 1.6 + e.phase) * 2.5;
  const toward = e.x < 640 ? 1 : -1;
  ctx.translate(0, bob);
  ctx.scale(toward, 1);
  const hull = mix([22, 30, 44], [150, 175, 200], e.lit);
  const dark = mix([12, 16, 28], [80, 100, 130], e.lit);
  // Masts and tattered sails.
  ctx.fillStyle = dark;
  ctx.fillRect(-2, -46, 4, 40);
  ctx.beginPath();
  ctx.moveTo(4, -44);
  ctx.lineTo(26, -14);
  ctx.lineTo(8, -12);
  ctx.lineTo(10, -26);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(-4, -38);
  ctx.lineTo(-22, -14);
  ctx.lineTo(-6, -12);
  ctx.closePath();
  ctx.fill();
  // Hull.
  ctx.fillStyle = hull;
  ctx.beginPath();
  ctx.moveTo(-34, -8);
  ctx.lineTo(38, -8);
  ctx.quadraticCurveTo(30, 12, 12, 14);
  ctx.lineTo(-24, 14);
  ctx.quadraticCurveTo(-34, 6, -34, -8);
  ctx.fill();
  ctx.strokeStyle = 'rgba(120,200,220,0.5)';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  // Cannon barrel pointing at the tower.
  ctx.fillStyle = dark;
  ctx.fillRect(22, -6, 24, 7);
  // Ghostly portholes.
  for (let i = -2; i <= 1; i += 1) glowDot(ctx, i * 12 - 2, 2, 2.2, '120,255,220');
  glowDot(ctx, 0, -48, 3, '255,120,100');
}

function drawKraken(ctx, e) {
  const lit = e.lit;
  const body = mix([44, 28, 78], [170, 120, 225], lit);
  const rim = 'rgba(210,170,255,0.6)';
  const exposed = e.exposed > 0;
  // Eight tentacles, thick and slow.
  ctx.lineCap = 'round';
  for (let i = -4; i <= 3; i += 1) {
    const base = i * 17 + 8;
    ctx.strokeStyle = body;
    for (let seg = 0; seg < 6; seg += 1) {
      const k0 = seg / 6;
      const k1 = (seg + 1) / 6;
      const sway = (k) => Math.sin(e.t * 2.2 + i * 0.9 + k * 3) * 16 * k;
      ctx.lineWidth = 15 - seg * 2.2;
      ctx.beginPath();
      ctx.moveTo(base * (1 + k0 * 0.5) + sway(k0), 22 + k0 * 70);
      ctx.lineTo(base * (1 + k1 * 0.5) + sway(k1), 22 + k1 * 70);
      ctx.stroke();
    }
    glowDot(ctx, base * 1.3 + Math.sin(e.t * 2.2 + i * 0.9 + 1.5) * 8, 60, 1.8, '150,255,240');
  }
  // Crown of coral spikes.
  for (let i = -3; i <= 3; i += 1) {
    ctx.fillStyle = mix([200, 150, 60], [255, 230, 150], lit);
    ctx.beginPath();
    ctx.moveTo(i * 15 - 7, -40 + Math.abs(i) * 5);
    ctx.lineTo(i * 15, -68 + Math.abs(i) * 9);
    ctx.lineTo(i * 15 + 7, -40 + Math.abs(i) * 5);
    ctx.fill();
  }
  ellipse(ctx, 0, -6, 66, 48, body, rim);
  ellipse(ctx, 0, -26, 46, 14, `rgba(255,255,255,${0.06 + 0.18 * lit})`);
  // Spots along the mantle.
  for (let i = -3; i <= 3; i += 1) glowDot(ctx, i * 15, -22 + Math.abs(i) * 4, 2.6, i % 2 ? '255,120,200' : '120,230,255');
  // Eyes.
  for (let side = -1; side <= 1; side += 2) {
    ellipse(ctx, side * 24, -2, 14, 11, '#0b0716');
    glowDot(ctx, side * 24, -2, exposed ? 7 : 5, exposed ? '255,70,70' : '255,190,90');
    ctx.fillStyle = '#fff1c8';
    ctx.fillRect(side * 24 - 1.2, -9, 2.4, 14);
  }
  ctx.strokeStyle = 'rgba(10,6,20,0.8)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(0, 14, 16, 0.2 * Math.PI, 0.8 * Math.PI);
  ctx.stroke();
}

function drawBossShield(ctx, e) {
  const frac = e.shieldMax ? e.shield / e.shieldMax : 0;
  const pulse = 0.5 + 0.5 * Math.sin(e.t * 4);
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  if (e.exposed > 0) {
    ctx.strokeStyle = `rgba(255,110,110,${0.25 + 0.2 * pulse})`;
    ctx.lineWidth = 3;
    ctx.setLineDash([6, 12]);
    ctx.beginPath();
    ctx.arc(0, -6, 96, 0, Math.PI * 2);
    ctx.stroke();
  } else {
    const hit = e.shieldGlow > 0;
    const g = ctx.createRadialGradient(0, -6, 60, 0, -6, 100);
    g.addColorStop(0, 'rgba(160,120,255,0)');
    g.addColorStop(1, `rgba(170,130,255,${(hit ? 0.55 : 0.25) * (0.4 + frac)})`);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(0, -6, 100, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = hit ? 'rgba(255,255,255,0.95)' : `rgba(200,170,255,${0.35 + 0.4 * frac})`;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, -6, 98, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * frac);
    ctx.stroke();
  }
  ctx.restore();
}

const DRAW = { crab: drawCrab, eel: drawEel, ghost: drawGhost, leviathan: drawLeviathan, jelly: drawJelly, sprat: drawSprat, shell: drawShell, gunboat: drawGunboat, kraken: drawKraken };

function drawShield(ctx, e, focusing) {
  const toward = Math.atan2(BASE.y - e.y, BASE.x - e.x);
  const pulse = 0.5 + 0.5 * Math.sin(e.t * 5);
  const hit = e.shieldGlow > 0;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.lineCap = 'round';
  const span = 1.1;
  ctx.strokeStyle = `rgba(150,110,255,${(hit ? 0.35 : 0.14) + 0.06 * pulse})`;
  ctx.lineWidth = 12;
  ctx.beginPath();
  ctx.arc(0, 0, 58, toward - span, toward + span);
  ctx.stroke();
  ctx.strokeStyle = hit ? 'rgba(255,255,255,0.95)' : `rgba(190,160,255,${0.55 + 0.3 * pulse})`;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(0, 0, 58, toward - span, toward + span);
  ctx.stroke();
  ctx.restore();
}

/** Draw creature `e` where it stands. */
export function drawEnemy(ctx, e, focusing = false) {
  const depth = 0.95 + 0.4 * Math.max(0, Math.min(1, (e.y - HORIZON) / (H - HORIZON)));
  const scale = e.type === 'ghost' ? 1.25 : e.type === 'kraken' ? 1.1 : depth;
  ctx.save();
  ctx.translate(e.x, e.y);
  ctx.scale(scale, scale);
  DRAW[e.type](ctx, e);
  if (e.shielded) drawShield(ctx, e, focusing);
  if (e.type === 'kraken') drawBossShield(ctx, e);
  if (e.burn > 0) {
    ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createRadialGradient(0, -e.r * 0.3, 0, 0, -e.r * 0.3, e.r * 1.5);
    g.addColorStop(0, 'rgba(255,170,60,0.55)');
    g.addColorStop(1, 'rgba(255,80,20,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(0, -e.r * 0.3, e.r * 1.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalCompositeOperation = 'source-over';
  }
  if (e.flash > 0) {
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = `rgba(255,230,200,${Math.min(0.28, e.flash * 2.5)})`;
    ctx.beginPath();
    ctx.arc(0, 0, e.r * 0.8, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalCompositeOperation = 'source-over';
  }
  if (e.hp < e.maxHp - 0.5 && e.type !== 'kraken' && e.type !== 'shell') {
    const w = Math.max(20, e.r * 2);
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(-w / 2, -e.r - 26, w, 5);
    ctx.fillStyle = e.shielded ? '#b58cff' : '#ff8a5c';
    ctx.fillRect(-w / 2, -e.r - 26, w * Math.max(0, e.hp / e.maxHp), 5);
  }
  ctx.restore();
}

/** A small, fully lit creature for the title screen legend. */
export function drawEnemyIcon(ctx, type, x, y, scale, t) {
  const e = { type, x, y, vx: 1, vy: 0, lit: 1, t, phase: 0, flash: 0, shieldGlow: 0, hp: 1, maxHp: 1, r: 20, shielded: false, burn: 0, shield: 1, shieldMax: 1, exposed: 0 };
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  DRAW[type](ctx, e);
  ctx.restore();
}

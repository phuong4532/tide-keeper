// Light and sparks: the volumetric beam (sun, prism or ember), its glitter on the water, the lamp glow,
// the ability effects (pulse ring, lantern buoys, lightning), particles, flying pearls and damage numbers.
// Everything luminous is drawn additively ('lighter') so overlapping light adds up and glows.
import { BEAMS, HORIZON, LAMP, MIRROR, PEARL_HUD, PULSE_CENTER } from './config.js';

function cone(ctx, angle, half, range) {
  ctx.beginPath();
  ctx.moveTo(LAMP.x, LAMP.y);
  ctx.arc(LAMP.x, LAMP.y, range, angle - half, angle + half);
  ctx.closePath();
}

function coneLayer(ctx, angle, half, range, rgb, alpha) {
  const g = ctx.createRadialGradient(LAMP.x, LAMP.y, 10, LAMP.x, LAMP.y, range);
  g.addColorStop(0, `rgba(${rgb},${alpha})`);
  g.addColorStop(0.55, `rgba(${rgb},${alpha * 0.5})`);
  g.addColorStop(1, `rgba(${rgb},0)`);
  ctx.fillStyle = g;
  cone(ctx, angle, half, range);
  ctx.fill();
}

/** The glow around the lamp itself. */
export function drawLampGlow(ctx, world, t) {
  const pulse = 0.9 + 0.1 * Math.sin(t * 5);
  const r = (world.focusing ? 150 : 120) * pulse;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const g = ctx.createRadialGradient(LAMP.x, LAMP.y, 0, LAMP.x, LAMP.y, r);
  g.addColorStop(0, 'rgba(255,245,200,0.95)');
  g.addColorStop(0.25, 'rgba(255,214,130,0.45)');
  g.addColorStop(1, 'rgba(255,190,90,0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(LAMP.x, LAMP.y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

const PRISM_RGB = ['255,160,230', '200,235,255', '150,255,225'];

/** The beam: a soft wide cone (three for the prism), a brighter core, and slow drifting rays inside it. */
export function drawBeam(ctx, world, t) {
  const angle = world.beamAngle;
  const range = world.beamRange;
  const focus = world.focusing;
  const id = world.beamId;
  const base = BEAMS[id].rgb;
  const flicker = 0.93 + 0.07 * Math.sin(t * 37) * Math.sin(t * 11);
  const dim = world.locked ? 0.45 : 1;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  world.beamArms.forEach((arm, index) => {
    const a = angle + arm.off;
    const rgb = id === 'prism' ? PRISM_RGB[index] : focus ? '190,240,255' : base;
    const w = arm.mul * dim * flicker;
    coneLayer(ctx, a, arm.half * 1.35, range * 1.02, rgb, 0.16 * w);
    coneLayer(ctx, a, arm.half, range, rgb, 0.3 * w);
    coneLayer(ctx, a, arm.half * 0.45, range, focus ? '235,250,255' : id === 'ember' ? '255,225,170' : '255,250,225', (focus ? 0.7 : 0.3) * w);
    if (!focus && index === 0) {
      for (let k = 0; k < 5; k += 1) {
        const off = Math.sin(t * 0.8 + k * 1.9) * arm.half * 0.8;
        coneLayer(ctx, a + off, 0.012 + 0.006 * k, range * 0.95, '255,248,220', 0.18 * dim);
      }
    } else if (focus) {
      // A bright line down the middle of the laser.
      ctx.strokeStyle = `rgba(255,255,255,${0.8 * arm.mul})`;
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.moveTo(LAMP.x, LAMP.y);
      ctx.lineTo(LAMP.x + Math.cos(a) * range, LAMP.y + Math.sin(a) * range);
      ctx.stroke();
    }
  });
  ctx.restore();
}

/** Glitter where the beam rakes across the water, and the lamp's reflection under the rock. */
export function drawBeamReflection(ctx, world, t) {
  const range = world.beamRange;
  const angle = world.beamAngle;
  const id = world.beamId;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (const arm of world.beamArms) {
    const a = angle + arm.off;
    const dx = Math.cos(a);
    const dy = Math.sin(a);
    for (let d = 90; d < range; d += 22) {
      const x = LAMP.x + dx * d;
      const y = LAMP.y + dy * d;
      if (y < HORIZON + 8) continue;
      const spread = Math.tan(arm.half) * d;
      for (let k = 0; k < 2; k += 1) {
        const phase = Math.sin(t * 4 + d * 0.31 + k * 7.1);
        if (phase < -0.15) continue;
        const ox = Math.sin(d * 12.9898 + k * 78.2) * spread * 0.9;
        const fade = (1 - d / range) * 0.75 * arm.mul;
        ctx.fillStyle = id === 'ember' ? `rgba(255,170,100,${fade * 0.7})` : `rgba(255,248,220,${fade * 0.7})`;
        ctx.fillRect(x + ox * -dy - 7, y + ox * dx + 8, 14 + 8 * phase, 2);
      }
    }
  }
  // The lamp's own reflection, a broken column of light on the water below the tower.
  for (let i = 0; i < 9; i += 1) {
    const y = 704 + i * 10;
    const w = 40 - i * 3 + Math.sin(t * 2.4 + i * 1.3) * 7;
    ctx.fillStyle = `rgba(255,224,150,${0.4 - i * 0.04})`;
    ctx.fillRect(LAMP.x - w / 2 + Math.sin(t * 1.7 + i) * 6, y, w, 3);
  }
  ctx.restore();
}

/** Lightning: Storm Coil bolts run from the lamp, Storm Call bolts fall from the sky. */
export function drawBolts(ctx, world) {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  for (const b of world.bolts) {
    const alpha = Math.min(1, b.life / 0.2);
    const segs = 9;
    const x0 = b.top ? b.x + (b.seed - 0.5) * 120 : LAMP.x;
    const y0 = b.top ? 0 : LAMP.y;
    const jag = (i, axis) => Math.sin(b.seed * 97 + i * 12.9898 + axis * 78.233 + Math.floor(b.life * 40)) * 14;
    for (let pass = 0; pass < 2; pass += 1) {
      ctx.strokeStyle = pass === 0 ? `rgba(120,160,255,${0.45 * alpha})` : `rgba(240,248,255,${alpha})`;
      ctx.lineWidth = pass === 0 ? 8 : 2.2;
      ctx.beginPath();
      ctx.moveTo(x0, y0);
      for (let i = 1; i < segs; i += 1) {
        const k = i / segs;
        ctx.lineTo(x0 + (b.x - x0) * k + jag(i, 0), y0 + (b.y - y0) * k + jag(i, 1));
      }
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
    }
    if (b.top) {
      const g = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, 60);
      g.addColorStop(0, `rgba(220,235,255,${0.8 * alpha})`);
      g.addColorStop(1, 'rgba(220,235,255,0)');
      ctx.fillStyle = g;
      ctx.fillRect(b.x - 60, b.y - 60, 120, 120);
    }
  }
  ctx.restore();
}

/** Pulse Nova rings spreading from the foot of the tower. */
export function drawRings(ctx, world) {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (const ring of world.rings) {
    const k = Math.min(1, ring.t / 0.5);
    const r = ring.max * (1 - Math.pow(1 - k, 2));
    const fade = Math.max(0, 1 - ring.t / 0.9);
    for (let pass = 0; pass < 2; pass += 1) {
      ctx.strokeStyle = pass === 0 ? `rgba(255,200,110,${0.35 * fade})` : `rgba(255,248,214,${0.95 * fade})`;
      ctx.lineWidth = pass === 0 ? 22 * (1 - k * 0.5) : 4;
      ctx.beginPath();
      ctx.ellipse(PULSE_CENTER.x, PULSE_CENTER.y, r, r * 0.55, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
  }
  ctx.restore();
}

/** Lantern buoys: a bobbing red float, a hanging lantern and a pool of warm light on the water. */
export function drawBuoys(ctx, world, t) {
  ctx.save();
  for (const b of world.buoys) {
    const fade = Math.min(1, b.life / 0.8);
    const r = b.radius;
    ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createRadialGradient(b.x, b.y, 4, b.x, b.y, r);
    g.addColorStop(0, `rgba(255,220,140,${0.5 * fade})`);
    g.addColorStop(0.7, `rgba(255,170,80,${0.18 * fade})`);
    g.addColorStop(1, 'rgba(255,150,60,0)');
    ctx.save();
    ctx.translate(b.x, b.y);
    ctx.scale(1, 0.55);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    ctx.strokeStyle = `rgba(255,230,170,${0.55 * fade})`;
    ctx.lineWidth = 2;
    ctx.setLineDash([8, 10]);
    ctx.lineDashOffset = -t * 20;
    ctx.beginPath();
    ctx.ellipse(b.x, b.y, r, r * 0.55, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.globalCompositeOperation = 'source-over';
    const bob = Math.sin(t * 2.5 + b.x) * 2;
    ctx.globalAlpha = fade;
    ctx.fillStyle = '#c93a34';
    ctx.beginPath();
    ctx.ellipse(b.x, b.y + bob, 13, 7, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#e9e2cf';
    ctx.fillRect(b.x - 12, b.y + bob - 2, 24, 3);
    ctx.fillStyle = '#2a2a38';
    ctx.fillRect(b.x - 1.5, b.y + bob - 24, 3, 18);
    ctx.fillStyle = '#ffd98a';
    ctx.fillRect(b.x - 6, b.y + bob - 32, 12, 12);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'lighter';
    const lg = ctx.createRadialGradient(b.x, b.y + bob - 26, 0, b.x, b.y + bob - 26, 30);
    lg.addColorStop(0, `rgba(255,236,170,${0.9 * fade})`);
    lg.addColorStop(1, 'rgba(255,200,100,0)');
    ctx.fillStyle = lg;
    ctx.fillRect(b.x - 30, b.y + bob - 56, 60, 60);
    // Remaining time, as a ring.
    ctx.strokeStyle = 'rgba(255,240,200,0.8)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(b.x, b.y + bob - 26, 17, -Math.PI / 2, -Math.PI / 2 + (b.life / b.max) * Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();
}

export function drawParticles(ctx, world) {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (const p of world.particles) {
    const k = Math.max(0, p.life / p.max);
    ctx.fillStyle = `rgba(${p.color},${k})`;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size * (0.4 + k), 0, Math.PI * 2);
    ctx.fill();
  }
  // Pearls streaming up to the counter in the HUD.
  for (const o of world.orbs) {
    if (o.t < 0) continue;
    const k = o.t / o.life;
    const e = k * k;
    const x = o.x + (PEARL_HUD.x - o.x) * e;
    const y = o.y + (PEARL_HUD.y - o.y) * e - Math.sin(k * Math.PI) * 50;
    const g = ctx.createRadialGradient(x, y, 0, x, y, 12);
    g.addColorStop(0, 'rgba(230,255,255,1)');
    g.addColorStop(0.4, 'rgba(120,230,255,0.7)');
    g.addColorStop(1, 'rgba(80,200,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(x - 12, y - 12, 24, 24);
  }
  ctx.restore();
}

export function drawFloaters(ctx, world) {
  ctx.save();
  ctx.textAlign = 'center';
  for (const f of world.floaters) {
    ctx.globalAlpha = Math.min(1, f.life * 1.6);
    const size = f.size || 20;
    ctx.font = `800 ${size}px "Avenir Next", "Segoe UI", Helvetica, Arial, sans-serif`;
    ctx.lineWidth = Math.max(3, size / 5);
    ctx.lineJoin = 'round';
    ctx.strokeStyle = 'rgba(5,8,24,0.85)';
    ctx.strokeText(f.text, f.x, f.y);
    ctx.fillStyle = f.color || '#ffe9a8';
    ctx.fillText(f.text, f.x, f.y);
  }
  ctx.restore();
}

/** Mirror shards: faint crystals on the water; lit ones throw a reflected laser at the creature they aim at. */
export function drawMirrors(ctx, world, t) {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (const m of world.mirrors) {
    const k = m.lit;
    const bob = Math.sin(t * 1.6 + m.x * 0.01) * 3;
    const y = m.y + bob;
    const glow = ctx.createRadialGradient(m.x, y, 0, m.x, y, 46 + 40 * k);
    glow.addColorStop(0, `rgba(170,240,255,${0.28 + 0.6 * k})`);
    glow.addColorStop(1, 'rgba(170,240,255,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(m.x - 90, y - 90, 180, 180);
    ctx.beginPath();
    ctx.moveTo(m.x, y - 24);
    ctx.lineTo(m.x + 13, y);
    ctx.lineTo(m.x, y + 24);
    ctx.lineTo(m.x - 13, y);
    ctx.closePath();
    ctx.fillStyle = `rgba(200,245,255,${0.35 + 0.55 * k})`;
    ctx.fill();
    ctx.strokeStyle = `rgba(255,255,255,${0.5 + 0.5 * k})`;
    ctx.lineWidth = 2;
    ctx.stroke();
    if (m.on) {
      const range = MIRROR.reach + 40;
      const gradient = ctx.createLinearGradient(m.x, y, m.x + Math.cos(m.ang) * range, y + Math.sin(m.ang) * range);
      gradient.addColorStop(0, 'rgba(190,245,255,0.95)');
      gradient.addColorStop(1, 'rgba(120,210,255,0)');
      for (const [w, a] of [[16, 0.22], [7, 0.45], [2.6, 1]]) {
        ctx.strokeStyle = gradient;
        ctx.globalAlpha = a;
        ctx.lineWidth = w;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(m.x, y);
        ctx.lineTo(m.x + Math.cos(m.ang) * range, y + Math.sin(m.ang) * range);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
      // The bounce: a thin line from the lamp to the shard.
      ctx.strokeStyle = 'rgba(255,250,225,0.55)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(LAMP.x, LAMP.y);
      ctx.lineTo(m.x, y);
      ctx.stroke();
    }
  }
  ctx.restore();
}

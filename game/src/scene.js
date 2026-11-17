// The backdrop: a sky that turns from dusk to midnight to dawn, stars, sun or moon, god-rays, distant
// islands with a lit harbour town, ship silhouettes, layered sea, fog banks, shoreline foam, and the
// lighthouse itself. `pal` is the palette for the moment, from paletteAt().
import { BASE, H, HORIZON, LAMP, W } from './config.js';
import { Rng } from './random.js';

const hex = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const lerp = (a, b, k) => a + (b - a) * k;
const rgb = (c, a = 1) => `rgba(${Math.round(c[0])},${Math.round(c[1])},${Math.round(c[2])},${a})`;
const mixC = (a, b, k) => [lerp(a[0], b[0], k), lerp(a[1], b[1], k), lerp(a[2], b[2], k)];

// Three palettes. Colours are hex, numbers are plain.
const PALETTES = [
  { // Dusk: a bruised violet sky burning orange at the horizon, a low red sun.
    sky: ['#241848', '#6b2f72', '#d8644f', '#ffb56b'], seaTop: '#b25a66', seaMid: '#55386e', seaBot: '#080a1e',
    far: '#7a4a78', near: '#0b1230', land: '#2a1838', stars: 0.35, bodyX: 500, bodyY: 292, bodyR: 54, body: '#ffb36a', halo: '255,150,90',
    moon: 0, ray: '255,170,110', rayA: 0.13, haze: '255,150,100', fog: '255,170,150', accent: '#ffb36a',
  },
  { // Midnight: the original deep blue night with a pale moon.
    sky: ['#03050f', '#0b1236', '#1d2c60', '#33608a'], seaTop: '#2d5a88', seaMid: '#12315a', seaBot: '#040a1a',
    far: '#274c7c', near: '#071530', land: '#0a1226', stars: 1, bodyX: 1180, bodyY: 235, bodyR: 44, body: '#f2efdc', halo: '210,225,255',
    moon: 1, ray: '190,210,255', rayA: 0.1, haze: '90,170,200', fog: '120,160,210', accent: '#9fc4ff',
  },
  { // Dawn: a teal sky warming to rose and gold, the sun climbing on the right.
    sky: ['#142a52', '#3b5c8e', '#e59a8e', '#ffe3a6'], seaTop: '#d79f94', seaMid: '#2d5b85', seaBot: '#0a1c36',
    far: '#6e8fb0', near: '#0c2444', land: '#26304e', stars: 0.1, bodyX: 1030, bodyY: 282, bodyR: 60, body: '#fff1b8', halo: '255,225,150',
    moon: 0, ray: '255,236,170', rayA: 0.18, haze: '255,215,160', fog: '255,225,200', accent: '#ffd98a',
  },
];
const nums = (str) => str.split(',').map(Number);
const PARSED = PALETTES.map((p) => ({ ...p, sky: p.sky.map(hex), seaTop: hex(p.seaTop), seaMid: hex(p.seaMid), seaBot: hex(p.seaBot), far: hex(p.far), near: hex(p.near), land: hex(p.land), body: hex(p.body), accent: hex(p.accent), halo: nums(p.halo), ray: nums(p.ray), haze: nums(p.haze), fog: nums(p.fog) }));

// Where each palette holds, as a position on the run's tide line (wave - 1 + progress).
const KEYS = [[0, 0], [2.6, 0], [4.4, 1], [7.4, 1], [8.9, 2], [12, 2]];

function blend(a, b, k) {
  const out = {};
  for (const key of Object.keys(a)) {
    const x = a[key];
    const y = b[key];
    if (typeof x === 'number') out[key] = lerp(x, y, k);
    else if (Array.isArray(x) && Array.isArray(x[0])) out[key] = x.map((c, i) => mixC(c, y[i], k));
    else if (Array.isArray(x)) out[key] = mixC(x, y, k);
    else out[key] = k < 0.5 ? x : y;
  }
  return out;
}

/** The palette at tide position `f` (0 at the start of wave 1, 12 at the end of wave 12). */
export function paletteAt(f) {
  let i = 0;
  while (i < KEYS.length - 2 && f > KEYS[i + 1][0]) i += 1;
  const [f0, p0] = KEYS[i];
  const [f1, p1] = KEYS[i + 1];
  const k = Math.max(0, Math.min(1, (f - f0) / (f1 - f0 || 1)));
  const smooth = k * k * (3 - 2 * k);
  const pal = blend(PARSED[p0], PARSED[p1], smooth);
  pal.accentCss = rgb(pal.accent);
  return pal;
}

const starRng = new Rng(7);
const STARS = Array.from({ length: 200 }, () => ({
  x: starRng.range(0, W),
  y: Math.pow(starRng.next(), 1.35) * (HORIZON - 24),
  size: starRng.range(0.5, 1.9),
  phase: starRng.range(0, 6.28),
  speed: starRng.range(0.8, 2.4),
}));

const CLOUDS = Array.from({ length: 7 }, () => ({
  x: starRng.range(0, W + 400),
  y: starRng.range(50, 250),
  w: starRng.range(220, 420),
  h: starRng.range(18, 34),
  speed: starRng.range(3, 9),
}));

const FOG = Array.from({ length: 5 }, () => ({
  x: starRng.range(0, W + 600),
  y: HORIZON + starRng.range(-6, 60),
  w: starRng.range(380, 640),
  h: starRng.range(18, 40),
  speed: starRng.range(2, 6),
}));

const ISLANDS = [
  { x: 150, w: 330, h: 46, town: true },
  { x: 560, w: 120, h: 14 },
  { x: 820, w: 200, h: 24, beacon: true },
  { x: 1150, w: 250, h: 38 },
];

const SHIPS = [
  { x: 380, speed: 3.2, size: 1, lit: true },
  { x: 930, speed: -2.2, size: 0.75, lit: false },
];

// Sea layers from far to near: baseline, amplitude, swell speed.
const LAYERS = [
  { y: 344, amp: 3, speed: 0.6, freq: 0.012 },
  { y: 384, amp: 5, speed: 0.8, freq: 0.009 },
  { y: 442, amp: 7, speed: 1.0, freq: 0.007 },
  { y: 520, amp: 9, speed: 1.2, freq: 0.0065 },
  { y: 650, amp: 12, speed: 1.5, freq: 0.0055 },
  { y: 730, amp: 14, speed: 1.8, freq: 0.005 },
];

export const FAR_LAYERS = 4;

function softEllipse(ctx, x, y, rx, ry, color, alpha) {
  const g = ctx.createRadialGradient(x, y, 2, x, y, rx);
  g.addColorStop(0, rgb(color, alpha));
  g.addColorStop(1, rgb(color, 0));
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(1, ry / rx);
  ctx.translate(-x, -y);
  ctx.fillStyle = g;
  ctx.fillRect(x - rx, y - rx, rx * 2, rx * 2);
  ctx.restore();
}

function drawIslands(ctx, pal, t) {
  const land = pal.land;
  for (const isl of ISLANDS) {
    ctx.fillStyle = rgb(land);
    ctx.beginPath();
    ctx.moveTo(isl.x - isl.w / 2, HORIZON + 6);
    const n = 9;
    for (let i = 0; i <= n; i += 1) {
      const k = i / n;
      const bump = Math.sin(k * Math.PI) * isl.h * (0.75 + 0.25 * Math.sin(k * 11 + isl.x));
      ctx.lineTo(isl.x - isl.w / 2 + k * isl.w, HORIZON + 6 - bump);
    }
    ctx.lineTo(isl.x + isl.w / 2, HORIZON + 6);
    ctx.closePath();
    ctx.fill();
    // Rim light from the sky on the island's crest.
    ctx.strokeStyle = rgb(mixC(land, pal.sky[3], 0.45), 0.55);
    ctx.lineWidth = 1.2;
    ctx.stroke();
    if (isl.town) {
      // The harbour town: tiny roofs and lit windows climbing the hill.
      for (let i = 0; i < 13; i += 1) {
        const k = (i + 0.5) / 13;
        const hx = isl.x - isl.w / 2 + 28 + k * (isl.w - 56);
        const hy = HORIZON + 5 - Math.sin(k * Math.PI) * isl.h * 0.62 + ((i * 7) % 3) * 2;
        const w = 9 + (i % 3) * 2;
        ctx.fillStyle = rgb(mixC(land, [10, 8, 20], 0.35));
        ctx.fillRect(hx - w / 2, hy - 8, w, 9);
        ctx.beginPath();
        ctx.moveTo(hx - w / 2 - 1.5, hy - 8);
        ctx.lineTo(hx, hy - 14);
        ctx.lineTo(hx + w / 2 + 1.5, hy - 8);
        ctx.fill();
        if ((i * 5) % 4 !== 1) {
          ctx.fillStyle = `rgba(255,214,130,${0.7 + 0.25 * Math.sin(t * 1.3 + i)})`;
          ctx.fillRect(hx - 1.5, hy - 5, 3, 3);
        }
      }
      // The harbour church spire.
      ctx.fillStyle = rgb(mixC(land, [10, 8, 20], 0.35));
      ctx.fillRect(isl.x + 4, HORIZON - 40, 6, 28);
      ctx.beginPath();
      ctx.moveTo(isl.x + 2, HORIZON - 40);
      ctx.lineTo(isl.x + 7, HORIZON - 54);
      ctx.lineTo(isl.x + 12, HORIZON - 40);
      ctx.fill();
    }
    if (isl.beacon) {
      const on = 0.6 + 0.4 * Math.sin(t * 2.2);
      softEllipse(ctx, isl.x, HORIZON - 22, 20, 20, [255, 120, 90], 0.8 * on);
      ctx.fillStyle = '#ff8a6a';
      ctx.fillRect(isl.x - 1.5, HORIZON - 24, 3, 3);
    }
  }
}

function drawShips(ctx, pal, t) {
  for (const ship of SHIPS) {
    const x = (((ship.x + t * ship.speed) % (W + 200)) + W + 200) % (W + 200) - 100;
    ctx.save();
    ctx.translate(x, HORIZON + 5);
    ctx.scale(ship.size * Math.sign(ship.speed), ship.size);
    ctx.fillStyle = rgb(mixC(pal.land, [6, 6, 16], 0.4));
    ctx.beginPath();
    ctx.moveTo(-34, -6);
    ctx.lineTo(36, -6);
    ctx.lineTo(28, 3);
    ctx.lineTo(-26, 3);
    ctx.closePath();
    ctx.fill();
    ctx.fillRect(-1, -42, 2, 36);
    ctx.beginPath();
    ctx.moveTo(1, -40);
    ctx.lineTo(22, -12);
    ctx.lineTo(1, -12);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(-2, -34);
    ctx.lineTo(-18, -12);
    ctx.lineTo(-2, -12);
    ctx.fill();
    if (ship.lit) {
      ctx.fillStyle = 'rgba(255,214,130,0.9)';
      for (let i = -2; i <= 2; i += 1) ctx.fillRect(i * 9 - 1.5, -4, 3, 2.5);
    }
    ctx.restore();
  }
}

export function drawSky(ctx, t, pal) {
  const sky = ctx.createLinearGradient(0, 0, 0, HORIZON + 10);
  sky.addColorStop(0, rgb(pal.sky[0]));
  sky.addColorStop(0.45, rgb(pal.sky[1]));
  sky.addColorStop(0.8, rgb(pal.sky[2]));
  sky.addColorStop(1, rgb(pal.sky[3]));
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, HORIZON + 10);

  for (const s of STARS) {
    const a = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(t * s.speed + s.phase));
    ctx.fillStyle = `rgba(235,240,255,${a * pal.stars * (1 - (s.y / HORIZON) * 0.6)})`;
    ctx.fillRect(s.x, s.y, s.size, s.size);
  }

  const cloudCol = mixC(pal.sky[1], [8, 12, 30], 0.45);
  for (const c of CLOUDS) {
    const x = ((c.x + t * c.speed) % (W + 500)) - 250;
    softEllipse(ctx, x, c.y, c.w / 2, c.h, cloudCol, 0.6);
  }

  // Sun or moon: wide halo, disc, and craters when it is the moon.
  const bx = pal.bodyX;
  const by = pal.bodyY;
  const br = pal.bodyR;
  const halo = ctx.createRadialGradient(bx, by, br * 0.6, bx, by, br * 5.5);
  halo.addColorStop(0, `rgba(${pal.halo},0.5)`);
  halo.addColorStop(1, `rgba(${pal.halo},0)`);
  ctx.fillStyle = halo;
  ctx.fillRect(bx - br * 5.5, by - br * 5.5, br * 11, br * 11);
  ctx.fillStyle = rgb(pal.body);
  ctx.beginPath();
  ctx.arc(bx, by, br, 0, Math.PI * 2);
  ctx.fill();
  if (pal.moon > 0.02) {
    ctx.save();
    ctx.globalAlpha = pal.moon;
    ctx.beginPath();
    ctx.arc(bx, by, br, 0, Math.PI * 2);
    ctx.clip();
    ctx.fillStyle = 'rgba(160,160,140,0.35)';
    for (const [dx, dy, r] of [[-14, -10, 9], [12, 8, 12], [-6, 20, 6], [20, -16, 5]]) {
      ctx.beginPath();
      ctx.arc(bx + dx, by + dy, r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = 'rgba(30,40,90,0.28)';
    ctx.beginPath();
    ctx.arc(bx + 26, by + 6, br, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // God-rays: pale shafts fanning down from the sun or moon through the clouds.
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 6; i += 1) {
    const a = Math.PI / 2 + (i - 2.5) * 0.17 + Math.sin(t * 0.25 + i * 2) * 0.03;
    const len = 560;
    const g = ctx.createLinearGradient(bx, by, bx + Math.cos(a) * len, by + Math.sin(a) * len);
    g.addColorStop(0, `rgba(${pal.ray},${pal.rayA * (0.7 + 0.3 * Math.sin(t * 0.6 + i))})`);
    g.addColorStop(1, `rgba(${pal.ray},0)`);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(bx - 4, by);
    ctx.lineTo(bx + Math.cos(a - 0.045) * len, by + Math.sin(a - 0.045) * len);
    ctx.lineTo(bx + Math.cos(a + 0.045) * len, by + Math.sin(a + 0.045) * len);
    ctx.lineTo(bx + 4, by);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();

  // Haze where the sky meets the sea.
  const haze = ctx.createRadialGradient(W / 2, HORIZON, 10, W / 2, HORIZON, 720);
  haze.addColorStop(0, `rgba(${pal.haze},0.34)`);
  haze.addColorStop(1, `rgba(${pal.haze},0)`);
  ctx.fillStyle = haze;
  ctx.fillRect(0, 0, W, HORIZON + 30);

  drawIslands(ctx, pal, t);
  drawShips(ctx, pal, t);
}

function waveY(layer, x, t, index) {
  return layer.y + Math.sin(x * layer.freq + t * layer.speed + index * 2) * layer.amp + Math.sin(x * layer.freq * 2.3 - t * layer.speed * 0.7) * layer.amp * 0.45;
}

/** Fill the water below the horizon once, before any layer is laid over it. */
export function drawSeaBase(ctx, pal) {
  const g = ctx.createLinearGradient(0, HORIZON, 0, H);
  g.addColorStop(0, rgb(pal.seaTop));
  g.addColorStop(0.35, rgb(pal.seaMid));
  g.addColorStop(1, rgb(pal.seaBot));
  ctx.fillStyle = g;
  ctx.fillRect(0, HORIZON, W, H - HORIZON);
}

/** Draw sea layers from `from` up to (not including) `to`. */
export function drawSeaLayers(ctx, t, from, to, pal) {
  for (let i = from; i < to; i += 1) {
    const layer = LAYERS[i];
    const color = mixC(pal.far, pal.near, i / (LAYERS.length - 1));
    const g = ctx.createLinearGradient(0, layer.y - 20, 0, layer.y + 130);
    g.addColorStop(0, rgb(color));
    g.addColorStop(1, 'rgba(4,10,26,0.92)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(0, H);
    for (let x = 0; x <= W; x += 16) ctx.lineTo(x, waveY(layer, x, t, i));
    ctx.lineTo(W, H);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = rgb(mixC([150, 200, 255], pal.sky[3], 0.4), 0.1 + i * 0.035);
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (let x = 0; x <= W; x += 16) {
      const y = waveY(layer, x, t, i);
      if (x === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // Sun or moon glinting on the crests.
    ctx.fillStyle = rgb(mixC(pal.body, [255, 255, 255], 0.4), 0.5);
    for (let k = -3; k <= 3; k += 1) {
      const gx = pal.bodyX + k * 16 + Math.sin(t * 0.9 + k + i) * 6;
      const gw = 10 - Math.abs(k) * 1.2;
      ctx.fillRect(gx - gw / 2, waveY(layer, gx, t, i) + 3 + (k % 2) * 2, gw, 1.6);
    }
  }
}

/** Soft fog banks drifting over the far water. */
export function drawFog(ctx, t, pal) {
  for (const f of FOG) {
    const x = ((f.x + t * f.speed) % (W + 800)) - 400;
    softEllipse(ctx, x, f.y, f.w / 2, f.h, pal.sky[3], 0.17);
    softEllipse(ctx, x + 60, f.y + 10, f.w / 3, f.h * 0.7, [255, 255, 255], 0.05);
  }
}

/** Foam pulsing round the rock where the swell breaks on the shore. */
export function drawShoreFoam(ctx, t) {
  const cx = LAMP.x;
  ctx.save();
  ctx.lineCap = 'round';
  for (let ring = 0; ring < 3; ring += 1) {
    const k = (t * 0.35 + ring / 3) % 1;
    const spread = 118 + k * 46;
    ctx.strokeStyle = `rgba(235,246,255,${0.5 * (1 - k)})`;
    ctx.lineWidth = 3 - k * 2;
    ctx.beginPath();
    ctx.ellipse(cx + 4, 688, spread, 15 + k * 9, 0, 0.02 * Math.PI, 0.98 * Math.PI);
    ctx.stroke();
  }
  ctx.fillStyle = 'rgba(240,250,255,0.55)';
  for (let i = 0; i < 16; i += 1) {
    const a = (i / 16) * Math.PI;
    const wob = Math.sin(t * 2 + i * 1.7);
    ctx.beginPath();
    ctx.ellipse(cx + 4 + Math.cos(a) * (112 + wob * 3) * (i % 2 ? 1 : -1), 684 + Math.sin(a) * 12, 7 + (i % 3) * 3, 2.5, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function polygon(ctx, points, fill) {
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.moveTo(points[0][0], points[0][1]);
  for (let i = 1; i < points.length; i += 1) ctx.lineTo(points[i][0], points[i][1]);
  ctx.closePath();
  ctx.fill();
}

/** The lighthouse on its rock. `glow` (0..1) is how brightly the lamp burns. */
export function drawLighthouse(ctx, glow, t) {
  const cx = LAMP.x;
  // Rock.
  polygon(ctx, [[cx - 120, 690], [cx - 92, 640], [cx - 60, 610], [cx - 30, 592], [cx + 34, 594], [cx + 70, 614], [cx + 100, 648], [cx + 128, 690]], '#1a1f2c');
  polygon(ctx, [[cx - 60, 610], [cx - 30, 592], [cx + 34, 594], [cx + 20, 640], [cx - 40, 650]], '#2a3142');
  // Tower, banded red and cream.
  const top = 452;
  const bottom = BASE.y + 4;
  const bands = 6;
  for (let i = 0; i < bands; i += 1) {
    const y0 = top + ((bottom - top) * i) / bands;
    const y1 = top + ((bottom - top) * (i + 1)) / bands;
    const w0 = 24 + (i / bands) * 18;
    const w1 = 24 + ((i + 1) / bands) * 18;
    polygon(ctx, [[cx - w0, y0], [cx + w0, y0], [cx + w1, y1], [cx - w1, y1]], i % 2 === 0 ? '#d9d2bf' : '#a9302c');
  }
  // Shading on the right-hand side of the tower.
  ctx.fillStyle = 'rgba(8,10,30,0.38)';
  ctx.beginPath();
  ctx.moveTo(cx + 6, top);
  ctx.lineTo(cx + 24, top);
  ctx.lineTo(cx + 42, bottom);
  ctx.lineTo(cx + 12, bottom);
  ctx.closePath();
  ctx.fill();
  // Door and windows.
  ctx.fillStyle = '#251a15';
  ctx.fillRect(cx - 7, bottom - 30, 14, 30);
  ctx.fillStyle = `rgba(255,220,140,${0.7 + 0.2 * Math.sin(t * 3)})`;
  ctx.fillRect(cx - 3, 500, 6, 11);
  ctx.fillRect(cx - 3, 548, 6, 11);
  // Gallery rail.
  polygon(ctx, [[cx - 36, top], [cx + 36, top], [cx + 40, top + 8], [cx - 40, top + 8]], '#1b2030');
  ctx.strokeStyle = '#1b2030';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(cx - 34, top - 12);
  ctx.lineTo(cx + 34, top - 12);
  ctx.stroke();
  for (let x = -32; x <= 32; x += 8) {
    ctx.beginPath();
    ctx.moveTo(cx + x, top);
    ctx.lineTo(cx + x, top - 12);
    ctx.stroke();
  }
  // Lamp room: glass, frame, roof.
  const lamp = ctx.createLinearGradient(0, top - 46, 0, top - 12);
  lamp.addColorStop(0, `rgba(255,${200 + 40 * glow},${120 + 80 * glow},1)`);
  lamp.addColorStop(1, 'rgba(255,240,200,1)');
  ctx.fillStyle = lamp;
  ctx.fillRect(cx - 20, top - 46, 40, 34);
  ctx.strokeStyle = '#1b2030';
  ctx.lineWidth = 3;
  ctx.strokeRect(cx - 20, top - 46, 40, 34);
  ctx.beginPath();
  ctx.moveTo(cx, top - 46);
  ctx.lineTo(cx, top - 12);
  ctx.stroke();
  polygon(ctx, [[cx - 27, top - 46], [cx + 27, top - 46], [cx + 4, top - 70], [cx - 4, top - 70]], '#6f1f26');
  polygon(ctx, [[cx - 4, top - 70], [cx + 4, top - 70], [cx + 1, top - 82], [cx - 1, top - 82]], '#1b2030');
}

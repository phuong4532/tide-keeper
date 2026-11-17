// Little line-art icons for upgrades, relics, abilities and beams, all drawn with canvas paths.
// drawIcon(ctx, name, cx, cy, size, color) fits the icon in a square about `size` wide.

function path(ctx, points, close = false) {
  ctx.beginPath();
  points.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)));
  if (close) ctx.closePath();
}

const PAINTERS = {
  cone(ctx, c) {
    path(ctx, [[-0.8, 0], [0.9, -0.7], [0.9, 0.7]], true);
    ctx.globalAlpha = 0.35;
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.stroke();
  },
  sun(ctx) {
    for (let i = 0; i < 8; i += 1) {
      const a = (i / 8) * Math.PI * 2;
      path(ctx, [[Math.cos(a) * 0.62, Math.sin(a) * 0.62], [Math.cos(a) * 0.95, Math.sin(a) * 0.95]]);
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.arc(0, 0, 0.36, 0, Math.PI * 2);
    ctx.fill();
  },
  cell(ctx) {
    ctx.strokeRect(-0.85, -0.45, 1.5, 0.9);
    ctx.fillRect(0.65, -0.18, 0.2, 0.36);
    ctx.fillRect(-0.7, -0.32, 0.35, 0.64);
    ctx.fillRect(-0.22, -0.32, 0.35, 0.64);
  },
  waves(ctx) {
    for (let r = -1; r <= 1; r += 1) {
      ctx.beginPath();
      for (let x = -0.9; x <= 0.9; x += 0.1) ctx.lineTo(x, r * 0.5 + Math.sin(x * 4) * 0.14);
      ctx.stroke();
    }
  },
  laser(ctx) {
    path(ctx, [[-0.9, 0], [0.9, 0]]);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(-0.9, 0, 0.2, 0, Math.PI * 2);
    ctx.fill();
    path(ctx, [[0.55, -0.35], [0.9, 0], [0.55, 0.35]]);
    ctx.stroke();
  },
  bolt(ctx) {
    path(ctx, [[0.25, -0.95], [-0.45, 0.1], [0.05, 0.12], [-0.25, 0.95], [0.55, -0.15], [0.05, -0.17]], true);
    ctx.fill();
  },
  clock(ctx) {
    ctx.beginPath();
    ctx.arc(0, 0, 0.8, 0, Math.PI * 2);
    ctx.stroke();
    path(ctx, [[0, -0.5], [0, 0], [0.35, 0.2]]);
    ctx.stroke();
  },
  nova(ctx) {
    for (const r of [0.3, 0.62, 0.92]) {
      ctx.beginPath();
      ctx.ellipse(0, 0, r, r * 0.6, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.arc(0, 0, 0.1, 0, Math.PI * 2);
    ctx.fill();
  },
  shield(ctx) {
    path(ctx, [[0, -0.95], [0.78, -0.62], [0.65, 0.35], [0, 0.95], [-0.65, 0.35], [-0.78, -0.62]], true);
    ctx.stroke();
    path(ctx, [[-0.28, 0], [0.28, 0]]);
    ctx.moveTo(0, -0.28);
    ctx.lineTo(0, 0.28);
    ctx.stroke();
  },
  pearl(ctx) {
    ctx.beginPath();
    ctx.arc(0, 0.1, 0.62, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(0, 0.1, 0.9, Math.PI * 0.95, Math.PI * 0.05, true);
    ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    ctx.beginPath();
    ctx.arc(-0.22, -0.12, 0.17, 0, Math.PI * 2);
    ctx.fill();
  },
  barnacle(ctx) {
    path(ctx, [[-0.8, 0.7], [-0.55, -0.4], [0, -0.85], [0.55, -0.4], [0.8, 0.7]], true);
    ctx.stroke();
    path(ctx, [[-0.4, 0.7], [-0.2, -0.3], [0, 0.7]]);
    path(ctx, [[0, 0.7], [0.2, -0.3], [0.4, 0.7]]);
    ctx.stroke();
  },
  bell(ctx) {
    ctx.beginPath();
    ctx.moveTo(-0.72, 0.5);
    ctx.quadraticCurveTo(-0.7, -0.8, 0, -0.8);
    ctx.quadraticCurveTo(0.7, -0.8, 0.72, 0.5);
    ctx.closePath();
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0, 0.72, 0.18, 0, Math.PI * 2);
    ctx.fill();
  },
  anchor(ctx) {
    path(ctx, [[0, -0.65], [0, 0.8]]);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0, -0.78, 0.16, 0, Math.PI * 2);
    ctx.stroke();
    path(ctx, [[-0.4, -0.3], [0.4, -0.3]]);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0, 0.2, 0.7, 0.1 * Math.PI, 0.9 * Math.PI);
    ctx.stroke();
  },
  feather(ctx) {
    ctx.beginPath();
    ctx.moveTo(-0.8, 0.85);
    ctx.quadraticCurveTo(-0.9, -0.5, 0.8, -0.85);
    ctx.quadraticCurveTo(0.9, 0.3, -0.8, 0.85);
    ctx.stroke();
    path(ctx, [[-0.8, 0.85], [0.4, -0.4]]);
    ctx.stroke();
  },
  glass(ctx) {
    path(ctx, [[-0.55, -0.85], [0.55, -0.85], [0.1, 0], [0.55, 0.85], [-0.55, 0.85], [-0.1, 0]], true);
    ctx.stroke();
    path(ctx, [[-0.3, 0.8], [0.3, 0.8], [0, 0.4]], true);
    ctx.fill();
  },
  crown(ctx) {
    path(ctx, [[-0.85, 0.55], [-0.75, -0.5], [-0.35, 0], [0, -0.7], [0.35, 0], [0.75, -0.5], [0.85, 0.55]], true);
    ctx.stroke();
    ctx.fillRect(-0.85, 0.55, 1.7, 0.22);
  },
  heart(ctx) {
    ctx.beginPath();
    ctx.moveTo(0, 0.8);
    ctx.bezierCurveTo(-1.1, 0.05, -0.7, -0.9, 0, -0.35);
    ctx.bezierCurveTo(0.7, -0.9, 1.1, 0.05, 0, 0.8);
    ctx.stroke();
    ctx.globalAlpha = 0.4;
    ctx.fill();
    ctx.globalAlpha = 1;
  },
  bottle(ctx) {
    ctx.strokeRect(-0.4, -0.2, 0.8, 1.05);
    path(ctx, [[-0.15, -0.2], [-0.15, -0.8], [0.15, -0.8], [0.15, -0.2]]);
    ctx.stroke();
    PAINTERS.bolt(ctx, null);
  },
  flame(ctx) {
    ctx.beginPath();
    ctx.moveTo(0, -0.95);
    ctx.bezierCurveTo(0.9, -0.1, 0.8, 0.85, 0, 0.9);
    ctx.bezierCurveTo(-0.8, 0.85, -0.7, 0, -0.2, -0.3);
    ctx.bezierCurveTo(-0.2, -0.6, 0, -0.7, 0, -0.95);
    ctx.fill();
  },
  prism(ctx) {
    path(ctx, [[0, -0.85], [0.8, 0.6], [-0.8, 0.6]], true);
    ctx.stroke();
    path(ctx, [[-1, -0.2], [-0.2, 0.05]]);
    ctx.stroke();
    for (const dy of [-0.35, 0, 0.35]) {
      path(ctx, [[0.25, 0.1], [1, 0.1 + dy]]);
      ctx.stroke();
    }
  },
  buoy(ctx) {
    ctx.beginPath();
    ctx.ellipse(0, 0.6, 0.7, 0.32, 0, 0, Math.PI * 2);
    ctx.fill();
    path(ctx, [[0, 0.4], [0, -0.3]]);
    ctx.stroke();
    ctx.strokeRect(-0.28, -0.85, 0.56, 0.55);
  },
  mend(ctx) {
    path(ctx, [[-0.6, 0], [0.6, 0]]);
    ctx.moveTo(0, -0.6);
    ctx.lineTo(0, 0.6);
    ctx.stroke();
  },
  reroll(ctx) {
    ctx.beginPath();
    ctx.arc(0, 0, 0.65, 0.3, Math.PI * 1.6);
    ctx.stroke();
    path(ctx, [[0.45, -0.75], [0.62, -0.3], [0.15, -0.35]]);
    ctx.stroke();
  },
  skull(ctx) {
    ctx.beginPath();
    ctx.arc(0, -0.1, 0.7, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillRect(-0.35, -0.2, 0.22, 0.28);
    ctx.fillRect(0.13, -0.2, 0.22, 0.28);
  },
};

// Abilities and beams reuse the shapes above under their own names.
PAINTERS.pulse = PAINTERS.nova;
PAINTERS.storm = PAINTERS.bolt;
PAINTERS.sunbeam = PAINTERS.sun;
PAINTERS.ember = PAINTERS.flame;

export function drawIcon(ctx, name, cx, cy, size, color) {
  const paint = PAINTERS[name];
  if (!paint) return;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(size / 2, size / 2);
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 0.14;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  paint(ctx, color);
  ctx.restore();
}

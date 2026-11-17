// Shared drawing helpers for every overlay: fonts, rounded rectangles, outlined text, panels and bars.
export const FONT = '"Avenir Next", "Segoe UI", Helvetica, Arial, sans-serif';
export const SERIF = 'Georgia, "Times New Roman", serif';

export function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export function text(ctx, str, x, y, size, color, align = 'left', weight = 700, family = FONT) {
  ctx.font = `${weight} ${size}px ${family}`;
  ctx.textAlign = align;
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = color;
  ctx.fillText(str, x, y);
}

/** Text with a dark outline so it reads over any part of the scene. */
export function outlined(ctx, str, x, y, size, color, align = 'left', weight = 800, family = FONT) {
  ctx.font = `${weight} ${size}px ${family}`;
  ctx.textAlign = align;
  ctx.textBaseline = 'alphabetic';
  ctx.lineWidth = Math.max(3, size / 7);
  ctx.lineJoin = 'round';
  ctx.strokeStyle = 'rgba(4,6,20,0.85)';
  ctx.strokeText(str, x, y);
  ctx.fillStyle = color;
  ctx.fillText(str, x, y);
}

export function panel(ctx, x, y, w, h, alpha = 0.62, edge = 'rgba(160,200,255,0.28)') {
  roundRect(ctx, x, y, w, h, 14);
  const g = ctx.createLinearGradient(0, y, 0, y + h);
  g.addColorStop(0, `rgba(12,18,46,${alpha})`);
  g.addColorStop(1, `rgba(4,8,26,${Math.min(1, alpha + 0.1)})`);
  ctx.fillStyle = g;
  ctx.fill();
  ctx.strokeStyle = edge;
  ctx.lineWidth = 1.5;
  ctx.stroke();
}

export function bar(ctx, x, y, w, h, frac, colorA, colorB) {
  roundRect(ctx, x, y, w, h, h / 2);
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.fill();
  const fill = Math.max(0, Math.min(1, frac)) * w;
  if (fill > h) {
    const g = ctx.createLinearGradient(x, 0, x + w, 0);
    g.addColorStop(0, colorA);
    g.addColorStop(1, colorB);
    roundRect(ctx, x, y, fill, h, h / 2);
    ctx.fillStyle = g;
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.22)';
    roundRect(ctx, x + 3, y + 2, Math.max(0, fill - 6), h / 3, h / 6);
    ctx.fill();
  }
  roundRect(ctx, x, y, w, h, h / 2);
  ctx.strokeStyle = 'rgba(200,225,255,0.4)';
  ctx.lineWidth = 1.5;
  ctx.stroke();
}

/** Wrap `str` to `maxWidth` and draw the lines centred (or left) from y; returns the lines used. */
export function wrapText(ctx, str, x, y, maxWidth, lineHeight, size, color, align = 'center', weight = 600) {
  ctx.font = `${weight} ${size}px ${FONT}`;
  let line = '';
  let row = 0;
  for (const word of str.split(' ')) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      text(ctx, line, x, y + row * lineHeight, size, color, align, weight);
      line = word;
      row += 1;
    } else line = test;
  }
  text(ctx, line, x, y + row * lineHeight, size, color, align, weight);
  return row + 1;
}

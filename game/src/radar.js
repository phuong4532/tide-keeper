// The little radar in the corner: the sea around the lighthouse, creatures as dots, the beam as a wedge.
import { BASE } from './config.js';
import { FONT } from './ui.js';

export const BLIP = {
  crab: '#ff7a5a', eel: '#5ff0e0', ghost: '#a8ffcf', leviathan: '#b58cff', jelly: '#ff9ae6',
  sprat: '#ffd27a', gunboat: '#8ec9ff', shell: '#ffa24a', kraken: '#ff4f9a',
};

const R = 76;
const CX = 98;
const CY = 692;

export function drawRadar(ctx, world, t, accent) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(CX, CY, R + 6, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(4,10,26,0.78)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(160,200,255,0.4)';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(CX, CY, R, 0, Math.PI * 2);
  ctx.clip();
  const g = ctx.createRadialGradient(CX, CY, 4, CX, CY, R);
  g.addColorStop(0, 'rgba(40,110,120,0.55)');
  g.addColorStop(1, 'rgba(10,40,60,0.45)');
  ctx.fillStyle = g;
  ctx.fillRect(CX - R, CY - R, R * 2, R * 2);
  ctx.strokeStyle = 'rgba(140,230,220,0.22)';
  ctx.lineWidth = 1;
  for (const r of [R * 0.33, R * 0.66]) {
    ctx.beginPath();
    ctx.arc(CX, CY, r, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.moveTo(CX - R, CY);
  ctx.lineTo(CX + R, CY);
  ctx.moveTo(CX, CY - R);
  ctx.lineTo(CX, CY + R);
  ctx.stroke();

  const project = (x, y) => {
    let dx = (x - BASE.x) * 0.115;
    let dy = (y - BASE.y) * 0.19;
    const d = Math.hypot(dx, dy);
    const edge = d > R - 4;
    if (edge) {
      dx *= (R - 4) / d;
      dy *= (R - 4) / d;
    }
    return { x: CX + dx, y: CY + dy, edge };
  };

  // The beam wedge.
  const half = Math.max(0.12, world.beamHalf * 1.3);
  ctx.fillStyle = 'rgba(255,230,150,0.28)';
  ctx.beginPath();
  ctx.moveTo(CX, CY - 8);
  ctx.arc(CX, CY - 8, R, world.beamAngle - half, world.beamAngle + half);
  ctx.closePath();
  ctx.fill();
  // Sweep line.
  const sweep = (t * 1.6) % (Math.PI * 2);
  ctx.strokeStyle = 'rgba(160,255,230,0.35)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(CX, CY);
  ctx.lineTo(CX + Math.cos(sweep) * R, CY + Math.sin(sweep) * R);
  ctx.stroke();

  for (const b of world.buoys) {
    const p = project(b.x, b.y);
    ctx.strokeStyle = 'rgba(255,220,140,0.9)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(p.x, p.y, b.radius * 0.115, 0, Math.PI * 2);
    ctx.stroke();
  }
  for (const e of world.enemies) {
    const p = project(e.x, e.y);
    const big = e.type === 'kraken' ? 6 : e.type === 'leviathan' || e.type === 'gunboat' ? 3.6 : e.type === 'sprat' || e.type === 'shell' ? 1.8 : 2.6;
    ctx.fillStyle = BLIP[e.type];
    ctx.globalAlpha = p.edge ? 0.6 : 1;
    ctx.beginPath();
    ctx.arc(p.x, p.y, big, 0, Math.PI * 2);
    ctx.fill();
    if (e.type === 'kraken') {
      ctx.strokeStyle = BLIP.kraken;
      ctx.lineWidth = 1.5;
      ctx.globalAlpha = 0.5 + 0.5 * Math.sin(t * 6);
      ctx.beginPath();
      ctx.arc(p.x, p.y, 9 + 2 * Math.sin(t * 6), 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }
  // The lighthouse in the middle.
  ctx.fillStyle = '#fff4c8';
  ctx.beginPath();
  ctx.arc(CX, CY, 4.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  ctx.save();
  ctx.font = `800 12px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.fillStyle = accent;
  ctx.fillText('RADAR', CX, CY - R - 12);
  ctx.restore();
}

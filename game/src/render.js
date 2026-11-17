// Draws one whole frame: the scene back to front, then the HUD or the screen laid over it.
import { drawBeam, drawBeamReflection, drawBolts, drawBuoys, drawFloaters, drawLampGlow, drawParticles, drawRings } from './beam.js';
import { drawEnemy } from './creatures.js';
import { H, W } from './config.js';
import { drawHud } from './hud.js';
import { FAR_LAYERS, drawFog, drawLighthouse, drawSeaBase, drawSeaLayers, drawShoreFoam, drawSky, paletteAt } from './scene.js';
import { drawOver, drawPause, drawWin } from './screens.js';
import { drawShop } from './shop.js';
import { drawTitle } from './title.js';
import { SCREEN_OVER, SCREEN_PLAY, SCREEN_SHOP, SCREEN_TITLE, SCREEN_WIN } from './world.js';

/** `ui` is { mouse: {x, y}, paused, muted }: things only the page knows about. */
export function render(ctx, world, ui) {
  const t = world.time;
  const pal = paletteAt(world.tideF);
  ctx.save();
  if (world.shake > 0) ctx.translate((Math.sin(t * 91) * world.shake) / 2, (Math.cos(t * 77) * world.shake) / 2);

  drawSky(ctx, t, pal);
  drawSeaBase(ctx, pal);
  drawSeaLayers(ctx, t, 0, FAR_LAYERS, pal);
  drawFog(ctx, t, pal);
  // Ghosts float above the water, so they are drawn after the sea creatures.
  for (const e of world.enemies) if (e.type !== 'ghost') drawEnemy(ctx, e, world.focusing);
  drawLighthouse(ctx, world.focusing ? 1 : 0.5, t);
  drawSeaLayers(ctx, t, FAR_LAYERS, 6, pal);
  drawShoreFoam(ctx, t);
  drawBuoys(ctx, world, t);
  for (const e of world.enemies) if (e.type === 'ghost') drawEnemy(ctx, e, world.focusing);
  drawBeamReflection(ctx, world, t);
  drawBeam(ctx, world, t);
  drawLampGlow(ctx, world, t);
  drawRings(ctx, world);
  drawBolts(ctx, world);
  drawParticles(ctx, world);
  drawFloaters(ctx, world);
  ctx.restore();

  if (world.flash > 0) {
    const g = ctx.createRadialGradient(W / 2, H / 2, H * 0.3, W / 2, H / 2, H * 0.9);
    g.addColorStop(0, 'rgba(255,40,40,0)');
    g.addColorStop(1, `rgba(255,40,40,${0.55 * world.flash})`);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  }
  // A soft vignette keeps the eye near the middle.
  const v = ctx.createRadialGradient(W / 2, H / 2, H * 0.55, W / 2, H / 2, H * 1.0);
  v.addColorStop(0, 'rgba(0,0,10,0)');
  v.addColorStop(1, 'rgba(0,0,10,0.45)');
  ctx.fillStyle = v;
  ctx.fillRect(0, 0, W, H);

  if (world.screen === SCREEN_PLAY) drawHud(ctx, world, ui, pal);
  if (world.screen === SCREEN_TITLE) drawTitle(ctx, world, ui, t);
  else if (world.screen === SCREEN_SHOP) drawShop(ctx, world, ui, t, pal);
  else if (world.screen === SCREEN_OVER) drawOver(ctx, world, t);
  else if (world.screen === SCREEN_WIN) drawWin(ctx, world, t);
  if (ui.paused) drawPause(ctx);
}

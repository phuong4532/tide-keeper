// The page glue: canvas sizing, the fixed-step game loop, keyboard and mouse, sound, and screenshot mode.
import { Sound } from './audio.js';
import { BEAM_ORDER, H, STEP, W } from './config.js';
import { Input } from './input.js';
import { render } from './render.js';
import { shopHit } from './shop.js';
import { titleHit } from './title.js';
import { stageShot } from './shots.js';
import { World, SCREEN_OVER, SCREEN_PLAY, SCREEN_SHOP, SCREEN_TITLE, SCREEN_WIN } from './world.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const status = document.getElementById('status');
const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seed = Number(params.get('seed')) || 1;

const world = new World(seed, !shot);
const input = new Input();
const sound = new Sound();
const ui = { mouse: { x: W / 2, y: 0 }, paused: false, muted: false };
let view = { scale: 1, x: 0, y: 0 };

function resize() {
  const dpr = window.devicePixelRatio || 1;
  canvas.width = Math.round(window.innerWidth * dpr);
  canvas.height = Math.round(window.innerHeight * dpr);
  const scale = Math.min(canvas.width / W, canvas.height / H);
  view = { scale, x: (canvas.width - W * scale) / 2, y: (canvas.height - H * scale) / 2 };
}

function toGame(event) {
  const rect = canvas.getBoundingClientRect();
  const dpr = canvas.width / rect.width;
  return { x: ((event.clientX - rect.left) * dpr - view.x) / view.scale, y: ((event.clientY - rect.top) * dpr - view.y) / view.scale };
}

function draw() {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = '#03050f';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.setTransform(view.scale, 0, 0, view.scale, view.x, view.y);
  ctx.beginPath();
  ctx.rect(0, 0, W, H);
  ctx.clip();
  ui.muted = sound.muted;
  render(ctx, world, ui);
}

function startRun() {
  ui.paused = false;
  input.clear();
  world.startRun();
}

function describe() {
  const names = { [SCREEN_TITLE]: 'Title screen', [SCREEN_PLAY]: `Wave ${world.wave}, hull ${world.hp}, score ${world.score}`, [SCREEN_SHOP]: `Shop, ${world.pearls} pearls`, [SCREEN_OVER]: `Game over, score ${world.score}`, [SCREEN_WIN]: `Victory, score ${world.score}` };
  status.textContent = names[world.screen];
}

const ABILITY_KEYS = { KeyQ: 'pulse', KeyE: 'buoy', KeyR: 'storm' };

function backToTitle() {
  ui.paused = false;
  input.clear();
  world.reset();
}

window.addEventListener('keydown', (event) => {
  sound.unlock();
  const code = event.code;
  if (['Space', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(code)) event.preventDefault();
  input.keyDown(code);
  if (event.repeat) return;
  const screen = world.screen;
  if (code === 'KeyM') sound.toggleMute();
  else if (ABILITY_KEYS[code]) {
    if (screen === SCREEN_PLAY && !ui.paused) input.cast(ABILITY_KEYS[code]);
  } else if (code === 'KeyP' || code === 'Escape') {
    if (screen === SCREEN_PLAY) ui.paused = !ui.paused;
  } else if (code === 'KeyX') {
    if (ui.paused) backToTitle();
  } else if (code === 'KeyT') {
    if (screen === SCREEN_OVER || screen === SCREEN_WIN) backToTitle();
  } else if (code === 'Enter' || (code === 'Space' && screen !== SCREEN_PLAY)) {
    if (screen === SCREEN_SHOP) world.nextWave();
    else if (screen === SCREEN_TITLE || screen === SCREEN_OVER || screen === SCREEN_WIN) startRun();
  } else if (code === 'Digit1' || code === 'Digit2' || code === 'Digit3') {
    const index = Number(code.slice(5)) - 1;
    if (screen === SCREEN_SHOP) world.buy(index);
    else if (screen === SCREEN_TITLE) pickBeam(BEAM_ORDER[index]);
  }
});
window.addEventListener('keyup', (event) => input.keyUp(event.code));
window.addEventListener('blur', () => {
  input.clear();
  if (world.screen === SCREEN_PLAY) ui.paused = true;
});

canvas.addEventListener('pointermove', (event) => {
  const p = toGame(event);
  ui.mouse = p;
  input.pointAt(p.x, p.y);
});
function pickBeam(id) {
  if (!world.selectBeam(id)) world.unlockBeam(id);
}

canvas.addEventListener('pointerdown', (event) => {
  sound.unlock();
  const p = toGame(event);
  ui.mouse = p;
  input.pointAt(p.x, p.y);
  if (world.screen === SCREEN_SHOP) {
    const hit = shopHit(p.x, p.y);
    if (hit && hit.card !== undefined) world.buy(hit.card);
    else if (hit && hit.button === 'mend') world.mend();
    else if (hit && hit.button === 'reroll') world.reroll();
    else if (hit && hit.button === 'go') world.nextWave();
  } else if (world.screen === SCREEN_PLAY) {
    if (ui.paused) ui.paused = false;
    else input.mouseDown = true;
  } else if (world.screen === SCREEN_TITLE) {
    const hit = titleHit(p.x, p.y);
    if (hit && hit.beam) pickBeam(hit.beam);
    else startRun();
  } else startRun();
});
window.addEventListener('pointerup', () => {
  input.mouseDown = false;
});

window.addEventListener('resize', resize);
resize();

if (shot) {
  // Screenshot mode: one fixed, deterministic frame (the scene stays still so every capture matches).
  stageShot(shot, world, seed);
  // The scene never moves, so a short run of frames is all a capture needs.
  let frames = 0;
  const frame = () => {
    draw();
    document.documentElement.dataset.ready = '1';
    frames += 1;
    if (frames < 20) requestAnimationFrame(frame);
  };
  frame();
} else {
  let last = performance.now();
  let acc = 0;
  let statusTimer = 0;
  const frame = (now) => {
    acc += Math.min(0.1, (now - last) / 1000);
    last = now;
    while (acc >= STEP) {
      acc -= STEP;
      if (!ui.paused) world.step(STEP, input.read(STEP));
    }
    for (const name of world.events.splice(0)) sound.play(name);
    statusTimer += 1;
    if (statusTimer % 30 === 0) describe();
    draw();
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
}

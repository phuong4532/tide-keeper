// Takes the screenshots from shots.json with headless Chrome over the DevTools protocol, and reports any
// console error or uncaught exception the page logs. Serve game/ first (node serve.ts --port 8765).
//   node tools/capture.mjs [outDir] [name-filter] [quality]
import { spawn } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const CHROME = process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const BASE = process.env.BASE || 'http://localhost:8765/index.html';
const outDir = process.argv[2] || 'screenshots';
const filter = process.argv[3] || '';
const quality = Number(process.argv[4]) || 82;
const port = 9300 + Math.floor(Math.random() * 500);
const shots = JSON.parse(readFileSync(new URL('../shots.json', import.meta.url), 'utf8')).filter((s) => s.name.includes(filter));
const extra = process.env.EXTRA_URLS ? process.env.EXTRA_URLS.split(',') : [];
mkdirSync(outDir, { recursive: true });

const chrome = spawn(CHROME, ['--headless=new', '--disable-gpu', '--hide-scrollbars', `--remote-debugging-port=${port}`, `--user-data-dir=${join(tmpdir(), `tk-cap-${port}`)}`, '--window-size=1280,800', 'about:blank'], { stdio: 'ignore' });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let version;
for (let i = 0; i < 100 && !version; i += 1) {
  try {
    version = await (await fetch(`http://127.0.0.1:${port}/json/version`)).json();
  } catch (error) {
    await sleep(300);
  }
}
if (!version) throw new Error('Chrome did not start');

async function open(url) {
  const tab = await (await fetch(`http://127.0.0.1:${port}/json/new?about:blank`, { method: 'PUT' })).json();
  const ws = new WebSocket(tab.webSocketDebuggerUrl);
  await new Promise((r) => (ws.onopen = r));
  let id = 0;
  const pending = new Map();
  const problems = [];
  ws.onmessage = (event) => {
    const msg = JSON.parse(event.data);
    if (msg.id && pending.has(msg.id)) pending.get(msg.id)(msg);
    else if (msg.method === 'Runtime.exceptionThrown') problems.push(`exception: ${msg.params.exceptionDetails.exception?.description || msg.params.exceptionDetails.text}`);
    else if (msg.method === 'Runtime.consoleAPICalled' && ['error', 'assert'].includes(msg.params.type)) problems.push(`console.${msg.params.type}: ${msg.params.args.map((a) => a.value ?? a.description).join(' ')}`);
    else if (msg.method === 'Log.entryAdded' && msg.params.entry.level === 'error') problems.push(`log: ${msg.params.entry.text} ${msg.params.entry.url || ''}`);
  };
  const send = (method, params = {}) => new Promise((resolve) => {
    id += 1;
    pending.set(id, resolve);
    ws.send(JSON.stringify({ id, method, params }));
  });
  await send('Runtime.enable');
  await send('Log.enable');
  await send('Page.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 800, deviceScaleFactor: 1, mobile: false });
  await send('Page.navigate', { url });
  return { send, problems, close: () => { ws.close(); fetch(`http://127.0.0.1:${port}/json/close/${tab.id}`); } };
}

for (const shot of shots) {
  const page = await open(BASE + shot.query);
  for (let i = 0; i < 200; i += 1) {
    const r = await page.send('Runtime.evaluate', { expression: 'document.documentElement.dataset.ready || ""' });
    if (r.result?.result?.value === '1') break;
    await sleep(200);
  }
  await sleep(400);
  const img = await page.send('Page.captureScreenshot', { format: 'jpeg', quality });
  writeFileSync(join(outDir, shot.name), Buffer.from(img.result.data, 'base64'));
  console.log(`${shot.name}: ${Math.round((img.result.data.length * 3) / 4 / 1024)} KiB, problems: ${page.problems.length ? page.problems.join(' | ') : 'none'}`);
  page.close();
}
for (const url of extra) {
  const page = await open(url);
  await sleep(2500);
  console.log(`${url}: problems: ${page.problems.length ? page.problems.join(' | ') : 'none'}`);
  page.close();
}
chrome.kill();
process.exit(0);

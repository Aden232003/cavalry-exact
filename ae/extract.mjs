// Mount one scene (scenes/aN.html) standalone in headless Chrome, step every 24fps frame,
// and dump every visible primitive to ae/data/aN.json.   usage: node ae/extract.mjs a4 [maxFrames]
import { createRequire } from 'module';
import fs from 'fs';
import path from 'path';
const require = createRequire(import.meta.url);
const puppeteer = require(process.env.HOME + '/.npm/_npx/c91f23417d24eb47/node_modules/puppeteer-core');

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const CHROME = process.env.HOME + '/.cache/hyperframes/chrome/chrome-headless-shell/mac_arm-152.0.7977.30/chrome-headless-shell-mac-arm64/chrome-headless-shell';
const PARTS = { a1: [0, 116], a2: [116, 252], a3: [252, 360], a4: [360, 516], a5: [516, 650], a6: [650, 703] }; // global frames [start,end)
const part = process.argv[2]; const maxF = +process.argv[3] || 1e9;
const [g0, g1] = PARTS[part];
const MIME = { '.png': 'image/png', '.jpg': 'image/jpeg', '.woff2': 'font/woff2', '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml' };

const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'shell', args: ['--force-color-profile=srgb', '--hide-scrollbars'] });
const page = await browser.newPage();
await page.setViewport({ width: 1080, height: 1080, deviceScaleFactor: 1 });
await page.setRequestInterception(true);
page.on('request', (r) => {
  const u = new URL(r.url());
  if (u.host === 'local') {
    const f = path.join(ROOT, decodeURIComponent(u.pathname));
    if (u.pathname === '/__stage.html') return r.respond({ status: 200, contentType: 'text/html', body: '<!DOCTYPE html><html><head><meta charset="utf-8"><style>html,body{margin:0;width:1080px;height:1080px;overflow:hidden;background:#000}#stage{position:relative;width:1080px;height:1080px;overflow:hidden}</style></head><body><div id="stage"></div></body></html>' });
    if (fs.existsSync(f)) return r.respond({ status: 200, contentType: MIME[path.extname(f)] || 'application/octet-stream', body: fs.readFileSync(f) });
    return r.respond({ status: 404, body: '' });
  }
  if (/jsdelivr|cdnjs/.test(u.host) && /gsap/.test(u.pathname)) {
    const local = path.join(ROOT, 'ae', 'gsap.min.js');
    if (fs.existsSync(local)) return r.respond({ status: 200, contentType: 'text/javascript', body: fs.readFileSync(local) });
  }
  r.continue();
});
page.on('pageerror', (e) => console.error('PAGEERR', e.message));
await page.goto('http://local/__stage.html');
await page.addScriptTag({ content: fs.readFileSync(path.join(ROOT, 'ae', 'walker.js'), 'utf8') });

// mount the template
const html = fs.readFileSync(path.join(ROOT, 'scenes', part + '.html'), 'utf8');
await page.evaluate(async (html) => {
  window.__timelines = window.__timelines || {};
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const frag = doc.querySelector('template').content;
  const stage = document.getElementById('stage');
  const scripts = [];
  for (const n of [...frag.childNodes]) {
    if (n.nodeName === 'SCRIPT') { scripts.push(n); continue; }
    stage.appendChild(document.importNode(n, true));
  }
  for (const s of scripts) {
    await new Promise((res, rej) => { const e = document.createElement('script');
      if (s.src) { e.src = s.src; e.onload = res; e.onerror = rej; } else { e.textContent = s.textContent; }
      document.body.appendChild(e); if (!s.src) res(); });
  }
}, html);
// fonts + images
await page.evaluate(async () => {
  const txt = document.getElementById('stage').innerText + '永道心念紀十山';
  const fams = new Set(); for (const ss of document.styleSheets) { try { for (const r of ss.cssRules) if (r.type === 5) fams.add(r.style.getPropertyValue('font-family').replace(/["']/g, '').trim()); } catch (e) {} }
  await Promise.all([...fams].map((f) => document.fonts.load(`64px "${f}"`, txt).catch(() => {})));
  await document.fonts.ready;
});
const assets = fs.readdirSync(path.join(ROOT, 'assets')).filter((f) => /\.(png|jpg)$/.test(f)).map((f) => 'http://local/assets/' + f);
await page.evaluate((a) => window.__aePreloadImages(a), assets);

const fontFaces = await page.evaluate(() => { const o = {}; for (const ss of document.styleSheets) { try { for (const r of ss.cssRules) if (r.type === 5) { const fam = r.style.getPropertyValue('font-family').replace(/["']/g, '').trim(); const m = r.style.getPropertyValue('src').match(/fonts\/([^"')]+)/); if (m) o[fam] = m[1]; } } catch (e) {} } return o; });
const key = part;
const frames = [];
const N = Math.min(g1 - g0, maxF);
const t0 = Date.now();
for (let f = 0; f < N; f++) {
  const t = f / 24;
  const prims = await page.evaluate(async (key, t) => {
    const tl = window.__timelines[key]; tl.seek(t, false); tl.pause();
    // let any fonts triggered by new text finish
    if (document.fonts.status !== 'loaded') await document.fonts.ready;
    return window.__aeCapture(document.getElementById('stage').firstElementChild.id === 'root' ? document.getElementById('stage').querySelector('#root') : document.getElementById('stage'));
  }, key, t);
  frames.push(prims);
  if (f % 20 === 0) process.stdout.write(`${part} f${f}/${N} prims=${prims.length} ${((Date.now() - t0) / 1000).toFixed(1)}s\n`);
}
if (process.env.SHOT) await page.screenshot({ path: process.env.SHOT });
fs.mkdirSync(path.join(ROOT, 'ae', 'data'), { recursive: true });
fs.writeFileSync(path.join(ROOT, 'ae', 'data', part + '.json'), JSON.stringify({ part, g0, g1, fontFaces, frames }));
console.log('wrote', part, frames.length, 'frames', (fs.statSync(path.join(ROOT, 'ae', 'data', part + '.json')).size / 1e6).toFixed(1) + 'MB');
await browser.close();

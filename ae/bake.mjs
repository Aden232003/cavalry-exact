// Render every unique box background (gradients + textures, no bg-colour) to ae/build/bg/<key>.png (transparent).
import { createRequire } from 'module';
import fs from 'fs';
import path from 'path';
const require = createRequire(import.meta.url);
const puppeteer = require(process.env.HOME + '/.npm/_npx/c91f23417d24eb47/node_modules/puppeteer-core');
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const CHROME = process.env.HOME + '/.cache/hyperframes/chrome/chrome-headless-shell/mac_arm-152.0.7977.30/chrome-headless-shell-mac-arm64/chrome-headless-shell';
const specs = JSON.parse(fs.readFileSync(path.join(ROOT, 'ae/build/bgspecs.json'), 'utf8'));
const out = path.join(ROOT, 'ae/build/bg'); fs.mkdirSync(out, { recursive: true });
const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'shell', args: ['--force-color-profile=srgb'] });
const page = await browser.newPage();
await page.setRequestInterception(true);
let cur = '';
page.on('request', (r) => { const u = new URL(r.url());
  if (u.host === 'local') { if (u.pathname === '/b.html') return r.respond({ status: 200, contentType: 'text/html', body: cur });
    const f = path.join(ROOT, decodeURIComponent(u.pathname)); return fs.existsSync(f) ? r.respond({ status: 200, body: fs.readFileSync(f) }) : r.respond({ status: 404, body: '' }); }
  r.continue(); });
let n = 0;
for (const [key, { spec, size }] of Object.entries(specs)) {
  const file = path.join(out, key + '.png'); if (fs.existsSync(file)) continue;
  const [w, h] = size;
  if (specs[key].gen) {
    const sp = specs[key];
    const d = sp.shape.map((q) => { const n = q.v.length; let dd = `M${q.v[0][0]},${q.v[0][1]}`;
      const seg = (j, k) => `C${q.v[j][0] + q.o[j][0]},${q.v[j][1] + q.o[j][1]} ${q.v[k][0] + q.i[k][0]},${q.v[k][1] + q.i[k][1]} ${q.v[k][0]},${q.v[k][1]}`;
      for (let j = 0; j < n - 1; j++) dd += seg(j, j + 1); if (q.c) dd += seg(n - 1, 0) + 'Z'; return dd; }).join(' ');
    cur = `<!DOCTYPE html><html><head><style>html,body{margin:0;background:transparent}</style></head><body><svg id="b" width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg"><defs>${sp.gen}</defs><path d="${d}" filter="url(#${sp.genId})"/></svg></body></html>`;
    await page.setViewport({ width: w, height: h });
    await page.goto('http://local/b.html', { waitUntil: 'networkidle0' });
    const el = await page.$('#b'); await el.screenshot({ path: file, omitBackground: true }); n++; continue;
  }
  // CSS paints the FIRST background layer on top -> emit in reverse order
  const layers = spec.slice().reverse().map((l) => { const [x, y, lw, lh] = [l.r[0] * w, l.r[1] * h, l.r[2] * w, l.r[3] * h];
    const bg = l.src ? `url(http://local/${l.src}) 0 0/100% 100% no-repeat` : l.grad;
    return `<div style="position:absolute;left:${x}px;top:${y}px;width:${lw}px;height:${lh}px;background:${bg}"></div>`; }).join('');
  cur = `<!DOCTYPE html><html><head><style>html,body{margin:0;background:transparent}</style></head><body><div id="b" style="position:relative;width:${w}px;height:${h}px;overflow:hidden">${layers}</div></body></html>`;
  await page.setViewport({ width: Math.max(w, 16), height: Math.max(h, 16) });
  await page.goto('http://local/b.html', { waitUntil: 'networkidle0' });
  const el = await page.$('#b'); await el.screenshot({ path: file, omitBackground: true }); n++;
}
await browser.close(); console.log('baked', n, 'of', Object.keys(specs).length);

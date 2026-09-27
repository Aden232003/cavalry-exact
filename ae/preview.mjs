// Re-draw compiled AE tracks (ae/build/aN.tracks.json) at given global frames using ONLY the keyframe data,
// the same way AE will evaluate it, and save PNGs for comparison.   node ae/preview.mjs a4 400,420,480 outdir
import { createRequire } from 'module';
import fs from 'fs';
import path from 'path';
const require = createRequire(import.meta.url);
const puppeteer = require(process.env.HOME + '/.npm/_npx/c91f23417d24eb47/node_modules/puppeteer-core');
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const CHROME = process.env.HOME + '/.cache/hyperframes/chrome/chrome-headless-shell/mac_arm-152.0.7977.30/chrome-headless-shell-mac-arm64/chrome-headless-shell';
const [part, list, outDir] = process.argv.slice(2);
const T = JSON.parse(fs.readFileSync(path.join(ROOT, 'ae', 'build', part + '.tracks.json'), 'utf8'));
const FM = JSON.parse(fs.readFileSync(path.join(ROOT, 'ae', 'fontmap.json'), 'utf8'));
fs.mkdirSync(outDir, { recursive: true });

const flat = (v) => (typeof v === 'number' ? [v] : v && v.v && v.i ? flat(v.v).concat(flat(v.i), flat(v.o)) : Array.isArray(v) ? v.flatMap(flat) : []);
function rebuild(tpl, nums) { let k = 0; const go = (v) => (typeof v === 'number' ? nums[k++] : v && v.v && v.i ? { v: go(v.v), i: go(v.i), o: go(v.o), c: v.c } : Array.isArray(v) ? v.map(go) : v); return go(tpl); }
function ev(p, f) {
  if (!p) return undefined; if ('s' in p) return p.s;
  const t = p.t, v = p.v; if (f <= t[0]) return v[0]; if (f >= t[t.length - 1]) return v[v.length - 1];
  let j = 0; while (t[j + 1] <= f) j++;
  const a = flat(v[j]), b = flat(v[j + 1]); if (a.length !== b.length) return v[j];
  const u = (f - t[j]) / (t[j + 1] - t[j]); return rebuild(v[j], a.map((x, i) => x + (b[i] - x) * u));
}
const hold = (p, f) => { if ('s' in p) return p.s; let j = 0; while (j + 1 < p.t.length && p.t[j + 1] <= f) j++; return p.v[j]; };
const rgba = (c, a = 1) => (c ? `rgba(${Math.round(c[0] * 255)},${Math.round(c[1] * 255)},${Math.round(c[2] * 255)},${(c.length > 3 ? c[3] : 1) * a})` : 'none');
const dOf = (shape) => shape.map((s) => { const n = s.v.length; let d = `M${s.v[0][0]},${s.v[0][1]}`;
  const seg = (j, k) => `C${s.v[j][0] + s.o[j][0]},${s.v[j][1] + s.o[j][1]} ${s.v[k][0] + s.i[k][0]},${s.v[k][1] + s.i[k][1]} ${s.v[k][0]},${s.v[k][1]}`;
  for (let j = 0; j < n - 1; j++) d += seg(j, j + 1); if (s.c) d += seg(n - 1, 0) + 'Z'; return d; }).join(' ');
function m3d(src, dst) { // homography rect->quad as CSS matrix3d
  const A = [], b = []; for (let i = 0; i < 4; i++) { const [x, y] = src[i], [u, v] = dst[i]; A.push([x, y, 1, 0, 0, 0, -u * x, -u * y]); b.push(u); A.push([0, 0, 0, x, y, 1, -v * x, -v * y]); b.push(v); }
  for (let c = 0; c < 8; c++) { let p = c; for (let r = c + 1; r < 8; r++) if (Math.abs(A[r][c]) > Math.abs(A[p][c])) p = r; [A[c], A[p]] = [A[p], A[c]]; [b[c], b[p]] = [b[p], b[c]];
    for (let r = 0; r < 8; r++) if (r !== c) { const f = A[r][c] / A[c][c]; for (let k = c; k < 8; k++) A[r][k] -= f * A[c][k]; b[r] -= f * b[c]; } }
  const h = b.map((v, i) => v / A[i][i]); return `matrix3d(${h[0]},${h[3]},0,${h[6]},${h[1]},${h[4]},0,${h[7]},0,0,1,0,${h[2]},${h[5]},0,1)`;
}
const fontFile = (ps) => { for (const [f, m] of Object.entries(FM)) if (m.ps === ps) return f; return null; };
const faces = Object.entries(FM).map(([f, m]) => `@font-face{font-family:"${m.ps}";src:url("http://local/fonts/${f}")}`).join('');

function frameHTML(g) {
  const f = g - T.g0; let body = '';
  for (const L of T.layers) {
    if (f < L.f0 || f > L.f1) continue;
    const op = ev(L.op, f) / 100; if (op <= 0.001) continue;
    let inner = '';
    const masks = (L.masks || []).map((m) => ev(m, f));
    if (L.k === 'box' || L.k === 'path') {
      const shape = ev(L.shape, f), fill = L.fill ? ev(L.fill, f) : null;
      let svg = '', post = '';
      for (const r of (L.orings || [])) svg += `<path d="${dOf(ev(r.shape, f))}" fill="none" stroke="${rgba(ev(r.c, f))}" stroke-width="${ev(r.w, f)}"/>`;
      if (fill && !L.gentex) svg += `<path d="${dOf(shape)}" fill="${rgba(fill)}" fill-rule="${L.rule === 2 ? 'evenodd' : 'nonzero'}"/>`;
      if (L.gentex) post += `<img src="http://local/ae/build/bg/${L.gentex}.png" style="position:absolute;left:0;top:0;width:1080px;height:1080px">`;
      if (L.bg) { const q = ev(L.bg.q, f); const [w, h] = L.bg.size;
        let im = L.bg.imgs.map((g) => `<img src="http://local/ae/build/bg/${g.key}.png" style="position:absolute;left:0;top:0;width:${w}px;height:${h}px;transform-origin:0 0;mix-blend-mode:${g.bm};transform:${m3d([[0, 0], [w, 0], [w, h], [0, h]], q)}">`).join('');
        if (L.needMatte) im = `<div style="position:absolute;inset:0;clip-path:path('${dOf(shape)}')">${im}</div>`;
        post = im; }
      if (L.stroke) { const w = ev(L.stroke.w, f), c = ev(L.stroke.c, f); svg += `<path d="${dOf(shape)}" fill="none" stroke="${rgba(c)}" stroke-width="${w}" stroke-linecap="${L.stroke.cap || 'butt'}" stroke-linejoin="${L.stroke.join || 'miter'}" ${L.stroke.dash ? `stroke-dasharray="${L.stroke.dash.join(' ')}"` : ''}/>`; }
      for (const r of (L.rings || []).slice().reverse()) post += `<svg width="1080" height="1080" style="position:absolute;left:0;top:0;overflow:visible"><path d="${dOf(ev(r.shape, f))}" fill="none" stroke="${rgba(ev(r.c, f))}" stroke-width="${ev(r.w, f)}"/></svg>`;
      if (L.border) svg += `<path d="${dOf(ev(L.border.shape, f))}" fill="none" stroke="${rgba(ev(L.border.c, f))}" stroke-width="${ev(L.border.w, f)}"/>`;
      inner += `<svg width="1080" height="1080" style="position:absolute;left:0;top:0;overflow:visible">${svg}</svg>` + post;
      for (const m of masks) inner = `<div style="position:absolute;inset:0;clip-path:path('${dOf([m])}')">${inner}</div>`;
    } else if (L.k === 'text') {
      const d = hold(L.doc, f); const [s, ps, size, color, stroke, trk] = d;
      const esc = s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
      const txt = `<svg width="1" height="1" style="position:absolute;left:0;top:0;overflow:visible"><text x="0" y="0" style="font-family:'${ps}';font-size:${size}px;letter-spacing:${trk / 1000 * size}px;white-space:pre" fill="${rgba(color)}" ${stroke ? `stroke="${rgba(stroke[1])}" stroke-width="${stroke[0]}"` : ''}>${esc}</text></svg>`;
      // put the baseline at y=0: line-height 0 puts the baseline roughly at 0 in Chrome
      if (L.route === 'affine') {
        const p = ev(L.pos, f), r = ev(L.rot, f), sc = ev(L.scl, f);
        let t = `<div style="position:absolute;left:0;top:0;transform-origin:0 0;transform:translate(${p[0]}px,${p[1]}px) rotate(${r}deg) scale(${sc[0] / 100},${sc[1] / 100})">${txt}`;
        for (const m of (process.env.NOMASK ? [] : masks)) t = t.replace(/^<div ([^>]*)>/, `<div $1><div style="position:absolute;left:-3000px;top:-3000px;width:6000px;height:6000px;clip-path:path('${dOf([{ v: m.v.map(([x, y]) => [x + 3000, y + 3000]), i: m.i, o: m.o, c: m.c }])}')"><div style="position:absolute;left:3000px;top:3000px">`) + '</div></div>';
        inner = t + '</div>';
      } else {
        const b0 = ev(L.b0, f), pin = ev(L.pin, f), [w, h] = L.box;
        let t = `<div style="position:absolute;left:${b0[0]}px;top:${b0[1]}px">${txt}</div>`;
        for (const m of masks) t = `<div style="position:absolute;inset:0;clip-path:path('${dOf([m])}')">${t}</div>`;
        // pin corners are UL,UR,LL,LR of the local box (w,h per frame is folded into pin)
        inner = `<div style="position:absolute;left:0;top:0;width:${w}px;height:${h}px;overflow:visible;transform-origin:0 0;transform:${m3d([[0, 0], [w, 0], [w, h], [0, h]], [pin[0], pin[1], pin[3], pin[2]])}">${t}</div>`;
      }
    }
    body += `<div style="position:absolute;inset:0;opacity:${op};${L.bl ? `mix-blend-mode:${L.bl};` : ''}">${inner}</div>`;
  }
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>${faces} html,body{margin:0;width:1080px;height:1080px;overflow:hidden;background:#000} span{display:block}</style></head><body><div style="position:relative;width:1080px;height:1080px;overflow:hidden;isolation:isolate">${body}</div></body></html>`;
}

const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'shell', args: ['--force-color-profile=srgb'] });
const page = await browser.newPage();
await page.setViewport({ width: 1080, height: 1080 });
await page.setRequestInterception(true);
let current = '';
page.on('request', (r) => { const u = new URL(r.url());
  if (u.host === 'local') { if (u.pathname === '/p.html') return r.respond({ status: 200, contentType: 'text/html', body: current });
    const f = path.join(ROOT, decodeURIComponent(u.pathname)); return fs.existsSync(f) ? r.respond({ status: 200, body: fs.readFileSync(f) }) : r.respond({ status: 404, body: '' }); }
  r.continue(); });
for (const g of list.split(',').map(Number)) {
  current = frameHTML(g);
  await page.goto('http://local/p.html', { waitUntil: 'networkidle0' });
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: path.join(outDir, `prev_${g}.png`) });
}
await browser.close();
console.log('ok');

// Page-side DOM walker: records every visible primitive of the mounted scene at the current frame,
// in screen (comp) coordinates, so the AE builder can recreate it as native layers.
(function () {
  let NEXT = 1;
  const idOf = (el) => (el.__aeid ||= NEXT++);
  const IMG = {}; // natural sizes of bg images

  // ---------- colour ----------
  const cv = document.createElement('canvas').getContext('2d');
  function col(s) {
    if (!s || s === 'transparent' || s === 'none') return null;
    let m = s.match(/rgba?\(([^)]+)\)/);
    if (!m) { cv.fillStyle = '#000'; cv.fillStyle = s; s = cv.fillStyle; m = s.match(/rgba?\(([^)]+)\)/);
      if (!m && s[0] === '#') { const n = parseInt(s.slice(1), 16); return [(n >> 16 & 255) / 255, (n >> 8 & 255) / 255, (n & 255) / 255, 1]; } }
    if (!m) return null;
    const p = m[1].split(/[ ,\/]+/).filter(Boolean).map(parseFloat);
    const a = p.length > 3 ? p[3] : 1;
    if (a <= 0.002) return null;
    return [p[0] / 255, p[1] / 255, p[2] / 255, a];
  }
  const px = (v) => parseFloat(v) || 0;

  // ---------- geometry helpers ----------
  function homog(src, dst) { // 4 pt pairs -> 3x3 (row-major, h33=1)
    const A = [], b = [];
    for (let i = 0; i < 4; i++) {
      const [x, y] = src[i], [u, v] = dst[i];
      A.push([x, y, 1, 0, 0, 0, -u * x, -u * y]); b.push(u);
      A.push([0, 0, 0, x, y, 1, -v * x, -v * y]); b.push(v);
    }
    const n = 8; // gaussian elimination
    for (let c = 0; c < n; c++) {
      let p = c; for (let r = c + 1; r < n; r++) if (Math.abs(A[r][c]) > Math.abs(A[p][c])) p = r;
      [A[c], A[p]] = [A[p], A[c]]; [b[c], b[p]] = [b[p], b[c]];
      const d = A[c][c]; if (Math.abs(d) < 1e-12) return null;
      for (let r = 0; r < n; r++) if (r !== c) { const f = A[r][c] / d; for (let k = c; k < n; k++) A[r][k] -= f * A[c][k]; b[r] -= f * b[c]; }
    }
    const h = b.map((v, i) => v / A[i][i]); h.push(1); return h;
  }
  const hap = (h, x, y) => { const w = h[6] * x + h[7] * y + h[8]; return [(h[0] * x + h[1] * y + h[2]) / w, (h[3] * x + h[4] * y + h[5]) / w]; };
  function hinv(h) {
    const [a, b, c, d, e, f, g, k, i] = h;
    const A = e * i - f * k, B = -(d * i - f * g), C = d * k - e * g;
    const det = a * A + b * B + c * C; if (Math.abs(det) < 1e-12) return null;
    return [A, -(b * i - c * k), b * f - c * e, B, a * i - c * g, -(a * f - c * d), C, -(a * k - b * g), a * e - b * d].map((v) => v / det);
  }

  // ---------- SVG path normaliser -> absolute cubic subpaths ----------
  function parsePath(d) {
    const toks = d.match(/[a-zA-Z]|[-+]?(?:\d*\.\d+|\d+\.?)(?:[eE][-+]?\d+)?/g) || [];
    let i = 0, cmd = '', x = 0, y = 0, sx = 0, sy = 0, lcx = 0, lcy = 0, lqx = 0, lqy = 0, prev = '';
    const subs = []; let cur = null;
    const num = () => parseFloat(toks[i++]);
    const start = (X, Y) => { cur = { p: [[X, Y]], segs: [], c: false }; subs.push(cur); };
    const C = (x1, y1, x2, y2, X, Y) => { if (!cur) start(x, y); cur.segs.push([x1, y1, x2, y2, X, Y]); x = X; y = Y; };
    const L = (X, Y) => C(x + (X - x) / 3, y + (Y - y) / 3, x + 2 * (X - x) / 3, y + 2 * (Y - y) / 3, X, Y);
    function arc(rx, ry, phi, fa, fs, X, Y) {
      if (rx === 0 || ry === 0) return L(X, Y);
      rx = Math.abs(rx); ry = Math.abs(ry); const cp = Math.cos(phi * Math.PI / 180), sp = Math.sin(phi * Math.PI / 180);
      const dx = (x - X) / 2, dy = (y - Y) / 2, x1 = cp * dx + sp * dy, y1 = -sp * dx + cp * dy;
      let l = x1 * x1 / (rx * rx) + y1 * y1 / (ry * ry); if (l > 1) { rx *= Math.sqrt(l); ry *= Math.sqrt(l); }
      let s = (rx * rx * ry * ry - rx * rx * y1 * y1 - ry * ry * x1 * x1) / (rx * rx * y1 * y1 + ry * ry * x1 * x1); s = Math.sqrt(Math.max(0, s)) * (fa === fs ? -1 : 1);
      const cx1 = s * rx * y1 / ry, cy1 = -s * ry * x1 / rx, cx = cp * cx1 - sp * cy1 + (x + X) / 2, cy = sp * cx1 + cp * cy1 + (y + Y) / 2;
      const ang = (ux, uy, vx, vy) => { const a = Math.atan2(ux * vy - uy * vx, ux * vx + uy * vy); return a; };
      let t1 = ang(1, 0, (x1 - cx1) / rx, (y1 - cy1) / ry), dt = ang((x1 - cx1) / rx, (y1 - cy1) / ry, (-x1 - cx1) / rx, (-y1 - cy1) / ry);
      if (!fs && dt > 0) dt -= 2 * Math.PI; if (fs && dt < 0) dt += 2 * Math.PI;
      const n = Math.ceil(Math.abs(dt) / (Math.PI / 2)), dd = dt / n, k = 4 / 3 * Math.tan(dd / 4);
      const pt = (t) => [cx + rx * Math.cos(t) * cp - ry * Math.sin(t) * sp, cy + rx * Math.cos(t) * sp + ry * Math.sin(t) * cp];
      const dp = (t) => [-rx * Math.sin(t) * cp - ry * Math.cos(t) * sp, -rx * Math.sin(t) * sp + ry * Math.cos(t) * cp];
      for (let j = 0; j < n; j++) {
        const a = t1 + j * dd, b = a + dd, p0 = pt(a), p1 = pt(b), d0 = dp(a), d1 = dp(b);
        C(p0[0] + k * d0[0], p0[1] + k * d0[1], p1[0] - k * d1[0], p1[1] - k * d1[1], j === n - 1 ? X : p1[0], j === n - 1 ? Y : p1[1]);
      }
    }
    while (i < toks.length) {
      if (/[a-zA-Z]/.test(toks[i])) cmd = toks[i++];
      const rel = cmd === cmd.toLowerCase(), U = cmd.toUpperCase(), ox = rel ? x : 0, oy = rel ? y : 0;
      switch (U) {
        case 'M': { const X = num() + ox, Y = num() + oy; start(X, Y); x = sx = X; y = sy = Y; cmd = rel ? 'l' : 'L'; break; }
        case 'L': L(num() + ox, num() + oy); break;
        case 'H': L(num() + ox, y); break;
        case 'V': L(x, num() + oy); break;
        case 'C': { const a = num() + ox, b = num() + oy, c = num() + ox, d2 = num() + oy, X = num() + ox, Y = num() + oy; C(a, b, c, d2, X, Y); lcx = c; lcy = d2; break; }
        case 'S': { const r1x = /[CS]/.test(prev) ? 2 * x - lcx : x, r1y = /[CS]/.test(prev) ? 2 * y - lcy : y; const c = num() + ox, d2 = num() + oy, X = num() + ox, Y = num() + oy; C(r1x, r1y, c, d2, X, Y); lcx = c; lcy = d2; break; }
        case 'Q': { const qx = num() + ox, qy = num() + oy, X = num() + ox, Y = num() + oy; C(x + 2 / 3 * (qx - x), y + 2 / 3 * (qy - y), X + 2 / 3 * (qx - X), Y + 2 / 3 * (qy - Y), X, Y); lqx = qx; lqy = qy; break; }
        case 'T': { const qx = /[QT]/.test(prev) ? 2 * x - lqx : x, qy = /[QT]/.test(prev) ? 2 * y - lqy : y; const X = num() + ox, Y = num() + oy; C(x + 2 / 3 * (qx - x), y + 2 / 3 * (qy - y), X + 2 / 3 * (qx - X), Y + 2 / 3 * (qy - Y), X, Y); lqx = qx; lqy = qy; break; }
        case 'A': { const rx = num(), ry = num(), ph = num(), fa = num(), fs = num(), X = num() + ox, Y = num() + oy; arc(rx, ry, ph, fa, fs, X, Y); break; }
        case 'Z': if (cur) { cur.c = true; } x = sx; y = sy; cur = null; break;
        default: i++;
      }
      prev = U;
    }
    return subs;
  }
  const ellipseSubs = (cx, cy, rx, ry) => { const k = 0.5522847498; return [{ p: [[cx + rx, cy]], c: true, segs: [
    [cx + rx, cy + k * ry, cx + k * rx, cy + ry, cx, cy + ry], [cx - k * rx, cy + ry, cx - rx, cy + k * ry, cx - rx, cy],
    [cx - rx, cy - k * ry, cx - k * rx, cy - ry, cx, cy - ry], [cx + k * rx, cy - ry, cx + rx, cy - k * ry, cx + rx, cy]] }]; };
  const polySubs = (pts, closed) => { const s = { p: [pts[0]], segs: [], c: closed };
    for (let j = 1; j < pts.length; j++) { const [ax, ay] = pts[j - 1], [bx, by] = pts[j]; s.segs.push([ax + (bx - ax) / 3, ay + (by - ay) / 3, ax + 2 * (bx - ax) / 3, ay + 2 * (by - ay) / 3, bx, by]); }
    return [s]; };
  function rrSubs(w, h, r) { // r=[tl,tr,br,bl] in local px
    const k = 0.5522847498, [a, b, c, d] = r.map((v) => Math.max(0, Math.min(v, w / 2, h / 2)));
    const s = { p: [[a, 0]], c: true, segs: [] }; const seg = (x1, y1, x2, y2, X, Y) => s.segs.push([x1, y1, x2, y2, X, Y]);
    const ln = (ax, ay, bx, by) => seg(ax + (bx - ax) / 3, ay + (by - ay) / 3, ax + 2 * (bx - ax) / 3, ay + 2 * (by - ay) / 3, bx, by);
    ln(a, 0, w - b, 0); if (b) seg(w - b + k * b, 0, w, b - k * b, w, b);
    ln(w, b, w, h - c); if (c) seg(w, h - c + k * c, w - c + k * c, h, w - c, h);
    ln(w - c, h, d, h); if (d) seg(d - k * d, h, 0, h - d + k * d, 0, h - d);
    ln(0, h - d, 0, a); if (a) seg(0, a - k * a, a - k * a, 0, a, 0);
    return [s];
  }
  // subpaths (cubic, local) -> AE shape JSON in screen coords via mapper
  function toAE(subs, map) {
    return subs.map((s) => {
      const V = [map(s.p[0][0], s.p[0][1])], I = [[0, 0]], O = [];
      for (const g of s.segs) {
        const p0 = V[V.length - 1], c1 = map(g[0], g[1]), c2 = map(g[2], g[3]), p1 = map(g[4], g[5]);
        O.push([c1[0] - p0[0], c1[1] - p0[1]]); V.push(p1); I.push([c2[0] - p1[0], c2[1] - p1[1]]);
      }
      O.push([0, 0]);
      if (s.c && V.length > 1) { const a = V[0], z = V[V.length - 1];
        if (Math.hypot(a[0] - z[0], a[1] - z[1]) < 1e-3) { I[0] = I[I.length - 1]; V.pop(); I.pop(); O.pop(); } }
      const r = (n) => Math.round(n * 100) / 100;
      return { v: V.map((q) => q.map(r)), i: I.map((q) => q.map(r)), o: O.map((q) => q.map(r)), c: !!s.c };
    });
  }

  // ---------- filters ----------
  function filterInfo(cs, el) {
    const f = cs.filter; if (!f || f === 'none') return null;
    const out = {};
    const m = f.match(/url\(["']?#([^"')]+)["']?\)/);
    if (m) { const fe = document.getElementById(m[1]); if (fe) {
      const prims = [...fe.children];
      const usesSrc = prims.some((p) => /Source(Graphic|Alpha)/.test(p.getAttribute('in') || '') || /Source(Graphic|Alpha)/.test(p.getAttribute('in2') || '') ||
        (!p.getAttribute('in') && p !== prims[0] && false));
      const first = prims[0] && prims[0].tagName.toLowerCase();
      const firstImplicit = first && first !== 'feturbulence' && first !== 'feflood' && first !== 'feimage';
      if (!usesSrc && !firstImplicit) { out.gen = fe.outerHTML; out.genId = m[1]; }
      for (const p of prims) {
        const t = p.tagName.toLowerCase();
        if (t === 'femorphology') { const r = parseFloat(p.getAttribute('radius')) || 0; out[p.getAttribute('operator') === 'erode' ? 'erode' : 'dilate'] = r; }
        else if (t === 'fedisplacementmap') out.disp = parseFloat(p.getAttribute('scale')) || 0;
        else if (t === 'feturbulence') { out.freq = parseFloat(p.getAttribute('baseFrequency')) || 0.05; out.oct = parseInt(p.getAttribute('numOctaves')) || 1; out.seed = parseFloat(p.getAttribute('seed')) || 0; }
        else if (t === 'fegaussianblur') out.blur = parseFloat(p.getAttribute('stdDeviation')) || 0;
        else if (t === 'feflood') out.flood = col(p.getAttribute('flood-color') || getComputedStyle(p).floodColor);
        else if (t === 'fecomponenttransfer') { const fa = p.querySelector('feFuncA'); if (fa) out.thresh = [parseFloat(fa.getAttribute('slope')) || 1, parseFloat(fa.getAttribute('intercept')) || 0]; }
      } } }
    let g;
    if ((g = f.match(/grayscale\(([^)]+)\)/))) out.gray = parseFloat(g[1]);
    if ((g = f.match(/brightness\(([^)]+)\)/))) out.bright = parseFloat(g[1]);
    if ((g = f.match(/contrast\(([^)]+)\)/))) out.contrast = parseFloat(g[1]);
    if ((g = f.match(/(?:^|\s)blur\(([^)]+)\)/))) out.cblur = px(g[1]);
    if ((g = f.match(/drop-shadow\((.+)\)/))) out.dshadow = g[1];
    return Object.keys(out).length ? out : null;
  }

  // box-shadow list -> [{inset, x, y, blur, spread, c}]
  function shadows(v) {
    if (!v || v === 'none') return null;
    const out = []; let d = 0, cur = '';
    for (const ch of v + ',') { if (ch === '(') d++; if (ch === ')') d--; if (ch === ',' && d === 0) { out.push(cur.trim()); cur = ''; } else cur += ch; }
    return out.filter(Boolean).map((sh) => { const c = (sh.match(/rgba?\([^)]*\)|#[0-9a-f]+/i) || ['rgba(0,0,0,1)'])[0];
      const nums = sh.replace(c, '').replace('inset', '').trim().split(/\s+/).map(px);
      return { inset: /inset/.test(sh), x: nums[0] || 0, y: nums[1] || 0, blur: nums[2] || 0, spread: nums[3] || 0, c: col(c) }; }).filter((q) => q.c);
  }

  // ---------- clip paths ----------
  function clipLocal(cp, w, h) { // CSS clip-path basic shapes -> local cubic subs
    if (!cp || cp === 'none') return null;
    const L = (v, ref) => (/%$/.test(v) ? parseFloat(v) / 100 * ref : px(v));
    let m;
    if ((m = cp.match(/^inset\(([^)]*)\)/))) {
      const [box, rr] = m[1].split(/\s+round\s+/); const p = box.trim().split(/\s+/);
      const t = L(p[0], h), r = L(p[1] ?? p[0], w), b = L(p[2] ?? p[0], h), l = L(p[3] ?? p[1] ?? p[0], w);
      const W = Math.max(0, w - l - r), H = Math.max(0, h - t - b), rad = rr ? L(rr.trim().split(/\s+/)[0], Math.min(W, H)) : 0;
      return rrSubs(W, H, [rad, rad, rad, rad]).map((s) => ({ p: s.p.map(([x, y]) => [x + l, y + t]), c: true, segs: s.segs.map((g) => g.map((v, k) => v + (k % 2 ? t : l))) }));
    }
    if ((m = cp.match(/^polygon\(([^)]*)\)/))) {
      const pts = m[1].replace(/^\s*(nonzero|evenodd)\s*,/, '').split(',').map((q) => { const [a, b] = q.trim().split(/\s+/); return [L(a, w), L(b, h)]; });
      return polySubs(pts.concat([pts[0]]), true);
    }
    if ((m = cp.match(/^circle\(([^)]*)\)/))) {
      const [rs, at] = m[1].split(/\s+at\s+/); const r = rs && rs.trim() ? L(rs.trim(), Math.hypot(w, h) / Math.SQRT2) : Math.min(w, h) / 2;
      const [cx, cy] = at ? at.trim().split(/\s+/).map((v, k) => L(v, k ? h : w)) : [w / 2, h / 2];
      return ellipseSubs(cx, cy, r, r);
    }
    if ((m = cp.match(/^ellipse\(([^)]*)\)/))) {
      const [rs, at] = m[1].split(/\s+at\s+/); const [rx, ry] = rs.trim().split(/\s+/).map((v, k) => L(v, k ? h : w));
      const [cx, cy] = at ? at.trim().split(/\s+/).map((v, k) => L(v, k ? h : w)) : [w / 2, h / 2];
      return ellipseSubs(cx, cy, rx, ry);
    }
    return null;
  }

  // ---------- main capture ----------
  function stackKey(el, root) {
    const chain = []; for (let a = el; a && a !== root.parentNode; a = a.parentElement) chain.unshift(a);
    const key = [];
    for (const a of chain) {
      const cs = getComputedStyle(a);
      const positioned = cs.position !== 'static';
      const z = positioned && cs.zIndex !== 'auto' ? parseInt(cs.zIndex) : 0;
      const sc = a === el || (positioned && cs.zIndex !== 'auto') || parseFloat(cs.opacity) < 1 || cs.transform !== 'none' || cs.filter !== 'none' || cs.mixBlendMode !== 'normal' || cs.isolation === 'isolate';
      if (sc) key.push(z, a.__dom);
    }
    return key;
  }

  window.__aeCapture = function (root) {
    const all = [root, ...root.querySelectorAll('*')];
    all.forEach((e, i) => (e.__dom = i));
    const prims = [], htmlEls = [], textJobs = [], svgRoots = [];
    const csMap = new Map(), vis = new Map(), opac = new Map(), clips = new Map();
    // visibility, cumulative opacity, clip ancestry
    for (const e of all) {
      const cs = getComputedStyle(e); csMap.set(e, cs);
      const par = e.parentElement && vis.has(e.parentElement) ? e.parentElement : null;
      let v = cs.display !== 'none' && (!par || vis.get(par) !== false);
      if (e instanceof SVGElement && !(e instanceof SVGSVGElement) && e.closest('defs,clipPath,mask,filter,symbol,pattern,marker')) v = false;
      vis.set(e, v);
      opac.set(e, (par ? opac.get(par) : 1) * parseFloat(cs.opacity));
      if (!v) continue;
      if (e instanceof SVGSVGElement) { if (!e.parentElement || !(e.parentElement instanceof SVGElement)) svgRoots.push(e); continue; }
      if (e instanceof SVGElement) continue;
      htmlEls.push(e);
    }
    // measure html elements: 4 corner probes each (+ baseline probes for text)
    const restore = [];
    const probes = [];
    for (const e of htmlEls) {
      const cs = csMap.get(e);
      if (cs.position === 'static') { restore.push([e, e.style.position]); e.style.position = 'relative'; }
      const w = e.offsetWidth, h = e.offsetHeight, bl = e.clientLeft, bt = e.clientTop;
      const ps = [[0, 0], [w, 0], [w, h], [0, h]].map(([x, y]) => { const p = document.createElement('ae-c');
        p.style.cssText = `position:absolute;left:${x - bl}px;top:${y - bt}px;width:0;height:0;margin:0;padding:0;border:0;display:block;transform:none;`;
        p.__probe = 1; e.appendChild(p); return p; });
      probes.push([e, w, h, ps]);
      for (const n of [...e.childNodes]) if (n.nodeType === 3 && n.nodeValue.trim()) {
        const wrap = document.createElement('ae-w'); wrap.__probe = 1; wrap.style.cssText = 'display:inline;margin:0;padding:0;border:0;position:static;transform:none;';
        const a = document.createElement('ae-p'), b = document.createElement('ae-p');
        for (const q of [a, b]) { q.style.cssText = 'display:inline-block;width:0;height:0;margin:0;padding:0;border:0;vertical-align:baseline;'; }
        n.parentNode.insertBefore(wrap, n); wrap.appendChild(a); wrap.appendChild(n); wrap.appendChild(b);
        textJobs.push({ e, wrap, a, b, n });
      }
    }
    const quads = new Map();
    for (const [e, w, h, ps] of probes) {
      const q = ps.map((p) => { const r = p.getBoundingClientRect(); return [r.left, r.top]; });
      quads.set(e, { w, h, q, H: w > 0 && h > 0 ? homog([[0, 0], [w, 0], [w, h], [0, h]], q) : null });
    }
    for (const j of textJobs) { const ra = j.a.getBoundingClientRect(), rb = j.b.getBoundingClientRect();
      j.pa = [ra.left, ra.top]; j.pb = [rb.left, rb.top]; j.lh = j.wrap.getBoundingClientRect(); }
    // undo DOM changes
    for (const j of textJobs) { j.wrap.parentNode.insertBefore(j.n, j.wrap); j.wrap.remove(); }
    for (const [, , , ps] of probes) ps.forEach((p) => p.remove());
    for (const [e, v] of restore) e.style.position = v;

    // clip polygons from ancestors (overflow hidden / clip-path) in screen coords
    function clipChain(e) {
      const out = [];
      for (let a = e; a && a !== root.parentNode; a = a.parentElement) {
        const qa = quads.get(a); if (!qa) continue; const cs = csMap.get(a);
        if (a !== e && (cs.overflow === 'hidden' || cs.overflowX === 'hidden' || cs.overflow === 'clip') && qa.H) out.push(toAE(rrSubs(qa.w, qa.h, [0, 0, 0, 0]), (x, y) => hap(qa.H, x, y))[0]);
        if (cs.clipPath && cs.clipPath !== 'none' && qa.H) {
          const loc = clipLocal(cs.clipPath, qa.w, qa.h);
          if (loc) out.push(...toAE(loc, (x, y) => hap(qa.H, x, y)));
          else if (/url\(/.test(cs.clipPath)) { const id = cs.clipPath.match(/#([^"')]+)/); const cpEl = id && document.getElementById(id[1]);
            if (cpEl) for (const s of cpEl.querySelectorAll('path,rect,circle,ellipse,polygon,polyline')) {
              const units = cpEl.getAttribute('clipPathUnits') === 'objectBoundingBox';
              const g = svgGeom(s); if (!g) continue;
              const m = s.transform && s.transform.baseVal.consolidate() ? s.transform.baseVal.consolidate().matrix : null;
              out.push(...toAE(g, (x, y) => { let X = x, Y = y; if (m) { X = m.a * x + m.c * y + m.e; Y = m.b * x + m.d * y + m.f; } if (units) { X *= qa.w; Y *= qa.h; } return hap(qa.H, X, Y); }));
            } }
        }
      }
      return out.length ? out : null;
    }

    const blend = (cs) => (cs.mixBlendMode && cs.mixBlendMode !== 'normal' ? cs.mixBlendMode : undefined);
    // html boxes + text
    for (const e of htmlEls) {
      const cs = csMap.get(e), qa = quads.get(e); if (!qa || !qa.H) continue;
      if (cs.visibility === 'hidden') { /* text/box hidden but children may show */ }
      const op = opac.get(e); if (op <= 0.001) continue;
      const clip = clipChain(e);
      const selfClip = cs.clipPath && cs.clipPath !== 'none';
      const fill = col(cs.backgroundColor);
      const bw = px(cs.borderTopWidth), bc = bw > 0 && cs.borderTopStyle !== 'none' ? col(cs.borderTopColor) : null;
      const imgs = cs.backgroundImage && cs.backgroundImage !== 'none' ? cs.backgroundImage : null;
      const sh = cs.boxShadow && cs.boxShadow !== 'none' ? cs.boxShadow : null;
      const radF = (v, ref) => (/%/.test(v) ? parseFloat(v) / 100 * ref : px(v));
      const rad = [cs.borderTopLeftRadius, cs.borderTopRightRadius, cs.borderBottomRightRadius, cs.borderBottomLeftRadius].map((v, k) => radF(v.split(' ')[0], k % 2 ? qa.w : qa.w));
      if (cs.visibility !== 'hidden' && (fill || bc || imgs || (sh && shadows(sh) && shadows(sh).length))) {
        const b = { id: idOf(e) + '.b', k: 'box', z: stackKey(e, root), op: +op.toFixed(4), w: qa.w, h: qa.h, q: qa.q.map((p) => p.map((n) => +n.toFixed(3))),
          shape: toAE(rrSubs(qa.w, qa.h, rad), (x, y) => hap(qa.H, x, y)), fill, border: bc ? { w: bw, c: bc } : undefined, rad: rad.some((r) => r > 0) ? rad : undefined,
          bl: blend(cs), filt: filterInfo(cs, e) || undefined, clip: clip || undefined, name: (e.id || e.className || e.tagName).toString().slice(0, 40) };
        if (imgs) { const layers = [];
          const split = (str) => { const out = []; let d = 0, cur = ''; for (const ch of str) { if (ch === '(') d++; if (ch === ')') d--; if (ch === ',' && d === 0) { out.push(cur.trim()); cur = ''; } else cur += ch; } if (cur.trim()) out.push(cur.trim()); return out; };
          const L = split(imgs), blends = split(cs.backgroundBlendMode || 'normal'), sizes = split(cs.backgroundSize), posX = split(cs.backgroundPositionX), posY = split(cs.backgroundPositionY);
          L.forEach((layer, li) => {
            const urlm = layer.match(/^url\(["']?([^"')]+)["']?\)$/);
            const nat = urlm ? IMG[urlm[1]] : [qa.w, qa.h]; if (!nat) return;
            const sz = (sizes[li % sizes.length] || 'auto').trim(); let iw = nat[0], ih = nat[1];
            if (sz === 'cover' || sz === 'contain') { const s = (sz === 'cover' ? Math.max : Math.min)(qa.w / nat[0], qa.h / nat[1]); iw = nat[0] * s; ih = nat[1] * s; }
            else if (sz !== 'auto') { const [a, bb] = sz.split(/\s+/); iw = /%/.test(a) ? parseFloat(a) / 100 * qa.w : a === 'auto' ? null : px(a); ih = bb == null || bb === 'auto' ? (iw == null ? nat[1] : iw * nat[1] / nat[0]) : /%/.test(bb) ? parseFloat(bb) / 100 * qa.h : px(bb); if (iw == null) iw = ih * nat[0] / nat[1]; }
            const P = (v, free) => (/%/.test(v) ? parseFloat(v) / 100 * free : px(v));
            const ix = P((posX[li % posX.length] || '0%').trim(), qa.w - iw), iy = P((posY[li % posY.length] || '0%').trim(), qa.h - ih);
            const q = [[ix, iy], [ix + iw, iy], [ix + iw, iy + ih], [ix, iy + ih]].map(([x, y]) => hap(qa.H, x, y).map((n) => +n.toFixed(3)));
            const bm = (blends[li % blends.length] || 'normal').trim();
            if (urlm) layers.push({ src: urlm[1].replace(/^.*?(assets\/)/, '$1'), rect: [ix, iy, iw, ih], q, bm });
            else layers.push({ grad: layer, rect: [ix, iy, iw, ih], q, bm });
          });
          if (layers.length) b.img = layers; }
        if (sh) b.shadow = shadows(sh);
        if (selfClip) { const loc = clipLocal(cs.clipPath, qa.w, qa.h); if (loc) b.selfClip = toAE(loc, (x, y) => hap(qa.H, x, y)); }
        prims.push(b);
      }
    }
    for (const j of textJobs) {
      const e = j.e, cs = csMap.get(e), qa = quads.get(e); if (!qa || !qa.H || cs.visibility === 'hidden') continue;
      const op = opac.get(e); if (op <= 0.001) continue;
      const Hi = hinv(qa.H); if (!Hi) continue;
      const la = hap(Hi, j.pa[0], j.pa[1]), lb = hap(Hi, j.pb[0], j.pb[1]);
      const fam = cs.fontFamily.split(',')[0].replace(/["']/g, '').trim();
      const stroke = px(cs.webkitTextStrokeWidth) > 0 ? { w: px(cs.webkitTextStrokeWidth), c: col(cs.webkitTextStrokeColor) } : undefined;
      const selfClip = cs.clipPath && cs.clipPath !== 'none' ? clipLocal(cs.clipPath, qa.w, qa.h) : null;
      prims.push({ id: idOf(e) + '.t' + (j.e.childNodes.length > 1 ? [...j.e.childNodes].indexOf(j.n) : ''), k: 'text', z: stackKey(e, root), op: +op.toFixed(4),
        s: j.n.nodeValue.replace(/\s+/g, ' ').trim(), font: fam, size: px(cs.fontSize), weight: cs.fontWeight, color: col(cs.color), stroke,
        ls: px(cs.letterSpacing), H: qa.H.map((n) => +n.toPrecision(10)), w: qa.w, h: qa.h, b0: la.map((n) => +n.toFixed(3)), b1: lb.map((n) => +n.toFixed(3)),
        bl: blend(cs), filt: filterInfo(cs, e) || undefined, clip: clipChain(e) || undefined,
        selfClip: selfClip ? toAE(selfClip, (x, y) => hap(qa.H, x, y)) : undefined, shadow: cs.textShadow !== 'none' ? cs.textShadow : undefined,
        name: (e.id || e.className || e.tagName).toString().slice(0, 40) });
    }
    // SVG
    function svgGeom(s) {
      const t = s.tagName.toLowerCase(), gcs = getComputedStyle(s);
      const A = (n) => { const v = gcs[n]; if (v && v !== 'auto' && /^-?[\d.]+(px)?$/.test(v)) return parseFloat(v); return parseFloat(s.getAttribute(n)) || 0; };
      if (t === 'path') return parsePath(s.getAttribute('d') || '');
      if (t === 'rect') { const w = A('width'), h = A('height'), x = A('x'), y = A('y'), r = A('rx') || A('ry');
        return rrSubs(w, h, [r, r, r, r]).map((q) => ({ p: q.p.map(([a, b]) => [a + x, b + y]), c: true, segs: q.segs.map((g) => g.map((v, k) => v + (k % 2 ? y : x))) })); }
      if (t === 'circle') return ellipseSubs(A('cx'), A('cy'), A('r'), A('r'));
      if (t === 'ellipse') return ellipseSubs(A('cx'), A('cy'), A('rx'), A('ry'));
      if (t === 'line') return polySubs([[A('x1'), A('y1')], [A('x2'), A('y2')]], false);
      if (t === 'polyline' || t === 'polygon') { const n = (s.getAttribute('points') || '').trim().split(/[\s,]+/).map(parseFloat); const pts = [];
        for (let k = 0; k + 1 < n.length; k += 2) pts.push([n[k], n[k + 1]]); if (!pts.length) return null;
        return polySubs(t === 'polygon' ? pts.concat([pts[0]]) : pts, t === 'polygon'); }
      return null;
    }
    const mul = (m, n) => ({ a: m.a * n.a + m.c * n.b, b: m.b * n.a + m.d * n.b, c: m.a * n.c + m.c * n.d, d: m.b * n.c + m.d * n.d, e: m.a * n.e + m.c * n.f + m.e, f: m.b * n.e + m.d * n.f + m.f });
    const own = (el) => { const tb = el.transform && el.transform.baseVal && el.transform.baseVal.consolidate(); return tb ? tb.matrix : { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 }; };
    // paint for (possibly <use>-instanced) shapes: the nearest node inside the referenced subtree that sets the
    // property explicitly wins (with currentColor resolved against the <use> host); otherwise inherit from the host
    let USE_ROOT = null;
    const attrName = (key) => key.replace(/[A-Z]/g, (m) => '-' + m.toLowerCase());
    function setter(s, key) {
      for (let n = s; n; n = n.parentElement) {
        const a = n.getAttribute(attrName(key)) || n.style[key];
        if (a) return { n, a };
        if (n === USE_ROOT) break;
        if (n.parentElement && getComputedStyle(n)[key] !== getComputedStyle(n.parentElement)[key]) return { n, a: null };
      }
      return null;
    }
    function svgProp(s, key, host) {
      if (!host) return getComputedStyle(s)[key];
      const st = setter(s, key);
      if (!st) return getComputedStyle(host)[key];
      if (st.a && /currentColor/i.test(st.a)) return getComputedStyle(host).color;
      return getComputedStyle(s)[key];
    }
    function svgPaint(s, styleSrc, key, host) {
      let v = svgProp(s, key, host);
      if (v === 'currentColor' || /^url/.test(v)) v = getComputedStyle(host || s).color;
      return col(v);
    }
    function emitShape(s, M, idBase, host, opMul, zKey) {
      const g = svgGeom(s); if (!g) return;
      const src = host || s, cs = getComputedStyle(src), ocs = getComputedStyle(s);
      if (ocs.visibility === 'hidden' || (host && getComputedStyle(host).visibility === 'hidden')) return;
      const fill = svgPaint(s, src, 'fill', host), stroke = svgPaint(s, src, 'stroke', host);
      const scl = Math.sqrt(Math.abs(M.a * M.d - M.b * M.c));
      const sw = px(svgProp(s, 'strokeWidth', host)) * scl;
      const op = opMul * parseFloat(ocs.opacity) * (host ? 1 : 1);
      if (op <= 0.001 || (!fill && !(stroke && sw > 0))) return;
      const fo = parseFloat(svgProp(s, 'fillOpacity', host)), so = parseFloat(svgProp(s, 'strokeOpacity', host));
      const da = cs.strokeDasharray && cs.strokeDasharray !== 'none' ? cs.strokeDasharray.split(/[ ,]+/).map((v) => px(v) * scl) : undefined;
      prims.push({ id: idBase, k: 'path', z: zKey, op: +op.toFixed(4), shape: toAE(g, (x, y) => [M.a * x + M.c * y + M.e, M.b * x + M.d * y + M.f]),
        fill: fill ? [fill[0], fill[1], fill[2], fill[3] * fo] : undefined, rule: svgProp(s, 'fillRule', host) === 'evenodd' ? 2 : 1,
        stroke: stroke && sw > 0 ? { w: +sw.toFixed(3), c: [stroke[0], stroke[1], stroke[2], stroke[3] * so], cap: svgProp(s, 'strokeLinecap', host), join: svgProp(s, 'strokeLinejoin', host), dash: da } : undefined,
        filt: filterInfo(ocs, s) || (host ? filterInfo(getComputedStyle(host), host) : null) || undefined, bl: blend(ocs), name: (s.id || s.tagName) });
    }
    function walkSvg(node, svgRoot) {
      for (const s of node.children) {
        if (!vis.get(s)) continue; const t = s.tagName.toLowerCase();
        if (t === 'defs' || t === 'clippath' || t === 'mask' || t === 'filter' || t === 'symbol' || t === 'lineargradient' || t === 'radialgradient' || t === 'style' || t === 'title') continue;
        const op = opac.get(s); if (op <= 0.001) continue;
        const zKey = stackKey(s.closest('svg') === svgRoot ? svgRoot : s.closest('svg'), root).concat([s.__dom]);
        const clip = clipChain(svgRoot);
        const before = prims.length;
        if (t === 'g' || t === 'svg' || t === 'a') walkSvg(s, svgRoot);
        else if (t === 'use') {
          const href = s.getAttribute('href') || s.getAttribute('xlink:href'); const tgt = href && document.getElementById(href.slice(1)); if (!tgt) continue;
          const sc = s.getScreenCTM(); if (!sc) continue;
          let M = mul({ a: sc.a, b: sc.b, c: sc.c, d: sc.d, e: sc.e, f: sc.f }, { a: 1, b: 0, c: 0, d: 1, e: parseFloat(s.getAttribute('x')) || 0, f: parseFloat(s.getAttribute('y')) || 0 });
          const expand = (el, M2, idb) => { const tt = el.tagName.toLowerCase();
            if (tt === 'symbol' || tt === 'svg') { const vb = el.viewBox && el.viewBox.baseVal; const W = parseFloat(s.getAttribute('width')) || (vb ? vb.width : 0), Hh = parseFloat(s.getAttribute('height')) || (vb ? vb.height : 0);
              let M3 = M2; if (vb && vb.width) { const k = Math.min(W / vb.width, Hh / vb.height); M3 = mul(M2, { a: k, b: 0, c: 0, d: k, e: -vb.x * k + (W - vb.width * k) / 2, f: -vb.y * k + (Hh - vb.height * k) / 2 }); }
              [...el.children].forEach((c, ci) => expand(c, mul(M3, own(c)), idb + '.' + ci)); }
            else if (tt === 'g') [...el.children].forEach((c, ci) => expand(c, mul(M2, own(c)), idb + '.' + ci));
            else emitShape(el, M2, idb, s, op, zKey); };
          USE_ROOT = tgt;
          expand(tgt, mul(M, tgt.tagName.toLowerCase() === 'symbol' ? { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 } : own(tgt)), idOf(s) + '.u');
        } else if (t === 'text') {
          const str = s.textContent.replace(/\s+/g, ' ').trim(); const n = s.getNumberOfChars();
          if (!str || !n) continue;
          const tcs = getComputedStyle(s); if (tcs.visibility === 'hidden') continue;
          const sc = s.getScreenCTM(); if (!sc) continue;
          const a0 = s.getStartPositionOfChar(0), a1 = s.getEndPositionOfChar(n - 1);
          const ex = s.getExtentOfChar(0);
          let bb; try { bb = s.getBBox(); } catch (e) { bb = { x: a0.x, y: a0.y - px(tcs.fontSize), width: 1, height: 1 }; }
          const Hm = [sc.a, sc.c, sc.e, sc.b, sc.d, sc.f, 0, 0, 1];
          const fill = svgPaint(s, s, 'fill', null), stc = svgPaint(s, s, 'stroke', null);
          const sw = px(tcs.strokeWidth);
          const fam = tcs.fontFamily.split(',')[0].replace(/["']/g, '').trim();
          prims.push({ id: idOf(s) + '.st', k: 'text', z: zKey, op: +op.toFixed(4), s: str, font: fam, size: px(tcs.fontSize), weight: tcs.fontWeight,
            color: fill ? [fill[0], fill[1], fill[2], fill[3] * parseFloat(tcs.fillOpacity)] : [0, 0, 0, 0], stroke: stc && sw > 0 ? { w: sw, c: stc } : undefined,
            ls: px(tcs.letterSpacing), H: Hm.map((v) => +(+v).toPrecision(10)), w: bb.width, h: bb.height, lx: bb.x, ly: bb.y,
            b0: [+a0.x.toFixed(3), +a0.y.toFixed(3)], b1: [+a1.x.toFixed(3), +a1.y.toFixed(3)], ext: [ex.x, ex.y, ex.width, ex.height], db: tcs.dominantBaseline, bl: blend(tcs), filt: filterInfo(tcs, s) || undefined, name: s.id || 'svgtext' });
        }
        else { const sc = s.getScreenCTM(); if (!sc) continue; emitShape(s, { a: sc.a, b: sc.b, c: sc.c, d: sc.d, e: sc.e, f: sc.f }, idOf(s) + '.p', null, op, zKey); }
        if (clip) for (let k = before; k < prims.length; k++) if (!prims[k].clip) prims[k].clip = clip;
      }
    }
    for (const r of svgRoots) walkSvg(r, r);
    return prims;
  };

  window.__aePreloadImages = async function (urls) {
    await Promise.all(urls.map((u) => new Promise((res) => { const im = new Image(); im.onload = () => { IMG[u] = [im.naturalWidth, im.naturalHeight]; res(); }; im.onerror = res; im.src = u; })));
    return IMG;
  };
})();

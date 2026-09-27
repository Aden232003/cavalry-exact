"""Turn per-frame primitive dumps (ae/data/aN.json) into AE-ready layer tracks (ae/build/aN.tracks.json).

A track = one AE layer: stitched across frames, with reduced keyframes, a global stacking order,
and a render route (shape / text-affine / text-pin).
    python3 ae/compile.py a1 a2 ...
"""
import json, math, sys, os
from collections import defaultdict

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FONTMAP = json.load(open(os.path.join(ROOT, 'ae', 'fontmap.json')))
W = H = 1080
from fontTools.ttLib import TTFont as _TT
ASC = {}
for _f, _m in FONTMAP.items():
    _t = _TT(os.path.join(ROOT, 'ae', 'fonts_ttf', _m['ttf']), lazy=True)
    ASC[_f] = (_t['hhea'].ascent, -_t['hhea'].descent)


# ---------------------------------------------------------------- geometry
def homog(src, dst):
    A, b = [], []
    for (x, y), (u, v) in zip(src, dst):
        A.append([x, y, 1, 0, 0, 0, -u * x, -u * y]); b.append(u)
        A.append([0, 0, 0, x, y, 1, -v * x, -v * y]); b.append(v)
    n = 8
    for c in range(n):
        p = max(range(c, n), key=lambda r: abs(A[r][c]))
        A[c], A[p] = A[p], A[c]; b[c], b[p] = b[p], b[c]
        d = A[c][c]
        if abs(d) < 1e-12: return None
        for r in range(n):
            if r != c:
                f = A[r][c] / d
                for k in range(c, n): A[r][k] -= f * A[c][k]
                b[r] -= f * b[c]
    h = [b[i] / A[i][i] for i in range(n)] + [1.0]
    return h


def hap(h, x, y):
    w = h[6] * x + h[7] * y + h[8]
    return ((h[0] * x + h[1] * y + h[2]) / w, (h[3] * x + h[4] * y + h[5]) / w)


def hinv(h):
    a, b, c, d, e, f, g, k, i = h
    A_, B_, C_ = e * i - f * k, -(d * i - f * g), d * k - e * g
    det = a * A_ + b * B_ + c * C_
    if abs(det) < 1e-12: return None
    r = [A_, -(b * i - c * k), b * f - c * e, B_, a * i - c * g, -(a * f - c * d), C_, -(a * k - b * g), a * e - b * d]
    return [v / det for v in r]


def rr_local(w, h, r):
    """rounded rect in local coords -> AE shape dict with (vertices, in, out) in local space"""
    k = 0.5522847498
    a, b, c, d = [max(0, min(v, w / 2, h / 2)) for v in r]
    V, I, O = [], [], []
    def corner(p, tin, tout): V.append(p); I.append(tin); O.append(tout)
    if a: corner((0, a), (0, 0), (0, -k * a)); corner((a, 0), (-k * a, 0), (0, 0))
    else: corner((0, 0), (0, 0), (0, 0))
    if b: corner((w - b, 0), (0, 0), (k * b, 0)); corner((w, b), (0, -k * b), (0, 0))
    else: corner((w, 0), (0, 0), (0, 0))
    if c: corner((w, h - c), (0, 0), (0, k * c)); corner((w - c, h), (k * c, 0), (0, 0))
    else: corner((w, h), (0, 0), (0, 0))
    if d: corner((d, h), (0, 0), (-k * d, 0)); corner((0, h - d), (0, k * d), (0, 0))
    else: corner((0, h), (0, 0), (0, 0))
    return V, I, O


def map_shape(V, I, O, hm):
    """map a local bezier path through a homography (control points mapped; exact for affine)"""
    v2 = [hap(hm, *p) for p in V]
    i2 = [tuple(q - p for q, p in zip(hap(hm, V[j][0] + I[j][0], V[j][1] + I[j][1]), v2[j])) for j in range(len(V))]
    o2 = [tuple(q - p for q, p in zip(hap(hm, V[j][0] + O[j][0], V[j][1] + O[j][1]), v2[j])) for j in range(len(V))]
    R = lambda t: [round(t[0], 2), round(t[1], 2)]
    return {'v': [R(p) for p in v2], 'i': [R(p) for p in i2], 'o': [R(p) for p in o2], 'c': True}


def clean_tangents(sub):
    """straight segments were emitted as 1/3-2/3 cubics; zero those tangents so paths edit nicely"""
    V, I, O, n = sub['v'], sub['i'], sub['o'], len(sub['v'])
    segs = n if sub['c'] else n - 1
    for j in range(segs):
        a, b = V[j], V[(j + 1) % n]
        dx, dy = b[0] - a[0], b[1] - a[1]
        if abs(O[j][0] - dx / 3) < 0.02 and abs(O[j][1] - dy / 3) < 0.02 and abs(I[(j + 1) % n][0] + dx / 3) < 0.02 and abs(I[(j + 1) % n][1] + dy / 3) < 0.02:
            O[j] = [0, 0]; I[(j + 1) % n] = [0, 0]
    return sub


def is_straight_rect(sub):
    return len(sub['v']) == 4 and all(p == [0, 0] for p in sub['i'] + sub['o'])


def covers_frame(sub):
    if not is_straight_rect(sub): return False
    xs = [p[0] for p in sub['v']]; ys = [p[1] for p in sub['v']]
    if not (max(abs(xs[0] - xs[3]), abs(xs[1] - xs[2]), abs(ys[0] - ys[1]), abs(ys[2] - ys[3])) < 0.5): return False
    return min(xs) <= 0.5 and min(ys) <= 0.5 and max(xs) >= W - 0.5 and max(ys) >= H - 0.5


def contains_pts(sub, pts):
    if not is_straight_rect(sub): return False
    xs = [p[0] for p in sub['v']]; ys = [p[1] for p in sub['v']]
    if not (max(abs(xs[0] - xs[3]), abs(xs[1] - xs[2]), abs(ys[0] - ys[1]), abs(ys[2] - ys[3])) < 0.5): return False
    x0, x1, y0, y1 = min(xs) - 0.5, max(xs) + 0.5, min(ys) - 0.5, max(ys) + 0.5
    return all(x0 <= p[0] <= x1 and y0 <= p[1] <= y1 for p in pts)


def bbox_of(shape):
    xs = [p[0] for s in shape for p in s['v']]; ys = [p[1] for s in shape for p in s['v']]
    return (min(xs), min(ys), max(xs), max(ys)) if xs else (0, 0, 0, 0)


# ---------------------------------------------------------------- normalise one primitive
def affine_parts(h):
    """homography -> (is_affine, theta_deg, sx, sy, skew_ratio, tx, ty)"""
    if abs(h[6]) > 1e-7 or abs(h[7]) > 1e-7: return None
    a, b, c, d = h[0], h[1], h[3], h[4]
    sx = math.hypot(a, c)
    if sx < 1e-9: return None
    th = math.atan2(c, a)
    sy = (a * d - b * c) / sx
    m = (a * b + c * d) / sx
    return th, sx, sy, (m / sy if abs(sy) > 1e-9 else 99), h[2], h[5]


def font_ps(fam, faces):
    f = faces.get(fam)
    return FONTMAP[f]['ps'] if f in FONTMAP else None


def norm_prim(p, faces):
    k = p['k']
    out = {'k': k, 'op': p['op'], 'bl': p.get('bl'), 'filt': p.get('filt'), 'name': p.get('name', '')}
    own = None
    if k in ('box', 'path'):
        out['shape'] = [clean_tangents(s) for s in p['shape']]
        own = [q for s in out['shape'] for q in s['v']]
    if k == 'box':
        out['fill'] = p.get('fill')
        hm = homog([(0, 0), (p['w'], 0), (p['w'], p['h']), (0, p['h'])], p['q'])
        out['H'] = hm
        if p.get('border') and hm:
            bw = p['border']['w']; r = p.get('rad') or [0, 0, 0, 0]
            V, I, O = rr_local(max(0, p['w'] - bw), max(0, p['h'] - bw), [max(0, x - bw / 2) for x in r])
            V = [(x + bw / 2, y + bw / 2) for x, y in V]
            sc = math.sqrt(abs(hm[0] * hm[4] - hm[1] * hm[3])) if hm else 1
            out['border'] = {'shape': [clean_tangents(map_shape(V, I, O, hm))], 'w': round(bw * sc, 3), 'c': p['border']['c']}
        if p.get('img'): out['img'] = p['img']
        if p.get('shadow') and hm:
            sc = math.sqrt(abs(hm[0] * hm[4] - hm[1] * hm[3]))
            r = p.get('rad') or [0, 0, 0, 0]
            rings, orings, drop = [], [], None
            for shd in p['shadow']:
                sp = shd['spread']
                if shd['blur'] == 0 and shd['x'] == 0 and shd['y'] == 0 and sp > 0:
                    if shd['inset']:
                        V, I, O = rr_local(max(0, p['w'] - sp), max(0, p['h'] - sp), [max(0, x - sp / 2) for x in r])
                        V = [(x + sp / 2, y + sp / 2) for x, y in V]
                        rings.append({'shape': [clean_tangents(map_shape(V, I, O, hm))], 'w': round(sp * sc, 3), 'c': shd['c']})
                    else:
                        V, I, O = rr_local(p['w'] + sp, p['h'] + sp, [x + sp / 2 if x else 0 for x in r])
                        V = [(x - sp / 2, y - sp / 2) for x, y in V]
                        orings.append({'shape': [clean_tangents(map_shape(V, I, O, hm))], 'w': round(sp * sc, 3), 'c': shd['c']})
                elif not shd['inset'] and drop is None:
                    drop = {'x': shd['x'] * sc, 'y': shd['y'] * sc, 'blur': shd['blur'] * sc, 'c': shd['c']}
            if rings: out['rings'] = rings
            if orings: out['orings'] = orings
            if drop: out['drop'] = drop
        out['wh'] = [p['w'], p['h']]
        out['rad'] = p.get('rad')
        out['q'] = p['q']
    if k == 'path':
        out['fill'] = p.get('fill'); out['rule'] = p.get('rule', 1); out['stroke'] = p.get('stroke')
    if k == 'text':
        hm = p['H']
        if 'ext' in p and p.get('db') not in (None, 'auto', 'alphabetic'):
            # baseline-shifted svg text: derive the real alphabetic baseline from the glyph em box
            a, d = ASC.get(p['font_file'] if 'font_file' in p else faces.get(p['font']), (0.88, 0.12))
            by = p['ext'][1] + p['ext'][3] * a / (a + d)
            p = dict(p, b0=[p['b0'][0], by], b1=[p['b1'][0], by])
        if 'lx' in p:  # svg text: move the local origin to the bbox corner
            lx, ly = p['lx'], p['ly']
            hm = hm[:]; hm[2] = hm[0] * lx + hm[1] * ly + hm[2]; hm[5] = hm[3] * lx + hm[4] * ly + hm[5]
            p = dict(p, b0=[p['b0'][0] - lx, p['b0'][1] - ly], b1=[p['b1'][0] - lx, p['b1'][1] - ly])
        out.update({'s': p['s'], 'font': font_ps(p['font'], faces), 'fontCss': p['font'], 'size': p['size'], 'color': p.get('color'),
                    'stroke': p.get('stroke'), 'ls': p.get('ls', 0), 'H': hm, 'w': p['w'], 'h': p['h'], 'b0': p['b0'], 'b1': p['b1'], 'shadow': p.get('shadow')})
        own = [list(hap(hm, x, y)) for x, y in ((0, 0), (p['w'], 0), (p['w'], p['h']), (0, p['h']))]
    clips = []
    for c in (p.get('clip') or []):
        c = clean_tangents(c)
        if covers_frame(c): continue
        if own and contains_pts(c, own): continue
        if c not in clips: clips.append(c)
    for c in (p.get('selfClip') or []):
        c = clean_tangents(c)
        if c not in clips: clips.append(c)
    out['clip'] = clips
    return out


def signature(n):
    k = n['k']
    if k == 'box': return ('box', bool(n['fill']), bool(n.get('border')), tuple(sorted(str(i.get('src') or i.get('grad')) for i in n.get('img', []))), len(n['shape'][0]['v']),
                           len(n.get('rings') or []), len(n.get('orings') or []), bool(n.get('drop')), str((n.get('filt') or {}).get('gen', ''))[:40])
    if k == 'path': return ('path', bool(n['fill']), bool(n['stroke']), tuple(len(s['v']) for s in n['shape']))
    return ('text', n['font'])


def centre(n):
    if n['k'] == 'text':
        return hap(n['H'], n['w'] / 2, n['h'] / 2)
    x0, y0, x1, y1 = bbox_of(n['shape'])
    return ((x0 + x1) / 2, (y0 + y1) / 2)


def size_of(n):
    if n['k'] == 'text': return n['size'] * math.sqrt(abs(n['H'][0] * n['H'][4] - n['H'][1] * n['H'][3]))
    x0, y0, x1, y1 = bbox_of(n['shape'])
    return max(1, math.hypot(x1 - x0, y1 - y0))


# ---------------------------------------------------------------- key reduction
def flat(v):
    if isinstance(v, (int, float)): return [float(v)]
    if isinstance(v, dict): return flat(v['v']) + flat(v['i']) + flat(v['o'])
    out = []
    for x in v: out += flat(x)
    return out


def reduce_keys(frames, vals, tol):
    """frames sorted ints, vals list; returns (frames, vals) with linear-redundant keys dropped"""
    if len(frames) <= 2: return frames, vals
    F = [flat(v) for v in vals]
    keep = [0]
    i = 0
    n = len(frames)
    while i < n - 1:
        j = i + 1
        while j + 1 < n:
            cand = j + 1
            if len(F[cand]) != len(F[i]): break
            ok = True
            for m in range(i + 1, cand):
                if len(F[m]) != len(F[i]): ok = False; break
                t = (frames[m] - frames[i]) / (frames[cand] - frames[i])
                for a, b, c in zip(F[i], F[cand], F[m]):
                    if abs(a + (b - a) * t - c) > tol: ok = False; break
                if not ok: break
            if not ok: break
            j = cand
        keep.append(j); i = j
    return [frames[k] for k in keep], [vals[k] for k in keep]


def track_prop(frs, get, tol, default=None):
    vals = [get(f) for f in frs]
    if all(v == vals[0] for v in vals): return {'s': vals[0]}
    kf, kv = reduce_keys(frs, vals, tol)
    return {'t': kf, 'v': kv}


def unwrap(vals):
    out = []
    for v in vals:
        if out:
            while v - out[-1] > 180: v -= 360
            while v - out[-1] < -180: v += 360
        out.append(v)
    return out


# ---------------------------------------------------------------- compile a part
BGS = {}


def compile_part(part):
    D = json.load(open(os.path.join(ROOT, 'ae', 'data', part + '.json')))
    faces = D.get('fontFaces', {})
    frames = D['frames']
    NF = len(frames)
    tracks = {}          # tid -> {f: norm}
    alias = {}           # raw id -> tid (after stitching)
    per_frame_order = []
    for f, prims in enumerate(frames):
        # paint order from stacking keys
        order = sorted(range(len(prims)), key=lambda i: prims[i]['z'])
        ids = []
        for i in order:
            p = prims[i]
            n = norm_prim(p, faces)
            if n['k'] == 'text' and not n['s']: continue
            tid = alias.get(p['id'], p['id'])
            tracks.setdefault(tid, {})[f] = n
            ids.append(tid)
        per_frame_order.append(ids)

    raw = tracks
    raw_order = per_frame_order
    # bbox per raw element per frame (ordering only matters where things overlap)
    def bb(n):
        if n['k'] == 'text':
            pts = [hap(n['H'], x, y) for x, y in ((0, 0), (n['w'], 0), (n['w'], n['h']), (0, n['h']))]
            xs = [q[0] for q in pts]; ys = [q[1] for q in pts]
            pad = n['size'] * 0.2
            return (min(xs) - pad, min(ys) - pad, max(xs) + pad, max(ys) + pad)
        x0, y0, x1, y1 = bbox_of(n['shape'])
        if n.get('img'):
            for im in n['img']:
                xs = [q[0] for q in im['q']]; ys = [q[1] for q in im['q']]
                x0, y0, x1, y1 = min(x0, min(xs)), min(y0, min(ys)), max(x1, max(xs)), max(y1, max(ys))
        return (x0, y0, x1, y1)
    BB = {(t, f): bb(n) for t, fr in raw.items() for f, n in fr.items()}
    def paint(n):
        if n['op'] < 0.999 or n.get('bl'): return None
        if n['k'] == 'path': return ('p', str(n.get('fill')), str(n.get('stroke')))
        if n['k'] == 'box' and not n.get('img') and not n.get('border'): return ('b', str(n.get('fill')))
        if n['k'] == 'text' and not n.get('stroke'): return ('t', str(n.get('color')))
        return None
    PT = {(t, f): paint(n) for t, fr in raw.items() for f, n in fr.items()}

    def stitch(forbid):
        group = {t: t for t in raw}
        members = {t: [t] for t in raw}
        span = {t: (min(fr), max(fr)) for t, fr in raw.items()}
        ends = defaultdict(list); starts = defaultdict(list)
        for t in raw: ends[span[t][1]].append(t); starts[span[t][0]].append(t)
        lastn = {t: raw[t][span[t][1]] for t in raw}; lastf = {t: span[t][1] for t in raw}
        for f in range(NF - 1):
            A = [g for g in set(group[t] for t in ends[f]) if lastf[g] == f and g not in forbid]
            B = [t for t in starts[f + 1] if t not in forbid]
            if not A or not B: continue
            cands = []
            for a in A:
                na = lastn[a]
                for b in B:
                    nb = raw[b][f + 1]
                    if signature(na) != signature(nb): continue
                    if na['k'] == 'text' and na['s'] != nb['s']: continue
                    (xa, ya), (xb, yb) = centre(na), centre(nb)
                    sa, sb = size_of(na), size_of(nb)
                    d = math.hypot(xa - xb, ya - yb); r = max(sa, sb) / max(1e-6, min(sa, sb))
                    if d > 0.35 * max(sa, sb) + 12 or r > 1.35: continue
                    cands.append((d / max(sa, sb) + (r - 1), a, b))
            cands.sort(key=lambda c: c[0])
            usedA, usedB = set(), set()
            for c, a, b in cands:
                if a in usedA or b in usedB: continue
                usedA.add(a); usedB.add(b)
                for m in members[b]: group[m] = a
                members[a] += members.pop(b)
                lastn[a] = lastn[b]; lastf[a] = lastf[b]
                ends[lastf[a]].append(a)
        return group, members

    def order_of(track_of, tracks_set):
        """track_of(raw_id, f) -> track id. Returns (orderlist bottom->top, bad edges, W)"""
        W = defaultdict(int)
        mean = defaultdict(list)
        for f, ids in enumerate(raw_order):
            n = len(ids)
            G = [track_of(t, f) for t in ids]
            boxes = [BB[(t, f)] for t in ids]
            pts = [PT[(t, f)] for t in ids]
            for r, g in enumerate(G): mean[g].append(r / max(1, n - 1))
            for i in range(n):
                ax0, ay0, ax1, ay1 = boxes[i]; gi = G[i]
                for j in range(i + 1, n):
                    bx0, by0, bx1, by1 = boxes[j]
                    if bx0 > ax1 or bx1 < ax0 or by0 > ay1 or by1 < ay0: continue
                    if pts[i] is not None and pts[i] == pts[j]: continue
                    gj = G[j]
                    if gi != gj: W[(gi, gj)] += 1
        mr = {g: sum(v) / len(v) for g, v in mean.items()}
        inw = defaultdict(int); outs = defaultdict(list)
        for (a, b), w in W.items():
            if w > W.get((b, a), 0):
                inw[b] += w - W.get((b, a), 0); outs[a].append((b, w - W.get((b, a), 0)))
        import heapq
        heap = [(inw[g], mr.get(g, .5), str(g), g) for g in tracks_set]
        heapq.heapify(heap)
        placed = set(); orderlist = []
        cur = dict(inw)
        while heap:
            iw, m, _, g = heapq.heappop(heap)
            if g in placed or iw != cur.get(g, 0): continue
            placed.add(g); orderlist.append(g)
            for b, w in outs[g]:
                if b in placed: continue
                cur[b] = cur.get(b, 0) - w
                heapq.heappush(heap, (cur[b], mr.get(b, .5), str(b), b))
        pos = {g: i for i, g in enumerate(orderlist)}
        bad = [(a, b, w) for (a, b), w in W.items() if pos[a] > pos[b]]
        return orderlist, bad

    forbid = set()
    for it in range(4):
        group, members = stitch(forbid)
        orderlist, bad = order_of(lambda t, f: group[t], set(members))
        comp = [g for a, b, w in bad for g in (a, b) if len(members[g]) > 1]
        print(f'  order pass {it}: {len(members)} layers, {len(bad)} conflicts ({len(comp)} on stitched layers)')
        if not comp: break
        for g in comp: forbid.update(members[g])

    # ---- genuine depth swaps: cut layers in time where they swap sides with an overlapping neighbour
    seg = {}  # (group, f) -> segment id
    for g, ms in members.items():
        for m in ms:
            for f in raw[m]: seg[(g, f)] = g
    for it in range(6):
        if not bad: break
        involved = set()
        for a, b, w in bad: involved.add(a); involved.add(b)
        # per frame: for involved segments, the sets below/above among overlapping neighbours
        side = defaultdict(dict)  # seg -> f -> (below set, above set)
        for f, ids in enumerate(raw_order):
            G = [seg[(group[t], f)] for t in ids]
            boxes = [BB[(t, f)] for t in ids]; pts = [PT[(t, f)] for t in ids]
            for i, gi in enumerate(G):
                if gi not in involved: continue
                below, above = set(), set()
                ax0, ay0, ax1, ay1 = boxes[i]
                for j, gj in enumerate(G):
                    if j == i or gj == gi: continue
                    bx0, by0, bx1, by1 = boxes[j]
                    if bx0 > ax1 or bx1 < ax0 or by0 > ay1 or by1 < ay0: continue
                    if pts[i] is not None and pts[i] == pts[j]: continue
                    (below if j < i else above).add(G[j] if G[j] not in involved else G[j])
                side[gi][f] = (below, above)
        cuts = 0
        for sgid in involved:
            fs = sorted(side[sgid])
            cur_id = sgid; start = fs[0] if fs else None
            prev = None
            for f in fs:
                bl, ab = side[sgid][f]
                if prev is not None:
                    pb, pa = prev
                    if (pb & ab) or (pa & bl) or it >= 4:
                        cur_id = f'{sgid}@{f}'; cuts += 1
                prev = (bl, ab)
                for g in [g for g in members if seg.get((g, f)) == sgid]:
                    seg[(g, f)] = cur_id
        segs = set(seg.values())
        orderlist, bad = order_of(lambda t, f: seg[(group[t], f)], segs)
        print(f'  depth-cut pass {it}: {cuts} cuts -> {len(segs)} layers, {len(bad)} conflicts')
    tracks = defaultdict(dict)
    for g, ms in members.items():
        for m in ms:
            for f, n in raw[m].items(): tracks[seg[(g, f)]][f] = n
    tracks = dict(tracks)
    # orderlist: bottom -> top

    # ---- build layer specs
    layers = []
    for t in orderlist:
        fr = tracks[t]
        frs = sorted(fr)
        f0, f1 = frs[0], frs[-1]
        span = list(range(f0, f1 + 1))
        present = set(frs)
        k = fr[f0]['k']
        L = {'id': str(t), 'k': k, 'f0': f0, 'f1': f1, 'name': fr[f0]['name']}
        def get(key, dflt=None):
            last = [dflt]
            def g(f):
                if f in fr: last[0] = fr[f].get(key, dflt)
                return last[0]
            return g
        def opf(f):
            if f not in present: return 0.0
            n = fr[f]; a = 1.0
            if n['k'] == 'text' and n.get('color') and len(n['color']) > 3: a = n['color'][3]
            return round(n['op'] * a * 100, 2)
        L['op'] = track_prop(span, opf, 0.3)
        bl = [fr[f].get('bl') for f in frs if fr[f].get('bl')]
        if bl: L['bl'] = bl[0]
        filt = next((fr[f]['filt'] for f in frs if fr[f].get('filt')), None)
        if filt:
            if filt.get('gen') and k in ('box', 'path'):
                import hashlib
                shp0 = fr[f0]['shape']
                key = 'gen_' + hashlib.md5(json.dumps([filt['gen'], shp0]).encode()).hexdigest()[:12]
                BGS[key] = {'gen': filt['gen'], 'genId': filt.get('genId'), 'shape': shp0, 'size': [W, H]}
                L['gentex'] = key
                filt = {kk: vv for kk, vv in filt.items() if kk not in ('gen',)}
            L['filt'] = filt
        # clips -> masks (count = max over frames; missing -> None meaning 'no clip')
        nmask = max(len(fr[f]['clip']) for f in frs)
        if nmask:
            L['masks'] = []
            for m in range(nmask):
                def gm(f, m=m):
                    c = fr[f]['clip'] if f in fr else None
                    return c[m] if c and m < len(c) else None
                vals = [gm(f) for f in frs]
                # fill gaps with full-frame rect so the mask is a no-op there
                full = {'v': [[-2000, -2000], [3080, -2000], [3080, 3080], [-2000, 3080]], 'i': [[0, 0]] * 4, 'o': [[0, 0]] * 4, 'c': True}
                vals = [v if v else full for v in vals]
                if all(v == vals[0] for v in vals): L['masks'].append({'s': vals[0]})
                else:
                    kf, kv = reduce_keys(frs, vals, 0.25); L['masks'].append({'t': kf, 'v': kv})
        if k in ('box', 'path'):
            shp = [fr[f]['shape'] for f in frs]
            if all(s == shp[0] for s in shp): L['shape'] = {'s': shp[0]}
            else:
                kf, kv = reduce_keys(frs, shp, 0.2); L['shape'] = {'t': kf, 'v': kv}
            L['nsub'] = max(len(s) for s in shp)
            fills = [fr[f].get('fill') for f in frs]
            if any(fills):
                g = get('fill')
                L['fill'] = track_prop(frs, lambda f: [round(x, 4) for x in (g(f) or [0, 0, 0, 0])], 0.004)
            if k == 'path':
                L['rule'] = fr[f0].get('rule', 1)
                st = [fr[f].get('stroke') for f in frs]
                if any(st):
                    s0 = next(s for s in st if s)
                    gs = get('stroke')
                    L['stroke'] = {'cap': s0.get('cap'), 'join': s0.get('join'), 'dash': s0.get('dash'),
                                   'w': track_prop(frs, lambda f: round((gs(f) or s0)['w'], 3), 0.05),
                                   'c': track_prop(frs, lambda f: [round(x, 4) for x in (gs(f) or s0)['c']], 0.004)}
            if k == 'box':
                if any(fr[f].get('border') for f in frs):
                    b0 = next(fr[f]['border'] for f in frs if fr[f].get('border'))
                    gb = get('border')
                    bs = [(gb(f) or b0)['shape'] for f in frs]
                    if all(s == bs[0] for s in bs): bshape = {'s': bs[0]}
                    else:
                        kf, kv = reduce_keys(frs, bs, 0.2); bshape = {'t': kf, 'v': kv}
                    L['border'] = {'shape': bshape, 'w': track_prop(frs, lambda f: (gb(f) or b0)['w'], 0.05),
                                   'c': track_prop(frs, lambda f: [round(x, 4) for x in (gb(f) or b0)['c']], 0.004)}
                fimg = next((f for f in frs if fr[f].get('img')), None)
                if fimg is not None:
                    n0 = fr[fimg]; w0, h0 = n0['wh']
                    spec = [{'src': im.get('src'), 'grad': im.get('grad'), 'bm': im.get('bm', 'normal'),
                             'r': [round(im['rect'][0] / w0, 4), round(im['rect'][1] / h0, 4), round(im['rect'][2] / w0, 4), round(im['rect'][3] / h0, 4)]} for im in n0['img']]
                    bw_ = max(fr[f]['wh'][0] for f in frs); bh_ = max(fr[f]['wh'][1] for f in frs)
                    sc = min(1.0, 1400 / max(bw_, bh_)) if max(bw_, bh_) > 0 else 1
                    size = [max(8, int(round(bw_ * sc))), max(8, int(round(bh_ * sc)))]
                    import hashlib
                    # CSS lists the top layer first; group consecutive layers (bottom-up) sharing a blend mode
                    groups = []
                    for l in reversed(spec):
                        if groups and groups[-1]['bm'] == l['bm'] and l['bm'] == 'normal': groups[-1]['layers'].append(l)
                        else: groups.append({'bm': l['bm'], 'layers': [l]})
                    bgl = []
                    for g in groups:
                        key = hashlib.md5(json.dumps([g['layers'], size]).encode()).hexdigest()[:12]
                        BGS[key] = {'spec': list(reversed(g['layers'])), 'size': size}
                        bgl.append({'key': key, 'bm': g['bm']})
                    last = [n0['q']]
                    def gq(f):
                        if f in fr and fr[f].get('q'): last[0] = fr[f]['q']
                        return [[round(c, 2) for c in p_] for p_ in last[0]]
                    L['bg'] = {'imgs': bgl, 'size': size, 'q': track_prop(frs, gq, 0.2)}
                    L['needMatte'] = any(any(r > 0 for r in (fr[f].get('rad') or [])) for f in frs) or bool(L.get('masks'))
                for rk in ('rings', 'orings'):
                    n0 = next((fr[f][rk] for f in frs if fr[f].get(rk)), None)
                    if not n0: continue
                    L[rk] = []
                    for ri in range(len(n0)):
                        def gr(f, ri=ri, rk=rk, n0=n0):
                            v = fr[f].get(rk) if f in fr else None
                            return v[ri] if v and ri < len(v) else n0[ri]
                        shp = [gr(f)['shape'] for f in frs]
                        if all(x == shp[0] for x in shp): rs = {'s': shp[0]}
                        else:
                            kf, kv = reduce_keys(frs, shp, 0.2); rs = {'t': kf, 'v': kv}
                        has = lambda f, ri=ri, rk=rk: bool(f in fr and fr[f].get(rk) and ri < len(fr[f][rk]))
                        L[rk].append({'shape': rs, 'w': track_prop(frs, lambda f: gr(f)['w'] if has(f) else 0, 0.05), 'c': track_prop(frs, lambda f: [round(x, 4) for x in gr(f)['c']], 0.004)})
                drop = next((fr[f]['drop'] for f in frs if fr[f].get('drop')), None)
                if drop: L['drop'] = drop
        if k == 'text':
            L['font'] = fr[f0]['font']; L['fontCss'] = fr[f0]['fontCss']
            # Source text keys (hold)
            docs, dts = [], []
            prev = None
            for f in frs:
                n = fr[f]
                d = [n['s'], n['font'], round(n['size'], 3), [round(x, 4) for x in (n['color'] or [0, 0, 0, 1])],
                     ([round(n['stroke']['w'], 3), [round(x, 4) for x in (n['stroke']['c'] or [0, 0, 0, 1])]] if n.get('stroke') else None), round(n['ls'] / n['size'] * 1000, 2) if n['size'] else 0]
                if d != prev: docs.append(d); dts.append(f); prev = d
            L['doc'] = {'t': dts, 'v': docs}
            # transform route
            aff = [affine_parts(fr[f]['H']) for f in frs]
            pin = any(a is None or abs(a[3]) > 0.015 for a in aff)
            if pin:
                L['route'] = 'pin'
                ws = [fr[f]['w'] for f in frs]; hs = [fr[f]['h'] for f in frs]
                L['box'] = [max(ws), max(hs)]
                L['b0'] = track_prop(frs, lambda f: [round(x, 3) for x in fr[f]['b0']], 0.05)
                L['pin'] = track_prop(frs, lambda f: [[round(c, 2) for c in hap(fr[f]['H'], x, y)] for x, y in ((0, 0), (fr[f]['w'], 0), (0, fr[f]['h']), (fr[f]['w'], fr[f]['h']))], 0.15)
                # masks for pin route live inside the precomp in local coords
                if L.get('masks'):
                    lm = []
                    for m in L['masks']:
                        def loc(shape, f):
                            hi = hinv(fr[f]['H']); bx, by = fr[f]['b0']
                            V = [hap(hi, *p) for p in shape['v']]
                            I = [[a - b for a, b in zip(hap(hi, p[0] + t[0], p[1] + t[1]), v)] for p, t, v in zip(shape['v'], shape['i'], V)]
                            O = [[a - b for a, b in zip(hap(hi, p[0] + t[0], p[1] + t[1]), v)] for p, t, v in zip(shape['v'], shape['o'], V)]
                            R = lambda q: [round(q[0], 2), round(q[1], 2)]
                            return {'v': [R((p[0] - bx, p[1] - by)) for p in V], 'i': [R(p) for p in I], 'o': [R(p) for p in O], 'c': shape['c']}
                        if 's' in m: lm.append({'s': loc(m['s'], f0)})
                        else:
                            vals = []
                            for f in frs:
                                # value at f: last key <= f
                                idx = max(i for i, t in enumerate(m['t']) if t <= f) if any(t <= f for t in m['t']) else 0
                                vals.append(loc(m['v'][idx], f))
                            kf, kv = reduce_keys(frs, vals, 0.25); lm.append({'t': kf, 'v': kv})
                    L['masks'] = lm
            else:
                L['route'] = 'affine'
                th = unwrap([math.degrees(a[0]) for a in aff])
                pos = []
                for f, a in zip(frs, aff):
                    hm = fr[f]['H']; bx, by = fr[f]['b0']
                    pos.append(list(hap(hm, bx, by)))
                sc = [[a[1] * 100, a[2] * 100] for a in aff]
                L['pos'] = track_prop(frs, lambda f: [round(c, 2) for c in pos[frs.index(f)]], 0.05)
                L['rot'] = track_prop(frs, lambda f: round(th[frs.index(f)], 3), 0.02)
                L['scl'] = track_prop(frs, lambda f: [round(c, 3) for c in sc[frs.index(f)]], 0.03)
                # masks: comp coords -> layer coords (inverse of the per-frame affine incl. baseline offset)
                if L.get('masks'):
                    lm = []
                    for m in L['masks']:
                        def loc(shape, f):
                            hm = fr[f]['H']; bx, by = fr[f]['b0']
                            hi = hinv(hm)
                            V = [[a - b for a, b in zip(hap(hi, *p), (bx, by))] for p in shape['v']]
                            A = [[hi[0], hi[1]], [hi[3], hi[4]]]
                            T = lambda t: [round(A[0][0] * t[0] + A[0][1] * t[1], 2), round(A[1][0] * t[0] + A[1][1] * t[1], 2)]
                            return {'v': [[round(p[0], 2), round(p[1], 2)] for p in V], 'i': [T(t) for t in shape['i']], 'o': [T(t) for t in shape['o']], 'c': shape['c']}
                        vals = []
                        for f in frs:
                            if 's' in m: vals.append(loc(m['s'], f))
                            else:
                                idx = max(i for i, t in enumerate(m['t']) if t <= f) if any(t <= f for t in m['t']) else 0
                                vals.append(loc(m['v'][idx], f))
                        if all(v == vals[0] for v in vals): lm.append({'s': vals[0]})
                        else:
                            kf, kv = reduce_keys(frs, vals, 0.25); lm.append({'t': kf, 'v': kv})
                    L['masks'] = lm
            sh = next((fr[f]['shadow'] for f in frs if fr[f].get('shadow')), None)
            if sh: L['shadow'] = sh
        layers.append(L)
    return {'part': part, 'g0': D['g0'], 'g1': D['g1'], 'nf': NF, 'layers': layers}


if __name__ == '__main__':
    os.makedirs(os.path.join(ROOT, 'ae', 'build'), exist_ok=True)
    bp = os.path.join(ROOT, 'ae', 'build', 'bgspecs.json')
    if os.path.exists(bp): BGS.update(json.load(open(bp)))
    for part in sys.argv[1:]:
        R = compile_part(part)
        out = os.path.join(ROOT, 'ae', 'build', part + '.tracks.json')
        json.dump(R, open(out, 'w'), separators=(',', ':'))
        from collections import Counter
        c = Counter((l['k'], l.get('route', '')) for l in R['layers'])
        nk = sum(len(v['t']) for l in R['layers'] for key in ('op', 'shape', 'pos', 'pin', 'fill') for v in [l.get(key) or {}] if 't' in v)
        imgs = sum(1 for l in R['layers'] if l.get('bg'))
        json.dump(BGS, open(os.path.join(ROOT, 'ae', 'build', 'bgspecs.json'), 'w'))
        print(f"{part}: {len(R['layers'])} layers {dict(c)} imgLayers={imgs} keys~{nk} -> {os.path.getsize(out) / 1e6:.1f}MB")

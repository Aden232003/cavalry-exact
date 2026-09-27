/*  Cavalry Exact — native Cavalry 2.7.2 rebuild of ref/cavlry.mp4 (29.29 s, 1080x1080, 24 fps)

    HOW TO RUN (full steps in cavalry/README.md)
      1. Install the 9 fonts in fonts/ (double-click each .ttf/.woff2 → Install), then restart Cavalry.
      2. Cavalry → Window → JavaScript Editor. Paste this whole file in, press Run.
      3. Progress + errors go to  <repo>/cavalry/build_log.txt  (and the JavaScript Editor console).

    It reads the same track data the After Effects builder uses:
      ae/build/aN.tracks.json   (6 parts, bottom→top layer lists, part-local frames @24 fps)
      ae/build/bg/<key>.png     (baked textures)
    and builds a NEW composition "CAVALRY EXACT" (it never clears or changes your other comps).

    Cavalry is y-up with the origin at the comp centre; the track data is AE-style (y-down, top-left origin),
    so every point goes through  X = x - 540,  Y = 540 - y  (rotations are negated).
    The build never stops on an error: every problem is logged and the next layer is built.
*/
(function () {
    // ============================================================ settings
    var CONFIG = {
        ROOT: "",              // repo folder (the one containing ae/ and cavalry/). "" = auto-detect, then ask once.
        ONLY: null,            // e.g. ["a1","a2"] = the 0–10.5 s preview. null = all six parts.
        CHUNK: 250,            // data layers per chunk group (keeps the Scene Window usable)
        BRUSH_STROKE: true,    // brush "dilate" → a stroke in the glyph/shape colour (fattens strokes like the AE Simple Choker)
        BRUSH_DISPLACE: true,  // brush "disp"   → Distort Edges filter driven by a Noise shader (rough ink edges)
        IMAGE_BLEND: "replace",// how the texture shader sits on its rectangle: "replace" or "normal"
        HIDE_MASKS: true,      // mask shapes are hidden (they still clip). Set false to see them.
        AUDIO: true,           // add assets/audio.m4a (original soundtrack) to the comp
        SAVE: true             // if the scene has never been saved, save it as cavalry/CavalryExact.cv
    };
    var FPS = 24, W = 1080, H = 1080, TOTAL_FRAMES = 703;
    var PARTS = [
        { id: "a1", name: "01 Seal, Fan & Dial" },
        { id: "a2", name: "02 Slit-scan, Lattice & Collage" },
        { id: "a3", name: "03 Lens, Discs & Swirl" },
        { id: "a4", name: "04 Aged Tiles & 3D Grid" },
        { id: "a5", name: "05 Stroke Galaxy & Glyph Grid" },
        { id: "a6", name: "06 Blessing, Book & Return" }
    ];
    // PostScript name (as stored in the track data) → Cavalry family/style
    var FONTS = {
        "KaiseiDecol-Bold": ["Kaisei Decol", "Bold"],
        "LiuJianMaoCao-Regular": ["Liu Jian Mao Cao", "Regular"],
        "MaShanZheng-Regular": ["Ma Shan Zheng", "Regular"],
        "ShipporiAntiqueB1-Regular": ["Shippori Antique B1", "Regular"],
        "YujiBoku-Regular": ["Yuji Boku", "Regular"],
        "YujiMai-Regular": ["Yuji Mai", "Regular"],
        "YujiSyuku-Regular": ["Yuji Syuku", "Regular"],
        "ZenAntique-Regular": ["Zen Antique", "Regular"],
        "ZhiMangXing-Regular": ["Zhi Mang Xing", "Regular"]
    };
    // CSS blend → Cavalry shape blendMode enum (nodeStrings.json)
    var BLEND = { "plus-lighter": 12, screen: 14, overlay: 15, darken: 16, lighten: 17, "color-dodge": 18, "color-burn": 19,
        "hard-light": 20, "soft-light": 21, difference: 22, exclusion: 23, multiply: 24, hue: 25, saturation: 26, color: 27, luminosity: 28 };
    var CAP = { butt: 0, round: 1, square: 2 }, JOIN = { miter: 0, round: 1, bevel: 2 };

    // ============================================================ logging (buffered; flushed to disk regularly)
    var t0 = Date.now(), nErr = 0, nWarn = 0, LOGPATH = "", LOGTXT = "", pending = 0;
    function stamp() { return ((Date.now() - t0) / 1000).toFixed(1) + "s  "; }
    function log(s) {
        LOGTXT += stamp() + s + "\n"; pending++;
        try { console.log(s); } catch (e) {}
        if (pending > 200) flush();
    }
    function flush() { pending = 0; if (!LOGPATH) return; try { api.writeToFile(LOGPATH, LOGTXT, true); } catch (e) {} }
    function msg(e) { return e && e.message ? e.message + (e.lineNumber ? " (line " + e.lineNumber + ")" : "") : String(e); }
    function err(where, e) { nErr++; if (nErr <= 400) log("ERROR  " + where + " :: " + msg(e)); }
    var warned = {};
    function warn(s, once) { if (once) { if (warned[once]) return; warned[once] = 1; } nWarn++; if (nWarn <= 300) log("warn   " + s); }

    // ============================================================ small helpers
    function X(x) { return x - W / 2; }
    function Y(y) { return H / 2 - y; }
    var COMP = function (p) { return [X(p[0]), Y(p[1])]; };   // comp px (y-down) → Cavalry world
    var LOCAL = function (p) { return [p[0], -p[1]]; };      // layer px (y-down, origin = layer anchor) → Cavalry local
    function isKeyed(s) { return s && s.t !== undefined; }
    function keyedAll(s) { if (!isKeyed(s)) return false; var a = JSON.stringify(s.v[0]); for (var i = 1; i < s.v.length; i++) if (JSON.stringify(s.v[i]) !== a) return true; return false; }
    function first(s) { return isKeyed(s) ? s.v[0] : s.s; }
    function specMap(s, fn) { if (!s) return s; if (!isKeyed(s)) return { s: fn(s.s) }; var v = []; for (var i = 0; i < s.v.length; i++) v.push(fn(s.v[i])); return { t: s.t, v: v }; }
    function hex2(n) { n = Math.max(0, Math.min(255, Math.round(n * 255))); return (n < 16 ? "0" : "") + n.toString(16); }
    function hex(c) { return "#" + hex2(c[0]) + hex2(c[1]) + hex2(c[2]); }
    function alpha(c) { return (c && c.length > 3 && c[3] !== undefined ? c[3] : 1) * 100; }
    function uniq(a) { var o = {}, r = []; for (var i = 0; i < a.length; i++) { var k = String(a[i]); if (!o[k]) { o[k] = 1; r.push(a[i]); } } return r; }

    // bezier subpath list → cavalry.Path.  forceCubic keeps the verb pattern identical across path keyframes.
    function toPath(subs, T, forceCubic) {
        var p = new cavalry.Path();
        if (subs && !Array.isArray(subs)) subs = [subs];
        for (var s = 0; s < (subs ? subs.length : 0); s++) {
            var S = subs[s]; if (!S || !S.v || !S.v.length) continue;
            var n = S.v.length, v0 = T(S.v[0]);
            p.moveTo(v0[0], v0[1]);
            var seg = function (j, k) {
                var a = S.v[j], b = S.v[k], o = S.o[j], i = S.i[k], B = T(b);
                if (!forceCubic && !o[0] && !o[1] && !i[0] && !i[1]) { p.lineTo(B[0], B[1]); return; }
                var c1 = T([a[0] + o[0], a[1] + o[1]]), c2 = T([b[0] + i[0], b[1] + i[1]]);
                p.cubicTo(c1[0], c1[1], c2[0], c2[1], B[0], B[1]);
            };
            for (var j = 0; j < n - 1; j++) seg(j, j + 1);
            if (S.c) { seg(n - 1, 0); p.close(); }
        }
        return p;
    }
    function topo(subs) {  // shape "signature": same signature ⇒ keys can interpolate
        if (subs && !Array.isArray(subs)) subs = [subs];
        var r = []; for (var i = 0; i < (subs ? subs.length : 0); i++) r.push(subs[i] && subs[i].v ? subs[i].v.length + (subs[i].c ? "c" : "o") : "-");
        return r.join(",");
    }

    // ============================================================ capabilities (filled in by probe())
    var CAP_ = {
        interpLinear: 1, interpStep: 2,  // modifyKeyframe "type" codes
        pathKeys: false, pathForm: 0,    // inputPath keyframes work? 0 = cavalry.Path, 1 = path.toObject()
        pathAnimSwitch: false,           // needs animation.enabled = true
        editableRecentres: false,        // createEditable moves the points into "position" (info only; static shapes stay correct either way)
        textKeys: false,                 // "text" attribute can be keyframed
        newOnTop: true,                  // api.parent puts a new child at the top of the list
        warpAbs: true,                   // 4-Point Warp corners are absolute positions (else offsets)
        maskForm: "list",                // connect to "masks" directly, or "index" (addArrayIndex + masks.N.id)
        shareNodes: true                 // one filter/shader node may feed many layers
    };
    function pathValue(p) { return CAP_.pathForm === 1 ? p.toObject() : p; }

    // ============================================================ keyframing
    function setInterp(id, attrs, frame, type) {
        var d = {}; for (var i = 0; i < attrs.length; i++) d[attrs[i]] = { frame: frame, type: type };
        try { api.modifyKeyframe(id, d); } catch (e) { err("interp " + attrs.join(","), e); }
    }
    // Apply a static-or-keyed spec. fn(value) → {attr: value, ...}. mode: "lin" | "hold" | function(i) → "lin"/"hold"
    function apply(id, spec, fn, G0, mode, where) {
        if (spec === undefined || spec === null) return;
        try {
            if (!keyedAll(spec)) { api.set(id, fn(first(spec))); return; }
            for (var i = 0; i < spec.t.length; i++) {
                var d = fn(spec.v[i]), f = G0 + spec.t[i];
                api.keyframe(id, f, d);
                var m = typeof mode === "function" ? mode(i) : mode;
                setInterp(id, Object.keys(d), f, m === "hold" ? CAP_.interpStep : CAP_.interpLinear);
            }
        } catch (e) { err(where, e); }
    }
    function span(id, a, b, where) {
        try { api.setInFrame(id, a); api.setOutFrame(id, b); } catch (e) { err("span " + where, e); }
    }

    // ============================================================ scene structure (groups are parented at the end, in draw order)
    var CONTAINERS = [];
    function group(name, parentC) {
        var id = api.create("group", name);
        try { api.set(id, { groupMode: 1 }); } catch (e) { err("groupMode " + name, e); }   // Individual Layers: blend modes reach layers below
        var C = { id: id, kids: [] };
        if (parentC) parentC.kids.push(id);
        CONTAINERS.push(C);
        return C;
    }
    function parentAll() {
        for (var c = 0; c < CONTAINERS.length; c++) {
            var C = CONTAINERS[c], k = CAP_.newOnTop ? C.kids : C.kids.slice().reverse();
            for (var i = 0; i < k.length; i++) { try { api.parent(k[i], C.id); } catch (e) { err("parent", e); } }
        }
    }
    function child(id, parentId) { try { api.parent(id, parentId); } catch (e) { err("parent child", e); } }

    // ============================================================ shared nodes (textures, filters, noise)
    var ROOT = "", TEX = {}, SHARED = {};
    function texture(key) {
        if (TEX[key] !== undefined) return TEX[key];
        var p = ROOT + "/ae/build/bg/" + key + ".png";
        if (!api.filePathExists(p)) { warn("missing texture " + p); TEX[key] = null; return null; }
        try { TEX[key] = api.loadAsset(p, false); } catch (e) { err("loadAsset " + key, e); TEX[key] = null; }
        return TEX[key];
    }
    // one node per distinct setting (per part), connected to many layers when Cavalry allows it
    function sharedNode(kind, key, make) {
        var k = kind + "|" + key;
        if (CAP_.shareNodes && SHARED[k]) return SHARED[k];
        var id = make(); if (CAP_.shareNodes) SHARED[k] = id; return id;
    }
    function addFilter(layerId, kind, key, attrs, name) {
        try {
            var fid = sharedNode(kind, key, function () { var f = api.create(kind, name || kind); api.set(f, attrs); return f; });
            api.connect(fid, "id", layerId, "filters");
            return fid;
        } catch (e) { err("filter " + kind, e); return null; }
    }
    function brushFilters(id, f, where, isFilled) {
        if (!f || f.gen) return;
        try {
            if (f.disp && CONFIG.BRUSH_DISPLACE) {
                var nk = [f.freq || 0.1, f.oct || 2, f.seed || 0].join("_");
                var noise = sharedNode("noiseShader", nk, function () {
                    var n = api.create("noiseShader", "Brush noise " + nk);
                    api.set(n, { frequency: Math.max(0.5, (f.freq || 0.1) * 1024), octaves: Math.max(1, Math.min(8, f.oct || 2)), "offset.x": (f.seed || 0) * 37, "offset.y": (f.seed || 0) * 91 });
                    return n;
                });
                var dk = nk + "_" + f.disp;
                var de = sharedNode("distortEdges", dk, function () {
                    var d = api.create("distortEdges", "Brush edges d" + f.disp);
                    api.set(d, { amplitude: f.disp * 0.9, border: Math.max(2, f.disp * 1.5) });
                    api.connect(noise, "id", d, "shader");
                    return d;
                });
                api.connect(de, "id", id, "filters");
            }
            if (f.blur && !f.thresh) addFilter(id, "blurFilter", "b" + f.blur, { "amount.x": f.blur * 2, "amount.y": f.blur * 2 }, "Brush blur");
            if (f.cblur) addFilter(id, "blurFilter", "b" + f.cblur, { "amount.x": f.cblur * 2, "amount.y": f.cblur * 2 }, "Blur");
            if (f.gray) addFilter(id, "blackAndWhite", "g", {}, "Greyscale");
            if ((f.bright && Math.abs(f.bright - 1) > 0.005) || (f.contrast && Math.abs(f.contrast - 1) > 0.005))
                addFilter(id, "brightnessAndContrast", (f.bright || 1) + "_" + (f.contrast || 1),
                    { brightness: ((f.bright || 1) - 1) * 100, contrast: ((f.contrast || 1) - 1) * 100 }, "Brightness & Contrast");
            if (f.erode) warn("erode filter not supported (" + where + ")", "erode");
        } catch (e) { err(where + " brush", e); }
    }
    function dropShadow(id, d, where) {
        addFilter(id, "dropShadowFilter", JSON.stringify(d), {
            "offset.x": d.x, "offset.y": -d.y, "amount.x": d.blur / 2, "amount.y": d.blur / 2,
            shadowColor: { r: Math.round(d.c[0] * 255), g: Math.round(d.c[1] * 255), b: Math.round(d.c[2] * 255), a: Math.round(alpha(d.c) * 2.55) }
        }, "Drop shadow");
    }

    // ============================================================ masks
    var heldMasks = 0;
    function makeMask(spec, T, name, parentId, G0, where) {
        var id, subs = first(spec), keyed = keyedAll(spec);
        if (keyed && !CAP_.pathKeys) { heldMasks++; keyed = false; }   // summarised once at the end
        id = api.createEditable(toPath(subs, T, keyed), name);
        api.set(id, { fillRule: 1 });
        if (keyed) { api.set(id, { "position.x": 0, "position.y": 0 }); keyPath(id, spec, T, G0, where); }   // path keys are absolute
        if (CONFIG.HIDE_MASKS) api.set(id, { hidden: true });
        if (parentId) child(id, parentId);
        return id;
    }
    function connectMask(maskId, targetId, where) {
        try {
            if (CAP_.maskForm === "index") {
                var n = api.getArrayCount(targetId, "masks"); api.addArrayIndex(targetId, "masks");
                api.connect(maskId, "id", targetId, "masks." + n + ".id");
            } else api.connect(maskId, "id", targetId, "masks");
        } catch (e) { err("mask connect " + where, e); }
    }

    // ============================================================ path keyframes
    function keyPath(id, spec, T, G0, where) {
        var sig = [];
        for (var i = 0; i < spec.v.length; i++) sig.push(topo(spec.v[i]));
        if (CAP_.pathAnimSwitch) { try { api.set(id, { "animation.enabled": true }); } catch (e) {} }
        apply(id, { t: spec.t, v: spec.v }, function (subs) { return { inputPath: pathValue(toPath(subs, T, true)) }; }, G0,
            function (i) { return i + 1 < sig.length && sig[i + 1] !== sig[i] ? "hold" : "lin"; }, where + " path");
    }

    // ============================================================ shape units (one editable shape = fill and/or stroke)
    // o: {name, shape, T, fill, rule, stroke:{w,c,cap,join,dash}, L, C, G0, masks0:[ids], filt, drop, bl, noOpacity}
    function shapeUnit(o) {
        var L = o.L, ids = [];
        var segs = [{ spec: o.shape, a: L.f0, b: L.f1 }];
        if (keyedAll(o.shape) && !CAP_.pathKeys) {   // fallback: one static copy per key interval (stepped)
            segs = [];
            var t = o.shape.t;
            for (var i = 0; i < t.length; i++) {
                var a = i === 0 ? L.f0 : Math.max(L.f0, t[i]), b = i + 1 < t.length ? Math.min(L.f1, t[i + 1] - 1) : L.f1;
                if (b >= a) segs.push({ spec: { s: o.shape.v[i] }, a: a, b: b });
            }
        }
        for (var s = 0; s < segs.length; s++) {
            try {
                var sp = segs[s].spec, keyed = keyedAll(sp);
                var id = api.createEditable(toPath(first(sp), o.T, keyed), o.name);
                if (keyed) { api.set(id, { "position.x": 0, "position.y": 0 }); keyPath(id, sp, o.T, o.G0, o.name); }
                api.set(id, { fillRule: o.rule === 2 ? 0 : 1 });
                var fillCol = o.fill;
                if (fillCol) apply(id, fillCol, function (c) { return { "material.materialColor.r": Math.round(c[0] * 255), "material.materialColor.g": Math.round(c[1] * 255), "material.materialColor.b": Math.round(c[2] * 255), "material.alpha": alpha(c) }; }, o.G0, "lin", o.name + " fill");
                else api.setFill(id, false);
                var st = o.stroke;
                if (!st && fillCol && o.filt && o.filt.dilate && CONFIG.BRUSH_STROKE)   // brush dilate → stroke in the fill colour
                    st = { w: { s: o.filt.dilate * 2 }, c: fillCol, cap: "round", join: "round" };
                if (st) {
                    api.setStroke(id, true);
                    apply(id, st.w, function (w) { return { "stroke.width": w }; }, o.G0, "lin", o.name + " stroke w");
                    apply(id, st.c, function (c) { return { "stroke.strokeColor.r": Math.round(c[0] * 255), "stroke.strokeColor.g": Math.round(c[1] * 255), "stroke.strokeColor.b": Math.round(c[2] * 255), "stroke.alpha": alpha(c) }; }, o.G0, "lin", o.name + " stroke c");
                    var sa = {};
                    if (st.cap && CAP[st.cap] !== undefined) sa["stroke.capStyle"] = CAP[st.cap];
                    if (st.join && JOIN[st.join] !== undefined) sa["stroke.joinStyle"] = JOIN[st.join];
                    if (st.dash && st.dash.length) { sa["stroke.dashPattern"] = st.dash.join(","); }
                    if (Object.keys(sa).length) api.set(id, sa);
                }
                finishLayer(id, o, segs[s].a, segs[s].b);
                if (o.filt) brushFilters(id, o.filt, o.name, !!fillCol);
                if (o.drop) dropShadow(id, o.drop, o.name);
                ids.push(id);
            } catch (e) { err("shape " + o.name, e); }
        }
        return ids;
    }
    // opacity, blend, visibility, masks, placement — shared by every built layer
    function finishLayer(id, o, a, b) {
        var L = o.L;
        if (!o.noOpacity) apply(id, L.op, function (v) { return { opacity: v }; }, o.G0, "lin", o.name + " opacity");
        if (o.bl && o.bl !== "normal") { if (BLEND[o.bl] !== undefined) api.set(id, { blendMode: BLEND[o.bl] }); else warn("blend " + o.bl, "bl" + o.bl); }
        span(id, o.G0 + a, o.G0 + b, o.name);
        for (var m = 0; m < (o.masks0 || []).length; m++) connectMask(o.masks0[m], id, o.name);
        o.C.kids.push(id);
    }

    // ============================================================ images (baked textures on a rectangle)
    function isRect(q) { return Math.abs(q[0][1] - q[1][1]) < 0.01 && Math.abs(q[3][1] - q[2][1]) < 0.01 && Math.abs(q[0][0] - q[3][0]) < 0.01 && Math.abs(q[1][0] - q[2][0]) < 0.01; }
    function imageLayer(key, bm, qspec, size, o) {
        var asset = texture(key); if (!asset) return null;
        var w = size[0], h = size[1], name = o.name;
        var rect = api.primitive("rectangle", name);
        api.set(rect, { "generator.dimensions.x": w, "generator.dimensions.y": h, "material.materialColor": "#ffffff", "material.alpha": 100 });
        var sh = api.create("imageShader", name + " texture");
        api.connect(asset, "id", sh, "image");
        if (CONFIG.IMAGE_BLEND === "replace") api.set(sh, { blendMode: 1 });
        api.connect(sh, "id", rect, "material.colorShaders");
        child(sh, rect);
        var qs = isKeyed(qspec) ? qspec.v : [qspec.s], allRect = true;
        for (var i = 0; i < qs.length; i++) if (!isRect(qs[i])) { allRect = false; break; }
        if (allRect) {   // axis-aligned: plain position + scale
            apply(rect, qspec, function (q) {
                var c = COMP([(q[0][0] + q[2][0]) / 2, (q[0][1] + q[2][1]) / 2]);
                return { "position.x": c[0], "position.y": c[1], "scale.x": (q[1][0] - q[0][0]) / w, "scale.y": (q[3][1] - q[0][1]) / h };
            }, o.G0, "lin", name + " quad");
        } else {         // skewed / perspective: 4-Point Warp with texture triangulation, corners in world space (rect sits at 0,0)
            warp(rect, qspec, function (q) { return [q[0], q[1], q[2], q[3]]; }, { s: [0, 0] }, [w, h], true, o.G0, name, []);
        }
        o.bl = bm;
        finishLayer(rect, o, o.L.f0, o.L.f1);
        return rect;
    }
    // quads → 4-Point Warp. cornersOf(v) returns [TL,TR,BR,BL] in comp px. centreSpec = source-rect centre (local, y-up).
    function warp(targetId, spec, cornersOf, centreSpec, size, tri, G0, name, extraTargets) {
        try {
            var wid = api.create("fourPointWarp", name + " warp");
            api.set(wid, { "size.x": size[0], "size.y": size[1], triangulate: !!tri });
            var cs = keyedAll(centreSpec) ? centreSpec : { s: first(centreSpec) };
            apply(wid, cs, function (c) { return { "centre.x": c[0], "centre.y": c[1] }; }, G0, "lin", name + " warp centre");
            // corners; in offset mode they are relative to the rest rectangle (centre ± size/2)
            var restAt = function (i) {
                var c = first(cs), hw = size[0] / 2, hh = size[1] / 2;
                return [[c[0] - hw, c[1] + hh], [c[0] + hw, c[1] + hh], [c[0] + hw, c[1] - hh], [c[0] - hw, c[1] - hh]][i];
            };
            if (!CAP_.warpAbs && keyedAll(centreSpec)) warn("warp offsets use the first source-rect key (" + name + ")", "warpoff");
            apply(wid, spec, function (v) {
                var q = cornersOf(v), d = {};
                for (var k = 0; k < 4; k++) {
                    var p = COMP(q[k]);
                    if (!CAP_.warpAbs) { var r = restAt(k); p = [p[0] - r[0], p[1] - r[1]]; }
                    d["corner" + k + ".position.x"] = p[0]; d["corner" + k + ".position.y"] = p[1];
                }
                return d;
            }, G0, "lin", name + " warp corners");
            api.connect(wid, "id", targetId, "deformers");
            for (var i = 0; i < (extraTargets || []).length; i++) api.connect(wid, "id", extraTargets[i], "deformers");
            child(wid, targetId);
            return wid;
        } catch (e) { err("warp " + name, e); return null; }
    }

    // ============================================================ masks container: mask 0 clips each built layer, masks 1.. clip nested groups (= intersection)
    function maskSetup(L, C, G0, T, maskParentFor) {
        var r = { C: C, masks0: [] };
        var M = L.masks || [];
        if (!M.length) return r;
        for (var k = M.length - 1; k >= 1; k--) {
            var g = group(L.name + " mask " + (k + 1), r.C);
            var mid = makeMask(M[k], T, L.name + " mask" + (k + 1), maskParentFor ? null : g.id, G0, L.id);
            if (maskParentFor) r.later = (r.later || []).concat([mid]);
            connectMask(mid, g.id, L.id);
            r.C = g;
        }
        var m0 = makeMask(M[0], T, L.name + " mask1", null, G0, L.id);
        if (maskParentFor) r.later = (r.later || []).concat([m0]); else child(m0, r.C.id);
        r.masks0 = [m0];
        return r;
    }

    // ============================================================ builders per data kind
    function buildBox(L, C, G0) {
        var hasImg = L.bg && L.bg.imgs && L.bg.imgs.length, i;
        var ms = maskSetup(L, C, G0, COMP, false);
        var base = { L: L, C: ms.C, G0: G0, T: COMP, masks0: ms.masks0 };
        function unit(extra) { var o = {}, k; for (k in base) o[k] = base[k]; for (k in extra) o[k] = extra[k]; return shapeUnit(o); }
        if (L.orings) for (i = 0; i < L.orings.length; i++)
            unit({ name: L.name + " outer ring " + (i + 1), shape: L.orings[i].shape, stroke: { w: L.orings[i].w, c: L.orings[i].c } });
        if (L.fill) unit({ name: L.name + (hasImg ? " fill" : ""), shape: L.shape, fill: L.fill, rule: 1, bl: L.bl, drop: L.drop,
            filt: L.filt && !L.filt.gen && !hasImg ? L.filt : null });
        if (L.border) unit({ name: L.name + " border", shape: L.border.shape, stroke: { w: L.border.w, c: L.border.c } });
        if (hasImg) {
            var matte = null;
            if (L.needMatte) { matte = makeMask(L.shape, COMP, L.name + " matte", ms.C.id, G0, L.id); }
            for (i = 0; i < L.bg.imgs.length; i++) {
                try {
                    var im = L.bg.imgs[i];
                    var o = { L: L, C: ms.C, G0: G0, name: L.name + " bg" + (L.bg.imgs.length > 1 ? " " + (i + 1) : ""), masks0: ms.masks0.concat(matte ? [matte] : []) };
                    var rid = imageLayer(im.key, im.bm, L.bg.q, L.bg.size, o);
                    if (rid && L.filt && !L.filt.gen) brushFilters(rid, L.filt, o.name, true);
                } catch (e) { err("image " + L.id, e); }
            }
        }
        if (L.rings) for (i = L.rings.length - 1; i >= 0; i--)
            unit({ name: L.name + " inset ring " + (i + 1), shape: L.rings[i].shape, stroke: { w: L.rings[i].w, c: L.rings[i].c } });
    }
    function buildPath(L, C, G0) {
        var ms = maskSetup(L, C, G0, COMP, false);
        if (L.gentex) {   // full-frame baked grain
            var o = { L: L, C: ms.C, G0: G0, name: L.name + " grain", masks0: ms.masks0 };
            imageLayer(L.gentex, L.bl, { s: [[0, 0], [W, 0], [W, H], [0, H]] }, [W, H], o);
            return;
        }
        shapeUnit({ L: L, C: ms.C, G0: G0, T: COMP, masks0: ms.masks0, name: L.name, shape: L.shape, fill: L.fill, rule: L.rule,
            stroke: L.stroke, filt: L.filt, bl: L.bl });
    }

    // text: one Cavalry text layer per run of docs that can be keyed together (same font; same string unless text is keyable)
    function fontOf(ps) {
        var f = FONTS[ps];
        if (!f) { warn("unknown font " + ps, "font" + ps); return null; }
        if (!FONTCHECK[ps]) {
            FONTCHECK[ps] = 1;
            try { if (!cavalry.fontExists(f[0], f[1])) warn("font NOT installed: " + f[0] + " " + f[1] + "  (install fonts/ and restart Cavalry)"); } catch (e) {}
        }
        return f;
    }
    var FONTCHECK = {};
    function buildText(L, C, G0) {
        var d = L.doc, runs = [], cur = null;
        for (var i = 0; i < d.t.length; i++) {
            var v = d.v[i], key = v[1] + (CAP_.textKeys ? "" : "|" + v[0]) + "|" + (v[4] ? "s" : "");
            if (!cur || cur.key !== key) { cur = { key: key, idx: [] }; runs.push(cur); }
            cur.idx.push(i);
        }
        for (var r = 0; r < runs.length; r++) {
            var R = runs[r], i0 = R.idx[0], i1 = R.idx[R.idx.length - 1];
            var a = r === 0 ? L.f0 : Math.max(L.f0, d.t[i0]);
            var b = r + 1 < runs.length ? Math.min(L.f1, d.t[runs[r + 1].idx[0]] - 1) : L.f1;
            if (b < a) continue;
            try { textRun(L, C, G0, R.idx, a, b); } catch (e) { err("text " + L.id + " " + L.name, e); }
        }
    }
    function textRun(L, C, G0, idx, a, b) {
        var d = L.doc, v0 = d.v[idx[0]], f = L.filt || {};
        var name = (v0[0] || "text") + "  " + L.name;
        var docs = { t: [], v: [] };
        for (var i = 0; i < idx.length; i++) { docs.t.push(d.t[idx[i]]); docs.v.push(d.v[idx[i]]); }
        var col = function (v) { return f.flood ? f.flood : v[3]; };
        var t = api.create("textShape", name);
        var font = fontOf(v0[1]) || ["Lato", "Regular"];
        api.set(t, { text: v0[0], "font.font": font[0], "font.style": font[1], fontSize: v0[2], horizontalAlignment: 0, verticalAlignment: 3,
            autoWidth: true, autoHeight: true, letterSpacing: 0 });
        if (v0[5]) warn("letter tracking ignored (" + L.id + ")", "trk");
        if (CAP_.textKeys) apply(t, specMap(docs, function (v) { return v[0]; }), function (s) { return { text: s }; }, G0, "hold", name + " text");
        apply(t, specMap(docs, function (v) { return v[2]; }), function (s) { return { fontSize: s }; }, G0, "hold", name + " size");
        apply(t, specMap(docs, col), function (c) { return { "material.materialColor.r": Math.round(c[0] * 255), "material.materialColor.g": Math.round(c[1] * 255), "material.materialColor.b": Math.round(c[2] * 255), "material.alpha": alpha(c) }; }, G0, "hold", name + " colour");
        // stroke: real text stroke, or the brush "dilate" as a stroke in the text colour
        var hasStroke = !!v0[4];
        if (hasStroke) {
            api.setStroke(t, true);
            apply(t, specMap(docs, function (v) { return v[4] ? v[4][0] : 0; }), function (w) { return { "stroke.width": w }; }, G0, "hold", name + " stroke w");
            apply(t, specMap(docs, function (v) { return v[4] ? v[4][1] : [0, 0, 0, 0]; }), function (c) { return { "stroke.strokeColor.r": Math.round(c[0] * 255), "stroke.strokeColor.g": Math.round(c[1] * 255), "stroke.strokeColor.b": Math.round(c[2] * 255), "stroke.alpha": alpha(c) }; }, G0, "hold", name + " stroke c");
        } else if (f.dilate && CONFIG.BRUSH_STROKE) {
            api.setStroke(t, true);
            api.set(t, { "stroke.width": f.dilate * 2, "stroke.joinStyle": 1, "stroke.capStyle": 1 });
            apply(t, specMap(docs, col), function (c) { return { "stroke.strokeColor.r": Math.round(c[0] * 255), "stroke.strokeColor.g": Math.round(c[1] * 255), "stroke.strokeColor.b": Math.round(c[2] * 255), "stroke.alpha": alpha(c) }; }, G0, "hold", name + " dilate");
        }
        // masks are in the text layer's own space → children of the text
        var ms = maskSetup(L, C, G0, LOCAL, true);
        if (L.route === "affine") {
            apply(t, L.pos, function (p) { return { "position.x": X(p[0]), "position.y": Y(p[1]) }; }, G0, "lin", name + " position");
            apply(t, L.rot, function (r) { return { "rotation.z": -r }; }, G0, "lin", name + " rotation");
            apply(t, L.scl, function (s) { return { "scale.x": s[0] / 100, "scale.y": s[1] / 100 }; }, G0, "lin", name + " scale");
        } else {
            // text anchor sits at the local origin; the pinned box (0..w, 0..h, y-down) around it is warped onto the quad
            var bw = L.box[0], bh = L.box[1];
            var centre = specMap(L.b0, function (p) { return [bw / 2 - p[0], p[1] - bh / 2]; });
            warp(t, L.pin, function (q) { return [q[0], q[1], q[3], q[2]]; }, centre, [bw, bh], false, G0, name, ms.later || []);
        }
        for (var m = 0; m < (ms.later || []).length; m++) child(ms.later[m], t);
        finishLayer(t, { L: L, C: ms.C, G0: G0, name: name, bl: L.bl, masks0: ms.masks0 }, a, b);
        brushFilters(t, f, name, true);
    }

    // ============================================================ capability probe (runs once, in the new comp, then deletes itself)
    function near(a, b, tol) { return typeof a === "number" && Math.abs(a - b) <= (tol || 0.5); }
    function probe() {
        var junk = [];
        function mk(type, name) { var id = type === "rectangle" ? api.primitive("rectangle", name) : api.create(type, name); junk.push(id); return id; }
        var keepFrame = 0; try { keepFrame = api.getFrame(); } catch (e) {}
        // 1) interpolation codes
        try {
            var a = mk("rectangle", "__probe interp");
            api.keyframe(a, 0, { "position.x": 0 }); api.keyframe(a, 10, { "position.x": 100 });
            var codes = [1, 0, 2, 3, 4], lin = null, stp = null;
            for (var c = 0; c < codes.length; c++) {
                try { api.modifyKeyframe(a, { "position.x": { frame: 0, type: codes[c] } }); api.modifyKeyframe(a, { "position.x": { frame: 10, type: codes[c] } }); } catch (e) { continue; }
                api.setFrame(2); var v2 = api.get(a, "position.x"); api.setFrame(9); var v9 = api.get(a, "position.x");
                if (lin === null && near(v2, 20) && near(v9, 90)) lin = codes[c];
                if (stp === null && near(v2, 0, 0.01) && near(v9, 0, 0.01)) stp = codes[c];
            }
            if (lin !== null) CAP_.interpLinear = lin; else warn("probe: could not confirm the LINEAR keyframe type; using " + CAP_.interpLinear);
            if (stp !== null) CAP_.interpStep = stp; else warn("probe: could not confirm the STEP keyframe type; using " + CAP_.interpStep);
        } catch (e) { err("probe interp", e); }
        // 2) editable shapes: recentring + path keyframes
        var sq = function (s, cx) {   // square, all cubic, like keyed paths
            return toPath([{ v: [[cx - s, -s], [cx + s, -s], [cx + s, s], [cx - s, s]], i: [[0, 0], [0, 0], [0, 0], [0, 0]], o: [[0, 0], [0, 0], [0, 0], [0, 0]], c: true }], function (p) { return p; }, true);
        };
        try {
            var e0 = api.createEditable(sq(50, 300), "__probe recentre"); junk.push(e0);
            var px = api.get(e0, "position.x");
            CAP_.editableRecentres = !near(px, 0, 0.01);
        } catch (e) { err("probe recentre", e); }
        try {
            var forms = [0, 1];
            for (var fi = 0; fi < forms.length && !CAP_.pathKeys; fi++) {
                CAP_.pathForm = forms[fi];
                var e1 = api.createEditable(sq(50, 0), "__probe pathkeys " + fi); junk.push(e1);
                api.set(e1, { "position.x": 0, "position.y": 0 });
                try {
                    api.keyframe(e1, 0, { inputPath: pathValue(sq(50, 0)) });
                    api.keyframe(e1, 10, { inputPath: pathValue(sq(100, 0)) });
                } catch (e) { log("probe: inputPath keyframe form " + fi + " rejected: " + msg(e)); continue; }
                var n = 0; try { n = api.getKeyframeTimes(e1, "inputPath").length; } catch (e) {}
                var test = function () {
                    api.setFrame(0); var w0 = api.getBoundingBox(e1, false).width;
                    api.setFrame(10); var w10 = api.getBoundingBox(e1, false).width;
                    return near(w0, 100, 2) && near(w10, 200, 2);
                };
                var ok = n >= 2 && test();
                if (!ok && n >= 2) { try { api.set(e1, { "animation.enabled": true }); ok = test(); if (ok) CAP_.pathAnimSwitch = true; } catch (e) {} }
                if (ok) CAP_.pathKeys = true;
                log("probe: inputPath form " + fi + ": keys=" + n + " works=" + ok);
            }
        } catch (e) { err("probe path keys", e); }
        // 3) text keyframes
        try {
            var t = mk("textShape", "__probe text");
            api.keyframe(t, 0, { text: "A" }); api.keyframe(t, 5, { text: "BB" });
            api.setFrame(0); var s0 = api.get(t, "text"); api.setFrame(6); var s6 = api.get(t, "text");
            CAP_.textKeys = s0 === "A" && s6 === "BB";
        } catch (e) { CAP_.textKeys = false; log("probe: text not keyable (" + msg(e) + ")"); }
        // 4) child order
        try {
            var g = mk("group", "__probe order"), A = mk("rectangle", "__A"), B = mk("rectangle", "__B");
            api.parent(A, g); api.parent(B, g);
            var kids = api.getChildren(g);
            CAP_.newOnTop = kids[0] === B;
        } catch (e) { err("probe order", e); }
        // 5) 4-Point Warp: absolute corners or offsets
        try {
            var r = mk("rectangle", "__probe warp");
            api.set(r, { "generator.dimensions.x": 100, "generator.dimensions.y": 100 });
            var w = mk("fourPointWarp", "__probe warp w");
            api.set(w, { "centre.x": 0, "centre.y": 0, "size.x": 100, "size.y": 100,
                "corner0.position.x": -50, "corner0.position.y": 50, "corner1.position.x": 50, "corner1.position.y": 50,
                "corner2.position.x": 50, "corner2.position.y": -50, "corner3.position.x": -50, "corner3.position.y": -50 });
            api.connect(w, "id", r, "deformers");
            var bw = api.getBoundingBox(r, false).width;
            if (near(bw, 200, 3)) CAP_.warpAbs = false; else if (!near(bw, 100, 3)) warn("probe: 4-Point Warp result width " + bw + " (expected 100 or 200); assuming absolute corners");
        } catch (e) { err("probe warp", e); }
        // 6) masks + sharing one node between layers
        try {
            var m1 = mk("rectangle", "__probe mask"), r1 = mk("rectangle", "__probe masked 1"), r2 = mk("rectangle", "__probe masked 2");
            try { api.connect(m1, "id", r1, "masks"); CAP_.maskForm = "list"; }
            catch (e) { CAP_.maskForm = "index"; api.addArrayIndex(r1, "masks"); api.connect(m1, "id", r1, "masks.0.id"); }
            var inAttrs = []; try { inAttrs = api.getInConnectedAttributes(r1); } catch (e) {}
            if (CAP_.maskForm === "list" && inAttrs.join(" ").indexOf("masks") < 0) {
                try { api.addArrayIndex(r2, "masks"); api.connect(m1, "id", r2, "masks.0.id"); CAP_.maskForm = "index"; } catch (e) {}
            }
            var f = mk("blurFilter", "__probe share");
            api.connect(f, "id", r1, "filters"); api.connect(f, "id", r2, "filters");
            var outs = api.getOutConnections(f, "id");
            CAP_.shareNodes = outs && outs.length >= 2;
        } catch (e) { CAP_.shareNodes = false; err("probe masks/share", e); }
        for (var j = junk.length - 1; j >= 0; j--) { try { if (api.layerExists(junk[j])) api.deleteLayer(junk[j]); } catch (e) {} }
        try { api.setFrame(keepFrame); } catch (e) {}
        log("capabilities " + JSON.stringify(CAP_));
        if (!CAP_.pathKeys) log("NOTE  path keyframes unavailable → morphing shapes are built as stepped copies (one per key)");
    }

    // ============================================================ main
    function findRoot() {
        if (CONFIG.ROOT && api.filePathExists(CONFIG.ROOT + "/ae/build/a1.tracks.json")) return CONFIG.ROOT;
        var home = "";
        try { home = api.getHomeFolder(); } catch (e) {}
        var tries = ["/cavalry-exact", "/Desktop/cavalry-exact", "/Documents/cavalry-exact", "/Downloads/cavalry-exact",
            "/Documents/GitHub/cavalry-exact", "/GitHub/cavalry-exact", "/Projects/cavalry-exact", "/dev/cavalry-exact",
            "/code/cavalry-exact", "/reel-render/cavalry-exact", "/Desktop/cavalry-exact-main", "/Downloads/cavalry-exact-main"];
        for (var i = 0; i < tries.length; i++) if (api.filePathExists(home + tries[i] + "/ae/build/a1.tracks.json")) return home + tries[i];
        var pick = "";
        try { pick = api.presentChooseFolder(home, "Choose the cavalry-exact folder (the one containing ae/ and cavalry/)"); } catch (e) {}
        if (pick && api.filePathExists(pick + "/ae/build/a1.tracks.json")) return pick;
        return "";
    }
    function main() {
        ROOT = findRoot();
        if (!ROOT) { try { console.log("Cavalry Exact: could not find the cavalry-exact folder. Set CONFIG.ROOT at the top of the script."); } catch (e) {} return; }
        try { api.makeFolder(ROOT + "/cavalry", false); } catch (e) {}
        LOGPATH = ROOT + "/cavalry/build_log.txt";
        log("Cavalry Exact build  " + new Date().toString());
        try { log("Cavalry " + api.getCavalryVersion() + "  on " + api.getPlatform()); } catch (e) {}
        log("root " + ROOT + "   ONLY=" + JSON.stringify(CONFIG.ONLY));

        var comp = api.createComp("CAVALRY EXACT");
        api.set(comp, { resolution: [W, H], fps: FPS, backgroundColor: "#121212", startFrame: 0, endFrame: TOTAL_FRAMES - 1, playbackStart: 0, playbackEnd: TOTAL_FRAMES - 1 });
        api.setActiveComp(comp);
        probe();

        var rootC = group("CAVALRY EXACT", null);
        var built = [];
        for (var p = 0; p < PARTS.length; p++) {
            var P = PARTS[p];
            if (CONFIG.ONLY && CONFIG.ONLY.indexOf(P.id) < 0) continue;
            var path = ROOT + "/ae/build/" + P.id + ".tracks.json", D;
            try { D = JSON.parse(api.readFromFile(path)); } catch (e) { err("read " + path, e); continue; }
            SHARED = {};
            var G0 = D.g0, PC = group(P.name, rootC), CC = null;
            log("part " + P.id + ": " + D.layers.length + " layers, frames " + D.g0 + "-" + (D.g1 - 1));
            for (var i = 0; i < D.layers.length; i++) {   // bottom → top
                if (i % CONFIG.CHUNK === 0) CC = group(P.id + " layers " + (i + 1) + "-" + Math.min(D.layers.length, i + CONFIG.CHUNK), PC);
                var L = D.layers[i];
                try {
                    if (L.k === "box") buildBox(L, CC, G0);
                    else if (L.k === "path") buildPath(L, CC, G0);
                    else if (L.k === "text") buildText(L, CC, G0);
                    else warn("unknown layer kind " + L.k);
                } catch (e) { err("layer " + L.id + " (" + L.k + " " + L.name + ")", e); }
                if (i % 200 === 0) { log("   " + P.id + " " + i + "/" + D.layers.length); flush(); }
            }
            built.push([D.g0, D.g1 - 1]);
            log("part " + P.id + " done");
            flush();
        }
        if (heldMasks) warn(heldMasks + " animated masks were held at their first key (no path keyframes in this Cavalry)");
        log("parenting " + CONTAINERS.length + " groups");
        parentAll();
        if (CONFIG.ONLY && built.length) {
            var a = 1e9, b = 0; for (var k = 0; k < built.length; k++) { a = Math.min(a, built[k][0]); b = Math.max(b, built[k][1]); }
            try { api.set(comp, { playbackStart: a, playbackEnd: b }); } catch (e) { err("playback range", e); }
        }
        if (CONFIG.AUDIO) {
            var au = ROOT + "/assets/audio.m4a";
            if (api.filePathExists(au)) { try { api.addAssetToComp(api.loadAsset(au, false)); log("audio added"); } catch (e) { err("audio", e); } }
            else warn("no soundtrack at " + au);
        }
        if (CONFIG.SAVE) {
            try {
                if (!api.getSceneFilePath()) { var sp = ROOT + "/cavalry/CavalryExact.cv"; api.saveSceneAs(sp); log("saved " + sp); }
                else log("scene already has a file; not saving automatically (save it yourself)");
            } catch (e) { err("save", e); }
        }
        try { api.setFrame(built.length ? built[0][0] : 0); } catch (e) {}
    }

    try { main(); } catch (e) { err("main", e); }
    log("DONE  errors=" + nErr + " warnings=" + nWarn + "  (" + ((Date.now() - t0) / 60000).toFixed(1) + " min)");
    flush();
})();

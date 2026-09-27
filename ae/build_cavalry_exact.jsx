/*  Cavalry Exact — native After Effects rebuild
    Run:  File > Scripts > Run Script File...  and pick this file (keep the data/, textures/ folders beside it).
    - Builds into the CURRENT project inside a "Cavalry Exact" folder (never closes or overwrites your work).
    - No dialogs: every problem is written to build_log.txt next to this script; the build keeps going.
    - Needs the fonts in fonts/ installed (Yuji Boku, Yuji Syuku, Yuji Mai, Zen Antique, Shippori Antique B1,
      Kaisei Decol, Ma Shan Zheng, Zhi Mang Xing, Liu Jian Mao Cao).
    Optional: set ONLY below to e.g. ["a4"] to build a single part for a quick test.
*/
(function () {
    var ONLY = null;               // e.g. ["a1"]  — null builds everything
    var SAVE_AS = "CavalryExact.aep";
    var CHUNK = 250;               // layers per sub-comp (keeps AE fast)
    var FPS = 24, W = 1080, H = 1080;
    var PARTS = [
        { id: "a1", name: "01 Seal, Fan & Dial" },
        { id: "a2", name: "02 Slit-scan, Lattice & Collage" },
        { id: "a3", name: "03 Lens, Discs & Swirl" },
        { id: "a4", name: "04 Aged Tiles & 3D Grid" },
        { id: "a5", name: "05 Stroke Galaxy & Glyph Grid" },
        { id: "a6", name: "06 Blessing, Book & Return" }
    ];
    var TOTAL = 29.2917;

    var base = File($.fileName).parent;
    var LOG = new File(base.fsName + "/build_log.txt");
    var nErr = 0, nWarn = 0, t0 = new Date().getTime();
    LOG.encoding = "UTF-8"; LOG.open("w"); LOG.writeln("Cavalry Exact build  " + new Date().toString()); LOG.writeln("AE " + app.version); LOG.close();
    function log(s) { LOG.open("a"); LOG.writeln(((new Date().getTime() - t0) / 1000).toFixed(1) + "s  " + s); LOG.close(); }
    function err(where, e) { nErr++; if (nErr < 400) log("ERROR  " + where + " :: " + (e && e.message ? e.message + (e.line ? " (line " + e.line + ")" : "") : e)); }
    function warn(s) { nWarn++; if (nWarn < 200) log("warn   " + s); }


    // ------------------------------------------------------------------ helpers
    function readJSON(f) {
        f.encoding = "UTF-8"; f.open("r"); var s = f.read(); f.close();
        return eval("(" + s + ")");
    }
    function sec(fr) { return fr / FPS; }
    function isKeyed(p) { return p && p.t !== undefined; }
    function shapeOf(o) {
        var s = new Shape();
        s.vertices = o.v; s.inTangents = o.i; s.outTangents = o.o; s.closed = o.c;
        return s;
    }
    var EMPTY = null;
    function emptyShape() { if (!EMPTY) { EMPTY = new Shape(); EMPTY.vertices = [[0, 0], [0.01, 0], [0.01, 0.01]]; EMPTY.closed = true; } return EMPTY; }
    function col4(c) { return [c[0], c[1], c[2], 1]; }
    // apply a (possibly keyed) spec to a property through a converter
    function setSpec(prop, spec, conv, where) {
        try {
            if (spec === undefined || spec === null) return;
            if (!isKeyed(spec)) { prop.setValue(conv ? conv(spec.s) : spec.s); return; }
            var times = [], vals = [];
            for (var i = 0; i < spec.t.length; i++) { times.push(sec(spec.t[i])); vals.push(conv ? conv(spec.v[i]) : spec.v[i]); }
            if (times.length === 1) prop.setValue(vals[0]); else prop.setValuesAtTimes(times, vals);
        } catch (e) { err(where, e); }
    }
    // i-th component of a keyed/static spec, e.g. subpath i of a shape list
    function specPick(spec, fn) {
        if (!isKeyed(spec)) return { s: fn(spec.s) };
        var v = []; for (var i = 0; i < spec.v.length; i++) v.push(fn(spec.v[i]));
        return { t: spec.t, v: v };
    }
    function specMap(spec, fn) { return specPick(spec, fn); }
    function holdAll(prop) {
        try { for (var k = 1; k <= prop.numKeys; k++) prop.setInterpolationTypeAtKey(k, KeyframeInterpolationType.HOLD, KeyframeInterpolationType.HOLD); } catch (e) {}
    }
    var BLEND = { multiply: "MULTIPLY", screen: "SCREEN", overlay: "OVERLAY", darken: "DARKEN", lighten: "LIGHTEN", "color-dodge": "COLOR_DODGE",
        "color-burn": "COLOR_BURN", "hard-light": "HARD_LIGHT", "soft-light": "SOFT_LIGHT", difference: "DIFFERENCE", exclusion: "EXCLUSION",
        hue: "HUE", saturation: "SATURATION", color: "COLOR", luminosity: "LUMINOSITY", "plus-lighter": "ADD" };
    function setBlend(layer, css) {
        if (!css || css === "normal") return;
        try { var k = BLEND[css]; if (k) layer.blendingMode = BlendingMode[k]; else warn("blend " + css); } catch (e) { err("blend " + css, e); }
    }
    function span(layer, L) {
        try {
            layer.startTime = 0;
            layer.inPoint = sec(L.f0);
            layer.outPoint = Math.min(sec(L.f1 + 1), layer.containingComp.duration);
        } catch (e) { err("span " + L.id, e); }
    }
    function opacity(layer, L, mul) {
        var p = layer.property("ADBE Transform Group").property("ADBE Opacity");
        setSpec(p, L.op, mul ? function (v) { return v * mul; } : null, "opacity " + L.id);
    }
    function identity(layer) {
        var tg = layer.property("ADBE Transform Group");
        tg.property("ADBE Anchor Point").setValue([0, 0]);
        tg.property("ADBE Position").setValue([0, 0]);
    }
    function addMasks(layer, masks, where) {
        if (!masks || !masks.length) return;
        var par = layer.property("ADBE Mask Parade");
        for (var m = 0; m < masks.length; m++) {
            try {
                var mk = par.addProperty("ADBE Mask Atom");
                mk.maskMode = m === 0 ? MaskMode.ADD : MaskMode.INTERSECT;
                setSpec(mk.property("ADBE Mask Shape"), masks[m], shapeOf, where + " mask" + m);
            } catch (e) { err(where + " mask", e); }
        }
    }
    function fx(layer, match) { return layer.property("ADBE Effect Parade").addProperty(match); }
    function setP(eff, idx, names, val, where) {
        var p = null;
        for (var i = 0; i < names.length && !p; i++) { try { p = eff.property(names[i]); } catch (e) {} }
        if (!p) { try { p = eff.property(idx); } catch (e) {} }
        if (!p) { warn("no param " + names[0] + " on " + eff.matchName); return null; }
        try { p.setValue(val); } catch (e) { err(where + " " + names[0], e); }
        return p;
    }
    // SVG/CSS brush & colour filters -> native effects (units: layer space)
    function applyFilter(layer, f, where) {
        if (!f) return;
        try {
            if (f.dilate || f.erode) {
                var e1 = fx(layer, "ADBE Simple Choker");
                setP(e1, 2, ["Choke Matte"], f.dilate ? -f.dilate : f.erode, where);
            }
            if (f.blur) {
                var e2 = fx(layer, "ADBE Gaussian Blur 2");
                setP(e2, 1, ["Blurriness"], f.blur * 2.4, where);
                setP(e2, 3, ["Repeat Edge Pixels"], false, where);
            }
            if (f.thresh) {
                var e3 = fx(layer, "ADBE Simple Choker");
                setP(e3, 2, ["Choke Matte"], 0.5, where);
            }
            if (f.disp) {
                var e4 = fx(layer, "ADBE Turbulent Displace");
                setP(e4, 2, ["Amount"], Math.max(1, f.disp * 0.9), where);
                setP(e4, 3, ["Size"], Math.max(2, Math.min(200, 0.6 / (f.freq || 0.1))), where);
                setP(e4, 5, ["Complexity"], Math.min(10, Math.max(1, f.oct || 2)), where);
            }
            if (f.flood) {
                var e5 = fx(layer, "ADBE Fill");
                setP(e5, 3, ["Color"], col4(f.flood), where);
            }
            if (f.gray) { var e6 = fx(layer, "ADBE Tint"); setP(e6, 3, ["Amount to Tint"], f.gray * 100, where); }
            if (f.bright && Math.abs(f.bright - 1) > 0.005) { var e7 = fx(layer, "ADBE Brightness & Contrast 2"); setP(e7, 1, ["Brightness"], (f.bright - 1) * 100, where); }
            if (f.contrast && Math.abs(f.contrast - 1) > 0.005) { var e8 = fx(layer, "ADBE Brightness & Contrast 2"); setP(e8, 2, ["Contrast"], (f.contrast - 1) * 100, where); }
            if (f.cblur) { var e9 = fx(layer, "ADBE Gaussian Blur 2"); setP(e9, 1, ["Blurriness"], f.cblur * 2.4, where); }
        } catch (e) { err(where + " filter", e); }
    }
    function dropShadow(layer, d, where) {
        try {
            var e = fx(layer, "ADBE Drop Shadow");
            setP(e, 1, ["Shadow Color"], col4(d.c), where);
            setP(e, 2, ["Opacity"], (d.c[3] !== undefined ? d.c[3] : 1) * 100, where);
            var ang = Math.atan2(d.x, -d.y) * 180 / Math.PI; if (ang < 0) ang += 360;
            setP(e, 3, ["Direction"], ang, where);
            setP(e, 4, ["Distance"], Math.sqrt(d.x * d.x + d.y * d.y), where);
            setP(e, 5, ["Softness"], d.blur, where);
        } catch (e2) { err(where + " shadow", e2); }
    }
    // shape-layer building blocks ---------------------------------------------------------
    function groupWithPaths(contents, name, shapeSpec, nsub) {
        var g = contents.addProperty("ADBE Vector Group"); g.name = name;
        var gc = g.property("ADBE Vectors Group");
        for (var i = 0; i < nsub; i++) {
            var pg = gc.addProperty("ADBE Vector Shape - Group");
            (function (i) {
                setSpec(pg.property("ADBE Vector Shape"), specPick(shapeSpec, function (list) { return list[i] ? list[i] : null; }),
                    function (o) { return o ? shapeOf(o) : emptyShape(); }, name + " path" + i);
            })(i);
        }
        return gc;
    }
    function addStroke(gc, w, c, opt, where) {
        var st = gc.addProperty("ADBE Vector Graphic - Stroke");
        setSpec(st.property("ADBE Vector Stroke Color"), c, col4, where + " stroke color");
        setSpec(st.property("ADBE Vector Stroke Opacity"), specMap(c, function (v) { return (v[3] !== undefined ? v[3] : 1) * 100; }), null, where + " stroke op");
        setSpec(st.property("ADBE Vector Stroke Width"), w, null, where + " stroke w");
        if (opt) {
            try { if (opt.cap) st.property("ADBE Vector Stroke Line Cap").setValue(opt.cap === "round" ? 2 : opt.cap === "square" ? 3 : 1); } catch (e) {}
            try { if (opt.join) st.property("ADBE Vector Stroke Line Join").setValue(opt.join === "round" ? 2 : opt.join === "bevel" ? 3 : 1); } catch (e) {}
            if (opt.dash && opt.dash.length) {
                try {
                    var dsh = st.property("ADBE Vector Stroke Dashes");
                    for (var k = 0; k < Math.min(6, opt.dash.length); k++) {
                        var isDash = k % 2 === 0, n = Math.floor(k / 2) + 1;
                        var p = dsh.addProperty(isDash ? "ADBE Vector Stroke Dash " + n : "ADBE Vector Stroke Gap " + n);
                        p.setValue(opt.dash[k]);
                    }
                    if (opt.dash.length % 2 === 1) { var g1 = dsh.addProperty("ADBE Vector Stroke Gap 1"); g1.setValue(opt.dash[0]); }
                } catch (e) { err(where + " dash", e); }
            }
        }
        return st;
    }
    function addFill(gc, c, rule, where) {
        var fl = gc.addProperty("ADBE Vector Graphic - Fill");
        setSpec(fl.property("ADBE Vector Fill Color"), c, col4, where + " fill");
        setSpec(fl.property("ADBE Vector Fill Opacity"), specMap(c, function (v) { return (v[3] !== undefined ? v[3] : 1) * 100; }), null, where + " fill op");
        try { if (rule === 2) fl.property("ADBE Vector Fill Rule").setValue(2); } catch (e) {}
        return fl;
    }

    // footage cache
    var FOOT = {};
    function footage(rel, folder) {
        if (FOOT[rel]) return FOOT[rel];
        var f = new File(base.fsName + "/" + rel);
        if (!f.exists) { warn("missing file " + rel); return null; }
        try { var it = app.project.importFile(new ImportOptions(f)); it.parentFolder = folder; FOOT[rel] = it; return it; }
        catch (e) { err("import " + rel, e); return null; }
    }

    // ------------------------------------------------------------------ builders
    function buildBox(comp, L, F) {
        var where = "box " + L.id + " " + L.name;
        var hasImg = L.bg && L.bg.imgs && L.bg.imgs.length;
        var hasEdge = (L.border || (L.rings && L.rings.length));
        // 1) fill layer: outer rings + fill (+ edge when there are no images)
        var sl = comp.layers.addShape(); sl.name = L.name + (hasImg ? " fill" : ""); identity(sl);
        var cont = sl.property("ADBE Root Vectors Group");
        var i, gc;
        if (!hasImg && hasEdge) buildEdge(cont, L, where);
        if (L.fill) { gc = groupWithPaths(cont, "Fill", L.shape, L.nsub || 1); addFill(gc, L.fill, 1, where); }
        if (L.orings) for (i = 0; i < L.orings.length; i++) { gc = groupWithPaths(cont, "Outer ring " + (i + 1), L.orings[i].shape, 1); addStroke(gc, L.orings[i].w, L.orings[i].c, null, where + " oring"); }
        if (!L.fill && !(L.orings && L.orings.length) && !(!hasImg && hasEdge)) { gc = groupWithPaths(cont, "Shape", L.shape, L.nsub || 1); }
        addMasks(sl, L.masks, where); span(sl, L); opacity(sl, L); setBlend(sl, L.bl);
        if (L.drop) dropShadow(sl, L.drop, where);
        if (L.filt && !L.filt.gen && !hasImg) applyFilter(sl, L.filt, where);
        if (!L.fill && !hasEdge && !(L.orings && L.orings.length)) sl.enabled = false;
        // 2) background images (baked gradients / textures), corner-pinned onto the box
        if (hasImg) {
            var matte = null;
            if (L.needMatte) {
                matte = comp.layers.addShape(); matte.name = L.name + " matte"; identity(matte);
                var mg = groupWithPaths(matte.property("ADBE Root Vectors Group"), "Matte", L.shape, L.nsub || 1);
                addFill(mg, { s: [1, 1, 1, 1] }, 1, where + " matte");
                addMasks(matte, L.masks, where + " matte"); span(matte, L);
                matte.enabled = false;
            }
            for (i = 0; i < L.bg.imgs.length; i++) {
                var im = L.bg.imgs[i];
                var it = footage("textures/" + im.key + ".png", F.tex); if (!it) continue;
                var il = comp.layers.add(it); il.name = L.name + " bg" + (L.bg.imgs.length > 1 ? " " + (i + 1) : "");
                cornerPin(il, L.bg.q, [it.width, it.height], true, where + " bg");
                span(il, L); opacity(il, L); setBlend(il, im.bm);
                if (L.filt && !L.filt.gen) applyFilter(il, L.filt, where + " bg");
                if (matte) { try { il.setTrackMatte(matte, TrackMatteType.ALPHA); } catch (e) { err(where + " trackmatte", e); } }
                else addMasks(il, null, where);
                if (matte) { matte.moveBefore(il); }
            }
            // 3) edge on top of the images
            if (hasEdge) {
                var el = comp.layers.addShape(); el.name = L.name + " edge"; identity(el);
                buildEdge(el.property("ADBE Root Vectors Group"), L, where);
                addMasks(el, L.masks, where); span(el, L); opacity(el, L);
            }
        }
    }
    function buildEdge(cont, L, where) {
        var gc;
        if (L.border) { gc = groupWithPaths(cont, "Border", L.border.shape, 1); addStroke(gc, L.border.w, L.border.c, null, where + " border"); }
        if (L.rings) for (var i = 0; i < L.rings.length; i++) { gc = groupWithPaths(cont, "Inset ring " + (i + 1), L.rings[i].shape, 1); addStroke(gc, L.rings[i].w, L.rings[i].c, null, where + " ring"); }
    }
    // q = [TL, TR, BR, BL] per key  ->  Corner Pin (UL, UR, LL, LR)
    function cornerPin(layer, qspec, wh, fromTopLeftQuad, where) {
        try {
            var tg = layer.property("ADBE Transform Group");
            tg.property("ADBE Anchor Point").setValue([wh[0] / 2, wh[1] / 2]);
            tg.property("ADBE Position").setValue([wh[0] / 2, wh[1] / 2]);
            var e = fx(layer, "ADBE Corner Pin");
            var ids = [0, 1, 3, 2];
            for (var c = 0; c < 4; c++) {
                (function (c) {
                    var p = e.property(c + 1);
                    setSpec(p, specPick(qspec, function (q) { return q[ids[c]]; }), null, where + " pin" + c);
                })(c);
            }
        } catch (e2) { err(where + " cornerpin", e2); }
    }
    function buildPath(comp, L, F) {
        var where = "path " + L.id + " " + L.name;
        if (L.gentex) {  // procedural texture baked to a still
            var it = footage("textures/" + L.gentex + ".png", F.tex);
            if (it) { var gl = comp.layers.add(it); gl.name = L.name + " grain"; addMasks(gl, L.masks, where); span(gl, L); opacity(gl, L); setBlend(gl, L.bl); }
            return;
        }
        var sl = comp.layers.addShape(); sl.name = L.name; identity(sl);
        var gc = groupWithPaths(sl.property("ADBE Root Vectors Group"), "Shape", L.shape, L.nsub || 1);
        if (L.stroke) addStroke(gc, L.stroke.w, L.stroke.c, L.stroke, where);
        if (L.fill) addFill(gc, L.fill, L.rule, where);
        addMasks(sl, L.masks, where); span(sl, L); opacity(sl, L); setBlend(sl, L.bl);
        if (L.filt) applyFilter(sl, L.filt, where);
    }
    function textDocs(prop, L, where, k) {
        k = k || 1;
        var d = L.doc;
        for (var i = 0; i < d.t.length; i++) {
            try {
                var v = d.v[i];   // [text, font, size, [r,g,b,a], [strokeW,[rgba]] | null, tracking]
                var td = prop.valueAtTime(sec(d.t[i]), false);
                td.resetCharStyle();
                td.text = v[0];
                if (v[1]) { try { td.font = v[1]; } catch (ef) { warn("font " + v[1] + " not installed"); } }
                td.fontSize = v[2] / k;
                td.applyFill = true; td.fillColor = [v[3][0], v[3][1], v[3][2]];
                if (v[4]) { td.applyStroke = true; td.strokeColor = [v[4][1][0], v[4][1][1], v[4][1][2]]; td.strokeWidth = v[4][0] / k; td.strokeOverFill = true; }
                else td.applyStroke = false;
                td.tracking = v[5] || 0;
                td.justification = ParagraphJustification.LEFT_JUSTIFY;
                if (d.t.length === 1) prop.setValue(td); else prop.setValueAtTime(sec(d.t[i]), td);
            } catch (e) { err(where + " textdoc", e); }
        }
    }
    function buildText(comp, L, F, partDur) {
        var where = "text " + L.id + " " + L.name;
        if (L.route === "affine") {
            var tl = comp.layers.addText("x"); tl.name = (L.doc.v[0][0] || "text") + "  " + L.name;
            // AE caps font size at 1296 px: use a smaller size and scale the layer up by k instead
            var maxS = 0; for (var q = 0; q < L.doc.v.length; q++) if (L.doc.v[q][2] > maxS) maxS = L.doc.v[q][2];
            var k = maxS > 1200 ? maxS / 1200 : 1;
            textDocs(tl.property("ADBE Text Properties").property("ADBE Text Document"), L, where, k);
            var tg = tl.property("ADBE Transform Group");
            tg.property("ADBE Anchor Point").setValue([0, 0]);
            var pos = tg.property("ADBE Position");
            try { pos.dimensionsSeparated = true; } catch (e) {}
            setSpec(tg.property("ADBE Position_0"), specMap(L.pos, function (p) { return p[0]; }), null, where + " x");
            setSpec(tg.property("ADBE Position_1"), specMap(L.pos, function (p) { return p[1]; }), null, where + " y");
            setSpec(tg.property("ADBE Rotate Z"), L.rot, null, where + " rot");
            setSpec(tg.property("ADBE Scale"), L.scl, k === 1 ? null : function (v) { return [v[0] * k, v[1] * k]; }, where + " scale");
            addMasks(tl, k === 1 ? L.masks : scaleMasks(L.masks, 1 / k), where); span(tl, L); opacity(tl, L); setBlend(tl, L.bl);
            if (L.filt) applyFilter(tl, k === 1 ? L.filt : scaleFilt(L.filt, 1 / k), where);
            return;
        }
        function scaleShape(o, m) {
        var r = { v: [], i: [], o: [], c: o.c };
        for (var j = 0; j < o.v.length; j++) { r.v.push([o.v[j][0] * m, o.v[j][1] * m]); r.i.push([o.i[j][0] * m, o.i[j][1] * m]); r.o.push([o.o[j][0] * m, o.o[j][1] * m]); }
        return r;
    }
    function scaleMasks(masks, m) {
        if (!masks) return masks; var out = [];
        for (var j = 0; j < masks.length; j++) out.push(specMap(masks[j], function (o) { return scaleShape(o, m); }));
        return out;
    }
    function scaleFilt(f, m) {
        var r = {}; for (var key in f) r[key] = f[key];
        if (r.dilate) r.dilate *= m; if (r.erode) r.erode *= m; if (r.blur) r.blur *= m; if (r.disp) r.disp *= m; if (r.freq) r.freq /= m; if (r.cblur) r.cblur *= m;
        return r;
    }
    // perspective / skewed text: text inside a precomp the size of its box, corner-pinned into place
        var bw = Math.max(4, Math.ceil(L.box[0])), bh = Math.max(4, Math.ceil(L.box[1]));
        var pc = app.project.items.addComp((L.doc.v[0][0] || "text") + " " + L.id, bw, bh, 1, partDur, FPS);
        pc.parentFolder = F.pre;
        var t = pc.layers.addText("x"); t.name = L.doc.v[0][0] || "text";
        textDocs(t.property("ADBE Text Properties").property("ADBE Text Document"), L, where);
        var tg2 = t.property("ADBE Transform Group");
        tg2.property("ADBE Anchor Point").setValue([0, 0]);
        setSpec(tg2.property("ADBE Position"), L.b0, null, where + " b0");
        addMasks(t, L.masks, where);
        if (L.filt) applyFilter(t, L.filt, where);
        var pl = comp.layers.add(pc); pl.name = (L.doc.v[0][0] || "text") + "  " + L.name + " (3D)";
        try { pl.collapseTransformation = false; } catch (e) {}
        cornerPin(pl, specMap(L.pin, function (q) { return [q[0], q[1], q[3], q[2]]; }), [bw, bh], true, where);
        span(pl, L); opacity(pl, L); setBlend(pl, L.bl);
    }

    // ------------------------------------------------------------------ main
    function main() {
        var proj = app.project || app.newProject();
        var root = proj.items.addFolder("Cavalry Exact");
        var F = { root: root };
        F.parts = proj.items.addFolder("Parts"); F.parts.parentFolder = root;
        F.pre = proj.items.addFolder("3D text precomps"); F.pre.parentFolder = root;
        F.tex = proj.items.addFolder("Textures"); F.tex.parentFolder = root;
        var mainComp = proj.items.addComp("CAVALRY EXACT (main)", W, H, 1, TOTAL, FPS);
        mainComp.parentFolder = root; mainComp.bgColor = [0.07, 0.07, 0.07];
        var ph = [];
        for (var p = 0; p < PARTS.length; p++) {
            var P = PARTS[p];
            if (ONLY) { var ok = false; for (var q = 0; q < ONLY.length; q++) if (ONLY[q] === P.id) ok = true; if (!ok) continue; }
            var f = new File(base.fsName + "/data/" + P.id + ".json");
            if (!f.exists) { err("data", "missing data/" + P.id + ".json"); continue; }
            var D;
            try { D = readJSON(f); } catch (e) { err("read " + P.id, e); continue; }
            var dur = D.nf / FPS;
            var comp = proj.items.addComp(P.name, W, H, 1, dur, FPS);
            comp.parentFolder = F.parts; comp.bgColor = [0.07, 0.07, 0.07];
            log("part " + P.id + ": " + D.layers.length + " layers");
            // AE slows down sharply as one comp fills up, so big parts are built as stacked sub-comps
            // (collapse transformations ON keeps blend modes working against the chunks below)
            var nChunks = Math.ceil(D.layers.length / CHUNK), chunks = [];
            var sub = null; if (nChunks > 1) { sub = proj.items.addFolder(P.id + " layer chunks"); sub.parentFolder = F.parts; }
            for (var i = 0; i < D.layers.length; i++) {   // bottom -> top; every add goes on top
                if (i % CHUNK === 0 && nChunks > 1) {
                    var c = Math.floor(i / CHUNK);
                    var cc = proj.items.addComp(P.id + " chunk " + (c + 1) + " (layers " + (i + 1) + "-" + Math.min(D.layers.length, i + CHUNK) + ")", W, H, 1, dur, FPS);
                    cc.parentFolder = sub; chunks.push(cc);
                }
                var target = nChunks > 1 ? chunks[chunks.length - 1] : comp;
                var L = D.layers[i];
                try {
                    if (L.k === "box") buildBox(target, L, F);
                    else if (L.k === "path") buildPath(target, L, F);
                    else if (L.k === "text") buildText(target, L, F, dur);
                } catch (e) { err("layer " + L.id + " (" + L.k + " " + L.name + ")", e); }
                if (i % 200 === 0) log("   " + P.id + " " + i + "/" + D.layers.length);
            }
            for (var c2 = 0; c2 < chunks.length; c2++) {   // bottom chunk first; each add lands on top
                try { var cl = comp.layers.add(chunks[c2]); cl.collapseTransformation = true; cl.name = chunks[c2].name; }
                catch (e) { err("chunk " + c2, e); }
            }
            var pl = mainComp.layers.add(comp);
            pl.startTime = D.g0 / FPS;
            pl.moveToEnd();
            ph.push(pl);
            log("part " + P.id + " done");
        }
        if (ONLY) {   // preview build: set the work area to just the parts that were built
            var a = 1e9, b = 0;
            for (var w = 0; w < ph.length; w++) { a = Math.min(a, ph[w].inPoint); b = Math.max(b, ph[w].outPoint); }
            if (ph.length) { try { mainComp.workAreaStart = a; mainComp.workAreaDuration = b - a; } catch (e) {} }
        }
        var au = footage("audio/audio.wav", root);
        if (au) { var al = mainComp.layers.add(au); al.moveToEnd(); al.name = "Original soundtrack"; }
        if (!(app.project.file)) {
            try { app.project.save(new File(base.fsName + "/" + SAVE_AS)); log("saved " + base.fsName + "/" + SAVE_AS); }
            catch (e) { err("save", e); }
        } else log("project already had a file; not saving automatically (save it yourself)");
        try { mainComp.openInViewer(); } catch (e) {}
    }

    // ------------------------------------------------------------------ run
    app.beginSuppressDialogs();
    try { main(); } catch (e) { err("main", e); }
    try { app.endSuppressDialogs(false); } catch (e) {}
    log("DONE  errors=" + nErr + " warnings=" + nWarn + "  (" + ((new Date().getTime() - t0) / 60000).toFixed(1) + " min)");
})();

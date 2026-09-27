// Recolour the opening seal (layer "a1-seal") from vermilion to a deep cobalt blue, then save.
(function () {
    var LOG = new File(File($.fileName).parent.fsName + "/recolor_seal_log.txt");
    LOG.open("w"); LOG.writeln("recolor seal  " + new Date().toString());
    // original red -> new blue
    var MAP = [
        [[0.8118, 0.149, 0.0196], [0.1216, 0.3725, 0.8392]],   // fill + middle ring  -> #1F5FD6
        [[0.7098, 0.1647, 0.0627], [0.1020, 0.3059, 0.7098]],  // inner ring         -> #1A4EB5
        [[0.6039, 0.0863, 0.0], [0.0588, 0.2275, 0.5569]],     // darkest ring       -> #0F3A8E
        [[0.9255, 0.6745, 0.6275], [0.6275, 0.7373, 0.9255]]   // pale outer ring    -> #A0BCEC
    ];
    function mapCol(c) {
        var best = null, bd = 1e9;
        for (var i = 0; i < MAP.length; i++) { var o = MAP[i][0], d = Math.abs(c[0] - o[0]) + Math.abs(c[1] - o[1]) + Math.abs(c[2] - o[2]); if (d < bd) { bd = d; best = MAP[i][1]; } }
        return bd < 0.08 ? [best[0], best[1], best[2], c.length > 3 ? c[3] : 1] : null;
    }
    var changed = 0;
    function walk(g) {
        for (var i = 1; i <= g.numProperties; i++) {
            var p = g.property(i);
            if (p.propertyType === PropertyType.PROPERTY) {
                if (p.matchName === "ADBE Vector Fill Color" || p.matchName === "ADBE Vector Stroke Color") {
                    if (p.numKeys > 0) { for (var k = 1; k <= p.numKeys; k++) { var nv = mapCol(p.keyValue(k)); if (nv) { p.setValueAtKey(k, nv); changed++; } } }
                    else { var v = mapCol(p.value); if (v) { p.setValue(v); changed++; } }
                }
            } else walk(p);
        }
    }
    app.beginUndoGroup("Recolour seal blue");
    var hits = 0;
    for (var n = 1; n <= app.project.numItems; n++) {
        var it = app.project.item(n);
        if (!(it instanceof CompItem)) continue;
        for (var l = 1; l <= it.numLayers; l++) {
            var ly = it.layer(l);
            if (ly.name === "a1-seal" && ly.matchName === "ADBE Vector Layer") { hits++; LOG.writeln("layer in comp: " + it.name); walk(ly.property("ADBE Root Vectors Group")); }
        }
    }
    app.endUndoGroup();
    LOG.writeln("layers found: " + hits + "  colours changed: " + changed);
    try { if (app.project.file) { app.project.save(); LOG.writeln("saved " + app.project.file.fsName); } } catch (e) { LOG.writeln("save failed: " + e.message); }
    LOG.writeln("DONE"); LOG.close();
})();

// Dry-run cavalry/build_cavalry_exact.js in Node against a strict mock of the Cavalry 2.7.2 scripting API.
//   node cavalry/mock_run.cjs                 → both modes, all 6 parts
//   node cavalry/mock_run.cjs ok a1,a2        → one mode ("ok" | "fallback"), some parts
// The mock validates every attribute path / enum value / connection against cavalry_ref/nodeDefinitions.json,
// evaluates keyframes (so the script's capability probe really runs), and checks the final layer tree.
// "ok"       : Cavalry behaves as hoped (path + text keyframes, absolute warp corners, masks via list, shared nodes)
// "fallback" : every probe fails the other way, forcing all fallback code paths.
const fs = require('fs'), path = require('path'), vm = require('vm');
const REPO = path.resolve(__dirname, '..');
const DEFS = JSON.parse(fs.readFileSync(path.join(REPO, 'cavalry_ref', 'nodeDefinitions.json'), 'utf8'));
const NODE = {}; for (const n of DEFS) NODE[n.nodeType || n.type] = n;

// ---------------------------------------------------------------- attribute schema
function attrsOf(type) {   // merged attribute table incl. super types (sub-type overrides merged over base)
  const chain = []; let t = type;
  while (t && NODE[t]) { chain.unshift(NODE[t]); t = NODE[t].superType; }
  if (!chain.length) throw new Error('unknown node type ' + type);
  const out = {};
  for (const n of chain) for (const [k, v] of Object.entries(n.attributes || {})) out[k] = Object.assign({}, out[k] || {}, v);
  return out;
}
const VEC = { double2: ['x', 'y', '*'], int2: ['x', 'y', '*'], double3: ['x', 'y', 'z', '*'], color: ['r', 'g', 'b', 'a', '*'], font: ['font', 'style'] };
const PRIM = { rectangle: 'rectangleShape', ellipse: 'ellipseShape', polygon: 'polygonShape' };
function resolve(L, attrPath) {   // → attribute definition, or throws
  const seg = attrPath.split('.'); let table = attrsOf(L.type), def = null, i = 0;
  while (i < seg.length) {
    const s = seg[i];
    if (!def) { def = table[s]; if (!def) throw new Error(`${L.type} has no attribute "${seg.slice(0, i + 1).join('.')}"`); i++; continue; }
    // descend
    if (def.type === 'nodeId' || def.defaultSubnodeType || (def.type === undefined && def.defaultSubnodeType)) {
      let sub = def.defaultSubnodeType || (def.supportedInputNodeTypes || [])[0];
      if (seg[i - 1] === 'generator' && L.prim) sub = PRIM[L.prim];
      if (!sub || !NODE[sub]) throw new Error(`cannot descend into ${seg.slice(0, i).join('.')}`);
      table = attrsOf(sub); def = null; continue;
    }
    if (def.type === 'compound') {
      const c = (def.children || []).find((x) => x.id === s); if (!c) throw new Error(`compound ${seg.slice(0, i).join('.')} has no child ${s}`);
      def = c; i++; continue;
    }
    if (def.type === 'list') {
      if (!/^\d+$/.test(s)) throw new Error(`list index expected at ${attrPath}`);
      def = def.child; i++; continue;
    }
    if (VEC[def.type]) { if (!VEC[def.type].includes(s)) throw new Error(`${def.type} has no component ${s} (${attrPath})`); def = { type: def.type === 'font' ? 'string' : def.type === 'int2' ? 'int' : 'double', keyable: def.keyable }; i++; continue; }
    throw new Error(`cannot descend into ${def.type} at ${attrPath}`);
  }
  return def;
}
function checkValue(def, v, where) {
  const num = (x) => typeof x === 'number' && isFinite(x);
  switch (def.type) {
    case 'double': case 'int': if (!num(v)) throw new Error(`${where}: number expected, got ${JSON.stringify(v)}`); break;
    case 'bool': if (typeof v !== 'boolean' && v !== 0 && v !== 1) throw new Error(`${where}: bool expected`); break;
    case 'enum': if (!(def.enumValues || []).includes(v)) throw new Error(`${where}: enum value ${v} not in ${JSON.stringify(def.enumValues)}`); break;
    case 'string': case 'richText': if (typeof v !== 'string') throw new Error(`${where}: string expected`); break;
    case 'color': if (!(typeof v === 'string' && /^#[0-9a-f]{6}([0-9a-f]{2})?$/i.test(v)) && !(v && ['r', 'g', 'b'].every((k) => num(v[k])))) throw new Error(`${where}: bad colour ${JSON.stringify(v)}`); break;
    case 'double2': case 'int2': case 'double3': if (!(Array.isArray(v) && v.every(num)) && !(v && num(v.x))) throw new Error(`${where}: vector expected`); break;
    case 'editablePath2': if (!(v instanceof MockPath) && !(v && v.__pathObject)) throw new Error(`${where}: path expected`); break;
    default: break;
  }
}

// ---------------------------------------------------------------- mock world
class MockPath {
  constructor() { this.cmds = []; this.open = false; }
  _n(a) { for (const x of a) if (typeof x !== 'number' || !isFinite(x)) throw new Error('Path: bad coordinate ' + x); }
  moveTo(x, y) { this._n([x, y]); this.cmds.push(['M', x, y]); this.open = true; }
  lineTo(x, y) { this._n([x, y]); if (!this.open) throw new Error('lineTo before moveTo'); this.cmds.push(['L', x, y]); }
  cubicTo(a, b, c, d, e, f) { this._n([a, b, c, d, e, f]); if (!this.open) throw new Error('cubicTo before moveTo'); this.cmds.push(['C', a, b, c, d, e, f]); }
  close() { this.cmds.push(['Z']); this.open = false; }
  toObject() { return { __pathObject: true, cmds: this.cmds.map((c) => c.slice()) }; }
  verbs() { return this.cmds.map((c) => c[0]).join(''); }
  bbox() { let a = Infinity, b = -Infinity, c = Infinity, d = -Infinity; for (const k of this.cmds) for (let i = 1; i < k.length; i += 2) { a = Math.min(a, k[i]); b = Math.max(b, k[i]); c = Math.min(c, k[i + 1]); d = Math.max(d, k[i + 1]); } return { width: b - a, height: d - c, minx: a, miny: c }; }
}
const asPath = (v) => { if (v instanceof MockPath) return v; const p = new MockPath(); p.cmds = v.cmds; return p; };

function makeWorld(mode) {
  const OK = mode === 'ok';
  const INTERP = OK ? { 0: 'bezier', 1: 'linear', 2: 'step' } : { 0: 'linear', 1: 'bezier', 3: 'step' };
  const L = {}; let nid = 0, frame = 0, activeComp = null;
  const stats = { layers: {}, keys: 0, sets: 0, connects: 0, calls: 0, parents: 0 };
  const id = (t) => `${t}#${++nid}`;
  function newLayer(type, name, extra) {
    attrsOf(type);
    const x = Object.assign({ id: id(type), type, name: name || type, vals: {}, keys: {}, kids: [], parent: null, conns: [], comp: activeComp }, extra || {});
    L[x.id] = x; stats.layers[type] = (stats.layers[type] || 0) + 1; return x.id;
  }
  const get = (lid, where) => { const x = L[lid]; if (!x) throw new Error(`${where}: no layer ${lid}`); return x; };
  function evalKeys(x, a) {
    const k = x.keys[a]; if (!k || !k.length) return x.vals[a];
    const s = k.slice().sort((p, q) => p.f - q.f);
    if (frame <= s[0].f) return s[0].v; if (frame >= s[s.length - 1].f) return s[s.length - 1].v;
    let j = 0; while (s[j + 1].f <= frame) j++;
    const u = (frame - s[j].f) / (s[j + 1].f - s[j].f), mode = INTERP[s[j].type] || 'bezier';
    if (mode === 'step' || typeof s[j].v !== 'number') return s[j].v;
    const e = mode === 'linear' ? u : u * u * (3 - 2 * u);
    return s[j].v + (s[j + 1].v - s[j].v) * e;
  }
  const W = {
    L, stats,
    api: {
      createComp(name) { const c = newLayer('compNode', name); activeComp = c; return c; },
      setActiveComp(c) { get(c, 'setActiveComp'); activeComp = c; },
      create(type, name) { if (typeof type !== 'string') throw new Error('create: type'); if (!NODE[type]) throw new Error('create: unknown layer type ' + type); if (NODE[type].abstract) throw new Error('create: abstract type ' + type); return newLayer(type, name); },
      primitive(kind, name) { if (!PRIM[kind]) throw new Error('primitive: unknown ' + kind); if (typeof name !== 'string') throw new Error('primitive: name required'); return newLayer('basicShape', name, { prim: kind }); },
      createEditable(p, name) { if (!(p instanceof MockPath)) throw new Error('createEditable: cavalry.Path expected'); if (typeof name !== 'string') throw new Error('createEditable: name required'); const e = newLayer('editableShape', name); L[e].vals.inputPath = p; return e; },
      set(lid, d) {
        const x = get(lid, 'set'); if (!d || typeof d !== 'object') throw new Error('set: dictionary expected');
        for (const [a, v] of Object.entries(d)) { const def = resolve(x, a); checkValue(def, v, `set ${x.type}.${a}`); x.vals[a] = v; stats.sets++; }
      },
      get(lid, a) { const x = get(lid, 'get'); resolve(x, a); if (a === 'position.x' && x.vals.__recentred) return x.vals.__recentred; const v = evalKeys(x, a); return v === undefined ? 0 : v; },
      keyframe(lid, f, d) {
        const x = get(lid, 'keyframe'); if (!Number.isInteger(f)) throw new Error('keyframe: integer frame expected, got ' + f);
        for (const [a, v] of Object.entries(d)) {
          const def = resolve(x, a);
          if (def.keyable === false) throw new Error(`keyframe: ${a} is not keyable`);
          if (!OK && (a === 'inputPath' || a === 'text')) throw new Error(`keyframe: ${a} cannot be keyframed (mock fallback mode)`);
          checkValue(def, v, `keyframe ${x.type}.${a}`);
          if (a === 'inputPath') {   // path keys must keep one verb pattern to interpolate
            const k0 = (x.keys[a] || [])[0];
            if (k0 && asPath(k0.v).cmds.length !== asPath(v).cmds.length) x.topoChanges = (x.topoChanges || 0) + 1;
          }
          const ks = x.keys[a] || (x.keys[a] = []), old = ks.find((k) => k.f === f);
          if (old) old.v = v; else ks.push({ f, v, type: 0 });
          stats.keys++;
        }
        return 'kf';
      },
      modifyKeyframe(lid, d) {
        const x = get(lid, 'modifyKeyframe');
        for (const [a, o] of Object.entries(d)) {
          const k = (x.keys[a] || []).find((q) => q.f === o.frame); if (!k) throw new Error(`modifyKeyframe: no key on ${a} at ${o.frame}`);
          if (!Number.isInteger(o.type)) throw new Error('modifyKeyframe: type'); k.type = o.type;
        }
      },
      getKeyframeTimes(lid, a) { const x = get(lid, 'getKeyframeTimes'); return (x.keys[a] || []).map((k) => k.f); },
      setFrame(f) { frame = f; }, getFrame() { return frame; },
      setInFrame(lid, f) { const x = get(lid, 'setInFrame'); if (!Number.isInteger(f) || f < 0) throw new Error('setInFrame: bad frame ' + f); x.inF = f; },
      setOutFrame(lid, f) { const x = get(lid, 'setOutFrame'); if (!Number.isInteger(f)) throw new Error('setOutFrame: bad frame ' + f); if (x.inF !== undefined && f < x.inF) throw new Error(`setOutFrame ${f} < in ${x.inF}`); x.outF = f; },
      parent(lid, p) {
        const x = get(lid, 'parent'), P = get(p, 'parent target'); if (lid === p) throw new Error('parent: self');
        if (x.parent) { const o = L[x.parent]; o.kids.splice(o.kids.indexOf(lid), 1); }
        x.parent = p; if (OK) P.kids.unshift(lid); else P.kids.push(lid); stats.parents++;
      },
      getChildren(p) { return get(p, 'getChildren').kids.slice(); },
      connect(from, fa, to, ta) {
        const X = get(from, 'connect from'), T = get(to, 'connect to');
        if (fa !== 'id') resolve(X, fa);
        if (ta === 'masks' && !OK) throw new Error('connect: masks needs an index (mock fallback mode)');
        const def = /^(masks|filters|deformers|material\.colorShaders)$/.test(ta) ? { type: 'list' } : resolve(T, ta);
        if (!['list', 'nodeId', 'shaderData', 'assetId'].includes(def.type)) throw new Error(`connect: ${T.type}.${ta} (${def.type}) is not an input for a node`);
        if (ta === 'masks' || /^masks\.\d+\.id$/.test(ta)) { if (!['editableShape', 'basicShape', 'textShape'].includes(X.type)) throw new Error('mask must be a shape'); }
        if (ta === 'filters' && !attrsOf(X.type).out) throw new Error('filters: not a filter ' + X.type);
        if (ta === 'shader' && X.type !== 'noiseShader') throw new Error('shader input expects a shader');
        if (ta === 'image' && X.type !== 'asset') throw new Error('image input expects an asset');
        X.conns.push([to, ta]); T.inConns = (T.inConns || []).concat([ta]); stats.connects++;
      },
      getOutConnections(lid) { const x = get(lid, 'getOutConnections'); return OK ? x.conns.map((c) => c.join('.')) : x.conns.slice(0, 1).map((c) => c.join('.')); },
      getInConnectedAttributes(lid) { return (get(lid, 'getInConnectedAttributes').inConns || []).slice(); },
      addArrayIndex(lid, a) { const x = get(lid, 'addArrayIndex'); if (resolve(x, a).type !== 'list') throw new Error('addArrayIndex: not a list'); x.arr = (x.arr || 0) + 1; return x.arr - 1; },
      getArrayCount(lid) { return get(lid, 'getArrayCount').arr || 0; },
      getBoundingBox(lid) {
        const x = get(lid, 'getBoundingBox');
        if (x.type === 'editableShape') { const p = evalPath(x); const b = p.bbox(); return { width: b.width, height: b.height, x: b.minx, y: b.miny, centre: { x: 0, y: 0 } }; }
        const warped = x.conns && Object.values(L).some((w) => w.type === 'fourPointWarp' && w.conns.some((c) => c[0] === lid));
        return { width: warped && !OK ? 200 : 100, height: 100, x: 0, y: 0, centre: { x: 0, y: 0 } };
      },
      setFill(lid, on) { get(lid, 'setFill'); if (typeof on !== 'boolean') throw new Error('setFill: bool'); },
      setStroke(lid, on) { const x = get(lid, 'setStroke'); if (typeof on !== 'boolean') throw new Error('setStroke: bool'); x.hasStroke = on; },
      loadAsset(p, seq) { if (typeof seq !== 'boolean') throw new Error('loadAsset: isImageSequence bool required'); if (!fs.existsSync(p)) throw new Error('loadAsset: missing ' + p); return newLayer('asset', path.basename(p)); },
      addAssetToComp(a) { get(a, 'addAssetToComp'); return 'layer'; },
      deleteLayer(lid) { get(lid, 'deleteLayer'); const x = L[lid]; if (x.parent) { const P = L[x.parent]; P.kids.splice(P.kids.indexOf(lid), 1); } for (const k of x.kids) delete L[k]; delete L[lid]; },
      layerExists(lid) { return !!L[lid]; },
      readFromFile(p) { return fs.readFileSync(p, 'utf8'); },
      writeToFile(p, content, ow) { if (typeof content !== 'string') throw new Error('writeToFile: string'); W.logText = content; return true; },
      filePathExists(p) { return fs.existsSync(p); },
      makeFolder() { return true; },
      getHomeFolder() { return path.dirname(REPO); },
      presentChooseFolder() { throw new Error('mock: presentChooseFolder should not be needed'); },
      getCavalryVersion() { return '2.7.2 (mock)'; }, getPlatform() { return 'mock'; },
      getSceneFilePath() { return ''; }, saveSceneAs(p) { W.saved = p; return true; },
    },
    cavalry: { Path: MockPath, fontExists: () => true },
  };
  function evalPath(x) { const v = evalKeys(x, 'inputPath'); return asPath(v); }
  // every API function counts as a call
  for (const k of Object.keys(W.api)) { const f = W.api[k]; W.api[k] = function () { stats.calls++; return f.apply(this, arguments); }; }
  // make sure the script only calls functions that exist in Cavalry's API metadata
  const META = new Set([].concat(...['api', 'gui_api'].map((m) => JSON.parse(fs.readFileSync(path.join(REPO, 'cavalry_ref', 'MetaData', m + '_function_metadata.json'), 'utf8')).map((f) => f.name))));
  for (const k of Object.keys(W.api)) if (!META.has(k)) throw new Error('mock api.' + k + ' is not in Cavalry metadata');
  const CORE = new Set(JSON.parse(fs.readFileSync(path.join(REPO, 'cavalry_ref', 'MetaData', 'core_api_function_metadata.json'), 'utf8')).map((f) => f.name));
  for (const k of Object.keys(W.cavalry)) if (!CORE.has(k)) throw new Error('mock cavalry.' + k + ' is not in Cavalry metadata');
  const PM = JSON.parse(fs.readFileSync(path.join(REPO, 'cavalry_ref', 'MetaData', 'core_api_function_metadata.json'), 'utf8')).find((f) => f.name === 'Path').methods.map((m) => m.name);
  for (const k of Object.getOwnPropertyNames(MockPath.prototype)) if (k !== 'constructor' && !k.startsWith('_') && !['verbs', 'bbox'].includes(k) && !PM.includes(k)) throw new Error('cavalry.Path.' + k + ' not in metadata');
  return W;
}

// ---------------------------------------------------------------- run
function run(mode, only) {
  const W = makeWorld(mode);
  let src = fs.readFileSync(path.join(__dirname, 'build_cavalry_exact.js'), 'utf8');
  if (only) src = src.replace(/ONLY: null,/, 'ONLY: ' + JSON.stringify(only) + ',');
  src = src.replace(/AUDIO: true,/, 'AUDIO: true,');
  const logs = [];
  const ctx = { api: W.api, cavalry: W.cavalry, console: { log: (s) => logs.push(s) } };
  vm.createContext(ctx);
  const t0 = Date.now();
  vm.runInContext(src, ctx, { filename: 'build_cavalry_exact.js' });
  const secs = ((Date.now() - t0) / 1000).toFixed(1);
  const log = W.logText || '';
  fs.mkdirSync(path.join(__dirname, 'mock_logs'), { recursive: true });
  fs.writeFileSync(path.join(__dirname, 'mock_logs', mode + (only ? '_' + only.join('_') : '') + '.log'), log);
  // ---- structural checks on the finished scene
  const problems = [];
  const L = W.L, all = Object.values(L);
  const drawn = all.filter((x) => ['editableShape', 'basicShape', 'textShape', 'group'].includes(x.type));
  const roots = drawn.filter((x) => !x.parent);
  if (roots.length !== 1) problems.push(`expected exactly 1 top-level group, found ${roots.length}: ${roots.slice(0, 5).map((r) => r.name).join(', ')}`);
  for (const x of all) if (x.name && x.name.startsWith('__probe')) problems.push('probe layer left behind: ' + x.name);
  for (const x of drawn) if (x.type !== 'group' && !x.vals.hidden && x.inF === undefined) problems.push('visible layer without in/out: ' + x.name);
  for (const x of all) if (x.type === 'editableShape' && x.keys.inputPath) {
    const vb = x.keys.inputPath.map((k) => asPath(k.v).verbs()); if (new Set(vb).size > 1 && !x.topoChanges) problems.push('path keys with different verbs: ' + x.name);
  }
  // draw order: inside every group the children must run top→bottom = last-built → first-built
  const num = (lid) => +lid.split('#')[1];
  for (const g of all.filter((x) => x.type === 'group')) {
    const ids = g.kids.filter((k) => L[k] && !L[k].vals.hidden && ['editableShape', 'basicShape', 'textShape', 'group'].includes(L[k].type)).map(num);
    for (let i = 1; i < ids.length; i++) if (ids[i] > ids[i - 1]) { problems.push('draw order wrong inside group ' + g.name); break; }
  }
  const m = /DONE\s+errors=(\d+)\s+warnings=(\d+)/.exec(log);
  const errs = m ? +m[1] : -1;
  console.log(`\n=== mode ${mode}${only ? ' ' + only.join(',') : ''}: ${secs}s  api calls ${W.stats.calls}  keys ${W.stats.keys}  connects ${W.stats.connects}  parents ${W.stats.parents}`);
  console.log('    layers: ' + Object.entries(W.stats.layers).sort((a, b) => b[1] - a[1]).map((e) => e.join(' ')).join(', '));
  console.log('    ' + log.split('\n').filter((l) => /capabilities|NOTE|part a\d+:|DONE|saved/.test(l)).join('\n    '));
  const errLines = log.split('\n').filter((l) => /ERROR/.test(l));
  if (errLines.length) console.log('    first errors:\n      ' + errLines.slice(0, 15).join('\n      '));
  const wl = log.split('\n').filter((l) => /\bwarn\s/.test(l)); if (wl.length) console.log('    warnings (' + wl.length + ' shown max 8):\n      ' + wl.slice(0, 8).join('\n      '));
  if (problems.length) console.log('    STRUCTURE PROBLEMS (' + problems.length + '):\n      ' + problems.slice(0, 15).join('\n      '));
  return errs === 0 && problems.length === 0;
}

if (require.main !== module) { module.exports = { makeWorld, MockPath }; return; }
const [modeArg, partsArg] = process.argv.slice(2);
const modes = modeArg ? [modeArg] : ['ok', 'fallback'];
const only = partsArg ? partsArg.split(',') : null;
let pass = true;
for (const md of modes) pass = run(md, only) && pass;
console.log(pass ? '\nPASS: 0 errors' : '\nFAIL');
process.exit(pass ? 0 : 1);

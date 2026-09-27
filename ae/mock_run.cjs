// Dry-run the ExtendScript builder in Node against a permissive mock of the AE object model.
const fs = require('fs'), path = require('path'), vm = require('vm');
const JSX = process.argv[2]; const DIR = path.dirname(path.resolve(JSX));
let calls = 0; const stats = {};
function U(name) { // universal mock object
  const f = function () {}; const store = {};
  return new Proxy(f, {
    get(t, k) { if (k === Symbol.toPrimitive) return () => 1; if (k === 'valueOf') return () => 1; if (k === 'toString') return () => name;
      if (k in store) return store[k]; if (k === 'numKeys') return 0; if (k === 'width' || k === 'height' || k === 'duration') return 100;
      return U(name + '.' + String(k)); },
    set(t, k, v) { store[k] = v; return true; },
    apply(t, th, args) { calls++; stats[name.split('.').pop()] = (stats[name.split('.').pop()] || 0) + 1;
      const last = name.split('.').pop();
      if (last === 'setValuesAtTimes') { if (args[0].length !== args[1].length) throw new Error('times/values length mismatch'); for (const x of args[0]) if (typeof x !== 'number' || isNaN(x)) throw new Error('bad time ' + x); }
      if (last === 'setValue' && (args[0] === undefined)) throw new Error('setValue(undefined) at ' + name);
      if (last === 'setValue' && Array.isArray(args[0]) && args[0].some((v) => typeof v === 'number' && isNaN(v))) throw new Error('NaN in setValue at ' + name);
      return U(name + '()'); },
    construct() { return U(name + '#new'); } });
}
class File_ { constructor(p) { this.fsName = p; this.p = p; this.encoding = ''; }
  get parent() { return new File_(path.dirname(this.p)); } get exists() { return fs.existsSync(this.p); }
  open(m) { this.m = m; if (m === 'w') fs.writeFileSync(this.p, ''); return true; } close() {}
  read() { return fs.readFileSync(this.p, 'utf8'); } writeln(s) { fs.appendFileSync(this.p, s + '\n'); } }
class Shape { constructor() { this.vertices = []; this.inTangents = []; this.outTangents = []; this.closed = false; } }
const File = function (p) { return new File_(p); };
const ctx = { File, Shape, $: { fileName: path.resolve(JSX) }, app: U('app'), ImportOptions: function () {}, TextDocument: function () {},
  KeyframeInterpolationType: U('KIT'), BlendingMode: U('BM'), MaskMode: U('MM'), TrackMatteType: U('TMT'), ParagraphJustification: U('PJ'), Math, Date, eval: null };
ctx.app.project = U('project'); ctx.app.project.file = null;
vm.createContext(ctx); ctx.eval = (s) => vm.runInContext(s, ctx);
const t0 = Date.now();
vm.runInContext(fs.readFileSync(JSX, 'utf8'), ctx, { filename: 'build.jsx' });
console.log('mock calls', calls, 'in', ((Date.now() - t0) / 1000).toFixed(1) + 's');
console.log(Object.entries(stats).sort((a, b) => b[1] - a[1]).slice(0, 14).map((e) => e.join(':')).join('  '));
console.log(fs.readFileSync(path.join(DIR, 'build_log.txt'), 'utf8').split('\n').filter((l) => /ERROR|warn|DONE|part a/.test(l)).slice(0, 40).join('\n'));

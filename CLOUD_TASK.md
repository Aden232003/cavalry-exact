# Cloud task: build the Cavalry version of "cavalry-exact"

Owner: Aden (GitHub Aden232003). Target app: **Cavalry 2.7.2** on Aden's Mac (not available in the cloud).

## Goal
Write `cavalry/build_cavalry_exact.js`: a Cavalry JavaScript script that Aden pastes into Cavalry's
**JavaScript Editor** tab and runs once. It must build the full 29.29 s recreation of `ref/cavlry.mp4`
as native Cavalry layers (text layers for glyphs, editable shapes for tiles/lines/handles, image layers
for textures, keyframes for all motion), 1080×1080, 24 fps, plus a 0–10.5 s preview mode (`ONLY=["a1","a2"]`).
Deliver it the same way the After Effects version works (see below): one script + data it reads.

## What already exists (all verified)
- `scenes/a1..a6.html` + `index.html`: the HyperFrames recreation (reference render: `out/cavalry_exact.mp4`).
- `ae/build/aN.tracks.json`: **the source of truth to consume**. One file per segment; each has
  `{part, g0, g1 (global frame range), nf, layers:[...]}`; layers are bottom→top, frames are part-local ints @24fps.
  Layer kinds:
  - `box` / `path`: `shape` = list of subpaths `{v,i,o,c}` (AE-style: vertices, in/out tangents RELATIVE,
    closed) in **comp pixel coords, y down, origin top-left**; `fill` rgba 0..1; `stroke {w,c,cap,join,dash}`;
    `border`, `rings` (inset strokes, top first), `orings` (outer strokes); `bg {imgs:[{key,bm}], size, q}` =
    baked texture PNG(s) `ae/build/bg/<key>.png` to be corner-pinned to quad `q` = [TL,TR,BR,BL] per key, with CSS
    blend mode `bm`; `needMatte` → clip the image to `shape`; `gentex` = full-frame static PNG; `drop` shadow.
  - `text`: `doc {t:[frames], v:[[string, fontPostScriptName, sizePx, [r,g,b,a], stroke|null, tracking(1/1000em)]]}`
    (hold keys). `route:"affine"` → `pos` (baseline-start point, comp px), `rot` (deg), `scl` ([%x,%y]).
    `route:"pin"` → text in its own local box `box:[w,h]`, baseline origin `b0`, mapped by corner quad `pin`
    = [UL,UR,LL,LR] per key (projective, for 3D-tilted pages/tiles).
  - common: `op` opacity 0..100, `masks` (clip polygons, intersect; for text they are in LAYER space),
    `bl` CSS blend mode, `filt` (brush filter params: dilate, blur, thresh, disp, freq, oct, flood, gray…).
  - Any prop is either `{s: value}` (static) or `{t:[frames], v:[values]}` (keys, linear interpolation).
- `ae/build_cavalry_exact.jsx`: the **After Effects** builder of the same data — the exact semantics to port.
  It built the 0–10.5 s preview in real AE with 0 errors. Key lessons from it:
  - Build big segments in chunks (sub-comps of ~250 layers) — AE slowed drastically with thousands of layers in one comp.
  - AE font size max 1296 → scale layer instead (5 glyphs in a1 exceed it).
  - Log everything to a file, never throw dialogs, keep going on errors.
- `ae/preview.mjs`: re-renders tracks in Chrome from the keyframe data alone (reference evaluation semantics).
- `ae/mock_run.cjs`: Node dry-run of the AE script against a mock API — do the same for the Cavalry script
  (mock `api.*` + `cavalry.Path`), must run all 6 parts with 0 errors before handing over.
- Re-generation pipeline (only if needed): `ae/extract.mjs` (headless Chrome dump → `ae/data`, compressed copies
  in `ae/data_gz`), `ae/compile.py` (→ tracks), `ae/bake.mjs` (→ textures). Needs Chrome + puppeteer-core.
- `fonts/*.woff2`: the 9 fonts (Google OFL). Aden installs them on the Mac; PostScript names in `ae/fontmap.json`.

## Cavalry API reference (copied from Cavalry.app 2.7.2 — authoritative)
- `cavalry_ref/MetaData/api_function_metadata.json` (+ core/gui/widget): every `api.*` function signature.
- `cavalry_ref/nodeDefinitions.json`: every layer type and its attribute ids/types/defaults
  (e.g. textShape: text, font{font,style}, fontSize, horizontalAlignment, letterSpacing …).
- `cavalry_ref/Scripts/`, `cavalry_ref/Animators/*.js`: Cavalry's own example scripts (real API usage).
Notes: Cavalry is **y-up with origin at comp centre** (convert from y-down top-left). Use `api.createEditable(path, name)`
with `cavalry.Path` for bezier shapes. Check the metadata for images/assets, masks/clipping, blend modes, 3D/corner-pin
equivalents before assuming; if a feature has no API, approximate and log it.

## Deliverables
1. `cavalry/build_cavalry_exact.js` (+ whatever data format it loads — Cavalry scripts can read files via the API; check metadata;
   otherwise embed per-part data in generated `cavalry/data/aN.js` files).
2. `cavalry/README.md`: exact steps for Aden (install fonts, open Cavalry, JavaScript Editor, run, where the log goes).
3. Node mock dry-run passing on all 6 parts. Commit + push.

Out of scope: running Cavalry (Aden runs it on his Mac and sends back the log).

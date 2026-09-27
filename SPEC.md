# cavalry-exact — frame-accurate recreation of `cavlry.mp4`

GOAL: an EXACT recreation of Aden's own Cavalry animation `/Users/aden/Downloads/bin/cavlry.mp4`
(720×720, 24 fps, 29.292 s, no hard scene fades — mostly hard cuts on beats). Match it shot for shot:
same layouts, same glyph arrangement, same colours, same timing, same camera moves, SAME 3D MOVES
(perspective tilts, rotating tile planes, page flips). This is NOT an "inspired by" piece — copy it.

Output canvas **1080×1080, 24 fps**, HyperFrames (HTML + GSAP). Reference frames at 540px, every frame:
`ref/f24/NNNN.jpg` where frame N (1-based) is at global time (N-1)/24 s. Audio = `assets/audio.m4a`
(the original soundtrack, muxed at the end — do NOT add audio to scenes).

## Shared resources (project root = this folder)
- `fonts/` (full-coverage woff2, traditional chars OK):
  `YujiBoku-Regular.woff2` (heaviest brush kaishu — default for big black brush glyphs),
  `YujiSyuku-Regular.woff2`, `YujiMai-Regular.woff2` (lighter brush kaishu),
  `ZenAntique-Regular.woff2`, `ShipporiAntiqueB1-Regular.woff2`, `KaiseiDecol-Bold.woff2` (heavy antique/serif —
  use for clerical-ish 隸書 looks e.g. dark slit-scan + red/yellow lattice, and heavy 顏體 on aged tiles),
  `MaShanZheng-Regular.woff2`, `ZhiMangXing-Regular.woff2`, `LiuJianMaoCao-Regular.woff2` (cursive fragments;
  NB MaShanZheng lacks many traditional chars — check glyph coverage).
  The reference glyphs are heavier/rougher real brush scans: thicken + roughen with the shared SVG filter
  (see "brush filter" below) where it helps the match.
- `assets/paper_light.png` (#ECEAE5 grey-white fibre paper), `paper_dark.png` (near-black #16181B paper),
  `paper_aged.png` (beige/aged), `paper_red.png` (vermilion field). All 1080×1080. The reference has a
  subtle paper-fibre texture on EVERY background — use these.
- Palette sampled from the reference: paper `#E9E8E4`, ink `#111`, vermilion `#F0341A`/`#FF2A0A` (red field),
  cobalt tile `#1E7BE0`, yellow/gold `#FFC21A`, aged tile `#D9C29A`, sage ink `#4E8A6B`, dark bg `#15171A`,
  guide lines `rgba(0,0,0,.22)` hairline, handle squares black 8px (or red outline circles in the aged-tile scenes).

## Brush filter (optional, paste into your scene's SVG defs, ids prefixed with your part id)
```html
<svg width="0" height="0" style="position:absolute"><filter id="aN-brush" x="-10%" y="-10%" width="120%" height="120%">
  <feMorphology operator="dilate" radius="1.2"/>
  <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="3" result="n"/>
  <feDisplacementMap in="SourceGraphic" in2="n" scale="3"/></filter></svg>
```

## Parts (each owned by ONE agent — non-overlapping). Times are GLOBAL seconds.
| part | start | end | dur | contents (see ref frames for truth) |
|---|---|---|---|---|
| a1 | 0.000 | 4.833 | 4.833 | red seal 永 in grey bbox, guide-grid morph → squircle; two diagonal tiles w/ bbox cycling glyphs; diagonal chain; quarter-circle "fan" dial of glyphs w/ red spokes + big blue/red tiles cycling; 念 in circle on grey square (tilting in 3D) |
| a2 | 4.833 | 10.500 | 5.667 | dark slit-scan: rotating stacked glyph slices / smeared ribbons, glyph pairs 念紀誌忘垂不 in centre box; white bg pinwheel diamond lattice of red/blue discs; aged-paper collage of big glyphs with red/blue/grey discs, recursive (Droste) nested copy + zoom, vertical columns |
| a3 | 10.500 | 15.000 | 4.500 | red field: yellow disc 我 → lens/eye shape w/ 文 → hex/rounded containers of red discs on yellow morphing; full-frame red-disc lattice on yellow scrolling/zooming; white bg scattered red discs 天宮 + blue tiles 民建平 multiplying into a circular swirl |
| a4 | 15.000 | 21.500 | 6.500 | ring of 5 tiles around red circle w/ polygon bbox (red circle handles) → 3 → 2; aged tiles vertical pairs; cross/plus layout w/ octagon bbox; tiles rotate to diamond and 3D-rotate/zoom; 4×4 checker grid w/ corner mini tiles, glyphs cycling; perspective quads w/ blue centre tile |
| a5 | 21.500 | 27.083 | 5.583 | dark: grey square w/ cyan bbox + faint 心 in 3D box tunnel; octagon of 心 stroke fragments w/ red spokes; big ring/spiral of fragments w/ orange compass handles; full-frame radial fragments (十, 山 shapes) with dotted rays; 14×14 glyph grid on dark w/ cobalt square mask growing in rings, then dark circle cells, 2×2 blue-outlined square |
| a6 | 27.083 | 29.292 | 2.209 | light paper: 2×2 福道/長存 in pale-blue cells with blue outline squares scattered; 3D open-book page flips (black/white pages, big calligraphy, red bottom edge) on paper grid w/ bbox; return to red seal 永 in grey frame + circle (loops back to frame 1) |

## File contract
Each part = ONE sub-composition file `scenes/aN.html` whose LOCAL time 0 = part start.
```html
<!DOCTYPE html><html><head><meta charset="UTF-8"></head><body>
<template>
<style> @font-face{font-family:"YujiBoku";src:url("fonts/YujiBoku-Regular.woff2") format("woff2");font-display:block;}
  #root{position:absolute;inset:0;overflow:hidden;}  /* everything else scoped with #aN- ids / .aN- classes */ </style>
<div id="root" data-composition-id="aN" data-width="1080" data-height="1080"> ...full-frame bg for the whole duration + scene DOM... </div>
<script src="https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js"></script>
<script>(function(){ const tl=gsap.timeline({paused:true}); /* local 0..dur */ tl.set({},{},DUR); window.__timelines["aN"]=tl; })();</script>
</template></body></html>
```
- Asset paths relative to project root: `assets/…`, `fonts/…`.
- IDs/classes unique: prefix with `aN-`. Timeline key == `aN`.
- Deterministic: no Math.random (use a seeded rng), no Date, no rAF loops, no infinite repeats. Everything driven by `tl`.
- 3D: CSS `perspective` + `transform-style:preserve-3d` + GSAP rotationX/rotationY/z works in the renderer.
- Hard cuts between parts: each part renders its own full-frame background for its whole duration.

## Test harness (per part, already created): `parts/aN/`
`parts/aN/index.html` mounts ONLY your `scenes/aN.html` at its GLOBAL start inside a 29.292 s timeline, with
`fonts`/`assets`/`scenes` symlinked to the root. So compare directly against the reference at global times:
```
cd parts/aN && npx --yes hyperframes@0.8.62 lint
npx --yes hyperframes@0.8.62 snapshot --at <global times> --no-end --against /Users/aden/Downloads/bin/cavlry.mp4 -o <your scratch dir>
```
(`--against` writes render|reference pair sheets — use them to iterate until they match.)

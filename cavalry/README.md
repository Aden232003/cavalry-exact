# Cavalry Exact: native Cavalry build

`build_cavalry_exact.js` rebuilds the full 29.29 s recreation of `ref/cavlry.mp4` (1080×1080, 24 fps) as native Cavalry 2.7.2 layers:

- text layers for the glyphs
- editable shapes for tiles, lines, discs and handles
- rectangles with image shaders for the paper textures
- keyframes for all the motion

It reads the same data as the After Effects builder: `ae/build/aN.tracks.json` and `ae/build/bg/*.png`.

## Steps for Aden (Mac)

1. **Update the repo.** In Terminal, go to the repo folder and run `git pull`.

2. **Install the fonts (one time).**
   - Open `fonts/ttf/`, select all 9 `.ttf` files, and open them.
   - In Font Book, click **Install**.
   - Quit and reopen Cavalry so it sees them.
   - You need all nine: Kaisei Decol, Liu Jian Mao Cao, Ma Shan Zheng, Shippori Antique B1, Yuji Boku, Yuji Mai, Yuji Syuku, Zen Antique and Zhi Mang Xing. Any font Cavalry can't find is listed in the log.

3. **Open Cavalry** with a new, empty scene (File → New). The script adds a new comp called **CAVALRY EXACT** and doesn't change anything else. Starting empty means the scene gets saved automatically (see step 6).

4. **Open the JavaScript Editor.** It's in the Window menu (in some layouts, Window → Scripting → JavaScript Editor).

5. **Run the preview first (0–10.5 s, parts a1 and a2):**
   - Open `cavalry/build_cavalry_exact.js` in a text editor.
   - Near the top, change `ONLY: null,` to `ONLY: ["a1","a2"],`.
   - Copy the whole file, paste it into the JavaScript Editor and press **Run**.

   Instead of pasting, you can type one line into the editor, with your own path:

   ```js
   api.load("/Users/<you>/cavalry-exact/cavalry/build_cavalry_exact.js")
   ```

   Cavalry is busy until the build finishes. Expect a few minutes for the preview and longer for all six parts.

6. **Run the full build.**
   - Set `ONLY: null,` again.
   - Start a new scene (File → New) and run the script again.
   - If the scene has never been saved, it saves as `cavalry/CavalryExact.cv`.

7. **Send back the log:** `cavalry/build_log.txt`, plus a screenshot or two of anything that looks wrong. The last line reads `DONE errors=… warnings=…`, and a copy of the log also prints in the JavaScript Editor console.

The script finds the repo by itself if it lives in your home folder, Desktop, Documents, Downloads, `~/Documents/GitHub/`, `~/Projects/`, `~/dev/` or `~/code/`. If it can't find it, it asks for the folder once. To skip that question, set `ROOT: "/Users/<you>/…/cavalry-exact",` at the top of the script.

## What gets built

```
CAVALRY EXACT (comp, 1080×1080, 24 fps, frames 0–702, soundtrack from assets/audio.m4a)
└─ CAVALRY EXACT (group)
   ├─ 01 Seal, Fan & Dial               a1  frames   0–115
   │   ├─ a1 layers 1-250               chunk groups of 250 data layers
   │   └─ …
   ├─ 02 Slit-scan, Lattice & Collage   a2  frames 116–251
   ├─ 03 Lens, Discs & Swirl            a3  frames 252–359
   ├─ 04 Aged Tiles & 3D Grid           a4  frames 360–515
   ├─ 05 Stroke Galaxy & Glyph Grid     a5  frames 516–649
   └─ 06 Blessing, Book & Return        a6  frames 650–702
```

- Everything is keyed on the comp's own timeline (global frames). You can hide or solo a part group to work on one section.
- The groups use "Individual Layers" mode, so multiply and screen layers still blend with everything underneath.
- The chunk groups are only there to keep the Scene Window manageable. After Effects needed sub-comps for this; Cavalry groups keep blend modes working.

### How the After Effects features map to Cavalry

| Track data | Cavalry |
|---|---|
| `box` / `path` shapes | Editable Shape. Animated shapes use path keyframes on **Path** (`inputPath`), with linear interpolation. |
| fill, stroke, rings, borders | Fill and Stroke materials, one editable shape each (same stacking as the AE build) |
| `bg` textures on a rectangular quad | Rectangle with an Image Shader, keyed position and scale |
| `bg` textures on a skewed or perspective quad | Rectangle with an Image Shader and a **4-Point Warp** (Triangulate on) |
| `text` (affine) | Text Shape: left and baseline aligned, keyed position, rotation and scale. Size, colour and glyph changes are held (step) keys. |
| `text` (pin: book pages and 3D tiles) | Text Shape with a **4-Point Warp** mapping its box onto the pinned quad |
| masks | Clipping Masks. A second mask goes on a wrapper group, so the two masks intersect like AE's Add + Intersect. Mask shapes are hidden. |
| brush filter: dilate | Stroke in the glyph's own colour (width = 2 × dilate) |
| brush filter: displace | Distort Edges filter driven by a Noise shader. Filters with the same settings are shared. |
| drop shadow, grey, brightness, blur | Drop Shadow, Black & White, Brightness & Contrast, Fast Blur filters |
| blend modes | Layer Blend Mode (multiply, screen, …) |

### Startup check

Some API details aren't fully spelled out in the Cavalry reference:

- whether path and text keyframes work
- which keyframe type codes mean linear and step
- where a new child lands in a group
- whether 4-Point Warp corners are absolute positions or offsets
- how clipping masks connect

So the script first tests each of these in the new comp, deletes the test layers, and writes one `capabilities {...}` line near the top of the log. The build then uses whatever Cavalry actually does. If path keyframes turn out not to work, animated shapes are rebuilt as stepped copies (one per keyframe) and the log says so.

### Switches at the top of the script

| Setting | Default | Use it when |
|---|---|---|
| `ONLY` | `null` | `["a1","a2"]` for the 0–10.5 s preview, or any list of parts |
| `BRUSH_DISPLACE` | `true` | Set `false` if glyph edges look torn or noisy (turns off Distort Edges) |
| `BRUSH_STROKE` | `true` | Set `false` if brush glyphs look too bold |
| `IMAGE_BLEND` | `"replace"` | Set `"normal"` if textures show grey or white where they should be transparent |
| `HIDE_MASKS` | `true` | Set `false` to see the mask shapes (for debugging clipping) |
| `CHUNK` | `250` | Data layers per chunk group |
| `AUDIO`, `SAVE` | `true` | Add the soundtrack; save as `cavalry/CavalryExact.cv` if the scene is unsaved |

## Dry run without Cavalry

```
node cavalry/mock_run.cjs            # all 6 parts, both modes
node cavalry/mock_run.cjs ok a1,a2   # one mode, some parts
```

`mock_run.cjs` runs the real script against a strict mock of the Cavalry API. It:

- only allows `api.*` / `cavalry.*` functions listed in `cavalry_ref/MetaData`
- checks every attribute path, value type, enum value and connection against `cavalry_ref/nodeDefinitions.json`
- evaluates keyframes, so the startup check runs for real
- checks the finished tree: one top-level group, no leftover test layers, every visible layer has an in/out range, and children are in draw order

It runs in two modes:

- **ok**: Cavalry behaves as hoped.
- **fallback**: every startup check comes out the other way, which exercises all the fallback code.

Logs go to `cavalry/mock_logs/`. Current result: **all 6 parts, both modes, 0 errors.**

## Known approximations

- 4-Point Warp is a bilinear warp, not a true perspective (homography) map. Pinned book-page glyphs have slightly less foreshortening than in After Effects.
- Brush roughness (Distort Edges and Noise) is tuned by eye from the SVG turbulence settings. The first thing to adjust is `BRUSH_DISPLACE` and the `amplitude`/`border` numbers in `brushFilters()`.
- The only kind of layer AE disabled (a box with no fill, edge, ring or image) is skipped, just as in the AE build.

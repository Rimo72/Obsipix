# Obsipix

**Obsipix** is a web-first pixel-art editor built around exact logical-pixel editing:
what you draw is what gets stored, one integer pixel at a time — no smoothing, no
surprises. It runs entirely in the browser and keeps your work in a small,
data-only `.obsipix` project file.

**Released — V1.1** (the v2 spec delta on top of V1). Live build:
<https://rimo72.github.io/Obsipix/>

The authoritative specification is [`docs/PROJECT_CORE_OBSIPIX.md`](docs/PROJECT_CORE_OBSIPIX.md);
the build history is [`docs/OBSIPIX_CODING_PHASES.md`](docs/OBSIPIX_CODING_PHASES.md);
release notes are in [`CHANGELOG.md`](CHANGELOG.md).

## What Obsipix does

- **Canvas** — transparent RGBA canvas, exact nearest-neighbour zoom, pan, grid and
  checkerboard overlays, image / canvas resize with anchors.
- **Drawing** — Pencil, Eraser, Eyedropper, Fill, Line, Rectangle, Ellipse, Move;
  square or round brush in fixed sizes; foreground / background colours with quick
  swap; a full colour selector (RGB / HSV / HSL / Gray, SV square, hue & alpha bars,
  3/4/6/8-digit HEX); eyedropper samples the composite or the active layer.
- **Layers** — add / duplicate / delete / reorder, visibility, lock, opacity, merge
  down, merge visible, flatten.
- **Selection & transform** — rectangular and lasso select, marching ants, invert
  selection, move as a floating selection, nudge, flip, rotate, delete,
  cut / copy / paste.
- **Palettes** — PICO-8 default, create / duplicate / rename / delete, recent-colours
  strip; add or edit a colour in a full Color Management window (SV square, hue &
  opacity, R/G/B/A, HEX, HSV/HSL readout, pick-from-canvas), with optional naming.
- **Animation** — frames with per-frame durations and live thumbnails, cel types
  (normal, empty, hold, linked + Make Unique), reorder, playback (play / pause /
  step / first / last, loop or once), FPS, onion skin, animation tags, and a
  dedicated Animation Preview panel (overlay-free render, integer scale,
  checkerboard / solid background).
- **Files** — New (size presets + background), Open, Save, Save As, Close;
  `.obsipix` round-trips the whole project; open a PNG as a single-frame document
  or split a PNG sprite sheet into frames (frame size, spacing, offset, live
  preview); import a PNG as a layer; paste an image from the clipboard.
- **Export** — `File ▸ Export…` writes the current frame (PNG / JPEG / WebP / GIF,
  integer scale, optional transparent background), an animated GIF, or a sprite
  sheet (horizontal / vertical / grid). `File ▸ Export PNG` is the one-click path.
- **Safety net** — autosave to browser storage (~30 s) with a startup recovery
  prompt that never overwrites your project file; corrupt-file rejection; a
  top-level error boundary.
- **Keyboard-first** — a documented shortcut map (press `?` for the reference), a
  full menu bar, and context-sensitive controls.
- **Workspace** — a full-height right sidebar of dockable panels (Color Management,
  Layers, Palettes, Animation Preview) plus the Animation timeline dock; each panel
  collapses, closes and resizes, the sidebar width is draggable, and the layout is
  remembered. `View ▸ Panel: …` toggles visibility; `View ▸ Reset Panel Layout`
  starts over.

## Shortcuts (v2 map)

`B` Pencil · `E` Eraser · `I` Eyedropper · `G` Fill · `L` Line · `R` Rectangle ·
`O` Ellipse · `S` Rectangle-select · `Q` Lasso · `M` Move · `X` swap colours.
`Space` + drag pans. `1` / `2` set 100 % / 200 % zoom. `Ctrl+Z` / `Ctrl+Shift+Z`
undo / redo, `Ctrl+A` select all, `Ctrl+Shift+A` deselect, `Ctrl+Shift+I` invert
selection. Press `?` for the full reference.

## Known limitations

- Single document at a time; no tabs or multi-document workspace.
- No shortcut-remapping UI — the keymap is fixed (and documented under `?`).
- Autosave/recovery data lives in the current browser only (IndexedDB); it is not
  synced and is not a substitute for saving the `.obsipix` file.
- The selection outline stays at the pre-move position while a selection is
  floating; it snaps to the final position on commit.
- No first-run / empty-canvas hint.
- PNG import is limited to images up to 4096 px on a side.
- Tag playback ranges are stored but not yet used to drive playback.

## Requirements

- Node.js >= 20

## Getting started

```bash
npm install
npx playwright install --with-deps chromium   # one-time, for E2E
npm run dev
```

## Scripts

| Script                 | Purpose                                            |
| ---------------------- | -------------------------------------------------- |
| `npm run dev`          | Start the Vite dev server                          |
| `npm run build`        | Type-check (project refs) and produce a prod build |
| `npm run preview`      | Serve the production build locally                 |
| `npm run typecheck`    | Strict TypeScript check, no emit                   |
| `npm run lint`         | ESLint (flat config, type-aware)                   |
| `npm run format`       | Prettier write                                     |
| `npm run format:check` | Prettier check (CI)                                |
| `npm test`             | Vitest unit/integration run                        |
| `npm run test:watch`   | Vitest watch mode                                  |
| `npm run test:e2e`     | Playwright end-to-end run                          |
| `npm run check`        | typecheck + lint + format:check + test + build     |

## Deployment

Obsipix is a fully static client-side app — no server, no database — so any
static host works.

**GitHub Pages** (primary): every push to `main` runs the full CI pipeline
([`.github/workflows/ci.yml`](.github/workflows/ci.yml)) and, on success, deploys
to GitHub Pages ([`.github/workflows/deploy.yml`](.github/workflows/deploy.yml)),
which hosts the build under `/Obsipix/`.

**Vercel** (or Netlify / Cloudflare Pages / any root-domain host): import the
repo — [`vercel.json`](vercel.json) sets the framework, `npm run build` and
`dist/`. The Vite `base` is `/` everywhere except a GitHub Pages build: it stays
`/Obsipix/` there, and `DEPLOY_BASE` overrides it for anything else. Local dev and
the E2E server always use the root.

## Architecture boundaries

These boundaries are the coding contract for every phase (PROJECT_CORE §4):

- **Document** — source of truth
- **Commands** — mutation boundary
- **History** — committed changes
- **Events** — communication
- **Services** — coordination
- **Renderer** — visual output
- **Serializer** — project persistence
- **Input** — user-interaction boundary
- **Browser APIs** — external infrastructure

Core code (`src/core`) must not depend on React or browser APIs.

## Source layout

```
src/
├── app/              application shell (React presentation)
│   └── components/   menu bar, panels, dialogs, toasts, canvas stage
├── core/             browser-independent engine
│   ├── types/        ids, geometry, color primitives
│   ├── pixels/       PixelBuffer — authoritative RGBA pixel store
│   ├── document/     Document, layers, frames, cels, selection, commands, invariants
│   ├── history/      Command interface + snapshot undo/redo, transactions, strokes
│   ├── tools/        Pencil/Eraser/Eyedropper/Fill/Line/Rect/Ellipse/Select/Move, brush, shapes, transform
│   ├── persistence/  .obsipix serializer/parser (CRC + RLE), PNG encoder, resource limits
│   └── errors/       EditorError (structured, severity-tagged)
├── rendering/        browser-facing: Viewport (coordinate transforms), CanvasRenderer (layered passes)
└── infrastructure/   IndexedDB recovery storage
tests/
└── e2e/              Playwright specs (unit specs are co-located as *.test.ts)
```

## Phase status

| Phase | Area                          | Status   |
| ----- | ----------------------------- | -------- |
| 0     | Repository / Foundation       | COMPLETE |
| 1     | Pixel Engine                  | COMPLETE |
| 2     | Document / Layers             | COMPLETE |
| 3     | Commands / History            | COMPLETE |
| 4     | Renderer / Coordinates        | COMPLETE |
| 5     | Input / Vertical Slice        | COMPLETE |
| 6     | Persistence / PNG             | COMPLETE |
| 7     | Core Editor Features          | COMPLETE |
| 8     | Selection / Transform         | COMPLETE |
| 9     | Palettes                      | COMPLETE |
| 10    | Animation                     | COMPLETE |
| 11    | Lifecycle / Recovery / Input  | COMPLETE |
| 12    | UI Completion                 | COMPLETE |
| 13    | Hardening                     | COMPLETE |
| 14    | Full Test / Release Candidate | COMPLETE |
| 15    | V1 Release                    | COMPLETE |

# Changelog

All notable changes to Obsipix are documented here. This project follows
[Semantic Versioning](https://semver.org/).

## 1.1.0 — 2026-09-07

The v2 spec delta: the genuinely-new, in-scope items from the vendored v2
specification ([`docs/PROJECT_CORE_OBSIPIX.md`](docs/PROJECT_CORE_OBSIPIX.md)),
applied on top of V1 in three individually-tested batches. Everything in v2
still marked "Future" or "Post-V1" remains out of scope.

### Added

- **New Document dialog** — size presets (16 / 32 / 48 / 64 / 128) plus a
  free size field, and a background choice (transparent / white / black).
  Replaces the fixed-size "New".
- **Colour Selector panel** — a full picker behind the colour swatches: RGB,
  HSV, HSL and Gray models with linked sliders and numeric fields, a
  saturation-value square, hue and alpha bars, and a HEX field that accepts
  3-, 4-, 6- and 8-digit input.
- **Invert Selection** (`Ctrl+Shift+I`, Edit menu) — undoable.
- **Eyedropper sampling modes** — Merged (composite) or Layer (active layer
  only), chosen from the options bar when the eyedropper is active.
- **Expanded Export** (`File ▸ Export…`) —
  - Current frame as PNG, JPEG, WebP or GIF, with integer scale presets
    (1× / 2× / 4× / 8×) and an optional transparent background.
  - Animation as an animated GIF via a from-scratch GIF89a encoder (LZW,
    palette quantisation, Netscape 2.0 loop, per-frame delays).
  - Sprite sheet — horizontal, vertical or grid layout with configurable
    columns and spacing; PNG or WebP.
  - The quick `File ▸ Export PNG` item is retained.
- **Zoom presets** — `1` and `2` set 100 % / 200 % zoom about the canvas
  centre.

### Changed

- **Shortcut map aligned to v2** (breaking): `M` = Move (was Select), `R` =
  Rectangle (was `U`), `S` = Rectangle-select, `Space` + drag = hold-to-pan
  (Space no longer toggles playback — use the timeline transport or focus
  the timeline), `Ctrl+Shift+A` = Deselect (was `Ctrl+D`). Press `?` for the
  updated reference.
- Maximum document dimension is now enforced at the command and factory
  boundary, not only in the UI.

### Quality

- 390 unit / integration tests, 34 Playwright end-to-end specs (new
  `v2.spec.ts` and `export.spec.ts`). Each batch passed the full
  `npm run check` and the full e2e suite before commit.

## 1.0.0 — 2026-09-07

First production release. Obsipix is a browser-based pixel-art editor with exact
logical-pixel editing, layers, animation, palettes, a data-only `.obsipix` project
format, PNG import/export, autosave recovery and a keyboard-first UI.

Built in 15 controlled phases against
[`docs/PROJECT_CORE_OBSIPIX.md`](docs/PROJECT_CORE_OBSIPIX.md); each phase shipped
implemented **and** tested behind an exit gate.

### Engine (`src/core`, browser-independent)

- **PixelBuffer** — authoritative RGBA store: bounds-safe read/write, clear, clone,
  region copy, equality, transparent init.
- **Document model** — layers, frames, cels (normal / empty / hold / linked with
  Make Unique), selection state, revision / saved-revision tracking, invariants.
- **Commands + History** — every persistent mutation is a Command; snapshot-based
  undo/redo, transactions, one-entry interactive strokes, failure rollback.
- **Tools** — Pencil, Eraser, Eyedropper, Fill, Line, Rectangle, Ellipse,
  Rectangle-select, Lasso, Move; brush sizes and shapes; flip / rotate / scale /
  canvas-resize transforms.
- **Persistence** — `.obsipix` binary format (magic + version + JSON metadata +
  concatenated RLE blobs + CRC-32), deterministic serializer, strict parser with
  resource limits; from-scratch PNG encoder (no compression dependency).
- **Animation** — timeline, per-frame durations, playback model, onion-skin
  compositing, animation tags.

### Rendering (`src/rendering`)

- Viewport with exact document↔canvas coordinate transforms and zoom/pan.
- CanvasRenderer with strictly separated passes: checkerboard → artwork → onion →
  float → grid → marching ants → preview. Editor overlays never enter artwork or
  exports.

### Application (`src/app`)

- Menu bar (File / Edit / Image / View / Help), fully keyboard operable.
- Tool rail, brush / colour / selection option bars, layer panel, palette panel,
  timeline panel with playback transport and a tag bar.
- Shared modal Dialog primitive (focus trap, Escape, focus restore); toast
  notification system; enriched status bar (cursor, selection size, frame).
- Full document lifecycle: New / Open / Save / Save As / Close, PNG import as a
  document or a layer, PNG export, clipboard image paste.
- Autosave to IndexedDB (~30 s) with a startup recovery prompt that never
  overwrites the project file; global error boundary.
- Centralised keyboard map with documented precedence (`?` for the reference).

### Quality

- 346 unit / integration tests, 25 Playwright end-to-end specs, including the
  full V1 workflow (New → Draw → Edit → Animate → Save → Close → Open → Verify →
  Export) as a single test.
- Security: file-size / dimension / count limits on load, malformed-file
  rejection, clamped hostile values, no executable project content, no unsafe
  HTML.
- Accessibility: landmark roles, visible focus, logical tab order, accessible
  names, tool state via `aria-pressed`, dialog focus management, no reliance on
  colour alone.
- Performance budgets validated for load, clone, composite and undo/redo.
- CI runs typecheck + lint + format + tests + build + E2E on every push;
  successful `main` builds deploy to GitHub Pages.

### Known limitations

See the "Known limitations" section of [`README.md`](README.md).

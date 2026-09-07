# Changelog

All notable changes to Obsipix are documented here. This project follows
[Semantic Versioning](https://semver.org/).

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

See the "Known limitations (V1)" section of [`README.md`](README.md).

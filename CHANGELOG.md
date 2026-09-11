# Changelog

All notable changes to Obsipix are documented here. This project follows
[Semantic Versioning](https://semver.org/).

## 1.5.6 — 2026-09-11

### Changed

- **Open PNG ▸ Sprite sheet is far easier to see and verify.** The dialog is
  wider and its preview is much bigger, zoomable (Fit / 1× / 2× / 4× / 8× /
  16×, with panning at higher zoom) and pannable, so a busy sheet no longer
  crams into a tiny 220px corner. The frame-boundary grid renders with a
  blend mode that stays visible against any artwork colour, and hovering the
  preview highlights the exact frame under the cursor with a readout
  ("Hovering frame 3 — column 3, row 1") so the frame size, spacing and
  offset fields can be checked against the real image before importing.

### Added

- `src/app/spriteSheetHover.ts` — the pointer → frame-cell mapping, unit
  tested directly (jsdom has no `PointerEvent`, so the on-screen readout
  itself is covered by a new Playwright e2e test).
- `Dialog` gained an `xl` size preset.

## 1.5.5 — 2026-09-11

### Changed

- The **transparency checkerboard** squares on the drawing canvas are twice as
  large (16px, up from 8px) so transparency reads more clearly at a glance.

## 1.5.4 — 2026-09-08

### Security

- **`vercel.json` now sends a strict set of security headers** on every response.
  A Content-Security-Policy limits scripts to same-origin plus Google Analytics —
  the inline GA bootstrap is allow-listed by `sha256-` hash, never
  `'unsafe-inline'` — blocks framing, disallows `<base>` and plugins, and pins
  `connect-src` to the analytics endpoints. Alongside it: `X-Content-Type-Options`,
  `X-Frame-Options`, `Referrer-Policy`, `Strict-Transport-Security`, a deny-all
  `Permissions-Policy`, and same-origin `Cross-Origin-Opener-Policy` /
  `Cross-Origin-Resource-Policy`. (Vercel only; GitHub Pages ignores `vercel.json`.)
- New `src/build/vercelHeaders.test.ts` recomputes the GA script hash from
  `vite.config.ts` and fails if `vercel.json`'s CSP drifts out of sync.

### Changed

- Docs now point at the live deployment, <https://obsipix.vercel.app/> (Vercel
  auto-deploys every push to `main`). The GitHub Pages workflow — which was never
  enabled on the repo — is now manual-dispatch only, so it no longer fails on
  every push.

## 1.5.3 — 2026-09-08

### Changed

- The **About Obsipix** dialog no longer shows the GitHub repository link — it
  now ends with just the version line.

## 1.5.2 — 2026-09-08

### Changed

- The **transparency checkerboard** is now a fixed screen-space grid: the
  squares are always the same pixel size and no longer scale or shift with zoom
  or pan. It is drawn from a cached 8&nbsp;px pattern, clipped to the document's
  on-screen bounds, and never appears in exported artwork.

### Added

- **Help ▸ About Obsipix** — an About dialog with the product identity,
  tagline, description and the running version (injected at build time).

## 1.5.1 — 2026-09-08

### Fixed

- **Animation tags** — editing a tag's name, start/end frame or direction no
  longer collapses the inline editor after the first change. The editor now
  closes only when focus leaves it entirely (or on Enter / Escape). (The name
  field's blur handler was closing the whole editor whenever focus moved to
  another field.)
- The **Animation timeline dock** no longer squashes its own rows — frame
  duration inputs and thumbnails stay fully visible, and the dock scrolls if
  it is resized very short. Its default height was increased to fit the
  transport, frame strip, cel controls and tag bar.

## 1.5.0 — 2026-09-07

Dockable panels and a managed workspace
([`docs/PROJECT_CORE_OBSIPIX.md`](docs/PROJECT_CORE_OBSIPIX.md) §111).

### Added

- **Full-height right sidebar** with independently manageable panels: **Color
  Management** (the full colour selector bound to the foreground or background),
  **Layers**, **Palettes** and **Animation Preview**. The timeline is now the
  **Animation** panel — a full-width dock below the canvas.
- Every panel has a consistent header and can be **collapsed** (header stays,
  body hides), **closed**, and **resized** by dragging the divider above it.
  The **sidebar width** is draggable from its left edge. Dividers are
  keyboard-operable (`Tab` to a divider, arrow keys to nudge).
- **View ▸ Panel: …** toggles each panel's visibility, with a check mark and
  `aria-checked` showing the current state; **View ▸ Reset Panel Layout**
  restores the defaults.
- The layout (visibility, collapsed state, panel heights, sidebar width) is
  saved as a per-browser preference. None of it is document data — panel
  operations never create history, mark the document dirty, or touch pixels.
- `src/app/panelLayout.ts` (`usePanelLayout`), the `Panel`, `ResizeHandle`,
  `RightSidebar` and `ColorPanel` components.

### Changed

- Menu toggle items (Grid, Checkerboard, Onion Skin, the panel toggles) now
  use `role="menuitemcheckbox"` with `aria-checked`.
- The Animation Preview panel dropped its own collapse chrome (the panel
  frame provides it).

### Quality

- 25 new unit tests (`panelLayout`, `Panel`, `ResizeHandle`, `RightSidebar`,
  `ColorPanel`, `MenuBar`) and `tests/e2e/panels.spec.ts`. 453 unit tests,
  44 e2e specs.

## 1.4.0 — 2026-09-07

Timeline thumbnails and a dedicated Animation Preview
([`docs/PROJECT_CORE_OBSIPIX.md`](docs/PROJECT_CORE_OBSIPIX.md) §110).

### Added

- **Timeline frame thumbnails** — every timeline frame now shows a live
  thumbnail of its composited visible artwork, scaled nearest-neighbour over a
  transparency checkerboard. Non-normal cels on the active layer are badged
  (linked / hold / empty) and named in the frame's accessible label.
- **Animation Preview panel** — a collapsible sidebar panel that renders the
  current frame with no editor overlays (grid, selection, onion skin, cursors),
  and plays the animation in place at the real per-frame durations. It has its
  own transport (first / prev / play-pause / next / last / loop), integer scale
  (Fit / 1× / 2× / 4× / 8×) and background (checkerboard / white / black). The
  collapsed/expanded choice is remembered per browser.
- Playback drives the same timeline / canvas / preview state; it never mutates
  the document, creates history, or marks it dirty.
- `src/app/framePaint.ts` (`paintFrame` / `paintPixelBuffer`), the
  `FrameThumbnail` and `AnimationPreview` components.

### Changed

- A modal dialog and the "pick from canvas" mode both correctly suppress editor
  shortcuts (carried over from 1.3.0).

### Quality

- 12 new unit tests (`framePaint`, `FrameThumbnail`, `TimelinePanel`,
  `AnimationPreview`) and `tests/e2e/animation-preview.spec.ts`. 435 unit
  tests, 40 e2e specs.

## 1.3.0 — 2026-09-07

Color Management window for palette colours.

### Added

- **Color Management dialog** — `Palette ▸ + Add` and double-clicking a palette
  swatch now open a modal colour editor: an SV square, hue and opacity bars,
  exact R/G/B/A fields, a HEX field (`#RGB` / `#RGBA` / `#RRGGBB` /
  `#RRGGBBAA`, shown 8-digit), and HSV/HSL readouts. Edits are held in the
  dialog and applied only on **Add Color** / **Save Color**; Cancel keeps the
  original. Editing also offers an optional colour name.
- **Pick from Canvas** — a one-shot eyedropper inside the dialog: it hides the
  window, the next canvas click samples that pixel's exact RGBA (honouring the
  eyedropper's merged / active-layer mode) into the editor, and `Esc` cancels.
- `EditorSession.beginColorSample` / `sampleColorAt` / `cancelColorSample` /
  `isSamplingColor`; `rgbaToHex(color, { alpha: 'always' })`.

### Changed

- The colour selector's SV / hue / alpha widget is now a shared `ColorField`
  component (with keyboard nudge support) used by both the options-bar popover
  and the new dialog; achromatic hue retention moved to a `useRetainedHue`
  hook (PROJECT_CORE §14.2).
- A modal dialog now suppresses editor keyboard shortcuts while it is open.
- The old inline hex/name palette editor and the unused `HexInput` component
  were removed.

### Quality

- 9 new unit tests (`ColorManagementDialog`, `EditorSession` colour sampler)
  and 2 new e2e specs in `palette.spec.ts`. 425 unit tests, 38 e2e specs.

## 1.2.0 — 2026-09-07

Sprite-sheet PNG import
([`docs/PROJECT_CORE_OBSIPIX.md`](docs/PROJECT_CORE_OBSIPIX.md) — "Sprite Sheet
PNG Import").

### Added

- **Open PNG** now shows an import dialog with a mode choice:
  - **Single image** — the PNG becomes a one-frame document (unchanged
    behaviour, now behind an explicit button).
  - **Sprite sheet** — the PNG is split into animation frames on a
    user-supplied frame size, with optional horizontal / vertical spacing and
    an X / Y offset. Spacing and offsets are import-only and never enter the
    frame artwork.
- Live detection of the resulting grid (`columns × rows`, frame count) and a
  preview that overlays the frame boundaries on the image.
- A plain sheet (no offset, no spacing) must divide evenly into the frame
  size; a mismatch is reported instead of silently dropping edge pixels.
  Invalid configurations disable Import and explain why.
- Frames are cut in reading order (left → right, top → bottom) as independent
  buffers with every RGBA pixel preserved exactly — no scaling, smoothing or
  colour conversion. Fully transparent frames are kept. All frames use the
  default frame duration.
- A failed import leaves the current document and history untouched.
- `DocumentFactory.createFromFrames` and `EditorSession.importSpriteSheet`;
  `src/core/document/spriteSheetImport.ts` (`describeSpriteSheet`,
  `planSpriteSheet`, `sliceSpriteSheet`).

### Quality

- 26 new unit tests (`spriteSheetImport` incl. an export → import round-trip,
  `DocumentFactory.createFromFrames`, `ImportPngDialog`,
  `EditorSession.importSpriteSheet`) and `tests/e2e/sprite-sheet-import.spec.ts`;
  416 unit tests and 36 e2e specs in total.

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

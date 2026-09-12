# Obsipix --- Coding Phases

## Purpose

This document converts the completed Obsipix architecture into a
practical coding roadmap.

The goal is to build Obsipix in controlled phases, with each phase
producing a working and testable result before the next phase begins.

The existing project architecture establishes:

-   DOCUMENT = Source of Truth
-   COMMANDS = Mutation Boundary
-   HISTORY = Committed Changes
-   EVENTS = Communication
-   SERVICES = Coordination
-   RENDERER = Visual Output
-   SERIALIZER = Project Persistence
-   INPUT = User Interaction Boundary
-   BROWSER APIs = External Infrastructure

These boundaries remain the coding contract throughout all phases.

------------------------------------------------------------------------

# Phase 0 --- Repository and Engineering Foundation

## Goal

Create a clean, buildable development environment before implementing
editor behavior.

## Build

-   Git repository
-   Vite
-   React
-   TypeScript
-   Strict TypeScript configuration
-   ESLint
-   Prettier
-   Vitest
-   Playwright
-   Initial source structure
-   Basic application shell
-   Basic CI-ready scripts

## Initial structure

``` text
src/
├── app/
├── core/
├── editor/
├── infrastructure/
└── tests/
```

Only create directories when they are needed.

## Tests

-   TypeScript compilation
-   Production build
-   Unit test runner
-   E2E runner
-   Lint
-   Formatting

## Exit Gate

Phase 0 is complete when the repository builds, tests, lints, and runs
successfully.

------------------------------------------------------------------------

# Phase 1 --- Core Pixel Engine

## Goal

Build the lowest-level authoritative pixel system.

## Build

-   Primitive IDs
-   Geometry types
-   Color types
-   PixelBuffer
-   Pixel read/write
-   Bounds checking
-   Clear
-   Clone
-   Region copy
-   Equality
-   Transparent initialization

## Rules

PixelBuffer:

-   contains only pixel data
-   has no React dependency
-   has no browser dependency
-   has no rendering knowledge
-   has no history knowledge
-   has no tool knowledge
-   uses RGBA 8-bit storage
-   uses `Uint8ClampedArray`

## Tests

-   Creation
-   Dimensions
-   Transparent initialization
-   Read/write
-   Edge coordinates
-   Bounds
-   Clear
-   Clone independence
-   Region copy
-   Equality

## Exit Gate

PixelBuffer is deterministic, independently tested, and has no browser
or UI dependencies.

------------------------------------------------------------------------

# Phase 2 --- Document Model and Layers

## Goal

Create the authoritative editable document.

## Build

-   Document
-   DocumentFactory
-   Layer
-   LayerCollection
-   Frame
-   Cel
-   Normal cel
-   Empty cel
-   Hold cel
-   Linked cel
-   Selection state
-   Document dimensions
-   Current revision
-   Saved revision
-   Stable IDs

## Required defaults

-   32×32 document
-   Transparent canvas
-   One layer
-   One frame
-   Foreground black
-   Background white

## Rules

The Document is the authoritative source of editable state.

React must never become the source of truth for document pixels.

## Tests

-   Default document creation
-   Layer creation/deletion
-   Stable IDs
-   Cel relationships
-   Empty cel behavior
-   Hold behavior
-   Linked cel behavior
-   Make Unique
-   Document invariants
-   Revision tracking

## Exit Gate

A complete document can exist entirely in core code without React or
browser APIs.

------------------------------------------------------------------------

# Phase 3 --- Commands, Transactions and History

## Goal

Establish the only mutation path for persistent document changes.

## Build

-   Command interface
-   Execute
-   Undo
-   Redo
-   Command descriptions
-   Transaction support
-   History stack
-   History cursor/state
-   Failure rollback behavior
-   Affected-object tracking where required

## Rules

All persistent document mutations go through Commands.

Continuous drawing must become one logical history entry.

Transient interaction state must not enter project history.

## Tests

-   Execute
-   Undo
-   Redo
-   Multiple commands
-   Redo invalidation after new edit
-   Transaction success
-   Transaction failure
-   Rollback
-   Empty history
-   History boundaries

## Exit Gate

Every document mutation can be executed and reversed predictably.

------------------------------------------------------------------------

# Phase 4 --- Renderer and Coordinate System

## Goal

Display the document correctly and establish the visual rendering
boundary.

## Build

-   Canvas renderer
-   Logical-pixel rendering
-   Canvas-to-document coordinate conversion
-   Document-to-canvas conversion
-   Zoom
-   Pan foundation
-   Pixel-perfect scaling
-   Nearest-neighbor rendering

## Rendering passes

Keep artwork and editor overlays conceptually separate:

``` text
Artwork
  ↓
Grid / Checkerboard
  ↓
Selection
  ↓
Onion Skin
  ↓
Transform / Shape Preview
  ↓
Cursor / Interaction Overlay
```

Editor overlays must never become artwork.

## Tests

-   Coordinate conversion
-   Zoom conversion
-   Pan conversion
-   Pixel alignment
-   Transparent rendering
-   Nearest-neighbor behavior
-   Rendered pixel accuracy

## Exit Gate

A 32×32 document renders exactly and document coordinates map correctly
to screen coordinates.

------------------------------------------------------------------------

# Phase 5 --- Input System and Vertical Slice

## Goal

Prove the complete architecture through the first real editor workflow.

## Build

-   Pointer input adapter
-   Input state
-   Input precedence
-   Pencil
-   Eraser
-   Pixel line interpolation
-   Draw Stroke command
-   Erase Stroke command
-   Basic toolbar
-   Canvas interaction

## Vertical slice

``` text
Launch
 ↓
Create 32×32 Document
 ↓
Display Canvas
 ↓
Draw
 ↓
Erase
 ↓
Undo
 ↓
Redo
 ↓
Save
 ↓
Reload
 ↓
Export PNG
```

## Input priority

Before implementing complex shortcuts, establish deterministic
precedence between:

1.  Modal interaction
2.  Active tool
3.  Transform/selection interaction
4.  Timeline interaction
5.  Canvas navigation
6.  Global shortcuts

Conflicts must be resolved explicitly.

## Tests

-   Single click
-   Drag
-   Fast drag
-   Outside-canvas input
-   Pencil
-   Eraser
-   One stroke = one history entry
-   Undo/redo
-   Coordinate accuracy
-   Keyboard behavior

## Exit Gate

The complete vertical slice works end-to-end.

This is the first major milestone.

------------------------------------------------------------------------

# Phase 6 --- Project Persistence and PNG Export

## Goal

Make artwork safely persistent.

## Build

-   `.obsipix` serializer
-   `.obsipix` parser
-   Format version
-   Validation
-   Save
-   Save As
-   Open
-   Close
-   Dirty state
-   Unsaved-change confirmation
-   Safe save strategy
-   PNG export

## Important decision

Before implementing the final serializer, lock the physical `.obsipix`
format:

-   container format
-   metadata structure
-   pixel-data representation
-   compression strategy
-   versioning
-   validation
-   corruption handling

The logical project model is already defined, but the physical format
must be treated as an implementation contract.

## Tests

-   Exact save/load round trip
-   Dimensions
-   Pixel colors
-   Alpha
-   Layers
-   Cels
-   Linked cels
-   Empty cels
-   Holds
-   Frame durations
-   Tags
-   Corrupt file rejection
-   PNG pixel output
-   Overlay exclusion

## Exit Gate

Saving and reopening a project produces the same editable state.

------------------------------------------------------------------------

# Phase 7 --- Core Editor Features

## Goal

Turn the vertical slice into a useful pixel editor.

## Build

### Drawing

-   Pencil sizes
-   Hard-edge drawing
-   Straight line
-   Shapes
-   Square
-   Circle

### Colors

-   Foreground/background
-   Color picker
-   Hex input
-   Color swapping

### Layers

-   Create
-   Delete
-   Duplicate
-   Rename
-   Reorder
-   Visibility
-   Lock
-   Opacity
-   Clear
-   Merge selected down
-   Merge visible
-   Flatten

### Canvas

-   Zoom
-   Pan
-   Grid
-   Checkerboard

## Tests

Every persistent operation must have unit tests and relevant E2E
coverage.

## Exit Gate

The application is usable as a basic single-image pixel editor.

------------------------------------------------------------------------

# Phase 8 --- Selection and Transform

## Goal

Add non-destructive editing workflows for selected pixels and canvas
content.

## Build

-   Selection creation
-   Selection clear
-   Select all
-   Copy
-   Paste
-   Move
-   Flip
-   Rotate
-   Scale
-   Image resize
-   Canvas resize
-   3×3 anchor selection
-   Transform preview
-   Transform commit
-   Transform cancel

## Rules

-   Nearest-neighbor only
-   Integer coordinates
-   No smoothing
-   Preview is transient
-   Completed transformation = one history entry
-   Cancel produces no permanent mutation

## Tests

-   Selection bounds
-   Move
-   Copy/paste
-   Flip
-   Rotation
-   Scaling
-   Canvas resize
-   Image resize
-   Commit
-   Cancel
-   Undo/redo

## Exit Gate

Selection and transformation operations are deterministic and
reversible.

------------------------------------------------------------------------

# Phase 9 --- Palettes and Color Workflow

## Goal

Build the complete V1 color workflow.

## Build

-   Palette model
-   Palette creation
-   Palette editing
-   Palette selection
-   Palette ordering
-   Color names where supported
-   Active foreground/background colors
-   Color picker integration

## Rules

Artwork stores actual RGBA values.

Changing a palette must not silently recolor existing artwork.

## Tests

-   Palette creation
-   Add/remove/reorder colors
-   Selection
-   Persistence
-   Artwork independence from palette changes

## Exit Gate

Color management is complete for V1.

------------------------------------------------------------------------

# Phase 10 --- Animation System

## Goal

Implement the V1 animation workflow.

## Build

### Animation foundation

-   Frames
-   Cels
-   Frame ordering
-   Frame duration
-   Normal cels
-   Empty cels
-   Holds
-   Linked cels
-   Make Unique

### Timeline

-   Frame selection
-   Add frame
-   Delete frame
-   Duplicate frame
-   Reorder frame
-   Playback controls

### Playback

-   Play/pause
-   First
-   Previous
-   Next
-   Last
-   Loop
-   Play once
-   FPS
-   Per-frame durations

### Visualization

-   Timeline
-   Current frame
-   Animation preview
-   Onion skin

### Tags

-   Name
-   Start
-   End
-   Direction
-   Optional color
-   Optional custom FPS

## Rules

Animation operations use the same Command/History system.

Playback state is transient and is not stored as document artwork.

## Tests

-   Frame operations
-   Cel types
-   Holds
-   Linked cels
-   Make Unique
-   Duration
-   Playback
-   Tags
-   Onion skin
-   Undo/redo
-   Save/load animation state

## Exit Gate

A user can create, edit, save, reopen and play an animation.

------------------------------------------------------------------------

# Phase 11 --- Full Lifecycle, Recovery and Input Completion

## Goal

Complete the real-world editor lifecycle.

## Build

-   New document
-   Open
-   Save
-   Save As
-   Close
-   Dirty state
-   Unsaved changes
-   Autosave
-   Recovery detection
-   Recovery prompt
-   Recovery cleanup
-   PNG import as new document
-   PNG import as layer
-   Clipboard integration
-   Full shortcut system
-   Shortcut conflict resolution
-   Context-sensitive controls

## Recovery rules

Autosave:

-   runs approximately every 30 seconds
-   uses separate recovery data
-   never silently overwrites the project
-   detects recoverable work
-   prompts the user
-   removes obsolete recovery data after successful resolution

## Tests

-   Browser reload
-   Closed tab recovery scenario
-   Corrupt recovery data
-   Failed save
-   Failed load
-   Unsaved changes
-   PNG import
-   Clipboard behavior
-   Shortcut conflicts

## Exit Gate

The application can survive normal user mistakes and common browser/file
failures without losing project data.

------------------------------------------------------------------------

# Phase 12 --- UI Completion and Editor Experience

## Goal

Complete the production V1 user interface.

## Build

-   Final application shell
-   Toolbar
-   Tool panels
-   Layer panel
-   Color panel
-   Palette panel
-   Timeline
-   Status bar
-   Menus
-   Context controls
-   Shortcut configuration
-   Toast/notification system
-   Dialogs
-   Empty states
-   Error states
-   Loading states
-   Responsive desktop layout
-   Keyboard-first workflows

## Rules

UI components communicate with the application/core through defined
boundaries.

UI state must not become authoritative project state.

## Tests

-   Major workflows
-   Keyboard navigation
-   Focus behavior
-   Dialog behavior
-   Error states
-   Accessibility behavior
-   Visual regression where useful

## Exit Gate

The complete V1 interface supports the defined workflow without
architectural shortcuts.

------------------------------------------------------------------------

# Phase 13 --- Hardening

## Goal

Prepare Obsipix for release.

This phase is intentionally split into independent hardening tracks.

## Accessibility

-   Keyboard-first operation
-   Visible focus
-   Logical tab order
-   Accessible labels
-   Tool state communication
-   Dialog accessibility
-   Reduced reliance on color alone

## Security

-   Safe file handling
-   Input validation
-   File-size limits
-   Dimension limits
-   Malformed project rejection
-   Safe recovery handling
-   No executable project content
-   No unsafe HTML interpretation

## Performance

Validate against the defined targets:

-   Typical project load around 2 seconds
-   Brush interaction target below 8 ms where practical
-   60 FPS target during normal interaction
-   Immediate-feeling zoom
-   Immediate-feeling undo/redo

Measure before optimizing.

## Reliability

Test:

-   Save failures
-   Load failures
-   Corrupt files
-   Recovery failures
-   Large projects
-   Many layers
-   Many frames
-   Browser interruptions
-   Repeated undo/redo
-   Repeated save/load cycles

## Exit Gate

No known critical data-loss, corruption, crash, save, load or export
defects remain.

------------------------------------------------------------------------

# Phase 14 --- Full Test and Release Candidate

## Goal

Validate the entire V1 product against the specification.

## Test layers

### Unit

Core logic and deterministic operations.

### Integration

Subsystem boundaries and services.

### E2E

Real user workflows in the browser.

### Persistence

Exact `.obsipix` round trips.

### Rendering

Pixel accuracy and overlay separation.

### Performance

Defined target measurements.

### Accessibility

Keyboard and accessibility requirements.

### Failure testing

Corrupt files, failed saves, invalid data and recovery.

## Final workflow test

``` text
New
 ↓
Draw
 ↓
Edit
 ↓
Animate
 ↓
Save
 ↓
Close
 ↓
Open
 ↓
Verify
 ↓
Export
```

## Exit Gate

The complete V1 workflow passes.

------------------------------------------------------------------------

# Phase 15 --- V1 Release

## Goal

Freeze the implementation and release the first production version.

## Release checklist

-   V1 scope confirmed
-   No unapproved Post-V1 features
-   Architecture boundaries respected
-   Critical tests passing
-   Production build passing
-   E2E suite passing
-   Persistence round-trip passing
-   PNG export passing
-   Recovery tested
-   Accessibility tested
-   Security checks completed
-   Performance targets validated
-   Documentation updated
-   Known limitations documented
-   Release candidate approved

## Final status

``` text
OBSIPIX V1
RELEASE READY
```

------------------------------------------------------------------------

# Phase 16 --- v2 Spec Delta

## Goal

Apply the genuinely-new, in-scope items from
`PROJECT_CORE_OBSIPIX.md` (the vendored v2 spec) on top of the frozen
V1. Everything else in v2 that is described as "Future" or "Post-V1"
stays out.

## Build (shipped in three tested batches)

-   Batch 1 --- New Document dialog (size presets + background choice),
    v2 shortcut remap (M = Move, R = Rectangle, S = Select, Space + drag
    = hold-to-pan, Ctrl+Shift+A = Deselect, Ctrl+Shift+I = Invert,
    1 / 2 = zoom presets), Invert Selection command, Eyedropper
    Merged / Layer sampling modes.
-   Batch 2 --- full Colour Selector panel: RGB / HSV / HSL / Gray
    models, saturation-value square, hue and alpha bars, HEX field
    accepting 3/4/6/8-digit input.
-   Batch 3 --- Expanded Export: Export dialog with PNG / JPEG / WebP /
    GIF and integer scale presets; from-scratch GIF89a animation
    encoder; sprite-sheet export (horizontal / vertical / grid).

## Not built

-   Multi-document workspace, shortcut-remapping UI, synced recovery,
    and every other v2 item still marked Future / Post-V1.

## Exit gate

Each batch passed the full `npm run check` (typecheck + lint +
format:check + unit + build) and the full Playwright suite before it
was committed and pushed. Final: 390 unit tests, 34 e2e specs.

------------------------------------------------------------------------

# Phase 17 --- Sprite Sheet PNG Import

## Goal

Implement `Obsipix_V1_Sprite_Sheet_PNG_Import.md`: `File → Open PNG` can
split a PNG sprite sheet into animation frames.

## Build

-   `src/core/document/spriteSheetImport.ts` --- pure geometry + pixel
    copies: `describeSpriteSheet` (never throws, drives the live
    preview), `planSpriteSheet` (throws an `EditorError`),
    `sliceSpriteSheet` (exact RGBA regions → independent frame buffers,
    reading order).
-   `DocumentFactory.createFromFrames` --- one layer, one frame per
    buffer, default timing.
-   `EditorSession.importSpriteSheet` --- replaces the project, stays
    dirty, no history entry; a bad slice throws before anything changes.
-   `ImportPngDialog` --- mode radio (Single image / Sprite sheet), frame
    size + spacing + offset fields, detected grid, boundary preview.
    `choosePng` in `fileCommands` decodes ahead of the dialog.

## Rules

-   No scaling, smoothing or colour conversion during the split.
-   Spacing and offsets are import-only; they never enter the artwork.
-   A plain sheet must divide evenly; a mismatch is an error, not a
    silent crop.
-   A failed import leaves the current document and history untouched.

## Exit gate

Full `npm run check` + full Playwright suite. 416 unit tests, 36 e2e
specs (added `spriteSheetImport`, `DocumentFactory.createFromFrames`,
`ImportPngDialog` tests, an export → import round-trip, and
`sprite-sheet-import.spec.ts`).

------------------------------------------------------------------------

# Phase 18 --- Color Management Window

## Goal

Improve `PROJECT_CORE §14`: adding or editing a palette colour opens a
modal Color Management window instead of a cramped inline field.

## Build

-   `ColorManagementDialog` --- SV square + hue/opacity bars + exact
    R/G/B/A + HEX (8-digit) + HSV/HSL readout + optional name;
    self-contained draft, applied only on confirm.
-   "Pick from Canvas" --- `EditorSession.beginColorSample` /
    `sampleColorAt` / `cancelColorSample` / `isSamplingColor`; the next
    canvas click samples a pixel into the dialog, `Esc` cancels.
-   Refactor: shared `ColorField` (SV / hue / alpha widget, keyboard
    nudge) + `useRetainedHue` hook; `ColorPicker` now composes them.
    Removed the inline palette editor and unused `HexInput`.
-   A modal dialog suppresses editor shortcuts while open.

## Exit gate

Full `npm run check` + Playwright suite. 425 unit tests, 38 e2e specs
(`ColorManagementDialog`, colour-sampler `EditorSession` tests, two new
`palette.spec.ts` cases). Browser-verified against the reference mockup.

------------------------------------------------------------------------

# Phase 19 --- Timeline Thumbnails and Animation Preview

## Goal

Implement `PROJECT_CORE §110`: live artwork thumbnails on every timeline
frame, and a dedicated overlay-free Animation Preview panel.

## Build

-   `src/app/framePaint.ts` --- `paintFrame` / `paintPixelBuffer`:
    off-canvas nearest-neighbour rendering of a composited frame over a
    checkerboard or solid background. Read-only; disposable derived data.
-   `FrameThumbnail` --- a per-frame `<canvas>` in the timeline that
    repaints on any session change; non-normal active-layer cels get a
    linked / hold / empty badge and an accessible-label suffix.
-   `AnimationPreview` --- collapsible sidebar panel (choice persisted):
    overlay-free canvas, own transport, integer scale (Fit / 1-8×),
    checkerboard / white / black background. Reads
    `timeline.activeFrameId`, so timeline playback drives it directly;
    no document mutation, history or dirty flag.

## Exit gate

Full `npm run check` + Playwright suite. 435 unit tests, 40 e2e specs
(`framePaint`, `FrameThumbnail`, `TimelinePanel`, `AnimationPreview`,
`animation-preview.spec.ts`; existing Play/Pause e2e scoped to the
timeline region). Browser-verified with a 4-frame animation.

------------------------------------------------------------------------

# Phase 20 --- Dockable Panels and Managed Workspace

## Goal

Implement `PROJECT_CORE §111`: a full-height right sidebar whose panels
can be resized, collapsed, closed and toggled from the View menu, with a
persisted layout kept entirely out of the document.

## Build

-   `src/app/panelLayout.ts` --- `usePanelLayout` hook: per-panel
    `{ visible, collapsed, height }` + `sidebarWidth`, clamped,
    localStorage-persisted, `reset()`. Not session state.
-   `Panel` --- consistent header (collapse toggle + optional close) and
    a self-scrolling body.
-   `ResizeHandle` --- `role="separator"` divider; pointer drag emits
    deltas, Arrow keys nudge.
-   `RightSidebar` --- full-height column of `Panel`s (Color Management /
    Layers / Palettes / Animation Preview) with dividers; last expanded
    panel flex-fills. Left-edge width handle.
-   `ColorPanel` --- docked colour selector (FG / BG slot + swap +
    `ColorPicker`).
-   Timeline is now the **Animation** panel — a full-width dock below the
    canvas with the same Panel chrome + a top resize handle.
-   `View ▸ Panel: …` checkable toggles + `Reset Panel Layout`. MenuBar
    toggle items became `role="menuitemcheckbox"` with `aria-checked`
    (Grid / Checkerboard / Onion too); `menuAction` e2e helper matches
    both roles.

## Rules

-   Panel / layout operations never create history, mark dirty, or touch
    document data (§111.13).

## Exit gate

Full `npm run check` + Playwright suite. 453 unit tests, 44 e2e specs
(`panelLayout`, `Panel`, `ResizeHandle`, `RightSidebar`, `ColorPanel`,
`MenuBar` tests + `panels.spec.ts`). Browser-verified: collapse / close /
reopen, View-menu checkmarks, keyboard + pointer resize, layout persist.

------------------------------------------------------------------------

# Phase 21 --- Fixed Checkerboard and About Dialog

## Goal

Two workspace-polish items on top of Phase 20.

## Build

-   `CanvasRenderer` --- the transparency checkerboard is now a cached,
    fixed screen-space `CanvasPattern` (2×2-square tile, tiled from the
    canvas origin) clipped to the document's on-screen bounds. Squares
    are a constant pixel size and do not scale or shift with zoom / pan.
    `CanvasStage` stopped scaling `checkerboard.size` by zoom. Still an
    editor overlay — never in exports.
-   `AboutDialog` (`Help ▸ About Obsipix`) --- product identity, tagline,
    description and the running version (no external links), injected at
    build time via a `__APP_VERSION__` Vite `define` from `package.json`.

## Rules

-   Checkerboard stays a presentation-only overlay (Rule 4); the About
    dialog is pure UI state (Rule 3).

## Exit gate

Full `npm run check` + Playwright suite. 457 unit tests, 45 e2e specs
(`AboutDialog` test, `CanvasRenderer` fixed-size-checker test,
`ui.spec` About-dialog test). Browser-verified: checker squares stay a
constant size across 1600 % / 1143 % / 416 % zoom; About dialog matches
the mockup.

------------------------------------------------------------------------

# Phase 22 --- Deployment Security Headers

## Goal

Give the deployed site defense-in-depth HTTP headers.

## Build

-   `vercel.json` --- a `/(.*)` header rule adds a strict
    **Content-Security-Policy** (`default-src 'self'`; `script-src` =
    self + a `sha256-` hash of the inline GA bootstrap + the
    googletagmanager host, no `'unsafe-inline'` / `'unsafe-eval'`;
    `connect-src` pinned to the GA endpoints; `object-src` / `base-uri`
    / `frame-ancestors` / `form-action` = `'none'`;
    `upgrade-insecure-requests`), plus `X-Content-Type-Options`,
    `X-Frame-Options: DENY`, `Referrer-Policy`,
    `Strict-Transport-Security`, a deny-all `Permissions-Policy`, and
    `Cross-Origin-Opener-Policy` / `Cross-Origin-Resource-Policy:
    same-origin`. The existing `/assets/(.*)` immutable-cache rule is
    kept.
-   `vite.config.ts` --- a note by the GA inline snippet pointing at the
    CSP hash it must stay in sync with.
-   `src/build/vercelHeaders.test.ts` --- re-derives the GA inline script
    from `vite.config.ts`, hashes it, and asserts the hash and the rest
    of the policy are present in `vercel.json`.

## Rules

-   Static-host config only — no app-code change. Only Vercel (the live
    deploy, <https://obsipix.vercel.app/>) reads `vercel.json`.

## Exit gate

Full `npm run check` + Playwright suite. 463 unit tests, 45 e2e specs.
Verified against the live deployment: every header is present on
`https://obsipix.vercel.app/`, the app boots, and the GA inline script
runs (hash accepted) with no CSP violations.

------------------------------------------------------------------------

# Phase 23 --- Larger Checkerboard Squares

## Goal

The fixed-size checkerboard from Phase 21 read as too fine-grained; make the
squares bigger.

## Build

-   `DEFAULT_CHECKERBOARD.size` (`src/rendering/CanvasRenderer.ts`) 8 → 16px
    (2×). Same cached fixed-size `CanvasPattern` mechanism from Phase 21 —
    only the constant changed.

## Exit gate

Full `npm run check` + Playwright suite. 463 unit tests (updated the Phase 21
fixed-size-checker test's expected tile width 16 → 32), 45 e2e specs.
Browser-verified: squares visibly larger on the drawing canvas. (The
Animation Preview / timeline thumbnails use an unrelated, size-proportional
checkerboard in `src/app/framePaint.ts` — unaffected, out of scope here.)

------------------------------------------------------------------------

# Phase 24 --- Legible Sprite-Sheet Preview

## Goal

The Open PNG ▸ Sprite sheet preview was a 220px-wide corner box with a dense
per-cell grid — unreadable for any real sheet. Make it possible to actually
see and verify what is about to be sliced.

## Build

-   `Dialog` gained an `xl` size preset (`src/app/components/Dialog.tsx`/`.css`,
    920px); `ImportPngDialog` now uses it.
-   The preview viewport is a `ResizeObserver`-driven, scrollable box (`.import-png__preview`,
    `overflow: auto`) instead of a fixed 220×260 box. "Fit" now scales up as
    well as down so a small sheet still fills the space.
-   A zoom ladder — Fit / 1× / 2× / 4× / 8× / 16× — mirrors the
    `AnimationPreview` scale-button convention; zoomed content scrolls/pans
    natively instead of being clipped.
-   The per-cell grid overlay (still one `<rect>` per detected frame — the
    unit test asserts this) now renders with `mix-blend-mode: difference`
    so the boundary stays visible regardless of the artwork's own colours,
    instead of a faint fixed-colour stroke.
-   Hovering the preview highlights the frame cell under the pointer (a
    second overlay `<svg>`) and shows "Hovering frame N — column C, row R"
    next to the detected-frame summary.
-   `src/app/spriteSheetHover.ts` — the pure pointer→frame mapping, pulled out
    of the component so it can be unit tested directly: jsdom has no
    `PointerEvent`, so a DOM-level pointermove test silently receives
    `clientX: undefined` and never exercises the real math.

## Rules

-   Pure geometry (Rule 1-adjacent: keep logic testable) lives in
    `spriteSheetHover.ts`, not inline in the component.

## Exit gate

Full `npm run check` + Playwright suite. 470 unit tests (`spriteSheetHover.test.ts`
+ updated `ImportPngDialog.test.tsx`), 46 e2e specs (new
`sprite-sheet-import.spec.ts` hover/zoom test using real Chromium pointer
events). Browser-verified: a synthetic 256×128, 8×4 sprite sheet renders with
a crisp readable grid at "Fit", hover highlights the correct cell with an
accurate readout, and 4× zoom fills the preview with working scrollbars.

------------------------------------------------------------------------

# Phase 25 --- Sprite-Sheet Layout Fixes and a Pinned Tool Rail

## Goal

Two layout bugs surfaced after Phase 24, from real sprite-sheet artwork on a
wider window: the config sidebar's number inputs could overlap the preview,
and the left tool rail could shrink to single letters with its own scrollbar.

## Build

-   `ImportPngDialog.css` — `.import-png__grid` columns changed from `1fr 1fr`
    to `minmax(0, 1fr) minmax(0, 1fr)` (a bare `1fr` track won't shrink past
    its content's min-content width); `.import-png__field input`/`select` gained
    `width: 100%; box-sizing: border-box; min-width: 0` so they fill their grid
    cell instead of using the browser's intrinsic input width. Root cause: the
    sidebar is `flex: 0 0 240px` (won't shrink to fit), so oversized inputs
    spilled out of it and visually overlapped the preview pane beside it.
-   `ToolRail.css` — `.tool-rail` gained `flex: 0 0 64px` alongside its existing
    `width: 64px`. Root cause: a flex item's default `flex-shrink` is `1` even
    when only `width` is set, so in a tight `.app-shell__body` the rail shrank
    along with everything else; `RightSidebar` already had `flex: 0 0 auto` and
    was unaffected — the rail was the one unprotected sibling.

## Rules

-   A fixed-size flex sibling that must never shrink needs `flex-shrink: 0`
    (or a `flex: 0 0 <size>` shorthand) explicitly — `width` alone is not
    enough once it sits next to shrinkable siblings.

## Exit gate

Full `npm run check` + Playwright suite. 470 unit tests (unchanged — these are
CSS-only fixes with no new pure logic), 48 e2e specs: new
`sprite-sheet-import.spec.ts` "the config fields stay inside the sidebar"
(asserts the Frame height / Offset Y inputs' bounding boxes end before the
preview pane starts) and `ui.spec.ts` "the tool rail keeps its full width and
never gets its own scrollbar" (asserts `width: 64px` and no internal overflow
at a 420px viewport). Browser-verified at 1100px, 560px and 380px viewports —
sidebar/preview never overlap, tool rail keeps full labels and no scrollbar.

------------------------------------------------------------------------

# Phase 26 --- Copy-on-Write Undo Snapshots

## Goal

Fix a real, reported performance bug: drawing got laggy on projects with many
frames. Root cause (confirmed by reading the code and benchmarking it):
`History.begin`/`execute`/`transaction` snapshot the document for undo by
deep-copying the pixel data of **every** frame on **every** stroke, even
though a stroke only ever touches one frame's one buffer — so the snapshot
cost scaled linearly with total frame count. Not the user's machine, not a
server (Obsipix has none) — an architectural inefficiency in `Document.clone`.

## Build

-   `PixelBuffer` (`src/core/pixels/PixelBuffer.ts`) — `freeze()` / `frozen`;
    `setPixel`, `clear` and `copyRegion`'s destination side now throw if the
    buffer is frozen, via a private `#assertMutable`. A loud, immediate
    failure at the exact call site beats a silently-corrupted undo entry
    (Rule 9).
-   `Cel.clone()` (`src/core/document/Cel.ts`) — dropped the `bufferMap`
    parameter. Now a structural copy only: freezes and shares the same
    buffer object instead of deep-copying it (`bufferMap` existed purely to
    preserve linked-cel sharing across a deep copy; sharing the reference
    makes that automatic). `Frame.clone()` / `Timeline.clone()` /
    `Document.clone()` updated to match (all now take no arguments).
-   `Timeline.ensureNormalCel` (the single choke point every drawing/edit
    command already goes through to get a writable buffer — confirmed by
    grep, nothing mutates pixels any other way) gained a private
    `#ownedBuffer`: copy-on-write — if the buffer is frozen, clone it once
    and re-point every cel in the timeline that shared it (so linked cels
    stay linked), otherwise return it unchanged.
-   `EditorSession.#beginFloat` — fixed a real bug this exposed: it fetched
    its writable buffer via `ensureDrawableBuffer` **before** calling
    `history.begin('Transform')`, so the buffer it held was frozen out from
    under it the instant `begin` snapshotted. Reordered to fetch the buffer
    after starting the transaction.

## Rules

-   `ensureDrawableBuffer` / `ensureNormalCel` remains the only path to a
    writable pixel buffer — anything that bypasses it (as a few tests did)
    now fails loudly against a frozen buffer, by design.

## Exit gate

Full `npm run check` + Playwright suite. 475 unit tests (`PixelBuffer`,
`Cel`, `Timeline`, `Document`, `History` tests updated/added for the new
freeze/COW contract; `budgets.test.ts` gained a regression test proving a
10×-larger frame count no longer costs anywhere near 10× as much to
snapshot), 48 e2e specs. Measured: `Document.clone` on a 24-frame/8-layer/
128×128 document dropped from ~8.4ms to ~0.3ms per clone (about 28×); a
`History.begin`+`cancel` cycle on a 240-frame document took ~0.36ms.
Browser-verified live: 151 frames, 20 separate strokes averaged 0.15ms each
(max 0.8ms) versus an estimated ~85ms/stroke before the fix; undo/redo,
linked-cel propagation, and full `.obsipix` serialization all confirmed
correct afterward.

------------------------------------------------------------------------

# Phase 27 --- Virtualized Timeline Frame Strip

## Goal

User reported the drawing lag persisted after Phase 26. Root cause (found by
benchmarking a real stroke end-to-end, not just the History/Document layer):
`TimelinePanel` renders one `FrameThumbnail` per frame with no windowing, and
every one shares the same global `session.getVersion()` — so drawing on
*any* frame re-rendered and repainted (a full layer composite each) *every*
frame's thumbnail, even though only a handful are ever on screen. On a
201-frame document this cost ~66–160ms per stroke by itself, entirely
separate from the snapshot cost Phase 26 fixed.

## Build

-   `src/app/virtualRange.ts` — `horizontalVirtualRange(scrollLeft,
    clientWidth, itemWidth, itemCount, buffer)`: pure, unit-tested function
    computing which contiguous `[start, end)` slice of a fixed-width
    horizontal list falls within the visible viewport plus a buffer.
    Special-cases `clientWidth <= 0` (not measured yet, e.g. first render —
    or always true in jsdom, which is why existing unit tests needed no
    changes) to mean "render everything".
-   `TimelinePanel.tsx` — measures its `.timeline-panel__frames` scroll
    container (`scrollLeft`/`clientWidth`, via a scroll listener +
    `ResizeObserver`) and renders only `frames.slice(start, end)` as real
    `<li>`s, flanked by two flex spacers sized to reserve the skipped items'
    width so the scrollbar stays correct. `FRAME_ITEM_WIDTH = 60` must track
    `.timeline-panel__frame`'s CSS width (56px) + the strip's `gap` (4px).
-   `FrameThumbnail.tsx` — independently gated with an `IntersectionObserver`
    (root = the scroll container): skips its own (expensive) repaint while
    off-screen, remembering it's stale, and catches up the moment it scrolls
    into view. Starts "visible" so the very first mount still paints
    immediately (no blank-canvas flash) — only *later* edits are skipped for
    anything actually off-screen. Two mechanisms — virtualized mounting and
    per-thumbnail visibility gating — because the frame that's off-screen
    *and* whose props otherwise look unchanged still needs a way to know it
    became stale while unmounted the moment it's remounted.

## Rules

-   Never trust a "2 rAF waits" stopwatch below roughly one frame budget —
    it has an inherent ~33ms floor (2 vsync frames at 60Hz) that swamps any
    real cost once work is already fast. Measure amortized cost instead:
    fire many operations back to back, wait once, divide by count.

## Exit gate

Full `npm run check` + Playwright suite. 485 unit tests (`virtualRange.test.ts`,
`FrameThumbnail.test.tsx` off-screen-gating tests, `TimelinePanel.test.tsx`
virtualization tests), 48 e2e specs (unchanged — every existing timeline e2e
uses ≤2 frames, well inside the always-render-everything threshold, so
nothing needed updating). Measured on a 201-frame, 3-layer, 64×64 document:
amortized cost of 50 back-to-back strokes dropped from a ~66–160ms-per-stroke
floor to **~1.2ms per stroke**. Browser-verified: only ~15 `<li>` frames ever
mounted regardless of total frame count (confirmed via DOM query), scrolling
the strip correctly reveals the right frames with correct thumbnail content
(checked frames 187–201 after a scroll-to-end).

------------------------------------------------------------------------

# Phase 28 --- Magic Wand Select Tool

## Goal

Add a Magic Wand tool: click a pixel and select the contiguous region of
matching colour, the way Fill paints one.

## Build

-   `src/core/tools/fill.ts` — extracted the traversal both need into a
    private `walkFloodRegion(buffer, seed, visit)`; `floodFill` now calls it
    to paint, and a new `floodMatchRegion(buffer, seed): PixelPoint[]` calls
    it to collect the region instead — read-only, never mutates. Zero
    behaviour change to `floodFill` itself (its full existing test suite
    passes unmodified).
-   `src/core/document/editCommands.ts` — `magicWandSelectCommand(seed, mode,
    options?)`: resolves the active layer's buffer (an empty/hold cel with
    nothing behind it reads as a uniformly-transparent scratch buffer, so the
    seed matches the whole canvas — built via `PixelBuffer.create`, never
    attached to the document, so it can never accidentally convert the cel to
    normal the way `ensureDrawableBuffer` would), flood-matches from `seed`,
    and applies the result through `Selection.applyShape` — same mechanism
    `selectShapeCommand` (Lasso) already uses.
-   `src/core/tools/MagicWandTool.ts` (new) — a `kind: 'shape'` tool mirroring
    `FillTool`: no preview, one click = one history entry, the pixel used is
    wherever the pointer is *released* (not pressed), Shift/Alt/Shift+Alt
    select add/subtract/intersect via the existing `selectionModeFrom` (same
    modifier convention as Rectangle/Lasso select).
-   Registered as `W` in `toolCatalog.ts` (between Lasso and Move) and in
    `EditorSession`'s tool map — the tool rail button and keyboard shortcut
    are both fully generic over the catalog, so no UI code changed.

## Rules

-   A select tool never mutates pixel data or the cel graph — confirmed by
    reading from a detached scratch `PixelBuffer` rather than
    `ensureDrawableBuffer`, which would force an empty/hold cel to become a
    real (if blank) normal cel just from making a selection.

## Exit gate

Full `npm run check` + Playwright suite. 493 unit tests (`floodMatchRegion`
tests in `fill.test.ts`, `magicWandSelectCommand` tests in
`editCommands.test.ts` covering region containment, whole-canvas-on-empty,
add/subtract/intersect modes, and that it never touches pixels; a `W` mapping
assertion in `shortcuts.test.ts`), 49 e2e specs (new test in
`selection.spec.ts`: paints a wall splitting the canvas, wand-selects one
side, Shift-adds the other, confirms the wall itself is never selected,
confirms a plain click replaces rather than adds, and that Delete only
touches the selected region). Browser-verified: painted a red square, wand
click produced a `sel 8 × 8` marching-ants selection tracing it exactly,
Delete removed only that square, undo restored it.

------------------------------------------------------------------------

# Coding Rules for Every Phase

## Rule 1 --- Core is authoritative

The Document Model remains the source of truth.

## Rule 2 --- Mutations use Commands

Do not modify persistent document state directly from UI components.

## Rule 3 --- React is presentation

React state may represent UI state but must not become the authoritative
pixel store.

## Rule 4 --- Renderer never owns artwork

The renderer displays document state.

## Rule 5 --- Transient state stays transient

Preview, cursor, drag state, playback state and transform previews are
not persisted unless explicitly defined as project state.

## Rule 6 --- Test each phase

A phase is not complete because the code compiles.

It is complete when its defined behavior is implemented and tested.

## Rule 7 --- No speculative architecture

Do not build Post-V1 systems simply because the architecture may support
them later.

## Rule 8 --- Fix architecture problems at the boundary

Do not create local workarounds that violate the architectural model.

## Rule 9 --- Protect data integrity

Any operation that can corrupt or lose artwork is a release blocker.

## Rule 10 --- One phase at a time

Do not start the next major phase until the current phase passes its
exit gate.

------------------------------------------------------------------------

# Recommended Coding Order

The practical order is:

``` text
PHASE 0
Foundation
   ↓
PHASE 1
Pixel Engine
   ↓
PHASE 2
Document Model
   ↓
PHASE 3
Commands + History
   ↓
PHASE 4
Renderer + Coordinates
   ↓
PHASE 5
Input + Vertical Slice
   ↓
PHASE 6
Persistence + PNG
   ↓
PHASE 7
Core Editor
   ↓
PHASE 8
Selection + Transform
   ↓
PHASE 9
Palettes
   ↓
PHASE 10
Animation
   ↓
PHASE 11
Lifecycle + Recovery
   ↓
PHASE 12
UI Completion
   ↓
PHASE 13
Hardening
   ↓
PHASE 14
Testing + Release Candidate
   ↓
PHASE 15
V1 Release
```

# Phase Completion Tracking

  Phase   Area                          Status
  ------- ----------------------------- -------------
  0       Repository / Foundation       COMPLETE
  1       Pixel Engine                  COMPLETE
  2       Document / Layers             COMPLETE
  3       Commands / History            COMPLETE
  4       Renderer / Coordinates        COMPLETE
  5       Input / Vertical Slice        COMPLETE
  6       Persistence / PNG             COMPLETE
  7       Core Editor                   COMPLETE
  8       Selection / Transform         COMPLETE
  9       Palettes                      COMPLETE
  10      Animation                     COMPLETE
  11      Lifecycle / Recovery          COMPLETE
  12      UI Completion                 COMPLETE
  13      Hardening                     COMPLETE
  14      Testing / Release Candidate   COMPLETE
  15      V1 Release                    COMPLETE
  16      v2 Spec Delta                 COMPLETE
  17      Sprite Sheet PNG Import        COMPLETE
  18      Color Management Window        COMPLETE
  19      Thumbnails / Anim Preview      COMPLETE
  20      Dockable Panels / Workspace    COMPLETE
  21      Fixed Checker / About Dialog   COMPLETE
  22      Deployment Security Headers    COMPLETE
  23      Larger Checkerboard Squares    COMPLETE
  24      Legible Sprite-Sheet Preview   COMPLETE
  25      Sprite-Sheet Layout Fixes      COMPLETE
  26      Copy-on-Write Undo Snapshots   COMPLETE
  27      Virtualized Timeline Strip     COMPLETE
  28      Magic Wand Select Tool         COMPLETE

# Definition of a Coding Phase

Every phase must answer four questions:

1.  What are we building?
2.  What must be tested?
3.  What must not be built yet?
4.  What proves the phase is complete?

If those four questions cannot be answered, the phase is not ready to
start.

------------------------------------------------------------------------

## Source Alignment

This roadmap is derived from the current Obsipix project architecture
and implementation plan, particularly the defined Phase 0 vertical
slice, implementation order, bootstrap sequence, core pixel engine,
persistence requirements, animation requirements, hardening requirements
and V1 release criteria.

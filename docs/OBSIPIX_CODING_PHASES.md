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

# Obsipix --- Authoritative Project Specification

> **STATUS: AUTHORITATIVE**
>
> This document consolidates `PROJECT_CORE_Updated (1).md` and
> `PROJECT_CORE_Updated (2).md` into the single authoritative
> specification for Obsipix.
>
> It defines the product vision, V1 scope, architecture, data model,
> interfaces, implementation contract, development sequence, quality
> requirements, and core pixel engine.
>
> If another Obsipix document conflicts with this document, this
> document takes precedence unless the conflict is explicitly resolved
> and this document is updated.

------------------------------------------------------------------------

# Authority Rules

1.  This document is the single source of truth for Obsipix.
2.  V1 requirements take precedence over Post-V1 ideas.
3.  Architectural boundaries take precedence over implementation
    convenience.
4.  The Document Model remains the authoritative editable state.
5.  Persistent document mutations pass through the Command/History
    architecture.
6.  React is presentation and is never the authoritative pixel store.
7.  Browser APIs remain outside the core engine.
8.  Transient interaction state must not become persistent artwork
    state.
9.  Coding phases define implementation order but do not redefine
    requirements.
10. If implementation exposes an architectural problem, correct the
    architecture deliberately rather than bypassing it.
11. Any new feature must be classified as V1 Core, V1 Hardening, or
    Post-V1.
12. Critical data-integrity failures block V1 release.

------------------------------------------------------------------------

# 1. Product Definition

Obsipix is a web-first pixel-art editor designed around exact
logical-pixel editing.

The application must provide a complete standalone pixel-art workflow
while preserving pixel accuracy, predictable editing behavior, reliable
project persistence, and a clean architecture capable of future
expansion.

The fundamental principles are:

1.  Logical pixels are the source of truth.
2.  Rendering must remain pixel-perfect.
3.  The Document is the authoritative editable state.
4.  Commands are the mutation boundary.
5.  History records committed changes.
6.  React is UI presentation only.
7.  Browser APIs are infrastructure.
8.  `.obsipix` is the authoritative editable project format.
9.  PNG is the primary external image format for V1.
10. Data integrity is a release-blocking requirement.

------------------------------------------------------------------------

# 2. V1 Workflow

The complete V1 workflow is:

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

V1 is complete when the user can reliably perform the complete workflow
without pixel corruption, incorrect transparency, lost layers, broken
animation, broken linked cels, incorrect undo/redo, silent save
failures, unsafe project loading, or unacceptable interaction latency.

------------------------------------------------------------------------

# 3. V1 Scope

## 3.1 Canvas

V1 includes:

-   Pixel canvas
-   Transparent background
-   Logical pixel coordinate system
-   Nearest-neighbor rendering
-   Zoom
-   Pan
-   Grid
-   Checkerboard transparency display

## 3.2 Drawing

V1 includes:

-   Pencil
-   Eraser
-   Eyedropper
-   Fill bucket
-   Line
-   Rectangle
-   Ellipse

### Pencil Rules

-   Pencil is the default drawing tool.
-   Default brush size is 1×1 logical pixel.
-   Brush size is independent of zoom.
-   Drawing uses hard-edged pixels.
-   Anti-aliasing is disabled.
-   Drawing outside canvas boundaries has no effect.
-   A continuous drag is one undoable stroke.

Initial brush sizes:

-   1×1
-   2×2
-   3×3
-   4×4
-   5×5
-   8×8
-   Custom

Initial brush shapes:

-   Square
-   Circle

Square is the default.

Fast pointer movement must be interpolated so strokes do not contain
gaps.

Holding Shift provides a straight-line workflow. Exact interaction
details may be refined during implementation without changing the
architectural model.

Stylus input is supported when available. Pressure sensitivity is
optional initially and must not affect standard mouse behavior unless
explicitly enabled.

## 3.3 Colors

V1 includes:

-   Foreground/background colors
-   Color selector
-   RGBA support
-   HEX input
-   Alpha
-   Recent colors
-   Color swapping

Mouse buttons:

``` text
Left mouse button  → Foreground / Primary
Right mouse button → Background / Secondary
```

## 3.4 Palettes

V1 includes:

-   Palette panel
-   Create palette
-   Rename palette
-   Delete palette
-   Add/remove colors
-   Reorder colors
-   Select colors
-   Duplicate palette
-   Import/export where defined by the V1 implementation

Normal RGBA artwork stores actual pixel colors.

Changing a normal palette must not automatically recolor existing
artwork.

Indexed-color behavior may be introduced later.

## 3.5 Layers

V1 includes:

-   Create layer
-   Delete layer
-   Duplicate layer
-   Rename layer
-   Reorder layer
-   Hide/show layer
-   Lock/unlock layer
-   Change opacity
-   Clear layer
-   Merge down
-   Merge visible
-   Flatten

The default document contains `Layer 1`.

Layer properties:

-   ID
-   Name
-   Visibility
-   Lock state
-   Opacity
-   Position
-   Pixel/cel content

Layer names are not identities. Stable layer IDs are required.

Layer groups/folders are Post-V1 but the architecture should allow them
later.

## 3.6 Selection

V1 includes:

-   Rectangular selection
-   Lasso selection
-   Replace
-   Add
-   Subtract
-   Intersect
-   Select All
-   Deselect
-   Move selected content
-   Copy
-   Cut
-   Paste
-   Delete selected content

Selection is represented as a pixel mask.

Selection dimensions must match document dimensions.

Selection is independent of the active layer.

Drawing and fill operations must respect an active selection.

## 3.7 Transformations

V1 includes:

-   Move
-   1-pixel arrow movement
-   Horizontal flip
-   Vertical flip
-   90° clockwise rotation
-   90° counter-clockwise rotation
-   180° rotation
-   Scaling
-   Image resize
-   Canvas resize
-   3×3 resize anchors

Transformations use nearest-neighbor behavior.

No smoothing or anti-aliasing may be introduced.

Image resize and canvas resize are separate operations.

Canvas resize changes document boundaries without automatically scaling
artwork.

Selection transformations may move, flip, rotate, and scale selected
content.

Transform operations may use a transient floating transform state:

``` text
Original Pixels
      ↓
Select / Transform
      ↓
Preview
      ↓
Commit or Cancel
```

Cancel must produce no permanent document mutation.

Each completed transformation is one history entry.

Transformations must preserve transparency and exact colors and avoid
accidental permanent changes.

## 3.8 Undo / Redo

Undo and redo are mandatory.

The history system must provide:

-   Meaningful history entries
-   Exact state restoration
-   One continuous stroke = one history entry
-   Transactional operations
-   Redo
-   Correct redo invalidation after a new edit

History applies to:

-   Drawing
-   Erasing
-   Fill
-   Shapes
-   Layer operations
-   Selection
-   Transformations
-   Animation
-   Cels
-   Linked-cel operations

Undo history is session-only and is not stored in the project file.

## 3.9 Animation

Animation is part of V1.

V1 includes:

### Timeline

-   Timeline panel
-   Frame selection
-   Layer selection
-   Playback controls
-   Frame duration
-   Onion skin
-   Animation preview
-   Basic tags

### Frames

-   Create frame
-   Create empty frame
-   Duplicate frame
-   Delete frame
-   Reorder frame

### Cels

-   Normal cel
-   Empty cel
-   Hold
-   Linked cel
-   Make Unique

### Playback

-   Play
-   Pause
-   Previous frame
-   Next frame
-   First frame
-   Last frame
-   Loop playback
-   Animation preview

### Timing

-   Default FPS
-   Per-frame duration

Default FPS options:

``` text
1, 2, 3, 4, 5, 6, 8, 10, 12, 15, 20, 24, 30, 60, Custom
```

### Tags

Basic animation tags contain:

-   Name
-   Start frame
-   End frame
-   Direction
-   Color
-   Custom FPS where specified

Ping-pong playback may remain future functionality if not required by
the locked V1 scope.

Animation operations use the same Command/History system.

Playback state is transient.

### Linked Cels

A linked cel shares pixel data with another cel.

Editing shared data affects all linked cels.

`Make Unique` creates independent pixel data and breaks the sharing
relationship.

Linked cel behavior must have automated tests.

### Holds

A hold continues displaying previous effective artwork without
unnecessary pixel-data duplication.

### Onion Skin

Onion skin is a viewport overlay.

It must never be written into cels or exported artwork.

## 3.10 Project Files

`.obsipix` is mandatory for editable V1 projects.

V1 supports:

-   New project
-   Save
-   Save As
-   Open
-   Close
-   Unsaved-change detection
-   Unsaved-change confirmation

The project must preserve:

-   Dimensions
-   Pixel colors
-   Alpha
-   Layers
-   Layer properties
-   Palettes
-   Frames
-   Cels
-   Empty cels
-   Holds
-   Linked cels
-   Frame durations
-   Animation tags
-   Relevant animation settings

A save/open round trip must restore the document accurately.

## 3.11 PNG

PNG is the primary external image format for V1.

### Import

-   Open PNG as a document
-   Import PNG as a layer

### Export

-   Export PNG

Exported PNG must not contain editor-only overlays:

-   Grid
-   Checkerboard
-   Selection marching ants
-   Onion skin
-   Transform handles
-   Shape previews

## 3.12 Document Lifecycle

The current in-memory document must remain distinct from the saved
project.

Dirty state must accurately reflect whether the current document differs
from its saved revision.

## 3.13 Autosave and Recovery

V1 includes basic recovery protection.

The system should:

-   Autosave approximately every 30 seconds
-   Store recovery data separately from the project file
-   Never silently overwrite the project with autosave data
-   Detect recoverable documents
-   Prompt for recovery when appropriate
-   Remove obsolete recovery data after successful resolution

Autosave is a safety mechanism, not the primary project-saving
mechanism.

## 3.14 Keyboard-First Operation

Keyboard interaction is a core V1 capability.

Shortcut conflicts must be resolved deterministically during UI
implementation.

## 3.15 Security

V1 requires:

-   Input validation
-   Project validation
-   Resource limits
-   Safe file handling
-   Corrupt-file handling
-   Safe recovery
-   Data-only `.obsipix` format

External data follows:

``` text
External Data
      ↓
Validation
      ↓
Sanitization
      ↓
Resource Limits
      ↓
Editor
```

`.obsipix` must never execute arbitrary code.

## 3.16 Reliability

V1 requires:

-   Error handling
-   Transaction safety
-   Save integrity
-   Recovery
-   Failure isolation

A failed document operation must not leave partial changes.

Save failure must preserve the current Document and dirty state, inform
the user, and offer retry or Save As where appropriate.

Failed imports and loads must not replace the current document with
incomplete data.

Renderer failures must be isolated from Document state.

A top-level UI error boundary should prevent one UI component failure
from necessarily destroying the entire editor session.

## 3.17 Accessibility

V1 requires:

-   Keyboard navigation
-   Focus management
-   Accessible controls
-   Non-color-only indicators
-   Accessible errors
-   Reduced-motion considerations

## 3.18 Internationalization

V1 launches in English.

Application text should use localization-ready translation keys.

User-created names are not automatically translated.

## 3.19 Performance

Initial targets:

  Metric              Target
  ------------------- ---------------------------------
  Initial load        Under 2 seconds where practical
  Brush latency       Under 8 ms target
  Normal rendering    60 FPS target
  Zoom                Immediate where practical
  Undo/Redo           Immediate where practical
  Timeline playback   Responsive

Performance is an architectural requirement.

Optimizations must never alter pixel accuracy.

Potential techniques include:

-   Dirty regions
-   Layer compositing caches
-   Offscreen buffers
-   Efficient pixel buffers
-   Zoom-aware rendering
-   Cached thumbnails
-   Tiled buffers
-   Chunked compositing
-   Worker-based processing

These are implementation options, not automatic V1 requirements.

## 3.20 Testing

Required test areas:

-   Unit
-   Pixel-level
-   Document
-   Commands/history
-   Serialization round trips
-   Animation
-   Tools
-   UI
-   Browser/E2E
-   Performance
-   Accessibility
-   Regression
-   Failure/recovery

Critical failures involving data loss, corruption, crashes, saving,
loading, or export block V1 release.

------------------------------------------------------------------------

# 4. Architecture

## 4.1 Final Architectural Boundaries

``` text
DOCUMENT
    = Source of Truth

COMMANDS
    = Mutation Boundary

HISTORY
    = Committed Changes

EVENTS
    = Communication

SERVICES
    = Coordination

RENDERER
    = Visual Output

SERIALIZER
    = Project Persistence

INPUT
    = User Interaction Boundary

BROWSER APIs
    = External Infrastructure
```

No subsystem should violate these boundaries without an explicit
architectural decision.

## 4.2 Dependency Direction

``` text
                 ┌───────────────┐
                 │      UI       │
                 └───────┬───────┘
                         ↓
                 ┌───────────────┐
                 │ Application   │
                 │   Services    │
                 └───────┬───────┘
                         ↓
              ┌──────────────────────┐
              │ Commands / Tools     │
              └──────────┬───────────┘
                         ↓
              ┌──────────────────────┐
              │   Document Model     │
              └──────────┬───────────┘
                         ↓
        ┌────────────────┴────────────────┐
        ↓                                 ↓
┌───────────────┐                 ┌───────────────┐
│    History    │                 │    Events     │
└───────────────┘                 └───────────────┘

        Document
           ↓
      ┌──────────┐
      │ Renderer │
      └──────────┘

        Document
           ↓
     ┌────────────┐
     │ Serializer │
     └────────────┘
```

Browser infrastructure remains at the outer boundary:

``` text
Browser APIs
    ↓
Infrastructure Services
    ↓
Application / Engine
```

Core must not depend on React or browser APIs.

UI is presentation.

Infrastructure owns browser/platform APIs.

Features compose core, application services, and UI.

Do not create large numbers of empty future systems before they are
required.

------------------------------------------------------------------------

# 5. Technical Stack

## 5.1 Required Stack

-   TypeScript
-   React
-   Vite
-   Canvas 2D
-   Vitest
-   Playwright
-   IndexedDB
-   Browser File APIs
-   Custom `.obsipix` serializer
-   ESLint
-   Prettier
-   Git

## 5.2 Runtime Dependencies

Initial runtime dependencies:

-   react
-   react-dom

## 5.3 Development Dependencies

Initial development dependencies:

-   TypeScript
-   Vite
-   React plugin for Vite
-   Vitest
-   Playwright
-   ESLint
-   Prettier

Additional dependencies require a clear implementation need.

## 5.4 TypeScript

Strict TypeScript is required.

Recommended settings include:

``` text
strict: true
noImplicitAny: true
strictNullChecks: true
noUncheckedIndexedAccess: true
```

Avoid `any` unless explicitly justified.

------------------------------------------------------------------------

# 6. Repository Structure

The architecture separates application, core, editor, infrastructure,
tests, and documentation.

Conceptually:

``` text
src/
├── core/
├── application/
├── tools/
│   ├── interaction/
│   ├── input/
│   └── controllers/
├── rendering/
│   ├── canvas/
│   ├── compositor/
│   ├── overlays/
│   ├── animation/
│   └── renderer/
├── persistence/
│   ├── serialization/
│   ├── format/
│   ├── migration/
│   ├── validation/
│   └── recovery/
├── infrastructure/
│   ├── files/
│   ├── storage/
│   ├── clipboard/
│   ├── browser/
│   └── logging/
├── ui/
│   ├── layout/
│   ├── canvas/
│   ├── toolbar/
│   ├── menus/
│   ├── colors/
│   ├── palettes/
│   ├── layers/
│   ├── timeline/
│   ├── dialogs/
│   ├── status/
│   ├── settings/
│   └── common/
├── features/
│   ├── document/
│   ├── drawing/
│   ├── layers/
│   ├── selection/
│   ├── transforms/
│   ├── animation/
│   ├── import-export/
│   └── recovery/
└── main.tsx

tests/
├── unit/
├── integration/
├── e2e/
├── fixtures/
├── helpers/
└── performance/

docs/
├── architecture/
├── development/
└── format/
```

Only required directories/files should be created during bootstrap.

------------------------------------------------------------------------

# 7. Core TypeScript Interfaces

## 7.1 Identity

Required aliases:

-   `DocumentId`
-   `LayerId`
-   `FrameId`
-   `CelId`
-   `PaletteId`
-   `AnimationTagId`
-   `FrameIndex`
-   `Revision`

## 7.2 Geometry

-   `Dimensions`
-   `PixelPoint`
-   `ScreenPoint`
-   `CanvasPoint`

## 7.3 Color and Pixels

``` text
RGBA
PixelBuffer
PixelRegion
```

`RGBA` uses 8-bit channels.

`PixelBuffer` provides:

-   `getPixel`
-   `setPixel`
-   `clear`
-   `clone`
-   `copyRegion`
-   `equals`

## 7.4 Layers

A layer contains:

-   ID
-   Name
-   Visibility
-   Lock state
-   Opacity
-   Position
-   Pixel/cel content

`LayerCollection` manages:

-   Ordered layers
-   Active layer
-   Create
-   Delete
-   Duplicate
-   Reorder
-   Set active

## 7.5 Animation

Core types:

-   `CelType`
-   `Cel`
-   `Frame`
-   `Animation`
-   `AnimationTag`
-   `OnionSkinSettings`

Cel types:

``` text
normal
empty
hold
linked
```

## 7.6 Selection

`SelectionMask` provides pixel-level selection state.

`SelectionState` contains:

-   Mask
-   Active state

## 7.7 Viewport

`Viewport` contains:

-   Zoom
-   panX
-   panY

`CoordinateTransformer` converts between screen, canvas, and logical
coordinates.

## 7.8 Document

`Document` contains:

-   Identity
-   Dimensions
-   Metadata
-   Layers
-   Palettes
-   Animation
-   Selection
-   Revision
-   Saved revision

`DocumentFactory` creates default documents.

## 7.9 Tools and Input

`Tool` operates against a `ToolContext`.

Pointer input contains:

-   Position
-   Source
-   Buttons
-   Modifiers

Tool code must not depend directly on browser event objects.

## 7.10 Commands and Errors

Core interfaces include:

-   `Command`
-   `CommandResult`
-   `EditorError`
-   `SaveState`
-   `ApplicationState`

Runtime, persistent, and transient state remain conceptually separate.

------------------------------------------------------------------------

# 8. Core Data Model

## 8.1 Document Authority

The Document is the authoritative editable project state.

## 8.2 Pixel Source of Truth

`PixelBuffer` is the authoritative source of pixel data.

A normal cel owns an independent pixel buffer.

A linked cel intentionally shares pixel data with another cel.

``` text
Cel A ─────┐
           ├── PixelBuffer
Cel B ─────┘
```

## 8.3 Pixel Storage

RGBA 8-bit representation:

``` text
R G B A
```

Recommended storage:

``` text
Uint8ClampedArray
```

For width × height:

``` text
width × height × 4
```

Pixel index:

``` text
(y * width + x) * 4
```

Transparency is represented by alpha.

No magic transparent color is used.

## 8.4 Cels

An empty cel is distinct from a transparent normal cel.

A hold resolves to previous effective artwork.

A linked cel shares pixel data.

`Make Unique` copies shared data and breaks the relationship.

## 8.5 Stable Identity

Layer, frame, cel, palette, and animation-tag IDs remain stable
independently of array position.

Array position represents ordering, not identity.

## 8.6 Selection

Selection mask dimensions must match document dimensions.

Selection is independent of active layer.

## 8.7 Revisions

The Document tracks:

-   Current revision
-   Saved revision

Dirty state is determined through the document/history lifecycle.

PixelBuffer does not manage dirty state.

## 8.8 Initial Document

Default:

``` text
32 × 32
Transparent
Layer 1
Frame 1
Foreground black
Background white
```

## 8.9 Runtime Invariants

The runtime document must maintain:

-   Valid dimensions
-   At least one layer
-   Unique IDs
-   Valid layer order
-   Valid pixel-buffer dimensions
-   Matching selection dimensions
-   Opacity within valid range
-   RGBA values within 0--255
-   Valid linked-cel references

Malformed project data must not create an invalid runtime document.

------------------------------------------------------------------------

# 9. Animation Data Model

Animation extends the document and layer system.

## Frame

A point in time in the animation timeline.

``` text
Frame
├── ID
├── Order
├── Duration
└── Layer Cels
```

## Cel

Pixel content associated with a specific layer at a specific frame.

``` text
Cel
├── Frame ID
├── Layer ID
├── Content Reference
├── Position
└── Type
```

## Normal Cel

Owns its own pixel data.

## Empty Cel

Contains no visible pixel data.

## Hold

Continues displaying previous effective artwork.

## Linked Cel

References shared pixel data.

## Frame Reordering

Reordering moves all cels associated with a frame.

It is one undoable operation.

## Frame Copy / Paste

Copying a frame and pasting creates independent pixel data unless an
explicit linked operation is chosen.

## Onion Skin

Displays neighboring frames as faded viewport references.

Controls may include:

-   Enable/disable
-   Previous-frame count
-   Next-frame count
-   Opacity

Onion skin is never written into artwork.

------------------------------------------------------------------------

# 10. Command / History Engine

All meaningful document mutations pass through the command/history
architecture.

## Mutation Pipeline

Conceptually:

``` text
User Intent
    ↓
Tool / Controller
    ↓
Command
    ↓
Document Mutation
    ↓
History Commit
    ↓
Events
    ↓
Renderer / UI Update
```

## Command Requirements

Commands must support the equivalent concepts of:

-   Execute
-   Undo
-   Description
-   Result
-   Failure handling
-   Transaction participation

## Transactions

A failed document operation must not leave partial changes.

``` text
Attempt
 ↓
Failure
 ↓
Rollback
```

## History Rules

-   Continuous stroke = one history entry
-   Completed transformation = one history entry
-   Layer operation = appropriate single history entry
-   Animation operation = appropriate single history entry
-   Redo is invalidated after a new edit
-   History is session-only
-   History is not serialized

------------------------------------------------------------------------

# 11. Renderer Architecture

The renderer displays document state and must never become the source of
truth.

## Rendering Responsibilities

-   Render logical pixels
-   Preserve pixel-perfect appearance
-   Apply viewport transformation
-   Render layers correctly
-   Render animation state
-   Render editor overlays separately

## Rendering Passes

Conceptually:

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

## Coordinate Transformation

The renderer must provide deterministic conversion between:

-   Screen coordinates
-   Canvas coordinates
-   Logical pixel coordinates

Zoom must never modify document pixel data.

## Pixel Rendering

Nearest-neighbor rendering is mandatory for pixel-art integrity.

------------------------------------------------------------------------

# 12. Input Architecture

Input is the user interaction boundary.

Browser events are adapted before entering tool logic.

## Input Data

Pointer input includes:

-   Position
-   Source
-   Buttons
-   Modifiers

## Input Precedence

The implementation must resolve conflicts deterministically.

Recommended conceptual priority:

``` text
1. Modal interaction
2. Active transform/selection interaction
3. Active tool
4. Timeline interaction
5. Canvas navigation
6. Global shortcuts
```

The exact final precedence may be refined during UI implementation.

Shortcut conflicts, including Space behavior between playback and canvas
navigation, must be resolved explicitly.

------------------------------------------------------------------------

# 13. Storage and `.obsipix`

## 13.1 Storage Separation

``` text
.obsipix
    ↓
User-owned editable project

IndexedDB
    ↓
Browser-local application data
```

These are separate concerns.

## 13.2 Project Concept

Conceptually:

``` text
.obsipix
│
├── Metadata
│   ├── Format Version
│   ├── Project Name
│   └── Application Information
│
├── Document
│   ├── Width
│   ├── Height
│   ├── Color Mode
│   └── Pixel Aspect
│
├── Layers
│   ├── Layer A
│   ├── Layer B
│   └── Layer C
│
├── Pixel Data
│   ├── Data A
│   ├── Data B
│   └── ...
│
├── Palettes
│   ├── Palette A
│   └── Palette B
│
└── Animation
    ├── Frames
    ├── Cels
    ├── Links
    ├── Durations
    ├── Playback
    ├── Onion Skin
    └── Tags
```

## 13.3 Stored Document Properties

The project stores:

-   Width
-   Height
-   Color mode
-   Pixel aspect ratio
-   Relevant background settings

RGBA is the initial default color model.

## 13.4 Stored Layers

The project preserves exact layer order and:

-   ID
-   Name
-   Visibility
-   Locked state
-   Opacity
-   Position
-   Blend Mode
-   Content

Blend-mode implementation must be explicitly classified during V1
implementation if the V1 scope does not define additional modes.

## 13.5 Palettes

Each palette contains:

-   ID
-   Name
-   Colors
-   Order

Each palette color may contain:

-   ID
-   RGBA
-   Optional Name

## 13.6 Animation Storage

The project stores:

-   Frames
-   Cels
-   Linked cels
-   Holds
-   Frame durations
-   Playback settings
-   Onion skin settings
-   Animation tags

## 13.7 UI State Not Required in Project

The project does not need to store:

-   Zoom
-   Pan position
-   Panel arrangement
-   Timeline height
-   UI layout

These are editor/user preferences.

Active layer and active frame may optionally be remembered as
convenience state.

## 13.8 History

Complete Undo/Redo history is not stored in `.obsipix`.

## 13.9 File Integrity

The format should provide corruption detection mechanisms such as:

-   Format version
-   Data lengths
-   Checksums
-   Validation information

The exact physical `.obsipix` container/encoding must be locked as an
implementation decision before final serializer implementation.

## 13.10 Safe Saving

Conceptually:

``` text
Current Project
      ↓
Create temporary save
      ↓
Write data
      ↓
Validate
      ↓
Replace original
```

## 13.11 Migration

Older files:

``` text
Old .obsipix
      ↓
Read format version
      ↓
Migration
      ↓
Current internal document
```

Migration remains separate from the editor engine.

## 13.12 Compatibility

Optional unknown data should be safely ignored where possible rather
than making the entire project unreadable.

## 13.13 Security

`.obsipix` is strictly data and must never execute arbitrary code.

------------------------------------------------------------------------

# 14. File Architecture

The File Service isolates browser file APIs from the editor.

Maintain distinct concepts:

``` text
Open
Import
Save
Export
```

External data must pass validation before entering the editor engine.

The File Service owns browser file interactions.

The core engine must not directly depend on `File`, `Blob`, or browser
file APIs.

------------------------------------------------------------------------

# 15. Error Handling and Diagnostics

## Severity

Conceptual levels:

``` text
Info
Warning
Error
Critical
```

## Save Errors

Save failure must:

-   Preserve current Document
-   Preserve dirty state
-   Inform user
-   Offer retry or Save As where appropriate

## Load/Import Errors

Failed loads/imports must not replace the current document with
incomplete data.

## Renderer Errors

Renderer failures should be isolated from Document state.

The system should log failures and attempt safe recovery where
practical.

## Global Error Boundary

A top-level UI error boundary should prevent a single UI component
failure from necessarily destroying the entire session.

## Logging

Potential levels:

``` text
Debug
Info
Warn
Error
```

## Diagnostics

Development diagnostics should help identify:

-   Current document revision
-   Active tool
-   Active layer/frame
-   Renderer state
-   Memory/cache information
-   Recent commands
-   Recent errors

Diagnostics must avoid unnecessary personal information.

## V1 Error Gate

Critical failures must:

1.  Preserve document data.
2.  Produce a structured error.
3.  Provide meaningful user feedback.
4.  Be logged appropriately.
5.  Avoid exposing sensitive technical information unnecessarily.
6.  Be covered by tests.

------------------------------------------------------------------------

# 16. Performance Architecture

Performance is a core requirement because drawing must feel immediate
while preserving exact pixel behavior.

## Principles

1.  Interactive responsiveness is more important than theoretical
    maximum throughput.
2.  Logical pixel data remains authoritative.
3.  Rendering may use caches and optimized buffers.
4.  Optimizations must never alter pixel accuracy.
5.  Performance must be measured using realistic workloads.

## Brush Performance

Pointer processing should avoid unnecessary allocations.

Continuous strokes interpolate between input points.

## UI vs Canvas

UI and pixel canvas remain separate performance domains.

A pixel edit should not unnecessarily rerender unrelated UI.

## Animation Performance

Animation must account for:

-   Many frames
-   Many layers
-   Linked cels
-   Holds
-   Onion skin
-   Playback

Linked cels and holds should avoid unnecessary duplicate pixel work.

## Undo Memory

History may support:

-   Change sets
-   Snapshots
-   Compression
-   Memory estimation
-   Configurable limits

Correctness remains more important than maximum compression.

------------------------------------------------------------------------

# 17. Accessibility and UI Architecture

The UI is presentation.

The UI communicates with core/application services through defined
boundaries.

UI state must not become authoritative project state.

The final UI includes:

-   Application shell
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

Production UI polish comes after the core vertical slice.

------------------------------------------------------------------------

# 18. Bootstrap

## Initial Core Files

``` text
src/core/
├── types/
│   ├── ids.ts
│   ├── geometry.ts
│   └── color.ts
├── pixels/
│   ├── PixelBuffer.ts
│   └── PixelBuffer.test.ts
├── document/
│   ├── Document.ts
│   ├── DocumentFactory.ts
│   └── DocumentFactory.test.ts
└── layers/
    ├── Layer.ts
    └── LayerCollection.ts
```

## Initial UI

The first UI is intentionally minimal:

``` text
┌──────────────────────────────────────────┐
│ Obsipix                                  │
├──────────────────────────────────────────┤
│ Pencil   Eraser   Undo   Redo   Save     │
├──────────────────────────────────────────┤
│                                          │
│                 CANVAS                   │
│                                          │
├──────────────────────────────────────────┤
│ 32 × 32     100%                         │
└──────────────────────────────────────────┘
```

------------------------------------------------------------------------

# 19. Development Sequence

The implementation sequence begins with the technical foundation and
builds toward the complete V1 workflow.

## Phase 0 Bootstrap

``` text
1.  Create repository
2.  Configure TypeScript
3.  Configure Vite
4.  Configure linting/formatting
5.  Configure Vitest
6.  Configure Playwright
7.  Implement primitive core types
8.  Implement PixelBuffer
9.  Test PixelBuffer
10. Implement Document
11. Implement DocumentFactory
12. Test document creation
13. Implement Layer foundation
14. Implement Command/Transaction/History
15. Test Undo/Redo
16. Implement Canvas renderer
17. Render default 32×32 document
18. Implement coordinate transformation
19. Implement pointer input
20. Implement Pencil
21. Implement Draw Stroke command
22. Test drawing
23. Implement Eraser
24. Test erase + undo/redo
25. Implement .obsipix serialization
26. Implement Save
27. Implement Load
28. Test exact round trip
29. Implement PNG export
30. Test PNG pixels
```

## Full Implementation Sequence

``` text
1.  Core editor drawing/colors/canvas/layers
2.  Shapes
3.  Selection
4.  Transformations
5.  Palettes
6.  Animation foundation
7.  Timeline
8.  Animation visualization
9.  Full lifecycle
10. Recovery
11. PNG import
12. Full input
13. UI completion
14. Accessibility
15. Security hardening
16. Performance hardening
17. Testing completion
18. V1 release candidate
```

------------------------------------------------------------------------

# 20. Implementation Rules

1.  Do not bypass the Document Model.
2.  React is not the source of truth.
3.  Do not bypass Commands for persistent mutations.
4.  Continuous strokes are one history entry.
5.  Transient state is not stored as persistent artwork.
6.  Optimize after measuring.
7.  Post-V1 features remain outside V1.
8.  Every completed subsystem must be tested.
9.  Data-integrity failures are release blockers.
10. Architectural flaws are corrected rather than worked around.
11. Core code must remain browser-independent.
12. Rendering must never mutate authoritative artwork merely to display
    overlays.
13. Serialization must reconstruct a valid Document.
14. External input must be validated before entering the engine.

------------------------------------------------------------------------

# 21. Pixel Engine

`PixelBuffer` is the lowest-level authoritative artwork container.

It must be:

-   Exact
-   Deterministic
-   Efficient
-   Serializable
-   Testable
-   Independent of React
-   Independent of browser APIs
-   Independent of tools
-   Independent of history
-   Independent of rendering

## Responsibility

`PixelBuffer` owns only pixel data.

It does not know about:

-   Layers
-   Frames
-   Animation
-   Tools
-   Selection
-   Undo/redo
-   Canvas
-   React
-   UI
-   Files
-   PNG
-   `.obsipix`

## Representation

Each pixel:

``` text
R G B A
```

Channels:

``` text
0–255
```

Recommended storage:

``` text
Uint8ClampedArray
```

Dimensions:

``` text
width × height × 4
```

## Mutation Boundary

The underlying array must not be exposed for arbitrary application
mutation.

Prefer controlled operations:

``` text
setPixel(x, y, color)
```

## Performance

Pixel operations must avoid:

-   Large allocations per pixel
-   React updates
-   Rendering
-   History entries
-   Serialization
-   Color conversions

A complete brush stroke may modify thousands of pixels while remaining
one command/history transaction.

## Dirty State

PixelBuffer does not manage dirty state.

Dirty state belongs to Document revision/history lifecycle.

## Tests

Tests cover:

-   Creation
-   Dimensions
-   Transparent initialization
-   Pixel writes
-   Pixel reads
-   Neighboring pixels
-   Bounds
-   Clear
-   Clone independence
-   Region copy
-   Equality
-   Edge coordinates
-   Invalid coordinates

Explicit edge coordinates:

``` text
(0,0)
(width-1,0)
(0,height-1)
(width-1,height-1)
```

Equality requires:

-   Matching dimensions
-   Exact RGBA equality

No visual tolerance is used.

## No Browser Dependencies

`PixelBuffer.ts` must not depend on:

-   React
-   `window`
-   `document`
-   `CanvasRenderingContext2D`
-   `ImageData`
-   `File`
-   `Blob`
-   `IndexedDB`

## Definition of Done

PixelBuffer is complete when:

-   RGBA storage works
-   Coordinates are safely handled
-   Transparency works
-   Reads work
-   Writes work
-   Clear works
-   Clone works
-   Region copy works
-   Equality works
-   No browser dependencies exist
-   Unit tests pass
-   Strict TypeScript passes
-   Unrelated editor logic is absent

------------------------------------------------------------------------

# 22. Architecture Completion Gate

The architecture is considered complete and implementation-ready when:

-   V1 scope is locked.
-   Major subsystems have defined responsibilities.
-   Document ownership is clear.
-   Mutation boundaries are defined.
-   History behavior is defined.
-   Event responsibilities are defined.
-   Rendering responsibilities are defined.
-   Input responsibilities are defined.
-   Serialization boundaries are defined.
-   Browser dependencies are isolated.
-   Security requirements are established.
-   Performance targets are established.
-   Testing requirements are established.
-   Post-V1 features are explicitly separated.

## Current Architecture Status

``` text
ARCHITECTURE COMPLETE
```

------------------------------------------------------------------------

# 23. V1 Hardening Gate

Before release, validate:

## Security

-   Validation
-   Sanitization
-   Resource limits
-   Safe files
-   Corrupt-file handling
-   Safe recovery
-   Data-only project format

## Reliability

-   Error handling
-   Transactions
-   Save integrity
-   Recovery
-   Failure isolation

## Accessibility

-   Keyboard navigation
-   Focus
-   Accessible controls
-   Non-color indicators
-   Accessible errors
-   Reduced-motion considerations

## Performance

-   Load target
-   Brush latency target
-   Rendering target
-   Zoom responsiveness
-   Undo/redo responsiveness
-   Timeline playback responsiveness

## Testing

-   Unit
-   Integration
-   E2E
-   Persistence
-   Pixel accuracy
-   Animation
-   Tools
-   UI
-   Performance
-   Accessibility
-   Regression
-   Failure/recovery

------------------------------------------------------------------------

# 24. Explicitly Post-V1

The following are not V1 requirements:

-   AI image generation
-   Collaboration
-   Marketplace
-   Accounts
-   Cloud saving
-   Social features
-   3D
-   Vector editing
-   Advanced brush engines
-   Complex brush dynamics
-   Pressure-based painting
-   Advanced brush stabilization
-   Multiple simultaneous named animation systems
-   Advanced event systems
-   Audio synchronization
-   Advanced animation metadata
-   Advanced animation selection workflows
-   Canvas rotation
-   Minimap
-   Advanced touch gestures
-   Full plugin runtime
-   Plugin marketplace
-   Third-party extension ecosystem

These may be supported by the architecture but must not consume V1
implementation effort.

------------------------------------------------------------------------

# 25. V1 Completion Criteria

Obsipix V1 is complete when a user can reliably:

``` text
Create New Document
        ↓
Draw Pixel Art
        ↓
Use Colors / Palette
        ↓
Create and Manage Layers
        ↓
Select Content
        ↓
Transform Content
        ↓
Create Animation
        ↓
Edit Frames / Cels
        ↓
Preview Animation
        ↓
Save .obsipix
        ↓
Close Project
        ↓
Reopen .obsipix
        ↓
Verify Project Integrity
        ↓
Export PNG
```

The complete workflow must preserve:

-   Pixel accuracy
-   Transparency
-   Layer structure
-   Animation state
-   Linked-cel behavior
-   Undo/redo correctness
-   Project integrity

------------------------------------------------------------------------

# 26. Scope Lock

Once implementation begins, features do not enter V1 merely because they
would be useful.

Every proposed addition is classified:

``` text
V1 Core
V1 Hardening
Post-V1
```

If it does not directly support the V1 workflow or V1 reliability
requirements, it normally remains Post-V1.

------------------------------------------------------------------------

# 27. Final Authority Statement

This document supersedes the two source files:

``` text
PROJECT_CORE_Updated (1).md
PROJECT_CORE_Updated (2).md
```

Those files should be retained as historical/archive copies, but they
are no longer the working specification.

The authoritative project specification is:

``` text
PROJECT_CORE_OBSIPIX.md
```

The coding execution roadmap remains a separate document:

``` text
OBSIPIX_CODING_PHASES.md
```

The relationship is:

``` text
PROJECT_CORE_OBSIPIX.md
        ↓
What Obsipix is
How it must work
What V1 includes
What V1 excludes
Architecture
Contracts
Requirements
        ↓
OBSIPIX_CODING_PHASES.md
        ↓
When and in what order we build it
```

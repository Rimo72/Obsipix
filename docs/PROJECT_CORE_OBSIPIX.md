# Obsipix — Project Core

**Version:** 0.5 — Foundation + Animation + Complete Architecture

---

# 1. Vision

Obsipix is a free, browser-based pixel art editor built for artists, indie developers, and hobbyists.

The goal is not to clone Aseprite feature-for-feature. The goal is to create a fast, enjoyable, professional pixel art editor that works instantly in any modern browser.

## Core Principles

- Free for the core editor
- No installation required
- Pixel-perfect rendering
- Fast keyboard-driven workflow
- Professional enough for game development
- Clean and efficient interface

---

# 2. Project Goals

## Primary Goal

Create sprites, tilesets, icons, and animations entirely inside the browser.

## Non-Goals — Initial Core

The initial core editor will not focus on:

- AI image generation
- Photo editing
- Vector graphics
- 3D art
- Collaboration
- Marketplace functionality
- User accounts
- Cloud saving

These can be discussed separately after the core editor is defined.

---

# 3. Core Architecture

```text
Browser
│
├── UI Layer
│     ├── Menu
│     ├── Toolbar
│     ├── Canvas Workspace
│     ├── Color Selector
│     ├── Palette Panel
│     ├── Layer Panel
│     ├── Timeline
│     └── Future Panels
│
├── Editor Engine
│     ├── Canvas Renderer
│     ├── Drawing Tools
│     ├── Layer Engine
│     ├── Animation Engine
│     ├── History Engine
│     ├── Selection Engine
│     └── Transformation Engine
│
└── Storage
      ├── Obsipix Project File
      ├── Local Project
      └── PNG Export
```

The architecture should separate the editor engine from the user interface so that future desktop or alternative interfaces remain possible.

---

# 4. Minimum Viable Editor

The first usable version should focus on the essential drawing experience.

| Feature | Status |
|---|---|
| Pixel canvas | Required |
| Pencil | Required |
| Eraser | Required |
| Color picker | Required |
| Fill bucket | Required |
| Zoom | Required |
| Pan | Required |
| Grid | Required |
| Undo / Redo | Required |
| PNG Export | Required |
| Layers | Required |
| Color selector | Required |
| Palette | Required |

Everything outside the core drawing workflow can be added later.

---

# 5. Canvas

The canvas is the heart of Obsipix.

## Supported Sizes

Initial presets:

| Size | Typical Use |
|---|---|
| 16×16 | Icons / small sprites |
| 32×32 | Retro sprites |
| 48×48 | Character sprites |
| 64×64 | Detailed sprites |
| 128×128 | Larger pixel art |
| Custom | Advanced users |

The canvas stores true logical pixel data.

Zoom changes only how pixels are displayed. It never changes the underlying image resolution.

---

# 6. Rendering Rules

## Pixel Perfect

Every logical pixel must map to a clean square.

Rules:

- Use nearest-neighbor scaling.
- Never blur pixel art.
- Never use unintended anti-aliasing.
- Prefer integer zoom levels where practical.
- Preserve crisp pixel edges at every zoom level.

---

# 7. Coordinate System

```text
Canvas

(0,0) ─────────────────► X
  │
  │
  │
  ▼
  Y
```

Each pixel is addressed using integer canvas coordinates.

Example:

```text
Pixel (12, 7)
```

The editor engine must work with logical canvas coordinates rather than screen coordinates.

---

# 8. Drawing Pipeline

All drawing tools should follow the same general pipeline.

```text
Mouse / Stylus / Touch
        ↓
Screen Position
        ↓
Viewport / Zoom Transformation
        ↓
Logical Canvas Coordinate
        ↓
Selected Tool
        ↓
Modify Pixel Data
        ↓
Render Canvas
        ↓
Create History Entry
```

This common pipeline should make tool behavior consistent.

---

# 9. Workspace Layout

The initial workspace should contain four primary areas.

```text
┌────────────────────────────────────────────┐
│ Menu                                       │
├─────────┬───────────────────────┬──────────┤
│ Tools   │                       │ Colors   │
│         │       Canvas          │ Palette  │
│         │                       │ Layers   │
├─────────┴───────────────────────┴──────────┤
│ Timeline / Status Bar                      │
└────────────────────────────────────────────┘
```

The exact UI arrangement will be designed separately.

The workspace should eventually support collapsible or dockable panels.

---

# 10. Editor State

The editor maintains one active document.

```text
Document
│
├── Width
├── Height
├── Layers
├── Active Layer
├── Color State
├── Palette
├── Zoom
├── Viewport
├── Selection
├── Animation
└── History
```

The document state should be serializable so that project saving can be added without redesigning the editor.

---

# 11. Layers

Layers are a fundamental part of the Obsipix editor.

## Core Behavior

- A document can contain an unlimited number of layers, subject to browser/device performance.
- Every new document starts with one layer named `Layer 1`.
- The canvas is transparent by default.
- Layers render from bottom to top.
- Drawing operations apply to the currently selected layer.
- Layer opacity is non-destructive.

## Layer Properties

Each layer contains:

- Name
- Visibility
- Lock state
- Opacity
- Pixel data / animation cel references
- Position

## Layer Operations

Users can:

- Create a new layer
- Delete a layer
- Duplicate a layer
- Rename a layer
- Move a layer up
- Move a layer down
- Hide/show a layer
- Lock/unlock a layer
- Change layer opacity
- Clear a layer
- Merge the selected layer down
- Merge visible layers
- Flatten the image

## Layer Content Operations

Users can:

- Select all pixels on a layer
- Move layer contents
- Clear selected content
- Copy layer content
- Paste layer content

## Layer Panel

The layer panel should clearly show the layer stack.

Example:

```text
┌─────────────────────────┐
│ LAYERS              +   │
├─────────────────────────┤
│ 👁 🔒  Character        │
│ 👁     Outline          │
│ 👁     Colors           │
│ 👁     Background       │
├─────────────────────────┤
│ Opacity: 100%           │
└─────────────────────────┘
```

The active layer must be visually identifiable.

## Layer Groups

Layer groups/folders are excluded from the initial core implementation.

The architecture should allow groups to be introduced later without requiring a complete redesign.

---

# 12. Pencil / Brush System

The Pencil/Brush system is the primary drawing mechanism in Obsipix.

## Core Behavior

- Pencil is the default drawing tool.
- Default brush size is 1×1 logical pixel.
- Brush size is independent of zoom.
- Drawing uses hard-edged pixels.
- Anti-aliasing is disabled.
- Drawing outside canvas boundaries has no effect.
- A continuous drag is treated as one undoable stroke.

## Brush Sizes

Initial sizes:

- 1×1
- 2×2
- 3×3
- 4×4
- 5×5
- 8×8
- Custom sizes

The system should support arbitrary integer brush dimensions in the future.

## Brush Shapes

Initial shapes:

- Square
- Circle

Square is the default.

The architecture should allow future custom brushes and brush patterns.

## Pixel Placement

```text
Screen Position
      ↓
Zoom / Viewport Transformation
      ↓
Logical Canvas Coordinate
      ↓
Brush Calculation
      ↓
Pixel Modification
```

Zoom must never modify actual pixel data.

## Primary and Secondary Colors

- Left mouse button → Primary / Foreground color
- Right mouse button → Secondary / Background color

## Continuous Drawing

Fast mouse movement must not create gaps between pixels.

The drawing engine should interpolate between input points using a pixel-based line algorithm rather than relying only on browser pointer-event frequency.

## Straight Lines

Holding `Shift` should provide a straight-line drawing workflow.

The exact interaction can be refined during implementation.

## Stylus / Tablet

The drawing engine should support stylus input when available.

Pressure sensitivity is optional initially and should not affect standard mouse behavior unless explicitly enabled.

Future pressure controls may include:

- Brush size
- Opacity
- Flow

## Future Brush Features

The architecture should allow:

- Custom brushes
- Brush patterns
- Dithering brushes
- Palette-restricted brushes
- Brush rotation
- Brush mirroring
- Brush stamping
- Tile-aware brushes

---

# 13. Eraser System

The Eraser removes pixel data from the active layer and restores transparency.

The Eraser uses the same underlying drawing engine as the Pencil.

## Core Behavior

- Dedicated Eraser tool
- Default size: 1×1
- Same size options as Pencil
- Same brush shapes as Pencil
- Removes pixels to transparency
- Never modifies other layers
- Continuous erase drag is one undoable stroke

## Eraser Shapes

Initial shapes:

- Square
- Circle

## Pixel-Perfect Erasing

The Eraser must:

- Remove complete logical pixels.
- Never unintentionally create partially transparent pixels.
- Never anti-alias.
- Never blur surrounding pixels.

## Transparency

Erasing sets the affected pixels to full transparency.

The editor must distinguish between:

- Fully transparent
- Fully opaque
- Partially transparent

The standard Pencil should normally create fully opaque pixels unless opacity is explicitly changed.

## Keyboard Shortcut

`E` → Eraser

---

# 14. Color System

The color system supports color selection, editing, sampling, transparency, palettes, and future indexed-color workflows.

## Core Color Model

Obsipix uses RGBA internally.

```text
R = 0–255
G = 0–255
B = 0–255
A = 0–255
```

This provides 32-bit color with alpha transparency.

The architecture must remain compatible with future indexed-color functionality.

## Color Selector

Obsipix should provide a dedicated Color Selector panel.

Supported color modes:

- RGB
- HSV
- HSL
- Gray
- Mask

Changing a value in one mode must update the equivalent values in the other modes.

## RGB Mode

Provides controls for:

- Red
- Green
- Blue
- Alpha

Each value ranges from 0 to 255.

Both visual sliders and numeric inputs should be available.

## HSV Mode

Provides:

- Hue
- Saturation
- Value
- Alpha

HSV is particularly useful for pixel-art color selection and variations.

## HSL Mode

Provides:

- Hue
- Saturation
- Lightness
- Alpha

Changing HSL values updates the same underlying color.

## Gray Mode

Provides a grayscale workflow with:

- Gray / luminance value
- Alpha

Useful for grayscale sprites, shading, value studies, and mask workflows.

## Mask Mode

Mask mode is intended for transparency and mask-based workflows.

The exact implementation will be defined during development.

## Visual Color Selector

The Color Selector should include a visual color selection area.

For example:

```text
┌──────────────────────────┐
│                          │
│     Saturation / Value   │
│                          │
│            ●             │
│                          │
└──────────────────────────┘

Hue
━━━━━━━━━━━━━━━━━━━━━━━━━━
```

The selector must update the active color immediately.

## Hue Control

A dedicated hue control should visually represent the hue range.

Selecting a hue updates the primary visual color-selection area.

## Alpha Control

Alpha must be directly controllable.

The alpha control should visually represent transparency using a checkerboard pattern.

```text
Alpha

░░░░░░░░████████
```

Values:

```text
0   = Fully transparent
255 = Fully opaque
```

## HEX Color

Supported formats:

```text
#RGB
#RGBA
#RRGGBB
#RRGGBBAA
```

Examples:

```text
#FFFFFF
#000000
#FF0000
#FF000080
```

The HEX field must update whenever the active color changes.

Entering a HEX value must update RGB, HSV, HSL, Gray, Alpha, the color selector, and the Foreground color.

## Foreground and Background Colors

Obsipix maintains two active colors.

- Foreground / Primary
- Background / Secondary

Left mouse button uses Foreground.

Right mouse button uses Background.

Default shortcut:

`X` → Swap colors

## Transparent Color

Transparency is a valid color state.

```text
Alpha = 0
```

The UI must clearly indicate when the active color is transparent.

## Color Picker

The Color Picker samples the exact RGBA value from the canvas.

Default shortcut:

`I` → Color Picker

Sampling must preserve alpha.

## Temporary Color Picker

Future workflow:

```text
Hold Alt
    ↓
Temporarily activate Color Picker
    ↓
Sample color
    ↓
Release Alt
    ↓
Return to previous tool
```

## Recent Colors

Obsipix should maintain a Recent Colors collection.

It should:

- Automatically record colors used.
- Avoid unnecessary duplicates.
- Allow quick re-selection.
- Remain separate from saved palettes.

---

# 15. Palettes

Palettes are collections of reusable colors and should be a major component of Obsipix.

Users should eventually be able to:

- Create palettes
- Rename palettes
- Delete palettes
- Add colors
- Remove colors
- Reorder colors
- Select colors
- Replace colors
- Duplicate palettes
- Import palettes
- Export palettes

## Palette Panel

The Palette Panel should display colors in a compact grid.

Example:

```text
┌──────────────────────┐
│ PALETTE          +   │
├──────────────────────┤
│ ■ ■ ■ ■ ■ ■ ■ ■      │
│ ■ ■ ■ ■ ■ ■ ■ ■      │
│ ■ ■ ■ ■ ■ ■ ■ ■      │
│ ■ ■ ■ ■ ■ ■ ■ ■      │
│                      │
├──────────────────────┤
│ Palette Name         │
└──────────────────────┘
```

## Palette Interaction

- Click → Set Foreground color
- Right-click → May set Background color
- Active color must be visually identifiable

The exact interaction model will be finalized during UI design.

## Palette Editing

Potential interactions:

- Double-click → Edit color
- Drag → Reorder
- Right-click → Context menu
- Add → Add current Foreground color
- Delete → Remove selected palette color

## Palette Import / Export

Potential formats:

- GPL
- JASC-PAL
- ASE / Aseprite palette
- JSON
- Obsipix palette format

Initial implementation may support only a subset.

## Palette Restrictions

Future modes:

```text
Free Color
Palette Restricted
Indexed Palette
```

## Indexed Color

Indexed-color mode is not required for the initial editor.

Future functionality may include:

- Fixed palette
- Indexed pixels
- Palette swapping
- Palette optimization
- Color reduction
- Palette locking
- Console-specific palettes
- Retro-game palettes

The initial RGBA architecture must not prevent indexed-color support.

## Color Replacement

Future functionality should replace one color with another across:

- Current pixel
- Current layer
- Selection
- Entire image
- All layers

The operation must be fully undoable.

## Color Ramps

Future support may include:

- Light → dark ramps
- Dark → light ramps
- Hue shifting
- Saturation adjustment
- Value adjustment
- Automatic intermediate colors

## Palette Extraction

Future functionality may extract palettes from artwork.

Possible options:

- Extract all colors
- Extract dominant colors
- Limit palette size
- Remove similar colors
- Sort by hue
- Sort by luminance
- Sort by saturation

## Palette Swapping

Future functionality should allow an artwork's colors to be mapped to an alternate palette without changing its geometry.

---

# 16. Undo / Redo

Every completed editor action should become a history entry.

Examples:

- One Pencil stroke
- One Eraser stroke
- One Fill operation
- One transformation
- One layer operation
- One animation operation

A continuous drawing stroke should not create a history entry for every individual pixel.

Undo must restore the exact previous editor state.

Redo must restore the exact state that was undone.

A history entry should represent a meaningful user action rather than an internal rendering operation.

The history architecture should support a configurable history limit in the future.

---

# 17. Keyboard-First Workflow

Initial shortcuts:

| Shortcut | Action |
|---|---|
| B | Pencil |
| E | Eraser |
| G | Fill |
| I | Eyedropper |
| L | Line |
| M | Move |
| O | Ellipse |
| R | Rectangle |
| X | Swap colors |
| Space | Pan |
| Ctrl+A | Select All |
| Ctrl+Shift+A | Deselect |
| Ctrl+Z | Undo |
| Ctrl+Shift+Z | Redo |
| Ctrl+S | Save Obsipix Project |

Export should remain a separate workflow from Save.

Shortcut behavior should be configurable in a future version.

---

# 18. Performance Targets

Initial targets:

| Metric | Target |
|---|---|
| Initial load | Under 2 seconds where practical |
| Brush latency | Under 8 ms target |
| Zoom | Immediate |
| Undo | Immediate |
| Normal rendering | 60 FPS target |

Performance should be measured using realistic pixel-art workloads rather than only tiny test canvases.

Animation performance must also be considered for larger documents with many frames and layers.

---

# 19. Design Philosophy

Obsipix should feel:

- Instant
- Lightweight
- Precise
- Creative
- Professional
- Pixel-focused

Features should not interrupt the drawing workflow unnecessarily.

The canvas should remain the primary focus of the interface.

Advanced functionality should be accessible without overwhelming new users.

---

# 20. Canvas Navigation

Canvas navigation controls how users zoom, pan, and inspect pixel artwork.

## Zoom

Supported zoom range:

```text
25% → 6400%
```

The zoom level changes only the viewport representation.

It never changes the underlying pixel resolution.

## Zoom to Cursor

When zooming in or out, the pixel beneath the cursor should remain under the cursor whenever practical.

This makes detailed pixel editing much faster.

## Preset Zoom Levels

Initial shortcuts:

| Shortcut | Action |
|---|---|
| `+` | Zoom In |
| `-` | Zoom Out |
| `0` | Fit Canvas |
| `1` | 100% |
| `2` | 200% |

Additional zoom levels may be added later.

## Pan

Users should be able to pan using:

- `Space + Drag`
- Middle Mouse Button + Drag

The canvas may be positioned outside the center of the viewport.

## Grid

At high zoom levels, a pixel grid should become visible.

The grid must:

- Align exactly with logical pixels.
- Never alter artwork.
- Be independently toggleable.
- Adapt appropriately to zoom.

## Transparency Checkerboard

Transparent areas should display a checkerboard pattern.

The checkerboard is a viewport overlay only.

It must never be included in exported artwork.

## Future Navigation Features

Possible future additions:

- Canvas rotation
- Navigator / minimap
- Touch gestures
- Trackpad gestures
- Custom zoom increments
- Center canvas command

---

# 21. Selection System

Selection allows users to isolate pixels for editing, moving, transforming, copying, and deleting.

## Selection Tools

Initial selection tools:

- Rectangular Selection
- Freehand / Lasso Selection

Future tools may include:

- Magic Wand
- Select by Color
- Similar Color
- Contiguous Color
- Polygon Selection

## Selection Modes

Selections should support:

- Replace
- Add
- Subtract
- Intersect

## Pixel-Based Selection

The selection is represented internally as a pixel-based mask.

Each logical pixel can be:

```text
Selected
Not Selected
```

Future support may allow partial selection masks for advanced workflows.

## Selection Display

The selection boundary should use a visible "marching ants" style overlay.

The overlay must never modify pixel data.

## Selection Shortcuts

| Shortcut | Action |
|---|---|
| Ctrl+A | Select All |
| Ctrl+Shift+A | Deselect |

Additional selection shortcuts may be added later.

## Selection Operations

Users should eventually be able to:

- Move selected pixels
- Copy
- Cut
- Paste
- Delete / clear
- Invert selection
- Select all
- Deselect

## Selection Independence

The selection exists independently of the active layer.

A selection may therefore be used while changing layers.

## Drawing and Fill Interaction

When a selection exists:

- Pencil respects the selection.
- Eraser respects the selection.
- Fill respects the selection.
- Transformations respect the selection.

Pixels outside the selected region must not be modified.

## Floating Selection

When selected pixels are moved or pasted, the editor may temporarily represent them as a floating selection.

The floating selection can then be:

- Moved
- Transformed
- Committed
- Cancelled

The exact implementation will be refined during development.

---

# 22. Line & Shape Tools

Obsipix should provide dedicated pixel-perfect line and shape tools.

## Line Tool

Shortcut:

`L`

The Line Tool creates a straight pixel line.

It must use a deterministic pixel-based line algorithm.

## Rectangle Tool

Shortcut:

`R`

Supports:

- Outline
- Filled
- Filled + Outline

## Ellipse / Circle Tool

Shortcut:

`O`

Supports:

- Outline
- Filled
- Filled + Outline

## Constraints

Holding `Shift` should constrain shapes.

Examples:

```text
Rectangle + Shift → Square
Ellipse + Shift    → Circle
```

## Live Preview

While dragging, the shape should be previewed without permanently modifying the canvas.

The final pixel data is committed when the action completes.

Pressing `Esc` cancels the current shape.

## Selection Support

Shapes must respect the current selection.

If no selection exists, the shape can operate across the full canvas.

## Layer Support

Shapes are drawn only on the active layer / active cel.

## Shared Shape Engine

Line, rectangle, and ellipse tools should use a common shape engine.

The architecture should support future additions such as:

- Polygon
- Triangle
- Rounded rectangle
- Arc
- Custom geometric shapes

---

# 23. Fill / Bucket Tool

The Fill Tool provides contiguous flood filling.

Shortcut:

`G`

## Core Behavior

The initial implementation uses contiguous flood fill.

Starting from the selected pixel:

```text
Starting Pixel
      ↓
Find connected pixels
      ↓
Compare color
      ↓
Replace matching region
```

## Color Matching

Initial matching should use exact RGBA equality.

Example:

```text
Pixel A = #FF0000FF
Pixel B = #FF0000FF
```

They match exactly.

A different alpha value does not match.

## Transparency

Transparent regions are valid fill regions.

Example:

```text
Transparent → Filled Color
```

## Active Layer

The initial Fill Tool operates only on the active layer / active cel.

It does not automatically inspect all layers.

Future options may include:

- Sample merged image
- Fill across all visible layers

## Selection

If a selection exists, the Fill Tool must respect the selection.

Pixels outside the selection cannot be modified.

## Same-Color Safety

If the selected fill color is identical to the target color, the operation should do nothing and should not create an unnecessary history entry.

## Undo

A completed fill operation creates one history entry regardless of how many pixels are changed.

## Future Fill Features

Possible additions:

- Color tolerance
- Fill all matching pixels
- Pattern fill
- Gradient fill
- Global replacement
- Sample merged image

---

# 24. Image Transformations

The Transformation System allows users to move, flip, rotate, resize, and reposition pixel artwork while preserving pixel integrity.

## Core Principle

All transformations operate on logical pixel coordinates.

Transformations must never introduce unintended:

- Anti-aliasing
- Blur
- Smoothing
- Interpolation artifacts
- Fractional pixel positions

## Move Tool

Shortcut:

`M`

The Move Tool moves pixel content.

Initial behavior:

- If a selection exists, move the selected pixels.
- If no selection exists, move the active layer / active cel contents.
- Movement is based on integer logical pixel coordinates.

## Keyboard Movement

Arrow keys move the active content by:

```text
1 pixel
```

Potential future shortcut:

```text
Shift + Arrow → 10 pixels
```

## Transform Preview

Transformations should provide a live preview.

The user can:

- Move
- Commit with `Enter`
- Cancel with `Esc`

No permanent pixel changes should occur until the transformation is committed.

## Flip

Supported operations:

- Flip Horizontal
- Flip Vertical

These should work on:

- Selection
- Active layer / cel
- Entire image

## Rotate

Initial rotation options:

- 90° Clockwise
- 90° Counter-clockwise
- 180°

For a full-image 90° rotation, canvas dimensions swap.

Example:

```text
64 × 32
   ↓ 90°
32 × 64
```

## Scaling

Scaling uses nearest-neighbor interpolation.

Integer scaling presets should include:

```text
2×
3×
4×
8×
```

Non-integer scaling may be supported, but nearest-neighbor should remain the default for pixel-art integrity.

## Resize Image vs Resize Canvas

These must be separate operations.

### Resize Image

Changes the dimensions of the artwork itself.

Pixel content is scaled or transformed according to the selected resize method.

### Resize Canvas

Changes the document boundaries without automatically scaling the artwork.

Example:

```text
Original:
32 × 32

Resize Canvas:
64 × 64
```

The existing artwork remains at its original pixel size and is positioned using an anchor.

## Canvas Anchors

Canvas resizing should provide a 3×3 anchor:

```text
┌───┬───┬───┐
│ ↖ │ ↑ │ ↗ │
├───┼───┼───┤
│ ← │ • │ → │
├───┼───┼───┤
│ ↙ │ ↓ │ ↘ │
└───┴───┴───┘
```

This determines where existing artwork remains positioned when the canvas changes size.

## Selection Transformations

Selections can be:

- Moved
- Flipped
- Rotated
- Scaled

The selection itself should remain independent of the layer until the transformation is committed.

## Floating Transform State

A transformation can temporarily create a floating transform state.

```text
Original Pixels
      ↓
Select / Transform
      ↓
Preview
      ↓
Commit or Cancel
```

## Undo

Each completed transformation should create one history entry.

## Safety Rules

Transformation operations must:

- Preserve transparency.
- Preserve exact colors.
- Use integer pixel coordinates where possible.
- Avoid smoothing.
- Avoid accidental permanent changes before commit.

## Future Transform Features

Possible future additions:

- Free transform
- Arbitrary-angle rotation
- Transform handles
- Skew
- Perspective
- Custom pivot
- Multi-layer transform
- Tile-aware transformation
- Tileable transformations

---

# 25. Animation Architecture

Animation is an extension of the document and layer system.

The project file must store animation data so that animation can be saved and reopened as part of the same Obsipix project.

## Core Model

Animation uses the concepts of:

- Frame
- Cel
- Linked Cel
- Hold / Exposure
- Timeline
- Frame Duration
- Animation Tags

The distinction between Frame and Cel is fundamental.

### Frame

A point in time in the animation timeline.

### Cel

The pixel content associated with a specific layer at a specific frame.

### Linked Cel

A cel that references shared pixel data used by another cel.

This can reduce memory usage and intentionally allow multiple frames to share identical artwork.

---

# 26. Animation Timeline

The timeline is a time-based editor displayed below the canvas.

Conceptually:

```text
                 TIME →
             1    2    3    4    5    6
           ┌────┬────┬────┬────┬────┬────┐
Layer 2    │    │    │    │    │    │    │
           ├────┼────┼────┼────┼────┼────┤
Layer 1    │    │    │    │    │    │    │
           └────┴────┴────┴────┴────┴────┘
                ↑
             Frame 3
```

Each layer/frame intersection represents a cel state.

The selected frame determines what the canvas displays.

## Timeline Requirements

The timeline should support:

- Frame selection
- Layer selection
- Creating frames
- Creating empty frames
- Duplicating frames
- Deleting frames
- Reordering frames
- Playback
- Frame duration
- Onion skin
- Animation tags

The exact visual styling will be designed separately.

---

# 27. Creating Frames

A new document starts as a normal non-animated document:

```text
Frame 1
└── Layer 1
    └── Cel
```

Users do not need to manually enable animation before drawing.

If the user creates another frame, the document becomes animated.

## New Frame

`New Frame` creates a new frame after the currently selected frame.

Recommended default behavior:

- Copy the current frame's visible artwork into independent cels.
- Editing the new frame does not change the original frame.

Example:

```text
Frame 3
Cel A

      ↓ New Frame

Frame 4
Cel B
```

Cel B starts with identical pixels but is independent.

## New Empty Frame

`New Empty Frame` creates a frame with empty cels.

Example:

```text
Frame 1       Frame 2       Frame 3
  ●             ○             ●
```

Where:

```text
● = Cel containing artwork
○ = Empty cel
```

The user can immediately begin drawing.

## Duplicate Frame

`Duplicate Frame` creates an independent copy of the current frame.

Editing the duplicate must not alter the source frame.

---

# 28. Empty Cels and Holds

Obsipix must distinguish between an empty cel and a hold/exposure.

## Empty Cel

The layer has no artwork at this frame.

Example:

```text
Frame 1 = Character
Frame 2 = Empty
Frame 3 = Empty
```

The character disappears on Frames 2 and 3.

## Hold / Exposure

A hold means the previous cel continues to be displayed.

Example:

```text
Frame 1 → Cel A
Frame 2 → Hold A
Frame 3 → Hold A
Frame 4 → Cel B
Frame 5 → Hold B
```

Conceptually:

```text
Frame 1    A
Frame 2    A
Frame 3    A
Frame 4    B
Frame 5    B
```

No unnecessary pixel-data duplication should occur for holds.

---

# 29. Linked Cels

Linked cels allow multiple timeline positions to reference the same pixel data.

Example:

```text
Frame 1 → Cel A
Frame 2 → Cel A
Frame 3 → Cel B
```

Editing Cel A changes both Frame 1 and Frame 2.

Linked cels must be visually distinguishable in the timeline.

## Duplicate Linked Cel

A future command may intentionally create another cel referencing the same pixel data.

Example:

```text
Frame 1 → Cel A
Frame 2 → Cel A
Frame 3 → Cel A
```

This is useful for repeated poses.

## Make Cel Unique / Unlink

If a user wants to edit one linked cel independently:

```text
Frame 1 → Cel A
Frame 2 → Cel A

Make Frame 2 Unique

Frame 1 → Cel A
Frame 2 → Cel B
```

Cel B initially contains identical pixels.

Editing Frame 2 then affects only Cel B.

---

# 30. Drawing on a Frame

The canvas always represents the currently selected frame.

Example:

```text
Timeline
    ↓
Frame 8 selected
    ↓
Canvas displays Frame 8
    ↓
User draws
    ↓
Pixels are written to Frame 8's active-layer cel
```

Users should not need to manually create a cel before drawing.

If the active layer requires a cel and none exists, Obsipix should create an appropriate cel automatically.

This keeps animation editing intuitive.

---

# 31. Frame Reordering

Frames should be reorderable by dragging them to a new timeline position.

Example:

```text
Before:

1   2   3   4
A   B   C   D

Move C before A:

1   2   3   4
C   A   B   D
```

All cels associated with a frame move with that frame.

Reordering is one undoable operation.

---

# 32. Frame Copy / Paste

Users should eventually be able to:

- Copy Frame
- Paste Frame

Example:

```text
Frame 3
   ↓
Ctrl+C

Frame 8
   ↓
Ctrl+V
```

Pasting creates independent pixel data unless the user explicitly chooses a linked operation.

---

# 33. Onion Skin

Onion skinning displays neighboring frames as faded visual references while editing the current frame.

Example:

```text
Previous frame
      ↓
  [faded artwork]

Current frame
      ↓
  [normal artwork]

Next frame
      ↓
  [faded artwork]
```

Controls should eventually include:

- Enable / disable
- Number of previous frames
- Number of next frames
- Opacity

Onion skin artwork is a viewport overlay only.

It must never be written into the actual cel or exported artwork.

---

# 34. Frame Duration and FPS

Animation should support both a default FPS and individual frame durations.

## Default FPS

Initial options:

```text
1
2
3
4
5
6
8
10
12
15
20
24
30
60
Custom
```

Example:

```text
FPS: 12
```

New frames inherit the default duration unless overridden.

## Per-Frame Duration

Individual frames may have different durations.

Example:

```text
Frame 1 → 100 ms
Frame 2 → 100 ms
Frame 3 → 300 ms
Frame 4 → 100 ms
```

This allows important poses to remain visible longer.

Playback must use the actual frame durations.

---

# 35. Playback

Playback occurs directly on the canvas.

Controls should include:

- First frame
- Previous frame
- Play
- Next frame
- Last frame
- Loop

Initial playback modes:

```text
Loop
Play Once
```

Future:

```text
Ping-Pong
```

During playback, editing overlays should be hidden where practical.

---

# 36. Animation Preview

Preview mode should display the actual animation without editor-only overlays.

It should hide:

- Grid
- Selection outline
- Onion skin
- Editing handles
- Other temporary overlays

Future preview scaling:

```text
1×
2×
4×
8×
```

---

# 37. Animation Tags

Animation tags identify ranges of frames for named animations.

Example:

```text
Frames 1–6
Idle

Frames 7–14
Walk

Frames 15–22
Attack
```

A tag should eventually contain:

- Name
- Start frame
- End frame
- Playback direction
- Optional color
- Optional custom FPS

Tags are especially useful for game-development export.

The architecture should support them from the beginning even if advanced tag features arrive later.

---

# 38. Animation Shortcuts

Potential shortcuts:

| Shortcut | Action |
|---|---|
| Space | Play / Pause when timeline is focused |
| Left Arrow | Previous frame |
| Right Arrow | Next frame |
| Home | First frame |
| End | Last frame |

Shortcut conflicts with canvas navigation must be resolved during UI implementation.

---

# 39. Animation Undo / Redo

Animation operations participate in the same history system as drawing operations.

Examples:

- Create frame
- Delete frame
- Duplicate frame
- Reorder frame
- Link cel
- Make cel unique
- Change frame duration
- Change animation settings
- Edit pixels

Each meaningful completed action should create an appropriate undo entry.

---

# 40. Animation Data Model

Conceptually:

```text
Document
│
├── Canvas
│
├── Layers
│
├── Palette
│
└── Animation
    │
    ├── Frames
    │   │
    │   ├── Frame 1
    │   │   ├── Layer 1 → Cel A
    │   │   └── Layer 2 → Cel B
    │   │
    │   ├── Frame 2
    │   │   ├── Layer 1 → Cel A
    │   │   └── Layer 2 → Cel C
    │   │
    │   └── Frame 3
    │       ├── Layer 1 → Cel D
    │       └── Layer 2 → Cel C
    │
    ├── Default Frame Rate
    ├── Frame Durations
    ├── Playback Settings
    ├── Onion Skin Settings
    └── Animation Tags
```

Conceptual cel structure:

```text
Cel
│
├── Pixel Data
├── Position
└── Link Reference
```

The final storage representation may use more efficient internal structures.

---

# 41. Animation V1

## Required

- Timeline
- Frames
- Cels
- Empty cels
- Holds / exposures
- New Frame
- New Empty Frame
- Duplicate Frame
- Delete Frame
- Reorder Frames
- Linked Cels
- Make Cel Unique / Unlink
- Per-frame duration
- Default FPS
- Play / Pause
- Loop
- Previous / Next Frame
- First / Last Frame
- Onion Skin
- Animation Preview
- Basic Animation Tags

## Later

- Multiple simultaneous named animations
- Ping-pong playback
- Advanced multi-frame selection
- Animation events
- Audio
- Advanced game-engine metadata

---

# 42. Save vs Export

Obsipix must clearly separate **saving an editable project** from **exporting finished artwork**.

This distinction should remain consistent throughout the application.

## Save

**Save means: save the Obsipix project.**

Example:

```text
MyCharacter.obsipix
```

The project file may contain:

- Canvas dimensions
- Layers
- Layer names
- Layer visibility
- Layer opacity
- Layer positions
- Palette
- Animation frames
- Cels
- Linked cels
- Frame durations
- Animation tags
- Future editor-specific metadata

`Ctrl+S` should invoke the project save workflow.

## Export

**Export means: create artwork or data for use outside Obsipix.**

Examples:

```text
MyCharacter.png
MyCharacter.gif
MyCharacter.webp
MyCharacter-spritesheet.png
```

Save and Export should not be treated as the same operation.

The user should never have to choose between `.obsipix` and `.png` inside a generic Save dialog.

---

# 43. File Menu Structure

The initial File menu should conceptually follow:

```text
File
├── New
├── Open...
├── Save
├── Save As...
├────────────────
├── Export...
├── Export As...
├────────────────
└── Close
```

Save operations deal with Obsipix projects.

Export operations deal with external output formats.

---

# 44. Import / Export

The Import / Export System allows users to bring existing artwork into Obsipix and export finished artwork for use in games, websites, and other applications.

The system must prioritize pixel-perfect results.

## Primary Export Format

PNG is the primary export format for the initial version.

PNG export must support:

- Full RGBA transparency
- Multiple layers composited into the final image
- Exact pixel colors
- No anti-aliasing
- No image smoothing
- Original canvas dimensions

## Transparent PNG

Transparent pixels must remain transparent.

Partially transparent pixels must remain partially transparent.

## Export Scaling

Users should be able to export at larger integer scales.

Example:

```text
1× → 32 × 32
2× → 64 × 64
4× → 128 × 128
8× → 256 × 256
```

Scaling must use nearest-neighbor interpolation.

## Export Options

Initial export dialog should eventually provide:

```text
Export PNG

Scale:     [ 1× ]

Width:     32
Height:    32

☑ Transparent Background

[ Cancel ] [ Export ]
```

The final UI will be designed separately.

## Export Filename

Default filename:

```text
obsipix-art.png
```

If the document has a project name:

```text
<ProjectName>.png
```

The user should be able to change the filename before exporting.

## Export Visible Image

Standard PNG export should export the composited visible image.

Hidden layers must not appear.

## Future Export Targets

Potential future formats/features:

- PNG
- Sprite Sheet PNG
- Animated GIF
- WebP
- BMP
- Game-engine metadata
- JSON metadata
- Texture atlas
- Tileset data

---

# 45. Image Import

Initial supported image import format:

```text
PNG
```

Users should be able to:

- Open a PNG as a new document.
- Import a PNG into an existing document.
- Import a PNG as a new layer.

## PNG Import

```text
PNG
 ↓
Decode RGBA
 ↓
Create Pixel Data
 ↓
Create Document or Cel
 ↓
Display on Canvas
```

Original pixel colors must be preserved.

No automatic scaling should occur during normal import.

## Import Transparency

PNG alpha values must be preserved:

```text
Alpha = 0
Alpha = 1–254
Alpha = 255
```

## Import Dimensions

When opening a PNG as a new document, the imported dimensions become the document dimensions.

Example:

```text
128 × 64 PNG
      ↓
128 × 64 Obsipix Document
```

## Import as Layer

When importing into an existing document:

```text
Existing Document
        ↓
Import PNG
        ↓
New Layer / Cel
        ↓
Place Imported Pixels
```

The imported image should not automatically replace existing artwork.

## Import Position

Initial default:

```text
Top-left aligned
```

Future options:

- Center
- Custom position
- Cursor position
- Drag-and-drop placement

## Drag and Drop

Future support should allow dropping image files directly onto the workspace.

## Clipboard Import

Future functionality may support pasting image data from the system clipboard.

## Clipboard Export

Future functionality may support copying artwork directly to the system clipboard.

---

# 46. Pixel Integrity for Import / Export

Import and export operations must never unintentionally:

- Blur pixels
- Smooth edges
- Change colors
- Remove transparency
- Add anti-aliasing
- Change dimensions
- Incorrectly alter alpha

The editor should treat imported pixel data as authoritative.

---

# 47. Project File vs Image File

Obsipix should clearly distinguish:

## Image Format

```text
PNG
```

Contains rendered artwork.

## Project Format

```text
.obsipix
```

Contains editable project information.

Example:

```text
                     Obsipix
                        │
              ┌─────────┴─────────┐
              │                   │
       .obsipix Project           PNG
              │                   │
       Editable artwork      Final artwork
              │                   │
     Layers / animation       Game / website
     palette / metadata       / sharing
```

The project format must be designed so future editor features can be added without invalidating existing projects.

---

# 48. Version 1 Success Criteria

A user should be able to:

1. Open Obsipix in a modern browser.
2. Create a 32×32 canvas.
3. Draw pixel art with zero noticeable lag.
4. Use multiple layers.
5. Select and edit colors precisely.
6. Use a palette.
7. Zoom to at least 1600%.
8. Undo mistakes instantly.
9. Erase pixels cleanly to transparency.
10. Export a transparent PNG.
11. Create animation frames.
12. Duplicate and reorder frames.
13. Use onion skinning.
14. Preview an animation.
15. Save the complete editable project as an `.obsipix` file.
16. Reopen the `.obsipix` project without losing layers or animation data.

---

# 49. Deferred Design Areas

The following will be designed separately:

- Menu architecture
- Advanced selection tools
- Advanced shapes
- Advanced fill behavior
- Advanced canvas navigation
- Multiple named animations
- Advanced timeline UI
- Sprite-sheet workflow
- Tilesets
- Advanced image transformations
- Project file implementation details
- Local saving implementation
- Auto-save
- User accounts / Login
- Cloud saving
- Sharing
- Collaboration
- Settings
- Themes
- Desktop / PWA version
- Monetization
- Game-engine integrations
- Advanced export metadata

---

# 50. Core Architectural Principles Established

The following decisions should be treated as foundational unless deliberately revisited:

1. **Obsipix is web-first.**
2. **Logical pixels are the source of truth.**
3. **Rendering must remain pixel-perfect.**
4. **Save and Export are separate concepts.**
5. **`.obsipix` is the editable project format.**
6. **PNG is the primary external image format.**
7. **Layers are fundamental to the document model.**
8. **Animation uses Frames and Cels rather than treating each frame as an unrelated image.**
9. **Linked Cels are supported conceptually to share pixel data.**
10. **Empty Cels and Holds / Exposures are distinct concepts.**
11. **The canvas always displays the currently selected frame.**
12. **Animation data belongs inside the `.obsipix` project.**
13. **Import/export must preserve exact pixel and alpha data.**
14. **Editor state should be serializable so future saving features do not require a redesign.**
15. **Advanced features should extend the architecture rather than replace the core editor model.**
# 56. Document Lifecycle & Project Files

Obsipix should treat the active document and the project file on disk as two related but distinct things.

The document exists in memory while the user works.

The `.obsipix` file is the persistent representation stored on the user's device.

```text
                    OBSIPIX
                       │
                 Active Document
                       │
          ┌────────────┼────────────┐
          │            │            │
       Canvas        Layers      Animation
          │            │            │
          └────────────┼────────────┘
                       │
                  .obsipix file
```

## 56.1 New Document

**File → New** opens the New Document dialog.

Initial presets:

```text
16 × 16
32 × 32
48 × 48
64 × 64
128 × 128
Custom
```

The dialog should allow the user to configure:

- Width
- Height
- Background
- Pixel aspect ratio

The default background is transparent.

## 56.2 New Document Defaults

Every new document should initially contain:

```text
Canvas
32 × 32

Layer
Layer 1

Background
Transparent

Foreground
Black

Background Color
White

Animation
Frame 1
```

The user can immediately begin drawing.

## 56.3 Unsaved Document

A newly created document has no filename yet.

Example:

```text
Untitled-1
```

The UI may indicate unsaved changes with an asterisk:

```text
Untitled-1 *
```

## 56.4 Modified State

Obsipix must track whether the document has changed since the last save.

Examples of changes:

- Drawing
- Erasing
- Layer changes
- Palette changes
- Frame changes
- Animation changes
- Transformations
- Document resizing

A modified document should be clearly indicated.

## 56.5 Save

**File → Save** or `Ctrl+S`.

If the document already has a filename, save directly to that `.obsipix` project.

If it has never been saved, `Ctrl+S` opens the Save As workflow.

## 56.6 Save As

**File → Save As...**

allows the user to choose:

- Filename
- Location

The project extension should be:

```text
.obsipix
```

The application should normally add the extension automatically.

## 56.7 Open

**File → Open...** should initially support:

```text
.obsipix
.png
```

Opening an `.obsipix` restores the editable project.

Opening a PNG creates a new document from the image.

## 56.8 Open vs Import

These operations must remain distinct.

### Open

Creates a new document.

```text
File → Open
```

### Import

Adds artwork into the current document.

```text
File → Import → Image
```

Importing an image should normally create a new layer or cel rather than replacing the current document.

## 56.9 Close and Unsaved Changes

If a document has unsaved changes, closing it should display:

```text
Save changes?

[ Don't Save ] [ Cancel ] [ Save ]
```

The same protection should apply when:

- Creating a new document
- Opening another project
- Closing the application/page where browser capabilities permit

## 56.10 Browser Leave Protection

Because Obsipix is browser-based, it should attempt to warn users before leaving the page with unsaved changes.

Browser restrictions may limit the exact wording.

## 56.11 Auto-Save / Recovery

Obsipix should provide automatic recovery protection.

Auto-save should not silently overwrite the user's `.obsipix` file.

Instead:

```text
Active Document
      ↓
Auto-Save
      ↓
Temporary Recovery Data
```

This protects against:

- Browser crashes
- Computer crashes
- Accidental tab closure
- Power failures
- Browser refreshes

Auto-save should occur only when the document has changed.

An initial target is approximately every 30 seconds, subject to refinement during implementation.

## 56.12 Recovery

When Obsipix starts and recovery data exists:

```text
Recovered Project

Obsipix found an unsaved project
from your previous session.

[ Recover ] [ Discard ]
```

The user must always have control over recovery data.

## 56.13 Recent Files

**File → Open Recent** should display recently opened projects.

Potential information:

- Filename
- Location
- Last opened date
- Thumbnail

The user should eventually be able to clear recent files.

## 56.14 Project Thumbnail

An `.obsipix` project should eventually contain or generate a thumbnail for file navigation.

The thumbnail is for navigation only and is not part of the artwork.

## 56.15 Project Metadata

The project may contain:

```text
Project
├── Format Version
├── Project Name
├── Created
├── Modified
└── Application Version
```

Unnecessary personal information should not be stored.

## 56.16 Browser Storage

Because Obsipix is web-first, browser-local storage should eventually support temporary project and application data.

Potential technology:

```text
IndexedDB
```

Potential uses:

- Recovery data
- Recent files
- Preferences
- Local project copies
- Palettes
- Shortcut configurations

The exact storage implementation will be decided during technical architecture.

## 56.17 Local File Access

Modern browsers can provide access to local files through browser APIs where supported.

Obsipix should use those capabilities where appropriate while maintaining a fallback workflow for browsers that do not support them.

The application must never assume unrestricted filesystem access.

## 56.18 Project Security

`.obsipix` files must be treated strictly as data.

Project files must never execute arbitrary code.

The format must not contain executable scripts.

## 56.19 Save State Indicators

The UI should communicate project state.

Examples:

```text
Character.obsipix
```

Saved.

```text
Character.obsipix *
```

Modified.

```text
Character.obsipix
Saving...
```

Saving.

## 56.20 Save Errors

If saving fails, the application must clearly inform the user.

```text
Unable to save project.

[ Try Again ] [ Save As... ]
```

Obsipix must never silently discard unsaved changes.

## 56.21 Corrupt / Invalid Project

If a project cannot be opened:

```text
Unable to open project.

The file may be corrupted or created by
an unsupported version of Obsipix.
```

Future versions may provide recovery tools.

## 56.22 Document Lifecycle

The normal workflow is:

```text
New
 ↓
Untitled Document
 ↓
Edit
 ↓
Modified
 ↓
Save
 ↓
MyProject.obsipix
 ↓
Edit
 ↓
Modified
 ↓
Save
```

Export remains separate:

```text
MyProject.obsipix
       ↓
Export
       ↓
MyProject.png
```

---

# 57. `.obsipix` Project File Format

The `.obsipix` project file must contain everything necessary to reopen an editable project without losing information.

The exact physical serialization format will be decided later.

The logical project model should be independent from the serialization method.

## 57.1 Project Structure

Conceptually:

```text
MyCharacter.obsipix
│
├── Project Metadata
├── Document
│   ├── Canvas
│   ├── Color Mode
│   └── Background
├── Layers
├── Pixel Data
├── Palettes
├── Animation
│   ├── Frames
│   ├── Cels
│   ├── Links
│   ├── Durations
│   └── Tags
└── Future Data
```

## 57.2 Document Properties

The project must store:

- Width
- Height
- Color mode
- Pixel aspect ratio
- Relevant background settings

RGBA is the initial default color model.

## 57.3 Pixel Data

Pixel data is the source of truth for artwork.

Each logical pixel conceptually contains:

```text
R
G
B
A
```

The final file format should not necessarily store each pixel as four text values.

The storage layer should eventually support efficient binary representation and compression.

Potential techniques include:

- Raw pixel buffers
- Compression
- Tile/chunk storage
- Deduplication
- Shared pixel data for linked cels

## 57.4 Layers

Each layer should contain:

```text
Layer
├── ID
├── Name
├── Visibility
├── Locked
├── Opacity
├── Position
├── Blend Mode
└── Content
```

The project must preserve exact layer order.

## 57.5 Layer IDs

Every layer should have a unique internal ID.

Layer names are not sufficient for internal identification because users can rename layers.

Layer IDs are particularly important for animation cels.

## 57.6 Layer Groups

Layer groups are not required for the initial implementation.

The project format should leave room for hierarchical groups in the future.

## 57.7 Palettes

The project must store project palettes.

Each palette should contain:

```text
Palette
├── ID
├── Name
├── Colors
└── Order
```

Each palette color may contain:

```text
Color
├── ID
├── RGBA
└── Optional Name
```

## 57.8 Palette Independence

Normal RGBA artwork stores actual pixel colors.

Changing a normal palette must not automatically change existing artwork.

Indexed-color functionality may introduce a deliberate palette-to-pixel relationship later.

## 57.9 Animation

Animation is stored inside the `.obsipix` project.

The animation model uses:

- Frames
- Cels
- Linked Cels
- Holds / Exposures
- Frame Durations
- Playback Settings
- Onion Skin Settings
- Animation Tags

## 57.10 Frames

Each frame should have:

```text
Frame
├── ID
├── Order
├── Duration
└── Layer Cels
```

The frame's timeline position determines its order.

## 57.11 Cels

A cel connects a layer to a frame.

Conceptually:

```text
Cel
├── Frame ID
├── Layer ID
├── Content Reference
├── Position
└── Type
```

Possible types:

```text
Normal
Empty
Hold
Linked
```

## 57.12 Normal Cel

A normal cel contains its own pixel data.

Editing it affects only that cel.

## 57.13 Empty Cel

An empty cel contains no visible pixel data.

The layer contributes nothing to the composite for that frame.

## 57.14 Hold / Exposure

A hold continues displaying a previous cel without unnecessarily duplicating pixel data.

Example:

```text
Frame 1 → Cel A
Frame 2 → Hold A
Frame 3 → Hold A
Frame 4 → Cel B
```

## 57.15 Linked Cels

Multiple cels may intentionally reference shared pixel data.

Editing shared data affects every linked cel that references it.

The project format must preserve those relationships.

## 57.16 Make Cel Unique

When a linked cel needs independent editing:

```text
Frame 1 → Cel A
Frame 2 → Cel A

Make Frame 2 Unique

Frame 1 → Cel A
Frame 2 → Cel B
```

Cel B initially contains identical pixels.

## 57.17 Pixel Data Deduplication

The storage system should eventually allow identical pixel data to be stored once and referenced by multiple cels.

This is especially valuable for animation.

## 57.18 Frame Duration

Each frame can store its own duration.

Example:

```text
Frame 1 → 100 ms
Frame 2 → 100 ms
Frame 3 → 300 ms
Frame 4 → 100 ms
```

A default FPS can also be stored.

## 57.19 Animation Tags

Animation tags should be stored as project data.

```text
Tag
├── ID
├── Name
├── Start Frame
├── End Frame
├── Playback Direction
└── Optional Settings
```

## 57.20 Playback Settings

The project can store animation playback settings such as:

```text
Playback
├── Default FPS
├── Loop Mode
└── Preview Settings
```

Possible loop modes:

```text
Loop
Play Once
Ping-Pong
```

Ping-Pong may remain a future feature.

## 57.21 Onion Skin Settings

Project-level onion skin settings may include:

```text
Onion Skin
├── Enabled
├── Previous Frames
├── Next Frames
└── Opacity
```

We may later separate project artwork settings from personal editor preferences.

## 57.22 Selection State

The current selection does not need to be permanently stored in the initial project format.

The selection is primarily editor state.

Future saved selections can be added explicitly if needed.

## 57.23 Viewport State

The project does not need to store:

- Zoom
- Pan position
- Panel arrangement
- Timeline height
- UI layout

These are editor/user preferences.

## 57.24 Active Layer and Frame

The project may optionally remember:

- Active layer
- Active frame

This is a convenience and not essential artwork data.

## 57.25 History

The complete Undo/Redo history should not be stored in the `.obsipix` file.

The project stores the current editable state.

Undo history belongs to the current editing session.

## 57.26 Embedded Resources

Future project versions may support additional resources such as:

```text
.obsipix
├── Artwork
├── Palettes
├── Animation
├── Audio
├── References
└── Metadata
```

These should be introduced only when required by a defined feature.

## 57.27 File Integrity

The project format should provide mechanisms to detect corruption.

Potential mechanisms:

- Format version
- Data lengths
- Checksums
- Validation information

The exact implementation will be decided later.

## 57.28 Safe Saving

Saving should ideally avoid destroying the existing project if something goes wrong.

Conceptually:

```text
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

## 57.29 Project Migration

When a newer Obsipix version opens an older project:

```text
Old .obsipix
      ↓
Read format version
      ↓
Migration
      ↓
Current internal document
```

The migration layer should remain separate from the editor engine.

## 57.30 Future Compatibility

Where possible, optional unknown data should be safely ignored rather than causing the entire project to become unreadable.

## 57.31 Project File Security

`.obsipix` files must be treated strictly as data and must never execute arbitrary code.

## 57.32 Conceptual Project Model

```text
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

## 57.33 Project File Guarantee

When a user saves and later reopens an `.obsipix` project, Obsipix must preserve:

- Exact canvas dimensions
- Exact pixel colors
- Exact transparency
- Layer structure
- Layer order
- Layer names
- Layer visibility
- Layer opacity
- Layer positions
- Palettes
- Animation frames
- Cels
- Empty cels
- Holds
- Linked cels
- Frame durations
- Animation tags
- Relevant project settings

The user should feel that closing and reopening the project loses nothing.

---

# 58. Core Architectural Principles Established

The following decisions should be treated as foundational unless deliberately revisited:

1. **Obsipix is web-first.**
2. **Logical pixels are the source of truth.**
3. **Rendering must remain pixel-perfect.**
4. **Save and Export are separate concepts.**
5. **`.obsipix` is the editable project format.**
6. **PNG is the primary external image format.**
7. **Layers are fundamental to the document model.**
8. **Animation uses Frames and Cels rather than treating each frame as an unrelated image.**
9. **Linked Cels are supported conceptually to share pixel data.**
10. **Empty Cels and Holds / Exposures are distinct concepts.**
11. **The canvas always displays the currently selected frame.**
12. **Animation data belongs inside the `.obsipix` project.**
13. **Import/export must preserve exact pixel and alpha data.**
14. **Editor state should be serializable so future saving features do not require a redesign.**
15. **Advanced features should extend the architecture rather than replace the core editor model.**
16. **The `.obsipix` project is the source of truth for editable artwork.**
17. **PNG and other export formats are derived outputs.**
18. **The logical project model must remain independent from the physical file serialization format.**
19. **Project files must be versioned and support migration.**
20. **Undo/Redo history belongs to the editing session and is not stored in the project file.**
21. **The project format must support efficient pixel storage, shared cels, holds, and future deduplication.**
# 82. Testing / Quality Architecture

Obsipix must be reliable before it is considered production-ready. Pixel editors require especially strong testing because a small defect can silently alter pixels, alpha, layers, animation frames, or an entire project.

## 82.1 Testing Philosophy

Obsipix testing uses multiple levels:

- Unit tests
- Pixel-level tests
- Engine tests
- Integration tests
- Browser/E2E tests
- Performance tests
- Regression tests

The core principle is:

> If Obsipix claims an operation is pixel-perfect, the test suite should be able to prove it.

## 82.2 Testing Priorities

Highest priority:

1. Pixel data
2. Document Model
3. Undo/Redo
4. `.obsipix` save/load
5. Tools
6. Layers
7. Animation/Cels
8. Selection
9. Transformations
10. PNG Import/Export
11. Renderer
12. Input
13. UI

## 82.3 Unit and Pixel-Level Tests

Core algorithms must be independently testable, including:

- Color conversion
- Coordinate conversion
- Flood fill
- Pixel line algorithms
- Rectangle algorithms
- Ellipse algorithms
- Selection operations
- Palette operations
- Document validation

Deterministic pixel operations should use expected RGBA buffers and byte-for-byte comparison.

Transparent pixels must explicitly test `RGBA(0,0,0,0)`. The checkerboard is renderer-only and must never become pixel data.

## 82.4 Tool Tests

Pencil, Eraser, Eyedropper, Fill, Line, Rectangle, Ellipse, Selection, Move, and Transform tools should test:

- Input
- Preview
- Commit
- Cancel
- Selection interaction
- Layer interaction
- History integration

Continuous strokes must create one history entry rather than one entry per pointer event.

Fast pointer movement must not create gaps in strokes.

## 82.5 Layer and Selection Tests

Layer tests cover:

- Create/delete
- Duplicate
- Rename
- Reorder
- Visibility
- Lock
- Opacity
- Merge
- Flatten
- Clear
- Layer isolation
- Compositing

Selection tests cover:

- Replace
- Add
- Subtract
- Intersect
- Invert
- Select All
- Deselect
- Rectangle
- Lasso
- Selection mask
- Drawing/fill constrained by selection
- Move selected pixels

Selection changes are generally editor state. Artwork modifications remain history operations.

## 82.6 Transform Tests

Test:

- Move
- Flip horizontal/vertical
- Rotate 90 CW/CCW
- Rotate 180
- Integer scaling
- Image resize
- Canvas resize
- Selection/layer transforms

Rotation tests must verify both pixel positions and document dimensions.

Transform previews must not modify the Document until committed.

## 82.7 Animation Tests

Test:

- Frame order
- Frame duration
- Cel references
- Normal/Empty/Hold/Linked cels
- Linked cel uniqueness
- Tags
- Playback
- Onion skin
- Timeline operations

The Cel Resolver requires dedicated tests for each cel type.

Playback must not modify Document data.

## 82.8 Color, Palette and Clipboard Tests

Color tests cover:

- RGB
- HSV
- HSL
- Gray
- HEX
- Alpha
- Foreground/background
- Swap/reset
- Recent colors
- Color equality
- Eyedropper Pick and Sample modes

HEX formats `#RGB`, `#RGBA`, `#RRGGBB`, and `#RRGGBBAA` must be tested. Invalid values must not corrupt the current color.

Palette tests cover adding, editing, removing, reordering, switching, importing, exporting, and palette independence from normal RGBA artwork.

Clipboard tests cover copy, cut, paste, cancellation, transparency, irregular selections, and cross-document transfer.

## 82.9 Undo/Redo and Dirty-State Tests

Every Command should have Execute, Undo, and Redo tests.

A command sequence must restore the exact original state after undo and exact modified state after redo.

Transactions must appear as one user-visible history entry.

Dirty-state tests must verify:

- Save → clean
- Edit → dirty
- Undo to saved state → clean
- Edits made while a save is in progress remain dirty if they are newer than the saved version

Undo/Redo history is session state and is not stored in `.obsipix`.

## 82.10 `.obsipix` and PNG Tests

Round-trip testing:

`Create → Save → Close → Open → Compare`

must verify:

- Dimensions
- Pixels
- Alpha
- Layers
- Layer order/properties
- Palettes
- Frames
- Cels
- Durations
- Tags
- Animation settings
- Required metadata

Repeated serialize/deserialize cycles must not introduce changes.

Migration tests must cover supported older versions.

Corrupt, truncated, invalid, unsupported, and maliciously structured files must fail safely without crashing or silently modifying data.

PNG Import/Export tests must verify exact dimensions, pixels, alpha, compositing, current-frame behavior, and exclusion of editor overlays.

## 82.11 Renderer and Input Tests

Renderer tests cover:

- Pixel placement
- Zoom
- Pan
- Transparency
- Grid
- Pixel Grid
- Layer compositing
- Opacity
- Animation
- Onion skin
- Selection overlays
- Tool previews

Editor rendering and exported artwork must remain separate. UI overlays never export.

Input tests cover mouse, stylus, touch, keyboard, wheel, middle mouse, right mouse, modifiers, pointer capture, focus, and shortcut contexts.

## 82.12 Browser and End-to-End Tests

Initial browser targets:

- Chrome/Chromium
- Edge
- Firefox
- Safari

E2E tests should simulate complete workflows such as:

`New Document → Draw → Layers → Animate → Save → Reload → Verify → Export`

Recovery workflows should also be tested.

Browser differences must never change logical pixel data.

## 82.13 Performance and Stress Testing

Measure:

- Startup time
- Brush latency
- Frame rate
- Undo/Redo time
- Save/Open time
- Export time
- Memory usage
- Timeline playback performance

Targets remain approximately 60 FPS for normal editing workloads and roughly 8 ms brush latency where practical.

Stress testing should include realistic larger documents, many layers, many animation frames, large selections, and long editing sessions.

Memory testing must look for unreleased buffers, detached canvases, growing caches, and other leaks.

## 82.14 Regression Testing

Every significant bug should become a permanent regression test.

Randomized/fuzz testing should eventually be used for:

- Document generation
- `.obsipix` serialization
- Command sequences
- Undo/Redo

Random tests must use reproducible seeds.

## 82.15 Continuous Integration and Quality Gates

Once hosted in GitHub, CI should automatically run:

- Type checking
- Linting
- Unit tests
- Engine tests
- Integration tests
- Build validation
- E2E tests where appropriate

Critical data-loss, corruption, crash, save, or export failures block release.

## 82.16 Test Fixtures and Utilities

Maintain permanent fixtures such as:

- Empty projects
- Transparency projects
- Layer projects
- Animation projects
- Linked-cel projects
- Palette projects
- Large projects
- Corrupt projects
- PNG fixtures

Shared test helpers should support creating documents, setting/getting pixels, comparing pixel buffers, comparing Documents, creating selections, frames, layers, and palettes.

## 82.17 Core Quality Rules

1. Testing is part of the architecture.
2. Pixel data receives the highest testing priority.
3. Core engine code must be independently testable.
4. Commands, tools, serialization, and rendering must be testable independently.
5. Exact pixel operations use byte-for-byte comparison.
6. Transparency must be tested explicitly.
7. Undo and Redo must restore exact states.
8. Save/load round trips must be exact.
9. Import/export must preserve pixels and alpha.
10. Animation and cel resolution require dedicated tests.
11. Corrupt files must fail safely.
12. Significant bugs become regression tests.
13. Performance is measured using realistic workloads.
14. CI quality gates protect production releases.
15. Test coverage percentage never replaces meaningful correctness tests.


---

# 83. Security / Browser Safety / Data Integrity

Obsipix is a browser-based editor and must treat all external files, browser APIs, clipboard content, and persisted data as untrusted boundaries.

## 83.1 Core Security Boundary

The basic rule is:

```text
External World
      ↓
Validation
      ↓
Sanitization
      ↓
Resource Limits
      ↓
Editor Engine
```

Nothing external should receive direct access to the internal Document Model.

## 83.2 Browser Sandbox

Obsipix must operate within normal browser security boundaries.

The application must not assume unrestricted:

- Filesystem access
- Network access
- Clipboard access
- Browser storage
- DOM access

Browser APIs must be accessed through controlled adapters/services.

## 83.3 `.obsipix` Security

`.obsipix` files are data only.

They must never:

- Execute arbitrary code
- Execute embedded scripts
- Automatically load executable content
- Bypass validation

A project file must not be treated as trusted merely because it uses the `.obsipix` extension.

## 83.4 Input Validation

All external input must be validated before entering the editor engine.

This includes:

- `.obsipix` files
- PNG files
- Clipboard data
- Imported resources
- User-provided filenames
- Project metadata

## 83.5 Document Validation

The Document Model must maintain valid invariants.

Validation should cover:

- Dimensions
- Pixel buffer sizes
- Layer references
- Cel references
- Frame references
- Linked-cel relationships
- Opacity
- Positions
- Animation durations
- Palette data

## 83.6 Resource Limits

External data must be checked before expensive allocations.

Potential limits include:

- Maximum canvas dimensions
- Maximum pixel count
- Maximum layer count
- Maximum frame count
- Maximum file size
- Maximum memory allocation
- Maximum imported resource size

Exact limits will be selected during implementation.

## 83.7 Malformed Project Handling

Invalid, corrupt, truncated, or maliciously structured projects must fail safely.

The current document must remain untouched if loading fails.

## 83.8 Safe Save

Saving should use a protected workflow:

```text
Current Document
      ↓
Stable Snapshot
      ↓
Serialize
      ↓
Validate
      ↓
Temporary Write
      ↓
Verify
      ↓
Replace Destination
```

The existing project specification already establishes temporary-write/validate/replace as the preferred safe-save concept.

## 83.9 Recovery Security

Recovery data must be treated as untrusted persistent data and validated before restoration.

Recovery must never silently overwrite the user's actual project.

## 83.10 Clipboard Security

Clipboard content must pass through a controlled service.

Imported clipboard data must be validated before entering the Document.

## 83.11 PNG Import Security

PNG files must be validated before large memory allocations or document creation.

Malformed image data must produce a controlled error rather than a browser crash where practical.

## 83.12 Filename and Metadata Safety

User-provided names and metadata must be treated as data.

They must not be inserted into HTML or other executable contexts without appropriate handling.

## 83.13 Current Document Isolation

Opening or importing external data must not partially modify the active Document.

The preferred model is:

```text
External Data
      ↓
Parse
      ↓
Validate
      ↓
Construct
      ↓
Commit
```

## 83.14 Transactional Safety

Document-changing operations must be atomic where practical.

If an operation fails, the Document should remain in its previous valid state.

## 83.15 Failure Isolation

Failures in the renderer, tools, animation system, import/export system, or UI must not corrupt the Document.

## 83.16 Logging and Privacy

Diagnostics should avoid unnecessary personal information.

Logs should contain technical information useful for troubleshooting without collecting unrelated user data.

## 83.17 V1 Security Gate

Before V1:

1. External files are validated.
2. Resource limits exist.
3. Corrupt files fail safely.
4. `.obsipix` files contain data only.
5. Browser APIs are isolated behind controlled boundaries.
6. Safe save is implemented.
7. Failed operations cannot partially corrupt the Document.
8. Recovery data is validated.
9. Clipboard/import data is validated.
10. Security-critical failures are covered by tests.

---

# 84. Accessibility Architecture

Accessibility belongs primarily to the UI/application layer and must not compromise the pixel-editor workflow.

## 84.1 Principles

Obsipix should support:

- Keyboard navigation
- Visible focus
- Clear labels
- Non-color indicators
- Accessible dialogs
- Screen-reader-friendly controls
- Reduced-motion preferences
- UI scaling

## 84.2 Keyboard Accessibility

All important UI functions should be reachable without requiring a mouse.

Keyboard shortcuts remain separate from UI navigation.

## 84.3 Focus Management

Dialogs, menus, panels, and controls must manage focus predictably.

Opening a modal should place focus appropriately.

Closing it should return focus to a sensible control.

## 84.4 Canvas Accessibility

The canvas is inherently visual, but surrounding controls must expose its state where practical.

Examples:

- Current tool
- Canvas dimensions
- Zoom
- Active layer
- Current frame
- Selection status

## 84.5 Color Accessibility

Important information must not rely only on color.

Examples:

- Active layer should have more than a color highlight.
- Selected palette color should have a visible indicator.
- Errors should not be communicated only through red.

## 84.6 Numeric Color Controls

RGB, HSV, HSL, alpha, and HEX controls should expose labels and values clearly.

## 84.7 Layers and Timeline

Layer and timeline controls should provide accessible names and keyboard interaction.

Users should be able to:

- Navigate layers
- Change active layer
- Navigate frames
- Create/delete frames
- Adjust relevant settings

## 84.8 Dialogs

Dialogs must have:

- Clear titles
- Predictable focus
- Keyboard confirmation
- Escape cancellation where appropriate
- Accessible button labels

## 84.9 Reduced Motion

Animations in the UI should respect reduced-motion preferences where practical.

This does not disable actual pixel-art animation playback unless the user explicitly chooses to stop playback.

## 84.10 V1 Accessibility Gate

The V1 UI must provide:

- Keyboard access to core workflows
- Visible focus
- Accessible dialog behavior
- Labels for important controls
- Non-color state indicators
- Reduced-motion support where practical
- Accessible error and status feedback

---

# 85. Internationalization / Localization Architecture

Obsipix V1 may ship in English, but the UI architecture should remain localization-ready.

## 85.1 Localization Boundary

Localization belongs in the UI/application layer.

The Document Model must not depend on a particular language.

## 85.2 Translation Keys

UI text should conceptually use stable translation keys.

Example:

```text
menu.file.save
tool.pencil.name
dialog.save.title
error.project.invalid
```

## 85.3 Default Language

English is the initial language.

Future language selection can use:

- Browser language
- User preference
- Explicit application setting

## 85.4 Fallback

If a translation is missing:

```text
Requested Language
      ↓
Missing Translation
      ↓
English Fallback
```

The UI should remain usable.

## 85.5 Keyboard Shortcuts

Shortcut identifiers must not depend on translated labels.

For example:

```text
tool.pencil
```

is preferable to using the displayed word "Pencil" as the shortcut identity.

## 85.6 Dynamic Text

The localization system should eventually support:

- Pluralization
- Number formatting
- Date formatting
- Variable insertion

## 85.7 User-Created Names

User-created project, layer, palette, frame, and tag names are user data.

Obsipix must not automatically translate them.

## 85.8 Layout

The UI should tolerate longer translated strings.

Future support may include right-to-left languages.

## 85.9 V1 Localization Gate

V1 may remain English-only, but:

- UI text is separated from logic.
- Translation keys can be introduced later.
- Shortcuts do not depend on translated labels.
- User data is never automatically translated.
- Layout does not assume every label has the same length.

---

# 86. Error Handling / Logging / Diagnostics Architecture

Errors must be handled consistently and must never leave the Document in an invalid state.

## 86.1 Error Principles

Errors should be:

- Structured
- Actionable
- Safe
- Recoverable where possible
- Understandable to users

## 86.2 Error Categories

Potential categories:

```text
Validation
File I/O
Serialization
Import
Export
Storage
Renderer
Tool
Animation
Resource
Browser
Internal
```

## 86.3 Stable Error Codes

Errors should have stable identifiers.

Example:

```text
PROJECT_INVALID
PROJECT_UNSUPPORTED_VERSION
SAVE_FAILED
EXPORT_FAILED
RESOURCE_LIMIT
IMPORT_FAILED
```

## 86.4 User vs Technical Errors

Technical diagnostics should remain separate from user-facing wording.

Example:

```text
Technical:
PROJECT_CEL_REFERENCE_INVALID

User:
Unable to open project because the animation data is invalid.
```

## 86.5 Error Severity

Conceptual levels:

- Info
- Warning
- Error
- Critical

## 86.6 Transactional Error Behavior

A failed document operation must not leave partial changes.

```text
Attempt
 ↓
Failure
 ↓
Rollback
```

## 86.7 Save Errors

Save failure must:

- Preserve the current Document.
- Preserve dirty state.
- Inform the user.
- Offer retry or Save As where appropriate.

## 86.8 Import / Load Errors

Failed imports and loads must not replace the current document with incomplete data.

## 86.9 Renderer Errors

Renderer failures should be isolated from Document state.

The system should log the failure and attempt a safe recovery where practical.

## 86.10 Global Error Boundary

The application should have a top-level UI error boundary so that one UI component failure does not necessarily destroy the entire editor session.

## 86.11 Logging

Logging should support levels appropriate to development and production.

Potential levels:

```text
Debug
Info
Warn
Error
```

## 86.12 Diagnostics

Development diagnostics should help identify:

- Current document revision
- Active tool
- Active layer/frame
- Renderer state
- Memory/cache information
- Recent commands
- Recent errors

## 86.13 Privacy

Diagnostics must avoid unnecessary personal information.

## 86.14 V1 Error Gate

Critical failures must:

1. Preserve document data.
2. Produce a structured error.
3. Provide meaningful user feedback.
4. Be logged appropriately.
5. Avoid exposing sensitive technical information unnecessarily.
6. Be covered by tests.

---

# 87. Performance / Optimization Architecture

Performance is a core part of Obsipix because drawing must feel immediate while preserving exact pixel behavior.

## 87.1 Performance Targets

Initial targets remain:

| Metric | Target |
|---|---|
| Initial load | Under 2 seconds where practical |
| Brush latency | Under 8 ms target |
| Normal rendering | 60 FPS target |
| Zoom | Immediate where practical |
| Undo/Redo | Immediate where practical |
| Timeline playback | Responsive |

## 87.2 Performance Principles

1. Interactive responsiveness is more important than theoretical maximum throughput.
2. Logical pixel data remains authoritative.
3. Rendering may use caches and optimized buffers.
4. Optimizations must never alter pixel accuracy.
5. Performance must be measured using realistic workloads.

## 87.3 Rendering Optimization

Potential techniques:

- Dirty regions
- Layer compositing caches
- Offscreen buffers
- Efficient pixel buffers
- Zoom-aware rendering
- Cached thumbnails

## 87.4 Brush Performance

Pointer processing should avoid unnecessary allocations.

Continuous strokes should interpolate between input points so fast pointer movement does not create gaps.

## 87.5 UI vs Canvas Rendering

The application UI and pixel canvas should remain separate performance domains.

A pixel edit should not unnecessarily rerender unrelated UI components.

## 87.6 Animation Performance

Animation must account for:

- Many frames
- Many layers
- Linked cels
- Holds
- Onion skin
- Playback

Linked cels and holds should avoid unnecessary duplicate pixel work.

## 87.7 Undo Memory

History can consume substantial memory.

The architecture should support:

- Change sets
- Snapshots
- Compression
- Memory estimation
- Configurable limits

Correctness remains more important than maximum compression.

## 87.8 Selection Performance

Selection masks should use efficient representations appropriate to document size.

## 87.9 Large Documents

The renderer should not assume all projects are tiny.

Potential future strategies:

- Tiled buffers
- Dirty-region rendering
- Chunked compositing
- Worker-based processing

## 87.10 Save / Load Performance

Normal save/load should remain responsive.

Large operations may eventually use workers where appropriate.

## 87.11 Profiling

Performance decisions should be based on measurements.

Potential metrics:

- Pointer-to-pixel latency
- Frame render time
- Composite time
- History operation time
- Serialization time
- Memory usage

## 87.12 Performance Budgets

Major subsystems should eventually have practical performance budgets.

A regression should be investigated when a normal workload exceeds those budgets.

## 87.13 Memory Safety

Long editing sessions should be tested for:

- Growing buffers
- Detached canvases
- Unreleased caches
- Retained event listeners
- History leaks

## 87.14 Performance vs Pixel Accuracy

The priority order is:

```text
Correctness
    ↓
Pixel Accuracy
    ↓
Responsiveness
    ↓
Optimization
```

A faster incorrect editor is not acceptable.

## 87.15 V1 Performance Gate

V1 performance testing must use realistic documents and verify:

- Brush responsiveness
- Rendering frame rate
- Zoom/pan responsiveness
- Undo/redo responsiveness
- Animation playback
- Save/load behavior
- Memory stability

---

# 88. Plugin / Extension Architecture

Plugins are not a V1 feature. This section defines future extension boundaries so the core architecture does not need to be redesigned later.

## 88.1 Purpose

Future extensions could provide:

- Custom tools
- Custom brushes
- Importers
- Exporters
- Palette formats
- Automation
- Custom panels
- Animation utilities

## 88.2 V1 Scope

V1 does not implement:

- Plugin marketplace
- Dynamic plugin loading
- Third-party plugin runtime
- Plugin distribution system
- Plugin payments

## 88.3 Extension Boundary

The future model is:

```text
Plugin
   ↓
Extension API
   ↓
Editor Services
   ↓
Commands / Document APIs
```

Plugins must not directly manipulate internal state.

## 88.4 Tool Extensions

Future tools should integrate through the same command architecture as native tools.

## 88.5 Import / Export Extensions

Future importers/exporters should implement controlled interfaces and return validated document data or external output.

## 88.6 UI Extensions

Future plugins may provide panels, menus, or toolbar items through a controlled UI host.

They should not receive unrestricted DOM or application-state access.

## 88.7 Stable IDs

Extensions should use stable IDs such as:

```text
tool.pencil
command.save
service.document
```

rather than display names.

## 88.8 API Versioning

Future extensions should declare an API version and capabilities.

Unsupported versions must fail gracefully.

## 88.9 Permissions

Future plugins may require explicit capabilities such as:

```text
read.document
write.document
read.files
write.files
clipboard
network
storage
ui.panel
```

No unrestricted access should be assumed.

## 88.10 Extension Data

Plugin-specific project data should remain separate from core project data.

Unknown optional extension data should be safely ignored where possible.

## 88.11 Plugin Failure Isolation

A plugin failure must not corrupt the Document or crash the entire editor.

## 88.12 Plugin History

Plugin operations that modify artwork must use the command/history system so they remain undoable.

## 88.13 V1 Gate

V1 only requires:

- Clear extension boundaries
- Stable conceptual IDs
- Command/service integration points
- API versioning concept
- Security boundary
- No plugin dependency in core functionality

---

# 89. API / Service Boundaries

Obsipix components communicate through defined services and commands rather than direct access to unrelated internal state.

## 89.1 High-Level Architecture

```text
UI
 ↓
Application Layer
 ↓
Commands / Services
 ↓
Document Model
 ↓
Renderer
 ↓
Canvas
```

External boundaries connect through services:

```text
File System
Browser Storage
Clipboard
Importers
Exporters
```

## 89.2 Dependency Direction

The Document Model must not depend on:

- React
- DOM
- Canvas APIs
- IndexedDB
- Browser events
- File dialogs

## 89.3 Document Service

The Document Service coordinates access to the current document and document lifecycle.

## 89.4 Command Service

The Command Service executes document-changing operations and integrates them with transactions and history.

## 89.5 History Service

The History Service manages undo/redo state and document revisions.

## 89.6 Tool Service

The Tool Service manages active tools and tool configuration.

## 89.7 Selection Service

The Selection Service manages the selection mask and selection operations.

## 89.8 Color Service

The Color Service manages foreground/background colors, conversion, recent colors, and color selection state.

## 89.9 Palette Service

The Palette Service manages palette collections and palette interaction.

## 89.10 Animation Service

The Animation Service manages frames, cels, durations, tags, playback state, and animation operations.

## 89.11 Viewport Service

The Viewport Service manages zoom, pan, fit, and viewport-related state.

## 89.12 Renderer Service

The Renderer Service converts authoritative document state into visual output.

## 89.13 File Service

The File Service isolates browser file operations.

## 89.14 Import / Export Services

Importers and exporters operate at external boundaries and must not directly manipulate unrelated application state.

## 89.15 Storage Service

Browser-local persistence such as IndexedDB is accessed through a storage service.

## 89.16 Notification Service

Engine and application systems should request user notifications through a centralized notification service.

## 89.17 Logging Service

Diagnostics should be centralized through a logging service rather than direct console usage throughout the application.

## 89.18 Clipboard Service

Clipboard access belongs behind a service boundary.

## 89.19 Dependency Injection

Core systems should preferably receive dependencies rather than constructing browser-specific services internally.

## 89.20 Testing Benefit

Clear boundaries allow core systems to be tested without launching the complete UI.

For example:

```text
Command → Document
Document → Serializer
Document → Renderer
```

can each be tested independently.

## 89.21 V1 Gate

The architecture must clearly separate:

- UI
- Application
- Commands
- Document
- History
- Tools
- Selection
- Animation
- Renderer
- Storage
- Import/export
- Browser APIs

---

# 90. State Management Architecture

Obsipix state is divided into explicit ownership categories.

## 90.1 State Categories

```text
State
│
├── Document State
├── Application State
├── View State
├── Tool State
├── UI State
└── Transient Interaction State
```

## 90.2 Document State

Document State contains editable project content such as:

- Dimensions
- Layers
- Pixel data
- Palette
- Animation
- Selection
- Relevant project metadata

## 90.3 Application State

Application State coordinates the current editing session.

Examples:

- Active document
- Active editing target
- Dirty state
- Playback state
- Current editing context

## 90.4 View State

View State includes:

- Zoom
- Pan
- Grid visibility
- Checkerboard display
- Onion skin display

## 90.5 Tool State

Tool State contains:

- Active tool
- Brush size
- Brush shape
- Tool-specific settings

Tool settings do not automatically become project history.

## 90.6 UI State

UI State includes:

- Panel visibility
- Dialog state
- Menu state
- Focus
- UI layout

## 90.7 Transient Interaction State

Transient state includes:

- Pointer position
- Active stroke
- Shape preview
- Selection drag
- Transform preview
- Temporary gestures

## 90.8 Single Source of Truth

Every important value must have one authoritative owner.

UI components may read state but should not silently create competing copies of authoritative state.

## 90.9 Derived State

Values that can be calculated from authoritative state should generally not be duplicated.

Examples:

```text
Can Undo?
Visible Layer Count
```

## 90.10 Cached State

Caches are disposable and rebuildable.

Examples:

- Composite caches
- Thumbnail caches
- Renderer buffers

They are never authoritative.

## 90.11 Dirty State

Dirty state should be based on the relationship between the current document revision and the saved revision.

```text
Current Revision == Saved Revision
        ↓
Clean
```

```text
Current Revision != Saved Revision
        ↓
Dirty
```

## 90.12 Playback State

Playback state must remain separate from editable Document mutation.

Displaying frame 5 during playback does not itself modify the Document.

## 90.13 Transform State

Transform previews are transient until committed.

## 90.14 React/UI State

If React is used, React should represent UI/application presentation rather than becoming the authoritative pixel Document.

## 90.15 State Switching

Opening another document should replace the appropriate document state while preserving only session preferences that are intentionally global.

## 90.16 State Invariants

Important invariants include:

1. Active layer references a valid layer.
2. Active frame references a valid frame.
3. Pixel buffers match document dimensions.
4. Selection dimensions match the document.
5. View state cannot modify artwork.
6. UI state cannot directly corrupt document data.
7. Cached state can be discarded and rebuilt.

## 90.17 V1 Gate

State ownership must be explicit for:

- Document
- Application
- View
- Tool
- UI
- Transient interaction

The Document remains the authoritative source of editable artwork.

---

# 91. Event and Messaging Architecture

Events notify systems that something happened. They do not replace commands or state.

## 91.1 Core Distinction

```text
Command
"What should happen?"

State
"What is currently true?"

Event
"What just happened?"
```

## 91.2 Event Flow

```text
Command
   ↓
State Change
   ↓
Event
   ↓
Subscribers
```

## 91.3 Event Bus

Obsipix may use a lightweight application event bus for meaningful state-change notifications.

It must not become a second source of truth.

## 91.4 Event Ownership

Events should originate from the system that owns the relevant state or operation.

## 91.5 Event Naming

Events describe completed actions.

Examples:

```text
document.changed
layer.created
layer.deleted
frame.created
selection.changed
playback.started
playback.stopped
document.save.completed
document.save.failed
```

## 91.6 Event Payloads

Payloads should contain enough information for subscribers to react without exposing mutable internal objects.

Prefer IDs and small immutable values.

## 91.7 Document Events

Potential events:

```text
document.created
document.opened
document.changed
document.closed
document.saved
document.dirty.changed
```

## 91.8 Layer Events

Potential events:

```text
layer.created
layer.deleted
layer.duplicated
layer.renamed
layer.reordered
layer.visibility.changed
layer.lock.changed
layer.opacity.changed
layer.content.changed
layer.active.changed
```

## 91.9 Pixel Change Events

Do not publish an application-wide event for every individual pixel during a stroke.

Use meaningful changes such as:

```text
layer.content.changed
```

with optional dirty-region information.

## 91.10 Selection Events

Examples:

```text
selection.created
selection.changed
selection.cleared
selection.moved
```

## 91.11 Animation Events

Examples:

```text
animation.frame.created
animation.frame.deleted
animation.frame.reordered
animation.duration.changed
animation.cel.changed
animation.cel.linked
animation.cel.unlinked
animation.playback.started
animation.playback.stopped
animation.playback.frame.changed
```

## 91.12 Tool and Color Events

Examples:

```text
tool.changed
tool.settings.changed
foreground.color.changed
background.color.changed
palette.changed
```

## 91.13 View Events

Examples:

```text
viewport.zoom.changed
viewport.changed
viewport.grid.changed
```

## 91.14 Storage Events

Examples:

```text
document.save.started
document.save.completed
document.save.failed
```

Save completion must identify the saved revision/snapshot so newer edits are not accidentally marked clean.

## 91.15 Import / Export Events

Examples:

```text
import.started
import.completed
import.failed
export.started
export.completed
export.failed
```

Export completion does not clear document dirty state.

## 91.16 Error Events

Structured errors may be published through:

```text
error.occurred
warning.occurred
```

## 91.17 High-Frequency Events

High-frequency updates such as pointer movement and playback frame changes should use efficient, lightweight paths and may require batching or coalescing.

## 91.18 Event Ordering

Events should be emitted after relevant state has reached a valid committed state.

## 91.19 Subscriber Isolation

A failing event subscriber must not invalidate the operation that generated the event.

## 91.20 Subscription Lifecycle

Subscriptions must be removable to prevent stale listeners and memory leaks.

## 91.21 Events Are Not History

Events are notifications.

History entries are undoable document changes.

They are different systems.

## 91.22 Events Are Not Persistent Project Data

Events should not be stored in `.obsipix`.

## 91.23 Plugin Events

Future plugins may subscribe only to approved events and capabilities.

## 91.24 V1 Gate

The architecture must provide:

- Command/event separation
- Stable event identifiers
- Controlled payloads
- High-frequency event handling
- Subscriber isolation
- Subscription cleanup
- Save revision awareness
- Plugin-compatible event boundaries

---

# 92. Undo / Redo and Transaction Architecture

Undo and redo operate on committed document changes.

## 92.1 Core Model

```text
User Action
    ↓
Command
    ↓
Transaction
    ↓
Document Change
    ↓
History Entry
```

## 92.2 History Entry

A history entry should conceptually contain:

```text
HistoryEntry
├── ID
├── Command Type
├── Description
├── Document Revision
├── Undo Data
└── Redo Data
```

## 92.3 One User Action = One Logical Entry

Continuous drawing must become one history entry rather than one entry per pointer event.

## 92.4 Transactions

Operations containing multiple internal mutations should be grouped into one logical transaction.

Examples:

- Merge visible layers
- Duplicate layer
- Complex animation operations
- Large transformations

## 92.5 Transaction Lifecycle

```text
Begin
 ↓
Modify
 ↓
Validate
 ↓
Commit
```

or:

```text
Begin
 ↓
Modify
 ↓
Cancel / Failure
 ↓
Rollback
```

## 92.6 Atomicity

A transaction must either succeed completely or leave the previous valid state intact.

## 92.7 Document Revisions

Document revisions provide a stable way to track state changes.

Example:

```text
Revision 10
   ↓
Draw
   ↓
Revision 11
```

## 92.8 Saved Revision

A successful save records the saved revision.

```text
Current Revision = 12
Saved Revision = 12
```

means clean.

## 92.9 Undo Dirty-State Behavior

If undo returns the document to the saved revision, the document becomes clean.

## 92.10 Redo Dirty-State Behavior

Redoing a change beyond the saved revision makes the document dirty again.

## 92.11 New Edit After Undo

A new edit after undo invalidates the previous redo branch.

## 92.12 No-Op Commands

Commands that produce no document change should not create unnecessary history entries.

## 92.13 Failed Commands

Failed commands must not create committed history entries.

## 92.14 Stroke Transactions

A stroke should conceptually use:

```text
Begin Stroke
 ↓
Collect Changes
 ↓
Commit
 ↓
One History Entry
```

Cancelled strokes produce no history entry.

## 92.15 Animation History

Animation operations participate in the same history architecture.

This includes:

- Create frame
- Delete frame
- Duplicate frame
- Reorder frame
- Change duration
- Link cel
- Make unique
- Other meaningful animation changes

## 92.16 Linked Cel History

History must preserve linked-cel relationships, not just pixel content.

## 92.17 Selection History

Selection changes can be restored where treated as undoable editor actions.

## 92.18 Transform History

Transform previews are not history until committed.

Enter commits.

Esc cancels.

## 92.19 Shape History

Live shape previews are not history until the shape is committed.

## 92.20 Fill History

A fill creates one history entry regardless of how many pixels it changes.

Same-color fills create no history entry.

## 92.21 Undo/Redo Failure

Undo and redo must be transactional so a failure cannot leave a partially restored Document.

## 92.22 History Memory

The implementation may use:

- Snapshots
- Change sets
- Hybrid strategies

Correctness is more important than maximum memory compression.

## 92.23 History Limits

The architecture should support a configurable history limit in the future.

## 92.24 History and Save

Save does not create a history entry.

It establishes a saved revision after successful persistence.

## 92.25 History and Export

Export does not create a history entry and does not clear dirty state.

## 92.26 History and Autosave

Autosave does not create a history entry.

## 92.27 History and `.obsipix`

Undo/redo history remains session-only and is not stored in `.obsipix`.

## 92.28 V1 Gate

Before V1:

- Commands create controlled mutations.
- Transactions group logical operations.
- One user action normally becomes one history entry.
- Undo and redo restore exact states.
- No-op operations do not pollute history.
- Failed operations do not create entries.
- New edits after undo clear redo.
- Dirty state is revision-based.
- Save establishes a saved revision.
- History is session-only.

---

# 93. Data Model and Serialization Boundaries

The logical Document Model and physical `.obsipix` representation must remain separate.

## 93.1 Purpose

The editor works with a runtime Document.

The `.obsipix` file stores a persistent representation of that Document.

```text
Document
   ↓
Serialize
   ↓
.obsipix
```

and:

```text
.obsipix
   ↓
Deserialize
   ↓
Document
```

## 93.2 Serialization Boundary

The serializer must explicitly choose which data belongs in the project file.

Runtime objects such as UI state, renderer references, event subscriptions, and DOM objects must not be dumped into the file.

## 93.3 Format Version

Every `.obsipix` file must contain an explicit format version.

## 93.4 Application Version

Application version and file-format version are separate concepts.

## 93.5 Migration

Older files should pass through a migration layer where necessary.

```text
Old File
   ↓
Parser
   ↓
Migration
   ↓
Current Representation
   ↓
Document
```

## 93.6 Unsupported Future Versions

Unsupported versions must fail safely rather than being interpreted by guesswork.

## 93.7 Required vs Optional Data

Required data is necessary to reconstruct the project.

Optional data may be omitted or ignored where safe.

## 93.8 Pixel Data

Serialization must preserve:

- Exact RGBA values
- Transparency
- Dimensions
- Layer association
- Frame/cel association

## 93.9 Linked Cels

Linked cels should preserve shared pixel relationships.

## 93.10 Cel Types

The format must distinguish:

- Normal
- Empty
- Hold
- Linked

## 93.11 Layer Data

The file must preserve:

- Layer IDs
- Layer order
- Names
- Visibility
- Lock state
- Opacity
- Position
- Pixel/cel relationships

## 93.12 Animation Data

The file must preserve:

- Frames
- Cels
- Linked cels
- Holds
- Durations
- Tags
- Playback settings
- Relevant onion-skin settings

## 93.13 Palette Data

Project palettes must be serializable without altering normal RGBA artwork.

## 93.14 Selection and Viewport

Selection and viewport state are not required for the core V1 project guarantee.

## 93.15 History

Undo/redo history is session-only.

## 93.16 Extension Data

Future plugin data should be separated from native project data and should remain optional where possible.

## 93.17 Explicit Serialization

The serializer should use an explicit project representation rather than serializing the entire runtime application.

## 93.18 Validation

Deserialization must validate:

- Structure
- Semantics
- Resource requirements
- Object relationships

## 93.19 Validate Before Allocation

Resource requirements should be checked before dangerous memory allocations wherever practical.

## 93.20 Save Validation

Serialized output should be validated before replacing an existing project.

## 93.21 Stable Save Snapshot

Asynchronous saving should operate on a stable document snapshot/revision.

## 93.22 Round-Trip Guarantee

The required workflow is:

```text
Document A
   ↓
Serialize
   ↓
.obsipix
   ↓
Deserialize
   ↓
Document B
```

The logical project state must remain equivalent.

## 93.23 Exact Pixel Round-Trip

RGBA and transparency must remain exact.

## 93.24 Byte Equality

Byte-for-byte file equality is not required if logical project state remains equivalent.

## 93.25 Compression

If compression is used, project compression must be lossless.

## 93.26 Deduplication

The format should allow efficient shared data and future deduplication.

## 93.27 Security

`.obsipix` remains data-only and must never execute arbitrary code.

## 93.28 V1 Gate

The serialization architecture must guarantee:

- Versioning
- Validation
- Migration
- Exact pixel preservation
- Exact layer preservation
- Exact animation/cel preservation
- Palette preservation
- Safe loading
- Safe saving
- Logical model independence from physical format
- Session-only history

---

# 94. Rendering Architecture

The Renderer converts authoritative Document state into the visual editor display.

## 94.1 Core Rule

> The Renderer displays the Document. It never becomes the source of truth.

## 94.2 Rendering Pipeline

```text
Document
   ↓
Resolve Visible Content
   ↓
Resolve Animation / Cels
   ↓
Composite Layers
   ↓
Apply View Transform
   ↓
Draw Overlays
   ↓
Canvas
```

## 94.3 Logical Pixels

Logical pixel coordinates remain authoritative.

Screen coordinates are derived from:

- Canvas position
- Zoom
- Pan
- Device pixel ratio

## 94.4 Nearest-Neighbor

Rendering must use nearest-neighbor scaling.

No unintended:

- Blurring
- Anti-aliasing
- Smoothing
- Interpolation artifacts

## 94.5 Zoom

The renderer must support the defined viewport range:

```text
25% → 6400%
```

Zoom changes only the display representation.

## 94.6 Zoom-to-Cursor

Zooming should preserve the logical pixel beneath the cursor whenever practical.

## 94.7 Pan

Pan changes View State only.

## 94.8 Checkerboard

The transparency checkerboard is renderer-only.

It is never stored as pixel data.

## 94.9 Grid

The pixel grid is a visual overlay.

It must align with logical pixel boundaries and never modify artwork.

## 94.10 Layer Compositing

Layers are composited bottom-to-top.

Hidden layers are excluded.

Layer opacity is applied during compositing and does not destructively modify stored pixels.

## 94.11 Layer Position

Layer positions are applied during compositing.

## 94.12 Animation Rendering

The renderer resolves the current frame and its cels before compositing.

## 94.13 Cel Resolver

The Cel Resolver must consistently handle:

- Normal
- Empty
- Hold
- Linked

## 94.14 Empty Cel

An Empty Cel displays as transparent content.

## 94.15 Hold

A Hold displays the appropriate previous artwork according to the animation model.

## 94.16 Linked Cel

A Linked Cel resolves to shared pixel data.

## 94.17 Onion Skin

Onion skin is viewport-only.

It must not modify the Document or exported artwork.

## 94.18 Selection Overlay

Selection masks and their visual marching-ants representation remain separate.

## 94.19 Transform Preview

Transform previews are transient rendering state until the transformation is committed.

## 94.20 Shape Preview

Live shapes are transient visual previews until committed.

## 94.21 Render Stack

Conceptually:

```text
Checkerboard
   ↓
Artwork
   ↓
Onion Skin
   ↓
Selection
   ↓
Grid
   ↓
Transform / Shape Preview
   ↓
Cursor / Tool Overlay
```

## 94.22 Artwork vs Overlay

Artwork includes:

- Pixels
- Layers
- Animation

Overlays include:

- Grid
- Selection boundary
- Onion skin
- Transform handles
- Tool cursor
- Shape preview

Overlays never become artwork.

## 94.23 Device Pixel Ratio

The renderer must account for high-density displays while keeping the logical pixel model independent of physical display density.

## 94.24 CSS vs Backing Buffer

The display size and backing buffer size may differ because of device pixel ratio.

Scaling must remain crisp.

## 94.25 Dirty Regions

The renderer should support partial redraw where practical.

Correctness takes priority over partial-render optimization.

## 94.26 Layer Caching

Layer or composite caches may be used for performance.

Caches are disposable and rebuildable.

## 94.27 Cache Invalidation

Changes to pixels, visibility, opacity, position, cels, or linked-cel source data must invalidate affected caches.

## 94.28 Playback

Playback should use a playback clock and frame durations.

Playback must not continuously mutate editable Document state.

## 94.29 Animation Preview

Animation preview should hide editor overlays such as:

- Grid
- Selection
- Onion skin
- Editing handles
- Temporary tool overlays

## 94.30 Export Rendering

Export must render actual artwork without editor overlays.

PNG export must never include:

- Grid
- Checkerboard
- Selection
- Onion skin
- Cursor
- Transform handles
- UI

## 94.31 Transparency

Transparent and partially transparent pixels must remain correct during rendering and export.

## 94.32 Renderer Error Isolation

Renderer failures must not corrupt Document state.

## 94.33 Performance Targets

Rendering should support:

- 60 FPS target for normal workloads
- Responsive zoom/pan
- Responsive animation playback
- Low-latency brush interaction

## 94.34 Large Documents

Potential future optimizations include:

- Dirty-region rendering
- Tiled/chunked buffers
- Offscreen buffers
- Layer caching
- Worker-based processing

## 94.35 Pixel Accuracy

Rendering optimization must never change:

- RGB values
- Alpha
- Layer order
- Cel relationships
- Logical pixel positions

## 94.36 V1 Gate

Before V1:

- Logical pixels remain authoritative.
- Nearest-neighbor rendering is enforced.
- Zoom and pan are separate from artwork.
- Checkerboard/grid are overlays.
- Layers composite correctly.
- Animation/cels resolve correctly.
- Onion skin remains viewport-only.
- Selection and transform previews remain separate.
- Export excludes editor overlays.
- Transparency remains exact.
- Renderer caches are disposable.
- Renderer failures cannot corrupt the Document.
- Performance targets are measured with realistic workloads.

---

# 95. Input / Interaction Architecture

Input is the boundary between browser/device interaction and the Obsipix editor engine.

The input system must convert raw browser events into normalized editor interactions without allowing browser-specific event handling to leak into tools, commands, or the document model.

The fundamental flow is:

```text
Browser / Device Event
        ↓
Input Adapter
        ↓
Normalized Editor Input
        ↓
Interaction Controller
        ↓
Tool / Command
        ↓
Document Mutation
        ↓
History / Events
        ↓
Renderer
```

The Document remains the source of truth.

Input never modifies document data directly.

## 95.1 Input Sources

V1 should support the following input sources:

- Mouse
- Keyboard
- Mouse wheel
- Middle mouse button
- Right mouse button
- Modifier keys
- Pointer capture
- Focus changes

Stylus/pointer support should be architecturally possible, even if advanced pressure functionality is deferred.

Touch gestures are Post-V1.

## 95.2 Input Adapter

Browser events should first enter an Input Adapter.

The adapter converts browser-specific events into normalized Obsipix input.

For example:

```text
PointerEvent
    ↓
Input Adapter
    ↓
PointerDown
PointerMove
PointerUp
PointerCancel
```

The rest of the editor should not need to know whether the original event came from a mouse, stylus, or another pointer device.

## 95.3 Normalized Input

Normalized input should contain only information relevant to the editor.

Conceptually:

```text
EditorInput
├── type
├── position
├── buttons
├── modifiers
├── pressure
├── timestamp
└── source
```

Position should be available in the appropriate coordinate space.

The system must distinguish between:

```text
Screen Coordinates
        ↓
Canvas Coordinates
        ↓
Logical Pixel Coordinates
```

Tools operate on logical coordinates, not raw screen coordinates.

## 95.4 Coordinate Conversion

Coordinate conversion is a critical part of input handling.

The system must account for:

- Canvas position
- Zoom
- Pan
- Device pixel ratio
- Browser scaling
- Canvas rendering dimensions

The conversion must ultimately produce an integer logical pixel coordinate.

The same conversion system should be used consistently by Pencil, Eraser, Eyedropper, Fill, Selection, Shapes, and Transform tools.

This prevents individual tools from implementing their own coordinate mathematics.

## 95.5 Mouse Buttons

V1 mouse behavior:

| Input | Action |
|---|---|
| Left button | Primary action / foreground color |
| Right button | Secondary action / background color |
| Middle button | Pan canvas |
| Wheel | Zoom / contextual navigation |

Tools should receive normalized button information rather than directly inspecting browser mouse events.

## 95.6 Keyboard Input

Keyboard input has two primary purposes:

1. Commands and shortcuts
2. Text/numeric input

Core shortcuts include:

```text
B              Pencil
E              Eraser
G              Fill
I              Eyedropper
L              Line
M              Move
R              Rectangle
O              Ellipse
X              Swap Colors

Space          Pan
Ctrl+A         Select All
Ctrl+Shift+A   Deselect
Ctrl+Z         Undo
Ctrl+Shift+Z   Redo
Ctrl+S         Save
```

Keyboard handling must respect the current interaction context.

## 95.7 Modifier Keys

The input system must normalize:

- Shift
- Ctrl
- Alt
- Meta where applicable

Modifier behavior must remain consistent across supported browsers.

Examples:

```text
Shift
    → constrained drawing / straight line

Ctrl
    → application commands

Alt
    → reserved for contextual interaction / future temporary picker

Space
    → temporary pan
```

## 95.8 Shortcut Priority

Shortcut processing should follow a predictable priority order:

```text
Focused Text Input
        ↓
Modal Dialog
        ↓
Active Tool
        ↓
Editor Commands
        ↓
Global Application Commands
```

For example, pressing `B` while typing a layer name should enter the character rather than switch to the Pencil tool.

## 95.9 Pointer Capture

During drawing interactions, the editor should maintain pointer capture where supported.

This prevents a stroke from unexpectedly ending when the pointer temporarily leaves the canvas.

```text
Pointer Down
    ↓
Begin Stroke
    ↓
Capture Pointer
    ↓
Pointer Move
    ↓
Continue Stroke
    ↓
Pointer Up
    ↓
Release Pointer
```

## 95.10 Stroke Lifecycle

Drawing tools must use an explicit stroke lifecycle.

```text
Begin
  ↓
Update
  ↓
Update
  ↓
Update
  ↓
Commit
```

A stroke should produce one logical history entry, regardless of how many pointer-move events occur.

```text
PointerDown
   └── Start transaction

PointerMove
PointerMove
PointerMove
   └── Modify working state

PointerUp
   └── Commit transaction
```

## 95.11 Brush Interpolation

Pointer events may not occur once for every pixel crossed by a fast cursor movement.

The drawing system must therefore interpolate between successive logical positions when necessary.

Interpolation must operate in logical pixel space and preserve pixel-perfect behavior.

## 95.12 Tool Interaction

The Input system does not contain tool-specific drawing logic.

Instead:

```text
Input
  ↓
Interaction Controller
  ↓
Active Tool
  ↓
Tool Operation
  ↓
Command / Transaction
```

Tools receive normalized editor input rather than browser `PointerEvent` objects.

## 95.13 Canvas Panning

Panning can be initiated through:

- Space + pointer
- Middle mouse button

The pan interaction modifies Viewport State, not Document State.

No history entry should be created.

## 95.14 Zoom Interaction

Zoom is a View State operation.

Zoom should support:

- Wheel zoom
- `+`
- `-`
- Zoom presets
- Zoom-to-cursor

Zooming must not modify the document or create an undo entry.

## 95.15 Focus Management

The application must explicitly manage focus.

Important focusable areas include:

- Canvas
- Toolbar
- Layer panel
- Timeline
- Color controls
- Palette
- Dialogs
- Numeric controls
- Text fields

Dialogs must capture appropriate keyboard interaction while open.

## 95.16 Input Cancellation

Interactions must support cancellation.

Examples include:

- Shape preview
- Selection operation
- Transform
- Drawing interaction
- Move operation
- Dialog interaction

`Esc` should cancel supported transient interactions and restore the prior state where applicable.

A cancelled operation must not create a history entry.

## 95.17 Shape Interaction

Shape tools use a preview/commit model:

```text
Pointer Down
      ↓
Start Shape
      ↓
Pointer Move
      ↓
Live Preview
      ↓
Pointer Up
      ↓
Commit Shape
```

`Esc` cancels the preview.

`Shift` applies shape constraints according to the tool.

The preview is transient and must not modify permanent document data until committed.

## 95.18 Selection Interaction

Selection tools follow the same interaction pattern:

```text
Begin Selection
      ↓
Update Selection
      ↓
Preview Mask
      ↓
Commit Selection
```

Selection changes modify Selection State rather than immediately modifying pixel data.

## 95.19 Transform Interaction

Transform operations require a temporary interaction state.

```text
Select Content
      ↓
Begin Transform
      ↓
Move / Scale / Rotate / Flip
      ↓
Preview
      ↓
Commit
```

`Enter` commits.

`Esc` cancels.

The permanent document is not modified incrementally for every pointer movement.

## 95.20 Stylus Architecture

The normalized input architecture should support stylus data such as:

- Pressure
- Pointer type
- Tilt
- Contact information

Pressure-sensitive brush behavior is not required for V1.

## 95.21 Touch

Touch gestures are deferred beyond V1.

Future possibilities include:

- Pinch zoom
- Two-finger pan
- Rotation
- Touch-specific interaction

V1 does not need to implement these gestures.

## 95.22 High-Frequency Input

Pointer movement can generate a very large number of events.

The system must avoid:

- React state updates for every pixel
- Global event-bus messages for every pointer move
- History entries for every pointer move
- Expensive full-document recalculation on every event

High-frequency input should remain localized to the active interaction.

## 95.23 Input State

Transient input state may include:

- Pointer position
- Pressed buttons
- Modifier state
- Active pointer
- Current interaction
- Current stroke
- Temporary tool state
- Pointer capture state

This state is not project data and must not be serialized into `.obsipix`.

## 95.24 Input Error Handling

Unexpected input conditions must fail safely, including:

- Pointer cancellation
- Lost focus
- Browser interruption
- Invalid coordinates
- Invalid canvas state
- Tool unavailable
- Document closed during interaction

An active interaction should be safely terminated rather than left partially committed.

## 95.25 Input and History

Input itself does not create history entries.

```text
Input
   ↓
Interaction
   ↓
Command / Transaction
   ↓
Document Mutation
   ↓
History Entry
```

For example:

```text
500 pointer events
        ↓
1 stroke transaction
        ↓
1 history entry
```

## 95.26 Input and Events

Input events are not the same thing as application events.

Raw pointer movement should not be broadcast through the global application event system.

Only meaningful state changes should propagate through the normal command/event architecture.

```text
PointerMove
PointerMove
PointerMove
PointerMove
      ↓
Stroke Committed
      ↓
DocumentChanged
```

## 95.27 Input Architecture Boundary

```text
┌───────────────────────────────┐
│ Browser                       │
│ Mouse / Keyboard / Pointer    │
└───────────────┬───────────────┘
                ↓
┌───────────────────────────────┐
│ Input Adapter                 │
└───────────────┬───────────────┘
                ↓
┌───────────────────────────────┐
│ Normalized Editor Input       │
└───────────────┬───────────────┘
                ↓
┌───────────────────────────────┐
│ Interaction Controller        │
└───────────────┬───────────────┘
                ↓
┌───────────────────────────────┐
│ Tool / Command / Viewport     │
└───────────────┬───────────────┘
                ↓
┌───────────────────────────────┐
│ Editor Engine                 │
└───────────────┬───────────────┘
                ↓
┌───────────────────────────────┐
│ Document / View State         │
└───────────────────────────────┘
```

## 95.28 V1 Acceptance Gate

Section 95 is complete when:

- Mouse input works reliably
- Keyboard shortcuts work reliably
- Modifier keys are normalized
- Screen → logical coordinates are accurate
- Left/right/middle mouse behavior works
- Space pan works
- Wheel zoom works
- Zoom-to-cursor works
- Pointer capture works
- Drawing strokes are continuous
- One stroke creates one history entry
- Shape previews are transient
- Selection interaction is transient until committed
- Transform interaction is transactional
- `Esc` safely cancels supported interactions
- Focused text inputs correctly receive keyboard input
- High-frequency pointer events do not create event storms
- Input state is not persisted into `.obsipix`
- Browser/device-specific input handling remains isolated

**Section 95 — Input / Interaction Architecture: COMPLETE**

# 96. V1 Scope Lock

Section 96 formally locks the scope of Obsipix V1.

The purpose of the scope lock is to prevent feature creep during implementation and establish a clear definition of what must exist before V1 can be considered complete.

The architecture may support future capabilities, but those capabilities must not expand the V1 implementation unless explicitly moved into V1 scope.

## 96.1 V1 Definition

Obsipix V1 is a professional, keyboard-first pixel art editor running in the browser with:

- Pixel-perfect drawing
- Layers
- Selection
- Transformations
- Animation
- Project files
- PNG import/export
- Undo/redo
- Autosave/recovery
- Reliable document lifecycle

The V1 editor must be usable as a complete standalone pixel-art workflow.

## 96.2 V1 Core Features

Mandatory V1 functionality includes:

### Canvas

- Pixel canvas
- Transparent background
- Logical pixel coordinate system
- Nearest-neighbor rendering
- Zoom
- Pan
- Grid
- Checkerboard transparency display

### Drawing

- Pencil
- Eraser
- Eyedropper
- Fill bucket
- Line
- Rectangle
- Ellipse

### Colors

- Foreground/background colors
- Color selector
- RGBA support
- HEX input
- Alpha
- Recent colors
- Color swapping

### Palettes

- Palette panel
- Create palette
- Rename palette
- Delete palette
- Add/remove colors
- Reorder colors
- Select colors
- Duplicate palette
- Import/export where defined by the V1 implementation

## 96.3 V1 Layers

V1 must support:

- Create layer
- Delete layer
- Duplicate layer
- Rename layer
- Reorder layer
- Hide/show layer
- Lock/unlock layer
- Change opacity
- Clear layer
- Merge down
- Merge visible
- Flatten

The default document contains `Layer 1`.

## 96.4 V1 Selection

V1 selection functionality includes:

- Rectangular selection
- Lasso selection
- Replace
- Add
- Subtract
- Intersect
- Select All
- Deselect
- Move selected content
- Copy
- Cut
- Paste
- Delete selected content

Selection must be represented as a pixel mask.

Drawing and fill operations must respect an active selection.

## 96.5 V1 Transformations

V1 must support:

- Move
- 1-pixel arrow movement
- Horizontal flip
- Vertical flip
- 90° clockwise rotation
- 90° counter-clockwise rotation
- 180° rotation
- Scaling
- Image resize
- Canvas resize
- 3×3 resize anchors

Transformations must use nearest-neighbor behavior.

No smoothing or anti-aliasing may be introduced.

## 96.6 V1 Undo / Redo

Undo and redo are mandatory.

The V1 history system must provide:

- Meaningful history entries
- Exact state restoration
- One continuous stroke = one history entry
- Transactional operations
- Redo
- Correct redo invalidation after a new edit

History applies to drawing, erasing, fill, shapes, layer operations, selection, transformations, animation, cels, and linked-cel operations.

Undo history is session-only and is not stored in the project file.

## 96.7 V1 Animation

Animation is explicitly part of V1.

V1 must include:

### Timeline

- Timeline panel
- Frame selection
- Layer selection
- Playback controls
- Frame duration
- Onion skin
- Animation preview
- Basic tags

### Frames

- Create frame
- Create empty frame
- Duplicate frame
- Delete frame
- Reorder frame

### Cels

- Normal cel
- Empty cel
- Hold
- Linked cel
- Make Unique

### Playback

- Play
- Pause
- Previous frame
- Next frame
- First frame
- Last frame
- Loop playback
- Animation preview

### Timing

- Default FPS
- Per-frame duration

### Tags

V1 supports basic animation tags containing:

- Name
- Start frame
- End frame
- Direction
- Color
- Custom FPS where specified

## 96.8 V1 Linked Cel Behavior

Linked cels are part of the V1 architecture and must behave correctly.

A linked cel shares pixel data with another cel.

Editing shared data affects all linked cels.

`Make Unique` breaks the sharing relationship by creating an independent copy.

This behavior must be covered by automated tests.

## 96.9 V1 Project Files

The `.obsipix` format is mandatory.

V1 must support:

- New project
- Save
- Save As
- Open
- Close
- Unsaved-change detection
- Unsaved-change confirmation

The project file must preserve dimensions, pixel colors, alpha, layers, layer properties, palettes, frames, cels, empty cels, holds, linked cels, frame durations, animation tags, and relevant animation settings.

A save/open round trip must restore the document accurately.

## 96.10 V1 PNG Support

PNG is the primary external image format for V1.

### Import

- Open PNG as a document
- Import PNG as a layer

### Export

- Export PNG

Exported PNG files must not contain editor-only overlays such as grid, checkerboard, selection marching ants, onion skin, transform handles, or shape previews.

## 96.11 V1 Document Lifecycle

The V1 workflow must support:

```text
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

A document must maintain a clear distinction between the current in-memory document and the saved project on disk.

The dirty state must accurately reflect whether the current document differs from its saved revision.

## 96.12 V1 Autosave and Recovery

V1 must include basic recovery protection.

The system should:

- Autosave approximately every 30 seconds
- Store recovery data separately from the project file
- Never silently overwrite the user's project with autosave data
- Detect recoverable documents
- Prompt for recovery when appropriate
- Remove obsolete recovery data after successful resolution

Autosave is a safety mechanism, not the primary project-saving mechanism.

## 96.13 V1 Keyboard-First Operation

Keyboard interaction is a core part of Obsipix rather than an optional convenience.

V1 must support the defined shortcut architecture.

## 96.14 V1 Hardening

These capabilities are required for V1 quality:

### Security

- Input validation
- Project validation
- Resource limits
- Safe file handling
- Corrupt-file handling
- Safe recovery
- Data-only `.obsipix` format

### Reliability

- Error handling
- Transaction safety
- Save integrity
- Recovery
- Failure isolation

### Accessibility

- Keyboard navigation
- Focus management
- Accessible controls
- Non-color-only indicators
- Accessible errors

### Performance

Target:

- Initial load under approximately 2 seconds where practical
- Brush latency target under approximately 8 ms
- 60 FPS normal rendering target
- Immediate-feeling zoom
- Immediate-feeling undo/redo

### Testing

Required areas include unit testing, pixel-level testing, document testing, serialization round trips, animation testing, tool testing, UI testing, browser testing, performance testing, and regression testing.

Critical failures involving data loss, corruption, crashes, saving, loading, or export block V1 release.

## 96.15 Explicitly Post-V1

The following are not V1 requirements:

- AI image generation
- Collaboration
- Marketplace
- Accounts
- Cloud saving
- Social features
- 3D
- Vector editing
- Advanced brush engines
- Complex brush dynamics
- Pressure-based painting
- Advanced brush stabilization
- Multiple simultaneous named animation systems
- Advanced event systems
- Audio synchronization
- Advanced animation metadata
- Advanced animation selection workflows
- Canvas rotation
- Minimap
- Advanced touch gestures
- Full plugin runtime
- Plugin marketplace
- Third-party extension ecosystem

These may be supported by the architecture but should not consume V1 implementation effort.

## 96.16 V1 Completion Criteria

Obsipix V1 is complete when a user can reliably perform:

```text
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

The application must do so without pixel corruption, incorrect transparency, lost layers, broken animation, broken linked cels, incorrect undo/redo, silent save failures, unsafe project loading, or unacceptable interaction latency.

## 96.17 Scope Lock Rule

Once implementation begins, a feature should not enter V1 simply because it would be nice to have.

Any new feature must be classified as:

```text
V1 Core
V1 Hardening
Post-V1
```

If it does not directly support the V1 workflow or V1 reliability requirements, it should normally remain Post-V1.

## 96.18 Final V1 Scope

> A fast, browser-based, keyboard-first pixel art editor with professional pixel drawing, layers, selection, transformations, animation, undo/redo, editable `.obsipix` projects, PNG import/export, and strong data integrity.

**Section 96 — V1 Scope Lock: COMPLETE**

# 97. Final Architecture Review

Section 97 is the final architectural checkpoint before implementation begins.

The purpose is to verify that the architecture defined throughout `PROJECT_CORE.md` is internally consistent, that responsibilities are clearly separated, and that the V1 scope can be implemented without requiring another architectural redesign.

## 97.1 Architecture Principles

Obsipix follows these fundamental principles:

1. **The Document is the source of truth.**
2. **Pixel data is authoritative.**
3. **Commands are the controlled mutation boundary.**
4. **History records committed document changes.**
5. **Events communicate meaningful state changes.**
6. **Services coordinate subsystems.**
7. **The Renderer displays document state.**
8. **Serialization preserves document state.**
9. **Browser APIs remain behind infrastructure boundaries.**
10. **Transient interaction state is never treated as project data.**
11. **Performance optimizations must never compromise pixel accuracy.**
12. **Security and data integrity are release requirements.**

## 97.2 Subsystem Review

### Document Architecture

The Document Model is independent from the UI and owns persistent editable state including dimensions, layers, colors, palettes, selection, animation, and settings.

The Document does not depend on React, DOM, Canvas, browser events, IndexedDB, or file dialogs.

**Review result: PASS**

### Command Architecture

Document mutations occur through controlled commands or transactions:

```text
User Action
    ↓
Command
    ↓
Transaction
    ↓
Document Mutation
    ↓
History Entry
    ↓
Events
```

Commands can be tested without requiring the UI.

**Review result: PASS**

### History Architecture

History is based on meaningful user actions and supports undo, redo, transaction grouping, stroke grouping, exact restoration, and redo invalidation.

History remains session-only and is not serialized into `.obsipix`.

**Review result: PASS**

### State Architecture

State is separated into:

```text
Document State
Application State
View State
Tool State
UI State
Transient Interaction State
```

The Document owns persistent editable content. React is not the authoritative source for pixel data.

**Review result: PASS**

### Event Architecture

Events communicate meaningful changes such as document, layer, selection, animation, tool, color, viewport, storage, import/export, and error changes.

High-frequency pointer events do not become global application events.

**Review result: PASS**

### Serialization Review

The runtime Document and physical `.obsipix` format remain separate concepts.

```text
Runtime Document
       ↓
Serializer
       ↓
.obsipix
       ↓
Deserializer
       ↓
Runtime Document
```

The project format is versioned and supports migration while preserving required editable state.

**Review result: PASS**

### Rendering Review

Rendering follows:

```text
Document
   ↓
Resolve Visible Content
   ↓
Resolve Animation / Cels
   ↓
Composite Layers
   ↓
Viewport Transform
   ↓
Overlays
   ↓
Canvas
```

The renderer never becomes the source of truth.

**Review result: PASS**

### Input Review

Input follows:

```text
Browser Event
      ↓
Input Adapter
      ↓
Normalized Input
      ↓
Interaction Controller
      ↓
Tool / Command
```

Browser-specific behavior is isolated from the editor engine.

**Review result: PASS**

### Animation Review

Animation is integrated into the Document and supports frames, cels, empty cels, holds, linked cels, durations, tags, and playback settings.

The Timeline is a UI representation of this underlying model.

**Review result: PASS**

### Selection Review

Selection is independent from the active layer and is represented as a pixel mask usable by drawing, fill, copy, cut, paste, delete, move, and transform operations.

**Review result: PASS**

### Storage Review

User project storage and browser application storage remain distinct:

```text
.obsipix
    ↓
User-owned editable project

IndexedDB
    ↓
Browser-local application data
```

**Review result: PASS**

### File Architecture Review

The File Service isolates browser file APIs from the editor and maintains distinct Open, Import, Save, and Export concepts.

**Review result: PASS**

### Security Review

External data passes through validation before entering the editor engine:

```text
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

`.obsipix` remains a data format, not executable content.

**Review result: PASS**

### Performance Review

Performance requirements are architectural requirements rather than post-release optimizations.

Primary targets remain approximately:

- Initial load under 2 seconds where practical
- Brush latency under 8 ms target
- 60 FPS normal rendering target
- Immediate-feeling zoom
- Immediate-feeling undo/redo

**Review result: PASS**

### Accessibility Review

The architecture supports keyboard navigation, focus management, accessible controls, dialogs, non-color-only indicators, and reduced-motion considerations.

**Review result: PASS**

### Internationalization Review

V1 launches in English but uses localization-ready application text and translation keys. User-created names are not automatically translated.

**Review result: PASS**

### Error Handling Review

Errors are classified and handled at the appropriate layer. Operations affecting document integrity use transactional behavior where appropriate.

**Review result: PASS**

### Extensibility Review

Future extension points exist for tools, importers, exporters, panels, and commands, while the full plugin runtime remains Post-V1.

**Review result: PASS**

### V1 Scope Review

The architecture supports the locked V1 core and hardening scope while explicitly separating AI, collaboration, cloud, accounts, marketplace, 3D, vector, advanced animation, advanced brushes, plugins, gestures, minimap, and canvas rotation as Post-V1.

**Review result: PASS**

## 97.3 Architecture Dependency Review

The final dependency direction is:

```text
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

```text
Browser APIs
    ↓
Infrastructure Services
    ↓
Application / Engine
```

No core subsystem should depend directly on browser UI implementation.

## 97.4 Final Architecture Checklist

| Architecture Area | Status |
|---|---|
| Document Model | PASS |
| Pixel Data Model | PASS |
| Layer Architecture | PASS |
| Animation / Cel Model | PASS |
| Selection | PASS |
| Transformations | PASS |
| Commands | PASS |
| Undo / Redo | PASS |
| Transactions | PASS |
| State Management | PASS |
| Events | PASS |
| Rendering | PASS |
| Input | PASS |
| Serialization | PASS |
| `.obsipix` Format | PASS |
| File Handling | PASS |
| Storage | PASS |
| Autosave / Recovery | PASS |
| Security | PASS |
| Error Handling | PASS |
| Accessibility | PASS |
| Localization | PASS |
| Performance | PASS |
| Extensibility | PASS |
| Testing Architecture | PASS |
| V1 Scope | PASS |

## 97.5 Final Architectural Decision

The architecture is considered **complete and implementation-ready**.

The core rule set is:

```text
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

No subsystem should violate these boundaries without an explicit architectural decision.

## 97.6 Architecture Completion Gate

Before implementation begins:

- V1 scope is locked.
- Major subsystems have defined responsibilities.
- Document ownership is clear.
- Mutation boundaries are defined.
- History behavior is defined.
- Event responsibilities are defined.
- Rendering responsibilities are defined.
- Input responsibilities are defined.
- Serialization boundaries are defined.
- Browser dependencies are isolated.
- Security requirements are established.
- Performance targets are established.
- Testing requirements are established.
- Post-V1 features are explicitly separated.

**All conditions are satisfied.**

## 97.7 Architecture Status

# ARCHITECTURE COMPLETE

The project is now ready to move from architecture/design into technical implementation architecture.

The next sequence is:

```text
98  Technical Stack
99  Folder Structure
100 Core TypeScript Interfaces
101 Core Data Model
102 Command / History Interfaces
103 Renderer Interfaces
104 Storage / Serialization Interfaces
105 Implementation Plan
106 Development / Build Sequence
```


# 98. Technical Stack

Obsipix V1 will use a deliberately small, browser-native technical stack.

## 98.1 Core Stack

- TypeScript
- React
- Vite
- Canvas 2D
- CSS
- Vitest
- Playwright
- IndexedDB
- Browser File APIs
- Custom `.obsipix` serializer
- Lossless compression where appropriate
- npm
- ESLint
- Prettier
- Git

React is responsible for application/UI presentation. It is not the authoritative owner of pixel data.

Canvas 2D is the initial rendering technology. WebGL/WebGPU are not required for V1.

OffscreenCanvas may be introduced later only if measurable performance testing demonstrates a benefit.

## 98.2 Dependency Philosophy

Keep the dependency footprint small.

Core systems such as:

- document model
- pixel storage
- commands
- history
- cels
- rendering abstraction
- `.obsipix` format

remain owned by Obsipix rather than delegated to a large third-party editor framework.

# 99. Folder Structure

The repository is organized around architectural boundaries.

```text
obsipix/
├── public/
├── src/
│   ├── app/
│   │   ├── App.tsx
│   │   ├── AppShell.tsx
│   │   ├── bootstrap.ts
│   │   ├── application/
│   │   ├── commands/
│   │   └── services/
│   ├── core/
│   │   ├── document/
│   │   ├── pixels/
│   │   ├── layers/
│   │   ├── animation/
│   │   ├── selection/
│   │   ├── colors/
│   │   ├── palettes/
│   │   ├── viewport/
│   │   ├── history/
│   │   ├── commands/
│   │   ├── events/
│   │   └── types/
│   ├── editor/
│   │   ├── tools/
│   │   ├── interaction/
│   │   ├── input/
│   │   └── controllers/
│   ├── rendering/
│   │   ├── canvas/
│   │   ├── compositor/
│   │   ├── overlays/
│   │   ├── animation/
│   │   └── renderer/
│   ├── persistence/
│   │   ├── serialization/
│   │   ├── format/
│   │   ├── migration/
│   │   ├── validation/
│   │   └── recovery/
│   ├── infrastructure/
│   │   ├── files/
│   │   ├── storage/
│   │   ├── clipboard/
│   │   ├── browser/
│   │   └── logging/
│   ├── ui/
│   │   ├── layout/
│   │   ├── canvas/
│   │   ├── toolbar/
│   │   ├── menus/
│   │   ├── colors/
│   │   ├── palettes/
│   │   ├── layers/
│   │   ├── timeline/
│   │   ├── dialogs/
│   │   ├── status/
│   │   ├── settings/
│   │   └── common/
│   ├── features/
│   │   ├── document/
│   │   ├── drawing/
│   │   ├── layers/
│   │   ├── selection/
│   │   ├── transforms/
│   │   ├── animation/
│   │   ├── import-export/
│   │   └── recovery/
│   └── main.tsx
├── tests/
│   ├── unit/
│   ├── integration/
│   ├── e2e/
│   ├── fixtures/
│   ├── helpers/
│   └── performance/
├── docs/
│   ├── architecture/
│   ├── development/
│   └── format/
├── PROJECT_CORE.md
├── package.json
├── tsconfig.json
├── vite.config.ts
├── vitest.config.ts
├── playwright.config.ts
├── eslint.config.js
└── README.md
```

Core must not depend on React or browser APIs.

UI is presentation.

Infrastructure owns browser/platform APIs.

Features compose the core, application services, and UI.

Do not create large numbers of empty future systems before they are required.

# 100. Core TypeScript Interfaces

The initial core contracts define stable domain boundaries.

## 100.1 Identity and Primitive Types

Required aliases include:

- `DocumentId`
- `LayerId`
- `FrameId`
- `CelId`
- `PaletteId`
- `AnimationTagId`
- `FrameIndex`
- `Revision`

Core geometry includes:

- `Dimensions`
- `PixelPoint`
- `ScreenPoint`
- `CanvasPoint`

## 100.2 Color and Pixels

```text
RGBA
PixelBuffer
PixelRegion
```

`RGBA` uses 8-bit channels.

`PixelBuffer` provides:

- `getPixel`
- `setPixel`
- `clear`
- `clone`
- `copyRegion`
- `equals`

## 100.3 Layers

A layer contains:

- ID
- Name
- Visibility
- Lock state
- Opacity
- Position
- Pixel/cel content

`LayerCollection` manages:

- ordered layers
- active layer
- create
- delete
- duplicate
- reorder
- set active

## 100.4 Animation

Core animation types include:

- `CelType`
- `Cel`
- `Frame`
- `Animation`
- `AnimationTag`
- `OnionSkinSettings`

Cel types are:

```text
normal
empty
hold
linked
```

## 100.5 Selection

`SelectionMask` provides pixel-level selection state.

`SelectionState` contains:

- mask
- active state

## 100.6 Viewport and Coordinates

`Viewport` contains:

- zoom
- panX
- panY

`CoordinateTransformer` converts between screen/canvas/logical coordinates.

## 100.7 Document

`Document` contains:

- identity
- dimensions
- metadata
- layers
- palettes
- animation
- selection
- revision
- saved revision

`DocumentFactory` creates default documents.

## 100.8 Tools and Input

`Tool` operates against a `ToolContext`.

Pointer input contains:

- position
- source
- buttons
- modifiers

The tool layer must not depend directly on browser event objects.

## 100.9 Commands and Errors

Core interfaces include:

- `Command`
- `CommandResult`
- `EditorError`
- `SaveState`
- `ApplicationState`

Runtime, persistent, and transient state must remain conceptually separate.

# 101. Core Data Model

The `Document` is the authoritative editable project state.

## 101.1 Pixel Source of Truth

`PixelBuffer` is the authoritative source of pixel data.

A normal cel owns an independent pixel buffer.

A linked cel intentionally shares pixel data with another cel.

```text
Cel A ─────┐
           ├── PixelBuffer
Cel B ─────┘
```

## 101.2 Pixel Storage

The implementation uses a contiguous RGBA representation.

Recommended representation:

```text
Uint8ClampedArray
```

Pixel position:

```text
(y * width + x) * 4
```

Transparency is represented through alpha.

No magic transparent color is used.

## 101.3 Cels

An empty cel is distinct from a transparent normal cel.

A hold resolves to the previous effective artwork.

A linked cel shares pixel data.

`Make Unique` copies the shared data and breaks the sharing relationship.

## 101.4 Stable Identity

Layer, frame, cel, palette, and animation-tag IDs must remain stable independently of array position.

Array position represents ordering, not identity.

## 101.5 Selection

Selection mask dimensions must match the document dimensions.

Selection is independent of the active layer.

## 101.6 Revisions

The document tracks:

- current revision
- saved revision

Dirty state is determined from the document/history lifecycle rather than directly by `PixelBuffer`.

## 101.7 Initial Document

Default document:

```text
32 × 32
Transparent
Layer 1
Frame 1
Foreground black
Background white
```

## 101.8 Invariants

The runtime document must maintain:

- valid dimensions
- at least one layer
- unique IDs
- valid layer order
- valid pixel-buffer dimensions
- matching selection dimensions
- opacity within valid range
- RGBA values within 0–255
- valid linked-cel references

Malformed project data must not create an invalid runtime document.

# 102. Command / History Engine

All meaningful document mutations pass through the command/history architecture.

## 102.1 Mutation Pipeline

```text
User Action
    ↓
Command
    ↓
Transaction
    ↓
Document Mutation
    ↓
Commit
    ↓
History Entry
    ↓
Revision
    ↓
Events
    ↓
Renderer
```

## 102.2 Command

A command contains:

- ID
- name
- execute
- undo

Commands operate through a `CommandContext`.

## 102.3 Transactions

Transactions provide atomic logical operations.

A continuous drawing stroke is one transaction and therefore one history entry.

Failed commands roll back and create no history entry.

No-op commands create no history entry.

## 102.4 History

History provides:

- `canUndo`
- `canRedo`
- entries
- execute
- undo
- redo
- clear

When a new edit occurs after undo, the redo branch is invalidated.

## 102.5 Persistence and History

The following do not create history entries:

- Save
- Save As
- Export
- Autosave
- Recovery

Undo history is session-only and is not stored in `.obsipix`.

## 102.6 Multiple Documents

Each document maintains independent editing/history state.

## 102.7 Testing

Commands must be tested for:

- execute
- undo
- redo
- no-op behavior
- failure/rollback
- invariant preservation

Linked-cel relationships must remain correct through undo/redo.

# 103. Renderer Interfaces

The renderer displays the document. It does not own document state.

## 103.1 Render Pipeline

```text
Document
   ↓
Active Frame
   ↓
Resolve Cels
   ↓
Composite Layers
   ↓
Viewport Transform
   ↓
Artwork
   ↓
Overlays
   ↓
Canvas
```

## 103.2 Renderer Contract

Renderer responsibilities include:

- initialize
- render
- resize
- dispose

A render request contains:

- document
- viewport
- active frame
- overlay state
- optional dirty region

## 103.3 Layer Rendering

Layers render bottom-to-top.

Visibility, opacity, and position are respected.

Cel types resolve as:

- normal → own pixel data
- empty → no artwork
- hold → previous effective artwork
- linked → shared pixel data

## 103.4 Overlays

Overlays include:

- checkerboard
- grid
- selection
- onion skin
- transform preview
- shape preview

Overlays are never stored as artwork.

## 103.5 Animation Preview

Animation preview uses playback state.

Preview mode hides editor-only overlays where required.

Onion skin is viewport visualization only.

## 103.6 Pixel Accuracy

Rendering must use:

- nearest-neighbor behavior
- no smoothing
- integer logical coordinates

Zoom range:

```text
25% – 6400%
```

## 103.7 Canvas and Device Pixel Ratio

The renderer must distinguish:

- CSS canvas dimensions
- backing-store dimensions
- logical document dimensions
- device pixel ratio

## 103.8 Performance

The renderer should support invalidation/dirty regions and appropriate caches.

Performance targets remain:

- practical initial load under approximately 2 seconds
- brush latency target under approximately 8 ms
- approximately 60 FPS under normal workloads

Export must never include editor overlays.

# 104. Storage / Serialization Interfaces

Runtime document structures remain independent of physical file formats.

## 104.1 Persistence Architecture

```text
Persistence
├── Serialization
├── Format
├── Validation
├── Migration
└── Recovery
```

Infrastructure provides:

- file APIs
- IndexedDB
- clipboard
- browser integration

## 104.2 `.obsipix`

`.obsipix` is the editable Obsipix project format.

It must preserve:

- dimensions
- layers
- layer properties
- pixel data
- palettes
- animation
- cels
- holds
- linked cels
- frame durations
- tags
- supported settings

## 104.3 Serializer

`ProjectSerializer` provides:

- `serialize`
- `deserialize`

A serialized project contains:

- format version
- metadata
- document

Metadata includes:

- name
- created time
- modified time
- application version

## 104.4 Shared Pixel Data

Serialized projects should support a shared pixel-data table so linked cels can preserve sharing relationships.

Deduplication/compression may be used where beneficial.

## 104.5 Runtime-Only State

The following are not persistent project artwork:

- history
- active pointer
- current stroke
- pointer capture
- shape preview
- transform preview
- focus
- renderer caches
- transient UI state

Viewport/selection persistence remains optional according to the architecture.

## 104.6 Save Pipeline

```text
Document Snapshot
      ↓
Serialize
      ↓
Validate
      ↓
Safe Temporary Write
      ↓
Validate Written Data
      ↓
Replace Target
      ↓
Mark Saved
```

An asynchronous save must not mark newer edits as clean.

## 104.7 Load Pipeline

```text
Read
 ↓
Identify
 ↓
Validate
 ↓
Parse
 ↓
Check Version
 ↓
Migrate
 ↓
Deserialize
 ↓
Validate Runtime Document
 ↓
Activate
```

Unsupported future formats must fail safely.

Unknown optional fields should be ignored where possible.

Validation should occur before dangerous/large allocations.

## 104.8 Recovery

Recovery uses a separate persistence path.

Autosave target:

```text
approximately every 30 seconds
```

Autosave data must not overwrite the user's actual project.

Recovery provides:

- recovery entries
- recovery detection
- restore
- cleanup

IndexedDB is the initial browser storage abstraction.

## 104.9 PNG

PNG is an external interchange/export format.

PNG support includes:

- export artwork
- import as new document
- import as layer

Editor overlays are never exported.

## 104.10 Clipboard

Clipboard services remain outside the core and infrastructure-specific.

## 104.11 Integrity Requirement

A valid `.obsipix` round trip must preserve the required project state exactly.

# 105. Implementation Plan

Development follows the smallest-working-editor strategy.

The objective is to prove the architecture with a complete vertical slice before expanding the feature set.

## 105.1 Implementation Order

```text
Project Foundation
       ↓
Core Data Model
       ↓
Document + Pixel Engine
       ↓
Command / History
       ↓
Renderer
       ↓
Input
       ↓
Phase 0 Vertical Slice
       ↓
Layers / Colors / Tools
       ↓
Selection / Transform
       ↓
Animation
       ↓
Persistence / Recovery
       ↓
Hardening
       ↓
V1 Release
```

## 105.2 Phase 0 Vertical Slice

The first meaningful milestone is:

```text
Launch
 ↓
Create 32×32 Document
 ↓
Display Canvas
 ↓
Draw Pixels
 ↓
Erase Pixels
 ↓
Undo / Redo
 ↓
Save .obsipix
 ↓
Reload .obsipix
 ↓
Export PNG
```

The saved/reloaded pixel data must match exactly.

## 105.3 Phase 0 Components

Required:

- Vite
- React
- TypeScript
- PixelBuffer
- Document
- Layer foundation
- Basic cel/frame model as required by the final architecture
- Pencil
- Eraser
- Input adapter
- Coordinate conversion
- Command/transaction/history
- Canvas renderer
- `.obsipix`
- Save/load
- PNG export

## 105.4 Subsequent Feature Phases

After the vertical slice:

1. Core editor: drawing, colors, canvas, layers
2. Shapes
3. Selection
4. Transformations
5. Palettes
6. Animation foundation
7. Animation timeline
8. Animation visualization
9. Full project lifecycle
10. Recovery
11. PNG import
12. Full input system
13. UI completion
14. Accessibility
15. Security hardening
16. Performance hardening
17. Testing completion
18. V1 release candidate

## 105.5 Implementation Rules

- Do not bypass the Document Model.
- React is not the source of truth for pixel data.
- Do not bypass Commands for document mutations.
- Continuous strokes create one logical history entry.
- Transient interaction state is not stored in `.obsipix`.
- Optimize only after measuring.
- Post-V1 features remain outside V1 unless explicitly promoted.
- Every completed subsystem requires tests.
- Data integrity failures are release blockers.
- Architectural flaws must be corrected rather than worked around.

# 106. Repository Bootstrap

Section 106 defines the exact starting repository state.

## 106.1 Initial Project

Application:

```text
Obsipix
```

Platform:

```text
Modern desktop browser
```

Runtime:

```text
TypeScript + React + Vite
```

Rendering:

```text
Canvas 2D
```

## 106.2 Initial Dependencies

Runtime:

- react
- react-dom

Development:

- typescript
- vite
- @vitejs/plugin-react
- vitest
- playwright
- eslint
- prettier

Additional dependencies require a clear implementation need.

## 106.3 TypeScript

Use strict TypeScript.

Important settings include:

```text
strict: true
noImplicitAny: true
strictNullChecks: true
noUncheckedIndexedAccess: true
```

Avoid `any` unless explicitly justified.

## 106.4 Initial Source Structure

The initial repository follows the Section 99 architecture, but only required directories/files should be created during bootstrap.

## 106.5 Initial Core Files

The first core implementation targets:

```text
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

## 106.6 Bootstrap UI

The first UI is intentionally minimal:

```text
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

Production UI polish comes later.

## 106.7 Phase 0 Development Order

```text
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

## 106.8 Bootstrap Definition of Done

Bootstrap is complete when:

- repository structure exists
- strict TypeScript works
- Vite runs
- React runs
- unit tests run
- E2E framework runs
- linting runs
- formatting runs
- core has no browser dependencies
- initial interfaces compile
- production build succeeds

# 107. Core Pixel Engine

`PixelBuffer` is the lowest-level authoritative artwork container.

It must be exact, deterministic, efficient, serializable, testable, and independent of React, browser APIs, tools, history, and rendering.

## 107.1 Responsibility

`PixelBuffer` owns only pixel data.

It does not know about:

- layers
- frames
- animation
- tools
- selection
- undo/redo
- canvas
- React
- UI
- files
- PNG
- `.obsipix`

## 107.2 Pixel Representation

Each pixel is:

```text
R G B A
```

Each channel is 8-bit:

```text
0–255
```

Recommended storage:

```text
Uint8ClampedArray
```

For a width × height image:

```text
width × height × 4
```

bytes are required for raw RGBA storage.

## 107.3 Memory Layout

Row-major layout:

```text
index = (y × width + x) × 4
```

Logical coordinates begin at:

```text
0,0
```

Valid coordinates satisfy:

```text
0 ≤ x < width
0 ≤ y < height
```

## 107.4 Bounds

Out-of-range reads and writes must be handled safely.

Invalid coordinates must never corrupt valid neighboring pixels.

## 107.5 Core Operations

The PixelBuffer contract includes:

```text
create
getPixel
setPixel
clear
clone
copyRegion
equals
```

## 107.6 RGBA

RGBA channels are explicit 8-bit values.

No internal floating-point color representation is required.

## 107.7 Transparency

Transparency is represented through alpha.

A transparent pixel has:

```text
A = 0
```

There is no magic transparent color.

## 107.8 Default Buffer

A new buffer is transparent.

Conceptually:

```text
RGBA(0, 0, 0, 0)
```

for every pixel.

## 107.9 Clone

A clone must be independent.

Modifying the clone must never modify the source buffer.

Clone is required for:

- undo
- duplicate cels
- Make Unique
- transform previews
- serialization workflows
- tests

## 107.10 Shared Pixel Data

Linked cels may intentionally reference the same pixel data.

Sharing is controlled by the cel/data-model layer rather than by PixelBuffer itself.

## 107.11 Region Copy

`copyRegion` returns an independent buffer containing the requested region.

This supports:

- selection
- copy/paste
- transforms
- clipboard
- sprite extraction

## 107.12 Equality

Two buffers are equal only when:

- dimensions match
- every RGBA channel matches exactly

No visual tolerance is used.

## 107.13 Mutation Boundary

The underlying array should not be exposed for arbitrary application mutation.

Prefer controlled operations such as:

```text
setPixel(x, y, color)
```

rather than unrestricted direct array modification.

## 107.14 Performance

Pixel operations must avoid:

- large allocations per pixel
- React updates
- rendering
- history entries
- serialization
- color conversions

A complete brush stroke may modify thousands of pixels while remaining one command/history transaction.

## 107.15 Dirty State

PixelBuffer does not manage document dirty state.

Dirty state belongs to document revision/history lifecycle.

## 107.16 Testing

Tests must cover:

- creation
- dimensions
- transparent initialization
- pixel writes
- pixel reads
- neighboring pixels
- bounds
- clear
- clone independence
- region copy
- equality
- edge coordinates

Explicit edge coordinates:

```text
(0,0)
(width-1,0)
(0,height-1)
(width-1,height-1)
```

Invalid coordinates must be tested as well.

## 107.17 No Browser Dependencies

`src/core/pixels/PixelBuffer.ts` must not depend on:

- React
- window
- document
- CanvasRenderingContext2D
- ImageData
- File
- Blob
- IndexedDB

## 107.18 Definition of Done

PixelBuffer is complete when:

- RGBA storage works
- coordinates are safely handled
- transparency works
- reads work
- writes work
- clear works
- clone works
- region copy works
- equality works
- no browser dependencies exist
- unit tests pass
- strict TypeScript passes
- unrelated editor logic is absent

# 107. Status

**DEFINED**

Sections 98–107 now form the current implementation contract from technical stack through the first core pixel engine.

# 108. Expanded Export System

V1 export is expanded beyond PNG. It supports PNG, JPEG/JPG, GIF, and WebP for static image export, plus Animated GIF for animation export.

Sprite Sheet / Frame Strip export is a first-class V1 capability and supports horizontal, vertical, and grid layouts, frame ranges, integer scaling, spacing/padding, and transparent or solid backgrounds where supported.

Animation export must preserve frame order and per-frame durations. Holds, linked cels, and layer compositing must resolve to their effective artwork. Editor overlays such as grid, selection, onion skin, previews, cursor, UI, and checkerboard visualization are never exported.

Sprite-sheet export combines selected animation frames into one image without modifying the source document. Scaling uses nearest-neighbor with no smoothing. PNG is the preferred lossless sprite-sheet format; WebP may also be supported.

Export must create no history entry and must not change dirty state. Export failures must leave the source document unchanged and fail safely.

Post-V1 candidates include Animated WebP and APNG.

**108 STATUS: DEFINED / V1 SCOPE UPDATED**

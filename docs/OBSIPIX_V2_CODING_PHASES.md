# Obsipix V2 — Coding Phases

## Purpose

This document converts `OBSIPIX_V2_GAME_ASSET_CREATOR.md` into a practical
coding roadmap for the `v2` branch, in the same spirit as
`OBSIPIX_CODING_PHASES.md` for V1: controlled phases, each producing a
working and testable result before the next phase begins.

V1's architecture boundaries carry over unchanged:

-   DOCUMENT = Source of Truth
-   COMMANDS = Mutation Boundary
-   HISTORY = Committed Changes
-   EVENTS = Communication
-   SERVICES = Coordination
-   RENDERER = Visual Output
-   SERIALIZER = Project Persistence
-   INPUT = User Interaction Boundary
-   BROWSER APIs = External Infrastructure

V2 adds three boundaries on top of them:

-   PROJECT = owns one or more Assets and a shared Style
-   ASSET = a Document plus template/category/perspective metadata
-   TEMPLATE = data that configures a new Asset (never hardcoded per-feature)

------------------------------------------------------------------------

## Architectural Starting Point

`EditorSession` currently wraps exactly one `History`, which wraps exactly
one `Document` (`src/app/EditorSession.ts`, `src/core/document/Document.ts`).
`Document` already carries a `DocumentId`, so per-document identity is not
new — but there is today no concept of a collection of Documents, and no
concept of a Project. Every V2 feature past Phase 0 (templates, asset
library, terrain sets, variations) depends on that collection existing, so
Phase 0 is a hard prerequisite, not optional groundwork.

------------------------------------------------------------------------

# Phase 0 — Project & Multi-Asset Foundation

## Goal

Let one Project own more than one Asset (Document) without breaking V1's
existing single-document editing behavior.

## Build

-   `ProjectId`, `Project` (metadata, asset registry, style — style body
    deferred to Phase 4)
-   `AssetId` distinct from `DocumentId` (an Asset wraps a Document; the
    wrapper is what the Project indexes)
-   Refactor `EditorSession` to hold a reference to the *active* asset's
    `History`, selected from a `Project`, instead of constructing one
    `History` directly
-   Each Asset keeps its own independent `History`/undo stack in memory
    for as long as the Project is open
-   A default single-asset Project, so existing open/save/new-document
    flows keep working unchanged from the user's perspective

## Rules

`Document` itself does not change. `EditorSession` must not collapse two
assets' undo stacks into one, and switching the active asset must not
mutate or discard the History of the asset being switched away from.

## Must Not Build Yet

Template Engine, Asset Library UI, terrain/character/object systems,
export changes. This phase is plumbing only.

## Tests

-   A Project with 2+ assets exists in core code with no React/browser
    dependency
-   Switching the active asset preserves each asset's undo history
    independently (undo after switching back still works)
-   A single-asset Project round-trips through serialization and is
    indistinguishable from today's saved file for existing users
-   Existing V1 test suite still passes unmodified

## Exit Gate

A Project with multiple assets can exist and be switched between in core
code, each asset's history is independent, and the current single-document
save/load path is unaffected.

------------------------------------------------------------------------

# Phase 1 — Asset Metadata: Category, Perspective, Resolution

## Goal

Give every Asset the descriptive metadata the vision doc requires
(§5 Perspective, §4 Category, resolution), stored as part of the asset
record rather than inferred from canvas size.

## Build

-   `AssetCategory` (Terrain, Character, NPC, Building, Object, Item,
    Weapon, Vehicle, Decoration, UI, Effect)
-   `Perspective` model: grid geometry, tile dimensions, canvas
    relationship, shadow direction, alignment rules (Top-down, 3/4
    Top-down, Isometric, Side View, Platformer, Hexagonal, Custom)
-   `AssetMetadata` record (category, perspective, resolution) attached
    per Asset inside a Project

## Rules

Per the vision doc's Important Principle (§5): perspective is part of the
asset definition, not a transient editor/view setting. It must persist
with the asset and survive being reopened.

## Tests

-   Metadata round-trips through serialization
-   Old single-document files (pre-Phase-0) load with sensible inferred
    defaults instead of failing to open

## Exit Gate

An asset can be tagged with a category, perspective, and resolution, and
reopening the project preserves all three exactly.

------------------------------------------------------------------------

# Phase 2 — Template Engine

## Goal

Make "Create Asset → Choose Category → Choose Template → Configure →
Create" (§3) real, driven entirely by data.

## Build

-   `Template` schema: category, perspective, canvas size, pixel
    resolution, grid config, layer structure, default palette, outline
    rules, shading rules, animation config, tile rules, export config,
    constraints (§4)
-   `TemplateRegistry`
-   Asset-creation flow that instantiates a Document + AssetMetadata from
    a chosen Template
-   A handful of seed templates, one per major category, to prove the
    engine end-to-end (not full content — that's Phases 5–7)

## Rules

Adding a new template must never require an editor code change (§4
Requirement). If a template addition needs new code, the engine is wrong.

## Tests

-   Instantiating a Document from a Template produces exactly the
    configured dimensions/layers/palette/grid
-   An unknown or partially-specified template falls back to documented
    defaults instead of throwing

## Exit Gate

A user can go Category → Template → Create and get a correctly configured
asset with zero bespoke code paths per template.

------------------------------------------------------------------------

# Phase 3 — Asset Library UI

## Goal

Replace the current single-document app shell with a browsable,
manageable library of a Project's assets (§10).

## Build

-   Asset Library panel: create, rename, duplicate, delete, organize,
    search, filter (by category / perspective / resolution), preview,
    open-for-edit
-   Wiring to the Phase 0 multi-asset `EditorSession`

## Rules

Opening a different asset for editing must never discard another asset's
unsaved undo history while the project stays open.

## Tests

-   CRUD operations on assets in a project
-   Filter/search correctness against category, perspective, resolution
-   Manual/E2E: edit asset A, switch to asset B, switch back to A — A's
    undo stack is intact

## Exit Gate

A user can hold multiple assets in one project, browse them in a library,
and move between them without losing in-progress work on any of them.

------------------------------------------------------------------------

# Phase 4 — Project Style

## Goal

Let a Project define a shared visual style (§12) that new assets inherit,
so multiple assets visually belong to the same game.

## Build

-   `ProjectStyle`: primary/secondary palette, outline rules, highlight
    rules, shadow rules, lighting direction, pixel density, detail level,
    proportion guidelines
-   Template instantiation (Phase 2) applies the active `ProjectStyle` as
    defaults, with per-asset override still possible

## Tests

-   Two assets created from different templates in the same project share
    palette/outline defaults unless explicitly overridden

## Exit Gate

Assets created inside one project read as visually consistent by default.

------------------------------------------------------------------------

# Phase 5 — Terrain Template System

## Goal

Terrain-specific templates with tile-role relationships (§6): center,
edge, corner, transition.

## Build

-   `TerrainTemplate` extending `Template` with tile-role metadata
-   Terrain-set creation flow producing the role slots as one grouped set
    of assets/frames
-   Basic terrain-set preview grid in the UI

## Must Not Build Yet

Auto-tiling, animated terrain, tileset export — explicitly listed as
*future* terrain features in the vision doc (§6); do not pull them
forward.

## Tests

-   Instantiating a terrain template produces the correct set of
    center/edge/corner/transition slots
-   Tile-role relationships persist through save/load

## Exit Gate

A user can create a terrain set (e.g. grass) with its center/edge/corner
tiles organized and visibly related as one set.

------------------------------------------------------------------------

# Phase 6 — Character Template System

## Goal

Character templates that keep views and animation states consistent
(§7).

## Build

-   `CharacterTemplate`: views (Front, Back, Side, 3/4, Custom),
    animation states (Idle, Walk, Run, Attack, Hurt, Death, Custom)
-   Constraint checking for body proportions, head size, sprite
    dimensions, and animation frame dimensions against the template

## Tests

-   Two characters built from the same template share proportions,
    palette, and animation-frame dimensions
-   A constraint violation (e.g. mismatched frame size) is surfaced, not
    silently accepted

## Exit Gate

Multiple characters from one template are provably consistent on the
properties the template governs.

------------------------------------------------------------------------

# Phase 7 — Object System & Asset Variations

## Goal

Object templates with variants/states (§8), and a generic "create
variation" operation that preserves style (§9).

## Build

-   `ObjectTemplate` variant schema (e.g. Tree small/medium/large, Chest
    closed/open/damaged)
-   `Create Variation` command: clones an asset's style-relevant
    properties (palette, perspective, resolution, proportions, outline)
    into a new linked asset, leaving pixels free to differ
-   Variation lineage tracked (which asset a variation was derived from)

## Tests

-   A variation preserves palette/perspective/resolution while pixels
    differ freely
-   Lineage survives save/load

## Exit Gate

A user can produce Tree 01…05 as variations that read as one consistent
set, per §9's example.

------------------------------------------------------------------------

# Phase 8 — Game Asset Export

## Goal

Treat export as a game-development workflow (§13), not a single-PNG
operation.

## Build

-   Sprite-sheet export for a set of assets (e.g. one character's
    animation states)
-   Tileset export for a terrain group
-   JSON metadata export alongside images (asset, type, resolution,
    perspective, frames — per the §13 example schema)
-   Export profile concept, so future engine targets are additive

## Tests

-   Exported sprite-sheet frame order and dimensions are correct
-   Exported metadata JSON validates against the documented schema

## Exit Gate

A character's animation states export as one sprite sheet with a
matching metadata JSON file.

------------------------------------------------------------------------

# Phase 9 — Godot Export Preparation

## Goal

Ship the vision doc's named first engine integration target (§13, §22).

## Build

-   Godot-oriented export profile (naming conventions, atlas/SpriteFrames
    layout Godot expects)
-   Short doc on importing Obsipix exports into a Godot project

## Tests

-   Manual: exported assets import into a sample Godot project without
    manual fixup beyond what the doc describes

## Exit Gate

Exported assets drop into Godot cleanly following the written steps.

------------------------------------------------------------------------

# Later Tiers (outline only — not yet phase-detailed)

Per the vision doc's own priority order (§18) and explicit non-priorities
(§19), these are intentionally left as an outline. They get phase-level
detail (Goal/Build/Rules/Tests/Exit Gate) only when work actually reaches
them, the same way V1's phases 16–30 were appended over time rather than
speculatively detailed up front.

## Priority 4 — Local & Cloud Projects, Accounts

Authentication, cloud project storage, sync, backup, project history
(§11, §12), candidate backend Supabase. Local-first: local projects must
keep working fully without an account, and this tier must not be allowed
to block Phases 0–9.

## Priority 5 — Commercial Foundation

Free/Pro capability gating, template/content packaging, marketplace
architecture (§16). Per §19, this should not consume significant
development time until the core product (Phases 0–9) is proven.

------------------------------------------------------------------------

# Phase Completion Tracking

  Phase   Area                                Status
  ------- ----------------------------------- ----------
  0       Project / Multi-Asset Foundation    COMPLETE
  1       Asset Metadata                      COMPLETE
  2       Template Engine                     PLANNED
  3       Asset Library UI                    PLANNED
  4       Project Style                       PLANNED
  5       Terrain Template System             PLANNED
  6       Character Template System           PLANNED
  7       Object System / Variations          PLANNED
  8       Game Asset Export                   PLANNED
  9       Godot Export Preparation            PLANNED

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

This roadmap is derived from `OBSIPIX_V2_GAME_ASSET_CREATOR.md` (the V2
vision document) and grounded against the current `v2`-branch codebase,
particularly the single-`Document` `EditorSession`/`History` structure
that Phase 0 must generalize before any later phase can proceed.

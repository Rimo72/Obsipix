# Importing Obsipix exports into Godot

V2 coding-phases Phase 9. Covers the PNG + JSON pair produced by **File →
Export Game Asset…** with **Target: Godot**.

## What you get

Two files, both named from the asset (spaces and punctuation become
underscores — `Forest Tree` → `forest_tree.png` / `forest_tree.json`):

```json
{
  "asset": "forest_tree",
  "type": "object",
  "resolution": 32,
  "perspective": "top_down",
  "frames": 4,
  "engine": "godot",
  "columns": 4,
  "rows": 1,
  "frame_width": 32,
  "frame_height": 32
}
```

| Field                        | Meaning                                                      |
| ---------------------------- | ------------------------------------------------------------ |
| `frames`                     | Frame count in the sheet                                     |
| `columns` / `rows`           | The sheet's grid shape                                       |
| `frame_width`/`frame_height` | Pixel size of one cell (already includes the export's Scale) |

These four are exactly what Godot's own sprite-sheet and atlas tooling
ask for, so you shouldn't need to count cells by hand.

## Sprite sheet or animation state → `AnimatedSprite2D`

1. Drag the PNG into the FileSystem dock to import it.
2. Add an `AnimatedSprite2D` node and create a new `SpriteFrames` resource
   on it.
3. In the SpriteFrames panel, use **Add frames from Sprite Sheet** and
   select the PNG.
4. Set **Horizontal Frames** to `columns` and **Vertical Frames** to
   `rows` from the JSON.
5. Select all `frames` cells (row-major, top-left to bottom-right — the
   same order Obsipix packed them in) and add them to the current
   animation.
6. If the export was scoped to one animation state (via the dialog's
   Scope tabs), rename the SpriteFrames animation to match it (e.g.
   `walk`) so it lines up with the rest of the character's animations.

## Terrain tileset → `TileSet`

1. Import the PNG, then create a `TileSet` resource on a `TileMapLayer`
   (or `TileMap`) node.
2. Add the PNG as an atlas source. Set its **Texture Region Size** to
   `frame_width` × `frame_height`, with Separation and Margins at 0 —
   Godot then auto-slices the atlas into `columns` × `rows` tiles in
   row-major order.
3. For a Grass Terrain Set (or any terrain template), that row-major
   order is:

   ```text
   corner_tl   edge_top    corner_tr
   edge_left   center      edge_right
   corner_bl   edge_bottom corner_br
   ```

4. Create a Terrain Set on the TileSet (**Match Corners and Sides** is
   the closest fit to this layout). Godot doesn't infer peering bits
   from atlas position — for each of the 9 tiles, open its entry in the
   Terrain tile inspector and paint the bits that match its role above
   (e.g. `corner_tl` gets its top and left sides plus the top-left
   corner). The table above is the map from "which cell" to "which
   bits" while you do that.
5. Once every tile's bits are set, the terrain brush auto-tiles across
   the three corner/edge/center shapes the same way it would for any
   hand-authored minimal terrain set.

## Notes

- Re-exporting overwrites the PNG/JSON on disk; Godot re-imports them
  the next time its editor window is focused.
- The Generic target's JSON (no `columns`/`rows`/`frame_width`/
  `frame_height`/`engine`) works fine too — Godot's sprite-sheet import
  just asks for frame counts directly instead of reading them from a
  file.

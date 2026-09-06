# `.obsipix` file format — version 1

The authoritative project format for Obsipix. It is **strictly data** — it never
contains code and is never executed (PROJECT_CORE §13.13).

## Physical layout

All multi-byte integers are **little-endian**.

| Offset     | Size | Field                                           |
| ---------- | ---- | ----------------------------------------------- |
| 0          | 8    | Magic `4F 42 53 49 50 49 58 00` (`"OBSIPIX\0"`) |
| 8          | 2    | Format version (`u16`) — currently `1`          |
| 10         | 2    | Reserved (`u16`, `0`)                           |
| 12         | 4    | Metadata length `N` (`u32`)                     |
| 16         | `N`  | Metadata — UTF-8 JSON (see below)               |
| 16 + N     | 4    | Pixel-section length `M` (`u32`)                |
| 20 + N     | `M`  | Concatenated pixel blobs                        |
| 20 + N + M | 4    | CRC-32 (IEEE) of every preceding byte (`u32`)   |

A reader rejects the file if: the magic or version is wrong, the CRC does not
match, the metadata is not valid JSON of the expected shape, a pixel blob is
out of range or fails to decode, or the reconstructed document violates a
runtime invariant (PROJECT_CORE §8.9).

## Pixel encoding — `rle-rgba8`

Each blob is a run-length encoding of one RGBA buffer, row-major:

```
repeat until width*height pixels emitted:
  varint  run length   (unsigned LEB128, >= 1)
  u8      R
  u8      G
  u8      B
  u8      A
```

Buffers are de-duplicated: **linked cels reference the same blob index** as the
cel they link to. Exactly one cel per shared blob is `normal`; the rest are
`linked`.

## Metadata JSON

```jsonc
{
  "format":   { "version": 1, "application": "Obsipix" },
  "project":  { "name": "Untitled" },
  "document": { "width": 32, "height": 32, "colorMode": "rgba", "pixelAspect": 1 },
  "layers":   [ { "id", "name", "visible", "locked", "opacity" } ],   // bottom → top
  "activeLayerId": "lyr_…",
  "buffers":  [ { "encoding": "rle-rgba8", "width", "height", "offset", "length" } ],
  "animation": {
    "frames": [
      { "id", "durationMs", "cels": { "<layerId>": <cel> } }
    ],
    "activeFrameId": "frm_…",
    "tags":      [ { "id", "name", "startFrame", "endFrame", "direction", "color?", "fps?" } ],
    "playback":  { "fps?": 12 },
    "onionSkin": { "enabled?": false, "previous?": 1, "next?": 1, "opacity?": 0.4 }
  },
  "palettes": [ { "id", "name", "colors": [ { "rgba": [r,g,b,a], "name?" } ] } ]
}

// <cel> is one of:
{ "type": "normal", "buffer": <index> }
{ "type": "linked", "buffer": <index> }
{ "type": "empty"  }
{ "type": "hold"   }
```

## Not stored

Undo/redo history, viewport zoom/pan, panel layout, and any other transient UI
state (PROJECT_CORE §13.7, §13.8). Active layer/frame are stored as a
convenience and restored if still valid.

## Compatibility

Unknown top-level metadata keys are ignored. A future version bump is handled by
a migration step in front of the parser (PROJECT_CORE §13.11); no migrations
exist yet.

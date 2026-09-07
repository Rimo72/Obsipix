/**
 * Resource limits applied when reading an external `.obsipix` file
 * (PROJECT_CORE §14 "External Data → Validation → Sanitization → Resource
 * Limits → Editor", §15 "Resource limits"). They are deliberately generous —
 * far above any realistic hand-made project — but bounded so a hostile or
 * corrupt file cannot exhaust memory before the structural checks run.
 */

/** Whole-file ceiling. */
export const MAX_OBSIPIX_FILE_BYTES = 128 * 1024 * 1024;

/** Metadata JSON section. */
export const MAX_METADATA_BYTES = 32 * 1024 * 1024;

/** Concatenated pixel blobs section. */
export const MAX_PIXEL_SECTION_BYTES = 128 * 1024 * 1024;

export const MAX_LAYERS = 512;
export const MAX_FRAMES = 4096;
export const MAX_BUFFERS = 65_536;
export const MAX_PALETTES = 256;
export const MAX_PALETTE_COLORS = 8192;
export const MAX_TAGS = 4096;

/** Frame durations are clamped to this range on load (milliseconds). */
export const MIN_FRAME_DURATION_MS = 1;
export const MAX_FRAME_DURATION_MS = 600_000;

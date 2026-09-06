import { BLACK, WHITE, type RGBA } from '@core/types/color';

export const DEFAULT_DOCUMENT_WIDTH = 32;
export const DEFAULT_DOCUMENT_HEIGHT = 32;
export const DEFAULT_DOCUMENT_NAME = 'Untitled';
export const DEFAULT_LAYER_NAME = 'Layer 1';

/**
 * Upper bound on either document axis (PROJECT_CORE §15 "Resource limits").
 * External images larger than this are rejected before entering the engine.
 */
export const MAX_DOCUMENT_DIMENSION = 4096;

/**
 * Default drawing colors (PROJECT_CORE §8.8). These are editor state, not
 * stored document properties (§13.3) — the application layer owns the mutable
 * current colors; this only fixes the initial values.
 */
export const DEFAULT_FOREGROUND: RGBA = BLACK;
export const DEFAULT_BACKGROUND: RGBA = WHITE;

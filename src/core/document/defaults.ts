import { BLACK, WHITE, type RGBA } from '@core/types/color';

export const DEFAULT_DOCUMENT_WIDTH = 32;
export const DEFAULT_DOCUMENT_HEIGHT = 32;
export const DEFAULT_DOCUMENT_NAME = 'Untitled';
export const DEFAULT_LAYER_NAME = 'Layer 1';

/**
 * Default drawing colors (PROJECT_CORE §8.8). These are editor state, not
 * stored document properties (§13.3) — the application layer owns the mutable
 * current colors; this only fixes the initial values.
 */
export const DEFAULT_FOREGROUND: RGBA = BLACK;
export const DEFAULT_BACKGROUND: RGBA = WHITE;

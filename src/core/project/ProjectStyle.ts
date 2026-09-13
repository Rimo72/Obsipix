import type { RGBA } from '@core/types/color';

import type { ShadowDirection } from './Perspective';

/**
 * A Project-wide visual style (V2 vision doc §12) that new assets inherit
 * by default, so multiple assets read as belonging to the same game.
 *
 * Scoped to the fields an existing system can act on today: a shared
 * primary/secondary palette, three reference colours standing in for
 * "outline/highlight/shadow rules", and a lighting direction that overrides
 * a template's own perspective default. Pixel density, detail level, and
 * proportion guidelines from the vision doc are deliberately absent —
 * nothing in the editor gives them operational meaning yet; they join this
 * schema once the terrain/character systems (Phases 5-6) define what they
 * mean in practice.
 */
export interface ProjectStyle {
  readonly primaryPalette?: readonly RGBA[];
  readonly secondaryPalette?: readonly RGBA[];
  readonly outlineColor?: RGBA;
  readonly highlightColor?: RGBA;
  readonly shadowColor?: RGBA;
  readonly lightingDirection?: ShadowDirection;
}

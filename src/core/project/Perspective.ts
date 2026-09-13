import type { Dimensions } from '@core/types/geometry';

/**
 * Named game-art perspectives (V2 vision doc §5, initial set). `custom` is
 * the escape hatch for a perspective a preset doesn't cover.
 */
export const PERSPECTIVE_KINDS = [
  'top_down',
  'three_quarter_top_down',
  'isometric',
  'side_view',
  'platformer',
  'hexagonal',
  'custom',
] as const;

export type PerspectiveKind = (typeof PERSPECTIVE_KINDS)[number];

export type GridGeometry = 'square' | 'diamond' | 'hexagonal' | 'none';
export type ShadowDirection = 'none' | 'down' | 'down_right' | 'down_left' | 'custom';
export type AlignmentRule = 'bottom_center' | 'center' | 'baseline' | 'custom';

/**
 * A Perspective's configuration (V2 vision doc §5: grid geometry, tile
 * dimensions, canvas relationship, shadow direction, alignment rules).
 * Per the doc's Important Principle, this belongs to the asset definition,
 * not to a transient editor view setting — it persists with the asset.
 */
export interface Perspective {
  readonly kind: PerspectiveKind;
  readonly gridGeometry: GridGeometry;
  readonly tileDimensions: Dimensions;
  readonly shadowDirection: ShadowDirection;
  readonly alignment: AlignmentRule;
}

const SQUARE_TILE: Dimensions = { width: 32, height: 32 };

/** Every named perspective has a concrete default for every field here. */
export const PERSPECTIVE_PRESETS: Readonly<Record<PerspectiveKind, Perspective>> = {
  top_down: {
    kind: 'top_down',
    gridGeometry: 'square',
    tileDimensions: SQUARE_TILE,
    shadowDirection: 'none',
    alignment: 'center',
  },
  three_quarter_top_down: {
    kind: 'three_quarter_top_down',
    gridGeometry: 'square',
    tileDimensions: SQUARE_TILE,
    shadowDirection: 'down',
    alignment: 'bottom_center',
  },
  isometric: {
    kind: 'isometric',
    gridGeometry: 'diamond',
    tileDimensions: { width: 64, height: 32 },
    shadowDirection: 'down_right',
    alignment: 'bottom_center',
  },
  side_view: {
    kind: 'side_view',
    gridGeometry: 'none',
    tileDimensions: SQUARE_TILE,
    shadowDirection: 'down',
    alignment: 'baseline',
  },
  platformer: {
    kind: 'platformer',
    gridGeometry: 'square',
    tileDimensions: SQUARE_TILE,
    shadowDirection: 'down',
    alignment: 'baseline',
  },
  hexagonal: {
    kind: 'hexagonal',
    gridGeometry: 'hexagonal',
    tileDimensions: { width: 64, height: 56 },
    shadowDirection: 'none',
    alignment: 'center',
  },
  custom: {
    kind: 'custom',
    gridGeometry: 'none',
    tileDimensions: SQUARE_TILE,
    shadowDirection: 'none',
    alignment: 'center',
  },
};

export const DEFAULT_PERSPECTIVE_KIND: PerspectiveKind = 'top_down';

export function getPerspective(kind: PerspectiveKind): Perspective {
  return PERSPECTIVE_PRESETS[kind];
}

export function isPerspectiveKind(value: unknown): value is PerspectiveKind {
  return typeof value === 'string' && (PERSPECTIVE_KINDS as readonly string[]).includes(value);
}

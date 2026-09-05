/**
 * Geometry primitives.
 *
 * Three point spaces are kept nominally separate in intent even though they
 * are structurally identical here; the {@link CoordinateTransformer} that
 * converts between them arrives in Phase 4.
 */

export interface Dimensions {
  readonly width: number;
  readonly height: number;
}

/** A logical (document) pixel coordinate. Integer-valued. */
export interface PixelPoint {
  readonly x: number;
  readonly y: number;
}

/** A coordinate in the browser viewport / DOM client space. */
export interface ScreenPoint {
  readonly x: number;
  readonly y: number;
}

/** A coordinate relative to the rendering canvas element. */
export interface CanvasPoint {
  readonly x: number;
  readonly y: number;
}

/** An axis-aligned rectangle in logical-pixel space. */
export interface PixelRegion {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export function areDimensionsEqual(a: Dimensions, b: Dimensions): boolean {
  return a.width === b.width && a.height === b.height;
}

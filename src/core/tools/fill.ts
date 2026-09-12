import type { PixelBuffer } from '@core/pixels/PixelBuffer';
import { rgbaEquals, type RGBA } from '@core/types/color';
import type { PixelPoint } from '@core/types/geometry';

export interface FillOptions {
  /** Only fill pixels connected to the seed (default). `false` fills every matching pixel. */
  readonly contiguous?: boolean;
  /** Gate each pixel (active selection / layer lock). */
  readonly isAllowed?: (x: number, y: number) => boolean;
}

/**
 * True when every RGBA channel of `a` and `b` differs by at most `tolerance`.
 * `tolerance <= 0` falls back to exact equality (the hard-edged, no-tolerance
 * behaviour PROJECT_CORE §3.2 specifies for Fill).
 */
function colorsMatch(a: RGBA, b: RGBA, tolerance: number): boolean {
  if (tolerance <= 0) {
    return rgbaEquals(a, b);
  }
  return (
    Math.abs(a.r - b.r) <= tolerance &&
    Math.abs(a.g - b.g) <= tolerance &&
    Math.abs(a.b - b.b) <= tolerance &&
    Math.abs(a.a - b.a) <= tolerance
  );
}

/**
 * Visit every pixel in `seed`'s 4-connected region matching its colour within
 * `tolerance` (per-channel, 0-255; 0 means exact) exactly once, in an
 * unspecified order. Shared by {@link floodFill} (paints each visited pixel,
 * always with `tolerance` 0) and {@link floodMatchRegion} (collects them for
 * a selection, tolerance configurable) so the traversal itself — and its test
 * coverage — lives in one place.
 */
function walkFloodRegion(
  buffer: PixelBuffer,
  seed: PixelPoint,
  tolerance: number,
  visit: (x: number, y: number) => void,
): void {
  if (!buffer.contains(seed.x, seed.y)) {
    return;
  }
  const target = buffer.getPixel(seed.x, seed.y);
  const { width, height } = buffer.dimensions;
  const visited = new Uint8Array(width * height);
  const stack: number[] = [seed.y * width + seed.x];
  while (stack.length > 0) {
    const index = stack.pop();
    if (index === undefined || visited[index] === 1) {
      continue;
    }
    visited[index] = 1;
    const x = index % width;
    const y = (index - x) / width;
    if (!colorsMatch(buffer.getPixel(x, y), target, tolerance)) {
      continue;
    }
    visit(x, y);
    if (x > 0) {
      stack.push(index - 1);
    }
    if (x < width - 1) {
      stack.push(index + 1);
    }
    if (y > 0) {
      stack.push(index - width);
    }
    if (y < height - 1) {
      stack.push(index + width);
    }
  }
}

/**
 * Flood fill from `seed` with `color`, replacing the exact colour found there
 * (4-connected). Returns the number of pixels changed. Hard-edged, no
 * tolerance for V1 (PROJECT_CORE §3.2).
 */
export function floodFill(
  buffer: PixelBuffer,
  seed: PixelPoint,
  color: RGBA,
  options: FillOptions = {},
): number {
  if (!buffer.contains(seed.x, seed.y)) {
    return 0;
  }
  const target = buffer.getPixel(seed.x, seed.y);
  if (rgbaEquals(target, color)) {
    return 0;
  }
  const { width, height } = buffer.dimensions;
  const isAllowed = options.isAllowed;
  const contiguous = options.contiguous ?? true;
  let changed = 0;

  const paint = (x: number, y: number): void => {
    if (isAllowed && !isAllowed(x, y)) {
      return;
    }
    buffer.setPixel(x, y, color);
    changed += 1;
  };

  if (!contiguous) {
    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        if (rgbaEquals(buffer.getPixel(x, y), target)) {
          paint(x, y);
        }
      }
    }
    return changed;
  }

  walkFloodRegion(buffer, seed, 0, paint);
  return changed;
}

/**
 * The 4-connected region of pixels matching `seed`'s colour within
 * `tolerance` (per RGBA channel, 0-255; default 0 = exact match) — read-only,
 * never mutates `buffer`. Used by the Magic Wand select tool: a small
 * tolerance picks up near-matches (e.g. faint anti-aliasing or compression
 * noise in an imported PNG) that an exact match would miss.
 */
export function floodMatchRegion(
  buffer: PixelBuffer,
  seed: PixelPoint,
  tolerance = 0,
): PixelPoint[] {
  const matched: PixelPoint[] = [];
  walkFloodRegion(buffer, seed, tolerance, (x, y) => {
    matched.push({ x, y });
  });
  return matched;
}

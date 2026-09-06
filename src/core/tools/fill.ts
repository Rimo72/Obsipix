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
    if (!rgbaEquals(buffer.getPixel(x, y), target)) {
      continue;
    }
    paint(x, y);
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
  return changed;
}

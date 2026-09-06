import type { PixelBuffer } from '@core/pixels/PixelBuffer';
import type { RGBA } from '@core/types/color';
import type { PixelPoint } from '@core/types/geometry';

import { stampOffsets, type Brush } from './Brush';

/**
 * Every integer pixel on the line from `a` to `b`, inclusive of both ends
 * (Bresenham). Used to fill the gaps between fast pointer samples so a stroke
 * is continuous (PROJECT_CORE §3.2, §16).
 */
export function bresenhamLine(a: PixelPoint, b: PixelPoint): PixelPoint[] {
  let x0 = Math.round(a.x);
  let y0 = Math.round(a.y);
  const x1 = Math.round(b.x);
  const y1 = Math.round(b.y);

  const dx = Math.abs(x1 - x0);
  const dy = -Math.abs(y1 - y0);
  const stepX = x0 < x1 ? 1 : -1;
  const stepY = y0 < y1 ? 1 : -1;
  let error = dx + dy;

  const points: PixelPoint[] = [];
  for (;;) {
    points.push({ x: x0, y: y0 });
    if (x0 === x1 && y0 === y1) {
      break;
    }
    const doubled = 2 * error;
    if (doubled >= dy) {
      error += dy;
      x0 += stepX;
    }
    if (doubled <= dx) {
      error += dx;
      y0 += stepY;
    }
  }
  return points;
}

/** How a stroke sets each pixel it covers. */
export type StrokePaint = (buffer: PixelBuffer, x: number, y: number) => void;

/** Replace the pixel with a solid colour (pencil — hard-edged, no blending). */
export function paintSolid(color: RGBA): StrokePaint {
  return (buffer, x, y) => {
    buffer.setPixel(x, y, color);
  };
}

/** Clear the pixel to fully transparent (eraser). */
export const paintErase: StrokePaint = (buffer, x, y) => {
  buffer.setPixel(x, y, { r: 0, g: 0, b: 0, a: 0 });
};

/**
 * Stamp `brush` along the polyline `path` into `buffer` using `paint`, and
 * return how many distinct pixels were touched. Pixels outside the buffer are
 * skipped (PROJECT_CORE §3.2). `isAllowed`, when given, gates each pixel (e.g.
 * an active selection mask).
 */
export function paintStroke(
  buffer: PixelBuffer,
  path: readonly PixelPoint[],
  brush: Brush,
  paint: StrokePaint,
  isAllowed?: (x: number, y: number) => boolean,
): number {
  if (path.length === 0) {
    return 0;
  }
  const offsets = stampOffsets(brush);
  const painted = new Set<number>();

  const stamp = (px: number, py: number): void => {
    for (const offset of offsets) {
      const x = px + offset.x;
      const y = py + offset.y;
      if (!buffer.contains(x, y)) {
        continue;
      }
      if (isAllowed && !isAllowed(x, y)) {
        continue;
      }
      const key = y * buffer.width + x;
      if (painted.has(key)) {
        continue;
      }
      painted.add(key);
      paint(buffer, x, y);
    }
  };

  let previous = path[0];
  if (previous) {
    stamp(previous.x, previous.y);
  }
  for (let index = 1; index < path.length; index += 1) {
    const point = path[index];
    if (!point || !previous) {
      continue;
    }
    const segment = bresenhamLine(previous, point);
    for (const pixel of segment) {
      stamp(pixel.x, pixel.y);
    }
    previous = point;
  }
  return painted.size;
}

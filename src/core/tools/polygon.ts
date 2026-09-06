import type { PixelPoint } from '@core/types/geometry';

import { bresenhamLine } from './stroke';

/**
 * Every integer pixel inside (and on) the closed polygon `vertices`
 * (even-odd scanline fill plus the traced outline). Used by the lasso tool.
 */
export function polygonFillPixels(vertices: readonly PixelPoint[]): PixelPoint[] {
  if (vertices.length === 0) {
    return [];
  }
  if (vertices.length < 3) {
    const points: PixelPoint[] = [];
    for (let i = 1; i < vertices.length; i += 1) {
      const a = vertices[i - 1];
      const b = vertices[i];
      if (a && b) {
        points.push(...bresenhamLine(a, b));
      }
    }
    return points;
  }

  let minY = Infinity;
  let maxY = -Infinity;
  for (const vertex of vertices) {
    minY = Math.min(minY, vertex.y);
    maxY = Math.max(maxY, vertex.y);
  }

  const seen = new Set<string>();
  const result: PixelPoint[] = [];
  const add = (x: number, y: number): void => {
    const key = `${String(x)},${String(y)}`;
    if (!seen.has(key)) {
      seen.add(key);
      result.push({ x, y });
    }
  };

  // scanline interior
  for (let y = Math.ceil(minY); y <= Math.floor(maxY); y += 1) {
    const crossings: number[] = [];
    for (let i = 0; i < vertices.length; i += 1) {
      const a = vertices[i];
      const b = vertices[(i + 1) % vertices.length];
      if (!a || !b) {
        continue;
      }
      const lower = Math.min(a.y, b.y);
      const upper = Math.max(a.y, b.y);
      if (y + 0.5 >= lower && y + 0.5 < upper) {
        const t = (y + 0.5 - a.y) / (b.y - a.y);
        crossings.push(a.x + t * (b.x - a.x));
      }
    }
    crossings.sort((p, q) => p - q);
    for (let i = 0; i + 1 < crossings.length; i += 2) {
      const start = Math.ceil((crossings[i] ?? 0) - 0.5);
      const end = Math.floor((crossings[i + 1] ?? 0) - 0.5);
      for (let x = start; x <= end; x += 1) {
        add(x, y);
      }
    }
  }

  // the outline, so a thin lasso still selects something
  for (let i = 0; i < vertices.length; i += 1) {
    const a = vertices[i];
    const b = vertices[(i + 1) % vertices.length];
    if (a && b) {
      for (const point of bresenhamLine(a, b)) {
        add(point.x, point.y);
      }
    }
  }

  return result;
}

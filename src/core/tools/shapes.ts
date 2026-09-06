import type { PixelPoint } from '@core/types/geometry';

interface Bounds {
  readonly left: number;
  readonly top: number;
  readonly right: number;
  readonly bottom: number;
}

function bounds(a: PixelPoint, b: PixelPoint): Bounds {
  return {
    left: Math.min(a.x, b.x),
    right: Math.max(a.x, b.x),
    top: Math.min(a.y, b.y),
    bottom: Math.max(a.y, b.y),
  };
}

/**
 * Snap `b` relative to `a` so the drag is constrained (Shift):
 * lines to 0°/45°/90°, boxes/ellipses to a square.
 */
export function constrainToSquare(a: PixelPoint, b: PixelPoint): PixelPoint {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const size = Math.max(Math.abs(dx), Math.abs(dy));
  return {
    x: a.x + Math.sign(dx || 1) * size,
    y: a.y + Math.sign(dy || 1) * size,
  };
}

export function constrainLine(a: PixelPoint, b: PixelPoint): PixelPoint {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const adx = Math.abs(dx);
  const ady = Math.abs(dy);
  if (adx > ady * 2) {
    return { x: b.x, y: a.y };
  }
  if (ady > adx * 2) {
    return { x: a.x, y: b.y };
  }
  const size = Math.max(adx, ady);
  return { x: a.x + Math.sign(dx || 1) * size, y: a.y + Math.sign(dy || 1) * size };
}

/** The 1px outline of the rectangle with opposite corners `a` and `b`. */
export function rectangleOutline(a: PixelPoint, b: PixelPoint): PixelPoint[] {
  const { left, right, top, bottom } = bounds(a, b);
  if (left === right && top === bottom) {
    return [{ x: left, y: top }];
  }
  const points: PixelPoint[] = [];
  for (let x = left; x <= right; x += 1) {
    points.push({ x, y: top });
    if (bottom !== top) {
      points.push({ x, y: bottom });
    }
  }
  for (let y = top + 1; y < bottom; y += 1) {
    points.push({ x: left, y });
    if (right !== left) {
      points.push({ x: right, y });
    }
  }
  return points;
}

/**
 * The 1px outline of the ellipse inscribed in the box with corners `a`, `b`
 * (midpoint algorithm, mirrored into four quadrants).
 */
export function ellipseOutline(a: PixelPoint, b: PixelPoint): PixelPoint[] {
  const { left, right, top, bottom } = bounds(a, b);
  const width = right - left;
  const height = bottom - top;
  if (width === 0 || height === 0) {
    // degenerate box → a straight run of pixels
    const points: PixelPoint[] = [];
    for (let x = left; x <= right; x += 1) {
      for (let y = top; y <= bottom; y += 1) {
        points.push({ x, y });
      }
    }
    return points;
  }

  const cx = (left + right) / 2;
  const cy = (top + bottom) / 2;
  const rx = width / 2;
  const ry = height / 2;
  const seen = new Set<number>();
  const points: PixelPoint[] = [];
  const add = (x: number, y: number): void => {
    const px = Math.round(x);
    const py = Math.round(y);
    const key = (py + 100000) * 1_000_000 + (px + 100000);
    if (!seen.has(key)) {
      seen.add(key);
      points.push({ x: px, y: py });
    }
  };

  // walk the perimeter by angle — dense enough to be gap-free at pixel-art sizes
  const steps = Math.min(4096, Math.max(32, Math.ceil((rx + ry) * 6)));
  for (let i = 0; i < steps; i += 1) {
    const t = (i / steps) * Math.PI * 2;
    add(cx + rx * Math.cos(t), cy + ry * Math.sin(t));
  }
  return points;
}

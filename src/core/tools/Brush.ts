import type { PixelPoint } from '@core/types/geometry';

export type BrushShape = 'square' | 'circle';

export interface Brush {
  /** Edge length in logical pixels, independent of zoom (PROJECT_CORE §3.2). Integer >= 1. */
  readonly size: number;
  readonly shape: BrushShape;
}

export const DEFAULT_BRUSH: Brush = { size: 1, shape: 'square' };

/**
 * Offsets, relative to the pointer pixel, that a single brush stamp covers.
 * Hard-edged — every offset is fully on or fully off (PROJECT_CORE §3.2).
 */
export function stampOffsets(brush: Brush): readonly PixelPoint[] {
  const size = Math.max(1, Math.floor(brush.size));
  if (size === 1) {
    return [{ x: 0, y: 0 }];
  }

  const offsets: PixelPoint[] = [];
  const min = -Math.floor((size - 1) / 2);
  const max = min + size - 1;
  const radius = size / 2;
  const centre = (min + max) / 2;

  for (let y = min; y <= max; y += 1) {
    for (let x = min; x <= max; x += 1) {
      if (brush.shape === 'circle') {
        const dx = x - centre;
        const dy = y - centre;
        if (dx * dx + dy * dy > radius * radius) {
          continue;
        }
      }
      offsets.push({ x, y });
    }
  }
  return offsets;
}

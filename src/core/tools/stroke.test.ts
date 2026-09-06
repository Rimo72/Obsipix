import { describe, expect, it } from 'vitest';

import { PixelBuffer } from '@core/pixels/PixelBuffer';
import { BLACK, TRANSPARENT, WHITE, rgbaEquals } from '@core/types/color';

import { DEFAULT_BRUSH, stampOffsets } from './Brush';
import { bresenhamLine, paintErase, paintSolid, paintStroke } from './stroke';

describe('bresenhamLine', () => {
  it('includes both endpoints', () => {
    const line = bresenhamLine({ x: 0, y: 0 }, { x: 3, y: 0 });
    expect(line).toEqual([
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 2, y: 0 },
      { x: 3, y: 0 },
    ]);
  });

  it('leaves no gaps on a steep diagonal', () => {
    const line = bresenhamLine({ x: 0, y: 0 }, { x: 2, y: 8 });
    for (let i = 1; i < line.length; i += 1) {
      const previous = line[i - 1];
      const current = line[i];
      if (!previous || !current) {
        throw new Error('unexpected');
      }
      expect(Math.abs(current.x - previous.x)).toBeLessThanOrEqual(1);
      expect(Math.abs(current.y - previous.y)).toBeLessThanOrEqual(1);
    }
    expect(line.at(-1)).toEqual({ x: 2, y: 8 });
  });
});

describe('stampOffsets', () => {
  it('is a single pixel for size 1', () => {
    expect(stampOffsets(DEFAULT_BRUSH)).toEqual([{ x: 0, y: 0 }]);
  });

  it('is a filled square for a square brush', () => {
    expect(stampOffsets({ size: 3, shape: 'square' })).toHaveLength(9);
  });

  it('drops the corners for a circle brush', () => {
    const circle = stampOffsets({ size: 5, shape: 'circle' });
    expect(circle.length).toBeLessThan(25);
    expect(circle).not.toContainEqual({ x: -2, y: -2 });
  });
});

describe('paintStroke', () => {
  it('paints a solid interpolated line with no gaps', () => {
    const buffer = PixelBuffer.create(16, 16);
    paintStroke(
      buffer,
      [
        { x: 1, y: 1 },
        { x: 10, y: 4 },
      ],
      DEFAULT_BRUSH,
      paintSolid(BLACK),
    );

    for (const point of bresenhamLine({ x: 1, y: 1 }, { x: 10, y: 4 })) {
      expect(rgbaEquals(buffer.getPixel(point.x, point.y), BLACK)).toBe(true);
    }
  });

  it('ignores pixels outside the buffer', () => {
    const buffer = PixelBuffer.create(4, 4);
    expect(() => {
      paintStroke(
        buffer,
        [
          { x: -5, y: 2 },
          { x: 20, y: 2 },
        ],
        DEFAULT_BRUSH,
        paintSolid(WHITE),
      );
    }).not.toThrow();
    expect(rgbaEquals(buffer.getPixel(2, 2), WHITE)).toBe(true);
    expect(rgbaEquals(buffer.getPixel(0, 0), TRANSPARENT)).toBe(true);
  });

  it('erases along the stroke', () => {
    const buffer = PixelBuffer.create(8, 8);
    for (let x = 0; x < 8; x += 1) {
      buffer.setPixel(x, 3, BLACK);
    }
    paintStroke(
      buffer,
      [
        { x: 2, y: 3 },
        { x: 5, y: 3 },
      ],
      DEFAULT_BRUSH,
      paintErase,
    );
    expect(rgbaEquals(buffer.getPixel(1, 3), BLACK)).toBe(true);
    expect(rgbaEquals(buffer.getPixel(3, 3), TRANSPARENT)).toBe(true);
    expect(rgbaEquals(buffer.getPixel(5, 3), TRANSPARENT)).toBe(true);
  });

  it('respects a gating predicate (selection mask)', () => {
    const buffer = PixelBuffer.create(8, 8);
    paintStroke(
      buffer,
      [
        { x: 0, y: 0 },
        { x: 7, y: 0 },
      ],
      DEFAULT_BRUSH,
      paintSolid(BLACK),
      (x) => x < 4,
    );
    expect(rgbaEquals(buffer.getPixel(2, 0), BLACK)).toBe(true);
    expect(rgbaEquals(buffer.getPixel(6, 0), TRANSPARENT)).toBe(true);
  });
});

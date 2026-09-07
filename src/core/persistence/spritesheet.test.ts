import { describe, expect, it } from 'vitest';

import { PixelBuffer } from '@core/pixels/PixelBuffer';
import { BLACK, rgba, rgbaEquals, WHITE } from '@core/types/color';

import { composeSpriteSheet } from './spritesheet';

function frame(mark: { r: number; g: number; b: number; a: number }): PixelBuffer {
  const b = PixelBuffer.create(4, 4);
  b.setPixel(0, 0, mark);
  return b;
}

describe('composeSpriteSheet', () => {
  const frames = [frame(BLACK), frame(WHITE), frame(rgba(255, 0, 0, 255))];

  it('lays frames out horizontally', () => {
    const sheet = composeSpriteSheet(frames, { layout: 'horizontal' });
    expect(sheet.dimensions).toEqual({ width: 12, height: 4 });
    expect(rgbaEquals(sheet.getPixel(0, 0), BLACK)).toBe(true);
    expect(rgbaEquals(sheet.getPixel(4, 0), WHITE)).toBe(true);
    expect(sheet.getPixel(8, 0)).toEqual({ r: 255, g: 0, b: 0, a: 255 });
  });

  it('lays frames out vertically', () => {
    const sheet = composeSpriteSheet(frames, { layout: 'vertical' });
    expect(sheet.dimensions).toEqual({ width: 4, height: 12 });
    expect(rgbaEquals(sheet.getPixel(0, 4), WHITE)).toBe(true);
  });

  it('lays frames out in a grid with columns and spacing', () => {
    const sheet = composeSpriteSheet(frames, { layout: 'grid', columns: 2, spacing: 1 });
    // 2 cols × 2 rows of 4px cells + 1px gaps around and between
    expect(sheet.dimensions).toEqual({ width: 2 * 4 + 3, height: 2 * 4 + 3 });
    expect(rgbaEquals(sheet.getPixel(1, 1), BLACK)).toBe(true); // frame 0 at (gap, gap)
    expect(rgbaEquals(sheet.getPixel(6, 1), WHITE)).toBe(true); // frame 1: x = gap + cell + gap
  });

  it('fills a solid background when asked', () => {
    const sheet = composeSpriteSheet(frames, {
      layout: 'horizontal',
      background: rgba(10, 20, 30, 255),
    });
    expect(sheet.getPixel(3, 3)).toEqual({ r: 10, g: 20, b: 30, a: 255 });
  });
});

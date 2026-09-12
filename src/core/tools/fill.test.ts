import { describe, expect, it } from 'vitest';

import { PixelBuffer } from '@core/pixels/PixelBuffer';
import { BLACK, TRANSPARENT, WHITE, rgbaEquals } from '@core/types/color';

import { floodFill, floodMatchRegion } from './fill';

describe('floodFill', () => {
  it('fills a contiguous transparent region', () => {
    const buffer = PixelBuffer.create(5, 5);
    // a wall down the middle
    for (let y = 0; y < 5; y += 1) {
      buffer.setPixel(2, y, BLACK);
    }

    const changed = floodFill(buffer, { x: 0, y: 0 }, WHITE);

    expect(changed).toBe(10); // the whole left half
    expect(rgbaEquals(buffer.getPixel(1, 4), WHITE)).toBe(true);
    expect(rgbaEquals(buffer.getPixel(2, 2), BLACK)).toBe(true); // wall untouched
    expect(rgbaEquals(buffer.getPixel(3, 0), TRANSPARENT)).toBe(true); // right half not reached
  });

  it('does nothing when the seed already matches the fill colour', () => {
    const buffer = PixelBuffer.create(3, 3);
    expect(floodFill(buffer, { x: 1, y: 1 }, TRANSPARENT)).toBe(0);
  });

  it('does nothing for an out-of-bounds seed', () => {
    expect(floodFill(PixelBuffer.create(3, 3), { x: 9, y: 9 }, BLACK)).toBe(0);
  });

  it('honours the allow predicate', () => {
    const buffer = PixelBuffer.create(4, 4);
    floodFill(buffer, { x: 0, y: 0 }, BLACK, { isAllowed: (x) => x < 2 });
    expect(rgbaEquals(buffer.getPixel(1, 0), BLACK)).toBe(true);
    expect(rgbaEquals(buffer.getPixel(3, 0), TRANSPARENT)).toBe(true);
  });

  it('non-contiguous mode fills every matching pixel', () => {
    const buffer = PixelBuffer.create(4, 1);
    buffer.setPixel(1, 0, BLACK); // splits the row
    const changed = floodFill(buffer, { x: 0, y: 0 }, WHITE, { contiguous: false });
    expect(changed).toBe(3);
    expect(rgbaEquals(buffer.getPixel(3, 0), WHITE)).toBe(true);
  });
});

describe('floodMatchRegion', () => {
  it('collects the contiguous same-colour region without mutating the buffer', () => {
    const buffer = PixelBuffer.create(5, 5);
    for (let y = 0; y < 5; y += 1) {
      buffer.setPixel(2, y, BLACK); // a wall down the middle
    }

    const region = floodMatchRegion(buffer, { x: 0, y: 0 });

    expect(region).toHaveLength(10); // the whole left half
    expect(region).toContainEqual({ x: 1, y: 4 });
    expect(region).not.toContainEqual({ x: 2, y: 2 }); // the wall
    expect(region).not.toContainEqual({ x: 3, y: 0 }); // right half not reached
    // read-only: the source pixel is still transparent, not overwritten
    expect(rgbaEquals(buffer.getPixel(0, 0), TRANSPARENT)).toBe(true);
  });

  it('matches a single isolated pixel when its neighbours differ', () => {
    const buffer = PixelBuffer.create(3, 3);
    buffer.setPixel(1, 1, BLACK);
    expect(floodMatchRegion(buffer, { x: 1, y: 1 })).toEqual([{ x: 1, y: 1 }]);
  });

  it('returns nothing for an out-of-bounds seed', () => {
    expect(floodMatchRegion(PixelBuffer.create(3, 3), { x: 9, y: 9 })).toEqual([]);
  });

  it('matches the whole canvas when it is uniformly one colour', () => {
    const buffer = PixelBuffer.create(4, 3);
    expect(floodMatchRegion(buffer, { x: 2, y: 1 })).toHaveLength(12);
  });
});

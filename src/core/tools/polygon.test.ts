import { describe, expect, it } from 'vitest';

import { polygonFillPixels } from './polygon';

function has(pixels: { x: number; y: number }[], x: number, y: number): boolean {
  return pixels.some((p) => p.x === x && p.y === y);
}

describe('polygonFillPixels', () => {
  it('fills a triangle', () => {
    const pixels = polygonFillPixels([
      { x: 0, y: 0 },
      { x: 6, y: 0 },
      { x: 0, y: 6 },
    ]);
    expect(has(pixels, 1, 1)).toBe(true); // interior
    expect(has(pixels, 0, 0)).toBe(true); // vertex
    expect(has(pixels, 5, 5)).toBe(false); // outside the hypotenuse
  });

  it('fills a rectangle-shaped polygon completely', () => {
    const pixels = polygonFillPixels([
      { x: 2, y: 2 },
      { x: 5, y: 2 },
      { x: 5, y: 4 },
      { x: 2, y: 4 },
    ]);
    for (let y = 2; y <= 4; y += 1) {
      for (let x = 2; x <= 5; x += 1) {
        expect(has(pixels, x, y)).toBe(true);
      }
    }
  });

  it('returns just the line for two points', () => {
    const pixels = polygonFillPixels([
      { x: 0, y: 0 },
      { x: 3, y: 0 },
    ]);
    expect(pixels).toHaveLength(4);
  });
});

import { describe, expect, it } from 'vitest';

import { BLACK, TRANSPARENT, WHITE, rgba, rgbaEquals } from '@core/types/color';

import { PixelBuffer } from './PixelBuffer';

describe('PixelBuffer creation', () => {
  it('creates a buffer with the requested dimensions', () => {
    const buffer = PixelBuffer.create(32, 16);
    expect(buffer.width).toBe(32);
    expect(buffer.height).toBe(16);
    expect(buffer.dimensions).toEqual({ width: 32, height: 16 });
    expect(buffer.pixelCount).toBe(512);
  });

  it('initialises every pixel to fully transparent', () => {
    const buffer = PixelBuffer.create(4, 4);
    for (let y = 0; y < 4; y++) {
      for (let x = 0; x < 4; x++) {
        expect(rgbaEquals(buffer.getPixel(x, y), TRANSPARENT)).toBe(true);
      }
    }
    expect(buffer.toBytes().every((byte) => byte === 0)).toBe(true);
  });

  it.each<[string, number, number]>([
    ['zero width', 0, 4],
    ['zero height', 4, 0],
    ['negative', -1, 4],
    ['fractional', 4.5, 4],
  ])('rejects %s dimensions', (_label, width, height) => {
    expect(() => PixelBuffer.create(width, height)).toThrow(RangeError);
  });
});

describe('PixelBuffer read / write', () => {
  it('round-trips a written pixel', () => {
    const buffer = PixelBuffer.create(8, 8);
    const color = rgba(12, 34, 56, 78);
    buffer.setPixel(3, 5, color);
    expect(buffer.getPixel(3, 5)).toEqual(color);
  });

  it('does not disturb neighbouring pixels', () => {
    const buffer = PixelBuffer.create(8, 8);
    buffer.setPixel(4, 4, WHITE);
    const neighbours: readonly (readonly [number, number])[] = [
      [3, 4],
      [5, 4],
      [4, 3],
      [4, 5],
    ];
    for (const [nx, ny] of neighbours) {
      expect(rgbaEquals(buffer.getPixel(nx, ny), TRANSPARENT)).toBe(true);
    }
  });

  it('writes and reads the four corner pixels', () => {
    const buffer = PixelBuffer.create(10, 6);
    const corners = [
      [0, 0],
      [9, 0],
      [0, 5],
      [9, 5],
    ] as const;
    corners.forEach(([x, y], index) => {
      buffer.setPixel(x, y, rgba(index, index, index, 255));
    });
    corners.forEach(([x, y], index) => {
      expect(buffer.getPixel(x, y)).toEqual({ r: index, g: index, b: index, a: 255 });
    });
  });

  it('rejects an out-of-range colour channel', () => {
    const buffer = PixelBuffer.create(2, 2);
    expect(() => {
      buffer.setPixel(0, 0, { r: 0, g: 0, b: 0, a: 300 });
    }).toThrow(RangeError);
  });
});

describe('PixelBuffer bounds', () => {
  const buffer = PixelBuffer.create(4, 4);

  it.each<[string, number, number]>([
    ['x too large', 4, 0],
    ['y too large', 0, 4],
    ['x negative', -1, 0],
    ['y negative', 0, -1],
    ['fractional', 1.5, 2],
  ])('contains() is false and getPixel throws for %s', (_label, x, y) => {
    expect(buffer.contains(x, y)).toBe(false);
    expect(() => buffer.getPixel(x, y)).toThrow(RangeError);
    expect(() => {
      buffer.setPixel(x, y, WHITE);
    }).toThrow(RangeError);
  });

  it('contains() is true for every valid corner', () => {
    const corners: readonly (readonly [number, number])[] = [
      [0, 0],
      [3, 0],
      [0, 3],
      [3, 3],
    ];
    for (const [x, y] of corners) {
      expect(buffer.contains(x, y)).toBe(true);
    }
  });
});

describe('PixelBuffer clear', () => {
  it('resets every pixel to transparent', () => {
    const buffer = PixelBuffer.create(3, 3);
    buffer.setPixel(0, 0, BLACK);
    buffer.setPixel(2, 2, WHITE);
    buffer.clear();
    expect(buffer.toBytes().every((byte) => byte === 0)).toBe(true);
  });
});

describe('PixelBuffer clone', () => {
  it('produces an equal but independent copy', () => {
    const original = PixelBuffer.create(5, 5);
    original.setPixel(1, 1, BLACK);
    const copy = original.clone();

    expect(copy.equals(original)).toBe(true);

    copy.setPixel(2, 2, WHITE);
    expect(rgbaEquals(original.getPixel(2, 2), TRANSPARENT)).toBe(true);

    original.setPixel(3, 3, WHITE);
    expect(rgbaEquals(copy.getPixel(3, 3), TRANSPARENT)).toBe(true);
  });
});

describe('PixelBuffer.toBytes', () => {
  it('returns a copy that cannot mutate the buffer', () => {
    const buffer = PixelBuffer.create(2, 2);
    const bytes = buffer.toBytes();
    bytes[0] = 255;
    expect(rgbaEquals(buffer.getPixel(0, 0), TRANSPARENT)).toBe(true);
  });
});

describe('PixelBuffer.fromBytes', () => {
  it('reconstructs a buffer from raw bytes', () => {
    const source = PixelBuffer.create(3, 2);
    source.setPixel(1, 1, rgba(9, 8, 7, 6));
    const restored = PixelBuffer.fromBytes(3, 2, source.toBytes());
    expect(restored.equals(source)).toBe(true);
  });

  it('copies the input rather than aliasing it', () => {
    const bytes = new Uint8ClampedArray(2 * 2 * 4);
    const buffer = PixelBuffer.fromBytes(2, 2, bytes);
    bytes[0] = 200;
    expect(rgbaEquals(buffer.getPixel(0, 0), TRANSPARENT)).toBe(true);
  });

  it('rejects a byte length that does not match the dimensions', () => {
    expect(() => PixelBuffer.fromBytes(2, 2, new Uint8ClampedArray(8))).toThrow(RangeError);
  });
});

describe('PixelBuffer.copyRegion', () => {
  it('copies a region to a new location', () => {
    const source = PixelBuffer.create(4, 4);
    source.setPixel(0, 0, BLACK);
    source.setPixel(1, 0, WHITE);

    const target = PixelBuffer.create(4, 4);
    target.copyRegion(source, { x: 0, y: 0, width: 2, height: 1 }, { x: 2, y: 3 });

    expect(rgbaEquals(target.getPixel(2, 3), BLACK)).toBe(true);
    expect(rgbaEquals(target.getPixel(3, 3), WHITE)).toBe(true);
    expect(rgbaEquals(target.getPixel(0, 0), TRANSPARENT)).toBe(true);
  });

  it('clips pixels that fall outside the destination', () => {
    const source = PixelBuffer.create(4, 4);
    for (let x = 0; x < 4; x++) {
      source.setPixel(x, 0, WHITE);
    }

    const target = PixelBuffer.create(4, 4);
    target.copyRegion(source, { x: 0, y: 0, width: 4, height: 1 }, { x: 2, y: 0 });

    expect(rgbaEquals(target.getPixel(2, 0), WHITE)).toBe(true);
    expect(rgbaEquals(target.getPixel(3, 0), WHITE)).toBe(true);
    // columns 4 and 5 would be off-canvas and are simply dropped
  });

  it('clips pixels with a negative destination origin', () => {
    const source = PixelBuffer.create(4, 4);
    source.setPixel(0, 0, BLACK);
    source.setPixel(1, 1, WHITE);

    const target = PixelBuffer.create(4, 4);
    target.copyRegion(source, { x: 0, y: 0, width: 2, height: 2 }, { x: -1, y: -1 });

    expect(rgbaEquals(target.getPixel(0, 0), WHITE)).toBe(true);
  });

  it('handles an overlapping copy within the same buffer', () => {
    const buffer = PixelBuffer.create(4, 1);
    buffer.setPixel(0, 0, BLACK);
    buffer.setPixel(1, 0, WHITE);

    buffer.copyRegion(buffer, { x: 0, y: 0, width: 2, height: 1 }, { x: 1, y: 0 });

    expect(rgbaEquals(buffer.getPixel(0, 0), BLACK)).toBe(true);
    expect(rgbaEquals(buffer.getPixel(1, 0), BLACK)).toBe(true);
    expect(rgbaEquals(buffer.getPixel(2, 0), WHITE)).toBe(true);
  });

  it('does nothing for a zero-area region', () => {
    const source = PixelBuffer.create(4, 4);
    source.setPixel(0, 0, BLACK);
    const target = PixelBuffer.create(4, 4);
    target.copyRegion(source, { x: 0, y: 0, width: 0, height: 0 }, { x: 0, y: 0 });
    expect(rgbaEquals(target.getPixel(0, 0), TRANSPARENT)).toBe(true);
  });

  it('rejects a region outside the source bounds', () => {
    const source = PixelBuffer.create(4, 4);
    const target = PixelBuffer.create(4, 4);
    expect(() => {
      target.copyRegion(source, { x: 2, y: 2, width: 4, height: 4 }, { x: 0, y: 0 });
    }).toThrow(RangeError);
  });
});

describe('PixelBuffer.equals', () => {
  it('is true for identical content', () => {
    const a = PixelBuffer.create(3, 3);
    const b = PixelBuffer.create(3, 3);
    a.setPixel(1, 1, BLACK);
    b.setPixel(1, 1, BLACK);
    expect(a.equals(b)).toBe(true);
  });

  it('is false when a single pixel differs', () => {
    const a = PixelBuffer.create(3, 3);
    const b = PixelBuffer.create(3, 3);
    b.setPixel(2, 2, rgba(0, 0, 0, 1));
    expect(a.equals(b)).toBe(false);
  });

  it('is false when dimensions differ', () => {
    expect(PixelBuffer.create(3, 3).equals(PixelBuffer.create(3, 4))).toBe(false);
  });

  it('is reflexive', () => {
    const buffer = PixelBuffer.create(2, 2);
    expect(buffer.equals(buffer)).toBe(true);
  });
});

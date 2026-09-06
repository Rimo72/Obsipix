import { describe, expect, it } from 'vitest';

import { PixelBuffer } from '@core/pixels/PixelBuffer';
import { BLACK, WHITE, rgba, rgbaEquals } from '@core/types/color';

import {
  anchorOffset,
  flipHorizontal,
  flipVertical,
  resizeCanvas,
  rotateQuarter,
  scaleNearest,
} from './transform';

function marker(width: number, height: number): PixelBuffer {
  const buffer = PixelBuffer.create(width, height);
  buffer.setPixel(0, 0, BLACK); // top-left marker
  buffer.setPixel(width - 1, 0, WHITE); // top-right marker
  return buffer;
}

describe('flip', () => {
  it('flipHorizontal moves the top-left marker to the top-right', () => {
    const out = flipHorizontal(marker(4, 3));
    expect(rgbaEquals(out.getPixel(3, 0), BLACK)).toBe(true);
    expect(rgbaEquals(out.getPixel(0, 0), WHITE)).toBe(true);
  });

  it('flipVertical moves the top row to the bottom', () => {
    const out = flipVertical(marker(4, 3));
    expect(rgbaEquals(out.getPixel(0, 2), BLACK)).toBe(true);
  });

  it('two flips is the identity', () => {
    const source = marker(5, 4);
    expect(flipHorizontal(flipHorizontal(source)).equals(source)).toBe(true);
  });
});

describe('rotateQuarter', () => {
  it('cw then ccw returns the original', () => {
    const source = marker(4, 3);
    expect(rotateQuarter(rotateQuarter(source, 'cw'), 'ccw').equals(source)).toBe(true);
  });

  it('swaps dimensions for a quarter turn', () => {
    const out = rotateQuarter(marker(4, 3), 'cw');
    expect([out.width, out.height]).toEqual([3, 4]);
  });

  it('half turn keeps dimensions and is its own inverse', () => {
    const source = marker(4, 3);
    expect(rotateQuarter(rotateQuarter(source, 'half'), 'half').equals(source)).toBe(true);
    const half = rotateQuarter(source, 'half');
    expect(rgbaEquals(half.getPixel(3, 2), BLACK)).toBe(true);
  });
});

describe('scaleNearest', () => {
  it('doubles a buffer by pixel replication', () => {
    const source = PixelBuffer.create(2, 2);
    source.setPixel(0, 0, BLACK);
    const out = scaleNearest(source, 4, 4);
    expect(rgbaEquals(out.getPixel(0, 0), BLACK)).toBe(true);
    expect(rgbaEquals(out.getPixel(1, 1), BLACK)).toBe(true);
    expect(rgbaEquals(out.getPixel(2, 2), out.getPixel(3, 3))).toBe(true);
  });

  it('rejects a non-positive target', () => {
    expect(() => scaleNearest(PixelBuffer.create(2, 2), 0, 2)).toThrow(RangeError);
  });
});

describe('resizeCanvas', () => {
  it('places the old content at the offset on a transparent field', () => {
    const source = PixelBuffer.create(2, 2);
    source.setPixel(0, 0, rgba(9, 9, 9, 255));
    const out = resizeCanvas(source, 6, 6, 2, 3);
    expect(rgbaEquals(out.getPixel(2, 3), rgba(9, 9, 9, 255))).toBe(true);
    expect(out.getPixel(0, 0).a).toBe(0);
  });
});

describe('anchorOffset', () => {
  it('positions old content for each 3x3 anchor', () => {
    expect(anchorOffset(4, 4, 8, 8, 'left', 'top')).toEqual({ x: 0, y: 0 });
    expect(anchorOffset(4, 4, 8, 8, 'center', 'center')).toEqual({ x: 2, y: 2 });
    expect(anchorOffset(4, 4, 8, 8, 'right', 'bottom')).toEqual({ x: 4, y: 4 });
  });
});

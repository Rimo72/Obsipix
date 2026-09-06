import { describe, expect, it } from 'vitest';

import { PixelBuffer } from '@core/pixels/PixelBuffer';
import { BLACK, WHITE, rgba } from '@core/types/color';

import { decodeRle, encodeRle } from './rle';

function roundTrip(buffer: PixelBuffer): PixelBuffer {
  return decodeRle(encodeRle(buffer), buffer.width, buffer.height);
}

describe('RLE pixel encoding', () => {
  it('round-trips a transparent buffer to a tiny payload', () => {
    const buffer = PixelBuffer.create(32, 32);
    const encoded = encodeRle(buffer);
    expect(encoded.length).toBeLessThan(10);
    expect(roundTrip(buffer).equals(buffer)).toBe(true);
  });

  it('round-trips arbitrary content exactly', () => {
    const buffer = PixelBuffer.create(9, 7);
    buffer.setPixel(0, 0, BLACK);
    buffer.setPixel(8, 6, WHITE);
    buffer.setPixel(4, 3, rgba(12, 34, 56, 78));
    for (let x = 0; x < 9; x += 1) {
      buffer.setPixel(x, 1, rgba(x * 10, 0, 0, 255));
    }
    expect(roundTrip(buffer).equals(buffer)).toBe(true);
  });

  it('rejects data that does not cover every pixel', () => {
    const short = encodeRle(PixelBuffer.create(2, 2)).subarray(0, 2);
    expect(() => decodeRle(short, 2, 2)).toThrow(RangeError);
  });

  it('rejects trailing garbage', () => {
    const encoded = encodeRle(PixelBuffer.create(2, 2));
    const padded = new Uint8Array(encoded.length + 3);
    padded.set(encoded);
    expect(() => decodeRle(padded, 2, 2)).toThrow(RangeError);
  });
});

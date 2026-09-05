import { describe, expect, it } from 'vitest';

import {
  BLACK,
  MAX_CHANNEL,
  TRANSPARENT,
  WHITE,
  assertChannelValue,
  isChannelValue,
  rgba,
  rgbaEquals,
} from './color';

describe('rgba', () => {
  it('constructs a color from channels', () => {
    expect(rgba(10, 20, 30, 40)).toEqual({ r: 10, g: 20, b: 30, a: 40 });
  });

  it('defaults alpha to fully opaque', () => {
    expect(rgba(1, 2, 3)).toEqual({ r: 1, g: 2, b: 3, a: MAX_CHANNEL });
  });

  it.each<[string, number]>([
    ['negative', -1],
    ['above 255', 256],
    ['fractional', 12.5],
    ['NaN', Number.NaN],
    ['Infinity', Number.POSITIVE_INFINITY],
  ])('rejects a %s channel', (_label, value) => {
    expect(() => rgba(value, 0, 0, 0)).toThrow(RangeError);
  });
});

describe('isChannelValue / assertChannelValue', () => {
  it('accepts integers in [0, 255]', () => {
    expect(isChannelValue(0)).toBe(true);
    expect(isChannelValue(255)).toBe(true);
    expect(() => {
      assertChannelValue(128, 'r');
    }).not.toThrow();
  });

  it('names the offending channel in the error', () => {
    expect(() => {
      assertChannelValue(999, 'alpha');
    }).toThrow(/alpha/);
  });
});

describe('named colors', () => {
  it('exposes exact constant values', () => {
    expect(TRANSPARENT).toEqual({ r: 0, g: 0, b: 0, a: 0 });
    expect(BLACK).toEqual({ r: 0, g: 0, b: 0, a: 255 });
    expect(WHITE).toEqual({ r: 255, g: 255, b: 255, a: 255 });
  });
});

describe('rgbaEquals', () => {
  it('is true only when every channel matches', () => {
    expect(rgbaEquals(rgba(1, 2, 3, 4), rgba(1, 2, 3, 4))).toBe(true);
    expect(rgbaEquals(rgba(1, 2, 3, 4), rgba(1, 2, 3, 5))).toBe(false);
    expect(rgbaEquals(BLACK, rgba(0, 0, 0, 254))).toBe(false);
  });
});

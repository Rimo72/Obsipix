import { describe, expect, it } from 'vitest';

import { grayToRgb, hslToRgb, hsvToRgb, rgbToGray, rgbToHsl, rgbToHsv, type RGB } from './convert';

const SAMPLES: RGB[] = [
  { r: 0, g: 0, b: 0 },
  { r: 255, g: 255, b: 255 },
  { r: 255, g: 0, b: 0 },
  { r: 0, g: 128, b: 0 },
  { r: 18, g: 52, b: 200 },
  { r: 200, g: 200, b: 40 },
  { r: 123, g: 45, b: 67 },
];

describe('colour conversions', () => {
  it('rgb → hsv → rgb round-trips exactly', () => {
    for (const rgb of SAMPLES) {
      expect(hsvToRgb(rgbToHsv(rgb))).toEqual(rgb);
    }
  });

  it('rgb → hsl → rgb round-trips exactly', () => {
    for (const rgb of SAMPLES) {
      expect(hslToRgb(rgbToHsl(rgb))).toEqual(rgb);
    }
  });

  it('matches known HSV values', () => {
    expect(rgbToHsv({ r: 255, g: 0, b: 0 })).toMatchObject({ h: 0 });
    expect(rgbToHsv({ r: 0, g: 255, b: 0 }).h).toBeCloseTo(120);
    expect(rgbToHsv({ r: 0, g: 0, b: 255 }).h).toBeCloseTo(240);
    const white = rgbToHsv({ r: 255, g: 255, b: 255 });
    expect(white.s).toBe(0);
    expect(white.v).toBe(1);
  });

  it('hsv construction produces the expected primaries', () => {
    expect(hsvToRgb({ h: 0, s: 1, v: 1 })).toEqual({ r: 255, g: 0, b: 0 });
    expect(hsvToRgb({ h: 120, s: 1, v: 1 })).toEqual({ r: 0, g: 255, b: 0 });
    expect(hsvToRgb({ h: 240, s: 1, v: 1 })).toEqual({ r: 0, g: 0, b: 255 });
    expect(hsvToRgb({ h: 360, s: 1, v: 1 })).toEqual({ r: 255, g: 0, b: 0 }); // wraps to 0
    expect(hsvToRgb({ h: -120, s: 1, v: 1 })).toEqual({ r: 0, g: 0, b: 255 }); // wraps to 240
  });

  it('greyscale luma and back', () => {
    expect(rgbToGray({ r: 255, g: 255, b: 255 })).toBe(255);
    expect(rgbToGray({ r: 0, g: 0, b: 0 })).toBe(0);
    expect(rgbToGray({ r: 255, g: 0, b: 0 })).toBe(76); // 0.299 * 255
    expect(grayToRgb(128)).toEqual({ r: 128, g: 128, b: 128 });
  });

  it('clamps out-of-range hsv/hsl input', () => {
    expect(hsvToRgb({ h: 0, s: 5, v: -1 })).toEqual({ r: 0, g: 0, b: 0 });
    expect(hslToRgb({ h: 0, s: -2, l: 2 })).toEqual({ r: 255, g: 255, b: 255 });
  });
});

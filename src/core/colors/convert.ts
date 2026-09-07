/**
 * Colour-space conversions for the colour selector (PROJECT_CORE §14).
 *
 * Pure, deterministic, browser-free. RGB channels are 0–255 integers on output;
 * hue is 0–360, and saturation / value / lightness are 0–1. Alpha is handled by
 * the caller — these functions never touch it.
 */

export interface RGB {
  readonly r: number;
  readonly g: number;
  readonly b: number;
}

export interface HSV {
  readonly h: number;
  readonly s: number;
  readonly v: number;
}

export interface HSL {
  readonly h: number;
  readonly s: number;
  readonly l: number;
}

const clamp01 = (n: number): number => Math.min(1, Math.max(0, n));
const channel = (n: number): number => Math.min(255, Math.max(0, Math.round(n)));
const wrapHue = (h: number): number => ((h % 360) + 360) % 360;

export function rgbToHsv({ r, g, b }: RGB): HSV {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const delta = max - min;

  let h = 0;
  if (delta !== 0) {
    if (max === rn) {
      h = ((gn - bn) / delta) % 6;
    } else if (max === gn) {
      h = (bn - rn) / delta + 2;
    } else {
      h = (rn - gn) / delta + 4;
    }
    h *= 60;
  }
  return { h: wrapHue(h), s: max === 0 ? 0 : delta / max, v: max };
}

export function hsvToRgb({ h, s, v }: HSV): RGB {
  const hn = wrapHue(h) / 60;
  const sn = clamp01(s);
  const vn = clamp01(v);
  const c = vn * sn;
  const x = c * (1 - Math.abs((hn % 2) - 1));
  const m = vn - c;

  const [r1, g1, b1] =
    hn < 1
      ? [c, x, 0]
      : hn < 2
        ? [x, c, 0]
        : hn < 3
          ? [0, c, x]
          : hn < 4
            ? [0, x, c]
            : hn < 5
              ? [x, 0, c]
              : [c, 0, x];
  return { r: channel((r1 + m) * 255), g: channel((g1 + m) * 255), b: channel((b1 + m) * 255) };
}

export function rgbToHsl(rgb: RGB): HSL {
  const { h, s: sv, v } = rgbToHsv(rgb);
  const l = v * (1 - sv / 2);
  const s = l === 0 || l === 1 ? 0 : (v - l) / Math.min(l, 1 - l);
  return { h, s, l };
}

export function hslToRgb({ h, s, l }: HSL): RGB {
  const sn = clamp01(s);
  const ln = clamp01(l);
  const v = ln + sn * Math.min(ln, 1 - ln);
  const sv = v === 0 ? 0 : 2 * (1 - ln / v);
  return hsvToRgb({ h, s: sv, v });
}

/** Rec. 601 luma — the value shown by the greyscale slider. */
export function rgbToGray({ r, g, b }: RGB): number {
  return channel(0.299 * r + 0.587 * g + 0.114 * b);
}

export function grayToRgb(gray: number): RGB {
  const value = channel(gray);
  return { r: value, g: value, b: value };
}

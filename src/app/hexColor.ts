import { rgba, type RGBA } from '@core/types/color';

/**
 * `#RRGGBB` (alpha omitted when opaque) or `#RRGGBBAA`. Pass `alpha: 'always'`
 * to keep the alpha pair even when the colour is fully opaque.
 */
export function rgbaToHex(color: RGBA, options: { alpha?: 'auto' | 'always' } = {}): string {
  const pair = (value: number): string => value.toString(16).padStart(2, '0');
  const base = `#${pair(color.r)}${pair(color.g)}${pair(color.b)}`;
  return color.a === 255 && options.alpha !== 'always' ? base : `${base}${pair(color.a)}`;
}

/** Parse `#RGB`, `#RGBA`, `#RRGGBB` or `#RRGGBBAA`; returns `null` if it is not valid. */
export function hexToRgba(input: string): RGBA | null {
  const hex = input.trim().replace(/^#/, '');
  const expand = (value: string): string => value.repeat(2);

  let r: string;
  let g: string;
  let b: string;
  let a = 'ff';
  if (/^[0-9a-fA-F]{3}$/.test(hex)) {
    [r, g, b] = [expand(hex[0] ?? ''), expand(hex[1] ?? ''), expand(hex[2] ?? '')];
  } else if (/^[0-9a-fA-F]{4}$/.test(hex)) {
    [r, g, b, a] = [
      expand(hex[0] ?? ''),
      expand(hex[1] ?? ''),
      expand(hex[2] ?? ''),
      expand(hex[3] ?? ''),
    ];
  } else if (/^[0-9a-fA-F]{6}$/.test(hex)) {
    [r, g, b] = [hex.slice(0, 2), hex.slice(2, 4), hex.slice(4, 6)];
  } else if (/^[0-9a-fA-F]{8}$/.test(hex)) {
    [r, g, b, a] = [hex.slice(0, 2), hex.slice(2, 4), hex.slice(4, 6), hex.slice(6, 8)];
  } else {
    return null;
  }

  return rgba(parseInt(r, 16), parseInt(g, 16), parseInt(b, 16), parseInt(a, 16));
}

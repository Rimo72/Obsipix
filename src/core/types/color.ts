/**
 * Color primitives.
 *
 * Obsipix artwork stores actual RGBA values with 8-bit channels. Transparency
 * is represented purely by the alpha channel — there is no "magic" transparent
 * color (PROJECT_CORE §8.3).
 */

export interface RGBA {
  readonly r: number;
  readonly g: number;
  readonly b: number;
  readonly a: number;
}

export const MIN_CHANNEL = 0;
export const MAX_CHANNEL = 255;

export function isChannelValue(value: number): boolean {
  return Number.isInteger(value) && value >= MIN_CHANNEL && value <= MAX_CHANNEL;
}

export function assertChannelValue(value: number, channel: string): void {
  if (!isChannelValue(value)) {
    throw new RangeError(
      `RGBA channel "${channel}" must be an integer in [${MIN_CHANNEL}, ${MAX_CHANNEL}], received ${value}`,
    );
  }
}

/**
 * Construct a validated {@link RGBA}. Alpha defaults to fully opaque.
 * Throws {@link RangeError} for any channel outside `[0, 255]` or non-integer.
 */
export function rgba(r: number, g: number, b: number, a: number = MAX_CHANNEL): RGBA {
  assertChannelValue(r, 'r');
  assertChannelValue(g, 'g');
  assertChannelValue(b, 'b');
  assertChannelValue(a, 'a');
  return { r, g, b, a };
}

/** Exact equality — every channel identical. No visual tolerance. */
export function rgbaEquals(first: RGBA, second: RGBA): boolean {
  return (
    first.r === second.r && first.g === second.g && first.b === second.b && first.a === second.a
  );
}

/** Fully transparent — the value of every freshly created pixel. */
export const TRANSPARENT: RGBA = rgba(0, 0, 0, 0);

/** Opaque black — the default foreground color (PROJECT_CORE §8.8). */
export const BLACK: RGBA = rgba(0, 0, 0, MAX_CHANNEL);

/** Opaque white — the default background color (PROJECT_CORE §8.8). */
export const WHITE: RGBA = rgba(MAX_CHANNEL, MAX_CHANNEL, MAX_CHANNEL, MAX_CHANNEL);

import { assertChannelValue, type RGBA } from '@core/types/color';
import {
  areDimensionsEqual,
  type Dimensions,
  type PixelPoint,
  type PixelRegion,
} from '@core/types/geometry';

const CHANNELS_PER_PIXEL = 4;

function assertValidDimensions(width: number, height: number): void {
  if (!Number.isInteger(width) || !Number.isInteger(height)) {
    throw new RangeError(`PixelBuffer dimensions must be integers, received ${width}x${height}`);
  }
  if (width <= 0 || height <= 0) {
    throw new RangeError(`PixelBuffer dimensions must be positive, received ${width}x${height}`);
  }
}

function assertRegionWithin(source: PixelBuffer, region: PixelRegion): void {
  const { x, y, width, height } = region;
  if (![x, y, width, height].every((n) => Number.isInteger(n))) {
    throw new RangeError('PixelRegion fields must be integers');
  }
  if (width < 0 || height < 0) {
    throw new RangeError(`PixelRegion size must be non-negative, received ${width}x${height}`);
  }
  if (x < 0 || y < 0 || x + width > source.width || y + height > source.height) {
    throw new RangeError(
      `PixelRegion (${x}, ${y}, ${width}x${height}) lies outside source bounds ${source.width}x${source.height}`,
    );
  }
}

/**
 * The lowest-level authoritative artwork container (PROJECT_CORE §21).
 *
 * A `PixelBuffer` owns only pixel data — RGBA, 8-bit, row-major, backed by a
 * `Uint8ClampedArray`. It has no knowledge of layers, frames, tools, history,
 * rendering, React or the browser, and its backing store is never exposed for
 * arbitrary mutation.
 *
 * Pixel index for `(x, y)` is `(y * width + x) * 4`.
 *
 * A buffer can be {@link freeze}-frozen so it becomes read-only — used to let
 * a History snapshot and the live document share a buffer object instead of
 * copying it, until the very first write after the freeze forces a real copy
 * (see `Timeline.ensureNormalCel`, PROJECT_CORE §16).
 */
export class PixelBuffer {
  readonly width: number;
  readonly height: number;
  readonly #data: Uint8ClampedArray;
  #frozen = false;

  private constructor(width: number, height: number, data: Uint8ClampedArray) {
    this.width = width;
    this.height = height;
    this.#data = data;
  }

  /** Create a fully transparent buffer of the given size. */
  static create(width: number, height: number): PixelBuffer {
    assertValidDimensions(width, height);
    return new PixelBuffer(
      width,
      height,
      new Uint8ClampedArray(width * height * CHANNELS_PER_PIXEL),
    );
  }

  /**
   * Create a buffer from existing RGBA bytes. The input is copied — a
   * `PixelBuffer` never takes ownership of caller-provided memory.
   */
  static fromBytes(width: number, height: number, bytes: Uint8ClampedArray): PixelBuffer {
    assertValidDimensions(width, height);
    const expected = width * height * CHANNELS_PER_PIXEL;
    if (bytes.length !== expected) {
      throw new RangeError(
        `PixelBuffer.fromBytes expected ${expected} bytes for ${width}x${height}, received ${bytes.length}`,
      );
    }
    return new PixelBuffer(width, height, new Uint8ClampedArray(bytes));
  }

  get dimensions(): Dimensions {
    return { width: this.width, height: this.height };
  }

  /** Number of pixels (`width * height`). */
  get pixelCount(): number {
    return this.width * this.height;
  }

  /** True when `(x, y)` is an in-bounds integer pixel coordinate. */
  contains(x: number, y: number): boolean {
    return (
      Number.isInteger(x) &&
      Number.isInteger(y) &&
      x >= 0 &&
      y >= 0 &&
      x < this.width &&
      y < this.height
    );
  }

  #indexOf(x: number, y: number): number {
    if (!this.contains(x, y)) {
      throw new RangeError(
        `Pixel (${x}, ${y}) is outside PixelBuffer bounds ${this.width}x${this.height}`,
      );
    }
    return (y * this.width + x) * CHANNELS_PER_PIXEL;
  }

  /**
   * Mark this buffer read-only. Idempotent. Used to let a History snapshot
   * share a buffer object with the live document instead of copying it —
   * `Timeline.ensureNormalCel` clones a frozen buffer, once, the moment
   * something actually tries to draw on it.
   */
  freeze(): void {
    this.#frozen = true;
  }

  /** True once {@link freeze} has been called; further writes throw. */
  get frozen(): boolean {
    return this.#frozen;
  }

  #assertMutable(): void {
    if (this.#frozen) {
      throw new Error(
        'Cannot mutate a frozen PixelBuffer — it is shared with a History snapshot. ' +
          'Obtain a writable buffer via Document.ensureDrawableBuffer / Timeline.ensureNormalCel first.',
      );
    }
  }

  /** Read the pixel at `(x, y)`. Throws {@link RangeError} when out of bounds. */
  getPixel(x: number, y: number): RGBA {
    const index = this.#indexOf(x, y);
    const data = this.#data;
    return {
      r: data[index] ?? 0,
      g: data[index + 1] ?? 0,
      b: data[index + 2] ?? 0,
      a: data[index + 3] ?? 0,
    };
  }

  /**
   * Write the pixel at `(x, y)`. Throws {@link RangeError} when out of bounds
   * or the color is invalid, or a plain `Error` if the buffer is frozen.
   */
  setPixel(x: number, y: number, color: RGBA): void {
    const index = this.#indexOf(x, y);
    assertChannelValue(color.r, 'r');
    assertChannelValue(color.g, 'g');
    assertChannelValue(color.b, 'b');
    assertChannelValue(color.a, 'a');
    this.#assertMutable();
    const data = this.#data;
    data[index] = color.r;
    data[index + 1] = color.g;
    data[index + 2] = color.b;
    data[index + 3] = color.a;
  }

  /** Reset every pixel to fully transparent. */
  clear(): void {
    this.#assertMutable();
    this.#data.fill(0);
  }

  /** An independent deep copy. */
  clone(): PixelBuffer {
    return new PixelBuffer(this.width, this.height, new Uint8ClampedArray(this.#data));
  }

  /**
   * Copy a rectangular region from `source` into this buffer, placing the
   * region's top-left corner at `destination`.
   *
   * `region` must lie fully within `source`. Pixels that would land outside
   * this buffer are clipped away — consistent with "drawing outside the canvas
   * has no effect" (PROJECT_CORE §3.2). Exact bytes, no blending.
   */
  copyRegion(source: PixelBuffer, region: PixelRegion, destination: PixelPoint): void {
    assertRegionWithin(source, region);
    if (!Number.isInteger(destination.x) || !Number.isInteger(destination.y)) {
      throw new RangeError(
        `copyRegion destination must be integer coordinates, received (${destination.x}, ${destination.y})`,
      );
    }
    if (region.width === 0 || region.height === 0) {
      return;
    }
    // `source` is read-only here — only `this` (the destination) must be mutable.
    this.#assertMutable();

    // A view is unsafe when copying within the same buffer; snapshot first.
    const sourceData = source === this ? new Uint8ClampedArray(this.#data) : source.#data;

    const leftSkip = Math.max(0, -destination.x);
    const topSkip = Math.max(0, -destination.y);
    const copyWidth = Math.min(region.width - leftSkip, this.width - (destination.x + leftSkip));
    if (copyWidth <= 0) {
      return;
    }

    for (let row = topSkip; row < region.height; row++) {
      const destinationY = destination.y + row;
      if (destinationY >= this.height) {
        break;
      }
      const sourceStart =
        ((region.y + row) * source.width + (region.x + leftSkip)) * CHANNELS_PER_PIXEL;
      const destinationStart =
        (destinationY * this.width + (destination.x + leftSkip)) * CHANNELS_PER_PIXEL;
      this.#data.set(
        sourceData.subarray(sourceStart, sourceStart + copyWidth * CHANNELS_PER_PIXEL),
        destinationStart,
      );
    }
  }

  /** Exact equality: identical dimensions and byte-for-byte identical pixels. */
  equals(other: PixelBuffer): boolean {
    if (other === this) {
      return true;
    }
    if (!areDimensionsEqual(this.dimensions, other.dimensions)) {
      return false;
    }
    const a = this.#data;
    const b = other.#data;
    for (let i = 0; i < a.length; i++) {
      if (a[i] !== b[i]) {
        return false;
      }
    }
    return true;
  }

  /** A defensive copy of the raw RGBA bytes, for serialization and rendering. */
  toBytes(): Uint8ClampedArray {
    return new Uint8ClampedArray(this.#data);
  }
}

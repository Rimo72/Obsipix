import { describe, expect, it } from 'vitest';

import { composeSpriteSheet } from '@core/persistence/spritesheet';
import { PixelBuffer } from '@core/pixels/PixelBuffer';
import { rgba, type RGBA } from '@core/types/color';

import type { ImageData8 } from './importCommands';
import {
  DEFAULT_SPRITE_SHEET_SLICE,
  describeSpriteSheet,
  planSpriteSheet,
  sliceSpriteSheet,
  type SpriteSheetSlice,
} from './spriteSheetImport';

const slice = (patch: Partial<SpriteSheetSlice> = {}): SpriteSheetSlice => ({
  ...DEFAULT_SPRITE_SHEET_SLICE,
  ...patch,
});

/** An image where every pixel is `paint(x, y)`. */
function image(width: number, height: number, paint: (x: number, y: number) => RGBA): ImageData8 {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const { r, g, b, a } = paint(x, y);
      const i = (y * width + x) * 4;
      data[i] = r;
      data[i + 1] = g;
      data[i + 2] = b;
      data[i + 3] = a;
    }
  }
  return { width, height, data };
}

function toImage(buffer: PixelBuffer): ImageData8 {
  return { width: buffer.width, height: buffer.height, data: buffer.toBytes() };
}

describe('describeSpriteSheet', () => {
  it('splits 128×32 into 4 frames with 32×32 cells', () => {
    const plan = describeSpriteSheet(128, 32, slice({ frameWidth: 32, frameHeight: 32 }));
    expect(plan).toEqual({ ok: true, layout: { columns: 4, rows: 1, frameCount: 4 } });
  });

  it('splits 128×64 into a 4×2 grid of 8 frames', () => {
    const plan = describeSpriteSheet(128, 64, slice({ frameWidth: 32, frameHeight: 32 }));
    expect(plan).toEqual({ ok: true, layout: { columns: 4, rows: 2, frameCount: 8 } });
  });

  it('rejects a plain sheet whose size is not a multiple of the frame size', () => {
    const plan = describeSpriteSheet(128, 64, slice({ frameWidth: 30, frameHeight: 30 }));
    expect(plan.ok).toBe(false);
  });

  it('accepts spacing between frames and skips the divisibility check', () => {
    // 3 cells of 32 with 2px gaps between = 32*3 + 2*2 = 100
    const plan = describeSpriteSheet(
      100,
      32,
      slice({ frameWidth: 32, frameHeight: 32, spacingX: 2 }),
    );
    expect(plan).toEqual({ ok: true, layout: { columns: 3, rows: 1, frameCount: 3 } });
  });

  it('accepts an offset margin', () => {
    const plan = describeSpriteSheet(
      68,
      36,
      slice({ frameWidth: 32, frameHeight: 32, offsetX: 4, offsetY: 4 }),
    );
    expect(plan).toEqual({ ok: true, layout: { columns: 2, rows: 1, frameCount: 2 } });
  });

  it('rejects a frame larger than the image', () => {
    expect(describeSpriteSheet(32, 32, slice({ frameWidth: 64, frameHeight: 64 })).ok).toBe(false);
  });

  it('rejects a non-positive frame size', () => {
    expect(describeSpriteSheet(64, 64, slice({ frameWidth: 0, frameHeight: 32 })).ok).toBe(false);
    expect(describeSpriteSheet(64, 64, slice({ frameWidth: 32, frameHeight: -8 })).ok).toBe(false);
  });

  it('rejects a negative offset or spacing', () => {
    expect(
      describeSpriteSheet(64, 64, slice({ frameWidth: 32, frameHeight: 32, offsetX: -1 })).ok,
    ).toBe(false);
  });

  it('rejects an excessive frame count', () => {
    // 4096×4096 at 1×1 cells → 16.7M frames, far past the cap
    expect(describeSpriteSheet(4096, 4096, slice({ frameWidth: 1, frameHeight: 1 })).ok).toBe(
      false,
    );
  });
});

describe('planSpriteSheet', () => {
  it('throws an EditorError for an invalid configuration', () => {
    expect(() => planSpriteSheet(100, 32, slice({ frameWidth: 30, frameHeight: 30 }))).toThrow(
      /multiple of the frame width/i,
    );
  });
});

describe('sliceSpriteSheet', () => {
  const RED = rgba(200, 30, 30, 255);
  const GREEN = rgba(30, 200, 30, 255);
  const BLUE = rgba(30, 30, 200, 255);

  it('cuts frames in reading order, preserving every RGBA pixel exactly', () => {
    // 3 wide × 2 tall grid of 4×4 cells; colour = its own frame index made visible
    const colours = [
      RED,
      GREEN,
      BLUE,
      rgba(10, 10, 10, 255),
      rgba(90, 90, 90, 128),
      rgba(0, 0, 0, 0),
    ];
    const src = image(12, 8, (x, y) => {
      const index = Math.floor(y / 4) * 3 + Math.floor(x / 4);
      return colours[index] ?? rgba(0, 0, 0, 0);
    });

    const frames = sliceSpriteSheet(src, slice({ frameWidth: 4, frameHeight: 4 }));
    expect(frames).toHaveLength(6);
    frames.forEach((frame, index) => {
      expect(frame.dimensions).toEqual({ width: 4, height: 4 });
      for (let y = 0; y < 4; y += 1) {
        for (let x = 0; x < 4; x += 1) {
          expect(frame.getPixel(x, y)).toEqual(colours[index]);
        }
      }
    });
  });

  it('returns independent buffers — editing one frame never touches another', () => {
    const src = image(8, 4, () => rgba(50, 50, 50, 255));
    const frames = sliceSpriteSheet(src, slice({ frameWidth: 4, frameHeight: 4 }));
    frames[0]?.setPixel(0, 0, rgba(255, 255, 255, 255));
    expect(frames[1]?.getPixel(0, 0)).toEqual({ r: 50, g: 50, b: 50, a: 255 });
  });

  it('keeps a fully transparent region as a valid frame', () => {
    const src = image(12, 4, (x) => (x < 4 || x >= 8 ? rgba(80, 80, 80, 255) : rgba(0, 0, 0, 0)));
    const frames = sliceSpriteSheet(src, slice({ frameWidth: 4, frameHeight: 4 }));
    expect(frames).toHaveLength(3);
    for (let y = 0; y < 4; y += 1) {
      for (let x = 0; x < 4; x += 1) {
        expect(frames[1]?.getPixel(x, y).a).toBe(0);
      }
    }
  });

  it('honours spacing and offset without folding them into the artwork', () => {
    // frame A at (2,2), frame B at (2 + 4 + 3, 2) = (9,2); 3px gap, 2px margin
    const src = image(15, 8, (x, y) => {
      const inA = x >= 2 && x < 6 && y >= 2 && y < 6;
      const inB = x >= 9 && x < 13 && y >= 2 && y < 6;
      if (inA) return rgba(200, 30, 30, 255);
      if (inB) return rgba(30, 30, 200, 255);
      return rgba(0, 0, 0, 0); // margins & gap
    });
    const frames = sliceSpriteSheet(
      src,
      slice({ frameWidth: 4, frameHeight: 4, offsetX: 2, offsetY: 2, spacingX: 3 }),
    );
    expect(frames).toHaveLength(2);
    expect(frames[0]?.getPixel(0, 0)).toEqual({ r: 200, g: 30, b: 30, a: 255 });
    expect(frames[1]?.getPixel(3, 3)).toEqual({ r: 30, g: 30, b: 200, a: 255 });
  });
});

describe('sprite sheet export → import round trip', () => {
  const frame = (fill: RGBA): PixelBuffer => {
    const buffer = PixelBuffer.create(6, 5);
    for (let y = 0; y < 5; y += 1) {
      for (let x = 0; x < 6; x += 1) {
        buffer.setPixel(x, y, fill);
      }
    }
    buffer.setPixel(0, 0, rgba(0, 0, 0, 0)); // a distinguishing transparent corner
    return buffer;
  };

  it('preserves frame count, dimensions, order and pixels (no spacing)', () => {
    const originals = [
      frame(rgba(10, 20, 30, 255)),
      frame(rgba(40, 50, 60, 255)),
      frame(rgba(70, 80, 90, 200)),
    ];
    const sheet = composeSpriteSheet(originals, { layout: 'horizontal', spacing: 0 });

    const frames = sliceSpriteSheet(toImage(sheet), slice({ frameWidth: 6, frameHeight: 5 }));
    expect(frames).toHaveLength(3);
    frames.forEach((restored, index) => {
      expect(restored.equals(originals[index]!)).toBe(true);
    });
  });

  it('preserves pixels when the sheet was written with spacing', () => {
    const originals = [frame(rgba(11, 22, 33, 255)), frame(rgba(99, 88, 77, 255))];
    const sheet = composeSpriteSheet(originals, { layout: 'horizontal', spacing: 2 });

    // composeSpriteSheet pads every edge by `spacing`
    const frames = sliceSpriteSheet(
      toImage(sheet),
      slice({ frameWidth: 6, frameHeight: 5, offsetX: 2, offsetY: 2, spacingX: 2, spacingY: 2 }),
    );
    expect(frames).toHaveLength(2);
    expect(frames[0]?.equals(originals[0]!)).toBe(true);
    expect(frames[1]?.equals(originals[1]!)).toBe(true);
  });
});

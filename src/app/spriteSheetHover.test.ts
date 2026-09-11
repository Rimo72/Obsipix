import { describe, expect, it } from 'vitest';

import type { SpriteSheetLayout, SpriteSheetSlice } from '@core/document/spriteSheetImport';

import { frameAt } from './spriteSheetHover';

const slice: SpriteSheetSlice = {
  frameWidth: 32,
  frameHeight: 32,
  offsetX: 0,
  offsetY: 0,
  spacingX: 0,
  spacingY: 0,
};
const layout: SpriteSheetLayout = { columns: 2, rows: 1, frameCount: 2 };

describe('frameAt', () => {
  it('maps a point to its frame in reading order', () => {
    expect(frameAt(10, 10, slice, layout)).toEqual({ col: 0, row: 0, index: 0 });
    expect(frameAt(40, 10, slice, layout)).toEqual({ col: 1, row: 0, index: 1 });
  });

  it('returns null outside every frame', () => {
    expect(frameAt(-1, 10, slice, layout)).toBeNull();
    expect(frameAt(100, 10, slice, layout)).toBeNull();
    expect(frameAt(10, 40, slice, layout)).toBeNull();
  });

  it('excludes the spacing gap between frames', () => {
    const spaced: SpriteSheetSlice = { ...slice, spacingX: 4 };
    // column 0 spans [0,32), the gap spans [32,36), column 1 starts at 36
    expect(frameAt(33, 10, spaced, layout)).toBeNull();
    expect(frameAt(36, 10, spaced, layout)).toEqual({ col: 1, row: 0, index: 1 });
  });

  it('accounts for an offset before the first frame', () => {
    const offset: SpriteSheetSlice = { ...slice, offsetX: 8, offsetY: 8 };
    expect(frameAt(4, 4, offset, layout)).toBeNull();
    expect(frameAt(10, 10, offset, layout)).toEqual({ col: 0, row: 0, index: 0 });
  });

  it('never returns a frame for non-finite input', () => {
    expect(frameAt(NaN, 10, slice, layout)).toBeNull();
    expect(frameAt(10, Infinity, slice, layout)).toBeNull();
  });
});

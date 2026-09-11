import type { SpriteSheetLayout, SpriteSheetSlice } from '@core/document/spriteSheetImport';

/** The frame cell a preview pointer position falls inside, in reading order. */
export interface HoverFrame {
  readonly col: number;
  readonly row: number;
  /** 0-based index in the same left→right, top→bottom order `sliceSpriteSheet` produces. */
  readonly index: number;
}

/**
 * Pure geometry for the Open PNG preview's hover readout (kept out of the React
 * component so it can be unit-tested without simulating pointer coordinates in
 * jsdom, which does not implement `PointerEvent`).
 */
export function frameAt(
  imgX: number,
  imgY: number,
  slice: SpriteSheetSlice,
  layout: SpriteSheetLayout,
): HoverFrame | null {
  const stepX = slice.frameWidth + slice.spacingX;
  const stepY = slice.frameHeight + slice.spacingY;
  if (!Number.isFinite(imgX) || !Number.isFinite(imgY) || stepX <= 0 || stepY <= 0) {
    return null;
  }
  const relX = imgX - slice.offsetX;
  const relY = imgY - slice.offsetY;
  if (relX < 0 || relY < 0) {
    return null;
  }
  const col = Math.floor(relX / stepX);
  const row = Math.floor(relY / stepY);
  if (col >= layout.columns || row >= layout.rows) {
    return null;
  }
  // inside the gap after a frame, not the frame itself
  if (relX - col * stepX >= slice.frameWidth || relY - row * stepY >= slice.frameHeight) {
    return null;
  }
  return { col, row, index: row * layout.columns + col };
}

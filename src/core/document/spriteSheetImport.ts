import { EditorError } from '@core/errors/EditorError';
import { PixelBuffer } from '@core/pixels/PixelBuffer';

import { MAX_DOCUMENT_DIMENSION } from './defaults';
import { bufferFromImage, type ImageData8 } from './importCommands';

/**
 * Splitting a PNG sprite sheet into animation frames
 * (PROJECT_CORE — "Sprite Sheet PNG Import").
 *
 * Pure geometry + pixel copies: no React, no browser, no history. The importer
 * cuts exact RGBA regions out of the decoded image — no scaling, smoothing or
 * colour conversion — so a region maps to a frame byte-for-byte. Spacing and
 * offsets describe where the frames sit in the sheet and never become part of
 * the frame artwork.
 */

export interface SpriteSheetSlice {
  /** Size of one frame cell, in pixels. */
  readonly frameWidth: number;
  readonly frameHeight: number;
  /** Transparent margin skipped at the top-left before the first frame. */
  readonly offsetX: number;
  readonly offsetY: number;
  /** Gap between adjacent frame cells. */
  readonly spacingX: number;
  readonly spacingY: number;
}

export interface SpriteSheetLayout {
  readonly columns: number;
  readonly rows: number;
  readonly frameCount: number;
}

export type SpriteSheetPlan =
  | { readonly ok: true; readonly layout: SpriteSheetLayout }
  | { readonly ok: false; readonly error: string };

/** A single import may not produce more frames than this (resource guard). */
export const MAX_SPRITE_SHEET_FRAMES = 1024;

export const DEFAULT_SPRITE_SHEET_SLICE: SpriteSheetSlice = {
  frameWidth: 32,
  frameHeight: 32,
  offsetX: 0,
  offsetY: 0,
  spacingX: 0,
  spacingY: 0,
};

function isNonNegativeInt(value: number): boolean {
  return Number.isInteger(value) && value >= 0;
}

/** How many whole cells of `cell` fit in `span` after `offset`, with `gap` between cells. */
function fitCount(span: number, offset: number, cell: number, gap: number): number {
  // offset + n*cell + (n-1)*gap <= span   ⇒   n <= (span - offset + gap) / (cell + gap)
  return Math.floor((span - offset + gap) / (cell + gap));
}

/**
 * Work out the grid a sprite sheet would split into. Never throws — returns a
 * user-readable reason when the configuration cannot produce complete frames,
 * so a dialog can show it live.
 */
export function describeSpriteSheet(
  imageWidth: number,
  imageHeight: number,
  slice: SpriteSheetSlice,
): SpriteSheetPlan {
  const { frameWidth, frameHeight, offsetX, offsetY, spacingX, spacingY } = slice;

  if (!Number.isInteger(frameWidth) || !Number.isInteger(frameHeight)) {
    return { ok: false, error: 'Frame size must be whole numbers of pixels.' };
  }
  if (frameWidth <= 0 || frameHeight <= 0) {
    return { ok: false, error: 'Frame width and height must be at least 1 pixel.' };
  }
  if (frameWidth > MAX_DOCUMENT_DIMENSION || frameHeight > MAX_DOCUMENT_DIMENSION) {
    return {
      ok: false,
      error: `A frame may not exceed ${String(MAX_DOCUMENT_DIMENSION)} pixels on a side.`,
    };
  }
  if (![offsetX, offsetY, spacingX, spacingY].every(isNonNegativeInt)) {
    return { ok: false, error: 'Offset and spacing must be zero or a positive whole number.' };
  }
  if (offsetX >= imageWidth || offsetY >= imageHeight) {
    return { ok: false, error: 'The offset leaves no room for a single frame.' };
  }

  const columns = fitCount(imageWidth, offsetX, frameWidth, spacingX);
  const rows = fitCount(imageHeight, offsetY, frameHeight, spacingY);
  if (columns < 1 || rows < 1) {
    return {
      ok: false,
      error: 'No complete frames fit — check the frame size, spacing and offset.',
    };
  }

  // A plain sheet (no offset, no spacing) must divide evenly so no artwork is
  // silently dropped from a trailing partial frame.
  if (offsetX === 0 && spacingX === 0 && imageWidth % frameWidth !== 0) {
    return {
      ok: false,
      error: `Image width ${String(imageWidth)} is not a multiple of the frame width ${String(frameWidth)}.`,
    };
  }
  if (offsetY === 0 && spacingY === 0 && imageHeight % frameHeight !== 0) {
    return {
      ok: false,
      error: `Image height ${String(imageHeight)} is not a multiple of the frame height ${String(frameHeight)}.`,
    };
  }

  const frameCount = columns * rows;
  if (frameCount > MAX_SPRITE_SHEET_FRAMES) {
    return {
      ok: false,
      error: `That splits into ${String(frameCount)} frames; the limit is ${String(MAX_SPRITE_SHEET_FRAMES)}.`,
    };
  }

  return { ok: true, layout: { columns, rows, frameCount } };
}

/** Like {@link describeSpriteSheet} but throws an {@link EditorError} on an invalid configuration. */
export function planSpriteSheet(
  imageWidth: number,
  imageHeight: number,
  slice: SpriteSheetSlice,
): SpriteSheetLayout {
  const plan = describeSpriteSheet(imageWidth, imageHeight, slice);
  if (!plan.ok) {
    throw new EditorError('import/sprite-sheet-invalid', plan.error);
  }
  return plan.layout;
}

/**
 * Cut `image` into independent frame buffers in reading order (left → right,
 * top → bottom). Each frame is a fresh {@link PixelBuffer} holding an exact copy
 * of its source region; editing one never affects another. A fully transparent
 * region is still returned as a valid frame.
 */
export function sliceSpriteSheet(image: ImageData8, slice: SpriteSheetSlice): PixelBuffer[] {
  const { columns, rows } = planSpriteSheet(image.width, image.height, slice);
  const { frameWidth, frameHeight, offsetX, offsetY, spacingX, spacingY } = slice;
  const source = bufferFromImage(image);

  const frames: PixelBuffer[] = [];
  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < columns; col += 1) {
      const frame = PixelBuffer.create(frameWidth, frameHeight);
      frame.copyRegion(
        source,
        {
          x: offsetX + col * (frameWidth + spacingX),
          y: offsetY + row * (frameHeight + spacingY),
          width: frameWidth,
          height: frameHeight,
        },
        { x: 0, y: 0 },
      );
      frames.push(frame);
    }
  }
  return frames;
}

import { compositeDocument } from '@core/document/compositeDocument';
import type { Document } from '@core/document/Document';
import type { PixelBuffer } from '@core/pixels/PixelBuffer';
import type { RGBA } from '@core/types/color';
import type { FrameId } from '@core/types/ids';

/**
 * Off-canvas painting of composited frames for the timeline thumbnails and the
 * Animation Preview (PROJECT_CORE §110). Always nearest-neighbour, never smoothed,
 * and it only ever reads the document — thumbnails and preview are disposable
 * derived data (§110.3, §110.12).
 */

/** `'checkerboard'` shows transparency; an {@link RGBA} paints a solid background. */
export type FrameBackground = 'checkerboard' | RGBA;

const CHECKER_LIGHT = '#ffffff';
const CHECKER_DARK = '#c7c7c7';

// One reusable scratch canvas holds the 1:1 artwork before it is scaled up.
let scratch: HTMLCanvasElement | null = null;

function scratchContext(width: number, height: number): CanvasRenderingContext2D | null {
  scratch ??= document.createElement('canvas');
  if (scratch.width < width) {
    scratch.width = width;
  }
  if (scratch.height < height) {
    scratch.height = height;
  }
  return scratch.getContext('2d');
}

function paintCheckerboard(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  size: number,
): void {
  ctx.fillStyle = CHECKER_LIGHT;
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = CHECKER_DARK;
  for (let row = 0; row * size < h; row += 1) {
    for (let col = 0; col * size < w; col += 1) {
      if ((row + col) % 2 === 1) {
        ctx.fillRect(col * size, row * size, size, size);
      }
    }
  }
}

/**
 * Draw `buffer` onto `target`'s backing pixels: the background fills the canvas,
 * then the artwork is scaled to fit (preserving aspect) and centred, with
 * smoothing off. Does nothing when a 2D context is unavailable.
 */
export function paintPixelBuffer(
  target: HTMLCanvasElement,
  buffer: PixelBuffer,
  background: FrameBackground,
): void {
  const ctx = target.getContext('2d');
  if (!ctx) {
    return;
  }
  const cw = target.width;
  const ch = target.height;
  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, cw, ch);

  if (background === 'checkerboard') {
    paintCheckerboard(ctx, cw, ch, Math.max(3, Math.round(Math.min(cw, ch) / 8)));
  } else {
    ctx.fillStyle = `rgba(${String(background.r)}, ${String(background.g)}, ${String(
      background.b,
    )}, ${String(background.a / 255)})`;
    ctx.fillRect(0, 0, cw, ch);
  }

  const sctx = scratchContext(buffer.width, buffer.height);
  if (!sctx) {
    return;
  }
  const image = sctx.createImageData(buffer.width, buffer.height);
  image.data.set(buffer.toBytes());
  sctx.putImageData(image, 0, 0);

  const fit = Math.min(cw / buffer.width, ch / buffer.height);
  const dw = buffer.width * fit;
  const dh = buffer.height * fit;
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(
    scratch as HTMLCanvasElement,
    0,
    0,
    buffer.width,
    buffer.height,
    Math.round((cw - dw) / 2),
    Math.round((ch - dh) / 2),
    dw,
    dh,
  );
}

/** Composite `frameId` (default: active frame) of `document` and paint it onto `target`. */
export function paintFrame(
  target: HTMLCanvasElement,
  document: Document,
  frameId: FrameId | undefined,
  background: FrameBackground,
): void {
  paintPixelBuffer(
    target,
    frameId === undefined ? compositeDocument(document) : compositeDocument(document, frameId),
    background,
  );
}

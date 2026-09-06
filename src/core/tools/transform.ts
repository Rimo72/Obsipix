import { PixelBuffer } from '@core/pixels/PixelBuffer';

/** Quarter-turn rotations. */
export type Quarter = 'cw' | 'ccw' | 'half';

export function flipHorizontal(source: PixelBuffer): PixelBuffer {
  const { width, height } = source;
  const out = PixelBuffer.create(width, height);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      out.setPixel(width - 1 - x, y, source.getPixel(x, y));
    }
  }
  return out;
}

export function flipVertical(source: PixelBuffer): PixelBuffer {
  const { width, height } = source;
  const out = PixelBuffer.create(width, height);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      out.setPixel(x, height - 1 - y, source.getPixel(x, y));
    }
  }
  return out;
}

/** Rotate 90° clockwise / counter-clockwise (swaps dimensions) or 180°. */
export function rotateQuarter(source: PixelBuffer, quarter: Quarter): PixelBuffer {
  const { width, height } = source;
  if (quarter === 'half') {
    const out = PixelBuffer.create(width, height);
    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        out.setPixel(width - 1 - x, height - 1 - y, source.getPixel(x, y));
      }
    }
    return out;
  }
  const out = PixelBuffer.create(height, width);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (quarter === 'cw') {
        out.setPixel(height - 1 - y, x, source.getPixel(x, y));
      } else {
        out.setPixel(y, width - 1 - x, source.getPixel(x, y));
      }
    }
  }
  return out;
}

/** Nearest-neighbour resample to a new size — no smoothing (PROJECT_CORE §3.7). */
export function scaleNearest(source: PixelBuffer, width: number, height: number): PixelBuffer {
  if (!Number.isInteger(width) || !Number.isInteger(height) || width <= 0 || height <= 0) {
    throw new RangeError(`Scale target must be positive integers, received ${width}x${height}`);
  }
  const out = PixelBuffer.create(width, height);
  for (let y = 0; y < height; y += 1) {
    const sy = Math.min(source.height - 1, Math.floor((y * source.height) / height));
    for (let x = 0; x < width; x += 1) {
      const sx = Math.min(source.width - 1, Math.floor((x * source.width) / width));
      out.setPixel(x, y, source.getPixel(sx, sy));
    }
  }
  return out;
}

/** New transparent buffer of `width`×`height` with `source` copied in at `(offsetX, offsetY)`. */
export function resizeCanvas(
  source: PixelBuffer,
  width: number,
  height: number,
  offsetX: number,
  offsetY: number,
): PixelBuffer {
  const out = PixelBuffer.create(width, height);
  out.copyRegion(
    source,
    { x: 0, y: 0, width: source.width, height: source.height },
    { x: offsetX, y: offsetY },
  );
  return out;
}

export type AnchorX = 'left' | 'center' | 'right';
export type AnchorY = 'top' | 'center' | 'bottom';

/** Offset of the old content inside the new canvas for a 3×3 anchor (PROJECT_CORE §3.7). */
export function anchorOffset(
  oldWidth: number,
  oldHeight: number,
  newWidth: number,
  newHeight: number,
  anchorX: AnchorX,
  anchorY: AnchorY,
): { x: number; y: number } {
  const dx = newWidth - oldWidth;
  const dy = newHeight - oldHeight;
  const x = anchorX === 'left' ? 0 : anchorX === 'right' ? dx : Math.round(dx / 2);
  const y = anchorY === 'top' ? 0 : anchorY === 'bottom' ? dy : Math.round(dy / 2);
  return { x, y };
}

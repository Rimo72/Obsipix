import { PixelBuffer } from '@core/pixels/PixelBuffer';
import type { RGBA } from '@core/types/color';

/**
 * Compose animation frames into a single sprite-sheet / frame-strip image
 * (PROJECT_CORE §108). Pure — the source document is never touched, and the
 * frames passed in are already flattened, scaled artwork.
 */

export type SheetLayout = 'horizontal' | 'vertical' | 'grid';

export interface SheetOptions {
  readonly layout: SheetLayout;
  /** Columns for the `grid` layout (ignored otherwise). Defaults to a near-square. */
  readonly columns?: number;
  /** Transparent pixels of padding between and around cells. */
  readonly spacing?: number;
  /** Fill colour behind every cell; `null` keeps the sheet transparent. */
  readonly background?: RGBA | null;
}

function gridShape(count: number, options: SheetOptions): { cols: number; rows: number } {
  if (options.layout === 'horizontal') {
    return { cols: count, rows: 1 };
  }
  if (options.layout === 'vertical') {
    return { cols: 1, rows: count };
  }
  const cols = Math.max(1, options.columns ?? Math.ceil(Math.sqrt(count)));
  return { cols, rows: Math.ceil(count / cols) };
}

export function composeSpriteSheet(
  frames: readonly PixelBuffer[],
  options: SheetOptions,
): PixelBuffer {
  if (frames.length === 0) {
    throw new RangeError('A sprite sheet needs at least one frame');
  }
  const cellW = Math.max(...frames.map((f) => f.width));
  const cellH = Math.max(...frames.map((f) => f.height));
  const gap = Math.max(0, Math.round(options.spacing ?? 0));
  const { cols, rows } = gridShape(frames.length, options);

  const width = cols * cellW + (cols + 1) * gap;
  const height = rows * cellH + (rows + 1) * gap;
  const sheet = PixelBuffer.create(width, height);

  if (options.background && options.background.a > 0) {
    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        sheet.setPixel(x, y, options.background);
      }
    }
  }

  frames.forEach((frame, index) => {
    const col = index % cols;
    const row = Math.floor(index / cols);
    const originX = gap + col * (cellW + gap);
    const originY = gap + row * (cellH + gap);
    for (let y = 0; y < frame.height; y += 1) {
      for (let x = 0; x < frame.width; x += 1) {
        const pixel = frame.getPixel(x, y);
        if (pixel.a > 0 || !options.background) {
          sheet.setPixel(originX + x, originY + y, pixel);
        }
      }
    }
  });

  return sheet;
}

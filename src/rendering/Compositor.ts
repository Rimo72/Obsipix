import type { Document } from '@core/document/Document';
import { PixelBuffer } from '@core/pixels/PixelBuffer';
import { rgba } from '@core/types/color';
import type { FrameId } from '@core/types/ids';

function channel(value: number): number {
  return Math.min(255, Math.max(0, Math.round(value)));
}

/** Alpha-composite `source` over `target` in place (source-over), scaling source alpha by `opacity`. */
function blendOver(target: PixelBuffer, source: PixelBuffer, opacity: number): void {
  const { width, height } = target.dimensions;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const src = source.getPixel(x, y);
      const sourceAlpha = (src.a / 255) * opacity;
      if (sourceAlpha <= 0) {
        continue;
      }
      const dst = target.getPixel(x, y);
      const destAlpha = dst.a / 255;
      const outAlpha = sourceAlpha + destAlpha * (1 - sourceAlpha);
      if (outAlpha <= 0) {
        continue;
      }
      const mix = (s: number, d: number): number =>
        channel((s * sourceAlpha + d * destAlpha * (1 - sourceAlpha)) / outAlpha);
      target.setPixel(
        x,
        y,
        rgba(mix(src.r, dst.r), mix(src.g, dst.g), mix(src.b, dst.b), channel(outAlpha * 255)),
      );
    }
  }
}

/**
 * Flatten the visible layers of `document` at the given frame (default: the
 * active frame) into a single RGBA {@link PixelBuffer}, bottom layer first.
 *
 * Pure and browser-free. Hidden layers, fully transparent layers and empty
 * cels contribute nothing; hold cels resolve to earlier artwork via
 * {@link Document.resolveBuffer}. Editor overlays (grid, checkerboard,
 * selection, onion skin) are NEVER part of this result (PROJECT_CORE §11,
 * Rule 12).
 */
export function compositeDocument(document: Document, frameId?: FrameId): PixelBuffer {
  const { width, height } = document.dimensions;
  const output = PixelBuffer.create(width, height);

  for (const layer of document.layers.layers) {
    if (!layer.visible || layer.opacity <= 0) {
      continue;
    }
    const source =
      frameId === undefined
        ? document.resolveBuffer(layer.id)
        : document.resolveBuffer(layer.id, frameId);
    if (!source) {
      continue;
    }
    blendOver(output, source, layer.opacity);
  }

  return output;
}

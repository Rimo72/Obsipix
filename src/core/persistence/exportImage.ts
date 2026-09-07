import { blendOver, compositeDocument } from '@core/document/compositeDocument';
import type { Document } from '@core/document/Document';
import { PixelBuffer } from '@core/pixels/PixelBuffer';
import { scaleNearest } from '@core/tools/transform';
import type { RGBA } from '@core/types/color';
import type { FrameId } from '@core/types/ids';

/**
 * Flattened, export-ready pixel data (PROJECT_CORE §44, §94.30). Editor overlays
 * are never part of the result — {@link compositeDocument} only draws artwork.
 */

/** Composite the frame onto a solid background; `null` keeps it transparent. */
export function flattenOnto(artwork: PixelBuffer, background: RGBA | null): PixelBuffer {
  if (!background || background.a === 0) {
    return artwork.clone();
  }
  const out = PixelBuffer.create(artwork.width, artwork.height);
  for (let y = 0; y < artwork.height; y += 1) {
    for (let x = 0; x < artwork.width; x += 1) {
      out.setPixel(x, y, background);
    }
  }
  blendOver(out, artwork, 1);
  return out;
}

/** Nearest-neighbour integer upscale; `scale === 1` returns a copy. */
export function scaleForExport(buffer: PixelBuffer, scale: number): PixelBuffer {
  const factor = Math.max(1, Math.round(scale));
  return factor === 1
    ? buffer.clone()
    : scaleNearest(buffer, buffer.width * factor, buffer.height * factor);
}

export interface FrameExportOptions {
  readonly scale?: number;
  readonly background?: RGBA | null;
}

/** The flattened, optionally scaled artwork for one frame (defaults: active frame). */
export function exportFrame(
  document: Document,
  frameId?: FrameId,
  options: FrameExportOptions = {},
): PixelBuffer {
  const composite =
    frameId === undefined ? compositeDocument(document) : compositeDocument(document, frameId);
  return scaleForExport(flattenOnto(composite, options.background ?? null), options.scale ?? 1);
}

/** Every frame's flattened artwork, in timeline order (for animation / sheet export). */
export function exportAllFrames(
  document: Document,
  options: FrameExportOptions = {},
): { readonly buffer: PixelBuffer; readonly durationMs: number }[] {
  return document.timeline.frames.map((frame) => ({
    buffer: exportFrame(document, frame.id, options),
    durationMs: frame.durationMs,
  }));
}

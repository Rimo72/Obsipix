import { createDefaultDocument } from '@core/document/DocumentFactory';
import type { Document } from '@core/document/Document';
import { rgba } from '@core/types/color';

/**
 * A default document with a few opaque marker pixels painted in.
 *
 * Phase 4 has no drawing tools yet, so this gives the canvas something exact to
 * display and lets the E2E test confirm document→screen mapping. Phase 5
 * replaces it with the real editor document.
 */
export function buildReferenceDocument(): Document {
  const document = createDefaultDocument();
  const buffer = document.resolveBuffer(document.layers.activeLayerId);
  if (!buffer) {
    return document;
  }

  const { width, height } = document.dimensions;
  buffer.setPixel(0, 0, rgba(255, 0, 0));
  buffer.setPixel(width - 1, 0, rgba(0, 200, 0));
  buffer.setPixel(0, height - 1, rgba(0, 90, 255));
  buffer.setPixel(width - 1, height - 1, rgba(255, 210, 0));

  const cx = Math.floor(width / 2);
  const cy = Math.floor(height / 2);
  const centre: readonly (readonly [number, number])[] = [
    [cx - 1, cy - 1],
    [cx, cy - 1],
    [cx - 1, cy],
    [cx, cy],
  ];
  for (const [x, y] of centre) {
    buffer.setPixel(x, y, rgba(255, 255, 255));
  }

  return document;
}

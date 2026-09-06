import type { PixelBuffer } from '@core/pixels/PixelBuffer';

import { compositeDocument } from './compositeDocument';
import type { Document } from './Document';
import type { OnionSkinSettings } from './OnionSkin';

export interface OnionFrame {
  /** Flattened RGBA bytes of that frame. */
  readonly buffer: PixelBuffer;
  /** 0..1 — nearer frames are more opaque. */
  readonly opacity: number;
  /** `true` for an earlier frame, `false` for a later one. */
  readonly before: boolean;
}

/**
 * The flattened neighbour frames to draw as onion skin behind / over the
 * current frame (PROJECT_CORE §9). Purely a viewport overlay — the result is
 * never written into a cel or an export.
 */
export function onionSkinFrames(document: Document, settings: OnionSkinSettings): OnionFrame[] {
  if (!settings.enabled) {
    return [];
  }
  const frames = document.timeline.frames;
  const current = document.timeline.indexOf(document.timeline.activeFrameId);
  const result: OnionFrame[] = [];

  for (let step = 1; step <= settings.previous; step += 1) {
    const index = current - step;
    const frame = frames[index];
    if (frame) {
      result.push({
        buffer: compositeDocument(document, frame.id),
        opacity: settings.opacity / step,
        before: true,
      });
    }
  }
  for (let step = 1; step <= settings.next; step += 1) {
    const frame = frames[current + step];
    if (frame) {
      result.push({
        buffer: compositeDocument(document, frame.id),
        opacity: settings.opacity / step,
        before: false,
      });
    }
  }
  return result;
}

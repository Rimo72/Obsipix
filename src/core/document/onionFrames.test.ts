import { describe, expect, it } from 'vitest';

import { BLACK, rgbaEquals } from '@core/types/color';

import { createDefaultDocument } from './DocumentFactory';
import { createSequentialIdFactory } from './IdFactory';
import { onionSkinFrames } from './onionFrames';

function threeFrameDoc() {
  const document = createDefaultDocument(createSequentialIdFactory());
  const layerId = document.layers.activeLayerId;
  document.resolveBuffer(layerId, document.timeline.activeFrameId)?.setPixel(0, 0, BLACK);

  const f2 = document.addFrame();
  document.resolveBuffer(layerId, f2)?.setPixel(1, 1, BLACK);
  const f3 = document.addFrame();
  document.resolveBuffer(layerId, f3)?.setPixel(2, 2, BLACK);

  document.setActiveFrame(f2); // middle frame active
  return document;
}

describe('onionSkinFrames', () => {
  it('returns nothing while disabled', () => {
    const document = threeFrameDoc();
    expect(onionSkinFrames(document, document.timeline.onionSkin)).toEqual([]);
  });

  it('returns the neighbour frames with decreasing opacity', () => {
    const document = threeFrameDoc();
    document.timeline.setOnionSkin({ enabled: true, previous: 1, next: 1, opacity: 0.5 });

    const frames = onionSkinFrames(document, document.timeline.onionSkin);
    expect(frames).toHaveLength(2);

    const before = frames.find((frame) => frame.before);
    const after = frames.find((frame) => !frame.before);
    expect(before).toBeDefined();
    expect(after).toBeDefined();
    // previous frame drew (0,0); next frame drew (2,2)
    expect(rgbaEquals(before!.buffer.getPixel(0, 0), BLACK)).toBe(true);
    expect(rgbaEquals(after!.buffer.getPixel(2, 2), BLACK)).toBe(true);
    expect(before!.opacity).toBeCloseTo(0.5);
  });

  it('honours the previous / next counts and clamps at the ends', () => {
    const document = threeFrameDoc();
    document.setActiveFrame(document.timeline.frameAt(0).id);
    document.timeline.setOnionSkin({ enabled: true, previous: 4, next: 4, opacity: 0.4 });

    const frames = onionSkinFrames(document, document.timeline.onionSkin);
    // frame 0 has no previous, only two later frames
    expect(frames.every((frame) => !frame.before)).toBe(true);
    expect(frames).toHaveLength(2);
  });
});

import { beforeEach, describe, expect, it } from 'vitest';

import { PixelBuffer } from '@core/pixels/PixelBuffer';
import { BLACK, TRANSPARENT, rgbaEquals } from '@core/types/color';
import type { LayerId } from '@core/types/ids';

import { Cel } from './Cel';
import { Frame } from './Frame';
import { Timeline } from './Timeline';
import { createSequentialIdFactory } from './IdFactory';

const DIMENSIONS = { width: 4, height: 4 };
const LAYER = 'lyr_1' as LayerId;

function newTimeline(): Timeline {
  const ids = createSequentialIdFactory();
  const first = new Frame(ids.frame());
  first.setCel(LAYER, Cel.normal(ids.cel(), PixelBuffer.create(4, 4)));
  return new Timeline(ids, DIMENSIONS, first);
}

describe('Timeline frame operations', () => {
  let timeline: Timeline;
  beforeEach(() => {
    timeline = newTimeline();
  });

  it('appends an empty frame with an empty cel per layer', () => {
    const frame = timeline.appendEmptyFrame([LAYER]);
    expect(timeline.frameCount).toBe(2);
    expect(frame.requireCel(LAYER).isEmpty).toBe(true);
  });

  it('duplicates a frame with independent pixel data', () => {
    const original = timeline.frameAt(0);
    original.requireCel(LAYER).requireBuffer().setPixel(0, 0, BLACK);

    const copy = timeline.duplicateFrame(original.id);
    expect(timeline.frames.map((f) => f.id)).toEqual([original.id, copy.id]);

    copy.requireCel(LAYER).requireBuffer().setPixel(1, 1, BLACK);
    expect(rgbaEquals(original.requireCel(LAYER).requireBuffer().getPixel(1, 1), TRANSPARENT)).toBe(
      true,
    );
  });

  it('refuses to remove the last frame', () => {
    expect(() => {
      timeline.removeFrame(timeline.frameAt(0).id);
    }).toThrow(/last frame/);
  });
});

describe('Timeline hold cels', () => {
  it('resolve to the previous frame’s effective artwork', () => {
    const timeline = newTimeline();
    timeline.frameAt(0).requireCel(LAYER).requireBuffer().setPixel(2, 2, BLACK);
    const held = timeline.appendEmptyFrame([LAYER]);

    timeline.holdCel(held.id, LAYER);

    const resolved = timeline.resolveBuffer(1, LAYER);
    expect(resolved).toBe(timeline.resolveBuffer(0, LAYER));
    expect(resolved && rgbaEquals(resolved.getPixel(2, 2), BLACK)).toBe(true);
  });

  it('resolve to null on the first frame', () => {
    const timeline = newTimeline();
    timeline.holdCel(timeline.frameAt(0).id, LAYER);
    expect(timeline.resolveBuffer(0, LAYER)).toBeNull();
  });
});

describe('Timeline empty cels', () => {
  it('resolve to null', () => {
    const timeline = newTimeline();
    const frame = timeline.appendEmptyFrame([LAYER]);
    expect(timeline.resolveBuffer(timeline.indexOf(frame.id), LAYER)).toBeNull();
  });
});

describe('Timeline linked cels', () => {
  it('share pixel data across frames until Make Unique', () => {
    const timeline = newTimeline();
    const source = timeline.frameAt(0);
    const target = timeline.appendEmptyFrame([LAYER]);

    timeline.linkCel(source.id, target.id, LAYER);
    expect(target.requireCel(LAYER).isLinked).toBe(true);

    // editing the source buffer shows through the linked frame
    timeline.resolveBuffer(0, LAYER)?.setPixel(3, 3, BLACK);
    const linkedView = timeline.resolveBuffer(1, LAYER);
    expect(linkedView && rgbaEquals(linkedView.getPixel(3, 3), BLACK)).toBe(true);

    timeline.makeCelUnique(target.id, LAYER);
    expect(target.requireCel(LAYER).type).toBe('normal');
    timeline.resolveBuffer(0, LAYER)?.setPixel(0, 0, BLACK);
    expect(rgbaEquals(timeline.resolveBuffer(1, LAYER)?.getPixel(0, 0) ?? BLACK, TRANSPARENT)).toBe(
      true,
    );
  });
});

describe('Timeline playback + onion-skin settings', () => {
  it('defaults to 12 fps and disabled onion skin', () => {
    const timeline = newTimeline();
    expect(timeline.playbackFps).toBe(12);
    expect(timeline.onionSkin).toEqual({
      enabled: false,
      previous: 1,
      next: 1,
      opacity: 0.4,
    });
  });

  it('applyUniformFps sets playbackFps and every frame duration', () => {
    const timeline = newTimeline();
    timeline.appendEmptyFrame([LAYER]);
    timeline.applyUniformFps(10);
    expect(timeline.playbackFps).toBe(10);
    expect(timeline.frames.map((frame) => frame.durationMs)).toEqual([100, 100]);
    expect(timeline.durationMs).toBe(200);
  });

  it('clamps onion-skin settings to sane ranges', () => {
    const timeline = newTimeline();
    timeline.setOnionSkin({ previous: 99, next: -3, opacity: 5 });
    expect(timeline.onionSkin.previous).toBe(8);
    expect(timeline.onionSkin.next).toBe(0);
    expect(timeline.onionSkin.opacity).toBe(1);
  });

  it('carries playback + onion settings through clone', () => {
    const timeline = newTimeline();
    timeline.setPlaybackFps(24);
    timeline.setOnionSkin({ enabled: true, previous: 3 });
    const copy = timeline.clone();
    expect(copy.playbackFps).toBe(24);
    expect(copy.onionSkin).toEqual({ enabled: true, previous: 3, next: 1, opacity: 0.4 });
  });
});

describe('Timeline.clone', () => {
  it('is cheap: unrelated frames keep sharing the exact same buffer object', () => {
    const timeline = newTimeline();
    timeline.appendEmptyFrame([LAYER]);
    timeline.ensureNormalCel(1, LAYER);

    const copy = timeline.clone();
    // no pixel data was copied — the copy's frames still reference the very
    // same buffer objects as the original, just frozen
    expect(copy.resolveBuffer(0, LAYER)).toBe(timeline.resolveBuffer(0, LAYER));
    expect(copy.resolveBuffer(1, LAYER)).toBe(timeline.resolveBuffer(1, LAYER));
    expect(copy.resolveBuffer(0, LAYER)?.frozen).toBe(true);
  });

  it('keeps linked cels linked within the copy, and diverges independently on write', () => {
    const timeline = newTimeline();
    const source = timeline.frameAt(0);
    const target = timeline.appendEmptyFrame([LAYER]);
    timeline.linkCel(source.id, target.id, LAYER);

    const copy = timeline.clone();
    copy.ensureNormalCel(0, LAYER).setPixel(1, 1, BLACK);
    expect(rgbaEquals(copy.resolveBuffer(1, LAYER)?.getPixel(1, 1) ?? TRANSPARENT, BLACK)).toBe(
      true,
    );

    // untouched frames elsewhere in the copy still share the original object
    // ... and the original document is entirely unaffected by the copy's edit
    expect(rgbaEquals(timeline.resolveBuffer(1, LAYER)?.getPixel(1, 1) ?? BLACK, TRANSPARENT)).toBe(
      true,
    );
  });

  it('a write to the original after cloning never leaks into the copy', () => {
    const timeline = newTimeline();
    const copy = timeline.clone();

    timeline.ensureNormalCel(0, LAYER).setPixel(2, 2, BLACK);

    expect(rgbaEquals(timeline.resolveBuffer(0, LAYER)?.getPixel(2, 2) ?? TRANSPARENT, BLACK)).toBe(
      true,
    );
    expect(rgbaEquals(copy.resolveBuffer(0, LAYER)?.getPixel(2, 2) ?? BLACK, TRANSPARENT)).toBe(
      true,
    );
  });
});

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

describe('Timeline.clone', () => {
  it('keeps linked cels linked within the copy', () => {
    const timeline = newTimeline();
    const source = timeline.frameAt(0);
    const target = timeline.appendEmptyFrame([LAYER]);
    timeline.linkCel(source.id, target.id, LAYER);

    const copy = timeline.clone(new Map<PixelBuffer, PixelBuffer>());
    copy.resolveBuffer(0, LAYER)?.setPixel(1, 1, BLACK);
    expect(rgbaEquals(copy.resolveBuffer(1, LAYER)?.getPixel(1, 1) ?? TRANSPARENT, BLACK)).toBe(
      true,
    );

    // and independent from the original
    expect(rgbaEquals(timeline.resolveBuffer(1, LAYER)?.getPixel(1, 1) ?? BLACK, TRANSPARENT)).toBe(
      true,
    );
  });
});

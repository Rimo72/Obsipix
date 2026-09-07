import { describe, expect, it } from 'vitest';

import { PixelBuffer } from '@core/pixels/PixelBuffer';
import { TRANSPARENT, rgba, rgbaEquals } from '@core/types/color';

import { DocumentFactory, createDefaultDocument } from './DocumentFactory';
import { createSequentialIdFactory } from './IdFactory';
import { assertDocumentInvariants } from './invariants';

describe('DocumentFactory.createDefault', () => {
  it('produces the canonical 32x32 starting document', () => {
    const document = createDefaultDocument(createSequentialIdFactory());

    expect(document.dimensions).toEqual({ width: 32, height: 32 });
    expect(document.metadata.name).toBe('Untitled');
    expect(document.layers.count).toBe(1);
    expect(document.layers.layers[0]?.name).toBe('Layer 1');
    expect(document.timeline.frameCount).toBe(1);
    expect(document.palettes).toHaveLength(1);
    expect(document.palettes[0]?.colors).toHaveLength(16);
    expect(document.activePaletteId).toBe(document.palettes[0]?.id);
    expect(document.selection.active).toBe(false);
    expect(document.isDirty).toBe(false);
    expect(document.revision).toBe(0);
  });

  it('starts with one transparent normal cel', () => {
    const document = createDefaultDocument(createSequentialIdFactory());
    const layerId = document.layers.activeLayerId;
    const buffer = document.resolveBuffer(layerId);
    expect(buffer).not.toBeNull();
    expect(rgbaEquals(buffer?.getPixel(0, 0) ?? TRANSPARENT, TRANSPARENT)).toBe(true);
    expect(buffer?.getPixel(31, 31)).toBeDefined();
  });

  it('passes its own invariant checks', () => {
    expect(() => {
      assertDocumentInvariants(createDefaultDocument(createSequentialIdFactory()));
    }).not.toThrow();
  });

  it('honours explicit dimensions and rejects invalid ones', () => {
    const custom = new DocumentFactory(createSequentialIdFactory()).create({
      width: 8,
      height: 12,
      name: 'Sprite',
    });
    expect(custom.dimensions).toEqual({ width: 8, height: 12 });
    expect(custom.metadata.name).toBe('Sprite');

    expect(() => new DocumentFactory().create({ width: 0, height: 4 })).toThrow(RangeError);
  });

  it('gives every generated id a distinct value', () => {
    const document = createDefaultDocument(createSequentialIdFactory());
    const ids = [
      document.id,
      document.layers.activeLayerId,
      document.timeline.activeFrameId,
      document.timeline.frames[0]?.requireCel(document.layers.activeLayerId).id,
    ];
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('DocumentFactory.createFromFrames', () => {
  const cell = (fill: ReturnType<typeof rgba>): PixelBuffer => {
    const buffer = PixelBuffer.create(4, 3);
    buffer.setPixel(0, 0, fill);
    return buffer;
  };

  it('builds one frame per buffer on a single layer, sized to the frames', () => {
    const document = new DocumentFactory(createSequentialIdFactory()).createFromFrames(
      [cell(rgba(10, 0, 0, 255)), cell(rgba(0, 20, 0, 255)), cell(rgba(0, 0, 30, 255))],
      { name: 'Walk' },
    );

    expect(document.dimensions).toEqual({ width: 4, height: 3 });
    expect(document.metadata.name).toBe('Walk');
    expect(document.layers.count).toBe(1);
    expect(document.timeline.frameCount).toBe(3);
    expect(() => {
      assertDocumentInvariants(document);
    }).not.toThrow();

    const layerId = document.layers.activeLayerId;
    const [f0, f1, f2] = document.timeline.frames;
    expect(document.resolveBuffer(layerId, f0!.id)?.getPixel(0, 0)).toEqual({
      r: 10,
      g: 0,
      b: 0,
      a: 255,
    });
    expect(document.resolveBuffer(layerId, f2!.id)?.getPixel(0, 0)).toEqual({
      r: 0,
      g: 0,
      b: 30,
      a: 255,
    });
    // frames are independent
    document.resolveBuffer(layerId, f0!.id)?.setPixel(1, 1, rgba(255, 255, 255, 255));
    expect(document.resolveBuffer(layerId, f1!.id)?.getPixel(1, 1).a).toBe(0);
  });

  it('accepts a single frame', () => {
    const document = new DocumentFactory(createSequentialIdFactory()).createFromFrames([
      cell(rgba(1, 2, 3, 255)),
    ]);
    expect(document.timeline.frameCount).toBe(1);
  });

  it('rejects zero frames and mismatched dimensions', () => {
    const factory = new DocumentFactory(createSequentialIdFactory());
    expect(() => factory.createFromFrames([])).toThrow(RangeError);
    expect(() =>
      factory.createFromFrames([PixelBuffer.create(4, 4), PixelBuffer.create(4, 5)]),
    ).toThrow(RangeError);
  });
});

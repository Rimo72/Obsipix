import { describe, expect, it } from 'vitest';

import { TRANSPARENT, rgbaEquals } from '@core/types/color';

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

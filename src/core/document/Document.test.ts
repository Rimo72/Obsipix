import { beforeEach, describe, expect, it } from 'vitest';

import { BLACK, TRANSPARENT, rgbaEquals } from '@core/types/color';

import type { Document } from './Document';
import { createDefaultDocument } from './DocumentFactory';
import { createSequentialIdFactory } from './IdFactory';
import { assertDocumentInvariants } from './invariants';

function newDocument(): Document {
  return createDefaultDocument(createSequentialIdFactory());
}

describe('Document layers', () => {
  let document: Document;
  beforeEach(() => {
    document = newDocument();
  });

  it('adds a layer, makes it active, and gives every frame a cel for it', () => {
    document.addEmptyFrame();
    const layerId = document.addLayer();

    expect(document.layers.count).toBe(2);
    expect(document.layers.activeLayerId).toBe(layerId);
    for (const frame of document.timeline.frames) {
      expect(frame.hasCel(layerId)).toBe(true);
    }
    assertDocumentInvariants(document);
  });

  it('removes a layer and its cels from every frame', () => {
    document.addEmptyFrame();
    const layerId = document.addLayer();
    document.removeLayer(layerId);

    expect(document.layers.count).toBe(1);
    for (const frame of document.timeline.frames) {
      expect(frame.hasCel(layerId)).toBe(false);
    }
    assertDocumentInvariants(document);
  });

  it('duplicates a layer with independent pixel data', () => {
    const original = document.layers.activeLayerId;
    document.resolveBuffer(original)?.setPixel(0, 0, BLACK);

    const copyId = document.duplicateLayer(original);
    document.resolveBuffer(copyId)?.setPixel(1, 1, BLACK);

    expect(rgbaEquals(document.resolveBuffer(original)?.getPixel(1, 1) ?? BLACK, TRANSPARENT)).toBe(
      true,
    );
  });

  it('keeps layer ids stable across a reorder', () => {
    const first = document.layers.activeLayerId;
    const second = document.addLayer();
    document.moveLayer(second, 0);
    expect(document.layers.layerIds()).toEqual([second, first]);
  });
});

describe('Document frames', () => {
  it('adds, duplicates and removes frames while keeping the grid complete', () => {
    const document = newDocument();
    const layerId = document.layers.activeLayerId;

    const second = document.addEmptyFrame();
    const third = document.duplicateFrame(second);
    expect(document.timeline.frameCount).toBe(3);

    document.removeFrame(third);
    expect(document.timeline.frameCount).toBe(2);
    for (const frame of document.timeline.frames) {
      expect(frame.hasCel(layerId)).toBe(true);
    }
    assertDocumentInvariants(document);
  });
});

describe('Document cels', () => {
  it('links a cel across frames and resolves shared pixels', () => {
    const document = newDocument();
    const layerId = document.layers.activeLayerId;
    const sourceFrame = document.timeline.activeFrameId;
    const targetFrame = document.addEmptyFrame();

    document.linkCel(sourceFrame, targetFrame, layerId);
    document.resolveBuffer(layerId, sourceFrame)?.setPixel(2, 2, BLACK);

    expect(
      rgbaEquals(
        document.resolveBuffer(layerId, targetFrame)?.getPixel(2, 2) ?? TRANSPARENT,
        BLACK,
      ),
    ).toBe(true);
  });

  it('resolves a hold cel to the previous frame', () => {
    const document = newDocument();
    const layerId = document.layers.activeLayerId;
    document.resolveBuffer(layerId)?.setPixel(1, 1, BLACK);
    const secondFrame = document.addEmptyFrame();
    document.holdCel(secondFrame, layerId);

    expect(
      rgbaEquals(
        document.resolveBuffer(layerId, secondFrame)?.getPixel(1, 1) ?? TRANSPARENT,
        BLACK,
      ),
    ).toBe(true);
  });
});

describe('Document.ensureDrawableBuffer', () => {
  it('returns the active normal cel buffer directly', () => {
    const document = newDocument();
    const direct = document.resolveBuffer(document.layers.activeLayerId);
    expect(document.ensureDrawableBuffer()).toBe(direct);
  });

  it('converts an empty cel into a drawable normal cel', () => {
    const document = newDocument();
    const layerId = document.layers.activeLayerId;
    const frameId = document.addEmptyFrame();
    document.setActiveFrame(frameId);

    const buffer = document.ensureDrawableBuffer();
    buffer.setPixel(0, 0, BLACK);

    expect(document.timeline.requireFrame(frameId).requireCel(layerId).type).toBe('normal');
    expect(
      rgbaEquals(document.resolveBuffer(layerId, frameId)?.getPixel(0, 0) ?? TRANSPARENT, BLACK),
    ).toBe(true);
  });

  it('seeds a hold cel from the artwork it was showing', () => {
    const document = newDocument();
    const layerId = document.layers.activeLayerId;
    document.resolveBuffer(layerId)?.setPixel(3, 3, BLACK);
    const frameId = document.addEmptyFrame();
    document.holdCel(frameId, layerId);
    document.setActiveFrame(frameId);

    const buffer = document.ensureDrawableBuffer();
    expect(rgbaEquals(buffer.getPixel(3, 3), BLACK)).toBe(true);
  });
});

describe('Document revision tracking', () => {
  it('is clean when created and dirty after a revision advance', () => {
    const document = newDocument();
    expect(document.isDirty).toBe(false);

    document.advanceRevision();
    expect(document.isDirty).toBe(true);
    expect(document.revision).toBe(1);
    expect(document.savedRevision).toBe(0);

    document.markSaved();
    expect(document.isDirty).toBe(false);
    expect(document.savedRevision).toBe(1);
  });
});

describe('Document.clone', () => {
  it('is a deep, independent copy', () => {
    const document = newDocument();
    const layerId = document.layers.activeLayerId;
    document.resolveBuffer(layerId)?.setPixel(0, 0, BLACK);

    const copy = document.clone();
    copy.resolveBuffer(layerId)?.setPixel(5, 5, BLACK);
    copy.layers.activeLayer.rename('changed');

    expect(rgbaEquals(document.resolveBuffer(layerId)?.getPixel(5, 5) ?? BLACK, TRANSPARENT)).toBe(
      true,
    );
    expect(document.layers.activeLayer.name).toBe('Layer 1');
    expect(copy.revision).toBe(document.revision);
  });

  it('preserves linked-cel sharing inside the copy', () => {
    const document = newDocument();
    const layerId = document.layers.activeLayerId;
    const sourceFrame = document.timeline.activeFrameId;
    const targetFrame = document.addEmptyFrame();
    document.linkCel(sourceFrame, targetFrame, layerId);

    const copy = document.clone();
    copy.resolveBuffer(layerId, sourceFrame)?.setPixel(3, 3, BLACK);

    expect(
      rgbaEquals(copy.resolveBuffer(layerId, targetFrame)?.getPixel(3, 3) ?? TRANSPARENT, BLACK),
    ).toBe(true);
    expect(
      rgbaEquals(
        document.resolveBuffer(layerId, targetFrame)?.getPixel(3, 3) ?? BLACK,
        TRANSPARENT,
      ),
    ).toBe(true);
  });
});

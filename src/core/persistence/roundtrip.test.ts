import { describe, expect, it } from 'vitest';

import type { Document } from '@core/document/Document';
import { createDefaultDocument } from '@core/document/DocumentFactory';
import { createSequentialIdFactory } from '@core/document/IdFactory';
import { BLACK, WHITE, rgba, rgbaEquals } from '@core/types/color';

import { ObsipixParseError } from './format';
import { parseDocument } from './parse';
import { serializeDocument } from './serialize';

/** A structural summary that captures everything a save must preserve. */
function fingerprint(document: Document): unknown {
  return {
    dimensions: document.dimensions,
    name: document.metadata.name,
    layers: document.layers.layers.map((layer) => ({
      name: layer.name,
      visible: layer.visible,
      locked: layer.locked,
      opacity: layer.opacity,
    })),
    frames: document.timeline.frames.map((frame, frameIndex) => ({
      durationMs: frame.durationMs,
      cels: document.layers.layerIds().map((layerId) => {
        const cel = frame.requireCel(layerId);
        const effective = document.resolveBuffer(layerId, frame.id);
        return {
          type: cel.type,
          pixels: effective ? Array.from(effective.toBytes()) : null,
          frameIndex,
        };
      }),
    })),
    tags: document.timeline.tags.map((tag) => ({
      name: tag.name,
      startFrame: tag.startFrame,
      endFrame: tag.endFrame,
      direction: tag.direction,
      color: tag.color ?? null,
      fps: tag.fps ?? null,
    })),
  };
}

function reload(document: Document): Document {
  return parseDocument(serializeDocument(document), createSequentialIdFactory());
}

function buildRichDocument(): Document {
  const document = createDefaultDocument(createSequentialIdFactory());
  document.metadata.name = 'Round trip';

  const base = document.layers.activeLayerId;
  document.layers.require(base).rename('Background');
  document.resolveBuffer(base)?.setPixel(0, 0, rgba(10, 20, 30, 40));
  document.resolveBuffer(base)?.setPixel(31, 31, WHITE);

  const overlay = document.addLayer('Overlay');
  document.layers.require(overlay).setOpacity(0.5);
  document.layers.require(overlay).setLocked(true);
  document.resolveBuffer(overlay)?.setPixel(5, 5, BLACK);

  const hidden = document.addLayer('Hidden');
  document.layers.require(hidden).setVisible(false);

  // frame 2: duplicate (independent normal cels), custom duration
  const frame1 = document.timeline.activeFrameId;
  const frame2 = document.duplicateFrame(frame1);
  document.timeline.requireFrame(frame2).setDurationMs(250);
  document.resolveBuffer(base, frame2)?.setPixel(1, 1, rgba(99, 88, 77, 255));

  // frame 3: empty on base, linked overlay, hold hidden
  const frame3 = document.addEmptyFrame();
  document.linkCel(frame1, frame3, overlay);
  document.holdCel(frame3, hidden);

  // a tag
  document.timeline.addTag({
    name: 'walk',
    startFrame: 0,
    endFrame: 2,
    direction: 'ping-pong',
    color: rgba(255, 128, 0, 255),
    fps: 12,
  });

  document.setActiveLayer(overlay);
  document.setActiveFrame(frame2);
  return document;
}

describe('.obsipix round trip', () => {
  it('produces the same editable state', () => {
    const original = buildRichDocument();
    const reloaded = reload(original);
    expect(fingerprint(reloaded)).toEqual(fingerprint(original));
  });

  it('preserves the default document exactly', () => {
    const original = createDefaultDocument(createSequentialIdFactory());
    expect(fingerprint(reload(original))).toEqual(fingerprint(original));
  });

  it('is deterministic', () => {
    const document = buildRichDocument();
    expect(Array.from(serializeDocument(document))).toEqual(
      Array.from(serializeDocument(buildRichDocument())),
    );
  });

  it('keeps linked cels linked after reload', () => {
    const reloaded = reload(buildRichDocument());
    const overlay = reloaded.layers.layers.find((layer) => layer.name === 'Overlay');
    expect(overlay).toBeDefined();
    if (!overlay) {
      return;
    }
    const [frame1, , frame3] = reloaded.timeline.frames;
    if (!frame1 || !frame3) {
      throw new Error('frames missing');
    }
    reloaded.resolveBuffer(overlay.id, frame1.id)?.setPixel(9, 9, WHITE);
    expect(
      rgbaEquals(reloaded.resolveBuffer(overlay.id, frame3.id)?.getPixel(9, 9) ?? BLACK, WHITE),
    ).toBe(true);
  });

  it('restores the active layer and frame', () => {
    const original = buildRichDocument();
    const reloaded = reload(original);
    const activeLayerName = reloaded.layers.activeLayer.name;
    const activeFrameIndex = reloaded.timeline.indexOf(reloaded.timeline.activeFrameId);
    expect(activeLayerName).toBe('Overlay');
    expect(activeFrameIndex).toBe(1);
  });

  it('loads a saved project as clean (not dirty)', () => {
    expect(reload(buildRichDocument()).isDirty).toBe(false);
  });
});

describe('.obsipix corruption handling', () => {
  const validFile = (): Uint8Array =>
    serializeDocument(createDefaultDocument(createSequentialIdFactory()));

  const flip = (bytes: Uint8Array, index: number): Uint8Array => {
    const at = index < 0 ? bytes.length + index : index;
    bytes[at] = (bytes[at] ?? 0) ^ 0xff;
    return bytes;
  };

  it('rejects a file with a bad signature', () => {
    expect(() => parseDocument(flip(validFile(), 1))).toThrow(ObsipixParseError);
  });

  it('rejects a file with a broken checksum', () => {
    expect(() => parseDocument(flip(validFile(), -1))).toThrow(/checksum/i);
  });

  it('rejects a truncated file', () => {
    expect(() => parseDocument(validFile().subarray(0, 20))).toThrow(ObsipixParseError);
  });

  it('rejects a flipped byte in the middle of the data', () => {
    expect(() => parseDocument(flip(validFile(), 40))).toThrow(ObsipixParseError);
  });

  it('rejects random bytes', () => {
    expect(() => parseDocument(new Uint8Array(64).fill(7))).toThrow(ObsipixParseError);
  });
});

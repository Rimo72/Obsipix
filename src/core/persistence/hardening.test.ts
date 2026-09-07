import { describe, expect, it } from 'vitest';

import { createDefaultDocument, DocumentFactory } from '@core/document/DocumentFactory';
import { MAX_DOCUMENT_DIMENSION } from '@core/document/defaults';
import { createSequentialIdFactory } from '@core/document/IdFactory';
import { History } from '@core/history/History';
import { drawStrokeCommand } from '@core/tools/commands';
import { BLACK, rgba } from '@core/types/color';

import { ByteWriter } from './ByteWriter';
import { crc32 } from './crc32';
import { OBSIPIX_FORMAT_VERSION, OBSIPIX_MAGIC, ObsipixParseError } from './format';
import { MAX_OBSIPIX_FILE_BYTES } from './limits';
import { parseDocument } from './parse';
import { serializeDocument } from './serialize';

function frame(magicOk: boolean, metadata: unknown, pixelSection = new Uint8Array()): Uint8Array {
  const metaBytes = new TextEncoder().encode(JSON.stringify(metadata));
  const body = new ByteWriter(64 + metaBytes.length + pixelSection.length);
  for (const byte of OBSIPIX_MAGIC) {
    body.u8(magicOk ? byte : 0);
  }
  body.u16(OBSIPIX_FORMAT_VERSION);
  body.u16(0);
  body.u32(metaBytes.length);
  body.bytes(metaBytes);
  body.u32(pixelSection.length);
  body.bytes(pixelSection);
  const bodyBytes = body.toUint8Array();
  const file = new ByteWriter(bodyBytes.length + 4);
  file.bytes(bodyBytes);
  file.u32(crc32(bodyBytes));
  return file.toUint8Array();
}

function baseMetadata(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    format: { version: OBSIPIX_FORMAT_VERSION, application: 'Obsipix' },
    project: { name: 'x' },
    document: { width: 4, height: 4, colorMode: 'rgba', pixelAspect: 1 },
    layers: [{ id: 'lyr_1', name: 'L', visible: true, locked: false, opacity: 1 }],
    activeLayerId: 'lyr_1',
    buffers: [],
    animation: {
      frames: [{ id: 'frm_1', durationMs: 100, cels: { lyr_1: { type: 'empty' } } }],
      activeFrameId: 'frm_1',
      tags: [],
      playback: {},
      onionSkin: {},
    },
    palettes: [],
    ...overrides,
  };
}

describe('.obsipix hardening — resource limits', () => {
  it('rejects a file past the size ceiling without decoding it', () => {
    const huge = new Uint8Array(MAX_OBSIPIX_FILE_BYTES + 1);
    huge.set(OBSIPIX_MAGIC);
    expect(() => parseDocument(huge)).toThrow(/larger than/i);
  });

  it('rejects an absurd metadata-length header as a parse error, not a crash', () => {
    const metaBytes = new TextEncoder().encode('{}');
    const body = new ByteWriter(32);
    for (const byte of OBSIPIX_MAGIC) {
      body.u8(byte);
    }
    body.u16(OBSIPIX_FORMAT_VERSION);
    body.u16(0);
    body.u32(0xffffffff); // claim 4 GB of metadata
    body.bytes(metaBytes);
    body.u32(0);
    const bodyBytes = body.toUint8Array();
    const file = new ByteWriter(bodyBytes.length + 4);
    file.bytes(bodyBytes);
    file.u32(crc32(bodyBytes));

    expect(() => parseDocument(file.toUint8Array())).toThrow(ObsipixParseError);
  });

  it('rejects dimensions over the limit', () => {
    const bytes = frame(
      true,
      baseMetadata({
        document: {
          width: MAX_DOCUMENT_DIMENSION + 1,
          height: 4,
          colorMode: 'rgba',
          pixelAspect: 1,
        },
      }),
    );
    expect(() => parseDocument(bytes)).toThrow(/exceed/i);
  });

  it('rejects a file with an implausible layer count', () => {
    const layers = Array.from({ length: 5000 }, (_unused, index) => ({
      id: `lyr_${String(index)}`,
      name: 'L',
      visible: true,
      locked: false,
      opacity: 1,
    }));
    const bytes = frame(true, baseMetadata({ layers, activeLayerId: 'lyr_0' }));
    expect(() => parseDocument(bytes)).toThrow(/too many layers/i);
  });

  it('clamps a hostile frame duration instead of throwing', () => {
    const bytes = frame(
      true,
      baseMetadata({
        animation: {
          frames: [
            { id: 'frm_1', durationMs: -9999, cels: { lyr_1: { type: 'empty' } } },
            { id: 'frm_2', durationMs: Number.NaN, cels: { lyr_1: { type: 'empty' } } },
            { id: 'frm_3', durationMs: 1e12, cels: { lyr_1: { type: 'empty' } } },
          ],
          activeFrameId: 'frm_1',
          tags: [],
          playback: {},
          onionSkin: {},
        },
      }),
    );
    const document = parseDocument(bytes);
    for (const f of document.timeline.frames) {
      expect(f.durationMs).toBeGreaterThanOrEqual(1);
      expect(f.durationMs).toBeLessThanOrEqual(600_000);
    }
  });

  it('still rejects the classic corruption cases', () => {
    expect(() => parseDocument(new Uint8Array(4))).toThrow(ObsipixParseError);
    expect(() => parseDocument(frame(false, baseMetadata()))).toThrow(/signature/i);
  });
});

describe('.obsipix hardening — repeated cycles', () => {
  function richDocument() {
    const document = new DocumentFactory(createSequentialIdFactory()).create({
      width: 24,
      height: 24,
      name: 'cycle',
    });
    for (let i = 0; i < 6; i += 1) {
      document.addLayer();
    }
    for (let i = 0; i < 12; i += 1) {
      document.addFrame();
    }
    const buffer = document.ensureDrawableBuffer();
    for (let x = 0; x < 24; x += 1) {
      buffer.setPixel(x, x, rgba(x * 10, 0, 0, 255));
    }
    return document;
  }

  it('is byte-stable across 20 save / load cycles', () => {
    let bytes = serializeDocument(richDocument());
    const first = [...bytes];
    for (let i = 0; i < 20; i += 1) {
      const reloaded = parseDocument(bytes, createSequentialIdFactory());
      bytes = serializeDocument(reloaded);
    }
    expect([...bytes]).toEqual(first);
  });

  it('survives 200 undo / redo cycles with the artwork intact', () => {
    const history = new History(createDefaultDocument(createSequentialIdFactory()), { limit: 500 });
    for (let i = 0; i < 200; i += 1) {
      history.execute(drawStrokeCommand([{ x: i % 32, y: (i * 3) % 32 }], BLACK));
    }
    const painted = history.document
      .resolveBuffer(history.document.layers.activeLayerId)
      ?.toBytes();
    for (let round = 0; round < 3; round += 1) {
      for (let i = 0; i < 200; i += 1) {
        history.undo();
      }
      for (let i = 0; i < 200; i += 1) {
        history.redo();
      }
    }
    expect(
      history.document.resolveBuffer(history.document.layers.activeLayerId)?.toBytes(),
    ).toEqual(painted);
  });
});

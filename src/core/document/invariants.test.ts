import { describe, expect, it } from 'vitest';

import { PixelBuffer } from '@core/pixels/PixelBuffer';
import type { CelId, LayerId } from '@core/types/ids';

import { Cel } from './Cel';
import { createDefaultDocument } from './DocumentFactory';
import { createSequentialIdFactory } from './IdFactory';
import { DocumentInvariantError, assertDocumentInvariants, validateDocument } from './invariants';

function newDocument() {
  return createDefaultDocument(createSequentialIdFactory());
}

describe('validateDocument', () => {
  it('reports no problems for a default document', () => {
    expect(validateDocument(newDocument())).toEqual([]);
  });

  it('detects a frame that is missing a cel for a layer', () => {
    const document = newDocument();
    const layerId = document.layers.activeLayerId;
    document.timeline.frames[0]?.removeCel(layerId);

    expect(validateDocument(document).some((message) => message.includes('missing a cel'))).toBe(
      true,
    );
    expect(() => {
      assertDocumentInvariants(document);
    }).toThrow(DocumentInvariantError);
  });

  it('detects a cel buffer whose size does not match the document', () => {
    const document = newDocument();
    const layerId = document.layers.activeLayerId;
    document.timeline.frames[0]?.setCel(
      layerId,
      Cel.normal('cel_wrong' as CelId, PixelBuffer.create(2, 2)),
    );

    expect(validateDocument(document).some((message) => message.includes('does not match'))).toBe(
      true,
    );
  });

  it('detects a duplicate layer id', () => {
    const document = newDocument();
    const firstId = document.layers.activeLayerId;
    const secondId = document.addLayer();
    (document.layers.require(secondId) as { id: LayerId }).id = firstId;

    expect(validateDocument(document).some((message) => message.includes('duplicate'))).toBe(true);
  });
});

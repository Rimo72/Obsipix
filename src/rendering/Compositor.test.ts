import { describe, expect, it } from 'vitest';

import { createDefaultDocument } from '@core/document/DocumentFactory';
import { createSequentialIdFactory } from '@core/document/IdFactory';
import type { Document } from '@core/document/Document';
import { BLACK, TRANSPARENT, WHITE, rgba, rgbaEquals } from '@core/types/color';

import { compositeDocument } from './Compositor';

function newDocument(): Document {
  return createDefaultDocument(createSequentialIdFactory());
}

describe('compositeDocument', () => {
  it('renders a transparent document as fully transparent', () => {
    const composite = compositeDocument(newDocument());
    expect(composite.toBytes().every((byte) => byte === 0)).toBe(true);
  });

  it('reproduces a single opaque layer exactly', () => {
    const document = newDocument();
    const buffer = document.resolveBuffer(document.layers.activeLayerId);
    buffer?.setPixel(3, 4, rgba(10, 20, 30, 255));
    buffer?.setPixel(0, 0, BLACK);

    const composite = compositeDocument(document);
    expect(composite.getPixel(3, 4)).toEqual({ r: 10, g: 20, b: 30, a: 255 });
    expect(rgbaEquals(composite.getPixel(0, 0), BLACK)).toBe(true);
    expect(rgbaEquals(composite.getPixel(1, 1), TRANSPARENT)).toBe(true);
  });

  it('skips hidden and fully transparent layers', () => {
    const document = newDocument();
    const bottom = document.layers.activeLayerId;
    document.resolveBuffer(bottom)?.setPixel(1, 1, BLACK);

    const top = document.addLayer();
    document.resolveBuffer(top)?.setPixel(1, 1, WHITE);
    document.layers.require(top).setVisible(false);

    expect(rgbaEquals(compositeDocument(document).getPixel(1, 1), BLACK)).toBe(true);

    document.layers.require(top).setVisible(true);
    document.layers.require(top).setOpacity(0);
    expect(rgbaEquals(compositeDocument(document).getPixel(1, 1), BLACK)).toBe(true);
  });

  it('paints layers bottom to top', () => {
    const document = newDocument();
    const bottom = document.layers.activeLayerId;
    document.resolveBuffer(bottom)?.setPixel(2, 2, BLACK);

    const top = document.addLayer();
    document.resolveBuffer(top)?.setPixel(2, 2, WHITE);

    expect(rgbaEquals(compositeDocument(document).getPixel(2, 2), WHITE)).toBe(true);
  });

  it('alpha-blends a semi-transparent layer over an opaque one', () => {
    const document = newDocument();
    const bottom = document.layers.activeLayerId;
    document.resolveBuffer(bottom)?.setPixel(0, 0, rgba(0, 0, 0, 255));

    const top = document.addLayer();
    document.resolveBuffer(top)?.setPixel(0, 0, rgba(255, 255, 255, 128));

    // out = 255 * (128/255) + 0 * (1 - 128/255) ≈ 128
    const result = compositeDocument(document).getPixel(0, 0);
    expect(result.a).toBe(255);
    expect(result.r).toBeGreaterThanOrEqual(127);
    expect(result.r).toBeLessThanOrEqual(129);
  });

  it('applies layer opacity to the blend', () => {
    const document = newDocument();
    const bottom = document.layers.activeLayerId;
    document.resolveBuffer(bottom)?.setPixel(0, 0, BLACK);

    const top = document.addLayer();
    document.resolveBuffer(top)?.setPixel(0, 0, WHITE);
    document.layers.require(top).setOpacity(0.5);

    const result = compositeDocument(document).getPixel(0, 0);
    expect(result.r).toBeGreaterThanOrEqual(127);
    expect(result.r).toBeLessThanOrEqual(128);
  });

  it('composites a specific frame, resolving hold cels', () => {
    const document = newDocument();
    const layerId = document.layers.activeLayerId;
    document.resolveBuffer(layerId)?.setPixel(5, 5, BLACK);

    const secondFrame = document.addEmptyFrame();
    document.holdCel(secondFrame, layerId);

    expect(rgbaEquals(compositeDocument(document, secondFrame).getPixel(5, 5), BLACK)).toBe(true);
  });
});

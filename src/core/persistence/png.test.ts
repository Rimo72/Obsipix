import { inflateSync } from 'node:zlib';

import { describe, expect, it } from 'vitest';

import { createDefaultDocument } from '@core/document/DocumentFactory';
import { createSequentialIdFactory } from '@core/document/IdFactory';
import { PixelBuffer } from '@core/pixels/PixelBuffer';
import { BLACK, rgba, rgbaEquals } from '@core/types/color';

import { encodePng, exportPng } from './png';

const SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

interface DecodedPng {
  width: number;
  height: number;
  pixels: PixelBuffer;
}

/** A minimal PNG reader for the exact subset the encoder produces. */
function decodePng(bytes: Uint8Array): DecodedPng {
  for (let i = 0; i < SIGNATURE.length; i += 1) {
    expect(bytes[i]).toBe(SIGNATURE[i]);
  }
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let offset = 8;
  let width = 0;
  let height = 0;
  const idat: number[] = [];

  while (offset < bytes.length) {
    const length = view.getUint32(offset);
    const type = String.fromCharCode(...bytes.subarray(offset + 4, offset + 8));
    const data = bytes.subarray(offset + 8, offset + 8 + length);
    if (type === 'IHDR') {
      width = view.getUint32(offset + 8);
      height = view.getUint32(offset + 12);
      expect(bytes[offset + 16]).toBe(8); // bit depth
      expect(bytes[offset + 17]).toBe(6); // RGBA
    } else if (type === 'IDAT') {
      idat.push(...data);
    }
    offset += 12 + length;
  }

  const raw = new Uint8Array(inflateSync(Buffer.from(idat)));
  const out = new Uint8ClampedArray(width * height * 4);
  const stride = 1 + width * 4;
  for (let y = 0; y < height; y += 1) {
    expect(raw[y * stride]).toBe(0); // "None" filter
    out.set(raw.subarray(y * stride + 1, y * stride + stride), y * width * 4);
  }
  return { width, height, pixels: PixelBuffer.fromBytes(width, height, out) };
}

describe('encodePng', () => {
  it('produces a decodable PNG that matches the source pixels', () => {
    const buffer = PixelBuffer.create(6, 4);
    buffer.setPixel(0, 0, rgba(255, 0, 0, 255));
    buffer.setPixel(5, 3, rgba(0, 128, 255, 200));
    buffer.setPixel(2, 2, BLACK);

    const decoded = decodePng(encodePng(buffer));
    expect(decoded.width).toBe(6);
    expect(decoded.height).toBe(4);
    expect(decoded.pixels.equals(buffer)).toBe(true);
  });
});

describe('exportPng', () => {
  it('flattens the document and excludes editor overlays', () => {
    const document = createDefaultDocument(createSequentialIdFactory());
    const layerId = document.layers.activeLayerId;
    document.resolveBuffer(layerId)?.setPixel(4, 4, BLACK);

    const decoded = decodePng(exportPng(document));
    expect(decoded.width).toBe(32);
    expect(decoded.height).toBe(32);
    // the drawn pixel is there
    expect(rgbaEquals(decoded.pixels.getPixel(4, 4), BLACK)).toBe(true);
    // everything else is transparent — no checkerboard, no grid baked in
    expect(rgbaEquals(decoded.pixels.getPixel(0, 0), { r: 0, g: 0, b: 0, a: 0 })).toBe(true);
    expect(rgbaEquals(decoded.pixels.getPixel(31, 31), { r: 0, g: 0, b: 0, a: 0 })).toBe(true);
  });

  it('respects layer opacity in the flattened output', () => {
    const document = createDefaultDocument(createSequentialIdFactory());
    document.resolveBuffer(document.layers.activeLayerId)?.setPixel(0, 0, rgba(255, 255, 255, 255));
    const top = document.addLayer();
    document.resolveBuffer(top)?.setPixel(0, 0, rgba(0, 0, 0, 255));
    document.layers.require(top).setOpacity(0.5);

    const decoded = decodePng(exportPng(document));
    const pixel = decoded.pixels.getPixel(0, 0);
    expect(pixel.r).toBeGreaterThanOrEqual(126);
    expect(pixel.r).toBeLessThanOrEqual(129);
  });
});

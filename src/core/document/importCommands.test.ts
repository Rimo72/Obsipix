import { describe, expect, it } from 'vitest';

import { History } from '@core/history/History';
import { rgbaEquals, TRANSPARENT } from '@core/types/color';

import { createDefaultDocument } from './DocumentFactory';
import { createSequentialIdFactory } from './IdFactory';
import { importLayerCommand, type ImageData8 } from './importCommands';

function solidImage(width: number, height: number, r: number, g: number, b: number): ImageData8 {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let i = 0; i < width * height; i += 1) {
    data[i * 4] = r;
    data[i * 4 + 1] = g;
    data[i * 4 + 2] = b;
    data[i * 4 + 3] = 255;
  }
  return { width, height, data };
}

describe('importLayerCommand', () => {
  it('adds the image as a new top layer, undoably', () => {
    const history = new History(createDefaultDocument(createSequentialIdFactory())); // 32×32
    const before = history.document.layers.count;

    history.execute(importLayerCommand('Sky', solidImage(4, 4, 10, 20, 30)));

    expect(history.document.layers.count).toBe(before + 1);
    const layerId = history.document.layers.activeLayerId;
    const buffer = history.document.resolveBuffer(layerId);
    expect(buffer?.getPixel(0, 0)).toEqual({ r: 10, g: 20, b: 30, a: 255 });
    expect(buffer?.getPixel(3, 3)).toEqual({ r: 10, g: 20, b: 30, a: 255 });
    // outside the 4×4 image stays transparent
    expect(rgbaEquals(buffer?.getPixel(10, 10) ?? TRANSPARENT, TRANSPARENT)).toBe(true);

    history.undo();
    expect(history.document.layers.count).toBe(before);
  });

  it('clips an oversized image to the canvas', () => {
    const history = new History(createDefaultDocument(createSequentialIdFactory())); // 32×32
    history.execute(importLayerCommand('Big', solidImage(100, 100, 5, 5, 5)));
    const buffer = history.document.resolveBuffer(history.document.layers.activeLayerId);
    expect(buffer?.dimensions).toEqual({ width: 32, height: 32 });
    expect(buffer?.getPixel(31, 31)).toEqual({ r: 5, g: 5, b: 5, a: 255 });
  });
});

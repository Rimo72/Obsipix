import { describe, expect, it } from 'vitest';

import { createDefaultDocument } from '@core/document/DocumentFactory';
import { createSequentialIdFactory } from '@core/document/IdFactory';
import { BLACK, rgba, WHITE } from '@core/types/color';

import { exportAllFrames, exportFrame, flattenOnto, scaleForExport } from './exportImage';

function doc() {
  const d = createDefaultDocument(createSequentialIdFactory());
  d.resolveBuffer(d.layers.activeLayerId)?.setPixel(1, 1, BLACK);
  return d;
}

describe('exportImage', () => {
  it('exportFrame returns the flattened frame at 1×', () => {
    const buffer = exportFrame(doc());
    expect(buffer.dimensions).toEqual({ width: 32, height: 32 });
    expect(buffer.getPixel(1, 1)).toEqual({ r: 0, g: 0, b: 0, a: 255 });
    expect(buffer.getPixel(0, 0)).toEqual({ r: 0, g: 0, b: 0, a: 0 }); // still transparent
  });

  it('nearest-neighbour upscales each pixel to a block', () => {
    const scaled = scaleForExport(exportFrame(doc()), 4);
    expect(scaled.dimensions).toEqual({ width: 128, height: 128 });
    for (let y = 4; y < 8; y += 1) {
      for (let x = 4; x < 8; x += 1) {
        expect(scaled.getPixel(x, y)).toEqual({ r: 0, g: 0, b: 0, a: 255 });
      }
    }
    expect(scaled.getPixel(0, 0).a).toBe(0);
  });

  it('flattenOnto composites over a solid background', () => {
    const flat = flattenOnto(exportFrame(doc()), WHITE);
    expect(flat.getPixel(0, 0)).toEqual({ r: 255, g: 255, b: 255, a: 255 });
    expect(flat.getPixel(1, 1)).toEqual({ r: 0, g: 0, b: 0, a: 255 });
  });

  it('a semi-transparent pixel blends against the chosen background', () => {
    const d = createDefaultDocument(createSequentialIdFactory());
    d.resolveBuffer(d.layers.activeLayerId)?.setPixel(0, 0, rgba(0, 0, 0, 128));
    const flat = flattenOnto(exportFrame(d), WHITE);
    const p = flat.getPixel(0, 0);
    expect(p.a).toBe(255);
    expect(p.r).toBeGreaterThan(120);
    expect(p.r).toBeLessThan(135);
  });

  it('exportAllFrames yields one buffer per frame with its duration', () => {
    const d = doc();
    const secondFrameId = d.addFrame();
    d.timeline.requireFrame(secondFrameId).setDurationMs(250);
    const frames = exportAllFrames(d, { scale: 2 });
    expect(frames).toHaveLength(2);
    expect(frames[0]?.buffer.dimensions).toEqual({ width: 64, height: 64 });
    expect(frames[1]?.durationMs).toBe(250);
  });
});

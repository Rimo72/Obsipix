import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createDefaultDocument } from '@core/document/DocumentFactory';
import { createSequentialIdFactory } from '@core/document/IdFactory';
import { BLACK } from '@core/types/color';

import { CanvasRenderer } from './CanvasRenderer';
import { Viewport } from './Viewport';

/** A recording 2D context: enough surface for CanvasRenderer, plus an ordered op log. */
class RecordingContext {
  readonly ops: string[] = [];
  imageSmoothingEnabled = true;
  fillStyle = '';
  strokeStyle = '';
  lineWidth = 1;
  lastDrawImage: readonly number[] = [];
  putImageDataCalls = 0;

  save = vi.fn(() => this.ops.push('save'));
  restore = vi.fn(() => this.ops.push('restore'));
  setTransform = vi.fn(() => this.ops.push('setTransform'));
  clearRect = vi.fn(() => this.ops.push('clearRect'));
  beginPath = vi.fn(() => this.ops.push('beginPath'));
  rect = vi.fn(() => this.ops.push('rect'));
  clip = vi.fn(() => this.ops.push('clip'));
  fillRect = vi.fn(() => this.ops.push('fillRect'));
  moveTo = vi.fn();
  lineTo = vi.fn();
  stroke = vi.fn(() => this.ops.push('stroke'));
  createImageData = vi.fn((width: number, height: number) => ({
    data: new Uint8ClampedArray(width * height * 4),
    width,
    height,
  }));
  putImageData = vi.fn(() => {
    this.putImageDataCalls += 1;
    this.ops.push('putImageData');
  });
  drawImage = vi.fn((_image: unknown, ...args: number[]) => {
    this.lastDrawImage = args;
    this.ops.push('drawImage');
  });
}

class FakeCanvas {
  width = 0;
  height = 0;
  clientWidth = 320;
  clientHeight = 320;
  readonly context = new RecordingContext();
  readonly ownerDocument = {
    createElement: (): FakeCanvas => new FakeCanvas(),
  };
  getContext(): RecordingContext {
    return this.context;
  }
}

function asCanvas(fake: FakeCanvas): HTMLCanvasElement {
  return fake as unknown as HTMLCanvasElement;
}

let canvas: FakeCanvas;
beforeEach(() => {
  canvas = new FakeCanvas();
});

describe('CanvasRenderer', () => {
  it('throws when no 2D context is available', () => {
    const noContext = { getContext: () => null } as unknown as HTMLCanvasElement;
    expect(() => new CanvasRenderer(noContext)).toThrow();
  });

  it('disables image smoothing and sizes the backing store to devicePixelRatio', () => {
    const renderer = new CanvasRenderer(asCanvas(canvas));
    renderer.render(createDefaultDocument(createSequentialIdFactory()), new Viewport({ zoom: 4 }), {
      devicePixelRatio: 2,
    });

    expect(canvas.context.imageSmoothingEnabled).toBe(false);
    expect(canvas.width).toBe(640);
    expect(canvas.height).toBe(640);
  });

  it('runs the passes in order: checkerboard, then artwork, then grid', () => {
    const renderer = new CanvasRenderer(asCanvas(canvas));
    renderer.render(
      createDefaultDocument(createSequentialIdFactory()),
      new Viewport({ zoom: 16 }),
      {
        showCheckerboard: true,
        showGrid: true,
      },
    );

    const ops = canvas.context.ops;
    const checkerboard = ops.indexOf('fillRect');
    const artwork = ops.indexOf('drawImage');
    const grid = ops.indexOf('stroke');
    expect(checkerboard).toBeGreaterThanOrEqual(0);
    expect(checkerboard).toBeLessThan(artwork);
    expect(artwork).toBeLessThan(grid);
  });

  it('draws the artwork scaled by the viewport with no smoothing', () => {
    const document = createDefaultDocument(createSequentialIdFactory());
    document.resolveBuffer(document.layers.activeLayerId)?.setPixel(0, 0, BLACK);

    const renderer = new CanvasRenderer(asCanvas(canvas));
    renderer.render(document, new Viewport({ zoom: 5, panX: 12, panY: 8 }));

    // drawImage(source, 0, 0, 32, 32, panX, panY, 32*zoom, 32*zoom)
    expect(canvas.context.lastDrawImage).toEqual([0, 0, 32, 32, 12, 8, 160, 160]);
  });

  it('keeps overlays off the artwork buffer', () => {
    const renderer = new CanvasRenderer(asCanvas(canvas));
    renderer.render(createDefaultDocument(createSequentialIdFactory()), new Viewport({ zoom: 16 }));

    // exactly one putImageData (the composite) reaches an offscreen context;
    // the visible context only ever receives drawImage for artwork.
    expect(canvas.context.putImageDataCalls).toBe(0);
    expect(canvas.context.drawImage).toHaveBeenCalledTimes(1);
  });

  it('hides the grid below its minimum zoom', () => {
    const renderer = new CanvasRenderer(asCanvas(canvas));
    renderer.render(createDefaultDocument(createSequentialIdFactory()), new Viewport({ zoom: 2 }), {
      grid: { color: '#000', minZoom: 8 },
    });
    expect(canvas.context.ops).not.toContain('stroke');
  });
});

import { describe, expect, it } from 'vitest';

import { MAX_ZOOM, MIN_ZOOM, Viewport } from './Viewport';

describe('Viewport coordinate conversion', () => {
  it('maps document pixels to canvas space and back at 1:1', () => {
    const viewport = new Viewport();
    expect(viewport.documentToCanvas({ x: 5, y: 7 })).toEqual({ x: 5, y: 7 });
    expect(viewport.canvasToDocument({ x: 5, y: 7 })).toEqual({ x: 5, y: 7 });
  });

  it('applies zoom to the mapping', () => {
    const viewport = new Viewport({ zoom: 4 });
    expect(viewport.documentToCanvas({ x: 3, y: 2 })).toEqual({ x: 12, y: 8 });
    expect(viewport.canvasToDocument({ x: 12, y: 8 })).toEqual({ x: 3, y: 2 });
  });

  it('applies pan to the mapping', () => {
    const viewport = new Viewport({ zoom: 2, panX: 10, panY: 20 });
    expect(viewport.documentToCanvas({ x: 4, y: 5 })).toEqual({ x: 18, y: 30 });
    expect(viewport.canvasToDocument({ x: 18, y: 30 })).toEqual({ x: 4, y: 5 });

    viewport.panBy(5, -5);
    expect(viewport.documentToCanvas({ x: 0, y: 0 })).toEqual({ x: 15, y: 15 });
  });

  it('round-trips an arbitrary point', () => {
    const viewport = new Viewport({ zoom: 6.5, panX: -12.25, panY: 3.75 });
    const canvas = viewport.documentToCanvas({ x: 9, y: 14 });
    expect(viewport.canvasToDocument(canvas)).toEqual({ x: 9, y: 14 });
  });
});

describe('Viewport pixel alignment (nearest-neighbour)', () => {
  it('floors a canvas point onto the pixel it lands in', () => {
    const viewport = new Viewport({ zoom: 10, panX: 0, panY: 0 });
    expect(viewport.canvasToPixel({ x: 0, y: 0 })).toEqual({ x: 0, y: 0 });
    expect(viewport.canvasToPixel({ x: 9.9, y: 0.1 })).toEqual({ x: 0, y: 0 });
    expect(viewport.canvasToPixel({ x: 10, y: 25 })).toEqual({ x: 1, y: 2 });
    expect(viewport.canvasToPixel({ x: 34, y: 10 })).toEqual({ x: 3, y: 1 });
  });

  it('reports negative pixels for points left of / above the document', () => {
    const viewport = new Viewport({ zoom: 8, panX: 40, panY: 40 });
    expect(viewport.canvasToPixel({ x: 39, y: 39 })).toEqual({ x: -1, y: -1 });
  });

  it('gives the canvas rectangle for a pixel', () => {
    const viewport = new Viewport({ zoom: 8, panX: 4, panY: 6 });
    expect(viewport.pixelToCanvasRect({ x: 2, y: 3 })).toEqual({
      x: 20,
      y: 30,
      width: 8,
      height: 8,
    });
  });
});

describe('Viewport zoom', () => {
  it('clamps to the supported range', () => {
    const viewport = new Viewport();
    viewport.setZoom(1000);
    expect(viewport.zoom).toBe(MAX_ZOOM);
    viewport.setZoom(0);
    expect(viewport.zoom).toBe(MIN_ZOOM);
  });

  it('keeps the anchored document point fixed while zooming', () => {
    const viewport = new Viewport({ zoom: 4, panX: 0, panY: 0 });
    const anchor = { x: 40, y: 40 };
    const documentUnderAnchor = viewport.canvasToDocument(anchor);

    viewport.zoomAround(anchor, 2);

    expect(viewport.zoom).toBe(8);
    const stillThere = viewport.documentToCanvas(documentUnderAnchor);
    expect(stillThere.x).toBeCloseTo(anchor.x, 6);
    expect(stillThere.y).toBeCloseTo(anchor.y, 6);
  });
});

describe('Viewport.fit', () => {
  it('centres and scales the document within the given area', () => {
    const viewport = new Viewport();
    viewport.fit(320, 320, { width: 32, height: 32 }, 0);

    expect(viewport.zoom).toBe(10);
    // 32 * 10 = 320, exactly filling the area, so pan is zero
    expect(viewport.panX).toBe(0);
    expect(viewport.panY).toBe(0);

    const topLeft = viewport.documentToCanvas({ x: 0, y: 0 });
    const bottomRight = viewport.documentToCanvas({ x: 32, y: 32 });
    expect(topLeft).toEqual({ x: 0, y: 0 });
    expect(bottomRight).toEqual({ x: 320, y: 320 });
  });

  it('respects padding and centres a non-square fit', () => {
    const viewport = new Viewport();
    viewport.fit(200, 400, { width: 32, height: 32 }, 20);

    // limiting axis is width: (200 - 40) / 32 = 5
    expect(viewport.zoom).toBe(5);
    expect(viewport.panX).toBe((200 - 160) / 2);
    expect(viewport.panY).toBe((400 - 160) / 2);
  });
});

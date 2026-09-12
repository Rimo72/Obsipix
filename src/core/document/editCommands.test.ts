import { describe, expect, it } from 'vitest';

import { History } from '@core/history/History';
import { PixelBuffer } from '@core/pixels/PixelBuffer';
import { BLACK, TRANSPARENT, WHITE, rgbaEquals } from '@core/types/color';

import type { Document } from './Document';
import { createDefaultDocument } from './DocumentFactory';
import {
  deleteSelectionCommand,
  deselectCommand,
  flipCommand,
  invertSelectionCommand,
  magicWandSelectCommand,
  pasteCommand,
  resizeCanvasCommand,
  resizeImageCommand,
  rotateDocumentCommand,
  selectAllCommand,
  selectRectCommand,
} from './editCommands';
import { createSequentialIdFactory } from './IdFactory';

function newHistory(): History {
  return new History(createDefaultDocument(createSequentialIdFactory()));
}

function pixel(document: Document, x: number, y: number) {
  return document.resolveBuffer(document.layers.activeLayerId)?.getPixel(x, y) ?? TRANSPARENT;
}

describe('selection commands', () => {
  it('select all / rect / deselect are undoable', () => {
    const history = newHistory();
    history.execute(selectAllCommand());
    expect(history.document.selection.active).toBe(true);

    history.execute(selectRectCommand({ x: 2, y: 2, width: 4, height: 4 }, 'replace'));
    expect(history.document.selection.bounds()).toEqual({ x: 2, y: 2, width: 4, height: 4 });

    history.execute(deselectCommand());
    expect(history.document.selection.active).toBe(false);

    history.undo();
    expect(history.document.selection.active).toBe(true);
    history.undo();
    expect(history.document.selection.bounds()?.width).toBe(32);
  });

  it('invert selection is undoable', () => {
    const history = newHistory();
    history.execute(selectRectCommand({ x: 0, y: 0, width: 8, height: 32 }, 'replace'));
    history.execute(invertSelectionCommand());
    expect(history.document.selection.isSelected(0, 0)).toBe(false);
    expect(history.document.selection.isSelected(20, 20)).toBe(true);
    history.undo();
    expect(history.document.selection.isSelected(0, 0)).toBe(true);
    expect(history.document.selection.isSelected(20, 20)).toBe(false);
  });
});

describe('magicWandSelectCommand', () => {
  it('selects the contiguous region of matching colour on the active layer', () => {
    const history = newHistory();
    const document = history.document;
    const layerId = document.layers.activeLayerId;
    const buffer = document.ensureDrawableBuffer(layerId);
    for (let y = 0; y < 32; y += 1) {
      buffer.setPixel(10, y, BLACK); // a wall splitting the 32x32 canvas
    }

    history.execute(magicWandSelectCommand({ x: 0, y: 0 }, 'replace'));

    expect(history.document.selection.active).toBe(true);
    expect(history.document.selection.isSelected(5, 5)).toBe(true); // left of the wall
    expect(history.document.selection.isSelected(10, 5)).toBe(false); // the wall itself
    expect(history.document.selection.isSelected(20, 5)).toBe(false); // right of the wall

    history.undo();
    expect(history.document.selection.active).toBe(false);
  });

  it('selects the whole canvas when it is uniformly transparent', () => {
    const history = newHistory();
    history.execute(magicWandSelectCommand({ x: 4, y: 4 }, 'replace'));
    expect(history.document.selection.bounds()).toEqual({ x: 0, y: 0, width: 32, height: 32 });
  });

  it('respects add / subtract / intersect selection modes', () => {
    const history = newHistory();
    const document = history.document;
    const buffer = document.ensureDrawableBuffer(document.layers.activeLayerId);
    buffer.setPixel(0, 0, BLACK); // an isolated black pixel

    history.execute(selectRectCommand({ x: 20, y: 20, width: 4, height: 4 }, 'replace'));
    history.execute(magicWandSelectCommand({ x: 0, y: 0 }, 'add'));

    expect(history.document.selection.isSelected(0, 0)).toBe(true); // the wand's own pixel
    expect(history.document.selection.isSelected(21, 21)).toBe(true); // still selected from before
  });

  it('does not touch document pixels — purely a selection', () => {
    const history = newHistory();
    const document = history.document;
    const layerId = document.layers.activeLayerId;
    document.ensureDrawableBuffer(layerId).setPixel(3, 3, WHITE);

    history.execute(magicWandSelectCommand({ x: 3, y: 3 }, 'replace'));

    expect(rgbaEquals(pixel(history.document, 3, 3), WHITE)).toBe(true);
  });
});

describe('deleteSelectionCommand', () => {
  it('clears only the selected pixels and reverses', () => {
    const history = newHistory();
    const buffer = history.document.resolveBuffer(history.document.layers.activeLayerId);
    buffer?.setPixel(1, 1, BLACK);
    buffer?.setPixel(10, 10, BLACK);

    history.execute(selectRectCommand({ x: 0, y: 0, width: 5, height: 5 }, 'replace'));
    history.execute(deleteSelectionCommand());

    expect(rgbaEquals(pixel(history.document, 1, 1), TRANSPARENT)).toBe(true);
    expect(rgbaEquals(pixel(history.document, 10, 10), BLACK)).toBe(true);

    history.undo();
    expect(rgbaEquals(pixel(history.document, 1, 1), BLACK)).toBe(true);
  });
});

describe('pasteCommand', () => {
  it('stamps content, sets the selection, and reverses', () => {
    const history = newHistory();
    const clip = PixelBuffer.create(3, 2);
    clip.setPixel(0, 0, WHITE);
    clip.setPixel(2, 1, BLACK);

    history.execute(pasteCommand(clip, { x: 5, y: 5 }));
    expect(rgbaEquals(pixel(history.document, 5, 5), WHITE)).toBe(true);
    expect(rgbaEquals(pixel(history.document, 7, 6), BLACK)).toBe(true);
    expect(history.document.selection.bounds()).toEqual({ x: 5, y: 5, width: 3, height: 2 });

    history.undo();
    expect(rgbaEquals(pixel(history.document, 5, 5), TRANSPARENT)).toBe(true);
  });
});

describe('flip / rotate commands', () => {
  it('flipCommand mirrors the whole layer and is its own inverse', () => {
    const history = newHistory();
    history.document.resolveBuffer(history.document.layers.activeLayerId)?.setPixel(0, 0, BLACK);

    history.execute(flipCommand('horizontal'));
    expect(rgbaEquals(pixel(history.document, 31, 0), BLACK)).toBe(true);
    expect(rgbaEquals(pixel(history.document, 0, 0), TRANSPARENT)).toBe(true);

    history.undo();
    expect(rgbaEquals(pixel(history.document, 0, 0), BLACK)).toBe(true);
  });

  it('flip within a selection stays inside the region', () => {
    const history = newHistory();
    const buffer = history.document.resolveBuffer(history.document.layers.activeLayerId);
    buffer?.setPixel(2, 2, BLACK);
    buffer?.setPixel(20, 20, WHITE); // outside the selection

    history.execute(selectRectCommand({ x: 0, y: 0, width: 6, height: 6 }, 'replace'));
    history.execute(flipCommand('horizontal'));

    expect(rgbaEquals(pixel(history.document, 3, 2), BLACK)).toBe(true); // mirrored in the 0..5 box
    expect(rgbaEquals(pixel(history.document, 20, 20), WHITE)).toBe(true); // untouched
  });

  it('rotateDocument swaps the canvas dimensions and reverses', () => {
    const history = newHistory();
    history.execute(resizeCanvasCommand({ width: 20, height: 10 }));
    history.document.resolveBuffer(history.document.layers.activeLayerId)?.setPixel(0, 0, BLACK);

    history.execute(rotateDocumentCommand('cw'));
    expect(history.document.dimensions).toEqual({ width: 10, height: 20 });

    history.undo();
    expect(history.document.dimensions).toEqual({ width: 20, height: 10 });
    expect(rgbaEquals(pixel(history.document, 0, 0), BLACK)).toBe(true);
  });
});

describe('resize commands', () => {
  it('resizeImage scales artwork and reverses exactly', () => {
    const history = newHistory();
    history.document.resolveBuffer(history.document.layers.activeLayerId)?.setPixel(0, 0, BLACK);

    history.execute(resizeImageCommand({ width: 64, height: 64 }));
    expect(history.document.dimensions).toEqual({ width: 64, height: 64 });
    expect(rgbaEquals(pixel(history.document, 1, 1), BLACK)).toBe(true); // replicated

    history.undo();
    expect(history.document.dimensions).toEqual({ width: 32, height: 32 });
    expect(rgbaEquals(pixel(history.document, 0, 0), BLACK)).toBe(true);
  });

  it('resizeCanvas keeps artwork unscaled, centred', () => {
    const history = newHistory();
    history.document.resolveBuffer(history.document.layers.activeLayerId)?.setPixel(0, 0, BLACK);

    history.execute(resizeCanvasCommand({ width: 40, height: 40 }, 'center', 'center'));
    expect(history.document.dimensions).toEqual({ width: 40, height: 40 });
    expect(rgbaEquals(pixel(history.document, 4, 4), BLACK)).toBe(true); // moved by (40-32)/2

    history.undo();
    expect(rgbaEquals(pixel(history.document, 0, 0), BLACK)).toBe(true);
  });
});

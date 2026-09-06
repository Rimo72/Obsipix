import { describe, expect, it } from 'vitest';

import { createDefaultDocument } from '@core/document/DocumentFactory';
import { createSequentialIdFactory } from '@core/document/IdFactory';
import { History } from '@core/history/History';
import { BLACK, TRANSPARENT, rgbaEquals } from '@core/types/color';

import { drawStrokeCommand, eraseStrokeCommand } from './commands';

function newHistory(): History {
  return new History(createDefaultDocument(createSequentialIdFactory()));
}

function pixel(history: History, x: number, y: number) {
  const document = history.document;
  return document.resolveBuffer(document.layers.activeLayerId)?.getPixel(x, y) ?? TRANSPARENT;
}

describe('drawStrokeCommand', () => {
  it('draws the whole stroke as a single undoable entry', () => {
    const history = newHistory();
    history.execute(
      drawStrokeCommand(
        [
          { x: 2, y: 2 },
          { x: 8, y: 2 },
        ],
        BLACK,
      ),
    );

    expect(history.depth).toBe(1);
    for (let x = 2; x <= 8; x += 1) {
      expect(rgbaEquals(pixel(history, x, 2), BLACK)).toBe(true);
    }

    history.undo();
    for (let x = 2; x <= 8; x += 1) {
      expect(rgbaEquals(pixel(history, x, 2), TRANSPARENT)).toBe(true);
    }

    history.redo();
    expect(rgbaEquals(pixel(history, 5, 2), BLACK)).toBe(true);
  });

  it('reports the affected layer', () => {
    const history = newHistory();
    const result = history.execute(drawStrokeCommand([{ x: 0, y: 0 }], BLACK));
    expect(result.affectedLayerIds).toEqual([history.document.layers.activeLayerId]);
  });
});

describe('eraseStrokeCommand', () => {
  it('erases a stroke as one entry', () => {
    const history = newHistory();
    history.execute(
      drawStrokeCommand(
        [
          { x: 0, y: 0 },
          { x: 5, y: 0 },
        ],
        BLACK,
      ),
    );
    history.execute(
      eraseStrokeCommand([
        { x: 1, y: 0 },
        { x: 4, y: 0 },
      ]),
    );

    expect(rgbaEquals(pixel(history, 0, 0), BLACK)).toBe(true);
    expect(rgbaEquals(pixel(history, 2, 0), TRANSPARENT)).toBe(true);

    history.undo();
    expect(rgbaEquals(pixel(history, 2, 0), BLACK)).toBe(true);
  });
});

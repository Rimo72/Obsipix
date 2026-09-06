import { beforeEach, describe, expect, it } from 'vitest';

import { createDefaultDocument } from '@core/document/DocumentFactory';
import type { Document } from '@core/document/Document';
import { createSequentialIdFactory } from '@core/document/IdFactory';
import { EditorError } from '@core/errors/EditorError';
import { BLACK, TRANSPARENT, rgbaEquals } from '@core/types/color';
import type { LayerId } from '@core/types/ids';

import { command, mutation } from './Command';
import { History } from './History';

function activeLayer(document: Document): LayerId {
  return document.layers.activeLayerId;
}

function pixel(history: History, x: number, y: number) {
  const document = history.document;
  return document.resolveBuffer(activeLayer(document))?.getPixel(x, y) ?? TRANSPARENT;
}

function paint(x: number, y: number) {
  return mutation(`Paint ${String(x)},${String(y)}`, (document) => {
    document.resolveBuffer(document.layers.activeLayerId)?.setPixel(x, y, BLACK);
  });
}

let history: History;
beforeEach(() => {
  history = new History(createDefaultDocument(createSequentialIdFactory()));
});

describe('History.execute', () => {
  it('applies the command and records an undo entry', () => {
    expect(history.canUndo).toBe(false);
    history.execute(paint(1, 1));
    expect(rgbaEquals(pixel(history, 1, 1), BLACK)).toBe(true);
    expect(history.canUndo).toBe(true);
    expect(history.undoLabel).toBe('Paint 1,1');
    expect(history.document.revision).toBe(1);
  });

  it('returns the command result', () => {
    const layerId = activeLayer(history.document);
    const result = history.execute(command('Touch', () => ({ affectedLayerIds: [layerId] })));
    expect(result.affectedLayerIds).toEqual([layerId]);
  });
});

describe('History.undo / redo', () => {
  it('reverts and re-applies a change', () => {
    history.execute(paint(2, 2));

    expect(history.undo()).toBe(true);
    expect(rgbaEquals(pixel(history, 2, 2), TRANSPARENT)).toBe(true);
    expect(history.canUndo).toBe(false);
    expect(history.canRedo).toBe(true);
    expect(history.redoLabel).toBe('Paint 2,2');

    expect(history.redo()).toBe(true);
    expect(rgbaEquals(pixel(history, 2, 2), BLACK)).toBe(true);
  });

  it('walks through multiple commands in order', () => {
    history.execute(paint(0, 0));
    history.execute(paint(1, 0));
    history.execute(paint(2, 0));
    expect(history.depth).toBe(3);

    history.undo();
    history.undo();
    expect(rgbaEquals(pixel(history, 0, 0), BLACK)).toBe(true);
    expect(rgbaEquals(pixel(history, 1, 0), TRANSPARENT)).toBe(true);
    expect(rgbaEquals(pixel(history, 2, 0), TRANSPARENT)).toBe(true);

    history.redo();
    expect(rgbaEquals(pixel(history, 1, 0), BLACK)).toBe(true);
  });

  it('is a no-op at the boundaries of empty history', () => {
    expect(history.undo()).toBe(false);
    expect(history.redo()).toBe(false);
    expect(history.canUndo).toBe(false);
    expect(history.canRedo).toBe(false);
  });

  it('stops at the ends of a populated history without error', () => {
    history.execute(paint(1, 1));
    expect(history.undo()).toBe(true);
    expect(history.undo()).toBe(false);
    expect(history.redo()).toBe(true);
    expect(history.redo()).toBe(false);
  });
});

describe('History redo invalidation', () => {
  it('drops the redo stack once a new command is executed', () => {
    history.execute(paint(1, 1));
    history.execute(paint(2, 2));
    history.undo();
    expect(history.canRedo).toBe(true);

    history.execute(paint(3, 3));
    expect(history.canRedo).toBe(false);

    // the abandoned branch is gone
    history.undo();
    expect(rgbaEquals(pixel(history, 3, 3), TRANSPARENT)).toBe(true);
    expect(rgbaEquals(pixel(history, 2, 2), TRANSPARENT)).toBe(true);
    expect(rgbaEquals(pixel(history, 1, 1), BLACK)).toBe(true);
  });
});

describe('History.transaction', () => {
  it('commits several mutations as one entry', () => {
    history.transaction('Draw line', (tx) => {
      tx.execute(paint(0, 0));
      tx.execute(paint(1, 1));
      tx.execute(paint(2, 2));
    });

    expect(history.depth).toBe(1);
    expect(history.undoLabel).toBe('Draw line');
    expect(history.document.revision).toBe(1);

    history.undo();
    for (const n of [0, 1, 2]) {
      expect(rgbaEquals(pixel(history, n, n), TRANSPARENT)).toBe(true);
    }
  });

  it('merges affected-object results', () => {
    const document = history.document;
    const layerId = document.layers.activeLayerId;
    const secondLayer = document.addLayer();
    history.clear();

    const result = history.transaction('Touch two layers', (tx) => {
      tx.execute(command('a', () => ({ affectedLayerIds: [layerId] })));
      tx.execute(command('b', () => ({ affectedLayerIds: [secondLayer] })));
    });

    expect(new Set(result.affectedLayerIds)).toEqual(new Set([layerId, secondLayer]));
  });

  it('rolls back every change when the body throws', () => {
    expect(() => {
      history.transaction('Broken', (tx) => {
        tx.execute(paint(5, 5));
        tx.execute(
          mutation('boom', () => {
            throw new Error('mid-transaction failure');
          }),
        );
      });
    }).toThrow('mid-transaction failure');

    expect(rgbaEquals(pixel(history, 5, 5), TRANSPARENT)).toBe(true);
    expect(history.canUndo).toBe(false);
    expect(history.document.revision).toBe(0);
  });

  it('rejects History.execute while a transaction is open', () => {
    expect(() => {
      history.transaction('Outer', (): void => {
        history.execute(paint(0, 0));
      });
    }).toThrow(EditorError);
  });
});

describe('History rollback of a single command', () => {
  it('leaves the document untouched when execute throws', () => {
    expect(() => {
      history.execute(
        mutation('half done', (document) => {
          document.addLayer();
          throw new Error('boom');
        }),
      );
    }).toThrow('boom');

    expect(history.document.layers.count).toBe(1);
    expect(history.canUndo).toBe(false);
    expect(history.document.revision).toBe(0);
  });
});

describe('History limit', () => {
  it('discards the oldest entries past the configured limit', () => {
    const limited = new History(createDefaultDocument(createSequentialIdFactory()), { limit: 2 });
    limited.execute(paint(0, 0));
    limited.execute(paint(1, 1));
    limited.execute(paint(2, 2));

    expect(limited.depth).toBe(2);
    expect(limited.undo()).toBe(true);
    expect(limited.undo()).toBe(true);
    expect(limited.undo()).toBe(false);
    // the first paint is now permanent
    expect(rgbaEquals(pixel(limited, 0, 0), BLACK)).toBe(true);
  });
});

describe('History.clear', () => {
  it('drops the stacks but keeps the current document', () => {
    history.execute(paint(1, 1));
    history.clear();
    expect(history.canUndo).toBe(false);
    expect(history.canRedo).toBe(false);
    expect(rgbaEquals(pixel(history, 1, 1), BLACK)).toBe(true);
  });
});

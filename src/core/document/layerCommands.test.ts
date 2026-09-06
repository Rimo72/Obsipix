import { describe, expect, it } from 'vitest';

import { History } from '@core/history/History';
import { BLACK, TRANSPARENT, WHITE, rgba, rgbaEquals } from '@core/types/color';

import { createDefaultDocument } from './DocumentFactory';
import type { Document } from './Document';
import { createSequentialIdFactory } from './IdFactory';
import {
  addLayerCommand,
  clearLayerCommand,
  flattenCommand,
  mergeDownCommand,
  mergeVisibleCommand,
  moveLayerCommand,
  renameLayerCommand,
  setLayerOpacityCommand,
} from './layerCommands';

function newHistory(): History {
  return new History(createDefaultDocument(createSequentialIdFactory()));
}

function pixelAt(document: Document, x: number, y: number) {
  return document.resolveBuffer(document.layers.activeLayerId)?.getPixel(x, y) ?? TRANSPARENT;
}

describe('layer commands', () => {
  it('add / rename / reorder / opacity are all undoable', () => {
    const history = newHistory();
    const first = history.document.layers.activeLayerId;

    history.execute(addLayerCommand('Sky'));
    const second = history.document.layers.activeLayerId;
    expect(history.document.layers.count).toBe(2);

    history.execute(renameLayerCommand(second, 'Clouds'));
    expect(history.document.layers.require(second).name).toBe('Clouds');

    history.execute(setLayerOpacityCommand(second, 0.4));
    expect(history.document.layers.require(second).opacity).toBeCloseTo(0.4);

    history.execute(moveLayerCommand(second, 0));
    expect(history.document.layers.layerIds()).toEqual([second, first]);

    history.undo();
    expect(history.document.layers.layerIds()).toEqual([first, second]);
    history.undo();
    expect(history.document.layers.require(second).opacity).toBe(1);
    history.undo();
    expect(history.document.layers.require(second).name).toBe('Sky');
    history.undo();
    expect(history.document.layers.count).toBe(1);
  });

  it('clear wipes the active layer on the current frame', () => {
    const history = newHistory();
    history.document.resolveBuffer(history.document.layers.activeLayerId)?.setPixel(1, 1, BLACK);
    history.execute(clearLayerCommand(history.document.layers.activeLayerId));
    expect(rgbaEquals(pixelAt(history.document, 1, 1), TRANSPARENT)).toBe(true);
    history.undo();
    expect(rgbaEquals(pixelAt(history.document, 1, 1), BLACK)).toBe(true);
  });

  it('merge down blends the upper layer into the one below and removes it', () => {
    const history = newHistory();
    const base = history.document.layers.activeLayerId;
    history.document.resolveBuffer(base)?.setPixel(0, 0, WHITE);

    history.execute(addLayerCommand('Top'));
    const top = history.document.layers.activeLayerId;
    history.document.resolveBuffer(top)?.setPixel(1, 1, BLACK);

    history.execute(mergeDownCommand(top));

    expect(history.document.layers.count).toBe(1);
    expect(history.document.layers.activeLayerId).toBe(base);
    expect(rgbaEquals(pixelAt(history.document, 0, 0), WHITE)).toBe(true);
    expect(rgbaEquals(pixelAt(history.document, 1, 1), BLACK)).toBe(true);

    history.undo();
    expect(history.document.layers.count).toBe(2);
  });

  it('merge visible ignores hidden layers', () => {
    const history = newHistory();
    const base = history.document.layers.activeLayerId;
    history.document.resolveBuffer(base)?.setPixel(0, 0, WHITE);

    history.execute(addLayerCommand('Hidden'));
    const hidden = history.document.layers.activeLayerId;
    history.document.resolveBuffer(hidden)?.setPixel(0, 0, BLACK);
    history.document.layers.require(hidden).setVisible(false);

    history.execute(mergeVisibleCommand());
    expect(history.document.layers.count).toBe(2); // hidden layer stays
  });

  it('flatten collapses to a single opaque layer', () => {
    const history = newHistory();
    history.document.resolveBuffer(history.document.layers.activeLayerId)?.setPixel(0, 0, WHITE);
    history.execute(addLayerCommand());
    const top = history.document.layers.activeLayerId;
    history.document.resolveBuffer(top)?.setPixel(0, 0, rgba(0, 0, 0, 128));

    history.execute(flattenCommand());

    expect(history.document.layers.count).toBe(1);
    const result = pixelAt(history.document, 0, 0);
    expect(result.a).toBe(255);
    expect(result.r).toBeGreaterThanOrEqual(126);
    expect(result.r).toBeLessThanOrEqual(129);
  });
});

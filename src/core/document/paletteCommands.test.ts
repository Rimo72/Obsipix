import { describe, expect, it } from 'vitest';

import { History } from '@core/history/History';
import { BLACK, WHITE, rgba, rgbaEquals } from '@core/types/color';
import type { PaletteId } from '@core/types/ids';

import { createDefaultDocument } from './DocumentFactory';
import { createSequentialIdFactory } from './IdFactory';
import { indexOfColor } from './Palette';
import {
  addPaletteColorCommand,
  createPaletteCommand,
  deletePaletteCommand,
  duplicatePaletteCommand,
  movePaletteColorCommand,
  namePaletteColorCommand,
  removePaletteColorCommand,
  renamePaletteCommand,
  setPaletteColorCommand,
} from './paletteCommands';

function newHistory(): History {
  return new History(createDefaultDocument(createSequentialIdFactory()));
}

function activePalette(history: History) {
  const palette = history.document.activePalette;
  if (!palette) {
    throw new Error('no active palette');
  }
  return palette;
}

describe('palette lifecycle commands', () => {
  it('create / rename / duplicate / delete are all undoable', () => {
    const history = newHistory();
    expect(history.document.palettes).toHaveLength(1);

    history.execute(createPaletteCommand('Greys', [BLACK, WHITE]));
    expect(history.document.palettes).toHaveLength(2);
    const greysId = activePalette(history).id;
    expect(activePalette(history).name).toBe('Greys');

    history.execute(renamePaletteCommand(greysId, 'Monochrome'));
    expect(history.document.requirePalette(greysId).name).toBe('Monochrome');

    history.execute(duplicatePaletteCommand(greysId));
    expect(history.document.palettes).toHaveLength(3);

    history.execute(deletePaletteCommand(greysId));
    expect(history.document.getPalette(greysId)).toBeUndefined();

    history.undo();
    expect(history.document.getPalette(greysId)).toBeDefined();
    history.undo();
    expect(history.document.palettes).toHaveLength(2);
    history.undo();
    expect(history.document.requirePalette(greysId).name).toBe('Greys');
    history.undo();
    expect(history.document.palettes).toHaveLength(1);
  });
});

describe('palette colour commands', () => {
  it('add / remove / reorder / edit / name colours, reversibly', () => {
    const history = newHistory();
    const paletteId: PaletteId = activePalette(history).id;
    const initial = activePalette(history).colors.length;

    history.execute(addPaletteColorCommand(paletteId, rgba(1, 2, 3)));
    expect(activePalette(history).colors).toHaveLength(initial + 1);
    const added = activePalette(history).colors.at(-1);
    if (!added) {
      throw new Error('missing colour');
    }

    history.execute(namePaletteColorCommand(paletteId, added.id, 'brand blue'));
    expect(history.document.requirePalette(paletteId).colors.at(-1)?.name).toBe('brand blue');

    history.execute(setPaletteColorCommand(paletteId, added.id, WHITE));
    expect(
      rgbaEquals(history.document.requirePalette(paletteId).colors.at(-1)?.rgba ?? BLACK, WHITE),
    ).toBe(true);

    history.execute(movePaletteColorCommand(paletteId, added.id, 0));
    expect(history.document.requirePalette(paletteId).colors[0]?.id).toBe(added.id);

    history.execute(removePaletteColorCommand(paletteId, added.id));
    expect(activePalette(history).colors).toHaveLength(initial);

    for (let i = 0; i < 5; i += 1) {
      history.undo();
    }
    expect(activePalette(history).colors).toHaveLength(initial);
    expect(indexOfColor(activePalette(history), rgba(1, 2, 3))).toBe(-1);
  });
});

describe('artwork independence', () => {
  it('editing a palette colour never recolours pixels (PROJECT_CORE §3.4)', () => {
    const history = newHistory();
    const layerId = history.document.layers.activeLayerId;
    const paletteId = activePalette(history).id;
    const swatch = activePalette(history).colors[0];
    if (!swatch) {
      throw new Error('empty palette');
    }
    history.document.resolveBuffer(layerId)?.setPixel(1, 1, swatch.rgba);
    const painted = { ...swatch.rgba };

    history.execute(setPaletteColorCommand(paletteId, swatch.id, rgba(200, 100, 50)));

    expect(
      rgbaEquals(history.document.resolveBuffer(layerId)?.getPixel(1, 1) ?? BLACK, painted),
    ).toBe(true);
  });
});

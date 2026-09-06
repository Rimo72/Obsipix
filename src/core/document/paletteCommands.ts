import { mutation, type Command } from '@core/history/Command';
import type { RGBA } from '@core/types/color';
import type { PaletteColorId, PaletteId } from '@core/types/ids';

import type { Document } from './Document';

function colorIndex(document: Document, paletteId: PaletteId, colorId: PaletteColorId): number {
  const palette = document.requirePalette(paletteId);
  const index = palette.colors.findIndex((color) => color.id === colorId);
  if (index < 0) {
    throw new RangeError(`Palette "${paletteId}" has no colour "${colorId}"`);
  }
  return index;
}

// --- Palette lifecycle ------------------------------------------------

export function createPaletteCommand(name: string, colors: readonly RGBA[] = []): Command {
  return mutation('New palette', (document) => {
    document.createPalette(name, colors);
  });
}

export function renamePaletteCommand(paletteId: PaletteId, name: string): Command {
  return mutation('Rename palette', (document) => {
    document.requirePalette(paletteId).name = name;
  });
}

export function deletePaletteCommand(paletteId: PaletteId): Command {
  return mutation('Delete palette', (document) => {
    document.removePalette(paletteId);
  });
}

export function duplicatePaletteCommand(paletteId: PaletteId): Command {
  return mutation('Duplicate palette', (document) => {
    document.duplicatePalette(paletteId);
  });
}

// --- Colours --------------------------------------------------------

export function addPaletteColorCommand(paletteId: PaletteId, rgba: RGBA, name?: string): Command {
  return mutation('Add colour', (document) => {
    document.addPaletteColor(paletteId, rgba, name);
  });
}

export function removePaletteColorCommand(paletteId: PaletteId, colorId: PaletteColorId): Command {
  return mutation('Remove colour', (document) => {
    const index = colorIndex(document, paletteId, colorId);
    document.requirePalette(paletteId).colors.splice(index, 1);
  });
}

export function movePaletteColorCommand(
  paletteId: PaletteId,
  colorId: PaletteColorId,
  toIndex: number,
): Command {
  return mutation('Reorder colour', (document) => {
    const palette = document.requirePalette(paletteId);
    const from = colorIndex(document, paletteId, colorId);
    const [color] = palette.colors.splice(from, 1);
    if (color) {
      palette.colors.splice(Math.max(0, Math.min(toIndex, palette.colors.length)), 0, color);
    }
  });
}

export function setPaletteColorCommand(
  paletteId: PaletteId,
  colorId: PaletteColorId,
  rgba: RGBA,
): Command {
  return mutation('Edit colour', (document) => {
    const color =
      document.requirePalette(paletteId).colors[colorIndex(document, paletteId, colorId)];
    if (color) {
      color.rgba = rgba;
    }
  });
}

export function namePaletteColorCommand(
  paletteId: PaletteId,
  colorId: PaletteColorId,
  name: string,
): Command {
  return mutation('Name colour', (document) => {
    const color =
      document.requirePalette(paletteId).colors[colorIndex(document, paletteId, colorId)];
    if (!color) {
      return;
    }
    if (name.trim() === '') {
      delete color.name;
    } else {
      color.name = name;
    }
  });
}

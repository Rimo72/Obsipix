import { rgbaEquals, type RGBA } from '@core/types/color';
import type { PaletteColorId, PaletteId } from '@core/types/ids';

import type { IdFactory } from './IdFactory';

/** One entry in a palette (PROJECT_CORE §13.5). */
export interface PaletteColor {
  readonly id: PaletteColorId;
  rgba: RGBA;
  /** Optional human name for the swatch. */
  name?: string;
}

/**
 * A named, ordered list of colours (PROJECT_CORE §3.4, §13.5).
 *
 * Artwork stores real RGBA values, so editing a palette never recolours
 * existing pixels — palettes are a picking convenience, not an index.
 */
export interface Palette {
  readonly id: PaletteId;
  name: string;
  colors: PaletteColor[];
}

export function makePaletteColor(ids: IdFactory, rgba: RGBA, name?: string): PaletteColor {
  return name === undefined
    ? { id: ids.paletteColor(), rgba }
    : { id: ids.paletteColor(), rgba, name };
}

export function createPalette(ids: IdFactory, name: string, colors: readonly RGBA[] = []): Palette {
  return {
    id: ids.palette(),
    name,
    colors: colors.map((rgba) => makePaletteColor(ids, rgba)),
  };
}

export function clonePalette(palette: Palette): Palette {
  return {
    id: palette.id,
    name: palette.name,
    colors: palette.colors.map((color) =>
      color.name === undefined
        ? { id: color.id, rgba: color.rgba }
        : { id: color.id, rgba: color.rgba, name: color.name },
    ),
  };
}

/** Index of the first swatch equal to `rgba`, or -1. */
export function indexOfColor(palette: Palette, rgba: RGBA): number {
  return palette.colors.findIndex((color) => rgbaEquals(color.rgba, rgba));
}

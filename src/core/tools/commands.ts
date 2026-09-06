import type { Document } from '@core/document/Document';
import { command, type Command } from '@core/history/Command';
import type { RGBA } from '@core/types/color';
import type { PixelPoint } from '@core/types/geometry';
import type { FrameId, LayerId } from '@core/types/ids';

import { DEFAULT_BRUSH, type Brush } from './Brush';
import { floodFill } from './fill';
import { ellipseOutline, rectangleOutline } from './shapes';
import {
  bresenhamLine,
  paintErase,
  paintSolid,
  paintStroke,
  stampPoints,
  type StrokePaint,
} from './stroke';

export interface StrokeCommandOptions {
  readonly brush?: Brush;
  readonly layerId?: LayerId;
  readonly frameId?: FrameId;
  readonly label?: string;
}

function editGate(document: Document): ((x: number, y: number) => boolean) | undefined {
  const active = document.selection.active;
  if (!active) {
    return undefined;
  }
  return (x, y) => document.selection.isSelected(x, y);
}

function affected(
  document: Document,
  options: StrokeCommandOptions,
): { affectedLayerIds: LayerId[] } {
  return { affectedLayerIds: [options.layerId ?? document.layers.activeLayerId] };
}

function makeStrokeCommand(
  defaultLabel: string,
  path: readonly PixelPoint[],
  paint: StrokePaint,
  options: StrokeCommandOptions,
): Command {
  return command(options.label ?? defaultLabel, (document) => {
    const buffer = document.ensureDrawableBuffer(options.layerId, options.frameId);
    paintStroke(buffer, path, options.brush ?? DEFAULT_BRUSH, paint, editGate(document));
    return affected(document, options);
  });
}

/** A command that stamps `points` exactly (no interpolation) — for shape outlines. */
function makeStampCommand(
  defaultLabel: string,
  points: readonly PixelPoint[],
  paint: StrokePaint,
  options: StrokeCommandOptions,
): Command {
  return command(options.label ?? defaultLabel, (document) => {
    const buffer = document.ensureDrawableBuffer(options.layerId, options.frameId);
    stampPoints(buffer, points, options.brush ?? DEFAULT_BRUSH, paint, editGate(document));
    return affected(document, options);
  });
}

/** A command that draws a solid stroke along `path` — one history entry. */
export function drawStrokeCommand(
  path: readonly PixelPoint[],
  color: RGBA,
  options: StrokeCommandOptions = {},
): Command {
  return makeStrokeCommand('Draw', path, paintSolid(color), options);
}

/** A command that erases a stroke along `path` — one history entry. */
export function eraseStrokeCommand(
  path: readonly PixelPoint[],
  options: StrokeCommandOptions = {},
): Command {
  return makeStrokeCommand('Erase', path, paintErase, options);
}

/** A straight solid line between two document pixels. */
export function lineCommand(
  from: PixelPoint,
  to: PixelPoint,
  color: RGBA,
  options: StrokeCommandOptions = {},
): Command {
  return makeStampCommand('Line', bresenhamLine(from, to), paintSolid(color), options);
}

/** A rectangle outline with opposite corners `a` and `b`. */
export function rectangleCommand(
  a: PixelPoint,
  b: PixelPoint,
  color: RGBA,
  options: StrokeCommandOptions = {},
): Command {
  return makeStampCommand('Rectangle', rectangleOutline(a, b), paintSolid(color), options);
}

/** An ellipse outline inscribed in the box with corners `a` and `b`. */
export function ellipseCommand(
  a: PixelPoint,
  b: PixelPoint,
  color: RGBA,
  options: StrokeCommandOptions = {},
): Command {
  return makeStampCommand('Ellipse', ellipseOutline(a, b), paintSolid(color), options);
}

/** Flood-fill from `seed` with `color`. */
export function fillCommand(
  seed: PixelPoint,
  color: RGBA,
  options: StrokeCommandOptions = {},
): Command {
  return command(options.label ?? 'Fill', (document) => {
    const buffer = document.ensureDrawableBuffer(options.layerId, options.frameId);
    const gate = editGate(document);
    floodFill(buffer, seed, color, gate ? { isAllowed: gate } : {});
    return affected(document, options);
  });
}

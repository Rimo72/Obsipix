import type { Document } from '@core/document/Document';
import { command, type Command } from '@core/history/Command';
import type { RGBA } from '@core/types/color';
import type { PixelPoint } from '@core/types/geometry';
import type { FrameId, LayerId } from '@core/types/ids';

import { DEFAULT_BRUSH, type Brush } from './Brush';
import { paintErase, paintSolid, paintStroke, type StrokePaint } from './stroke';

export interface StrokeCommandOptions {
  readonly brush?: Brush;
  readonly layerId?: LayerId;
  readonly frameId?: FrameId;
  readonly label?: string;
}

function selectionGate(document: Document): ((x: number, y: number) => boolean) | undefined {
  if (!document.selection.active) {
    return undefined;
  }
  return (x, y) => document.selection.isSelected(x, y);
}

function makeStrokeCommand(
  defaultLabel: string,
  path: readonly PixelPoint[],
  paint: StrokePaint,
  options: StrokeCommandOptions,
): Command {
  return command(options.label ?? defaultLabel, (document) => {
    const buffer = document.ensureDrawableBuffer(options.layerId, options.frameId);
    paintStroke(buffer, path, options.brush ?? DEFAULT_BRUSH, paint, selectionGate(document));
    return { affectedLayerIds: [options.layerId ?? document.layers.activeLayerId] };
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

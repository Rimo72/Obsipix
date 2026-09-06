import {
  selectRectCommand,
  selectShapeCommand,
  deselectCommand,
} from '@core/document/editCommands';
import type { Command } from '@core/history/Command';
import { WHITE } from '@core/types/color';
import type { PixelPoint, PixelRegion } from '@core/types/geometry';

import { polygonFillPixels } from './polygon';
import type { PointerInput } from './PointerInput';
import { selectionModeFrom } from './selectionMode';
import { rectangleOutline } from './shapes';
import { bresenhamLine } from './stroke';
import type { PreviewStamp, Tool, ToolContext, ToolKind } from './Tool';

export const RECT_SELECT_TOOL_ID = 'select-rect';
export const LASSO_SELECT_TOOL_ID = 'select-lasso';

function regionBetween(a: PixelPoint, b: PixelPoint): PixelRegion {
  return {
    x: Math.min(a.x, b.x),
    y: Math.min(a.y, b.y),
    width: Math.abs(a.x - b.x) + 1,
    height: Math.abs(a.y - b.y) + 1,
  };
}

function outlineStamps(points: readonly PixelPoint[]): PreviewStamp[] {
  return points.map((point) => ({ x: point.x, y: point.y, color: WHITE }));
}

export class RectangleSelectTool implements Tool {
  readonly id = RECT_SELECT_TOOL_ID;
  readonly kind: ToolKind = 'shape';
  readonly strokeLabel = 'Select';
  #anchor: PixelPoint | null = null;

  onPointerDown(input: PointerInput, context: ToolContext): void {
    if (!input.buttons.left && !input.buttons.right) {
      return;
    }
    this.#anchor = input.pixel;
    context.setPreview(outlineStamps([input.pixel]));
  }

  onPointerMove(input: PointerInput, context: ToolContext): void {
    if (!this.#anchor) {
      return;
    }
    const region = regionBetween(this.#anchor, input.pixel);
    context.setPreview(
      outlineStamps(
        rectangleOutline(
          { x: region.x, y: region.y },
          { x: region.x + region.width - 1, y: region.y + region.height - 1 },
        ),
      ),
    );
    context.requestRender();
  }

  onPointerUp(input: PointerInput, context: ToolContext): Command | null {
    const anchor = this.#anchor;
    this.#anchor = null;
    context.setPreview(null);
    if (!anchor) {
      return null;
    }
    const region = regionBetween(anchor, input.pixel);
    if (
      region.width <= 1 &&
      region.height <= 1 &&
      anchor.x === input.pixel.x &&
      anchor.y === input.pixel.y
    ) {
      return deselectCommand();
    }
    return selectRectCommand(region, selectionModeFrom(input.modifiers));
  }

  onCancel(context: ToolContext): void {
    this.#anchor = null;
    context.setPreview(null);
  }
}

export class LassoSelectTool implements Tool {
  readonly id = LASSO_SELECT_TOOL_ID;
  readonly kind: ToolKind = 'shape';
  readonly strokeLabel = 'Select';
  #points: PixelPoint[] = [];

  onPointerDown(input: PointerInput, context: ToolContext): void {
    if (!input.buttons.left && !input.buttons.right) {
      return;
    }
    this.#points = [input.pixel];
    context.setPreview(outlineStamps([input.pixel]));
  }

  onPointerMove(input: PointerInput, context: ToolContext): void {
    const last = this.#points.at(-1);
    if (!last || (last.x === input.pixel.x && last.y === input.pixel.y)) {
      return;
    }
    this.#points.push(input.pixel);
    const outline: PixelPoint[] = [];
    for (let i = 1; i < this.#points.length; i += 1) {
      const a = this.#points[i - 1];
      const b = this.#points[i];
      if (a && b) {
        outline.push(...bresenhamLine(a, b));
      }
    }
    context.setPreview(outlineStamps(outline));
    context.requestRender();
  }

  onPointerUp(input: PointerInput, context: ToolContext): Command | null {
    const points = this.#points;
    this.#points = [];
    context.setPreview(null);
    if (points.length < 2) {
      return deselectCommand();
    }
    return selectShapeCommand(polygonFillPixels(points), selectionModeFrom(input.modifiers));
  }

  onCancel(context: ToolContext): void {
    this.#points = [];
    context.setPreview(null);
  }
}

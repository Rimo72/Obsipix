import type { Command } from '@core/history/Command';
import { TRANSPARENT, type RGBA } from '@core/types/color';
import type { PixelPoint } from '@core/types/geometry';

import { stampOffsets } from './Brush';
import type { PointerInput } from './PointerInput';
import type { PreviewStamp, Tool, ToolContext, ToolKind } from './Tool';

/**
 * Shared behaviour for line / rectangle / ellipse: pointer-down sets the
 * anchor, each move recomputes the shape and shows it as a preview overlay
 * (never touching artwork), and release returns one {@link Command}.
 */
export abstract class ShapeTool implements Tool {
  abstract readonly id: string;
  abstract readonly strokeLabel: string;
  readonly kind: ToolKind = 'shape';

  #anchor: PixelPoint | null = null;
  #color: RGBA = TRANSPARENT;

  /** The shape's outline pixels for the drag from `a` to `b`. `constrain` is Shift. */
  protected abstract outline(a: PixelPoint, b: PixelPoint, constrain: boolean): PixelPoint[];

  /** Build the command that draws the final shape. */
  protected abstract makeCommand(
    a: PixelPoint,
    b: PixelPoint,
    constrain: boolean,
    color: RGBA,
  ): Command;

  onPointerDown(input: PointerInput, context: ToolContext): void {
    if (!input.buttons.left && !input.buttons.right) {
      return;
    }
    this.#anchor = input.pixel;
    this.#color = input.buttons.right ? context.background : context.foreground;
    this.#updatePreview(input, context);
  }

  onPointerMove(input: PointerInput, context: ToolContext): void {
    if (this.#anchor) {
      this.#updatePreview(input, context);
    }
  }

  onPointerUp(input: PointerInput, context: ToolContext): Command | null {
    const anchor = this.#anchor;
    this.#anchor = null;
    context.setPreview(null);
    if (!anchor) {
      return null;
    }
    return this.makeCommand(anchor, input.pixel, input.modifiers.shift, this.#color);
  }

  onCancel(context: ToolContext): void {
    this.#anchor = null;
    context.setPreview(null);
  }

  #updatePreview(input: PointerInput, context: ToolContext): void {
    if (!this.#anchor) {
      return;
    }
    const offsets = stampOffsets(context.brush);
    const stamps: PreviewStamp[] = [];
    const seen = new Set<number>();
    for (const point of this.outline(this.#anchor, input.pixel, input.modifiers.shift)) {
      for (const offset of offsets) {
        const x = point.x + offset.x;
        const y = point.y + offset.y;
        if (!context.isInsideDocument(x, y)) {
          continue;
        }
        const key = y * 100000 + x;
        if (seen.has(key)) {
          continue;
        }
        seen.add(key);
        stamps.push({ x, y, color: this.#color });
      }
    }
    context.setPreview(stamps);
    context.requestRender();
  }
}

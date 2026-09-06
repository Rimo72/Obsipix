import type { PixelBuffer } from '@core/pixels/PixelBuffer';
import type { PixelPoint } from '@core/types/geometry';

import type { PointerInput } from './PointerInput';
import type { Tool, ToolContext, ToolKind } from './Tool';
import { constrainLine } from './shapes';
import { paintStroke, type StrokePaint } from './stroke';

/**
 * Shared behaviour for pencil-like tools: on pointer-down it captures the
 * drawable buffer and starts stamping; each move interpolates from the last
 * pixel so fast drags leave no gaps (PROJECT_CORE §3.2). One press-drag-release
 * is one stroke; the History layer turns it into one entry.
 *
 * Holding Shift on pointer-down draws a straight line from where the previous
 * stroke ended — the classic click / shift-click polyline workflow (§3.2).
 */
export abstract class StrokeTool implements Tool {
  abstract readonly id: string;
  abstract readonly strokeLabel: string;
  readonly kind: ToolKind = 'stroke';

  #buffer: PixelBuffer | null = null;
  #paint: StrokePaint | null = null;
  #last: PixelPoint | null = null;
  #anchor: PixelPoint | null = null;
  #paintedPixels = 0;

  /** How this tool colours a pixel, decided at the moment the stroke begins. */
  protected abstract paintFor(input: PointerInput, context: ToolContext): StrokePaint;

  hasPendingChanges(): boolean {
    return this.#paintedPixels > 0;
  }

  onPointerDown(input: PointerInput, context: ToolContext): void {
    if (!input.buttons.left && !input.buttons.right) {
      return;
    }
    this.#buffer = context.drawableBuffer();
    this.#paint = this.paintFor(input, context);
    this.#paintedPixels = 0;

    if (input.modifiers.shift && this.#anchor) {
      const end = input.modifiers.ctrl ? constrainLine(this.#anchor, input.pixel) : input.pixel;
      this.#apply([this.#anchor, end], context);
      this.#last = end;
      this.#anchor = end;
    } else {
      this.#apply([input.pixel], context);
      this.#last = input.pixel;
      this.#anchor = input.pixel;
    }
    context.requestRender();
  }

  onPointerMove(input: PointerInput, context: ToolContext): void {
    if (!this.#buffer || !this.#paint || !this.#last) {
      return;
    }
    this.#apply([this.#last, input.pixel], context);
    this.#last = input.pixel;
    this.#anchor = input.pixel;
    context.requestRender();
  }

  onPointerUp(_input: PointerInput, _context: ToolContext): null {
    this.#buffer = null;
    this.#paint = null;
    this.#last = null;
    return null;
  }

  onCancel(_context: ToolContext): void {
    this.#buffer = null;
    this.#paint = null;
    this.#last = null;
    this.#anchor = null;
  }

  #apply(path: readonly PixelPoint[], context: ToolContext): void {
    if (!this.#buffer || !this.#paint) {
      return;
    }
    this.#paintedPixels += paintStroke(this.#buffer, path, context.brush, this.#paint, (x, y) =>
      context.isEditable(x, y),
    );
  }
}

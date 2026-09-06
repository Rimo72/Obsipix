import type { PixelBuffer } from '@core/pixels/PixelBuffer';
import type { PixelPoint } from '@core/types/geometry';

import type { PointerInput } from './PointerInput';
import type { Tool, ToolContext } from './Tool';
import { paintStroke, type StrokePaint } from './stroke';

/**
 * Shared behaviour for pencil-like tools: on pointer-down it captures the
 * drawable buffer and starts stamping; each move interpolates from the last
 * pixel so fast drags leave no gaps (PROJECT_CORE §3.2). One press-drag-release
 * is one stroke; the History layer turns it into one entry.
 */
export abstract class StrokeTool implements Tool {
  abstract readonly id: string;
  abstract readonly strokeLabel: string;

  #buffer: PixelBuffer | null = null;
  #paint: StrokePaint | null = null;
  #last: PixelPoint | null = null;
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
    this.#last = input.pixel;
    this.#paintedPixels = 0;
    this.#apply([input.pixel], context);
    context.requestRender();
  }

  onPointerMove(input: PointerInput, context: ToolContext): void {
    if (!this.#buffer || !this.#paint || !this.#last) {
      return;
    }
    this.#apply([this.#last, input.pixel], context);
    this.#last = input.pixel;
    context.requestRender();
  }

  onPointerUp(_input: PointerInput, _context: ToolContext): void {
    this.#reset();
  }

  onCancel(_context: ToolContext): void {
    this.#reset();
  }

  #apply(path: readonly PixelPoint[], context: ToolContext): void {
    if (!this.#buffer || !this.#paint) {
      return;
    }
    this.#paintedPixels += paintStroke(this.#buffer, path, context.brush, this.#paint, (x, y) =>
      context.isEditable(x, y),
    );
  }

  #reset(): void {
    this.#buffer = null;
    this.#paint = null;
    this.#last = null;
  }
}

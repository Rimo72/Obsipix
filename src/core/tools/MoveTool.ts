import type { Command } from '@core/history/Command';
import type { PixelPoint } from '@core/types/geometry';

import type { PointerInput } from './PointerInput';
import type { Tool, ToolContext, ToolKind } from './Tool';

export const MOVE_TOOL_ID = 'move';

/**
 * Drags the current selection's contents. On pointer-down it lifts the
 * selection into a float (leaving a hole); each move repositions it. The float
 * stays live — it is committed by Enter / a tool switch / a new command and
 * cancelled by Esc (PROJECT_CORE §3.7).
 */
export class MoveTool implements Tool {
  readonly id = MOVE_TOOL_ID;
  readonly kind: ToolKind = 'sample';
  readonly strokeLabel = 'Move';

  #start: PixelPoint | null = null;
  #base: { x: number; y: number } = { x: 0, y: 0 };

  onPointerDown(input: PointerInput, context: ToolContext): void {
    if (!input.buttons.left) {
      return;
    }
    if (!context.ensureFloat()) {
      return;
    }
    this.#start = input.pixel;
    this.#base = context.floatOffset();
  }

  onPointerMove(input: PointerInput, context: ToolContext): void {
    if (!this.#start) {
      return;
    }
    context.setFloatOffset(
      this.#base.x + (input.pixel.x - this.#start.x),
      this.#base.y + (input.pixel.y - this.#start.y),
    );
  }

  onPointerUp(_input: PointerInput, _context: ToolContext): Command | null {
    this.#start = null;
    return null;
  }

  onCancel(_context: ToolContext): void {
    this.#start = null;
  }
}

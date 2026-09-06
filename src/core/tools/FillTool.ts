import type { Command } from '@core/history/Command';
import type { RGBA } from '@core/types/color';
import type { PixelPoint } from '@core/types/geometry';

import { fillCommand } from './commands';
import type { PointerInput } from './PointerInput';
import type { Tool, ToolContext, ToolKind } from './Tool';

export const FILL_TOOL_ID = 'fill';

/** Flood-fills the region under the pointer (PROJECT_CORE §3.2). One click = one entry. */
export class FillTool implements Tool {
  readonly id = FILL_TOOL_ID;
  readonly kind: ToolKind = 'shape';
  readonly strokeLabel = 'Fill';

  #seed: PixelPoint | null = null;
  #color: RGBA | null = null;

  onPointerDown(input: PointerInput, context: ToolContext): void {
    if (!input.buttons.left && !input.buttons.right) {
      return;
    }
    this.#seed = input.pixel;
    this.#color = input.buttons.right ? context.background : context.foreground;
  }

  onPointerMove(): void {
    // fill happens on release
  }

  onPointerUp(input: PointerInput, _context: ToolContext): Command | null {
    const seed = this.#seed;
    const color = this.#color;
    this.#seed = null;
    this.#color = null;
    if (!seed || !color) {
      return null;
    }
    return fillCommand(input.pixel, color);
  }

  onCancel(): void {
    this.#seed = null;
    this.#color = null;
  }
}

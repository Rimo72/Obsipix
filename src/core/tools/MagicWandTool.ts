import { magicWandSelectCommand } from '@core/document/editCommands';
import type { Command } from '@core/history/Command';
import type { PixelPoint } from '@core/types/geometry';

import type { PointerInput } from './PointerInput';
import { selectionModeFrom } from './selectionMode';
import type { Tool, ToolContext, ToolKind } from './Tool';

export const MAGIC_WAND_TOOL_ID = 'magic-wand';

/**
 * Magic Wand: click a pixel to select the contiguous region of matching
 * colour on the active layer (PROJECT_CORE §3.2/§3.6-family — same colour
 * match as Fill, hard-edged at the options bar's default tolerance of 0,
 * same Shift/Alt add/subtract/intersect modifiers as the other select
 * tools). One click = one history entry; like Fill, the pixel used is
 * wherever the pointer is released, not where it was pressed.
 */
export class MagicWandTool implements Tool {
  readonly id = MAGIC_WAND_TOOL_ID;
  readonly kind: ToolKind = 'shape';
  readonly strokeLabel = 'Magic Wand';

  #seed: PixelPoint | null = null;

  onPointerDown(input: PointerInput): void {
    if (!input.buttons.left && !input.buttons.right) {
      return;
    }
    this.#seed = input.pixel;
  }

  onPointerMove(): void {
    // selection happens on release
  }

  onPointerUp(input: PointerInput, context: ToolContext): Command | null {
    const seed = this.#seed;
    this.#seed = null;
    if (!seed) {
      return null;
    }
    return magicWandSelectCommand(input.pixel, selectionModeFrom(input.modifiers), {
      tolerance: context.magicWandTolerance,
    });
  }

  onCancel(): void {
    this.#seed = null;
  }
}

import type { Command } from '@core/history/Command';

import type { PointerInput } from './PointerInput';
import type { Tool, ToolContext, ToolKind } from './Tool';

export const EYEDROPPER_TOOL_ID = 'eyedropper';

/**
 * Picks the colour under the pointer from the flattened image (PROJECT_CORE
 * §3.2). Left button sets the foreground, right button the background. Never
 * mutates the document.
 */
export class EyedropperTool implements Tool {
  readonly id = EYEDROPPER_TOOL_ID;
  readonly kind: ToolKind = 'sample';
  readonly strokeLabel = 'Pick colour';

  #sample(input: PointerInput, context: ToolContext): void {
    if (!context.isInsideDocument(input.pixel.x, input.pixel.y)) {
      return;
    }
    const color = context.sampleColor(input.pixel.x, input.pixel.y);
    if (input.buttons.right) {
      context.setBackground(color);
    } else {
      context.setForeground(color);
    }
  }

  onPointerDown(input: PointerInput, context: ToolContext): void {
    this.#sample(input, context);
  }

  onPointerMove(input: PointerInput, context: ToolContext): void {
    if (input.buttons.left || input.buttons.right) {
      this.#sample(input, context);
    }
  }

  onPointerUp(_input: PointerInput, _context: ToolContext): Command | null {
    return null;
  }

  onCancel(_context: ToolContext): void {
    // nothing transient to drop
  }
}

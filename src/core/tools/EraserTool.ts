import { StrokeTool } from './StrokeTool';
import type { PointerInput } from './PointerInput';
import type { ToolContext } from './Tool';
import { paintErase, type StrokePaint } from './stroke';

export const ERASER_TOOL_ID = 'eraser';

/** Clears pixels to fully transparent along the stroke (PROJECT_CORE §3.2). */
export class EraserTool extends StrokeTool {
  readonly id = ERASER_TOOL_ID;
  readonly strokeLabel = 'Eraser';

  protected paintFor(_input: PointerInput, _context: ToolContext): StrokePaint {
    return paintErase;
  }
}

import { StrokeTool } from './StrokeTool';
import type { PointerInput } from './PointerInput';
import type { ToolContext } from './Tool';
import { paintSolid, type StrokePaint } from './stroke';

export const PENCIL_TOOL_ID = 'pencil';

/**
 * The default drawing tool (PROJECT_CORE §3.2). Left button paints the
 * foreground colour, right button the background colour (§3.3). Hard-edged.
 */
export class PencilTool extends StrokeTool {
  readonly id = PENCIL_TOOL_ID;
  readonly strokeLabel = 'Pencil';

  protected paintFor(input: PointerInput, context: ToolContext): StrokePaint {
    return paintSolid(input.buttons.right ? context.background : context.foreground);
  }
}

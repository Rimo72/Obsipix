import { ERASER_TOOL_ID } from '@core/tools/EraserTool';
import { EYEDROPPER_TOOL_ID } from '@core/tools/EyedropperTool';
import { FILL_TOOL_ID } from '@core/tools/FillTool';
import { MOVE_TOOL_ID } from '@core/tools/MoveTool';
import { PENCIL_TOOL_ID } from '@core/tools/PencilTool';
import { LASSO_SELECT_TOOL_ID, RECT_SELECT_TOOL_ID } from '@core/tools/SelectTools';
import { ELLIPSE_TOOL_ID, LINE_TOOL_ID, RECTANGLE_TOOL_ID } from '@core/tools/shapeTools';

export interface ToolEntry {
  readonly id: string;
  readonly label: string;
  readonly key: string;
}

// Keys follow PROJECT_CORE §17 / §95.6 (B/E/G/I/L/M/R/O). Select and Lasso have
// no key in the spec's tool list; Obsipix keeps them on S and Q.
export const TOOL_CATALOG: readonly ToolEntry[] = [
  { id: PENCIL_TOOL_ID, label: 'Pencil', key: 'B' },
  { id: ERASER_TOOL_ID, label: 'Eraser', key: 'E' },
  { id: EYEDROPPER_TOOL_ID, label: 'Pick', key: 'I' },
  { id: FILL_TOOL_ID, label: 'Fill', key: 'G' },
  { id: LINE_TOOL_ID, label: 'Line', key: 'L' },
  { id: RECTANGLE_TOOL_ID, label: 'Rect', key: 'R' },
  { id: ELLIPSE_TOOL_ID, label: 'Ellipse', key: 'O' },
  { id: RECT_SELECT_TOOL_ID, label: 'Select', key: 'S' },
  { id: LASSO_SELECT_TOOL_ID, label: 'Lasso', key: 'Q' },
  { id: MOVE_TOOL_ID, label: 'Move', key: 'M' },
];

/** Lowercased shortcut key → tool id. */
export const TOOL_SHORTCUTS: Readonly<Record<string, string>> = Object.fromEntries(
  TOOL_CATALOG.map((tool) => [tool.key.toLowerCase(), tool.id]),
);

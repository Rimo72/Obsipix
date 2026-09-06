import { ERASER_TOOL_ID } from '@core/tools/EraserTool';
import { EYEDROPPER_TOOL_ID } from '@core/tools/EyedropperTool';
import { FILL_TOOL_ID } from '@core/tools/FillTool';
import { PENCIL_TOOL_ID } from '@core/tools/PencilTool';
import { ELLIPSE_TOOL_ID, LINE_TOOL_ID, RECTANGLE_TOOL_ID } from '@core/tools/shapeTools';

export interface ToolEntry {
  readonly id: string;
  readonly label: string;
  readonly key: string;
}

export const TOOL_CATALOG: readonly ToolEntry[] = [
  { id: PENCIL_TOOL_ID, label: 'Pencil', key: 'B' },
  { id: ERASER_TOOL_ID, label: 'Eraser', key: 'E' },
  { id: EYEDROPPER_TOOL_ID, label: 'Pick', key: 'I' },
  { id: FILL_TOOL_ID, label: 'Fill', key: 'G' },
  { id: LINE_TOOL_ID, label: 'Line', key: 'L' },
  { id: RECTANGLE_TOOL_ID, label: 'Rect', key: 'U' },
  { id: ELLIPSE_TOOL_ID, label: 'Ellipse', key: 'O' },
];

/** Lowercased shortcut key → tool id. */
export const TOOL_SHORTCUTS: Readonly<Record<string, string>> = Object.fromEntries(
  TOOL_CATALOG.map((tool) => [tool.key.toLowerCase(), tool.id]),
);

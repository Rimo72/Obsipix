import type { Command } from '@core/history/Command';
import type { RGBA } from '@core/types/color';
import type { PixelPoint } from '@core/types/geometry';

import { ShapeTool } from './ShapeTool';
import { ellipseCommand, lineCommand, rectangleCommand } from './commands';
import { constrainLine, constrainToSquare, ellipseOutline, rectangleOutline } from './shapes';
import { bresenhamLine } from './stroke';

export const LINE_TOOL_ID = 'line';
export const RECTANGLE_TOOL_ID = 'rectangle';
export const ELLIPSE_TOOL_ID = 'ellipse';

export class LineTool extends ShapeTool {
  readonly id = LINE_TOOL_ID;
  readonly strokeLabel = 'Line';

  protected outline(a: PixelPoint, b: PixelPoint, constrain: boolean): PixelPoint[] {
    return bresenhamLine(a, constrain ? constrainLine(a, b) : b);
  }

  protected makeCommand(a: PixelPoint, b: PixelPoint, constrain: boolean, color: RGBA): Command {
    return lineCommand(a, constrain ? constrainLine(a, b) : b, color);
  }
}

export class RectangleTool extends ShapeTool {
  readonly id = RECTANGLE_TOOL_ID;
  readonly strokeLabel = 'Rectangle';

  protected outline(a: PixelPoint, b: PixelPoint, constrain: boolean): PixelPoint[] {
    return rectangleOutline(a, constrain ? constrainToSquare(a, b) : b);
  }

  protected makeCommand(a: PixelPoint, b: PixelPoint, constrain: boolean, color: RGBA): Command {
    return rectangleCommand(a, constrain ? constrainToSquare(a, b) : b, color);
  }
}

export class EllipseTool extends ShapeTool {
  readonly id = ELLIPSE_TOOL_ID;
  readonly strokeLabel = 'Ellipse';

  protected outline(a: PixelPoint, b: PixelPoint, constrain: boolean): PixelPoint[] {
    return ellipseOutline(a, constrain ? constrainToSquare(a, b) : b);
  }

  protected makeCommand(a: PixelPoint, b: PixelPoint, constrain: boolean, color: RGBA): Command {
    return ellipseCommand(a, constrain ? constrainToSquare(a, b) : b, color);
  }
}

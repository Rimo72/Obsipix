import type { PixelBuffer } from '@core/pixels/PixelBuffer';
import type { RGBA } from '@core/types/color';

import type { Brush } from './Brush';
import type { PointerInput } from './PointerInput';

/**
 * Everything a tool is allowed to see and do (PROJECT_CORE §7.9). A tool never
 * touches the browser, the History stack, layers or frames directly — it paints
 * into the buffer it is handed and asks for a repaint.
 */
export interface ToolContext {
  /** The active layer's drawable buffer at the active frame, created on demand. */
  drawableBuffer(): PixelBuffer;
  readonly foreground: RGBA;
  readonly background: RGBA;
  readonly brush: Brush;
  /** Whether a pixel may currently be edited (respects an active selection). */
  isEditable(x: number, y: number): boolean;
  /** Request a repaint — used for live feedback during a stroke. */
  requestRender(): void;
}

export interface Tool {
  readonly id: string;
  /**
   * The history-entry label a completed interaction produces, or `null` if the
   * tool never mutates the document (e.g. an eyedropper).
   */
  readonly strokeLabel: string | null;
  onPointerDown(input: PointerInput, context: ToolContext): void;
  onPointerMove(input: PointerInput, context: ToolContext): void;
  onPointerUp(input: PointerInput, context: ToolContext): void;
  /** The interaction was interrupted (pointer lost, tool switched): drop any in-progress state. */
  onCancel(context: ToolContext): void;
  /**
   * Whether the interaction just ended actually changed the document. The
   * session commits the stroke to history only when this is `true` (a click
   * that painted nothing must not create an undo entry). Absent → assume yes.
   */
  hasPendingChanges?(): boolean;
}

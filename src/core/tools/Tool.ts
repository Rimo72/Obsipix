import type { Command } from '@core/history/Command';
import type { PixelBuffer } from '@core/pixels/PixelBuffer';
import type { RGBA } from '@core/types/color';

import type { Brush } from './Brush';
import type { PointerInput } from './PointerInput';

/**
 * - `stroke` — mutates the live buffer during the drag; the session wraps it in
 *   one interactive history entry (pencil, eraser).
 * - `shape`  — shows a preview during the drag and returns a {@link Command}
 *   on release (line, rectangle, ellipse, fill).
 * - `sample` — reads from the document without mutating it (eyedropper).
 */
export type ToolKind = 'stroke' | 'shape' | 'sample';

/** One previewed pixel drawn as an overlay while a shape tool is dragging. */
export interface PreviewStamp {
  readonly x: number;
  readonly y: number;
  readonly color: RGBA;
}

export interface ToolContext {
  /** The active layer's drawable buffer at the active frame (stroke tools). */
  drawableBuffer(): PixelBuffer;
  readonly foreground: RGBA;
  readonly background: RGBA;
  readonly brush: Brush;
  /** Whether a pixel may currently be edited (respects an active selection and layer lock). */
  isEditable(x: number, y: number): boolean;
  /** Whether `(x, y)` is inside the document bounds. */
  isInsideDocument(x: number, y: number): boolean;
  /** Colour under a document pixel in the flattened image (eyedropper). */
  sampleColor(x: number, y: number): RGBA;
  setForeground(color: RGBA): void;
  setBackground(color: RGBA): void;
  /** Show / clear the shape-preview overlay. */
  setPreview(preview: readonly PreviewStamp[] | null): void;
  /** Lift the current selection into a movable float. Returns `false` if there is no selection. */
  ensureFloat(): boolean;
  /** Current float translation ({0,0} when there is no float). */
  floatOffset(): { readonly x: number; readonly y: number };
  setFloatOffset(x: number, y: number): void;
  requestRender(): void;
}

export interface Tool {
  readonly id: string;
  readonly kind: ToolKind;
  /** History-entry label for a completed interaction. */
  readonly strokeLabel: string;
  onPointerDown(input: PointerInput, context: ToolContext): void;
  onPointerMove(input: PointerInput, context: ToolContext): void;
  /**
   * `shape` tools return the command to commit (or `null` if nothing happened);
   * `stroke` and `sample` tools return `null`.
   */
  onPointerUp(input: PointerInput, context: ToolContext): Command | null;
  /** The interaction was interrupted: drop in-progress state and any preview. */
  onCancel(context: ToolContext): void;
  /** `stroke` tools only: did the just-finished stroke change anything? */
  hasPendingChanges?(): boolean;
}

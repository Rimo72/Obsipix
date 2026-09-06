import { createDefaultDocument } from '@core/document/DocumentFactory';
import type { Document } from '@core/document/Document';
import { History, type StrokeHandle } from '@core/history/History';
import { DEFAULT_BRUSH, type Brush } from '@core/tools/Brush';
import { EraserTool, ERASER_TOOL_ID } from '@core/tools/EraserTool';
import { PencilTool, PENCIL_TOOL_ID } from '@core/tools/PencilTool';
import type { PointerInput } from '@core/tools/PointerInput';
import type { Tool, ToolContext } from '@core/tools/Tool';
import { BLACK, WHITE, type RGBA } from '@core/types/color';

import { Viewport } from '@rendering/Viewport';

export interface EditorSessionOptions {
  readonly document?: Document;
}

/**
 * Application-layer coordinator: it owns the {@link History} (and through it the
 * current {@link Document}), the {@link Viewport}, the active tool and the
 * current colours, and turns pointer input into stroke lifecycles
 * (PROJECT_CORE §4.2 "Application Services").
 *
 * It is UI-framework-agnostic; React subscribes via {@link EditorSession.subscribe}.
 */
export class EditorSession {
  readonly history: History;
  readonly viewport = new Viewport();

  readonly #tools: ReadonlyMap<string, Tool>;
  #activeToolId: string = PENCIL_TOOL_ID;
  #foreground: RGBA = BLACK;
  #background: RGBA = WHITE;
  #brush: Brush = DEFAULT_BRUSH;

  #stroke: StrokeHandle | null = null;
  readonly #listeners = new Set<() => void>();
  #version = 0;

  constructor(options: EditorSessionOptions = {}) {
    this.history = new History(options.document ?? createDefaultDocument());
    this.#tools = new Map<string, Tool>([
      [PENCIL_TOOL_ID, new PencilTool()],
      [ERASER_TOOL_ID, new EraserTool()],
    ]);
  }

  get document(): Document {
    return this.history.document;
  }

  get activeToolId(): string {
    return this.#activeToolId;
  }

  get toolIds(): readonly string[] {
    return [...this.#tools.keys()];
  }

  get foreground(): RGBA {
    return this.#foreground;
  }

  get background(): RGBA {
    return this.#background;
  }

  get canUndo(): boolean {
    return this.history.canUndo;
  }

  get canRedo(): boolean {
    return this.history.canRedo;
  }

  get undoLabel(): string | null {
    return this.history.undoLabel;
  }

  get redoLabel(): string | null {
    return this.history.redoLabel;
  }

  #activeTool(): Tool {
    const tool = this.#tools.get(this.#activeToolId);
    if (!tool) {
      throw new Error(`Unknown tool "${this.#activeToolId}"`);
    }
    return tool;
  }

  #context(): ToolContext {
    const document = this.document;
    return {
      drawableBuffer: () => document.ensureDrawableBuffer(),
      foreground: this.#foreground,
      background: this.#background,
      brush: this.#brush,
      isEditable: (x, y) => !document.selection.active || document.selection.isSelected(x, y),
      requestRender: () => {
        this.#emit();
      },
    };
  }

  setTool(id: string): void {
    if (!this.#tools.has(id) || id === this.#activeToolId) {
      return;
    }
    if (this.#stroke) {
      this.cancelStroke();
    }
    this.#activeToolId = id;
    this.#emit();
  }

  setForeground(color: RGBA): void {
    this.#foreground = color;
    this.#emit();
  }

  setBackground(color: RGBA): void {
    this.#background = color;
    this.#emit();
  }

  swapColors(): void {
    [this.#foreground, this.#background] = [this.#background, this.#foreground];
    this.#emit();
  }

  pointerDown(input: PointerInput): void {
    const tool = this.#activeTool();
    if (
      tool.strokeLabel !== null &&
      (input.buttons.left || input.buttons.right) &&
      this.#stroke === null
    ) {
      this.#stroke = this.history.begin(tool.strokeLabel);
    }
    tool.onPointerDown(input, this.#context());
    this.#emit();
  }

  pointerMove(input: PointerInput): void {
    this.#activeTool().onPointerMove(input, this.#context());
  }

  pointerUp(input: PointerInput): void {
    const tool = this.#activeTool();
    tool.onPointerUp(input, this.#context());
    if (this.#stroke) {
      const changed = tool.hasPendingChanges?.() ?? true;
      if (changed) {
        this.#stroke.commit();
      } else {
        this.#stroke.cancel();
      }
      this.#stroke = null;
    }
    this.#emit();
  }

  cancelStroke(): void {
    this.#activeTool().onCancel(this.#context());
    if (this.#stroke) {
      this.#stroke.cancel();
      this.#stroke = null;
    }
    this.#emit();
  }

  undo(): void {
    if (this.history.undo()) {
      this.#emit();
    }
  }

  redo(): void {
    if (this.history.redo()) {
      this.#emit();
    }
  }

  /** Bump the version so external stores repaint. */
  touch(): void {
    this.#emit();
  }

  subscribe(listener: () => void): () => void {
    this.#listeners.add(listener);
    return () => {
      this.#listeners.delete(listener);
    };
  }

  getVersion(): number {
    return this.#version;
  }

  #emit(): void {
    this.#version += 1;
    for (const listener of this.#listeners) {
      listener();
    }
  }
}

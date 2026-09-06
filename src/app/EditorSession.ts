import { compositeDocument } from '@core/document/compositeDocument';
import { createDefaultDocument } from '@core/document/DocumentFactory';
import type { Document } from '@core/document/Document';
import {
  addLayerCommand,
  clearLayerCommand,
  duplicateLayerCommand,
  flattenCommand,
  mergeDownCommand,
  mergeVisibleCommand,
  moveLayerCommand,
  removeLayerCommand,
  renameLayerCommand,
  setLayerLockedCommand,
  setLayerOpacityCommand,
  setLayerVisibilityCommand,
} from '@core/document/layerCommands';
import { History, type StrokeHandle } from '@core/history/History';
import type { Command } from '@core/history/Command';
import { exportPng } from '@core/persistence/png';
import { parseDocument } from '@core/persistence/parse';
import { serializeDocument } from '@core/persistence/serialize';
import { DEFAULT_BRUSH, type Brush, type BrushShape } from '@core/tools/Brush';
import { EraserTool, ERASER_TOOL_ID } from '@core/tools/EraserTool';
import { EyedropperTool, EYEDROPPER_TOOL_ID } from '@core/tools/EyedropperTool';
import { FillTool, FILL_TOOL_ID } from '@core/tools/FillTool';
import { PencilTool, PENCIL_TOOL_ID } from '@core/tools/PencilTool';
import type { PointerInput } from '@core/tools/PointerInput';
import {
  EllipseTool,
  ELLIPSE_TOOL_ID,
  LineTool,
  LINE_TOOL_ID,
  RectangleTool,
  RECTANGLE_TOOL_ID,
} from '@core/tools/shapeTools';
import type { PreviewStamp, Tool, ToolContext } from '@core/tools/Tool';
import { BLACK, WHITE, type RGBA } from '@core/types/color';
import type { LayerId } from '@core/types/ids';

import { Viewport } from '@rendering/Viewport';

export interface EditorSessionOptions {
  readonly document?: Document;
}

const FIT_PADDING = 24;
const ZOOM_STEP = 1.4;

/**
 * Application-layer coordinator: owns the {@link History} (and the current
 * {@link Document}), the {@link Viewport}, the active tool, colours, brush and
 * view toggles, and turns pointer input into tool interactions
 * (PROJECT_CORE §4.2). UI-framework-agnostic; React subscribes via
 * {@link EditorSession.subscribe}.
 */
export class EditorSession {
  readonly history: History;
  readonly viewport = new Viewport();

  readonly #tools: ReadonlyMap<string, Tool>;
  #activeToolId: string = PENCIL_TOOL_ID;
  #foreground: RGBA = BLACK;
  #background: RGBA = WHITE;
  #brush: Brush = DEFAULT_BRUSH;
  #preview: readonly PreviewStamp[] | null = null;
  #showGrid = true;
  #showCheckerboard = true;

  #stroke: StrokeHandle | null = null;
  #fileName: string | null = null;
  #viewSize: { width: number; height: number } | null = null;

  readonly #listeners = new Set<() => void>();
  #version = 0;

  constructor(options: EditorSessionOptions = {}) {
    this.history = new History(options.document ?? createDefaultDocument());
    this.#tools = new Map<string, Tool>([
      [PENCIL_TOOL_ID, new PencilTool()],
      [ERASER_TOOL_ID, new EraserTool()],
      [EYEDROPPER_TOOL_ID, new EyedropperTool()],
      [FILL_TOOL_ID, new FillTool()],
      [LINE_TOOL_ID, new LineTool()],
      [RECTANGLE_TOOL_ID, new RectangleTool()],
      [ELLIPSE_TOOL_ID, new EllipseTool()],
    ]);
  }

  get document(): Document {
    return this.history.document;
  }

  get isDirty(): boolean {
    return this.history.isDirty;
  }

  get fileName(): string | null {
    return this.#fileName;
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

  get brush(): Brush {
    return this.#brush;
  }

  get preview(): readonly PreviewStamp[] | null {
    return this.#preview;
  }

  get showGrid(): boolean {
    return this.#showGrid;
  }

  get showCheckerboard(): boolean {
    return this.#showCheckerboard;
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

  // --- Persistence -------------------------------------------------------

  serialize(): Uint8Array {
    return serializeDocument(this.document);
  }

  markSaved(name: string): void {
    this.history.markSaved();
    this.#fileName = name;
    this.#emit();
  }

  open(bytes: Uint8Array, name: string): void {
    const document = parseDocument(bytes);
    if (this.#stroke) {
      this.cancelStroke();
    }
    this.history.reset(document);
    this.#fileName = name;
    this.#preview = null;
    this.fitView();
    this.#emit();
  }

  newDocument(): void {
    if (this.#stroke) {
      this.cancelStroke();
    }
    this.history.reset(createDefaultDocument());
    this.#fileName = null;
    this.#preview = null;
    this.fitView();
    this.#emit();
  }

  exportPngBytes(): Uint8Array {
    return exportPng(this.document);
  }

  // --- Tools & colours --------------------------------------------------

  #activeTool(): Tool {
    const tool = this.#tools.get(this.#activeToolId);
    if (!tool) {
      throw new Error(`Unknown tool "${this.#activeToolId}"`);
    }
    return tool;
  }

  #context(): ToolContext {
    const document = this.document;
    const editable = (x: number, y: number): boolean => {
      if (document.selection.active && !document.selection.isSelected(x, y)) {
        return false;
      }
      return !document.layers.activeLayer.locked;
    };
    return {
      drawableBuffer: () => document.ensureDrawableBuffer(),
      foreground: this.#foreground,
      background: this.#background,
      brush: this.#brush,
      isEditable: editable,
      isInsideDocument: (x, y) =>
        x >= 0 && y >= 0 && x < document.dimensions.width && y < document.dimensions.height,
      sampleColor: (x, y) => compositeDocument(document).getPixel(x, y),
      setForeground: (color) => {
        this.setForeground(color);
      },
      setBackground: (color) => {
        this.setBackground(color);
      },
      setPreview: (preview) => {
        this.#preview = preview;
      },
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
    this.#preview = null;
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

  setBrushSize(size: number): void {
    this.#brush = { ...this.#brush, size: Math.max(1, Math.round(size)) };
    this.#emit();
  }

  setBrushShape(shape: BrushShape): void {
    this.#brush = { ...this.#brush, shape };
    this.#emit();
  }

  // --- View ------------------------------------------------------------

  setViewSize(width: number, height: number): void {
    const first = this.#viewSize === null;
    this.#viewSize = { width, height };
    if (first) {
      this.fitView();
    }
  }

  fitView(): void {
    if (!this.#viewSize) {
      return;
    }
    this.viewport.fit(
      this.#viewSize.width,
      this.#viewSize.height,
      this.document.dimensions,
      FIT_PADDING,
    );
    this.#emit();
  }

  zoomIn(): void {
    this.#zoomAroundCentre(ZOOM_STEP);
  }

  zoomOut(): void {
    this.#zoomAroundCentre(1 / ZOOM_STEP);
  }

  #zoomAroundCentre(factor: number): void {
    const size = this.#viewSize ?? { width: 0, height: 0 };
    this.viewport.zoomAround({ x: size.width / 2, y: size.height / 2 }, factor);
    this.#emit();
  }

  toggleGrid(): void {
    this.#showGrid = !this.#showGrid;
    this.#emit();
  }

  toggleCheckerboard(): void {
    this.#showCheckerboard = !this.#showCheckerboard;
    this.#emit();
  }

  // --- Pointer lifecycle ---------------------------------------------

  pointerDown(input: PointerInput): void {
    const tool = this.#activeTool();
    const pressed = input.buttons.left || input.buttons.right;
    if (tool.kind === 'stroke' && pressed && this.#stroke === null) {
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
    const command = tool.onPointerUp(input, this.#context());

    if (this.#stroke) {
      const changed = tool.hasPendingChanges?.() ?? true;
      if (changed) {
        this.#stroke.commit();
      } else {
        this.#stroke.cancel();
      }
      this.#stroke = null;
    } else if (command) {
      this.history.execute(command);
    }

    this.#preview = null;
    this.#emit();
  }

  cancelStroke(): void {
    this.#activeTool().onCancel(this.#context());
    if (this.#stroke) {
      this.#stroke.cancel();
      this.#stroke = null;
    }
    this.#preview = null;
    this.#emit();
  }

  // --- History & commands -------------------------------------------

  runCommand(command: Command): void {
    if (this.#stroke) {
      return;
    }
    this.history.execute(command);
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

  // --- Layers --------------------------------------------------------

  setActiveLayer(layerId: LayerId): void {
    this.document.setActiveLayer(layerId);
    this.#emit();
  }

  setActiveFrame(frameId: Parameters<Document['setActiveFrame']>[0]): void {
    this.document.setActiveFrame(frameId);
    this.#emit();
  }

  addLayer(): void {
    this.runCommand(addLayerCommand());
  }

  removeActiveLayer(): void {
    if (this.document.layers.count > 1) {
      this.runCommand(removeLayerCommand(this.document.layers.activeLayerId));
    }
  }

  duplicateActiveLayer(): void {
    this.runCommand(duplicateLayerCommand(this.document.layers.activeLayerId));
  }

  renameLayer(layerId: LayerId, name: string): void {
    this.runCommand(renameLayerCommand(layerId, name));
  }

  moveLayer(layerId: LayerId, toIndex: number): void {
    this.runCommand(moveLayerCommand(layerId, toIndex));
  }

  setLayerVisibility(layerId: LayerId, visible: boolean): void {
    this.runCommand(setLayerVisibilityCommand(layerId, visible));
  }

  setLayerLocked(layerId: LayerId, locked: boolean): void {
    this.runCommand(setLayerLockedCommand(layerId, locked));
  }

  setLayerOpacity(layerId: LayerId, opacity: number): void {
    this.runCommand(setLayerOpacityCommand(layerId, opacity));
  }

  clearActiveLayer(): void {
    this.runCommand(clearLayerCommand(this.document.layers.activeLayerId));
  }

  mergeActiveLayerDown(): void {
    if (this.document.layers.indexOf(this.document.layers.activeLayerId) > 0) {
      this.runCommand(mergeDownCommand(this.document.layers.activeLayerId));
    }
  }

  mergeVisibleLayers(): void {
    this.runCommand(mergeVisibleCommand());
  }

  flatten(): void {
    this.runCommand(flattenCommand());
  }

  // --- Subscription ------------------------------------------------

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

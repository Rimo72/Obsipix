import { compositeDocument } from '@core/document/compositeDocument';
import { onionSkinFrames } from '@core/document/onionFrames';
import { createDefaultDocument, DocumentFactory } from '@core/document/DocumentFactory';
import type { Document } from '@core/document/Document';
import {
  bufferFromImage,
  importLayerCommand,
  type ImageData8,
} from '@core/document/importCommands';
import {
  deleteSelectionCommand,
  deselectCommand,
  flipCommand,
  pasteCommand,
  resizeCanvasCommand,
  resizeImageCommand,
  rotateDocumentCommand,
  rotateSelectionCommand,
  selectAllCommand,
} from '@core/document/editCommands';
import {
  addEmptyFrameCommand,
  addFrameCommand,
  addTagCommand,
  applyFpsCommand,
  clearCelCommand,
  deleteFrameCommand,
  deleteTagCommand,
  duplicateFrameCommand,
  holdCelCommand,
  linkCelCommand,
  makeCelUniqueCommand,
  moveFrameCommand,
  setFrameDurationCommand,
  updateTagCommand,
  type TagPatch,
} from '@core/document/animationCommands';
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
import { PixelBuffer } from '@core/pixels/PixelBuffer';
import { DEFAULT_BRUSH, type Brush, type BrushShape } from '@core/tools/Brush';
import { EraserTool, ERASER_TOOL_ID } from '@core/tools/EraserTool';
import { EyedropperTool, EYEDROPPER_TOOL_ID } from '@core/tools/EyedropperTool';
import { FillTool, FILL_TOOL_ID } from '@core/tools/FillTool';
import { MoveTool, MOVE_TOOL_ID } from '@core/tools/MoveTool';
import { PencilTool, PENCIL_TOOL_ID } from '@core/tools/PencilTool';
import type { PointerInput } from '@core/tools/PointerInput';
import {
  LassoSelectTool,
  LASSO_SELECT_TOOL_ID,
  RectangleSelectTool,
  RECT_SELECT_TOOL_ID,
} from '@core/tools/SelectTools';
import {
  EllipseTool,
  ELLIPSE_TOOL_ID,
  LineTool,
  LINE_TOOL_ID,
  RectangleTool,
  RECTANGLE_TOOL_ID,
} from '@core/tools/shapeTools';
import {
  addPaletteColorCommand,
  createPaletteCommand,
  deletePaletteCommand,
  duplicatePaletteCommand,
  movePaletteColorCommand,
  namePaletteColorCommand,
  removePaletteColorCommand,
  renamePaletteCommand,
  setPaletteColorCommand,
} from '@core/document/paletteCommands';
import { flipHorizontal, flipVertical, rotateQuarter, type Quarter } from '@core/tools/transform';
import type { PreviewStamp, Tool, ToolContext } from '@core/tools/Tool';
import { BLACK, TRANSPARENT, WHITE, rgbaEquals, type RGBA } from '@core/types/color';
import type { Dimensions } from '@core/types/geometry';
import type { AnimationTagId, FrameId, LayerId, PaletteColorId, PaletteId } from '@core/types/ids';

import { Viewport } from '@rendering/Viewport';

interface Float {
  readonly handle: StrokeHandle;
  content: PixelBuffer;
  origin: { x: number; y: number };
  offset: { x: number; y: number };
  readonly layerId: LayerId;
}

export interface FloatPreview {
  readonly bytes: Uint8ClampedArray;
  readonly width: number;
  readonly height: number;
  readonly x: number;
  readonly y: number;
}

export interface EditorSessionOptions {
  readonly document?: Document;
}

const FIT_PADDING = 24;
const ZOOM_STEP = 1.4;
const RECENT_COLOR_LIMIT = 16;

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
  #float: Float | null = null;
  #clipboard: PixelBuffer | null = null;
  #recentColors: readonly RGBA[] = [];
  #fileName: string | null = null;
  #viewSize: { width: number; height: number } | null = null;

  #playing = false;
  #playMode: 'loop' | 'once' = 'loop';
  #playTimer: number | null = null;
  #cursor: { x: number; y: number } | null = null;

  readonly #listeners = new Set<() => void>();
  #version = 0;
  readonly #cursorListeners = new Set<() => void>();
  #cursorVersion = 0;

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
      [RECT_SELECT_TOOL_ID, new RectangleSelectTool()],
      [LASSO_SELECT_TOOL_ID, new LassoSelectTool()],
      [MOVE_TOOL_ID, new MoveTool()],
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
    this.#commitFloat();
    return serializeDocument(this.document);
  }

  /**
   * Serialize the current document with no side effects — no float commit, no
   * event. For autosave, which must never disturb what the user is doing.
   */
  peekBytes(): Uint8Array {
    return serializeDocument(this.document);
  }

  /** True while a brush stroke or a floating selection is mid-interaction. */
  get isInteracting(): boolean {
    return this.#stroke !== null || this.#float !== null;
  }

  markSaved(name: string): void {
    this.history.markSaved();
    this.#fileName = name;
    this.#emit();
  }

  open(bytes: Uint8Array, name: string): void {
    const document = parseDocument(bytes);
    this.#discardInteraction();
    this.history.reset(document);
    this.#fileName = name;
    this.fitView();
    this.#emit();
  }

  /**
   * Load recovered autosave bytes. Like {@link open}, but the document stays
   * dirty — it is unsaved work that still needs a real Save (PROJECT_CORE §3.13).
   */
  recover(bytes: Uint8Array, name: string | null): void {
    const document = parseDocument(bytes);
    this.#discardInteraction();
    this.history.reset(document, true);
    this.#fileName = name;
    this.fitView();
    this.#emit();
  }

  newDocument(): void {
    this.#discardInteraction();
    this.history.reset(createDefaultDocument());
    this.#fileName = null;
    this.fitView();
    this.#emit();
  }

  /** Replace the whole project with an imported image (PROJECT_CORE §3.11). Stays dirty. */
  importAsDocument(image: ImageData8, name: string): void {
    const document = new DocumentFactory().create({
      width: image.width,
      height: image.height,
      name,
    });
    document
      .ensureDrawableBuffer(document.layers.activeLayerId)
      .copyRegion(
        bufferFromImage(image),
        { x: 0, y: 0, width: image.width, height: image.height },
        { x: 0, y: 0 },
      );
    this.#discardInteraction();
    this.history.reset(document, true);
    this.#fileName = null;
    this.fitView();
    this.#emit();
  }

  /** Import an image as a new top layer of the current document (undoable). */
  importAsLayer(image: ImageData8, name: string): void {
    this.runCommand(importLayerCommand(name, image));
  }

  exportPngBytes(): Uint8Array {
    this.#commitFloat();
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
      ensureFloat: () => this.#beginFloat(),
      floatOffset: () => (this.#float ? this.#float.offset : { x: 0, y: 0 }),
      setFloatOffset: (x, y) => {
        if (this.#float) {
          this.#float.offset = { x, y };
          this.#emit();
        }
      },
      requestRender: () => {
        this.#emit();
      },
    };
  }

  setTool(id: string): void {
    if (!this.#tools.has(id)) {
      return;
    }
    this.#commitFloat();
    if (id === this.#activeToolId) {
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
    this.#pushRecent(color);
    this.#emit();
  }

  setBackground(color: RGBA): void {
    this.#background = color;
    this.#pushRecent(color);
    this.#emit();
  }

  get recentColors(): readonly RGBA[] {
    return this.#recentColors;
  }

  #pushRecent(color: RGBA): void {
    this.#recentColors = [
      color,
      ...this.#recentColors.filter((existing) => !rgbaEquals(existing, color)),
    ].slice(0, RECENT_COLOR_LIMIT);
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
    // Any tool other than Move commits a pending float before it starts.
    if (tool.id !== MOVE_TOOL_ID) {
      this.#commitFloat();
    }
    if (tool.kind === 'stroke' && pressed && this.#stroke === null) {
      this.#stroke = this.history.begin(tool.strokeLabel);
    }
    tool.onPointerDown(input, this.#context());
    this.#emit();
  }

  pointerMove(input: PointerInput): void {
    this.#activeTool().onPointerMove(input, this.#context());
    const { x, y } = input.pixel;
    if (!this.#cursor || this.#cursor.x !== x || this.#cursor.y !== y) {
      this.#cursor = { x, y };
      // A hover moves many times a second; keep it off the main render path.
      this.#emitCursor();
    }
  }

  /** Last known pointer position in document pixels, or `null` when off-canvas. */
  get cursor(): { readonly x: number; readonly y: number } | null {
    return this.#cursor;
  }

  clearCursor(): void {
    if (this.#cursor) {
      this.#cursor = null;
      this.#emitCursor();
    }
  }

  /** A light subscription just for the pointer read-out; see {@link pointerMove}. */
  subscribeCursor(listener: () => void): () => void {
    this.#cursorListeners.add(listener);
    return () => {
      this.#cursorListeners.delete(listener);
    };
  }

  getCursorVersion(): number {
    return this.#cursorVersion;
  }

  #emitCursor(): void {
    this.#cursorVersion += 1;
    for (const listener of this.#cursorListeners) {
      listener();
    }
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

  #discardInteraction(): void {
    this.pause();
    if (this.#stroke) {
      this.cancelStroke();
    }
    this.cancelFloat();
    this.#preview = null;
  }

  // --- Floating selection (PROJECT_CORE §3.7) -------------------------

  get hasFloat(): boolean {
    return this.#float !== null;
  }

  get floatingPreview(): FloatPreview | null {
    if (!this.#float) {
      return null;
    }
    const { content, origin, offset } = this.#float;
    return {
      bytes: content.toBytes(),
      width: content.width,
      height: content.height,
      x: origin.x + offset.x,
      y: origin.y + offset.y,
    };
  }

  /** Lift the current selection into a float. Returns `false` when there is nothing to lift. */
  #beginFloat(): boolean {
    if (this.#float) {
      return true;
    }
    if (this.#stroke) {
      return false;
    }
    const document = this.document;
    const bounds = document.selection.bounds();
    if (!bounds || !document.selection.active) {
      return false;
    }
    const layerId = document.layers.activeLayerId;
    const buffer = document.ensureDrawableBuffer(layerId);
    const content = PixelBuffer.create(bounds.width, bounds.height);
    const handle = this.history.begin('Transform');
    for (let ly = 0; ly < bounds.height; ly += 1) {
      for (let lx = 0; lx < bounds.width; lx += 1) {
        const x = bounds.x + lx;
        const y = bounds.y + ly;
        if (document.selection.isSelected(x, y)) {
          content.setPixel(lx, ly, buffer.getPixel(x, y));
          buffer.setPixel(x, y, TRANSPARENT);
        }
      }
    }
    this.#float = {
      handle,
      content,
      origin: { x: bounds.x, y: bounds.y },
      offset: { x: 0, y: 0 },
      layerId,
    };
    this.#emit();
    return true;
  }

  #commitFloat(): void {
    const float = this.#float;
    if (!float) {
      return;
    }
    this.#float = null;
    const document = this.document;
    const buffer = document.ensureDrawableBuffer(float.layerId);
    const width = document.dimensions.width;
    const placed = new Set<number>();
    for (let ly = 0; ly < float.content.height; ly += 1) {
      for (let lx = 0; lx < float.content.width; lx += 1) {
        const pixel = float.content.getPixel(lx, ly);
        const x = float.origin.x + float.offset.x + lx;
        const y = float.origin.y + float.offset.y + ly;
        if (pixel.a > 0 && buffer.contains(x, y)) {
          buffer.setPixel(x, y, pixel);
          placed.add(y * width + x);
        }
      }
    }
    document.selection.applyShape((x, y) => placed.has(y * width + x), 'replace');
    float.handle.commit();
    this.#emit();
  }

  commitFloat(): void {
    this.#commitFloat();
  }

  cancelFloat(): void {
    if (!this.#float) {
      return;
    }
    this.#float.handle.cancel();
    this.#float = null;
    this.#emit();
  }

  #transformFloat(transform: (buffer: PixelBuffer) => PixelBuffer): void {
    const float = this.#float;
    if (!float) {
      return;
    }
    const before = float.content;
    const after = transform(before);
    const centreX = float.origin.x + float.offset.x + (before.width - 1) / 2;
    const centreY = float.origin.y + float.offset.y + (before.height - 1) / 2;
    float.content = after;
    float.origin = {
      x: Math.round(centreX - (after.width - 1) / 2) - float.offset.x,
      y: Math.round(centreY - (after.height - 1) / 2) - float.offset.y,
    };
    this.#emit();
  }

  /** Move the float (or lift the selection first) by whole pixels — arrow keys. */
  nudge(dx: number, dy: number): void {
    if (!this.#float && !this.#beginFloat()) {
      return;
    }
    if (this.#float) {
      this.#float.offset = { x: this.#float.offset.x + dx, y: this.#float.offset.y + dy };
      this.#emit();
    }
  }

  // --- History & commands -------------------------------------------

  runCommand(command: Command): void {
    if (this.#stroke) {
      return;
    }
    this.#commitFloat();
    this.history.execute(command);
    this.#emit();
  }

  undo(): void {
    this.#commitFloat();
    if (this.history.undo()) {
      this.#emit();
    }
  }

  redo(): void {
    this.#commitFloat();
    if (this.history.redo()) {
      this.#emit();
    }
  }

  // --- Selection & transform ------------------------------------------

  selectAll(): void {
    this.runCommand(selectAllCommand());
  }

  deselect(): void {
    if (this.#float) {
      this.#commitFloat();
    }
    this.runCommand(deselectCommand());
  }

  deleteSelection(): void {
    this.#commitFloat();
    this.runCommand(deleteSelectionCommand());
  }

  flip(axis: 'horizontal' | 'vertical'): void {
    if (this.#float) {
      this.#transformFloat(axis === 'horizontal' ? flipHorizontal : flipVertical);
      return;
    }
    this.runCommand(flipCommand(axis));
  }

  rotate(quarter: Quarter): void {
    if (this.#float) {
      this.#transformFloat((buffer) => rotateQuarter(buffer, quarter));
      return;
    }
    if (this.document.selection.active) {
      this.runCommand(rotateSelectionCommand(quarter));
    } else {
      this.runCommand(rotateDocumentCommand(quarter));
    }
  }

  resizeImage(dimensions: Dimensions): void {
    this.runCommand(resizeImageCommand(dimensions));
    this.fitView();
  }

  resizeCanvas(
    dimensions: Dimensions,
    anchorX: 'left' | 'center' | 'right' = 'center',
    anchorY: 'top' | 'center' | 'bottom' = 'center',
  ): void {
    this.runCommand(resizeCanvasCommand(dimensions, anchorX, anchorY));
    this.fitView();
  }

  copy(): void {
    this.#commitFloat();
    const document = this.document;
    const source = document.resolveBuffer(document.layers.activeLayerId);
    if (!source) {
      return;
    }
    const region = document.selection.bounds() ?? {
      x: 0,
      y: 0,
      width: document.dimensions.width,
      height: document.dimensions.height,
    };
    const clip = PixelBuffer.create(region.width, region.height);
    for (let ly = 0; ly < region.height; ly += 1) {
      for (let lx = 0; lx < region.width; lx += 1) {
        const x = region.x + lx;
        const y = region.y + ly;
        if (source.contains(x, y) && document.selection.isSelected(x, y)) {
          clip.setPixel(lx, ly, source.getPixel(x, y));
        }
      }
    }
    this.#clipboard = clip;
    this.#emit();
  }

  cut(): void {
    this.copy();
    this.runCommand(deleteSelectionCommand());
  }

  paste(): void {
    this.#commitFloat();
    if (!this.#clipboard) {
      return;
    }
    const { width, height } = this.document.dimensions;
    const at = {
      x: Math.max(0, Math.floor((width - this.#clipboard.width) / 2)),
      y: Math.max(0, Math.floor((height - this.#clipboard.height) / 2)),
    };
    this.runCommand(pasteCommand(this.#clipboard, at));
  }

  get canPaste(): boolean {
    return this.#clipboard !== null;
  }

  // --- Palettes (PROJECT_CORE §3.4) ----------------------------------

  setActivePalette(id: PaletteId | null): void {
    this.document.setActivePalette(id);
    this.#emit();
  }

  createPalette(name?: string): void {
    const count = this.document.palettes.length + 1;
    this.runCommand(createPaletteCommand(name ?? `Palette ${String(count)}`));
  }

  renamePalette(id: PaletteId, name: string): void {
    this.runCommand(renamePaletteCommand(id, name));
  }

  deletePalette(id: PaletteId): void {
    this.runCommand(deletePaletteCommand(id));
  }

  duplicateActivePalette(): void {
    const id = this.document.activePaletteId;
    if (id) {
      this.runCommand(duplicatePaletteCommand(id));
    }
  }

  addColorToActivePalette(color: RGBA = this.#foreground): void {
    const id = this.document.activePaletteId;
    if (id) {
      this.runCommand(addPaletteColorCommand(id, color));
    }
  }

  removePaletteColor(paletteId: PaletteId, colorId: PaletteColorId): void {
    this.runCommand(removePaletteColorCommand(paletteId, colorId));
  }

  movePaletteColor(paletteId: PaletteId, colorId: PaletteColorId, toIndex: number): void {
    this.runCommand(movePaletteColorCommand(paletteId, colorId, toIndex));
  }

  setPaletteColor(paletteId: PaletteId, colorId: PaletteColorId, rgba: RGBA): void {
    this.runCommand(setPaletteColorCommand(paletteId, colorId, rgba));
  }

  namePaletteColor(paletteId: PaletteId, colorId: PaletteColorId, name: string): void {
    this.runCommand(namePaletteColorCommand(paletteId, colorId, name));
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

  // --- Animation: frames, cels, tags (PROJECT_CORE §3.9) --------------

  addFrame(): void {
    this.runCommand(addFrameCommand());
  }

  addEmptyFrame(): void {
    this.runCommand(addEmptyFrameCommand());
  }

  duplicateActiveFrame(): void {
    this.runCommand(duplicateFrameCommand(this.document.timeline.activeFrameId));
  }

  deleteActiveFrame(): void {
    if (this.document.timeline.frameCount > 1) {
      this.runCommand(deleteFrameCommand(this.document.timeline.activeFrameId));
    }
  }

  moveFrame(frameId: FrameId, toIndex: number): void {
    this.runCommand(moveFrameCommand(frameId, toIndex));
  }

  setFrameDuration(frameId: FrameId, durationMs: number): void {
    this.runCommand(setFrameDurationCommand(frameId, durationMs));
  }

  applyFps(fps: number): void {
    this.runCommand(applyFpsCommand(fps));
  }

  linkCel(sourceFrameId: FrameId, targetFrameId: FrameId, layerId: LayerId): void {
    this.runCommand(linkCelCommand(sourceFrameId, targetFrameId, layerId));
  }

  holdCel(frameId: FrameId, layerId: LayerId): void {
    this.runCommand(holdCelCommand(frameId, layerId));
  }

  makeCelUnique(frameId: FrameId, layerId: LayerId): void {
    this.runCommand(makeCelUniqueCommand(frameId, layerId));
  }

  clearCel(frameId: FrameId, layerId: LayerId): void {
    this.runCommand(clearCelCommand(frameId, layerId));
  }

  addTag(name: string, startFrame: number, endFrame: number): void {
    this.runCommand(addTagCommand(name, startFrame, endFrame));
  }

  updateTag(tagId: AnimationTagId, patch: TagPatch): void {
    this.runCommand(updateTagCommand(tagId, patch));
  }

  deleteTag(tagId: AnimationTagId): void {
    this.runCommand(deleteTagCommand(tagId));
  }

  // --- Onion skin (transient toggle, persisted setting; not undoable) ---

  toggleOnionSkin(): void {
    this.document.timeline.setOnionSkin({ enabled: !this.document.timeline.onionSkin.enabled });
    this.#emit();
  }

  setOnionSkin(patch: Partial<{ previous: number; next: number; opacity: number }>): void {
    this.document.timeline.setOnionSkin(patch);
    this.#emit();
  }

  get onionSkin(): { enabled: boolean; previous: number; next: number; opacity: number } {
    return { ...this.document.timeline.onionSkin };
  }

  /** Flattened neighbour frames for the renderer's onion pass; empty while playing. */
  onionOverlays(): {
    bytes: Uint8ClampedArray;
    width: number;
    height: number;
    opacity: number;
    before: boolean;
  }[] {
    if (this.#playing) {
      return [];
    }
    return onionSkinFrames(this.document, this.document.timeline.onionSkin).map((frame) => ({
      bytes: frame.buffer.toBytes(),
      width: frame.buffer.width,
      height: frame.buffer.height,
      opacity: frame.opacity,
      before: frame.before,
    }));
  }

  // --- Playback (transient — never in history or the file) -------------

  get isPlaying(): boolean {
    return this.#playing;
  }

  get playMode(): 'loop' | 'once' {
    return this.#playMode;
  }

  setPlayMode(mode: 'loop' | 'once'): void {
    this.#playMode = mode;
    this.#emit();
  }

  togglePlay(): void {
    if (this.#playing) {
      this.pause();
    } else {
      this.play();
    }
  }

  play(): void {
    if (this.#playing || this.document.timeline.frameCount < 2) {
      return;
    }
    this.#commitFloat();
    this.#playing = true;
    this.#scheduleNextFrame();
    this.#emit();
  }

  pause(): void {
    if (!this.#playing) {
      return;
    }
    this.#playing = false;
    if (this.#playTimer !== null) {
      clearTimeout(this.#playTimer);
      this.#playTimer = null;
    }
    this.#emit();
  }

  stop(): void {
    this.pause();
    this.firstFrame();
  }

  firstFrame(): void {
    this.pause();
    this.document.setActiveFrame(this.document.timeline.frameAt(0).id);
    this.#emit();
  }

  lastFrame(): void {
    this.pause();
    const timeline = this.document.timeline;
    this.document.setActiveFrame(timeline.frameAt(timeline.frameCount - 1).id);
    this.#emit();
  }

  nextFrame(): void {
    this.pause();
    this.#step(1);
  }

  prevFrame(): void {
    this.pause();
    this.#step(-1);
  }

  #step(delta: number): void {
    const timeline = this.document.timeline;
    const index = timeline.indexOf(timeline.activeFrameId);
    const next = (index + delta + timeline.frameCount) % timeline.frameCount;
    this.document.setActiveFrame(timeline.frameAt(next).id);
    this.#emit();
  }

  /** Hold on the current frame for its duration, then advance (or stop). */
  #scheduleNextFrame(): void {
    const durationMs = Math.max(1, this.document.timeline.activeFrame.durationMs);
    this.#playTimer = window.setTimeout(() => {
      if (!this.#playing) {
        return;
      }
      if (this.#advancePlayback()) {
        this.#emit();
        this.#scheduleNextFrame();
      } else {
        this.pause();
      }
    }, durationMs);
  }

  #advancePlayback(): boolean {
    const timeline = this.document.timeline;
    const index = timeline.indexOf(timeline.activeFrameId);
    if (index + 1 >= timeline.frameCount) {
      if (this.#playMode === 'once') {
        return false;
      }
      this.document.setActiveFrame(timeline.frameAt(0).id);
      return true;
    }
    this.document.setActiveFrame(timeline.frameAt(index + 1).id);
    return true;
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

import type { PixelBuffer } from '@core/pixels/PixelBuffer';
import type { RGBA } from '@core/types/color';
import type { Dimensions } from '@core/types/geometry';
import type { DocumentId, FrameId, LayerId, PaletteId, Revision } from '@core/types/ids';

import { Layer } from './Layer';
import { LayerCollection } from './LayerCollection';
import { SelectionState } from './Selection';
import { Timeline } from './Timeline';
import type { IdFactory } from './IdFactory';

export interface DocumentMetadata {
  name: string;
}

export interface Palette {
  readonly id: PaletteId;
  name: string;
  colors: RGBA[];
}

interface DocumentParts {
  readonly id: DocumentId;
  readonly dimensions: Dimensions;
  readonly metadata: DocumentMetadata;
  readonly layers: LayerCollection;
  readonly timeline: Timeline;
  readonly selection: SelectionState;
  readonly palettes: Palette[];
  readonly ids: IdFactory;
  readonly revision?: number;
  readonly savedRevision?: number;
}

/**
 * The authoritative editable project state (PROJECT_CORE §4.4, §7.8).
 *
 * A `Document` is a pure in-memory model: no React, no browser APIs. All
 * persistent mutations are expected to flow through the Command/History
 * system (Phase 3); the mutation methods here are the primitives those
 * commands compose.
 */
export class Document {
  readonly id: DocumentId;
  readonly metadata: DocumentMetadata;
  readonly layers: LayerCollection;
  readonly timeline: Timeline;
  readonly selection: SelectionState;
  readonly palettes: Palette[];

  #dimensions: Dimensions;
  readonly #ids: IdFactory;
  #revision: number;
  #savedRevision: number;

  private constructor(parts: DocumentParts) {
    this.id = parts.id;
    this.#dimensions = { width: parts.dimensions.width, height: parts.dimensions.height };
    this.metadata = parts.metadata;
    this.layers = parts.layers;
    this.timeline = parts.timeline;
    this.selection = parts.selection;
    this.palettes = parts.palettes;
    this.#ids = parts.ids;
    this.#revision = parts.revision ?? 0;
    this.#savedRevision = parts.savedRevision ?? 0;
  }

  static create(parts: DocumentParts): Document {
    return new Document(parts);
  }

  get dimensions(): Dimensions {
    return this.#dimensions;
  }

  // --- Revision tracking (PROJECT_CORE §8.7) --------------------------------

  get revision(): Revision {
    return this.#revision as Revision;
  }

  get savedRevision(): Revision {
    return this.#savedRevision as Revision;
  }

  /** True when the current state differs from the last saved state. */
  get isDirty(): boolean {
    return this.#revision !== this.#savedRevision;
  }

  /** Advance the revision. Called by the History layer when a change commits. */
  advanceRevision(): void {
    this.#revision += 1;
  }

  /**
   * Record which revision is persisted. Defaults to the current revision;
   * the History layer passes an explicit value so that undoing past a save
   * point still reports the document as dirty (PROJECT_CORE §8.7).
   */
  markSaved(revision: Revision = this.revision): void {
    this.#savedRevision = revision;
  }

  // --- Layers -------------------------------------------------------------

  addLayer(name?: string): LayerId {
    const id = this.#ids.layer();
    const layerName = name ?? `Layer ${String(this.layers.count + 1)}`;
    this.layers.insertAt(new Layer(id, { name: layerName }));
    this.timeline.addLayerColumn(id, 'normal-transparent');
    this.layers.setActive(id);
    return id;
  }

  removeLayer(layerId: LayerId): void {
    this.layers.remove(layerId);
    this.timeline.removeLayerColumn(layerId);
  }

  duplicateLayer(layerId: LayerId): LayerId {
    const source = this.layers.require(layerId);
    const id = this.#ids.layer();
    const duplicate = new Layer(id, {
      name: `${source.name} copy`,
      visible: source.visible,
      locked: source.locked,
      opacity: source.opacity,
    });
    this.layers.insertAt(duplicate, this.layers.indexOf(layerId) + 1);
    this.timeline.duplicateLayerColumn(layerId, id);
    this.layers.setActive(id);
    return id;
  }

  moveLayer(layerId: LayerId, toIndex: number): void {
    this.layers.move(layerId, toIndex);
  }

  setActiveLayer(layerId: LayerId): void {
    this.layers.setActive(layerId);
  }

  // --- Frames -----------------------------------------------------------

  addEmptyFrame(): FrameId {
    const frame = this.timeline.appendEmptyFrame(this.layers.layerIds());
    return frame.id;
  }

  duplicateFrame(frameId: FrameId): FrameId {
    return this.timeline.duplicateFrame(frameId).id;
  }

  removeFrame(frameId: FrameId): void {
    this.timeline.removeFrame(frameId);
  }

  setActiveFrame(frameId: FrameId): void {
    this.timeline.setActiveFrame(frameId);
  }

  // --- Cels ------------------------------------------------------------

  linkCel(sourceFrameId: FrameId, targetFrameId: FrameId, layerId: LayerId): void {
    this.timeline.linkCel(sourceFrameId, targetFrameId, layerId);
  }

  holdCel(frameId: FrameId, layerId: LayerId): void {
    this.timeline.holdCel(frameId, layerId);
  }

  makeCelUnique(frameId: FrameId, layerId: LayerId): void {
    this.timeline.makeCelUnique(frameId, layerId);
  }

  /**
   * Effective pixel buffer for a layer at the given frame (default: the active
   * frame), resolving holds. `null` means nothing is displayed there.
   */
  resolveBuffer(
    layerId: LayerId,
    frameId: FrameId = this.timeline.activeFrameId,
  ): PixelBuffer | null {
    return this.timeline.resolveBuffer(this.timeline.indexOf(frameId), layerId);
  }

  /**
   * The buffer that drawing should write to for a layer at a frame (defaults:
   * the active layer at the active frame). Converts an empty or hold cel to a
   * normal cel so it can be painted on.
   */
  ensureDrawableBuffer(
    layerId: LayerId = this.layers.activeLayerId,
    frameId: FrameId = this.timeline.activeFrameId,
  ): PixelBuffer {
    return this.timeline.ensureNormalCel(this.timeline.indexOf(frameId), layerId);
  }

  // --- Resize (PROJECT_CORE §3.7) -----------------------------------------

  #applyResize(
    dimensions: Dimensions,
    transformBuffer: (buffer: PixelBuffer) => PixelBuffer,
  ): void {
    const map = new Map<PixelBuffer, PixelBuffer>();
    for (const buffer of this.timeline.uniqueBuffers()) {
      map.set(buffer, transformBuffer(buffer));
    }
    this.timeline.remapBuffers(map);
    this.timeline.setDimensions(dimensions);
    this.selection.resize(dimensions);
    this.#dimensions = { width: dimensions.width, height: dimensions.height };
  }

  /** Scale all artwork to a new size (nearest-neighbour). */
  resizeImage(dimensions: Dimensions, scale: (buffer: PixelBuffer) => PixelBuffer): void {
    this.#applyResize(dimensions, scale);
  }

  /** Change the canvas bounds without scaling artwork. `place` positions old content. */
  resizeCanvas(dimensions: Dimensions, place: (buffer: PixelBuffer) => PixelBuffer): void {
    this.#applyResize(dimensions, place);
  }

  // --- Snapshot -------------------------------------------------------

  /** A deep, independent copy — used by History for snapshots. Linked cels stay linked. */
  clone(): Document {
    const bufferMap = new Map<PixelBuffer, PixelBuffer>();
    return new Document({
      id: this.id,
      dimensions: { width: this.dimensions.width, height: this.dimensions.height },
      metadata: { ...this.metadata },
      layers: this.layers.clone(),
      timeline: this.timeline.clone(bufferMap),
      selection: this.selection.clone(),
      palettes: this.palettes.map((palette) => ({ ...palette, colors: [...palette.colors] })),
      ids: this.#ids,
      revision: this.#revision,
      savedRevision: this.#savedRevision,
    });
  }
}

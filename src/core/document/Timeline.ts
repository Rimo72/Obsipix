import { PixelBuffer } from '@core/pixels/PixelBuffer';
import type { Dimensions } from '@core/types/geometry';
import type { FrameId, LayerId } from '@core/types/ids';

import { Cel } from './Cel';
import { Frame } from './Frame';
import type { IdFactory } from './IdFactory';

/** How a fresh cel should be created when a layer column is added. */
export type NewCelKind = 'empty' | 'normal-transparent';

/**
 * The ordered list of frames and the active-frame pointer, plus the cel grid
 * that pairs every layer with every frame (PROJECT_CORE §9).
 *
 * Invariants owned here: at least one frame always exists, and every frame
 * holds exactly one cel per layer.
 */
export class Timeline {
  readonly #ids: IdFactory;
  readonly #dimensions: Dimensions;
  readonly #frames: Frame[];
  #activeFrameId: FrameId;

  constructor(ids: IdFactory, dimensions: Dimensions, firstFrame: Frame) {
    this.#ids = ids;
    this.#dimensions = dimensions;
    this.#frames = [firstFrame];
    this.#activeFrameId = firstFrame.id;
  }

  get frames(): readonly Frame[] {
    return this.#frames;
  }

  get frameCount(): number {
    return this.#frames.length;
  }

  get activeFrameId(): FrameId {
    return this.#activeFrameId;
  }

  get activeFrame(): Frame {
    return this.requireFrame(this.#activeFrameId);
  }

  frameAt(index: number): Frame {
    const frame = this.#frames[index];
    if (!frame) {
      throw new RangeError(`No frame at index ${index}`);
    }
    return frame;
  }

  indexOf(frameId: FrameId): number {
    const index = this.#frames.findIndex((frame) => frame.id === frameId);
    if (index < 0) {
      throw new RangeError(`No frame with id "${frameId}"`);
    }
    return index;
  }

  requireFrame(frameId: FrameId): Frame {
    return this.frameAt(this.indexOf(frameId));
  }

  setActiveFrame(frameId: FrameId): void {
    this.indexOf(frameId);
    this.#activeFrameId = frameId;
  }

  #newCel(kind: NewCelKind): Cel {
    if (kind === 'empty') {
      return Cel.empty(this.#ids.cel());
    }
    return Cel.normal(
      this.#ids.cel(),
      PixelBuffer.create(this.#dimensions.width, this.#dimensions.height),
    );
  }

  /** Append a blank frame with an empty cel for each layer. */
  appendEmptyFrame(layerIds: readonly LayerId[]): Frame {
    const frame = new Frame(this.#ids.frame());
    for (const layerId of layerIds) {
      frame.setCel(layerId, Cel.empty(this.#ids.cel()));
    }
    this.#frames.push(frame);
    return frame;
  }

  /**
   * Duplicate a frame, inserting the copy immediately after it. Normal and
   * linked cels become independent normal cels (PROJECT_CORE §9); empty and
   * hold cels keep their kind.
   */
  duplicateFrame(frameId: FrameId): Frame {
    const index = this.indexOf(frameId);
    const source = this.frameAt(index);
    const copy = new Frame(this.#ids.frame(), source.durationMs);
    for (const layerId of source.layerIds()) {
      const cel = source.requireCel(layerId);
      copy.setCel(layerId, this.#independentCopyOf(cel));
    }
    this.#frames.splice(index + 1, 0, copy);
    return copy;
  }

  #independentCopyOf(cel: Cel): Cel {
    if (cel.isEmpty) {
      return Cel.empty(this.#ids.cel());
    }
    if (cel.isHold) {
      return Cel.hold(this.#ids.cel());
    }
    return Cel.normal(this.#ids.cel(), cel.requireBuffer().clone());
  }

  removeFrame(frameId: FrameId): void {
    if (this.#frames.length === 1) {
      throw new Error('Cannot remove the last frame; a document needs at least one');
    }
    const index = this.indexOf(frameId);
    this.#frames.splice(index, 1);
    if (this.#activeFrameId === frameId) {
      this.#activeFrameId = this.frameAt(Math.max(0, index - 1)).id;
    }
  }

  moveFrame(frameId: FrameId, toIndex: number): void {
    const from = this.indexOf(frameId);
    const [frame] = this.#frames.splice(from, 1);
    if (!frame) {
      throw new Error(`No frame with id "${frameId}"`);
    }
    const clamped = Math.max(0, Math.min(toIndex, this.#frames.length));
    this.#frames.splice(clamped, 0, frame);
  }

  /** Add a cel for a newly created layer to every frame. */
  addLayerColumn(layerId: LayerId, kind: NewCelKind): void {
    for (const frame of this.#frames) {
      frame.setCel(layerId, this.#newCel(kind));
    }
  }

  /** Copy an existing layer's column into a new layer's column. */
  duplicateLayerColumn(sourceLayerId: LayerId, newLayerId: LayerId): void {
    for (const frame of this.#frames) {
      frame.setCel(newLayerId, this.#independentCopyOf(frame.requireCel(sourceLayerId)));
    }
  }

  removeLayerColumn(layerId: LayerId): void {
    for (const frame of this.#frames) {
      frame.removeCel(layerId);
    }
  }

  /**
   * Replace the target frame's cel for `layerId` with a linked cel that shares
   * pixel data with the source frame's cel. Editing the shared buffer then
   * affects both (PROJECT_CORE §8.4).
   */
  linkCel(sourceFrameId: FrameId, targetFrameId: FrameId, layerId: LayerId): void {
    const sourceCel = this.requireFrame(sourceFrameId).requireCel(layerId);
    const sharedBuffer = sourceCel.requireBuffer();
    this.requireFrame(targetFrameId).setCel(layerId, Cel.linked(this.#ids.cel(), sharedBuffer));
  }

  /** Turn a frame's cel for `layerId` into a hold. */
  holdCel(frameId: FrameId, layerId: LayerId): void {
    const frame = this.requireFrame(frameId);
    frame.requireCel(layerId);
    frame.setCel(layerId, Cel.hold(this.#ids.cel()));
  }

  makeCelUnique(frameId: FrameId, layerId: LayerId): void {
    this.requireFrame(frameId).requireCel(layerId).makeUnique();
  }

  /**
   * The effective pixel buffer for `layerId` at `frameIndex`, resolving holds
   * back through earlier frames. Returns `null` when nothing is displayed
   * (empty cel, or a hold with no earlier artwork).
   */
  resolveBuffer(frameIndex: number, layerId: LayerId): PixelBuffer | null {
    const frame = this.frameAt(frameIndex);
    const cel = frame.getCel(layerId);
    if (!cel || cel.isEmpty) {
      return null;
    }
    if (cel.isHold) {
      return frameIndex === 0 ? null : this.resolveBuffer(frameIndex - 1, layerId);
    }
    return cel.requireBuffer();
  }

  clone(bufferMap: Map<PixelBuffer, PixelBuffer>): Timeline {
    const first = this.#frames[0];
    if (!first) {
      throw new Error('Timeline unexpectedly empty');
    }
    const copy = new Timeline(this.#ids, this.#dimensions, first.clone(bufferMap));
    for (const frame of this.#frames.slice(1)) {
      copy.#frames.push(frame.clone(bufferMap));
    }
    copy.#activeFrameId = this.#activeFrameId;
    return copy;
  }
}

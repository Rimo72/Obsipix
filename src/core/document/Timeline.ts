import { PixelBuffer } from '@core/pixels/PixelBuffer';
import type { Dimensions } from '@core/types/geometry';
import type { FrameId, LayerId } from '@core/types/ids';

import type { AnimationTag } from './AnimationTag';
import { Cel } from './Cel';
import { DEFAULT_FRAME_DURATION_MS, Frame } from './Frame';
import { DEFAULT_ONION_SKIN, type OnionSkinSettings } from './OnionSkin';
import type { IdFactory } from './IdFactory';

export const DEFAULT_PLAYBACK_FPS = 12;

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
  #dimensions: Dimensions;
  readonly #frames: Frame[];
  readonly #tags: AnimationTag[] = [];
  #activeFrameId: FrameId;
  #playbackFps = DEFAULT_PLAYBACK_FPS;
  #onionSkin: OnionSkinSettings = { ...DEFAULT_ONION_SKIN };

  constructor(ids: IdFactory, dimensions: Dimensions, firstFrame: Frame) {
    this.#ids = ids;
    this.#dimensions = { width: dimensions.width, height: dimensions.height };
    this.#frames = [firstFrame];
    this.#activeFrameId = firstFrame.id;
  }

  // --- Playback / onion-skin settings (persisted, PROJECT_CORE §13.6) -----

  get playbackFps(): number {
    return this.#playbackFps;
  }

  setPlaybackFps(fps: number): void {
    if (Number.isFinite(fps) && fps > 0) {
      this.#playbackFps = fps;
    }
  }

  get onionSkin(): Readonly<OnionSkinSettings> {
    return this.#onionSkin;
  }

  setOnionSkin(patch: Partial<OnionSkinSettings>): void {
    const next = { ...this.#onionSkin, ...patch };
    next.previous = Math.max(0, Math.min(8, Math.round(next.previous)));
    next.next = Math.max(0, Math.min(8, Math.round(next.next)));
    next.opacity = Math.max(0.05, Math.min(1, next.opacity));
    this.#onionSkin = next;
  }

  /** Total run time of the animation in milliseconds. */
  get durationMs(): number {
    return this.#frames.reduce((total, frame) => total + frame.durationMs, 0);
  }

  /** Set every frame's duration from a frames-per-second value. */
  applyUniformFps(fps: number): void {
    this.setPlaybackFps(fps);
    const durationMs = Math.max(1, Math.round(1000 / fps));
    for (const frame of this.#frames) {
      frame.setDurationMs(durationMs);
    }
  }

  /** Update the size new cels are created at (document resize). */
  setDimensions(dimensions: Dimensions): void {
    this.#dimensions = { width: dimensions.width, height: dimensions.height };
  }

  /** Every distinct pixel buffer referenced by any cel, once each. */
  uniqueBuffers(): PixelBuffer[] {
    const seen = new Set<PixelBuffer>();
    for (const frame of this.#frames) {
      for (const cel of frame.cels()) {
        const buffer = cel.buffer;
        if (buffer) {
          seen.add(buffer);
        }
      }
    }
    return [...seen];
  }

  /** Swap every cel's buffer through `map` (document resize keeps linked cels linked). */
  remapBuffers(map: Map<PixelBuffer, PixelBuffer>): void {
    for (const frame of this.#frames) {
      for (const cel of frame.cels()) {
        const buffer = cel.buffer;
        const replacement = buffer ? map.get(buffer) : undefined;
        if (replacement) {
          cel.replaceBuffer(replacement);
        }
      }
    }
  }

  /** Rebuild a timeline from pre-constructed frames (used by the deserializer). */
  static restore(
    ids: IdFactory,
    dimensions: Dimensions,
    frames: readonly Frame[],
    activeFrameId: FrameId,
    tags: readonly AnimationTag[],
    settings?: { readonly playbackFps?: number; readonly onionSkin?: OnionSkinSettings },
  ): Timeline {
    const [first, ...rest] = frames;
    if (!first) {
      throw new RangeError('A timeline needs at least one frame');
    }
    const timeline = new Timeline(ids, dimensions, first);
    for (const frame of rest) {
      timeline.#frames.push(frame);
    }
    timeline.#activeFrameId = timeline.has(activeFrameId) ? activeFrameId : first.id;
    timeline.restoreTags(tags);
    if (settings?.playbackFps !== undefined) {
      timeline.setPlaybackFps(settings.playbackFps);
    }
    if (settings?.onionSkin) {
      timeline.setOnionSkin(settings.onionSkin);
    }
    return timeline;
  }

  has(frameId: FrameId): boolean {
    return this.#frames.some((frame) => frame.id === frameId);
  }

  get tags(): readonly AnimationTag[] {
    return this.#tags;
  }

  addTag(tag: Omit<AnimationTag, 'id'>): AnimationTag {
    const created: AnimationTag = { ...tag, id: this.#ids.animationTag() };
    this.#tags.push(created);
    return created;
  }

  updateTag(id: AnimationTag['id'], patch: Partial<Omit<AnimationTag, 'id'>>): void {
    const tag = this.#tags.find((entry) => entry.id === id);
    if (!tag) {
      return;
    }
    Object.assign(tag, patch);
    tag.startFrame = Math.max(0, Math.min(tag.startFrame, this.#frames.length - 1));
    tag.endFrame = Math.max(tag.startFrame, Math.min(tag.endFrame, this.#frames.length - 1));
  }

  removeTag(id: AnimationTag['id']): void {
    const index = this.#tags.findIndex((tag) => tag.id === id);
    if (index >= 0) {
      this.#tags.splice(index, 1);
    }
  }

  /** Replace all tags (used by the deserializer). */
  restoreTags(tags: readonly AnimationTag[]): void {
    this.#tags.splice(0, this.#tags.length, ...tags.map((tag) => ({ ...tag })));
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

  /** Append a frame with a fresh cel of `kind` for each layer. */
  appendFrame(layerIds: readonly LayerId[], kind: NewCelKind = 'empty'): Frame {
    const frame = new Frame(this.#ids.frame(), DEFAULT_FRAME_DURATION_MS);
    for (const layerId of layerIds) {
      frame.setCel(layerId, this.#newCel(kind));
    }
    this.#frames.push(frame);
    return frame;
  }

  /** Append a blank frame with an empty cel for each layer. */
  appendEmptyFrame(layerIds: readonly LayerId[]): Frame {
    return this.appendFrame(layerIds, 'empty');
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
   * The drawable buffer for `layerId` at `frameIndex`. A normal or linked cel
   * yields its buffer directly — cloning it first if it is still frozen (a
   * copy-on-write, see the private `#ownedBuffer` below) — an empty, hold or
   * missing cel becomes a new normal cel first, seeded from the artwork the
   * frame was already showing.
   *
   * This is the single choke point every drawing/edit operation goes through
   * to mutate pixels (PROJECT_CORE §16); it is what makes `Document.clone`
   * cheap.
   */
  ensureNormalCel(frameIndex: number, layerId: LayerId): PixelBuffer {
    const frame = this.frameAt(frameIndex);
    const existing = frame.getCel(layerId);
    if (existing && (existing.type === 'normal' || existing.type === 'linked')) {
      return this.#ownedBuffer(existing.requireBuffer(), layerId);
    }
    const shown = this.resolveBuffer(frameIndex, layerId);
    const buffer =
      shown?.clone() ?? PixelBuffer.create(this.#dimensions.width, this.#dimensions.height);
    frame.setCel(layerId, Cel.normal(this.#ids.cel(), buffer));
    return buffer;
  }

  /**
   * Copy-on-write: `Document.clone` (a History snapshot) shares buffer
   * objects with the live document instead of copying them, and freezes
   * them (PROJECT_CORE §16). The first time this timeline is asked for a
   * writable buffer that is still frozen, clone it exactly once and
   * re-point every live cel in this timeline that shared it — this is what
   * keeps a linked cel's siblings linked after the clone diverges. Returns
   * `buffer` unchanged when it is already safe to mutate.
   */
  #ownedBuffer(buffer: PixelBuffer, layerId: LayerId): PixelBuffer {
    if (!buffer.frozen) {
      return buffer;
    }
    const owned = buffer.clone();
    for (const frame of this.#frames) {
      const cel = frame.getCel(layerId);
      if (cel?.buffer === buffer) {
        cel.replaceBuffer(owned);
      }
    }
    return owned;
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

  clone(): Timeline {
    const first = this.#frames[0];
    if (!first) {
      throw new Error('Timeline unexpectedly empty');
    }
    const copy = new Timeline(this.#ids, this.#dimensions, first.clone());
    for (const frame of this.#frames.slice(1)) {
      copy.#frames.push(frame.clone());
    }
    copy.#activeFrameId = this.#activeFrameId;
    copy.restoreTags(this.#tags);
    copy.#playbackFps = this.#playbackFps;
    copy.#onionSkin = { ...this.#onionSkin };
    return copy;
  }
}

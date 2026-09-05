import type { PixelBuffer } from '@core/pixels/PixelBuffer';
import type { CelId } from '@core/types/ids';

/**
 * Cel kinds (PROJECT_CORE §8.4, §9):
 * - `normal` — owns an independent {@link PixelBuffer}
 * - `empty`  — no pixel data at all (distinct from a transparent normal cel)
 * - `hold`   — displays the previous effective artwork for its layer
 * - `linked` — shares a {@link PixelBuffer} with another cel; editing the
 *              shared buffer affects every linked cel
 */
export type CelType = 'normal' | 'empty' | 'hold' | 'linked';

export class Cel {
  readonly id: CelId;
  #type: CelType;
  #buffer: PixelBuffer | null;

  private constructor(id: CelId, type: CelType, buffer: PixelBuffer | null) {
    this.id = id;
    this.#type = type;
    this.#buffer = buffer;
  }

  static normal(id: CelId, buffer: PixelBuffer): Cel {
    return new Cel(id, 'normal', buffer);
  }

  static empty(id: CelId): Cel {
    return new Cel(id, 'empty', null);
  }

  static hold(id: CelId): Cel {
    return new Cel(id, 'hold', null);
  }

  /** Create a cel that shares `sharedBuffer` with the cel it links to. */
  static linked(id: CelId, sharedBuffer: PixelBuffer): Cel {
    return new Cel(id, 'linked', sharedBuffer);
  }

  get type(): CelType {
    return this.#type;
  }

  get isEmpty(): boolean {
    return this.#type === 'empty';
  }

  get isHold(): boolean {
    return this.#type === 'hold';
  }

  get isLinked(): boolean {
    return this.#type === 'linked';
  }

  /** The cel's own pixel buffer, or `null` for empty and hold cels. */
  get buffer(): PixelBuffer | null {
    return this.#buffer;
  }

  /** The pixel buffer, asserting the cel actually has one. */
  requireBuffer(): PixelBuffer {
    if (!this.#buffer) {
      throw new Error(`Cel "${this.id}" (${this.#type}) has no pixel buffer`);
    }
    return this.#buffer;
  }

  /** True when both cels are backed by the very same buffer instance. */
  sharesBufferWith(other: Cel): boolean {
    return this.#buffer !== null && this.#buffer === other.#buffer;
  }

  /**
   * Break a linked cel's sharing relationship: copy the shared buffer so this
   * cel owns independent pixel data, and become a normal cel
   * (PROJECT_CORE §8.4 "Make Unique").
   */
  makeUnique(): void {
    if (this.#type !== 'linked') {
      throw new Error(`Only linked cels can be made unique; cel "${this.id}" is ${this.#type}`);
    }
    this.#buffer = this.requireBuffer().clone();
    this.#type = 'normal';
  }

  /**
   * Deep copy. `bufferMap` preserves buffer sharing across a whole-document
   * clone: cels that shared a buffer before cloning still share one after.
   */
  clone(bufferMap: Map<PixelBuffer, PixelBuffer>): Cel {
    if (this.#buffer === null) {
      return new Cel(this.id, this.#type, null);
    }
    let copy = bufferMap.get(this.#buffer);
    if (!copy) {
      copy = this.#buffer.clone();
      bufferMap.set(this.#buffer, copy);
    }
    return new Cel(this.id, this.#type, copy);
  }
}

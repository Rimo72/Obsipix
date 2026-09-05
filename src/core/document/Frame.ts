import type { PixelBuffer } from '@core/pixels/PixelBuffer';
import type { FrameId, LayerId } from '@core/types/ids';

import { Cel } from './Cel';

export const DEFAULT_FRAME_DURATION_MS = 100;

function assertDuration(ms: number): void {
  if (!Number.isFinite(ms) || ms <= 0) {
    throw new RangeError(
      `Frame duration must be a positive number of milliseconds, received ${ms}`,
    );
  }
}

/**
 * A point in time in the timeline. It owns one {@link Cel} per layer
 * (PROJECT_CORE §9). Reordering a frame moves all of its cels together.
 */
export class Frame {
  readonly id: FrameId;
  #durationMs: number;
  readonly #cels: Map<LayerId, Cel>;

  constructor(id: FrameId, durationMs: number = DEFAULT_FRAME_DURATION_MS) {
    assertDuration(durationMs);
    this.id = id;
    this.#durationMs = durationMs;
    this.#cels = new Map();
  }

  get durationMs(): number {
    return this.#durationMs;
  }

  setDurationMs(durationMs: number): void {
    assertDuration(durationMs);
    this.#durationMs = durationMs;
  }

  get layerCount(): number {
    return this.#cels.size;
  }

  hasCel(layerId: LayerId): boolean {
    return this.#cels.has(layerId);
  }

  getCel(layerId: LayerId): Cel | undefined {
    return this.#cels.get(layerId);
  }

  requireCel(layerId: LayerId): Cel {
    const cel = this.#cels.get(layerId);
    if (!cel) {
      throw new RangeError(`Frame "${this.id}" has no cel for layer "${layerId}"`);
    }
    return cel;
  }

  setCel(layerId: LayerId, cel: Cel): void {
    this.#cels.set(layerId, cel);
  }

  removeCel(layerId: LayerId): void {
    this.#cels.delete(layerId);
  }

  layerIds(): LayerId[] {
    return [...this.#cels.keys()];
  }

  cels(): Cel[] {
    return [...this.#cels.values()];
  }

  clone(bufferMap: Map<PixelBuffer, PixelBuffer>): Frame {
    const copy = new Frame(this.id, this.#durationMs);
    for (const [layerId, cel] of this.#cels) {
      copy.#cels.set(layerId, cel.clone(bufferMap));
    }
    return copy;
  }
}

import type { LayerId } from '@core/types/ids';

import { Layer } from './Layer';

/**
 * The ordered stack of layers plus the active-layer pointer
 * (PROJECT_CORE §7.4). Array position is z-order; it is never identity.
 *
 * A document must always have at least one layer (PROJECT_CORE §8.9), so
 * {@link LayerCollection.remove} refuses to delete the last one.
 */
export class LayerCollection {
  readonly #layers: Layer[];
  #activeLayerId: LayerId;

  constructor(initial: Layer) {
    this.#layers = [initial];
    this.#activeLayerId = initial.id;
  }

  get layers(): readonly Layer[] {
    return this.#layers;
  }

  get count(): number {
    return this.#layers.length;
  }

  get activeLayerId(): LayerId {
    return this.#activeLayerId;
  }

  get activeLayer(): Layer {
    return this.require(this.#activeLayerId);
  }

  layerIds(): LayerId[] {
    return this.#layers.map((layer) => layer.id);
  }

  has(id: LayerId): boolean {
    return this.#layers.some((layer) => layer.id === id);
  }

  get(id: LayerId): Layer | undefined {
    return this.#layers.find((layer) => layer.id === id);
  }

  require(id: LayerId): Layer {
    const layer = this.get(id);
    if (!layer) {
      throw new RangeError(`No layer with id "${id}"`);
    }
    return layer;
  }

  indexOf(id: LayerId): number {
    const index = this.#layers.findIndex((layer) => layer.id === id);
    if (index < 0) {
      throw new RangeError(`No layer with id "${id}"`);
    }
    return index;
  }

  /** Insert a layer at `index` (default: on top of the stack). */
  insertAt(layer: Layer, index: number = this.#layers.length): void {
    if (this.has(layer.id)) {
      throw new Error(`Layer "${layer.id}" is already in the collection`);
    }
    const clamped = Math.max(0, Math.min(index, this.#layers.length));
    this.#layers.splice(clamped, 0, layer);
  }

  remove(id: LayerId): void {
    if (this.#layers.length === 1) {
      throw new Error('Cannot remove the last layer; a document needs at least one');
    }
    const index = this.indexOf(id);
    this.#layers.splice(index, 1);
    if (this.#activeLayerId === id) {
      const fallback = this.#layers[Math.max(0, index - 1)];
      if (!fallback) {
        throw new Error('Layer collection unexpectedly empty after removal');
      }
      this.#activeLayerId = fallback.id;
    }
  }

  /** Move a layer to a new stack index. Other layers shift to accommodate. */
  move(id: LayerId, toIndex: number): void {
    const from = this.indexOf(id);
    const [layer] = this.#layers.splice(from, 1);
    if (!layer) {
      throw new Error(`No layer with id "${id}"`);
    }
    const clamped = Math.max(0, Math.min(toIndex, this.#layers.length));
    this.#layers.splice(clamped, 0, layer);
  }

  setActive(id: LayerId): void {
    this.require(id);
    this.#activeLayerId = id;
  }

  clone(): LayerCollection {
    const first = this.#layers[0];
    if (!first) {
      throw new Error('Layer collection unexpectedly empty');
    }
    const copy = new LayerCollection(first.clone());
    for (const layer of this.#layers.slice(1)) {
      copy.insertAt(layer.clone());
    }
    copy.#activeLayerId = this.#activeLayerId;
    return copy;
  }
}

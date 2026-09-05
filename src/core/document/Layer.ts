import type { LayerId } from '@core/types/ids';

export interface LayerOptions {
  readonly name: string;
  readonly visible?: boolean;
  readonly locked?: boolean;
  /** 0 (transparent) … 1 (opaque). Defaults to 1. */
  readonly opacity?: number;
}

function assertOpacity(value: number): void {
  if (!Number.isFinite(value) || value < 0 || value > 1) {
    throw new RangeError(`Layer opacity must be within [0, 1], received ${value}`);
  }
}

/**
 * A layer's structure and presentation properties. Pixel content lives in the
 * cels that pair this layer with each frame, never on the layer itself
 * (PROJECT_CORE §7.4, §9). Stack order is the layer's position in its
 * {@link LayerCollection}; the id is the identity (PROJECT_CORE §8.5).
 */
export class Layer {
  readonly id: LayerId;
  #name: string;
  #visible: boolean;
  #locked: boolean;
  #opacity: number;

  constructor(id: LayerId, options: LayerOptions) {
    if (options.opacity !== undefined) {
      assertOpacity(options.opacity);
    }
    this.id = id;
    this.#name = options.name;
    this.#visible = options.visible ?? true;
    this.#locked = options.locked ?? false;
    this.#opacity = options.opacity ?? 1;
  }

  get name(): string {
    return this.#name;
  }

  get visible(): boolean {
    return this.#visible;
  }

  get locked(): boolean {
    return this.#locked;
  }

  get opacity(): number {
    return this.#opacity;
  }

  rename(name: string): void {
    this.#name = name;
  }

  setVisible(visible: boolean): void {
    this.#visible = visible;
  }

  setLocked(locked: boolean): void {
    this.#locked = locked;
  }

  setOpacity(opacity: number): void {
    assertOpacity(opacity);
    this.#opacity = opacity;
  }

  clone(): Layer {
    return new Layer(this.id, {
      name: this.#name,
      visible: this.#visible,
      locked: this.#locked,
      opacity: this.#opacity,
    });
  }
}

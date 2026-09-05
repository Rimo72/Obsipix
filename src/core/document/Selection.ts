import { areDimensionsEqual, type Dimensions } from '@core/types/geometry';

const SELECTED = 255;
const UNSELECTED = 0;

/**
 * A pixel-level selection mask plus its active flag (PROJECT_CORE §7.6, §8.6).
 *
 * The mask dimensions always match the document. While the selection is
 * inactive every pixel is editable; while active, only masked pixels are.
 * Selection is independent of the active layer.
 */
export class SelectionState {
  readonly #dimensions: Dimensions;
  #active: boolean;
  #mask: Uint8Array;

  constructor(dimensions: Dimensions) {
    this.#dimensions = { width: dimensions.width, height: dimensions.height };
    this.#active = false;
    this.#mask = new Uint8Array(dimensions.width * dimensions.height);
  }

  get dimensions(): Dimensions {
    return this.#dimensions;
  }

  get active(): boolean {
    return this.#active;
  }

  matchesDimensions(dimensions: Dimensions): boolean {
    return areDimensionsEqual(this.#dimensions, dimensions);
  }

  #indexOf(x: number, y: number): number {
    const { width, height } = this.#dimensions;
    if (
      !Number.isInteger(x) ||
      !Number.isInteger(y) ||
      x < 0 ||
      y < 0 ||
      x >= width ||
      y >= height
    ) {
      throw new RangeError(`Selection coordinate (${x}, ${y}) is outside ${width}x${height}`);
    }
    return y * width + x;
  }

  /** True when the pixel may be edited: always so unless the selection is active and excludes it. */
  isSelected(x: number, y: number): boolean {
    if (!this.#active) {
      return true;
    }
    return this.#mask[this.#indexOf(x, y)] !== UNSELECTED;
  }

  setPixel(x: number, y: number, selected: boolean): void {
    this.#mask[this.#indexOf(x, y)] = selected ? SELECTED : UNSELECTED;
  }

  selectAll(): void {
    this.#active = true;
    this.#mask.fill(SELECTED);
  }

  deselect(): void {
    this.#active = false;
    this.#mask.fill(UNSELECTED);
  }

  clone(): SelectionState {
    const copy = new SelectionState(this.#dimensions);
    copy.#active = this.#active;
    copy.#mask = new Uint8Array(this.#mask);
    return copy;
  }
}

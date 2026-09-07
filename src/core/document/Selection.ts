import { areDimensionsEqual, type Dimensions, type PixelRegion } from '@core/types/geometry';

const SELECTED = 255;
const UNSELECTED = 0;

/** How a new region combines with the current selection (PROJECT_CORE §3.6). */
export type SelectionMode = 'replace' | 'add' | 'subtract' | 'intersect';

/**
 * A pixel-level selection mask plus its active flag (PROJECT_CORE §7.6, §8.6).
 *
 * The mask dimensions always match the document. While the selection is
 * inactive every pixel is editable; while active, only masked pixels are.
 * Selection is independent of the active layer.
 */
export class SelectionState {
  #dimensions: Dimensions;
  #active = false;
  #mask: Uint8Array;

  constructor(dimensions: Dimensions) {
    this.#dimensions = { width: dimensions.width, height: dimensions.height };
    this.#mask = new Uint8Array(dimensions.width * dimensions.height);
  }

  get dimensions(): Dimensions {
    return this.#dimensions;
  }

  get active(): boolean {
    return this.#active;
  }

  /** True when active but no pixels are selected. */
  get isEmpty(): boolean {
    return this.#active && !this.#mask.some((value) => value !== UNSELECTED);
  }

  matchesDimensions(dimensions: Dimensions): boolean {
    return areDimensionsEqual(this.#dimensions, dimensions);
  }

  #inBounds(x: number, y: number): boolean {
    return (
      Number.isInteger(x) &&
      Number.isInteger(y) &&
      x >= 0 &&
      y >= 0 &&
      x < this.#dimensions.width &&
      y < this.#dimensions.height
    );
  }

  #requireIndex(x: number, y: number): number {
    if (!this.#inBounds(x, y)) {
      throw new RangeError(`Selection coordinate (${x}, ${y}) is outside the document`);
    }
    return y * this.#dimensions.width + x;
  }

  /** True when the pixel may be edited: always so unless the selection is active and excludes it. */
  isSelected(x: number, y: number): boolean {
    if (!this.#active) {
      return true;
    }
    if (!this.#inBounds(x, y)) {
      return false;
    }
    return this.#mask[y * this.#dimensions.width + x] !== UNSELECTED;
  }

  setPixel(x: number, y: number, selected: boolean): void {
    this.#mask[this.#requireIndex(x, y)] = selected ? SELECTED : UNSELECTED;
  }

  selectAll(): void {
    this.#active = true;
    this.#mask.fill(SELECTED);
  }

  deselect(): void {
    this.#active = false;
    this.#mask.fill(UNSELECTED);
  }

  /**
   * Invert the mask (PROJECT_CORE §21, §96.4). When nothing is selected this
   * selects everything; otherwise the selected and unselected pixels swap.
   */
  invert(): void {
    for (let i = 0; i < this.#mask.length; i += 1) {
      this.#mask[i] = this.#mask[i] === UNSELECTED ? SELECTED : UNSELECTED;
    }
    this.#active = true;
    if (this.isEmpty) {
      this.#active = false;
    }
  }

  /** Combine a rectangle into the selection. */
  applyRect(region: PixelRegion, mode: SelectionMode = 'replace'): void {
    this.applyShape((x, y) => {
      return (
        x >= region.x &&
        y >= region.y &&
        x < region.x + region.width &&
        y < region.y + region.height
      );
    }, mode);
  }

  /** Combine an arbitrary shape (given as a membership test) into the selection. */
  applyShape(inShape: (x: number, y: number) => boolean, mode: SelectionMode = 'replace'): void {
    const { width, height } = this.#dimensions;
    const next = mode === 'replace' ? new Uint8Array(width * height) : this.#mask;
    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const index = y * width + x;
        const hit = inShape(x, y);
        const current = (mode === 'replace' ? 0 : (this.#mask[index] ?? 0)) !== UNSELECTED;
        let value = current;
        switch (mode) {
          case 'replace':
          case 'add':
            value = current || hit;
            break;
          case 'subtract':
            value = current && !hit;
            break;
          case 'intersect':
            value = current && hit;
            break;
        }
        next[index] = value ? SELECTED : UNSELECTED;
      }
    }
    this.#mask = next;
    this.#active = true;
    if (this.isEmpty) {
      this.#active = false;
    }
  }

  /** Bounding box of the selected pixels, or `null` if nothing is selected. */
  bounds(): PixelRegion | null {
    if (!this.#active) {
      return null;
    }
    const { width, height } = this.#dimensions;
    let minX = width;
    let minY = height;
    let maxX = -1;
    let maxY = -1;
    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        if (this.#mask[y * width + x] !== UNSELECTED) {
          minX = Math.min(minX, x);
          minY = Math.min(minY, y);
          maxX = Math.max(maxX, x);
          maxY = Math.max(maxY, y);
        }
      }
    }
    if (maxX < 0) {
      return null;
    }
    return { x: minX, y: minY, width: maxX - minX + 1, height: maxY - minY + 1 };
  }

  /** A copy of the raw mask (row-major, 0 / 255). */
  snapshotMask(): Uint8Array {
    return new Uint8Array(this.#mask);
  }

  /** Replace the mask wholesale (used when moving/transforming a selection). */
  restoreMask(mask: Uint8Array, active: boolean): void {
    if (mask.length !== this.#dimensions.width * this.#dimensions.height) {
      throw new RangeError('Selection mask size does not match the document');
    }
    this.#mask = new Uint8Array(mask);
    this.#active = active && this.#mask.some((value) => value !== UNSELECTED);
  }

  /** Resize the mask to new dimensions, keeping the top-left-anchored overlap. */
  resize(dimensions: Dimensions): void {
    const next = new Uint8Array(dimensions.width * dimensions.height);
    const copyWidth = Math.min(this.#dimensions.width, dimensions.width);
    const copyHeight = Math.min(this.#dimensions.height, dimensions.height);
    for (let y = 0; y < copyHeight; y += 1) {
      for (let x = 0; x < copyWidth; x += 1) {
        next[y * dimensions.width + x] = this.#mask[y * this.#dimensions.width + x] ?? 0;
      }
    }
    this.#dimensions = { width: dimensions.width, height: dimensions.height };
    this.#mask = next;
    if (this.isEmpty) {
      this.#active = false;
    }
  }

  clone(): SelectionState {
    const copy = new SelectionState(this.#dimensions);
    copy.#active = this.#active;
    copy.#mask = new Uint8Array(this.#mask);
    return copy;
  }
}

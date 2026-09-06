import type { CanvasPoint, Dimensions, PixelPoint } from '@core/types/geometry';

export const MIN_ZOOM = 0.1;
export const MAX_ZOOM = 64;

/** Integer zoom stops for the zoom-in/zoom-out UI. */
export const ZOOM_STEPS: readonly number[] = [0.25, 0.5, 1, 2, 3, 4, 6, 8, 12, 16, 24, 32, 48, 64];

export interface ViewportState {
  /** Canvas CSS-pixels per document pixel. */
  readonly zoom: number;
  /** Canvas-space x of document pixel (0, 0). */
  readonly panX: number;
  /** Canvas-space y of document pixel (0, 0). */
  readonly panY: number;
}

function clampZoom(zoom: number): number {
  if (!Number.isFinite(zoom)) {
    throw new RangeError(`Zoom must be a finite number, received ${zoom}`);
  }
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom));
}

interface Point {
  readonly x: number;
  readonly y: number;
}

/**
 * The pan/zoom state of the canvas and the conversions between the three
 * coordinate spaces (PROJECT_CORE §7.7, §11):
 *
 * - **document** — integer logical-pixel coordinates in the artwork
 * - **canvas**   — CSS pixels relative to the canvas element's top-left
 * - **screen**   — browser client coordinates (canvas + the element's rect;
 *                  that final offset is applied by the DOM layer)
 *
 * This class is pure: it never touches the DOM and never mutates a document.
 */
export class Viewport {
  #zoom: number;
  #panX: number;
  #panY: number;

  constructor(state: Partial<ViewportState> = {}) {
    this.#zoom = clampZoom(state.zoom ?? 1);
    this.#panX = state.panX ?? 0;
    this.#panY = state.panY ?? 0;
  }

  get zoom(): number {
    return this.#zoom;
  }

  get panX(): number {
    return this.#panX;
  }

  get panY(): number {
    return this.#panY;
  }

  get state(): ViewportState {
    return { zoom: this.#zoom, panX: this.#panX, panY: this.#panY };
  }

  setZoom(zoom: number): void {
    this.#zoom = clampZoom(zoom);
  }

  setPan(x: number, y: number): void {
    this.#panX = x;
    this.#panY = y;
  }

  panBy(dx: number, dy: number): void {
    this.#panX += dx;
    this.#panY += dy;
  }

  /** Zoom by `factor`, keeping the document point currently under `anchor` fixed on screen. */
  zoomAround(anchor: CanvasPoint, factor: number): void {
    const documentPoint = this.canvasToDocument(anchor);
    this.setZoom(this.#zoom * factor);
    this.#panX = anchor.x - documentPoint.x * this.#zoom;
    this.#panY = anchor.y - documentPoint.y * this.#zoom;
  }

  /** Center `dimensions` within a `canvasWidth`×`canvasHeight` area, scaled to fit with `padding`. */
  fit(canvasWidth: number, canvasHeight: number, dimensions: Dimensions, padding = 0): void {
    const availableWidth = Math.max(1, canvasWidth - padding * 2);
    const availableHeight = Math.max(1, canvasHeight - padding * 2);
    const scale = Math.min(availableWidth / dimensions.width, availableHeight / dimensions.height);
    this.setZoom(scale);
    this.#panX = (canvasWidth - dimensions.width * this.#zoom) / 2;
    this.#panY = (canvasHeight - dimensions.height * this.#zoom) / 2;
  }

  documentToCanvas(point: Point): CanvasPoint {
    return { x: point.x * this.#zoom + this.#panX, y: point.y * this.#zoom + this.#panY };
  }

  canvasToDocument(point: Point): { x: number; y: number } {
    return { x: (point.x - this.#panX) / this.#zoom, y: (point.y - this.#panY) / this.#zoom };
  }

  /** Which document pixel a canvas point falls on (nearest-neighbour: floor). May be out of bounds. */
  canvasToPixel(point: Point): PixelPoint {
    const document = this.canvasToDocument(point);
    return { x: Math.floor(document.x), y: Math.floor(document.y) };
  }

  /** The canvas-space rectangle covering one document pixel. */
  pixelToCanvasRect(pixel: Point): { x: number; y: number; width: number; height: number } {
    return {
      x: pixel.x * this.#zoom + this.#panX,
      y: pixel.y * this.#zoom + this.#panY,
      width: this.#zoom,
      height: this.#zoom,
    };
  }

  clone(): Viewport {
    return new Viewport(this.state);
  }
}

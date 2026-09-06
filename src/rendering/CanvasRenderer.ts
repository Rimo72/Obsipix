import { compositeDocument } from '@core/document/compositeDocument';
import type { Document } from '@core/document/Document';
import type { RGBA } from '@core/types/color';
import type { FrameId } from '@core/types/ids';

import type { Viewport } from './Viewport';

/** A previewed pixel drawn over the artwork while a shape tool drags. */
export interface PreviewStamp {
  readonly x: number;
  readonly y: number;
  readonly color: RGBA;
}

export interface CheckerboardStyle {
  readonly light: string;
  readonly dark: string;
  /** Square size in canvas CSS pixels. */
  readonly size: number;
}

export interface GridStyle {
  readonly color: string;
  /** The grid only shows at or above this zoom. */
  readonly minZoom: number;
}

export interface FloatOverlay {
  readonly bytes: Uint8ClampedArray;
  readonly width: number;
  readonly height: number;
  readonly x: number;
  readonly y: number;
}

export interface SelectionOverlay {
  readonly data: Uint8Array;
  readonly width: number;
  readonly height: number;
}

export interface RenderOptions {
  readonly frameId?: FrameId;
  readonly devicePixelRatio?: number;
  readonly showCheckerboard?: boolean;
  readonly showGrid?: boolean;
  readonly checkerboard?: CheckerboardStyle;
  readonly grid?: GridStyle;
  /** Shape-tool preview drawn over the artwork; never part of the document. */
  readonly preview?: readonly PreviewStamp[] | null;
  /** A floating selection drawn over the artwork (transient — never in the document). */
  readonly float?: FloatOverlay | null;
  /** The active selection mask, drawn as marching ants. */
  readonly selection?: SelectionOverlay | null;
}

export const DEFAULT_CHECKERBOARD: CheckerboardStyle = {
  light: '#ffffff',
  dark: '#c7c7c7',
  size: 8,
};

export const DEFAULT_GRID: GridStyle = {
  color: 'rgba(0, 0, 0, 0.28)',
  minZoom: 6,
};

/**
 * Paints a {@link Document} onto a `<canvas>` (PROJECT_CORE §11).
 *
 * The passes are kept strictly separate and run in this order:
 *
 *   checkerboard → artwork → grid → (selection · onion · preview · cursor)
 *
 * Only the artwork pass reflects document pixels; every other pass is an
 * editor overlay drawn straight to the visible canvas and never folded back
 * into artwork (Rule 12). Scaling is always nearest-neighbour.
 */
export class CanvasRenderer {
  readonly #canvas: HTMLCanvasElement;
  readonly #ctx: CanvasRenderingContext2D;
  readonly #artwork: HTMLCanvasElement;
  readonly #artworkCtx: CanvasRenderingContext2D;

  constructor(canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('CanvasRenderer: could not acquire a 2D context');
    }
    const artwork = canvas.ownerDocument.createElement('canvas');
    const artworkCtx = artwork.getContext('2d');
    if (!artworkCtx) {
      throw new Error('CanvasRenderer: could not acquire an offscreen 2D context');
    }
    this.#canvas = canvas;
    this.#ctx = ctx;
    this.#artwork = artwork;
    this.#artworkCtx = artworkCtx;
  }

  render(document: Document, viewport: Viewport, options: RenderOptions = {}): void {
    const dpr = options.devicePixelRatio ?? 1;
    const cssWidth = this.#canvas.clientWidth || this.#canvas.width || 1;
    const cssHeight = this.#canvas.clientHeight || this.#canvas.height || 1;

    const backingWidth = Math.max(1, Math.round(cssWidth * dpr));
    const backingHeight = Math.max(1, Math.round(cssHeight * dpr));
    if (this.#canvas.width !== backingWidth) {
      this.#canvas.width = backingWidth;
    }
    if (this.#canvas.height !== backingHeight) {
      this.#canvas.height = backingHeight;
    }

    const { width: docWidth, height: docHeight } = document.dimensions;
    const originX = viewport.panX;
    const originY = viewport.panY;
    const scaledWidth = docWidth * viewport.zoom;
    const scaledHeight = docHeight * viewport.zoom;

    const ctx = this.#ctx;
    ctx.save();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, cssWidth, cssHeight);

    if (options.showCheckerboard ?? true) {
      this.#paintCheckerboard(
        ctx,
        originX,
        originY,
        scaledWidth,
        scaledHeight,
        options.checkerboard ?? DEFAULT_CHECKERBOARD,
      );
    }

    this.#paintArtwork(
      ctx,
      document,
      options.frameId,
      docWidth,
      docHeight,
      originX,
      originY,
      scaledWidth,
      scaledHeight,
    );

    if (options.float) {
      this.#paintFloat(ctx, options.float, viewport.zoom, originX, originY);
    }

    if (options.showGrid ?? true) {
      this.#paintGrid(
        ctx,
        viewport.zoom,
        docWidth,
        docHeight,
        originX,
        originY,
        options.grid ?? DEFAULT_GRID,
      );
    }

    if (options.selection) {
      this.#paintMarchingAnts(ctx, options.selection, viewport.zoom, originX, originY);
    }

    if (options.preview && options.preview.length > 0) {
      this.#paintPreview(ctx, options.preview, viewport.zoom, originX, originY);
    }

    ctx.restore();
  }

  #paintFloat(
    ctx: CanvasRenderingContext2D,
    float: FloatOverlay,
    zoom: number,
    originX: number,
    originY: number,
  ): void {
    if (this.#artwork.width < float.width) {
      this.#artwork.width = float.width;
    }
    if (this.#artwork.height < float.height) {
      this.#artwork.height = float.height;
    }
    const image = this.#artworkCtx.createImageData(float.width, float.height);
    image.data.set(float.bytes);
    this.#artworkCtx.clearRect(0, 0, this.#artwork.width, this.#artwork.height);
    this.#artworkCtx.putImageData(image, 0, 0);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(
      this.#artwork,
      0,
      0,
      float.width,
      float.height,
      originX + float.x * zoom,
      originY + float.y * zoom,
      float.width * zoom,
      float.height * zoom,
    );
  }

  #paintMarchingAnts(
    ctx: CanvasRenderingContext2D,
    selection: SelectionOverlay,
    zoom: number,
    originX: number,
    originY: number,
  ): void {
    const { data, width, height } = selection;
    const at = (x: number, y: number): boolean =>
      x >= 0 && y >= 0 && x < width && y < height && (data[y * width + x] ?? 0) !== 0;

    ctx.save();
    ctx.beginPath();
    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        if (!at(x, y)) {
          continue;
        }
        const left = originX + x * zoom;
        const top = originY + y * zoom;
        if (!at(x, y - 1)) {
          ctx.moveTo(left, top);
          ctx.lineTo(left + zoom, top);
        }
        if (!at(x, y + 1)) {
          ctx.moveTo(left, top + zoom);
          ctx.lineTo(left + zoom, top + zoom);
        }
        if (!at(x - 1, y)) {
          ctx.moveTo(left, top);
          ctx.lineTo(left, top + zoom);
        }
        if (!at(x + 1, y)) {
          ctx.moveTo(left + zoom, top);
          ctx.lineTo(left + zoom, top + zoom);
        }
      }
    }
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 3]);
    ctx.strokeStyle = '#000000';
    ctx.stroke();
    ctx.setLineDash([4, 3]);
    ctx.lineDashOffset = 4;
    ctx.strokeStyle = '#ffffff';
    ctx.stroke();
    ctx.restore();
  }

  #paintPreview(
    ctx: CanvasRenderingContext2D,
    preview: readonly PreviewStamp[],
    zoom: number,
    originX: number,
    originY: number,
  ): void {
    ctx.save();
    for (const stamp of preview) {
      ctx.fillStyle = `rgba(${String(stamp.color.r)}, ${String(stamp.color.g)}, ${String(
        stamp.color.b,
      )}, ${String((stamp.color.a / 255) * 0.85)})`;
      ctx.fillRect(originX + stamp.x * zoom, originY + stamp.y * zoom, zoom, zoom);
    }
    ctx.restore();
  }

  #paintArtwork(
    ctx: CanvasRenderingContext2D,
    document: Document,
    frameId: FrameId | undefined,
    docWidth: number,
    docHeight: number,
    originX: number,
    originY: number,
    scaledWidth: number,
    scaledHeight: number,
  ): void {
    const composite =
      frameId === undefined ? compositeDocument(document) : compositeDocument(document, frameId);
    if (this.#artwork.width !== docWidth) {
      this.#artwork.width = docWidth;
    }
    if (this.#artwork.height !== docHeight) {
      this.#artwork.height = docHeight;
    }
    const imageData = this.#artworkCtx.createImageData(docWidth, docHeight);
    imageData.data.set(composite.toBytes());
    this.#artworkCtx.putImageData(imageData, 0, 0);

    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(
      this.#artwork,
      0,
      0,
      docWidth,
      docHeight,
      originX,
      originY,
      scaledWidth,
      scaledHeight,
    );
  }

  #paintCheckerboard(
    ctx: CanvasRenderingContext2D,
    originX: number,
    originY: number,
    scaledWidth: number,
    scaledHeight: number,
    style: CheckerboardStyle,
  ): void {
    ctx.save();
    ctx.beginPath();
    ctx.rect(originX, originY, scaledWidth, scaledHeight);
    ctx.clip();

    ctx.fillStyle = style.light;
    ctx.fillRect(originX, originY, scaledWidth, scaledHeight);

    ctx.fillStyle = style.dark;
    const columns = Math.ceil(scaledWidth / style.size);
    const rows = Math.ceil(scaledHeight / style.size);
    for (let row = 0; row < rows; row += 1) {
      for (let column = 0; column < columns; column += 1) {
        if ((row + column) % 2 === 1) {
          ctx.fillRect(
            originX + column * style.size,
            originY + row * style.size,
            style.size,
            style.size,
          );
        }
      }
    }
    ctx.restore();
  }

  #paintGrid(
    ctx: CanvasRenderingContext2D,
    zoom: number,
    docWidth: number,
    docHeight: number,
    originX: number,
    originY: number,
    style: GridStyle,
  ): void {
    if (zoom < style.minZoom) {
      return;
    }
    ctx.save();
    ctx.strokeStyle = style.color;
    ctx.lineWidth = 1;
    ctx.beginPath();
    const right = originX + docWidth * zoom;
    const bottom = originY + docHeight * zoom;
    for (let x = 0; x <= docWidth; x += 1) {
      const cx = Math.round(originX + x * zoom) + 0.5;
      ctx.moveTo(cx, originY);
      ctx.lineTo(cx, bottom);
    }
    for (let y = 0; y <= docHeight; y += 1) {
      const cy = Math.round(originY + y * zoom) + 0.5;
      ctx.moveTo(originX, cy);
      ctx.lineTo(right, cy);
    }
    ctx.stroke();
    ctx.restore();
  }
}

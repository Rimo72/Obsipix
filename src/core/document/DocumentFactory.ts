import { PixelBuffer } from '@core/pixels/PixelBuffer';

import { Cel } from './Cel';
import {
  DEFAULT_DOCUMENT_HEIGHT,
  DEFAULT_DOCUMENT_NAME,
  DEFAULT_DOCUMENT_WIDTH,
  DEFAULT_LAYER_NAME,
  MAX_DOCUMENT_DIMENSION,
} from './defaults';
import { Document } from './Document';
import { Frame } from './Frame';
import { Layer } from './Layer';
import { LayerCollection } from './LayerCollection';
import { DEFAULT_PALETTE_COLORS, DEFAULT_PALETTE_NAME } from './palettes';
import { SelectionState } from './Selection';
import { Timeline } from './Timeline';
import { createIdFactory, type IdFactory } from './IdFactory';

export interface CreateDocumentOptions {
  readonly width?: number;
  readonly height?: number;
  readonly name?: string;
}

function assertValidDimensions(width: number, height: number): void {
  if (!Number.isInteger(width) || !Number.isInteger(height) || width <= 0 || height <= 0) {
    throw new RangeError(
      `Document dimensions must be positive integers, received ${width}x${height}`,
    );
  }
  if (width > MAX_DOCUMENT_DIMENSION || height > MAX_DOCUMENT_DIMENSION) {
    throw new RangeError(
      `Document dimensions may not exceed ${String(MAX_DOCUMENT_DIMENSION)}px, received ${width}x${height}`,
    );
  }
}

/**
 * Creates documents. `createDefault` produces the canonical starting point:
 * 32×32, transparent, one layer, one frame (PROJECT_CORE §8.8).
 */
export class DocumentFactory {
  readonly #ids: IdFactory;

  constructor(ids: IdFactory = createIdFactory()) {
    this.#ids = ids;
  }

  create(options: CreateDocumentOptions = {}): Document {
    const width = options.width ?? DEFAULT_DOCUMENT_WIDTH;
    const height = options.height ?? DEFAULT_DOCUMENT_HEIGHT;
    assertValidDimensions(width, height);
    const dimensions = { width, height };

    const layerId = this.#ids.layer();
    const layers = new LayerCollection(new Layer(layerId, { name: DEFAULT_LAYER_NAME }));

    const firstFrame = new Frame(this.#ids.frame());
    firstFrame.setCel(layerId, Cel.normal(this.#ids.cel(), PixelBuffer.create(width, height)));

    const document = Document.create({
      id: this.#ids.document(),
      dimensions,
      metadata: { name: options.name ?? DEFAULT_DOCUMENT_NAME },
      layers,
      timeline: new Timeline(this.#ids, dimensions, firstFrame),
      selection: new SelectionState(dimensions),
      palettes: [],
      ids: this.#ids,
    });
    document.createPalette(DEFAULT_PALETTE_NAME, DEFAULT_PALETTE_COLORS);
    return document;
  }

  createDefault(): Document {
    return this.create();
  }

  /**
   * Build a document whose single layer already has one frame per supplied
   * buffer, in order (used by sprite-sheet import). Every frame gets an
   * independent normal cel wrapping the buffer it was handed — the caller
   * transfers ownership — so imported frames stay independent. All buffers must
   * share the same dimensions, which become the document dimensions.
   */
  createFromFrames(
    frames: readonly PixelBuffer[],
    options: { readonly name?: string } = {},
  ): Document {
    const [first, ...rest] = frames;
    if (!first) {
      throw new RangeError('createFromFrames needs at least one frame');
    }
    const { width, height } = first;
    assertValidDimensions(width, height);
    if (rest.some((buffer) => buffer.width !== width || buffer.height !== height)) {
      throw new RangeError('createFromFrames requires every frame to share the same dimensions');
    }
    const dimensions = { width, height };

    const layerId = this.#ids.layer();
    const layers = new LayerCollection(new Layer(layerId, { name: DEFAULT_LAYER_NAME }));

    const firstFrame = new Frame(this.#ids.frame());
    firstFrame.setCel(layerId, Cel.normal(this.#ids.cel(), first));
    const timeline = new Timeline(this.#ids, dimensions, firstFrame);
    for (const buffer of rest) {
      const frame = timeline.appendFrame([], 'empty');
      frame.setCel(layerId, Cel.normal(this.#ids.cel(), buffer));
    }

    const document = Document.create({
      id: this.#ids.document(),
      dimensions,
      metadata: { name: options.name ?? DEFAULT_DOCUMENT_NAME },
      layers,
      timeline,
      selection: new SelectionState(dimensions),
      palettes: [],
      ids: this.#ids,
    });
    document.createPalette(DEFAULT_PALETTE_NAME, DEFAULT_PALETTE_COLORS);
    return document;
  }
}

/** Convenience: a default 32×32 document, optionally with an injected id source. */
export function createDefaultDocument(ids?: IdFactory): Document {
  return new DocumentFactory(ids).createDefault();
}

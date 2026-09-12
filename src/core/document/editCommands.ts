import { command, mutation, type Command } from '@core/history/Command';
import { PixelBuffer } from '@core/pixels/PixelBuffer';
import { floodMatchRegion } from '@core/tools/fill';
import { TRANSPARENT } from '@core/types/color';
import type { Dimensions, PixelPoint, PixelRegion } from '@core/types/geometry';
import type { FrameId, LayerId } from '@core/types/ids';
import {
  anchorOffset,
  flipHorizontal,
  flipVertical,
  resizeCanvas as resizeCanvasBuffer,
  rotateQuarter,
  scaleNearest,
  type AnchorX,
  type AnchorY,
  type Quarter,
} from '@core/tools/transform';

import { MAX_DOCUMENT_DIMENSION } from './defaults';
import type { Document } from './Document';
import type { SelectionMode } from './Selection';

const touchActive = (document: Document): { affectedLayerIds: LayerId[] } => ({
  affectedLayerIds: [document.layers.activeLayerId],
});

// --- Selection ----------------------------------------------------------

export function selectAllCommand(): Command {
  return mutation('Select all', (document) => {
    document.selection.selectAll();
  });
}

export function deselectCommand(): Command {
  return mutation('Deselect', (document) => {
    document.selection.deselect();
  });
}

export function invertSelectionCommand(): Command {
  return mutation('Invert selection', (document) => {
    document.selection.invert();
  });
}

export function selectRectCommand(region: PixelRegion, mode: SelectionMode): Command {
  return mutation('Select', (document) => {
    document.selection.applyRect(region, mode);
  });
}

export function selectShapeCommand(pixels: readonly PixelPoint[], mode: SelectionMode): Command {
  return mutation('Select', (document) => {
    const width = document.dimensions.width;
    const set = new Set(pixels.map((p) => p.y * width + p.x));
    document.selection.applyShape((x, y) => set.has(y * width + x), mode);
  });
}

export interface MagicWandOptions {
  readonly layerId?: LayerId;
  readonly frameId?: FrameId;
}

/**
 * Magic Wand: select the 4-connected region of pixels matching `seed`'s exact
 * colour on the active layer (hard-edged, no tolerance — same matching rule
 * as Fill, PROJECT_CORE §3.2). An empty/hold cel with nothing behind it reads
 * as uniformly transparent, so the seed matches the whole canvas — read-only,
 * never converts the cel to a normal one the way painting would.
 */
export function magicWandSelectCommand(
  seed: PixelPoint,
  mode: SelectionMode,
  options: MagicWandOptions = {},
): Command {
  return mutation('Magic Wand', (document) => {
    const layerId = options.layerId ?? document.layers.activeLayerId;
    const buffer =
      document.resolveBuffer(layerId, options.frameId) ??
      PixelBuffer.create(document.dimensions.width, document.dimensions.height);
    const region = floodMatchRegion(buffer, seed);
    const width = document.dimensions.width;
    const set = new Set(region.map((p) => p.y * width + p.x));
    document.selection.applyShape((x, y) => set.has(y * width + x), mode);
  });
}

// --- Region helpers ----------------------------------------------------

function selectionRegion(document: Document): PixelRegion {
  return (
    document.selection.bounds() ?? {
      x: 0,
      y: 0,
      width: document.dimensions.width,
      height: document.dimensions.height,
    }
  );
}

function clearRegion(buffer: PixelBuffer, region: PixelRegion): void {
  for (let y = region.y; y < region.y + region.height; y += 1) {
    for (let x = region.x; x < region.x + region.width; x += 1) {
      if (buffer.contains(x, y)) {
        buffer.setPixel(x, y, TRANSPARENT);
      }
    }
  }
}

// --- Delete / paste --------------------------------------------------

export function deleteSelectionCommand(): Command {
  return command('Delete', (document) => {
    if (!document.selection.active) {
      return touchActive(document);
    }
    const buffer = document.ensureDrawableBuffer();
    const { width, height } = document.dimensions;
    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        if (document.selection.isSelected(x, y)) {
          buffer.setPixel(x, y, TRANSPARENT);
        }
      }
    }
    return touchActive(document);
  });
}

export function pasteCommand(content: PixelBuffer, at: PixelPoint): Command {
  return command('Paste', (document) => {
    const buffer = document.ensureDrawableBuffer();
    for (let y = 0; y < content.height; y += 1) {
      for (let x = 0; x < content.width; x += 1) {
        const pixel = content.getPixel(x, y);
        if (pixel.a > 0 && buffer.contains(at.x + x, at.y + y)) {
          buffer.setPixel(at.x + x, at.y + y, pixel);
        }
      }
    }
    document.selection.applyRect(
      { x: at.x, y: at.y, width: content.width, height: content.height },
      'replace',
    );
    return touchActive(document);
  });
}

// --- Flip / rotate ------------------------------------------------

function transformRegion(
  document: Document,
  transform: (slice: PixelBuffer) => PixelBuffer,
): { affectedLayerIds: LayerId[] } {
  const region = selectionRegion(document);
  const buffer = document.ensureDrawableBuffer();
  const slice = PixelBuffer.create(region.width, region.height);
  slice.copyRegion(buffer, region, { x: 0, y: 0 });
  const transformed = transform(slice);
  clearRegion(buffer, region);

  const centreX = region.x + (region.width - 1) / 2;
  const centreY = region.y + (region.height - 1) / 2;
  const destX = Math.round(centreX - (transformed.width - 1) / 2);
  const destY = Math.round(centreY - (transformed.height - 1) / 2);
  buffer.copyRegion(
    transformed,
    { x: 0, y: 0, width: transformed.width, height: transformed.height },
    { x: destX, y: destY },
  );

  if (document.selection.active) {
    document.selection.applyRect(
      { x: destX, y: destY, width: transformed.width, height: transformed.height },
      'replace',
    );
  }
  return touchActive(document);
}

export function flipCommand(axis: 'horizontal' | 'vertical'): Command {
  const label = axis === 'horizontal' ? 'Flip horizontal' : 'Flip vertical';
  return command(label, (document) =>
    transformRegion(document, axis === 'horizontal' ? flipHorizontal : flipVertical),
  );
}

export function rotateSelectionCommand(quarter: Quarter): Command {
  return command('Rotate selection', (document) =>
    transformRegion(document, (slice) => rotateQuarter(slice, quarter)),
  );
}

/** Rotate the whole document: every layer plus the canvas bounds. */
export function rotateDocumentCommand(quarter: Quarter): Command {
  return command('Rotate', (document) => {
    const swap = quarter !== 'half';
    const { width, height } = document.dimensions;
    document.selection.deselect();
    document.resizeImage(swap ? { width: height, height: width } : { width, height }, (buffer) =>
      rotateQuarter(buffer, quarter),
    );
    return { affectedLayerIds: document.layers.layerIds() };
  });
}

// --- Resize ------------------------------------------------------

function assertDimensions(dimensions: Dimensions): void {
  if (
    !Number.isInteger(dimensions.width) ||
    !Number.isInteger(dimensions.height) ||
    dimensions.width <= 0 ||
    dimensions.height <= 0
  ) {
    throw new RangeError('Resize dimensions must be positive integers');
  }
  if (dimensions.width > MAX_DOCUMENT_DIMENSION || dimensions.height > MAX_DOCUMENT_DIMENSION) {
    throw new RangeError(`Resize dimensions may not exceed ${String(MAX_DOCUMENT_DIMENSION)}px`);
  }
}

export function resizeImageCommand(dimensions: Dimensions): Command {
  return command('Resize image', (document) => {
    assertDimensions(dimensions);
    document.resizeImage(dimensions, (buffer) =>
      scaleNearest(buffer, dimensions.width, dimensions.height),
    );
    return { affectedLayerIds: document.layers.layerIds() };
  });
}

export function resizeCanvasCommand(
  dimensions: Dimensions,
  anchorX: AnchorX = 'center',
  anchorY: AnchorY = 'center',
): Command {
  return command('Resize canvas', (document) => {
    assertDimensions(dimensions);
    const { width, height } = document.dimensions;
    const offset = anchorOffset(
      width,
      height,
      dimensions.width,
      dimensions.height,
      anchorX,
      anchorY,
    );
    document.resizeCanvas(dimensions, (buffer) =>
      resizeCanvasBuffer(buffer, dimensions.width, dimensions.height, offset.x, offset.y),
    );
    return { affectedLayerIds: document.layers.layerIds() };
  });
}

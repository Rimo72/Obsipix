import { command, type Command } from '@core/history/Command';
import { PixelBuffer } from '@core/pixels/PixelBuffer';
import type { LayerId } from '@core/types/ids';

/**
 * External RGBA image data ready to enter the engine: it has already passed
 * validation, sanitisation and resource-limit checks in the File Service
 * (PROJECT_CORE §14). The core never sees a `File` or a `Blob`.
 */
export interface ImageData8 {
  readonly width: number;
  readonly height: number;
  /** `width * height * 4` bytes, row-major RGBA. */
  readonly data: Uint8ClampedArray;
}

/** A {@link PixelBuffer} holding `image`, clipped to nothing — just wraps the bytes. */
export function bufferFromImage(image: ImageData8): PixelBuffer {
  return PixelBuffer.fromBytes(image.width, image.height, Uint8ClampedArray.from(image.data));
}

/**
 * Import a PNG (or any decoded image) as a new top layer of the current
 * document, aligned to the top-left and clipped to the canvas
 * (PROJECT_CORE §3.11 "Import PNG as a layer"). One undoable entry.
 */
export function importLayerCommand(name: string, image: ImageData8): Command {
  return command('Import layer', (document) => {
    const source = bufferFromImage(image);
    const layerId: LayerId = document.addLayer(name);
    const target = document.ensureDrawableBuffer(layerId);
    const width = Math.min(source.width, document.dimensions.width);
    const height = Math.min(source.height, document.dimensions.height);
    target.copyRegion(source, { x: 0, y: 0, width, height }, { x: 0, y: 0 });
    return { affectedLayerIds: [layerId] };
  });
}

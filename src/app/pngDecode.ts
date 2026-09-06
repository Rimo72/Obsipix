import { MAX_DOCUMENT_DIMENSION } from '@core/document/defaults';
import type { ImageData8 } from '@core/document/importCommands';
import { EditorError } from '@core/errors/EditorError';

/**
 * Decode PNG bytes to raw RGBA using the browser's own image pipeline
 * (PROJECT_CORE §14 — browser file/image APIs live in the app/File-Service
 * layer, never in `src/core`). Validation and resource limits are applied here,
 * before the data is handed to the engine.
 */
export async function decodePng(bytes: Uint8Array): Promise<ImageData8> {
  const blob = new Blob([bytes as BlobPart], { type: 'image/png' });

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(blob);
  } catch (error) {
    throw new EditorError('import/decode-failed', 'The PNG could not be read.', {
      severity: 'error',
      cause: error,
    });
  }

  try {
    const { width, height } = bitmap;
    if (width < 1 || height < 1) {
      throw new EditorError('import/decode-failed', 'The image has no pixels.');
    }
    if (width > MAX_DOCUMENT_DIMENSION || height > MAX_DOCUMENT_DIMENSION) {
      throw new EditorError(
        'import/too-large',
        `Images larger than ${MAX_DOCUMENT_DIMENSION}px on a side are not supported.`,
      );
    }

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new EditorError('import/decode-failed', 'Image decoding is unavailable.');
    }
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(bitmap, 0, 0);
    const imageData = ctx.getImageData(0, 0, width, height);
    return { width, height, data: imageData.data };
  } finally {
    bitmap.close();
  }
}

import { exportAllFrames, exportFrame } from '@core/persistence/exportImage';
import { encodeGif } from '@core/persistence/gif';
import { encodePng } from '@core/persistence/png';
import { composeSpriteSheet, type SheetLayout } from '@core/persistence/spritesheet';
import type { PixelBuffer } from '@core/pixels/PixelBuffer';
import { EditorError } from '@core/errors/EditorError';
import { WHITE, type RGBA } from '@core/types/color';

import type { EditorSession } from './EditorSession';
import { downloadBlob } from './fileAccess';

export type ExportFormat = 'png' | 'jpeg' | 'webp' | 'gif';
export type ExportKind = 'frame' | 'animation' | 'sheet';

export interface ExportSettings {
  readonly kind: ExportKind;
  readonly format: ExportFormat;
  readonly scale: number;
  /** Transparent background, or a solid white fill when false. */
  readonly transparent: boolean;
  readonly fileName: string;
  readonly sheet: {
    readonly layout: SheetLayout;
    readonly columns: number;
    readonly spacing: number;
  };
}

const MIME: Record<ExportFormat, string> = {
  png: 'image/png',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
  gif: 'image/gif',
};

/** Encode a pixel buffer to a Blob. PNG/GIF use the pure encoders; JPEG/WebP use the browser. */
async function encodeBuffer(buffer: PixelBuffer, format: ExportFormat): Promise<Blob> {
  if (format === 'png') {
    return new Blob([encodePng(buffer) as BlobPart], { type: 'image/png' });
  }
  if (format === 'gif') {
    return new Blob([encodeGif([{ buffer, delayMs: 0 }]) as BlobPart], { type: 'image/gif' });
  }

  const canvas = document.createElement('canvas');
  canvas.width = buffer.width;
  canvas.height = buffer.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new EditorError('export/unavailable', 'Image encoding is unavailable in this browser.');
  }
  const image = ctx.createImageData(buffer.width, buffer.height);
  image.data.set(buffer.toBytes());
  ctx.putImageData(image, 0, 0);

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new EditorError('export/failed', `The browser could not encode a ${format}.`));
        }
      },
      MIME[format],
      0.92,
    );
  });
}

function withExtension(name: string, format: ExportFormat): string {
  const base = name.trim().replace(/\.(png|jpe?g|webp|gif)$/i, '') || 'obsipix-art';
  return `${base}.${format === 'jpeg' ? 'jpg' : format}`;
}

/**
 * Run an export (PROJECT_CORE §44, §108). Export never creates a history entry
 * and never changes dirty state; a failure leaves the document untouched.
 * Returns an error message, or `null` on success.
 */
export async function runExport(
  session: EditorSession,
  settings: ExportSettings,
): Promise<string | null> {
  const background: RGBA | null = settings.transparent ? null : WHITE;

  try {
    if (settings.kind === 'animation') {
      const frames = exportAllFrames(session.document, { scale: settings.scale, background });
      const bytes = encodeGif(
        frames.map((f) => ({ buffer: f.buffer, delayMs: f.durationMs })),
        { loop: 0 },
      );
      downloadBlob(
        new Blob([bytes as BlobPart], { type: 'image/gif' }),
        withExtension(settings.fileName, 'gif'),
      );
      return null;
    }

    if (settings.kind === 'sheet') {
      const frames = exportAllFrames(session.document, { scale: settings.scale, background });
      const sheet = composeSpriteSheet(
        frames.map((f) => f.buffer),
        {
          layout: settings.sheet.layout,
          columns: settings.sheet.columns,
          spacing: settings.sheet.spacing,
          background,
        },
      );
      const format = settings.format === 'gif' ? 'png' : settings.format;
      const blob = await encodeBuffer(sheet, format);
      downloadBlob(blob, withExtension(settings.fileName, format));
      return null;
    }

    const buffer = exportFrame(session.document, session.document.timeline.activeFrameId, {
      scale: settings.scale,
      background,
    });
    const blob = await encodeBuffer(buffer, settings.format);
    downloadBlob(blob, withExtension(settings.fileName, settings.format));
    return null;
  } catch (error) {
    return error instanceof EditorError ? error.message : 'The export failed.';
  }
}

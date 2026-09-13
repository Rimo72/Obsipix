import type { PixelBuffer } from '@core/pixels/PixelBuffer';
import type { Asset } from '@core/project/Asset';
import type { RGBA } from '@core/types/color';

import { exportAllFrames } from './exportImage';
import {
  GENERIC_EXPORT_PROFILE,
  type ExportProfile,
  type GameAssetExportMetadata,
} from './exportProfile';
import { composeSpriteSheet, gridShape, type SheetLayout } from './spritesheet';

export interface FrameRange {
  /** Zero-based, inclusive. */
  readonly start: number;
  readonly end: number;
}

export interface GameAssetExportOptions {
  readonly scale?: number;
  readonly background?: RGBA | null;
  readonly layout?: SheetLayout;
  /** Columns for the `grid` layout (ignored otherwise). */
  readonly columns?: number;
  readonly spacing?: number;
  /**
   * Restrict to a frame range — e.g. one AnimationTag's span, for
   * exporting a single animation state — instead of the whole timeline.
   * Out-of-range bounds are clamped rather than rejected, so a stale tag
   * range (frames deleted since) degrades to "as much as still exists"
   * instead of failing the export outright.
   */
  readonly frameRange?: FrameRange;
  readonly profile?: ExportProfile;
}

export interface GameAssetExportResult {
  readonly image: PixelBuffer;
  readonly metadata: GameAssetExportMetadata;
}

/**
 * Build a sprite-sheet / tileset image plus its JSON metadata sidecar for
 * one Asset (V2 coding-phases Phase 8: "Sprite-sheet export for a set of
 * frames" and "Tileset export for a terrain group" are the same operation
 * here — a terrain asset's 9 tile-role frames and a character asset's
 * animation-state frame range both flow through this one path; only the
 * caller's `layout`/`frameRange` choices differ, the same way Phase 2's
 * `instantiateTemplate` never branches on which template it was given).
 */
export function exportGameAsset(
  asset: Asset,
  options: GameAssetExportOptions = {},
): GameAssetExportResult {
  const allFrames = exportAllFrames(asset.document, {
    ...(options.scale !== undefined ? { scale: options.scale } : {}),
    ...(options.background !== undefined ? { background: options.background } : {}),
  });
  if (allFrames.length === 0) {
    throw new RangeError('Asset has no frames to export');
  }

  const maxIndex = allFrames.length - 1;
  const requested = options.frameRange ?? { start: 0, end: maxIndex };
  const start = Math.max(0, Math.min(requested.start, maxIndex));
  const end = Math.max(start, Math.min(requested.end, maxIndex));
  const selected = allFrames.slice(start, end + 1).map((frame) => frame.buffer);

  const sheetOptions = {
    layout: options.layout ?? 'horizontal',
    ...(options.columns !== undefined ? { columns: options.columns } : {}),
    ...(options.spacing !== undefined ? { spacing: options.spacing } : {}),
    background: options.background ?? null,
  };
  const image = composeSpriteSheet(selected, sheetOptions);
  const { cols, rows } = gridShape(selected.length, sheetOptions);

  const profile = options.profile ?? GENERIC_EXPORT_PROFILE;
  const metadata = profile.buildMetadata({
    assetName: asset.document.metadata.name,
    category: asset.metadata.category,
    perspective: asset.metadata.perspective.kind,
    resolutionWidth: asset.document.dimensions.width,
    frameCount: selected.length,
    columns: cols,
    rows,
    frameWidth: selected[0]?.width ?? 0,
    frameHeight: selected[0]?.height ?? 0,
  });

  return { image, metadata };
}

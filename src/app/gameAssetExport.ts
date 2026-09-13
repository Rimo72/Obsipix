import { EditorError } from '@core/errors/EditorError';
import { exportGameAsset, type GameAssetExportOptions } from '@core/persistence/gameAssetExport';
import { encodePng } from '@core/persistence/png';
import type { Asset } from '@core/project/Asset';

import { downloadBytes } from './fileAccess';

export interface GameAssetExportSettings extends GameAssetExportOptions {
  readonly fileName: string;
}

function baseName(name: string): string {
  return name.trim().replace(/\.(png|json)$/i, '') || 'game-asset';
}

/**
 * Run a Game Asset Export for one Asset (V2 coding-phases Phase 8): a PNG
 * sprite-sheet/tileset plus its matching JSON metadata sidecar, both
 * downloaded. Mirrors `runExport`'s contract (never touches history or
 * dirty state; an error message, or `null` on success) but stays
 * synchronous — unlike JPEG/WebP in the general Export dialog, a game
 * asset's image is always PNG, so there's no browser `canvas.toBlob` step
 * to await.
 */
export function runGameAssetExport(asset: Asset, settings: GameAssetExportSettings): string | null {
  try {
    const { image, metadata } = exportGameAsset(asset, settings);
    const name = baseName(settings.fileName);
    downloadBytes(encodePng(image), `${name}.png`, 'image/png');
    downloadBytes(
      new TextEncoder().encode(JSON.stringify(metadata, null, 2)),
      `${name}.json`,
      'application/json',
    );
    return null;
  } catch (error) {
    if (error instanceof EditorError || error instanceof RangeError) {
      return error.message;
    }
    return 'The export failed.';
  }
}

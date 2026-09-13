import type { Document } from '@core/document/Document';

import { DEFAULT_ASSET_CATEGORY, type AssetCategory } from './AssetCategory';
import { resolutionFromDimensions, type AssetResolution } from './AssetResolution';
import { DEFAULT_PERSPECTIVE_KIND, getPerspective, type Perspective } from './Perspective';

/**
 * The descriptive metadata every Asset carries (V2 coding-phases Phase 1):
 * category, perspective, and resolution. Stored on the Asset, not the
 * Document — the Document format does not change (Phase 0 rule).
 */
export interface AssetMetadata {
  readonly category: AssetCategory;
  readonly perspective: Perspective;
  readonly resolution: AssetResolution;
}

/**
 * Sensible defaults for an Asset with no explicit metadata — used for newly
 * created assets, and for a `.obsipix` file from before this metadata
 * existed. Deriving from the Document itself means opening an old file
 * never fails; it just gets defaults instead of the choices a V2 user would
 * have made explicitly.
 */
export function inferAssetMetadata(document: Document): AssetMetadata {
  return {
    category: DEFAULT_ASSET_CATEGORY,
    perspective: getPerspective(DEFAULT_PERSPECTIVE_KIND),
    resolution: resolutionFromDimensions(document.dimensions),
  };
}

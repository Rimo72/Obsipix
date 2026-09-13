import type { AssetCategory } from './AssetCategory';
import type { Asset } from './Asset';
import type { PerspectiveKind } from './Perspective';
import type { ResolutionPreset } from './AssetResolution';

export interface AssetFilter {
  /** Case-insensitive substring match against the asset's document name. */
  readonly search?: string;
  readonly category?: AssetCategory;
  readonly perspective?: PerspectiveKind;
  readonly resolution?: ResolutionPreset;
}

/**
 * Filter a Project's assets for the Asset Library (V2 coding-phases
 * Phase 3). Pure and order-preserving; an empty filter returns every asset.
 */
export function filterAssets(assets: readonly Asset[], filter: AssetFilter): readonly Asset[] {
  const search = filter.search?.trim().toLowerCase();
  return assets.filter((asset) => {
    if (filter.category && asset.metadata.category !== filter.category) {
      return false;
    }
    if (filter.perspective && asset.metadata.perspective.kind !== filter.perspective) {
      return false;
    }
    if (filter.resolution && asset.metadata.resolution.preset !== filter.resolution) {
      return false;
    }
    if (search && !asset.document.metadata.name.toLowerCase().includes(search)) {
      return false;
    }
    return true;
  });
}

import type { AssetId } from '@core/types/ids';

import type { Asset } from './Asset';

/**
 * The variations that have already been created from `sourceId` within
 * `assets` (V2 coding-phases Phase 7, vision doc §9) — the "Tree 01…05"
 * family, found by lineage rather than by any grouping the Project itself
 * tracks.
 */
export function findVariants(assets: readonly Asset[], sourceId: AssetId): readonly Asset[] {
  return assets.filter((asset) => asset.metadata.variantOf === sourceId);
}

/**
 * Which of `source`'s declared `objectVariants` labels already have a
 * variation among `assets`, keyed by label (case-insensitive, matching how
 * the Character Info panel checks animation-state tags).
 */
export function findFulfilledVariantLabels(
  assets: readonly Asset[],
  sourceId: AssetId,
): ReadonlySet<string> {
  const labels = new Set<string>();
  for (const variant of findVariants(assets, sourceId)) {
    if (variant.metadata.variantLabel) {
      labels.add(variant.metadata.variantLabel.toLowerCase());
    }
  }
  return labels;
}

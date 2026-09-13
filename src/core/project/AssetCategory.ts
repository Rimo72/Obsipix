/**
 * Asset categories (V2 vision doc §4). A fixed, closed set on purpose — the
 * Template Engine (Phase 2) hangs category-specific defaults off these, so
 * adding one here is a real product decision, not a string typo away.
 */
export const ASSET_CATEGORIES = [
  'terrain',
  'character',
  'npc',
  'building',
  'object',
  'item',
  'weapon',
  'vehicle',
  'decoration',
  'ui',
  'effect',
] as const;

export type AssetCategory = (typeof ASSET_CATEGORIES)[number];

/** Used when an asset's category has never been set (e.g. a pre-V2 file). */
export const DEFAULT_ASSET_CATEGORY: AssetCategory = 'object';

export function isAssetCategory(value: unknown): value is AssetCategory {
  return typeof value === 'string' && (ASSET_CATEGORIES as readonly string[]).includes(value);
}

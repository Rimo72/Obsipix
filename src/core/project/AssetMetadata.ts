import type { Document } from '@core/document/Document';

import { DEFAULT_ASSET_CATEGORY, type AssetCategory } from './AssetCategory';
import { resolutionFromDimensions, type AssetResolution } from './AssetResolution';
import type { CharacterAnimationState } from './CharacterAnimationState';
import type { CharacterView } from './CharacterView';
import { DEFAULT_PERSPECTIVE_KIND, getPerspective, type Perspective } from './Perspective';
import type { TemplateId } from './Template';
import type { TerrainTileRole } from './TerrainTileRole';

/**
 * One terrain tile-role's slot within the Asset's Document (V2
 * coding-phases Phase 5). `frameIndex` is a Timeline position, not a
 * stable id — it goes stale if the frames are manually reordered later.
 * There is no terrain-aware reorder UI yet, so that stays a known
 * limitation rather than something this phase needs to solve.
 */
export interface TerrainRoleSlot {
  readonly role: TerrainTileRole;
  readonly frameIndex: number;
}

/** One character view's slot within the Asset's Document (V2 coding-phases Phase 6). */
export interface CharacterViewSlot {
  readonly view: CharacterView;
  readonly frameIndex: number;
}

/**
 * The descriptive metadata every Asset carries (V2 coding-phases Phase 1):
 * category, perspective, and resolution. Stored on the Asset, not the
 * Document — the Document format does not change (Phase 0 rule).
 */
export interface AssetMetadata {
  readonly category: AssetCategory;
  readonly perspective: Perspective;
  readonly resolution: AssetResolution;
  /** Present when this asset is a terrain tile-role set (V2 coding-phases Phase 5). */
  readonly terrainRoles?: readonly TerrainRoleSlot[];
  /**
   * The Template this asset was created from (V2 coding-phases Phase 6),
   * when it was created from one — enables re-checking an asset's
   * constraints against its original template later.
   */
  readonly templateId?: TemplateId;
  /** Present when this asset is a character view set (V2 coding-phases Phase 6). */
  readonly characterViews?: readonly CharacterViewSlot[];
  /** The character animation states this asset's template expects, as a checklist. */
  readonly animationStates?: readonly CharacterAnimationState[];
  /** The template's head-height proportion guideline (0-1) this asset was created under. */
  readonly headHeightRatio?: number;
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

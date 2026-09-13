import type { AssetCategory } from '@core/project/AssetCategory';
import type { PerspectiveKind } from '@core/project/Perspective';

/**
 * A Game Asset Export's JSON sidecar (V2 coding-phases Phase 8, vision doc
 * §13's metadata example):
 *
 * ```json
 * { "asset": "forest_tree", "type": "object", "resolution": 32, "perspective": "top_down", "frames": 4 }
 * ```
 *
 * `resolution` is the asset's pixel width — the doc's own example is a
 * single number, which only makes sense for the square-asset convention
 * pixel-art game assets typically follow; a non-square asset still reports
 * its width here rather than inventing an unspecified shape for the field.
 */
export interface GameAssetExportMetadata {
  readonly asset: string;
  readonly type: AssetCategory;
  readonly resolution: number;
  readonly perspective: PerspectiveKind;
  readonly frames: number;
}

export interface GameAssetExportInput {
  readonly assetName: string;
  readonly category: AssetCategory;
  readonly perspective: PerspectiveKind;
  readonly resolutionWidth: number;
  readonly frameCount: number;
  /**
   * The packed sheet's grid shape (V2 coding-phases Phase 9) — the generic
   * profile ignores these; an engine-specific profile (e.g. Godot) needs
   * them to describe how its importer should slice the sheet back into
   * cells.
   */
  readonly columns: number;
  readonly rows: number;
  readonly frameWidth: number;
  readonly frameHeight: number;
}

/**
 * A named export target — the "export profile" concept (V2 coding-phases
 * Phase 8) that lets a future engine target (Godot, Phase 9) be additive: a
 * new profile object elsewhere, not a branch inside the export engine
 * (`exportGameAsset`, which never inspects `profile.id`). Every profile
 * builds the same §13 metadata shape for now; a later profile can widen
 * `GameAssetExportMetadata` with fields specific to it (optional, so this
 * contract keeps holding) rather than replacing the schema outright.
 */
export interface ExportProfile {
  readonly id: string;
  readonly name: string;
  buildMetadata(input: GameAssetExportInput): GameAssetExportMetadata;
}

/** `"Forest Tree"` → `"forest_tree"`, matching the §13 example's asset field. */
export function slugify(name: string): string {
  const slug = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
  return slug || 'asset';
}

export const GENERIC_EXPORT_PROFILE: ExportProfile = {
  id: 'generic',
  name: 'Generic',
  buildMetadata(input) {
    return {
      asset: slugify(input.assetName),
      type: input.category,
      resolution: input.resolutionWidth,
      perspective: input.perspective,
      frames: input.frameCount,
    };
  },
};

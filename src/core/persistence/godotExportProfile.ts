import { GENERIC_EXPORT_PROFILE } from './exportProfile';
import type { ExportProfile, GameAssetExportMetadata } from './exportProfile';

/**
 * The Godot export profile's JSON sidecar (V2 coding-phases Phase 9):
 * the same §13 schema, widened with the packed sheet's grid shape — what
 * Godot's own "Add frames from Sprite Sheet" dialog (AnimatedSprite2D) and
 * TileSet atlas slicing both ask for (frame size, columns, rows). See
 * `docs/GODOT_IMPORT.md` for the import steps this metadata feeds.
 */
export interface GodotExportMetadata extends GameAssetExportMetadata {
  readonly engine: 'godot';
  readonly columns: number;
  readonly rows: number;
  readonly frame_width: number;
  readonly frame_height: number;
}

/**
 * Reuses the generic profile's own metadata, then adds Godot's grid-shape
 * fields — the export engine (`exportGameAsset`) never branches on which
 * profile it was given, so this stays a plain data transform rather than a
 * parallel code path.
 */
export const GODOT_EXPORT_PROFILE: ExportProfile = {
  id: 'godot',
  name: 'Godot',
  buildMetadata(input): GodotExportMetadata {
    return {
      ...GENERIC_EXPORT_PROFILE.buildMetadata(input),
      engine: 'godot',
      columns: input.columns,
      rows: input.rows,
      frame_width: input.frameWidth,
      frame_height: input.frameHeight,
    };
  },
};

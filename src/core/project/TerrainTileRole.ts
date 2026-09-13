/**
 * The classic 3x3 terrain tile-role grid from the V2 vision doc §6's
 * diagram:
 *
 * ```text
 * +-----+-----+-----+
 * | C   | T   | C   |
 * +-----+-----+-----+
 * | T   | M   | T   |
 * +-----+-----+-----+
 * | C   | T   | C   |
 * +-----+-----+-----+
 * M = Main / Center   T = Transition / Edge   C = Corner
 * ```
 *
 * In row-major order, matching the diagram exactly — a terrain preview grid
 * can render this array directly onto a 3x3 CSS grid with no remapping.
 *
 * Scoped to Phase 5's stated coverage — "center/edge/corner/transition"
 * (the diagram's own legend equates transition with edge). Inner corners,
 * tile variants and auto-tiling are explicitly *future* terrain features
 * (§6) and stay out of this list until a later phase builds the system
 * that gives them meaning.
 */
export const TERRAIN_TILE_ROLES = [
  'corner_tl',
  'edge_top',
  'corner_tr',
  'edge_left',
  'center',
  'edge_right',
  'corner_bl',
  'edge_bottom',
  'corner_br',
] as const;

export type TerrainTileRole = (typeof TERRAIN_TILE_ROLES)[number];

export function isTerrainTileRole(value: unknown): value is TerrainTileRole {
  return typeof value === 'string' && (TERRAIN_TILE_ROLES as readonly string[]).includes(value);
}

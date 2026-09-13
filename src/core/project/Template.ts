import type { RGBA } from '@core/types/color';
import type { Dimensions } from '@core/types/geometry';

import type { AssetCategory } from './AssetCategory';
import type { PerspectiveKind } from './Perspective';
import type { TerrainTileRole } from './TerrainTileRole';

/** A stable, human-authored slug (e.g. `"character-hero"`) — not a generated id. */
export type TemplateId = string;

/**
 * Data that configures a new Asset (V2 vision doc §4: "Create Asset →
 * Choose Category → Choose Template → Configure → Create"). Everything past
 * the identifying fields is optional and defaulted at instantiation time —
 * a template only states what makes it distinctive.
 *
 * The vision doc also lists outline rules, shading rules, animation
 * config, export config, and asset constraints as template fields. They
 * are deliberately absent here rather than stubbed out: no system in the
 * editor gives them meaning yet, and a field nothing acts on is a
 * half-finished feature, not forward compatibility. They join this schema
 * as the phases that build those systems (6-7) need them.
 */
export interface Template {
  readonly id: TemplateId;
  readonly name: string;
  readonly category: AssetCategory;
  readonly assetType: string;
  readonly perspective: PerspectiveKind;
  readonly canvasSize: Dimensions;
  /** Defaults to a single default-named layer when omitted. */
  readonly layerNames?: readonly string[];
  /** Defaults to the standard default palette when omitted. */
  readonly paletteColors?: readonly RGBA[];
  /**
   * Terrain tile-role slots (V2 coding-phases Phase 5). When set,
   * instantiation creates one Frame per role, in order, and records the
   * role → frame mapping on the resulting Asset's metadata.
   */
  readonly tileRoles?: readonly TerrainTileRole[];
}

/**
 * A Template that defines a terrain tile-role set. A type-level
 * convenience for authoring terrain templates — `instantiateTemplate`
 * itself only ever reads the optional `tileRoles` field on `Template`, the
 * same generic way it reads every other field (Phase 2 rule: no branching
 * on which template it was given).
 */
export type TerrainTemplate = Template & { readonly tileRoles: readonly TerrainTileRole[] };

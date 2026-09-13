import type { RGBA } from '@core/types/color';
import type { Dimensions } from '@core/types/geometry';

import type { AssetCategory } from './AssetCategory';
import type { CharacterAnimationState } from './CharacterAnimationState';
import type { CharacterView } from './CharacterView';
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
 * as the phases that build those systems (7) need them.
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
  /**
   * Character views (V2 coding-phases Phase 6). When set, instantiation
   * creates one Frame per view, in order, recorded on the resulting
   * Asset's metadata — the same pattern `tileRoles` uses for terrain.
   */
  readonly views?: readonly CharacterView[];
  /**
   * Character animation states this template expects (V2 coding-phases
   * Phase 6) — a declared checklist, not auto-generated frames. A state's
   * frame count is open-ended and artist-driven, so it's backed by the
   * existing AnimationTag mechanism once the artist actually animates it.
   */
  readonly animationStates?: readonly CharacterAnimationState[];
  /**
   * The template's proportion guideline (V2 coding-phases Phase 6): the
   * fraction of canvas height reserved for the head, 0-1. This data model's
   * one checkable stand-in for the vision doc's "body proportions" / "head
   * size" — not a full pose/skeleton system, which nothing in the editor
   * gives meaning to yet.
   */
  readonly headHeightRatio?: number;
}

/**
 * A Template that defines a terrain tile-role set. A type-level
 * convenience for authoring terrain templates — `instantiateTemplate`
 * itself only ever reads the optional `tileRoles` field on `Template`, the
 * same generic way it reads every other field (Phase 2 rule: no branching
 * on which template it was given).
 */
export type TerrainTemplate = Template & { readonly tileRoles: readonly TerrainTileRole[] };

/**
 * A Template that defines a character view/state/proportion set. Same
 * type-level-convenience relationship to `Template` as `TerrainTemplate`.
 */
export type CharacterTemplate = Template & {
  readonly views: readonly CharacterView[];
  readonly animationStates: readonly CharacterAnimationState[];
  readonly headHeightRatio: number;
};

/** Narrows a `Template` to `CharacterTemplate` when it carries all three character fields. */
export function isCharacterTemplate(template: Template): template is CharacterTemplate {
  return (
    template.views !== undefined &&
    template.animationStates !== undefined &&
    template.headHeightRatio !== undefined
  );
}

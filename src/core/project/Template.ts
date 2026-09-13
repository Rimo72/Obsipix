import type { RGBA } from '@core/types/color';
import type { Dimensions } from '@core/types/geometry';

import type { AssetCategory } from './AssetCategory';
import type { PerspectiveKind } from './Perspective';

/** A stable, human-authored slug (e.g. `"character-hero"`) — not a generated id. */
export type TemplateId = string;

/**
 * Data that configures a new Asset (V2 vision doc §4: "Create Asset →
 * Choose Category → Choose Template → Configure → Create"). Everything past
 * the identifying fields is optional and defaulted at instantiation time —
 * a template only states what makes it distinctive.
 *
 * The vision doc also lists outline rules, shading rules, animation
 * config, tile rules, export config, and asset constraints as template
 * fields. They are deliberately absent here rather than stubbed out: no
 * system in the editor gives them meaning yet, and a field nothing acts on
 * is a half-finished feature, not forward compatibility. They join this
 * schema as the phases that build those systems (5-7) need them.
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
}

import type { Document } from '@core/document/Document';
import { DocumentFactory } from '@core/document/DocumentFactory';
import type { IdFactory } from '@core/document/IdFactory';
import { rgbaEquals, type RGBA } from '@core/types/color';
import type { Dimensions } from '@core/types/geometry';

import { DEFAULT_ASSET_CATEGORY } from './AssetCategory';
import type { AssetMetadata, CharacterViewSlot, TerrainRoleSlot } from './AssetMetadata';
import { resolutionFromDimensions } from './AssetResolution';
import { DEFAULT_PERSPECTIVE_KIND, getPerspective, type Perspective } from './Perspective';
import type { ProjectStyle } from './ProjectStyle';
import type { Template } from './Template';

export interface TemplateInstantiation {
  readonly document: Document;
  readonly metadata: AssetMetadata;
}

export interface InstantiateTemplateOptions {
  readonly ids?: IdFactory;
  /** The owning Project's shared visual style (V2 coding-phases Phase 4). */
  readonly style?: ProjectStyle | null;
}

const FALLBACK_CANVAS_SIZE: Dimensions = { width: 32, height: 32 };

function addStyleReferenceColors(document: Document, style: ProjectStyle | null | undefined): void {
  const paletteId = document.activePaletteId;
  if (!style || !paletteId) {
    return;
  }
  const palette = document.requirePalette(paletteId);
  const references: readonly [string, RGBA | undefined][] = [
    ['Outline', style.outlineColor],
    ['Highlight', style.highlightColor],
    ['Shadow', style.shadowColor],
  ];
  for (const [name, color] of references) {
    if (color && !palette.colors.some((entry) => rgbaEquals(entry.rgba, color))) {
      document.addPaletteColor(paletteId, color, name);
    }
  }
}

/**
 * Build a Document + AssetMetadata from a Template (V2 coding-phases
 * Phase 2), applying the owning Project's shared style as defaults where
 * the template itself doesn't specify something more particular (Phase 4).
 * Generic over every template — reads `template`'s fields and calls the
 * same `DocumentFactory`/`Document` primitives the rest of the editor uses;
 * it never branches on which template it was given, which is what lets a
 * new template be pure data (Phase 2 rule).
 *
 * `template` may be `undefined` (an unknown template id) or missing any
 * optional field — both fall back to documented defaults, matching
 * {@link inferAssetMetadata}'s defaults exactly, rather than throwing.
 */
export function instantiateTemplate(
  template: Template | undefined,
  options: InstantiateTemplateOptions = {},
): TemplateInstantiation {
  const { ids, style } = options;
  const canvasSize = template?.canvasSize ?? FALLBACK_CANVAS_SIZE;
  const document = new DocumentFactory(ids).create({
    width: canvasSize.width,
    height: canvasSize.height,
    ...(template?.name ? { name: template.name } : {}),
  });

  const layerNames = template?.layerNames;
  const [firstLayerName, ...restLayerNames] = layerNames ?? [];
  if (firstLayerName !== undefined) {
    document.layers.activeLayer.rename(firstLayerName);
    for (const name of restLayerNames) {
      document.addLayer(name);
    }
  }

  // One Frame per tile-role slot (V2 coding-phases Phase 5) — the first
  // role reuses the Document's existing first frame; each further role gets
  // its own independent (not held/linked) blank frame, ready to draw into.
  const tileRoles = template?.tileRoles;
  let terrainRoles: readonly TerrainRoleSlot[] | undefined;
  if (tileRoles && tileRoles.length > 0) {
    for (let i = 1; i < tileRoles.length; i += 1) {
      document.addFrame();
    }
    terrainRoles = tileRoles.map((role, frameIndex) => ({ role, frameIndex }));
  }

  // One Frame per character view (V2 coding-phases Phase 6) — the same
  // pattern as terrain tile roles above. A template combining `tileRoles`
  // and `views` is not a supported/real scenario (a template is either
  // terrain or character), so this assumes frame 0 is still free exactly
  // like the tileRoles block does.
  const views = template?.views;
  let characterViews: readonly CharacterViewSlot[] | undefined;
  if (views && views.length > 0) {
    for (let i = 1; i < views.length; i += 1) {
      document.addFrame();
    }
    characterViews = views.map((view, frameIndex) => ({ view, frameIndex }));
  }

  // A template's own palette wins outright; otherwise the Project's shared
  // primary palette is the default, same as an explicit template palette
  // would be — only falling through to DocumentFactory's own default when
  // neither is set.
  const primaryPaletteColors = template?.paletteColors ?? style?.primaryPalette;
  if (primaryPaletteColors) {
    const previousPaletteId = document.activePaletteId;
    document.createPalette(`${template?.name ?? 'Primary'} Palette`, primaryPaletteColors);
    if (previousPaletteId) {
      document.removePalette(previousPaletteId);
    }
  }
  addStyleReferenceColors(document, style);
  if (style?.secondaryPalette && style.secondaryPalette.length > 0) {
    document.createPalette('Secondary', style.secondaryPalette, false);
  }

  let perspective: Perspective = getPerspective(template?.perspective ?? DEFAULT_PERSPECTIVE_KIND);
  if (style?.lightingDirection) {
    perspective = { ...perspective, shadowDirection: style.lightingDirection };
  }

  const metadata: AssetMetadata = {
    category: template?.category ?? DEFAULT_ASSET_CATEGORY,
    perspective,
    resolution: resolutionFromDimensions(document.dimensions),
    ...(template ? { templateId: template.id } : {}),
    ...(terrainRoles ? { terrainRoles } : {}),
    ...(characterViews ? { characterViews } : {}),
    ...(template?.animationStates ? { animationStates: template.animationStates } : {}),
    ...(template?.headHeightRatio !== undefined
      ? { headHeightRatio: template.headHeightRatio }
      : {}),
  };

  return { document, metadata };
}

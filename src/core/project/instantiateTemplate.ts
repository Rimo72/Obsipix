import type { Document } from '@core/document/Document';
import { DocumentFactory } from '@core/document/DocumentFactory';
import type { IdFactory } from '@core/document/IdFactory';
import type { Dimensions } from '@core/types/geometry';

import { DEFAULT_ASSET_CATEGORY } from './AssetCategory';
import type { AssetMetadata } from './AssetMetadata';
import { resolutionFromDimensions } from './AssetResolution';
import { DEFAULT_PERSPECTIVE_KIND, getPerspective } from './Perspective';
import type { Template } from './Template';

export interface TemplateInstantiation {
  readonly document: Document;
  readonly metadata: AssetMetadata;
}

const FALLBACK_CANVAS_SIZE: Dimensions = { width: 32, height: 32 };

/**
 * Build a Document + AssetMetadata from a Template (V2 coding-phases
 * Phase 2). Generic over every template — reads `template`'s fields and
 * calls the same `DocumentFactory`/`Document` primitives the rest of the
 * editor uses; it never branches on which template it was given, which is
 * what lets a new template be pure data (Phase 2 rule).
 *
 * `template` may be `undefined` (an unknown template id) or missing any
 * optional field — both fall back to documented defaults, matching
 * {@link inferAssetMetadata}'s defaults exactly, rather than throwing.
 */
export function instantiateTemplate(
  template: Template | undefined,
  ids?: IdFactory,
): TemplateInstantiation {
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

  if (template?.paletteColors) {
    const previousPaletteId = document.activePaletteId;
    document.createPalette(`${template.name} Palette`, template.paletteColors);
    if (previousPaletteId) {
      document.removePalette(previousPaletteId);
    }
  }

  const metadata: AssetMetadata = {
    category: template?.category ?? DEFAULT_ASSET_CATEGORY,
    perspective: getPerspective(template?.perspective ?? DEFAULT_PERSPECTIVE_KIND),
    resolution: resolutionFromDimensions(document.dimensions),
  };

  return { document, metadata };
}

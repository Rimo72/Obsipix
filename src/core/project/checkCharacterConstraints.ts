import type { Document } from '@core/document/Document';
import { rgbaEquals } from '@core/types/color';

import type { AssetMetadata } from './AssetMetadata';
import type { CharacterTemplate } from './Template';

export interface ConstraintViolation {
  readonly field: 'spriteDimensions' | 'headHeightRatio' | 'palette';
  readonly message: string;
}

/**
 * Check an Asset against the Character Template it should be consistent
 * with (V2 coding-phases Phase 6). A constraint violation is returned, not
 * thrown — surfacing it is the caller's job (a panel, a toast); this stays
 * a pure, reusable check.
 *
 * "Sprite dimensions" and "animation frame dimensions" from the vision
 * doc collapse into one check here: every Frame in a Document always
 * shares the Document's own pixel dimensions (a Timeline-level invariant —
 * there is no per-frame size), so validating the canvas size against the
 * template validates both properties at once.
 *
 * "Body proportions" / "head size" reduce to `headHeightRatio` — this data
 * model's one checkable proportion guideline, not a full pose/skeleton
 * system nothing in the editor gives meaning to yet.
 */
export function checkCharacterConstraints(
  document: Document,
  metadata: AssetMetadata,
  template: CharacterTemplate,
): readonly ConstraintViolation[] {
  const violations: ConstraintViolation[] = [];

  if (
    document.dimensions.width !== template.canvasSize.width ||
    document.dimensions.height !== template.canvasSize.height
  ) {
    violations.push({
      field: 'spriteDimensions',
      message: `Sprite is ${String(document.dimensions.width)}×${String(document.dimensions.height)}, template expects ${String(template.canvasSize.width)}×${String(template.canvasSize.height)}.`,
    });
  }

  if (metadata.headHeightRatio !== template.headHeightRatio) {
    violations.push({
      field: 'headHeightRatio',
      message: `Head-height guideline is ${String(metadata.headHeightRatio ?? 'unset')}, template expects ${String(template.headHeightRatio)}.`,
    });
  }

  if (template.paletteColors && template.paletteColors.length > 0) {
    const activeColors = document.activePalette?.colors.map((entry) => entry.rgba) ?? [];
    const missing = template.paletteColors.filter(
      (templateColor) => !activeColors.some((color) => rgbaEquals(color, templateColor)),
    );
    if (missing.length > 0) {
      violations.push({
        field: 'palette',
        message: `${String(missing.length)} template palette colour(s) are missing from the active palette.`,
      });
    }
  }

  return violations;
}

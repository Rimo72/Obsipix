import { isAssetCategory } from '@core/project/AssetCategory';
import type { AssetMetadata } from '@core/project/AssetMetadata';
import { isResolutionPreset, type AssetResolution } from '@core/project/AssetResolution';
import {
  isPerspectiveKind,
  SHADOW_DIRECTIONS,
  type AlignmentRule,
  type GridGeometry,
  type Perspective,
  type ShadowDirection,
} from '@core/project/Perspective';
import { EditorError } from '@core/errors/EditorError';

/**
 * A small sibling format to `.obsipix`, kept deliberately separate from it:
 * `AssetMetadata` belongs to the Asset/Project layer, not the Document, and
 * the Document's own format does not change (V2 Phase 0 rule). Plain UTF-8
 * JSON — there is no pixel data here to warrant a binary layout.
 */
export class AssetMetadataParseError extends EditorError {
  constructor(message: string, cause?: unknown) {
    super('persistence/invalid-asset-metadata', message, { severity: 'error', cause });
    this.name = 'AssetMetadataParseError';
  }
}

export function serializeAssetMetadata(metadata: AssetMetadata): Uint8Array {
  return new TextEncoder().encode(JSON.stringify(metadata));
}

function isDimensions(value: unknown): value is { width: number; height: number } {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as { width?: unknown }).width === 'number' &&
    typeof (value as { height?: unknown }).height === 'number'
  );
}

const GRID_GEOMETRIES: readonly GridGeometry[] = ['square', 'diamond', 'hexagonal', 'none'];
const ALIGNMENT_RULES: readonly AlignmentRule[] = ['bottom_center', 'center', 'baseline', 'custom'];

function assertPerspective(value: unknown): asserts value is Perspective {
  if (typeof value !== 'object' || value === null) {
    throw new AssetMetadataParseError('perspective must be an object');
  }
  const p = value as Record<string, unknown>;
  if (!isPerspectiveKind(p.kind)) {
    throw new AssetMetadataParseError(`Unknown perspective kind: ${JSON.stringify(p.kind)}`);
  }
  if (!GRID_GEOMETRIES.includes(p.gridGeometry as GridGeometry)) {
    throw new AssetMetadataParseError(`Unknown grid geometry: ${JSON.stringify(p.gridGeometry)}`);
  }
  if (!isDimensions(p.tileDimensions)) {
    throw new AssetMetadataParseError('perspective.tileDimensions must be a Dimensions object');
  }
  if (!SHADOW_DIRECTIONS.includes(p.shadowDirection as ShadowDirection)) {
    throw new AssetMetadataParseError(
      `Unknown shadow direction: ${JSON.stringify(p.shadowDirection)}`,
    );
  }
  if (!ALIGNMENT_RULES.includes(p.alignment as AlignmentRule)) {
    throw new AssetMetadataParseError(`Unknown alignment rule: ${JSON.stringify(p.alignment)}`);
  }
}

function assertResolution(value: unknown): asserts value is AssetResolution {
  if (!isDimensions(value)) {
    throw new AssetMetadataParseError('resolution must be a Dimensions object');
  }
  const preset = (value as { preset?: unknown }).preset;
  if (!isResolutionPreset(preset)) {
    throw new AssetMetadataParseError(`Unknown resolution preset: ${JSON.stringify(preset)}`);
  }
}

/** Parse bytes produced by {@link serializeAssetMetadata}. Throws {@link AssetMetadataParseError}. */
export function parseAssetMetadata(bytes: Uint8Array): AssetMetadata {
  let raw: unknown;
  try {
    raw = JSON.parse(new TextDecoder().decode(bytes));
  } catch (error) {
    throw new AssetMetadataParseError('Asset metadata is not valid JSON', error);
  }
  if (typeof raw !== 'object' || raw === null) {
    throw new AssetMetadataParseError('Asset metadata must be a JSON object');
  }
  const { category, perspective, resolution } = raw as Record<string, unknown>;
  if (!isAssetCategory(category)) {
    throw new AssetMetadataParseError(`Unknown asset category: ${JSON.stringify(category)}`);
  }
  assertPerspective(perspective);
  assertResolution(resolution);
  return {
    category,
    perspective,
    resolution,
  };
}

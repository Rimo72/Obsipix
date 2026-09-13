import { isAssetCategory } from '@core/project/AssetCategory';
import type {
  AssetMetadata,
  CharacterViewSlot,
  TerrainRoleSlot,
} from '@core/project/AssetMetadata';
import { isResolutionPreset, type AssetResolution } from '@core/project/AssetResolution';
import {
  isCharacterAnimationState,
  type CharacterAnimationState,
} from '@core/project/CharacterAnimationState';
import { isCharacterView } from '@core/project/CharacterView';
import {
  isPerspectiveKind,
  SHADOW_DIRECTIONS,
  type AlignmentRule,
  type GridGeometry,
  type Perspective,
  type ShadowDirection,
} from '@core/project/Perspective';
import { isTerrainTileRole } from '@core/project/TerrainTileRole';
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

function assertFrameIndex(value: unknown, label: string): asserts value is number {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 0) {
    throw new AssetMetadataParseError(
      `${label} must be a non-negative integer: ${JSON.stringify(value)}`,
    );
  }
}

function assertTerrainRoles(value: unknown): asserts value is readonly TerrainRoleSlot[] {
  if (!Array.isArray(value)) {
    throw new AssetMetadataParseError('terrainRoles must be an array');
  }
  for (const entry of value) {
    if (typeof entry !== 'object' || entry === null) {
      throw new AssetMetadataParseError('Each terrainRoles entry must be an object');
    }
    const { role, frameIndex } = entry as Record<string, unknown>;
    if (!isTerrainTileRole(role)) {
      throw new AssetMetadataParseError(`Unknown terrain tile role: ${JSON.stringify(role)}`);
    }
    assertFrameIndex(frameIndex, 'terrainRoles.frameIndex');
  }
}

function assertCharacterViews(value: unknown): asserts value is readonly CharacterViewSlot[] {
  if (!Array.isArray(value)) {
    throw new AssetMetadataParseError('characterViews must be an array');
  }
  for (const entry of value) {
    if (typeof entry !== 'object' || entry === null) {
      throw new AssetMetadataParseError('Each characterViews entry must be an object');
    }
    const { view, frameIndex } = entry as Record<string, unknown>;
    if (!isCharacterView(view)) {
      throw new AssetMetadataParseError(`Unknown character view: ${JSON.stringify(view)}`);
    }
    assertFrameIndex(frameIndex, 'characterViews.frameIndex');
  }
}

function assertAnimationStates(
  value: unknown,
): asserts value is readonly CharacterAnimationState[] {
  if (!Array.isArray(value)) {
    throw new AssetMetadataParseError('animationStates must be an array');
  }
  for (const entry of value) {
    if (!isCharacterAnimationState(entry)) {
      throw new AssetMetadataParseError(
        `Unknown character animation state: ${JSON.stringify(entry)}`,
      );
    }
  }
}

function assertHeadHeightRatio(value: unknown): asserts value is number {
  if (typeof value !== 'number' || value < 0 || value > 1) {
    throw new AssetMetadataParseError(
      `headHeightRatio must be a number between 0 and 1: ${JSON.stringify(value)}`,
    );
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
  const {
    category,
    perspective,
    resolution,
    terrainRoles,
    templateId,
    characterViews,
    animationStates,
    headHeightRatio,
  } = raw as Record<string, unknown>;

  if (!isAssetCategory(category)) {
    throw new AssetMetadataParseError(`Unknown asset category: ${JSON.stringify(category)}`);
  }
  assertPerspective(perspective);
  assertResolution(resolution);

  if (terrainRoles !== undefined) {
    assertTerrainRoles(terrainRoles);
  }
  if (templateId !== undefined && typeof templateId !== 'string') {
    throw new AssetMetadataParseError(`templateId must be a string: ${JSON.stringify(templateId)}`);
  }
  if (characterViews !== undefined) {
    assertCharacterViews(characterViews);
  }
  if (animationStates !== undefined) {
    assertAnimationStates(animationStates);
  }
  if (headHeightRatio !== undefined) {
    assertHeadHeightRatio(headHeightRatio);
  }

  return {
    category,
    perspective,
    resolution,
    ...(terrainRoles !== undefined ? { terrainRoles } : {}),
    ...(templateId !== undefined ? { templateId } : {}),
    ...(characterViews !== undefined ? { characterViews } : {}),
    ...(animationStates !== undefined ? { animationStates } : {}),
    ...(headHeightRatio !== undefined ? { headHeightRatio } : {}),
  };
}

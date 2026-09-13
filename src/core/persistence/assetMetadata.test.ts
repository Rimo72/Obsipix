import { describe, expect, it } from 'vitest';

import { createDefaultDocument } from '@core/document/DocumentFactory';
import { inferAssetMetadata, type AssetMetadata } from '@core/project/AssetMetadata';
import { getPerspective } from '@core/project/Perspective';

import {
  AssetMetadataParseError,
  parseAssetMetadata,
  serializeAssetMetadata,
} from './assetMetadata';

describe('AssetMetadata serialization (V2 coding-phases Phase 1)', () => {
  it('round-trips an inferred metadata record exactly', () => {
    const original = inferAssetMetadata(createDefaultDocument());
    const parsed = parseAssetMetadata(serializeAssetMetadata(original));
    expect(parsed).toEqual(original);
  });

  it('round-trips an explicitly-authored metadata record exactly', () => {
    const original: AssetMetadata = {
      category: 'character',
      perspective: getPerspective('isometric'),
      resolution: { preset: '32x32', width: 32, height: 32 },
    };
    const parsed = parseAssetMetadata(serializeAssetMetadata(original));
    expect(parsed).toEqual(original);
  });

  it('rejects bytes that are not valid JSON', () => {
    const garbage = new TextEncoder().encode('not json {');
    expect(() => parseAssetMetadata(garbage)).toThrow(AssetMetadataParseError);
  });

  it('rejects an unknown category, perspective kind, or resolution preset', () => {
    const badCategory = { ...inferAssetMetadata(createDefaultDocument()), category: 'spaceship' };
    expect(() => parseAssetMetadata(new TextEncoder().encode(JSON.stringify(badCategory)))).toThrow(
      AssetMetadataParseError,
    );

    const base = inferAssetMetadata(createDefaultDocument());
    const badPerspective = { ...base, perspective: { ...base.perspective, kind: 'top_left' } };
    expect(() =>
      parseAssetMetadata(new TextEncoder().encode(JSON.stringify(badPerspective))),
    ).toThrow(AssetMetadataParseError);

    const badResolution = { ...base, resolution: { ...base.resolution, preset: '1000x1000' } };
    expect(() =>
      parseAssetMetadata(new TextEncoder().encode(JSON.stringify(badResolution))),
    ).toThrow(AssetMetadataParseError);
  });
});

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

describe('AssetMetadata terrainRoles serialization (V2 coding-phases Phase 5)', () => {
  it('round-trips terrainRoles exactly', () => {
    const original: AssetMetadata = {
      ...inferAssetMetadata(createDefaultDocument()),
      category: 'terrain',
      terrainRoles: [
        { role: 'center', frameIndex: 4 },
        { role: 'corner_tl', frameIndex: 0 },
      ],
    };
    const parsed = parseAssetMetadata(serializeAssetMetadata(original));
    expect(parsed).toEqual(original);
  });

  it('omits terrainRoles entirely when absent, same as Phase 1', () => {
    const original = inferAssetMetadata(createDefaultDocument());
    const parsed = parseAssetMetadata(serializeAssetMetadata(original));
    expect(parsed.terrainRoles).toBeUndefined();
    expect('terrainRoles' in parsed).toBe(false);
  });

  it('rejects an unknown tile role', () => {
    const base = inferAssetMetadata(createDefaultDocument());
    const bad = { ...base, terrainRoles: [{ role: 'north_face', frameIndex: 0 }] };
    expect(() => parseAssetMetadata(new TextEncoder().encode(JSON.stringify(bad)))).toThrow(
      AssetMetadataParseError,
    );
  });

  it('rejects a negative or non-integer frameIndex', () => {
    const base = inferAssetMetadata(createDefaultDocument());
    const negative = { ...base, terrainRoles: [{ role: 'center', frameIndex: -1 }] };
    expect(() => parseAssetMetadata(new TextEncoder().encode(JSON.stringify(negative)))).toThrow(
      AssetMetadataParseError,
    );

    const fractional = { ...base, terrainRoles: [{ role: 'center', frameIndex: 1.5 }] };
    expect(() => parseAssetMetadata(new TextEncoder().encode(JSON.stringify(fractional)))).toThrow(
      AssetMetadataParseError,
    );
  });

  it('rejects terrainRoles that is not an array', () => {
    const base = inferAssetMetadata(createDefaultDocument());
    const bad = { ...base, terrainRoles: 'center' };
    expect(() => parseAssetMetadata(new TextEncoder().encode(JSON.stringify(bad)))).toThrow(
      AssetMetadataParseError,
    );
  });
});

describe('AssetMetadata character fields serialization (V2 coding-phases Phase 6)', () => {
  it('round-trips templateId, characterViews, animationStates, and headHeightRatio exactly', () => {
    const original: AssetMetadata = {
      ...inferAssetMetadata(createDefaultDocument()),
      category: 'character',
      templateId: 'character-hero',
      characterViews: [
        { view: 'front', frameIndex: 0 },
        { view: 'side', frameIndex: 1 },
      ],
      animationStates: ['idle', 'walk'],
      headHeightRatio: 0.25,
    };
    const parsed = parseAssetMetadata(serializeAssetMetadata(original));
    expect(parsed).toEqual(original);
  });

  it('omits every character field entirely when absent', () => {
    const original = inferAssetMetadata(createDefaultDocument());
    const parsed = parseAssetMetadata(serializeAssetMetadata(original));
    for (const field of ['templateId', 'characterViews', 'animationStates', 'headHeightRatio']) {
      expect(field in parsed).toBe(false);
    }
  });

  it('rejects an unknown character view', () => {
    const base = inferAssetMetadata(createDefaultDocument());
    const bad = { ...base, characterViews: [{ view: 'upside_down', frameIndex: 0 }] };
    expect(() => parseAssetMetadata(new TextEncoder().encode(JSON.stringify(bad)))).toThrow(
      AssetMetadataParseError,
    );
  });

  it('rejects an unknown animation state', () => {
    const base = inferAssetMetadata(createDefaultDocument());
    const bad = { ...base, animationStates: ['sleeping'] };
    expect(() => parseAssetMetadata(new TextEncoder().encode(JSON.stringify(bad)))).toThrow(
      AssetMetadataParseError,
    );
  });

  it('rejects a headHeightRatio outside 0-1', () => {
    const base = inferAssetMetadata(createDefaultDocument());
    const tooHigh = { ...base, headHeightRatio: 1.5 };
    expect(() => parseAssetMetadata(new TextEncoder().encode(JSON.stringify(tooHigh)))).toThrow(
      AssetMetadataParseError,
    );
    const negative = { ...base, headHeightRatio: -0.1 };
    expect(() => parseAssetMetadata(new TextEncoder().encode(JSON.stringify(negative)))).toThrow(
      AssetMetadataParseError,
    );
  });

  it('rejects a non-string templateId', () => {
    const base = inferAssetMetadata(createDefaultDocument());
    const bad = { ...base, templateId: 42 };
    expect(() => parseAssetMetadata(new TextEncoder().encode(JSON.stringify(bad)))).toThrow(
      AssetMetadataParseError,
    );
  });
});

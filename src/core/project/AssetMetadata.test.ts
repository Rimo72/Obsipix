import { describe, expect, it } from 'vitest';

import { createDefaultDocument, DocumentFactory } from '@core/document/DocumentFactory';

import { inferAssetMetadata } from './AssetMetadata';
import { getPerspective } from './Perspective';

describe('inferAssetMetadata (V2 coding-phases Phase 1)', () => {
  it('defaults to category "object" and perspective "top_down"', () => {
    const metadata = inferAssetMetadata(createDefaultDocument());
    expect(metadata.category).toBe('object');
    expect(metadata.perspective).toEqual(getPerspective('top_down'));
  });

  it('classifies a known square resolution', () => {
    const document = new DocumentFactory().create({ width: 64, height: 64 });
    expect(inferAssetMetadata(document).resolution).toEqual({
      preset: '64x64',
      width: 64,
      height: 64,
    });
  });

  it('classifies a non-square or unlisted size as custom', () => {
    const rectangular = new DocumentFactory().create({ width: 64, height: 32 });
    expect(inferAssetMetadata(rectangular).resolution.preset).toBe('custom');

    const oddSquare = new DocumentFactory().create({ width: 100, height: 100 });
    expect(inferAssetMetadata(oddSquare).resolution.preset).toBe('custom');
  });
});

import { describe, expect, it } from 'vitest';

import { GENERIC_EXPORT_PROFILE, slugify } from './exportProfile';

describe('slugify (V2 coding-phases Phase 8)', () => {
  it('lowercases and joins words with underscores', () => {
    expect(slugify('Forest Tree')).toBe('forest_tree');
  });

  it('collapses punctuation and repeated separators into one underscore', () => {
    expect(slugify("Goblin's  Chest!!")).toBe('goblin_s_chest');
  });

  it('trims leading and trailing separators', () => {
    expect(slugify('  --Hero-- ')).toBe('hero');
  });

  it('falls back to "asset" for a name with nothing sluggable', () => {
    expect(slugify('***')).toBe('asset');
    expect(slugify('')).toBe('asset');
  });
});

describe('GENERIC_EXPORT_PROFILE (V2 coding-phases Phase 8)', () => {
  it("builds exactly the vision doc's §13 metadata schema", () => {
    const metadata = GENERIC_EXPORT_PROFILE.buildMetadata({
      assetName: 'Forest Tree',
      category: 'object',
      perspective: 'top_down',
      resolutionWidth: 32,
      frameCount: 4,
    });
    expect(metadata).toEqual({
      asset: 'forest_tree',
      type: 'object',
      resolution: 32,
      perspective: 'top_down',
      frames: 4,
    });
  });
});

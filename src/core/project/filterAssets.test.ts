import { describe, expect, it } from 'vitest';

import { createDefaultDocument } from '@core/document/DocumentFactory';

import { Asset } from './Asset';
import { filterAssets } from './filterAssets';
import { getPerspective } from './Perspective';

function makeAsset(
  id: string,
  name: string,
  category: 'terrain' | 'character' | 'item',
  perspectiveKind: 'top_down' | 'isometric',
  resolutionPreset: '16x16' | '32x32',
): Asset {
  const document = createDefaultDocument();
  document.metadata.name = name;
  return new Asset(id as never, document, {
    metadata: {
      category,
      perspective: getPerspective(perspectiveKind),
      resolution: { preset: resolutionPreset, width: 32, height: 32 },
    },
  });
}

describe('filterAssets (V2 coding-phases Phase 3)', () => {
  const grass = makeAsset('ast_1', 'Grass Tile', 'terrain', 'top_down', '32x32');
  const hero = makeAsset('ast_2', 'Hero', 'character', 'isometric', '32x32');
  const potion = makeAsset('ast_3', 'Potion', 'item', 'top_down', '16x16');
  const all = [grass, hero, potion];

  it('returns every asset when the filter is empty', () => {
    expect(filterAssets(all, {})).toEqual(all);
  });

  it('filters by category', () => {
    expect(filterAssets(all, { category: 'character' })).toEqual([hero]);
  });

  it('filters by perspective', () => {
    expect(filterAssets(all, { perspective: 'top_down' })).toEqual([grass, potion]);
  });

  it('filters by resolution preset', () => {
    expect(filterAssets(all, { resolution: '16x16' })).toEqual([potion]);
  });

  it('searches by name, case-insensitively and by substring', () => {
    expect(filterAssets(all, { search: 'ero' })).toEqual([hero]);
    expect(filterAssets(all, { search: 'GRASS' })).toEqual([grass]);
    expect(filterAssets(all, { search: 'xyz' })).toEqual([]);
  });

  it('combines multiple criteria with AND semantics', () => {
    expect(filterAssets(all, { category: 'terrain', perspective: 'isometric' })).toEqual([]);
    expect(filterAssets(all, { category: 'terrain', perspective: 'top_down' })).toEqual([grass]);
  });

  it('ignores surrounding whitespace in the search term', () => {
    expect(filterAssets(all, { search: '  hero  ' })).toEqual([hero]);
  });
});

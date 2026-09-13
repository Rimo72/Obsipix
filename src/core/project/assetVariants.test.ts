import { describe, expect, it } from 'vitest';

import { createDefaultDocument } from '@core/document/DocumentFactory';

import { findFulfilledVariantLabels, findVariants } from './assetVariants';
import { Project } from './Project';

describe('assetVariants (V2 coding-phases Phase 7)', () => {
  it('findVariants returns only assets whose variantOf points at the given id', () => {
    const project = Project.createSingleAsset(createDefaultDocument());
    const rootId = project.activeAssetId;
    const smallId = project.duplicateAsset(rootId, 'small');
    project.duplicateAsset(rootId, 'large');
    project.duplicateAsset(smallId, 'tiny'); // a variant of the variant, not of root

    const variants = findVariants(project.assets, rootId);
    expect(variants).toHaveLength(2);
    expect(variants.map((v) => v.metadata.variantLabel).sort()).toEqual(['large', 'small']);
  });

  it('findVariants returns an empty list for an asset with no variations yet', () => {
    const project = Project.createSingleAsset(createDefaultDocument());
    expect(findVariants(project.assets, project.activeAssetId)).toEqual([]);
  });

  it('findFulfilledVariantLabels is case-insensitive and ignores unlabelled duplicates', () => {
    const project = Project.createSingleAsset(createDefaultDocument());
    const rootId = project.activeAssetId;
    project.duplicateAsset(rootId, 'Small');
    project.duplicateAsset(rootId); // a plain duplicate, no label

    const fulfilled = findFulfilledVariantLabels(project.assets, rootId);
    expect(fulfilled.has('small')).toBe(true);
    expect(fulfilled.size).toBe(1);
  });
});

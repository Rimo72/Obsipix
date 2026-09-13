import { describe, expect, it } from 'vitest';

import { createDefaultDocument } from '@core/document/DocumentFactory';
import { rgbaEquals, TRANSPARENT } from '@core/types/color';

import { inferAssetMetadata } from './AssetMetadata';
import { Project } from './Project';
import { createSequentialProjectIdFactory } from './ProjectIdFactory';

describe('Project (V2 coding-phases Phase 0)', () => {
  it('createSingleAsset produces a project with exactly one asset, active by default', () => {
    const document = createDefaultDocument();
    const project = Project.createSingleAsset(document);

    expect(project.assetIds).toHaveLength(1);
    expect(project.activeAssetId).toBe(project.assetIds[0]);
    expect(project.activeAsset.document).toBe(document);
  });

  it('addAsset grows the project without changing the active asset', () => {
    const project = Project.createSingleAsset(createDefaultDocument());
    const firstId = project.activeAssetId;

    const secondDocument = createDefaultDocument();
    const secondId = project.addAsset(secondDocument);

    expect(project.assetIds).toEqual([firstId, secondId]);
    expect(project.activeAssetId).toBe(firstId);
    expect(project.getAsset(secondId)?.document).toBe(secondDocument);
  });

  it('setActiveAsset switches which asset is active', () => {
    const project = Project.createSingleAsset(createDefaultDocument());
    const secondId = project.addAsset(createDefaultDocument());

    project.setActiveAsset(secondId);
    expect(project.activeAssetId).toBe(secondId);
    expect(project.activeAsset.id).toBe(secondId);
  });

  it('setActiveAsset rejects an id that is not part of the project', () => {
    const project = Project.createSingleAsset(createDefaultDocument());
    expect(() => project.setActiveAsset('ast_unknown' as never)).toThrow();
  });

  it('each asset keeps an independent History that survives switching away and back', () => {
    const project = Project.createSingleAsset(createDefaultDocument());
    const firstId = project.activeAssetId;
    const secondId = project.addAsset(createDefaultDocument());

    project.activeAsset.history.begin('paint').commit();
    expect(project.getAsset(firstId)?.history.depth).toBe(1);
    expect(project.getAsset(secondId)?.history.depth).toBe(0);

    project.setActiveAsset(secondId);
    expect(project.activeAsset.history.depth).toBe(0);
    project.activeAsset.history.begin('paint').commit();
    project.activeAsset.history.begin('paint').commit();
    expect(project.getAsset(secondId)?.history.depth).toBe(2);

    project.setActiveAsset(firstId);
    expect(project.activeAsset.history.depth).toBe(1); // untouched while away
  });

  it('uses an injected ProjectIdFactory deterministically', () => {
    const ids = createSequentialProjectIdFactory();
    const project = Project.createSingleAsset(createDefaultDocument(), { ids });
    expect(project.activeAssetId).toBe('ast_1');
    expect(project.id).toBe('prj_2');
    const secondId = project.addAsset(createDefaultDocument());
    expect(secondId).toBe('ast_3');
  });
});

describe('Project.removeAsset (V2 coding-phases Phase 3)', () => {
  it('removes a non-active asset without disturbing the active one', () => {
    const project = Project.createSingleAsset(createDefaultDocument());
    const firstId = project.activeAssetId;
    const secondId = project.addAsset(createDefaultDocument());

    project.removeAsset(secondId);
    expect(project.assetIds).toEqual([firstId]);
    expect(project.activeAssetId).toBe(firstId);
  });

  it('removing the active asset falls back to its previous neighbour', () => {
    const project = Project.createSingleAsset(createDefaultDocument());
    const firstId = project.activeAssetId;
    const secondId = project.addAsset(createDefaultDocument());
    const thirdId = project.addAsset(createDefaultDocument());
    project.setActiveAsset(secondId);

    project.removeAsset(secondId);
    expect(project.assetIds).toEqual([firstId, thirdId]);
    expect(project.activeAssetId).toBe(firstId); // the neighbour before it
  });

  it('removing the first (active) asset falls back to the new first asset', () => {
    const project = Project.createSingleAsset(createDefaultDocument());
    const firstId = project.activeAssetId;
    const secondId = project.addAsset(createDefaultDocument());

    project.removeAsset(firstId);
    expect(project.assetIds).toEqual([secondId]);
    expect(project.activeAssetId).toBe(secondId);
  });

  it('refuses to remove the last asset in a project', () => {
    const project = Project.createSingleAsset(createDefaultDocument());
    expect(() => project.removeAsset(project.activeAssetId)).toThrow();
    expect(project.assetIds).toHaveLength(1);
  });

  it('refuses to remove an unknown asset id', () => {
    const project = Project.createSingleAsset(createDefaultDocument());
    project.addAsset(createDefaultDocument());
    expect(() => project.removeAsset('ast_unknown' as never)).toThrow();
  });
});

describe('Project.duplicateAsset (V2 coding-phases Phase 3)', () => {
  it('produces an independent copy with the same metadata and a distinct document identity', () => {
    const source = createDefaultDocument();
    const metadata = inferAssetMetadata(source);
    const project = Project.createSingleAsset(source, {
      metadata: { ...metadata, category: 'character' },
    });
    const sourceId = project.activeAssetId;

    const copyId = project.duplicateAsset(sourceId);
    const copy = project.getAsset(copyId)!;

    expect(copyId).not.toBe(sourceId);
    expect(copy.document.id).not.toBe(source.id);
    expect(copy.document.dimensions).toEqual(source.dimensions);
    expect(copy.metadata).toEqual({ ...metadata, category: 'character' });
    expect(copy.document.metadata.name).toBe(`${source.metadata.name} copy`);
    expect(project.activeAssetId).toBe(sourceId); // duplicating does not switch
  });

  it('the copy is pixel-independent from the source', () => {
    const project = Project.createSingleAsset(createDefaultDocument());
    const sourceId = project.activeAssetId;
    const copyId = project.duplicateAsset(sourceId);

    const sourceDocument = project.getAsset(sourceId)!.document;
    sourceDocument
      .ensureDrawableBuffer(sourceDocument.layers.activeLayerId)
      .setPixel(0, 0, { r: 255, g: 0, b: 0, a: 255 });

    const copyDocument = project.getAsset(copyId)!.document;
    const copyPixel = copyDocument.resolveBuffer(copyDocument.layers.activeLayerId)?.getPixel(0, 0);
    expect(rgbaEquals(copyPixel ?? TRANSPARENT, TRANSPARENT)).toBe(true);
  });

  it('refuses to duplicate an unknown asset id', () => {
    const project = Project.createSingleAsset(createDefaultDocument());
    expect(() => project.duplicateAsset('ast_unknown' as never)).toThrow();
  });
});

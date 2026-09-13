import { describe, expect, it } from 'vitest';

import { createDefaultDocument } from '@core/document/DocumentFactory';

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

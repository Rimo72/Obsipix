import type { Document } from '@core/document/Document';
import { EditorError } from '@core/errors/EditorError';
import type { AssetId, ProjectId } from '@core/types/ids';

import type { AssetMetadata } from './AssetMetadata';
import { Asset } from './Asset';
import { createProjectIdFactory, type ProjectIdFactory } from './ProjectIdFactory';

export interface ProjectMetadata {
  readonly name: string;
}

export interface CreateSingleAssetOptions {
  readonly name?: string;
  readonly ids?: ProjectIdFactory;
  /** Defaults to inferred metadata for `document` when omitted. */
  readonly metadata?: AssetMetadata;
}

/**
 * Owns one or more {@link Asset}s and tracks which one is active
 * (V2 coding-phases Phase 0). Each Asset keeps its own independent
 * History for as long as the Project is open — switching the active
 * Asset never mutates or discards another Asset's undo stack.
 */
export class Project {
  readonly id: ProjectId;
  readonly metadata: ProjectMetadata;

  readonly #ids: ProjectIdFactory;
  readonly #assets = new Map<AssetId, Asset>();
  #activeAssetId: AssetId;

  private constructor(
    id: ProjectId,
    metadata: ProjectMetadata,
    ids: ProjectIdFactory,
    firstAsset: Asset,
  ) {
    this.id = id;
    this.metadata = metadata;
    this.#ids = ids;
    this.#assets.set(firstAsset.id, firstAsset);
    this.#activeAssetId = firstAsset.id;
  }

  /**
   * A Project containing exactly one Asset — today's single-document
   * behavior, preserved as the default so existing open/save/new-document
   * flows are unaffected by the Project concept existing.
   */
  static createSingleAsset(document: Document, options: CreateSingleAssetOptions = {}): Project {
    const ids = options.ids ?? createProjectIdFactory();
    const asset = new Asset(
      ids.asset(),
      document,
      options.metadata ? { metadata: options.metadata } : {},
    );
    return new Project(ids.project(), { name: options.name ?? 'Untitled Project' }, ids, asset);
  }

  get assetIds(): readonly AssetId[] {
    return [...this.#assets.keys()];
  }

  get assets(): readonly Asset[] {
    return [...this.#assets.values()];
  }

  get activeAssetId(): AssetId {
    return this.#activeAssetId;
  }

  get activeAsset(): Asset {
    const asset = this.#assets.get(this.#activeAssetId);
    if (!asset) {
      throw new EditorError('project/no-active-asset', 'Project has no active asset');
    }
    return asset;
  }

  getAsset(id: AssetId): Asset | undefined {
    return this.#assets.get(id);
  }

  /** Add a new Asset wrapping `document` to the project. Does not change the active asset. */
  addAsset(document: Document, metadata?: AssetMetadata): AssetId {
    const asset = new Asset(this.#ids.asset(), document, metadata ? { metadata } : {});
    this.#assets.set(asset.id, asset);
    return asset.id;
  }

  /** Make `id` the active asset. Throws if it is not a member of this Project. */
  setActiveAsset(id: AssetId): void {
    if (!this.#assets.has(id)) {
      throw new EditorError(
        'project/unknown-asset',
        `Asset ${String(id)} is not part of this project`,
      );
    }
    this.#activeAssetId = id;
  }
}

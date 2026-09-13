import type { Document } from '@core/document/Document';
import { EditorError } from '@core/errors/EditorError';
import { parseDocument } from '@core/persistence/parse';
import { serializeDocument } from '@core/persistence/serialize';
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

  /**
   * Remove an asset. A Project must always keep at least one asset (mirrors
   * a Document always keeping at least one layer), so removing the last one
   * throws instead of leaving the Project unusable. Removing the active
   * asset falls back to its neighbour, same rule as `LayerCollection.remove`.
   */
  removeAsset(id: AssetId): void {
    if (!this.#assets.has(id)) {
      throw new EditorError(
        'project/unknown-asset',
        `Asset ${String(id)} is not part of this project`,
      );
    }
    if (this.#assets.size === 1) {
      throw new EditorError('project/last-asset', 'Cannot remove the last asset in a project');
    }
    const index = this.assetIds.indexOf(id);
    const wasActive = this.#activeAssetId === id;
    this.#assets.delete(id);
    if (wasActive) {
      const remaining = this.assetIds;
      const fallback = remaining[Math.max(0, index - 1)];
      if (!fallback) {
        throw new EditorError(
          'project/no-active-asset',
          'Project unexpectedly empty after removal',
        );
      }
      this.#activeAssetId = fallback;
    }
  }

  /**
   * Duplicate an asset: an independent copy of its Document (fresh identity,
   * fresh pixel buffers) carrying the same metadata, added to the project
   * without switching to it. Reuses the `.obsipix` serialize/parse pair
   * rather than a bespoke deep-clone, so the copy is exactly as independent
   * as opening a saved file would produce.
   */
  duplicateAsset(id: AssetId): AssetId {
    const source = this.#assets.get(id);
    if (!source) {
      throw new EditorError(
        'project/unknown-asset',
        `Asset ${String(id)} is not part of this project`,
      );
    }
    const copy = parseDocument(serializeDocument(source.document));
    copy.metadata.name = `${source.document.metadata.name} copy`;
    return this.addAsset(copy, source.metadata);
  }
}

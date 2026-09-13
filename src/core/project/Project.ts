import type { Document } from '@core/document/Document';
import { EditorError } from '@core/errors/EditorError';
import { parseDocument } from '@core/persistence/parse';
import { serializeDocument } from '@core/persistence/serialize';
import type { AssetId, ProjectId } from '@core/types/ids';

import type { AssetMetadata } from './AssetMetadata';
import { Asset } from './Asset';
import { createProjectIdFactory, type ProjectIdFactory } from './ProjectIdFactory';
import type { ProjectStyle } from './ProjectStyle';

export interface ProjectMetadata {
  readonly name: string;
}

export interface CreateSingleAssetOptions {
  readonly name?: string;
  readonly ids?: ProjectIdFactory;
  /** Defaults to inferred metadata for `document` when omitted. */
  readonly metadata?: AssetMetadata;
  /** The Project's shared visual style (V2 coding-phases Phase 4). */
  readonly style?: ProjectStyle;
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
  #style: ProjectStyle | null;

  private constructor(
    id: ProjectId,
    metadata: ProjectMetadata,
    ids: ProjectIdFactory,
    firstAsset: Asset,
    style: ProjectStyle | null,
  ) {
    this.id = id;
    this.metadata = metadata;
    this.#ids = ids;
    this.#assets.set(firstAsset.id, firstAsset);
    this.#activeAssetId = firstAsset.id;
    this.#style = style;
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
    return new Project(
      ids.project(),
      { name: options.name ?? 'Untitled Project' },
      ids,
      asset,
      options.style ?? null,
    );
  }

  /** The Project's shared visual style (V2 coding-phases Phase 4), or `null` when unset. */
  get style(): ProjectStyle | null {
    return this.#style;
  }

  setStyle(style: ProjectStyle | null): void {
    this.#style = style;
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
   * Duplicate an asset — the same operation the vision doc calls "Create
   * Variation" (§9): an independent copy of its Document (fresh identity,
   * fresh pixel buffers) carrying the same style-relevant metadata
   * (palette, perspective, resolution, proportions all live on the
   * Document/AssetMetadata that gets copied wholesale), added to the
   * project without switching to it. Reuses the `.obsipix` serialize/parse
   * pair rather than a bespoke deep-clone, so the copy is exactly as
   * independent as opening a saved file would produce.
   *
   * Records lineage (V2 coding-phases Phase 7): the copy's
   * `variantOf` always points at `id`, the asset just duplicated — not at
   * that asset's own ultimate ancestor, so duplicating a variant forms a
   * chain rather than collapsing to one shared root. `variantLabel`, when
   * given, should be one of the source's own declared `objectVariants`.
   */
  duplicateAsset(id: AssetId, variantLabel?: string): AssetId {
    const source = this.#assets.get(id);
    if (!source) {
      throw new EditorError(
        'project/unknown-asset',
        `Asset ${String(id)} is not part of this project`,
      );
    }
    const copy = parseDocument(serializeDocument(source.document));
    copy.metadata.name = variantLabel
      ? `${source.document.metadata.name} (${capitalize(variantLabel)})`
      : `${source.document.metadata.name} copy`;
    const metadata: AssetMetadata = {
      ...source.metadata,
      variantOf: id,
      ...(variantLabel ? { variantLabel } : {}),
    };
    return this.addAsset(copy, metadata);
  }
}

function capitalize(label: string): string {
  return label.charAt(0).toUpperCase() + label.slice(1);
}

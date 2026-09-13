import type { Document } from '@core/document/Document';
import { History, type HistoryOptions } from '@core/history/History';
import type { AssetId } from '@core/types/ids';

import { inferAssetMetadata, type AssetMetadata } from './AssetMetadata';

export interface AssetOptions {
  readonly historyOptions?: HistoryOptions;
  /** Defaults to {@link inferAssetMetadata} of `document` when omitted. */
  readonly metadata?: AssetMetadata;
}

/**
 * A Project's unit of editable work: a stable identity wrapping one
 * Document's independent {@link History} (V2 coding-phases Phase 0), plus
 * the category/perspective/resolution metadata that identifies what kind of
 * game asset it is (Phase 1).
 *
 * `AssetId` is distinct from the wrapped Document's `DocumentId` — the
 * Asset is what a Project indexes and switches between; the Document
 * remains, as in V1, the authoritative editable state.
 */
export class Asset {
  readonly id: AssetId;
  readonly history: History;
  #metadata: AssetMetadata;

  constructor(id: AssetId, document: Document, options: AssetOptions = {}) {
    this.id = id;
    this.history = new History(document, options.historyOptions);
    this.#metadata = options.metadata ?? inferAssetMetadata(document);
  }

  get document(): Document {
    return this.history.document;
  }

  get metadata(): AssetMetadata {
    return this.#metadata;
  }

  setMetadata(metadata: AssetMetadata): void {
    this.#metadata = metadata;
  }
}

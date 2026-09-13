import type { Document } from '@core/document/Document';
import { History, type HistoryOptions } from '@core/history/History';
import type { AssetId } from '@core/types/ids';

export interface AssetOptions {
  readonly historyOptions?: HistoryOptions;
}

/**
 * A Project's unit of editable work: a stable identity wrapping one
 * Document's independent {@link History} (V2 coding-phases Phase 0).
 *
 * `AssetId` is distinct from the wrapped Document's `DocumentId` — the
 * Asset is what a Project indexes and switches between; the Document
 * remains, as in V1, the authoritative editable state.
 */
export class Asset {
  readonly id: AssetId;
  readonly history: History;

  constructor(id: AssetId, document: Document, options: AssetOptions = {}) {
    this.id = id;
    this.history = new History(document, options.historyOptions);
  }

  get document(): Document {
    return this.history.document;
  }
}

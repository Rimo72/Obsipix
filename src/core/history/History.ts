import type { Document } from '@core/document/Document';
import { EditorError } from '@core/errors/EditorError';
import type { FrameId, LayerId } from '@core/types/ids';

import type { Command, CommandContext, CommandResult } from './Command';

export interface HistoryOptions {
  /** Maximum number of undo steps kept; older steps become permanent. Default 100. */
  readonly limit?: number;
}

/** The context handed to a {@link History.transaction} body. */
export interface Transaction {
  readonly document: Document;
  execute(command: Command): CommandResult;
}

/**
 * An open interactive edit (a brush stroke). The caller mutates `document`
 * directly for live feedback, then {@link StrokeHandle.commit}s it as a single
 * history entry or {@link StrokeHandle.cancel}s it with no trace
 * (PROJECT_CORE §10 "continuous stroke = one history entry").
 */
export interface StrokeHandle {
  readonly document: Document;
  commit(): void;
  cancel(): void;
}

const DEFAULT_LIMIT = 100;

interface Snapshot {
  readonly document: Document;
  readonly label: string;
}

/**
 * The committed-change ledger and the owner of the authoritative current
 * {@link Document} (PROJECT_CORE §10).
 *
 * Every persistent mutation runs through {@link History.execute} or
 * {@link History.transaction}, each producing exactly one undoable entry.
 * Reversal is by full state snapshot, so correctness never depends on a
 * command computing its own inverse (PROJECT_CORE §16 permits snapshots).
 * A failed change is rolled back and never committed.
 */
export class History {
  #document: Document;
  readonly #undo: Snapshot[] = [];
  readonly #redo: Snapshot[] = [];
  readonly #limit: number;
  #transactionDepth = 0;
  #strokeOpen = false;

  constructor(document: Document, options: HistoryOptions = {}) {
    this.#document = document;
    this.#limit = Math.max(1, options.limit ?? DEFAULT_LIMIT);
  }

  get document(): Document {
    return this.#document;
  }

  get canUndo(): boolean {
    return this.#undo.length > 0;
  }

  get canRedo(): boolean {
    return this.#redo.length > 0;
  }

  get undoLabel(): string | null {
    return this.#undo.at(-1)?.label ?? null;
  }

  get redoLabel(): string | null {
    return this.#redo.at(-1)?.label ?? null;
  }

  /** Number of undo steps currently available. */
  get depth(): number {
    return this.#undo.length;
  }

  /** True while an interactive stroke is open (see {@link History.begin}). */
  get isStrokeOpen(): boolean {
    return this.#strokeOpen;
  }

  #context(): CommandContext {
    return { document: this.#document };
  }

  #assertIdle(action: string): void {
    if (this.#strokeOpen) {
      throw new EditorError('history/stroke-open', `Cannot ${action} while a stroke is open`);
    }
    if (this.#transactionDepth > 0) {
      throw new EditorError('history/in-transaction', `Cannot ${action} inside a transaction`);
    }
  }

  #commit(previous: Document, label: string): void {
    this.#undo.push({ document: previous, label });
    while (this.#undo.length > this.#limit) {
      this.#undo.shift();
    }
    this.#redo.length = 0;
    this.#document.advanceRevision();
  }

  /** Execute one command as a single history entry. Rolls back if it throws. */
  execute(command: Command): CommandResult {
    this.#assertIdle('execute a command');
    const snapshot = this.#document.clone();
    let result: CommandResult;
    try {
      result = command.execute(this.#context());
    } catch (error) {
      this.#document = snapshot;
      throw error;
    }
    this.#commit(snapshot, command.label);
    return result;
  }

  /**
   * Run several mutations as one atomic history entry. If `run` throws, every
   * change it made is discarded and the error propagates (PROJECT_CORE §10).
   */
  transaction(label: string, run: (transaction: Transaction) => void): CommandResult {
    this.#assertIdle('start a transaction');
    const snapshot = this.#document.clone();
    const affectedLayerIds = new Set<LayerId>();
    const affectedFrameIds = new Set<FrameId>();

    const transaction: Transaction = {
      document: this.#document,
      execute: (command) => {
        const outcome = command.execute(this.#context());
        for (const id of outcome.affectedLayerIds ?? []) {
          affectedLayerIds.add(id);
        }
        for (const id of outcome.affectedFrameIds ?? []) {
          affectedFrameIds.add(id);
        }
        return outcome;
      },
    };

    this.#transactionDepth += 1;
    try {
      run(transaction);
    } catch (error) {
      this.#document = snapshot;
      this.#transactionDepth -= 1;
      throw error;
    }
    this.#transactionDepth -= 1;

    this.#commit(snapshot, label);
    return {
      affectedLayerIds: [...affectedLayerIds],
      affectedFrameIds: [...affectedFrameIds],
    };
  }

  /**
   * Open an interactive stroke. The caller mutates the returned handle's
   * `document` directly (it is the live document) and finishes with
   * `commit()` — one history entry — or `cancel()` — nothing recorded.
   */
  begin(label: string): StrokeHandle {
    this.#assertIdle('begin a stroke');
    const snapshot = this.#document.clone();
    this.#strokeOpen = true;
    let settled = false;
    const settle = (): boolean => {
      if (settled || !this.#strokeOpen) {
        return false;
      }
      settled = true;
      this.#strokeOpen = false;
      return true;
    };
    return {
      document: this.#document,
      commit: () => {
        if (settle()) {
          this.#commit(snapshot, label);
        }
      },
      cancel: () => {
        if (settle()) {
          this.#document = snapshot;
        }
      },
    };
  }

  /** Step back one entry. Returns `false` at the start of history or during a stroke. */
  undo(): boolean {
    if (this.#strokeOpen) {
      return false;
    }
    const entry = this.#undo.pop();
    if (!entry) {
      return false;
    }
    this.#redo.push({ document: this.#document, label: entry.label });
    this.#document = entry.document;
    return true;
  }

  /** Step forward one entry. Returns `false` when there is nothing to redo or during a stroke. */
  redo(): boolean {
    if (this.#strokeOpen) {
      return false;
    }
    const entry = this.#redo.pop();
    if (!entry) {
      return false;
    }
    this.#undo.push({ document: this.#document, label: entry.label });
    this.#document = entry.document;
    return true;
  }

  /** Drop all undo/redo history, keeping the current document. */
  clear(): void {
    this.#undo.length = 0;
    this.#redo.length = 0;
  }
}

/**
 * Browser-local recovery storage (PROJECT_CORE §13.1). This is deliberately
 * separate from the user's `.obsipix` file: autosave writes here and here only,
 * so it can never silently overwrite the project (§3.13).
 *
 * Everything degrades quietly — a browser with no / broken IndexedDB simply has
 * no recovery protection rather than a crash.
 */

/** One autosaved snapshot: the serialized `.obsipix` bytes plus context. */
export interface RecoverySnapshot {
  /** Serialized `.obsipix` document bytes. */
  readonly bytes: Uint8Array;
  /** The file name the project was last associated with, if any. */
  readonly fileName: string | null;
  /** `Date.now()` when the snapshot was written. */
  readonly savedAt: number;
}

export interface RecoveryStore {
  /** Persist (replacing any previous snapshot). Resolves even on failure. */
  save(snapshot: RecoverySnapshot): Promise<void>;
  /** The stored snapshot, or `null` if there is none / it could not be read. */
  load(): Promise<RecoverySnapshot | null>;
  /** Remove the stored snapshot. Resolves even on failure. */
  clear(): Promise<void>;
}

const DB_NAME = 'obsipix';
const STORE_NAME = 'recovery';
const KEY = 'current';

/** In-memory store — the fallback when IndexedDB is unavailable, and used by tests. */
export class MemoryRecoveryStore implements RecoveryStore {
  #snapshot: RecoverySnapshot | null = null;

  save(snapshot: RecoverySnapshot): Promise<void> {
    this.#snapshot = {
      bytes: snapshot.bytes.slice(),
      fileName: snapshot.fileName,
      savedAt: snapshot.savedAt,
    };
    return Promise.resolve();
  }

  load(): Promise<RecoverySnapshot | null> {
    return Promise.resolve(this.#snapshot);
  }

  clear(): Promise<void> {
    this.#snapshot = null;
    return Promise.resolve();
  }
}

function openDb(indexedDb: IDBFactory): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDb.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE_NAME)) {
        request.result.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => {
      resolve(request.result);
    };
    request.onerror = () => {
      reject(request.error ?? new Error('IndexedDB open failed'));
    };
    request.onblocked = () => {
      reject(new Error('IndexedDB open blocked'));
    };
  });
}

function runRequest<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => {
      resolve(request.result);
    };
    request.onerror = () => {
      reject(request.error ?? new Error('IndexedDB request failed'));
    };
  });
}

/** IndexedDB-backed store. Every operation swallows failure per {@link RecoveryStore}. */
export class IndexedDbRecoveryStore implements RecoveryStore {
  readonly #indexedDb: IDBFactory;

  constructor(indexedDb: IDBFactory) {
    this.#indexedDb = indexedDb;
  }

  async save(snapshot: RecoverySnapshot): Promise<void> {
    try {
      const db = await openDb(this.#indexedDb);
      try {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const record: RecoverySnapshot = {
          bytes: snapshot.bytes.slice(),
          fileName: snapshot.fileName,
          savedAt: snapshot.savedAt,
        };
        await runRequest(tx.objectStore(STORE_NAME).put(record, KEY));
      } finally {
        db.close();
      }
    } catch {
      // recovery is best-effort
    }
  }

  async load(): Promise<RecoverySnapshot | null> {
    try {
      const db = await openDb(this.#indexedDb);
      try {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const request: IDBRequest<unknown> = tx.objectStore(STORE_NAME).get(KEY);
        return normalizeSnapshot(await runRequest(request));
      } finally {
        db.close();
      }
    } catch {
      return null;
    }
  }

  async clear(): Promise<void> {
    try {
      const db = await openDb(this.#indexedDb);
      try {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        await runRequest(tx.objectStore(STORE_NAME).delete(KEY));
      } finally {
        db.close();
      }
    } catch {
      // best-effort
    }
  }
}

/** Reject anything that is not a well-formed snapshot (corrupt recovery data). */
function normalizeSnapshot(raw: unknown): RecoverySnapshot | null {
  if (typeof raw !== 'object' || raw === null) {
    return null;
  }
  const record = raw as Record<string, unknown>;
  const bytes = record.bytes;
  const buffer =
    bytes instanceof Uint8Array
      ? bytes
      : bytes instanceof ArrayBuffer
        ? new Uint8Array(bytes)
        : null;
  if (!buffer || buffer.length === 0) {
    return null;
  }
  return {
    bytes: buffer,
    fileName: typeof record.fileName === 'string' ? record.fileName : null,
    savedAt: typeof record.savedAt === 'number' ? record.savedAt : Date.now(),
  };
}

/** The best recovery store this environment supports. */
export function createRecoveryStore(): RecoveryStore {
  const indexedDb = (globalThis as { indexedDB?: IDBFactory }).indexedDB;
  return indexedDb ? new IndexedDbRecoveryStore(indexedDb) : new MemoryRecoveryStore();
}

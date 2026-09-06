import type { RecoveryStore } from '@infrastructure/recovery/RecoveryStore';

import type { EditorSession } from './EditorSession';

export interface AutosaveOptions {
  /** How often to check for unsaved work. PROJECT_CORE §3.13 says ~30s. */
  readonly intervalMs?: number;
  /** Clock, injectable for tests. */
  readonly now?: () => number;
}

const DEFAULT_INTERVAL_MS = 30_000;

/**
 * Periodically writes the current document to the {@link RecoveryStore} while it
 * is dirty (PROJECT_CORE §3.13). It only ever touches recovery storage — never
 * the user's `.obsipix` file — so it can never silently overwrite the project.
 */
export class AutosaveController {
  readonly #session: EditorSession;
  readonly #store: RecoveryStore;
  readonly #intervalMs: number;
  readonly #now: () => number;
  #timer: ReturnType<typeof setInterval> | null = null;
  #writing = false;

  constructor(session: EditorSession, store: RecoveryStore, options: AutosaveOptions = {}) {
    this.#session = session;
    this.#store = store;
    this.#intervalMs = options.intervalMs ?? DEFAULT_INTERVAL_MS;
    this.#now = options.now ?? Date.now;
  }

  /** Begin the autosave interval. Idempotent. */
  start(): void {
    this.#timer ??= setInterval(() => {
      void this.tick();
    }, this.#intervalMs);
  }

  /** Stop the autosave interval. */
  stop(): void {
    if (this.#timer !== null) {
      clearInterval(this.#timer);
      this.#timer = null;
    }
  }

  /** Write a snapshot now if there is dirty, non-interactive work. */
  async tick(): Promise<void> {
    if (this.#writing || !this.#session.isDirty || this.#session.isInteracting) {
      return;
    }
    this.#writing = true;
    try {
      await this.#store.save({
        bytes: this.#session.peekBytes(),
        fileName: this.#session.fileName,
        savedAt: this.#now(),
      });
    } catch {
      // autosave is best-effort
    } finally {
      this.#writing = false;
    }
  }

  /**
   * Discard the recovery snapshot — call after a successful Save, New, Open or
   * a resolved recovery prompt (PROJECT_CORE §3.13 "remove obsolete recovery
   * data after successful resolution").
   */
  async resolve(): Promise<void> {
    await this.#store.clear();
  }
}

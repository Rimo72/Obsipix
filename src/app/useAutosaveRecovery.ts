import { useCallback, useEffect, useMemo, useState } from 'react';

import { OBSIPIX_MAGIC } from '@core/persistence/format';
import {
  createRecoveryStore,
  type RecoverySnapshot,
  type RecoveryStore,
} from '@infrastructure/recovery/RecoveryStore';

import { AutosaveController, type AutosaveOptions } from './AutosaveController';
import type { EditorSession } from './EditorSession';

function looksLikeObsipix(bytes: Uint8Array): boolean {
  if (bytes.length < OBSIPIX_MAGIC.length) {
    return false;
  }
  return OBSIPIX_MAGIC.every((byte, index) => bytes[index] === byte);
}

export interface AutosaveRecoveryOptions {
  readonly store?: RecoveryStore;
  readonly autosave?: AutosaveOptions;
}

export interface AutosaveRecovery {
  /** A recoverable snapshot awaiting the user's decision, or `null`. */
  readonly recovery: RecoverySnapshot | null;
  /** Load the snapshot into the session (stays dirty) and clear recovery data. */
  readonly recover: () => string | null;
  /** Throw the snapshot away. */
  readonly discardRecovery: () => void;
  /** Clear recovery data after a real Save / New / Open / import. */
  readonly resolveAutosave: () => void;
}

/**
 * Wire autosave (~30s → {@link RecoveryStore}) and startup recovery detection to
 * an {@link EditorSession} (PROJECT_CORE §3.13). Autosave only starts once the
 * initial recovery check has run, so it can never clobber recoverable work.
 */
export function useAutosaveRecovery(
  session: EditorSession,
  options: AutosaveRecoveryOptions = {},
): AutosaveRecovery {
  const store = useMemo(() => options.store ?? createRecoveryStore(), [options.store]);
  const autosave = useMemo(
    () => new AutosaveController(session, store, options.autosave),
    [session, store, options.autosave],
  );

  const [recovery, setRecovery] = useState<RecoverySnapshot | null>(null);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void store.load().then((snapshot) => {
      if (cancelled) {
        return;
      }
      if (snapshot && looksLikeObsipix(snapshot.bytes)) {
        setRecovery(snapshot);
      } else if (snapshot) {
        void store.clear(); // corrupt recovery data — drop it
      }
      setChecked(true);
    });
    return () => {
      cancelled = true;
    };
  }, [store]);

  useEffect(() => {
    if (!checked) {
      return;
    }
    autosave.start();
    return () => {
      autosave.stop();
    };
  }, [autosave, checked]);

  useEffect(() => {
    if (!import.meta.env.DEV) {
      return;
    }
    // e2e seam: force an autosave write without waiting for the interval.
    (globalThis as { __obsipixAutosave?: { tick: () => Promise<void> } }).__obsipixAutosave = {
      tick: () => autosave.tick(),
    };
  }, [autosave]);

  const recover = useCallback((): string | null => {
    const snapshot = recovery;
    if (!snapshot) {
      return null;
    }
    setRecovery(null);
    void autosave.resolve();
    try {
      session.recover(snapshot.bytes, snapshot.fileName);
      return null;
    } catch {
      return 'The recovered data was unreadable and has been discarded.';
    }
  }, [recovery, session, autosave]);

  const discardRecovery = useCallback(() => {
    setRecovery(null);
    void autosave.resolve();
  }, [autosave]);

  const resolveAutosave = useCallback(() => {
    void autosave.resolve();
  }, [autosave]);

  return { recovery, recover, discardRecovery, resolveAutosave };
}

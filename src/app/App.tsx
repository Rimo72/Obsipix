import { useEffect, useState } from 'react';

import { AppShell } from './components/AppShell';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ToastProvider } from './components/Toasts';
import { EditorSession } from './EditorSession';
import type { AutosaveRecoveryOptions } from './useAutosaveRecovery';

/**
 * A brisk autosave in dev keeps the recovery flow easy to exercise; production
 * keeps the ~30s default (PROJECT_CORE §3.13). Module-constant so its identity
 * is stable across renders.
 */
const AUTOSAVE_OPTIONS: AutosaveRecoveryOptions = import.meta.env.DEV
  ? { autosave: { intervalMs: 2000 } }
  : {};

/**
 * Root application component. It owns the single {@link EditorSession}; React
 * below this point is presentation only (PROJECT_CORE §4, Rule 3).
 */
export function App() {
  const [session] = useState(() => new EditorSession());

  useEffect(() => {
    if (import.meta.env.DEV) {
      (globalThis as { __obsipix?: EditorSession }).__obsipix = session;
    }
  }, [session]);

  return (
    <ErrorBoundary>
      <ToastProvider>
        <AppShell session={session} autosaveRecovery={AUTOSAVE_OPTIONS} />
      </ToastProvider>
    </ErrorBoundary>
  );
}

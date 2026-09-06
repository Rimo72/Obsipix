import { useEffect, useState } from 'react';

import { AppShell } from './components/AppShell';
import { EditorSession } from './EditorSession';

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

  return <AppShell session={session} />;
}

import { useCallback, useSyncExternalStore } from 'react';

import type { EditorSession } from './EditorSession';

/**
 * Re-render the calling component whenever the session changes. Returns the
 * session's monotonic version number (rarely needed directly).
 */
export function useEditorSessionVersion(session: EditorSession): number {
  const subscribe = useCallback((onChange: () => void) => session.subscribe(onChange), [session]);
  const getSnapshot = useCallback(() => session.getVersion(), [session]);
  return useSyncExternalStore(subscribe, getSnapshot);
}

/**
 * Subscribe only to the high-frequency pointer read-out (PROJECT_CORE §16 —
 * hover must not drive a full application re-render).
 */
export function useEditorCursor(
  session: EditorSession,
): { readonly x: number; readonly y: number } | null {
  const subscribe = useCallback(
    (onChange: () => void) => session.subscribeCursor(onChange),
    [session],
  );
  useSyncExternalStore(subscribe, () => session.getCursorVersion());
  return session.cursor;
}

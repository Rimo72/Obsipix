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

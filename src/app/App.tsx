import { AppShell } from './components/AppShell';

/**
 * Root application component.
 *
 * Phase 0: renders the static editor shell only. It holds no document state and
 * performs no mutations — the Document Model, Commands and Renderer arrive in
 * later phases. React remains presentation only (PROJECT_CORE §4, Rule 3).
 */
export function App() {
  return <AppShell />;
}

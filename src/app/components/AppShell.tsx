import { CanvasStage } from './CanvasStage';
import './AppShell.css';

const TOOLS = ['Pencil', 'Eraser'] as const;
const ACTIONS = ['Undo', 'Redo', 'Save'] as const;

/**
 * The editor shell: header, toolbar, canvas stage and status bar.
 *
 * The toolbar controls are inert until the input system and command pipeline
 * are wired in (Coding Phase 5). The canvas already renders the document.
 */
export function AppShell() {
  return (
    <div className="app-shell">
      <header className="app-shell__header">
        <span className="app-shell__brand">Obsipix</span>
      </header>

      <div className="app-shell__toolbar" role="toolbar" aria-label="Editor tools">
        <div className="app-shell__tool-group" aria-label="Tools">
          {TOOLS.map((tool) => (
            <button key={tool} type="button" className="app-shell__button" disabled>
              {tool}
            </button>
          ))}
        </div>
        <div className="app-shell__tool-group" aria-label="Actions">
          {ACTIONS.map((action) => (
            <button key={action} type="button" className="app-shell__button" disabled>
              {action}
            </button>
          ))}
        </div>
      </div>

      <main className="app-shell__stage" aria-label="Canvas">
        <CanvasStage />
      </main>

      <footer className="app-shell__statusbar">
        <span data-testid="status-dimensions">32 &times; 32</span>
        <span data-testid="status-zoom">100%</span>
      </footer>
    </div>
  );
}

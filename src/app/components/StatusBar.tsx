import type { EditorSession } from '../EditorSession';
import './StatusBar.css';

interface StatusBarProps {
  readonly session: EditorSession;
}

/** The bottom status bar: document facts on the left, view controls on the right. */
export function StatusBar({ session }: StatusBarProps) {
  const { width, height } = session.document.dimensions;
  const zoomPercent = Math.round(session.viewport.zoom * 100);
  const cursor = session.cursor;
  const selectionBounds = session.document.selection.active
    ? session.document.selection.bounds()
    : null;
  const timeline = session.document.timeline;
  const frameNumber = timeline.indexOf(timeline.activeFrameId) + 1;

  return (
    <footer className="status-bar">
      <span data-testid="status-dimensions">
        {width} &times; {height}
      </span>
      <span data-testid="status-cursor" className="status-bar__mono">
        {cursor ? `${String(cursor.x)}, ${String(cursor.y)}` : '–, –'}
      </span>
      {selectionBounds && (
        <span data-testid="status-selection" className="status-bar__mono">
          sel {selectionBounds.width} &times; {selectionBounds.height}
        </span>
      )}
      <span data-testid="status-frame">
        frame {frameNumber}/{timeline.frameCount}
      </span>
      <span data-testid="status-tool">{session.activeToolId}</span>
      <span data-testid="status-dirty">{session.isDirty ? 'unsaved' : 'saved'}</span>

      <div className="status-bar__spacer" />

      <span data-testid="status-zoom">{zoomPercent}%</span>
      <button
        type="button"
        className={
          session.showGrid ? 'status-bar__toggle status-bar__toggle--on' : 'status-bar__toggle'
        }
        aria-pressed={session.showGrid}
        onClick={() => {
          session.toggleGrid();
        }}
      >
        Grid
      </button>
      <button
        type="button"
        className={
          session.showCheckerboard
            ? 'status-bar__toggle status-bar__toggle--on'
            : 'status-bar__toggle'
        }
        aria-pressed={session.showCheckerboard}
        onClick={() => {
          session.toggleCheckerboard();
        }}
      >
        Checker
      </button>
      <button
        type="button"
        className="status-bar__toggle"
        aria-label="Zoom out"
        onClick={() => {
          session.zoomOut();
        }}
      >
        &minus;
      </button>
      <button
        type="button"
        className="status-bar__toggle"
        aria-label="Zoom in"
        onClick={() => {
          session.zoomIn();
        }}
      >
        +
      </button>
      <button
        type="button"
        className="status-bar__toggle"
        onClick={() => {
          session.fitView();
        }}
      >
        Fit
      </button>
    </footer>
  );
}

import { useEffect, useState } from 'react';

import type { EditorSession } from '../EditorSession';
import { exportProjectPng, newProject, openProject, saveProject } from '../fileCommands';
import { useEditorSessionVersion } from '../useEditorSession';
import { TOOL_SHORTCUTS } from '../toolCatalog';
import { BrushControls } from './BrushControls';
import { CanvasStage } from './CanvasStage';
import { ColorControls } from './ColorControls';
import { LayerPanel } from './LayerPanel';
import { PalettePanel } from './PalettePanel';
import { SelectionControls } from './SelectionControls';
import { ToolRail } from './ToolRail';
import './AppShell.css';

interface AppShellProps {
  readonly session: EditorSession;
}

/** The editor shell: header, tool rail, canvas stage, layer panel and status bar. */
export function AppShell({ session }: AppShellProps) {
  useEditorSessionVersion(session);
  const [error, setError] = useState<string | null>(null);

  const confirmDiscard = (): boolean =>
    !session.isDirty || window.confirm('Discard unsaved changes?');

  const handleOpen = (): void => {
    if (!confirmDiscard()) {
      return;
    }
    void openProject(session).then(setError);
  };

  const handleNew = (): void => {
    if (confirmDiscard()) {
      newProject(session);
      setError(null);
    }
  };

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
        return;
      }
      const mod = event.ctrlKey || event.metaKey;
      const key = event.key.toLowerCase();
      const arrows: Record<string, [number, number]> = {
        arrowleft: [-1, 0],
        arrowright: [1, 0],
        arrowup: [0, -1],
        arrowdown: [0, 1],
      };
      if (mod && key === 'z') {
        event.preventDefault();
        if (event.shiftKey) {
          session.redo();
        } else {
          session.undo();
        }
      } else if (mod && key === 'y') {
        event.preventDefault();
        session.redo();
      } else if (mod && key === 's') {
        event.preventDefault();
        saveProject(session);
      } else if (mod && key === 'o') {
        event.preventDefault();
        handleOpen();
      } else if (mod && key === 'a') {
        event.preventDefault();
        session.selectAll();
      } else if (mod && key === 'd') {
        event.preventDefault();
        session.deselect();
      } else if (mod && key === 'c') {
        session.copy();
      } else if (mod && key === 'x') {
        event.preventDefault();
        session.cut();
      } else if (mod && key === 'v') {
        session.paste();
      } else if (!mod && key === 'x') {
        session.swapColors();
      } else if (!mod && (key === 'delete' || key === 'backspace')) {
        event.preventDefault();
        session.deleteSelection();
      } else if (!mod && key === 'enter') {
        session.commitFloat();
      } else if (!mod && key === 'escape') {
        session.cancelFloat();
      } else if (!mod && key in arrows) {
        event.preventDefault();
        const [dx, dy] = arrows[key] ?? [0, 0];
        session.nudge(dx, dy);
      } else if (!mod && !event.shiftKey && !event.altKey && key in TOOL_SHORTCUTS) {
        session.setTool(TOOL_SHORTCUTS[key] as string);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  useEffect(() => {
    const onBeforeUnload = (event: BeforeUnloadEvent): void => {
      if (session.isDirty) {
        event.preventDefault();
      }
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', onBeforeUnload);
    };
  }, [session]);

  const { width, height } = session.document.dimensions;
  const zoomPercent = Math.round(session.viewport.zoom * 100);
  const title = `${session.fileName ?? session.document.metadata.name}${session.isDirty ? ' •' : ''}`;

  return (
    <div className="app-shell">
      <header className="app-shell__header">
        <span className="app-shell__brand">Obsipix</span>
        <span className="app-shell__title" data-testid="project-title">
          {title}
        </span>
        <div className="app-shell__spacer" />
        <div className="app-shell__group">
          <button type="button" className="app-shell__button" onClick={handleNew}>
            New
          </button>
          <button type="button" className="app-shell__button" onClick={handleOpen}>
            Open
          </button>
          <button
            type="button"
            className="app-shell__button"
            title="Save (Ctrl+S)"
            onClick={() => {
              saveProject(session);
            }}
          >
            Save
          </button>
          <button
            type="button"
            className="app-shell__button"
            onClick={() => {
              exportProjectPng(session);
            }}
          >
            Export PNG
          </button>
        </div>
        <div className="app-shell__group">
          <button
            type="button"
            className="app-shell__button"
            disabled={!session.canUndo}
            title="Undo (Ctrl+Z)"
            onClick={() => {
              session.undo();
            }}
          >
            Undo
          </button>
          <button
            type="button"
            className="app-shell__button"
            disabled={!session.canRedo}
            title="Redo (Ctrl+Shift+Z)"
            onClick={() => {
              session.redo();
            }}
          >
            Redo
          </button>
        </div>
      </header>

      <div className="app-shell__options">
        <BrushControls session={session} />
        <ColorControls session={session} />
        <SelectionControls session={session} />
      </div>

      <div className="app-shell__body">
        <ToolRail session={session} />
        <main className="app-shell__stage" aria-label="Canvas">
          <CanvasStage session={session} />
        </main>
        <div className="app-shell__sidebar">
          <LayerPanel session={session} />
          <PalettePanel session={session} />
        </div>
      </div>

      {error !== null && (
        <div className="app-shell__error" role="alert" data-testid="file-error">
          {error}
          <button
            type="button"
            className="app-shell__button"
            onClick={() => {
              setError(null);
            }}
          >
            Dismiss
          </button>
        </div>
      )}

      <footer className="app-shell__statusbar">
        <span data-testid="status-dimensions">
          {width} &times; {height}
        </span>
        <span data-testid="status-zoom">{zoomPercent}%</span>
        <span data-testid="status-tool">{session.activeToolId}</span>
        <span data-testid="status-dirty">{session.isDirty ? 'unsaved' : 'saved'}</span>
        <div className="app-shell__spacer" />
        <button
          type="button"
          className={
            session.showGrid ? 'app-shell__toggle app-shell__toggle--on' : 'app-shell__toggle'
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
              ? 'app-shell__toggle app-shell__toggle--on'
              : 'app-shell__toggle'
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
          className="app-shell__toggle"
          aria-label="Zoom out"
          onClick={() => {
            session.zoomOut();
          }}
        >
          &minus;
        </button>
        <button
          type="button"
          className="app-shell__toggle"
          aria-label="Zoom in"
          onClick={() => {
            session.zoomIn();
          }}
        >
          +
        </button>
        <button
          type="button"
          className="app-shell__toggle"
          onClick={() => {
            session.fitView();
          }}
        >
          Fit
        </button>
      </footer>
    </div>
  );
}

import { useEffect, useState } from 'react';

import { ERASER_TOOL_ID } from '@core/tools/EraserTool';
import { PENCIL_TOOL_ID } from '@core/tools/PencilTool';

import type { EditorSession } from '../EditorSession';
import { exportProjectPng, newProject, openProject, saveProject } from '../fileCommands';
import { useEditorSessionVersion } from '../useEditorSession';
import { CanvasStage } from './CanvasStage';
import './AppShell.css';

const TOOLS: readonly { readonly id: string; readonly label: string; readonly key: string }[] = [
  { id: PENCIL_TOOL_ID, label: 'Pencil', key: 'B' },
  { id: ERASER_TOOL_ID, label: 'Eraser', key: 'E' },
];

interface AppShellProps {
  readonly session: EditorSession;
}

/** The editor shell: header, toolbar, canvas stage and status bar. */
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
      } else if (!mod && key === 'b') {
        session.setTool(PENCIL_TOOL_ID);
      } else if (!mod && key === 'e') {
        session.setTool(ERASER_TOOL_ID);
      } else if (!mod && key === 'x') {
        session.swapColors();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
    };
    // handleOpen closes over `session` only; safe for the lifetime of the shell
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
      </header>

      <div className="app-shell__toolbar" role="toolbar" aria-label="Editor tools">
        <div className="app-shell__tool-group" aria-label="Project">
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

        <div className="app-shell__tool-group" aria-label="Tools">
          {TOOLS.map((tool) => {
            const active = session.activeToolId === tool.id;
            return (
              <button
                key={tool.id}
                type="button"
                className={
                  active ? 'app-shell__button app-shell__button--active' : 'app-shell__button'
                }
                aria-pressed={active}
                title={`${tool.label} (${tool.key})`}
                onClick={() => {
                  session.setTool(tool.id);
                }}
              >
                {tool.label}
              </button>
            );
          })}
        </div>

        <div className="app-shell__tool-group" aria-label="History">
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
      </div>

      <main className="app-shell__stage" aria-label="Canvas">
        <CanvasStage session={session} />
      </main>

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
      </footer>
    </div>
  );
}

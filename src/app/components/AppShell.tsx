import { useEffect, useRef, useState } from 'react';

import type { EditorSession } from '../EditorSession';
import {
  closeProject,
  exportProjectPng,
  importPng,
  newProject,
  openProject,
  saveProject,
  saveProjectAs,
} from '../fileCommands';
import { decodePng } from '../pngDecode';
import { resolveShortcut, type ShortcutCommand } from '../shortcuts';
import { useAutosaveRecovery, type AutosaveRecoveryOptions } from '../useAutosaveRecovery';
import { useEditorSessionVersion } from '../useEditorSession';
import { BrushControls } from './BrushControls';
import { CanvasStage } from './CanvasStage';
import { ColorControls } from './ColorControls';
import { KeyboardHelp } from './KeyboardHelp';
import { LayerPanel } from './LayerPanel';
import { PalettePanel } from './PalettePanel';
import { RecoveryPrompt } from './RecoveryPrompt';
import { SelectionControls } from './SelectionControls';
import { TimelinePanel } from './TimelinePanel';
import { ToolRail } from './ToolRail';
import './AppShell.css';

interface AppShellProps {
  readonly session: EditorSession;
  /** Test seam for autosave / recovery wiring. */
  readonly autosaveRecovery?: AutosaveRecoveryOptions;
}

function isTextTarget(target: EventTarget | null): boolean {
  return (
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    target instanceof HTMLSelectElement ||
    (target instanceof HTMLElement && target.isContentEditable)
  );
}

/** The editor shell: header, tool rail, canvas stage, side panels, timeline and status bar. */
export function AppShell({ session, autosaveRecovery }: AppShellProps) {
  useEditorSessionVersion(session);
  const [error, setError] = useState<string | null>(null);
  const [helpOpen, setHelpOpen] = useState(false);

  const { recovery, recover, discardRecovery, resolveAutosave } = useAutosaveRecovery(
    session,
    autosaveRecovery ?? {},
  );

  // Keep the shortcut handler stable while reading fresh values each keydown.
  const handlers = useRef({ recover, discardRecovery, resolveAutosave, setError, setHelpOpen });
  handlers.current = { recover, discardRecovery, resolveAutosave, setError, setHelpOpen };

  const confirmDiscard = (): boolean =>
    !session.isDirty || window.confirm('Discard unsaved changes?');

  const runSave = (): void => {
    setError(saveProject(session));
    resolveAutosave();
  };

  const runSaveAs = (): void => {
    setError(saveProjectAs(session));
    resolveAutosave();
  };

  const handleOpen = (): void => {
    if (!confirmDiscard()) {
      return;
    }
    void openProject(session).then((message) => {
      setError(message);
      if (message === null) {
        resolveAutosave();
      }
    });
  };

  const handleNew = (): void => {
    if (confirmDiscard()) {
      newProject(session);
      resolveAutosave();
      setError(null);
    }
  };

  const handleClose = (): void => {
    if (confirmDiscard()) {
      closeProject(session);
      resolveAutosave();
      setError(null);
    }
  };

  const handleImport = (mode: 'document' | 'layer'): void => {
    if (mode === 'document' && !confirmDiscard()) {
      return;
    }
    void importPng(session, mode).then((message) => {
      setError(message);
      if (message === null && mode === 'document') {
        resolveAutosave();
      }
    });
  };

  useEffect(() => {
    const dispatch: Record<ShortcutCommand, () => void> = {
      undo: () => session.undo(),
      redo: () => session.redo(),
      save: () => {
        setError(saveProject(session));
        handlers.current.resolveAutosave();
      },
      'save-as': () => {
        setError(saveProjectAs(session));
        handlers.current.resolveAutosave();
      },
      open: () => {
        if (!session.isDirty || window.confirm('Discard unsaved changes?')) {
          void openProject(session).then((message) => {
            setError(message);
            if (message === null) {
              handlers.current.resolveAutosave();
            }
          });
        }
      },
      new: () => {
        if (!session.isDirty || window.confirm('Discard unsaved changes?')) {
          newProject(session);
          handlers.current.resolveAutosave();
          setError(null);
        }
      },
      'select-all': () => session.selectAll(),
      deselect: () => session.deselect(),
      copy: () => session.copy(),
      cut: () => session.cut(),
      paste: () => session.paste(),
      delete: () => session.deleteSelection(),
      'swap-colors': () => session.swapColors(),
      'commit-float': () => session.commitFloat(),
      'cancel-float': () => session.cancelFloat(),
      'nudge-left': () => session.nudge(-1, 0),
      'nudge-right': () => session.nudge(1, 0),
      'nudge-up': () => session.nudge(0, -1),
      'nudge-down': () => session.nudge(0, 1),
      'toggle-play': () => session.togglePlay(),
      'prev-frame': () => session.prevFrame(),
      'next-frame': () => session.nextFrame(),
      'first-frame': () => session.firstFrame(),
      'last-frame': () => session.lastFrame(),
      'zoom-in': () => session.zoomIn(),
      'zoom-out': () => session.zoomOut(),
      fit: () => session.fitView(),
      help: () => {
        handlers.current.setHelpOpen(true);
      },
    };

    const onKeyDown = (event: KeyboardEvent): void => {
      const resolution = resolveShortcut(event, {
        editingText: isTextTarget(event.target),
        hasFloat: session.hasFloat,
      });
      if (!resolution) {
        return;
      }
      if (resolution.preventDefault) {
        event.preventDefault();
      }
      if (resolution.kind === 'tool') {
        session.setTool(resolution.toolId);
      } else {
        dispatch[resolution.command]();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [session]);

  // System clipboard: pasting an image imports it as a layer (PROJECT_CORE §3.11).
  useEffect(() => {
    const onPaste = (event: ClipboardEvent): void => {
      if (isTextTarget(event.target)) {
        return;
      }
      const file = [...(event.clipboardData?.items ?? [])]
        .find((item) => item.kind === 'file' && item.type.startsWith('image/'))
        ?.getAsFile();
      if (!file) {
        return;
      }
      event.preventDefault();
      void (async () => {
        try {
          const image = await decodePng(new Uint8Array(await file.arrayBuffer()));
          session.importAsLayer(image, file.name.replace(/\.[a-z]+$/i, '') || 'Pasted');
        } catch {
          handlers.current.setError('The pasted image could not be imported.');
        }
      })();
    };
    window.addEventListener('paste', onPaste);
    return () => {
      window.removeEventListener('paste', onPaste);
    };
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
            onClick={runSave}
          >
            Save
          </button>
          <button
            type="button"
            className="app-shell__button"
            title="Save As (Ctrl+Shift+S)"
            onClick={runSaveAs}
          >
            Save As
          </button>
          <button
            type="button"
            className="app-shell__button"
            title="Import a PNG as a new layer"
            onClick={() => {
              handleImport('layer');
            }}
          >
            Import PNG
          </button>
          <button
            type="button"
            className="app-shell__button"
            title="Open a PNG as a new document"
            onClick={() => {
              handleImport('document');
            }}
          >
            Open PNG
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
          <button type="button" className="app-shell__button" onClick={handleClose}>
            Close
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
          <button
            type="button"
            className="app-shell__button"
            aria-label="Keyboard shortcuts"
            title="Keyboard shortcuts (?)"
            onClick={() => {
              setHelpOpen(true);
            }}
          >
            ?
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

      <TimelinePanel session={session} />

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

      {recovery && (
        <RecoveryPrompt
          snapshot={recovery}
          onRecover={() => {
            setError(recover());
          }}
          onDiscard={discardRecovery}
        />
      )}

      {helpOpen && (
        <KeyboardHelp
          onClose={() => {
            setHelpOpen(false);
          }}
        />
      )}
    </div>
  );
}

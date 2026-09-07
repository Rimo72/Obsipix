import { useEffect, useMemo, useRef, useState } from 'react';

import type { EditorSession } from '../EditorSession';
import {
  closeProject,
  exportProjectPng,
  importPng,
  openProject,
  saveProject,
  saveProjectAs,
} from '../fileCommands';
import { runExport } from '../imageExport';
import { decodePng } from '../pngDecode';
import { resolveShortcut, type ShortcutCommand } from '../shortcuts';
import { useAutosaveRecovery, type AutosaveRecoveryOptions } from '../useAutosaveRecovery';
import { useEditorSessionVersion } from '../useEditorSession';
import { BrushControls } from './BrushControls';
import { CanvasStage } from './CanvasStage';
import { ColorControls } from './ColorControls';
import { ExportDialog } from './ExportDialog';
import { EyedropperControls } from './EyedropperControls';
import { KeyboardHelp } from './KeyboardHelp';
import { LayerPanel } from './LayerPanel';
import { MenuBar, type MenuDef } from './MenuBar';
import { NewDocumentDialog } from './NewDocumentDialog';
import { PalettePanel } from './PalettePanel';
import { RecoveryPrompt } from './RecoveryPrompt';
import { ResizeDialog } from './ResizeDialog';
import { SelectionControls } from './SelectionControls';
import { StatusBar } from './StatusBar';
import { TimelinePanel } from './TimelinePanel';
import { useToasts } from './toastContext';
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

function timelineHasFocus(): boolean {
  const active = document.activeElement;
  return active instanceof HTMLElement && active.closest('.timeline-panel') !== null;
}

/** The editor shell: menu bar, options bar, tool rail, canvas, side panels, timeline, status bar. */
export function AppShell({ session, autosaveRecovery }: AppShellProps) {
  useEditorSessionVersion(session);
  const { notify } = useToasts();

  const [helpOpen, setHelpOpen] = useState(false);
  const [resizing, setResizing] = useState<'image' | 'canvas' | null>(null);
  const [newDialogOpen, setNewDialogOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);

  const { recovery, recover, discardRecovery, deferRecovery, resolveAutosave } =
    useAutosaveRecovery(session, autosaveRecovery ?? {});

  const confirmDiscard = (): boolean =>
    !session.isDirty || window.confirm('Discard unsaved changes?');

  const runSave = (): void => {
    const message = saveProject(session);
    if (message) {
      notify(message, 'error');
    } else {
      notify(`Saved ${session.fileName ?? ''}`.trim(), 'success');
      resolveAutosave();
    }
  };

  const runSaveAs = (): void => {
    const message = saveProjectAs(session);
    if (message) {
      notify(message, 'error');
    } else if (session.fileName) {
      notify(`Saved ${session.fileName}`, 'success');
      resolveAutosave();
    }
  };

  const handleOpen = (): void => {
    if (!confirmDiscard()) {
      return;
    }
    void openProject(session).then((message) => {
      if (message) {
        notify(message, 'error');
      } else {
        resolveAutosave();
      }
    });
  };

  const handleNew = (): void => {
    if (confirmDiscard()) {
      setNewDialogOpen(true);
    }
  };

  const handleClose = (): void => {
    if (confirmDiscard()) {
      closeProject(session);
      resolveAutosave();
    }
  };

  const handleImport = (mode: 'document' | 'layer'): void => {
    if (mode === 'document' && !confirmDiscard()) {
      return;
    }
    void importPng(session, mode).then((message) => {
      if (message) {
        notify(message, 'error');
      } else {
        notify(
          mode === 'document' ? 'Opened PNG as a new document' : 'Imported PNG as a layer',
          'success',
        );
        if (mode === 'document') {
          resolveAutosave();
        }
      }
    });
  };

  // Stable handles for the keydown listener, refreshed every render.
  const handlers = useRef({
    runSave,
    runSaveAs,
    handleOpen,
    handleNew,
    recover,
    notify,
    setHelpOpen,
  });
  handlers.current = { runSave, runSaveAs, handleOpen, handleNew, recover, notify, setHelpOpen };

  useEffect(() => {
    const dispatch: Record<ShortcutCommand, () => void> = {
      undo: () => session.undo(),
      redo: () => session.redo(),
      save: () => {
        handlers.current.runSave();
      },
      'save-as': () => {
        handlers.current.runSaveAs();
      },
      open: () => {
        handlers.current.handleOpen();
      },
      new: () => {
        handlers.current.handleNew();
      },
      'select-all': () => session.selectAll(),
      deselect: () => session.deselect(),
      'invert-selection': () => session.invertSelection(),
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
      'zoom-100': () => session.setZoomLevel(1),
      'zoom-200': () => session.setZoomLevel(2),
      fit: () => session.fitView(),
      help: () => {
        handlers.current.setHelpOpen(true);
      },
    };

    const onKeyDown = (event: KeyboardEvent): void => {
      const resolution = resolveShortcut(event, {
        editingText: isTextTarget(event.target),
        hasFloat: session.hasFloat,
        timelineFocused: timelineHasFocus(),
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
          handlers.current.notify('Pasted image as a layer', 'success');
        } catch {
          handlers.current.notify('The pasted image could not be imported.', 'error');
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

  const menus = useMemo<MenuDef[]>(
    () => [
      {
        label: 'File',
        items: [
          { label: 'New', shortcut: 'Ctrl+N', onSelect: handleNew },
          { label: 'Open…', shortcut: 'Ctrl+O', onSelect: handleOpen },
          null,
          { label: 'Save', shortcut: 'Ctrl+S', onSelect: runSave },
          { label: 'Save As…', shortcut: 'Ctrl+Shift+S', onSelect: runSaveAs },
          null,
          {
            label: 'Open PNG…',
            onSelect: () => {
              handleImport('document');
            },
          },
          {
            label: 'Import PNG as Layer…',
            onSelect: () => {
              handleImport('layer');
            },
          },
          null,
          {
            label: 'Export…',
            onSelect: () => {
              setExportOpen(true);
            },
          },
          {
            label: 'Export PNG',
            onSelect: () => {
              exportProjectPng(session);
            },
          },
          null,
          { label: 'Close', onSelect: handleClose },
        ],
      },
      {
        label: 'Edit',
        items: [
          {
            label: 'Undo',
            shortcut: 'Ctrl+Z',
            disabled: !session.canUndo,
            onSelect: () => session.undo(),
          },
          {
            label: 'Redo',
            shortcut: 'Ctrl+Shift+Z',
            disabled: !session.canRedo,
            onSelect: () => session.redo(),
          },
          null,
          { label: 'Cut', shortcut: 'Ctrl+X', onSelect: () => session.cut() },
          { label: 'Copy', shortcut: 'Ctrl+C', onSelect: () => session.copy() },
          {
            label: 'Paste',
            shortcut: 'Ctrl+V',
            disabled: !session.canPaste,
            onSelect: () => session.paste(),
          },
          {
            label: 'Delete Selection',
            shortcut: 'Del',
            disabled: !session.document.selection.active,
            onSelect: () => session.deleteSelection(),
          },
          null,
          { label: 'Select All', shortcut: 'Ctrl+A', onSelect: () => session.selectAll() },
          {
            label: 'Deselect',
            shortcut: 'Ctrl+Shift+A',
            disabled: !session.document.selection.active,
            onSelect: () => session.deselect(),
          },
          {
            label: 'Invert Selection',
            shortcut: 'Ctrl+Shift+I',
            onSelect: () => session.invertSelection(),
          },
        ],
      },
      {
        label: 'Image',
        items: [
          {
            label: 'Resize…',
            onSelect: () => {
              setResizing('image');
            },
          },
          null,
          { label: 'Flip Horizontal', onSelect: () => session.flip('horizontal') },
          { label: 'Flip Vertical', onSelect: () => session.flip('vertical') },
          { label: 'Rotate 90° CW', onSelect: () => session.rotate('cw') },
          { label: 'Rotate 90° CCW', onSelect: () => session.rotate('ccw') },
          null,
          {
            label: 'Flatten Layers',
            disabled: session.document.layers.count < 2,
            onSelect: () => session.flatten(),
          },
        ],
      },
      {
        label: 'View',
        items: [
          { label: 'Zoom In', shortcut: '+', onSelect: () => session.zoomIn() },
          { label: 'Zoom Out', shortcut: '-', onSelect: () => session.zoomOut() },
          { label: 'Zoom 100%', shortcut: '1', onSelect: () => session.setZoomLevel(1) },
          { label: 'Zoom 200%', shortcut: '2', onSelect: () => session.setZoomLevel(2) },
          { label: 'Fit to Window', shortcut: '0', onSelect: () => session.fitView() },
          null,
          {
            label: 'Grid',
            checked: session.showGrid,
            onSelect: () => session.toggleGrid(),
          },
          {
            label: 'Checkerboard',
            checked: session.showCheckerboard,
            onSelect: () => session.toggleCheckerboard(),
          },
          null,
          {
            label: 'Onion Skin',
            checked: session.onionSkin.enabled,
            onSelect: () => session.toggleOnionSkin(),
          },
        ],
      },
      {
        label: 'Help',
        items: [
          {
            label: 'Keyboard Shortcuts',
            shortcut: '?',
            onSelect: () => {
              setHelpOpen(true);
            },
          },
        ],
      },
    ],
    // handlers close over the current render; the shell re-renders on every
    // session change so the config is always fresh.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [session, session.getVersion()],
  );

  const title = `${session.fileName ?? session.document.metadata.name}${session.isDirty ? ' •' : ''}`;

  return (
    <div className="app-shell">
      <header className="app-shell__header">
        <span className="app-shell__brand">Obsipix</span>
        <MenuBar menus={menus} />
        <span className="app-shell__title" data-testid="project-title">
          {title}
        </span>
        <div className="app-shell__spacer" />
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

      <div className="app-shell__options" role="toolbar" aria-label="Tool options">
        <BrushControls session={session} />
        <ColorControls session={session} />
        <EyedropperControls session={session} />
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

      <StatusBar session={session} />

      {recovery && (
        <RecoveryPrompt
          snapshot={recovery}
          onRecover={() => {
            const message = recover();
            if (message) {
              notify(message, 'error');
            } else {
              notify('Recovered unsaved work — remember to save it', 'info');
            }
          }}
          onDiscard={discardRecovery}
          onDefer={deferRecovery}
        />
      )}

      {newDialogOpen && (
        <NewDocumentDialog
          onClose={() => {
            setNewDialogOpen(false);
          }}
          onCreate={(options) => {
            session.newDocument(options);
            resolveAutosave();
            setNewDialogOpen(false);
          }}
        />
      )}

      {exportOpen && (
        <ExportDialog
          session={session}
          onClose={() => {
            setExportOpen(false);
          }}
          onExport={(settings) => {
            setExportOpen(false);
            void runExport(session, settings).then((message) => {
              notify(message ?? `Exported ${settings.fileName}`, message ? 'error' : 'success');
            });
          }}
        />
      )}

      {resizing !== null && (
        <ResizeDialog
          mode={resizing}
          session={session}
          onClose={() => {
            setResizing(null);
          }}
          onModeChange={setResizing}
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

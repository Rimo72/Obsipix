import { useEffect, useMemo, useRef, useState } from 'react';

import type { ImageData8 } from '@core/document/importCommands';
import type { RGBA } from '@core/types/color';
import type { PaletteColorId } from '@core/types/ids';

import type { EditorSession } from '../EditorSession';
import {
  choosePng,
  closeProject,
  exportProjectPng,
  importPng,
  openProject,
  saveProject,
  saveProjectAs,
} from '../fileCommands';
import { runExport } from '../imageExport';
import { decodePng } from '../pngDecode';
import { PANEL_TITLE, SIDEBAR_PANELS, usePanelLayout, type PanelId } from '../panelLayout';
import { resolveShortcut, type ShortcutCommand } from '../shortcuts';
import { useAutosaveRecovery, type AutosaveRecoveryOptions } from '../useAutosaveRecovery';
import { useEditorSessionVersion } from '../useEditorSession';
import { AboutDialog } from './AboutDialog';
import { BrushControls } from './BrushControls';
import { CanvasStage } from './CanvasStage';
import { ColorControls } from './ColorControls';
import { ColorManagementDialog } from './ColorManagementDialog';
import { ExportDialog } from './ExportDialog';
import { EyedropperControls } from './EyedropperControls';
import { ImportPngDialog } from './ImportPngDialog';
import { KeyboardHelp } from './KeyboardHelp';
import { MenuBar, type MenuDef } from './MenuBar';
import { NewDocumentDialog } from './NewDocumentDialog';
import { Panel } from './Panel';
import { RecoveryPrompt } from './RecoveryPrompt';
import { ResizeDialog } from './ResizeDialog';
import { ResizeHandle } from './ResizeHandle';
import { RightSidebar } from './RightSidebar';
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
  const [aboutOpen, setAboutOpen] = useState(false);
  const [resizing, setResizing] = useState<'image' | 'canvas' | null>(null);
  const [newDialogOpen, setNewDialogOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [pngImport, setPngImport] = useState<{ image: ImageData8; name: string } | null>(null);
  const [colorDialog, setColorDialog] = useState<
    { kind: 'add' } | { kind: 'edit'; colorId: PaletteColorId; name: string } | null
  >(null);
  const [colorDraft, setColorDraft] = useState<RGBA>(session.foreground);
  const [sampling, setSampling] = useState(false);

  const [panelLayout, panelActions] = usePanelLayout();

  const { recovery, recover, discardRecovery, deferRecovery, resolveAutosave } =
    useAutosaveRecovery(session, autosaveRecovery ?? {});

  const closeColorDialog = (): void => {
    setColorDialog(null);
    setSampling(false);
    session.cancelColorSample();
  };

  const openAddColor = (): void => {
    setColorDraft(session.foreground);
    setColorDialog({ kind: 'add' });
  };

  const openEditColor = (colorId: PaletteColorId): void => {
    const color = session.document.activePalette?.colors.find((c) => c.id === colorId);
    if (!color) {
      return;
    }
    setColorDraft(color.rgba);
    setColorDialog({ kind: 'edit', colorId, name: color.name ?? '' });
  };

  const confirmColor = (color: RGBA, name: string): void => {
    const palette = session.document.activePalette;
    if (palette && colorDialog?.kind === 'edit') {
      session.setPaletteColor(palette.id, colorDialog.colorId, color);
      if (name !== colorDialog.name) {
        session.namePaletteColor(palette.id, colorDialog.colorId, name);
      }
    } else if (palette) {
      session.addColorToActivePalette(color, name || undefined);
    }
    closeColorDialog();
  };

  const pickColorFromCanvas = (): void => {
    setSampling(true);
    session.beginColorSample((sampled) => {
      setColorDraft(sampled);
      setSampling(false);
    });
  };

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

  const handleImportLayer = (): void => {
    void importPng(session, 'layer').then((message) => {
      notify(message ?? 'Imported PNG as a layer', message ? 'error' : 'success');
    });
  };

  /** File → Open PNG: pick + decode, then let the dialog choose single vs sprite sheet. */
  const handleOpenPng = (): void => {
    if (!confirmDiscard()) {
      return;
    }
    void choosePng().then((result) => {
      if (result.status === 'error') {
        notify(result.message, 'error');
      } else if (result.status === 'ready') {
        setPngImport({ image: result.image, name: result.name });
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
      // A modal dialog owns the keyboard while it is open (it handles its own
      // Escape); "pick from canvas" suppresses shortcuts until a pixel is picked.
      if (session.isSamplingColor || document.querySelector('.dialog__backdrop')) {
        return;
      }
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

  // Escape cancels an in-progress "pick from canvas" and restores the dialog.
  useEffect(() => {
    if (!sampling) {
      return;
    }
    const onKey = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        event.preventDefault();
        session.cancelColorSample();
        setSampling(false);
      }
    };
    window.addEventListener('keydown', onKey, true);
    return () => {
      window.removeEventListener('keydown', onKey, true);
    };
  }, [sampling, session]);

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
          { label: 'Open PNG…', onSelect: handleOpenPng },
          { label: 'Import PNG as Layer…', onSelect: handleImportLayer },
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
          null,
          ...([...SIDEBAR_PANELS, 'timeline'] as PanelId[]).map((id) => ({
            label: `Panel: ${PANEL_TITLE[id]}`,
            checked: panelLayout.panels[id].visible,
            onSelect: () => panelActions.toggleVisible(id),
          })),
          { label: 'Reset Panel Layout', onSelect: () => panelActions.reset() },
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
          null,
          {
            label: 'About Obsipix',
            onSelect: () => {
              setAboutOpen(true);
            },
          },
        ],
      },
    ],
    // handlers close over the current render; the shell re-renders on every
    // session change so the config is always fresh.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [session, session.getVersion(), panelLayout, panelActions],
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
        <div className="app-shell__main">
          <main className="app-shell__stage" aria-label="Canvas">
            <CanvasStage session={session} />
          </main>
          {panelLayout.panels.timeline.visible && (
            <>
              <ResizeHandle
                orientation="row"
                label={`Resize ${PANEL_TITLE.timeline} panel`}
                onResize={(dy) => {
                  panelActions.nudgeHeight('timeline', -dy);
                }}
              />
              <Panel
                id="timeline"
                title={PANEL_TITLE.timeline}
                collapsed={panelLayout.panels.timeline.collapsed}
                onToggleCollapse={() => {
                  panelActions.toggleCollapsed('timeline');
                }}
                onClose={() => {
                  panelActions.setVisible('timeline', false);
                }}
                className="app-shell__timeline-dock"
                style={
                  panelLayout.panels.timeline.collapsed
                    ? { flex: '0 0 auto' }
                    : { flex: `0 0 ${String(panelLayout.panels.timeline.height)}px` }
                }
              >
                <TimelinePanel session={session} />
              </Panel>
            </>
          )}
        </div>
        <RightSidebar
          session={session}
          layout={panelLayout}
          actions={panelActions}
          onAddColor={openAddColor}
          onEditColor={openEditColor}
        />
      </div>

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

      {colorDialog && !sampling && (
        <ColorManagementDialog
          value={colorDraft}
          onChange={setColorDraft}
          onClose={closeColorDialog}
          onConfirm={confirmColor}
          confirmLabel={colorDialog.kind === 'edit' ? 'Save Color' : 'Add Color'}
          showName={colorDialog.kind === 'edit'}
          initialName={colorDialog.kind === 'edit' ? colorDialog.name : ''}
          onPickFromCanvas={pickColorFromCanvas}
        />
      )}

      {sampling && (
        <div className="app-shell__sampling-hint" role="status">
          Click a pixel to sample its colour · Esc to cancel
        </div>
      )}

      {pngImport && (
        <ImportPngDialog
          image={pngImport.image}
          onClose={() => {
            setPngImport(null);
          }}
          onImportSingle={() => {
            session.importAsDocument(pngImport.image, pngImport.name);
            resolveAutosave();
            setPngImport(null);
            notify('Opened PNG as a new document', 'success');
          }}
          onImportSheet={(slice, frameCount) => {
            try {
              session.importSpriteSheet(pngImport.image, slice, pngImport.name);
              resolveAutosave();
              notify(`Split PNG into ${String(frameCount)} frames`, 'success');
            } catch (error) {
              notify(
                error instanceof Error ? error.message : 'The sprite sheet could not be split.',
                'error',
              );
            }
            setPngImport(null);
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

      {aboutOpen && (
        <AboutDialog
          onClose={() => {
            setAboutOpen(false);
          }}
        />
      )}
    </div>
  );
}

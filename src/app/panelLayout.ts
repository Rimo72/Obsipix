import { useCallback, useEffect, useMemo, useState } from 'react';

/**
 * Right-sidebar / dock panel layout (PROJECT_CORE §111). This is **application
 * UI state only** — it never touches the document, history or dirty flag
 * (§111.13). Persisted to `localStorage` as a user preference (§111.7).
 */

export type PanelId = 'color' | 'layers' | 'palette' | 'preview' | 'timeline';

/** Sidebar panels stack top-to-bottom in this order; `timeline` is the bottom dock. */
export const SIDEBAR_PANELS: readonly PanelId[] = ['color', 'layers', 'palette', 'preview'];

export const PANEL_TITLE: Record<PanelId, string> = {
  color: 'Color Management',
  layers: 'Layers',
  palette: 'Palettes',
  preview: 'Animation Preview',
  timeline: 'Animation',
};

export interface PanelState {
  readonly visible: boolean;
  readonly collapsed: boolean;
  /** Expanded body height in CSS pixels. */
  readonly height: number;
}

export interface PanelLayout {
  readonly panels: Record<PanelId, PanelState>;
  readonly sidebarWidth: number;
}

export const MIN_PANEL_HEIGHT = 80;
export const MAX_PANEL_HEIGHT = 640;
export const MIN_SIDEBAR_WIDTH = 220;
export const MAX_SIDEBAR_WIDTH = 520;

const STORAGE_KEY = 'obsipix.panelLayout.v1';

export const DEFAULT_LAYOUT: PanelLayout = {
  panels: {
    color: { visible: true, collapsed: true, height: 260 },
    layers: { visible: true, collapsed: false, height: 210 },
    palette: { visible: true, collapsed: false, height: 170 },
    preview: { visible: true, collapsed: false, height: 200 },
    timeline: { visible: true, collapsed: false, height: 264 },
  },
  sidebarWidth: 300,
};

const clampHeight = (n: number): number =>
  Math.min(MAX_PANEL_HEIGHT, Math.max(MIN_PANEL_HEIGHT, Math.round(n)));
const clampWidth = (n: number): number =>
  Math.min(MAX_SIDEBAR_WIDTH, Math.max(MIN_SIDEBAR_WIDTH, Math.round(n)));

function isPanelState(value: unknown): value is PanelState {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as PanelState).visible === 'boolean' &&
    typeof (value as PanelState).collapsed === 'boolean' &&
    typeof (value as PanelState).height === 'number'
  );
}

/** Merge a persisted layout over the defaults, dropping anything malformed. */
function reconcile(raw: unknown): PanelLayout {
  if (typeof raw !== 'object' || raw === null) {
    return DEFAULT_LAYOUT;
  }
  const stored = raw as Partial<PanelLayout>;
  const panels = {} as Record<PanelId, PanelState>;
  for (const id of Object.keys(DEFAULT_LAYOUT.panels) as PanelId[]) {
    const candidate = stored.panels?.[id];
    panels[id] = isPanelState(candidate)
      ? { ...candidate, height: clampHeight(candidate.height) }
      : DEFAULT_LAYOUT.panels[id];
  }
  return {
    panels,
    sidebarWidth:
      typeof stored.sidebarWidth === 'number'
        ? clampWidth(stored.sidebarWidth)
        : DEFAULT_LAYOUT.sidebarWidth,
  };
}

function readLayout(): PanelLayout {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? reconcile(JSON.parse(raw)) : DEFAULT_LAYOUT;
  } catch {
    return DEFAULT_LAYOUT;
  }
}

export interface PanelLayoutActions {
  toggleVisible: (id: PanelId) => void;
  setVisible: (id: PanelId, visible: boolean) => void;
  toggleCollapsed: (id: PanelId) => void;
  setHeight: (id: PanelId, height: number) => void;
  /** Change a panel's height by `delta` px, relative to its current value. */
  nudgeHeight: (id: PanelId, delta: number) => void;
  setSidebarWidth: (width: number) => void;
  /** Change the sidebar width by `delta` px, relative to its current value. */
  nudgeSidebarWidth: (delta: number) => void;
  reset: () => void;
}

/** Owns the panel layout for the whole shell; use it once, near the top. */
export function usePanelLayout(): readonly [PanelLayout, PanelLayoutActions] {
  const [layout, setLayout] = useState<PanelLayout>(readLayout);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(layout));
    } catch {
      // storage unavailable — the layout just won't persist
    }
  }, [layout]);

  const patchPanel = useCallback((id: PanelId, patch: Partial<PanelState>): void => {
    setLayout((current) => ({
      ...current,
      panels: { ...current.panels, [id]: { ...current.panels[id], ...patch } },
    }));
  }, []);

  const actions = useMemo<PanelLayoutActions>(
    () => ({
      toggleVisible: (id) => {
        setLayout((current) => ({
          ...current,
          panels: {
            ...current.panels,
            [id]: { ...current.panels[id], visible: !current.panels[id].visible },
          },
        }));
      },
      setVisible: (id, visible) => {
        patchPanel(id, { visible });
      },
      toggleCollapsed: (id) => {
        setLayout((current) => ({
          ...current,
          panels: {
            ...current.panels,
            [id]: { ...current.panels[id], collapsed: !current.panels[id].collapsed },
          },
        }));
      },
      setHeight: (id, height) => {
        patchPanel(id, { height: clampHeight(height) });
      },
      nudgeHeight: (id, delta) => {
        setLayout((current) => ({
          ...current,
          panels: {
            ...current.panels,
            [id]: {
              ...current.panels[id],
              height: clampHeight(current.panels[id].height + delta),
            },
          },
        }));
      },
      setSidebarWidth: (width) => {
        setLayout((current) => ({ ...current, sidebarWidth: clampWidth(width) }));
      },
      nudgeSidebarWidth: (delta) => {
        setLayout((current) => ({
          ...current,
          sidebarWidth: clampWidth(current.sidebarWidth + delta),
        }));
      },
      reset: () => {
        setLayout(DEFAULT_LAYOUT);
      },
    }),
    [patchPanel],
  );

  return [layout, actions] as const;
}

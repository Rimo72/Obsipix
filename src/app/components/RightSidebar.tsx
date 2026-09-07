import { Fragment, type CSSProperties } from 'react';

import type { PaletteColorId } from '@core/types/ids';

import type { EditorSession } from '../EditorSession';
import {
  PANEL_TITLE,
  SIDEBAR_PANELS,
  type PanelId,
  type PanelLayout,
  type PanelLayoutActions,
} from '../panelLayout';
import { AnimationPreview } from './AnimationPreview';
import { ColorPanel } from './ColorPanel';
import { LayerPanel } from './LayerPanel';
import { Panel } from './Panel';
import { PalettePanel } from './PalettePanel';
import { ResizeHandle } from './ResizeHandle';
import './RightSidebar.css';

interface RightSidebarProps {
  readonly session: EditorSession;
  readonly layout: PanelLayout;
  readonly actions: PanelLayoutActions;
  readonly onAddColor: () => void;
  readonly onEditColor: (colorId: PaletteColorId) => void;
}

/**
 * The full-height right sidebar (PROJECT_CORE §111.1): a resizable-width column
 * of dockable panels, each independently resizable, collapsible and closeable.
 */
export function RightSidebar({
  session,
  layout,
  actions,
  onAddColor,
  onEditColor,
}: RightSidebarProps) {
  const visible = SIDEBAR_PANELS.filter((id) => layout.panels[id].visible);
  if (visible.length === 0) {
    return (
      <div
        className="right-sidebar right-sidebar--empty"
        style={{ width: `${String(layout.sidebarWidth)}px` }}
      >
        <ResizeHandle
          orientation="col"
          label="Resize sidebar"
          onResize={(dx) => {
            actions.nudgeSidebarWidth(-dx);
          }}
        />
        <p className="right-sidebar__empty-note">
          All panels are closed. Re-open them from <strong>View &rsaquo; Panels</strong>.
        </p>
      </div>
    );
  }

  // The last expanded panel flex-fills; the others keep an explicit height.
  const filler = [...visible].reverse().find((id) => !layout.panels[id].collapsed);

  const slotStyle = (id: PanelId): CSSProperties => {
    const panel = layout.panels[id];
    if (panel.collapsed) {
      return { flex: '0 0 auto' };
    }
    return id === filler ? { flex: '1 1 0' } : { flex: `0 0 ${String(panel.height)}px` };
  };

  const resizeAbove = (dividerIndex: number, delta: number): void => {
    const target = visible
      .slice(0, dividerIndex)
      .reverse()
      .find((id) => !layout.panels[id].collapsed && id !== filler);
    if (target) {
      actions.nudgeHeight(target, delta);
    }
  };

  const content = (id: PanelId) => {
    switch (id) {
      case 'color':
        return <ColorPanel session={session} />;
      case 'layers':
        return <LayerPanel session={session} />;
      case 'palette':
        return <PalettePanel session={session} onAddColor={onAddColor} onEditColor={onEditColor} />;
      case 'preview':
        return <AnimationPreview session={session} />;
      default:
        return null;
    }
  };

  return (
    <div className="right-sidebar" style={{ width: `${String(layout.sidebarWidth)}px` }}>
      <ResizeHandle
        orientation="col"
        label="Resize sidebar"
        onResize={(dx) => {
          actions.setSidebarWidth(layout.sidebarWidth - dx);
        }}
      />
      <div className="right-sidebar__stack">
        {visible.map((id, index) => (
          <Fragment key={id}>
            {index > 0 && (
              <ResizeHandle
                orientation="row"
                label={`Resize ${PANEL_TITLE[visible[index - 1] ?? id]} panel`}
                onResize={(dy) => {
                  resizeAbove(index, dy);
                }}
              />
            )}
            <Panel
              id={id}
              title={PANEL_TITLE[id]}
              collapsed={layout.panels[id].collapsed}
              onToggleCollapse={() => {
                actions.toggleCollapsed(id);
              }}
              onClose={() => {
                actions.setVisible(id, false);
              }}
              style={slotStyle(id)}
            >
              {content(id)}
            </Panel>
          </Fragment>
        ))}
      </div>
    </div>
  );
}

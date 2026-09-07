import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { EditorSession } from '../EditorSession';
import {
  DEFAULT_LAYOUT,
  type PanelId,
  type PanelLayout,
  type PanelLayoutActions,
} from '../panelLayout';
import { RightSidebar } from './RightSidebar';

function actions(overrides: Partial<PanelLayoutActions> = {}): PanelLayoutActions {
  return {
    toggleVisible: vi.fn(),
    setVisible: vi.fn(),
    toggleCollapsed: vi.fn(),
    setHeight: vi.fn(),
    nudgeHeight: vi.fn(),
    setSidebarWidth: vi.fn(),
    nudgeSidebarWidth: vi.fn(),
    reset: vi.fn(),
    ...overrides,
  };
}

/** A DEFAULT_LAYOUT with some panels hidden. */
function hiding(...ids: PanelId[]): PanelLayout {
  const panels = { ...DEFAULT_LAYOUT.panels };
  for (const id of ids) {
    panels[id] = { ...panels[id], visible: false };
  }
  return { ...DEFAULT_LAYOUT, panels };
}

describe('RightSidebar', () => {
  it('renders a region for every visible sidebar panel', () => {
    render(
      <RightSidebar
        session={new EditorSession()}
        layout={DEFAULT_LAYOUT}
        actions={actions()}
        onAddColor={vi.fn()}
        onEditColor={vi.fn()}
      />,
    );
    for (const name of ['Color Management', 'Layers', 'Palettes', 'Animation Preview']) {
      expect(screen.getByRole('region', { name })).toBeInTheDocument();
    }
    // width is applied from the layout
    expect(screen.getByRole('region', { name: 'Layers' }).closest('.right-sidebar')).toHaveStyle({
      width: `${String(DEFAULT_LAYOUT.sidebarWidth)}px`,
    });
  });

  it('hides a panel whose visibility is off', () => {
    render(
      <RightSidebar
        session={new EditorSession()}
        layout={hiding('palette')}
        actions={actions()}
        onAddColor={vi.fn()}
        onEditColor={vi.fn()}
      />,
    );
    expect(screen.queryByRole('region', { name: 'Palettes' })).not.toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Layers' })).toBeInTheDocument();
  });

  it('closing a panel from its header asks the layout to hide it', () => {
    const setVisible = vi.fn();
    render(
      <RightSidebar
        session={new EditorSession()}
        layout={DEFAULT_LAYOUT}
        actions={actions({ setVisible })}
        onAddColor={vi.fn()}
        onEditColor={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Close Layers panel' }));
    expect(setVisible).toHaveBeenCalledWith('layers', false);
  });

  it('shows a recovery note when every sidebar panel is closed', () => {
    render(
      <RightSidebar
        session={new EditorSession()}
        layout={hiding('color', 'layers', 'palette', 'preview')}
        actions={actions()}
        onAddColor={vi.fn()}
        onEditColor={vi.fn()}
      />,
    );
    expect(screen.getByText(/View/)).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Layers' })).not.toBeInTheDocument();
  });
});

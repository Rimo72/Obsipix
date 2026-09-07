import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import {
  DEFAULT_LAYOUT,
  MAX_PANEL_HEIGHT,
  MAX_SIDEBAR_WIDTH,
  MIN_PANEL_HEIGHT,
  MIN_SIDEBAR_WIDTH,
  usePanelLayout,
} from './panelLayout';

afterEach(() => {
  try {
    localStorage.clear();
  } catch {
    /* ignore */
  }
});

describe('usePanelLayout', () => {
  it('starts from the defaults', () => {
    const { result } = renderHook(() => usePanelLayout());
    expect(result.current[0]).toEqual(DEFAULT_LAYOUT);
  });

  it('toggles visibility and collapse without touching other panels', () => {
    const { result } = renderHook(() => usePanelLayout());
    const [, actions] = result.current;

    act(() => {
      actions.toggleVisible('layers');
    });
    expect(result.current[0].panels.layers.visible).toBe(false);
    expect(result.current[0].panels.palette.visible).toBe(true);

    act(() => {
      actions.toggleCollapsed('palette');
    });
    expect(result.current[0].panels.palette.collapsed).toBe(
      !DEFAULT_LAYOUT.panels.palette.collapsed,
    );
  });

  it('nudges heights and width relative to the current value, clamped', () => {
    const { result } = renderHook(() => usePanelLayout());

    act(() => {
      result.current[1].nudgeHeight('layers', -30);
      result.current[1].nudgeHeight('layers', -30);
      result.current[1].nudgeSidebarWidth(40);
    });
    expect(result.current[0].panels.layers.height).toBe(DEFAULT_LAYOUT.panels.layers.height - 60);
    expect(result.current[0].sidebarWidth).toBe(DEFAULT_LAYOUT.sidebarWidth + 40);
  });

  it('clamps panel heights and sidebar width', () => {
    const { result } = renderHook(() => usePanelLayout());
    const [, actions] = result.current;

    act(() => {
      actions.setHeight('layers', 5);
      actions.setSidebarWidth(9000);
    });
    expect(result.current[0].panels.layers.height).toBe(MIN_PANEL_HEIGHT);
    expect(result.current[0].sidebarWidth).toBe(MAX_SIDEBAR_WIDTH);

    act(() => {
      actions.setHeight('layers', 99999);
      actions.setSidebarWidth(10);
    });
    expect(result.current[0].panels.layers.height).toBe(MAX_PANEL_HEIGHT);
    expect(result.current[0].sidebarWidth).toBe(MIN_SIDEBAR_WIDTH);
  });

  it('persists to localStorage and reloads', () => {
    const first = renderHook(() => usePanelLayout());
    act(() => {
      first.result.current[1].setVisible('preview', false);
      first.result.current[1].setSidebarWidth(360);
    });
    first.unmount();

    const second = renderHook(() => usePanelLayout());
    expect(second.result.current[0].panels.preview.visible).toBe(false);
    expect(second.result.current[0].sidebarWidth).toBe(360);
  });

  it('reset restores the defaults', () => {
    const { result } = renderHook(() => usePanelLayout());
    act(() => {
      result.current[1].setVisible('layers', false);
      result.current[1].setHeight('palette', 400);
    });
    act(() => {
      result.current[1].reset();
    });
    expect(result.current[0]).toEqual(DEFAULT_LAYOUT);
  });

  it('ignores a corrupt stored layout', () => {
    localStorage.setItem('obsipix.panelLayout.v1', '{ not json');
    const { result } = renderHook(() => usePanelLayout());
    expect(result.current[0]).toEqual(DEFAULT_LAYOUT);
  });
});

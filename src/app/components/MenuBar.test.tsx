import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { MenuBar, type MenuDef } from './MenuBar';

function buildMenus(spies: { save: () => void; undo: () => void; grid: () => void }): MenuDef[] {
  return [
    {
      label: 'File',
      items: [
        { label: 'Save', shortcut: 'Ctrl+S', onSelect: spies.save },
        null,
        { label: 'Close', onSelect: () => undefined },
      ],
    },
    {
      label: 'Edit',
      items: [
        { label: 'Undo', onSelect: spies.undo, disabled: true },
        { label: 'Redo', onSelect: () => undefined },
      ],
    },
    {
      label: 'View',
      items: [{ label: 'Grid', checked: true, onSelect: spies.grid }],
    },
  ];
}

const menubar = (): HTMLElement => screen.getByRole('menubar');

describe('MenuBar', () => {
  it('opens a menu on click and runs the selected item', () => {
    const save = vi.fn();
    render(<MenuBar menus={buildMenus({ save, undo: vi.fn(), grid: vi.fn() })} />);

    fireEvent.click(screen.getByRole('menuitem', { name: 'File' }));
    fireEvent.click(screen.getByRole('menuitem', { name: 'Save' }));

    expect(save).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('menu', { name: 'File' })).not.toBeInTheDocument();
  });

  it('navigates between menus and items with the arrow keys', () => {
    const grid = vi.fn();
    render(<MenuBar menus={buildMenus({ save: vi.fn(), undo: vi.fn(), grid })} />);

    fireEvent.click(screen.getByRole('menuitem', { name: 'File' }));
    fireEvent.keyDown(menubar(), { key: 'ArrowRight' });
    fireEvent.keyDown(menubar(), { key: 'ArrowRight' }); // File -> Edit -> View
    expect(screen.getByRole('menu', { name: 'View' })).toBeInTheDocument();

    fireEvent.keyDown(menubar(), { key: 'Enter' });
    expect(grid).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('menu', { name: 'View' })).not.toBeInTheDocument();
  });

  it('closes on Escape and restores focus to the menu button', () => {
    render(<MenuBar menus={buildMenus({ save: vi.fn(), undo: vi.fn(), grid: vi.fn() })} />);

    const fileButton = screen.getByRole('menuitem', { name: 'File' });
    fireEvent.click(fileButton);
    expect(screen.getByRole('menu', { name: 'File' })).toBeInTheDocument();

    fireEvent.keyDown(menubar(), { key: 'Escape' });
    expect(screen.queryByRole('menu', { name: 'File' })).not.toBeInTheDocument();
    expect(fileButton).toHaveFocus();
  });

  it('marks disabled items and does not fire them', () => {
    const undo = vi.fn();
    render(<MenuBar menus={buildMenus({ save: vi.fn(), undo, grid: vi.fn() })} />);

    fireEvent.click(screen.getByRole('menuitem', { name: 'Edit' }));
    const undoItem = screen.getByRole('menuitem', { name: 'Undo' });
    expect(undoItem).toBeDisabled();
    fireEvent.click(undoItem);
    expect(undo).not.toHaveBeenCalled();
  });

  it('closes when a pointer press lands outside the bar', () => {
    render(<MenuBar menus={buildMenus({ save: vi.fn(), undo: vi.fn(), grid: vi.fn() })} />);
    fireEvent.click(screen.getByRole('menuitem', { name: 'File' }));
    expect(screen.getByRole('menu', { name: 'File' })).toBeInTheDocument();

    fireEvent.pointerDown(document.body);
    expect(screen.queryByRole('menu', { name: 'File' })).not.toBeInTheDocument();
  });
});

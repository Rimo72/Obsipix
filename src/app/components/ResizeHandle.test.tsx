import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { ResizeHandle } from './ResizeHandle';

describe('ResizeHandle', () => {
  it('exposes a keyboard-operable separator with the right orientation', () => {
    const onResize = vi.fn();
    render(<ResizeHandle orientation="row" label="Resize Layers panel" onResize={onResize} />);
    const handle = screen.getByRole('separator', { name: 'Resize Layers panel' });
    expect(handle).toHaveAttribute('aria-orientation', 'horizontal');

    fireEvent.keyDown(handle, { key: 'ArrowDown' });
    expect(onResize).toHaveBeenCalledWith(16);
    fireEvent.keyDown(handle, { key: 'ArrowUp' });
    expect(onResize).toHaveBeenCalledWith(-16);
  });

  it('a column handle nudges on left / right arrows', () => {
    const onResize = vi.fn();
    render(<ResizeHandle orientation="col" label="Resize sidebar" onResize={onResize} step={20} />);
    const handle = screen.getByRole('separator', { name: 'Resize sidebar' });
    expect(handle).toHaveAttribute('aria-orientation', 'vertical');
    fireEvent.keyDown(handle, { key: 'ArrowRight' });
    expect(onResize).toHaveBeenCalledWith(20);
  });
});

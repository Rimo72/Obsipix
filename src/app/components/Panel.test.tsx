import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { Panel } from './Panel';

describe('Panel', () => {
  it('shows its body when expanded and hides it when collapsed', () => {
    const { rerender } = render(
      <Panel id="x" title="Layers" collapsed={false} onToggleCollapse={vi.fn()}>
        <p>body content</p>
      </Panel>,
    );
    expect(screen.getByText('body content')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Layers' })).toHaveAttribute('aria-expanded', 'true');

    rerender(
      <Panel id="x" title="Layers" collapsed onToggleCollapse={vi.fn()}>
        <p>body content</p>
      </Panel>,
    );
    expect(screen.queryByText('body content')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Layers' })).toHaveAttribute(
      'aria-expanded',
      'false',
    );
  });

  it('calls onToggleCollapse and onClose from the header controls', () => {
    const onToggleCollapse = vi.fn();
    const onClose = vi.fn();
    render(
      <Panel
        id="x"
        title="Palettes"
        collapsed={false}
        onToggleCollapse={onToggleCollapse}
        onClose={onClose}
      >
        <p>b</p>
      </Panel>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Palettes' }));
    expect(onToggleCollapse).toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Close Palettes panel' }));
    expect(onClose).toHaveBeenCalled();
  });

  it('omits the close control when no handler is given', () => {
    render(
      <Panel id="x" title="Layers" collapsed={false} onToggleCollapse={vi.fn()}>
        <p>b</p>
      </Panel>,
    );
    expect(screen.queryByRole('button', { name: /Close/ })).not.toBeInTheDocument();
  });
});

import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { AboutDialog } from './AboutDialog';

describe('AboutDialog', () => {
  it('shows the product identity, description and version', () => {
    render(<AboutDialog onClose={vi.fn()} />);

    expect(screen.getByRole('dialog', { name: 'About Obsipix' })).toBeInTheDocument();
    expect(screen.getByText('Create. Animate. Pixel Perfect.')).toBeInTheDocument();
    expect(screen.getByText(/free-to-use pixel art editor/i)).toBeInTheDocument();
    expect(screen.getByText(/^Version /)).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Obsipix logo' })).toBeInTheDocument();
  });

  it('closes from the dialog controls', () => {
    const onClose = vi.fn();
    render(<AboutDialog onClose={onClose} />);
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(onClose).toHaveBeenCalled();
  });
});

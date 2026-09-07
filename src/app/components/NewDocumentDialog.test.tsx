import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { NewDocumentDialog } from './NewDocumentDialog';

describe('NewDocumentDialog', () => {
  it('applies a size preset to both fields', () => {
    render(<NewDocumentDialog onClose={vi.fn()} onCreate={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: '64×64' }));
    expect(screen.getByLabelText('Width')).toHaveValue(64);
    expect(screen.getByLabelText('Height')).toHaveValue(64);
    expect(screen.getByRole('button', { name: '64×64' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('creates with the chosen dimensions and background', () => {
    const onCreate = vi.fn();
    render(<NewDocumentDialog onClose={vi.fn()} onCreate={onCreate} />);
    fireEvent.change(screen.getByLabelText('Width'), { target: { value: '20' } });
    fireEvent.change(screen.getByLabelText('Height'), { target: { value: '12' } });
    fireEvent.click(screen.getByRole('radio', { name: 'White' }));
    fireEvent.click(screen.getByRole('button', { name: 'Create' }));

    expect(onCreate).toHaveBeenCalledWith({
      width: 20,
      height: 12,
      background: { r: 255, g: 255, b: 255, a: 255 },
    });
  });

  it('disables Create for an out-of-range size', () => {
    render(<NewDocumentDialog onClose={vi.fn()} onCreate={vi.fn()} />);
    fireEvent.change(screen.getByLabelText('Width'), { target: { value: '99999' } });
    expect(screen.getByRole('button', { name: 'Create' })).toBeDisabled();
  });

  it('defaults to a transparent background', () => {
    const onCreate = vi.fn();
    render(<NewDocumentDialog onClose={vi.fn()} onCreate={onCreate} />);
    fireEvent.click(screen.getByRole('button', { name: 'Create' }));
    expect(onCreate).toHaveBeenCalledWith({ width: 32, height: 32, background: null });
  });
});

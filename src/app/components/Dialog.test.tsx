import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { Dialog } from './Dialog';

function Harness({ onClose }: { readonly onClose: () => void }) {
  return (
    <Dialog title="Test dialog" onClose={onClose} footer={<button type="button">Apply</button>}>
      <button type="button">First</button>
      <button type="button">Second</button>
    </Dialog>
  );
}

describe('Dialog', () => {
  it('is a labelled modal and focuses its first control', () => {
    render(<Harness onClose={vi.fn()} />);
    const dialog = screen.getByRole('dialog', { name: 'Test dialog' });
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(screen.getByRole('button', { name: 'First' })).toHaveFocus();
  });

  it('closes on Escape', () => {
    const onClose = vi.fn();
    render(<Harness onClose={onClose} />);
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('closes on a backdrop press but not on a press inside the card', () => {
    const onClose = vi.fn();
    render(<Harness onClose={onClose} />);
    fireEvent.mouseDown(screen.getByRole('button', { name: 'First' }));
    expect(onClose).not.toHaveBeenCalled();
    fireEvent.mouseDown(document.querySelector('.dialog__backdrop')!);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('traps Tab focus within the dialog', () => {
    render(<Harness onClose={vi.fn()} />);
    const dialog = screen.getByRole('dialog', { name: 'Test dialog' });
    const close = screen.getByRole('button', { name: 'Close' });
    const apply = screen.getByRole('button', { name: 'Apply' });

    apply.focus();
    fireEvent.keyDown(window, { key: 'Tab' });
    expect(close).toHaveFocus(); // wrapped to the first control

    fireEvent.keyDown(window, { key: 'Tab', shiftKey: true });
    expect(apply).toHaveFocus(); // wrapped back to the last
    expect(dialog.contains(document.activeElement)).toBe(true);
  });

  it('restores focus to the opener when unmounted', () => {
    const opener = document.createElement('button');
    document.body.append(opener);
    opener.focus();

    const { unmount } = render(<Harness onClose={vi.fn()} />);
    expect(opener).not.toHaveFocus();
    unmount();
    expect(opener).toHaveFocus();
    opener.remove();
  });
});

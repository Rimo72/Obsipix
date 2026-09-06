import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ToastProvider } from './Toasts';
import { useToasts } from './toastContext';

function Trigger() {
  const { notify } = useToasts();
  return (
    <>
      <button type="button" onClick={() => notify('Saved', 'success')}>
        good
      </button>
      <button type="button" onClick={() => notify('Boom', 'error')}>
        bad
      </button>
    </>
  );
}

afterEach(() => {
  vi.useRealTimers();
});

describe('Toasts', () => {
  it('shows a notification and auto-dismisses the transient ones', () => {
    vi.useFakeTimers();
    render(
      <ToastProvider>
        <Trigger />
      </ToastProvider>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'good' }));
    expect(screen.getByText('Saved')).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(4000);
    });
    expect(screen.queryByText('Saved')).not.toBeInTheDocument();
  });

  it('keeps error toasts until dismissed by hand', () => {
    vi.useFakeTimers();
    render(
      <ToastProvider>
        <Trigger />
      </ToastProvider>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'bad' }));
    act(() => {
      vi.advanceTimersByTime(60_000);
    });
    expect(screen.getByText('Boom')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Dismiss notification' }));
    expect(screen.queryByText('Boom')).not.toBeInTheDocument();
  });

  it('caps the stack at four toasts', () => {
    render(
      <ToastProvider>
        <Trigger />
      </ToastProvider>,
    );
    for (let i = 0; i < 6; i += 1) {
      fireEvent.click(screen.getByRole('button', { name: 'bad' }));
    }
    expect(screen.getAllByTestId('toast')).toHaveLength(4);
  });

  it('throws when useToasts is used with no provider', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    expect(() => render(<Trigger />)).toThrow(/ToastProvider/);
    spy.mockRestore();
  });
});

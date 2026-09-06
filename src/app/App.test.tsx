import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { App } from './App';

beforeEach(() => {
  vi.spyOn(console, 'warn').mockImplementation(() => undefined);
});
afterEach(() => {
  vi.restoreAllMocks();
});

// The recovery hook loads asynchronously on mount; `findBy*` flushes that
// update inside act() so it never leaks past the test.
async function renderApp(): Promise<void> {
  render(<App />);
  await screen.findByTestId('editor-canvas');
}

describe('App shell', () => {
  it('renders the Obsipix brand and the canvas', async () => {
    await renderApp();
    expect(screen.getByText('Obsipix')).toBeInTheDocument();
    expect(screen.getByTestId('editor-canvas').tagName).toBe('CANVAS');
  });

  it('starts on the pencil tool with undo/redo disabled and no unsaved changes', async () => {
    await renderApp();
    expect(screen.getByRole('button', { name: 'Pencil' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Eraser' })).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByRole('button', { name: 'Undo' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Redo' })).toBeDisabled();
    expect(screen.getByTestId('status-dirty')).toHaveTextContent('saved');
  });

  it('switches the active tool when a toolbar button is clicked', async () => {
    await renderApp();
    fireEvent.click(screen.getByRole('button', { name: 'Eraser' }));
    expect(screen.getByRole('button', { name: 'Eraser' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('status-tool')).toHaveTextContent('eraser');
  });

  it('shows the default document dimensions in the status bar', async () => {
    await renderApp();
    expect(screen.getByTestId('status-dimensions')).toHaveTextContent('32 × 32');
  });
});

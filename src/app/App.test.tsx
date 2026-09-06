import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { App } from './App';

beforeEach(() => {
  vi.spyOn(console, 'warn').mockImplementation(() => undefined);
});
afterEach(() => {
  vi.restoreAllMocks();
});

describe('App shell', () => {
  it('renders the Obsipix brand and the canvas', () => {
    render(<App />);
    expect(screen.getByText('Obsipix')).toBeInTheDocument();
    expect(screen.getByTestId('editor-canvas').tagName).toBe('CANVAS');
  });

  it('starts on the pencil tool with undo/redo disabled', () => {
    render(<App />);
    expect(screen.getByRole('button', { name: 'Pencil' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Eraser' })).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByRole('button', { name: 'Undo' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Redo' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
  });

  it('switches the active tool when a toolbar button is clicked', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'Eraser' }));
    expect(screen.getByRole('button', { name: 'Eraser' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('status-tool')).toHaveTextContent('eraser');
  });

  it('shows the default document dimensions in the status bar', () => {
    render(<App />);
    expect(screen.getByTestId('status-dimensions')).toHaveTextContent('32 × 32');
  });
});

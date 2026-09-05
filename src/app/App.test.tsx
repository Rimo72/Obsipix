import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { App } from './App';

describe('App shell', () => {
  it('renders the Obsipix brand', () => {
    render(<App />);
    expect(screen.getByText('Obsipix')).toBeInTheDocument();
  });

  it('renders the Phase 0 toolbar controls', () => {
    render(<App />);
    for (const label of ['Pencil', 'Eraser', 'Undo', 'Redo', 'Save']) {
      expect(screen.getByRole('button', { name: label })).toBeDisabled();
    }
  });

  it('shows the default document dimensions and zoom in the status bar', () => {
    render(<App />);
    expect(screen.getByTestId('status-dimensions')).toHaveTextContent('32 × 32');
    expect(screen.getByTestId('status-zoom')).toHaveTextContent('100%');
  });
});

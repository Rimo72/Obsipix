import { render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { App } from '../App';

beforeEach(() => {
  vi.spyOn(console, 'warn').mockImplementation(() => undefined);
});
afterEach(() => {
  vi.restoreAllMocks();
});

async function renderApp(): Promise<void> {
  render(<App />);
  await screen.findByTestId('editor-canvas');
}

describe('accessibility wiring', () => {
  it('exposes landmark roles for the major regions', async () => {
    await renderApp();
    expect(screen.getByRole('menubar', { name: 'Main menu' })).toBeInTheDocument();
    expect(screen.getByRole('toolbar', { name: 'Tool options' })).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: 'Tools' })).toBeInTheDocument();
    expect(screen.getByRole('main', { name: 'Canvas' })).toBeInTheDocument();
    expect(screen.getByRole('contentinfo', { name: 'Status' })).toBeInTheDocument();
  });

  it('communicates tool state with aria-pressed and an accessible name', async () => {
    await renderApp();
    const pencil = screen.getByRole('button', { name: 'Pencil' });
    const eraser = screen.getByRole('button', { name: 'Eraser' });
    expect(pencil).toHaveAttribute('aria-pressed', 'true');
    expect(eraser).toHaveAttribute('aria-pressed', 'false');
  });

  it('labels the canvas and the colour swatches', async () => {
    await renderApp();
    expect(
      screen.getByRole('img', { name: /drawing canvas, 32 by 32 pixels/i }),
    ).toBeInTheDocument();
    const options = screen.getByRole('toolbar', { name: 'Tool options' });
    expect(within(options).getByLabelText(/foreground colour, #/i)).toBeInTheDocument();
    expect(within(options).getByLabelText(/background colour, #/i)).toBeInTheDocument();
    expect(within(options).getByRole('button', { name: 'Brush size 1' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });

  it('marks the active layer with aria-current', async () => {
    await renderApp();
    expect(screen.getByRole('button', { name: 'Layer 1', current: true })).toBeInTheDocument();
  });
});

import { render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { CanvasStage } from './CanvasStage';

// jsdom has no 2D context, so CanvasStage logs one warning and bails; keep it out of the report.
beforeEach(() => {
  vi.spyOn(console, 'warn').mockImplementation(() => undefined);
});
afterEach(() => {
  vi.restoreAllMocks();
});

describe('CanvasStage', () => {
  it('renders a canvas element', () => {
    render(<CanvasStage />);
    expect(screen.getByTestId('editor-canvas').tagName).toBe('CANVAS');
  });

  it('degrades gracefully when the 2D context is unavailable', () => {
    expect(() => render(<CanvasStage />)).not.toThrow();
  });
});

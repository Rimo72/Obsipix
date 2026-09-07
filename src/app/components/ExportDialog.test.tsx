import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { EditorSession } from '../EditorSession';
import { ExportDialog } from './ExportDialog';

function withFrames(n: number): EditorSession {
  const session = new EditorSession();
  for (let i = 1; i < n; i += 1) {
    session.addFrame();
  }
  return session;
}

describe('ExportDialog', () => {
  it('exports the current frame with the chosen format and scale', () => {
    const onExport = vi.fn();
    render(<ExportDialog session={new EditorSession()} onClose={vi.fn()} onExport={onExport} />);

    fireEvent.change(screen.getByLabelText('Format'), { target: { value: 'webp' } });
    fireEvent.click(screen.getByRole('button', { name: '4×' }));
    fireEvent.click(screen.getByRole('button', { name: 'Export' }));

    expect(onExport).toHaveBeenCalledWith(
      expect.objectContaining({ kind: 'frame', format: 'webp', scale: 4, transparent: true }),
    );
  });

  it('shows the scaled output dimensions', () => {
    render(<ExportDialog session={new EditorSession()} onClose={vi.fn()} onExport={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: '2×' }));
    expect(screen.getByTestId('export-output-size')).toHaveTextContent('Output: 64 × 64 px');
  });

  it('disables animation / sheet for a single-frame document', () => {
    render(<ExportDialog session={new EditorSession()} onClose={vi.fn()} onExport={vi.fn()} />);
    expect(screen.getByRole('tab', { name: 'Animation (GIF)' })).toBeDisabled();
    expect(screen.getByRole('tab', { name: 'Sprite sheet' })).toBeDisabled();
  });

  it('animation export is GIF-only', () => {
    render(<ExportDialog session={withFrames(3)} onClose={vi.fn()} onExport={vi.fn()} />);
    fireEvent.click(screen.getByRole('tab', { name: 'Animation (GIF)' }));
    const format = screen.getByLabelText('Format');
    expect(format).toHaveValue('gif');
    expect(format.querySelectorAll('option')).toHaveLength(1);
  });

  it('a sprite sheet computes a grid output size', () => {
    const onExport = vi.fn();
    render(<ExportDialog session={withFrames(4)} onClose={vi.fn()} onExport={onExport} />);
    fireEvent.click(screen.getByRole('tab', { name: 'Sprite sheet' }));
    fireEvent.click(screen.getByRole('button', { name: 'Grid' }));
    fireEvent.change(screen.getByLabelText('Columns'), { target: { value: '2' } });
    // 2 cols × 2 rows of 32px, no spacing
    expect(screen.getByTestId('export-output-size')).toHaveTextContent('Output: 64 × 64 px');

    fireEvent.click(screen.getByRole('button', { name: 'Export' }));
    expect(onExport).toHaveBeenCalledWith(
      expect.objectContaining({
        kind: 'sheet',
        sheet: { layout: 'grid', columns: 2, spacing: 0 },
      }),
    );
  });

  it('JPEG forces an opaque background', () => {
    const onExport = vi.fn();
    render(<ExportDialog session={new EditorSession()} onClose={vi.fn()} onExport={onExport} />);
    fireEvent.change(screen.getByLabelText('Format'), { target: { value: 'jpeg' } });
    expect(screen.getByRole('checkbox', { name: 'Transparent background' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Export' }));
    expect(onExport).toHaveBeenCalledWith(expect.objectContaining({ transparent: false }));
  });
});

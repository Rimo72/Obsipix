import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { ImageData8 } from '@core/document/importCommands';

import { ImportPngDialog } from './ImportPngDialog';

function png(width: number, height: number): ImageData8 {
  return { width, height, data: new Uint8ClampedArray(width * height * 4) };
}

function renderDialog(
  image: ImageData8,
  overrides: Partial<Parameters<typeof ImportPngDialog>[0]> = {},
) {
  const props = {
    image,
    onClose: vi.fn(),
    onImportSingle: vi.fn(),
    onImportSheet: vi.fn(),
    ...overrides,
  };
  render(<ImportPngDialog {...props} />);
  return props;
}

describe('ImportPngDialog', () => {
  it('defaults to single-image mode and imports the whole PNG', () => {
    const { onImportSingle } = renderDialog(png(64, 64));
    expect(screen.getByRole('radio', { name: 'Single image' })).toBeChecked();
    expect(screen.queryByLabelText('Frame width')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Import' }));
    expect(onImportSingle).toHaveBeenCalledTimes(1);
  });

  it('reveals the slice fields and a live frame count in sprite-sheet mode', () => {
    renderDialog(png(128, 64));
    fireEvent.click(screen.getByRole('radio', { name: 'Sprite sheet' }));

    fireEvent.change(screen.getByLabelText('Frame width'), { target: { value: '32' } });
    fireEvent.change(screen.getByLabelText('Frame height'), { target: { value: '32' } });

    expect(screen.getByTestId('import-detected')).toHaveTextContent('4 × 2');
    expect(screen.getByTestId('import-detected')).toHaveTextContent('8 frames');
  });

  it('blocks import and explains why when the frame size does not divide the sheet', () => {
    renderDialog(png(128, 64));
    fireEvent.click(screen.getByRole('radio', { name: 'Sprite sheet' }));
    fireEvent.change(screen.getByLabelText('Frame width'), { target: { value: '30' } });

    expect(screen.getByRole('alert')).toHaveTextContent(/multiple of the frame width/i);
    expect(screen.getByRole('button', { name: 'Import' })).toBeDisabled();
  });

  it('passes the parsed slice and frame count to onImportSheet', () => {
    const { onImportSheet } = renderDialog(png(96, 32));
    fireEvent.click(screen.getByRole('radio', { name: 'Sprite sheet' }));
    fireEvent.change(screen.getByLabelText('Frame width'), { target: { value: '32' } });
    fireEvent.change(screen.getByLabelText('Frame height'), { target: { value: '32' } });

    fireEvent.click(screen.getByRole('button', { name: 'Import' }));
    expect(onImportSheet).toHaveBeenCalledWith(
      expect.objectContaining({ frameWidth: 32, frameHeight: 32, offsetX: 0, spacingX: 0 }),
      3,
    );
  });

  it('draws one preview cell per detected frame', () => {
    const { container } = render(
      <ImportPngDialog
        image={png(64, 32)}
        onClose={vi.fn()}
        onImportSingle={vi.fn()}
        onImportSheet={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByRole('radio', { name: 'Sprite sheet' }));
    fireEvent.change(screen.getByLabelText('Frame width'), { target: { value: '32' } });
    fireEvent.change(screen.getByLabelText('Frame height'), { target: { value: '32' } });

    expect(container.querySelectorAll('.import-png__preview-grid rect')).toHaveLength(2);
  });
});

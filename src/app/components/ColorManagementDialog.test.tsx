import { fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { rgba, type RGBA } from '@core/types/color';

import { ColorManagementDialog } from './ColorManagementDialog';

interface HarnessProps {
  initial?: RGBA;
  confirmLabel?: string;
  showName?: boolean;
  initialName?: string;
  onConfirm?: (c: RGBA, name: string) => void;
  onClose?: () => void;
  onPickFromCanvas?: () => void;
}

function Harness({ initial = rgba(229, 74, 66, 255), ...props }: HarnessProps) {
  const [color, setColor] = useState<RGBA>(initial);
  return (
    <>
      <output data-testid="draft">{`${String(color.r)},${String(color.g)},${String(color.b)},${String(color.a)}`}</output>
      <ColorManagementDialog
        value={color}
        onChange={setColor}
        onClose={props.onClose ?? vi.fn()}
        onConfirm={props.onConfirm ?? vi.fn()}
        confirmLabel={props.confirmLabel ?? 'Add Color'}
        showName={props.showName ?? false}
        initialName={props.initialName ?? ''}
        {...(props.onPickFromCanvas ? { onPickFromCanvas: props.onPickFromCanvas } : {})}
      />
    </>
  );
}

const draft = (): string | null => screen.getByTestId('draft').textContent;

describe('ColorManagementDialog', () => {
  it('shows the colour as a dialog with numeric + hex entry', () => {
    render(<Harness />);
    expect(screen.getByRole('dialog', { name: 'Color Management' })).toBeInTheDocument();
    expect(screen.getByLabelText('Red')).toHaveValue(229);
    expect(screen.getByLabelText('HEX')).toHaveValue('#e54a42ff');
  });

  it('edits a channel and keeps hex + preview in sync', () => {
    render(<Harness />);
    fireEvent.change(screen.getByLabelText('Green'), { target: { value: '128' } });
    expect(draft()).toBe('229,128,66,255');
    expect(screen.getByLabelText('HEX')).toHaveValue('#e58042ff');
  });

  it('commits a HEX value on blur', () => {
    render(<Harness />);
    const hex = screen.getByLabelText('HEX');
    fireEvent.change(hex, { target: { value: '#00ff0080' } });
    fireEvent.blur(hex);
    expect(draft()).toBe('0,255,0,128');
  });

  it('confirms with the current colour and trimmed name', () => {
    const onConfirm = vi.fn();
    render(<Harness showName initialName="Skin" onConfirm={onConfirm} confirmLabel="Save Color" />);
    fireEvent.change(screen.getByLabelText('Colour name'), { target: { value: '  Rust  ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save Color' }));
    expect(onConfirm).toHaveBeenCalledWith(rgba(229, 74, 66, 255), 'Rust');
  });

  it('cancel does not confirm', () => {
    const onConfirm = vi.fn();
    const onClose = vi.fn();
    render(<Harness onConfirm={onConfirm} onClose={onClose} />);
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onConfirm).not.toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });

  it('offers "Pick from Canvas" only when a handler is given', () => {
    const onPick = vi.fn();
    const { rerender } = render(<Harness onPickFromCanvas={onPick} />);
    fireEvent.click(screen.getByRole('button', { name: 'Pick from Canvas' }));
    expect(onPick).toHaveBeenCalled();

    rerender(<Harness />);
    expect(screen.queryByRole('button', { name: 'Pick from Canvas' })).not.toBeInTheDocument();
  });
});

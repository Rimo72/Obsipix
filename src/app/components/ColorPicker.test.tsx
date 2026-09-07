import { fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';

import { BLACK, type RGBA } from '@core/types/color';

import { ColorPicker } from './ColorPicker';

function Harness({ initial = BLACK }: { readonly initial?: RGBA }) {
  const [color, setColor] = useState<RGBA>(initial);
  return (
    <>
      <output data-testid="value">{`${String(color.r)},${String(color.g)},${String(color.b)},${String(color.a)}`}</output>
      <ColorPicker label="Foreground colour" value={color} onChange={setColor} />
    </>
  );
}

const value = (): string | null => screen.getByTestId('value').textContent;

describe('ColorPicker', () => {
  it('edits an RGB channel and keeps HEX in sync', () => {
    render(<Harness />);
    fireEvent.click(screen.getByRole('tab', { name: 'RGB' }));
    fireEvent.change(screen.getByLabelText('R value'), { target: { value: '255' } });
    expect(value()).toBe('255,0,0,255');
    expect(screen.getByLabelText('Foreground colour hex value')).toHaveValue('#ff0000');
  });

  it('accepts a HEX value including short and alpha forms', () => {
    render(<Harness />);
    const hex = screen.getByLabelText('Foreground colour hex value');
    fireEvent.change(hex, { target: { value: '#0f08' } });
    fireEvent.blur(hex);
    expect(value()).toBe('0,255,0,136');
  });

  it('reverts an invalid HEX to the current colour', () => {
    render(<Harness initial={{ r: 10, g: 20, b: 30, a: 255 }} />);
    const hex = screen.getByLabelText('Foreground colour hex value');
    fireEvent.change(hex, { target: { value: 'nonsense' } });
    fireEvent.blur(hex);
    expect(hex).toHaveValue('#0a141e');
    expect(value()).toBe('10,20,30,255');
  });

  it('HSV hue edit changes the colour without touching alpha', () => {
    render(<Harness initial={{ r: 255, g: 0, b: 0, a: 128 }} />);
    fireEvent.change(screen.getByLabelText('H value'), { target: { value: '120' } });
    expect(value()).toBe('0,255,0,128');
  });

  it('the alpha field is available in every mode', () => {
    render(<Harness />);
    for (const mode of ['RGB', 'HSV', 'HSL', 'GRAY']) {
      fireEvent.click(screen.getByRole('tab', { name: mode }));
      fireEvent.change(screen.getByLabelText('A value'), { target: { value: '64' } });
      expect(value()).toMatch(/,64$/);
      fireEvent.change(screen.getByLabelText('A value'), { target: { value: '255' } });
    }
  });
});

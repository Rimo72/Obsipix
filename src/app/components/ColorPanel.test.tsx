import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { EditorSession } from '../EditorSession';
import { ColorPanel } from './ColorPanel';

describe('ColorPanel', () => {
  it('edits the foreground by default and follows the selected slot', () => {
    const session = new EditorSession();
    render(<ColorPanel session={session} />);

    expect(screen.getByRole('button', { name: /Foreground/ })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    // the picker is bound to the foreground
    expect(screen.getByRole('group', { name: 'Foreground colour' })).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Foreground colour hex value'), {
      target: { value: '#00ff00' },
    });
    fireEvent.blur(screen.getByLabelText('Foreground colour hex value'));
    expect(session.foreground).toMatchObject({ r: 0, g: 255, b: 0 });

    fireEvent.click(screen.getByRole('button', { name: /Background/ }));
    expect(screen.getByRole('group', { name: 'Background colour' })).toBeInTheDocument();
  });

  it('swaps foreground and background', () => {
    const session = new EditorSession();
    session.setForeground({ r: 10, g: 20, b: 30, a: 255 });
    session.setBackground({ r: 200, g: 100, b: 50, a: 255 });
    render(<ColorPanel session={session} />);

    fireEvent.click(screen.getByRole('button', { name: 'Swap foreground and background' }));
    expect(session.foreground).toMatchObject({ r: 200, g: 100, b: 50 });
    expect(session.background).toMatchObject({ r: 10, g: 20, b: 30 });
  });
});

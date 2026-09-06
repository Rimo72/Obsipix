import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { selectRectCommand } from '@core/document/editCommands';
import { NO_MODIFIERS, type PointerInput } from '@core/tools/PointerInput';

import { EditorSession } from '../EditorSession';
import { StatusBar } from './StatusBar';

function at(x: number, y: number): PointerInput {
  return {
    canvas: { x, y },
    pixel: { x, y },
    source: 'mouse',
    buttons: { left: false, right: false, middle: false },
    modifiers: NO_MODIFIERS,
    pressure: 1,
  };
}

describe('StatusBar', () => {
  it('shows document facts and a placeholder cursor', () => {
    render(<StatusBar session={new EditorSession()} />);
    expect(screen.getByTestId('status-dimensions')).toHaveTextContent('32 × 32');
    expect(screen.getByTestId('status-cursor')).toHaveTextContent('–, –');
    expect(screen.getByTestId('status-frame')).toHaveTextContent('frame 1/1');
    expect(screen.getByTestId('status-dirty')).toHaveTextContent('saved');
  });

  it('reflects the cursor position and a live selection size', () => {
    const session = new EditorSession();
    session.pointerMove(at(7, 12));
    session.runCommand(selectRectCommand({ x: 2, y: 3, width: 5, height: 4 }, 'replace'));

    render(<StatusBar session={session} />);
    expect(screen.getByTestId('status-cursor')).toHaveTextContent('7, 12');
    expect(screen.getByTestId('status-selection')).toHaveTextContent('sel 5 × 4');
  });

  it('drops the cursor readout when the pointer leaves the canvas', () => {
    const session = new EditorSession();
    session.pointerMove(at(1, 1));
    session.clearCursor();
    render(<StatusBar session={session} />);
    expect(screen.getByTestId('status-cursor')).toHaveTextContent('–, –');
  });
});

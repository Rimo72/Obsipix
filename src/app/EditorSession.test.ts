import { describe, expect, it, vi } from 'vitest';

import { ERASER_TOOL_ID } from '@core/tools/EraserTool';
import { PENCIL_TOOL_ID } from '@core/tools/PencilTool';
import { NO_MODIFIERS, type PointerInput } from '@core/tools/PointerInput';
import { BLACK, TRANSPARENT, rgbaEquals } from '@core/types/color';

import { EditorSession } from './EditorSession';

function press(x: number, y: number, button: 'left' | 'right' | 'none' = 'left'): PointerInput {
  return {
    canvas: { x, y },
    pixel: { x, y },
    source: 'mouse',
    buttons: { left: button === 'left', right: button === 'right', middle: false },
    modifiers: NO_MODIFIERS,
    pressure: 1,
  };
}

function pixel(session: EditorSession, x: number, y: number) {
  const document = session.document;
  return document.resolveBuffer(document.layers.activeLayerId)?.getPixel(x, y) ?? TRANSPARENT;
}

function drag(session: EditorSession, points: readonly [number, number][]): void {
  const [first, ...rest] = points;
  if (!first) {
    return;
  }
  session.pointerDown(press(first[0], first[1]));
  for (const [x, y] of rest) {
    session.pointerMove(press(x, y));
  }
  const last = points[points.length - 1] ?? first;
  session.pointerUp(press(last[0], last[1], 'none'));
}

describe('EditorSession', () => {
  it('starts on the pencil tool with a clean history', () => {
    const session = new EditorSession();
    expect(session.activeToolId).toBe(PENCIL_TOOL_ID);
    expect(session.canUndo).toBe(false);
    expect(session.document.dimensions).toEqual({ width: 32, height: 32 });
  });

  it('notifies subscribers on change', () => {
    const session = new EditorSession();
    const listener = vi.fn();
    const unsubscribe = session.subscribe(listener);
    session.setTool(ERASER_TOOL_ID);
    expect(listener).toHaveBeenCalled();
    unsubscribe();
    listener.mockClear();
    session.setTool(PENCIL_TOOL_ID);
    expect(listener).not.toHaveBeenCalled();
  });

  it('draws a stroke and records exactly one history entry', () => {
    const session = new EditorSession();
    drag(session, [
      [2, 2],
      [6, 2],
      [10, 2],
    ]);

    expect(session.history.depth).toBe(1);
    for (let x = 2; x <= 10; x += 1) {
      expect(rgbaEquals(pixel(session, x, 2), BLACK)).toBe(true);
    }
  });

  it('undoes and redoes a stroke', () => {
    const session = new EditorSession();
    drag(session, [
      [4, 4],
      [4, 8],
    ]);
    expect(session.canUndo).toBe(true);

    session.undo();
    expect(rgbaEquals(pixel(session, 4, 6), TRANSPARENT)).toBe(true);
    expect(session.canRedo).toBe(true);

    session.redo();
    expect(rgbaEquals(pixel(session, 4, 6), BLACK)).toBe(true);
  });

  it('erases with the eraser tool', () => {
    const session = new EditorSession();
    drag(session, [
      [0, 0],
      [7, 0],
    ]);
    session.setTool(ERASER_TOOL_ID);
    drag(session, [
      [2, 0],
      [5, 0],
    ]);

    expect(rgbaEquals(pixel(session, 0, 0), BLACK)).toBe(true);
    expect(rgbaEquals(pixel(session, 3, 0), TRANSPARENT)).toBe(true);
    expect(session.history.depth).toBe(2);
  });

  it('does not record a history entry for a stroke that painted nothing', () => {
    const session = new EditorSession();
    drag(session, [
      [-10, -10],
      [-4, 40],
    ]);
    expect(session.history.depth).toBe(0);
    expect(session.canUndo).toBe(false);
  });

  it('right-drag paints the background colour', () => {
    const session = new EditorSession();
    session.pointerDown(press(1, 1, 'right'));
    session.pointerUp(press(1, 1, 'none'));
    expect(rgbaEquals(pixel(session, 1, 1), session.background)).toBe(true);
  });
});

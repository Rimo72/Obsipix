import { describe, expect, it, vi } from 'vitest';

import { selectRectCommand } from '@core/document/editCommands';
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

describe('EditorSession selection & float', () => {
  function drawn(): EditorSession {
    const session = new EditorSession();
    const buffer = session.document.resolveBuffer(session.document.layers.activeLayerId);
    for (let x = 4; x < 8; x += 1) {
      for (let y = 4; y < 8; y += 1) {
        buffer?.setPixel(x, y, BLACK);
      }
    }
    session.runCommand(selectRectCommand({ x: 4, y: 4, width: 4, height: 4 }, 'replace'));
    return session;
  }

  it('nudge lifts the selection into a float and moves it; commit bakes it', () => {
    const session = drawn();
    const depthBefore = session.history.depth;

    session.nudge(3, 0);
    session.nudge(2, 0);
    expect(session.hasFloat).toBe(true);
    // the source hole is present while floating
    expect(rgbaEquals(pixel(session, 5, 5), TRANSPARENT)).toBe(true);

    session.commitFloat();
    expect(session.hasFloat).toBe(false);
    expect(session.history.depth).toBe(depthBefore + 1); // one entry for the whole transform
    expect(rgbaEquals(pixel(session, 9, 5), BLACK)).toBe(true); // moved +5
    expect(rgbaEquals(pixel(session, 4, 5), TRANSPARENT)).toBe(true);

    session.undo();
    expect(rgbaEquals(pixel(session, 5, 5), BLACK)).toBe(true); // back home
  });

  it('cancelFloat restores everything with no history entry', () => {
    const session = drawn();
    const depthBefore = session.history.depth;
    session.nudge(4, 4);
    session.cancelFloat();

    expect(session.hasFloat).toBe(false);
    expect(session.history.depth).toBe(depthBefore);
    expect(rgbaEquals(pixel(session, 5, 5), BLACK)).toBe(true);
  });

  it('flip transforms the float in place', () => {
    const session = new EditorSession();
    const buffer = session.document.resolveBuffer(session.document.layers.activeLayerId);
    buffer?.setPixel(4, 4, BLACK); // corner of a 3-wide selection
    session.runCommand(selectRectCommand({ x: 4, y: 4, width: 3, height: 1 }, 'replace'));

    session.nudge(0, 0); // create the float
    session.flip('horizontal');
    session.commitFloat();

    expect(rgbaEquals(pixel(session, 6, 4), BLACK)).toBe(true); // moved to the far side of the box
  });

  it('copy / paste round-trips a region', () => {
    const session = drawn();
    session.copy();
    session.deselect();
    session.paste();
    expect(session.canPaste).toBe(true);
    // the pasted 4x4 block sits centred; at least one black pixel exists somewhere new
    const buffer = session.document.resolveBuffer(session.document.layers.activeLayerId);
    let count = 0;
    for (let x = 0; x < 32; x += 1) {
      for (let y = 0; y < 32; y += 1) {
        if ((buffer?.getPixel(x, y).a ?? 0) > 0) {
          count += 1;
        }
      }
    }
    expect(count).toBeGreaterThanOrEqual(16 + 16); // original block + pasted block
  });

  it('switching tools commits a pending float', () => {
    const session = drawn();
    session.nudge(5, 0);
    session.setTool(ERASER_TOOL_ID);
    expect(session.hasFloat).toBe(false);
    expect(rgbaEquals(pixel(session, 9, 5), BLACK)).toBe(true);
  });
});

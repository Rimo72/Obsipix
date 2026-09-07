import { describe, expect, it } from 'vitest';

import { compositeDocument } from '@core/document/compositeDocument';
import { selectRectCommand } from '@core/document/editCommands';
import { parseDocument } from '@core/persistence/parse';
import { NO_MODIFIERS, type PointerInput } from '@core/tools/PointerInput';
import { ERASER_TOOL_ID } from '@core/tools/EraserTool';
import { RECT_SELECT_TOOL_ID } from '@core/tools/SelectTools';
import { BLACK, TRANSPARENT, rgbaEquals } from '@core/types/color';

import { EditorSession } from './EditorSession';

/**
 * Integration coverage across the subsystem boundaries (PROJECT_CORE §4):
 * Input → Tools → Commands → History → Document → (serialize) → parse, and
 * Document → Compositor. Unit tests own each piece; this asserts they compose.
 */

function press(x: number, y: number, button: 'left' | 'none' = 'left'): PointerInput {
  return {
    canvas: { x, y },
    pixel: { x, y },
    source: 'mouse',
    buttons: { left: button === 'left', right: false, middle: false },
    modifiers: NO_MODIFIERS,
    pressure: 1,
  };
}

function stroke(session: EditorSession, points: readonly [number, number][]): void {
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

describe('editor integration', () => {
  it('runs a whole editing session through every boundary and round-trips it', () => {
    const session = new EditorSession();

    // Input → tool → stroke command → history (one entry per stroke)
    stroke(session, [
      [2, 2],
      [10, 2],
    ]);
    expect(session.history.depth).toBe(1);

    session.setTool(ERASER_TOOL_ID);
    stroke(session, [
      [5, 2],
      [7, 2],
    ]);
    expect(session.history.depth).toBe(2);
    expect(rgbaEquals(compositeDocument(session.document).getPixel(6, 2), TRANSPARENT)).toBe(true);
    expect(rgbaEquals(compositeDocument(session.document).getPixel(2, 2), BLACK)).toBe(true);

    // selection + transform on the base layer/frame: a lift+move+commit is one
    // undoable entry, and the source pixel ends up empty.
    session.setTool(RECT_SELECT_TOOL_ID);
    session.runCommand(selectRectCommand({ x: 2, y: 2, width: 3, height: 1 }, 'replace'));
    const beforeFloat = session.history.depth;
    session.nudge(4, 0);
    session.commitFloat();
    expect(session.history.depth).toBe(beforeFloat + 1);
    expect(rgbaEquals(compositeDocument(session.document).getPixel(2, 2), TRANSPARENT)).toBe(true);
    expect(rgbaEquals(compositeDocument(session.document).getPixel(6, 2), BLACK)).toBe(true);
    session.deselect();

    // layers + animation, all through commands
    session.addLayer();
    session.addFrame();
    session.addFrame();
    expect(session.document.layers.count).toBe(2);
    expect(session.document.timeline.frameCount).toBe(3);

    // The session hands React nothing but a version number; the document it
    // exposes is the very object History owns (single source of truth).
    expect(session.document).toBe(session.history.document);
    expect(typeof session.getVersion()).toBe('number');

    // transient state (playback, cursor, float) is never in the model
    session.pointerMove(press(9, 9));
    session.play();
    const bytes = session.serialize();
    session.pause();

    const reloaded = parseDocument(bytes);
    // artwork survived every boundary: the moved pixel is where the float left it
    const firstFrame = reloaded.timeline.frames[0]?.id;
    expect(rgbaEquals(compositeDocument(reloaded, firstFrame).getPixel(6, 2), BLACK)).toBe(true);
    expect(rgbaEquals(compositeDocument(reloaded, firstFrame).getPixel(2, 2), TRANSPARENT)).toBe(
      true,
    );
    expect(reloaded.layers.count).toBe(2);
    expect(reloaded.timeline.frameCount).toBe(3);
    expect(reloaded.isDirty).toBe(false);

    // undo unwinds every committed entry back to a blank document
    while (session.canUndo) {
      session.undo();
    }
    expect(rgbaEquals(compositeDocument(session.document).getPixel(2, 2), TRANSPARENT)).toBe(true);
    expect(session.document.layers.count).toBe(1);
    expect(session.document.timeline.frameCount).toBe(1);
  });
});

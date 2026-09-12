import { afterEach, describe, expect, it, vi } from 'vitest';

import { selectRectCommand } from '@core/document/editCommands';
import { ERASER_TOOL_ID } from '@core/tools/EraserTool';
import { MAGIC_WAND_TOOL_ID } from '@core/tools/MagicWandTool';
import { PENCIL_TOOL_ID } from '@core/tools/PencilTool';
import { RECT_SELECT_TOOL_ID } from '@core/tools/SelectTools';
import { NO_MODIFIERS, type PointerInput } from '@core/tools/PointerInput';
import { BLACK, TRANSPARENT, rgbaEquals, type RGBA } from '@core/types/color';

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

describe('EditorSession magic wand — frame-scoped selection', () => {
  function twoFramesWithMatchingSquares(): EditorSession {
    const session = new EditorSession();
    session.addFrame();
    const frames = session.document.timeline.frames;
    const layerId = session.document.layers.activeLayerId;
    // an isolated black square at the same coordinates on both frames
    for (const frame of frames) {
      const buffer = session.document.ensureDrawableBuffer(layerId, frame.id);
      for (let x = 4; x < 8; x += 1) {
        for (let y = 4; y < 8; y += 1) {
          buffer.setPixel(x, y, BLACK);
        }
      }
    }
    session.setActiveFrame(frames[0]!.id);
    return session;
  }

  it('clears a wand selection when the active frame changes', () => {
    const session = twoFramesWithMatchingSquares();
    const frames = session.document.timeline.frames;
    session.setTool(MAGIC_WAND_TOOL_ID);
    session.pointerDown(press(5, 5));
    session.pointerUp(press(5, 5, 'none'));
    expect(session.document.selection.active).toBe(true);

    session.setActiveFrame(frames[1]!.id);
    expect(session.document.selection.active).toBe(false);
  });

  it('does not clear the selection when re-selecting the same frame', () => {
    const session = twoFramesWithMatchingSquares();
    const frames = session.document.timeline.frames;
    session.setTool(MAGIC_WAND_TOOL_ID);
    session.pointerDown(press(5, 5));
    session.pointerUp(press(5, 5, 'none'));

    session.setActiveFrame(frames[0]!.id); // same frame the selection was made on
    expect(session.document.selection.active).toBe(true);
  });

  it('leaves a Rectangle selection alone across a frame change', () => {
    const session = twoFramesWithMatchingSquares();
    const frames = session.document.timeline.frames;
    session.runCommand(selectRectCommand({ x: 4, y: 4, width: 4, height: 4 }, 'replace'));

    session.setActiveFrame(frames[1]!.id);
    expect(session.document.selection.active).toBe(true);
    expect(session.document.selection.bounds()).toEqual({ x: 4, y: 4, width: 4, height: 4 });
  });

  it('a wand selection followed by a Rectangle selection is no longer frame-scoped', () => {
    const session = twoFramesWithMatchingSquares();
    const frames = session.document.timeline.frames;
    session.setTool(MAGIC_WAND_TOOL_ID);
    session.pointerDown(press(5, 5));
    session.pointerUp(press(5, 5, 'none'));

    session.setTool(RECT_SELECT_TOOL_ID);
    session.pointerDown(press(0, 0));
    session.pointerUp(press(2, 2, 'none'));

    session.setActiveFrame(frames[1]!.id);
    expect(session.document.selection.active).toBe(true); // the rect selection survives
  });
});

describe('EditorSession animation', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  function threeFrames(): EditorSession {
    const session = new EditorSession();
    session.addFrame();
    session.addFrame();
    session.firstFrame();
    return session;
  }

  it('frame commands add history entries and update the active frame', () => {
    const session = new EditorSession();
    expect(session.document.timeline.frameCount).toBe(1);

    session.addFrame();
    expect(session.document.timeline.frameCount).toBe(2);
    expect(session.history.depth).toBe(1);

    session.duplicateActiveFrame();
    expect(session.document.timeline.frameCount).toBe(3);

    session.deleteActiveFrame();
    expect(session.document.timeline.frameCount).toBe(2);

    session.undo();
    expect(session.document.timeline.frameCount).toBe(3);
  });

  it('never deletes the last remaining frame', () => {
    const session = new EditorSession();
    session.deleteActiveFrame();
    expect(session.document.timeline.frameCount).toBe(1);
    expect(session.history.depth).toBe(0);
  });

  it('step navigation wraps and stays within the frame list', () => {
    const session = threeFrames();
    const ids = session.document.timeline.frames.map((frame) => frame.id);

    expect(session.document.timeline.activeFrameId).toBe(ids[0]);
    session.nextFrame();
    expect(session.document.timeline.activeFrameId).toBe(ids[1]);
    session.prevFrame();
    session.prevFrame();
    expect(session.document.timeline.activeFrameId).toBe(ids[2]); // wrapped
    session.lastFrame();
    expect(session.document.timeline.activeFrameId).toBe(ids[2]);
    session.firstFrame();
    expect(session.document.timeline.activeFrameId).toBe(ids[0]);
  });

  it('play requires at least two frames and toggles isPlaying', () => {
    const single = new EditorSession();
    single.play();
    expect(single.isPlaying).toBe(false);

    const session = threeFrames();
    session.play();
    expect(session.isPlaying).toBe(true);
    session.pause();
    expect(session.isPlaying).toBe(false);
  });

  it('advances frames during playback and loops', () => {
    vi.useFakeTimers();
    const session = threeFrames();
    session.applyFps(20); // 50ms per frame
    const ids = session.document.timeline.frames.map((frame) => frame.id);

    session.play();
    vi.advanceTimersByTime(50);
    expect(session.document.timeline.activeFrameId).toBe(ids[1]);
    vi.advanceTimersByTime(50);
    expect(session.document.timeline.activeFrameId).toBe(ids[2]);
    vi.advanceTimersByTime(50);
    expect(session.document.timeline.activeFrameId).toBe(ids[0]); // looped
    expect(session.isPlaying).toBe(true);

    session.pause();
  });

  it('play-once stops at the final frame', () => {
    vi.useFakeTimers();
    const session = threeFrames();
    session.applyFps(20);
    session.setPlayMode('once');
    const ids = session.document.timeline.frames.map((frame) => frame.id);

    session.play();
    vi.advanceTimersByTime(500);
    expect(session.document.timeline.activeFrameId).toBe(ids[2]);
    expect(session.isPlaying).toBe(false);
  });

  it('onion overlays are exposed when enabled and suppressed while playing', () => {
    const session = threeFrames();
    expect(session.onionOverlays()).toEqual([]);

    session.nextFrame(); // middle frame
    session.toggleOnionSkin();
    expect(session.onionSkin.enabled).toBe(true);
    expect(session.onionOverlays().length).toBe(2);

    session.play();
    expect(session.onionOverlays()).toEqual([]);
    session.pause();
  });

  it('onion-skin toggling is not an undoable command', () => {
    const session = threeFrames();
    const depth = session.history.depth;
    session.toggleOnionSkin();
    session.setOnionSkin({ previous: 3 });
    expect(session.history.depth).toBe(depth);
  });
});

describe('EditorSession lifecycle & import', () => {
  function image(width: number, height: number) {
    const data = new Uint8ClampedArray(width * height * 4).fill(255);
    return { width, height, data };
  }

  it('peekBytes serializes without committing a float or emitting', () => {
    const session = new EditorSession();
    const buffer = session.document.resolveBuffer(session.document.layers.activeLayerId);
    for (let x = 4; x < 8; x += 1) {
      buffer?.setPixel(x, 4, BLACK);
    }
    session.runCommand(selectRectCommand({ x: 4, y: 4, width: 4, height: 1 }, 'replace'));
    session.nudge(3, 0);
    expect(session.hasFloat).toBe(true);

    const version = session.getVersion();
    const bytes = session.peekBytes();
    expect(bytes.length).toBeGreaterThan(0);
    expect(session.hasFloat).toBe(true); // float untouched
    expect(session.getVersion()).toBe(version); // no emit
  });

  it('recover() loads bytes but leaves the document dirty', () => {
    const source = new EditorSession();
    source.pointerDown(press(2, 2));
    source.pointerUp(press(2, 2, 'none'));
    const bytes = source.serialize();

    const session = new EditorSession();
    session.recover(bytes, 'crash.obsipix');
    expect(session.isDirty).toBe(true);
    expect(session.fileName).toBe('crash.obsipix');
    expect(session.canUndo).toBe(false);
    expect(rgbaEquals(pixel(session, 2, 2), BLACK)).toBe(true);
  });

  it('importAsDocument replaces the project, resized and dirty', () => {
    const session = new EditorSession();
    session.importAsDocument(image(10, 6), 'logo');
    expect(session.document.dimensions).toEqual({ width: 10, height: 6 });
    expect(session.document.metadata.name).toBe('logo');
    expect(session.isDirty).toBe(true);
    expect(session.fileName).toBeNull();
  });

  it('importAsLayer adds an undoable top layer', () => {
    const session = new EditorSession();
    const before = session.document.layers.count;
    session.importAsLayer(image(4, 4), 'stamp');
    expect(session.document.layers.count).toBe(before + 1);
    expect(rgbaEquals(pixel(session, 0, 0), { r: 255, g: 255, b: 255, a: 255 })).toBe(true);
    session.undo();
    expect(session.document.layers.count).toBe(before);
  });

  it('importSpriteSheet replaces the project with a multi-frame animation', () => {
    const session = new EditorSession();
    session.importSpriteSheet(
      image(64, 32),
      { frameWidth: 32, frameHeight: 32, offsetX: 0, offsetY: 0, spacingX: 0, spacingY: 0 },
      'run',
    );
    expect(session.document.dimensions).toEqual({ width: 32, height: 32 });
    expect(session.document.timeline.frameCount).toBe(2);
    expect(session.document.metadata.name).toBe('run');
    expect(session.isDirty).toBe(true);
    expect(session.fileName).toBeNull();
    expect(session.canUndo).toBe(false);
  });

  it('a failed importSpriteSheet leaves the current document untouched', () => {
    const session = new EditorSession();
    const framesBefore = session.document.timeline.frameCount;
    expect(() =>
      session.importSpriteSheet(
        image(64, 32),
        { frameWidth: 30, frameHeight: 30, offsetX: 0, offsetY: 0, spacingX: 0, spacingY: 0 },
        'bad',
      ),
    ).toThrow();
    expect(session.document.timeline.frameCount).toBe(framesBefore);
    expect(session.isDirty).toBe(false);
  });
});

describe('EditorSession v2 additions', () => {
  it('newDocument honours a size preset and a solid background', () => {
    const session = new EditorSession();
    session.newDocument({ width: 48, height: 16, background: { r: 255, g: 255, b: 255, a: 255 } });
    expect(session.document.dimensions).toEqual({ width: 48, height: 16 });
    expect(pixel(session, 47, 15)).toEqual({ r: 255, g: 255, b: 255, a: 255 });
    expect(session.canUndo).toBe(false);
    expect(session.fileName).toBeNull();
  });

  it('newDocument with no options is the transparent 32×32 default', () => {
    const session = new EditorSession();
    session.newDocument();
    expect(session.document.dimensions).toEqual({ width: 32, height: 32 });
    expect(rgbaEquals(pixel(session, 0, 0), TRANSPARENT)).toBe(true);
  });

  it('setZoomLevel jumps to an absolute zoom', () => {
    const session = new EditorSession();
    session.setViewSize(400, 400);
    session.setZoomLevel(2);
    expect(session.viewport.zoom).toBeCloseTo(2);
    session.setZoomLevel(1);
    expect(session.viewport.zoom).toBeCloseTo(1);
  });

  it('eyedropper mode switches between merged and active-layer sampling', () => {
    const session = new EditorSession();
    // paint white on the base layer, then add an empty layer on top
    session.document.resolveBuffer(session.document.layers.activeLayerId)?.setPixel(3, 3, BLACK);
    session.addLayer();

    session.setEyedropperMerged(true);
    session.setTool('eyedropper');
    session.pointerDown(press(3, 3));
    session.pointerUp(press(3, 3, 'none'));
    expect(rgbaEquals(session.foreground, BLACK)).toBe(true); // sees through to the base layer

    session.setForeground({ r: 200, g: 200, b: 200, a: 255 });
    session.setEyedropperMerged(false);
    session.pointerDown(press(3, 3));
    session.pointerUp(press(3, 3, 'none'));
    expect(rgbaEquals(session.foreground, TRANSPARENT)).toBe(true); // top layer is empty there
  });

  it('invertSelection is undoable', () => {
    const session = new EditorSession();
    session.runCommand(selectRectCommand({ x: 0, y: 0, width: 4, height: 32 }, 'replace'));
    session.invertSelection();
    expect(session.document.selection.isSelected(0, 0)).toBe(false);
    expect(session.document.selection.isSelected(10, 10)).toBe(true);
    session.undo();
    expect(session.document.selection.isSelected(0, 0)).toBe(true);
  });
});

describe('EditorSession one-shot colour sample', () => {
  it('hands the next in-bounds pixel to the callback and disarms', () => {
    const session = new EditorSession();
    session.document.resolveBuffer(session.document.layers.activeLayerId)?.setPixel(5, 6, BLACK);

    const sampled: unknown[] = [];
    session.beginColorSample((color) => sampled.push(color));
    expect(session.isSamplingColor).toBe(true);

    session.sampleColorAt(5, 6);
    expect(sampled).toEqual([BLACK]);
    expect(session.isSamplingColor).toBe(false);
  });

  it('ignores a click outside the document and stays armed', () => {
    const session = new EditorSession();
    const sampled: unknown[] = [];
    session.beginColorSample((color) => sampled.push(color));

    session.sampleColorAt(-1, 0);
    session.sampleColorAt(999, 999);
    expect(sampled).toHaveLength(0);
    expect(session.isSamplingColor).toBe(true);

    session.cancelColorSample();
    expect(session.isSamplingColor).toBe(false);
  });

  it('honours the eyedropper merged / active-layer mode', () => {
    const session = new EditorSession();
    session.document.resolveBuffer(session.document.layers.activeLayerId)?.setPixel(2, 2, BLACK);
    session.addLayer(); // empty top layer

    session.setEyedropperMerged(false);
    const picks: RGBA[] = [];
    session.beginColorSample((c) => picks.push(c));
    session.sampleColorAt(2, 2);
    expect(picks).toHaveLength(1);
    expect(rgbaEquals(picks[0]!, TRANSPARENT)).toBe(true); // active layer is empty here
  });
});

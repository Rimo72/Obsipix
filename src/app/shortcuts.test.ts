import { describe, expect, it } from 'vitest';

import { MOVE_TOOL_ID } from '@core/tools/MoveTool';
import { PENCIL_TOOL_ID } from '@core/tools/PencilTool';
import { RECTANGLE_TOOL_ID } from '@core/tools/shapeTools';

import { resolveShortcut, type ShortcutContext } from './shortcuts';

type KeyEventInit = Pick<KeyboardEvent, 'key' | 'ctrlKey' | 'metaKey' | 'shiftKey' | 'altKey'>;

function key(k: string, mods: Partial<KeyEventInit> = {}): KeyEventInit {
  return { key: k, ctrlKey: false, metaKey: false, shiftKey: false, altKey: false, ...mods };
}

const IDLE: ShortcutContext = { editingText: false, hasFloat: false, timelineFocused: false };
const TIMELINE: ShortcutContext = { ...IDLE, timelineFocused: true };

describe('resolveShortcut (v2 keymap)', () => {
  it('yields completely while a text field is focused', () => {
    expect(resolveShortcut(key('s', { ctrlKey: true }), { ...IDLE, editingText: true })).toBeNull();
    expect(resolveShortcut(key(' '), { ...IDLE, editingText: true })).toBeNull();
  });

  it('distinguishes Save / Save As and Select All / Deselect / Invert', () => {
    expect(resolveShortcut(key('s', { ctrlKey: true }), IDLE)).toMatchObject({ command: 'save' });
    expect(resolveShortcut(key('s', { ctrlKey: true, shiftKey: true }), IDLE)).toMatchObject({
      command: 'save-as',
    });
    expect(resolveShortcut(key('a', { ctrlKey: true }), IDLE)).toMatchObject({
      command: 'select-all',
    });
    expect(resolveShortcut(key('a', { ctrlKey: true, shiftKey: true }), IDLE)).toMatchObject({
      command: 'deselect',
    });
    expect(resolveShortcut(key('i', { ctrlKey: true, shiftKey: true }), IDLE)).toMatchObject({
      command: 'invert-selection',
    });
    // Ctrl+I on its own is not bound
    expect(resolveShortcut(key('i', { ctrlKey: true }), IDLE)).toBeNull();
  });

  it('Space toggles playback only while the timeline is focused', () => {
    expect(resolveShortcut(key(' '), IDLE)).toBeNull(); // canvas: hold-to-pan, owned by CanvasStage
    expect(resolveShortcut(key(' '), TIMELINE)).toMatchObject({ command: 'toggle-play' });
  });

  it('arrows nudge on the canvas but step frames in the timeline', () => {
    expect(resolveShortcut(key('ArrowLeft'), IDLE)).toMatchObject({ command: 'nudge-left' });
    expect(resolveShortcut(key('ArrowLeft'), TIMELINE)).toMatchObject({ command: 'prev-frame' });
    expect(resolveShortcut(key('ArrowRight'), TIMELINE)).toMatchObject({ command: 'next-frame' });
  });

  it('a live float claims Enter / Escape before the tool layer', () => {
    const floating: ShortcutContext = { ...IDLE, hasFloat: true };
    expect(resolveShortcut(key('Enter'), floating)).toMatchObject({ command: 'commit-float' });
    expect(resolveShortcut(key('Enter'), IDLE)).toBeNull();
    expect(resolveShortcut(key('Escape'), IDLE)).toMatchObject({ command: 'cancel-float' });
  });

  it('maps the v2 tool letters (R = Rectangle, M = Move)', () => {
    expect(resolveShortcut(key('b'), IDLE)).toEqual({
      kind: 'tool',
      toolId: PENCIL_TOOL_ID,
      preventDefault: false,
    });
    expect(resolveShortcut(key('r'), IDLE)).toMatchObject({ toolId: RECTANGLE_TOOL_ID });
    expect(resolveShortcut(key('m'), IDLE)).toMatchObject({ toolId: MOVE_TOOL_ID });
    // U and V are no longer tool keys
    expect(resolveShortcut(key('u'), IDLE)).toBeNull();
    expect(resolveShortcut(key('v'), IDLE)).toBeNull();
  });

  it('resolves frame stepping and view keys', () => {
    expect(resolveShortcut(key(','), IDLE)).toMatchObject({ command: 'prev-frame' });
    expect(resolveShortcut(key('.'), IDLE)).toMatchObject({ command: 'next-frame' });
    expect(resolveShortcut(key('Home'), IDLE)).toMatchObject({ command: 'first-frame' });
    expect(resolveShortcut(key('+'), IDLE)).toMatchObject({ command: 'zoom-in' });
    expect(resolveShortcut(key('0'), IDLE)).toMatchObject({ command: 'fit' });
    expect(resolveShortcut(key('1'), IDLE)).toMatchObject({ command: 'zoom-100' });
    expect(resolveShortcut(key('2'), IDLE)).toMatchObject({ command: 'zoom-200' });
    expect(resolveShortcut(key('?'), IDLE)).toMatchObject({ command: 'help' });
  });

  it('Ctrl+X is cut but a bare X swaps colours', () => {
    expect(resolveShortcut(key('x', { ctrlKey: true }), IDLE)).toMatchObject({ command: 'cut' });
    expect(resolveShortcut(key('x'), IDLE)).toMatchObject({ command: 'swap-colors' });
  });

  it('returns null for unmapped keys', () => {
    expect(resolveShortcut(key('k', { ctrlKey: true }), IDLE)).toBeNull();
    expect(resolveShortcut(key('F5'), IDLE)).toBeNull();
  });
});

import { describe, expect, it } from 'vitest';

import { PENCIL_TOOL_ID } from '@core/tools/PencilTool';

import { resolveShortcut, type ShortcutContext } from './shortcuts';

type KeyEventInit = Pick<KeyboardEvent, 'key' | 'ctrlKey' | 'metaKey' | 'shiftKey' | 'altKey'>;

function key(k: string, mods: Partial<KeyEventInit> = {}): KeyEventInit {
  return { key: k, ctrlKey: false, metaKey: false, shiftKey: false, altKey: false, ...mods };
}

const IDLE: ShortcutContext = { editingText: false, hasFloat: false };

describe('resolveShortcut', () => {
  it('yields completely while a text field is focused', () => {
    expect(resolveShortcut(key('s', { ctrlKey: true }), { ...IDLE, editingText: true })).toBeNull();
    expect(resolveShortcut(key(' '), { ...IDLE, editingText: true })).toBeNull();
  });

  it('resolves the file shortcuts, distinguishing Save from Save As', () => {
    expect(resolveShortcut(key('s', { ctrlKey: true }), IDLE)).toMatchObject({ command: 'save' });
    expect(resolveShortcut(key('s', { ctrlKey: true, shiftKey: true }), IDLE)).toMatchObject({
      command: 'save-as',
    });
    expect(resolveShortcut(key('z', { metaKey: true }), IDLE)).toMatchObject({ command: 'undo' });
    expect(resolveShortcut(key('z', { metaKey: true, shiftKey: true }), IDLE)).toMatchObject({
      command: 'redo',
    });
  });

  it('Space is play/pause, not canvas navigation', () => {
    expect(resolveShortcut(key(' '), IDLE)).toMatchObject({ command: 'toggle-play' });
  });

  it('Ctrl+X is cut but a bare X swaps colours', () => {
    expect(resolveShortcut(key('x', { ctrlKey: true }), IDLE)).toMatchObject({ command: 'cut' });
    expect(resolveShortcut(key('x'), IDLE)).toMatchObject({ command: 'swap-colors' });
  });

  it('a live float claims Enter / Escape / arrows before the tool layer', () => {
    const floating: ShortcutContext = { editingText: false, hasFloat: true };
    expect(resolveShortcut(key('Enter'), floating)).toMatchObject({ command: 'commit-float' });
    expect(resolveShortcut(key('Enter'), IDLE)).toBeNull();
    expect(resolveShortcut(key('Escape'), IDLE)).toMatchObject({ command: 'cancel-float' });
    expect(resolveShortcut(key('ArrowLeft'), IDLE)).toMatchObject({ command: 'nudge-left' });
  });

  it('maps a bare letter to its tool', () => {
    expect(resolveShortcut(key('b'), IDLE)).toEqual({
      kind: 'tool',
      toolId: PENCIL_TOOL_ID,
      preventDefault: false,
    });
    // modifier + same letter is not a tool switch
    expect(resolveShortcut(key('b', { shiftKey: true }), IDLE)).toBeNull();
  });

  it('resolves timeline and view keys', () => {
    expect(resolveShortcut(key(','), IDLE)).toMatchObject({ command: 'prev-frame' });
    expect(resolveShortcut(key('.'), IDLE)).toMatchObject({ command: 'next-frame' });
    expect(resolveShortcut(key('Home'), IDLE)).toMatchObject({ command: 'first-frame' });
    expect(resolveShortcut(key('+'), IDLE)).toMatchObject({ command: 'zoom-in' });
    expect(resolveShortcut(key('0'), IDLE)).toMatchObject({ command: 'fit' });
    expect(resolveShortcut(key('?'), IDLE)).toMatchObject({ command: 'help' });
  });

  it('returns null for unmapped keys', () => {
    expect(resolveShortcut(key('k', { ctrlKey: true }), IDLE)).toBeNull();
    expect(resolveShortcut(key('F5'), IDLE)).toBeNull();
  });
});

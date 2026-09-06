import { TOOL_SHORTCUTS } from './toolCatalog';

/**
 * The V1 keyboard map and its conflict resolution (PROJECT_CORE §3.14, §12.6).
 *
 * Deterministic precedence, highest first:
 *
 *   1. Modal interaction        — the shortcut-help overlay (handled in the UI)
 *   2. Transform / selection    — a live floating selection: Enter / Escape / arrows
 *   3. Active tool              — single-letter tool switches
 *   4. Timeline interaction     — Space, "," ".", Home / End
 *   5. Canvas navigation        — "+" "-" "0"
 *   6. Global                   — Ctrl/Cmd combos, X, Delete, "?"
 *
 * Space is resolved explicitly to **play/pause** (tier 4). Canvas panning is on
 * middle-drag, never Space, so the two never actually collide.
 *
 * While a text field is focused the map yields entirely — the field owns every
 * key.
 */

export type ShortcutCommand =
  | 'undo'
  | 'redo'
  | 'save'
  | 'save-as'
  | 'open'
  | 'new'
  | 'select-all'
  | 'deselect'
  | 'copy'
  | 'cut'
  | 'paste'
  | 'delete'
  | 'swap-colors'
  | 'commit-float'
  | 'cancel-float'
  | 'nudge-left'
  | 'nudge-right'
  | 'nudge-up'
  | 'nudge-down'
  | 'toggle-play'
  | 'prev-frame'
  | 'next-frame'
  | 'first-frame'
  | 'last-frame'
  | 'zoom-in'
  | 'zoom-out'
  | 'fit'
  | 'help';

export interface ShortcutContext {
  /** A text input / textarea has focus — the map yields completely. */
  readonly editingText: boolean;
  /** A floating selection is live (tier 2 keys become active). */
  readonly hasFloat: boolean;
}

export type ShortcutResolution =
  | {
      readonly kind: 'command';
      readonly command: ShortcutCommand;
      readonly preventDefault: boolean;
    }
  | { readonly kind: 'tool'; readonly toolId: string; readonly preventDefault: boolean };

function command(command: ShortcutCommand, preventDefault = true): ShortcutResolution {
  return { kind: 'command', command, preventDefault };
}

const ARROW_NUDGE: Readonly<Record<string, ShortcutCommand>> = {
  arrowleft: 'nudge-left',
  arrowright: 'nudge-right',
  arrowup: 'nudge-up',
  arrowdown: 'nudge-down',
};

/** Resolve one keydown to a single action, or `null` to let it through. */
export function resolveShortcut(
  event: Pick<KeyboardEvent, 'key' | 'ctrlKey' | 'metaKey' | 'shiftKey' | 'altKey'>,
  context: ShortcutContext,
): ShortcutResolution | null {
  if (context.editingText) {
    return null;
  }

  const key = event.key.toLowerCase();
  const mod = event.ctrlKey || event.metaKey;

  // --- Tier 6a: global modifier combos -------------------------------------
  if (mod) {
    switch (key) {
      case 'z':
        return command(event.shiftKey ? 'redo' : 'undo');
      case 'y':
        return command('redo');
      case 's':
        return command(event.shiftKey ? 'save-as' : 'save');
      case 'o':
        return command('open');
      case 'n':
        return command('new');
      case 'a':
        return command('select-all');
      case 'd':
        return command('deselect');
      case 'c':
        return command('copy', false);
      case 'x':
        return command('cut');
      case 'v':
        return command('paste', false);
      default:
        return null;
    }
  }

  // --- Tier 2: live floating selection ------------------------------------
  if (context.hasFloat && key === 'enter') {
    return command('commit-float');
  }
  if (key === 'escape') {
    return command('cancel-float', false);
  }
  if (key in ARROW_NUDGE) {
    return command(ARROW_NUDGE[key] ?? 'nudge-left');
  }

  // --- Tier 3: active tool ---------------------------------------------------
  if (!event.shiftKey && !event.altKey && key in TOOL_SHORTCUTS) {
    const toolId = TOOL_SHORTCUTS[key];
    if (toolId) {
      return { kind: 'tool', toolId, preventDefault: false };
    }
  }

  // --- Tier 4: timeline ----------------------------------------------------
  switch (key) {
    case ' ':
      return command('toggle-play');
    case ',':
      return command('prev-frame');
    case '.':
      return command('next-frame');
    case 'home':
      return command('first-frame');
    case 'end':
      return command('last-frame');
    default:
      break;
  }

  // --- Tier 5: canvas navigation -----------------------------------------
  switch (key) {
    case '+':
    case '=':
      return command('zoom-in');
    case '-':
      return command('zoom-out');
    case '0':
      return command('fit');
    default:
      break;
  }

  // --- Tier 6b: global plain keys --------------------------------------
  switch (key) {
    case 'x':
      return command('swap-colors', false);
    case 'delete':
    case 'backspace':
      return command('delete');
    case '?':
      return command('help');
    default:
      return null;
  }
}

/** Human-readable shortcut reference, for the help overlay. */
export const SHORTCUT_REFERENCE: readonly {
  readonly group: string;
  readonly items: readonly { readonly keys: string; readonly label: string }[];
}[] = [
  {
    group: 'File',
    items: [
      { keys: 'Ctrl+N', label: 'New project' },
      { keys: 'Ctrl+O', label: 'Open project' },
      { keys: 'Ctrl+S', label: 'Save' },
      { keys: 'Ctrl+Shift+S', label: 'Save As' },
    ],
  },
  {
    group: 'Edit',
    items: [
      { keys: 'Ctrl+Z', label: 'Undo' },
      { keys: 'Ctrl+Shift+Z / Ctrl+Y', label: 'Redo' },
      { keys: 'Ctrl+A', label: 'Select all' },
      { keys: 'Ctrl+D', label: 'Deselect' },
      { keys: 'Ctrl+C / Ctrl+X / Ctrl+V', label: 'Copy / Cut / Paste' },
      { keys: 'Delete', label: 'Delete selection' },
      { keys: 'X', label: 'Swap colours' },
    ],
  },
  {
    group: 'Selection',
    items: [
      { keys: 'Arrows', label: 'Nudge / lift floating selection' },
      { keys: 'Enter', label: 'Commit floating selection' },
      { keys: 'Escape', label: 'Cancel floating selection' },
    ],
  },
  {
    group: 'Timeline',
    items: [
      { keys: 'Space', label: 'Play / pause' },
      { keys: ', / .', label: 'Previous / next frame' },
      { keys: 'Home / End', label: 'First / last frame' },
    ],
  },
  {
    group: 'View',
    items: [
      { keys: '+ / -', label: 'Zoom in / out' },
      { keys: '0', label: 'Fit to window' },
      { keys: '?', label: 'This help' },
    ],
  },
  {
    group: 'Tools',
    items: [
      { keys: 'B / E / I / G', label: 'Pencil / Eraser / Pick / Fill' },
      { keys: 'L / U / O', label: 'Line / Rectangle / Ellipse' },
      { keys: 'M / Q / V', label: 'Select / Lasso / Move' },
    ],
  },
];

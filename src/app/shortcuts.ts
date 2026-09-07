import { TOOL_SHORTCUTS } from './toolCatalog';

/**
 * The V1 keyboard map and its conflict resolution (PROJECT_CORE §17, §95).
 *
 * Deterministic precedence, highest first (PROJECT_CORE §95.8):
 *
 *   1. Focused text input       — the map yields entirely
 *   2. Modal dialog             — handled by the dialog itself
 *   3. Transform / selection    — a live floating selection: Enter / Escape / arrows
 *   4. Active tool              — single-letter tool switches
 *   5. Timeline interaction     — Space / arrows / Home / End when the timeline is focused
 *   6. Canvas navigation        — "+" "-" "0" "1" "2"
 *   7. Global                   — Ctrl/Cmd combos, X, Delete, "?"
 *
 * Space is context-sensitive (PROJECT_CORE §17, §38, §95.7): while the timeline
 * is focused it toggles playback; otherwise it is hold-to-pan on the canvas
 * (owned by CanvasStage, not this map).
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
  | 'invert-selection'
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
  | 'zoom-100'
  | 'zoom-200'
  | 'fit'
  | 'help';

export interface ShortcutContext {
  /** A text input / textarea / select has focus — the map yields completely. */
  readonly editingText: boolean;
  /** A floating selection is live (transform keys become active). */
  readonly hasFloat: boolean;
  /** Focus is within the timeline panel — Space and arrows drive playback/frames. */
  readonly timelineFocused: boolean;
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

  // --- Tier 7a: global modifier combos -----------------------------------
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
        return command(event.shiftKey ? 'deselect' : 'select-all');
      case 'i':
        return event.shiftKey ? command('invert-selection') : null;
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

  // --- Tier 3: live floating selection ----------------------------------
  if (context.hasFloat && key === 'enter') {
    return command('commit-float');
  }
  if (key === 'escape') {
    return command('cancel-float', false);
  }

  // --- Tier 5: timeline (when it holds focus) --------------------------
  if (context.timelineFocused) {
    switch (key) {
      case ' ':
        return command('toggle-play');
      case 'arrowleft':
        return command('prev-frame');
      case 'arrowright':
        return command('next-frame');
      case 'home':
        return command('first-frame');
      case 'end':
        return command('last-frame');
      default:
        break;
    }
  }

  // arrows nudge / lift the floating selection when the canvas has focus
  if (key in ARROW_NUDGE) {
    return command(ARROW_NUDGE[key] ?? 'nudge-left');
  }

  // --- Tier 4: active tool -------------------------------------------------
  if (!event.shiftKey && !event.altKey && key in TOOL_SHORTCUTS) {
    const toolId = TOOL_SHORTCUTS[key];
    if (toolId) {
      return { kind: 'tool', toolId, preventDefault: false };
    }
  }

  // --- Tier 5b: frame stepping (Obsipix convenience, any focus) --------
  switch (key) {
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

  // --- Tier 6: canvas navigation -------------------------------------
  switch (key) {
    case '+':
    case '=':
      return command('zoom-in');
    case '-':
      return command('zoom-out');
    case '0':
      return command('fit');
    case '1':
      return command('zoom-100');
    case '2':
      return command('zoom-200');
    default:
      break;
  }

  // --- Tier 7b: global plain keys -----------------------------------
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
      { keys: 'Ctrl+Shift+A', label: 'Deselect' },
      { keys: 'Ctrl+Shift+I', label: 'Invert selection' },
      { keys: 'Ctrl+C / Ctrl+X / Ctrl+V', label: 'Copy / Cut / Paste' },
      { keys: 'Delete', label: 'Delete selection' },
      { keys: 'X', label: 'Swap colours' },
    ],
  },
  {
    group: 'Selection & transform',
    items: [
      { keys: 'Arrows', label: 'Nudge / lift floating selection' },
      { keys: 'Enter', label: 'Commit floating selection' },
      { keys: 'Escape', label: 'Cancel floating selection' },
    ],
  },
  {
    group: 'Timeline (when focused)',
    items: [
      { keys: 'Space', label: 'Play / pause' },
      { keys: '← / →  or  , / .', label: 'Previous / next frame' },
      { keys: 'Home / End', label: 'First / last frame' },
    ],
  },
  {
    group: 'View',
    items: [
      { keys: 'Space + drag', label: 'Pan the canvas' },
      { keys: '+ / -', label: 'Zoom in / out' },
      { keys: '0', label: 'Fit to window' },
      { keys: '1 / 2', label: 'Zoom 100% / 200%' },
      { keys: '?', label: 'This help' },
    ],
  },
  {
    group: 'Tools',
    items: [
      { keys: 'B / E / I / G', label: 'Pencil / Eraser / Eyedropper / Fill' },
      { keys: 'L / R / O', label: 'Line / Rectangle / Ellipse' },
      { keys: 'S / Q / M', label: 'Select / Lasso / Move' },
    ],
  },
];

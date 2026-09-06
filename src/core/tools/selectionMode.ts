import type { SelectionMode } from '@core/document/Selection';

import type { PointerModifiers } from './PointerInput';

/** Photoshop-style modifier mapping (PROJECT_CORE §3.6). */
export function selectionModeFrom(modifiers: PointerModifiers): SelectionMode {
  if (modifiers.shift && modifiers.alt) {
    return 'intersect';
  }
  if (modifiers.shift) {
    return 'add';
  }
  if (modifiers.alt) {
    return 'subtract';
  }
  return 'replace';
}

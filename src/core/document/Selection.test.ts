import { describe, expect, it } from 'vitest';

import { SelectionState } from './Selection';

function selection(width = 8, height = 8): SelectionState {
  return new SelectionState({ width, height });
}

describe('SelectionState', () => {
  it('treats every pixel as editable while inactive', () => {
    const state = selection();
    expect(state.active).toBe(false);
    expect(state.isSelected(3, 3)).toBe(true);
  });

  it('applyRect replace selects only the rectangle', () => {
    const state = selection();
    state.applyRect({ x: 2, y: 2, width: 3, height: 2 }, 'replace');
    expect(state.active).toBe(true);
    expect(state.isSelected(2, 2)).toBe(true);
    expect(state.isSelected(4, 3)).toBe(true);
    expect(state.isSelected(5, 3)).toBe(false);
    expect(state.isSelected(0, 0)).toBe(false);
    expect(state.bounds()).toEqual({ x: 2, y: 2, width: 3, height: 2 });
  });

  it('combines rectangles with add / subtract / intersect', () => {
    const state = selection();
    state.applyRect({ x: 0, y: 0, width: 4, height: 4 }, 'replace');
    state.applyRect({ x: 3, y: 3, width: 4, height: 4 }, 'add');
    expect(state.isSelected(6, 6)).toBe(true);

    state.applyRect({ x: 3, y: 3, width: 4, height: 4 }, 'subtract');
    expect(state.isSelected(6, 6)).toBe(false);
    expect(state.isSelected(1, 1)).toBe(true);

    state.applyRect({ x: 0, y: 0, width: 2, height: 8 }, 'intersect');
    expect(state.isSelected(1, 1)).toBe(true);
    expect(state.isSelected(2, 1)).toBe(false);
  });

  it('deactivates when a subtraction empties it', () => {
    const state = selection();
    state.applyRect({ x: 1, y: 1, width: 2, height: 2 }, 'replace');
    state.applyRect({ x: 0, y: 0, width: 8, height: 8 }, 'subtract');
    expect(state.active).toBe(false);
    expect(state.bounds()).toBeNull();
  });

  it('applyShape selects an arbitrary set of pixels', () => {
    const state = selection();
    state.applyShape((x, y) => x === y, 'replace');
    expect(state.isSelected(3, 3)).toBe(true);
    expect(state.isSelected(3, 4)).toBe(false);
  });

  it('snapshots and restores the mask', () => {
    const state = selection();
    state.applyRect({ x: 1, y: 1, width: 3, height: 3 }, 'replace');
    const snap = state.snapshotMask();

    state.deselect();
    expect(state.active).toBe(false);

    state.restoreMask(snap, true);
    expect(state.active).toBe(true);
    expect(state.isSelected(2, 2)).toBe(true);
  });

  it('resize keeps the top-left overlap', () => {
    const state = selection(8, 8);
    state.applyRect({ x: 0, y: 0, width: 8, height: 8 }, 'replace');
    state.resize({ width: 4, height: 4 });
    expect(state.dimensions).toEqual({ width: 4, height: 4 });
    expect(state.isSelected(3, 3)).toBe(true);
    expect(() => state.isSelected(5, 5)).not.toThrow();
    expect(state.isSelected(5, 5)).toBe(false);
  });

  it('clone is independent', () => {
    const state = selection();
    state.applyRect({ x: 0, y: 0, width: 2, height: 2 }, 'replace');
    const copy = state.clone();
    state.deselect();
    expect(copy.isSelected(0, 0)).toBe(true);
    expect(state.active).toBe(false);
  });
});

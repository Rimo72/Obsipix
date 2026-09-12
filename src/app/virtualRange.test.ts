import { describe, expect, it } from 'vitest';

import { horizontalVirtualRange } from './virtualRange';

describe('horizontalVirtualRange', () => {
  it('renders everything when the container has not been measured yet', () => {
    expect(horizontalVirtualRange(0, 0, 60, 200, 6)).toEqual({ start: 0, end: 200 });
  });

  it('renders everything when it all fits with room to spare', () => {
    expect(horizontalVirtualRange(0, 800, 60, 3, 6)).toEqual({ start: 0, end: 3 });
  });

  it('windows to the visible items plus a buffer on each side, scrolled to the start', () => {
    // 600px viewport / 60px items = 10 visible; +6 buffer only applies where room allows
    const range = horizontalVirtualRange(0, 600, 60, 200, 6);
    expect(range.start).toBe(0); // clamped — can't buffer before index 0
    expect(range.end).toBe(16); // 10 visible + 6 buffer after
  });

  it('windows around a mid-scroll position', () => {
    // scrolled to item 50 (scrollLeft 3000), 600px viewport
    const range = horizontalVirtualRange(3000, 600, 60, 200, 6);
    expect(range.start).toBe(44); // 50 - 6
    expect(range.end).toBe(66); // (3000+600)/60=60, +6 buffer
  });

  it('clamps the end to the item count near the end of the list', () => {
    const range = horizontalVirtualRange(11400, 600, 60, 200, 6);
    expect(range.end).toBe(200);
    expect(range.start).toBeLessThan(200);
  });

  it('returns an empty range for an empty list', () => {
    expect(horizontalVirtualRange(0, 600, 60, 0, 6)).toEqual({ start: 0, end: 0 });
  });
});

import { describe, expect, it } from 'vitest';

import { constrainLine, constrainToSquare, ellipseOutline, rectangleOutline } from './shapes';

describe('rectangleOutline', () => {
  it('is a hollow border with the right corners', () => {
    const points = rectangleOutline({ x: 1, y: 1 }, { x: 4, y: 3 });
    const set = new Set(points.map((p) => `${String(p.x)},${String(p.y)}`));
    expect(set.has('1,1')).toBe(true);
    expect(set.has('4,3')).toBe(true);
    expect(set.has('4,1')).toBe(true);
    expect(set.has('1,3')).toBe(true);
    expect(set.has('2,2')).toBe(false); // interior is empty
  });

  it('is a single pixel for a zero-size box', () => {
    expect(rectangleOutline({ x: 5, y: 5 }, { x: 5, y: 5 })).toEqual([{ x: 5, y: 5 }]);
  });
});

describe('ellipseOutline', () => {
  it('traces a closed loop around the box', () => {
    const points = ellipseOutline({ x: 0, y: 0 }, { x: 10, y: 8 });
    expect(points.length).toBeGreaterThan(12);
    for (const point of points) {
      expect(point.x).toBeGreaterThanOrEqual(0);
      expect(point.x).toBeLessThanOrEqual(10);
      expect(point.y).toBeGreaterThanOrEqual(0);
      expect(point.y).toBeLessThanOrEqual(8);
    }
    // the top and bottom of the ellipse sit near the centre column
    const cxs = points.filter((p) => p.y === 0 || p.y === 8).map((p) => p.x);
    expect(Math.min(...cxs)).toBeGreaterThanOrEqual(3);
    expect(Math.max(...cxs)).toBeLessThanOrEqual(7);
  });
});

describe('constrain helpers', () => {
  it('constrainToSquare equalises the two axes', () => {
    const b = constrainToSquare({ x: 0, y: 0 }, { x: 10, y: 3 });
    expect(Math.abs(b.x)).toBe(Math.abs(b.y));
  });

  it('constrainLine snaps a shallow drag to horizontal', () => {
    expect(constrainLine({ x: 0, y: 0 }, { x: 10, y: 1 })).toEqual({ x: 10, y: 0 });
  });

  it('constrainLine snaps a steep drag to vertical', () => {
    expect(constrainLine({ x: 0, y: 0 }, { x: 1, y: 10 })).toEqual({ x: 0, y: 10 });
  });

  it('constrainLine snaps a diagonal drag to 45°', () => {
    expect(constrainLine({ x: 0, y: 0 }, { x: 8, y: 7 })).toEqual({ x: 8, y: 8 });
  });
});

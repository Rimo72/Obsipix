import { describe, expect, it } from 'vitest';

import { Viewport } from '@rendering/Viewport';

import { hitTestGuide } from './guideHitTest';

describe('hitTestGuide', () => {
  it('finds a horizontal guide within tolerance', () => {
    const viewport = new Viewport({ zoom: 2, panX: 0, panY: 0 });
    const guides = { horizontal: [10], vertical: [] };
    expect(hitTestGuide({ x: 50, y: 20 }, guides, viewport)).toEqual({
      axis: 'horizontal',
      index: 0,
    });
  });

  it('finds a vertical guide within tolerance', () => {
    const viewport = new Viewport({ zoom: 2, panX: 0, panY: 0 });
    const guides = { horizontal: [], vertical: [5] };
    expect(hitTestGuide({ x: 10, y: 50 }, guides, viewport)).toEqual({
      axis: 'vertical',
      index: 0,
    });
  });

  it('returns null when nothing is within tolerance', () => {
    const viewport = new Viewport({ zoom: 2, panX: 0, panY: 0 });
    const guides = { horizontal: [10], vertical: [5] };
    expect(hitTestGuide({ x: 200, y: 200 }, guides, viewport)).toBeNull();
  });

  it('accounts for pan and zoom', () => {
    const viewport = new Viewport({ zoom: 4, panX: 100, panY: 50 });
    // document y=10 sits at canvas y = 50 + 10*4 = 90
    const guides = { horizontal: [10], vertical: [] };
    expect(hitTestGuide({ x: 0, y: 90 }, guides, viewport)).toEqual({
      axis: 'horizontal',
      index: 0,
    });
    expect(hitTestGuide({ x: 0, y: 90 }, guides, viewport, 1)).toEqual({
      axis: 'horizontal',
      index: 0,
    });
  });

  it('picks the closer axis when both are within tolerance', () => {
    const viewport = new Viewport({ zoom: 1, panX: 0, panY: 0 });
    const guides = { horizontal: [10], vertical: [11] };
    // canvas point (11, 12): distance to horizontal guide (y=10) is 2, to vertical guide (x=11) is 0
    expect(hitTestGuide({ x: 11, y: 12 }, guides, viewport)).toEqual({
      axis: 'vertical',
      index: 0,
    });
  });

  it('picks the closest guide among several on the same axis', () => {
    const viewport = new Viewport({ zoom: 1, panX: 0, panY: 0 });
    const guides = { horizontal: [10, 20, 30], vertical: [] };
    expect(hitTestGuide({ x: 0, y: 21 }, guides, viewport)).toEqual({
      axis: 'horizontal',
      index: 1,
    });
  });
});

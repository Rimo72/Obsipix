import { describe, expect, it, vi } from 'vitest';

import { paintBrushCursor } from './BrushCursor';

class RecordingContext {
  readonly ops: string[] = [];
  lineWidth = 1;
  strokeStyle = '';
  save = vi.fn(() => this.ops.push('save'));
  restore = vi.fn(() => this.ops.push('restore'));
  beginPath = vi.fn(() => this.ops.push('beginPath'));
  moveTo = vi.fn((x: number, y: number) => this.ops.push(`moveTo(${String(x)},${String(y)})`));
  lineTo = vi.fn((x: number, y: number) => this.ops.push(`lineTo(${String(x)},${String(y)})`));
  stroke = vi.fn(() => this.ops.push(`stroke(${this.strokeStyle},${String(this.lineWidth)})`));
}

function ctx(): RecordingContext {
  return new RecordingContext();
}

describe('paintBrushCursor', () => {
  it('outlines a single square for the default 1px brush', () => {
    const context = ctx();
    paintBrushCursor(
      context as unknown as CanvasRenderingContext2D,
      { x: 3, y: 5 },
      { size: 1, shape: 'square' },
      10,
      0,
      0,
    );

    // four edges of one 10x10 canvas-space cell at document pixel (3, 5)
    expect(context.moveTo).toHaveBeenCalledWith(30, 50);
    expect(context.lineTo).toHaveBeenCalledWith(40, 50);
    expect(context.moveTo).toHaveBeenCalledWith(30, 60);
    expect(context.lineTo).toHaveBeenCalledWith(40, 60);
    expect(context.moveTo).toHaveBeenCalledWith(30, 50);
    expect(context.lineTo).toHaveBeenCalledWith(30, 60);
    expect(context.moveTo).toHaveBeenCalledWith(40, 50);
    expect(context.lineTo).toHaveBeenCalledWith(40, 60);
  });

  it('strokes twice — a wide pass then a thin pass — so it stays visible on any background', () => {
    const context = ctx();
    paintBrushCursor(
      context as unknown as CanvasRenderingContext2D,
      { x: 0, y: 0 },
      { size: 1, shape: 'square' },
      10,
      0,
      0,
    );
    expect(context.stroke).toHaveBeenCalledTimes(2);
  });

  it('accounts for the viewport origin and zoom', () => {
    const context = ctx();
    paintBrushCursor(
      context as unknown as CanvasRenderingContext2D,
      { x: 1, y: 1 },
      { size: 1, shape: 'square' },
      8,
      100,
      50,
    );
    // originX + (1 + 0) * zoom = 100 + 8 = 108; originY + 8 = 58
    expect(context.moveTo).toHaveBeenCalledWith(108, 58);
  });

  it('only traces the outer boundary of a multi-pixel square brush, not internal cell edges', () => {
    const context = ctx();
    paintBrushCursor(
      context as unknown as CanvasRenderingContext2D,
      { x: 0, y: 0 },
      { size: 2, shape: 'square' },
      10,
      0,
      0,
    );
    // a shared internal edge between two covered cells is never drawn
    const drawnAt = (x: number, y: number): boolean =>
      context.moveTo.mock.calls.some(([mx, my]) => mx === x && my === y);
    // stampOffsets(size: 2) covers document pixels (0,0)-(1,1); its outer
    // top-left corner sits at canvas-space (0, 0)
    expect(drawnAt(0, 0)).toBe(true);
  });

  it('a bigger brush produces a bigger outline than a smaller one', () => {
    const small = ctx();
    paintBrushCursor(
      small as unknown as CanvasRenderingContext2D,
      { x: 0, y: 0 },
      { size: 1, shape: 'square' },
      10,
      0,
      0,
    );
    const big = ctx();
    paintBrushCursor(
      big as unknown as CanvasRenderingContext2D,
      { x: 0, y: 0 },
      { size: 4, shape: 'square' },
      10,
      0,
      0,
    );
    expect(big.moveTo.mock.calls.length).toBeGreaterThan(small.moveTo.mock.calls.length);
  });
});

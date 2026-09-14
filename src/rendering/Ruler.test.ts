import { describe, expect, it, vi } from 'vitest';

import { paintRuler, rulerStep } from './Ruler';
import { Viewport } from './Viewport';

class RecordingContext {
  readonly ops: string[] = [];
  fillStyle = '';
  strokeStyle = '';
  lineWidth = 1;
  font = '';
  textBaseline = 'alphabetic';
  save = vi.fn(() => this.ops.push('save'));
  restore = vi.fn(() => this.ops.push('restore'));
  fillRect = vi.fn(() => this.ops.push('fillRect'));
  beginPath = vi.fn(() => this.ops.push('beginPath'));
  moveTo = vi.fn();
  lineTo = vi.fn();
  stroke = vi.fn(() => this.ops.push('stroke'));
  fillText = vi.fn((text: string) => this.ops.push(`fillText(${text})`));
  translate = vi.fn();
  rotate = vi.fn();
}

function ctx(): RecordingContext {
  return new RecordingContext();
}

describe('rulerStep', () => {
  it('picks a bigger document-pixel step as zoom drops, keeping ticks legible', () => {
    expect(rulerStep(50)).toBe(1);
    expect(rulerStep(4)).toBe(25);
    expect(rulerStep(0.1)).toBe(500);
  });

  it('never returns a step smaller than needed for the minimum tick spacing', () => {
    for (const zoom of [0.05, 0.5, 1, 5, 20, 64]) {
      const step = rulerStep(zoom);
      expect(step * zoom).toBeGreaterThanOrEqual(44); // just under the 45px floor, allowing rounding
    }
  });
});

describe('paintRuler', () => {
  it('fills the background across the full strip length', () => {
    const context = ctx();
    paintRuler(
      context as unknown as CanvasRenderingContext2D,
      'horizontal',
      300,
      20,
      new Viewport({ zoom: 1 }),
      null,
    );
    expect(context.fillRect).toHaveBeenCalledWith(0, 0, 300, 20);
  });

  it('labels ticks with the document coordinate, honouring pan', () => {
    const context = ctx();
    paintRuler(
      context as unknown as CanvasRenderingContext2D,
      'horizontal',
      300,
      20,
      new Viewport({ zoom: 10, panX: 0 }),
      null,
    );
    // at zoom 10, rulerStep(10) === 5 (5*10=50 >= 45); document x=0 sits at screen x=0
    expect(context.fillText).toHaveBeenCalledWith('0', 2, 1);
  });

  it('draws a cursor-position marker only when one is given', () => {
    const withCursor = ctx();
    paintRuler(
      withCursor as unknown as CanvasRenderingContext2D,
      'horizontal',
      300,
      20,
      new Viewport({ zoom: 1 }),
      42,
    );
    const withoutCursor = ctx();
    paintRuler(
      withoutCursor as unknown as CanvasRenderingContext2D,
      'horizontal',
      300,
      20,
      new Viewport({ zoom: 1 }),
      null,
    );
    // the cursor marker is an extra stroke() call beyond the tick strokes
    expect(withCursor.stroke.mock.calls.length).toBeGreaterThan(
      withoutCursor.stroke.mock.calls.length,
    );
  });

  it('rotates vertical-axis labels so they fit the narrow strip', () => {
    const context = ctx();
    paintRuler(
      context as unknown as CanvasRenderingContext2D,
      'vertical',
      300,
      20,
      new Viewport({ zoom: 1 }),
      null,
    );
    expect(context.rotate).toHaveBeenCalled();
  });
});

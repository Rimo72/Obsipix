import { describe, expect, it } from 'vitest';

import { Viewport } from '@rendering/Viewport';

import { toPointerInput } from './pointerAdapter';

function fakeCanvas(left: number, top: number): HTMLCanvasElement {
  return {
    getBoundingClientRect: () => ({
      left,
      top,
      right: left + 320,
      bottom: top + 320,
      width: 320,
      height: 320,
    }),
  } as unknown as HTMLCanvasElement;
}

function fakeEvent(partial: Partial<PointerEvent>): PointerEvent {
  return {
    clientX: 0,
    clientY: 0,
    buttons: 0,
    pointerType: 'mouse',
    shiftKey: false,
    ctrlKey: false,
    altKey: false,
    metaKey: false,
    pressure: 0,
    ...partial,
  } as PointerEvent;
}

describe('toPointerInput', () => {
  it('converts client coordinates to a document pixel through the viewport', () => {
    const viewport = new Viewport({ zoom: 10, panX: 0, panY: 0 });
    const input = toPointerInput(
      fakeEvent({ clientX: 145, clientY: 33 }),
      fakeCanvas(100, 20),
      viewport,
    );
    // canvas (45, 13) at zoom 10 → pixel (4, 1)
    expect(input.canvas).toEqual({ x: 45, y: 13 });
    expect(input.pixel).toEqual({ x: 4, y: 1 });
  });

  it('decodes the button bitmask', () => {
    const viewport = new Viewport();
    expect(toPointerInput(fakeEvent({ buttons: 1 }), fakeCanvas(0, 0), viewport).buttons).toEqual({
      left: true,
      right: false,
      middle: false,
    });
    expect(
      toPointerInput(fakeEvent({ buttons: 2 }), fakeCanvas(0, 0), viewport).buttons.right,
    ).toBe(true);
    expect(
      toPointerInput(fakeEvent({ buttons: 4 }), fakeCanvas(0, 0), viewport).buttons.middle,
    ).toBe(true);
  });

  it('carries modifiers and normalises pressure and source', () => {
    const input = toPointerInput(
      fakeEvent({ shiftKey: true, altKey: true, pointerType: 'pen', pressure: 0.5 }),
      fakeCanvas(0, 0),
      new Viewport(),
    );
    expect(input.modifiers).toEqual({ shift: true, ctrl: false, alt: true, meta: false });
    expect(input.source).toBe('pen');
    expect(input.pressure).toBe(0.5);
  });

  it('defaults pressure to 1 for devices that do not report it', () => {
    const input = toPointerInput(fakeEvent({ pressure: 0 }), fakeCanvas(0, 0), new Viewport());
    expect(input.pressure).toBe(1);
  });
});

import { beforeEach, describe, expect, it } from 'vitest';

import { PixelBuffer } from '@core/pixels/PixelBuffer';
import { BLACK, TRANSPARENT, WHITE, rgba, rgbaEquals, type RGBA } from '@core/types/color';
import type { PixelPoint } from '@core/types/geometry';

import { DEFAULT_BRUSH, type Brush } from './Brush';
import { EraserTool } from './EraserTool';
import { EyedropperTool } from './EyedropperTool';
import { FillTool } from './FillTool';
import { PencilTool } from './PencilTool';
import { NO_MODIFIERS, type PointerInput, type PointerModifiers } from './PointerInput';
import { EllipseTool, LineTool, RectangleTool } from './shapeTools';
import type { PreviewStamp, ToolContext } from './Tool';

function pointer(
  pixel: PixelPoint,
  button: 'left' | 'right' | 'none' = 'left',
  modifiers: PointerModifiers = NO_MODIFIERS,
): PointerInput {
  return {
    canvas: { x: pixel.x, y: pixel.y },
    pixel,
    source: 'mouse',
    buttons: { left: button === 'left', right: button === 'right', middle: false },
    modifiers,
    pressure: 1,
  };
}

interface FakeContext extends ToolContext {
  renders: number;
  preview: readonly PreviewStamp[] | null;
  foregroundOut: RGBA | null;
  backgroundOut: RGBA | null;
}

function contextFor(
  buffer: PixelBuffer,
  options: { foreground?: RGBA; background?: RGBA; brush?: Brush; sample?: RGBA } = {},
): FakeContext {
  const context: FakeContext = {
    renders: 0,
    preview: null,
    foregroundOut: null,
    backgroundOut: null,
    drawableBuffer: () => buffer,
    foreground: options.foreground ?? BLACK,
    background: options.background ?? WHITE,
    brush: options.brush ?? DEFAULT_BRUSH,
    isEditable: () => true,
    isInsideDocument: (x, y) => buffer.contains(x, y),
    sampleColor: (x, y) => options.sample ?? buffer.getPixel(x, y),
    setForeground: (color) => {
      context.foregroundOut = color;
    },
    setBackground: (color) => {
      context.backgroundOut = color;
    },
    setPreview: (preview) => {
      context.preview = preview;
    },
    ensureFloat: () => false,
    floatOffset: () => ({ x: 0, y: 0 }),
    setFloatOffset: () => undefined,
    requestRender: () => {
      context.renders += 1;
    },
  };
  return context;
}

describe('PencilTool', () => {
  it('paints a single pixel on a click and asks for a repaint', () => {
    const buffer = PixelBuffer.create(16, 16);
    const context = contextFor(buffer);
    const tool = new PencilTool();
    tool.onPointerDown(pointer({ x: 4, y: 5 }), context);
    tool.onPointerUp(pointer({ x: 4, y: 5 }, 'none'), context);
    expect(rgbaEquals(buffer.getPixel(4, 5), BLACK)).toBe(true);
    expect(context.renders).toBeGreaterThan(0);
  });

  it('interpolates a fast drag with no gaps', () => {
    const buffer = PixelBuffer.create(32, 32);
    const context = contextFor(buffer);
    const tool = new PencilTool();
    tool.onPointerDown(pointer({ x: 2, y: 2 }), context);
    tool.onPointerMove(pointer({ x: 20, y: 9 }), context);
    tool.onPointerUp(pointer({ x: 20, y: 9 }, 'none'), context);
    expect(
      rgbaEquals(buffer.getPixel(11, 5), BLACK) || rgbaEquals(buffer.getPixel(11, 6), BLACK),
    ).toBe(true);
  });

  it('uses the background colour for a right-button stroke', () => {
    const buffer = PixelBuffer.create(8, 8);
    const context = contextFor(buffer, { foreground: rgba(1, 2, 3) });
    const tool = new PencilTool();
    tool.onPointerDown(pointer({ x: 0, y: 0 }, 'right'), context);
    tool.onPointerUp(pointer({ x: 0, y: 0 }, 'none'), context);
    expect(rgbaEquals(buffer.getPixel(0, 0), WHITE)).toBe(true);
  });

  it('draws a straight line from the previous end when Shift is held', () => {
    const buffer = PixelBuffer.create(16, 16);
    const context = contextFor(buffer);
    const tool = new PencilTool();
    tool.onPointerDown(pointer({ x: 1, y: 1 }), context);
    tool.onPointerUp(pointer({ x: 1, y: 1 }, 'none'), context);
    tool.onPointerDown(pointer({ x: 10, y: 1 }, 'left', { ...NO_MODIFIERS, shift: true }), context);
    tool.onPointerUp(pointer({ x: 10, y: 1 }, 'none'), context);
    for (let x = 1; x <= 10; x += 1) {
      expect(rgbaEquals(buffer.getPixel(x, 1), BLACK)).toBe(true);
    }
  });

  it('applies a bigger brush', () => {
    const buffer = PixelBuffer.create(16, 16);
    const context = contextFor(buffer, { brush: { size: 3, shape: 'square' } });
    const tool = new PencilTool();
    tool.onPointerDown(pointer({ x: 8, y: 8 }), context);
    tool.onPointerUp(pointer({ x: 8, y: 8 }, 'none'), context);
    expect(rgbaEquals(buffer.getPixel(7, 7), BLACK)).toBe(true);
    expect(rgbaEquals(buffer.getPixel(9, 9), BLACK)).toBe(true);
  });
});

describe('EraserTool', () => {
  it('clears pixels along the stroke to transparent', () => {
    const buffer = PixelBuffer.create(8, 8);
    for (let x = 0; x < 8; x += 1) {
      buffer.setPixel(x, 0, BLACK);
    }
    const context = contextFor(buffer);
    const tool = new EraserTool();
    tool.onPointerDown(pointer({ x: 1, y: 0 }), context);
    tool.onPointerMove(pointer({ x: 5, y: 0 }), context);
    tool.onPointerUp(pointer({ x: 5, y: 0 }, 'none'), context);
    expect(rgbaEquals(buffer.getPixel(0, 0), BLACK)).toBe(true);
    for (let x = 1; x <= 5; x += 1) {
      expect(rgbaEquals(buffer.getPixel(x, 0), TRANSPARENT)).toBe(true);
    }
  });
});

describe('EyedropperTool', () => {
  it('sets the foreground to the sampled colour and never mutates', () => {
    const buffer = PixelBuffer.create(8, 8);
    const context = contextFor(buffer, { sample: rgba(9, 8, 7, 255) });
    const tool = new EyedropperTool();
    tool.onPointerDown(pointer({ x: 3, y: 3 }), context);
    expect(context.foregroundOut).toEqual({ r: 9, g: 8, b: 7, a: 255 });
    expect(buffer.toBytes().every((byte) => byte === 0)).toBe(true);
  });

  it('sets the background on a right click', () => {
    const context = contextFor(PixelBuffer.create(4, 4), { sample: BLACK });
    new EyedropperTool().onPointerDown(pointer({ x: 0, y: 0 }, 'right'), context);
    expect(context.backgroundOut).toEqual(BLACK);
  });
});

describe('FillTool', () => {
  let buffer: PixelBuffer;
  beforeEach(() => {
    buffer = PixelBuffer.create(6, 6);
  });

  it('flood-fills the connected region on release', () => {
    const context = contextFor(buffer, { foreground: BLACK });
    const tool = new FillTool();
    tool.onPointerDown(pointer({ x: 2, y: 2 }), context);
    const command = tool.onPointerUp(pointer({ x: 2, y: 2 }, 'none'), context);
    expect(command).not.toBeNull();
  });
});

describe('shape tools', () => {
  it('LineTool previews during drag and returns a command on release', () => {
    const buffer = PixelBuffer.create(16, 16);
    const context = contextFor(buffer);
    const tool = new LineTool();
    tool.onPointerDown(pointer({ x: 1, y: 1 }), context);
    tool.onPointerMove(pointer({ x: 8, y: 1 }), context);
    expect(context.preview?.length).toBeGreaterThan(0);
    expect(rgbaEquals(buffer.getPixel(4, 1), TRANSPARENT)).toBe(true); // preview does not touch artwork
    const command = tool.onPointerUp(pointer({ x: 8, y: 1 }, 'none'), context);
    expect(command).not.toBeNull();
    expect(context.preview).toBeNull();
  });

  it('RectangleTool constrains to a square with Shift', () => {
    const context = contextFor(PixelBuffer.create(20, 20));
    const tool = new RectangleTool();
    tool.onPointerDown(pointer({ x: 2, y: 2 }), context);
    tool.onPointerMove(pointer({ x: 12, y: 6 }, 'left', { ...NO_MODIFIERS, shift: true }), context);
    const xs = (context.preview ?? []).map((p) => p.x);
    const ys = (context.preview ?? []).map((p) => p.y);
    expect(Math.max(...xs) - Math.min(...xs)).toBe(Math.max(...ys) - Math.min(...ys));
  });

  it('EllipseTool produces a preview outline', () => {
    const context = contextFor(PixelBuffer.create(20, 20));
    const tool = new EllipseTool();
    tool.onPointerDown(pointer({ x: 2, y: 2 }), context);
    tool.onPointerMove(pointer({ x: 16, y: 12 }), context);
    expect(context.preview?.length).toBeGreaterThan(8);
    tool.onCancel(context);
    expect(context.preview).toBeNull();
  });
});

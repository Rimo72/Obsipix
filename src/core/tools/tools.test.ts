import { describe, expect, it } from 'vitest';

import { PixelBuffer } from '@core/pixels/PixelBuffer';
import { BLACK, TRANSPARENT, WHITE, rgba, rgbaEquals, type RGBA } from '@core/types/color';
import type { PixelPoint } from '@core/types/geometry';

import { DEFAULT_BRUSH } from './Brush';
import { EraserTool } from './EraserTool';
import { PencilTool } from './PencilTool';
import { NO_MODIFIERS, type PointerInput } from './PointerInput';
import type { ToolContext } from './Tool';

function pointer(pixel: PixelPoint, button: 'left' | 'right' | 'none' = 'left'): PointerInput {
  return {
    canvas: { x: pixel.x, y: pixel.y },
    pixel,
    source: 'mouse',
    buttons: {
      left: button === 'left',
      right: button === 'right',
      middle: false,
    },
    modifiers: NO_MODIFIERS,
    pressure: 1,
  };
}

function contextFor(
  buffer: PixelBuffer,
  colors: { foreground?: RGBA; background?: RGBA } = {},
): ToolContext & { renders: number } {
  const context = {
    renders: 0,
    drawableBuffer: () => buffer,
    foreground: colors.foreground ?? BLACK,
    background: colors.background ?? WHITE,
    brush: DEFAULT_BRUSH,
    isEditable: () => true,
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

  it('interpolates a fast drag so the line has no gaps', () => {
    const buffer = PixelBuffer.create(32, 32);
    const context = contextFor(buffer);
    const tool = new PencilTool();

    tool.onPointerDown(pointer({ x: 2, y: 2 }), context);
    tool.onPointerMove(pointer({ x: 20, y: 9 }), context); // big jump
    tool.onPointerUp(pointer({ x: 20, y: 9 }, 'none'), context);

    // sample the mid-point of the segment — it must be painted
    expect(
      rgbaEquals(buffer.getPixel(11, 5), BLACK) || rgbaEquals(buffer.getPixel(11, 6), BLACK),
    ).toBe(true);
    expect(rgbaEquals(buffer.getPixel(20, 9), BLACK)).toBe(true);
  });

  it('uses the background colour for a right-button stroke', () => {
    const buffer = PixelBuffer.create(8, 8);
    const context = contextFor(buffer, { foreground: rgba(1, 2, 3) });
    const tool = new PencilTool();

    tool.onPointerDown(pointer({ x: 0, y: 0 }, 'right'), context);
    tool.onPointerUp(pointer({ x: 0, y: 0 }, 'none'), context);

    expect(rgbaEquals(buffer.getPixel(0, 0), WHITE)).toBe(true);
  });

  it('does nothing when neither button is pressed', () => {
    const buffer = PixelBuffer.create(8, 8);
    const context = contextFor(buffer);
    const tool = new PencilTool();

    tool.onPointerDown(pointer({ x: 0, y: 0 }, 'none'), context);
    tool.onPointerMove(pointer({ x: 3, y: 3 }), context);

    expect(rgbaEquals(buffer.getPixel(0, 0), TRANSPARENT)).toBe(true);
    expect(rgbaEquals(buffer.getPixel(3, 3), TRANSPARENT)).toBe(true);
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

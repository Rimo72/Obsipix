import type { PointerInput, PointerSource } from '@core/tools/PointerInput';

import type { Viewport } from '@rendering/Viewport';

function toSource(pointerType: string): PointerSource {
  if (pointerType === 'pen') {
    return 'pen';
  }
  if (pointerType === 'touch') {
    return 'touch';
  }
  return 'mouse';
}

/**
 * The input boundary (PROJECT_CORE §12): a browser `PointerEvent` becomes a
 * {@link PointerInput} in document-pixel space. Nothing downstream sees a DOM
 * event.
 */
export function toPointerInput(
  event: PointerEvent,
  canvas: HTMLCanvasElement,
  viewport: Viewport,
): PointerInput {
  const rect = canvas.getBoundingClientRect();
  const canvasPoint = { x: event.clientX - rect.left, y: event.clientY - rect.top };
  return {
    canvas: canvasPoint,
    pixel: viewport.canvasToPixel(canvasPoint),
    source: toSource(event.pointerType),
    buttons: {
      left: (event.buttons & 1) !== 0,
      right: (event.buttons & 2) !== 0,
      middle: (event.buttons & 4) !== 0,
    },
    modifiers: {
      shift: event.shiftKey,
      ctrl: event.ctrlKey,
      alt: event.altKey,
      meta: event.metaKey,
    },
    pressure: event.pressure > 0 ? event.pressure : 1,
  };
}

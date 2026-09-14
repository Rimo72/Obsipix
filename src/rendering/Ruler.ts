import type { Viewport } from './Viewport';

export interface RulerStyle {
  readonly background: string;
  readonly tickColor: string;
  readonly textColor: string;
  readonly cursorColor: string;
  readonly font: string;
}

export const DEFAULT_RULER_STYLE: RulerStyle = {
  background: '#252526',
  tickColor: '#5a5a5a',
  textColor: '#9a9a9a',
  cursorColor: '#4aa3ff',
  font: '9px sans-serif',
};

const NICE_STEPS: readonly number[] = [1, 2, 5, 10, 25, 50, 100, 250, 500, 1000, 2500, 5000, 10000];
const MIN_TICK_SPACING_PX = 45;

/** The smallest "nice" document-pixel step whose on-screen spacing at `zoom` is at least legible. */
export function rulerStep(zoom: number): number {
  for (const step of NICE_STEPS) {
    if (step * zoom >= MIN_TICK_SPACING_PX) {
      return step;
    }
  }
  return NICE_STEPS[NICE_STEPS.length - 1] ?? 10000;
}

/**
 * A Photoshop-style ruler strip (V2 canvas UX): major ticks every
 * {@link rulerStep} document pixels, labelled with the document coordinate,
 * plus a thin marker at the live pointer position. Ticks run across the
 * whole visible strip, not just the document's own bounds — a ruler shows
 * where you are relative to the document origin everywhere you can pan to,
 * the same way Photoshop's or Aseprite's do.
 */
export function paintRuler(
  ctx: CanvasRenderingContext2D,
  axis: 'horizontal' | 'vertical',
  lengthPx: number,
  thickness: number,
  viewport: Viewport,
  cursorDocPos: number | null,
  style: RulerStyle = DEFAULT_RULER_STYLE,
): void {
  ctx.save();
  ctx.fillStyle = style.background;
  if (axis === 'horizontal') {
    ctx.fillRect(0, 0, lengthPx, thickness);
  } else {
    ctx.fillRect(0, 0, thickness, lengthPx);
  }

  const zoom = viewport.zoom;
  const origin = axis === 'horizontal' ? viewport.panX : viewport.panY;
  const step = rulerStep(zoom);
  const startValue = Math.floor((0 - origin) / zoom / step) * step;
  const endValue = (lengthPx - origin) / zoom + step;

  ctx.strokeStyle = style.tickColor;
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let value = startValue; value <= endValue; value += step) {
    const screen = Math.round(origin + value * zoom) + 0.5;
    if (axis === 'horizontal') {
      ctx.moveTo(screen, thickness * 0.5);
      ctx.lineTo(screen, thickness);
    } else {
      ctx.moveTo(thickness * 0.5, screen);
      ctx.lineTo(thickness, screen);
    }
  }
  ctx.stroke();

  ctx.fillStyle = style.textColor;
  ctx.font = style.font;
  for (let value = startValue; value <= endValue; value += step) {
    const screen = Math.round(origin + value * zoom);
    const label = String(Math.round(value));
    if (axis === 'horizontal') {
      ctx.textBaseline = 'top';
      ctx.fillText(label, screen + 2, 1);
    } else {
      ctx.save();
      ctx.translate(thickness - 3, screen - 2);
      ctx.rotate(-Math.PI / 2);
      ctx.textBaseline = 'bottom';
      ctx.fillText(label, 0, 0);
      ctx.restore();
    }
  }

  if (cursorDocPos !== null) {
    const screen = Math.round(origin + cursorDocPos * zoom) + 0.5;
    ctx.strokeStyle = style.cursorColor;
    ctx.lineWidth = 1;
    ctx.beginPath();
    if (axis === 'horizontal') {
      ctx.moveTo(screen, 0);
      ctx.lineTo(screen, thickness);
    } else {
      ctx.moveTo(0, screen);
      ctx.lineTo(thickness, screen);
    }
    ctx.stroke();
  }

  ctx.restore();
}

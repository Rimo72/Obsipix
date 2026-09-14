import { stampOffsets, type Brush } from '@core/tools/Brush';

export interface BrushCursorStyle {
  readonly primary: string;
  readonly secondary: string;
}

export const DEFAULT_BRUSH_CURSOR_STYLE: BrushCursorStyle = {
  primary: 'rgba(0, 0, 0, 0.9)',
  secondary: 'rgba(255, 255, 255, 0.95)',
};

/**
 * Outlines exactly the pixels one brush stamp at `pixel` would cover — the
 * same hard-edged offsets `paintStroke` uses (PROJECT_CORE §3.2) — so the
 * shown shape always matches what a click would actually paint, unlike a
 * smooth circle cursor would. Traces only the stamp's outer edge (mirrors
 * `CanvasRenderer#paintMarchingAnts`'s edge-tracing) and strokes it twice —
 * a wide dark line under a thin light one — so the outline stays legible
 * over both light and dark artwork without relying on a dash pattern, which
 * can vanish entirely on a 1px brush.
 */
export function paintBrushCursor(
  ctx: CanvasRenderingContext2D,
  pixel: { readonly x: number; readonly y: number },
  brush: Brush,
  zoom: number,
  originX: number,
  originY: number,
  style: BrushCursorStyle = DEFAULT_BRUSH_CURSOR_STYLE,
): void {
  const offsets = stampOffsets(brush);
  const covered = new Set(offsets.map((offset) => `${String(offset.x)},${String(offset.y)}`));
  const has = (dx: number, dy: number): boolean => covered.has(`${String(dx)},${String(dy)}`);

  ctx.save();
  ctx.beginPath();
  for (const offset of offsets) {
    const left = originX + (pixel.x + offset.x) * zoom;
    const top = originY + (pixel.y + offset.y) * zoom;
    if (!has(offset.x, offset.y - 1)) {
      ctx.moveTo(left, top);
      ctx.lineTo(left + zoom, top);
    }
    if (!has(offset.x, offset.y + 1)) {
      ctx.moveTo(left, top + zoom);
      ctx.lineTo(left + zoom, top + zoom);
    }
    if (!has(offset.x - 1, offset.y)) {
      ctx.moveTo(left, top);
      ctx.lineTo(left, top + zoom);
    }
    if (!has(offset.x + 1, offset.y)) {
      ctx.moveTo(left + zoom, top);
      ctx.lineTo(left + zoom, top + zoom);
    }
  }
  ctx.lineWidth = 3;
  ctx.strokeStyle = style.primary;
  ctx.stroke();
  ctx.lineWidth = 1;
  ctx.strokeStyle = style.secondary;
  ctx.stroke();
  ctx.restore();
}

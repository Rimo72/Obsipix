import type { Viewport } from '@rendering/Viewport';

export interface GuideHit {
  readonly axis: 'horizontal' | 'vertical';
  readonly index: number;
}

const HIT_TOLERANCE_PX = 4;

/**
 * Which existing guide (if any) a canvas-space point is close enough to
 * grab, for dragging it to a new position or dropping it back on the
 * ruler to delete it. When both axes have a candidate within tolerance,
 * the nearer one wins.
 */
export function hitTestGuide(
  canvasPoint: { readonly x: number; readonly y: number },
  guides: { readonly horizontal: readonly number[]; readonly vertical: readonly number[] },
  viewport: Viewport,
  tolerance: number = HIT_TOLERANCE_PX,
): GuideHit | null {
  let best: GuideHit | null = null;
  let bestDistance = tolerance;

  guides.horizontal.forEach((position, index) => {
    const screenY = viewport.documentToCanvas({ x: 0, y: position }).y;
    const distance = Math.abs(canvasPoint.y - screenY);
    if (distance <= bestDistance) {
      best = { axis: 'horizontal', index };
      bestDistance = distance;
    }
  });
  guides.vertical.forEach((position, index) => {
    const screenX = viewport.documentToCanvas({ x: position, y: 0 }).x;
    const distance = Math.abs(canvasPoint.x - screenX);
    if (distance <= bestDistance) {
      best = { axis: 'vertical', index };
      bestDistance = distance;
    }
  });
  return best;
}

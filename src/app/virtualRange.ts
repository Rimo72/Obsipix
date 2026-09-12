/** A contiguous `[start, end)` slice of a list worth actually rendering. */
export interface VirtualRange {
  readonly start: number;
  readonly end: number;
}

/**
 * Which contiguous slice of a fixed-width, horizontally scrolling list falls
 * within the visible viewport plus a `buffer` of extra items on each side.
 * Pure — no DOM — so it's directly unit-testable; the caller supplies the
 * measured scroll position and container width.
 *
 * Used by the animation timeline's frame strip: with hundreds of frames,
 * rendering (and — via `FrameThumbnail` — repainting) every one of them on
 * every edit is the dominant cost even though only a handful are ever on
 * screen (PROJECT_CORE §110, the frame-count performance budget).
 */
export function horizontalVirtualRange(
  scrollLeft: number,
  clientWidth: number,
  itemWidth: number,
  itemCount: number,
  buffer: number,
): VirtualRange {
  if (itemCount <= 0 || itemWidth <= 0) {
    return { start: 0, end: 0 };
  }
  if (clientWidth <= 0) {
    // Not measured yet (e.g. the very first render) — render everything so
    // nothing is ever invisibly missing before the first real measurement.
    return { start: 0, end: itemCount };
  }
  const first = Math.floor(scrollLeft / itemWidth) - buffer;
  const last = Math.ceil((scrollLeft + clientWidth) / itemWidth) + buffer;
  return {
    start: Math.max(0, Math.min(itemCount, first)),
    end: Math.max(0, Math.min(itemCount, last)),
  };
}

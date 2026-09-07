import {
  useRef,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from 'react';

import './ResizeHandle.css';

interface ResizeHandleProps {
  /** `row` — a horizontal bar dragged up/down. `col` — a vertical bar dragged left/right. */
  readonly orientation: 'row' | 'col';
  /** Called with the pointer delta along the drag axis (px) since the last event. */
  readonly onResize: (delta: number) => void;
  readonly label: string;
  /** Keyboard step in px (Arrow keys). Defaults to 16. */
  readonly step?: number;
}

/**
 * A draggable divider between resizable regions (PROJECT_CORE §111.2, §111.8).
 * Keyboard-accessible: focusable, Arrow keys nudge by `step` (§111.14).
 */
export function ResizeHandle({ orientation, onResize, label, step = 16 }: ResizeHandleProps) {
  const last = useRef(0);

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>): void => {
    event.preventDefault();
    const axis = orientation === 'row' ? event.clientY : event.clientX;
    last.current = axis;
    const target = event.currentTarget;
    target.setPointerCapture(event.pointerId);

    const move = (e: PointerEvent): void => {
      const now = orientation === 'row' ? e.clientY : e.clientX;
      onResize(now - last.current);
      last.current = now;
    };
    const up = (): void => {
      target.releasePointerCapture(event.pointerId);
      target.removeEventListener('pointermove', move);
      target.removeEventListener('pointerup', up);
      target.removeEventListener('pointercancel', up);
    };
    target.addEventListener('pointermove', move);
    target.addEventListener('pointerup', up);
    target.addEventListener('pointercancel', up);
  };

  const onKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>): void => {
    const back = orientation === 'row' ? 'ArrowUp' : 'ArrowLeft';
    const forward = orientation === 'row' ? 'ArrowDown' : 'ArrowRight';
    if (event.key === back) {
      onResize(-step);
    } else if (event.key === forward) {
      onResize(step);
    } else {
      return;
    }
    event.preventDefault();
  };

  return (
    <div
      className={`resize-handle resize-handle--${orientation}`}
      role="separator"
      aria-orientation={orientation === 'row' ? 'horizontal' : 'vertical'}
      aria-label={label}
      tabIndex={0}
      onPointerDown={onPointerDown}
      onKeyDown={onKeyDown}
    />
  );
}

import { useEffect, useRef, type PointerEvent as ReactPointerEvent } from 'react';

import { CanvasRenderer, DEFAULT_CHECKERBOARD } from '@rendering/CanvasRenderer';

import type { EditorSession } from '../EditorSession';
import { toPointerInput } from '../pointerAdapter';
import './CanvasStage.css';

const ZOOM_WHEEL_STEP = 1.15;

interface CanvasStageProps {
  readonly session: EditorSession;
}

/** The interactive canvas: renders the document and routes pointer input to the session. */
export function CanvasStage({ session }: CanvasStageProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const panRef = useRef<{ active: boolean; x: number; y: number }>({ active: false, x: 0, y: 0 });

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) {
      return;
    }

    let renderer: CanvasRenderer;
    try {
      renderer = new CanvasRenderer(canvas);
    } catch (error) {
      console.warn('Obsipix: canvas rendering is unavailable', error);
      return;
    }

    let frame = 0;
    const paint = (): void => {
      frame = 0;
      const rect = container.getBoundingClientRect();
      const width = Math.max(1, Math.floor(rect.width));
      const height = Math.max(1, Math.floor(rect.height));
      canvas.style.width = `${String(width)}px`;
      canvas.style.height = `${String(height)}px`;
      const checkerSize = Math.max(4, Math.round(session.viewport.zoom / 2));
      const selection = session.document.selection;
      renderer.render(session.document, session.viewport, {
        devicePixelRatio: window.devicePixelRatio || 1,
        showGrid: session.showGrid,
        showCheckerboard: session.showCheckerboard,
        checkerboard: { ...DEFAULT_CHECKERBOARD, size: checkerSize },
        preview: session.preview,
        float: session.floatingPreview,
        onion: session.onionOverlays(),
        selection: selection.active
          ? {
              data: selection.snapshotMask(),
              width: selection.dimensions.width,
              height: selection.dimensions.height,
            }
          : null,
      });
    };
    const schedule = (): void => {
      if (!frame) {
        frame = requestAnimationFrame(paint);
      }
    };

    const reportSize = (): void => {
      const rect = container.getBoundingClientRect();
      session.setViewSize(Math.max(1, rect.width), Math.max(1, rect.height));
    };

    reportSize();
    schedule();

    const unsubscribe = session.subscribe(schedule);
    const observer = new ResizeObserver(reportSize);
    observer.observe(container);

    const onWheel = (event: WheelEvent): void => {
      event.preventDefault();
      const rect = canvas.getBoundingClientRect();
      const anchor = { x: event.clientX - rect.left, y: event.clientY - rect.top };
      const factor = event.deltaY < 0 ? ZOOM_WHEEL_STEP : 1 / ZOOM_WHEEL_STEP;
      session.viewport.zoomAround(anchor, factor);
      session.touch();
    };
    canvas.addEventListener('wheel', onWheel, { passive: false });

    return () => {
      unsubscribe();
      observer.disconnect();
      canvas.removeEventListener('wheel', onWheel);
      if (frame) {
        cancelAnimationFrame(frame);
      }
    };
  }, [session]);

  const getCanvasEl = (): HTMLCanvasElement | null => canvasRef.current;

  const handlePointerDown = (event: ReactPointerEvent<HTMLCanvasElement>): void => {
    const element = getCanvasEl();
    if (!element) {
      return;
    }
    element.setPointerCapture(event.pointerId);
    const input = toPointerInput(event.nativeEvent, element, session.viewport);
    if (input.buttons.middle) {
      panRef.current = { active: true, x: event.clientX, y: event.clientY };
      return;
    }
    session.pointerDown(input);
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLCanvasElement>): void => {
    const element = getCanvasEl();
    if (!element) {
      return;
    }
    if (panRef.current.active) {
      session.viewport.panBy(event.clientX - panRef.current.x, event.clientY - panRef.current.y);
      panRef.current = { active: true, x: event.clientX, y: event.clientY };
      session.touch();
      return;
    }
    session.pointerMove(toPointerInput(event.nativeEvent, element, session.viewport));
  };

  const endInteraction = (event: ReactPointerEvent<HTMLCanvasElement>): void => {
    const element = getCanvasEl();
    if (element?.hasPointerCapture(event.pointerId)) {
      element.releasePointerCapture(event.pointerId);
    }
    if (panRef.current.active) {
      panRef.current = { active: false, x: 0, y: 0 };
      return;
    }
    if (element) {
      session.pointerUp(toPointerInput(event.nativeEvent, element, session.viewport));
    }
  };

  return (
    <div ref={containerRef} className="canvas-stage" data-testid="canvas-stage">
      <canvas
        ref={canvasRef}
        className="canvas-stage__canvas"
        data-testid="editor-canvas"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={endInteraction}
        onPointerCancel={endInteraction}
        onPointerLeave={() => {
          session.clearCursor();
        }}
        onContextMenu={(event) => {
          event.preventDefault();
        }}
      />
    </div>
  );
}

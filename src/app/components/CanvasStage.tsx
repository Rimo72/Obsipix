import { useEffect, useRef, type PointerEvent as ReactPointerEvent } from 'react';

import { ERASER_TOOL_ID } from '@core/tools/EraserTool';
import { PENCIL_TOOL_ID } from '@core/tools/PencilTool';
import { ELLIPSE_TOOL_ID, LINE_TOOL_ID, RECTANGLE_TOOL_ID } from '@core/tools/shapeTools';
import { paintBrushCursor } from '@rendering/BrushCursor';
import { CanvasRenderer, DEFAULT_CHECKERBOARD } from '@rendering/CanvasRenderer';
import { paintRuler } from '@rendering/Ruler';

import type { EditorSession } from '../EditorSession';
import { hitTestGuide } from '../guideHitTest';
import { toPointerInput } from '../pointerAdapter';
import './CanvasStage.css';

const ZOOM_WHEEL_STEP = 1.15;
const RULER_THICKNESS = 20;

/** Tools whose stroke/outline width is the active {@link Brush} (PROJECT_CORE §3.2) — the ones worth outlining on canvas instead of showing the OS pointer. */
const BRUSH_CURSOR_TOOL_IDS = new Set([
  PENCIL_TOOL_ID,
  ERASER_TOOL_ID,
  LINE_TOOL_ID,
  RECTANGLE_TOOL_ID,
  ELLIPSE_TOOL_ID,
]);

interface CanvasStageProps {
  readonly session: EditorSession;
}

interface GuideDrag {
  readonly axis: 'horizontal' | 'vertical';
  /** `null` while dragging a brand-new guide out from a ruler; an existing guide's index otherwise. */
  readonly index: number | null;
  position: number;
}

/** The interactive canvas: renders the document and routes pointer input to the session. */
export function CanvasStage({ session }: CanvasStageProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cursorCanvasRef = useRef<HTMLCanvasElement>(null);
  const hRulerRef = useRef<HTMLCanvasElement>(null);
  const vRulerRef = useRef<HTMLCanvasElement>(null);
  const panRef = useRef<{ active: boolean; x: number; y: number }>({ active: false, x: 0, y: 0 });
  const spaceHeldRef = useRef(false);
  const guideDragRef = useRef<GuideDrag | null>(null);
  const scheduleRef = useRef<() => void>(() => {});
  const scheduleOverlaysRef = useRef<() => void>(() => {});

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
      const selection = session.document.selection;
      const drag = guideDragRef.current;
      renderer.render(session.document, session.viewport, {
        devicePixelRatio: window.devicePixelRatio || 1,
        showGrid: session.showGrid,
        showCheckerboard: session.showCheckerboard,
        // Fixed screen-space squares — the checker never scales with zoom.
        checkerboard: DEFAULT_CHECKERBOARD,
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
        guides: session.showGuides
          ? {
              horizontal: session.guides.horizontal,
              vertical: session.guides.vertical,
              dragging: drag ? { axis: drag.axis, position: drag.position } : null,
            }
          : null,
      });
    };
    const schedule = (): void => {
      if (!frame) {
        frame = requestAnimationFrame(paint);
      }
    };
    scheduleRef.current = schedule;

    // The brush-size cursor outline and the rulers (V2 canvas UX fixes): all
    // drawn on their own transparent canvases, decoupled from `paint()`'s
    // full document recomposite, so plain hovering — which fires far more
    // often than drawing or panning — never re-runs `compositeDocument`.
    let overlayFrame = 0;
    const paintCursorOverlay = (): void => {
      const cursorCanvas = cursorCanvasRef.current;
      const cctx = cursorCanvas?.getContext('2d');
      if (!cursorCanvas || !cctx) {
        return;
      }
      const rect = container.getBoundingClientRect();
      const width = Math.max(1, Math.floor(rect.width));
      const height = Math.max(1, Math.floor(rect.height));
      const dpr = window.devicePixelRatio || 1;
      cursorCanvas.style.width = `${String(width)}px`;
      cursorCanvas.style.height = `${String(height)}px`;
      const backingWidth = Math.max(1, Math.round(width * dpr));
      const backingHeight = Math.max(1, Math.round(height * dpr));
      if (cursorCanvas.width !== backingWidth) {
        cursorCanvas.width = backingWidth;
      }
      if (cursorCanvas.height !== backingHeight) {
        cursorCanvas.height = backingHeight;
      }
      cctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      cctx.clearRect(0, 0, width, height);

      const cursor = session.cursor;
      const showBrush =
        cursor !== null &&
        !panRef.current.active &&
        !guideDragRef.current &&
        !session.isSamplingColor &&
        BRUSH_CURSOR_TOOL_IDS.has(session.activeToolId);
      if (showBrush) {
        paintBrushCursor(
          cctx,
          cursor,
          session.brush,
          session.viewport.zoom,
          session.viewport.panX,
          session.viewport.panY,
        );
      }
    };
    const paintOneRuler = (
      rulerCanvas: HTMLCanvasElement | null,
      axis: 'horizontal' | 'vertical',
    ): void => {
      const rctx = rulerCanvas?.getContext('2d');
      if (!rulerCanvas || !rctx || !session.showRulers) {
        return;
      }
      const dpr = window.devicePixelRatio || 1;
      const lengthPx = axis === 'horizontal' ? rulerCanvas.clientWidth : rulerCanvas.clientHeight;
      const length = Math.max(1, lengthPx);
      const backingLength = Math.max(1, Math.round(length * dpr));
      const backingThickness = Math.max(1, Math.round(RULER_THICKNESS * dpr));
      if (axis === 'horizontal') {
        if (rulerCanvas.width !== backingLength) rulerCanvas.width = backingLength;
        if (rulerCanvas.height !== backingThickness) rulerCanvas.height = backingThickness;
      } else {
        if (rulerCanvas.width !== backingThickness) rulerCanvas.width = backingThickness;
        if (rulerCanvas.height !== backingLength) rulerCanvas.height = backingLength;
      }
      rctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const cursor = session.cursor;
      const drag = guideDragRef.current;
      const cursorPos =
        drag && drag.axis === axis
          ? drag.position
          : ((cursor && (axis === 'horizontal' ? cursor.x : cursor.y)) ?? null);
      paintRuler(rctx, axis, length, RULER_THICKNESS, session.viewport, cursorPos);
    };
    const paintOverlays = (): void => {
      overlayFrame = 0;
      paintCursorOverlay();
      paintOneRuler(hRulerRef.current, 'horizontal');
      paintOneRuler(vRulerRef.current, 'vertical');
    };
    const scheduleOverlays = (): void => {
      if (!overlayFrame) {
        overlayFrame = requestAnimationFrame(paintOverlays);
      }
    };
    scheduleOverlaysRef.current = scheduleOverlays;

    const reportSize = (): void => {
      const rect = container.getBoundingClientRect();
      session.setViewSize(Math.max(1, rect.width), Math.max(1, rect.height));
    };

    reportSize();
    schedule();
    scheduleOverlays();

    const unsubscribe = session.subscribe(() => {
      schedule();
      scheduleOverlays();
    });
    const unsubscribeCursor = session.subscribeCursor(scheduleOverlays);
    const observer = new ResizeObserver(() => {
      reportSize();
      scheduleOverlays();
    });
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

    // Space = hold-to-pan on the canvas (PROJECT_CORE §17, §95.7). The timeline
    // owns Space while it has focus; text fields always do.
    const isTypingOrTimeline = (target: EventTarget | null): boolean => {
      if (
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement ||
        (target instanceof HTMLElement && target.isContentEditable)
      ) {
        return true;
      }
      const active = document.activeElement;
      return active instanceof HTMLElement && active.closest('.timeline-panel') !== null;
    };
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === ' ' && !event.repeat && !isTypingOrTimeline(event.target)) {
        event.preventDefault();
        spaceHeldRef.current = true;
        container.classList.add('canvas-stage--pan-ready');
      }
    };
    const onKeyUp = (event: KeyboardEvent): void => {
      if (event.key === ' ') {
        spaceHeldRef.current = false;
        container.classList.remove('canvas-stage--pan-ready');
      }
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);

    return () => {
      unsubscribe();
      unsubscribeCursor();
      observer.disconnect();
      canvas.removeEventListener('wheel', onWheel);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      if (frame) {
        cancelAnimationFrame(frame);
      }
      if (overlayFrame) {
        cancelAnimationFrame(overlayFrame);
      }
    };
  }, [session]);

  const getCanvasEl = (): HTMLCanvasElement | null => canvasRef.current;

  /** `event`'s position in the main canvas's own coordinate space, regardless of which element it actually fired on (a ruler, most often). */
  const canvasSpacePoint = (event: ReactPointerEvent): { x: number; y: number } | null => {
    const element = getCanvasEl();
    if (!element) {
      return null;
    }
    const rect = element.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  };

  const isOverMainCanvas = (event: ReactPointerEvent): boolean => {
    const element = getCanvasEl();
    if (!element) {
      return false;
    }
    const rect = element.getBoundingClientRect();
    return (
      event.clientX >= rect.left &&
      event.clientX <= rect.right &&
      event.clientY >= rect.top &&
      event.clientY <= rect.bottom
    );
  };

  const handlePointerDown = (event: ReactPointerEvent<HTMLCanvasElement>): void => {
    const element = getCanvasEl();
    if (!element) {
      return;
    }
    const input = toPointerInput(event.nativeEvent, element, session.viewport);
    if (session.isSamplingColor) {
      session.sampleColorAt(Math.floor(input.pixel.x), Math.floor(input.pixel.y));
      return;
    }
    element.setPointerCapture(event.pointerId);
    if (input.buttons.middle || spaceHeldRef.current) {
      panRef.current = { active: true, x: event.clientX, y: event.clientY };
      scheduleOverlaysRef.current();
      return;
    }
    if (session.showGuides) {
      const hit = hitTestGuide(input.canvas, session.guides, session.viewport);
      if (hit) {
        const position = session.guides[hit.axis][hit.index];
        if (position !== undefined) {
          guideDragRef.current = { axis: hit.axis, index: hit.index, position };
          scheduleRef.current();
          scheduleOverlaysRef.current();
          return;
        }
      }
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
    const drag = guideDragRef.current;
    if (drag) {
      const point = canvasSpacePoint(event);
      if (point) {
        const doc = session.viewport.canvasToDocument(point);
        drag.position = drag.axis === 'horizontal' ? doc.y : doc.x;
        scheduleRef.current();
        scheduleOverlaysRef.current();
      }
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
      scheduleOverlaysRef.current();
      return;
    }
    const drag = guideDragRef.current;
    if (drag) {
      guideDragRef.current = null;
      // An existing guide dropped outside the canvas is removed, the same
      // way dragging it back onto its ruler would in Photoshop/Aseprite.
      if (drag.index !== null && !isOverMainCanvas(event)) {
        session.removeGuide(drag.axis, drag.index);
      } else if (drag.index !== null) {
        session.moveGuide(drag.axis, drag.index, drag.position);
      }
      scheduleRef.current();
      scheduleOverlaysRef.current();
      return;
    }
    if (element) {
      session.pointerUp(toPointerInput(event.nativeEvent, element, session.viewport));
    }
  };

  const handleRulerPointerDown =
    (axis: 'horizontal' | 'vertical') =>
    (event: ReactPointerEvent<HTMLCanvasElement>): void => {
      if (!session.showRulers) {
        return;
      }
      const point = canvasSpacePoint(event);
      if (!point) {
        return;
      }
      event.currentTarget.setPointerCapture(event.pointerId);
      const doc = session.viewport.canvasToDocument(point);
      guideDragRef.current = { axis, index: null, position: axis === 'horizontal' ? doc.y : doc.x };
      scheduleRef.current();
      scheduleOverlaysRef.current();
    };

  const handleRulerPointerMove = (event: ReactPointerEvent<HTMLCanvasElement>): void => {
    const drag = guideDragRef.current;
    if (!drag || drag.index !== null) {
      return;
    }
    const point = canvasSpacePoint(event);
    if (!point) {
      return;
    }
    const doc = session.viewport.canvasToDocument(point);
    drag.position = drag.axis === 'horizontal' ? doc.y : doc.x;
    scheduleRef.current();
    scheduleOverlaysRef.current();
  };

  const endRulerDrag = (event: ReactPointerEvent<HTMLCanvasElement>): void => {
    const drag = guideDragRef.current;
    if (!drag || drag.index !== null) {
      return;
    }
    guideDragRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    // A new guide only commits if it was dropped over the drawing area —
    // releasing back over a ruler (or off the stage entirely) cancels it.
    if (isOverMainCanvas(event)) {
      session.addGuide(drag.axis, drag.position);
    }
    scheduleRef.current();
    scheduleOverlaysRef.current();
  };

  const brushCursorActive =
    !session.isSamplingColor &&
    !guideDragRef.current &&
    BRUSH_CURSOR_TOOL_IDS.has(session.activeToolId);
  const viewportClasses = [
    'canvas-stage__viewport',
    session.isSamplingColor && 'canvas-stage--sampling',
    brushCursorActive && 'canvas-stage--brush-cursor',
  ]
    .filter(Boolean)
    .join(' ');
  const stageClasses = ['canvas-stage', !session.showRulers && 'canvas-stage--no-rulers']
    .filter(Boolean)
    .join(' ');

  return (
    <div className={stageClasses} data-testid="canvas-stage">
      <div className="canvas-stage__corner" aria-hidden="true" />
      <canvas
        ref={hRulerRef}
        className="canvas-stage__ruler canvas-stage__ruler--h"
        data-testid="ruler-horizontal"
        aria-hidden="true"
        onPointerDown={handleRulerPointerDown('horizontal')}
        onPointerMove={handleRulerPointerMove}
        onPointerUp={endRulerDrag}
        onPointerCancel={endRulerDrag}
      />
      <canvas
        ref={vRulerRef}
        className="canvas-stage__ruler canvas-stage__ruler--v"
        data-testid="ruler-vertical"
        aria-hidden="true"
        onPointerDown={handleRulerPointerDown('vertical')}
        onPointerMove={handleRulerPointerMove}
        onPointerUp={endRulerDrag}
        onPointerCancel={endRulerDrag}
      />
      <div ref={containerRef} className={viewportClasses}>
        <canvas
          ref={canvasRef}
          className="canvas-stage__canvas"
          data-testid="editor-canvas"
          role="img"
          aria-label={`Drawing canvas, ${String(session.document.dimensions.width)} by ${String(
            session.document.dimensions.height,
          )} pixels`}
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
        <canvas ref={cursorCanvasRef} className="canvas-stage__cursor-canvas" aria-hidden="true" />
      </div>
    </div>
  );
}

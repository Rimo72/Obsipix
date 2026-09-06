import { useEffect, useMemo, useRef } from 'react';

import { CanvasRenderer, DEFAULT_CHECKERBOARD } from '@rendering/CanvasRenderer';
import { Viewport } from '@rendering/Viewport';

import { buildReferenceDocument } from '../referenceDocument';
import './CanvasStage.css';

const FIT_PADDING = 24;

/**
 * Displays the document on a `<canvas>`. Phase 4: read-only — it shows a static
 * reference document and re-fits on resize. Interaction arrives in Phase 5.
 */
export function CanvasStage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const document = useMemo(() => buildReferenceDocument(), []);

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
      // Renderer failures stay isolated from document state (PROJECT_CORE §3.16).
      console.warn('Obsipix: canvas rendering is unavailable', error);
      return;
    }

    const viewport = new Viewport();
    const draw = (): void => {
      const rect = container.getBoundingClientRect();
      const width = Math.max(1, Math.floor(rect.width));
      const height = Math.max(1, Math.floor(rect.height));
      canvas.style.width = `${String(width)}px`;
      canvas.style.height = `${String(height)}px`;
      viewport.fit(width, height, document.dimensions, FIT_PADDING);
      // one checkerboard square per document pixel so it reads as transparency, not noise
      const checkerSize = Math.max(4, Math.round(viewport.zoom / 2));
      renderer.render(document, viewport, {
        devicePixelRatio: window.devicePixelRatio || 1,
        checkerboard: { ...DEFAULT_CHECKERBOARD, size: checkerSize },
      });
    };

    draw();
    const observer = new ResizeObserver(draw);
    observer.observe(container);
    return () => {
      observer.disconnect();
    };
  }, [document]);

  return (
    <div ref={containerRef} className="canvas-stage" data-testid="canvas-stage">
      <canvas ref={canvasRef} className="canvas-stage__canvas" data-testid="editor-canvas" />
    </div>
  );
}

import { useEffect, useRef } from 'react';

import type { FrameId } from '@core/types/ids';

import type { EditorSession } from '../EditorSession';
import { paintFrame } from '../framePaint';

interface FrameThumbnailProps {
  readonly session: EditorSession;
  readonly frameId: FrameId;
  /** Square size in CSS pixels. */
  readonly size: number;
}

/**
 * A live thumbnail of one animation frame's composited visible artwork
 * (PROJECT_CORE §110.1). Repaints whenever the session changes; never touches
 * document pixel data.
 */
export function FrameThumbnail({ session, frameId, size }: FrameThumbnailProps) {
  const ref = useRef<HTMLCanvasElement>(null);
  const version = session.getVersion();

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) {
      return;
    }
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.max(1, Math.round(size * dpr));
    canvas.height = Math.max(1, Math.round(size * dpr));
    try {
      paintFrame(canvas, session.document, frameId, 'checkerboard');
    } catch {
      // The frame may have been removed between render and paint — ignore.
    }
  }, [session, frameId, size, version]);

  return (
    <canvas
      ref={ref}
      className="frame-thumb"
      style={{ width: `${String(size)}px`, height: `${String(size)}px` }}
      aria-hidden="true"
    />
  );
}

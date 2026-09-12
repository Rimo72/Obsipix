import { useEffect, useRef, useState } from 'react';

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
 *
 * Repainting is gated to thumbnails actually on screen. The timeline strip
 * renders one of these per frame with no windowing, and every one shares the
 * same global `session.getVersion()` — with hundreds of frames, painting all
 * of them (a full layer composite each) on every single edit is the single
 * biggest cost in the editor, even though at most a couple of frames near the
 * one being drawn on are ever visible. An `IntersectionObserver` lets an
 * off-screen thumbnail skip the paint and just remember it's stale, catching
 * up the moment it scrolls into view — never wrong, just lazy.
 */
export function FrameThumbnail({ session, frameId, size }: FrameThumbnailProps) {
  const ref = useRef<HTMLCanvasElement>(null);
  const version = session.getVersion();
  const paintedVersion = useRef<number | null>(null);
  // Start "visible" so the first paint happens immediately on mount, same as
  // before — the IntersectionObserver below narrows this down for anything
  // actually off-screen shortly after, before the next edit can trigger a
  // repaint. Avoids a blank-canvas flash while the observer's first callback
  // is still pending.
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas || typeof IntersectionObserver === 'undefined') {
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry) {
          setIsVisible(entry.isIntersecting);
        }
      },
      { root: canvas.closest('.timeline-panel__frames'), rootMargin: '200px' },
    );
    observer.observe(canvas);
    return () => {
      observer.disconnect();
    };
  }, []);

  useEffect(() => {
    if (!isVisible || paintedVersion.current === version) {
      return;
    }
    const canvas = ref.current;
    if (!canvas) {
      return;
    }
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.max(1, Math.round(size * dpr));
    canvas.height = Math.max(1, Math.round(size * dpr));
    try {
      paintFrame(canvas, session.document, frameId, 'checkerboard');
      paintedVersion.current = version;
    } catch {
      // The frame may have been removed between render and paint — ignore.
    }
  }, [session, frameId, size, version, isVisible]);

  return (
    <canvas
      ref={ref}
      className="frame-thumb"
      style={{ width: `${String(size)}px`, height: `${String(size)}px` }}
      aria-hidden="true"
    />
  );
}

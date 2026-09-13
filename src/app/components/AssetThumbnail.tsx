import { useEffect, useRef } from 'react';

import type { Document } from '@core/document/Document';

import { paintFrame } from '../framePaint';

interface AssetThumbnailProps {
  readonly document: Document;
  /** Bumped by the caller so the thumbnail repaints when its document changes. */
  readonly version: number;
  /** Square size in CSS pixels. */
  readonly size: number;
}

/**
 * A live thumbnail of an Asset's document (its active frame, composited) —
 * the Asset Library's "preview" requirement (V2 vision doc §10). Reuses the
 * same paint routine as the animation-frame thumbnails; unlike those, an
 * asset library is expected to hold few enough assets that no windowing is
 * needed.
 */
export function AssetThumbnail({ document, version, size }: AssetThumbnailProps) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) {
      return;
    }
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.max(1, Math.round(size * dpr));
    canvas.height = Math.max(1, Math.round(size * dpr));
    try {
      paintFrame(canvas, document, undefined, 'checkerboard');
    } catch {
      // The asset may have been removed between render and paint — ignore.
    }
    // `version` triggers a repaint on every session change; the routine
    // always reads the document's current pixels regardless of its value.
  }, [document, size, version]);

  return (
    <canvas
      ref={ref}
      className="asset-thumb"
      style={{ width: `${String(size)}px`, height: `${String(size)}px` }}
      aria-hidden="true"
    />
  );
}

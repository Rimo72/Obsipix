import { useEffect, useRef, useState } from 'react';

import { BLACK, WHITE } from '@core/types/color';

import type { EditorSession } from '../EditorSession';
import { paintFrame, type FrameBackground } from '../framePaint';
import { useEditorSessionVersion } from '../useEditorSession';
import './AnimationPreview.css';

interface AnimationPreviewProps {
  readonly session: EditorSession;
}

type Scale = 'fit' | 1 | 2 | 4 | 8;
type Background = 'checker' | 'white' | 'black';

const SCALES: readonly Scale[] = ['fit', 1, 2, 4, 8];
const MAX_STAGE_HEIGHT = 128;
const COLLAPSE_KEY = 'obsipix.animationPreview.collapsed';

function readCollapsed(): boolean {
  try {
    return localStorage.getItem(COLLAPSE_KEY) === '1';
  } catch {
    return false;
  }
}

const BACKGROUND: Record<Background, FrameBackground> = {
  checker: 'checkerboard',
  white: WHITE,
  black: BLACK,
};

const BG_META: Record<Background, { label: string; glyph: string }> = {
  checker: { label: 'Checkerboard background', glyph: '▦' },
  white: { label: 'White background', glyph: '□' },
  black: { label: 'Black background', glyph: '■' },
};

/**
 * The dedicated Animation Preview (PROJECT_CORE §110.5): a clean render of the
 * current frame — no grid, selection, onion skin or cursors — that plays the
 * animation in place. Playback drives the same authoritative state as the
 * timeline and never mutates the document (§110.12, §110.14).
 */
export function AnimationPreview({ session }: AnimationPreviewProps) {
  const [scale, setScale] = useState<Scale>('fit');
  const [background, setBackground] = useState<Background>('checker');
  const [resizeTick, setResizeTick] = useState(0);
  const [collapsed, setCollapsed] = useState(readCollapsed);

  const toggleCollapsed = (): void => {
    setCollapsed((current) => {
      const next = !current;
      try {
        localStorage.setItem(COLLAPSE_KEY, next ? '1' : '0');
      } catch {
        // storage unavailable — the choice just won't persist
      }
      return next;
    });
  };

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);

  const version = useEditorSessionVersion(session);
  const { width: docW, height: docH } = session.document.dimensions;
  const frameId = session.document.timeline.activeFrameId;

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage || typeof ResizeObserver === 'undefined') {
      return;
    }
    const observer = new ResizeObserver(() => {
      setResizeTick((tick) => tick + 1);
    });
    observer.observe(stage);
    return () => {
      observer.disconnect();
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const stage = stageRef.current;
    if (!canvas || !stage || collapsed) {
      return;
    }

    const availW = Math.max(1, stage.clientWidth - 2);
    const factor = scale === 'fit' ? Math.min(availW / docW, MAX_STAGE_HEIGHT / docH) : scale;
    const cssW = Math.max(1, Math.round(docW * factor));
    const cssH = Math.max(1, Math.round(docH * factor));

    const dpr = window.devicePixelRatio || 1;
    canvas.style.width = `${String(cssW)}px`;
    canvas.style.height = `${String(cssH)}px`;
    canvas.width = Math.round(cssW * dpr);
    canvas.height = Math.round(cssH * dpr);

    try {
      paintFrame(canvas, session.document, frameId, BACKGROUND[background]);
    } catch {
      // Frame removed between render and paint — ignore.
    }
  }, [session, version, scale, background, docW, docH, frameId, resizeTick, collapsed]);

  const frameIndex = session.document.timeline.indexOf(frameId);
  const frameCount = session.document.timeline.frameCount;

  return (
    <section className="animation-preview" aria-label="Animation preview">
      <button
        type="button"
        className="animation-preview__title"
        aria-expanded={!collapsed}
        onClick={toggleCollapsed}
      >
        <span className="animation-preview__chevron">{collapsed ? '▸' : '▾'}</span>
        Animation Preview
      </button>

      {collapsed ? null : (
        <>
          <div className="animation-preview__stage" ref={stageRef} data-testid="animation-preview">
            <canvas ref={canvasRef} className="animation-preview__canvas" />
          </div>

          <div className="animation-preview__transport" role="group" aria-label="Preview playback">
            <button type="button" aria-label="First frame" onClick={() => session.firstFrame()}>
              {'⏮'}
            </button>
            <button type="button" aria-label="Previous frame" onClick={() => session.prevFrame()}>
              {'◀'}
            </button>
            <button
              type="button"
              className="animation-preview__play"
              aria-label={session.isPlaying ? 'Pause' : 'Play'}
              aria-pressed={session.isPlaying}
              onClick={() => session.togglePlay()}
            >
              {session.isPlaying ? '⏸' : '▶'}
            </button>
            <button type="button" aria-label="Next frame" onClick={() => session.nextFrame()}>
              {'▶'}
            </button>
            <button type="button" aria-label="Last frame" onClick={() => session.lastFrame()}>
              {'⏭'}
            </button>
            <button
              type="button"
              className={
                session.playMode === 'loop'
                  ? 'animation-preview__toggle is-on'
                  : 'animation-preview__toggle'
              }
              aria-pressed={session.playMode === 'loop'}
              title="Loop playback"
              onClick={() => session.setPlayMode(session.playMode === 'loop' ? 'once' : 'loop')}
            >
              Loop
            </button>
            <span className="animation-preview__count" data-testid="animation-preview-frame">
              {frameIndex + 1} / {frameCount}
            </span>
          </div>

          <div className="animation-preview__options">
            <div className="animation-preview__seg" role="group" aria-label="Preview scale">
              {SCALES.map((option) => (
                <button
                  key={String(option)}
                  type="button"
                  aria-pressed={scale === option}
                  className={scale === option ? 'is-on' : undefined}
                  onClick={() => {
                    setScale(option);
                  }}
                >
                  {option === 'fit' ? 'Fit' : `${String(option)}×`}
                </button>
              ))}
            </div>
            <div className="animation-preview__seg" role="group" aria-label="Preview background">
              {(['checker', 'white', 'black'] as const).map((option) => (
                <button
                  key={option}
                  type="button"
                  aria-label={BG_META[option].label}
                  aria-pressed={background === option}
                  className={background === option ? 'is-on' : undefined}
                  onClick={() => {
                    setBackground(option);
                  }}
                >
                  {BG_META[option].glyph}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </section>
  );
}

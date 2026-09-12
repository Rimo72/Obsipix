import { act, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { NO_MODIFIERS, type PointerInput } from '@core/tools/PointerInput';
import type { FrameId } from '@core/types/ids';

import { EditorSession } from '../EditorSession';
import * as framePaint from '../framePaint';
import { FrameThumbnail } from './FrameThumbnail';

vi.mock('../framePaint', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../framePaint')>();
  return { ...actual, paintFrame: vi.fn(actual.paintFrame) };
});

function press(x: number, y: number): PointerInput {
  return {
    canvas: { x, y },
    pixel: { x, y },
    source: 'mouse',
    buttons: { left: true, right: false, middle: false },
    modifiers: NO_MODIFIERS,
    pressure: 1,
  };
}

function draw(session: EditorSession, x: number, y: number): void {
  session.pointerDown(press(x, y));
  session.pointerUp({ ...press(x, y), buttons: { left: false, right: false, middle: false } });
}

/** A controllable `IntersectionObserver` stand-in — jsdom has no real one. */
class FakeIntersectionObserver {
  static instances: FakeIntersectionObserver[] = [];
  readonly callback: IntersectionObserverCallback;
  constructor(callback: IntersectionObserverCallback) {
    this.callback = callback;
    FakeIntersectionObserver.instances.push(this);
  }
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
  report(isIntersecting: boolean): void {
    this.callback(
      [{ isIntersecting } as IntersectionObserverEntry],
      this as unknown as IntersectionObserver,
    );
  }
}

describe('FrameThumbnail', () => {
  it('renders a decorative canvas sized in CSS pixels', () => {
    const session = new EditorSession();
    const frameId = session.document.timeline.activeFrameId;
    const { container } = render(<FrameThumbnail session={session} frameId={frameId} size={44} />);

    const canvas = container.querySelector('canvas');
    expect(canvas).not.toBeNull();
    expect(canvas).toHaveAttribute('aria-hidden', 'true');
    expect(canvas?.style.width).toBe('44px');
    expect(canvas?.style.height).toBe('44px');
  });

  it('does not throw when the frame no longer exists', () => {
    const session = new EditorSession();
    const gone = 'frm_gone' as unknown as FrameId;
    expect(() =>
      render(<FrameThumbnail session={session} frameId={gone} size={20} />),
    ).not.toThrow();
  });

  describe('off-screen repaint gating', () => {
    const originalIO = globalThis.IntersectionObserver;
    const paintFrame = vi.mocked(framePaint.paintFrame);

    afterEach(() => {
      globalThis.IntersectionObserver = originalIO;
      FakeIntersectionObserver.instances = [];
      paintFrame.mockClear();
    });

    it('skips repainting a thumbnail the observer reports as off-screen', () => {
      globalThis.IntersectionObserver =
        FakeIntersectionObserver as unknown as typeof IntersectionObserver;

      const session = new EditorSession();
      const frameId = session.document.timeline.activeFrameId;
      const { rerender } = render(<FrameThumbnail session={session} frameId={frameId} size={20} />);
      const observer = FakeIntersectionObserver.instances.at(-1)!;
      paintFrame.mockClear(); // drop the initial on-mount paint

      act(() => {
        observer.report(false); // now off-screen
      });
      draw(session, 1, 1);
      rerender(<FrameThumbnail session={session} frameId={frameId} size={20} />);

      expect(paintFrame).not.toHaveBeenCalled();
    });

    it('catches up the moment it scrolls back into view', () => {
      globalThis.IntersectionObserver =
        FakeIntersectionObserver as unknown as typeof IntersectionObserver;

      const session = new EditorSession();
      const frameId = session.document.timeline.activeFrameId;
      const { rerender } = render(<FrameThumbnail session={session} frameId={frameId} size={20} />);
      const observer = FakeIntersectionObserver.instances.at(-1)!;

      act(() => {
        observer.report(false);
      });
      draw(session, 1, 1);
      rerender(<FrameThumbnail session={session} frameId={frameId} size={20} />);
      paintFrame.mockClear();

      act(() => {
        observer.report(true); // back on screen — should catch up to the latest version
      });

      expect(paintFrame).toHaveBeenCalledTimes(1);
    });
  });
});

import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { EditorSession } from '../EditorSession';
import { TimelinePanel } from './TimelinePanel';

describe('TimelinePanel frame thumbnails', () => {
  it('draws a thumbnail canvas for every frame', () => {
    const session = new EditorSession();
    session.addFrame();
    session.addFrame();

    render(<TimelinePanel session={session} />);
    const frames = screen.getAllByTestId('timeline-frame');
    expect(frames).toHaveLength(3);
    for (const frame of frames) {
      expect(frame.querySelector('canvas.frame-thumb')).not.toBeNull();
    }
  });

  it('badges and labels a non-normal cel on the active layer', () => {
    const session = new EditorSession();
    session.addEmptyFrame(); // frame 2: empty cel on the (only) layer

    render(<TimelinePanel session={session} />);

    const emptyFrame = screen.getByRole('button', { name: 'Frame 2, empty cel' });
    expect(within(emptyFrame).getByTitle('empty cel')).toBeInTheDocument();

    // frame 1 is a plain normal cel — no badge, plain label
    expect(screen.getByRole('button', { name: 'Frame 1' })).toBeInTheDocument();
  });

  it('marks a linked cel with a link badge', () => {
    const session = new EditorSession();
    session.addFrame();
    const [first, second] = session.document.timeline.frames;
    session.linkCel(first!.id, second!.id, session.document.layers.activeLayerId);

    render(<TimelinePanel session={session} />);
    const linked = screen.getByRole('button', { name: 'Frame 2, linked cel' });
    expect(within(linked).getByTitle('linked cel')).toBeInTheDocument();
  });
});

describe('TimelinePanel frame strip virtualization', () => {
  function stubMeasuredWidth(px: number): () => void {
    const original = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'clientWidth');
    Object.defineProperty(HTMLElement.prototype, 'clientWidth', {
      configurable: true,
      get() {
        return px;
      },
    });
    return () => {
      if (original) {
        Object.defineProperty(HTMLElement.prototype, 'clientWidth', original);
      }
    };
  }

  it('mounts far fewer frames than exist once the strip is measured', () => {
    const restore = stubMeasuredWidth(300); // room for ~5 items at 60px each
    try {
      const session = new EditorSession();
      for (let i = 0; i < 199; i += 1) {
        session.addFrame();
      }

      render(<TimelinePanel session={session} />);
      const rendered = screen.getAllByTestId('timeline-frame');
      expect(rendered.length).toBeGreaterThan(0);
      // buffer is small and fixed — nowhere near the full 200 frames
      expect(rendered.length).toBeLessThan(30);
    } finally {
      restore();
    }
  });

  it('still mounts every frame for a small project (nothing to virtualize away)', () => {
    const restore = stubMeasuredWidth(300);
    try {
      const session = new EditorSession();
      session.addFrame();
      session.addFrame();

      render(<TimelinePanel session={session} />);
      expect(screen.getAllByTestId('timeline-frame')).toHaveLength(3);
    } finally {
      restore();
    }
  });
});

describe('TimelinePanel tag editor', () => {
  it('stays open while focus moves between its fields, and closes when focus leaves', () => {
    const session = new EditorSession();
    session.addFrame();
    session.addTag('walk', 0, 1);

    render(<TimelinePanel session={session} />);
    fireEvent.click(screen.getByRole('button', { name: /walk/ }));

    const name = screen.getByLabelText('Rename tag walk');
    const start = screen.getByLabelText('Tag walk start frame');

    // tabbing name → start must NOT collapse the editor
    fireEvent.blur(name, { relatedTarget: start });
    expect(screen.getByLabelText('Tag walk start frame')).toBeInTheDocument();

    // focus leaving the editor entirely does close it
    fireEvent.blur(start, { relatedTarget: document.body });
    expect(screen.queryByLabelText('Tag walk start frame')).not.toBeInTheDocument();
  });
});

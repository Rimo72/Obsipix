import { render, screen, within } from '@testing-library/react';
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

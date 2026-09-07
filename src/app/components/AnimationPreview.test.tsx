import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { EditorSession } from '../EditorSession';
import { AnimationPreview } from './AnimationPreview';

function twoFrameSession(): EditorSession {
  const session = new EditorSession();
  session.addFrame();
  session.firstFrame();
  return session;
}

describe('AnimationPreview', () => {
  it('renders a preview canvas and a frame counter', () => {
    render(<AnimationPreview session={twoFrameSession()} />);
    expect(screen.getByTestId('animation-preview').querySelector('canvas')).not.toBeNull();
    expect(screen.getByTestId('animation-preview-frame')).toHaveTextContent('1 / 2');
  });

  it('switches scale and background, reflecting the choice with aria-pressed', () => {
    render(<AnimationPreview session={twoFrameSession()} />);

    fireEvent.click(screen.getByRole('button', { name: '4×' }));
    expect(screen.getByRole('button', { name: '4×' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Fit' })).toHaveAttribute('aria-pressed', 'false');

    fireEvent.click(screen.getByRole('button', { name: 'Black background' }));
    expect(screen.getByRole('button', { name: 'Black background' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });

  it('drives playback on the shared session state', () => {
    const session = twoFrameSession();
    const toggle = vi.spyOn(session, 'togglePlay').mockImplementation(() => undefined);
    render(<AnimationPreview session={session} />);

    fireEvent.click(screen.getByRole('button', { name: 'Next frame' }));
    expect(screen.getByTestId('animation-preview-frame')).toHaveTextContent('2 / 2');

    fireEvent.click(screen.getByRole('button', { name: 'Play' }));
    expect(toggle).toHaveBeenCalled();
  });
});

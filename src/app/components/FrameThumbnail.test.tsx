import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import type { FrameId } from '@core/types/ids';

import { EditorSession } from '../EditorSession';
import { FrameThumbnail } from './FrameThumbnail';

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
});

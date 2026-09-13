import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { EditorSession } from '../EditorSession';
import { TerrainGridPanel } from './TerrainGridPanel';

describe('TerrainGridPanel (V2 coding-phases Phase 5)', () => {
  it('shows an empty state when the active asset is not a terrain set', () => {
    const session = new EditorSession();
    render(<TerrainGridPanel session={session} />);
    expect(screen.getByText('This asset isn’t a terrain set.')).toBeInTheDocument();
  });

  it('renders all 9 tile-role slots for a terrain set, active slot highlighted', () => {
    const session = new EditorSession();
    session.createAsset('terrain-grass-tile');
    render(<TerrainGridPanel session={session} />);

    expect(screen.getByRole('button', { name: 'Edit Center tile' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Edit Corner ↖ tile' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Edit Edge ↑ tile' })).toBeInTheDocument();

    // starts on frame 0 (corner_tl in the canonical role order)
    expect(screen.getByRole('button', { name: 'Edit Corner ↖ tile' }).className).toContain(
      '--active',
    );
  });

  it('clicking a slot switches the active frame for editing', () => {
    const session = new EditorSession();
    session.createAsset('terrain-grass-tile');
    render(<TerrainGridPanel session={session} />);

    fireEvent.click(screen.getByRole('button', { name: 'Edit Center tile' }));

    const centerFrame = session.document.timeline.frames[4]!; // 'center' is index 4
    expect(session.document.timeline.activeFrameId).toBe(centerFrame.id);
  });
});

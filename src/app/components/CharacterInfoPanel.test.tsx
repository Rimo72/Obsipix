import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { EditorSession } from '../EditorSession';
import { CharacterInfoPanel } from './CharacterInfoPanel';

describe('CharacterInfoPanel (V2 coding-phases Phase 6)', () => {
  it('shows an empty state when the active asset is not a character set', () => {
    const session = new EditorSession();
    render(<CharacterInfoPanel session={session} />);
    expect(screen.getByText('This asset isn’t a character set.')).toBeInTheDocument();
  });

  it('renders the views, the state checklist, and the proportion guideline for a character', () => {
    const session = new EditorSession();
    session.createAsset('character-hero');
    render(<CharacterInfoPanel session={session} />);

    expect(screen.getByRole('button', { name: 'Edit Front view' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Edit Side view' })).toBeInTheDocument();
    expect(screen.getByText('Idle')).toBeInTheDocument();
    expect(screen.getByText('Walk')).toBeInTheDocument();
    expect(screen.getByText(/Head-height guideline: 25%/)).toBeInTheDocument();
  });

  it('marks an animation state done once a matching tag exists', () => {
    const session = new EditorSession();
    session.createAsset('character-hero');
    render(<CharacterInfoPanel session={session} />);

    const idleItem = screen.getByText('Idle').closest('li')!;
    expect(idleItem.className).not.toContain('--done');

    session.addTag('Idle', 0, 0);
    render(<CharacterInfoPanel session={session} />);
    const idleItems = screen.getAllByText('Idle').map((el) => el.closest('li')!);
    expect(idleItems.some((el) => el.className.includes('--done'))).toBe(true);
  });

  it('clicking a view switches the active frame', () => {
    const session = new EditorSession();
    session.createAsset('character-hero');
    render(<CharacterInfoPanel session={session} />);

    fireEvent.click(screen.getByRole('button', { name: 'Edit Back view' }));
    const backFrame = session.document.timeline.frames[1]!; // back is the second declared view
    expect(session.document.timeline.activeFrameId).toBe(backFrame.id);
  });

  it('shows no constraint violations for a freshly-created character', () => {
    const session = new EditorSession();
    session.createAsset('character-hero');
    render(<CharacterInfoPanel session={session} />);
    expect(screen.getByText('Matches its template.')).toBeInTheDocument();
  });
});

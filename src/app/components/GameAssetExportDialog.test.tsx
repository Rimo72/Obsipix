import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { EditorSession } from '../EditorSession';
import type { GameAssetExportSettings } from '../gameAssetExport';
import { GameAssetExportDialog } from './GameAssetExportDialog';

function heroSession(): EditorSession {
  const session = new EditorSession();
  session.createAsset('character-hero');
  return session;
}

function terrainSession(): EditorSession {
  const session = new EditorSession();
  session.createAsset('terrain-grass-tile');
  return session;
}

describe('GameAssetExportDialog (V2 coding-phases Phase 8)', () => {
  it('exports a single-frame asset at the chosen scale, with no frame range', () => {
    const onExport = vi.fn();
    render(
      <GameAssetExportDialog session={new EditorSession()} onClose={vi.fn()} onExport={onExport} />,
    );

    fireEvent.click(screen.getByRole('button', { name: '4×' }));
    fireEvent.click(screen.getByRole('button', { name: 'Export' }));

    expect(onExport).toHaveBeenCalledWith(
      expect.objectContaining({ scale: 4, layout: 'horizontal', columns: 1, spacing: 0 }),
    );
    expect(onExport.mock.calls[0]?.[0]).not.toHaveProperty('frameRange');
  });

  it('shows the scaled output dimensions', () => {
    render(
      <GameAssetExportDialog session={new EditorSession()} onClose={vi.fn()} onExport={vi.fn()} />,
    );
    fireEvent.click(screen.getByRole('button', { name: '2×' }));
    expect(screen.getByTestId('game-export-output-size')).toHaveTextContent(
      'Output: 64 × 64 px · 1 frame',
    );
  });

  it('hides Scope and Layout for a plain single-frame asset', () => {
    render(
      <GameAssetExportDialog session={new EditorSession()} onClose={vi.fn()} onExport={vi.fn()} />,
    );
    expect(screen.queryByText('Scope')).not.toBeInTheDocument();
    expect(screen.queryByText('Layout')).not.toBeInTheDocument();
  });

  it("offers a character asset's declared animation states as Scope tabs, disabled until a tag exists", () => {
    render(<GameAssetExportDialog session={heroSession()} onClose={vi.fn()} onExport={vi.fn()} />);
    expect(screen.getByRole('tab', { name: 'All frames' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    expect(screen.getByRole('tab', { name: 'Idle' })).toBeDisabled();
    expect(screen.getByRole('tab', { name: 'Walk' })).toBeDisabled();
  });

  it('scopes the export to a matching animation tag when selected', () => {
    const session = heroSession();
    const frameCount = session.document.timeline.frameCount;
    session.document.timeline.addTag({
      name: 'Walk',
      startFrame: 0,
      endFrame: frameCount - 1,
      direction: 'forward',
    });

    const onExport = vi.fn();
    render(<GameAssetExportDialog session={session} onClose={vi.fn()} onExport={onExport} />);

    const walkTab = screen.getByRole('tab', { name: 'Walk' });
    expect(walkTab).not.toBeDisabled();
    fireEvent.click(walkTab);
    expect(walkTab).toHaveAttribute('aria-selected', 'true');

    fireEvent.click(screen.getByRole('button', { name: 'Export' }));
    expect(onExport).toHaveBeenCalledWith(
      expect.objectContaining({ frameRange: { start: 0, end: frameCount - 1 } }),
    );
  });

  it('exports with the Godot profile when that target is selected', () => {
    const onExport = vi.fn();
    render(
      <GameAssetExportDialog session={new EditorSession()} onClose={vi.fn()} onExport={onExport} />,
    );

    fireEvent.change(screen.getByLabelText('Target'), { target: { value: 'godot' } });
    fireEvent.click(screen.getByRole('button', { name: 'Export' }));

    const settings = onExport.mock.calls[0]?.[0] as GameAssetExportSettings | undefined;
    expect(settings?.profile?.id).toBe('godot');
  });

  it('defaults to the Generic target', () => {
    render(
      <GameAssetExportDialog session={new EditorSession()} onClose={vi.fn()} onExport={vi.fn()} />,
    );
    expect(screen.getByLabelText('Target')).toHaveValue('generic');
  });

  it('defaults a terrain asset to a 3-column grid matching its 3x3 tile-role set', () => {
    const onExport = vi.fn();
    render(
      <GameAssetExportDialog session={terrainSession()} onClose={vi.fn()} onExport={onExport} />,
    );

    expect(screen.getByTestId('game-export-output-size')).toHaveTextContent(
      'Output: 96 × 96 px · 9 frames',
    );

    fireEvent.click(screen.getByRole('button', { name: 'Export' }));
    expect(onExport).toHaveBeenCalledWith(expect.objectContaining({ layout: 'grid', columns: 3 }));
  });
});

import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { createDefaultDocument } from '@core/document/DocumentFactory';

import { EditorSession } from '../EditorSession';
import { AssetLibraryPanel } from './AssetLibraryPanel';

describe('AssetLibraryPanel (V2 coding-phases Phase 3)', () => {
  it('lists every asset in the project and marks the active one', () => {
    const session = new EditorSession();
    session.addAsset(createDefaultDocument());
    render(<AssetLibraryPanel session={session} onCreateAsset={vi.fn()} />);

    const rows = screen.getAllByTestId('asset-row');
    expect(rows).toHaveLength(2);
    expect(rows[0]?.className).toContain('asset-library__row--active');
    expect(rows[1]?.className).not.toContain('asset-library__row--active');
  });

  it('clicking a row switches the active asset', () => {
    const session = new EditorSession();
    const secondId = session.addAsset(createDefaultDocument());
    render(<AssetLibraryPanel session={session} onCreateAsset={vi.fn()} />);

    const rows = screen.getAllByTestId('asset-row');
    fireEvent.click(within(rows[1]!).getByRole('button', { name: 'Untitled' }));
    expect(session.activeAssetId).toBe(secondId);
  });

  it('the + button calls onCreateAsset', () => {
    const onCreateAsset = vi.fn();
    const session = new EditorSession();
    render(<AssetLibraryPanel session={session} onCreateAsset={onCreateAsset} />);
    fireEvent.click(screen.getByRole('button', { name: 'New asset' }));
    expect(onCreateAsset).toHaveBeenCalledTimes(1);
  });

  it('duplicates the active asset and lists the copy', () => {
    const session = new EditorSession();
    const { rerender } = render(<AssetLibraryPanel session={session} onCreateAsset={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: 'Duplicate asset' }));
    expect(session.assetIds).toHaveLength(2);
    rerender(<AssetLibraryPanel session={session} onCreateAsset={vi.fn()} />);
    expect(screen.getAllByTestId('asset-row')).toHaveLength(2);
  });

  it('delete is disabled with only one asset, enabled with more than one', () => {
    const session = new EditorSession();
    const { rerender } = render(<AssetLibraryPanel session={session} onCreateAsset={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Delete asset' })).toBeDisabled();

    session.addAsset(createDefaultDocument());
    rerender(<AssetLibraryPanel session={session} onCreateAsset={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Delete asset' })).not.toBeDisabled();

    fireEvent.click(screen.getByRole('button', { name: 'Delete asset' }));
    expect(session.assetIds).toHaveLength(1);
  });

  it('renames an asset via double-click, Enter to commit', () => {
    const session = new EditorSession();
    render(<AssetLibraryPanel session={session} onCreateAsset={vi.fn()} />);

    const nameButton = within(screen.getAllByTestId('asset-row')[0]!).getByRole('button', {
      name: 'Untitled',
    });
    fireEvent.doubleClick(nameButton);

    const input = screen.getByDisplayValue(session.document.metadata.name);
    fireEvent.change(input, { target: { value: 'Goblin Sprite' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(session.document.metadata.name).toBe('Goblin Sprite');
  });

  it('filters the list by category', () => {
    const session = new EditorSession();
    session.createAsset('character-hero');
    render(<AssetLibraryPanel session={session} onCreateAsset={vi.fn()} />);

    expect(screen.getAllByTestId('asset-row')).toHaveLength(2);
    fireEvent.change(screen.getByLabelText('Filter by category'), {
      target: { value: 'character' },
    });
    expect(screen.getAllByTestId('asset-row')).toHaveLength(1);
    expect(screen.getByText('Hero')).toBeInTheDocument();
  });

  it('filters the list by search text', () => {
    const session = new EditorSession();
    session.createAsset('character-hero');
    render(<AssetLibraryPanel session={session} onCreateAsset={vi.fn()} />);

    fireEvent.change(screen.getByLabelText('Search assets'), { target: { value: 'hero' } });
    expect(screen.getAllByTestId('asset-row')).toHaveLength(1);
    expect(screen.getByText('Hero')).toBeInTheDocument();
  });

  it('shows an empty-state message when filters match nothing', () => {
    const session = new EditorSession();
    render(<AssetLibraryPanel session={session} onCreateAsset={vi.fn()} />);
    fireEvent.change(screen.getByLabelText('Search assets'), { target: { value: 'nope' } });
    expect(screen.getByText('No assets match your filters.')).toBeInTheDocument();
  });
});

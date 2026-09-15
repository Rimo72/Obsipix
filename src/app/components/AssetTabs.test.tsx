import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { EditorSession } from '../EditorSession';
import { AssetTabs } from './AssetTabs';

describe('AssetTabs', () => {
  it('renders one tab per asset, with the active one marked selected', () => {
    const session = new EditorSession();
    session.createAsset('terrain-grass-tile');
    render(<AssetTabs session={session} onCreateAsset={vi.fn()} onEditStyle={vi.fn()} />);

    const tabs = screen.getAllByTestId('asset-tab');
    expect(tabs).toHaveLength(2);
    expect(screen.getByRole('tab', { selected: true })).toHaveTextContent('Grass Terrain Set');
  });

  it('clicking a tab switches the active asset', () => {
    const session = new EditorSession();
    const firstId = session.activeAssetId;
    const secondId = session.createAsset('terrain-grass-tile');
    expect(session.activeAssetId).toBe(secondId);

    render(<AssetTabs session={session} onCreateAsset={vi.fn()} onEditStyle={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Untitled' }));
    expect(session.activeAssetId).toBe(firstId);
  });

  it('the "+" button opens the new-asset dialog', () => {
    const onCreateAsset = vi.fn();
    render(
      <AssetTabs
        session={new EditorSession()}
        onCreateAsset={onCreateAsset}
        onEditStyle={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'New asset' }));
    expect(onCreateAsset).toHaveBeenCalledTimes(1);
  });

  it('closing a tab removes that asset, and is disabled when only one remains', () => {
    const session = new EditorSession();
    const firstId = session.activeAssetId;
    session.createAsset('terrain-grass-tile');
    expect(session.assetIds).toHaveLength(2);

    render(<AssetTabs session={session} onCreateAsset={vi.fn()} onEditStyle={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Close Untitled' }));
    expect(session.assetIds).toHaveLength(1);
    expect(session.assetIds).not.toContain(firstId);
  });

  it('disables closing the last remaining asset', () => {
    render(
      <AssetTabs session={new EditorSession()} onCreateAsset={vi.fn()} onEditStyle={vi.fn()} />,
    );
    expect(screen.getByRole('button', { name: 'Close Untitled' })).toBeDisabled();
  });

  it('double-clicking a tab label renames it', () => {
    const session = new EditorSession();
    render(<AssetTabs session={session} onCreateAsset={vi.fn()} onEditStyle={vi.fn()} />);

    fireEvent.doubleClick(screen.getByRole('button', { name: 'Untitled' }));
    const input = screen.getByDisplayValue('Untitled');
    fireEvent.change(input, { target: { value: 'Hero Sprite' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(session.document.metadata.name).toBe('Hero Sprite');
    expect(screen.getByRole('button', { name: 'Hero Sprite' })).toBeInTheDocument();
  });

  it('the duplicate button duplicates the active asset', () => {
    const session = new EditorSession();
    render(<AssetTabs session={session} onCreateAsset={vi.fn()} onEditStyle={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Duplicate asset' }));
    expect(session.assetIds).toHaveLength(2);
  });

  it('the project style button opens the style dialog', () => {
    const onEditStyle = vi.fn();
    render(
      <AssetTabs session={new EditorSession()} onCreateAsset={vi.fn()} onEditStyle={onEditStyle} />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Project style' }));
    expect(onEditStyle).toHaveBeenCalledTimes(1);
  });
});

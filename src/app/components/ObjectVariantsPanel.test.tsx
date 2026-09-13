import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { EditorSession } from '../EditorSession';
import { ObjectVariantsPanel } from './ObjectVariantsPanel';

describe('ObjectVariantsPanel (V2 coding-phases Phase 7)', () => {
  it('shows an empty state for an asset with no declared variants and no lineage', () => {
    const session = new EditorSession();
    render(<ObjectVariantsPanel session={session} />);
    expect(screen.getByText('This asset has no declared variants.')).toBeInTheDocument();
  });

  it('lists declared variants with a Create button when none exist yet', () => {
    const session = new EditorSession();
    session.createAsset('object-tree');
    render(<ObjectVariantsPanel session={session} />);

    expect(screen.getByText('Small')).toBeInTheDocument();
    expect(screen.getByText('Medium')).toBeInTheDocument();
    expect(screen.getByText('Large')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: '+ Create' })).toHaveLength(3);
  });

  it('creating a variant adds it to the project and marks the label fulfilled', () => {
    const session = new EditorSession();
    session.createAsset('object-tree');
    const { rerender } = render(<ObjectVariantsPanel session={session} />);

    const countBefore = session.assetIds.length;
    fireEvent.click(screen.getAllByRole('button', { name: '+ Create' })[0]!);
    expect(session.assetIds).toHaveLength(countBefore + 1);

    rerender(<ObjectVariantsPanel session={session} />);
    expect(screen.getAllByRole('button', { name: '+ Create' })).toHaveLength(2); // one fulfilled now
  });

  it('clicking an existing variant switches the active asset to it', () => {
    const session = new EditorSession();
    session.createAsset('object-tree');
    const treeId = session.activeAssetId;
    const smallId = session.duplicateAsset(treeId, 'small');
    render(<ObjectVariantsPanel session={session} />);

    fireEvent.click(screen.getByRole('button', { name: /Small/ }));
    expect(session.activeAssetId).toBe(smallId);
  });

  it("shows 'Variant of' with a link back to the parent for a derived asset", () => {
    const session = new EditorSession();
    session.createAsset('object-tree');
    const treeId = session.activeAssetId;
    const smallId = session.duplicateAsset(treeId, 'small');
    session.switchAsset(smallId);
    render(<ObjectVariantsPanel session={session} />);

    expect(screen.getByText('Variant of')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Tree/ }));
    expect(session.activeAssetId).toBe(treeId);
  });
});

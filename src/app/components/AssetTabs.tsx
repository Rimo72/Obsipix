import { useState } from 'react';

import type { AssetId } from '@core/types/ids';

import type { EditorSession } from '../EditorSession';
import './AssetTabs.css';

interface AssetTabsProps {
  readonly session: EditorSession;
  /** Open the "+ New Asset" dialog (Blank / From Template), added to the Project. */
  readonly onCreateAsset: () => void;
  /** Open the Project Style dialog (V2 coding-phases Phase 4). */
  readonly onEditStyle: () => void;
}

/**
 * Browser-style tabs across the top of the canvas, one per Asset in the
 * Project — replaces the earlier Asset Library sidebar list with the more
 * familiar "one tab per open file" pattern. Switching, creating, duplicating,
 * renaming and closing all work the same way they did in the sidebar version;
 * only the search/filter-by-category controls didn't carry over, since a
 * flat tab strip has nowhere to put them.
 */
export function AssetTabs({ session, onCreateAsset, onEditStyle }: AssetTabsProps) {
  const [renaming, setRenaming] = useState<AssetId | null>(null);

  const activeId = session.activeAssetId;
  const assets = session.project.assets;

  const renameTab = (id: AssetId, value: string): void => {
    setRenaming(null);
    session.renameAsset(id, value);
  };

  return (
    <div className="asset-tabs" role="tablist" aria-label="Open assets">
      {assets.map((asset) => {
        const active = asset.id === activeId;
        const name = asset.document.metadata.name || 'Untitled';
        return (
          <div
            key={asset.id}
            role="tab"
            aria-selected={active}
            data-testid="asset-tab"
            className={active ? 'asset-tabs__tab asset-tabs__tab--active' : 'asset-tabs__tab'}
          >
            {renaming === asset.id ? (
              <input
                className="asset-tabs__name-input"
                defaultValue={name}
                autoFocus
                onBlur={(event) => {
                  renameTab(asset.id, event.target.value);
                }}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    renameTab(asset.id, event.currentTarget.value);
                  } else if (event.key === 'Escape') {
                    setRenaming(null);
                  }
                }}
              />
            ) : (
              <button
                type="button"
                className="asset-tabs__label"
                title={name}
                onClick={() => {
                  session.switchAsset(asset.id);
                }}
                onDoubleClick={() => {
                  setRenaming(asset.id);
                }}
              >
                {name}
                {asset.history.isDirty ? ' •' : ''}
              </button>
            )}
            <button
              type="button"
              className="asset-tabs__close"
              aria-label={`Close ${name}`}
              title="Close asset"
              disabled={assets.length <= 1}
              onClick={() => {
                session.removeAsset(asset.id);
              }}
            >
              &times;
            </button>
          </div>
        );
      })}

      <button
        type="button"
        className="asset-tabs__new"
        aria-label="New asset"
        title="New asset"
        onClick={onCreateAsset}
      >
        +
      </button>

      <div className="asset-tabs__spacer" />

      <button
        type="button"
        className="asset-tabs__icon"
        aria-label="Duplicate asset"
        title="Duplicate asset"
        onClick={() => {
          session.duplicateAsset(activeId);
        }}
      >
        &#10697;
      </button>
      <button
        type="button"
        className="asset-tabs__icon"
        aria-label="Project style"
        title="Project style"
        onClick={onEditStyle}
      >
        &#127912;
      </button>
    </div>
  );
}

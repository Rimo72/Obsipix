import { useState } from 'react';

import { ASSET_CATEGORIES, type AssetCategory } from '@core/project/AssetCategory';
import { filterAssets } from '@core/project/filterAssets';
import { RESOLUTION_PRESETS, type ResolutionPreset } from '@core/project/AssetResolution';
import { PERSPECTIVE_KINDS, type PerspectiveKind } from '@core/project/Perspective';
import type { AssetId } from '@core/types/ids';

import type { EditorSession } from '../EditorSession';
import { AssetThumbnail } from './AssetThumbnail';
import './AssetLibraryPanel.css';

interface AssetLibraryPanelProps {
  readonly session: EditorSession;
  /** Open the "+ New Asset" dialog (Blank / From Template), added to the Project. */
  readonly onCreateAsset: () => void;
  /** Open the Project Style dialog (V2 coding-phases Phase 4). */
  readonly onEditStyle: () => void;
}

function formatLabel(value: string): string {
  return value
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * A browsable, manageable library of a Project's assets (V2 coding-phases
 * Phase 3, vision doc §10): create, rename, duplicate, delete, search,
 * filter by category/perspective/resolution, preview, open-for-edit.
 */
export function AssetLibraryPanel({ session, onCreateAsset, onEditStyle }: AssetLibraryPanelProps) {
  const [renaming, setRenaming] = useState<AssetId | null>(null);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<AssetCategory | ''>('');
  const [perspective, setPerspective] = useState<PerspectiveKind | ''>('');
  const [resolution, setResolution] = useState<ResolutionPreset | ''>('');

  const version = session.getVersion();
  const activeId = session.activeAssetId;
  const assets = session.project.assets;
  const filtered = filterAssets(assets, {
    ...(search ? { search } : {}),
    ...(category ? { category } : {}),
    ...(perspective ? { perspective } : {}),
    ...(resolution ? { resolution } : {}),
  });

  const renameRow = (id: AssetId, value: string): void => {
    setRenaming(null);
    session.renameAsset(id, value);
  };

  return (
    <div className="asset-library">
      <div className="asset-library__toolbar" role="group" aria-label="Asset actions">
        <button type="button" aria-label="New asset" title="New asset" onClick={onCreateAsset}>
          +
        </button>
        <button
          type="button"
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
          aria-label="Delete asset"
          title="Delete asset"
          disabled={session.assetIds.length <= 1}
          onClick={() => {
            session.removeAsset(activeId);
          }}
        >
          &#128465;
        </button>
        <button
          type="button"
          aria-label="Project style"
          title="Project style"
          onClick={onEditStyle}
        >
          &#127912;
        </button>
      </div>

      <div className="asset-library__filters">
        <input
          type="search"
          className="asset-library__search"
          placeholder="Search assets"
          aria-label="Search assets"
          value={search}
          onChange={(event) => {
            setSearch(event.target.value);
          }}
        />
        <select
          aria-label="Filter by category"
          value={category}
          onChange={(event) => {
            setCategory(event.target.value as AssetCategory | '');
          }}
        >
          <option value="">All categories</option>
          {ASSET_CATEGORIES.map((option) => (
            <option key={option} value={option}>
              {formatLabel(option)}
            </option>
          ))}
        </select>
        <select
          aria-label="Filter by perspective"
          value={perspective}
          onChange={(event) => {
            setPerspective(event.target.value as PerspectiveKind | '');
          }}
        >
          <option value="">All perspectives</option>
          {PERSPECTIVE_KINDS.map((option) => (
            <option key={option} value={option}>
              {formatLabel(option)}
            </option>
          ))}
        </select>
        <select
          aria-label="Filter by resolution"
          value={resolution}
          onChange={(event) => {
            setResolution(event.target.value as ResolutionPreset | '');
          }}
        >
          <option value="">All resolutions</option>
          {RESOLUTION_PRESETS.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </div>

      {filtered.length === 0 ? (
        <p className="asset-library__empty">
          {assets.length === 0 ? 'No assets yet.' : 'No assets match your filters.'}
        </p>
      ) : (
        <ul className="asset-library__list">
          {filtered.map((asset) => {
            const active = asset.id === activeId;
            const name = asset.document.metadata.name;
            return (
              <li
                key={asset.id}
                className={
                  active ? 'asset-library__row asset-library__row--active' : 'asset-library__row'
                }
                data-testid="asset-row"
              >
                <button
                  type="button"
                  className="asset-library__thumb-button"
                  aria-label={`Open ${name}`}
                  onClick={() => {
                    session.switchAsset(asset.id);
                  }}
                >
                  <AssetThumbnail document={asset.document} version={version} size={40} />
                </button>
                <div className="asset-library__info">
                  {renaming === asset.id ? (
                    <input
                      className="asset-library__name-input"
                      defaultValue={name}
                      autoFocus
                      onBlur={(event) => {
                        renameRow(asset.id, event.target.value);
                      }}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') {
                          renameRow(asset.id, event.currentTarget.value);
                        } else if (event.key === 'Escape') {
                          setRenaming(null);
                        }
                      }}
                    />
                  ) : (
                    <button
                      type="button"
                      className="asset-library__name"
                      aria-current={active ? 'true' : undefined}
                      onClick={() => {
                        session.switchAsset(asset.id);
                      }}
                      onDoubleClick={() => {
                        setRenaming(asset.id);
                      }}
                    >
                      {name}
                    </button>
                  )}
                  <span className="asset-library__meta">
                    {formatLabel(asset.metadata.category)} ·{' '}
                    {formatLabel(asset.metadata.perspective.kind)} ·{' '}
                    {asset.metadata.resolution.width}×{asset.metadata.resolution.height}
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

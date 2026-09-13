import { findVariants } from '@core/project/assetVariants';

import type { EditorSession } from '../EditorSession';
import { AssetThumbnail } from './AssetThumbnail';
import './ObjectVariantsPanel.css';

interface ObjectVariantsPanelProps {
  readonly session: EditorSession;
}

function formatLabel(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

/**
 * The declared variant/state checklist for the active asset's Object
 * Template, plus its own lineage (V2 coding-phases Phase 7, vision doc
 * §8-§9). Empty when the asset isn't an object template's base and isn't
 * itself a variation of something.
 */
export function ObjectVariantsPanel({ session }: ObjectVariantsPanelProps) {
  const metadata = session.assetMetadata;
  const activeId = session.activeAssetId;
  const declaredVariants = metadata.objectVariants;
  const version = session.getVersion();

  const parentId = metadata.variantOf;
  const parent = parentId ? session.project.getAsset(parentId) : undefined;

  if ((!declaredVariants || declaredVariants.length === 0) && !parentId) {
    return <p className="object-variants__empty">This asset has no declared variants.</p>;
  }

  const siblings = findVariants(session.project.assets, activeId);

  return (
    <div className="object-variants">
      {parentId && (
        <div className="object-variants__section">
          <h4>Variant of</h4>
          {parent ? (
            <button
              type="button"
              className="object-variants__parent"
              onClick={() => {
                session.switchAsset(parentId);
              }}
            >
              <AssetThumbnail document={parent.document} version={version} size={32} />
              <span>{parent.document.metadata.name}</span>
              {metadata.variantLabel && <em>({formatLabel(metadata.variantLabel)})</em>}
            </button>
          ) : (
            <p className="object-variants__missing-parent">
              Original asset no longer exists in this project.
            </p>
          )}
        </div>
      )}

      {declaredVariants && declaredVariants.length > 0 && (
        <div className="object-variants__section">
          <h4>Variants</h4>
          <ul className="object-variants__list">
            {declaredVariants.map((label) => {
              const existing = siblings.find(
                (asset) => asset.metadata.variantLabel?.toLowerCase() === label.toLowerCase(),
              );
              return (
                <li key={label} className="object-variants__row">
                  {existing ? (
                    <button
                      type="button"
                      className="object-variants__existing"
                      onClick={() => {
                        session.switchAsset(existing.id);
                      }}
                    >
                      <AssetThumbnail document={existing.document} version={version} size={32} />
                      <span>{formatLabel(label)}</span>
                      <span aria-hidden="true">✓</span>
                    </button>
                  ) : (
                    <>
                      <span className="object-variants__label">{formatLabel(label)}</span>
                      <button
                        type="button"
                        onClick={() => {
                          session.duplicateAsset(activeId, label);
                        }}
                      >
                        + Create
                      </button>
                    </>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}

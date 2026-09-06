import { useState } from 'react';

import type { Layer } from '@core/document/Layer';
import type { LayerId } from '@core/types/ids';

import type { EditorSession } from '../EditorSession';
import './LayerPanel.css';

interface LayerPanelProps {
  readonly session: EditorSession;
}

export function LayerPanel({ session }: LayerPanelProps) {
  const [renaming, setRenaming] = useState<LayerId | null>(null);
  const { layers } = session.document;
  const activeId = layers.activeLayerId;
  // top layer first
  const ordered = [...layers.layers].reverse();
  const activeIndex = layers.indexOf(activeId);
  const count = layers.count;

  const renameRow = (layer: Layer, value: string): void => {
    setRenaming(null);
    const name = value.trim();
    if (name && name !== layer.name) {
      session.renameLayer(layer.id, name);
    }
  };

  return (
    <aside className="layer-panel" aria-label="Layers">
      <div className="layer-panel__toolbar">
        <button type="button" title="Add layer" onClick={() => session.addLayer()}>
          +
        </button>
        <button
          type="button"
          title="Duplicate layer"
          onClick={() => session.duplicateActiveLayer()}
        >
          &#10697;
        </button>
        <button
          type="button"
          title="Delete layer"
          disabled={count <= 1}
          onClick={() => session.removeActiveLayer()}
        >
          &#128465;
        </button>
        <button
          type="button"
          title="Move up"
          disabled={activeIndex >= count - 1}
          onClick={() => session.moveLayer(activeId, activeIndex + 1)}
        >
          &#8593;
        </button>
        <button
          type="button"
          title="Move down"
          disabled={activeIndex <= 0}
          onClick={() => session.moveLayer(activeId, activeIndex - 1)}
        >
          &#8595;
        </button>
        <button
          type="button"
          title="Merge down"
          disabled={activeIndex <= 0}
          onClick={() => session.mergeActiveLayerDown()}
        >
          &#8681;
        </button>
      </div>

      <ul className="layer-panel__list">
        {ordered.map((layer) => {
          const active = layer.id === activeId;
          return (
            <li
              key={layer.id}
              className={active ? 'layer-panel__row layer-panel__row--active' : 'layer-panel__row'}
              data-testid="layer-row"
            >
              <button
                type="button"
                className="layer-panel__icon"
                aria-label={layer.visible ? 'Hide layer' : 'Show layer'}
                aria-pressed={layer.visible}
                onClick={() => {
                  session.setLayerVisibility(layer.id, !layer.visible);
                }}
              >
                {layer.visible ? '◉' : '○'}
              </button>
              <button
                type="button"
                className="layer-panel__icon"
                aria-label={layer.locked ? 'Unlock layer' : 'Lock layer'}
                aria-pressed={layer.locked}
                onClick={() => {
                  session.setLayerLocked(layer.id, !layer.locked);
                }}
              >
                {layer.locked ? '\u{1F512}' : '\u{1F513}'}
              </button>

              {renaming === layer.id ? (
                <input
                  className="layer-panel__name-input"
                  defaultValue={layer.name}
                  autoFocus
                  onBlur={(event) => {
                    renameRow(layer, event.target.value);
                  }}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      renameRow(layer, event.currentTarget.value);
                    } else if (event.key === 'Escape') {
                      setRenaming(null);
                    }
                  }}
                />
              ) : (
                <button
                  type="button"
                  className="layer-panel__name"
                  onClick={() => {
                    session.setActiveLayer(layer.id);
                  }}
                  onDoubleClick={() => {
                    setRenaming(layer.id);
                  }}
                >
                  {layer.name}
                </button>
              )}

              <input
                className="layer-panel__opacity"
                type="range"
                min={0}
                max={100}
                value={Math.round(layer.opacity * 100)}
                aria-label={`${layer.name} opacity`}
                onChange={(event) => {
                  session.setLayerOpacity(layer.id, Number(event.target.value) / 100);
                }}
              />
            </li>
          );
        })}
      </ul>

      <div className="layer-panel__footer">
        <button type="button" onClick={() => session.clearActiveLayer()}>
          Clear
        </button>
        <button type="button" onClick={() => session.mergeVisibleLayers()}>
          Merge visible
        </button>
        <button type="button" onClick={() => session.flatten()}>
          Flatten
        </button>
      </div>
    </aside>
  );
}

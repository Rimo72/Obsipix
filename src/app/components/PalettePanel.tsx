import { useState } from 'react';

import type { PaletteColorId, PaletteId } from '@core/types/ids';

import type { EditorSession } from '../EditorSession';
import { rgbaToHex } from '../hexColor';
import './PalettePanel.css';

interface PalettePanelProps {
  readonly session: EditorSession;
  /** Open the Color Management window to add a new colour to the active palette. */
  readonly onAddColor: () => void;
  /** Open the Color Management window to edit an existing palette colour. */
  readonly onEditColor: (colorId: PaletteColorId) => void;
}

export function PalettePanel({ session, onAddColor, onEditColor }: PalettePanelProps) {
  const [selectedColor, setSelectedColor] = useState<PaletteColorId | null>(null);
  const [renamingPalette, setRenamingPalette] = useState(false);

  const document = session.document;
  const palette = document.activePalette;
  const colorIndex = palette ? palette.colors.findIndex((color) => color.id === selectedColor) : -1;

  return (
    <div className="palette-panel">
      <div className="palette-panel__header">
        {renamingPalette && palette ? (
          <input
            className="palette-panel__name-input"
            defaultValue={palette.name}
            autoFocus
            onBlur={(event) => {
              session.renamePalette(palette.id, event.target.value.trim() || palette.name);
              setRenamingPalette(false);
            }}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.currentTarget.blur();
              } else if (event.key === 'Escape') {
                setRenamingPalette(false);
              }
            }}
          />
        ) : (
          <select
            className="palette-panel__select"
            value={palette?.id ?? ''}
            aria-label="Active palette"
            onChange={(event) => {
              session.setActivePalette(event.target.value as PaletteId);
            }}
          >
            {document.palettes.map((entry) => (
              <option key={entry.id} value={entry.id}>
                {entry.name}
              </option>
            ))}
          </select>
        )}
        <button
          type="button"
          aria-label="Rename palette"
          title="Rename palette"
          disabled={!palette}
          onClick={() => setRenamingPalette(true)}
        >
          &#9998;
        </button>
        <button
          type="button"
          aria-label="New palette"
          title="New palette"
          onClick={() => session.createPalette()}
        >
          +
        </button>
        <button
          type="button"
          aria-label="Duplicate palette"
          title="Duplicate palette"
          disabled={!palette}
          onClick={() => session.duplicateActivePalette()}
        >
          &#10697;
        </button>
        <button
          type="button"
          aria-label="Delete palette"
          title="Delete palette"
          disabled={!palette || document.palettes.length <= 1}
          onClick={() => {
            if (palette) {
              session.deletePalette(palette.id);
            }
          }}
        >
          &#128465;
        </button>
      </div>

      {session.recentColors.length > 0 && (
        <div className="palette-panel__recent" aria-label="Recent colours">
          {session.recentColors.map((color, index) => (
            <button
              key={`${rgbaToHex(color)}-${String(index)}`}
              type="button"
              className="palette-panel__swatch palette-panel__swatch--sm"
              style={{ background: rgbaToHex(color) }}
              title={rgbaToHex(color)}
              onClick={() => {
                session.setForeground(color);
              }}
            />
          ))}
        </div>
      )}

      <div className="palette-panel__grid" data-testid="palette-grid">
        {(palette?.colors ?? []).map((color) => {
          const active = color.id === selectedColor;
          return (
            <button
              key={color.id}
              type="button"
              className={active ? 'palette-panel__swatch is-selected' : 'palette-panel__swatch'}
              style={{ background: rgbaToHex(color.rgba) }}
              title={color.name ?? rgbaToHex(color.rgba)}
              onClick={() => {
                setSelectedColor(color.id);
                session.setForeground(color.rgba);
              }}
              onContextMenu={(event) => {
                event.preventDefault();
                session.setBackground(color.rgba);
              }}
              onDoubleClick={() => {
                setSelectedColor(color.id);
                onEditColor(color.id);
              }}
            />
          );
        })}
      </div>

      <div className="palette-panel__toolbar">
        <button
          type="button"
          aria-label="Add a colour to the palette"
          title="Add a colour"
          disabled={!palette}
          onClick={onAddColor}
        >
          + Add
        </button>
        <button
          type="button"
          title="Remove the selected colour"
          disabled={!palette || colorIndex < 0}
          onClick={() => {
            if (palette && selectedColor) {
              session.removePaletteColor(palette.id, selectedColor);
              setSelectedColor(null);
            }
          }}
        >
          &minus;
        </button>
        <button
          type="button"
          title="Move left"
          disabled={!palette || colorIndex <= 0}
          onClick={() => {
            if (palette && selectedColor) {
              session.movePaletteColor(palette.id, selectedColor, colorIndex - 1);
            }
          }}
        >
          &#8592;
        </button>
        <button
          type="button"
          title="Move right"
          disabled={!palette || colorIndex < 0 || colorIndex >= palette.colors.length - 1}
          onClick={() => {
            if (palette && selectedColor) {
              session.movePaletteColor(palette.id, selectedColor, colorIndex + 1);
            }
          }}
        >
          &#8594;
        </button>
      </div>
    </div>
  );
}

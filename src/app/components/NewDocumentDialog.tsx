import { useState } from 'react';

import { MAX_DOCUMENT_DIMENSION } from '@core/document/defaults';
import { BLACK, WHITE, type RGBA } from '@core/types/color';

import { Dialog } from './Dialog';
import './NewDocumentDialog.css';

interface NewDocumentDialogProps {
  readonly onClose: () => void;
  readonly onCreate: (options: { width: number; height: number; background: RGBA | null }) => void;
}

const PRESETS = [16, 32, 48, 64, 128] as const;
type Background = 'transparent' | 'white' | 'black';

const BACKGROUND_RGBA: Record<Background, RGBA | null> = {
  transparent: null,
  white: WHITE,
  black: BLACK,
};

/** File → New (PROJECT_CORE §56.1): size presets, custom dimensions, background. */
export function NewDocumentDialog({ onClose, onCreate }: NewDocumentDialogProps) {
  const [width, setWidth] = useState('32');
  const [height, setHeight] = useState('32');
  const [background, setBackground] = useState<Background>('transparent');

  const parsed = { w: Number.parseInt(width, 10), h: Number.parseInt(height, 10) };
  const valid =
    Number.isInteger(parsed.w) &&
    Number.isInteger(parsed.h) &&
    parsed.w >= 1 &&
    parsed.h >= 1 &&
    parsed.w <= MAX_DOCUMENT_DIMENSION &&
    parsed.h <= MAX_DOCUMENT_DIMENSION;

  const activePreset =
    parsed.w === parsed.h ? PRESETS.find((size) => size === parsed.w) : undefined;

  const create = (): void => {
    if (valid) {
      onCreate({ width: parsed.w, height: parsed.h, background: BACKGROUND_RGBA[background] });
    }
  };

  return (
    <Dialog
      title="New document"
      onClose={onClose}
      footer={
        <>
          <button type="button" className="new-doc__button" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="new-doc__button is-primary"
            disabled={!valid}
            onClick={create}
          >
            Create
          </button>
        </>
      }
    >
      <fieldset className="new-doc__group">
        <legend>Preset</legend>
        <div className="new-doc__presets">
          {PRESETS.map((size) => (
            <button
              key={size}
              type="button"
              aria-pressed={activePreset === size}
              className={activePreset === size ? 'new-doc__preset is-active' : 'new-doc__preset'}
              onClick={() => {
                setWidth(String(size));
                setHeight(String(size));
              }}
            >
              {size}×{size}
            </button>
          ))}
        </div>
      </fieldset>

      <div className="new-doc__dims">
        <label className="new-doc__field">
          Width
          <input
            type="number"
            min={1}
            max={MAX_DOCUMENT_DIMENSION}
            value={width}
            onChange={(event) => {
              setWidth(event.target.value);
            }}
          />
        </label>
        <label className="new-doc__field">
          Height
          <input
            type="number"
            min={1}
            max={MAX_DOCUMENT_DIMENSION}
            value={height}
            onChange={(event) => {
              setHeight(event.target.value);
            }}
          />
        </label>
      </div>

      <fieldset className="new-doc__group">
        <legend>Background</legend>
        <div className="new-doc__backgrounds">
          {(['transparent', 'white', 'black'] as const).map((option) => (
            <label key={option} className="new-doc__radio">
              <input
                type="radio"
                name="new-doc-background"
                checked={background === option}
                onChange={() => {
                  setBackground(option);
                }}
              />
              {option === 'transparent' ? 'Transparent' : option === 'white' ? 'White' : 'Black'}
            </label>
          ))}
        </div>
      </fieldset>
    </Dialog>
  );
}

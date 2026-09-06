import { useState } from 'react';

import { MAX_DOCUMENT_DIMENSION } from '@core/document/defaults';

import type { EditorSession } from '../EditorSession';
import { Dialog } from './Dialog';
import './ResizeDialog.css';

type Mode = 'image' | 'canvas';

interface ResizeDialogProps {
  readonly mode: Mode;
  readonly session: EditorSession;
  readonly onClose: () => void;
  readonly onModeChange: (mode: Mode) => void;
}

export function ResizeDialog({ mode, session, onClose, onModeChange }: ResizeDialogProps) {
  const current = session.document.dimensions;
  const [width, setWidth] = useState(String(current.width));
  const [height, setHeight] = useState(String(current.height));

  const parsed = { w: Number.parseInt(width, 10), h: Number.parseInt(height, 10) };
  const valid =
    Number.isInteger(parsed.w) &&
    Number.isInteger(parsed.h) &&
    parsed.w >= 1 &&
    parsed.h >= 1 &&
    parsed.w <= MAX_DOCUMENT_DIMENSION &&
    parsed.h <= MAX_DOCUMENT_DIMENSION;

  const apply = (): void => {
    if (!valid) {
      return;
    }
    if (mode === 'image') {
      session.resizeImage({ width: parsed.w, height: parsed.h });
    } else {
      session.resizeCanvas({ width: parsed.w, height: parsed.h });
    }
    onClose();
  };

  return (
    <Dialog
      title="Resize"
      onClose={onClose}
      footer={
        <>
          <button type="button" className="resize-dialog__button" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="resize-dialog__button is-primary"
            disabled={!valid}
            onClick={apply}
          >
            Apply
          </button>
        </>
      }
    >
      <div className="resize-dialog__tabs" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={mode === 'image'}
          className={mode === 'image' ? 'is-active' : undefined}
          onClick={() => {
            onModeChange('image');
          }}
        >
          Image size
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mode === 'canvas'}
          className={mode === 'canvas' ? 'is-active' : undefined}
          onClick={() => {
            onModeChange('canvas');
          }}
        >
          Canvas size
        </button>
      </div>
      <p className="resize-dialog__hint">
        {mode === 'image'
          ? 'Scales the artwork (nearest-neighbour).'
          : 'Changes the canvas bounds, centred, without scaling artwork.'}
      </p>
      <label className="resize-dialog__field">
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
      <label className="resize-dialog__field">
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
    </Dialog>
  );
}

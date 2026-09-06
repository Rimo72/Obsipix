import { useState } from 'react';

import type { EditorSession } from '../EditorSession';
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

  const apply = (): void => {
    const w = Number.parseInt(width, 10);
    const h = Number.parseInt(height, 10);
    if (!Number.isInteger(w) || !Number.isInteger(h) || w < 1 || h < 1 || w > 8192 || h > 8192) {
      return;
    }
    if (mode === 'image') {
      session.resizeImage({ width: w, height: h });
    } else {
      session.resizeCanvas({ width: w, height: h });
    }
    onClose();
  };

  return (
    <div className="resize-dialog__backdrop" role="dialog" aria-modal="true" aria-label="Resize">
      <div className="resize-dialog">
        <div className="resize-dialog__tabs">
          <button
            type="button"
            className={mode === 'image' ? 'is-active' : undefined}
            onClick={() => {
              onModeChange('image');
            }}
          >
            Image size
          </button>
          <button
            type="button"
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
            max={8192}
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
            max={8192}
            value={height}
            onChange={(event) => {
              setHeight(event.target.value);
            }}
          />
        </label>
        <div className="resize-dialog__actions">
          <button type="button" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="is-primary" onClick={apply}>
            Apply
          </button>
        </div>
      </div>
    </div>
  );
}

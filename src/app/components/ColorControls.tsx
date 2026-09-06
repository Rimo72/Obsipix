import { useEffect, useRef, useState } from 'react';

import { rgbaToHex } from '../hexColor';
import type { EditorSession } from '../EditorSession';
import { HexInput } from './HexInput';
import './ColorControls.css';

interface ColorControlsProps {
  readonly session: EditorSession;
}

type Slot = 'foreground' | 'background';

export function ColorControls({ session }: ColorControlsProps) {
  const [editing, setEditing] = useState<Slot | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!editing) {
      return;
    }
    const onDown = (event: MouseEvent): void => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setEditing(null);
      }
    };
    window.addEventListener('mousedown', onDown);
    return () => {
      window.removeEventListener('mousedown', onDown);
    };
  }, [editing]);

  const current = editing === 'background' ? session.background : session.foreground;

  return (
    <div className="color-controls" ref={rootRef} aria-label="Colours">
      <div className="color-controls__swatches">
        <button
          type="button"
          className="color-controls__swatch color-controls__swatch--fg"
          style={{ background: rgbaToHex(session.foreground) }}
          title={`Foreground ${rgbaToHex(session.foreground)}`}
          aria-label="Foreground colour"
          onClick={() => {
            setEditing((slot) => (slot === 'foreground' ? null : 'foreground'));
          }}
        />
        <button
          type="button"
          className="color-controls__swatch color-controls__swatch--bg"
          style={{ background: rgbaToHex(session.background) }}
          title={`Background ${rgbaToHex(session.background)}`}
          aria-label="Background colour"
          onClick={() => {
            setEditing((slot) => (slot === 'background' ? null : 'background'));
          }}
        />
      </div>
      <button
        type="button"
        className="color-controls__swap"
        title="Swap colours (X)"
        aria-label="Swap foreground and background"
        onClick={() => {
          session.swapColors();
        }}
      >
        &#8646;
      </button>

      {editing !== null && (
        <div className="color-controls__popover" data-testid="color-popover">
          <label className="color-controls__field">
            {editing === 'background' ? 'Background' : 'Foreground'}
            <HexInput
              value={current}
              onChange={(color) => {
                if (editing === 'background') {
                  session.setBackground(color);
                } else {
                  session.setForeground(color);
                }
              }}
            />
          </label>
        </div>
      )}
    </div>
  );
}

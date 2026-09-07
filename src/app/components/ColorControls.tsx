import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import { rgbaToHex } from '../hexColor';
import type { EditorSession } from '../EditorSession';
import { ColorPicker } from './ColorPicker';
import './ColorControls.css';

interface ColorControlsProps {
  readonly session: EditorSession;
}

type Slot = 'foreground' | 'background';

export function ColorControls({ session }: ColorControlsProps) {
  const [editing, setEditing] = useState<Slot | null>(null);
  const [anchor, setAnchor] = useState<{ top: number; left: number } | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!editing) {
      return;
    }
    const onDown = (event: MouseEvent): void => {
      const target = event.target as Node;
      if (
        rootRef.current?.contains(target) !== true &&
        popoverRef.current?.contains(target) !== true
      ) {
        setEditing(null);
      }
    };
    const onKey = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        setEditing(null);
      }
    };
    window.addEventListener('mousedown', onDown);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('mousedown', onDown);
      window.removeEventListener('keydown', onKey);
    };
  }, [editing]);

  const open = (slot: Slot): void => {
    setEditing((current) => {
      if (current === slot) {
        return null;
      }
      const rect = rootRef.current?.getBoundingClientRect();
      if (rect) {
        setAnchor({ top: rect.bottom + 6, left: rect.left });
      }
      return slot;
    });
  };

  const current = editing === 'background' ? session.background : session.foreground;

  return (
    <div className="color-controls" ref={rootRef} role="group" aria-label="Colours">
      <div className="color-controls__swatches">
        <button
          type="button"
          className="color-controls__swatch color-controls__swatch--fg"
          style={{ background: rgbaToHex(session.foreground) }}
          title={`Foreground ${rgbaToHex(session.foreground)}`}
          aria-label={`Foreground colour, ${rgbaToHex(session.foreground)}`}
          aria-pressed={editing === 'foreground'}
          onClick={() => {
            open('foreground');
          }}
        />
        <button
          type="button"
          className="color-controls__swatch color-controls__swatch--bg"
          style={{ background: rgbaToHex(session.background) }}
          title={`Background ${rgbaToHex(session.background)}`}
          aria-label={`Background colour, ${rgbaToHex(session.background)}`}
          aria-pressed={editing === 'background'}
          onClick={() => {
            open('background');
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

      {editing !== null &&
        anchor !== null &&
        createPortal(
          <div
            ref={popoverRef}
            className="color-controls__popover"
            data-testid="color-popover"
            style={{ top: anchor.top, left: anchor.left }}
          >
            <ColorPicker
              label={editing === 'background' ? 'Background colour' : 'Foreground colour'}
              value={current}
              onChange={(color) => {
                if (editing === 'background') {
                  session.setBackground(color);
                } else {
                  session.setForeground(color);
                }
              }}
            />
          </div>,
          document.body,
        )}
    </div>
  );
}

import { useState } from 'react';

import { rgbaToHex } from '../hexColor';
import type { EditorSession } from '../EditorSession';
import { useEditorSessionVersion } from '../useEditorSession';
import { ColorPicker } from './ColorPicker';
import './ColorPanel.css';

interface ColorPanelProps {
  readonly session: EditorSession;
}

/**
 * The docked Color Management panel (PROJECT_CORE §14, §111): the full colour
 * selector bound to the foreground or background colour. Editor state only —
 * no history, no dirty flag.
 */
export function ColorPanel({ session }: ColorPanelProps) {
  useEditorSessionVersion(session);
  const [slot, setSlot] = useState<'fg' | 'bg'>('fg');

  const value = slot === 'fg' ? session.foreground : session.background;
  const label = slot === 'fg' ? 'Foreground colour' : 'Background colour';

  return (
    <div className="color-panel">
      <div className="color-panel__slots" role="group" aria-label="Active colour">
        <button
          type="button"
          className="color-panel__slot"
          aria-pressed={slot === 'fg'}
          onClick={() => {
            setSlot('fg');
          }}
        >
          <span
            className="color-panel__chip"
            style={{ backgroundColor: rgbaToHex(session.foreground) }}
          />
          Foreground
        </button>
        <button
          type="button"
          className="color-panel__slot"
          aria-pressed={slot === 'bg'}
          onClick={() => {
            setSlot('bg');
          }}
        >
          <span
            className="color-panel__chip"
            style={{ backgroundColor: rgbaToHex(session.background) }}
          />
          Background
        </button>
        <button
          type="button"
          className="color-panel__swap"
          aria-label="Swap foreground and background"
          title="Swap colours (X)"
          onClick={() => {
            session.swapColors();
          }}
        >
          &#8646;
        </button>
      </div>

      <ColorPicker
        value={value}
        label={label}
        onChange={(color) => {
          if (slot === 'fg') {
            session.setForeground(color);
          } else {
            session.setBackground(color);
          }
        }}
      />
    </div>
  );
}

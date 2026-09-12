import { MAGIC_WAND_TOOL_ID } from '@core/tools/MagicWandTool';

import type { EditorSession } from '../EditorSession';
import './MagicWandControls.css';

interface MagicWandControlsProps {
  readonly session: EditorSession;
}

/**
 * Magic Wand colour-match tolerance. Only shown for the wand — 0 (default)
 * matches Fill's hard-edged exact colour; a higher tolerance also picks up
 * near-matches (e.g. faint anti-aliasing or compression noise from an
 * imported PNG) that an exact match would miss.
 */
export function MagicWandControls({ session }: MagicWandControlsProps) {
  if (session.activeToolId !== MAGIC_WAND_TOOL_ID) {
    return null;
  }
  const tolerance = session.magicWandTolerance;
  return (
    <div className="magic-wand-controls" role="group" aria-label="Magic Wand">
      <label className="magic-wand-controls__label" htmlFor="magic-wand-tolerance">
        Tolerance
      </label>
      <input
        id="magic-wand-tolerance"
        type="number"
        min={0}
        max={255}
        value={tolerance}
        onChange={(event) => {
          const value = Number(event.target.value);
          if (Number.isFinite(value)) {
            session.setMagicWandTolerance(value);
          }
        }}
      />
    </div>
  );
}

import { EYEDROPPER_TOOL_ID } from '@core/tools/EyedropperTool';

import type { EditorSession } from '../EditorSession';
import './EyedropperControls.css';

interface EyedropperControlsProps {
  readonly session: EditorSession;
}

/** Eyedropper Sample-vs-Pick mode toggle (PROJECT_CORE §14). Only shown for the eyedropper. */
export function EyedropperControls({ session }: EyedropperControlsProps) {
  if (session.activeToolId !== EYEDROPPER_TOOL_ID) {
    return null;
  }
  const merged = session.eyedropperMerged;
  return (
    <div className="eyedropper-controls" role="group" aria-label="Eyedropper mode">
      <span className="eyedropper-controls__label">Sample</span>
      <button
        type="button"
        className={merged ? 'eyedropper-controls__opt is-active' : 'eyedropper-controls__opt'}
        aria-pressed={merged}
        onClick={() => {
          session.setEyedropperMerged(true);
        }}
      >
        Merged
      </button>
      <button
        type="button"
        className={!merged ? 'eyedropper-controls__opt is-active' : 'eyedropper-controls__opt'}
        aria-pressed={!merged}
        onClick={() => {
          session.setEyedropperMerged(false);
        }}
      >
        Layer
      </button>
    </div>
  );
}

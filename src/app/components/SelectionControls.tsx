import type { EditorSession } from '../EditorSession';
import './SelectionControls.css';

interface SelectionControlsProps {
  readonly session: EditorSession;
}

/**
 * Context-sensitive controls for the options bar (PROJECT_CORE §17): float
 * actions while a selection is lifted, selection actions while one is active,
 * and the transform actions otherwise.
 */
export function SelectionControls({ session }: SelectionControlsProps) {
  const selection = session.document.selection;
  const bounds = selection.bounds();
  const floating = session.hasFloat;

  return (
    <div className="selection-controls" aria-label="Selection and transform">
      {floating ? (
        <span className="selection-controls__label">Floating selection</span>
      ) : (
        <>
          <button
            type="button"
            onClick={() => {
              session.selectAll();
            }}
          >
            All
          </button>
          <button
            type="button"
            disabled={!selection.active}
            onClick={() => {
              session.deselect();
            }}
          >
            None
          </button>
        </>
      )}

      <button
        type="button"
        title="Flip horizontal"
        onClick={() => {
          session.flip('horizontal');
        }}
      >
        Flip H
      </button>
      <button
        type="button"
        title="Flip vertical"
        onClick={() => {
          session.flip('vertical');
        }}
      >
        Flip V
      </button>
      <button
        type="button"
        title="Rotate 90° counter-clockwise"
        aria-label="Rotate counter-clockwise"
        onClick={() => {
          session.rotate('ccw');
        }}
      >
        &#8634;
      </button>
      <button
        type="button"
        title="Rotate 90° clockwise"
        aria-label="Rotate clockwise"
        onClick={() => {
          session.rotate('cw');
        }}
      >
        &#8635;
      </button>

      {floating ? (
        <>
          <button
            type="button"
            className="selection-controls__primary"
            onClick={() => {
              session.commitFloat();
            }}
          >
            Commit
          </button>
          <button
            type="button"
            onClick={() => {
              session.cancelFloat();
            }}
          >
            Cancel
          </button>
        </>
      ) : (
        <button
          type="button"
          disabled={!selection.active}
          onClick={() => {
            session.deleteSelection();
          }}
        >
          Delete
        </button>
      )}

      {bounds && !floating && (
        <span className="selection-controls__readout" data-testid="selection-size">
          {bounds.width} × {bounds.height}
        </span>
      )}
    </div>
  );
}

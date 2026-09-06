import { useState } from 'react';

import type { EditorSession } from '../EditorSession';
import { ResizeDialog } from './ResizeDialog';
import './SelectionControls.css';

interface SelectionControlsProps {
  readonly session: EditorSession;
}

export function SelectionControls({ session }: SelectionControlsProps) {
  const [resizing, setResizing] = useState<'image' | 'canvas' | null>(null);
  const hasSelection = session.document.selection.active;

  return (
    <div className="selection-controls" aria-label="Selection and transform">
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
        disabled={!hasSelection}
        onClick={() => {
          session.deselect();
        }}
      >
        None
      </button>
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
        onClick={() => {
          session.rotate('ccw');
        }}
      >
        &#8634;
      </button>
      <button
        type="button"
        title="Rotate 90° clockwise"
        onClick={() => {
          session.rotate('cw');
        }}
      >
        &#8635;
      </button>
      <button
        type="button"
        disabled={!hasSelection}
        onClick={() => {
          session.deleteSelection();
        }}
      >
        Delete
      </button>
      <button
        type="button"
        onClick={() => {
          setResizing('image');
        }}
      >
        Resize&hellip;
      </button>

      {resizing !== null && (
        <ResizeDialog
          mode={resizing}
          session={session}
          onClose={() => {
            setResizing(null);
          }}
          onModeChange={setResizing}
        />
      )}
    </div>
  );
}

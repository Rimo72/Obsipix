import type { RecoverySnapshot } from '@infrastructure/recovery/RecoveryStore';

import { Dialog } from './Dialog';
import './RecoveryPrompt.css';

interface RecoveryPromptProps {
  readonly snapshot: RecoverySnapshot;
  readonly onRecover: () => void;
  readonly onDiscard: () => void;
  /** Escape / backdrop: dismiss without deciding — the data is kept for next time. */
  readonly onDefer: () => void;
}

function relativeTime(from: number): string {
  const seconds = Math.max(0, Math.round((Date.now() - from) / 1000));
  if (seconds < 60) {
    return 'less than a minute ago';
  }
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) {
    return `${String(minutes)} minute${minutes === 1 ? '' : 's'} ago`;
  }
  const hours = Math.round(minutes / 60);
  return `${String(hours)} hour${hours === 1 ? '' : 's'} ago`;
}

/**
 * Shown on startup when autosave left recoverable work behind
 * (PROJECT_CORE §3.13). Recovering never overwrites the project file — the
 * restored document is simply loaded as unsaved work.
 */
export function RecoveryPrompt({ snapshot, onRecover, onDiscard, onDefer }: RecoveryPromptProps) {
  return (
    <Dialog
      title="Recover unsaved work?"
      onClose={onDefer}
      footer={
        <>
          <button type="button" className="recovery-prompt__button" onClick={onDiscard}>
            Discard
          </button>
          <button
            type="button"
            className="recovery-prompt__button recovery-prompt__button--primary"
            onClick={onRecover}
          >
            Recover
          </button>
        </>
      }
    >
      <p className="recovery-prompt__body">
        Obsipix found autosaved work
        {snapshot.fileName ? ` from “${snapshot.fileName}”` : ''} saved{' '}
        {relativeTime(snapshot.savedAt)}. Recover it, or discard and start fresh.
      </p>
    </Dialog>
  );
}

import { checkCharacterConstraints } from '@core/project/checkCharacterConstraints';
import { isCharacterTemplate } from '@core/project/Template';

import type { EditorSession } from '../EditorSession';
import { FrameThumbnail } from './FrameThumbnail';
import './CharacterInfoPanel.css';

interface CharacterInfoPanelProps {
  readonly session: EditorSession;
}

function formatLabel(value: string): string {
  return value
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Views, animation-state checklist, and constraint status for the active
 * asset (V2 coding-phases Phase 6, vision doc §7). Empty when the active
 * asset isn't a character set. Animation states are a checklist against
 * the existing V1 AnimationTag mechanism — this panel never creates tags
 * itself; use the Animation panel's own "+ Tag" for that.
 */
export function CharacterInfoPanel({ session }: CharacterInfoPanelProps) {
  const metadata = session.assetMetadata;
  const views = metadata.characterViews;
  const states = metadata.animationStates;

  if ((!views || views.length === 0) && (!states || states.length === 0)) {
    return <p className="character-info__empty">This asset isn&rsquo;t a character set.</p>;
  }

  const activeFrameId = session.document.timeline.activeFrameId;
  const existingTagNames = new Set(
    session.document.timeline.tags.map((tag) => tag.name.toLowerCase()),
  );

  const template = metadata.templateId ? session.templates.get(metadata.templateId) : undefined;
  const characterTemplate = template && isCharacterTemplate(template) ? template : undefined;
  const violations = characterTemplate
    ? checkCharacterConstraints(session.document, metadata, characterTemplate)
    : [];

  return (
    <div className="character-info">
      {views && views.length > 0 && (
        <div className="character-info__section">
          <h4>Views</h4>
          <div className="character-info__views">
            {views.map((slot) => {
              const frame = session.document.timeline.frames[slot.frameIndex];
              if (!frame) {
                return null;
              }
              const active = frame.id === activeFrameId;
              return (
                <button
                  key={slot.view}
                  type="button"
                  className={
                    active
                      ? 'character-info__view character-info__view--active'
                      : 'character-info__view'
                  }
                  aria-label={`Edit ${formatLabel(slot.view)} view`}
                  onClick={() => {
                    session.setActiveFrame(frame.id);
                  }}
                >
                  <FrameThumbnail session={session} frameId={frame.id} size={40} />
                  <span>{formatLabel(slot.view)}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {states && states.length > 0 && (
        <div className="character-info__section">
          <h4>Animation states</h4>
          <ul className="character-info__states">
            {states.map((state) => {
              const done = existingTagNames.has(state.toLowerCase());
              return (
                <li
                  key={state}
                  className={
                    done
                      ? 'character-info__state character-info__state--done'
                      : 'character-info__state'
                  }
                >
                  <span aria-hidden="true">{done ? '✓' : '—'}</span>{' '}
                  <span>{formatLabel(state)}</span>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {metadata.headHeightRatio !== undefined && (
        <p className="character-info__proportion">
          Head-height guideline: {Math.round(metadata.headHeightRatio * 100)}% of canvas height
        </p>
      )}

      {characterTemplate && (
        <div className="character-info__section">
          <h4>Constraints</h4>
          {violations.length === 0 ? (
            <p className="character-info__ok">Matches its template.</p>
          ) : (
            <ul className="character-info__violations">
              {violations.map((violation) => (
                <li key={violation.field}>{violation.message}</li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

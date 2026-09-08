import { useState } from 'react';

import type { CelType } from '@core/document/Cel';
import type { AnimationTagId } from '@core/types/ids';

import type { EditorSession } from '../EditorSession';
import { FrameThumbnail } from './FrameThumbnail';
import './TimelinePanel.css';

interface TimelinePanelProps {
  readonly session: EditorSession;
}

const CEL_GLYPH: Record<CelType, string> = {
  normal: '■',
  linked: '\u{1F517}',
  empty: '∅',
  hold: '⏸',
};

const CEL_LABEL: Record<CelType, string> = {
  normal: 'normal cel',
  linked: 'linked cel',
  empty: 'empty cel',
  hold: 'hold',
};

/**
 * The animation timeline (PROJECT_CORE §9): a frame strip, playback transport,
 * per-frame duration, onion-skin toggle and the tag bar. Every artwork-affecting
 * action goes through {@link EditorSession} commands; playback is transient.
 */
export function TimelinePanel({ session }: TimelinePanelProps) {
  const { timeline, layers } = session.document;
  const activeLayerId = layers.activeLayerId;
  const frames = timeline.frames;
  const activeFrameId = timeline.activeFrameId;
  const activeIndex = timeline.indexOf(activeFrameId);
  const onion = session.onionSkin;
  const [newTag, setNewTag] = useState(false);

  return (
    <div className="timeline-panel">
      <div className="timeline-panel__transport">
        <button
          type="button"
          aria-label="First frame"
          onClick={() => {
            session.firstFrame();
          }}
        >
          {'⏮'}
        </button>
        <button
          type="button"
          aria-label="Previous frame"
          onClick={() => {
            session.prevFrame();
          }}
        >
          {'◀'}
        </button>
        <button
          type="button"
          className="timeline-panel__play"
          aria-label={session.isPlaying ? 'Pause' : 'Play'}
          aria-pressed={session.isPlaying}
          onClick={() => {
            session.togglePlay();
          }}
        >
          {session.isPlaying ? '⏸' : '▶'}
        </button>
        <button
          type="button"
          aria-label="Stop"
          onClick={() => {
            session.stop();
          }}
        >
          {'⏹'}
        </button>
        <button
          type="button"
          aria-label="Next frame"
          onClick={() => {
            session.nextFrame();
          }}
        >
          {'▶'}
        </button>
        <button
          type="button"
          aria-label="Last frame"
          onClick={() => {
            session.lastFrame();
          }}
        >
          {'⏭'}
        </button>

        <button
          type="button"
          className={
            session.playMode === 'loop'
              ? 'timeline-panel__toggle timeline-panel__toggle--on'
              : 'timeline-panel__toggle'
          }
          aria-pressed={session.playMode === 'loop'}
          title="Loop playback"
          onClick={() => {
            session.setPlayMode(session.playMode === 'loop' ? 'once' : 'loop');
          }}
        >
          Loop
        </button>

        <label className="timeline-panel__fps">
          FPS
          <input
            type="number"
            min={1}
            max={60}
            value={timeline.playbackFps}
            onChange={(event) => {
              const fps = Number(event.target.value);
              if (Number.isFinite(fps) && fps >= 1) {
                session.applyFps(fps);
              }
            }}
          />
        </label>

        <button
          type="button"
          className={
            onion.enabled
              ? 'timeline-panel__toggle timeline-panel__toggle--on'
              : 'timeline-panel__toggle'
          }
          aria-pressed={onion.enabled}
          title="Onion skin"
          onClick={() => {
            session.toggleOnionSkin();
          }}
        >
          Onion
        </button>
        {onion.enabled && (
          <span className="timeline-panel__onion-range">
            <label>
              {'◀'}
              <input
                type="number"
                min={0}
                max={8}
                aria-label="Onion previous frames"
                value={onion.previous}
                onChange={(event) => {
                  session.setOnionSkin({ previous: Number(event.target.value) });
                }}
              />
            </label>
            <label>
              {'▶'}
              <input
                type="number"
                min={0}
                max={8}
                aria-label="Onion next frames"
                value={onion.next}
                onChange={(event) => {
                  session.setOnionSkin({ next: Number(event.target.value) });
                }}
              />
            </label>
          </span>
        )}

        <span className="timeline-panel__spacer" />

        <button
          type="button"
          aria-label="Add frame"
          title="Add frame"
          onClick={() => session.addFrame()}
        >
          + Frame
        </button>
        <button
          type="button"
          aria-label="Add empty frame"
          title="Add empty frame"
          onClick={() => session.addEmptyFrame()}
        >
          + Empty
        </button>
        <button
          type="button"
          aria-label="Duplicate frame"
          title="Duplicate frame"
          onClick={() => session.duplicateActiveFrame()}
        >
          {'⎘'}
        </button>
        <button
          type="button"
          aria-label="Delete frame"
          title="Delete frame"
          disabled={frames.length <= 1}
          onClick={() => session.deleteActiveFrame()}
        >
          {'\u{1F5D1}'}
        </button>
        <button
          type="button"
          aria-label="Shift frame earlier"
          title="Shift frame earlier"
          disabled={activeIndex <= 0}
          onClick={() => session.moveFrame(activeFrameId, activeIndex - 1)}
        >
          {'←'}
        </button>
        <button
          type="button"
          aria-label="Shift frame later"
          title="Shift frame later"
          disabled={activeIndex >= frames.length - 1}
          onClick={() => session.moveFrame(activeFrameId, activeIndex + 1)}
        >
          {'→'}
        </button>
      </div>

      <ol className="timeline-panel__frames">
        {frames.map((frame, index) => {
          const active = frame.id === activeFrameId;
          const cel = frame.getCel(activeLayerId);
          return (
            <li key={frame.id}>
              <button
                type="button"
                className={
                  active
                    ? 'timeline-panel__frame timeline-panel__frame--active'
                    : 'timeline-panel__frame'
                }
                data-testid="timeline-frame"
                aria-label={
                  cel && cel.type !== 'normal'
                    ? `Frame ${String(index + 1)}, ${CEL_LABEL[cel.type]}`
                    : `Frame ${String(index + 1)}`
                }
                aria-current={active}
                onClick={() => {
                  session.setActiveFrame(frame.id);
                }}
              >
                <span className="timeline-panel__frame-index">{index + 1}</span>
                <span className="timeline-panel__frame-thumb">
                  <FrameThumbnail session={session} frameId={frame.id} size={44} />
                  {cel && cel.type !== 'normal' && (
                    <span
                      className="timeline-panel__frame-badge"
                      data-cel={cel.type}
                      title={CEL_LABEL[cel.type]}
                    >
                      {CEL_GLYPH[cel.type]}
                    </span>
                  )}
                </span>
                <input
                  className="timeline-panel__frame-duration"
                  type="number"
                  min={1}
                  value={frame.durationMs}
                  aria-label={`Frame ${String(index + 1)} duration in milliseconds`}
                  onClick={(event) => {
                    event.stopPropagation();
                  }}
                  onChange={(event) => {
                    const ms = Number(event.target.value);
                    if (Number.isFinite(ms) && ms >= 1) {
                      session.setFrameDuration(frame.id, ms);
                    }
                  }}
                />
              </button>
            </li>
          );
        })}
      </ol>

      <div className="timeline-panel__cel-ops">
        <span>Cel:</span>
        <button type="button" onClick={() => session.makeCelUnique(activeFrameId, activeLayerId)}>
          Make unique
        </button>
        <button type="button" onClick={() => session.holdCel(activeFrameId, activeLayerId)}>
          Hold
        </button>
        <button type="button" onClick={() => session.clearCel(activeFrameId, activeLayerId)}>
          Clear
        </button>
        <button
          type="button"
          disabled={activeIndex <= 0}
          title="Link this cel to the previous frame's cel"
          onClick={() => {
            session.linkCel(
              frames[activeIndex - 1]?.id ?? activeFrameId,
              activeFrameId,
              activeLayerId,
            );
          }}
        >
          Link to previous
        </button>
      </div>

      <div className="timeline-panel__tags">
        <span>Tags:</span>
        {timeline.tags.map((tag) => (
          <TagChip key={tag.id} session={session} tagId={tag.id} />
        ))}
        {newTag ? (
          <input
            className="timeline-panel__tag-input"
            autoFocus
            placeholder="Tag name"
            onBlur={(event) => {
              const name = event.target.value.trim();
              if (name) {
                session.addTag(name, 0, Math.max(0, frames.length - 1));
              }
              setNewTag(false);
            }}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                const name = event.currentTarget.value.trim();
                if (name) {
                  session.addTag(name, 0, Math.max(0, frames.length - 1));
                }
                setNewTag(false);
              } else if (event.key === 'Escape') {
                setNewTag(false);
              }
            }}
          />
        ) : (
          <button
            type="button"
            onClick={() => {
              setNewTag(true);
            }}
          >
            + Tag
          </button>
        )}
      </div>
    </div>
  );
}

interface TagChipProps {
  readonly session: EditorSession;
  readonly tagId: AnimationTagId;
}

function TagChip({ session, tagId }: TagChipProps) {
  const { timeline } = session.document;
  const tag = timeline.tags.find((entry) => entry.id === tagId);
  const [editing, setEditing] = useState(false);
  if (!tag) {
    return null;
  }
  const lastFrame = Math.max(0, timeline.frames.length - 1);

  if (editing) {
    return (
      <span
        className="timeline-panel__tag timeline-panel__tag--editing"
        onBlur={(event) => {
          // Close only when focus leaves the whole editor, not on tab between fields.
          if (!event.currentTarget.contains(event.relatedTarget)) {
            setEditing(false);
          }
        }}
        onKeyDown={(event) => {
          if (event.key === 'Escape' || event.key === 'Enter') {
            setEditing(false);
          }
        }}
      >
        <input
          className="timeline-panel__tag-input"
          defaultValue={tag.name}
          autoFocus
          aria-label={`Rename tag ${tag.name}`}
          onBlur={(event) => {
            const name = event.target.value.trim();
            if (name && name !== tag.name) {
              session.updateTag(tag.id, { name });
            }
          }}
        />
        <input
          type="number"
          min={0}
          max={lastFrame}
          value={tag.startFrame + 1}
          aria-label={`Tag ${tag.name} start frame`}
          onChange={(event) => {
            session.updateTag(tag.id, { startFrame: Number(event.target.value) - 1 });
          }}
        />
        <input
          type="number"
          min={0}
          max={lastFrame}
          value={tag.endFrame + 1}
          aria-label={`Tag ${tag.name} end frame`}
          onChange={(event) => {
            session.updateTag(tag.id, { endFrame: Number(event.target.value) - 1 });
          }}
        />
        <select
          value={tag.direction}
          aria-label={`Tag ${tag.name} direction`}
          onChange={(event) => {
            session.updateTag(tag.id, {
              direction: event.target.value as 'forward' | 'reverse' | 'ping-pong',
            });
          }}
        >
          <option value="forward">Forward</option>
          <option value="reverse">Reverse</option>
          <option value="ping-pong">Ping-pong</option>
        </select>
        <button
          type="button"
          aria-label={`Delete tag ${tag.name}`}
          onClick={() => {
            session.deleteTag(tag.id);
            setEditing(false);
          }}
        >
          {'\u{1F5D1}'}
        </button>
      </span>
    );
  }

  return (
    <button
      type="button"
      className="timeline-panel__tag"
      title={`Frames ${String(tag.startFrame + 1)}–${String(tag.endFrame + 1)} (${tag.direction})`}
      onClick={() => {
        setEditing(true);
      }}
    >
      {tag.name}
      <span className="timeline-panel__tag-range">
        {tag.startFrame + 1}
        {'–'}
        {tag.endFrame + 1}
      </span>
    </button>
  );
}

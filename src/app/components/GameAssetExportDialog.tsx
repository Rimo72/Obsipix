import { useMemo, useState } from 'react';

import { GENERIC_EXPORT_PROFILE, type ExportProfile } from '@core/persistence/exportProfile';
import { GODOT_EXPORT_PROFILE } from '@core/persistence/godotExportProfile';

import type { EditorSession } from '../EditorSession';
import type { GameAssetExportSettings } from '../gameAssetExport';
import { Dialog } from './Dialog';
import './GameAssetExportDialog.css';

interface GameAssetExportDialogProps {
  readonly session: EditorSession;
  readonly onClose: () => void;
  readonly onExport: (settings: GameAssetExportSettings) => void;
}

const SCALES = [1, 2, 4, 8] as const;

/** Selectable export targets (V2 coding-phases Phase 9): Generic's plain §13 schema, or Godot's widened one (`GODOT_EXPORT_PROFILE`) — adding another engine later only means appending here, `exportGameAsset` itself never branches on which profile it's given. */
const PROFILES: readonly ExportProfile[] = [GENERIC_EXPORT_PROFILE, GODOT_EXPORT_PROFILE];

function formatLabel(value: string): string {
  return value
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * The Game Asset Export dialog (V2 coding-phases Phase 8): downloads a PNG
 * sprite sheet/tileset plus its JSON metadata sidecar for the active asset.
 * "Scope" lets a character asset export just one animation state's frames,
 * matched against the existing AnimationTag mechanism the same way
 * {@link CharacterInfoPanel} checks its checklist — this dialog never
 * creates tags, it only offers the ones that already exist.
 */
export function GameAssetExportDialog({ session, onClose, onExport }: GameAssetExportDialogProps) {
  const metadata = session.assetMetadata;
  const doc = session.document;
  const frameCount = doc.timeline.frameCount;
  const { width, height } = doc.dimensions;
  const defaultName = (session.fileName ?? (doc.metadata.name || 'game-asset')).replace(
    /\.obsipix$/i,
    '',
  );

  const isTerrain = (metadata.terrainRoles?.length ?? 0) > 0;
  const animationStates = metadata.animationStates ?? [];

  const tagsByName = useMemo(() => {
    const map = new Map<string, { startFrame: number; endFrame: number }>();
    for (const tag of doc.timeline.tags) {
      map.set(tag.name.toLowerCase(), tag);
    }
    return map;
  }, [doc]);

  const [scope, setScope] = useState('all');
  const [profileId, setProfileId] = useState(GENERIC_EXPORT_PROFILE.id);
  const [scale, setScale] = useState(1);
  const [layout, setLayout] = useState<'horizontal' | 'vertical' | 'grid'>(
    isTerrain ? 'grid' : 'horizontal',
  );
  const [columns, setColumns] = useState(
    isTerrain ? 3 : Math.max(1, Math.ceil(Math.sqrt(frameCount))),
  );
  const [spacing, setSpacing] = useState(0);
  const [fileName, setFileName] = useState(defaultName);

  const frameRange = useMemo(() => {
    if (scope === 'all') {
      return undefined;
    }
    return tagsByName.get(scope.toLowerCase());
  }, [scope, tagsByName]);

  const selectedFrameCount = frameRange
    ? frameRange.endFrame - frameRange.startFrame + 1
    : frameCount;

  const outputSize = useMemo(() => {
    const cw = width * scale;
    const ch = height * scale;
    const cols =
      layout === 'horizontal'
        ? selectedFrameCount
        : layout === 'vertical'
          ? 1
          : Math.max(1, columns);
    const rows = Math.ceil(selectedFrameCount / cols);
    return {
      w: cols * cw + (cols + 1) * spacing,
      h: rows * ch + (rows + 1) * spacing,
    };
  }, [layout, columns, spacing, selectedFrameCount, width, height, scale]);

  const profile =
    PROFILES.find((candidate) => candidate.id === profileId) ?? GENERIC_EXPORT_PROFILE;

  const submit = (): void => {
    onExport({
      fileName,
      scale,
      layout,
      columns: Math.max(1, columns),
      spacing: Math.max(0, spacing),
      profile,
      ...(frameRange
        ? { frameRange: { start: frameRange.startFrame, end: frameRange.endFrame } }
        : {}),
    });
  };

  return (
    <Dialog
      title="Export Game Asset"
      size="md"
      onClose={onClose}
      footer={
        <>
          <button type="button" className="game-export__button" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="game-export__button is-primary" onClick={submit}>
            Export
          </button>
        </>
      }
    >
      <p className="game-export__intro">
        Downloads a PNG sprite sheet/tileset plus a matching JSON metadata file.
      </p>

      {animationStates.length > 0 && (
        <fieldset className="game-export__group">
          <legend>Scope</legend>
          <div className="game-export__seg" role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={scope === 'all'}
              className={scope === 'all' ? 'is-active' : undefined}
              onClick={() => {
                setScope('all');
              }}
            >
              All frames
            </button>
            {animationStates.map((state) => {
              const tag = tagsByName.get(state.toLowerCase());
              return (
                <button
                  key={state}
                  type="button"
                  role="tab"
                  aria-selected={scope === state}
                  disabled={!tag}
                  title={tag ? undefined : 'No matching animation tag yet'}
                  className={scope === state ? 'is-active' : undefined}
                  onClick={() => {
                    setScope(state);
                  }}
                >
                  {formatLabel(state)}
                </button>
              );
            })}
          </div>
        </fieldset>
      )}

      <div className="game-export__row">
        <label className="game-export__field">
          Target
          <select
            value={profileId}
            onChange={(event) => {
              setProfileId(event.target.value);
            }}
          >
            {PROFILES.map((candidate) => (
              <option key={candidate.id} value={candidate.id}>
                {candidate.name}
              </option>
            ))}
          </select>
        </label>

        <div className="game-export__field">
          <span>Scale</span>
          <div className="game-export__scales">
            {SCALES.map((s) => (
              <button
                key={s}
                type="button"
                aria-pressed={scale === s}
                className={scale === s ? 'is-active' : undefined}
                onClick={() => {
                  setScale(s);
                }}
              >
                {s}×
              </button>
            ))}
          </div>
        </div>
      </div>

      {selectedFrameCount > 1 && (
        <fieldset className="game-export__group">
          <legend>Layout</legend>
          <div className="game-export__seg">
            {(['horizontal', 'vertical', 'grid'] as const).map((l) => (
              <button
                key={l}
                type="button"
                aria-pressed={layout === l}
                className={layout === l ? 'is-active' : undefined}
                onClick={() => {
                  setLayout(l);
                }}
              >
                {l[0]?.toUpperCase()}
                {l.slice(1)}
              </button>
            ))}
          </div>
          <div className="game-export__row">
            <label className="game-export__field">
              Columns
              <input
                type="number"
                min={1}
                max={selectedFrameCount}
                disabled={layout !== 'grid'}
                value={columns}
                onChange={(event) => {
                  setColumns(Number(event.target.value));
                }}
              />
            </label>
            <label className="game-export__field">
              Spacing
              <input
                type="number"
                min={0}
                max={64}
                value={spacing}
                onChange={(event) => {
                  setSpacing(Number(event.target.value));
                }}
              />
            </label>
          </div>
        </fieldset>
      )}

      <label className="game-export__field game-export__field--wide">
        File name
        <input
          type="text"
          spellCheck={false}
          value={fileName}
          onChange={(event) => {
            setFileName(event.target.value);
          }}
        />
      </label>

      <p className="game-export__hint" data-testid="game-export-output-size">
        Output: {Math.round(outputSize.w)} × {Math.round(outputSize.h)} px · {selectedFrameCount}{' '}
        frame
        {selectedFrameCount === 1 ? '' : 's'}
      </p>
    </Dialog>
  );
}

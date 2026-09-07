import { useMemo, useState } from 'react';

import type { EditorSession } from '../EditorSession';
import type { ExportFormat, ExportKind, ExportSettings } from '../imageExport';
import { Dialog } from './Dialog';
import './ExportDialog.css';

interface ExportDialogProps {
  readonly session: EditorSession;
  readonly onClose: () => void;
  readonly onExport: (settings: ExportSettings) => void;
}

const SCALES = [1, 2, 4, 8] as const;

const FORMATS_FOR: Record<ExportKind, readonly ExportFormat[]> = {
  frame: ['png', 'jpeg', 'webp', 'gif'],
  animation: ['gif'],
  sheet: ['png', 'webp'],
};

export function ExportDialog({ session, onClose, onExport }: ExportDialogProps) {
  const frameCount = session.document.timeline.frameCount;
  const { width, height } = session.document.dimensions;
  const baseName = (session.fileName ?? (session.document.metadata.name || 'obsipix-art')).replace(
    /\.obsipix$/i,
    '',
  );

  const [kind, setKind] = useState<ExportKind>('frame');
  const [format, setFormat] = useState<ExportFormat>('png');
  const [scale, setScale] = useState(1);
  const [transparent, setTransparent] = useState(true);
  const [fileName, setFileName] = useState(baseName);
  const [layout, setLayout] = useState<'horizontal' | 'vertical' | 'grid'>('horizontal');
  const [columns, setColumns] = useState(Math.max(1, Math.ceil(Math.sqrt(frameCount))));
  const [spacing, setSpacing] = useState(0);

  const formats = FORMATS_FOR[kind];
  const effectiveFormat = formats.includes(format) ? format : (formats[0] ?? 'png');
  const canAlpha = effectiveFormat !== 'jpeg';

  const outputSize = useMemo(() => {
    const cw = width * scale;
    const ch = height * scale;
    if (kind === 'sheet') {
      const cols =
        layout === 'horizontal' ? frameCount : layout === 'vertical' ? 1 : Math.max(1, columns);
      const rows = Math.ceil(frameCount / cols);
      return {
        w: cols * cw + (cols + 1) * spacing,
        h: rows * ch + (rows + 1) * spacing,
      };
    }
    return { w: cw, h: ch };
  }, [kind, layout, columns, spacing, frameCount, width, height, scale]);

  const submit = (): void => {
    onExport({
      kind,
      format: effectiveFormat,
      scale,
      transparent: canAlpha && transparent,
      fileName,
      sheet: { layout, columns: Math.max(1, columns), spacing: Math.max(0, spacing) },
    });
  };

  return (
    <Dialog
      title="Export"
      size="md"
      onClose={onClose}
      footer={
        <>
          <button type="button" className="export-dialog__button" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="export-dialog__button is-primary" onClick={submit}>
            Export
          </button>
        </>
      }
    >
      <fieldset className="export-dialog__group">
        <legend>What</legend>
        <div className="export-dialog__seg" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={kind === 'frame'}
            className={kind === 'frame' ? 'is-active' : undefined}
            onClick={() => {
              setKind('frame');
            }}
          >
            Current frame
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={kind === 'animation'}
            disabled={frameCount < 2}
            className={kind === 'animation' ? 'is-active' : undefined}
            onClick={() => {
              setKind('animation');
            }}
          >
            Animation (GIF)
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={kind === 'sheet'}
            disabled={frameCount < 2}
            className={kind === 'sheet' ? 'is-active' : undefined}
            onClick={() => {
              setKind('sheet');
            }}
          >
            Sprite sheet
          </button>
        </div>
      </fieldset>

      <div className="export-dialog__row">
        <label className="export-dialog__field">
          Format
          <select
            value={effectiveFormat}
            onChange={(event) => {
              setFormat(event.target.value as ExportFormat);
            }}
          >
            {formats.map((f) => (
              <option key={f} value={f}>
                {f.toUpperCase()}
              </option>
            ))}
          </select>
        </label>

        <div className="export-dialog__field">
          <span>Scale</span>
          <div className="export-dialog__scales">
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

      <label className="export-dialog__check">
        <input
          type="checkbox"
          checked={canAlpha && transparent}
          disabled={!canAlpha}
          onChange={(event) => {
            setTransparent(event.target.checked);
          }}
        />
        Transparent background
      </label>

      {kind === 'sheet' && (
        <fieldset className="export-dialog__group">
          <legend>Sheet layout</legend>
          <div className="export-dialog__seg">
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
          <div className="export-dialog__row">
            <label className="export-dialog__field">
              Columns
              <input
                type="number"
                min={1}
                max={frameCount}
                disabled={layout !== 'grid'}
                value={columns}
                onChange={(event) => {
                  setColumns(Number(event.target.value));
                }}
              />
            </label>
            <label className="export-dialog__field">
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

      <label className="export-dialog__field export-dialog__field--wide">
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

      <p className="export-dialog__hint" data-testid="export-output-size">
        Output: {Math.round(outputSize.w)} × {Math.round(outputSize.h)} px
      </p>
    </Dialog>
  );
}

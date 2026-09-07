import { useEffect, useMemo, useRef, useState } from 'react';

import type { ImageData8 } from '@core/document/importCommands';
import {
  DEFAULT_SPRITE_SHEET_SLICE,
  describeSpriteSheet,
  type SpriteSheetSlice,
} from '@core/document/spriteSheetImport';

import { Dialog } from './Dialog';
import './ImportPngDialog.css';

interface ImportPngDialogProps {
  readonly image: ImageData8;
  readonly onClose: () => void;
  /** Open the PNG as a single-frame document. */
  readonly onImportSingle: () => void;
  /** Split the PNG into `frameCount` frames using `slice`. */
  readonly onImportSheet: (slice: SpriteSheetSlice, frameCount: number) => void;
}

type Mode = 'single' | 'sheet';

const FIELDS = [
  ['frameWidth', 'Frame width'],
  ['frameHeight', 'Frame height'],
  ['spacingX', 'Horizontal spacing'],
  ['spacingY', 'Vertical spacing'],
  ['offsetX', 'Offset X'],
  ['offsetY', 'Offset Y'],
] as const satisfies readonly (readonly [keyof SpriteSheetSlice, string])[];

/**
 * File → Open PNG (PROJECT_CORE — Sprite Sheet PNG Import). The mode radio makes
 * sprite-sheet splitting an explicit choice so a normal PNG never turns into an
 * animation by accident.
 */
export function ImportPngDialog({
  image,
  onClose,
  onImportSingle,
  onImportSheet,
}: ImportPngDialogProps) {
  const [mode, setMode] = useState<Mode>('single');
  const [values, setValues] = useState<Record<keyof SpriteSheetSlice, string>>({
    frameWidth: String(Math.min(DEFAULT_SPRITE_SHEET_SLICE.frameWidth, image.width)),
    frameHeight: String(Math.min(DEFAULT_SPRITE_SHEET_SLICE.frameHeight, image.height)),
    spacingX: '0',
    spacingY: '0',
    offsetX: '0',
    offsetY: '0',
  });

  const slice = useMemo<SpriteSheetSlice>(
    () => ({
      frameWidth: Number.parseInt(values.frameWidth, 10),
      frameHeight: Number.parseInt(values.frameHeight, 10),
      spacingX: Number.parseInt(values.spacingX, 10) || 0,
      spacingY: Number.parseInt(values.spacingY, 10) || 0,
      offsetX: Number.parseInt(values.offsetX, 10) || 0,
      offsetY: Number.parseInt(values.offsetY, 10) || 0,
    }),
    [values],
  );

  const plan = useMemo(
    () => describeSpriteSheet(image.width, image.height, slice),
    [image.width, image.height, slice],
  );

  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }
    canvas.width = image.width;
    canvas.height = image.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return;
    }
    ctx.putImageData(
      new ImageData(new Uint8ClampedArray(image.data), image.width, image.height),
      0,
      0,
    );
  }, [image]);

  const cells = useMemo(() => {
    if (mode !== 'sheet' || !plan.ok) {
      return [];
    }
    const out: { key: number; x: number; y: number }[] = [];
    let key = 0;
    for (let row = 0; row < plan.layout.rows; row += 1) {
      for (let col = 0; col < plan.layout.columns; col += 1) {
        out.push({
          key: (key += 1),
          x: slice.offsetX + col * (slice.frameWidth + slice.spacingX),
          y: slice.offsetY + row * (slice.frameHeight + slice.spacingY),
        });
      }
    }
    return out;
  }, [mode, plan, slice]);

  const setField = (field: keyof SpriteSheetSlice, value: string): void => {
    setValues((current) => ({ ...current, [field]: value }));
  };

  const importDisabled = mode === 'sheet' && !plan.ok;

  const submit = (): void => {
    if (mode === 'single') {
      onImportSingle();
    } else if (plan.ok) {
      onImportSheet(slice, plan.layout.frameCount);
    }
  };

  return (
    <Dialog
      title="Open PNG"
      size="md"
      onClose={onClose}
      footer={
        <>
          <button type="button" className="import-png__button" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="import-png__button is-primary"
            disabled={importDisabled}
            onClick={submit}
          >
            Import
          </button>
        </>
      }
    >
      <div className="import-png__layout">
        <div className="import-png__controls">
          <fieldset className="import-png__group">
            <legend>Import mode</legend>
            <label className="import-png__radio">
              <input
                type="radio"
                name="import-png-mode"
                checked={mode === 'single'}
                onChange={() => {
                  setMode('single');
                }}
              />
              Single image
            </label>
            <label className="import-png__radio">
              <input
                type="radio"
                name="import-png-mode"
                checked={mode === 'sheet'}
                onChange={() => {
                  setMode('sheet');
                }}
              />
              Sprite sheet
            </label>
          </fieldset>

          {mode === 'sheet' && (
            <>
              <div className="import-png__grid">
                {FIELDS.map(([field, label]) => (
                  <label key={field} className="import-png__field">
                    {label}
                    <input
                      type="number"
                      min={field === 'frameWidth' || field === 'frameHeight' ? 1 : 0}
                      value={values[field]}
                      onChange={(event) => {
                        setField(field, event.target.value);
                      }}
                    />
                  </label>
                ))}
              </div>

              <label className="import-png__field import-png__field--wide">
                Frame order
                <select disabled defaultValue="reading">
                  <option value="reading">Left → Right, Top → Bottom</option>
                </select>
              </label>

              {plan.ok ? (
                <p className="import-png__detected" data-testid="import-detected">
                  {image.width} × {image.height} image · {plan.layout.columns} × {plan.layout.rows}{' '}
                  · {plan.layout.frameCount} {plan.layout.frameCount === 1 ? 'frame' : 'frames'}
                </p>
              ) : (
                <p
                  className="import-png__detected import-png__detected--error"
                  role="alert"
                  data-testid="import-detected"
                >
                  {plan.error}
                </p>
              )}
            </>
          )}
        </div>

        <div
          className="import-png__preview"
          style={{ aspectRatio: `${String(image.width)} / ${String(image.height)}` }}
        >
          <canvas ref={canvasRef} className="import-png__preview-image" />
          {cells.length > 0 && (
            <svg
              className="import-png__preview-grid"
              viewBox={`0 0 ${String(image.width)} ${String(image.height)}`}
              preserveAspectRatio="none"
              aria-hidden="true"
            >
              {cells.map((cell) => (
                <rect
                  key={cell.key}
                  x={cell.x}
                  y={cell.y}
                  width={slice.frameWidth}
                  height={slice.frameHeight}
                  vectorEffect="non-scaling-stroke"
                />
              ))}
            </svg>
          )}
        </div>
      </div>
    </Dialog>
  );
}

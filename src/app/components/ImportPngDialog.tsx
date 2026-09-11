import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from 'react';

import type { ImageData8 } from '@core/document/importCommands';
import {
  DEFAULT_SPRITE_SHEET_SLICE,
  describeSpriteSheet,
  type SpriteSheetSlice,
} from '@core/document/spriteSheetImport';

import { frameAt, type HoverFrame } from '../spriteSheetHover';
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
type PreviewScale = 'fit' | 1 | 2 | 4 | 8 | 16;

const FIELDS = [
  ['frameWidth', 'Frame width'],
  ['frameHeight', 'Frame height'],
  ['spacingX', 'Horizontal spacing'],
  ['spacingY', 'Vertical spacing'],
  ['offsetX', 'Offset X'],
  ['offsetY', 'Offset Y'],
] as const satisfies readonly (readonly [keyof SpriteSheetSlice, string])[];

const PREVIEW_SCALES: readonly PreviewScale[] = ['fit', 1, 2, 4, 8, 16];
/** Sane bounds so a tiny or huge sheet can't compute a degenerate "fit" scale. */
const MIN_FIT_SCALE = 0.05;
const MAX_FIT_SCALE = 32;

/**
 * File → Open PNG (PROJECT_CORE — Sprite Sheet PNG Import). The mode radio makes
 * sprite-sheet splitting an explicit choice so a normal PNG never turns into an
 * animation by accident. The preview is zoomable/pannable (PROJECT_CORE §14 —
 * large sheets are unreadable at "fit" alone) with a per-frame hover readout so
 * the frame size / spacing / offset fields can be verified against the actual
 * artwork before import.
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
  const [previewScale, setPreviewScale] = useState<PreviewScale>('fit');
  const [viewportSize, setViewportSize] = useState({ width: 480, height: 360 });
  const [hover, setHover] = useState<HoverFrame | null>(null);

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

  const viewportRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = viewportRef.current;
    if (!el || typeof ResizeObserver === 'undefined') {
      return;
    }
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) {
        return;
      }
      setViewportSize({
        width: Math.max(1, Math.round(entry.contentRect.width)),
        height: Math.max(1, Math.round(entry.contentRect.height)),
      });
    });
    observer.observe(el);
    return () => {
      observer.disconnect();
    };
  }, []);

  // "Fit" scales the sheet to fill the preview box — up as well as down, so a
  // small sheet is still legible instead of sitting tiny in a corner.
  const fitScale = useMemo(() => {
    const raw = Math.min(viewportSize.width / image.width, viewportSize.height / image.height);
    return Math.min(MAX_FIT_SCALE, Math.max(MIN_FIT_SCALE, raw || 1));
  }, [viewportSize, image.width, image.height]);

  const scaleFactor = previewScale === 'fit' ? fitScale : previewScale;
  const displayWidth = Math.max(1, Math.round(image.width * scaleFactor));
  const displayHeight = Math.max(1, Math.round(image.height * scaleFactor));
  const fitsViewport = displayWidth <= viewportSize.width && displayHeight <= viewportSize.height;

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

  const updateHover = (event: ReactPointerEvent<HTMLDivElement>): void => {
    if (mode !== 'sheet' || !plan.ok) {
      return;
    }
    const rect = event.currentTarget.getBoundingClientRect();
    const imgX = (event.clientX - rect.left) / scaleFactor;
    const imgY = (event.clientY - rect.top) / scaleFactor;
    setHover(frameAt(imgX, imgY, slice, plan.layout));
  };

  return (
    <Dialog
      title="Open PNG"
      size="xl"
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

              <p className="import-png__hover" data-testid="import-hover">
                {hover
                  ? `Hovering frame ${String(hover.index + 1)} — column ${String(hover.col + 1)}, row ${String(hover.row + 1)}`
                  : 'Hover the preview to identify a frame.'}
              </p>
            </>
          )}
        </div>

        <div className="import-png__preview-pane">
          <div className="import-png__preview" ref={viewportRef} data-testid="import-png-viewport">
            <div
              className={
                fitsViewport
                  ? 'import-png__preview-surface is-centered'
                  : 'import-png__preview-surface'
              }
              style={{ width: displayWidth, height: displayHeight }}
              data-testid="import-png-surface"
              onPointerMove={updateHover}
              onPointerLeave={() => {
                setHover(null);
              }}
            >
              <canvas
                ref={canvasRef}
                className="import-png__preview-image"
                style={{ width: displayWidth, height: displayHeight }}
              />
              {cells.length > 0 && (
                <svg
                  className="import-png__preview-grid"
                  width={displayWidth}
                  height={displayHeight}
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
              {hover && (
                <svg
                  className="import-png__preview-hover"
                  width={displayWidth}
                  height={displayHeight}
                  viewBox={`0 0 ${String(image.width)} ${String(image.height)}`}
                  preserveAspectRatio="none"
                  aria-hidden="true"
                >
                  <rect
                    x={slice.offsetX + hover.col * (slice.frameWidth + slice.spacingX)}
                    y={slice.offsetY + hover.row * (slice.frameHeight + slice.spacingY)}
                    width={slice.frameWidth}
                    height={slice.frameHeight}
                    vectorEffect="non-scaling-stroke"
                  />
                </svg>
              )}
            </div>
          </div>

          <div className="import-png__seg" role="group" aria-label="Preview zoom">
            {PREVIEW_SCALES.map((option) => (
              <button
                key={String(option)}
                type="button"
                aria-pressed={previewScale === option}
                className={previewScale === option ? 'is-on' : undefined}
                onClick={() => {
                  setPreviewScale(option);
                }}
              >
                {option === 'fit' ? 'Fit' : `${String(option)}×`}
              </button>
            ))}
          </div>
        </div>
      </div>
    </Dialog>
  );
}

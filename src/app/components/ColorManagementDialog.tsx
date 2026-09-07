import { useEffect, useState } from 'react';

import { rgba, type RGBA } from '@core/types/color';

import { hexToRgba, rgbaToHex } from '../hexColor';
import { useRetainedHue } from '../useRetainedHue';
import { ColorField } from './ColorField';
import { Dialog } from './Dialog';
import './ColorManagementDialog.css';

interface ColorManagementDialogProps {
  readonly title?: string;
  /** The working colour (controlled by the parent so it survives "Pick from canvas"). */
  readonly value: RGBA;
  readonly onChange: (color: RGBA) => void;
  /** Cancel — the parent keeps the original colour. */
  readonly onClose: () => void;
  readonly onConfirm: (color: RGBA, name: string) => void;
  readonly confirmLabel: string;
  /** Show an optional colour-name field (palette editing). */
  readonly showName?: boolean;
  readonly initialName?: string;
  /** Arms the one-shot canvas sampler; the parent hides the dialog while it runs. */
  readonly onPickFromCanvas?: () => void;
}

const CHANNELS = [
  ['r', 'Red'],
  ['g', 'Green'],
  ['b', 'Blue'],
  ['a', 'Alpha'],
] as const;

/**
 * The Color Management window (PROJECT_CORE §14.3): a visual selector plus exact
 * numeric entry, opened when adding or editing a colour. Self-contained — the
 * preview updates as you edit and Cancel keeps the original colour.
 */
export function ColorManagementDialog({
  title = 'Color Management',
  value,
  onChange,
  onClose,
  onConfirm,
  confirmLabel,
  showName = false,
  initialName = '',
  onPickFromCanvas,
}: ColorManagementDialogProps) {
  const [name, setName] = useState(initialName);
  const { hue, setHue, hsv, hsl } = useRetainedHue(value);

  const hex = (c: RGBA): string => rgbaToHex(c, { alpha: 'always' });
  const [hexText, setHexText] = useState(() => hex(value));
  useEffect(() => {
    setHexText(hex(value));
  }, [value]);

  const setChannel = (key: 'r' | 'g' | 'b' | 'a', raw: number): void => {
    if (!Number.isFinite(raw)) {
      return;
    }
    const n = Math.min(255, Math.max(0, Math.round(raw)));
    onChange(
      rgba(
        key === 'r' ? n : value.r,
        key === 'g' ? n : value.g,
        key === 'b' ? n : value.b,
        key === 'a' ? n : value.a,
      ),
    );
  };

  const commitHex = (raw: string): void => {
    const parsed = hexToRgba(raw);
    if (parsed) {
      onChange(parsed);
    } else {
      setHexText(hex(value));
    }
  };

  const round = (n: number): number => Math.round(n);

  return (
    <Dialog
      title={title}
      size="lg"
      onClose={onClose}
      footer={
        <>
          <span className="color-mgmt__hint">
            The preview updates as you edit. Cancel keeps the original color.
          </span>
          <button type="button" className="color-mgmt__button" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="color-mgmt__button is-primary"
            onClick={() => {
              onConfirm(value, name.trim());
            }}
          >
            {confirmLabel}
          </button>
        </>
      }
    >
      <p className="color-mgmt__lede">Choose a color visually or enter an exact value.</p>

      <div className="color-mgmt__layout">
        <div className="color-mgmt__col">
          <h3 className="color-mgmt__section">Color Picker</h3>
          <ColorField
            value={value}
            hue={hue}
            hsv={hsv}
            onColorChange={onChange}
            onHueChange={setHue}
            labels
          />
          {onPickFromCanvas && (
            <button type="button" className="color-mgmt__pick" onClick={onPickFromCanvas}>
              Pick from Canvas
            </button>
          )}
        </div>

        <div className="color-mgmt__col">
          <h3 className="color-mgmt__section">Selected Color</h3>
          <div className="color-mgmt__preview">
            <span
              className="color-mgmt__swatch"
              data-testid="color-mgmt-swatch"
              style={{ backgroundColor: rgbaToHex(value) }}
            />
            <div>
              <strong>{showName ? initialName || 'Palette Color' : 'New Color'}</strong>
              <code className="color-mgmt__code">{hex(value).toUpperCase()}</code>
            </div>
          </div>

          <div className="color-mgmt__grid">
            {CHANNELS.map(([key, label]) => (
              <label key={key} className="color-mgmt__field">
                {label}
                <input
                  type="number"
                  min={0}
                  max={255}
                  value={value[key]}
                  aria-label={label}
                  onChange={(event) => {
                    setChannel(key, Number(event.target.value));
                  }}
                />
              </label>
            ))}
          </div>

          <label className="color-mgmt__field color-mgmt__field--wide">
            HEX
            <input
              type="text"
              spellCheck={false}
              autoComplete="off"
              aria-label="HEX"
              value={hexText}
              onChange={(event) => {
                setHexText(event.target.value);
              }}
              onBlur={(event) => {
                commitHex(event.target.value);
              }}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  commitHex(event.currentTarget.value);
                }
              }}
            />
          </label>

          <div className="color-mgmt__readouts">
            <div className="color-mgmt__readout">
              <span>HSV</span>
              {round(hsv.h)}° · {round(hsv.s * 100)}% · {round(hsv.v * 100)}%
            </div>
            <div className="color-mgmt__readout">
              <span>HSL</span>
              {round(hsl.h)}° · {round(hsl.s * 100)}% · {round(hsl.l * 100)}%
            </div>
          </div>

          {showName && (
            <label className="color-mgmt__field color-mgmt__field--wide">
              Name (optional)
              <input
                type="text"
                value={name}
                aria-label="Colour name"
                onChange={(event) => {
                  setName(event.target.value);
                }}
              />
            </label>
          )}
        </div>
      </div>
    </Dialog>
  );
}

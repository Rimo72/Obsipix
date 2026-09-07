import { useCallback, useEffect, useState } from 'react';

import { grayToRgb, hslToRgb, hsvToRgb, rgbToGray, type RGB } from '@core/colors/convert';
import { rgba, type RGBA } from '@core/types/color';

import { hexToRgba, rgbaToHex } from '../hexColor';
import { useRetainedHue } from '../useRetainedHue';
import { ColorField } from './ColorField';
import './ColorPicker.css';

interface ColorPickerProps {
  readonly value: RGBA;
  readonly onChange: (color: RGBA) => void;
  /** Accessible label for the whole picker (e.g. "Foreground colour"). */
  readonly label: string;
}

type Mode = 'rgb' | 'hsv' | 'hsl' | 'gray';

const toRgb = (c: RGBA): RGB => ({ r: c.r, g: c.g, b: c.b });

/**
 * The colour selector (PROJECT_CORE §14): an SV square, hue and alpha bars,
 * RGB / HSV / HSL / Gray numeric modes, and a HEX field. Every control edits the
 * same underlying RGBA and keeps the others in sync.
 */
export function ColorPicker({ value, onChange, label }: ColorPickerProps) {
  const [mode, setMode] = useState<Mode>('hsv');
  const [hexText, setHexText] = useState(() => rgbaToHex(value));
  const { hue, setHue, hsv, hsl } = useRetainedHue(value);

  useEffect(() => {
    setHexText(rgbaToHex(value));
  }, [value]);

  const emitRgb = useCallback(
    (rgb: RGB, alpha = value.a): void => {
      onChange(rgba(rgb.r, rgb.g, rgb.b, alpha));
    },
    [onChange, value.a],
  );

  const setSV = (s: number, v: number): void => {
    emitRgb(hsvToRgb({ h: hue, s, v }));
  };

  return (
    <div className="color-picker" role="group" aria-label={label}>
      <ColorField value={value} hue={hue} hsv={hsv} onColorChange={onChange} onHueChange={setHue} />

      <div className="color-picker__modes" role="tablist" aria-label="Colour mode">
        {(['rgb', 'hsv', 'hsl', 'gray'] as const).map((m) => (
          <button
            key={m}
            type="button"
            role="tab"
            aria-selected={mode === m}
            className={mode === m ? 'color-picker__mode is-active' : 'color-picker__mode'}
            onClick={() => {
              setMode(m);
            }}
          >
            {m.toUpperCase()}
          </button>
        ))}
      </div>

      <div className="color-picker__fields">
        {mode === 'rgb' && (
          <>
            <ChannelField
              label="R"
              max={255}
              value={value.r}
              onChange={(r) => emitRgb({ r, g: value.g, b: value.b })}
            />
            <ChannelField
              label="G"
              max={255}
              value={value.g}
              onChange={(g) => emitRgb({ r: value.r, g, b: value.b })}
            />
            <ChannelField
              label="B"
              max={255}
              value={value.b}
              onChange={(b) => emitRgb({ r: value.r, g: value.g, b })}
            />
          </>
        )}
        {mode === 'hsv' && (
          <>
            <ChannelField
              label="H"
              max={360}
              value={Math.round(hue)}
              onChange={(h) => {
                setHue(h);
                emitRgb(hsvToRgb({ h, s: hsv.s, v: hsv.v }));
              }}
            />
            <ChannelField
              label="S"
              max={100}
              value={Math.round(hsv.s * 100)}
              onChange={(s) => setSV(s / 100, hsv.v)}
            />
            <ChannelField
              label="V"
              max={100}
              value={Math.round(hsv.v * 100)}
              onChange={(v) => setSV(hsv.s, v / 100)}
            />
          </>
        )}
        {mode === 'hsl' && (
          <>
            <ChannelField
              label="H"
              max={360}
              value={Math.round(hue)}
              onChange={(h) => {
                setHue(h);
                emitRgb(hslToRgb({ h, s: hsl.s, l: hsl.l }));
              }}
            />
            <ChannelField
              label="S"
              max={100}
              value={Math.round(hsl.s * 100)}
              onChange={(s) => emitRgb(hslToRgb({ h: hue, s: s / 100, l: hsl.l }))}
            />
            <ChannelField
              label="L"
              max={100}
              value={Math.round(hsl.l * 100)}
              onChange={(l) => emitRgb(hslToRgb({ h: hue, s: hsl.s, l: l / 100 }))}
            />
          </>
        )}
        {mode === 'gray' && (
          <ChannelField
            label="Gray"
            max={255}
            value={rgbToGray(toRgb(value))}
            onChange={(gray) => emitRgb(grayToRgb(gray))}
          />
        )}
        <ChannelField
          label="A"
          max={255}
          value={value.a}
          onChange={(a) => onChange(rgba(value.r, value.g, value.b, a))}
        />
      </div>

      <label className="color-picker__hex">
        HEX
        <input
          type="text"
          spellCheck={false}
          autoComplete="off"
          aria-label={`${label} hex value`}
          value={hexText}
          onChange={(event) => {
            setHexText(event.target.value);
          }}
          onBlur={(event) => {
            const parsed = hexToRgba(event.target.value);
            if (parsed) {
              onChange(parsed);
            } else {
              setHexText(rgbaToHex(value));
            }
          }}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              const parsed = hexToRgba(event.currentTarget.value);
              if (parsed) {
                onChange(parsed);
              }
            }
          }}
        />
      </label>
    </div>
  );
}

interface ChannelFieldProps {
  readonly label: string;
  readonly value: number;
  readonly max: number;
  readonly onChange: (value: number) => void;
}

function ChannelField({ label, value, max, onChange }: ChannelFieldProps) {
  const commit = (raw: number): void => {
    if (Number.isFinite(raw)) {
      onChange(Math.min(max, Math.max(0, Math.round(raw))));
    }
  };
  return (
    <label className="color-picker__field">
      <span className="color-picker__field-label">{label}</span>
      <input
        type="range"
        min={0}
        max={max}
        value={value}
        aria-label={label}
        onChange={(event) => {
          commit(Number(event.target.value));
        }}
      />
      <input
        type="number"
        min={0}
        max={max}
        value={value}
        aria-label={`${label} value`}
        onChange={(event) => {
          commit(Number(event.target.value));
        }}
      />
    </label>
  );
}

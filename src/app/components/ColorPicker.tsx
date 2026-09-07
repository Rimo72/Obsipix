import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from 'react';

import {
  grayToRgb,
  hslToRgb,
  hsvToRgb,
  rgbToGray,
  rgbToHsl,
  rgbToHsv,
  type RGB,
} from '@core/colors/convert';
import { rgba, type RGBA } from '@core/types/color';

import { hexToRgba, rgbaToHex } from '../hexColor';
import './ColorPicker.css';

interface ColorPickerProps {
  readonly value: RGBA;
  readonly onChange: (color: RGBA) => void;
  /** Accessible label for the whole picker (e.g. "Foreground colour"). */
  readonly label: string;
}

type Mode = 'rgb' | 'hsv' | 'hsl' | 'gray';

const isGrey = (c: RGBA): boolean => c.r === c.g && c.g === c.b;
const toRgb = (c: RGBA): RGB => ({ r: c.r, g: c.g, b: c.b });

/** Normalised pointer position (0–1, clamped) within `element`. */
function localPosition(
  element: HTMLElement,
  clientX: number,
  clientY: number,
): { x: number; y: number } {
  const rect = element.getBoundingClientRect();
  return {
    x: Math.min(1, Math.max(0, (clientX - rect.left) / rect.width)),
    y: Math.min(1, Math.max(0, (clientY - rect.top) / rect.height)),
  };
}

/**
 * The colour selector (PROJECT_CORE §14): an SV square, hue and alpha bars,
 * RGB / HSV / HSL / Gray numeric modes, and a HEX field. Every control edits the
 * same underlying RGBA and keeps the others in sync.
 */
export function ColorPicker({ value, onChange, label }: ColorPickerProps) {
  const [mode, setMode] = useState<Mode>('hsv');
  // Hue is kept locally so it survives greyscale / black where it is undefined.
  const [hue, setHue] = useState(() => rgbToHsv(toRgb(value)).h);
  const [hexText, setHexText] = useState(() => rgbaToHex(value));

  useEffect(() => {
    if (!isGrey(value)) {
      setHue(rgbToHsv(toRgb(value)).h);
    }
    setHexText(rgbaToHex(value));
  }, [value]);

  const hsv = { ...rgbToHsv(toRgb(value)), h: hue };
  const hsl = { ...rgbToHsl(toRgb(value)), h: hue };

  const emitRgb = useCallback(
    (rgb: RGB, alpha = value.a): void => {
      onChange(rgba(rgb.r, rgb.g, rgb.b, alpha));
    },
    [onChange, value.a],
  );

  const setSV = (s: number, v: number): void => {
    emitRgb(hsvToRgb({ h: hue, s, v }));
  };
  const setHue360 = (h: number): void => {
    setHue(h);
    emitRgb(hsvToRgb({ h, s: hsv.s, v: hsv.v }));
  };
  const setAlpha = (a: number): void => {
    onChange(rgba(value.r, value.g, value.b, Math.round(a * 255)));
  };

  const svRef = useRef<HTMLDivElement>(null);
  // The live handlers close over the latest state; refresh the ref every render.
  const applyRef = useRef<(kind: 'sv' | 'hue' | 'alpha', x: number, y: number) => void>(
    () => undefined,
  );
  applyRef.current = (kind, s, v) => {
    if (kind === 'sv') {
      setSV(s, 1 - v);
    } else if (kind === 'hue') {
      setHue360(s * 360);
    } else {
      setAlpha(s);
    }
  };

  const startDrag =
    (kind: 'sv' | 'hue' | 'alpha') =>
    (event: ReactPointerEvent<HTMLElement>): void => {
      const target = event.currentTarget;
      const run = (clientX: number, clientY: number): void => {
        const pos = localPosition(target, clientX, clientY);
        applyRef.current(kind, pos.x, pos.y);
      };
      run(event.clientX, event.clientY);
      const move = (e: PointerEvent): void => {
        run(e.clientX, e.clientY);
      };
      const up = (): void => {
        window.removeEventListener('pointermove', move);
        window.removeEventListener('pointerup', up);
      };
      window.addEventListener('pointermove', move);
      window.addEventListener('pointerup', up);
    };

  const hueColor = `hsl(${String(Math.round(hue))}, 100%, 50%)`;
  const alpha = value.a / 255;

  return (
    <div className="color-picker" role="group" aria-label={label}>
      <div
        ref={svRef}
        className="color-picker__sv"
        style={{ backgroundColor: hueColor }}
        onPointerDown={startDrag('sv')}
        role="slider"
        aria-label="Saturation and value"
        aria-valuetext={`saturation ${String(Math.round(hsv.s * 100))}%, value ${String(
          Math.round(hsv.v * 100),
        )}%`}
        tabIndex={0}
      >
        <div className="color-picker__sv-white" />
        <div className="color-picker__sv-black" />
        <div
          className="color-picker__thumb"
          style={{ left: `${String(hsv.s * 100)}%`, top: `${String((1 - hsv.v) * 100)}%` }}
        />
      </div>

      <div
        className="color-picker__bar color-picker__bar--hue"
        onPointerDown={startDrag('hue')}
        role="slider"
        aria-label="Hue"
        aria-valuemin={0}
        aria-valuemax={360}
        aria-valuenow={Math.round(hue)}
        tabIndex={0}
      >
        <div className="color-picker__thumb" style={{ left: `${String((hue / 360) * 100)}%` }} />
      </div>

      <div
        className="color-picker__bar color-picker__bar--alpha"
        onPointerDown={startDrag('alpha')}
        role="slider"
        aria-label="Alpha"
        aria-valuemin={0}
        aria-valuemax={255}
        aria-valuenow={value.a}
        tabIndex={0}
      >
        <div
          className="color-picker__alpha-fill"
          style={{
            background: `linear-gradient(to right, rgba(${String(value.r)},${String(value.g)},${String(
              value.b,
            )},0), rgb(${String(value.r)},${String(value.g)},${String(value.b)}))`,
          }}
        />
        <div className="color-picker__thumb" style={{ left: `${String(alpha * 100)}%` }} />
      </div>

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
              onChange={(h) => setHue360(h)}
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
